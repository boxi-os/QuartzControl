// Die erfundenen Daten für `npm run screenshots -- --demo` und das Einrichten des Profils, in dem
// sie leben.
//
// Warum überhaupt: Ein Screenshot aus dem echten Profil zeigt, was auf diesem Rechner eingerichtet
// ist - am 2026-09-07 waren das der Hostname, zwei Benutzernamen und ein Host-Key-Fingerprint eines
// echten Hosting-Kontos, dazu drei Wegwerf-Projekte in der Liste. Für ein Handbuch taugt beides
// nicht, und für den umgekehrten Fall - eine Seite über Veröffentlichungsziele, während das Projekt
// keines hat - auch nicht.
//
// Alle Namen liegen unter example.com; RFC 2606 hält die Domain genau für Dokumentation frei.
//
// Das Profil ist ein Wegwerf-Verzeichnis, die Projekte sind es nicht: Die Ziele liegen in
// `<projekt>/.quartz-gui/publish-targets.json` eines echten Projekts. Die Datei wird deshalb vor dem
// Eintragen gemerkt und am Ende des Laufs zurückgeschrieben - siehe `lendProjectTargets()`.
import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { projectPath } from './project-paths.mjs'

/** Ein frisches Profilverzeichnis je Lauf: Was hier steht, hat dieses Skript hineingeschrieben. */
export const DEMO_PROFILE = path.join(os.tmpdir(), 'quartzcontrol-screenshots-profile')

export const DEMO_CONNECTIONS = [
  {
    kind: 'ssh',
    name: 'Webspace',
    host: 'sftp.example.com',
    port: 22,
    username: 'demo',
    authMethod: 'privateKey',
    keyPath: path.join(os.homedir(), '.ssh/id_ed25519')
  },
  {
    kind: 'ftp',
    name: 'Alter Webspace',
    host: 'ftp.example.com',
    port: 21,
    username: 'demo',
    secure: true,
    // Ohne Geheimnis trägt der Eintrag das orange Abzeichen "kein Passwort/Key" - richtig, aber im
    // Handbuch sieht es nach einem Fehler aus statt nach einem eingerichteten Zugang.
    secret: 'demo'
  },
  { kind: 'webhook', name: 'Build-Hook', secret: 'https://hooks.example.com/build/DEMO' }
]

/** Auf welche Verbindung ein Ziel zeigt, steht als Name darin - die id entsteht erst beim Anlegen. */
export const DEMO_TARGETS = [
  {
    name: 'Webspace',
    connection: 'Webspace',
    destination: { type: 'sftp', remotePath: 'httpdocs', transfer: 'sftp', deleteRemoved: false }
  },
  {
    name: 'GitHub Pages',
    destination: { type: 'git-branch', branch: 'gh-pages', provider: 'github' }
  },
  {
    name: 'Archivordner',
    destination: { type: 'folder', path: path.join(os.homedir(), 'Documents/website-archiv'), deleteRemoved: false }
  }
]

/** Welche Projekte in der Liste stehen sollen, in dieser Reihenfolge. */
export const DEMO_PROJECTS = [projectPath('QuartzControl-Handbuch'), projectPath('Example')]

/**
 * Gegen welches Projekt aufgenommen wird, aus einer Projektliste gewählt - eine Stelle für beide
 * Modi.
 *
 * Mit `--demo` war es DEMO_PROJECTS[0], ohne suchte `screenshots.mjs` sich selbst eines, das auf
 * „Example“ endet: zwei Vorgaben für dieselbe Frage, und wer vom dokumentierten Weg abweicht,
 * bekommt andere Bilder als das Handbuch zeigt (fünfundzwanzigstes Review, Befund 9). Es gewinnt
 * die des Demo-Modus, weil das die Bilder sind, die im Handbuch stehen. Der Basisname als zweiter
 * Versuch, damit ein Projekt, das an anderer Stelle liegt als `projectPath()` erwartet, trotzdem
 * dieses ist.
 */
export function shootProject(list) {
  if (!Array.isArray(list) || list.length === 0) return null
  const wanted = DEMO_PROJECTS[0]
  const base = path.basename(wanted)
  return list.find((p) => p.path === wanted) ?? list.find((p) => path.basename(p.path) === base) ?? list[0]
}

export function resetDemoProfile() {
  fs.rmSync(DEMO_PROFILE, { recursive: true, force: true })
  fs.mkdirSync(DEMO_PROFILE, { recursive: true })
}

/**
 * Trägt Projekte, Zugänge und Ziele über dieselben IPC-Pfade ein, die ein Klick nimmt - kein
 * zweiter Schreiber für publish-targets.json, der irgendwann anders aussieht als der echte.
 * Gibt die id des Projekts zurück, gegen das aufgenommen wird.
 */
