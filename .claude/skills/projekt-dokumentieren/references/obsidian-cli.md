# Obsidian-CLI-Referenz für den Projekt-Dokumentations-Skill

## Betriebsannahmen

- Die offizielle Obsidian CLI muss installiert sein.
- Die Obsidian Desktop-App muss verfügbar sein; ein CLI-Aufruf startet sie bei Bedarf.
- Der Ziel-Vault muss Obsidian bekannt sein.
- Der Vault wird immer explizit mit `vault=<name-oder-id>` adressiert; niemals auf den aktuell aktiven Vault vertrauen.

## Verwendete CLI-Funktionen

Der Bridge-Helper kapselt hauptsächlich:

- `obsidian vault=<ziel> vault info=name|path`
- `obsidian vault=<ziel> search query=... path=... format=json`
- `obsidian vault=<ziel> read path=...`
- `obsidian vault=<ziel> create path=... content=... [overwrite]`
- `obsidian vault=<ziel> append path=... content=...`
- `obsidian vault=<ziel> unresolved verbose format=json`

Große Inhalte werden vom Helper in mehrere CLI-Aufrufe geteilt, damit kein einzelnes Kommando unnötig groß wird.

Der Rückgabewert allein sagt nicht, ob eine Datei existiert: `read` auf einen fehlenden Pfad schreibt `Error: File "<pfad>" not found.` nach **stdout** und beendet sich mit **0** (gemessen am 2026-09-10). Ein Lesevorgang, der ein „gibt es noch nicht“ verträgt, muss diese Meldung deshalb am Text erkennen — `read_optional()` in `wiki_bridge.py` tut das. Wer sich auf den Rückgabewert verlässt, hält jede noch nicht existierende Datei für vorhanden und unverwaltet und legt damit gar nichts mehr an.

## Schreibgrenzen

Aus `.claude/wiki-docs.json` werden berechnet:

- Projektbasis: `20 Projects/<project_state>/<project_name>/`
- Generierte Dokumentation: `<Projektbasis>/<documentation_folder>/`
- Wissens-Handoff: `<handoff_root>/<project_name>/`

`write-doc` darf nur in die generierte Dokumentation schreiben. `ensure-index` darf nur die Hauptnotiz des aktuellen Projekts neu anlegen und überschreibt sie nie. `handoff` erzeugt eine neue, commitbezogene Inbox-Datei. Der konfigurierbare `handoff_root` muss unter `00 Inbox/Imports` liegen. `read_roots` darf nur Teilbereiche der fest eingebauten Allowlist `10 Wiki`, `40 Collections`, `90 Meta/MOCs` auswählen.

## Aktualisierung

Generierte Dokumentationsdateien können neu erzeugt werden, wenn ihre bestehende Datei die Property

`managed_by: projekt-dokumentieren`

enthält und ihre `source_repository_id` zum aktuellen Repository passt. Damit bleiben manuell gepflegte Projektnotizen geschützt und versehentlich wiederverwendete Projektkonfigurationen werden beim Update erkannt.

## Links

Vor Wikilinks nach einem vorhandenen kanonischen Ziel suchen. Mehrdeutige oder nicht auflösbare Ziele nicht erfinden. Die Abschlussprüfung nutzt die Obsidian-CLI-Liste ungelöster Links und filtert auf das aktuelle Projekt.
