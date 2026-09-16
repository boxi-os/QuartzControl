// Macht aus dem gebauten Benutzerhandbuch ein PDF mit Lesezeichen - die deutsche Fassung.
//
//   npm run build:handbook-pdf [-- --site <ordner>] [--out <datei.pdf>]
//
// Quelle ist die *gebaute* Website in resources/handbook (also erst `npm run build:handbook`), nicht
// der Vault: Das PDF soll zeigen, was die App mitbringt, mit denselben Callouts, Tabellen und
// Bildern - und eine zweite Markdown-Umsetzung neben Quartz' eigener liefe auseinander. Ziel ist
// standardmäßig release/QuartzControl-Handbuch-<version>.pdf, neben den Paketen.
//
// Der Weg: Jede Seite wird in Chrome geladen, ihr <article> herausgelöst und in ein einziges
// Dokument gesetzt, das Chrome druckt. Die Lesezeichen sind die Überschriften des getaggten PDFs
// (`outline` und `tagged` in page.pdf, seit Playwright 1.42): Kapitel h1, Seite h2, Abschnitte
// darunter. Braucht deshalb Google Chrome (`channel: 'chrome'`), nicht Electron.
//
// Gemessen am 2026-09-16 an 1.0.0-beta.2: 57 Quellseiten → 115 PDF-Seiten (pdfinfo), 10,9 MB,
// getaggt, Lesezeichen 10/48/235 je Ebene. Die 118 hier waren die Zahl der Scratchpad-Fassung, aus
// der das Skript entstand; die drei Seiten weniger kommen daher, dass Tabellen jetzt über einen
// Seitenumbruch laufen dürfen. Wie viele Quellseiten, PDF-Seiten, Verweise und Bilder ein Lauf
// geprüft hat, sagt er selbst - eine Zahl, die nur hier steht, veraltet still. Die PDF-Seitenzahl
// war dabei zuletzt die einzige, die er nicht aussprach, und genau die musste korrigiert werden.
// Drei Dinge, die beim ersten Lauf auffielen und deshalb unten stehen:
//  - Das CSS der Vorlage gibt Tabellen 16 px Außenabstand je Seite; mit `width: 100%` stand jede
//    Tabelle um 16 px über den Druckrand (121 Elemente im ersten Lauf).
//  - Die Zwischenüberschriften der Kapitel-Startseiten („Die Seiten dieses Kapitels") landeten als
//    Lesezeichen zwischen den Seitentiteln. Sie werden deshalb zu Absätzen.
//  - `static/icon.png` der Website ist das Projektbild des Handbuch-Projekts, nicht das App-Symbol.
//
// Bevor gedruckt wird, prüft das Skript, was man einem fertigen PDF nicht mehr ansieht: Elemente
// über dem Druckrand, Verweise ohne Ziel, Bilder, die nicht geladen haben. Ein Befund bricht ab -
// ein PDF mit abgeschnittenen Tabellen sieht fertig aus.
import { chromium } from 'playwright-core'
import * as fs from 'node:fs'
import * as http from 'node:http'
import * as path from 'node:path'
import { HANDBOOK_OUT } from './build-handbook.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const argv = process.argv.slice(2)
const arg = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback)
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version
const SITE = path.resolve(arg('--site', HANDBOOK_OUT))
const OUT = path.resolve(arg('--out', path.join(ROOT, 'release', `QuartzControl-Handbuch-${VERSION}.pdf`)))

// Seiten auf oberster Ebene außer der Startseite, in der Reihenfolge des Anhangs. Eine neue Seite
// dort muss hier eingetragen werden - sonst fehlte sie im PDF, ohne dass es jemand merkt.
const APPENDIX = ['systemvoraussetzungen', 'beziehen-und-aktualisieren', 'aus-dem-quelltext-bauen', 'neu-in-beta-1']

