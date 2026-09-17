Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist. Es geht um ein
Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Was diese Runde anders macht

**Der Vorgänger hat etwas gefunden, das vier Runden lang niemand angesehen hatte: den Knopf.** Die
neunzehnte bis zweiundzwanzigste Runde haben an einer Notiz, einem Amend, einer Paketliste und
einem dritten Notizfeld gearbeitet, und alle vier beschreiben denselben zweiten Klick — „Behebe den
Fehler oben und starte das Update erneut“. Dieser Klick war nicht möglich: Ein Lauf, der an
`npm install` scheitert, hat den Merge schon committet, also enthält HEAD upstreams neuesten
Commit, der Status heißt `upToDate`, und der Knopf ist deswegen deaktiviert. Gesehen hat es keine
dieser Runden, weil ihre echten Läufe `window.quartzGui.updates.runCoreUpdate` per `evalfile`
riefen und die Attrappen keine Seite kennen. **Frag bei jedem Fix dieser Runde, ob er am richtigen
Ende gemessen ist** — und such die nächste Stelle, an der ein Kanal stimmt und die Oberfläche
nicht.

**Zwei Fixes dieser Runde weichen von dem ab, was das Review vorgeschlagen hat.** Das Review nennt
seine Vorschläge ausdrücklich ungemessene Vermutungen; einer davon trägt nicht, und der andere ist
weiter gefasst worden:

- Für den vierten Fall der Paketliste schlug es einen **Fingerabdruck von `package.json`** vor
  („Hat sich die Datei seither geändert, hat jemand anders die Frage beantwortet“). Der trägt
  nicht: Die Datei kommt byte-gleich zurück, wenn jemand eine Zeile einträgt und später wieder
  herausnimmt — genau der Fall, um den es geht. Gefragt wird stattdessen, ob `package.json` seit
  der Notiz **committet** wurde. **Prüf die Begründung und such die Lage, in der sie kippt.**
- Für den Knopf schlug es an, der Status möge die Notiz „als vierten Zustand“ kennen. Das ist er
  geworden — `CoreUpdateState` mit `'pending'`, gelesen bei jedem Aufruf der Updates-Seite *und*
  bei jedem Mount der Übersicht. **Das ist der Eingriff dieser Runde mit der größten Reichweite.**

**Eine Regel aus der einundzwanzigsten Runde ist widerlegt worden.** „Gefragt wird am **Namen**,
nicht an der Id“ stand seit `fd00eef` in `CLAUDE.md` und galt für den Frame-Builder, für den sie
geschrieben war. Am Layout-Board ist Namensgleichheit der Normalfall zweier verschiedener Dinge.
Sie steht jetzt anders da; **prüf, ob die neue Fassung an allen vier Drag-Stellen trägt**, nicht
nur an der, an der sie gemessen wurde.

In der Zählung von `CLAUDE.md` ist das das vierundzwanzigste Review. Die Dateinamen zählen nach
Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis; die Messungen hinter den Regeln stehen in `docs/decisions/`. Lies dann
`docs/REVIEW-2026-09-27.md` — die sechs Befunde, deren Fixes du liest, samt den Messungen, die sie
belegen, und seine Liste „Nebenbei aufgefallen“, von der fünf Punkte mit erledigt sind (der sechste
war Teil von Befund 1). Der Auftrag dazu steht in `docs/REVIEW-2026-09-27-auftrag.md`.

## Umfang

`fix/review-2026-09-27`, von `main` abgezweigt, **nicht gepusht**. Die fünfzehn Commits zwischen
`review-2026-09-28` und `review-2026-09-29` (vierzehn und dieser Auftrag, das Review-Dokument
mitgezählt):

    git log --oneline review-2026-09-28..review-2026-09-29
    git diff review-2026-09-28..review-2026-09-29 -- . \
      ':!docs/REVIEW-2026-09-27.md' ':!docs/REVIEW-2026-09-28-auftrag.md'
    # 20 Dateien, +528 / −123
    # davon App-Code (electron/, src/, shared/): 15 Dateien, +344 / −99
    # davon docs/decisions/:                      4 Dateien, +101 / −2
    # davon CLAUDE.md:                            1 Datei,    +83 / −22

