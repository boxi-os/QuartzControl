# Navigation, Seiten und Zustand im Renderer

Aus CLAUDE.md ausgelagert (2026-09-02): die Messungen und Beobachtungen hinter den Regeln, wortgleich. Die Regeln selbst stehen in CLAUDE.md; hier steht, welches Experiment sie erzwungen hat. Neue Einträge kommen mit derselben Form dazu: was gemessen wurde, was daraus folgt.

- **The sidebar is grouped by what the user is doing, and a page is a job rather than a service.** Four groups (`ProjectLayout`'s `NAV_GROUPS`): Einrichtung (Konfiguration, Plugins), Gestaltung (Layout, Stile, Vorlagen), Veröffentlichung (Vorschau & Build, Git-Sync, Veröffentlichen), Wartung (Updates, Backups) - Übersicht stays ungrouped above them as the landing page. Screens that were one card or one form of their own became sub-tabs of the page they belong to: Content-Ordner and Übersetzungen are `?tab=` tabs of **Konfiguration** (both describe what the site *is* and where its texts come from - `ConfigEditor/ContentFolder.tsx`, `ConfigEditor/Localization.tsx`), Marktplatz is a tab of **Plugins**. Updates deliberately is *not*: it updates the Quartz core as much as the plugins, so it stays its own page next to Backups, where the other "keep this project healthy" work lives. `/content`, `/localization` and `/plugins/marketplace` stay as redirects to the right tab, so older links keep working - the same treatment `/themes` got. Every shell follows the Styles pattern (URL first, `useStickyState` fallback, one `PageHeader` for the page with a per-tab description), so a sub-tab renders no header of its own; that is also why `TAB_ICONS` has one entry per **sidebar item**, not per screen. A sub-tab that needs its own Save button puts it next to the controls it saves (`Localization`'s locale row) rather than reaching into the page header.
  - **The content folder cannot be pointed at itself.** `changeContentSource` moves the current `content/` aside *before* it reads anything, so a source inside it is already gone by then - measured on a real project: the symlink strategy reported success and left a link pointing at itself (after which the page said the folder was missing), the copy strategy failed with a raw ENOENT, and in both cases the notes existed only in `.quartz-gui/content-backups/`, which nothing in the UI leads to. Both containment directions are refused up front, via `relative()` rather than a prefix test - and deliberately without `realpath`, or re-pointing a symlinked vault at one of its own subfolders would be refused too.
  - **The locale is picked, not typed.** Its valid values are exactly the locale files the project ships, which the Übersetzungen tab next door already lists, and `quartz`'s `i18n()` is a bare lookup with no fallback for a wrong key: a real build with `locale: de-DEE` died in an emitter with "Cannot read properties of undefined (reading 'pages')", naming neither the locale nor the setting. A value the project does not ship stays selectable rather than being silently dropped on the next save.
  - **`analytics` is a form now.** Quartz supports eleven providers (`Analytics` in `quartz/cfg.ts`), the value round-tripped through `configService` untouched all along, and there was no way to set it anywhere in the app. Switching provider drops the previous one's keys rather than merging them - the config is a union, and a leftover `tagId` on a plausible entry is a shape quartz never reads - and the required fields per provider are named when they are still empty.
- **The Übersicht answers "what is the state of this project" with one tile per area, and it must cost nothing to open.** `ProjectDashboard.tsx` is a status page, not a launcher: an attention band that only exists when something is actually broken, three tiles for what is used daily (Dev-Server, Die Seite, Git-Sync) and one small tile per remaining sidebar area (Plugins, Gestaltung, Build, Veröffentlichen, Updates, Backups), each linking the page that owns it. Every tile has the same anatomy - labelled header, the one number or name it is about, two supporting facts, a footer link - so the page is scanned rather than read. The dev-server log deliberately does **not** appear here: it lives on Vorschau & Build, and `useLogStore` keeps it per project regardless of which page is mounted, so nothing is lost by leaving it out.
  - **Ten reads on mount, and exactly one of them touches the network.** Config, content, git, snapshots, frames, stylesheets, the SCSS check, publish targets and the build output are all local files, so the page is filled before the user has finished looking at it; each fetch swallows its own failure into a `null` so one unreadable file cannot blank the page. `updates.coreStatus`/`pluginsStatus` run in their own effect and are never awaited by anything else - they cost the Updates tile a skeleton and nothing more, and a failed check reads "Nicht prüfbar", never "Alles aktuell" (the same distinction `updateService` and `styleService`'s `unavailable` make). `deploy.diff` is deliberately absent: for an rsync target it asks the remote server.
  - **The band's checks are the ones a user cannot see from anywhere else**: a dead content symlink, a git conflict or an unfinished merge, an SCSS error (with the file and line the check reports), a missing baseUrl - which is not cosmetic, since `quartz-fonts` throws without one - and a dev server that died. Available updates are *not* in it; they are information, not breakage, and the Updates tile carries them.
  - **`build.lastOutput` exists because nothing records that a build happened.** It walks the output directory and reports the **newest mtime in the tree**, not the directory's own: a directory's mtime only moves when an entry is added or removed, so rebuilding a site whose file list did not change would report the age of the first build.
  - **Relative ages are computed at render, so the page nudges itself every 30 seconds.** Without it a tile keeps showing the age it had when it last changed for another reason - measured in the running app: 55 seconds after the dev server started, its line still read "Gestartet vor 1 Sekunde". Same reason the pending-action state is a *list* of kinds rather than one slot: a build takes half a minute, starting the preview meanwhile is reasonable, and a second action finishing must not clear the first one's flag.

- **Dev-server and build output are the one exception to "logs are page-local."** `useLogStore` (in `state/store.ts`) holds `serverLogs`/`buildLogs` per project id, and `App.tsx` installs the *only* `server.onLog`/`build.onLog` subscription, once, for the app's whole lifetime — not per-page. `ProjectDashboard` and `BuildServer` both just read from the store and never subscribe themselves. This is deliberate: the main process keeps emitting log lines whenever the server/build process actually outputs something, regardless of which page is mounted, so a page-local subscription silently drops everything emitted while the user was on an unrelated tab (this is exactly the bug it replaced — the log pane going empty every time you navigated back). Output is only ever cleared by the explicit "Ausgabe leeren"/"Clear output" action (`LogConsole`'s `onClear`) or an app restart — starting/restarting the server or running a build no longer wipes it.

