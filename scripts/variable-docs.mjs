// Writes, into each page of the example vault's "Gestaltung" section, the CSS variables the
// component described there actually reads.
//
// Generated rather than written, for the reason every other number in this project is measured
// rather than remembered: a hand-written list of thirty variables is correct on the day it is
// written and wrong the first time somebody touches the stylesheet. This reads the stylesheets, so
// the table cannot disagree with them.
//
// It reads the *repo's* copy of the stylesheets (scripts/example-template/styles/), not the
// project's - the same source `--check-contrast` measures, so this needs no app, no project and no
// network. Run `npm run template:example -- --sync` first if you have been editing in the project.
//
//   node scripts/variable-docs.mjs            schreibt die Blöcke
//   node scripts/variable-docs.mjs --check    sagt nur, was sich ändern würde (Exit 1)
//
// The block is delimited by HTML comments, which quartz strips from the built page - so the markers
// are invisible on the site and stable in the file. Everything outside them is left alone.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

import { PALETTE, TYPOGRAPHY } from './example-template/palette.mjs'
import { VARIABLE_OVERRIDES } from './example-template/variables.mjs'
import { STYLE_ORDER } from './example-template/style-order.mjs'

const APP_DIR = path.resolve(import.meta.dirname, '..')
const STYLE_DIR = path.join(APP_DIR, 'scripts/example-template/styles')
const VAULT = path.join(os.homedir(), 'Obsidian/QuartzProjekte/Example')

const START = '<!-- QuartzControl:variables:start -->'
const END = '<!-- QuartzControl:variables:end -->'

/**
 * Which sections of the stylesheets belong to which page. A page may own several - the header is a
 * toolbar and a page title, a folder listing is the folder page and the tag page - and that is the
 * whole reason this is a table rather than a filename convention.
 *
 * A section is what was a stylesheet of its own until 1.1: the twelve files of the template are the
 * old 31 put together, and each part starts with a marker line naming the file it came from
 * (`// ====… nav-explorer`). The pages describe components, not categories, so they keep reading
 * at that grain; a file without markers is one section of its own name.
 */
