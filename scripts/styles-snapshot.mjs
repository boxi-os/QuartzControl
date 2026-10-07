// Nimmt die *berechneten* Farben und Schriftmaße jedes Elements auf jeder Route in beiden
// Farbschemata auf, und vergleicht zwei solche Aufnahmen.
//
// Existiert aus demselben Grund wie check:i18n: das Ersetzen einer Palette-Klasse durch ein
// Farb-Token oder einer `text-[13px]` durch `text-ui` ist im Typcheck und im Build unsichtbar, und
// ein Diff der Klassennamen beantwortet nicht die einzige Frage, die zählt - sieht es hinterher
// genauso aus. Indiziert wird über die Position im DOM, nicht über die Klasse; genau deshalb trägt
// der Vergleich über die Umstellung hinweg.
//
//   node scripts/styles-snapshot.mjs vorher.json      (vor der Änderung, nach `npm run build`)
//   node scripts/styles-snapshot.mjs nachher.json     (danach, wieder nach `npm run build`)
//   node scripts/styles-snapshot.mjs --diff vorher.json nachher.json
//
// `--hover` nimmt statt des Ruhezustands den *Hover*-Zustand auf: jedes Element, dessen Klassen
// eine `hover:`-Farbe tragen, wird der Reihe nach mit einer echten Mausbewegung angefahren und
// danach ausgelesen. Ohne das ist eine Umstellung von Hover-Klassen unbelegbar - der Ruhezustand
// ist dabei ja gerade unverändert. Verglichen wird mit demselben `--diff`.
//
// Der Diff nennt jede Änderung mit Schema, Eigenschaft, altem und neuem Wert und wie oft sie
// vorkommt - eine Umstellung, die nichts ändern soll, hat eine leere Liste, und eine, die etwas
// ändern soll, zeigt genau das und sonst nichts.
//
// `--site` misst statt der App eine gebaute *Website* (1.1, P0): die Stylesheets der Vorlage
// umzubauen ist genauso unsichtbar wie eine Klasse in der App umzubenennen, und dort entscheidet
// sich, ob eine Regel eine andere überholt hat.
//
//   node scripts/styles-snapshot.mjs --site http://localhost:8080 vorher.json
//   node scripts/styles-snapshot.mjs --site --serve ~/Documents/QuartzProjekte/Example/public vorher.json
//   node scripts/styles-snapshot.mjs --diff vorher.json nachher.json
//
// Seiten aus `example-template/site-pages.mjs` (dieselben wie `check:tokens`), oder eigene über
// `--pages /,/a/b,/c`. Je Seite drei Breiten (1456, 1000, 390 — Desktop, die Spalte zwischen
// Tablet und Desktop, Telefon) in hell und dunkel; das Schema über Quartz' eigenen Schlüssel
// `localStorage.theme`, nicht nur über die Media-Query, weil `saved-theme` daran hängt. Je Element
// und je vorhandenem ::before/::after neben Farben und Schrift auch die Geometrie: `display`,
// `position`, Breite, Höhe, Außen- und Innenabstände, `grid-template-*`, `gap`, `order` — beim
// Zusammenlegen von Dateien verschiebt sich nicht die Farbe, sondern wer gewinnt. Übergänge und
// Animationen sind abgeschaltet, gemessen wird der Zielwert.
//
// `--serve <ordner>` beantwortet Anfragen wie Quartz' Dev-Server: `/a` → `a.html`, `/a/` →
// `a/index.html`, sonst `404.html` mit Status 404. So lässt sich eine Website messen, die in einer
// Werkstatt gebaut wurde, ohne daneben einen Server zu starten.
//
// Rauschboden: Zwei Aufnahmen ohne Änderung müssen einen leeren Diff ergeben. Was dann doch
// abweicht (ein Diagramm, das fertig rechnet, ein Datum), gehört nicht zur Messung und steht hier.
import { _electron as electron, chromium } from 'playwright-core'
import fs from 'fs'
import http from 'http'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { EXAMPLE_PAGES } from './example-template/site-pages.mjs'

