// Where the example template comes from when a project is created with it.
//
// Two sources, in this order:
//
//   1. GitHub. The package is a file in a public repository, fetched over plain HTTPS - no API
//      call, no token, no rate limit. That is what makes the template updatable without shipping a
//      new build of the app: a push to that repository reaches everyone's next project.
//   2. The copy that ships inside the app (extraResources). It is what makes the feature work on a
//      train, behind a captive portal, and on the day GitHub is down - and it is what a first run
//      uses, because nothing has been downloaded yet.
//
// A download is cached in userData and used for a day before the app asks again; a failed check
// silently keeps whatever is cached, and failing that the bundled copy. The one thing this must
// never do is make creating a project depend on the network, so every failure path ends at a
// package that can be *read* - which is not the same as a file that exists, and was the bug: a
// half-written cache file is still a file, and it beat the bundled copy for a whole day.
import { app, net } from 'electron'
import { existsSync } from 'fs'
import { mkdir, open, readFile, rename, rm, stat } from 'fs/promises'
import { join } from 'path'
import { readZip, readZipFile } from './zipArchive'
import { MANIFEST_FILE } from './templatePackage/shared'

/**
 * The published package. A raw file rather than a release asset: a release asset in a *private*
 * repository needs a token, and the point of this URL is that an app in someone else's hands can
 * read it without one.
 */
export const TEMPLATE_URL =
  'https://raw.githubusercontent.com/boxi-os/quartzcontrol-templates/main/minimal-lesbar.qtpl'

const TEMPLATE_FILENAME = 'minimal-lesbar.qtpl'
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const TIMEOUT_MS = 15_000
// A template is a design plus, in this one case, its manual. Anything past this is not that, and
// downloading it into a project-creation dialog would be a surprise rather than a convenience.
const MAX_BYTES = 25 * 1024 * 1024

function bundledPath(): string {
  const packaged = join(process.resourcesPath, 'templates', TEMPLATE_FILENAME)
  if (existsSync(packaged)) return packaged
  return join(app.getAppPath(), 'resources/templates', TEMPLATE_FILENAME)
}

function cachedPath(): string {
  return join(app.getPath('userData'), 'templates', TEMPLATE_FILENAME)
}

async function ageMs(path: string): Promise<number> {
  try {
    return Date.now() - (await stat(path)).mtimeMs
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

// Temp file plus rename, and the same fsync jsonStore does for the same reason: the crash window a
// rename alone leaves open is the one where the directory entry lands before the data. A plain
// writeFile here left a torso behind when the app died mid-download - and that torso then beat the
// bundled copy for a day, because "the file exists" was all getBuiltinTemplate asked.
async function writeAtomically(target: string, data: Buffer): Promise<void> {
  const tmp = `${target}.tmp-${process.pid}`
  try {
    const handle = await open(tmp, 'w')
    try {
      await handle.writeFile(data)
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(tmp, target)
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => undefined)
    throw err
  }
}

/**
 * Downloads the package if the cached copy is missing or older than a day. Answers false on every
 * failure - a caller is expected to fall back, not to report an error: a project creation that
 * stops because a template could not be refreshed would be worse than one that uses yesterday's.
 */
async function refresh(): Promise<boolean> {
  try {
    // `net.fetch` rather than global fetch: it goes through Chromium's stack, which means the
    // machine's proxy configuration and its certificate store apply - the two things that decide
    // whether this works inside a company network.
    const res = await net.fetch(TEMPLATE_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) return false
    const data = Buffer.from(await res.arrayBuffer())
    if (data.length === 0 || data.length > MAX_BYTES) return false
    // Two magic bytes used to be the whole check, which separated a template from a captive
    // portal's login page and from nothing else. Reading the archive properly is the check: readZip
    // walks the central directory and verifies every entry's CRC, and a package without a manifest
    // is not one. What gets cached is therefore a package this app can open, not merely a file.
    if (!readZip(data).has(MANIFEST_FILE)) return false
    await mkdir(join(app.getPath('userData'), 'templates'), { recursive: true })
    await writeAtomically(cachedPath(), data)
    return true
  } catch {
    return false
  }
}

export interface BuiltinTemplate {
  path: string
  source: 'downloaded' | 'bundled'
}

// "It exists" is not "it can be read", and the difference is the whole of this finding: an
// unreadable copy handed out here makes planImport answer null, and the wizard then creates a
// project without the template it promised. Measured on the real package - 552 kB, 323 entries -
// reading it whole takes 7 ms, which is nothing next to the dialog this runs behind.
async function isReadablePackage(path: string): Promise<boolean> {
  try {
    return (await readZipFile(path)).has(MANIFEST_FILE)
  } catch {
    return false
  }
}

// A cached copy that cannot be read is not merely skipped but deleted: its mtime would otherwise
// keep ageMs under a day and block the re-download that repairs it. One download is then attempted
// on the spot, so the recovery is now rather than tomorrow.
async function cacheIsUsable(cached: string): Promise<boolean> {
  if (!existsSync(cached)) return false
  if (await isReadablePackage(cached)) return true
  await rm(cached, { force: true }).catch(() => undefined)
  return refresh()
}

/** The best package available right now, and where it came from. Never throws. */
export async function getBuiltinTemplate(): Promise<BuiltinTemplate | null> {
  const cached = cachedPath()
  if ((await ageMs(cached)) > MAX_AGE_MS) await refresh()
  if (await cacheIsUsable(cached)) return { path: cached, source: 'downloaded' }
  const bundled = bundledPath()
  if (await isReadablePackage(bundled)) return { path: bundled, source: 'bundled' }
  return null
}

/**
 * The package's own manifest, for the wizard's description and part list. Read from whichever copy
 * getBuiltinTemplate() picks, so what the dialog promises is what would be applied.
 */
export async function readBundledManifest(): Promise<Buffer | null> {
  const template = await getBuiltinTemplate()
  if (!template) return null
  try {
    return await readFile(template.path)
  } catch {
    return null
  }
}
