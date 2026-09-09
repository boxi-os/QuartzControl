# QuartzControl

*Auf Deutsch: [README.de.md](README.de.md)*

A desktop app for managing [Quartz 5](https://quartz.jzhao.xyz/) websites: configuration, styling,
plugins, layout, preview, publishing and snapshots — without hand-writing YAML and without a
terminal.

Quartz turns a folder full of Markdown files into a website. That is the good news. The less good
news: getting there means a `quartz.config.yaml`, a layout of nested components, a handful of
plugins and a deployment path, and none of it explains itself by looking at it. QuartzControl puts
a surface on top that shows what it is doing and that you can walk away from again — the files stay
ordinary Quartz files.

> **Beta.** Version 1.0.0-beta.1. Runs on macOS and Linux; Windows is deliberately absent (see
> below). Feedback is welcome — an issue is the easiest way.

## What it does

- **Setup** — title, address and behaviour of the site; switch the `content/` folder between a real
  directory and a symlink (into an Obsidian vault, for instance); translations.
- **Styling** — colours and fonts, community themes, every CSS variable with its dependency graph,
  custom CSS. Plus a layout editor that shows Quartz' layouts as a grid, and frames you can drag
  instead of write.
- **Plugins** — install, configure and reorder them, official ones and ones from the marketplace.
  The options come from the plugin's own `.d.ts` files, so there is no curated list to go stale.
- **Template packages** — export a finished design as a `.qtpl` and apply it to another project.
- **Preview and build** — start and stop the dev server, build with a log.
- **Publishing** — connections (SFTP, FTP, GitHub, rsync, folder) app-wide, targets per project;
  plus `quartz sync` and Git sync.
- **Maintenance** — snapshots as a git repository of their own beside the project, restoring
  individual files, update checks for Quartz and plugins.

Several projects side by side are the norm; the app remembers for each one where it lives and how
it is set up.

## What ships with it

So that a first start needs nothing installed, the app carries:

| | |
| --- | --- |
| **Node and npm** | Electron's own Node runtime, via three shims on the PATH — no Node installation required |
| **git** | used only when the machine has none that answers; otherwise the system's own wins |
| **The user handbook** | around 100 pages in two languages, readable offline, linked from every screen |
| **An example template** | as a fallback, for when there is no network while creating a project |

## Installation

**No release yet.** The first one will ship as DMG and zip for macOS (arm64 and x64), as AppImage
and deb for Linux (arm64 and x86_64) and as a Flatpak, and will then live under
[Releases](https://github.com/boxi-os/QuartzControl/releases). Until then the way in is
[Building from source](#building-from-source).

The two notes below apply to the finished packages and to your own build alike.

**macOS:** the app is unsigned — there is no Developer ID certificate. Gatekeeper will therefore
refuse the first launch. Either open it once from the context menu (right-click → Open) or:

```
xattr -dr com.apple.quarantine /Applications/QuartzControl.app
```

**Linux:** make the AppImage executable and run it, or install the deb. The Flatpak needs
`--filesystem` access to wherever your projects live, if that is not your home directory.

## Building from source

```
npm install
npm run dev        # development mode
npm run build      # production build into out/
npm run dist:mac   # or dist:linux, dist:flatpak
```

There is no test suite. What there is instead are checks that each answer one question neither the
typecheck nor the build answers:

| | |
| --- | --- |
| `npm run typecheck` | both `tsconfig`s |
| `npm run smoke` | launches the build and visits every screen at two window sizes |
| `npm run check:i18n` | every `t('…')` key against both locale files, in both directions |
| `npm run check:semver` | the version comparisons behind the update notice |
| `npm run check:plugin-names` | the name derivation against Quartz' *own* function |
| `npm run check:handbook` | the handbook's quotations against what the app actually says |
| `npm run check:runtime` | the embedded runtime against a real project |
| `npm run check:tokens` | whether a CSS variable actually moves anything in a running page |

Why each of them exists is written in [`CLAUDE.md`](CLAUDE.md), next to the bug that forced it.

## Why no Windows

Not for lack of interest, but because three things are different there and the app would not do
what it promises without them: directory symlinks need elevated rights (that is the Obsidian vault
feature), npm and npx are spawned through `cmd.exe`, where free-text arguments get reinterpreted,
and there is no equivalent of rsync. A `win:` block in the packaging config would produce an
installer for a version that does not work.

## How this was built

A hobby project, written for fun and for my own use — and because configuring Quartz by hand is a
high step for newcomers, and that step can be lowered.

The code was written mostly with [Claude Code](https://claude.com/claude-code); the commits say so
with a `Co-Authored-By` line. The question behind that is a fair one: has anyone checked it?

The answer, as well as it can be given: there are ten rounds of review by a second model, kept as
documents in [`docs/`](docs/) — with every finding, its severity, and what came of it. Every rule in
[`CLAUDE.md`](CLAUDE.md) sits next to the experiment that forced it, and the measurements behind them
are in [`docs/decisions/`](docs/decisions/). The working rule is that a number in a comment is a
measurement or it does not belong there, and that "cannot check" never means "all clear". Where
something could not be measured, it says so.

That is not a guarantee, and there are certainly bugs in here. But it is on the record, which is
worth more than a promise.

## Related repositories

- **[quartz-layout-box](https://github.com/boxi-os/quartz-layout-box)** — Quartz plugin, renders an
  HTML or Markdown snippet anywhere in the page layout
- **[quartz-multilanguage](https://github.com/boxi-os/quartz-multilanguage)** — Quartz plugin for
  multilingual content: language detection, translation linking, language switcher, hreflang and
  redirects
- **[quartzcontrol-templates](https://github.com/boxi-os/quartzcontrol-templates)** — template
  packages the app fetches when creating a project

Both plugins work in any Quartz 5 project, independently of QuartzControl.

## Licence

[GPL-3.0-or-later](LICENSE). The bundled third-party programs keep their own licences — git
(GPLv2), Electron (MIT, with Chromium and Node.js) and npm (Artistic-2.0); the texts live in
[`resources/licenses/`](resources/licenses/) and are reachable in the app under *Help → Open
licences*.

QuartzControl is an independent tool. It is neither part of Quartz nor affiliated with the Quartz
project.
