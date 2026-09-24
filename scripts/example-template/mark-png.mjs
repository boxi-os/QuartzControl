// Rastert die Marke nach PNG, hell und dunkel - als Projektbild aller vier Vorlagen.
//
//   node scripts/example-template/mark-png.mjs
//
// Die Marke im Kopf ist seit dem 2026-09-24 in allen vier Varianten das Projektbild:
// `quartz/static/icon.png` und `icon-dark.png`, die zwei Dateien, die die App unter
// „Konfiguration → Projektbild“ ersetzt. Vorher stand sie im Example (und damit in Doku und Plugin)
// als Inline-SVG in der Konfiguration und in der Basis als `qc-mark-*.png` - in beiden Fällen
// erreichte ein Bild, das der Nutzer in der App wählte, das Favicon, aber nicht den Kopf.
//
// Warum ein Skript und nicht zwei eingecheckte Exporte aus einem Zeichenprogramm: Es ist dieselbe
// Zeichnung wie das App-Icon, und die einzige Quelle dafür ist
// `build/icon-source/quartzcontrol-icon.svg`. Die zwei PNG werden aus `site-mark.mjs` gebildet,
// also aus demselben `trimmed()` und derselben Abdunklung - eine zweite, von Hand exportierte
// Kopie wäre die, die stillschweigend aufhört zu passen.
//
// Die Ausgabe ist **eingecheckt**, wie `build/background.png`. Das Skript ist der reproduzierbare
// Weg dorthin, nicht ein Schritt des Vorlagenbaus: Phase 4 von build-example-template.mjs setzt
// die zwei Dateien über die App als Projektbild der Werkstatt, und eine zweite Electron-Instanz
// für zwei Bilder, die sich nur ändern, wenn sich das Icon ändert, wäre eine Minute pro Lauf für
// nichts.
//
// Rastert über Electron, weil dieser Rechner keinen SVG-Konverter hat (kein ImageMagick, kein
// rsvg-convert, kein PIL) und Electron ohnehin hier liegt - derselbe Weg und dieselben drei
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
// Zipfel - auf dem hellen Grund unsichtbar, im Dunkelmodus vier leuchtende Punkte. Also
// `transparent: true` samt durchsichtiger Fensterfarbe, und geprüft wird es auch: Das Skript
// liest hinterher die vier Eckpixel der PNG-Datei und besteht darauf, dass sie durchsichtig sind.
import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { cropped, recoloured, DARK_STOPS, LIGHT_STOPS } from './site-mark.mjs'

const APP_DIR = path.resolve(import.meta.dirname, '../..')
const OUT_DIR = path.join(APP_DIR, 'scripts/example-template/site/static')

// 512 - die längste Kante, mit der die App ein Projektbild ablegt (MAX_STORED_EDGE in
// projectIconService.ts): Eine Datei in genau dieser Größe kopiert sie Byte für Byte, statt sie neu
// zu kodieren. Der Kopf zeigt die Marke mit 26 px, das Favicon entsteht daraus mit 48 px; bis zum
// 2026-09-24 waren es 78 px, gerade genug für den Kopf auf einem 3×-Bildschirm.
const SIZE = 512

const page = (svg) => `<!doctype html><meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; background: transparent }
  svg { display: block; width: 100vw; height: 100vh }
</style>
${svg}`

const targets = [
  { file: path.join(OUT_DIR, 'icon.png'), html: page(cropped(recoloured('qcMarkLight', LIGHT_STOPS))) },
  { file: path.join(OUT_DIR, 'icon-dark.png'), html: page(cropped(recoloured('qcMarkDark', DARK_STOPS))) }
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
    // Und die Mitten der vier Kanten deckend: Die Kachel reicht bis an den Rand (cropped() in
    // site-mark.mjs). Ein stehen gebliebener Rand wäre hier durchsichtig.
    const half = Math.floor(got.width / 2)
    const edges = [at(half, 1), at(half, got.height - 2), at(1, half), at(got.width - 2, half)]
    if (edges.some((a) => a < 200)) {
      throw new Error(path.basename(target.file) + ': Kanten nicht deckend, ein Rand ist stehen geblieben (Alpha ' + edges.join(', ') + ')')
    }
    fs.writeFileSync(target.file, image.toPNG())
    done.push(path.basename(target.file) + ' ' + got.width + 'x' + got.height + ', Ecken durchsichtig, Kanten deckend')
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
