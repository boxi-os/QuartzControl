Du bist als zweites Paar Augen an einem Projekt, dessen erster Release Candidate (`1.0.0-rc.1`,
2026-09-21) draußen ist. Die nächste Fassung soll 1.0.0 werden, oder, wenn etwas dagegen spricht,
ein rc.2. Es geht um ein Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über
die der Nutzer entscheidet.

## Was diese Runde anders macht

**Es ist die erste Runde, die Code nach dem RC liest.** Alles hier ist entweder ein Fix, der in
rc.1 schon ausgeliefert ist und den niemand gegengelesen hat, oder eine Änderung, die in 1.0.0
ausgeliefert würde, ohne dass ein RC sie getragen hat. Die zweite Sorte ist die, auf die es
ankommt: **Zwischen RC und Release gehört eigentlich nur, was ein Fehler erzwingt.** Vier der
Commits sind keine Fehlerbehebungen, sondern kleine Umbauten der Stile-Seite. Ob die in ein 1.0.0
gehören oder ein rc.2 verlangen, ist eine der Fragen dieser Runde.

**Wer was geschrieben hat:** 29 der 37 Commits sind von Claude Opus 5, acht von Claude Opus 5.5
(die vier vom 2026-09-23 und die drei Nebenbei-Fixes samt Chronik vom 2026-09-24). **Dieser Auftrag
ist von Opus 5.5 und aus derselben Sitzung wie die letzten vier Commits.** Was hier als „gemessen“
steht, steht für diese vier aus der Erinnerung an die Messung, für alle übrigen aus ihren
Commit-Nachrichten und der Chronik. Prüfe entsprechend; eine Zahl, die nicht stimmt, ist ein
Befund.

