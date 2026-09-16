Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist und das gerade zwei
Fehler repariert hat, die echte Projekte auf diesem Rechner getroffen haben. Es geht um ein Review —
nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Zum ersten Mal in dieser Serie liest du einen Fix, der aus dem Betrieb kam und nicht aus einem
Review.** Quartz hat am 2026-09-15 mit `3dff48b` sein ganzes Paket-Ökosystem auf 1.0 gehoben und
dabei `package.json` und `package-lock.json` umgeschrieben. Fünf von neun Projekten auf diesem
Rechner trugen eigene Einträge in genau diesen Dateien, und das Core-Update der App scheiterte
daran — uncommittet verweigerte git den Merge, committet ließ er zwei Dateien im Konflikt und einen
hängenden Merge zurück, an dem jeder weitere Versuch starb. Der Nutzer hat das gemeldet, die vier
Projekte sind von Hand repariert, und die App macht es seit `5b3acc5` anders.

**Dazu die offene Frage des zwölften Reviews, jetzt entschieden**: Ein einmaliger Build und der
Dev-Server schrieben zugleich in dasselbe `public/`. Der Build wird nun abgelehnt, der Serverstart
wartet.

**Und eine Schicht, die nie ein Review gesehen hat**: die sieben Fixes des fünfzehnten Reviews, der
Merge nach `main`, die Versionsanhebung auf `1.0.0-beta.2` und alles, was für das Release nötig war
— darunter ein statisch gelinktes AppImage-Startprogramm und ein 251-zeiliges Skript, das aus dem
gebauten Handbuch ein PDF macht.

In der Zählung von `CLAUDE.md` ist das das sechzehnte Review. Die Dateinamen zählen nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis; die Messungen hinter den Regeln stehen in `docs/decisions/`. Lies dann
`docs/REVIEW-2026-09-19.md` — die Befunde, deren Fixes in der dritten Schicht liegen.

## Umfang

Alles liegt auf `main` und ist gepusht.

    git log --oneline review-2026-09-20..main
    git diff review-2026-09-20..main -- . ':!docs/REVIEW-2026-09-20-auftrag.md'
    # 30 Dateien, +1843 / −83

Drei Schichten, die nichts miteinander zu tun haben:

    git diff review-2026-09-20..b7020d3   # die sieben Fixes des 15. Reviews: 14 Dateien, +956 / −55
    git diff b7020d3..0fc4d45             # Beta 2 und was danach kam: 10 Dateien, +306 / −7
    git diff 0fc4d45..main                # die zwei Fixes von heute: 10 Dateien, +581 / −21

`review-2026-09-20` sitzt auf `4e649a8`, dem Stand, den das fünfzehnte Review gelesen hat.

| Commit | Schicht | Worum es geht |
| --- | --- | --- |
| `12dd7d9` | 1 | das Review-Dokument 2026-09-19 |
| `29f3166` | 1 | Befund 1: `lendProjectTargets()` gibt die Ziele des echten Projekts an jedem Ausgang zurück |
| `ec3a7d7` | 1 | Befund 2: der `globby`-Ersatz normalisiert wie fast-glob |
| `9172008` | 1 | Befund 3: Kommentar, quartz-navigations ist nicht privat |
| `147dfe8` | 1 | Befund 4: der Skill `projekt-dokumentieren` hält, was `SKILL.md` sagt |
| `19b3436` | 1 | Befund 5: `CLAUDE.md` zählt richtig |
| `b25f61b` | 1 | Befund 7: `docs/release.md` |
| `570f171` | 1 | was als Regel bleibt |
| `77433ac` | 1 | `verify_vault()` in `wiki_bridge.py` |
| `b7020d3` | 1 | Nachtrag zum fünfzehnten Review |
| `d426f57` | 2 | `1.0.0-beta.2` |
| `34a1e38` | 2 | Merge nach `main` |
| `ab29d48` | 2 | AppImage mit statisch gelinktem Startprogramm (`toolsets.appimage`) |
| `5d54793` | 2 | `npm run build:handbook-pdf` (251 Zeilen neu) |
| `0fc4d45` | 2 | die Netzverbindungen an der gepackten Beta 2 nachgemessen |
| `5b3acc5` | 3 | **Core-Update mergt `package.json`/`package-lock.json` nicht mehr** |
| `721cac7` | 3 | Merge |
| `38d0f0b` | 3 | **Build und Dev-Server teilen sich `public/` nicht mehr** |
| `fc7f5f8` | 3 | Merge |
| `5f16ae6` | 3 | ein gescheitertes `npm install` nennt die Pakete, die es eintragen sollte |
| — | — | dieser Auftrag |

