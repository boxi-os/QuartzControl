# Minimal & lesbar — die Beispielvorlage

Eine vollständige QuartzControl-Vorlage: alle zehn Bausteine gefüllt, jede Plugin-Komponente
einzeln gestaltet, jeder Farbkontrast gemessen. Sie ist zum Benutzen gedacht **und** zum Umbauen —
dieses Dokument beschreibt beides.

    npm run template:example                 # alles: aufbauen, prüfen, exportieren, gegenprüfen
    npm run template:example -- --only 5     # nur die Stylesheets neu einspielen
    npm run template:example -- --check-contrast   # nur messen, ohne App und ohne Projekt
    npm run template:example -- --sync             # Stylesheets aus dem Projekt zurückholen

---

## 0. Wo der Inhalt lebt

Seit dem Umbau ist **das Projekt die Quelle**, nicht mehr dieses Verzeichnis:

```
~/Obsidian/QuartzProjekte/Example/     der Vault — 252 Notizen, 6 Bases, 2 Canvas, 2 Zeichnungen, 9 Mediendateien
        ↑ Symlink
~/Documents/Example/content/            das Projekt
~/Documents/Example/quartz/styles/      die Stylesheets — hier wird gearbeitet
```

| Was | Quelle | Versioniert in |
| --- | --- | --- |
| Notizen, Bases, Canvas, Excalidraw | Vault | eigenes git im Vault, seit 2026-09-05 gepusht nach `boxi-os/Quartz-Example-Vault` (privat) |
| Stylesheets | Projekt | git im Projekt **und** hier — abgeglichen mit `--sync` |
| Config, Frames, Presets, Breakpoints | dieses Verzeichnis | Quartz-GUI-Repo; ins Projekt gespielt mit `--only 4` bzw. `--only 3` |
| Messung, Bootstrap | dieses Verzeichnis | Quartz-GUI-Repo |

Die zweite Zeile ist die einzige, die in beide Richtungen läuft, und sie ist deshalb die einzige,
die driften kann. Genau das ist am 2026-09-05 passiert: `plugin-layout-box.scss` wurde im Projekt
geändert, und die Kopie hier blieb einen Tag lang stehen, ohne dass etwas es gesagt hätte. `--sync`
holt sie zurück und meldet, was sich unterschieden hat; die Prüfung dabei ist dieselbe wie in
Phase 5, nur andersherum. Für Config und Frames gibt es bewusst keinen Rückweg — sie entstehen aus
`plugins.mjs`, `variables.mjs`, `layout.mjs` und `frames.mjs`, und ein Rückleser wäre eine zweite,
inverse Umsetzung von allen vieren.

> **Ein Content-Symlink nimmt die Notizen aus QuartzControls Obhut.** Git folgt keinen Symlinks,
> deshalb erzwingt der Snapshot-Dienst `includeContent: false`, sobald `content/` ein Link ist.
> Keine Snapshots, kein Restore, kein Vergleich — der Vault ist über sein eigenes git gesichert.

## 1. Wo was liegt

| Datei | Was darin entschieden wird |
| --- | --- |
| `palette.mjs` | Die neun Quartz-Farben für hell und dunkel, die drei Schriftrollen — **und die WCAG-Messung**, die sie prüft |
| `variables.mjs` | 50 CSS-Variablen: Abstände, Radien, Schriftgrößen, Lesemaß, Fokus, Zielgrößen |
| `fonts.mjs` | Welche Schriften geladen werden, woher, und die korrigierten `@font-face`-Regeln |
| `frames.mjs` | Die vier Seitenraster (`editorial`, `index`, `focus`, `drawing`) für je drei Breakpoints |
| `layout.mjs` | Welcher Seitentyp welches Raster nutzt, und die zwei Flex-Gruppen des Kopfbereichs |
| `plugins.mjs` | Welches Plugin an, wo es sitzt, mit welchen Optionen — und die fünf Layout-Box-Instanzen |
| `translations.mjs` | Geänderte Formulierungen in Quartz' deutscher Sprachdatei |
| `presets.mjs` | Zwei gespeicherte Theme-Zusammenstellungen |
| `style-order.mjs` | Die Ladereihenfolge der Stylesheets — Liste **und** Reihenfolge in einem |
| `styles/*.scss` | 30 Stylesheets, eines je Komponente — die Kopie des Projekts, gepflegt über `--sync` |
| `site/content/**` | der ursprüngliche Beispielinhalt — **überholt**, gepflegt wird im Vault |
| `site/snippets/` | Die zwei Snippet-Dateien, die nicht im Paket mitreisen (deutsch und englisch) |
| *(im Vault)* `assets/` | Dummy-Medien: PNG, JPEG, WebP, GIF, SVG, ein dreiseitiges PDF, eine WAV-Datei |
| `covers.mjs` | Der Generator der vierzehn Galerie-Titelbilder — schreibt nach `<vault>/assets/covers/` |
| `BEFUNDE.md` | Was beim Bauen an der App auffiel |

