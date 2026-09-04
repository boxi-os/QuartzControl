# Minimal & lesbar — die Beispielvorlage

Eine vollständige QuartzControl-Vorlage: alle zehn Bausteine gefüllt, jede Plugin-Komponente
einzeln gestaltet, jeder Farbkontrast gemessen. Sie ist zum Benutzen gedacht **und** zum Umbauen —
dieses Dokument beschreibt beides.

    npm run template:example                 # alles: aufbauen, prüfen, exportieren, gegenprüfen
    npm run template:example -- --only 5     # nur die Stylesheets neu einspielen
    npm run template:example -- --check-contrast   # nur messen, ohne App und ohne Projekt

---

## 0. Wo der Inhalt lebt

Seit dem Umbau ist **das Projekt die Quelle**, nicht mehr dieses Verzeichnis:

```
~/Obsidian/QuartzProjekte/Example/     der Vault — 123 Notizen, 3 Bases, 1 Canvas, 1 Zeichnung, 7 Mediendateien
        ↑ Symlink
~/Documents/Example/content/            das Projekt
~/Documents/Example/quartz/styles/      die Stylesheets — hier wird gearbeitet
```

| Was | Quelle | Versioniert in |
| --- | --- | --- |
| Notizen, Bases, Canvas, Excalidraw | Vault | eigenes git im Vault |
| Stylesheets, Config, Schriften | Projekt | git im Projekt |
| Frames, Presets, Breakpoints | Projekt (`.quartz-gui/`, gitignored) | dieses Verzeichnis |
| Messung, Bootstrap | dieses Verzeichnis | Quartz-GUI-Repo |

> **Ein Content-Symlink nimmt die Notizen aus QuartzControls Obhut.** Git folgt keinen Symlinks,
> deshalb erzwingt der Snapshot-Dienst `includeContent: false`, sobald `content/` ein Link ist.
> Keine Snapshots, kein Restore, kein Vergleich — der Vault ist über sein eigenes git gesichert.

## 1. Wo was liegt

| Datei | Was darin entschieden wird |
| --- | --- |
| `palette.mjs` | Die neun Quartz-Farben für hell und dunkel, die drei Schriftrollen — **und die WCAG-Messung**, die sie prüft |
| `variables.mjs` | 46 CSS-Variablen: Abstände, Radien, Schriftgrößen, Lesemaß, Fokus, Zielgrößen |
| `fonts.mjs` | Welche Schriften geladen werden, woher, und die korrigierten `@font-face`-Regeln |
| `frames.mjs` | Die drei Seitenraster (`editorial`, `index`, `focus`) für je drei Breakpoints |
| `layout.mjs` | Welcher Seitentyp welches Raster nutzt, und die Flex-Gruppe der Werkzeugleiste |
| `plugins.mjs` | Welches Plugin an, wo es sitzt, mit welchen Optionen — und die fünf Layout-Box-Instanzen |
| `translations.mjs` | Geänderte Formulierungen in Quartz' deutscher Sprachdatei |
| `presets.mjs` | Zwei gespeicherte Theme-Zusammenstellungen |
| `style-order.mjs` | Die Ladereihenfolge der Stylesheets — Liste **und** Reihenfolge in einem |
| `styles/*.scss` | 31 Stylesheets, eines je Komponente |
| `site/content/**` | der ursprüngliche Beispielinhalt — **überholt**, gepflegt wird im Vault |
| `site/snippets/` | Die eine Snippet-Datei, die nicht im Paket mitreist |
| *(im Vault)* `assets/` | Dummy-Medien: PNG, JPEG, WebP, GIF, SVG, ein dreiseitiges PDF, eine WAV-Datei |
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
| `gray` | Sekundärtext, **und jeder Rand eines Bedienelements** |
| `darkgray` | Fließtext |
| `dark` | Überschriften |
| `secondary` | Links, der eine Akzent — ein tiefes Navy |
| `tertiary` | Link-Hover und aktive Navigation — ein warmes Sienna |
| `highlight` | getönte Fläche (mit Alpha) |
| `textHighlight` | `==Hervorhebung==` (mit Alpha) |

