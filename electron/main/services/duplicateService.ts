// Copying a project is not `cp -r`. Four kinds of thing live inside a project folder and only two
// of them may travel:
//
//   * the project itself - quartz, its config, the stylesheets, the installed plugins, the git
//     repository. All of it comes along.
//   * the parts of .quartz-gui/ that *are* the design: the authored frames, the theme presets, the
//     breakpoints. Those come along too - without them the copy is not a copy.
//   * the parts of .quartz-gui/ that belong to the original's past or to its outside world: the
//     snapshot store and the set-aside content folders (its history) and publish-targets.json (its
//     destinations). Those stay behind. The targets matter most: the credentials behind them are
//     app-wide, so a copy that inherited them could overwrite the original's live website with the
//     first click on "Veröffentlichen" - by a person who thinks they are working on a copy.
//   * what is derived and large: node_modules and the build output. Reinstalled and rebuilt.
//
// The git repository is the one judgement call. It carries the original's own commits, which a
// "start at zero" reading would drop - but dropping it means `git init`, and an unrelated history
// makes the core update impossible: updateService merges FETCH_HEAD from jackyzha0/quartz, and git
// refuses to merge histories that share no commit. So the repository comes along and only `origin`
// is removed, exactly as createService does after cloning: a later Git-Sync push must never land in
// the original's remote.
import { cp, mkdir, readdir, readlink, symlink, writeFile, rm } from 'fs/promises'
import { existsSync } from 'fs'
import { basename, isAbsolute, join, relative, resolve } from 'path'
import type { DuplicateProjectOptions, DuplicateProjectResult, PluginEntry } from '@shared/ipc-contract'
import { runCommand as run } from './runCommand'
import { contentDirPath } from './contentService'
import { readConfig, writeConfig } from './configService'
import { readLockfile } from './pluginService'
import { writeJsonFile } from './jsonStore'
import { mainT } from '../i18n'

/** Relative to the project root. Everything else is copied. */
const SKIP = new Set([
  'node_modules',
  'public',
  'content',
  '.quartz-gui/snapshots.git',
  '.quartz-gui/content-backups',
  '.quartz-gui/publish-targets.json',
  '.quartz-gui/deploy-manifest.json',
  // The build output directory, and it is an absolute path pointing at where the *original*
  // exports its site. Inherited, the copy's first click on "Bauen" deleted that folder and wrote
  // itself into it, with no question asked: `quartz build --output` empties the directory first,
  // and buildOutputGuard answers `ok` for it because a folder holding index.html and static/ is
  // indistinguishable from this project's own previous build. The file has one key, so leaving it
  // behind loses nothing - a second key that *should* travel would need its own decision here.
  '.quartz-gui/project-prefs.json'
])

// Same reasoning as publish-targets.json, one level further: a deploy manifest records what is
// already lying on a particular server, keyed by the id of a target that stays behind. In the copy
// it is an orphan at best and a wrong answer to "what still has to be uploaded" at worst. Both
// names are listed - readManifest adopts a pre-split `deploy-manifest.json` for whichever target
// asks first, so a copy that inherited one would tell its new target that a server it has never
// uploaded to is already up to date, and the first deploy would leave that server empty.
//
// branch-worktree-<id> is not history but a leftover: a git worktree registered in the *original's*
// .git, left behind by a deploy that broke off. Copied, it is a directory whose .git file points
// into another project.
const SKIP_PREFIX = ['.quartz-gui/deploy-manifest-', '.quartz-gui/branch-worktree-']

