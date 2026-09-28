import { net } from 'electron'
import { existsSync, mkdirSync, statSync } from 'fs'
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from 'fs/promises'
import { basename, dirname, extname, join } from 'path'
import { createHash } from 'crypto'
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
  type ParsedFace,
  projectFontsDir,
  allStylesheets,
  readCustomScss,
  splitRules,
  stripManagedBlock,
  upsertManagedBlock,
  writeCustomScss
} from './styleService'
import { MAX_FONT_FILE_BYTES, readFontFace } from './fontFile'
import { whileHoldingStyles } from './styleLock'

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
  return whileHoldingStyles(projectPath, () => importFontFileNow(projectPath, sourcePath, family))
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
 * Where it looks is quartz/styles, quartz/components/styles and quartz/static, recursively (see
 * allStylesheets), and that is the limit: a rule in a stylesheet
 * somewhere else in the project is not seen, and neither is a family a plugin names in its own
 * code. The card says where it looked, so the answer can be read for what it is.
 */
export async function unusedImportedFonts(projectPath: string, draftFamilies: string[]): Promise<UnusedImportedFont[]> {
  const info = await readCustomScss(projectPath)
  const body = getManagedBlock(info.content, FONTS_MARKER)
  if (!body) return []

  // Every stylesheet under quartz/styles (and the two other roots allStylesheets walks), at any depth: a `body { font-family: "Alt" }` in a file
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

  // Per family the rules that would go - and from them the files that would go *with* them. That is
  // the question deleteUnreferencedFontFiles answers afterwards, asked before: how many files are
  // gone once this button is pressed. Counting each rule's own first url() instead put "1
  // Datei(en)" in the dialog in both directions of wrong - with another rule naming the same file
  // none went, and with three url() in the rule three did (thirty-fourth review, measured in the
  // built app: 1/0 and 1/3, against a control of 1/1). The number is the part of that sentence a
  // user believes.
  const rulesOf = new Map<string, string[]>()
  for (const rule of splitRules(body)) {
    for (const family of new Set(parseFontFaces(rule).map((face) => face.family))) {
      rulesOf.set(family, [...(rulesOf.get(family) ?? []), rule])
    }
  }
  return Promise.all(
    [...rulesOf]
      .filter(([family]) => !mentions(everything, family))
      .map(async ([family, rules]) => {
        const stillNamed = await fontFilesStillNamed(projectPath, rules)
        const files = [...fontFilesNamedBy(projectPath, rules.join('\n'), false)]
          .filter((file) => !stillNamed.has(file))
          .map((file) => basename(file))
        return { family, files: [...new Set(files)] }
      })
  )
}

/**
 * Takes a family's rules out of the managed "fonts" block and deletes the files they pointed at
 * under quartz/static/fonts - but only a file no remaining rule in any stylesheet points at.
 */
