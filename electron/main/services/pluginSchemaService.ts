import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { isAbsolute, join, relative, resolve } from 'path'
import ts from 'typescript'
import type { PluginSource, ThemeDetail, ThemeStyleSettingsInfo } from '@shared/ipc-contract'
import {
  applyDefaults,
  normalizeJsonSchema,
  normalizeOptionSchema,
  schemaFromDefaults,
  type NormalizedOptionSchema,
  type PluginOptionSchemaResult
} from '@shared/pluginOptionSchema'
import { quartzPluginName } from '@shared/quartzPluginName'
import { mainT } from '../i18n'

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

// A pageType plugin (e.g. @quartz-community/canvas-page) can set its own default frame -
// quartz/plugins/pageTypes/dispatcher.ts resolves `overrides.frame ?? pageType.frame ?? "default"`,
// where `overrides.frame` is the user's `layout.byPageType.<type>.template` and `pageType.frame` is
// a literal baked into the plugin's own compiled output, invisible to quartz.config.yaml whenever
// the user hasn't set an explicit override. Unlike CLI-`quartz plugin add`-installed plugins (see
// getPluginOptionSchema below), these "@quartz-community/x" built-ins are ordinary npm dependencies
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

// ── The option schema (1.1) ─────────────────────────────────────────────────────────────────────
//
// Where the package lives is quartz's answer, not ours: `readManifestFromPackageJson`
// (plugins/loader/config-loader.ts) resolves an npm source under node_modules and everything else
// under `.quartz/plugins/<extractPluginName(source)>`. The old lookup only knew the second place,
// so every @quartz-community plugin - explorer, graph, search, the lot - had no schema at all,
// although 33 of them ship one in their package.json (counted 2026-10-07 on gui-test).
//
// The order of the sources is the order of how much they say: a JSON Schema that the plugin
// wrote for this purpose, the flat optionSchema, the type declarations, and finally the defaults
// alone. A source that yields no field at all does not count - `unlisted-pages` ships an empty
// optionSchema - and the next one is asked. The defaults are laid over whichever wins.
//
// Nothing here runs plugin code. package.json is parsed as JSON under a size cap; the .d.ts are
// parsed by typescript as text, never evaluated.

const MAX_PACKAGE_JSON_BYTES = 1024 * 1024
const MAX_DTS_FILES = 200
const MAX_DTS_BYTES = 4 * 1024 * 1024

// quartz's parsePluginSource (plugins/loader/gitLoader.ts): whatever is not a local path, github:,
// git+ or https:// is an npm package.
function isNpmSource(source: PluginSource): boolean {
  const repo = typeof source === 'object' && source !== null ? source.repo : source
  if (typeof repo !== 'string') return false
  if (/^[A-Za-z]:[\\/]/.test(repo) || repo.startsWith('./') || repo.startsWith('../') || repo.startsWith('/')) return false
  return !(repo.startsWith('github:') || repo.startsWith('git+') || repo.startsWith('https://'))
}

