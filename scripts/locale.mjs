// Die Sprachdateien des Renderers, gelesen wie sie geschrieben sind.
//
// Existiert, weil zwei Skripte dieselbe Frage stellen und sie nicht zweimal beantworten sollen:
// check-handbook-quotes.mjs hält Zitate des Handbuchs gegen das, was die App sagt, und
// screenshot-scenes.mjs sucht seine Bedienelemente an ihrer Beschriftung. Die zweite Verwendung
// hat die erste hierher gehoben - bis dahin standen die zehn Beschriftungen als deutsche
// Zeichenketten im Szenen-Skript, und auf einer englischen App fand es nichts.
//
// `new Function` statt eines Imports: Die Dateien sind TypeScript mit `as const`, und ein
// node-Prozess lädt kein .ts. Das `^export default` ohne `m` trifft nur den Dateianfang, und
// genau so beginnen beide Dateien; bekäme eine einen Kopfkommentar, fiele das hier mit einem
// SyntaxError laut um statt still das Falsche zu liefern.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

/** Verschachtelte Sprachdatei zu einer flachen Tabelle: "buildServer.buildNow" -> "Jetzt bauen". */
export function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object') flatten(v, key, out)
    else if (typeof v === 'string') out[key] = v
  }
  return out
}

/** Die Sprachdatei einer Sprache als flache Tabelle. */
export function localeStrings(lang) {
  let src = fs.readFileSync(path.join(ROOT, `src/i18n/locales/${lang}.ts`), 'utf8')
  src = src.replace(/^export default\s*/, 'return ').replace(/\bas const\s*$/m, '')
  return flatten(new Function(src)())
}

/**
 * Ein Nachschlager für eine Sprache. Ein Schlüssel ohne Wert ist ein Fehler und kein leerer
 * String: Ein Selektor auf "" fände irgendetwas oder nichts, und beides wäre still falsch.
 */
export function translator(lang) {
  const strings = localeStrings(lang)
  return (key) => {
    const value = strings[key]
    if (value === undefined) throw new Error(`Kein Schlüssel ${key} in ${lang}.ts`)
    return value
  }
}
