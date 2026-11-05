import { readFile } from 'fs/promises'
import { extname, isAbsolute, join, relative } from 'path'
import { anchorFor, type DocItem } from '@shared/exportModel'
import { mainT, mainTIn } from '../../i18n'
import { createZip, type ZipEntry } from '../zipArchive'
import type { CollectedPage } from './collect'
import { headingAnchor } from './documentHtml'
import { openExportWindow, type ExportWindow } from './exportWindow'
import { epubChapters, type Drawing, type EpubChapterInput } from './pageScripts'
import type { SiteServer } from './siteServer'

/**
 * The ePub 3 writer: one XHTML file per page (pageScripts.epubChapters does the HTML → XHTML step
 * in the export window), a navigation document from the book's order, the site's own pictures, a
 * stylesheet of its own - the website's CSS (grid layout, sticky columns, CSS variables of the
 * theme) is made for a browser window, and e-readers override most of it anyway - and the
 * package document with accessibility metadata. Zipped with the app's own writer, `mimetype` first
 * and stored.
 */

export interface EpubParts {
  lang: string
  title: string
  subtitle: string
  author: string
  /** A stable `urn:uuid:` for this book, so a reader recognises a new edition as the same book. */
  identifier: string
  modified: Date
  /** The cover picture as bytes (the book's own or the project picture), or none. */
  cover: { data: Buffer; type: string } | null
  /** The site's stylesheets, to draw formulas with KaTeX's own CSS and fonts and diagrams in the site's fonts. */
  stylesheets: string[]
  items: DocItem[]
  pages: CollectedPage[]
}

export interface EpubResult {
  bytes: Buffer
  chapters: number
  images: number
  counts: { externalImages: number; unsupportedImages: number; unresolvedLinks: number; footnotes: number; formulas: number; diagrams: number }
}

/** EPUB 3.3 core media types for pictures. An AVIF or a BMP of the site has no place in an ePub. */
const IMAGE_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
}

/**
 * The reader stylesheet, also the offline HTML's (writeHtml.ts). No background that assumes a light
 * page: a reader's dark theme changes the text colour but not every background. Calibre 9.17 kept
 * the callouts' #f5f5f5 and set their text light grey on it, barely readable (2026-11-05); a
 * translucent grey works on either.
 */
export const STYLE = `
body { margin: 0 4%; line-height: 1.5; }
h1, h2, h3, h4, h5, h6 { line-height: 1.25; page-break-after: avoid; break-after: avoid; }
h1 { font-size: 1.6em; margin: 0 0 0.8em; }
h2 { font-size: 1.35em; margin: 1.4em 0 0.6em; }
h3 { font-size: 1.15em; margin: 1.2em 0 0.5em; }
img, svg { max-width: 100%; height: auto; }
figure { margin: 1em 0; }
figure.qc-diagram { text-align: center; }
img.qc-diagram-picture { background: #fff; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 0.85em; padding: 0.6em; border: 1px solid #ddd; border-radius: 4px; }
code { font-family: monospace; font-size: 0.92em; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
th, td { border: 1px solid #ccc; padding: 0.3em 0.5em; text-align: left; vertical-align: top; }
blockquote { margin: 1em 0; padding: 0.2em 1em; border-left: 3px solid #999; }
blockquote.callout { border-left-width: 4px; background: rgba(128, 128, 128, 0.12); }
.callout-title { font-weight: bold; }
.callout-icon, .callout-fold { display: none; }
.qc-replaced { font-style: italic; }
.qc-backlinks { margin-top: 1.5em; padding-top: 0.5em; border-top: 1px solid #ccc; font-size: 0.9em; }
.qc-backlinks-title { font-weight: bold; margin: 0 0 0.3em; }
.qc-backlinks-title, .qc-register dt, .index-heading { page-break-after: avoid; break-after: avoid; }
.qc-register dt { font-weight: bold; margin-top: 0.6em; }
.qc-register dd { margin-left: 1.2em; }
.qc-register-entry { display: block; }
.index-heading { font-weight: bold; margin-top: 1.2em; }
math[display="block"] { display: block; margin: 0.8em auto; }
.qc-formula-block { text-align: center; margin: 0.8em 0; }
aside.footnote, section.footnotes aside { font-size: 0.9em; margin: 0.4em 0; }
nav ol { list-style: none; padding-left: 1.2em; }
.cover { text-align: center; margin-top: 20%; }
.cover img { max-width: 40%; }
.cover .title { font-size: 2em; font-weight: bold; margin: 0.6em 0 0.2em; }
.cover .subtitle { font-size: 1.2em; }
`

