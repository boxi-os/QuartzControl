# Export als PDF, ePub und Offline-HTML

Begonnen am 2026-11-05 auf `feat/1.3`: ein Zieltyp „Dokument“ unter „Veröffentlichen“, Quelle ist
die gebaute Website (je Seite das `<article>`, ein Dokumentmodell, drei Schreiber). Neue Einträge
kommen mit derselben Form dazu: was gemessen wurde, womit, und was daraus folgt.

### Vorher-Messung: das alte Handbuch-Skript (2026-11-05)

`scripts/build-handbook-pdf.mjs` (Playwright, `channel: 'chrome'`) gegen den Handbuch-Bau in
`resources/handbook` vom 2026-10-26, Ausgabe in den Scratchpad statt nach `release/`:

- 56 Quellseiten, eine Weiterleitung übersprungen (`4-gestaltung/07-layout-global-und-seitentypen.html`)
- **129 PDF-Seiten**, A4, getaggt, `/Lang (de)`, Titel „QuartzControl – Handbuch“, kein Autor
- Lesezeichen je Ebene **10 / 47 / 244 / 4**
- 353 interne Verweise mit Ziel, 46 Bilder, 12,5 MB
- 43 s Laufzeit (Chrome startet, jede Seite mit `networkidle`)

Gezählt mit einem pdf-lib-Leser im Scratchpad (Seiten über `getPageCount`, Lesezeichen über
`/Outlines` → `/First`/`/Next` rekursiv, getaggt über `/MarkInfo`), gegengeprüft mit `pdfinfo`
(129 Seiten, Tagged yes). Das ausgelieferte `release/QuartzControl-Handbuch-1.2.0.pdf` zählt
genauso: 129 Seiten, 10/47/244/4. Die Zahlen im Kopf des Skripts (115 Seiten, 10/48/235) sind vom
September und stimmen nicht mehr. Sie sind ein Grund mehr, dass jeder Lauf seine Zahlen selbst
nennt.

### Spike: dasselbe PDF aus Electron statt Chrome (2026-11-05)

Ein Electron-Hauptskript im Scratchpad, das die Funktionen des alten Skripts (`outline`,
`extractPage`, `findProblems`, `PRINT_CSS`) unverändert importiert und nur den Browser tauscht:

- unsichtbares `BrowserWindow` (`show: false`, `sandbox: true`, kein Preload, eigene `partition`)
- je Seite `loadURL` → warten auf `document.fonts.ready` und alle Bilder → `extractPage` per
  `executeJavaScript`
- Gesamtdokument über denselben lokalen Server, Druckmedium über den Debugger
  (`Emulation.setEmulatedMedia`, `media: 'print'`), dann `findProblems`
- `webContents.printToPDF` mit `pageSize: 'A4'`, Rändern in Zoll, `generateDocumentOutline`,
  `generateTaggedPDF`, Fußzeilen-Vorlage wie im Skript

Ergebnis, gezählt wie oben:

| | Chrome (alt) | Electron 43.4.1, macOS arm64 | Electron 43.4.1, Debian 13 aarch64 |
|---|---|---|---|
| Chromium | Chrome des Systems | 150.0.7871.224 | 150.0.7871.224 |
| PDF-Seiten | 129 | 129 | 129 |
| Lesezeichen je Ebene | 10/47/244/4 | 10/47/244/4 | 10/47/244/4 |
| getaggt, `/Lang` | ja, de | ja, de | ja, de |
| Befunde (Rand, Verweise, Bilder) | 0 | 0 | 0 |
| Laufzeit | 43 s | 6,7 s (5,1 s Sammeln, 1,7 s Drucken) | 5,7 s |

**Folge:** Der Export braucht kein Chrome. Die beiden als experimentell markierten Optionen
(`generateTaggedPDF`, `generateDocumentOutline`, Electron-Doku v43.4.0) liefern in Electron 43
dasselbe wie Chromes `outline`/`tagged`, auf beiden Systemen.

**Seitenrand-Boxen gehen.** Ein Testdokument mit `@page { @top-left { content: "KOPFZEILE" }
@bottom-center { content: "SEITE " counter(page) " VON " counter(pages) } }` und
`preferCSSPageSize: true` druckt „KOPFZEILE“ und „SEITE 1 VON 2“ (gelesen mit `pdftotext`), auf
macOS und Linux. Kopf- und Fußzeilen können also aus dem CSS kommen statt aus `headerTemplate`.

**Silbentrennung geht nur auf macOS.** Dieselbe 120 px breite Spalte mit drei langen deutschen
Wörtern, einmal ohne, einmal mit `hyphens: auto` und `lang="de"`:

- macOS: `scrollWidth` 313 → 120, Höhe 56 → 148 px (getrennt)
- Linux: 312 → 312, Höhe 54 → 54 (nicht getrennt)

Electron bringt unter Linux nur `hyph_en*.dic` mit (`node_modules/electron/dist/`), und das System
hat kein `/usr/share/hyphen`. Chrome lädt die Muster dort über den Komponenten-Updater nach, den
Electron nicht hat. **Folge:** `hyphens: auto` allein reicht nicht. Entweder trennt der Export
selbst (weiche Trennstriche vor dem Drucken, wirkt dann auch im ePub), oder die Option sagt unter
Linux „wirkt nicht“. Entschieden wird beim PDF-Schreiber.

