Du bist als zweites Paar Augen an einem Projekt, das kurz vor seiner zweiten Beta steht. Es geht um
ein Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Was diese Runde anders macht

**Ein Teil des Diffs hat nie ein Review gesehen, und das nicht wegen einer Lücke in der Kette.** Das
letzte Review (`docs/REVIEW-2026-09-18.md`) fand vier Befunde, alle Niedrig. Der vierte führte zu
einem Branch, der nie gemergt worden war: `feat/beispielvorlage-und-header`, sieben Commits vom
2026-09-10 bis 2026-09-12, von `dbcefc1` abgezweigt. Er ist jetzt in dieser Linie (`962f079`). Seine
Commits standen in keinem Diff eines Reviews, weil sie in keiner Linie standen, aus der gelesen
wurde — darunter ein Python-Skript von 419 Zeilen, das mit einem Obsidian-Vault spricht.

**Der Rest ist klein**: die vier Fixes des letzten Reviews, im App-Code und in den Skripten
15 Dateien, +205/−68, der Nachtrag in `CLAUDE.md` und eine neu exportierte Beispielvorlage.

In der Zählung von `CLAUDE.md` ist das das fünfzehnte Review. Die Dateinamen zählen nach Datum; die
„fünfzehnte Runde“ aus `docs/REVIEW-2026-09-15.md` gehört nicht in diese Zählung (siehe dort).

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis; die Messungen hinter den Regeln stehen in `docs/decisions/`. Lies dann
`docs/REVIEW-2026-09-18.md` — die Befunde, deren Fixes du liest.

## Umfang

Branch `fix/review-2026-09-18`, abgezweigt von `fix/review-2026-09-17`:

    git log --oneline review-2026-09-19..fix/review-2026-09-18
    git diff review-2026-09-19..fix/review-2026-09-18 -- . ':!docs/REVIEW-2026-09-18.md' ':!docs/REVIEW-2026-09-19-auftrag.md'
    # ohne Review-Dokument und Auftrag: 33 Dateien, +998 / −125

    git diff 8fc770c..1097a6c        # die vier Fixes: 22 Dateien, +255 / −89
    git diff 1097a6c 962f079         # was der Merge hereinbringt: 13 Dateien, +656 / −17
    git diff 962f079..1f58bf4        # Nachtrag und Vorlage: 5 Dateien, +318 / −20 (davon der Auftrag)

`review-2026-09-19` sitzt auf `59e149b` („Der Auftrag für das Review 2026-09-18“), dem Stand, den das
letzte Review gelesen hat. Die Commits:

| Befund | Commit | Worum es geht |
| --- | --- | --- |
| — | `8fc770c` | das Review-Dokument selbst |
| 4 | `a65594c` | Cherry-Pick von `e6916ae`: `scripts/project-paths.mjs`, die Skripte suchen die Projekte unter `~/Documents/QuartzProjekte/` |
| 4 | `b1616dc` | `beforePack` bricht ab, wenn das Handbuch fehlt; ohne nur mit `QUARTZCONTROL_WITHOUT_HANDBOOK=1` |
| 3 | `0d400cd` | `check:i18n` zählt `function mainT(` nicht als Aufruf |
| 1 | `5ee8947` | Startseiten-Liste: nur `MODULE_NOT_FOUND` nimmt den Ersatz, `listSource` im Vertrag, Satz in der Karte, kaputtes `globby` ist ein Fehler, Ersatz streift `!` und `./` |
| 2 | `1097a6c` | Absatz zur Vertrauensgrenze in `process-model-and-ipc.md`, Regel in `CLAUDE.md`, zwei Kommentare |
| — | `962f079` | Merge von `feat/beispielvorlage-und-header` (unten) |
| — | `a982cff` | `CLAUDE.md`-Nachtrag zum vierzehnten Review |
| — | `be4a936` | `resources/templates/minimal-lesbar.qtpl` neu exportiert |
| — | `b65af33` | dieser Auftrag |
| — | `1f58bf4` | Footer-Links der Vorlage auf die github.io-Websites (Entscheidung des Nutzers), Paket neu exportiert |

