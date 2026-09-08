import type { CssVariableGraph } from '@shared/ipc-contract'
import { CSS_VARIABLES, defaultValueFor, type CssVariableDef } from '../../data/cssVariables'

export type Mode = 'light' | 'dark'
export type VariableOrigin = 'core' | 'theme' | 'build' | 'user'

export interface ResolveContext {
  graph: CssVariableGraph | null
  overrides: Record<string, { light: string; dark: string }>
  colors: { lightMode?: Record<string, string>; darkMode?: Record<string, string> }
  typography: Record<string, string> | undefined
}

const CATALOG_BY_KEY = new Map(CSS_VARIABLES.map((def) => [def.key, def]))

const ANY_REFERENCE = /var\(\s*--([\w-]+)/g
const VAR_HEAD = /^\s*--([\w-]+)\s*(?:,|$)/

/**
 * Reads a value that is *nothing but* a reference to one other variable - the only shape that can
 * be followed as a derivation step. `rgba(var(--bg), .8)` or `calc(var(--x) * 2)` also depend on
 * another variable, but they combine it with something else, so the chain honestly ends there and
 * the referenced names are surfaced separately (see referencedVariables).
 *
 * Brace-counted rather than regex-matched because a var() fallback is routinely another var()
 * (`var(--light, var(--color-base-00))` is what Quartz's own theme emits): a `[^)]*` fallback
 * pattern stops at the inner closing paren and misses the whole form.
 */
export function pureAlias(value: string): { target: string; fallback?: string } | null {
  const v = value.trim()
  if (!v.startsWith('var(') || !v.endsWith(')')) return null
  let depth = 0
  for (let i = 0; i < v.length; i++) {
    if (v[i] === '(') depth++
    else if (v[i] === ')') {
      depth--
      // a paren closing before the end means the value is more than this one var()
      if (depth === 0 && i !== v.length - 1) return null
    }
  }
  const inner = v.slice(4, -1)
  const head = VAR_HEAD.exec(inner)
  if (!head) return null
  const comma = inner.indexOf(',')
  return { target: head[1], fallback: comma === -1 ? undefined : inner.slice(comma + 1).trim() }
}

export function catalogDef(key: string): CssVariableDef | undefined {
  return CATALOG_BY_KEY.get(key)
}

// What this variable resolves to today, one step deep - overrides first (custom.scss is emitted
// unlayered, so our own :root rule beats the theme's layered CSS regardless of order; see
// CssVariableOverride in ipc-contract), then whatever the theme or the build declared, then the
// curated catalog's derivation from the classic colors.
export function effectiveValue(key: string, mode: Mode, ctx: ResolveContext): string | undefined {
  const override = ctx.overrides[key]
  if (override) {
    const value = mode === 'dark' ? override.dark || override.light : override.light
    if (value) return value
  }
  const info = ctx.graph?.vars[key]
  if (info) {
    const value = info[mode] ?? info.light ?? info.dark
    if (value) return value
  }
  const def = catalogDef(key)
  if (def) {
    const value = defaultValueFor(def, ctx.colors, ctx.typography, mode)
    if (value) return value
  }
  return undefined
}

// The value a variable would have *without* the user's own override for it - the yardstick the
// editor compares a draft against, so "the user changed something" is a real comparison rather
// than "an entry exists in the overrides map". Without it every expanded row would count as
// changed the moment its input is rendered with the current value in it.
export function baseValue(key: string, mode: Mode, ctx: ResolveContext): string | undefined {
  const info = ctx.graph?.vars[key]
  if (info) {
    const value = info[mode] ?? info.light ?? info.dark
    if (value) return value
  }
  const def = catalogDef(key)
  if (def) {
    const value = defaultValueFor(def, ctx.colors, ctx.typography, mode)
    if (value) return value
  }
  return undefined
}

export interface ChainStep {
  key: string
  value: string
}

/**
 * The derivation chain behind a variable: `--text-accent` -> `var(--secondary)` -> `#284b63`.
 * Follows pure aliases only, and stops on a cycle (a theme with `--a: var(--b); --b: var(--a)`
 * would otherwise hang the renderer) or when nothing else is known.
 */
export function resolveChain(key: string, mode: Mode, ctx: ResolveContext): ChainStep[] {
  const steps: ChainStep[] = []
  const seen = new Set<string>([key])
  let currentKey = key
  let value = effectiveValue(key, mode, ctx)
  while (value !== undefined && steps.length < 20) {
    steps.push({ key: currentKey, value })
    const alias = pureAlias(value)
    if (!alias || seen.has(alias.target)) break
    seen.add(alias.target)
    const next = effectiveValue(alias.target, mode, ctx)
    currentKey = alias.target
    // An undeclared target is exactly the case the fallback exists for, so the chain continues
    // through it instead of dead-ending on a variable that never resolves in the browser either.
    value = next === undefined ? alias.fallback : next
  }
  return steps
}

/**
 * The literal a chain ends on, or undefined if it never reaches one (e.g. a variable a plugin
 * declares only inside a scoped selector, which this table deliberately doesn't collect).
 *
 * A chain frequently ends on a value that *embeds* a reference rather than being one -
 * `hsl(var(--color-blue-hsl))` and `rgba(var(--bg), 0.8)` are both everywhere in ported themes -
 * so the remaining references are substituted in place. Without that the swatch next to a
 * perfectly resolvable color stays blank.
 */
export function resolvedValue(key: string, mode: Mode, ctx: ResolveContext, depth = 0): string | undefined {
  const steps = resolveChain(key, mode, ctx)
  const last = steps[steps.length - 1]
  if (!last || pureAlias(last.value)) return undefined
  if (!last.value.includes('var(')) return last.value
  if (depth > 4) return undefined
  const substituted = substituteVars(last.value, mode, ctx, depth + 1)
  return substituted.includes('var(') ? undefined : substituted
}

// Replaces the leftmost var() reference with what it resolves to and recurses, so a value can hold
// several of them. Depth-capped rather than cycle-tracked: a self-referential theme would loop
// through resolvedValue, and the cap ends it either way.
function substituteVars(value: string, mode: Mode, ctx: ResolveContext, depth: number): string {
  if (depth > 4) return value
  const start = value.indexOf('var(')
  if (start === -1) return value
  let open = 0
  let end = -1
  for (let i = start + 3; i < value.length; i++) {
    if (value[i] === '(') open++
    else if (value[i] === ')') {
      open--
      if (open === 0) {
        end = i
        break
      }
    }
  }
  if (end === -1) return value
  const inner = value.slice(start + 4, end)
  const head = VAR_HEAD.exec(inner)
  if (!head) return value
  const comma = inner.indexOf(',')
  const fallback = comma === -1 ? undefined : inner.slice(comma + 1).trim()
  const resolved =
    resolvedValue(head[1], mode, ctx, depth) ?? (fallback ? substituteVars(fallback, mode, ctx, depth + 1) : undefined)
  if (resolved === undefined || resolved.includes('var(')) return value
  return substituteVars(value.slice(0, start) + resolved + value.slice(end + 1), mode, ctx, depth + 1)
}

/**
 * The same resolution as resolvedValue(), but for a *value* rather than a variable name - what the
 * editor needs while the user is typing, since a draft like `var(--secondary)` isn't stored under
 * any key yet. Both shapes are handled: a pure alias is followed, an embedded reference
 * (`hsl(var(--x))`) is substituted.
 */
export function resolveValueLiteral(value: string | undefined, mode: Mode, ctx: ResolveContext, depth = 0): string | undefined {
  const v = value?.trim()
  if (!v || depth > 4) return undefined
  const alias = pureAlias(v)
  if (alias) {
    return resolvedValue(alias.target, mode, ctx, depth + 1) ?? resolveValueLiteral(alias.fallback, mode, ctx, depth + 1)
  }
  if (!v.includes('var(')) return v
  const substituted = substituteVars(v, mode, ctx, depth + 1)
  return substituted.includes('var(') ? undefined : substituted
}

// Normalises any CSS color notation to #rrggbb, which is the only thing <input type="color">
// accepts - a theme's values are routinely hsl()/rgb()/color-mix(), and feeding those to the
// picker made it silently show white next to a swatch painting the real color.
//
// Canvas' fillStyle does the parsing (the browser's own color parser, so it covers every notation
// it can paint). An unparseable value leaves the previous fillStyle in place, so it is primed with
// a sentinel: an unchanged result means "not a color", not "black".
let colorProbe: CanvasRenderingContext2D | null | undefined
const COLOR_PROBE_SENTINEL = '#010203'

export function cssColorToHex(value: string | undefined): string | null {
  const v = value?.trim()
  if (!v || v.includes('var(')) return null
  if (colorProbe === undefined) colorProbe = document.createElement('canvas').getContext('2d')
  if (!colorProbe) return null
  colorProbe.fillStyle = COLOR_PROBE_SENTINEL
  colorProbe.fillStyle = v
  const out = colorProbe.fillStyle
  if (typeof out !== 'string' || !out.startsWith('#')) return null
  if (out === COLOR_PROBE_SENTINEL && v.toLowerCase() !== COLOR_PROBE_SENTINEL) return null
  return out
}

export function referencedVariables(value: string): string[] {
  const out = new Set<string>()
  ANY_REFERENCE.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = ANY_REFERENCE.exec(value)) !== null) out.add(match[1])
  return Array.from(out)
}

