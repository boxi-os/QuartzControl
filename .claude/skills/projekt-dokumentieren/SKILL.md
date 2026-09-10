---
name: projekt-dokumentieren
description: Dokumentiert das aktuelle Softwareprojekt kontrolliert in einem externen Obsidian-Vault über die offizielle Obsidian CLI. Manuell nach einem Meilenstein, Release oder Projektabschluss verwenden; erzeugt projektspezifische technische Dokumentation und übergibt wiederverwendbare Erkenntnisse an die Vault-Inbox.
argument-hint: "[optional: Fokus oder Projektname]"
disable-model-invocation: true
context: fork
---

# Softwareprojekt ins persönliche Wiki dokumentieren

Arbeite aus dem aktuellen Repository. `$ARGUMENTS` ist optionaler Fokus, z. B. `Release 1.0`, `nur Architektur und Deployment` oder ein abweichender Projektname.

## Sicherheitsgrenze

- Für Vault-Zugriffe ausschließlich `${CLAUDE_SKILL_DIR}/scripts/wiki_bridge.py` verwenden. Nicht direkt in den Vault-Dateipfad schreiben.
- Der Bridge-Helper darf nur in das Projekt-Unterverzeichnis und nach `00 Inbox/Imports/<Projekt>/` schreiben.
- Bestehende manuelle Projekt-Hauptnotizen niemals überschreiben.
- Generierte Dateien nur ersetzen, wenn sie bereits `managed_by: projekt-dokumentieren` enthalten.
- `publish: false` setzen. Keine Veröffentlichung anstoßen.
- Secrets, Tokens, `.env`-Werte, personenbezogene Daten und vertrauliche Zugangsdaten nicht in die Dokumentation übernehmen.

## 1. Preflight und Stand erfassen

1. `python "${CLAUDE_SKILL_DIR}/scripts/wiki_bridge.py" preflight` ausführen. Bei Fehler abbrechen und Ursache nennen.
2. `python "${CLAUDE_SKILL_DIR}/scripts/wiki_bridge.py" metadata` ausführen. Git-Commit, Branch und Dirty-Status übernehmen.
3. Repository analysieren: README, Manifest/Lockfiles, Konfiguration, `.env.example`, CI/CD, Container, Datenbankschema/Migrationen, API-Routen, Tests und relevante Quellcode-Einstiegspunkte.
4. Generierte/vendor/build-Verzeichnisse und Secrets nicht unnötig lesen.

## 2. Dokumentationsumfang bestimmen

Nur Dateien erzeugen, die zum realen Projekt passen. Standardmäßig prüfen:

- `Documentation/Index.md`
- `Documentation/Architektur.md`
- `Documentation/Installation und Entwicklung.md`
- `Documentation/Deployment und Betrieb.md`
- `Documentation/Testing.md`

Nur bei tatsächlicher Relevanz zusätzlich z. B. `API.md`, `Datenmodell.md`, `Frontend.md`, `Backend.md`, `Authentifizierung.md`, `Integrationen.md` oder `Architekturentscheidungen.md` erzeugen.

Keine leeren Platzhalterdateien erstellen.

## 3. Bestehendes Vault-Wissen gezielt suchen

Für höchstens ca. 5-15 wichtige Fachbegriffe suchen:

```bash
python "${CLAUDE_SKILL_DIR}/scripts/wiki_bridge.py" search --query "Begriff" --limit 12
```

Nur wirklich passende Treffer lesen:

```bash
python "${CLAUDE_SKILL_DIR}/scripts/wiki_bridge.py" read --path "10 Wiki/Concepts/Beispiel.md"
```

**Wikilinks immer vollqualifiziert schreiben**, also mit vollem Vault-Pfad und Alias: `[[20 Projects/Active/<Projekt>/Documentation/Architektur|Architektur]]`. Kurzformen wie `[[Architektur]]` oder `[[Index]]` sind mehrdeutig, sobald ein zweites Projekt dokumentiert ist — jedes Projekt hat dieselben Dokumentnamen. Das gilt fuer Verweise zwischen Dokumentationsdateien, in der Projekt-Hauptnotiz und in der Handoff-Notiz.

