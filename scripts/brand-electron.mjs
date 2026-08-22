// Rebrands the locally installed dev Electron.app bundle (macOS only) as "QuartzControl" -
// node_modules/electron ships its own binary the app is launched from directly in dev, so
// app.setName()/app.dock.setIcon() alone can't change the macOS menu bar title, Dock tile name,
// or Dock icon at startup: those are read from the bundle itself (its folder name/Info.plist/
// electron.icns) before any of our JS runs, and - confirmed by hand - the Dock's item name in
// particular tracks the app bundle's own path/registration, not just the Info.plist keys, so
// renaming Electron.app itself (not just editing Info.plist) was required to fix it there too.
// Only touches this project's local, gitignored copy; re-run automatically via "postinstall".
import { existsSync, copyFileSync, renameSync, writeFileSync } from 'fs'
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

if (!existsSync(oldAppDir) && !existsSync(appDir)) {
  console.warn('[brand-electron] node_modules/electron not installed yet, skipping')
  process.exit(0)
}

if (existsSync(appDir)) {
  console.log('[brand-electron] already branded, skipping')
  process.exit(0)
}

renameSync(oldAppDir, appDir)
// path.txt has no trailing newline by convention here - electron's index.js does
// `fs.readFileSync(pathFile, 'utf-8')` with no .trim(), so a stray newline breaks the path.
writeFileSync(pathTxt, 'QuartzControl.app/Contents/MacOS/Electron')

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
