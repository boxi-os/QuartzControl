Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist. Es geht um ein
Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Was diese Runde anders macht

**Du liest eine Runde, die nichts Neues gebaut hat, sondern zwei frische Fixes nachgeschärft hat —
und dabei beide umgeschrieben.** Das letzte Review (`docs/REVIEW-2026-09-20.md`) fand zwei Befunde
der Stufe Mittel, und beide saßen in genau den zwei Änderungen, die es lesen sollte: dem
Core-Update, das `package.json`/`package-lock.json` nicht mehr mergt (`5b3acc5`), und der Sperre
für `public/` (`38d0f0b`). Beide Fixes hatten eine Tür geöffnet, die es vorher nicht gab. Die Fixes
dieser Runde greifen deshalb tiefer in dieselben zwei Funktionen als die Fixes, die sie reparieren:
`startServer` ist in zwei Hälften geteilt, und `runCoreUpdate` gibt die zwei Paketdateien jetzt an
einen **git-Stash**, der einen halb fertigen Merge, einen `merge --abort` und das Ende der Sitzung
übersteht.

**Ein Stash ist neu in diesem Projekt.** Die App schrieb bisher nie in den Stash-Bereich eines
Nutzer-Repos. Der Stash trägt einen Namen (`QuartzControl: core update`) und ist damit ein
Bezeichner auf fremder Platte — dieselbe Sorte wie `.quartz-gui/` und `Quartz-GUI:managed:`, für
die `CLAUDE.md` eine eigene Regel führt.

**Und eine Schicht, die nicht im Repo liegt**: zwei Absätze im Benutzerhandbuch, in einem Vault,
der nicht Teil dieses Repos ist (unten unter „Umfang“).

In der Zählung von `CLAUDE.md` ist das das siebzehnte Review. Die Dateinamen zählen nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis; die Messungen hinter den Regeln stehen in `docs/decisions/`. Lies dann
`docs/REVIEW-2026-09-20.md` — die neun Befunde, deren Fixes du liest, samt den Messungen, die sie
belegen. Der Auftrag dazu steht in `docs/REVIEW-2026-09-20-auftrag.md`.

## Umfang

Branch `fix/review-2026-09-20`, abgezweigt von `main`. **Nichts davon ist gepusht und nichts nach
`main` gemergt.**

    git log --oneline review-2026-09-21..review-2026-09-22
    git diff review-2026-09-21..review-2026-09-22 -- . ':!docs/REVIEW-2026-09-20.md' ':!docs/REVIEW-2026-09-21-auftrag.md'
    # 13 Dateien, +520 / −101
    # davon App-Code (electron/, src/, shared/): 6 Dateien, +322 / −74
    # davon Skripte: 2 Dateien, +47 / −5

Die 15 Zeilen zwischen diesen 520 und den 505 des eigentlichen Diffs sind der `CLAUDE.md`-Absatz,
den der Auftrags-Commit mitbringt; ohne ihn (`review-2026-09-21..b92d8a8`) sind es 13 Dateien,
+505 / −101. Dieselbe Differenz stand im letzten Auftrag und war dort nicht erklärt.

`review-2026-09-21` sitzt auf `dc06e2d` („Der Auftrag für das sechzehnte Review“, `main`), dem
Stand, den das letzte Review gelesen hat. `review-2026-09-22` sitzt auf dem Commit, der diesen
Auftrag trägt — dem Stand, den du liest. Die Commits:

| Befund | Commit | Worum es geht |
| --- | --- | --- |
| — | `e0b7ad3` | das Review-Dokument 2026-09-20 |
| 1 | `691b6c1` | **`pendingStarts`: ein wartender Serverstart ist sichtbar; `forgetServer()`** |
| 4 | `6e4bfbf` | nur die Paketdateien anfassen, die `git ls-files` führt |
| 2 | `2f4394d` | **`git stash` statt `git checkout HEAD --`; `abortCoreMerge` poppt ihn** |
| 3 | `9533c70` | zwei Vergleiche statt einem; `stillMissing()`; drei Fälle mehr in `check:core-update` |
| 5 | `a1ecba2` | die committete `.pyc` entfernt, `__pycache__/` ignoriert |
| 6 | `74ee823` | `CLAUDE.md` nennt den richtigen Commit für `review-2026-09-21` |
| 7 | `69c5644` | das PDF-Skript spricht seine Zahlen selbst aus |
| 8 | `477d2db` | `docs/release.md` von sechs auf neun Punkte |
| 9 | `cc1559d` | die `curl`-Kette gehört zu `sharp` 0.34.5 |
| — | `b92d8a8` | `CLAUDE.md`: Zählung, Absatz zur Runde, drei erweiterte Regeln |
| — | — | dieser Auftrag |

Die Reihenfolge der Commits ist nicht die der Befunde: 4 liegt vor 2, weil 2 auf der Frage aufsetzt,
welche Pfade git überhaupt kennt.

**Im Handbuch-Vault** (`~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`, ein eigenes git-Repo,
nicht Teil dieses Repos) liegt ein Commit dazu:

    git -C ~/Obsidian/QuartzProjekte/QuartzControl-Handbuch show b61a08d

Er ändert 8.5 „Verbindungen ins Netz“ in beiden Sprachen (Befund 9). Prüf ihn mit; er behauptet
Zahlen wie jeder andere.

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung — siehe „Wie gemessen werden kann“, bevor du eine Kopie anfasst.

## Was du wissen musst, bevor du liest

**Alle elf Commits stammen von demselben Modell, das diesen Auftrag schreibt**, aus einer Sitzung;
das Review-Dokument `e0b7ad3` aus einer anderen. Lies Commit-Nachrichten als Behauptungen. In
diesem Projekt gilt eine Zahl in einer Commit-Nachricht als Messung; trägt sie nicht, ist das ein
Befund.

**Abwägungen, die ich selbst getroffen habe — prüf, ob sie tragen:**

- Der wartende Start bekommt **keinen** eigenen Zustand im Vertrag, sondern benutzt das vorhandene
  `starting`. Begründung: Der Renderer tauscht dort ohnehin schon „Starten“ gegen „Neu
  starten“/„Stoppen“, der Abbruch liegt also da, wo er immer lag. Der Preis ist, dass „starting“
  jetzt zwei Dinge heißt — „wartet auf einen Build“ und „Prozess läuft, Port antwortet noch nicht“.
- „Stoppen“ während des Wartens **bricht das Warten ab** und signalisiert nichts. Der wartende Start
  endet dann als `stopped`, nicht als `error`.
- Ein wartender Start zählt in `serverWritingInto()` als Schreiber des Ordners. Ein „Jetzt bauen“ in
  genau dem Fenster zwischen Buildende und Spawn wird also abgelehnt, mit einem Satz, der von einem
  Server spricht, den es noch nicht gibt.
- `BuildServer.tsx` und `ProjectDashboard.tsx` schreiben die Antwort von `server.start`/`restart`
  **nicht mehr** in ihren Zustand; das Abonnement trägt jede Bewegung. Das ist eine Änderung an zwei
  Seiten, die der Befund nicht verlangt hat.
- Der Stash wird **nur** angefasst, solange `refs/stash` noch der SHA dieses Laufs ist (bzw. sein
  Betreff den Namen trägt). Ein Stash des Nutzers bleibt liegen.
- Bei einem Konflikt in einer Datei, die **HEAD nicht führt** (gitignoriertes Lockfile), wird als
  gelöscht aufgelöst (`git rm --cached`) statt mit `--theirs` übernommen — damit das Lockfile nicht
  gegen die Entscheidung des Nutzers wieder unter Versionskontrolle kommt.
- `stillMissing()` liest `package.json` nach dem Merge noch einmal von der Platte, statt den Merge
  zu befragen (`git diff HEAD@{1} HEAD`), weil der Reflog nicht Teil des Zustands sein soll.
