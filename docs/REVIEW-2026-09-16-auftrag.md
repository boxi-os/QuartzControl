Du bist als zweites Paar Augen an einem Projekt, das kurz vor seiner zweiten Beta steht. Es geht um
ein Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Was diese Runde anders macht

Die letzte Runde las Dokumentation. **Diese liest wieder App-Code, und zwar viel davon an einem
Tag:** fünfzehn Punkte einer Beta-2-Liste, entstanden aus Rückmeldungen der ersten Beta-Tester und
aus offenen Befunden früherer Runden. Jeder Punkt ist ein eigener Branch von `main`; zum Lesen sind
alle vierzehn Branches (Punkte 1 und 15 teilen sich einen) in **`review/beta2`** zusammengeführt.

Zwei Folgen davon:

- **Die Punkte haben einander nie gesehen.** Jeder wurde auf `main` gebaut und gemessen, nicht auf
  dem Stand mit den anderen dreizehn. Was erst im Zusammenspiel falsch wird, hat niemand geprüft —
  außer den Prüfskripten, die auf `review/beta2` einmal gelaufen sind (unten).
- **Vier Punkte berühren den Hauptprozess dort, wo Kindprozesse entstehen oder enden** (Punkt 2, 4,
  14 und die Plugin-Installation in 12). Das ist die Klasse von Fehler, die in dieser Serie am
  häufigsten erst an der gepackten App sichtbar wurde.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis; die Messungen hinter den Regeln stehen in `docs/decisions/`.

## Umfang

    git diff review-2026-09-16..review/beta2      # 42 Dateien, +1420 / −178

`review-2026-09-16` sitzt auf `dbcefc1` (`main`), dem Stand, von dem alle vierzehn Branches
abzweigen. Die Einzelcommits, falls du einen Punkt isoliert lesen willst:

| Punkt | Branch | Commits | Worum es geht |
| --- | --- | --- | --- |
| 1 + 15 | `feat/missing-index-page` | `6bb0c3e` | Hinweis ohne `content/index.md`, Startseite anlegen mit Titel |
| 2 | `fix/node-shim-helper-bundle` | `dc03308` | Node-Shims starten auf macOS den Helper statt der App |
| 3 | `fix/macos-adhoc-signature` | `48a002f` | `identity: '-'`, `hardenedRuntime: false`, READMEs |
| 4 | `fix/core-update-installed-commit` | `b717b00` | „Installiert" = merge-base mit Quartz, Fetch nur auf der Updates-Seite |
| 5 | `fix/example-template-readme-numbers` | `234b558` | Zahlen in der Vorlagen-README |
| 6 | `fix/backups-snapshot-wording` | `be11c0f` | Der Bereich heißt Snapshots |
| 7 | `fix/frame-builder-area-delete` | `dba771f`, `4b64eab` | Nachfrage beim Löschen eines Bereichs; Fokus beim Breakpoint-Wechsel |
| 8 | `fix/frame-builder-homeless-slots` | `c590864` | Warnungen des Frame-Editors für jeden Breakpoint |
| 9 | `fix/plugin-enabled-explicit` | `487d0fd` | Plugin-Eintrag ohne `enabled` ist aus |
| 10 | `fix/home-layout` | `c07ff9a` | Startseite: Raster nach Spaltenbreite, Doppelungen weg |
| 11 | `docs/network-connections` | `3643c43` | Messung der Netzverbindungen (Handbuchseite im Vault) |
| 12 | `feat/project-image-header` | `58adcef` | Projektbild im Kopfbereich über quartz-layout-box, dunkles Bild |
| 13 | `feat/window-state` | `bb84bde` | Fensterposition und -größe über Neustarts, mehrere Monitore |
| 14 | `feat/build-progress` | `0a674c6` | Laufender Build als Zustand des Hauptprozesses, Uhr und Phase |

Die Zusammenführung selbst hatte vier Konflikte, alle an Stellen, an denen zwei Branches am selben
Ende angehängt hatten (`electron/main/ipc/schemas.ts`, `docs/decisions/navigation-and-pages.md`
zweimal, `docs/decisions/process-model-and-ipc.md`). Aufgelöst durch Behalten beider Seiten, in den
Merge-Commits `d2c877f`, `3937f6c`, `ecb4c2b` und `e9ca26b`. Auch das gehört zum Umfang.

