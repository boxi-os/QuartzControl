import { mainT, mainTIn } from '../../i18n'
import { esc, navList, STYLE, type BookContent, type EpubParts } from './writeEpub'

/**
 * The offline HTML: the whole book in one file that opens in any browser without a network - the
 * ePub's content (writeEpub.prepareBookContent) with every picture as a `data:` URI, the
 * navigation at the top, and links between chapters turned into links within the page. No script,
 * nothing fetched from anywhere.
 *
 * A data URI costs a third more than the file. The file is refused above MAX_BYTES, measured
 * before anything is encoded, rather than written at a size no browser opens comfortably.
 */

export const HTML_MAX_BYTES = 200 * 1024 * 1024

export interface HtmlResult {
  bytes: Buffer
  chapters: number
  pictures: number
}

const SCREEN = `
body { max-width: 46em; margin: 0 auto; padding: 1.5em 1.2em 4em; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #1f1f1f; background: #fff; }
a { color: #1a5fb4; }
.qc-chapter { border-top: 1px solid #ddd; margin-top: 2.5em; padding-top: 1em; }
.cover { margin-top: 3em; }
.cover img { width: 6em; max-width: 30%; }
nav#toc { margin: 2em 0; }
@media (prefers-color-scheme: dark) {
  body { color: #e6e6e6; background: #1c1c1c; }
  a { color: #8ab4f8; }
  blockquote.callout { background: #262626; }
  pre { border-color: #444; }
  th, td { border-color: #444; }
  .qc-chapter { border-color: #333; }
  img.qc-formula, img.qc-diagram-picture, figure.qc-diagram svg { background: #fff; border-radius: 3px; }
}
`

function dataUri(type: string, data: Buffer): string {
  return `data:${type};base64,${data.toString('base64')}`
}

export function packHtml(content: BookContent, parts: EpubParts): HtmlResult {
  const raw = [...content.assets.values()].reduce((n, a) => n + a.data.length, 0) + (content.cover?.data.length ?? 0)
  const estimate = Math.ceil(raw * 4 / 3) + content.chapters.reduce((n, c) => n + c.body.length, 0)
  if (estimate > HTML_MAX_BYTES) {
    throw new Error(mainT('exportHtmlTooLarge', { mb: Math.round(estimate / 1024 / 1024), max: Math.round(HTML_MAX_BYTES / 1024 / 1024) }))
  }
  const uris = new Map([...content.assets].map(([name, a]) => [name, dataUri(a.type, a.data)]))
  // `../images/x.png` (relative to a chapter file) becomes the picture itself; `c0012.xhtml#id`
  // becomes `#id` - ids are unique across the book (anchorFor), so one page can hold them all.
  const body = (c: BookContent['chapters'][number]): string =>
    c.body
      .replace(/src="\.\.\/(images\/[^"]+)"/g, (whole, name: string) => (uris.has(name) ? `src="${uris.get(name)}"` : whole))
      .replace(/href="c\d{4}\.xhtml#/g, 'href="#')
      .replace(/ xmlns="http:\/\/www\.w3\.org\/1999\/xhtml"/g, '')
      .replace(/ epub:type="[^"]*"/g, '')
  const cover = content.cover ? `<img src="${dataUri(content.cover.type, content.cover.data)}" alt="" />` : ''
  const nav = navList(content.nav.map((e) => ({ ...e, href: '#' + e.href.split('#')[1] })))
  const html = `<!doctype html>
<html lang="${esc(parts.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="QuartzControl">
${parts.author ? `<meta name="author" content="${esc(parts.author)}">` : ''}
<title>${esc(parts.title)}</title>
<style>${STYLE}${SCREEN}</style>
</head>
<body>
<header class="cover">${cover}<p class="title">${esc(parts.title)}</p>${parts.subtitle ? `<p class="subtitle">${esc(parts.subtitle)}</p>` : ''}${parts.author ? `<p class="author">${esc(parts.author)}</p>` : ''}</header>
<nav id="toc" aria-label="${esc(mainTIn(parts.lang, 'docContents'))}"><h2>${esc(mainTIn(parts.lang, 'docContents'))}</h2>${nav}</nav>
<main>
${content.chapters.map((c) => `<section class="qc-chapter">${body(c)}</section>`).join('\n')}
</main>
</body>
</html>
`
  return { bytes: Buffer.from(html), chapters: content.chapters.length, pictures: uris.size }
}