Der Treiber ist `../build-example-template.mjs`. Er startet die **gebaute App** über Playwright und
schreibt alles über `window.quartzGui.*` — also durch dieselben IPC-Pfade wie ein Klick in der
Oberfläche. Deshalb gibt es hier keinen zweiten Frame-Codegen und keinen zweiten SCSS-Writer, die
irgendwann auseinanderlaufen könnten.

---

## 2. Der Arbeitsablauf beim Anpassen

Jede Phase ist einzeln aufrufbar und wiederholbar. Für eine Änderung reichen fast immer zwei
Schritte:

    node scripts/build-example-template.mjs --only 5      # Änderung ins Projekt schreiben
    cd ~/Documents/quartz-vorlage-werkstatt && npx quartz build --serve

| Phase | Name | Wann sie nötig ist |
| --- | --- | --- |
| 0 | `bootstrap` | einmalig — klont Quartz, installiert, legt das Projekt an |
| 1 | `content` | stellt den **Symlink** auf den Vault her, wenn er fehlt — kopiert nichts mehr |
| 2 | `plugin` | einmalig — installiert `quartz-layout-box` |
| 3 | `frames` | `frames.mjs` geändert |
| 4 | `config` | `palette.mjs`, `plugins.mjs` oder `layout.mjs` geändert |
| 5 | `styles` | **irgendein Stylesheet geändert** — der häufigste Fall |
| 6 | `fonts` | `fonts.mjs` geändert |
| 7 | `variables` | `variables.mjs` geändert |
| 8 | `texts` | `translations.mjs` oder `presets.mjs` geändert |
| 9 | `check` | prüft SCSS und zählt die Bausteine |
| 10 | `export` | schreibt die `.qtpl` |
| 11 | `verify` | importiert sie in ein zweites Projekt und baut es |

> **Eine Reihenfolge ist bindend:** Phase 3 (Frames) muss vor Phase 4 (Konfiguration) laufen. Die
> Frames tragen sich über die Quartz-CLI selbst in `quartz.config.yaml` ein, und Phase 4 schreibt
> die Datei aus einer eingelesenen Kopie zurück.

---

## 3. Die sieben Stellschrauben

### 3.1 Farben — `palette.mjs`

Neun Rollen je Modus. **Zwei davon lesen sich verkehrt herum:** `light` ist der *Hintergrund* und
`dark` der *Text* — auch im dunklen Modus, wo `light` fast schwarz ist.

| Rolle | Wofür |
| --- | --- |
| `light` | Seitengrund |
| `lightgray` | Trennlinien, Flächen von Karten und Codeblöcken |
| `gray` | Sekundärtext — **und die Quelle, aus der jeder Rand eines Bedienelements gemischt wird** |
| `darkgray` | Fließtext |
| `dark` | Überschriften |
| `secondary` | Links, der eine Akzent — ein tiefes Navy |
| `tertiary` | Link-Hover und aktive Navigation — ein warmes Sienna |
| `highlight` | getönte Fläche (mit Alpha) |
| `textHighlight` | `==Hervorhebung==` (mit Alpha) |

Nach jeder Änderung:

    npm run template:example -- --check-contrast

Das prüft **89 Paare** — jede Text-auf-Grund-Kombination in beiden Modi, die Alpha-Farben über den
Grund gerechnet, alle zwölf Callout-Farben gegen den Grund *und* gegen ihre eigene getönte Fläche,
die fünf korrigierten Farben des Syntax-Themas gegen die Fläche des Codeblocks und den
Misch-Ton `--tpl-rule-control`, aus dem jedes Bedienelement seinen Rand zieht. Unter der
Schwelle bricht der Lauf ab.

Die vier Teile lesen aus vier Dateien — `palette.mjs`, `styles/body-callouts.scss`,
`styles/body-code.scss`, `styles/base.scss` — und immer aus dem, was ausgeliefert wird, nie aus
einer zweiten Liste.

> **Warum `lightgray` nicht 3:1 erreichen muss:** Es ist Trennlinie *und* Fläche zugleich. WCAG
> 1.4.11 verlangt 3:1 von *Bedienelementen*, nicht von einer Zierlinie. Die Pflicht verschwindet
> dadurch nicht, sie wandert: alles, was man bedient, zieht seinen Rand aus `--tpl-rule-control`.
> Wer eine neue Komponente baut, hält sich daran — sonst ist die Messung eine Lüge.

> **Und warum das nicht mehr `gray` selbst ist:** `gray` misst 6,41:1 hell und 7,10:1 dunkel, also
> mehr als das Doppelte dessen, was 1.4.11 verlangt — und es sah danach aus: eine Reihe harter,
> fast schwarzer Rechtecke über jeder Seite. `--tpl-rule-control` (in `styles/base.scss`, weil eine
> Variablen-Überschreibung kein Komma tragen darf und `color-mix()` aus nichts anderem besteht)
> mischt 70 % `gray` in den Grund und landet bei 3,24:1 hell und 4,11:1 dunkel. Gezeichnet wird er
> **gepunktet**: Bei 1 px trägt eine gepunktete Kante etwa die halbe Farbmenge einer durchgezogenen
> auf, und ein Bedienelement liest sich damit als Feld statt als Kasten. Panels, die wirklich über
> der Seite schweben — die Suche, das Sprachmenü, der Graph — bleiben durchgezogen; eine gepunktete
> Haarlinie um eine 600 px breite Fläche mit Schatten wirkt unfertig, nicht leicht.

