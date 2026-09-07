// Screenshots für das Benutzerhandbuch. Zwilling von smoke.mjs: derselbe Launcher, dieselbe
// Wartelogik, dieselbe Routenliste aus routes.mjs - damit das Handbuch keinen Bildschirm zeigt,
// den der Smoke-Test nicht mehr besucht.
//
//   node scripts/screenshots.mjs [--only <teil,teil>] [--lang de|en] [--out <dir>] [--project <id>]
//
// Jede Route einmal hell und einmal dunkel. Anders als im Smoke-Test wird das Farbschema hier
// ausdrücklich gesetzt: dort steht `null`, weil er das Schema des Systems treffen soll.
//
// Aufgenommen wird gegen ein echtes Projekt - ein leeres Demoprojekt sähe in einem Handbuch nach
// nichts aus. Welches, sagt --project; ohne Angabe das erste, dessen Name auf `Example` endet.
import { _electron as electron } from 'playwright-core'
import { execFileSync } from 'node:child_process'
import { DEMO_PROFILE, resetDemoProfile, seedDemoProfile } from './screenshot-demo.mjs'
import { captureScenes } from './screenshot-scenes.mjs'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { APP_ROUTES, PROJECT_ROUTES } from './routes.mjs'

const APP_DIR = path.resolve(import.meta.dirname, '..')
const VAULT = path.join(os.homedir(), 'Obsidian/QuartzProjekte/QuartzControl-Handbuch')
// Breiter als der schmale Smoke-Fall und schmaler als der breite: die Breite, auf der die
// Seitenleiste, die Kartenspalten und ein Bild in einer Handbuchseite zusammen aufgehen.
const SIZE = { w: 1440, h: 900 }
// Eine Vollseiten-Aufnahme gibt es hier nicht, und zwar aus zwei Gründen übereinander. Erstens
// rollt eine Seite dieser App nicht im Dokument, sondern in einem Element darin (CLAUDE.md: der
// Roller geht über die volle Fensterbreite, die Kappung sitzt in einem Kind) - `fullPage: true`
// sieht davon nichts. Zweitens, und das ist die harte Grenze: Ein Fenster kann nicht höher werden
// als der Arbeitsbereich des Bildschirms. Gemessen am 2026-09-07: angefragt 1200, 1600 und 2400 px
// Höhe, bekommen jedes Mal 923 - so hoch ist der Arbeitsbereich, und ein Screenshot zeigt nur, was
// das Fenster wirklich rendert.
//
// Also zwei Aufnahmen statt einer: das Fenster, wie man es sieht, und - mit --cards - jede Karte
// einzeln. Playwright rollt ein Element vor seiner Aufnahme in den sichtbaren Bereich, deshalb
// erreicht die Kartenaufnahme auch, was unter der Kante liegt.
const ALL_SCHEMES = [
  ['hell', 'light'],
  ['dunkel', 'dark']
]
// Auf einem Retina-Bildschirm nimmt Playwright mit dem Skalierungsfaktor des Fensters auf, hier
// also 2880 px breit und rund 400 KB je Bild. Das Handbuch zeigt sie in einer Textspalte; 1920
// bleibt darüber scharf und kostet ein Drittel. `sips` gehört zu macOS - anderswo bleibt das Bild
// so groß, wie es aufgenommen wurde, und das ist kein Fehler, nur größer.
const SCALE_WIDTH = 1920
// Eine Karte wird im Handbuch in einer Textspalte gezeigt, nicht als Bildschirm - sie braucht
// weniger. 68 Kartenbilder in voller Breite waren die Hälfte der 27 MB des ersten Laufs.
const CARD_SCALE_WIDTH = 1400

function userDataDir() {
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library/Application Support/QuartzControl')
  if (process.platform === 'win32') return path.join(os.homedir(), 'AppData/Roaming/QuartzControl')
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'QuartzControl')
}

function electronBinPath() {
  const rel = fs.readFileSync(path.join(APP_DIR, 'node_modules/electron/path.txt'), 'utf-8')
  return path.join(APP_DIR, 'node_modules/electron/dist', rel)
}

/** Ein `window.quartzGui`-Aufruf im Renderer, die Argumente als ein Objekt. */
function ipc(page, source, args) {
  return page.evaluate(({ src, a }) => new Function('args', `return (${src})(args)`)(a), {
    src: source.toString(),
    a: args
  })
}

async function launch() {
  const app = await electron.launch({
    executablePath: electronBinPath(),
    // Electron reicht --user-data-dir an Chromium durch, und app.getPath('userData') folgt ihm -
    // nachgemessen am 2026-09-07 an einem leeren Verzeichnis, in dem die Projektliste 0 ergab.
    args: DEMO ? [APP_DIR, `--user-data-dir=${DEMO_PROFILE}`] : [APP_DIR],
    timeout: 60_000
  })
  const page = app.windows().find((w) => !w.url().startsWith('devtools://')) ?? (await app.firstWindow())
  await page.waitForSelector('#root > *', { timeout: 60_000 })
  return { app, page }
}

