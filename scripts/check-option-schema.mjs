// Wie viele Optionen eines Plugins die App darstellen kann — je Plugin eines echten Projekts.
//
//   npm run check:option-schema -- <projektpfad> [--plugin <name>]
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
// Und eingeteilt danach, wie die App sie heute zeigt:
//
//   Feld          ein Bedienelement (Schalter, Auswahl, Zahl, Text)
//   Text          nur als freies Textfeld mit JSON darin (ohne Schema, Wert ist Objekt/Liste)
//   unsichtbar    gar nicht — das ist „ohne Darstellung“ und die Zahl, die für die drei eigenen
//                 Plugins nach P2 null sein muss
//
// Die Darstellung wird nicht nachgebaut, sondern geladen: `pluginSchemaService.ts` aus dem
// Hauptprozess, als .mts kopiert (Regel „ein Prüfskript lädt, statt abzuschreiben“). Wie die Seite
// daraus Felder macht, steht in `src/routes/Plugins/Installed.tsx` (`PluginOptionsEditor`): mit
// Schema nur die Felder außer `unsupported`, ohne Schema jeder vorhandene Schlüssel nach seinem Wert.
// Diese zwei Zeilen sind die einzige Nachbildung hier, und sie fallen mit P3 weg.
//
// Wo die package.json liegt, entscheidet Quartz' `readManifestFromPackageJson`
// (plugins/loader/config-loader.ts): npm-Quellen unter node_modules, alles andere unter
// `.quartz/plugins/<name>`. Was das Skript nicht lesen kann, zählt es und sagt es.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parse as parseYaml } from 'yaml'

const APP_DIR = path.dirname(import.meta.dirname)

// Ins Systemtemp, weil node unter node_modules keine Typen entfernt. Der Dienst importiert
// `typescript`, und von dort aus fände node es nicht; der eine Import wird deshalb auf die Datei im
// Repo umgeschrieben.
const TS_ENTRY = `file://${path.join(APP_DIR, 'node_modules/typescript/lib/typescript.js')}`

async function loadTs(rel, tmpName, source = fs.readFileSync(path.join(APP_DIR, rel), 'utf-8')) {
  const tmp = path.join(os.tmpdir(), `check-option-schema-${tmpName}-${process.pid}.mts`)
  fs.writeFileSync(tmp, source.replace(/from 'typescript'/g, `from '${TS_ENTRY}'`))
  try {
    return await import(`file://${tmp}`)
  } finally {
    fs.unlinkSync(tmp)
  }
}

const { getPluginOptionsSchema } = await loadTs('electron/main/services/pluginSchemaService.ts', 'pluginSchemaService')
const { quartzPluginName } = await loadTs('shared/quartzPluginName.ts', 'quartzPluginName')
// deriveName steht in configService.ts, das den halben Hauptprozess importiert; die Funktion selbst
// ist vier Zeilen ohne Abhängigkeit. Herausgeschnitten statt abgeschrieben, damit sie nicht driftet.
const deriveName = await (async () => {
  const src = fs.readFileSync(path.join(APP_DIR, 'electron/main/services/configService.ts'), 'utf-8')
  const m = src.match(/export function deriveName\(source: PluginSource\): string \{[\s\S]*?\n\}/)
  if (!m) throw new Error('deriveName nicht in configService.ts gefunden — das Skript muss nachgezogen werden')
  return (await loadTs(null, 'deriveName', `type PluginSource = string | { repo: string; name?: string }\n${m[0]}\n`)).deriveName
})()

const args = process.argv.slice(2)
const only = args.includes('--plugin') ? args[args.indexOf('--plugin') + 1] : null
const projekt = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--plugin')
if (!projekt) {
  console.error('Aufruf: npm run check:option-schema -- <projektpfad> [--plugin <name>]')
  process.exit(2)
}
const configFile = path.join(projekt, 'quartz.config.yaml')
if (!fs.existsSync(configFile)) {
  console.error(`Keine quartz.config.yaml unter ${projekt}`)
  process.exit(2)
}
const config = parseYaml(fs.readFileSync(configFile, 'utf-8')) ?? {}
const entries = Array.isArray(config.plugins) ? config.plugins : []

// Quartz' Unterscheidung in parsePluginSource: was weder lokal noch github:/git+/https:// ist, ist npm.
function isNpm(source) {
  const repo = typeof source === 'object' && source !== null ? source.repo : source
  if (typeof repo !== 'string') return false
  if (/^[A-Za-z]:[\\/]/.test(repo) || repo.startsWith('./') || repo.startsWith('../') || repo.startsWith('/')) return false
  return !(repo.startsWith('github:') || repo.startsWith('git+') || repo.startsWith('https://'))
}