**Die Website lädt Fremdes, und nicht alles davon darf ein Export laden.** Der Spike sperrte jede
Anfrage außerhalb der eigenen Origin und zählte 275 (macOS) bzw. 260 (Linux) über 56 Seiten:
KaTeX-CSS und `copy-tex.js` von jsdelivr, `d3` für den Graphen und **das Plausible-Skript**
(`plausible.io/js/script.manual.js`). Daraus zwei Regeln für das Exportfenster:

- Stylesheets und Schriften von außen müssen durch, sonst fehlen Formeln (KaTeX) und Schriften
  (Google Fonts bei `fontOrigin: googleFonts`). Der Export braucht dann Netz und sagt das.
- Skripte und Anfragen an Analytics-Dienste dürfen nicht durch: Ein Export, der jede Seite lädt,
  zählte sonst 56 Besuche auf der echten Statistik.

Das Handbuch-PDF sah trotz gesperrtem KaTeX-CSS fehlerfrei aus, weil es keine Formeln hat. Die
Regel muss deshalb an einem Projekt mit Formeln gemessen werden.

### Das Buch liegt versioniert im Projekt, und Unlesbares bleibt liegen (2026-11-05)

Ein Buch ist `quartz-books/<id>.json` im Projektwurzelordner (`shared/bookDefinition.ts`,
`bookService.ts`), nicht in `.quartz-gui/`. Der Grund: `.quartz-gui/` ist gitignoriert, ein Buch
käme mit Git-Sync also nicht mit, und es beschreibt Inhalt (welche Seiten, welche Reihenfolge),
keine Einstellung dieses Rechners. Außerhalb von `content/` und `static/` baut und veröffentlicht
Quartz es nicht; Snapshots (`BASE_EXCLUDES` nennt den Ordner nicht) und Projektkopien
(`duplicateService` `SKIP` ebenso wenig) nehmen es mit.

**Gelesen wird nicht über `jsonStore.readJsonFile`**, obwohl die Regel „JSON-Stores nur über
`jsonStore.ts`“ das verlangt. jsonStore benennt eine unlesbare Datei in `<name>.corrupt-<zeit>` um.
Bei einer versionierten Datei mit Merge-Konflikt landete die Umbenennung samt Kopie im nächsten
Commit des Nutzers. Ein unlesbares Buch bleibt deshalb liegen, wird mit Grund gelistet
(`BookListing.unreadable`), und ein Speichern unter seiner Kennung wird abgelehnt, bis es wieder
lesbar ist. Geschrieben wird weiter über `writeFileAtomic`.

Gemessen an der gebauten App mit einem Playwright-Skript im Scratchpad (Wegwerfprofil,
Wegwerfprojekt):

- Eine Liste in einem Projekt ohne Bücher legt keinen Ordner an.
- Zweimal derselbe Titel ergibt `handbuch-fuer-einsteiger` und `handbuch-fuer-einsteiger-2`.
- Eine doppelte Seite in `order` behält ihren ersten Platz.
- Ein unbekannter Schlüssel (`future`) übersteht das Speichern.
- `kaputt.json` mit `<<<<<<< HEAD` steht unter `unreadable`, und Speichern darüber wird abgelehnt;
  die Datei ist danach unverändert.
- `Notizen.json` (keine gültige Kennung) wird übergangen.
- Die Kennung `../x` und `toc: 'ja'` scheitern am zod-Schema.
- `quartz-books` als Verknüpfung in einen anderen Ordner: Das Speichern wird abgelehnt, und der
  Ordner bleibt leer.

### Die Seiten einsammeln: Navigation, Sprache, Fremdes (2026-11-05)

`electron/main/services/export/`: `siteServer.ts` (Kopie des Baus, per `COPYFILE_FICLONE`
geklont, über `127.0.0.1:0`), `exportWindow.ts` (unsichtbar, Sandbox, kein Preload, eigene
Sitzung im Speicher), `pageScripts.ts` (Code, der in der Website läuft), `collect.ts`; die reinen
Regeln in `shared/exportModel.ts`. Gemessen mit einem esbuild-Bündel dieser Module, das in Electron
43.4.1 läuft (Scratchpad, CommonJS, Ausnahmen abgefangen, damit kein Fehlerdialog erscheint), gegen
Kopien von `resources/handbook` (Explorer) und `Example/public` vom 2026-11-04
(quartz-navigations, Deutsch und Englisch, Mermaid, KaTeX, bases-page, Canvas, Excalidraw).

**Reihenfolge aus der gerenderten Navigation.** Handbuch: `.explorer`, 56 Seiten, die Startseite
listet der Explorer nicht (sie wird vorangestellt). Example: `nav.quartz-nav`, 137 Seiten je
Sprache, alle Ordner aufgeklappt im DOM. Mit der Reihenfolge des alten Skripts als eigener
Reihenfolge (Kapitel numerisch, „Anhang“ als Zwischenüberschrift, drei Anhangsseiten) ergibt das
Handbuch-PDF wieder **10/47/244/4** Lesezeichen und 128 Seiten, also 129 mit Deckblatt wie vorher.
In der Reihenfolge des Explorers stehen die drei Anhangsseiten nach Titel sortiert auf Ebene 1
(12/53/235/4); dafür gibt es die eigene Reihenfolge.

**Tag-Seiten sind keine Buchseiten.** `contentIndex.json` führt `tags/<tag>` mit einer erfundenen
`filePath` `tags/<tag>.md`; ohne Filter standen 18 davon als „nicht in der Navigation“ im
Handbuch.