Bestehende kanonische Notizen verlinken; nicht für jedes verwendete Framework eine neue Wiki-Notiz erzeugen. Suche gezielt, nicht breit, um Tokens zu sparen.

## 4. Inhalte erzeugen

Jede automatisch gepflegte technische Dokumentationsdatei erhält Frontmatter nach diesem Muster:

```yaml
---
type: project
topics: []
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
publish: false
source_project: "<project_name>"
source_repository_id: "<repository_id aus metadata>"
source_commit: "<git sha>"
source_branch: "<branch>"
source_dirty: false
documented_at: YYYY-MM-DD
managed_by: projekt-dokumentieren
---
```

**`topics` bleibt leer.** Der Ziel-Vault fuehrt eine geschlossene Topic-Liste und laesst eigene Werte nicht zu. Erfinde keine — weder englische noch deutsche, und schon gar keine, die nur einen Dokumentabschnitt benennen (`architektur`, `konfiguration`, `testing`, `release`). Passende Topics vergibt der Vault beim Verarbeiten. Nenne stattdessen Kandidaten im Abschlussbericht.

Den `status` aus `project_state` ableiten: `Active` -> `active`, `Incubator` -> `draft`, `Archive` -> `archived`. Bei Dirty Working Tree `source_dirty: true` setzen und im Text klar sagen, dass die Dokumentation auch uncommittete Änderungen berücksichtigt. `source_project` und `source_repository_id` exakt aus `metadata` übernehmen; die Bridge verweigert abweichende Werte.

Dokumentiere den tatsächlichen Implementierungsstand, nicht Wunscharchitektur. Wichtige Dateipfade und Komponenten nennen, aber keinen Quellcode massenhaft kopieren. Entscheidungen und Grenzen erklären.

## 5. Schreiben über die Bridge

Inhalt zuerst in eine temporäre lokale Datei schreiben, dann:

```bash
python "${CLAUDE_SKILL_DIR}/scripts/wiki_bridge.py" write-doc \
  --relative "Architektur.md" \
  --content-file "/tmp/architektur.md"
```

Der Helper erstellt neue generierte Dateien und ersetzt nur bereits als `managed_by: projekt-dokumentieren` markierte Dateien.

Für die Projekt-Hauptnotiz einmalig:

```bash
python "${CLAUDE_SKILL_DIR}/scripts/wiki_bridge.py" ensure-index \
  --content-file "/tmp/projekt-index.md"
```

Existiert die Hauptnotiz bereits, bleibt sie unangetastet.

## 6. Wiederverwendbares Wissen übergeben

Erzeuge eine kompakte Handoff-Notiz mit ausschließlich verallgemeinerbaren Erkenntnissen:

- Muster/Best Practices
- unerwartete Fallstricke
- belastbare technische Erkenntnisse
- Kandidaten für bestehende oder neue Wiki-Notizen
- Projekt- und Commit-Bezug

Keine bloße Wiederholung der Projektdokumentation. Die Handoff-Notiz erhält mindestens `type: project`, `status: inbox`, `publish: false`, `source_project`, `source_repository_id`, `source_commit`, `source_branch`, `source_dirty` und `documented_at`. Übergabe mit:

```bash
python "${CLAUDE_SKILL_DIR}/scripts/wiki_bridge.py" handoff \
  --content-file "/tmp/wissens-kandidaten.md"
```

Der Vault verarbeitet diese Datei später mit `/inbox-verarbeiten`.

## 7. Abschlussprüfung

1. Geschriebene Dateien über `read` stichprobenartig zurücklesen.
2. `python "${CLAUDE_SKILL_DIR}/scripts/wiki_bridge.py" unresolved --project-only` ausführen.
3. Keine privaten/unklaren Links erfinden; bei nicht auflösbaren Begriffen lieber normalen Text verwenden.
4. Knapp berichten: Commit-Stand, erstellte/aktualisierte Dokumente, bestehende Vault-Links, Handoff-Datei, Topic-Kandidaten und offene Unsicherheiten.

Für CLI-Details und Betriebsgrenzen nur bei Bedarf [references/obsidian-cli.md](references/obsidian-cli.md) lesen.
