# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Electron + React + TypeScript desktop GUI for managing [Quartz 5](https://quartz.jzhao.xyz/) (jackyzha0's static-site generator) projects: load/save `quartz.config.yaml`, install/configure plugins (official CLI wrapper + a GitHub-based marketplace), switch the `content/` folder between a real directory and a symlink (e.g. an Obsidian vault), run builds, and control the local dev server. Supports multiple Quartz projects/profiles.

## Commands

- `npm run dev` — start in dev mode (electron-vite dev server + Electron window)
- `npm run build` — production build to `out/` (main, preload, renderer)
- `npm run start` — preview a production build
- `npm run typecheck` — `tsc --noEmit` against both `tsconfig.node.json` (main/preload) and `tsconfig.web.json` (renderer); there is no lint script and no unit tests in this repo
- `npm run smoke` — launches the production build (so `npm run build` first) and visits every screen in `App.tsx`, sub-tabs included, at 1280x800 and 1728x1000, reporting uncaught exceptions, console errors, `ErrorSurface` toasts, the route error boundary, a horizontally scrolling layout and an empty page. Not a test suite and it asserts nothing about content — it answers one question, *does every screen still come up*, which is otherwise only answerable by opening all seventeen of them. Each size is a fresh launch because `setViewportSize()` does not resize an Electron `BrowserWindow`
- `npm run dist` / `dist:mac` / `dist:linux` — electron-builder (see `docs/decisions/electron-runtime-and-packaging.md`)

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
  Rückgabe eines Abmelders. Sechs Events laufen so (`server:log`, `build:log`,
  `server:statusChanged`, `deploy:progress`, `templatePackage:progress`, `content:progress`); das
  siebte, `app:navigate`, sendet `menu.ts` selbst an alle Fenster, weil das Menü ohne den
  Handler-Kontext lebt.
- **Alles, was Main aus Projektdateien liest und an Prozesse gibt, ist mit `--` getrennt; `git`
  bekommt nie eine Shell; nur npm/npx brauchen eine.** `runCommand.ts` ist der eine Spawner für
  kurzlebige Kommandos.
- **Ja/Nein-Bestätigungen laufen über den nativen Dialog im Main-Prozess. In-App-Overlays sind nur
  für Inhalte mit Formular oder Auswahl.** Der Renderer fragt über `confirmDialog()`
  (`src/utils/confirm.ts` → Kanal `dialog.confirm`), nie über `window.confirm()`. Die sichere Antwort
  sitzt in `buttons[0]` mit `cancelId: 0` - `defaultId` entscheidet unter macOS nicht, was Return tut.
  Der bestätigende Button ist nach der Aktion benannt („Snapshot löschen“), nie „OK“. Die Regel steht
  als Kommentar am Handler und am `Modal`-Primitive, damit sie nicht driftet.
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
- **App-weit gibt es vier Dinge im Store** (`state/store.ts`): Projektliste, Settings, Fehler,
  Log-Puffer pro Projekt. Letzterer, weil Main Log-Zeilen unabhängig von der Seite sendet und ein
  seitenlokales Abonnement sie verlöre. Das Abonnement lebt einmal in `App.tsx`.
- **„Wo war ich“ überlebt einen Routenwechsel, nicht einen Neustart.** `useStickyState(key)` für
  Tab, Auswahl, Suchtext, Entwurf; keyed per Pathname, Namespace pro Komponente. Nicht für Gesten
  oder Pending-Flags. Scroll-Position analog in `ProjectLayout`. Schlüssel sind stabile Kennungen
  (ID, Name, Pfad), nie Listenindizes: `plugins.expanded.<index>` hängt an der Position, und nach
  einem Umsortieren gehört der Zustand zum falschen Plugin (siehe offene Befunde). Ein Link in einen
  anderen Bereich, der mehr als einen Pfad übergeben will („diesen Frame im Layout-Editor öffnen“),
  schreibt vor der Navigation mit `primeStickyState(pathname, key, value)` in den Store der Zielroute;
  die liest es genau einmal beim Mount, danach ist der Aufruf wirkungslos.
- **Verlassen mit ungespeicherten Änderungen fragt.** Modul-Flag in `unsavedGuard.tsx`, gesetzt von
  der Seite, abgefragt von der Sidebar; `UnsavedBadge` neben dem Save. Nur Sidebar-Links sind
  geguardet. Die Frage ist ein nativer Dialog und damit asynchron: der Klick wird gestoppt und die
  Navigation nach „Änderungen verwerfen“ von Hand ausgelöst.