- `planApplies` ist jetzt `plan.reproducible && tracked.length > 0` — führt git **keine** der beiden
  Dateien, lässt die App die Finger davon.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Der Stash im Core-Update (`2f4394d`, dazu `6e4bfbf` und `9533c70`)

`electron/main/services/updateService.ts` (+ ~160 Zeilen), `shared/packageJsonDeps.ts`,
`scripts/check-core-update.mjs`, zwei Texte in `electron/main/i18n.ts`.

Das ist der größte Eingriff und der einzige, der etwas im Repo des Nutzers hinterlässt, das die App
bisher nie angefasst hat. Die Fragen, die ich für die wichtigsten halte:

- **Bleibt je ein Stash liegen, den niemand mehr poppt?** Vier Ausgänge: Merge kam nicht zustande
  (`releaseNpmOwnedFiles`), Merge hängt (bleibt stehen, `abortCoreMerge` poppt), `npm install`
  scheitert (`dropNpmOwnedFiles`), Erfolg (`dropNpmOwnedFiles`). Gibt es einen fünften? Was, wenn
  die App zwischen Stash und Merge beendet wird — und was sagt das nächste Update dann?
- **Der Nutzer löst den Merge von Hand auf**, statt „Merge abbrechen“ zu drücken. Dann steht der
  Stash unbeobachtet da, und die Meldung („„Merge abbrechen“ oben trägt sie wieder ein“) nennt einen
  Weg, den er gerade nicht gegangen ist. Ist das ein Befund?
- **`git stash pop` auf einen Konflikt.** Gemessen ist nur der saubere Fall. Was hinterlässt ein
  gescheitertes Pop im Arbeitsbereich, und was sagt die App dazu?
- **Die Besitzprüfung** (`stashRef()` vergleicht SHA, `popCoreUpdateStash()` den Betreff). Reicht
  der Betreff? Zwei Projekte, zwei Läufe, ein Nutzer, der selbst stasht — such den Fall, in dem die
  App einen fremden Stash poppt oder droppt.
- **`git stash push -m … -- <pfade>`** in einem Repo mit `content/` als Symlink: Der Aufruf steht
  innerhalb von `withContentSymlinkParked`. Trägt das, und braucht es das überhaupt für zwei Dateien
  im Wurzelverzeichnis?
- **Der zweite Vergleich** (`localPackageChanges(head, ours, head)`): Ist „was HEAD gegenüber dem
  Arbeitsbereich verliert“ wirklich dieselbe Frage wie „was der Stash hält“? Such den Fall, in dem
  die zwei auseinandergehen — etwa bei einem gestageten, aber nicht committeten Eintrag.
- **`stillMissing()`** filtert auf exakte Gleichheit des Bereichs. Ein Paket, das nach dem Merge mit
  einem **anderen** Bereich dasteht, gilt damit als fehlend und wird überschrieben. Richtig?
- **`check:core-update`**: jetzt elf Fälle. Welcher naheliegende fehlt immer noch? Der neue Fall
  „von `dependencies` nach `devDependencies` gewandert“ erwartet `reinstall` **und**
  `unreproducible` zugleich — lies nach, was der Dienst daraus macht.

### 2. Der wartende Serverstart (`691b6c1`)

`electron/main/services/buildService.ts`: `pendingStarts`, `startServer` (geteilt in `startServer` +
`spawnServer`), `forgetServer()`, `stopServer`, `killAllServers`, `serverWritingInto`,
`getServerStatus`. Dazu je drei Zeilen in `BuildServer.tsx` und `ProjectDashboard.tsx`.

- **Das `finally` in `startServer`** löscht den Eintrag, wenn er noch dieser Lauf ist. Zwischen
  `runningServers.set(...)` in `spawnServer` und diesem `finally` liegt kein `await` — stimmt das
  für jeden Weg, auch für den, auf dem `spawnServer` wirft?
