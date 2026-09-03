// electron-builder ruft das hier einmal je (Plattform, Architektur), bevor es Dateien kopiert.
//
// Warum ein Haken und kein Schritt in `npm run dist:*`: das git-Bundle ist architekturabhängig, und
// nur electron-builder weiß im Moment des Packens, welche Architektur gerade dran ist - ein `dist`
// für arm64 *und* x64 packt nacheinander zwei Bundles. Außerdem greift ein Haken auch, wenn jemand
// `electron-builder` direkt aufruft, was beim Entwickeln die Regel ist.
//
// Das geholte Bundle landet in resources/git/<platform>-<arch>/ und wird von dort nach
// resources/git/current/ gespiegelt, weil `extraResources` einen festen Pfad braucht:
// electron-builder kennt zwar Makros, aber ein falsch geratenes Makro fällt erst als fehlendes
// git im fertigen Bundle auf - ein Verzeichnis, das der Haken selbst setzt, kann nicht danebengehen.
import { cpSync, rmSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { fetchGit } from './fetch-git.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

// electron-builder reicht die Architektur als Zahl aus seiner Arch-Aufzählung; die Namen daraus
// sind die von Node (x64, arm64), nur ia32 heißt bei Node x86.
const ARCH = { 0: 'ia32', 1: 'x64', 2: 'armv7l', 3: 'arm64', 4: 'universal' }

export default async function beforePack(context) {
  const platform = context.electronPlatformName
  const arch = ARCH[context.arch] ?? process.arch
  const dest = join(root, 'resources/git', `${platform}-${arch}`)

  await fetchGit({ platform, arch, dest })

  const current = join(root, 'resources/git/current')
  rmSync(current, { recursive: true, force: true })
  // dereference: false - das Bundle besteht zum größten Teil aus Symlinks auf die eine
  // git-Binärdatei (414 Einträge in libexec/git-core, 3,3 MB Ziel). Sie aufzulösen bläht das
  // Bundle von 26 MB auf über 1 GB.
  cpSync(dest, current, { recursive: true, dereference: false, verbatimSymlinks: true })
  console.log(`[git] für ${platform}-${arch} nach resources/git/current gespiegelt`)
}
