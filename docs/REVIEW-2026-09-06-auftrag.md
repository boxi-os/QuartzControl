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

Der Diff seit dem Tag `review-2026-09-05`. Das ist der in CLAUDE.md ausdrücklich festgelegte
Ausgangsstand: Der jüngere Tag `review-2026-09-06` markiert nur das Ende des Token-Durchgangs, und
dessen 615 umgestellte Klassen sind gemessen, aber von keinem zweiten Augenpaar gelesen worden.

    git log --oneline review-2026-09-05..main                     # 78 Commits
    git diff review-2026-09-05..main -- electron/ src/ shared/    # 57 Dateien, +2081/−673

Der größere Teil davon stammt aus einem einzigen Tag (2026-09-06, ab Commit `7484ea4`): 29 Commits,
im App-Code 33 Dateien, +1470/−174, vier neue Module. Alles außerhalb von `electron/`, `src/` und
`shared/` ist Beiwerk und nur insoweit interessant, als es den App-Code betrifft — mit einer
Ausnahme, siehe Punkt 6 unten.

## Wo ich die größten Risiken vermute

Meine Einschätzung, nicht die Grenze des Auftrags.

1. **`electron/main/services/fontFile.ts`** (neu, 160 Zeilen) — ein handgeschriebener Parser für
   sfnt/WOFF/WOFF2, der eine Datei liest, die der Nutzer irgendwo herbekommen hat: Brotli-Strom,
   Base128-Ganzzahlen, Tabellenversätze, die aufaddiert werden. Er soll bei allem, was er nicht
   versteht, `null` liefern statt zu werfen. Prüfe ihn gegen absichtlich kaputte Eingaben:
   abgeschnittene Datei, gelogene Längen, `numTables` groß, Endlosschleife in `readBase128`,
   Speicherverbrauch bei einem Brotli-Strom, der sich riesig entpackt.
2. **`electron/main/services/serverDiscovery.ts`** + die zwei neuen Kanäle `server:discover` und
   `server:kill` — die App beendet damit fremde Prozesse. Die PID kommt aus dem Renderer. Es gibt
   eine Zweitprüfung direkt vor dem Signal; sieh nach, ob sie das ist, was sie sein müsste (Race
   zwischen Prüfung und Signal, `ps`-Ausgabe als Vertrauensquelle, Nadel `quartz` + `--serve`).
3. **`electron/main/index.ts`, `before-quit`** — die App fragt jetzt beim Beenden und beendet
   Server erst nach der Antwort. Der Pfad ist asynchron mit `preventDefault()`, einer gemerkten
   Entscheidung und einem `killAllServers()`, das auf `tree-kill` wartet (Frist 3 s). Frage: Kann
   die App in einen Zustand geraten, in dem sie sich nicht mehr beenden lässt?
4. **`electron/main/services/templatePackage/parts.ts`** — zwei Änderungen: `instanceKeys()`
   unterscheidet mehrere Instanzen desselben Plugins nach ihrer Position, und der neue Baustein
   `static` schreibt Dateien aus einem fremden `.qtpl` unter `quartz/static/`. Ein Paket ist keine
   Vertrauensgrenze (CLAUDE.md). Prüfe `writableTarget()` je Datei, die Größengrenze, und ob die
   Instanz-Zuordnung auch dann stimmt, wenn Ziel und Paket verschieden viele Instanzen haben.
5. **`electron/main/services/projectPaths.ts`** (neu) — schreibt beim Umbenennen *und* beim
   Duplizieren absolute Pfade in `quartz.config.yaml`, `quartz.lock.json` und Symlinks um. Die
   Funktion kam aus `duplicateService` und hat jetzt zwei Aufrufer mit verschiedenen Vorbedingungen.
6. **`scripts/example-template/styles/`** — hier liegt der eine Fall, in dem Beiwerk zählt: Die
   Stylesheets der Beispielvorlage werden über die App in ein echtes Projekt geschrieben und dort
   von Sass übersetzt. `styleService.setImportOrder()` erzeugt seit heute Namensräume für `@use`;
   sieh nach, ob die Erzeugung kollisionsfrei ist und den Roundtrip durch `parseImportOrder()`
   übersteht.

## Was schon gemessen ist

