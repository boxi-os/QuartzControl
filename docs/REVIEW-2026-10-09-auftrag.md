Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist und dessen nächste
Fassung ein Release Candidate werden soll. Es geht um ein Review — nicht um Änderungen. Am Ende
steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Der Gegenstand ist fast kein App-Code.** Von 2176 geänderten Zeilen entfallen **18 auf
`electron/` und `src/`** — drei Dateien, zwei davon Sprachdateien. Das Gewicht liegt woanders:

- in **`scripts/`**, also im Werkzeug, das die Vorlagen baut (1584 Zeilen in 19 Dateien),
- in **Stylesheets**, die in fremden Projekten landen (504 Zeilen in 7 Dateien),
- in einem **fremden Repo** (quartz-navigations 0.3.1, 140 Zeilen, davon 47 Tests),
- und in **veröffentlichten Artefakten**: drei `.qtpl` in einem öffentlichen Repo, fünf
  ausgelieferte Websites, eine App, die seither eine andere Adresse abfragt.

Ein Review, das nur den Diff liest, greift hier zu kurz. **Die Hälfte der Fragen ist, ob das, was
draußen liegt, zu dem passt, was die Dateien behaupten.** Das ist prüfbar: Die Pakete sind
herunterladbar, die Websites sind aufrufbar, die Manifeste sind lesbar.

