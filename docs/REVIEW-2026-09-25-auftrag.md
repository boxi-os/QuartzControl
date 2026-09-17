Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist. Es geht um ein
Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Was diese Runde anders macht

**Zum ersten Mal ist das Core-Update gegen echte Gegenseiten gelaufen.** Vier Runden haben an
dieser Maschinerie gebaut und jede hat an Attrappen gemessen — einem lokalen Repo als „Upstream“
und einem npm, das tut, was das Skript ihm sagt. Am Ende dieser Runde lief es an einer Kopie eines
echten Projekts, sieben Commits hinter `jackyzha0/quartz`, mit echtem `git fetch`, echtem npm und
durch die gebaute App. Das hat drei Fixes bestätigt — und **einen Fehler gezeigt, den vier Runden
Attrappen nicht finden konnten**: Der Lauf nach einem gescheiterten `npm install` trug die eigenen
Pakete des Projekts nicht wieder ein, meldete „Already up to date“ und Erfolg, während npm sie aus
`node_modules` entfernte. Der letzte Fix dieser Runde (`32ff038`) ist die Antwort darauf. **Die
Messung, die ihn belegt, ist die einzige dieser Serie ohne Attrappe — prüf sie besonders, denn sie
ist auch die einzige, die sich nicht auf Knopfdruck wiederholen lässt.**

**Diese Runde hat mehr behoben, als das Review gefunden hat.** Fünf Befunde standen im Dokument,
neun Fixes sind daraus geworden: vier Punkte aus der Liste „Nebenbei aufgefallen“ hat der Nutzer
ausdrücklich mit beauftragt. Einer davon war größer als sein Platz — im Frame-Builder bewegte
**kein Pfeildruck** einen Bereich, und dieselbe Ursache ließ am Layout-Board den ersten Druck
verpuffen, wo sie bis dahin dnd-kits `scrollTo` zugeschrieben war.

**Und diese Runde hat gepusht.** `main` und `origin/main` sind seit dem 2026-09-17 gleich
(`af1ffed..7621143`, 39 Commits: die Runden 17 bis 20 samt Review-Dokumenten und Aufträgen), dazu
die zwei Review-Tags, die als einzige noch fehlten. Was du liest, ist damit veröffentlicht — anders
als in den vier Runden davor.

In der Zählung von `CLAUDE.md` ist das das einundzwanzigste Review. Die Dateinamen zählen nach
Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis; die Messungen hinter den Regeln stehen in `docs/decisions/`. Lies dann
`docs/REVIEW-2026-09-24.md` — die fünf Befunde, deren Fixes du liest, samt den Messungen, die sie
belegen, und seine Liste „Nebenbei aufgefallen“, von der vier Punkte diesmal mit erledigt sind. Der
Auftrag dazu steht in `docs/REVIEW-2026-09-24-auftrag.md`.

## Umfang

`main`, gepusht. Die siebzehn Commits zwischen `review-2026-09-25` und `review-2026-09-26`
(sechzehn plus dieser Auftrag):

    git log --oneline review-2026-09-25..review-2026-09-26
    git diff review-2026-09-25..review-2026-09-26 -- . \
      ':!docs/REVIEW-2026-09-24.md' ':!docs/REVIEW-2026-09-25-auftrag.md'
    # 9 Dateien, +575 / −76
    # davon App-Code (electron/, src/):        4 Dateien, +250 / −62
    # davon docs/decisions/:                   3 Dateien, +167 / −0
    # davon CLAUDE.md:                         1 Datei,   +154 / −12
    #   davon 13 Zeilen der Absatz, den der Commit dieser Auftragsdatei mitbringt
    # davon docs/REVIEW-2026-09-24-auftrag.md: 1 Datei,   +4 / −2  (eine Zahl korrigiert)

Ausgenommen sind zwei Dateien: `docs/REVIEW-2026-09-24.md` (das Review, das du liest, statt es zu
prüfen) und diese Auftragsdatei. Mit dem Review-Dokument sind es 10 Dateien und +1026; die Differenz
von 451 Zeilen ist das Review. Lies den Auftrag als Behauptung wie jede andere — die Zahlen oben
sind nach dem Commit nachgerechnet, der diese Datei trägt.

