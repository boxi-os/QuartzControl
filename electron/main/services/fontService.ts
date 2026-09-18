import { mkdirSync } from 'fs'
import { copyFile, readFile, rm, stat } from 'fs/promises'
import { basename, extname, join } from 'path'
import type { UnusedImportedFont } from '@shared/ipc-contract'
import { readConfig } from './configService'
import {
  customScssPath,
  fontFileIn,
  getManagedBlock,
  joinUniqueRules,
  parseFontFaces,
  projectFontsDir,
  projectStylesheets,
  readCustomScss,
  splitRules,
  upsertManagedBlock,
  writeCustomScss
} from './styleService'
import { MAX_FONT_FILE_BYTES, readFontFace } from './fontFile'

const FORMAT_MAP: Record<string, string> = { ttf: 'truetype', otf: 'opentype', woff: 'woff', woff2: 'woff2' }

// quartz/static/ is copied verbatim to the build output's static/ dir (quartz/plugins/emitters/
// static.ts) - verified against a real project that already ships hand-placed font files at
// exactly this path, referenced from custom.scss as url('/static/fonts/<file>'). The directory is
// projectFontsDir(), shared with the preview, which reads the same files.

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
    `  src: url("/static/fonts/${fileName}") format("${format}");`,
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
 */
export async function unusedImportedFonts(projectPath: string, draftFamilies: string[]): Promise<UnusedImportedFont[]> {
  const info = await readCustomScss(projectPath)
  const body = getManagedBlock(info.content, FONTS_MARKER)
  if (!body) return []

  const texts = [upsertManagedBlock(info.content, FONTS_MARKER, '')]
  for (const path of await projectStylesheets(projectPath)) {
    if (path !== customScssPath(projectPath)) texts.push(await readFile(path, 'utf-8'))
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

  const stillNamed = new Set<string>()
  for (const path of await projectStylesheets(projectPath)) {
    for (const face of parseFontFaces(await readFile(path, 'utf-8'))) {
      const file = fontFileIn(projectFontsDir(projectPath), face.url)
      if (file) stillNamed.add(file)
    }
  }
  const removedFiles: string[] = []
  for (const face of removed.flatMap(parseFontFaces)) {
    const file = fontFileIn(projectFontsDir(projectPath), face.url)
    if (!file || stillNamed.has(file) || removedFiles.includes(basename(file))) continue
    await rm(file, { force: true })
    removedFiles.push(basename(file))
  }
  return { removedFiles }
}