**Die Sprache sagt die Website selbst.** quartz-multilanguage schreibt `static/multilanguage.json`
mit `languages[].home` und `pages[slug].lang`. Ein englisches Buch im Example beginnt bei
`en/index`. Von der Wurzel der Website gezählt stand jede Seite eine Ebene zu tief (`en/index` h2,
ihre Seiten h3); gezählt wird deshalb ab dem Ordner der Startseite der Sprache
(`effectiveRoot`). Danach haben Deutsch und Englisch dieselbe Gliederung (8/46/252–253/260/23).

**Seiten anderer Plugins:** Eine `.base`-Seite von bases-page hat kein `<article>`, der Lauf brach
an ihr ab. Ihr `.bases-page` gilt jetzt als Artikel, die aktive Ansicht bleibt, die Reiter gehen.
Eine Excalidraw-Zeichnung bleibt als SVG. Ein Canvas wird zu einem Satz mit Adresse, weil eine
verschiebbare Fläche aus positionierten Karten auf Papier kein Layout hat. Formulare, eingebettete
Rahmen und Videos werden ebenso ersetzt; der Satz steht in der Sprache des Dokuments
(`mainTIn`), nicht in der der App.

**Bilder werden beim Einsammeln nicht abgewartet.** Ein `loading="lazy"`-Bild lädt in einem
Fenster, das niemand rollt, nie. Das Warten darauf kostete im Example 45 s für 137 Seiten, ohne es
sind es 15 s. Ob jedes Bild ankommt, prüft das zusammengesetzte Dokument; dort fehlte keines.

**Fremde Anfragen** nach der Regel aus dem Spike: Mermaid-Skripte von cdnjs dürfen durch, alle
Diagramme rendern (0 nicht gerendert). Gesperrt und gezählt: 169–171 Skripte von jsdelivr (KaTeX
`copy-tex`, d3, pixi), 55–57 von Plausible (Handbuch), dazu ein eingebettetes PDF im Example als
`subFrame`.

**Ein Fehler in der Seite kommt mit seiner Meldung zurück.** `executeJavaScript` meldet einen
Wurf nur als „Script failed to execute“. `ExportWindow.run` fängt ihn in der Seite und gibt die
Meldung weiter; erst so war die `.base`-Seite zu finden.

**Offen für den PDF-Schritt:** Die Randprüfung des alten Skripts meldet im Example 22 (de) bzw.
27 (en) Elemente über dem Rand, darunter KaTeX-Pfade mit 6500 px, die ihr Elternelement abschneidet
(Fehlalarm), und Codeblöcke mit 30–34 px (echt).

**Das unsichtbare Fenster ist kein Fenster der App** (`appWindows.ts`). Broadcast, Menü-Events,
Theme-Farbe, macOS-`activate` und die Eltern der nativen Dialoge fragten
`BrowserWindow.getAllWindows()`. Mit dem Exportfenster gingen sonst die Logs der App in die
Website, und ein Bestätigungsdialog konnte an einem Fenster hängen, das niemand sieht.

### Der PDF-Schreiber (2026-11-05)

`documentHtml.ts` setzt das Dokument zusammen (Deckblatt, Inhaltsverzeichnis, Seiten mit den
Stylesheets der Website und den Druckregeln des alten Skripts); `writePdf.ts` prüft und druckt.
Gemessen mit demselben esbuild-Bündel in Electron 43.4.1, Ausgabe gelesen mit pdf-lib und
`pdfinfo`, Seiten als Bild mit `pdftoppm` angesehen.

| | Handbuch (eigene Reihenfolge) | Example de | Example en |
|---|---|---|---|
| PDF-Seiten | 132 (129 + 3 Seiten Inhalt) | 265 | 250 |
| Lesezeichen je Ebene | 10/47/244/4 | 8/46/252/260/23 | 8/46/253/260/23 |
| Durchgänge | 2 | 2 | 2 |
| geprüfte Verweise / Bilder | 410 / 46 | 990 / 9 | 1080 / 9 |
| Einsammeln / Schreiben | 4,3 s / 4,1 s | 14,4 s / 6,9 s | 14,6 s / 6,9 s |

**Seitenzahlen im Inhaltsverzeichnis über benannte Ziele.** Chromium schreibt für jeden Anker, auf
den ein Link zeigt, einen Eintrag in `/Dests` des Katalogs (am Handbuch: 91 Einträge, jeder mit
der richtigen Seite). Das Inhaltsverzeichnis verlinkt jede Seite, also kennt der erste Druck alle
Seiten; der zweite trägt sie ein. Platzhalter `000` in einer Spalte fester Breite: In allen drei
Läufen hat sich kein Ziel verschoben (zwei Durchgänge). Kapitel 4.6 steht im Verzeichnis auf
Seite 60 und im PDF auf Seite 60.

**Kopf- und Fußzeile kommen aus `@page`-Randboxen** (Titel links, „Seite / Seiten“ rechts, nicht
auf dem Deckblatt), mit `preferCSSPageSize`. Das Inhaltsverzeichnis hat keine Überschrift aus
`h1`–`h6`, damit es nicht als Lesezeichen erscheint; die Lesezeichen des Handbuchs bleiben
10/47/244/4.

**Metadaten setzt pdf-lib** (Titel, Betreff = Untertitel, Autor, Schlüsselwörter, Creator
„QuartzControl“, Sprache). Danach ist das PDF weiter getaggt und hat dieselben Lesezeichen
(`pdfinfo`, pdf-lib).