**Einen Hash für den Commit, der diese Datei trägt, nennt sie nicht** — er kann nicht in sich
selbst stehen. `git rev-parse review-2026-09-26^{commit}` beantwortet die Frage genauer.

`review-2026-09-25` sitzt auf `9052691` („Der Auftrag für das zwanzigste Review“), dem Stand, den
das letzte Review gelesen hat. Die Commits:

| Woher | Commit | Worum es geht |
| --- | --- | --- |
| — | `05a35f9` | das Review-Dokument selbst (ausgenommen) |
| Befund 1 | `7d9057a` | **`git commit --amend --no-edit --only -- <pfade>` statt `add` + Amend** |
| Befund 2 | `00090ca` | **`abortOutcomeForStash()` mit drei Antworten; Text `updateStashMineBlocked`** |
| Befund 3 | `fda4132` | **`ourMergeCommit` gilt auch für den sauberen, nicht vorspulbaren Merge** |
| Befund 4 | `1e6c6c0` | nur der Kommentar an `headIsPushed()` |
| Befund 5 | `0728ee3` | zwei Zahlen (22 → 23 im Auftrag; +341 bleibt in der Commit-Nachricht) |
| — | `7dc520c` | `CLAUDE.md` und vier Nachträge in `docs/decisions/` |
| Nebenbei 1 | `db040c3` | **vierter Satz `updateStashFitsHead` für den Stash, dessen Basis HEAD ist** |
| Nebenbei 2 | `44c3d13` | **kein Amend, wenn die zwei Pfade nicht von HEAD abweichen** |
| Nebenbei 3 | `f0084e0` | **`readConfig` auf leerer und auf nicht-Mapping-Datei; Text `configNotAMapping`** |
| Nebenbei 4 | `cce9bf3` | **zwei Zeilen in `utils/dndKeyboard.ts` — jeder Tastatur-Drag der App** |
| — | `5fc3b00` | `CLAUDE.md` und drei weitere Nachträge |
| — | `2f96868` | der Fast-Forward nach `main` |
| Echter Lauf | `32ff038` | **die Notiz trägt die Liste der weggenommenen Pakete** |
| — | `014cb90` | `CLAUDE.md` und der Nachtrag über das erste echte Core-Update |
| — | `7621143` | vier Sätze über Branches, die inzwischen gepusht sind |
| — | — | dieser Auftrag |

**Im Handbuch-Vault liegt diesmal nichts** — diese Runde hat keine Handbuch-Seite angefasst.

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung — siehe „Wie gemessen werden kann“, bevor du eine Kopie anfasst.

## Was du wissen musst, bevor du liest

**Alle sechzehn Commits stammen von demselben Modell, das diesen Auftrag schreibt**, aus einer
Sitzung; das Review-Dokument `docs/REVIEW-2026-09-24.md` aus einer anderen. Lies
Commit-Nachrichten als Behauptungen. In diesem Projekt gilt eine Zahl in einer Commit-Nachricht als
Messung; trägt sie nicht, ist das ein Befund.

**Zwei Commits sind nach dem Schreiben noch einmal angefasst worden** (`git commit --amend`, vor
dem Push): `5fc3b00`, weil eine Kopie von `.claude/skills/run-desktop/driver.mjs` versehentlich mit
`git add -A` hineingeraten war — derselbe Fehler, den der Vorgänger per `filter-branch` beheben
musste, diesmal im letzten Commit und damit ohne Umschreiben der Historie; und mehrfach für Zahlen,
die erst nach dem Commit nachgerechnet werden konnten. `git log --all -- .claude/skills/` prüft die
erste Behauptung.

**Abwägungen, die ich selbst getroffen habe — prüf, ob sie tragen:**

