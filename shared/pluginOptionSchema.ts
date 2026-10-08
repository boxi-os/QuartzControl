// What the app knows about a plugin's options, in one shape whatever the plugin brought along.
//
// Four sources describe options, and a plugin may carry any of them (counted 2026-10-07 with
// `npm run check:option-schema` against gui-test: 33 plugins with `quartz.optionSchema`, 45 with
// `quartz.defaultOptions`, none yet with `quartz.configSchema`):
//
//   quartz.configSchema   JSON Schema - the form quartz's own `PluginManifest` type provides for
//                         ("used for validation and TUI generation", plugins/loader/types.ts).
//                         The app reads a few `x-quartz-*` keywords on top (see below).
//   quartz.optionSchema   the flat form the @quartz-community plugins ship: JSON Schema with
//                         `type: "enum"` + `values` instead of `enum`.
//   .d.ts                 the type declarations, translated to JSON Schema in the main process
//                         (pluginSchemaService) - typescript is not something the renderer loads.
//   quartz.defaultOptions the values quartz merges under the user's - fills what the others miss.
//
// So there is one normalizer, for JSON Schema, and the other forms are brought to it. Everything
// here is pure and Node-free: the renderer builds the form from it, the main process produces it,
// and `scripts/check-option-schema.mjs` loads this file instead of copying it.
//
// What cannot be read is never dropped silently. It becomes a `json` node (edited as text) and a
// note with the path and the reason; the note count is what the check script reports.
//
// The `x-quartz-*` keywords a configSchema property may carry:
//
//   x-quartz-when        { "<sibling key>": value | [values] } - the field only applies while every
//                        named sibling (a dotted path walks into objects) has one of the values;
//                        an unset sibling counts with its default.
//   x-quartz-group       section heading the field belongs to
//   x-quartz-order       sort key within the object (lower first; unordered fields keep their place)
//   x-quartz-advanced    true: shown folded away
//   x-quartz-widget      "snippetFile" | "html" | "markdown" | "glob" - a richer editor for a string
//   x-quartz-dir-option  for snippetFile: the option that names the snippet directory - looked up
//                        in the field's own object first, then in each enclosing one (an entry
//                        of layout-box's `byLang` has no `dir`; the one at the top applies)
//   x-quartz-keys        for a record: "languages" - its keys are the site's language codes
//   x-quartz-l10n        { "<lang>": { title?, description?, group?, enum?: { "<value>": label } } }
//   x-quartz-note        on a schema the app cannot draw: why, shown with the JSON field
//
// The same list, with an example, for plugin authors: docs/plugin-config-schema.md. A keyword not
// on it, a widget or `keys` value the app does not know, becomes a note like anything else it
// cannot read - the form says how many there are (fortieth review, finding 7).

export type OptionEnumValue = string | number | boolean

export type OptionNode =
  | { kind: 'boolean' }
  | { kind: 'string' }
  | { kind: 'number'; integer?: boolean; minimum?: number; maximum?: number }
  | { kind: 'enum'; values: OptionEnumValue[] }
  | { kind: 'union'; variants: OptionNode[] }
  | { kind: 'object'; fields: OptionField[]; rest?: OptionNode }
  | { kind: 'record'; value: OptionNode; keys?: 'languages' }
  | { kind: 'array'; items: OptionNode }
  | { kind: 'json' }

export type OptionWidget =
  | { kind: 'snippetFile'; dirOption?: string }
  | { kind: 'html' }
  | { kind: 'markdown' }
  | { kind: 'glob' }

/** Every key must match; a list means "one of". Paths are relative to the containing object. */
export type OptionCondition = Record<string, OptionEnumValue | OptionEnumValue[]>

export interface OptionFieldText {
  title?: string
  description?: string
  group?: string
  enum?: Record<string, string>
}

