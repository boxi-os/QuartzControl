Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist. Es geht um ein
Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Was diese Runde anders macht

**Zum ersten Mal hält das Core-Update einen Zustand über Läufe hinweg.** Bis hierher war jeder
Lauf für sich: Was er wissen musste, las er aus git. Jetzt legt er zwischen Merge-Commit und
Aufwärm-Build eine Notiz in `.quartz-gui/core-update.json` und liest sie beim nächsten Mal wieder.
Das ist eine neue Sorte Fehler — eine Notiz kann liegenbleiben, veralten, mitkopiert oder
zurückgespielt werden, und niemand sieht sie.

**Und du liest eine Runde, die eine Begründung des Vorgängers eingerissen hat.** Der siebzehnte
Stand ließ einen Layout-Überlauf bewusst stehen, weil seine Behebung angeblich den Tastatur-Drag
zerbricht. Das Review davor hat gemessen, dass die zwei Zustände in nur einer Reihenfolge
verglichen waren; dahinter lag ein echter Fehler, den niemand gesucht hatte (das Board hatte gar
keine `@dnd-kit`-Sensoren). Jetzt ist beides geändert — der Sensor **und** der Roller —, und der
Absatz erklärt seinen eigenen Irrtum. Prüf, ob die neue Begründung besser trägt als die alte.

**Drei Commits fassen wieder den Stash an**, den der sechzehnte Stand eingeführt hat: seine
Bindung, sein Rückfall, der Satz darüber. Das ist die dritte Runde an derselben Stelle.

In der Zählung von `CLAUDE.md` ist das das neunzehnte Review. Die Dateinamen zählen nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis; die Messungen hinter den Regeln stehen in `docs/decisions/`. Lies dann
`docs/REVIEW-2026-09-22.md` — die sieben Befunde, deren Fixes du liest, samt den Messungen, die sie
belegen, und seine Liste „Nebenbei aufgefallen“. Der Auftrag dazu steht in
`docs/REVIEW-2026-09-22-auftrag.md`.

## Umfang

`fix/review-2026-09-22`, von `main` abgezweigt, **nicht gepusht und nicht gemergt**. Die zwölf
Commits zwischen `review-2026-09-23` und `review-2026-09-24` (elf plus dieser Auftrag):

    git log --oneline review-2026-09-23..review-2026-09-24
    git diff review-2026-09-23..review-2026-09-24 -- . \
      ':!docs/REVIEW-2026-09-22.md' ':!docs/REVIEW-2026-09-23-auftrag.md'
    # 9 Dateien, +380 / −88
    # davon App-Code (electron/, src/):        3 Dateien, +168 / −44
    # davon Skripte:                           2 Dateien, +12 / −10
    # davon docs/decisions/:                   3 Dateien, +120 / −27
    # davon CLAUDE.md:                         1 Datei,   +80 / −7

Ausgenommen sind zwei Dateien: `docs/REVIEW-2026-09-22.md` (das Review, das du liest, statt es zu
prüfen) und diese Auftragsdatei. Mit dem Review-Dokument sind es 10 Dateien und +863; die Differenz
von 483 Zeilen ist das Review. Lies den Auftrag trotzdem als Behauptung wie jede andere — die
Zahlen oben sind nach dem Commit nachgerechnet, der diese Datei trägt, weil der Vorgänger genau
dort danebenlag; eine stimmte beim ersten Schreiben trotzdem nicht (elf Commits statt zwölf).

**Einen Hash für den Commit, der diese Datei trägt, nennt sie nicht** — er kann nicht in sich
selbst stehen, und der Versuch war Befund 6 des sechzehnten Reviews.
`git rev-parse review-2026-09-24^{commit}` beantwortet die Frage genauer.

`review-2026-09-23` sitzt auf `af1ffed` („Der Auftrag für das achtzehnte Review“, `main`), dem
Stand, den das letzte Review gelesen hat. Die Commits:

| Befund | Commit | Worum es geht |
| --- | --- | --- |
| — | `3639f00` | das Review-Dokument selbst (ausgenommen) |
| 1 | `4733a49` | **die Notiz `.quartz-gui/core-update.json`; „Already up to date“ fragt zweimal** |
| 2 | `8c3231b` | **`refs/stash^` gegen HEAD statt SHA gegen `MERGE_HEAD`; beide Rückfall-Pops weg** |
| 4 | `48581bd` | zwei Sätze statt einem für den liegengebliebenen Stash (`updateStashMine`) |
| 3a | `04adc40` | **`GlobalBoard` bekommt Sensoren (`nearestDroppableCoordinates`)** |
| 3b | `64de32d` | **`overflow-x-auto` am Board; der Layout-Absatz nimmt sich zurück** |
| 5 | `23e087c` | der Kommentar an `pdfPageCount()` beschreibt das PDF, das es gibt |
| 6 | `d1de301` | die Klammern der Nachträge tragen den Messtag |
| 7 | `32c9166` | der Stash-Name ist noch kein Format auf fremder Platte |
| — | `b8e00b4` | fünf Absätze in `docs/decisions/snapshots-and-updates.md` |
| — | `fde92b1` | `CLAUDE.md`: Zählung, Absatz zur Runde, zwei Regeln, was sie hinterlässt |
| — | — | dieser Auftrag |

**Im Handbuch-Vault liegt diesmal nichts** — diese Runde hat keine Handbuch-Seite angefasst. Der
Vault (`~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`) steht auf dem Stand, den das achtzehnte
Review gelesen hat.

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung — siehe „Wie gemessen werden kann“, bevor du eine Kopie anfasst.

## Was du wissen musst, bevor du liest

**Alle zwölf Commits stammen von demselben Modell, das diesen Auftrag schreibt**, aus einer Sitzung;
das Review-Dokument `docs/REVIEW-2026-09-22.md` aus einer anderen. Lies Commit-Nachrichten als
Behauptungen. In diesem Projekt gilt eine Zahl in einer Commit-Nachricht als Messung; trägt sie
nicht, ist das ein Befund.

**Abwägungen, die ich selbst getroffen habe — prüf, ob sie tragen:**

- **Die Notiz ist umgedreht gebaut.** Sie sagt „zwischen Merge-Commit und Aufwärm-Build steht etwas
  aus“, nicht „dieser Lauf ist zu Ende gekommen“. Der Grund ist gemessen (die andere Richtung macht
  den ersten Lauf jedes bestehenden Projekts wieder zum Volldurchlauf), aber der Preis ist eine
  Abweichung von der Hausregel „kann nicht prüfen ist nie alles gut“: Eine fehlende oder
  unschreibbare Datei liest sich als „nichts steht aus“, also wie vorher. Ich halte das für
  richtig, weil die Notiz ein Vorgangszeiger ist und kein Prüfergebnis — prüf, ob das trägt.
- **Die Notiz ist weder im Duplikat-`SKIP` noch im Snapshot-Ausschluss.** Ich habe beide Listen
  angesehen und beide Male entschieden, nichts zu tun: Ein Duplikat bekommt kein `node_modules`,
  erbt aber auch keine liegende Notiz (der Normalfall ist die leere Datei), und ein Restore bringt
  höchstens eine Notiz zu einem HEAD zurück, der dann nicht mehr aktuell ist. Beides ist
  **überlegt und nicht gemessen**.
- **`MERGE_HEAD` wird vor dem Abbruch gar nicht mehr gelesen.** Damit verliert die App die
  Information, *welchen* Merge ein Stash begleitet hat; sie fragt nur noch, gegen welchen HEAD er
  gemacht wurde. Der SHA steht weiter in der Nachricht, aber nichts liest ihn mehr.
- **Beide Rückfall-Pops sind weg**, auch der in `releaseNpmOwnedFiles`, den das Review gar nicht
  genannt hat. Meine Begründung: Dort ist HEAD immer die Basis des eigenen Stashes, der Rückfall
  also unerreichbar. Das ist ein Argument, keine Messung.
- **Das Layout-Board rollt jetzt in sich selbst**, und damit meldet `smoke` zum ersten Mal in
  dieser Serie gar nichts. Eine Meldung, die nie mehr kommt, ist auch eine, deren Ausbleiben
  niemand prüft.