- **`--only` ist eine git-Feinheit, die ich einmal an vier Lagen gemessen habe.** Ein Amend mit
  Pfaden nimmt sie aus dem *Arbeitsbereich*, lässt den übrigen Index stehen und behält beide
  Merge-Eltern; git verweigert es nur, solange ein Merge läuft. Gemessen: am Merge-Commit, bei
  unveränderten Pfaden, bei einem Pfad, den HEAD nicht kennt, und mitten in einem Merge. Was ich
  *nicht* geprüft habe: was `--only` mit einem Pfad tut, den der Index anders trägt als der
  Arbeitsbereich — die App prüft das vorher (`stagedApartFromWorkingTree`), aber erst *vor* dem
  Merge, nicht vor dem Amend.
- **`abortOutcomeForStash()` ist die dritte Fassung derselben Vorhersage in drei Runden.** Das
  achtzehnte Review schlug `apply --check` vor, das neunzehnte baute es ein, das zwanzigste maß,
  dass es falsch antwortet, und baute `diff HEAD` — und maß dann, dass *das* falsch antwortet. Jetzt
  steht dort `git diff --name-only` (Arbeitsbereich gegen Index) plus der Merge-Vergleich, mit
  **drei** Ausgängen. Gemessen an vier Lagen (s3/s4, je gestaget und ungestaget). Der dritte
  Ausgang hat einen neuen Satz bekommen; ob drei Sätze an dieser Stelle noch jemand liest, ist eine
  Frage, die ich nicht beantwortet habe.
- **`ourMergeCommit` zu erweitern ist die Änderung mit der größten Reichweite für normale Nutzer.**
  Bisher amendete nur der Konfliktzweig; jetzt amendet auch der saubere, nicht vorspulbare Merge —
  also bei jedem Projekt mit eigenen Commits, dessen Update ohne Konflikt durchgeht. Erkannt wird
  er daran, dass HEAD nach dem Merge weder dort steht, wo er stand, noch auf dem Geholten. Das ist
  an Attrappen und einmal echt gemessen; ob es eine vierte Art gibt, wie HEAD sich bewegt, habe ich
  überlegt und nicht ausprobiert.
- **Den `@{upstream}`-Wächter habe ich verworfen, nicht vergessen.** Das Review schlug ihn als
  Zusatz zu `headIsPushed()` vor. Er fiele in jedem Projekt ohne Git-Sync an — das ist der
  Normalfall — und der Amend fiele dort aus, obwohl nichts die Maschine verlassen kann. Das ist ein
  Argument, keine Messung.
- **Die zwei Zeilen im Pfeil-Getter betreffen jeden Tastatur-Drag der App**, also vier Stellen, von
  denen ich zwei gemessen habe (Frame-Builder, Layout-Board). `Plugins/Installed` und die
  Ladereihenfolge in `Styles/CustomCss` habe ich **nicht** angefasst und **nicht** gemessen; beide
  sind Sortierlisten, und dort ist das kleinste Ziel, das den Ausgangspunkt enthält, die gezogene
  Zeile selbst — die Regel sollte dort nichts ändern. „Sollte“ ist das Wort, das dich interessiert.
- **Warum dnd-kit das gezogene Rect 26,5 px hoch meldet, wo das DOM-Element 48 hat, weiß ich
  nicht.** Der Fix kommt ohne diese Antwort aus; die Frage bleibt offen und steht in `CLAUDE.md`
  unter „nicht gemessen“. Wenn die Messung falsch ist, betrifft sie mehr als den Getter.
- **`readConfig` wirft jetzt** — bei einem Dokument, das kein Mapping ist. Die Funktion wird an 19
  Stellen gerufen; ich habe nicht jede davon daraufhin gelesen, wer den Wurf fängt und was der
  Nutzer dann sieht. Eine *leere* Datei wirft nicht mehr, das ist die Korrektur.
- **Die Liste in der Notiz wird geprüft, nicht gecastet**, weil sie zu `npm install name@range`
  wird: verworfen wird, was kein nicht-leerer String ist oder mit `-` beginnt. Die Prüfung ist von
  Hand geschrieben, nicht zod — `.quartz-gui/` ist keine IPC-Grenze, aber es ist fremde Platte.
