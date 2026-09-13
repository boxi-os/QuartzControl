// Every t('…') and mainT('…') key with a literal argument, checked against the language files.
//
// Written after the alpha test found `publish.pages.saveSettings` rendering as its own key in the
// GitHub Pages panel: i18next falls back to the key when it is missing, so a gap shows up as a
// dotted string in the UI rather than as an error, and only on the screen state that uses it (that
// button appears only once Pages already reads the branch). The keys were in perfect de/en parity
// - both files were missing it - which is why the parity rule alone did not catch it.
//
// Literals only, but every literal that can *be* the key: `t('a')`, both branches of
// `t(cond ? 'a' : 'b')`, and the values of `mainT({ x: 'a' }[reason])`. Reading only the first form
// hid both keys of every ternary (review 2026-09-17, finding 3: twelve call sites, 21 keys, found
// after `d077648` had written one). A key built from a variable (`t(\`plugins.${kind}.title\`)`)
// cannot be resolved statically, and guessing at the possible values would report failures that are
// not real - so those calls are counted and the count is printed: "cannot check" is not "all good".
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

// The first argument of every `name(` call, read far enough to know where it ends: brackets nest,
// strings and template literals are skipped whole. A string literal counts as a key when it stands
// where a value would - at the start of the argument, after `?` or `:` - which takes the branches of
// a ternary and the values of an object, and leaves out the `'off'` in `state === 'off' ? …`.
function firstArgument(source, start) {
  const literals = []
  let computed = false
  let depth = 0
  let previous = '('
  let empty = true
  for (let i = start; i < source.length; i++) {
    const c = source[i]
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1
      let interpolated = false
      while (j < source.length && source[j] !== c) {
        if (source[j] === '\\') j++
        else if (c === '`' && source[j] === '$' && source[j + 1] === '{') interpolated = true
        j++
      }
      if (c === '`' && interpolated) computed = true
      else if ('(?:'.includes(previous)) literals.push(source.slice(i + 1, j))
      previous = c
      empty = false
      i = j
      continue
    }
    if ('([{'.includes(c)) depth++
    else if (')]}'.includes(c)) {
      if (depth === 0) break
      depth--
    } else if (c === ',' && depth === 0) break
    if (!/\s/.test(c)) previous = c
    empty = empty && /\s/.test(c)
  }
  // `mainT()` in a comment names the function, it does not call it.
  if (literals.length === 0 && !empty) computed = true
  return { literals, computed }
}

function collect(dir, extension, name, keyShape) {
  const used = new Map()
  let computed = 0
  const call = new RegExp(`\\b${name}\\(`, 'g')
  for (const file of walk(dir, extension)) {
    const source = readFileSync(file, 'utf-8')
    for (const match of source.matchAll(call)) {
      const argument = firstArgument(source, match.index + match[0].length)
      if (argument.computed) computed++
      for (const key of argument.literals) if (keyShape.test(key) && !used.has(key)) used.set(key, file)
    }
  }
  return { used, computed }
}

const de = flatten(loadLocale('src/i18n/locales/de.ts'))
const en = flatten(loadLocale('src/i18n/locales/en.ts'))
const { used: rendererKeys, computed: rendererComputed } = collect('src', /\.tsx?$/, 't', /^[A-Za-z0-9_.]+$/)

// The main process has one file with both languages side by side; its keys are flat.
const mainSource = readFileSync('electron/main/i18n.ts', 'utf-8')
const mainDefined = new Set([...mainSource.matchAll(/^\s{2,}([A-Za-z0-9_]+):/gm)].map((m) => m[1]))
const { used: mainKeys, computed: mainComputed } = collect('electron', /\.ts$/, 'mainT', /^[A-Za-z0-9_]+$/)

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
console.log(
  `Nicht prüfbar, weil der Schlüssel berechnet oder durchgereicht wird: ${rendererComputed} Aufrufe im Renderer, ${mainComputed} im Hauptprozess.`
)
if (problems.length === 0) {
  console.log('✓ keine fehlenden Schlüssel.')
  process.exit(0)
}
for (const problem of problems) console.log(`✗ ${problem}`)
process.exit(1)
