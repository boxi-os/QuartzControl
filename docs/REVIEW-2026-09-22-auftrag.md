Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist. Es geht um ein
Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Was diese Runde anders macht

**Zum ersten Mal in dieser Serie liest du eine Runde, die gepusht ist.** Die sechzehn Vorgänger
lagen auf lokalen Branches; dieser Stand ist `main` auf `github.com/boxi-os/QuartzControl`, und
zwei Commits liegen im öffentlichen Handbuch-Repo. Was du findest, steht damit schon draußen — das
ändert nichts an der Arbeit, aber es ändert, was ein Befund kostet.

**Und du liest eine Runde, die zweimal die eigene Vermutung widerlegt hat.** Zwei Punkte, die als
Fix begonnen wurden, endeten als Kommentar: ein Layoutfehler, dessen naheliegende Behebung den
Tastatur-Drag zerbricht (`f9e5a44`), und eine Bedingung, die einen wahren Satz zurückzuhalten
schien und deren Lockerung nachweislich nichts bewirkt (`9f76289`). Beide Male steht jetzt im Code
oder in `docs/decisions/`, *warum es so bleibt*. Prüf das zuerst: Eine Begründung, die nicht trägt,
ist schlimmer als ein offener Punkt, weil sie die Frage schließt.

**Ein `git stash --index` und eine neue Abkürzung im Core-Update.** Beide fassen den Stash an, den
der Vorgänger eingeführt hat, und die Abkürzung entscheidet an HEAD, ob ein Lauf überhaupt etwas
getan hat.

In der Zählung von `CLAUDE.md` ist das das achtzehnte Review. Die Dateinamen zählen nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis; die Messungen hinter den Regeln stehen in `docs/decisions/`. Lies dann
`docs/REVIEW-2026-09-21.md` — die acht Befunde, deren Fixes du liest, samt den Messungen, die sie
belegen, und seine Liste „Nebenbei aufgefallen“, aus der die fünf Commits danach stammen. Der
Auftrag dazu steht in `docs/REVIEW-2026-09-21-auftrag.md`.

## Umfang

`main`, **gepusht**. Die achtzehn Commits zwischen `review-2026-09-22` und `review-2026-09-23`:

    git log --oneline review-2026-09-22..review-2026-09-23
    git diff review-2026-09-22..review-2026-09-23 -- . \
      ':!docs/REVIEW-2026-09-21.md' ':!docs/REVIEW-2026-09-22-auftrag.md'
    # 13 Dateien, +474 / −53
    # davon App-Code (electron/, src/):        4 Dateien, +226 / −34
    # davon Skripte:                           3 Dateien, +70 / −5
    # davon docs/decisions/:                   4 Dateien, +86 / −1
    # davon CLAUDE.md:                         1 Datei,   +83 / −10

Ausgenommen sind zwei Dateien: `docs/REVIEW-2026-09-21.md` (das Review, das du liest, statt es zu
prüfen) und diese Auftragsdatei. Ohne die zweite Ausnahme sind es 14 Dateien und +705, und die
Differenz von 231 Zeilen ist dieser Text — die Zahlen oben messen also die Arbeit, nicht ihre
Beschreibung. Lies den Auftrag trotzdem als Behauptung wie jede andere.

**Einen Hash für den Commit, der diese Datei trägt, nennt sie nicht** — er kann nicht in sich
selbst stehen, und der Versuch war Befund 6 des sechzehnten Reviews.
`git rev-parse review-2026-09-23^{commit}` beantwortet die Frage genauer. Aus demselben Grund
standen die Zahlen oben beim ersten Schreiben falsch: Sie zählten den eigenen Commit nicht mit, und
das fiel erst beim Nachrechnen nach dem Commit auf.

`review-2026-09-22` sitzt auf `4d2b50d` („Der Auftrag für das siebzehnte Review“), dem Stand, den
das letzte Review gelesen hat. Die Commits:

| Befund | Commit | Worum es geht |
| --- | --- | --- |
| 1 | `171c63d` | **der Stash trägt den gemergten Commit; `abortCoreMerge` liest `MERGE_HEAD` vorher** |
| 2 | `cb8cedd` | **Besitz am Ref statt am Exit-Code; `stagedApartFromWorkingTree()`** |
| 5 | `359c24f` | `startedAt` entsteht im Spawn |
| 6 | `fae8d7a` | „Stoppen“ auf der Übersicht ab `starting`; drei Aufrufe ohne `withBusy` |
| 7 | `47892c2` | `not uptodate` in `explainGitFailure`; `committed.output` im `!committed`-Zweig |
| 3 | `299c592` | sieben Absätze in `docs/decisions/` für Regeln, die dorthin verwiesen |
| 4 | `7c182f3` | `brew.sh:183` gilt nur für root |
| 8 | `fdc11cd` | vier Sätze korrigiert; `pdfPageCount()` im PDF-Skript |
| — | `12b13b7` | `CLAUDE.md`: Zählung, Absatz zur Runde, was sie hinterlässt |
| — | `46e2daa`, `140b1ae` | die zwei Vault-Commits in die Liste, dann mit neuen Hashes |
| N | `f9e5a44` | **der Layout-Überlauf bleibt — Absatz plus Kommentar in `smoke.mjs`** |
| N | `a9d3a82` | drei Fälle mehr in `check:core-update` (11 → 14) |
| N | `254307d` | `git stash pop --index` an beiden Pop-Stellen |
| N | `8f0ca8d` | **„Already up to date“ überspringt `npm install` und Aufwärm-Build** |
| N | `9f76289` | `planApplies` am `upstreamWins`-Satz: nur ein Kommentar |
| — | `d487fb4` | `CLAUDE.md` nennt die fünf |
| — | — | dieser Auftrag |

„N“ heißt: aus der Liste „Nebenbei aufgefallen“ des Reviews, nicht aus seinen Befunden.

**Im Handbuch-Vault** (`~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`, ein eigenes git-Repo,
nicht Teil dieses Repos, ebenfalls gepusht) liegen zwei Commits:

    git -C ~/Obsidian/QuartzProjekte/QuartzControl-Handbuch log a07ddcf..main

`b53a6c1` ist das umgeschriebene `b61a08d` des Vorgängers — **gleicher Baum, neue
Commit-Nachricht**, weil die alte die Zeilennummer trug, die Befund 4 widerlegt hat. Der Reword
geschah vor dem Push. `5d3af49` ergänzt 8.5 in beiden Sprachen. Prüf beide mit; sie behaupten
Zahlen wie jeder andere Commit.

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung — siehe „Wie gemessen werden kann“, bevor du eine Kopie anfasst.

## Was du wissen musst, bevor du liest

**Alle achtzehn Commits stammen von demselben Modell, das diesen Auftrag schreibt**, aus einer
Sitzung; das Review-Dokument `docs/REVIEW-2026-09-21.md` aus einer anderen. Lies Commit-Nachrichten
als Behauptungen. In diesem Projekt gilt eine Zahl in einer Commit-Nachricht als Messung; trägt sie
nicht, ist das ein Befund.

**Abwägungen, die ich selbst getroffen habe — prüf, ob sie tragen:**

- Der Stash heißt jetzt `QuartzControl: core update <sha>`. Das ist **eine Formatänderung an einem
  Bezeichner auf fremder Platte**: Ein Stash, den eine ältere Fassung geschrieben hat, wird von
  `abortCoreMerge` nicht mehr gepoppt — er bleibt liegen und wird genannt. Ich halte das für
  richtig (ein Pop gegen den falschen HEAD war Befund 1), aber es ist kein reiner Fix.
- `stagedApartFromWorkingTree()` ist **über den Vorschlag des Reviews hinaus**. Der Vorschlag
  allein (Besitz am Ref) hätte den gestageten Eintrag endgültig gelöscht statt ihn im
  liegengebliebenen Stash zu lassen. Der Wächter schaltet den Plan in einem Fall ab, den vorher
  niemand ausgenommen hat.
- Die Übersicht ruft `server.start/stop/restart` **nicht mehr unter `withBusy`**. Damit fällt der
  einzige Schutz gegen schnelle Doppelklicks dort weg; er liegt jetzt ausschließlich im
  Hauptprozess (`pendingStarts`, `runningServers`).
- Der Layout-Überlauf bleibt, **und `smoke` meldet ihn weiter**. Ich habe die Ausnahme bewusst
  nicht eingebaut, weil sie auch neue Überläufe verdecken würde. Der Preis ist eine Meldung bei
  jedem Lauf, die jemand künftig für Rauschen halten könnte.
- „Already up to date“ **poppt den Stash statt ihn zu droppen** und überspringt `npm install` und
  den Aufwärm-Build. Die Entscheidung hängt an `git rev-parse HEAD` vor und nach dem Merge.
- Der dritte neue Fall in `check:core-update` hält eine **Entscheidung** fest, keine Korrektheit:
  Streicht Quartz ein Paket, das das Projekt umgepinnt hat, kommt es zurück.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Der Stash, zum zweiten Mal (`171c63d`, `cb8cedd`, `254307d`, `8f0ca8d`)

Vier Commits fassen denselben Stash an, und der Vorgänger hat ihn erst eingeführt.

