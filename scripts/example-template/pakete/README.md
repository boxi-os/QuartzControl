# Exportierte Vorlagenpakete

Zwei `.qtpl`-Pakete, die am 2026-09-10 aus den Projekten `doku-vorlage` und `plugin-vorlage`
exportiert wurden. Die Projekte sind am selben Tag gelöscht worden; diese Dateien sind seither die
einzige Fassung, und deshalb liegen sie hier.

| Datei | Name im Paket | exportiert | Inhalt |
| --- | --- | --- | --- |
| `doku.qtpl` | Doku | 2026-09-10 11:40 | 4 Frames, 49 Plugins (36 aktiv), 30 Stylesheets, 50 CSS-Variablen, 3 Gruppen, 7 Seitentypen |
| `plugin.qtpl` | Doku (Plugin) | 2026-09-10 12:17 | dasselbe, 35 statt 36 aktive Plugins |

Beide tragen **keinen** `content`-Baustein — sie sind Gestaltung, kein Text. Gemessen am Manifest,
nicht aus der Erinnerung.

## Warum hier und nicht unter `resources/templates/`

Weil das Verzeichnis dort keine Liste ist, sondern ein Dateiname.
`builtinTemplateService.ts` löst seine mitgelieferte Kopie über die Konstante `TEMPLATE_FILENAME`
auf (`qc-basic.qtpl`, bis zum 2026-09-20 `minimal-lesbar.qtpl`) und scannt nichts; ein zweites
Paket daneben würde über
`extraResources` in jedes Installationspaket reisen, ohne dass die App es je öffnet. Hier ist es
versioniert und kostet kein Byte in der Auslieferung.

Ein Paket kommt zurück in ein Projekt über *Vorlagen → Importieren*. Der Weg ist zugleich der
einzige: Config und Frames eines Pakets entstehen aus `plugins.mjs`, `variables.mjs`, `layout.mjs`
und `frames.mjs`, und einen Rückleser dafür gibt es bewusst nicht (siehe `../README.md`).
