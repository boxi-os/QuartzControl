Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist. Es geht um ein
Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Was diese Runde anders macht

**Zum ersten Mal schreibt die App einen Commit um, den sie nicht in diesem Lauf gemacht hat.** Das
Core-Update amendete bisher nur den Merge-Commit, den es selbst Sekunden vorher geschrieben hatte.
Jetzt erkennt ein Lauf den Merge-Commit eines *früheren* Laufs an HEAD wieder — über den SHA in der
Notiz `.quartz-gui/core-update.json` und den Betreff — und amendet ihn. Damit entscheidet die App
selbst, ob ein Commit noch umgeschrieben werden darf, und stützt diese Entscheidung auf **einen**
Wächter: `git branch -r --contains HEAD`. Das ist die riskanteste Stelle dieses Diffs.

**Zum ersten Mal widerlegt eine Runde einen Vorschlag ihres Vorgängers durch Messung.** Das
achtzehnte Review hatte `git stash show -p | git apply --check` als Gürtel vorgeschlagen, das
neunzehnte hat ihn übernommen — und diese Runde hat gemessen, dass er in einer von drei Lagen
genau falsch antwortet und einem Nutzer `git stash drop` für Einträge rät, die der Abbruch-Knopf
gleich zurückträgt. Eingebaut ist stattdessen eine andere Frage. **Auch sie ist eine Vorhersage**,
nur über gits `reset --merge`-Semantik statt über einen Patch — prüf sie mit demselben Misstrauen.

**Und diese Runde hat gemergt.** 21 Commits aus zwei Review-Runden, die auf Branches lagen, sind
per Fast-Forward nach `main` gegangen; vier Sätze in `CLAUDE.md`, die weiter „nicht gepusht und
nicht gemergt“ sagten, sind nachgezogen. `main` steht damit 23 Commits vor `origin/main` —
**gepusht ist nichts.** (Die Zahl stand zuerst als 22 hier: gezählt war vor dem Commit, der diese
Datei trägt, und der zählt mit, sobald er da ist. Derselbe Fehler wie bei einem Hash, den ein
Satz über seinen eigenen Commit nennt — zwanzigstes Review, Befund 5.)

In der Zählung von `CLAUDE.md` ist das das zwanzigste Review. Die Dateinamen zählen nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis; die Messungen hinter den Regeln stehen in `docs/decisions/`. Lies dann
`docs/REVIEW-2026-09-23.md` — die sieben Befunde, deren Fixes du liest, samt den Messungen, die sie
belegen, und seine Liste „Nebenbei aufgefallen“. Der Auftrag dazu steht in
`docs/REVIEW-2026-09-23-auftrag.md`.

## Umfang

`main`, **nicht gepusht**. Die elf Commits zwischen `review-2026-09-24` und `review-2026-09-25`
(zehn plus dieser Auftrag):

    git log --oneline review-2026-09-24..review-2026-09-25
    git diff review-2026-09-24..review-2026-09-25 -- . \
      ':!docs/REVIEW-2026-09-23.md' ':!docs/REVIEW-2026-09-24-auftrag.md'
    # 9 Dateien, +353 / −41
    # davon App-Code (electron/, src/):        6 Dateien, +169 / −27
    # davon docs/decisions/:                   2 Dateien, +88 / −3
    # davon CLAUDE.md:                         1 Datei,   +96 / −11
    #   davon 12 Zeilen der Absatz, den der Commit dieser Auftragsdatei mitbringt

Ausgenommen sind zwei Dateien: `docs/REVIEW-2026-09-23.md` (das Review, das du liest, statt es zu
prüfen) und diese Auftragsdatei. Mit dem Review-Dokument sind es 10 Dateien und +845; die Differenz
von 492 Zeilen ist das Review. Lies den Auftrag als Behauptung wie jede andere — die Zahlen oben
sind nach dem Commit nachgerechnet, der diese Datei trägt.

**Einen Hash für den Commit, der diese Datei trägt, nennt sie nicht** — er kann nicht in sich
selbst stehen, und der Versuch war Befund 6 des sechzehnten Reviews.
`git rev-parse review-2026-09-25^{commit}` beantwortet die Frage genauer.

