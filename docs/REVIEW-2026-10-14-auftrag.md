Du bist als zweites Paar Augen an einem Projekt, dessen Fassung `1.0.2` (2026-10-07) draußen ist.
Die nächste soll **1.1** werden, und sie ist keine Fehlerbehebung, sondern der größte Umbau seit
1.0.0. Es geht um ein Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über
die der Nutzer entscheidet.

## Was diese Runde anders macht

**Es ist die erste Runde über neue Funktionen seit dem Release, und sie liest einen halben
Umbau.** Der Plan für 1.1 (`docs/plan-1.1.md`, Umsetzung in `docs/plan-1.1-umsetzung.md`) hat
neun Phasen; acht sind gebaut (P0–P7.4), die letzte (P8: Vorlagen neu bauen, Handbuch, Release)
steht aus. Was P8 nachziehen soll, ist also absichtlich noch nicht da — siehe „Was offen bleibt“.
Ein Befund, der dort schon steht, ist trotzdem einer, wenn er schwerer wiegt, als die Liste sagt.

**Alles, was du liest, hat ein einziges Modell geschrieben**: Claude Opus 5.5, in mehreren
Sitzungen am 2026-10-07, und dieser Auftrag stammt aus derselben Reihe. Das neununddreißigste
Review stammte ebenfalls von diesem Modell. Was hier als „gemessen“ steht, steht aus den
Commit-Nachrichten und `docs/decisions/`; prüfe entsprechend. Eine Zahl, die nicht stimmt, ist ein
Befund.

