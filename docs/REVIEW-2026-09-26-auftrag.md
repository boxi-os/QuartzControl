Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist. Es geht um ein
Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Was diese Runde anders macht

**Diese Runde hat erst an Attrappen gemessen und die echten Läufe nachgeholt.** Alle sieben Befunde
und alle sechs Nebenbei-Punkte sind an einem lokalen Bare-Repo und npm-Skripten entstanden; die
drei Läufe gegen `github.com/jackyzha0/quartz` mit echtem npm kamen danach, in einem eigenen
Commit, und haben die zwei mittleren Befunde bestätigt. **Prüf, ob die Attrappen die Lage treffen,
die sie nachstellen sollen** — und ob die drei echten Läufe die Fälle treffen, für die die Fixes
gebaut wurden. Wo sie es nicht tun, ist das der Befund. Die Runde davor hat gezeigt, dass genau
hier ein Fix verdeckt werden kann.

**Dafür ist zum ersten Mal in dieser Serie die Oberfläche das Messmittel gewesen.** Sechs Punkte
aus der Nebenbei-Liste des Reviews sind mit erledigt, und vier davon ließen sich nur an der
gebauten App mit echten Tastendrücken beantworten. Einer war größer als sein Platz: **Das gezogene
Rechteck im Frame-Builder war nie das, was gezogen wird** — dnd-kit misst das *einzige Kind* des
`DragOverlay`, und das war ein Block-`div`, also so breit wie der ganze Bereich. Damit ist auch die
Frage beantwortet, die der letzte Auftrag als offen führte (die 26,5 px).

**Ein Fix ist im zweiten Anlauf entstanden, und der erste war schlechter als der Zustand davor.**
Der Versuch, den waagerechten Erstdruck im Pfeil-Getter zu beheben, machte aus „springt sechs
Spalten weit“ ein „bewegt gar nichts“. Das steht im Nachtrag und in der Commit-Nachricht; der
verworfene Weg ist Teil des Befunds, nicht sein Beiwerk.

**Und eine Zahl in einer Commit-Nachricht war geschätzt statt gezählt.** Aufgefallen ist es beim
nächsten `check:i18n`-Lauf; korrigiert ist sie per Cherry-pick, weil der Branch noch nicht gepusht
war. Das ist der wiederkehrende Befund dieser Serie, diesmal selbst produziert — such, ob es der
einzige Fall ist.

In der Zählung von `CLAUDE.md` ist das das zweiundzwanzigste Review. Die Dateinamen zählen nach
Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis; die Messungen hinter den Regeln stehen in `docs/decisions/`. Lies dann
`docs/REVIEW-2026-09-25.md` — die sieben Befunde, deren Fixes du liest, samt den Messungen, die sie
belegen, und seine Liste „Nebenbei aufgefallen“, die diesmal vollständig mit erledigt ist. Der
Auftrag dazu steht in `docs/REVIEW-2026-09-25-auftrag.md`.

## Umfang

`main`, gepusht. Die zwanzig Commits zwischen `review-2026-09-26` und `review-2026-09-27`
(siebzehn, dieser Auftrag, und die zwei über die echten Läufe danach):

    git log --oneline review-2026-09-26..review-2026-09-27
    git diff review-2026-09-26..review-2026-09-27 -- . \
      ':!docs/REVIEW-2026-09-25.md' ':!docs/REVIEW-2026-09-26-auftrag.md'
    # 18 Dateien, +692 / −104
    # davon App-Code (electron/, src/):        13 Dateien, +359 / −86
    # davon docs/decisions/:                    4 Dateien, +137 / −0
    # davon CLAUDE.md:                          1 Datei,   +196 / −18

Ausgenommen sind zwei Dateien: `docs/REVIEW-2026-09-25.md` (das Review, das du liest, statt es zu
prüfen) und diese Auftragsdatei. Mit dem Review-Dokument sind es 19 Dateien und +1100; die Differenz
von 408 Zeilen ist das Review. Lies den Auftrag als Behauptung wie jede andere — die Zahlen oben
sind nach dem Commit nachgerechnet, der diese Datei trägt.

