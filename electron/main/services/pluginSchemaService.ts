import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import ts from 'typescript'
import type { PluginOptionField, ThemeDetail, ThemeStyleSettingsInfo } from '@shared/ipc-contract'

// Only plugins actually installed under .quartz/plugins/<name> (via `quartz plugin add`) ship
// compiled .d.ts/.js files we can introspect. Built-in "@quartz-community/x" config entries live
// inside the cloned project's own quartz/plugins/ source tree (or are fetched on demand by an
// internal loader) with no consistent, discoverable location, so there's no schema for those -
// callers should fall back to free-form key/value editing when this returns null.
const cache = new Map<string, PluginOptionField[] | null>()

export function getPluginOptionsSchema(projectPath: string, pluginName: string): PluginOptionField[] | null {
  const cacheKey = `${projectPath}::${pluginName}`
  if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null

  const distDir = join(projectPath, '.quartz', 'plugins', pluginName, 'dist')
  let schema = existsSync(distDir) ? findOptionsInterface(distDir) : null
  if (schema) schema = attachDefaults(schema, distDir)
  cache.set(cacheKey, schema)
  return schema
}

export function invalidatePluginSchemaCache(projectPath: string, pluginName: string): void {
  cache.delete(`${projectPath}::${pluginName}`)
}

// @quartz-themes/<themeId> packages (used by the @quartz-themes/core plugin) ship a theme.json
// with meta.styleSettingsId - the Obsidian "Style Settings" root id(s) the theme's original CSS
// declared, carried over verbatim from the ported theme. Only present for themes actually ported
// from a real Obsidian community theme that had a `/* @settings */` block; Quartz-native themes
// (e.g. "default") have none, and @quartz-themes/core itself skips styleSettings entirely at
// runtime when it's absent (verified against its compiled dist/index.js: it logs
// "theme ... has no Style Settings id. Style Settings overrides will be ignored." and never emits
// the override CSS layer). classSettings keys are the only per-setting identifiers ever shipped -
// there's no title/type/enum metadata alongside them (theme.json only carries compiled CSS per
// key, not the original @settings YAML), so the caller can only offer raw boolean toggles per key
// plus free-form CSS variable overrides, not a fully labeled form.
export function getThemeStyleSettingsInfo(projectPath: string, themeId: string): ThemeStyleSettingsInfo | null {
  const local = readLocalThemeJson(projectPath, themeId)
  if (!local) return null
  const styleSettingsId = normalizeStyleSettingsId(local.meta?.styleSettingsId)
  if (styleSettingsId.length === 0) return { styleSettingsId: [], classSettingKeys: [] }
  return { styleSettingsId, classSettingKeys: Object.keys(local.classSettings ?? {}) }
}

interface RawThemeJson {
  meta?: { styleSettingsId?: string | string[]; modes?: string[]; variations?: string[]; fonts?: string[] }
  classSettings?: Record<string, unknown>
}

function readLocalThemeJson(projectPath: string, themeId: string): RawThemeJson | null {
  const themeJsonPath = join(projectPath, 'node_modules', '@quartz-themes', themeId, 'theme.json')
  if (!existsSync(themeJsonPath)) return null
  try {
    return JSON.parse(readFileSync(themeJsonPath, 'utf-8')) as RawThemeJson
  } catch {
    return null
  }
}

function normalizeStyleSettingsId(rawId: string | string[] | undefined): string[] {
  return rawId == null ? [] : Array.isArray(rawId) ? rawId : [rawId]
}

// Same theme.json, but the fuller shape used by the catalog's on-demand detail panel (modes,
// variations, fonts) rather than just the style-settings slice above. Local-only (fast path) -
// themeMarketplaceService.getThemeDetail() falls back to fetching the same file from jsdelivr for
// a theme that isn't installed yet.
export function getLocalThemeDetail(projectPath: string, themeId: string): ThemeDetail | null {
  const local = readLocalThemeJson(projectPath, themeId)
  if (!local) return null
  return {
    modes: local.meta?.modes ?? [],
    variations: local.meta?.variations ?? [],
    styleSettingsId: normalizeStyleSettingsId(local.meta?.styleSettingsId),
    fonts: local.meta?.fonts ?? []
  }
}

function walkFiles(dir: string, extension: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) results.push(...walkFiles(full, extension))
    else if (entry.endsWith(extension)) results.push(full)
  }
  return results
}

function findOptionsInterface(dir: string): PluginOptionField[] | null {
  for (const file of walkFiles(dir, '.d.ts')) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf-8'), ts.ScriptTarget.Latest, true)
    const fields = extractOptionsInterface(source)
    if (fields) return fields
  }
  return null
}

