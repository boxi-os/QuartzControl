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

### 10. Ein Seitentyp-Plugin ohne `-page` im Namen wird nicht erkannt — behoben am 2026-09-06 (BEFUNDE 53)

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

### 16. Bildgröße und Alternativtext schließen einander aus

Gemessen an einer echten Seite:

| Schreibweise | Ergebnis |
| --- | --- |
| `![[bild.png\|300]]` | `<img width="300" height="auto" alt>` — Größe, **kein** Alternativtext |
| `![Text\|300](bild.png)` | `alt="Text\|300"` — Alternativtext, **keine** Größe |

Die Markdown-Form kennt die Größenangabe nicht: Der ganze String wird zum `alt`, Pipe und Zahl
eingeschlossen. Die Wikilink-Form setzt `width`/`height`, lässt `alt` aber leer. Wer beides
braucht, muss `<img>` schreiben. Für eine Website, die zugänglich sein soll, ist das eine
unangenehme Wahl zwischen zwei Pflichten.

### 17. Der Seitenanker eines eingebetteten PDFs geht verloren

`![[dokument.pdf#page=2]]` erzeugt `<iframe src="…/dokument.pdf">` — ohne den Anker. Die Einbettung
beginnt immer auf Seite 1. Ein gewöhnlicher Link (`[Text](datei.pdf#page=2)`) behält ihn.

### 18. Von den Aufgaben-Zuständen überlebt nur „offen" und „erledigt"

Obsidian erlaubt beliebige Zeichen im Kästchen (`[/]`, `[-]`, `[>]`, `[?]`) und zeigt dafür eigene
Symbole. Gemessen: Quartz erkennt nur `[ ]` und `[x]`; alles andere wird zu einem leeren Kästchen,
das Zeichen geht ersatzlos verloren — die Information ist auf der Website weg, nicht nur anders
dargestellt.

### 19. Definitionslisten gibt es nicht

Weder Obsidian noch Quartz kennen die `Begriff` / `: Erklärung`-Schreibweise; die Doppelpunktzeile
bleibt als Text stehen. Nur über HTML (`<dl>`) zu haben.

### 20. Quartz setzt kein globales `box-sizing`

Ein Element mit `width: 100%` und Innenabstand ist damit breiter als sein Container. Gemessen auf
der Canvas-Seite: Die Layout-Box nach dem Inhalt kam auf 1492 px in einem 1440 px breiten Body und
schob die ganze Seite zur Seite. Das betrifft jede Komponente, die ihre Breite füllt und Padding
hat — die Vorlage setzt `box-sizing: border-box` deshalb global, statt die Fälle einzeln zu suchen.

### 21. `folderDefaultState` im Explorer ist wirkungslos

`@quartz-community/explorer` 0.1.0 nimmt die Option entgegen und schreibt sie als
`data-collapsed` ins Markup. Sein eigenes Inline-Skript liest das Attribut nie. Der Faltzustand
kommt ausschließlich aus `localStorage.fileTree`, und für alles, was dort nicht steht, ist die
Vorgabe *zugeklappt*:

```js
let C = r[u.slug] !== undefined ? r[u.slug] : true   // true == collapsed
if ((!C || onActivePath) && outer) outer.classList.add("open")
```

Gemessen: 29 Einträge gerendert, jede Ebene zu, nur die Ordner auf dem Weg zur aktuellen Seite
offen. `useSavedState` wird auf demselben Weg ignoriert. Mit einem Stylesheet nicht zu heilen —
„offen“ und „noch nie angefasst“ teilen sich eine Klasse, CSS kann die beiden nicht unterscheiden.
Die Optionen bleiben in `plugins.mjs` stehen, weil sie die richtigen Werte für den Tag sind, an dem
das Plugin sie liest.

### 22. Eine ungeschichtete Regel kann den Explorer zuklappen

Hausgemacht, gefunden und behoben — hier, weil die Kette selbst lehrreich ist. `nav-explorer.scss`
gab `.mobile-explorer` ein `display: grid`, ohne es auf schmale Fenster zu beschränken. Das
Explorer-Plugin versteckt den Knopf mit `.explorer button.mobile-explorer { display: none }` in
`@layer quartz-base`; alles in dieser Vorlage steht ungeschichtet und schlägt das unabhängig von
der Spezifität. Der Knopf war also auch bei 1600 px sichtbar — und das Skript des Plugins endet mit

```js
if (mobileButton.checkVisibility()) explorer.classList.add("collapsed")
```

Ergebnis: Der Baum war auf jedem Desktop-Aufruf zugeklappt, obwohl er vollständig gerendert wurde
(`.explorer-content` 335 × 0 px, sechs Einträge). Die Lehre gilt über diesen Fall hinaus: Wo eine
ungeschichtete Regel ein `display` aus einem Layer überschreibt, muss sie **beide** Zustände selbst
aussprechen — sonst gewinnt sie auch dort, wo das Plugin recht hatte.

### 23. `quartz build` räumt sein Ausgabeverzeichnis nicht auf

Kostete beim Umbau auf zwölf Spalten eine halbe Stunde. Das CSS eines selbstgebauten Frames steht
als `<style>` in *jeder* Seite; ändert sich der Frame, aber nicht die Notiz, behält die Seite ihre
alte Fassung. `public/` enthielt danach neue Farben und altes Raster nebeneinander — und die
Frame-Datei auf der Platte war nachweislich die neue. Ein zweiter Lauf holte einen Teil der Seiten
nach, ein vollständig richtiges Ergebnis gab es erst nach `rm -rf public`. Die App macht das von
sich aus (`docs/decisions/navigation-and-pages.md`, Build-Ausgabeverzeichnis); wer von Hand baut,
muss daran denken.

### 24. Die mobile Schublade des Explorers lässt sich nur über ihren Knopf schließen

Das Plugin bringt weder eine Escape-Behandlung noch einen Klick-Fänger hinter der Schublade mit.
Der Auslöser bleibt über ihr liegen und schaltet zurück, es gibt also immer einen Weg heraus — aber
ein Tipp auf die abgedunkelte Seite tut nichts, und das ist die Geste, die jeder zuerst probiert.
Der Hintergrund selbst ist Vorlagenarbeit (`html.mobile-no-scroll body::after`): Das Plugin setzt
die Klasse und benutzt sie nur für ein `overscroll-behavior`.

### 25. Ein übersetzter Alias kann die Weiterleitung des Originals kapern

`alias-redirects` legt für jeden Alias eine Weiterleitungsseite an, und der Pfad dafür ist der
slugifizierte Alias — sprachübergreifend, ohne Namensraum. Die deutsche Notiz trug
`Frontmatter-Demo`, die englische bekam `Frontmatter demo`; beides ergibt `/frontmatter-demo`, und
die zweite Seite überschrieb die erste. Gemessen an der gebauten Site: `/frontmatter-demo` zeigte
auf die *englische* Seite, ohne eine Warnung im Build.

Daraus die Regel für diese Website: Ein Alias, den es in zwei Sprachen gibt, muss in beiden
verschieden slugifizieren (`Frontmatter-Demo` / `Frontmatter example`). Und der zweite Grund, die
englischen Titel **nicht** flächendeckend als Alias in die deutschen Notizen zu schreiben: 122
Aliase wären 122 zusätzliche Weiterleitungsseiten gewesen, die von einem englischen Wort auf eine
deutsche Seite führen.

### 26. Der Explorer lässt sich nicht aus YAML filtern

`quartz-multilanguage` bringt `languageExplorerFilter` mit, damit der Baum nur die Seiten einer
Sprache zeigt. Der Explorer nimmt Funktionen aber ausschließlich aus `quartz.ts` entgegen
(`filterFn` reist als **String** im `data-data-fns`-Attribut und wird im Browser mit `new Function`
wieder aufgebaut), und dieses Projekt baut sein Layout aus `quartz.config.yaml`, wo keine Funktion
steht. Der Weg ist damit zu, solange die App die Layout-Konfiguration schreibt.

Ersetzt ist er durch zwei Selektoren in `nav-explorer.scss`. Möglich sind sie, weil das
Explorer-Skript an jede Ordnerzeile ein `data-folderpath` mit dem vollen Slug schreibt und die
Dateilinks absolute `href`s bekommen — beides am gebauten DOM abgelesen, nicht angenommen. Auf der
englischen Seite fällt zusätzlich die Kopfzeile des `en`-Ordners weg, sonst stünde der ganze Baum
eine Ebene eingerückt unter einem Ordner namens „en“.

### 27. Drei Pfeile an einem Knopf

Der aufklappbare Sprachumschalter zeigte „English ▾ ⌄“. Drei Quellen trafen sich auf demselben
Element: `base.scss` gibt **jedem** `<summary>` dieser Vorlage die Lucide-Chevron als `::before`,
das Plugin setzt ein Text-„▾“ als `::after`, und die erste Fassung von
`nav-language-switcher.scss` fügte noch eine eigene hinzu. Geblieben ist die aus `base.scss` — sie
dreht sich beim Aufklappen bereits über `details[open] > summary::before` und ist dieselbe wie an
allen anderen Ausklappstellen; sie wandert nur mit `order: 1` hinter die Beschriftung, weil ein
Menüknopf seinen Pfeil rechts trägt. Das `::after` des Plugins wird ausdrücklich auf
`content: none` gesetzt und am Telefon mit dem Sprachkürzel gefüllt.

Dazu ein zweiter Fund am selben Element: Das Plugin setzt `padding: 0.15rem 0.5rem`. Wer nur
`padding-inline` überschreibt, behält 2,4 px oben und unten — und weil ein `<summary>` ohne
`box-sizing` als `content-box` rechnet, wurde der Knopf 51 px hoch neben drei 44-px-Nachbarn.
Beide Hälften des Paddings und das Box-Modell stehen jetzt ausdrücklich da.

### 28. Der vierte Knopf kostet den Seitennamen

Gemessen bei 390 px: Mit drei Bedienelementen in der Werkzeugleiste hatte der Seitentitel in der
App-Leiste 84 px, mit dem Sprachumschalter als viertem noch 24 px — dargestellt als „M…“. Die
Leiste schiebt in dieser Reihenfolge: erst schrumpft der Titel, dann läuft sie über; die Wortmarke
schrumpft gar nicht.

Zwei Änderungen daraus. Der Umschalter gibt am Telefon sein Wort auf und zeigt das Sprachkürzel, so
wie die Suche ihr „Suche“ aufgibt — das Kürzel steht dabei in CSS, weil das Plugin das *Label*
rendert und `attr()` nur eigene Attribute liest. Und unter 480 px entfällt der Titel ganz: Die
Wortmarke daneben ist ein Link zur Startseite und trägt denselben Namen als zugänglichen Namen.

### 29. Was in einem Build einsprachig bleibt

Nachgesehen im gebauten Code der Komponenten-Plugins, nicht vermutet: Der Explorer liest
`cfg?.locale`, die Rückverweise `cfg.locale`; keine Komponente sieht die Sprache der Seite an, die
sie gerade rendert. Damit bleiben „Explorer“, „Backlinks“, „Graph View“, „Table of Contents“,
„Recent Notes“ und die Beschriftungen der Suche in der Sprache der Website. Dasselbe gilt für den
Suchindex, „Zuletzt geändert“, den globalen Graphen und die eine `404.html`.

Verschieben lässt sich davon genau eines: `localizeDates` formatiert jedes `<time>`-Element im
Browser in der Seitensprache nach. Alles andere löst nur ein Build je Sprache
(`publishLanguages`) — mit zwei Adressen als Preis.

### 30. Die Frontmatter-Steuerung der Layout-Box kannte keinen Titel — behoben am 2026-09-05

`readFrontmatterControl` in `quartz-layout-box` las `hidden`, `file` und `html` — mehr nicht. Die
englischen Seiten dieser Website konnten damit den *Inhalt* von vier der fünf Boxen austauschen,
aber nicht die Überschrift: „Über dieses Handbuch“ und „Weiterlesen“ standen auch dort deutsch über
englischem Text. Der Preis für den Inhalt war ebenfalls gemessen: **876 Zeilen Frontmatter in 126
Dateien**, in jeder Datei dieselben vier Blöcke.

