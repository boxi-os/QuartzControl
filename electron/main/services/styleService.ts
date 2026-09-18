import { existsSync, mkdirSync } from 'fs'
import { copyFile, readFile, readdir, rename, rm, stat, writeFile } from 'fs/promises'
import { createRequire } from 'module'
import { basename, dirname, join, relative, sep } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import type {
  CssVariableOverride,
  FontFaceInfo,
  PreviewFontFace,
  PreviewFonts,
  ScssCheckResult,
  ScssDiagnostic,
  StyleFile,
  StyleFileSet,
  StyleReferenceFile,
  StylesInfo
} from '@shared/ipc-contract'
import { resolveBuildDir } from './projectDirs'
import { mainT } from '../i18n'
import { MAX_FONT_FILE_BYTES } from './fontFile'

// The file Quartz's build imports directly (quartz/plugins/emitters/componentResources.ts) -
// verified against a real clone. Already inside the dev server's esbuild watch graph, so saving
// it needs no extra live-reload wiring; the existing hot-reload websocket picks it up.
export function customScssPath(projectPath: string): string {
  return join(projectPath, 'quartz', 'styles', 'custom.scss')
}

export async function readCustomScss(projectPath: string): Promise<StylesInfo> {
  const path = customScssPath(projectPath)
  const content = existsSync(path) ? await readFile(path, 'utf-8') : ''
  return { path, content }
}

export async function writeCustomScss(projectPath: string, content: string): Promise<void> {
  await writeFile(customScssPath(projectPath), content, 'utf-8')
}

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', '.changeset'])

async function findScssFiles(dir: string, depth = 0): Promise<string[]> {
  if (depth > 6) return []
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const results: string[] = []
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...(await findScssFiles(full, depth + 1)))
    } else if (entry.name.endsWith('.scss')) {
      results.push(full)
    }
  }
  return results
}

// Read-only reference for a CLI-installed plugin's own *.scss files, so the user can see the
// original selectors they're overriding. Built-in @quartz-community/x entries have no
// discoverable source on disk - same limitation pluginSchemaService already has for options.
export async function getStyleReferences(projectPath: string, pluginName: string): Promise<StyleReferenceFile[]> {
  const pluginDir = join(projectPath, '.quartz', 'plugins', pluginName)
  if (!existsSync(pluginDir)) return []
  const files = (await findScssFiles(pluginDir)).slice(0, 20)
  return Promise.all(
    files.map(async (path) => ({
      label: relative(pluginDir, path),
      path,
      content: await readFile(path, 'utf-8')
    }))
  )
}

export async function importStyleFile(projectPath: string, sourcePath: string): Promise<{ importLine: string; relativePath: string }> {
  const importedDir = join(projectPath, 'quartz', 'styles', 'imported')
  mkdirSync(importedDir, { recursive: true })
  const fileName = basename(sourcePath)
  await copyFile(sourcePath, join(importedDir, fileName))
  const useSpecifier = `./imported/${fileName.replace(/\.(scss|css)$/, '')}`
  return { importLine: `@use "${useSpecifier}";`, relativePath: `imported/${fileName}` }
}

// The name in the marker is the app's. Until 2026-09-18 it was the old working title,
// `Quartz-GUI`, and unlike `.quartz-gui/` this one is read by people: it is a comment in the
// project's own custom.scss. So it was renamed - with both spellings read, and only the new one
// written. Whatever section is written, every managed block in the file moves to the new name
// with it (renameLegacyMarkers), so a project migrates on its first save rather than one section
// at a time - a font is imported once, and its block would otherwise carry the old name for good.
//
// The price is on the other side of the version line, and it is more than a second block: a build
// from before the rename (beta.2 and older) sees none of the new blocks. Measured (twenty-seventh
// review, finding 3, beta.2's styleService as a bundle against a migrated copy of a real project):
// it read 0 of 50 variables and 0 of 30 imported files, appended its own css-vars block at the end
// when a variable was saved, and put its imports block *inside* ours when one file was switched
// on - two `@use` of the same namespace, and the build broke for both versions. The usual way
// there is two machines with different versions and a project travelling between them through
// Git-Sync; this side cannot prevent it, only read what the other one leaves behind. And the
// renaming above makes that price due sooner and wider: before it, a write cost the old side the
// one section it wrote; now any write - importing a font is enough - costs it all three
// (twenty-eighth review, finding 2). Kept, because a file that carries both names for good is the
// worse end; what answers it is a sentence in the release notes (docs/release.md, point 7).
//
// Where both copies of a section stand, both are read, in file order, and the later one wins -
// the same rule the browser applies, so the page shows what the site shows. Reading only the new
// one showed a value the site did not have and dropped the one it had on the next save. The next
// write puts the union where the first copy stood and removes the other (replaceManagedBlocks).
const MARKER_NAMES = ['QuartzControl', 'Quartz-GUI'] as const

