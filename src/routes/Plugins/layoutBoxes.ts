import { quartzPluginName } from '@shared/quartzPluginName'
import type { PluginEntry, QuartzConfig } from '@shared/ipc-contract'

// What the Zusätzliche-Inhalte editor needs to know about quartz-layout-box 0.4.0, read from its
// LayoutBox.tsx rather than its README: `html` wins over `file` as soon as it is a string (an empty
// one included - `inline !== undefined`), a byLang entry is merged over the base options
// (`{ ...opts, ...hit }`), and a box without either reads `snippet.html` from
// `quartz/static/snippets` (its defaultOptions).

export const LAYOUT_BOX_PLUGIN = 'quartz-layout-box'
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
    refs.push({ file: file ?? DEFAULT_SNIPPET_FILE, lang, inherited: file === undefined })
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
 * The plugins after renaming a snippet: every box in `dir` that names `from` names `to`, and a box
 * that read it as the plugin's default names it explicitly - otherwise it would go on asking for
 * the old name. Returns how many boxes changed.
 */
export function renameSnippetRefs(plugins: PluginEntry[], dir: string, from: string, to: string): { plugins: PluginEntry[]; count: number } {
  let count = 0
  const next = plugins.map((p) => {
    if (quartzPluginName(p.source) !== LAYOUT_BOX_PLUGIN || boxDir(p.options) !== dir) return p
    const options: Options = { ...(p.options ?? {}) }
    let changed = false
    if (options.file === from || (from === DEFAULT_SNIPPET_FILE && options.file === undefined && typeof options.html !== 'string')) {
      options.file = to
      changed = true
    }
    const entries = byLangEntries(options)
    if (entries.some(([, e]) => e.file === from)) {
      options.byLang = Object.fromEntries(entries.map(([lang, e]) => [lang, e.file === from ? { ...e, file: to } : e]))
      changed = true
    }
    if (!changed) return p
    count++
    return { ...p, options }
  })
  return { plugins: next, count }
}
