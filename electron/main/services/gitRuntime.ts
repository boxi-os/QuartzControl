import { app } from 'electron'
import { execFileSync } from 'child_process'
import { existsSync } from 'fs'
import { delimiter, join } from 'path'
import { findExecutable } from './environmentService'

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

let runtime: GitRuntime | null = null

function bundleDir(): string {
  const packaged = join(process.resourcesPath, 'git')
  if (existsSync(packaged)) return packaged
  // In der Entwicklung liegt je Plattform ein eigenes Verzeichnis, geholt von scripts/fetch-git.mjs.
  return join(app.getAppPath(), 'resources/git', `${process.platform}-${process.arch}`)
}

/** Führt `git --version` aus; null, wenn die Datei nicht läuft (der macOS-Stub tut das nicht). */
function probeVersion(path: string, env?: NodeJS.ProcessEnv): string | null {
  try {
    const out = execFileSync(path, ['--version'], {
      encoding: 'utf-8',
      timeout: 10_000,
      stdio: ['ignore', 'pipe', 'ignore'],
      ...(env ? { env } : {})
    })
    return out.trim().split('\n')[0] || null
  } catch {
    return null
  }
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
  if (host) {
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

  const version = probeVersion(path, env)
  if (!version) return null
  if (!httpsHelperLoads(dir, env)) return null

  // Erst schreiben, wenn die Binärdatei geantwortet hat: eine halb gesetzte Umgebung wäre
  // schlimmer als gar keine, weil sie auch ein später gefundenes Host-git verbiegen würde.
  Object.assign(process.env, {
    GIT_EXEC_PATH: env.GIT_EXEC_PATH,
    GIT_TEMPLATE_DIR: env.GIT_TEMPLATE_DIR,
    ...(env.GIT_SSL_CAINFO ? { GIT_SSL_CAINFO: env.GIT_SSL_CAINFO } : {})
  })
  process.env.PATH = [join(dir, 'bin'), ...(process.env.PATH ?? '').split(delimiter).filter(Boolean)].join(delimiter)

  runtime = { source: 'bundled', path, version }
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