export interface OptionField {
  key: string
  node: OptionNode
  title?: string
  description?: string
  /** Whether `default` is meaningful - a default of `undefined` does not survive IPC as a key. */
  hasDefault: boolean
  default?: unknown
  when?: OptionCondition
  group?: string
  order?: number
  advanced?: boolean
  widget?: OptionWidget
  l10n?: Record<string, OptionFieldText>
  /**
   * Where the field came from: the plugin's schema, only its `defaultOptions`, or only the user's
   * config (a key nobody describes - shown so it is not lost, see withPresentKeys).
   */
  origin: 'schema' | 'defaults' | 'config'
}

export interface OptionSchemaNote {
  path: string[]
  reason: string
}

export type OptionSchemaSource = 'configSchema' | 'optionSchema' | 'dts' | 'defaults'

export interface NormalizedOptionSchema {
  source: OptionSchemaSource
  fields: OptionField[]
  notes: OptionSchemaNote[]
}

// ── JSON Schema → OptionNode ────────────────────────────────────────────────────────────────────

type Json = Record<string, unknown>
const isPlainObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
const isEnumValue = (v: unknown): v is OptionEnumValue =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'

// Nesting deeper than this is not an options object anyone fills in by hand; it also bounds a
// schema that refers to itself through `$ref`.
const MAX_DEPTH = 16

interface Ctx {
  root: Json
  notes: OptionSchemaNote[]
  refs: string[]
}

function json(ctx: Ctx, path: string[], reason: string): OptionNode {
  ctx.notes.push({ path, reason })
  return { kind: 'json' }
}

function resolveRef(ctx: Ctx, ref: string): Json | null {
  const m = /^#\/(\$defs|definitions)\/([^/]+)$/.exec(ref)
  if (!m) return null
  const defs = ctx.root[m[1]]
  const target = isPlainObject(defs) ? defs[decodeURIComponent(m[2])] : undefined
  return isPlainObject(target) ? target : null
}

function nodeFromSchema(raw: unknown, path: string[], ctx: Ctx, depth: number): OptionNode {
  if (depth > MAX_DEPTH) return json(ctx, path, 'nested too deeply')
  if (raw === true || (isPlainObject(raw) && Object.keys(raw).every((k) => k === 'description' || k === 'title' || k === 'default' || k.startsWith('x-quartz-')))) {
    // `{}` and `true` accept anything. Not a gap in the reader but the schema's own answer.
    if (isPlainObject(raw) && typeof raw['x-quartz-note'] === 'string') return json(ctx, path, raw['x-quartz-note'])
    return { kind: 'json' }
  }
  if (!isPlainObject(raw)) return json(ctx, path, 'not a schema object')
  const s = raw

  if (typeof s.$ref === 'string') {
    if (ctx.refs.includes(s.$ref)) return json(ctx, path, `refers to itself (${s.$ref})`)
    const target = resolveRef(ctx, s.$ref)
    if (!target) return json(ctx, path, `unresolvable $ref ${s.$ref}`)
    ctx.refs.push(s.$ref)
    try {
      return nodeFromSchema(target, path, ctx, depth + 1)
    } finally {
      ctx.refs.pop()
    }
  }

  if ('const' in s && isEnumValue(s.const)) return { kind: 'enum', values: [s.const] }
  const enumValues = Array.isArray(s.enum) ? s.enum : s.type === 'enum' && Array.isArray(s.values) ? s.values : null
  if (enumValues) {
    if (enumValues.every(isEnumValue)) return { kind: 'enum', values: enumValues }
    return json(ctx, path, 'enum with non-scalar values')
  }

  const alternatives = Array.isArray(s.oneOf) ? s.oneOf : Array.isArray(s.anyOf) ? s.anyOf : null
  if (alternatives) return unionOf(alternatives.map((a, i) => nodeFromSchema(a, [...path, `|${i}`], ctx, depth + 1)))

  // `type: ["string", "null"]`: null is what YAML writes for an empty value, and the form never
  // writes one (an emptied field removes the key), so the null member says nothing to edit.
  const types = (Array.isArray(s.type) ? s.type : [s.type]).filter((t) => t !== 'null')
  if (types.length > 1) return unionOf(types.map((t) => nodeFromSchema({ ...s, type: t }, path, ctx, depth)))
  const type = types[0]

  switch (type) {
    case 'boolean':
      return { kind: 'boolean' }
    case 'string':
      return { kind: 'string' }
    case 'number':
    case 'integer':
      return {
        kind: 'number',
        ...(type === 'integer' ? { integer: true } : {}),
        ...(typeof s.minimum === 'number' ? { minimum: s.minimum } : {}),
        ...(typeof s.maximum === 'number' ? { maximum: s.maximum } : {})
      }
    case 'array':
      if (Array.isArray(s.items)) return json(ctx, path, 'tuple arrays are not supported')
      return { kind: 'array', items: s.items === undefined ? { kind: 'json' } : nodeFromSchema(s.items, [...path, '[]'], ctx, depth + 1) }
    case 'object':
    case undefined: {
      if (type === undefined && !isPlainObject(s.properties) && s.additionalProperties === undefined) {
        const unsupported = ['allOf', 'not', 'if', 'patternProperties'].find((k) => k in s)
        return json(ctx, path, unsupported ? `${unsupported} is not supported` : 'no type')
      }
      return objectNode(s, path, ctx, depth)
    }
    default:
      return json(ctx, path, `unknown type ${String(type)}`)
  }
}

