// Two steps, in this order, because from Electron 42 on the package no longer downloads its own
// binary: `electron`'s package.json has no `scripts` field at all any more, only an
// `install-electron` bin. Without this, a fresh `npm install` leaves node_modules/electron with
// no dist/ - `npm run dev`, the run-desktop driver and scripts/smoke.mjs all fail with
// "Error: Electron uninstall" or a missing path.txt, which reads like a broken checkout rather
// than a missing step.
//
// Doing it here rather than chaining shell commands in package.json also means the download is
// skipped cleanly in a production install (--omit=dev), where electron is not present at all.
import { existsSync } from 'fs'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

function run(script, label) {
  if (!existsSync(script)) {
    console.log(`[postinstall] ${label} übersprungen - ${script} nicht vorhanden`)
    return
  }
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit', cwd: root })
  // Never fail the install over this: a developer without network still gets a working checkout,
  // and both steps say clearly enough what did not happen.
  if (result.status !== 0) console.log(`[postinstall] ${label} fehlgeschlagen (Code ${result.status})`)
}

run(join(root, 'node_modules/electron/install.js'), 'Electron-Download')
run(join(root, 'scripts/brand-electron.mjs'), 'Electron-Branding')
