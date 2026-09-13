import { existsSync } from 'fs'
import { lstat, readlink, readdir, cp, realpath, stat, symlink, mkdir, writeFile } from 'fs/promises'
import { createRequire } from 'module'
import { dirname, isAbsolute, join, matchesGlob, posix, relative, resolve, sep } from 'path'
import { pathToFileURL } from 'url'
import { stringify } from 'yaml'
import type { ContentStatus, ContentStrategy } from '@shared/ipc-contract'
import { snapshotContent } from './backupService'
import { createSnapshot } from './snapshotService'
import { readConfig } from './configService'
import { mainT } from '../i18n'

export function contentDirPath(projectPath: string): string {
  return join(projectPath, 'content')
}

// Hidden entries are not content, and counting them made the number meaningless: a vault carries
// its own .git, Obsidian keeps its settings in .obsidian, and quartz ignores both. Measured on the
// example vault - 1392 entries reported for 273 files of actual content, the other 1119 being git
// objects and Obsidian's own state. Whatever the folder hides from Quartz it should hide here too.
//
// Links werden aufgelöst, nicht gezählt: `entry.isDirectory()` antwortet für den Eintrag selbst,
// also galt ein verlinkter Ordner als *eine* Datei - dieselbe Ursache wie beim Export
// (templatePackage/parts.ts, Befund 13 aus dem Review vom 2026-09-05), hier ohne Folge außer einer
// zu kleinen Zahl auf der Übersicht. `seen` schneidet einen Link ab, der auf einen Vorfahren zeigt;
// ein hängender Link zählt gar nicht, weil hinter ihm nichts liegt.
async function countFiles(dir: string, seen?: Set<string>): Promise<number> {
  const visited = seen ?? new Set<string>([await realpath(dir)])
  let count = 0
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    let isDirectory = entry.isDirectory()
    if (entry.isSymbolicLink()) {
      try {
        isDirectory = (await stat(full)).isDirectory()
      } catch {
        continue
      }
    }
    if (!isDirectory) {
      count += 1
      continue
    }
    const real = await realpath(full)
    if (visited.has(real)) continue
    visited.add(real)
    count += await countFiles(full, visited)
  }
  return count
}

export async function getContentStatus(projectPath: string): Promise<ContentStatus> {
  const path = contentDirPath(projectPath)
  // lstat, not existsSync: the latter follows the link, so a content/ pointing at an unmounted
  // drive answered "there is no content folder here" - and everything that asks this question in
  // order to decide whether it may write (the template import's content part above all) then read
  // the answer as "an ordinary, absent folder", planned every note as an addition and failed with
  // a raw ENOENT from mkdir. A link that is there but hanging is a link, and saying so is what
  // keeps the guard on.
  let stat
  try {
    stat = await lstat(path)
  } catch {
    return { path, exists: false, isSymlink: false }
  }
  if (stat.isSymbolicLink()) {
    const target = await readlink(path)
    // readlink() hands back the link's *raw* target, and a relative one is relative to the link's
    // own directory - not to the working directory of whoever asks. Resolving it against the
    // latter reported a perfectly good link as broken: measured on a project whose content/ points
    // at ../vault, `targetExists` came back false and the file count was missing, while the link
    // itself worked. The dialog in this app always writes an absolute path, so only a hand-made or
    // moved project ever hit it.
    const targetPath = isAbsolute(target) ? target : resolve(dirname(path), target)
    const targetExists = existsSync(targetPath)
    return {
      path,
      exists: true,
      isSymlink: true,
      symlinkTarget: target,
      targetExists,
      fileCount: targetExists ? await countFiles(targetPath) : undefined,
      hasIndex: targetExists ? await hasIndexPage(targetPath) : undefined
    }
  }
  return { path, exists: true, isSymlink: false, fileCount: await countFiles(path), hasIndex: await hasIndexPage(path) }
}

// Without content/index.md the site has no page at its own address: Quartz's dev server serves `/`
// only when public/index.html exists and otherwise answers with 404.html ("Diese Seite ist entweder
// nicht öffentlich oder existiert nicht."), and @quartz-community/folder-page makes a virtual page
// for every folder *except* the root (`f !== "."` in generate(), installed 0.1.0 and GitHub main
// alike). A linked vault almost never has one, which is how a user's first preview became a 404.
// Case-insensitive, because Quartz lowercases every slug - measured: "Mein Ordner" became
// ./mein-ordner/ - so an Index.md is the start page too.
async function hasIndexPage(dir: string): Promise<boolean> {
  try {
    return (await readdir(dir)).some((name) => name.toLowerCase() === 'index.md')
  } catch {
    return false
  }
}