- **Zwei Fenster hintereinander.** Start wartet, Nutzer drückt „Stoppen“, drückt sofort wieder
  „Starten“: `stopServer` löscht den Eintrag selbst, damit der neue Start nicht am alten
  abprallt. Kann der *alte*, noch laufende `await` danach etwas tun, das dem neuen gehört?
- **`killAllServers`** bricht wartende Starts ab. Der Beenden-Dialog fragt aber nur nach
  `runningServerSummaries()`, und darin steht ein wartender Start nicht. Verspricht der Dialog
  damit etwas Falsches?
- **`getServerStatus` hat jetzt vier Quellen** (running, pending, lastTerminal, Vorgabe). Gibt es
  eine Reihenfolge, in der die falsche gewinnt?
- **`emitStatus` mit `starting`** setzt eine `serve`-Aktivität, wenn keine da ist. Im Wartefall ist
  eine `build`-Aktivität da — aber der Build endet *während* des Wartens und räumt seine Zeile ab.
  Bleibt danach ein Fenster ohne Zeile, und was zeigt die Übersicht darin?
- **Der Vertrag.** `ServerStatus.pid` ist im Wartezustand `undefined`, `startedAt` aber gesetzt — es
  ist der Zeitpunkt des Klicks, nicht der des Prozesses. Die Seite rechnet daraus „gestartet vor …“.
  Ist das eine Lüge?
- **`restartServer`** liest die Optionen aus `runningServers`; im Wartezustand steht dort nichts.
  Trifft das jemanden?

### 3. Die vier Dokument-Befunde (`74ee823`, `477d2db`, `cc1559d`, `b92d8a8`) und das Handbuch

- **`docs/release.md`** hat jetzt neun Punkte. Deckt die Liste, was ein Release braucht — und stimmt
  die Behauptung, für Beta 2 seien genau diese vier Handgriffe nirgends verzeichnet gewesen? Die
  Punkte 6 und 7 sind aus `git log`, `git tag` und `gh release view` rekonstruiert, nicht
  mitgeschrieben.
- **Punkt 3** verlangt eine Seite „Neu in <Fassung>“ im Handbuch. Sie **fehlt** für Beta 2; das ist
  ein offener Befund des letzten Reviews, den diese Runde bewusst nicht geschrieben hat (der Text
  gehört dem Nutzer). Prüf, ob die Stelle das ehrlich sagt.
- **Die `curl`-Kette** (`cc1559d` im Repo, `b61a08d` im Vault): gemessen mit einer Attrappe auf
  `HOMEBREW_CURL_PATH`. Trägt die Methode — kann eine Attrappe dort einen Aufruf verbergen, statt
  ihn zu zählen? Und stimmen die zwei Zeilennummern in `brew.sh` (183, 615) auf deinem Stand von
  Homebrew?
- **`CLAUDE.md`** (`b92d8a8`): drei erweiterte Regeln und ein neuer Absatz. Beschreiben sie, was der
  Code tut, oder was er tun sollte?
- **Befund 6 war ein Commit-Hash, den ein Amend überholt hatte.** Prüf, ob diese Runde denselben
  Fehler noch einmal gemacht hat: Sitzt `review-2026-09-22` auf dem Commit, den `CLAUDE.md` nennt?

### 4. Das PDF-Skript und die kleinen Dinge (`69c5644`, `a1ecba2`, `6e4bfbf`)

- **`scripts/build-handbook-pdf.mjs`**: `findProblems` gibt jetzt `{ problems, counted }` zurück
  statt der flachen Liste. Ist der Aufrufer vollständig nachgezogen, und kann `counted` je in
  `found` landen?
- **`__pycache__/` und `*.pyc` in `.gitignore`**: ein weites Muster für ein Repo, das kein
  Python-Projekt ist. Trifft es etwas, das mitreisen soll?