function objectNode(s: Json, path: string[], ctx: Ctx, depth: number): OptionNode {
  const props = isPlainObject(s.properties) ? s.properties : {}
  const fields = Object.entries(props).map(([key, child]) => fieldFromSchema(key, child, [...path, key], ctx, depth + 1))
  const additional = s.additionalProperties
  const rest =
    additional === undefined || additional === false
      ? undefined
      : nodeFromSchema(additional === true ? {} : additional, [...path, '*'], ctx, depth + 1)
  if (fields.length === 0 && rest) {
    if (s['x-quartz-keys'] !== undefined && s['x-quartz-keys'] !== 'languages') {
      ctx.notes.push({ path, reason: `unknown x-quartz-keys ${JSON.stringify(s['x-quartz-keys'])}` })
    }
    return { kind: 'record', value: rest, ...(s['x-quartz-keys'] === 'languages' ? { keys: 'languages' as const } : {}) }
  }
  // An object nobody describes ({ type: "object" } and nothing else - `graph.localGraph` in the
  // community optionSchema) is edited as text: an empty form would offer nothing to fill in.
  if (fields.length === 0) return { kind: 'json' }
  return { kind: 'object', fields, ...(rest ? { rest } : {}) }
}

function unionOf(variants: OptionNode[]): OptionNode {
  const flat = variants.flatMap((v) => (v.kind === 'union' ? v.variants : [v]))
  if (flat.length > 0 && flat.every((v) => v.kind === 'enum')) {
    return { kind: 'enum', values: [...new Set(flat.flatMap((v) => (v.kind === 'enum' ? v.values : [])))] }
  }
  const unique = flat.filter((v, i) => flat.findIndex((w) => JSON.stringify(w) === JSON.stringify(v)) === i)
  return unique.length === 1 ? unique[0] : { kind: 'union', variants: unique }
}

// A property written as `{ "$ref": "#/$defs/title" }` carries its description, translation and
// widget in the target, because that is the point of sharing it (layout-box's top level and each
// `byLang` entry name the same fields). Keywords beside the `$ref` win - they are the more specific
// statement, as in JSON Schema 2019-09 and later.
function annotationsOf(raw: unknown, ctx: Ctx): Json {
  if (!isPlainObject(raw)) return {}
  if (typeof raw.$ref !== 'string') return raw
  const target = resolveRef(ctx, raw.$ref)
  return target ? { ...annotationsOf(target, ctx), ...raw } : raw
}

const KNOWN_KEYWORDS = new Set(['when', 'group', 'order', 'advanced', 'widget', 'dir-option', 'keys', 'l10n', 'note'].map((k) => `x-quartz-${k}`))
const KNOWN_WIDGETS = new Set(['snippetFile', 'html', 'markdown', 'glob'])