Ausgenommen sind zwei Dateien: `docs/REVIEW-2026-09-27.md` (das Review, das du liest, statt es zu
prüfen) und diese Auftragsdatei. Mit dem Review-Dokument sind es 21 Dateien und +916; die Differenz
von 388 Zeilen ist das Review. Lies den Auftrag als Behauptung wie jede andere — die Zahlen oben
sind nach dem Commit nachgerechnet, der diese Datei trägt.

**Einen Hash für den Commit, der diese Datei trägt, nennt sie nicht** — er kann nicht in sich
selbst stehen. `git rev-parse review-2026-09-29^{commit}` beantwortet die Frage genauer.

`review-2026-09-28` sitzt auf `1bf3490` („Der Auftrag fuer das dreiundzwanzigste Review“, `main`),
dem Stand, den das letzte Review gelesen hat. Die Commits:

| Woher | Commit | Worum es geht |
| --- | --- | --- |
| — | `e3586b0` | das Review-Dokument selbst (ausgenommen) |
| Befund 2 | `af83753` | **`packageJsonCommittedSince`; die Notiz wird vor dem Merge gelesen** |
| Befund 1 | `7451a77` | **`CoreUpdateState` mit `'pending'`; Badge, Kasten, Leiste, Kachel** |
| Befund 3 | `036dc93` | **`listError` und `entriesError` getrennt; `localeLoadFailed`** |
| Befund 4 | `aea4cad` | **`isHome` neben `describe` in `useDndAccessibility`** |
| Befund 5 | `5410ceb` | **`npmFilesAtHead` fragt auch `--cached`** |
| Befund 6 | `0adabe4` | drei Kommentare und ein Nachtrag richtiggestellt |
| Nebenbei 5 | `ac5981d` | **`yamlReason()` schneidet yamls Doppelpunkt ab** |
| Nebenbei 3 | `c108700` | **`isLocaleCode` in `shared/`; Wähler und Kanal fragen dasselbe** |
| Nebenbei 4 | `518f346` | **`paletteDragName` statt der Überschrift als Ablageziel** |
| Nebenbei 2 | `cf773bd` | **Lauf-Schloss im Hauptprozess für Update *und* Abbruch** |
| Nebenbei 6 | `3df20bb` | die Zählung in `CLAUDE.md` |
| — | `abee39d` | sieben Nachträge in `docs/decisions/` |
| — | `5586133` | `CLAUDE.md`: sechs Regeln, der Absatz über die Runde, eine widerlegte Regel |
| — | — | dieser Auftrag |

**Nebenbei 1 fehlt in dieser Tabelle mit Absicht**: „Die Meldung mit den fehlenden Paketen lebt in
`useState`“ ist mit Befund 1 beantwortet — der Kasten hängt jetzt am Status und nicht an
`coreResult`. Prüf, ob das wirklich dasselbe beantwortet.

**Im Handbuch-Vault liegt nichts von dieser Runde** — sie hat keine Handbuch-Seite angefasst.
`npm run check:handbook` ist grün (26 Zitate), aber es prüft nur Blockzitate gegen Sprachdateien:
Dass die Updates-Seite jetzt einen vierten Zustand hat, den kein Handbuch-Kapitel erwähnt, sieht es
nicht. **Das ist ein offener Punkt, kein Befund über den Code** — aber sag, wenn du meinst, dass er
einer ist.

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung — siehe „Wie gemessen werden kann“, bevor du eine Kopie anfasst.

## Was du wissen musst, bevor du liest

**Alle vierzehn Commits stammen von demselben Modell, das diesen Auftrag schreibt**, aus einer
Sitzung; das Review-Dokument `docs/REVIEW-2026-09-27.md` von einem anderen. Lies
Commit-Nachrichten als Behauptungen. In diesem Projekt gilt eine Zahl in einer Commit-Nachricht als
Messung; trägt sie nicht, ist das ein Befund.