- **Ein Satz statt zwei bei `updateStashFitsHead`.** Gemessen: `git stash pop` gelingt bei einer
  *gestageten* Änderung an derselben Datei (Auto-Merge) und verweigert bei einer *ungestageten*
  sauber. Der Satz rät zum Pop, ohne diese zwei Fälle zu trennen — weil der zweite mit gits eigener
  Meldung endet und nichts verloren geht. Das ist eine Abwägung gegen die Hausregel „zwei Arten zu
  scheitern, zwei Antworten“.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Der echte Lauf und was er nicht gesehen hat (`32ff038`)

Die Messung, die diesen Fix belegt, ist in `docs/decisions/snapshots-and-updates.md` beschrieben.
Sie hat einen Ausgangszustand, den ein Skript hergestellt hat (`git reset --hard f1fba3f`, eigene
Theme-Pakete wieder eingetragen, `npm install`) — **prüf, ob dieser Zustand die Lage trifft, die er
nachstellen soll.** Ein Projekt, dessen Nutzer seine Änderungen committet, ist nicht dasselbe wie
eines, das sie uncommittet hält; beide kommen vor, gemessen ist beides, aber die Schlüsse daraus
stehen nebeneinander, ohne dass jemand sie getrennt hat.

Dann die Erweiterung selbst: Die Notiz trägt jetzt zwei Dinge, die zusammengehören müssen — den SHA
und die Liste. Was passiert, wenn sie auseinanderlaufen? Ein Restore, ein Duplikat, ein
`git reset` zwischen zwei Läufen, zwei Fenster derselben App. Was passiert, wenn die Liste ein
Paket nennt, das der Nutzer inzwischen selbst entfernt hat — trägt der Lauf es gegen seinen Willen
wieder ein? (`stillMissing` filtert auf „steht nicht in package.json“, also: ja, wenn er es entfernt
hat, und nein, wenn er es mit anderer Version eingetragen hat. Ist das die richtige Richtung?)

### 2. Der Amend, zum dritten Mal in drei Runden (`7d9057a`, `fda4132`, `44c3d13`, `1e6c6c0`)

Drei Änderungen an einer Stelle, die jedes Update anfasst: *womit* amendet wird (`--only`), *wann*
(auch der saubere Merge), und *ob überhaupt* (nicht, wenn nichts abweicht). Die drei zusammen
ergeben eine Menge von Fällen, die keiner der drei Commits vollständig aufschreibt. Stimmen sie
zusammen? Gibt es eine Lage, in der die Erweiterung aus `fda4132` und der Wächter aus `44c3d13`
einander widersprechen — etwa ein Fast-Forward, nach dem npm doch etwas schreibt?

Und: Der Amend unter `resuming` schreibt einen Commit um, dessen Autor-Datum aus dem früheren Lauf
stammt. Nach `--only` gilt das weiter. Was sieht ein Nutzer unter Git-Sync, dessen Commit-Liste
plötzlich einen anderen Hash für denselben Betreff zeigt?

### 3. Die dritte Vorhersage über `reset --merge` (`00090ca`, `db040c3`)

Vier Sätze gibt es jetzt für einen liegengebliebenen Stash: „trägt ihn wieder ein“, „trägt ihn
wieder ein, sobald …“, „passt auf den jetzigen Stand … `git stash pop`“ und „gehört zu einem Stand,
den es nicht mehr gibt“. Die ersten drei sind Vorhersagen über das, was gleich passiert. **Bau die
Lagen, die im Dokument nicht stehen**: ein Stash, den nicht die App geschrieben hat, aber mit
unserem Präfix; einer mit `--include-untracked`; einer, dessen Pfade seit dem Stashen umbenannt
wurden; zwei Stashes übereinander; ein `refs/stash`, das auf einen Commit ohne zweiten Elternteil
zeigt.