// Which files the build reads is not something this app decides, so it asks the one who does:
// Quartz globs `**/*.*` under content/ with globby (`quartz/util/glob.ts`, `ignore` from the config,
// `gitignore: true`) and makes a page of every `.md` that is left - and folder-page a folder page of
// every folder that holds one. The function until 2026-09-17 imitated that with three probe paths
// and `matchesGlob`, and measured against Quartz's own globby it gave 13 wrong answers across 19 patterns:
// `y/*` drops a folder without subfolders (the probe `y/x/y.md` sat one level too deep, so the
// start page linked a page the build does not make), fast-glob only prunes a directory for a static
// pattern or one ending in `/**` (`*`, `[xy]`, `tpl*` keep every note), and a `.gitignore` - in the
// vault or in the project - was not read at all. So globby is loaded from
// where Quartz loads it, and run on the same cwd: `content/` itself, not its resolved target,
// because globby also reads the `.gitignore` files between the cwd and the root of the git repository
// around it (measured: a project's `content/y/` counts once the project is a repository, not before).
// Same 26 patterns, same .gitignore files: the list and Quartz's globby agree on every one.
async function quartzInputFiles(projectPath: string, patterns: string[]): Promise<string[]> {
  const cwd = contentDirPath(projectPath)
  let globby: ((pattern: string, options: object) => Promise<string[]>) | undefined
  try {
    const resolveFromQuartz = createRequire(join(projectPath, 'quartz', 'util', 'glob.ts')).resolve
    globby = ((await import(pathToFileURL(resolveFromQuartz('globby')).href)) as { globby: typeof globby }).globby
  } catch {
    // No node_modules yet, so no build either: the list can only be as good as the fallback below.
  }
  if (globby) return (await globby('**/*.*', { cwd, ignore: patterns, gitignore: true })).map((p) => p.split(sep).join('/'))
  return walkUnignored(await realpath(cwd), patterns)
}

// The fallback, and it says what it is not: no `.gitignore` is read. The patterns follow fast-glob's
// two rules - a file is tested with its own path, and a folder is pruned only by a pattern whose last
// segment is static or which ends in `/**` (`isAffectDepthOfReadingPattern`), which is why `x/*`,
// `*` and `[xy]` keep a folder's subfolders while `x/` and `**/x` drop them. Measured against globby
// with 26 patterns: one answer differs, `{x,y}`, which fast-glob expands into two static patterns
// before it applies the rule and this does not. Hidden entries are skipped the way `dot: false` skips
// them; links are followed as fast-glob follows them, with `seen` against a link back to an ancestor.
async function walkUnignored(root: string, patterns: string[]): Promise<string[]> {
  const test = (probe: string, pattern: string): boolean => {
    if (pattern === probe) return true
    try {
      return matchesGlob(probe, pattern)
    } catch {
      return false
    }
  }
  const pruning = patterns
    .filter((pattern) => pattern.endsWith('/**') || !/[*?[\]{}()!@+\\]/.test(posix.basename(pattern)))
    .map((pattern) => pattern.replace(/\/$/, ''))
  const ignored = (path: string): boolean => {
    const segments = path.split('/')
    const folders = segments.slice(0, -1).map((_, i) => segments.slice(0, i + 1).join('/'))
    return (
      patterns.some((pattern) => test(path, pattern)) ||
      folders.some((folder) => pruning.some((pattern) => test(folder, pattern)))
    )
  }
  const files: string[] = []
  const seen = new Set<string>([root])
  const walk = async (dir: string, prefix: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const full = join(dir, entry.name)
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      let isDir = entry.isDirectory()
      if (entry.isSymbolicLink()) {
        try {
          isDir = (await stat(full)).isDirectory()
        } catch {
          continue
        }
      }
      if (!isDir) {
        if (!ignored(rel)) files.push(rel)
        continue
      }
      const real = await realpath(full)
      if (seen.has(real)) continue
      seen.add(real)
      await walk(full, rel)
    }
  }
  await walk(root, '')
  return files
}

// A markdown link rather than a wikilink, because the folders need one: a wikilink names a note,
// and a folder without index.md has none. Angle brackets keep spaces and umlauts readable in
// Obsidian; both forms were measured in a real `quartz build` (folder with a space, "Äpfel &
// Birnen.md") and all resolved to a page that exists. A name that cannot sit inside angle brackets
// is percent-encoded instead, which Quartz resolves as well.
function entryLink(name: string, href: string): string {
  const text = name.replace(/([\\[\]])/g, '\\$1')
  const target = /[<>\n\r]/.test(href) ? href.split('/').map(encodeURIComponent).join('/') : `<${href}>`
  return `- [${text}](${target})`
}