**Vorschau & Build leads with the address, and "running" means something answers at it.** The page is a preview page, so the URL is its headline - a live one when the server runs, a muted one saying what it *will* be when it does not - with a copy button next to it and the log below rather than above. Four things it used to get wrong, all measured in the running app:
  - **`running` used to be set on the server's first stdout line**, which is Quartz's version banner - printed while it is still *building*, a second or more before the http server listens. Every consumer of that state was wrong for that window: the Übersicht's link led nowhere, and the live-preview iframe mounted straight into a connection refusal and stayed blank. `buildService.waitForPort()` probes `127.0.0.1:<port>` every 250ms instead (127.0.0.1 regardless of `--remoteDevHost`, which only rewrites the websocket URL handed to the browser). Matching the "Started a Quartz server" line would have worked too but depends on its wording; the probe does not. A port someone else holds cannot make this lie: the probe only flips a status object that is still the current entry's *and* still `starting`, and a Quartz that loses the port exits first - verified by occupying 8080 and starting on it, which reports the exit, not "Läuft".
  - **The form's options contradicted the page.** They were plain `useState`, so a route switch reset them: with a server running on 9000, coming back showed 8080 in a disabled field next to a link to :9000. They are `useStickyState` now *and* a running server's real `status.options` are adopted on mount. They collapse behind "Server-Einstellungen", because a four-digit port field stretched to 390px on a maximized window and these are set once per project.
  - **The error state said only "Fehler".** `status.error` was never rendered on this page, and the exit code was a German sentence built in the main process. `ServerStatus` carries `exitCode` now and `src/utils/serverStatus.ts` phrases it for both pages that show it. Disabling the settings whenever the state was not `stopped` locked the fields in exactly that state - which is when changing the port is the fix - so they follow `serverActive` (starting/running/stopping), not "not stopped".
  - **The `watch` switch could not be honoured.** `quartz/cli/handlers.js` does `if (argv.serve) { argv.watch = true }`, so the dev server always watches; the switch is gone from the UI, from `ServerOptions` and from the spawned argv, and the facts line says "lädt automatisch neu" instead.
  - **The live preview is an `<iframe>`, not a `<webview>`.** It needs no `webviewTag`, gets a separate origin (so `window.quartzGui` is out of reach - preload scripts do not run in sub-frames unless `nodeIntegrationInSubFrames`), and `sandbox="allow-scripts allow-same-origin allow-forms"` keeps the previewed site from navigating the app window. Verified end to end: Quartz's own hot reload arrives *through* the sandbox - editing `content/index.md` updated the embedded page with no manual reload. `index.html`'s CSP needed `frame-src http://localhost:* http://127.0.0.1:*` (a `file://` document framing `http://` is not `'self'`); a `remoteDevHost` preview is deliberately not covered and keeps the external link.
  - **The viewport switch renders at real CSS pixels, and its widths come from the project's own breakpoints.** An iframe's width *is* the viewport its media queries see, so no scaling is involved - which also means a narrow window cannot show an 820px tablet, hence the `overflow-x-auto` container (and `min-w-0` on the Card: a grid item's implicit `min-width: auto` otherwise lets a fixed-width child push the whole card past the window edge and make `<main>` scroll sideways, buttons and all - reproduced at 900px). The presets are device widths pulled into the project's bands rather than the breakpoints themselves: a breakpoint is the *widest* point of its band, which is where a layout is least likely to break, and 390/820 (phone, iPad portrait) are what someone means by "Handy"/"Tablet" - but with a 900px mobile breakpoint 820 *is* a phone, so both are clamped against `layoutFrames.getBreakpoints()`. Switching width does not remount the iframe: resizing is what a real browser does too, and remounting would throw away wherever the user had navigated to in the preview.
  - **The build card describes the output directory**, from `build.lastOutput` - which the Übersicht had been showing long before the page that owns building did - refreshed after every build, with the resolved path and an "Ordner öffnen" that only appears for a path inside the project, since `dialog.openPath` refuses anything else.

**The build output directory is one value per project, not one per page.** `projectPrefsService` keeps it in `<project>/.quartz-gui/project-prefs.json`; Vorschau & Build and Veröffentlichen both read it on mount and write it on blur. They used to hold separate fields, so building into an export folder and then publishing silently shipped a stale `public/`. Reading goes through `quartzGuiPath()` - the non-creating sibling of `quartzGuiDir()` - or every project merely opened would gain an empty `.quartz-gui/` and a `.gitignore` entry.

**A build deletes its output directory, so choosing one is a destructive act.** `quartz build --output <dir>` opens with `rm(output, { recursive: true, force: true })` (`quartz/build.ts`) - measured against a real build, an export folder holding a subdirectory of notes came back holding nothing but the site, with no trash and no prompt - and this page offers a folder picker for that field. `buildOutputGuard.ts` therefore answers three ways: **refused** for the project directory, any ancestor of it, the home directory and the project's own `content`/`quartz`/`.git`/`.quartz-gui`/`.quartz-cache`/`node_modules` (a relative `.` resolves to the project, and the schema allows it); **confirm** for anything else that already holds something which is not a Quartz build; **ok** otherwise. "Is a Quartz build" is read from the emitted file names (`index.html` plus one of `static`/`index.xml`/`sitemap.xml`/`404.html`), which is what keeps a rebuild into a real output directory from asking every time, without storing any state. The check sits in the `buildRun` **handler**, so Veröffentlichen's "Jetzt bauen" goes through it too, and both a refusal and a cancelled confirmation are **thrown**: `BuildResult` has no room for a message, and both callers already render a rejected invoke (the build log, the diff card). `BuildOutputInfo.looksLikeBuild` carries the same answer to the renderer, which warns next to the field before the button is ever pressed.
  - **`defaultId` does not decide what Return does.** Measured in the running app on macOS with the destructive button first and `defaultId` pointing at "Abbrechen": Return emptied the folder anyway, while Escape did honour `cancelId`. So in every confirm dialog here the safe answer sits in `buttons[0]` - the build guard's and the SSH host-key one, where the reflex answer used to be "Verbinden und merken".

**An empty `LogConsole` collapses to one line.** Two of them sit on this page; at their fixed 288px a freshly opened page was two rectangles of black nothing that pushed the build card entirely below the fold.

**A page that edits a whole document asks before its work is thrown away.** Konfiguration, Layout and Stile each hold quartz.config.yaml (and, on Stile, custom.scss and the extra stylesheets) in plain `useState` behind an explicit Save button, and every route fully unmounts on a sidebar switch - so leaving discarded the edits silently. Measured in the running app: typing a new header font on Stile → Basis, going to Plugins and coming back showed the old value again with nothing having said so. `state/unsavedGuard.tsx` is a module-level flag - the same shape as `ProjectLayout`'s `scrollPositions`, and for the same reason: the asking happens in the sidebar, which is a sibling of the page that knows it is dirty, and only one route is mounted at a time. It is deliberately **not** a draft store: the edits are still lost when the user confirms, what changed is that they are asked, and the `UnsavedBadge` next to Save says so before they even try to leave. Each page computes `dirty` by comparing against what it read from disk rather than setting a flag on the first keystroke, so typing an edit and undoing it clears the warning again (`scss.dirty` became such a comparison too, which also fixes the CSS tab's modified-dot). Only the sidebar's own links are guarded - the nav items and the way back to the project list - because every in-page link leads out of a page that edits nothing, and one consistent place beats a guard that covers some links and not others.
  - **All three put that Save in `PageHeader`'s `actions`, with the same "Gespeichert" line and `UnsavedBadge` beside it.** Layout used to hang its own copy off the right of its tab row, a line lower and next to a different thing, so the one control that commits your work moved when you switched area; its tab row was also a hand-rolled copy of `SegmentedControl`, identical down to the radii and the dark variants. A sub-tab that saves something of its own still puts that button next to what it saves (`Localization`'s locale row, the CSS tab's per-file save) — the page header is for the page's document.