**Die Randprüfung zählt nur Sichtbares.** Im Example meldete die Prüfung des alten Skripts
KaTeX-Pfade mit 6500 px: KaTeX zeichnet dehnbare Zeichen als 400em breite SVG-Pfade in einer Box
mit `overflow: hidden`. Jetzt begrenzt jeder Vorfahr mit `hidden`/`clip`, was zählt, und von einem
überstehenden Teilbaum wird nur das äußerste Element genannt. Übrig blieben fünf echte Funde, alle
Codeblöcke: Die Example-Vorlage gibt `pre > code` ein Grid mit `min-width: max-content` (für das
waagrechte Rollen auf der Website), dann bricht keine Zeile um (7–75 px über dem Rand). Die
Druckregel setzt `display: block` und `min-width: 0`; danach 0 Funde, und das Handbuch-PDF ist
unverändert.

**Silbentrennung ist nicht eingebaut.** `hyphens: auto` trennt Deutsch nur unter macOS
(Spike oben). Eine Trennung mit eigenen Mustern ist eine eigene Entscheidung, die das Handbuch-PDF
bisher nicht brauchte.

### Mermaid im Dokument: vier Fehler an einem Flussdiagramm (2026-11-05)

Beim Ansehen der Example-PDF (Seite „Flussdiagramme“, `pdftoppm`) war jedes Diagramm eine schwarze
Fläche. Vier Ursachen, je eine Korrektur, jede an der Seite als Bild nachgemessen:

1. **Das Einsammeln entfernte jedes `<style>`**, auch das im SVG, in dem Mermaid seine Formen
   gestaltet. Ein `<style>` innerhalb eines SVG bleibt jetzt.
2. **Die `id`s im SVG bekamen das Seitenpräfix**, aber die Verweise darauf nicht
   (`#mermaid-0 .node` im Style, `url(#…)` der Pfeilspitzen, `aria-labelledby`). Jetzt wird je SVG
   jede `id` umbenannt und jeder Verweis mit, so dass zwei Diagramme mit derselben Wurzel-`id`
   getrennt bleiben.
3. **Dunkel gerendert:** Das Fenster erbte den Dark Mode, Quartz wählte das dunkle Theme und
   Mermaid mit ihm. Das Exportfenster setzt vor der ersten Seite auf der eigenen Origin
   `prefers-color-scheme: light` (über den Debugger, der erst nach einer ersten Navigation
   angehängt werden kann; am leeren Startdokument scheiterte er mit „target closed“) und Quartz'
   eigenes `localStorage.theme = 'light'`.
4. **Beschriftungen abgeschnitten** („Alle zwölf“ statt „Alle zwölf Bausteine?“): Mermaid misst in
   der Schrift des Codeblocks, im Dokument erbte das SVG eine andere. Die berechneten
   Schriftwerte jedes Elements werden beim Einsammeln ans SVG geschrieben.

Dazu die Größe: Die Druckregel `max-width: 100% !important` streckte jedes Diagramm auf volle
Breite. Ein Mermaid-SVG bringt seine natürliche Breite als `max-width` im `style` mit, und die
gilt jetzt.

**Und ein Wettrennen:** Mermaid legt zuerst ein leeres Mess-SVG (300×150, ein Kind) in den Block
und ersetzt es später. Das Warten nahm das erste SVG als fertig: gitGraph und Mindmap waren leere
Kästen, und in einem Lauf fehlte das Sequenzdiagramm ganz; in einem anderen war sein Platz im
Druck leer. Fertig ist ein Diagramm jetzt erst mit `aria-roledescription` (das trägt nur Mermaids
Ergebnis) und wenn seine Elementzahl drei Takte (150 ms) gleich bleibt; Seiten ohne Diagramm
warten nicht. Danach in zwei Läufen alle 12 Diagramme des Example vollständig (Zustand, Journey,
gitGraph, zwei Flussdiagramme, Sequenz, Klasse, ER, Mindmap, Torte, Quadrant, Sankey), das
Sequenzdiagramm im Druck sichtbar. Handbuch unverändert 132 Seiten, 10/47/244/4.

### Der ePub-Schreiber und epubcheck (2026-11-05)

`writeEpub.ts` und `pageScripts.epubChapters`: je Seite eine XHTML-Datei, im Exportfenster mit
`XMLSerializer` erzeugt und mit `DOMParser` (`application/xhtml+xml`) auf Wohlgeformtheit geprüft,
dazu `nav.xhtml`, ein Deckblatt, ein eigenes Lese-CSS, die Bilder der Website und `content.opf`
mit Barrierefreiheits-Metadaten. Gezippt mit `zipArchive.ts`, das dafür `store` gelernt hat:
`mimetype` steht zuerst und ungepackt (`unzip -lv`: „Stored 20“).

**Geprüft mit epubcheck 5.4.0** (W3C-Release von GitHub, OpenJDK 21 aus Debian) auf der debian-vm,
weil der Mac kein Java hat; Debians eigenes Paket ist 4.2.6 und kennt EPUB 3.3 nicht. Der erste
Lauf fand fünf Arten von Fehlern, jede mit einer Regel behoben:

| Fund | Ursache | Regel |
|---|---|---|
| `width`/`height` kein Integer (Handbuch, 27×) | `<img width="auto">` u. ä. | ins `style`, „auto“ entfällt |
| `<p>` an dieser Stelle nicht erlaubt (Example, 32×) | Mermaid: `<span class="nodeLabel"><p>` | wird ein `span` mit `display: block` |
| doppelte ID | Mermaids Zeitstrahl: `node-undefined` mehrfach | Zähler an die späteren |
| `aria-describedby` ohne Ziel | Mermaid verweist auf eine Beschreibung, die es nicht schreibt | toter Name entfällt |
| nicht deklarierte entfernte Ressource | Excalidraw lädt die Schrift Virgil von unpkg | `@font-face` mit fremder URL entfällt |

