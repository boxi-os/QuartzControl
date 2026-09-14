Du bist als zweites Paar Augen an einem Projekt, das kurz vor seiner zweiten Beta steht. Es geht um
ein Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Was diese Runde anders macht

**Sie ist klein, und ihr größtes Risiko steckt in einer Zeile.** Das letzte Review
(`docs/REVIEW-2026-09-17.md`) fand vier Befunde, alle Niedrig. Die Fixes sind zusammen im App-Code
7 Dateien, +175/−48. Einer davon ändert aber etwas Grundsätzliches: Der Hauptprozess lädt jetzt
`globby` per `import()` aus dem `node_modules` des Nutzerprojekts und führt es in sich selbst aus,
statt Quartz' Ignore-Regeln nachzubilden. Das gab es bisher genau einmal (`sass` in
`styleService.ts`, über `createRequire`), und nie als ES-Modul.

Es gibt keine Lücke in der Kette: Das dreizehnte Review hat die Lücke
`review-2026-09-14..review-2026-09-16` gelesen, und der Tag für diese Runde sitzt auf dem Stand,
den es gelesen hat.

In der Zählung von `CLAUDE.md` ist das das vierzehnte Review. Die Dateinamen zählen nach Datum, die
Commit-Titel teils nach Runden; das ist dieselbe Serie.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis; die Messungen hinter den Regeln stehen in `docs/decisions/`. Lies dann
`docs/REVIEW-2026-09-17.md` — die Befunde, deren Fixes du liest.

## Umfang

Branch `fix/review-2026-09-17`, abgezweigt von `fix/review-2026-09-16`:

    git log --oneline review-2026-09-18..fix/review-2026-09-17
    git diff review-2026-09-18..fix/review-2026-09-17 -- . ':!docs/REVIEW-2026-09-17.md' ':!docs/REVIEW-2026-09-18-auftrag.md'
    # ohne den Auftrags-Commit: 11 Dateien, +274 / −72; App-Code und Skripte 7 Dateien, +175 / −48

`review-2026-09-18` sitzt auf `cc4bd50` („Der Auftrag für das Review 2026-09-17“), dem Stand, den das
letzte Review gelesen hat. Der Auftrags-Commit selbst fasst außer dieser Datei zwei Absätze in
`CLAUDE.md` an. Die Commits:

| Befund | Commit | Worum es geht |
| --- | --- | --- |
| — | `239a381` | das Review-Dokument selbst |
| 1 | `4690f26` | `createIndexPage` fragt Quartz' `globby` aus dem Projekt; Ersatz ohne `node_modules` |
| 2 | `8355dda` | der Hinweis am dunklen Projektbild liest die gespeicherte Plugin-Liste |
| 3 | `3e11357` | `check:i18n` liest Literale an Wertpositionen im ersten Argument und zählt den Rest; zwei Template-Literale sind Ternäre |
| 4 | `f48f2bb` | nur Kommentar: die `.sidebar`-Regeln in beiden Auslassungslisten von `shared/gridFrameCss.ts` |
| — | `34aa62e` | `CLAUDE.md`-Nachtrag und je ein Absatz in `navigation-and-pages.md`, `plugins-and-config.md`, `i18n-and-vocabulary.md` |

Im Handbuch-Vault gibt es diesmal keine Commits.

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung — siehe „Wie gemessen werden kann“, bevor du eine Kopie anfasst.

## Eine Besonderheit, die du wissen musst

**Die fünf Commits nach dem Review-Dokument stammen von demselben Modell, das diesen Auftrag
schreibt**, das Review-Dokument `239a381` aus einer anderen Sitzung. Lies Commit-Nachrichten als
Behauptungen. In diesem Projekt gilt eine Zahl in einer Commit-Nachricht als Messung; trägt sie
nicht, ist das ein Befund.

**Entscheidungen des Nutzers gibt es keine.** Vier Abwägungen habe ich selbst getroffen und dem
Nutzer genannt, ohne dass er widersprochen hat — prüf, ob sie tragen:

- Befund 1: Der Ersatz ohne `node_modules` läuft **still**. Die Liste sagt dem Nutzer nicht, dass
  sie ohne `globby` entstanden ist.
- Befund 1: Ein Ordner, der nur Bilder und keine `.md` enthält, wird **nicht mehr** gelistet, und
  eine `Notiz.MD` auch nicht — beides nach Quartz' Regel (`endsWith(".md")` in `build.ts`,
  folder-page aus den Markdown-Slugs), vorher stand beides in der Liste.