- **Kein API-Aufruf ohne Netz:** globaler `unhandledrejection`-Handler → Toast; jeder Busy-Flag wird
  in `finally` zurückgesetzt (`useAsyncAction` für boolesche, `try/finally` für keyed).
- **URL zuerst, Sticky-State als Fallback** für Sub-Tabs (`?tab=`); alte Pfade bleiben als Redirects.
- **Eine Stelle bestimmt die Seitenbreite** (`ProjectLayout`, 1800px). Seiten setzen keine eigene
  Maximalbreite; Breite wird in Spalten ausgegeben, nicht in längeren Zeilen. Ein Block, der schmal
  bleiben will, sagt am Block, warum.

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
  weil vier Aufrufstellen dabei navigieren. Messungen in
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
  kein sed. `theme.ts` hält den Grund weiter als eigenes Literal.
- **Ein deaktiviertes Control muss noch lesbar sein.** Explizite disabled-Farben, keine Opazität:
  Text wird `text-text-muted`, ein Feld sinkt auf `bg-ground`, ein Icon-Button geht von
  `text-text-secondary` auf `text-text-muted`. Gedimmt werden darf nur, was keine eigene Information
  trägt (der Toggle-Knopf, die native Checkbox). Ein Feld, dessen Wert gerade nicht gilt, ist nicht
  deaktiviert: `Field muted` setzt nur das Label auf Muted, Control und Hinweis bleiben.
- **`darkMode: 'media'`, und das ist der App-Schalter.** `nativeTheme.themeSource` flippt
  `prefers-color-scheme` im Renderer mit; `color-scheme: light dark` auf `:root`, explizite Farben
  auf `select option` für Linux. Neue UI mit `dark:`-Varianten. Kein Wechsel auf `'class'`: die
  nativen Dialoge, das Linux-`<select>`-Popup und die Scrollbar hängen an der Media-Query.
- **Keine neue Stelle mit `draggable`.** Wer eine Stelle mit nativem HTML5-Drag anfasst
  (`Plugins/Installed`, `LayoutEditor/FrameBuilder`, `ComponentPill`, `Styles/CustomCss`), zieht sie
  auf `@dnd-kit` mit `KeyboardSensor` um - die Abhängigkeit ist da (`GlobalBoard`), natives Drag kann
  weder Tastatur noch Ansagen.
- **Ein Wort, ein Name.** Vokabular ist eine Tabelle (`positions`), nicht pro Seite. Deutsch „…“,
  Englisch “…”, Gedankenstrich als Em-Dash. Jeder Nutzertext steht in `de.ts`/`en.ts`
  (Schlüssel-Parität) oder `electron/main/i18n.ts`; zod- und `console.error`-Texte
  bleiben Englisch, weil sie Bugs beschreiben, nicht Eingaben.
- **Ein Fachbegriff bekommt eine Zeile darunter** (`Field`/`Toggle` `hint`); ein Begriff, auf dem
  eine Seite ruht, eine `InfoNote` oben, gedeckelt auf 95ch.
- **Sidebar nach Tätigkeit, eine Seite ist eine Aufgabe.** Einrichtung, Gestaltung, Veröffentlichung,
  Wartung; ein Screen, der eine Karte wäre, ist ein Sub-Tab. Die Übersicht ist eine Statusseite, die
  nichts kostet: nur lokale Reads beim Mount, genau einer ins Netz, nie awaited.

### Arbeitsweise, die sich bewährt hat

- **„Kann nicht prüfen“ ist nie „alles gut“.** `unavailable`/`'unknown'` sind eigene Antworten
  (Style-Check, Update-Check, Kataloge, Token-Prüfung, Secret-Backend).
- **Gemessen, nicht angenommen.** Jede Regel hier steht in `docs/decisions/` mit dem Experiment, das
  sie erzwungen hat. Neue Regeln genauso.
- **Ein Lesepfad legt nie `.quartz-gui/` an.** `quartzGuiPath()` zum Lesen, `quartzGuiDir()` zum
  Schreiben.
