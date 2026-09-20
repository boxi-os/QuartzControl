// Die Basis-Vorlage: dieselbe Gestaltung, so wenig Inhalt wie möglich.
//
// Sie ist das Paket, das der Anlege-Assistent anbietet — was jemand bekommt, der ein neues Projekt
// anlegt und „Vorlage anwenden" ankreuzt. Ihre Aufgabe ist deshalb eine andere als die des
// Example: Das Example führt vor, was diese Vorlagenfamilie kann; die Basis-Vorlage soll
// verschwinden, sobald der Nutzer eigene Notizen hat, und dabei alles stehen lassen, was er
// braucht.
//
// Daraus folgen zwei Regeln, die auf den ersten Blick widersprüchlich aussehen:
//
//   1. **Wenige Komponenten.** Je eigenem Plugin ein oder zwei, nicht sieben. Ein leeres Projekt,
//      das mit fünf Kästen, einem Graphen und einer Tag-Leiste startet, wirft dem Nutzer Arbeit
//      hin, die er erst rückgängig machen muss, bevor er anfangen kann.
//   2. **Alle Stylesheets.** Alle 31 reisen mit, auch die der abgeschalteten Komponenten. Wer eine
//      davon einschaltet, bekommt sie fertig gestaltet — genauso, wie der Explorer im Example ein
//      Häkchen weit weg ist, obwohl ihn dort die Navigation ersetzt hat.
//
// Wie `doku.mjs` leitet diese Datei aus den Example-Daten ab und kopiert sie nicht: Eine Farbe, die
// in `palette.mjs` geändert wird, erreicht beide Pakete. Und wie dort wirft jede Funktion, wenn
// ein Name in der Basis nicht vorkommt — eine Ableitung, die stillschweigend nichts tut, ist die
// Art Fehler, die man erst am fertigen Paket sieht.

import * as doku from './doku.mjs'

// Was ausgeschaltet wird, und warum.
//
// Die vier von `doku.mjs` gelten hier aus denselben Gründen: `tag-list` und `recent-notes` sagen
// über ein Projekt mit zehn Seiten nichts, `comments` braucht ein giscus-Repo, das ein neues
// Projekt nicht hat, und `stacked-pages` ist nach einem Wikilink-Klick sichtbar und dort
// unerklärt.
//
// Zwei kommen dazu:
//
//   graph     Ein Verweisgeflecht entsteht mit der Zeit. Am ersten Tag zeichnet der Graph zehn
//             Punkte und zwei Linien und kostet dafür einen Block in der rechten Spalte auf jeder
//             Seite.
//   explorer  Die eine Navigationsinstanz steht an seinem Platz. Zwei Bäume nebeneinander sind
//             zwei Antworten auf dieselbe Frage — dieselbe Entscheidung wie im Example.
const OFF = [...doku.DISABLED, 'graph', 'explorer']

// Die Kästen, die nicht mitreisen. Vom Example bleiben genau zwei: die Marke und eine Notiz in der
// Seitenleiste. Was hier fehlt, führt etwas vor, statt etwas zu tragen —
//
//   layoutBoxPageName      der Kapitelname in der Leiste, gefüllt aus `{{frontmatter.section}}`
//   layoutBoxHint          der Hinweis nur für schmale Bildschirme, eine `display`-Vorführung
//   layoutBoxCta           „Weiterlesen", und der Text zeigt auf die Example-Website
//   layoutBoxColophon      die Fußzeile mit Locale und Slug, eine {{Platzhalter}}-Vorführung
//   (ohne Schlüssel)       das `<style>`, das im Explorer den aktuellen Ordner markiert — ohne
//                          Explorer markiert es nichts
const BOXES_OUT = ['layoutBoxPageName', 'layoutBoxHint', 'layoutBoxCta', 'layoutBoxColophon']

// Die Fußzeilen-Links. Das Example nennt sechs: den Generator, die App, die eigene Website und drei
// Plugins derselben Hand. In einem fremden Projekt sind vier davon Werbung; was bleibt, sind die
// zwei Programme, ohne die die Website nicht existierte.
const FOOTER_LINKS = {
  Quartz: 'https://quartz.jzhao.xyz/',
  QuartzControl: 'https://boxi-os.github.io/QuartzControl/'
}

// Die Eigenschaften, die `note-properties` zeigt. Wie bei `doku`: Das Panel bleibt aus, der
// Transformer bleibt an — er ist zugleich der Frontmatter-Leser, und ohne ihn verliert jede Seite
// Titel, Beschreibung und Tags. Die dreizehn Demofelder des Example sind hier nichts als
// dreizehn Zeilen, die kein Leser je sieht.
const KEPT_PROPERTIES = ['description', 'tags', 'section']

/** Die Example-Patches mit dem, was eine leere Website nicht braucht. */
export function patches(base) {
  const next = { ...base }
  for (const name of OFF) {
    if (!next[name]) throw new Error(`basic.mjs: ${name} steht nicht in PLUGIN_PATCHES`)
    next[name] = { ...next[name], enabled: false }
  }
  if (!next['note-properties']) throw new Error('basic.mjs: note-properties steht nicht in PLUGIN_PATCHES')
  next['note-properties'] = {
    ...next['note-properties'],
    options: {
      ...next['note-properties'].options,
      includedProperties: KEPT_PROPERTIES,
      hidePropertiesView: true
    }
  }
  if (!next.footer) throw new Error('basic.mjs: footer steht nicht in PLUGIN_PATCHES')
  next.footer = { ...next.footer, options: { ...next.footer.options, links: FOOTER_LINKS } }
  return next
}

