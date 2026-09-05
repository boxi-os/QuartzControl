Du bist als zweites Paar Augen an einem Electron-Projekt, das kurz vor einer Beta steht. Es geht um
ein vollständiges Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der
Nutzer entscheidet.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von Quartz-5-
Websites (Konfiguration, Plugins, Stile, Layout, Bauen, Veröffentlichen, Snapshots). Repository:
/Users/boxi/Development/Quartz-GUI, Branch `feat/example-template`.

Lies zuerst `CLAUDE.md` im Repo-Wurzelverzeichnis. Dort stehen die Konventionen dieses Projekts —
Prozessgrenze, IPC-Vertrag, zod-Schemas, Renderer-Regeln, Gestaltung — jeweils als Regel. Die
Messungen dahinter liegen in `docs/decisions/`. Ein Befund, der gegen eine dieser Regeln verstößt,
ist ein Befund; ein Befund, der eine dieser Regeln für falsch hält, ist auch einer, braucht dann
aber die Begründung.

## Umfang

Der Diff seit dem Tag `review-2026-09-02` — das ist der Stand nach dem letzten vollständigen
Review. Seitdem: 80 Commits, im App-Code 72 Dateien, +4407/−800 Zeilen, 17 neue Module.

    git log --oneline review-2026-09-02..HEAD
    git diff review-2026-09-02..HEAD -- electron/ src/ shared/

Alles außerhalb von `electron/`, `src/` und `shared/` ist Beiwerk (Skripte, Vorlagendaten,
Dokumentation) und nur insoweit interessant, als es den App-Code betrifft.

## Wo ich die größten Risiken vermute

Diese vier sind neu und schreiben oder löschen Daten, die dem Nutzer gehören. Fang hier an, aber
hör hier nicht auf — die Liste ist meine Einschätzung, nicht die Grenze des Auftrags.

1. `electron/main/services/duplicateService.ts` — kopiert ein Projektverzeichnis, entscheidet über
   eine Ausschlussliste, was ein Duplikat *nicht* erbt (Veröffentlichungsziele, Snapshots,
   Deploy-Manifeste), entfernt `origin`, legt einen Symlink an oder kopiert einen Ordner. Wenn hier
   etwas falsch ist, überschreibt eine Kopie die Website des Originals oder frisst Daten.
2. `electron/main/services/templatePackage/parts.ts`, Baustein `content` — schreibt bis zu ein paar
   hundert Dateien in `content/` eines Zielprojekts. Es gibt eine Sperre, die das verweigert, wenn
   `content/` ein Symlink ist (sonst landen fremde Notizen in einem Obsidian-Vault). Prüfe, ob die
   Sperre in *allen* Pfaden greift, auch bei `plan()` und bei Teilauswahl von Bausteinen.
3. `electron/main/services/builtinTemplateService.ts` und `appUpdateService.ts` — laden über HTTPS,
   schreiben nach `userData`, cachen. Jeder Fehlerpfad muss an einer existierenden Datei bzw. an
   „unbekannt" enden, nie an einem Abbruch.
4. `src/routes/Home.tsx` — der Anlege-Assistent legt ein Projekt an und wendet danach in einem
   zweiten Schritt eine Vorlage darauf an, mit einem Fehlerpfad dazwischen. Dazu der
   Duplizieren-Dialog.

Ebenfalls neu und nicht von jemand anderem gelesen: `shared/semver.ts`, `src/state/useIpcQuery.ts`,
`src/state/announcer.tsx`, `src/state/saveCommand.ts`, `src/utils/dndKeyboard.ts`,
`electron/main/services/nodeRuntime.ts`, `gitRuntime.ts`, `logBuffer.ts`, `projectIconService.ts`.

Der gesamte Code stammt von einem einzigen Autor (einem Sprachmodell), der auch diesen Text
geschrieben hat. Nimm die Schwerpunktsetzung oben als Hinweis, nicht als Filter — gerade das, was
hier als „gemessen" oder „abgesichert" beschrieben ist, verdient eine unabhängige Prüfung.

## Worauf besonders zu achten ist

- **Prozessgrenze.** Jeder IPC-Kanal braucht ein zod-Schema (`electron/main/ipc/schemas.ts`).
  Fehlt eines, ist das ein Bug. Der Renderer ist keine Vertrauensgrenze.
- **Pfade.** Absolute vs. relative Auflösung, Symlinks, Containment-Prüfungen (Ziel im Quellordner
  und umgekehrt), `..` in Nutzereingaben.
- **Prozessaufrufe.** `runCommand.ts` ist der eine Spawner. Argumente aus Projektdateien müssen mit
  `--` getrennt sein; `git` bekommt nie eine Shell.
