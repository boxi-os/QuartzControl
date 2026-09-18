Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist und dessen nächste
Fassung ein Release Candidate werden soll. Es geht um ein Review — nicht um Änderungen. Am Ende
steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Sie ist die letzte vor dem RC, und sie liest vor allem Entscheidungen ohne Vorschlag.** Das
dreißigste Review (`docs/REVIEW-2026-10-04.md`, Claude Fable 5.1) meldete fünf niedrige Befunde und
sieben Punkte nebenbei. Abgearbeitet sind die fünf Befunde, von den sieben Punkten vier mit Code;
drei bleiben begründet ohne. Dazu kommen drei Punkte, die beim Abarbeiten auffielen. Die Fixes und
dieser Auftrag sind von Opus 5.

Dein Vorgänger hat ein Muster benannt, das vom Leser unabhängig ist: **Beide Befunde mit Wirkung
steckten in Fixes, für die das Review davor keine Richtung genannt hatte**, und beide gingen an
einem Messgeschirr vorbei, das für den Fall davor gebaut war. In dieser Runde ist das Verhältnis
umgekehrt wie gewünscht: Vier der fünf Befunde haben eine Richtung vom Review, aber **sieben
Code-Commits der zweiten Schicht haben keine** — und einer davon ändert, was jeder Tastatur-Drag im
Frame-Builder tut. **Greif die zweite Schicht zuerst an**, und `0920f95` darin zuerst.