/**
 * Creates content/index.md with the given title and a list of what lies at the top level of the
 * content folder - the folders first, then the notes, each in the order the site sorts them.
 *
 * `title` goes into the frontmatter because without it @quartz-community/note-properties names the
 * page after its file (`data.title = file.stem`), i.e. "index". `aliases` would not help: it adds
 * redirect addresses, not a name. The list is written once and never updated - the dialog says so.
 *
 * Never overwrites: the file is opened with `wx`, so an index.md that appeared in the meantime (or
 * exists under another case) is an error rather than a loss. In a linked vault this writes into the
 * user's own notes, which is why it only ever happens from a dialog that names the folder.
 */
export async function createIndexPage(projectPath: string, title: string): Promise<{ path: string }> {
  const status = await getContentStatus(projectPath)
  if (!status.exists || (status.isSymlink && !status.targetExists)) throw new Error(mainT('indexPageNoContent'))
  const dir = await realpath(contentDirPath(projectPath))
  if (await hasIndexPage(dir)) throw new Error(mainT('indexPageExists'))

  let patterns: string[] = []
  try {
    const ignore = (await readConfig(projectPath)).configuration.ignorePatterns
    if (Array.isArray(ignore)) patterns = ignore.filter((p): p is string => typeof p === 'string')
  } catch {
    // A config that cannot be read still leaves the hidden entries out; the list is a starting point.
  }

  // Quartz's test, not ours: `endsWith(".md")` in build.ts, so a `Note.MD` is an asset there too.
  const markdown = (await quartzInputFiles(projectPath, patterns)).filter((path) => path.endsWith('.md'))
  const notes = markdown.filter((path) => !path.includes('/'))
  const folders = [...new Set(markdown.filter((path) => path.includes('/')).map((path) => path.split('/')[0]))]
  const order = (a: string, b: string): number => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  folders.sort(order)
  notes.sort(order)

  const lines = [
    ...folders.map((name) => entryLink(name, `./${name}/`)),
    ...notes.map((name) => entryLink(name.replace(/\.md$/i, ''), `./${name}`))
  ]
  const body = `---\n${stringify({ title: title.trim() })}---\n\n${lines.length > 0 ? `${lines.join('\n')}\n` : ''}`
  const path = join(dir, 'index.md')
  try {
    await writeFile(path, body, { encoding: 'utf-8', flag: 'wx' })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') throw new Error(mainT('indexPageExists'))
    throw err
  }
  return { path }
}

// Neither direction of containment is allowed between the source and the content directory.
// The current content/ is moved aside *before* anything is read, so a source that lives inside it
// is already gone by then - measured on a real project: with the symlink strategy the call
// reported success and left a link pointing at itself (the page then said the folder was missing),
// with the copy strategy it failed with a raw ENOENT. In both cases the notes existed only in
// .quartz-gui/content-backups/, which nothing in the UI leads to. The reverse case (the source
// contains content/, e.g. the project directory itself) would copy the project into its own
// content folder. `relative()` rather than a prefix test, which would call /notes-old a child
// of /notes - the same reasoning deploy/folder.ts's containment check follows.
function contains(parent: string, child: string): boolean {
  const rel = relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

export async function changeContentSource(
  projectPath: string,
  sourcePath: string,
  strategy: ContentStrategy,
  onProgress?: (processed: number, total: number, currentFile?: string) => void
): Promise<void> {
  if (!existsSync(sourcePath)) {
    throw new Error(mainT('contentSourceMissing', { path: sourcePath }))
  }
  const target = contentDirPath(projectPath)
  const from = resolve(sourcePath)
  const to = resolve(target)
  if (contains(to, from)) {
    throw new Error(
      mainT('contentSourceInsideTarget', { target })
    )
  }
  if (contains(from, to)) {
    throw new Error(
      mainT('contentTargetInsideSource', { target })
    )
  }
  // Two different safety nets, both needed: the snapshot records the project's files as they are
  // now, and the move-aside keeps the whole old content directory - which the snapshot may not
  // hold at all, since a symlinked vault is excluded by default.
  await createSnapshot(projectPath, 'contentChange', '')
  // moves the current content/ into .quartz-gui/content-backups/ instead of deleting it
  await snapshotContent(projectPath, target)

  if (strategy === 'symlink') {
    await symlink(sourcePath, target, 'dir')
    return
  }

  const total = await countFiles(sourcePath)
  let processed = 0
  await mkdir(target, { recursive: true })
  await cp(sourcePath, target, {
    recursive: true,
    filter: (src) => {
      processed += 1
      onProgress?.(processed, total, src)
      return true
    }
  })
}
