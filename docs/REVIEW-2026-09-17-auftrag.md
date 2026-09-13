Du bist als zweites Paar Augen an einem Projekt, das kurz vor seiner zweiten Beta steht. Es geht um
ein Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Was diese Runde anders macht

**Sie liest zwei Bereiche, die nichts miteinander zu tun haben.**

1. **Die Fixes des letzten Reviews** (`docs/REVIEW-2026-09-16.md`, neun Befunde) — von niemandem
   gelesen. Wie in jeder Runde dieser Serie.
2. **Eine Lücke in der Kette.** Der Tag `review-2026-09-16` wurde auf den Stand gesetzt, von dem die
   Beta-2-Branches abzweigen, statt auf den Stand, den das Review davor gelesen hatte. Zwischen
   `review-2026-09-14` und `review-2026-09-16` liegen deshalb 16 Commits, die kein Review dieser
   Serie gelesen hat — darunter die **zwölf Fixes des elften Reviews**. Die Runde „2026-09-15“ las
   davon nur `fe2b701` und `9592121`, und die nicht als App-Code.

In der Zählung von `CLAUDE.md` ist das das dreizehnte Review. Die Dateinamen zählen nach Datum, die
Commit-Titel teils nach Runden; das ist dieselbe Serie.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis; die Messungen hinter den Regeln stehen in `docs/decisions/`. Lies dann
`docs/REVIEW-2026-09-16.md` — die Befunde, deren Fixes du liest.

## Umfang

**Bereich 1, die Fixes** — Branch `fix/review-2026-09-16`, abgezweigt von `review/beta2`:

    git log --oneline review-2026-09-17..fix/review-2026-09-16
    git diff review-2026-09-17..fix/review-2026-09-16 -- . ':!docs/REVIEW-2026-09-16.md' ':!docs/REVIEW-2026-09-17-auftrag.md'
    # 16 Dateien, +284 / −101

`review-2026-09-17` sitzt auf `8136760`, dem Stand, den das letzte Review gelesen hat. Die Commits:

| Befund | Commit | Worum es geht |
| --- | --- | --- |
| — | `ce5becf` | das Review-Dokument selbst |
| 1 Mittel | `131f2de` | `followQuartzOutput(…, source)`: ein Neubau des Servers ersetzt die Build-Aktivität nicht mehr |
| 3 | `767adac` | der stderr-Tail des Servers geht auch durch den Folger |
| 4 | `8f8fac0` | harter Neubau als `rebuild`; „Filtered out“ setzt die Phase; Handbuch 5.2 |
| 5 | `2e2fed1` | `joinRunningBuild()`: Beitritt nur bei gleichem Ausgabeordner |
| 2 | `dc44f0b` | `switchBreakpoint` tut bei gleichem Wert nichts |
| 6 | `7ff705f` | Begründung an `hardenedRuntime: false`, Entitlement-Antwort an `nodeBinary()` |
| 7 | `65fb111` | `ignoredByQuartz()` prüft `name`, `name/`, `name/x/y.md` |
| 8 | `31ac5a7` | `shared/macNodeBinary.ts`; `storeImage` → `prepareImage` |
| 9 | `9d12a7a` | eigener Hinweis am dunklen Projektbild, wenn der Kopfbereich an ist; Handbuch 3.3 |
| — | `4eec529` | `CLAUDE.md`-Nachtrag und Nachtrag in `navigation-and-pages.md` |
| — | `d077648` | ein Fehler aus Befund 9, gefunden beim Lauf der Prüfskripte (unten) |

Dazu im Vault `~/Obsidian/QuartzProjekte/QuartzControl-Handbuch` zwei Commits: `4b815b0` (5.2) und
`01a7a65` (3.3).

**Bereich 2, die Lücke:**

    git log --oneline --first-parent review-2026-09-14..review-2026-09-16
    git diff review-2026-09-14..review-2026-09-16 -- . ':!docs/REVIEW-2026-09-14.md' ':!docs/REVIEW-2026-09-15*'
    # 30 Dateien, +1607 / −208; App-Code 5 Dateien, +174 / −55

Was darin liegt:

- `6ea83fc` **Die zwölf Befunde des elften Reviews** — die einzige Stelle mit App-Code:
  `shared/gridFrameCss.ts` (die Kompat-Blöcke in `@layer quartz-base`, ein dritter Block),
  `Styles/CustomCss.tsx` (Speichern schreibt alle Entwürfe), `Styles/variableGraph.ts`
  (`color(srgb …)` im Farbparser), `Styles/Basics.tsx`, `Plugins/Installed.tsx` (`CSS.Translate` im
  Drag). Die Befunde dazu stehen in `docs/REVIEW-2026-09-14.md`, die Zusammenfassung in `CLAUDE.md`
  unter „Das elfte Review“.
