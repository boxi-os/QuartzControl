Du bist als zweites Paar Augen an einem Electron-Projekt, das kurz vor einer Beta steht. Es geht um
ein Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites. Repository: /Users/boxi/Development/QuartzControl.

Lies zuerst `CLAUDE.md` im Wurzelverzeichnis. Dort stehen die Konventionen dieses Projekts als
Regeln, die Messungen dahinter in `docs/decisions/`. Ein Befund, der gegen eine dieser Regeln
verstößt, ist ein Befund; ein Befund, der eine Regel für falsch hält, ist auch einer — braucht dann
aber die Begründung.

## Umfang

Der Diff seit dem Tag `review-2026-09-13`. **Nicht seit dem Dateinamen dieses Auftrags** — der ist
geraten, der Tag ist es nicht.

    git log --oneline review-2026-09-13..HEAD
    git diff review-2026-09-13..HEAD -- electron/ src/ shared/ scripts/

52 Dateien, +3102/−590; im App-Code 21 Dateien, +478/−71.

**Der Diff hat zwei Hälften, und sie stammen aus zwei verschiedenen Durchgängen:**

    24 Commits, 25 Dateien, +1854/−62   bis 074e512   nicht von mir
     6 Commits, 31 Dateien, +1248/−528  ab  fed1648   von mir

Die erste Hälfte kenne ich nur aus ihren Commit-Nachrichten: die sechs Fixes des dreizehnten
Reviews, der Lizenzwechsel auf GPL-3.0-or-later, die Umbenennung von *Quartz-GUI* auf
*QuartzControl* und die READMEs für das öffentlich werdende Repository. Ich schlüssele sie unten
nicht auf, weil ich das nicht ehrlich könnte — lies dort die Nachrichten selbst und behandle sie
wie in den letzten Runden. **Insbesondere die Fixes des dreizehnten Reviews sind noch von niemandem
gegengelesen.**

Die zweite Hälfte ist unten aufgeschlüsselt.

Lies `docs/REVIEW-2026-09-13.md` und `docs/REVIEW-2026-09-13-auftrag.md` mit — nicht als Wahrheit,
sondern als das, was zuletzt behauptet und wonach zuletzt gesucht wurde.

## Eine Besonderheit, die du wissen musst

**Die sechs Commits der zweiten Hälfte stammen von demselben Modell, das diesen Auftrag schreibt.**
Ich habe entschieden, *was* an den gemeldeten Punkten geändert wird und wie weit.

Drei Dinge folgen daraus:

- Lies die Commit-Nachrichten als Behauptungen. In diesem Projekt gilt eine Zahl in einer
  Commit-Nachricht als Messung; wenn eine nicht trägt, ist das ein Befund. Vier der letzten fünf
  Aufträge haben genau so einen gefunden.
- Prüfe besonders, wo ich **eine Zahl, eine Grenze, einen Ort oder einen Umfang gewählt** habe. In
  diesem Diff sind das: die zwei korrigierten Farben, `basis: '18rem'` für die zwei Kästen, der
  Umfang des Plugin-Kompatibilitätsblocks (was darin steht und was ausdrücklich nicht), das
  negative `-2rem`, die Staffelung der Dateizeiten um je eine Minute, und die Entscheidung, in der
  Kopfleiste das Kapitel statt des Seitentitels zu zeigen.
- **Diese Runde hat viel an einer echten Website gemessen und wenig an der App.** Der größere Teil
  des Diffs ist die Beispielvorlage, also CSS und Konfiguration, die nur im gebauten Ergebnis eine
  Wirkung haben. Wo eine Aussage nur gelesen ist, steht es unten dabei.

## Der Messweg

1. **An der gebauten Website**, über einen lokalen Server auf `~/Documents/Example/public`. Fast
   alles unten ist so entstanden: DOM-Messungen über Playwright, nicht Augenschein.
2. **In drei Engines.** Chromium über die Chrome-Erweiterung, Firefox und WebKit über
   `playwright-core` (Chromium ist als Playwright-Browser *nicht* installiert; die Skripte dieses
   Repos benutzen Electron dafür).
3. **An der gebauten App** über `_electron.launch`, für die vier Oberflächenpunkte.
4. **Im Quelltext fremder Plugins gelesen**, wo eine Messung nichts geklärt hätte —
   `applyPlaceholders` in `quartz-layout-box`, die 800-px-Blöcke von explorer, search, graph und
   canvas-page in ihren `dist/index.js`.