const SEITEN = [
  { de: '5-gestaltung/01-navigation/explorer', en: 'en/5-design/01-navigation/explorer', sections: ['nav-explorer'] },
  { de: '5-gestaltung/01-navigation/navigation', en: 'en/5-design/01-navigation/navigation', sections: ['nav-navigations'] },
  { de: '5-gestaltung/01-navigation/suche', en: 'en/5-design/01-navigation/search', sections: ['nav-search'] },
  { de: '5-gestaltung/01-navigation/farbschema', en: 'en/5-design/01-navigation/colour-scheme', sections: ['nav-darkmode'] },
  { de: '5-gestaltung/01-navigation/lesemodus', en: 'en/5-design/01-navigation/reader-mode', sections: ['nav-reader-mode'] },
  { de: '5-gestaltung/01-navigation/kopfbereich', en: 'en/5-design/01-navigation/header', sections: ['nav-header'] },
  { de: '5-gestaltung/01-navigation/fusszeile', en: 'en/5-design/01-navigation/footer', sections: ['site-footer'] },
  { de: '5-gestaltung/04-neben-dem-inhalt/inhaltsverzeichnis', en: 'en/5-design/04-beside-the-content/table-of-contents', sections: ['aside-toc'] },
  { de: '5-gestaltung/04-neben-dem-inhalt/rueckverweise', en: 'en/5-design/04-beside-the-content/backlinks', sections: ['aside-backlinks'] },
  { de: '5-gestaltung/04-neben-dem-inhalt/graph', en: 'en/5-design/04-beside-the-content/graph', sections: ['aside-graph'] },
  { de: '5-gestaltung/04-neben-dem-inhalt/zuletzt-geaendert', en: 'en/5-design/04-beside-the-content/recent-notes', sections: ['aside-recent-notes'] },
  { de: '5-gestaltung/02-ueber-dem-inhalt/brotkrumen', en: 'en/5-design/02-above-the-content/breadcrumbs', sections: ['meta-breadcrumbs'] },
  { de: '5-gestaltung/02-ueber-dem-inhalt/titel-und-datum', en: 'en/5-design/02-above-the-content/title-and-date', sections: ['meta-title-and-date'] },
  { de: '5-gestaltung/02-ueber-dem-inhalt/eigenschaften', en: 'en/5-design/02-above-the-content/properties', sections: ['meta-note-properties'] },
  { de: '5-gestaltung/02-ueber-dem-inhalt/tags', en: 'en/5-design/02-above-the-content/tags', sections: ['meta-tag-list'] },
  { de: '5-gestaltung/03-im-inhalt/fliesstext', en: 'en/5-design/03-in-the-content/body-text', sections: ['body-content'] },
  { de: '5-gestaltung/03-im-inhalt/callouts', en: 'en/5-design/03-in-the-content/callouts', sections: ['body-callouts'] },
  { de: '5-gestaltung/03-im-inhalt/code', en: 'en/5-design/03-in-the-content/code', sections: ['body-code'] },
  { de: '5-gestaltung/03-im-inhalt/tabellen-und-medien', en: 'en/5-design/03-in-the-content/tables-and-media', sections: ['body-media'] },
  { de: '5-gestaltung/06-erzeugte-seiten/ordner-und-tags', en: 'en/5-design/06-generated-pages/folders-and-tags', sections: ['page-listing'] },
  { de: '5-gestaltung/06-erzeugte-seiten/vorschau', en: 'en/5-design/06-generated-pages/link-preview', sections: ['page-popover'] },
  { de: '5-gestaltung/06-erzeugte-seiten/suchergebnisse', en: 'en/5-design/06-generated-pages/search-results', sections: ['page-search-results'] },
  { de: '5-gestaltung/06-erzeugte-seiten/fehlerseite', en: 'en/5-design/06-generated-pages/error-page', sections: ['page-404'] },
  { de: '6-anpassen/06-barrierefreiheit', en: 'en/6-adapting/06-accessibility', sections: ['a11y'] },
  { de: '6-anpassen/04-variablen', en: 'en/6-adapting/04-variables', sections: ['base'] },
  { de: '5-gestaltung/05-layout-boxen/die-instanzen', en: 'en/5-design/05-layout-boxes/the-instances', sections: ['plugin-layout-box'] },
  { de: '5-gestaltung/01-navigation/sprachumschalter', en: 'en/5-design/01-navigation/language-switcher', sections: ['nav-language-switcher'] },
  { de: '3-obsidian-formate/01-bases/index', en: 'en/3-obsidian-formats/01-bases/index', sections: ['page-bases'] },
  { de: '3-obsidian-formate/02-canvas/index', en: 'en/3-obsidian-formats/02-canvas/index', sections: ['page-canvas'] },
  { de: '2-formatierung/09-diagramme/index', en: 'en/2-formatting/09-diagrams/index', sections: ['body-mermaid'] },
  { de: '2-formatierung/08-mathematik/index', en: 'en/2-formatting/08-math/index', sections: ['body-math'] }
]

const TEXTE = {
  de: {
    heading: '## Welche Variablen hier greifen',
    intro: (n, where) =>
      `Diese ${n === 1 ? 'Variable liest' : n + ' Variablen liest'} ${where}. Ändern lassen sie sich in ` +
      'der App unter *Stile → Variablen* — ohne eine Zeile CSS.',
    cols: ['Variable', 'Wert', 'gilt außerdem für'],
    alone: 'nur hier',
    many: (n) => `${n} weitere Komponenten`,
    darkWord: 'dunkel',
    local: (f) => `im Stylesheet gesetzt (\`${f}\`)`,
    and: ' und ',
    section: (n, names, files) => `${n === 1 ? 'der Abschnitt' : 'die Abschnitte'} ${names} in ${files}`,
    generated: 'Diese Tabelle ist erzeugt: Sie wird aus den Stylesheets gelesen, nicht von Hand gepflegt.'
  },
  en: {
    heading: '## Which variables apply here',
    intro: (n, where) =>
      `${n === 1 ? 'This variable is read' : `These ${n} variables are read`} by ${where}. They can be ` +
      'changed in the app under *Styles → Variables* — without a line of CSS.',
    cols: ['Variable', 'Value', 'also applies to'],
    alone: 'only here',
    many: (n) => `${n} other components`,
    darkWord: 'dark',
    local: (f) => `set in the stylesheet (\`${f}\`)`,
    and: ' and ',
    section: (n, names, files) => `the ${n === 1 ? 'section' : 'sections'} ${names} in ${files}`,
    generated: 'This table is generated: it is read out of the stylesheets rather than kept by hand.'
  }
}

