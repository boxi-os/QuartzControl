import { PDFArray, PDFDict, PDFDocument, PDFName } from 'pdf-lib'
import { mainT } from '../../i18n'
import type { ExportWindow } from './exportWindow'
import type { SiteServer } from './siteServer'
import { documentHtml, PAGE_MM, printWidthPx, type DocumentParts } from './documentHtml'
import { fillPageNumbers, findDocumentProblems, imagesSettled, type DocumentProblems } from './pageScripts'

/**
 * The PDF writer: sets the book into one document (documentHtml.ts), checks it at print width,
 * and prints it from the export window with Chromium's own outline and tagging - measured on
 * 2026-11-05 to give the handbook the same 129 pages and 10/47/244/4 bookmarks as Chrome did.
 *
 * Page numbers in the table of contents take two passes, because Chromium has no
 * `target-counter()`: the first print writes a named destination for every anchor a link points
 * at (measured: `/Dests` in the catalog, one entry per link target), the page of each is read back
 * with pdf-lib, written into the contents, and the document printed again. The placeholders have
 * the width of the numbers, and the second pass checks that no destination moved; if one did, a
 * third pass corrects it, and the run says how many it took.
 *
 * Metadata Chromium does not write (author, subject, keywords, creator) is set with pdf-lib on the
 * finished bytes.
 */

export interface PdfMeta {
  title: string
  subtitle: string
  author: string
  keywords: string[]
  lang: string
}

export interface PdfResult {
  bytes: Uint8Array
  pages: number
  /** Bookmarks per level, from the PDF itself. */
  outline: number[]
  passes: number
  counted: { links: number; images: number }
}

const MAX_PASSES = 3
const IMAGE_TIMEOUT_MS = 60_000

function destinations(doc: PDFDocument): Map<string, number> {
  const pages = new Map(doc.getPages().map((p, i) => [p.ref.toString(), i + 1]))
  const out = new Map<string, number>()
  const dests = doc.catalog.lookupMaybe(PDFName.of('Dests'), PDFDict)
  if (!dests) return out
  for (const key of dests.keys()) {
    const value = dests.lookup(key)
    const arr = value instanceof PDFArray ? value : value instanceof PDFDict ? value.lookupMaybe(PDFName.of('D'), PDFArray) : undefined
    const ref = arr?.get(0)?.toString()
    const page = ref ? pages.get(ref) : undefined
    // A PDFName prints with its slash; the anchor is the name without it.
    if (page !== undefined) out.set(key.asString().replace(/^\//, ''), page)
  }
  return out
}

export function outlineLevels(doc: PDFDocument): number[] {
  const levels: number[] = []
  const walk = (first: PDFDict | undefined, depth: number): void => {
    for (let node = first; node; node = node.lookupMaybe(PDFName.of('Next'), PDFDict)) {
      levels[depth] = (levels[depth] ?? 0) + 1
      walk(node.lookupMaybe(PDFName.of('First'), PDFDict), depth + 1)
    }
  }
  walk(doc.catalog.lookupMaybe(PDFName.of('Outlines'), PDFDict)?.lookupMaybe(PDFName.of('First'), PDFDict), 0)
  return levels
}

export function problemText(problems: DocumentProblems): string | null {
  const found = (
    [
      ['overflow', problems.overflow],
      ['deadLinks', problems.deadLinks],
      ['brokenImages', problems.brokenImages]
    ] as const
  ).filter(([, list]) => list.length)
  if (!found.length) return null
  const label = { overflow: mainT('exportProblemOverflow'), deadLinks: mainT('exportProblemDeadLinks'), brokenImages: mainT('exportProblemImages') }
  return found.map(([kind, list]) => `${label[kind]} (${list.length}):\n` + list.slice(0, 10).map((l) => `  ${l}`).join('\n')).join('\n')
}

export async function writePdf(win: ExportWindow, server: SiteServer, parts: DocumentParts, meta: PdfMeta, signal?: AbortSignal): Promise<PdfResult> {
  const width = printWidthPx(parts.pageSize, parts.landscape)
  win.win.setContentSize(width, 1000)
  const wc = win.win.webContents
  if (!wc.debugger.isAttached()) wc.debugger.attach('1.3')
  // Measured at print media, as the handbook script did: the site's @media print rules apply, and
  // the widths the check sees are the ones that are printed.
  await wc.debugger.sendCommand('Emulation.setEmulatedMedia', { media: 'print', features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  await win.load(server.setDocument('document.html', documentHtml(parts)))
  const unloaded = await win.run(imagesSettled, [IMAGE_TIMEOUT_MS])
  signal?.throwIfAborted()
  const problems = await win.run(findDocumentProblems, [])
  const text = problemText(problems)
  if (text) throw new Error(mainT('exportProblems', { problems: text }))
  if (unloaded) throw new Error(mainT('exportImagesPending', { count: unloaded }))

  const paper = PAGE_MM[parts.pageSize]
  const print = (): Promise<Buffer> =>
    wc.printToPDF({
      // The @page rule decides size and margins (and carries the footer); these only apply if a
      // site's stylesheet should ever override it with a size of its own.
      preferCSSPageSize: true,
      pageSize: { width: paper.w / 25.4, height: paper.h / 25.4 },
      landscape: parts.landscape,
      printBackground: true,
      generateDocumentOutline: true,
      generateTaggedPDF: true
    })

  let bytes = await print()
  let passes = 1
  if (parts.toc) {
    let numbers = destinations(await PDFDocument.load(bytes, { updateMetadata: false }))
    for (;;) {
      signal?.throwIfAborted()
      await win.run(fillPageNumbers, [Object.fromEntries(numbers)])
      bytes = await print()
      passes++
      const now = destinations(await PDFDocument.load(bytes, { updateMetadata: false }))
      const moved = [...numbers].some(([anchor, page]) => now.get(anchor) !== page)
      numbers = now
      if (!moved || passes >= MAX_PASSES) {
        if (moved) throw new Error(mainT('exportTocUnstable'))
        break
      }
    }
  }

  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  doc.setTitle(meta.title, { showInWindowTitleBar: true })
  if (meta.subtitle) doc.setSubject(meta.subtitle)
  if (meta.author) doc.setAuthor(meta.author)
  if (meta.keywords.length) doc.setKeywords(meta.keywords)
  doc.setCreator('QuartzControl')
  doc.setLanguage(meta.lang)
  const out = await doc.save({ useObjectStreams: false })
  return { bytes: out, pages: doc.getPageCount(), outline: outlineLevels(doc), passes, counted: problems.counted }
}