const APP_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

// Dieselbe Liste wie in smoke.mjs: jede Route aus App.tsx samt Sub-Tabs.
const PROJECT_ROUTES = ['', '/config', '/config?tab=localization', '/layout',
  '/styles', '/styles?tab=theme', '/styles?tab=variables', '/styles?tab=customCss', '/templates',
  '/plugins', '/plugins?tab=marketplace', '/server', '/sync', '/publish', '/updates', '/backups']

function userDataDir() {
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library/Application Support/QuartzControl')
  if (process.platform === 'win32') return path.join(os.homedir(), 'AppData/Roaming/QuartzControl')
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'QuartzControl')
}

function firstProjectId() {
  const file = path.join(userDataDir(), 'projects.json')
  if (!fs.existsSync(file)) return null
  const list = JSON.parse(fs.readFileSync(file, 'utf-8'))
  return Array.isArray(list) && list[0] ? list[0].id : null
}

function electronBinPath() {
  const rel = fs.readFileSync(path.join(APP_DIR, 'node_modules/electron/path.txt'), 'utf-8')
  return path.join(APP_DIR, 'node_modules/electron/dist', rel)
}

function diff(fileA, fileB) {
  const a = JSON.parse(fs.readFileSync(fileA, 'utf-8'))
  const b = JSON.parse(fs.readFileSync(fileB, 'utf-8'))
  // Eine Website-Aufnahme trägt ihre Eigenschaftsnamen selbst (`__props`), weil es mehr sind und
  // die Liste wachsen darf; die App-Aufnahme hat die feste Liste unten.
  if (Array.isArray(a.__props) !== Array.isArray(b.__props) || String(a.__props) !== String(b.__props)) {
    console.error('Die beiden Aufnahmen haben verschiedene Eigenschaftslisten - nicht vergleichbar.')
    process.exit(2)
  }
  const keys = Object.keys(a).filter((k) => k !== '__props' && k in b)
  const props = a.__props ? ['idx', 'tag', ...a.__props] : ['idx', 'tag', 'color', 'background', 'border-top', 'border-bottom', 'outline', 'font-size', 'line-height']
  // Im --hover-Modus steht an Stelle 2 'hover'/'verdeckt' und die Farben rücken eins weiter.
  const hoverProps = ['idx', 'tag', 'erreicht', 'color', 'background', 'border-top']
  const counts = new Map()
  const routes = new Map()
  let same = 0
  let total = 0
  for (const k of keys) {
    if (a[k].length !== b[k].length) {
      console.log(`  ! ${k}: ${a[k].length} statt ${b[k].length} Elemente - die Seite hat sich strukturell geändert`)
      continue
    }
    for (const [x, y] of a[k].map((v, i) => [v, b[k][i]])) {
      total += 1
      if (x === y) {
        same += 1
        continue
      }
      const [fx, fy] = [x.split('|'), y.split('|')]
      const names = fx[2] === 'hover' || fx[2] === 'verdeckt' ? hoverProps : props
      for (let i = 2; i < names.length; i++) {
        if (fx[i] === fy[i]) continue
        const where = a.__props ? k.split(' ').slice(0, 2).join(' ') : k.split(' ')[0]
        const key = `${where}|${names[i]}|${fx[i]}|${fy[i]}`
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
      routes.set(k, (routes.get(k) ?? 0) + 1)
    }
  }
  console.log(`${same} von ${total} Elementen unverändert\n`)
  const missing = Object.keys(a).filter((k) => k !== '__props' && !(k in b)).length
  if (missing) console.log(`  ! ${missing} Aufnahmen fehlen in ${fileB}\n`)
  if (counts.size === 0) {
    console.log(a.__props ? '✓ kein einziger berechneter Wert hat sich geändert.' : '✓ keine einzige Farbe und kein einziges Schriftmaß hat sich geändert.')
    return
  }
  console.log('Unterschiede:')
  for (const [key, n] of [...counts].sort((x, y) => y[1] - x[1])) {
    const [scheme, prop, old, next] = key.split('|')
    console.log(`  ${String(n).padStart(4)}×  ${scheme.padEnd(10)} ${prop.padEnd(20)} ${old}  →  ${next}`)
  }
  console.log('\nBetroffene Aufnahmen:')
  for (const [k, n] of [...routes].sort((x, y) => y[1] - x[1])) console.log(`  ${String(n).padStart(3)}  ${k}`)
}

const collectResting = () =>
  [...document.querySelectorAll('#root *')].map((el, i) => {
    const s = getComputedStyle(el)
    // Zeilenhöhe mit aufgenommen, weil die Größen-Tokens *nur* die Schriftgröße setzen, so wie die
    // arbitrary values, die sie ersetzen: bliebe die Zeilenhöhe nicht gleich, verschöbe sich das
    // Layout, und genau das soll die Aufnahme ausschließen können.
    return [i, el.tagName, s.color, s.backgroundColor, s.borderTopColor, s.borderBottomColor, s.outlineColor, s.fontSize, s.lineHeight].join('|')
  })

// Eine echte Mausbewegung, kein :hover per Skript: die Pseudoklasse lässt sich nicht setzen, und
// `dispatchEvent(new MouseEvent('mouseover'))` ändert nichts an der Darstellung. Element für
// Element, weil immer nur eines unter dem Zeiger liegen kann.
async function hoverStates(page) {
  // Die App animiert Farben (`transition-colors`, 150ms). Ohne dies liest man einen Zwischenwert
  // der Animation und hält ihn für den Hover-Zustand - gemessen: rgba(255,255,255,0.004) an einer
  // Stelle, deren Hover-Fläche in Wahrheit 10% Weiß ist. Pro Element zu warten kostete 1195 × 250ms;
  // die Animation abzuschalten kostet nichts und misst genau das, was gefragt ist: den Zielwert.
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important }' })
  const targets = await page.evaluate(() =>
    [...document.querySelectorAll('#root *')]
      .map((el, i) => [i, el])
      .filter(([, el]) => typeof el.className === 'string' && /hover:(text|bg|border)-/.test(el.className))
      .map(([i, el]) => {
        const r = el.getBoundingClientRect()
        return { i, tag: el.tagName, x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }
      })
      .filter((t) => t.w > 0 && t.h > 0)
  )
  const out = []
  for (const t of targets) {
    await page.mouse.move(t.x, t.y)
    const seen = await page.evaluate((i) => {
      const el = document.querySelectorAll('#root *')[i]
      const s = getComputedStyle(el)
      // Ohne diese Prüfung misst man ein Element, das gar nicht unter dem Zeiger liegt, weil ein
      // anderes davor sitzt - und liest dann den Ruhezustand als Hover-Zustand.
      return [el.matches(':hover'), s.color, s.backgroundColor, s.borderTopColor].join('|')
    }, t.i)
    const [hovered, ...rest] = seen.split('|')
    out.push([t.i, t.tag, hovered === 'true' ? 'hover' : 'verdeckt', ...rest].join('|'))
  }
  await page.mouse.move(0, 0)
  return out
}

