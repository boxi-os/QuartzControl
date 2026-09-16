# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Electron + React + TypeScript desktop GUI for managing [Quartz 5](https://quartz.jzhao.xyz/) (jackyzha0's static-site generator) projects: load/save `quartz.config.yaml`, install/configure plugins (official CLI wrapper + a GitHub-based marketplace), switch the `content/` folder between a real directory and a symlink (e.g. an Obsidian vault), run builds, and control the local dev server. Supports multiple Quartz projects/profiles.

## Commands

- `npm run dev` — start in dev mode (electron-vite dev server + Electron window)
- `npm run build` — production build to `out/` (main, preload, renderer)
- `npm run start` — preview a production build
- `npm run typecheck` — `tsc --noEmit` against both `tsconfig.node.json` (main/preload) and `tsconfig.web.json` (renderer); there is no lint script and no unit tests in this repo
- `npm run smoke` — launches the production build (so `npm run build` first) and visits every screen in `App.tsx`, sub-tabs included, at 1280x800 and 1728x1000, reporting uncaught exceptions, console errors, `ErrorSurface` toasts, the route error boundary, a horizontally scrolling layout and an empty page. Not a test suite and it asserts nothing about content — it answers one question, *does every screen still come up*, which is otherwise only answerable by opening all nineteen of them. Each size is a fresh launch because `setViewportSize()` does not resize an Electron `BrowserWindow`
- `npm run screenshots -- --demo --cards [--only <teil>] [--scheme dunkel|beide]` — nimmt jeden
  Bildschirm für das Benutzerhandbuch auf und legt ihn im Handbuch-Vault ab. `--demo` legt dafür ein
  frisches Profil in einem Wegwerf-Verzeichnis an (`--user-data-dir`) und trägt über dieselben
  IPC-Pfade wie ein Klick zwei Projekte, drei Zugänge und drei Ziele ein
  (`scripts/screenshot-demo.mjs`, alle Namen unter `example.com`). Die Ziele leiht es sich im
  ersten, echten Projekt und gibt dessen `publish-targets.json` beim Beenden zurück, auch bei
  Ctrl+C. Ohne `--demo` zeigen die Bilder,
  was auf diesem Rechner eingerichtet ist — inklusive echter Server. `--scenes` nimmt statt der
  Routen die zehn Szenen auf, die eine Routenliste nicht trifft (`scripts/screenshot-scenes.mjs`):
  Dialoge, Formulare, der Frame-Editor beim Ziehen, ein fertiger Build, der laufende Dev-Server.
  Es **verlangt** `--demo`, weil es „Jetzt bauen" und „Starten" klickt und das sonst im echten
  Projekt dieses Rechners täte (der Build leert dessen `public/`); wer genau das will, sagt
  `--echtes-projekt` dazu. Ohne `--demo` schreibt das Skript die gewählte Sprache in das Profil des
  Nutzers und **stellt sie danach zurück**, auch wenn die Aufnahme abbricht — und zwar auch in den
  Zustand „keine gesetzt“, der der häufigste ist: Die Einstellung ist optional, der Store füllt
  keine Vorgabe auf, und wer die Sprache nie angefasst hat, hat den Schlüssel nicht. Der erste
  Anlauf las dieses fehlende `language` als „nichts zurückzustellen“ und ließ das `de` des Laufs
  stehen.
  Nicht gescriptet werden können die nativen Bestätigungsdialoge — sie sind Fenster des Systems,
  kein DOM. Zwilling von `smoke.mjs`: gleicher
  Launcher, gleiche Wartelogik, **gleiche Routenliste** aus `scripts/routes.mjs` — sonst zeigt das
  Handbuch Bildschirme, die der Smoke-Test nicht mehr besucht. Zwei Dinge, die dabei gemessen sind:
  eine Vollseiten-Aufnahme gibt es nicht (ein Fenster wird nicht höher als der Arbeitsbereich —
  angefragt 2400 px, bekommen 923), deshalb nimmt `--cards` jede Karte einzeln auf; und die
  **Zugänge-Karte wird nie automatisch aufgenommen**, weil sie echte Server, Benutzernamen und
  Host-Key-Fingerprints des Rechners zeigt, auf dem das Skript läuft. Ablauf und Gliederung des
  Handbuchs: [`docs/handbuch.md`](docs/handbuch.md)
- `npm run build:handbook` — baut das Benutzerhandbuch aus seinem Quartz-Projekt nach
  `resources/handbook/` (453 Dateien, 35,4 MB am 2026-09-10, davon 29,9 MB Bilder — die Zahl wächst
  mit jedem Textdurchgang), von wo `extraResources` es in die App legt. Das
  Handbuch reist mit statt als Link: Es ist ohne Netz lesbar und passt immer zu der Fassung, die
  gerade installiert ist. Behandelt wie `resources/git` — gitignoriert und beim Packen erzeugt
  (`beforePack`), nicht wie `resources/templates` im Repo, denn es ist ein Artefakt, dessen Bilder
  bei jedem Textdurchgang neu entstehen. Anders als git lässt es sich **nicht** aus dem Netz holen;
  fehlt das Projekt, **bricht `beforePack` ab**, es sei denn, `QUARTZCONTROL_WITHOUT_HANDBOOK=1`
  sagt ausdrücklich „ohne“ (dann sagt es der Menüpunkt dem Nutzer). Bis zum Review 2026-09-18
  warnte es nur und packte weiter, und das war zweimal der stille Normalfall: nach dem Umzug der
  Projekte auf diesem Mac, und vorher auf jeder anderen Baumaschine — gemessen am 2026-09-09 trug
  `resources/` auf der Linux-VM nur `git licenses runtime templates`, die Pakete vom 2026-09-08
  reisten also alle ohne Handbuch. Deshalb gibt es einen zweiten Weg:
  **`QUARTZCONTROL_HANDBOOK_SITE`** zeigt auf eine schon gebaute Website und wird übernommen statt
  gebaut (`QUARTZCONTROL_HANDBOOK_PROJECT` verschiebt den ersten Weg), und das Bau-Log sagt, welcher
  gegriffen hat. Wo die Projekte dieses Rechners liegen, sagt `scripts/project-paths.mjs` — eine
  Stelle für alle Skripte, Standard `~/Documents/QuartzProjekte/` (seit dem Umzug am 2026-09-12),
  überschreibbar mit `QUARTZCONTROL_PROJECT_ROOT`. Von Hand nach `resources/handbook` zu kopieren
  hilft **nicht**: Der Fehlerpfad räumt eine vorhandene Kopie absichtlich weg, damit keine veraltete
  mitreist. Gespiegelt wird mit
  **tar durch ssh**, und zwar mit beidem: `COPYFILE_DISABLE=1 tar --no-xattrs -cf -
  -C resources/handbook . | ssh <vm> 'tar -xf - -C <ziel>'`. Ohne die Variable kommen
  AppleDouble-Dateien mit (gemessen: 901 statt 437 Dateien, 464 davon `._*`); ohne `--no-xattrs`
  reisen macOS' xattrs als pax-Kopfzeilen mit, die GNU tar auf der Gegenseite Zeile für Zeile als
  `LIBARCHIVE.xattr.com.apple.provenance` anmeckert — folgenlos, aber unübersichtlich (gemessen am
  2026-09-10: mit `COPYFILE_DISABLE=1` allein kamen 453 Dateien und keine einzige `._*` an, dafür
  eine Meldung je Datei). **rsync ist hier kein Ausweg**: macOS liefert openrsync (Protokoll 29,
  ohne `--no-xattrs`), und auf einer frischen Debian-13-VM ist rsync gar nicht installiert
- `npm run build:handbook-pdf` — macht aus dem *gebauten* Handbuch (`resources/handbook`, also nach
  `build:handbook`) ein PDF mit Lesezeichen, nur Deutsch, nach
  `release/QuartzControl-Handbuch-<version>.pdf`. Chrome lädt jede Seite, das Skript setzt die
  `<article>` zu einem Dokument zusammen und druckt es getaggt mit `outline` — Kapitel, Seiten und
  Abschnitte werden zu drei Ebenen Lesezeichen (am 2026-09-14: 10/48/235, 115 Seiten, 11 MB).
  Braucht Google Chrome. Bricht ab, bevor es druckt, wenn ein Element über den Druckrand steht, ein
  Verweis kein Ziel hat, ein Bild nicht lädt oder eine Seite auf oberster Ebene nicht in `APPENDIX`
  steht — gegengeprüft mit der Tabellenregel der Vorlage (120 Elemente je 16 px über dem Rand) und
  einer zusätzlichen Seite. Einzelheiten in [`docs/handbuch.md`](docs/handbuch.md)
- `npm run fetch:git` — holt das mitgelieferte git (dugite-native) für diesen Rechner nach
  `resources/git/<platform>-<arch>/` und dünnt es aus; beim Packen macht das `beforePack` von selbst
- `npm run check:runtime -- <projektpfad>` — die eingebettete Node-Laufzeit gegen ein echtes Projekt:
  Shims, Node-Version gegen Quartz' Untergrenze, mitgeliefertes npm, der yargs-Loader mit Gegenprobe,
  ein Unterkommando des Quartz-CLI und ein vollständiger Build in einem Wegwerf-Ordner. Existiert aus
  demselben Grund wie `check:i18n`: keiner dieser Fehler wird im Typcheck oder im Build sichtbar, sie
  passieren alle in einem Kindprozess
- `npm run check:semver` — die 18 Versionsvergleiche, die der Update-Hinweis trifft. Braucht weder
  App noch Netz; existiert, weil die interessanten Fälle Vorabversionen sind (`beta.10` ist neuer
  als `beta.9`, `1.0.0` neuer als beide) und ein Zeichenkettenvergleich beide falsch beantwortet
- `npm run check:plugin-names -- [projektpfad]` — die 18 Quellen, aus denen der Name entsteht, gegen
  den Quartz `layout.byPageType.<typ>.exclude` vergleicht. Ohne Pfad nur gegen eine Tabelle; mit Pfad
  zusätzlich gegen Quartz' **eigene** `extractPluginName`, aus `config-loader.ts` herausgeschnitten
  und ausgeführt. Existiert, weil ein Fehler darin wie ein Schalter aussieht, der nichts tut — genau
  das war er für jedes `@quartz-community/*`-Plugin —, und weil die Gegenprobe sofort einen Rand fand,
  der beim Lesen richtig aussah (`path.basename` trennt am Backslash nur auf win32)
- `npm run check:core-update` — der Plan, nach dem das Core-Update `package.json` und
  `package-lock.json` behandelt: elf Fälle gegen `shared/packageJsonDeps.ts` (das Skript lädt die
  Datei, statt sie abzuschreiben), dazu die npm-Aufrufe, die daraus entstehen. Braucht weder App
  noch Projekt noch Netz. Existiert, weil ein falscher Plan wie ein gelungenes Update aussieht und
  erst auffällt, wenn ein Paket fehlt, das vorher da war — und weil er schon beim ersten Lauf einen
  Rand zeigte: Ohne Vergleichsstand ist *jeder* Schlüssel eine Abweichung, also Finger weg. Die
  drei Fälle ab dem sechzehnten Review sind die, die vorher niemand gestellt hatte: ein umgepinntes
  Paket (die Typdoku nannte „re-pinned“, kein Fall prüfte es), eines, das beide Seiten mit demselben
  Bereich hinzugefügt haben, und eines, das von `dependencies` nach `devDependencies` gewandert ist
- `npm run check:i18n` — every literal `t('…')` and `mainT('…')` key against `de.ts`, `en.ts` and
  `electron/main/i18n.ts`, plus de/en parity in both directions. A literal counts wherever it can be
  the key (both branches of `t(cond ? 'a' : 'b')`, the values of `mainT({…}[x])`); a key built from a
  variable cannot be checked, and the script prints how many calls that leaves out. Static and instant; it exists because
  i18next renders a missing key *as the key* rather than failing, so a gap is invisible until someone
  opens the one screen state that uses it (`publish.pages.saveSettings`, found in the alpha test, was
  missing from both files and therefore in perfect parity)
- `npm run check:handbook` — die Blockzitate des Benutzerhandbuchs gegen das, was die App wirklich
  sagt. Existiert aus demselben Grund wie `check:i18n`, nur eine Ebene weiter: Ein Zitat, das die
  App so nicht mehr sagt, sieht aus wie ein Beleg, und kein anderer Test sieht es, weil das
  Handbuch außerhalb dieses Repos liegt. Prüft je Sprache gegen die passende Sprachdatei — beim
  ersten Lauf gegen die englische Fassung fielen sieben Zitate durch, weil sie übersetzt statt
  übernommen waren. Überspringt sich still, wenn der Vault fehlt
- `npm run check:tokens -- [baseUrl]` — ändert jede Variable, die die Beispielvorlage schreibt, in
  einer *laufenden* Seite und zählt, wie viele berechnete Werte sich bewegen. Existiert, weil ein
  Token auf drei Arten wirkungslos sein kann, ohne dass die Datei es zeigt: niemand liest es, eine
  ungeschichtete Regel gewinnt, oder das Zielelement hat die Eigenschaft direkt gesetzt (dann kommt
  keine Vererbung an). Am 2026-09-06 waren so 4 von 53 Tokens tot. Besucht jede Seite auf zwei
  Breiten mit fokussiertem Bedienelement, weil Fokus- und Breakpoint-Tokens sonst als tot gelten;
  braucht einen laufenden Server (der Dev-Server der App genügt, das Skript liest nur)
- `npm run template:example` — baut die Beispielvorlage (`scripts/example-template/`) in einem
  Wegwerf-Projekt auf und exportiert sie als `.qtpl`. Treibt dafür die **gebaute App** über
  Playwright und schreibt alles über `window.quartzGui.*`, also durch dieselben IPC-Pfade wie ein
  Klick — kein zweiter Frame-Codegen, kein zweiter SCSS-Writer. Phasen einzeln über
  `--only 3,4,5`, die WCAG-Messung allein über `--check-contrast` (93 Paare, braucht weder App noch
  Projekt). Den Rückweg geht `--sync`: Es holt die 30 Stylesheets und die Schnipsel aus dem Projekt
  zurück ins Repo, denn dort wird gearbeitet und die Kopie hier driftet sonst still (gemessen am
  2026-09-05). `--check-sync` vergleicht nur und schreibt nichts — der Aufruf für den Fall, dass
  noch nicht feststeht, welche Seite vorn ist. Er existiert, weil die Drift auch andersherum
  läuft: eine Regel, die im Repo entstand und nie mit `--only 5` vorgeschoben wurde, hätte `--sync`
  gelöscht statt gemeldet, und die Messung daneben war an einer Website gemacht, die sie nicht
  hatte (2026-09-10). Config und Frames haben bewusst keinen Rückweg — sie entstehen aus `plugins.mjs`,
  `variables.mjs`, `layout.mjs` und `frames.mjs`, und ein Rückleser wäre deren zweite, inverse
  Umsetzung. Ist zugleich der einzige End-to-End-Test der Vorlagen-Funktion: Phase 11 importiert das
  Paket in ein zweites leeres Projekt und baut es. Die Werkstatt der Variante `example` ist das
  Beispielprojekt selbst (bis 2026-09-04 hieß es `quartz-vorlage-werkstatt`); alles, was ein Lauf
  neu anlegen darf — die Werkstätten der Varianten, die Gegenprobe —, entsteht unter
  `<Projektwurzel>/werkstatt/`, weil das Skript seine Werkstatt per `projects.add` in die App-Liste
  einträgt. Was dabei gefunden wurde, steht in
  `scripts/example-template/BEFUNDE.md`

- `node scripts/stagger-vault-mtimes.mjs [--list] [--apply] [--restore <datei>]` — staffelt die
  Änderungszeiten des Beispiel-Vaults nach der Gliederung, eine Minute je Schritt, kleine Nummer =
  zuletzt bearbeitet. Existiert, weil die Ordner- und Tag-Listen dieses Projekts nach der mtime
  sortieren, das Frontmatter kein Datum trägt und `content/` ein Symlink ist — git liefert dazu
  nichts, und **git speichert auch keine mtimes**, es gibt also keinen Rückweg außer der Sicherung,
  die `--apply` vorher schreibt. Eine Textänderung an vielen Notizen setzt sonst alle auf dieselbe
  Sekunde und wirft jede Liste um. Die Sortierregel ist wörtlich die der Website (`index.md`
  zuerst, dann nach Titel mit `localeCompare(numeric: true)`, Dateien und Unterordner gemischt),
  Deutsch und Englisch paarweise verschränkt, Anker fest — zweimal laufen ändert nichts. Ohne Flag
  zeigt es nur, was es täte. Am 2026-09-06 war dasselbe von Hand gemacht worden und deshalb halb:
  die 149 unnummerierten Blattnotizen blieben auf einer Sekunde stehen, und sechs später angefaßte
  Diagramm-Notizen waren danach der ganze Inhalt des Kastens „zuletzt bearbeitet"
- `node scripts/styles-snapshot.mjs <datei.json>` bzw. `--diff <a> <b>` — nimmt die *berechneten*
  Farben und Schriftmaße jedes Elements auf jeder Route in hell und dunkel auf und vergleicht zwei
  Aufnahmen; `--hover` fährt zusätzlich jedes Element mit einer `hover:`-Farbe per echter
  Mausbewegung an. Braucht den Bau. Existiert aus demselben Grund wie `check:i18n`: ob eine
  Palette-Klasse durch das richtige Token ersetzt wurde, sieht weder der Typcheck noch der Build,
  und ein Diff der Klassennamen beantwortet die einzige Frage nicht — sieht es hinterher genauso
  aus. Indiziert wird über die Position im DOM, nicht über die Klasse, und genau deshalb trägt der
  Vergleich über die Umstellung hinweg

- `npm run dmg:background` — zeichnet `build/background.png` und `background@2x.png`, den Grund des
  DMG-Fensters. Muss existieren, weil „kein Hintergrund gesetzt“ bei electron-builder nicht heißt
  „kein Hintergrund“: `dmg-builder` greift dann zu seiner eigenen Vorlage, einem grauen Feld mit
  gestricheltem Kasten und Pfeil, die beide nicht dort liegen, wo `dmg.contents` die zwei Symbole
  hinstellt — genau das lag im 0.1.0-DMG. Rastert über Electron, weil dieser Rechner keinen
  SVG-Konverter hat, und liest die zwei x-Werte aus derselben Quelle wie die Konfiguration
- `npm run dist` / `dist:mac` / `dist:linux` / `dist:flatpak` — electron-builder (see
  `docs/decisions/electron-runtime-and-packaging.md`). **Auf einer Baumaschine ohne
  Handbuch-Projekt (den VMs) zuerst das gebaute Handbuch spiegeln und
  `QUARTZCONTROL_HANDBOOK_SITE` setzen**, sonst bricht `beforePack` ab (Eintrag `build:handbook`).
  Was ein Release außerdem braucht — Vorlage in drei Kopien, `latest.json`, Footer an sechs
  Stellen, Band und Download-Kasten der Website —, steht in [`docs/release.md`](docs/release.md).
  `dist:flatpak` ist ein eigenes Skript, weil
  das Ziel flatpak und flatpak-builder auf der Baumaschine braucht. **Am 2026-09-08 zum ersten Mal
  gebaut** (Debian 13, aarch64): das Paket entsteht, installiert sich als
  `io.github.boxi_os.quartzcontrol`, startet, und in der Sandbox antworten der `node`-Shim mit
  24.18.1, npm mit 11.17.0 und `/app/bin/git` mit 2.53.0. Die Baumaschine braucht flathub als
  **user**-Remote, nicht nur systemweit — sonst scheitert der Bau an einem `flatpak failed with
  status code 1`, das seinen Grund verschweigt. **AppImage und deb bauen seit dem 2026-09-09 beide
  Architekturen** (`arch: [arm64, x64]` wie bei `mac:`), und zwar cross in beide Richtungen: ein
  `npm run dist:linux` auf einer x86_64-VM lieferte in sieben Minuten alle vier Pakete, jedes mit
  dem git-Bundle seiner eigenen Architektur. **Der Flatpak ist die Ausnahme** — flatpak-builder
  braucht Runtime, SDK und BaseApp der Zielarchitektur und kompiliert das git-Modul aus der Quelle,
  ein x86_64-Flatpak entsteht also nur auf einer x86_64-Maschine. Ein Cross-Paket prüft man nicht
  mit dem Werkzeug darin: `--appimage-extract` startet die Laufzeit des fremden Startprogramms, der
  Inhalt kommt nur über `unsquashfs -o <offset>` heraus. **Der x86_64-Flatpak ist am 2026-09-09
  gebaut und gestartet** (193 MB, in der Sandbox antworten node 24.18.1, npm 11.17.0 und
  `/app/bin/git` 2.53.0, und diesmal liegt das Handbuch drin) — er kostete auf der emulierten VM
  rund 46 Minuten gegen 7 für alle vier AppImage/deb-Pakete, praktisch vollständig das `make` von
  git im Sandkasten. v1 liefert damit macOS (arm64/x64), AppImage und deb (arm64/x64) und Flatpak
  (aarch64 seit 2026-09-08, x86_64 seit 2026-09-09)