Die sieben Commits des Merges, alle aus anderen Sitzungen:

| Commit | Worum es geht |
| --- | --- |
| `c8c143d` | README (de/en): „1.0.0-beta.1 ist da“, zehn Pakete |
| `39bef46` | Handbuch-Zahlen (453 Dateien, 35,4 MB, `.app` 427 MB) und die tar-durch-ssh-Anleitung in `CLAUDE.md` |
| `b39f5d4` | Skill `.claude/skills/projekt-dokumentieren/` mit `scripts/wiki_bridge.py` (419 Zeilen) |
| `325fa46` | `.claude/wiki-docs.json` aus dem Repo, in `.gitignore` |
| `fbdcd8b` | ein Befund zur Obsidian-CLI in `references/obsidian-cli.md` |
| `ec01bf0` | `scripts/example-template/pakete/` mit `doku.qtpl`, `plugin.qtpl`, README; `minimal-lesbar.qtpl` vom 2026-09-10 |
| `e6916ae` | der Pfad-Fix, als `a65594c` schon übernommen |

Der Merge hatte einen Konflikt, im `build:handbook`-Eintrag von `CLAUDE.md`. Aufgelöst: der Satz zu
`project-paths.mjs` aus `a65594c`, danach die tar-Anleitung aus `39bef46`.

Außerhalb dieses Repos, beide auf Wunsch des Nutzers:

- **`boxi-os/quartzcontrol-templates` `c943328`** (gepusht): `minimal-lesbar.qtpl` ist dort die
  Fassung aus `1f58bf4`. Von dort lädt die App die Vorlage, wenn sie online ist.
- **Handbuch-Vault `6abc6c5`** (kein Remote): 134 Screenshots, 130 ersetzt, 4 neu.

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung — siehe „Wie gemessen werden kann“, bevor du eine Kopie anfasst.
**Führe `wiki_bridge.py` nicht aus**, lies es.

## Eine Besonderheit, die du wissen musst

**Alle Commits nach dem Review-Dokument außer denen des Merges stammen von demselben Modell, das
diesen Auftrag schreibt**, in einer Sitzung. Lies Commit-Nachrichten als Behauptungen. In diesem
Projekt gilt eine Zahl in einer Commit-Nachricht als Messung; trägt sie nicht, ist das ein Befund.

**Entscheidungen des Nutzers:** Er hat „wie vorgeschlagen“ gesagt, als ich für Befund 2 zwei Wege
nannte (Absatz schreiben oder `globby` und `sass` in ein Kind verlegen), ohne einen zu wählen. Ich
habe den Absatz geschrieben und das so gesagt. Er hat den Merge ausdrücklich verlangt. Abwägungen,
die ich selbst getroffen habe — prüf, ob sie tragen:

- Befund 4: Abbruch statt Warnung, mit einem Flag als Ausweg, statt nur den Pfad zu korrigieren.
- Befund 1: Der Ersatz bleibt, statt ihn auf „alles außer versteckten Einträgen“ zu reduzieren;
  acht bekannte Abweichungen stehen im Kommentar.
- Befund 1: Der Satz zum Ersatz steht *nach* dem Anlegen in der Karte, nicht vorher im Dialog.
- Befund 3: Ein Treffer direkt nach `function` wird übersprungen, statt `i18n.ts` aus dem Lauf zu
  nehmen.
- Vorlage: nur die Phasen 3–11 neu, ohne Klon, Vault und Plugin-Installation.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Der Abbruch in `beforePack` (`b1616dc`)

`scripts/before-pack.mjs`. Vorher warnte der Haken und packte ohne Handbuch; jetzt wirft er, und
electron-builder bricht ab.

- **Jede andere Baumaschine.** Die Debian-VM hat kein Handbuch-Projekt; dort gilt jetzt
  `QUARTZCONTROL_HANDBOOK_SITE` oder das Flag. `npm run dist:linux` und `dist:flatpak` sind dort
  nicht gelaufen. Steht der Weg für die VM irgendwo so, dass jemand ihn findet, *bevor* der Bau
  scheitert — `docs/handbuch.md`, `electron-runtime-and-packaging.md`, der Linux-Teil von
  `CLAUDE.md`?
