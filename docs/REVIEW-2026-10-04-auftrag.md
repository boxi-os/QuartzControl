Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist und dessen nächste
Fassung ein Release Candidate werden soll. Es geht um ein Review — nicht um Änderungen. Am Ende
steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Sie ist kurz, und sie steht direkt vor dem RC.** Das neunundzwanzigste Review
(`docs/REVIEW-2026-10-03.md`, Claude Fable 5.1) meldete fünf niedrige Befunde und fünf Punkte
nebenbei. Abgearbeitet sind alle zehn. Die Fixes und dieser Auftrag sind von Opus 5. Nach dieser
Runde soll nur noch die Release-Liste kommen (`docs/release.md`), kein weiterer Code außer dem, was
du findest. Lies also mit der Frage: **Gibt es hier etwas, das nicht in einen RC gehört?**

**Das größte Risiko ist der Frame-Builder.** Zwei Commits ändern, was ein Drag dort *tut*, nicht nur,
was er sagt, und zwar für jeden Tastatur-Drag eines platzierten Bereichs (`fd23703`) und für jede
Ablagefläche, deren Spalten flexibel sind (`d1125b0`). Die Tastatur-Drags im Frame-Builder haben in
den letzten vier Runden jedes Mal einen Befund geliefert.

**Die Richtungen sind zum Teil vom Review, zum Teil nicht.** Vom Review übernommen: die Sätze des
Abbruchs getrennt von gits Text und nach Gewicht (Befund 1), `entryLabels` im Satz des Normalfalls
(Befund 2), „der Platz eines platzierten Bereichs ist seine Startzelle“ (Befunde 3 und 5). Eigene
Entscheidungen, die kein zweites Modell geprüft hat: **wie** die Startzelle zum Platz wird (die
Kollisionsrechnung antwortet mit ihr, solange der Sensor nichts verschoben hat, und die Pfeile gehen
von der Zelle aus, die die Kollisionsrechnung nennt), und alle vier Nebenbei-Fixes — das Review hatte
für sie keine Richtung genannt. **Greif die eigenen zuerst an.**

