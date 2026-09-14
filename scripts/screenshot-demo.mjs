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

  // Die Ziele gehören ins Projekt, nicht ins Profil - deshalb nur ins erste, das uns gehört.
  const project = DEMO_PROJECTS[0]
  // Die Ziele liegen im Projekt und überleben das Wegwerf-Profil, die Zugänge nicht: Jeder Lauf legt
  // sie mit neuen IDs an. Ein vorhandenes Ziel zu überspringen hieß deshalb, die Zugangs-ID eines
  // früheren Laufs stehen zu lassen - die Veröffentlichen-Seite zeigte dann nur den Serverpfad statt
  // `demo@sftp.example.com:22 → httpdocs` samt Host-Key, und an den Zugängen fehlte die Zahl der
  // Projekte (bemerkt am 2026-09-14 beim Abgleich der Handbuchtexte mit den Bildern). Ein vorhandenes
  // Ziel wird also mit seiner ID neu geschrieben, nicht übersprungen.
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
