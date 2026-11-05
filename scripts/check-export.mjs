// Der Export als PDF, ePub und Offline-HTML (Zieltyp „Dokument“, services/export/) gegen ein echtes
// Projekt, über die gebaute App: Kopie des Projekts, Wegwerf-Profil, Bau, ein Buch über die ganze
// Website, ein Ziel „Dokument“ in einen Wegwerf-Ordner, `deploy.run` — derselbe Weg wie „Jetzt
// veröffentlichen“. Dann wird jede Datei mit einem eigenen Leser geprüft, nicht mit dem Code, der sie
// geschrieben hat:
//
// - PDF mit pdf-lib (und `pdfinfo`, wenn vorhanden): Seiten, Lesezeichen je Ebene, getaggt, Titel,
//   Sprache, interne Verweise
// - ePub: Aufbau aus den Bytes (`mimetype` zuerst und ungepackt, container.xml, OPF, Manifest, Spine,
//   Inhaltsverzeichnis, keine fremden Adressen) und epubcheck — lokal, wenn Java läuft
//   (`--epubcheck-jar`), oder per ssh auf einem Rechner, der es hat (`--epubcheck-ssh host:jar`)
// - HTML in Chrome als file:// geöffnet, jede Anfrage außerhalb der Datei gesperrt und gezählt,
//   Bilder ohne Inhalt gezählt
//
// Existiert, weil der Plan des Exports es vorsah und es bis zum 62. Review fehlte (REVIEW-2026-11-06,
// M3): die Gegenprobe war epubcheck auf der VM von Hand.
//
// Was nicht geprüft werden kann (kein Java, kein pdfinfo), wird gezählt und genannt; dann endet das
// Skript mit 3, nicht mit 0. 1 heißt: etwas ist falsch. 2: Aufruf oder Einrichtung.
//
//   npm run check:export -- <projektpfad> [--formats pdf,epub,html] [--keep]
//                           [--epubcheck-jar <pfad>] [--epubcheck-ssh <host>:<jar>]
//   npm run check:export -- --files <ordner> --book <id> [--formats …] [--epubcheck-…]
//
// Mit `--files` wird nicht exportiert, sondern geprüft, was im Ordner liegt (`<id>.pdf` usw.) —
// für Dateien aus einem echten Lauf und für die Gegenprobe mit absichtlich kaputten Dateien.
//
// Das Projekt selbst wird nur gelesen: Gebaut und exportiert wird in einer Kopie (unter macOS als
// APFS-Klon), die am Ende samt Profil wieder verschwindet — an jedem Ausgang, auch bei Strg-C.
import { _electron as electron, chromium } from 'playwright-core'
import { execFileSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PDFArray, PDFDict, PDFDocument, PDFName } from 'pdf-lib'

const APP_DIR = path.resolve(import.meta.dirname, '..')
const argv = process.argv.slice(2)
const opt = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined)
const projectArg = argv.find((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'))
const formats = (opt('--formats') ?? 'pdf,epub,html').split(',').map((f) => f.trim())
const keep = argv.includes('--keep')
const filesDir = opt('--files') ? path.resolve(opt('--files')) : null
const filesBook = opt('--book')
// The title the export gives its book; a file from elsewhere is checked against its own.
const expectedTitle = filesDir ? null : 'check:export'

function stop(text) {
  console.error(text)
  process.exit(2)
}
for (const f of formats) if (!['pdf', 'epub', 'html'].includes(f)) stop(`Unbekanntes Format: ${f}`)
if (filesDir) {
  if (!filesBook) stop('--files braucht --book <id>')
} else {
  if (!projectArg) stop('Aufruf: npm run check:export -- <projektpfad> [--formats pdf,epub,html] [--keep] [--epubcheck-jar <pfad>] [--epubcheck-ssh <host>:<jar>]')
  if (!fs.existsSync(path.join(path.resolve(projectArg), 'quartz.config.yaml'))) stop(`Kein Quartz-Projekt: ${path.resolve(projectArg)}`)
  if (!fs.existsSync(path.join(APP_DIR, 'out/main/index.js'))) stop('out/main/index.js fehlt — bitte zuerst `npm run build`')
}
const project = projectArg ? path.resolve(projectArg) : null

// ---- Leihgaben, die an jedem Ausgang zurückgehen -----------------------------------------------

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'quartzcontrol-check-export-'))
// Right after the folder exists, before anything that can throw: two crashed runs of an earlier
// draft left their folders behind. cleanUp is a function declaration, so it is already defined.
process.on('exit', cleanUp)
const copy = project ? path.join(work, path.basename(project)) : null
const profile = path.join(work, 'profile')
const outDir = filesDir ?? path.join(work, 'dokumente')
let app = null
let browser = null
function cleanUp() {
  try {
    app?.process()?.kill()
  } catch {}
  try {
    browser?.process?.()?.kill()
  } catch {}
  if (keep) console.log(`\nBehalten: ${work}`)
  else fs.rmSync(work, { recursive: true, force: true })
}
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => process.exit(130))

