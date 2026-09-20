Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist und dessen nächste
Fassung ein Release Candidate werden soll. Es geht um ein Review — nicht um Änderungen. Am Ende
steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Die zweite Schicht ist kein Review-Fix.** Zweiunddreißig Runden lang las jedes Review, was das
vorige angestoßen hatte: kleine Eingriffe mit einer Richtung, die jemand aufgeschrieben hatte.
Diesmal liegt daneben ein **Funktionsdurchgang**, den kein Review verlangt hat — die Schriften der
Stile-Seite, von der Auswahl bis zu den Dateien im Projekt —, dazu ein **Rückbau** (das Handbuch
reist nicht mehr mit) und eine **Umstellung** (der Reiter „Website“ als fünf Karten). Das ist der
größte Diff seit langem, und er ist an keiner Vorgabe entlanggebaut: Jede Entscheidung darin ist
eine erste.

**Neu ist außerdem eine Art von Code, die es hier bisher nicht gab:** Die App lädt zur Laufzeit
Dateien aus dem Netz in das Projekt des Nutzers und löscht dort welche. Bisher ging genau eine
Anfrage nach draußen (der Update-Check, nie awaited) und eine zweite für die Kataloge; jetzt hängt
ein Build daran.

**Wer was geschrieben hat:** Die gelesenen Commits sind von Claude Opus 5, das zweiunddreißigste
Review war von Claude Fable 5.1. Damit ist der Normalfall der Serie wiederhergestellt, den die
Vorrunde nicht hatte — zwei Modelle, und der Leser hat den Code nicht selbst gebaut. **Dieser
Auftrag ist allerdings von demselben Modell wie die Commits, und nicht aus derselben Sitzung:**
Was unten als „gemessen“ steht, steht aus den Commit-Nachrichten, nicht aus eigener Erinnerung an
die Messung. Lies es entsprechend.