`review-2026-09-24` sitzt auf `ff4feba` („Der Auftrag für das neunzehnte Review“), dem Stand, den
das letzte Review gelesen hat. Die Commits:

| Befund | Commit | Worum es geht |
| --- | --- | --- |
| — | `3785206` | das Review-Dokument selbst (ausgenommen) |
| 1 | `a632af2` | **Guard `e.target === e.currentTarget` an der Karte des Layout-Boards** |
| 2 | `87f4414` | **`setActivatorNodeRef` am Griff, als eigene Eigenschaft `dragHandleRef`** |
| 3 | `84ad268` | **beide Notiz-Schreibpfade in `try/catch`; neuer Text `updateNoteUnwritable`** |
| 4 | `d06c947` | **`abortWouldFreeStashedFiles()` als vierte Frage des Stash-Satzes** |
| 5 | `bd06048` | **`resuming`-Amend samt `headSubject()` und `headIsPushed()`** |
| 6 | `63e1517` | die `@dnd-kit`-Regel nennt zwei von drei Listen und die Ausnahme mit Grund |
| 7 | `deb1603` | drei Zahlen: 51 vs. 52 px, 0/35/118,5 vs. 0/2,5/53,5, das Duplikat |
| — | `bc7d774` | `CLAUDE.md`: Zählung, Absatz zur Runde, sechs Regeln, was sie hinterlässt |
| — | `34e4351` | vier Sätze über Branches, die inzwischen in `main` sind |
| — | — | dieser Auftrag |

**Im Handbuch-Vault liegt diesmal nichts** — diese Runde hat keine Handbuch-Seite angefasst.

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung — siehe „Wie gemessen werden kann“, bevor du eine Kopie anfasst.

## Was du wissen musst, bevor du liest

**Alle zehn Commits stammen von demselben Modell, das diesen Auftrag schreibt**, aus einer Sitzung;
das Review-Dokument `docs/REVIEW-2026-09-23.md` aus einer anderen. Lies Commit-Nachrichten als
Behauptungen. In diesem Projekt gilt eine Zahl in einer Commit-Nachricht als Messung; trägt sie
nicht, ist das ein Befund.

**Die Historie dieser neun Commits ist einmal umgeschrieben worden.** Beim ersten Fix ist eine
Kopie von `.claude/skills/run-desktop/driver.mjs` versehentlich mit `git add -A` eingecheckt und
danach per `git filter-branch --index-filter` aus allen Commits entfernt worden; die Backup-Ref ist
gelöscht. Das ist eine Behauptung wie jede andere: `git log --all -- .claude/skills/run-desktop/`
und ein Blick in die Commits selbst prüfen sie.

**Abwägungen, die ich selbst getroffen habe — prüf, ob sie tragen:**

- **`headIsPushed()` ist mein Zusatz, nicht der Vorschlag des Reviews.** Das Review wollte den
  Amend schlicht erweitern; ich habe einen Wächter davorgestellt, weil ein gepushter Merge-Commit
  sonst umgeschrieben würde. Der Wächter fragt `git branch -r --contains HEAD` und antwortet bei
  einem **gescheiterten** git-Aufruf mit „gepusht“, unterdrückt den Amend also im Zweifel. Ob das
  die richtige Richtung ist und ob die Frage die richtige ist, ist überlegt und an genau einer
  künstlichen Lage gemessen (`refs/remotes/origin/local` von Hand gesetzt).
- **`abortWouldFreeStashedFiles()` sagt voraus, was `merge --abort` tun wird.** Die Regel dahinter
  („`reset --merge` befreit einen Pfad genau dann, wenn der Merge um ihn geht“) ist an drei Lagen
  gemessen und sonst gelesen. Die Pfade kommen aus `git stash show --name-only refs/stash`; bei
  einem gescheiterten Aufruf antwortet die Funktion `false`, der Nutzer bekommt dann den
  vorsichtigeren Satz.
- **Keine Pfeile ans Layout-Board.** Das Review ließ die Wahl zwischen „Pfeile bauen“ und „die
  Ausnahme mit Grund nennen“; ich habe den Text gewählt, weil eine Board-Zeile in sechs Zonen und
  auf die Palette kann und ein Pfeilpaar davon eine Richtung von sieben beantwortet. Das ist ein
  Argument, keine Messung — und es lässt die Tastatur-Aufnahme als einzige Geste des Boards stehen.