function managedBlockMarkers(markerId: string, name: (typeof MARKER_NAMES)[number] = MARKER_NAMES[0]): { start: string; end: string } {
  return {
    start: `/* --- ${name}:managed:${markerId}:start --- */`,
    end: `/* --- ${name}:managed:${markerId}:end --- */`
  }
}

interface ManagedSpan {
  /** Where the start marker begins and where the end marker ends. */
  from: number
  to: number
  body: string
}

// A section under either name, the current one first. An unterminated start marker is no section.
function findManagedBlock(content: string, markerId: string, names: readonly string[] = MARKER_NAMES): ManagedSpan | null {
  for (const name of names) {
    const { start, end } = managedBlockMarkers(markerId, name as (typeof MARKER_NAMES)[number])
    const startIdx = content.indexOf(start)
    if (startIdx === -1) continue
    const endIdx = content.indexOf(end, startIdx)
    if (endIdx === -1) continue
    return { from: startIdx, to: endIdx + end.length, body: content.slice(startIdx + start.length, endIdx) }
  }
  return null
}

// Every copy of a section, in the order they stand in the file. A copy nested inside another is
// part of that one's body rather than a copy of its own - which is where beta.2 puts its imports
// block when ours is there (see MARKER_NAMES), and reading through it is what lists the files.
function findManagedBlocks(content: string, markerId: string): ManagedSpan[] {
  const spans = MARKER_NAMES.map((name) => findManagedBlock(content, markerId, [name])).filter(
    (span): span is ManagedSpan => span !== null
  )
  return spans
    .filter((span) => !spans.some((other) => other !== span && other.from < span.from && span.to <= other.to))
    .sort((a, b) => a.from - b.from)
}

// Cuts a span out and closes the gap where it was - only there: a blank line elsewhere in the
// file is the user's.
function cutSpan(content: string, span: { from: number; to: number }): string {
  const before = content.slice(0, span.from).replace(/\n+$/, '')
  const after = content.slice(span.to).replace(/^\n+/, '')
  if (!before) return after
  if (!after) return `${before}\n`
  return `${before}\n\n${after}`
}

// Writes `block` over the first copy of the section and removes the others. The first, because it
// is the one the file was arranged around - an older build appends its copy at the end, and
// writing the union there moved all fifty variables of a real project behind the user's own rules
// to keep the one that build had added (measured, twenty-seventh review, finding 3). From the end
// backwards, so the earlier offsets still hold.
function replaceManagedBlocks(content: string, spans: ManagedSpan[], block: string): string {
  let next = content
  for (let i = spans.length - 1; i >= 0; i--) {
    const span = spans[i]
    next = i === 0 ? next.slice(0, span.from) + block + next.slice(span.to) : cutSpan(next, span)
  }
  return next
}

// The old name, wherever it still stands on a section that has no copy under the new one. Only the
// two marker comments change; a section with both copies is left to the write of that section.
function renameLegacyMarkers(content: string): string {
  const [current, ...legacy] = MARKER_NAMES
  let next = content
  for (const name of legacy) {
    const ids = new Set([...next.matchAll(new RegExp(`/\\* --- ${name}:managed:([\\w-]+):start --- \\*/`, 'g'))].map((m) => m[1]))
    for (const id of ids) {
      if (!findManagedBlock(next, id, [name]) || findManagedBlock(next, id, [current])) continue
      const old = managedBlockMarkers(id, name)
      const renamed = managedBlockMarkers(id, current)
      next = next.replace(old.start, renamed.start)
      next = next.replace(old.end, renamed.end)
    }
  }
  return next
}

/**
 * Joins the bodies of a rules-only section (the @font-face rules in 'fonts'), keeping each rule
 * once. A rule is everything up to its closing brace at depth 0, comments in front of it
 * included, and two rules are the same when they are the same text up to whitespace. Two equal
 * `@font-face` are one face to a browser, but a block that says it three times reads as broken -
 * and it grew with every repeated import of the same template under 'projectWins', and with the
 * union of two marker copies that each held the same font (twenty-eighth review, "nebenbei" 3 and
 * the question about two fonts blocks). Text after the last rule is kept as it is.
 */
export function joinUniqueRules(bodies: string[]): string {
  const seen = new Set<string>()
  const out: string[] = []
  const keep = (chunk: string): void => {
    const trimmed = chunk.trim()
    if (!trimmed) return
    const key = trimmed.replace(/\s+/g, ' ')
    if (seen.has(key)) return
    seen.add(key)
    out.push(trimmed)
  }
  for (const body of bodies) {
    let depth = 0
    let start = 0
    for (let i = 0; i < body.length; i++) {
      if (body[i] === '{') depth++
      else if (body[i] === '}' && depth > 0 && --depth === 0) {
        keep(body.slice(start, i + 1))
        start = i + 1
      }
    }
    keep(body.slice(start))
  }
  return out.join('\n\n')
}