Das Plugin hat beides nachgeholt (Commit `503041f`). Die Steuerung nimmt jetzt zusätzlich `title`,
`collapsible` und `collapsed`, und eine neue Option `byLang` hält je Sprache einen Satz Optionen
bereit, ausgewählt über `fileData.frontmatter.lang` — Quartz' eigenes Feld, also ohne Abhängigkeit
zu einem Mehrsprachigkeits-Plugin. Die Rangfolge ist Frontmatter → `byLang` → Grundoptionen.
`{{locale}}` nennt seitdem die Sprache der Seite statt die der Website, und `{{lang}}` liefert davon
den vorderen Teil.

Umgestellt: vier `byLang`-Einträge in `plugins.mjs` und in `quartz.config.yaml`, die 876 Zeilen aus
den Notizen entfernt. Gemessen am gebauten Ergebnis: `/en/formatting/text/emphasis` trägt „About
this handbook“, „Read on“ und `Language: en-US`, die deutsche Schwesterseite unverändert ihre drei
deutschen Fassungen; die beiden Demo-Seiten behalten ihren Frontmatter-Inhalt und bekommen die
Überschrift aus `byLang` — die Rangfolge also am Ergebnis belegt.

### 31. Seiten ohne Frontmatter lassen sich nicht als Übersetzung verknüpfen

Eine `.base`- oder `.canvas`-Datei ist kein Markdown und trägt keine Kopfzeilen, also weder
`translationKey` noch `aliases`. Bleibt die Pfad-Strategie, und die verlangt denselben Basispfad in
beiden Sprachen — den es hier nicht gibt, weil die englischen Pfade englisch sind. Gemessen: Auf
allen vier solchen Seiten bietet der Umschalter die Startseite der anderen Sprache an statt der
entsprechenden Datei. Kein Fehler des Plugins, sondern die Grenze der Verankerung im Frontmatter.

### 32. Ressourcen-Stylesheets stehen ungeschichtet *hinter* `custom.scss`

Die Regel, auf der diese Vorlage überall aufbaut — Komponenten-CSS liegt in `@layer quartz-base`,
`custom.scss` liegt ungeschichtet dahinter und gewinnt deshalb unabhängig von der Spezifität — gilt
nicht für alles, was Quartz ausliefert. Der Kopierknopf am Codeblock wird in
`static/resource-style-….css` gestaltet: **kein Layer**, und im `<head>` *nach* `index.css`
verlinkt. Bei gleicher Spezifität entscheidet die Reihenfolge, also das Plugin:

```css
.clipboard-button { float: right; border: 1px solid; border-color: var(--dark);
                    background-color: var(--light); margin: .3rem; padding: .4rem }
```

Gemessen: Mit `border: none`, `background: transparent` und `appearance: none` in dieser Vorlage
meldete der Knopf weiterhin `border-width: 1px` und `rgb(252,252,250)` — und malte sie auch. Selbst
ein Inline-`style` änderte nichts, weil die spätere Regel dieselbe Kaskadenebene hat und *nach* ihr
gelesen wird. Ein Nachfahre im Selektor (`pre .clipboard-button`) hebt es auf.

Die Suche danach war der eigentliche Aufwand: Ein Durchlauf über `document.styleSheets`, der jede
passende Regel meldet, fand die Stelle nicht — die Ressourcen-Stylesheets stehen dort zwar in der
Liste, aber der Treffer ging in einem zu engen Filter unter. Gefunden hat sie erst `grep` über die
ausgelieferten Dateien. Merke: Wenn keine Regel es erklärt, ist der Suchraum falsch, nicht der Wert.

### 33. Ein `<p>` in einer Titelzeile verschiebt das Icon daneben

Der Callout-Titel ist eine Flex-Zeile mit `align-items: center` aus Icon und
`.callout-title-inner`. Beide Kinder waren sauber auf der Zeilenmitte — gemessen 453,4 px für die
Zeile, für das Icon und für die innere Box. Nur der Text saß bei 445,4: Quartz packt den Titel in
ein `<p>`, das seinen Absatzrand behält, wodurch die innere Box 41,6 px hoch wurde und der Text
darin oben klebte. Sichtbar war es als ein Icon, das acht Pixel zu tief zu hängen schien — es hing
richtig, der Text stand zu hoch. `margin-block: 0` auf die Kinder der inneren Box, und alle drei
Mitten fallen zusammen.

### 34. Eine Rinne in `rem` kann ein Zwölf-Spalten-Raster breiter machen als das Telefon

Elf Rinnen sind die Mindestbreite eines Zwölf-Spalten-Rasters, unabhängig davon, was darin steht
und über wie viele Spalten es geht. Beim Wechsel der Rinne von 20 px auf 2 rem ergab das mobil
11 × 32 + 40 px Rand = 392 px in einem 390 px breiten Fenster. Gemessen: **jede** der 333 Seiten
scrollte bei 390 px um 18 px seitwärts; das Raster selbst war 392 px breit und begann bei x = 16.

Die mobile Breite behält deshalb 20 px. Sichtbar ist die Spaltenrinne dort ohnehin nicht — mobil
spannt jeder Bereich über alle zwölf Spalten —, es arbeitet nur die Zeilenrinne, und die behält die
vollen 2 rem.

### 35. Ein `<summary>` als Bedienelement rechnet als `content-box`

Beim Sprachumschalter schon aufgeschrieben (Befund 27), hier noch einmal als Regel: Ein `<button>`
bekommt `box-sizing: border-box` vom Browser, ein `<summary>` nicht. Wer beiden dieselbe
`min-height` gibt, bekommt zwei verschiedene Höhen, sobald Innenabstand im Spiel ist — und den
setzt in diesem Fall das Plugin, dessen Padding nur halb überschrieben war.

### 36. Fünf von neun Farben des Syntax-Themas halten den Kontrast nicht

Eine gemessene Palette sagt nichts über die Farben, die ein *Syntax-Thema* mitbringt — die kommen
nicht aus `quartz.config.yaml`, sondern aus shiki, und sie stehen nirgends in einem Stylesheet.
Gezählt wurde deshalb über die gebaute Site: jeder `--shiki-light`- und `--shiki-dark`-Wert auf
allen 333 Seiten, mit Häufigkeit und Kontrast gegen die Codefläche.

| hell | Anzahl | Kontrast | | dunkel | Anzahl | Kontrast |
| --- | ---: | ---: | --- | --- | ---: | ---: |
| `#24292E` | 1179 | 12,76 | | `#E1E4E8` | 1179 | 10,34 |
| `#005CC5` | 260 | 5,47 | | `#79B8FF` | 260 | 6,35 |
| `#22863A` | 206 | **4,02** | | `#85E89D` | 206 | 8,81 |
| `#032F62` | 148 | 11,51 | | `#9ECBFF` | 148 | 7,81 |
| `#D73A49` | 112 | **3,98** | | `#F97583` | 112 | 4,96 |
| `#E36209` | 82 | **3,04** | | `#FFAB70` | 82 | 7,10 |
| `#6F42C1` | 48 | 5,66 | | `#B392F0` | 48 | 5,20 |
| `#6A737D` | 4 | **4,19** | | `#6A737D` | 4 | **2,74** |
| `#B31D28` | 2 | 5,85 | | `#FDAEB7` | 2 | 7,48 |

Korrigiert sind die fünf fetten Werte, jeweils unter Beibehaltung von Farbton und Sättigung; nur
die Helligkeit wandert. Das Ergebnis liegt zwischen 4,69 und 4,74 und wird seither mitgeprüft —
`palette.mjs` liest die Werte aus `body-code.scss`, so wie es die Callout-Farben aus
`body-callouts.scss` liest. 78 Paare wurden zu 83.

Der technische Haken: shiki schreibt die Farbe **inline an jedes `<span>`**, als zwei
Custom-Properties. Eine Inline-Deklaration schlägt jede Autorenregel, die nicht `!important` ist —
das ist hier kein Abkürzen, sondern der einzige Hebel. Überschrieben wird die *Variable*, nicht
`color`, damit Quartz' eigene Hell-Dunkel-Umschaltung weiterarbeitet.

Was offen bleibt: Eine Sprache, deren Tokens eine zehnte Farbe erzeugen, käme ungemessen herein.
Die Zählung ist mit einem `grep` über `public/` wiederholbar, aber sie läuft nicht automatisch —
die Farben existieren erst nach einem Build.

### 37. Welches Element den Explorer rollt, entscheidet der Browser

Quartz gibt der inneren Liste `max-height: 100%`. Chrome löst die Prozentangabe gegen
`.explorer-content` auf, die Liste wird damit selbst zum Rollcontainer und der Kasten darum rollt
nie. Firefox löst sie nicht auf — die Höhe des Elternteils ist `auto` mit einem Maximum —, die
Liste wächst auf ihre volle Höhe und der **Kasten** rollt.

Gemessen auf derselben Seite, gleiches Fenster:

| | rollendes Element | `.explorer-content` | `ul.explorer-ul` |
| --- | --- | --- | --- |
| Chrome | die Liste | 540 px, Überlauf 0 | 540 px, Überlauf 148 |
| Firefox | der Kasten | 540 px, Überlauf 148 | 688 px, Überlauf 0 |

Alles, was diese Vorlage an das Rollen hängt — Maske, `overscroll-behavior`, `scrollbar-width` und
seit dem 05.09.2026 die scroll-getriebene Kante —, sitzt auf `.explorer-content`. In Chrome traf
das ein Element, das gar nicht rollt; die Kante konnte dort nie animieren, und das sah aus wie
„die Absoftung ist verschwunden".

Behoben, indem die Liste ihre Deckelung aufgibt (`max-height: none; overflow: visible`). Danach
rollt in beiden Browsern derselbe Kasten, mit demselben Überlauf von 148 px.

### 38. Ein `animation`-Kurzbefehl ohne Timeline ist nicht wirkungslos, er springt ans Ende

Nicht jede Engine kennt scroll-getriebene Animationen; `CSS.supports('animation-timeline',
'scroll()')` war in Firefox 155 `false` — das ist die Version, an der das gemessen wurde. Welcher
Browser sie in welcher Fassung kann, entscheidet `@supports`, nicht eine Liste in dieser Datei. Der naheliegende Gedanke — „dann passiert dort eben
nichts" — ist falsch. `animation-timeline` und `animation-range` werden beim Parsen verworfen, der
`animation`-Kurzbefehl bleibt stehen, läuft mit der Vorgabe **null Sekunden** und landet wegen
`fill: both` sofort auf dem Endbild.

Gemessen in Firefox 155: `--tpl-fade-start: 20px`, `--tpl-fade-end: 0px` und eine Maske, die zu
`transparent 0px, black 0px, …` ausrechnete — die weiche Kante war an *beiden* Enden weg statt nur
statisch. Der Kopfbereich saß aus demselben Grund dauerhaft in seiner kleinen Form.

Beides stand danach hinter `@supports (animation-timeline: scroll())`. Ohne Timeline greifen dann
die Ausgangswerte: Kante an beiden Enden, Kopf in Ruhegröße.

**Nachtrag vom selben Tag:** Für die Kante ist der ganze Apparat wieder verschwunden. Was sie
eigentlich leisten sollte — dass die erste und die letzte Zeile in voller Stärke lesbar sind —
leistet ein Innenabstand, der so tief ist wie der Verlauf: Am Anfang steht die erste Zeile dann
*unter* dem Verlauf statt darin, am Ende die letzte darüber. Eine Zeile CSS statt zwei registrierter
Eigenschaften, zweier Keyframes und einer `@supports`-Klammer, und in jedem Browser gleich. Der
Befund bleibt trotzdem stehen, denn der Kopfbereich schrumpft weiterhin über eine Scroll-Timeline —
und die Falle mit den null Sekunden gilt dort unverändert.

### 39. `initial-value` einer registrierten Eigenschaft darf kein `rem` enthalten

`@property` verlangt einen *computationally independent* Anfangswert: keine `em`, keine `rem`,
keine Prozente. Chrome nimmt `initial-value: 0.5rem` trotzdem an, Firefox verwirft die ganze
`@property`-Regel — der Name bleibt unregistriert, und jedes `var()`, das ihn liest, wird beim
Berechnen ungültig.

Gemessen: In Firefox hatte der Kopfbereich `padding-block: 0px` und einen 16-px-Titel, also
*kleiner* als seine eigene Schrumpfform, weil beide Deklarationen weggeworfen wurden. Mit `8px` und
`22.4px` als Anfangswerten — denselben Zahlen, nur einheitenfest — stimmt es in beiden Browsern.
Die Keyframes dürfen weiterhin die Tokens verwenden; nur der Anfangswert nicht.