// Die Marke als Bild statt als Inline-SVG.
//
// Das Example schreibt die Zeichnung als SVG in den Konfigurationseintrag — dort kann sie nicht
// ankommen, ohne dass der Eintrag ankommt, der sie nennt, und das ist für eine Marke auf jeder
// Seite eine Fehlerquelle weniger. Die Basis-Vorlage geht den anderen Weg, und zwar mit Absicht:
// Ein Nutzer, der seine eigene Marke einsetzt, hat eine Bilddatei und kein SVG-Markup. Der Weg,
// den die Vorlage vorführt, soll der sein, den er gehen wird.
//
// Die zwei PNG entstehen aus derselben Quelle wie das Inline-SVG (`mark-png.mjs` aus
// `site-mark.mjs` aus `build/icon-source/quartzcontrol-icon.svg`) und reisen im Baustein `static`
// mit. Umgeschaltet wird über die Klassen `.img-light`/`.img-dark`, die das Plugin selbst per
// `display` bedient — es fragt nicht nach dem Elementtyp, also trägt es ein `<img>` wie ein
// `<svg>`.
//
// `alt=""` an beiden Bildern, und das ist kein Versehen: Der Link daneben trägt seinen
// zugänglichen Namen im `.site-mark-text` (sichtbar verborgen, plugin-layout-box.scss). Ein `alt`
// am Bild sagte denselben Namen ein zweites Mal.
const MARK_HTML =
  '<a class="site-mark" href="{{root}}/">' +
  '<img class="img-light" src="{{root}}/static/qc-mark-light.png" width="26" height="26" alt="">' +
  '<img class="img-dark" src="{{root}}/static/qc-mark-dark.png" width="26" height="26" alt="">' +
  '<span class="site-mark-text">{{siteTitle}}</span>' +
  '</a>'

/**
 * Zwei Kästen: die Marke im Kopf und eine Notiz in der linken Spalte.
 *
 * Die Notiz ist neu und nicht aus dem Example abgeleitet — dessen Seitenleisten-Kasten lädt einen
 * Markdown-Schnipsel aus `quartz/static/snippets/` und erklärt das Handbuch. Hier steht ein Satz
 * inline, der sagt, was der Kasten ist und wo man ihn ändert. Er trägt die Klasse des Example
 * (`layout-box-note`), also ist er ohne eine Zeile neuen CSS gestaltet.
 */
export function boxes(base) {
  const keys = base.map((box) => box.options?.frontmatterKey)
  for (const key of BOXES_OUT) {
    if (!keys.includes(key)) throw new Error(`basic.mjs: ${key} steht nicht in LAYOUT_BOXES`)
  }
  const mark = base.find((box) => box.options?.frontmatterKey === 'layoutBoxMark')
  if (!mark) throw new Error('basic.mjs: layoutBoxMark steht nicht in LAYOUT_BOXES')

  return [
    { ...mark, options: { ...mark.options, html: MARK_HTML } },
    {
      source: mark.source,
      name: mark.name,
      enabled: true,
      order: 510,
      options: {
        title: 'Über diese Website',
        html:
          '<p>Dieser Kasten steht auf jeder Seite in der linken Spalte. Was darin steht, änderst ' +
          'du in der Konfiguration unter <em>Plugins</em> — oder du schaltest ihn dort ab.</p>',
        collapsed: false,
        className: 'layout-box-note',
        frontmatterKey: 'layoutBoxNote',
        byLang: {
          en: {
            title: 'About this site',
            html:
              '<p>This box sits in the left column of every page. What it says is set under ' +
              '<em>Plugins</em> in the configuration — or you switch it off there.</p>'
          }
        }
      },
      // `desktop-only` wie im Example: Auf dem Telefon ist die linke Spalte eine Schublade, und
      // was dort erscheint, ist die Navigation. Ein Kasten in einer Schublade, die man öffnet, um
      // woanders hinzugehen, hält auf.
      layout: { position: 'left', priority: 40, display: 'desktop-only' }
    }
  ]
}

/**
 * Eine Navigationsinstanz: das Akkordeon in der linken Spalte, mit der Schublade auf dem Telefon.
 *
 * Der Pager des Example reist nicht mit, und das ist keine Sparsamkeit. Er beantwortet „was kommt
 * als Nächstes", und diese Frage hat nur eine Website mit einer Lesereihenfolge. Ein neues Projekt
 * hat noch keine; bekommt es eine, ist der Pager ein Eintrag in der Plugin-Liste — dieselbe
 * Bewegung wie beim Explorer, dessen Stylesheet ebenfalls schon dasteht.
 */
export function navigations(base) {
  const menu = base.find((entry) => entry.options?.id === 'menue')
  if (!menu) throw new Error('basic.mjs: die Instanz `menue` steht nicht in NAVIGATION_ENTRIES')
  return [menu]
}

/**
 * Zwei eigene Presets.
 *
 * Eigene IDs und nicht die des Example: Der Import vergleicht nach `id` (presets.mjs sagt, warum),
 * und ein Projekt, das beide Vorlagen anwendet, hätte sonst zwei Presets mit einem Namen und vier
 * mit zwei. Die Werte sind dieselben — es sind zwei Ausgangspunkte für jemanden, der diese
 * Gestaltung *verlassen* will, und das ist für beide Pakete dieselbe Tür.
 */
export function presets(base) {
  return base.map((preset) => ({
    ...preset,
    id: preset.id.replace(/^tpl-minimal-lesbar-/, 'tpl-basis-'),
    name: preset.name.replace(/^Example/, 'Basis')
  }))
}
