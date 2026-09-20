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
  `resources/handbook/` (gitignoriert), **nur noch als Quelle für `build:handbook-pdf`**. Seit dem
  2026-09-18 reist das Handbuch nicht mehr in der App mit: Es wird ausschließlich online gepflegt,
  die App öffnet `https://boxi-os.github.io/QuartzControl/` (`HANDBOOK_URL` in
  `electron/main/menu.ts`, Pfade aus `src/data/handbookPages.ts`), und diese Website baut
  `QuartzControl-Web` aus demselben Vault ([`docs/release.md`](docs/release.md), Punkte 3 und 9).
  `beforePack` baut kein Handbuch mehr, `handbookServer.ts` ist entfernt, und die Variablen
  `QUARTZCONTROL_WITHOUT_HANDBOOK` und `QUARTZCONTROL_HANDBOOK_SITE` braucht kein Packen mehr
  (letztere übernimmt für das PDF weiter eine schon gebaute Website). Wo die Projekte dieses
  Rechners liegen, sagt `scripts/project-paths.mjs` — Standard `~/Documents/QuartzProjekte/`,
  überschreibbar mit `QUARTZCONTROL_PROJECT_ROOT`
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
  `package-lock.json` behandelt: vierzehn Fälle gegen `shared/packageJsonDeps.ts` (das Skript lädt die
  Datei, statt sie abzuschreiben), dazu die npm-Aufrufe, die daraus entstehen, und seit dem
  dreißigsten Review fünf Statuslisten — was Updates- und Git-Sync-Seite nach einem gescheiterten
  Lauf als ausstehend nennen, darunter die Szenen R2 und R2N mit den Bereichen, die echtes npm
  schreibt. Braucht weder App
  noch Projekt noch Netz. Existiert, weil ein falscher Plan wie ein gelungenes Update aussieht und
  erst auffällt, wenn ein Paket fehlt, das vorher da war — und weil er schon beim ersten Lauf einen
  Rand zeigte: Ohne Vergleichsstand ist *jeder* Schlüssel eine Abweichung, also Finger weg. Drei der
  vierzehn kamen mit dem siebzehnten Review dazu (nicht: ab Fall Nummer siebzehn — so viele gibt es
  nicht); es sind die, die das Review daneben gestellt hat und deren Antwort vorher
  nirgends stand: ein Paket, das beide Seiten mit *verschiedenem* Bereich hinzugefügt haben (Quartz
  gewinnt), eines, das beide entfernt haben (Finger weg, obwohl nichts zu tun wäre), und Quartz,
  das ein Paket streicht, welches das Projekt umgepinnt hat — dann kommt es zurück, und das ist
  eine Entscheidung, die jetzt als Fall dasteht. Drei weitere kamen mit dem sechzehnten Review dazu;
  es sind die, die vorher niemand gestellt hatte: ein umgepinntes
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
  `docs/decisions/electron-runtime-and-packaging.md`). Das Handbuch reist nicht mehr mit
  (Eintrag `build:handbook`), eine VM braucht dafür also nichts mehr. Was ein Release außerdem braucht — Vorlage in drei Kopien, `latest.json`, Footer an sechs
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

Die Kurzfassung dessen, was gilt und warum — vier Abschnitte (Prozessgrenze, Renderer, Primitives
und Gestaltung, Arbeitsweise). Sie stehen in [`docs/conventions.md`](docs/conventions.md) und
werden von hier eingebunden, sind also Teil dieser Anweisung und kein Nachschlagewerk; bis zum
2026-09-17 standen sie wörtlich an dieser Stelle. **Greift die Einbindung in deiner Fassung von
Claude Code nicht, lies die Datei zuerst** — vor der ersten Änderung an diesem Projekt.

Dort steht nur die Regel; die Messungen hinter jedem Punkt stehen in `docs/decisions/` (Liste
unten). Neue Regeln kommen mit dem Experiment dazu, das sie erzwungen hat - in den Code als
Kommentar, in `docs/decisions/` als Absatz, als Regel nach `docs/conventions.md`.

Die 22 Kommentare im Code, die eine Regel mit „CLAUDE.md" belegen (in 15 Dateien), bleiben, wie
sie sind: Gemeint ist die Anweisung, und die ist diese Datei samt der eingebundenen. Wer den
Wortlaut sucht, findet ihn in `docs/conventions.md`.

@docs/conventions.md

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

## Die Reviews

