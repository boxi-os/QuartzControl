#!/usr/bin/env node
// Staffelt die Änderungszeiten des Beispiel-Vaults nach der Gliederung.
//
//   node scripts/stagger-vault-mtimes.mjs                    # Vorschau, schreibt nichts
//   node scripts/stagger-vault-mtimes.mjs --list             # die ganze Reihe, zum Nachlesen
//   node scripts/stagger-vault-mtimes.mjs --apply            # setzt die Zeiten (mit Sicherung)
//   node scripts/stagger-vault-mtimes.mjs --restore <datei>  # Sicherung zurückspielen
//   node scripts/stagger-vault-mtimes.mjs --vault <pfad>     # anderer Vault
//
// Warum es das gibt: Die Ordner- und Tag-Listen dieses Projekts sortieren nach dem Änderungsdatum,
// das Frontmatter trägt keins, und `content/` ist ein Symlink - git liefert also auch nichts
// (BEFUNDE 43 und 79). Eine Textänderung an vielen Notizen setzt damit alle auf dieselbe Sekunde
// und wirft jede Liste durcheinander. Am 2026-09-06 wurde das einmal von Hand gerichtet, und weil
// es von Hand war, blieb es halb: gestaffelt wurden die Kapitel- und Abschnittsseiten und die
// nummerierten Notizen, nicht die 149 unnummerierten Blattnotizen. Die teilten sich weiter eine
// Sekunde, und sechs Diagramm-Notizen, die danach noch einmal angefaßt wurden, waren plötzlich die
// jüngsten Dateien des Vaults - der Kasten „zuletzt bearbeitet" zeigte genau die (Review
// 2026-09-14, Befund 10). Von Hand gerichtet heißt: beim nächsten Mal wieder halb.
//
// **Das ist eine Setzung, keine Wiederherstellung.** Die echten Zeiten sind ohnehin Artefakte des
// Schreibprozesses; was die Listen zeigen sollen, ist die Ordnung des Handbuchs. Wer Daten
// braucht, die etwas bedeuten, schreibt sie ins Frontmatter - dann liest `created-modified-date`
// sie von dort und keine Textänderung bewegt sie mehr.
//
// Die Regel, in der Reihenfolge, in der sie angewandt wird:
//
//   * Ein Durchlauf durch die Gliederung, Tiefe zuerst. In einem Ordner kommt `index.md` zuerst,
//     danach alles andere - Dateien und Unterordner gemischt - nach **Titel** sortiert, mit
//     `localeCompare(numeric: true)`. Das ist wörtlich die Sortierregel des Explorer-Plugins, und
//     die Seitenlisten brechen ihren Datumsvergleich mit derselben. Deshalb nach dem Titel und
//     nicht nach dem Dateinamen: `aufgaben.md` heißt „Aufgabenlisten", und die Liste zeigt den
//     Titel. Ein Ordner erbt den Titel seiner `index.md`.
//   * Deutsch und Englisch laufen als zwei Bäume und werden paarweise verschränkt: DE, EN, DE, EN.
//     Beide Startseiten stehen dabei an der Spitze. `recent-notes` hat keinen Sprachfilter, also
//     stehen auf beiden Startseiten beide Sprachen im Kasten - das ist eine Eigenschaft des
//     Plugins und nicht dieser Staffelung.
//   * Ein Schritt ist eine Minute, **rückwärts**: kleine Nummer = zuletzt bearbeitet. Der Anker
//     ist fest, damit ein zweiter Lauf dieselben Zahlen erzeugt.
//
// Es faßt nur Zeiten an, nie Inhalte - `git status` im Vault bleibt danach leer, was zugleich der
// Grund für die Sicherung ist: git kennt keine mtimes, also gibt es keinen Rückweg über git.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const argv = process.argv.slice(2)
const flag = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null)

const VAULT = path.resolve(flag('--vault') ?? path.join(os.homedir(), 'Obsidian/QuartzProjekte/Example'))
const APP_DIR = path.resolve(import.meta.dirname, '..')

// 2026-09-06 16:45:00 Ortszeit, als Zahl statt als Datumstext: diese Sekunde stand schon an der
// Spitze der Staffelung von Hand, und sie zu halten heißt, daß die neue Reihe in demselben
// Nachmittag liegt statt irgendwo anders. Als Epoche geschrieben, weil ein Datumstext ohne
// Zeitzone auf einer anderen Maschine eine andere Sekunde ergäbe. Fest, damit ein zweiter Lauf
// dieselben Zahlen erzeugt - das Skript ist idempotent, nicht relativ zum Jetzt.
const ANCHOR = 1788705900
const STEP = 60

// Was eine Seite wird. `.excalidraw.md` ist schon `.md`; Bilder und Skripte sind keine Seiten.
const PAGE = /\.(md|base|canvas)$/i
// `assets` trägt keine Seiten, Punktordner (`.obsidian`, `.git`, `.claude`) gehören nicht zum Text.
const SKIP_DIRS = new Set(['assets'])

function title(file) {
  if (!file.endsWith('.md') || !fs.existsSync(file)) return null
  const text = fs.readFileSync(file, 'utf-8')
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!front) return null
  const line = /^title:[ \t]*(.+)$/m.exec(front[1])
  return line ? line[1].trim().replace(/^["']|["']$/g, '') : null
}

/** Wonach die Website sortiert: der Titel, sonst der Dateiname ohne Endung. */
function displayName(entry, isDir) {
  return (isDir ? title(path.join(entry, 'index.md')) : title(entry)) ?? path.basename(entry).replace(PAGE, '')
}

const collate = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })

function walk(dir, skip = new Set()) {
  const out = []
  const index = path.join(dir, 'index.md')
  if (fs.existsSync(index)) out.push(index)

  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.') && !SKIP_DIRS.has(e.name) && !skip.has(e.name))
    .filter((e) => (e.isDirectory() ? true : PAGE.test(e.name) && path.join(dir, e.name) !== index))
    .map((e) => ({ path: path.join(dir, e.name), isDir: e.isDirectory() }))
    .map((e) => ({ ...e, name: displayName(e.path, e.isDir) }))
    .sort((a, b) => collate(a.name, b.name))

  for (const e of entries) out.push(...(e.isDir ? walk(e.path) : [e.path]))
  return out
}

function relative(p) {
  return path.relative(VAULT, p)
}

function plan() {
  if (!fs.existsSync(VAULT)) throw new Error(`Vault fehlt: ${VAULT}`)
  const de = walk(VAULT, new Set(['en']))
  const en = walk(path.join(VAULT, 'en'))

  // Die zwei Bäume sind Spiegel voneinander, und diese Staffelung setzt das voraus: sie stellt
  // jedes Paar nebeneinander. Läuft einer davon aus dem Tritt, wird das gesagt statt still
  // weitergezählt - eine Seite ohne Gegenstück ist ein Befund über den Vault, kein Sonderfall hier.
  const warnings = []
  if (de.length !== en.length) {
    warnings.push(`${de.length} deutsche Seiten, ${en.length} englische - die Bäume sind nicht deckungsgleich.`)
  }
  const depth = (p, root) => path.relative(root, p).split(path.sep).length
  for (let i = 0; i < Math.min(de.length, en.length); i++) {
    const dd = depth(de[i], VAULT)
    const ed = depth(en[i], path.join(VAULT, 'en'))
    if (dd !== ed) {
      warnings.push(`Paar ${i + 1} sitzt verschieden tief: ${relative(de[i])} (${dd}) / ${relative(en[i])} (${ed}).`)
      break
    }
  }

  const order = []
  for (let i = 0; i < Math.max(de.length, en.length); i++) {
    if (de[i]) order.push(de[i])
    if (en[i]) order.push(en[i])
  }
  return { order: order.map((file, i) => ({ file, mtime: ANCHOR - i * STEP })), warnings }
}

const stamp = (seconds) => new Date(seconds * 1000).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'medium' })

function backupPath() {
  const name = `mtimes-${path.basename(VAULT)}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  return path.join(APP_DIR, name)
}

function apply(entries) {
  const backup = { vault: VAULT, takenAt: new Date().toISOString(), files: {} }
  for (const { file } of entries) {
    const s = fs.statSync(file)
    backup.files[relative(file)] = { atimeMs: s.atimeMs, mtimeMs: s.mtimeMs }
  }
  const target = backupPath()
  fs.writeFileSync(target, JSON.stringify(backup, null, 2))
  console.log(`Sicherung: ${target}`)

  let changed = 0
  for (const { file, mtime } of entries) {
    const s = fs.statSync(file)
    if (Math.round(s.mtimeMs / 1000) === mtime) continue
    fs.utimesSync(file, s.atime, new Date(mtime * 1000))
    changed++
  }
  return changed
}

function restore(fromFile) {
  const data = JSON.parse(fs.readFileSync(fromFile, 'utf-8'))
  if (path.resolve(data.vault) !== VAULT) {
    throw new Error(`Die Sicherung gehört zu ${data.vault}, nicht zu ${VAULT}.`)
  }
  let restored = 0
  let missing = 0
  for (const [rel, times] of Object.entries(data.files)) {
    const file = path.join(VAULT, rel)
    if (!fs.existsSync(file)) {
      missing++
      continue
    }
    fs.utimesSync(file, new Date(times.atimeMs), new Date(times.mtimeMs))
    restored++
  }
  console.log(`${restored} Datei(en) zurückgesetzt${missing ? `, ${missing} nicht mehr vorhanden` : ''}.`)
}

const restoreFrom = flag('--restore')
if (restoreFrom) {
  restore(path.resolve(restoreFrom))
  process.exit(0)
}

const { order, warnings } = plan()
for (const w of warnings) console.warn(`  ! ${w}`)

const now = new Map(order.map(({ file }) => [file, Math.round(fs.statSync(file).mtimeMs / 1000)]))
const moving = order.filter(({ file, mtime }) => now.get(file) !== mtime)

console.log(`\n${order.length} Seiten in Gliederungsordnung, eine Minute je Schritt.`)
console.log(`  erste  ${stamp(order[0].mtime)}  ${relative(order[0].file)}`)
console.log(`  letzte ${stamp(order[order.length - 1].mtime)}  ${relative(order[order.length - 1].file)}`)
console.log(`\nDie fünf jüngsten - das ist der Kasten „zuletzt bearbeitet":`)
for (const { file, mtime } of order.slice(0, 5)) console.log(`  ${stamp(mtime)}  ${relative(file)}`)

if (argv.includes('--list')) {
  console.log('')
  for (const { file, mtime } of order) console.log(`  ${stamp(mtime)}  ${relative(file)}`)
}

if (argv.includes('--apply')) {
  console.log('')
  const changed = apply(order)
  console.log(`${changed} von ${order.length} Änderungszeiten gesetzt.`)
} else {
  console.log(`\n${moving.length} von ${order.length} Zeiten würden sich ändern. Mit --apply setzen.`)
}