**Einen Hash für den Commit, der diese Datei trägt, nennt sie nicht** — er kann nicht in sich
selbst stehen. `git rev-parse review-2026-09-27^{commit}` beantwortet die Frage genauer.

`review-2026-09-26` sitzt auf `93ba8bb` („Der Auftrag für das einundzwanzigste Review“), dem Stand,
den das letzte Review gelesen hat. Die Commits:

| Woher | Commit | Worum es geht |
| --- | --- | --- |
| — | `37c5ea0` | das Review-Dokument selbst (ausgenommen) |
| Befund 1 | `4e1b71d` | **die Notiz trägt `wanted` statt `takenOut`; `carried` ohne SHA-Bindung** |
| Befund 2 | `f1b0bdf` | **`filesAtHead` als drittes Notizfeld; der Amend braucht es** |
| Befund 3 | `20cc96b` | **Konfliktpfade aus `abortOutcomeForStash()` gefiltert** |
| Befund 4 | `ca44eb4` | **`coreUpdateStashEntry()`; `{{entry}}` in zwei Sätzen** |
| Befund 5 | `f02e085` | **`doc.errors` und `plugins:` als Liste; zwei neue Texte** |
| Befund 6 | `1eb6355` | **`duplicateProject` prüft die Quelle vor dem Kopieren** |
| Befund 7 | `7a9d31c` | vier Zahlen, zwei Sätze, die Antwort auf die 26,5 px |
| — | `546816d` | vier Nachträge in `docs/decisions/` |
| — | `de9aaa6` | `CLAUDE.md`: sechs Regeln und der Absatz über die Runde |
| Nebenbei 1 | `fd00eef` | **`dnd.backHome`; `useDndAccessibility` mit Ref** |
| Nebenbei 2 | `c87610a` | **`w-fit` am Drag-Chip — die Geometrie beider Tastatur-Bretter** |
| Nebenbei 3 | `10ad55c` | **`atomicWrite` fragt `doc.errors`** |
| Nebenbei 5 | `deab041` | **`configMissing`; `loadErrorHint` entfällt** |
| Nebenbei 6 | `9d1028f` | **Fehlerzustand auf der Stile-Seite** |
| — | `26022fa` | drei Nachträge in `docs/decisions/` |
| — | `abe2e1e` | `CLAUDE.md`: vier Regeln, der Absatz auf dem Endstand |
| — | — | dieser Auftrag |
| Nachgeholt | s. u. | **drei echte Läufe gegen `jackyzha0/quartz`** — der Nachtrag dazu |
| Nachgeholt | s. u. | **der neunte Fix: der fortsetzende Lauf misst selbst mit** (R4/R5/R6) |

Die zwei letzten Commits sind nach diesem Auftrag entstanden und tragen keinen Hash in dieser
Tabelle, aus demselben Grund wie der Auftrag selbst: `review-2026-09-27` sitzt auf dem letzten.

**Der neunte Fix ist der einzige dieser Runde, den kein Review gemeldet hat** — er kam aus einer
Messung, die der Auftrag selbst als offene Lücke benannt hatte. `filesAtHead` beschreibt den Lauf,
der die Notiz schrieb, nicht die Zeit danach; eine Zeile, die der Nutzer zwischen zwei Läufen
uncommittet einträgt, landete im Merge-Commit. Jetzt müssen beide Hälften stimmen, die Notiz und
die eigene Messung des fortsetzenden Laufs. **Prüf den Preis**: Ein Lockfile, das npm im zweiten
Lauf neu schreibt, bleibt danach uncommittet.

**Nebenbei 4 fehlt in dieser Tabelle mit Absicht**: Dass die App in einem Projekt ohne
`.gitignore` eine anlegt, ist kein Fehler, sondern die Entscheidung aus `projectDirs.ts`. Prüf das
— es ist die einzige Stelle, an der diese Runde einen gemeldeten Punkt als „kein Befund“ abgelegt
hat.

**Im Handbuch-Vault liegt diesmal nichts** — diese Runde hat keine Handbuch-Seite angefasst.

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung — siehe „Wie gemessen werden kann“, bevor du eine Kopie anfasst.

## Was du wissen musst, bevor du liest

