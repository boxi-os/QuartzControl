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
- `npm run check:i18n` — every literal `t('…')` and `mainT('…')` key against `de.ts`, `en.ts` and
  `electron/main/i18n.ts`, plus de/en parity in both directions. Static and instant; it exists because
  i18next renders a missing key *as the key* rather than failing, so a gap is invisible until someone
  opens the one screen state that uses it (`publish.pages.saveSettings`, found in the alpha test, was
  missing from both files and therefore in perfect parity)
- `npm run template:example` — baut die Beispielvorlage (`scripts/example-template/`) in einem
  Wegwerf-Projekt auf und exportiert sie als `.qtpl`. Treibt dafür die **gebaute App** über
  Playwright und schreibt alles über `window.quartzGui.*`, also durch dieselben IPC-Pfade wie ein
  Klick — kein zweiter Frame-Codegen, kein zweiter SCSS-Writer. Phasen einzeln über
  `--only 3,4,5`, die WCAG-Messung allein über `--check-contrast` (87 Paare, braucht weder App noch
  Projekt). Den Rückweg geht `--sync`: Es holt die 30 Stylesheets und die Schnipsel aus dem Projekt
  zurück ins Repo, denn dort wird gearbeitet und die Kopie hier driftet sonst still (gemessen am
  2026-09-05). Config und Frames haben bewusst keinen Rückweg — sie entstehen aus `plugins.mjs`,
  `variables.mjs`, `layout.mjs` und `frames.mjs`, und ein Rückleser wäre deren zweite, inverse
  Umsetzung. Ist zugleich der einzige End-to-End-Test der Vorlagen-Funktion: Phase 11 importiert das
  Paket in ein zweites leeres Projekt und baut es. Was dabei gefunden wurde, steht in
  `scripts/example-template/BEFUNDE.md`

- `npm run dist` / `dist:mac` / `dist:linux` / `dist:flatpak` — electron-builder (see
  `docs/decisions/electron-runtime-and-packaging.md`). `dist:flatpak` ist ein eigenes Skript, weil
  das Ziel flatpak und flatpak-builder auf der Baumaschine braucht und **noch nie gebaut wurde** —
  die Konfiguration ist abgeleitet, nicht gemessen. Der erste Bau ist am 2026-09-03 bewusst auf die
  Version nach v1 verschoben worden; v1 liefert macOS, AppImage und deb

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
  Rückgabe eines Abmelders. Sechs Events laufen so (`server:log`, `build:log`,
  `server:statusChanged`, `deploy:progress`, `templatePackage:progress`, `content:progress`); das
  siebte, `app:navigate`, sendet `menu.ts` selbst an alle Fenster, weil das Menü ohne den
  Handler-Kontext lebt.
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
  (ID, Name, Pfad), nie Listenindizes: `plugins.expanded.<index>` hängt an der Position, und nach
  einem Umsortieren gehört der Zustand zum falschen Plugin (siehe offene Befunde). Ein Link in einen
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
- **Ein Lesevorgang, dessen Schlüssel sich per Klick ändert, braucht einen Abbruch-Guard**
  (`useIpcQuery`). Zwei Antworten sind dann gleichzeitig unterwegs und die langsamere gewinnt, egal
  welche Frage später gestellt wurde. Wo der Schlüssel konstant ist oder sein Wechsel die Route neu
  mountet, ist ein Guard nur Zeremonie.
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
  überzulaufen. Messungen in
  [`navigation-and-pages.md`](docs/decisions/navigation-and-pages.md) und
  [`publishing-and-credentials.md`](docs/decisions/publishing-and-credentials.md).
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
  Überschrift einer Karte), definiert in `tailwind.config.js`. Neue Zeilen nehmen einen davon; die
  Ausreißer (10/12/14/17/19px) behalten ihre Zahl, bis einer einen Namen verdient.
- **Ein deaktiviertes Control muss noch lesbar sein.** Explizite disabled-Farben, keine Opazität:
  Text wird `text-text-muted`, ein Feld sinkt auf `bg-ground`, ein Icon-Button geht von
  `text-text-secondary` auf `text-text-muted`. Gedimmt werden darf nur, was keine eigene Information
  trägt (der Toggle-Knopf, die native Checkbox). Ein Feld, dessen Wert gerade nicht gilt, ist nicht
  deaktiviert: `Field muted` setzt nur das Label auf Muted, Control und Hinweis bleiben.
- **`darkMode: 'media'`, und das ist der App-Schalter.** `nativeTheme.themeSource` flippt
  `prefers-color-scheme` im Renderer mit; `color-scheme: light dark` auf `:root`, explizite Farben
  auf `select option` für Linux. Neue UI mit `dark:`-Varianten. Kein Wechsel auf `'class'`: die
  nativen Dialoge, das Linux-`<select>`-Popup und die Scrollbar hängen an der Media-Query.