export function removeImportedFont(projectPath: string, family: string): ReturnType<typeof removeImportedFontNow> {
  return whileHoldingStyles(projectPath, () => removeImportedFontNow(projectPath, family))
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

// The files the @font-face rules in `css` point at, as paths in the project's font folder.
//
// Two widenings over the list the editor shows, both for the same reason: whoever asks this
// question is deciding about an `rm`, so finding a mention too many costs nothing and missing one
// costs a file the site needs. Every stylesheet under quartz/styles, quartz/components/styles and
// quartz/static rather than the two flat directories the app writes (see allStylesheets), and every url() of a rule rather than its first
// - a hand-written rule lists local() and two or three formats, and the file was deleted out from
// under the second of them (thirty-third review, finding 6).
//
// `protecting` adds the third: the bare file name of any url(), whether or not the path resolves.
// `url("#{$f}/shared.woff2")` is a path Sass builds at compile time, so fontFileIn sees no
// static/fonts in it and the file went out from under it. A name too many protects a file nobody
// is using; a name too few deletes one the site needs. Asking whether a rule is *about to lose*
// its file stays on fontFileIn, so nothing outside the fonts folder is ever touched.
function fontFilesNamedBy(projectPath: string, css: string, protecting: boolean): Set<string> {
  const files = new Set<string>()
  for (const face of parseFontFaces(css)) {
    for (const url of face.urls) {
      const file = fontFileIn(projectFontsDir(projectPath), url)
      if (file) files.add(file)
      if (!protecting) continue
      const named = url.split(/[/\\]/).pop()
      if (named) files.add(join(projectFontsDir(projectPath), named))
    }
  }
  return files
}

/**
 * Every file any stylesheet of the project still points at. `except` are rules taken out of
 * custom.scss first - the ones that are about to go, when the question is asked before they do.
 * Rule by rule, because splitRules() returns them trimmed and separately: their concatenation is
 * not a string the file contains.
 */
async function fontFilesStillNamed(projectPath: string, except: string[] = []): Promise<Set<string>> {
  const stillNamed = new Set<string>()
  for (const path of await allStylesheets(projectPath)) {
    let css = await readFile(path, 'utf-8')
    if (path === customScssPath(projectPath)) for (const rule of except) css = css.split(rule).join('')
    for (const file of fontFilesNamedBy(projectPath, css, true)) stillNamed.add(file)
  }
  return stillNamed
}

/**
 * For a template import that has just replaced a managed font block: the files only the old rules
 * pointed at. The import wrote the package's files and its block, and left the previous ones'
 * files lying - on the four sites that apply the documentation packages that was Instrument Sans,
 * Inter and JetBrains Mono beside the three Noto files, published and reachable, and invisible to
 * the "unused fonts" card, which lists families from the block (thirty-fifth review, finding 7).
 * Same question as every other removal here, under the same lock.
 */
export function deleteFontFilesOfReplacedRules(projectPath: string, previousCss: string): Promise<string[]> {
  return whileHoldingStyles(projectPath, () => deleteUnreferencedFontFiles(projectPath, previousCss))
}

// Deletes the files the rules in `css` pointed at - but only a file no rule in any stylesheet of
// the project still points at. Called after those rules have left custom.scss.
async function deleteUnreferencedFontFiles(projectPath: string, css: string): Promise<string[]> {
  const stillNamed = await fontFilesStillNamed(projectPath)
  const removedFiles: string[] = []
  for (const file of fontFilesNamedBy(projectPath, css, false)) {
    if (stillNamed.has(file) || removedFiles.includes(basename(file))) continue
    await rm(file, { force: true })
    removedFiles.push(basename(file))
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
  return whileHoldingStyles(projectPath, () => fetchGoogleFontsNow(projectPath, typography))
}

async function fetchGoogleFontsNow(
  projectPath: string,
  typography: Record<string, unknown>
): Promise<{
  changed: boolean
  files: string[]
  removedFiles: string[]
  removedFamilies: string[]
  missingFamilies: string[]
  ownFamilies: string[]
  coveredFamilies: string[]
}> {
  if (!googleFontsCss2Url(typography)) throw new Error(mainT('googleFontsNoFamily'))
  const current = (await readCustomScss(projectPath)).content
  // What the project declares itself - an imported font, the 'fonts' block a template brings - is
  // not asked of Google a second time. Asked anyway, the same family stood in custom.scss twice:
  // the Basis template's three Noto Sans rules in 'fonts' and Google's 54 in this block, with a
  // second set of files under quartz/static/fonts (gui-test, 1.0.0).
  //
  // But "declares the family" is not "covers what Google would have sent". The Basis template's
  // rules are Latin only, on purpose, and leaving the whole family out took Cyrillic, Greek and
  // Vietnamese off a site whose owner had chosen all seven subsets - 54 rules and 23 files, at the
  // build door, without a word (thirty-eighth review, finding 1). So two steps: a family with an
  // own rule *without* unicode-range covers everything and is not asked at all (an imported font);
  // any other family is asked, and out of the answer go only the rules an own rule already covers
  // - same style, weight inside its range, characters inside its unicode-range (coveredByOwn).
  //
  // custom.scss only, like notDelivered(), while unusedImportedFonts reads every stylesheet: a
  // family declared in quartz/styles/custom/*.scss is still fetched. That is the safe side - one
  // fetch too many costs duplicate files, one too few costs the site its characters.
  const ownFaces = parseFontFaces(stripManagedBlock(current, GOOGLE_MARKER))
  const own = new Set(ownFaces.map((face) => face.family.toLowerCase()))
  const ownFamiliesAsked: string[] = []
  const wanted: Record<string, unknown> = { ...typography }
  for (const role of TYPOGRAPHY_ROLES) {
    const family = googleFontRequest(role, typography[role])?.family.trim()
    if (family && ownFaces.some((face) => face.family.toLowerCase() === family.toLowerCase() && !face.unicodeRange)) {
      delete wanted[role]
      if (!ownFamiliesAsked.includes(family)) ownFamiliesAsked.push(family)
    }
  }
  const request = googleFontsCss2Url(wanted)
  const before = getManagedBlock(current, GOOGLE_MARKER)
  // Nothing left to ask: the block stays, empty, because it is the mark that the project holds its
  // Google fonts (the build door asks for it), and a later font chosen from Google fills it again.
  if (!request) {
    if (before !== null && before.trim() === NOTHING_FROM_GOOGLE) {
      return { changed: false, files: [], removedFiles: [], removedFamilies: [], missingFamilies: [], ownFamilies: ownFamiliesAsked, coveredFamilies: [] }
    }
    const info = await readCustomScss(projectPath)
    const previous = getManagedBlock(info.content, GOOGLE_MARKER) ?? ''
    await writeCustomScss(projectPath, upsertManagedBlock(info.content, GOOGLE_MARKER, NOTHING_FROM_GOOGLE))
    return {
      changed: true,
      files: [],
      removedFiles: await deleteUnreferencedFontFiles(projectPath, previous),
      removedFamilies: familiesOf(previous).filter((f) => !own.has(f.toLowerCase())),
      missingFamilies: [],
      ownFamilies: ownFamiliesAsked,
      coveredFamilies: []
    }
  }
  // The own rules that can leave something out of the answer, as a short fingerprint in the
  // block's head: when they change, the same request has a different answer, and a block written
  // before this rule existed (1.0.0, with the duplicate Latin rules) has none.
  const askedFamilies = new Set(
    TYPOGRAPHY_ROLES.map((role) => googleFontRequest(role, wanted[role])?.family.trim().toLowerCase()).filter(Boolean)
  )
  const relevantOwn = ownFaces.filter((face) => askedFamilies.has(face.family.toLowerCase()))
  const ownPrint = ownRulesPrint(relevantOwn)
  if (before && requestOf(before) === request && ownPrintOf(before) === ownPrint && allFilesPresent(projectPath, before)) {
    return {
      changed: false,
      files: [],
      removedFiles: [],
      removedFamilies: [],
      missingFamilies: notDelivered(typography, before, current),
      ownFamilies: ownFamiliesAsked,
      coveredFamilies: []
    }
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

  if ([...css.matchAll(GSTATIC_URL)].length === 0) throw new Error(mainT('googleFontsNothingFound'))
  // Out of the answer: every rule an own rule covers. Before the downloads, so its file is not
  // fetched either.
  const coveredFamilies: string[] = []
  const answer = css.replace(GOOGLE_RULE, (rule) => {
    const face = parseFontFaces(rule)[0]
    if (!face || !coveredByOwn(face, relevantOwn)) return rule
    if (!coveredFamilies.includes(face.family)) coveredFamilies.push(face.family)
    return ''
  })

  const urls = new Map<string, string>()
  for (const match of answer.matchAll(GSTATIC_URL)) {
    const name = decodeURIComponent(match[1].split('/').pop() ?? '')
    // A name this cannot use is an error, not something to walk past. Skipped, its rule kept the
    // https://fonts.gstatic.com address: the site that "serves locally" loaded from Google, and
    // every build went to the network again, because fontFileIn() has no file for that address
    // and allFilesPresent could never become true (thirty-third review, finding 8).
    if (!FONT_FILE_NAME.test(name)) throw new Error(mainT('googleFontsBadFileName', { name: name.slice(0, 80) }))
    urls.set(match[1], name)
  }
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

  let body = answer
  for (const [url, name] of urls) body = body.split(url).join(`static/fonts/${name}`)
  const head = ownPrint ? `/* ${request} */\n/* ${OWN_RULES_NOTE} ${ownPrint} */` : `/* ${request} */`
  const block = body.trim() ? `${head}\n${body.trim()}` : head
  // Read again: the downloads took a while, and custom.scss may have been written meanwhile.
  const info = await readCustomScss(projectPath)
  const previous = getManagedBlock(info.content, GOOGLE_MARKER) ?? ''
  await writeCustomScss(projectPath, upsertManagedBlock(info.content, GOOGLE_MARKER, block))
  // Said by name after the save: the files of a font chosen away go without a question, and the
  // "unused fonts" card never sees them - it lists the 'fonts' block only.
  // A family that moved from this block to the project's own rules is not "removed": the site
  // still has it, from the other block.
  const kept = new Set([...familiesOf(block).map((f) => f.toLowerCase()), ...own])
  return {
    changed: true,
    files: [...urls.values()],
    removedFiles: await deleteUnreferencedFontFiles(projectPath, previous),
    removedFamilies: familiesOf(previous).filter((f) => !kept.has(f.toLowerCase())),
    missingFamilies: notDelivered(typography, block, info.content),
    ownFamilies: ownFamiliesAsked,
    coveredFamilies
  }
}

const TYPOGRAPHY_ROLES = ['header', 'body', 'code', 'title'] as const
// The body of the block when every family the typography names is declared by the project itself.
const NOTHING_FROM_GOOGLE = '/* QuartzControl: every family is declared by the project itself, nothing is fetched from Google */'

// One @font-face of Google's answer with the comment Google puts above it (`/* cyrillic-ext */`).
const GOOGLE_RULE = /(?:\/\*[^*]*\*\/\s*)?@font-face\s*\{[^}]*\}\s*/g
const OWN_RULES_NOTE = 'QuartzControl: left out what the project\'s own rules cover'

function ownRulesPrint(faces: ParsedFace[]): string {
  if (faces.length === 0) return ''
  const rows = faces.map((f) => [f.family.toLowerCase(), f.style.toLowerCase(), f.weight, f.unicodeRange ?? ''].join('|')).sort()
  return createHash('sha1').update(rows.join('\n')).digest('hex').slice(0, 12)
}

function ownPrintOf(body: string): string {
  return /left out what the project's own rules cover ([0-9a-f]+)/.exec(body)?.[1] ?? ''
}

/**
 * Whether the project's own rules already cover a rule of Google's answer: same family and style,
 * its weight inside theirs, its characters inside the union of their unicode-ranges. Only a yes
 * leaves something out, so every doubt - an unparsable range, a weight keyword - keeps the rule.
 */
function coveredByOwn(face: ParsedFace, ownFaces: ParsedFace[]): boolean {
  const weight = weightRange(face.weight)
  const chars = unicodeIntervals(face.unicodeRange)
  if (!weight || chars === undefined) return false
  const matching = ownFaces.filter((own) => {
    const ownWeight = weightRange(own.weight)
    return (
      own.family.toLowerCase() === face.family.toLowerCase() &&
      own.style.toLowerCase() === face.style.toLowerCase() &&
      ownWeight !== undefined &&
      ownWeight[0] <= weight[0] &&
      weight[1] <= ownWeight[1]
    )
  })
  const union: Array<[number, number]> = []
  for (const own of matching) {
    const ranges = unicodeIntervals(own.unicodeRange)
    if (ranges === null) return true
    if (ranges) union.push(...ranges)
  }
  if (chars === null) return false
  return coveredByUnion(chars, union)
}

// The inner intervals against the merged outer ones - Google's Latin range is one list, the
// template's another, and a character may be covered by two adjacent entries together.
function coveredByUnion(inner: Array<[number, number]>, outer: Array<[number, number]>): boolean {
  const merged: Array<[number, number]> = []
  for (const [a, b] of [...outer].sort((x, y) => x[0] - y[0])) {
    const last = merged[merged.length - 1]
    if (last && a <= last[1] + 1) last[1] = Math.max(last[1], b)
    else merged.push([a, b])
  }
  return inner.every(([lo, hi]) => merged.some(([a, b]) => a <= lo && hi <= b))
}

/** `null` for a rule without unicode-range (it covers everything), `undefined` if unreadable. */
function unicodeIntervals(range: string | undefined): Array<[number, number]> | null | undefined {
  if (range === undefined) return null
  const out: Array<[number, number]> = []
  for (const token of range.split(',')) {
    const match = /^\s*U\+([0-9A-F?]{1,6})(?:-([0-9A-F]{1,6}))?\s*$/i.exec(token)
    if (!match) return undefined
    const lo = parseInt(match[1].replace(/\?/g, '0'), 16)
    const hi = match[2] ? parseInt(match[2], 16) : parseInt(match[1].replace(/\?/g, 'F'), 16)
    out.push([lo, hi])
  }
  return out
}

function weightRange(weight: string): [number, number] | undefined {
  const named: Record<string, number> = { normal: 400, bold: 700 }
  const values = weight.trim().split(/\s+/).map((w) => named[w.toLowerCase()] ?? Number(w))
  if (values.length === 0 || values.length > 2 || values.some((v) => !Number.isFinite(v))) return undefined
  return [values[0], values[values.length - 1]]
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
  return whileHoldingStyles(projectPath, () => dropGoogleFontsNow(projectPath))
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
export function refreshGoogleFonts(projectPath: string): Promise<{ failed: boolean; text: string } | null> {
  // Under the lock from the first read, not only from the fetch: the `styles` part of a template
  // import takes the Google block out of custom.scss for the length of two writes, and a door that
  // asked in between read "this project holds no Google fonts" and built without them. That it
  // waited anyway was the order of the calls at the build door - migrateFontUrls came first and
  // held the lock (thirty-eighth review, finding 4). Reentrant, so the fetch inside costs nothing.
  return whileHoldingStyles(projectPath, () => refreshGoogleFontsNow(projectPath))
}

async function refreshGoogleFontsNow(projectPath: string): Promise<{ failed: boolean; text: string } | null> {
  try {
    const info = await readCustomScss(projectPath)
    if (!hasGoogleFontsBlock(info.content)) return null
    const config = await readConfig(projectPath)
    if (config.theme.fontOrigin !== 'local') return null
    const result = await fetchGoogleFonts(projectPath, (config.theme.typography ?? {}) as Record<string, unknown>)
    if (!result.changed) return null
    // A run that deletes says so, also when it fetched nothing: the first build after 1.0.1 took
    // 54 rules and 23 files off gui-test and the log was silent, because the one sentence here
    // was "fetched n files" and n was 0 (thirty-eighth review, finding 1).
    const own = [...result.ownFamilies, ...result.coveredFamilies.filter((f) => !result.ownFamilies.includes(f))]
    const sentences = [
      result.files.length > 0 && mainT('googleFontsRefreshed', { count: result.files.length }),
      own.length > 0 && mainT('googleFontsRefreshOwn', { families: own.join(', ') }),
      result.removedFiles.length > 0 && mainT('googleFontsRefreshRemoved', { count: result.removedFiles.length })
    ].filter((sentence): sentence is string => typeof sentence === 'string')
    return sentences.length > 0 ? { failed: false, text: sentences.join(' ') } : null
  } catch (error) {
    return { failed: true, text: mainT('googleFontsRefreshFailed', { message: error instanceof Error ? error.message : String(error) }) }
  }
}