**Drei Commits sind nach dem Schreiben amendet worden.** Zwei wegen eines Tippfehlers in der
Nachricht (`e3586b0`, `abee39d`), und der Auftrags-Commit wegen der Diff-Zahlen oben: Er selbst
bringt zehn Zeilen `CLAUDE.md` mit, die in der Zahl stehen müssen, die er nennt — vor dem Amend
sagte sie +518 statt +528. Das ist der wiederkehrende Befund dieser Serie, diesmal vorher
abgefangen. Der Branch war nicht gepusht.

**Eine Messung dieser Runde war zuerst falsch und ist wiederholt worden.** Die Nachher-Messung zu
Befund 3 las eine `.out`-Datei aus dem Lauf davor, weil der Treiber nicht gestartet war und die
Kommandos in der Zsh landeten — das Ergebnis sah aus wie „der Fix wirkt nicht“. Aufgefallen ist es
beim Blick in die tmux-Ausgabe. **Such, ob eine andere Messung dieser Runde denselben Fehler hat**;
die Vorher/Nachher-Paare sind in den Commit-Nachrichten.

**Abwägungen, die ich selbst getroffen habe — prüf, ob sie tragen:**

- **`'pending'` gewinnt gegen alle drei anderen Antworten.** Mein Argument: Es ist unabhängig von
  ihnen wahr, es ist das einzige mit etwas zu tun, und es braucht kein Netz. Der Preis: Ein Projekt
  kann jetzt „Nicht abgeschlossen“ heißen, während es zugleich sieben Commits hinter upstream ist —
  die Zahl steht weiter in der Zeile darunter, aber das Badge sagt sie nicht mehr. **Prüf, ob die
  Karte in dieser Kombination noch wahr ist.**
- **`outstandingCoreInstall` läuft bei jedem Status-Aufruf.** Das sind drei zusätzliche
  Operationen (Notiz lesen, `git rev-list`, `package.json` parsen) auf zwei Wegen: die Updates-Seite
  und die Übersicht, letztere bei jedem Mount. Gemessen habe ich das Ergebnis, nicht die Dauer.
- **Die Notiz mit *leerer* Liste gilt bewusst nicht als `'pending'`.** Zwischen erfolgreichem npm
  und Aufwärm-Build liegt genau dieser Zustand; es fehlt dann nichts, und der Preis ist ein Lauf,
  der einen Build nicht überspringt. **Prüf, ob es einen Weg gibt, auf dem eine leere Liste doch
  etwas Fehlendes beschreibt.**
- **„Seit der Notiz committet“ statt „sieht anders aus“.** Die Frage wird **vor** dem Merge
  gestellt, weil der Merge-Commit `package.json` selbst anfasst. `git rev-list --count <sha>..HEAD
  -- package.json`; scheitert der Aufruf, gilt die Liste als nicht mehr unsere und wird
  fallengelassen. Mein Argument für diese Richtung: Eine Liste, für die wir nicht einstehen können,
  schreibt still eine Paketzeile, die niemand wollte; eine fallengelassene lässt Pakete sichtbar
  draußen, und der Wiederherstellungspunkt steht. **Nicht gefangen ist eine Reparatur und eine
  Entfernung, die beide uncommittet bleiben.** Such die dritte Lage.
- **Die Vorgabe von `isHome` vergleicht Ids und hat damit auch `Plugins/Installed` geändert**, das
  vorher am Namen verglich. Dort heißen zwei Instanzen desselben Plugins gleich. Gemessen ist das
  Layout-Board und der Frame-Builder; die Plugin-Liste und die Ladereihenfolge in
  `Styles/CustomCss` sind gelesen.