Damit du es nicht wiederholst — und damit du prüfen kannst, ob die Messung trägt. Jede Behauptung
steht mit ihrer Messung in der Commit-Nachricht und in `docs/decisions/`:

- Server-Erkennung: an der gebauten App mit einem Terminal-Server und einem App-Server gleichzeitig;
  drei Fälle (fremden beenden, eigenen beenden, Port belegt ohne Quartz).
- Beenden-Dialog: Abbrechen / weiterlaufen / beenden, je einmal, plus der Haken „Nicht mehr fragen".
  Der native Dialog wurde im Hauptprozess gespiegelt, nicht am OS bedient — das ist die schwächste
  Stelle der Messung und ausdrücklich so gekennzeichnet.
- Vorlagen-Instanzen: vier Wege (leeres Ziel, zweiter Import, teilweise vorhanden, `projectWins`),
  jeweils Eintrag für Eintrag verglichen.
- Umbenennen: Kontrollprojekt mit vier Frames, danach `quartz build` grün.
- Schriften: die vier Schriften der Vorlage plus eine ohne `OS/2`-Tabelle.
- Aufgaben-Zustände der Vorlage: drei Engines, 27 Kästchen, hell und dunkel.

**Nicht gemessen, bewusst:** der Windows-Pfad der Server-Erkennung (dort antwortet die App
„unbekannt"), der erste Flatpak-Bau, und ob der Beenden-Dialog am echten macOS-Blatt so reagiert wie
gespiegelt.

## Wie hier gemessen wird

    npm run typecheck && npm run check:i18n && npm run build && npm run smoke

`npm run smoke` startet die gebaute App und besucht jeden Screen. Für echtes Klicken gibt es den
Skill `run-desktop` (`.claude/skills/run-desktop/`) — Playwright über `_electron`, Screenshots nach
`/tmp/shots/`. Vier Fallen, die dich sonst Zeit kosten:

- Vor jedem Urteil über Aussehen: `colorscheme none` im Treiber, sonst erzwingt Playwright ein
  Farbschema.
- Native Dialoge blockieren Playwright. Was du an ihnen prüfen willst, spiegelst du im
  Hauptprozess (`mainfile`), und `require` gibt es dort nicht.
- Testprojekte: `~/Documents/gui-test` und `~/Documents/quartz-vorlage-gegenprobe` sind
  Wegwerf-Projekte. `~/Documents/Example` ist das Beispielprojekt, sein `content/` ist ein Symlink
  auf einen Obsidian-Vault — **dort nichts schreiben**, auch nicht im Vault.
- Nie ein zweites `quartz build` neben einem laufenden Dev-Server: beide bauen in dasselbe
  `public/`.

Was du startest, beende wieder (Server, App), und lass die Projekte so zurück, wie du sie
vorgefunden hast.

## Was ein Befund ist

Ein Befund nennt die Stelle (`datei:zeile`), sagt in einem Satz, was falsch ist, und wie man es
sieht — ein Reproduktionsweg oder die Messung, die es entscheidet. „Sieht falsch aus" ohne Messung
ist kein Befund; „kann ich nicht prüfen" ist ein zulässiges Ergebnis und wird als solches
aufgeschrieben, nicht als „in Ordnung".

Zwei Dinge, auf die dieses Projekt besonderen Wert legt und die im Diff mitgelesen werden sollten:

- **Kommentare tragen hier die Begründung.** Ein Kommentar, der etwas behauptet, was der Code nicht
  (mehr) tut, ist ein Befund — davon sind an einem Tag fünf gefunden worden.
- **Behauptungen in Commit-Nachrichten sind Messungen.** Wenn eine nicht stimmt, ist das ein Befund.

## Ergebnis

Eine Datei `docs/REVIEW-2026-09-06.md`, in der Form der beiden vorhandenen Reviews
(`docs/REVIEW-2026-09-02.md`, `docs/REVIEW-2026-09-05.md`): pro Befund eine Überschrift, die sagt,
was los ist, darunter Fundstelle, Messung und Folgen; nach Schwere sortiert. Dazu am Anfang drei
Sätze, was du geprüft hast und was du nicht prüfen konntest.

Keine Korrekturen im Code — die Entscheidung, was davon gemacht wird, trifft der Nutzer.
