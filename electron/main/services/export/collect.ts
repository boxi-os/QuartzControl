import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { anchorFor, outsideUrl, slugFromPathname, type DocItem } from '@shared/exportModel'
import { mainT, mainTIn } from '../../i18n'
import type { ExportWindow } from './exportWindow'
import { extractArticle, readNavigation, settlePage, type ExtractedPage, type NavigationSource } from './pageScripts'

/**
 * What the built site says about itself, read from its own files rather than reconstructed:
 * which pages exist, their titles, tags and outgoing links (static/contentIndex.json, Quartz's
 * ContentIndex plugin), and - when quartz-multilanguage is on - the language of each page and the
 * start page of each language (static/multilanguage.json, which the plugin writes for its own
 * switcher). Nothing here ports Quartz's or the plugin's logic.
 */
export interface SiteFacts {
  /** Every content page that has an HTML file in the build. */
  pages: Map<string, { title: string; tags: string[]; links: string[] }>
  /** quartz-multilanguage's languages; empty when the plugin is not in the build. */
  languages: { code: string; home: string; locale?: string; label: string }[]
  defaultLanguage: string
  langOf: Map<string, string>
}

function errorCode(err: unknown): string {
  return typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : ''
}

export async function readSiteFacts(root: string): Promise<SiteFacts> {
  let raw: string
  try {
    raw = await readFile(join(root, 'static', 'contentIndex.json'), 'utf-8')
  } catch (err) {
    // „fehlt“ and „kaputt“ are two answers: the first is a plugin switched off, the second a build
    // that went wrong.
    if (errorCode(err) === 'ENOENT') throw new Error(mainT('exportNoContentIndex'))
    throw new Error(mainT('exportBrokenContentIndex', { reason: String(err) }))
  }
  let index: Record<string, { title?: unknown; tags?: unknown; links?: unknown }>
  try {
    index = JSON.parse(raw)
    if (!index || typeof index !== 'object' || Array.isArray(index)) throw new Error('not an object')
  } catch (err) {
    throw new Error(mainT('exportBrokenContentIndex', { reason: (err as Error).message }))
  }
  const pages: SiteFacts['pages'] = new Map()
  for (const [slug, entry] of Object.entries(index)) {
    // Quartz's tag listings are pages of the build too (`tags/<tag>`, with a made-up filePath
    // `tags/<tag>.md`), and the Explorer hides them by default. A document has its own register
    // for tags (`tagIndex`), so they are not pages of a book.
    if (slug === 'tags' || slug.startsWith('tags/')) continue
    if (!existsSync(join(root, `${slug}.html`))) continue
    pages.set(slug, {
      title: typeof entry?.title === 'string' ? entry.title : slug,
      tags: Array.isArray(entry?.tags) ? entry.tags.filter((t): t is string => typeof t === 'string') : [],
      links: Array.isArray(entry?.links) ? entry.links.filter((l): l is string => typeof l === 'string') : []
    })
  }

  const facts: SiteFacts = { pages, languages: [], defaultLanguage: '', langOf: new Map() }
  try {
    const ml = JSON.parse(await readFile(join(root, 'static', 'multilanguage.json'), 'utf-8')) as {
      defaultLanguage?: unknown
      languages?: { code?: unknown; home?: unknown; locale?: unknown; native?: unknown; label?: unknown }[]
      pages?: Record<string, { lang?: unknown }>
    }
    if (Array.isArray(ml.languages)) {
      facts.languages = ml.languages
        .filter((l) => typeof l.code === 'string')
        .map((l) => ({
          code: l.code as string,
          home: typeof l.home === 'string' ? l.home : 'index',
          locale: typeof l.locale === 'string' ? l.locale : undefined,
          label: typeof l.native === 'string' ? l.native : typeof l.label === 'string' ? l.label : (l.code as string)
        }))
    }
    facts.defaultLanguage = typeof ml.defaultLanguage === 'string' ? ml.defaultLanguage : (facts.languages[0]?.code ?? '')
    for (const [slug, p] of Object.entries(ml.pages ?? {})) if (typeof p?.lang === 'string') facts.langOf.set(slug, p.lang)
  } catch {
    // No quartz-multilanguage in this build, or a file it did not write: one language.
  }
  return facts
}

/** The pages of one language ('' = the default one, or every page without multilanguage). A page
 *  the plugin did not list counts as the default language - that is what the plugin does too. */
