// Der SVG-Bereiniger (src/utils/inlineSvg.ts) gegen das, was die Website aus seinem Ergebnis macht.
// Er parst die Datei als XML, die Website liest das Ergebnis als HTML (quartz-layout-box über
// dangerouslySetInnerHTML, ein Markdown-Schnipsel über rehype-raw) — also wird hier jedes Ergebnis
// in Chrome als HTML in eine Box gesetzt, wie sie auf der Seite steht, und dort gefragt: steht ein
// Element außerhalb des SVG, ein Ereignis-Attribut, ein Verweis mit Skript-Schema, eine Animation
// auf einen Verweis, ein <style>? Und läuft etwas — beim Laden, und nach einem Klick auf jedes
// Element der Box? Dazu die Fälle, die durchkommen müssen (Klassen, <use href="#…">, viewBox).
// Existiert, weil die erste Fassung eine Sperrliste auf dem anderen Parser war: Eine Processing
// Instruction ließ ohne Klick Skript laufen und meldete „0 entfernt“ (42. Review, Befund 1).
// Ein Markdown-Schnipsel liest erst remark, dann parse5: Text im SVG, das in einem Absatz steht,
// ist für remark Markdown, und `[x](javascript:…)` wurde dort ein Link (43. Review, Befund 1).
// Deshalb geht jedes Ergebnis zusätzlich durch die Kette von quartz-layout-box (src/markdown.ts,
// hier als devDependencies in denselben Bereichen) — als eigener Block, in einer Zeile mit Text
// davor und direkt unter einer Textzeile, wo „Bild einfügen…“ am Cursor einfügt.
// Braucht Google Chrome, weder App noch Projekt.
//
//   npm run check:inline-svg
import { build } from 'esbuild'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeStringify from 'rehype-stringify'

// Wörtlich die Kette aus quartz-layout-box/src/markdown.ts.
const markdown = unified().use(remarkParse).use(remarkGfm).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw).use(rehypeStringify)
const renderMarkdown = (md) => String(markdown.processSync(md))
// Die drei Lagen, in denen ein eingefügtes SVG in einem Schnipsel stehen kann.
const LAGEN = [
  ['HTML', (m) => m],
  ['Markdown, eigener Block', (m) => `Text davor\n\n${m}\n\nText danach\n`],
  ['Markdown, in einer Zeile', (m) => `Text davor ${m} danach\n`],
  ['Markdown, unter einer Textzeile', (m) => `Text davor\n${m}\n`]
]
const lagen = (markup) => LAGEN.map(([name, f]) => [name, name === 'HTML' ? markup : renderMarkdown(f(markup))])

const repo = path.join(import.meta.dirname, '..')
const bundle = await build({
  entryPoints: [path.join(repo, 'src/utils/inlineSvg.ts')],
  bundle: true,
  write: false,
  format: 'iife',
  globalName: 'InlineSvg'
})
const code = bundle.outputFiles[0].text