const PRINT_CSS = `
@page { size: A4; }
html, body.pdf { height: auto !important; overflow: visible !important; background: #fff !important; }
body.pdf { display: block !important; margin: 0 !important; padding: 0 !important; max-width: none !important; font-size: 10.5pt; line-height: 1.5; }
body.pdf .doc-page, body.pdf .doc-part { display: block; max-width: none; }
body.pdf h1.page-title, body.pdf .doc-page[data-level="2"] > h2.page-title { break-before: page; }
body.pdf h1.page-title { font-size: 24pt; margin: 0 0 0.6em; }
body.pdf h2.page-title { font-size: 17pt; margin: 0 0 0.6em; }
body.pdf h3 { font-size: 13pt; margin-top: 1.3em; }
body.pdf h4 { font-size: 11.5pt; margin-top: 1.1em; }
body.pdf h1, body.pdf h2, body.pdf h3, body.pdf h4, body.pdf .index-heading { break-after: avoid; }
body.pdf .index-heading { font-size: 13pt; font-weight: 600; margin: 1.3em 0 0.5em; }
body.pdf img { max-width: 100% !important; height: auto !important; break-inside: avoid; }
body.pdf p:has(> img), body.pdf blockquote.callout, body.pdf pre, body.pdf tr { break-inside: avoid; }
body.pdf a { text-decoration: none; }
/* In der Website rollt der Tabellen-Container; auf Papier wird umbrochen. Der Außenabstand kommt
   aus der Vorlage und schob jede Tabelle um 16 px über den Rand. */
body.pdf .table-container { overflow: visible !important; }
body.pdf table { width: 100% !important; max-width: 100% !important; margin-left: 0 !important; margin-right: 0 !important; table-layout: auto; }
body.pdf td, body.pdf th { overflow-wrap: anywhere; }
body.pdf td code, body.pdf th code { white-space: normal !important; overflow-wrap: anywhere; }
/* Die Diagramme aus Rahmenzeichen passen erst in 8,5 pt in die Druckbreite */
body.pdf pre, body.pdf pre code { font-size: 8.5pt !important; }
body.pdf pre code { white-space: pre-wrap !important; overflow-wrap: anywhere; }
.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; }
.cover img { width: 28mm; height: 28mm; margin-bottom: 10mm; }
.cover p { margin: 0; }
.cover-kicker { font-size: 13pt; letter-spacing: 0.12em; text-transform: uppercase; color: #666; }
.cover-title { font-size: 40pt; font-weight: 700; line-height: 1.1; margin: 2mm 0 6mm !important; }
.cover-meta { font-size: 11pt; color: #555; }
`