// Neither direction of containment is allowed - the same check changeContentSource makes, and for
// the same reason: copying a folder into itself either loops or writes into what it is reading.
function contains(parent: string, child: string): boolean {
  const rel = relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

// An authored frame is a plugin whose source is an absolute path into the project it was authored
// in (see layoutFrameService), and three places record that path: the plugin entry's `source` in
// quartz.config.yaml, `source` and `resolved` in quartz.lock.json, and the symlink
// `.quartz/plugins/<id>` that `quartz plugin add` laid down. cp copies all three verbatim, so
// without this the copy keeps building from the *original's* frame directories: an edit made in
// the copy is written to its own authored-frames/ (saveFrame sees the directory, considers the
// frame registered and never re-adds it) and appears in no build, while every edit in the original
// shows up in the copy, and deleting a frame there breaks the copy's build.
//
// Rewritten is every path that lies inside the source project, not only the frames: a plugin
// installed from somewhere else on disk means the same thing in both projects and stays as it is.
async function repointIntoCopy(source: string, target: string): Promise<void> {
  const moved = (path: string): string | null => {
    if (!isAbsolute(path)) return null
    const abs = resolve(path)
    return contains(source, abs) ? join(target, relative(source, abs)) : null
  }

  const config = await readConfig(target)
  let configChanged = false
  const plugins: PluginEntry[] = config.plugins.map((entry) => {
    if (typeof entry.source !== 'string') return entry
    const next = moved(entry.source)
    if (next === null) return entry
    configChanged = true
    return { ...entry, source: next }
  })
  // No snapshot: the copy has no snapshot store yet (it stays behind, deliberately), and this
  // write is part of creating it, not an edit the user could want to undo.
  if (configChanged) await writeConfig(target, { ...config, plugins }, { snapshot: false })

  // A lockfile that cannot be read is not this operation's problem to solve - the copy is no worse
  // off than the original, and `quartz plugin install` is what reports it.
  const lock = await readLockfile(target).catch(() => null)
  const locked = lock?.plugins
  if (locked && typeof locked === 'object') {
    let lockChanged = false
    for (const entry of Object.values(locked as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object') continue
      for (const key of ['source', 'resolved'] as const) {
        const value = (entry as Record<string, unknown>)[key]
        if (typeof value !== 'string') continue
        const next = moved(value)
        if (next === null) continue
        ;(entry as Record<string, unknown>)[key] = next
        lockChanged = true
      }
    }
    if (lockChanged) await writeJsonFile(join(target, 'quartz.lock.json'), lock)
  }

  const pluginsDir = join(target, '.quartz', 'plugins')
  let entries
  try {
    entries = await readdir(pluginsDir, { withFileTypes: true })
  } catch {
    return // a project whose plugins were never installed
  }
  for (const entry of entries) {
    if (!entry.isSymbolicLink()) continue
    const link = join(pluginsDir, entry.name)
    const next = moved(resolve(pluginsDir, await readlink(link)))
    if (next === null) continue
    await rm(link, { force: true })
    await symlink(next, link, 'dir')
  }
}

export async function duplicateProject(options: DuplicateProjectOptions): Promise<DuplicateProjectResult> {
  const source = resolve(options.sourcePath)
  const target = resolve(options.targetDirectory)

  if (!existsSync(join(source, 'quartz.config.yaml'))) {
    return { success: false, output: mainT('duplicateSourceNotAProject', { path: source }) }
  }
  if (existsSync(target) && (await readdir(target)).length > 0) {
    return { success: false, output: mainT('createTargetExists', { path: target }) }
  }
  if (contains(source, target) || contains(target, source)) {
    return { success: false, output: mainT('duplicateNested') }
  }
  if (options.contentStrategy !== 'blank') {
    const from = options.contentSource ? resolve(options.contentSource) : ''
    if (!from || !existsSync(from)) {
      return { success: false, output: mainT('contentSourceMissing', { path: options.contentSource ?? '' }) }
    }
    if (contains(from, target)) {
      return { success: false, output: mainT('contentTargetInsideSource', { target }) }
    }
  }

  await mkdir(target, { recursive: true })
  await cp(source, target, {
    recursive: true,
    // A symlink is copied as a link, not as what it points at. Only `content` is one today, and
    // that one is skipped anyway - but a vault with links inside it would otherwise be duplicated
    // by value, which is the opposite of what a link means.
    verbatimSymlinks: true,
    filter: (from) => {
      const rel = relative(source, from)
      if (rel === '') return true
      if (SKIP.has(rel)) return false
      return !SKIP_PREFIX.some((prefix) => rel.startsWith(prefix))
    }
  })

  await repointIntoCopy(source, target)

  // The copy must not push where the original pushes. `remote remove` answers non-zero when there
  // is nothing to remove, which is not a failure here.
  await run('git', ['remote', 'remove', 'origin'], target)

  const contentPath = contentDirPath(target)
  await rm(contentPath, { recursive: true, force: true })
  if (options.contentStrategy === 'symlink') {
    await symlink(resolve(options.contentSource as string), contentPath, 'dir')
  } else if (options.contentStrategy === 'copy') {
    await mkdir(contentPath, { recursive: true })
    await cp(resolve(options.contentSource as string), contentPath, { recursive: true })
  } else {
    // Not an empty directory: quartz builds a site with no pages at all, and the first thing the
    // user then sees is a 404 on their own home page. One page with the project's name is a
    // starting point rather than a puzzle.
    await mkdir(contentPath, { recursive: true })
    await writeFile(
      join(contentPath, 'index.md'),
      `---\ntitle: ${basename(target)}\n---\n\n${mainT('duplicateBlankContent')}\n`,
      'utf-8'
    )
  }

  const install = await run('npm', ['install'], target)
  if (!install.success) {
    return { success: false, output: `${mainT('createInstallFailed')}\n${install.output}` }
  }

  return { success: true, output: install.output }
}