const X = 'http://www.w3.org/1999/xhtml'
const svg = (inner, attrs = '') => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"${attrs}>${inner}</svg>`
const RUN = 'window.__ran=(window.__ran||0)+1'
// Was nicht durchkommen darf. Jede Zeile ist eine Eingabe, die eine frühere Fassung durchließ
// oder die die Sperrliste nicht nannte.
const boese = [
  ['<script>', svg(`<script>${RUN}</script><path d="M0 0"/>`)],
  ['XHTML-<img onerror>', svg(`<img xmlns="${X}" src="x" onerror="${RUN}"/>`)],
  ['Processing Instruction mit <img onerror>', svg(`<?x ><img src=x onerror="${RUN}">?><path d="M0 0"/>`)],
  ['Tab im Schema', svg(`<a href="java&#9;script:${RUN}"><path d="M0 0h24v24H0z"/></a>`)],
  ['Zeilenumbrüche im Schema', svg(`<a href="&#10;java&#13;script:${RUN}"><path d="M0 0h24v24H0z"/></a>`)],
  ['xlink:href mit javascript:', svg(`<a xlink:href="javascript:${RUN}"><path d="M0 0h24v24H0z"/></a>`)],
  ['<set> auf href', svg(`<a href="#"><set attributeName="href" to="javascript:${RUN}"/><path d="M0 0h24v24H0z"/></a>`)],
  ['<animate> auf HREF', svg(`<a href="#"><animate attributeName="HREF" values="javascript:${RUN}"/><path d="M0 0h24v24H0z"/></a>`)],
  ['<set> auf xlink:href', svg(`<a href="#"><set attributeName="xlink:href" to="javascript:${RUN}"/><path d="M0 0h24v24H0z"/></a>`)],
  ['XHTML-<meta refresh>', svg(`<meta xmlns="${X}" http-equiv="refresh" content="0;url=about:blank"/>`)],
  ['<style> für die ganze Seite', svg('<style>body{display:none}</style><path d="M0 0"/>')],
  ['XHTML-<iframe>', svg(`<iframe xmlns="${X}" src="javascript:${RUN}"/>`)],
  ['<foreignObject>', svg(`<foreignObject><div xmlns="${X}" onclick="${RUN}">x</div></foreignObject>`)],
  // Diese zwei werden nicht entfernt, sondern als Text geschrieben bzw. weggelassen: zu zählen
  // gibt es nichts, auf der Seite darf trotzdem nichts stehen.
  ['CDATA mit Markup', svg(`<text><![CDATA[</text><img src=x onerror="${RUN}">]]></text>`), 0],
  ['Kommentar, den HTML früher beendet', svg(`<!--><img src=x onerror="${RUN}">--><path d="M0 0"/>`), 0],
  ['SVG-<img>, das aus dem SVG ausbricht', svg(`<img src="x" onerror="${RUN}"/>`)],
  ['onload an der Wurzel', svg('<path d="M0 0"/>', ` onload="${RUN}"`)],
  ['data:text/html im Verweis', svg(`<a href="data:text/html,&lt;script>parent.${RUN}&lt;/script>"><path d="M0 0h24v24H0z"/></a>`)],
  ['<use> auf eine fremde Datei', svg('<use href="https://example.com/sprite.svg#a"/>')],
  ['<image> mit SVG-Daten', svg(`<image href="data:image/svg+xml,&lt;svg xmlns='http://www.w3.org/2000/svg' onload='${RUN}'/>"/>`)],
  ['style-Attribut mit fremder url()', svg('<path style="fill:url(https://example.com/x)" d="M0 0"/>')],
  ['Element eines fremden Namensraums', svg('<x:script xmlns:x="http://www.w3.org/2000/svg">' + RUN + '</x:script>')],
  // Für remark ist Text im SVG Markdown, sobald das SVG in einem Absatz steht (43. Review,
  // Befund 1). Zu entfernen gibt es nichts; auf der Seite darf trotzdem kein Link stehen.
  ['Markdown-Link mit javascript: im Text', svg(`<text>[KLICK](javascript:${RUN})</text>`), 0],
  ['Markdown-Link in CDATA', svg(`<text><![CDATA[[KLICK](javascript:${RUN})]]></text>`), 0],
  ['Markdown-Bild mit fremder Adresse im Text', svg('<text>![x](https://example.com/p.png)</text>'), 0],
  ['Autolink im Text', svg(`<text>&lt;javascript:${RUN}&gt; www.example.com a@example.com</text>`), 0],
  ['Zeilenanfang mit Markdown in einem Attribut', svg('<path aria-label="x&#10;# Titel&#10;- Punkt" d="M0 0&#10;- 1 2"/>'), 0],
  ['Zeilenanfang mit Markdown im Text', svg('<text>x\n# Titel\n- Punkt\n1. Eins</text>'), 0],
  ['Markdown-Link über Escapes im Text', svg(`<text>\\[KLICK\\](javascript:${RUN})</text>`), 0]
]