Dazu das Benutzerhandbuch im Vault `~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`, sieben
Commits dieser Runde: `b2e1ab1` (3), `6f7beea` (4), `85430df` (6), `f7bb449` (1/15), `2e4177a` (11),
`1a05f27` (12), `37468a5` (14).

**Nicht im Umfang:** `feat/beispielvorlage-und-header` mit seinen Commits ab `39bef46` — älter als
diese Runde und nicht in `review/beta2` enthalten.

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung — aber siehe „Eine Falle" unten, bevor du eine Kopie anfasst.

## Eine Besonderheit, die du wissen musst

**Alle Commits dieser Runde stammen von demselben Modell, das diesen Auftrag schreibt.** Lies
Commit-Nachrichten als Behauptungen. In diesem Projekt gilt eine Zahl in einer Commit-Nachricht als
Messung; trägt sie nicht, ist das ein Befund.

Anders als sonst hat der Nutzer in dieser Runde **viele Entscheidungen selbst getroffen**, jeweils
zwischen Optionen, die ich vorgelegt habe. Stelle diese Entscheidungen nicht in Frage — prüfe, ob die
Umsetzung hält, was die Entscheidung meinte:

- Punkt 4: der Fetch nur auf der Updates-Seite, nicht auf der Übersicht
- Punkt 6: „Snapshots" statt „Backups" oder „Sicherungen"
- Punkt 7: Auswahl beim Breakpoint-Wechsel behalten und hinrollen
- Punkt 9: ein fehlendes `enabled` liest die App wie der Build, als „aus"
- Punkt 10: drei von vier Vorschlägen (nicht: Seitentitel nur zeigen, wenn er abweicht)
- Punkt 12: Schalter in der Karte Projektbild; fehlendes Plugin mit Nachfrage installieren
- Punkt 15: die App legt `index.md` an (nicht: PR an folder-page, eigenes Plugin); Inhalt = Liste der
  obersten Ebene; Titel wird abgefragt

## Eine Falle, in die ich heute getreten bin

Wer ein Projekt mit `cp -Rc` kopiert, bekommt `content/` als **Symlink auf den echten Vault** mit.
Beim Messen von Punkt 14 hat mein Skript die mtime von `<kopie>/content/index.md` gesetzt — das war
die Datei im echten Example-Vault. Zurückgesetzt; aber prüf `ls -la <kopie>/content`, bevor du in einer
Kopie etwas unter `content/` schreibst.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Der Build-Zustand im Hauptprozess (Punkt 14)

`buildService.ts` hält jetzt je Projekt eine `BuildActivity` und gibt einem zweiten `runBuild` das
Promise des laufenden. Vorher gemessen: Ein zweiter Klick nach einem Seitenwechsel startete einen
zweiten `quartz build` in denselben Ausgabeordner.

- **Die Phase kommt aus Textzeilen**, gesplittet an `\n` **innerhalb eines Chunks**. Eine Zeile, die
  über zwei `data`-Chunks reißt („Emit" | „ting files"), wird nicht erkannt. Ich halte die Folge für
  harmlos (die Phase springt dann eben nicht) — prüf, ob es eine Zeile gibt, deren Verlust nicht
  harmlos ist: „Done rebuilding in" zum Beispiel beendet den Neubau-Zustand, und ohne sie bleibt die
  Zeile stehen, bis der Server stoppt.
- **Eine Aktivität je Projekt.** Ein einmaliger Build und ein startender Dev-Server gleichzeitig:
  `emitStatus` legt dann keine `serve`-Aktivität an. Was sieht der Nutzer in welcher Karte?
- **`runBuild` ist keine `async`-Funktion mehr**, sondern gibt `spawnBuild(...).finally(...)` zurück.
  Scheitert `spawnBuild` (etwa `refreshAuthoredFrames`), bekommen *beide* Aufrufer dieselbe
  Ablehnung. Zeigen beide Seiten sie so an, dass der Nutzer versteht, dass es *ein* Build war?