### 40. Die installierten Frames waren älter als der `center`-Fix — und Mermaid starb daran

Quartz' eigene Frames rendern `<div class="center …">`, und Client-Skripte verlassen sich darauf.
Der Mermaid-Initialisierer beginnt mit

```js
document.querySelector(".center").querySelectorAll("code.mermaid")
```

— ohne Null-Prüfung. Die App erzeugt die Klasse seit `5c05ea0` (2026-09-04) mit, die drei Frames im
Beispielprojekt stammten aber von davor. Gemessen im Browser: auf **jeder** Seite der Website
`Cannot read properties of null (reading 'querySelectorAll')`, kein einziges der 30 Diagramme
gerendert, und weil der Fehler in der `nav`-Behandlung fliegt, brach er die danach registrierten
Komponenten-Skripte gleich mit ab.

Der Fund ist keiner am Code, sondern an der Arbeitsweise: Ein Frame ist **erzeugter Code, der im
Projekt liegen bleibt**. Ein Fix in der App erreicht ein bestehendes Projekt erst, wenn die Frames
neu erzeugt werden (`--only 3`). Für die Vorlage heißt das: Nach jeder Änderung an
`layoutFrameService.ts` gehört ein `--only 3` dazu, sonst misst man eine alte Fassung.

### 41. Das Excalidraw-Plugin stand seit dem Einbau auf `enabled: false`

Der Konfigurationseintrag musste von Hand geschrieben werden (Befund 9), und dabei blieb er
ausgeschaltet. Die Folge war auf der Zeichnungsseite zu lesen: Statt der Zeichnung stand dort der
Rohtext der `.excalidraw.md` — beginnend mit „⚠ Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu
of this document." Ausgerechnet auf der Seite, die das Format vorführt.

Eingeschaltet rendert das Plugin die Zeichnung als SVG mit eigenen Bedienelementen (Zoom, Reset)
und **eigenem Frame**: Die Seite verliert Explorer und Seitenapparat und zeigt nur die Zeichnung.
Das ist die Entscheidung des Plugins, nicht die der Vorlage — ob das so bleiben soll, ist noch
nicht entschieden.

### 42. Die Sankey-Farbreihe traf jeden Flowchart-Knoten und stufte nie

Zwei Fehler in vier Zeilen, beide erst sichtbar, als die Diagramme überhaupt rendern konnten.

`.mermaid .nodes rect:nth-of-type(4n + 1) { fill: var(--secondary) }` war für Sankey gedacht. Ein
Flowchart baut aber dieselbe Struktur (`g.nodes > g.node > rect`), also traf die Regel jeden
rechteckigen Flowchart-Knoten — und schlug dabei die Flowchart-Regel weiter oben um eine Klasse.
Die Beschriftung behielt `primaryTextColor`: **1,47:1 in hell, 1,31:1 in dunkel**, auf vier Seiten.
Struktur unterscheidet die beiden nicht; `aria-roledescription` tut es, und Mermaid schreibt es an
jedes Diagramm.

Der zweite Fehler steckte in der Zählung: `:nth-of-type` zählt unter Geschwistern, und jedes `rect`
ist das einzige in seinem `g.node`. Also passte **jeder** Knoten auf `4n + 1`, und die vier Töne
waren in Wahrheit einer. Gezählt wird jetzt an den `g.node`-Elementen, die wirklich Geschwister
sind. Seitdem: 7 Sankey-Knoten in 4 Füllungen, und 50 Diagramm-Beschriftungen ohne ein Paar unter
der Schwelle (knappste 9,63:1 hell, 9,15:1 dunkel).

Die Lehre ist die dritte: Eine Regel, die eine Diagrammart meint, muss sie auch benennen. Mermaid
gibt allen Arten dieselben Klassennamen.

### 43. Der Content-Symlink schaltet Quartz' git-Datumsangaben still ab

Das gilt nicht nur für diese Vorlage: **die Symlink-Strategie ist die, die QuartzControl als
Vorgabe anbietet**, und sie nimmt jedem so angelegten Projekt die git-Daten.

Der Bau warnte für **250 der 254 Seiten** mit `isn't yet tracked by git, dates will be inaccurate`.
Die vier stummen Seiten sind die mit `lastmod` im Frontmatter: `modified ||= await …` wertet rechts
nur aus, wenn links leer ist, also fragen sie git gar nicht erst.

`@quartz-community/created-modified-date` sucht sein Repository mit
`Repository.discover(ctx.argv.directory)`, und `directory` ist `content` — der Symlink. libgit2 löst
ihn auf und findet damit das Repo des **Vaults** (`workdir: ~/Obsidian/QuartzProjekte/Example/`).
Den Dateipfad rechnet das Plugin danach aber weiter gegen das Projektverzeichnis:
`path.relative(workdir, "content/en/…")` löst das relative Argument gegen das Arbeitsverzeichnis auf
und liefert `../../../Documents/Example/content/en/…` — einen Pfad, der aus dem Vault wieder
herausführt. Jede Abfrage wirft. Gegenprobe mit dem Pfad, wie ihn der Vault kennt
(`en/formatting/special/escapes.md`): `1788573656000`. Das Repository weiß es, es wird falsch
gefragt.

In einem gewöhnlichen Quartz-Projekt fällt das nie auf, weil `content/` dort im Repo liegt und die
Rechnung aufgeht. Kaputt ist sie genau dann, wenn `content/` aus dem Repo herauszeigt.

Gemessen sind beide Enden. Erstens: Das Datum kam ohnehin aus `filesystem`, denn das steht als
dritte Quelle in der Liste — der gerenderte Zeitstempel trug Millisekunden (`03:41:43.937Z`, eine
mtime). `git` aus der Prioritätenliste zu streichen ändert also nichts am Ergebnis, nur an den 250
Zeilen Lärm. Zweitens: ein `fs.realpathSync()` an der einen Stelle
(`path.relative(repositoryWorkdir, fs.realpathSync(fullFp))`) baut mit **0 Warnungen** und
sekundengenauen Zeitstempeln (`03:43:04.000Z`, ein Commit). Der Patch wurde danach zurückgenommen —
ein von Hand geändertes `node_modules` verschwindet beim nächsten `npm install` still.

Die Vorlage steht deshalb jetzt auf `priority: [frontmatter, filesystem]`, mit der Begründung an
beiden Stellen (`plugins.mjs`, `quartz.config.yaml`). Was dabei verloren geht, ist keine Anzeige,
sondern Haltbarkeit: eine mtime überlebt kein `rsync`, kein Restore und kein frisches Auschecken,
ein Commit-Datum schon. Sobald der Fix upstream ist, gehört `git` wieder vor `filesystem`.

Für die App bleibt die Frage offen, ob der Content-Tab das sagen sollte, wenn er einen Symlink
anbietet.

### 44. Der `index`-Frame blendete eine Spalte aus, die nicht leer ist — behoben

Gefunden beim Durchgang durch die Dokumentation, weil die Seite über die Frames behauptete, die
rechte Spalte einer Ordnerseite bleibe „frei, aber reserviert". Sie ist nicht frei: Gemessen an
`/formatierung/` stehen dort **Rückverweise und die Graphansicht**.

`frame-index` setzt für Tablet und Mobil `display: none` auf `area-right`. Gemessen bei 900 und bei
390 px: `0×0`. Damit verlieren alle Ordner-, Tag- und Bases-Seiten unterhalb von 1100 px ihre
Rückverweise und ihren Graph vollständig. `frame-editorial` macht es richtig — dort wandert die
Spalte in eine eigene Zeile unter den Text (`row 5, col 4–12`) und bleibt lesbar.

Kein Entwurf, sondern ein Versehen mit nachvollziehbarer Ursache: Wer glaubt, die Spalte sei leer,
für den ist Ausblenden richtig.

**Behoben am 05.09.2026.** `frames.mjs` gibt `index` für Tablet und Mobil dieselbe Zeile für
`area-right` wie `editorial` (Tablet `row 5, col 4–12`, Mobil `row 6, col 1–12`), eingespielt über
`--only 3` — denn ein Frame ist erzeugter Code, der im Projekt liegen bleibt (Befund 40). Gemessen
danach an Ordner-, Tag- und Bases-Seite bei 1400, 900 und 390 px: Die Spalte steht überall,
Rückverweise und Graph inbegriffen, und `display: none` kommt im erzeugten Stylesheet nur noch für
`.mobile-only` und `.desktop-only` vor. Die beiden Frames sind damit geometrisch gleich; getrennt
bleiben sie, weil der Layout-Editor Seitentypen über den Frame-Namen zuordnet.

### 45. Das Suchfeld erreichte seine Breite nie — behoben

`nav-toolbar.scss` gibt der Suche `flex: 0 1 15rem`. Gemessen sind es **110 px** — bei 1728, 1440,
1100 und 900 px Fensterbreite gleichermaßen, obwohl die Werkzeugleiste dort nur 322 von 1400 px
belegt.

Die Ursache steht eine Ebene tiefer: Quartz legt um jede Komponente einen eigenen `div` ohne Klasse.
Der ist `flex: 0 1 auto` und schrumpft auf seinen Inhalt; die 15 rem an `.search` darunter kommen nie
zum Tragen. Die Kette, gemessen im Browser:

```
button.search-button   110px  flex: 0 1 auto
div.search             110px  flex: 0 1 240px   ← hier stehen die 15 rem
div (ohne Klasse)      110px  flex: 0 1 auto    ← und hier scheitern sie
div.flex-component     322px
```

Damit las sich der Knopf als Knopf statt als Feld — genau das, was die Breite verhindern sollte.

**Behoben am 05.09.2026**, und nicht im Stylesheet: Die Flex-Werte des Wrappers sind ein
**Inline-Stil**, den Quartz aus der Konfiguration schreibt, und ein Inline-Stil schlägt jedes
Stylesheet. Die Breite steht deshalb jetzt in `layout.groupOptions.basis` des Such-Plugins.

Dazu gehört `shrink: false`, und das war der zweite Anlauf: Mit `basis` allein maß das Feld zwar
240 px, aber ein schrumpfbares Element steuert nur seine *Inhaltsbreite* zur intrinsischen Größe
seiner Gruppe bei. Die Gruppe blieb bei 322 px, während ihre Kinder 452 wollten, die Leiste brach
auf zwei Zeilen um und der Kopfbereich wuchs von 61 auf 101 px — auf jeder Seite. Mit `shrink: false`
misst die Gruppe 452 px, die Leiste ist eine Zeile, der Kopf wieder 61 px.

Am Telefon nimmt `nav-toolbar.scss` die Breite mit `!important` wieder weg; ohne das stand dort eine
216 px breite Box um einen 44-px-Knopf (gemessen bei 480, 390 und 360 px). Der Kommentar daneben
sagt, warum es hier keinen anderen Weg gibt — anders als bei den übrigen `!important` dieser
Vorlage, die alle gegen ein fremdes Stylesheet arbeiten und nicht gegen einen Inline-Stil.

### 46. Was der Doku-Durchgang an Quartz-Fehlern fand

Vier Dinge, die keine Vorlage heilen kann, alle an der gebauten Seite gemessen und jetzt an Ort und
Stelle dokumentiert:

| Was | Gemessen | Wo es steht |
| --- | --- | --- |
| `parseArrows` wandelt nichts | `-->` bleibt Rohtext; mit *GitHub flavored markdown* wird daraus zusätzlich `—>`, weil dessen Bindestrich-Ersatz zuerst greift | `formatierung/besonderes/pfeile-und-emoji` |
| Inline-Fußnoten | `^[Text]` steht als Rohtext auf der Seite, in Obsidian als Fußnote | `formatierung/fussnoten/varianten` |
| Links in einem Canvas-Dateiknoten | Ordner der eingebetteten Notiz doppelt vorangestellt; 6 kaputte Links je Sprache | `obsidian-formate/canvas/index` |
| Ein Tag im Fließtext | `../.././../tags/inline-tag` — ein `../` zu viel, während dasselbe Tag in der Liste stimmt | `formatierung/besonderes/pfeile-und-emoji` |

