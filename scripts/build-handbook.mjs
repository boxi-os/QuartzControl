// Baut das Benutzerhandbuch nach resources/handbook/ - als Quelle für `npm run build:handbook-pdf`.
//
//   npm run build:handbook
//
// Mit der App reist es seit dem 2026-09-18 nicht mehr: Das Handbuch wird nur online gepflegt
// (HANDBOOK_URL in electron/main/menu.ts), und die Website baut `QuartzControl-Web` aus demselben
// Vault (docs/release.md, Punkt 9). resources/handbook bleibt gitignoriert.
//
// Quelle ist das Quartz-Projekt, dessen content/ auf den Handbuch-Vault zeigt; wo das liegt, sagt
// docs/handbuch.md. Fehlt es, bricht dieses Skript ab. QUARTZCONTROL_HANDBOOK_SITE zeigt statt
// dessen auf eine *schon gebaute* Website, die übernommen wird - für eine Maschine, die das
// Projekt nicht hat.
import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { projectPath } from './project-paths.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
export const HANDBOOK_PROJECT =
  process.env.QUARTZCONTROL_HANDBOOK_PROJECT || projectPath('QuartzControl-Handbuch')
export const HANDBOOK_SITE = process.env.QUARTZCONTROL_HANDBOOK_SITE || null
export const HANDBOOK_OUT = path.join(ROOT, 'resources/handbook')

export function buildHandbook({ project = HANDBOOK_PROJECT, site = HANDBOOK_SITE, out = HANDBOOK_OUT } = {}) {
  if (site) return takeHandbook(site, out)
  if (!fs.existsSync(path.join(project, 'quartz.config.yaml'))) {
    throw new Error(`Kein Quartz-Projekt in ${project} — siehe docs/handbuch.md`)
  }
  // In das Zielverzeichnis direkt bauen, nicht in public/ und dann kopieren: Ein Build leert sein
  // Ausgabeverzeichnis ohnehin vollständig, und zwei Kopien liefen sonst auseinander.
  fs.rmSync(out, { recursive: true, force: true })
  fs.mkdirSync(out, { recursive: true })
  execFileSync('npx', ['quartz', 'build', '--output', out], { cwd: project, stdio: 'inherit' })

  const index = path.join(out, 'index.html')
  // Dem Exit-Code nicht trauen, sondern der Datei - dieselbe Regel wie bei `quartz create`.
  if (!fs.existsSync(index)) throw new Error(`quartz build schrieb keine index.html nach ${out}`)
  return measure(out, null)
}

// Liegt `inner` in `outer` (echt darunter, nicht gleich)? Nach resolve() und relative() entschieden,
// wie `containedPath()` im Vorlagen-Paket: Eine Zeichenkette sagt nicht, ob ein Pfad in einem
// Verzeichnis liegt, das sagt erst der aufgelöste.
function liesInside(inner, outer) {
  const rel = path.relative(outer, inner)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

// Übernimmt eine gebaute Website. Geprüft wird alles, was zu prüfen ist, *bevor* out geleert wird -
// ein Wurf danach ließe den Aufrufer mit einem halb geräumten Verzeichnis stehen. Zu prüfen ist
// dabei nicht nur, ob die Quelle eine gebaute Website ist, sondern auch, wo sie liegt: `rmSync(out)`
// ist die zweite Stelle, an der eine Quelle sterben kann, und sie fragt nicht nach.
//
// Gemessen am 2026-09-09 an Wegwerf-Verzeichnissen, mit der Prüfung unten und ohne:
//
//   Quelle unterhalb des Ziels (`site=<out>/kopie`) → rmSync nimmt die Quelle mit, cpSync wirft
//     ENOENT: **Ziel und Quelle sind weg**
//   Ziel unterhalb der Quelle (`out=<site>/kapitel`) → rmSync leert ein Unterverzeichnis der
//     Quelle, cpSync wirft "Cannot copy ... to a subdirectory of self"
//
// Der erste Fall ist keine erfundene Handbewegung: `QUARTZCONTROL_HANDBOOK_SITE=resources/handbook/<kopie>`
// ist genau das, was der Kopf dieser Datei als "hilft nicht" beschreibt, nur mit der Variable
// dazugesetzt. Beide enden jetzt in einem Satz, der sagt warum, und beide Verzeichnisse bleiben.
function takeHandbook(site, out) {
  const from = path.resolve(site)
  const to = path.resolve(out)
  if (!fs.existsSync(path.join(from, 'index.html'))) {
    throw new Error(`Keine gebaute Website in ${from} - dort fehlt index.html`)
  }
  if (liesInside(from, to)) {
    throw new Error(
      `QUARTZCONTROL_HANDBOOK_SITE (${from}) liegt im Ausgabeverzeichnis ${to}, das übernommen wird - ` +
        'das Leeren des Ziels nähme die Quelle mit. Die gebaute Website muss außerhalb liegen.'
    )
  }
  if (liesInside(to, from)) {
    throw new Error(
      `Das Ausgabeverzeichnis ${to} liegt in QUARTZCONTROL_HANDBOOK_SITE (${from}) - ` +
        'das Leeren des Ziels nähme einen Teil der Quelle mit.'
    )
  }
  // Zeigt QUARTZCONTROL_HANDBOOK_SITE auf das Ziel selbst, ist nichts zu kopieren; ohne diesen
  // Fall würde das rmSync die Quelle mitnehmen.
  if (to !== from) {
    fs.rmSync(out, { recursive: true, force: true })
    fs.cpSync(from, out, { recursive: true })
  }
  const index = path.join(out, 'index.html')
  if (!fs.existsSync(index)) throw new Error(`nach dem Übernehmen fehlt ${index}`)
  return measure(out, from)
}

function measure(out, copiedFrom) {
  return {
    out,
    copiedFrom,
    files: countFiles(out),
    megabytes: Math.round((dirSize(out) / 1024 / 1024) * 10) / 10
  }
}

function countFiles(dir) {
  let n = 0
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    n += e.isDirectory() ? countFiles(path.join(dir, e.name)) : 1
  }
  return n
}
function dirSize(dir) {
  let n = 0
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    n += e.isDirectory() ? dirSize(full) : fs.statSync(full).size
  }
  return n
}

if (import.meta.filename === process.argv[1]) {
  const result = buildHandbook()
  const how = result.copiedFrom ? `übernommen aus ${result.copiedFrom}` : 'gebaut'
  console.log(`\n✓ ${result.files} Dateien, ${result.megabytes} MB → ${path.relative(ROOT, result.out)} (${how})`)
}