> **Warum `tertiary` eine andere Farbe ist und nicht eine dunklere:** Es markiert, was gerade
> angefasst oder gerade aktiv ist. Als Helligkeitsstufe von `secondary` sieht man dem Ergebnis nicht
> an, welche der beiden Rollen greift; als eigener Farbton schon.

**Callout-Farben** stehen nicht hier, sondern in `styles/body-callouts.scss`, je Modus einmal. Die
Prüfung liest sie aus der Datei, damit sie nie an einer veralteten Kopie misst. Quartz' eigene
Farben scheitern übrigens zu elf Zwölfteln im hellen Modus — deshalb sind sie neu gesetzt.

### 3.2 Maße, Formen, Rhythmus — `variables.mjs`

50 Variablen, in drei Gruppen:

1. **Schriftstapel** (`--bodyFont` …) — die Familie plus ein echter Fallback.
2. **Quartz-Variablen, wo die Vorlage widerspricht** — etwa `--background-modifier-border`, das von
   `lightgray` auf `gray` wandert (siehe die Kontrastregel oben). Diese werden von *Quartz* gelesen,
   nicht von unseren Stylesheets; sie sehen deshalb ungenutzt aus und sind es nicht.
3. **Eigene `--tpl-*`-Tokens** — das eigentliche Designsystem.

Die wirkungsvollsten Einzelwerte:

| Token | Wirkung, wenn man ihn ändert |
| --- | --- |
| `--tpl-space-md` | Der Grundabstand; alle anderen Abstände sind daran orientiert |
| `--tpl-radius-md` | Ecken von Karten, Codeblöcken, Callouts |
| `--tpl-target` | Mindestgröße aller Bedienelemente (44px) — einmal ändern, überall wirksam |
| `--tpl-indent` | Eine Ebene Einrückung in Explorer *und* Inhaltsverzeichnis |
| `--tpl-accent-bar` | Breite jedes Akzentbalkens (aktive Zeile, Zitat, Callout-Kante) |
| `--tpl-motion` | Jede Übergangsdauer; `prefers-reduced-motion` setzt sie an einer Stelle auf 0 |
| `--tpl-leading-snug` | Der Zeilenabstand aller Kleinschrift (Leisten, Fußzeile, Layout-Box). Der Fließtext hat seinen eigenen |
| `--tpl-icon-sm` | Die Ordner-, Datei- und Chevron-Symbole im Baum |
| `--tpl-fade` | Wie weit eine rollende Leiste an ihren Enden ausblendet |
| `--tpl-drawer-width` | Die Breite der mobilen Navigationsschublade |

Die Zeilenlänge steht **nicht** mehr dabei: Sie ist jetzt eine Frage des Rasters (siehe 3.5) und
hat keinen eigenen Token mehr.

**Kein Stylesheet enthält eine Farbe oder eine Länge als Zahl.** Alles liest Tokens — deshalb lässt
sich die Vorlage nach dem Import in der App unter *Stile → Variablen* weiterdrehen, ohne SCSS
anzufassen. Wer eine Regel ergänzt, hält sich daran, sonst bröckelt genau diese Eigenschaft.

### 3.3 Schriften — `fonts.mjs`

Drei Familien, vier Dateien (Inter zusätzlich kursiv), alle OFL, alle selbst gehostet, nur der
Latin-Ausschnitt. Zum Tauschen: Eintrag ändern (Name, Dateiname, Google-CSS-URL, Gewichtsbereich),
dann `--only 6`. Die Datei wird geladen, im Ordner `.fonts/` zwischengespeichert und über
`fonts.importFile` ins Projekt gelegt.

> **Warum die `@font-face`-Regeln danach überschrieben werden:** `importFontFile` schreibt weder
> `font-weight` noch `font-style`. Bei einer Variable Font heißt das, dass der Browser sie als 400
> behandelt und jeden fetten Schnitt selbst verzerrt; bei zwei Schnitten derselben Familie
> verdrängt der zweite den ersten. `fontFaceCss()` erzeugt deshalb die korrekten Regeln, und Phase
> 6 ersetzt damit den erzeugten Block.

Wer stattdessen Google-Fonts nutzen will: in `plugins.mjs` `quartz-fonts` wieder einschalten und in
Phase 4 `fontOrigin` auf `googleFonts` setzen. Dann sind Phase 6 und der Baustein *Schriftdateien*
überflüssig.

### 3.4 Eine Komponente umgestalten — `styles/*.scss`

Eine Datei je Komponente. Die Namen sagen, wozu sie gehören:

    base            Typografie, Lesemaß, Fokus, Bewegung
    nav-*           Kopfzeile, Werkzeugleiste, Suche, Farbschema, Lesemodus, Explorer
    meta-*          Brotkrumen, Titel, Datum, Eigenschaften, Tags
    aside-*         Inhaltsverzeichnis, Rückverweise, Graph, zuletzt geändert
    body-*          Fließtext, Callouts, Code, Mathematik, Diagramme, Medien
    page-*          Ordner- und Tag-Listen, Vorschau, Suchergebnisse, 404
    plugin-*        quartz-layout-box in allen fünf Ausprägungen
    site-*          Fußzeile, Kommentare
    a11y            Zielgrößen, Systemeinstellungen, Druck

