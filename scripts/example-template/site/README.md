# Was neben der Vorlage mitreisen muss

Ein Vorlagen-Paket (`.qtpl`) trägt die Gestaltung eines Projekts, aber **keine Inhalte und keine
statischen Dateien**. Erfasst werden nur `quartz/styles/` (der Baustein *Eigenes CSS*) und
`quartz/static/fonts/` (der Baustein *Schriftdateien*) — nachzulesen in
`electron/main/services/templatePackage/parts.ts`.

Für diese Vorlage heißt das zweierlei:

## 1. `snippets/*.md` → `quartz/static/snippets/`

Von den sechs Layout-Box-Instanzen der Vorlage laden fünf ihren Inhalt aus der Option `html:`, also
aus dem Konfigurationseintrag selbst — die reisen vollständig mit dem Paket. Genau eine Instanz
(„Über dieses Handbuch“, linke Spalte) lädt aus einer Datei, um den Datei-Weg des Plugins zu
zeigen. Diese Dateien müssen von Hand kopiert werden.

Es sind zwei: `sidebar-note.md` und `sidebar-note.en.md`. Die zweite ist dieselbe Box auf Englisch
und steht seit dem 2026-09-05 in der Konfiguration unter `byLang: { en: … }`; das Plugin wählt sie
über das Frontmatter-Feld `lang` der Seite. Vorher trug jede englische Notiz die Zuordnung selbst.

Wer die Vorlage in ein einsprachiges Projekt importiert, braucht `sidebar-note.en.md` nicht — der
`byLang`-Eintrag greift dort nie, und eine fehlende Datei ist wie oben beschrieben kein Fehler.

Fehlt sie, ist das kein Fehler: Das Plugin protokolliert eine Warnung und rendert nichts. Im
Dev-Server (`quartz build --serve`) erscheint stattdessen ein gestrichelter Platzhalter mit dem
erwarteten Pfad — der ist in `60-layout-box.scss` mitgestaltet.

## 2. `content/` → `content/`

Der Beispielinhalt. Er ist nicht Teil der Vorlage, sondern das, woran man sie sehen kann: eine
vier Ebenen tiefe Ordnerstruktur (für den Explorer und die Brotkrumen), ein Artikel mit
Überschriften bis H6 (für das Inhaltsverzeichnis), Querverweise (für Graph und Rückverweise),
Tags, sowie eine vollständige Referenz aller Obsidian-Formatierungen unter `formatierung/`.

> **Dieser Ordner ist nicht mehr die Quelle.** Der Inhalt lebt seit dem Umbau im Obsidian-Vault,
> auf den das Projekt mit einem Symlink zeigt; Phase 1 des Skripts legt nur noch diesen Link an und
> kopiert nichts mehr hierher. Was hier liegt, ist der Stand von vor dem Umzug — ohne die englische
> Fassung unter `en/` und ohne die Seiten, die seitdem dazugekommen sind.

Wer die Vorlage in ein Projekt mit eigenen Inhalten importiert, braucht diesen Ordner nicht.
