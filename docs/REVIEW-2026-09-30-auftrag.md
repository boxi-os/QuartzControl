Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist. Es geht um ein
Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Was diese Runde anders macht

**Der Diff ist wieder eine Schicht statt drei.** Vierzehn Commits, mit denen die neun Befunde des
fünfundzwanzigsten Reviews und drei Punkte seiner Nebenbei-Liste abgearbeitet wurden — dieselbe
Kette wie in den Runden davor: Kern-Update, Drag-Ansagen, und diesmal dazu die Sätze und Zahlen,
die die Runde davor daneben gelegt hatte.

**Das Review, dessen Fixes du liest, stammt von einem anderen Modell als die Fixes.**
`docs/REVIEW-2026-09-29.md` ist von Claude Fable 5.1; die vierzehn Commits und dieser Auftrag sind
von Opus 5. Das ist die Richtung, die die Serie sucht: Wer eine Begründung geschrieben hat, prüft
sie nicht selbst. Du bist wieder ein anderes Paar Augen — und der Fall, den du **zuerst** suchen
solltest, ist der, in dem ein Fix eine Behauptung des Reviews übernommen hat, ohne sie
nachzumessen. Genau das ist einmal fast passiert (siehe „Abwägungen“, erster Punkt).

**Die Paketliste des Kern-Updates ist zum sechsten Mal angefasst** — diesmal nicht neu gebunden,
sondern an zwei Stellen enger gemacht: die Nadel von `git log -G` steht in Anführungszeichen, und
ein Lauf, der zwischen zwei `npm install` scheitert, kürzt seine Notiz auf das, was wirklich noch
fehlt. **Die Nachträge in `docs/decisions/snapshots-and-updates.md` hintereinander zu lesen ist
weiter der beste Weg in diese Runde** (zuletzt: der Absatz „Nachtrag (2026-09-18 …)“ am Ende). Die
dritte Tür, die das Review gefunden hat — eine Antwort, die *in* einem Merge-Commit gegeben wird —,
ist **bewusst offen** und steht als solche im Kommentar. Prüf, ob das die richtige Entscheidung ist
und ob sie vollständig beschrieben ist.

**Ein Zustand ist dazugekommen, den es vorher nicht gab.** „Nicht abgeschlossen“ hat jetzt zwei
Gründe: die alte Paketliste und ein `npm install`, das nicht durchkam (`installFailed` in der
Notiz). Der zweite hat einen eigenen Satz auf der Seite und **kein Handbuch-Kapitel** — siehe „Was
diese Runde offen gelassen hat“.

**Nachgetragen, nachdem dieser Auftrag stand: eine zweite, kleine Schicht.** Der vierte
Nebenbei-Punkt des letzten Reviews — der letzte offene — ist doch noch vor dieser Runde behoben
worden (`a684e37`, „Der Button ist seine eigene Flex-Zeile“): `inline-flex items-center
justify-center gap-1.5` im `Button`-Primitive, die `<span>`-Hüllen und Klassenfolgen an den
13 Icon-Knöpfen sind weg. Der Tag `review-2026-10-01` ist deshalb vom ersten Auftrags-Commit
(`3aa1e0f`) auf den Commit dieses Nachtrags versetzt worden. Siehe „Worauf es ankommt“, Punkt 7.

In der Zählung von `CLAUDE.md` ist das das sechsundzwanzigste Review. Die Dateinamen zählen nach
Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik der Reviews
in `docs/reviews.md`. Lies dann `docs/REVIEW-2026-09-29.md` — die neun Befunde, deren Fixes du
liest, samt den Messungen, die sie belegen, und seine Liste „Nebenbei aufgefallen“, von der drei
Punkte mit erledigt sind. Der Auftrag dazu steht in `docs/REVIEW-2026-09-29-auftrag.md`; er behält
seinen Wortlaut, auch dort, wo dieses Review ihn widerlegt hat (das Schloss, die Zahlen um die
Naht) — ein Auftrag protokolliert den Stand, den er gelesen hat.