**Neue Datei anlegen:** Datei in `styles/` ablegen **und** den Namen in `style-order.mjs`
eintragen. Fehlt einer von beiden, bricht Phase 5 mit einer Meldung ab — absichtlich, denn eine
Datei, die nie geladen wird, ist schwer zu bemerken.

> **Der Dateiname darf nicht mit einer Ziffer beginnen.** `01-typografie.scss` wird zu
> `@use "./custom/01-typografie"`, und Sass leitet daraus einen Namensraum ab, der mit einer Ziffer
> unzulässig ist — danach übersetzt *kein* CSS des Projekts mehr. Die Ladereihenfolge steht deshalb
> in `style-order.mjs` und nicht in Zahlenpräfixen.

### 3.5 Seitenraster — `frames.mjs`

Vier Frames, je drei Breakpoints, jede Fläche vollständig platziert.

Alle vier teilen sich am Desktop **ein Raster: zwölf Spalten, 4 rem Rinne, 20 px Rand, gedeckelt
auf 1440 px** — und die beiden Randspalten sind **fest 300 px breit** statt ein Anteil vom Rest.

Das ist die eine Sache, die ein reines `1fr`-Raster nicht ausdrücken kann: Wird die Rinne breiter,
werden die Seitenspalten schmaler, weil die elf Rinnen aus denselben 1400 px kommen. Gemessen: Der
Wechsel von 2 rem auf 4 rem hat die Randspalten von 326 px auf 302 px gebracht, ohne dass jemand
das wollte.

Eine feste Breite über drei Spuren ist keine Drittelung: Zwischen drei Spuren liegen zwei Rinnen,
also ist die Spur `(300 − 2 × Rinne) / 3`. Genau das steht in `frames.mjs` als `calc()`, damit die
Rechnung der Rinne folgt statt eine zweite Kopie von ihr zu sein.

| Block | Spalten | Breite | Spurbreite |
| --- | --- | --- | --- |
| Navigation (`left`) | 1–3 | 300 px | `calc((300px - 8rem) / 3)` = 57,33 px |
| Text (`beforeBody`/`pageBody`/`afterBody`) | 4–9 | 672 px | `1fr` |
| Apparat (`right`) | 10–12 | 300 px | `calc((300px - 8rem) / 3)` |

**So stellt man das in der App ein:** *Layout → Eigene Frames →* Frame wählen → Breakpoint-Reiter →
Feld **„Spaltenbreiten (leer = 1fr)"**. Dort steht ein Eingabefeld je Spur; leer heißt `1fr`. Für
einen Block über mehrere Spuren trägt man in jede seiner Spuren denselben `calc()`-Ausdruck ein.
Ein Wert darf **kein Komma** enthalten (`schemas.ts`), `calc()`, `min()` und `max()` ohne Komma
gehen also, `minmax(0, 1fr)` nicht.

672 px sind bei 1 rem rund 70 Zeichen — deshalb deckelt kein Stylesheet mehr die Zeilenlänge
(`styles/base.scss` sagt das an der Stelle, wo die Regel früher stand). Wer den Text breiter will,
ändert die 300 px hier, nicht eine `max-width` an einem Absatz.

**Am Tablet sind nur die linken drei Spuren fest.** Dort ist die rechte Spalte keine Spalte mehr —
sie sitzt unter dem Text, und die Spuren 10–12 gehören zum Fließtext. Eine feste Spur ist nicht
stauchbar, also hebt jede von ihnen die Mindestbreite des Rasters: mit sechs festen Spuren kam das
Raster nicht unter 6 × 68 + 11 × 48 + 40 = 976 px, und **jede** Seite scrollte in einem 900-px-Fenster
92 px seitwärts (gemessen über alle 32 Seiten des Durchgangs, in beiden Farbschemata).

**Warum die Rinne nicht überall 4 rem ist.** Elf Rinnen sind die Mindestbreite eines
Zwölf-Spalten-Rasters, egal was darin steht, und sie lassen sich nicht stauchen:

| Breakpoint | Schlimmster Fall | Rechnung | Rinne höchstens |
| --- | --- | --- | --- |
| Desktop | — | passt bei 1440 px mühelos | **4 rem** (gewählt) |
| Tablet | 801 px | 15 px Rollleiste + 40 px Rand → 746; linke Spalte 300 inkl. zwei Rinnen, also 9 × Rinne + 300 ≤ 746 | 49,5 px → **3 rem** |
| Mobil | 390 px | 11 × Rinne + 40 ≤ 375 | 30 px → **1 rem** |

Bei 4 rem am Tablet stünde das Raster in einem 900-px-Fenster auf 916 px. Sichtbar ist die
Spaltenrinne mobil ohnehin nicht — dort spannt jeder Bereich über alle zwölf Spalten, es arbeitet
nur die Zeilenrinne, und die ist überall 2 rem. Einheitlich ist dafür, dass **alle vier Frames
dieselben drei Werte** benutzen; vorher hatte nur `editorial` die 4 rem.

