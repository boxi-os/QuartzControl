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

import { PALETTE } from './example-template/palette.mjs'
import { VARIABLE_OVERRIDES } from './example-template/variables.mjs'

const APP_DIR = path.resolve(import.meta.dirname, '..')
const STYLE_DIR = path.join(APP_DIR, 'scripts/example-template/styles')
const VAULT = path.join(os.homedir(), 'Obsidian/QuartzProjekte/Example')

const START = '<!-- QuartzControl:variables:start -->'
const END = '<!-- QuartzControl:variables:end -->'

/**
 * Which stylesheets belong to which page, and what the component is called in the sentence that
 * introduces the table. A page may own several stylesheets - the header is a toolbar and a page
 * title, a folder listing is the folder page and the tag page - and that is the whole reason this
 * is a table rather than a filename convention.
 */
const SEITEN = [
  { de: 'gestaltung/navigation/explorer', en: 'en/design/navigation/explorer', files: ['nav-explorer.scss'] },
  { de: 'gestaltung/navigation/suche', en: 'en/design/navigation/search', files: ['nav-search.scss'] },
  { de: 'gestaltung/navigation/farbschema', en: 'en/design/navigation/colour-scheme', files: ['nav-darkmode.scss'] },
  { de: 'gestaltung/navigation/lesemodus', en: 'en/design/navigation/reader-mode', files: ['nav-reader-mode.scss'] },
  { de: 'gestaltung/navigation/kopfbereich', en: 'en/design/navigation/header', files: ['nav-header.scss'] },
  { de: 'gestaltung/navigation/fusszeile', en: 'en/design/navigation/footer', files: ['site-footer.scss'] },
  { de: 'gestaltung/seitenapparat/inhaltsverzeichnis', en: 'en/design/page-apparatus/table-of-contents', files: ['aside-toc.scss'] },
  { de: 'gestaltung/seitenapparat/rueckverweise', en: 'en/design/page-apparatus/backlinks', files: ['aside-backlinks.scss'] },
  { de: 'gestaltung/seitenapparat/graph', en: 'en/design/page-apparatus/graph', files: ['aside-graph.scss'] },
  { de: 'gestaltung/seitenapparat/zuletzt-geaendert', en: 'en/design/page-apparatus/recent-notes', files: ['aside-recent-notes.scss'] },
  { de: 'gestaltung/ueber-dem-inhalt/brotkrumen', en: 'en/design/above-the-content/breadcrumbs', files: ['meta-breadcrumbs.scss'] },
  { de: 'gestaltung/ueber-dem-inhalt/titel-und-datum', en: 'en/design/above-the-content/title-and-date', files: ['meta-title-and-date.scss'] },
  { de: 'gestaltung/ueber-dem-inhalt/eigenschaften', en: 'en/design/above-the-content/properties', files: ['meta-note-properties.scss'] },
  { de: 'gestaltung/ueber-dem-inhalt/tags', en: 'en/design/above-the-content/tags', files: ['meta-tag-list.scss'] },
  { de: 'gestaltung/im-inhalt/fliesstext', en: 'en/design/in-the-content/body-text', files: ['body-content.scss'] },
  { de: 'gestaltung/im-inhalt/callouts', en: 'en/design/in-the-content/callouts', files: ['body-callouts.scss'] },
  { de: 'gestaltung/im-inhalt/code', en: 'en/design/in-the-content/code', files: ['body-code.scss'] },
  { de: 'gestaltung/im-inhalt/tabellen-und-medien', en: 'en/design/in-the-content/tables-and-media', files: ['body-media.scss'] },
  { de: 'gestaltung/seitentypen/ordner-und-tags', en: 'en/design/page-types/folders-and-tags', files: ['page-listing.scss'] },
  { de: 'gestaltung/seitentypen/vorschau', en: 'en/design/page-types/link-preview', files: ['page-popover.scss'] },
  { de: 'gestaltung/seitentypen/suchergebnisse', en: 'en/design/page-types/search-results', files: ['page-search-results.scss'] },
  { de: 'gestaltung/seitentypen/fehlerseite', en: 'en/design/page-types/error-page', files: ['page-404.scss'] },
  { de: 'gestaltung/grundlagen/barrierefreiheit', en: 'en/design/foundations/accessibility', files: ['a11y.scss'] },
  { de: 'gestaltung/grundlagen/tokens', en: 'en/design/foundations/tokens', files: ['base.scss'] },
  { de: 'gestaltung/layout-box/die-fuenf-instanzen', en: 'en/design/layout-box/the-five-instances', files: ['plugin-layout-box.scss'] },
  { de: 'gestaltung/mehrsprachigkeit/umschalter', en: 'en/design/multilingual/switcher', files: ['nav-language-switcher.scss'] },
  { de: 'obsidian-formate/bases/index', en: 'en/obsidian-formats/bases/index', files: ['page-bases.scss'] },
  { de: 'obsidian-formate/canvas/index', en: 'en/obsidian-formats/canvas/index', files: ['page-canvas.scss'] },
  { de: 'formatierung/diagramme/index', en: 'en/formatting/diagrams/index', files: ['body-mermaid.scss'] },
  { de: 'formatierung/mathematik/index', en: 'en/formatting/math/index', files: ['body-math.scss'] }
]