**Die Einbindung greift**, hat das letzte Review gemessen: In seiner Sitzung lag der volle Text von
`docs/conventions.md` vor dem ersten Werkzeugaufruf im Kontext. Wenn das bei dir anders ist, ist
das eine Messung und gehört in dein Dokument.

## Umfang

Schicht 1 lag auf `fix/review-2026-09-29`, Schicht 2 auf `fix/button-inline-flex`; **beide sind
per Fast-Forward auf `main` und gepusht** (2026-09-18), die Tags auch. Von `review-2026-09-30` bis
`review-2026-10-01`:

    git log --oneline review-2026-09-30..review-2026-10-01
    git diff review-2026-09-30..review-2026-10-01 -- . \
      ':!docs/REVIEW-2026-09-29.md' ':!docs/REVIEW-2026-09-30-auftrag.md'

Ausgenommen sind zwei Dateien: `docs/REVIEW-2026-09-29.md` (das Review, das du liest, statt es zu
prüfen — allein +443) und diese Auftragsdatei.

**Die Zahlen, und woran sie gezählt sind.** Gezählt gegen den Arbeitsbereich, **bevor** der Commit
existiert, der diese Datei trägt — also ohne ihn und ohne den Absatz, den er an `docs/reviews.md`
anfügen wird. Das ist der wiederkehrende Befund dieser Serie; hier steht er wieder als Warnung
statt als Behauptung. Rechne nach:

    # ohne Review-Dokument und Auftrag: 19 Dateien, +496 / −113
    #   davon App-Code und Skripte (electron/, src/, scripts/):  14 Dateien, +316 / −81
    #   davon docs/ und CLAUDE.md:                                5 Dateien, +180 / −32

**Schicht 2 für sich** (`3aa1e0f..a684e37`, ohne den Commit dieses Nachtrags): 12 Dateien,
+45/−60, davon `src/` 9 Dateien, +30/−54. Die Zahlen oben gelten weiter für Schicht 1 bis
`3aa1e0f`; wer den Gesamtdiff bis zum Tag zählt, bekommt beide Schichten *und* diesen Nachtrag
(Auftrag und `docs/reviews.md`) — also mehr als die Summe.

`review-2026-09-30` sitzt auf `dca65ff` („Der Auftrag fuer das fuenfundzwanzigste Review“), dem
Stand, den das letzte Review gelesen hat. Die Commits:

| Woher | Commit | Worum es geht |
| --- | --- | --- |
| — | `cf5405f` | das Review-Dokument selbst (ausgenommen) |
| Befund 1 | `3e2e90f` | **Der Satz des Abbruchs steht außerhalb des Merge-Bands** |
| Befund 2 | `567b1f9` | **Nadel in Anführungszeichen; der Fehlerzweig kürzt die Notiz** |
| Befund 3 | `19ab2ed` | **`absentFromPackageJson`, drei Verdikte statt Bool, Satz auch im Fehlerweg** |
| Befund 4 | `6a06928` | vier Beschreibungen des Schlosses richtiggestellt (kein Code) |
| Befund 5 | `f61208e` | **`installFailed` in der Notiz: ein zweiter Grund für „Nicht abgeschlossen“** |
| Befund 6 | `9c5817e` | **`dropOutcome`: Löschung und Nicht-Ablage bekommen eigene Sätze** |
| Befund 7 | `406d260` | fünf Begründungen aus Schicht 2; `DISPLAY_ORDER` als `Record` |
| Befund 8 | `751d503` | die Zahlen und Sätze um die Naht der geteilten `CLAUDE.md` |
| Befund 9 | `07da145` | **`shootProject`: eine Vorgabe für „welches Projekt“** |
| Nebenbei 3 | `d495ae6` | `updatePackagesMissing` nennt, was wirklich fehlt |
| Nebenbei 4 | `7546890` | der Satz des Schlosses nennt keinen Knopf mehr |
| Nebenbei 2 | `5268c71` | was „der Pfad einer Route ändert sich nicht“ wirklich heißt |
| — | `ad16174` | die Nachträge in `docs/decisions/` und vier Regeln in `conventions.md` |
| — | `77743c2` | die Chronik trägt die Runde |
| — | `3aa1e0f` | dieser Auftrag, samt dem Absatz über diese Runde in `docs/reviews.md` |
| Nebenbei 1 | `a684e37` | **Schicht 2: der Button ist seine eigene Flex-Zeile** |
| — | — | dieser Nachtrag zum Auftrag; der Tag sitzt hier |

