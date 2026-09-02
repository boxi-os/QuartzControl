// Every t('…') and mainT('…') key with a literal argument, checked against the language files.
//
// Written after the alpha test found `publish.pages.saveSettings` rendering as its own key in the
// GitHub Pages panel: i18next falls back to the key when it is missing, so a gap shows up as a
// dotted string in the UI rather than as an error, and only on the screen state that uses it (that
// button appears only once Pages already reads the branch). The keys were in perfect de/en parity
// - both files were missing it - which is why the parity rule alone did not catch it.
//
// Deliberately literal-only: a key built from a variable (`t(\`plugins.${kind}.title\`)`) cannot be
// resolved statically, and guessing at the possible values would report failures that are not real.
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// The locale files are `export default { … } as const` - plain object literals, so stripping the
// two TypeScript-only bits leaves an expression Node can evaluate without a compiler in the loop.
function loadLocale(file) {
  const source = readFileSync(file, 'utf-8')
    .replace(/^export default/, '')
    .replace(/as const\s*$/, '')
  return eval(`(${source})`)
}

function flatten(object, prefix = '', out = new Set()) {
  for (const [key, value] of Object.entries(object)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') flatten(value, path, out)
    else out.add(path)
  }
  return out
}

// i18next resolves `t('key', { count })` to key_one/key_other, so the bare key legitimately does
// not exist for a pluralised string.
const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other']
const has = (keys, key) => keys.has(key) || PLURAL_SUFFIXES.some((suffix) => keys.has(key + suffix))

function walk(dir, extension, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, extension, files)
    else if (extension.test(path)) files.push(path)
  }
  return files
}

function collect(dir, extension, pattern) {
  const used = new Map()
  for (const file of walk(dir, extension)) {
    for (const match of readFileSync(file, 'utf-8').matchAll(pattern)) {
      if (!used.has(match[1])) used.set(match[1], file)
    }
  }
  return used
}

const de = flatten(loadLocale('src/i18n/locales/de.ts'))
const en = flatten(loadLocale('src/i18n/locales/en.ts'))
const rendererKeys = collect('src', /\.tsx?$/, /\bt\(\s*'([A-Za-z0-9_.]+)'/g)

// The main process has one file with both languages side by side; its keys are flat.
const mainSource = readFileSync('electron/main/i18n.ts', 'utf-8')
const mainDefined = new Set([...mainSource.matchAll(/^\s{2,}([A-Za-z0-9_]+):/gm)].map((m) => m[1]))
const mainKeys = collect('electron', /\.ts$/, /mainT\(\s*'([A-Za-z0-9_]+)'/g)

const problems = []
for (const [key, file] of rendererKeys) {
  if (!has(de, key)) problems.push(`de.ts fehlt ${key} (benutzt in ${file})`)
  if (!has(en, key)) problems.push(`en.ts fehlt ${key} (benutzt in ${file})`)
}
for (const key of de) if (!en.has(key)) problems.push(`nur in de.ts: ${key}`)
for (const key of en) if (!de.has(key)) problems.push(`nur in en.ts: ${key}`)
for (const [key, file] of mainKeys) {
  if (!mainDefined.has(key)) problems.push(`i18n.ts fehlt ${key} (benutzt in ${file})`)
}

console.log(`${rendererKeys.size} Schlüssel im Renderer, ${mainKeys.size} im Hauptprozess geprüft.`)
if (problems.length === 0) {
  console.log('✓ keine fehlenden Schlüssel.')
  process.exit(0)
}
for (const problem of problems) console.log(`✗ ${problem}`)
process.exit(1)
