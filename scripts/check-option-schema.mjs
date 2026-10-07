// Wie viele Optionen eines Plugins die App darstellen kann — je Plugin eines echten Projekts.
//
//   npm run check:option-schema -- <projektpfad> [--plugin <name>] [--dump]
//
// `--dump` gibt zusätzlich das normalisierte Schema jedes gezählten Plugins als JSON aus — mit
// `--plugin` der Weg, eine einzelne Struktur nachzusehen (wohin schreibt `seo.hreflang`?).
//
// Existiert, weil ein fehlendes Feld auf keinem Bildschirm als Fehler erscheint: Die Plugins-Seite
// zeigt, was sie kennt, und schweigt über den Rest. Bei quartz-navigations fielen so alle
// Auswahlfelder weg, quartz-multilanguage bekam die Felder eines *anderen* Interfaces
// (`SeoOptions`), und ein Schlüssel, der in der Config steht, aber keinem Feld entspricht
// (`byLang`, `breakpoints`), war gar nicht zu sehen. Das ist der Vorher-Stand für 1.1
// (docs/plan-1.1-umsetzung.md, P0) und danach der Wächter für P1–P3.
//
// Gezählt wird gegen die Vereinigung aller Quellen, die etwas über die Optionen wissen:
//
//   config        die Schlüssel unter `options:` in quartz.config.yaml
//   vorgaben      `quartz.defaultOptions` aus der package.json des Plugins — was Quartz einsetzt
//   optionSchema  `quartz.optionSchema` (flach, die Form der @quartz-community-Plugins)
//   configSchema  `quartz.configSchema` (JSON Schema, die Form, die Quartz' Typen vorsehen)
//   d.ts          was die App heute aus den Typdeklarationen liest
//
// Und eingeteilt danach, was der Leser der App daraus macht (`getPluginOptionSchema` im
// Hauptprozess, `shared/pluginOptionSchema.ts`):
//
//   Feld          ein Bedienelement (Schalter, Auswahl, Zahl, Text, Liste, Abschnitt)
//   Text          nur als freies Textfeld mit JSON darin — der Leser hat die Form nicht verstanden
//   unsichtbar    gar nicht im Schema — das ist „ohne Darstellung“ und die Zahl, die für die drei
//                 eigenen Plugins nach P2 null sein muss
//
// Gezählt werden die Schlüssel der obersten Ebene. Bis zum 2026-10-07 zählte das Skript, was die
// *alte* Plugins-Seite zeigte (Vorher-Stand an gui-test: 280 Optionen, 131 Feld, 6 Text,
// 143 unsichtbar); seit P1 zählt es den Leser, den die neue Seite benutzt.
//
// Der Dienst wird nicht nachgebaut, sondern geladen: esbuild bündelt ihn samt `@shared` nach
// node_modules/.cache, von wo aus er `typescript` findet (Regel „ein Prüfskript lädt, statt
// abzuschreiben“). Die Notizen des Lesers — was er nicht lesen konnte — zählt das Skript mit.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import esbuild from 'esbuild'
import { parse as parseYaml } from 'yaml'

const APP_DIR = path.dirname(import.meta.dirname)

const CACHE = path.join(APP_DIR, 'node_modules/.cache/check-option-schema')
fs.mkdirSync(CACHE, { recursive: true })
const bundle = path.join(CACHE, `service-${process.pid}.mjs`)
await esbuild.build({
  entryPoints: [path.join(APP_DIR, 'electron/main/services/pluginSchemaService.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: bundle,
  alias: { '@shared': path.join(APP_DIR, 'shared') },
  external: ['typescript'],
  logLevel: 'error',
  // Was der Hauptprozess über settingsService mitbringt, ist teils CommonJS und `require`t Node-
  // Module; in einem ESM-Bündel gibt es `require` nur so.
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  // Der Dienst sagt seine Fehlersätze über mainT (electron/main/i18n.ts), und das liest die
  // Sprache aus Electrons `app`. Hier läuft kein Electron; der Stub muss nur das Laden überstehen,
  // ein Satz käme in der Vorgabesprache.
  plugins: [
    {
      name: 'electron-stub',
      setup(build) {
        build.onResolve({ filter: /^electron$/ }, () => ({ path: 'electron', namespace: 'stub' }))
        build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
          contents: `export const app = { getLocale: () => 'de', getPreferredSystemLanguages: () => ['de'], getPath: () => ${JSON.stringify(os.tmpdir())}, isReady: () => false, on() {} }; export const safeStorage = {}; export default { app }`,
          loader: 'js'
        }))
      }
    }
  ]
})
const service = await import(`file://${bundle}`)
fs.unlinkSync(bundle)
const { getPluginOptionSchema, pluginPackageDir } = service
const { withPresentKeys } = await (async () => {
  const shared = path.join(CACHE, `shared-${process.pid}.mjs`)
  await esbuild.build({ entryPoints: [path.join(APP_DIR, 'shared/pluginOptionSchema.ts')], bundle: true, platform: 'neutral', format: 'esm', outfile: shared, logLevel: 'error' })
  try {
    return await import(`file://${shared}`)
  } finally {
    fs.unlinkSync(shared)
  }
})()