- **`trackedNpmOwnedFiles()`** benutzt `git ls-files`, das den **Index** liest, nicht HEAD. Zwischen
  Snapshot und Aufruf liegt Arbeit — kann der Index dort etwas anderes sagen als HEAD?

### 5. Was die Prüfskripte nicht sehen

`typecheck`, `build`, `smoke`, `check:core-update`, `check:i18n`, `check:semver`,
`check:plugin-names` und `check:handbook` sind auf diesem Stand grün; `smoke` meldet die eine Zeile
`[1280x800] Layout · layout: Inhalt scrollt horizontal`, die das letzte Review auch auf dem alten
Stand gemessen hat. Keines dieser Skripte sieht den Stash, den wartenden Start oder das Verhalten
bei einem Merge-Konflikt. Was misst du, das sie nicht messen?

## Wie gemessen werden kann

- **Der Dienst ohne App**: esbuild-Bündel von `updateService.ts` (`--bundle --platform=node
  --format=cjs --tsconfig=tsconfig.node.json --external:electron`) mit einem Stub für `electron`
  (`app.getPath` genügt). Gegenseite ist ein lokales Repo mit drei Ständen (Basis; Paketversionen
  gehoben; nur README), je Szene als eigenes Bare-Repo geklont, dessen `HEAD` per
  `git symbolic-ref` auf den gewünschten Zweig zeigt — dann antwortet `git fetch quartz-upstream
  HEAD` ohne Netz.
- **npm und npx als Attrappen auf dem PATH**: ein `npm`, das `install [--save-*] name@range` in den
  passenden Abschnitt schreibt und ein Lockfile mit Marker hinterlässt, und ein `npx`, das 0
  antwortet. Damit ist der Zustand von Dateien und Repo gemessen — **nicht**, was echtes npm bei
  ERESOLVE oder bei `--save-prod` auf ein Paket in einem anderen Abschnitt tut. Das ist weiter
  offen.
- **Sechs Szenen** decken die Ränder, die diese Runde benutzt hat: Paket committet mit Konflikt in
  beiden Paketdateien; uncommittet mit Vorspulung; committet und danach uncommittet entfernt;
  uncommittet mit Konflikt in einer *anderen* Datei, dann Abbruch; Lockfile aus dem Index genommen
  und gitignoriert; uncommittete Änderung an einer Datei, die Upstream anfasst. Je Szene ein
  frischer Klon, und wo es um eine Regression geht, alt gegen neu
  (`git worktree add <pfad> review-2026-09-21`, `node_modules` als Symlink dazu).
- **Die gebaute App**: `npm run build`, dann eine Kopie von `.claude/skills/run-desktop/driver.mjs`
  mit `--user-data-dir` auf ein Wegwerf-Verzeichnis. Die Kopie muss **im Repo** liegen, sonst findet
  node `playwright-core` nicht. Projekt per `window.quartzGui.projects.add` eintragen, alles Weitere
  über `evalfile` mit den IPC-Aufrufen; `capture-pane -p | grep .`, sonst kommen leere Zeilen.
  `navigations-testprojekt` hat ein echtes `content/`-Verzeichnis und ist deshalb die Kopiervorlage;
  Server auf 8099/3099, damit nichts mit einem echten kollidiert.
- **Nicht gemessen** und deshalb offen für dich: die **gepackte** App; ein echtes `npm install`; ein
  `git stash pop`, der auf einen Konflikt läuft; ein Abbruch der App zwischen Stash und Merge; zwei
  Fenster derselben App; die VMs und die Linux-Pakete; und ob die drei Zahlen des PDF-Skripts (349
  Verweise, 40 Bilder, 115 Seiten) auf einem Handbuch stimmen, das nicht das dieses Rechners ist.

## Form der Befunde

Wie gehabt: je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was
schiefgeht, wie es sich zeigt und was dagegen spräche, es so zu lassen. Schreib das Ergebnis nach
`docs/REVIEW-2026-09-21.md`. Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund
wie jeder andere.