- **Der Tastatur-Drag ist an *einem* Board gemessen**, dem Standard-Reiter der Layout-Seite, gegen
  *ein* Projekt. Der Frame-Builder benutzt denselben Getter und ist nicht neu gemessen.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Die Notiz, die über Läufe hinweg lebt (`4733a49`)

Der erste Zustand dieser Art im Core-Update. Die Fragen dazu:

- **Wann wird sie geschrieben, wann geleert, und was passiert dazwischen?** `markInstallPending`
  steht nach der Abkürzung und vor `stillMissing`; `clearInstallPending` nach dem Aufwärm-Build.
  Gibt es einen Rückgabepfad dazwischen, der die Notiz stehen lässt, obwohl nichts aussteht? Und
  einen, der sie leert, obwohl etwas aussteht?
- **Was macht ein Restore damit?** Die Notiz liegt in `.quartz-gui/` und ist damit
  snapshot-würdig (`isSnapshotWorthy` schließt sie nicht aus). Ein Snapshot entsteht *vor* dem
  Lauf, enthält sie also im Zustand davor. Spiel den Fall durch: Update bricht nach dem
  Merge-Commit ab, der Nutzer nimmt den Wiederherstellungspunkt — was sagt die Notiz danach, und
  passt das zu dem, was auf der Platte liegt?
- **Was macht ein Duplikat damit?** `duplicateService` kopiert alles, was nicht in `SKIP` steht,
  und `node_modules` steht drin. Eine liegende Notiz („Install steht aus“) reist also mit; eine
  leere auch. Ist eine der beiden Richtungen falsch?
- **Und was macht sie, wenn sie nicht lesbar ist?** `readJsonFileOr` legt eine unlesbare Datei als
  `.corrupt-<zeit>` beiseite und antwortet mit dem Vorgabewert — hier also „nichts steht aus“.
  Verfolge, was der Lauf danach tut.
- **Die Abkürzung selbst:** Sie fragt jetzt zwei Dinge. Gibt es *noch* einen Zustand, in dem beide
  Antworten „nichts zu tun“ lauten und trotzdem etwas zu tun wäre? Der Fall, den ich nicht
  behandelt habe, steht in der Liste unten.

### 2. Der Stash, zum dritten Mal (`8c3231b`, `48581bd`)

- **`stashBase()` liest `git rev-parse refs/stash^`.** Was liefert das bei einem Stash, der mit
  `--include-untracked` angelegt wurde (drei Eltern)? Bei einem `refs/stash`, das auf etwas zeigt,
  das kein Stash-Commit ist? Der leere String zählt als „nein“ — reicht das in beide Richtungen?
- **Der Vergleich steht nach `merge --abort`.** Die Begründung lautet: Der Abbruch bewegt HEAD
  nicht. Stimmt das für *jede* Art von halb fertigem Merge — auch nach einem `merge --abort`, der
  einen Squash-Merge oder einen Cherry-Pick vorfindet?
- **Der Rückfall ist an beiden Stellen weg.** Konstruier den Fall, den ich für unerreichbar halte:
  ein `pop --index`, das scheitert, obwohl HEAD die Basis des Stashes ist. Wenn es ihn gibt,
  bekommt der Nutzer jetzt eine Verweigerung, wo er vorher eine (kaputte) Wiederherstellung bekam.
- **Die zwei Sätze.** `leftoverStashNote` fragt vier Dinge (derselbe Ref wie vorher, unser Präfix,
  Basis == HEAD, ein Merge hängt). Gibt es eine Lage, in der der Satz „Merge abbrechen trägt ihn
  wieder ein“ erscheint und der Knopf es dann doch nicht tut? Und umgekehrt: eine, in der der
  Nutzer den Rat „git stash drop“ bekommt für einen Eintrag, den er behalten sollte?

### 3. Das Layout-Board (`04adc40`, `64de32d`)

