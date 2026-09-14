# Obsidian-CLI-Referenz für den Projekt-Dokumentations-Skill

## Betriebsannahmen

- Die offizielle Obsidian CLI muss installiert sein.
- Die Obsidian Desktop-App muss verfügbar sein; ein CLI-Aufruf startet sie bei Bedarf.
- Der Ziel-Vault muss Obsidian bekannt sein.
- Der Vault wird immer explizit mit `vault=<name>` adressiert (die CLI 1.13.7 nennt nur den Namen); niemals auf den aktuell aktiven Vault vertrauen.
- Vor dem ersten anderen CLI-Aufruf eines Befehls fragt der Helper `vault info=name` und bricht ab, wenn die Antwort nicht der konfigurierte Name ist (ohne Groß-/Kleinschreibung). Der Rückgabewert hilft dabei nicht: Ein unbekannter Name liefert `Vault not found.` mit Exit **0** (gemessen am 2026-09-14), am 2026-09-04 fiel ein unbekannter Name bei `files` noch still auf einen anderen Vault zurück, und direkt nach dem Öffnen eines Vaults kam einmal `Error: Command "vault" not found` — ebenfalls Exit 0; dafür gibt es einen Wiederholungsversuch.

## Verwendete CLI-Funktionen

Der Bridge-Helper kapselt hauptsächlich:

- `obsidian vault=<ziel> vault info=name`
- `obsidian vault=<ziel> search query=... path=... limit=... format=json`
- `obsidian vault=<ziel> read path=...`
- `obsidian vault=<ziel> create path=... content=... [overwrite]`
- `obsidian vault=<ziel> append path=... content=... inline`
- `obsidian vault=<ziel> unresolved verbose format=tsv`

Diese Liste ist eine zweite Kopie der Aufrufe in `wiki_bridge.py`; wer dort ein Argument ändert, ändert es hier mit. `unresolved` nimmt `tsv`, weil der Helper die Ausgabe zeilenweise auf das Projekt filtert.

Große Inhalte werden vom Helper in mehrere CLI-Aufrufe geteilt (`create` mit dem ersten Stück von 16 000 Zeichen, dann je Stück ein `append`), damit kein einzelnes Kommando unnötig groß wird. Das ist nicht atomar: Scheitert ein `append`, bricht der Befehl mit Fehler ab, aber der Anfang der Datei steht schon im Vault. Nach einem solchen Abbruch die Datei über `read` prüfen und mit `write-doc` neu schreiben — sie trägt `managed_by` und wird deshalb ersetzt.

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
