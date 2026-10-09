import { quartzPluginName } from '@shared/quartzPluginName'
import type { PluginEntry, QuartzConfig } from '@shared/ipc-contract'

// What the Mehrsprachigkeit editor needs to know about quartz-multilanguage 0.2.0, read from its
// options.ts rather than its README: a language is a string (its code) or an object with `code`;
// codes are trimmed and lower-cased; no usable language means `en`; a `defaultLanguage` that is
// empty or not among the languages means the first one; an empty `publishLanguages` means all of
// them, and `QUARTZ_LANGS` replaces it at build time.

export const MULTILANGUAGE_PLUGIN = 'quartz-multilanguage'
/** The version whose options.ts the defaults below are read from. */
export const MULTILANGUAGE_READ_AGAINST = '0.2.0'

type Options = Record<string, unknown>
export type LanguageEntry = Record<string, unknown> & { code: string }

export interface MultilanguageInstance {
  plugin: PluginEntry
  index: number
}

export function multilanguageEntries(config: QuartzConfig | null): MultilanguageInstance[] {
  const out: MultilanguageInstance[] = []
  config?.plugins.forEach((plugin, index) => {
    if (quartzPluginName(plugin.source) === MULTILANGUAGE_PLUGIN) out.push({ plugin, index })
  })
  return out
}

export function normalizeCode(code: string): string {
  return code.trim().toLowerCase()
}

// Each entry languagesOf hands out remembers the item it was read from, so that writing the list
// back leaves an entry nobody changed as it was written - `DE` stays `DE`, not the `de` the plugin
// reads it as. An entry the editor changed is a new object and is not in here.
const READ_FROM = new WeakMap<LanguageEntry, unknown>()

type RawItem = { kind: 'language'; code: string; item: unknown } | { kind: 'duplicate'; code: string; item: unknown } | { kind: 'other'; item: unknown }

/** The written list item by item, as the plugin sorts it: a language, a second one with a code it already has, or neither. */
function classify(raw: unknown): RawItem[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  return raw.map((item): RawItem => {
    const entry = typeof item === 'string' ? { code: item } : item && typeof item === 'object' ? (item as Record<string, unknown>) : null
    const code = typeof entry?.code === 'string' ? normalizeCode(entry.code) : ''
    if (!entry || !code) return { kind: 'other', item }
    if (seen.has(code)) return { kind: 'duplicate', code, item }
    seen.add(code)
    return { kind: 'language', code, item }
  })
}

/** The languages as the plugin reads them, each as an object - a plain string becomes `{ code }`. */
export function languagesOf(options: Options | undefined): LanguageEntry[] {
  const out: LanguageEntry[] = []
  for (const raw of classify(options?.languages)) {
    if (raw.kind !== 'language') continue
    const entry: LanguageEntry = { ...(typeof raw.item === 'string' ? {} : (raw.item as Record<string, unknown>)), code: raw.code }
    READ_FROM.set(entry, raw.item)
    out.push(entry)
  }
  return out.length ? out : [{ code: 'en' }]
}

export function defaultLanguageOf(options: Options | undefined, languages: LanguageEntry[]): string {
  const set = typeof options?.defaultLanguage === 'string' ? normalizeCode(options.defaultLanguage) : ''
  return languages.some((l) => l.code === set) ? set : languages[0].code
}

/** The codes `publishLanguages` names that are languages of the site; empty means every language. */
export function publishedOf(options: Options | undefined, languages: LanguageEntry[]): string[] {
  const raw = options?.publishLanguages
  if (!Array.isArray(raw)) return []
  const codes = new Set(languages.map((l) => l.code))
  return raw.filter((c): c is string => typeof c === 'string').map(normalizeCode).filter((c) => codes.has(c))
}

export function isPublished(code: string, published: string[]): boolean {
  return published.length === 0 || published.includes(code)
}

/**
 * Writes the languages back into the list they were read from, touching only what changed. An
 * entry nobody changed keeps its written form; a changed or new one is written with its code as
 * the plugin reads it, and as the plain string it can be when the code is all it has. The
 * languages fill the places languages had, in their new order, and new ones go at the end; an
 * item that is no language stays where it is. A second entry with a code the list already has
 * stays only while that code is still a language and comes first - otherwise removing or renaming
 * a language would bring it back under its old code.
 */
function writeLanguages(written: unknown, languages: LanguageEntry[]): unknown[] {
  const asWritten = (l: LanguageEntry): unknown => (READ_FROM.has(l) ? READ_FROM.get(l) : Object.keys(l).length === 1 ? l.code : l)
  const queue = [...languages]
  const out: unknown[] = []
  const placed = new Set<string>()
  for (const raw of classify(written)) {
    if (raw.kind === 'other') out.push(raw.item)
    else if (raw.kind === 'duplicate') {
      if (placed.has(raw.code) && languages.some((l) => l.code === raw.code)) out.push(raw.item)
    } else {
      const next = queue.shift()
      if (!next) continue
      placed.add(next.code)
      out.push(asWritten(next))
    }
  }
  for (const l of queue) out.push(asWritten(l))
  return out
}

