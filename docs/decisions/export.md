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
