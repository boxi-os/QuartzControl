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
