import { app } from 'electron'
import { execFileSync } from 'child_process'
import { existsSync } from 'fs'
import { delimiter, join } from 'path'
import { findExecutable, isCommandLineToolsStub } from './environmentService'

// git kommt vom Rechner, wenn es dort eines gibt, und sonst aus der App - die umgekehrte Regel zu
// der für Node (nodeRuntime.ts), und aus dem umgekehrten Grund. git hat keine Versionsuntergrenze,
// die Quartz oder diese App bräuchte, dafür trägt es die Einrichtung des Nutzers: seine
// ~/.gitconfig kann auf Zugangshelfer zeigen, die nur seine Installation hat - unser ausgedünntes
// Bundle bringt zum Beispiel `git-credential-osxkeychain` nicht mit. Node ist genau andersherum:
// harte Untergrenze, keine Konfiguration, die zu ehren wäre. Der gemeinsame Satz hinter beiden
// Entscheidungen: es gewinnt die Quelle, die die Anforderung garantiert erfüllt.
//
// "Es gibt dort eines" heißt: es antwortet auf `git --version`. Nicht: die Datei existiert. Auf
// einem macOS ohne Xcode-Kommandozeilenwerkzeuge liegt in /usr/bin/git ein Stub, der stattdessen
// einen Installer öffnet - genau auf den Rechnern, auf denen es kein git gibt, ist die Datei da.

export interface GitRuntime {
  source: 'host' | 'bundled'
  /** Absoluter Pfad auf die Binärdatei, die die App benutzen wird. */
  path: string
  version: string | null
}

/**
 * Warum das mitgelieferte git nicht benutzt wird, obwohl es dasteht. Der Unterschied ist keiner
 * für den Code - beide Fälle enden in `null` -, aber einer für den Satz, den der Nutzer liest:
 * `'incompatible'` heißt, dieses System kann die Datei nicht laden (zu alte Systembibliotheken -
 * das Bundle von dugite-native verlangt glibc 2.34, siehe
 * `docs/decisions/electron-runtime-and-packaging.md`), und dagegen hilft kein Neuinstallieren,
 * sondern ein git aus der Paketverwaltung. `'broken'` ist alles andere und heißt, was der Satz
 * für eingebettete Werkzeuge schon immer sagte: diese Installation ist unvollständig.
 */
export interface BundledGitFailure {
  path: string
  reason: 'incompatible' | 'broken'
}

let runtime: GitRuntime | null = null
let bundledFailure: BundledGitFailure | null = null

function bundleDir(): string {
  const packaged = join(process.resourcesPath, 'git')
  if (existsSync(packaged)) return packaged
  // In der Entwicklung liegt je Plattform ein eigenes Verzeichnis, geholt von scripts/fetch-git.mjs.
  return join(app.getAppPath(), 'resources/git', `${process.platform}-${process.arch}`)
}

/**
 * Die Meldungen, mit denen ein Loader sagt, dass er die Datei nicht laden *kann* - nicht, dass das
 * Programm darin einen Fehler hat. Dieselbe Liste benutzt `httpsHelperLoads()` weiter unten, und
 * aus demselben Grund: Ein Exit 127 und diese Sätze sind das, was von einem Programm übrigbleibt,
 * das nie angelaufen ist.
 */