| Frame | Verwendet von | Unterschied |
| --- | --- | --- |
| `editorial` | Inhaltsseiten | alle sieben Bereiche belegt |
| `index` | Ordner, Tags, Bases | rechte Spalte reserviert, aber leer |
| `focus` | 404 | beide Randspalten leer, kein `beforeBody`/`afterBody` |
| `drawing` | Canvas, Excalidraw | keine Randspalten; Kopf, Titel, Zeichnung, Fußzeile untereinander |

Der `drawing`-Frame ist am 2026-09-06 dazugekommen, weil die beiden Zeichnungs-Seitentypen sonst
den Frame ihres eigenen Plugins bekommen — und beide damit unbrauchbar waren (BEFUNDE 48).
Die Höhe der Zeichnung ist keine Rasterfrage und steht in `styles/page-canvas.scss`.

Dass die rechte Spalte auch dort steht, wo nichts darin ist, ist die eigentliche Entscheidung: Der
Text beginnt damit auf jeder Seite an derselben Stelle.

Am Tablet fällt die rechte **Spalte** weg und ihr Inhalt rutscht unter den Text — nicht weg. Mobil
steht alles untereinander.

Die Breakpoints (1100 / 800 px) stehen ebenfalls dort und gelten projektweit. Die 800 sind
abgeschrieben, nicht gewählt: Das Explorer-Plugin hat `max-width: 800px` in seinem eigenen
Stylesheet stehen. Bei den früheren 720 gab es ein 80-px-Band, in dem der Explorer schon eine
Schublade war, während der Frame die Seite noch als Tablet auslegte — mit dem sichtbaren Ergebnis,
dass `.desktop-only`-Komponenten dort noch standen und `.mobile-only` fehlten.

> **Zwei Regeln aus dem Schema:** Ein Wert darf **kein Komma** enthalten — also kein
> `minmax(0, 1fr)` und kein `var(--x, fallback)`. Und Längen stehen hier absichtlich als Zahl statt
> als Token: ein Frame muss auch dann funktionieren, wenn jemand nur den Baustein *Frames*
> importiert. Wer eine Fläche ausblendet, nutzt `hidden: true` statt sie wegzulassen — das erhält
> ihre Platzierung auf den anderen Breakpoints.

### 3.6 Was wo erscheint — `plugins.mjs` und `layout.mjs`

`plugins.mjs` enthält **Änderungen** an der Plugin-Liste, keine Kopie davon: je Plugin nur, was die
Vorlage entscheidet (an/aus, Optionen, Position, Priorität). Innerhalb einer Position sortiert
Quartz nach aufsteigender `priority`; die Werte gehen in Zehnerschritten, damit dazwischen Platz
bleibt.

`layout.mjs` bestimmt, welcher Seitentyp welchen Frame nutzt, und definiert die **zwei Flex-Gruppen
des Kopfbereichs**:

| Gruppe | Mitglieder | Warum |
| --- | --- | --- |
| `brand` | Layout-Box `layoutBoxMark`, `page-title` | Marke und Seitenname sind *eine* Wortmarke. `nowrap`, der Name kürzt statt umzubrechen |
| `toolbar` | Suche, Farbschema, Lesemodus, Sprachumschalter | Vier Bedienelemente in einer Reihe am rechten Ende |

Damit hat der Kopf genau zwei Kinder, und seine ganze Anordnung ist `justify-content:
space-between` — ohne Rand-Trick und ohne Annahme darüber, wie viele Bausteine darin liegen. Vorher
waren es drei lose Kinder plus ein `margin-inline-start: auto` an der Werkzeugleiste: das hielt sie
auseinander, sagte aber nichts, und im Layout-Board der App standen Marke und Titel als zwei
unverbundene Komponenten untereinander. **Die Regel dahinter: was eine Anordnung ist, gehört in die
Layout-Konfiguration, nicht in ein Stylesheet, das sie nachbaut.**

Die Werkzeugleiste sitzt seit dem 04.09.2026 am **rechten Ende des Kopfbereichs** und nicht mehr in
der linken Leiste: Dort sucht man sie, und der Kopf ist der einzige Bereich, den jeder Frame hat —
auf der 404-Seite gab es vorher weder Suche noch Farbschema-Umschalter.

`byPageType` verteilt außerdem die vier Frames. Zwei Einträge sind am 2026-09-06 dazugekommen:
`canvas` und `excalidraw` nehmen beide `drawing` und leeren dabei ihre Randspalten
(`positions: { left: [], right: [] }`) — dieselbe Technik wie bei der 404-Seite. `excalidraw` ist
dabei ein Seitentyp, den kein `-page`-Plugin liefert: das Excalidraw-Plugin registriert ihn unter
seinem eigenen Namen. Die App kannte ihn deshalb nicht; seit demselben Tag liest ihr Layout-Editor
zusätzlich die Schlüssel, die schon unter `layout.byPageType` stehen (BEFUNDE 10).

### 3.7 Die fünf Layout-Box-Instanzen — `plugins.mjs`