export async function seedDemoProfile(page, ipc) {
  const registered = []
  for (const p of DEMO_PROJECTS) {
    if (!fs.existsSync(path.join(p, 'quartz.config.yaml'))) {
      console.warn(`  (übersprungen, kein Quartz-Projekt: ${p})`)
      continue
    }
    const added = await ipc(page, (a) => window.quartzGui.projects.add(a.path), { path: p })
    // Sonst steht in der Liste zweimal "Noch nie geöffnet" - wahr für ein frisches Profil, aber
    // kein Bild dessen, was jemand sieht, der die App benutzt.
    await ipc(page, (a) => window.quartzGui.projects.open(a.id), { id: added.id })
    registered.push(added)
  }
  if (registered.length === 0) throw new Error('Keines der Demo-Projekte ist ein Quartz-Projekt.')

  const saved = []
  for (const c of DEMO_CONNECTIONS) {
    saved.push(await ipc(page, (a) => window.quartzGui.connections.save(a.input), { input: c }))
  }
  const byName = new Map(saved.map((c) => [c.name, c.id]))

  // Die Ziele gehören ins Projekt, nicht ins Profil - deshalb nur ins erste. Geliehen, nicht
  // geschenkt: Was vorher in dessen publish-targets.json stand, steht nach dem Lauf wieder da.
  const project = DEMO_PROJECTS[0]
  lendProjectTargets(project)
  // Die Ziele liegen im Projekt und überleben das Wegwerf-Profil, die Zugänge nicht: Jeder Lauf legt
  // sie mit neuen IDs an. Ein vorhandenes Ziel zu überspringen hieß deshalb, die Zugangs-ID eines
  // früheren Laufs stehen zu lassen - die Veröffentlichen-Seite zeigte dann nur den Serverpfad statt
  // `demo@sftp.example.com:22 → httpdocs` samt Host-Key, und an den Zugängen fehlte die Zahl der
  // Projekte (bemerkt am 2026-09-14 beim Abgleich der Handbuchtexte mit den Bildern). Ein vorhandenes
  // Ziel wird also mit seiner ID neu geschrieben, nicht übersprungen. Das darf es nur, weil
  // `lendProjectTargets()` oben die Datei zurückgibt: Ein echtes Ziel namens „GitHub Pages“ trägt
  // während des Laufs die Demo-Werte und danach wieder seine eigenen.
  const existing = await ipc(page, (a) => window.quartzGui.publishTargets.list(a.path), { path: project })
  const idByName = new Map(existing.map((t) => [t.name, t.id]))
  for (const t of DEMO_TARGETS) {
    const input = { name: t.name, destination: t.destination }
    if (idByName.has(t.name)) input.id = idByName.get(t.name)
    if (t.connection) input.connectionId = byName.get(t.connection)
    await ipc(page, (a) => window.quartzGui.publishTargets.save(a.path, a.input), { path: project, input })
  }

  console.log(
    `  Profil: ${registered.length} Projekte, ${saved.length} Zugänge, ` +
      `${DEMO_TARGETS.length} Ziele in ${path.basename(project)}`
  )
  return registered[0]?.id ?? null
}

/**
 * Merkt sich die publish-targets.json eines echten Projekts - auch, dass sie fehlt - und schreibt
 * diesen Stand zurück, wenn der Prozess endet.
 *
 * Über das `exit`-Ereignis statt über ein `finally` in screenshots.mjs: Zwischen dem Eintragen und
 * dem Ende liegen dort zwei `process.exit(2)` (kein Projekt, `--only` ohne Treffer), und ein
 * `finally` um den Rest der Datei liefe bei keinem von beiden. `exit` feuert bei `process.exit()`,
 * am natürlichen Ende und nach einem unbehandelten Fehler; Ctrl+C beendet Node dagegen ohne
 * `exit`, deshalb die zwei Signale. Der Handler muss synchron sein - `exit` wartet auf nichts.
 *
 * Zurückgeschrieben wird mit Bytes statt über den IPC-Kanal: Die App ist dann schon geschlossen,
 * und `publishTargets.save` kann eine Datei nicht löschen. Atomar über Temp-Datei und rename, weil
 * die App, falls sie doch noch läuft, dieselbe Datei liest.
 */
export function lendProjectTargets(project) {
  const dir = path.join(project, '.quartz-gui')
  const file = path.join(dir, 'publish-targets.json')
  const hadDir = fs.existsSync(dir)
  const before = fs.existsSync(file) ? fs.readFileSync(file) : null
  let restored = false
  const restore = () => {
    if (restored) return
    restored = true
    try {
      if (before) {
        const tmp = `${file}.${process.pid}.tmp`
        fs.writeFileSync(tmp, before)
        fs.renameSync(tmp, file)
      } else {
        fs.rmSync(file, { force: true })
        // Hat erst dieser Lauf .quartz-gui/ angelegt und liegt nichts anderes darin, geht es mit.
        if (!hadDir) {
          try {
            fs.rmdirSync(dir)
          } catch {
            // nicht leer: dann hat die App dort noch etwas Eigenes abgelegt, und das bleibt
          }
        }
      }
      console.log(`  Ziele in ${path.basename(project)} zurückgestellt (${before ? 'vorheriger Stand' : 'Datei entfernt'})`)
    } catch (err) {
      console.error(`  Ziele in ${path.basename(project)} NICHT zurückgestellt: ${err.message} - ${file}`)
    }
  }
  process.on('exit', restore)
  process.once('SIGINT', () => process.exit(130))
  process.once('SIGTERM', () => process.exit(143))
  return restore
}
