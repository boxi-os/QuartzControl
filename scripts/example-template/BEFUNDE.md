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