- **Fehlerpfade und Nebenläufigkeit.** Busy-Flags in `finally`, abgebrochene Lesevorgänge
  (`useIpcQuery`), was passiert, wenn zwei Fenster oder zwei Klicks gleichzeitig etwas tun.
- **Barrierefreiheit und Tastatur** in neuen Oberflächen (der Duplizieren-Dialog, der
  Vorlagen-Schritt im Assistenten, das Update-Band).
- **Texte.** Jeder sichtbare Text muss in `src/i18n/locales/de.ts` und `en.ts` stehen bzw. in
  `electron/main/i18n.ts` — mit Parität in beide Richtungen.

## Wie man in diesem Projekt etwas prüft

Behauptungen werden hier gemessen, nicht geschlossen. Vorhandene Werkzeuge:

    npm run typecheck        tsc über Main/Preload und Renderer
    npm run check:i18n       jeden t('…')-Schlüssel gegen beide Sprachdateien
    npm run check:semver     die 18 Versionsvergleiche des Update-Hinweises
    npm run build            Produktionsbau nach out/
    npm run smoke            startet den Bau und besucht jeden Screen bei zwei Fenstergrößen

Für alles, was nur ein laufendes Programm beantwortet, gibt es die Skill `run-desktop`
(`.claude/skills/run-desktop/`): ein Playwright-Treiber, der den Produktionsbau startet und über
`goto`, `eval`, `evalfile`, `mainfile`, `ss` bedient werden kann. `npm run build` vorher.

Echte Projekte auf dem Rechner, an denen sich Verhalten beobachten lässt:

    ~/Documents/Example                    großes Projekt, content/ ist ein Symlink in einen Vault
    ~/Documents/quartz-vorlage-gegenprobe  Wegwerf-Projekt, darf kaputtgehen
    ~/Documents/gui-test                   hat sieben Veröffentlichungsziele

**Nichts davon verändern, außer `quartz-vorlage-gegenprobe`.** `~/Documents/Example` und der Vault
`~/Obsidian/QuartzProjekte/Example` sind gepflegte Nutzerdaten. In *keinen* anderen Obsidian-Vault
auf diesem Rechner schreiben. Wenn du für eine Messung ein Projekt brauchst, leg dir eines in einem
Wegwerf-Ordner an.

## Nicht Gegenstand dieses Reviews

- Der **Inhalt** der Beispielvorlage (die Notizen unter `~/Obsidian/QuartzProjekte/Example` und die
  Stylesheets unter `scripts/example-template/styles/`). Der Nutzer überarbeitet ihn gerade selbst.
  Der *Mechanismus* der Vorlagenpakete gehört sehr wohl dazu.
- Rechtschreibung und Formulierung in den Vorlagentexten.

## Bekannt und entschieden

Melde diese nur, wenn du die Entscheidung für falsch hältst — dann aber mit Begründung:

- Die macOS-Bauten sind **nicht signiert** (`identity: null`). Bewusst so für die Beta; es gibt
  stattdessen eine Installationsanleitung.
- **Flatpak** ist konfiguriert und nie gebaut worden; v1 liefert macOS, AppImage und deb.
- Ein Vorlagenpaket überträgt von fünf Layout-Box-Instanzen nur **eine**, weil der `plugins`-
  Baustein nach Namen keyt und alle fünf denselben Namen tragen. Dokumentiert als Befund 1 in
  `scripts/example-template/BEFUNDE.md`.
- Rund 272 Farbpaare im Renderer stehen noch als Tailwind-Palette (`text-slate-500
  dark:text-slate-400`) statt als Token. Überflüssig, nicht falsch; wird beiläufig ersetzt.
- Vier Fehler in Quartz selbst (Pfeile, Inline-Fußnoten, Canvas-Einbettungen, Inline-Tags) und ein
  gemeldeter in einem Quartz-Plugin. Alle dokumentiert.

## Was ich als Ergebnis brauche

Eine Liste von Befunden, nach Schwere sortiert, jeder mit:

- Datei und Zeile
- was falsch ist, in einem Satz
- **ein konkretes Szenario**, in dem es schiefgeht (welche Eingabe, welcher Zustand, was dann
  passiert) — kein „könnte problematisch sein"
- ob du es gemessen oder gelesen hast

Wenn du nichts findest, ist „nichts gefunden" ein gültiges Ergebnis, aber sag dann, was du
angesehen hast und wie.

**Ändere nichts am Code.** Wenn ein Befund einen offensichtlichen Fix hat, beschreib ihn in einem
Satz.

## Hausregeln

Antworte auf Deutsch. Code und Commit-Nachrichten wären Englisch, aber du schreibst hier keinen
Code. Sei knapp und konkret; Behauptungen ohne Messung als solche kennzeichnen.
