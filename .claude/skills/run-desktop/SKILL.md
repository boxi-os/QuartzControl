---
name: run-desktop
description: Build, run, and drive the QuartzControl Electron desktop app for real UI verification (not just typecheck/build). Use when asked to start the desktop app, screenshot it, or click through a UI change to confirm it actually works.
---

QuartzControl is an Electron + React (HashRouter) desktop app, built with electron-vite.
For agent/automated use, drive it via the Playwright `_electron` REPL at
`.claude/skills/run-desktop/driver.mjs`. macOS only (this repo has no Linux/xvfb setup) — launch
is fast (~2-3s) since there's no headless display layer to bring up.

All paths below are relative to the repo root.

## Prerequisites

```bash
npm install                # includes playwright-core (devDependency)
which tmux || brew install tmux   # only needed for the agent/tmux workflow below
```

## Build

```bash
npm run build   # electron-vite build - produces out/main, out/preload, out/renderer
```

The driver launches this **production build**, not `npm run dev`. `electron/main/index.ts` only
tries a dev-server URL when `ELECTRON_RENDERER_URL` is set, which the driver deliberately leaves
unset — so `out/renderer/index.html` loads directly. Re-run `npm run build` after any renderer/main
change before driving it; the driver does not build for you.

## Run (agent path)

```bash
node .claude/skills/run-desktop/driver.mjs
```

Wrap in tmux so you can send commands and read output across multiple tool calls without blocking:

```bash
tmux new-session -d -s app -x 200 -y 50
tmux send-keys -t app 'node .claude/skills/run-desktop/driver.mjs' Enter
# poll (macOS has no `timeout` command - use a manual loop):
i=0; while [ $i -lt 20 ]; do tmux capture-pane -t app -p | tail -1 | grep -q "driver>" && break; sleep 0.5; i=$((i+1)); done

tmux send-keys -t app 'launch' Enter
i=0; while [ $i -lt 40 ]; do tmux capture-pane -t app -p | tail -3 | grep -qE "launched\.|ERROR|WARNING" && break; sleep 1; i=$((i+1)); done

# jump straight into a project + page instead of clicking through Home.tsx:
tmux send-keys -t app 'goto /project/<project-id>/themes' Enter
sleep 3   # this app's async data (npm search, GitHub API) can take several seconds - see Gotchas
tmux send-keys -t app 'ss 01-themes' Enter
tmux capture-pane -t app -p
```

Find a registered project's id in `~/Library/Application Support/QuartzControl/projects.json`.

Screenshots land in `/tmp/shots/` (override: `SCREENSHOT_DIR`). **Always actually open the
screenshot file and look at it** — a command succeeding doesn't mean the UI looks right.

### Commands

| command | what it does |
|---|---|
| `launch` | launch the app (production build), wait for `#root` to render |
| `ss [name]` | screenshot → `/tmp/shots/<name>.png` |
| `goto <hashPath>` | navigate the HashRouter directly, e.g. `goto /project/<id>/config` |
| `click <css-sel>` | click element via DOM `.click()`, not coordinates |
| `click-text <text>` | click the button/link/`[role=button]` whose text matches (exact, then substring) |
| `fill <css-sel> <text>` | set an input's value via the native setter + `input` event, then verify via a fresh query |
| `type <text>` / `press <key>` | real OS-level keyboard input (see Gotchas — often doesn't land) |
| `wait <css-sel>` | wait for element, 10s timeout |
| `eval <js>` | evaluate arbitrary JS in the page, print JSON — your escape hatch when a command doesn't fit |
| `text [css-sel]` | print `innerText` |
| `windows` | list all windows + webContents |
| `quit` | close the app **and exit the driver process** (see Gotchas) |

## Run (human path)

```bash
npm run dev   # electron-vite dev - opens a real window, hot reload
```

## Gotchas

- **`type`/`press` (`page.keyboard.*`) frequently no-op.** This app's window doesn't reliably hold
  OS-level keyboard focus under Playwright's `_electron`, so real keystrokes can silently go
  nowhere even right after a successful `click`. Always verify a `fill`/`type` landed by reading
  the field back (`eval document.querySelector('input').value`) rather than trusting the command
  output — and prefer `fill` over `type` for text inputs; it doesn't depend on OS focus at all.

- **Plain `el.value = x` doesn't work on this app's React inputs either.** React's controlled-input
  value tracking hooks the native property setter, so a naive assignment is invisible to it. The
  `fill` command uses `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set`
  plus a dispatched `input` event — that's the one combination that reliably updates React state
  here. If you need this for an element `fill` doesn't cover, replicate that exact pattern via `eval`.

- **`click-text`/`goto` arguments: don't wrap them in extra quotes when sending via `tmux
  send-keys`.** The REPL just does `line.split(/\s+/)` — it has no shell-style quote parsing. `tmux
  send-keys -t app "click-text 'Installieren & aktivieren'"` sends the single quotes through
  *literally* as part of the argument, so the exact-match lookup fails silently (falls through to
  a no-op `NOT_FOUND`, easy to miss). Send `tmux send-keys -t app 'click-text Installieren &
  aktivieren'` instead — no inner quotes.

- **`quit` exits the whole Node process**, not just the Electron app — `rl.on('close')` calls
  `process.exit(0)`. If you need to relaunch, you must re-run
  `node .claude/skills/run-desktop/driver.mjs` in the tmux pane first; sending `launch` after
  `quit` just types `launch` at your shell prompt and does nothing.

- **This app's own async data can take 5-15s to resolve** — the Themes catalog does `npm search`
  plus a paginated GitHub API call on load. A screenshot taken right after `goto` will show
  legitimate empty/loading UI, not a bug. Give it a few seconds (or `wait` on a selector that only
  appears once data has loaded) before concluding something's broken.

- **Native macOS confirm dialogs block `launch` outright.** `electron/main/index.ts` shows a native
  dialog before creating the window if `~/Library/Application Support/QuartzControl/running-servers.json`
  has a stale entry from a previous non-graceful quit (see CLAUDE.md's "Orphaned dev-server
  detection"). Playwright's `_electron.launch()` will then hang until its own timeout. If `launch`
  times out, check that file is `{}` before debugging anything else.

- **Test-project side effects don't clean themselves up.** Driving flows that install npm
  packages (`npm install`) or write config (`config.save`, `themePresets.save`) really do mutate
  whatever project you pointed `goto` at, on disk. If you're driving against a project the user
  cares about (not a disposable scratch project), revert what you changed when done — check `git
  status`/`git diff` in that project directory, not just this repo.

## Troubleshooting

- **Launch timeout:** run `npm run build` first — the driver refuses to launch if `out/main/index.js`
  is missing, but check that message rather than assuming. Also check for the orphaned-server
  dialog above.
- **Blank/white screenshot:** `#root` populated but nothing rendered — check `eval
  document.body.innerHTML.length` and `windows` to confirm you're looking at the right
  `webContents` (there's only ever one window in this app, but confirm if in doubt).
- **Electron binary not found:** the executable path is read from
  `node_modules/electron/path.txt` at runtime (this repo's postinstall renames the bundle to
  `QuartzControl.app` — see CLAUDE.md). If that file or the referenced binary is missing, re-run
  `npm install`.