function outline(site) {
  if (!fs.existsSync(path.join(site, 'index.html'))) {
    throw new Error(`Kein gebautes Handbuch in ${site} — zuerst \`npm run build:handbook\``)
  }
  const numeric = (a, b) => a.localeCompare(b, 'de', { numeric: true })
  const pages = (dir) =>
    fs
      .readdirSync(path.join(site, dir))
      .filter((f) => f.endsWith('.html'))
      .map((f) => f.slice(0, -5))
      .sort((a, b) => (a === 'index' ? -1 : b === 'index' ? 1 : numeric(a, b)))
      .map((f) => `${dir}/${f}`)
  const chapters = fs
    .readdirSync(site, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d+-/.test(e.name))
    .map((e) => e.name)
    .sort(numeric)
  const top = fs.readdirSync(site).filter((f) => f.endsWith('.html') && f !== 'index.html' && f !== '404.html').map((f) => f.slice(0, -5))
  const unknown = top.filter((p) => !APPENDIX.includes(p))
  const gone = APPENDIX.filter((p) => !top.includes(p))
  if (unknown.length || gone.length) {
    throw new Error(
      `Die Seiten auf oberster Ebene passen nicht zu APPENDIX in ${path.relative(ROOT, import.meta.filename)}` +
        (unknown.length ? ` — nicht eingetragen: ${unknown.join(', ')}` : '') +
        (gone.length ? ` — eingetragen, aber nicht gebaut: ${gone.join(', ')}` : '')
    )
  }
  return [
    { kind: 'start', pages: ['index'] },
    ...chapters.map((dir) => ({ kind: 'chapter', pages: pages(dir) })),
    { kind: 'appendix', pages: APPENDIX }
  ]
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json' }

function serve(site) {
  const server = http.createServer((req, res) => {
    const file = path.join(site, decodeURIComponent(new URL(req.url, 'http://x').pathname))
    const rel = path.relative(site, file)
    if (rel.startsWith('..') || path.isAbsolute(rel) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      return res.writeHead(404).end()
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

// Läuft im Browser: holt den Inhalt einer Seite und macht ihn im Gesamtdokument eindeutig.
function extractPage({ slug, titleLevel }) {
  const anchor = (s, h) => 'p-' + s.replace(/[^a-z0-9]+/gi, '-') + (h ? '--' + h : '')
  const title = document.querySelector('h1.article-title')?.textContent.trim() ?? slug
  const art = document.querySelector('article').cloneNode(true)
  art.querySelectorAll('[hidden], a[role="anchor"], .multilanguage-notice, script, style').forEach((e) => e.remove())
  art.querySelectorAll('h1,h2,h3,h4,h5').forEach((h) => {
    // Auf einer Kapitel-Startseite sind Zwischenüberschriften Wegweiser, keine Abschnitte.
    const n = document.createElement(titleLevel === 1 ? 'p' : 'h' + Math.min(6, Number(h.tagName[1]) + titleLevel))
    if (titleLevel === 1) n.className = 'index-heading'
    n.innerHTML = h.innerHTML
    if (h.id) n.id = anchor(slug, h.id)
    h.replaceWith(n)
  })
  art.querySelectorAll('[id]:not(h1,h2,h3,h4,h5,h6)').forEach((e) => (e.id = anchor(slug, e.id)))
  art.querySelectorAll('img').forEach((img) => {
    img.setAttribute('src', img.src)
    img.removeAttribute('srcset')
    img.removeAttribute('loading')
  })
  art.querySelectorAll('a[href]').forEach((a) => {
    const target = a.getAttribute('data-slug')
    if (target) {
      const hash = new URL(a.href).hash.slice(1)
      a.setAttribute('href', '#' + anchor(target, hash ? decodeURIComponent(hash) : ''))
    } else if (a.getAttribute('href').startsWith('#')) {
      a.setAttribute('href', '#' + anchor(slug, a.getAttribute('href').slice(1)))
    } else {
      a.setAttribute('href', a.href)
    }
  })
  return `<section class="doc-page" data-level="${titleLevel}"><h${titleLevel} class="page-title" id="${anchor(slug)}">${title}</h${titleLevel}>${art.innerHTML}</section>`
}

// Läuft im Browser, auf dem fertigen Dokument in Druckbreite.
function findProblems() {
  const width = document.body.clientWidth
  const where = (el) => el.closest('.doc-page')?.querySelector('.page-title')?.textContent ?? '?'
  const overflow = new Set()
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.width && r.right > width + 1 && !el.closest('.cover')) overflow.add(`${where(el)}: <${el.tagName.toLowerCase()}> ${Math.round(r.right - width)} px`)
  }
  const ids = new Set([...document.querySelectorAll('[id]')].map((e) => e.id))
  const deadLinks = [...document.querySelectorAll('a[href^="#"]')].filter((a) => !ids.has(a.getAttribute('href').slice(1))).map((a) => `${where(a)}: ${a.getAttribute('href')}`)
  const brokenImages = [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => `${where(i)}: ${i.getAttribute('src')}`)
  // Gezählt, nicht nur geprüft: Die Zahl der geprüften Verweise und Bilder stand bisher nur im
  // Kopf dieser Datei, und eine Zahl, die kein Lauf ausspricht, ist beim nächsten Lesen eine
  // Erinnerung. Sie gehört nicht in `found` - das sind die Befunde, die abbrechen.
  const counted = { links: document.querySelectorAll('a[href^="#"]').length, images: document.images.length }
  return { problems: { overflow: [...overflow], deadLinks, brokenImages }, counted }
}

// Die Seitenzahl des fertigen PDFs, aus ihm selbst gelesen: gezählt werden die Seitenobjekte
// (`/Type /Page`), die Chromes PDF-Ausgabe unkomprimiert schreibt. Nicht über `/Count`, obwohl das
// näher läge, denn man müsste den *richtigen* Knoten treffen: Chrome baut bei dieser Größe einen
// Seitenbaum aus 18 `/Type /Pages`-Objekten - 14 mit `/Count 8`, eines mit 3, zwei Zwischenknoten
// mit 64 und 51, und der Wurzelknoten, auf den der Katalog mit `/Pages 781 0 R` zeigt, mit 115
// (14 × 8 + 3). Der erste Treffer im Dokument ist also eine 8, und das größte `/Count` (293)
// gehört dem Lesezeichenbaum, nicht den Seiten. Gemessen am ausgelieferten
// `release/QuartzControl-Handbuch-1.0.0-beta.2.pdf`, gegengeprüft mit `pdfinfo`: 115 zu 115, und
// 3 zu 3 an einem dreiseitigen Testdokument. `null` statt einer geratenen Zahl, wenn kein
// Seitenobjekt zu finden ist - eine Zahl, die nicht gemessen ist, gehört nicht in diese Zeile.
function pdfPageCount(file) {
  const found = fs.readFileSync(file).toString('latin1').match(/\/Type\s*\/Page[^s]/g)
  return found ? found.length : null
}

export async function buildHandbookPdf({ site = SITE, out = OUT } = {}) {
  const parts = outline(site)
  const server = await serve(site)
  const origin = `http://127.0.0.1:${server.address().port}`
  let browser
  try {
    browser = await chromium.launch({ channel: 'chrome' }).catch((err) => {
      throw new Error(`Google Chrome ließ sich nicht starten (Playwright, channel "chrome"): ${err.message.split('\n')[0]}`)
    })
    const page = await (await browser.newContext({ colorScheme: 'light' })).newPage()
    let stylesheets = null
    const sections = []
    for (const part of parts) {
      const blocks = part.kind === 'appendix' ? ['<h1 class="page-title" id="p-anhang">Anhang</h1>'] : []
      for (const [i, slug] of part.pages.entries()) {
        const res = await page.goto(`${origin}/${slug}.html`, { waitUntil: 'networkidle' })
        if (res?.status() !== 200) throw new Error(`${slug}.html antwortet mit ${res?.status()}`)
        stylesheets ??= await page.$$eval('head link[rel="stylesheet"]', (ls) => ls.map((l) => l.href))
        // Startseite und Kapitel-Startseiten sind h1, jede andere Seite h2.
        const titleLevel = part.kind !== 'appendix' && i === 0 ? 1 : 2
        blocks.push(await page.evaluate(extractPage, { slug, titleLevel }))
      }
      sections.push(`<div class="doc-part">${blocks.join('\n')}</div>`)
    }

    const icon = fs.readFileSync(path.join(ROOT, 'build/icon.png')).toString('base64')
    const today = new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
    const html = `<!doctype html><html lang="de" saved-theme="light"><head><meta charset="utf-8"><base href="${origin}/">
<title>QuartzControl – Handbuch</title>
${stylesheets.map((h) => `<link rel="stylesheet" href="${h}">`).join('\n')}
<style>${PRINT_CSS}</style></head><body class="pdf">
<div class="cover"><img src="data:image/png;base64,${icon}" alt=""><p class="cover-kicker">Handbuch</p><p class="cover-title">QuartzControl</p><p class="cover-meta">Fassung ${VERSION} · Stand ${today}</p></div>
${sections.join('\n')}
</body></html>`

    // Druckbreite von A4 abzüglich der Ränder unten, bei 96 dpi.
    await page.setViewportSize({ width: Math.round(((210 - 36) / 25.4) * 96), height: 1000 })
    await page.emulateMedia({ media: 'print', colorScheme: 'light' })
    await page.setContent(html, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    const { problems, counted } = await page.evaluate(findProblems)
    const found = Object.entries(problems).filter(([, list]) => list.length)
    if (found.length) {
      throw new Error(
        'Das PDF wäre fehlerhaft:\n' + found.map(([kind, list]) => `  ${kind} (${list.length}):\n` + list.slice(0, 10).map((l) => `    ${l}`).join('\n')).join('\n')
      )
    }

    fs.mkdirSync(path.dirname(out), { recursive: true })
    await page.pdf({
      path: out,
      format: 'A4',
      printBackground: true,
      outline: true,
      tagged: true,
      margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="width:100%;font-size:8px;color:#777;padding:0 18mm;display:flex;justify-content:space-between;font-family:-apple-system,Helvetica,sans-serif">' +
        `<span>QuartzControl – Handbuch ${VERSION}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`
    })
    const sourcePages = parts.reduce((n, p) => n + p.pages.length, 0)
    // Zwei verschiedene Zahlen, und die Zeile sagte bis zu diesem Durchgang nur „Seiten" für die
    // kleinere: 57 Quellseiten werden zu 115 PDF-Seiten. Genau die größere war die Zahl, die das
    // sechzehnte Review im Kopf dieser Datei korrigieren musste — und sie war die einzige, die
    // kein Lauf aussprach.
    console.log(
      `[handbuch-pdf] ${sourcePages} Quellseiten → ${pdfPageCount(out) ?? '?'} PDF-Seiten, ` +
        `${counted.links} interne Verweise mit Ziel, ${counted.images} Bilder, ` +
        `${(fs.statSync(out).size / 1024 / 1024).toFixed(1)} MB → ${path.relative(ROOT, out)}`
    )
    return out
  } finally {
    await browser?.close()
    server.close()
  }
}

if (import.meta.filename === process.argv[1]) {
  try {
    await buildHandbookPdf()
  } catch (err) {
    console.error(`[handbuch-pdf] ${err.message}`)
    process.exit(1)
  }
}