**Alle neunzehn Commits stammen von demselben Modell, das diesen Auftrag schreibt**, aus einer
Sitzung; das Review-Dokument `docs/REVIEW-2026-09-25.md` aus einer anderen. Lies Commit-Nachrichten
als Behauptungen. In diesem Projekt gilt eine Zahl in einer Commit-Nachricht als Messung; trägt sie
nicht, ist das ein Befund.

**Vier Commits sind nach dem Schreiben noch einmal angefasst worden.** `1eb6355` ist per
Cherry-pick neu entstanden, weil seine Nachricht „check:i18n (1111 + 178)“ sagte, wo 177 gemessen
war — die drei Commits danach wurden mit ihm umgesetzt. `abe2e1e` wurde zweimal amendet, für die
Diff-Zahlen dieses Absatzes, die sich mit jeder Korrektur ändern. Der Branch war zu dem Zeitpunkt
nicht gepusht.

**Abwägungen, die ich selbst getroffen habe — prüf, ob sie tragen:**

- **`carried` ohne SHA-Bindung ist die Abwägung dieser Runde mit der größten Reichweite.** Die
  Paketliste in `.quartz-gui/core-update.json` wird jetzt benutzt, sobald es eine Notiz gibt, egal
  zu welchem Commit sie gehört. Mein Argument: Nach dem Merge ist `package.json` upstreams, also
  kann der Nutzer ein Paket gar nicht „daraus entfernt“ haben, und `stillMissing` filtert ohnehin
  alles, was schon dasteht. **Such die Lage, in der eine Liste aus einem fremden Stand etwas
  einträgt, das niemand will** — Restore, Duplikat, `git reset`, zwei Projekte, die sich einen
  Ordner teilen. Für den Amend ist der SHA geblieben.
- **`filesAtHead` entscheidet über einen Amend, und es entscheidet über zwei Läufe hinweg.** Der
  Lauf, der den Merge macht, misst vor dem Merge, ob beide Paketdateien genau HEAD entsprechen, und
  schreibt die Antwort in die Notiz; der Lauf, der die Arbeit fortsetzt, liest sie *und misst
  selbst mit* — das war zuerst nicht so und ist der neunte Fix. Eine Notiz ohne das Feld erlaubt
  keinen Amend (gemessen: ` M package-lock.json` bleibt stehen). Die Entscheidung dahinter: Der
  fortsetzende Lauf kann Nutzerarbeit nicht von npm-Resten unterscheiden, also gilt ihm **jede**
  Abweichung beim Start als Grund, nicht zu amenden. Das ist streng, und der Preis ist ein
  Lockfile, das uncommittet stehen bleibt.
- **Die Auskunft gilt für beide Pfade zusammen, nicht je Pfad.** Wer ein Paket über die App
  installiert, hat beide Dateien uncommittet, also ist der Unterschied in der Praxis keiner. Der
  Preis steht in der Messung (Szene h5a): ein Lockfile, das npm neu geschrieben hat, bleibt
  uncommittet neben der `package.json`, die es schon war. Das ist ein Argument, keine Messung.
- **`w-fit` am Drag-Chip ändert die Geometrie, an der beide Tastatur-Bretter rechnen.** Der Chip
  ist jetzt so breit wie sein Text statt so breit wie der gezogene Bereich. Gemessen ist der
  Frame-Builder waagerecht und senkrecht und die Ablage; **nicht** gemessen ist der Maus-Drag —
  dort entscheidet `pointerWithin`, solange der Zeiger über einem Ziel steht, und nur daneben
  `closestCenter`. „Solange“ ist das Wort, das dich interessiert.
- **Der senkrechte Druck landet seither auf Zellen statt auf Bereichen.** Vorher sagte ArrowDown
  aus `header` „über before-body“, jetzt „Zelle Zeile 2, Spalte 1“. Beides platziert an derselben
  Stelle, und die Zelle ist die genauere Auskunft — aber es ist eine Verhaltensänderung, die das
  zwanzigste Review so nicht gemessen hat.