- Befund 3: Die Schreibweise `t(bedingung ? 'a' : 'b')` ist **nicht verboten**; der Checker liest
  sie jetzt. Berechnete Schlüssel lassen den Lauf nicht scheitern, sie werden nur gezählt.
- Befund 3: Der Checker ist ein Leser für ein Argument, kein Parser für TypeScript.

## Worauf es ankommt, in dieser Reihenfolge

### 1. `globby` aus dem Projekt im Hauptprozess (`4690f26`)

`quartzInputFiles()` in `electron/main/services/contentService.ts`:
`createRequire(<projekt>/quartz/util/glob.ts).resolve('globby')`, dann
`import(pathToFileURL(…).href)`, dann `globby('**/*.*', { cwd: content/, ignore, gitignore: true })`.

- **Vertrauensgrenze.** Der Hauptprozess hält entschlüsselte Zugangsdaten (`safeStorage`) und hat
  keine Sandbox. `quartz build` führt denselben Code auch aus, aber in einem Kindprozess. Macht es
  einen Unterschied, dass ihn jetzt der Hauptprozess lädt, und schon beim Anlegen einer Startseite?
  Wie kommt ein `node_modules/globby` ins Projekt — kann ein Vorlagen-Import (`.qtpl`), ein
  Duplikat oder ein Restore aus einem Snapshot eines dorthin legen? `sass` in `styleService.ts` ist
  der Präzedenzfall. Prüf, ob die Begründung dort diesen Fall schon trägt oder ob beide dieselbe
  Lücke haben.
- **Die gepackte App.** Gemessen ist am esbuild-Bündel und an der *gebauten* App (`npm run build`),
  nicht an der gepackten. Der Hauptprozess liegt dort in `app.asar` und lädt ein ES-Modul von
  außerhalb. Unter Flatpak liegt das Projekt womöglich hinter einem Portal. Nicht gemessen.
- **Der Modul-Cache.** Ein `import()` derselben URL wird für die Lebensdauer des Prozesses
  gecacht. Aktualisiert der Nutzer Quartz (`npm install`, `quartz update`), während die App läuft,
  bleibt im Hauptprozess die alte Fassung geladen. Relevant?
- **Der stille Rückfall.** Der `catch` fängt *jeden* Fehler beim Auflösen und Importieren, nicht
  nur „nicht installiert“: auch ein kaputtes oder halb installiertes `globby`. Dann läuft der
  Ersatz, und der liest kein `.gitignore`. Ist „kann nicht prüfen“ hier zu „alles gut“ geworden?
- **Fehler aus `globby` selbst** gehen roh durch (`EACCES` in einem Vault-Ordner, eine
  Symlink-Schleife). Vorher warf dort `readdir` genauso. Wie sieht das im Dialog aus?
- **Große Vaults.** Gemessen ist mit acht Dateien. `gitignore: true` liest jede `.gitignore` im
  Baum und darüber. Wie lange dauert das auf dem Beispiel-Vault (siehe `CLAUDE.md` zu T4)?
- **Die Behauptung „wie Quartz“.** Gleiches Muster, gleiche Optionen, gleiches cwd — `quartz build`
  läuft ohne `-d` (`buildService.ts:545`), also mit `content` relativ zum Projekt, die App mit dem
  absoluten `content/`. Gemessen gleich, auch mit einem `.gitignore` im Projekt, das nur innerhalb
  eines git-Repos zählt. **Nicht** gemessen gegen einen echten `quartz build`, nur gegen `globby`.
  Und was Plugins danach aussortieren (remove-draft, explicit-publish, unlisted-pages), weiß die
  Liste weiter nicht: Ein Ordner, dessen Notizen alle Entwürfe sind, bekommt einen Link auf eine
  Seite, die es nicht gibt.
- **Der Ersatz** (`walkUnignored`) spricht zwei Regeln von fast-glob nach und weicht laut Kommentar
  bei `{x,y}` ab. Gemessen nur im Bündel, nie in der App. Findest du ein weiteres Muster, bei dem er
  abweicht, ist das die Frage, ob der Ersatz den Aufwand wert ist.

### 2. Der Hinweis am dunklen Projektbild (`8355dda`)

`savedPlugins` wird in `ConfigEditor/index.tsx` aus `savedSnapshot` geparst. Der Hinweis erscheint,
wenn die gespeicherte Kopfbereich-Instanz `enabled` ist und ihr `html` `icon-dark.png` enthält.