function fieldFromSchema(key: string, raw: unknown, path: string[], ctx: Ctx, depth: number): OptionField {
  const s = annotationsOf(raw, ctx)
  for (const keyword of Object.keys(s)) {
    if (keyword.startsWith('x-quartz-') && !KNOWN_KEYWORDS.has(keyword)) ctx.notes.push({ path, reason: `unknown keyword ${keyword}` })
  }
  if (s['x-quartz-widget'] !== undefined && !KNOWN_WIDGETS.has(s['x-quartz-widget'] as string)) {
    ctx.notes.push({ path, reason: `unknown x-quartz-widget ${JSON.stringify(s['x-quartz-widget'])}, edited as plain text` })
  }
  const field: OptionField = { key, node: nodeFromSchema(raw, path, ctx, depth), hasDefault: false, origin: 'schema' }
  if (typeof s.title === 'string') field.title = s.title
  if (typeof s.description === 'string') field.description = s.description
  if ('default' in s) {
    field.hasDefault = true
    field.default = s.default
  }
  const when = s['x-quartz-when']
  if (isPlainObject(when) && Object.values(when).every((v) => isEnumValue(v) || (Array.isArray(v) && v.every(isEnumValue)))) {
    field.when = when as OptionCondition
  } else if (when !== undefined) {
    ctx.notes.push({ path, reason: 'x-quartz-when is not a map of values' })
  }
  if (typeof s['x-quartz-group'] === 'string') field.group = s['x-quartz-group']
  if (typeof s['x-quartz-order'] === 'number') field.order = s['x-quartz-order']
  if (s['x-quartz-advanced'] === true) field.advanced = true
  const widget = s['x-quartz-widget']
  if (widget === 'snippetFile') {
    field.widget = { kind: 'snippetFile', ...(typeof s['x-quartz-dir-option'] === 'string' ? { dirOption: s['x-quartz-dir-option'] } : {}) }
  } else if (widget === 'html' || widget === 'markdown' || widget === 'glob') {
    field.widget = { kind: widget }
  }
  const l10n = s['x-quartz-l10n']
  if (isPlainObject(l10n)) {
    const texts: Record<string, OptionFieldText> = {}
    for (const [lang, text] of Object.entries(l10n)) {
      if (!isPlainObject(text)) continue
      const t: OptionFieldText = {}
      if (typeof text.title === 'string') t.title = text.title
      if (typeof text.description === 'string') t.description = text.description
      if (typeof text.group === 'string') t.group = text.group
      if (isPlainObject(text.enum)) {
        t.enum = Object.fromEntries(Object.entries(text.enum).filter((e): e is [string, string] => typeof e[1] === 'string'))
      }
      texts[lang] = t
    }
    field.l10n = texts
  }
  return field
}

/**
 * A JSON Schema for the whole options object. `source` says which manifest key (or the .d.ts
 * translation) it came from; the flat optionSchema goes through `normalizeOptionSchema`.
 */
export function normalizeJsonSchema(schema: unknown, source: OptionSchemaSource): NormalizedOptionSchema {
  const notes: OptionSchemaNote[] = []
  if (!isPlainObject(schema)) return { source, fields: [], notes: [{ path: [], reason: 'schema is not an object' }] }
  const ctx: Ctx = { root: schema, notes, refs: [] }
  const node = nodeFromSchema(schema, [], ctx, 0)
  if (node.kind === 'object') return { source, fields: node.fields, notes }
  if (node.kind === 'json' && notes.length === 0) notes.push({ path: [], reason: 'schema describes no properties' })
  else if (node.kind !== 'json') notes.push({ path: [], reason: `options are a ${node.kind}, not an object` })
  return { source, fields: [], notes }
}

