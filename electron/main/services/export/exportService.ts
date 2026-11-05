import { createHash } from 'crypto'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { basename, extname, join } from 'path'
import type { BookDefinition, DocumentFormat } from '@shared/ipc-contract'
import { resolveOrder } from '@shared/exportModel'
import { appWindows } from '../../appWindows'
import { mainT } from '../../i18n'
import { readConfig } from '../configService'
import { containedPath } from '../templatePackage/shared'
import { collectPages, effectiveRoot, pagesInLanguage, readNavigationOrder, readSiteFacts } from './collect'
import { openExportWindow, type ExportWindow } from './exportWindow'
import { serveSiteCopy, type SiteServer } from './siteServer'
import { printWidthPx } from './documentHtml'
import { writePdf } from './writePdf'
import { packEpub, prepareBookContent } from './writeEpub'
import { packHtml } from './writeHtml'

/**
 * One document export, start to end: a copy of the build served on 127.0.0.1, the hidden export
 * window, the book's order resolved against the site's own navigation, every page collected, and
 * the chosen writers. Returns the files and a report of what was done - pages, sources, what was
 * replaced, what was not loaded - so the run can say it rather than leave a document that looks
 * finished and is not. Writing the files into a folder is the adapter's (deploy/document.ts).
 *
 * Runs are keyed by target id so `export:cancel` can stop one, and every run stops when the app's
 * last window closes: the export window would otherwise keep the app alive on Linux and Windows,
 * where closing the window quits.
 */

export interface ExportFile {
  name: string
  bytes: Buffer
}

export interface ExportOutcome {
  files: ExportFile[]
  report: string[]
}

const running = new Map<string, AbortController>()

export function cancelExport(targetId: string): boolean {
  const controller = running.get(targetId)
  if (!controller) return false
  controller.abort()
  return true
}

function stopAllWhenAppCloses(): void {
  for (const win of appWindows()) {
    win.once('closed', () => {
      if (appWindows().length === 0) for (const c of running.values()) c.abort()
    })
  }
}

const COVER_TYPES: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' }

/** The cover picture: the book's own (a file in the project), else the build's static/icon.png -
 *  the project picture as the site shows it. */
async function coverPicture(projectPath: string, buildRoot: string, book: BookDefinition): Promise<{ data: Buffer; type: string } | null> {
  const candidates = book.coverImage ? [containedPath(projectPath, book.coverImage)] : [join(buildRoot, 'static', 'icon.png')]
  for (const file of candidates) {
    if (!file || !existsSync(file)) continue
    const type = COVER_TYPES[extname(file).toLowerCase()]
    if (!type) continue
    return { data: await readFile(file), type }
  }
  return null
}

/** A stable `urn:uuid:` per book and site, so a reader takes a new edition for the same book. */
export function bookIdentifier(site: string, bookId: string): string {
  const h = createHash('sha1').update(`quartzcontrol-book\0${site}\0${bookId}`).digest('hex')
  return `urn:uuid:${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`
}

function mb(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1)
}