function extractOptionsInterface(source: ts.SourceFile): PluginOptionField[] | null {
  let result: PluginOptionField[] | null = null
  ts.forEachChild(source, (node) => {
    if (result || !ts.isInterfaceDeclaration(node) || !/options$/i.test(node.name.text)) return
    const fields = node.members.filter(ts.isPropertySignature).map(toFieldSchema).filter((f): f is PluginOptionField => f !== null)
    if (fields.length > 0) result = fields
  })
  return result
}

function toFieldSchema(member: ts.PropertySignature): PluginOptionField | null {
  if (!member.type || !ts.isIdentifier(member.name)) return null
  const name = member.name.text
  const optional = !!member.questionToken
  const description = getJsDocComment(member)
  const base = { name, description, optional }

  if (member.type.kind === ts.SyntaxKind.BooleanKeyword) return { ...base, kind: 'boolean' }
  if (member.type.kind === ts.SyntaxKind.StringKeyword) return { ...base, kind: 'string' }
  if (member.type.kind === ts.SyntaxKind.NumberKeyword) return { ...base, kind: 'number' }
  if (ts.isUnionTypeNode(member.type)) {
    const literals = member.type.types.map((t) => (ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal) ? t.literal.text : null))
    if (literals.every((l): l is string => l !== null)) {
      return { ...base, kind: 'enum', enumValues: literals }
    }
  }
  // function types, arrays, generics, nested objects etc. can't be edited as a single YAML
  // scalar in this UI - reported so the caller can at least show that the field exists
  return { ...base, kind: 'unsupported' }
}

function getJsDocComment(node: ts.Node): string | undefined {
  for (const doc of ts.getJSDocCommentsAndTags(node)) {
    if (ts.isJSDoc(doc) && typeof doc.comment === 'string') return doc.comment
  }
  return undefined
}

// A pageType plugin (e.g. @quartz-community/canvas-page) can set its own default frame -
// quartz/plugins/pageTypes/dispatcher.ts resolves `overrides.frame ?? pageType.frame ?? "default"`,
// where `overrides.frame` is the user's `layout.byPageType.<type>.template` and `pageType.frame` is
// a literal baked into the plugin's own compiled output, invisible to quartz.config.yaml whenever
// the user hasn't set an explicit override. Unlike CLI-`quartz plugin add`-installed plugins (see
// getPluginOptionsSchema above), these "@quartz-community/x" built-ins are ordinary npm dependencies
// under the project's own node_modules/, not `.quartz/plugins/<name>` - verified against a real
// project: `node_modules/@quartz-community/canvas-page/package.json` carries `quartz.category:
// ["pageType", "component"]` and its compiled dist/index.js has `frame: "canvas"` sitting inside the
// same returned object literal as `match: canvasMatcher`. That object shape (has both `match` and a
// string-literal `frame` property) is what's searched for here, rather than a blind text search -
// the bundle has many unrelated `frame`/`"frame"` occurrences from vendored HTML-schema code (e.g.
// `frame: null` from a rehype property list, `"iframe"`/`"noframes"` tag name arrays).
const pageTypeFrameCache = new Map<string, string | null>()

export function getBuiltinPageTypeFrame(projectPath: string, packageSource: string): string | null {
  const cacheKey = `${projectPath}::${packageSource}`
  if (pageTypeFrameCache.has(cacheKey)) return pageTypeFrameCache.get(cacheKey) ?? null

  const frameName = resolveBuiltinPageTypeFrame(projectPath, packageSource)
  pageTypeFrameCache.set(cacheKey, frameName)
  return frameName
}

export function invalidateBuiltinPageTypeFrameCache(projectPath: string, packageSource: string): void {
  pageTypeFrameCache.delete(`${projectPath}::${packageSource}`)
}

interface PageTypePackageJson {
  quartz?: { category?: string[] }
  main?: string
  exports?: Record<string, unknown>
}

function resolveBuiltinPageTypeFrame(projectPath: string, packageSource: string): string | null {
  const pkgDir = join(projectPath, 'node_modules', packageSource)
  const pkgJsonPath = join(pkgDir, 'package.json')
  if (!existsSync(pkgJsonPath)) return null

  let pkg: PageTypePackageJson
  try {
    pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as PageTypePackageJson
  } catch {
    return null
  }
  if (!pkg.quartz?.category?.includes('pageType')) return null

  const entryFile = resolvePackageEntryFile(pkgDir, pkg)
  if (!entryFile || !existsSync(entryFile)) return null
  return findPageTypeFrameLiteral(entryFile)
}