/* ------------------------------------------------------------------ die Messung */

function ohneKommentare(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')
}

/**
 * Die Abschnitte aller Stylesheets: `{ name, file, text }`. Ein Abschnitt beginnt mit einer
 * Markierungszeile (`// ====… name`) und reicht bis zur nächsten; was davor steht, ist der Kopf
 * der Datei und gehört keinem. Eine Datei ohne Markierung ist ein Abschnitt ihres Namens.
 * `base` steht in drei Dateien und zählt als *ein* Abschnitt: `ABSCHNITTE` führt ihn je Datei,
 * `textVon()` setzt ihn zusammen.
 */
const ABSCHNITTE = (() => {
  const out = []
  for (const file of fs.readdirSync(STYLE_DIR).filter((n) => n.endsWith('.scss')).sort()) {
    const text = fs.readFileSync(path.join(STYLE_DIR, file), 'utf-8')
    const teile = text.split(/^\/\/ =+ ([a-z0-9-]+)$/m)
    if (teile.length === 1) {
      out.push({ name: file.replace(/\.scss$/, ''), file, text })
      continue
    }
    for (let i = 1; i < teile.length; i += 2) out.push({ name: teile[i], file, text: teile[i + 1] })
  }
  return out
})()

const textVon = (name) => ABSCHNITTE.filter((a) => a.name === name).map((a) => a.text).join('\n')
const dateienVon = (name) => [...new Set(ABSCHNITTE.filter((a) => a.name === name).map((a) => a.file))]

