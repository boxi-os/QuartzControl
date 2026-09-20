// Rastert die Marke der Basis-Vorlage nach PNG, hell und dunkel.
//
//   node scripts/example-template/mark-png.mjs
//
// Warum PNG und nicht das Inline-SVG, das die Example-Vorlage benutzt: Die Basis-Vorlage soll
// zeigen, wie ein Bild aus `quartz/static/` in eine Layout-Box kommt — das ist der Weg, den ein
// Nutzer für sein eigenes Logo geht, und eine Vorlage, die nur den Weg vorführt, den niemand hat
// (ein SVG als Zeichenkette in der Konfiguration), führt am Fall vorbei.
//
// Warum ein Skript und nicht zwei eingecheckte Exporte aus einem Zeichenprogramm: Es ist dieselbe
// Zeichnung wie das Inline-SVG und wie das App-Icon, und die einzige Quelle dafür ist
// `build/icon-source/quartzcontrol-icon.svg`. Die zwei PNG werden aus `site-mark.mjs` gebildet,
// also aus demselben `trimmed()` und derselben Abdunklung — eine zweite, von Hand exportierte
// Kopie wäre die, die stillschweigend aufhört zu passen.
//
// Die Ausgabe ist **eingecheckt**, wie `build/background.png`. Das Skript ist der reproduzierbare
// Weg dorthin, nicht ein Schritt des Vorlagenbaus: Phase 3 von build-example-template.mjs startet
// schon eine Electron-Instanz über Playwright, und eine zweite daneben für zwei Bilder, die sich
// nur ändern, wenn sich das Icon ändert, wäre eine Minute pro Lauf für nichts.
//
// Rastert über Electron, weil dieser Rechner keinen SVG-Konverter hat (kein ImageMagick, kein
// rsvg-convert, kein PIL) und Electron ohnehin hier liegt — derselbe Weg und dieselben drei
// Fallen wie in scripts/dmg-background.mjs, von dort übernommen:
//
//   * Das Fenster wird in CSS-Pixeln gemessen, die Aufnahme kommt in Gerätepixeln zurück. Also
//     Fenstergröße = Zielpixel ÷ `scaleFactor`, und die Größe der Aufnahme wird danach gegen das
//     Soll geprüft. Geworfen statt skaliert: Eine Skalierung würde genau den Schärfegewinn
//     wieder wegnehmen, für den dieses Skript existiert.
//   * Beide Fenster werden geöffnet, bevor das erste aufgenommen wird. Eines zu zerstören und das
//     nächste im selben Tick zu öffnen lässt dessen `loadURL` mit ERR_FAILED (-2) scheitern.
//   * `--no-sandbox` für Baumaschinen, die das aus einem Container heraus starten, wo Chromiums
//     Sandbox User-Namespaces braucht, die dort oft fehlen. Sicher, weil die Seite eine
//     Zeichenkette ist, die dieses Skript selbst geschrieben hat.
//
// Eine vierte, die dort nicht vorkommt: Das Icon ist eine abgerundete Kachel, außerhalb ihrer
// Ecken ist nichts. Ein Fenster ist standardmäßig weiß, und eine Aufnahme davon hätte vier weiße
// Zipfel — auf dem hellen Grund unsichtbar, im Dunkelmodus vier leuchtende Punkte. Also
// `transparent: true` samt durchsichtiger Fensterfarbe, und geprüft wird es auch: Das Skript
// liest hinterher die vier Eckpixel der PNG-Datei und besteht darauf, dass sie durchsichtig sind.
import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { recoloured, DIM_DARK } from './site-mark.mjs'

const APP_DIR = path.resolve(import.meta.dirname, '../..')
const OUT_DIR = path.join(APP_DIR, 'scripts/example-template/basic-site/static')

// 78 = 3 × 26. Die Layout-Box zeigt die Marke mit `width="26" height="26"`, genau wie das Inline-
// SVG der Example-Vorlage; 3× deckt die Bildschirme ab, die es gibt, ohne dass eine vierte Datei
// nötig wird. Ein SVG bräuchte diese Zahl nicht — das ist der Preis dieses Weges und der Grund,
// warum die Example-Vorlage ihn nicht geht.
const SIZE = 78

const page = (svg) => `<!doctype html><meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; background: transparent }
  svg { display: block; width: 100vw; height: 100vh }
</style>
${svg}`

const targets = [
  { file: path.join(OUT_DIR, 'qc-mark-light.png'), html: page(recoloured('qcMarkLight', 1)) },
  { file: path.join(OUT_DIR, 'qc-mark-dark.png'), html: page(recoloured('qcMarkDark', DIM_DARK)) }
]

fs.mkdirSync(OUT_DIR, { recursive: true })

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qc-mark-png-'))
fs.writeFileSync(
  path.join(tmp, 'main.js'),
  `const { app, BrowserWindow, screen } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const targets = ${JSON.stringify(targets)}
const size = ${SIZE}
app.whenReady().then(async () => {
  const scale = screen.getPrimaryDisplay().scaleFactor
  const windows = targets.map((target) => ({
    target,
    win: new BrowserWindow({
      width: Math.round(size / scale),
      height: Math.round(size / scale),
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      useContentSize: true
    })
  }))
  for (const { target, win } of windows) {
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(target.html))
  }
  await new Promise((r) => setTimeout(r, 400))
  const done = []
  for (const { target, win } of windows) {
    const image = await win.webContents.capturePage()
    const got = image.getSize()
    if (got.width !== size || got.height !== size) {
      throw new Error(path.basename(target.file) + ': aufgenommen ' + got.width + 'x' + got.height + ', gewollt ' + size + 'x' + size)
    }
    // Die vier Eckpixel gegen die Durchsichtigkeit. toBitmap() gibt BGRA, also ist das vierte
    // Byte jedes Pixels sein Alpha.
    const bitmap = image.toBitmap()
    const at = (x, y) => bitmap[(y * got.width + x) * 4 + 3]
    const corners = [at(0, 0), at(got.width - 1, 0), at(0, got.height - 1), at(got.width - 1, got.height - 1)]
    if (corners.some((a) => a !== 0)) {
      throw new Error(path.basename(target.file) + ': Ecken nicht durchsichtig (Alpha ' + corners.join(', ') + ')')
    }
    fs.writeFileSync(target.file, image.toPNG())
    done.push(path.basename(target.file) + ' ' + got.width + 'x' + got.height + ', Ecken durchsichtig')
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

const child = spawn(electronBin, [path.join(tmp, 'main.js'), '--no-sandbox'], { stdio: 'inherit' })
child.on('exit', (code) => {
  fs.rmSync(tmp, { recursive: true, force: true })
  process.exit(code ?? 1)
})
