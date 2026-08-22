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