Dazu eine Behauptung, die nur woanders stimmt: Ein HTML-Kommentar überlebt hier **nicht** ins
ausgelieferte HTML, Quartz entfernt ihn wie den `%%`-Kommentar.

Von den 16 kaputten Links der gebauten Website sind damit 14 erklärt und zwei Absicht (die
Wikilink-Demo).

---

## Durchgang 2026-09-06

### 47. Eine breitere Rinne macht die Randspalten schmaler — und `1fr` kann das nicht ausdrücken

Bei zwölf `1fr`-Spalten liegen elf Rinnen im selben Budget wie die Spalten selbst. Wer die Rinne
von 2 rem auf 4 rem hebt, nimmt damit 352 px aus den Spalten heraus: gemessen wanderten die beiden
Randspalten von 326 px auf 302 px, ohne dass jemand die Spaltenbreite angefasst hätte.

Ein festes Maß ist in einem Spaltenraster deshalb **keine Drittelung**: Zwischen drei Spuren liegen
zwei Rinnen, die zum Block gehören. Die Spur ist `(300px − 2 × Rinne) / 3`, in `frames.mjs` als
`calc((300px - 8rem) / 3)` — ein `calc()` ohne Komma ist im Frame-Schema erlaubt, `minmax(0, 1fr)`
nicht. In der App steht dasselbe Feld unter *Layout → Eigene Frames → Spaltenbreiten (leer = 1fr)*,
ein Eingabefeld je Spur.

Nebenbefund: Nur `editorial` war auf 4 rem umgestellt, `index` und `focus` standen weiter auf 2 rem.
Eine Ordnerseite legte ihren Text damit 32 px weiter links an als der Artikel, der auf sie verlinkt
— genau das, was die reservierte rechte Spalte verhindern soll. Jetzt teilen sich alle vier Frames
eine Rinne.

### 48. Der Frame, den ein Seitentyp-Plugin mitbringt, ist keine benutzbare Seite

Zwei Plugins, zwei verschiedene Arten, dieselbe Sache falsch zu machen — beide an der gebauten Site
gemessen:

- **Canvas** hatte gar keinen eigenen Frame und fiel auf Quartz' eingebauten `full-width` zurück.
  Dessen `.center` hat keine definierte Höhe, `.canvas-page` und `.canvas-container` sind aber
  `height: 100%`. Die Prozentangabe löst gegen nichts auf, der Kasten fiel zusammen — gemessen
  406 px für eine Zeichnung, die 807 px hoch sein wollte — und Kopfbereich, Fußzeile und die
  „Weiterlesen"-Box wurden **über** die Zeichnung gemalt statt um sie herum.
- **Excalidraw** bringt einen eigenen Frame mit, und der rendert überhaupt keine Kopfleiste: kein
  Link zur Startseite, keine Suche, kein Farbschema, keine Brotkrumen. Der einzige Weg aus der
  Seite war der Zurück-Knopf des Browsers. Seine eigene Antwort darauf ist ein Burger-Knopf, der
  eine 300 px breite Schublade mit den Bausteinen der *linken* Spalte öffnet — die in dieser
  Vorlage für eine 335-px-Spalte gemacht sind und am Fensterrand abgeschnitten wurden.

Beide bekommen jetzt den `drawing`-Frame der Website (`frames.mjs`, `layout.mjs`): Kopfleiste,
Brotkrumen und Titel, die Zeichnung, was danach kommt, Fußzeile — jedes in seiner eigenen Zeile,
auf denselben 1440 px wie jede andere Seite. Die Randspalten sind im Frame verborgen *und* über
`positions: { left: [], right: [] }` geleert, damit sie gar nicht erst gebaut werden. Die Höhe der
Zeichnung ist keine Rasterfrage — `1fr` in einem Raster ohne eigene Höhe ist die Höhe des Inhalts,
und die fehlte ja gerade — und steht in `styles/page-canvas.scss` als
`clamp(320px, 72dvh, 900px)`. Die Bedienelemente beider Plugins sind `position: fixed`, was unter
ihren Vollbild-Frames dasselbe war wie „an der Zeichnung"; hier wären sie über der Kopfleiste
geschwebt, also stehen sie jetzt `absolute` im Container.

### 49. Der Explorer stellt den Scrollstand der *Liste* wieder her — und die stand nicht mehr zur Verfügung

Das Plugin kann, was der Nutzer vermisst hat:

```js
prenav: sessionStorage.setItem("explorerScrollTop", document.querySelector(".explorer-ul").scrollTop)
render: let l = sessionStorage.getItem("explorerScrollTop")
        if (l) n.scrollTop = parseInt(l, 10)
        else n.querySelector(".active")?.scrollIntoView({ behavior: "smooth" })
```

Diese Vorlage hatte die Rolle des Rollers aber auf `.explorer-content` verschoben, um einen
Browser-Unterschied zu glätten (BEFUNDE 37). Damit las das Plugin bei jedem Seitenwechsel `0` — und
weil `"0"` als Zeichenkette *wahr* ist, lief auch der `else`-Zweig nie, der sonst die aktuelle Seite
in den Blick geholt hätte. Gemessen: Klick auf eine Datei vier Ordner tief, und der Baum stand
danach wieder ganz oben. Beim Ordner genauso — dort navigiert der Klick unter
`folderClickBehavior: 'link'` ja auch —, beim Pfeil nicht, weil der nichts lädt.

Der Browser-Unterschied ist jetzt andersherum gelöst: `ul.explorer-ul` bekommt eine **absolute**
`max-height`, die Firefox genauso auflöst wie Chrome, und ist damit wieder der Roller.
`.explorer-content` ist nur noch der Kasten, an dem das Einklappen hängt. Nachgemessen: Scrollstand
200 px, Klick auf eine Datei, Scrollstand danach 200 px.

### 50. `.overflow-end` steht am Anfang der Liste, nicht am Ende

Der Sentinel, den der Explorer für seinen eigenen Verlauf-Verlauf beobachtet, ist das **erste**
`<li>` der Liste und bleibt es auch, nachdem der Baum gebaut ist. Mit einer Höhe sind das 16 px
Nichts zwischen der Überschrift und dem ersten Ordner. Zusammen mit den 20 px Rand, die der weiche
Rand der Leiste braucht, waren es 36 px — der Grund, aus dem der Abstand zu groß aussah. Der
Sentinel behält sein Element und gibt seine Höhe ab; `--tpl-fade` sinkt von 20 auf 14 px. Bleiben
14 px.

### 51. Zwei Regeln versteckten den englischen Explorer-Baum doppelt

Hausgemacht, aus BEFUNDE 26. Die erste Regel blendet den `en`-Ast unbedingt aus — das muss sie
sein, weil eine Weiterleitungsseite ohne `<html lang>` sonst beide Bäume zeigte. Die zweite Regel
blendet auf einer englischen Seite alles *außer* dem `en`-Ast aus. Zusammen: alles. Gemessen auf
`/en/`: sechs Einträge oberster Ebene, alle `display: none`, unter einer Überschrift „Explorer",
die brav dastand. Der Baum war die ganze Zeit gerendert.

Die englische Fassung nimmt die erste Regel jetzt ausdrücklich zurück. Die Lehre ist dieselbe wie
in BEFUNDE 22: Wo eine unbedingte Regel etwas versteckt, muss die Ausnahme **beide** Zustände
aussprechen.

### 52. Der Titel einer Galerie-Kachel liegt über dem Bild und zählt nicht zu ihrer Höhe

Das Bases-Plugin setzt `.bases-gallery-title` auf `position: absolute; inset: auto 0 0` und die
Kachel auf `overflow: hidden`. Solange jede Kachel denselben grauen Platzhalter zeigt, fällt das
nicht auf. Mit echten Titelbildern zweimal:

- Die Beschriftung ist `--dark`, im hellen Modus also fast schwarz — auf einem Titelbild beliebiger
  Farbe.
- Ein zweizeiliger Titel läuft aus der Kachel heraus und wird mitten im Wort abgeschnitten, weil
  ein absolut positionierter Titel nichts zur Höhe seiner Kachel beiträgt. Gemessen: Kachel 145 px,
  Bild 143 px, Titel 62 px.

Die Vorlage holt ihn zurück in den Fluss (`position: static`, Kachel als zweizeiliges Grid). Damit
liest sich die Galerie wie die Kachelansicht derselben Daten, die Beschriftung steht auf dem Grund
der Karte, und ein Titel beliebiger Länge macht seine Kachel höher.

Dabei zwei Kleinigkeiten am selben Ort: Ein `<img>` in einer fremden Komponente erbt die 16 px
Absatzabstand aus `body-media.scss` — in einer randlos gedachten Karte ist das ein Streifen
Kartengrund über dem Bild. Und die Kachelansicht führte `title` in ihrer Spaltenliste, obwohl die
Karte den Titel schon als Überschrift trägt; die Zeile „Title — Ablauf-Diagramme" stand also
zweimal dasselbe da.

### 53. Ein Seitentyp ohne `-page` im Namen ist jetzt in der App erreichbar — BEFUNDE 10 behoben

`derivePageTypes()` erkannte einen Seitentyp nur am Namensmuster `<name>-page`. Das ist eine
Konvention, keine Regel: `obsidian-plugin-excalidraw` registriert den Seitentyp `excalidraw` und
trägt `quartz.category: ["pageType", …]`. Quartz baut ihn trotzdem, der Layout-Editor der App bot
ihn aber nicht an, und der Frame dieses Seitentyps war nur über die YAML zu wählen.

Die Funktion nimmt jetzt die ganze Config und zählt zusätzlich jeden Schlüssel, der bereits unter
`layout.byPageType` steht — ein Seitentyp durch Vorführung. Damit ist die Ausnahme keine Liste von
Ausnahmen, und `excalidraw` steht in der App unter *Layout → Seitentypen*.

### 54. Der Layout-Board der App zeigt die rechte Spalte am Tablet als umbrechende Reihe — offen

`sidebarDirection()` (`src/routes/LayoutEditor/utils.ts`) gibt für `right` auf Tablet und Mobil
`'row'` zurück, für `left` nur auf Mobil. Das stimmt für Quartz' eigenes `base.scss`, aus dem es
abgelesen ist — und nicht für ein Projekt mit selbstgebauten Frames: `.qgframe-area` ist auf jedem
Breakpoint `flex-direction: column`. Auf dem Tablet-Reiter des Boards stehen die Bausteine der
rechten Spalte deshalb nebeneinander und brechen um, während sie auf der Website untereinander
stehen. Kein Datenfehler, aber die Vorschau widerspricht dem Ergebnis.

### 55. Beim Rollen *in* der rechten Spalte lief die Überschrift mit bis an den Header

Die Spalte klebt unter der Kopfleiste und rollt ihren Inhalt selbst — und nahm dabei alles mit, die
Überschrift des Panels eingeschlossen. Gemessen mit dem Zeiger über dem Inhaltsverzeichnis: Das Wort
„INHALTSVERZEICHNIS" wanderte bis 10 px unter die Linie und löste sich dort im oberen Verlauf auf.
Übrig blieb eine Liste von Überschriften, an der nichts mehr sagte, was für eine Liste das ist.

Die linke Spalte hatte das Problem nie: Dort ist die Überschrift des Explorers ein *Geschwister* des
Baums, keine Zeile darin, also rollt der Baum und das Wort „Explorer" bleibt stehen. Die rechte
Spalte bekommt dasselbe Verhalten mit den Mitteln, die sie hat — jede Panel-Überschrift klebt am
oberen Rand des Rollbereichs, die nächste schiebt sie hinaus, wenn sie ankommt.

Zwei Dinge gehören dazu, und ohne beide sieht es schlechter aus als vorher:

- **Ein deckender Grund.** Eine klebende Überschrift ohne eigenen Hintergrund lässt die Liste durch
  ihre Buchstaben gleiten.
- **Ein kurzer Verlauf darunter.** Eine deckende Kante allein *schneidet* eine Zeile in der Mitte
  durch: Die Zeilen der Gliederung sind 30 px hoch, die Überschrift 44, und was gerade darunter
  hindurchgeht, wird quer durch seine Buchstaben abgeschnitten und liest sich als Durchstreichung.
  Gemessen an „Struktur und Rhythmus" bei Rollstand 174. Der Verlauf löst dieselbe Zeile auf statt
  sie zu zerschneiden.