- **Die Notiz bleibt im Duplikat.** Gemessen ist nur, *dass* sie wörtlich mitreist. Dass das die
  sichere Richtung ist (ein Install zu viel gegen einen Zustand zu wenig), ist überlegt; im Code
  steht jetzt ein Satz dazu statt eines `SKIP`-Eintrags.
- **Der Guard an der Karte verengt auf `e.target === e.currentTarget`.** Damit reagiert die Karte
  auf Tastendrücke nur noch, wenn sie selbst den Fokus hat. Gemessen sind Griff und Karte; ein
  drittes fokussierbares Kind in der Karte gibt es heute nicht — falls doch eines dazukommt, ändert
  sich sein Verhalten still.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Der Amend an einem fremden Commit (`bd06048`)

Die App ruft `git commit --amend` auf einen Commit, den ein *früherer* Lauf geschrieben hat. Die
Fragen dazu:

- **Reicht `git branch -r --contains HEAD` als Wächter?** Ein Projekt ohne Remote antwortet leer —
  richtig. Ein Projekt, dessen Remote-Tracking-Ref veraltet ist, weil der Push über einen anderen
  Weg lief, antwortet auch leer. Und `git push` über `quartz sync` in dieser App: schreibt der
  einen Remote-Tracking-Ref? Bau den Fall, in dem der Wächter „nein“ sagt und der Commit trotzdem
  draußen ist.
- **Stimmen die drei Bedingungen zusammen?** `pendingFor === headAfter`, Betreff == `MERGE_MESSAGE`,
  nicht gepusht. Gibt es einen Zustand, in dem alle drei zutreffen und der Amend trotzdem falsch
  ist — etwa, weil der Nutzer den Merge-Commit zwischen den Läufen selbst geändert hat, ohne dass
  sein SHA sich ändert? (Das geht nicht; aber prüf, ob es einen Weg gibt, auf dem der SHA der Notiz
  *zufällig* wieder HEAD ist.)
- **Und was amendet er?** `git add -- <tracked>` plus `commit --amend --no-edit`. Der Commit trägt
  danach ein Lockfile, das ein anderer Lauf geschrieben hat, unter demselben Datum und derselben
  Nachricht. Ist das die richtige Antwort auf „eine Änderung, die niemand gemacht hat“, oder wäre
  ein eigener Commit ehrlicher?

### 2. Die vierte Frage am Stash-Satz (`d06c947`)

- **Die Regel.** „Frei nach `merge --abort` ist ein Pfad, der HEAD gleicht oder zwischen HEAD und
  `MERGE_HEAD` liegt.“ Gemessen an drei Lagen (n7, n7h, n7b, siehe unten). Bau eine vierte:
  gestagete Änderung an `package.json`, Rename, ein Pfad, den der Stash kennt und HEAD nicht, ein
  Stash mit `--include-untracked`. Antwortet die Funktion dort richtig?
- **Die Gegenrichtung.** Der Satz `updateStashLeftover` rät zu `git stash show -p` und
  `git stash drop`. Gibt es jetzt eine Lage, in der er erscheint, obwohl der Knopf den Eintrag doch
  zurückträgt? Das wäre der Fehler, den die Messung dem `apply --check` nachgewiesen hat — nur in
  der neuen Fassung.
- **Der Preis.** Die Funktion läuft bei *jedem* Lauf, in dem ein Stash der App schon lag: drei
  git-Aufrufe mehr. Spielt das eine Rolle?

### 3. Die Notiz, die nicht mehr wirft (`84ad268`)

- **Zwei Türen, ein Satz.** `markInstallPending` und `clearInstallPending` teilen sich
  `updateNoteUnwritable`. Der Satz sagt „der nächste Lauf kann noch einmal installieren **oder**
  ‚nichts zu tun‘ melden“ — zwei Folgen in einem Satz, weil die zwei Türen zwei verschiedene
  hinterlassen. Ist das der Satz, den der Nutzer an der Stelle braucht, oder verlangt die Hausregel
  („ein Hinweis sagt, was passiert“) hier zwei?