- **Nach dem Speichern.** Gemessen sind vier Fälle, jeweils nach frischem Öffnen der Seite und einem
  Klick auf den Schalter. Nicht gemessen: Fall „gespeichert aus, im Entwurf an“ und **danach
  Speichern**. Dann muss der Hinweis erscheinen, weil `save()` `savedSnapshot` neu setzt.
- **Nach der Installation von quartz-layout-box** über den Schalter (`installLayoutBox` setzt
  ebenfalls `savedSnapshot`): Der Entwurf trägt dann die neue Instanz, die Datei nicht.
- **„Dunkles Bild entfernen“ bei gespeichertem Kopfbereich und ausgeschaltetem Entwurf:**
  `darkApplied` ändert den Entwurf dann nicht (`if (headerOn)`). Nach dem Speichern verschwindet
  die Instanz ohnehin. Stimmt der Satz des Hinweises in diesem Fall noch („bis zum Speichern fehlt
  dem Kopfbereich im dunklen Modus dann sein Bild“)?
- **`enabled`** wird wie in `readConfig` als wahr gelesen. Eine Instanz, die ein Nutzer von Hand
  ohne `enabled:` geschrieben hat?

### 3. `check:i18n` liest das erste Argument (`3e11357`)

`firstArgument()` in `scripts/check-i18n-keys.mjs`: Klammern verschachtelt, Strings und Templates
am Stück, Literale zählen nach `(`, `?` oder `:`.

- **Der Rand des Lesers.** `\bt\(` trifft auch nach einem Apostroph (`don't(`), in Kommentaren und in
  JSX-Text. Ein unbalanciertes `'` läuft bis zum Dateiende. Welche Zahlen ändern sich dadurch —
  1110/157 Schlüssel, 67/1 berechnete Aufrufe? Die 67 sind nicht gegen eine unabhängige Zählung
  geprüft.
- **Was er nicht liest:** `t(a || 'x.y')` (nach `|`), `t(cond ? 'a' : other)` (ein Zweig
  berechnet, der Aufruf zählt dann nicht als berechnet), `t(foo('x.y'))` (falscher Alarm, weil das
  Literal nach `(` steht). Gibt es davon eine Stelle im Baum?
- **Die Gegenprobe** löschte vier Schlüssel. Zwei davon (`githubOff`, `buildDirIsHome`) prüft auch
  der Typcheck, weil `mainT` `MainStringKey` verlangt. Für den Hauptprozess ist der Checker also
  zum Teil doppelt, für den Renderer nicht (`t` ist dort nicht typisiert).
- **Die zwei umgeschriebenen Stellen** (`LayoutEditor/index.tsx:213`, `GlobalBoard.tsx:398`) sollen
  dieselben Schlüssel treffen wie vorher. Der Smoke-Test besucht die Seiten, prüft aber keinen
  Text.

### 4. Der Kommentar (`f48f2bb`)

Er behauptet, ein eigenes Frame rendere kein `.sidebar` (grep über `layoutFrameService.ts`), und
zitiert die Messung des letzten Reviews. Stimmt das auch für die eingebauten Frames `full-width` und
`minimal`, auf die `buildPluginBreakpointCompat` nicht zielt? Und stehen die `.sidebar.right`-Regeln
aus `base.scss` zu Recht mit in der Liste des Core-Blocks?

### 5. Die Sätze (`34aa62e`)

- **„13 von 95 Antworten“**: das letzte Review nennt 19 Muster × 5 Einträge und 13 Abweichungen.
- **„nach `sass` in `styleService` der zweite Ort … und der erste als ES-Modul“**: nachzählen, im
  Hauptprozess zur Laufzeit; die Prüfskripte unter `scripts/` laden Projektcode auch, zählen hier
  aber nicht.
- **„Die Lücke ist geschlossen, drei seiner vier Befunde betreffen sie nicht“**: gegen
  `docs/REVIEW-2026-09-17.md` lesen.
- **Die drei Absätze in `docs/decisions/`** nennen Zahlen aus den Commit-Nachrichten. Stimmen sie
  mit den Nachrichten überein?
- **Beim zwölften Review** sind in `CLAUDE.md` zwei Sätze nachträglich geändert (die Bedingung des
  Hinweises, die `globby`-Gegenprobe). Die Review-Dokumente selbst sind unverändert. Ist die
  Grenze zwischen „Regel, die nachgeführt wird“ und „Protokoll, das bleibt“ dort eingehalten?