export function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function xhtml(lang: string, title: string, body: string, extraHead = ''): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${esc(lang)}" lang="${esc(lang)}">
<head><meta charset="UTF-8"/><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="../style.css"/>${extraHead}</head>
<body>${body}</body>
</html>
`
}

/** `2026-11-05T21:04:00Z` - the one form `dcterms:modified` accepts. */
function epubDate(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/** The navigation list, nested by level: a level deeper opens a list inside the previous item. */
export function navList(entries: { href: string; title: string; level: number }[]): string {
  let out = ''
  const stack: number[] = []
  for (const e of entries) {
    if (stack.length === 0) {
      out += '<ol>'
      stack.push(e.level)
    } else if (e.level > stack[stack.length - 1]) {
      out += '<ol>'
      stack.push(e.level)
    } else {
      out += '</li>'
      while (stack.length > 1 && e.level < stack[stack.length - 1]) {
        out += '</ol></li>'
        stack.pop()
      }
    }
    out += `<li><a href="${esc(e.href)}">${esc(e.title)}</a>`
  }
  while (stack.length) {
    out += '</li></ol>'
    stack.pop()
  }
  return out
}

/** A picture of the build, read from the served copy by its address. */
async function readSiteFile(server: SiteServer, url: string): Promise<Buffer | null> {
  let pathname: string
  try {
    pathname = decodeURIComponent(new URL(url).pathname)
  } catch {
    return null
  }
  const file = join(server.root, pathname)
  const rel = relative(server.root, file)
  if (rel.startsWith('..') || isAbsolute(rel)) return null
  try {
    return await readFile(file)
  } catch {
    return null
  }
}

/** How much larger than CSS pixels a picture is drawn: sharp on paper-like screens. */
const ZOOM: Record<Drawing['kind'], number> = { formula: 3, diagram: 2 }
/** The window the pictures are drawn in; what lies outside it is not captured. */
const DRAW_W = 3000
const DRAW_H = 3000
/** The reader's base size the em sizes below are relative to. */
const BASE_PX = 16

/**
 * Draws every formula and diagram as a PNG and returns, per picture, its bytes and the CSS that
 * gives it the size it had on the website in em - so it grows with the reader's font size instead
 * of staying in pixels. A diagram is drawn at the width Mermaid gave it (its max-width, else its
 * viewBox), not at a column's; a wide one is drawn at a smaller zoom rather than cut off.
 *
 * Drawn in a window of its own that renders offscreen, not in the export window. Measured on
 * Debian 13 aarch64 (GNOME on Wayland, 2026-11-05): in a hidden window requestAnimationFrame never
 * fires and capturePage never returns - the export of Example stood still at its first formula
 * until it was killed. On macOS both work in a hidden window. An offscreen window paints on every
 * system, so the two animation frames below arrive and the capture is the frame just painted
 * (checked on both: a probe that alternated "A" and ten "W" got the width of each).
 * Its refused requests are added to the export window's.
 */
async function drawPictures(
  win: ExportWindow,
  server: SiteServer,
  stylesheets: string[],
  drawings: Drawing[],
  signal?: AbortSignal
): Promise<Map<string, { data: Buffer; style: string }>> {
  const head = stylesheets.map((h) => `<link rel="stylesheet" href="${esc(h)}">`).join('')
  const drawWin = openExportWindow(server.origin, { width: DRAW_W, height: DRAW_H }, { offscreen: true })
  // Created at the size of the screen on Linux (1280 x 800 on the VM, the pictures came out cut
  // off at that edge); set afterwards, the size holds, and capturePage takes all of it.
  drawWin.win.setContentSize(DRAW_W, DRAW_H)
  try {
    return await drawIn(drawWin, server, head, drawings, signal)
  } finally {
    for (const [key, n] of drawWin.refused) win.refused.set(key, (win.refused.get(key) ?? 0) + n)
    drawWin.close()
  }
}

async function drawIn(
  win: ExportWindow,
  server: SiteServer,
  head: string,
  drawings: Drawing[],
  signal?: AbortSignal
): Promise<Map<string, { data: Buffer; style: string }>> {
  await win.load(
    server.setDocument(
      'drawing.html',
      `<!doctype html><html saved-theme="light"><head><meta charset="utf-8">${head}<style>html,body{margin:0!important;padding:0!important;background:#fff!important}#f{display:inline-block;padding:1px 2px;background:#fff}#f .katex-display{margin:0!important}#f.diagram{display:block;width:max-content;padding:4px}#f.diagram>svg{display:block;max-width:none!important;height:auto}</style></head><body><div id="f"></div></body></html>`
    )
  )
  const wc = win.win.webContents
  // The size the window really has, not the one asked for: the zoom and the check below go by it.
  const [maxW, maxH] = win.win.getContentSize()
  const out = new Map<string, { data: Buffer; style: string }>()
  // capturePage takes the last frame painted. Without waiting for two animation frames it was
  // still the previous formula: the wide polynomial of Example came out as the matrix before it.
  const measure = (): Promise<{ x: number; y: number; width: number; height: number }> =>
    win.run(
      () =>
        document.fonts.ready
          .then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
          .then(() => {
            const r = document.getElementById('f')!.getBoundingClientRect()
            return { x: r.x, y: r.y, width: r.width, height: r.height }
          }),
      []
    )
  try {
    for (const d of drawings) {
      signal?.throwIfAborted()
      await win.run(
        (html: string, diagram: boolean) => {
          const box = document.getElementById('f')!
          box.className = diagram ? 'diagram' : ''
          box.innerHTML = html
          const svg = diagram ? box.querySelector('svg') : null
          if (svg) {
            const max = parseFloat(svg.style.maxWidth)
            const width = Number.isFinite(max) && max > 0 ? max : svg.viewBox.baseVal?.width || svg.getBoundingClientRect().width
            svg.style.width = `${width}px`
          }
        },
        [d.html, d.kind === 'diagram']
      )
      // Layout is in CSS pixels whatever the zoom, so one measurement says which zoom still fits.
      wc.setZoomFactor(1)
      const plain = await measure()
      const zoom = Math.min(ZOOM[d.kind], maxW / (plain.x + plain.width), maxH / (plain.y + plain.height))
      wc.setZoomFactor(zoom)
      // getBoundingClientRect answers in CSS pixels of the zoomed page; capturePage wants the
      // window's own units, which are those times the zoom.
      const rect = await measure()
      const box = {
        x: Math.floor(rect.x * zoom),
        y: Math.floor(rect.y * zoom),
        width: Math.ceil(rect.width * zoom),
        height: Math.ceil(rect.height * zoom)
      }
      let image = await wc.capturePage(box)
      // capturePage answers in device pixels: on a Retina screen twice the zoom, offscreen as well
      // (the journey diagram of Example came out 6000 pixels wide). Every picture gets the zoom it
      // asked for.
      if (image.getSize().width > box.width) image = image.resize({ width: box.width, quality: 'best' })
      if (image.isEmpty() || rect.width === 0 || box.x + box.width > maxW + 1 || box.y + box.height > maxH + 1) {
        throw new Error(mainT(d.kind === 'formula' ? 'exportFormulaNotDrawn' : 'exportDiagramNotDrawn'))
      }
      const em = (px: number): string => `${(px / BASE_PX).toFixed(3)}em`
      out.set(d.name, {
        data: image.toPNG(),
        style: d.display ? `width:${em(rect.width)};max-width:100%` : `height:${em(rect.height)};vertical-align:middle`
      })
    }
  } finally {
    wc.setZoomFactor(1)
  }
  return out
}

