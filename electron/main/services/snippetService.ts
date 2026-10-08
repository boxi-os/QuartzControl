import { copyFile, lstat, mkdir, open, readdir, readFile, realpath, rename, rm, stat } from 'fs/promises'
import { randomUUID } from 'crypto'
import { basename, dirname, extname, isAbsolute, join, relative, sep } from 'path'
import type { SnippetDirInfo, SnippetFileResult, StaticImageResult } from '@shared/ipc-contract'
import { containedPath, writableTarget } from './templatePackage/shared'
import { writeFileAtomic } from './jsonStore'
import { resolveBuildDir } from './projectDirs'
import { getPrefs } from './projectPrefsService'
import { mainT } from '../i18n'

// The files a layout box renders (quartz-layout-box: `dir` + `file`) and the pictures they show
// (quartz/static/images). Both are written from a form, and a form is fed by the renderer, which is
// not a trust boundary: every name and every directory is resolved here, against the project, and
// nothing is written outside it, through a link, or into a folder that belongs to a tool.
//
// The rules follow the template import (templatePackage/shared.ts): containedPath() for "does it
// stay inside", writableTarget() for "does the way there lead through a link". Reading is allowed
// through a link - layout-box itself reads a linked snippet folder, and so does the build - writing
// is not, for the reason writableTarget gives.

const SNIPPET_EXTENSIONS = new Set(['.html', '.htm', '.md'])
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'])
// A snippet is a few paragraphs; a picture on a website is a few hundred kilobytes. The caps are
// far above both and far below what turns a public git repository into a problem.
const SNIPPET_MAX_BYTES = 2 * 1024 * 1024
const IMAGE_MAX_BYTES = 20 * 1024 * 1024
// Folders a snippet has no business in: git's, npm's, Quartz's cache, this app's own.
const RESERVED_SEGMENTS = new Set(['.git', 'node_modules', '.quartz', '.quartz-gui'])

export const IMAGES_DIR = join('quartz', 'static', 'images')

type DirCheck = { ok: true; abs: string; viaLink: boolean } | { ok: false; state: 'outside' | 'reserved' }

/** Where `dir` (relative to the project, as layout-box reads it) leads, or why it may not be used. */
async function checkDir(projectPath: string, dir: string): Promise<DirCheck> {
  if (isAbsolute(dir)) return { ok: false, state: 'outside' }
  // `.` is the project itself - inside, if an odd place for snippets; layout-box reads it.
  const abs = relative(projectPath, join(projectPath, dir)) === '' ? projectPath : containedPath(projectPath, dir)
  if (abs === null) return { ok: false, state: 'outside' }
  const segments = relative(projectPath, abs).split(sep)
  // Without regard to case: APFS and NTFS take `.GIT` for `.git`.
  if (segments.some((s) => RESERVED_SEGMENTS.has(s.toLowerCase()))) return { ok: false, state: 'reserved' }
  // The build output is emptied by every build; a snippet written there is gone with the next one.
  const output = resolveBuildDir(projectPath, (await getPrefs(projectPath)).outputDir || undefined)
  const rel = relative(output, abs)
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) return { ok: false, state: 'reserved' }
  const viaLink = abs !== projectPath && (await writableTarget(projectPath, relative(projectPath, abs))) === null
  return { ok: true, abs, viaLink }
}

/**
 * A file name as the form may give it: one segment, not hidden, with an extension from `allowed`.
 * Subfolders are left to the config itself - layout-box reads `file: sub/x.md`, and the picker shows
 * such a value, but creating one here would need a second picker for the folder.
 */
function checkName(name: string, allowed: Set<string>): string {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 200 || /[/\\:\0]/.test(trimmed) || trimmed.startsWith('.')) {
    throw new Error(mainT('snippetNameInvalid', { name }))
  }
  if (!allowed.has(extname(trimmed).toLowerCase())) {
    throw new Error(mainT('snippetExtensionInvalid', { name: trimmed, allowed: [...allowed].join(', ') }))
  }
  return trimmed
}

async function exists(path: string): Promise<boolean> {
  try {
    await lstat(path)
    return true
  } catch {
    return false
  }
}

async function sizeOf(path: string): Promise<number> {
  return (await stat(path)).size
}

export async function listSnippets(projectPath: string, dir: string): Promise<SnippetDirInfo> {
  const checked = await checkDir(projectPath, dir)
  if (!checked.ok) return { state: checked.state, files: [] }
  let entries
  try {
    entries = await readdir(checked.abs, { withFileTypes: true })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { state: 'missing', files: [] }
    throw err
  }
  // A link to a file counts as a file: readdir's Dirent does not follow it (conventions.md).
  const files: string[] = []
  for (const e of entries) {
    if (!SNIPPET_EXTENSIONS.has(extname(e.name).toLowerCase()) || e.name.startsWith('.')) continue
    if (e.isFile() || (e.isSymbolicLink() && (await stat(join(checked.abs, e.name)).catch(() => null))?.isFile())) files.push(e.name)
  }
  files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  return { state: checked.viaLink ? 'link' : 'ok', files }
}