/** Variable -> Set der Abschnitte, die sie lesen. */
function leserProVariable() {
  const map = new Map()
  for (const { name: file, text } of ABSCHNITTE) {
    const src = ohneKommentare(text)
    for (const m of src.matchAll(/var\(\s*(--[\w-]+)/g)) {
      // Die Variablen von quartz-navigations deklariert das Plugin auf seinem eigenen Element; ein
      // Wert aus dem Variablen-Tab käme dort nie an (Abschnitt `nav-navigations`, Kopf). Die Tabelle
      // verspricht aber genau das, also stehen sie nicht darin.
      if (m[1].startsWith('--quartz-nav-')) continue
      if (!map.has(m[1])) map.set(m[1], new Set())
      map.get(m[1]).add(file)
    }
  }
  return map
}

const WERTE = (() => {
  const out = new Map()
  for (const v of VARIABLE_OVERRIDES) out.set(`--${v.key}`, { light: v.light, dark: v.dark })
  for (const [key, value] of Object.entries(PALETTE.lightMode)) {
    if (!out.has(`--${key}`)) out.set(`--${key}`, { light: value, dark: PALETTE.darkMode[key] })
  }
  // Die Schriftvariablen schreibt Quartz selbst aus `typography`, seit die Vorlage am 2026-09-20
  // ihre eigenen Stapel aufgegeben hat - ohne diese Zeilen stand in 28 Tabellen ein „—“, wo die
  // Familie hingehört. Die Stapel dahinter sind Quartz' eigene, abgelesen am gebauten CSS der
  // Example-Website; `title` fällt wie in Quartz auf `header` zurück.
  const stapel = (family, mono) =>
    `"${family}", ${mono ? 'ui-monospace, SFMono-Regular, SF Mono, Menlo, monospace' : 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'}`
  for (const [name, family, mono] of [
    ['--headerFont', TYPOGRAPHY.header, false],
    ['--titleFont', TYPOGRAPHY.title ?? TYPOGRAPHY.header, false],
    ['--bodyFont', TYPOGRAPHY.body, false],
    ['--codeFont', TYPOGRAPHY.code, true]
  ]) {
    if (!out.has(name)) out.set(name, { light: stapel(family, mono) })
  }
  // Quartz schreibt sie als Alias (variables.mjs, Kopf); `aufgeloest()` zeigt dann die Familie dahinter.
  if (!out.has('--font-interface')) out.set('--font-interface', { light: 'var(--bodyFont)' })
  return out
})()

// One level of `var()` is resolved: half the template's own tokens are aliases onto the palette,
// and `--tpl-rule-strong: var(--gray)` alone tells a reader nothing about what they would be
// changing. Only one level - a chain is the variable graph's job, and the app draws that.
function aufgeloest(value) {
  const alias = /^var\(\s*(--[\w-]+)\s*\)$/.exec(String(value))
  if (!alias) return null
  const ziel = WERTE.get(alias[1])
  return ziel ? String(ziel.light) : null
}

// A font stack is 90 characters of fallbacks and would push the other two columns off a phone. The
// value is shortened *inside* the backticks - shortening the finished cell cut the closing one off
// and left the rest of the row in monospace.
function kurz(text) {
  return text.length > 44 ? `${text.slice(0, 41)}…` : text
}

function seite(value, mode) {
  const roh = kurz(String(value)).replace(/\|/g, '\\|')
  const ziel = mode === 'light' ? aufgeloest(value) : null
  // Both halves in backticks, and that is not cosmetic: a bare `#5f5d57` in the text is read by
  // quartz's parseTags as an inline tag and rendered as a link to a tag page that does not exist -
  // eighty-six broken links across the section, measured before this line had the second pair.
  return ziel ? `\`${roh}\` = \`${kurz(ziel).replace(/\|/g, '\\|')}\`` : `\`${roh}\``
}

// Variables a stylesheet declares itself - the explorer's four icons are SVG data URIs, written
// where they are used. They read like an app-editable token and are not one, so the table says so
// rather than showing an empty cell that invites a search in the wrong place.
const LOKAL = (() => {
  const out = new Map()
  for (const file of fs.readdirSync(STYLE_DIR).filter((n) => n.endsWith('.scss'))) {
    const src = ohneKommentare(fs.readFileSync(path.join(STYLE_DIR, file), 'utf-8'))
    for (const m of src.matchAll(/^\s*(--[\w-]+)\s*:/gm)) out.set(m[1], file)
  }
  return out
})()

function wert(name, sprache) {
  const v = WERTE.get(name)
  if (!v) {
    const datei = LOKAL.get(name)
    return datei ? TEXTE[sprache].local(datei) : '—'
  }
  const hell = seite(v.light, 'light')
  if (!v.dark || v.dark === v.light) return hell
  return `${hell} · ${TEXTE[sprache].darkWord} ${seite(v.dark, 'dark')}`
}

/** Der Titel, unter dem eine Seite im Vault steht - fürs Nennen der Nachbarn. */
const TITEL = new Map()
function titelVon(datei) {
  if (TITEL.has(datei)) return TITEL.get(datei)
  let name = datei.split('/').pop().replace(/-/g, ' ')
  try {
    const kopf = fs.readFileSync(path.join(VAULT, `${datei}.md`), 'utf-8').split('---')[1] ?? ''
    const m = /^title:\s*(.+)$/m.exec(kopf)
    if (m) name = m[1].trim().replace(/^["']|["']$/g, '')
  } catch {
    /* Seite fehlt - dann bleibt der Dateiname */
  }
  TITEL.set(datei, name)
  return name
}

/** Aus dem Abschnitt `nav-explorer` wird „Explorer“ - der Titel, unter dem die Seite darüber spricht. */
function komponente(abschnitt, sprache) {
  const eintrag = SEITEN.find((s) => s.sections.includes(abschnitt))
  if (!eintrag) return abschnitt
  return titelVon(eintrag[sprache])
}

/** „der Abschnitt `nav-explorer` in `components-navigation.scss`“, oder nur die Datei, wenn sie der Abschnitt ist. */
function woGelesen(seite, sprache) {
  const t = TEXTE[sprache]
  const liste = (xs) => {
    const q = xs.map((x) => `\`${x}\``)
    return q.length < 2 ? q.join('') : `${q.slice(0, -1).join(', ')}${t.and}${q.at(-1)}`
  }
  const rang = (f) => STYLE_ORDER.indexOf(f.replace(/\.scss$/, ''))
  const dateien = [...new Set(seite.sections.flatMap(dateienVon))].sort((a, b) => rang(a) - rang(b))
  if (seite.sections.every((s) => dateienVon(s).length === 1 && dateienVon(s)[0] === `${s}.scss`)) return liste(dateien)
  return t.section(seite.sections.length, liste(seite.sections), liste(dateien))
}

function tabelle(seite, sprache, leser) {
  const t = TEXTE[sprache]
  const eigene = new Set()
  for (const abschnitt of seite.sections) {
    const src = ohneKommentare(textVon(abschnitt))
    for (const m of src.matchAll(/var\(\s*(--[\w-]+)/g)) if (!m[1].startsWith('--quartz-nav-')) eigene.add(m[1])
  }
  const namen = [...eigene].sort()
  if (namen.length === 0) return null

  const zeilen = namen.map((name) => {
    const andere = [...(leser.get(name) ?? [])].filter((f) => !seite.sections.includes(f))
    const reichweite =
      andere.length === 0
        ? t.alone
        : andere.length <= 2
          ? andere.map((f) => komponente(f, sprache)).join(', ')
          : t.many(andere.length)
    return `| \`${name}\` | ${wert(name, sprache)} | ${reichweite} |`
  })

  return [
    t.heading,
    '',
    t.intro(namen.length, woGelesen(seite, sprache)),
    '',
    `| ${t.cols.join(' | ')} |`,
    '| --- | --- | --- |',
    ...zeilen,
    '',
    `*${t.generated}*`
  ].join('\n')
}

/* ------------------------------------------------------------------ das Schreiben */

function schreibe(datei, block, check) {
  const pfad = path.join(VAULT, `${datei}.md`)
  if (!fs.existsSync(pfad)) return { datei, status: 'fehlt' }
  const alt = fs.readFileSync(pfad, 'utf-8')
  const abschnitt = `${START}\n${block}\n${END}`

  let neu
  if (alt.includes(START) && alt.includes(END)) {
    const a = alt.indexOf(START)
    const b = alt.indexOf(END) + END.length
    neu = alt.slice(0, a) + abschnitt + alt.slice(b)
  } else {
    neu = `${alt.replace(/\s*$/, '')}\n\n${abschnitt}\n`
  }
  if (neu === alt) return { datei, status: 'unverändert' }
  if (!check) fs.writeFileSync(pfad, neu)
  return { datei, status: alt.includes(START) ? 'aktualisiert' : 'ergänzt' }
}

function main() {
  const check = process.argv.includes('--check')
  const leser = leserProVariable()

  const zaehler = { ergänzt: 0, aktualisiert: 0, unverändert: 0, fehlt: 0 }
  for (const seite of SEITEN) {
    for (const sprache of ['de', 'en']) {
      const block = tabelle(seite, sprache, leser)
      if (!block) continue
      const r = schreibe(seite[sprache], block, check)
      zaehler[r.status] += 1
      if (r.status === 'fehlt') console.log(`  ! Seite fehlt: ${seite[sprache]}`)
    }
  }

  const zugeordnet = new Set(SEITEN.flatMap((s) => s.sections))
  const ohneSeite = [...new Set(ABSCHNITTE.map((a) => a.name))].filter((n) => !zugeordnet.has(n)).sort()

  console.log(`\n${zaehler.ergänzt} ergänzt, ${zaehler.aktualisiert} aktualisiert, ${zaehler.unverändert} unverändert`)
  if (ohneSeite.length) console.log(`Abschnitte ohne Doku-Seite: ${ohneSeite.join(', ')}`)
  if (check && (zaehler.ergänzt || zaehler.aktualisiert)) {
    console.log('\n--check: Es gäbe etwas zu schreiben.')
    process.exit(1)
  }
}

main()
