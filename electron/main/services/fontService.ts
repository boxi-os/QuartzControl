import { mkdirSync } from 'fs'
import { copyFile } from 'fs/promises'
import { basename, extname, join } from 'path'
import { readCustomScss, writeCustomScss } from './styleService'

const FORMAT_MAP: Record<string, string> = { ttf: 'truetype', otf: 'opentype', woff: 'woff', woff2: 'woff2' }

// quartz/static/ is copied verbatim to the build output's static/ dir (quartz/plugins/emitters/
// static.ts) - verified against a real project that already ships hand-placed font files at
// exactly this path, referenced from custom.scss as url('/static/fonts/<file>').
function fontsDir(projectPath: string): string {
  return join(projectPath, 'quartz', 'static', 'fonts')
}

const MANAGED_MARKER = '/* --- Quartz-GUI: local @font-face rules (generated on font import) --- */'

// Copies the font file into quartz/static/ and appends a generated @font-face rule to
// custom.scss under a recognizable marker comment - unlike the interactive style editor (a
// whole-file edit surface the user owns), this is a one-shot programmatic append, so a clearly
// delineated managed section is appropriate here.
export async function importFontFile(projectPath: string, sourcePath: string, family: string): Promise<{ fileName: string }> {
  const ext = extname(sourcePath).slice(1).toLowerCase()
  const format = FORMAT_MAP[ext] ?? ext
  mkdirSync(fontsDir(projectPath), { recursive: true })
  const fileName = basename(sourcePath)
  await copyFile(sourcePath, join(fontsDir(projectPath), fileName))

  const cssBlock = `@font-face {\n  font-family: "${family}";\n  src: url("/static/fonts/${fileName}") format("${format}");\n  font-display: swap;\n}`

  const info = await readCustomScss(projectPath)
  const next = info.content.includes(MANAGED_MARKER)
    ? `${info.content}\n\n${cssBlock}`
    : `${info.content}\n\n${MANAGED_MARKER}\n${cssBlock}`
  await writeCustomScss(projectPath, next)

  return { fileName }
}
