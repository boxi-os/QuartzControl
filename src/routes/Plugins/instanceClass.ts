import type { PluginEntry } from '@shared/ipc-contract'

// The CSS class a navigation or a layout box gets from the app, so a stylesheet and the preview's
// marks can tell one instance from its siblings. Set when the instance is created, duplicated, or
// on "Eigene Klasse vergeben" - never renamed afterwards: a stylesheet aims at the class, and a
// class that followed the title would leave its rules aiming at nothing, without a word.
//
// Always behind a prefix. A navigation titled "Explorer" would otherwise be `.explorer` and pick up
// every rule Quartz and the template write for the explorer; the same for search, graph, toc. The
// prefixes are the ones the basic template already uses (`nav-menue`, `layout-box-mark`).

export const NAV_CLASS_PREFIX = 'nav-'
export const BOX_CLASS_PREFIX = 'layout-box-'

const CLASS = /^[A-Za-z_][\w-]*$/

/** The classes of an entry's `className` option, in order; empty when it has none. */
export function classTokens(entry: PluginEntry): string[] {
  const own = entry.options?.className
  return typeof own === 'string' ? own.split(/\s+/).filter(Boolean) : []
}

/**
 * The class that is this entry's own: the last one. A duplicate keeps the original's classes, so it
 * inherits its styling, and gets its own appended. Null when the last token is nothing a selector
 * could name safely.
 */
export function ownClass(entry: PluginEntry): string | null {
  const last = classTokens(entry).at(-1)
  return last && CLASS.test(last) ? last : null
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '')
}

/** `candidate`, or with -2, -3 … until no entry of the config has it. */
export function uniqueClass(candidate: string, plugins: PluginEntry[]): string {
  const taken = new Set(plugins.flatMap(classTokens))
  if (!taken.has(candidate)) return candidate
  const stem = candidate.replace(/-\d+$/, '')
  for (let n = 2; ; n++) if (!taken.has(`${stem}-${n}`)) return `${stem}-${n}`
}

/** A new class from a name the user sees (a title, a variant, a file), prefixed and unique. */
export function suggestClass(prefix: string, name: string, fallback: string, plugins: PluginEntry[]): string {
  return uniqueClass(prefix + (slug(name) || fallback), plugins)
}

/** The options with `cls` appended to their className. */
export function withClass(options: Record<string, unknown> | undefined, cls: string): Record<string, unknown> {
  const before = typeof options?.className === 'string' ? options.className.trim() : ''
  return { ...options, className: before ? `${before} ${cls}` : cls }
}

/**
 * The class a copy of `entry` gets: the original's own one counted up (`layout-box-mark-2`), or,
 * when it has none, one from its name.
 */
export function classForCopy(entry: PluginEntry, prefix: string, name: string, fallback: string, plugins: PluginEntry[]): string {
  const own = ownClass(entry)
  return own ? uniqueClass(own, plugins) : suggestClass(prefix, name, fallback, plugins)
}

const PREFIX: Record<string, string> = { 'quartz-navigations': NAV_CLASS_PREFIX, 'quartz-layout-box': BOX_CLASS_PREFIX }
const FALLBACK: Record<string, string> = { 'quartz-navigations': 'navigation', 'quartz-layout-box': 'box' }

// A name for the class when the caller has none to offer (the layout board): the title, else the
// navigation's variant or the box's file - the same things the two editors name an entry by, only
// untranslated.
function nameOf(entry: PluginEntry): string {
  const o = entry.options ?? {}
  if (typeof o.title === 'string' && o.title.trim()) return o.title
  if (typeof o.variant === 'string') return o.variant
  if (typeof o.file === 'string') return o.file.replace(/^.*[\\/]/, '').replace(/\.[^.]*$/, '')
  return ''
}

/**
 * `copy` of `source` with a class of its own appended, for the two plugins whose class lands on the
 * rendered root - every other plugin's copy comes back as it is. Every duplicate in the app goes
 * through here (LayoutEditor/utils.ts duplicateEntry): the editors' "duplizieren", the board's
 * "Duplizieren" and a palette chip dropped on the board. `name` is what the editor calls the entry;
 * without it, nameOf().
 */
export function withOwnClassForCopy(copy: PluginEntry, source: PluginEntry, plugins: PluginEntry[], name?: string): PluginEntry {
  const prefix = PREFIX[source.name]
  if (!prefix) return copy
  const cls = classForCopy(source, prefix, name ?? nameOf(source), FALLBACK[source.name], plugins)
  return { ...copy, options: withClass(copy.options, cls) }
}
