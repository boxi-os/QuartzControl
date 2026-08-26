import { existsSync, mkdirSync } from 'fs'
import { copyFile, readFile, readdir, rename, rm, writeFile } from 'fs/promises'
import { createRequire } from 'module'
import { basename, dirname, join, relative, sep } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import type {
  CssVariableOverride,
  ScssCheckResult,
  ScssDiagnostic,
  StyleFile,
  StyleFileSet,
  StyleReferenceFile,
  StylesInfo
} from '@shared/ipc-contract'
import { resolveBuildDir } from './projectDirs'

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

function managedBlockMarkers(markerId: string): { start: string; end: string } {
  return {
    start: `/* --- Quartz-GUI:managed:${markerId}:start --- */`,
    end: `/* --- Quartz-GUI:managed:${markerId}:end --- */`
  }
}

// Reads the current body of a marker-delimited managed section, or null if it doesn't exist yet -
// lets a caller accumulate onto an existing section (e.g. another @font-face rule) instead of only
// ever appending a fresh one.
export function getManagedBlock(content: string, markerId: string): string | null {
  const { start, end } = managedBlockMarkers(markerId)
  const startIdx = content.indexOf(start)
  if (startIdx === -1) return null
  const endIdx = content.indexOf(end, startIdx)
  if (endIdx === -1) return null
  return content.slice(startIdx + start.length, endIdx).trim()
}

// Replaces a marker-delimited managed section in-place (appending a new one at the end if it
// doesn't exist yet, or if the existing markers are malformed) - unlike a plain append, this lets
// a section be regenerated from scratch (e.g. after a variable override is toggled off) without
// leaving stale content behind.
export function upsertManagedBlock(content: string, markerId: string, body: string): string {
  const { start, end } = managedBlockMarkers(markerId)
  const block = `${start}\n${body}\n${end}`
  const startIdx = content.indexOf(start)
  const endIdx = startIdx === -1 ? -1 : content.indexOf(end, startIdx)
  if (startIdx === -1 || endIdx === -1) {
    const trimmed = content.replace(/\s+$/, '')
    return trimmed ? `${trimmed}\n\n${block}\n` : `${block}\n`
  }
  return content.slice(0, startIdx) + block + content.slice(endIdx + end.length)
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

function parseVariableOverrides(body: string): CssVariableOverride[] {
  const rootMatch = /:root\s*\{([^}]*)\}/.exec(body)
  const darkMatch = /:root\[saved-theme=["']dark["']\]\s*\{([^}]*)\}/.exec(body)
  const light = rootMatch ? parseDeclarations(rootMatch[1]) : {}
  const dark = darkMatch ? parseDeclarations(darkMatch[1]) : {}
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
        stripManagedBlock(info.content, CSS_VARS_MARKER)
      : upsertManagedBlock(info.content, CSS_VARS_MARKER, renderVariableOverrides(overrides))
  await writeCustomScss(projectPath, next)
}

function stripManagedBlock(content: string, markerId: string): string {
  const { start, end } = managedBlockMarkers(markerId)
  const startIdx = content.indexOf(start)
  if (startIdx === -1) return content
  const endIdx = content.indexOf(end, startIdx)
  if (endIdx === -1) return content
  return (content.slice(0, startIdx) + content.slice(endIdx + end.length)).replace(/\n{3,}/g, '\n\n')
}

// Regex-scans the compiled build output's CSS files for custom-property declarations, so plugin-
// authored variables (which have no fixed catalog - any plugin can bring its own) can still be
// discovered without a hardcoded list. Best-effort: returns [] if no build output exists yet.
export async function scanBuildOutputVariables(projectPath: string, outputDir?: string): Promise<string[]> {
  const buildDir = resolveBuildDir(projectPath, outputDir)
  if (!existsSync(buildDir)) return []
  const cssFiles = (await findCssFiles(buildDir)).slice(0, 50)
  const found = new Set<string>()
  for (const file of cssFiles) {
    const content = await readFile(file, 'utf-8')
    const re = /--([\w-]+)\s*:/g
    let match: RegExpExecArray | null
    while ((match = re.exec(content)) !== null) found.add(match[1])
  }
  return Array.from(found).sort()
}

async function findCssFiles(dir: string, depth = 0): Promise<string[]> {
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
    if (entry.isDirectory()) results.push(...(await findCssFiles(full, depth + 1)))
    else if (entry.name.endsWith('.css')) results.push(full)
  }
  return results
}

// ── additional stylesheets ──────────────────────────────────────────────────
//
// Quartz imports exactly one stylesheet, custom.scss (componentResources.ts). Everything else has
// to be reached *through* it, and Sass requires `@use` before any rule - so the load order lives
// in one managed block at the very top of custom.scss:
//
//   /* --- Quartz-GUI:managed:imports:start --- */
//   @use "./custom/typography";
//   /* --- Quartz-GUI:managed:imports:end --- */
//
// The file is the source of truth on purpose, not a sidecar JSON: the project still builds if this
// app is never opened again, hand-editing the block in any editor keeps working, and there is no
// second copy of the order to drift. Everything after the block is custom.scss's own content, so
// it stays the last layer - which is exactly what the Styles tab's cascade line promises.
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
  const startIdx = content.indexOf(start)
  if (startIdx !== -1) {
    const endIdx = content.indexOf(end, startIdx)
    if (endIdx !== -1) {
      if (!body) {
        const stripped = content.slice(0, startIdx) + content.slice(endIdx + end.length)
        return stripped.replace(/\n{3,}/g, '\n\n')
      }
      return content.slice(0, startIdx) + `${start}\n${body}\n${end}` + content.slice(endIdx + end.length)
    }
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
  return lines.join('\n').replace(/\n{3,}/g, '\n\n')
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
  if (existsSync(path)) throw new Error(`Es gibt bereits eine Datei ${fileName}.`)
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
  if (existsSync(target)) throw new Error(`Es gibt bereits eine Datei ${fileName}.`)
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

export async function setImportOrder(projectPath: string, relativePaths: string[]): Promise<void> {
  const main = await readCustomScss(projectPath)
  const body = relativePaths.map((p) => `@use "${useSpecifierFor(p)}";`).join('\n')
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

function loadProjectSass(projectPath: string): ProjectSass | null {
  try {
    return createRequire(join(projectPath, 'package.json'))('sass') as ProjectSass
  } catch {
    return null
  }
}

export async function checkStyles(projectPath: string): Promise<ScssCheckResult> {
  const entry = customScssPath(projectPath)
  if (!existsSync(entry)) return { status: 'unavailable', reason: 'custom.scss existiert nicht.' }
  const sass = loadProjectSass(projectPath)
  if (!sass) return { status: 'unavailable', reason: 'Im Projekt ist kein sass installiert (npm install).' }
  try {
    sass.compile(entry, { loadPaths: [stylesDir(projectPath)], quietDeps: true, verbose: false })
    return { status: 'ok' }
  } catch (err) {
    return { status: 'error', diagnostic: toDiagnostic(projectPath, err) }
  }
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
  if (!sass) return { status: 'unavailable', reason: 'Im Projekt ist kein sass installiert (npm install).' }
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