In der Zählung von `CLAUDE.md` ist das das dreiunddreißigste Review. Die Dateinamen zählen nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md`. Lies dann `docs/REVIEW-2026-10-06.md` — die Befunde, deren Fixes die erste
Schicht sind.

Die Einbindung griff in den letzten acht Runden. Wenn das bei dir anders ist, ist das eine Messung
und gehört in dein Dokument.

## Umfang

Von `review-2026-10-07` bis `review-2026-10-08`:

    git log --oneline review-2026-10-07..review-2026-10-08
    git diff review-2026-10-07..review-2026-10-08 -- . \
      ':!docs/REVIEW-2026-10-06.md' ':!docs/REVIEW-2026-10-07-auftrag.md'

Ausgenommen sind das Review-Dokument der Vorrunde (`c5506cb`) und diese Auftragsdatei.

**Die Zahlen**, gezählt mit `git diff --shortstat`, bevor der Commit existiert, der diese Datei
trägt:

    # Schicht 1, review-2026-10-07..2967cd8, ohne Review-Dokument: 14 Dateien, +425 / −143
    #   davon electron/, src/, shared/:                             9 Dateien, +303 / −129
    # Schicht 2, 2967cd8..main:                                    47 Dateien, +3919 / −1010
    #   davon electron/, src/, shared/, scripts/:                  37 Dateien, +1825 / −796
    #   dazu src/data/googleFonts.ts (erzeugte Liste):              1 Datei,  +1957 / −83

Die erzeugte Namensliste ist der größte Einzelposten und der uninteressanteste; das Skript
daneben (`scripts/fetch-google-fonts.mjs`, 61 Zeilen) ist das, was sie schreibt.

### Schicht 1 — die zweiunddreißigste Runde, abgearbeitet (21 Commits)

| Woher | Commit | Worum es geht | gemessen an |
| --- | --- | --- | --- |
| — | `c5506cb` | das Review-Dokument selbst (ausgenommen) | |
| Befund 1 | `f3ab898` | **`stagedOutsideMerge` fragt drei Punkte statt zwei** — vorher stand in „was der Merge anfasst“ alles, worin Projekt und Upstream sich unterscheiden | Bündel, echtes git |
| Befund 2 | `01f19e8` | die Liste der Verweigerung geteilt: eigene vorgemerkte Dateien mit `git reset --`, gelöschte nicht mehr genannt | Bündel, der neue Rat befolgt |
| Befund 3 | `02d1404` | `NumberInput` hält den Entwurf und wendet nur ganze Zahlen an | gebaute App, echte Tastendrücke |
| Befund 4 | `36efbb1` | der Satz sagt, wo ein Bereich außerhalb des Rasters landet | gebaute App |
| Befund 5 | `f00bbf2` | der Stash-Satz fragt die Schnittmenge der beiden Einträge | beide Szenen des Reviews |
| Befund 6 | `81f8005` | Kommentar und Nachtrag zu `gitTextEnv()` | — (glibc bleibt offen) |
| Nebenbei | `e727c0d` | **die Notiz vor einem Abbruch fragt gits Regel**; ein Eintrag, dessen Pop scheitern wird, bekommt einen eigenen Satz | Bündel mit neuem Upstream-Stand |
| Nebenbei | `93facf8`, `c0dcdda`, `f208f94`, `ae59787`, `9812a84`, `e2e75b1` | `-z` in der Konfliktliste, `NumberInput` in Zeilen-/Spaltenfeld, vier Sätze | Bündel bzw. gebaute App |
| Nebenbei | `fe30ca4` | **eigene vorgemerkte Zeilen *auf* einer Merge-Datei über `git merge-tree --write-tree`** | git ≥ 2.38; ein älteres **nicht** gemessen |
| Nebenbei | `1b491b6`, `96ab045` | Instanz-Nummern in den Drag-Ansagen; **kein schräger Pfeilschritt mehr auf dem Layout-Board** | elf Szenen, 1280 und 1470 px |
| dabei gefunden | `8923e78`, `96d3fa7` | Branch-Vorschau mit `-z`/`--no-renames`; `NumberInput` kappt auf `max` | Adapter als Bündel; gebaute App |
| — | `65a7f7d`, `195901c`, `2967cd8` | Chronik und Stand | |

### Schicht 2 — Schriften, Handbuch, Website (12 Commits)

| Commit | Worum es geht | gemessen an |
| --- | --- | --- |
| `3e414ba` | **`Combobox` in `ui.tsx`**, alle 1946 Google-Familien aus `src/data/googleFonts.ts` statt einer `<datalist>` mit 78 Namen, deren Popup sich in dieser App nicht rollen ließ | gebaute App auf einer `gui-test`-Kopie |
| `c155074` | **Vorschau liest, was der Build heruntergeladen hat**; neuer Kanal `styles:previewFonts` (Main liest die Dateien, Renderer baut `new FontFace()`) | gebaute App, drei Szenen |
| `8ea7c35` | **ungenutzte importierte Schriften werden benannt und auf Nachfrage entfernt** (`fonts:unusedImported`, `fonts:removeImported`) | gebaute App, `custom.scss` byte-verglichen |
| `04961dd` | **Rückbau: das Handbuch reist nicht mehr mit** — `handbookServer.ts`, der Dialog, `extraResources` und der `beforePack`-Schritt sind weg, die App öffnet die Website | 36 Pfade 200 am 2026-09-18; gebaute App mit abgefangenem `openExternal` |
| `abd6786` | nur `docs/handbuch.md` | — |
| `f8441a1` | **der Reiter „Website“ als fünf Karten** (239 Zeilen in `SiteSettings.tsx`) | **nur 1728×1000, nur helles Schema** |
| `bc296be` | Kommentare werden vor der Suche nach „nennt jemand diese Familie?“ entfernt | Bündel gegen echte Projekte, lesend |
| `d4da5ef` | die Beispielvorlage überschreibt die fünf Schrift-Variablen nicht mehr | Quartz' `joinStyles()` gelesen; **nicht ausgerollt** |
| `1df4ee4` | **`url("static/fonts/…")` statt `/static/…`** — jede Website unter einem Unterpfad verlor ihre importierten Schriften; `migrateOnWrite` zieht den Block bei **jedem** Schreiben nach | gebaute Website unter `/QuartzControl/`, Chrome |
| `2c5a9b7` | **„lokal ausliefern“ heißt jetzt: die App holt die Google-Schriften ins Projekt**, eigener Block `google-fonts`, `fontOrigin: local`; geholt beim Speichern **und vor jedem Build und Serverstart** | echtes Netz, 29 Dateien; gebaute App; Build in Chrome |
| `e0f9107` | **`save()` der Stile-Seite schreibt alle Reiter**, nicht nur den vorderen, in fester Reihenfolge | gebaute App, drei Fälle |
| `a6db528` | das Speichern sagt, welche Google-Familien es aus dem Projekt entfernt hat | gebaute App; Main-Hälfte als Bündel |

Steht in `git log` etwas anderes als hier, gilt `git log`.

**Im Handbuch-Vault liegt aus dieser Runde nichts Neues** — und das ist diesmal selbst ein Punkt:
Kapitel 4.5 beschreibt die Schriften, und die Seite sieht jetzt anders aus (Combobox statt Feld,
eine Karte „nicht mehr verwendet“, ein anderer Sinn von „lokal ausliefern“). `check:handbook`
prüft nur Blockzitate und ist grün; alles außerhalb eines Zitats sieht es nicht. Der Vault ist
`~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`. **Lies dort, schreib dort nichts.**

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung. Miss an Kopien. **Und sei mit dieser Runde besonders vorsichtig:** Der
neue Code *löscht Dateien* unter `quartz/static/fonts` und schreibt in `custom.scss`. Ein Aufruf
gegen ein echtes Projekt ist kein Lesevorgang.

## Was du wissen musst, bevor du liest

**Lies Commit-Nachrichten als Behauptungen.** Die Zahlen darin sind gezählt, aber vom Modell, das
sie schreibt.

**Der Stand der Prüfskripte, heute auf `a6db528` gemessen:** `typecheck`, `build` und `smoke`
(40 Aufrufe, keine Auffälligkeiten) grün; `check:i18n` 1176 Schlüssel im Renderer, 194 im
Hauptprozess, 67 nicht prüfbar, keine fehlenden; `check:semver` 18; `check:plugin-names` 18 (ohne
Projektpfad, also ohne Gegenprobe gegen Quartz' eigene Funktion); `check:core-update` 14 Pläne,
3 npm-Aufrufe, 5 Statuslisten; `check:handbook` 26 Zitate. **Nicht gelaufen:**
`npm run check:runtime`, `npm run check:tokens`, `npm run template:example -- --check-sync` und
`npm run dist`.

**Das Geschirr des Funktionsdurchgangs liegt in zwei Scratchpads** (sofern noch da, nichts davon
im Repo):
`/private/tmp/claude-501/-Users-boxi-Development-QuartzControl/a339f525-26de-44a2-9416-72ef71c6d3d3/scratchpad`
(`fonts-check.mjs`, `run-font.cjs`, `qtheme.mts` — Quartz' eigenes `theme.ts` als Vergleich —,
`build.mjs`, `tpl.mjs`/`tpl.qtpl`, mehrere Projektkopien `gt`…`gt5`, Profile `prof*`) und
`…/bc6e0d8e-678d-4e2b-b522-594a03b03129/scratchpad` (`lib.mjs`, `m1`–`m3.mjs`, Bilder, eine
`gui-test`-Kopie, `custom.scss.vorher`). Für Schicht 1: `…/7952a259-…` (darin `gitde`/`gitsrc`,
das aus der Quelle gebaute git mit Übersetzungen) und `…/441f91fb-…`.

**Messfallen, die in dieser Serie schon zweimal zugeschlagen haben** (die Liste der Vorrunde gilt
weiter): `set -- $var` teilt in zsh nicht, Optionen nie über eine Variable geben; die Region von
`announce()` steht selbst im Dokument, also frag, ob ein Satz **im Fenster** steht; am Layout-Board
verschiebt eine Szene, die ein Duplikat entfernt, jeden folgenden Griff-Index.
**Neu dazu:** Ein Projekt, das schon einen `google-fonts`-Block hat, antwortet auf `fetchGoogleFonts`
mit `changed: false` — wer die Abkürzung nicht ausschaltet, misst nichts.

**Ein Fenster wird auf diesem Bildschirm nicht breiter als 1470 px** und nicht höher als 923 px.

## Abwägungen im Code, die niemand gegengelesen hat

- **Ein Build hängt jetzt am Netz.** `refreshGoogleFonts()` läuft in `buildService` vor jedem Build
  und jedem Serverstart, neben `writeAllFrames()`. Die Abkürzung (gleiche Anfrage in der ersten
  Zeile des Blocks **und** alle Dateien da) soll den Normalfall kostenlos machen; greift sie nicht,
  stehen 20 s Frist für die CSS-Anfrage und 20 s je Datei davor, nacheinander. **Zu prüfen:** was
  ein Build ohne Netz oder hinter einem Proxy wirklich kostet; ob die Abkürzung greift, wenn der
  Nutzer im Block eine Zeile ändert; ob `allFilesPresent` über `existsSync` das Richtige fragt
  (die Regel dieses Projekts lautet „die Datei ist da“ ist nicht „die Datei lässt sich lesen“);
  und ob der Nutzer irgendwo erfährt, dass ein Build ins Netz geht.
- **Googles Antwort geht wörtlich in die Datei des Nutzers.** Der Body des Blocks ist Googles CSS
  mit ersetzten URLs, die erste Zeile ein Kommentar mit der Anfrage, den `requestOf()` wieder
  liest. **Zu prüfen:** was ein `*/` oder ein `#{` in der Antwort mit dem Block und mit Sass macht;
  was passiert, wenn Google eine Fehlerseite mit Status 200 schickt; ob `FONT_FILE_NAME` alles
  abfängt, was als Dateiname aus einer URL kommt (Pfadtrennung, Prozentkodierung); und ob der
  Block einen Bau überlebt, der `custom.scss` von woanders beschreibt (Vorlagen-Import, Restore).