async function snapshot(out, hoverMode) {
  if (!fs.existsSync(path.join(APP_DIR, 'out/main/index.js'))) {
    console.error('out/main/index.js fehlt - bitte zuerst `npm run build`')
    process.exit(2)
  }
  const id = firstProjectId()
  const routes = ['/', '/settings', ...(id ? PROJECT_ROUTES.map((r) => `/project/${id}${r}`) : [])]
  const result = {}

  const app = await electron.launch({ executablePath: electronBinPath(), args: [APP_DIR], timeout: 30_000 })
  const page = app.windows().find((w) => !w.url().startsWith('devtools://')) ?? (await app.firstWindow())
  await page.waitForSelector('#root > *', { timeout: 60_000 })
  const win = await app.browserWindow(page)
  // Die große Fenstergröße, weil bei 1280 breite Seiten Spalten wegklappen und damit Elemente
  // fehlen, die der Vergleich dann nicht sieht.
  await win.evaluate((bw) => bw.setSize(1728, 1000, false))

  for (const scheme of ['light', 'dark']) {
    // Hier ist die Emulation richtig, anders als im Smoke-Test: verglichen werden sollen beide
    // Schemata unabhängig davon, worauf dieser Rechner gerade steht.
    await page.emulateMedia({ colorScheme: scheme })
    for (const hash of routes) {
      await page.evaluate((h) => {
        location.hash = h
      }, hash)
      await page.waitForTimeout(1200)
      result[`${scheme} ${hash}`] = hoverMode ? await hoverStates(page) : await page.evaluate(collectResting)
    }
  }
  await app.close().catch(() => {})
  fs.writeFileSync(out, JSON.stringify(result, null, 1))
  const n = Object.values(result).reduce((acc, v) => acc + v.length, 0)
  console.log(`${Object.keys(result).length} Aufnahmen, ${n} Elemente → ${out}`)
}