## Was du wissen musst, bevor du liest

**Alle Commits stammen von demselben Modell, das diesen Auftrag schreibt**, aus zwei Sitzungen. Lies
Commit-Nachrichten als Behauptungen. In diesem Projekt gilt eine Zahl in einer Commit-Nachricht als
Messung; trägt sie nicht, ist das ein Befund.

**Der Nutzer hat entschieden**, was passieren soll, wenn Build und Server denselben Ordner wollen:
ablehnen, mit Hinweis — ausdrücklich *nicht* „Server anhalten, bauen, neu starten“, weil die App
dann etwas anfasst, das er gestartet hat. Für die Gegenrichtung hat er „warten, dann starten“
gewählt. Er hat außerdem die Reparatur der echten Projekte verlangt, den Push von `gui-test`, die
Merges nach `main` und das Löschen von 20 gemergten Branches (lokal und auf GitHub;
`release/beta.2` und `review/beta2` sind auf seinen Wunsch geblieben).

**Abwägungen, die ich selbst getroffen habe — prüf, ob sie tragen:**

- Der Plan wirft die lokalen Paketänderungen weg und lässt npm sie neu schreiben, statt sie zu
  mergen. Das Sicherheitsnetz ist der Snapshot, der vor jedem Update entsteht.
- Was der Plan nicht nachspielen kann (ein lokal *entferntes* Paket, jede Änderung außerhalb der
  Abhängigkeitsblöcke), lässt die App unangetastet — dann entscheidet git, und der Nutzer liest die
  alte Meldung.
- Hat Quartz dasselbe Paket ebenfalls geändert, gewinnt Quartz.
- Der Commit, den die Konfliktauflösung schreibt, wird nach dem `npm install` per `--amend`
  ergänzt; eine Vorspulung wird nicht amendet.
- Die Sperre kennt nur Server, die diese App hält.
- Bei der Reparatur von Hand habe ich Excalidraw in `gui-test` von `^0.1.0` auf `^1.0.0` gehoben,
  weil Quartz alle Community-Plugins auf `1.x` hob. Die App tut das *nicht*, sie trägt die Version
  des Projekts wieder ein.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Der Core-Update-Umbau (`5b3acc5`, `5f16ae6`)

`electron/main/services/updateService.ts`, `shared/packageJsonDeps.ts`,
`scripts/check-core-update.mjs`, fünf Texte in `electron/main/i18n.ts`.

Das ist der größte Eingriff und der einzige, der Dateien des Nutzers wegwirft und neu schreiben
lässt. Die Fragen, die ich für die wichtigsten halte:

- **Das Sicherheitsnetz.** Behauptung: `createSnapshot` wirft bei einem Fehler (`writeTreeFailed`)
  und gibt `null` nur zurück, wenn ein Snapshot mit demselben Baum schon da ist — der Wurf käme vor
  jedem Eingriff, es kann also keinen Lauf geben, der die Paketdateien ohne Wiederherstellungspunkt
  anfasst. Stimmt das für *jeden* Weg durch `createSnapshotUnlocked`, auch für den mit
  `includeContent` und dem geparkten Symlink?