Weil oben nun nichts mehr erscheinen kann, braucht die Spalte dort auch keinen Verlauf mehr: Sie
bekommt `--tpl-fade-mask-end`, dieselbe Maske ohne ihre obere Hälfte, und Polsterung nur noch unten.
Damit fällt zugleich die negative Marge weg, mit der die obere Polsterung vorher ausgeglichen wurde,
und die beiden Spalten beginnen von selbst auf derselben Zeile — nachgemessen: beide bei y = 113,
beide Überschriften bei y = 113.

Verworfen wurde unterwegs die Variante „gar kein internes Rollen": Bei Rollstand 1500 war der ganze
Apparat aus dem Bild — Inhaltsverzeichnis, Rückverweise, Graph —, und genau dagegen ist die Spalte
überhaupt klebend.

### 56. Eine feste Spur kostet Mindestbreite, auch wo sie nichts trägt — hausgemacht, behoben

Beim Umstellen auf feste 300-px-Randspalten (BEFUNDE 47) bekamen die Spuren 1–3 *und* 10–12 an
jedem Breakpoint eine feste Breite. Am Tablet ist die rechte Spalte aber keine Spalte mehr: Sie
sitzt unter dem Text, und 10–12 gehören zum Fließtext. Eine feste Spur ist nicht stauchbar, also
hob jede von ihnen die Mindestbreite des Rasters — mit sechs festen Spuren kam es nicht unter
6 × 68 + 11 × 48 + 40 = 976 px.

Gemessen im systematischen Durchgang: **alle 32 geprüften Seiten** scrollten in einem 900-px-Fenster
92 px seitwärts, in beiden Farbschemata. Am Desktop war nichts davon zu sehen, weil dort genug Platz
ist — die Art Fehler, die ein Durchgang über mehrere Breiten findet und ein Blick auf die eigene
Fenstergröße nicht.

Am Tablet sind jetzt nur die linken drei Spuren fest. Nachgemessen über fünf Breiten (1456, 1101,
900, 801, 390) in hell und dunkel: kein seitliches Scrollen auf keiner Seite.

### 57. Der Lesemodus tat nichts

Quartz' Lesemodus ist eine Regel im Stylesheet des Plugins:

```css
:root[reader-mode=on] .sidebar.left, :root[reader-mode=on] .sidebar.right { opacity: 0 }
```

`.sidebar` ist, wie die *eingebaute* Anordnung von Quartz ihre beiden Spalten nennt. Ein Projekt mit
selbstgebauten Frames hat so ein Element nicht — die Bereiche heißen `.qgframe-area-left` und
`.qgframe-area-right` —, die Regel traf hier also nichts. Gemessen: Der Knopf setzte
`reader-mode="on"`, färbte sich selbst ein, und beide Seitenleisten standen unverändert da. Ein
Bedienelement, das nur sein eigenes Aussehen ändert, ist schlechter als keines.

Dieselbe Geste jetzt auf den Elementen, die diese Website hat, mit `:focus-within` als Zugabe, damit
die Leiste auch beim Durchtabben zurückkommt. Ausblenden statt Ausblenden-und-Platz-Wegnehmen ist
Quartz' Entwurf und der richtige: Es verschiebt sich nichts, das Lesemaß bleibt, und die Navigation
ist einen Zeiger weit weg.

Das ist derselbe Fehlertyp wie 53 und 56: Eine Annahme über die eingebaute Anordnung, die ein
selbstgebauter Frame nicht erfüllt. Wer eine Regel aus Quartz' `base.scss` abliest, muss prüfen, ob
ihr Selektor in einem Frame-Projekt überhaupt vorkommt.

### 58. Zweimal derselbe Interop-Unterschied im Kopfbereich — nur in Firefox und Safari sichtbar

Gemeldet als „Umbrüche der Elemente rechts im Header: in Chrome ist alles richtig". Reproduziert mit
Playwrights Firefox- und WebKit-Bauten gegen dieselbe gebaute Site, und es waren zwei Symptome
derselben Ursache.

**Die Ursache.** Die Werkzeugleiste ist eine Flex-Gruppe, und ihr Suchfeld bekam seine Breite über
`layout.groupOptions.basis: '15rem'` — also als Inline-`flex-basis` auf dem Wrapper, den Quartz um
jede Komponente einer Gruppe legt. Das *Element* ist damit in jeder Engine 240 px breit, gemessen in
allen dreien. Aber:

| | Chrome | Firefox | WebKit |
| --- | ---: | ---: | ---: |
| Suchfeld | 240 px | 240 px | 240 px |
| Beitrag zur max-content-Breite der Gruppe | 240 px | **110 px** | **110 px** |
| Breite der Gruppe | 452 px | **322 px** | **322 px** |

Gecko und WebKit rechnen einen `flex-basis` nicht in den max-content-Beitrag des Flex-Items ein, sie
nehmen dessen Inhaltsbreite — und 110 px ist genau die Breite, die das Feld ohne Vorgabe hätte
(steht seit 2026-09-04 als Messung in `nav-header.scss`). Die Gruppe war also 130 px schmaler als
ihr eigener Inhalt.

**Symptom eins:** Mit `wrap: 'wrap'` an der Gruppe brachen die vier Bedienelemente auf zwei Zeilen
um, der Kopf ging von 61 px auf 113 px — auf *jeder* Seite und bei jeder Breite von 900 bis 1456 px.

**Symptom zwei:** Mit `wrap: 'nowrap'` hörte der Umbruch auf, und stattdessen hing das letzte Kind
130 px aus dem Fenster: **jede Seite scrollte 102 px seitwärts** (94 px bei 900 px Fenster). Der
Kopf war 61 px hoch und sah in der Messung geheilt aus — die zweite Prüfung fand es nur, weil sie
auch auf seitliches Scrollen sah.

**Behoben** an der Wurzel: `width: 15rem` auf `.search` statt eines `flex-basis` auf dem Wrapper.
Eine Breite am Element macht die Inhaltsbreite des Wrappers zu 240 px, und darüber sind sich alle
drei Engines einig — nachgemessen: Gruppe 436 px in Chrome, Firefox und WebKit. `wrap: 'nowrap'`
bleibt trotzdem, weil eine umbrechende Flex-Gruppe auch sonst keine verlässliche Größe hat, und
`shrink: false` bleibt, damit das Feld seine Breite nicht an die Icon-Knöpfe abgibt.

Der ganze Durchgang danach in drei Engines: 38 Seiten × 3 Breiten × 3 Engines = 342 Aufrufe, kein
seitliches Scrollen, kein zu hoher Kopf, keine umgebrochene Gruppe.

**Die Lehre für die Arbeitsweise, und sie ist die eigentliche:** Der systematische Durchgang davor
lief in Chrome allein und meldete „nichts gefunden", während zwei Seitenleisten-breite Fehler
dastanden. Alles, was an intrinsischer Größe von Flexbox oder Grid hängt, muss in mindestens zwei
Engines gemessen werden. Die Bauten dafür liegen jetzt auf dem Rechner:

    node node_modules/playwright-core/cli.js install firefox webkit

### 59. Beide Zeilenabstands-Tokens waren seit dem Tag ihrer Einführung wirkungslos

Gemeldet als „die Änderung des Zeilenabstandes hat nicht angeschlagen". Sie hatte angeschlagen —
die Tokens standen richtig im Projekt und im gebauten CSS —, sie kamen nur nirgends an.

Quartz' eigenes `base.scss` schreibt vier feste Zeilenabstände:

```css
tbody, li, p         { line-height: 1.6rem }   /* 25,6px */
a.internal           { line-height: 1.4rem }   /* 22,4px */
<Tabellen-Wrapper> > * { line-height: 2rem }   /* 32px, also thead */
```

Ein Absatz, ein Listeneintrag und ein Tabellenkörper tragen damit ihren *eigenen* Wert, und ein
geerbter — mehr erzeugt eine Regel auf `body` oder auf einen Frame-Bereich nie — erreicht sie nicht.
Diese Vorlage setzte `--tpl-leading-normal` auf `body` und `--tpl-leading-snug` auf die drei
Kleinschrift-Bereiche; beides landete also auf den Elementen *zwischen* dem Text und der Seite,
während der Text selbst überall auf 25,6px stand. Gemessen an der gebauten Seite:

| | vorher | jetzt |
| --- | --- | --- |
| Explorer-Zeile | 14px / 25,6px (1,83) | 14px / 20px (1,43) |
| Datum unter einer Notiz | 12,5px / 25,6px (2,05) | 12,5px / 20px (1,60) |
| Absatz in der Layout-Box | 14px / 25,6px | 14px / 20px |
| Fußzeile | 14px / 25,6px | 14px / 20px |
| Tabelle: Kopf gegen Körper | 32px gegen 22,4px | beide 22,4px |
| Interner Link im Absatz | 22,4px in einem 25,6px-Absatz | 25,6px |
| Fließtext | 16px / 25,6px | 16px / 25,6px |

Die letzte Zeile ist die verräterische: `--tpl-leading-normal` stand auf 1.65 und rechnete zu
26,4px — angezeigt wurden trotzdem 25,6px, weil Quartz' `1.6rem` auf jedem `p` gewann. Die
Umstellung auf 1.6 hat deshalb *nichts* geändert, und zwar weil sie zufällig genau den Wert traf,
der ohnehin schon galt.

Behoben mit einer Regel, nicht mit sieben:

```scss
p, li, tbody, thead, tfoot, a.internal { line-height: inherit; }
```

`inherit` gibt die fünf Elemente an ihren Kontext zurück, und der Kontext ist genau das, was die
Tokens setzen. Ungeschichtet, also schlägt es `@layer quartz-base` unabhängig von der Spezifität —
die Regel, auf der diese Vorlage überall ruht. Was wirklich einen eigenen Wert will, sagt das
weiterhin über eine Klasse und gewinnt weiterhin: die 1,55 des Codeblocks, die 1 des
Brotkrumen-Trenners, das `normal` von Mermaid.

Die Lehre ist dieselbe wie in 57, nur teurer: Wer eine Eigenschaft über Vererbung setzt, muss
nachsehen, ob das Zielelement sie nicht selbst gesetzt bekommt. Ein Token, das nirgends ankommt,
sieht in der Datei genauso richtig aus wie eines, das wirkt.

### 60. Vier von 53 Tokens in der Variablen-Ansicht konnten kein Pixel bewegen

Nach BEFUNDE 59 lag die Frage nahe: Wenn zwei Tokens jahrelang ins Leere zeigten, wie viele noch?
Also gemessen statt gelesen — jedes Token in einer *laufenden* Seite auf einen unmissverständlich
anderen Wert gesetzt und gezählt, wie viele berechnete Werte sich über alle Elemente bewegen. Zwölf
Seiten, zwei Breiten, jeweils mit fokussiertem Bedienelement. Das Skript ist geblieben:
`npm run check:tokens`.

Ergebnis: **vier tot**, und jedes auf seine eigene Art.

- `background-modifier-border`, `-hover` und `-focus`. Der Kommentar daneben behauptete, das seien
  „genau die Variablen, die Quartz für den Rand eines Bedienelements benutzt". Nachgezählt im
  gebauten CSS: Jede der drei wird **zweimal deklariert** — einmal von Quartz' eigenem Theme-Block,
  einmal von dieser Überschreibung — und von **keinem** `var()` gelesen, weder in Quartz noch in
  einem Komponenten-Plugin. Drei Regler in der App, die nichts regeln. Entfernt; die Pflicht, die
  sie tragen sollten, trägt `--tpl-rule-control`, und die ist gemessen.
- `titleFont`. Wird sehr wohl gelesen, und zwar von Quartz für `.page-title` — die Wortmarke. Nur
  hatte `nav-header.scss` dieselbe Eigenschaft ungeschichtet mit `--headerFont` gesetzt, und
  ungeschichtet schlägt `@layer quartz-base`. Die Vorlage hat sich das Token also selbst
  abgeschnitten. Jetzt liest die Wortmarke wieder `--titleFont`; die Vorgabe ist dieselbe Familie
  wie die Überschriften, sichtbar ändert sich nichts, und der Slot ist wieder ein Regler.

Zwei Dinge, die beim ersten Lauf **falsch** als tot gemeldet wurden, und beide sind eine Lehre über
die Messung selbst:

- Die drei `tpl-focus-*`. Fokusstile gelten nur, während etwas `:focus-visible` ist, und in einer
  frisch geladenen Seite ist nichts fokussiert. Das Skript drückt jetzt dreimal Tab, bevor es misst.
- `tpl-drawer-width`. Die Schublade gibt es nur unter 800 px. Das Skript besucht jetzt jede Seite
  auf 1456 und auf 390 px.

Eine Momentaufnahme misst nur den Zustand, in dem sie aufgenommen wurde — was nur in einem Zustand
oder auf einer Breite existiert, muss dort aufgesucht werden.

Und ein dritter Fehler der Messung, der einen Tag später auffiel: Eine Seite steht nie ganz still.
Eine Webschrift, die nachlädt, ein fertig gezeichnetes Mermaid-Diagramm, die Leinwand des Graphen —
alle drei verändern zwischen zwei *identischen* Aufnahmen berechnete Werte, und die Änderung wird
dem Token zugeschrieben, das gerade an der Reihe war. Gemessen: `--font-monospace` bestand einen
Lauf und fiel im nächsten durch, ohne dass es in beiden irgendjemand las. Das Skript nimmt jetzt
zuerst den Grundrauschpegel derselben Seite auf und zieht ihn von jeder Zählung ab.

Mit dem Rauschpegel kamen zwei weitere tote Tokens ans Licht, beide aus derselben Familie wie die
drei oben: `--font-text` und `--font-monospace` sind Obsidian-Aliase, die im gebauten CSS **null**
Leser haben — weder in Quartz noch in einem Plugin noch in dieser Vorlage, die für diese beiden
Rollen `--bodyFont` und `--codeFont` benutzt. `--font-interface` hat fünf Leser und bleibt.

Endstand: **sechs von 53 waren tot**, 48 bleiben, und alle 48 bewegen etwas.

### 61. Mermaid: die Platte unter der Zeichnung und die Legende, die der Palette nicht folgte

Der Hintergrund einer Zeichnung kam aus dieser Vorlage, nicht aus Mermaid: `pre:has(> code.mermaid)`
bekam `background: var(--tpl-surface)`, weil ein Mermaid-Block im Markup ein Codeblock ist
(`<pre><code class="mermaid">`, BEFUNDE 15) und die Codeblock-Behandlung geerbt hatte. Ein Codeblock
braucht eine Fläche, weil sein Inhalt ein Textblock ist, der sich vom Fließtext lösen muss; eine
Zeichnung löst sich dadurch, dass sie eine Zeichnung ist. Die Fläche ist weg, die Haarlinie bleibt
und tut die ganze Arbeit. Dazu Mermaids eigene Platte *innerhalb* des SVG (`rect.background`, bei
journey und gantt), die sonst als einziges getöntes Rechteck übrig geblieben wäre.

Dabei fiel die Legende des Kreisdiagramms auf. Das Feld neben einem Eintrag ist ein **anderes
Element** als das Tortenstück, das es benennt, und Mermaid füllt es aus seinen eigenen
`pie1..pieN`-Themenvariablen statt aus der Serie, die diese Vorlage setzt. Gemessen an der gebauten
Seite: Das erste Feld kam im Hellen als `--light` und im Dunklen fast schwarz heraus — beides der
Grund der Seite, also in beiden Modi unsichtbar —, während das Stück daneben Navy war. Die Legende
liest jetzt dieselbe Serie in derselben Reihenfolge.

Die orange Farbe in den Diagrammen ist übrigens `tertiary`: `--mm-3` ist `tertiary` zu 24 % im
Grund, und `stroke: var(--tertiary)` zeichnet die Umrisse in Flowchart, Sequenz, Zustand, Gantt und
gitGraph.

### 62. Eine Rollleiste ausblenden, ohne dass der Kasten dabei umbricht

Die Frage war, ob sich die Leisten in den Kästen ausblenden lassen, solange nicht gerollt wird.
„Während gerollt wird" gibt es in CSS nicht — das macht das Betriebssystem, ein Stylesheet hat kein
Ereignis dafür. `:hover` ist das Nächstliegende ohne Skript, und nah genug: Eine Leiste, die man
nicht sieht, wollte man auch nicht greifen.

Der naheliegende Weg ist der falsche, und zwar auf drei verschiedene Arten. `scrollbar-width: none`
in Ruhe, `thin` beim Hovern, gemessen an derselben Seite:

| | Ergebnis |
| --- | --- |
| Chrome | Inhalt von 300 px auf **289 px** beim Hovern — die ganze Spalte bricht unter dem Zeiger um |
| Firefox | gar nichts; der berechnete Wert blieb `none` über den Hover hinweg. Gecko legt die Leistenbreite beim Bau der Box fest und stylt sie für einen Hover nicht neu |
| WebKit | funktioniert, als einziges — dort ist die Leiste ein Overlay und kostet keine Breite |

`scrollbar-gutter: stable` rettet den Chrome-Fall **nicht**: Die Rinne, die es reserviert, ist *die
Breite der Leiste*, und die ist bei `scrollbar-width: none` null.

Also die Breite konstant lassen und nur die **Farbe** wechseln: `scrollbar-width: thin` immer,
`scrollbar-color: transparent transparent` in Ruhe, ein sichtbarer Daumen bei `:hover` und
`:focus-within`. Nachgemessen in allen drei Engines: Die Farbe wechselt und `clientWidth` bleibt in
allen dreien bei 300 — es bewegt sich nichts.

Die Liste umfasst jeden Kasten, der in diesem Bau *gemessen* selbst rollt: den Baum, die mobile
Schublade, die rechte Spalte, die Rückverweise (die kappt Quartz, nicht diese Vorlage), die
Suchergebnisse und eine Board-Spalte. Zwei Auslassungen mit Absicht. Die Leiste des Dokuments ist
die eine, die sagt, wie lang die Seite ist — die muss niemand erst suchen. Und die *waagerechten*
Roller — Codeblöcke, breite Tabellen, KaTeX, das Board — behalten ihre Leiste: `scrollbar-gutter`
reserviert am unteren Rand nichts, ein Ausblenden würde den Kasten dort beim Hovern um die
Leistenhöhe wachsen lassen, und seitliches Rollen ist ohnehin das, womit niemand rechnet.

**Nicht am Bild geprüft:** Ob der Daumen tatsächlich erscheint, ließ sich im kopflosen Screenshot
nicht festhalten — Rollleisten werden dort nicht mitgezeichnet. Berechnete Werte und Breiten sind
gemessen, das gemalte Pixel nicht.

### 63. Die eine Farbe, die der Palette nicht folgte

`--tpl-surface-code`, der Grund eines Codeblocks, stand im hellen Modus als literales `#F1EFE9` in
`variables.mjs` — die einzige Farbe der ganzen Vorlage, die nicht aus den neun Palettenrollen kam,
und damit die einzige, die stehen blieb, wenn die Palette sich bewegte. Wer `light` oder `lightgray`
ändert, hätte einen Codeblock behalten, der zur neuen Palette nicht mehr passt, ohne dass etwas es
sagt.

Jetzt `color-mix(in srgb, var(--lightgray) 40%, var(--light))`: 40 % der Kartenfarbe im Seitengrund.
Der Gedanke dahinter ist derselbe wie vorher — ein Codeblock ist eine große Fläche, und der Ton, der
für *ein Wort* Inline-Code richtig ist, macht aus zwanzig Zeilen eine graue Platte —, nur wird er
jetzt gerechnet statt notiert. Der Wert kommt bei #F0EFEB heraus, also innerhalb von zwei je Kanal
am Hexwert, den er ersetzt: gemessen an der gebauten Seite rgb(240, 239, 235) gegen vorher
rgb(241, 239, 233).

Dunkel bleibt `lightgray` ganz. Dort hieße „zum Grund mischen" *zum Schwarz mischen*, was den Block
vom Auge wegnimmt statt ihn abzusetzen — das Gegenteil dessen, was die Mischung im Hellen tut. Das
sind zwei verschiedene Prozentsätze, also steht der dunkle Wert als eigener
`:root[saved-theme="dark"]`-Block daneben.

Zwei Folgen, beide gewollt und beide zu nennen:

- Das Token ist **kein Regler mehr** in der Variablen-Ansicht der App. Eine Überschreibung dort darf
  kein Komma tragen, und `color-mix()` besteht aus nichts anderem — dieselbe Grenze wie bei
  `--tpl-fade-mask` und `--tpl-rule-control`. 47 statt 48 Tokens.
- Die Kontrastprüfung darf den Wert nicht mehr abschreiben. `syntaxPairs()` misst die fünf
  korrigierten Farben des Syntax-Themas gegen genau diese Fläche; die neue `codeSurface()` liest
  die Mischung aus `base.scss` und rechnet sie nach, statt eine zweite Kopie zu führen — sonst wäre
  hier genau die veraltete Zahl entstanden, deretwegen die Mischung sich lohnt.

### 64. Der Sticky-Header schrumpfte und sagte sonst nichts

Beim Scrollen ging die Leiste von 61 px auf 49 px und änderte sonst nichts: derselbe Haarstrich,
kein Schatten. 12 px sind fast das ganze Budget, das sie hat — die vier Bedienelemente sind 44 px
und bleiben es —, also war das einzige Signal eine Höhenänderung, auf die niemand achtet. Umgekehrt
trennte der Haarstrich die Leiste ganz oben von ihrem *eigenen* ersten Absatz, obwohl dort noch
nichts dahinterlag.

Jetzt trägt die Kante den Zustand: in Ruhe keine Linie und kein Schatten, gescrollt der Haarstrich
plus `--tpl-shadow-bar`. Eigener Scroll-Bereich von 8 px statt der 4 rem des Schrumpfens, denn „da
ist etwas hinter mir" stimmt ab dem ersten Pixel.

`--tpl-shadow-bar` ist bewusst nicht `--tpl-shadow`. Das heißt in dieser Vorlage „dieses Ding
schwebt über der Seite" und gehört den fünf Overlays, die das tun; 24 px Weichzeichnung unter einer
randlosen Leiste liest sich wie ein Schlagschatten auf einem Foto. Die Geometrie ist gemessen, und
der erste Versuch war auf eine Art falsch, die `getComputedStyle` nicht zeigen kann:
`0 10px 22px -18px` schrumpft die Schattenfläche um 18 px, sodass ihr unterster Pixel 3 px unter der
Leiste landete — ein Schatten, der in den berechneten Werten steht und praktisch nichts malt. Aus
einem Screenshot dekodiert verdunkelt der ausgelieferte Wert den Grund in der ersten Zeile unter dem
Haarstrich von 252 auf 220 und klettert über 19 Zeilen zurück; dunkel 22 → 11 über 15 Zeilen.

Drei Engines bei 1456 px: Chromium und WebKit gleich, Firefox hat keine Scroll-Timeline, der
`@supports`-Wächter hält, und es bleibt beim schlichten Haarstrich — dieselbe Rückfallebene, auf der
das Schrumpfen schon ruht.

### 65. Nichts sagte, wie weit man ist

Mehrere Seiten hier sind drei Bildschirme hoch, und nichts darauf sagte, wie viel noch kommt; das
Inhaltsverzeichnis sagt, *was* kommt, was eine andere Frage ist. Jetzt füllt sich der Haarstrich von
links: ein Pseudo-Element auf der Leiste, doppelte Linienbreite, von derselben Scroll-Timeline
getrieben wie das Schrumpfen und der Schatten. Kein eigener Balken darüber oder darunter — das wäre
die vierte waagerechte Linie in den obersten 60 px, und so viele Linien hat diese Vorlage nicht zu
vergeben.

Das `::after` existiert nur innerhalb des `@supports`-Wächters, Firefox bekommt also keinen bei
irgendeiner Breite eingefrorenen Streifen (nachgemessen: gar kein Pseudo-Element). Auf einer Seite,
die zu kurz zum Scrollen ist, ist die Timeline inaktiv und `scaleX(0)` zeigt nichts — richtig so, es
gibt keinen Fortschritt zu melden. Bewegung im Sinne von `prefers-reduced-motion` ist nichts davon:
die Linie läuft nicht von selbst, sie *ist* die Scroll-Position.