// --- Website ---------------------------------------------------------------------------------

const SITE_PROPS = [
  'color', 'backgroundColor', 'backgroundImage', 'borderTopColor', 'borderTopWidth', 'borderBottomColor',
  'borderBottomWidth', 'borderLeftColor', 'borderLeftWidth', 'borderRightColor', 'borderRightWidth',
  'borderTopLeftRadius', 'outlineColor', 'outlineWidth', 'boxShadow', 'opacity', 'fontFamily', 'fontSize',
  'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textAlign', 'textDecorationLine', 'display',
  'position', 'top', 'left', 'zIndex', 'width', 'height', 'marginTop', 'marginRight', 'marginBottom',
  'marginLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'gridTemplateColumns',
  'gridTemplateRows', 'gridTemplateAreas', 'gap', 'order', 'flexDirection', 'overflowX', 'overflowY',
  'visibility', 'content'
]
const SITE_VIEWPORTS = [
  [1456, 950],
  [1000, 900],
  [390, 844]
]

// Quartz' Dev-Server, so weit eine Messung ihn braucht: hübsche URLs und die eigene 404-Seite.
function serveDir(root) {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2',
    '.woff': 'font/woff', '.ttf': 'font/ttf', '.xml': 'application/xml', '.ico': 'image/x-icon' }
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    const rel = path.normalize(url).replace(/^(\.\.[/\\])+/, '')
    const candidates = url.endsWith('/') ? [path.join(rel, 'index.html')] : [rel, `${rel}.html`, path.join(rel, 'index.html')]
    for (const c of candidates) {
      const file = path.join(root, c)
      if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' })
        return fs.createReadStream(file).pipe(res)
      }
    }
    const notFound = path.join(root, '404.html')
    res.writeHead(404, { 'content-type': 'text/html' })
    res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'not found')
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

const collectSite = () => {
  const rows = []
  let i = 0
  for (const el of document.querySelectorAll('body *')) {
    for (const pseudo of [null, '::before', '::after']) {
      const s = getComputedStyle(el, pseudo)
      if (pseudo && s.content === 'none') continue
      rows.push([i, el.tagName + (pseudo ?? ''), ...window.__SITE_PROPS.map((p) => s[p])].join('|'))
    }
    i += 1
  }
  return rows
}