// deriveName steht in configService.ts, das den halben Hauptprozess importiert; die Funktion selbst
// ist vier Zeilen ohne Abhängigkeit. Herausgeschnitten statt abgeschrieben, damit sie nicht driftet.
const deriveName = await (async () => {
  const src = fs.readFileSync(path.join(APP_DIR, 'electron/main/services/configService.ts'), 'utf-8')
  const m = src.match(/export function deriveName\(source: PluginSource\): string \{[\s\S]*?\n\}/)
  if (!m) throw new Error('deriveName nicht in configService.ts gefunden — das Skript muss nachgezogen werden')
  const tmp = path.join(os.tmpdir(), `check-option-schema-deriveName-${process.pid}.mts`)
  fs.writeFileSync(tmp, `type PluginSource = string | { repo: string; name?: string }\n${m[0]}\n`)
  try {
    return (await import(`file://${tmp}`)).deriveName
  } finally {
    fs.unlinkSync(tmp)
  }
})()

const args = process.argv.slice(2)
const only = args.includes('--plugin') ? args[args.indexOf('--plugin') + 1] : null
const dump = args.includes('--dump')
const projekt = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--plugin')
if (!projekt) {
  console.error('Aufruf: npm run check:option-schema -- <projektpfad> [--plugin <name>] [--dump]')
  process.exit(2)
}
const configFile = path.join(projekt, 'quartz.config.yaml')
if (!fs.existsSync(configFile)) {
  console.error(`Keine quartz.config.yaml unter ${projekt}`)
  process.exit(2)
}
const config = parseYaml(fs.readFileSync(configFile, 'utf-8')) ?? {}
const entries = Array.isArray(config.plugins) ? config.plugins : []

function readManifest(source) {
  const dir = pluginPackageDir(projekt, source)
  const pkgPath = dir && path.join(dir, 'package.json')
  if (!pkgPath || !fs.existsSync(pkgPath)) return { where: 'keine package.json', quartz: null }
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    return { where: path.relative(projekt, dir), quartz: pkg.quartz ?? null }
  } catch (e) {
    return { where: `unlesbar: ${e.message}`, quartz: null }
  }
}

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)
const keysOf = (v) => (isObject(v) ? Object.keys(v) : [])