| Schlüssel | Ort | Form | Zeigt |
| --- | --- | --- | --- |
| `layoutBoxMark` | Kopfbereich | Inline-HTML, SVG hell/dunkel | Bildumschaltung, `{{root}}`, `{{siteTitle}}` |
| `layoutBoxNote` | linke Spalte | `file:` mit `.md`, aufklappbar | Markdown-Snippet, `<details>` |
| `layoutBoxHint` | linke Spalte | Inline-HTML, nur mobil | zwei Instanzen unabhängig steuerbar |
| `layoutBoxCta` | nach dem Inhalt | Inline-HTML, eigene Klasse | `{{frontmatter.…}}` |
| `layoutBoxColophon` | Fußzeile | Inline-HTML | `{{locale}}`, `{{slug}}` |

Gestaltet in `styles/plugin-layout-box.scss` — inklusive `.layout-box-missing`, dem Zustand für ein
fehlendes Snippet.

> **Warum vier von fünf `html:` statt `file:` nutzen:** Ein Vorlagen-Paket transportiert
> `quartz/styles/` und `quartz/static/fonts/` — sonst nichts. Snippet-Dateien und Bilder bleiben
> zurück. Inline-HTML steckt dagegen im Konfigurationseintrag und reist mit. Die fünfte Instanz
> nutzt bewusst den Datei-Weg und dokumentiert damit die Lücke (siehe `site/README.md`).
>
> **Und eine offene Einschränkung:** Beim Import überlebt derzeit nur **eine** der fünf Instanzen —
> alle tragen denselben abgeleiteten Namen. Siehe `BEFUNDE.md`.

### 3.8 Zwei Sprachen — `plugins.mjs`, `styles/nav-language-switcher.scss`

Quartz kennt ein `locale` je Website. `quartz-multilanguage` fügt die Sprache der **Seite** hinzu:
Erkennung, Verknüpfung mit der Übersetzung, Umschalter, `<html lang>`, `hreflang` und die Hinweise.

**Der Zuschnitt.** Deutsch liegt in der Wurzel des Vaults, Englisch unter `en/`. Deutsche Seiten
passen damit auf keine Erkennungsstrategie und fallen in `defaultLanguage`, englische findet die
Ordner-Strategie. Diese Asymmetrie ist der Punkt: Ein `de/`-Ordner hätte 122 Notizen verschoben und
99 Wikilinks umgeschrieben, ohne dass irgendetwas dadurch besser würde.

**Die Verknüpfung** läuft über `translationKey` im Frontmatter — 118 von 122 Paaren. Nicht aus
Vorliebe: Mehrere Seiten teilen sich einen Titel („Grundform“ dreimal), und die Alias-Strategie
könnte nicht entscheiden, welche englische Seite gemeint ist. Drei Seiten tragen deshalb absichtlich
*keinen* Schlüssel und hängen allein an dem Alias, den das Obsidian-Plugin **Multilingual** in die
Notiz schreibt; ein Paar — die beiden Startseiten — hängt allein am gleichen Basispfad. Damit ist
jede der drei Strategien an der gebauten Site nachweisbar.

**Der Umschalter** kann drei Formen annehmen. Gestaltet sind alle drei, sichtbar ist eine:

| `switcher.style` | Was es ist | Wofür |
| --- | --- | --- |
| `dropdown` | ein `<details>` mit Liste | **in Gebrauch** — ein Kasten, egal wie viele Sprachen |
| `links` | die Sprachen nebeneinander | zwei Sprachen, viel Platz |
| `flags` | Flaggen-Emoji | sehr eng, wenn die Sprachen bekannt sind |

Am Telefon gibt er sein Wort auf und zeigt das Sprachkürzel, wie die Suche ihr „Suche“ aufgibt.
Das Kürzel steht in CSS, weil das Plugin das Label rendert und `attr()` nur eigene Attribute liest
— eine dritte Sprache wäre dort eine dritte Zeile.

**Den Explorer** trennt das Stylesheet, nicht das Plugin: Sein `languageExplorerFilter` ist nur aus
`quartz.ts` erreichbar, und dieses Projekt baut sein Layout aus YAML. Zwei Selektoren auf
`data-folderpath` und `html[lang]` blenden den fremdsprachigen Ast aus (BEFUNDE 26).

> **Was einsprachig bleibt:** Alles, was Quartz selbst beschriftet — Explorer, Backlinks, Graph,
> Inhaltsverzeichnis, Suche — folgt `configuration.locale`, site-weit. Dazu der Suchindex,
> „zuletzt geändert“, der globale Graph und die eine `404.html`. Verschieben lässt sich davon nur
> das Datum (`localizeDates`); alles andere löst ein Build je Sprache (`publishLanguages`).
> Gemessen und aufgeschrieben in BEFUNDE 29 bis 31.

### 3.9 Die Galerie-Titelbilder — `covers.mjs`

Die `gallery`- und die `cards`-Ansicht einer Base nehmen eine Option `image:`, die den **Namen einer
Eigenschaft** nennt; deren Wert darf ein Wikilink, ein Pfad oder eine Hex-Farbe sein. Ohne sie zeigt
jede Kachel denselben schraffierten Platzhalter — gemessen: 62 von 62 Einträgen, die Galerie führte
also nichts vor außer sich selbst.

