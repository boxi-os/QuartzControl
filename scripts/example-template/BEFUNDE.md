# Was beim Bau der Beispielvorlage auffiel

Alles hier ist an einem echten Projekt gemessen, nicht aus dem Code geschlossen. Ein Punkt wurde
behoben (er machte die Aufgabe sonst unlösbar), die übrigen stehen offen.

## Behoben

### Ein selbstgebautes Frame brach jedes Client-Skript

`layoutFrameService.generateFrameJs` schrieb keine `center`-Klasse, Quartz' eigene drei Frames tun
es. Der Mermaid-Initialisierer ruft auf jeder Seite unbedingt
`document.querySelector(".center").querySelectorAll(...)` — ohne die Klasse ein TypeError im
`nav`-Handler, der jedes danach registrierte Komponentenskript mitnimmt. Sichtbar wurde das als
Explorer ohne Baum und ohne Überschrift; in der Konsole stand ein Mermaid-Fehler, der nichts über
den Explorer sagte. Behoben, Messung in `docs/decisions/layout-frames.md`.

## Offen

### 1. Fünf Instanzen eines Plugins reisen als eine

`configService.deriveName()` leitet den Namen aus dem letzten Pfadsegment der Quelle ab, also heißen
alle fünf `quartz-layout-box`-Einträge gleich. Der `plugins`-Baustein legt beim Anwenden eine
`byName`-Map an (`parts.ts:554`) — **gemessen: von fünf Instanzen kommt eine im Zielprojekt an.**
Die Mehrfachverwendung ist im Plugin ausdrücklich vorgesehen (das README zeigt sie) und in der App
über „Duplizieren“ im Layout-Editor erreichbar; über eine Vorlage überlebt sie nicht.

### 2. Ein Stylesheet mit Ziffer am Anfang macht das Projekt unübersetzbar

`styleFileName` erlaubt `/^[A-Za-z0-9][A-Za-z0-9._-]*$/`, also `01-typografie.scss`. `setImportOrder`
schreibt daraus `@use "./custom/01-typografie"` ohne `as`, und Sass leitet den Namespace aus dem
Dateinamen ab: *The default namespace "01-typografie" is not a valid Sass identifier.* Danach
übersetzt **kein** CSS des Projekts mehr. Über die Oberfläche in zwei Klicks erreichbar.

### 3. `importFontFile` schreibt @font-face ohne Gewicht und Stil

Erzeugt wird nur `font-family`, `src`, `font-display`. Bei einer Variable Font heißt das: Der Browser
behandelt sie als 400 und fälscht jeden fetten Schnitt, die mitgelieferte Achse bleibt ungenutzt.
Bei zwei Schnitten derselben Familie (etwa aufrecht und kursiv) beanspruchen beide dieselbe
Kennung, und der zweite verdrängt den ersten. Die Vorlage korrigiert den Block nach dem Import von
Hand; über die Oberfläche geht das nicht.

### 4. Der `translations`-Baustein transportiert Änderungen, die man nicht sieht

Die Übersetzungsseite bearbeitet `quartz/i18n/locales/<code>.ts`. In Quartz 5 kommt aber jede
sichtbare Überschrift aus einem Komponenten-**Plugin**, und alle geprüften Pakete — explorer,
graph, backlinks, recent-notes, table-of-contents, search, reader-mode — bringen ihre eigenen
kompilierten Übersetzungen in `dist/` mit. Gemessen: „Backlinks“, „Graphansicht“ und „Zuletzt
bearbeitete Seiten“ überstanden die Änderung unverändert. Der Mechanismus ist nicht kaputt, er
erreicht nur fast nichts mehr; die Oberfläche sagt darüber nichts.

### 5. Ein Vorlagen-Paket kann seine eigenen Snippets nicht mitnehmen

Erfasst werden `quartz/styles/` und `quartz/static/fonts/`. Alles andere unter `quartz/static/` —
Bilder, Logos, die Snippet-Dateien von `quartz-layout-box` — bleibt zurück. Eine Vorlage, die eine
Komponente mit `file:`-Option enthält, kommt im Zielprojekt mit einem Verweis ins Leere an. Die
Vorlage weicht darauf aus, indem sie vier ihrer fünf Instanzen auf `html:` inline stellt und Logos
als Inline-SVG führt; für den fünften Fall liegt eine Anleitung bei (`site/README.md`).

### 6. Zwei Vorgaben, die eine Vorlage nicht vorführen kann

- **Das Inhaltsverzeichnis stoppt bei `maxDepth: 3`.** Ein Dokument mit h4, h5 und h6 bekommt eine
  abgeschnittene Gliederung, und im Markup erscheinen nur `depth-0` und `depth-1` — wer die
  tieferen Ebenen gestaltet, gestaltet ins Leere. Die Vorlage hebt den Wert auf 6.
- **Der Explorer startet zugeklappt**, und die Plugin-Optionen kennen dafür keinen Schalter
  (`folderDefaultState` betrifft die Ordner, nicht den Explorer selbst); auch `useSavedState: false`
  ändert daran nichts.

### 7. Kleinigkeiten

