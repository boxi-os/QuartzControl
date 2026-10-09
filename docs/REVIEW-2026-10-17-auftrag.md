Du bist als zweites Paar Augen an einem Projekt, dessen Fassung `1.0.2` (2026-10-07) draußen ist
und dessen nächste, **1.1**, auf dem Branch `feat/1.1` entsteht. Es geht um ein Review — nicht um
Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Sie ist kurz und liest nur Fixes.** Das zweiundvierzigste Review hat 1 Hoch, 2 Mittel und 5
Niedrig gefunden; alle acht sind am 2026-10-10 abgearbeitet, je ein Commit mit Vorher-/Nachher-
Messung an der gebauten App. Diese Runde liest diese acht Commits, nicht mehr — wie jede Runde die
Fixes der vorigen liest.

**Zwei der Fixes sind keine Behebung im Code.** Befund 5 („Übersicht“ ist zweimal vergeben) war eine
Entscheidung, die der Nutzer schon getroffen hatte; der Fix trägt sie als Ausnahme in
`conventions.md` ein. Befund 7 berichtigt zwei Sätze im Plan. Prüfe, ob die Ausnahme so steht, dass
die Regel daneben noch gilt.

**Und zwei Fixes greifen in dieselbe Funktion.** Befund 3 hat der Übersicht zwei Zustände gegeben,
Befund 8 hat ihre Rangfolge umgestellt — danach hieß jede der 15 Zellen, die Befund 3 als
„Bereich auf keiner Breite gezeigt“ gezählt hatte, „Bereich geleert“. Die Commit-Nachricht von
Befund 3 steht so, wie sie zu ihrer Zeit gemessen war; die Chronik sagt, was danach kam.

**Alles, was du liest, hat ein einziges Modell geschrieben**: Claude Opus 5.5, und auch das
zweiundvierzigste Review stammte von diesem Modell (in einem eigenen Agenten), ebenso dieser
Auftrag. Was als „gemessen“ dasteht, steht aus den Commit-Nachrichten und den Absätzen in
`docs/decisions/`; prüfe entsprechend. Eine Zahl, die nicht stimmt, ist ein Befund.