- **Kein natives HTML5-Drag mehr, nirgends.** Alle vier Stellen ziehen mit `@dnd-kit`
  (`Plugins/Installed`, `LayoutEditor/GlobalBoard`, `LayoutEditor/FrameBuilder`; `Styles/CustomCss`
  hatte nie eines, nur Pfeile). Eine neue Stelle nimmt `@dnd-kit` mit `KeyboardSensor`, denn natives
  Drag kann weder Tastatur noch Ansagen. Was dabei gilt: der gezogene *Knoten* ist das ganze
  Element, der Griff nur `setActivatorNodeRef` (sonst vermisst die Kollisionsrechnung den Griff);
  eine Liste nimmt `useSortable` mit `sortableKeyboardCoordinates`, ein Raster `useDroppable` mit
  `nearestDroppableCoordinates` aus `utils/dndKeyboard.ts` - ohne einen der beiden schiebt ein
  Pfeildruck um 25px und damit um nichts; `PointerSensor` mit `distance: 4`, wo derselbe Griff auch
  klickbar ist. Sortierbare Zeilen tragen zusätzlich „nach oben / nach unten“: die Tastatur-Aufnahme
  ist eine Geste, die man kennen muss. Messungen in
  [`plugins-and-config.md`](docs/decisions/plugins-and-config.md) und
  [`layout-frames.md`](docs/decisions/layout-frames.md).
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
- [`templates-and-localization.md`](docs/decisions/templates-and-localization.md) - `.qtpl`-Paket, die zehn Teile, Dry-Run-Import, `merge=ours`, Übersetzungs-Baseline
- [`electron-runtime-and-packaging.md`](docs/decisions/electron-runtime-and-packaging.md) - Native Chrome, Electron 43, Toolchain, `brand-electron`, Packaging (deb/AppImage/VM), PATH im Bundle, `safeStorage` auf Linux, Menü, App-Identität, Icon
- [`i18n-and-vocabulary.md`](docs/decisions/i18n-and-vocabulary.md) - Sprachdateien, Klassenkomponente und Singleton, `mainT()`, Vokabular-Tabelle, Fachbegriffe
- [`dark-mode-and-contrast.md`](docs/decisions/dark-mode-and-contrast.md) - `nativeTheme`, `color-scheme`, Scrollbar, Playwright-Emulation, Muted-Token, disabled-Buttons, Avatar-Farben
- [`publishing-and-credentials.md`](docs/decisions/publishing-and-credentials.md) - Handshake-Budget, Host-Keys, Excludes, Zugänge vs. Ziele, Manifeste, Ordner-Ziel, `quartz sync`, GitHub-API, `GIT_ASKPASS`, Branch-Adapter, rsync, Webhook, Schlüsseldateien, verschlüsselte Zugangsdaten
- [`snapshots-and-updates.md`](docs/decisions/snapshots-and-updates.md) - Snapshot-Store als eigenes Git-Repo, Thinning, Restore, Warteschlange, Migration, Update-Check, geparkter Content-Symlink
- [`quartz-cli.md`](docs/decisions/quartz-cli.md) - Was die Quartz-5-CLI wirklich tut (unveröffentlicht, Flags, Exit-Codes, Config-Form)

## Offene Befunde aus dem Review (Stand 2026-09-05)

Die Liste aus [`docs/REVIEW-2026-09-02.md`](docs/REVIEW-2026-09-02.md) ist vollständig abgearbeitet;
der Tag `review-2026-09-02` markiert den Ausgangsstand, und was dabei gemessen wurde, steht in
`docs/decisions/`. Offen davon nur noch die rund 272 Palette-Paare im Renderer - beiläufig beim
Anfassen, kein sed.

Aktuell ist [`docs/REVIEW-2026-09-05.md`](docs/REVIEW-2026-09-05.md) (der Auftrag daneben in
`docs/REVIEW-2026-09-05-auftrag.md`): 15 Befunde, 3 Hoch, 7 Mittel, 5 Niedrig, jeweils mit Datei,
Zeile, Szenario und der Angabe, ob gemessen oder gelesen.

**Arbeitsregel:** ein Befund pro Durchgang, jeweils mit `npm run typecheck`, `npm run build`,
`npm run smoke` und eigenem Commit; was dabei nebenbei auffällt, wird gesammelt und genannt, nicht
mit erledigt. Die Reihenfolge der Liste ist keine Arbeitsreihenfolge.

### Erledigt (2026-09-05)

- **1 Duplikat baute mit den Frames des Originals - erledigt.** `duplicateProject` schreibt nach dem
  Kopieren jeden Pfad um, der *innerhalb* des Quellprojekts liegt: Plugin-`source` in der Config,
  `source`/`resolved` im Lockfile, die Symlinks in `.quartz/plugins/`. Ein Plugin von woanders auf
  der Platte bedeutet in beiden Projekten dasselbe und bleibt. `writeConfig` hat dafür dieselbe
  `snapshot: false`-Ausnahme wie `saveFrame` - die Kopie hat bewusst keinen Snapshot-Store und darf
  hier keinen anfangen.