- **Die erste Meldung eines jeden Drags schweigt jetzt** — nicht mehr nur die, deren Ziel denselben
  Namen trägt wie das Gezogene. Begründung: dnd-kit meldet ein Ziel im Augenblick des Aufnehmens,
  und dieser eine Satz übertönt das „aufgenommen“. Der Preis: Wer mit der Maus aufnimmt und sofort
  über ein anderes Ziel fährt, verliert den ersten Satz. Nicht gemessen.
- **`readConfig` wirft jetzt an vier Stellen** (leer bleibt leer): `doc.errors`, kein Mapping,
  `plugins:` keine Liste, ENOENT. Die Funktion wird an 19 Stellen gerufen. Ich habe die
  Konfigurations-, Layout- und Stile-Seite gemessen und die übrigen gelesen. Ein Wurf, der als
  roter Toast ankommt, ist besser als ein `TypeError` — aber ist er überall ein Toast, und sagt er
  überall etwas, das zum Bildschirm passt?
- **Die yaml-Meldung wird auf ihre erste Zeile gekürzt.** Sie nennt Zeile und Spalte; der Rest ist
  ein Quelltextausschnitt mit Caret, gedacht für ein Terminal. Das ist eine Entscheidung gegen
  Information zugunsten der Lesbarkeit eines Toasts.
- **`configMissing` trägt jetzt den Rat über den Setup-Assistenten**, den vorher der Renderer unter
  jedem Lesefehler zeigte. Er reist damit zu allen 19 Aufrufern — auch zu denen, für die ein
  Setup-Assistent nichts erklärt (`buildService`, `duplicateProject`, die Vorlagen-Teile). Prüf,
  ob der Satz dort noch passt.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Die Notiz und der Amend (`4e1b71d`, `f1b0bdf`)

Die zwei mittleren Befunde des Vorgängers, und beide Fixes sitzen im selben Dutzend Zeilen. Lies
`runCoreUpdateFrom` von `const pending = await readPendingInstall(...)` bis zum Amend am Stück und
frag bei jeder Zeile, welchen der drei Läufe sie beschreibt: den, der merged; den, der fortsetzt;
den, für den es nichts zu tun gibt. Besonders: Die Notiz wird jetzt *nach* `carried` geschrieben —
prüf, ob zwischen Lesen und Schreiben noch etwas liegt, das sie verfälschen kann. Und ob ein
dritter Lauf dieselbe Liste bekommt wie der zweite.

### 2. Was die Attrappen nicht sehen (`4e1b71d`, `f1b0bdf`, `20cc96b`)

Die Szenen dieser Runde stehen in den Commit-Nachrichten (h1, h2, h5a–c, h6, h7/b/c, h10, h11, s4,
norm). Jede benutzt ein lokales Bare-Repo als Upstream und ein npm-Skript, das schreibt, scheitert
oder nichts tut. **Die Runde davor hat gezeigt, dass genau hier ein Fix verdeckt werden kann** —
echtes npm ließ ein Lockfile stehen, wo zwei Attrappen es neu schrieben. Frag für jede Szene, was
echtes npm anders täte, und bau die eine, die es beweist.

### 3. Der Drag-Chip und was an ihm hängt (`c87610a`, `fd00eef`)

`w-fit` ist eine Klasse, und sie bewegt die Zahl, mit der `nearestDroppableCoordinates` rechnet,
und die, mit der `closestCenter` entscheidet. Gemessen sind Tastendrücke; der Maus-Drag ist
Behauptung. **Such die Lage, in der der schmale Chip schlechter ist als der breite:** ein Bereich
am rechten Rand, ein Raster mit sehr schmalen Spalten, ein Bereich, dessen Name lang genug ist, um
den Chip wieder breit zu machen. Und prüf die Ansage-Refs: Sie leben in einer Funktion, die alle
drei Aufrufer aus dem Render-Body rufen — wann werden sie zurückgesetzt, und was passiert, wenn
zwei Drags einander überlappen?

### 4. Die vier Würfe in `readConfig` (`f02e085`, `deab041`) und wer sie fängt