In der Zählung von `CLAUDE.md` ist das das **vierzigste** Review. Die Dateinamen zählen nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md`. Für diese Runde zusätzlich: `docs/plan-1.1.md` (die Entscheidungen des Nutzers
stehen oben) und `docs/plan-1.1-umsetzung.md`.

## Umfang

Von `main` (= `a282f54`, der Plan für 1.1, lokal und nicht gepusht) bis `review-2026-10-15`:

    git log --oneline main..review-2026-10-15
    git diff main..review-2026-10-15

Das sind 28 Commits auf dem Branch `feat/1.1` und dieser Auftrag; ohne ihn 105 Dateien,
+10 937 / −5 566, davon 59 Dateien unter `docs/` und `scripts/` (der größte Teil davon ist das
Zusammenlegen der Vorlagen-Stylesheets, Schicht 4). Dazu Commits in drei Plugin-Repos und
uncommittete Texte im Example-Vault (Schicht 7).

### Schicht 1 — Messwerkzeuge (P0)

- `0b15be4` `npm run check:option-schema` — zählt je Plugin eines Projekts, welche Optionen die App
  als Feld, als JSON-Text oder gar nicht zeigt. Vorher-Stand gui-test: 280 Optionen, 131 / 6 / 143.
- `0a4e0bd` `scripts/measure-variable-rules.mjs` — drei Platzierungen der Variablenregeln, mit dem
  `sass` des Projekts kompiliert und in Chrome berechnet („Form C“, siehe Schicht 3).
- `a5448e7` `styles-snapshot --site` / `--serve` — misst eine gebaute Website statt der App,
  Seitenliste geteilt mit `check:tokens` (`scripts/example-template/site-pages.mjs`). Rauschboden:
  drei Aufnahmen, 135 298 Werte, leerer Diff; Gegenprobe mit einer zusätzlichen Regel trifft 12 von
  12 Aufnahmen.

### Schicht 2 — der Schema-Leser der Plugin-Optionen (P1)

`shared/pluginOptionSchema.ts` (neu, rein), `electron/main/services/pluginSchemaService.ts`
(umgebaut), Kanal `plugins.optionSchema({ projectPath, source })`.

- `74f9db5` Paket gefunden wie Quartz' `readManifestFromPackageJson`; Quelle `configSchema` →
  `optionSchema` → `.d.ts` → nur `defaultOptions`, die Vorgaben darüber gelegt.
- `d14ed34` Der `.d.ts`-Leser nimmt das Typargument von `QuartzTransformerPlugin<T>` statt des
  ersten `…Options`-Interfaces (multilanguage las `SeoOptions`).
- `1627e71` Cache je Paketordner unter einem Fingerabdruck aus Größe und mtime von `package.json`
  und jeder `.d.ts` unter `dist/` (vorher nie geleert).
- `8c36f13` Schlüssel, die die Config setzt und kein Schema nennt, werden als Feld gezeigt
  (`withPresentKeys`); passt der Wert nicht zum Schema, wird das Feld zur `union`.
- `4db14fd` Der Kanal. **Abweichung vom Plan:** kein `name` im Argument, der Hauptprozess leitet
  ihn aus der Quelle ab.
- `f31db43` Beschreibung, Übersetzung und Widget werden durch ein `$ref` gelesen.

Nachher laut Commits: gui-test 277 Optionen, 267 Feld / 10 Text / 0 unsichtbar.

### Schicht 3 — verwaltete CSS-Blöcke in eigener Datei (P4), dein erster Schwerpunkt

`imports`, `fonts`, `google-fonts` und `css-vars` ziehen aus `custom.scss` nach
`quartz/styles/_quartzcontrol.scss`, das `custom.scss` mit `@use "./quartzcontrol";` vor seiner
ersten Regel lädt. `imported-styles` bleibt. **Diese Phase migriert Dateien der Nutzer**: Ein
Projekt zieht beim ersten Speichern eines verwalteten Blocks um.

- `9b5807b` Ein Schreiber, `writeManagedBlocks()`: erst die verwaltete Datei, dann `custom.scss`
  ohne Blöcke und mit der Zeile — ein Abbruch dazwischen lässt einen Block doppelt stehen, nie
  nirgends. Gelesen wird aus beiden Dateien, die Kopie in `custom.scss` gewinnt. **Abweichung vom
  Plan:** ein Commit statt einer je Aufrufer. Gemessen laut Commit: gui-test-Klon `custom.scss` 657
  → 29 Zeilen, alle 19 CSS-Dateien des Builds vorher/nachher byte-gleich; 1.0.2s `styleService`
  liest das umgezogene Projekt mit **0 Variablen und 0 Stylesheets** und hängt beim Speichern
  seinen eigenen Block an.
- `a1736ca` Bau-Tür `repairManagedUse()`: fehlende Zeile wird gesetzt, fehlende Datei leer
  angelegt, unter dem Stile-Schloss.
- `a416c7c` `_quartzcontrol.scss` als eigener, bearbeitbarer Reiter im CSS-Editor mit Warnband und
  eigenem Veraltet-Band; `styles.save` setzt eine gelöschte `@use`-Zeile wieder.
- `39af502` **Form C:** „nur hell“ wird als dritte Regel `:root:not([saved-theme="dark"])`
  geschrieben (`CssVariableOverride.lightOnly`, auch im zod-Schema), statt die dunkle Grundfarbe
  einzufrieren — Befund 7 des achtunddreißigsten Reviews. Eine dunkle Hälfte, die nur den Grundwert
  wiederholt (die Form von 1.0.1), gilt als ungesetzt.
- `4672886` Der Variablen-Reiter sagt, welche Variablen `custom.scss` selbst per `:root` setzt —
  nach dem Umzug gewinnt dessen Rumpf bei gleicher Spezifität (`styles.variableCollisions`).
- `eff76ca` Das Vorlagen-Skript liest und schreibt um die verwaltete Datei herum.

### Schicht 4 — zwölf statt 31 Stylesheets in der Vorlage (P5)

`f2cdb69`, `67b993f`, `3570c02`: reines Zusammenfügen unter `scripts/example-template/styles/`,
je Abschnitt eine Markierungszeile mit dem alten Namen. **Abweichung vom Plan:** die
Link-Vorschau steht in `pages`, nicht in `content` (gemessen: 4 px mehr in einer
Ordner-Vorschau). Laut Commit an Example und Basis gebaut, drei Breiten, hell und dunkel: 135 170
bzw. 51 930 Elemente, kein Wert geändert; Link-Vorschau per Hover 16/16 und 8/8; Kontrast 93
Paare. Phase 5 löscht in einer alten Werkstatt die 29 übrigen `custom/*.scss`.

### Schicht 5 — das Optionsformular, Snippets und Bilder (P3, P6)

- `81d3de1`, `a24bbf4` `src/components/PluginOptionsForm/`: Schalter, Auswahl, Zahl, Text,
  Abschnitte, Record mit Sprachwahl, Liste, Form-Wahl für `union`, JSON als Rückfall; Bedingungen
  (`x-quartz-when`), gesetzte Werte in verborgenen Feldern unter „Wirkt bei dieser Einstellung
  nicht“, „Weitere Schlüssel“. In einem Record-Eintrag (`byLang`) lesen Bedingungen und ungesetzte
  Felder den Wert darüber. Der alte Kanal `plugin:optionsSchema` und `attachDefaults` sind weg.
- `4be782f` `snippetService.ts`, Kanäle `snippets.list|read|write|import` und
  `staticImage.import`. **Schreibt aus der App in das Projekt**: `dir` aus der Config, Name und
  Endung geprüft, Werkzeugordner und Ausgabeordner verweigert, Decken 2 MB / 20 MB, Schreiben über
  `writableTarget()`, vorhandene Datei → `exists` statt Überschreiben. 26 Fälle laut Commit.
- `c9eca5b` Die Widgets: Snippet-Auswahl mit Neu/Importieren/Bearbeiten, Snippet-Editor mit
  eigenem „Snippet speichern“, „Bild einfügen“ an der Cursorposition. Die Plugins-Seite **speichert
  jede Option sofort**, ohne Speichern-Knopf.

### Schicht 6 — das Layout als Bühne mit Seitenleiste (P7.1–P7.4), dein zweiter Schwerpunkt

`src/routes/LayoutEditor/`:

- `1af6db7` (7.1) Einzeilige Chips, Seitenleiste `Inspector.tsx` (Position, früher/später,
  Anzeige, Bedingung, Gruppe mit `groupOptions`, duplizieren, in den Vorrat), Auswahl über Name und
  Vorkommen (`componentRef`, sticky). **Der Vorrat schaltet aus:** die einzige Instanz, dort
  abgelegt, wird `enabled: false` (der verschobene siebte Nutzerbefund aus 1.0.1). `groupOptions.justify`
  wird nicht angeboten.
- `ef208be` (7.2) `stageGeometry.ts`: Spuren als `fr`-Anteile bei Bezugsbreiten 1456/1000/390,
  Abstände in `cqw`, kein `transform: scale`; Ansichten Desktop/Tablet/Mobil; Breakpoint-Breiten
  wandern in den Reiter „Frames“; „Frame bearbeiten“ über `primeStickyState`.
- `aa3beb2` (7.3) Seitentyp-Wähler auf der Bühne statt eigenem Reiter, Logik in
  `pageTypeOverride.ts`. Laut Commit: neun gleiche Handgriffe im alten Reiter und im neuen Wähler
  schrieben byte-gleiches `byPageType`.
- `f10a636` (7.4) Das Optionsformular in der Seitenleiste, **in den Entwurf der Seite** (Speichern
  im Kopf). Formzeilen brechen um (gegen den Stand davor: 8467 Elemente der Plugins-Seite
  unverändert), die Leiste rollt selbst, und `save()` lässt ein fokussiertes Feld vor dem Lesen los
  (`blur()`, `setTimeout(0)`, Fokus per `id` zurück) — Cmd+S verlor vorher Getipptes.

### Schicht 7 — außerhalb dieses Repos

- `~/Development/quartz-layout-box` (0.4.0, `7d39c2d`), `~/Development/quartz-multilanguage`
  (0.2.0, `85428bf`), `~/Development/quartz-navigations` (0.4.1, `f7cd142`): je ein vollständiges
  `quartz.configSchema` mit `x-quartz-*`-Erweiterungen und Test, **veröffentlicht, gepusht,
  getaggt**. Die Erweiterungen (`x-quartz-when`, `-group`, `-order`, `-advanced`, `-widget`,
  `-keys`, `-l10n`, `-dir-option`) sind ein Format, das außer dieser App niemand liest.
- `~/Obsidian/QuartzProjekte/Example`: 67 Dateien außerhalb von `.obsidian/` uncommittet geändert (Variablentabellen
  neu erzeugt, Texte zu den zwölf Stylesheets), dazu neu gestaffelte mtimes. Nicht committet,
  nicht veröffentlicht.

## Abwägungen, die niemand gegengelesen hat

**1. Ein Umzug, den die Vorgängerfassung nicht lesen kann.** Ein Projekt, das 1.1 einmal
gespeichert hat, liest 1.0.x mit 0 Variablen; speichert 1.0.x dort, steht ein zweiter Block in
`custom.scss`, der in 1.1 gewinnt. Der gewöhnliche Weg dorthin sind zwei Rechner und Git-Sync. Der
Plan beantwortet das in den Release-Notizen (P8), nicht im Code — wie beim Marker-Umzug 2026-09-18.
**Reicht das, und ist „doppelt, nie verloren“ in jeder Reihenfolge der zwei Fassungen wahr?**

**2. Die Rangfolge kippt still.** Nach dem Umzug steht der Rumpf von `custom.scss` hinter den
Variablen. Der Hinweis auf dem Variablen-Reiter nennt Variablen, die `custom.scss` per `:root`
setzt — aber nicht solche aus anderen Selektoren, nicht aus den Stylesheets der Ladereihenfolge,
und nicht für ein Projekt, das noch nicht umgezogen ist. **Ist die Lücke dort, wo ein Nutzer sie
trifft?**

**3. Ein Schloss über zwei Dateien.** `whileHoldingStyles` deckt jetzt Schreiber, die zwei Dateien
nacheinander schreiben. `docs/conventions.md` beschreibt das Schloss noch für eine (P8 soll das
nachziehen). **Gibt es einen Schreiber von `_quartzcontrol.scss` oder `custom.scss`, der nicht
unter dem Schloss läuft, und einen Leser, der zwischen den zwei Schreibvorgängen einen Zustand
sieht, aus dem er etwas Falsches schließt** (etwa die Bau-Tür, die eine fehlende Zeile „repariert“)?

**4. Zwei Speichersemantiken für dasselbe Formular.** Auf der Plugins-Seite schreibt jede Option
sofort, auf der Bühne geht sie in einen Entwurf und wird mit dem Kopfknopf gespeichert. Text- und
Zahlfelder übernehmen in beiden Fällen erst beim Verlassen des Felds. **Ist das für den Nutzer
erkennbar, und gibt es einen Weg, auf dem ein Wert nur in einem der beiden verloren geht** — etwa
ein Routenwechsel über die Seitenleiste, während ein Feld noch fokussiert ist?

**5. Der `blur()`-Griff in `save()`** (`f10a636`, `src/routes/LayoutEditor/index.tsx`). Er
verlässt sich darauf, dass React den Wert nach einem `setTimeout(0)` in den Entwurf gerendert hat,
und liest ihn über einen Ref. Offen und bekannt: Ist das getippte Feld die *einzige* Änderung, ist
Cmd+S gar nicht registriert (es gibt noch nichts `dirty`), und nichts passiert. **Hält der Griff,
und ist die Lücke klein genug?** Und gilt dasselbe Problem für andere Seiten mit Formularen, die
beim Verlassen übernehmen?

**6. Der Vorrat schaltet aus.** `enabled: false` ist die einzige ehrliche Abbildung von „nicht
platziert“, schaltet das Plugin aber für die ganze Website ab — auch für Wirkungen, die keine
Komponente sind (ein Plugin, das zugleich Transformer und Komponente ist). **Ist das an der
Oberfläche gesagt?**

**7. Ein Format, das nur wir lesen.** Die `x-quartz-*`-Erweiterungen stehen jetzt in drei
veröffentlichten Paketen. Sie zu ändern heißt, drei Pakete neu zu veröffentlichen, und was die App
nicht kennt, zählt sie als `notes`. **Ist das Format so beschrieben, dass ein vierter Autor es
schreiben könnte, und sagt die App, wenn sie eine Erweiterung nicht versteht?**

**8. Ein Schema, das sich mit der Config streitet.** `withPresentKeys` macht aus einem Feld, dessen
gesetzter Wert nicht zum Schema passt, eine `union`, statt den Wert zu verstecken. **Kann ein
Nutzer dadurch einen ungültigen Wert dauerhaft für gültig halten?**

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was der Nutzer verlieren kann

Schicht 3 (der Umzug, Abwägungen 1–3), Schicht 5 (`snippetService` schreibt aus der App in das
Projekt — gegen die Regeln über Vertrauensgrenzen, `containedPath()`/`writableTarget()` und
Symlinks in `docs/conventions.md`), und Schicht 6 (ein Entwurf, der mit der Route stirbt,
Abwägungen 4 und 5). Lies `save()` in `LayoutEditor/index.tsx` gegen die Regel „Das registrierte
Speichern schreibt alles, was `dirty` zählt“.

### 2. Was die Website anders zeigt als die App

Form C (`39af502`) gegen die Messung in `docs/decisions/styles-and-fonts.md`; die Bühne
(`stageGeometry.ts`, Ansichten, Seitentyp-Wähler) gegen das, was Quartz wirklich rendert — die
Regeln „Ein Bereich eines Frames ist Geometrie …“ und „Eine Priorität ordnet innerhalb eines
Bereichs …“; das Optionsformular gegen das, was ein Plugin mit dem geschriebenen YAML tut
(Bedingungen, „wie oben“ in `byLang`, `union`).

### 3. Die Oberfläche

Bühne, Seitenleiste und Formular gegen die Renderer- und Gestaltungsregeln: Tastatur und Ansagen
beim Ziehen (die DnD-Regel in `conventions.md` ist in 7.1/7.2 nachgezogen), Fokus nach Ablage,
`SegmentedControl`, Live-Regionen, kein waagerechter Bildlauf bei 1280 und 1728 px, deaktivierte
Controls lesbar, ein Wort ein Name (`de.ts`/`en.ts`).

### 4. Was draußen liegt

Die drei `configSchema` gegen die Optionen, die die Plugins wirklich lesen (gerade die
Bedingungen der Navigations-Varianten), und die Example-Texte gegen die zwölf Stylesheets.

## Was offen bleibt, und nicht für diese Runde

Steht als P8 oder als bekannte Lücke im Gedächtnis der Umsetzung; ein Befund dazu ist nur
willkommen, wenn er schwerer wiegt als hier gesagt:

- **Vorlagen:** Die echte Example-Werkstatt und die Basis-Vorlage tragen noch die 31 Dateien und
  die Blöcke in `custom.scss`; die drei Kopien des eingebauten Pakets sind nicht neu gebaut. Der
  Kommentar in `custom-scss-body.scss` spricht von einem css-vars-Block „further down this file“.
- **Handbuch und Release-Notizen:** Umzug, Rangwechsel eigener `:root`-Regeln, 1.0.x liest
  umgezogene Projekte mit 0 Variablen, ein Paket aus 1.1 trägt „nur hell“; `conventions.md` zum
  Schloss über zwei Dateien und zum Marker-Absatz; Abschnitt „In QuartzControl konfigurieren“ in
  den Plugin-Handbüchern.
- **Bekannte Lücken:** In `byLang`-Einträgen wird die Bedingung `collapsed` ← `collapsible` nicht
  gegen den Wert darüber ausgewertet; ein Ausschluss je Seitentyp ist für eine Komponente im Vorrat
  nicht einzeln schaltbar; multilanguage nennt in `package.json` eine andere `languages`-Vorgabe als
  im Code; `check:tokens` wartet 0,25 s auf den Rauschboden, zu kurz für Seiten, die später ruhig
  werden; ob `variant: tabs` in der Seitenleiste die Tabs-Felder einblendet, ist dort nicht
  bestätigt (im Testklon blieb die Feldzahl bei 87, vermutlich eine alte Plugin-Fassung — auf der
  Plugins-Seite ist es in P3 gemessen).
- **macOS x64 auf einer Maschine seiner Architektur**, **ein Linux mit glibc unter 2.34**, **C1 auf
  einem Linux mit git vor 2.38**, VoiceOver — wie in den Runden davor.

## Eine Frage über den Code hinaus

Getrennt von den Befunden, am Ende deines Dokuments:

**Ist P4 in dieser Form auslieferbar?** Der Umzug ist die einzige Änderung, die Dateien der Nutzer
umschreibt und die die Vorgängerfassung danach falsch liest, und er geschieht ohne Rückfrage beim
ersten Speichern. Die Alternative wäre ein ausdrücklicher Schritt („Projekt auf 1.1 umstellen“)
mit einem Snapshot davor. Spricht aus dem, was du gelesen hast, etwas für die eine oder die andere
Form — und wenn für die stille, was muss dann in P8 stehen?

## Form der Befunde

Schreibe `docs/REVIEW-2026-10-14.md`. Je Befund: die Stelle (Datei, Funktion, Commit), was
passiert, wie es sich zeigt, was dagegen spräche es so zu lassen, und — wo du eine hast — eine
Richtung. Nach Gewicht sortiert, Hoch/Mittel/Niedrig. Was du gemessen hast, kennzeichne als
gemessen und sag womit; was du gelesen hast, als gelesen. Eine Behauptung dieses Auftrags, die
nicht trägt, ist ein Befund wie jeder andere.

**Ändere nichts am Code und committe nichts.** Die einzige neue Datei ist dein Dokument. Schreibe
in keinen Obsidian-Vault außer `Example`, und dort nichts, was die uncommitteten Änderungen
berührt — am besten gar nichts. In kein Projekt unter `~/Documents/QuartzProjekte/` — Kopien mit
`cp -Rc` sind der Weg (und `content/` ist dort oft ein Symlink in einen Vault: in der Kopie
darunter nichts schreiben, auch keine mtimes). Für die gebaute App ein Wegwerf-Profil
(`--user-data-dir`); das Vorlagen-Skript nur mit `QUARTZCONTROL_PROJECT_ROOT` auf einem
Wegwerf-Ordner, weil es seine Werkstatt in die App-Liste einträgt. **Löse keinen
Schlüsselbund-Dialog aus.** In den drei Plugin-Repos nichts ändern. **Veröffentliche nichts**, und
pushe nichts.