async function siteSnapshot(base, pages, out) {
  const browser = await chromium.launch({ channel: 'chrome' })
  const result = { __props: SITE_PROPS }
  const notSettled = []
  try {
    for (const scheme of ['light', 'dark']) {
      for (const [width, height] of SITE_VIEWPORTS) {
        const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme })
        await context.addInitScript(
          ([theme, props]) => {
            try {
              localStorage.setItem('theme', theme)
            } catch {}
            window.__SITE_PROPS = props
          },
          [scheme, SITE_PROPS]
        )
        const page = await context.newPage()
        for (const p of pages) {
          await page.goto(base + p, { waitUntil: 'load', timeout: 30_000 })
          await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important }' })
          // Erst messen, wenn die Seite steht. Zwei Dinge bewegten sich sonst zwischen zwei
          // gleichen Aufnahmen (2026-10-07): ein Bild, das noch lädt, ist 2×2 px groß und schiebt
          // alles darunter, und ein Mermaid-Diagramm rendert nach `load` weiter (1785 statt 1705
          // Elemente). `loading="lazy"` lädt außerhalb des Fensters gar nicht, also wird es auf
          // eager gestellt — und danach nicht auf `decode()` oder ein einmaliges `complete`
          // gewartet, beides hielt nicht, sondern gepollt: jedes Bild fertig, und die Zahl der
          // Elemente dreimal hintereinander gleich. Was nach zehn Sekunden nicht steht, wird
          // gezählt und gesagt, statt still mitgemessen zu werden.
          const unsettled = await page.evaluate(async () => {
            for (const img of document.images) img.loading = 'eager'
            const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
            const deadline = Date.now() + 10_000
            const pending = () => [...document.images].filter((i) => i.getAttribute('src') && !(i.complete && i.naturalWidth > 0)).length
            let last = -1
            let calm = 0
            while (Date.now() < deadline) {
              const count = document.getElementsByTagName('*').length
              calm = count === last && pending() === 0 ? calm + 1 : 0
              if (calm >= 3) break
              last = count
              await sleep(200)
            }
            await document.fonts.ready
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
            return calm >= 3 ? 0 : Math.max(1, pending())
          })
          if (unsettled) notSettled.push(`${scheme} ${width} ${p}`)
          await page.waitForTimeout(400)
          result[`${scheme} ${width} ${p}`] = await page.evaluate(collectSite)
        }
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }
  fs.writeFileSync(out, JSON.stringify(result))
  const n = Object.entries(result).reduce((acc, [k, v]) => acc + (k === '__props' ? 0 : v.length), 0)
  console.log(`${Object.keys(result).length - 1} Aufnahmen, ${n} Elemente → ${out}`)
  if (notSettled.length) {
    console.log(`! ${notSettled.length} Aufnahmen standen nach 10 s noch nicht still (Bild nicht geladen oder DOM in Bewegung):`)
    for (const k of notSettled) console.log(`    ${k}`)
  }
}

const argv = process.argv.slice(2)
if (argv[0] === '--site') {
  const rest = argv.slice(1)
  const take = (flag) => {
    const i = rest.indexOf(flag)
    return i === -1 ? null : rest.splice(i, 2)[1]
  }
  const serve = take('--serve')
  const pagesArg = take('--pages')
  const pages = pagesArg ? pagesArg.split(',') : EXAMPLE_PAGES
  const [first, second] = rest
  const usage = 'Aufruf: node scripts/styles-snapshot.mjs --site (<baseUrl> | --serve <ordner>) [--pages /,/a] <datei.json>'
  if (serve ? rest.length !== 1 : rest.length !== 2) {
    console.error(usage)
    process.exit(2)
  }
  if (serve) {
    const root = path.resolve(serve)
    if (!fs.existsSync(path.join(root, 'index.html'))) {
      console.error(`${root} hat keine index.html - ist die Website gebaut?`)
      process.exit(2)
    }
    const server = await serveDir(root)
    try {
      await siteSnapshot(`http://127.0.0.1:${server.address().port}`, pages, first)
    } finally {
      server.close()
    }
  } else {
    await siteSnapshot(first.replace(/\/$/, ''), pages, second)
  }
} else if (argv[0] === '--diff') {
  if (argv.length !== 3) {
    console.error('Aufruf: node scripts/styles-snapshot.mjs --diff vorher.json nachher.json')
    process.exit(2)
  }
  diff(argv[1], argv[2])
} else if (argv.length >= 1 && argv.length <= 2) {
  const hover = argv.includes('--hover')
  await snapshot(argv.find((a) => a !== '--hover'), hover)
} else {
  console.error('Aufruf: node scripts/styles-snapshot.mjs [--hover] <datei.json> | --diff <a.json> <b.json>')
  process.exit(2)
}
