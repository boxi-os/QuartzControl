// Die Stammdaten der Vorlagenvarianten - eine Zeile je Variante statt eines Schalters, der an
// neun Stellen ausgelesen wird.
//
// Bis zum 2026-09-20 gab es dafür `isDoku = VARIANT !== 'example'` im Bauskript. Das trug zwei
// verschiedene Lasten zugleich: die *Stammdaten* einer Variante (wo ihre Werkstatt liegt, wie ihr
// Paket heißt, ob ihr Inhalt mitreist) und ihre *Gestaltungsentscheidungen* (welche Komponenten
// aus welchem Grund fehlen). Die zweite steht weiter als Aufsatz daneben (`doku.mjs`) - sie ist
// zur Hälfte Begründung und verliert sich in einer Tabelle. Die erste ist eine Tabelle und steht
// hier.
//
// Der Anlass war die vierte Variante. Ein Zwei-Wege-Schalter beantwortet für sie jede Frage
// falsch: `basic` ist nicht `example` (eigene Werkstatt, eigener Inhalt, eigene Boxen) und nicht
// `doku` (ihr Inhalt reist mit, und sie ist das eingebaute Paket der App). Jede der vier Fragen
// hätte ein eigenes Ternär gebraucht.
//
// Jedes Feld hier beantwortet genau eine Frage, die das Bauskript stellt. Wer eine fünfte Variante
// anlegt, beantwortet sie alle - und merkt beim Ausfüllen, welche er noch nicht bedacht hat.
import * as os from 'node:os'
import * as path from 'node:path'

import { projectPath, workshopPath } from '../project-paths.mjs'
import * as basic from './basic.mjs'
import * as doku from './doku.mjs'
import { LAYOUT_BOX_SOURCE, MULTILANGUAGE_SOURCE, NAVIGATIONS_SOURCE } from './plugins.mjs'

// Der Vault des Beispielprojekts. Er steht hier und nicht in `project-paths.mjs`, aus dem Grund,
// den diese Datei selbst nennt: ein Vault ist die Quelle eines Projekts, nicht seine Kopie, und
// beide ziehen unabhängig um.
const EXAMPLE_VAULT = path.join(os.homedir(), 'Obsidian/QuartzProjekte/Example')

// Die github:-Plugins, die eine Variante über `quartz plugin add` bekommt. Paarweise, weil das
// Skript nach dem Verzeichnis unter `.quartz/plugins/<name>` prüft, ob es schon da ist.
const LAYOUT_BOX = ['quartz-layout-box', LAYOUT_BOX_SOURCE]
const MULTILANGUAGE = ['quartz-multilanguage', MULTILANGUAGE_SOURCE]
const NAVIGATIONS = ['quartz-navigations', NAVIGATIONS_SOURCE]

/**
 * Eine Variante. Die Felder, in der Reihenfolge, in der das Bauskript sie braucht:
 *
 *   name          Anzeigename im Paket - was der Anlege-Assistent zeigt.
 *   file          Dateiname des .qtpl, neben den Projekten.
 *   workshop      Das Projekt, in dem gebaut wird.
 *   control       Das Wegwerf-Projekt der Gegenprobe (Phase 11).
 *   content       Woher `content/` kommt und ob es im Paket mitreist:
 *                   { mode: 'vault', vault, ships }          - Symlink auf einen Obsidian-Vault
 *                   { mode: 'copy',  from, static?, ships }  - echte Ordner, aus diesem Repo
 *                 `from` und `static` sind Pfade unter scripts/example-template/ und stehen
 *                 ausgeschrieben da: Ein aus `from` abgeleiteter zweiter Name („basic-content" ->
 *                 „basic-site") wäre eine Kopplung, die niemand sieht, bis einer der zwei umzieht.
 *   plugins       Die github:-Plugins, die Phase 2 installiert.
 *   stylesSource  Ob `--sync`/`--check-sync` für diese Variante etwas beweisen (siehe unten).
 *   builtin       Ob dieses Paket das eingebaute der App ist - dann liegt eine Kopie unter
 *                 `resources/templates/`, und `checkPackageCopies()` vergleicht sie mit dem Export.
 *   published     Ob das Paket in boxi-os/quartzcontrol-templates liegt - dann vergleicht
 *                 `checkPackageCopies()` auch diese Kopie. Seit dem 35. Review (Befund 8): Vorher
 *                 hing der ganze Vergleich an `builtin`, und `qc-example.qtpl` verglich niemand,
 *                 obwohl es seit `201eb0d` dort liegt.
 *   derive        Wie die Example-Daten zu denen dieser Variante werden. Bekommt
 *                 { patches, boxes, navigations } und gibt dieselbe Form zurück.
 *   describe      Der Beschreibungstext des Pakets, gegen die wirklichen Zahlen gebildet.
 *
 * `stylesSource` ist keine Vorliebe, sondern eine Aussage über den Beweiswert. Die 31 Stylesheets
 * werden in *einer* Werkstatt bearbeitet - der des Example - und von dort mit `--sync` ins Repo
 * zurückgeholt. Für jede andere Variante ist die Werkstatt eine frisch beschriebene Kopie des
 * Repos, ein Vergleich sagt also immer „deckungsgleich". Das ist keine Auskunft, sondern eine
 * Tautologie, die sich als Auskunft liest.
 *
 * Ob `--fresh` eine Werkstatt löschen darf, steht **nicht** hier. Bis zum 35. Review tat es das
 * (`allowFresh`), und es bewachte eine von zwei Löschstellen in `bootstrap()`; die Antwort hängt
 * jetzt am Pfad (`removeDisposable()` in build-example-template.mjs): Gelöscht wird nur unter
 * `werkstatt/`. Damit ist das Example-Projekt geschützt, weil es woanders liegt, und seine
 * Gegenprobe darf frisch werden, weil sie dort liegt - beides ohne ein Feld, das jemand beim
 * Anlegen einer fünften Variante richtig abschreiben müsste.
 */