Danach: **Handbuch, Example de und Example en je „0 Schwerwiegende Fehler / 0 Fehler /
0 Warnungen / 0 Informationen“.**

**Formeln werden Bilder.** Quartz 5 rendert KaTeX nur als HTML (Example: `katex-html`, kein
`katex-mathml`). Dieses HTML braucht KaTeX' Stylesheet und Schriften, die ein Reader nicht hat,
und den TeX-Quelltext enthält der Build nicht. Jede Formel wird deshalb im Exportfenster mit den
Stylesheets der Website gezeichnet (`capturePage` bei Zoom 3; im unsichtbaren Fenster liefert das
Bilder, gemessen) und als PNG mit Größe in `em` eingesetzt, damit sie mit der Schrift des Readers
wächst. Alternativtext „Formel“. Im Example 10 Formeln, eine davon als Bild angesehen (scharf).
Die erste Fassung zählte 0 Formeln: `isConnected` ist für Elemente eines losgelösten Containers
immer falsch.

**Bilder von anderswo** werden ein Link (ePub erlaubt entfernte Ressourcen nur für Audio, Video
und Schriften), Formate außerhalb der Kernliste (AVIF, BMP, TIFF) ihr Alternativtext; beides wird
gezählt. Im Handbuch und im Example kam beides nicht vor.

Angesehen in Chromium (die Kapitel-Dateien als `file://`, gedruckt mit `pdftoppm`): Formelseite,
Sequenzdiagramm. Codezeilen standen zentriert, weil Quartz Codeblöcke in `<figure>` legt; zentriert
wird jetzt nur `figure.qc-diagram`. In Apple Books angesehen erst danach, siehe „Das ePub in
Apple Books“ unten; Thorium und Calibre nicht.

### Das Offline-HTML, und ein Wettrennen beim Zeichnen der Formeln (2026-11-05)

`writeHtml.ts` setzt den Inhalt zusammen, den auch das ePub bekommt
(`writeEpub.prepareBookContent`, danach `packEpub` bzw. `packHtml`): Kapitel, Navigation, Bilder
als `data:`-URI, keine Skripte, keine Stylesheets der Website. So gilt für das HTML, was epubcheck
für das ePub bestätigt hat, und KaTeX braucht keine Schriften vom CDN. Über 200 MB (geschätzt vor
dem Kodieren) wird abgelehnt.

Geprüft in einem Electron-Fenster, das jede Anfrage außer `file:` und `data:` sperrt und zählt:

| | Handbuch | Example de |
|---|---|---|
| Größe | 18,0 MB | 1,7 MB |
| Netzanfragen | 0 | 0 |
| Bilder / davon nicht geladen | 46 / 0 | 19 / 0 |
| interne Verweise / ohne Ziel | 410 / 0 | 1073 / 0 |
| Skripte | 0 | 0 |

**Die Formelbilder waren teils falsch.** Beim Ansehen des HTML stand unter „Zu breite Formeln“ die
Matrix davor. `capturePage` nimmt das zuletzt gemalte Bild, und direkt nach dem Austausch der
Formel war das noch die vorige. Jetzt wird nach dem Austausch zwei Animationsframes gewartet.
Vorher hatten von den zehn PNGs des Example mehrere die Größe ihres Vorgängers; danach sind alle
zehn verschieden, die breite Formel als Bild angesehen (vollständig). Das ePub aus dem vorigen
Abschnitt hatte denselben Fehler, epubcheck kann ihn nicht sehen. Nach der Korrektur: Handbuch und
Example de wieder je 0 Fehler, 0 Warnungen.

### Der Zieltyp „Dokument“ in der App (2026-11-05)

`PublishDestination` hat den Typ `document` (`path`, `bookId`, `formats`); der Adapter
`deploy/document.ts` passt in das Modell der Seite: `preview` nennt die Dateien, die entstehen
(`neu` oder `geändert`), `run` exportiert über `export/exportService.ts` und schreibt jede Datei
unter einem Hilfsnamen mit anschließendem `rename`. Gelöscht wird nie etwas. Der Fortschritt läuft
über den vorhandenen Deploy-Zähler (Seite für Seite, dann „PDF“, „ePub“), Abbrechen über den neuen
Kanal `export:cancel`. Jeder Export endet auch, wenn das letzte Fenster der App schließt: Sonst
hielte das Exportfenster die App unter Linux und Windows am Leben.

Gemessen an der gebauten App mit Playwright (Wegwerfprofil, Wegwerfprojekt aus der Config und
einer Build-Kopie des Example; Buch und Ziel über IPC angelegt, geklickt wird auf der Seite):

- „Jetzt exportieren“ mit allen drei Formaten: 26,5 s, drei Dateien im Zielordner, der Bericht
  nennt Quelle der Reihenfolge, 5 ersetzte Elemente, 66 Verweise auf die Website, PDF 264 Seiten
  mit Lesezeichen 8/46/252/260/23, ePub 137 Kapitel, HTML 1,7 MB, 10 Formeln als Bild, Netz
  benutzt, 414 gesperrte Anfragen. Der Diff zeigte vorher „Neu (3)“, beim zweiten Lauf
  „Geändert (3)“.