- `caf69cc` `scripts/stagger-vault-mtimes.mjs` — schreibt mtimes in einen Vault, mit Sicherung und
  `--restore`.
- `f209c5c` bis `a866e5c` — Arbeit an der Beispielvorlage (`scripts/example-template/`), jede mit
  einem BEFUNDE-Eintrag und Messungen an der gebauten Website.
- `fe2b701`, `9592121` — Doku-Fassungen der Vorlage (`doku.mjs`) und Links im Schnipsel; von der
  Runde 2026-09-15 gelesen, als Anleitung, nicht als Code.
- `dbcefc1` — `artifactName` unter `mac:` in `electron-builder.yml`.

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung — siehe „Wie gemessen werden kann“, bevor du eine Kopie anfasst.

## Eine Besonderheit, die du wissen musst

**Alle Commits beider Bereiche stammen von demselben Modell, das diesen Auftrag schreibt** — bis auf
`6f7945d` und `2fa2e12`, zwei Review-Dokumente eines anderen Modells. Lies Commit-Nachrichten als
Behauptungen. In diesem Projekt gilt eine Zahl in einer Commit-Nachricht als Messung; trägt sie
nicht, ist das ein Befund.

**Entscheidungen des Nutzers gibt es in Bereich 1 keine.** Zwei Abwägungen habe ich selbst getroffen
und dem Nutzer genannt, ohne dass er widersprochen hat — prüf, ob sie tragen:

- Befund 9: nur ein Hinweis, keine Rückfrage vor dem Entfernen und kein Aufschieben des Löschens
  bis zum Speichern.
- Befund 6: `hardenedRuntime` bleibt `false`; nur die Begründung ist neu.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Der Folger und die Aktivität (Befunde 1, 3, 4, 5)

`followQuartzOutput(projectId, text, source)` in `buildService.ts`. Der Build bewegt nur eine
`build`-Aktivität, der Server nichts, solange eine `build`-Aktivität steht.

- **Ein Dev-Server, der startet, während ein einmaliger Build läuft.** `emitStatus` legt bei
  `starting` keine `serve`-Aktivität an, wenn eine steht. Vor `131f2de` schrieben die Phasenzeilen des
  Servers dann in die Build-Aktivität; jetzt ignoriert der Server-Zweig sie. Endet der Build vor dem
  ersten Build des Servers, steht keine Aktivität, und die Zeilen „Parsing“/„Emitting“ des Servers
  treffen auf `!current` und tun nichts — **zeigt die Dev-Server-Karte für den Rest seines Starts
  gar keine Zeile?** Nicht gemessen.
- **Ein Neubau des Servers, der über das Ende eines Builds hinaus läuft**, bleibt ab dann ohne Zeile
  bis zum nächsten. Gewollt („der Neubau bleibt stumm“) — aber prüf, ob „Done processing“ eines
  *harten* Neubaus, der während des Builds begann, danach eine fremde Aktivität abräumen kann.
- **`/Done processing/` beendet jetzt jede Aktivität im Server-Zweig**, nicht mehr nur `serve`. Gibt
  es eine Zeile, die „Done processing“ enthält und kein Ende ist?
- **stderr geht jetzt durch dieselben Muster.** Plugins und die erzeugten Frames schreiben dorthin
  eigene Warnungen (im echten Log von `gui-test`: `[layout-box]`, `[editorial]`, `[index]`).
  Trifft eine davon eins der Muster (`Parsing input files`, `Filtered out \d+ files`, `Emitting files`, `Done processing`,
  `Detected …`)?
- **`joinRunningBuild` vergleicht mit `relative()`.** Auf APFS ohne Groß-/Kleinschreibung sind
  `Public` und `public` derselbe Ordner und zwei verschiedene Zeichenketten — die Ablehnung käme
  dann für einen Ordner, in den der laufende Build schon schreibt. Und ein Symlink auf den
  Ausgabeordner?
- **`runBuild` wirft jetzt synchron**, obwohl es ein Promise zurückgibt; heute ruft es nur der
  `async`-Handler. Wie zeigen Übersicht und Vorschau & Build die Ablehnung an — mit dem Präfix
  „Error invoking remote method …“ oder als Satz?
- **Nicht angesehen:** die Oberfläche in diesen Momenten. Gemessen sind die Ereignisse im Renderer,
  nicht, was Übersicht und Vorschau & Build dabei zeigen.
- „Rebuild failed“ ist über von Hand an die Logs gehängte Zeilen gemessen, nicht über einen echten
  Fehlschlag.

### 2. Die Lücke: die zwölf Fixes des elften Reviews (`6ea83fc`)