// Who supplies the value this row is showing - not which catalog the name belongs to. An active
// theme redeclares most of Quartz's own variables, so labelling `--light` "Quartz-Kern" while
// displaying the theme's value for it would name the wrong source; the catalog is only the answer
// when nothing else declares the variable.
export function originOf(key: string, ctx: ResolveContext): VariableOrigin {
  if (key in ctx.overrides) return 'user'
  const graphOrigin = ctx.graph?.vars[key]?.origin
  if (graphOrigin) return graphOrigin
  return catalogDef(key) ? 'core' : 'build'
}

// Only a value CSS can actually paint - anything still containing an unresolved var() would make
// the swatch silently fall back to transparent and read as "no color" rather than "not resolved".
export function isDisplayableColor(value: string | undefined): value is string {
  if (!value || value.includes('var(')) return false
  return /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla|color|oklch|lab)\()/i.test(value.trim())
}

// Groups a variable by its name prefix, which is how both Quartz's and Obsidian's variables are
// organised in practice (--callout-*, --h1-*, --background-*). A curated catalog entry keeps its
// hand-written group instead, so the well-known variables stay under the labels they had before.
export function groupOf(key: string): string {
  const def = catalogDef(key)
  if (def) return def.group
  const [first, second] = key.split('-')
  if (!second) return first.toUpperCase()
  // Two segments read better as one group for the deep hierarchies themes bring
  // (--background-modifier-border -> BACKGROUND) without splitting into dozens of one-row groups.
  return first.toUpperCase()
}