Steht in `git log` etwas anderes als hier, gilt `git log`.

**Im Handbuch-Vault liegt von dieser Runde nichts.** Der Stand dort ist der der Vorrunde; ob er
committet ist, sagt `git -C ~/Documents/QuartzProjekte/QuartzControl-Handbuch status`. **Lies dort,
schreib dort nichts.**

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung.

## Was du wissen musst, bevor du liest

**Lies Commit-Nachrichten als Behauptungen.** In diesem Projekt gilt eine Zahl in einer
Commit-Nachricht als Messung; trägt sie nicht, ist das ein Befund. Diese Runde hat dafür zwei
Fälle geliefert: Die Vorrunde schrieb „45 statt 29 px“ und „die vier anderen
Aktualisieren-Knöpfe“, das Review „33 gegen 31,5 px“ — nachgemessen sind es 31,5 px an drei
Knöpfen mit Icon *und* an dem mit `<span>` auf Git-Sync, während die Übersicht 32,8–33,3 px zeigt.
Drei Runden, drei Zahlen für dieselbe Sache.

**`npm run smoke` startet gegen das echte Profil dieses Rechners.** Ich habe es nach jedem Fix
laufen lassen (42 Aufrufe, grün). Es navigiert nur, aber die Einschränkung gilt weiter.

**Ein Fenster wird auf diesem Bildschirm nicht breiter als 1470 px** (`setContentSize(1728, …)`
liefert 1470) und nicht höher als 923 px. Die Mindestbreite ist 960 px (`MIN_SIZE`) — `sm:` und
`md:` sind damit in dieser App immer wahr, was diese Runde in einen Kommentar geschrieben hat.

**Abwägungen, die ich selbst getroffen habe — prüf, ob sie tragen:**

- **Ich habe eine Zahl des Reviews übernommen und dann doch gemessen.** Der Kommentar in
  `DiscoveredServers.tsx` sollte „33 px bei Git-Sync“ sagen, weil das Review das so schreibt. An
  der gebauten App sind es 31,5 px, also steht es jetzt anders da. Such weitere Stellen, an denen
  ein Fix eine Behauptung des Reviews trägt, ohne sie nachzumessen — insbesondere in den Zahlen des
  Befunds 8 und in den Sätzen über `-G` (die habe ich an git 2.54 und 2.53 selbst nachgestellt).
- **Der Fehlerzweig des Laufs kürzt die Notiz** (`markInstallPending(…, leftOver, …, true)`). Die
  Frage dahinter: Kann `leftOver` etwas **verlieren**, das der nächste Lauf gebraucht hätte?
  `stillMissing` gibt bei unlesbarer `package.json` die ganze Liste zurück, also im Zweifel mehr;
  aber zwischen npm-Fehlschlag und diesem Aufruf liegt ein `dropNpmOwnedFiles`. Prüf die
  Reihenfolge, und prüf, was passiert, wenn npm im *ersten* Aufruf scheitert.
- **Die Nadel in Anführungszeichen ist enger, aber nicht exakt.** `"@scope/name"` trifft weiter
  eine `scripts`-Zeile, deren **Wert** genau der Name ist. Ich habe das im Kommentar benannt statt
  es zu lösen — eine exakte Lösung hieße, den Diff zu parsen statt ihn zu durchsuchen. Trägt das?
