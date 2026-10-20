# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Electron + React + TypeScript desktop GUI for managing [Quartz 5](https://quartz.jzhao.xyz/) (jackyzha0's static-site generator) projects: load/save `quartz.config.yaml`, install/configure plugins (official CLI wrapper + a GitHub-based marketplace), switch the `content/` folder between a real directory and a symlink (e.g. an Obsidian vault), run builds, and control the local dev server. Supports multiple Quartz projects/profiles.

## Commands

Je Befehl eine Zeile. Was er genau prüft, warum es ihn gibt und was er beim ersten Lauf fand,
steht in [`docs/scripts.md`](docs/scripts.md) — **lies dort nach, bevor du ein Skript mit Optionen
startest oder seine Ausgabe deutest.**

- `npm run dev` — dev mode (electron-vite + Electron window)
- `npm run build` — production build to `out/`
- `npm run start` — preview a production build
- `npm run typecheck` — `tsc --noEmit` for node and web configs; no lint script, no unit tests
- `npm run smoke` — needs `npm run build` first; opens every screen at two sizes in a throwaway profile and reports crashes, console errors, toasts, horizontal scroll and empty pages (asserts nothing about content)
- `npm run screenshots -- --demo --cards …` — screenshots for the handbook. **Ohne `--demo` gegen das echte Profil; `--scenes` verlangt `--demo`** (sonst baut es im echten Projekt und leert dessen `public/`). Die Zugänge-Karte wird nie automatisch aufgenommen
- `npm run build:handbook` / `build:handbook-pdf` — Handbuch-Website nur noch als Quelle fürs PDF; die App öffnet das Online-Handbuch (`HANDBOOK_URL` in `electron/main/menu.ts`)
- `npm run fetch:git` — mitgeliefertes git nach `resources/git/<platform>-<arch>/`
- `npm run check:runtime -- <projekt>` — eingebettete Node-Laufzeit gegen ein echtes Projekt
- `npm run check:semver` — Versionsvergleiche des Update-Hinweises
- `npm run check:stylesheet-consolidation` — „Zusammenlegen“ der Stile-Seite gegen die Vorlagen-Geschichte
- `npm run check:plugin-names -- [projekt]` — Plugin-Namen gegen Quartz' `extractPluginName`
- `npm run check:option-schema -- <projekt>` — Schema-Leser der Plugin-Optionen gegen echte Plugins
- `npm run check:plugin-copies -- <projekt>` — Abschriften der vier Plugin-Editoren gegen die installierten Plugins
- `npm run check:inline-svg -- [projekt]` — SVG-Bereiniger gegen böse Eingaben in Chrome (braucht Chrome)
- `npm run check:core-update` — Plan des Core-Updates für `package.json`/Lockfile
- `npm run check:i18n` — `t()`/`mainT()`-Schlüssel gegen `de.ts`/`en.ts`, Parität, ungenutzte Schlüssel
- `npm run check:handbook` — Blockzitate des Handbuchs gegen die Sprachdateien
- `npm run check:tokens -- [baseUrl]` — wirkt jede Vorlagen-Variable auf einer laufenden Seite
- `npm run template:example -- [--variant …] [--only …] [--sync|--check-sync]` — Beispielvorlage über die gebaute App bauen und exportieren. **Wer Phase 2 laufen lässt, lässt Phase 4 mit**; `--check-sync` vor jeder Messung an der Website
- `node scripts/stagger-vault-mtimes.mjs` — mtimes des Beispiel-Vaults staffeln (ohne Flag nur Anzeige; git hat keinen Rückweg)
- `node scripts/styles-snapshot.mjs` — berechnete Stile aufnehmen und vergleichen (App oder `--site`)
- `npm run dmg:background` — Hintergrund des DMG-Fensters
- `npm run dist` / `dist:mac` / `dist:linux` / `dist:flatpak` — electron-builder; Release-Ablauf in [`docs/release.md`](docs/release.md)

Electron halb installiert (`Error: Electron uninstall`): siehe Ende von [`docs/scripts.md`](docs/scripts.md).

## Konventionen und Architekturentscheidungen

Die Kurzfassung dessen, was gilt und warum — vier Abschnitte (Prozessgrenze, Renderer, Primitives
und Gestaltung, Arbeitsweise). Sie stehen in [`docs/conventions.md`](docs/conventions.md) und
werden von hier eingebunden, sind also Teil dieser Anweisung und kein Nachschlagewerk; bis zum
2026-09-17 standen sie wörtlich an dieser Stelle. **Greift die Einbindung in deiner Fassung von
Claude Code nicht, lies die Datei zuerst** — vor der ersten Änderung an diesem Projekt.