/** The plugin's package directory as quartz resolves it, or null if that would leave its base. */
export function pluginPackageDir(projectPath: string, source: PluginSource): string | null {
  const name = quartzPluginName(source)
  const base = isNpmSource(source) ? join(projectPath, 'node_modules') : join(projectPath, '.quartz', 'plugins')
  const dir = resolve(base, name)
  const rel = relative(base, dir)
  if (!name || rel === '' || rel.startsWith('..') || isAbsolute(rel)) return null
  return dir
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// Cached per package directory, and the key is what the answer depends on: size and mtime of
// package.json and of every .d.ts under dist/. The old cache was keyed by name only and nothing
// ever cleared it (`invalidatePluginSchemaCache` had no caller), so after `quartz plugin update`
// the page kept the previous version's options until the app restarted. Stat-ing the files costs
// a directory walk; parsing them is what the cache saves.
const optionSchemaCache = new Map<string, { fingerprint: string; result: PluginOptionSchemaResult }>()

function fingerprint(dir: string): string {
  const parts: string[] = []
  const add = (file: string): void => {
    try {
      const st = statSync(file)
      parts.push(`${file}:${st.size}:${st.mtimeMs}`)
    } catch {
      parts.push(`${file}:-`)
    }
  }
  add(join(dir, 'package.json'))
  const dist = join(dir, 'dist')
  if (existsSync(dist)) {
    try {
      walkFiles(dist, '.d.ts').slice(0, MAX_DTS_FILES).forEach(add)
    } catch {
      parts.push('dist:unreadable')
    }
  }
  return parts.join('|')
}

export function getPluginOptionSchema(projectPath: string, source: PluginSource): PluginOptionSchemaResult {
  const dir = pluginPackageDir(projectPath, source)
  if (!dir) return { schema: null, unreadable: mainT('pluginSchemaOutsideProject') }
  const key = fingerprint(dir)
  const cached = optionSchemaCache.get(dir)
  if (cached && cached.fingerprint === key) return cached.result
  const result = readPluginOptionSchema(dir)
  optionSchemaCache.set(dir, { fingerprint: key, result })
  return result
}

function readPluginOptionSchema(dir: string): PluginOptionSchemaResult {
  const pkgPath = join(dir, 'package.json')

  let pkg: unknown
  try {
    const size = statSync(pkgPath).size
    if (size > MAX_PACKAGE_JSON_BYTES) return { schema: null, unreadable: mainT('pluginSchemaPackageTooLarge', { size }) }
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  } catch (err) {
    // Not installed (yet) is the ordinary case for a plugin that was just added - no schema, no
    // complaint. Anything else is a package that is there and broken, and says so.
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { schema: null }
    return { schema: null, unreadable: mainT('pluginSchemaPackageUnreadable', { reason: (err as Error).message }) }
  }
  if (!isPlainObject(pkg)) return { schema: null, unreadable: mainT('pluginSchemaPackageNotObject') }

  const q = isPlainObject(pkg.quartz) ? pkg.quartz : {}
  const version = typeof q.version === 'string' ? q.version : typeof pkg.version === 'string' ? pkg.version : undefined

  const candidates: (() => NormalizedOptionSchema | null)[] = [
    () => (q.configSchema !== undefined ? normalizeJsonSchema(q.configSchema, 'configSchema') : null),
    () => (q.optionSchema !== undefined ? normalizeOptionSchema(q.optionSchema) : null),
    () => {
      const fromTypes = optionsJsonSchemaFromDts(join(dir, 'dist'))
      return fromTypes ? normalizeJsonSchema(fromTypes, 'dts') : null
    }
  ]
  let schema: NormalizedOptionSchema | null = null
  for (const candidate of candidates) {
    const found = candidate()
    if (found && found.fields.length > 0) {
      schema = applyDefaults(found, q.defaultOptions)
      break
    }
  }
  schema ??= schemaFromDefaults(q.defaultOptions)
  return { schema, ...(version ? { packageVersion: version } : {}) }
}

// ── .d.ts → JSON Schema ──
//
// Translated to JSON Schema rather than straight to the normalized form, so that one normalizer
// (shared/pluginOptionSchema.ts) handles all three schema sources. What the translation cannot
// express becomes `{ "x-quartz-note": reason }`, which the normalizer turns into a text field and
// a counted note.

type Decl = ts.InterfaceDeclaration | ts.TypeAliasDeclaration
type JsonSchema = Record<string, unknown>

interface DtsIndex {
  decls: Map<string, Decl[]>
  order: Decl[]
  /** Type names the plugin's own constructors are parameterised with, and how often. */
  votes: Map<string, number>
}

function indexDts(distDir: string): DtsIndex | null {
  if (!existsSync(distDir)) return null
  const files = walkFiles(distDir, '.d.ts').slice(0, MAX_DTS_FILES)
  const decls = new Map<string, Decl[]>()
  const order: Decl[] = []
  const votes = new Map<string, number>()
  let total = 0
  for (const file of files) {
    let text: string
    try {
      total += statSync(file).size
      if (total > MAX_DTS_BYTES) break
      text = readFileSync(file, 'utf-8')
    } catch {
      continue
    }
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
    ts.forEachChild(source, (node) => {
      if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
        const list = decls.get(node.name.text) ?? []
        list.push(node)
        decls.set(node.name.text, list)
        order.push(node)
      }
      if (ts.isVariableStatement(node)) {
        for (const d of node.declarationList.declarations) {
          const name = constructorOptionsType(d.type)
          if (name) votes.set(name, (votes.get(name) ?? 0) + 1)
        }
      }
    })
  }
  return decls.size > 0 ? { decls, order, votes } : null
}

// `declare const X: QuartzTransformerPlugin<MultilanguageOptions>` - the type quartz hands the
// options to, as the plugin itself declares it. `Partial<Options>` counts as `Options`
// (alias-redirects writes it that way).
function constructorOptionsType(type: ts.TypeNode | undefined): string | null {
  if (!type || !ts.isTypeReferenceNode(type) || !ts.isIdentifier(type.typeName)) return null
  if (!/^Quartz\w*(Plugin|Constructor)$/.test(type.typeName.text)) return null
  let arg = type.typeArguments?.[0]
  while (arg && ts.isTypeReferenceNode(arg) && ts.isIdentifier(arg.typeName) && /^(Partial|Required|Readonly)$/.test(arg.typeName.text)) {
    arg = arg.typeArguments?.[0]
  }
  return arg && ts.isTypeReferenceNode(arg) && ts.isIdentifier(arg.typeName) ? arg.typeName.text : null
}

