import { quartzPluginName } from '@shared/quartzPluginName'
import { isNewerVersion } from '@shared/semver'
import type { PluginEntry, QuartzConfig } from '@shared/ipc-contract'

// What the Zusätzliche-Inhalte editor needs to know about quartz-layout-box 0.4.1, read from its
// LayoutBox.tsx rather than its README: a key whose value is `null` - `html:` or `file:` left empty
// in the YAML - counts as not written (`withoutNulls`, base options and each byLang entry), `html`
// wins over `file` as soon as it is set otherwise (`inline !== undefined` - an empty string
// included), a byLang entry is merged over the base options (`{ ...opts, ...hit }`), and a box
// without either reads `snippet.html` from `quartz/static/snippets` (its defaultOptions). Only a
// missing key falls back to the default: an empty `dir` is the project itself
// (`path.resolve(cwd, '')`), an empty `file` the folder, which cannot be read, and a value that is
// neither null nor a string makes the component throw (`html.trim`, `path.resolve`). Before 0.4.1
// `null` threw as well (NULL_SAFE_SINCE).
// `npm run check:plugin-copies` holds these rules against the installed plugin.

export const LAYOUT_BOX_PLUGIN = 'quartz-layout-box'
/** The version whose LayoutBox.tsx the rules below are read from. */
export const LAYOUT_BOX_READ_AGAINST = '0.4.2'
/** Versions whose src/ is the same as that one's (`git diff v0.4.1 v0.4.2 -- src` is empty; 0.4.0
 *  differs). See NAVIGATIONS_SAME_CODE. */
export const LAYOUT_BOX_SAME_CODE = ['0.4.1'] as const
/** The first version that reads a null option as a missing one; the ones before throw on it. */
export const NULL_SAFE_SINCE = '0.4.1'
export const DEFAULT_SNIPPET_DIR = 'quartz/static/snippets'
export const DEFAULT_SNIPPET_FILE = 'snippet.html'
/**
 * The `{{…}}` tokens layout-box replaces in a box's text and title, read from its placeholders.ts
 * (`resolvePlaceholder`, 0.4.1): the seven named ones, and `frontmatter.<key>` for any key of the
 * page's frontmatter. A token it does not know stays as it is written. `npm run check:plugin-copies`
 * holds the list against the plugin's own switch.
 */
export const LAYOUT_BOX_PLACEHOLDERS = ['title', 'slug', 'root', 'siteTitle', 'baseUrl', 'locale', 'lang'] as const
export const LAYOUT_BOX_FRONTMATTER_PLACEHOLDER = 'frontmatter.'
/** Where "Bild einfügen…" copies a picture to (snippetService.IMAGES_DIR). */
export const IMAGES_DIR = 'quartz/static/images'

export interface BoxInstance {
  plugin: PluginEntry
  index: number
  /** 1-based among the boxes, in config order - the "#n" the plugin list uses for an instance. */
  occurrence: number
}

type Options = Record<string, unknown>

/** The options as the plugin reads them: keys whose value is null are dropped (its withoutNulls). */
export function withoutNulls(options: unknown): Options {
  if (!options || typeof options !== 'object' || Array.isArray(options)) return {}
  return Object.fromEntries(Object.entries(options).filter(([, value]) => value !== null))
}

export function boxesOf(config: QuartzConfig | null): BoxInstance[] {
  const boxes: BoxInstance[] = []
  config?.plugins.forEach((plugin, index) => {
    if (quartzPluginName(plugin.source) === LAYOUT_BOX_PLUGIN) boxes.push({ plugin, index, occurrence: boxes.length + 1 })
  })
  return boxes
}

/**
 * A folder as the config may write it - `./quartz/static/snippets/` and `quartz/static/snippets` are
 * one, and `''`, `.` and `./` are all the project itself, written `.`.
 */
export function normalizeDir(dir: string): string {
  return dir.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '') || '.'
}

export function boxDir(options: Options | undefined): string {
  const dir = options?.dir
  return normalizeDir(typeof dir === 'string' ? dir : DEFAULT_SNIPPET_DIR)
}

export type BoxContentKind = 'html' | 'file'

export function boxContentKind(options: Options | undefined): BoxContentKind {
  return options?.html !== undefined && options.html !== null ? 'html' : 'file'
}

/** The file a box reads with these (merged) options - `''` names the folder itself. */
function fileOf(merged: Options): string {
  return typeof merged.file === 'string' ? merged.file : DEFAULT_SNIPPET_FILE
}

/**
 * The option the plugin throws on with these (merged, nulls dropped) options: a key that is set,
 * but not to text.
 */
function brokenKey(merged: Options): 'html' | 'file' | 'dir' | null {
  if (merged.html !== undefined) return typeof merged.html === 'string' ? null : 'html'
  for (const key of ['file', 'dir'] as const) if (merged[key] !== undefined && typeof merged[key] !== 'string') return key
  return null
}

/** The base options and each language entry merged over them, both as the plugin reads them. */
export function mergedVariants(options: Options | undefined): [string | undefined, Options][] {
  const base = withoutNulls(options)
  return [[undefined, base], ...byLangEntries(base).map(([lang, entry]): [string, Options] => [lang, { ...base, ...withoutNulls(entry) }])]
}