- **Das Lauf-Schloss ist ein `Set` im Modul und gilt für Update und Abbruch zusammen.** Mein
  Argument: beide schreiben dasselbe Repository. Der Preis: Wer während eines laufenden Updates
  „Merge abbrechen“ drückt, bekommt den Satz statt der Aktion. **Prüf, ob das der richtige Satz
  ist** — er sagt „ein Kern-Update läuft“, und das stimmt dann auch.
- **`isLocaleCode` ist nach `shared/ipc-contract.ts` gewandert** und wird damit auch in den
  Renderer gebündelt, obwohl nur der Hauptprozess sie ruft. Das zod-Schema ist jetzt ein `refine`
  statt `min`/`max`/`regex` — die Meldung für einen zu langen Code hat sich damit geändert.
- **`yamlReason` schneidet Doppelpunkt *und* Leerraum am Ende ab.** Eine yaml-Meldung, die
  sinnvoll auf einen Doppelpunkt endet, verliert ihn. Mir ist keine eingefallen; such eine.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Der vierte Zustand (`7451a77`)

Lies `getCoreUpdateStatus` und `outstandingCoreInstall` am Stück und frag für jede der drei Fragen,
woher ihre Antwort kommt und wann sie lügen kann. Besonders: **Eine Notiz, die aus einem Restore
oder einem Duplikat stammt.** Sie reist in jedem Snapshot mit (`isSnapshotWorthy` nennt
`core-update.json` nicht) und wörtlich in jedes Duplikat. Ihr SHA gehört dann zu einem anderen
Lauf — für `carried` ist das seit der einundzwanzigsten Runde ausdrücklich egal, und jetzt hängt
auch ein Badge daran. Zweitens: `stillMissing` fängt ein unlesbares `package.json` mit „schreib sie
alle zurück“ — was macht der Status daraus?

Und die Oberfläche: Die Karte zeigt „Installiert: X · Neueste Version: Y“ aus demselben Objekt.
Wenn `'pending'` und `behind` zusammenfallen, steht dort etwas anderes als im Badge. Ist das
lesbar?

### 2. Die Paketliste, viertes Mal gebunden (`af83753`)

In vier aufeinander folgenden Runden ist sie viermal anders gebunden worden: an den SHA, ohne SHA,
mit Räumung nach npm, jetzt mit `packageJsonCommittedSince`. **Jede Bindung hat eine Tür
geschlossen und eine geöffnet.** Lies die vier Nachträge in `docs/decisions/snapshots-and-updates.md`
hintereinander und such die Lage, die *keine* der vier trifft. Kandidaten, die ich nicht gemessen
habe: ein `git reset --hard` zwischen zwei Läufen; ein Restore, der die Notiz ohne `package.json`
zurückholt; zwei Projekte, die auf denselben Ordner zeigen; ein `sha`, den die Objektdatenbank
nicht mehr hat.

### 3. Der Amend und sein Wächter (`5410ceb`)

Die Erlaubnis fragt jetzt zwei Diffs statt einem. `stagedApartFromWorkingTree` fragt dieselbe Sache
für den Plan, mit anderen Mitteln (`--name-only`, zwei Aufrufe, Mengenvergleich). **Zwei Stellen,
eine Frage, zwei Formulierungen** — sind sie deckungsgleich? Wenn nicht, welche ist richtig?

### 4. Die Drag-Ansagen an allen vier Stellen (`aea4cad`)

`isHome` hat eine Vorgabe und eine Überschreibung. Gemessen sind Layout-Board und Frame-Builder.
**Lies `Plugins/Installed` und `Styles/CustomCss`** — die eine hat je Gruppe eine eigene
Hook-Instanz, die andere hatte nie ein Drag. Und prüf die Wechselwirkung mit `firstOver` und
`movedAway`: Beide Refs entscheiden jetzt zusammen mit `isHome`, und die drei Zweige in
`onDragOver` sind in drei verschiedenen Runden entstanden.

### 5. Der Fehlerzustand, der den Ausgang nicht mitnimmt (`036dc93`, `c108700`)