Alle zweiunddreißig Listen sind abgearbeitet. Die Chronik steht in
[`docs/reviews.md`](docs/reviews.md) — welches Review welchen Stand gelesen hat, mit welchen
Zahlen, was es gefunden hat und welche Fixes noch niemand gelesen hat. Sie stand bis zum
2026-09-17 hier und ist wörtlich dorthin gewandert; die Review-Dokumente selbst liegen als
`docs/REVIEW-<datum>.md`, die Aufträge daneben als `docs/REVIEW-<datum>-auftrag.md`.

**Was aus einer Runde dauerhaft gilt, steht als Regel in `docs/conventions.md`** — nicht in der
Chronik. Die Chronik nachzulesen lohnt für zwei Fragen: *warum* eine Regel so lautet, wenn der
Absatz in `docs/decisions/` sie nicht beantwortet, und *was gerade ungelesen ist* — die Serie ist
so gebaut, dass jede Runde liest, was die vorige gebaut hat.

**Stand:** Die dreizehn Befunde des dreiunddreißigsten Reviews (vier Mittel, neun Niedrig) sind
abgearbeitet, am 2026-09-20 auf `fix/review-2026-10-07`, dazu alle sieben Nebenbei-Punkte — 22
Commits, je einer mit Typcheck, Build und Smoke. Was die Runde gefunden hat, steht in
[`docs/REVIEW-2026-10-07.md`](docs/REVIEW-2026-10-07.md), was daraus geworden ist in
[`docs/reviews.md`](docs/reviews.md); die Messungen in
[`docs/decisions/styles-and-fonts.md`](docs/decisions/styles-and-fonts.md) und
[`docs/decisions/snapshots-and-updates.md`](docs/decisions/snapshots-and-updates.md), die sechs
neuen Regeln in [`docs/conventions.md`](docs/conventions.md). Offen ist aus dieser Runde nichts;
noch nicht getan ist, was `docs/release.md` daraus verlangt (Punkt 3: Handbuch- und Web-Projekt
einmal durch einen Bau schicken, damit die Schrift-URLs relativ werden; Punkt 4: `d4da5ef`
ausrollen oder als bewusst offen benennen). **Keinen dieser Fixes hat ein Review gelesen.**

Die Runde davor (zweiunddreißigstes Review, sechs Befunde, kein Befund über Niedrig) ist auf
`main` und gepusht; die Sprache von gits Text ist inzwischen gemessen (an GNU `libintl`, nicht an
glibc). **Was beide Reviews vor dem RC empfehlen, ist keine weitere Runde dieser Art**, sondern
die Liste, die nur der Nutzer abarbeiten kann: VoiceOver über Git-Sync und die zwei Boards, die
gepackte App je Plattform, glibc — und nach dem dreiunddreißigsten Review der Alpha-Test, an
Projekten aus der Beispielvorlage und mit einer gebauten Website am Ende jeder Szene, weil drei
der vier mittleren Befunde in der App unsichtbar und erst im Browser zu sehen waren.

**Davor, am 2026-09-19, ein Durchgang ohne Review dahinter:** die Schriften der Stile-Seite von
der Auswahl bis zu den Dateien im Projekt (Combobox über alle Google-Familien, Vorschau aus dem
Bau, ungenutzte Importe, „lokal ausliefern“ holt die Dateien wirklich ins Projekt, relative
`url()`, `save()` über alle Reiter), der Rückbau des mitreisenden Handbuchs und der Reiter
„Website“ als fünf Karten. **Das dreiunddreißigste Review hat beides gelesen**
(`docs/REVIEW-2026-10-07-auftrag.md`, Tag `review-2026-10-08`) — sein größtes Risiko war der
Code, der aus dem Netz in das Projekt schreibt und dort löscht, und genau dort lagen drei der vier
mittleren Befunde.

**Arbeitsregel** für die nächste Liste: ein Befund pro Durchgang, jeweils mit `npm run typecheck`,
`npm run build`, `npm run smoke` und eigenem Commit; was dabei nebenbei auffällt, wird gesammelt und
genannt, nicht mit erledigt. Was nur ein laufendes Programm beantworten kann, wird an der gebauten
App gemessen — und wo es geht mit einer Vorher-Messung, denn zwei der Befunde traten anders auf als
das Review sie beschrieb (der geteilte Optionen-Zustand erst nach einem Routenwechsel, der hängende
Content-Link mit ENOTDIR statt ENOENT).

## Claude-Skills in diesem Projekt

Skills werden projektlokal unter `.claude/skills/` bereitgestellt, nie global.
Firecrawl-Skills bei Bedarf aus dem gemeinsamen Store verlinken:

    ln -s ~/.agents/skills/firecrawl-scrape .claude/skills/firecrawl-scrape

Verfügbare Skills im Store: `ls ~/.agents/skills/`
