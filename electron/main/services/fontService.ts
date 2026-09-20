import { net } from 'electron'
import { existsSync, mkdirSync, statSync } from 'fs'
import { copyFile, mkdir, readFile, realpath, rename, rm, stat, writeFile } from 'fs/promises'
import { basename, dirname, extname, join, resolve } from 'path'
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
export function importFontFile(
  projectPath: string,
  sourcePath: string,
  family: string
): ReturnType<typeof importFontFileNow> {
  return whileHoldingFonts(projectPath, () => importFontFileNow(projectPath, sourcePath, family))
}

async function importFontFileNow(
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
export function removeImportedFont(projectPath: string, family: string): ReturnType<typeof removeImportedFontNow> {
  return whileHoldingFonts(projectPath, () => removeImportedFontNow(projectPath, family))
}

async function removeImportedFontNow(projectPath: string, family: string): Promise<{ removedFiles: string[] }> {
  const info = await readCustomScss(projectPath)
  const body = getManagedBlock(info.content, FONTS_MARKER) ?? ''
  const rules = splitRules(body)
  const isFamily = (rule: string): boolean => parseFontFaces(rule).some((f) => f.family.toLowerCase() === family.toLowerCase())
  const removed = rules.filter(isFamily)
  if (removed.length === 0) return { removedFiles: [] }

  await writeCustomScss(projectPath, upsertManagedBlock(info.content, FONTS_MARKER, joinUniqueRules(rules.filter((r) => !isFamily(r)))))
  return { removedFiles: await deleteUnreferencedFontFiles(projectPath, removed.join('\n')) }
}

/**
 * One writer at a time per project, and this one waits rather than refusing: the four functions
 * below all rewrite a managed block in custom.scss and then delete the files no rule names any
 * more, and two of them are reached from two doors at once - a save on the Styles page and the
 * build door that refreshes the Google fonts before every build. Run side by side, the one that
 * breaks off deletes files the other skipped as "already there" and is about to name in its block
 * (thirty-fourth review, "nebenbei" 2). Refusing would be wrong here: neither caller is a click
 * that could be repeated, and the build door has to see the finished state.
 *
 * Per project path through `realpath`, for the reason spelled out at coreUpdatesRunning in
 * updateService: two spellings of one folder must not be two keys. The entry is cleared only when
 * it is still this run's, the way forgetServer() does it - a later caller has already chained onto
 * it and owns the key.
 */
const fontWritesRunning = new Map<string, Promise<unknown>>()

async function whileHoldingFonts<T>(projectPath: string, run: () => Promise<T>): Promise<T> {
  const key = await realpath(projectPath).catch(() => resolve(projectPath))
  const previous = fontWritesRunning.get(key)
  // The predecessor's failure is not this run's business, hence the swallowing catch on both
  // sides: one that stays would reject every later caller in the chain.
  const mine = (previous ?? Promise.resolve()).then(run, run)
  const queued = mine.then(
    () => undefined,
    () => undefined
  )
  fontWritesRunning.set(key, queued)
  try {
    return await mine
  } finally {
    await queued
    if (fontWritesRunning.get(key) === queued) fontWritesRunning.delete(key)
  }
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
        // And a third widening, on this side only: the bare file name of any url(), whether or not
        // the path resolves. `url("#{$f}/shared.woff2")` is a path Sass builds at compile time, so
        // fontFileIn sees no static/fonts in it and the file went out from under it. A name too
        // many protects a file nobody is using; a name too few deletes one the site needs. The
        // deleting side below keeps asking fontFileIn, so nothing outside the fonts folder is
        // touched either way.
        const named = url.split(/[/\\]/).pop()
        if (named) stillNamed.add(join(projectFontsDir(projectPath), named))
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
// Electron's `net.fetch` rather than node's global fetch, like the update check and the bundled
// template: it goes through Chromium's stack, so the machine's proxy configuration and its
// certificate store apply - the two things that decide whether this works inside a company
// network. A save hangs on this one (thirty-third review, "nebenbei" 4). Whether a rejection is a
// timeout is asked of the signal, not of the error's name: the two stacks do not have to agree on
// what they throw, and the signal is ours.
//
// Google answers with the format the User-Agent can read. A browser gets woff2 split by
// unicode-range, so a page loads only the subsets it needs; without one it gets a whole ttf.
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const GSTATIC_URL = /url\(\s*(https:\/\/fonts\.gstatic\.com\/[^)\s'"]+)\s*\)/g
// Dots inside the name, but never a leading one and never a separator: Google names every slice of
// a CJK family `<hash>.<n>.woff2`, and `[\w-]+\.(?:woff2|…)` matched none of them. What was a
// silent half-local site before the name became an error (thirty-third review, finding 8) turned
// into a refusal to save any Japanese, Korean or Chinese family at all, under a sentence that
// blames Google (thirty-fourth review, finding 2). fontFileIn() keeps the name inside the folder
// either way - it asks basename(), a leading dot and a backslash separately.
const FONT_FILE_NAME = /^[\w-]+(?:\.[\w-]+)*\.(?:woff2|woff|ttf|otf)$/
// A ceiling over the whole answer, beside the one per file. The file's own header says how long it
// is, and so does the answer - both written by whoever the answer comes from, so neither is the
// limit. 300 files of 1 MiB each were written without a word before this (thirty-third review,
// finding 8).
//
// The number is what four families outside the Latin alphabet really cost, not what three Latin
// ones do: a Latin family comes in 7 to 29 files, but Google splits a CJK family by unicode-range
// into 92 to 126. Measured at the real Google with the app's User-Agent on 2026-09-20: 124 for
// Noto Sans JP alone, 439 to 495 for the four slots filled with CJK families (the most expensive
// being Noto Serif JP + Noto Sans JP italic + M PLUS 1p + Zen Kaku Gothic New). At 200 the ceiling
// hit the ordinary case for those users; the byte ceiling beside it is the one that has room to
// spare - all 124 files of Noto Sans JP are 5.4 MB.
const MAX_FONT_FILES = 800
const MAX_FONT_TOTAL_BYTES = 128 * 1024 * 1024

export function hasGoogleFontsBlock(content: string): boolean {
  return getManagedBlock(content, GOOGLE_MARKER) !== null
}

function requestOf(body: string | null): string | null {
  return body ? (/^\s*\/\*\s*(https:\/\/fonts\.googleapis\.com\/\S+)\s*\*\//.exec(body)?.[1] ?? null) : null
}

// "The file is there" is not "the file can be read": a zero-byte file under the right name passed
// as present, the shortcut kept every build from noticing, and the download below walked past it
// as well (thirty-third review, finding 8). One predicate for both questions.
function usableFile(path: string): boolean {
  try {
    return statSync(path).size > 0
  } catch {
    return false
  }
}

function allFilesPresent(projectPath: string, body: string): boolean {
  return parseFontFaces(body).every((face) => {
    const file = fontFileIn(projectFontsDir(projectPath), face.url)
    return file !== undefined && usableFile(file)
  })
}

// One file, written beside its final name and renamed into place, so an interrupted download never
// leaves a torso that the next call would take for the real file.
async function downloadFontFile(url: string, target: string): Promise<number> {
  const file = basename(target)
  const signal = AbortSignal.timeout(GOOGLE_TIMEOUT_MS)
  // Request *and* body under the same catch: a network that hangs hangs in the middle of a file
  // as readily as before it, and with the catch on net.fetch alone the raw "The operation was
  // aborted due to timeout" came through after 20 s - the half-English sentence this was written
  // to replace (thirty-fourth review, finding 6). Whether it is a timeout is asked of the signal,
  // not of the error's name: through Electron's net.fetch a request that never answers rejects
  // with TimeoutError and a body that hangs with AbortError, and the signal is ours either way
  // (measured in the real main process).
  const response = await net.fetch(url, { signal }).catch(() => {
    throw new Error(mainT(signal.aborted ? 'googleFontsFileTimedOut' : 'googleFontsFileUnreachable', { file }))
  })
  if (!response.ok) throw new Error(mainT('googleFontsFileFailed', { file, status: response.status }))
  const declared = Number(response.headers.get('content-length') ?? 0)
  if (declared > MAX_FONT_FILE_BYTES) throw new Error(mainT('googleFontsFileTooLarge', { file }))
  const data = Buffer.from(
    await response.arrayBuffer().catch(() => {
      throw new Error(mainT(signal.aborted ? 'googleFontsFileTimedOut' : 'googleFontsFileUnreachable', { file }))
    })
  )
  if (data.length > MAX_FONT_FILE_BYTES) throw new Error(mainT('googleFontsFileTooLarge', { file }))
  const temp = join(dirname(target), `.${basename(target)}.download`)
  await writeFile(temp, data)
  await rename(temp, target)
  return data.length
}

/**
 * Fetches the Google fonts the typography names into the project and writes their block. Does
 * nothing when the block already answers the same request and all its files are there - which is
 * what makes it cheap enough to call before every build. Files the previous block named and no
 * rule names any more are deleted.
 */
export function fetchGoogleFonts(
  projectPath: string,
  typography: Record<string, unknown>
): ReturnType<typeof fetchGoogleFontsNow> {
  return whileHoldingFonts(projectPath, () => fetchGoogleFontsNow(projectPath, typography))
}

async function fetchGoogleFontsNow(
  projectPath: string,
  typography: Record<string, unknown>
): Promise<{ changed: boolean; files: string[]; removedFiles: string[]; removedFamilies: string[]; missingFamilies: string[] }> {
  const request = googleFontsCss2Url(typography)
  if (!request) throw new Error(mainT('googleFontsNoFamily'))
  const current = (await readCustomScss(projectPath)).content
  const before = getManagedBlock(current, GOOGLE_MARKER)
  if (before && requestOf(before) === request && allFilesPresent(projectPath, before)) {
    return { changed: false, files: [], removedFiles: [], removedFamilies: [], missingFamilies: notDelivered(typography, before, current) }
  }

  // "Not reachable" and "refused the request" are two ways to fail and get two sentences. Without
  // this catch the page showed node's own "TypeError: fetch failed (fonts:fetchGoogle)" for the
  // most ordinary of the two, no network (thirty-third review, finding 7).
  const cssSignal = AbortSignal.timeout(GOOGLE_TIMEOUT_MS)
  const response = await net.fetch(request, { headers: { 'User-Agent': BROWSER_UA }, signal: cssSignal }).catch(() => {
    throw new Error(mainT(cssSignal.aborted ? 'googleFontsTimedOut' : 'googleFontsUnreachable'))
  })
  if (!response.ok) throw new Error(mainT('googleFontsRequestFailed', { status: response.status }))
  // Same reason as in downloadFontFile: the body can hang after the head has arrived.
  const css = await response.text().catch(() => {
    throw new Error(mainT(cssSignal.aborted ? 'googleFontsTimedOut' : 'googleFontsUnreachable'))
  })

  const urls = new Map<string, string>()
  for (const match of css.matchAll(GSTATIC_URL)) {
    const name = decodeURIComponent(match[1].split('/').pop() ?? '')
    // A name this cannot use is an error, not something to walk past. Skipped, its rule kept the
    // https://fonts.gstatic.com address: the site that "serves locally" loaded from Google, and
    // every build went to the network again, because fontFileIn() has no file for that address
    // and allFilesPresent could never become true (thirty-third review, finding 8).
    if (!FONT_FILE_NAME.test(name)) throw new Error(mainT('googleFontsBadFileName', { name: name.slice(0, 80) }))
    urls.set(match[1], name)
  }
  if (urls.size === 0) throw new Error(mainT('googleFontsNothingFound'))
  if (urls.size > MAX_FONT_FILES) throw new Error(mainT('googleFontsTooManyFiles', { count: urls.size, max: MAX_FONT_FILES }))

  const dir = projectFontsDir(projectPath)
  await mkdir(dir, { recursive: true })
  // Google's file names are content hashes, so a readable file of that name that is already here is
  // the same file - a torso of that name is not, and gets fetched again.
  let total = 0
  // What this run wrote, so a fetch that breaks off in the middle leaves nothing behind. Only files
  // that were absent or unreadable are downloaded, so none of them can be one an existing rule was
  // using - and the block is written at the end, so half a set of files under no rule at all would
  // be published with every build and removed by nothing: deleteUnreferencedFontFiles only ever
  // looks at what the *previous* block named (thirty-third review, "nebenbei" 3).
  const written: string[] = []
  try {
    for (const [url, name] of urls) {
      const target = join(dir, name)
      if (usableFile(target)) continue
      total += await downloadFontFile(url, target)
      written.push(target)
      if (total > MAX_FONT_TOTAL_BYTES) throw new Error(mainT('googleFontsTooLarge'))
    }
  } catch (error) {
    for (const file of written) await rm(file, { force: true }).catch(() => undefined)
    throw error
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
    missingFamilies: notDelivered(typography, block, info.content)
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
function notDelivered(typography: Record<string, unknown>, block: string, wholeCss: string): string[] {
  const delivered = new Set(familiesOf(block).map((f) => f.toLowerCase()))
  // Plus whatever the rest of custom.scss declares itself: a slot may hold a font the user
  // imported, and mixing the two is what the page offers. Asking the block alone warned "Google
  // does not know this font … check the spelling" about a family whose rule is in the file, whose
  // file is in the project and which the site does show - after every save that changes the
  // request (thirty-fourth review, finding 4). Same question as `declaredHere` on Basis, which
  // 77d143b taught the hint under the field and not this list.
  //
  // Without the Google block, and deliberately: `wholeCss` is the file as it was before this run
  // wrote, so its old block can still name a family this answer left out - counting that would
  // hide exactly the omission the sentence is for.
  for (const family of familiesOf(stripManagedBlock(wholeCss, GOOGLE_MARKER))) delivered.add(family.toLowerCase())
  const asked = (['header', 'body', 'code', 'title'] as const)
    .map((role) => googleFontRequest(role, typography[role])?.family.trim())
    .filter((family): family is string => Boolean(family))
  return [...new Set(asked)].filter((family) => !delivered.has(family.toLowerCase()))
}

/** Removes the block and every file of it that no other rule names. Nothing when there is none. */
export function dropGoogleFonts(projectPath: string): ReturnType<typeof dropGoogleFontsNow> {
  return whileHoldingFonts(projectPath, () => dropGoogleFontsNow(projectPath))
}

async function dropGoogleFontsNow(
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