// Reads the current body of a marker-delimited managed section, or null if it doesn't exist yet -
// lets a caller accumulate onto an existing section (e.g. another @font-face rule) instead of only
// ever appending a fresh one.
export function getManagedBlock(content: string, markerId: string): string | null {
  const spans = findManagedBlocks(content, markerId)
  if (spans.length === 0) return null
  return spans
    .map((span) => span.body.trim())
    .filter(Boolean)
    .join('\n\n')
}

// Replaces a marker-delimited managed section in-place (appending a new one at the end if it
// doesn't exist yet, or if the existing markers are malformed) - unlike a plain append, this lets
// a section be regenerated from scratch (e.g. after a variable override is toggled off) without
// leaving stale content behind.
export function upsertManagedBlock(content: string, markerId: string, body: string): string {
  const { start, end } = managedBlockMarkers(markerId)
  const block = `${start}\n${body}\n${end}`
  const spans = findManagedBlocks(content, markerId)
  if (spans.length === 0) {
    const trimmed = content.replace(/\s+$/, '')
    return renameLegacyMarkers(trimmed ? `${trimmed}\n\n${block}\n` : `${block}\n`)
  }
  return renameLegacyMarkers(replaceManagedBlocks(content, spans, block))
}

// Managed section for Phase-3a's CSS variable overrides - separate marker from fonts' so both
// sections can coexist and be regenerated independently.
const CSS_VARS_MARKER = 'css-vars'

function cssValue(raw: string): string {
  return raw.trim()
}

// Parses the two flat rule blocks our own renderVariableOverrides() writes - not a general CSS
// parser, just enough to round-trip what we generate ourselves.
function parseDeclarations(block: string): Record<string, string> {
  const decls: Record<string, string> = {}
  const re = /--([\w-]+)\s*:\s*([^;]+);/g
  let match: RegExpExecArray | null
  while ((match = re.exec(block)) !== null) {
    decls[match[1]] = cssValue(match[2])
  }
  return decls
}

