// Draws the DMG window's background into build/background.png and build/background@2x.png.
//
// Why a script rather than a checked-in export from a drawing program: the two files are the same
// picture at two sizes, and the only thing that must stay true about them is where the two icons
// sit - x=140 and x=400 at y=180, from `dmg.contents` in electron-builder.yml. A number in a
// drawing program drifts away from a number in a config file; here they are both read from the
// same two constants below.
//
// It has to exist at all because electron-builder's default is not "no background": dmg-builder
// falls back to its own template as soon as neither `background` nor `backgroundColor` is set
// (dmg.js:116), and that template is a light grey field with a dashed box and a dashed arrow in
// the middle - measured in QuartzControl-0.1.0-arm64.dmg, whose .background.tiff is byte-for-byte
// the size of node_modules/dmg-builder/templates/background.tiff. Those two pale shapes sit
// nowhere near x=140 and x=400, which is what made them look like a defect.
//
// Rasterised by Electron rather than by a converter, because this machine has none (no
// ImageMagick, no rsvg-convert, no PIL) and Electron is already here. The picture is one SVG
// scaled to the window, so both sizes are real rasterisations at their own pixel size - the @1x
// file is not a downsample of the @2x one. electron-builder then folds the pair into a
// multi-resolution TIFF with `tiffutil -cathidpicheck` (dmgUtil.js), the same shape its own
// template has.
//
//   node scripts/dmg-background.mjs
import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

const APP_DIR = path.resolve(import.meta.dirname, '..')

// The DMG window, and where dmg.contents puts the two icons in it.
const W = 540
const H = 380
const APP_X = 140
const LINK_X = 400
const ICON_Y = 180

// From src/index.css: --text (slate-900), --text-muted (slate-500), --ground. The two tints are the
// ends of the app icon's gradient (build/icon-source), at an opacity where they read as a warm and
// a cool corner rather than as colour.
const INK = '#0f172a'
const MUTED = '#94a3b8'
const COOL = '#455a9a'
const WARM = '#d97b7b'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fafafb"/>
      <stop offset="1" stop-color="#eceef2"/>
    </linearGradient>
    <radialGradient id="cool" cx="0" cy="0" r="1">
      <stop offset="0" stop-color="${COOL}" stop-opacity="0.14"/>
      <stop offset="1" stop-color="${COOL}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="warm" cx="1" cy="1" r="1">
      <stop offset="0" stop-color="${WARM}" stop-opacity="0.14"/>
      <stop offset="1" stop-color="${WARM}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#ground)"/>
  <rect width="${W}" height="${H}" fill="url(#cool)"/>
  <rect width="${W}" height="${H}" fill="url(#warm)"/>

  <text x="${W / 2}" y="56" text-anchor="middle" fill="${INK}"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"
        font-size="17" font-weight="600" letter-spacing="0.2">QuartzControl</text>

  <!-- Halfway between the two icon slots, and narrow enough to stay out of both: an icon is 128px
       wide, so the free strip runs from ${APP_X + 64} to ${LINK_X - 64}. -->
  <g transform="translate(${(APP_X + LINK_X) / 2}, ${ICON_Y})" fill="none" stroke="${MUTED}"
     stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.55">
    <path d="M -23 0 H 23"/>
    <path d="M 14 -9 L 23 0 L 14 9"/>
  </g>
</svg>`

const html = `<!doctype html><meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #fafafb }
  svg { display: block; width: 100vw; height: 100vh }
</style>
${svg}`

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qc-dmg-bg-'))

// Two windows rather than one plus a resize: the CSS pixel size of the window decides how many
// device pixels capturePage() hands back, and a 270x190 window on a 2x display is exactly the
// 540x380 the @1x file needs.
const targets = [
  { file: path.join(APP_DIR, 'build/background.png'), w: W, h: H },
  { file: path.join(APP_DIR, 'build/background@2x.png'), w: W * 2, h: H * 2 }
]

fs.writeFileSync(
  path.join(tmp, 'main.js'),
  `const { app, BrowserWindow, screen } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const targets = ${JSON.stringify(targets)}
const page = ${JSON.stringify(html)}
app.whenReady().then(async () => {
  const scale = screen.getPrimaryDisplay().scaleFactor
  // Both windows before either capture: destroying one and opening the next in the same tick makes
  // the second load fail with ERR_FAILED (-2) before its page exists. Re-measured 2026-09-09 with
  // this repo's Electron, and it is not the sandbox - the same two windows fail the same way with
  // and without --no-sandbox. Opening both up front is the fix that holds, because then no window
  // is destroyed before the last one has loaded.
  const windows = targets.map((target) => {
    // The window is measured in CSS pixels; the capture comes back in device pixels.
    const win = new BrowserWindow({
      width: Math.round(target.w / scale),
      height: Math.round(target.h / scale),
      show: false,
      useContentSize: true
    })
    return { target, win }
  })
  const done = []
  for (const { target, win } of windows) {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(page))
  }
  await new Promise((r) => setTimeout(r, 400))
  for (const { target, win } of windows) {
    const image = await win.webContents.capturePage()
    const size = image.getSize()
    if (size.width !== target.w || size.height !== target.h) {
      throw new Error(path.basename(target.file) + ': captured ' + size.width + 'x' + size.height + ', wanted ' + target.w + 'x' + target.h)
    }
    fs.writeFileSync(target.file, image.toPNG())
    done.push(path.basename(target.file) + ' ' + size.width + 'x' + size.height)
  }
  console.log(done.join('\\n'))
  for (const { win } of windows) win.destroy()
  app.quit()
}).catch((err) => {
  console.error(String(err && err.stack ? err.stack : err))
  process.exit(1)
})`
)

const electronBin = path.join(
  APP_DIR,
  'node_modules/electron/dist',
  fs.readFileSync(path.join(APP_DIR, 'node_modules/electron/path.txt'), 'utf-8')
)

// --no-sandbox: for the build machines that run this from inside a container, where Chromium's
// sandbox needs user namespaces that are often unavailable and Electron then refuses to start at
// all. It is safe here for the usual reason - the page is a string this script wrote itself, no
// remote content, no untrusted input.
//
// What it is *not* for: the ERR_FAILED above. That was the earlier reading here, and it is wrong.
// Measured 2026-09-09 on this machine, three runs each of a copy of this script writing into a
// throwaway directory, with the flag and without: both exit 0 and write byte-identical files
// (`a75eb0c4…`, `258b02a7…` - the same checksums as the ones checked in). A --no-sandbox with a
// reason that does not hold is what the next Electron script copies.
const child = spawn(electronBin, [path.join(tmp, 'main.js'), '--no-sandbox'], { stdio: 'inherit' })
child.on('exit', (code) => {
  fs.rmSync(tmp, { recursive: true, force: true })
  process.exit(code ?? 1)
})