export const VARIANTS = {
  example: {
    name: 'Example',
    // Hieß bis zum 2026-09-20 `minimal-lesbar.qtpl` - ein Name aus der Zeit, als dieses Paket das
    // eingebaute der App war und „Minimal und lesbar" hieß. Der Anzeigename wurde am 2026-09-06
    // zu „Example", der Dateiname blieb, weil ihn `builtinTemplateService.ts` und das Repo
    // `quartzcontrol-templates` nannten. Beides zeigt jetzt auf `qc-basic.qtpl`, also kann er
    // sagen, was er ist. Die alte Datei bleibt im veröffentlichten Repo liegen: Jede
    // ausgelieferte App-Fassung vor dieser Änderung fragt genau diese Adresse.
    file: 'qc-example.qtpl',
    // Das Beispielprojekt selbst - dort wird gearbeitet, und `--sync` holt von dort zurück (bis
    // zum 2026-09-04 hieß es `quartz-vorlage-werkstatt`, siehe d80f2be).
    workshop: () => projectPath('Example'),
    control: () => workshopPath('quartz-vorlage-gegenprobe'),
    content: { mode: 'vault', vault: EXAMPLE_VAULT, ships: true },
    plugins: [LAYOUT_BOX, MULTILANGUAGE, NAVIGATIONS],
    stylesSource: true,
    builtin: false,
    published: true,
    derive: (data) => data,
    describe: ({ frames, explorerOn }) =>
      `Eine vollständige Beispielvorlage: ein Handbuch in sieben Kapiteln, zweisprachig, mit ` +
      `gemessenen Kontrasten (WCAG AA in hell und dunkel), ${frames} eigenen Frames, selbst ` +
      `gehosteten Schriften und jeder Plugin-Komponente einzeln gestaltet — ` +
      (explorerOn
        ? 'Explorer und Inhaltsverzeichnis bis zur untersten Ebene.'
        : 'die Navigation und das Inhaltsverzeichnis bis zur untersten Ebene, und auch der ' +
          'Explorer, der hier abgeschaltet ist.')
  },

  // Das eingebaute Paket der App seit dem 2026-09-20: Wer ein Projekt anlegt und „Vorlage
  // anwenden" ankreuzt, bekommt dieses. Vorher war es das Example - ein Handbuch in sieben
  // Kapiteln mit 301 Inhaltsdateien, also entweder ein fremdes Handbuch im eigenen Projekt oder
  // eine Vorführung ohne Text. Was die Basis davon trennt und warum, steht in basic.mjs.
  basic: {
    name: 'Basis-Template',
    file: 'qc-basic.qtpl',
    workshop: () => workshopPath('basic-vorlage'),
    control: () => workshopPath('basic-gegenprobe'),
    // Der einzige Eintrag mit `mode: 'copy'`: Sein Inhalt liegt als zwanzig Notizen im Repo
    // (basic-content/README.md sagt, warum) und wird als echtes Verzeichnis in die Werkstatt
    // kopiert statt als Symlink in einen Vault gelegt. Und er reist mit — er ist der Grund, warum
    // der Assistent ein Häkchen „Mit den Beispielseiten" anbietet.
    content: { mode: 'copy', from: 'basic-content', static: 'basic-site/static', ships: true },
    plugins: [LAYOUT_BOX, MULTILANGUAGE, NAVIGATIONS],
    stylesSource: false,
    builtin: true,
    published: true,
    derive: (data) => ({
      patches: basic.patches(data.patches),
      boxes: basic.boxes(data.boxes),
      navigations: basic.navigations(data.navigations),
      presets: basic.presets(data.presets)
    }),
    describe: ({ frames, pages, styles }) =>
      `Die Grundlage für ein neues Projekt: gemessene Kontraste (WCAG AA in hell und dunkel), ` +
      `${frames} eigene Frames, ${styles} Stylesheets — jede Plugin-Komponente ist gestaltet, auch ` +
      `die, die hier ausgeschaltet sind. Dazu ${pages} Beispielseiten in zwei Sprachen, die zeigen, ` +
      'wie die Website aussieht, und die gelöscht werden, sobald eigene Notizen da sind.'
  },

  // „Doku" ist nirgends veröffentlicht und steht nicht im Assistenten: sie existiert für die
  // Website der App und die Handbücher der Plugins. Ihr Name ist trotzdem ordentlich gesetzt, weil
  // er das ist, was der Import-Dialog dieser drei Projekte zeigt.
  doku: {
    name: 'Doku',
    file: 'doku.qtpl',
    workshop: () => workshopPath('doku-vorlage'),
    control: () => workshopPath('doku-gegenprobe'),
    // Derselbe Vault wie beim Example. Das Projekt der Variante ist eine Werkstatt, keine Website -
    // ihr Inhalt ist nur da, damit Phase 9 etwas zu bauen hat, und reist nie mit.
    content: { mode: 'vault', vault: EXAMPLE_VAULT, ships: false },
    // Mit quartz-navigations, wie Example und Basis: das Akkordeon links (am Telefon die
    // Schublade) und „Zurück“/„Weiter“ unter dem Text, denn ein Handbuch wird der Reihe nach
    // gelesen. Bis zum 2026-09-21 stand hier das Gegenteil, als Sicherung: Der Baustein `plugins`
    // schlüsselt gleichnamige Einträge nach ihrer Position (parts.ts, instanceKeys), und ein Import
    // in das Navigations-Handbuch überschriebe zwei seiner fünf Instanzen. Die Sicherung ist jetzt
    // eine Regel in docs/release.md: Das Navigations-Handbuch bekommt diese Pakete nur ohne den
    // Baustein „Plugins“. Ohne sie navigierten die übrigen drei Websites mit dem Explorer - und als
    // das Example ihn abschaltete, mit gar nichts mehr.
    plugins: [LAYOUT_BOX, MULTILANGUAGE, NAVIGATIONS],
    stylesSource: false,
    builtin: false,
    published: false,
    derive: (data) => ({
      ...data,
      patches: doku.patches(data.patches, 'doku'),
      boxes: doku.boxes(data.boxes),
      navigations: data.navigations
    }),
    describe: ({ frames }) => dokuDescription(frames, '')
  },

  plugin: {
    name: 'Doku (Plugin)',
    file: 'plugin.qtpl',
    workshop: () => workshopPath('plugin-vorlage'),
    control: () => workshopPath('plugin-gegenprobe'),
    content: { mode: 'vault', vault: EXAMPLE_VAULT, ships: false },
    // Mit quartz-navigations wie `doku`. Das Navigations-Handbuch wendet genau diese Variante an,
    // aber ohne den Baustein „Plugins“ (docs/release.md) - seine fünf eigenen Instanzen sind die
    // Vorführung des Plugins.
    plugins: [LAYOUT_BOX, MULTILANGUAGE, NAVIGATIONS],
    stylesSource: false,
    builtin: false,
    published: false,
    derive: (data) => ({
      ...data,
      patches: doku.patches(data.patches, 'plugin'),
      boxes: doku.boxes(data.boxes),
      navigations: data.navigations
    }),
    describe: ({ frames }) =>
      dokuDescription(frames, ' Ohne Graphansicht, für Anleitungen, die sich der Reihe nach lesen.')
  }
}

// Was die Doku-Fassungen trennt, steht in einem Satz statt in einer zweiten Beschreibung.
function dokuDescription(frames, note) {
  return (
    `Die Doku-Fassung der Beispielvorlage: dieselbe Gestaltung — gemessene Kontraste (WCAG AA in ` +
    `hell und dunkel), ${frames} eigene Frames, selbst gehostete Schriften —, aber ohne die ` +
    `Bausteine, die im Example nur etwas vorführen. Für Anleitungen gedacht, nicht für eine ` +
    'Vorführung.' +
    note
  )
}

export const VARIANT_NAMES = Object.keys(VARIANTS)

/**
 * Die Variante unter diesem Namen, mit den Pfaden schon aufgelöst. Wirft bei einem unbekannten
 * Namen, statt auf `example` zurückzufallen: ein Tippfehler in `--variant` hätte sonst in die
 * Werkstatt geschrieben, die das echte Beispielprojekt ist.
 */
export function resolve(name) {
  const variant = VARIANTS[name]
  if (!variant) throw new Error(`unbekannte Variante: ${name} (${VARIANT_NAMES.join(', ')})`)
  return { ...variant, id: name, workshop: variant.workshop(), control: variant.control() }
}