## Was ich nicht geprüft habe

- **Die gepackte App** mit diesen Fixes, und damit den `import()` aus `app.asar` heraus (oben, 1).
  Kein DMG, kein Linux, kein x64, kein Flatpak.
- **Einen echten `quartz build`** gegen die neue Startseiten-Liste (oben, 1).
- **Den Ersatz ohne `node_modules` an der App**, nur im Bündel.
- **Das Tempo** von `globby` mit `gitignore: true` auf einem großen Vault.
- **Den Hinweis nach Speichern und nach der Installation** (oben, 2).
- **Die Handbuch-Screenshots** — seit der Umbenennung in „Snapshots“ veraltet; ein Aufnahmelauf
  steht weiter an.
- **Die zwei offenen Beobachtungen des zwölften Reviews** (YAML-Fehler beendet den Dev-Server; Build
  und Dev-Server schreiben zugleich in `public/`) sind weiter nicht entschieden und nicht Teil dieser
  Runde.
- **Nichts ist gepusht**, weder `fix/review-2026-09-17` noch `fix/review-2026-09-16` noch
  `review/beta2` noch die Tags `review-2026-09-17` und `review-2026-09-18`; die vierzehn
  Beta-2-Branches sind nicht nach `main` zusammengeführt.

## Ablauf

    cd ~/Development/QuartzControl && git switch fix/review-2026-09-17
    npm run typecheck && npm run check:i18n && npm run check:handbook
    npm run check:semver && npm run check:plugin-names -- <kopie von gui-test>
    npm run build && npm run smoke
    npm run check:runtime -- <kopie von gui-test>

Auf diesem Stand am 2026-09-13 gelaufen, alles grün: `check:i18n` 1110 Schlüssel im Renderer und
157 im Hauptprozess (dazu 67 und 1 Aufrufe mit berechnetem Schlüssel), `check:handbook` 26 Zitate
und 0 ohne Entsprechung, `check:semver` 18 Vergleiche, `check:plugin-names` 18 gegen Quartz' eigene
Funktion, `check:runtime` Node 24.18.1, npm 11.17.0, 8 Plugins, 264 Dateien in 6,9 s. `smoke` meldet
eine Auffälligkeit — „[1280x800] Layout: Inhalt scrollt horizontal“ —, die es seit mehreren Runden
gibt und die nicht Teil dieser ist. Wenn etwas anderes nicht grün ist, ist das dein erster Befund.

## Wie gemessen werden kann

- **An der gebauten App:** `scripts/smoke.mjs` zeigt, wie Electron über Playwright gestartet wird.
  Immer mit eigenem `--user-data-dir`, der Nutzer hat die App vermutlich offen. Ein Projekt trägst
  du über eine `projects.json` im Profil ein — die `id` muss eine gültige UUID sein, sonst lehnt
  zod jeden Kanal ab. Native Dialoge erreicht Playwright nicht; spiegel sie im Hauptprozess
  (`app.evaluate(({ dialog }) => …)`) und kennzeichne das als „nicht am OS gemessen“.
- **Ein Dienst des Hauptprozesses allein:** mit esbuild bündeln,
  `--alias:electron=<stub>` und
  `--banner:js="import {createRequire as __cr} from 'module'; const require = __cr(import.meta.url);"`
  — ohne den Banner scheitert `yaml` an „Dynamic require of process“.
- **Quartz' `globby`:** `createRequire(<gui-test>/package.json).resolve('globby')` und importieren;
  mit `gitignore: true` und `process.chdir(<projekt>)`, `cwd: 'content'`, so wie `build.ts` es
  ruft.
- **Eine Kopie von `gui-test`:** `cp -Rc` in ein Wegwerf-Verzeichnis; `content/` ist dort ein echter
  Ordner, aber **prüf das mit `lstat`, bevor du darunter schreibst** — bei `Example` ist es ein
  Symlink auf den echten Vault. Config und Lockfile tragen absolute Pfade auf das Original; biege sie
  auf die Kopie um. Dev-Server auf einem eigenen Port (die letzten Reviews nahmen 8099/3099).
- **Electrons Node:** `node_modules/electron/dist/QuartzControl.app/Contents/Frameworks/Electron
  Helper.app/Contents/MacOS/Electron Helper` mit `ELECTRON_RUN_AS_NODE=1`.
