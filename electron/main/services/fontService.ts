import { mkdirSync } from 'fs'
import { copyFile, readFile } from 'fs/promises'
import { basename, extname, join } from 'path'
import { getManagedBlock, readCustomScss, upsertManagedBlock, writeCustomScss } from './styleService'
import { readFontFace } from './fontFile'

const FORMAT_MAP: Record<string, string> = { ttf: 'truetype', otf: 'opentype', woff: 'woff', woff2: 'woff2' }

// quartz/static/ is copied verbatim to the build output's static/ dir (quartz/plugins/emitters/
// static.ts) - verified against a real project that already ships hand-placed font files at
// exactly this path, referenced from custom.scss as url('/static/fonts/<file>').
function fontsDir(projectPath: string): string {
  return join(projectPath, 'quartz', 'static', 'fonts')
}

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
  mkdirSync(fontsDir(projectPath), { recursive: true })
  const fileName = basename(sourcePath)
  await copyFile(sourcePath, join(fontsDir(projectPath), fileName))

  // What the file says about itself, rather than what the rule used to assume. Without a weight a
  // browser takes the face for 400 and synthesises every bold cut from it - which is what happened
  // to the example template's four variable fonts, whose axes went unused (BEFUNDE 3) - and two
  // cuts of one family (upright and italic, say) claim the same identity, so the second replaces
  // the first. An unreadable file is not an error: the rule is then written as it always was.
  const face = readFontFace(await readFile(sourcePath))
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
  const nextBody = existingBody ? `${existingBody}\n\n${cssBlock}` : cssBlock
  await writeCustomScss(projectPath, upsertManagedBlock(info.content, FONTS_MARKER, nextBody))

  return { fileName, weight: face?.weight, italic: face?.italic }
}
