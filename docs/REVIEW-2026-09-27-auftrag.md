Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist. Es geht um ein
Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Was diese Runde anders macht

**Die Runde davor hat sich selbst gelesen, und das ist der Grund, warum es dich gibt.** Das
zweiundzwanzigste Review (`docs/REVIEW-2026-09-26.md`) stammt vom selben Modell und aus derselben
Sitzung wie die 27 Commits, die es prüfte. Es sagt das oben in seinem eigenen Dokument, und es hat
daraus die Konsequenz gezogen, fast alles zu **messen** statt zu lesen — aber die Blindstelle, die
bleibt, kann es nicht selbst benennen: Wer die Absicht hinter dem Code kennt, sucht dort nicht, wo
sie plausibel klingt.

**Deine wichtigste Aufgabe ist deshalb eine ungewöhnliche: Prüf das Review, nicht nur die Fixes.**
`docs/REVIEW-2026-09-26.md` ist diesmal **nicht** von der Prüfung ausgenommen — anders als in allen
Runden davor, wo das Review-Dokument das war, was man liest, statt es zu prüfen. Drei Fragen daran:

1. **Sind seine vier Befunde die richtigen vier?** Es hat drei Bereiche abgesucht (Core-Update,
   Drag, Seiten, die nicht laden) und zwei Prüfungen als „kein Befund“ abgeschlossen. Was hat es
   nicht angesehen?
2. **Trägt jede seiner Messungen, was sie behauptet?** Es nennt Szenen, Zahlen und Läufe. Die sind
   nachstellbar; die Anleitung dafür steht unten.
3. **Sind seine zwei „kein Befund“ wirklich keine?** Beide widerlegen die Erwartung des Reviews —
   genau die Stellen, an denen ein Modell, das seinen eigenen Code liest, gern aufhört.

Dazu kommen die vier Fixes, die aus dem Review entstanden sind. Einer davon ist eine Korrektur an
einer Korrektur an einer Korrektur: Die Paketliste im Core-Update wurde in drei aufeinander
folgenden Runden dreimal anders gebunden.

In der Zählung von `CLAUDE.md` ist das das dreiundzwanzigste Review. Die Dateinamen zählen nach
Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis — es ist lang, und der Abschnitt „Befunde aus den Reviews“ am Ende erklärt, wie
diese Serie arbeitet. Die Messungen hinter den Regeln stehen in `docs/decisions/`. Lies dann
`docs/REVIEW-2026-09-26.md` (das Review, das du prüfst) und seinen Auftrag
`docs/REVIEW-2026-09-26-auftrag.md`.

**Zwei Regeln dieses Projekts, die über allem stehen:**

- Eine Zahl in einer Commit-Nachricht oder in einem Dokument ist eine **Messung**. Trägt sie nicht,
  ist das ein Befund — auch wenn sonst alles stimmt.
- „Kann nicht prüfen“ ist nie „alles gut“. Wenn du etwas nicht messen kannst, schreib hin, dass du
  es nicht konntest, statt es zu übergehen.

## Umfang

`main`, gepusht. Die acht Commits zwischen `review-2026-09-27` und `review-2026-09-28` (sieben plus
dieser Auftrag):

    git log --oneline review-2026-09-27..review-2026-09-28
    git diff review-2026-09-27..review-2026-09-28 -- . ':!docs/REVIEW-2026-09-27-auftrag.md'
    # 12 Dateien, +353 / −13
    # davon App-Code (electron/, src/):        6 Dateien, +87 / −8
    # davon docs/REVIEW-2026-09-26.md:         1 Datei,  +207 / −0   (Prüfgegenstand, nicht ausgenommen)
    # davon docs/decisions/:                   3 Dateien, +17 / −0
    # davon CLAUDE.md:                         1 Datei,   +41 / −4

Ausgenommen ist **nur** diese Auftragsdatei. Die Zahlen oben sind nach dem Commit nachgerechnet,
der sie trägt; einen Hash für diesen Commit nennt sie nicht, weil er nicht in sich selbst stehen
kann — `git rev-parse review-2026-09-28^{commit}` beantwortet das genauer.

`review-2026-09-27` sitzt auf `918b281` („Die sieben offenen Punkte sind abgearbeitet“), dem Stand,
den das zweiundzwanzigste Review gelesen hat. Die Commits:

| Woher | Commit | Worum es geht |
| --- | --- | --- |
| — | `92c9215` | **das Review-Dokument selbst — diesmal Prüfgegenstand** |
| Befund 1 | `4f86e22` | **die Paketliste wird geleert, sobald npm sie eingetragen hat** |
| Befund 2 | `cbf6b6d` | **Fehlerzustand für den Übersetzungen-Reiter und `ProjectLayout`** |
| Befund 3 | `5b12545` | **`dnd.pickedOver` statt Schweigen bei der ersten Zielmeldung** |
| Befund 4 | `8b7f2b9` | eine Zahl im Auftrag der Vorrunde (dreizehn → elf) |
| — | `b25a307` | drei Nachträge in `docs/decisions/` |
| — | `fa65305` | `CLAUDE.md`: drei Regeln und der Absatz über die Runde |
| — | — | dieser Auftrag |

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung — siehe „Wie gemessen werden kann“, bevor du eine Kopie anfasst. Wenn du
etwas leihst, gib es zurück, auch wenn dein Lauf abbricht.

## Was du wissen musst, bevor du liest

**Alle sieben Commits und das Review stammen von demselben Modell**, aus einer Sitzung; dieser
Auftrag ebenfalls. Lies alles davon als Behauptung.

**Abwägungen, die in dieser Runde getroffen wurden — prüf, ob sie tragen:**

- **Die Paketliste in `.quartz-gui/core-update.json` ist in drei Runden dreimal anders gebunden
  worden**, und das ist die Stelle, an der ich am ehesten einen Fehler vermute:
  1. *zwanzigste Runde*: Die Liste kam überhaupt erst dazu, gebunden an den Commit (SHA), für den
     sie geschrieben wurde.
  2. *einundzwanzigste Runde*: Die SHA-Bindung fiel, weil ein einziger Commit zwischen zwei Läufen
     sie verfallen ließ. Begründung: Nach dem Merge ist `package.json` upstreams, also könne der
     Nutzer ein Paket gar nicht „daraus entfernt“ haben.
  3. *zweiundzwanzigste Runde*: Genau das ging schief, sobald die Notiz einen Absturz überlebt —
     dann hat npm die Pakete längst wieder eingetragen, und der Nutzer kann sehr wohl eines
     entfernen. Jetzt wird die **Liste** geleert, sobald npm sie eingetragen hat, während SHA und
     `filesAtHead` stehen bleiben.

  **Such den vierten Fall.** Die Frage, die alle drei Fassungen beantworten wollen, lautet: „Welche
  Pakete hat ein abgebrochener Lauf aus `package.json` genommen, und gelten sie noch?“ Ist die
  jetzige Antwort vollständig? Was ist mit einem Lauf, der *zwischen* dem Schreiben der Notiz und
  dem npm-Aufruf stirbt? Mit zwei Projekten, die denselben Ordner teilen? Mit einem Restore, der
  eine ältere Notiz zurückbringt?
- **`filesAtHead` entscheidet über einen `git commit --amend`**, also darüber, ob die App einen
  Commit im Repository des Nutzers umschreibt. Es wird vor dem Merge gemessen, in der Notiz
  weitergereicht und vom fortsetzenden Lauf noch einmal durch seine eigene Messung bestätigt. Drei
  Stellen, eine Entscheidung — **prüf, ob sie dasselbe meinen.**
- **Der Übersetzungen-Reiter unterscheidet jetzt zwei Sorten Lesevorgang**: einer, der die Seite
  trägt (Fehlerzustand), und einer, der nur eine Vorauswahl bestimmt (`.catch(() => null)` und
  weiter). Die Unterscheidung ist von Hand getroffen — prüf sie je Aufruf, auch an den anderen
  Seiten.
- **`ProjectLayout` behandelt `null` als „Projekt nicht mehr in der Liste“.** Das ist eine
  Interpretation: `projects.open` könnte aus anderen Gründen `null` liefern. Prüf, welche.
- **Die Drag-Ansagen haben jetzt vier Sätze** (`picked`, `pickedOver`, `backHome`, `droppedHome`)
  und zwei Refs, die eine Funktion im Render-Body hält. Prüf, was bei zwei überlappenden Drags
  passiert, bei einem Drag, den ein Re-Render unterbricht, und ob ein Screenreader die Region
  wirklich in der Reihenfolge liest, die die Sätze annehmen.
- **Das Review hat zwei Dinge geprüft und für unbedenklich erklärt**: den Maus-Drag mit dem
  schmalen `DragOverlay`-Chip und einen Build mit kaputter `quartz.config.yaml`. Beide Male lautete
  die Erwartung „Befund“ und das Ergebnis „keiner“. Das sind die zwei Stellen, an denen ich am
  wenigsten Vertrauen in mein eigenes Urteil habe.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Das Review selbst (`92c9215`)