Derselbe Bau wie auf der Stile-Seite, eine Ebene feiner: zwei Lesevorgänge, zwei Antworten. **Such
die nächste Seite mit derselben Frage** — die Vorrunde hat drei gefunden, diese eine vierte Ebene
darin. Und prüf die Gegenrichtung: `listLocales` filtert jetzt; was passiert in einem Projekt,
dessen Locale-Dateien *alle* durchfallen?

### 6. Das Lauf-Schloss (`cf773bd`)

Es ist Zustand im Modul, also lebt es so lange wie der Hauptprozess. **Such den Weg, auf dem es
hängen bleibt** — ein Wurf außerhalb des `try`, ein Pfad, der zweimal einträgt, ein Projekt, das
umbenannt wird, während ein Update läuft (der Schlüssel ist der Pfad, nicht die Id). Und frag, ob
die anderen langlaufenden Vorgänge dieselbe Lücke haben: `updatePlugin`, `restoreSnapshot`,
`duplicateProject`.

### 7. Die Dokumente (`0adabe4`, `abee39d`, `3df20bb`, `5586133`)

Sieben Nachträge, sechs neue Regeln, eine widerlegte. Jede Zahl darin ist eine Messung oder ein
Befund. Diese Runde hat drei Sätze der Vorrunde richtiggestellt und drei weitere ausdrücklich
stehen lassen, weil sie in Dokumenten stehen, die eine Messung protokollieren — **prüf, ob diese
Trennung sauber gezogen ist**, und ob die richtiggestellten jetzt stimmen.

### 8. Was die Prüfskripte nicht sehen

`npm run typecheck`, `build`, `smoke` (42 Aufrufe), `check:i18n` (1124 + 181 Schlüssel),
`check:core-update` (14 Fälle), `check:semver`, `check:plugin-names` und `check:handbook`
(26 Zitate) sind auf diesem Stand grün. Keines sieht die Notiz, den Status, das Schloss, einen
Merge, einen Amend, einen Tastatur-Drag oder eine kaputte `quartz.config.yaml`. Was misst du, das
sie nicht messen?

## Wie gemessen werden kann

- **Der Dienst ohne App**: esbuild-Bündel von `updateService.ts` (`--bundle --platform=node
  --format=cjs --tsconfig=tsconfig.node.json --external:electron`), `electron` über einen Stub mit
  `app.getPath`, `safeStorage.isEncryptionAvailable` und `BrowserWindow.getAllWindows`. Gegenseite
  ist ein lokales Repo mit den Ständen `A` (Basis) und `E` (Paketversionen gehoben, also Konflikt
  in beiden Paketdateien); der Klon bekommt `git remote add quartz-upstream <pfad>`, und damit
  `git fetch quartz-upstream HEAD` ohne Netz antwortet, zeigt HEAD des Bare-Repos über
  `git symbolic-ref` auf einen Branch. Für eine Vorher-Messung: zweites Bündel aus
  `git archive review-2026-09-28` — **kein Worktree**, dann bleibt das Repo unberührt. Die Szenen
  dieser Runde heißen `f1` (Reparatur von Hand, dann Entfernung, beide committet), `h2` (ein
  unbeteiligter Commit dazwischen), `resume` (fortsetzender Lauf), `s3` (`MM package.json`),
  `norm` und `lock` (zwei `runCoreUpdate` in einem `Promise.all`).
- **npm und npx als Attrappen auf dem PATH**, in drei Betriebsarten: schreibt (`install
  [--save-*] name@range` in den passenden Abschnitt, Lockfile neu), scheitert, schreibt nichts.