Was das nicht beantwortet, steht unter „Was ich nicht messen konnte".

## Was in dieser Hälfte steckt

### 1. Drei Fehler, die man erst beim Benutzen sieht (`fed1648`)

`::selection` war nirgends gesetzt; der Farbwähler unter *Stile → Basis* öffnete bei `rgba()`-Werten
auf Schwarz; eine aufgeklappte Plugin-Karte streckte ihre Nachbarin.

- **Der Farbwähler ist der einzige mit Logik.** `cssColorToHexAlpha` ist neu,
  `cssColorToHex` ruft es jetzt auf und soll sich unverändert verhalten — prüf das: Die alte
  Funktion gab für jede Farbe mit Alpha `null` zurück, die neue tut es über den Umweg
  `alpha === 1`. Sechs Aufrufstellen hängen daran (`VariableRow`, `CssVariableReference`,
  `CustomCss`).
- **Das Zurückschreiben hängt das Alpha wieder an** (`withAlpha` in `Basics.tsx`). Der Wert wird als
  `rgba(r, g, b, a)` geschrieben. Was passiert bei einem Ausgangswert in einer *anderen*
  Alpha-Schreibweise — `#rrggbbaa`, `hsl(… / .5)`, `color-mix()`? Der Picker kann sie seeden; was
  schreibt er zurück?
- **`items-start` nimmt den Karten die gleichen Höhen**, die für dnd-kit gewollt waren. Die
  Kommentare an beiden Stellen sagten das ausdrücklich. Ist das ein Verlust beim Ziehen? Ich habe
  es an der gebauten App *nicht* im Drag geprüft — der Aufklapp-Knopf war über `aria-expanded`
  nicht auffindbar, und ich habe die Regel stattdessen statisch verifiziert.

### 2. Speichern steht an zwei Orten statt an dreien (`e2a2aa9`)

Neue Komponente `FormActions`, sieben Aufrufstellen umgestellt, ein doppelter Knopf entfernt, ein
i18n-Schlüssel gelöscht.

- **Zwei Knöpfe habe ich bewusst gelassen** (GitHub-Token, GitHub Pages) mit der Begründung, sie
  gehörten zu einem Feld statt zu einem Formular. Trägt die Unterscheidung? Sie ist der einzige
  Grund, warum die Regel nicht „alle unten" heißt.
- **Der entfernte Knopf ist der interessante Fall.** Auf *Stile → Eigenes CSS* riefen der
  Seitenkopf und die Datei-Toolbar dasselbe `saveActive(activeTab)`. Der verbliebene heißt nur
  „Speichern" — auf einem Reiter mit einer Dateiliste. Sagt er noch, *was* er speichert? Und:
  `saveActive` speichert nur die *aktive* Datei, während `dirty` alle Entwürfe zählt.
- **`FormActions` setzt `mt-3` nur, wenn die Aufrufstelle keinen eigenen `mt-` mitbringt.** Das ist
  aus `ColorPicker` übernommen. Ein Regex auf einen Klassen-String ist eine schwache Prüfung —
  `mt-` trifft auch `mt-0`, aber ebenso `smt-`; gibt es einen Fall, in dem er falsch liegt?
- Gemessen an der gebauten App: fünf Bildschirme, Position jedes Knopfes. **Nicht** gemessen: ob
  die umgestellten Formulare noch speichern, was sie sollen.

### 3. Die Navigation folgt dem eingestellten Breakpoint (`8c43dcc`)

**Der riskanteste Teil dieses Diffs, und der, den ich zuerst lesen würde.**

`buildPluginBreakpointCompat` in `shared/gridFrameCss.ts` ist neu: rund 120 Zeilen, die die
800-px-Regeln von vier Community-Plugins am eingestellten Breakpoint neu aussprechen, beide Zustände
jeweils vollständig.

- **Das ist fremdes CSS, abgeschrieben aus `dist/index.js` von explorer, search und graph in der
  Fassung 0.1.0.** Ändert ein Plugin seine Schublade, beschreibt die Kopie die alte, und niemand
  merkt es. Ist das die richtige Abwägung? Die Alternative war, jedem Projekt zu sagen, sein
  Breakpoint sei 800, was immer es einstellt.
