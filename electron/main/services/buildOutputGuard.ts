import { readdir, stat } from 'fs/promises'
import { homedir } from 'os'
import { isAbsolute, join, relative, resolve, sep } from 'path'
import { resolveBuildDir } from './projectDirs'

// `quartz build --output <dir>` starts by deleting that directory outright:
//
//   await rm(output, { recursive: true, force: true })   // quartz/build.ts
//   Cleaned output directory `<dir>`
//
// Measured against a real build: an export folder holding a subdirectory with a text file came
// back holding nothing but the site. No trash, no prompt, no undo - and this app offers a folder
// picker for exactly that field, so choosing ~/Documents or a synced folder once is enough to lose
// it. `outputDir` also accepts a relative path, and "." resolves to the project itself.
//
// Hence this: a handful of paths are refused outright, and any other directory that already holds
// something which is not a Quartz build has to be confirmed before it is wiped.

/** True when `child` is `parent` or lies underneath it - relative(), not a string prefix, so that
 *  "/tmp/site-old" is not a child of "/tmp/site". */
function isInside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child))
  if (rel === '') return true
  if (isAbsolute(rel)) return false
  return rel !== '..' && !rel.startsWith(`..${sep}`)
}

// Directories inside the project that a build must never delete: the notes themselves, Quartz's
// own source, the repository, this app's scratch area, the dependencies. They are named rather
// than derived from a rule, because "everything in the project except the output" would also
// refuse `dist/` - a perfectly reasonable place to build into.
const PROTECTED_SUBDIRS = ['content', 'quartz', '.git', '.quartz-gui', '.quartz-cache', 'node_modules']

export type OutputDirVerdict =
  | { kind: 'ok' }
  /** The directory holds something that is not a build; deleting it needs an explicit yes. */
  | { kind: 'confirm'; entryCount: number }
  | { kind: 'refused'; reason: 'project' | 'containsProject' | 'home' | 'protected'; detail?: string }

/** A directory that already holds a built site - so a rebuild into it deletes only its own
 *  previous output and needs no confirmation. Read from the file names a real `quartz build`
 *  emits: index.html plus at least one of the other things every build produces. */
export async function looksLikeQuartzBuild(dir: string): Promise<boolean> {
  try {
    const entries = new Set(await readdir(dir))
    if (!entries.has('index.html')) return false
    return entries.has('static') || entries.has('index.xml') || entries.has('sitemap.xml') || entries.has('404.html')
  } catch {
    return false
  }
}

/** What has to happen before `quartz build` may empty this output directory. */
export async function assessOutputDir(projectPath: string, outputDir?: string): Promise<OutputDirVerdict> {
  const dir = resolve(resolveBuildDir(projectPath, outputDir))
  const project = resolve(projectPath)

  if (dir === project) return { kind: 'refused', reason: 'project' }
  // Covers every ancestor of the project, including a home directory that contains it.
  if (isInside(dir, project)) return { kind: 'refused', reason: 'containsProject' }
  if (dir === resolve(homedir())) return { kind: 'refused', reason: 'home' }
  for (const name of PROTECTED_SUBDIRS) {
    if (isInside(join(project, name), dir)) return { kind: 'refused', reason: 'protected', detail: name }
  }

  let entries: string[]
  try {
    // A path that exists but is not a directory is deleted by the same rm() - being asked about a
    // single file is better than losing it silently.
    if (!(await stat(dir)).isDirectory()) return { kind: 'confirm', entryCount: 1 }
    entries = await readdir(dir)
  } catch {
    // does not exist yet - the build creates it
    return { kind: 'ok' }
  }
  if (entries.length === 0) return { kind: 'ok' }
  if (await looksLikeQuartzBuild(dir)) return { kind: 'ok' }
  return { kind: 'confirm', entryCount: entries.length }
}
