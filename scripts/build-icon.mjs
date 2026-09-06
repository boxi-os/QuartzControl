// Assembles the app icon from the exported PNGs in build/icon-source/ - it draws nothing itself.
// The artwork is an Affinity Designer document (the .af file is deliberately not versioned, see
// .gitignore; quartzcontrol-icon.svg is the versioned vector copy - since the 2026-09-06 redraw a
// real vector of 3 kB rather than the 98 kB of bitmap-in-an-SVG the gear-and-crystal glyph was).
// Every size is exported from that document, 16 and 32 included.
//
// Run `npm run icon` after re-exporting. It overwrites build/icon.icns (the macOS bundle icon),
// build/icon.png (512 px: Linux package icon, BrowserWindow icon, macOS Dock icon),
// build/icon-256.png and src/assets/app-icon.png (the icon the start page shows). All four are
// checked in, and writing them from one command is the only thing that keeps them in sync - the
// renderer copy had been a stale duplicate of the previous icon for two weeks. The .icns step
// shells out to iconutil and is therefore macOS-only; on other platforms the flat PNGs are still
// written. No dependencies, in the same spirit as the generator this replaced.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'fs'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const buildDir = join(root, 'build')
const sourceDir = join(buildDir, 'icon-source')

// Sizes the vector document is exported to - all of them now.
//
// Until 2026-09-06 the two smallest were *derived* here, by box-averaging the 1024 in linear light
// with a light unsharp pass, because the exports at those sizes read worse: the black gear and the
// crystal inside it merged into one grey blob. The note that closed that measurement said what
// would actually fix it - "a simplified glyph drawn in the vector document, not a better filter" -
// and that is what the redraw did. With a glyph that survives 16 px, the export wins at every size
// and the 150 lines of PNG decoder, resampler and encoder that existed only for those two are
// gone with it.
const EXPORTED = [16, 32, 64, 128, 256, 512, 1024]

const sourceFor = (size) => join(sourceDir, `icon-${size}.png`)

// --- assembling ---------------------------------------------------------------------------------

function requireExport(size) {
  const path = sourceFor(size)
  if (!existsSync(path)) throw new Error(`missing export: ${path}`)
  // The IHDR is always the first chunk after the 8-byte signature. An export at the wrong size
  // would otherwise reach iconutil and be refused there by a message that does not name the file.
  const head = readFileSync(path).subarray(0, 24)
  if (head.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`not a PNG: ${path}`)
  const width = head.readUInt32BE(16)
  const height = head.readUInt32BE(20)
  if (width !== size || height !== size) {
    throw new Error(`${path} is ${width}x${height}, expected ${size}x${size}`)
  }
  return path
}

for (const size of EXPORTED) requireExport(size)
// 512 rather than 1024 for icon.png: the Dock draws at most 256 px and the file travels inside the
// packaged app (see electron-builder.yml `files`). 256 is what the start page and the docs use.
copyFileSync(sourceFor(512), join(buildDir, 'icon.png'))
copyFileSync(sourceFor(256), join(buildDir, 'icon-256.png'))
copyFileSync(sourceFor(256), join(root, 'src/assets/app-icon.png'))
console.log('wrote build/icon.png, build/icon-256.png, src/assets/app-icon.png')

if (process.platform === 'darwin') {
  const iconsetDir = join(buildDir, 'QuartzControl.iconset')
  if (existsSync(iconsetDir)) rmSync(iconsetDir, { recursive: true })
  mkdirSync(iconsetDir, { recursive: true })

  const iconsetSpecs = [
    ['icon_16x16.png', 16],
    ['icon_16x16@2x.png', 32],
    ['icon_32x32.png', 32],
    ['icon_32x32@2x.png', 64],
    ['icon_128x128.png', 128],
    ['icon_128x128@2x.png', 256],
    ['icon_256x256.png', 256],
    ['icon_256x256@2x.png', 512],
    ['icon_512x512.png', 512],
    ['icon_512x512@2x.png', 1024]
  ]
  for (const [filename, size] of iconsetSpecs) copyFileSync(sourceFor(size), join(iconsetDir, filename))

  execFileSync('iconutil', ['-c', 'icns', '-o', join(buildDir, 'icon.icns'), iconsetDir])
  rmSync(iconsetDir, { recursive: true })
  console.log('wrote build/icon.icns (ten entries, every one an export)')
} else {
  console.log('skipping .icns (iconutil is macOS-only)')
}