- **Der IPC-Handler gibt das laufende Promise vor dem Ausgabeordner-Wächter zurück.** Ein zweiter
  Aufruf mit einem *anderen* `outputDir` bekommt damit das Ergebnis des ersten, in einen anderen
  Ordner gebauten Builds — ohne es zu erfahren. Ist das akzeptabel, oder ein Befund?
- **`emitStatus` räumt `serve` beim Zustand `running` ab, `rebuild` nie dort.** Gibt es einen Weg, auf
  dem eine `rebuild`-Aktivität den Server überlebt (Absturz während des Neubaus, `stopping`)?
- Die Messung am Ende des Commits lief auf `main`, nicht auf `review/beta2`.

### 2. Die Shims starten den Helper (Punkt 2)

`nodeBinary()` in `nodeRuntime.ts` sucht in `Contents/Frameworks` den ersten Eintrag, der auf
`/^[^()]+ Helper\.app$/` passt; `scripts/check-runtime.mjs` hat eine Kopie derselben Suche.

- **Das Regex ist meine Setzung.** Was, wenn ein Framework-Ordner einen weiteren passenden Namen
  trägt? `readdirSync` sortiert nicht garantiert.
- **Alles, was ein Kind über `process.execPath` startet, startet jetzt den Helper** — mit
  `ELECTRON_RUN_AS_NODE` geerbt. Gemessen: `npm install` mit einem `postinstall`, das `node` ruft.
  Nicht gemessen: ein Paket, das `process.execPath` *ohne* die Umgebung startet.
- **Entitlements, sobald die Hardened Runtime wieder angeht.** Mit `hardenedRuntime: false` aus
  Punkt 3 spielt das heute keine Rolle. Gelesen in `getOptionsForFile`
  (`app-builder-lib/out/mac/MacTargetHelper.js`): Ohne `entitlementsInherit` bekommen die Helper
  dieselbe Vorlage wie das Hauptbundle, `allow-jit` eingeschlossen. Trägt das für Node im Helper
  (JIT, `ELECTRON_RUN_AS_NODE`, native Module), oder braucht es dann eine eigene Datei?
- Die Kopie in `check-runtime.mjs` ist eine zweite Umsetzung derselben Regel — genau das Muster, vor
  dem `CLAUDE.md` an anderer Stelle warnt.

### 3. Das Projektbild im Kopfbereich (Punkt 12)

Die Karte sitzt auf dem Reiter, dessen Speichern die Config besitzt. Der Schalter ändert den Entwurf;
nur die Installation über die CLI schreibt selbst: vorher speichern, `plugins.add`, neu lesen, den
frischen CLI-Eintrag zur Instanz machen (`shared/projectImageBox.ts`).

- **`withProjectImage(fresh, hasDark, index)` wandelt den Eintrag an `index` um**, wenn er
  `isFreshLayoutBoxEntry` erfüllt (Layout-Box, kein `html`, keine `className`). Ein Projekt, das schon
  eine *eigene* Layout-Box mit Snippet-Datei und ohne Klasse hat, zählt nicht als „frisch", weil der
  Aufrufer nur umwandelt, wenn vorher keine Layout-Box da war. Hält das, wenn die Installation
  scheitert, aber die Config trotzdem schon geschrieben hat?
- **`hasDark` wird zum Zeitpunkt des Klicks gelesen**, nicht nach dem Neuladen. Wer das dunkle Bild
  während einer laufenden Installation setzt?
- **Die Höhe steht inline auf den `<img>`, `display` absichtlich nicht.** Gemessen im leeren
  Kopfbereich eines frischen Projekts. Nicht gemessen in einem vollen Kopfbereich — das Plugin gibt
  jeder Box `width: 100%`.
- `setProjectIconDark` teilt sich `storeImage` nicht mit `setProjectIcon`, das seine eigene, gleiche
  Normalisierung behalten hat. Zwei Kopien.

### 4. „Installiert" auf der Kern-Karte (Punkt 4)