- **Die Sensoren.** `GlobalBoard` bekommt `PointerSensor` ohne Optionen und `KeyboardSensor` mit
  `nearestDroppableCoordinates`. Die Behauptung, der Zeiger verhalte sich damit wie vorher, ruht
  auf `defaultSensors` in `@dnd-kit/core` 6.3.1 — nachgelesen, nicht gemessen. Prüf sie an der
  laufenden App: Ziehen mit der Maus, in einer Zone und zwischen Zonen, und die Klicks auf denselben
  Griff.
- **Der Getter.** Er war für ein Raster geschrieben (Frame-Builder). Das Board ist eine Mischung
  aus Sortierlisten, Zonen und einer Palette, und seine `collisionDetection` ist
  `pointerWithin` → `closestCenter`. Führt jeder Pfeil zu einem Ziel, das `handleDragEnd` auch
  auflösen kann? Die Ablage auf einer *leeren* Zone ist der Fall, den ich nicht gemessen habe.
- **Der Roller.** Er sitzt am Wrapper um das Grid, also auch um die Bereichs-Karten. Prüf ihn bei
  `breakpoint: 'mobile'` (der Wrapper trägt dort ein `maxWidth: 22rem`), bei einem Projekt mit
  einem schmalen Frame, und im Zusammenspiel mit den `aria`-Ansagen: Rollt die Seite dem
  Tastatur-Nutzer das Ziel überhaupt ins Bild?
- **Der Absatz.** Er erklärt jetzt einen Irrtum und behauptet dabei Zahlen (1048 px; 1030 gegen
  1030; 2147 gegen 2157; die Tastenfolgen). Prüf sie wie jede andere Messung — und prüf die Regel,
  die er daraus zieht.

### 4. Die Dokumente (`23e087c`, `d1de301`, `32c9166`, `b8e00b4`, `fde92b1`)

Fünf neue Absätze in `snapshots-and-updates.md`, ein umgeschriebener in `layout-frames.md`, zwei
Regeln und ein Absatz in `CLAUDE.md`. Sie sind nachträglich geschrieben, also aus der Erinnerung an
Messungen, die in Commit-Nachrichten stehen. **Stimmen die Zahlen mit den Quellen überein?**
Besonders: die PDF-Zahlen gegen `release/QuartzControl-Handbuch-1.0.0-beta.2.pdf`, die Datumsangaben
gegen `git log --date=short`, und die Behauptung, `git grep CORE_UPDATE_STASH` finde in beiden
Release-Tags nichts.

`CLAUDE.md` hat eine Regel geändert, die vorher falsch war (das Board stand in der Liste der vier
`@dnd-kit`-Stellen, die es richtig machen). Prüf die *übrigen* Behauptungen derselben Regel gegen
den Baum — sie ist seit dem neunten Review nicht gegengelesen worden.

### 5. Was die Prüfskripte nicht sehen

`typecheck`, `build`, `smoke` (zum ersten Mal ohne Auffälligkeit), `check:core-update` (14 Fälle),
`check:i18n` (1111 + 170 Schlüssel) und `check:semver` sind auf diesem Stand grün.
`check:plugin-names` und `check:handbook` sind nicht neu gelaufen. Keines dieser Skripte sieht die
Notiz, den Stash, einen Merge-Konflikt oder einen Tastatur-Drag. Was misst du, das sie nicht messen?

## Wie gemessen werden kann

- **Der Dienst ohne App**: esbuild-Bündel von `updateService.ts` (`--bundle --platform=node
  --format=cjs --tsconfig=tsconfig.node.json`, `electron` über einen Stub mit `app.getPath`).
  Gegenseite ist ein lokales Repo mit mehreren Ständen; diese Runde hat drei benutzt — `A` (Basis),
  `B` (Pakete und Lockfile gehoben), `C` (auf `B`, zusätzlich `quartz/index.ts`, damit ein Konflikt
  *außerhalb* der zwei Paketdateien entsteht). Stand einstellen mit
  `git -C <upstream> checkout --detach <tag>`, dann antwortet `git fetch quartz-upstream HEAD` ohne
  Netz. Für eine Vorher-Messung: `git worktree add <pfad> review-2026-09-23`, `node_modules` als
  Symlink, zweites Bündel.
- **npm und npx als Attrappen auf dem PATH**, eines davon mit Exit 1, beide mit Aufrufzähler. Damit
  ist der Zustand von Dateien, Index, Stash und Repo gemessen, **nicht**, was echtes npm tut.