In der Zählung von `CLAUDE.md` ist das das dreißigste Review. Die Dateinamen zählen nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md`. Lies dann `docs/REVIEW-2026-10-03.md` — die Befunde und Nebenbei-Punkte, deren
Fixes du liest.

Die Einbindung griff in den letzten fünf Runden. Wenn das bei dir anders ist, ist das eine Messung
und gehört in dein Dokument.

## Umfang

Von `review-2026-10-04` bis `review-2026-10-05`:

    git log --oneline review-2026-10-04..review-2026-10-05
    git diff review-2026-10-04..review-2026-10-05 -- . \
      ':!docs/REVIEW-2026-10-03.md' ':!docs/REVIEW-2026-10-04-auftrag.md'

Ausgenommen sind das Review-Dokument deines Vorgängers (`17600c6`) und diese Auftragsdatei.

**Die Zahlen**, gezählt mit `git diff --shortstat`, bevor der Commit existiert, der diese Datei
trägt:

    # Schicht 1, review-2026-10-04..963ac18, ohne Review-Dokument: 10 Dateien, +204 / −39
    #   davon electron/, src/, scripts/, shared/:                  6 Dateien, +104 / −28
    # Schicht 2, 963ac18..2d43c92:                                13 Dateien, +187 / −36
    #   davon electron/, src/, scripts/, shared/:                  8 Dateien, +115 / −28
    # beide zusammen, ohne Review-Dokument:                       17 Dateien, +383 / −67
    #   davon electron/, src/, scripts/, shared/:                 12 Dateien, +219 / −56

| Woher | Commit | Worum es geht |
| --- | --- | --- |
| — | `17600c6` | das Review-Dokument selbst (ausgenommen) |
| Befund 2 | `d9a9fa8` | `updatePackagesReinstalled` und zweimal `updatePackagesPending` über `entryLabels` |
| Befund 1 | `6991fe6` | **`CoreAbortResult.sentences`, nach Gewicht; beide Seiten sagen alle an, gits Text nie** |
| Befunde 3 + 5 | `fd23703` | **`data.home` am Draggable, Kollisionsrechnung gibt die Startzelle zurück, `nearestDroppableCoordinatesFrom`** |
| Befund 4 | `0c7b077` | Korrektur in `docs/decisions/layout-frames.md` (kein Code) |
| — | `963ac18` | Chronik und Stand |
| Nebenbei 1 | `ffe925a` | **`reloadScss(after)`: das Band nennt den Schreiber** |
| Nebenbei 2 | `0939d27` | **`dropNarrowed`: eine Ablage am Rand sagt die gekürzte Spanne** |
| Nebenbei 3 | `d1125b0` | **`minmax(24px, <n>fr)` auf der Ablagefläche, die Fläche rollt waagerecht** |
| Nebenbei 4 | `a0233eb` | **der Status zählt eine `putBack`-Zeile nur, solange sie ganz fehlt** |
| — | `cea03b8`, `2d43c92` | Chronik und Stand |
| — | — | dieser Auftrag samt Absatz in `docs/reviews.md`; der Tag sitzt hier |

Steht in `git log` etwas anderes als hier, gilt `git log`.

**Im Handbuch-Vault liegt von dieser Runde ein Commit, nur lokal:** `370cfab` (4.5, de/en: auch die
Stylesheets schreiben `custom.scss`, und die App sagt, wer). Der Vault ist
`~/Obsidian/QuartzProjekte/QuartzControl-Handbuch` mit eigenem git. **Lies dort, schreib dort
nichts.**

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung. Miss an Kopien.

## Was du wissen musst, bevor du liest

**Lies Commit-Nachrichten als Behauptungen.** Die Zahlen darin sind gezählt, aber vom selben Modell,
das sie schreibt.

**Das Geschirr deines Vorgängers stand dieser Runde zur Verfügung und wurde benutzt**: die Szenen
`s1` bis `s10` an der gebauten App (dazu neu `s11` für die gekürzte Spanne und `s12` für die
Spaltenbreiten), die Szenen R2, AB2 und AB3 mit echtem npm bzw. der git-Attrappe, die nur
`stash pop` scheitern lässt. Es liegt im Scratchpad seiner Sitzung
(`/private/tmp/claude-501/-Users-boxi-Development-QuartzControl/245ff92b-…/scratchpad`), sofern es
noch da ist — nichts davon im Repo.

**`npm run smoke` startet gegen das echte Profil dieses Rechners** und macht 40 Aufrufe; es
navigiert nur. `check:i18n` zählt jetzt 1136 + 184 Schlüssel (67 nicht prüfbar); `check:core-update`,
`check:semver`, `check:handbook` (26) sind auf `2d43c92` grün.

**Ein Fenster wird auf diesem Bildschirm nicht breiter als 1470 px** und nicht höher als 923 px;
die Mindestbreite ist 960 px. Gemessen wurde bei 1280, 1470 und 1728 px (Playwright setzt die
Größe; die 1728 sind ein Fenster, das größer ist als der Bildschirm).

**Abwägungen, die ich selbst getroffen habe — prüf, ob sie tragen:**

- **„Noch nicht verschoben“ ist ein Translate von null**, gelesen als
  `active.rect.current.initial` gegen `collisionRect` mit 0,5 px Toleranz (`fd23703`). Nicht der
  Abstand zur nächsten Zielmitte, weil ein Schritt, den der `KeyboardSensor` ganz aufs Scrollen
  verwendet, beides kurz zurücklässt. Ist `initial` noch `null` (erste Rechnung nach dem
  Aufnehmen), gilt der Drag als unverschoben. Gelesen in `core.esm.js` um Zeile 2984 und 3304,
  nicht an einer anderen dnd-kit-Fassung.
- **Die Pfeile gehen vom Feld aus, das die Kollisionsrechnung nennt — aber nur, wenn es eine Zelle
  ist**, und dann von deren Mitte auf *beiden* Achsen. Über einem Kasten oder der Ablage bleibt der
  alte Weg (kleinstes Ziel unter der Chip-Mitte, eine Achse), weil ein Chip in der Ablage sonst von
  der Mitte der Ablage aus nach unten ginge statt in die Spalte unter ihm. Die Prüfung, ob ein
  Kandidat „auf der Achse liegt“, rechnet weiter mit dem Chip-Rechteck, nicht mit der Zelle.
- **Das Layout-Board behält `nearestDroppableCoordinates` unverändert**; der neue Getter ist ein
  zweiter Export, der denselben Schrittcode nimmt.
- **Die 24 px gelten nur auf der Ablagefläche** (nicht im erzeugten CSS, nicht in der Vorschau),
  nur für ein blankes `<n>fr`, und die Fläche bekommt `min-width: min-content` in einem Rahmen mit
  `overflow-x-auto`. Der Preis: Bei 1470 px rollt sie 112 px, bei 1280 px 302 px. Die Zahl 24 ist
  WCAG 2.2s Mindestgröße einer Zielfläche, nicht gemessen gegen eine Hand an der Maus. Die
  Alternative — die Abstände auf der Fläche verkleinern — gäbe die maßstabsgetreue Darstellung auf,
  auf der der Kommentar an der Fläche besteht. Und `overflow-x-auto` macht die Fläche auch
  senkrecht zu einem Roller (`overflow-y` wird `auto`); was über ihre Unterkante ragt, wird
  abgeschnitten statt gezeigt.
- **Eine Verschiebung, die ich gesehen und hingenommen habe:** Beim zweiten ↑ von `right` in die
  Ablage (Frame „focus“) nennt die Ansage während des weichen Scrollens jetzt „Zeile 1, Spalte 8“
  als Zwischenziel, wo vorher „liegt über header“ stand. Ein Zwischenziel gab es also vorher auch;
  es ist jetzt eine Zelle, weil die Chip-Mitte nicht mehr in einen 64-px-Abstand fällt.
- **`CoreAbortResult` erweitert `PluginActionResult`**, statt einen Kanal zu ändern oder einen neuen
  zu bauen. Die Sätze stehen zusätzlich im `output`, in derselben Reihenfolge; ein verweigerter
  Abbruch liefert höchstens den Satz aus `explainGitFailure`, der Busy-Fall seinen einen.
- **Das Band nennt den letzten Schreiber**, nicht alle: Wer erst die Variablen speichert und dann
  eine Schrift importiert, während ein Entwurf steht, liest nur den Schrift-Import. Die
  CSS-Korrektur aus den Grundlagen zählt als „Stylesheets“, weil sie eine Datei anlegt und damit
  den Import-Block schreibt.
- **`dropNarrowed` wird nur gesagt, nicht gezeigt.** Die Meldungszeile des Frame-Builders ist rot
  und für Fehler; wer sieht, sieht den Kasten schmaler werden. Nach einer Kürzung bleibt die
  kleinere Spanne auch beim nächsten Schritt zurück — das war vorher so und ist unverändert.
- **Der Status zählt eine Zeile aus `putBack` nur, solange sie ganz fehlt**
  (`absentFromPackageJson`), jede andere Zeile mit anderem Bereich weiter (`stillMissing`), weil
  das upstreams Bereich sein kann, wo das Projekt einen eigenen hatte. Der Satz der Seite („fehlen
  … oder stehen dort mit einer anderen Version“) ist unverändert.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Der Frame-Builder (`fd23703`, `d1125b0`, `0939d27`)

Gemessen an der gebauten App mit den Szenen deines Vorgängers: alle vier Frames von
`navigations-testprojekt` und die Kopie mit 20-px-Spalten, Leertaste · Leertaste auf allen
platzierten Kästen (33 von 33 „blieb an seinem Platz“, die fünf der schmalen Kopie ebenso),
← und → von `page-body` in „focus“ (Spalte 3 und 5), Scrollen beim Pfeil nach unten (drawing,
index), Mobil in „index“ (vor `d1125b0`), ein Chip aus der Ablage, `right` in die Ablage und zurück,
die Maus 8 px und 400 px im eigenen Kasten; nach `d1125b0` die Szenen `s9`, `s10`, `s11` und `s8`
bei 1280 und 1470 px. **Nicht gemessen:** Mobil und Tablet *nach* `d1125b0`; ein mehrzeiliger Kasten
mit ↑ und ↓ aus seiner Startzelle; ein Kasten, dessen Startzelle unter einem anderen Kasten liegt
(geht das überhaupt?); ein Drag, bei dem die Ablagefläche waagerecht rollt, per Tastatur *und* per
Maus bis an den rechten Rand; Fokus-Ringe am Rand des neuen Rollers; das Layout-Board.

### 2. Der Abbruch-Kanal (`6991fe6`)

AB3 (gescheiterter Pop, vorgemerkte `notes.txt`) am Bündel und an beiden Seiten der gebauten App,
AB2 am Bündel. **Nicht gemessen:** der verweigerte Abbruch und der Busy-Fall an der Oberfläche; ein
Abbruch mit älterem Stash-Eintrag, der jetzt ebenfalls angesagt wird.

### 3. Die Paketliste (`a0233eb`, `d9a9fa8`)

R2 mit echtem npm (11.17.0), alt gegen neu: Status vorher vier Namen, jetzt `is-odd` und `kind-of`;
der fortsetzende Lauf endet `upToDate` und sagt „put back: left-pad, is-odd (devDependencies),
is-buffer, is-odd (peerDependencies), kind-of“. **Nicht gemessen:** eine `putBack`-Zeile, die der
Nutzer danach von Hand auf einen anderen Bereich setzt; R4 (drei Abschnitte) nach diesen Commits.

### 4. Das Band (`ffe925a`, Vault `370cfab`)

Gebaute App, Zwei-Kopien-Datei, Entwurf getippt, Knopf „Ladereihenfolge neu schreiben“ — das Band
nennt die Stylesheets. **Nicht gemessen:** die Sätze für Variablen und Schrift-Import an der
Oberfläche, die CSS-Korrektur aus den Grundlagen. Das Handbuch 4.5 ist geändert, aber nicht gebaut.

## Wie gemessen werden kann

- **Der Dienst ohne App**: esbuild-Bündel (`--bundle --platform=node --format=cjs
  --external:electron --alias:@shared=./shared --tsconfig=tsconfig.node.json`), `electron` über
  einen Stub. Lokales Upstream-Repo, Status ohne Netz über `url.<bare>.insteadOf`. Vorher-Bündel
  über `git archive review-2026-10-04`.
- **npm echt** (das gepinnte aus `node_modules/npm`), wo nötig hinter einem `bin/npm`, das einen
  bestimmten Aufruf scheitern lässt (`NPM_FAIL_MATCH`).
- **Zwei gebaute Apps nebeneinander**, der Weg deines Vorgängers: `git archive review-2026-10-04`
  ins Scratchpad, `node_modules` verlinken, `npx electron-vite build`, den App-Pfad im Launcher über
  eine Umgebungsvariable wählen.
- **Die gebaute App nicht-interaktiv**: eigenes Playwright-Skript, `--user-data-dir=<wegwerf>`,
  `page.emulateMedia({ colorScheme: null })`, Projekt über `window.quartzGui.projects.add`,
  Ansagen über einen `MutationObserver` auf `[id^="DndLiveRegion"]` und `[role="status"]`,
  Tastendrücke nach `focus()` auf den Griff.
- **Ein Projekt zum Anfassen**: `cp -Rc` von `~/Documents/QuartzProjekte/navigations-testprojekt`
  in den Scratchpad. In der Kopie unter `content/` nichts schreiben.

## Was offen bleibt, und nicht für diese Runde

Die Liste vor dem RC ist keine Code-Frage und bleibt beim Nutzer: VoiceOver über Git-Sync und den
Frame-Builder, ein echter Push, ERESOLVE, die VMs, die gepackte App je Plattform, das Handbuch samt
PDF neu bauen, `Quartz-GUI:syntax:` in der Vorlage umbenennen, der Satz zum Marker in den Notizen
(`docs/release.md`). Die Richtungen der vorvorvorletzten Runde (`--diff-merges=first-parent`,
`node_modules/.package-lock.json` für `installFailed`) sind weiter nicht verfolgt.

## Eine Frage über den Code hinaus

Wenn dir beim Lesen etwas begegnet, das gegen einen RC aus *diesem* Stand spricht — vor allem an den
zwei Frame-Builder-Änderungen —, gehört es in einen eigenen Abschnitt am Ende deines Dokuments,
getrennt von den Befunden. Ein Satz genügt, wenn nichts dagegen spricht.

## Form der Befunde

Wie gehabt: je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was
schiefgeht, wie es sich zeigt und was dagegen spräche, es so zu lassen. Schreib das Ergebnis nach
`docs/REVIEW-2026-10-04.md`. Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund
wie jeder andere — und wenn eine Richtung deines Vorgängers nicht trägt, auch.