In der Zählung von `CLAUDE.md` ist das das **dreiundvierzigste** Review. Die Dateinamen zählen
nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md` (am Ende: was aus dem zweiundvierzigsten geworden ist). Dazu
`docs/REVIEW-2026-10-16.md` (das zweiundvierzigste) und sein Auftrag daneben.

## Umfang

Vom Tag `review-2026-10-17` (der Auftrag des zweiundvierzigsten) bis `review-2026-10-18`:

    git log --oneline review-2026-10-17..review-2026-10-18
    git diff review-2026-10-17..review-2026-10-18

Zehn Commits und dieser Auftrag; ohne ihn 25 Dateien, +1 146 / −148. Der erste (`9a1b9ee`) ist
das Dokument des zweiundvierzigsten Reviews selbst, der letzte (`19b1bcc`) der Eintrag in der
Chronik. Dazwischen, in der Reihenfolge der Befunde:

- **`d3d511a` — Befund 1 (Hoch), der SVG-Bereiniger.** `src/utils/inlineSvg.ts` schreibt jetzt
  selbst, aus einer Erlaubnisliste, statt nach einer Sperrliste zu streichen und den Rest zu
  serialisieren. Neues Prüfskript `npm run check:inline-svg` (braucht Google Chrome): 22 böse
  Eingaben, jedes Ergebnis als HTML in eine Box, wie die Website es rendert; vorher 14 durch,
  nachher 0. Neue Regel in `conventions.md` („Fremdes Markup, das auf die Website geht …“).
  **Nicht gemessen: ein `quartz build` mit einem solchen Schnipsel** — weder über quartz-layout-box
  (`dangerouslySetInnerHTML`) noch über einen Markdown-Schnipsel (rehype-raw).
- **`bcabf1e` — Befund 2 (Mittel), Entfernen und Ziehen.** `Plugins/Installed.tsx`: Solange ein
  Plugin entfernt wird, lehnt `commit()` jede Änderung der Liste mit einem Satz ab, und der Griff
  ist gesperrt. Gemessen mit Tastatur-Zug nach dem Klick und mit einem Zug, der vor dem Klick
  aufgenommen und danach abgelegt wurde.
- **`5437b48` — Befund 3 (Mittel), die Übersicht und die Bühne.** `LayoutOverview.tsx` und
  `GlobalBoard.tsx` zählen jeden Bereich eines Frames, auch einen, der auf keiner Breite platziert
  ist, so wie der gebaute Frame; zwei neue Zustände („auf keiner Breite gezeigt“, „nur auf …“).
- **`b2fd158` — Befund 4, zweites Zusammenlegen.** Ein Projekt gilt als zusammengelegt, sobald eine
  der zwölf Dateien die Kopfzeile trägt, die das Zusammenlegen schreibt (`wasConsolidated`); neues
  Feld `StyleFileSet.consolidated`. `check:stylesheet-consolidation` spielt den Ablauf des Reviews
  nach.
- **`2a620a1` — Befund 5, „Übersicht“.** Nur Dokumentation: Ausnahme in `conventions.md`, Absatz in
  `decisions/layout-frames.md`, Chronik-Zeile berichtigt.
- **`df74116` — Befund 6, die Bau-Tür.** `writeConfig` lenkt jede Plugin-Quelle, die auf einen Frame
  zeigt, auf den eigenen Frame um (`framePaths.ownFramePath`, aus `projectPaths.ts` gezogen); die
  Reparatur liest und schreibt unter einem neuen Schloss `configService.whileHoldingConfig`, an dem
  auch `writeConfig` wartet. Dafür ist `styleLock.ts` zu einer Fabrik geworden (`projectLock()`),
  `whileHoldingStyles` ist eine Instanz davon. **Das Schloss ist gelesen, nicht gemessen**: 40 Läufe
  mit Reparatur und Speichern nebeneinander verloren schon vorher nichts.
- **`5e33ac1` — Befund 7, zwei Sätze im Plan.**
- **`660e8e5` — Befund 8, Rangfolge und Ansagen der Übersicht.** „Geleert“ und „ausgeblendet“ vor
  „kein Platz“; die Zahl im Positionskopf als Satz für den Screenreader; jede Gruppe ein eigenes
  `tbody`. **Mit VoiceOver nicht gehört**, nur `ariaSnapshot()`.

## Abwägungen, die niemand gegengelesen hat

**1. Ein Schreiber, der ändert, was man ihm gibt.** `writeConfig` schreibt seit `df74116` nicht mehr
genau, was der Aufrufer übergibt: Eine Quelle, die auf `…/.quartz-gui/authored-frames/<id>` eines
anderen Projekts zeigt, wird still auf den eigenen Frame derselben ID gelenkt, wenn es ihn gibt.
Gesagt wird das nirgends. **Welche Schreiber erreicht das, die nicht gemeint waren** — der
Vorlagen-Import (bringt ein `.qtpl` Frames mit Pfaden des exportierenden Projekts mit, und in welcher
Reihenfolge entstehen dort Frame-Ordner und Config?), das Duplizieren (`snapshot: false`, Pfade
werden vorher schon umgeschrieben), das Umbenennen, das Speichern eines Frames selbst
(`layoutFrameService`)? Und ist eine Änderung ohne Satz hier richtig — der Nutzer sieht in der
Datei etwas anderes als im Formular, aber nur, wenn die Kopie Pfade des Originals hatte.

**2. Zwei Schlösser.** Es gibt jetzt eines für die Stylesheets und eines für die Config, beide
wiedereintrittsfähig über `AsyncLocalStorage`, beide je Projekt. **Gibt es einen Weg, der das eine
hält und auf das andere wartet, während ein anderer Weg es umgekehrt tut** — der Vorlagen-Import
schreibt Stylesheets unter dem Stile-Schloss und die Config; die Bau-Tür repariert Pfade unter dem
Config-Schloss und erneuert danach Schriften unter dem Stile-Schloss? Und hat der Umbau zur Fabrik
am Verhalten von `whileHoldingStyles` etwas geändert (der Kommentar dort beschreibt die Messungen
der alten Fassung)? Wenn du das Schloss der Config messen willst: Das Fenster zwischen `readConfig`
und `writeConfig` der Reparatur ist in 40 Läufen nicht getroffen worden; ein Bündel mit einer
künstlichen Verzögerung dazwischen träfe es.

**3. Eine Kopfzeile als Format.** `wasConsolidated` erkennt ein zusammengelegtes Projekt an der
ersten Zeile einer der zwölf Dateien. Diese Zeile ist ein Kommentar in der Datei des Nutzers. Die
Regel über `.quartz-gui/` und den Marker in `custom.scss` sagt: **„ein Bezeichner, den ein anderer
Rechner schon geschrieben hat, ist ein Format und keine Schreibweise.“** Was passiert, wenn der
Nutzer die erste Zeile löscht oder ändert — und was, wenn ein Projekt die zwölf aus einer Vorlage
hat (dort steht die Zeile nicht), danach eine der 31 Altdateien bekommt (Vorlagen-Import eines alten
`.qtpl`, Restore eines alten Snapshots, Git-Sync von einem Rechner mit 1.0.2)?

**4. Was die Erlaubnisliste kostet.** Der neue Bereiniger lässt kein `<style>`, kein
`foreignObject`, keine Attribute mit Namensraum außer `xlink:href` und keinen Verweis außer `#…`
(und https/mailto an `<a>`, https und Raster-`data:` an `<image>`) durch. Icons aus Illustrator und
Figma tragen oft einen `<style>`-Block mit Klassen. **Wie sieht ein gewöhnliches Icon aus diesen
Programmen nach dem Einfügen aus, und sagt die App dem Nutzer genug, um zu verstehen, warum es
anders aussieht?** Der Satz dazu steht in `snippets.svgCleaned_*`.