- **`absentFromPackageJson` fragt über alle Abschnitte** (`DEPENDENCY_SECTIONS.every(…)`), weil ein
  Eintrag, der von `dependencies` nach `devDependencies` gewandert ist, eine Antwort ist. Damit
  schweigt der Satz auch, wenn ein Paket im *falschen* Abschnitt steht. Ist das richtig herum?
  Und: Bei unlesbarer `package.json` gibt die Funktion `[]` zurück (also kein Satz), während
  `stillMissing` im selben Fall alles zurückgibt (also npm fragen). Zwei gegenläufige Vorgaben,
  beide mit Absicht — prüf beide.
- **`installFailed` endet erst, wenn ein Lauf durchläuft.** Wer nach dem Fehlschlag selbst
  `npm install` im Terminal tippt, sieht weiter „Nicht abgeschlossen“; die App kann das nicht
  sehen. Mein Argument: Der Knopf ist dann harmlos (ein Lauf, der nichts zu holen hat, installiert
  und räumt die Notiz ab), und die Gegenrichtung — grün über einem `node_modules`, das nicht zu
  `package.json` passt — ist die schlechtere. Prüf, ob es einen dritten Weg gibt, und ob ein
  Projekt in diesem Zustand irgendwo *anders* in der App eine falsche Auskunft bekommt.
- **`dropOutcome` ist ein dritter optionaler Parameter des Ansage-Hooks**, kein eigener Hook und
  keine Pflicht. Drei Fragen: Ist die Reihenfolge in `onDragEnd` richtig (erst `isHome`, dann
  `dropOutcome`, dann der gewohnte Satz)? Sagt der Satz das Richtige, wenn dasselbe per **Maus**
  geschieht — nicht gemessen? Und sollte der Frame-Builder einen bekommen?
- **Der Abbruch-Satz auf Git-Sync steht jetzt in einem eigenen Kasten unter der Badge-Zeile, ohne
  Live-Region und ohne Farbe.** Ein verweigerter Abbruch und ein geglückter mit Verlust sehen
  weiter gleich aus (auf Updates ebenso, dort ein dunkles `<pre>`). Das Review nennt das
  „Niedrig und gelesen“; ich habe es so gelassen. Prüf, ob das nach der Regel „Was ohne Zutun
  erscheint, wird angesagt“ reicht.
- **`shootProject` ist nicht durch einen echten Lauf gegangen.** Ein Lauf ohne `--demo` schreibt in
  den Handbuch-Vault; gemessen ist die Funktion gegen die echte Projektliste dieses Rechners (zehn
  Projekte). Prüf, ob `screenshots.mjs` sie an jeder Stelle nutzt, an der es vorher selbst
  entschieden hat.
- **`DISPLAY_ORDER` ist ein `Record` geworden, und `content` steht ausdrücklich zuerst.** Vorher
  war das ein Zufall (`indexOf` = −1). Prüf, ob „Inhalt zuerst“ zu dem Satz passt, den der
  Kommentar darüber behauptet („was die Website ausmacht zuerst, woraus sie gebaut ist danach“) —
  die Notizen sind beides nicht.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Die zwei Verengungen der Paketliste (`567b1f9`, `19ab2ed`)

Die sechste Runde an derselben Liste, und die erste, die keine neue Bindung einführt. Prüf beide
Richtungen: Gibt es eine Lage, in der die Liste jetzt **zu lange** steht (ein Nutzer hat
geantwortet, und die App sieht es nicht)? Und eine, in der sie **zu früh** fällt? Die drei
Verdikte (`stands` / `answered` / `unreadable`) sind neu; jedes hat einen Satz oder eine
Konsequenz, und `unreadable` ist der einzige Weg, auf dem eine Liste ohne Antwort verschwindet.

### 2. Der neue Zustand (`f61208e`)