- „Export abbrechen“ nach 3 s: „Der Export wurde abgebrochen. Es wurde nichts geschrieben.“ nach
  3,9 s, keine Datei des Buchs im Ordner.

**Zurückgebliebene Kopien des Builds.** Nach den Messläufen lagen 51 Ordner
`quartzcontrol-export-*` im Temp-Verzeichnis, alle aus dem Messgeschirr: Dort war das
Exportfenster das letzte Fenster, sein Schließen beendete Electron, bevor die Kopie gelöscht war
(ein Lauf: 50 → 51). In der App hält das Hauptfenster sie am Leben, beide App-Läufe räumten auf;
dieselbe Lücke hat die App aber, wenn sie mitten im Export beendet wird oder abstürzt. Beim Start
entfernt `sweepExportTempDirs` deshalb Kopien, die älter als eine Stunde sind (Muster:
`sweepRelayTempDirs`). Gemessen mit `npm run smoke`: vorher 6 Kopien älter als eine Stunde, danach
0, die jüngeren unberührt.

### Die Seite „Dokumente“ (2026-11-05)

Neue Seite in der Gruppe „Veröffentlichung“ zwischen Git-Sync und Veröffentlichen
(`src/routes/Documents/`): links die Bücher (`SelectableRow`, Mülleimer mit Frage) und ihre Seiten,
rechts das Buch (Titel, Untertitel, Autor, Sprache bei mehrsprachigen Websites, Ordner, Bild auf
dem Deckblatt, Inhaltsverzeichnis, Verweise nach außen, Papierformat). Gespeichert wird
ausdrücklich (Knopf oder Cmd+S), `dirty` per Vergleich mit dem Gelesenen, Verlassen fragt.

Die Seiten liest der neue Kanal `books:sitePages` so, wie ein Export sie liest: Kopie des Builds,
Exportfenster, gerenderte Navigation. Am Example 0,8 s. Zwei Modi wie in `resolveOrder`: der
Navigation folgen (Häkchen lassen Seiten aus, Seiten außerhalb der Navigation werden genannt) oder
eine eigene Reihenfolge (Drag mit `@dnd-kit` nach dem Muster von `FormFieldsEditor`, Pfeile,
Zwischenüberschriften; neue Seiten der Navigation stehen als „wird am Ende angefügt“ darunter).

Gemessen an der gebauten App mit Playwright (Wegwerfprofil und -projekt wie oben): Buch angelegt,
1.2 abgewählt, auf eigene Reihenfolge gewechselt, 1.1 per Pfeil hinter 1.2, die Startseite per
Tastatur zwei Plätze tiefer (Leertaste, zweimal Pfeil runter, Leertaste; angesagt „Example bei
1.2 – Die Werkzeuge abgelegt.“), Zwischenüberschrift „Anhang“ angefügt, Titel und Autor gesetzt,
gespeichert. Die Datei hat 138 Einträge in genau dieser Reihenfolge, `excluded` die abgewählte
Seite. Hell und dunkel angesehen. Der erste Tastatur-Drag des Skripts blieb an seinem Platz,
weil die Tasten ohne Pause kamen; mit 350 ms dazwischen trifft er. Die Auswahl der Verweise hatte
zuerst keine sichtbare Beschriftung und steht jetzt in einer `FieldGroup`.

Die Kennung eines Buchs (sein Dateiname) entsteht aus dem ersten Titel und bleibt, wenn der Titel
sich ändert: Ein Ziel nennt sein Buch über diese Kennung.

### Register und „Verweise auf diese Seite“ (2026-11-05)

Beides kommt aus dem, was Quartz selbst aufgezeichnet hat (`contentIndex.json`: `links` und
`tags` je Seite, dieselbe Quelle, aus der die Backlinks-Komponente der Website liest), gezählt nur
innerhalb des Buchs (`backlinksInBook`, `tagRegister` in `shared/exportModel.ts`). Beides wird vor
den Schreibern in die gesammelten Seiten geschrieben, so dass PDF, ePub und HTML es gleich
bekommen: die Verweise als `<aside>` am Ende einer Seite, das Register als eine weitere Seite am
Ende des Dokuments (Kennung `__quartzcontrol/register`, die keine Quartz-Seite haben kann). Seine
Seitenzahlen trägt im PDF der zweite Durchgang ein wie im Inhaltsverzeichnis; ePub und HTML
lassen sie weg.

Gemessen an der gebauten App (Example, beide Extras an): 682 Verweise, Register mit 35
Schlagwörtern, PDF 287 Seiten mit Lesezeichen 9/46/252/260/23 (das Register ist der eine neue
Eintrag auf Ebene 1), kein Platzhalter `000` übrig (`pdftotext`). Stichprobe: Das Register nennt
„6.1 – Etwas ändern“ mit 231, und Seite 231 beginnt mit dieser Seite und endet mit „Verweise auf
diese Seite“ (5 – Die Gestaltung, 6 – Anpassen, 7.1 – Glossar). ePub: epubcheck 0 Fehler,
0 Warnungen. HTML: 1983 interne Verweise, keiner ohne Ziel, keine Netzanfrage.

### Dokumente mit der Website hochladen (2026-11-05)