- **`git fetch --no-tags <url> HEAD` schreibt `FETCH_HEAD`.** `runCoreUpdate` merged `FETCH_HEAD`.
  Öffnet jemand die Updates-Seite, während ein Update zwischen seinem `fetch` und seinem `merge`
  steht, zeigt `FETCH_HEAD` danach vielleicht auf etwas anderes. Theoretisch? Prüf die Reihenfolge.
- **`merge-base` gibt bei mehreren besten Basen eine beliebige zurück.** Kommt das in einem Projekt
  mit eigenen Merges vor, und ist die Anzeige dann falsch oder nur eine von zwei richtigen?
- Das neue Objekt-Argument `{ resolveInstalled }` am bestehenden Positionskanal
  `coreStatus(projectPath, options?)` — `CLAUDE.md` sagt „kein Umbau bestehender Kanäle", aber auch
  „kein neuer Kanal für etwas, das ein bestehender mit einem Flag kann". Richtig abgewogen?

### 5. `index.md` anlegen (Punkte 1 und 15)

- **`hasIndex` prüft ohne Rücksicht auf Groß-/Kleinschreibung**, begründet mit „Quartz schreibt jeden
  Slug klein". Gemessen habe ich das an einem **Ordner** („Mein Ordner" → `./mein-ordner/`), nicht an
  einer Datei `Index.md`. Wird aus `Index.md` wirklich die Seite unter `/`?
- **`path.matchesGlob`** für `ignorePatterns`. Im Bündel-Test lief das unter Node 26, in der App unter
  Electrons Node 24.18. Ist die Funktion dort stabil, oder experimentell mit Warnung — und stimmt ihre
  Semantik mit dem überein, wie Quartz die Muster anwendet (globby, auf Pfaden, nicht auf Namen)?
- **`writeFile(..., { flag: 'wx' })`** in einen Ordner, der ein Symlink auf den Vault ist. Das Modal
  nennt den Ordner. Reicht das als „ausdrückliche Nachfrage", die der Nutzer verlangt hat?
- **Die Linkform `[Name](<./Name/>)`** ist an einem echten Build gemessen (sechs Links, alle lösen
  auf). Nicht gemessen: Obsidian selbst — ob die spitzen Klammern dort als Link funktionieren.

### 6. Signatur (Punkt 3)

- **Zwei Sätze in README und Handbuch sind nicht gemessen:** dass Rechtsklick → Öffnen seit macOS 15
  nicht mehr an Gatekeeper vorbeiführt, und dass „Dennoch öffnen" etwa eine Stunde lang dasteht (aus
  Apples Support-Seite mh40616). Prüf die Quellen.
- Gemessen ist nur arm64. Das x64-Bundle nicht gebaut.

### 7. `enabled` (Punkt 9)

- **Jeder Leser der Config geht jetzt durch `Boolean(p.enabled)`.** Gibt es einen, der die yaml an
  `configService` vorbei liest — der Vorlagen-Import, `templatePackage/parts.ts`, ein Skript unter
  `scripts/` — und dort noch „fehlt = an" annimmt?
- **Nach dem ersten Speichern steht bei jedem schlüssellosen Eintrag `enabled: false` in der Datei.**
  Das ist gewollt. Aber: Welche Einträge ohne `enabled` gibt es in einem frisch angelegten Projekt,
  und schaltet das erste Speichern damit etwas aus, das der *Build* heute baut? (Er baut es nicht —
  das ist die Behauptung. Prüf sie an `quartz.config.default.yaml`.)

### 8. Fensterzustand (Punkt 13)

- **Die Schwellen sind gesetzt, nicht gemessen:** 40 px Titelleiste, 120 px Mindestüberdeckung,
  400 ms Entprellung.
- **Synchrones Schreiben im `close`-Handler.** Gemessen: das asynchrone ließ Temp-Dateien liegen.
  Beim Beenden über Cmd+Q unter macOS: Feuert `close` vor `will-quit`, und reicht die Zeit?
- **`maximize()` ersetzt `show()`** in der bestehenden Zeige-einmal-Logik. Die drei Wege dort
  (`ready-to-show`, `did-finish-load`, Zeitgeber) — gilt die Ersetzung in allen dreien?