If `npm install` leaves `node_modules/electron` half-installed (`electron-vite dev` fails with `Error: Electron uninstall`), the postinstall's `extract-zip` step may have silently produced a partial extraction in a sandboxed shell. Fix: `rm -rf node_modules/electron/dist node_modules/electron/path.txt`, then `unzip -q <cached zip under ~/Library/Caches/electron/...> -d node_modules/electron/dist` and write the platform binary path (e.g. `Electron.app/Contents/MacOS/Electron`) into `node_modules/electron/path.txt` with no trailing newline.

## Konventionen und Architekturentscheidungen

Die Kurzfassung dessen, was gilt und warum. Die Messungen hinter jedem Punkt stehen in
`docs/decisions/` (Liste unten); hier steht nur die Regel. Neue Regeln kommen mit dem Experiment dazu,
das sie erzwungen hat - in den Code als Kommentar, in `docs/decisions/` als Absatz.

### Prozessgrenze

- **Drei Prozesse, ein Vertrag.** `shared/ipc-contract.ts` ist die einzige Quelle für Kanalnamen,
  Payload-Typen und die `QuartzGuiApi`-Schnittstelle. Reihenfolge einer Änderung: Vertrag → Schema
  (`ipc/schemas.ts`) → Handler → Preload → Renderer. Der Typcheck erzwingt die Vollständigkeit.
- **Jeder Kanal hat ein zod-Schema, sonst ist es ein Bug.** Der Renderer ist keine Vertrauensgrenze:
  er rendert Daten von GitHub. Schemas sind bewusst *loser* als die Typen (`looseObject`, `record`),
  weil `z.object()` unbekannte Keys streicht und damit den Config-Roundtrip bricht. Daraus folgen die
  `as`-Casts in `handlers.ts`.
- **Ein Vorlagen-Paket ist so wenig eine Vertrauensgrenze wie der Renderer.** Ein `.qtpl` ist eine
  Datei, die jemand weitergereicht hat: `readZip` weist ein Archiv mit absolutem Namen,
  `..`-Segment, Laufwerksbuchstaben oder NUL komplett zurück, und ein Name aus einem Baustein wird
  nie ungeprüft auf ein Verzeichnis gelegt - `containedPath()` (`templatePackage/shared.ts`)
  entscheidet per `resolve()`+`relative()`, in `plan` wie in `apply`. Messungen in
  [`templates-and-localization.md`](docs/decisions/templates-and-localization.md).
- **Neue Kanäle nehmen ein Objekt-Argument**, kein Positions-Tupel (`dialog.confirm` ist das Muster):
  ein späterer optionaler Key ist dann eine Zeile im Vertrag und eine im Schema, nicht ein vierter
  Slot in vier Dateien. Bestehende Kanäle bleiben, wie sie sind (123 mit Positions-Argumenten,
  kein Umbau), und es gibt keinen neuen Kanal für etwas, das ein bestehender mit einem Flag kann.
- **Der Renderer läuft in der Chromium-Sandbox** (`sandbox: true`, seit 2026-09-02). Das Preload wird
  deshalb als CommonJS gebaut (`electron.vite.config.ts`): Electron lädt ein ESM-Preload nur ohne
  Sandbox, und genau das war der einzige Grund für das frühere `sandbox: false`. Im Preload gibt es
  kein Node - `platform` kommt aus Electrons Prozess-Polyfill, `homeDir` aus `process.argv`, wohin
  `createWindow` es über `webPreferences.additionalArguments` legt. Beides liegt synchron beim ersten
  Render vor, was `titlebarStripClass` braucht.
- **Nur `ipcMain.handle` über `handle()`/`handleNoArgs()`; kein `ipcMain.on`.** Events von Main zum
  Renderer gehen über `broadcast()` an alle Fenster; der Renderer abonniert über `onEvent` mit
  Rückgabe eines Abmelders. Sieben Events laufen so (`server:log`, `build:log`,
  `server:statusChanged`, `build:activityChanged`, `deploy:progress`, `templatePackage:progress`,
  `content:progress`); das achte, `app:navigate`, sendet `menu.ts` selbst an alle Fenster, weil das
  Menü ohne den Handler-Kontext lebt.
- **Alles, was Main aus Projektdateien liest und an Prozesse gibt, ist mit `--` getrennt; `git`
  bekommt nie eine Shell; nur npm/npx brauchen eine.** `runCommand.ts` ist der eine Spawner für
  kurzlebige Kommandos.
- **Quartz und npm laufen unter Electrons eigener Node-Laufzeit; git kommt vom System, wenn es dort
  eines gibt, und sonst ebenfalls aus der App.**
  `nodeRuntime.ts` schreibt bei *jedem* Start drei Shell-Skripte (`node`, `npm`, `npx`) nach
  `<userData>/runtime/bin` und hängt das Verzeichnis vorn in den PATH — jedes Mal neu, weil der
  Pfad auf die Electron-Binärdatei im AppImage pro Start wechselt. Ein neuer Spawn muss davon
  nichts wissen: er ruft weiter `npx`. Die Shim-Vorlage steht in `resources/runtime/shim.sh`, weil
  `scripts/check-runtime.mjs` dieselbe füllt; der `-r`-Loader
  (`resources/runtime/defaultapp.cjs`) setzt `process.defaultApp`, ohne den liest yargs den
  Skriptpfad als Kommandonamen. npm reist als exakt gepinnte devDependency mit und braucht in
  `electron-builder.yml` **zwei** `extraResources`-Einträge. `ensureToolPath()` sucht deshalb nach
  **git**, nicht nach node. Der Ausweg ist eine Einstellung (`nodeRuntime: 'embedded' | 'system'`,
  Vorgabe eingebettet) für den einen Fall, der ihn braucht: ein Paket, das node-gyp verlangt.
  Warum nicht „Host zuerst" wie bei git, und alle Messungen: siehe
  [`electron-runtime-and-packaging.md`](docs/decisions/electron-runtime-and-packaging.md).
  Für git gilt die umgekehrte Regel (`gitRuntime.ts`): das vom Rechner gewinnt, sobald es auf
  `git --version` *antwortet* — es trägt die Einrichtung des Nutzers, und eine Versionsuntergrenze
  gibt es nicht. Sonst das mitgelieferte (`scripts/fetch-git.mjs`, `npm run fetch:git`, geholt beim
  Packen über `beforePack`), mit `GIT_EXEC_PATH`, `GIT_TEMPLATE_DIR` und auf Linux
  `GIT_SSL_CAINFO`. Der gemeinsame Satz hinter beiden Regeln: **es gewinnt die Quelle, die die
  Anforderung garantiert erfüllt.** Damit kann kein Werkzeug mehr „fehlen, aber nachinstallierbar"
  sein — fehlt eines, ist die Installation unvollständig, und genau das sagt das Warnband.
- **Code aus dem `node_modules` eines Projekts läuft an genau zwei Stellen im Hauptprozess**:
  `sass` für den SCSS-Check (`styleService`) und `globby` für die Liste der Startseite
  (`contentService`). Beides fragt das Modul des Builds, statt eines mitzubringen oder
  nachzubauen — und beides läuft damit neben `safeStorage`, das die Zugangsdaten entschlüsselt;
  ein Kindprozess bekommt höchstens das eine Geheimnis seiner Aktion. Hingenommen, weil es Quartz'
  eigene Abhängigkeiten sind, die jeder `quartz build` ohnehin ausführt: Wer dort ein feindliches
  Paket ablegt, führt schon Code als der Nutzer aus. Eine dritte Stelle beruft sich nicht auf
  „`sass` macht das auch“, sondern sagt selbst, warum das Modul das des Builds ist und warum es
  nicht im Kind laufen kann; der Ausweg wäre ein Skript unter der eingebetteten Laufzeit über
  `runCommand`, dann auch für `sass`. Begründung in
  [`process-model-and-ipc.md`](docs/decisions/process-model-and-ipc.md).
- **Eine Datei, die ein Werkzeug erzeugt, wird nicht gemergt, sondern neu erzeugt.** `package.json`
  und `package-lock.json` gehören npm, und beim Core-Update schreiben beide Seiten sie: Quartz'
  `3dff48b` hob alle Plugin-Versionen an, die Projekte hatten eigene Theme-Pakete darin. Uncommittet
  verweigerte git den Merge, committet ließ er zwei Dateien im Konflikt und einen hängenden Merge
  zurück, an dem jeder weitere Versuch starb. `runCoreUpdate` rechnet deshalb vorher einen Plan
  (`shared/packageJsonDeps.ts`), nimmt Quartz' Fassung beider Dateien und lässt npm die eigenen
  Pakete zurückschreiben. Was der Plan nicht nachspielen kann — ein lokal entferntes Paket, eine
  Änderung außerhalb der Abhängigkeitsblöcke —, fasst die App nicht an: Dann entscheidet git, und
  der Nutzer liest die Meldung, die er auch vorher las. Drei Ränder, die das sechzehnte Review
  gemessen hat und die jetzt dazugehören: **Die zwei Dateien werden nicht weggeworfen, sondern an
  git gegeben** (`git stash push -m 'QuartzControl: core update'`), weil ein Merge aus mehr Gründen
  hängen bleibt als wegen ihrer — bei einem halb fertigen Merge bleibt der Stash stehen und
  `abortCoreMerge` poppt ihn nach `merge --abort`. **Der Plan fragt die Merge-Basis, die Türen
  öffnen sich gegen HEAD**, also gibt es einen zweiten Vergleich (`localPackageChanges(head, ours,
  head)`) für das, was der Reset wegnimmt, und `stillMissing()` für das, was die gemergte Datei
  noch nicht sagt. **Und angefasst wird nur, was `git ls-files` führt**: `git checkout -- a b` ist
  alles oder nichts, und ein Pfad, den HEAD nicht kennt, wird im Konflikt als gelöscht aufgelöst
  statt mit `--theirs` zurückgeholt. Messungen in
  [`snapshots-and-updates.md`](docs/decisions/snapshots-and-updates.md).
- **Ein Kindprozess, der die App überleben soll, hängt nicht an einer Pipe zu ihr.** Die Leseenden
  von stdout/stderr sterben mit dem Prozess, der sie hält, und der nächste Schreibversuch des Kindes
  bringt es um — bei einem Dev-Server also der erste Rebuild nach dem Beenden der App, ohne Meldung,
  weil niemand mehr liest. Die Ausgabe geht deshalb in eine Datei unter `.quartz-gui/logs/`, die
  Main tailt (`buildService.ts`); zwei Dateien, weil die Konsole stderr einfärbt. Ein neues
  Verzeichnis unter `.quartz-gui/` muss zwei Listen lernen: `isSnapshotWorthy()` nimmt alles mit,
  was nicht ausdrücklich genannt ist, und `duplicateService` kopiert alles, was nicht in `SKIP`
  steht. Messungen in [`navigation-and-pages.md`](docs/decisions/navigation-and-pages.md).
- **Ein Ausgabeordner hat einen Schreiber, und die zwei Richtungen bekommen zwei Antworten.** Ein
  einmaliger Build leert `public/` und schreibt es neu, der Dev-Server baut bei jeder Änderung
  hinein — beides zugleich hinterlässt einen Stand, der von keinem der beiden ist. „Jetzt bauen“
  wird deshalb **abgelehnt**, solange der Server dieses Projekts denselben Ordner hält
  (`assertOutputFree()`, im Handler vor der Ordner-Rückfrage und noch einmal in `runBuild`), mit
  den zwei Wegen in der Meldung; „Starten“ dagegen **wartet** auf den laufenden Build, weil nur
  diese Richtung warten kann, ohne dass jemand ein zweites Mal klickt — und sagt in der Konsole,
  worauf. **Das Warten hat dafür einen Eintrag** (`pendingStarts`, Status `starting`): Ein Fenster,
  in dem der Status „stopped“ heißt und der Knopf „Starten“ dasteht, ist genau das, worauf ein
  zweites Mal geklickt wird — und ohne den Eintrag war dieses Fenster die Dauer des Builds statt
  der 38 ms von `refreshAuthoredFrames`, die es vor der Sperre war. Wer während des Wartens stoppt,
  bricht das Warten ab; es gibt nichts zu signalisieren, und beide Seiten bieten dafür bei
  `starting` „Stoppen“ an. `startedAt` entsteht beim Spawn, nicht beim Klick — dazwischen liegt
  jetzt ein ganzer Build, und „Gestartet vor …“ liest die Zeit.
  `stopping` zählt weiter als Schreiber, ein wartender Start auch. Ein Server aus einer früheren Sitzung gehört
  keinem Eintrag und wird nicht gesehen; ihn zu finden hieße, bei jedem Klick Ports abzusuchen.
  Messungen in [`navigation-and-pages.md`](docs/decisions/navigation-and-pages.md).
- **Wer einen Zustand aus fremden Ausgabezeilen liest, weiß, wessen Zeilen er liest.** Ob gerade
  gebaut wird, hält `buildService` als *eine* Aktivität je Projekt, und zwei Quellen schreiben
  hinein: das stdout von `quartz build` und das Log des Dev-Servers. Jede bewegt nur die Aktivität,
  die ihr gehört, und ein laufender Build gewinnt — sonst ersetzt ein Neubau des Servers die Zeile
  des Builds und räumt sie ab, und mit ihr die Sperre (zwölftes Review: 3,3 von 6,9 s). Ein Muster
  wird gegen alle Ströme gelesen, auf denen Quartz den Satz schreibt („Rebuild failed“ kommt über
  `console.error`), und gegen beide Neubauten (der harte nach jedem Speichern in der App sagt einen
  anderen Satz als der weiche). Ein zweiter „Jetzt bauen“ tritt dem laufenden nur bei, wenn er in
  denselben Ordner will. Messungen in
  [`navigation-and-pages.md`](docs/decisions/navigation-and-pages.md).
- **Jede Dekompression bekommt eine Obergrenze, und die Datei selbst liefert sie nicht.** Ein WOFF2
  sagt, wie lang seine Tabellen sind, ein ZIP-Eintrag, worauf er sich entpackt — geschrieben hat das
  jeweils der, von dem die Datei kommt. Also `maxOutputLength` an *jeder* Stelle: die eigene Zahl,
  wo sie kleiner ist, und eine absolute Decke darüber (64 MiB je Schrift, 256 MiB je Paket), geprüft
  *bevor* das erste Byte entpackt wird. Gemessen: 863 Bytes WOFF2 wurden zu 1,1 GiB RSS, ein 522-KB-
  Paket zu ebenso viel; darüber endet es nicht in `null`, sondern in einem abgebrochenen
  Hauptprozess. Der `catch` fängt einen `RangeError` aus einer begrenzten Dekompression, nie einen
  Out-of-Memory-Abbruch. Messungen in
  [`templates-and-localization.md`](docs/decisions/templates-and-localization.md).
- **Ja/Nein-Bestätigungen laufen über den nativen Dialog im Main-Prozess. In-App-Overlays sind nur
  für Inhalte mit Formular oder Auswahl.** Der Renderer fragt über `confirmDialog()`
  (`src/utils/confirm.ts` → Kanal `dialog.confirm`), nie über `window.confirm()`. Die sichere Antwort
  sitzt in `buttons[0]` mit `cancelId: 0` - `defaultId` entscheidet unter macOS nicht, was Return tut.
  Der bestätigende Button ist nach der Aktion benannt („Snapshot löschen“), nie „OK“. Die Regel steht
  als Kommentar am Handler und am `Modal`-Primitive, damit sie nicht driftet.
- **Das Benutzerhandbuch reist in der App mit, und nur der Hauptprozess weiß wo.** `handbookRoot()`
  in `menu.ts` löst `process.resourcesPath` (gepackt) bzw. `resources/` im Repo (Entwicklung) auf;
  `openHandbook()` prüft die Datei, bevor es sie öffnet — sonst bekäme der Nutzer bei einem Bau ohne
  Handbuch eine Fehlerseite statt eines Satzes. Der Renderer bekommt dafür einen Kanal **ohne
  Argument** (`dialog.openHandbook`, Muster: `revealUserData`) und ruft dieselbe Funktion: Zwei
  Stellen, die den Pfad selbst zusammensetzen, laufen auseinander. Gemessen an der gepackten App am
  2026-09-07: `isPackaged: true`, Pfad `Contents/Resources/handbook/index.html`, vorhanden;
  Bundle 369 → 395 MB.