- **Je Architektur.** `beforePack` läuft je (Plattform, Architektur). Ein `dist:mac` für arm64 und
  x64 baut das Handbuch zweimal; scheitert der zweite Lauf, liegt das erste Paket schon da?
- **Aufräumen vor dem Wurf.** `dropHandbook(null)` räumt `resources/handbook` weg, bevor geworfen
  wird. Gibt es einen Aufrufer, der mit dem Fehler weitermacht und dann die leere Stelle packt?
- **Der Pfad selbst.** `project-paths.mjs` hat einen Standard, der ein Rechnerdetail ist. Suchen
  noch andere Skripte an einem Ort vor dem Umzug (`~/Documents/<name>` ohne `QuartzProjekte`)?
  Vault-Pfade bleiben laut `e6916ae` absichtlich außen vor.

### 2. Die Startseiten-Liste (`5ee8947`)

`quartzInputFiles()` und `walkUnignored()` in `electron/main/services/contentService.ts`,
`ContentFolder.tsx`, `listSource` in `shared/ipc-contract.ts`.

- **Die Trennung.** Nur `resolve()` mit `code === 'MODULE_NOT_FOUND'` nimmt den Ersatz. Jeder
  andere Fehler beim Auflösen — etwa `ERR_PACKAGE_PATH_NOT_EXPORTED` bei einem `globby` mit
  anderen `exports` — geht **roh** durch, nicht über `indexPageGlobbyBroken`. Absicht oder Lücke?
  Und ein `globby`, dem eine eigene Abhängigkeit fehlt, wirft beim `import()` ebenfalls
  `ERR_MODULE_NOT_FOUND` und gilt damit als kaputt, nicht als fehlend — richtig herum?
- **Der Satz in der Karte** hängt an `indexFallback && status?.hasIndex`, einem `useState` der
  Seite. Er verschwindet beim Routenwechsel. Soll er? Was sagt die Übersicht, die das
  Fehlen der Startseite ebenfalls meldet?
- **Die Ansage** hängt zwei Sätze aneinander. Stimmt die Regel „ganze Sätze mit Subjekt“?
- **Die Normalisierung** im Ersatz: ein `!` am Anfang (nicht vor `(`), dann `./`. Gemessen mit 31
  Mustern gegen `globby` 16.2.2 / fast-glob 3.3.3 aus `gui-test`, 8 Abweichungen bleiben. Hat
  fast-glob eine dritte Aufbereitung, die ein Nutzer mit einem naheliegenden Muster trifft
  (doppelte Schrägstriche, `**` am Ende, ein abschließendes `/`)?
- **Die Behauptung „außer `{x,y}` und `!!x` fehlt nur ein Link“** — nachzählen.

### 3. Der Merge (`962f079`)

- **`wiki_bridge.py`.** Was schreibt es, wohin, und woher kommt der Vault-Pfad? Die
  Vault-Schreibregel in `SKILL.md` gegen den Code lesen. Liegt irgendwo ein absoluter Pfad dieses
  Rechners oder etwas, das nicht ins öffentliche Repo gehört? Das Repo ist öffentlich.
- **Zwei `.qtpl` unter `scripts/example-template/pakete/`** (je rund 325 KB) im Repo, Begründung in
  deren README: `builtinTemplateService` scannt nichts, also reisen sie nicht mit. Stimmt das für
  `electron-builder.yml`, `files` und `extraResources`?
- **`README.md`/`README.de.md`**: „zehn Pakete“, „jede Datei nennt ihre Architektur“ — gegen die
  Release-Seite von `v1.0.0-beta.1` lesen (ohne Anmeldung abrufbar).
- **Die Handbuch-Zahlen aus `39bef46`** sind vom 2026-09-10. `b1616dc` hat 457 Dateien und 35,5 MB
  gemessen. Veraltet eine Zahl, die ein Datum trägt?
- **Die Konfliktauflösung.** Liest sich der `build:handbook`-Eintrag in `CLAUDE.md` danach als ein
  Absatz?