### 4. Der Pfeil-Getter (`cce9bf3`)

Zwei Zeilen, vier Aufrufstellen, zwei gemessen. Die Regel „der Schritt beginnt in der Mitte des
kleinsten Ziels, in dem man steht“ ist neu erfunden — es gibt sie in `@dnd-kit` nicht. **Such die
Lage, in der sie falsch liegt:** überlappende Ziele, ein Ziel, das größer ist als der Bildschirm,
ein Punkt, der in *keinem* Ziel liegt (dann bleibt `from` das gezogene Zentrum — ist das richtig?),
ein Raster mit Zellen ungleicher Größe. Und prüf die zwei Stellen, die ich nicht gemessen habe.

### 5. Der Wurf in `readConfig` (`f0084e0`)

19 Aufrufer. Welche fangen, welche nicht, und was sieht der Nutzer in beiden Fällen? Besonders:
`repointProjectPaths` beim Duplizieren (der Weg, auf dem der Befund gefunden wurde),
`buildService` vor einem Build, die Routen, die beim Mount lesen. Ein Wurf, der als roter Toast
ankommt, ist besser als ein `TypeError` — aber ist er überall ein Toast?

### 6. Die Dokumente (`7dc520c`, `5fc3b00`, `014cb90`, `2f96868`, `7621143`, `0728ee3`)

Sieben Nachträge in `docs/decisions/`, rund 154 neue Zeilen in `CLAUDE.md`, vier korrigierte Sätze
über den Push-Zustand. Jede Zahl darin ist eine Messung oder ein Befund. Zwei Stellen, an denen
ich es selbst schon einmal falsch hatte: die Diff-Zahlen dieses Absatzes (dreimal nachgerechnet,
weil jede Korrektur die Zahl ändert) und „36 Commits vor `origin/main`“, was beim Schreiben stimmte
und beim nächsten Commit nicht mehr.

### 7. Was die Prüfskripte nicht sehen

`npm run typecheck`, `build`, `smoke` (42 Aufrufe), `check:i18n` (1111 + 174 Schlüssel),
`check:core-update` (14 Fälle), `check:semver`, `check:plugin-names` und `check:handbook` sind auf
diesem Stand grün. Keines sieht die Notiz, den Stash, einen Merge, einen Amend, einen Tastatur-Drag
oder eine kaputte `quartz.config.yaml`. Was misst du, das sie nicht messen?

## Wie gemessen werden kann

- **Der Dienst ohne App**: esbuild-Bündel von `updateService.ts` bzw. `configService.ts`
  (`--bundle --platform=node --format=cjs --tsconfig=tsconfig.node.json --external:electron`),
  `electron` über einen Stub mit `app.getPath`, `safeStorage.isEncryptionAvailable` und
  `BrowserWindow.getAllWindows`. Gegenseite ist ein lokales Repo mit vier Ständen — `A` (Basis),
  `B` (Pakete und Lockfile gehoben), `D` (auf `A`, nur `quartz/index.ts`, Konflikt **außerhalb** der
  Paketdateien), `E` (auf `A`, zusätzlich `package.json`). Der Klon bekommt
  `git remote add quartz-upstream <pfad>`; damit `git fetch quartz-upstream HEAD` ohne Netz
  antwortet, zeigt HEAD des Bare-Repos über `git symbolic-ref` auf den gewünschten Branch. Für eine
  Vorher-Messung: zweites Bündel aus einem `git worktree` auf `review-2026-09-25`.
- **npm und npx als Attrappen auf dem PATH**, mit Aufrufzähler. Diese Runde brauchte eine dritte:
  ein `npm`, das **nichts schreibt** — denn echtes npm lässt das Lockfile bei unverändertem
  `package.json` oft stehen, und die zwei älteren Attrappen schrieben es bei jedem Aufruf neu. Genau
  das hatte einen Fix verdeckt.