export function pagesInLanguage(facts: SiteFacts, language: string): Set<string> {
  if (facts.languages.length === 0) return new Set(facts.pages.keys())
  const wanted = language || facts.defaultLanguage
  return new Set([...facts.pages.keys()].filter((slug) => (facts.langOf.get(slug) ?? facts.defaultLanguage) === wanted))
}

export interface NavigationOrder {
  source: NavigationSource
  /** Pages in the order the navigation shows them, each once, only pages of the build. */
  slugs: string[]
  /** Whether the navigation had rendered by the time the page was read. */
  complete: boolean
}

const SETTLE_MS = 15_000

/** The start page of a language ('' = the default one): quartz-multilanguage's `home`, else the
 *  site's index. */
export function languageHome(facts: SiteFacts, language: string): string {
  return facts.languages.find((l) => l.code === (language || facts.defaultLanguage))?.home ?? 'index'
}

/**
 * The folder a book's pages are counted from. The book's own root when it has one; otherwise the
 * folder of the language's start page - in Example the English pages live under `en/`, and
 * measured from the site's root every one of them sat a level too deep (en/index h2, its pages h3).
 */
export function effectiveRoot(facts: SiteFacts, root: string, language: string): string {
  if (root) return root
  const home = languageHome(facts, language)
  return home.endsWith('/index') ? home.slice(0, -'/index'.length) : ''
}

/** The site's order, read from the navigation on the start page of the language. */
export async function readNavigationOrder(win: ExportWindow, origin: string, facts: SiteFacts, language: string): Promise<NavigationOrder> {
  const home = languageHome(facts, language)
  await win.load(`${origin}/${home}`)
  const settled = await win.run(settlePage, [{ navigation: true, timeoutMs: SETTLE_MS }])
  const nav = await win.run(readNavigation, [])
  const seen = new Set<string>()
  const slugs: string[] = []
  for (const href of nav.hrefs) {
    const slug = slugFromPathname(new URL(href).pathname)
    if (seen.has(slug) || !facts.pages.has(slug)) continue
    seen.add(slug)
    slugs.push(slug)
  }
  return { source: nav.source, slugs, complete: settled.navigation }
}

export interface CollectOptions {
  items: DocItem[]
  baseUrl?: string
  outsideLinks: 'site' | 'text'
  /** The document's language, for the sentences that replace forms, frames and media. */
  language: string
  signal?: AbortSignal
  onPage?: (done: number, total: number, slug: string) => void
}

export interface CollectedPage extends ExtractedPage {
  level: number
}

/** Every page item, loaded and extracted in order. Stops at the first page that has no article. */
export async function collectPages(win: ExportWindow, origin: string, opts: CollectOptions): Promise<CollectedPage[]> {
  const pages = opts.items.filter((i): i is Extract<DocItem, { kind: 'page' }> => i.kind === 'page')
  const inBook = pages.map((p) => p.slug)
  const t = (key: Parameters<typeof mainTIn>[1]): string => mainTIn(opts.language, key)
  const texts = {
    form: t('docForm'),
    frame: t('docFrame'),
    media: t('docMedia'),
    canvas: t('docCanvas'),
    noUrl: { form: t('docFormNoUrl'), frame: t('docFrameNoUrl'), media: t('docMediaNoUrl'), canvas: t('docCanvasNoUrl') }
  }
  const out: CollectedPage[] = []
  for (const [i, page] of pages.entries()) {
    opts.signal?.throwIfAborted()
    opts.onPage?.(i, pages.length, page.slug)
    try {
      await win.load(`${origin}/${page.slug}`)
    } catch (err) {
      throw new Error(mainT('exportPageFailed', { slug: page.slug, reason: (err as Error).message }))
    }
    await win.run(settlePage, [{ navigation: false, timeoutMs: SETTLE_MS }])
    let extracted: ExtractedPage
    try {
      extracted = await win.run(
        extractArticle,
        [
          {
            slug: page.slug,
            level: page.level,
            signpost: page.level === 1 && (page.slug === 'index' || page.slug.endsWith('/index')),
            inBook,
            outsideLinks: opts.outsideLinks,
            baseUrl: opts.baseUrl,
            texts
          }
        ],
        [slugFromPathname, anchorFor, outsideUrl]
      )
    } catch (err) {
      if (/no <article>/.test(String(err))) throw new Error(mainT('exportNoArticle', { slug: page.slug }))
      throw err
    }
    out.push({ ...extracted, level: page.level })
  }
  opts.onPage?.(pages.length, pages.length, '')
  return out
}