// The declaration the options object is typed as.
//
// It used to be the first interface whose name ends in "Options", in file order. For
// quartz-multilanguage that is `SeoOptions`, a nested part of the real one - the page offered
// `hreflang`, `ogLocale` and `xDefault` as top-level options, and a switch written there landed at
// `options.hreflang`, where the plugin never looks; the 15 keys gui-test actually sets were
// invisible. Now, in this order:
//
//   1. what the plugin's constructors are parameterised with (`QuartzTransformerPlugin<T>`,
//      `QuartzComponentConstructor<T>`, ...) - the plugin's own statement, and the most votes win;
//   2. otherwise an `…Options` interface that no other one refers to - the outermost - leaving
//      out `Resolved…`, which is the shape after defaults, not what the user writes. Several left:
//      the one with the most members.
function pickOptionsRoot(index: DtsIndex): Decl | null {
  const voted = [...index.votes].sort((a, b) => b[1] - a[1]).find(([name]) => index.decls.has(name))
  if (voted) return index.decls.get(voted[0])![0]

  const candidates = index.order.filter(
    (d): d is ts.InterfaceDeclaration =>
      ts.isInterfaceDeclaration(d) && /options$/i.test(d.name.text) && !/^Resolved/.test(d.name.text) && d.members.some(ts.isPropertySignature)
  )
  const referenced = new Set<string>()
  const collect = (node: ts.Node): void => {
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) referenced.add(node.typeName.text)
    ts.forEachChild(node, collect)
  }
  for (const c of candidates) c.members.forEach(collect)
  const outermost = candidates.filter((c) => !referenced.has(c.name.text))
  const pool = outermost.length > 0 ? outermost : candidates
  return pool.sort((a, b) => b.members.length - a.members.length)[0] ?? null
}

function optionsJsonSchemaFromDts(distDir: string): JsonSchema | null {
  const index = indexDts(distDir)
  if (!index) return null
  const root = pickOptionsRoot(index)
  if (!root) return null
  return declToSchema(root, index, new Set(), 0, null)
}

const note = (reason: string): JsonSchema => ({ 'x-quartz-note': reason })
const MAX_TYPE_DEPTH = 12

function docOf(node: ts.Node): string | undefined {
  for (const doc of ts.getJSDocCommentsAndTags(node)) {
    if (ts.isJSDoc(doc) && doc.comment) return ts.getTextOfJSDocComment(doc.comment)
  }
  return undefined
}

function memberName(name: ts.PropertyName): string | null {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) ? name.text : null
}

// `keep` narrows the members (Pick/Omit): null keeps all, otherwise a predicate on the name.
function membersToSchema(
  members: ts.NodeArray<ts.TypeElement>,
  index: DtsIndex,
  seen: Set<string>,
  depth: number,
  keep: ((name: string) => boolean) | null
): JsonSchema {
  const properties: Record<string, JsonSchema> = {}
  let additional: JsonSchema | undefined
  for (const member of members) {
    if (ts.isPropertySignature(member) || ts.isMethodSignature(member)) {
      const name = memberName(member.name)
      if (name === null || (keep && !keep(name))) continue
      const schema: JsonSchema = ts.isMethodSignature(member)
        ? note('a function cannot be written in YAML')
        : member.type
          ? typeToSchema(member.type, index, seen, depth + 1)
          : note('no type')
      const description = docOf(member)
      properties[name] = description ? { ...schema, description } : schema
    } else if (ts.isIndexSignatureDeclaration(member) && member.type) {
      additional = typeToSchema(member.type, index, seen, depth + 1)
    }
  }
  return { type: 'object', properties, ...(additional ? { additionalProperties: additional } : {}) }
}

function declToSchema(decl: Decl, index: DtsIndex, seen: Set<string>, depth: number, keep: ((name: string) => boolean) | null): JsonSchema {
  if (ts.isTypeAliasDeclaration(decl)) return typeToSchema(decl.type, index, seen, depth + 1, keep)
  let schema = membersToSchema(decl.members, index, seen, depth, keep)
  // `interface A extends B` - B's members first, A's override.
  for (const clause of decl.heritageClauses ?? []) {
    for (const base of clause.types) {
      if (!ts.isIdentifier(base.expression)) continue
      const inherited = typeToSchema(ts.factory.createTypeReferenceNode(base.expression.text), index, seen, depth + 1, keep)
      if (isPlainObject(inherited.properties)) {
        schema = { ...schema, properties: { ...inherited.properties, ...(schema.properties as object) } }
      }
    }
  }
  return schema
}

function literalKeys(node: ts.TypeNode | undefined): string[] | null {
  if (!node) return null
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) return [node.literal.text]
  if (ts.isUnionTypeNode(node)) {
    const all = node.types.map(literalKeys)
    return all.every((k): k is string[] => k !== null) ? all.flat() : null
  }
  return null
}

