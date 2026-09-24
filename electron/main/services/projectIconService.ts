import { nativeImage } from 'electron'
import { createHash } from 'crypto'
import { existsSync, statSync } from 'fs'
import { copyFile, mkdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, extname, join } from 'path'
import type { ProjectIconInfo } from '@shared/ipc-contract'
import { quartzGuiDir, quartzGuiPath } from './projectDirs'
import { readJsonFileOr, writeJsonFile } from './jsonStore'
import { mainT } from '../i18n'

// The project's picture and the site's favicon are the same file, and the file is the one
// @quartz-community/favicon reads: its emitter (verified against the installed dist/index.js)
// hardcodes `quartz/static/icon.png`, resizes it to 48x48 with sharp and writes favicon.ico into
// the build output. It has no options, so there is no other path to point it at - and a second
// copy of the image somewhere in .quartz-gui/ could only ever drift from the one that ships.
function iconPath(projectPath: string): string {
  return join(projectPath, 'quartz', 'static', 'icon.png')
}

// The optional second picture, for the dark scheme. Only the header image uses it (see
// shared/projectImageBox.ts) - the favicon emitter reads icon.png and nothing else. Quartz ships no
// file of this name, so removing it is a plain delete: there is no original to restore. But its
// presence is not the answer to "did the user choose one" either: every template package ships one
// since 2026-09-24 (`cf91aba`), and until the thirty-seventh review (finding 1) an import called
// that file the user's own and kept it, while it replaced the icon.png beside it.
function darkIconPath(projectPath: string): string {
  return join(projectPath, 'quartz', 'static', 'icon-dark.png')
}

// Quartz ships its own icon.png in every project (checked in three real ones), so the file is
// never missing and the favicon emitter never fails - which also means "there is a file" cannot
// tell us whether the *user* chose it. Without that distinction every project would show the same
// stock icon instead of its distinguishing letter avatar, so the answer is recorded rather than
// guessed: this marker is written when an image is assigned here, and the displaced original is
// kept next to it so removing the image restores what the project had.
const MARKER_FILE = 'project-icon.json'
const ORIGINAL_FILE = 'icon-original.png'

interface IconMarker {
  custom: boolean
  /** Whether the icon.png that was displaced is kept in ORIGINAL_FILE. False when there was none. */
  hasOriginal: boolean
  /** Whether icon-dark.png was chosen in this app. */
  customDark: boolean
}

const NO_MARKER: IconMarker = { custom: false, hasOriginal: false, customDark: false }

// The longest edge an icon is stored at. The favicon emitter only ever needs 48px; the rest is
// headroom for whatever a later use (an og-image, a retina avatar) wants, and it keeps a 4000px
// photo out of what is usually a public git repo.
const MAX_STORED_EDGE = 512
// What the avatars are rendered at: 36px in the sidebar, 40px on the start screen, doubled for a
// retina panel. One size for both, because both read from the same cache.
const THUMBNAIL_EDGE = 128

const ACCEPTED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg'])

async function readMarker(projectPath: string): Promise<IconMarker> {
  // A read path must not create .quartz-gui/ - see quartzGuiPath.
  const raw = await readJsonFileOr<Partial<IconMarker>>(quartzGuiPath(projectPath, MARKER_FILE), NO_MARKER)
  const custom = raw.custom === true
  return {
    custom,
    hasOriginal: raw.hasOriginal === true,
    // A marker written before `customDark` existed. Up to then the card only let a dark picture be
    // chosen once a light one was (`disabled={!icon?.custom}`), so an icon-dark.png next to a
    // recorded icon.png is the user's, and one without is not - a template's.
    customDark: typeof raw.customDark === 'boolean' ? raw.customDark : custom && existsSync(darkIconPath(projectPath))
  }
}

async function writeMarker(projectPath: string, marker: IconMarker): Promise<void> {
  // Nothing left to record: the file goes, so a read gets NO_MARKER rather than a legacy guess.
  if (!marker.custom && !marker.customDark) {
    await rm(quartzGuiPath(projectPath, MARKER_FILE), { force: true })
    return
  }
  await writeJsonFile(join(quartzGuiDir(projectPath), MARKER_FILE), marker)
}

