# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Electron + React + TypeScript desktop GUI for managing [Quartz 5](https://quartz.jzhao.xyz/) (jackyzha0's static-site generator) projects: load/save `quartz.config.yaml`, install/configure plugins (official CLI wrapper + a GitHub-based marketplace), switch the `content/` folder between a real directory and a symlink (e.g. an Obsidian vault), run builds, and control the local dev server. Supports multiple Quartz projects/profiles.

## Commands

- `npm run dev` — start in dev mode (electron-vite dev server + Electron window)
- `npm run build` — production build to `out/` (main, preload, renderer)
- `npm run start` — preview a production build
- `npm run typecheck` — `tsc --noEmit` against both `tsconfig.node.json` (main/preload) and `tsconfig.web.json` (renderer); this is the only check currently wired up — there is no lint script and no test suite in this repo

If `npm install` leaves `node_modules/electron` half-installed (`electron-vite dev` fails with `Error: Electron uninstall`), the postinstall's `extract-zip` step may have silently produced a partial extraction in a sandboxed shell. Fix: `rm -rf node_modules/electron/dist node_modules/electron/path.txt`, then `unzip -q <cached zip under ~/Library/Caches/electron/...> -d node_modules/electron/dist` and write the platform binary path (e.g. `Electron.app/Contents/MacOS/Electron`) into `node_modules/electron/path.txt` with no trailing newline.

## Architecture

**Three-process Electron split**, wired together by `electron.vite.config.ts` (main/preload/renderer each get an explicit `build.rollupOptions.input` since the source lives under `electron/main`, `electron/preload`, `src/` rather than electron-vite's default `src/main`/`src/preload` convention):

- `electron/main/` — Node-side logic. `index.ts` creates the window and installs a native macOS menu; `ipc/handlers.ts` wires every `ipcMain.handle` to a service and forwards service events (`server:log`, `build:log`, `server:statusChanged`, `content:progress`) to all renderer windows; `services/*.ts` each own one concern (`projectStore`, `configService`, `pluginService`, `marketplaceService`, `buildService`, `syncService`, `backupService`, `contentService`, `createService`, `settingsService`) and are plain functions with no Electron-API dependencies beyond `app.getPath`/`dialog`, which keeps them runnable standalone (see below).
- `electron/preload/index.ts` — the only file allowed to import both `electron` and the app's shared types; implements `QuartzGuiApi` via `contextBridge.exposeInMainWorld('quartzGui', ...)`.
- `shared/ipc-contract.ts` — the single source of truth: every IPC channel name (`IPC.*` const), every payload/domain type (`Project`, `QuartzConfig`, `PluginEntry`, `ServerStatus`, ...), and the full `QuartzGuiApi` interface that preload implements and the renderer calls as `window.quartzGui.*`. Change a channel or a type here first; main and preload/renderer follow.
- `src/` — the renderer (React Router `HashRouter`). `App.tsx` declares routes; `routes/ProjectLayout.tsx` is the per-project shell (sidebar nav + drag region) and passes the current `Project` down via `Outlet context`, read in child routes with `useProject()`. `state/store.ts` (zustand) holds only cross-page state (project list, settings) — everything else (config being edited, server status, logs) is local `useState` in the page that owns it, fetched via `window.quartzGui.*` on mount and via the `onLog`/`onStatus`/`onProgress` subscriptions for live updates. `components/ui.tsx` has the shared primitives (`Button`, `Card`, `Field`, `TextInput`, `Select`, `Toggle`, `SegmentedControl`, `Badge`) — extend these rather than hand-rolling styled elements.

**Native macOS chrome**: `titleBarStyle: 'hiddenInset'` hides the OS title bar in favor of inset traffic lights over a custom header, so any full-width header/sidebar element that should be draggable needs the `.titlebar-drag` CSS class (defined in `src/index.css`), and any interactive control inside a drag region needs `.titlebar-no-drag` or it stops receiving clicks. In dev mode the app menu's first item shows "Electron" (that's the name of the unpackaged binary being run, not a bug) — it would use the packaged app's product name once built with an installer.

**Dark mode** is automatic via Tailwind's `darkMode: 'media'` — style new UI with `dark:` variants rather than a manual theme toggle.

### How the Quartz 5 CLI actually works (verified by hand, not just from docs — get this wrong and every service breaks silently)

- `quartz` is **not published to npm** — its own `package.json` is `"private": true`. The npm registry's `quartz` package is an unrelated tool. There is no `npx quartz@latest` from an arbitrary directory; a version suffix forces npx to hit the registry and fails.
- The only working setup is: clone `https://github.com/jackyzha0/quartz.git`, then `npm install` inside it — this populates `node_modules/.bin/quartz`. From then on, plain `npx quartz <subcommand>` (no version suffix, `cwd` set to that project) resolves the local binary. Every service that shells out (`buildService`, `pluginService`, `syncService`) does exactly this.
- `createService.createProject()` is the only place that bootstraps a *new* project: clone → `git remote remove origin` (so a later Git-Sync push can never target upstream `jackyzha0/quartz`) → `npm install` → `npx quartz create -t/-X/-l ...` run with `cwd` inside the clone. There's no CLI flag to scaffold a project at an arbitrary path in one shot; `-d/--directory` on every subcommand means "content directory" (default `content`), not a project-root selector.
- `quartz create`'s `-l/--links` is unconditionally required; if omitted (and every other flag can hit the same failure mode) the wizard prompts interactively. All spawned `quartz`/`git`/`npm` processes in this repo use `stdio: ['ignore', 'pipe', 'pipe']` so an unanswered prompt fails fast — but that makes the CLI **exit 0 without writing `quartz.config.yaml`**, so `createService` explicitly checks the file exists on disk before reporting success rather than trusting the exit code.
- `quartz sync`'s `--push`/`--pull` are booleans that **both default to `true`** — `syncService` selects a single direction by negating the other (`--no-pull` for push-only), not by passing only the one wanted.
- On disk, `quartz.config.yaml` nests `theme` *inside* `configuration` (not a sibling top-level key), and plugin entries in the `plugins:` array can carry extra keys beyond `source`/`enabled`/`order`/`options` — notably `layout` (position/priority/group/...) on roughly half the built-in plugins. `configService` reads/writes plugin entries by spreading the raw object rather than picking known fields, specifically so those extra keys round-trip through a save instead of being silently deleted. If you touch `configService.ts`, preserve that spread — re-verify against a real cloned+installed Quartz project (not just the docs) if you change how config or plugin entries are read or written.