- **Eine Grenze je Datei, keine über alles.** `downloadFontFile` prüft `content-length` und die
  Bytes gegen `MAX_FONT_FILE_BYTES`; wie viele Dateien Googles CSS nennt, prüft niemand (gemessen:
  29). Die Vorschau hat eine Decke (32 MiB), der Download nicht — die Konvention verlangt eine,
  „und die Datei selbst liefert sie nicht“.
- **`migrateOnWrite` fasst bei jedem Schreiben von `custom.scss` den ganzen `fonts`-Block an**
  (`1df4ee4`), nicht nur den Abschnitt, um den es gerade geht — dieselbe Bewegung wie die
  Marker-Umbenennung, aus demselben Grund, aber ohne Rückfrage und in einer Datei, die dem Nutzer
  gehört. `relativeFontUrls` ersetzt jedes `/static/fonts/` **im Block**. **Zu prüfen:** ein
  absichtlich absoluter Pfad; ein Block, in dem der Nutzer eigene Regeln stehen hat; und der Preis
  jenseits der Versionsgrenze — beta.2 kennt den Block `google-fonts` nicht, und was sie mit einem
  Projekt macht, das ihn hat (plus `fontOrigin: local`), steht nirgends. Für den Marker gibt es
  dazu einen Absatz in `conventions.md` und einen Punkt in `docs/release.md`; für den neuen Block
  gibt es beides nicht.
