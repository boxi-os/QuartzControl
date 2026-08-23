import { existsSync, mkdirSync } from 'fs'
import { copyFile, readFile, readdir, writeFile } from 'fs/promises'
import { basename, join, relative } from 'path'
import type { CssVariableOverride, StyleReferenceFile, StylesInfo } from '@shared/ipc-contract'
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