- Vollbild nicht gemessen. Linux (Wayland meldet keine Fensterposition) nicht gemessen.

### 9. Frame-Editor (Punkte 7 und 8)

- **`focusNameOnMount` ist ein Ref, der beim Rendern gelesen und im Effekt zurückgesetzt wird.** Was,
  wenn ein Klick auf einen Bereich und ein Breakpoint-Wechsel in denselben React-Batch fallen?
- **`slotWarnings` ist aus der Komponente herausgezogen.** Die Behauptung ist „wörtlich umgezogen".
  Vergleich die drei alten Rechnungen mit den neuen.
- **„Bereich löschen" fragt nicht, wenn der Bereich nichts trägt.** Die Bedingung ist Platzierung,
  Belegung oder Gruppe. Gibt es ein viertes Ding, das ein Bereich trägt?

### 10. Die Handbuchseite „Verbindungen ins Netz" (Punkt 11)

`8-nachschlagen/05-verbindungen-ins-netz.md` im Vault, Messung in
`docs/decisions/process-model-and-ipc.md`.

- **„Keine Telemetrie, keine Absturzberichte"** — belegt durch eine Suche nach `crashReporter`,
  `sentry`, `analytics`. Eine Abwesenheit ist ein schwacher Beleg; Electron selbst und Chromium
  könnten etwas senden, das die App nie aufruft. Such gegen.
- **Die Programmnamen der gepackten App sind abgeleitet**, gemessen wurde in Entwicklung.
- **Ein `curl` bei der Projektanlage** ist ungeklärt; ein zweiter Messlauf ist an meinem Skript
  gescheitert.

### 11. Der Rest

Startseite (10), Umbenennung (6), README-Zahlen (5): Prüf vor allem, ob die Handbuchseiten und
Entscheidungsdokumente zu dem passen, was die App auf `review/beta2` sagt — die Umbenennung trifft
viele Stellen, und alle Screenshots im Handbuch zeigen noch „Backups".

## Was ich nicht geprüft habe

- **Irgendetwas an der gepackten App auf `review/beta2`.** Die gepackten Messungen (Punkte 2 und 3)
  liefen auf den Einzelbranches; kein DMG mit allen Punkten zusammen.
- **Die Punkte im Zusammenspiel**, außer über die Prüfskripte. Beispiel: Punkt 14 zeigt die
  Build-Zeile auf der Übersicht, Punkt 1 legt dort einen neuen Eintrag ins Aufmerksamkeitsband, Punkt 6
  benennt eine Kachel um — die Übersicht mit allen dreien hat niemand angesehen.
- **Linux.** Keiner der vierzehn Branches ist dort gebaut oder gestartet worden. Punkt 13 (Fenster)
  und Punkt 14 (Kindprozesse) sind die Kandidaten.
- **Die englischen Handbuchtexte gegen die deutschen**, wie in der letzten Runde.
- **Die Handbuch-Screenshots** — alle veraltet, ein Aufnahmelauf steht nach dem Zusammenführen an.

## Ablauf

    cd ~/Development/QuartzControl && git switch review/beta2
    npm run typecheck && npm run check:i18n && npm run check:handbook
    npm run build && npm run smoke
    npm run check:runtime -- ~/Documents/QuartzProjekte/gui-test

Auf `review/beta2` am 2026-09-13 gelaufen: alles grün, `check:handbook` 26 Zitate, 0 ohne
Entsprechung. `smoke` meldet eine Auffälligkeit — „[1280x800] Layout: Inhalt scrollt horizontal" —,
die es auf `main` ohne diese Runde genauso gibt; sie ist bekannt und nicht Teil dieser Runde. Wenn
etwas anderes nicht grün ist, ist das dein erster Befund.

Messen an der gebauten App: `scripts/smoke.mjs` zeigt, wie Electron über Playwright gestartet wird.
Immer mit eigenem `--user-data-dir`, der Nutzer hat die App vermutlich offen. Native Dialoge erreicht
Playwright nicht; spiegel sie im Hauptprozess (`app.evaluate(({ dialog }) => …)`) und kennzeichne
das als „nicht am OS gemessen".