const rows = []
const seen = new Map()
let unreadable = 0
for (const entry of entries) {
  if (!isObject(entry) || entry.source === undefined) {
    unreadable += 1
    continue
  }
  const base = deriveName(entry.source)
  seen.set(base, (seen.get(base) ?? 0) + 1)
  if (only && base !== only) continue
  // Mehrere Instanzen desselben Plugins heißen wie auf der Plugins-Seite (`stickyKey()` in
  // Installed.tsx): ab der zweiten mit `#n`.
  const name = seen.get(base) > 1 ? `${base}#${seen.get(base)}` : base
  const manifest = readManifest(entry.source)
  if (manifest.where.startsWith('unlesbar')) unreadable += 1
  const q = manifest.quartz ?? {}
  const options = isObject(entry.options) ? entry.options : {}
  const result = getPluginOptionSchema(projekt, entry.source)
  if (result.unreadable) unreadable += 1
  // Wie die Seite: die Werte dieses Eintrags dazu, damit ein Schlüssel, den kein Schema nennt,
  // trotzdem dasteht.
  const fields = withPresentKeys(result.schema ?? { source: 'defaults', fields: [], notes: [] }, options).fields
  if (dump) console.log(`--- ${name}\n${JSON.stringify({ ...result, schema: result.schema && { ...result.schema, fields } }, null, 1)}`)

  const sources = {
    config: keysOf(options),
    vorgaben: keysOf(q.defaultOptions),
    optionSchema: keysOf(q.optionSchema),
    configSchema: keysOf(q.configSchema?.properties),
    // Was der Leser aus seiner gewählten Quelle hat — ohne die Felder, die erst die Vorgaben
    // ergänzt haben, sonst sähe man nicht, ob die Quelle selbst trägt.
    schema: fields.filter((f) => f.origin === 'schema').map((f) => f.key)
  }
  const all = [...new Set(Object.values(sources).flat())]

  const shownAs = (key) => {
    const field = fields.find((f) => f.key === key)
    if (!field) return 'unsichtbar'
    return field.node.kind === 'json' ? 'Text' : 'Feld'
  }
  const by = { Feld: [], Text: [], unsichtbar: [] }
  for (const key of all) by[shownAs(key)].push(key)

  // Eine Quelle, von der keine einzige Option Config oder Vorgaben kennt: der Fingerabdruck eines
  // falsch gewählten Interfaces (multilanguage las `SeoOptions` — `hreflang`, `ogLocale`,
  // `xDefault` —, während die Config 15 ganz andere Schlüssel trägt). Eine *teilweise*
  // Überschneidung ist gewöhnlich: eine optionale Option ohne Vorgabe (`title` der Layout-Box).
  const known = new Set([...sources.config, ...sources.vorgaben])
  const wrongInterface = known.size > 0 && sources.schema.length > 0 && !sources.schema.some((k) => known.has(k))
  const strangers = wrongInterface ? sources.schema : []

  rows.push({
    name,
    enabled: entry.enabled !== false,
    where: manifest.where,
    source: result.schema?.source ?? (result.unreadable ? 'unlesbar' : '–'),
    notes: result.schema?.notes ?? [],
    sources,
    all,
    by,
    strangers
  })
}

const pad = (s, n) => String(s).padEnd(n)
const num = (n) => String(n).padStart(5)
console.log(`${configFile}\n`)
console.log(
  `${pad('Plugin', 32)}${pad('Quelle', 13)}${['config', 'vorg.', 'optS.', 'confS.', 'Schema', 'alle', 'Feld', 'Text', 'unsi.'].map((h) => h.padStart(7)).join('')}`
)
for (const r of rows) {
  const s = r.sources
  console.log(
    `${pad(r.name + (r.enabled ? '' : ' (aus)'), 32)}${pad(r.source, 13)}` +
      [s.config.length, s.vorgaben.length, s.optionSchema.length, s.configSchema.length, s.schema.length, r.all.length, r.by.Feld.length, r.by.Text.length, r.by.unsichtbar.length]
        .map((n) => `  ${num(n)}`)
        .join('')
  )
}

const sum = (f) => rows.reduce((a, r) => a + f(r), 0)
console.log(
  `\n${rows.length} Plugins, ${sum((r) => r.all.length)} Optionen: ${sum((r) => r.by.Feld.length)} als Feld, ` +
    `${sum((r) => r.by.Text.length)} nur als Text, ${sum((r) => r.by.unsichtbar.length)} unsichtbar.`
)
const bySource = new Map()
for (const r of rows) bySource.set(r.source, (bySource.get(r.source) ?? 0) + 1)
console.log(`Gelesen aus: ${[...bySource].map(([k, n]) => `${k} ${n}`).join(', ')}.`)
const noteCount = sum((r) => r.notes.length)
if (noteCount) console.log(`${noteCount} Stellen konnte der Leser nicht lesen (als Text angeboten) — Liste unten.`)
if (unreadable) console.log(`${unreadable} Einträge nicht lesbar (Eintrag ohne source oder package.json kaputt) — nicht gezählt.`)

console.log('\nUnsichtbar oder nicht lesbar, je Plugin:')
let any = false
for (const r of rows) {
  if (r.by.unsichtbar.length === 0 && r.strangers.length === 0 && r.notes.length === 0) continue
  any = true
  console.log(`  ${r.name} [${r.where}]`)
  if (r.by.unsichtbar.length) {
    const inConfig = r.by.unsichtbar.filter((k) => r.sources.config.includes(k))
    console.log(`    unsichtbar: ${r.by.unsichtbar.join(', ')}`)
    if (inConfig.length) console.log(`    davon in der Config gesetzt: ${inConfig.join(', ')}`)
  }
  if (r.strangers.length) console.log(`    Schema teilt keine Option mit Config und Vorgaben (falsches Interface?): ${r.strangers.join(', ')}`)
  for (const n of r.notes) console.log(`    nicht lesbar: ${n.path.join('.') || '(Wurzel)'} — ${n.reason}`)
}
if (!any) console.log('  keine')