**5. Beim Schreiben dieses Auftrags aufgefallen, ungemessen.** Der Bereiniger liest XML, in dem
Attributnamen Groß- und Kleinschreibung unterscheiden; HTML schreibt Attributnamen klein. Ein
`HREF="…"` ist für `safeHref` nicht `href` und wird deshalb nur von `leavesFile` geprüft, das
`https:` durchlässt. Gelesen: Damit bekäme ein `<use>` oder `<feImage>` eine Adresse außerhalb der
Datei, die die Liste für diese Elemente ausschließt. Skript sehe ich auf diesem Weg nicht
(`javascript:` fängt `leavesFile`, `on…` fängt die Prüfung der Namen ohne Rücksicht auf die
Schreibweise). **Prüfe das mit `check:inline-svg`, und such nach weiteren Stellen, an denen die
zwei Parser denselben Namen verschieden lesen** — Elementnamen, `attributeName` einer Animation,
Entitäten in Attributwerten.

**6. Die Rangfolge der Übersicht ist jetzt eine andere als die dokumentierte alte.** Ein
absichtlicher Zustand schlägt eine Folgerung. Das ist für „geleert“ gegen „kein Platz“ gemessen.
**Gilt es auch für „ausgeblendet“ gegen „nur auf manchen Breiten“, und wie verhält sich
„nur auf Desktop, Tablet“ (Zustand des Frames) zu einer Komponente, die selbst „nur mobil“ ist
(Zeichen an der Pill)?** Dann sagt die Zelle „erscheint nur auf …“ für eine Komponente, die auf
diesen Breiten gar nicht erscheint. Stimmt die Zelle in solchen Fällen mit einer gebauten Seite?

**7. Das Entfernen sperrt die Liste, aber nicht alles, was schreibt.** `commit()` lehnt ab, solange
`removing` gesetzt ist. Die einundvierzigste Runde hat notiert, dass `toggleEnabled` und
`reorderGroup` an der Warteschlange vorbeischreiben. **Geht einer der beiden — oder ein Feld der
Leiste, ein Schnipsel-Editor, das Speichern einer Option — während des Entfernens noch an
`commit()` vorbei?**

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was von draußen hereinkommt

Befund 1 mit Abwägungen 4 und 5. Der Bereiniger ist die eine Stelle, an der fremder Code auf jede
Seite der Website kommt. Wenn du kannst, miss einmal an einer gebauten Website (Kopie, `--serve`,
nur `localhost`): ein Schnipsel aus `check:inline-svg` in einer Layout-Box und einer in Markdown.

### 2. Was der Nutzer verlieren kann

Abwägungen 1, 2 und 7; Befund 4 gegen einen Restore des Snapshots, den das Zusammenlegen anlegt.

### 3. Was die App anders zeigt als die Website

Abwägung 6; die Übersicht nach Befund 3 und 8 gegen eine gebaute Seite je Seitentyp, an einer
Kopie von gui-test (Frame `focus` auf der 404-Seite, Frame `editorial` mit eigenem Bereich
`custom-8`).

