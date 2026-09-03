// Holt das git, das mit der App mitreist, und dünnt es aus.
//
// Warum überhaupt: git ist die einzige Voraussetzung, die Quartz selbst stellt und die diese App
// nicht erfüllen kann - ohne git kein `git clone` des Quartz-Repos beim Anlegen, keine Plugins aus
// einer Git-Quelle (Quartz installiert sie mit `git clone --depth 1`), kein Snapshot-Store. Auf
// einem frischen macOS heißt "git installieren" außerdem: Xcode-Kommandozeilenwerkzeuge, mehrere
// Gigabyte, für einen Klon. Deshalb reist eines mit.
//
// Quelle ist dugite-native, das fertig gebaute git von GitHub Desktop (MIT-Wrapper, git selbst
// GPLv2 - siehe resources/licenses/git-LICENSE.txt und die Notiz in den Einstellungen).
//
// Ausgedünnt wird, was wir nachweislich nicht brauchen, und das ist der größere Teil:
//   * der Git Credential Manager samt .NET-Laufzeit - 104 MB von 141 im macOS-Bundle. Zugangsdaten
//     gehen in dieser App über GIT_ASKPASS (siehe syncService), nie über einen Helfer.
//   * git-lfs (12 MB) - Quartz-Inhalte sind Markdown.
//   * share/locale (12 MB, nur im Linux-Bundle) - das macOS-Bundle bringt gar keine Übersetzungen
//     mit, also spricht git dort ohnehin Englisch; wegwerfen macht beide Plattformen gleich.
//   * share/gitweb - ein CGI-Webinterface.
// Übrig bleiben rund 26 MB (macOS) bzw. 28 MB (Linux), mit denen `clone`, `init`, `commit` und
// `log` in einer leeren Umgebung nachweislich laufen.
import { createHash } from 'crypto'
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { readdir, rm, stat } from 'fs/promises'
import { spawnSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

// Eine Version, an einer Stelle. Beim Anheben auch resources/licenses/git-LICENSE.txt prüfen und die
// Fassung in den Einstellungen (settings.runtime.gitBundled) nachziehen.
export const GIT_VERSION = '2.53.0'
const RELEASE = `v${GIT_VERSION}`
const BUILD = '6981a1f'

// dugite-native benennt nach seinen Buildmaschinen, nicht nach Node-Konventionen.
const ASSETS = {
  'darwin-arm64': 'macOS-arm64',
  'darwin-x64': 'macOS-x64',
  'linux-arm64': 'ubuntu-arm64',
  'linux-x64': 'ubuntu-x64'
}

function log(message) {
  console.log(`[git] ${message}`)
}

async function download(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} für ${url}`)
  return response
}

async function downloadToFile(url, target) {
  const response = await download(url)
  await pipeline(Readable.fromWeb(response.body), createWriteStream(target))
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

// Entfernt rekursiv, was der Regel entspricht. Absichtlich nach Namen und nicht nach Größe: eine
// Größenregel würde beim nächsten git-Release still etwas anderes wegwerfen.
async function prune(dir) {
  const gitCore = join(dir, 'libexec/git-core')
  let removed = 0
  const remove = async (path) => {
    const size = await stat(path).then((s) => (s.isDirectory() ? 0 : s.size)).catch(() => 0)
    await rm(path, { recursive: true, force: true })
    removed += size
  }

  if (existsSync(gitCore)) {
    for (const entry of await readdir(gitCore)) {
      // .dll/.dylib/.json in git-core gehören ausschließlich zum Credential Manager - git selbst
      // legt dort keine ab (nachgezählt: 221 solche Dateien im macOS-Bundle, alle .NET).
      const isCredentialManager = /\.(dll|dylib|pdb|json)$/.test(entry) || entry.startsWith('git-credential-manager')
      if (isCredentialManager || entry === 'git-lfs') await remove(join(gitCore, entry))
    }
  }
  for (const path of ['share/locale', 'share/gitweb']) {
    const full = join(dir, path)
    if (existsSync(full)) {
      const before = dirSize(full)
      await rm(full, { recursive: true, force: true })
      removed += before
    }
  }
  return removed
}

function dirSize(dir) {
  const result = spawnSync('du', ['-sk', dir], { encoding: 'utf-8' })
  return result.status === 0 ? Number(result.stdout.split('\t')[0]) * 1024 : 0
}

function mb(bytes) {
  return `${(bytes / 1048576).toFixed(1)} MB`
}

/**
 * Legt `<dest>` an und füllt es mit dem ausgedünnten git für diese Plattform. Ein Aufruf für ein
 * Verzeichnis, das schon die richtige Fassung enthält, tut nichts - das Kennzeichen dafür ist
 * `.version`, geschrieben erst nach dem Ausdünnen, damit ein Abbruch mittendrin nicht als fertig
 * gilt.
 */
export async function fetchGit({ platform, arch, dest }) {
  const key = `${platform}-${arch}`
  const asset = ASSETS[key]
  if (!asset) throw new Error(`Keine git-Fassung für ${key} - bekannt sind ${Object.keys(ASSETS).join(', ')}`)

  const marker = join(dest, '.version')
  if (existsSync(marker) && readFileSync(marker, 'utf-8').trim() === RELEASE) {
    log(`${key}: ${RELEASE} liegt schon da (${mb(dirSize(dest))})`)
    return dest
  }

  const name = `dugite-native-${RELEASE}-${BUILD}-${asset}.tar.gz`
  const url = `https://github.com/desktop/dugite-native/releases/download/${RELEASE}/${name}`
  const tmp = join(root, 'node_modules/.cache/quartzcontrol-git')
  mkdirSync(tmp, { recursive: true })
  const archive = join(tmp, name)

  if (!existsSync(archive)) {
    log(`${key}: lade ${name}`)
    await downloadToFile(url, archive)
  }

  // Die Prüfsumme liegt als eigenes Asset neben dem Archiv. Ohne sie wäre das hier ein
  // "lade irgendetwas aus dem Netz und pack es in die App" - mit ihr ist es eine gepinnte Fassung.
  const expected = (await download(`${url}.sha256`).then((r) => r.text())).trim().split(/\s+/)[0]
  const actual = sha256(archive)
  if (expected !== actual) {
    rmSync(archive, { force: true })
    throw new Error(`Prüfsumme stimmt nicht für ${name}\n  erwartet: ${expected}\n  gelesen:  ${actual}`)
  }

  rmSync(dest, { recursive: true, force: true })
  mkdirSync(dest, { recursive: true })
  const untar = spawnSync('tar', ['xzf', archive, '-C', dest], { stdio: 'inherit' })
  if (untar.status !== 0) throw new Error(`tar konnte ${name} nicht auspacken`)

  const full = dirSize(dest)
  const removed = await prune(dest)
  log(`${key}: ${mb(full)} ausgepackt, ${mb(removed)} ausgedünnt, ${mb(dirSize(dest))} bleiben`)

  const git = join(dest, 'bin/git')
  if (!existsSync(git)) throw new Error(`nach dem Ausdünnen fehlt ${git}`)
  writeFileSync(marker, `${RELEASE}\n`, 'utf-8')
  return dest
}

// Direkt aufgerufen: `node scripts/fetch-git.mjs [platform] [arch]`, Vorgabe ist dieser Rechner.
if (process.argv[1] && statSync(process.argv[1]).isFile() && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const platform = process.argv[2] ?? process.platform
  const arch = process.argv[3] ?? process.arch
  fetchGit({ platform, arch, dest: join(root, 'resources/git', `${platform}-${arch}`) }).catch((error) => {
    console.error(`[git] ${error.message}`)
    process.exit(1)
  })
}