- **Eine gebaute Website wird als Adresse geöffnet, nicht als Datei.** Was Quartz baut, ist für
  einen Webserver geschrieben: `./tags/publishing` ohne Endung, `./4-gestaltung/` als Verzeichnis,
  `/1-einstieg/` von der Wurzel *der Website*. Unter `file://` löst davon nichts auf — am
  2026-09-08 über die 123 gebauten Seiten gezählt: von 4876 Links zeigte **kein einziger** auf eine
  Datei (377 extern, 951 auf ein Verzeichnis, 2937 auf einen Namen ohne Datei, 611 auf die Wurzel
  des Dateisystems), und Chrome blockierte die Modul-Skripte gleich mit („origin 'null' … blocked
  by CORS policy"), also Suche, Explorer, Sprachwechsel und Dunkelmodus. Deshalb liefert
  `handbookServer.ts` das Handbuch über http auf `127.0.0.1` mit einem Port vom Betriebssystem aus
  und löst die drei Formen auf (Datei, `dir/index.html`, `name.html`), und `openHandbook()` ruft
  `shell.openExternal`. Das löst zwei Fragen mit derselben Antwort: `http:` geht **immer** an den
  Browser, während `shell.openPath` auf eine `.html` die Anwendung startet, die das System für
  `public.html` führt — bei jemandem, der Websites baut, gern ein Editor. Nach der Umstellung
  gemessen: 4499 von 4499 internen Links antworten mit 200, keine Konsolenfehler, und durch die
  gebaute App vier Aufrufe des Kanals auf einen Server. Der Server bindet nur die Loopback-Adresse,
  antwortet nur auf GET und HEAD, prüft die Einbettung nach `resolve()`/`relative()` und sendet
  **kein** `Access-Control-Allow-Origin`.
- **Fenster:** ein Fenster, `hiddenInset` nur auf macOS, `will-navigate` erlaubt nur das eigene
  Dokument, `setWindowOpenHandler` gibt nur http(s) an den Browser, CSP ohne externe Hosts. Theme
  wird in Main über `nativeTheme.themeSource` gesetzt, *vor* `createWindow()`.

### Renderer

- **Eine Route ist gemountet, und sie besitzt ihr Dokument.** Beim Mount lesen, in `useState`
  halten, expliziter Save, `dirty` durch Vergleich mit dem Gelesenen (nicht durch Flag beim ersten
  Tastendruck). Nach jedem eigenen Schreibvorgang neu lesen; ein Dokument wird nie über eine Aktion
  hinweg gehalten, die Main daran schreiben könnte. Fünf Seiten halten so je eine Kopie der Config;
  das ist sicher, solange nur eine Ansicht gemountet ist. Ein `project:changed`-Event kommt erst,
  wenn zwei Ansichten gleichzeitig leben - nicht vorher.
- **Was der Build liest, ist die Datei, nicht der Entwurf.** Ein Satz über eine Folge außerhalb der
  Seite — die Website zeigt ein kaputtes Bild, die Config nennt eine Datei, die fehlt — fragt den
  gespeicherten Stand (`savedSnapshot`), nicht das, was gerade im `useState` liegt. Der Hinweis am
  dunklen Projektbild las den Kopfbereich-Schalter aus dem Entwurf, und der Schalter stand direkt
  darüber: ausgeschaltet schwieg der Hinweis, obwohl die Datei das Bild noch nannte, eingeschaltet
  warnte er vor etwas, das nicht passiert (dreizehntes Review, an der gebauten App in vier Fällen
  gemessen, vorher zwei falsch).
- **Was im Renderer lebt, stirbt mit dem Fenster - unter macOS aber nicht die App.** Ein
  geschlossenes Fenster beendet weder die App noch die Dev-Server; alles, was danach noch stimmen
  soll, gehört in den Hauptprozess. Für die Log-Zeilen ist das `services/logBuffer.ts`, gelesen über
  `logs:history` beim Öffnen eines Projekts.
- **App-weit gibt es vier Dinge im Store** (`state/store.ts`): Projektliste, Settings, Fehler,
  Log-Puffer pro Projekt. Letzterer, weil Main Log-Zeilen unabhängig von der Seite sendet und ein
  seitenlokales Abonnement sie verlöre. Das Abonnement lebt einmal in `App.tsx`.
- **„Wo war ich“ überlebt einen Routenwechsel, nicht einen Neustart.** `useStickyState(key)` für
  Tab, Auswahl, Suchtext, Entwurf; keyed per Pathname, Namespace pro Komponente. Nicht für Gesten
  oder Pending-Flags. Scroll-Position analog in `ProjectLayout`. Schlüssel sind stabile Kennungen
  (ID, Name, Pfad), nie Listenindizes — ein Zustand an einer Position gehört nach dem Umsortieren
  zum falschen Ding. Die aufgeklappten Plugins waren der eine Fall, der so hing; sie hängen seit
  dem Instanzen-Durchgang am Namen (`stickyKey()` in `Plugins/Installed.tsx`, mit `#n` für die
  n-te Instanz desselben Plugins). Am 2026-09-06 nachgezählt: 20 `useStickyState`-Aufrufe im
  Renderer, davon 19 mit festem Schlüssel und genau einer mit einem berechneten — dem Namen oben.
  Keine Position. Ein Link in einen
  anderen Bereich, der mehr als einen Pfad übergeben will („diesen Frame im Layout-Editor öffnen“),
  schreibt vor der Navigation mit `primeStickyState(pathname, key, value)` in den Store der Zielroute;
  die liest es genau einmal beim Mount, danach ist der Aufruf wirkungslos.
- **Ein Menüpunkt, der die Seite meint, geht über `app:command`.** `app:navigate` bewegt den Router,
  `app:command` bittet die gemountete Seite (heute nur `'save'`, Cmd+S). Beide hören einmal in
  `App.tsx`; die Antwort auf ein Kommando steht in einem Modul-Register (`state/saveCommand.ts`),
  weil immer nur eine Route gemountet ist. Wer nichts zu tun hat, registriert `null` - ein Kommando
  ohne Registrierung tut nichts, und genau deshalb muss der Menüpunkt nicht ausgegraut werden.
- **Verlassen mit ungespeicherten Änderungen fragt.** Modul-Flag in `unsavedGuard.tsx`, gesetzt von
  der Seite, abgefragt von der Sidebar; `UnsavedBadge` neben dem Save. Nur Sidebar-Links sind
  geguardet. Die Frage ist ein nativer Dialog und damit asynchron: der Klick wird gestoppt und die
  Navigation von Hand ausgelöst. Drei Antworten, wenn die Seite ein Save registriert hat
  (`saveCommand.ts`): Abbrechen, Speichern, Verwerfen - bei einem gescheiterten Speichern bleibt der
  Guard auf der Seite, weil dort die Fehlermeldung steht.
- **Das registrierte Speichern schreibt alles, was `dirty` zählt.** Badge, Cmd+S und der
  Verlassen-Dialog lesen dasselbe Flag; ein Save, der weniger schreibt, macht aus der dritten Tür
  einen Datenverlust - „Speichern" gesagt, `true` zurückgemeldet, navigiert, und die Entwürfe der
  übrigen Reiter sterben mit der Route (*Eigenes CSS*, elftes Review). Wer eine Teilmenge speichern
  will, braucht einen eigenen Knopf, der seine Reichweite im Namen trägt - und der muss dann auch
  dastehen.
- **Ein Lesevorgang, dessen Schlüssel sich per Klick ändert, braucht einen Abbruch-Guard**
  (`useIpcQuery`). Zwei Antworten sind dann gleichzeitig unterwegs und die langsamere gewinnt, egal
  welche Frage später gestellt wurde. Wo der Schlüssel konstant ist oder sein Wechsel die Route neu
  mountet, ist ein Guard nur Zeremonie.
- **Ein Ref, den ein Effekt zurücksetzt, hängt an einem Render, den React auslassen darf.** Ein
  `setState` mit demselben Wert rendert nicht, der Effekt läuft nicht, und der Ref bleibt stehen —
  im Frame-Editor genügte ein Klick auf das schon aktive Breakpoint-Segment (`SegmentedControl`
  meldet auch den), und jedes Bereichsformular danach kam ohne Fokus. Wer einen Ref vor einem
  `setState` umlegt, prüft vorher, ob sich der Wert überhaupt ändert.
- **Kein API-Aufruf ohne Netz:** globaler `unhandledrejection`-Handler → Toast; jeder Busy-Flag wird
  in `finally` zurückgesetzt (`useAsyncAction` für boolesche, `try/finally` für keyed).
- **URL zuerst, Sticky-State als Fallback** für Sub-Tabs (`?tab=`); alte Pfade bleiben als
  Redirects. Gilt für alle vier Leisten (Konfiguration, Stile, Plugins, Layout); der Default-Tab
  löscht den Parameter, statt ihn zu setzen. Was kein Name aus einer festen Liste ist - der offene
  Seitentyp, das gerade bearbeitete Frame - bleibt sticky-only und reist bei einer Übergabe über
  `primeStickyState`.
- **Eine Stelle bestimmt die Seitenbreite** (`ProjectLayout`, 1800px). Seiten setzen keine eigene
  Maximalbreite; Breite wird in Spalten ausgegeben, nicht in längeren Zeilen. Ein Block, der schmal
  bleiben will, sagt am Block, warum.
- **Wer rollt, ist nicht wer die Breite deckelt.** Der Roller (`overflow-y-auto`) geht über die
  volle Fensterbreite, die Kappung sitzt in einem Kind darin. Beides an einem Element hängt die
  Rollleiste an den rechten Rand der zentrierten Spalte — bei 1728 px Fenster und `max-w-6xl` sind
  das 288 px vom Fensterrand, also mitten im Bild. `ProjectLayout` war schon so gebaut (`<main>`
  rollt, das innere `div` deckelt), Startseite und Einstellungen nicht. Eine Leiste oder ein Panel
  mit eigenem Roller ist davon nicht betroffen: Dort gehört die Rollleiste an die Kante des Panels.

### Primitives und Gestaltung

- **`ui.tsx` wrappt native Elemente; erweitern statt daneben bauen.** `Field` ist ein `<label>` und
  darf keinen Button enthalten (`FieldGroup` dafür). `className` auf einem Primitive ist Platzierung,
  nie Farbe. Neue Variante → `VARIANTS`, nicht Klasse von außen.
- **`Modal` ist das native `<dialog>` mit `showModal()`.** Top-Layer, Backdrop, Escape, inerter
  Hintergrund und Fokus-Rückgabe kommen vom Element; `<form method="dialog">` macht Return zum
  Bestätigen, und ein deaktivierter Submit-Button unterdrückt das implizite Absenden. Das Feld, das
  den Fokus bekommen soll, trägt `data-autofocus`. Kein `fixed inset-0`-Overlay mehr, nirgends -
  gemeint sind Vollflächen-Overlays, die die Seite abdecken; die Toasts in `ErrorSurface`
  (`fixed bottom-4 right-4`) decken nichts ab und bleiben erlaubt.
  Bestätigen und Schließen sind zwei Callbacks, `dialog.returnValue` wird nicht benutzt: `onSubmit`
  fängt das Absenden ab (Return, Submit-Button), der Dialog bleibt dabei offen, und die Seite
  schließt ihn über `open` bzw. Unmount, wenn ihre Aktion durch ist. `onClose` heißt immer „nicht
  bestätigt“: Escape, oder ein Absenden in einem Modal *ohne* `onSubmit`. Ein Abbrechen-Button ruft
  dieselbe Funktion wie `onClose` direkt auf; das Schließen über `open`/Unmount löst `onClose` nicht
  noch einmal aus (`closingOurselves`). Ein Modal mit Eingabe hat `onSubmit`; ein Modal ohne
  Eingabe darf ohne auskommen - dann heißen Return und Escape beide „nicht bestätigt“, und für
  einen Anzeige-Dialog ist genau das richtig.
- **`Button` hat `type="button"` als Default.** In einem Formular reicht ein untypisierter `<button>`
  ein; der eine Button pro Dialog, der das soll, sagt `type="submit"`. `SegmentedControl`s Segmente
  tragen ihn seit U3 ebenfalls.
- **`SegmentedControl` ist eine Radiogruppe, keine Knopfreihe.** `role="radiogroup"` mit
  `role="radio"`-Segmenten, `aria-checked`, Roving-Tabindex (die Gruppe ist ein Tabstopp), Pfeile
  links/rechts/hoch/runter wandern durch die Optionen und *ändern dabei die Auswahl*, mit Umbruch an
  beiden Enden - so wie es die native Radiogruppe in diesem Chromium tut und wie jeder Klick hier
  ohnehin sofort committet. Auch für die vier Sub-Tab-Leisten: `tablist` ohne `aria-controls` auf ein
  `tabpanel` wäre ein halber Vertrag, „eins von N“ stimmt überall. Der Fokus wandert *vor* `onChange`,
  weil vier Aufrufstellen dabei navigieren. `label` ist Pflicht wie bei `Toggle` und wird zu
  `aria-label` (eine Gruppe hat kein `<label>`, das sie umschließen könnte); eine Gruppe ohne Namen
  ist damit am Aufrufer sichtbar falsch. Die Optionen dürfen Daten sein statt einer festen Liste -
  der Ziel-Wähler in Veröffentlichen ist seit 2026-09-03 einer, weshalb die Gruppe umbricht statt
  überzulaufen. **Dafür gibt es seit 2026-09-06 `variant="chips"`**: die gemeinsame graue Leiste
  setzt voraus, dass alles in eine Zeile passt, und `w-fit` kann nicht auf die breiteste
  *umgebrochene* Zeile schrumpfen - bei sieben Zielen stand neben der zweiten Zeile eine halbe
  Kartenbreite leere Fläche. Ohne gemeinsame Fläche ist ein Umbruch eine zweite Reihe statt einer
  Lücke. Die Bedienung ist in beiden Häuten dieselbe; alle elf anderen Aufrufstellen sind einzeilig
  (nachgemessen: 0-2 px Spiel bei 1728 wie bei 1280 px) und bleiben `track`. Messungen in
  [`navigation-and-pages.md`](docs/decisions/navigation-and-pages.md) und
  [`publishing-and-credentials.md`](docs/decisions/publishing-and-credentials.md).
- **Eine Karte hat eine Überschrift, und die hat ein Icon.** `CardHeading` (`ui.tsx`) ist das
  einzige `<h2>` in einer Karte: `text-heading` (15px, der Name, den `tailwind.config.js` genau
  dafür führt), halbfett, davor ein Lucide-Icon in `size={15}` und `text-text-secondary`. Kein
  getöntes Quadrat wie bei `PageHeader` und dem `Section` der Einstellungen — die benennen eine
  *Seite*, und eine Seite trägt sechs Karten. Welches Icon eine Karte bekommt, ist keine freie
  Erfindung: Geht es um dasselbe wie ein Eintrag der Seitenleiste, nimmt sie dessen Icon aus
  `navConfig` (Plugins → `Blocks`, Frames → `LayoutGrid`, Wartung → `Wrench`). Vorher waren es 30
  handgeschriebene Karten-Überschriften in drei Größen — 14px, 15px und 16px, letzteres aus einem
  nackten `font-medium` auf einem `<h2>`, das Tailwinds Preflight auf Grundschriftgröße lässt —,
  zwei Gewichten und mit Icon an dreien davon. Messungen in
  [`navigation-and-pages.md`](docs/decisions/navigation-and-pages.md).
- **Farben heißen nach Rolle, nicht nach Palette.** Zehn Tokens in `src/index.css` (`--ground`,
  `--surface`, `--text`, `--text-secondary`, `--text-muted`, `--ink`, `--accent`, `--accent-hover`,
  `--accent-fg`, `--accent-text`), in `tailwind.config.js` als `bg-ground`, `bg-surface`, `text-text`,
  `text-text-secondary`, `text-text-muted`, `border-ink/10`, `bg-accent`, `text-accent-text`. Der
  Muted-Token ist `text-text-muted`; Labels und Micro-Labels in Großbuchstaben `text-text-secondary`.
  `--ink` trägt nur Kanäle (Schwarz hell, Weiß dunkel), das Alpha steht am Ort und darf pro Schema
  verschieden sein (`border-ink/[0.06] dark:border-ink/10`). Statusfarben (Danger-Rot, Badge-Töne,
  InfoNote-Blau) bleiben Palette; eine immer dunkle Fläche bekommt weder `dark:` noch Token.
  Umgestellt sind `ui.tsx`, `body` und die vier U4-Seiten; alles andere beiläufig beim Anfassen,
  kein sed. `theme.ts` hält den Grund als zweite Kopie - Electron malt ihn, bevor der Renderer
  existiert; beide Seiten verweisen aufeinander.
- **Was ohne Zutun erscheint, wird angesagt.** Eine Meldung, die nach einer Aktion von selbst
  auftaucht, gehört in eine Live-Region: der `status`-Platz des `PageHeader` (`role="status"`), eine
  Konsole in `role="log"`. Die Region muss *vor* ihrem Text im Dokument stehen - sie wird also leer
  gerendert, nicht mit dem Inhalt zusammen; im `PageHeader` heißt `status={null}` „leer, aber
  da“ und eine fehlende Eigenschaft „diese Seite sagt nichts“. Knöpfe und Badges bleiben draußen: die
  ändern sich, weil jemand tippt. Eine `<h1>` pro Seite, jede `<nav>` mit Namen. Messungen in
  [`navigation-and-pages.md`](docs/decisions/navigation-and-pages.md).
- **Was keinen festen Platz hat, wird über `announce()` gesagt.** Eine Meldung, die zu *einer Zeile*
  einer Liste gehört, oder der Verlauf eines Drags, hat keinen Ort für eine eigene Region - beides
  geht in die eine Region der Seite (`state/announcer.tsx`, gemountet in `App.tsx`). Ganze Sätze mit
  Subjekt, nicht „Gespeichert“. Drag-Ansagen kommen aus `utils/dndAnnouncements.ts`, damit die
  beiden Listen dieselben Sätze in derselben Sprache sagen; die Aufrufstelle liefert nur, wie aus
  einer Drag-ID ein Name wird.
- **Schriftgrößen heißen nach Rolle, so wie die Farben.** `text-micro` (11px: Labels, Hinweise,
  Badges), `text-ui` (13px: Text in einem Bedienelement oder einer Zeile), `text-heading` (15px: die
  Überschrift einer Karte), definiert in `tailwind.config.js`. Seit dem 2026-09-06 gibt es keine
  `text-[11px]`, `text-[13px]` und `text-[15px]` mehr; die Ausreißer (10/11,5/12/12,5/14/17/19px,
  17 Stück) behalten ihre Zahl, bis einer einen Namen verdient. Die Tokens setzen **nur** die
  Schriftgröße, genau wie die arbitrary values, die sie ersetzt haben - deshalb war die Umstellung
  an 129 Stellen ohne jede Layoutfolge, gemessen mit `scripts/styles-snapshot.mjs`.
- **Ein deaktiviertes Control muss noch lesbar sein.** Explizite disabled-Farben, keine Opazität:
  Text wird `text-text-muted`, ein Feld sinkt auf `bg-ground`, ein Icon-Button geht von
  `text-text-secondary` auf `text-text-muted`. Gedimmt werden darf nur, was keine eigene Information
  trägt (der Toggle-Knopf, die native Checkbox). Ein Feld, dessen Wert gerade nicht gilt, ist nicht
  deaktiviert: `Field muted` setzt nur das Label auf Muted, Control und Hinweis bleiben.
- **`darkMode: 'media'`, und das ist der App-Schalter.** `nativeTheme.themeSource` flippt
  `prefers-color-scheme` im Renderer mit; `color-scheme: light dark` auf `:root`, explizite Farben
  auf `select option` für Linux. Neue UI mit `dark:`-Varianten. Kein Wechsel auf `'class'`: die
  nativen Dialoge, das Linux-`<select>`-Popup und die Scrollbar hängen an der Media-Query.
- **Ein Bereich eines Frames ist Geometrie, eine Belegung ist die Herkunft seines Inhalts.** Die
  beiden sehen wie dasselbe aus, solange ein Frame höchstens sieben Bereiche hat — mehr Quellen
  gibt Quartz nicht her, `buildLayoutForEntries` hält seine sechs Positionen als Literal. Zwei
  Bereiche auf derselben Belegung rendern dieselbe Liste zweimal (gemessen: drei auf `left`, also
  die ganze Seitenleiste dreimal auf jeder Seite), deshalb ist `slot` optional — ein Bereich ohne
  Belegung ist eine leere Zelle — und eine Doppelbelegung wird im Editor gesagt. Darüber hinaus
  geht es über Quartz' zweiten Schlüssel: `layout.group` faltet die gruppierten Einträge einer
  Position zu einer Flex zusammen, und **die k-te Flex einer Position ist die k-te Gruppe**. Das k
  steht im generierten Frame, weil es aus der flachen Positionsliste nicht ablesbar ist — und zwar
  nicht einmal, sondern einmal je Seitentyp: **Quartz baut je Seitentyp ein eigenes Layout**
  (`exclude` und geleerte Positionen wirken vor `resolveGroups`), sagt dem Frame aber nie, welchen
  es gerade rendert. Das Frame bekommt deshalb alle Ordnungen, die die Config hergibt **und dieses
  Frame erreichen können** — ein Seitentyp, dessen `template` ein anderes Frame nennt, ist keine
  Kandidatin — und wählt beim Rendern die, deren Gruppenzahlen passen: erst über alle sechs
  Positionen genau, dann, falls dort keine passt, noch einmal über alle sechs, die geteilten aber
  weiter genau und die übrigen nur noch als Obergrenze. **Eine Position außerhalb spricht nur in
  eine Richtung:** Rendert die Seite dort *weniger* Flexes als beschrieben, hat das die gewöhnliche
  Erklärung (eine Gruppe, deren Mitglieder alle abgeschaltet sind); rendert sie *mehr*, gibt es
  keine, und die Kandidatin widerspricht sich selbst. Sie ganz wegzulassen warf genau das Zeugnis
  weg, das eine falsche Kandidatin ausgeschlossen hatte — gemessen: 203 von 211 Editorial-Seiten
  zeigten die Komponente der einen Gruppe im Bereich der anderen, unter einer Warnung, die die
  Teilung für normal erklärte. Passen zwei verschieden geordnete gleich gut, wird nicht geraten,
  sondern gesagt. Die Frames halten damit eine Kopie aus der Config, und **der Wächter über eine
  solche Kopie steht an der Tür, an der sie gelesen wird, nicht an denen, an denen das Original
  sich ändert**: `buildService` ruft `writeAllFrames()` vor jedem `quartz build` und jedem
  `--serve`-Start. Zur Config führen acht Türen (Speichern, vier Plugin-Operationen über die CLI,
  Plugin-Update, `quartz sync --pull`, Vorlagen-Import, Restore je Datei) — eine Liste, an die die
  nächste nicht angebaut wird; die eine Bau-Tür deckt sie alle. Stimmen die Zahlen beim Bauen
  nicht, wird nichts geraten: alles in den einfachen Bereich, Warnung ins Log. Messungen in
  [`layout-frames.md`](docs/decisions/layout-frames.md).
- **Erzeugtes CSS gehört in die Kaskadenschicht dessen, was es nachspricht.** Quartz rendert
  `frame.css` als *ungeschichtetes* `<style>` am Anfang des `<body>`; sein eigenes und das
  Plugin-CSS liegen in `@layer quartz-base`, das `custom.scss` des Projekts dahinter ungeschichtet.
  Ungeschichtet schlägt geschichtet unabhängig von der Spezifität — die zwei Kompat-Blöcke in
  `shared/gridFrameCss.ts` überholten damit nicht nur die Plugins, die sie zitieren, sondern jede
  Regel, die eine Vorlage über `.explorer` schreiben kann, und zwar an jeder Breite, weil die
  Desktop-Hälfte unbedingt gilt. Gemessen in Firefox und WebKit: die Schublade der Vorlage war
  wieder die des Plugins (`absolute` statt `fixed`, 100 vw statt 340 px, deckend, `overflow: hidden`
  und damit unscrollbar), der gefaltete Explorer wieder der 19-px-Stummel. Sie stehen deshalb in
  `@layer quartz-base` — dort schlägt der `[data-frame]`-Scope weiter das Plugin, und das Projekt
  schlägt weiter uns. Die Grid-Regeln des Frames bleiben ungeschichtet: das ist die Antwort der App
  auf eine Frage, die sonst niemand beantwortet. Wer fremdes CSS abschreibt, schreibt beide Hälften
  ab — und prüft die Behauptung „vollständig“ Regel für Regel gegen die Quelle, nicht gegen die
  Erinnerung an sie. Was dabei absichtlich fehlt, steht mit Grund in der Liste daneben; eine
  Auslassung ohne Satz schickt den nächsten Leser wieder in die Quelle, auch wenn sie richtig ist
  (dreizehntes Review: die `.sidebar`-Regeln aus `base.scss` und explorer, die ein eigenes Frame nie
  trifft, weil es seine Bereiche als `.qgframe-area-*` rendert).
- **Kein natives HTML5-Drag mehr, nirgends.** Alle vier Stellen ziehen mit `@dnd-kit`
  (`Plugins/Installed`, `LayoutEditor/GlobalBoard`, `LayoutEditor/FrameBuilder`; `Styles/CustomCss`
  hatte nie eines, nur Pfeile). Eine neue Stelle nimmt `@dnd-kit` mit `KeyboardSensor`, denn natives
  Drag kann weder Tastatur noch Ansagen. Was dabei gilt: der gezogene *Knoten* ist das ganze
  Element, der Griff nur `setActivatorNodeRef` (sonst vermisst die Kollisionsrechnung den Griff);
  eine Liste nimmt `useSortable` mit `sortableKeyboardCoordinates`, ein Raster `useDroppable` mit
  `nearestDroppableCoordinates` aus `utils/dndKeyboard.ts` - ohne einen der beiden schiebt ein
  Pfeildruck um 25px und damit um nichts; `PointerSensor` mit `distance: 4`, wo derselbe Griff auch
  klickbar ist. Sortierbare Zeilen tragen zusätzlich „nach oben / nach unten“: die Tastatur-Aufnahme
  ist eine Geste, die man kennen muss. **Und über einem Drag steht nie ein `stopPropagation()`:**
  Der `KeyboardSensor` hört, sobald ein Drag läuft, auf dem *Dokument*, und React ruft für ein
  `stopPropagation()` im Renderer auch das native an der Wurzel — ein Guard, der ein Zeichen vom
  Elternknoten fernhalten soll, nimmt damit dem laufenden Drag Pfeile und Escape ab. Wer zu viel
  hört, verengt am Hörer (`e.target === e.currentTarget`), nicht an dem, was aufsteigt. Messungen in
  [`plugins-and-config.md`](docs/decisions/plugins-and-config.md) und
  [`layout-frames.md`](docs/decisions/layout-frames.md).
- **Ein Wort, ein Name — und zwar über App und Handbuch hinweg.** Vokabular ist eine Tabelle
  (`positions`), nicht pro Seite. Am 2026-09-07 fielen dabei vier Begriffe auf, die je zwei Dinge
  meinten: „Baustein“ (Komponente auf der Seite / Teil eines Vorlagenpakets), „Vorlage“
  (Quartz-Startvorlage / `.qtpl`), „Frame/Template“ und „Ausgabeverzeichnis“ neben
  „Ausgabeordner“. Der Tell war jedes Mal derselbe: Das Handbuch musste eine Warnung schreiben
  („nicht zu verwechseln mit…“). Eine solche Warnung ist der Hinweis auf den Fehler, nicht seine
  Lösung. Deutsch „…“,
  Englisch “…”, Gedankenstrich als Em-Dash. Jeder Nutzertext steht in `de.ts`/`en.ts`
  (Schlüssel-Parität) oder `electron/main/i18n.ts`; zod- und `console.error`-Texte
  bleiben Englisch, weil sie Bugs beschreiben, nicht Eingaben.
- **Ein Fachbegriff bekommt eine Zeile darunter** (`Field`/`Toggle` `hint`); ein Begriff, auf dem
  eine Seite ruht, eine `InfoNote` oben, gedeckelt auf 95ch.
- **Ein Hinweis sagt, was passiert — nicht, warum es technisch so ist.** Höchstens zwei Sätze; die
  Mechanik gehört ins Handbuch. **Das Kapitel nennt aber nicht der Hinweis, sondern die Seite:**
  `PageHeader` nimmt einen `handbook`-Knoten, und die Seiten reichen `<HandbookLink page="…" />`
  herein (bei Unterreitern das Kapitel des offenen Reiters, Tabelle `HANDBOOK` je Seite). Dreizehn
  Hinweise, die je ein Kapitel nennen, wären dreizehn Stellen, die beim nächsten Umbau des
  Handbuchs veralten — und gesucht wird die Erklärung ohnehin zu einem Bildschirm, nicht zu einem
  Feld. Am 2026-09-07 an der laufenden App nachgemessen: 20 Bildschirme mit Verweis, jeder auf eine
  Seite, die es gibt, keiner mit Rückfall auf die Startseite; ohne Verweis bleibt die Startseite,
  die den Link schon in ihrer Quartz-Karte trägt. Ein Begriff aus der Maschinenwelt
  steht nur da, wo der Nutzer ihn zum Entscheiden braucht: „Host-Key“ auf der Veröffentlichen-Seite
  ja, „ungelayert“ im Variablen-Tab nein. Ein Bestätigungsdialog hat drei Teile — die Frage, ein
  Satz Folgen, ein Satz Rückweg. Ausgenommen sind die Sätze, die eine Verwechslung verhindern, die
  Daten kostet (Snapshot ≠ Git-Sync, verknüpfter Vault wird nicht gesichert, ein Duplikat erbt keine
  Ziele); die bleiben lang. Gemessen am 2026-09-07: 1475 Nutzersätze, 192 über 120 Zeichen — und die
  Länge war nicht das Problem, sondern die 75, die Mechanik erklären statt der Entscheidung.
  Messungen in [`i18n-and-vocabulary.md`](docs/decisions/i18n-and-vocabulary.md), der Ablauf und die
  Gliederung des Benutzerhandbuchs in [`docs/handbuch.md`](docs/handbuch.md). Das Handbuch ist
  zweisprachig, und **es übersetzt auch seine Pfade** — deshalb nennt ein Verweis im Seitenkopf eine
  Kennung aus `src/data/handbookPages.ts` und keinen Pfad; `HandbookLink` löst sie über die
  aufgelöste Sprache auf, der Menüpunkt über `mainLanguage()`.
- **Sidebar nach Tätigkeit, eine Seite ist eine Aufgabe.** Einrichtung, Gestaltung, Veröffentlichung,
  Wartung; ein Screen, der eine Karte wäre, ist ein Sub-Tab. Die Übersicht ist eine Statusseite, die
  nichts kostet: nur lokale Reads beim Mount, genau einer ins Netz, nie awaited.

### Arbeitsweise, die sich bewährt hat

- **„Kann nicht prüfen“ ist nie „alles gut“.** `unavailable`/`'unknown'` sind eigene Antworten
  (Style-Check, Update-Check, Kataloge, Token-Prüfung, Secret-Backend). Das gilt auch für die
  Prüfskripte: Was eines nicht lesen kann, zählt es und sagt die Zahl, statt es zu übergehen — und
  eine Schreibweise, die ein Prüfskript nicht liest, ist eine, hinter der sich ein Fehler versteckt.
  `check:i18n` las nur `t('…')`; `t(bedingung ? 'a' : 'b')` stand an zwölf Stellen mit 21
  Schlüsseln, und ein Fix des zwölften Reviews hatte die Form gerade erst noch einmal geschrieben.
  Und die Zahl zählt, was sie zu zählen behauptet: „1 Aufruf im Hauptprozess“ war die Deklaration
  von `mainT` (vierzehntes Review).
- **Zwei Arten zu scheitern bekommen zwei Antworten.** „Fehlt“ und „ist da, aber kaputt“ in einem
  `catch` zu fangen macht aus dem zweiten Fall ein stilles „alles gut“. Die Liste der Startseite
  fing ein `globby` mit Syntaxfehler wie ein fehlendes und schrieb zwei tote Links, ohne ein Wort
  (vierzehntes Review, an der gebauten und der gepackten App). Getrennt wird am Ort des Scheiterns:
  `resolve()` mit `MODULE_NOT_FOUND` ist „nicht installiert“, ein `import()`, der danach scheitert,
  ist ein Fehler. Und ein Ersatz, der läuft, sagt, *dass* er lief — nicht nur im Kommentar, was er
  nicht kann.
- **Ein Bau, dem etwas fehlt, bricht ab, statt zu warnen.** Eine Warnung im Log eines Laufs, dessen
  Paket schon fertig ist, liest niemand: `beforePack` packte zweimal still ohne Handbuch, erst auf
  der VM, dann nach dem Umzug der Projekte auf dem Mac, der die Beta-Pakete baut. Wer das Fehlende
  wirklich nicht will, sagt es mit einem Flag (`QUARTZCONTROL_WITHOUT_HANDBOOK=1`).
- **Ein Fix auf einem Branch, der nie gemergt wurde, ist keiner.** Der Pfad-Fix für das Handbuch
  existierte seit dem 2026-09-12 (`e6916ae`) — auf `feat/beispielvorlage-und-header`, zusammen mit
  sechs weiteren Commits. Die ersten zwei (`c8c143d`, `39bef46`) standen auf `origin/main`, die
  fünf ab `b39f5d4` in keiner Linie, und keiner der sieben in `fix/review-*`, aus der die Beta
  gebaut wird (nachgezählt im Review 2026-09-19 mit `git branch -a --contains`). Gefunden hat es
  erst ein Review, weil es die App packen musste. Vor einem Release: `git cherry <release-branch>
  <branch>` über alle lokalen und entfernten Branches, und was ein `+` zeigt, wird gemergt oder
  bewusst verworfen (die Schleife dafür steht in `docs/release.md`).
- **Ein Handgriff, der nur in einer Commit-Nachricht steht, wird beim nächsten Mal vergessen.** Die
  veröffentlichte Vorlage nachziehen, den Footer an sechs Stellen gleich halten, Band und
  Download-Kasten der Website umstellen: Das stand bis zum fünfzehnten Review in Commits und im
  Auftrag, also in Dateien, die nach dem Release niemand aufschlägt. Was ein Release außerhalb von
  `npm run dist` braucht, steht in `docs/release.md`, und wo es geht, prüft es ein Skript
  (`template:example -- --check-sync` hält die drei Kopien der Vorlage byte-weise gegeneinander).
- **Was ein Skript leiht, gibt es zurück — an jedem Ausgang.** Ein Wegwerf-Profil macht die
  Projekte darin nicht zu Wegwerf-Projekten: Das Demo-Skript der Screenshots schrieb seine Ziele in
  die `publish-targets.json` eines echten Projekts und überschrieb dort ein gleichnamiges
  (fünfzehntes Review). Gemerkt wird vor dem Schreiben, auch der Zustand „fehlt“; zurückgeschrieben
  über `process.on('exit')` und die zwei Signale, weil ein `finally` die `process.exit()` zwischen
  Leihen und Ende nicht sieht (`lendProjectTargets()` in `scripts/screenshot-demo.mjs`).
- **„Die Datei ist da“ ist nicht „die Datei lässt sich lesen“.** Ein Cache, ein Download, eine
  mitgelieferte Kopie: geprüft wird, ob der Inhalt sich öffnen lässt, nicht ob ein Verzeichniseintrag
  existiert - sonst gewinnt ein Torso gegen eine heile Kopie. Geschrieben wird so etwas über
  Temp-Datei, `fsync` und `rename` (`jsonStore.ts` ist das Muster), und was sich nicht lesen lässt,
  wird weggeräumt statt übersprungen, damit der reparierende Weg nicht blockiert bleibt.
- **Gemessen, nicht angenommen.** Jede Regel hier steht in `docs/decisions/` mit dem Experiment, das
  sie erzwungen hat. Neue Regeln genauso.
- **Wer einen Nutzen misst, misst auch den Preis.** „Die gleichen Höhen machen ruhigere
  Ablageziele" war die Begründung dafür, sie aufzugeben — und niemand hatte nachgesehen, was sie
  wirklich taten: `rectSortingStrategy` skaliert jede Karte in das Rechteck, in das sie rückt, und
  gleiche Höhen waren das Einzige, was den Faktor bei 1 hielt. Gemessen an der gebauten App wurde
  daraus eine 77-px-Karte, die während des Ziehens auf 733 px gestreckt wird.
- **Eine Prüfliste ist eine Spalte, keine Zeile.** Die Kontrastliste prüfte die Ruhefarbe eines
  Links gegen drei Flächen und die Hover-Farbe gegen eine — und meldete danach „kein Paar unter der
  Schwelle“, während der Hover im Callout bei 4,18:1 stand. Wer ein Argument für einen Zustand
  aufschreibt („ein Link sitzt nicht nur auf dem Grund“), trägt es in derselben Bewegung in alle
  Zustände ein, für die es gilt.
- **Drift läuft in beide Richtungen, und ein Werkzeug, das nur eine kennt, sieht sie nicht.**
  `--sync` holt die Stylesheets aus dem Projekt zurück; eine Regel, die im Repo entstand und nie
  vorgeschoben wurde, hätte es gelöscht statt gemeldet — und die Messung daneben war an einer
  Website gemacht, die die Regel nicht hatte. `--check-sync` vergleicht nur und entscheidet nichts;
  es ist der erste Aufruf vor jeder Messung an der gebauten Website.
- **Ein Wert, den ein fremdes Programm vergleicht, wird nach dessen Regel gebildet — und die Regel
  wird gegen das fremde Programm geprüft, nicht gegen unsere Vorstellung von ihm.** Der Ausschluss
  im Reiter „Seitentypen“ schrieb den Anzeigenamen der App, Quartz vergleicht gegen
  `extractPluginName(source)`, und für jede npm-Quelle mit Scope ist das die ganze Quelle — der
  Schalter wirkte nie, und die Kandidatenrechnung daneben baute Ordnungen, die Quartz nie erzeugt.
  Der Name steht jetzt an einer Stelle (`shared/quartzPluginName.ts`), wird auch zum *Lesen*
  benutzt (sonst zeigt der Schalter einen Zustand, den die Seite nicht hat), und
  `npm run check:plugin-names` schneidet Quartz' eigene Funktion aus dessen Quelldatei und
  vergleicht. Genau diese Gegenprobe fand einen Rand, den zweimaliges Lesen nicht gefunden hatte.
  Messungen in [`plugins-and-config.md`](docs/decisions/plugins-and-config.md).
- **Liegt das fremde Programm im Projekt, fragt die App es selbst — mit denselben Eingaben, auch
  den unsichtbaren.** Die Liste der neuen Startseite bildete Quartz' Ignore-Muster zweimal nach;
  die zweite Fassung war gegen Quartz' eigenes `globby` geprüft und lag trotzdem bei 13 von 95
  Antworten daneben (dreizehntes Review): `name/*` für einen Ordner ohne Unterordner, fast-globs
  Regel, nach der nur ein statisches letztes Segment oder `/**` einen Ordner beschneidet, und
  `.gitignore`, von der die Nachbildung nichts wusste. `createIndexPage` lädt `globby` jetzt von
  dort, wo `quartz/util/glob.ts` es lädt, und ruft es wie Quartz — auch mit demselben cwd, `content/`
  und nicht dessen aufgelöstem Ziel, weil `globby` `.gitignore`-Dateien bis zur Wurzel des
  git-Repos liest. Wo das Programm fehlen kann, sagt der Ersatz, was er nicht kann. Messungen in
  [`navigation-and-pages.md`](docs/decisions/navigation-and-pages.md).
- **Ein Prüfskript, das Logik der App braucht, lädt sie, statt sie abzuschreiben.** Die Logik steht
  als reine Funktion in `shared/` (das Dateisystem als Parameter, weil `shared/` auch für den
  Renderer kompiliert wird), und das Skript kopiert die `.ts` in eine temporäre `.mts` und
  importiert sie — node strippt die Typen, rät aber die Endung nicht. So laden `check:semver`,
  `check:plugin-names` und seit dem zwölften Review `check:runtime` (`shared/macNodeBinary.ts`); die
  Helper-Suche stand vorher gleich und ungeprüft zweimal da. Eine Kopie, die heute stimmt, ist
  genau die, die niemand mehr vergleicht.
- **Eine Messung trägt nur so weit wie ihr Instrument.** Ein `grep` über `.quartz-gui/` fand den
  Projektpfad im Snapshot-Store nicht und hat daraus „nichts sonst hält seinen eigenen Pfad“ gemacht
  — der Store ist eine git-Objektdatenbank, und in einem zlib-komprimierten Objekt liest `grep`
  nichts (`git grep` je Ref schon: 8 von 8 Aufnahmen). Genauso „der Server antwortet unmittelbar
  nach dem Beenden noch“, was er tut, bis er das nächste Mal schreibt. Und genauso „der Watcher des
  Dev-Servers sieht `.quartz-gui/` nie“: `quartz build --serve` hat **zwei** Watcher, und gemessen
  war der, der auf eine Config-Änderung gar nicht reagiert. Das Ergebnis stimmte trotzdem — aber
  ein Ergebnis mit einer Begründung, die es nicht trägt, ist ein Befund in Wartestellung. Wer eine
  Behauptung in eine Commit-Nachricht schreibt, schreibt dazu, womit sie gemessen wurde, damit der
  nächste Leser die Reichweite prüfen kann statt die Aussage.
- **Eine Kopie erbt keinen Pfad, aber ein Snapshot bringt einen zurück.** `repointProjectPaths()`
  repariert beim Umbenennen und Duplizieren gegen ein bekanntes Vorher; `repointAuthoredFrames()`
  repariert nach jedem Restore, der Config oder Lockfile berührt, und braucht dafür kein Vorher: Ein
  Frame liegt unter `<projekt>/.quartz-gui/authored-frames/<id>`, also ist die ID die Identität und
  das Präfix davor Rauschen. Umgeschrieben wird nur, was hier auch existiert.
- **Ein Symlink-Schutz prüft jedes Segment, nicht das oberste Verzeichnis** — und fragt mit
  `lstat`, nicht mit `existsSync`. Letzteres folgt dem Link, also meldet ein hängender Link „ist
  nicht da“ statt „ist ein Link“, und die Sperre geht auf. Ein Link *innerhalb* des geschützten
  Ordners führt genauso hinaus wie der Ordner selbst (`writableTarget` in
  `templatePackage/shared.ts`).
- **Eine Kopie erbt keinen Pfad, der in das Original zeigt.** Config, Lockfile und Symlinks werden
  nach dem Kopieren umgeschrieben, alles Instanzgebundene (Ausgabeverzeichnis, Deploy-Manifeste,
  Worktrees, Snapshots, Ziele) bleibt zurück — `duplicateService.ts` führt beide Listen mit
  Begründung.
- **Eine PID trägt nicht über die Zeit.** Wer eine Prozessnummer aus einer Liste, einer Datei oder
  einem früheren Scan bekommt, prüft direkt vor dem Signal noch einmal, dass sie dasselbe Programm
  meint — das Betriebssystem vergibt Nummern wieder, und dazwischen liegt bei einer Liste in der
  Oberfläche jede Menge Zeit. `detectOrphanedServers()` tut das seit dem ersten Tag,
  `serverDiscovery.killServer()` genauso; beide fragen dieselbe Nadel gegen eine frisch gelesene
  Kommandozeile. Was die App selbst gestartet hat, wird nicht signalisiert, sondern über
  `stopServer()` beendet, sonst zeigt die Seite „Läuft" für einen Prozess, den es nicht mehr gibt.
  **Dasselbe gilt für einen Map-Eintrag unter einer Projekt-ID**: Zwei Starts können sich
  überlappen, und der `exit`-Handler des Verlierers löschte den Eintrag des Gewinners samt seinem
  Satz in `running-servers.json` — geräumt wird nur, wenn `runningServers.get(id)?.process` noch
  dieses Kind ist (`forgetServer()`). Messungen in
  [`navigation-and-pages.md`](docs/decisions/navigation-and-pages.md).
- **Ein Lesepfad legt nie `.quartz-gui/` an.** `quartzGuiPath()` zum Lesen, `quartzGuiDir()` zum
  Schreiben.
- **`.quartz-gui/` und `Quartz-GUI:managed:` sind Namen auf fremder Platte und bleiben, wie sie
  sind.** Beide tragen den alten Arbeitstitel des Projekts, und beide stehen nicht in diesem Repo,
  sondern in den Projekten der Nutzer: das Verzeichnis mit Snapshots, Deploy-Manifesten,
  authored-frames, Logs und Locale-Baselines, die Marker in deren `custom.scss`. Am 2026-09-09
  nachgezählt: 121 der 161 Vorkommen des alten Namens im Baum sind das Verzeichnis, und allein auf
  dieser Maschine hängen fünf echte Projekte daran. Umbenennen hieße, jeden bestehenden Zustand zu
  verwaisen; es lesbar zu halten hieße, beide Namen zu lesen — dauerhaft, für einen Namen, den
  niemand sieht. Dieselbe Regel wie beim `.qtpl`-Marker: **ein Bezeichner, den ein anderer Rechner
  schon geschrieben hat, ist ein Format und keine Schreibweise.** Wer den einen ändert, ändert auch
  `scripts/build-example-template.mjs` (dieselben Marker) und `scripts/example-template/`
  (`Quartz-GUI:syntax:`) — und braucht eine Migration.
  Der Rest ist am 2026-09-09 nachgezogen: `name` in `package.json` (`quartz-gui` →
  `quartzcontrol`, also auch deb-Paket und Linux-Binärdatei), die Repo-URLs, eine DOM-Id. Die
  Review- und Entscheidungsdokumente behalten den alten Namen, wo sie eine Messung protokollieren —
  sie festzuhalten ist ihr Zweck.
- **JSON-Stores nur über `jsonStore.ts`**: atomar schreiben, Unlesbares beiseitelegen statt
  überschreiben.
- **Was nur ein Kindprozess beantworten kann, wird auch dort gemessen.** Die eingebettete Laufzeit,
  Lifecycle-Skripte, das gepackte Bundle: `npm run check:runtime` und eine Messung an der
  *gepackten* App, nicht am Build. Vier der fünf Befunde aus Phase 7a wären in Entwicklung
  unsichtbar geblieben.
- **Vor jedem UI-Urteil die App wirklich starten** (`run-desktop`-Skill, `npm run smoke`), und unter
  Playwright zuerst `colorscheme none`. Was Playwright nicht erreicht - den nativen Dialog, den
  echten Return-Tastendruck - im Main-Prozess spiegeln (`app.evaluate`) und das als „nicht am OS
  gemessen“ kennzeichnen.

## Wo die Messungen stehen

Alles, was früher hier stand, liegt wortgleich unter `docs/decisions/`:

- [`process-model-and-ipc.md`](docs/decisions/process-model-and-ipc.md) - Drei-Prozess-Split, zod-Grenze, `will-navigate`/CSP, `jsonStore`, Deadlines, `argv`-Grenze, koaleszierte Kataloge, streamendes Manifest, `runCommand`, Orphan-Erkennung
- [`navigation-and-pages.md`](docs/decisions/navigation-and-pages.md) - Sidebar-Gruppen, Übersicht, Log-Store, Vorschau & Build, Build-Ausgabeverzeichnis und -Guard, Unsaved-Guard, Sticky-State, Seitenbreite, Startseite und Einstellungen, `Field` als `<label>`
- [`styles-and-fonts.md`](docs/decisions/styles-and-fonts.md) - Stile-Seite, Variablen-Graph, Community-Themes, Style Settings, Import-Reihenfolge, Webfonts, SCSS-Check, CSS-Fixes
- [`layout-frames.md`](docs/decisions/layout-frames.md) - Frame-Box pro Breakpoint, die drei Breiten-Kappungen, projekteigene Breakpoints, Dev-Server-Neustart
- [`plugins-and-config.md`](docs/decisions/plugins-and-config.md) - Options-Schema aus `.d.ts`, Frames in der Plugin-Liste, Drag bei Filter, Marktplatz, die zwei Config-Schreibwege, Projektbild als Favicon-Quelle
- [`templates-and-localization.md`](docs/decisions/templates-and-localization.md) - `.qtpl`-Paket, die zwölf Teile, Dry-Run-Import, `merge=ours`, Übersetzungs-Baseline
- [`electron-runtime-and-packaging.md`](docs/decisions/electron-runtime-and-packaging.md) - Native Chrome, Electron 43, Toolchain, `brand-electron`, Packaging (deb/AppImage/VM), PATH im Bundle, `safeStorage` auf Linux, Menü, App-Identität, Icon
- [`i18n-and-vocabulary.md`](docs/decisions/i18n-and-vocabulary.md) - Sprachdateien, Klassenkomponente und Singleton, `mainT()`, Vokabular-Tabelle, Fachbegriffe
- [`dark-mode-and-contrast.md`](docs/decisions/dark-mode-and-contrast.md) - `nativeTheme`, `color-scheme`, Scrollbar, Playwright-Emulation, Muted-Token, disabled-Buttons, Avatar-Farben
- [`publishing-and-credentials.md`](docs/decisions/publishing-and-credentials.md) - Handshake-Budget, Host-Keys, Excludes, Zugänge vs. Ziele, Manifeste, Ordner-Ziel, `quartz sync`, GitHub-API, `GIT_ASKPASS`, Branch-Adapter, rsync, Webhook, Schlüsseldateien, verschlüsselte Zugangsdaten
- [`snapshots-and-updates.md`](docs/decisions/snapshots-and-updates.md) - Snapshot-Store als eigenes Git-Repo, Thinning, Restore, Warteschlange, Migration, Update-Check, geparkter Content-Symlink
- [`quartz-cli.md`](docs/decisions/quartz-cli.md) - Was die Quartz-5-CLI wirklich tut (unveröffentlicht, Flags, Exit-Codes, Config-Form)

## Befunde aus den Reviews (Stand 2026-09-21)

Alle siebzehn Listen sind abgearbeitet. [`docs/REVIEW-2026-09-02.md`](docs/REVIEW-2026-09-02.md),
[`docs/REVIEW-2026-09-05.md`](docs/REVIEW-2026-09-05.md) mit seinen 15 Befunden,
[`docs/REVIEW-2026-09-06.md`](docs/REVIEW-2026-09-06.md) mit seinen sechs,
[`docs/REVIEW-2026-09-07.md`](docs/REVIEW-2026-09-07.md) mit seinen acht,
[`docs/REVIEW-2026-09-08.md`](docs/REVIEW-2026-09-08.md) mit seinen acht,
[`docs/REVIEW-2026-09-09.md`](docs/REVIEW-2026-09-09.md) mit seinen acht,
[`docs/REVIEW-2026-09-10.md`](docs/REVIEW-2026-09-10.md) mit seinen acht und
[`docs/REVIEW-2026-09-11.md`](docs/REVIEW-2026-09-11.md) mit seinen acht und
[`docs/REVIEW-2026-09-12.md`](docs/REVIEW-2026-09-12.md) mit seinen fünf und
[`docs/REVIEW-2026-09-13.md`](docs/REVIEW-2026-09-13.md) mit seinen sieben und
[`docs/REVIEW-2026-09-14.md`](docs/REVIEW-2026-09-14.md) mit seinen zwölf und
[`docs/REVIEW-2026-09-16.md`](docs/REVIEW-2026-09-16.md) mit seinen neun und
[`docs/REVIEW-2026-09-17.md`](docs/REVIEW-2026-09-17.md) mit seinen vier und
[`docs/REVIEW-2026-09-18.md`](docs/REVIEW-2026-09-18.md) mit seinen vier und
[`docs/REVIEW-2026-09-19.md`](docs/REVIEW-2026-09-19.md) mit seinen sieben und
[`docs/REVIEW-2026-09-20.md`](docs/REVIEW-2026-09-20.md) mit seinen neun und
[`docs/REVIEW-2026-09-21.md`](docs/REVIEW-2026-09-21.md) mit seinen acht (Aufträge daneben in
`docs/REVIEW-2026-09-05-auftrag.md`, `-06-` bis `-21-`) stehen als
Dokumente unverändert; die Messungen zu jedem Fix liegen in `docs/decisions/`, und was dauerhaft
gilt, steht oben als Regel. [`docs/REVIEW-2026-09-15.md`](docs/REVIEW-2026-09-15.md) gehört nicht
in diese Zählung: Die „fünfzehnte Runde“ las die Handbücher der zwei Plugins gegen deren Code und
aus diesem Repo nur zwei Commits der Beispielvorlage (`fe2b701`, `9592121`).

**Das siebzehnte Review las die zehn Fixes des sechzehnten** —
`review-2026-09-21..review-2026-09-22` ohne Review-Dokument und Auftrag, 13 Dateien, +520/−101,
davon im App-Code 6 Dateien, +322/−74 — und maß an sieben Wegen, darunter `runCoreUpdate` in zwei
Fassungen als esbuild-Bündel gegen ein lokales Upstream-Repo, git allein in Wegwerf-Klonen und die
gebaute App mit mitgeschriebenen Statusereignissen. Kein Befund der Stufe Hoch, einer Mittel,
sieben Niedrig, alle acht abgearbeitet. Beide Fixes des Vorgängers tragen; der mittlere Befund saß
in dem, was der Auftrag als größtes Risiko genannt hatte — der Stash ist neu, und nichts band ihn
an den Lauf, der ihn geschrieben hat. Was daraus als Regel bleibt, steht oben in den passenden
Abschnitten:

- **Ein Ding, das einem Vorgang gehört, wird nach dem Vorgang benannt, nicht nach dem Werkzeug.**
  „Merge abbrechen“ verglich den Betreff von `refs/stash`; wer einen hängenden Merge einmal von
  Hand auflöst, behält den Stash, kein späterer Lauf sagt es, und beim nächsten Konflikt poppt der
  Knopf ihn auf einen HEAD, gegen den er nie gemacht wurde — `UU` in beiden Paketdateien,
  Konfliktmarker, kein gültiges JSON, unter `success: true`. Die Nachricht trägt jetzt den Commit,
  und `abortCoreMerge` liest `MERGE_HEAD`, bevor `merge --abort` ihn wegwirft.
- **Was ein fremdes Programm getan hat, sagt sein Ergebnis, nicht sein Exit-Code.**
  `git stash push -- <pfade>` legt den Stash an, nimmt beide Dateien und endet trotzdem mit 1, wenn
  der Index vor HEAD steht und der Arbeitsbereich auf HEAD. Der Besitz hängt jetzt am Ref.
- **Wer etwas hält, das er nicht zurückgeben kann, hält es gar nicht erst.** Der Plan liest den
  Arbeitsbereich, der Stash hält auch den Index; wo eine Datei auf drei Ständen zugleich steht,
  fasst die App sie nicht an — dieselbe Regel wie für jede andere Änderung, die der Plan nicht
  nachspielen kann.
- **Eine Wartezeit, die man sehen kann, braucht auch einen Ausgang** — und eine Zeit, die einen
  Prozess beschreibt, entsteht mit ihm. Seit ein Start auf einen Build wartet, dauert `starting`
  einen Build: Die Übersicht bot in dieser Zeit „Starten“ und „Neu starten“ an, beide deaktiviert,
  und `startedAt` stand auf der Klickzeit.
- **Zwei Arten zu scheitern bekommen zwei Antworten** — noch einmal, im Konfliktzweig: Ein Abbruch,
  den git verweigert, kam roh, und der Grund eines gescheiterten Merge-Commits kam gar nicht an.
- **Eine Regel ohne ihr Experiment ist eine Behauptung.** Drei Regeln verwiesen auf Messungen in
  `docs/decisions/`, die dort nicht standen; sie standen in Review-Dokumenten und
  Commit-Nachrichten, also in den Dateien, gegen die die Regel daneben geschrieben wurde.
- **Eine Zahl gehört zu dem, woran sie gemessen wurde** — dreimal: `brew.sh:183` gilt nur für root
  (der Schnellpfad ist das `exit 0` in Zeile 112), „nur in Commit-Nachrichten“ traf drei der vier
  Handgriffe, und das PDF-Skript sagte „57 Seiten“ für ein PDF mit 115. Es zählt jetzt beide.

**Das sechzehnte Review war das zweite Paar Augen nach der zweiten Beta** — es las
`review-2026-09-20..review-2026-09-21` (30 Dateien, +1846/−83) und maß an sieben Wegen, darunter
`runCoreUpdate` als esbuild-Bündel gegen ein lokales Upstream-Repo mit npm-Attrappen und die
gebaute App gegen eine Projektkopie. Kein Befund der Stufe Hoch, zwei Mittel, sieben Niedrig, alle
neun abgearbeitet. Beide mittleren lagen in den zwei Fixes, die der Auftrag als ungemessen benannt
hatte, und beide waren Türen, die ein Fix erst geöffnet hatte: Der wartende Serverstart war für die
Oberfläche unsichtbar, und das Core-Update warf die uncommitteten Paketeinträge weg, bevor es
wußte, ob der Merge durchkommt. Was daraus als Regel bleibt, steht oben in den passenden
Abschnitten:

- **Eine Wartezeit, die niemand sieht, ist eine Einladung zum zweiten Klick** — und ein Map-Eintrag
  unter einer Projekt-ID trägt so wenig über die Zeit wie eine PID. Gemessen: zwei Klicks kamen an
  der Sperre vorbei, beide spawnten, der zweite starb am Port und löschte die Buchführung des
  ersten; danach sagte die Seite „Fehler“ und bot „Starten“, während der erste Server lief.
- **Wer etwas wegnimmt, um Platz zu machen, gibt es zurück, wenn der Platz nicht gebraucht wird** —
  und zwar über git, nicht über den Arbeitsspeicher: ein Stash übersteht den halb fertigen Merge,
  den `merge --abort` und die Sitzung, und `git stash list` zeigt ihn dem, der von Hand aufräumt.
- **Zwei Fragen, zwei Vergleiche.** Der Plan fragt die Merge-Basis, die Türen öffnen sich gegen
  HEAD. Eine uncommittete Entfernung wurde so stumm rückgängig gemacht, und ein Projekt auf dem
  Stand installierte bei jedem Update nach, unter einer Zeile, die etwas behauptete, was nicht
  geschah.
- **Ein Wert, den ein fremdes Programm vergleicht** — noch einmal, diesmal ein Pathspec:
  `git checkout -- a b` ist alles oder nichts, und für ein Projekt mit gitignoriertem Lockfile war
  der Fix des Vorgängers still wirkungslos.
- **Eine Zahl gehört zu dem, woran sie gemessen wurde** — dreimal: 118 PDF-Seiten für eine Fassung,
  die es nicht mehr gibt (es sind 115); ein Commit-Hash, den ein Amend überholt hat; und eine
  `curl`-Kette, die einen Tag später nicht mehr galt, weil Quartz ein `sharp` pinnt, das
  `brew --prefix` fragt statt `brew environment`. Das PDF-Skript sagt seine Zahlen seit diesem
  Durchgang selbst.
- **Ein Handgriff, der nur in einer Commit-Nachricht steht** — noch einmal, und diesmal in der
  Liste, die genau dagegen entstand: `docs/release.md` deckte vier der Handgriffe nicht, die Beta 2
  gebraucht hat.

**Das fünfzehnte Review las die vier Fixes des vierzehnten, den Merge und alles, was danach vor der
zweiten Beta kam** (`review-2026-09-19..fix/review-2026-09-18`, 33 Dateien, +1036/−143) — und war
das erste dieser Serie, das auf der Debian-VM gemessen hat. Kein Befund der Stufe Hoch, einer
Mittel, sechs Niedrig, alle sieben abgearbeitet. Der Abbruch in `beforePack`, den der Auftrag als
erstes Risiko nannte, trägt auf beiden Maschinen: ohne Handbuch-Projekt Exit 1 und kein Paket, mit
`QUARTZCONTROL_HANDBOOK_SITE` 461 Dateien im Paket. Der mittlere Befund lag im kleinsten Commit:
Das Demo-Skript der Screenshots schreibt seine Ziele in ein echtes Projekt, und seit `e06eed5`
überschrieb es dort gleichnamige. Die übrigen: der Ersatz für `globby` normalisierte seine Muster
nicht wie fast-glob (`tpl//`, `tpl/.`, `x/..` — die Richtung des toten Links), ein Kommentar nannte
ein öffentliches Repository privat, der Skill `projekt-dokumentieren` verwies auf eine Datei, die
es nicht gab, und rief `python`, eine Zählung in dieser Datei stimmte nicht, Handbuch 5.3 nannte
die Meldung von `require()` statt der von Quartz 5, und drei Handgriffe vor dem Release standen in
keinem Dokument. Was daraus als Regel bleibt, steht oben unter Arbeitsweise:

- **Was ein Skript leiht, gibt es zurück — an jedem Ausgang.**
- **Ein Handgriff, der nur in einer Commit-Nachricht steht, wird beim nächsten Mal vergessen.**

Dazu, ohne eigene Regel, weil es sie schon gibt: Eine Nachbildung sagt, *woran* ihre Liste der
Abweichungen gemessen ist („außer `{x,y}` und `!!x` fehlt nur ein Link“ galt für 31 Muster, nicht
für jedes), und eine Referenz, die dieselben Aufrufe noch einmal aufschreibt, sagt, dass sie eine
Kopie ist.

**Das vierzehnte Review las die vier Fixes des dreizehnten** (`review-2026-09-18..fix/review-2026-09-17`,
im App-Code 7 Dateien, +175/−48) — und war das erste dieser Serie, das an der *gepackten* App
gemessen hat. Kein Befund der Stufe Hoch, keiner Mittel, drei Niedrig im Diff und einer außerhalb,
alle vier abgearbeitet. Der `import()` von `globby` aus dem Projekt trägt auch aus `app.asar`
heraus; der Hinweis am dunklen Bild trägt in sechs Zuständen; der Checker zählt richtig, bis auf
eine Deklaration. Der wichtigste Befund lag außerhalb: Das Paket, das die Messung packen musste,
kam ohne Handbuch, weil `build-handbook.mjs` das Projekt am Ort vor dem Umzug suchte — und der Fix
dafür lag seit zwei Tagen auf einem Branch, der nie gemergt wurde. Was daraus als Regel bleibt,
steht oben in den passenden Abschnitten:

- **Zwei Arten zu scheitern bekommen zwei Antworten**, und ein Ersatz sagt, dass er lief.
- **Code aus dem `node_modules` eines Projekts im Hauptprozess** ist eine Entscheidung mit Preis
  (`safeStorage`), und der steht jetzt da; eine dritte Stelle begründet sich selbst.
- **Ein Bau, dem etwas fehlt, bricht ab, statt zu warnen.**
- **Ein Fix auf einem Branch, der nie gemergt wurde, ist keiner.**
- **Die Zahl eines Prüfskripts zählt, was sie zu zählen behauptet.**

**Das dreizehnte Review las die neun Fixes des zwölften und die Lücke daneben** — die 16 Commits
zwischen `review-2026-09-14` und `review-2026-09-16`, die bis dahin kein Review dieser Zählung
gelesen hatte (unten). Kein Befund der Stufe Hoch, keiner Mittel, vier Niedrig, alle vier
abgearbeitet. Der Folger-Umbau, der das zwölfte am meisten beschäftigt hatte, trägt: in drei
Szenarien an der gebauten App bewegte kein Server-Satz die Build-Aktivität und umgekehrt, und zum
ersten Mal ist dabei auch die Oberfläche gemessen, nicht nur die Ereignisse. Zwei der vier Befunde
waren Nachschärfungen an Fixes des zwölften (Ignore-Muster, dunkles Bild), einer ein Prüfskript,
das eine Schreibweise nicht las, einer ein Kommentar. Was daraus als Regel bleibt, steht oben in
den passenden Abschnitten:

- **Liegt das fremde Programm im Projekt, fragt die App es selbst** — der dritte Schritt nach
  „nach dessen Regel bilden“ und „gegen das fremde Programm prüfen“. Auch die geprüfte Nachbildung
  lag daneben, weil eine Gegenprobe nur die Muster trifft, die man sich ausdenkt.
- **Mit denselben Eingaben heißt auch: mit denselben unsichtbaren.** Das cwd entscheidet, welche
  `.gitignore` gilt; gemessen zählt das `.gitignore` des Projekts nur, wenn das Projekt ein
  git-Repo ist, und dann für App und Quartz gleich.
- **Was der Build liest, ist die Datei, nicht der Entwurf.**
- **Ein Prüfskript sagt, was es nicht prüfen konnte.** `check:i18n` nennt jetzt 67 Aufrufe im
  Renderer und keinen im Hauptprozess, deren Schlüssel berechnet ist (bis zum Review 2026-09-18
  stand dort einer — die Deklaration von `mainT`); die Gegenprobe mit vier
  gelöschten Schlüsseln, die nur in Ternären standen, sah der alte Checker nicht, der neue alle vier.
- **Eine Liste des absichtlich Weggelassenen gehört zur Behauptung „vollständig“.**

**Das zwölfte Review las die Beta-2-Liste** — fünfzehn Punkte aus den Rückmeldungen der ersten
Beta, vierzehn Branches von `main`, die einander nie gesehen hatten und nur zum Lesen in
`review/beta2` zusammengeführt waren; 42 Dateien, +1420/−178. Kein Befund der Stufe Hoch, einer
Mittel, acht Niedrig, alle neun abgearbeitet. Der mittlere war genau das Zusammenspiel, das der
Auftrag als ungeprüft genannt hatte: Der neue Build-Zustand im Hauptprozess hält eine Aktivität je
Projekt, und der Dev-Server schrieb seinen Neubau ohne Rücksicht hinein — ein einmaliger Build lief
3,3 seiner 6,9 Sekunden ohne Zeile und ohne Sperre, und die Übersicht las in dieser Zeit den halb
geschriebenen Ausgabeordner als „zuletzt gebaut“. Drei der neun hingen an derselben Funktion, ein
vierter am Handler daneben. Was daraus als Regel bleibt — die ersten zwei Punkte als eine Regel
unter Prozessgrenze, der Ref unter Renderer, das Prüfskript unter Arbeitsweise, das „noch einmal“
bei der Regel, die es schon gab:

- **Wer einen Zustand aus fremden Ausgabezeilen liest, weiß, wessen Zeilen er liest** — und liest
  jeden Strom und jeden Weg, auf dem das fremde Programm den Satz schreibt. Drei Befunde waren
  dieselbe Lücke von drei Seiten: die Quelle (Build oder Server), der Strom („Rebuild failed“ auf
  stderr) und der zweite Neubau, den jedes Speichern in der App auslöst und der einen anderen
  Satz sagt.
- **Wer einem laufenden Vorgang beitritt, prüft, ob er dasselbe will.** `IPC.buildRun` gab das
  Ergebnis des laufenden Builds zurück, bevor es den Ordner ansah — „erfolgreich“ für `dist/`,
  das nie entstand. Die Prüfung steht in Handler *und* Dienst, weil zwischen beiden ein
  Lesevorgang und womöglich ein Dialog liegen.
- **Ein Ref, den ein Effekt zurücksetzt, hängt an einem Render, den React auslassen darf** — eine
  Regression aus einem Fix derselben Runde, gemessen mit `document.activeElement` nach jedem Klick.
- **Eine Warnung eines Werkzeugs ist kein Befund über die eigene Konfiguration.** Der Kommentar an
  `hardenedRuntime: false` nahm electron-builders Warnung zu `disable-library-validation` als Beleg,
  dass dyld das Framework ablehnen würde. Die Warnung kommt bei `-` unbedingt, und die Vorlage, die
  hier ohne eigene Datei greift, trägt das Entitlement schon. Die Entscheidung blieb, die
  Begründung ist jetzt die, die trägt — und was nur gelesen ist, steht als gelesen da.
- **Ein Wert, den ein fremdes Programm vergleicht, wird nach dessen Regel gebildet** — noch einmal:
  Die Liste der neuen Startseite prüfte Quartz' `ignorePatterns` gegen den Namen, Quartz prüft sie
  gegen den Pfad, und `private/**` verlinkte einen Ordner, den der Build weglässt. Die Gegenprobe
  lief diesmal gegen Quartz' eigenes `globby` aus dem Projekt — und traf trotzdem nicht `name/*`;
  seit dem dreizehnten Review fragt die App `globby` selbst.
- **Ein Prüfskript lädt die Logik der App, statt sie abzuschreiben** (`shared/macNodeBinary.ts`).
- **Wo eine Seite sofort schreibt und im Entwurf nachzieht, sagt sie den Riss dort, wo er
  besteht.** „Dunkles Bild entfernen“ löscht die Datei sofort, der Kopfbereich hört erst mit dem
  Speichern auf, sie zu nennen; der Hinweis dazu erscheint nur, wenn die *gespeicherte* Config den
  Kopfbereich mit dunklem Bild trägt und das Bild da ist. (Die erste Fassung fragte den Entwurf —
  dreizehntes Review, Befund 2.)

Von den zwei Beobachtungen des Reviews, die nicht aus dieser Runde stammen, ist eine nicht behoben:
Ein YAML-Fehler im Frontmatter *einer* Notiz beendet den Dev-Server — das ist Quartz (`trace()` ruft
auf dem Hauptthread `process.exit(1)`), und die App zeigt danach korrekt „abgestürzt“. Die zweite
ist am 2026-09-16 entschieden und umgesetzt: Ein einmaliger Build und der Dev-Server schrieben
zugleich in dasselbe `public/` (im Mitschnitt 16 Dateien des Neubaus mitten in „Emitting files“ des
Builds). Der Build wird jetzt abgelehnt, der Serverstart wartet — Regel oben unter Prozessgrenze.

**Das elfte Review las die Beispielvorlage und den Kopfleisten-Umbau daneben** — 30 Commits, im
App-Code nur +478/−71, der Rest Vorlage und Text. Kein Befund der Stufe Hoch, drei Mittel, neun
Niedrig, alle zwölf abgearbeitet. Der erste saß in dem Block, den der Auftrag zuerst gelesen haben
wollte: Das erzeugte Frame-CSS ist ungeschichtet, der neue Plugin-Kompatibilitätsblock damit auch —
und ungeschichtet schlägt `@layer quartz-base` unabhängig von der Spezifität. Auf dem Telefon war
die Schublade wieder die des Plugins und nicht mehr scrollbar, auf dem Desktop war der gefaltete
Explorer wieder der 19-px-Stummel, den die Vorlage in ihrem Kommentar als behobenen Fehler führt.
Beides in Firefox und WebKit gemessen, vorher und nachher, an der neu gebauten Website. Was daraus
als Regel bleibt, steht oben in den passenden Abschnitten:

- **Erzeugtes CSS gehört in die Schicht dessen, was es nachspricht** — sonst überholt eine Kopie
  nicht nur ihre Quelle, sondern auch jeden, der die Quelle überschreiben dürfte.
- **Das registrierte Speichern schreibt alles, was `dirty` zählt.** Auf *Eigenes CSS* schrieb es
  nur den aktiven Reiter, meldete `true`, und der Verlassen-Dialog navigierte — „Speichern" gesagt
  und einen Teil verloren. Gemessen an der gebauten App: zwei Entwürfe, ein Klick, beide auf der
  Platte.
- **Eine Prüfliste ist eine Spalte, keine Zeile.** Drei Flächen für die Ruhefarbe, eine für den
  Hover — und das Ergebnis „89 Paare, keines darunter“ als Beleg für eine Palette, deren
  Hover-Farbe auf der Karte bei 3,71:1 stand. Jetzt 93 Paare, `tertiary` hell auf `#196B6B`.
- **Wer einen Nutzen misst, misst auch den Preis** (`rectSortingStrategy` skalierte die Nachbarn,
  seit die Karten verschieden hoch sind; der Drag trägt jetzt `CSS.Translate`).
- **Drift läuft in beide Richtungen** — `--check-sync` sagt es, ohne eine Seite zu bevorzugen.
- **Eine Zahl gehört zu dem, woran sie gemessen wurde.** Die zwei Kästen stehen unter 600 px
  *Textzeile* untereinander, nicht unter 600 px Fenster — das sind rund 1370, also auf beiden
  gängigen Laptop-Breiten. Dazu vier weitere Sätze, die den Code beschrieben, den es nicht gibt:
  4,87 statt 4,90, „das Kapitel wiederholt die Überschrift nie“ (auf 14 von 266 Seiten doch), eine
  geteilte Gitterzeile, die `frames.mjs` ausdrücklich für unmöglich erklärt, und „jede Schreibweise,
  die der Browser malen kann“ für einen Parser, der `oklch()` nicht kennt.

**Das zehnte Review las die fünf Fixes des neunten und die Linux-x86_64-Schicht daneben** — und war
das erste, dessen Befunde fast alle *außerhalb* des laufenden Programms lagen: in der
Verpackungsschicht, in den Skripten und in Sätzen über beide. Kein Befund der Stufe Hoch, einer
Mittel, sechs Niedrig, alle sieben abgearbeitet. Der mittlere saß in der einen Stelle, die der
Commit selbst als „nicht gemessen“ geführt hatte: Der Menüpunkt „Rückmeldung senden“ zeigte auf ein
privates Repository, und GitHub antwortet darauf nicht „kein Zugriff“, sondern 404 — für jeden
Beta-Tester also nichts. Was daraus als Regel bleibt, steht oben in den passenden Abschnitten:

- **Ein Link nach draußen wird an dem gemessen, was am anderen Ende antwortet.** Zum dritten Mal in
  dieser Serie war es eine Übergabe an etwas außerhalb der App, die nicht gemessen wurde (fünftes
  Review: `openPath`; achtes: dieselbe Sorte). Wer eine URL in die App schreibt, ruft sie einmal
  ohne Anmeldung ab.
- **Ein Ausweg, den niemand ausprobiert hat, ist eine Vermutung.** `npm run dist:linux -- --x64`
  stand als Ausweg im Kommentar und baut beide Architekturen; die Regel, die dagegen hilft, stand
  zwanzig Zeilen tiefer in derselben Datei.
- **Ein `rmSync` fragt nicht, wessen Verzeichnis das ist.** Wer ein Zielverzeichnis leert, prüft
  vorher, ob die Quelle darin liegt — und zwar in beide Richtungen, nach `resolve()`/`relative()`.
  Die Reihenfolge „erst prüfen, dann leeren“ hilft nur, wenn sie *das* prüft.
- **Ein Wächter gehört an jede Tür zu demselben Zustand** — noch einmal, und diesmal waren es fünf:
  Die `basic_text`-Korrektur hatte zwei gefunden, die anderen drei (der Vertrag, zwei Sätze im
  Entscheidungsdokument) und das Handbuch in beiden Sprachen sagten weiter das Widerlegte.
- **Der Rat gehört in den Absatz, den der Nutzer wirklich zu sehen bekommt.** Er stand im Zweig
  `available === true`, den diese App nie erreicht, während der Zweig daneben zweimal sagte, dass
  es nicht geht, und nie, was zu tun ist.
- **Zwei Erklärungen für dasselbe Symptom sind eine zu viel.** Das `--no-sandbox` im DMG-Skript gab
  dem Sandkasten die Schuld an einem `ERR_FAILED`, das mit wie ohne Flag auftritt — und ein Flag
  mit einer Begründung, die nicht trägt, ist das, was der nächste Leser kopiert.
- **„Kostet nichts“ ist eine Messung oder es gehört da nicht hin.** Der Wechsel der Bundle-ID kostet
  eine Preferences-Datei, sieben Launch-Services-Einträge und eine TCC-Freigabe, die neu erfragt
  wird — klein, aber nicht nichts; und die Begründung daneben („ein Flatpak wurde nie gebaut“) war
  155 Zeilen weiter in derselben Datei überholt.

**Das neunte Review las die acht Fixes des achten und den Nachtrag daneben.** Kein Befund der Stufe
Hoch, einer Mittel, vier Niedrig, alle fünf abgearbeitet. Der mittlere war wieder eine Regression
aus einem Fix des Vorgängers: Der Tastatur-Guard am Bereichsformular hielt nicht nur die
Tastendrücke auf, die zum Kasten wollten, sondern auch die, die zu `@dnd-kit` wollten — Pfeile und
Escape kamen nicht mehr an, und ein Tastatur-Drag endete beim ersten Tastendruck außerhalb des
Formulars als Ablage auf einer Zelle, die niemand gewählt hatte. Was daraus als Regel bleibt, steht
oben in den passenden Abschnitten:

- **Ein Guard hält die Kette für jeden an, der weiter oben hört — auch für den, den man nicht
  sieht.** Der `KeyboardSensor` hört während eines Drags auf dem Dokument. Wer zu viel hört,
  verengt am Hörer, nicht an dem, was aufsteigt.
- **Ein Hinweis beschreibt die Tür, hinter der die Sache passiert.** „Verschwindet beim nächsten
  Speichern" stand über einem Filter, der in `update` sitzt; ein Klick auf Speichern schrieb die
  Datei neu und ließ den toten Ausschluss darin.
- **Eine Zahl gehört zu dem, woran sie gemessen wurde.** 3110 und 3105 waren beide richtig, für
  `columnLineNames` und für `placements` — und keine der zwei Stellen nannte das Feld, also liest
  der Nächste eine davon als falsch.
- **Wer einen zweiten Fall einführt, liest die Sätze daneben noch einmal.** Der Chip lernte
  „ausgeblendet"; die Überschrift über ihm und der Hinweis unter ihm sprachen weiter so, als läge
  in der Ablage nur Unplatziertes.

**Das achte Review las die acht Fixes des siebten und die zwei kleinen Vorhaben darunter** (PR #27
und #28). Kein Befund der Stufe Hoch, einer Mittel, sieben Niedrig, alle acht abgearbeitet. Der
mittlere war eine Regression aus dem Fix des siebten: Der zweite Durchgang in `pickGroupOrder`
ließ die ungeteilten Positionen ganz weg und warf damit genau das Zeugnis weg, das eine falsche
Kandidatin ausgeschlossen hatte — am echten Build zeigten 203 von 211 Editorial-Seiten die
Komponenten der einen Gruppe im Bereich der anderen, unter einer Warnung, die die Teilung für
normal erklärte. Was daraus als Regel bleibt, steht oben in den passenden Abschnitten:

- **Eine Position, die ein Frame nicht teilt, spricht nur in eine Richtung.** Weniger Flexes als
  beschrieben hat die gewöhnliche Erklärung, mehr hat keine. Wer eine Prüfung lockert, lockert sie
  in der Richtung, in der die Abweichung erklärbar ist — nicht, indem er die Spalte streicht.
- **„Beim nächsten Schreiben“ hat so viele Türen, wie zum Schreiben führen.** Der Filter für die
  toten Ausschlüsse saß in einer von dreien; er sitzt jetzt an der Stelle, an der aus dem Entwurf
  eine Änderung wird.
- **Zwei Dinge, die gleich aussehen, brauchen zwei Antworten** — noch einmal, zweimal: „nie
  ausgeschlossen“ gegen „ausgeschlossen unter einem toten Namen“, und „nicht platziert“ gegen
  „platziert und ausgeblendet“. Im zweiten Fall fehlte dem Formular ausgerechnet der Schalter, der
  den Bereich dorthin gebracht hatte.
- **Ein Guard hat zwei Hälften, Zeiger und Tastatur.** Das Bereichsformular hatte
  `stopPropagation()` nur für den Klick; per Tastatur war es damit unbedienbar.
- **„Am Schema gemessen“ heißt: kaputte Eingaben hindurchschicken, nicht das Schema lesen.** Der
  sechste zod-Code (`invalid_key`) stand die ganze Zeit da, und sein Pfad *ist* der fremde
  Schlüssel — also gekappt, je Segment.
- **Eine Zahl in einem Dokument ist eine Messung oder sie gehört da nicht hin.** „Dieselben zehn
  Felder“ war keine; gezählt sind es sechs.

**Das siebte Review war das erste, das an einem echten `quartz build` gemessen hat** — eine Kopie
des Beispielprojekts, 266 Markdown-Dateien, 201 Editorial-Seiten je Lauf, die gebauten Seiten mit
`hast-util-from-html` ausgezählt. Kein Befund der Stufe Hoch, zwei Mittel, sechs Niedrig, alle acht
abgearbeitet (PR #26). Beide mittleren waren erst an diesem Weg sichtbar: eine Regression aus dem
Fix des sechsten Reviews, die eine ganze Seite ungeteilt rendern ließ, weil die Zahl auf einer
Position nicht stimmte, die das Frame gar nicht teilt — und ein Quartz-Fehler, den die App geerbt
hatte, weil sie seiner Dokumentation folgte. Was daraus als Regel bleibt, steht oben in den
passenden Abschnitten:

- **Ein Wert, den ein fremdes Programm vergleicht, wird nach dessen Regel gebildet** — und die
  Nachbildung wird gegen das fremde Programm geprüft, nicht gegen die eigene Vorstellung von ihm.
  `npm run check:plugin-names` schneidet dafür Quartz' eigene Funktion aus dessen Quelldatei; die
  Gegenprobe fand sofort einen Rand, den zweimaliges Lesen nicht gefunden hatte.
- **Ein Wächter, der eine Kopie prüft, prüft sie so scharf wie nötig und nicht schärfer.** Alle
  sechs Positionen abzugleichen ist der bessere Schlüssel, „alles oder nichts“ war die falsche
  Folgerung daraus.
- **Eine Liste, die zu einem Frame gehört, wird auch je Frame gerechnet.** Eine Kandidatin zu viel
  kann eine Auswahl *ermöglichen*, die es sonst nicht gäbe — die stumme Richtung.
- **Ein Rat, den man nicht befolgen kann, ist der Fehler, nicht die Hilfe.** Zwei Meldungen statt
  einer, und die zweite nennt zwei Auswege, die beide gemessen sind.
- **Eine Warnung ist keine Fehlermeldung**, auch nicht in einer Konsole: `LogLine.stream` hat
  einen dritten Wert für die Sätze, die die App selbst schreibt.
- **Ein zod-Satz beschreibt nicht immer einen Bug.** Wo er eine Eingabe beschreibt und in einem
  Nutzersatz landet, wird er in den Worten der App gesagt.

**Das sechste Review traf die Grundlage des Umbaus, den es las.** Kein Befund der Stufe Hoch, drei
Mittel, fünf Niedrig; alle acht sind abgearbeitet, jeder mit einer Vorher-Messung. Der erste
mittlere lag an einer Stelle, die der Auftrag nicht genannt hatte: Die Gruppenordnung, die ein
Frame eingebacken bekommt, ist keine Eigenschaft der Config, sondern eine des Seitentyps — Regel
oben unter „Ein Bereich eines Frames ist Geometrie“, Messungen in
[`layout-frames.md`](docs/decisions/layout-frames.md). Was daraus sonst als Regel bleibt:

- **Zwei Dinge, die gleich aussehen, brauchen zwei Antworten.** „Keine Gruppen“ und „konnte nicht
  nachsehen“ rendern identisch, also muss der Unterschied dort gesagt werden, wo er bekannt ist —
  und zwar dorthin, wo der Nutzer liest. Ein `console.error` im Hauptprozess ist eine Meldung an
  niemanden.
- **Wer eine Kopplung „trägt mit“ nennt, prüft, wohin die Kopie zeigt.** Das Umbenennen eines
  Bereichs benannte seine Gruppe mit um und zerschnitt damit genau die Bindung, die der Kommentar
  daneben zu erhalten behauptete — stumm, weil die Zahl der Flexes weiter stimmte.
- **Ein Wächter gehört an die Tür, an der der Wert *gelesen* wird, nicht an die Aufrufstellen.**
  Der Vorlagen-Import reichte Frames ungeprüft an `saveFrame` durch, während der IPC-Kanal daneben
  alles prüfte; die Prüfung sitzt jetzt in `saveFrame`, wo eine Definition zu Dateien wird.
- **Eine optionale Einstellung zurückzustellen heißt, auch ihr Fehlen zurückzustellen.** `undefined`
  als „nichts zu tun“ zu lesen war genau falsch herum: Der Vorgabezustand ist der häufigste.
- **Was ein fremdes Programm liest, wird atomar geschrieben.** Gemessen: 18 von 401 Lesevorgängen
  sahen bei `writeFile` einen Torso, 0 von 23771 bei `rename`.
- **Eine Nachbildung sagt, wo sie nicht hinreicht.** „It mirrors X exactly“ war an zwei Rändern
  falsch, und einer davon ist prinzipiell nicht erreichbar.

**Das fünfte Review traf das Herzstück des Diffs, den es las.** Ein Befund der Stufe Mittel und
sieben niedrige; der mittlere war, dass das mitgereiste Handbuch unter `file://` eine Seite ohne
Ausgang ist — von 4876 Links zeigte kein einziger auf eine Datei. Alle acht sind abgearbeitet,
jeder mit einer Vorher-Messung; was daraus als Regel bleibt, steht oben in den passenden
Abschnitten:

- **Eine Messung reicht nur so weit wie die Frage, die sie stellt.** Dass `openPath` mit dem
  richtigen Pfad gerufen wird, war gemessen — abgefangen im Hauptprozess, „statt zweimal einen
  Browser zu öffnen". Genau der Browser war die Messung. Wer eine Übergabe an etwas außerhalb der
  App prüft, prüft, was das andere Ende damit tut, nicht nur, was übergeben wurde.
- **Eine gebaute Website wird als Adresse geöffnet, nicht als Datei** — Regel oben unter
  Prozessgrenze, samt den Zahlen.
- **Ein Aufräumschritt, der nach dem Wurf käme, läuft nie.** `buildHandbook()` wirft, bevor es sein
  Ausgabeverzeichnis leert; also packte der `catch` daneben die Kopie des letzten Laufs mit,
  während sein Log „wird ohne Handbuch gepackt" schrieb. Wer einen Fehlerpfad „weiter" nennt, sagt
  dazu, in welchem Zustand er weitergeht.
- **Ein Dialog beschreibt den Zustand, in dem er erscheint.** „Fehlt in dieser Installation" stand
  an einer Stelle, an der die Datei zwei Zeilen vorher nachgewiesen worden war — und empfahl eine
  Neuinstallation gegen ein Problem, das sie nicht berührt.
- **Eine Warnung „nicht zu verwechseln mit…" ist der Befund, nicht seine Lösung** — auch wenn sie
  in der App steht statt im Handbuch. Wo zwei Dinge sich ein Wort teilen, gibt das kleinere den
  Namen ab: aus der „Quartz-Startvorlage" wurde das „Quartz-Grundgerüst", weil „Vorlage" der
  Vorlagen-Seite gehört.
- **Ein Skript verändert auf dem Rechner des Nutzers nichts, was ihm nicht gehört** — und wenn es
  etwas leihen muss, gibt es es in einem `finally` zurück. Was ein echtes Projekt baut oder
  startet, verlangt ein ausdrückliches Flag; „praktisch immer zusammen mit --demo" ist eine
  Dokumentation, keine Sperre.
- **Ein Wächter gehört an jede Tür zu demselben Zustand.** `mainT()` hatte ihn, `mainLanguage()`
  las denselben Cache ohne ihn.

**Das vierte Review las den Diff, den das dritte hinterlassen hatte** — seine sechs Fixes, von
niemandem sonst gelesen. Ein Befund der Stufe Mittel, sieben niedrige, und der mittlere war eine
Regression aus einem der sechs: Die Obergrenze, die die ZIP-Bombe abfing, fing die leere Datei mit,
weil zlib `maxOutputLength: 0` nicht annimmt. Vier der niedrigen lagen genau dort, wo der Auftrag
seine eigenen Risiken vermutet hatte. Alle acht sind abgearbeitet, jeder mit einer Vorher-Messung;
was daraus als Regel bleibt, steht oben in den passenden Abschnitten:

- **Eine Grenze, die aus den Daten kommt, kann Null sein — und Null ist selten „keine".** `zlib`
  liest `maxOutputLength: 0` als ungültig, nicht als „nichts". Wer eine angemeldete Größe als
  Grenze durchreicht, prüft den Rand, den die Bibliothek anders liest als er gemeint war.
- **Ein Fehler, der weiß warum, muss den Grund tragen.** Ein `catch`, der jede Ursache in dieselbe
  Antwort (`null`, „nicht lesbar") verwandelt, macht auch die sorgfältig übersetzten Sätze
  unsichtbar — `check:i18n` sieht das nicht, es prüft, ob ein Schlüssel existiert, nicht ob sein
  Wert je eine Oberfläche erreicht.
- **Ein Schreibpfad vor einem Spawn braucht einen Fallback**, sonst beantwortet er eine Frage, die
  vorher der Kindprozess beantwortet hat — und zwar schlechter (roher Toast statt Status).
- **Eine Datei, die zu einem Lauf gehört, trägt den Lauf im Namen.** Ein fester Name plus `'w'`
  heißt: Der vorherige Lauf, der noch lebt, schreibt in die abgeschnittene Datei des nächsten.
- **Ein Vorgabewert ist eine Vermutung, kein Fund.** Wer einen fehlenden Wert (hier: den Port) mit
  der Vorgabe füllt und dann *misst*, ob dort etwas antwortet, bestätigt fremde Beobachtungen als
  eigene. Erst der Besitz macht die Vermutung zum Fund.
- **Was zweimal aufgerufen werden kann, wird zweimal aufgerufen.** `stop()`, `close()`, `dispose()`
  bekommen ein Flag; ein `closeSync` auf einen geschlossenen Deskriptor wirft aus einem
  Event-Handler heraus, wo nichts es fängt.

Aus dem dritten Review, dessen drei mittlere Befunde alle Fälle waren, in denen eine Messung aus
einer Commit-Nachricht nicht weit genug reichte:

- **„Weiterlaufen lassen“ hielt den Server bis zu seiner nächsten Log-Zeile.** Gemessen war, dass er
  *unmittelbar* nach dem Beenden noch antwortet; mit der App sterben aber die Leseenden seiner
  Pipes, und der erste Rebuild danach bringt ihn um. Die Ausgabe geht seither in
  `.quartz-gui/logs/dev-server-<pid>.{out,err}.log`, die Main tailt — Regel oben unter
  Prozessgrenze.
- **Der Snapshot-Store hält den Projektpfad in jeder Aufnahme.** Der Kommentar in `projectPaths.ts`
  behauptete das Gegenteil auf Grundlage eines `grep`, und `grep` liest in einer git-Objektdatenbank
  nichts. Nach jedem Restore, der Config oder Lockfile berührt, läuft `repointAuthoredFrames()` —
  Regel oben unter Arbeitsweise.
- **Der Font-Parser entpackte ohne Obergrenze.** 863 Bytes wurden zu 1,1 GiB RSS. Grenzen jetzt in
  `fontFile.ts` *und* in `zipArchive.ts`, das dasselbe Muster länger trug — Regel oben unter
  Prozessgrenze.

Die drei niedrigen: der vierte Fundort der Zahl zehn (die Bausteine sind seit `b9831b9` zwölf, und
im gepflegten Vault stand sie noch sechsmal), ein Dry-Run, der verschwieg, was der Import ablehnen
wird, und eine Nadel, deren eigenes Beispiel sie nicht traf.

**Der Auftrag für das fünfte Review steht** in
[`docs/REVIEW-2026-09-08-auftrag.md`](docs/REVIEW-2026-09-08-auftrag.md). Sein Diff hat zwei
Schichten: die acht Fixes des vierten Reviews, die niemand gelesen hat, und eine
Dokumentations-Sitzung, aus der mehr App-Code entstand, als der Name vermuten lässt — ein neuer
IPC-Kanal, der Renderer-Eingabe zu einem Dateipfad macht, eine Änderung an der Verpackung, fünf
neue Skripte und rund fünfzig geänderte Nutzertexte. 45 Dateien, +2043/−187.

**Der Auftrag für das siebte Review steht** in
[`docs/REVIEW-2026-09-10-auftrag.md`](docs/REVIEW-2026-09-10-auftrag.md). Sein Diff war der
kleinste der Serie — 13 Commits, im App-Code 12 Dateien, +432/−82: die acht Fixes des sechsten
Reviews und ein Nachtrag. Was er als erste Frage stellte, hat der Messweg beantwortet und die
Antwort war „ja, aber“: Die Listen, die ein Frame bekommt, sind die von Quartz — für einen
Seitentyp mit einem Ausschluss auf ein `@quartz-community/*`-Plugin aber nicht.

**Der Auftrag für das sechste Review steht** in
[`docs/REVIEW-2026-09-09-auftrag.md`](docs/REVIEW-2026-09-09-auftrag.md). Sein Diff hat wieder zwei
Schichten, die nichts miteinander zu tun haben: die acht Fixes des fünften Reviews, die niemand
gelesen hat (darunter der Handbuch-Server, +170), und den Frame-Bereichs-Umbau aus PR #24 — ein
Bereich darf ohne Belegung leer bleiben, und über `layout.group` kann er eigene Komponenten halten.
20 Commits, 23 Dateien, +1046/−135. Was der Auftrag als größtes Risiko nennt, ist die Grundlage des
Umbaus selbst: die Zuordnung ruht auf einem Funktionsnamen, den es nur gibt, weil Quartz sich mit
esbuilds `keepNames` baut.

**Der Auftrag für das fünfzehnte Review stand** in
[`docs/REVIEW-2026-09-19-auftrag.md`](docs/REVIEW-2026-09-19-auftrag.md). Er las die vier Fixes
des vierzehnten, den Nachtrag, die neu exportierte Vorlage und den Merge von
`feat/beispielvorlage-und-header`, dazu die drei App-Texte, quartz-navigations in Footer und README
und den Fix am Demo-Skript (`review-2026-09-19..fix/review-2026-09-18`, ohne Review-Dokument und
Auftrag 33 Dateien, +1036/−143). Er ist als letztes Review vor der zweiten Beta gedacht und nennt
als erstes Risiko den Abbruch in `beforePack`, der jede Baumaschine ohne Handbuch-Projekt trifft —
und als zweites sieben Commits, die nie ein Review gesehen haben, darunter ein Python-Skript, das
mit einem Obsidian-Vault spricht.

**Der Auftrag für das vierzehnte Review stand** in
[`docs/REVIEW-2026-09-18-auftrag.md`](docs/REVIEW-2026-09-18-auftrag.md). Er las die vier Fixes
des dreizehnten (`review-2026-09-18..fix/review-2026-09-17`, im App-Code 7 Dateien, +175/−48) und
nennt als größtes Risiko den `import()` von `globby` aus dem Projekt in den Hauptprozess — gemessen
an der gebauten, nicht an der gepackten App.

**Der Auftrag für das dreizehnte Review stand** in
[`docs/REVIEW-2026-09-17-auftrag.md`](docs/REVIEW-2026-09-17-auftrag.md). Er liest zwei Bereiche:
die Fixes des zwölften (`review-2026-09-17..fix/review-2026-09-16`) und die Lücke
`review-2026-09-14..review-2026-09-16` (unten), in der die zwölf Fixes des elften liegen.

**Das siebzehnte Review misst ab `review-2026-09-21`** und liest bis `review-2026-09-22`, das auf
dem Commit „Der Auftrag für das siebzehnte Review“ (`fix/review-2026-09-20`) sitzt — dem Stand, den
es liest. **Hier steht bewusst kein Hash**: Der Hash des Commits, der diesen Satz trägt, kann nicht
in diesem Satz stehen, und der Versuch war Befund 6 des sechzehnten Reviews — die Zahl wurde vor
einem Amend geschrieben und überlebte ihn. Die Hashes der älteren Tags stehen hier, weil sie
nachträglich aufgeschrieben und geprüft sind; `git rev-parse review-2026-09-22^{commit}` beantwortet
die Frage ohnehin genauer als jede Zeile hier. Der Auftrag steht in
[`docs/REVIEW-2026-09-21-auftrag.md`](docs/REVIEW-2026-09-21-auftrag.md). Sein Diff sind die zehn
Fixes des sechzehnten Reviews: ohne Review-Dokument und Auftragsdatei 13 Dateien, +520/−101 (davon
15 Zeilen dieser `CLAUDE.md`-Absatz, den der Auftrags-Commit mitbringt), im App-Code 6 Dateien,
+322/−74. Der Branch ist **nicht gepusht und nicht nach `main` gemergt**; dazu
kommt ein Commit im Handbuch-Vault (`b61a08d`), der nicht in diesem Repo liegt. Als größtes Risiko
nennt der Auftrag den git-Stash, den `runCoreUpdate` jetzt im Repo des Nutzers anlegt — das erste
Mal, dass die App dessen Stash-Bereich anfasst.

**Das sechzehnte Review misst ab `review-2026-09-20`** und liest bis `review-2026-09-21`, das auf
`dc06e2d` („Der Auftrag für das sechzehnte Review“, `main`) sitzt — dem Stand, den es liest; der
Auftrag steht in [`docs/REVIEW-2026-09-20-auftrag.md`](docs/REVIEW-2026-09-20-auftrag.md). Der Tag
`review-2026-09-20` sitzt auf `4e649a8` („Der Auftrag
2026-09-19 kennt die neu veroeffentlichten Websites“, `fix/review-2026-09-18`), dem Stand, den das
fünfzehnte Review gelesen hat. `review-2026-09-19` sitzt auf `59e149b` („Der Auftrag für das Review
2026-09-18“, `fix/review-2026-09-17`), dem Stand, den das vierzehnte Review gelesen hat.
`review-2026-09-18` sitzt auf `cc4bd50` („Der Auftrag für das Review 2026-09-17“,
`fix/review-2026-09-16`), dem Stand, den das dreizehnte Review gelesen hat. `review-2026-09-17` sitzt auf `8136760` („Der Auftrag für das sechzehnte Review“,
`review/beta2`), dem Stand, den das zwölfte Review gelesen hat. Die Regel ist dieselbe wie bei den
zwölf Vorgängern: Der Ausgangsstand ist das, was gelesen wurde, nicht das, was
danach entstanden ist. So sitzt `review-2026-09-14` auf `dcf28cf`, dem Stand des elften Reviews
(„Der Auftrag für das vierzehnte Review“), `review-2026-09-13` auf `9305d7b`, dem Stand des zehnten
Reviews (`main` nach PR #36 mit dem Auftrag), `review-2026-09-12` auf `7568803`, dem Stand des
neunten Reviews (`main` nach PR #29 plus der Nachtrag und der Auftrag aus PR #30),
`review-2026-09-11` auf `59de3a5`, dem Stand des achten
Reviews (`main` nach PR #27 plus die Variablensuche aus PR #28), `review-2026-09-10` auf `b1cf5bd`,
`main` nach PR #25, `review-2026-09-09` auf `c6da3d9` („Der Auftrag für das sechste Review“),
`review-2026-09-08` auf `0c76d6e`, `review-2026-09-07` auf `1994811`, dem letzten Merge vor den
Fixes des vierten Reviews, und `review-2026-09-06` auf `1bd69dc`; Letzterer war einmal 67 Commits
früher auf `0b0fb96` gesetzt und wurde verschoben, weil jener Stand gemessen, aber nicht gelesen
war.

**`review-2026-09-16` ist die Ausnahme von dieser Regel, und sie hat eine Lücke hinterlassen.** Der
Tag sitzt auf `dbcefc1`, dem `main`, von dem die vierzehn Beta-2-Branches abzweigen — nicht auf
einem Stand, den ein Review gelesen hat. Zwischen `review-2026-09-14` und ihm liegen 16 Commits,
die kein Review dieser Zählung gelesen hat: die zwölf Fixes des elften Reviews (`6ea83fc`), die
Arbeit an der Beispielvorlage danach, die zwei Dokumente der fünfzehnten Runde und die
x64-Benennung der macOS-Pakete — im App-Code 5 Dateien, +174/−55 (`shared/gridFrameCss.ts`,
`Styles/CustomCss.tsx`, `Styles/variableGraph.ts`, `Styles/Basics.tsx`, `Plugins/Installed.tsx`),
dazu `electron-builder.yml` und in `scripts/` +1298/−140. Die fünfzehnte Runde hat davon nur
`fe2b701` und `9592121` gelesen. Der Auftrag für das dreizehnte Review nimmt den Bereich deshalb
ausdrücklich mit, und es hat ihn gelesen: die Lücke ist geschlossen, drei seiner vier Befunde
betreffen sie nicht, der vierte ist ein Kommentar in `shared/gridFrameCss.ts`. `review-2026-09-16`
bleibt, wo er ist, weil der Auftrag des zwölften Reviews mit ihm rechnet.

**Die acht Fixes des siebzehnten Reviews liegen bewusst dahinter** (`fix/review-2026-09-20`,
auf `4d2b50d` = `review-2026-09-22`, nicht gepusht und nicht nach `main` gemergt). Sie sind
gemessen, und von niemandem sonst gelesen. Der Messweg für die Update-Befunde ist der des
Vorgängers, um einen vierten Upstream-Stand und ein zweites Bündel erweitert: zwei Fassungen von
`updateService` als esbuild-Bündel gegen ein lokales Repo mit den Ständen A/B/B2/C/D, npm- und
npx-Attrappen, je Szene ein frischer Klon — s2b (der veraltete Stash), s5 (Index ≠ Arbeitsbereich),
s4 und s13 (die zwei stummen Ausgänge), dazu s1, s8, s11 und s14 als Gegenprobe in beiden
Fassungen. `git stash push` allein in vier Ausgangslagen. `startedAt` an einem Bündel von
`buildService` mit einer npx-Attrappe. Die Knöpfe der Übersicht an der gebauten App mit
Wegwerf-Profil gegen eine `cp -Rc`-Kopie von `navigations-testprojekt`, vorher und nachher. Das
PDF an einem echten Lauf gegen `pdfinfo`. Die größten Eingriffe sind die SHA am Stash samt dem
`MERGE_HEAD`-Blick in `abortCoreMerge`, der Index-Wächter `stagedApartFromWorkingTree()`, der
`withBusy`-freie Serverteil der Übersicht und `pdfPageCount()`. Neu sind drei Texte in `i18n.ts`
(`updateStashLeftover`, `updateStashPopFailed`, `updateAbortBlockedByEdit`) und sieben Absätze in
`docs/decisions/`. Nicht gemessen: die gepackte App, ein echtes `npm install`, die VMs. Dazu kommt
ein Commit im Handbuch-Vault (`baeddee`, beide Sprachen), der nicht in diesem Repo liegt. Sie
gehören damit in den Diff des nächsten Auftrags.

**Die sieben Fixes des fünfzehnten Reviews liegen bewusst dahinter** (`fix/review-2026-09-18`,
`12dd7d9..b25f61b`, dazu `311f929` im Handbuch-Vault). Gemessen: das Demo-Skript an einer
`cp -Rc`-Kopie des Handbuch-Projekts über `QUARTZCONTROL_PROJECT_ROOT` mit einem echten Ziel
gleichen Namens — vorher überschrieben, nachher byte-gleich in fünf Fällen, darunter `--only` ohne
Treffer und SIGINT mitten in der Aufnahme; der Ersatz für `globby` wörtlich herausgeschnitten gegen
Quartz' `globby` unter Electrons Node 24.18.1 und Node 26.5.1, 63 Muster, vorher 22 Abweichungen,
nachher 7; `--check-sync` gleich, mit einem angehängten Byte und gegen eine 404-Adresse; die
Skill-Meldungen ohne Obsidian; die Konsolenmeldung an einem Projekt ohne `node_modules` über `npx`.
Nicht neu gemessen: die gepackte App (die zwei App-Änderungen sind eine Zeile im Ersatz und
Kommentare). Die größten Eingriffe sind `lendProjectTargets()`, das über `process.on('exit')` in
ein echtes Projekt zurückschreibt, und `posix.normalize` im Ersatz. Neu ist `docs/release.md`. Sie
gehören damit in den Diff des nächsten Auftrags. Die drei Demo-Ziele früherer Läufe sind aus dem
echten Handbuch-Projekt entfernt (die Datei trug seit ihrem ersten Snapshot am 2026-09-07 nichts
anderes, und keine andere Datei nannte ihre IDs). Nebenbei gefunden und in `77433ac` behoben: Die
Bridge des Skills `projekt-dokumentieren` prüft vor dem ersten CLI-Aufruf, ob die CLI den
konfigurierten Vault trifft — die CLI meldet einen unbekannten mit Exit 0.

**Die vier Fixes des vierzehnten Reviews hat das fünfzehnte gelesen** (`fix/review-2026-09-18`, von
`fix/review-2026-09-17` abgezweigt), und mit ihnen der Merge von `feat/beispielvorlage-und-header`
(`962f079`: README zu Beta 1, Handbuch-Zahlen und tar-Anleitung, der Skill
`projekt-dokumentieren`, zwei gesicherte `.qtpl` und `minimal-lesbar.qtpl` vom 2026-09-10), und
danach die mitgelieferte Vorlage neu exportiert (Phasen 3–11, Gegenprobe grün; neu sind nur die
zwei Schnipsel aus `9592121`).
Gemessen: `beforePack` mit `electron-builder --dir` in drei Läufen (ohne Projekt Exit 1 und kein
Paket, mit Flag ein Paket ohne Handbuch, normal 457 Dateien im `.app`); `check:i18n` mit zwei
angehängten Aufrufen als Gegenprobe; der Ersatz für `globby` herausgeschnitten gegen Quartz'
`globby` mit 31 Mustern (8 Abweichungen bleiben, im Kommentar benannt) und an der gebauten App mit
drei Wegwerf-Projekten — ohne `node_modules`, mit echtem, mit kaputtem `globby`. Nicht neu gemessen
ist die gepackte App. Der vierte ist Dokumentation: die Vertrauensgrenze in
`process-model-and-ipc.md`, zwei Aussagen darin nur gelesen und so gekennzeichnet. Die größten
Eingriffe waren `listSource` im Vertrag von `content.createIndex` und der Abbruch in `beforePack`,
der jede Baumaschine ohne Handbuch-Projekt und ohne `QUARTZCONTROL_HANDBOOK_SITE` betrifft. Das
fünfzehnte Review fand darin keine Regression; Befund 2 schärft den Ersatz nach, Befund 7 und der
Halbsatz im `dist`-Eintrag den Weg für die VMs, Befund 1 den Fix am Demo-Skript aus derselben
Runde.

**Die vier Fixes des dreizehnten Reviews hat das vierzehnte gelesen** (`fix/review-2026-09-17`, von
`fix/review-2026-09-16` abgezweigt) — ohne Regression; Befund 1 schärft Fix 1 nach (der stille
Ersatz), Befund 3 Fix 3 (die Zählung). Gemessen: die Startseiten-Liste an einem esbuild-Bündel von
`contentService` gegen `globby` aus `gui-test/node_modules` (26 Muster, über `globby` 0
Abweichungen, im Ersatz ohne `node_modules` eine, `{x,y}`; `.gitignore` im Vault und im Projekt mit
und ohne git) und an der gebauten App; der Hinweis am dunklen Bild an der gebauten App mit
Wegwerf-Profil in vier Fällen vorher und nachher; `check:i18n` mit einer Gegenprobe aus vier
gelöschten Schlüsseln. Der vierte ist nur Kommentar. Der größte Eingriff ist der dynamische Import
von `globby` aus dem Projekt im Hauptprozess — nach `sass` in `styleService` der zweite Ort, an dem
die App zur Laufzeit Code aus dem `node_modules` eines Nutzerprojekts in sich selbst lädt, und der
erste als ES-Modul.

**Die neun Fixes des zwölften Reviews hat das dreizehnte gelesen** (`fix/review-2026-09-16`, von
`review/beta2` abgezweigt) — ohne Regression; zwei seiner Befunde schärfen Fix 7 und Fix 9 nach.
Sie waren gemessen, fast alle an der gebauten App mit Wegwerf-Profil
gegen eine Kopie von `gui-test` mit Dev-Server auf 8099/3099: die Neubauten mit mitgeschriebenen
Ereignissen im Renderer, „Rebuild failed“ über zwei von Hand an die Server-Logs gehängte Zeilen
(echt ausgelöst wird der Weg nur von einem Emitter, der außerhalb von `trace()` wirft), der
Beitritt mit drei gleichzeitigen `build.run`, der Fokus mit dem Messskript des Reviews, die
Ignore-Muster zusätzlich gegen Quartz' eigenes `globby`, die Bildnormalisierung als reiner Umbau
über SHA-256 der Ergebnisdateien vorher und nachher, die Helper-Suche alt gegen neu an neun Pfaden.
Nur gelesen ist der sechste (electron-builders Quelle, nicht mit eingeschalteter Hardened Runtime
gemessen). Die größten Eingriffe sind `followQuartzOutput(…, source)` samt den zwei Neubauten,
`joinRunningBuild()` und `shared/macNodeBinary.ts`, das `check:runtime` jetzt lädt.

**Die zwölf Fixes des elften Reviews hat das dreizehnte gelesen** — das zwölfte nicht, weil sein
Ausgangsstand hinter ihnen lag (oben). Ohne Befund außer dem Kommentar über die Auslassungen; neu
gemessen hat es davon den Kompat-Block in Firefox und WebKit bei 750, 850 und 950 px ohne das
Explorer-Stylesheet der Vorlage und den Farbparser mit 15 Schreibweisen. Sie waren gemessen, und
zum ersten Mal in dieser Serie an einer *neu gebauten* Website: die Kompat-Blöcke in Firefox und WebKit bei
390, 750, 850, 1300 px, mit und ohne JavaScript, die Schublade unter einem Wheel; die zwei
Speichern-Wege und der Drag an der gebauten App mit Wegwerf-Profil; der Farbparser an einer
Canvas-Probe in diesem Electron; die Palette an `--check-contrast` (93 Paare, 0 darunter). Der
Eingriff mit der größten Reichweite ist der `@layer quartz-base` um die zwei Kompat-Blöcke — er
gibt jedem Projekt seine Stylesheets über den Explorer zurück. Der zweite ist das Speichern auf
*Eigenes CSS*, das jetzt alle Entwürfe schreibt. Neu daneben: `--check-sync`.

**Die sieben Fixes des zehnten Reviews hat das elfte gelesen** — ohne Befund; die zwei Regressionen,
die es fand, stammen aus `8c43dcc`, nicht aus diesen Fixes. Neu gemessen hat es davon nichts: Die
Fixes 2, 3, 6 und 7 sind Kommentare und der Einschluss-Wächter in `takeHandbook()`, dessen zwei
Richtungen es gelesen und für richtig befunden hat (`docs/REVIEW-2026-09-14.md`, „Die erste
Hälfte“). Gemessen waren sie vorher an electron-builders eigener Zielrechnung, an sechs
Wegwerf-Verzeichnissen, an der gebauten App in einem erzwungenen Zustand ohne Schlüsselbund, an
sechs Läufen einer Skriptkopie und an `lsregister` und `~/Library/Preferences` dieses Rechners.

**Die fünf Fixes des neunten Reviews hat das zehnte gelesen** — ohne Regression, zum ersten Mal in
vier Runden. Die dritte Fassung des Tastatur-Guards liegt richtig (`e.target === e.currentTarget`
am Kasten), und das Muster steht an keiner der drei anderen `@dnd-kit`-Stellen. Gemessen waren sie
vorher und nachher an der gebauten App mit echten Tastendrücken, an einem Testprojekt mit einem
toten Ausschluss und an einem esbuild-Bündel des Hauptprozesses.

**Die acht Fixes des achten Reviews hat das neunte gelesen** — mit dem Ergebnis, dass einer davon
eine Regression war (der Tastatur-Guard, oben). Gemessen waren sie am echten Build eines Klons des
Beispielprojekts und an der gebauten App in einem Wegwerf-Profil (darunter ein echter Import eines
von Hand gebauten `.qtpl`). Die größten Eingriffe waren `countsFit` samt der Rückfall-Meldung, die
sagt, was eine Kandidatin ausgeschlossen hat, die Platzierung, die die Ablage jetzt durchreicht,
der Tastatur-Guard am Bereichsformular, der sechste zod-Code samt Kappung je Pfadsegment und der
Filter für tote Ausschlüsse in `update`.

**Die acht Fixes des siebten Reviews liegen bewusst dahinter** (PR #26, 22 Dateien, +1200/−93).
Sie sind gemessen, die meisten am echten Build oder an der gebauten App, und von niemandem sonst
gelesen — die größten Eingriffe sind der zweite Durchgang in `pickGroupOrder`, der Frame-Name als
Pflichtargument der Kandidatenrechnung, `shared/quartzPluginName.ts` samt
`npm run check:plugin-names` und der dritte Wert in `LogLine.stream`. Sie gehören damit in den
Diff des nächsten Auftrags.

Dasselbe galt zwei Runden vorher für die acht Fixes des fünften Reviews — der Handbuch-Server (ein
neuer Dienst im Hauptprozess, ein `will-quit`-Haken, `openExternal` statt `openPath`), die dritte
Antwort `'partial'` im Vertrag der Server-Suche und ein `/proc`-Weg, den diese Maschine nicht
messen kann — und eine Runde davor für die acht des vierten: den Dateinamen des Server-Logs pro
Lauf und die Server-Erkennung, die einen Vorgabeport nur nimmt, wenn der Prozess ihn hält. Die
Kette ist Absicht: Jede Runde liest, was die vorige gebaut hat.

Von dem, was beide Reviews als „beiläufig, kein sed“ führen, sind die Farbpaare am 2026-09-05
abgearbeitet, soweit sie eine Umbenennung waren: 322 Paare, die wörtlich das Token buchstabierten,
plus sechs Stellen ohne `dark:`-Partner (3,50:1 im Dunkeln) und dreizehn Micro-Labels, die in
Großbuchstaben zwei verschiedene Dunkel-Werte für dieselbe Rolle hatten. Gemessen mit
`scripts/styles-snapshot.mjs`: von 13543 Elementen blieben 13152 unverändert, im Hellen kein
einziges anders.

Im zweiten Durchgang am selben Tag die **Hover-Zustände**: 31 Stellen sprachen dieselbe Geste in
fünf verschiedenen Paaren aus, obwohl `hover:text-text` und `hover:bg-ink/…` im Code schon standen —
in `ui.tsx` und, für einen von drei identischen Ziehgriffen, in `Plugins/Installed.tsx`. Jetzt
sagen alle dasselbe. Gemessen mit `--hover`: der Ruhezustand blieb an allen 13543 Elementen
unverändert, im Hover änderten sich 51. Dabei kam ein Fehler heraus, den niemand gesehen hatte:
zwei Ziehgriffe hatten `hover:border-black/20` ohne `dark:`-Partner, ihr Rand wurde im Dunkelmodus
also **schwarz** — auf dunklem Grund unsichtbar. Mit dem Token ist er Weiß.

Im dritten Durchgang die Ränder und Flächen: 164 Klassen schrieben aus, wofür es `--ink` gibt
(`border-black/[0.06] dark:border-white/10`), dazu neun `bg-white`, hinter denen eine `dark:`-Klasse
stand und die damit wörtlich `--surface` sind. Vorher geprüft statt angenommen: **jede** der 75
`…-black/α`-Klassen hatte einen `dark:`-Partner derselben Eigenschaft, die schwarze Hälfte malt also
nur im Hellen und der Tausch kann sie nicht ändern. Gemessen: kein einziges Pixel, in Ruhe wie im
Hover. Danach 19 Stellen, an denen der Wert zwischen zwei Tokens lag und eine Rolle zu wählen war —
Überschrift, Wert und Variablenname auf `--text`, Fließtext der Übersicht auf `--text-secondary`,
zwei zu blasse Stellen ohne `dark:`-Partner auf `--text-muted`. 44 Elemente ändern sich dabei, alle
benannt im Commit.

Was bewusst Palette bleibt: die immer dunklen Konsolenflächen (`bg-slate-950` und der Text darauf —
eine Fläche, die in beiden Schemata dunkel ist, bekommt weder `dark:` noch Token), die Statusfarben,
und sieben strukturelle
Grautöne, für die es keine Rolle gibt: der Fortschrittsbalken, der Rahmen einer Karte, die Fläche
eines Hinweiskastens.

Die **Seitenleiste** ist am 2026-09-06 nachgezogen, und zwar auf `--text`, nicht auf
`--text-secondary`: die Gruppenüberschriften darüber (`EINRICHTUNG`, `GESTALTUNG`, …) sind bereits
secondary, ein Eintrag auf demselben Wert wöge also so viel wie seine eigene Überschrift. Mit
`--text` liest sich die Leiste als das, was sie ist — Überschrift schwächer, Eintrag stärker,
aktiver Eintrag weiß auf Blau. Gemessen auf dem Grund der Leiste: 9,10:1 → 15,69:1 im Hellen und
12,43:1 → 13,99:1 im Dunkeln, 1067 Elemente pro Schema. Die Größen-Tokens sind am 2026-09-06 nachgezogen: 129 Stellen
(83× `text-[11px]`, 46× `text-[13px]`) tragen jetzt `text-micro` bzw. `text-ui`, gemessen ohne jede
Änderung an Schriftgröße, Zeilenhöhe oder Farbe. Offen bleiben die 17 Ausreißer-Größen, die keinen
Namen haben — darunter dreimal 12,5px auf der Übersicht, der einzige Kandidat für einen vierten
Namen. Am 2026-09-06 nachgemessen und *nicht* umgestellt: die Übersicht hat fünf eigene Größen
(19/17/12,5/12/11,5px), das ist eine nach Augenmaß gesetzte Skala für einen Bildschirm und keine
Rolle; und die zwei Faktenzeilen auf `text-ui` zu heben (12,5 → 13px, 30 Elemente) ließ die Karte
„Kein Ziel“ eine Zeile mehr umbrechen — die halbe Pixel war genau dafür gewählt.

**Arbeitsregel** für die nächste Liste: ein Befund pro Durchgang, jeweils mit `npm run typecheck`,
`npm run build`, `npm run smoke` und eigenem Commit; was dabei nebenbei auffällt, wird gesammelt und
genannt, nicht mit erledigt. Was nur ein laufendes Programm beantworten kann, wird an der gebauten
App gemessen — und wo es geht mit einer Vorher-Messung, denn zwei der Befunde traten anders auf als
das Review sie beschrieb (der geteilte Optionen-Zustand erst nach einem Routenwechsel, der hängende
Content-Link mit ENOTDIR statt ENOENT).

Was aus dem 09-05-Durchgang als Regel hängengeblieben ist, steht jeweils oben im passenden Abschnitt:
ein Vorlagen-Paket ist keine Vertrauensgrenze; „die Datei ist da“ ist nicht „die Datei lässt sich
lesen“; eine Kopie erbt keinen Pfad, der in das Original zeigt; ein Symlink-Schutz, der nur das
oberste Verzeichnis prüft, prüft nichts.

Zwei Dinge waren dabei aufgefallen und bewusst nicht mit erledigt worden — **beide sind
inzwischen weg, nachgesehen am 2026-09-06:** `builtinTemplateAvailable()` gibt es in
`builtinTemplateService.ts` nicht mehr (im ganzen Baum kein Treffer außer diesem Absatz), und
`countFiles()` in `contentService.ts` folgt einem Link auf ein Verzeichnis inzwischen per `stat`
und steigt hinein, zählt ihn also nicht mehr als eine Datei. Beide fielen bei den Durchgängen
danach mit, ohne dass es jemand als eigenen Befund notiert hätte; hier steht es, weil ein
Absatz über offene Punkte, der zwei geschlossene führt, beim nächsten Lesen Arbeit erzeugt.

## Claude-Skills in diesem Projekt

Skills werden projektlokal unter `.claude/skills/` bereitgestellt, nie global.
Firecrawl-Skills bei Bedarf aus dem gemeinsamen Store verlinken:

    ln -s ~/.agents/skills/firecrawl-scrape .claude/skills/firecrawl-scrape

Verfügbare Skills im Store: `ls ~/.agents/skills/`