**Beide Keyframe-Enden stehen ausgeschrieben, und das ist eine Reparatur, keine Ordnungsliebe.** Mit
nur einem `to`-Keyframe ist der Startwert der eigene `scaleX(0)` des Elements, und WebKit löst
diesen zugrundeliegenden Wert gegen den *bereits animierten* auf — der Fortschritt potenziert sich,
und die Linie meldet das Quadrat: 6 % nach einem Viertel, 25 % nach der Hälfte, 57 % nach drei
Vierteln. An beiden Enden richtig, dazwischen überall falsch, also genau die eine Form von falsch,
die eine Fortschrittslinie nicht haben darf. Mit ausgeschriebenem `from` stimmen Chromium und WebKit
an sechs Positionen auf drei Nachkommastellen überein.

### 66. Die untere Ausblendung der rechten Spalte gab es nur im Dunkeln

`--tpl-fade-mask-end` stand in `:root[saved-theme="dark"]`, und daran ist nichts schemaabhängig:
eine Maske trägt nur Alpha, `black` heißt also in beiden Modi „deckend". Im hellen Modus war die
Custom Property leer, `mask-image: var(--tpl-fade-mask-end)` damit zur Berechnungszeit ungültig, und
die rechte Spalte kam mit `mask-image: none` heraus — die weiche Unterkante, um die herum die
klebenden Panel-Überschriften gebaut sind, war für jeden, der die Seite hell liest, schlicht nicht
da. Beim Durchsehen der Kommentare im selben Block aufgefallen, nicht beim Suchen: eine leere Custom
Property ist in der Datei unsichtbar und im Browser stumm.

### 67. Fünf Kommentare behaupteten eine Regel, die es nicht gibt