Lies `docs/REVIEW-2026-09-26.md` als Behauptungssammlung. Es nennt Szenen (`r1`, `r2`, `h1`, `norm`),
Zahlen und Läufe an der gebauten App. **Stell zwei davon nach** — such dir die aus, die dir am
wenigsten plausibel vorkommen. Und beantworte die Frage, die es sich selbst nicht stellen konnte:
Welchen Bereich hat es *nicht* angesehen? Kandidaten, die in dieser Serie schon einmal etwas
hergaben: die Vorlagen-Pakete (`templatePackage/`), die Veröffentlichen-Seite, der Snapshot-Store,
die eingebettete Node-Laufzeit.

### 2. Die Paketliste und der Amend (`4f86e22`)

Die dritte Fassung derselben Bindung in drei Runden (oben). `runCoreUpdateFrom` in
`electron/main/services/updateService.ts` ist lang; lies den Abschnitt von
`const pending = await readPendingInstall(...)` bis zum Amend am Stück und frag bei jeder Zeile,
welchen der drei Läufe sie beschreibt: den, der merged; den, der fortsetzt; den, für den es nichts
zu tun gibt. **Der Amend ist die einzige Stelle, an der diese App Geschichte umschreibt**, die der
Nutzer selbst gemacht hat — dort lohnt jede Minute.

### 3. Die zwei Seiten (`cbf6b6d`)

Der dritte Anlauf an derselben Sorte Fehler (Stile-Seite, dann diese zwei). **Ist es jetzt
vollständig?** Der Weg dorthin war eine Suche nach `common.loading` ohne `catch`; such anders, zum
Beispiel über die Kanäle statt über die Seiten: Welcher IPC-Aufruf im Renderer hat keinen
Fehlerpfad, und was steht auf dem Bildschirm, wenn er scheitert?

### 4. Die Drag-Ansagen (`5b12545`)

Vier Sätze, zwei Refs, drei Aufrufstellen. Die Bedingung, die entscheidet, vergleicht **Namen**,
nicht Ids — weil der Name das ist, was vorgelesen wird. Such den Fall, in dem zwei verschiedene
Dinge denselben Namen tragen.

### 5. Die Dokumente (`8b7f2b9`, `b25a307`, `fa65305`)

Drei Nachträge, drei neue Regeln, eine korrigierte Zahl. Jede Zahl darin ist eine Messung. In
dieser Serie ist „eine Zahl gehört zu dem, woran sie gemessen wurde“ der Befund, der in **sechs**
aufeinander folgenden Runden vorkam — zuletzt in der Datei, die genau davor warnt.

### 6. Was die Prüfskripte nicht sehen

`npm run typecheck`, `build`, `smoke` (42 Aufrufe), `check:i18n` (1116 + 180 Schlüssel),
`check:core-update`, `check:semver`, `check:plugin-names` und `check:handbook` sind auf diesem Stand
grün. Keines sieht die Notiz, einen Merge, einen Amend, einen Tastatur-Drag, eine kaputte
`quartz.config.yaml` oder eine Seite, die nicht lädt. Was misst du, das sie nicht messen?

## Wie gemessen werden kann

- **Der Dienst ohne App**: esbuild-Bündel von `updateService.ts` bzw. `configService.ts`
  (`npx esbuild <datei> --bundle --platform=node --format=cjs --tsconfig=tsconfig.node.json
  --external:electron`), `electron` über einen Stub mit `app.getPath`,
  `safeStorage.isEncryptionAvailable` und `BrowserWindow.getAllWindows`. Gegenseite ist ein lokales
  Repo mit den Ständen `A` (Basis), `D` (auf `A`, nur `quartz/index.ts` — Konflikt **außerhalb** der
  Paketdateien) und `E` (auf `A`, zusätzlich `package.json` und Lockfile). Der Klon bekommt
  `git remote add quartz-upstream <pfad>`; damit `git fetch quartz-upstream HEAD` ohne Netz
  antwortet, zeigt HEAD des Bare-Repos über `git symbolic-ref` auf einen Branch. Für eine
  Vorher-Messung: zweites Bündel aus `git archive <tag>` — **kein Worktree**, dann bleibt das Repo
  unberührt.
- **npm und npx als Attrappen auf dem PATH**, mit Aufrufprotokoll, in drei Betriebsarten: schreibt
  (trägt `install name@range` in den passenden Abschnitt ein und schreibt das Lockfile neu),
  scheitert, schreibt nichts. Ein viertes Muster kam in dieser Runde dazu und ist nützlich: ein
  `npx`, das beim „Bauen“ `chmod 555 .quartz-gui` macht — damit scheitert das Räumen der Notiz, und
  genau dieser Zustand ist der Gegenstand von Befund 1.