/**
 * The book's content in the form a reader takes, shared by the ePub and the offline HTML: chapters
 * as XHTML bodies, the navigation, and every picture (the site's own, the formulas and diagrams, the cover) as
 * bytes under the name the chapters use. The offline HTML is made from this rather than from the
 * print document because this is the form epubcheck has passed: no site stylesheet, no script, no
 * KaTeX HTML that needs fonts from a CDN.
 */
export interface BookContent {
  chapters: { file: string; title: string; body: string; hasMath: boolean; hasSvg: boolean }[]
  nav: { href: string; title: string; level: number }[]
  /** `images/…` → bytes and media type. */
  assets: Map<string, { data: Buffer; type: string }>
  cover: { name: string; data: Buffer; type: string } | null
  /** How many of `assets` are drawn formulas and diagrams, not pictures of the site. */
  drawings: { formulas: number; diagrams: number }
  counts: EpubResult['counts']
}

export async function prepareBookContent(win: ExportWindow, server: SiteServer, parts: EpubParts, signal?: AbortSignal): Promise<BookContent> {
  const byslug = new Map(parts.pages.map((p) => [p.slug, p]))
  const inputs: EpubChapterInput[] = []
  const nav: BookContent['nav'] = []
  parts.items.forEach((item, index) => {
    const file = `text/c${String(inputs.length + 1).padStart(4, '0')}.xhtml`
    if (item.kind === 'heading') {
      const anchor = headingAnchor(index)
      inputs.push({ file, anchor, level: 1, title: item.text, html: '' })
      nav.push({ href: `${file}#${anchor}`, title: item.text, level: 1 })
      return
    }
    const page = byslug.get(item.slug)
    if (!page) return
    const anchor = anchorFor(page.slug)
    inputs.push({ file, slug: page.slug, anchor, level: page.level, title: page.title, html: page.html })
    nav.push({ href: `${file}#${anchor}`, title: page.title, level: page.level })
  })

  // A page of the site's own, so that relative addresses in the chapters resolve against it.
  await win.load(server.setDocument('epub.html', '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>'))
  signal?.throwIfAborted()
  const result = await win.run(epubChapters, [
    { chapters: inputs, imageNames: {}, imageExtensions: Object.keys(IMAGE_TYPES).map((e) => e.slice(1)), formulaAlt: mainTIn(parts.lang, 'docFormulaAlt'), diagramAlt: mainTIn(parts.lang, 'docDiagramAlt') }
  ])
  const broken = result.chapters.filter((c) => c.parseError)
  if (broken.length) {
    throw new Error(mainT('exportEpubNotWellFormed', { files: broken.map((c) => `${c.file}: ${c.parseError}`).slice(0, 5).join('\n') }))
  }

  const assets: BookContent['assets'] = new Map()
  const images = new Map<string, string>()
  for (const c of result.chapters) for (const img of c.images) images.set(img.name, img.url)
  for (const [name, url] of images) {
    const type = IMAGE_TYPES[extname(name).toLowerCase()]
    const data = await readSiteFile(server, url)
    // The page showed this picture from the build, so it is in the copy; one that is not means the
    // copy and the pages disagree, and the book would carry a reference to nothing.
    if (!data || !type) throw new Error(mainT('exportEpubImageMissing', { url: new URL(url).pathname }))
    assets.set(name, { data, type })
  }

  if (result.drawings.length) {
    const drawn = await drawPictures(win, server, parts.stylesheets, result.drawings, signal)
    for (const [name, f] of drawn) assets.set(name, { data: f.data, type: 'image/png' })
    for (const c of result.chapters) {
      c.body = c.body.replace(/data-qc-drawing="([^"]+)"/g, (_whole, name: string) => {
        const f = drawn.get(name)
        return f ? `style="${f.style}"` : ''
      })
    }
  }

  const coverExt = parts.cover ? Object.entries(IMAGE_TYPES).find(([, type]) => type === parts.cover!.type)?.[0] : undefined
  const cover: BookContent['cover'] = parts.cover && coverExt ? { name: `images/cover${coverExt}`, data: parts.cover.data, type: parts.cover.type } : null

  return {
    chapters: result.chapters.map((c, i) => ({ file: c.file, title: inputs[i].title, body: c.body, hasMath: c.hasMath, hasSvg: c.hasSvg })),
    nav,
    assets,
    cover,
    drawings: {
      formulas: result.drawings.filter((d) => d.kind === 'formula').length,
      diagrams: result.drawings.filter((d) => d.kind === 'diagram').length
    },
    counts: result.counts
  }
}