`installFailed` wird an genau einer Stelle gesetzt und an zwei gelesen
(`outstandingCoreInstall`, und über den Status die Seite). Prüf: Was passiert mit einer Notiz aus
einem Build **vor** diesem Feld (Absicht: liest sich wie „npm hatte seinen Zug“)? Was, wenn der
Lauf nach dem Fehlschlag am Schreiben der Notiz scheitert? Und was sagt die Übersichtsseite über
ein Projekt in diesem Zustand — sie liest denselben Status.

### 3. Die Ansagen (`9c5817e`)

Vier Sätze auf dem Board, drei davon in verschiedenen Runden entstanden: `picked`, `pickedOver`,
`over`, `backHome`, `droppedHome`, `dropped` — und jetzt `removed` und `notRemovable`. Prüf die
Wechselwirkung mit `firstOver` und `movedAway`, und ob es eine Kombination gibt, in der zwei
Antworten gleichzeitig zutreffen.

### 4. Was der Abbruch sagt (`3e2e90f`)

Gemessen ist der Weg „vorgemerkte Datei wird verworfen“ an der gebauten App. Nicht gemessen: ein
gescheiterter Stash-Pop und ein von git verweigerter Abbruch, beide an derselben Stelle. Stell
einen davon her.

### 5. Die Beschreibungen (`6a06928`, `406d260`, `751d503`)

Drei Commits, die nur Sätze und Zahlen ändern. Jede Zahl darin ist eine Messung: 31,5 px, drei
Knöpfe, 960 px Mindestbreite, +2023/−1957, 189 055 Zeichen gegen 192 422 Bytes, 103 und 68 KB.
Prüf sie. Und prüf, ob die vier neuen Regeln in `docs/conventions.md` das beschreiben, was der
Code tut — sie sind aus dieser Runde entstanden und von niemandem gelesen.

### 7. Der Button (`a684e37`, Schicht 2)

Das Primitive trägt die Anordnung jetzt selbst, und das trifft **jeden** der 138 Aufrufe, nicht nur
die 13 mit Icon. Gemessen ist an der gebauten App, 1728×1000, hell, der Projektstand des ersten
Projekts in der Liste: alle 806 Knöpfe auf 21 Bildschirmen, Kasten und Lage des Inhalts, vorher und
nachher. Sechs Kästen ändern ihre Höhe (32,8–33,3 → 31,5 px), kein Inhalt verschiebt sich, unter
„Neue Datei“ rückt die Spalte um 1,8 px nach. Was diese Messung **nicht** sieht: dunkel,
1280 px, einen Knopf, der auf diesem Stand nicht gerendert war (Dialoge, „Stoppen“ bei laufendem
Server, Fehlerzustände, leere Listen), und einen Knopf, dessen Beschriftung umbrechen *soll* — in
einer Flex-Zeile wird zusammenhängender Text zu einem anonymen Element, ein Inline-Element darin
(`<code>`, `<strong>`) aber zu einem eigenen, und der Leerraum dazwischen fällt weg. Die Suche
danach war ein Skript über die JSX-Kinder, kein Rendern. Prüf auch, ob die Regel in
`docs/conventions.md` und der Kommentar am Primitive stimmen — die Zahlen darin kommen aus dem
fünfundzwanzigsten Review und dieser Messung.

### 6. Was die Prüfskripte nicht sehen

`npm run typecheck`, `build`, `smoke` (42 Aufrufe), `check:i18n` (1126 + 183 Schlüssel),
`check:handbook` (26 Zitate), `check:core-update` (14 Pläne, 3 npm-Aufrufe) und `check:semver`
sind auf diesem Stand grün. Keines sieht: eine Notiz, den Status, ein Schloss, einen Merge, einen
Amend, einen Tastatur-Drag, eine Kartenhöhe — und keines sieht, dass das Handbuch einen Zustand
der Updates-Seite jetzt **nicht mehr vollständig** beschreibt. Was misst du, das sie nicht messen?

## Wie gemessen werden kann