Die schwerste Stelle ist `shared/gridFrameCss.ts`. Die Kompat-Blöcke stehen in `@layer quartz-base`,
damit das `custom.scss` des Projekts sie schlägt; das Raster des Frames bleibt ungeschichtet.

- **Die Schicht gewinnt nur gegen ungeschichtete Regeln des Projekts, wenn Quartz sie so
  ausliefert.** Gemessen war an der Beispielvorlage. Gibt es ein Projekt-Stylesheet, das selbst in
  einer Schicht steht — und verliert es dann gegen den Block?
- **Der dritte Block** (Suche an Quartz' Tablet-Zahl) und die vier nachgetragenen Regeln: gegen die
  Quelle des Plugins Regel für Regel, wie `CLAUDE.md` es für „vollständig“ verlangt.
- **`CustomCss.tsx` schreibt beim registrierten Speichern alle Entwürfe.** Was, wenn einer davon
  scheitert — schreibt es die übrigen, meldet es `false`, und was bleibt als `dirty`?
- **`variableGraph.ts`**: `color(srgb …)` mit Alpha, mit `none`, mit Prozentwerten.
- **`CSS.Translate`** im Drag in `Plugins/Installed.tsx`: Gemessen waren reine `translate3d`. Mit
  einer offenen Karte in der Mitte der Liste?

### 3. Die Helper-Suche und die Bildnormalisierung (Befund 8)

- **`macNodeBinary` trennt Pfade an `/`**, weil ein Bundle-Pfad nur auf macOS vorkommt. Die
  Aufrufer prüfen die Plattform vorher (`nodeBinary`: `platform !== 'darwin'`; `check-runtime.mjs`:
  `process.platform`). Verglichen alt gegen neu an neun Pfaden, 9/9 gleich.
- **`check-runtime.mjs` lädt die `.ts` über eine temporäre `.mts`** unter `os.tmpdir()` und löscht
  sie danach — scheitert der Import, bleibt sie liegen (wie bei `check-semver.mjs`).
- **`prepareImage` hält das `nativeImage` zwischen Prüfen und Schreiben**, dazwischen liegt in
  `setProjectIcon` das Beiseitelegen des Originals. Gemessen: Antworten und SHA-256 der Dateien vorher
  und nachher gleich, auch dass abgelehnte Dateien kein Original anlegen.

### 4. Die Ignore-Muster (Befund 7)

`ignoredByQuartz(name, isDir, patterns)`: Ein Ordner ist ausgelassen, wenn ein Muster `name`,
`name/` oder `name/x/y.md` trifft.

- **`name/x/y.md` ist ein Stellvertreter für „alles darunter“.** Gegengeprüft an Quartz' `globby`
  mit sechs Mustern. Welches Muster lässt einen Ordner stehen, den Quartz ganz weglässt, oder
  umgekehrt? Kandidaten: `*/`, `**/*.md`, `name/*.md` in einem Ordner ohne Unterordner.
- **Quartz' `globby` läuft mit `gitignore: true`.** Eine `.gitignore` im Content-Ordner lässt Dateien
  weg, die die Liste nicht kennt.

### 5. Das dunkle Projektbild (Befund 9 und `d077648`)

- **Die Bedingung ist `headerOn && hasDark`, und `headerOn` kommt aus dem Entwurf.** Der Hinweis
  erscheint also auch, wenn der Kopfbereich nur im Entwurf an ist (dann ist das Entfernen
  harmlos), und fehlt, wenn er gespeichert an und im Entwurf aus ist (dann nennt die Datei das Bild
  weiter). Richtig abgewogen oder ein Befund?
- **`d077648`:** Der Fix schrieb erst `t(bedingung ? 'a' : 'b')`, und `check:i18n` sah danach beide
  Schlüssel nicht mehr (1089 statt 1091). **Dieselbe Form steht noch an mindestens vier Stellen**,
  nicht angefasst: `Plugins/Installed.tsx:350`, `LayoutEditor/FrameBuilder.tsx:987`,
  `ConfigEditor/SiteSettings.tsx:91` und der `hint` des Kopfbereich-Schalters in
  `ConfigEditor/ProjectImage.tsx` (über mehrere Zeilen). Gefunden mit einem `grep`, der nur
  einzeilige Aufrufe trifft — prüf die Zahl, und ob einer der Schlüssel fehlt.

### 6. Der Frame-Editor (Befund 2)

`switchBreakpoint` kehrt bei `bp === activeBreakpoint` zurück. Die Pfeiltasten der Radiogruppe
wandern mit Umbruch — kann ein Pfeildruck `onChange` mit dem aktiven Wert rufen (ein Segment allein)?
Und fängt die Rückkehr einen Fall ab, in dem der Ref *doch* umgelegt werden müsste?

### 7. Die Sätze (Befund 6, `4eec529`, die zwei Vault-Commits)

- **Befund 6 ist gelesen, nicht gemessen.** Die Behauptung an `nodeBinary()` — ohne eigene Datei
  bekommen die Helper `templates/entitlements.mac.plist`, und die trägt, was Node im Helper braucht —
  ist aus `getOptionsForFile` in app-builder-lib 26.15.3. Ein Bau mit
  `-c.mac.hardenedRuntime=true` und ein `npm run check:runtime` gegen dessen Helper würde es messen.
- **`4eec529` behauptet in `CLAUDE.md`**, das elfte Review habe die sieben Fixes des zehnten ohne
  Befund gelesen, und die Lücke umfasse im App-Code 5 Dateien, +174/−55. Beides nachrechnen.
- **Handbuch 5.2:** „nach einem Speichern in der App dauert sie fast so lange wie sein Start“ —
  gemessen sind 5,1 s harter Neubau gegen 7,6 s vom Start-Aufruf bis `running`.

### 8. Der Rest der Lücke

`scripts/stagger-vault-mtimes.mjs` schreibt in einen Vault: Prüf, ob `--apply` ohne eine lesbare
Sicherung weiterläuft, und ob `--restore` eine Datei anfasst, die nicht in der Sicherung steht.
`doku.mjs` leitet zwei Varianten ab und soll abbrechen, wenn ein zu streichender Eintrag fehlt —
tut es das? `dbcefc1`: die vier Paketnamen sind an einem `dist:mac` gemessen, das zip verliert sein
`-mac`.

## Was ich nicht geprüft habe

- **Die gepackte App** mit diesen Fixes. Kein DMG, kein Linux, kein x64.
- **Die Oberfläche während der Build-Szenarien** (oben, 1).
- **Die Hardened Runtime eingeschaltet** (oben, 7).
- **Die englischen Handbuchtexte** gegen die deutschen, wie in den letzten Runden.
- **Die Handbuch-Screenshots** — seit der Umbenennung in „Snapshots“ veraltet; ein Aufnahmelauf
  steht an.
- **Nichts ist gepusht**, weder `fix/review-2026-09-16` noch `review/beta2` noch der Tag
  `review-2026-09-17`; die vierzehn Beta-2-Branches sind nicht nach `main` zusammengeführt.

## Ablauf

    cd ~/Development/QuartzControl && git switch fix/review-2026-09-16
    npm run typecheck && npm run check:i18n && npm run check:handbook
    npm run check:semver && npm run check:plugin-names -- <kopie von gui-test>
    npm run build && npm run smoke
    npm run check:runtime -- <kopie von gui-test>

Auf diesem Stand am 2026-09-13 gelaufen, alles grün: `check:i18n` 1091 Schlüssel im Renderer und
151 im Hauptprozess, `check:handbook` 26 Zitate und 0 ohne Entsprechung, `check:semver` 18,
`check:plugin-names` 18 gegen Quartz' eigene Funktion, `check:runtime` Node 24.18.1, npm 11.17.0,
8 Plugins, 264 Dateien in 6,7 s. `smoke` meldet eine Auffälligkeit — „[1280x800] Layout: Inhalt
scrollt horizontal“ —, die es seit mehreren Runden gibt und die nicht Teil dieser ist. Wenn etwas
anderes nicht grün ist, ist das dein erster Befund.

## Wie gemessen werden kann

- **An der gebauten App:** `scripts/smoke.mjs` zeigt, wie Electron über Playwright gestartet wird.
  Immer mit eigenem `--user-data-dir`, der Nutzer hat die App vermutlich offen. Native Dialoge
  erreicht Playwright nicht; spiegel sie im Hauptprozess (`app.evaluate(({ dialog }) => …)`) und
  kennzeichne das als „nicht am OS gemessen“. Aus einem Skript außerhalb des Repos Playwright absolut
  importieren (`…/node_modules/playwright-core/index.mjs`).
- **Eine Kopie von `gui-test`:** `cp -Rc` in ein Wegwerf-Verzeichnis; `content/` ist dort ein echter
  Ordner, aber **prüf das mit `lstat`, bevor du darunter schreibst** — bei `Example` ist es ein
  Symlink auf den echten Vault. Config und Lockfile tragen absolute Pfade auf das Original; biege sie
  auf die Kopie um. Dev-Server auf einem eigenen Port (das letzte Review nahm 8099/3099).
- **Ereignisse mitschreiben:** `window.quartzGui.build.onActivity`, `server.onStatus`, `server.onLog`,
  `build.onLog` im Renderer, mit Zeitstempeln.
- **Electrons Node:** `node_modules/electron/dist/QuartzControl.app/Contents/Frameworks/Electron
  Helper.app/Contents/MacOS/Electron Helper` mit `ELECTRON_RUN_AS_NODE=1`.
