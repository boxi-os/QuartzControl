Du bist als zweites Paar Augen an einem Electron-Projekt, das kurz vor einer Beta steht. Es geht um
ein Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites. Repository: /Users/boxi/Development/Quartz-GUI, Branch `main`.

Lies zuerst `CLAUDE.md` im Wurzelverzeichnis. Dort stehen die Konventionen dieses Projekts als
Regeln, die Messungen dahinter in `docs/decisions/`. Ein Befund, der gegen eine dieser Regeln
verstößt, ist ein Befund; ein Befund, der eine Regel für falsch hält, ist auch einer — braucht dann
aber die Begründung.

## Umfang

Der Diff seit dem Tag `review-2026-09-06`. **Nicht seit dem Dateinamen dieses Auftrags** — der ist
geraten, der Tag ist es nicht.

    git log --oneline review-2026-09-06..main                     # 11 Commits
    git diff review-2026-09-06..main -- electron/ src/ shared/    # 14 Dateien, +265/−34

Das ist ein kleiner Diff, und das ist Absicht. Er enthält die sechs Fixes des dritten Reviews
(`docs/REVIEW-2026-09-06.md`, PR #17) und die Doku dazu. Der Tag sitzt bewusst *vor* diesen Fixes:
Sie sind gemessen, jeder mit Vorher und Nachher, und von niemandem gelesen. Genau darum geht es
hier.

Lies das Review-Dokument mit — nicht als Wahrheit, sondern als das, was behauptet wurde. Und lies
`docs/REVIEW-2026-09-06-auftrag.md`, damit du siehst, wonach zuletzt gesucht wurde.

## Eine Besonderheit, die du wissen musst

**Die elf Commits stammen von demselben Modell, das diesen Auftrag schreibt.** Meine Einschätzung,
wo die Risiken liegen, ist deshalb weniger wert als sonst: Ich kenne meine Zweifel, aber nicht meine
blinden Flecken. Die Liste unten ist ehrlich gemeint und ausdrücklich nicht die Grenze des Auftrags
— was ich *nicht* nenne, ist eher verdächtig als unverdächtig.

Zwei Dinge folgen daraus für dich:

- Lies die Commit-Nachrichten als Behauptungen, nicht als Dokumentation. In diesem Projekt gilt eine
  Behauptung in einer Commit-Nachricht als Messung; wenn eine nicht trägt, ist das ein Befund. Alle
  drei mittleren Befunde des letzten Reviews waren genau das.
- Prüfe besonders, wo ich **eine Zahl gewählt** habe. Grenzen, Zeitfenster und Decken sind die
  Stellen, an denen ich geraten und es wie eine Messung aufgeschrieben haben könnte.

## Wo ich die größten Risiken vermute

Meine Einschätzung, nicht die Grenze des Auftrags. Nach abnehmender Unsicherheit.

1. **`electron/main/services/buildService.ts` — die Server-Ausgabe geht in eine Datei, die Main
   tailt** (Commit `f782661`, der größte Eingriff der Liste). Der Spawn nimmt statt Pipes zwei
   Dateideskriptoren, und der Hauptprozess liest die Dateien alle 200 ms nach. Was daran ungeprüft
   ist:
   - Der Aufruf schließt seine eigenen Schreibdeskriptoren **direkt nach `spawn()`**, in der Annahme,
     das Kind habe seine Kopien dann schon. Bei `shell: needsShell('npx')` liegt eine Shell
     dazwischen. Nicht gemessen; unter Windows gar nicht.
   - Der Tail wird in `child.on('exit')` und `child.on('error')` gestoppt. Gibt es einen Weg, auf dem
     keines von beiden feuert? Dann laufen zwei Intervalle pro Server ewig weiter.
   - Der `StringDecoder` wird nie mit `end()` geschlossen. Ein unvollständiges Zeichen am Dateiende
     fällt weg.
   - **Die Logdatei wächst unbegrenzt.** Ein Dev-Server, der einen Tag läuft, schreibt bei jedem
     Rebuild. Nichts rotiert, nichts kappt.
   - `quartzGuiDir()` ist ein Schreibpfad und läuft jetzt bei **jedem** Serverstart — er legt das
     Verzeichnis an und schreibt den `.gitignore`-Eintrag. Vorher rührte ein Serverstart
     `.quartz-gui/` nicht an. Was passiert in einem Projekt, in das nicht geschrieben werden kann?
     Vorher startete der Server, jetzt könnte `startServer` werfen.
   - Zwei Listen mussten das neue Verzeichnis lernen (`isSnapshotWorthy`, `duplicateService.SKIP`),
     beide arbeiten per Allow-List. Gibt es eine dritte, die ich nicht gefunden habe? Deploy,
     Vorlagen-Export, Content-Zählung, Größenanzeige.

2. **Der Importzyklus um `repointAuthoredFrames`** (Commit `c59d7f7`). `snapshotService` importiert
   jetzt `projectPaths`, das `configService` importiert, das `snapshotService` importiert. Der Zyklus
   ist neu. **Gemessen habe ich den Restore gegen ein esbuild-Bündel — das ist ein anderer
   Modulgraph als der von electron-vite.** In der gebauten App wurde ein Restore *nicht* gefahren;
   `npm run smoke` besucht die Backups-Seite, holt aber nichts zurück. Das ist die einzelne
   Behauptung dieses Diffs, der ich am wenigsten traue: Bitte an der gebauten App einen Snapshot
   anlegen und zurückholen.

3. **Die drei gewählten Zahlen.** Jede davon ist ein Urteil, das ich als Messung formuliert habe:
   - `zipArchive.ts`, 256 MiB je Paket, mit dem Kommentar „Twice what this app's own export can
     produce (content stops at 100 MB, static at 25)". **Nur `static` und `content` haben eine
     Exportgrenze.** `fonts` und `styles` haben keine (`grep MAX_BYTES parts.ts`). Der Satz ist
     damit stärker als sein Beleg. Ist 256 MiB für ein legitimes Paket eng?
   - `fontFile.ts`, 64 MiB je Schrift, „deckt jede Schrift, die ein Browser laden soll". Gilt das für
     eine große CJK-Schrift oder eine variable Schrift mit vielen Achsen? Nachmessen an einer echten.
   - Der Tail bei 200 ms. Nicht begründet, nur gesetzt.

4. **`serverDiscovery.ts`, die Nadel auf Kleinschreibung normalisiert** (Commit `3361268`). Das
   weitet, was der Scan findet — und `killServer` benutzt **dieselbe** Funktion als Torwächter vor
   `tree-kill` (`serverDiscovery.ts:292`). Die App darf jetzt also jeden Prozess signalisieren,
   dessen Kommandozeile `--serve` als ganzes Wort und „quartz" in beliebiger Schreibung enthält.
   Bei der Messung dazu stand meine eigene Agenten-Shell mit beiden Nadeln in der Prozesstabelle und
   wurde nicht gemeldet — **warum sie es nicht wurde, habe ich nicht untersucht.** Frage: Welche
   Prozesse kommen durch dieses Tor, die vorher nicht durchkamen, und was macht `groupCandidates`
   mit ihnen?

5. **`templatePackage/parts.ts`, die `outside:`-Notizen** (Commit `e6f0e98`). Gemessen ist der Plan
   selbst; der Renderer wurde **nicht** an der laufenden App geprüft, nur die Behauptung, er nehme
   denselben Weg wie `identical`. Der Nutzer sieht jetzt „1 wird abgelehnt" ohne Grund daneben — ist
   das eine Antwort oder eine neue Frage? Und: Kommen die Notizen bei allen vier Bausteinen wirklich
   an, oder gibt es einen Pfad, auf dem `plan` gar nicht erst läuft?

6. **Was der Diff *nicht* enthält und vielleicht sollte.** Zwei Dinge sind bewusst offen geblieben
   und im PR genannt: das Log eines weitergelaufenen Servers beim nächsten Start lesen (jetzt
   möglich), und `repointAuthoredFrames()` auch beim Öffnen eines Projekts laufen lassen, was ein
   per Finder kopiertes Projekt heilen würde. Wenn eines davon nicht „später", sondern „fehlt" ist,
   sag es.

## Was schon gemessen ist

Damit du es nicht wiederholst — und damit du prüfen kannst, ob die Messung trägt. Jede steht mit
ihren Zahlen in der Commit-Nachricht und in `docs/decisions/`:

- Server-Pipes: derselbe Spawn in einem Wegwerf-Projekt, Elternprozess beendet sich, zwei Rebuilds
  durch Anlegen und Entfernen einer Notiz. Mit Pipes 0 Prozesse, mit Datei 2 und HTTP 200.
- Log-Tail: an der gebauten App, Starten/Neustarten/Stoppen, Konsole füllt sich live.
- Snapshot-Pfade: `git grep` je Ref in zwei echten Projekten; Restore gegen ein esbuild-Bündel,
  nicht gegen die App (siehe Punkt 2).
- Dekompression: vier Bomben, jede erst auf Platte, dann in einem frischen Prozess gelesen; dazu
  echte Schriften und ein echtes 754-KB-Paket als Gegenprobe.
- Nadel: ein lauschender Prozess aus einem Ordner `QuartzProjekte` mit `--serve --port 8131`.
- Mermaid-Umlaute im Beispiel-Vault: 24 Blöcke durch Mermaid 10.9.1, kein Fehler.

**Nicht gemessen, bewusst:** der Windows-Pfad (die App antwortet dort „unbekannt"), der erste
Flatpak-Bau, ein Restore an der gebauten App, und der Renderer-Weg der `outside:`-Notiz.

## Wie hier gemessen wird

    npm run typecheck && npm run check:i18n && npm run build && npm run smoke

`npm run smoke` startet die gebaute App und besucht jeden Screen. Für echtes Klicken gibt es den
Skill `run-desktop` (`.claude/skills/run-desktop/`) — Playwright über `_electron`, Screenshots nach
`/tmp/shots/`. Fünf Fallen, die dich sonst Zeit kosten:

- Vor jedem Urteil über Aussehen: `colorscheme none` im Treiber, sonst erzwingt Playwright ein
  Farbschema.
- Native Dialoge blockieren Playwright. Was du an ihnen prüfen willst, spiegelst du im
  Hauptprozess (`mainfile`), und `require` gibt es dort nicht.
- Testprojekte: `~/Documents/gui-test` und `~/Documents/quartz-vorlage-gegenprobe` sind
  Wegwerf-Projekte. `~/Documents/Example` ist das Beispielprojekt, sein `content/` ist ein Symlink
  auf einen Obsidian-Vault — **dort nichts schreiben**, auch nicht im Vault.
- Nie ein zweites `quartz build` neben einem laufenden Dev-Server: beide bauen in dasselbe
  `public/`.
- Einen Main-Prozess-Service kannst du auch **ohne die App** fahren: mit esbuild bündeln
  (`--bundle --platform=node --format=cjs --external:electron --alias:@shared=$PWD/shared`) und
  `Module._load` für `'electron'` auf ein Stub-Objekt umbiegen. Schnell und gut für präparierte
  Eingaben — aber es ist ein anderer Modulgraph als der der App, siehe Punkt 2.

Was du startest, beende wieder (Server, App), und lass die Projekte so zurück, wie du sie
vorgefunden hast.

## Was ein Befund ist

Ein Befund nennt die Stelle (`datei:zeile`), sagt in einem Satz, was falsch ist, und wie man es
sieht — ein Reproduktionsweg oder die Messung, die es entscheidet. „Sieht falsch aus" ohne Messung
ist kein Befund; „kann ich nicht prüfen" ist ein zulässiges Ergebnis und wird als solches
aufgeschrieben, nicht als „in Ordnung".

Drei Dinge, auf die dieses Projekt besonderen Wert legt und die im Diff mitgelesen werden sollten:

- **Kommentare tragen hier die Begründung.** Ein Kommentar, der etwas behauptet, was der Code nicht
  (mehr) tut, ist ein Befund.
- **Behauptungen in Commit-Nachrichten sind Messungen.** Wenn eine nicht stimmt, ist das ein Befund.
- **Eine Messung trägt nur so weit wie ihr Instrument** — die Regel, die aus dem letzten Review
  entstanden ist. Frag bei jeder Zahl, die du liest, womit sie gemessen wurde und was das Instrument
  nicht sehen konnte.

**Dass der Diff klein ist, heißt nicht, dass die Liste kurz sein muss.** Er ist elf Commits lang und
besteht fast nur aus Stellen, an denen jemand eine Grenze, ein Zeitfenster oder eine Bedingung neu
gesetzt hat. Ein Review, das hier nichts findet, sagt damit etwas — dann schreib auf, was du geprüft
und *nicht* gefunden hast, so genau wie einen Befund.

## Ergebnis

Eine Datei `docs/REVIEW-<datum>.md` in der Form der drei vorhandenen Reviews
(`docs/REVIEW-2026-09-02.md`, `-09-05.md`, `-09-06.md`): pro Befund eine Überschrift, die sagt, was
los ist, darunter Fundstelle, Messung und Folgen; nach Schwere sortiert; an jedem Befund, ob er
**gemessen** oder **gelesen** wurde. Dazu am Anfang drei Sätze, was du geprüft hast und was du nicht
prüfen konntest.

Keine Korrekturen im Code — die Entscheidung, was davon gemacht wird, trifft der Nutzer.