Nach jeder Änderung:

    npm run template:example -- --check-contrast

Das prüft **78 Paare** — jede Text-auf-Grund-Kombination in beiden Modi, die Alpha-Farben über den
Grund gerechnet, und alle zwölf Callout-Farben gegen den Grund *und* gegen ihre eigene getönte
Fläche. Unter der Schwelle bricht der Lauf ab.

> **Warum `lightgray` nicht 3:1 erreichen muss:** Es ist Trennlinie *und* Fläche zugleich. WCAG
> 1.4.11 verlangt 3:1 von *Bedienelementen*, nicht von einer Zierlinie. Die Pflicht verschwindet
> dadurch nicht, sie wandert: alles, was man bedient, zieht seinen Rand aus `gray`. Wer eine neue
> Komponente baut, hält sich daran — sonst ist die Messung eine Lüge.

> **Warum `tertiary` eine andere Farbe ist und nicht eine dunklere:** Es markiert, was gerade
> angefasst oder gerade aktiv ist. Als Helligkeitsstufe von `secondary` sieht man dem Ergebnis nicht
> an, welche der beiden Rollen greift; als eigener Farbton schon.

**Callout-Farben** stehen nicht hier, sondern in `styles/body-callouts.scss`, je Modus einmal. Die
Prüfung liest sie aus der Datei, damit sie nie an einer veralteten Kopie misst. Quartz' eigene
Farben scheitern übrigens zu elf Zwölfteln im hellen Modus — deshalb sind sie neu gesetzt.

### 3.2 Maße, Formen, Rhythmus — `variables.mjs`

49 Variablen, in drei Gruppen:

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

Drei Frames, je drei Breakpoints, jede Fläche vollständig platziert.

Alle drei teilen sich am Desktop **ein Raster: zwölf gleiche Spalten, 20 px Rinne, 20 px Rand,
gedeckelt auf 1440 px**. Das sind 1400 px nutzbar, elf Rinnen, also 98,33 px je Spalte:

| Block | Spalten | Breite |
| --- | --- | --- |
| Navigation (`left`) | 1–3 | 335 px |
| Text (`beforeBody`/`pageBody`/`afterBody`) | 4–9 | 690 px |
| Apparat (`right`) | 10–12 | 335 px |

690 px sind bei 1 rem rund 72 Zeichen — deshalb deckelt kein Stylesheet mehr die Zeilenlänge
(`styles/base.scss` sagt das an der Stelle, wo die Regel früher stand). Wer den Text breiter will,
ändert die Spannen hier, nicht eine `max-width` an einem Absatz.

| Frame | Verwendet von | Unterschied |
| --- | --- | --- |
| `editorial` | Inhaltsseiten | alle sieben Bereiche belegt |
| `index` | Ordner, Tags, Bases | rechte Spalte reserviert, aber leer |
| `focus` | 404 | beide Randspalten leer, kein `beforeBody`/`afterBody` |

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

`layout.mjs` bestimmt, welcher Seitentyp welchen Frame nutzt, und definiert die Flex-Gruppe
`toolbar` (Suche, Farbschema, Lesemodus in einer Reihe). Die Gruppe sitzt seit dem 04.09.2026 am
**rechten Ende des Kopfbereichs** und nicht mehr in der linken Leiste: Dort sucht man sie, und der
Kopf ist der einzige Bereich, den jeder Frame hat — auf der 404-Seite gab es vorher weder Suche
noch Farbschema-Umschalter.

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

---

## 5. Prüfen, ob es noch stimmt

    npm run template:example -- --check-contrast    # 78 Farbpaare
    npm run template:example -- --only 9            # SCSS übersetzt? alle zehn Bausteine gefüllt?
    npm run template:example -- --only 9,10,11      # exportieren und in ein leeres Projekt importieren

Phase 11 ist der eigentliche Beweis: Sie legt ein zweites Projekt an, macht einen echten Dry-Run,
importiert und baut. Was dort ankommt, ist das, was ein anderer Mensch bekommt.