- **Prüf die Vollständigkeit gegen die Quelle.** Ich habe die Media-Blöcke der vier Plugins
  extrahiert und drei Dinge bewusst weggelassen: canvas-page (scopet sich selbst auf
  `data-frame=canvas` und galt für ein Projekt mit eigenem Frame nie), die Übergänge und
  `overscroll-behavior` der Schublade, und die `border-radius`-Nähte der Suche. Ist „Politur"
  dafür die richtige Einschätzung, oder fehlt darunter etwas, das man sieht?
- **Beide Zustände auszusprechen ist die Regel des vorhandenen Kern-Blocks.** Prüf, ob ich sie
  eingehalten habe: Jede Eigenschaft, die die mobile Hälfte setzt, muss die Desktop-Hälfte auch
  nennen, sonst bleibt sie im Band stehen. Ich habe das von Hand gegengelesen, nicht gezählt.
- **Ein Nebeneffekt, den ich erst später bemerkt habe:** Dieser Block schlägt die Vorlage. In
  `nav-explorer.scss` steht jetzt ein Kommentar, dass eine Regel dort *nicht* durchkommt, weil
  `.page[data-frame="…"] .explorer.collapsed` mehr wiegt als ein blankes `.explorer`. Ist es
  richtig, das so stehenzulassen — oder sollte die App überhaupt nichts sagen, was ein Projekt
  nicht überschreiben kann?
- Gemessen an acht Breiten in Firefox: 1300, 1201, 1199, 950, 901, 899, 700, 390. Bei 901 steht der
  Desktop-Baum, bei 899 der Burger; kein seitliches Scrollen. **Nicht** gemessen: ein Projekt mit
  den Vorgabe-Breakpoints (dort erzeugt die Funktion nichts — der frühe `return`), und kein
  Breakpoint *unter* 800, wo die Bänder andersherum liegen.

### 4. Die Vorlage holt zurück, was in der App eingestellt wurde (`347c176`)

Für Konfiguration und Frames gibt es bewusst keinen Rückweg; im Projekt war seit dem letzten Lauf
einiges eingestellt worden, das Phase 3 und 4 überschrieben hätten.

- **Zwei Farben sind nicht die, die im Projekt standen.** `tertiary` hell und `secondary` dunkel
  sind nachgebessert, Farbton und Sättigung gehalten. Die Zahlen (3,94 → 4,87 und 4,38 → 4,66)
  stehen in der Commit-Nachricht und im Kommentar. Prüf sie — und prüf, ob „Farbton gehalten"
  stimmt, nicht nur „Kontrast erreicht".
- **`editorial` und `index` teilen jetzt eine Funktion.** Das behebt eine Drift, die real war
  (kein Inhaltsverzeichnis auf Artikeln zwischen 901 und 1200 px). Es koppelt aber zwei Frames, die
  der Kommentar ausdrücklich getrennt halten wollte. Ist `readingBreakpoints()` als Funktion die
  richtige Form dafür, oder verschiebt sie das Problem nur?
- **Die Marke wird aus `build/icon-source/quartzcontrol-icon.svg` gebaut** (`site-mark.mjs`, neu).
  Das Trimmen rundet Pfaddaten auf eine Nachkommastelle und Transformationsmatrizen ausdrücklich
  nicht. Prüf die Begründung — und prüf, was passiert, wenn jemand das Icon austauscht: Die
  Gradient-Stops werden über eine Regex auf zwei konkrete `rgb()`-Werte ersetzt, die als Konstante
  daneben stehen.
- **Die dunkle Fassung ist auf 85 % gedimmt.** Das ist eine gewählte Zahl ohne Messung dahinter.

### 5. Was an den Stylesheets aufgefallen war (`5ec678d`)

Neun Punkte, dreizehn Dateien. Die zwei mit dem meisten Gewicht:

- **Der Kopf verzichtet auf `animation-timeline`.** Der Nutzer hat entschieden, auf die
  Scroll-Effekte zu verzichten; die Umsetzung ist meine. Entfernt sind drei `@supports`-Blöcke, zwei
  `@property`-Registrierungen und sechs Keyframes. An ihre Stelle tritt: zwei Ebenen, von denen eine
  wegscrollt, und eine Leiste, die das **Kapitel** trägt statt des Seitentitels. Prüf die
  Behauptung, die das trägt — „das Kapitel wiederholt die Überschrift nicht, also darf es
  dauerhaft dastehen". Gilt sie auf jeder Seite? Und ist `--tpl-header-title` noch ein sinnvoller
  Token, seit nichts ihn mehr animiert?