function pickProject() {
  const file = path.join(userDataDir(), 'projects.json')
  if (!fs.existsSync(file)) return null
  const list = JSON.parse(fs.readFileSync(file, 'utf-8'))
  if (!Array.isArray(list) || list.length === 0) return null
  return (list.find((p) => /Example$/.test(p.path)) ?? list[0]).id
}

const argv = process.argv.slice(2)
const arg = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback)
const lang = arg('--lang', 'de')
const only = arg('--only', null)
const CARDS = argv.includes('--cards')
// --demo nimmt nicht gegen das auf, was auf diesem Rechner eingerichtet ist, sondern gegen ein
// frisches Profil mit erfundenen Daten: eine aufgeräumte Projektliste, drei Zugänge auf
// example.com (RFC 2606 hat die Domain genau dafür reserviert) und drei Veröffentlichungsziele.
// Das ist der Modus für Bilder, die jemand anders ansehen soll.
const DEMO = argv.includes('--demo')
// Vorgabe hell, nicht beides: Das Handbuch zeigt ein Schema, und 55 dunkle Bilder, die keine Seite
// referenziert, sind 11 MB in einem Vault, der synchronisiert wird. `--scheme dunkel` oder
// `--scheme beide`, wenn man sie doch braucht. Dass die App im Dunkeln stimmt, prüft ohnehin
// scripts/styles-snapshot.mjs und nicht dieses Skript.
// --scenes nimmt statt der Routen die Szenen auf, die eine Routenliste nicht trifft: offene
// Dialoge, ein laufender Server, ein fertiger Build. Sie brauchen ein Projekt, das man verändern
// darf, also praktisch immer zusammen mit --demo.
const SCENES = argv.includes('--scenes')
const scheme = arg('--scheme', 'hell')
const SCHEMES = scheme === 'beide' ? ALL_SCHEMES : ALL_SCHEMES.filter(([name]) => name === scheme)
if (SCHEMES.length === 0) {
  console.error(`--scheme ${scheme} kennt niemand — hell, dunkel oder beide.`)
  process.exit(2)
}

// Karten, die niemals automatisch aufgenommen werden. "Zugänge" listet echte Server, Benutzernamen
// und Host-Key-Fingerprints des Rechners, auf dem das Skript läuft - gemessen am 2026-09-07, als
// genau das in zwei Bildern stand.
//
// Unter --demo entfällt die Sperre, und zwar nicht aus Nachlässigkeit: Dort legt das Skript das
// Profil selbst an, leer, und trägt seine eigenen erfundenen Zugänge ein. Es kann dort keine
// echten geben.
const CARD_BLOCKLIST = DEMO ? [] : [/^zugaenge$/, /^connections$/]
const outDir = path.resolve(arg('--out', path.join(VAULT, 'assets/screenshots', lang)))

if (!fs.existsSync(path.join(APP_DIR, 'out/main/index.js'))) {
  console.error('out/main/index.js fehlt — bitte zuerst `npm run build`')
  process.exit(2)
}
// Das Demo-Profil wird einmal vor beiden Läufen gefüllt, nicht je Lauf: Ein zweites
// connections.save ohne id legte denselben Zugang ein zweites Mal an.
let projectId = arg('--project', null)
if (DEMO) {
  resetDemoProfile()
  console.log(`Demo-Profil: ${DEMO_PROFILE}`)
  const { app, page } = await launch()
  try {
    projectId = (await seedDemoProfile(page, ipc)) ?? projectId
  } finally {
    await app.close().catch(() => {})
  }
} else {
  projectId ??= pickProject()
}
if (!projectId) {
  console.error('Kein registriertes Projekt gefunden.')
  process.exit(2)
}

