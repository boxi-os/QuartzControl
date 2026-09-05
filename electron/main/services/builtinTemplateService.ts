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
// never do is make creating a project depend on the network, so every failure path ends at a file
// that exists.
import { app, net } from 'electron'
import { existsSync } from 'fs'
import { mkdir, readFile, stat, writeFile } from 'fs/promises'
import { join } from 'path'

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
    // A .qtpl is a ZIP. Checking the two magic bytes costs nothing and is the difference between
    // caching a template and caching a captive portal's login page.
    if (data[0] !== 0x50 || data[1] !== 0x4b) return false
    const target = cachedPath()
    await mkdir(join(app.getPath('userData'), 'templates'), { recursive: true })
    await writeFile(target, data)
    return true
  } catch {
    return false
  }
}

export interface BuiltinTemplate {
  path: string
  source: 'downloaded' | 'bundled'
}

/** The best package available right now, and where it came from. Never throws. */
export async function getBuiltinTemplate(): Promise<BuiltinTemplate | null> {
  const cached = cachedPath()
  if ((await ageMs(cached)) > MAX_AGE_MS) await refresh()
  if (existsSync(cached)) return { path: cached, source: 'downloaded' }
  const bundled = bundledPath()
  if (existsSync(bundled)) return { path: bundled, source: 'bundled' }
  return null
}

/** What the create wizard shows before anything is downloaded: is there a template to offer at all? */
export async function builtinTemplateAvailable(): Promise<boolean> {
  return existsSync(cachedPath()) || existsSync(bundledPath())
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