- **Der echte Lauf**, und er ist die Mühe wert: `cp -Rc` von `navigations-testprojekt` (echtes
  `content/`-Verzeichnis, drei eigene Theme-Pakete), dann `git reset --hard f1fba3f` — sieben
  Upstream-Commits zurück, von denen fünf die Paketdateien anfassen —, die eigenen Pakete wieder in
  `package.json`, `npm install`. Danach über die gebaute App: Projekt mit
  `window.quartzGui.projects.add` eintragen, `window.quartzGui.updates.runCoreUpdate(pfad)` rufen.
  Ein Lauf dauert 8-9 Sekunden. npm zum Scheitern bringen: `chmod 555 node_modules` (EACCES,
  vorübergehend) oder ein Paket, das es nicht gibt (E404, dauerhaft) — die zwei antworten
  verschieden, und nur das erste ist die Lage „der Nutzer behebt es und startet erneut“.
- **Die gebaute App**: `npm run build`, dann eine Kopie von `.claude/skills/run-desktop/driver.mjs`
  mit `--user-data-dir` auf ein Wegwerf-Verzeichnis. Die Kopie muss **im Repo** liegen, sonst findet
  node `playwright-core` nicht — und sie gehört nicht in einen Commit (diese Runde hat genau das
  einmal falsch gemacht). `capture-pane -p | grep .`, sonst kommen leere Zeilen. Für den
  Tastatur-Drag erst per `evalfile` fokussieren, dann `press Space` / `press ArrowDown`, Zustand
  über `[role="status"]`. Wer den Getter selbst verstehen will, baut eine Sonde hinein
  (`window.__dndProbe = {…}` vor dem `return`) — so ist die Ursache dieser Runde gefunden worden.
- **Nicht gemessen** und deshalb offen für dich: die **gepackte** App; ein echter Push unter
  Git-Sync; was echtes npm bei ERESOLVE oder bei `--save-prod` auf ein Paket in einem anderen
  Abschnitt tut; die Notiz über einen Restore oder ein Duplikat hinweg; zwei Fenster derselben App;
  die VMs und die Linux-Pakete; die zwei `@dnd-kit`-Stellen außerhalb des Layout-Bereichs.

## Was diese Runde offen gelassen hat

Sechs Punkte sind bekannt und bewusst nicht behoben; sie stehen hier, damit du sie nicht als Fund
verkaufst, sondern schärfer stellst, falls sie mehr sind, als ich denke:

1. **Warum dnd-kit das gezogene Rect im Frame-Builder 26,5 px hoch meldet**, wo das Element 48 hat.
   Der Fix umgeht es; wenn die Messung anderswo auch falsch ist, betrifft sie die Maus-Kollision im
   `closestCenter`-Zweig mit.
2. **Ein Abbruch, der seinen eigenen Stash poppt, erwähnt einen älteren der App darunter nicht.**
   Unverändert seit dem achtzehnten Review.
3. **Ein gestageter Edit an einer Datei, die der Merge nicht anfasst, geht bei `merge --abort`
   still verloren.** Gits dokumentiertes `reset --merge`. Neu ist, dass der Stash-Satz das jetzt
   *einrechnet* (Befund 2 des zwanzigsten Reviews) — die App sagt also einen Verlust voraus, den sie
   nicht nennt.
4. **Ein Klick auf den Griff ohne Bewegung wird als „bei sich selbst abgelegt“ angesagt.**
5. **Ein fremder Worktree steht in `git worktree list`** (`…/91e0b4cf…/scratchpad/old-tree`,
   `af1ffed`, detached). Er gehört einer anderen Sitzung; unangetastet.
6. **Die Notiz reist wörtlich in ein Duplikat mit.** Gemessen ist nur, *dass* sie es tut; jetzt
   trägt sie zusätzlich eine Paketliste, und ob die im Duplikat noch stimmt, hat niemand gemessen.

## Form der Befunde

Wie gehabt: je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was
schiefgeht, wie es sich zeigt und was dagegen spräche, es so zu lassen. Schreib das Ergebnis nach
`docs/REVIEW-2026-09-25.md`. Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund
wie jeder andere.