// Decoding a PNG on every read would happen once per project on every start-screen refresh, so the
// result is kept until the file itself changes. Keyed by path plus mtime and size: an icon that is
// replaced (by us, by a git checkout, by hand) has a different one of the two.
const thumbnails = new Map<string, { mtimeMs: number; size: number; dataUrl: string }>()

function thumbnailFor(path: string): string | null {
  let stat: ReturnType<typeof statSync>
  try {
    stat = statSync(path)
  } catch {
    return null
  }
  const cached = thumbnails.get(path)
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached.dataUrl

  const image = nativeImage.createFromPath(path)
  if (image.isEmpty()) return null
  const dataUrl = fit(image, THUMBNAIL_EDGE).toDataURL()
  thumbnails.set(path, { mtimeMs: stat.mtimeMs, size: stat.size, dataUrl })
  return dataUrl
}

// Scales down to fit a square of `edge`, never up, and only ever constrains the longer side so
// nativeImage keeps the aspect ratio itself (passing both would stretch a non-square icon).
function fit(image: Electron.NativeImage, edge: number): Electron.NativeImage {
  const { width, height } = image.getSize()
  if (width <= edge && height <= edge) return image
  return width >= height ? image.resize({ width: edge, quality: 'best' }) : image.resize({ height: edge, quality: 'best' })
}

/**
 * The files under quartz/static that are the user's picture rather than a design: each only when
 * this app recorded that the user chose it (the marker). Quartz ships its own icon.png and every
 * template an icon-dark.png, so neither file alone says anything. A template import leaves these
 * alone (templatePackage/parts.ts, static).
 */
export async function userChosenStaticFiles(projectPath: string): Promise<Set<string>> {
  const marker = await readMarker(projectPath)
  const names = new Set<string>()
  if (marker.custom) names.add('icon.png')
  if (marker.customDark && existsSync(darkIconPath(projectPath))) names.add('icon-dark.png')
  return names
}

/**
 * Whether icon-dark.png is there and nobody recorded choosing it - in practice a template's. The
 * counterpart of hasUnrecordedIcon without the Quartz blob to compare against: Quartz ships none.
 */
export async function hasUnrecordedDarkIcon(projectPath: string): Promise<boolean> {
  return existsSync(darkIconPath(projectPath)) && !(await readMarker(projectPath)).customDark
}

// The git blob id of the icon.png Quartz ships. One since the file was added (2023-05-30,
// `ad6ce0d`), measured on 2026-09-24: `git log --all -- quartz/static/icon.png` in a v5 clone has
// that one commit, and all eight projects on this machine without a picture of their own carry
// this blob. A git blob id rather than a sha256 so it can be checked with `git hash-object`.
const QUARTZ_ICON_BLOB = 'b6656a7a819cf41ba6502b9eddf4e580617bbaba'

function gitBlobId(data: Buffer): string {
  return createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex')
}

/**
 * Whether icon.png is a picture nobody recorded: not Quartz's own, and not chosen in this app.
 * The marker lives in .quartz-gui/, which git ignores, so a project cloned through Git-Sync has the
 * user's picture and no marker - and a template import treated it as a design file like any other
 * (thirty-sixth review, finding 7). It cannot be told apart from a picture an earlier template
 * brought (every package ships an icon.png), so this does not protect the file; it makes the
 * import's dry run name it before "the template wins" replaces it, and it keeps the Projektbild
 * card from saying the site shows Quartz's icon when it shows a template's mark.
 */
export async function hasUnrecordedIcon(projectPath: string): Promise<boolean> {
  if ((await readMarker(projectPath)).custom) return false
  try {
    return gitBlobId(await readFile(iconPath(projectPath))) !== QUARTZ_ICON_BLOB
  } catch {
    return false
  }
}

export async function getProjectIcon(projectPath: string): Promise<ProjectIconInfo> {
  const path = iconPath(projectPath)
  const marker = await readMarker(projectPath)
  const image = existsSync(path) ? nativeImage.createFromPath(path) : null
  const size = image && !image.isEmpty() ? image.getSize() : null
  return {
    dataUrl: thumbnailFor(path),
    custom: marker.custom && size !== null,
    width: size?.width ?? 0,
    height: size?.height ?? 0,
    darkDataUrl: existsSync(darkIconPath(projectPath)) ? thumbnailFor(darkIconPath(projectPath)) : null,
    darkCustom: marker.customDark && existsSync(darkIconPath(projectPath)),
    unrecorded: await hasUnrecordedIcon(projectPath)
  }
}