In der Zählung von `CLAUDE.md` ist das das **sechsunddreißigste** Review. Die Dateinamen zählen
nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md` (die letzten drei Abschnitte betreffen diese Runde), der Release-Ablauf in
`docs/release.md`.

Die Einbindung von `conventions.md` griff in den letzten elf Runden. Wenn das bei dir anders ist,
ist das eine Messung und gehört in dein Dokument.

## Umfang

Von `review-2026-10-10` bis `review-2026-10-11`:

    git log --oneline review-2026-10-10..review-2026-10-11
    git diff review-2026-10-10..review-2026-10-11

Das sind 37 Commits und dieser Auftrag, 61 Dateien. Sie fallen in fünf Schichten, und die
Reihenfolge unten ist die, in der sie entstanden sind — nicht die, in der sie wiegen.

### Schicht 1 — die Fixes des fünfunddreißigsten Reviews (18 Commits)

`review-2026-10-10..deda3dc`. Vierzehn Befunde, das Dokument ist `docs/REVIEW-2026-10-09.md`, was
daraus geworden ist steht in `docs/reviews.md`. Das Gewicht liegt in `scripts/` (Vorlagenbau),
Stylesheets und veröffentlichten Paketen; im App-Code nur `templatePackage/parts.ts` und
`fontService.ts` (Befund 7: ein Import unter „Vorlage gewinnt“ löscht jetzt die Schriftdateien der
Regeln, die er ersetzt hat).

### Schicht 2 — der Weg zum RC (7 Commits)

`deda3dc..fe12c09`. Das Projektbild bleibt beim Anwenden einer Vorlage (`a9e69f0`, neue Markierung
in `projectIconService`), die Schriftliste sagt unter VoiceOver jeden Namen (`deac593`, `6ebeaa8`,
Live-Region in `ui.tsx`), Version, Schriftliste von Google, Handbuch-PDF, Release-Notiz.

### Schicht 3 — nach dem RC, veröffentlichte Websites (4 Commits)

`fe12c09..b62cd19`. Die Doku-Websites navigieren über quartz-navigations, der Explorer schneidet
keinen Fokusring mehr ab, ein umbrochener Titel behält sein Symbol. Nur Stylesheets, Pakete und
Dokumentation — und ein fremdes Repo: `/Users/boxi/Development/quartz-navigations`,
`v0.3.1..v0.3.2`, ein Fix.

### Schicht 4 — die Stile-Seite nach dem RC (4 Commits), dein Schwerpunkt

`b62cd19..ab9ceb3`, 11 Dateien, +249 / −68, **alles App-Code** in `src/routes/Styles/` und
`src/routes/Publish/`:

- `72e7632` — Die baseUrl-Warnung auf Veröffentlichen erst, wenn die Config gelesen ist.
- `024c005` — Eine Variable, die keine Farbe hält, bekommt *ein* Wertfeld für beide Modi; das
  dunkle liegt hinter „Im Dunkelmodus abweichend“, und „In beiden Modi gleich“ nimmt den dunklen
  Wert des Nutzers wieder weg.
- `512fea9` — Theme- und Build-Variablen ohne Suche durchblätterbar, gruppiert nach Präfix, mit
  Filter nach Art des Werts.
- `ab9ceb3` — Ein Farbfeld malt seinen Wert über den Grund der Website statt über den der App,
  an sechs Stellen (`swatch.ts`).

### Schicht 5 — die Nebenbei-Liste des fünfunddreißigsten Reviews (4 Commits)

`ab9ceb3..review-2026-10-11`: zwei Texte, der Assistent zählt seine Beispielseiten
(`templatePackage.builtin()` liefert `pages` — eine Vertragsänderung), `template:example` startet
die App nur noch für eine App-Phase, und die Chronik.

## Abwägungen, die niemand gegengelesen hat

**1. „Farbe oder nicht“ am Grundwert (`024c005`).** Ob eine Zeile zwei Felder mit Farbfeldern
oder ein Wertfeld bekommt, entscheidet der Katalog oder der Wert *ohne* den Eingriff des Nutzers —
damit das dunkle Feld nicht verschwindet, während jemand `var(--x` tippt. Der Preis: Wer eine
Nicht-Farbe mit einer Farbe überschreibt, bekommt keine Farbfelder. **Ist das die richtige
Richtung, und gibt es einen Wert, der in keine der beiden Klassen passt?**

**2. „In beiden Modi gleich“ löscht einen Wert.** Der Knopf nimmt den dunklen Wert des Nutzers
weg, ohne Rückfrage. Er ist ein Entwurf bis zum Speichern, und der Unsaved-Guard fragt beim
Verlassen. **Reicht das, oder ist es ein stiller Datenverlust in einem Satz, der „gleich“ sagt?**

**3. Durchblättern ohne Obergrenze (`512fea9`).** Die Suche behält ihre Kappung von 150, das
Durchblättern hat keine, weil nur aufgeklappte Gruppen Zeilen rendern. Gemessen an 1057 Variablen.
**Was passiert beim größten Theme, das der Marktplatz anbietet, und was, wenn jemand alle Gruppen
öffnet?**

**4. Der Grund, über den ein Farbfeld malt (`ab9ceb3`).** Genommen wird `var(--light)` des Modus,
also der Seitengrund. Eine Variable, die auf einer anderen Fläche wirkt (ein Callout, eine
Seitenleiste mit eigenem Grund), zeigt ihre Alpha-Farbe damit weiter über der falschen Fläche —
nur jetzt über der der Website statt der der App. **Ist das ein Fortschritt oder eine
Verschiebung, und sagt die Oberfläche, worüber sie malt?**

**5. Ein Paket ohne Beispielseiten (`eb89fe7`).** Das Häkchen verschwindet bei `pages === 0`.
Gezählt wird `.md` in `parts/content.json`. **Ist „keine Markdown-Datei“ dasselbe wie „nichts
mitzunehmen“, und was sieht ein Nutzer, dessen Cache ein älteres Paket hält?**

**6. Schriftdateien, die ein Import löscht (Schicht 1, Befund 7).** Gelöscht wird nur, was keine
Regel in keinem Stylesheet des Projekts mehr nennt, unter dem Schriftschloss, und nur unter
„Vorlage gewinnt“. Der Snapshot vor dem Import trägt die Dateien. **Deckt die Suche, was der
Nutzer selbst angelegt haben kann?** (`docs/conventions.md`: „Wer fragt, ob etwas noch gebraucht
wird, sucht breit“.)

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was ein 1.0.0 ausliefern würde, das kein RC getragen hat

Schicht 4 und 5. Lies sie gegen die Regeln des Renderers in `docs/conventions.md` — besonders
„Eine Route besitzt ihr Dokument“, „Was der Build liest, ist die Datei, nicht der Entwurf“, „Das
registrierte Speichern schreibt alles, was `dirty` zählt“ und „Ein Bedienelement, das seinen Wert
von außen bekommt …“. Die Variablen-Seite hat in vergangenen Runden an genau diesen Stellen
Befunde gehabt.

### 2. Was der Nutzer verlieren kann

Drei Wege löschen oder ersetzen in Projekten: der Schrift-Aufräumschritt beim Import, die
Markierung des Projektbilds (was passiert ohne sie, und was, wenn sie nach einem Umbenennen oder
Duplizieren nicht mehr stimmt?) und „In beiden Modi gleich“.

### 3. Die Fixes des fünfunddreißigsten Reviews

Keinen davon hat ein Review gelesen. Die Serie ist so gebaut, dass jede Runde liest, was die vorige
gebaut hat — in Runde 34 hielten zwei von zwanzig Fixes nicht, weil die Messung einen Weg
ausgelassen hatte.

### 4. Was draußen liegt

Drei Pakete in `boxi-os/quartzcontrol-templates`, fünf Websites, quartz-navigations 0.3.2. Die
Chronik behauptet unter anderem: 16 alte Schriftdateien auf vier Websites entfernt, deren URLs
antworten 404, die Noto-Dateien 200. Prüfbar mit `curl`.

## Was offen bleibt, und nicht für diese Runde

- **macOS x64 auf einer Maschine seiner Architektur**, **ein Linux mit glibc unter 2.34**, **C1 auf
  einem Linux mit git vor 2.38** — nur der Nutzer kann das messen.
- **Ob VoiceOver die Schriftnamen jetzt spricht** (`deac593`): gemessen ist der
  Barrierefreiheitsbaum, nicht die Stimme.

## Eine Frage über den Code hinaus

Getrennt von den Befunden, am Ende deines Dokuments:

**1.0.0 oder rc.2?** Seit rc.1 sind vier Änderungen an der Stile-Seite entstanden, die keine
Fehler beheben, dazu eine Vertragsänderung am IPC. Spricht aus dem, was du gelesen hast, etwas
dafür, sie erst in einem weiteren RC auszuliefern — oder dagegen, sie in 1.0.0 zu nehmen? Und wenn
etwas gegen beides spricht: Welche davon gehören zurückgestellt?

## Form der Befunde

Schreibe `docs/REVIEW-2026-10-10.md`. Je Befund: die Stelle (Datei, Funktion, Commit), was
passiert, wie es sich zeigt, was dagegen spräche es so zu lassen, und — wo du eine hast — eine
Richtung. Nach Gewicht sortiert, Hoch/Mittel/Niedrig. Was du gemessen hast, kennzeichne als
gemessen und sag womit; was du gelesen hast, als gelesen. Eine Behauptung dieses Auftrags, die
nicht trägt, ist ein Befund wie jeder andere.

**Ändere nichts am Code und committe nichts**, weder hier noch in `quartz-navigations`. Die einzige
neue Datei ist dein Dokument. Schreibe in keinen Obsidian-Vault außer `Example` und
`QuartzControl-Handbuch`, und in kein Projekt unter `~/Documents/QuartzProjekte/` — Kopien mit
`cp -Rc` sind der Weg (und `content/` ist dort oft ein Symlink in einen Vault: in der Kopie darunter
nichts schreiben). Für die gebaute App ein Wegwerf-Profil (`--user-data-dir`). **Veröffentliche
nichts**: Die fünf Websites und die drei Pakete sind der Stand, gegen den du prüfst, nicht der, den
du bewegst.
