import { existsSync, mkdirSync } from 'fs'
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from 'fs/promises'
import { basename, dirname, extname, join } from 'path'
import type { UnusedImportedFont } from '@shared/ipc-contract'
import { googleFontRequest, googleFontsCss2Url } from '@shared/googleFontRequest'
import { mainT } from '../i18n'
import { readConfig } from './configService'
import {
  customScssPath,
  fontFileIn,
  getManagedBlock,
  joinUniqueRules,
  parseFontFaces,
  projectFontsDir,
  allStylesheets,
  readCustomScss,
  splitRules,
  stripManagedBlock,
  upsertManagedBlock,
  writeCustomScss
} from './styleService'
import { MAX_FONT_FILE_BYTES, readFontFace } from './fontFile'

const FORMAT_MAP: Record<string, string> = { ttf: 'truetype', otf: 'opentype', woff: 'woff', woff2: 'woff2' }

// quartz/static/ is copied verbatim to the build output's static/ dir (quartz/plugins/emitters/
// static.ts). The rule points at it relative to the stylesheet, `static/fonts/<file>` without a
// leading slash - see relativeFontUrls in styleService.ts for why the root-relative form this
// wrote until 2026-09-19 broke every site under a sub-path. The directory is projectFontsDir(),
// shared with the preview, which reads the same files.

const FONTS_MARKER = 'fonts'

// Copies the font file into quartz/static/ and appends a generated @font-face rule into
// custom.scss's managed "fonts" section - unlike the interactive style editor (a whole-file edit
// surface the user owns), this is a one-shot programmatic append, so a clearly delineated managed
// section (shared upsertManagedBlock/getManagedBlock helpers, see styleService.ts) is appropriate
// here. Reads the section's current body first so importing a second font accumulates onto the
// first rather than replacing it.
export async function importFontFile(
  projectPath: string,
  sourcePath: string,
  family: string
): Promise<{ fileName: string; weight?: string; italic?: boolean }> {
  const ext = extname(sourcePath).slice(1).toLowerCase()
  const format = FORMAT_MAP[ext] ?? ext
  mkdirSync(projectFontsDir(projectPath), { recursive: true })
  const fileName = basename(sourcePath)
  await copyFile(sourcePath, join(projectFontsDir(projectPath), fileName))

  // What the file says about itself, rather than what the rule used to assume. Without a weight a
  // browser takes the face for 400 and synthesises every bold cut from it - which is what happened
  // to the example template's four variable fonts, whose axes went unused (BEFUNDE 3) - and two
  // cuts of one family (upright and italic, say) claim the same identity, so the second replaces
  // the first. An unreadable file is not an error: the rule is then written as it always was.
  // Asked before reading, not after: readFile puts the whole file in the main process's memory,
  // and the parser's own ceiling cannot help with a file that is already there. Past the limit the
  // file is copied and the rule written as it always was - the same answer as an unreadable one.
  const readable = await stat(sourcePath).then((s) => s.size <= MAX_FONT_FILE_BYTES).catch(() => false)
  const face = readable ? readFontFace(await readFile(sourcePath)) : null
  const declarations = [
    `  font-family: "${family}";`,
    `  src: url("static/fonts/${fileName}") format("${format}");`,
    ...(face ? [`  font-weight: ${face.weight};`] : []),
    ...(face?.italic ? ['  font-style: italic;'] : []),
    '  font-display: swap;'
  ]
  const cssBlock = `@font-face {\n${declarations.join('\n')}\n}`

  const info = await readCustomScss(projectPath)
  const existingBody = getManagedBlock(info.content, FONTS_MARKER)
  // Joined rule by rule: the same file imported twice is the same face, and so is a font that two
  // copies of the section (old and new marker name) both held - see joinUniqueRules.
  const nextBody = joinUniqueRules([existingBody ?? '', cssBlock])
  await writeCustomScss(projectPath, upsertManagedBlock(info.content, FONTS_MARKER, nextBody))

  return { fileName, weight: face?.weight, italic: face?.italic }
}