- **Der Rückweg im Fehlerfall.** `readNpmOwnedFiles`/`restoreNpmOwnedFiles` legen die Dateien in
  den Speicher und schreiben sie zurück, wenn der Merge nicht startete. Gibt es einen Pfad, auf dem
  weder zurückgeschrieben noch der Nutzer benannt wird? Was, wenn `withContentSymlinkParked` im
  `finally` wirft?
- **`git checkout --theirs`** im Konfliktfall: Was passiert bei einem Konflikt, in dem eine der
  beiden Dateien *gelöscht* wurde (modify/delete)? `--theirs` hat dann keine Stage-3-Fassung.
- **`commit --amend` auf einem Merge-Commit.** Bleiben beide Eltern erhalten? Und kann `ourMergeCommit`
  jemals `true` sein, ohne dass der Commit direkt davor unserer war?
- **Der Plan selbst** (`localPackageChanges`): Ist „Abweichung zur Merge-Basis“ die richtige Frage,
  wenn das Projekt eigene Commits *und* uncommittete Änderungen hat? Die Funktion sieht als „ours“
  den Arbeitsbereich, nicht HEAD — Absicht, aber prüf die Folgen für ein Projekt, das ein Paket
  committet und danach wieder entfernt hat.
- **`npm install --save-prod`** und die drei Geschwister: Landet ein Paket wirklich wieder in seinem
  Abschnitt, auch wenn es dort schon aus anderem Grund steht? Und was macht npm, wenn eine der
  Bereichsangaben nicht mehr auflösbar ist (der ERESOLVE-Fall)? Nur am Code gelesen, nicht gemessen.
- **`check:core-update`**: Acht Fälle. Welcher naheliegende fehlt? Der Rand „kein Vergleichsstand“
  kam beim ersten Lauf heraus und hat meine Erwartung widerlegt — gibt es weitere dieser Sorte?

### 2. Die Sperre für `public/` (`38d0f0b`)

`assertOutputFree()` und `serverWritingInto()` in `electron/main/services/buildService.ts`, der
Aufruf in `ipc/handlers.ts`, `startServer` wartet.

- **Die Identität des Ordners.** Verglichen wird mit `relative(a, b) === ''` über
  `resolveBuildDir`. Zwei Wege zu demselben Ordner (Symlink, Groß-/Kleinschreibung auf APFS, ein
  relativer Ausgabeordner mit `..`) sind für diesen Vergleich verschieden. Kommt man da hin?
- **Nur dasselbe Projekt.** Der Wächter fragt `runningServers.get(projectId)`. Zwei Projekte, deren
  Ausgabeordner sich überschneiden — etwa ein Duplikat oder ein von Hand gesetzter Ordner —, sieht
  er nicht. Ist das eine Lücke, die jemand trifft?
- **Das Warten in `startServer`.** `await build.promise.catch(...)`, ohne Obergrenze. Was, wenn der
  Build hängt? Und was sagt die Oberfläche in dieser Zeit — der Knopf, der Status, die Konsole?
  Gemessen sind 4,1 s an einem kleinen Projekt.
- **`restartServer`** geht durch `startServer`; trifft es das Warten ebenfalls, und ist das richtig?
- **Die Zustände.** `stopping` zählt als Schreiber, `error` und `stopped` nicht. Deckt sich das mit
  dem, was `emitStatus` wirklich setzt, wenn ein Server abstürzt, während ein Build läuft?
- **Der fremde Server.** Bewusst nicht abgedeckt. Ist die Begründung im Kommentar ehrlich, und sagt
  die App dem Nutzer irgendwo genug, um es selbst zu merken?

### 3. Die sieben Fixes des fünfzehnten Reviews (`12dd7d9`..`b7020d3`)

Diese Schicht hat noch niemand gelesen. Am interessantesten:

- **`lendProjectTargets()`** in `scripts/screenshot-demo.mjs` schreibt in die
  `publish-targets.json` eines **echten** Projekts und gibt sie über `process.on('exit')` und zwei
  Signale zurück. Was passiert bei SIGKILL, bei zwei Läufen zugleich, bei einem Schreibfehler?