export async function exportBook(opts: {
  targetId: string
  projectPath: string
  buildDir: string
  book: BookDefinition
  formats: DocumentFormat[]
  onProgress: (done: number, total: number, label: string) => void
}): Promise<ExportOutcome> {
  if (running.has(opts.targetId)) throw new Error(mainT('exportRunning'))
  const controller = new AbortController()
  const signal = controller.signal
  running.set(opts.targetId, controller)
  stopAllWhenAppCloses()
  let server: SiteServer | null = null
  let win: ExportWindow | null = null
  const report: string[] = []
  try {
    const { book } = opts
    const config = await readConfig(opts.projectPath).catch(() => null)
    const baseUrl = config?.configuration?.baseUrl
    server = await serveSiteCopy(opts.buildDir)
    const facts = await readSiteFacts(server.root)
    win = openExportWindow(server.origin, { width: printWidthPx(book.pdf.pageSize, book.pdf.landscape), height: 1000 })
    signal.throwIfAborted()

    const nav = await readNavigationOrder(win, server.origin, facts, book.language)
    const root = effectiveRoot(facts, book.root, book.language)
    const resolved = resolveOrder({ order: book.order, excluded: book.excluded, root }, nav.slugs, pagesInLanguage(facts, book.language))
    const pageItems = resolved.items.filter((i) => i.kind === 'page')
    if (pageItems.length === 0) throw new Error(mainT('exportNoPages'))
    report.push(mainT(`exportReportSource_${nav.source}`, { count: pageItems.length }))
    if (resolved.missing.length) report.push(mainT('exportReportMissing', { count: resolved.missing.length, pages: resolved.missing.slice(0, 5).join(', ') }))
    if (resolved.appended.length) report.push(mainT('exportReportAppended', { count: resolved.appended.length, pages: resolved.appended.slice(0, 5).join(', ') }))

    const pages = await collectPages(win, server.origin, {
      items: resolved.items,
      baseUrl,
      outsideLinks: book.outsideLinks,
      language: book.language || facts.defaultLanguage || config?.configuration?.locale || 'en',
      signal,
      onPage: (done, total, slug) => opts.onProgress(done, total, slug)
    })
    const stylesheets = await win.run(() => [...document.querySelectorAll('head link[rel="stylesheet"]')].map((l) => (l as HTMLLinkElement).href), [])
    const lang = pages[0]?.lang || book.language || 'en'
    const title = book.title || config?.configuration?.pageTitle || basename(opts.projectPath)
    const cover = await coverPicture(opts.projectPath, server.root, book)
    const sum = (k: keyof (typeof pages)[number]['counts']): number => pages.reduce((n, p) => n + p.counts[k], 0)
    const replaced = sum('forms') + sum('frames') + sum('media') + sum('canvases')
    if (replaced) report.push(mainT('exportReportReplaced', { count: replaced }))
    if (sum('outsideLinks')) report.push(mainT('exportReportOutsideLinks', { count: sum('outsideLinks') }))
    if (sum('textLinks')) report.push(mainT('exportReportTextLinks', { count: sum('textLinks') }))
    if (sum('unrenderedDiagrams')) report.push(mainT('exportReportUnrendered', { count: sum('unrenderedDiagrams') }))

    const files: ExportFile[] = []
    const now = new Date()
    const meta = mainT('exportCoverDate', { date: now.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' }) })
    if (opts.formats.includes('pdf')) {
      signal.throwIfAborted()
      opts.onProgress(pages.length, pages.length, 'PDF')
      const pdf = await writePdf(
        win,
        server,
        {
          lang,
          title,
          subtitle: book.subtitle,
          author: book.author,
          meta,
          coverImage: cover ? `data:${cover.type};base64,${cover.data.toString('base64')}` : null,
          stylesheets,
          items: resolved.items,
          pages,
          toc: book.toc,
          pageSize: book.pdf.pageSize,
          landscape: book.pdf.landscape
        },
        { title, subtitle: book.subtitle, author: book.author, keywords: [], lang },
        signal
      )
      files.push({ name: `${book.id}.pdf`, bytes: Buffer.from(pdf.bytes) })
      report.push(mainT('exportReportPdf', { pages: pdf.pages, outline: pdf.outline.join('/'), mb: mb(pdf.bytes.length) }))
    }
    if (opts.formats.includes('epub') || opts.formats.includes('html')) {
      signal.throwIfAborted()
      opts.onProgress(pages.length, pages.length, opts.formats.includes('epub') ? 'ePub' : 'HTML')
      const parts = {
        lang,
        title,
        subtitle: book.subtitle,
        author: book.author,
        identifier: bookIdentifier(baseUrl || opts.projectPath, book.id),
        modified: now,
        cover,
        stylesheets,
        items: resolved.items,
        pages
      }
      const content = await prepareBookContent(win, server, parts, signal)
      if (opts.formats.includes('epub')) {
        const epub = packEpub(content, parts)
        files.push({ name: `${book.id}.epub`, bytes: epub.bytes })
        report.push(mainT('exportReportEpub', { chapters: epub.chapters, images: epub.images, mb: mb(epub.bytes.length) }))
      }
      if (opts.formats.includes('html')) {
        const html = packHtml(content, parts)
        files.push({ name: `${book.id}.html`, bytes: html.bytes })
        report.push(mainT('exportReportHtml', { mb: mb(html.bytes.length) }))
      }
      if (content.formulas) report.push(mainT('exportReportFormulas', { count: content.formulas }))
      if (content.counts.externalImages) report.push(mainT('exportReportExternalImages', { count: content.counts.externalImages }))
      if (content.counts.unsupportedImages) report.push(mainT('exportReportUnsupportedImages', { count: content.counts.unsupportedImages }))
    }
    if (win.fetchedOutside()) report.push(mainT('exportReportNetwork'))
    if (win.refused.size) {
      // Hosts of the web only: an embedded PDF asks for Chromium's own viewer, whose extension id
      // (mhjfbmdg…) is nothing a reader of the report could place.
      const hosts = [...new Set([...win.refused.keys()].map((k) => k.split(' ')[1]))].filter((h) => h.includes('.'))
      report.push(mainT('exportReportRefused', { count: [...win.refused.values()].reduce((a, b) => a + b, 0), hosts: hosts.slice(0, 6).join(', ') }))
    }
    return { files, report }
  } catch (err) {
    if (signal.aborted) throw new Error(mainT('exportCancelled'))
    throw err
  } finally {
    running.delete(opts.targetId)
    win?.close()
    await server?.close().catch(() => undefined)
  }
}