- **Die SHA-Bindung.** `popCoreUpdateStash` vergleicht den Betreff von `refs/stash` gegen
  `QuartzControl: core update <MERGE_HEAD>`. Was passiert bei einem Octopus-Merge, bei einem
  `MERGE_HEAD` mit mehreren Zeilen, bei einem Repo, in dem `refs/stash` existiert, aber
  `git log -1 refs/stash` scheitert? Der leere `mergeCommit` ist abgefangen — reicht das?
- **`hasCoreUpdateStash()` liest `git stash list --format=%s` und sucht den Namen als Teilstring.**
  Ein Stash des Nutzers, der zufällig so heißt, löst den Hinweis aus. Wie schlimm ist das, und gibt
  es einen Weg, bei dem der Hinweis *fehlt*, obwohl ein Stash der App liegt?
- **`stagedApartFromWorkingTree()`** schaltet den Plan ab, wenn eine Datei auf drei Ständen steht.
  Prüf die zwei `git diff`-Aufrufe: Treffen sie wirklich „Index ≠ HEAD **und** Arbeitsbereich ≠
  Index“, und nicht mehr? Was ist mit einer gestageten *Hinzunahme*, einer gestageten *Entfernung*,
  einem Modus-Wechsel? Der Fehlerfall gibt `true` zurück (Finger weg) — richtig herum?
- **`pop --index` mit einfachem Pop als Rückfall.** Die Commit-Nachricht behauptet, ein
  gescheitertes `--index` fasse nichts an. Stimmt das für *jede* Art zu scheitern, oder nur für die
  gemessene (Arbeitsbereich im Weg)? Ein teilweise angewendeter Stash mit Konflikt wäre der
  interessante Fall.
- **Die Abkürzung bei gleichem HEAD.** Sie kehrt mit `success: true` zurück, ohne `npm install` und
  ohne Aufwärm-Build. Gibt es einen Zustand, in dem HEAD gleich bleibt und trotzdem etwas zu tun
  wäre? Ein Merge, der nichts holt, aber der Arbeitsbereich steht seit einem früheren Abbruch
  schief. Und: Der Rückgabewert enthält `mergeOutput` — ist das derselbe Text, den der Nutzer
  vorher sah?

### 2. Der Layout-Befund, der keiner sein soll (`f9e5a44`)

Der Absatz in `docs/decisions/layout-frames.md` behauptet vier Dinge, und jedes ist prüfbar: dass
die 1048 px aus sechs Spalten plus elf Lücken kommen; dass `min-width: 0` und `overflow-wrap`
nichts ändern; dass `overflow-x: auto` am Wrapper den Überlauf beseitigt; und dass derselbe Roller
dem Tastatur-Drag die Bewegung nimmt. Die letzte ist die wichtigste — **sie ist der Grund, warum
nichts geändert wurde.** Wenn sie nicht trägt (etwa weil der Roller an einer anderen Stelle sitzen
könnte, oder weil `@dnd-kit`s `autoScroll`-Option das löst), ist ein Layoutfehler unnötig
stehengeblieben. Der Absatz nennt zwei Auswege und hält beide für teurer als den Befund; prüf das.

### 3. Zwei Fixes am Serverstart (`359c24f`, `fae8d7a`)

`startedAt` wird jetzt in `spawnServer` neu gesetzt. Wer liest es sonst noch —
`runningServersStore`, `serverDiscovery`, der Beenden-Dialog? Der Commit behauptet, die Seiten
zeigten die Zeit nur bei `running`; stimmt das für beide Seiten und für jeden Zustand dazwischen?

Auf der Übersicht steht „Stoppen“ jetzt ab `starting`, und `withBusy` ist weg. Zwei Fragen: Was
passiert bei zwei schnellen Klicks auf „Stoppen“ während des Wartens? Und mit dem `withBusy` sind
`'server'` aus `BusyKind` und die Hilfsvariable `serverTransitioning` weggefallen — ist damit
nichts zurückgeblieben, das auf sie zeigt, und verliert keine andere Stelle ihren Busy-Schutz?

### 4. Die Dokumente (`299c592`, `7c182f3`, `fdc11cd`, `12b13b7`, `d487fb4`, `a9d3a82`)

Sieben neue Absätze in `docs/decisions/` und ein umgeschriebener. Sie sind nachträglich geschrieben,
also aus der Erinnerung an Messungen, die in Commit-Nachrichten und im Review stehen. **Stimmen die
Zahlen mit den Quellen überein, aus denen sie kommen?** Besonders: die Zeitreihe in
`navigation-and-pages.md` (aus dem Vorgänger übernommen), die vier Ausgänge des Stashes, die
Homebrew-Zeilen 109–112/157/183/615 gegen `/opt/homebrew/Library/Homebrew/brew.sh`.