- **Der Kopierknopf an Codeblöcken.** `pre` war Bezugsrahmen und Scroller zugleich; jetzt ist es das
  Element darum, benannt über `:is(figure, div, li, blockquote, td):has(> pre)`. Das ist eine Liste
  von Elementnamen, die ich aus einer Seite abgelesen habe (sechs von sieben Blöcken in `<figure>`,
  einer in `<div>`). Was, wenn ein achter woanders liegt? Und: Die Regel setzt `position: relative`
  auf ein fremdes Element — was hängt sonst daran?

Dazu, kürzer: das zweistufige Inhaltsverzeichnis (der aktuelle Abschnitt ist der letzte mit
`.in-view`, gefunden über `:has(+ li > a:not(.in-view))`), der Ankersprung über `--tpl-header-h`,
`minmax(0, auto)` in den Listen, das Tag-Symbol statt `#`, Rahmen um die zwei Kästen, die Regel
gegen leere Gruppen-Wrapper, zwei Ursachen am Burger-Menü, und `gap: 0` im Kopfblock.

- **Die Regel gegen leere Wrapper** ist `.flex-component > div:not(:has(*))` plus eine zweite für
  die Gruppe selbst. `:empty` greift nicht, weil der Wrapper ein Kind *hat*. Prüf, ob die zwei
  Selektoren zusammen den Fall wirklich abdecken — und ob sie etwas treffen, das sie nicht sollen.
- **`{{frontmatter.section}}` steht in einem `data-`-Attribut** und wird mit `content: attr()`
  gemalt, damit `[data-section^="{{"]` den Fall „diese Seite hat kein Frontmatter" abfangen kann.
  Der Text ist damit ein Pseudo-Element: nicht markierbar, nicht kopierbar. Bei einem
  `aria-hidden`-Echo ist das vertretbar — ist es das?

### 6. Vier Befunde und die README (`ac6bb30`)

BEFUNDE 78 bis 82. Sie sind Prosa über Verhalten — prüf sie wie Code. Zwei davon behaupten, dass
etwas *nicht* geht (eine Rasterzelle mit zwei Namen; `hidden: true` auf den Bereich mit der
Schublade), und beide sind an einem Fehlversuch gemessen, nicht am Handbuch.

## Was ich nicht messen konnte

- **Ein Punkt des Nutzers ließ sich nicht reproduzieren:** „Beim Scrollen kann die Linie über dem
  Footer über die Graph-Ansicht laufen." An jeder Scrollposition lagen beide weit auseinander. Ich
  habe deshalb nichts geändert. Wenn du einen Weg siehst, wie das entsteht, ist das ein Befund.
- **Die Chrome-Erweiterung konnte das Fenster nicht unter 1456 px verkleinern.** Alle schmalen
  Breiten sind deshalb Playwright-Messungen, nie Augenschein.
- **`npm run check:tokens` meldet 7 von 50 Tokens als wirkungslos.** Alle sieben werden im SCSS
  gelesen, `--tpl-rule-strong` einundzwanzigmal — die Messung erreicht ihre Zustände (Hover, mobil)
  nicht. Ich habe die Zahl nicht gegen einen Stand *vor* diesem Diff gehalten; BEFUNDE 60 nennt
  „4 von 53" für den 2026-09-06. Ob die drei dazugekommenen meine sind, weiß ich nicht.

## Was ausdrücklich kein Befund ist

Diese Dinge hat der Nutzer entschieden, nicht ich:

- Dass die Palette jetzt ein Blau und ein Petrol trägt statt Navy und Sienna.
- Dass der Kopf keine Scroll-Effekte mehr hat. *Wie* er sie ersetzt, ist dagegen meine Entscheidung
  und damit sehr wohl ein Befund wert.
- Dass die Kapitelnamen die Form „1 – Einstieg" tragen, und dass dafür nur die Titel geändert
  wurden und nicht die Ordner.
- Dass die Breakpoint-Angleichung in der App sitzt und nicht in der Vorlage.
- Dass die Seitenleiste „Backups" sagt und alles darin „Snapshot": bekannt, Oberfläche eingefroren.