- **Die Szenen dieser Runde**, je ein frischer Klon: `x1` (npm scheitert, dann „erneut“), `x2`/`x2s`
  (Terminal-Abbruch, Commit dazwischen, ungestaget und gestaget), `x2h` (Gegenprobe: nichts
  committet), `x7` (zwei Stashes übereinander), `up` (Projekt aktuell) und `norm` (der gewöhnliche
  Weg). Die Skripte dazu liegen nicht im Repo — sie sind im Scratchpad der Sitzung geblieben und
  müssen neu gebaut werden.
- **Die gebaute App**: `npm run build`, dann eine Kopie von `.claude/skills/run-desktop/driver.mjs`
  mit `--user-data-dir` auf ein Wegwerf-Verzeichnis. Die Kopie muss **im Repo** liegen, sonst findet
  node `playwright-core` nicht. Projekt per `window.quartzGui.projects.add` eintragen, alles Weitere
  über `evalfile`; `capture-pane -p | grep .`, sonst kommen leere Zeilen; nach einem `quit` erst
  warten, bis die Shell wieder da ist, sonst tippt der nächste Befehl ins Leere. Für den
  Tastatur-Drag: erst per `evalfile` fokussieren (`el.focus()`, `document.activeElement`
  gegenprüfen), dann `press Space` / `press ArrowDown`, Zustand über `[aria-live]`. Die Griffe im
  Board tragen `aria-roledescription="sortable"`, die Paletten-Chips `"draggable"` — wer nur nach
  einem der beiden sucht, findet die andere Hälfte nicht. `navigations-testprojekt` hat ein echtes
  `content/`-Verzeichnis und ist die Kopiervorlage.
- **Nicht gemessen** und deshalb offen für dich: die **gepackte** App; ein echtes `npm install`;
  die Notiz über einen Restore oder ein Duplikat hinweg; ein `pop --index`, das auf einen Konflikt
  läuft, obwohl HEAD die Stash-Basis ist; der Frame-Builder mit dem neuen Roller daneben; das Board
  bei `breakpoint: 'mobile'` und mit einer leeren Zone; zwei Fenster derselben App; die VMs und die
  Linux-Pakete.

## Was diese Runde offen gelassen hat

Drei Punkte sind bekannt und bewusst nicht behoben; sie stehen hier, damit du sie nicht als Fund
verkaufst, sondern schärfer stellst, falls sie mehr sind, als ich denke:

1. **Ein Abbruch, der seinen eigenen Stash poppt, erwähnt einen älteren der App darunter nicht.**
   Gemessen in x7: `stash@{0}` bleibt liegen, die Abbruch-Ausgabe schweigt. Der Lauf davor hat ihn
   genannt. (Aus der „Nebenbei“-Liste des achtzehnten Reviews.)
2. **Nach einem gescheiterten `npm install` bringt der erneute Lauf die eigenen Pakete nicht
   zurück.** Er installiert jetzt wenigstens wieder (Befund 1), aber plain: Der Plan vergleicht
   gegen die Merge-Basis, und nach dem Merge-Commit ist das Upstreams Stand, der die eigenen Pakete
   nie hatte. Die Meldung `updatePackagesMissing` nennt sie, der zweite Lauf trägt sie nicht ein.
   Die Notiz aus Befund 1 könnte die Liste tragen — das wäre eine Erweiterung, keine Korrektur.
3. **Der `!committed`-Zweig hängt `committed.output` an, aber `committed` ist `false`, wenn schon
   `checkout --theirs`, `rm --cached` oder `add` gescheitert sind** — deren Ausgabe fällt weiter
   weg. Nur gelesen; kein Weg gebaut, auf dem eines der drei scheitert. (Ebenfalls aus der
   „Nebenbei“-Liste.)

## Form der Befunde

Wie gehabt: je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was
schiefgeht, wie es sich zeigt und was dagegen spräche, es so zu lassen. Schreib das Ergebnis nach
`docs/REVIEW-2026-09-23.md`. Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund
wie jeder andere.