const TEXTE = {
  de: {
    heading: '## Welche Variablen hier greifen',
    intro: (n, files) =>
      `Diese ${n === 1 ? 'Variable liest' : n + ' Variablen liest'} ${files}. Ändern lassen sie sich in ` +
      'der App unter *Stile → Variablen* — ohne eine Zeile CSS.',
    cols: ['Variable', 'Wert', 'gilt außerdem für'],
    alone: 'nur hier',
    many: (n) => `${n} weitere Komponenten`,
    darkWord: 'dunkel',
    local: (f) => `im Stylesheet gesetzt (\`${f}\`)`,
    generated: 'Diese Tabelle ist erzeugt: Sie wird aus den Stylesheets gelesen, nicht von Hand gepflegt.'
  },
  en: {
    heading: '## Which variables apply here',
    intro: (n, files) =>
      `${n === 1 ? 'This variable is read' : `These ${n} variables are read`} by ${files}. They can be ` +
      'changed in the app under *Styles → Variables* — without a line of CSS.',
    cols: ['Variable', 'Value', 'also applies to'],
    alone: 'only here',
    many: (n) => `${n} other components`,
    darkWord: 'dark',
    local: (f) => `set in the stylesheet (\`${f}\`)`,
    generated: 'This table is generated: it is read out of the stylesheets rather than kept by hand.'
  }
}

/* ------------------------------------------------------------------ die Messung */

function ohneKommentare(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')
}

/** Variable -> Set der Stylesheets, die sie lesen. */
function leserProVariable() {
  const map = new Map()
  for (const file of fs.readdirSync(STYLE_DIR).filter((n) => n.endsWith('.scss'))) {
    const src = ohneKommentare(fs.readFileSync(path.join(STYLE_DIR, file), 'utf-8'))
    for (const m of src.matchAll(/var\(\s*(--[\w-]+)/g)) {
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

/** Aus `nav-explorer.scss` wird „Explorer“ - der Titel, unter dem die Seite darüber spricht. */
function komponente(file, sprache) {
  const eintrag = SEITEN.find((s) => s.files.includes(file))
  if (!eintrag) return file.replace(/\.scss$/, '')
  return titelVon(eintrag[sprache])
}

function tabelle(seite, sprache, leser) {
  const t = TEXTE[sprache]
  const eigene = new Set()
  for (const file of seite.files) {
    const src = ohneKommentare(fs.readFileSync(path.join(STYLE_DIR, file), 'utf-8'))
    for (const m of src.matchAll(/var\(\s*(--[\w-]+)/g)) eigene.add(m[1])
  }
  const namen = [...eigene].sort()
  if (namen.length === 0) return null

  const zeilen = namen.map((name) => {
    const andere = [...(leser.get(name) ?? [])].filter((f) => !seite.files.includes(f))
    const reichweite =
      andere.length === 0
        ? t.alone
        : andere.length <= 2
          ? andere.map((f) => komponente(f, sprache)).join(', ')
          : t.many(andere.length)
    return `| \`${name}\` | ${wert(name, sprache)} | ${reichweite} |`
  })

  const dateien = seite.files.map((f) => `\`${f}\``).join(sprache === 'de' ? ' und ' : ' and ')
  return [
    t.heading,
    '',
    t.intro(namen.length, dateien),
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

  const zugeordnet = new Set(SEITEN.flatMap((s) => s.files))
  const ohneSeite = fs
    .readdirSync(STYLE_DIR)
    .filter((n) => n.endsWith('.scss') && !zugeordnet.has(n))
    .sort()

  console.log(`\n${zaehler.ergänzt} ergänzt, ${zaehler.aktualisiert} aktualisiert, ${zaehler.unverändert} unverändert`)
  if (ohneSeite.length) console.log(`Stylesheets ohne Doku-Seite: ${ohneSeite.join(', ')}`)
  if (check && (zaehler.ergänzt || zaehler.aktualisiert)) {
    console.log('\n--check: Es gäbe etwas zu schreiben.')
    process.exit(1)
  }
}

main()
