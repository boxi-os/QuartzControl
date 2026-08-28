// Route smoke test: launches the production build and visits every screen, reporting anything
// that looks like a failure - an uncaught exception, a console error, an error toast
// (ErrorSurface's role="alert") or the route error boundary.
//
// This is not a test suite and does not assert on content. It exists because this repo has no
// tests at all, and a sweep across the codebase otherwise has no way of noticing that a page
// stopped rendering three commits ago. It answers exactly one question: does every screen still
// come up without complaining?
//
// Each window size is a fresh launch: page.setViewportSize() does not resize an Electron
// BrowserWindow, and the layout problems worth catching (a grid item pushing <main> sideways) only
// appear at a real window size.
//
//   node scripts/smoke.mjs [--project <id>] [--keep-going]
//
// Exit code 1 if anything was reported.
import { _electron as electron } from 'playwright-core'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

const APP_DIR = path.resolve(import.meta.dirname, '..')
const SIZES = [
  { label: '1280x800', w: 1280, h: 800 },
  { label: '1728x1000', w: 1728, h: 1000 }
]

// Every route in App.tsx plus the sub-tabs, which are separate screens sharing a path: only one is
// mounted at a time, so a page not listed here is never rendered by this test.
const PROJECT_ROUTES = [
  ['Übersicht', ''],
  ['Konfiguration', '/config'],
  ['Konfiguration · Content-Ordner', '/config?tab=content'],
  ['Konfiguration · Übersetzungen', '/config?tab=localization'],
  ['Layout', '/layout'],
  ['Stile · Basis', '/styles'],
  ['Stile · Community-Themes', '/styles?tab=theme'],
  ['Stile · Variablen', '/styles?tab=variables'],
  ['Stile · Eigenes CSS', '/styles?tab=customCss'],
  ['Vorlagen', '/templates'],
  ['Plugins', '/plugins'],
  ['Plugins · Marktplatz', '/plugins?tab=marketplace'],
  ['Vorschau & Build', '/server'],
  ['Git-Sync', '/sync'],
  ['Veröffentlichen', '/publish'],
  ['Updates', '/updates'],
  ['Backups', '/backups']
]

// Console noise that is not this app's doing and would otherwise fail every run.
const IGNORED_CONSOLE = [
  /Autofill\.(enable|setAddresses)/, // Chromium DevTools protocol, emitted by Electron itself
  /Electron Security Warning/ // dev-only warning about the CSP, not applicable to the built app
]

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

const argv = process.argv.slice(2)
const projectId = argv.includes('--project') ? argv[argv.indexOf('--project') + 1] : firstProjectId()

const findings = []
function report(size, route, kind, detail) {
  findings.push({ size, route, kind, detail })
  console.log(`  ✗ [${kind}] ${detail.slice(0, 300)}`)
}

async function visit(page, size, label, hash) {
  const seen = []
  const onConsole = (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return
    seen.push(['console', text])
  }
  const onPageError = (err) => seen.push(['exception', err.message])
  page.on('console', onConsole)
  page.on('pageerror', onPageError)

  await page.evaluate((h) => {
    location.hash = h
  }, hash)
  // No load event fires on a hash change, so there is nothing to wait for but the render. The
  // marketplace and theme catalog fetch from GitHub/npm on mount; 2.5s is enough to catch a
  // synchronous crash, and a slow fetch that fails later is reported by the next route's pass.
  await page.waitForTimeout(2500)

  process.stdout.write(`  ${label} … `)
  const dom = await page.evaluate(() => ({
    boundary: document.body.innerText.includes('Diese Ansicht konnte nicht dargestellt werden.'),
    toasts: [...document.querySelectorAll('[role="alert"]')].map((e) => e.innerText.trim()),
    // Home and Settings render no <main> at all (only ProjectLayout does), so the scroll
    // container falls back to #root rather than the check silently passing on those two.
    sideways: (() => {
      const m = document.querySelector('main') ?? document.getElementById('root')
      return m ? m.scrollWidth > m.clientWidth + 1 : false
    })(),
    empty: ((document.querySelector('main') ?? document.getElementById('root'))?.innerText.trim().length ?? 0) < 10
  }))

  page.off('console', onConsole)
  page.off('pageerror', onPageError)

  const before = findings.length
  console.log('')
  if (dom.boundary) report(size, label, 'error-boundary', 'Route error boundary rendered')
  for (const toast of dom.toasts) report(size, label, 'toast', toast)
  if (dom.sideways) report(size, label, 'layout', 'Inhalt scrollt horizontal')
  if (dom.empty) report(size, label, 'empty', 'Seite hat (fast) nichts gerendert')
  for (const [kind, text] of seen) report(size, label, kind, text)
  return findings.length === before
}

async function run() {
  if (!fs.existsSync(path.join(APP_DIR, 'out/main/index.js'))) {
    console.error('out/main/index.js fehlt - bitte zuerst `npm run build`')
    process.exit(2)
  }
  if (!projectId) console.warn('Kein registriertes Projekt gefunden - nur Startseite und Einstellungen werden geprüft.')

  const routes = [
    ['Startseite', '/'],
    ['Einstellungen', '/settings'],
    ...(projectId ? PROJECT_ROUTES.map(([l, r]) => [l, `/project/${projectId}${r}`]) : [])
  ]

  for (const size of SIZES) {
    console.log(`\n── ${size.label} ─────────────────────────────`)
    const app = await electron.launch({ executablePath: electronBinPath(), args: [APP_DIR], timeout: 30_000 })
    const page = app.windows().find((w) => !w.url().startsWith('devtools://')) ?? (await app.firstWindow())
    // Generous, because the *first* launch of a freshly downloaded Electron binary is slow on
    // macOS - the OS verifies the signature of a ~300MB bundle before it runs, which measured over
    // ten seconds right after an upgrade while every later launch settled in ~250ms. A tighter
    // wait turns "you just bumped Electron" into a failing smoke run.
    await page.waitForSelector('#root > *', { timeout: 60_000 })
    // Playwright emulates a colour scheme by default, which overrides prefers-color-scheme and
    // would hide anything that only goes wrong in the theme the OS is actually set to.
    await page.emulateMedia({ colorScheme: null })
    const win = await app.browserWindow(page)
    await win.evaluate((bw, s) => bw.setSize(s.w, s.h, false), { w: size.w, h: size.h })

    for (const [label, hash] of routes) await visit(page, size.label, label, hash)
    await app.close().catch(() => {})
  }

  console.log('\n═══════════════════════════════════')
  if (findings.length === 0) {
    console.log(`✓ ${routes.length * SIZES.length} Aufrufe, keine Auffälligkeiten.`)
    return
  }
  console.log(`${findings.length} Auffälligkeit(en):`)
  for (const f of findings) console.log(`  [${f.size}] ${f.route} · ${f.kind}: ${f.detail.slice(0, 200)}`)
  process.exitCode = 1
}

run().catch((err) => {
  console.error(err)
  process.exit(2)
})
