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
      for (let i = 2; i < props.length; i++) {
        if (fx[i] === fy[i]) continue
        const key = `${k.split(' ')[0]}|${props[i]}|${fx[i]}|${fy[i]}`
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

async function snapshot(out) {
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
      result[`${scheme} ${hash}`] = await page.evaluate(() =>
        [...document.querySelectorAll('#root *')].map((el, i) => {
          const s = getComputedStyle(el)
          return [i, el.tagName, s.color, s.backgroundColor, s.borderTopColor, s.borderBottomColor, s.outlineColor].join('|')
        })
      )
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
} else if (argv.length === 1) {
  await snapshot(argv[0])
} else {
  console.error('Aufruf: node scripts/colors-snapshot.mjs <datei.json> | --diff <a.json> <b.json>')
  process.exit(2)
}