const LOADER_FAILURE =
  /error while loading shared libraries|cannot open shared object|version `GLIBC_[\d.]+' not found|dyld: Library not loaded|Library not loaded:/

/** Führt `git --version` aus; `version` ist null, wenn die Datei nicht läuft. */
function probe(path: string, env?: NodeJS.ProcessEnv): { version: string | null; loaderFailure: boolean } {
  try {
    const out = execFileSync(path, ['--version'], {
      encoding: 'utf-8',
      timeout: 10_000,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...(env ? { env } : {})
    })
    return { version: out.trim().split('\n')[0] || null, loaderFailure: false }
  } catch (error) {
    const failure = error as { status?: number; stderr?: string | Buffer }
    const stderr = failure.stderr?.toString() ?? ''
    return { version: null, loaderFailure: failure.status === 127 || LOADER_FAILURE.test(stderr) }
  }
}

/** Führt `git --version` aus; null, wenn die Datei nicht läuft (der macOS-Stub tut das nicht). */
function probeVersion(path: string, env?: NodeJS.ProcessEnv): string | null {
  return probe(path, env).version
}

/**
 * Entscheidet, welches git die App benutzt, und richtet die Umgebung dafür ein. Einmal beim Start,
 * nach ensureToolPath() - das muss vorher gelaufen sein, sonst ist ein Host-git, das nur über den
 * Login-Shell-PATH erreichbar wäre, hier noch unsichtbar.
 *
 * Für das mitgelieferte git reichen PATH und die zwei Variablen, die git sonst aus seinem eigenen
 * Installationspräfix ableitet. Ohne sie sucht es unter "/" und bricht mit "unable to find remote
 * helper for 'https'" ab - gemessen mit `env -i`, wo es mit ihnen sauber klont.
 */
export function applyGitRuntime(): GitRuntime | null {
  if (runtime) return runtime

  const host = findExecutable('git')
  // Der Stub in /usr/bin/git wird nicht ausgeführt, sondern übersprungen: `git --version` ist dort
  // kein Test, sondern ein Installer-Dialog - und dieser Aufruf steht vor createWindow, also vor
  // dem eigenen Fenster. Siehe isCommandLineToolsStub.
  if (host && !isCommandLineToolsStub(host)) {
    const version = probeVersion(host)
    if (version) {
      runtime = { source: 'host', path: host, version }
      return runtime
    }
  }

  const dir = bundleDir()
  const path = join(dir, 'bin/git')
  if (!existsSync(path)) return null

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_EXEC_PATH: join(dir, 'libexec/git-core'),
    GIT_TEMPLATE_DIR: join(dir, 'share/git-core/templates')
  }
  // Nur das Linux-Bundle bringt einen eigenen Zertifikatsspeicher mit; macOS holt sich die
  // Wurzelzertifikate über Secure Transport und braucht die Variable nicht.
  const caBundle = join(dir, 'ssl/cacert.pem')
  if (existsSync(caBundle)) env.GIT_SSL_CAINFO = caBundle

  const answer = probe(path, env)
  if (!answer.version) {
    bundledFailure = { path, reason: answer.loaderFailure ? 'incompatible' : 'broken' }
    return null
  }
  // Ein Helfer, dem eine Bibliothek fehlt, ist derselbe Befund wie ein git, das gar nicht anläuft:
  // die Datei passt nicht zu diesem System. Dass `git --version` vorher geantwortet hat, ändert
  // daran nichts - es ist die Binärdatei, die nichts nachlädt.
  if (!httpsHelperLoads(dir, env)) {
    bundledFailure = { path, reason: 'incompatible' }
    return null
  }

  // Erst schreiben, wenn die Binärdatei geantwortet hat: eine halb gesetzte Umgebung wäre
  // schlimmer als gar keine, weil sie auch ein später gefundenes Host-git verbiegen würde.
  Object.assign(process.env, {
    GIT_EXEC_PATH: env.GIT_EXEC_PATH,
    GIT_TEMPLATE_DIR: env.GIT_TEMPLATE_DIR,
    ...(env.GIT_SSL_CAINFO ? { GIT_SSL_CAINFO: env.GIT_SSL_CAINFO } : {})
  })
  process.env.PATH = [join(dir, 'bin'), ...(process.env.PATH ?? '').split(delimiter).filter(Boolean)].join(delimiter)

  runtime = { source: 'bundled', path, version: answer.version }
  return runtime
}

// `git --version` zu bestehen heißt nicht, klonen zu können. Das mitgelieferte Linux-git bringt
// keine einzige Bibliothek mit (nachgesehen: keine .so im ganzen Bundle), und während die
// Hauptbinärdatei nur libz und libc braucht, hängt `git-remote-http` an libcurl-gnutls.so.4 - ein
// SONAME, den es auf Debian und Ubuntu gibt, in der Flatpak-Runtime und auf Fedora oder Arch aber
// nicht. Ein git, das auf `--version` antwortet und beim ersten `clone` am Nachladen scheitert,
// wäre genau die Sorte "kann nicht prüfen als alles gut", die diese App sonst vermeidet.
//
// Der Helfer ohne Argumente ist dafür der billigste Test: er beschwert sich über die fehlende URL
// (Exit 1, gemessen), *nachdem* der Loader ihn vollständig geladen hat. Fehlt eine Bibliothek,
// kommt er nie so weit - der Loader meldet es und beendet mit 127.
function httpsHelperLoads(dir: string, env: NodeJS.ProcessEnv): boolean {
  const helper = join(dir, 'libexec/git-core/git-remote-https')
  if (!existsSync(helper)) return false
  try {
    execFileSync(helper, { encoding: 'utf-8', timeout: 10_000, stdio: ['ignore', 'ignore', 'pipe'], env })
    return true
  } catch (error) {
    const failure = error as { status?: number; stderr?: string }
    if (failure.status === 127) return false
    return !/error while loading shared libraries|cannot open shared object|dyld: Library not loaded/.test(
      failure.stderr ?? ''
    )
  }
}

/** Was aufgelöst wurde, für die Startseite und die Einstellungen. Null vor applyGitRuntime(). */
export function gitRuntime(): GitRuntime | null {
  return runtime
}

/**
 * Das mitgelieferte git, das dasteht und nicht läuft - null, wenn keines gebraucht wurde oder
 * keines da ist. Ohne diese Auskunft sucht das Warnband git auf dem PATH, findet nichts (der
 * Bundle-Ordner kommt ja gerade nicht dorthin) und meldet „nicht gefunden“ für eine Datei, die
 * im Paket liegt.
 */
export function bundledGitFailure(): BundledGitFailure | null {
  return runtime ? null : bundledFailure
}