/** `quartz.optionSchema`: a map of option name → schema, no wrapping object. */
export function normalizeOptionSchema(flat: unknown): NormalizedOptionSchema {
  if (!isPlainObject(flat)) return { source: 'optionSchema', fields: [], notes: [{ path: [], reason: 'optionSchema is not an object' }] }
  return normalizeJsonSchema({ type: 'object', properties: flat }, 'optionSchema')
}

// ── values → OptionNode ─────────────────────────────────────────────────────────────────────────

/** The node a bare value suggests - for keys only `defaultOptions` or the config know about. */
export function inferNode(value: unknown): OptionNode {
  if (typeof value === 'boolean') return { kind: 'boolean' }
  if (typeof value === 'number') return { kind: 'number' }
  if (typeof value === 'string') return { kind: 'string' }
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((v) => typeof v === 'string')) return { kind: 'array', items: { kind: 'string' } }
    if (value.length > 0 && value.every((v) => typeof v === 'number')) return { kind: 'array', items: { kind: 'number' } }
    return { kind: 'array', items: { kind: 'json' } }
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value)
    if (entries.length === 0) return { kind: 'json' }
    return { kind: 'object', fields: entries.map(([k, v]) => inferredField(k, v, 'defaults')) }
  }
  return { kind: 'json' }
}

function inferredField(key: string, value: unknown, origin: 'defaults' | 'config'): OptionField {
  return {
    key,
    node: inferNode(value),
    origin,
    hasDefault: origin === 'defaults',
    ...(origin === 'defaults' ? { default: value } : {})
  }
}

/** Whether `value` is something `node` can show and edit as it stands. */
export function nodeAccepts(node: OptionNode, value: unknown): boolean {
  switch (node.kind) {
    case 'boolean':
      return typeof value === 'boolean'
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number'
    case 'enum':
      return node.values.some((v) => v === value)
    case 'union':
      return node.variants.some((v) => nodeAccepts(v, value))
    case 'object':
      return isPlainObject(value)
    case 'record':
      return isPlainObject(value)
    case 'array':
      return Array.isArray(value)
    case 'json':
      return true
  }
}

// A schema and a value that disagree are both kept: the schema says what the plugin documents,
// the value is what the plugin actually gets. Picking one would either hide the value or offer an
// editor that cannot show it.
function widen(node: OptionNode, value: unknown): OptionNode {
  return nodeAccepts(node, value) ? node : unionOf([node, inferNode(value)])
}

function mergeValues(fields: OptionField[], values: Json, origin: 'defaults' | 'config'): OptionField[] {
  const out = fields.map((field) => {
    if (!(field.key in values)) return field
    const value = values[field.key]
    let next: OptionField = { ...field, node: widen(field.node, value) }
    if (origin === 'defaults' && !field.hasDefault) next = { ...next, hasDefault: true, default: value }
    if (next.node.kind === 'object' && isPlainObject(value)) {
      next = { ...next, node: { ...next.node, fields: mergeValues(next.node.fields, value, origin) } }
    }
    return next
  })
  for (const [key, value] of Object.entries(values)) {
    if (!fields.some((f) => f.key === key)) out.push(inferredField(key, value, origin))
  }
  return out
}

/**
 * Fill in what `quartz.defaultOptions` says: the default of every field it names (a schema's own
 * `default` wins - it is the more specific statement), and a field for every key no schema
 * describes. Nested objects are filled the same way.
 */
export function applyDefaults(schema: NormalizedOptionSchema, defaults: unknown): NormalizedOptionSchema {
  if (!isPlainObject(defaults)) return schema
  return { ...schema, fields: mergeValues(schema.fields, defaults, 'defaults') }
}

/** A schema from `defaultOptions` alone, for a plugin that brings nothing else. */
export function schemaFromDefaults(defaults: unknown): NormalizedOptionSchema | null {
  if (!isPlainObject(defaults) || Object.keys(defaults).length === 0) return null
  return applyDefaults({ source: 'defaults', fields: [], notes: [] }, defaults)
}