// PNG and JPEG in, a PNG of at most MAX_STORED_EDGE out - a PNG that already fits byte for byte.
// Checks now and writes on the call it returns: setProjectIcon moves the original aside in between,
// and only for a file that is known to be stored. Both pictures go through this one function; until
// 2026-09-16 setProjectIcon kept its own copy of every step (review finding 8).
function prepareImage(sourcePath: string): (target: string) => Promise<void> {
  const ext = extname(sourcePath).toLowerCase()
  if (!ACCEPTED_EXTENSIONS.has(ext)) throw new Error(mainT('projectIconUnsupportedFormat'))
  const image = nativeImage.createFromPath(sourcePath)
  // Covers a file that carries the right extension but is not an image, and the formats
  // nativeImage cannot decode (SVG among them) - both arrive here as an empty image.
  if (image.isEmpty()) throw new Error(mainT('projectIconUnreadable'))
  return async (target) => {
    await mkdir(dirname(target), { recursive: true })
    const scaled = fit(image, MAX_STORED_EDGE)
    if (ext === '.png' && scaled === image) await copyFile(sourcePath, target)
    else await writeFile(target, scaled.toPNG())
  }
}

/** Writes the dark-scheme picture to quartz/static/icon-dark.png, normalized like the main one. */
export async function setProjectIconDark(projectPath: string, sourcePath: string): Promise<ProjectIconInfo> {
  await prepareImage(sourcePath)(darkIconPath(projectPath))
  await writeMarker(projectPath, { ...(await readMarker(projectPath)), customDark: true })
  return getProjectIcon(projectPath)
}

export async function clearProjectIconDark(projectPath: string): Promise<ProjectIconInfo> {
  await rm(darkIconPath(projectPath), { force: true })
  await writeMarker(projectPath, { ...(await readMarker(projectPath)), customDark: false })
  return getProjectIcon(projectPath)
}

/** The thumbnail the launcher shows, or null when the project has no icon of its own. */
export async function getCustomIconThumbnail(projectPath: string): Promise<string | null> {
  const marker = await readMarker(projectPath)
  if (!marker.custom) return null
  return thumbnailFor(iconPath(projectPath))
}

/**
 * Writes `sourcePath` to quartz/static/icon.png, normalized: JPEG becomes PNG (the emitter reads
 * that one name), anything longer than MAX_STORED_EDGE is scaled down. A PNG that already fits is
 * copied byte for byte rather than re-encoded - the user picked that file, and a round trip
 * through nativeImage would silently drop whatever it does not model.
 */
export async function setProjectIcon(projectPath: string, sourcePath: string): Promise<ProjectIconInfo> {
  const store = prepareImage(sourcePath)
  const target = iconPath(projectPath)
  const marker = await readMarker(projectPath)

  // Only the first assignment displaces something the project came with; after that the file being
  // replaced is one of ours, and keeping it would overwrite the original we are holding for the
  // "Entfernen" that restores it.
  let hasOriginal = marker.hasOriginal
  if (!marker.custom) {
    if (existsSync(target)) {
      await copyFile(target, join(quartzGuiDir(projectPath), ORIGINAL_FILE))
      hasOriginal = true
    } else {
      hasOriginal = false
    }
  }

  await store(target)
  await writeMarker(projectPath, { custom: true, hasOriginal, customDark: marker.customDark })
  return getProjectIcon(projectPath)
}

/**
 * Puts back whatever the project had before an icon was assigned here. Deliberately a restore
 * rather than a delete: the favicon emitter reads icon.png unconditionally, so a project left
 * without one builds into a site with no favicon at all.
 */
export async function clearProjectIcon(projectPath: string): Promise<ProjectIconInfo> {
  const marker = await readMarker(projectPath)
  const target = iconPath(projectPath)
  const original = quartzGuiPath(projectPath, ORIGINAL_FILE)

  if (marker.hasOriginal && existsSync(original)) {
    await mkdir(dirname(target), { recursive: true })
    await copyFile(original, target)
  } else if (existsSync(target)) {
    await rm(target)
  }

  await rm(original, { force: true })
  // The dark picture is a choice of its own and outlives the light one.
  await writeMarker(projectPath, { custom: false, hasOriginal: false, customDark: marker.customDark })
  return getProjectIcon(projectPath)
}