/** `publishLanguages` after turning one language on or off; all of them on is the empty list again. */
export function withPublished(options: Options, languages: LanguageEntry[], code: string, on: boolean): Options {
  const current = publishedOf(options, languages)
  const all = languages.map((l) => l.code)
  const now = new Set(current.length ? current : all)
  if (on) now.add(code)
  else now.delete(code)
  const list = all.filter((c) => now.has(c))
  return { ...options, publishLanguages: list.length === all.length ? [] : list }
}

/**
 * The options after renaming a language: its entry, and every option that names it by code -
 * `defaultLanguage`, `publishLanguages` and `seo.xDefault`. Pages and folders that carry the old
 * code are content, not configuration, and stay as they are.
 */
export function renameLanguage(options: Options, languages: LanguageEntry[], from: string, to: string): Options {
  const next: Options = { ...options, languages: writeLanguages(options.languages, languages.map((l) => (l.code === from ? { ...l, code: to } : l))) }
  if (typeof options.defaultLanguage === 'string' && normalizeCode(options.defaultLanguage) === from) next.defaultLanguage = to
  if (Array.isArray(options.publishLanguages)) {
    next.publishLanguages = options.publishLanguages.map((c) => (typeof c === 'string' && normalizeCode(c) === from ? to : c))
  }
  const seo = options.seo
  if (seo && typeof seo === 'object' && !Array.isArray(seo)) {
    const x = (seo as Options).xDefault
    if (typeof x === 'string' && normalizeCode(x) === from) next.seo = { ...(seo as Options), xDefault: to }
  }
  return next
}

/**
 * The languages that removing `code` would publish without anyone turning them on: when it is the
 * only published one, `publishLanguages` is left empty, and empty means every language. The plugin
 * would land there too if the code stayed in the list (it drops codes that are no language), so
 * this is not a choice removeLanguage can make differently - only one the user has to see first.
 */
export function publishedByRemoving(options: Options | undefined, languages: LanguageEntry[], code: string): LanguageEntry[] {
  const published = publishedOf(options, languages)
  if (published.length === 0 || published.some((c) => c !== code)) return []
  return languages.filter((l) => l.code !== code)
}

/** The options after removing a language, and what named it: a default on it moves to the first one left. */
export function removeLanguage(options: Options, languages: LanguageEntry[], code: string): Options {
  const rest = languages.filter((l) => l.code !== code)
  const next: Options = { ...options, languages: writeLanguages(options.languages, rest) }
  if (typeof options.defaultLanguage === 'string' && normalizeCode(options.defaultLanguage) === code) next.defaultLanguage = rest[0]?.code
  if (Array.isArray(options.publishLanguages)) {
    next.publishLanguages = options.publishLanguages.filter((c) => !(typeof c === 'string' && normalizeCode(c) === code))
  }
  const seo = options.seo
  if (seo && typeof seo === 'object' && !Array.isArray(seo)) {
    const x = (seo as Options).xDefault
    if (typeof x === 'string' && normalizeCode(x) === code) next.seo = { ...(seo as Options), xDefault: 'default' }
  }
  return next
}

export function withLanguages(options: Options, languages: LanguageEntry[]): Options {
  return { ...options, languages: writeLanguages(options.languages, languages) }
}

/** Why a code cannot be used, or null. Loose on purpose: the plugin itself only asks for one. */
export function codeProblem(code: string, languages: LanguageEntry[], own?: string): 'empty' | 'taken' | 'form' | null {
  const c = normalizeCode(code)
  if (!c) return 'empty'
  if (/[\s/\\]/.test(c)) return 'form'
  if (c !== own && languages.some((l) => l.code === c)) return 'taken'
  return null
}

// The settings below the languages, by the plugin's own groups (`x-quartz-group`). Keys a later
// version adds and no section names land in `other`, so nothing is out of reach.
export const SECTIONS = [
  { id: 'detection', keys: ['detection', 'linking', 'frontmatterKeys'] },
  { id: 'switcher', keys: ['switcher'] },
  { id: 'seo', keys: ['seo'] },
  { id: 'redirects', keys: ['rootRedirect', 'rememberChoice', 'fallbackPages'] },
  { id: 'notices', keys: ['missingTranslationNotice', 'availableTranslationNotice'] },
  { id: 'linksDates', keys: ['rewriteCrossLanguageLinks', 'localizeDates'] }
] as const

export type SectionId = (typeof SECTIONS)[number]['id'] | 'other'

/** The keys the language list itself edits. */
export const LANGUAGE_KEYS = ['languages', 'defaultLanguage', 'publishLanguages']

const KNOWN = new Set<string>([...LANGUAGE_KEYS, ...SECTIONS.flatMap((s) => s.keys)])

export function sectionPick(id: SectionId): (key: string) => boolean {
  if (id === 'other') return (key) => !KNOWN.has(key)
  const keys: readonly string[] = SECTIONS.find((s) => s.id === id)!.keys
  return (key) => keys.includes(key)
}