/**
 * Add a field for every key in one plugin entry's options that the schema does not describe, and
 * widen a field whose value the schema does not accept. Without this a key in quartz.config.yaml
 * that no schema names was simply not on screen, and neither was the fact that it is set -
 * `parseArrows` of obsidian-flavored-markdown on gui-test, which its optionSchema leaves out.
 * Per entry, not per plugin: two instances of the same plugin set different keys.
 */
export function withPresentKeys(schema: NormalizedOptionSchema, values: unknown): NormalizedOptionSchema {
  if (!isPlainObject(values)) return schema
  return { ...schema, fields: mergeValues(schema.fields, values, 'config') }
}

// ── reading and writing values ──────────────────────────────────────────────────────────────────

/** The value at `path`, or undefined. */
export function getAtPath(obj: unknown, path: readonly string[]): unknown {
  let cur: unknown = obj
  for (const key of path) {
    if (!isPlainObject(cur)) return undefined
    cur = cur[key]
  }
  return cur
}

/**
 * A copy of `obj` with `value` at `path`. `undefined` removes the key, and an object that this
 * removal leaves empty goes with it, up the path - otherwise clearing `byLang.en.title` leaves
 * `byLang: { en: {} }` in the YAML, which says "configured" about something that is not. Objects
 * that were empty before are left alone; that is pruneEmptyObjects' job, if anyone's.
 */
export function setAtPath(obj: Record<string, unknown>, path: readonly string[], value: unknown): Record<string, unknown> {
  const [head, ...rest] = path
  if (head === undefined) return obj
  if (rest.length === 0) {
    if (value !== undefined) return { ...obj, [head]: value }
    const { [head]: _removed, ...without } = obj
    return without
  }
  const child = isPlainObject(obj[head]) ? (obj[head] as Record<string, unknown>) : {}
  const next = setAtPath(child, rest, value)
  if (value === undefined && Object.keys(next).length === 0) {
    const { [head]: _removed, ...without } = obj
    return without
  }
  return { ...obj, [head]: next }
}

/** Remove every key whose value is an empty plain object, recursively. */
export function pruneEmptyObjects(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (isPlainObject(value)) {
      const pruned = pruneEmptyObjects(value)
      if (Object.keys(pruned).length > 0) out[key] = pruned
    } else {
      out[key] = value
    }
  }
  return out
}

/**
 * Whether a field's `when` holds, given the values of its containing object. An unset sibling
 * counts with its default, because that is what the plugin will see - `variant` left at `tree`
 * hides the tabs options as surely as one set to `tree`.
 */
export function evaluateCondition(when: OptionCondition | undefined, values: unknown, fields: readonly OptionField[]): boolean {
  if (!when) return true
  return Object.entries(when).every(([path, allowed]) => {
    const keys = path.split('.')
    let value = getAtPath(values, keys)
    if (value === undefined) value = defaultAtPath(fields, keys)
    const list = Array.isArray(allowed) ? allowed : [allowed]
    return list.some((a) => a === value)
  })
}

function defaultAtPath(fields: readonly OptionField[], keys: readonly string[]): unknown {
  const [head, ...rest] = keys
  const field = fields.find((f) => f.key === head)
  if (!field) return undefined
  if (rest.length === 0) return field.hasDefault ? field.default : undefined
  if (field.node.kind === 'object') {
    const nested = defaultAtPath(field.node.fields, rest)
    if (nested !== undefined) return nested
  }
  return field.hasDefault ? getAtPath(field.default, rest) : undefined
}

/** What the main process answers for one plugin. */
export interface PluginOptionSchemaResult {
  /** null: the plugin describes no options anywhere (or its package is not installed). */
  schema: NormalizedOptionSchema | null
  /** `quartz.version ?? version` of the package the schema was read from, as quartz reads it. */
  packageVersion?: string
  /** Set when the package is there but could not be read - a reason, not a schema. */
  unreadable?: string
  /**
   * `quartz.category` of the package, as a list ("component", "transformer", "emitter", ...).
   * The layout board says with it what switching a component off takes along: `enabled: false`
   * switches off the whole plugin, not just what it draws.
   */
  categories?: string[]
}