**Der zweite Unterschied:** In dieser Schicht sind drei Behauptungen gefunden worden, die die
Quelle nicht trug — alle drei in Kommentaren, die begründeten, warum eine Regel nötig sei
(„das Plugin gestaltet das nicht", zweimal falsch). Gefunden hat sie erst der Versuch, dieselben
Befunde für das Plugin aufzuschreiben. Daraus ist eine Regel geworden
(`docs/conventions.md`, „Wer fremdem Code eine Lücke nachsagt"). **Die Frage, ob es weitere gibt,
ist offen** — niemand hat die übrigen Begründungen gegen ihre Quellen gehalten.

**Wer was geschrieben hat:** Die gelesenen Commits sind von Claude Opus 5. **Dieser Auftrag ist von
demselben Modell und aus derselben Sitzung wie die Commits.** Das ist der ungünstigste Fall für die
Zahlen unten: Was hier als „gemessen" steht, steht aus der Erinnerung an die Messung. Prüfe es
entsprechend; wo eine Zahl nicht stimmt, ist das ein Befund. In Runde 34 galt dieselbe
Einschränkung und sie hat dort nichts zutage gefördert — das sagt aber nur, dass sie einmal
gehalten hat.

In der Zählung von `CLAUDE.md` ist das das **fünfunddreißigste** Review. Die Dateinamen zählen nach
Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md`.

Für diese Runde zusätzlich: **`scripts/example-template/README.md`** (42 KB) beschreibt den
Vorlagenbau, **`scripts/example-template/BEFUNDE.md`** (138 KB) ist sein Entscheidungsbuch. Beide
sind älter als diese Schicht; wo sie ihr widersprechen, ist das ein Befund.

Die Einbindung von `conventions.md` griff in den letzten zehn Runden. Wenn das bei dir anders ist,
ist das eine Messung und gehört in dein Dokument.

## Umfang

Von `review-2026-10-09` bis `review-2026-10-10`:

    git log --oneline review-2026-10-09..review-2026-10-10
    git diff review-2026-10-09..review-2026-10-10

Das sind **50 Commits in zwei Schichten**, und die zweite ist die eigentliche.

### Schicht 1 — die vierunddreißigste Runde, der Alpha-Test, Gruppe D (26 Commits)

`review-2026-10-09..6503f61` — 36 Dateien, +2365 / −212.

Die neun Befunde des 34. Reviews samt vier Nebenbei-Punkten, danach der erste Alpha-Test
(`docs/ALPHA-2026-09-20.md`, zwei Befunde, beide behoben) und Gruppe D
(`docs/GRUPPE-D-2026-09-20.md`, zehn Pakete gebaut, neun gestartet, glibc ≥ 2.34).

**Diese Schicht ist nicht dein Schwerpunkt.** Sie ist abgeschlossen, dokumentiert und in
`docs/reviews.md` verbucht. Lies sie, soweit du sie brauchst, um die zweite zu verstehen.

### Schicht 2 — die Vorlagen-Runde (24 Commits), dein Schwerpunkt

`6503f61..HEAD` — 55 Dateien, +2176 / −229. Aufgeteilt:

    electron/, src/                      3 Dateien,   +18 /   −8
    scripts/ (ohne Binärdateien)        19 Dateien, +1584 / −202
      davon styles/*.scss                7 Dateien,  +504 /  −61
    scripts/…/basic-content (neu)       21 Dateien,  +405 /   −0
    docs/                                4 Dateien,  +108 /  −10
    Binärdateien (.qtpl, .png)           7 Dateien

Was darin passiert ist, in der Reihenfolge, in der es gebaut wurde:

1. **Ein Variantenregister** (`variants.mjs`) ersetzt einen Zwei-Wege-Schalter. Vier Varianten
   statt drei. Zwei seiner Felder sind Wächter, keine Daten — siehe unten.
2. **quartz-navigations in der Example-Vorlage**: Akkordeon links, Pager unten, Explorer aus und
   weiter gestaltet. Neues Stylesheet `nav-navigations.scss` (318 Zeilen).
3. **Eine vierte Variante `basic`** mit eigenem Inhalt im Repo, PNG-Marke, eigener Ableitung.
4. **Umbenennung**: `qc-basic.qtpl` ist das eingebaute Paket, das Example heißt `qc-example.qtpl`,
   `minimal-lesbar.qtpl` bleibt eingefroren liegen.
5. **Die dreizehn Callout-Farben** ziehen aus dem SCSS in den Variablen-Tab.
6. **Noto Sans / Noto Sans Mono**, zwei Familien statt drei, plus ein Aufräumschritt in Phase 6.
7. **Sechs Schalter**, mit denen jede Seitenspalte stehen bleibt oder mitläuft.
8. **Drei Befunde ins Plugin zurück** (eigenes Repo, siehe unten).

## Das fremde Repo

`/Users/boxi/Development/quartz-navigations`, Tag `v0.3.0..v0.3.1`, 2 Commits, 7 Dateien,
+140 / −6 ohne `dist/`. Es hat eigene Regeln (`AGENTS.md`, `CLAUDE.md`) und eine eigene Testsuite
(108 Tests, `npm run check`). Drei Korrekturen:

- `persistState` schloss zusammen mit `exclusive` den Ordner der gelesenen Seite. Der Fix ist ein
  Wächter über Exklusiv-Gruppen (`trailClaimedGroups`), drei Tests, und der erste fällt ohne ihn
  durch — das ist nachgewiesen, nicht behauptet.
- Der Pager zeigte einen leeren Kasten, wo eine Richtung fehlt.
- Der Pager quetschte zwei Knöpfe in 48 % einer Telefonzeile.

**Der zweite Fix stand zuerst an der falschen Stelle** — vor der allgemeinen Knopfregel statt
dahinter, bei gleicher Spezifität, also wirkungslos. Gefunden hat das die Messung an der gebauten
Website, nicht das Lesen. Frage dich, ob der dritte dieselbe Prüfung bestanden hat.

## Abwägungen, die niemand gegengelesen hat

**1. Die zwei Wächter im Register.** `allowFresh: false` für `example` verhindert, dass `--fresh`
das *echte* Projekt `~/Documents/QuartzProjekte/Example` samt seinem Symlink in einen Obsidian-Vault
löscht — `bootstrap()` machte dort vorher ein `rmSync(target, { recursive: true })`. `stylesSource`
verweigert `--sync`/`--check-sync` jeder Variante außer `example`, weil deren Werkstatt eine Kopie
ist, die derselbe Lauf geschrieben hat. Beide sind Daten in einer Tabelle, die jemand beim Anlegen
einer fünften Variante ausfüllen muss. **Ist das die richtige Stelle, oder gehört so etwas in den
Code, der löscht?**

**2. Der `copy`-Zweig von `installContent`.** Er schreibt ein echtes `content/`-Verzeichnis. Seine
erste Prüfung ist ein Abbruch bei einem Symlink — für die Vault-Variante ist ein bestehender Link
der gutartige Fall, für diesen der gefährliche. Danach entscheidet eine Liste, ob ein vorhandener
Ordner „aus dieser Vorlage" stammt. **Deckt diese Liste, was sie decken muss?**

**3. Der Aufräumschritt in Phase 6** löscht Dateien in `quartz/static/fonts` eines Projekts, die
keine `@font-face`-Regel mehr nennt — weil der Baustein `fonts` den *Ordner* einpackt, nicht den
Block. Er prüft gegen `FONTS` aus dem Repo. **Was passiert mit einer Schrift, die der Nutzer selbst
dort abgelegt hat?**

**4. Die drei Spaltenschalter je Spalte.** Ein einzelner Schalter war möglich (`var(--x, WERT)` mit
`initial`/leer) und wurde verworfen, weil „leer" in einem Eingabefeld wie „nicht gesetzt" aussieht.
Der Preis der Entscheidung steht im Kommentar: **halbe Zustände sind möglich** — `static` mit
Höhendeckel ist eine Spalte, die mitten im Text aufhört und in sich selbst rollt. **Ist das ein
akzeptabler Preis, und sagt die Oberfläche genug?**

**5. Die Callout-Farben im Variablen-Tab.** Dreizehn gemessene Werte (elf von zwölf Quartz-Farben
fallen auf hellem Grund durch AA) sind jetzt einen Klick weit von einem Wert entfernt, der die
Schwelle reißt, ohne dass die App etwas sagt. Die Kontrastprüfung läuft weiter beim Vorlagenbau.
**Reicht das?**

**6. `z-index: 110`** für die Graph-Vollansicht, begründet mit einer Leiter (80/90/98/99/100/101),
die in vier Dateien verteilt steht. **Trägt die Aufzählung, und gibt es eine siebte Zahl?**

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was der Nutzer verlieren kann

Drei Wege schreiben oder löschen in *fremden* Projekten: der `copy`-Zweig, der Aufräumschritt und
der Vorlagen-Import (`packageWins`, der vorher selbst einen Snapshot anlegt — geprüft in
`templatePackage/index.ts:281`). Am 2026-09-21 sind damit vier echte Websites überschrieben worden.
Eine davon, `quartz-navigations-handbuch`, trägt ein eigenes Stylesheet, das **nur deshalb**
überlebt hat, weil das neue der Vorlage anders heißt (`nav-navigations.scss` statt
`plugin-navigations.scss`). Das war eine bewusste Entscheidung mit einem Satz dazu. **Gibt es
weitere solche Kollisionen, die niemand gesehen hat?**

### 2. Die Kommentare gegen ihre Quellen

Drei falsche Begründungen sind gefunden und korrigiert. `nav-navigations.scss` verkabelt rund 60
Variablen eines fremden Plugins und begründet jede verbleibende Regel damit, dass es dafür *keine*
Variable gebe. Die Quelle liegt daneben (`/Users/boxi/Development/quartz-navigations/src/components/styles/navigations.scss`,
975 Zeilen). **Halte die Behauptungen dagegen.**

### 3. Das Register und die vierte Variante

`variants.mjs` und `basic.mjs` sind neu und tragen die Logik, die vorher in Ternaries stand. Der
Umbau war als „Verhalten unverändert" angelegt und mit 27 Vergleichen belegt. **Stimmt das, und
deckt die Tabelle, was sie zu decken behauptet?**

### 4. Was draußen liegt

Drei Pakete in `boxi-os/quartzcontrol-templates`, fünf Websites, ein Plugin-Tag. **Passt das zu den
Dateien?** Prüfbar ohne die App: `curl` auf die Rohadressen, `unzip -p <paket> manifest.json`, die
Websites im Browser. Die Behauptung, die zu prüfen sich lohnt: *dieselbe Gestaltung, weniger
Inhalt* — 31 Stylesheets in beiden Paketen, 66 Variablen in beiden.

### 5. Die Schichten davor

Schicht 1 nur so weit, wie du sie brauchst.

## Was offen bleibt, und nicht für diese Runde

- **VoiceOver** über Git-Sync und die zwei Boards, **macOS x64 auf einer Maschine seiner
  Architektur**, **ein Linux mit glibc unter 2.34**, **C1 auf einem Linux mit git vor 2.38**.
- **Firefox auf diesem Mac** startet nicht; die Messungen dieser Runde sind in der Debian-VM
  nachgeholt (`docs/decisions/styles-and-fonts.md`, letzter Absatz). Dass sie dort nachgeholt
  *sind*, ist prüfbar; dass die VM der einzige Weg ist, ist eine Behauptung.

## Eine Frage über den Code hinaus

Getrennt von den Befunden, am Ende deines Dokuments:

**Die Runden 32, 33 und 34 haben vor dem RC keinen weiteren Review dieser Art empfohlen, sondern
den Alpha-Test.** Der ist am 2026-09-20 gefahren (`docs/ALPHA-2026-09-20.md`), und danach ist diese
Schicht entstanden — ungeplant, aus einer Nutzeranfrage, und sie hat das eingebaute Paket der App
ausgetauscht und fünf Websites veröffentlicht.

Hältst du nach dem Lesen diese Reihenfolge für richtig gewesen? Und: **Spricht aus diesem Stand
etwas gegen einen RC?** Wenn ja, was genau, und ist es eine Codefrage oder eine des Umfelds
(Pakete, Handbuch, veröffentlichte Artefakte)?

## Form der Befunde

Schreibe `docs/REVIEW-2026-10-09.md`. Je Befund: die Stelle (Datei, Funktion, Commit), was
passiert, wie es sich zeigt, was dagegen spräche es so zu lassen, und — wo du eine hast — eine
Richtung. Nach Gewicht sortiert, Hoch/Mittel/Niedrig. Was du gemessen hast, kennzeichne als
gemessen und sag womit; was du gelesen hast, als gelesen. Eine Behauptung dieses Auftrags, die
nicht trägt, ist ein Befund wie jeder andere — und in dieser Runde wahrscheinlicher als sonst,
weil der Auftrag aus derselben Sitzung stammt wie der Code.

**Ändere nichts am Code und committe nichts**, weder hier noch in `quartz-navigations`. Die einzige
neue Datei ist dein Dokument. Schreibe in keinen Obsidian-Vault außer `Example` und
`QuartzControl-Handbuch`, und in kein Projekt unter `~/Documents/QuartzProjekte/` — Kopien mit
`cp -Rc` sind der Weg. **Veröffentliche nichts**: Die fünf Websites und die drei Pakete sind der
Stand, gegen den du prüfst, nicht der, den du bewegst.