- **Die gebaute App**: `npm run build`, dann eine Kopie von `.claude/skills/run-desktop/driver.mjs`
  mit `--user-data-dir` auf ein Wegwerf-Verzeichnis. Diese Runde hat die Kopie kurzzeitig **im
  Repo** liegen gehabt (`driver-profile.mjs`), damit `playwright-core` sich auflösen lässt, und sie
  nach jeder Messung gelöscht — im Repo liegt keine. Zwei Fallen, beide getroffen: Nach `quit`
  beendet sich der Treiberprozess, und ein sofort nachgeschicktes `node driver.mjs` landet in der
  Zsh, wo die nächsten Kommandos still ins Leere gehen und die `.out`-Dateien vom Lauf davor
  stehenbleiben — **immer `capture-pane -p -S -3 | grep driver>` abwarten und die `.out` vorher
  löschen**. Und `goto …/config?tab=x` wird von der Zsh als Glob gefressen; über die Reiterleiste
  klicken. Für den Tastatur-Drag erst per `evalfile` fokussieren (`el.focus()`, dann
  `document.activeElement` gegenprüfen), dann `press Space` / `press ArrowDown`, Zustand über
  `[role="status"]`.
- **Der echte Lauf über den echten Knopf** — der Weg, den die vier Runden davor nicht gegangen
  sind: `cp -Rc` von `navigations-testprojekt`, `git reset --hard f1fba3f` (sieben Commits zurück,
  fünf davon an den Paketdateien), zwei eigene Pakete in `package.json`, committen. Dann den
  nativen Bestätigungsdialog im Hauptprozess stellen (`mainfile` mit einer Funktion, die
  `dialog.showMessageBox` durch eine ersetzt, die den letzten Knopf antwortet) und
  `click-text Update durchführen`. npm zum Scheitern bringen: ein Paket, das es nicht gibt
  (ETARGET, dauerhaft — so gemessen) oder `chmod 555 node_modules/<paket>` (EACCES, behebbar). Nur
  das zweite ist die Lage „der Nutzer behebt es und startet erneut“, und **die habe ich nicht
  vollständig durchgespielt**: Der Klick nach dem Fehlschlag ist gemessen, der erfolgreiche
  Abschluss danach nicht.
- **Nicht gemessen** und deshalb offen für dich: die **gepackte** App; ein echter Push unter
  Git-Sync; ERESOLVE; die Notiz und der neue Status über einen Restore oder ein Duplikat hinweg;
  zwei Fenster derselben App; die VMs und die Linux-Pakete; der Maus-Drag; ein Screenreader an den
  Ansagen (nur die Live-Region ist gelesen); die Sortierlisten in `Plugins/Installed` und
  `Styles/CustomCss`; die Dauer des zusätzlichen Status-Aufrufs.

## Was diese Runde offen gelassen hat

1. **Der erfolgreiche zweite Lauf ist nicht gemessen.** Gemessen ist: Knopf an, Klick läuft, Lauf
   scheitert wieder an denselben Paketen, Zustand bleibt — und, getrennt davon, dass der Zustand
   sich räumt, wenn die Pakete von Hand zurück in `package.json` kommen. Die Kette „npm-Fehler
   beheben, erneut klicken, Lauf kommt durch, Notiz weg, Amend läuft“ am Stück fehlt.
2. **Das Handbuch kennt den vierten Zustand nicht.** Kein Kapitel erwähnt ihn, kein Screenshot
   zeigt ihn, und `check:handbook` sieht das nicht.
3. **Der fremde Worktree ist weg.** Punkt 6 der offenen Liste des Vorgängers
   (`…/91e0b4cf…/scratchpad/old-tree`) steht nicht mehr in `git worktree list`; angefasst hat ihn
   diese Runde nicht.
4. **Der Branch ist nicht gepusht und nicht in `main`.** Vierzehn Commits plus dieser Auftrag.
5. **Die drei Sätze aus Befund 6, die nur in Review- und Auftragsdokumenten stehen**, sind
   absichtlich nicht korrigiert worden — sie protokollieren eine Messung, und das ist ihr Zweck.
   Festgehalten sind sie in `docs/REVIEW-2026-09-27.md`.

## Form der Befunde

Wie gehabt: je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was
schiefgeht, wie es sich zeigt und was dagegen spräche, es so zu lassen. Schreib das Ergebnis nach
`docs/REVIEW-2026-09-28.md`. Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund
wie jeder andere.
