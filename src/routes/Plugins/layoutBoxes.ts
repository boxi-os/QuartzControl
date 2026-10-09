import { quartzPluginName } from '@shared/quartzPluginName'
import type { PluginEntry, QuartzConfig } from '@shared/ipc-contract'

// What the Zusätzliche-Inhalte editor needs to know about quartz-layout-box 0.4.0, read from its
// LayoutBox.tsx rather than its README: `html` wins over `file` as soon as it is a string (an empty
// one included - `inline !== undefined`), a byLang entry is merged over the base options
// (`{ ...opts, ...hit }`), and a box without either reads `snippet.html` from
// `quartz/static/snippets` (its defaultOptions).

export const LAYOUT_BOX_PLUGIN = 'quartz-layout-box'
/** The version whose LayoutBox.tsx the rules below are read from. */
export const LAYOUT_BOX_READ_AGAINST = '0.4.0'
export const DEFAULT_SNIPPET_DIR = 'quartz/static/snippets'
export const DEFAULT_SNIPPET_FILE = 'snippet.html'
/** Where "Bild einfügen…" copies a picture to (snippetService.IMAGES_DIR). */
export const IMAGES_DIR = 'quartz/static/images'

export interface BoxInstance {
  plugin: PluginEntry
  index: number
  /** 1-based among the boxes, in config order - the "#n" the plugin list uses for an instance. */
  occurrence: number
}

type Options = Record<string, unknown>

export function boxesOf(config: QuartzConfig | null): BoxInstance[] {
  const boxes: BoxInstance[] = []
  config?.plugins.forEach((plugin, index) => {
    if (quartzPluginName(plugin.source) === LAYOUT_BOX_PLUGIN) boxes.push({ plugin, index, occurrence: boxes.length + 1 })
  })
  return boxes
}

/** A folder as the config may write it - `./quartz/static/snippets/` and `quartz/static/snippets` are one. */
export function normalizeDir(dir: string): string {
  return dir.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '')
}

export function boxDir(options: Options | undefined): string {
  const dir = options?.dir
  return normalizeDir(typeof dir === 'string' && dir.trim() ? dir : DEFAULT_SNIPPET_DIR)
}

export type BoxContentKind = 'html' | 'file'

export function boxContentKind(options: Options | undefined): BoxContentKind {
  return typeof options?.html === 'string' ? 'html' : 'file'
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
  const base = options ?? {}
  const refs: SnippetRef[] = []
  const add = (merged: Options, lang?: string): void => {
    if (typeof merged.html === 'string') return
    const file = typeof merged.file === 'string' && merged.file ? merged.file : undefined
    refs.push({ file: file ?? DEFAULT_SNIPPET_FILE, dir: boxDir(merged), lang, inherited: file === undefined })
  }
  add(base)
  for (const [lang, entry] of byLangEntries(base)) add({ ...base, ...entry }, lang)
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
  const fileOf = (merged: Options): string => (typeof merged.file === 'string' && merged.file ? merged.file : DEFAULT_SNIPPET_FILE)
  const reads = (merged: Options): boolean => typeof merged.html !== 'string' && boxDir(merged) === dir && fileOf(merged) === from
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
        const before = { ...old, ...entry }
        if (typeof before.html === 'string') return [lang, entry]
        const wanted = reads(before) ? to : fileOf(before)
        if (fileOf({ ...options, ...entry }) === wanted) return [lang, entry]
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
