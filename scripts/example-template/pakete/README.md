# Exportierte Vorlagenpakete

Zwei `.qtpl`-Pakete, die aus den Projekten `doku-vorlage` und `plugin-vorlage` exportiert wurden.
Die Werkstätten sind Wegwerfordner unter `werkstatt/` und werden nach jedem Lauf gelöscht; diese
Dateien sind seither die einzige Fassung, und deshalb liegen sie hier.

| Datei | Name im Paket | exportiert | Inhalt |
| --- | --- | --- | --- |
| `doku.qtpl` | Doku | 2026-09-21 10:26 | 4 Frames, 49 Plugins (35 aktiv), 31 Stylesheets, 66 CSS-Variablen, 3 Schriftdateien, 3 Gruppen, 7 Seitentypen |
| `plugin.qtpl` | Doku (Plugin) | 2026-09-21 10:26 | dasselbe, 34 statt 35 aktive Plugins (ohne Graphansicht) |

Neu gebaut am 2026-09-21. Die Fassung davor war vom 2026-09-10 und kannte weder
`nav-navigations.scss` noch die dreizehn Callout-Tokens, weder Noto Sans noch die sechs Schalter
für die Seitenspalten — 30 Stylesheets, 50 Variablen, vier Schriftdateien aus drei Familien.
Beide Pakete tragen **kein** quartz-navigations: Der Baustein `plugins` schlüsselt gleichnamige
Einträge nach ihrer Position, und ein Doku-Paket mit eigenen Navigationseinträgen überschriebe beim
Import ins Navigations-Handbuch dessen eigene (`variants.mjs` sagt es an den zwei Stellen, an denen
die Liste steht).

Beide tragen **keinen** `content`-Baustein — sie sind Gestaltung, kein Text. Gemessen am Manifest,
nicht aus der Erinnerung.

**Und keine Schnipsel.** Die Fassung von 00:44/00:45 trug `static/snippets/sidebar-note*.md` aus
dem Example — Inhalt, der im Baustein `static` reiste statt in `content` — und ersetzte beim
Import den Seitenleisten-Kasten der vier Websites, die sie anwenden (35. Review, Befund 1). Um
09:02/09:03 aus denselben Werkstätten neu exportiert; gegen die Fassung davor fehlen genau diese
zwei Dateien, alles andere außer `createdAt` ist gleich (`diff -r` der entpackten Pakete).
Um 09:16 noch einmal, mit dem `base.scss`, das den Fokusring in den Seitenspalten nicht mehr
abschneidet (Befund 2 derselben Runde). Um 10:26 ein drittes Mal, mit den Stylesheets aus
Befund 9: Die offene Suche liegt über Graph-Vollansicht und Burger, und Burger und „Los“-Knopf
haben ihren Hover zurück. Am selben Tag noch einmal: Beide tragen
jetzt **quartz-navigations** wie das Example (Akkordeon `menue` und Pager `seiten-pager`), der
Explorer ist aus. Vorher navigierten die Doku-Websites mit dem Explorer, und den hatte das Example
abgeschaltet — nach dem Import der Nacht standen drei Websites ohne Navigation da. Gegen die
Fassung davor: zwei Einträge dazu, ein Schalter anders, sonst nichts (Eintrag für Eintrag
verglichen). Das Navigations-Handbuch bekommt sie nur ohne den Baustein „Plugins“
(`docs/release.md`).

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