- **`save()` schreibt jetzt alles in einer festen Reihenfolge** (`e0f9107`): `custom.scss` ganz,
  dann die übrigen Stylesheets, dann Config, dann Variablen — die letzten zwei ersetzen je einen
  Block, in der anderen Reihenfolge schriebe der Entwurf den alten wieder hin. **Zu prüfen:** was
  ein Fehler in der Mitte hinterlässt (halb geschrieben, `dirty` halb zurückgesetzt, der
  Verlassen-Dialog hat dann „Speichern“ gesagt und `true` bekommen); ob jeder Snapshot nach seinem
  eigenen Schreiben genommen wird; und der Fall, den die Nachricht selbst als „gelesen, nicht
  gemessen“ nennt (ein Entwurf in einem weiteren Stylesheet, gespeichert aus einem anderen Reiter).
- **Die Combobox ist ein neues Primitive** mit eigenem Tastaturvertrag (`aria-activedescendant`,
  Pfeile, Enter, Escape, Präfixtreffer zuerst) und 1946 Optionen. **Zu prüfen:** ob wirklich alle
  gerendert werden und was das kostet; Escape, Blur und Klick daneben; der Vertrag gegen das, was
  `SegmentedControl` und `Toggle` in diesem Projekt vormachen (`label` ist dort Pflicht); dunkles
  Schema; schmales Fenster; und ob ein Name, den Google nicht führt, so erklärt wird, dass der
  Nutzer weiß, was zu tun ist.