- **Quartz kappt den zugeklappten Explorer bei `1.2em`.** Wer seiner Überschrift eine
  Mindesthöhe von 44 px gibt — was für ein Bedienelement richtig ist — verliert sie damit
  vollständig: gemessen 19 px Container gegen 44 px Knopf, Überschrift unsichtbar. Die Vorlage
  verlegt das Einklappen deshalb auf den Inhalt.
- **Quartz rendert keinen Skip-Link.** `.skip-to-content` matcht auf keiner Seite, und ein
  Stylesheet kann keinen hinzufügen — das Element muss im Markup stehen, um fokussierbar zu sein.
  Auf einer Seite mit Explorer kostet der Weg zum Artikel per Tastatur damit einen Tabstopp pro
  Baumzeile.

### 8. Ein Projekt umbenennen bricht alle selbstgebauten Frames

`projects.relocate` hängt einen Projekteintrag auf einen anderen Ordner um und behält dabei die ID
— genau richtig. Es zieht aber die **absoluten Pfade nicht nach**, die zu einem authored Frame
gehören: weder den `source:`-Eintrag in `quartz.config.yaml` noch den Symlink unter
`.quartz/plugins/<id>`. Gemessen beim Umbenennen des Beispielprojekts: alle drei Frames tot, und
der nächste `quartz plugin add` starb mit `ENOENT` auf dem alten Pfad. Repariert wurde von Hand.

Der Nutzer merkt davon zunächst nichts — der Layout-Editor zeigt die Frames weiter an, weil er sie
aus `.quartz-gui/authored-frames/` liest.

### 9. `plugin add` schreibt wieder keinen Config-Eintrag

Bekannt aus `templates-and-localization.md`, hier erneut aufgetreten: `npx quartz plugin add
github:quartz-community/obsidian-plugin-excalidraw` legte das Plugin unter `.quartz/plugins/` an,
schrieb `quartz.lock.json` — und **keinen Eintrag in `quartz.config.yaml`**. Ohne den passiert beim
Bauen nichts. Der Eintrag musste von Hand ergänzt werden.

### 10. Ein Seitentyp-Plugin ohne `-page` im Namen wird nicht erkannt

`derivePageTypes()` (`src/routes/LayoutEditor/utils.ts:171`) erkennt Seitentypen daran, dass der
Pluginname auf `-page` endet. `obsidian-plugin-excalidraw` tut das nicht, trägt aber
`quartz.category: ["pageType", …]`. Für den Build ist das egal — Quartz liest die Kategorie —, im
Layout-Editor der App fehlt der Seitentyp dadurch.

### 11. Bases sprechen Englisch

Das Plugin schreibt über jede Ansicht eine Zeile wie *„Showing 45 of 45 entries"* und beschriftet
die Spaltenköpfe mit den englischen Feldnamen (`Description`). Beides kommt aus dem kompilierten
Plugin und lässt sich weder über die Sprachdatei noch über Optionen ändern. Die Vorlage setzt die
Zeile deshalb leise statt sie zu entfernen — eine falschsprachige Zeile, die schreit, ist schlimmer
als eine, die zurücktritt.

### 12. `groupBy` über eine Formel greift nicht

`groupBy: { property: formula.Bereich }` in einer `.base` wird vom Quartz-Plugin ignoriert; die
Liste erscheint ungruppiert. Ob eine Gruppierung über ein echtes Feld funktioniert, ist noch nicht
gemessen.

### 13. Mermaid: `<<Annotation>>` überlebt die HTML-Verarbeitung nicht

Mermaid kennt für Klassendiagramme eine Annotation in doppelten spitzen Klammern. Der Inhalt eines
Mermaid-Blocks läuft in Quartz aber durch dieselbe HTML-Verarbeitung wie der übrige Text, und die
Klammern werden als Tag gelesen und entfernt — übrig bleibt ein einzelnes `>`, und das Diagramm
scheitert mit *Syntax error in text*. Gemessen: derselbe Quelltext parst in Mermaid selbst
fehlerfrei; im gebauten HTML fehlt der Anfang des Blocks.

### 14. Mermaid rechnet seine Sektionsfarben aus `primaryColor` — und landet bei Schwarz

Quartz übergibt neun CSS-Variablen als `themeVariables`, darunter `--light` als `primaryColor`.
Mindmap, Timeline und gitGraph leiten daraus ihre Sektionsfarben ab und kamen bei einem
Seitengrund von `#FCFCFA` auf `rgb(2, 4, 4)` und `rgb(0, 0, 0)`: schwarze Knoten mit schwarzem
Text. Pie, Sankey, xychart und Quadrant nutzen ihre eigenen Paletten und ignorieren die
Theme-Variablen ganz. Die Vorlage setzt für alle vierzehn Diagrammarten eine eigene Farbserie.

### 15. Ein Mermaid-Block ist ein Codeblock

Das Markup ist `<pre><code class="mermaid">`, also greift jede Regel für Codeblöcke auch hier —
einschließlich `pre > code { min-width: max-content }`, das jedes Diagramm auf seine eigene
Layoutbreite festnagelte: gemessen 294 bis 594 px in einer 796 px breiten Spalte. Wer Codeblöcke
gestaltet, gestaltet unbeabsichtigt auch seine Diagramme.