- **Die gebaute App**: `npm run build`, dann eine Kopie von `.claude/skills/run-desktop/driver.mjs`
  **im Scratchpad** mit `--user-data-dir` auf ein Wegwerf-Verzeichnis, `node_modules` als Symlink
  daneben und `APP_DIR` fest auf das Repo — so liegt keine Treiber-Kopie im Repo. Das Profil liegt
  **direkt** im `--user-data-dir` (nicht in einem Unterordner), und die Projekt-ID in
  `projects.json` muss eine echte UUID sein, sonst weist das zod-Schema sie ab. `capture-pane -p |
  grep .`, sonst kommen leere Zeilen; nach `quit` die tmux-Session neu aufbauen statt den Driver
  nachzustarten. Für einen Tastatur-Drag erst per `evalfile` fokussieren (`el.focus()`, dann
  `document.activeElement` gegenprüfen), dann `press Space` / `press ArrowRight`, Zustand über
  `[role="status"]`. Für den Maus-Drag `drag <x1> <y1> <x2> <y2> <steps>`, und vorher
  `scrollIntoView` — das Fenster ist 1280×800, ein Punkt darunter liegt außerhalb.
- **Der echte Lauf**, wenn du das Core-Update ernsthaft prüfen willst: `cp -Rc` von
  `~/Documents/QuartzProjekte/navigations-testprojekt`, dann `git reset --hard f1fba3f` — sieben
  Upstream-Commits zurück, fünf davon fassen die Paketdateien an —, die eigenen Pakete
  (`@quartz-themes/default` und `minimal`, beide `^1.0.1`) wieder in `package.json`, `npm install`.
  Danach über die gebaute App: Projekt in die `projects.json` des Wegwerf-Profils eintragen,
  `window.quartzGui.updates.runCoreUpdate(pfad)` per `evalfile` rufen. Ein Lauf dauert 8–9 Sekunden
  und braucht Netz. npm zum Scheitern bringen: `chmod 555 node_modules` (EACCES, vorübergehend).
  **Wo die eigenen Pakete im Abhängigkeitsblock stehen, entscheidet die Lage**: alphabetisch neben
  `@quartz-themes/core` gibt es einen Konflikt in beiden Paketdateien, ans Ende geschrieben mergt
  `package.json` sauber.
- **Nicht gemessen** und deshalb offen für dich: die **gepackte** App; die Linux-VMs; ERESOLVE; ein
  echter Push unter Git-Sync; ein Restore über die Notiz hinweg; zwei Fenster derselben App; ein
  Screenreader an den Drag-Ansagen.

## Was diese Runde offen gelassen hat

Vier Punkte sind bekannt und bewusst nicht behoben; sie stehen hier, damit du sie nicht als Fund
verkaufst, sondern schärfer stellst, falls sie mehr sind, als ich denke:

1. **`build.run` antwortet mit leerem `output`, wo die Konsole eine Erklärung hat.** Gemessen an
   einem Build mit kaputter `quartz.config.yaml`: `success: false`, `output: ''`, während
   `logs.history` sowohl die Warnung der App als auch Quartz' `YAMLParseError` trägt. Ob das je
   anders war, hat niemand geprüft.
2. **Eine verwaiste `core-update.json` räumt niemand auf.** Nach Befund 1 ist sie harmlos (die
   Liste ist leer), aber sie kostet jedem Update die Abkürzung — `npm install` und einen ganzen
   Aufwärm-Build, in einem Projekt, das aktuell ist. Keine Stelle in der Oberfläche zeigt sie.
3. **Der erste Pfeildruck aus der Ablage bewegt den Chip auf ein Ziel, das schon gemeldet war.**
   Kein Verlust — ein Ablegen nach einem Druck landet, wo die Ansage sagt —, aber es ist derselbe
   „der erste Druck tut nichts Sichtbares“, den eine frühere Runde für platzierte Bereiche behoben
   hat.
4. **`mainT` in `projectDirs.ts`** ist der erste Fall, in dem ein Dienst, den fast jeder andere
   benutzt, von der i18n-Schicht abhängt. Heute gibt es keinen Zyklus (i18n → settingsService →
   nichts davon), aber die Kante ist neu und niemand bewacht sie.

## Form der Befunde

Je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was schiefgeht,
wie es sich zeigt (mit der Messung, nicht mit einer Vermutung) und was dagegen spräche, es so zu
lassen. Was du geprüft hast und wo nichts war, gehört in einen eigenen Abschnitt — in dieser Serie
ist „geprüft, kein Befund“ genauso viel wert wie ein Fund, weil es die nächste Runde davon abhält,
dieselbe Stelle noch einmal zu lesen. Schreib das Ergebnis nach `docs/REVIEW-2026-09-27.md`.

**Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund wie jeder andere** — und
diesmal ist die Wahrscheinlichkeit dafür höher als sonst, weil Auftrag, Code und das geprüfte
Review aus derselben Feder stammen.