Deshalb vierzehn erzeugte Titelbilder, eines je Bereich unter `formatierung/`:

    node scripts/example-template/covers.mjs ~/Obsidian/QuartzProjekte/Example

Sie landen im **Vault** (`assets/covers/`), weil dort die Medien dieser Website liegen und dort ihr
git sie versioniert; dieses Repo hält nur den Generator. Jede Notiz mit dem Tag `formatierung` bzw.
`formatting` trägt dazu ein `cover: "[[assets/covers/cover-<bereich>.svg]]"` im Frontmatter (124
Dateien, deutsch und englisch teilen sich ein Bild je Bereich), und die beiden Ansichten in
`Alle-Ansichten.base` / `All-Views.base` tragen `image: cover`.

Die Farben sind absichtlich eng beieinander — gleiches Helligkeitsband, wenig Sättigung, um das
Navy und das Sienna der Palette herum. Vierzehn volle Farben wären das Lauteste auf einer Website,
deren ganzes Argument Zurückhaltung ist. Ein Motiv, kein Text: Der Titel steht darunter, und ein
Bild, das ihn wiederholt, ist ein verschenktes Bild.

---

---

## 4. Fallen, die beim Bauen aufgefallen sind

Alle gemessen, nicht vermutet. Wer die Vorlage erweitert, spart sich damit dieselben Umwege.

