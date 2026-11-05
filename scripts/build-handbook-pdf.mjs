// Macht aus dem gebauten Benutzerhandbuch ein PDF mit Lesezeichen - die deutsche Fassung.
//
//   npm run build:handbook-pdf [-- --site <ordner>] [--out <datei.pdf>] [--no-toc]
//
// Quelle ist die *gebaute* Website in resources/handbook (also erst `npm run build:handbook`), nicht
// der Vault: Das PDF soll zeigen, was die App mitbringt, mit denselben Callouts, Tabellen und
// Bildern - und eine zweite Markdown-Umsetzung neben Quartz' eigener liefe auseinander. Ziel ist
// standardmäßig release/QuartzControl-Handbuch-<version>.pdf, neben den Paketen.
//
// Seit dem 2026-11-05 macht das kein eigener Weg mehr, sondern der Dokument-Export der App
// (electron/main/services/export/, docs/decisions/export.md): Das Skript bündelt dessen Module mit
// esbuild und führt sie in Electron aus - kein Chrome mehr, und das Handbuch-PDF ist die
// Gegenprobe für den Export. Was hier früher an Regeln stand (Druckrand der Tabellen, Kapitel-
// Startseiten als Wegweiser, Prüfungen vor dem Drucken), steht jetzt dort.
//
// Welche Seiten in welcher Reihenfolge: scripts/handbook.book.json, ein Buch wie die der App. Die
// Reihenfolge ist eine eigene (Kapitel nach ihrer Nummer, dann „Anhang“ mit drei Seiten), und eine
// Seite, die das Buch nicht nennt oder die es nicht mehr gibt, bricht den Lauf ab - so wie früher
// die Liste APPENDIX: Ein Export hängte sie stillschweigend ans Ende.
//
// Vorher gemessen (altes Skript, 2026-11-05, Handbuch vom 2026-10-26): 56 Quellseiten → 129
// PDF-Seiten, Lesezeichen 10/47/244/4. Mit `--no-toc` liefert dieses Skript dieselben Zahlen; mit
// Inhaltsverzeichnis (Standard) drei Seiten mehr.
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import esbuild from 'esbuild'
import { HANDBOOK_OUT } from './build-handbook.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const argv = process.argv.slice(2)
const arg = (name, fallback) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : fallback)
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version
const SITE = path.resolve(arg('--site', HANDBOOK_OUT))
const OUT = path.resolve(arg('--out', path.join(ROOT, 'release', `QuartzControl-Handbuch-${VERSION}.pdf`)))
const BOOK = path.join(ROOT, 'scripts', 'handbook.book.json')

// Was in Electron läuft. Das Schließen des Exportfensters schließt hier das letzte Fenster, und
// ohne eigenen `window-all-closed` beendet sich Electron dann, bevor die Kopie des Builds gelöscht
// ist (gemessen an den Messbündeln vom 2026-11-05).
const ENTRY = `
import { app } from 'electron'
import { writeFileSync } from 'node:fs'
import { refreshMainLanguage } from './electron/main/i18n'
import { exportBook } from './electron/main/services/export/exportService'
app.on('window-all-closed', () => undefined)
app.setPath('userData', process.env.QC_USERDATA)
app.whenReady().then(async () => {
  let code = 0
  try {
    await refreshMainLanguage()
    const book = JSON.parse(process.env.QC_BOOK)
    const outcome = await exportBook({
      targetId: process.env.QC_TARGET, projectPath: process.env.QC_ROOT, buildDir: process.env.QC_SITE,
      book, formats: ['pdf'], onProgress: () => undefined
    })
    if (outcome.order.missing.length === 0 && outcome.order.appended.length === 0) writeFileSync(process.env.QC_OUT, outcome.files[0].bytes)
    console.log('QC_RESULT ' + JSON.stringify({ report: outcome.report, order: outcome.order, pages: outcome.pages }))
  } catch (err) {
    console.log('QC_ERROR ' + JSON.stringify(String(err && err.message || err)))
    code = 1
  }
  app.exit(code)
})
`

function electronBinary() {
  const rel = fs.readFileSync(path.join(ROOT, 'node_modules/electron/path.txt'), 'utf-8')
  return path.join(ROOT, 'node_modules/electron/dist', rel)
}

export async function buildHandbookPdf({ site = SITE, out = OUT, toc = !argv.includes('--no-toc') } = {}) {
  if (!fs.existsSync(path.join(site, 'index.html'))) {
    throw new Error(`Kein gebautes Handbuch in ${site} — zuerst \`npm run build:handbook\``)
  }
  const book = { ...JSON.parse(fs.readFileSync(BOOK, 'utf8')), id: 'handbuch', toc }
  book.subtitle = `${book.subtitle} · Fassung ${VERSION}`

  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'quartzcontrol-handbook-pdf-'))
  try {
    const bundle = path.join(work, 'main.cjs')
    await esbuild.build({
      stdin: { contents: ENTRY, resolveDir: ROOT, loader: 'ts' },
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: bundle,
      external: ['electron'],
      alias: { '@shared': path.join(ROOT, 'shared') },
      logLevel: 'error'
    })
    fs.mkdirSync(path.dirname(out), { recursive: true })
    const started = Date.now()
    const output = await new Promise((resolve, reject) => {
      const child = spawn(electronBinary(), [bundle], {
        env: {
          ...process.env,
          QC_USERDATA: path.join(work, 'userdata'),
          QC_BOOK: JSON.stringify(book),
          QC_TARGET: randomUUID(),
          QC_ROOT: ROOT,
          QC_SITE: site,
          QC_OUT: out
        },
        stdio: ['ignore', 'pipe', 'pipe']
      })
      let text = ''
      child.stdout.on('data', (d) => (text += d))
      child.stderr.on('data', () => undefined)
      child.on('error', reject)
      child.on('close', () => resolve(text))
    })
    const error = output.match(/^QC_ERROR (.*)$/m)
    if (error) throw new Error(JSON.parse(error[1]))
    const line = output.match(/^QC_RESULT (.*)$/m)
    if (!line) throw new Error(`Der Export hat kein Ergebnis gemeldet:\n${output.slice(-2000)}`)
    const result = JSON.parse(line[1])
    const { missing, appended } = result.order
    if (missing.length || appended.length) {
      throw new Error(
        `Die Seiten passen nicht zu ${path.relative(ROOT, BOOK)}` +
          (appended.length ? ` — nicht eingetragen: ${appended.join(', ')}` : '') +
          (missing.length ? ` — eingetragen, aber nicht gebaut: ${missing.join(', ')}` : '')
      )
    }
    const pdfLine = result.report.find((l) => l.startsWith('PDF:')) ?? ''
    console.log(`[handbuch-pdf] ${result.pages} Quellseiten → ${pdfLine.replace(/^PDF: /, '')} ${((Date.now() - started) / 1000).toFixed(1)} s → ${path.relative(process.cwd(), out)}`)
    for (const l of result.report) if (!l.startsWith('PDF:')) console.log(`  ${l}`)
    return out
  } finally {
    fs.rmSync(work, { recursive: true, force: true })
  }
}

if (import.meta.filename === process.argv[1]) {
  try {
    await buildHandbookPdf()
  } catch (err) {
    console.error(`[handbuch-pdf] ${err.message}`)
    process.exit(1)
  }
}