Ein Website-Ziel (SFTP, FTP, Ordner, Git-Branch) nennt in `withDocuments` Dokument-Ziele, deren
zuletzt geschriebene Dateien mit hochgehen, unter `downloads/`. `deploy/staging.ts` baut dafür vor
jedem Diff und jedem Lauf `.quartz-gui/staging/<ziel>`: die Dateien des Builds als Hardlinks
(eine Kopie, wo der Build auf einem anderen Laufwerk liegt), die Dokumente als Kopien. Jeder
Adapter sieht so einen gewöhnlichen Build-Ordner; in `public/` wird nichts geschrieben, weil dieser
Ordner seinen eigenen Schreiber hat. Danach wird der Staging-Ordner entfernt. Er ist in
`isSnapshotWorthy()` und in `SKIP` (`duplicateService`) eingetragen.

Statt eines Snippets für quartz-layout-box, wie geplant, bietet das Formular je Datei einen
Markdown-Link mit voller Adresse aus `baseUrl` zum Kopieren an. Er braucht kein Plugin, und ein
Link, der mit `/downloads/` beginnt, bräche auf einer Website unter einem Unterpfad (GitHub Pages:
`/<repo>/`).

Gemessen an der gebauten App (Wegwerfprojekt, ein Dokument-Ziel mit PDF und ePub, ein Ordner-Ziel
mit „Dokumente mit hochladen“ und `deleteRemoved`):

- Diff: `downloads/handbuch.epub` und `.pdf` als „Neu“, zusammen mit 641 Dateien des Builds.
- Lauf: beide Dateien im Zielordner unter `downloads/`, der Staging-Ordner danach leer.
- Build neuer als die Dokumente (`index.html` per `utimes` eine Minute später): Der Lauf beginnt mit
  „handbuch.pdf ist älter als der Build. Für den neuen Stand zuerst … exportieren.“, für beide
  Dateien.
- Mitladen aus: Der Diff zeigt beide als „Entfernt“, der Lauf löscht sie im Ziel.

**Ein Fehler beim Ansehen des Formulars:** „Bearbeiten“ baute den Entwurf Feld für Feld
(`draftOf`) und ließ `withDocuments` aus. Der Schalter stand auf aus, und das nächste Speichern
hätte die Dokumente still abgeschaltet. `draftOf` übernimmt das Feld jetzt; danach steht der
Schalter an, mit beiden Links.

### Das Handbuch-PDF über den Export (2026-11-05)

`scripts/build-handbook-pdf.mjs` hat keinen eigenen Weg mehr: Es bündelt `exportService` mit
esbuild, führt das Bündel in Electron aus und bekommt das Buch aus `scripts/handbook.book.json`
(eigene Reihenfolge wie die alte: Kapitel nach Nummer, „Anhang“, drei Anhangsseiten). Eine Seite,
die der Export anhängen müsste oder die fehlt, bricht den Lauf ab und wird genannt, wie früher
`APPENDIX`.

Gegen die Vorher-Messung (gleicher Build vom 2026-10-26):

| | altes Skript (Chrome) | neues mit `--no-toc` | neues (Standard) |
|---|---|---|---|
| Quellseiten | 56 | 56 | 56 |
| PDF-Seiten | 129 | 130 | 132 |
| Lesezeichen | 10/47/244/4 | 10/47/244/4 | 10/47/244/4 |
| Laufzeit | 43 s | 7,3 s | 9,0 s |

**Die eine Seite mehr** ohne Inhaltsverzeichnis: Die Zielseiten aller 305 Lesezeichen stimmen bis
„5.2 · Der Ausgabeordner“ überein (pdf-lib, je Lesezeichen die Seite seines Ziels). Im alten PDF
steht dort das Bild unten auf Seite 80 und seine Bildunterschrift oben auf Seite 81; das neue
setzt Überschrift, Bild und Unterschrift zusammen auf Seite 81. Danach liegt jede Seite eine
später.

Zwei Funde dabei: Die Datumszeile des Deckblatts kam in der Sprache der App („As of“ auf dem
deutschen Handbuch, weil das Skript ohne Einstellungen läuft) und steht jetzt in der des
Dokuments; und der Bericht sagte bei einer eigenen Reihenfolge „Reihenfolge aus dem Explorer“ und
sagt jetzt „in der eigenen Reihenfolge des Buchs“.

### Das ePub in Apple Books (2026-11-05)

Gemessen mit Bücher 9.0 auf macOS 27.2: das Handbuch (Register und Verweise an), das ganze Example
und ein Probebuch aus neun heiklen Example-Seiten (Tabellen, Code, Formeln im Text und als Block,
vier Mermaid-Diagramme, Fußnoten, externe Links, Excalidraw), geöffnet mit `open -a Books`,
geblättert per Pfeiltaste über `osascript`, aufgenommen mit `screencapture`; Thema „Original“, hell
und dunkel.

Was stimmte: Deckblatt mit Bild, das eigene Inhaltsverzeichnis und das von Books (aus
`nav.xhtml`, mit Ebenen und Seitenzahlen), Tabellen, Codeblöcke, Callouts, Formelbilder, Register
und „Verweise auf diese Seite“, Bilder der Website. Die Fußnoten stehen nicht im Fließtext, Books
erkennt sie also als `epub:type="footnote"`. Das Popup ließ sich mit `click at` von System Events
nicht auslösen (-25212); nachgeholt mit einem echten Mausklick über `CGEvent` (siehe „Das ePub in
Calibre“): Ein Klick auf die Fußnotenzahl öffnet die Fußnote als Popup über dem Text, samt dem
Rücksprungpfeil, den Quartz an jede Fußnote hängt.

Zwei Fehler, beide nur im Reader, nicht in Chromium und nicht in Safari:

- **Halbe Seite Leerraum hinter jedem externen Link.** Quartz setzt hinter externe Links ein
  `svg.external-icon` mit `max-width: 0.8em` im `style`. Books hält sich nicht daran; im
  Handbuch stand hinter „Oberfläche für Quartz“ eine halbe leere Seite, Kapitel 1 begann auf Seite
  22. Das Symbol ist Schmuck (`aria-hidden`) und fällt jetzt im ePub und im HTML weg; Kapitel 1
  beginnt auf Seite 15.
- **Mermaid-Beschriftungen abgeschnitten oder unsichtbar.** Books setzt seine Schrift auf das
  HTML in den `foreignObject`-Beschriftungen, die Mermaid für die Schrift der Website vermessen
  hatte: „Rechteck“ und „Datenbank“ waren abgeschnitten, in hell wie dunkel. Im dunklen Thema
  färbt Books die Beschriftungen zudem weiß, auf Mermaids weißen Kästen, und bei Excalidraw
  verschwanden die schwarzen Pfeile auf der schwarzen Seite, die Beschriftung stand weiß auf
  Pastell. Dasselbe Kapitel als Datei in Safari war richtig: Es ist die Gestaltung des Readers,
  und die erreicht ein SVG in der Seite, aber kein Bild. Jede Diagramm-Figur (Mermaid und
  Excalidraw) wird deshalb wie eine Formel als PNG gezeichnet: in der Breite, die Mermaid ihr gab
  (`max-width`, sonst `viewBox`), mit Zoom 2, ein breites mit kleinerem Zoom statt abgeschnitten,
  im Buch in `em` bemessen. `capturePage` liefert Gerätepixel, auf Retina das Doppelte (das
  Journey-Diagramm kam 6000 Pixel breit); jedes Bild wird auf den Zoom verkleinert, den es
  verlangt hat, die Formeln damit auch.

Danach in Books, hell und dunkel: alle vier Mermaid-Diagramme und die Excalidraw-Zeichnung
vollständig, im dunklen Thema auf weißem Grund wie die Formeln. Preis: Text in Diagrammen ist im
ePub und im HTML nicht mehr durchsuchbar, Alternativtext ist „Diagramm“ (oder der `<title>` des
SVG), und das ePub wird größer (Example 0,5 MB → 2,2 MB, Probebuch 0,2 → 1,0 MB, davon 0,5 MB die
Excalidraw-Zeichnung). Im PDF bleiben Diagramme Vektoren.

Die blassen Beschriftungen des gitGraph (orange auf halbtransparentem Blau) sind Mermaids eigene
Farben aus dem `<style>` des SVG, so auch auf der Website.

Gegenprobe nach dem Fix: epubcheck 5.4.0 auf `debian-vm` für Handbuch, Example und Probebuch je
0 Fehler, 0 Warnungen; das Offline-HTML des Probebuchs mit 17 Bildern, keinem kaputten, 0
Netzanfragen und 0 toten Verweisen.

Nebenbei, nicht behoben: Der linke Rand eines Callouts, der über eine Spaltengrenze bricht,
hinterlässt oben in der nächsten Spalte ein Strichlein.

### Das ePub in Calibre (2026-11-05)

Gemessen mit dem E-book viewer von calibre 9.17.0 (offizielles DMG, signiert und notarisiert,
aus dem Scratchpad gestartet, nicht installiert; Konfiguration und Cache über
`CALIBRE_CONFIG_DIRECTORY`/`CALIBRE_CACHE_DIRECTORY` im Scratchpad) am Probebuch aus dem
Abschnitt davor, im dunklen Thema des Viewers (er folgt dem System). Geblättert per Pfeiltaste über
`osascript`; Klicks über ein kleines Swift-Programm mit `CGEvent`, denn `click at` von System
Events trifft nur das Fenster, nicht den Inhalt.

Was stimmte: Deckblatt, Tabellen, Code, Formeln und die vier Mermaid-Diagramme samt Excalidraw als
Bild (auf weißem Grund), Register. Fußnoten zeigt Calibre zusätzlich am Kapitelende mit
Rücksprungpfeil; ein Klick auf den Verweis öffnet sie als Popup (ausgelöst und aufgenommen).

Ein Fehler: **Callouts kaum lesbar.** Der Reader-Stil gab `blockquote.callout` den Hintergrund
`#f5f5f5`. Calibres dunkles Thema setzt die Textfarbe hell, lässt diesen Hintergrund aber stehen:
hellgrauer Text auf fast weißem Grund. Apple Books hatte den Hintergrund im dunklen Thema mit
ersetzt, deshalb fiel es dort nicht auf. Der Hintergrund ist jetzt `rgba(128, 128, 128, 0.12)`,
der auf hellem wie dunklem Grund trägt; danach in Calibre lesbar (aufgenommen). Rahmen in
`#ccc`/`#ddd`/`#999` stehen auf dunklem Grund weiter sichtbar und bleiben.

Gegenprobe: epubcheck 5.4.0 0 Fehler, 0 Warnungen; Offline-HTML wie zuvor (17 Bilder, 0 kaputt,
0 Netzanfragen, 0 tote Verweise). Calibres helles Thema nicht eigens angesehen. Nach dem Beenden
lagen außerhalb des Scratchpads `~/Library/Preferences/net.kovidgoyal.calibre.plist` (Qt-Menü-
Voreinstellungen) und `~/Library/Caches/calibre-ebook.com` (Qt-Shader-Cache); beide entfernt.