// The heading a group is shown under. groupOf() answers either a catalog group id - which has a
// translated label - or an uppercased name prefix, which is the variable's own text and stays as
// it is. One helper for both, so the two panels that list groups cannot label them differently.
export function groupLabel(t: (key: string, options?: Record<string, unknown>) => string, group: string): string {
  return t(`styles.variables.groups.${group}`, { defaultValue: group })
}

export function allKnownKeys(ctx: ResolveContext): string[] {
  const keys = new Set<string>(CSS_VARIABLES.map((def) => def.key))
  for (const key of Object.keys(ctx.graph?.vars ?? {})) keys.add(key)
  for (const key of Object.keys(ctx.overrides)) keys.add(key)
  return Array.from(keys)
}

// Every list in the UI *shows* a variable as `--tpl-space-lg`, because that is its name in CSS -
// but both the graph and the catalog key it bare (`tpl-space-lg`), so a `includes(query)` against
// the key never matched a query that carried the leading dashes. And that is precisely the query
// one types: the name is read off a row, copied out of custom.scss, or simply written the way it
// appears in a stylesheet. Measured on a project with the example template installed: the search
// for `--tpl-space-lg` found nothing in either box, while the row itself sat visible underneath.
// Both search boxes normalise through here, so they cannot drift apart again.
export function normalizeVarQuery(query: string): string {
  return query.trim().toLowerCase().replace(/^-+/, '')
}