In der Zählung von `CLAUDE.md` ist das das einunddreißigste Review. Die Dateinamen zählen nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md`. Lies dann `docs/REVIEW-2026-10-04.md` — die Befunde und Nebenbei-Punkte, deren
Fixes du liest.

Die Einbindung griff in den letzten sechs Runden. Wenn das bei dir anders ist, ist das eine Messung
und gehört in dein Dokument.

## Umfang

Von `review-2026-10-05` bis `review-2026-10-06`:

    git log --oneline review-2026-10-05..review-2026-10-06
    git diff review-2026-10-05..review-2026-10-06 -- . \
      ':!docs/REVIEW-2026-10-04.md' ':!docs/REVIEW-2026-10-05-auftrag.md'

Ausgenommen sind das Review-Dokument deines Vorgängers (`45339f5`) und diese Auftragsdatei.

**Die Zahlen**, gezählt mit `git diff --shortstat`, bevor der Commit existiert, der diese Datei
trägt:

    # Schicht 1, review-2026-10-05..caec9ad, ohne Review-Dokument:  6 Dateien,  +95 /  −15
    #   davon electron/, src/, scripts/, shared/:                    3 Dateien,  +36 /   −4
    # Schicht 2, caec9ad..478d2d5:                                  12 Dateien, +331 / −113
    #   davon electron/, src/, scripts/, shared/:                    8 Dateien, +251 / −103
    # beide zusammen, ohne Review-Dokument:                         12 Dateien, +410 / −112
    #   davon electron/, src/, scripts/, shared/:                    8 Dateien, +280 / −100

(Die Summen addieren sich nicht, weil beide Schichten dieselben Dateien anfassen.)

| Woher | Commit | Worum es geht | Richtung |
| --- | --- | --- | --- |
| — | `45339f5` | das Review-Dokument selbst (ausgenommen) | |
| Befund 1 | `3d5f2b2` | `scrollBehavior: 'auto'` am `KeyboardSensor` des Frame-Builders | Review, gemessen |
| Befund 2 | `3865910` | `absentFromPackageJson(…, pending.reinstall)` statt `missing` | Review, gemessen |
| Befund 3 | `171822d` | `-m-1 p-1` am waagerechten Roller | Review, ungemessen |
| Befund 4 | `5acf57b` | neuer Schlüssel `updateAbortBlockedByEditNamed`, Dateiname aus `Entry '…' not uptodate` | Review, ungemessen |
| Befund 5 | `26edb1c` (+ Teil von `3d5f2b2`) | Korrekturen in `layout-frames.md` | — |
| — | `caec9ad` | Chronik und Stand | |
| Nebenbei 1 | `5feb5f5` | **`updateAreaHidden` prüft auf Überschneidung** | eigene |
| Nebenbei 3 | `0920f95` | **`keepCrossAxis` in `dndKeyboard.ts`; „noch nicht bewegt“ ist jetzt der Ref `keyStepped`, nicht mehr ein Translate von null** | eigene |
| Nebenbei 4 | `45a4b1e` | **Kopfzeile eines Kastens bricht um, `Badge` bekommt `truncate`** | eigene |
| Nebenbei 5 | `4e1e1ac` | **`StashPopOutcome.restored`; der Abbruch ordnet in beiden Fällen: handeln, verloren, geglückt** | eigene |
| beim Abarbeiten | `d9ace7d` | **`scrollBehavior: 'auto'` auch am Layout-Board** | eigene |
| beim Abarbeiten | `7bb3f67` | Rückfallsatz des verweigerten Abbruchs ohne „unten genannte Datei“ | eigene |
| beim Abarbeiten | `3afe5ae` | **`outstandingPackages`, `missingFrom`, `absentFrom` und `UNREADABLE` in `shared/packageJsonDeps.ts`; `check:core-update` prüft fünf Statuslisten** | eigene |
| — | `478d2d5` | Chronik und Stand | |
| — | — | dieser Auftrag samt Absatz in `docs/reviews.md`; der Tag sitzt hier | |

Nebenbei 2 (schnelle Pfeile) ist mit Befund 1 erledigt, 6 (Kappung gegen `min-content`) und 7
(Zeilenzahl) sind ohne Code — die Begründung steht am Ende von `docs/decisions/layout-frames.md`.

Steht in `git log` etwas anderes als hier, gilt `git log`.

**Im Handbuch-Vault liegt aus dieser Runde nichts Neues.** Geprüft wurde nur, dass kein Kapitel
etwas beschreibt, das sich geändert hat (die geänderten Sätze zitiert es nicht, `check:handbook` 26
von 26). Der Vault ist `~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`. **Lies dort, schreib
dort nichts.**

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung. Miss an Kopien.

## Was du wissen musst, bevor du liest

**Lies Commit-Nachrichten als Behauptungen.** Die Zahlen darin sind gezählt, aber vom selben Modell,
das sie schreibt.

**Das Geschirr deines Vorgängers wurde benutzt und erweitert.** Es liegt im Scratchpad seiner
Sitzung (`/private/tmp/claude-501/-Users-boxi-Development-QuartzControl/f2099214-8d2c-4bde-acae-8eda8784902d/scratchpad`),
sofern es noch da ist — nichts davon im Repo. Benutzt: `ui/d1.mjs` mit `r2.mjs`, `d2.mjs`, `g1.mjs`,
`o1.mjs`, `f1.mjs`; `hr/scene-r2.sh`, `scene-r2n.sh`, `scene-ab-fail2.sh`. Neu dazu: `ui/ss.mjs`
(Leertaste · Leertaste auf allen Kästen), `ui/o2.mjs` (aus- und wieder einblenden), `ui/w1.mjs`
(hohe Zeile durch offenes Formular), `ui/n4.mjs`/`n5.mjs` (Kasten in einer 57-px-Spalte),
`ui/gb.mjs` (Layout-Board), `hr/scene-refuse-fix.sh` (verweigerter Abbruch), `hr/scene-older.sh`
(älterer Eintrag derselben App auf demselben HEAD). **Frame-Index 2 ist „focus“**, die Projekte
sind `proj-nav` (die vier Frames), `proj-nav3` (sechs Zeilen, `left` 3 × 1), `proj-navR2` (`right`
ausgeblendet), `proj-navO` (`before-body` ausgeblendet über `header`).

**Die Messfalle der letzten Runde gilt weiter:** Eine Szene, die direkt nach `focus()` aufnimmt,
findet den Roller schon am Anschlag. Tab auf den Griff und eine Pause, wie ein Mensch.

**`npm run smoke` startet gegen das echte Profil dieses Rechners** und macht 40 Aufrufe; es
navigiert nur. `check:i18n` zählt 1139 + 185 Schlüssel (67 nicht prüfbar); `check:core-update`
(14 Pläne, 3 npm-Aufrufe, 5 Statuslisten), `check:semver`, `check:plugin-names`, `check:handbook`
(26) sind auf `478d2d5` grün.

**Ein Fenster wird auf diesem Bildschirm nicht breiter als 1470 px** und nicht höher als 923 px;
die Mindestbreite ist 960 px. Gemessen wurde bei 1280, 1470 und 1728 px.

**Abwägungen, die ich selbst getroffen habe — prüf, ob sie tragen:**

- **„Noch nicht bewegt“ heißt jetzt „in diesem Drag hat noch kein Pfeil einen Schritt ergeben“**
  (`0920f95`). Ein Ref, den der Getter des Frame-Builders setzt, sobald er Koordinaten liefert, und
  den `onDragStart` zurücksetzt. Vorher war es ein Translate von null, und dein Vorgänger hatte
  bestätigt, dass das trägt, *weil* jeder erste Schritt eine Querkomponente hatte. `keepCrossAxis`
  nimmt ihm genau die: Ein erstes ↓, das der Sensor ganz aufs Rollen verwendete, galt als Aufnahme,
  und der dreizeilige `left` blieb bei ↓ · Leertaste stehen. Gefunden an der eigenen Gegenprobe vor
  dem Commit, dann umgestellt. **Zu prüfen:** ob der Ref an jeder Stelle stimmt, an der ein Drag
  endet oder abbricht, ob ein Druck, der Koordinaten liefert, aber nichts bewegt, ihn fälschlich
  setzt, und ob es einen Weg gibt, auf dem ein Drag ohne `onDragStart` beginnt.
- **`keepCrossAxis` gilt nur im Frame-Builder.** Ein waagerechter Schritt behält die Höhe des Chips,
  ein senkrechter seine waagerechte Lage, jeweils so weit, wie das Ziel reicht; ist das Ziel kleiner
  als der Chip, wird zentriert. Die Kollisionsrechnung nimmt ohnehin das kleinste Ziel unter der
  Chip-Mitte, sobald keine Zielmitte genau passt. Das Layout-Board behält die Mitte, weil dort die
  Stelle in einer Liste zählt. **Nicht gemessen nach `0920f95`:** der Weg aus dem Raster in die
  Ablage und zurück (der zweite Durchgang ohne Achsen-Bedingung), ein Chip aus der Ablage ins
  Raster, ein Pfeil über einen Kasten hinweg.
- **Die zweite Hälfte von Nebenbei 3 ist nicht angefasst:** Beim Aufnehmen eines hohen Kastens
  zentriert dnd-kit den *Kasten*, und der Chip an seiner Ecke steht über dem Fenster.
- **Einblenden wird abgelehnt, wenn es überschneidet** (`5feb5f5`), mit der Meldung, die auch das
  Ändern der Spanne gibt. Ein Frame, dessen *Datei* schon eine Überschneidung trägt (so war die
  Szene deines Vorgängers entstanden), bleibt, wie er ist, bis jemand den Schalter anfasst.
- **Die Kopfzeile bricht um, die Badge kürzt** (`45a4b1e`). Dafür hat `Badge` eine neue
  Eigenschaft `truncate`, statt eine Klasse von außen zu bekommen — die Regel „`className` auf einem
  Primitive ist Platzierung“. Ein offenes Bereichsformular in einer 57-px-Spalte ragt weiter hinaus
  (Rollweg 1297 statt 1242), weil seine Felder feste Breiten haben, die darunter keinen Sinn
  ergeben. Gemessen: In allen Kästen der vier Frames bei 1280 und 1728 px bleibt die Kopfzeile
  einzeilig.
- **Der Abbruch ordnet „handeln, verloren, geglückt“** (`4e1e1ac`), auch wenn der erste Satz dann
  von einem älteren Eintrag spricht, bevor gesagt ist, dass der Abbruch geglückt ist. Im Fall
  „fremder oder älterer Eintrag, nichts von uns zurückzulegen“ steht der Satz jetzt vor der
  verworfenen Datei statt dahinter. **Nur am Bündel gemessen, nicht an den Seiten.**
- **Der Dateiname im verweigerten Abbruch** (`5acf57b`) kommt aus einer Zeile, deren Form git
  festlegt (`^error: Entry '(.+)' not uptodate\. Cannot merge\.$`), und wird nur als Text in einen
  Satz gesetzt. Mehrere Treffer werden mit Komma verbunden; gemessen ist nur einer. Der Rat daneben
  nennt weiter `git checkout -- <Datei>` mit Platzhalter, nicht mit dem Namen, weil ein Pfad mit
  Leerzeichen einen falschen Befehl ergäbe. **Nur am Bündel gemessen, nicht an den Seiten.**
- **Die Statusrechnung steht jetzt in `shared/`** (`3afe5ae`). Ein nicht lesbares `package.json`
  ist das Symbol `UNREADABLE`, weil `JSON.parse` auch `null` liefern kann und das vorher anders
  antwortete als „nicht lesbar“. Der Dienst liest die Datei für den Status einmal statt zweimal.
  Gegenprobe: Mit dem alten Argument meldet `check:core-update` R2N; das Bündel mit echtem npm
  antwortet für R2 und R2N wie vor der Umstellung.
- **`scrollBehavior: 'auto'` an beiden Boards.** Gemessen ist, was eine Ansage sagt und wie viele
  Schritte ankommen; nicht, ob der Sprung statt des Gleitens für Sehende stört.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Der Frame-Builder nach `0920f95` (und `3d5f2b2`, `171822d`, `5feb5f5`, `45a4b1e`)

Gemessen an der gebauten App: `page-body` Tab · Leertaste · → → → → · Leertaste bei 1280 und
1470 px und mit 40 ms Abstand (keine Zwischenansage, Spalte 8); der dreizeilige `left` in fünf
Szenen (Ansagen und Plätze wie vor `0920f95`); `left` mit offenem Formular, → → ← ← · Leertaste
(Chip bleibt bei y = 387 statt 699); Leertaste · Leertaste auf 31 von 31 Kästen der vier Frames;
„index“ auf Tablet und Mobil mit Rundwegen und Escape; der Ring als Bildausschnitt; Einblenden
über `header` abgelehnt, `footer` aus und wieder ein. **Nicht gemessen:** siehe die Abwägungen
oben, dazu die Maus nach `0920f95` und ein Frame, der über die Datei schon eine Überschneidung
trägt.

### 2. Die Statusrechnung und der Abbruch (`3afe5ae`, `3865910`, `4e1e1ac`, `5acf57b`, `7bb3f67`)

R2 und R2N mit echtem npm am Bündel vor und nach der Umstellung; der verweigerte Abbruch
(`README.md` nach halbem Merge geändert); der ältere Eintrag mit vorgemerkter `notes.txt`; AB3.
**Nicht gemessen:** alle vier an den Seiten der gebauten App; R4 (drei Abschnitte); ein
verweigerter Abbruch über mehrere Dateien.

### 3. Das Layout-Board (`d9ace7d`)

Gebaute App, 1280 px: sechs ↓ mit 1200 und mit 40 ms (vorher zwei Zeilen weit, jetzt sechs),
Leertaste · ↓ · Leertaste, Leertaste · Leertaste, ↑ vom unteren Ende. **Nicht gemessen:** ein Chip
aus der Palette, Zonen nebeneinander (← →), die Szene des achtzehnten Reviews (Chip nach drei
Pfeilen wieder auf der Palette).

## Wie gemessen werden kann

- **Der Dienst ohne App**: esbuild-Bündel (`--bundle --platform=node --format=cjs
  --external:electron --alias:@shared=./shared --tsconfig=tsconfig.node.json`), `electron` über
  einen Stub. Lokales Upstream-Repo, Status ohne Netz über `url.<bare>.insteadOf`. Vorher-Bündel
  über `git archive review-2026-10-05`.
- **npm echt** (das gepinnte aus `node_modules/npm`), wo nötig hinter einem `bin/npm`, das einen
  bestimmten Aufruf scheitern lässt (`NPM_FAIL_MATCH`).
- **Zwei gebaute Apps nebeneinander**: `git archive review-2026-10-05` ins Scratchpad,
  `node_modules` verlinken, `npx electron-vite build`, den App-Pfad im Launcher über `QC_REPO`
  wählen.
- **Die gebaute App nicht-interaktiv**: eigenes Playwright-Skript, `--user-data-dir=<wegwerf>`,
  `page.emulateMedia({ colorScheme: null })`, Projekt über `window.quartzGui.projects.add`,
  Ansagen über einen `MutationObserver` auf `[id^="DndLiveRegion"]` und `[role="status"]`,
  Tastendrücke nach `focus()` auf den Griff — und für Rollszenen Tab plus Pause.
- **Ein Projekt zum Anfassen**: `cp -Rc` von `~/Documents/QuartzProjekte/navigations-testprojekt`
  in den Scratchpad. In der Kopie unter `content/` nichts schreiben.

## Was offen bleibt, und nicht für diese Runde

Die Liste vor dem RC ist keine Code-Frage und bleibt beim Nutzer: VoiceOver über Git-Sync und den
Frame-Builder, ein echter Push, ERESOLVE, die VMs, die gepackte App je Plattform, das Handbuch samt
PDF neu bauen (4.5 ist seit der neunundzwanzigsten Runde geändert und nicht gebaut),
`Quartz-GUI:syntax:` in der Vorlage umbenennen, der Satz zum Marker in den Notizen
(`docs/release.md`). Die Richtungen von vier Runden zuvor (`--diff-merges=first-parent`,
`node_modules/.package-lock.json` für `installFailed`) sind weiter nicht verfolgt.

## Eine Frage über den Code hinaus

Wie letztes Mal: Wenn dir etwas begegnet, das gegen einen RC aus *diesem* Stand spricht — vor allem
an `0920f95` —, gehört es in einen eigenen Abschnitt am Ende deines Dokuments, getrennt von den
Befunden. Ein Satz genügt, wenn nichts dagegen spricht.

## Form der Befunde

Wie gehabt: je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was
schiefgeht, wie es sich zeigt und was dagegen spräche, es so zu lassen. Schreib das Ergebnis nach
`docs/REVIEW-2026-10-05.md`. Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund
wie jeder andere — und wenn eine Richtung deines Vorgängers nicht trägt, auch.