function resolvePackageEntryFile(pkgDir: string, pkg: PageTypePackageJson): string | null {
  const dotExport = pkg.exports?.['.']
  const importPath =
    typeof dotExport === 'string'
      ? dotExport
      : typeof dotExport === 'object' && dotExport !== null && 'import' in dotExport
        ? (dotExport as { import?: string }).import
        : undefined
  const rel = importPath ?? pkg.main
  return rel ? join(pkgDir, rel) : null
}

function findPageTypeFrameLiteral(file: string): string | null {
  let source: ts.SourceFile
  try {
    source = ts.createSourceFile(file, readFileSync(file, 'utf-8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  } catch {
    return null
  }

  let result: string | null = null
  const visit = (node: ts.Node): void => {
    if (result) return
    if (ts.isObjectLiteralExpression(node)) {
      const hasMatchProp = node.properties.some((p) => ts.isPropertyAssignment(p) && propName(p.name) === 'match')
      const frameProp = node.properties.find((p) => ts.isPropertyAssignment(p) && propName(p.name) === 'frame')
      if (hasMatchProp && frameProp && ts.isPropertyAssignment(frameProp) && ts.isStringLiteral(frameProp.initializer)) {
        result = frameProp.initializer.text
        return
      }
    }
    ts.forEachChild(node, visit)
  }
  ts.forEachChild(source, visit)
  return result
}

function propName(name: ts.PropertyName): string | null {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null
}

// Batch form for the Layout Editor: given the project's current plugin list, which of them are
// built-in pageType plugins with a discoverable default frame? Keyed by the plugin's derived
// display name (e.g. "canvas-page"), matching derivePageTypes()'s "-page" stripping convention in
// src/routes/LayoutEditor/utils.ts, so the renderer can look up `discovered[pageType + "-page"]`.
export function discoverBuiltinPageTypeFrames(projectPath: string, plugins: { name: string; source: unknown }[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const plugin of plugins) {
    if (typeof plugin.source !== 'string') continue
    const frameName = getBuiltinPageTypeFrame(projectPath, plugin.source)
    if (frameName) result[plugin.name] = frameName
  }
  return result
}

// Plugin authors' compiled output (tsup/esbuild) typically keeps a literal
// `var defaultOptions = { ... }`-shaped object readable in the bundled JS, even though the type
// declarations never carry default values. Rather than assume that exact name, this scans every
// top-level object literal in dist/**/*.js and picks whichever one has the most property names
// in common with the known option fields - a plugin-agnostic heuristic that worked against the
// real `explorer` plugin (verified 2026-08-22).
function attachDefaults(fields: PluginOptionField[], distDir: string): PluginOptionField[] {
  const fieldNames = new Set(fields.map((f) => f.name))
  let best: Record<string, unknown> = {}
  let bestScore = 0

  for (const file of walkFiles(distDir, '.js')) {
    let source: ts.SourceFile
    try {
      source = ts.createSourceFile(file, readFileSync(file, 'utf-8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
    } catch {
      continue
    }
    const visit = (node: ts.Node): void => {
      if (ts.isVariableDeclaration(node) && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
        const { values, score } = extractLiteralValues(node.initializer, fieldNames)
        if (score > bestScore) {
          bestScore = score
          best = values
        }
      }
      ts.forEachChild(node, visit)
    }
    ts.forEachChild(source, visit)
  }

  if (bestScore === 0) return fields
  return fields.map((f) => {
    if (!(f.name in best)) return f
    const value = best[f.name]
    const formatted = typeof value === 'string' ? value : JSON.stringify(value)
    return { ...f, description: [f.description, `Standard: ${formatted}`].filter(Boolean).join(' — ') }
  })
}

function extractLiteralValues(
  obj: ts.ObjectLiteralExpression,
  fieldNames: Set<string>
): { values: Record<string, unknown>; score: number } {
  const values: Record<string, unknown> = {}
  let score = 0
  for (const prop of obj.properties) {
    if (!ts.isPropertyAssignment(prop)) continue
    const name = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : null
    if (!name || !fieldNames.has(name)) continue
    score += 1
    const literal = toLiteralValue(prop.initializer)
    if (literal !== undefined) values[name] = literal
  }
  return { values, score }
}

function toLiteralValue(node: ts.Expression): unknown {
  if (ts.isStringLiteral(node)) return node.text
  if (ts.isNumericLiteral(node)) return Number(node.text)
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false
  return undefined
}