### 4. Die Dokumentation

Steht, was die Chronik und die Absätze in `docs/decisions/` behaupten, so in den Commits und im
Code? Die Ausnahme in `conventions.md` (Befund 5) gegen die Regel, in der sie steht; der berichtigte
Plan (Befund 7) gegen das, was auf diesem Rechner installiert ist.

## Was offen bleibt, und nicht für diese Runde

Bekannt und gesammelt; ein Befund dazu ist nur willkommen, wenn er schwerer wiegt als hier gesagt:

- **P8** steht weiter aus: Vorlagen neu bauen (das Example-Projekt trägt noch 31 Stylesheets),
  Handbuch-Kapitel und Screenshots für die neuen Reiter und Leisten (darunter die Übersicht und
  „Als Code einfügen“), Release-Notizen.
- Ein umbenannter Sprachcode zieht weder Inhaltsordner noch `byLang`-Schlüssel anderer Plugins mit.
- `ReadmeText` kennt keine Bilder, keine verschachtelten Listen, keine HTML-Tabellen.
- Messungen, die die Config schreiben, legen Snapshots an.
- Die CLI-Schreibvorgänge (`quartz plugin add` u. a., im Kindprozess) stehen unter keinem Schloss
  der Config.
- Rückstand außerhalb von 1.1, wie am Ende von `docs/plan-1.1-umsetzung.md`: VoiceOver, Linux-
  Schlüsselbund, **macOS x64**, **glibc unter 2.34**, **C1 mit git vor 2.38**.

## Eine Frage über den Code hinaus

Getrennt von den Befunden, am Ende deines Dokuments:

**Die Arbeitsregel lautet „ein Befund pro Durchgang“.** Befund 3 und Befund 8 gingen an dieselbe
Funktion, nacheinander. Die Messung von Befund 3 zählte 15 Zellen in einem neuen Zustand, und erst
Befund 8 zeigte, dass alle 15 in geleerten Positionen lagen — die Aussage der ersten
Commit-Nachricht war damit richtig gemessen und falsch gedeutet. **Hätte die Regel hier verlangt,
beide zusammen zu bearbeiten, oder die Messung von Befund 3 nach Befund 8 zu wiederholen? Und
welche Form hätte eine Regel, die das trifft, ohne die eine Regel aufzuweichen, die die Serie
trägt?**

## Form der Befunde

Schreibe `docs/REVIEW-2026-10-17.md`. Je Befund: die Stelle (Datei, Funktion, Commit), was
passiert, wie es sich zeigt, was dagegen spräche es so zu lassen, und — wo du eine hast — eine
Richtung. Nach Gewicht sortiert, Hoch/Mittel/Niedrig. Was du gemessen hast, kennzeichne als
gemessen und sag womit; was du gelesen hast, als gelesen. Eine Behauptung dieses Auftrags, die
nicht trägt, ist ein Befund wie jeder andere. Was dir nebenbei auffällt und kein Befund ist, kommt
in einen eigenen Abschnitt am Ende.

**Ändere nichts am Code und committe nichts.** Die einzige neue Datei ist dein Dokument. Schreibe
in keinen Obsidian-Vault. In kein Projekt unter `~/Documents/QuartzProjekte/` — Kopien mit
`cp -Rc` sind der Weg (und `content/` ist dort oft ein Symlink in einen Vault: in der Kopie
darunter nichts schreiben, auch keine mtimes). `gui-test` hat uncommittete Änderungen (Config,
Lockfile, zusammengelegte Stylesheets), die dem Nutzer gehören — auch dort nur in einer Kopie
arbeiten. **Eintragen, Bauen und Serverstarten schreiben in das Projekt** (Pfade der Frames): nur
in einer Kopie. Für die gebaute App ein Wegwerf-Profil (`--user-data-dir`); `npm run smoke` tut
das selbst. Eine Messung, die die Config schreibt oder zusammenlegt, legt im Projekt einen
Snapshot an — in einer Kopie egal, im Original nicht. Eine präparierte SVG nur in einer Kopie, und
eine gebaute Website damit nur über `--serve` auf `localhost`. **Löse keinen Schlüsselbund-Dialog
aus**; die echten Zugänge und Ziele dieses Rechners nicht anfassen und nicht abbilden. In den drei
Plugin-Repos nichts ändern. **Veröffentliche nichts**, und pushe nichts.
