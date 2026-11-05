import type { BookPageSize } from '@shared/ipc-contract'
import { anchorFor, type DocItem } from '@shared/exportModel'
import type { CollectedPage } from './collect'
import { mainTIn } from '../../i18n'

/**
 * The one HTML document every page of a book is set into, for printing (and later for the
 * offline HTML). The site's own stylesheets come along, so callouts, code and tables look as they
 * do on the website; on top of them the print rules below, generalised from the handbook script's
 * PRINT_CSS (scripts/build-handbook-pdf.mjs), whose comments say what each one fixed.
 */

/** Paper sizes in millimetres, portrait. */
export const PAGE_MM: Record<BookPageSize, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  Letter: { w: 215.9, h: 279.4 }
}

/** The margins of the handbook script, kept: they are what its 129 pages were measured with. */
export const MARGIN_MM = { top: 20, bottom: 20, left: 18, right: 18 }

export function printWidthPx(size: BookPageSize, landscape: boolean): number {
  const paper = PAGE_MM[size]
  const width = landscape ? paper.h : paper.w
  return Math.round(((width - MARGIN_MM.left - MARGIN_MM.right) / 25.4) * 96)
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** A string for a CSS `content:` value. */
function cssString(text: string): string {
  return '"' + text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\n\r]/g, ' ') + '"'
}

export interface DocumentParts {
  lang: string
  title: string
  subtitle: string
  author: string
  /** A line under the author: date and the like. */
  meta: string
  coverImage: string | null
  stylesheets: string[]
  items: DocItem[]
  pages: CollectedPage[]
  /** A table of contents after the cover, titled in the document's language. */
  toc: boolean
  pageSize: BookPageSize
  landscape: boolean
}

/** The id an interposed heading gets, so the table of contents can point at it. */
export function headingAnchor(index: number): string {
  return `h-${index}`
}

/** The placeholder a page number stands on until the second pass knows it. Fixed width, so the
 *  real numbers do not move a single line. */
export const PAGE_PLACEHOLDER = '000'

export function printCss(parts: Pick<DocumentParts, 'pageSize' | 'landscape' | 'title'>): string {
  const paper = PAGE_MM[parts.pageSize]
  const [w, h] = parts.landscape ? [paper.h, paper.w] : [paper.w, paper.h]
  return `
@page {
  size: ${w}mm ${h}mm;
  margin: ${MARGIN_MM.top}mm ${MARGIN_MM.right}mm ${MARGIN_MM.bottom}mm ${MARGIN_MM.left}mm;
  @bottom-left { content: ${cssString(parts.title)}; font: 8pt -apple-system, Helvetica, Arial, sans-serif; color: #777; }
  @bottom-right { content: counter(page) " / " counter(pages); font: 8pt -apple-system, Helvetica, Arial, sans-serif; color: #777; }
}
@page :first { @bottom-left { content: none; } @bottom-right { content: none; } }
html, body.pdf { height: auto !important; overflow: visible !important; background: #fff !important; }
body.pdf { display: block !important; margin: 0 !important; padding: 0 !important; max-width: none !important; font-size: 10.5pt; line-height: 1.5; }
body.pdf .doc-page, body.pdf .doc-part { display: block; max-width: none; }
body.pdf h1.page-title, body.pdf .doc-page[data-level="2"] > h2.page-title, body.pdf .qc-toc { break-before: page; }
body.pdf h1.page-title { font-size: 24pt; margin: 0 0 0.6em; }
body.pdf h2.page-title { font-size: 17pt; margin: 0 0 0.6em; }
body.pdf h3 { font-size: 13pt; margin-top: 1.3em; }
body.pdf h4 { font-size: 11.5pt; margin-top: 1.1em; }
body.pdf h1, body.pdf h2, body.pdf h3, body.pdf h4, body.pdf .index-heading { break-after: avoid; }
body.pdf .index-heading { font-size: 13pt; font-weight: 600; margin: 1.3em 0 0.5em; }
body.pdf img { max-width: 100% !important; height: auto !important; break-inside: avoid; }
body.pdf p:has(> img), body.pdf blockquote.callout, body.pdf pre, body.pdf tr, body.pdf figure { break-inside: avoid; }
body.pdf a { text-decoration: none; }
/* In der Website rollt der Tabellen-Container; auf Papier wird umbrochen. Der Außenabstand kommt
   aus der Vorlage und schob jede Tabelle um 16 px über den Rand. */
body.pdf .table-container { overflow: visible !important; }
body.pdf table { width: 100% !important; max-width: 100% !important; margin-left: 0 !important; margin-right: 0 !important; table-layout: auto; }
body.pdf td, body.pdf th { overflow-wrap: anywhere; }
body.pdf td code, body.pdf th code { white-space: normal !important; overflow-wrap: anywhere; }
/* Die Diagramme aus Rahmenzeichen passen erst in 8,5 pt in die Druckbreite */
body.pdf pre, body.pdf pre code { font-size: 8.5pt !important; max-width: 100% !important; }
body.pdf pre code, body.pdf pre code * { white-space: pre-wrap !important; overflow-wrap: anywhere; }
/* Example's template sets code blocks to a grid with min-width: max-content (for horizontal
   scrolling on the website), and then no line wraps: five blocks stood 7-75 px past the edge. */
body.pdf pre code { display: block !important; min-width: 0 !important; width: auto !important; }
body.pdf pre code > [data-line] { display: block !important; min-width: 0 !important; }
body.pdf .qc-diagram { margin: 1em 0; text-align: center; }
/* A Mermaid diagram brings its natural width as an inline max-width and width="100%"; forcing
   max-width here stretched every small diagram to the full line. Only one without its own limit
   is held to the line. */
body.pdf .qc-diagram svg { height: auto; }
body.pdf .qc-diagram svg:not([style*="max-width"]) { max-width: 100%; }
body.pdf .qc-replaced { font-style: italic; color: #555; }
body.pdf .qc-unlinked { color: inherit; }
.cover { height: 230mm; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; }
.cover img { width: 28mm; height: 28mm; object-fit: contain; margin-bottom: 10mm; }
.cover p { margin: 0; }
.cover-title { font-size: 34pt; font-weight: 700; line-height: 1.1; margin: 0 0 4mm !important; }
.cover-subtitle { font-size: 15pt; color: #444; margin-bottom: 8mm !important; }
.cover-meta { font-size: 11pt; color: #555; }
.qc-toc-title { font-size: 24pt; font-weight: 700; margin: 0 0 0.8em; }
.qc-toc ol { list-style: none; margin: 0; padding: 0; }
.qc-toc li { margin: 0.15em 0; }
.qc-toc li.lvl-1 { font-weight: 600; margin-top: 0.7em; }
.qc-toc li.lvl-2 { padding-left: 1.2em; }
.qc-toc a { display: flex; align-items: baseline; gap: 0.4em; color: inherit; }
.qc-toc .t { flex: 1 1 auto; }
.qc-toc .n { flex: 0 0 auto; min-width: 3ch; text-align: right; font-variant-numeric: tabular-nums; }
.qc-backlinks { margin-top: 1.6em; padding-top: 0.6em; border-top: 1px solid #ddd; font-size: 9.5pt; }
.qc-backlinks-title { font-weight: 600; margin: 0 0 0.3em; }
.qc-backlinks ul { margin: 0; padding-left: 1.2em; }
.qc-register dt { font-weight: 600; margin-top: 0.6em; break-after: avoid; }
.qc-register dd { margin: 0 0 0 1.2em; }
.qc-register-entry { display: flex; gap: 0.4em; }
.qc-register-entry a { flex: 1 1 auto; color: inherit; }
.qc-register .n { min-width: 3ch; text-align: right; font-variant-numeric: tabular-nums; }
`
}

