# Was neben der Vorlage mitreisen muss

Ein Vorlagen-Paket (`.qtpl`) trägt die Gestaltung eines Projekts, aber **keine Inhalte und keine
statischen Dateien**. Erfasst werden nur `quartz/styles/` (der Baustein *Eigenes CSS*) und
`quartz/static/fonts/` (der Baustein *Schriftdateien*) — nachzulesen in
`electron/main/services/templatePackage/parts.ts`.

Für diese Vorlage heißt das zweierlei:

## 1. `snippets/sidebar-note.md` → `quartz/static/snippets/sidebar-note.md`

Von den fünf Layout-Box-Instanzen der Vorlage laden vier ihren Inhalt aus der Option `html:`, also
aus dem Konfigurationseintrag selbst — die reisen vollständig mit dem Paket. Genau eine Instanz
(„Über dieses Handbuch“, linke Spalte) lädt aus einer Datei, um den Datei-Weg des Plugins zu
zeigen. Diese eine Datei muss von Hand kopiert werden.

Fehlt sie, ist das kein Fehler: Das Plugin protokolliert eine Warnung und rendert nichts. Im
Dev-Server (`quartz build --serve`) erscheint stattdessen ein gestrichelter Platzhalter mit dem
erwarteten Pfad — der ist in `60-layout-box.scss` mitgestaltet.

## 2. `content/` → `content/`

Der Beispielinhalt. Er ist nicht Teil der Vorlage, sondern das, woran man sie sehen kann: eine
vier Ebenen tiefe Ordnerstruktur (für den Explorer und die Brotkrumen), ein Artikel mit
Überschriften bis H6 (für das Inhaltsverzeichnis), Querverweise (für Graph und Rückverweise),
Tags, sowie eine vollständige Referenz aller Obsidian-Formatierungen unter `formatierung/`.

Wer die Vorlage in ein Projekt mit eigenen Inhalten importiert, braucht diesen Ordner nicht.