**Leaving an area and coming back must not lose your place.** Every route fully unmounts on a sidebar switch (see `App.tsx`'s `<Routes>`), so plain `useState` in a page is gone the moment the user looks at something else. Two module-level maps in the renderer fix that, both keyed by pathname (so projects and areas never collide) and both living only for the renderer process's lifetime — nothing here is persisted to disk, because these are drafts and "where I was a moment ago", not saved data:
- `ProjectLayout`'s `scrollPositions` restores the scroll offset. Its `ResizeObserver` watches the **content wrapper**, not `<main>`: `<main>` is a `flex-1` box with `overflow-y-auto`, so its own size doesn't track its contents, and observing it only catches a content change indirectly — via the scrollbar appearing and shrinking the content box. That works today (verified against the slowest page, the plugin marketplace) but would stop working under overlay scrollbars.
- `state/uiState.ts`'s `useStickyState(key, initial)` is a drop-in `useState` for the rest: which sub-tab and selection is open (`LayoutEditor`'s tab + page type, `Styles`' tab, `Backups`' kind, `Publish`' target), what was typed into a search box, and unsaved drafts (`FrameBuilder`'s open frame, `Localization`'s pending translations). Namespace the key per component (`'frames.editing'`), since several components share a route. Deliberately *not* for transient interaction state — a drag in progress, a status message, a pending flag: restoring those mid-gesture is worse than resetting them. Two places need care when adopting it: a mount-time fetch that seeds the state must use the functional setter so it doesn't clobber a restored value (see `Localization`'s locale), and an effect that resets a draft on selection change must tell "the selection changed" from "the component remounted" (a ref initialized to the restored value does that).
- `Styles` keeps `?tab=` as the source of truth (the `/themes` redirect and in-app links depend on it) and only falls back to the remembered tab when the URL says nothing — which is exactly the sidebar's own `NavLink to="styles"`, since it carries no search string. Arriving at a tab *through* the URL has to write the remembered tab too (an effect on `rawTab`, not just `goToTab`), or a deep link followed by a sidebar round-trip drops the user on a tab they never chose — reproduced in the running app. `goToTab` still records it as well, because switching to Basis clears the parameter entirely and leaves nothing to react to.

**One place decides how wide a page may get.** `ProjectLayout`'s `<main>` wraps the outlet in a single `max-w-[1800px]` guard; **pages set no max width of their own** and lay their content out responsively instead. Before this, eight different ad-hoc caps (`max-w-xl` … `max-w-7xl`) left most of a maximized window empty. What extra width buys is *columns*, not longer rows: forms go multi-column (`SiteSettings`, `Styles/Basics`), list rows that are short-text-plus-buttons become a grid (`Backups`, `Plugins/Installed`, `Localization`), and side-by-side halves sit next to each other (`Templates`, `ProjectDashboard`'s summary cards). Where a *block* genuinely doesn't want the space, the cap goes on that block and says why — often conditionally, since the same card wants the full width once it has output to show (`GitSync`'s git log, `Backups`' open diff via `col-span-full`). `Home` and `Settings` are the exceptions that stay centered columns: a launcher and a preferences sheet, not work surfaces. Home spends its extra width on a second column rather than on longer rows (projects left, what the app can do right), and drops to one column of project cards when there is only one — a lone card at half width with an empty column beside it reads as a layout fault. When putting rows into a grid, give the action group `shrink-0 whitespace-nowrap` and the text column `min-w-0`, or the buttons start wrapping at the narrower width. **Which breakpoint that grid switches at is a measurement, not a pick from the scale**: an action group that cannot shrink sets a hard minimum per column, so the column count has to follow from it. `Plugins/Installed`'s row needs ~710px (408px of buttons plus a `basis-64` text column) - stepped through container widths in the running app - which is why its list goes two-column at `min-[1760px]`, not at `xl`, where the plugin name was squeezed to a couple of characters. The row wraps as a fallback (`flex-wrap` plus `ml-auto` on the actions) so the narrow case is merely taller rather than broken.

**The start screen is a launcher that says what is broken, and the Einstellungen are the app-level half of the app.** `Home` reads one channel, `projects.overview()` (`projectOverviewService`), which is local file reads plus the dev-server status `buildService` already holds in memory — the same "must cost nothing to open" rule the project Übersicht follows. It exists for two states nothing else ever noticed: `projects.add` accepts any folder, so a row can be a project with no `quartz.config.yaml`, and nothing watches a registered folder, so a moved one produced a normal-looking card that opened into a page where every fetch failed. Both are now marked on the card, and a missing folder offers `projects.relocate`, which re-points the entry **keeping its id** — remove-and-add would mint a new one, and the id is what the running-server tracking, the remembered sub-tabs and the scroll positions are keyed by. Sorting is by `lastOpenedAt`, which `touchProject` had been writing on every open and nobody read. **Removing a project stops its dev server**, because removing the entry is the last moment the app can still reach it: measured, the removed project's site kept answering on its port and `running-servers.json` still held the entry — keyed by an id that no longer resolves, so the next start's orphan dialog would have offered a bare uuid instead of a name. The right-hand column mirrors the sidebar's own four groups in the sidebar's own order, so the launcher teaches the structure of a project before you are inside one.
- **Connections are app-level but were only reachable from inside a project.** `connectionsService` keeps them in `userData`, yet the only UI was the Veröffentlichen page — so rotating an SFTP password meant opening some project first, which is the opposite of what the connection/target split exists to say. The manager (list with usage counts, edit, delete, forget host key) is a Settings section now; Publish keeps creating one in the flow and links across. **That link sits in the page's own explanatory note**, not inside the target form: the note names a second concept (a Zugang) while the only route to it was to press "Neues Ziel" first, so the page introduced a thing it led nowhere near - reported from the alpha test as the split being explained but unreachable. The in-flow button names the kind it creates ("+ Neuer SFTP / SSH-Zugang") and a line under it says why there is no choice of kind: an SFTP target needs an SFTP login, so the kind follows from the target type two fields up. It stays a button rather than becoming a second link because the target draft is plain state and a trip to the Einstellungen throws it away. The form itself is `components/ConnectionForm.tsx`, shared, because two copies would mean two places to add the next auth method.
  - **An empty secret field means "unchanged", and that has to be true all the way down.** A stored secret never travels back to the renderer, so every edit opens on an empty field with an "unverändert lassen" placeholder — and `saveConnection` used to read that emptiness as a value: measured, clicking into a saved SFTP connection's password field, typing and deleting again wrote an empty secret over the stored one, after which the row read "kein Passwort/Key" and the credential was gone with nothing having asked. Both the service and the webhook schema's refine treat `''` on an *existing* connection as "keep it"; a changed auth method is the one exception, since a password is not a key. `encrypt('')` answers `undefined` rather than a base64 of nothing, or `hasSecret` would be true for a credential that is not there. The webhook field is the same rule in the other direction: it showed the example URL as its placeholder while editing a stored one, which read as "no URL here".
  - **The Save button's guard is `connectionDraftIncomplete()`, shared by both pages.** It checked only the name, so an empty host or a port field cleared to 0 reached the IPC boundary and came back as a zod message about an argument rather than about a field.
- **Settings' „Zurück“ goes back, not home.** The page is reached from three places - the start screen, Cmd+, from anywhere, and Veröffentlichen's connections link - and a hardcoded `to="/"` sent two of them somewhere the user had never been: coming from a project page it landed on the project list, and the project had to be picked again. It is `navigate(-1)` now, with `location.key === 'default'` (the session's first entry, i.e. a deep link with nothing behind it) as the one case that still needs a destination of its own.
- **`defaultProjectDirectory` was written, validated and read by nobody.** It now pre-fills `dialog.pickFolder(defaultPath)` — which honours it only if it still exists, so a stale one cannot make the dialog open somewhere surprising — on the start screen and in the create wizard. **A path the user *types* is not a path a dialog produced**, which is the assumption every path schema rests on: measured, entering this field's own placeholder `~/Documents` and pressing Save answered `arg[0.defaultProjectDirectory]: Pfad muss absolut sein`. `expandHome()` (in `src/utils/platform.ts`) expands the tilde before the value crosses IPC — which is why `homeDir` sits on the preload bridge next to `platform`, needed synchronously and never worth an IPC round trip — and anything still relative gets a sentence instead of a validation dump. The key-file field's `~/.ssh/id_ed25519` placeholder had the identical problem and goes through `normalizeConnectionDraft()`.
- **The GitHub token gets an answer, and "could not ask" is one of them.** `github.viewer()` already existed and this screen never called it, so a token that GitHub had since revoked looked exactly like a working one. Four states now: checking, valid with the account name, rejected — and *nicht prüfbar*, because `viewer()` **rejects** on a network error while a 401 resolves to `null` (verified against the service with a stubbed fetch), and the page's `reload()` did not catch it: the badge stayed on "Prüfe…" for good while the rejection surfaced as an app-wide error toast. Same "cannot check ≠ fine" distinction as `updateService`'s `'unknown'`. The re-check button exists for the same reason it does on Updates — asking again used to mean pasting the token in a second time. `settings.environment()` next to it blocks main for 97ms (measured, three `execFileSync` probes), which is why it is not cached and is fetched on every visit.
- `dialog.openExternal` is a new channel with an https-only refine (`s.externalUrl`) rather than an `<a target="_blank">` riding on `setWindowOpenHandler` — `shell.openExternal` hands the URL to whatever handler the OS registered for its scheme, so it is allow-listed the same way `openPath` is restricted to registered project directories. `dialog.revealUserData` takes no argument at all for the same reason. Verified: `http:`, `file:`, `javascript:` and a non-URL are all refused, `https://quartz.jzhao.xyz/` opens. The five `target="_blank"` links that remain cannot use it - two of them are the dev server's `http://localhost:<port>` - so `setWindowOpenHandler` checks the scheme itself and passes only `http:`/`https:` to `shell.openExternal`; it used to hand it every URL the renderer produced.
- **A new project is named, not navigated to.** The create wizard asked for one „Zielverzeichnis“, but a native folder picker can only return a directory that *already exists* — so naming a new project meant creating its folder inside the file dialog first, which is not something a first-time user thinks to do (reported from the alpha test). It is a picked parent plus a typed name now, with the resulting path shown under the two fields, and `git clone` creates that directory itself. Every field carries a hint saying what it decides and whether it can be changed later, because all of them can: this dialog is the only place in the app that asks about link resolution and the content strategy, and it asks *before* the user has seen either. The one thing that cannot be undone is writing into a folder that already holds something, so `createService` refuses that up front rather than letting `git clone` report a „destination path“ error that names no field.

**`Field` is a `<label>`, so it must not wrap a button.** A label forwards its own clicks to the first *labelable* descendant, and `<button>` is labelable: clicking the word "Design" in Settings selected the first segment and silently changed the theme — reproduced in the running app, not reasoned about. `FieldGroup` (same label styling, a `<div role="group" aria-label>`) is what a `SegmentedControl` or a row of buttons goes in; `Field` stays for one real form control. A `Field` holding a TextInput *plus* a "select folder" button is fine — the input comes first, so the label focuses the input, which is what a label is for.

**A switch is named by its label, and hiding the label is not the same as leaving it out (2026-09-02).** Four `Toggle`s sat in list rows whose name was printed by a sibling element - the plugin name in `Plugins/Installed`, an option key in its two option editors, a style setting's title in `Styles/StyleSettingsForm` - and passed `label=""`, which a screen reader announces as "switch, off" and nothing else. `Toggle` has `hideLabel` now: the label renders in a `sr-only` span inside the same `<label>` that names every other Toggle, so there is one naming mechanism rather than a visible label here and an `aria-label` there that could disagree, and `label` stays a required string so an empty one is visibly wrong at the call site. Verified against the production build with Playwright's spec-conformant accessible-name lookup: 48 of 48 switches on the plugin list answer to `getByRole('switch', { name: /aktiv/ })`, the hidden span measures 1×1px. The style-settings switch runs through the same prop and was not exercised in-app, since the test project has no community theme active.

**`SegmentedControl` is one radio group, not eleven buttons (U3, 2026-09-02).** Eleven call sites in nine files rendered a row of independent `<button>`s: no role, no `aria-checked`, no `type`, each one its own tab stop, and the selection encoded in nothing but a lighter background. It is a `role="radiogroup"` of `role="radio"` segments now, with a roving tabindex, `aria-checked` on each segment, `type="button"`, and Left/Right/Up/Down moving through the options — about thirty lines, no library. Three decisions inside that:

- **`radiogroup` everywhere, including the four sub-tab bars** (Konfiguration, Stile, Plugins, Layout), where `tablist` would be the stricter reading. A `tablist` is only half a contract without `aria-controls` pointing at a `role="tabpanel"`, and the panels here are conditional blocks that no call site gives an id — `ConfigEditor` even renders its bar inside `PageHeader`, several elements away from the panel it switches. "Choose one of N" is true at all eleven sites; one complete radiogroup beats a half-wired tablist plus a second mode every caller would have to pick correctly.
- **Arrow keys move the selection, not just the focus, and they wrap.** Measured rather than assumed: a native `<input type="radio">` group injected into the running production build answers ArrowRight by checking the next radio, and the third press on a group of three lands back on the first — so selection-follows-focus plus wrapping is what this very Chromium does two elements away on the same page. It is also `NSSegmentedControl`'s behaviour on macOS, and it matches what every call site already does on a mouse click: none of them defers, a click commits (Settings writes the theme, the sub-tabs navigate), so a focus-only arrow key would be the one input in the app needing a second keystroke. Wrapping earns its keep at the three call sites with exactly two options, where without it half the arrow presses would be dead keys.
- **Focus is moved before `onChange`, not after.** Four of the call sites navigate or remount a panel when the value changes. The target segment is already in the DOM and React keeps the node across the re-render (the key is the option value, not the index), so focusing it first and changing the value second survives the tabindex flipping underneath — verified by arrowing through the Konfiguration sub-tabs, where the focus stayed on the newly selected segment while the panel below was replaced.

`Math.max(0, findIndex(...))` picks the tabbable segment, so a value matching no option — a stale `?tab=` in the URL — still leaves the group reachable by keyboard while `aria-checked` stays false on every segment, which is the honest reading.

Verified in the production build under the Playwright driver, ten of the eleven call sites reached in the running app: Konfiguration, Stile, Plugins and Layout sub-tabs, both Frame-Builder controls (breakpoint, alignment), the Global board's breakpoint, Settings' theme, Vorlagen' translation scope, and Vorschau & Build's viewport (which needed a running dev server). Each reports one `radiogroup` with exactly one tabbable segment and exactly one `aria-checked="true"`; `Tab` from a focused segment leaves the group in a single press and `Shift+Tab` returns onto the *selected* one, not the last. Keyboard and mouse change the same state, not just the attribute: arrowing Settings' theme flipped `prefers-color-scheme` in the renderer through `nativeTheme`, arrowing the viewport control resized the preview frame to 820px, and arrowing the Konfiguration bar rewrote `?tab=` exactly as a click does — the Layout bar's sticky tab survived a round trip to another route unchanged. The eleventh, the import strategy in `Vorlagen`, only appears behind a native file dialog that blocks the driver; it passes the same three props as the others and has no path of its own. The one call site with a context worth checking is the translation scope, which sits inside a `<label>` row: arrow keys select there without toggling the row's checkbox, since a `<button>` answers Enter and Space, not arrows.


**Der Layout-Tab liegt jetzt auch in der URL (2026-09-02).** `LayoutEditor` war die eine Sub-Tab-Leiste, die ihren Tab nur in `useStickyState('layout.tab')` hielt, während Konfiguration, Stile und Plugins ihn über `goToTab` in `?tab=` schreiben — die Regel „URL zuerst, Sticky-State als Fallback“ galt dort nicht, und ein Deep-Link auf „Seitentypen“ oder „Eigene Frames“ war unmöglich. Es ist jetzt dasselbe Paar wie in `Styles`: `?tab=` ist die Wahrheit, der gemerkte Tab füllt genau die Lücke, die der Sidebar-`NavLink` hinterlässt (er trägt keinen Suchstring, also hieße jede Rückkehr aus einem anderen Bereich sonst wieder „Global“), und der Default-Tab löscht den Parameter statt ihn auf `global` zu setzen. Welcher *Seitentyp* offen ist, bleibt sticky-only: das ist ein Wert aus den Daten des Projekts, kein Name aus einer Dreierliste.

Der Übergabepunkt aus der Plugin-Liste („diesen Frame im Layout-Editor öffnen“) verliert damit eine seiner drei `primeStickyState`-Zeilen: der Tab reist als `?tab=frames` in der URL, nur das Frame-Objekt und sein Draft-Flag werden noch in den Store der Zielroute geschrieben, weil ein ganzes Frame nicht in einen Suchparameter passt. In der laufenden App geprüft: der Deep-Link öffnet die Frames-Leiste, die Rückkehr über die Sidebar ohne Suchstring behält den zuletzt gewählten Tab, Pfeiltasten schreiben den Parameter genauso wie ein Klick, und der Übergabepunkt landet auf `?tab=frames` mit dem Frame bereits im Builder.

**Und eine Radiogruppe wird durch ihren Namen benannt, nicht durch das, was zufällig darüber steht (2026-09-02).** Aus `SegmentedControl` eine `radiogroup` zu machen, hat ein zweites Loch aufgedeckt: neun der elf Gruppen trugen gar keinen zugänglichen Namen, also wurden sie als „Optionsfeldgruppe“ angesagt und sonst nichts — dasselbe, was `Toggle` vor U2 mit `label=""` tat, nur eine Ebene höher. `label` ist deshalb ein **Pflicht**-Prop, aus demselben Grund wie bei `Toggle`: optional hätte geheißen, dass genau die neun Stellen ohne sichtbare Überschrift namenlos geblieben wären.

Es wird `aria-label` und nicht Toggles `sr-only`-Span: eine Gruppe wird per `aria-label`/`aria-labelledby` benannt, es gibt kein `<label>`-Element, das eine Gruppe umschließen kann wie eines einen Switch, und die Segmente tragen sichtbaren Text — das übliche Argument für einen echten Textknoten trägt hier also nicht. An den zwei Stellen, die in einer `FieldGroup` sitzen (Settings/Design, Frame-Ausrichtung), steht der Name jetzt auf beiden Ebenen: „Design, Gruppe“, darin „Design, Optionsfeldgruppe“. Das ist redundant, nicht falsch, und die Alternative — `FieldGroup` reicht eine ID an das durch, was sie umschließt — wäre eine Verdrahtung zwischen zwei Primitives für zwei Aufrufstellen.

Die Namen selbst: die vier Sub-Tab-Leisten teilen sich `common.viewSwitcher` („Ansicht“), weil pro Seite genau eine existiert und der Seitenname schon in der `<h1>` steht. Nicht „Bereich“ — das heißt im Layout-Editor ein Frame-Bereich, und ein Wort hat einen Namen. Drei Stellen benutzen den Text weiter, der ohnehin über ihnen steht (`settings.appearance.theme`, `layoutEditor.frameBuilder.align`, `templates.strategyHeading`); die restlichen vier bekamen neue Schlüssel in beiden Sprachdateien (`buildServer.viewport.label`, `layoutEditor.frameBuilder.breakpointLabel`, `templates.scopeLabel`), Parität geprüft: 1199 Schlüssel auf beiden Seiten.

Geprüft nicht über die Attribute im DOM, sondern über Playwrights `getByRole`, das den accname-Algorithmus umsetzt: zehn der elf Gruppen antworten in der laufenden Produktions-App auf `getByRole('radiogroup', { name, exact: true })` mit genau einem Treffer, und jede davon auf `getByRole('radio', { checked: true })` mit genau einem — Settings/Design, die vier Sub-Tab-Leisten, beide Breakpoint-Leisten, die Frame-Ausrichtung, der Übersetzungsumfang in `Vorlagen` und die Vorschaubreite in Vorschau & Build (die wieder einen laufenden Dev-Server brauchte). Die elfte, die Import-Strategie, liegt weiter hinter dem nativen Dateidialog.
## Was von selbst erscheint, muss gesagt werden (A4, 2026-09-03)

Vor diesem Durchgang gab es im ganzen Renderer kein `aria-live` und kein `role="log"` — per grep,
null Fundstellen. Sichtbar war das nicht, hörbar schon: „Gespeichert.“ erscheint neben dem Knopf,
ohne dass jemand hinsieht, und für einen Screenreader passierte nach dem Speichern nichts.

**Der Statusplatz gehört in den `PageHeader`, nicht in `actions`.** `PageHeader` hat jetzt eine
eigene `status`-Eigenschaft neben `actions`, gerendert als `role="status"` (das ist
`aria-live="polite"` plus `aria-atomic`, also die ganze Zeile statt der Differenz). Die Trennung hat
einen technischen Grund: eine Live-Region muss im Dokument stehen, *bevor* ihr Text ankommt — eine,
die zusammen mit ihrem Inhalt erscheint, sagt niemand an. Deshalb ist die Unterscheidung
`undefined` gegen `null` bedeutungstragend: eine Seite ohne Statusmeldung lässt die Eigenschaft weg
und bekommt keine Region, eine Seite mit Speichern übergibt `null` und bekommt die leere. Umgestellt
sind die drei Seiten, die ein ganzes Dokument hinter einem Speichern-Knopf halten (Konfiguration,
Layout, Stile), die Einstellungen (die keinen `PageHeader` haben und die Region deshalb selbst
tragen) und die drei Kopier-Bestätigungen (CSS-Seitenleiste, Eigenes CSS, die URL in Vorschau &
Build — dort war das Häkchen das einzige Zeichen, und ein Häkchen ist kein Wort; die Region ist
`sr-only`). Der Unsaved-Badge und der Knopf bleiben außerhalb: sie ändern sich, weil der Nutzer
tippt, nicht von selbst.

**`role="log"` an beiden Konsolen, und die Konsole ist jetzt ein Element statt zweier.** `LogConsole`
kehrte im Leerzustand früh zurück und rendert seither ein anderes Element als im gefüllten — genau
der Fall, den eine Live-Region nicht überlebt. Jetzt ist es dasselbe `<div>` mit zwei Klassensätzen,
sodass die Region schon steht, wenn die erste Zeile kommt; `role="log"` ist die anfügende
Schwester von `role="status"` (neue Zeilen werden gelesen, die alten nicht noch einmal). Dazu
`tabIndex={0}`, weil ein scrollender Kasten ohne das mit der Tastatur nicht erreichbar ist, und ein
`aria-label` pro Konsole — auf Vorschau & Build stehen zwei, und „Konsole“ zweimal sagt nicht, wer
gerade spricht. Die gemessene Höhe des Leerzustands (32px, eine Zeile statt 288px) bleibt.

**Eine Seite, eine `<h1>`.** Der Projektname in der Seitenleiste war die zweite; er ist jetzt ein
`<p>` mit derselben Optik. Die `<nav>` der Seitenleiste heißt „Projektbereiche“. Im laufenden
Produktions-Build geprüft: eine `<h1>` pro Projektseite, die Region leer beim Aufbau und mit
„Gespeichert.“ nach einem Klick auf Speichern, beide Konsolen mit Label und `tabIndex`, und die
Konfiguration danach byte-gleich.

**Offen bleibt** die Zeilenmeldung in der Plugin-Liste (`pluginsInstalled.savedFlash`): eine
Live-Region pro Zeile hieße hier achtundvierzig, und die richtige Lösung ist eine Region für die
Seite, in die eine Zeile hineinschreibt — dieselbe Bauform, die auch die englischen dnd-kit-Ansagen
bräuchten.

## Cmd+S (A2, 2026-09-03)

Drei Seiten halten ein ganzes Dokument hinter einem Speichern-Knopf — Konfiguration, Layout, Stile —
und der Knopf war die einzige Art, es loszuwerden. Cmd+S tat nichts, nicht einmal hörbar nichts.

**Der Weg ist derselbe wie bei `app:navigate`, nur andersherum gedacht.** Ein zweiter Kanal
`app:command` trägt eine `AppCommand`-Union (heute genau `'save'`) vom Menü zum Renderer; `App.tsx`
hört einmal für die Lebensdauer der App darauf, wie schon beim Navigieren. Der Unterschied zum
Navigieren ist, *wer* antwortet: nicht der Router, sondern die gerade gemountete Seite. Deren Antwort
steht in `state/saveCommand.ts` — eine Modulvariable, aus demselben Grund wie das Flag in
`unsavedGuard`: es ist immer nur eine Route gemountet, also gibt es immer nur eine Antwort. Der
Handler wird über ein Ref gelesen, nicht beim Mount eingefroren; sonst schriebe Cmd+S das Dokument in
dem Zustand, den es beim Betreten der Seite hatte.

**Der Menüpunkt bleibt aktiv, auch wenn nichts zu speichern ist.** Ihn auszugrauen hieße, dem
Hauptprozess jeden Mount und jeden Tastendruck zu melden. Stattdessen registriert eine Seite ihr
Speichern nur, solange der Knopf daneben auch etwas täte: keine Änderungen, ein laufender
Speichervorgang oder ein Sub-Tab, der woanders speichert (`Frames`, die beiden Nicht-Site-Tabs der
Konfiguration), heißt `null` — und ein Kommando ohne Registrierung tut nichts. Das ist die ehrlichere
Hälfte: Cmd+S auf einem unveränderten Dokument würde sonst die Datei neu schreiben und den
Dev-Server zu einem Rebuild bringen.

**Gemessen im Produktions-Build, über den Hauptprozess statt über die Tastatur.** Ein echter
Cmd+S-Tastendruck landet unter Playwright nicht (siehe `run-desktop`), der Menüpunkt selbst schon:
`Menu.getApplicationMenu()` zeigt „Speichern“ mit `CmdOrCtrl+S` im Datei-Menü, und sein
Click-Handler ist genau der, den das Betriebssystem auslösen würde. Damit geprüft: auf Konfiguration
mit geänderter Eingabe schreibt er `pageTitle` in die Datei und die Statusregion sagt „Gespeichert.“;
auf Stile schreibt derselbe Punkt die Schriftart (der Weg über `saveRef`, also ein anderer als bei
Konfiguration); auf einer sauberen Seite und auf Plugins bleibt die Datei unangetastet — gleiche
mtime, keine Fehler. **Nicht am Betriebssystem gemessen** ist damit nur die Tastenkombination selbst;
dass Electron sie an genau diesen Punkt bindet, sagt das `accelerator`-Feld.

Der Treiber hat dafür einen neuen Befehl bekommen (`mainfile`, `electronApplication.evaluate`) — bis
dahin konnte die Skill nur im Renderer auswerten, und das native Menü liegt nicht dort.

## Eine Live-Region für die Seite, und ein Drag, der spricht (2026-09-03)

Die zwei Punkte, die der A4- und der `@dnd-kit`-Durchgang liegen gelassen hatten, gehören zusammen:
beide brauchen eine Stelle, an der etwas gesagt werden kann, das an keinem festen Platz steht.

**`state/announcer.tsx` ist diese Stelle.** Eine `sr-only`-Region, einmal in `App.tsx` gemountet,
und ein `announce(text)` mit Modul-Abonnenten — dieselbe Bauform wie der Sticky-Store und das
Unsaved-Flag, aus demselben Grund: der Schreiber sitzt tief in einer Seite, der Leser ist ein
einzelnes Element ganz oben, und ein Provider dazwischen brächte nichts. Zwei Feinheiten stecken
drin. Erstens wird der Text vor dem Setzen geleert: dieselbe Meldung zweimal hintereinander ist im
DOM keine Änderung und damit nichts zum Ansagen — genau der Fall „zweimal nach oben“. Zweitens
räumt sich die Region nach fünf Sekunden selbst leer, damit niemand später beim Durchgehen der
Seite auf einen alten Satz stößt.

Was hineinschreibt: die Zeilenmeldung der Plugin-Liste („Einstellungen von darkmode gespeichert.“
statt eines grünen Wortes an einer von achtundvierzig Zeilen) und das Ergebnis jedes Umsortierens
(„explorer ist jetzt an Position 2 von 5.“) — letzteres in `reorderGroup`, also für alle drei Wege
zugleich: Maus-Drag, Tastatur-Drag und die zwei Pfeile.

**Die Drag-Ansagen sind jetzt Deutsch und nennen Namen.** dnd-kit bringt eigene mit, sie sind
Englisch und sprechen von Roh-IDs („Draggable item 37 was moved over droppable area 42“) — hier
Indizes in `config.plugins`. `utils/dndAnnouncements.ts` liefert stattdessen dieselben fünf Sätze
aus `de.ts`/`en.ts`, samt der Tastatur-Anleitung, die dnd-kit per `aria-describedby` an jeden Griff
hängt. Wie eine ID zu einem Namen wird, weiß nur die Aufrufstelle, also gibt sie ein `describe`
mit: die Plugin-Liste eine Map, das Board eine Funktion, die Palette, Ablagezone, Position und
Config-Index auseinanderhält. Dabei gemessen und korrigiert: eine Paletten-ID trägt den *Index* des
Plugins, das sie dupliziert, nicht seinen Namen — ohne die Auflösung sagte das Board „4 liegt über
spacer“.

Eine Regel ist beim Messen entstanden: `onDragOver` schweigt, wenn das Ziel der aufgenommene
Eintrag selbst ist. dnd-kit meldet den eigenen Platz als erstes Ziel, und die Ansage überschrieb das
„aufgenommen“, das gerade herausgegangen war — im laufenden Programm sichtbar, weil die
Aufnahme-Meldung nie stehen blieb.

Geprüft im Produktions-Build gegen `gui-test`: Aufnehmen, Pfeiltaste, Ablegen ergibt „reader-mode
aufgenommen.“ → „reader-mode liegt über darkmode.“ → „reader-mode bei darkmode abgelegt.“ und
danach „reader-mode ist jetzt an Position 3 von 5.“; ein Pfeil-Knopf ergibt denselben letzten Satz
allein; eine Option zu ändern ergibt „Einstellungen von darkmode gespeichert.“ neben dem sichtbaren
Grün. Im Layout-Editor tragen alle 34 Griffe die deutsche Anleitung, und eine Aufnahme mit Abbruch
sagt „table-of-contents abgebrochen, nichts verschoben.“ Konfiguration danach wiederhergestellt.

## Der Log-Puffer überlebt das Fenster (E4, 2026-09-03)

Der Log-Store lebt im Renderer und stirbt mit dem Fenster — unter macOS schließt ein Fenster aber
nicht die App: die Dev-Server laufen weiter (`before-quit` beendet sie, nicht `window-all-closed`),
und das nächste Fenster bekommt einen frischen Renderer mit leerem Store. Was der Server in der
Zwischenzeit sagte, war weg, und was er davor gesagt hatte, auch.

Der Hauptprozess puffert die Zeilen jetzt selbst (`services/logBuffer.ts`), an genau der Stelle, an
der er sie ohnehin sendet: erst in den Puffer, dann per `broadcast`. Zwei Kanäle mit Objekt-Argument
(`logs:history`, `logs:clear`) geben sie wieder heraus. Gelesen wird einmal pro Projekt in
`ProjectLayout` — nicht auf Vorschau & Build, weil derselbe Store auch die Übersicht speist und ein
Projekt einmal geöffnet wird, während seine Seiten kommen und gehen.

Zwei Details, die dranhängen. Beim Einspielen werden Zeilen, die das Live-Abo schon geliefert hat,
behalten, wenn sie neuer sind als die letzte gepufferte (`mergeHistory`, Vergleich über den
ISO-Zeitstempel): die Lücke zwischen Anfrage und Antwort ist klein, aber nicht null, und eine darin
verlorene Zeile wäre genau der Fehler, den das Einspielen beheben soll. Und „Ausgabe leeren“ leert
jetzt beides — sonst käme die Ausgabe beim nächsten Öffnen der Seite zurück.

Gemessen im Produktions-Build gegen `gui-test`: ein einmaliger Build erzeugt sieben Zeilen; nach
`location.reload()` — ein neuer Renderer bei laufendem Hauptprozess, also dasselbe wie ein
geschlossenes und wieder geöffnetes Fenster — stehen dieselben sieben Zeilen wieder da, mit
identischem Ende. Nach „Ausgabe leeren“ und einem weiteren Reload bleiben beide Konsolen leer.

Aus demselben Befund: der `console.error` in `will-navigate` war deutsch und ist jetzt englisch, wie
jede andere Meldung im Hauptprozess, die einen Fehler und keine Eingabe beschreibt.

## Drei Antworten im Bestätigungsdialog (2026-09-03)

Der Befund stand seit dem Doku-Durchgang offen, mit der ausdrücklichen Notiz „nicht jetzt
entscheiden“ — offen war, ob der bestehende Kanal einen dritten Knopf bekommt oder ein zweiter
danebengestellt wird. Entschieden für den bestehenden: die Regel in `CLAUDE.md` sagt, dass es keinen
neuen Kanal für etwas gibt, das ein bestehender mit einem Feld kann, und `showMessageBox` kann drei
Knöpfe ohnehin.

`ConfirmDialogOptions` hat jetzt ein optionales `altLabel`, und der Kanal antwortet mit
`'cancel' | 'alt' | 'confirm'` statt mit einem Boolean. Im Renderer bleibt `confirmDialog()` bei
seiner Ja/Nein-Signatur — achtzehn Aufrufstellen stellen eine Ja/Nein-Frage, und für die ist ein
Boolean die ehrliche Form; die dritte Antwort holt sich `askDialog()`. Die sichere Antwort sitzt
weiter in `buttons[0]` mit `cancelId: 0`, der dritte Knopf kommt in die Mitte, damit der bestätigende
seinen Platz am Ende behält.

Gebraucht wird das vom Unsaved-Guard, und der konnte es erst jetzt: „Speichern“ als Antwort setzt
voraus, dass jemand weiß, wie diese Seite speichert — das ist das Register aus dem Cmd+S-Durchgang.
Der Guard fragt `hasSaveCommand()` und stellt danach seine Frage: mit Speichern-Knopf lautet sie „Was
soll damit geschehen?“, ohne ihn bleibt es beim alten „Trotzdem wechseln?“. Zwei Antworten sind kein
toter Zweig: die Konfiguration meldet ungespeicherte Änderungen auch auf den Tabs, die nicht über
ihren Speichern-Knopf gehen, und registriert dort nichts.

Die drei Dokumentseiten geben aus ihrem `save()` jetzt zurück, ob es geklappt hat. Sie fangen ihre
Fehler selbst und schreiben sie in den `PageHeader`, also sagt ein `await` allein nichts — und nach
einem gescheiterten Speichern wegzunavigieren, hieße genau die Änderungen zu verlieren, die der
Nutzer gerade retten wollte. Bei `false` bleibt der Guard auf der Seite, wo die Meldung steht.

Gemessen im Produktions-Build, mit einem im Hauptprozess ersetzten `dialog.showMessageBox` (der echte
Dialog blockiert Playwright; die Ersatzfunktion notiert ihre Optionen und antwortet auf Kommando):
Die Knopfreihe ist `['Abbrechen', 'Speichern', 'Änderungen verwerfen']` mit `cancelId: 0`. Antwort 0
bleibt auf der Seite und lässt die Datei, wie sie war; Antwort 1 schreibt die Datei *und* wechselt;
Antwort 2 wechselt und lässt die Datei, wie sie war. **Nicht am Betriebssystem gemessen** ist, in
welcher Reihenfolge macOS die drei Knöpfe zeichnet und was die Eingabetaste dort trifft — dafür
müsste jemand den Dialog von Hand bedienen.

## `useIpcQuery`, und wo ein Abbruch-Guard wirklich fehlt (S1, 2026-09-03)

Der Befund zählte 20 von 32 API-Effekten ohne Abbruch-Guard. Beim Durchsehen ist die Zahl weniger
interessant als die Frage, welche davon überhaupt in eine falsche Reihenfolge geraten *können*: Ein
Effekt mit leerer Abhängigkeitsliste läuft einmal, und wenn sich der Schlüssel nur beim Wechsel des
Projekts ändert, wird die Route ohnehin neu gemountet. Übrig bleiben die Stellen, deren Schlüssel der
Nutzer per Klick ändert, während die Antwort noch unterwegs ist — und die liegen alle auf der
Community-Themes-Seite: die Detailansicht eines Themes (ein GitHub-Aufruf pro geöffnetem Eintrag) und
die zwei Lesevorgänge zum aktiven Theme.

`state/useIpcQuery.ts` ist der Hook: `{ data, loading, error, reload }`, die Anfrage über ein Ref
(damit der Aufrufer wie bei `useEffect` die Abhängigkeiten bestimmt und nicht die Identität der
Funktion), und im Cleanup ein `cancelled`-Flag. Kein Abbruch im Wortsinn — der Hauptprozess macht
fertig, worum er gebeten wurde; die Antwort auf eine Frage, die niemand mehr stellt, landet nur nicht
mehr im Zustand.

**Gemessen, indem die falsche Reihenfolge erzwungen wurde.** Der Katalog wird in Main
fünfzehn Minuten lang zwischengespeichert, also kommen im Alltag beide Antworten sofort und die
Verwechslung ist nicht zu sehen. Also wurde der Detail-Handler im Hauptprozess ersetzt: „origami“
antwortet nach 2,5 Sekunden, jedes andere Theme nach 100 ms. Ablauf: origami öffnen, nach 300 ms auf
kakano wechseln. Ergebnis: nach dem Wechsel steht `Modi: FAST-kakano` da — und drei Sekunden später,
als origamis späte Antwort eintrifft, steht es immer noch da. Ohne den Guard hätte sie gewonnen.

Der Rest bleibt, wie er ist: ein Hook, den man überall einzieht, wo er nichts ändert, ist ein Umbau
ohne Messung. Neue Seiten nehmen ihn, bestehende beim Anfassen — und die Regel, woran man erkennt,
dass er nötig ist, steht jetzt oben in diesem Abschnitt.

**Ein Fehler, der von selbst erscheint, gehört in eine Region, die schon da ist (2026-09-05).** Drei
Texte tauchten nach einem Klick ohne Live-Region auf: die Meldung des Duplizieren-Dialogs, die des
Anlege-Assistenten und der Relocate-Fehler in einer Projektzeile. Die Region muss *vor* ihrem Text im
Dokument stehen, die Meldung zusammen mit ihr zu mounten hätte also nichts geholfen. Alle drei werden
jetzt leer gerendert und bleiben, so wie der `status`-Platz des `PageHeader`, mit `role="alert"` für
das bestimmte Vorlesen, das ein Fehler verdient; ein leeres `<p>` ist nullhoch und kostet nur den
Flex-Abstand daneben. `empty:hidden` bewusst nicht — das nähme die Region wieder aus dem Baum.
Gemessen an der gebauten App: dasselbe Element ist vor dem Klick leer und nullhoch und trägt danach
den Text. `npm run smoke` musste dieselbe Unterscheidung lernen: es zählte jedes `[role=alert]` als
gezeigten Fehler-Toast und meldete zehn leere; es überspringt jetzt leere Regionen, denn seine Frage
ist, ob ein Fehler *sichtbar* ist.


**Laufende Server auf diesem Rechner, nicht nur die eigenen (2026-09-06).** Bis hierher wusste die
App nur von Servern, die sie selbst gestartet hatte: `buildService` merkt sich die PIDs in
`running-servers.json`, und die Waisen-Frage beim Start liest genau diese Liste. Ein Server, den
jemand im Terminal gestartet hat, kam darin nicht vor — er hielt Port 8080, das Starten in der App
scheiterte, und nichts in der App konnte sagen, wem der Port gehört. Der Fall ist am 2026-09-06
aufgetreten und war von innen nicht zu beantworten.

Gemessen wurde erst, was von außen überhaupt sichtbar ist. Ein Server, gestartet wie ein Nutzer ihn
startet (`npx quartz build --serve --port 8099 --wsPort 3099`), steht als zwei Prozesse in der
Tabelle:

    12877     1  npm exec quartz build --serve --port 8099 --wsPort 3099
    12893 12877  node --no-deprecation …/.bin/quartz build --serve --port 8099 --wsPort 3099

Beide tragen `quartz` **und** `--serve`, und beide tragen die Portnummern in ihren Argumenten. Damit
kommen die Ports aus der Kommandozeile statt aus einer Socket-Tabelle — der einzige unportable Teil
entfällt. `lsof` bleibt für genau eine Sache: das Arbeitsverzeichnis (`lsof -a -p <pid> -d cwd -Fn`
lieferte `/Users/boxi/Documents/Example`), unter Linux dafür `/proc/<pid>/cwd`. Das Verzeichnis ist,
was einen gefundenen Server einem Projekt zuordnet, und deshalb steht in der Zeile ein Projektname
statt einer PID. Zur Gegenprobe von außen antwortet der Port mit
`<meta name="generator" content="Quartz"/>` und dem Sitenamen im `<title>` — das bestätigt, es
entscheidet nicht: ein statisch ausgelieferter Quartz-Bau sieht genauso aus.

Drei Dinge, die die Messung erzwungen hat:

- **`--serve` als ganzes Wort.** `appleeventsd --server` steht in jeder macOS-Prozesstabelle und
  passte auf eine Teilzeichenkette. Beide Nadeln zusammen, denn `quartz` allein trifft jeden Pfad
  unterhalb eines Ordners namens Quartz — dieses Repo eingeschlossen.
- **Ein Eintrag pro Server, nicht pro Prozess.** Die zwei Zeilen sind ein Server; zwei Zeilen in der
  Liste hätten zweimal dasselbe zum Beenden angeboten. Signalisiert wird der oberste Prozess der
  Gruppe, `tree-kill` nimmt das Kind mit — das Kind allein zu beenden ließe den npm-Wrapper stehen.
- **`etime` statt `lstart`.** Die Startzeit als formatiertes Datum hängt an der Sprache des Systems
  (`So.  6 Sep. 16:56:53 2026` auf diesem Rechner). Die verstrichene Zeit ist überall dieselbe
  Zahl.

Ein Server, den die App gestartet hat, sieht in der Tabelle anders aus als einer aus dem Terminal —
das Kind trägt den Pfad der Electron-Binärdatei statt eines node-Pfads —, aber dieselben zwei
Nadeln und dieselben Portargumente. Gemessen an der gebauten App mit beiden gleichzeitig:

    16118 15813  npm exec quartz build --serve --port 8080 --wsPort 3001
    16135 16118  …/QuartzControl.app/Contents/MacOS/Electron -r …/defaultapp.cjs … quartz build --serve --port 8080 …

Die Karte listete beide richtig einsortiert: `localhost:8099 · Außerhalb gestartet · Example` und
`localhost:8080 · Von dieser App · gui-test`. Das Beenden des fremden ließ beide seiner Prozesse
verschwinden und den Port frei; das Beenden des eigenen lief über `stopServer()` statt über ein
Signal, weshalb die Dev-Server-Karte darüber im selben Moment auf „Gestoppt" sprang — ein Signal an
`buildService` vorbei hätte sie „Läuft" zeigen lassen für einen Prozess, den es nicht mehr gibt.
Dritter Fall, mit `python3 -m http.server 8080` gemessen: „Port 8080 ist belegt, aber von keinem
erkennbaren Quartz-Server."

**Beendet wird nie von selbst.** Ein fremder Server gehört jemand anderem — einem Terminal, einem
zweiten Fenster, einer hart beendeten Sitzung —, und das steht als Hinweis unter der Liste und
noch einmal im Bestätigungsdialog, der die Herkunft benennt. Die PID wird vor dem Signal ein
zweites Mal geprüft: zwischen dem Scan, der die Liste gefüllt hat, und dem Klick kann die Nummer
längst jemand anderem gehören.

**Windows sagt „unbekannt", nicht „keiner".** Dort gibt es kein `ps`; `Win32_Process` beantwortet
dieselbe Frage, ist hier aber nicht messbar. Ein ungemessener Scan, der „keine gefunden" meldet,
wäre die schlechtere Antwort — dieselbe Unterscheidung wie beim Update-Check und beim SCSS-Check.

**Beim Beenden wird gefragt, was mit dem laufenden Server geschieht (2026-09-06).** `before-quit`
rief bis hierher `killAllServers()` ohne ein Wort — und widersprach damit der Haltung der App am
anderen Ende: die Waisen-Frage beim Start bietet ausdrücklich „Weiterlaufen lassen" an, weil ein
laufender Server Absicht sein kann. Seit ein weiterlaufender Server wieder sichtbar und beendbar
ist (die Karte oben, dazu die Frage beim Start), ist „weiterlaufen lassen" eine Entscheidung, die
sich zurücknehmen lässt — und erst das macht das Angebot ehrlich.

Drei Antworten, Abbrechen auf Platz 0 mit `cancelId: 0`, damit Escape *und* Return — das unter
macOS die erste Taste nimmt, was `defaultId` auch sagt — „nicht beenden" heißen. Die beiden
anderen beenden die App; ihre Beschriftung sagt, was aus den Servern wird. Gefragt wird
asynchron mit `preventDefault()`, nicht mit `showMessageBoxSync`: ein synchroner Dialog blockiert
den ganzen Hauptprozess, und alles, was diese App von außen fährt (der `run-desktop`-Treiber,
`npm run smoke`), schließt sie über `app.close()` und bliebe daran hängen.

Gemessen an der gebauten App, je mit laufendem Dev-Server auf 8080. Der Dialog selbst wurde im
Hauptprozess gespiegelt gelesen, weil Playwright ein natives Blatt nicht bedienen kann; **dass er
erscheint, ist trotzdem am OS gemessen** — zweimal, unfreiwillig, als der Spiegel an einem
`require` scheiterte und das echte Blatt aufging:

    buttons: ["Abbrechen", "Weiterlaufen lassen", "Server beenden"], cancelId: 0
    message: "Beim Beenden laufen noch Dev-Server."
    detail:  "gui-test — Port 8080\n\nWeiterlaufende Server bleiben im Browser erreichbar …"

- **Abbrechen:** Fenster bleibt, Server läuft weiter, nichts angefasst.
- **Weiterlaufen lassen:** App beendet, der Server antwortet danach weiter mit 200, und sein
  Eintrag bleibt in `running-servers.json` stehen. Der nächste Start findet ihn — nachgewiesen,
  weil genau dieser Waisen-Dialog beim folgenden `launch` aufging und Playwright ins Timeout
  laufen ließ.
- **Server beenden:** App beendet, beide Prozesse weg, Port zu.

Der Zustand liegt in einer Variablen (`quitDecision`), nicht in einem zweiten Aufruf von
`killAllServers()`: `app.quit()` löst `before-quit` ein zweites Mal aus, und ohne die Merkung
stünde dort dieselbe Frage noch einmal. Ein zweites Cmd+Q, während das Blatt offen ist, öffnet
kein zweites (`quitPromptOpen`), und ein Dialog, der nicht gezeigt werden kann, macht die App
nicht unbeendbar — dann gilt „beenden", was das bisherige Verhalten ist.

**Der Haken merkt sich die Antwort, nicht „nie fragen" (2026-09-06).** „Nicht mehr fragen" neben
„Weiterlaufen lassen" bedeutet etwas anderes als derselbe Haken neben „Server beenden"; ein
einzelnes Nie-fragen-Flag könnte nur eines von beiden heißen. Gespeichert wird deshalb die
*geklickte* Antwort (`Settings.serversOnQuit: 'ask' | 'stop' | 'keep'`), gelesen bei jedem
Beenden statt beim Start — sonst bräuchte das Zurückstellen einen Neustart. Bei Abbrechen wird
nichts gemerkt, denn nichts wurde entschieden. Geschrieben wird lesend-ändernd-schreibend:
`saveSettings` ersetzt die Datei, und das passiert hier während des Beendens; Design oder Sprache
an ein Häkchen zu verlieren wäre ein seltsames Andenken.

Der Weg zurück steht in den Einstellungen („Beim Beenden", dieselben drei Antworten ohne
Abbrechen) — **und das ist die Bedingung dafür, dass es den Haken überhaupt geben darf**: ein
Häkchen in einem Dialog, der nur noch erscheint, solange die Einstellung „fragen" sagt, kann sich
nicht selbst zurücknehmen. Gemessen: Haken plus „Server beenden" schrieb `serversOnQuit: "stop"`,
der nächste Lauf beendete ohne jede Frage, die Einstellungsseite zeigte „Beenden" ausgewählt, ein
Klick auf „Fragen" schrieb `"ask"` zurück, und der Dialog kam sofort wieder — ohne Neustart.

**Dabei kam ein Fehler heraus, den es schon vorher gab: das Töten wurde nie abgewartet.**
`before-quit` rief `killAllServers()` und ließ die App weiterlaufen ins Ende — aber `tree-kill`
läuft erst `ps`, um den Baum zu finden, und signalisiert danach. Gemessen mit stehender Antwort
„Server beenden": **die App war weg und der Dev-Server antwortete weiter mit 200 auf 8080.** Das
Rennen war in beide Richtungen zu gewinnen, deshalb sah es so lange gut aus. `killAllServers()`
gibt jetzt ein Promise zurück, das auf jeden `tree-kill`-Rückruf wartet, mit einer Frist von drei
Sekunden — ein Kill, der nie antwortet, darf die App nicht unbeendbar machen, und was die Frist
überlebt, ist eine verfolgte PID und damit die Waisen-Frage beim nächsten Start.

**36 Karten-Überschriften, drei Größen, drei Icons (2026-09-06).** Nachgezählt statt geschätzt:
`src/` hatte 36 `<h2>`, davon trugen **drei** ein Icon — die beiden Karten der Vorlagen-Seite und
`DiscoveredServers`, das am selben Tag dazukam. Die Größen liefen auseinander, ohne dass es je
jemand entschieden hätte: 22× `text-sm` (14px), 4× `text-heading` (15px), 7× ein nacktes
`font-medium`, was 16px bedeutet — Tailwinds Preflight setzt `<h2>` auf die Grundschriftgröße
zurück, also erbt es die 16px des `body`. (Die übrigen drei sind keine Karten-Überschriften: zwei
Micro-Labels der Übersicht und der Titel des `Modal`.) Innerhalb *einer* Seite standen damit zwei
Größen nebeneinander: „Dev-Server" und „Einmaliger Build" auf 16px, die Karten der Updates-Seite
auf 14. Umgestellt sind die 30, die eine Karte überschreiben.

`CardHeading` in `ui.tsx` ist jetzt die eine Form: `text-heading`, halbfett, Icon in `size={15}`
auf `text-text-secondary`. Die Größe ist nicht neu gewählt, sondern die, die
`tailwind.config.js` seit dem Größen-Durchgang für genau diese Rolle führt („A card's or a
section's own heading").

Zwei Entscheidungen dabei:

- **Das Icon ist schlicht, kein getöntes Quadrat.** `PageHeader` und der `Section` der
  Einstellungen setzen ihr Icon in eine 32–36px große, eingefärbte Fläche. Das ist richtig für
  etwas, das eine *Seite* benennt, und falsch für eine Karte: Eine Seite trägt bis zu sechs davon,
  und sechs farbige Quadrate übertönen die Überschrift der Seite selbst. Die Vorlagen-Seite hatte
  die schlichte Form schon; sie ist geblieben.
- **Welches Icon, ist nicht frei erfunden.** Wo eine Karte dasselbe meint wie ein Eintrag der
  Seitenleiste, nimmt sie dessen Icon aus `navConfig` — Plugins `Blocks`, Frames `LayoutGrid`,
  Wartung `Wrench`, Veröffentlichen `CloudUpload`. Das ist die Bildseite der Regel „ein Wort, ein
  Name": Wenn die Leiste Plugins mit einem Bild benennt, darf die Karte darüber kein zweites
  wählen.

Der `Section` der Einstellungen bleibt bewusst, wie er ist: Die Einstellungen haben keinen
`PageHeader`, ihre Abschnitte *sind* die Gliederung der Seite, und dort trägt das Quadrat.

Gemessen an der gebauten App auf fünf Seiten in beiden Schemata und mit `npm run smoke`
(38 Aufrufe): keine Karte bricht anders um, keine Überschrift kollidiert mit dem Knopf, der in
derselben Zeile sitzt.

**Ein Projekt umzubenennen zieht die Pfade nach, die in es hineinzeigen (2026-09-06).**
`projects.relocate` hängte den Eintrag um und behielt die ID — richtig — ließ aber jeden absoluten
Pfad stehen, den ein selbstgebautes Frame auf seinen eigenen Ordner hält: `source:` in
`quartz.config.yaml`, `source`/`resolved` in `quartz.lock.json` und den Symlink
`.quartz/plugins/<id>`. Nach einem Umbenennen zeigten alle drei auf einen Ordner, den es nicht mehr
gibt: **jedes Frame tot**, der nächste `quartz plugin add` mit `ENOENT` auf dem alten Pfad — und
der Layout-Editor listete die Frames unbeirrt weiter, weil er sie aus `.quartz-gui/authored-frames/`
liest und nie fragt, ob noch etwas dorthin zeigt (BEFUNDE 8).

Die Reparatur gab es schon, an der anderen Stelle, an der ein Projektordner unter seinen Pfaden
weggezogen wird: `repointIntoCopy` im Duplizieren. Sie heißt jetzt `repointProjectPaths()`
(`projectPaths.ts`) und wird von beiden benutzt — eine zweite Umsetzung derselben drei Schreibwege
wäre die schlechtere Antwort gewesen.

**Repariert wird vor dem Umhängen, nicht danach.** Der Eintrag in der Projektliste ist das billige,
umkehrbare Stück; die Reparatur auf der Platte ist das, was scheitern kann. Scheitert sie zuerst,
steht die App unverändert da und die Meldung erscheint an der Projektzeile — andernfalls zeigte ein
bereits umgehängter Eintrag auf ein halb repariertes Projekt. Ein Zielordner ohne
`quartz.config.yaml` ist kein Fehler, sondern nichts zu tun.

Vorher nachgemessen statt angenommen, was ein Projekt sonst noch auf sich selbst hält: nichts. Der
Snapshot-Store, die Content-Backups, die Presets und die Breakpoints unter `.quartz-gui/` enthalten
ihren eigenen Projektpfad nirgends.

Gemessen am Kontrollprojekt mit vier Frames: Ordner umbenannt (danach lösten alle vier Symlinks ins
Leere), über die App umgehängt, anschließend 0 alte Pfade und 4 + 8 neue, alle Links wieder heil,
`quartz build` grün mit 639 Dateien, und ein danach angelegtes Frame ließ sich registrieren.


---

## Der Dev-Server hing an einer Pipe zur App (2026-09-06, drittes Review)

Der Beenden-Dialog verspricht: „Weiterlaufende Server bleiben im Browser erreichbar und werden beim
nächsten Start wieder gefunden." Die Messung dahinter — der Server antwortet *unmittelbar* nach dem
Beenden noch mit 200 — stimmt und reicht nicht. Mit der App sterben die Leseenden seiner
stdout/stderr-Pipes, und beim nächsten Schreibversuch stirbt der Server; Quartz schreibt bei jedem
Rebuild.

Nachgestellt mit demselben Spawn (gleiche Argumente, gleiches `stdio`, kein `detached`) in einem
Wegwerf-Projekt, Elternprozess beendet sich, sobald der Port antwortet, dann eine Notiz angelegt und
wieder entfernt:

| `stdio` | nach Ende des Elternprozesses | nach zwei Rebuilds |
|---|---|---|
| `['ignore', 'pipe', 'pipe']` | 2 Prozesse, HTTP 200 | 0 Prozesse, keine Verbindung |
| `['ignore', fd, fd]` | 2 Prozesse, HTTP 200 | 2 Prozesse, HTTP 200 |

Die Kontrollen des Reviews nageln die Ursache fest: dieselben Pipes, 25 s untätig, überleben; und
derselbe Rebuild ohne Pipes überlebt. Es sind die Pipes, nicht die Zeit und nicht der Rebuild.

Die zweite Hälfte des Versprechens fiel gleich mit: Ein toter Prozess fällt beim nächsten Start aus
dem `isAlive`-Filter von `detectOrphanedServers()`, die Frage „Weiterlaufen lassen?" kam also gar
nicht erst. Und `serversOnQuit: 'keep'` macht die Wahl zur Dauereinstellung.

**Die Ausgabe geht deshalb in `.quartz-gui/logs/dev-server-<pid>.{out,err}.log`, und Main tailt die
zwei Dateien** in dasselbe `emitLog()`, das vorher am Pipe-Ereignis hing — die Zeilen leben ohnehin
in Main (`services/logBuffer.ts`), ein Tail ist dort zu Hause. Zwei Dateien statt einer, weil
`LogConsole` stderr rot färbt und eine gemeinsame Datei genau das verlöre. Kein `detached` — die
Messung oben *ist* der Fix, und eine eigene Prozessgruppe wäre eine Änderung an dem, was
`stopServer` und `killAllServers` ablaufen.

**Ein Name pro Lauf, und der Name ist die PID.** Zuerst hieß die Datei immer gleich und wurde bei
jedem Start abgeschnitten — „sie gehört zu diesem Lauf". Das vierte Review hat den Fall gefunden,
den dieser Fix selbst erst möglich macht: Nach „Weiterlaufen lassen" behält der alte Server seinen
Schreibdeskriptor, ohne `O_APPEND` und auf seinem alten Offset. Gemessen mit zwei Läufen im selben
Ordner (ein `npx`-Ersatz, der Zeilen mit seiner eigenen PID schreibt):

| | Dateien | Konsole des zweiten Laufs |
|---|---|---|
| fester Name | `dev-server.{out,err}.log` | Zeilen **beider** Läufe, 32 Nullbytes |
| Name pro Lauf | `dev-server-3882.*`, `dev-server-3907.*` | nur der eigene Lauf, keine Nullbytes |

Aufgeräumt wird beim Start, und zwar nach derselben Regel, mit der dieses Projekt jede PID
behandelt, die es aus einer Liste oder Datei zurückliest (`isAlive` *und* `looksLikeQuartzServer`,
weil das Betriebssystem Nummern wiederverwendet): Was ein noch lebender Server schreibt, bleibt
liegen, alles andere wird gelöscht — die alten festen Namen eingeschlossen, ein `tmp-`-Paar eines
Spawns, der es nie bis zur Umbenennung geschafft hat, ebenso. Gemessen: aus fünf vorbereiteten
Dateien bleiben nach einem Start die zwei des laufenden Servers und die eine, die nicht uns gehört.
Die PID gibt es erst, wenn `spawn()` zurückkehrt, deshalb werden die Dateien unter einem
`tmp-`-Namen geöffnet und danach umbenannt; ein Umbenennen ändert auf POSIX an keinem der offenen
Deskriptoren etwas, und die Tails starten erst danach, weil ein Tail einem Pfad folgt.

Damit ist auch lesbar, was ein weitergelaufener Server geschrieben hat — mit festem Namen war das
nicht „später", sondern mit diesem Namen gar nicht zu haben.

Zwei Listen mussten das neue Verzeichnis lernen, beide durch Nachsehen gefunden statt durch Schaden:
`isSnapshotWorthy()` nimmt unter `.quartz-gui/` alles mit, was nicht ausdrücklich ausgeschlossen ist
— die Logdatei wäre in jeden Snapshot zwangs-hinzugefügt worden; `duplicateService` kopiert alles,
was nicht in `SKIP` steht. Gemessen an der gebauten App: ein Snapshot mit laufendem Server hält 363
Dateien, keine davon unter `.quartz-gui/logs`.

An der gebauten App außerdem gemessen: Starten, Neustarten, Stoppen, die Konsole füllt sich live
(die Anfragezeilen der Live-Vorschau laufen ein, während sie offen ist), Status „Läuft" → „Gestoppt",
kein Prozess bleibt übrig, die Logdatei nach einem Neustart frisch.

---

## Ein Snapshot bringt die alten Frame-Pfade zurück (2026-09-06, drittes Review)

Der Absatz oben sagt, vorher sei nachgemessen worden, was ein Projekt sonst noch auf sich selbst
hält: nichts. Gemessen wurde mit `grep` über `.quartz-gui/` — und der Snapshot-Store ist
`snapshots.git`, eine git-Objektdatenbank, in der `grep` nichts liest. Richtig gefragt, mit
`git grep` je Ref gegen den eigenen Projektpfad, nur `quartz.config.yaml` und `quartz.lock.json`:

| Projekt | Snapshots | mit eigenem Pfad in der Config | im Lockfile |
|---|---|---|---|
| `gui-test` | 8 | 8 von 8 | 6 von 8 |
| `Example` | 7 | 6 von 7 | 2 von 7 |

Das sind genau die drei Einträge, die `repointProjectPaths()` umschreibt, eingefroren im Moment der
Aufnahme, in einem Store, der mit dem Ordner mitzieht. Wer also ein Projekt umbenennt (die
Reparatur oben läuft), und danach irgendeinen älteren Snapshot zurückholt, hat die toten Pfade
wieder — während die Symlinks unter `.quartz/plugins/` heil bleiben, weil `/.quartz/` in keinem
Snapshot liegt. Jedes Frame tot, der nächste `quartz plugin add` mit ENOENT, und der Layout-Editor
listet die Frames weiter, weil er sie aus `.quartz-gui/authored-frames/` liest.

Nachgestellt gegen den echten `snapshotService` (esbuild-Bündel, unveränderter Code) an einem
Wegwerf-Projekt: Snapshot anlegen, Ordner umbenennen, Reparatur laufen lassen, Snapshot
zurückholen.

| nach dem Restore | config | lock.source | lock.resolved | symlink |
|---|---|---|---|---|
| vorher | alt | alt | alt | hier |
| nachher | hier | hier | hier | hier |

**Die Reparatur wird vom Muster getrieben, nicht von einem gemerkten Pfad.** Ein Frame liegt unter
`<projekt>/.quartz-gui/authored-frames/<id>` und sonst nirgends, also ist eine Quelle, die darauf
endet und woanders beginnt, die Quelle *dieses* Projekts — die ID ist die Identität, das Präfix
davor ist Rauschen. Das braucht nichts im Snapshot, wirkt auf Aufnahmen von vor heute und würde
auch ein per Finder kopiertes Projekt heilen (dort nicht angeschlossen, ein Befund pro Durchgang).
Umgeschrieben wird nur, wenn das Frame hier auch liegt; was die Reparatur nicht belegen kann, lässt
sie stehen. Gegenproben: ein von woanders installiertes Plugin bleibt unangetastet, ein Frame-Pfad,
dessen Frame hier fehlt, ebenso, und einer, dessen Frame hier liegt, wird herübergezogen.

Beide Reparaturen gehen jetzt durch eine Funktion (`rewriteRecordedPaths`) über dieselben drei
Schreibwege; verschieden ist die eine Regel, die beantwortet, was aus einem Pfad wird.
