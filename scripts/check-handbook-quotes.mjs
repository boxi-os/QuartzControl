// Prüft die Blockzitate im Benutzerhandbuch gegen die Texte, die die App wirklich sagt.
//
//   npm run check:handbook
//
// Das Handbuch zitiert an einem Dutzend Stellen wörtlich - „Jeder Build leert diesen Ordner vorher
// vollständig.", „Der bisherige Content-Ordner wird beiseitegelegt". Ein Zitat, das die App so
// nicht mehr sagt, ist schlimmer als keines: Es sieht aus wie ein Beleg. Und kein anderer Test
// sieht es, weil das Handbuch außerhalb dieses Repos liegt.
//
// Der Anlass war der zweite Textdurchgang am 2026-09-07: Ein pauschales Ersetzen von
// „Ausgabeverzeichnis" durch „Ausgabeordner" ließ in einem Zitat „Jeder Build löscht sein
// Ausgabeordner" stehen, während die App längst „seinen" sagte.
//
// Verglichen wird großzügig normalisiert - ohne Platzhalter, Zahlen, Anführungszeichen,
// Hervorhebungen und Umbrüche -, weil ein Zitat kürzen und Beispielwerte einsetzen darf. Was es
// nicht darf, ist etwas anderes behaupten.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { localeStrings } from './locale.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const VAULT = path.join(os.homedir(), 'Obsidian/QuartzProjekte/QuartzControl-Handbuch')

if (!fs.existsSync(VAULT)) {
  console.log(`Handbuch-Vault nicht gefunden (${VAULT}) — übersprungen.`)
  process.exit(0)
}

// Je Sprache ein eigener Heuhaufen: Eine englische Seite zitiert die englischen Texte, und gegen
// de.ts geprueft waere jedes dieser Zitate ein falscher Alarm.
const mainSrc = fs.readFileSync(path.join(ROOT, 'electron/main/i18n.ts'), 'utf8')

function stringsFor(lang) {
  // Der Renderer-Teil kommt aus scripts/locale.mjs, weil screenshot-scenes.mjs dieselbe Tabelle
  // braucht - zwei Leser derselben Datei laufen sonst auseinander.
  const out = Object.values(localeStrings(lang))
  const block =
    lang === 'de'
      ? mainSrc.match(/\n  de: \{\n([\s\S]*?)\n  \},\n  en: \{/)[1]
      : mainSrc.match(/\n  en: \{\n([\s\S]*)/)[1]
  for (const m of block.matchAll(/^\s{4}[A-Za-z0-9_]+:\s*'((?:[^'\\]|\\.)*)'/gm)) out.push(m[1])
  return out
}

// Ein Zitat darf Platzhalter durch Beispielwerte ersetzen, kürzen und hervorheben - all das fällt
// hier weg, damit nur der Wortlaut übrig bleibt.
const norm = (s) =>
  s
    .replace(/\{\{[^}]+\}\}/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/\*\*|__|`/g, '')
    .replace(/[\u201e\u201c\u201d\u00ab\u00bb\u2018\u2019"']/g, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const haystacks = { de: stringsFor('de').map(norm), en: stringsFor('en').map(norm) }

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walk(full, out)
    else if (full.endsWith('.md')) out.push(full)
  }
  return out
}

let checked = 0
let bad = 0
for (const f of walk(VAULT)) {
  const lines = fs.readFileSync(f, 'utf8').split('\n')
  // Blockzitate: zusammenhaengende "> "-Zeilen, ohne Callout-Kopf.
  let buf = []
  let inCallout = false
  const flush = () => {
    const wasCallout = inCallout
    inCallout = false
    if (buf.length === 0) return
    const quote = norm(buf.join(' '))
    buf = []
    // Ein Callout ist eigener Text, kein Zitat der App - und ein Zitat mit einem Wikilink darin
    // ist ohnehin keines mehr.
    if (wasCallout || quote.includes('[[')) return
    if (quote.length < 25) return
    checked++
    const lang = path.relative(VAULT, f).startsWith('en/') ? 'en' : 'de'
    if (!haystacks[lang].some((h) => h.includes(quote))) {
      console.log(`${path.relative(VAULT, f)}: kein App-Text sagt das (${lang})`)
      console.log(`  „${quote.slice(0, 150)}"`)
      bad++
    }
  }
  for (const line of lines) {
    if (/^> \[!/.test(line)) {
      flush()
      inCallout = true
    } else if (/^>/.test(line)) {
      if (line.length > 2) buf.push(line.slice(2))
    } else flush()
  }
  flush()
}
console.log(`\n${checked} Zitate geprüft, ${bad} ohne Entsprechung in der App.`)
process.exit(bad ? 1 : 0)