- **Der Handbuch-Rückbau ist eine Entfernung ohne Ersatz** (`04961dd`): Wer offline arbeitet, hat
  kein Handbuch mehr. Die Entscheidung ist gefallen und steht in `CLAUDE.md`; **ob sie vor einem RC
  trägt, ist eine Frage an dich** — zusammen mit der, ob nach der Entfernung noch etwas
  zurückgeblieben ist (Schlüssel, Einstellungen, `resources/handbook` als Quelle des PDF, der
  `beforePack`, den kein `npm run dist` seither ausgeführt hat).
- **`d4da5ef` ist nicht ausgerollt.** Die Vorlage im Repo weicht seitdem von der veröffentlichten
  und von den drei Kopien ab; `npm run template:example -- --check-sync` ist der Aufruf, der das
  misst, und er ist nicht gelaufen.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Der Weg, der Dateien schreibt und löscht (`fontService.ts`)

`fetchGoogleFonts`, `dropGoogleFonts`, `removeImportedFont` und das gemeinsame
`deleteUnreferencedFontFiles` sind der erste Code dieser App, der aus dem Netz in ein Projekt
schreibt und dort löscht. Gelöscht wird, was „keine Regel mehr nennt“ — geprüft über
`parseFontFaces` aller Stylesheets, also über eine Regex. Eine Datei, die ein Plugin, eine
Vorlage, ein `@use`-Import oder eine Regel mit ungewöhnlicher Schreibweise nennt, fällt aus dieser
Antwort heraus. Zwei Fragen: Kann eine Datei gelöscht werden, die noch gebraucht wird? Und gilt
die Kette auch, wenn `custom.scss` zwischen Lesen und Schreiben von jemand anderem geändert wurde
(die Downloads dauern; der Code liest danach neu)?

### 2. Was der Nutzer verlieren kann

Drei Stellen fassen `custom.scss` an, ohne zu fragen: `migrateOnWrite`, das neue `save()` und jeder
`fetchGoogleFonts`. Die Regel des elften Reviews — „das registrierte Speichern schreibt alles, was
`dirty` zählt“ — ist mit `e0f9107` eine Ebene höher gezogen worden; prüf, ob sie jetzt stimmt und
was ein Teilfehler hinterlässt.

### 3. Die Sätze (39 neue oder geänderte Schlüssel je Sprache, dazu 23 Zeilen im Hauptprozess)

Die Regeln stehen in `conventions.md`: höchstens zwei Sätze, ganze Sätze mit Subjekt für
`announce()`, ein Wort — ein Name, und ein Begriff aus der Maschinenwelt nur, wo er zum
Entscheiden gebraucht wird. „lokal ausliefern“ heißt seit `2c5a9b7` etwas anderes als vorher,
und das Handbuch sagt noch das Alte.

### 4. Schicht 1, besonders `fe30ca4` und `f3ab898`

Beide fassen `updateService` an, den Teil der App, an dem diese Serie am längsten gearbeitet hat.
`fe30ca4` setzt `git merge-tree --write-tree` voraus (git ≥ 2.38); das mitgelieferte git ist 2.53,
das des Rechners kann älter sein — was dann passiert, ist nicht gemessen.

### 5. Der Reiter „Website“ (`f8441a1`)

