# Was neben der Vorlage mitreisen muss

Ein Vorlagen-Paket (`.qtpl`) trägt die Gestaltung eines Projekts — seit dem 2026-09-06 samt der
Dateien unter `quartz/static/`: `quartz/styles/` (Baustein *Eigenes CSS*), `quartz/static/fonts/`
(*Schriftdateien*) und alles Übrige dort (*Statische Dateien*), nachzulesen in
`electron/main/services/templatePackage/parts.ts`. Was es weiterhin **nicht** trägt, sind die
Inhalte.

## 1. `snippets/*.md` — reisen inzwischen mit

Von den sechs Layout-Box-Instanzen der Vorlage laden fünf ihren Inhalt aus der Option `html:`, also
aus dem Konfigurationseintrag selbst. Genau eine Instanz („Über dieses Handbuch“, linke Spalte)
lädt aus einer Datei, um den Datei-Weg des Plugins zu zeigen — und bis zum 2026-09-06 kam genau die
im Zielprojekt leer an, weil das Paket ihre Datei nicht mitnahm (BEFUNDE 5). Der Baustein
*Statische Dateien* trägt sie jetzt; von Hand zu kopieren ist nichts mehr.

Es sind zwei: `sidebar-note.md` und `sidebar-note.en.md`. Die zweite ist dieselbe Box auf Englisch
und steht seit dem 2026-09-05 in der Konfiguration unter `byLang: { en: … }`; das Plugin wählt sie
über das Frontmatter-Feld `lang` der Seite. Vorher trug jede englische Notiz die Zuordnung selbst.

Wer den Baustein beim Import abwählt oder die Dateien später löscht, verliert keinen Build: Das
Plugin protokolliert eine Warnung und rendert nichts. Im Dev-Server (`quartz build --serve`)
erscheint stattdessen ein gestrichelter Platzhalter mit dem erwarteten Pfad — der ist in
`60-layout-box.scss` mitgestaltet.

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