- **`noteFailure` wird an zwei Rückgabepfade gehängt.** Gibt es einen dritten zwischen
  `markInstallPending` und dem Ende, der ihn verliert?
- **Die Lesehälfte ist unverändert.** Der Absatz in `snapshots-and-updates.md` behauptet, dass eine
  *kaputte* Datei beiseitegelegt wird und eine fehlende sich als „nichts“ liest. Das ist vom
  Vorgänger gemessen, von mir nicht neu.

### 4. Das Layout-Board (`a632af2`, `87f4414`)

- **Der Guard.** Er sitzt jetzt an der Karte des Boards und am Bereichsformular des Frame-Builders.
  Die dritte `@dnd-kit`-Stelle (`Plugins/Installed`, `SortableRow`) hat keinen — braucht sie einen?
  Prüf, ob dort ein Elternknoten auf Tastendrücke hört.
- **`dragHandleRef`.** Der Ref geht an ein `<span>`, auf das außerdem `{...dragHandleProps}`
  gespreizt wird. Die Reihenfolge im JSX ist `ref` vor dem Spread — prüf, ob der Spread ihn
  überschreiben kann, und ob `DragOverlay`s `ItemCard` (ohne Griff) davon unberührt bleibt.
- **Die Messung.** Der Fokus nach der Ablage ist an *einer* Bewegung gemessen (`footer` eine Zone
  nach oben) und an *einem* Projekt. Der Paletten-Chip, die leere Zone und der Frame-Builder sind
  nicht neu gemessen.

### 5. Die Dokumente (`63e1517`, `deb1603`, `bc7d774`, `34e4351`)

Drei neue Absätze in `snapshots-and-updates.md`, einer in `layout-frames.md`, ein Absatz und sechs
Regeln in `CLAUDE.md`. **Stimmen die Zahlen mit den Quellen überein?** Besonders: 51 px und 52 px
gegen die laufende App, „0 / 2,5 / 53,5“ gegen dieselbe Tastenfolge, die Diffzahlen gegen
`git diff --shortstat`, „1111 + 171 Schlüssel“ gegen `check:i18n`.

Und: `CLAUDE.md` sagt an vier Stellen etwas über den Merge-Zustand von Branches. Diese Runde hat
die vier nachgezogen, nachdem sie beim Merge falsch geworden waren. Sind sie **jetzt** richtig?
`git cherry main <branch>` über alle lokalen und entfernten Branches.

### 6. Was die Prüfskripte nicht sehen

`typecheck`, `build`, `smoke` (42 Aufrufe, still), `check:i18n` (1111 + 171 Schlüssel),
`check:core-update` (14 Fälle), `check:semver`, `check:plugin-names` und `check:handbook` sind auf
diesem Stand grün. Keines sieht die Notiz, den Stash, einen Merge-Konflikt, einen Amend oder einen
Tastatur-Drag. Was misst du, das sie nicht messen?

## Wie gemessen werden kann

- **Der Dienst ohne App**: esbuild-Bündel von `updateService.ts` bzw. `duplicateService.ts`
  (`--bundle --platform=node --format=cjs --tsconfig=tsconfig.node.json --external:electron`),
  `electron` über einen Stub mit `app.getPath`, `safeStorage.isEncryptionAvailable` und
  `BrowserWindow.getAllWindows`. Gegenseite ist ein lokales Repo mit vier Ständen — `A` (Basis),
  `B` (Pakete und Lockfile gehoben), `D` (auf `A`, nur `quartz/index.ts`, Konflikt **außerhalb** der
  Paketdateien), `E` (auf `B`, zusätzlich `quartz/index.ts`). Der Klon bekommt
  `git remote add quartz-upstream <pfad>`; damit `git fetch quartz-upstream HEAD` ohne Netz
  antwortet, zeigt HEAD des Upstream über `git symbolic-ref` auf einen Branch, den
  `git update-ref` auf den gewünschten Tag setzt (`branch -f` verweigert den ausgecheckten).
  Für eine Vorher-Messung: zweites Bündel aus einem `git worktree` auf `review-2026-09-24`.