- **2 Pfad-Traversal im Paket-Import - erledigt.** Zwei Schichten: `readZip` weist ein Archiv mit
  absolutem Namen, `..`-Segment, Laufwerksbuchstaben oder NUL komplett zurück (nichts, was diese App
  schreibt, erzeugt so einen Namen), und `containedPath()` in `templatePackage/shared.ts` entscheidet
  per `resolve()`+`relative()` über jeden Zielpfad - in `content`, `fonts` und `styles`, in `plan`
  *und* `apply`, damit der Plan nichts verspricht, was `apply` verweigert. **Ein Paket ist keine
  Vertrauensgrenze**, so wenig wie der Renderer: Namen daraus werden nie ungeprüft auf ein
  Verzeichnis gelegt.
- **3 Ausgabeverzeichnis reiste mit - erledigt.** `.quartz-gui/project-prefs.json` steht in `SKIP`.
  Der Build-Guard bleibt, wie er ist: ein Ordner mit `index.html` und `static/` ist vom eigenen
  vorigen Build nicht zu unterscheiden, also darf gar nicht erst ein fremder Pfad in der Kopie
  landen.
- **9 Zwei Reste des Originals - erledigt.** `.quartz-gui/deploy-manifest.json` (der Legacy-Name, den
  `readManifest` adoptiert) in `SKIP`, `.quartz-gui/branch-worktree-` in `SKIP_PREFIX`.

### Offen

- **4 Der Assistent überschreibt beim Kopieren eigene Notizen mit denen der Vorlage** (Mittel).
  `Home.tsx`: `withContent` steht unabhängig von der Content-Strategie auf an, der Import läuft mit
  `packageWins` ohne Plan-Anzeige.
- **5 Import-Warnungen im Assistenten verschwinden** (Mittel). Das Ergebnis von
  `templatePackage.import` wird dort nicht gelesen; über „Vorlagen → Importieren“ sind dieselben
  Warnungen sichtbar.
- **6 `plan.notes` wird nirgends gerendert** (Mittel). Der `content`-Baustein schreibt
  `contentIsSymlink` und `identical:<name>` hinein, die Seite zeigt nur `additions` und `conflicts`.
- **7 Sticky-Schlüssel kollidiert für mehrfach installierte Plugins** (Mittel).
  `plugins.expanded.<name>` hängt am abgeleiteten Namen, und ein Projekt kann sechs Zeilen
  `quartz-layout-box` haben - die Umstellung von Index auf Name hat den Positions-Befund gegen diesen
  getauscht.
- **8 Ein kaputter Vorlagen-Cache gewinnt gegen die mitgelieferte Kopie** (Mittel).
  `builtinTemplateService.ts` schreibt nicht atomar und prüft nur zwei Magic-Bytes; `Home.tsx` legt
  bei `plan === null` still ohne Vorlage an.
- **10 Auf einem Mac ohne Command Line Tools startet die App vermutlich mit Apples
  Installer-Dialog** (Mittel, nicht gemessen - kein solcher Rechner verfügbar). `gitRuntime.ts` führt
  `/usr/bin/git --version` aus, obwohl der Kommentar daneben weiß, dass das dort ein Stub ist.
- **11 Nach einem Vorlagenfehler bleibt der Assistent in einem toten Zustand** (Niedrig).
  `reload()` beim Schließen und `setError(null)` in `onCancel` fehlen; der Duplizieren-Dialog macht
  beides richtig.
- **12 Die Symlink-Sperre hat zwei blinde Flecken** (Niedrig). `getContentStatus` prüft mit
  `existsSync`, das Links folgt (hängender Link meldet „kein Symlink“), und geprüft wird nur
  `content/` selbst, nicht ein Link darin.
- **13 Ein Symlink innerhalb von `content/` bricht den Export** (Niedrig). `listContentFiles`
  behandelt einen Link-Eintrag weder als Verzeichnis noch als versteckt, `readFile` wirft EISDIR.
- **14 Fehlertexte in beiden Dialogen erscheinen ohne Live-Region** (Niedrig). `Home.tsx`, gegen die
  Regel „Was ohne Zutun erscheint, wird angesagt“.
- **15 Zwei Kopien der git-Version** (Niedrig). `Settings.tsx` und `scripts/fetch-git.mjs` führen
  `2.53.0` je einmal; driftet eine, zeigt der Quelltext-Link der Lizenzangabe auf die falsche
  Version.


## Claude-Skills in diesem Projekt

Skills werden projektlokal unter `.claude/skills/` bereitgestellt, nie global.
Firecrawl-Skills bei Bedarf aus dem gemeinsamen Store verlinken:

    ln -s ~/.agents/skills/firecrawl-scrape .claude/skills/firecrawl-scrape

Verfügbare Skills im Store: `ls ~/.agents/skills/`