function readManifest(source) {
  const name = quartzPluginName(source)
  const pkgPath = isNpm(source)
    ? path.join(projekt, 'node_modules', name, 'package.json')
    : path.join(projekt, '.quartz', 'plugins', name, 'package.json')
  if (!fs.existsSync(pkgPath)) return { where: 'keine package.json', quartz: null }
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    return { where: path.relative(projekt, path.dirname(pkgPath)), quartz: pkg.quartz ?? null }
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
  const dts = getPluginOptionsSchema(projekt, base)

  const sources = {
    config: keysOf(options),
    vorgaben: keysOf(q.defaultOptions),
    optionSchema: keysOf(q.optionSchema),
    configSchema: keysOf(q.configSchema?.properties),
    'd.ts': dts ? dts.map((f) => f.name) : []
  }
  const all = [...new Set(Object.values(sources).flat())]

  // Die zwei Zeilen aus Installed.tsx (PluginOptionsEditor), sonst nichts.
  const shownAs = (key) => {
    if (dts) return dts.some((f) => f.name === key && f.kind !== 'unsupported') ? 'Feld' : 'unsichtbar'
    if (!(key in options)) return 'unsichtbar'
    const v = options[key]
    return typeof v === 'object' && v !== null ? 'Text' : 'Feld'
  }
  const by = { Feld: [], Text: [], unsichtbar: [] }
  for (const key of all) by[shownAs(key)].push(key)

  // Typen, von denen keine einzige Option eine andere Quelle kennt: der Fingerabdruck eines falsch
  // gewählten Interfaces (multilanguage las `SeoOptions` — `hreflang`, `ogLocale`, `xDefault` —,
  // während die Config 15 ganz andere Schlüssel trägt). Eine *teilweise* Überschneidung ist
  // gewöhnlich: Eine optionale Option ohne Vorgabe (`title` der Layout-Box) steht nur in den Typen.
  const known = new Set([...sources.config, ...sources.vorgaben, ...sources.optionSchema, ...sources.configSchema])
  const wrongInterface = known.size > 0 && sources['d.ts'].length > 0 && !sources['d.ts'].some((k) => known.has(k))
  const strangers = wrongInterface ? sources['d.ts'] : []

  rows.push({ name, enabled: entry.enabled !== false, where: manifest.where, sources, all, by, strangers })
}

const pad = (s, n) => String(s).padEnd(n)
const num = (n) => String(n).padStart(5)
console.log(`${configFile}\n`)
console.log(
  `${pad('Plugin', 32)}${['config', 'vorg.', 'optS.', 'confS.', 'd.ts', 'alle', 'Feld', 'Text', 'unsi.'].map((h) => h.padStart(7)).join('')}`
)
for (const r of rows) {
  const s = r.sources
  console.log(
    `${pad(r.name + (r.enabled ? '' : ' (aus)'), 32)}` +
      [s.config.length, s.vorgaben.length, s.optionSchema.length, s.configSchema.length, s['d.ts'].length, r.all.length, r.by.Feld.length, r.by.Text.length, r.by.unsichtbar.length]
        .map((n) => `  ${num(n)}`)
        .join('')
  )
}

const sum = (f) => rows.reduce((a, r) => a + f(r), 0)
console.log(
  `\n${rows.length} Plugins, ${sum((r) => r.all.length)} Optionen: ${sum((r) => r.by.Feld.length)} als Feld, ` +
    `${sum((r) => r.by.Text.length)} nur als Text, ${sum((r) => r.by.unsichtbar.length)} unsichtbar.`
)
const withConfigSchema = rows.filter((r) => r.sources.configSchema.length > 0).length
const withOptionSchema = rows.filter((r) => r.sources.optionSchema.length > 0).length
const withDts = rows.filter((r) => r.sources['d.ts'].length > 0).length
console.log(`Schema-Quellen: configSchema ${withConfigSchema}, optionSchema ${withOptionSchema}, d.ts ${withDts} (die App liest heute nur d.ts).`)
if (unreadable) console.log(`${unreadable} Einträge nicht lesbar (Eintrag ohne source oder package.json kaputt) — nicht gezählt.`)

console.log('\nUnsichtbar je Plugin:')
let any = false
for (const r of rows) {
  if (r.by.unsichtbar.length === 0 && r.strangers.length === 0) continue
  any = true
  console.log(`  ${r.name} [${r.where}]`)
  if (r.by.unsichtbar.length) {
    const inConfig = r.by.unsichtbar.filter((k) => r.sources.config.includes(k))
    console.log(`    unsichtbar: ${r.by.unsichtbar.join(', ')}`)
    if (inConfig.length) console.log(`    davon in der Config gesetzt: ${inConfig.join(', ')}`)
  }
  if (r.strangers.length) console.log(`    d.ts teilt keine Option mit den anderen Quellen (falsches Interface?): ${r.strangers.join(', ')}`)
}
if (!any) console.log('  keine')