Dort steht seit dem 2026-10-16 nur noch die Regel, gekürzt; die Begründung jeder Regel steht
unter derselben Überschrift in
[`docs/decisions/conventions-full.md`](docs/decisions/conventions-full.md) (die Fassung vor der
Kürzung, wörtlich), die Messungen in `docs/decisions/` (Liste unten). Neue Regeln kommen mit dem
Experiment dazu, das sie erzwungen hat - in den Code als Kommentar, in `docs/decisions/` als
Absatz, als kurze Regel nach `docs/conventions.md`, mit Begründung nach `conventions-full.md`.

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
- [`plugins-and-config.md`](docs/decisions/plugins-and-config.md) - Options-Schema (drei Quellen, `x-quartz-*`), Frames in der Plugin-Liste, Drag bei Filter, Marktplatz, die zwei Config-Schreibwege, Projektbild als Favicon-Quelle
- [`templates-and-localization.md`](docs/decisions/templates-and-localization.md) - `.qtpl`-Paket, die zwölf Teile, Dry-Run-Import, `merge=ours`, Übersetzungs-Baseline
- [`electron-runtime-and-packaging.md`](docs/decisions/electron-runtime-and-packaging.md) - Native Chrome, Electron 43, Toolchain, `brand-electron`, Packaging (deb/AppImage/VM), PATH im Bundle, `safeStorage` auf Linux, Menü, App-Identität, Icon
- [`i18n-and-vocabulary.md`](docs/decisions/i18n-and-vocabulary.md) - Sprachdateien, Klassenkomponente und Singleton, `mainT()`, Vokabular-Tabelle, Fachbegriffe
- [`dark-mode-and-contrast.md`](docs/decisions/dark-mode-and-contrast.md) - `nativeTheme`, `color-scheme`, Scrollbar, Playwright-Emulation, Muted-Token, disabled-Buttons, Avatar-Farben
- [`publishing-and-credentials.md`](docs/decisions/publishing-and-credentials.md) - Handshake-Budget, Host-Keys, Excludes, Zugänge vs. Ziele, Manifeste, Ordner-Ziel, `quartz sync`, GitHub-API, `GIT_ASKPASS`, Branch-Adapter, rsync, Webhook, Schlüsseldateien, verschlüsselte Zugangsdaten
- [`snapshots-and-updates.md`](docs/decisions/snapshots-and-updates.md) - Snapshot-Store als eigenes Git-Repo, Thinning, Restore, Warteschlange, Migration, Update-Check, geparkter Content-Symlink
- [`quartz-cli.md`](docs/decisions/quartz-cli.md) - Was die Quartz-5-CLI wirklich tut (unveröffentlicht, Flags, Exit-Codes, Config-Form)


## Stand und Reviews

Einundfünfzig Review-Runden sind abgearbeitet (die letzte am 2026-10-20 auf `feat/1.2`, über
quartz-forms 0.5.5 und 0.5.6 und sein Handbuch; die achtundvierzigste bis einundfünfzigste von
einem anderen Modell geschrieben). Veröffentlicht ist `1.1.0` (2026-10-18). Was aus jeder Runde wurde und was noch
ungelesen ist, steht in [`docs/reviews.md`](docs/reviews.md); die früheren Stand-Absätze dieser
Datei (Releases, Alpha-Test, Gruppe D, offene Punkte) wörtlich in [`docs/stand.md`](docs/stand.md).
Was aus einer Runde dauerhaft gilt, steht als Regel in `docs/conventions.md`, nicht in der Chronik.

Seit dem 2026-10-19 gibt es zwei Linien: Bugfixes für 1.1 auf `fix/1.1.x`, neue Features auf
`feat/1.2`; die Fix-Linie wird in die Feature-Linie gemergt, nie umgekehrt
([`docs/release.md`](docs/release.md), Punkt 2).

**Arbeitsregel** für eine Review-Liste: ein Befund pro Durchgang, jeweils mit `npm run typecheck`,
`npm run build`, `npm run smoke` und eigenem Commit; was nebenbei auffällt, wird gesammelt und
genannt, nicht mit erledigt. Was nur ein laufendes Programm beantworten kann, wird an der gebauten
App gemessen, wo es geht mit Vorher-Messung. Ablauf als Skill: `.claude/skills/review-befund/`.

## Claude-Skills in diesem Projekt

Skills werden projektlokal unter `.claude/skills/` bereitgestellt, nie global.
Firecrawl-Skills bei Bedarf aus dem gemeinsamen Store verlinken:

    ln -s ~/.agents/skills/firecrawl-scrape .claude/skills/firecrawl-scrape

Verfügbare Skills im Store: `ls ~/.agents/skills/`
