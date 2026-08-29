// Rebrands the locally installed dev Electron.app bundle (macOS only) as "QuartzControl" -
// node_modules/electron ships its own binary the app is launched from directly in dev, so
// app.setName()/app.dock.setIcon() alone can't change the macOS menu bar title, Dock tile name,
// or Dock icon at startup: those are read from the bundle itself (its folder name/Info.plist/
// electron.icns) before any of our JS runs, and - confirmed by hand - the Dock's item name in
// particular tracks the app bundle's own path/registration, not just the Info.plist keys, so
// renaming Electron.app itself (not just editing Info.plist) was required to fix it there too.
// Only touches this project's local, gitignored copy; re-run automatically via "postinstall".
import { existsSync, copyFileSync, readFileSync, renameSync, rmSync, writeFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

if (process.platform !== 'darwin') process.exit(0)

const LSREGISTER =
  '/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const distDir = join(root, 'node_modules/electron/dist')
const oldAppDir = join(distDir, 'Electron.app')
const appDir = join(distDir, 'QuartzControl.app')
const pathTxt = join(root, 'node_modules/electron/path.txt')
const iconSrc = join(root, 'build/icon.icns')
const iconDest = join(appDir, 'Contents/Resources/electron.icns')

const BRANDED_PATH = 'QuartzControl.app/Contents/MacOS/Electron'

if (!existsSync(oldAppDir) && !existsSync(appDir)) {
  console.warn('[brand-electron] node_modules/electron not installed yet, skipping')
  process.exit(0)
}

// The "am I done" test has to be all three things, not just "QuartzControl.app is there".
// electron's own install step re-extracts the zip whenever it decides the install is stale, which
// puts a fresh Electron.app next to the branded one *and* rewrites path.txt back to it - so a
// check on the branded bundle alone declared success while every `npm run dev` after any
// `npm install` launched the unbranded copy again, with 276 MB of duplicate bundle beside it.
// Measured after one such install: both directories present, path.txt reading Electron.app.
const pathTxtIsBranded = existsSync(pathTxt) && readFileSync(pathTxt, 'utf-8') === BRANDED_PATH
if (existsSync(appDir) && !existsSync(oldAppDir) && pathTxtIsBranded) {
  console.log('[brand-electron] already branded, skipping')
  process.exit(0)
}

if (!existsSync(oldAppDir)) {
  // Only the branded bundle is there and path.txt lost track of it - nothing to rename.
  writeFileSync(pathTxt, BRANDED_PATH)
  console.log('[brand-electron] path.txt wieder auf QuartzControl.app gesetzt')
  process.exit(0)
}

// A fresh extraction happened: the branded copy is the previous version and would otherwise sit
// there unused forever.
if (existsSync(appDir)) rmSync(appDir, { recursive: true, force: true })

renameSync(oldAppDir, appDir)
// path.txt has no trailing newline by convention here - electron's index.js does
// `fs.readFileSync(pathFile, 'utf-8')` with no .trim(), so a stray newline breaks the path.
writeFileSync(pathTxt, BRANDED_PATH)

const plistPath = join(appDir, 'Contents/Info.plist')
execFileSync('/usr/libexec/PlistBuddy', [
  '-c', 'Set :CFBundleName QuartzControl',
  '-c', 'Set :CFBundleDisplayName QuartzControl',
  plistPath
])

if (existsSync(iconSrc)) copyFileSync(iconSrc, iconDest)

// forces LaunchServices to re-read the (renamed, re-icon'd) bundle instead of serving a stale
// cached entry for the old path - without this the Dock kept showing "Electron" even after the
// rename above, until the next unrelated LaunchServices cache invalidation.
try {
  execFileSync(LSREGISTER, ['-f', appDir])
} catch {
  // best-effort - a stale Dock/Finder icon cache is cosmetic and clears on its own eventually
}

console.log('[brand-electron] renamed dev Electron.app to QuartzControl.app')