19 Aufrufer. Welche fangen, welche nicht, und was sieht der Nutzer in jedem Fall? Der Vorgänger hat
diese Frage für zwei Würfe gestellt; jetzt sind es vier, und einer trägt eine Anweisung, die nicht
überall passt. Besonders: der Weg durch `buildService` vor einem Build, die Vorlagen-Teile, und
`duplicateProject`, dessen eigener Satz (`duplicateSourceConfigUnreadable`) den von `readConfig`
einwickelt.

### 5. Die Seiten, die nicht laden (`9d1028f`)

Die Stile-Seite hat einen Fehlerzustand bekommen, weil ihre zwei tragenden Lesevorgänge ein `catch`
haben. **Welche Seite hat denselben Bau und keinen Fehlerzustand?** Die Frage ist allgemeiner als
diese eine Seite, und sie ist in dieser Runde nur für eine beantwortet worden.

### 6. Die Dokumente (`7a9d31c`, `546816d`, `de9aaa6`, `26022fa`, `abe2e1e`)

Acht Nachträge in `docs/decisions/`, rund 196 neue Zeilen in `CLAUDE.md`, zehn neue Regeln. Jede
Zahl darin ist eine Messung oder ein Befund. Zwei Stellen, an denen es diese Runde selbst schon
einmal falsch hatte: die Diff-Zahlen dieses Absatzes (zweimal nachgerechnet, weil jede Korrektur
die Zahl ändert) und die 178, die in einer Commit-Nachricht stand, bevor sie gezählt war.

### 7. Was die Prüfskripte nicht sehen

`npm run typecheck`, `build`, `smoke` (42 Aufrufe), `check:i18n` (1112 + 178 Schlüssel),
`check:core-update` (14 Fälle), `check:semver`, `check:plugin-names` und `check:handbook` sind auf
diesem Stand grün. Keines sieht die Notiz, den Stash, einen Merge, einen Amend, einen Tastatur-Drag
oder eine kaputte `quartz.config.yaml`. Was misst du, das sie nicht messen?

## Wie gemessen werden kann

- **Der Dienst ohne App**: esbuild-Bündel von `updateService.ts`, `configService.ts` bzw.
  `duplicateService.ts` (`--bundle --platform=node --format=cjs --tsconfig=tsconfig.node.json
  --external:electron`), `electron` über einen Stub mit `app.getPath`,
  `safeStorage.isEncryptionAvailable` und `BrowserWindow.getAllWindows`. Gegenseite ist ein lokales
  Repo mit den Ständen `A` (Basis), `D` (auf `A`, nur `quartz/index.ts` — Konflikt **außerhalb** der
  Paketdateien) und `E` (auf `A`, zusätzlich `package.json` und Lockfile). Der Klon bekommt
  `git remote add quartz-upstream <pfad>`; damit `git fetch quartz-upstream HEAD` ohne Netz
  antwortet, zeigt HEAD des Bare-Repos über `git symbolic-ref` auf einen Branch, der auf dem Tag
  steht. Für eine Vorher-Messung: zweites Bündel aus `git archive review-2026-09-26` — **kein
  Worktree**, dann bleibt das Repo unberührt.
- **npm und npx als Attrappen auf dem PATH**, mit Aufrufprotokoll, in drei Betriebsarten: schreibt
  (trägt `install name@range` in den passenden Abschnitt ein und schreibt das Lockfile neu),
  scheitert, schreibt nichts. Die dritte ist die, die einen Fix der Vorrunde verdeckt hatte.
- **Die gebaute App**: `npm run build`, dann eine Kopie von `.claude/skills/run-desktop/driver.mjs`
  **im Scratchpad** mit `--user-data-dir` auf ein Wegwerf-Verzeichnis, `node_modules` als Symlink
  daneben und `APP_DIR` fest auf das Repo — so liegt keine Treiber-Kopie im Repo (die Vorrunde hat
  genau das einmal falsch gemacht und es per Amend geheilt). Das Profil liegt **direkt** im
  `--user-data-dir`, nicht in einem Unterordner `QuartzControl/`, und die Projekt-ID in
  `projects.json` muss eine echte UUID sein, sonst weist das zod-Schema sie ab. `capture-pane -p |
  grep .`, sonst kommen leere Zeilen; nach `quit` die tmux-Session neu aufbauen statt den Driver
  nachzustarten. Für den Tastatur-Drag erst per `evalfile` fokussieren (`el.focus()`, dann
  `document.activeElement` gegenprüfen), dann `press Space` / `press ArrowRight`, Zustand über
  `[role="status"]`. Wer den Getter selbst verstehen will, baut eine Sonde hinein
  (`globalThis.__probe = {…}`) — so ist die Ursache dieser Runde gefunden worden, und ohne sie wäre
  der erste Fix als Erfolg durchgegangen.