### 4. Die neu exportierte Vorlage (`be4a936`, `1f58bf4`)

- **Was sich unterscheidet.** Entpackt verglichen, gegen `git show
  962f079:resources/templates/minimal-lesbar.qtpl`: die zwei Schnipsel (`be4a936`), die
  Footer-Links in `parts/plugins.json` (`1f58bf4`) und `manifest.json`. Prüf das selbst.
- **Die veröffentlichte Kopie.** Wer online ist, bekommt nicht die mitgelieferte, sondern die aus
  `boxi-os/quartzcontrol-templates` (`builtinTemplateService.ts`, `TEMPLATE_URL`). Dort liegt seit
  `c943328` dieselbe Datei wie in `1f58bf4` (per `curl` und `cmp` nachgesehen). Nichts in diesem
  Repo hält fest, dass beide Kopien gleich sein sollen, und nichts prüft es — ein Befund?
- **Die Nebenwirkung am Example-Projekt.** Der erste Export (`be4a936`) überschrieb die von Hand
  gesetzten github.io-Footer-Links der Projekt-Config mit denen aus `plugins.mjs`; zurückgestellt
  aus einer Sicherung. Seit `1f58bf4` stehen sie in `plugins.mjs`, und ein zweiter Lauf ließ die
  Config byte-gleich. Das Skript warnt vor einer solchen Überschreibung aber weiter nicht,
  `--check-sync` vergleicht nur Stylesheets und Schnipsel, und `CLAUDE.md` sagt, Config und Frames
  haben absichtlich keinen Rückweg. Ist ein Lauf, der eine Handänderung still ersetzt, ein Befund
  — am Skript oder an der Gewohnheit, die Projekt-Config von Hand zu ändern? Die Config trägt noch
  zwei weitere eigene Werte (`baseUrl`, `analytics`), die Phase 4 nicht anfasst und die nicht
  mitreisen; prüf, ob das für jede Handänderung dort so gilt.
- **Die Footer-Links selbst**: vier Adressen auf `boxi-os.github.io`, am 2026-09-14 alle 200.

### 5. Die Vertrauensgrenze (`1097a6c`)

Nur Text. Prüf die Behauptungen: zwei Ladestellen (grep über `electron/main`), ein Kindprozess
bekommt höchstens das eine Geheimnis seiner Aktion (alle `runCommand`-Aufrufe mit `env`, alle
Spawns in `buildService`, `deploy/`), und die zwei als „nur gelesen“ gekennzeichneten Sätze. Trägt
die Begründung „wer dort ein Paket ablegt, führt schon Code als der Nutzer aus“?

### 6. Die Sätze (`a982cff`, `0d400cd`)

- Die neuen Regeln unter „Arbeitsweise“ in `CLAUDE.md` — belegt jede ihr Beispiel?
- „der Fix dafür lag seit zwei Tagen auf einem Branch“ — gegen die Commit-Daten.
- Der Nachsatz im Protokoll in `i18n-and-vocabulary.md` („183 Aufrufe“ aus der Zählung des letzten
  Reviews).
- `check:i18n` überspringt `function\s+` in den 16 Zeichen vor dem Treffer. Trifft das
  `export default function t(`, `function  mainT(` mit mehr Leerraum, eine Methode `mainT(key) {`?

## Was ich nicht geprüft habe

- **Die gepackte App** mit diesen Fixes; `beforePack` ist nur mit `electron-builder --mac --dir
  --arm64` gelaufen. Kein DMG, kein Linux, kein x64, kein Flatpak, keine VM.
- **`wiki_bridge.py`** habe ich nicht gelesen.
- **Die Live-Region** als zweiter Fundort des Satzes zum Ersatz ist vermutet, nicht einzeln
  nachgesehen.
- **Die Handbuch-Texte** gegen die neuen Screenshots: Die Bilder sind neu, die Seiten nicht
  durchgesehen. Die zwei neuen Reiter-Bilder (Seitentypen, Eigene Frames) nutzt keine Seite.