„Eine Variablen-Überschreibung darf kein Komma tragen" stand in `variables.mjs` (dreimal),
`styles/base.scss` (zweimal), `palette.mjs` und im README — und stimmt nicht. Das Komma-Verbot ist
echt, gehört aber zu den *Frame*-Werten (`cssTrackValue` / `cssGapValue` in `schemas.ts`).
`cssVariableOverride` verbietet genau `{`, `}`, `;`, `\`, `/*` und `*/`; der Leser in
`styleService.ts` (`--([\w-]+)\s*:\s*([^;]+);`) kommt mit Kommas klar, und `--tpl-shadow` trägt seit
jeher drei davon durch die App.

Die Behauptung hat zwei Farben ihren Platz in der Variablen-Ansicht gekostet: `--tpl-rule-control`
und `--tpl-surface-code` waren deswegen nach `styles/base.scss` gewandert. Beide sind zurück in
`variables.mjs`, wo eine Farbe hingehört, `--tpl-surface-code` mit seinem dunklen Wert als
`dark`-Feld statt als eigenem Block. 50 statt 48 Tokens, alle lebendig
(`npm run check:tokens`); die 89 Kontrastpaare stehen unverändert.

`palette.mjs` liest die beiden jetzt aus der Token-Liste statt `base.scss` mit einer Regex zu
zerlegen — eine gemeinsame `tokenColour()` für beide, die genau zwei Formen versteht (`var(--x)` und
einen zweifarbigen srgb-Mix) und bei allem anderen einen Fehler wirft statt zu raten.

Was bleibt: der Test dafür, ob etwas nach `variables.mjs` gehört, ist **nicht**, welche Zeichen der
Wert benutzt, sondern ob jemand ihn je ändern wollen würde. Eine Farbe, eine Länge, ein
Schriftstapel — ja. Ein vierzeiliger Verlauf oder eine 400 Zeichen lange Data-URI — nein.

### 68. Nach zwei Bildschirmen zeigt die Leiste den Namen, den man schon kennt

Der Sticky-Header trägt oben wie unten den *Sitenamen*. Auf einer Seite, die drei Bildschirme hoch
ist, ist das die eine Information, die man ohnehin hat, während die verloren gegangen ist, die man
bräuchte: welcher Artikel das hier eigentlich ist. Die Überschrift ist längst oben raus, das
Inhaltsverzeichnis in der rechten Spalte sagt nur, welcher *Abschnitt* kommt.

Gewollt wäre: Sobald die `h1` des Artikels den Bildschirm verlässt, blendet die Leiste vom
Sitenamen auf den Seitentitel um und beim Zurückscrollen wieder zurück. Das Zeitmaß dafür gibt es
schon — `view-timeline` auf der Überschrift mit `animation-range: exit`, also derselbe Mechanismus
wie bei Befund 64 und 65, mit demselben `@supports`-Wächter und derselben Rückfallebene (Firefox
behielte schlicht den Sitenamen).

**Gebaut am 2026-09-06, nach den zwei Messungen, die hier als offen notiert waren.**

*Trägt eine `view-timeline` über zwei Frame-Flächen?* Ja, mit `timeline-scope`. Eine benannte
View-Timeline ist für die Nachkommen und die Geschwister des deklarierenden Elements sichtbar, und
die Leiste ist weder das eine noch das andere — sie liegt in einer anderen Fläche, zwei Teilbäume
weiter. `timeline-scope: --tpl-article-title` auf `:root` hebt sie so weit an. Vorher an einer
eigenständigen Nachbildung gemessen und nicht am Projekt, weil ein Mechanismus, der die zwei
Flächen nicht überbrückt, aus dem ganzen Vorhaben ein Skript gemacht hätte: Chrome und WebKit
tauschen die Namen deckungsgleich (0,786 gegen 0,785 am Mittelpunkt), Firefox bewegt nichts.

*Was kostet die zusätzliche Komponente die Leiste?* Nichts, weil beide Namen **eine** Zelle teilen
statt nebeneinanderzustehen. Die `brand`-Gruppe wird dafür ein Grid — `display` ist die eine
Eigenschaft, die `Flex.tsx` nicht inline schreibt. Gemessen über fünf Breiten: bei 1456, 800 und
600 px ist die Zelle 159 px breit (der längere der beiden Namen), bei 481 px 115, bei 390 px 0. Die
Leiste bleibt 69 px hoch wie vorher, kein Überlauf an irgendeiner Breite. Unter 480 px entfällt der
Seitenname mit demselben Argument wie der Sitename in Befund 28: die Gruppe hat dort 62 px, davon
26 die Marke und 12 der Abstand — die 24 px, die bleiben, sind genau die Breite, bei der ein Name
als ein Buchstabe und drei Punkte erscheint.

Zwei Entscheidungen unterwegs, beide anders als die Vormerkung sie annahm:

- **Kein zweiter `article-title`, sondern eine sechste Layout-Box.** Diese Komponente rendert ein
  `h1`, und davon hat eine Seite eines. Die Box rendert ein `span` mit `aria-hidden="true"` — die
  ehrliche Form, denn es ist das sichtbare Echo einer Überschrift, die im Dokument noch steht, und
  keine zweite Überschrift. Der Preis: Befund 1 wird um eine Instanz schlimmer, die Gegenprobe
  meldet jetzt „1 von 6“ statt „1 von 5“.
- **Der Bereich ist `exit`, nicht ein von Hand gewählter Abstand.** Der Tausch läuft genau, während
  die `h1` den Bildschirm verlässt. Gemessen in Chrome und WebKit auf drei Seiten und zwei Breiten;
  auf einer Seite ohne Artikelüberschrift — der 404, einer Zeichnung — heißt der Name eine Timeline,
  die es nicht gibt, die Animation ist inaktiv, kein Keyframe greift, und die Leiste behält den
  Sitenamen. Nachgemessen auf `/nicht-da/`: `site 1, name 0`.

Firefox behält den Sitenamen an jeder Breite und auf jeder Seite (nachgemessen), so wie beim
Schrumpfen, beim Schatten und bei der Fortschrittslinie.

### 69. Vier Korrekturen am Header, und drei davon waren an mir

Der Durchgang aus 64/65 wurde am selben Tag nachgezogen. Was daran falsch war:

**Die Haarlinie verschwand im Ruhezustand.** Das Argument — oben liegt nichts hinter der Leiste,
also braucht sie dort keine Kante — ist richtig und trotzdem die falsche Antwort: eine Leiste ist
eine Leiste, ob schon etwas unter ihr durchgelaufen ist oder nicht, und eine Kante, die kommt und
geht, lenkt auf sich statt auf die Seite. Die Haarlinie steht jetzt auf jeder Scroll-Position.

**Marke und Seitenname saßen nicht in der Mitte ihrer Zeile.** Quartz packt jede Komponente einer
Gruppe in ein klassenloses `div` (`Flex.tsx`); die Gruppe zentriert diese Hüllen, und die Hülle war
ein Blockkasten mit `min-height: 44px` — ihr Inhalt saß also oben. Gemessen bei 1456 px in Ruhe: die
Mitten der Hüllen lagen bei y=30 gegen 30,5 der Leiste, die der Marke aber bei 21 und die des
Seitennamens bei 22, beide neun Pixel zu hoch. Beim Schrumpfen wurde es schlechter statt besser,
weil der Name kleiner wird und die Marke nicht: 15 gegen 12, also drei Pixel auch noch
gegeneinander. Die Hüllen sind jetzt selbst zentrierende Flexboxen; alle drei Mitten liegen auf der
der Leiste.

**Die Bedienelemente wurden zusammengedrückt.** Die Untergrenze des Polsters war der kleinste Wert,
der noch nach Polster aussah — und das ist die falsche Größe zum Optimieren: die vier Ziele sind
44 px und schrumpfen nicht, also standen sie bei 2 px in einer Leiste, die kaum höher war als sie
selbst. Jetzt 12 px oben in Ruhe und 8 px unten am Ende, die Leiste geht 69 → 61 px statt 61 → 49.

**Der Schatten ist eine Linie geworden.** Er war als „kein Schatten wie bei den Overlays" gedacht
und blieb trotzdem ein Schatten; diese Vorlage zeichnet mit Linien. Statt seiner blendet beim ersten
Scroll-Pixel eine graue Spur ein — zwei Haarlinien stark, in `--tpl-rule-control`, also derselbe
gemessene Ton wie jede Bedienelement-Kante — und der Fortschrittsbalken ist die *Füllung* dieser
Spur statt einer freistehenden Linie darüber. Eine Linie, zwei Aufgaben; so hat ein
Fortschrittsbalken immer schon ausgesehen. `--tpl-shadow-bar` ist damit wieder weg, 49 Tokens.

Gemessen in Chromium und WebKit an sechs Scroll-Positionen: Höhe, Polster, Deckkraft der Spur und
Füllstand auf drei Nachkommastellen gleich. Die Kante Pixel für Pixel aus dem Screenshot gelesen —
hell `rgb(42, 78, 108)` bis zum Füllstand, danach `rgb(142, 141, 136)`, zwei Zeilen hoch, die
Haarlinie vollständig verdeckt; dunkel `rgb(140, 184, 218)` und `rgb(119, 121, 125)`.

### 70. Firefox 155 kann von alldem nichts — nachgewiesen, nicht vermutet

`animation-timeline` ist die Grundlage für alle drei Bewegungen im Header (Schrumpfen, Spur,
Fortschritt). Bisher stand hier „Firefox hat keine Scroll-Timeline", gestützt auf Playwrights
Firefox 153. Weil das über eine Einstellung freigeschaltet sein kann und die Version des Rechners
neuer ist, am 2026-09-06 an der **installierten** Firefox 155.0 nachgeprüft — headless, eigenes
Profil, `CSS.supports` auf eine Seite geschrieben und die Seite fotografiert:

    scroll() false | scroll(root block) false | view() false | @property true

Damit ist es keine Frage der Version und keine der Einstellung: der Header ist dort statisch, mit
12 px Polster und der Haarlinie, und die Fortschrittslinie fehlt ganz — der `@supports`-Wächter legt
die beiden Pseudo-Elemente gar nicht erst an, damit nicht eine graue Linie festklebt oder ein
Streifen bei irgendeiner Breite einfriert. Das ist die vollständige, richtige Rückfallebene und
zugleich alles, was ohne Skript geht: eine reine CSS-Lösung für „wie weit ist gescrollt" gibt es
außerhalb der Scroll-Timelines nicht, und die App hat keine Stelle, an der eine Vorlage ein Skript
mitliefern könnte (weder ein Head-Schnipsel noch eine `custom.js`; die `snippets/` sind Markdown für
die Layout-Box). Wer das in Firefox will, braucht ein Quartz-Plugin mit `afterDOMLoaded` — ein
eigener Baustein, keine Stilfrage.

Safari 26.6.2 ist **nicht** direkt gemessen: `safaridriver` verlangt „Automatisierung erlauben" in
den Entwicklereinstellungen, und Playwrights WebKit 26.5 ist ein anderer Bau derselben Engine-Reihe.
Dort stimmt alles auf drei Nachkommastellen mit Chromium überein. Was bleibt, ist eine Lücke im
Nachweis, nicht ein Befund.

### 71. Der Seitenname brach seit einem Tag um, und drei Kommentare beschrieben die Regel weiter

Beim Zusammenlegen von `nav-page-title.scss` und `nav-toolbar.scss` in `nav-header.scss` am
2026-09-05 (Befund „Eine Datei pro Komponente") ging der Block verloren, der den Sitenamen auf einer
Zeile hält. Aufgefallen ist es einen Tag lang nicht, und zwar aus einem lehrreichen Grund: **drei
Kommentare in derselben Datei beschrieben die Regel weiterhin** — die Header-Regel sagte „was
stattdessen nachgibt, ist der Seitenname, der kürzt (unten)", die Mobil-Regel sagte, die Kürzung
sei „jetzt unbedingt und steht oben bei der Brand-Gruppe". Wer die Datei las, las die Regel. Nur der
Browser nicht.

Kein Test hätte es gefangen. Der Name dieser Website ist kurz, also passt er überall; gemessen mit
einem längeren Namen bei 620 px stand er auf **zwei Zeilen** in einer 44-px-Hülle — nichts lief
über, nichts scrollte seitlich, jeder Durchlauf war grün. Es sah nur falsch aus, und das sieht nur
ein Mensch mit einem anderen Namen im Kopf.

Wiederhergestellt, und dabei zeigte sich, dass die alte Fassung zu kurz griff: `min-width: 0` allein
am `h2` reicht nicht. Das automatische Minimum eines Flex-Elements ist seine Inhaltsbreite auf
*jeder* Ebene, und zwischen Gruppe und Titel sitzt noch Quartz' eigene Hülle. Mit nur der einen
Ebene stand die Leiste bei 620 px 64 px und bei 500 px 184 px über dem Fenster. Jetzt sind alle drei
Ebenen genannt, die Brand-Gruppe darf schrumpfen (`flex: 0 1 auto`) und die Werkzeugleiste
ausdrücklich nicht (`flex: 0 0 auto`) — ihre Kinder sind 44-px-Ziele.

Der Griff ist `:has(.page-title)` statt des früheren `:has(.site-mark)`: eine Klasse dieses Namens
gibt es im erzeugten Markup nicht, die Marke ist eine `.layout-box-mark`. Nach Inhalt und nicht nach
Position, denn `:first-child` funktionierte heute und bräche an dem Tag, an dem ein drittes Ding in
die Leiste kommt.

Gemessen in drei Engines bei 1456, 780, 620 und 500 px, mit dem echten und einem langen Namen: eine
Zeile überall, Auslassungspunkte wo nötig, kein seitliches Scrollen.

### 72. Der Inhalt verschwand an einer harten Kante unter der Leiste

Die rollenden Boxen lösen ihren Inhalt an den Rändern auf (`--tpl-fade-mask`), die Seite selbst tat
es nicht: Text lief unter die undurchsichtige Leiste und war von einer Zeile zur nächsten weg. Jetzt
macht der Seitenkörper dieselbe Geste — ein 24 px hoher Verlauf von `--light` nach durchsichtig,
direkt unter der Leiste, `pointer-events: none`.

Zwei Dinge daran sind gemessen statt entschieden.

**Er darf statisch sein**, also ohne Scroll-Timeline, und das ist der ganze Gewinn: unter der Leiste
beginnt das erste gezeichnete Element auf **jeder** Seite und bei 1456, 810 und 390 px genau 32 px
tiefer. Ein Verlauf, der kürzer ist als dieser Abstand, ist im Ruhezustand unsichtbar und muss
deshalb nicht ein- und ausgeblendet werden. Damit steht er außerhalb des `@supports`-Wächters — und
ist das einzige Stück des Headers, das **auch Firefox bekommt** (siehe Befund 70).

**Er brauchte ein Pseudo-Element, und es gab keins mehr.** Die Leiste hatte beide vergeben: `::before`
an die graue Spur, `::after` an den Fortschritt. Zusammengelegt: die Linie ist jetzt *ein* Kasten mit
zwei Hintergrundebenen — Akzent über Steuerton — und der Füllstand ist die `background-size` der
Akzentebene, von 0 % auf 100 %. Ein `transform` war die Alternative und kann den Kasten nicht teilen,
weil das Skalieren die Spur mitskaliert. Nachgemessen an fünf Scroll-Positionen: Chromium und WebKit
interpolieren `background-size` auf drei Nachkommastellen gleich.

Der Verlauf beginnt eine Haarlinie unter der Leiste statt an ihrer Kante, sonst deckte er das untere
Pixel der Linie zu — `::after` kommt nach `::before` und malt darüber. Die klebende rechte Spalte
setzt bei `--tpl-header-h + --tpl-space-lg` an, also 1 px unter dem Ende des Verlaufs; dort ist er
bereits durchsichtig.

`--tpl-page-fade` ist ein eigenes Token und nicht `--tpl-fade`: dieselbe Idee in zwei Maßstäben, und
zusammengebunden ließe sich die weiche Kante einer Box nicht mehr einstellen, ohne die der Seite zu
verschieben. 50 Tokens.

### 73. Die Token-Prüfung konnte Pseudo-Elemente nicht sehen

`scripts/check-tokens.mjs` beantwortet die Frage „bewegt dieses Token etwas", indem es die Variable
in einer laufenden Seite verdreht und zählt, wie viele berechnete Werte sich ändern. Die Liste der
Kästen dafür war `document.querySelectorAll('body *')` — und **ein Pseudo-Element steht da nicht
drin**. Ein Token, das nur ein `::before` oder `::after` erreicht, konnte also keinen einzigen
gemessenen Wert bewegen und kam als „liest niemand" heraus.

Aufgefallen an `--tpl-page-fade` (Befund 72): Es setzt die Höhe des Verlaufs unter der Leiste, malt
auf jeder Seite, und die Prüfung meldete null. Im selben Loch saßen drei weitere: die Linie am
unteren Rand der Leiste liest `--tpl-rule-control`, `--secondary` und `--tpl-rule-width`, und alle
drei kamen bisher nur deshalb durch, weil sie *woanders* auch noch gelesen werden.

Die Kastenliste wird jetzt einmal pro Seite gebaut und enthält jedes Element plus jedes `::before`
und `::after`, dessen `content` nicht `none` ist. Einmal statt bei jeder Messung, weil sonst jede
der 50 Sonden alle Elemente zweimal zusätzlich fragen müsste; so kosten die paar Dutzend
tatsächlich vorhandenen Pseudo-Elemente nichts Messbares. Dazu vier Eigenschaften mehr in der Liste
(`backgroundSize`, `transform`, `insetBlockStart`, `insetBlockEnd`) — ein Token, das nur eine davon
bewegt, wäre sonst weiter unsichtbar.

Danach: 50 Tokens, keins tot, `--tpl-page-fade` mit 44 Treffern.

### 74. Safari 26.6.2 direkt gemessen — und dabei fiel auf, dass die Seite außermittig steht

Mit „Automatisierung erlauben" ließ sich Safari am 2026-09-06 endlich selbst befahren
(`safaridriver` über den W3C-Endpunkt, Playwright kann Safari nicht). Ergebnis zuerst: **alles
funktioniert.** `animation-timeline: scroll()` **und** `view()` werden unterstützt, die Leiste geht
69 → 61 px, Polster 12 → 8, die Spur blendet über 8 px von 0 auf 1, der Füllstand läuft von 0 % auf
100 %, der Verlauf ist 24 px hoch, kein Schatten, Marke/Name/Suche liegen alle auf derselben Mitte,
und der Seitenname bleibt einzeilig und kürzt. Hell und dunkel je nachgemessen. Die frühere Meldung
„in Safari nicht vollständig" ist damit erledigt; sie stammte aus der Zeit vor diesen Durchgängen.

Dass `view()` da ist, ist nebenbei die Antwort auf eine offene Frage aus Befund 68: Der Seitentitel,
der den Sitenamen ablöst, wäre in Chromium *und* Safari machbar.

**Der Fund war ein anderer.** Im ersten Durchlauf meldete meine Messung 17 px waagerechten Überhang
auf jeder Seite und bei jeder Fensterbreite — gleich groß bei 1500 wie bei 560 px, also kein Inhalt,
der übersteht. Ursache: Quartz' eigenes Basis-CSS setzt

    html { width: 100vw; overflow-x: hidden }

und `100vw` **schließt eine klassische Scrollleiste ein**, der Inhaltskasten nicht. Auf einem
Rechner, dessen Scrollleisten immer sichtbar sind, ist das Dokument also so breit wie das Fenster,
sichtbar sind aber 17 px weniger — und die zentrierte Inhaltsspalte wird im falschen Kasten
zentriert. Gemessen bei 1500 px Fenster: **30 px Rand links, 13 px rechts, die ganze Seite 17 px
außermittig.** Quartz' `overflow-x: hidden` ist der Grund, warum daraus nie eine waagerechte
Scrollleiste wurde (`scrollLeft` blieb bei 0) — nur der Versatz.

Unter Playwright unsichtbar, in allen drei Engines, und in der Vorschau der App ebenso: dort gibt es
überall Overlay-Scrollleisten, und dann ist `100vw` gleich der sichtbaren Breite. Es braucht einen
Rechner, auf dem „Scrollleisten immer einblenden" steht — oder eine angeschlossene Maus, oder
Windows und die meisten Linux-Desktops.

Behoben mit `html { width: auto }` in `base.scss`: der Anfangswert, das Blockelement füllt damit
schlicht den initialen umgebenden Block, und der ist das Fenster *ohne* Scrollleiste. Danach 22 px
Rand auf beiden Seiten, Versatz 0. Quartz' `overflow-x: hidden` bleibt und tut weiter, was es tut.

Die Lehre, und sie ist allgemein: **eine Overlay-Scrollleiste versteckt jeden `vw`-Fehler.** Was in
`vw` gerechnet wird, muss auf einer Maschine mit klassischen Scrollleisten nachgesehen werden, und
das ist genau die Maschinenklasse, die kein Prüfskript hier abdeckt.

### 75. Ein mittig ausgerichtetes Grid-Element ist so breit wie sein Inhalt, nicht wie seine Zelle

Beim Bau von Befund 68 hing der Seitenname bei 390 px quer über der Wortmarke: die Zelle war 24 px
breit, der Name 159 px, also 68 px Überstand nach beiden Seiten. Am Stylesheet lag es nicht — es
setzt `minmax(0, 1fr)` auf die Spalte und `min-width: 0` auf das Element, und beides stimmt.

Es lag an einer Zeile in `Flex.tsx`: Quartz schreibt an **jeden** Wrapper, den es für eine
Komponente anlegt, `align-self` und `justify-self` als Inline-Stil, `center` als Vorgabe. In einer
Flex-Zeile ist `justify-self` wirkungslos, deshalb fällt es dort nie auf. In einem Grid ist es das
nicht: Ein Grid-Element mit einer anderen Selbstausrichtung als `stretch` wird nach seinem
**fit-content** bemessen statt auf die Zelle gestreckt — und dieses fit-content war hier das
max-content des Namens.

Die Reparatur ist ein `width: 100%` auf dem Element. Eine gewöhnliche Deklaration reicht, weil
niemand inline eine Breite setzt; danach ist die Größe entschieden, und der Ausrichtung bleibt
nichts mehr zu verteilen. Gemessen über fünf Breiten: beide Namen liegen jetzt auf demselben
Kasten, an jeder Breite, und der Sitename beginnt wieder unmittelbar hinter der Marke statt in der
Mitte einer Zelle, die der längere Nachbar aufspannt.

Dasselbe Muster wie beim `flex-basis` der Suche (im Kommentar an `.search`): Was `Flex.tsx` inline
schreibt, kann kein Stylesheet ohne `!important` überstimmen — der Ausweg ist jedes Mal, eine
*andere* Eigenschaft zu setzen, die die Frage vorher entscheidet.
