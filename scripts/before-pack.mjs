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
import { cpSync, existsSync, rmSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { fetchGit } from './fetch-git.mjs'
import { buildHandbook, HANDBOOK_OUT, HANDBOOK_SITE } from './build-handbook.mjs'

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

  // Das Benutzerhandbuch. Anders als git lässt es sich nicht aus dem Netz holen - es entsteht aus
  // einem Quartz-Projekt, das nur auf der Maschine des Betreuers liegt (docs/handbuch.md). Deshalb
  // warnen und weiterpacken statt abbrechen: Ein Bau ohne Handbuch ist unvollständig, aber
  // benutzbar, und der Menüpunkt sagt es dem Nutzer statt ins Leere zu greifen.
  //
  // Auf einer anderen Baumaschine ist genau das der Normalfall, und zwar still: Gemessen am
  // 2026-09-09 trug resources/ auf der Debian-VM nur git, licenses, runtime und templates, die
  // Linux-Pakete vom 2026-09-08 reisten also alle ohne Handbuch. Dort setzt man
  // QUARTZCONTROL_HANDBOOK_SITE auf eine vom Mac herübergespiegelte, gebaute Website - von Hand
  // nach resources/handbook zu kopieren hilft nicht, das räumt der catch unten wieder weg.
  try {
    const built = buildHandbook()
    // Welcher der beiden Wege gegriffen hat, gehört ins Log: Ein übernommenes Handbuch ist nur so
    // frisch wie der Ordner, auf den QUARTZCONTROL_HANDBOOK_SITE zeigt, und das sieht man dem
    // Ergebnis nicht an.
    const how = built.copiedFrom ? `übernommen aus ${built.copiedFrom}` : 'gebaut'
    console.log(`[handbuch] ${built.files} Dateien, ${built.megabytes} MB nach resources/handbook (${how})`)
  } catch (err) {
    // Zwei Wege, zwei Sätze: "nicht gebaut" schickt den Leser zum Handbuch-Projekt, "nicht
    // übernommen" zu der Variablen, die er selbst gesetzt hat.
    console.warn(
      HANDBOOK_SITE ? `[handbuch] NICHT übernommen: ${err.message}` : `[handbuch] NICHT gebaut: ${err.message}`
    )
    // Und dann auch wirklich ohne. `buildHandbook()` wirft, *bevor* es sein Ausgabeverzeichnis
    // leert - ohne diese Zeile nimmt `extraResources` mit, was vom letzten geglückten Lauf noch
    // dort liegt, und die App bekäme ein Handbuch, das eine andere Fassung beschreibt, während
    // das Bau-Log sagt, sie habe keines. Genau das Versprechen, für das es überhaupt mitreist
    // ("passt immer zu der Fassung, die gerade installiert ist"), an der einen Stelle, an der es
    // gebrochen werden kann. Ein frischer Klon merkt davon nichts: dort gibt es das Verzeichnis
    // noch nicht.
    const stale = existsSync(HANDBOOK_OUT)
    if (stale) rmSync(HANDBOOK_OUT, { recursive: true, force: true })
    console.warn(
      stale
        ? '[handbuch] Diese Fassung wird ohne Handbuch gepackt; die Kopie vom letzten Lauf wurde entfernt, damit keine veraltete mitreist.'
        : '[handbuch] Diese Fassung wird ohne Handbuch gepackt.'
    )
  }
}