// ── imported fonts nothing uses any more ────────────────────────────────────

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// A stylesheet without its comments, strings kept. A comment names a font without using it:
// gui-test's body-code.scss says "next to Inter", and that kept Inter off the list after every
// variable naming it was gone - with no other way to remove it. A `//` inside an unquoted url()
// cuts that line short, which can only hide a mention, never invent one.
function withoutComments(text: string): string {
  return text.replace(/("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (match, quoted?: string) => quoted ?? ' ')
}

// The family as a name of its own - "Inter" in `"Inter", sans-serif`, not in "Interstate".
function mentions(text: string, family: string): boolean {
  return new RegExp(`(^|[^\\w-])${escapeRegExp(family)}(?![\\w-])`, 'i').test(text)
}

/**
 * The families in custom.scss's managed "fonts" block that nothing names: no typography slot, no
 * stylesheet, no variable override. Changing a slot in Basis never touched that block - it holds
 * the files a font import or a template brought along, and Quartz's Google fonts never go there -
 * so a font chosen away stayed declared and its files went out with every build. In gui-test
 * that was three of the four families of the Example template, while the fourth, Inter, was still
 * named by `--font-interface` and so was not unused at all; hence the text search instead of a
 * look at the typography alone.
 *
 * `draftFamilies` are the slots as the page shows them, unsaved included: the saved config alone
 * would offer to remove a family the user has just picked.
 *
 * Where it looks is quartz/styles, recursively, and that is the limit: a rule in a stylesheet
 * somewhere else in the project is not seen, and neither is a family a plugin names in its own
 * code. The card says where it looked, so the answer can be read for what it is.
 */
export async function unusedImportedFonts(projectPath: string, draftFamilies: string[]): Promise<UnusedImportedFont[]> {
  const info = await readCustomScss(projectPath)
  const body = getManagedBlock(info.content, FONTS_MARKER)
  if (!body) return []

  // Every stylesheet under quartz/styles, at any depth: a `body { font-family: "Alt" }` in a file
  // the user wrote there and loads with @use is a use of the family, and offering it for removal
  // because a flat two-directory list did not see it costs the file it points at (thirty-third
  // review, finding 6).
  const texts = [withoutComments(upsertManagedBlock(info.content, FONTS_MARKER, ''))]
  for (const path of await allStylesheets(projectPath)) {
    if (path !== customScssPath(projectPath)) texts.push(withoutComments(await readFile(path, 'utf-8')))
  }
  const typography = await readConfig(projectPath)
    .then((config) => Object.values((config.theme.typography ?? {}) as Record<string, unknown>))
    .catch(() => [])
  for (const spec of [...typography, ...draftFamilies]) {
    if (typeof spec === 'string') texts.push(spec)
    else if (spec && typeof spec === 'object' && typeof (spec as { name?: unknown }).name === 'string') texts.push((spec as { name: string }).name)
  }
  const everything = texts.join('\n')

  const byFamily = new Map<string, Set<string>>()
  for (const face of parseFontFaces(body)) {
    const files = byFamily.get(face.family) ?? new Set<string>()
    const file = fontFileIn(projectFontsDir(projectPath), face.url)
    if (file) files.add(basename(file))
    byFamily.set(face.family, files)
  }
  return [...byFamily]
    .filter(([family]) => !mentions(everything, family))
    .map(([family, files]) => ({ family, files: [...files] }))
}

/**
 * Takes a family's rules out of the managed "fonts" block and deletes the files they pointed at
 * under quartz/static/fonts - but only a file no remaining rule in any stylesheet points at.
 */
export async function removeImportedFont(projectPath: string, family: string): Promise<{ removedFiles: string[] }> {
  const info = await readCustomScss(projectPath)
  const body = getManagedBlock(info.content, FONTS_MARKER) ?? ''
  const rules = splitRules(body)
  const isFamily = (rule: string): boolean => parseFontFaces(rule).some((f) => f.family.toLowerCase() === family.toLowerCase())
  const removed = rules.filter(isFamily)
  if (removed.length === 0) return { removedFiles: [] }

  await writeCustomScss(projectPath, upsertManagedBlock(info.content, FONTS_MARKER, joinUniqueRules(rules.filter((r) => !isFamily(r)))))
  return { removedFiles: await deleteUnreferencedFontFiles(projectPath, removed.join('\n')) }
}

// Deletes the files the rules in `css` pointed at - but only a file no rule in any stylesheet of
// the project still points at. Called after those rules have left custom.scss.
async function deleteUnreferencedFontFiles(projectPath: string, css: string): Promise<string[]> {
  // Two widenings over the list the editor shows, both for the same reason: here, finding a
  // mention too many costs nothing, and missing one costs a file the site needs. Every stylesheet
  // under quartz/styles rather than the two flat directories the app writes, and every url() of a
  // rule rather than its first - a hand-written rule lists local() and two or three formats, and
  // the file was deleted out from under the second of them (thirty-third review, finding 6).
  const stillNamed = new Set<string>()
  for (const path of await allStylesheets(projectPath)) {
    for (const face of parseFontFaces(await readFile(path, 'utf-8'))) {
      for (const url of face.urls) {
        const file = fontFileIn(projectFontsDir(projectPath), url)
        if (file) stillNamed.add(file)
      }
    }
  }
  const removedFiles: string[] = []
  for (const face of parseFontFaces(css)) {
    for (const url of face.urls) {
      const file = fontFileIn(projectFontsDir(projectPath), url)
      if (!file || stillNamed.has(file) || removedFiles.includes(basename(file))) continue
      await rm(file, { force: true })
      removedFiles.push(basename(file))
    }
  }
  return removedFiles
}

// ── Google fonts, held by the project ───────────────────────────────────────

// "Serve fonts locally" used to mean Quartz's own `cdnCaching: false`: Quartz downloads the files
// at build time into the build output and points at them as `https://<baseUrl>/static/fonts/…`
// (processGoogleFonts in quartz/util/theme.ts). The local preview therefore loaded them from the
// published site, and before the first publish from nowhere - measured in gui-test: all seven
// files 404 online, every font fell back. Since 2026-09-19 the switch means this instead: the app
// asks Google for exactly what Quartz would (shared/googleFontRequest.ts), puts the files under
// quartz/static/fonts and their @font-face rules, relative, into a managed block of their own, and
// the config says `fontOrigin: local`, so Quartz fetches nothing. The block is separate from
// 'fonts' because that one is the user's imports: removing an unused import must not touch a
// Google font, and replacing the Google fonts must not touch an import. Its first line is the
// request it came from, which is how a later call knows whether anything changed.
const GOOGLE_MARKER = 'google-fonts'
const GOOGLE_TIMEOUT_MS = 20_000
// Google answers with the format the User-Agent can read. A browser gets woff2 split by
// unicode-range, so a page loads only the subsets it needs; without one it gets a whole ttf.
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const GSTATIC_URL = /url\(\s*(https:\/\/fonts\.gstatic\.com\/[^)\s'"]+)\s*\)/g
const FONT_FILE_NAME = /^[\w-]+\.(?:woff2|woff|ttf|otf)$/

/** AbortSignal.timeout rejects with a DOMException named TimeoutError; no answer is not no route. */
function timedOut(error: unknown): boolean {
  return error instanceof Error && error.name === 'TimeoutError'
}

export function hasGoogleFontsBlock(content: string): boolean {
  return getManagedBlock(content, GOOGLE_MARKER) !== null
}

function requestOf(body: string | null): string | null {
  return body ? (/^\s*\/\*\s*(https:\/\/fonts\.googleapis\.com\/\S+)\s*\*\//.exec(body)?.[1] ?? null) : null
}

function allFilesPresent(projectPath: string, body: string): boolean {
  return parseFontFaces(body).every((face) => {
    const file = fontFileIn(projectFontsDir(projectPath), face.url)
    return file !== undefined && existsSync(file)
  })
}

// One file, written beside its final name and renamed into place, so an interrupted download never
// leaves a torso that the next call would take for the real file.
async function downloadFontFile(url: string, target: string): Promise<void> {
  const file = basename(target)
  const response = await fetch(url, { signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS) }).catch((error: unknown) => {
    throw new Error(mainT(timedOut(error) ? 'googleFontsFileTimedOut' : 'googleFontsFileUnreachable', { file }))
  })
  if (!response.ok) throw new Error(mainT('googleFontsFileFailed', { file, status: response.status }))
  const declared = Number(response.headers.get('content-length') ?? 0)
  if (declared > MAX_FONT_FILE_BYTES) throw new Error(mainT('googleFontsFileTooLarge', { file }))
  const data = Buffer.from(await response.arrayBuffer())
  if (data.length > MAX_FONT_FILE_BYTES) throw new Error(mainT('googleFontsFileTooLarge', { file }))
  const temp = join(dirname(target), `.${basename(target)}.download`)
  await writeFile(temp, data)
  await rename(temp, target)
}

/**
 * Fetches the Google fonts the typography names into the project and writes their block. Does
 * nothing when the block already answers the same request and all its files are there - which is
 * what makes it cheap enough to call before every build. Files the previous block named and no
 * rule names any more are deleted.
 */
export async function fetchGoogleFonts(
  projectPath: string,
  typography: Record<string, unknown>
): Promise<{ changed: boolean; files: string[]; removedFiles: string[]; removedFamilies: string[]; missingFamilies: string[] }> {
  const request = googleFontsCss2Url(typography)
  if (!request) throw new Error(mainT('googleFontsNoFamily'))
  const before = getManagedBlock((await readCustomScss(projectPath)).content, GOOGLE_MARKER)
  if (before && requestOf(before) === request && allFilesPresent(projectPath, before)) {
    return { changed: false, files: [], removedFiles: [], removedFamilies: [], missingFamilies: notDelivered(typography, before) }
  }

  // "Not reachable" and "refused the request" are two ways to fail and get two sentences. Without
  // this catch the page showed node's own "TypeError: fetch failed (fonts:fetchGoogle)" for the
  // most ordinary of the two, no network (thirty-third review, finding 7).
  const response = await fetch(request, {
    headers: { 'User-Agent': BROWSER_UA },
    signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS)
  }).catch((error: unknown) => {
    throw new Error(mainT(timedOut(error) ? 'googleFontsTimedOut' : 'googleFontsUnreachable'))
  })
  if (!response.ok) throw new Error(mainT('googleFontsRequestFailed', { status: response.status }))
  const css = await response.text()

  const urls = new Map<string, string>()
  for (const match of css.matchAll(GSTATIC_URL)) {
    const name = decodeURIComponent(match[1].split('/').pop() ?? '')
    if (FONT_FILE_NAME.test(name)) urls.set(match[1], name)
  }
  if (urls.size === 0) throw new Error(mainT('googleFontsNothingFound'))

  const dir = projectFontsDir(projectPath)
  await mkdir(dir, { recursive: true })
  // Google's file names are content hashes, so a file of that name that is already here is the
  // same file.
  for (const [url, name] of urls) {
    const target = join(dir, name)
    if (!existsSync(target)) await downloadFontFile(url, target)
  }

  let body = css
  for (const [url, name] of urls) body = body.split(url).join(`static/fonts/${name}`)
  const block = `/* ${request} */\n${body.trim()}`
  // Read again: the downloads took a while, and custom.scss may have been written meanwhile.
  const info = await readCustomScss(projectPath)
  const previous = getManagedBlock(info.content, GOOGLE_MARKER) ?? ''
  await writeCustomScss(projectPath, upsertManagedBlock(info.content, GOOGLE_MARKER, block))
  // Said by name after the save: the files of a font chosen away go without a question, and the
  // "unused fonts" card never sees them - it lists the 'fonts' block only.
  const kept = new Set(familiesOf(block).map((f) => f.toLowerCase()))
  return {
    changed: true,
    files: [...urls.values()],
    removedFiles: await deleteUnreferencedFontFiles(projectPath, previous),
    removedFamilies: familiesOf(previous).filter((f) => !kept.has(f.toLowerCase())),
    missingFamilies: notDelivered(typography, block)
  }
}

function familiesOf(css: string): string[] {
  return [...new Set(parseFontFaces(css).map((face) => face.family))]
}

/**
 * The families that were asked for and are not in the answer. A 400 only comes back when *no*
 * family matches: measured against the real CSS2 API with the app's User-Agent, `family=Inter…
 * &family=MeineSchrift` answers 200 with fourteen rules, all of them 'Inter'. The app asks for
 * three or four at once, so the usual shape of a misspelt name is a silent omission - and the one
 * sentence that would have named it, "a font name is usually misspelt", is the one that does not
 * come (thirty-third review, finding 5).
 */
function notDelivered(typography: Record<string, unknown>, block: string): string[] {
  const delivered = new Set(familiesOf(block).map((f) => f.toLowerCase()))
  const asked = (['header', 'body', 'code', 'title'] as const)
    .map((role) => googleFontRequest(role, typography[role])?.family.trim())
    .filter((family): family is string => Boolean(family))
  return [...new Set(asked)].filter((family) => !delivered.has(family.toLowerCase()))
}

/** Removes the block and every file of it that no other rule names. Nothing when there is none. */
export async function dropGoogleFonts(
  projectPath: string
): Promise<{ dropped: boolean; removedFiles: string[]; removedFamilies: string[] }> {
  const info = await readCustomScss(projectPath)
  const body = getManagedBlock(info.content, GOOGLE_MARKER)
  if (body === null) return { dropped: false, removedFiles: [], removedFamilies: [] }
  await writeCustomScss(projectPath, stripManagedBlock(info.content, GOOGLE_MARKER))
  return { dropped: true, removedFiles: await deleteUnreferencedFontFiles(projectPath, body), removedFamilies: familiesOf(body) }
}

/**
 * The guard at the door where the fonts are read (buildService, before every build and server
 * start), the same place the frames are regenerated: the config reaches the typography through
 * more doors than the Basis tab - a template import, `quartz sync --pull`, a restore. A project
 * that holds its Google fonts gets them brought in line with the config; anything else is left
 * alone. Never throws: a failed fetch is a sentence in the log, and the build goes on with the
 * files that are there.
 */
export async function refreshGoogleFonts(projectPath: string): Promise<{ failed: boolean; text: string } | null> {
  try {
    const info = await readCustomScss(projectPath)
    if (!hasGoogleFontsBlock(info.content)) return null
    const config = await readConfig(projectPath)
    if (config.theme.fontOrigin !== 'local') return null
    const result = await fetchGoogleFonts(projectPath, (config.theme.typography ?? {}) as Record<string, unknown>)
    return result.changed ? { failed: false, text: mainT('googleFontsRefreshed', { count: result.files.length }) } : null
  } catch (error) {
    return { failed: true, text: mainT('googleFontsRefreshFailed', { message: error instanceof Error ? error.message : String(error) }) }
  }
}