- **Der echte Lauf**, dreimal gemacht und im Nachtrag zu `snapshots-and-updates.md` beschrieben:
  `cp -Rc` von `navigations-testprojekt`, dann `git reset --hard f1fba3f` — sieben Upstream-Commits
  zurück, von denen fünf die Paketdateien anfassen —, die eigenen Pakete wieder in `package.json`,
  `npm install`. Danach über die gebaute App: Projekt in die `projects.json` des Wegwerf-Profils
  eintragen (echte UUID), `window.quartzGui.updates.runCoreUpdate(pfad)` per `evalfile` rufen. npm
  zum Scheitern bringen: `chmod 555 node_modules` (EACCES, vorübergehend) oder ein Paket, das es
  nicht gibt (E404, dauerhaft) — nur das erste ist die Lage „der Nutzer behebt es und startet
  erneut“. **Wo die eigenen Pakete im Abhängigkeitsblock stehen, entscheidet die Lage**:
  alphabetisch neben `@quartz-themes/core` gibt es einen Konflikt in beiden Paketdateien, ans Ende
  geschrieben mergt `package.json` sauber. Beides kommt vor, beides ist gemessen — such die dritte
  Lage.
- **Nicht gemessen** und deshalb offen für dich: die **gepackte** App; ein echter Push unter
  Git-Sync; ERESOLVE; die Notiz über einen Restore oder ein Duplikat hinweg; zwei Fenster derselben
  App; die VMs und die Linux-Pakete; der Maus-Drag mit dem schmalen Chip; die Sortierlisten in
  `Plugins/Installed` und `Styles/CustomCss`.

## Was diese Runde offen gelassen hat

Sieben Punkte sind bekannt und bewusst nicht behoben; sie stehen hier, damit du sie nicht als Fund
verkaufst, sondern schärfer stellst, falls sie mehr sind, als ich denke:

1. **Der Kommentar, den die App in eine neue `.gitignore` schreibt, ist deutsch** — auch in einer
   englischen Installation. Aufgefallen beim Nachsehen zu Nebenbei 4, nicht mit erledigt.
2. **`writeConfig` liest die vorhandene Datei ohne Fehlerprüfung.** `readConfig` wirft in allen
   Wegen der App vorher, also ist der Fall nicht erreichbar — „also“ ist das Wort, das dich
   interessiert.
3. **Ein Abbruch, der seinen eigenen Stash poppt, erwähnt einen älteren der App darunter nicht.**
   Unverändert seit dem achtzehnten Review; `coreUpdateStashEntry()` könnte ihn jetzt benennen.
4. **Ein gestageter Edit an einer Datei, die der Merge nicht anfasst, geht bei `merge --abort`
   still verloren.** Gits dokumentiertes `reset --merge`.
5. **Ein Klick auf den Griff ohne Bewegung wird als „bei sich selbst abgelegt“ angesagt.**
   Unverändert; der neue `backHome`-Satz betrifft `onDragOver`, nicht `onDragEnd`.
6. **Ein fremder Worktree steht in `git worktree list`** (`…/91e0b4cf…/scratchpad/old-tree`,
   `af1ffed`, detached). Er gehört einer anderen Sitzung; unangetastet.
7. **Die Notiz reist wörtlich in ein Duplikat mit**, jetzt samt Paketliste und dem neuen
   `filesAtHead`. Gemessen ist nur, *dass* sie es tut.

## Form der Befunde

Wie gehabt: je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was
schiefgeht, wie es sich zeigt und was dagegen spräche, es so zu lassen. Schreib das Ergebnis nach
`docs/REVIEW-2026-09-26.md`. Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund
wie jeder andere.