`check:core-update` hat drei Fälle mehr. Die erwarteten Werte wurden laut Commit von der Funktion
selbst abgefragt — prüf sie gegen `shared/packageJsonDeps.ts`, nicht gegen den Kommentar daneben.

### 5. Was die Prüfskripte nicht sehen

`typecheck`, `build`, `smoke`, `check:core-update` (14 Fälle), `check:i18n`, `check:semver` und
`check:handbook` sind auf diesem Stand grün; `smoke` meldet die eine bekannte Zeile
`[1280x800] Layout · layout: Inhalt scrollt horizontal` (siehe Punkt 2). `check:plugin-names` lief
ohne Projektpfad, also ohne Gegenprobe gegen Quartz' eigene Funktion. Keines dieser Skripte sieht
den Stash, den wartenden Start, das Verhalten bei einem Merge-Konflikt oder die Knöpfe der
Übersicht. Was misst du, das sie nicht messen?

## Wie gemessen werden kann

- **Der Dienst ohne App**: esbuild-Bündel von `updateService.ts` (`--bundle --platform=node
  --format=cjs --tsconfig=tsconfig.node.json`, `electron` über `--alias:electron` auf einen Stub mit
  `app.getPath`). Gegenseite ist ein lokales Repo mit mehreren Ständen — diese Runde hat fünf
  benutzt: Basis `A`; `B` (Pakete, Lockfile, Config, README gehoben); `B2` (nur README, von `A`
  abzweigend); `C` (auf `B`, Config und README noch einmal); `D` (auf `A`, **nur** die zwei
  Paketdateien). Den gewünschten Stand stellt man mit `git -C <upstream> checkout --detach <sha>`
  ein, dann antwortet `git fetch quartz-upstream HEAD` ohne Netz.
- **npm und npx als Attrappen auf dem PATH**: ein `npm`, das `install [--save-*] name@range` in den
  passenden Abschnitt schreibt und ein Lockfile mit Marker hinterlässt, und ein `npx`, das 0
  antwortet — für `8f0ca8d` mit einem Aufrufzähler, sonst sieht man den gesparten Aufwärm-Build
  nicht. Damit ist der Zustand von Dateien, Index, Stash und Repo gemessen, **nicht**, was echtes
  npm tut.
- **Die Szenen dieser Runde**, je ein frischer Klon: `s2b` (der veraltete Stash über drei Läufe),
  `s5` (Index ≠ Arbeitsbereich), `s4` (Abbruch, den git verweigert), `s13` (`pre-commit`-Hook mit
  `exit 1`), `s1`/`s8`/`s11`/`s14` als Gegenprobe der vier Stash-Ausgänge. Wo es um eine Regression
  geht, alt gegen neu (`git worktree add <pfad> review-2026-09-22`, `node_modules` als Symlink).
- **git allein**, ohne Bündel: `git stash push -m … -- package.json package-lock.json` in vier
  Ausgangslagen, und `git stash pop` mit und ohne `--index` bei gestagetem und ungestagetem Stand.
- **Die gebaute App**: `npm run build`, dann eine Kopie von `.claude/skills/run-desktop/driver.mjs`
  mit `--user-data-dir` auf ein Wegwerf-Verzeichnis. Die Kopie muss **im Repo** liegen, sonst findet
  node `playwright-core` nicht. Projekt per `window.quartzGui.projects.add` eintragen, alles Weitere
  über `evalfile`; `capture-pane -p | grep .`, sonst kommen leere Zeilen. Für den Tastatur-Drag:
  erst per `evalfile` fokussieren (`el.focus()`, `document.activeElement` gegenprüfen), dann `press
  Space` / `press ArrowDown` / `press Escape`, Zustand über `[role="status"]`.
  `navigations-testprojekt` hat ein echtes `content/`-Verzeichnis und ist die Kopiervorlage; Server
  auf 8099/3099.
- **Nicht gemessen** und deshalb offen für dich: die **gepackte** App; ein echtes `npm install`;
  ein `git stash pop --index`, der auf einen *Konflikt* läuft (nur der Fall „Arbeitsbereich im Weg“
  ist gemessen); zwei Fenster derselben App; die VMs und die Linux-Pakete; ob der Layout-Überlauf
  auch bei anderen Frame-Geometrien auftritt; und ob die Zahlen des PDF-Skripts auf einem Handbuch
  stimmen, das nicht das dieses Rechners ist.

## Form der Befunde

Wie gehabt: je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was
schiefgeht, wie es sich zeigt und was dagegen spräche, es so zu lassen. Schreib das Ergebnis nach
`docs/REVIEW-2026-09-22.md`. Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund
wie jeder andere.