export function packEpub(content: BookContent, parts: EpubParts): EpubResult {
  const entries: ZipEntry[] = [
    { name: 'mimetype', data: Buffer.from('application/epub+zip'), store: true },
    {
      name: 'META-INF/container.xml',
      data: Buffer.from(
        '<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>\n'
      )
    },
    { name: 'OEBPS/style.css', data: Buffer.from(STYLE) }
  ]
  const manifest: string[] = ['<item id="style" href="style.css" media-type="text/css"/>']
  const spine: string[] = []

  let n = 0
  for (const [name, asset] of content.assets) {
    entries.push({ name: `OEBPS/${name}`, data: asset.data })
    manifest.push(`<item id="img${++n}" href="${esc(name)}" media-type="${asset.type}"/>`)
  }

  let coverPicture = ''
  if (content.cover) {
    entries.push({ name: `OEBPS/${content.cover.name}`, data: content.cover.data })
    manifest.push(`<item id="cover-image" href="${esc(content.cover.name)}" media-type="${content.cover.type}" properties="cover-image"/>`)
    coverPicture = `<img src="../${esc(content.cover.name)}" alt=""/>`
  }
  const coverBody = `<section class="cover" epub:type="cover">${coverPicture}<p class="title">${esc(parts.title)}</p>${parts.subtitle ? `<p class="subtitle">${esc(parts.subtitle)}</p>` : ''}${parts.author ? `<p class="author">${esc(parts.author)}</p>` : ''}</section>`
  entries.push({ name: 'OEBPS/text/cover.xhtml', data: Buffer.from(xhtml(parts.lang, parts.title, coverBody)) })
  manifest.push('<item id="cover" href="text/cover.xhtml" media-type="application/xhtml+xml"/>')
  spine.push('<itemref idref="cover"/>')

  const contents = mainTIn(parts.lang, 'docContents')
  const nav = `<nav epub:type="toc" id="toc"><h1>${esc(contents)}</h1>${navList(content.nav.map((e) => ({ ...e, href: e.href.replace(/^text\//, '') })))}</nav>`
  entries.push({ name: 'OEBPS/text/nav.xhtml', data: Buffer.from(xhtml(parts.lang, contents, nav)) })
  manifest.push('<item id="nav" href="text/nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>')
  spine.push('<itemref idref="nav"/>')

  content.chapters.forEach((c, i) => {
    const id = `c${i + 1}`
    entries.push({ name: `OEBPS/${c.file}`, data: Buffer.from(xhtml(parts.lang, c.title, c.body)) })
    const props = [c.hasMath ? 'mathml' : '', c.hasSvg ? 'svg' : ''].filter(Boolean).join(' ')
    manifest.push(`<item id="${id}" href="${c.file}" media-type="application/xhtml+xml"${props ? ` properties="${props}"` : ''}/>`)
    spine.push(`<itemref idref="${id}"/>`)
  })

  const hasMath = content.chapters.some((c) => c.hasMath)
  const visual = content.assets.size > 0 || content.chapters.some((c) => c.hasSvg)
  const features = ['structuralNavigation', 'tableOfContents', 'readingOrder', ...(hasMath ? ['MathML'] : [])]
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${esc(parts.lang)}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="book-id">${esc(parts.identifier)}</dc:identifier>
<dc:title>${esc(parts.title)}</dc:title>
<dc:language>${esc(parts.lang)}</dc:language>
${parts.author ? `<dc:creator>${esc(parts.author)}</dc:creator>` : ''}
${parts.subtitle ? `<dc:description>${esc(parts.subtitle)}</dc:description>` : ''}
<dc:date>${epubDate(parts.modified).slice(0, 10)}</dc:date>
<meta property="dcterms:modified">${epubDate(parts.modified)}</meta>
<meta property="schema:accessMode">textual</meta>
${visual ? '<meta property="schema:accessMode">visual</meta>' : ''}
<meta property="schema:accessModeSufficient">${visual ? 'textual,visual' : 'textual'}</meta>
${features.map((f) => `<meta property="schema:accessibilityFeature">${f}</meta>`).join('\n')}
<meta property="schema:accessibilityHazard">unknown</meta>
<meta property="schema:accessibilitySummary">${esc(mainTIn(parts.lang, 'docAccessibilitySummary'))}</meta>
<meta name="generator" content="QuartzControl"/>
</metadata>
<manifest>
${manifest.join('\n')}
</manifest>
<spine>
${spine.join('\n')}
</spine>
</package>
`
  entries.push({ name: 'OEBPS/content.opf', data: Buffer.from(opf) })
  return {
    bytes: createZip(entries, parts.modified),
    chapters: content.chapters.length,
    images: content.assets.size - content.drawings.formulas - content.drawings.diagrams,
    counts: content.counts
  }
}

export async function writeEpub(win: ExportWindow, server: SiteServer, parts: EpubParts, signal?: AbortSignal): Promise<EpubResult> {
  return packEpub(await prepareBookContent(win, server, parts, signal), parts)
}