export interface BrokenOption {
  key: 'html' | 'file' | 'dir'
  /** The language whose entry breaks; undefined for the base options. */
  lang?: string
}

/** Whether the installed version throws on a null option. Unknown counts as current. */
export function nullBreaks(installed: string | undefined): boolean {
  return !!installed && isNewerVersion(NULL_SAFE_SINCE, installed)
}

/**
 * Where a box makes the plugin throw - the base options, and each language entry merged over them.
 * `installed` is the plugin's version in the project: before NULL_SAFE_SINCE a null option throws
 * too. Unknown counts as current - without the plugin nothing is built that could throw.
 */
export function brokenOptions(options: Options | undefined, installed?: string): BrokenOption[] {
  const out: BrokenOption[] = []
  if (nullBreaks(installed)) {
    const base = options ?? {}
    const key = brokenKey(base)
    if (key) out.push({ key })
    for (const [lang, entry] of byLangEntries(base)) {
      const k = brokenKey({ ...base, ...entry })
      if (k) out.push({ key: k, lang })
    }
    return out
  }
  for (const [lang, merged] of mergedVariants(options)) {
    const key = brokenKey(merged)
    if (key) out.push(lang === undefined ? { key } : { key, lang })
  }
  return out
}

function byLangEntries(options: Options | undefined): [string, Options][] {
  const map = options?.byLang
  if (!map || typeof map !== 'object' || Array.isArray(map)) return []
  return Object.entries(map as Record<string, unknown>).filter((e): e is [string, Options] => !!e[1] && typeof e[1] === 'object')
}

export interface SnippetRef {
  file: string
  /** The folder it is read from - a language entry may bring its own `dir`, merged like the rest. */
  dir: string
  /** The language whose entry names it; undefined for the base options. */
  lang?: string
  /** Named by nobody - the plugin's default file. */
  inherited: boolean
}

/** The snippet files a box actually renders: for its base options and for each language entry. */
export function snippetRefs(options: Options | undefined): SnippetRef[] {
  const refs: SnippetRef[] = []
  for (const [lang, merged] of mergedVariants(options)) {
    if (merged.html !== undefined || brokenKey(merged)) continue
    refs.push({ file: fileOf(merged), dir: boxDir(merged), lang, inherited: merged.file === undefined })
  }
  return refs
}

/** Every inline text of a box - base and per language - for the question which pictures it shows. */
export function boxHtmls(options: Options | undefined): string[] {
  const out: string[] = []
  if (typeof options?.html === 'string') out.push(options.html)
  for (const [, entry] of byLangEntries(options)) if (typeof entry.html === 'string') out.push(entry.html)
  return out
}

/** Languages whose entry brings its own text while the base reads a file - that text wins there. */
export function langsWithOwnText(options: Options | undefined): string[] {
  return byLangEntries(options)
    .filter(([, entry]) => typeof entry.html === 'string')
    .map(([lang]) => lang)
}

/** True when `text` points at the picture `name` in quartz/static/images, written plainly or URL-encoded. */
export function mentionsImage(text: string, name: string): boolean {
  return text.includes(`static/images/${name}`) || text.includes(`static/images/${encodeURIComponent(name)}`)
}

/**
 * The plugins after renaming a snippet in `dir`: every place of a box that renders `from` from
 * that folder - the base options or a language entry, each with its options merged as the plugin
 * merges them - renders `to`, and every other place goes on rendering what it did. That is more
 * than "replace `file: from`": a box that read `from` as the plugin's default names `to`
 * explicitly, a language entry with a folder of its own is left alone even when its file has the
 * same name (41st review, finding 5), and a language entry that inherited the base file keeps the
 * old name when only the base changes. Returns how many boxes changed.
 */
export function renameSnippetRefs(plugins: PluginEntry[], dir: string, from: string, to: string): { plugins: PluginEntry[]; count: number } {
  let count = 0
  // Asked of the options as the plugin reads them, so a `file:` left empty reads the default.
  const reads = (options: Options): boolean => {
    const merged = withoutNulls(options)
    return merged.html === undefined && !brokenKey(merged) && boxDir(merged) === dir && fileOf(merged) === from
  }
  const next = plugins.map((p) => {
    if (quartzPluginName(p.source) !== LAYOUT_BOX_PLUGIN) return p
    const old: Options = p.options ?? {}
    const options: Options = { ...old }
    let changed = false
    if (reads(old)) {
      options.file = to
      changed = true
    }
    const entries = byLangEntries(old)
    if (entries.length) {
      const nextEntries = entries.map(([lang, entry]): [string, Options] => {
        const before = { ...withoutNulls(old), ...withoutNulls(entry) }
        if (before.html !== undefined) return [lang, entry]
        const wanted = reads(before) ? to : fileOf(before)
        if (fileOf({ ...withoutNulls(options), ...withoutNulls(entry) }) === wanted) return [lang, entry]
        changed = true
        return [lang, { ...entry, file: wanted }]
      })
      if (nextEntries.some(([, e], i) => e !== entries[i][1])) options.byLang = { ...(old.byLang as Options), ...Object.fromEntries(nextEntries) }
    }
    if (!changed) return p
    count++
    return { ...p, options }
  })
  return { plugins: next, count }
}