// Every rule of each kind, the later one winning per variable: a body read from two copies of the
// section (see MARKER_NAMES) carries two of each, and the browser applies them the same way.
function parseVariableOverrides(body: string): CssVariableOverride[] {
  const light: Record<string, string> = {}
  const dark: Record<string, string> = {}
  for (const match of body.matchAll(/:root\s*\{([^}]*)\}/g)) Object.assign(light, parseDeclarations(match[1]))
  for (const match of body.matchAll(/:root\[saved-theme=["']dark["']\]\s*\{([^}]*)\}/g)) Object.assign(dark, parseDeclarations(match[1]))
  return Object.entries(light).map(([key, value]) => ({ key, light: value, dark: dark[key] }))
}

function renderVariableOverrides(overrides: CssVariableOverride[]): string {
  const lightLines = overrides.map((o) => `  --${o.key}: ${o.light};`).join('\n')
  const darkOverrides = overrides.filter((o) => o.dark !== undefined && o.dark !== '')
  const darkLines = darkOverrides.map((o) => `  --${o.key}: ${o.dark};`).join('\n')
  let out = `:root {\n${lightLines}\n}`
  if (darkOverrides.length > 0) {
    out += `\n\n:root[saved-theme="dark"] {\n${darkLines}\n}`
  }
  return out
}

export async function getVariableOverrides(projectPath: string): Promise<CssVariableOverride[]> {
  const info = await readCustomScss(projectPath)
  const body = getManagedBlock(info.content, CSS_VARS_MARKER)
  return body ? parseVariableOverrides(body) : []
}

export async function saveVariableOverrides(projectPath: string, overrides: CssVariableOverride[]): Promise<void> {
  const info = await readCustomScss(projectPath)
  const next =
    overrides.length === 0
      ? // an empty override list still clears a previously-written block rather than leaving stale
        // rules behind - upsertManagedBlock always needs a non-empty body, so remove the markers
        // outright by upserting an intentionally-empty :root rule then stripping it back out.
        renameLegacyMarkers(stripManagedBlock(info.content, CSS_VARS_MARKER))
      : upsertManagedBlock(info.content, CSS_VARS_MARKER, renderVariableOverrides(overrides))
  await writeCustomScss(projectPath, next)
}

export function stripManagedBlock(content: string, markerId: string): string {
  const span = findManagedBlock(content, markerId)
  if (!span) return content
  // The gap closed where the block was and nowhere else, as when the old copy goes on a write
  // (cutSpan). It used to be `\n{3,}` over the whole file, which also pulled together blank lines in
  // the user's own CSS. Measured against the ten custom.scss under ~/Documents/QuartzProjekte: the
  // template export (all four blocks out, then trimmed) is byte-identical either way; taking the
  // css-vars block alone out differs in eight of them, by the one blank line the old way left at
  // the end of the file (twenty-seventh review, finding 3, "daneben").
  // Both copies go: "no overrides" means no block under either name.
  return stripManagedBlock(cutSpan(content, span), markerId)
}

const IMPORTS_MARKER = 'imports'
const STYLE_DIRS = ['custom', 'imported'] as const

function stylesDir(projectPath: string): string {
  return join(projectPath, 'quartz', 'styles')
}

function styleFilePath(projectPath: string, relativePath: string): string {
  return join(stylesDir(projectPath), ...relativePath.split('/'))
}

// "custom/typography.scss" -> `@use "./custom/typography";`. The extension is dropped for both
// .scss and .css: Dart Sass' own resolution tries .sass/.scss/.css for an extensionless URL, and
// this keeps the line identical to what importStyleFile() has always written.
function useSpecifierFor(relativePath: string): string {
  return `./${relativePath.replace(/\.(scss|css)$/, '')}`
}

// The reverse, resolved against what is actually on disk rather than guessed - an extensionless
// specifier could mean either extension, and a partial may be written as _name.scss.
function relativePathForSpecifier(projectPath: string, specifier: string): string | null {
  const bare = specifier.replace(/^\.\//, '').replace(/\.(scss|css)$/, '')
  const dir = bare.split('/')[0]
  const name = bare.split('/').slice(1).join('/')
  if (!STYLE_DIRS.includes(dir as (typeof STYLE_DIRS)[number]) || !name || name.includes('/')) return null
  for (const candidate of [`${name}.scss`, `_${name}.scss`, `${name}.css`]) {
    if (existsSync(join(stylesDir(projectPath), dir, candidate))) return `${dir}/${candidate}`
  }
  return null
}

// An entry whose file no longer exists is dropped rather than kept: the block is written only by
// this app and restricted to custom/ and imported/, so an unresolvable `@use` there means the file
// was deleted outside the app - and leaving it in would break the next build.
function parseImportOrder(projectPath: string, content: string): string[] {
  const body = getManagedBlock(content, IMPORTS_MARKER)
  if (!body) return []
  const out: string[] = []
  const re = /@use\s+["']([^"']+)["']/g
  let match: RegExpExecArray | null
  while ((match = re.exec(body)) !== null) {
    const relativePath = relativePathForSpecifier(projectPath, match[1])
    if (relativePath && !out.includes(relativePath)) out.push(relativePath)
  }
  return out
}

// Inserts the block *before the first rule* rather than at the end of the file, which is what
// upsertManagedBlock does and what every other managed section here wants. Sass rejects a `@use`
// that follows a rule outright ("@use rules must be written before any other rules"), so this
// walks past the leading comments, blank lines and Quartz's own `@use "./variables.scss" as *;`
// and stops at the first line that is anything else.
function upsertImportBlock(content: string, body: string): string {
  const { start, end } = managedBlockMarkers(IMPORTS_MARKER)
  const spans = findManagedBlocks(content, IMPORTS_MARKER)
  if (spans.length > 0) {
    if (!body) return renameLegacyMarkers(stripManagedBlock(content, IMPORTS_MARKER))
    return renameLegacyMarkers(replaceManagedBlocks(content, spans, `${start}\n${body}\n${end}`))
  }
  if (!body) return content

  // Placed directly after the leading @charset/@use/@forward lines (Quartz's own
  // `@use "./variables.scss" as *;` among them) - *not* after the leading comments, which would
  // push the block past a "// put your custom CSS here!" line and, in a file that has one, all
  // the way to the end where a later hand-written rule could end up above it.
  const lines = content.split('\n')
  let cursor = 0
  let insertAt = 0
  let inComment = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (inComment) {
      if (line.includes('*/')) inComment = false
      cursor = i + 1
      continue
    }
    if (line === '' || line.startsWith('//')) {
      cursor = i + 1
      continue
    }
    if (line.startsWith('/*')) {
      inComment = !line.includes('*/')
      cursor = i + 1
      continue
    }
    if (/^@(charset|use|forward)\b/.test(line)) {
      cursor = i + 1
      insertAt = cursor
      continue
    }
    break
  }
  if (insertAt === 0) insertAt = cursor
  lines.splice(insertAt, 0, '', `${start}\n${body}\n${end}`)
  return renameLegacyMarkers(lines.join('\n').replace(/\n{3,}/g, '\n\n'))
}

export async function listStyleFiles(projectPath: string): Promise<StyleFileSet> {
  const main = await readCustomScss(projectPath)
  const order = parseImportOrder(projectPath, main.content)

  const onDisk: string[] = []
  for (const dir of STYLE_DIRS) {
    const full = join(stylesDir(projectPath), dir)
    if (!existsSync(full)) continue
    for (const entry of await readdir(full, { withFileTypes: true })) {
      if (entry.isFile() && /\.(scss|css)$/.test(entry.name)) onDisk.push(`${dir}/${entry.name}`)
    }
  }
  onDisk.sort()

  // Order first (that is the load order), then whatever exists but is not wired up - which is a
  // real state worth showing rather than hiding: the file is there and does nothing.
  const ordered = order.filter((relativePath) => onDisk.includes(relativePath))
  const orphans = onDisk.filter((relativePath) => !ordered.includes(relativePath))
  const toFile = (relativePath: string, imported: boolean): StyleFile => ({
    relativePath,
    path: styleFilePath(projectPath, relativePath),
    name: relativePath.split('/').slice(1).join('/'),
    imported
  })
  return {
    main,
    files: [...ordered.map((p) => toFile(p, true)), ...orphans.map((p) => toFile(p, false))]
  }
}

export async function readStyleFile(projectPath: string, relativePath: string): Promise<string> {
  const path = styleFilePath(projectPath, relativePath)
  return existsSync(path) ? readFile(path, 'utf-8') : ''
}

export async function writeStyleFile(projectPath: string, relativePath: string, content: string): Promise<void> {
  const path = styleFilePath(projectPath, relativePath)
  mkdirSync(dirname(path), { recursive: true })
  await writeFile(path, content, 'utf-8')
}

export async function createStyleFile(projectPath: string, name: string): Promise<StyleFile> {
  const fileName = /\.(scss|css)$/.test(name) ? name : `${name}.scss`
  const relativePath = `custom/${fileName}`
  const path = styleFilePath(projectPath, relativePath)
  if (existsSync(path)) throw new Error(mainT('styleFileExists', { name: fileName }))
  mkdirSync(dirname(path), { recursive: true })
  await writeFile(path, `// ${fileName}\n`, 'utf-8')
  await setImportOrder(projectPath, [...(await currentOrder(projectPath)), relativePath])
  return { relativePath, path, name: fileName, imported: true }
}

export async function renameStyleFile(projectPath: string, relativePath: string, newName: string): Promise<StyleFile> {
  const dir = relativePath.split('/')[0]
  const fileName = /\.(scss|css)$/.test(newName) ? newName : `${newName}.scss`
  const nextRelative = `${dir}/${fileName}`
  if (nextRelative === relativePath) return { relativePath, path: styleFilePath(projectPath, relativePath), name: fileName, imported: true }
  const target = styleFilePath(projectPath, nextRelative)
  if (existsSync(target)) throw new Error(mainT('styleFileExists', { name: fileName }))
  // Read *before* renaming: parseImportOrder resolves each @use against what is on disk, so once
  // the old name is gone its entry no longer resolves and reading the order afterwards would
  // silently drop the very file being renamed (and, with it, every later save's order).
  const order = (await currentOrder(projectPath)).map((p) => (p === relativePath ? nextRelative : p))
  await rename(styleFilePath(projectPath, relativePath), target)
  await setImportOrder(projectPath, order)
  return { relativePath: nextRelative, path: target, name: fileName, imported: order.includes(nextRelative) }
}

export async function deleteStyleFile(projectPath: string, relativePath: string): Promise<void> {
  const path = styleFilePath(projectPath, relativePath)
  // The order is rewritten first: a file left in the block after being deleted breaks the build,
  // which is a worse outcome than an orphaned file left on disk after a failed unlink.
  await setImportOrder(
    projectPath,
    (await currentOrder(projectPath)).filter((p) => p !== relativePath)
  )
  if (existsSync(path)) await rm(path)
}

async function currentOrder(projectPath: string): Promise<string[]> {
  const main = await readCustomScss(projectPath)
  return parseImportOrder(projectPath, main.content)
}

// The namespace Sass derives when a `@use` has no `as`: the last path component, without its
// extension, without a leading underscore, and only up to the first dot. Measured with the
// project's own dart-sass, because two of its consequences are load-bearing below.
function defaultNamespaceFor(relativePath: string): string {
  const base = relativePath.split('/').pop() ?? relativePath
  return base.replace(/\.(scss|css)$/, '').replace(/^_/, '').split('.')[0]
}

// A namespace has to be a Sass identifier, which above all means: not starting with a digit.
// `styleFileName` (ipc/schemas.ts) allows a leading digit on purpose - numbering stylesheets is
// how people order them - so this is reachable in two clicks, and the file name is not the thing
// to restrict.
const VALID_NAMESPACE = /^[A-Za-z_][A-Za-z0-9_-]*$/

// Both failure modes measured against the project's own dart-sass, and both take the *whole*
// project's CSS with them - one bad `@use` and nothing compiles any more:
//
//   @use "./custom/01-typografie";                 The default namespace "01-typografie" is not
//                                                  a valid Sass identifier.
//   @use "./custom/typo.grafie"; @use "./custom/typo";
//                                                  There's already a module with namespace "typo".
//
// An explicit `as` fixes both, and the block is generated anyway: nobody types these namespaces,
// they exist because Sass insists on one per module. Written only where it is needed, so an
// ordinary stylesheet's line stays the line it has always been.
function useLineFor(relativePath: string, taken: Set<string>): string {
  const specifier = useSpecifierFor(relativePath)
  const wanted = defaultNamespaceFor(relativePath)
  if (VALID_NAMESPACE.test(wanted) && !taken.has(wanted)) {
    taken.add(wanted)
    return `@use "${specifier}";`
  }
  // `ns-` rather than a bare letter, so a sanitised namespace is recognisable as generated; the
  // counter is for the collision case, where the sanitised name is already the taken one.
  const base = VALID_NAMESPACE.test(wanted) ? wanted : `ns-${wanted}`
  let namespace = base
  for (let n = 2; taken.has(namespace); n++) namespace = `${base}-${n}`
  taken.add(namespace)
  return `@use "${specifier}" as ${namespace};`
}

export async function setImportOrder(projectPath: string, relativePaths: string[]): Promise<void> {
  const main = await readCustomScss(projectPath)
  const taken = new Set<string>()
  const body = relativePaths.map((p) => useLineFor(p, taken)).join('\n')
  await writeCustomScss(projectPath, upsertImportBlock(main.content, body))
}

// Compiles custom.scss with the *project's own* Sass - the same dart-sass version
// esbuild-sass-plugin uses during a real build (verified: quartz/cli/handlers.js registers
// sassPlugin(), which resolves `sass` from the project). Using the project's copy rather than
// bundling one keeps the check honest across Quartz versions and adds no dependency here.
//
// A missing sass is reported as "unavailable", not as a pass: a project that has never had
// `npm install` run in it cannot be checked, and saying "no errors" there would be a lie.
interface ProjectSass {
  compile: (path: string, options?: Record<string, unknown>) => unknown
  compileString: (source: string, options?: Record<string, unknown>) => unknown
}

// This runs the project's sass inside the main process, which holds safeStorage - accepted, with
// the reason, in docs/decisions/process-model-and-ipc.md ("Code from a project's node_modules").
function loadProjectSass(projectPath: string): ProjectSass | null {
  try {
    return createRequire(join(projectPath, 'package.json'))('sass') as ProjectSass
  } catch {
    return null
  }
}

export async function checkStyles(projectPath: string): Promise<ScssCheckResult> {
  const entry = customScssPath(projectPath)
  if (!existsSync(entry)) return { status: 'unavailable', reason: mainT('styleCustomScssMissing') }
  const sass = loadProjectSass(projectPath)
  if (!sass) return { status: 'unavailable', reason: mainT('styleSassMissing') }
  try {
    sass.compile(entry, { loadPaths: [stylesDir(projectPath)], quietDeps: true, verbose: false })
    return { status: 'ok' }
  } catch (err) {
    const diagnostic = toDiagnostic(projectPath, err)
    // The one error this app can name the way out of: an older build (beta.2) that switched a
    // file on wrote its own imports block inside ours, two `@use` of the same namespace. The Sass
    // message says "There's already a module with namespace …" about a block the user did not
    // write, and any write of the load order replaces the nested pair with one block (measured,
    // twenty-eighth review, "nebenbei" 5). Asked of the file, not of the message: the message is
    // Sass's wording and the same for a namespace the user doubled by hand.
    const content = await readFile(entry, 'utf-8').catch(() => '')
    return { status: 'error', diagnostic: hasNestedManagedCopy(content, 'imports') ? { ...diagnostic, nestedImportBlock: true } : diagnostic }
  }
}

// Whether one copy of a section stands inside another - the shape findManagedBlocks reads through.
function hasNestedManagedCopy(content: string, markerId: string): boolean {
  const spans = MARKER_NAMES.map((name) => findManagedBlock(content, markerId, [name])).filter(
    (span): span is ManagedSpan => span !== null
  )
  return spans.some((span) => spans.some((other) => other !== span && other.from < span.from && span.to <= other.to))
}

// Checks one file's *unsaved* content, standing alone. That is not an approximation: with Sass
// modules a partial sees nothing of what included it, so `custom/typografie.scss` really does
// compile against only its own `@use` lines - and custom.scss, being the entry point, pulls in the
// whole chain anyway. The url matters: without it a relative `@use "./variables.scss"` has no
// directory to resolve against.
export async function checkStyleSource(
  projectPath: string,
  relativePath: string,
  content: string
): Promise<ScssCheckResult> {
  const sass = loadProjectSass(projectPath)
  if (!sass) return { status: 'unavailable', reason: mainT('styleSassMissing') }
  const filePath =
    relativePath === 'custom.scss' ? customScssPath(projectPath) : styleFilePath(projectPath, relativePath)
  try {
    sass.compileString(content, {
      url: pathToFileURL(filePath),
      syntax: filePath.endsWith('.css') ? 'css' : 'scss',
      loadPaths: [stylesDir(projectPath)],
      quietDeps: true
    })
    return { status: 'ok' }
  } catch (err) {
    return { status: 'error', diagnostic: toDiagnostic(projectPath, err) }
  }
}

// Sass throws an Exception carrying a `span` with the file URL and a 0-based line/column. The URL
// is mapped back to a relativePath when the error is in one of the project's own stylesheets, so
// the editor can point at the right tab; an error inside node_modules keeps its raw message.
function toDiagnostic(projectPath: string, err: unknown): ScssDiagnostic {
  const e = err as { message?: string; sassMessage?: string; span?: { url?: unknown; start?: { line: number; column: number } } }
  const message = e.sassMessage ?? e.message ?? String(err)
  const url = e.span?.url
  let filePath: string | undefined
  if (typeof url === 'string') filePath = url.startsWith('file:') ? fileURLToPath(url) : url
  else if (url && typeof url === 'object' && 'href' in url) filePath = fileURLToPath(String((url as URL).href))
  const rel = filePath ? relative(stylesDir(projectPath), filePath).split(sep).join('/') : undefined
  return {
    message,
    relativePath: rel && !rel.startsWith('..') ? rel : undefined,
    line: e.span?.start ? e.span.start.line + 1 : undefined,
    column: e.span?.start ? e.span.start.column + 1 : undefined
  }
}

// ── which fonts the site actually has ───────────────────────────────────────

const FONT_FACE_RE = /@font-face\s*\{([^}]*)\}/g

function declaration(body: string, property: string): string | undefined {
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'i').exec(body)
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : undefined
}

interface ParsedFace {
  family: string
  weight: string
  style: string
  unicodeRange?: string
  /** The first url() of `src`, verbatim. */
  url?: string
}

function parseFontFaces(content: string): ParsedFace[] {
  const out: ParsedFace[] = []
  FONT_FACE_RE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = FONT_FACE_RE.exec(content)) !== null) {
    const family = declaration(match[1], 'font-family')
    if (!family) continue
    const src = declaration(match[1], 'src')
    out.push({
      family,
      weight: declaration(match[1], 'font-weight') ?? '400',
      style: declaration(match[1], 'font-style') ?? 'normal',
      unicodeRange: declaration(match[1], 'unicode-range'),
      url: src ? /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(src)?.[1] : undefined
    })
  }
  return out
}