| Falle | Was wirklich gilt |
| --- | --- |
| `article > p` für das Lesemaß | Der Inhalt liegt in `article > .markdown-preview-view > p`. Ohne den Wrapper greift die Regel nicht — und der Text sieht trotzdem gut aus, weil die Spalte zufällig passt |
| `.nav-file-title a` | `.nav-file-title` **ist** der Link, nicht sein Elternteil |
| `.explorer-ul .explorer-ul` | Verschachtelte Listen heißen `ul.tree-item-children`; nur die Wurzel heißt `explorer-ul` |
| `.section`, `.meta`, `.desc`, `.tags` | Nutzt *auch* die Komponente „zuletzt geändert“. Ohne `.page-listing` davor landet das Listen-Raster in der Seitenleiste |
| `.desc` in einer Liste | Enthält den **Titel**, nicht die Beschreibung |
| Plugin-CSS überschreiben | Quartz legt Komponenten-CSS in `@layer`, `custom.scss` kommt ungelayert dahinter: **jede** Regel hier gewinnt, auch unbeabsichtigt. Wer eine Eigenschaft anfasst, die ein Plugin selbst setzt, muss dessen Regel mitschreiben |
| Klappmechanismen nachbauen | Quartz klappt Explorer und Ordner selbst. Eine eigene `grid-template-rows`-Animation gewinnt und hinterlässt Lücken |
| `.math-display`, `.tag-index`, `<input>` im Farbschalter | Existiert alles nicht. Vor dem Schreiben einer Regel im gebauten HTML nachsehen |
| `display` aus einem Layer überschreiben | Wer ungeschichtet `display: grid` setzt, gewinnt auch dort, wo das Plugin `display: none` meinte. Beim Schubladen-Knopf des Explorers klappte das den ganzen Baum auf jedem Desktop zu (BEFUNDE 22). Beide Zustände selbst aussprechen |
| Nach einer Frame-Änderung von Hand bauen | `quartz build` räumt `public/` nicht auf, und das Frame-CSS steht in jeder Seite. `rm -rf public` davor, sonst mischen sich alt und neu (BEFUNDE 23) |
| `folderDefaultState: 'open'` | Wirkungslos in Explorer 0.1.0 — das Skript liest nur `localStorage` (BEFUNDE 21) |
| Plugin-CSS überschreiben, zweiter Teil | Für *Ressourcen*-Stylesheets (`static/resource-style-….css`) gilt die Layer-Regel nicht: ungeschichtet und **nach** `index.css` verlinkt. Bei gleicher Spezifität gewinnt das Plugin (BEFUNDE 32) |
| Eine Rinne in rem bei zwölf Spalten | Elf Rinnen sind die Mindestbreite des Rasters. 2 rem × 11 + 40 Rand = 392 px passen nicht auf ein 390-px-Telefon (BEFUNDE 34) |
| Ein `<p>` in einer Titelzeile | Behält seinen Absatzrand und verschiebt den Text gegen das Icon daneben — im Callout waren es 8 px (BEFUNDE 33) |
| Die Farben eines Syntax-Themas | Sind nicht gemessen, nur weil die Palette es ist. Fünf von neun Token-Farben fielen durch; shiki schreibt sie inline, also hilft nur `!important` auf der Variablen (BEFUNDE 36) |
| Eine Regel an „das scrollende Element" hängen | Welches das ist, entscheidet der Browser: bei Quartz' Explorer rollt in Chrome die innere Liste, in Firefox der Kasten darum (BEFUNDE 37). Und es ist nicht frei wählbar: Das Plugin sichert und stellt den `scrollTop` der **Liste** wieder her, also muss die Liste die Rolle behalten (BEFUNDE 49) |
| `animation` mit `animation-timeline` | Wo es keine Scroll-Timelines gibt, bleibt der Kurzbefehl stehen, läuft 0 s und springt mit `fill: both` ans Endbild. `@supports` davor, sonst ist die Ausnahme schlimmer als gar kein Effekt (BEFUNDE 38) |
| `initial-value` in `@property` | Muss einheitenfest sein — `rem` lässt Chrome durch und Firefox verwirft die ganze Regel (BEFUNDE 39) |
| Ein `<summary>` als Bedienelement | Rechnet ohne `box-sizing` als `content-box`, und ein Plugin-`padding` überlebt, wenn man nur die eine Hälfte überschreibt. Der Sprachumschalter wurde so 51 px hoch neben 44-px-Nachbarn (BEFUNDE 27) |
| Ein zweiter Ausklapp-Pfeil | `base.scss` gibt jedem `<summary>` eine Chevron, das Plugin setzt zusätzlich ein „▾“. Wer eine eigene hinzufügt, hat drei (BEFUNDE 27) |
| Ein Alias in zwei Sprachen | `alias-redirects` slugifiziert sprachübergreifend: „Frontmatter-Demo“ und „Frontmatter demo“ ergeben denselben Pfad, und die zweite Seite kapert die erste (BEFUNDE 25) |
| Ein vierter Knopf in der Werkzeugleiste | Kostet bei 390 px den Seitennamen in der App-Leiste. Erst schrumpft der Titel, dann läuft die Leiste über (BEFUNDE 28) |
| Der Frame, den ein Seitentyp-Plugin mitbringt | Ist nicht unbedingt benutzbar. Canvas fällt auf Quartz' `full-width` zurück und hat dort keine Höhe; Excalidraw bringt einen eigenen Rahmen ganz ohne Kopfleiste mit. Beide bekommen jetzt `drawing` (BEFUNDE 48) |
| `.overflow-end` im Explorer | Steht am **Anfang** der Liste, nicht am Ende. Mit Höhe sind das 16 px Luft zwischen Überschrift und erstem Ordner (BEFUNDE 50) |
| Zwei Regeln, die dasselbe Element verstecken | Die unbedingte gewinnt weiter, auch wenn die spätere nur die *anderen* versteckt. Auf `/en/` war der ganze Explorer-Baum weg (BEFUNDE 51) |
| Ein `flex-basis` als Breite einer Gruppenkomponente | Setzt das Element richtig, zählt in Gecko und WebKit aber nicht in die max-content-Breite der Gruppe. Die Werkzeugleiste war dort 322 statt 452 px breit — erst zwei Zeilen, dann 102 px seitliches Scrollen. Eine `width` am Element statt eines Basis am Wrapper (BEFUNDE 58) |
| Eine Regel aus Quartz' `base.scss` abgelesen | Ihr Selektor gibt es in einem Frame-Projekt vielleicht gar nicht. `.sidebar` heißt hier `.qgframe-area-left` — der Lesemodus tat deshalb nichts (BEFUNDE 57) |
| Eine feste Spur im Raster | Ist nicht stauchbar und hebt die Mindestbreite, auch an einem Breakpoint, an dem sie nichts trägt (BEFUNDE 56) |
| Eine klebende Überschrift in einem Roller | Braucht einen deckenden Grund *und* einen kurzen Verlauf darunter. Die deckende Kante allein schneidet die durchlaufende Zeile quer durch die Buchstaben (BEFUNDE 55) |
| Der Titel einer Galerie-Kachel | Liegt beim Plugin absolut **über** dem Bild und zählt nicht zur Höhe der Kachel. Mit echten Titelbildern ist er unlesbar und zweizeilig abgeschnitten (BEFUNDE 52) |
| Ein `<img>` in einer fremden Komponente | Erbt die 16 px Absatzabstand aus `body-media.scss`. In einer randlosen Karte ist das ein Streifen Kartengrund über dem Bild |
| Ein erzeugtes SVG mit doppeltem Attribut | Ist ein XML-Parse-Fehler, kein nachsichtiges HTML: Die Datei rendert als kaputtes Bild. Acht von vierzehn Kacheln waren so leer |

---

## 5. Prüfen, ob es noch stimmt

    npm run template:example -- --check-contrast    # 89 Farbpaare
    npm run template:example -- --only 9            # SCSS übersetzt? alle zehn Bausteine gefüllt?
    npm run template:example -- --only 9,10,11      # exportieren und in ein leeres Projekt importieren

**Und in mehr als einer Engine.** Ein Durchgang in Chrome allein hat am 2026-09-06 zwei Fehler
durchgelassen, die auf jeder Seite sichtbar waren — beide an der intrinsischen Breite einer
Flex-Gruppe, wo Gecko und WebKit anders rechnen als Blink (BEFUNDE 58). Was von Flexbox- oder
Grid-Größen abhängt, wird in mindestens zwei Engines gemessen:

    node node_modules/playwright-core/cli.js install firefox webkit

Phase 11 ist der eigentliche Beweis: Sie legt ein zweites Projekt an, macht einen echten Dry-Run,
importiert und baut. Was dort ankommt, ist das, was ein anderer Mensch bekommt.