/** The table of contents: the interposed headings and the pages of the two top levels, each a link
 *  to its anchor - which is also what makes Chromium write a named destination for it, the
 *  second pass's way to the page number. */
function tocHtml(parts: DocumentParts): string {
  const titles = new Map(parts.pages.map((p) => [p.slug, p.title]))
  const rows: string[] = []
  parts.items.forEach((item, index) => {
    if (item.kind === 'heading') {
      const a = headingAnchor(index)
      rows.push(`<li class="lvl-1"><a href="#${a}"><span class="t">${esc(item.text)}</span><span class="n" data-anchor="${a}">${PAGE_PLACEHOLDER}</span></a></li>`)
    } else if (item.level <= 2) {
      const a = anchorFor(item.slug)
      rows.push(`<li class="lvl-${item.level}"><a href="#${a}"><span class="t">${esc(titles.get(item.slug) ?? item.slug)}</span><span class="n" data-anchor="${a}">${PAGE_PLACEHOLDER}</span></a></li>`)
    }
  })
  return `<nav class="qc-toc"><p class="qc-toc-title">${esc(mainTIn(parts.lang, 'docContents'))}</p><ol>${rows.join('')}</ol></nav>`
}

export function documentHtml(parts: DocumentParts): string {
  const byslug = new Map(parts.pages.map((p) => [p.slug, p]))
  const body = parts.items
    .map((item, index) => {
      if (item.kind === 'heading') return `<h1 class="page-title" id="${headingAnchor(index)}">${esc(item.text)}</h1>`
      const p = byslug.get(item.slug)
      if (!p) return ''
      return `<section class="doc-page" data-level="${p.level}"><h${p.level} class="page-title" id="${anchorFor(p.slug)}">${esc(p.title)}</h${p.level}>${p.html}</section>`
    })
    .join('\n')
  const cover = [
    parts.coverImage ? `<img src="${esc(parts.coverImage)}" alt="">` : '',
    `<p class="cover-title">${esc(parts.title)}</p>`,
    parts.subtitle ? `<p class="cover-subtitle">${esc(parts.subtitle)}</p>` : '',
    `<p class="cover-meta">${esc([parts.author, parts.meta].filter(Boolean).join(' · '))}</p>`
  ].join('')
  return `<!doctype html><html lang="${esc(parts.lang)}" saved-theme="light"><head><meta charset="utf-8">
<title>${esc(parts.title)}</title>
${parts.stylesheets.map((h) => `<link rel="stylesheet" href="${esc(h)}">`).join('\n')}
<style>${printCss(parts)}</style></head><body class="pdf">
<div class="cover">${cover}</div>
${parts.toc ? tocHtml(parts) : ''}
<div class="doc-part">${body}</div>
</body></html>`
}
