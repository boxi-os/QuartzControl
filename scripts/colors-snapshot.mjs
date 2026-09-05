// Nimmt die *berechneten* Farben jedes Elements auf jeder Route in beiden Farbschemata auf, und
// vergleicht zwei solche Aufnahmen.
//
// Existiert aus demselben Grund wie check:i18n: das Ersetzen einer Palette-Klasse durch ein
// Farb-Token ist im Typcheck und im Build unsichtbar, und ein Diff der Klassennamen beantwortet
// nicht die einzige Frage, die zählt - sieht es hinterher genauso aus. Indiziert wird über die
// Position im DOM, nicht über die Klasse; genau deshalb trägt der Vergleich über die Umstellung
// hinweg.
//
//   node scripts/colors-snapshot.mjs vorher.json      (vor der Änderung, nach `npm run build`)
//   node scripts/colors-snapshot.mjs nachher.json     (danach, wieder nach `npm run build`)
//   node scripts/colors-snapshot.mjs --diff vorher.json nachher.json
//
// `--hover` nimmt statt des Ruhezustands den *Hover*-Zustand auf: jedes Element, dessen Klassen
// eine `hover:`-Farbe tragen, wird der Reihe nach mit einer echten Mausbewegung angefahren und
// danach ausgelesen. Ohne das ist eine Umstellung von Hover-Klassen unbelegbar - der Ruhezustand
// ist dabei ja gerade unverändert. Verglichen wird mit demselben `--diff`.
//
// Der Diff nennt jede Farbänderung mit Schema, Eigenschaft, altem und neuem Wert und wie oft sie
// vorkommt - eine Umstellung, die nichts ändern soll, hat eine leere Liste, und eine, die etwas
// ändern soll, zeigt genau das und sonst nichts.
import { _electron as electron } from 'playwright-core'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const APP_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

// Dieselbe Liste wie in smoke.mjs: jede Route aus App.tsx samt Sub-Tabs.
const PROJECT_ROUTES = ['', '/config', '/config?tab=content', '/config?tab=localization', '/layout',
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
  const keys = Object.keys(a).filter((k) => k in b)
  const props = ['idx', 'tag', 'color', 'background', 'border-top', 'border-bottom', 'outline']
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
        const key = `${k.split(' ')[0]}|${names[i]}|${fx[i]}|${fy[i]}`
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
      routes.set(k, (routes.get(k) ?? 0) + 1)
    }
  }
  console.log(`${same} von ${total} Elementen unverändert\n`)
  if (counts.size === 0) {
    console.log('✓ keine einzige Farbe hat sich geändert.')
    return
  }
  console.log('Unterschiede:')
  for (const [key, n] of [...counts].sort((x, y) => y[1] - x[1])) {
    const [scheme, prop, old, next] = key.split('|')
    console.log(`  ${String(n).padStart(4)}×  ${scheme.padEnd(5)} ${prop.padEnd(13)} ${old}  →  ${next}`)
  }
  console.log('\nBetroffene Aufnahmen:')
  for (const [k, n] of [...routes].sort((x, y) => y[1] - x[1])) console.log(`  ${String(n).padStart(3)}  ${k}`)
}

const collectResting = () =>
  [...document.querySelectorAll('#root *')].map((el, i) => {
    const s = getComputedStyle(el)
    return [i, el.tagName, s.color, s.backgroundColor, s.borderTopColor, s.borderBottomColor, s.outlineColor].join('|')
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

const argv = process.argv.slice(2)
if (argv[0] === '--diff') {
  if (argv.length !== 3) {
    console.error('Aufruf: node scripts/colors-snapshot.mjs --diff vorher.json nachher.json')
    process.exit(2)
  }
  diff(argv[1], argv[2])
} else if (argv.length >= 1 && argv.length <= 2) {
  const hover = argv.includes('--hover')
  await snapshot(argv.find((a) => a !== '--hover'), hover)
} else {
  console.error('Aufruf: node scripts/colors-snapshot.mjs [--hover] <datei.json> | --diff <a.json> <b.json>')
  process.exit(2)
}
