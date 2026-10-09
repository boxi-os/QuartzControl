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
//
// The other direction - a key no call names any more - is answered only where it can be proven
// (unusedKeys below): a key counts as possibly used when any string literal in the code is that key,
// when a template literal's fixed parts can spell it, or when a literal prefix ('a.b.' + x) can.
// What is left is a key nothing can reach: 15 in de.ts/en.ts and one in i18n.ts when this was
// added, all removed. Counter-check: a key added under `backups` is reported; one added under
// `styles.variables` is not, because `styles.variables.${mode}` can spell it.
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
      // `export function mainT(key: MainStringKey, …)` declares the function - its "first argument"
      // is a parameter, and counting it printed one uncheckable call for a main process that has
      // none (review 2026-09-18, finding 3).
      if (/\bfunction\s+$/.test(source.slice(Math.max(0, match.index - 16), match.index))) continue
      const argument = firstArgument(source, match.index + match[0].length)
      if (argument.computed) computed++
      for (const key of argument.literals) if (keyShape.test(key) && !used.has(key)) used.set(key, file)
    }
  }
  return { used, computed }
}

// Every key a piece of code could name: the literals of all files, plus a pattern for each template
// literal whose fixed parts look like a key (`pluginsInstalled.${kind}Done`, `${key}Mac`) and each literal that is
// a key prefix ('layoutEditor.frameBuilder.breakpoint.' + bp). A template with no key-shaped text
// (`${a}`, `${a}.${b}`) would match everything, so it is left out - it cannot name a key on its own,
// it can only pass one along, and the literal it passes along is counted where it is written. The
// renderer's keys are dotted, so there a template must carry a dot in its fixed text: React keys
// such as `h${blocks.length}` (ReadmeText.tsx) otherwise vouched for every key starting with h.
function reachable(files, { dotted }) {
  const literals = new Set()
  const patterns = []
  for (const file of files) {
    const source = readFileSync(file, 'utf-8')
    for (const m of source.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g)) literals.add(m[1] ?? m[2])
    for (const m of source.matchAll(/`((?:[^`\\]|\\.)*)`/g)) {
      const parts = m[1].split(/\$\{(?:[^{}]|\{[^{}]*\})*\}/)
      if (parts.length === 1) {
        literals.add(m[1])
        continue
      }
      if (!parts.every((part) => /^[A-Za-z0-9_.]*$/.test(part)) || !/[A-Za-z0-9_]/.test(parts.join('')) || (dotted && !parts.join('').includes('.'))) continue
      patterns.push(new RegExp(`^${parts.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.+')}$`))
    }
  }
  const prefixes = [...literals].filter((l) => /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*\.$/.test(l))
  return (key) => literals.has(key) || patterns.some((r) => r.test(key)) || prefixes.some((prefix) => key.startsWith(prefix))
}

function unusedKeys(defined, isReachable) {
  return [...defined].filter((key) => {
    const base = key.replace(/_(zero|one|two|few|many|other)$/, '')
    return !isReachable(key) && !isReachable(base)
  })
}

const de = flatten(loadLocale('src/i18n/locales/de.ts'))
const en = flatten(loadLocale('src/i18n/locales/en.ts'))
const { used: rendererKeys, computed: rendererComputed } = collect('src', /\.tsx?$/, 't', /^[A-Za-z0-9_.]+$/)

// The main process has one file with both languages side by side; its keys are flat.
const mainSource = readFileSync('electron/main/i18n.ts', 'utf-8')
const mainDefined = new Set([...mainSource.matchAll(/^\s{2,}([A-Za-z0-9_]+):/gm)].map((m) => m[1]))
const { used: mainKeys, computed: mainComputed } = collect('electron', /\.ts$/, 'mainT', /^[A-Za-z0-9_]+$/)

// i18next nests with $t(key) inside a string; such a key is named by the language file itself.
const nested = [...readFileSync('src/i18n/locales/de.ts', 'utf-8').matchAll(/\$t\(([A-Za-z0-9_.]+)/g)].map((m) => m[1])
const rendererReach = reachable([...walk('src', /\.tsx?$/), ...walk('shared', /\.ts$/)].filter((f) => !f.includes(join('i18n', 'locales'))), { dotted: true })
const rendererUnused = unusedKeys(de, (key) => nested.includes(key) || rendererReach(key))
const mainReach = reachable(walk('electron', /\.ts$/).filter((f) => f !== join('electron', 'main', 'i18n.ts')), { dotted: false })
const mainUnused = unusedKeys(mainDefined, mainReach)

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
for (const key of rendererUnused) problems.push(`de.ts/en.ts: ${key} nennt kein Aufruf`)
for (const key of mainUnused) problems.push(`i18n.ts: ${key} nennt kein Aufruf`)

console.log(`${rendererKeys.size} Schlüssel im Renderer, ${mainKeys.size} im Hauptprozess geprüft.`)
console.log(
  `Nicht prüfbar, weil der Schlüssel berechnet oder durchgereicht wird: ${rendererComputed} Aufrufe im Renderer, ${mainComputed} im Hauptprozess.`
)
if (problems.length === 0) {
  console.log('✓ keine fehlenden und keine ungenutzten Schlüssel.')
  process.exit(0)
}
for (const problem of problems) console.log(`✗ ${problem}`)
process.exit(1)