function typeToSchema(
  node: ts.TypeNode,
  index: DtsIndex,
  seen: Set<string>,
  depth: number,
  keep: ((name: string) => boolean) | null = null
): JsonSchema {
  if (depth > MAX_TYPE_DEPTH) return note('types nested too deeply')
  switch (node.kind) {
    case ts.SyntaxKind.BooleanKeyword:
      return { type: 'boolean' }
    case ts.SyntaxKind.StringKeyword:
      return { type: 'string' }
    case ts.SyntaxKind.NumberKeyword:
      return { type: 'number' }
    case ts.SyntaxKind.AnyKeyword:
    case ts.SyntaxKind.UnknownKeyword:
      return {}
  }
  if (ts.isParenthesizedTypeNode(node)) return typeToSchema(node.type, index, seen, depth, keep)
  if (ts.isTypeOperatorNode(node)) return typeToSchema(node.type, index, seen, depth, keep)
  if (ts.isLiteralTypeNode(node)) {
    const lit = node.literal
    if (ts.isStringLiteral(lit)) return { const: lit.text }
    if (ts.isNumericLiteral(lit)) return { const: Number(lit.text) }
    if (lit.kind === ts.SyntaxKind.TrueKeyword) return { const: true }
    if (lit.kind === ts.SyntaxKind.FalseKeyword) return { const: false }
    return note('a null literal')
  }
  if (ts.isUnionTypeNode(node)) {
    const members = node.types.filter(
      (t) => t.kind !== ts.SyntaxKind.UndefinedKeyword && !(ts.isLiteralTypeNode(t) && t.literal.kind === ts.SyntaxKind.NullKeyword)
    )
    const schemas = members.map((t) => typeToSchema(t, index, seen, depth + 1))
    if (schemas.length === 1) return schemas[0]
    if (schemas.every((s) => 'const' in s)) return { enum: schemas.map((s) => s.const) }
    return { anyOf: schemas }
  }
  if (ts.isArrayTypeNode(node)) return { type: 'array', items: typeToSchema(node.elementType, index, seen, depth + 1) }
  if (ts.isTypeLiteralNode(node)) return membersToSchema(node.members, index, seen, depth, keep)
  if (ts.isFunctionTypeNode(node)) return note('a function cannot be written in YAML')
  if (ts.isIntersectionTypeNode(node)) {
    const parts = node.types.map((t) => typeToSchema(t, index, seen, depth + 1, keep))
    if (parts.every((p) => p.type === 'object' && isPlainObject(p.properties))) {
      return { type: 'object', properties: Object.assign({}, ...parts.map((p) => p.properties)) }
    }
    return note('an intersection of non-object types')
  }
  if (ts.isTypeReferenceNode(node)) {
    const name = ts.isIdentifier(node.typeName) ? node.typeName.text : node.typeName.right.text
    const args = node.typeArguments ?? []
    switch (name) {
      case 'Array':
      case 'ReadonlyArray':
        return { type: 'array', items: args[0] ? typeToSchema(args[0], index, seen, depth + 1) : {} }
      case 'Record':
        return { type: 'object', additionalProperties: args[1] ? typeToSchema(args[1], index, seen, depth + 1) : {} }
      case 'Partial':
      case 'Required':
      case 'Readonly':
        return args[0] ? typeToSchema(args[0], index, seen, depth + 1, keep) : note(`${name} without an argument`)
      case 'Omit':
      case 'Pick': {
        const keys = literalKeys(args[1])
        if (!args[0] || !keys) return note(`${name} with keys that are not string literals`)
        const narrowed = name === 'Omit' ? (k: string) => !keys.includes(k) : (k: string) => keys.includes(k)
        const combined = keep ? (k: string) => keep(k) && narrowed(k) : narrowed
        return typeToSchema(args[0], index, seen, depth + 1, combined)
      }
    }
    const decls = index.decls.get(name)
    if (!decls) return note(`type ${name} is not declared in the package`)
    // Seen per shape, not per name: `Omit<LayoutBoxOptions, "byLang">` inside LayoutBoxOptions is
    // not a cycle, because the member that would recurse is the one it leaves out.
    const shape = keep ? `${name}|${[...membersOf(decls[0])].filter(keep).join(',')}` : name
    if (seen.has(shape)) return note(`type ${name} refers to itself`)
    seen.add(shape)
    try {
      return declToSchema(decls[0], index, seen, depth + 1, keep)
    } finally {
      seen.delete(shape)
    }
  }
  return note(`type syntax ${ts.SyntaxKind[node.kind]} is not supported`)
}

function membersOf(decl: Decl): string[] {
  if (!ts.isInterfaceDeclaration(decl)) return []
  return decl.members.map((m) => (m.name ? memberName(m.name) : null)).filter((n): n is string => n !== null)
}