- **Der Dienst ohne App**: esbuild-Bündel von `updateService.ts` (`--bundle --platform=node
  --format=cjs --external:electron`, Alias `@shared` auf `shared/`), `electron` über einen Stub in
  einem eigenen `node_modules/electron/index.js`. Gegenseite ist ein lokales Upstream-Repo; für den
  **Status** ohne Netz genügt `GIT_CONFIG_GLOBAL` auf eine Datei mit
  `[url "<pfad>"] insteadOf = https://github.com/jackyzha0/quartz.git`. Für eine Vorher-Messung ein
  zweites Bündel aus `git stash` bzw. `git archive review-2026-09-30`.
- **npm als Attrappe auf dem PATH**, in vier Betriebsarten: schreibt, scheitert, schreibt nichts,
  scheitert beim zweiten Aufruf. Die vierte ist die, die Befund 2a dieser Runde sichtbar macht.
- **Die gebaute App nicht-interaktiv**: `npm run build`, dann ein eigenes Playwright-Skript im
  Scratchpad, das `playwright-core` über den **absoluten Pfad** lädt (ein blankes
  `from 'playwright-core'` findet es außerhalb des Repos nicht), `--user-data-dir=<wegwerf>`,
  danach `page.emulateMedia({ colorScheme: null })`, Projekt über `window.quartzGui.projects.add`,
  Routen über `location.hash` (Git-Sync ist `/sync`, nicht `/git`). Für den Status der Updates-Seite
  **26 s warten**: `lsRemoteHead` hat 20 s Frist.
- **Tastatur-Drags**: Griff per `evaluate` fokussieren (`[aria-roledescription="sortable"]`), dann
  echte `page.keyboard.press`. Die Live-Region liest man über `[role="status"],[aria-live]`.
- **Ein Projekt zum Anfassen**: `cp -Rc` von `~/Documents/QuartzProjekte/navigations-testprojekt`
  in den Scratchpad. In der Kopie unter `content/` nichts schreiben.
- **Nicht gemessen** und deshalb offen für dich: die **gepackte** App; das gebaute Handbuch; ein
  Maus-Drag; ein Screenreader; ERESOLVE; ein echter Push; die VMs und die Linux-Pakete; ein Lauf
  von `screenshots.mjs`; die Notiz über einen Restore oder ein Duplikat hinweg.

## Was diese Runde offen gelassen hat

1. ~~Der vierte Nebenbei-Punkt des letzten Reviews bleibt stehen~~ — nachgeholt in Schicht 2
   (`a684e37`, Punkt 7 oben).
2. **Das Handbuch kennt den neuen Zustand nicht.** „Nicht abgeschlossen“ hat jetzt zwei Gründe, und
   das Kapitel zur Updates-Seite zählt die Prüfzustände auf. `check:handbook` sieht das nicht (es
   prüft Blockzitate), und der Vault liegt außerhalb dieses Repos. Dasselbe gilt für die zwei neuen
   Drag-Ansagen.
3. **Das mitgelieferte Handbuch ist weiter nicht neu gebaut** (`resources/handbook/`), und das PDF
   auch nicht. Bis dahin zeigt die App den Stand der vorletzten Runde.
4. **Der Zweig `2xl:columns-3` der Vorlagen-Seite** ist weiter nur über Zoom gemessen, nicht an
   einem Fenster dieser Breite.
5. **Aus der offenen Liste der Vorrunde ist nichts nachgeholt**: die gepackte App, ein echter Push,
   ERESOLVE, ein Screenreader, der Maus-Drag, die VMs.
6. ~~Nichts ist gepusht.~~ Beide Schichten liegen seit dem 2026-09-18 auf `origin/main`.

## Form der Befunde

Wie gehabt: je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was
schiefgeht, wie es sich zeigt und was dagegen spräche, es so zu lassen. Schreib das Ergebnis nach
`docs/REVIEW-2026-09-30.md`. Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund
wie jeder andere.