- **JSON-Stores nur über `jsonStore.ts`**: atomar schreiben, Unlesbares beiseitelegen statt
  überschreiben.
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
- [`plugins-and-config.md`](docs/decisions/plugins-and-config.md) - Options-Schema aus `.d.ts`, Frames in der Plugin-Liste, Drag bei Filter, Marktplatz, die zwei Config-Schreibwege
- [`templates-and-localization.md`](docs/decisions/templates-and-localization.md) - `.qtpl`-Paket, die zehn Teile, Dry-Run-Import, `merge=ours`, Übersetzungs-Baseline
- [`electron-runtime-and-packaging.md`](docs/decisions/electron-runtime-and-packaging.md) - Native Chrome, Electron 43, Toolchain, `brand-electron`, Packaging (deb/AppImage/VM), PATH im Bundle, `safeStorage` auf Linux, Menü, App-Identität, Icon
- [`i18n-and-vocabulary.md`](docs/decisions/i18n-and-vocabulary.md) - Sprachdateien, Klassenkomponente und Singleton, `mainT()`, Vokabular-Tabelle, Fachbegriffe
- [`dark-mode-and-contrast.md`](docs/decisions/dark-mode-and-contrast.md) - `nativeTheme`, `color-scheme`, Scrollbar, Playwright-Emulation, Muted-Token, disabled-Buttons, Avatar-Farben
- [`publishing-and-credentials.md`](docs/decisions/publishing-and-credentials.md) - Handshake-Budget, Host-Keys, Excludes, Zugänge vs. Ziele, Manifeste, Ordner-Ziel, `quartz sync`, GitHub-API, `GIT_ASKPASS`, Branch-Adapter, rsync, Webhook, Schlüsseldateien, verschlüsselte Zugangsdaten
- [`snapshots-and-updates.md`](docs/decisions/snapshots-and-updates.md) - Snapshot-Store als eigenes Git-Repo, Thinning, Restore, Warteschlange, Migration, Update-Check, geparkter Content-Symlink
- [`quartz-cli.md`](docs/decisions/quartz-cli.md) - Was die Quartz-5-CLI wirklich tut (unveröffentlicht, Flags, Exit-Codes, Config-Form)

## Offene Befunde aus dem Review (Status: offen)

Aus [`docs/REVIEW-2026-09-02.md`](docs/REVIEW-2026-09-02.md). Umgesetzt sind die P1-Befunde E1, E2
und U1 (Sandbox, `dialog.confirm`, `Modal`), U2 (`Toggle` mit `hideLabel`; `label` bleibt Pflicht,
ein Switch ohne Namen ist damit am Aufrufer sichtbar falsch), T1 und U4 (Farb-Tokens in
`index.css`/`tailwind.config.js`, `ui.tsx` als Pilot, die vier Opazitäts-Seiten; Messungen in
`docs/decisions/dark-mode-and-contrast.md`) sowie U3 (`SegmentedControl` als Radiogruppe; Messungen
in `docs/decisions/navigation-and-pages.md`). Alles Folgende ist **nicht** erledigt; die
Kurzbezeichnungen verweisen auf das Review.

**Arbeitsregel:** ein Befund pro Durchgang, jeweils mit `npm run typecheck`, `npm run build`,
`npm run smoke` und eigenem Commit; was dabei nebenbei auffällt, wird gesammelt und genannt, nicht
mit erledigt. Die Reihenfolge der Liste ist keine Arbeitsreihenfolge.

- **Reste aus dem T1/U4-Durchgang - Status: offen.** Der deaktivierte Ghost-Button liegt auf dem
  Seitengrund bei 4,00:1, weil seine `ink/4%`-Fläche den Grund abdunkelt (auf einer Karte 4,36);
  behebbar wie beim Feld, wäre aber eine Regel für alle Ghost-Buttons. `theme.ts` hält
  `#f5f5f7`/`#1e1e1e` als eigenes Literal neben `--ground`, `select option` in `index.css` die
  Werte von `--surface` und `--text` als Hex; beides gehört an die Variablen, sobald `theme.ts`
  eine geteilte Konstante bekommt. Die Sidebar, die Seiten und die Sub-Komponenten tragen noch
  Palette-Paare - beiläufig, kein sed.
- **Die Radiogruppe hat keinen Namen (aus dem U3-Durchgang) - Status: offen.** `SegmentedControl`
  ist jetzt eine `radiogroup`, und neun der elf Gruppen tragen keinen zugänglichen Namen: die vier
  Sub-Tab-Leisten, beide Breakpoint-Leisten, die Viewport-Leiste in Vorschau & Build und die zwei
  in `Vorlagen`. Ein Screenreader sagt dort „Optionsfeldgruppe“ und nichts weiter - dasselbe Muster
  wie U2 beim `Toggle`, eine Ebene höher. Die zwei Ausnahmen (Settings/Design, Frame-Ausrichtung)
  haben ihren Namen am äußeren `FieldGroup`-`role="group"`, nicht an der `radiogroup` darin; damit
  ist er zwar vorhanden, aber an der falschen Ebene. Ein optionales `label`-Prop (`aria-label` auf
  dem Container, oder der `sr-only`-Weg von `Toggle`) und elf Aufrufstellen - nicht gemessen, aus
  dem DOM der laufenden App gelesen.