- **`verify_vault()`** in `.claude/skills/projekt-dokumentieren/scripts/wiki_bridge.py`. **Nicht
  ausführen, lesen.** Das Repo ist öffentlich: Steht dort ein absoluter Pfad oder etwas, das nicht
  hinein gehört?
- **`docs/release.md`** ist neu. Deckt die Liste, was ein Release wirklich braucht — gemessen an dem,
  was für Beta 2 tatsächlich getan wurde (Schicht 2)?
- **Der `globby`-Ersatz** nach `ec3a7d7`: acht bekannte Abweichungen stehen im Kommentar. Trägt die
  Zahl noch?

### 4. Beta 2 und das PDF (`d426f57`..`0fc4d45`)

- **`scripts/build-handbook-pdf.mjs`**, 251 Zeilen, treibt Chrome. Was tut es, wenn Chrome fehlt
  oder eine Seite nicht lädt — und räumt es auf?
- **Das statisch gelinkte AppImage-Startprogramm** (`ab29d48`): eine Versionsangabe in
  `electron-builder.yml`. Woher kommt die Zahl, und was passiert, wenn sie nicht verfügbar ist?
- **Die Netzmessung** (`0fc4d45`) behauptet, der `curl` sei Homebrews Statistik über ein
  Installskript von `sharp`. Die Kette ist im Commit beschrieben; trägt sie?

### 5. Was die Dokumente behaupten

`CLAUDE.md` hat zwei neue Regeln und einen neuen Skript-Eintrag,
`docs/decisions/snapshots-and-updates.md` und `navigation-and-pages.md` je einen neuen Absatz. Prüf
die Zahlen darin gegen das, was du selbst misst — besonders die 9 s, 14 s, 4,9 s, 38 ms, 4,1 s,
3 ms und 5,1 s, und die Behauptung, der Smoke-Befund bei 1280 sei älter als diese Änderungen.

## Wie gemessen werden kann

- **Nichts an den Projekten unter `~/Documents/QuartzProjekte/` verändern**, und keine Vaults
  anfassen. Kopieren ist in Ordnung (`cp -Rc`) — aber in einer Kopie unter `content/` nichts
  schreiben, der Vault-Link reist mit.
- **Der Zustand vor dem Update lässt sich nachbauen**: eine Kopie eines Projekts auf `f1fba3f`
  zurücksetzen und die Paketdateien mit eigenen Einträgen versehen; `gui-test` hat seinen
  Vorher-Stand in `ab888db`.
- **Der Dienst ohne App**: esbuild-Bündel von `updateService.ts` mit einem Stub für `electron`
  (`app.getPath` genügt), Format `cjs`, dann `runCoreUpdate` direkt aufrufen. Ein lokales Repo als
  `quartz-upstream`-Remote reicht als Gegenseite; der Aufwärm-Build scheitert dort und das ist
  erlaubt.
- **Die gebaute App**: `npm run build`, dann eine Kopie von `.claude/skills/run-desktop/driver.mjs`
  mit `--user-data-dir` auf ein Wegwerf-Verzeichnis. Die Kopie muss **im Repo** liegen, sonst findet
  node `playwright-core` nicht. Projekt per `window.quartzGui.projects.add` eintragen, alles Weitere
  über `evalfile` mit den IPC-Aufrufen; `capture-pane -p | grep .`, sonst kommen leere Zeilen.
- **Nicht gemessen** und deshalb offen für dich: die **gepackte** App, ein echter ERESOLVE beim
  `npm install`, ein Server aus einer früheren Sitzung, das Verhalten der Oberfläche während des
  wartenden Serverstarts, und ob Excalidraw auf `^0.1.0` in `gui-test` seine Zeichnungen noch
  richtig rendert.

## Form der Befunde

Wie gehabt: je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was
schiefgeht, wie es sich zeigt und was dagegen spräche, es so zu lassen. Schreib das Ergebnis nach
`docs/REVIEW-2026-09-20.md`. Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund
wie jeder andere.