## Was ich gefunden und liegengelassen habe

Sie stehen hier, damit du sie nicht für Funde hältst — und damit du widersprechen kannst.

- **Die Vorlage könnte ein Skript mitliefern.** Das `html:`-Feld der Layout-Box geht ungefiltert
  über `dangerouslySetInnerHTML` in die statische Ausgabe; ein `<script>` darin stünde im
  ausgelieferten Dokument. BEFUNDE 70 behauptet das Gegenteil (dort auf Head-Schnipsel und
  `custom.js` bezogen). Ich habe es **nicht bewiesen** und nichts darauf gebaut.
- **`quartz-layout-box` hat keine Rückfall-Syntax für Platzhalter.** Die saubere Lösung für BEFUNDE
  81 läge dort, nicht in der Vorlage. Eigenes Repository des Nutzers.
- **Vier Wikilinks im Vault hatten einen Zeilenumbruch mitten im Link** und standen als Rohtext auf
  der Website. Repariert, aber sie sind älter als dieser Durchgang — es gibt keine Prüfung, die
  so etwas findet.
- **Die Dateizeiten des Vaults sind jetzt eine Setzung**, gestaffelt nach der Gliederung. Die
  Alternative wäre, ein Datum ins Frontmatter zu schreiben; das hätte 266 Notizen angefaßt.
- **`--tpl-header-title` wird noch einmal gelesen**, seit nichts es mehr animiert.
- **Auf Canvas-, Excalidraw- und der 404-Seite gibt es mobil keinen Explorer und keinen Burger**,
  weil `left` dort im Frame `hidden` ist. Vorbestehend, nicht angefaßt.
- **Die zwei leeren `custom`-Bereiche sind weg** — der eine verbliebene trägt jetzt Inhalt. Der
  Auftrag des dreizehnten Reviews führt sie noch unter „kein Befund".

## Ablauf

Alles läuft ohne Netz. Auf diesem Stand grün, am 2026-09-09 nachgefahren:

    npm run typecheck                     grün
    npm run build                         grün
    npm run smoke                         42 Aufrufe, keine Auffälligkeiten
    npm run check:i18n                    keine fehlenden Schlüssel
    npm run check:semver                  alle richtig
    npm run check:plugin-names            alle richtig
    npm run check:handbook                26 Zitate, 0 ohne Entsprechung

Dazu die Prüfungen der Vorlage:

    npm run template:example -- --check-contrast     89 Paare, 0 unter der Schwelle
    npm run template:example -- --only 9             12 von 12 Bausteinen
    npm run template:example -- --only 10,11         4 Frames, 6 Layout-Boxen, 0 Warnungen

Wenn eine davon nicht grün ist, ist das dein erster Befund.

Ein echtes Quartz-Projekt liegt unter `~/Documents/Example`, der zugehörige Vault unter
`~/Obsidian/QuartzProjekte/Example`; beide sind auf diesem Stand committet. **Verändere sie nicht**;
kopieren und lesen ist in Ordnung. Für eine Messung an der gebauten Website genügt ein
Server auf `~/Documents/Example/public` — der Stand dort entspricht dem Diff. Es kann sein, dass der
Nutzer die App und einen Dev-Server offen hat: `running-servers.json` prüfen, bevor du die gebaute
App startest, und im Zweifel ein eigenes `--user-data-dir` nehmen.

Playwright hat hier **Firefox und WebKit**, aber kein Chromium; für Chromium-Messungen nimmt dieses
Repo Electron (`_electron.launch`, siehe `scripts/smoke.mjs`).

Sag bei jedem Befund dazu, ob du ihn **gelesen** oder **gemessen** hast, und bei einem gelesenen,
was ihn messbar machen würde.

## Form der Befunde

Wie bei den letzten zehn: je Befund eine Überschrift, die die Sache benennt, dann was passiert, dann
woran du es festmachst (Datei und Zeile), dann eine Einschätzung der Schwere (Hoch/Mittel/Niedrig,
Maßstab in `docs/REVIEW-2026-09-12.md`). Kein Fix im Text — darüber entscheidet der Nutzer.

Leg das Ergebnis als `docs/REVIEW-2026-09-14.md` ab.

Wenn du nichts findest, ist das ein Ergebnis. Schreib dann, wo du gesucht hast.