- **Der Layout-Tab kennt `?tab=` nicht (aus dem U3-Durchgang) - Status: offen.**
  `LayoutEditor/index.tsx:29` hält seinen Sub-Tab in `useStickyState('layout.tab')`, während
  Konfiguration, Stile und Plugins über `goToTab` in die URL schreiben. Die Regel oben („URL zuerst,
  Sticky-State als Fallback“) gilt für diese eine Leiste heute nicht; ein Deep-Link auf „Eigene
  Frames“ ist damit nicht möglich.
- **S1 - Status: offen.** `useIpcQuery(fn, deps)` mit Abbruch-Guard, `loading`, `error`, `reload()`;
  20 von 32 API-Effekten haben heute keinen Guard. Neues Muster für neue Seiten, Bestehendes nur beim
  Anfassen.
- **S3 - Status: offen.** `useAppStore()` ohne Selektor in `Home`/`Settings`;
  `document.documentElement.lang` folgt dem Sprachwechsel nicht (`index.html` hat `lang="de"` fest);
  Settings werden zweimal geladen.
- **E4 - Status: offen.** `console.error` in `will-navigate` ist deutsch; Log-Puffer geht beim
  macOS-Fenster-Schließen verloren, während die Server weiterlaufen.
- **A2 - Status: offen.** Cmd+S auf Konfiguration, Layout, Stile: Menüpunkt mit `CmdOrCtrl+S`, Kanal
  `app:command` nach dem `app:navigate`-Muster, Save-Register auf Modulebene wie `unsavedGuard`.
- **A3-Buttons - Status: offen.** „Nach oben / nach unten“ an jeder sortierbaren Zeile als
  Tastatur-Alternative; die Drag-Regel oben gilt ab jetzt.
- **A4 - Status: offen.** `aria-live` für „Gespeichert“/Kopiert im `PageHeader`; `role="log"` auf
  `LogConsole`; zwei `<h1>` pro Projektseite (Sidebar-Projektname → `<p>`); `<nav aria-label>`.
- **U5 - Status: offen.** `LabelText` ist tot; Typo-Skala aus Arbitrary Values (`text-[11px]` 77×,
  `text-[13px]` 54×) - Tokens definieren, `ui.tsx` umstellen, Rest beiläufig, kein sed.
- **T2 - Status: offen (Notiz).** `'#ffffff'` als Picker-Fallback für nicht parsebare Farben.
- **Sticky-State über Index (aus dem U2-Durchgang) - Status: offen.** `Plugins/Installed.tsx:720`
  keyt `plugins.expanded.${index}` auf die Listenposition; nach einem Umsortieren oder Entfernen ist
  das falsche Plugin aufgeklappt. Per grep die einzige Fundstelle: alle anderen 40 Schlüssel tragen
  Namen, IDs (`backups.open` = Snapshot-ID, `publish.target`, `styles.themeCatalog.expanded`),
  Pfade (`styles.css.activeTab`) oder Entwürfe. Umstellen auf eine stabile Kennung des Eintrags
  (Plugin-Name bzw. Frame-ID). Nicht gemessen, aus dem Schlüssel gelesen.
- **Options-Zeile in `Plugins/Installed` (aus dem U2-Durchgang) - Status: offen.** In den beiden
  Options-Editoren steht der Optionsschlüssel als `<span>` neben dem Schalter; seit U2 ist der Name
  doppelt vorhanden, sichtbar und `sr-only`. Eine `Field`-artige Verknüpfung (Label umschließt das
  Control) wäre sauberer, ist aber ein Umbau der Zeile, die auch Select, Zahl und Text kennt.
- **Drei Antworten im Bestätigungsdialog (aus dem Doku-Durchgang) - Status: offen.** `confirmDialog()`
  und der Kanal `dialog.confirm` kennen genau zwei Antworten (Abbrechen, Bestätigen). Der
  Unsaved-Guard braucht absehbar „Speichern / Verwerfen / Abbrechen“; `showMessageBox` kann drei.
  Offen ist, ob der bestehende Kanal um einen dritten Button erweitert oder ein zweiter Kanal
  danebengestellt wird - nicht jetzt entscheiden.

## Claude-Skills in diesem Projekt

Skills werden projektlokal unter `.claude/skills/` bereitgestellt, nie global.
Firecrawl-Skills bei Bedarf aus dem gemeinsamen Store verlinken:

    ln -s ~/.agents/skills/firecrawl-scrape .claude/skills/firecrawl-scrape

Verfügbare Skills im Store: `ls ~/.agents/skills/`