const browser = await chromium.launch({ channel: 'chrome' }).catch((err) => {
  console.error(`Chrome lässt sich nicht starten: ${err.message}`)
  process.exit(2)
})
const page = await browser.newPage()
await page.setContent('<!doctype html><title>t</title>')
await page.addScriptTag({ content: code })
const clean = (text, name = 'test-icon.svg') => page.evaluate(([t, n]) => InlineSvg.inlineSvg(t, n), [text, name])

// Das Ergebnis in eine Seite, wie die Box es rendert, und dort fragen.
const render = async (markup) => {
  const site = await browser.newPage()
  let navigated = false
  site.on('framenavigated', (f) => {
    // Ein Sprung zu „#“ ist keine Navigation weg von der Seite, und einer nach http(s) ist ein Link,
    // den der Bereiniger erlaubt — und den remark-gfm aus einer Adresse im Text macht, auch wenn
    // jedes Zeichen als Referenz dasteht: Es sucht Adressen im schon dekodierten Text.
    if (f === site.mainFrame() && !/^(about:blank|https?:)/.test(f.url().replace(/#.*$/, ''))) navigated = true
  })
  await site.setContent(`<!doctype html><title>s</title><body><div class="layout-box-content">${markup}</div></body>`)
  await site.waitForTimeout(150)
  const befund = await site.evaluate(() => {
    const box = document.querySelector('.layout-box-content')
    const out = []
    const svgNs = 'http://www.w3.org/2000/svg'
    for (const el of box ? box.querySelectorAll('*') : []) {
      // Die Absätze, in die Markdown das SVG setzt, gehören zur Box, nicht zum SVG.
      const absatz = el.localName === 'p' && el.parentElement === box
      if (el.namespaceURI !== svgNs && !absatz) out.push(`<${el.localName}> außerhalb des SVG`)
      if (el.localName === 'style' || el.localName === 'script' || el.localName === 'foreignObject') out.push(`<${el.localName}>`)
      for (const a of el.attributes) {
        if (/^on/i.test(a.localName)) out.push(`${a.name} an <${el.localName}>`)
        if (a.localName === 'href' && !/^#/.test(a.value) && !/^data:image\/(png|jpe?g|gif|webp|avif);/i.test(a.value) && !(el.localName === 'image' && /^https?:/i.test(a.value)) && !(el.localName === 'a' && /^(https?|mailto):/i.test(a.value)))
          out.push(`${a.name}=${JSON.stringify(a.value.slice(0, 30))} an <${el.localName}>`)
        if (a.localName === 'style' && /url\(\s*['"]?(?!#)/i.test(a.value)) out.push(`style mit url() an <${el.localName}>`)
      }
      if (/^(set|animate|animateTransform|animateMotion)$/.test(el.localName) && /href/i.test(el.getAttribute('attributeName') ?? ''))
        out.push(`<${el.localName}> auf ${el.getAttribute('attributeName')}`)
    }
    if (document.querySelector('body > :not(.layout-box-content), head > meta, head > style')) out.push('Element außerhalb der Box')
    return out
  })
  const before = await site.evaluate(() => window.__ran ?? 0)
  // Ein Klick auf jedes Element der Box, die <set>-Animationen gestartet.
  await site.evaluate(() => {
    for (const el of document.querySelectorAll('svg')) el.setCurrentTime?.(1)
    for (const el of document.querySelectorAll('.layout-box-content *')) {
      try {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      } catch {}
    }
  })
  // Ein Klick, der die Seite verlässt, nimmt ihr den Kontext; das ist dann die Antwort.
  for (const a of await site.$$('.layout-box-content a').catch(() => [])) await a.click({ force: true, timeout: 500 }).catch(() => {})
  await site.waitForTimeout(150)
  const ran = await site.evaluate(() => window.__ran ?? 0).catch(() => 0)
  await site.close()
  return { befund, ranOnLoad: before, ranOnClick: ran - before, navigated }
}

let fehler = 0
const pruefe = (ok, satz) => {
  console.log(`${ok ? '✓' : '✗'} ${satz}`)
  if (!ok) fehler++
}

for (const [name, input, zaehlt = 1] of boese) {
  const r = await clean(input)
  if (!r.ok) {
    pruefe(true, `${name}: abgelehnt`)
    continue
  }
  const probleme = []
  for (const [lage, html] of lagen(r.markup)) {
    const s = await render(html)
    const hier = [...s.befund]
    if (s.ranOnLoad) hier.push('Skript lief beim Laden')
    if (s.ranOnClick) hier.push('Skript lief beim Klick')
    if (s.navigated) hier.push('die Seite navigierte')
    if (hier.length) probleme.push(`${lage}: ${hier.join(', ')}`)
  }
  if (zaehlt && r.removed === 0) probleme.push('„0 entfernt“ gemeldet')
  pruefe(probleme.length === 0, `${name}: ${probleme.length ? probleme.join('; ') : `${r.removed} entfernt, auf der Seite nichts`}`)
}

// Was durchkommen muss.
const gut = svg(
  '<defs><linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient><symbol id="s"><circle cx="5" cy="5" r="4"/></symbol></defs>' +
    '<title>Logo &amp; Name</title><g class="a" fill="url(#g)" style="fill:url(#g);stroke:currentColor"><path d="M0 0h24"/><use href="#s"/><use xlink:href="#s"/></g>' +
    '<animate attributeName="opacity" values="0;1" dur="1s"/><a href="https://example.com/"><rect width="1" height="1"/></a>',
  ' class="eigen" width="24" height="24"'
)
const r = await clean(gut, 'Mein Logo.svg')
pruefe(r.ok && r.removed === 0, `ein gewöhnliches Icon: ${r.ok ? `${r.removed} entfernt` : 'abgelehnt'}`)
if (r.ok) {
  const site = await browser.newPage()
  await site.setContent(`<!doctype html><title>s</title><body><div class="layout-box-content">${r.markup}</div></body>`)
  const info = await site.evaluate(() => {
    const root = document.querySelector('.layout-box-content > svg')
    return {
      cls: root?.getAttribute('class'),
      viewBox: root?.viewBox?.baseVal?.width,
      uses: [...document.querySelectorAll('use')].map((u) => u.getAttribute('href') ?? u.getAttributeNS('http://www.w3.org/1999/xlink', 'href')),
      title: document.querySelector('title:not(head > title)')?.textContent ?? document.querySelectorAll('title')[1]?.textContent,
      gradient: !!document.querySelector('linearGradient#g'),
      fill: document.querySelector('g.a')?.getAttribute('fill'),
      style: document.querySelector('g.a')?.getAttribute('style'),
      animate: document.querySelector('animate')?.getAttribute('attributeName'),
      link: document.querySelector('.layout-box-content a')?.getAttribute('href'),
      blank: /\n\s*\n/.test(document.querySelector('.layout-box-content').innerHTML)
    }
  })
  await site.close()
  pruefe(info.cls === 'eigen svg-mein-logo', `die Wurzel trägt ihre Klasse und svg-mein-logo (${info.cls})`)
  pruefe(info.viewBox === 24, 'viewBox wird gelesen')
  pruefe(info.uses.length === 2 && info.uses.every((h) => h === '#s'), `<use> auf ein Symbol der Datei bleibt (${info.uses.join(', ')})`)
  pruefe(info.title === 'Logo & Name', `Text bleibt Text (${info.title})`)
  pruefe(info.gradient && info.fill === 'url(#g)' && /url\(#g\)/.test(info.style ?? ''), 'Verläufe und url(#…) bleiben')
  pruefe(info.animate === 'opacity', 'eine Animation auf etwas anderes als einen Verweis bleibt')
  pruefe(info.link === 'https://example.com/', 'ein Link nach https bleibt')
  pruefe(!info.blank, 'keine Leerzeile, die einen Markdown-Block beendet')
}
pruefe(!(await clean('<html/>')).ok && !(await clean('kein xml')).ok, 'was kein SVG ist, wird abgelehnt')

await browser.close()
console.log(fehler ? `\n✗ ${fehler} Prüfung(en) fehlgeschlagen` : '\n✓ alle Prüfungen bestanden')
process.exit(fehler ? 1 : 0)