// Der Dateiname trägt die Route, nicht ihre Nummer: Eine Seite, die im Handbuch verschoben wird,
// soll ihr Bild behalten.
const slug = (label) =>
  label
    .toLowerCase()
    .replaceAll('ä', 'ae').replaceAll('ö', 'oe').replaceAll('ü', 'ue').replaceAll('ß', 'ss')
    .replace(/·/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const routes = [
  ...APP_ROUTES.map(([l, r]) => [l, r]),
  ...PROJECT_ROUTES.map(([l, r]) => [l, `/project/${projectId}${r}`])
].filter(([l]) => !only || only.split(',').some((frag) => slug(l).includes(slug(frag))))

if (routes.length === 0 && !SCENES) {
  console.error(`--only ${only} passt auf keine Route.`)
  process.exit(2)
}

fs.mkdirSync(outDir, { recursive: true })
console.log(
  SCENES
    ? `Szenen × ${SCHEMES.map(([n]) => n).join(' + ')} → ${outDir}`
    : `${routes.length} Routen × ${SCHEMES.map(([n]) => n).join(' + ')} → ${outDir}`
)

let scalingReported = false
function scaleDown(file, width = SCALE_WIDTH) {
  if (process.platform !== 'darwin') return
  try {
    execFileSync('sips', ['--resampleWidth', String(width), file, '--out', file], { stdio: 'ignore' })
  } catch (err) {
    if (!scalingReported) {
      console.warn(`  (nicht verkleinert: ${err.message.split('\n')[0]})`)
      scalingReported = true
    }
  }
}

const written = []
for (const [scheme, media] of SCHEMES) {
  // Ein Fenster je Schema statt eines Wechsels im laufenden Fenster: Das Farbschema der App wird
  // im Hauptprozess gesetzt, und ein Wechsel danach lässt Seiten zurück, die ihre Farben beim
  // Mount gelesen haben.
  const { app, page } = await launch()
  await page.emulateMedia({ colorScheme: media })
  const win = await app.browserWindow(page)
  await win.evaluate((bw, s) => bw.setSize(s.w, s.h, false), SIZE)

  await page.evaluate(async (l) => {
    const s = await window.quartzGui.settings.get()
    await window.quartzGui.settings.save({ ...s, language: l })
  }, lang)
  await page.waitForTimeout(500)

  console.log(`\n── ${scheme} ─────────────────────────`)

  if (SCENES) {
    // Eine Szene nimmt entweder ein Element auf (ein Dialog, eine Karte) oder das Fenster.
    const shoot = async (name, target) => {
      const file = path.join(outDir, `szene-${slug(name)}-${scheme}.png`)
      if (target) {
        await target.screenshot({ path: file })
        scaleDown(file, CARD_SCALE_WIDTH)
      } else {
        await page.screenshot({ path: file })
        scaleDown(file)
      }
      written.push([path.basename(file), Math.round(fs.statSync(file).size / 1024)])
      return path.basename(file)
    }
    const wanted = (name) => !only || only.split(',').some((frag) => slug(name).includes(slug(frag)))
    await captureScenes({ page, projectId, ipc, shoot, wanted })
    await app.close().catch(() => {})
    continue
  }

  for (const [label, hash] of routes) {
    await page.evaluate((h) => {
      location.hash = h
    }, hash)
    // Dieselbe Wartezeit wie im Smoke-Test: Marktplatz und Theme-Katalog holen beim Mount aus dem
    // Netz, und ein halb geladener Katalog ist als Bild wertlos.
    await page.waitForTimeout(2500)

    const file = path.join(outDir, `${slug(label)}-${scheme}.png`)
    await page.screenshot({ path: file })
    scaleDown(file)
    written.push([path.basename(file), Math.round(fs.statSync(file).size / 1024)])
    let extra = ''

    if (CARDS) {
      // Der Container einer Karte ist nicht am Klassennamen einer Komponente zu erkennen, wohl
      // aber an dem, was ihn zur Karte macht: gerundet, mit Rand und Fläche. Von der <h2> aus
      // nach oben gesucht - CardHeading ist die einzige <h2> in einer Karte.
      const cards = await page.$$eval('h2', (hs) =>
        hs.map((h, i) => {
          let el = h
          for (let n = 0; n < 6 && el; n++) {
            const cls = (el.className || '').toString()
            if (/rounded/.test(cls) && /border|bg-surface|shadow/.test(cls)) break
            el = el.parentElement
          }
          if (el) el.dataset.shot = String(i)
          return el ? h.textContent.trim() : null
        })
      )
      let n = 0
      let blocked = 0
      for (const [i, title] of cards.entries()) {
        if (!title) continue
        if (CARD_BLOCKLIST.some((re) => re.test(slug(title)))) {
          blocked++
          continue
        }
        const el = await page.$(`[data-shot="${i}"]`)
        if (!el) continue
        const cardFile = path.join(outDir, `${slug(label)}--${slug(title)}-${scheme}.png`)
        await el.screenshot({ path: cardFile })
        scaleDown(cardFile, CARD_SCALE_WIDTH)
        written.push([path.basename(cardFile), Math.round(fs.statSync(cardFile).size / 1024)])
        n++
      }
      if (n) extra = `, ${n} Karten`
      if (blocked) extra += `, ${blocked} übersprungen`
    }

    const kb = Math.round(fs.statSync(file).size / 1024)
    console.log(`  ${label} → ${path.basename(file)} (${kb} KB${extra})`)
  }
  await app.close().catch(() => {})
}

const total = written.reduce((sum, [, kb]) => sum + kb, 0)
console.log(`\n${written.length} Bilder, ${(total / 1024).toFixed(1)} MB.`)