// A face's file on disk, for the one URL shape both sources write: `…/static/fonts/<file>`. The
// app's font import writes it root-relative, Quartz writes it absolute on the baseUrl
// (`https://<baseUrl>/static/fonts/<hash>.ttf`, read from a real build). Anything else - a CDN, a
// data: URI, a path elsewhere - has no file here. Only a bare file name is accepted, so the result
// cannot leave `dir`.
function fontFileIn(dir: string, url: string | undefined): string | undefined {
  if (!url) return undefined
  const match = /\/static\/fonts\/([^/?#]+)(?:[?#].*)?$/.exec(url)
  if (!match) return undefined
  let name: string
  try {
    name = decodeURIComponent(match[1])
  } catch {
    return undefined
  }
  if (name !== basename(name) || name.startsWith('.') || name.includes('\\')) return undefined
  return join(dir, name)
}

function projectFontsDir(projectPath: string): string {
  return join(projectPath, 'quartz', 'static', 'fonts')
}

async function projectStylesheets(projectPath: string): Promise<string[]> {
  const files = [customScssPath(projectPath)]
  for (const dir of STYLE_DIRS) {
    const full = join(stylesDir(projectPath), dir)
    if (!existsSync(full)) continue
    for (const entry of await readdir(full, { withFileTypes: true })) {
      if (entry.isFile() && /\.(scss|css)$/.test(entry.name)) files.push(join(full, entry.name))
    }
  }
  return files.filter((f) => existsSync(f))
}

// The stylesheets of a build that can hold @font-face rules Quartz wrote: index.css (core, with
// cdnCaching off, downloads the Google fonts and inlines their rules there) and the Fonts plugin's
// static/fonts/quartz-fonts.css (its `selfHosted` mode). The built index.css also carries every
// rule of custom.scss, compiled - the caller drops those, they are the project's own.
async function buildStylesheets(projectPath: string): Promise<string[]> {
  const buildDir = resolveBuildDir(projectPath)
  const files = [join(buildDir, 'index.css')]
  const fontsDir = join(buildDir, 'static', 'fonts')
  if (existsSync(fontsDir)) {
    for (const entry of await readdir(fontsDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.css')) files.push(join(fontsDir, entry.name))
    }
  }
  return files.filter((f) => existsSync(f))
}

interface LocatedFace extends ParsedFace {
  origin: 'project' | 'build'
  source: string
  file?: string
}

async function projectAndBuildFaces(projectPath: string): Promise<LocatedFace[]> {
  const out: LocatedFace[] = []
  for (const path of await projectStylesheets(projectPath)) {
    for (const face of parseFontFaces(await readFile(path, 'utf-8'))) {
      out.push({
        ...face,
        origin: 'project',
        source: relative(stylesDir(projectPath), path).split(sep).join('/'),
        file: fontFileIn(projectFontsDir(projectPath), face.url)
      })
    }
  }
  const own = new Set(out.map((f) => f.family.toLowerCase()))
  const buildFonts = join(resolveBuildDir(projectPath), 'static', 'fonts')
  for (const path of await buildStylesheets(projectPath)) {
    for (const face of parseFontFaces(await readFile(path, 'utf-8'))) {
      if (own.has(face.family.toLowerCase())) continue
      out.push({
        ...face,
        origin: 'build',
        source: relative(projectPath, path).split(sep).join('/'),
        file: fontFileIn(buildFonts, face.url)
      })
    }
  }
  return out
}

/**
 * Every @font-face the built site will have, from the three places one can come from.
 *
 * Quartz downloads fonts *only* for `fontOrigin: "googleFonts"` - its local branch in
 * componentResources.ts is a comment reading "let the user do it themselves in css" and emits
 * nothing at all. So under "local" the available weights and styles are exactly what the project's
 * own stylesheets declare (the app's own font import writes one such block) plus whatever font
 * files the active community theme ships, which theme.json lists under `meta.fontFiles` with the
 * family, style and weight of each - including variable ranges like "100 1000". Under
 * "googleFonts" with the files served locally, the rules exist only after a build, in the build
 * output - until 2026-09-18 they were not read, and every Google font said "no @font-face rule".
 */
export async function collectFontFaces(projectPath: string, themeId?: string): Promise<FontFaceInfo[]> {
  const out: FontFaceInfo[] = []

  if (themeId) {
    const themeJson = join(projectPath, 'node_modules', '@quartz-themes', themeId, 'theme.json')
    if (existsSync(themeJson)) {
      try {
        const parsed = JSON.parse(await readFile(themeJson, 'utf-8')) as {
          meta?: { fontFiles?: { family?: string; style?: string; weight?: string }[] }
        }
        for (const file of parsed.meta?.fontFiles ?? []) {
          if (!file.family) continue
          out.push({
            family: file.family,
            weight: file.weight ?? '400',
            style: file.style ?? 'normal',
            origin: 'theme',
            source: `@quartz-themes/${themeId}`
          })
        }
      } catch {
        // a malformed theme.json is the theme's problem, not a reason to show nothing at all
      }
    }
  }

  for (const face of await projectAndBuildFaces(projectPath)) {
    out.push({ family: face.family, weight: face.weight, style: face.style, origin: face.origin, source: face.source })
  }
  return out
}

// A ceiling over all faces together; each file is held to MAX_FONT_FILE_BYTES on its own as well.
// The four families of a preview come to well under 5 MB in the projects measured.
const MAX_PREVIEW_BYTES = 32 * 1024 * 1024

/**
 * The files behind the faces of `families`, read here because the renderer may not: its CSP allows
 * no font URL but its own, and a file path in the renderer would be a read-anything channel. What
 * comes back goes into `new FontFace(family, data)`, which is how the preview shows the font the
 * site will have instead of whatever this machine happens to have installed.
 */
export async function readPreviewFonts(projectPath: string, families: string[]): Promise<PreviewFonts> {
  const wanted = new Set(families.map((f) => f.toLowerCase()))
  const faces: PreviewFontFace[] = []
  let total = 0
  for (const face of await projectAndBuildFaces(projectPath)) {
    if (!face.file || !wanted.has(face.family.toLowerCase())) continue
    const size = await stat(face.file).then((s) => (s.isFile() ? s.size : -1)).catch(() => -1)
    if (size < 0 || size > MAX_FONT_FILE_BYTES || total + size > MAX_PREVIEW_BYTES) continue
    total += size
    const data = await readFile(face.file).catch(() => null)
    if (!data) continue
    faces.push({ family: face.family, weight: face.weight, style: face.style, unicodeRange: face.unicodeRange, data: new Uint8Array(data) })
  }
  return { faces, built: existsSync(join(resolveBuildDir(projectPath), 'index.css')) }
}