// ---- Ergebnisse --------------------------------------------------------------------------------

let failed = 0
const unchecked = []
const ok = (label, detail = '') => console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`)
const fail = (label, detail = '') => {
  failed++
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
}
const skip = (label, why) => {
  unchecked.push(`${label}: ${why}`)
  console.log(`  ? ${label} — nicht geprüft: ${why}`)
}

// ---- 1. Export über die gebaute App ------------------------------------------------------------

function electronBinPath() {
  const rel = fs.readFileSync(path.join(APP_DIR, 'node_modules/electron/path.txt'), 'utf-8')
  return path.join(APP_DIR, 'node_modules/electron/dist', rel)
}

let bookId = filesBook
if (!filesDir) {
  console.log(`Projekt: ${project}\nKopie:   ${copy}\n`)
  if (process.platform === 'darwin') execFileSync('cp', ['-c', '-R', project, copy])
  else execFileSync('cp', ['-a', project, copy])
  fs.mkdirSync(profile)

  console.log('Export')
  app = await electron.launch({ executablePath: electronBinPath(), args: [APP_DIR, `--user-data-dir=${profile}`], timeout: 30_000 })
  const page = await app.firstWindow()
  await page.waitForFunction(() => Boolean(window.quartzGui), null, { timeout: 30_000 })

  const started = Date.now()
  const run = await page.evaluate(
    async ({ copy, outDir, formats }) => {
      const api = window.quartzGui
      const project = await api.projects.add(copy)
      const build = await api.build.run(project.id, project.path)
      if (!build.success) return { error: `Bau gescheitert (Exit ${build.exitCode})` }
      const site = await api.books.sitePages({ projectPath: project.path, root: '', language: '' })
      const language = site.defaultLanguage
      const book = await api.books.save({
        projectPath: project.path,
        book: {
          title: 'check:export',
          subtitle: '',
          author: 'QuartzControl',
          language,
          root: '',
          order: null,
          excluded: [],
          coverImage: '',
          toc: true,
          tagIndex: true,
          backlinks: true,
          outsideLinks: 'site',
          pdf: { pageSize: 'A4', landscape: false }
        }
      })
      const target = await api.publishTargets.save(project.path, {
        name: 'check:export',
        destination: { type: 'document', path: outDir, bookId: book.id, formats }
      })
      const result = await api.deploy.run(project.path, target.id, undefined, [])
      return { bookId: book.id, language, source: site.source, pages: site.pages?.length ?? null, result }
    },
    { copy, outDir, formats }
  )
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  await app.close()
  app = null

  if (run.error) {
    fail('Export', run.error)
    process.exit(1)
  }
  if (!run.result?.success) {
    fail('Export', String(run.result?.output ?? 'ohne Ausgabe').slice(0, 2000))
    process.exit(1)
  }
  ok('Export', `Buch ${run.bookId} (${run.language || 'Sprache der Website'}, Reihenfolge aus ${run.source}), Bau und Export in ${seconds} s`)
  bookId = run.bookId
}
const file = (ext) => path.join(outDir, `${bookId}.${ext}`)

// ---- 2. PDF ------------------------------------------------------------------------------------

if (formats.includes('pdf')) {
  console.log('\nPDF')
  const bytes = fs.readFileSync(file('pdf'))
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  const pages = doc.getPageCount()
  pages > 0 ? ok('Seiten', String(pages)) : fail('Seiten', '0')

  const levels = []
  const walk = (first, depth) => {
    for (let node = first; node; node = node.lookupMaybe(PDFName.of('Next'), PDFDict)) {
      levels[depth] = (levels[depth] ?? 0) + 1
      walk(node.lookupMaybe(PDFName.of('First'), PDFDict), depth + 1)
    }
  }
  walk(doc.catalog.lookupMaybe(PDFName.of('Outlines'), PDFDict)?.lookupMaybe(PDFName.of('First'), PDFDict), 0)
  levels.length ? ok('Lesezeichen je Ebene', levels.join(' / ')) : fail('Lesezeichen', 'keine')

  const tagged = Boolean(doc.catalog.get(PDFName.of('StructTreeRoot'))) && Boolean(doc.catalog.get(PDFName.of('MarkInfo')))
  tagged ? ok('Getaggt') : fail('Getaggt', 'kein StructTreeRoot/MarkInfo')

  const title = doc.getTitle()
  title && (expectedTitle === null || title === expectedTitle) ? ok('Titel', title) : fail('Titel', JSON.stringify(title))
  const lang = doc.catalog.get(PDFName.of('Lang'))?.decodeText?.() ?? doc.catalog.get(PDFName.of('Lang'))?.toString()
  lang ? ok('Sprache', lang) : fail('Sprache', 'kein /Lang')

  let internal = 0
  for (const p of doc.getPages()) {
    const annots = p.node.lookupMaybe(PDFName.of('Annots'), PDFArray)
    for (let i = 0; i < (annots?.size() ?? 0); i++) {
      const a = annots.lookup(i, PDFDict)
      if (a.get(PDFName.of('Subtype'))?.toString() !== '/Link') continue
      const action = a.lookupMaybe(PDFName.of('A'), PDFDict)
      if (a.get(PDFName.of('Dest')) || action?.get(PDFName.of('S'))?.toString() === '/GoTo') internal++
    }
  }
  internal > 0 ? ok('Interne Verweise', String(internal)) : fail('Interne Verweise', '0 — das Inhaltsverzeichnis verweist nirgends hin')

  const info = spawnSync('pdfinfo', [file('pdf')], { encoding: 'utf-8' })
  if (info.error) skip('pdfinfo', 'nicht installiert')
  else {
    const said = Object.fromEntries(info.stdout.split('\n').map((l) => l.split(/:\s+/, 2)).filter((p) => p.length === 2))
    Number(said.Pages) === pages && said.Tagged === 'yes'
      ? ok('pdfinfo stimmt zu', `${said.Pages} Seiten, Tagged ${said.Tagged}`)
      : fail('pdfinfo widerspricht', `${said.Pages} Seiten, Tagged ${said.Tagged}`)
  }
}

// ---- 3. ePub -----------------------------------------------------------------------------------

function unzip(args) {
  return execFileSync('unzip', args, { maxBuffer: 256 * 1024 * 1024 })
}

if (formats.includes('epub')) {
  console.log('\nePub')
  const epub = file('epub')
  const bytes = fs.readFileSync(epub)
  // OCF: the first entry is `mimetype`, stored (method 0), no extra field, content exactly this.
  const nameLen = bytes.readUInt16LE(26)
  const extraLen = bytes.readUInt16LE(28)
  const firstName = bytes.subarray(30, 30 + nameLen).toString()
  const firstBody = bytes.subarray(30 + nameLen + extraLen, 30 + nameLen + extraLen + 20).toString()
  bytes.readUInt32LE(0) === 0x04034b50 && firstName === 'mimetype' && bytes.readUInt16LE(8) === 0 && extraLen === 0 && firstBody === 'application/epub+zip'
    ? ok('mimetype zuerst, ungepackt')
    : fail('mimetype', `erster Eintrag „${firstName}“, Methode ${bytes.readUInt16LE(8)}, Extra ${extraLen}`)

  const names = unzip(['-Z1', epub]).toString().split('\n').filter(Boolean)
  const read = (name) => unzip(['-p', epub, name]).toString('utf-8')
  const container = names.includes('META-INF/container.xml') ? read('META-INF/container.xml') : ''
  const opfPath = /full-path="([^"]+)"/.exec(container)?.[1]
  if (!opfPath || !names.includes(opfPath)) fail('container.xml', opfPath ? `${opfPath} fehlt` : 'kein rootfile')
  else {
    const opf = read(opfPath)
    const base = path.posix.dirname(opfPath)
    const items = [...opf.matchAll(/<item\b[^>]*>/g)].map((m) => ({
      id: /\bid="([^"]+)"/.exec(m[0])?.[1],
      href: decodeURIComponent(/\bhref="([^"]+)"/.exec(m[0])?.[1] ?? ''),
      props: /\bproperties="([^"]+)"/.exec(m[0])?.[1] ?? ''
    }))
    const resolveHref = (href) => (base === '.' ? href : path.posix.join(base, href))
    const missing = items.filter((i) => !names.includes(resolveHref(i.href)))
    missing.length ? fail('Manifest', `${missing.length} Einträge ohne Datei: ${missing.slice(0, 5).map((i) => i.href).join(', ')}`) : ok('Manifest', `${items.length} Einträge, alle vorhanden`)
    const ids = new Set(items.map((i) => i.id))
    const spine = [...opf.matchAll(/<itemref\b[^>]*idref="([^"]+)"/g)].map((m) => m[1])
    const lost = spine.filter((id) => !ids.has(id))
    spine.length && !lost.length ? ok('Spine', `${spine.length} Kapitel`) : fail('Spine', lost.length ? `${lost.length} unbekannte idref` : 'leer')
    items.some((i) => i.props.split(/\s+/).includes('nav')) ? ok('Inhaltsverzeichnis (nav)') : fail('Inhaltsverzeichnis', 'kein Eintrag mit properties="nav"')

    // Remote resources are not allowed in an ePub (RSC-006); a link (<a href>) to the web is.
    let remote = 0
    const where = []
    // Only what is there: a missing file is the manifest's finding above, not a crash here
    // (found by the counter-check, which removed style.css).
    for (const item of items.filter((i) => /\.(x?html|css|svg)$/.test(i.href) && names.includes(resolveHref(i.href)))) {
      const text = read(resolveHref(item.href)).replace(/<a\b[^>]*>/g, '')
      const hits = text.match(/(?:src|href|xlink:href)\s*=\s*"https?:\/\/[^"]*"|url\(\s*['"]?https?:\/\//g) ?? []
      if (hits.length) {
        remote += hits.length
        where.push(item.href)
      }
    }
    remote ? fail('Fremde Ressourcen', `${remote} in ${where.slice(0, 5).join(', ')}`) : ok('Keine fremden Ressourcen')
  }

  const jar = opt('--epubcheck-jar')
  const ssh = opt('--epubcheck-ssh')
  const javaWorks = () => /version/.test(spawnSync('java', ['-version'], { encoding: 'utf-8' }).stderr ?? '')
  let report = null
  if (ssh) {
    const [host, remoteJar] = [ssh.slice(0, ssh.indexOf(':')), ssh.slice(ssh.indexOf(':') + 1)]
    const remote = `/tmp/check-export-${process.pid}.epub`
    try {
      execFileSync('scp', ['-q', epub, `${host}:${remote}`])
      const res = spawnSync('ssh', [host, 'java', '-jar', remoteJar, '--json', '-', remote], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 })
      spawnSync('ssh', [host, 'rm', '-f', remote])
      report = { json: res.stdout, where: `${host}` }
    } catch (err) {
      fail('epubcheck', `über ssh gescheitert: ${err.message.split('\n')[0]}`)
    }
  } else if (jar) {
    if (!javaWorks()) skip('epubcheck', 'kein lauffähiges Java')
    else {
      const res = spawnSync('java', ['-jar', jar, '--json', '-', epub], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 })
      report = { json: res.stdout, where: 'lokal' }
    }
  } else skip('epubcheck', 'weder --epubcheck-jar noch --epubcheck-ssh angegeben')
  if (report) {
    try {
      const parsed = JSON.parse(report.json)
      const counts = { FATAL: 0, ERROR: 0, WARNING: 0 }
      for (const m of parsed.messages ?? []) if (m.severity in counts) counts[m.severity]++
      const version = parsed.checker?.checkerVersion ?? '?'
      if (counts.FATAL + counts.ERROR + counts.WARNING === 0) ok(`epubcheck ${version} (${report.where})`, '0 Fehler, 0 Warnungen')
      else {
        fail(`epubcheck ${version} (${report.where})`, `${counts.FATAL} schwer, ${counts.ERROR} Fehler, ${counts.WARNING} Warnungen`)
        for (const m of (parsed.messages ?? []).slice(0, 10)) console.log(`      ${m.ID} ${m.message} (${m.locations?.[0]?.path ?? ''})`)
      }
    } catch {
      fail('epubcheck', `Antwort nicht lesbar: ${String(report.json).slice(0, 300)}`)
    }
  }
}

// ---- 4. Offline-HTML ---------------------------------------------------------------------------

if (formats.includes('html')) {
  console.log('\nOffline-HTML')
  try {
    browser = await chromium.launch({ channel: 'chrome' })
  } catch (err) {
    skip('Offline-HTML', `Chrome nicht startbar (${err.message.split('\n')[0]})`)
  }
  if (browser) {
    const ctx = await browser.newContext({ colorScheme: 'light' })
    const htmlPage = await ctx.newPage()
    const blocked = []
    const missing = []
    await htmlPage.route('**/*', (route) => {
      const url = route.request().url()
      if (url.startsWith('file:') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue()
      blocked.push(url)
      return route.abort()
    })
    htmlPage.on('requestfailed', (req) => {
      if (req.url().startsWith('file:')) missing.push(req.url())
    })
    await htmlPage.goto(`file://${file('html')}`, { waitUntil: 'load' })
    await htmlPage.waitForTimeout(1000)
    const dom = await htmlPage.evaluate(() => ({
      images: document.images.length,
      broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.slice(0, 80)),
      scripts: document.scripts.length,
      text: document.body.innerText.length
    }))
    dom.text > 100 ? ok('Inhalt', `${dom.text} Zeichen, ${dom.images} Bilder, ${dom.scripts} Skripte`) : fail('Inhalt', `nur ${dom.text} Zeichen`)
    blocked.length ? fail('Anfragen ins Netz', `${blocked.length}: ${[...new Set(blocked)].slice(0, 5).join(', ')}`) : ok('Keine Anfragen ins Netz')
    missing.length ? fail('Fehlende lokale Dateien', missing.slice(0, 5).join(', ')) : ok('Keine fehlenden lokalen Dateien')
    dom.broken.length ? fail('Bilder ohne Inhalt', `${dom.broken.length}: ${dom.broken.slice(0, 3).join(', ')}`) : ok('Alle Bilder mit Inhalt')
    await browser.close()
    browser = null
  }
}

// ---- Ergebnis ----------------------------------------------------------------------------------

console.log('')
if (failed) {
  console.log(`✗ ${failed} Befund${failed === 1 ? '' : 'e'}.${unchecked.length ? ` Nicht geprüft: ${unchecked.length}.` : ''}`)
  process.exit(1)
}
if (unchecked.length) {
  console.log(`Nichts Falsches gefunden, aber ${unchecked.length} Punkt${unchecked.length === 1 ? '' : 'e'} nicht geprüft:`)
  for (const u of unchecked) console.log(`  ? ${u}`)
  process.exit(3)
}
console.log('✓ Der Export trägt.')
process.exit(0)