239 geänderte Zeilen, angesehen bei einer Breite und in einem Schema.

## Wie gemessen werden kann

- **Die gebaute App nicht-interaktiv**: eigenes Playwright-Skript, `--user-data-dir=<wegwerf>`,
  `page.emulateMedia({ colorScheme: null })`, Projekt über `window.quartzGui.projects.add`,
  Ansagen über einen `MutationObserver` auf `[id^="DndLiveRegion"]` und `[role="status"]`.
- **Der Dienst ohne App**: esbuild-Bündel (`--bundle --platform=node --format=cjs
  --external:electron --alias:@shared=./shared --tsconfig=tsconfig.node.json`), `electron` über
  einen Stub. Vorher-Bündel über `git archive review-2026-10-07`.
- **Google ohne Google**: `globalThis.fetch` im Bündel ersetzen und eine CSS-Antwort selbst
  schreiben — das ist der Weg zu allem, was diese Runde *nicht* gemessen hat (Fehlerseite mit 200,
  `*/` im Body, riesige `content-length`, hundert Dateien, Zeitüberschreitung). Mit echtem Netz
  gemessen wurde nur der gute Fall.
- **Eine gebaute Website ansehen**: `npx quartz build` in einer Projektkopie, `python3 -m
  http.server`, Chrome über Playwright — so ist `1df4ee4` gemessen (Unterpfad, drei Ebenen tief).
- **Ein Projekt zum Anfassen**: `cp -Rc` von `~/Documents/QuartzProjekte/gui-test` oder
  `navigations-testprojekt` in den Scratchpad. In der Kopie unter `content/` nichts schreiben.
- **git allein** für alles, was gits Regel ist; ein Wegwerf-Repo mit halbem Merge ist in zehn
  Zeilen gebaut.

## Was offen bleibt, und nicht für diese Runde

Die Liste vor dem RC ist keine Code-Frage und bleibt beim Nutzer: VoiceOver über Git-Sync, die
beiden Boards und jetzt auch die Combobox, ein echter Push, ERESOLVE, die VMs (darunter die
Messung zu `gitTextEnv()` an einem übersetzten git), die gepackte App je Plattform — **die seit
dem Handbuch-Rückbau niemand gebaut hat** —, das Handbuch samt PDF neu bauen (4.5 ist jetzt
inhaltlich veraltet, nicht nur ungebaut), die Vorlage ausrollen (`d4da5ef`, Phase 7, Export, die
drei Kopien), `Quartz-GUI:syntax:` umbenennen, und die Release-Notizen um den neuen Block
`google-fonts` ergänzen (`docs/release.md`, Punkt 7). Die zweite Hälfte von Punkt 3 der dreißigsten
Runde ist weiter nicht angefasst, die Richtungen von sechs Runden zuvor
(`--diff-merges=first-parent`, `node_modules/.package-lock.json`) ebenfalls nicht.

## Eine Frage über den Code hinaus

Wie letztes Mal: Wenn dir etwas begegnet, das gegen einen RC aus *diesem* Stand spricht, gehört es
in einen eigenen Abschnitt am Ende deines Dokuments, getrennt von den Befunden. Ein Satz genügt,
wenn nichts dagegen spricht. **Und eine zweite, die diese Runde stellt:** Die Serie hat
zweiunddreißigmal Fixes gelesen und findet seit fünf Runden nichts über Niedrig. Diesmal liegt
eine neue Funktion davor, die noch niemand außer ihrem Autor benutzt hat. Sag, ob ein Review dafür
das richtige Werkzeug ist — oder ob der nächste Erkenntnisgewinn woanders liegt, etwa bei einem
Alpha-Test der Schriften-Seite an echten Projekten.

## Form der Befunde

Wie gehabt: je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was
schiefgeht, wie es sich zeigt und was dagegen spräche, es so zu lassen. Schreib das Ergebnis nach
`docs/REVIEW-2026-10-07.md`. Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund
wie jeder andere — und wenn ein Befund des zweiunddreißigsten Reviews nicht trug oder seine
Richtung falsch war, auch.