export async function readSnippet(projectPath: string, dir: string, file: string): Promise<string> {
  const checked = await checkDir(projectPath, dir)
  if (!checked.ok) throw new Error(mainT(checked.state === 'outside' ? 'snippetDirOutside' : 'snippetDirReserved', { dir }))
  const path = containedPath(checked.abs, file)
  if (path === null || !SNIPPET_EXTENSIONS.has(extname(path).toLowerCase())) throw new Error(mainT('snippetNameInvalid', { name: file }))
  // What layout-box asks before it reads (resolveSnippetPath): a link inside the folder may point
  // anywhere, so both sides are resolved again. The folder itself may be a link.
  const [realDir, realFile] = await Promise.all([realpath(checked.abs), realpath(path)])
  if (containedPath(realDir, relative(realDir, realFile)) === null) throw new Error(mainT('snippetDirOutside', { dir: file }))
  if ((await sizeOf(path)) > SNIPPET_MAX_BYTES) throw new Error(mainT('snippetTooLarge', { name: file, limit: 2 }))
  return readFile(path, 'utf-8')
}

/** Where a new file may go in a checked directory, or the sentence why not. */
async function writablePath(projectPath: string, dir: string, name: string, allowed: Set<string>): Promise<{ abs: string; name: string }> {
  const checked = await checkDir(projectPath, dir)
  if (!checked.ok) throw new Error(mainT(checked.state === 'outside' ? 'snippetDirOutside' : 'snippetDirReserved', { dir }))
  const clean = checkName(name, allowed)
  const target = await writableTarget(projectPath, join(relative(projectPath, checked.abs), clean))
  if (target === null) throw new Error(mainT('snippetDirLink', { dir: join(dir, clean) }))
  return { abs: target, name: clean }
}

/**
 * Writes a snippet. Without `overwrite` an existing file is not touched and the answer says so -
 * the renderer asks (confirmDialog) and calls again. The editor's own "save" passes `overwrite`:
 * it writes the file it opened.
 */
export async function writeSnippet(
  projectPath: string,
  dir: string,
  file: string,
  content: string,
  overwrite: boolean
): Promise<SnippetFileResult> {
  if (Buffer.byteLength(content, 'utf-8') > SNIPPET_MAX_BYTES) throw new Error(mainT('snippetTooLarge', { name: file, limit: 2 }))
  const { abs, name } = await writablePath(projectPath, dir, file, SNIPPET_EXTENSIONS)
  if (!overwrite && (await exists(abs))) return { status: 'exists', file: name }
  await mkdir(dirname(abs), { recursive: true })
  await writeFileAtomic(abs, content)
  return { status: 'written', file: name }
}

/** Copies a file next to the target through a temporary name, so a reader never sees half of it. */
async function copyAtomic(source: string, target: string): Promise<void> {
  const tmp = `${target}.tmp-${process.pid}-${randomUUID().slice(0, 8)}`
  try {
    await copyFile(source, tmp)
    const handle = await open(tmp, 'r+')
    try {
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(tmp, target)
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => undefined)
    throw err
  }
}

async function importFile(
  projectPath: string,
  dir: string,
  sourcePath: string,
  name: string | undefined,
  overwrite: boolean,
  allowed: Set<string>,
  maxBytes: number
): Promise<{ status: 'written' | 'exists'; name: string }> {
  const { abs, name: clean } = await writablePath(projectPath, dir, name ?? basename(sourcePath), allowed)
  // The source too, not only the name it gets: with `name` from the renderer - which is no trust
  // boundary - any file could be copied in under an allowed name, ~/.ssh/id_ed25519 as key.md, and
  // travel on with the next sync or deploy (fortieth review, finding 10).
  if (!allowed.has(extname(sourcePath).toLowerCase())) {
    throw new Error(mainT('snippetExtensionInvalid', { name: basename(sourcePath), allowed: [...allowed].join(', ') }))
  }
  const info = await stat(sourcePath)
  if (!info.isFile()) throw new Error(mainT('snippetNameInvalid', { name: basename(sourcePath) }))
  if (info.size > maxBytes) throw new Error(mainT('snippetTooLarge', { name: clean, limit: Math.round(maxBytes / 1024 / 1024) }))
  if (!overwrite && (await exists(abs))) return { status: 'exists', name: clean }
  await mkdir(dirname(abs), { recursive: true })
  await copyAtomic(sourcePath, abs)
  return { status: 'written', name: clean }
}

export async function importSnippet(
  projectPath: string,
  dir: string,
  sourcePath: string,
  name: string | undefined,
  overwrite: boolean
): Promise<SnippetFileResult> {
  const r = await importFile(projectPath, dir, sourcePath, name, overwrite, SNIPPET_EXTENSIONS, SNIPPET_MAX_BYTES)
  return { status: r.status, file: r.name }
}

/**
 * Copies a picture to quartz/static/images, which Quartz's static emitter publishes as
 * static/images/ - so a snippet reaches it as `{{root}}/static/images/<name>` on every page depth.
 * The template part `static` carries the folder already (templatePackage/parts.ts).
 */
export async function importStaticImage(
  projectPath: string,
  sourcePath: string,
  name: string | undefined,
  overwrite: boolean
): Promise<StaticImageResult> {
  const r = await importFile(projectPath, IMAGES_DIR, sourcePath, name, overwrite, IMAGE_EXTENSIONS, IMAGE_MAX_BYTES)
  return { status: r.status, relativePath: `images/${r.name}` }
}