- **Ein Fehllauf der Screenshots.** Der erste Lauf bekam in zsh alle Optionen als *ein* Argument
  (`$args` wird dort nicht aufgeteilt) und lief ohne `--demo` gegen das echte Profil. Seine 21
  Bilder sind vor `6abc6c5` verworfen; im Profil des Nutzers blieben ein neues `lastOpenedAt` des
  Example-Projekts und `window-state.json` auf 1440 × 900. Die Sperre in `screenshots.mjs` greift nur
  für `--scenes` ohne `--demo`, nicht für einen Lauf, dem `--demo` still fehlt.
- **Die zwei offenen Beobachtungen des zwölften Reviews** (YAML-Fehler beendet den Dev-Server; Build
  und Dev-Server schreiben zugleich in `public/`) sind weiter nicht entschieden.
- **Nichts ist gepusht.** `origin/main` steht auf `39bef46`; dieser Branch ist 62 Commits davor. Die
  Tags `review-2026-09-17` bis `review-2026-09-19` sind lokal.

## Ablauf

    cd ~/Development/QuartzControl && git switch fix/review-2026-09-18
    npm run typecheck && npm run check:i18n && npm run check:handbook
    npm run check:semver && npm run check:plugin-names -- <kopie von gui-test>
    npm run build && npm run smoke
    npm run check:runtime -- <kopie von gui-test>

Auf `be4a936` am 2026-09-14 gelaufen (danach nur Vorlage und Text), alles grün: `check:i18n` 1111 Schlüssel im Renderer und 158
im Hauptprozess (dazu 67 und 0 Aufrufe mit berechnetem Schlüssel), `check:handbook` 26 Zitate und 0
ohne Entsprechung, `check:semver` 18 Vergleiche, `check:plugin-names` 18 gegen Quartz' eigene
Funktion, `check:runtime` gegen eine `cp -Rc`-Kopie Node 24.18.1, npm 11.17.0, 8 Plugins, 264
Dateien in 8,7 s. `smoke` meldet eine Auffälligkeit — „[1280x800] Layout: Inhalt scrollt
horizontal“ —, die es seit mehreren Runden gibt und die nicht Teil dieser ist. Wenn etwas anderes
nicht grün ist, ist das dein erster Befund.

## Wie gemessen werden kann

- **An der gebauten App:** `scripts/smoke.mjs` zeigt, wie Electron über Playwright gestartet wird.
  Immer mit eigenem `--user-data-dir`, der Nutzer hat die App vermutlich offen. Ein Projekt trägst
  du im Renderer mit `window.quartzGui.projects.add(<pfad>)` ein und springst mit
  `location.hash = '#/project/<id>/config?tab=content'` auf die Seite. Native Dialoge erreicht
  Playwright nicht; spiegel sie im Hauptprozess (`app.evaluate(({ dialog }) => …)`) und kennzeichne
  das als „nicht am OS gemessen“.
- **`beforePack` ohne Handbuch-Projekt:** `QUARTZCONTROL_PROJECT_ROOT=<leeres verzeichnis> npx
  electron-builder --mac --dir --arm64`; das Paket landet in `release/` (gitignoriert).
- **Der Ersatz allein:** `walkUnignored` aus `contentService.ts` herausschneiden, Typen entfernen,
  als `.mts` mit `readdir`, `realpath`, `stat`, `join`, `matchesGlob`, `posix` importieren.
- **Quartz' `globby`:** `createRequire(<gui-test>/quartz/util/glob.ts).resolve('globby')` und
  importieren.
- **Eine Kopie von `gui-test`:** `cp -Rc` in ein Wegwerf-Verzeichnis; `content/` ist dort ein echter
  Ordner, aber **prüf das mit `lstat`, bevor du darunter schreibst** — bei `Example` ist es ein
  Symlink auf den echten Vault. Config und Lockfile tragen absolute Pfade auf das Original; biege sie
  auf die Kopie um, bevor du dort etwas schreibst.
- **Die veröffentlichte Vorlage:**
  `curl -sfL https://raw.githubusercontent.com/boxi-os/quartzcontrol-templates/main/minimal-lesbar.qtpl`
  und `unzip -p … manifest.json`.