- **npm und npx als Attrappen auf dem PATH**, mit Aufrufzähler: eines, das `install [--save-*]
  name@range` in den passenden Abschnitt schreibt, eines mit Exit 1, und ein `npx`, das
  `.quartz-gui` beim „Bauen“ selbst auf 555 setzt. Damit ist der Zustand von Dateien, Index, Stash,
  Notiz und Repo gemessen, **nicht**, was echtes npm tut.
- **Die Szenen dieser Runde**, je ein frischer Klon: `n1` (`.quartz-gui` auf 555), `n1b` (die Notiz
  lässt sich schreiben, aber nicht leeren), `n7`/`n7h`/`n7b` (der Stash-Satz in drei Lagen),
  `n10`/`n10p` (der Amend, mit und ohne gepushten Merge-Commit), `n4` (das Duplikat), `norm` (der
  gewöhnliche Weg). Die Skripte liegen nicht im Repo — sie sind im Scratchpad der Sitzung geblieben
  und müssen neu gebaut werden.
- **Die gebaute App**: `npm run build`, dann eine Kopie von `.claude/skills/run-desktop/driver.mjs`
  mit `--user-data-dir` auf ein Wegwerf-Verzeichnis. Die Kopie muss **im Repo** liegen, sonst findet
  node `playwright-core` nicht — und sie gehört nicht in einen Commit. Projekt per
  `window.quartzGui.projects.add` eintragen, alles Weitere über `evalfile`; `capture-pane -p |
  grep .`, sonst kommen leere Zeilen. Für den Tastatur-Drag erst per `evalfile` fokussieren
  (`el.focus()`, `document.activeElement` gegenprüfen), dann `press Space` / `press ArrowDown`,
  Zustand über `[role="status"]` **und** über die Karte selbst: Der Griff trägt eigenes
  `role="button"`, `closest('[role=button]')` findet deshalb den Griff statt der Karte.
  `navigations-testprojekt` hat ein echtes `content/`-Verzeichnis und ist die Kopiervorlage
  (`cp -Rc`).
- **Nicht gemessen** und deshalb offen für dich: die **gepackte** App; ein echtes `npm install`;
  ein echter Push unter Git-Sync (`n10p` setzt den Remote-Tracking-Ref von Hand); der
  Frame-Builder; der Paletten-Chip und die leere Zone nach den zwei Board-Änderungen; zwei Fenster
  derselben App; die VMs und die Linux-Pakete.

## Was diese Runde offen gelassen hat

Vier Punkte sind bekannt und bewusst nicht behoben; sie stehen hier, damit du sie nicht als Fund
verkaufst, sondern schärfer stellst, falls sie mehr sind, als ich denke:

1. **Ein Abbruch, der seinen eigenen Stash poppt, erwähnt einen älteren der App darunter nicht.**
   Unverändert seit dem achtzehnten Review (Szene x7).
2. **Nach einem gescheiterten `npm install` bringt der erneute Lauf die eigenen Pakete nicht
   zurück.** Er installiert und amendet jetzt (Befund 5), aber der Plan vergleicht gegen die
   Merge-Basis, und die hat die eigenen Pakete nie gehabt. Die Notiz könnte die Liste tragen — das
   wäre eine Erweiterung, keine Korrektur.
3. **Ein gestageter Edit an einer Datei, die der Merge nicht anfasst, geht bei `merge --abort`
   still verloren.** Gits dokumentiertes `reset --merge`; der Abbruch-Knopf erbt es, und
   `updateAbortBlockedByEdit` beschreibt nur den Fall, in dem git verweigert. (Aus der
   „Nebenbei“-Liste des neunzehnten Reviews.)
4. **Ein Klick auf den Griff ohne Bewegung wird als „bei sich selbst abgelegt“ angesagt** — der
   `PointerSensor` ohne Aktivierungsschwelle. Dazu sagt die Live-Region nach einem Maus-Drag den
   Namen, den der Zielindex *nach* der Änderung trägt; gemessen ist, dass beide Fassungen dieser
   Runde dasselbe tun, also ist es älter als sie.

## Form der Befunde

Wie gehabt: je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was
schiefgeht, wie es sich zeigt und was dagegen spräche, es so zu lassen. Schreib das Ergebnis nach
`docs/REVIEW-2026-09-24.md`. Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund
wie jeder andere.
