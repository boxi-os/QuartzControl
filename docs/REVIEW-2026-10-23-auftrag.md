Du bist als zweites Paar Augen an einem Projekt, dessen Fassung `1.0.2` (2026-10-07) draußen ist
und dessen nächste, **1.1**, auf dem Branch `feat/1.1` fertig ist. Es geht um ein Review — nicht um
Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Warum diese Runde

**Du bist ein anderes Modell als alles, was du liest.** Die 316 Commits von 1.1, die
siebenundvierzig Reviews davor, ihre Aufträge, die Alpha-Protokolle, das Handbuch und dieser
Auftrag stammen von Claude (zuletzt durchgehend Claude Opus 5.5). Jede Runde seit der
zweiundvierzigsten trägt deshalb denselben Vorbehalt: „vom selben Modell wie die gelesenen Commits“,
„kein zweites Paar Augen“. Der Plan verlangt für das Review vor dem Release ausdrücklich ein
anderes Modell, sofern eines verfügbar ist (`docs/plan-1.1-umsetzung.md`, P8). Das bist du.

Daraus folgt die Haltung: **Nimm nichts als gemessen hin, nur weil es so dasteht.** Jede Zahl in
einer Commit-Nachricht, in `docs/reviews.md` und in `docs/decisions/` hat dasselbe Modell
erhoben, ausgewertet und aufgeschrieben. Wo eine Messung einen Fix trägt, versuche sie zu
widerlegen — mit einem Fall, den sie nicht abdeckt, oder mit derselben Messung, die etwas anderes
ergibt. Blinde Flecken eines Modells wiederholen sich über Runden; such nach Fragen, die keine Runde
gestellt hat, nicht nach Varianten der gestellten.

**Danach kommt nur noch der Release-Tag** (`docs/release.md`, Punkte 1 bis 9): Fassungsnummer,
Pakete, Release-Seite, `latest.json`, das Basis-Template online, die App-Website. Ein Befund nach
dieser Runde erreicht Nutzer — und über das Basis-Template online auch Nutzer von 1.0.x.

In der Zählung von `CLAUDE.md` ist das das **achtundvierzigste** Review. Die Dateinamen zählen nach
Datum, nicht nach Kalender.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln, gekürzt; die Begründungen unter derselben Überschrift in
`docs/decisions/conventions-full.md`. Die Messungen stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md` (am Ende: was aus dem siebenundvierzigsten geworden ist). Dazu
`docs/REVIEW-2026-10-21.md` (das siebenundvierzigste) mit seinem Auftrag, `docs/release.md` (Punkt
2b, Punkt 3, Punkt 4 und die Notizen für 1.1 in Punkt 7), `docs/plan-1.1-umsetzung.md` (P8) und
`docs/ALPHA-2026-10-17.md`.

Das Benutzerhandbuch liegt außerhalb des Repos, im Vault `~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`
(deutsch in der Wurzel, englisch unter `en/`); wie es entsteht und geprüft wird, steht in
`docs/handbuch.md`.

## Umfang

### Block A — `review-2026-10-22..review-2026-10-23`

    git log --oneline review-2026-10-22..review-2026-10-23
    git diff review-2026-10-22..review-2026-10-23 -- electron src shared scripts

25 Commits und dieser Auftrag. Code: 11 Dateien, +167 / −41; dazu `resources/templates/qc-basic.qtpl`
(binär) und Doku. Was jeder Fix behauptet, steht am Ende von `docs/reviews.md` und in seiner
Commit-Nachricht.

- **Die Fixes des siebenundvierzigsten:**
  - `b94a01be` (Hoch 1): Ein Wert „nur hell“ wird in einem nicht umgestellten Projekt in der Form
    von 1.0.1 geschrieben, also mit ausdrücklicher dunkler Hälfte.
  - `9e223ef7` (Mittel 1): Vom Basis-Template im Cache und dem mitgelieferten nimmt die App das mit
    dem neueren `createdAt`.
  - `32471bf3` (Mittel 2): Eine ungeschichtete Deklaration eines eigenen Stylesheets schlägt im
    Variablen-Graphen geschichtete.
  - `3982dab9` (Mittel 3): quartz-navigations 0.4.3 zählt als derselbe Code wie 0.4.2.
  - `f5cafeb0` (Niedrig 5): Der Dev-Server gilt als „running“, wenn der http-Port offen ist und
    entweder der ws-Port antwortet oder Quartz' Zeile „Started a Quartz server listening at …“
    kommt.
  - Die übrigen Niedrig sind Doku: `7d6fbf27`, `3aae5b5b`, `871f127a`, `dfec1735`, `ecabd122`,
    `b32c03bb`, `65252017`.
- **Die Nebenbei-Liste:** `47c22f5f` (ein Paket mit „nur hell“ wird in ein nicht umgestelltes
  Projekt in der Form von 1.0.1 importiert), `28985cba`, `e801eeea`.
- **P8, heute:**
  - `88e45037`: das mitgelieferte Basis-Template, neu gebaut auf navigations 0.4.3.
  - `6e06a333`: Kapitel 4.7 heißt neu; `handbookPages.ts` nennt den neuen Pfad, der alte steht
    als `aliases:` auf der Seite.
  - `33ecf55c`: Bezeichnung in `scripts/routes.mjs`.
  - Dazu Doku: `aa0b4828`, `ee77c96a`, `388bb47d`, `c8aae431`, `552168a4`.
- **Außerhalb des Repos, heute:**
  - Handbuch-Kapitel 4.4 bis 4.9, deutsch und englisch, mit neuen Bildern (Vault bis `ea7e4d0`).
  - Die drei Plugin-Handbücher auf den Stand der Vorlage von 1.1 gezogen und veröffentlicht
    (`plan-1.1-umsetzung.md`, P8, erster Punkt).

### Block B — 1.1 gegen 1.0.2, mit frischen Augen

    git log --oneline v1.0.2..review-2026-10-23      # 317 Commits
    git diff --stat v1.0.2..review-2026-10-23

Nicht als Diff zu lesen. Das siebenundvierzigste Review hat genau diese Grenze schon gelesen (sein
Block B); du sollst sie nicht nachlesen, sondern das finden, was es übersehen hat. Einstieg: dessen
Abwägungen 1 bis 5 und seine Befunde, die Notizen für 1.1 in `docs/release.md` und die Liste
„Kritische Dateien“ im Plan.

## Abwägungen, die niemand gegengelesen hat

Block B zuerst, dann A, dann das Handbuch.

**1. Was ein einziges Modell an der Versionsgrenze übersieht.** Das siebenundvierzigste hat fünf
Fragen zur Grenze zwischen 1.0.2 und 1.1 gestellt und daraus einen Hoch-Befund und zwei
Mittel-Befunde gemacht, alle drei an derselben Stelle: an „nur hell“ und am Basis-Template.
**Welche Begegnung der beiden Fassungen hat keine Runde betrachtet?** Kandidaten, ohne Anspruch:
- ein Projekt, das mit 1.1 *angelegt* wurde (also von Anfang an umgestellt) und dann in 1.0.2
  geöffnet wird;
- Snapshots, die 1.1 schreibt, in 1.0.2 zurückgeholt, und umgekehrt (die neue Art
  `styleMigration`, das Ausdünnen);
- `quartz.lock.json` und `package.json` nach einem Plugin-Update in 1.1, in 1.0.2 weiter benutzt;
- die verwalteten Blöcke, wenn beide Fassungen abwechselnd speichern, mehr als einmal;
- ein Projekt, in dem „Zusammenlegen“ gelaufen ist, in 1.0.2.

Der Satz in den Notizen, „aktualisiert zuerst alle Rechner“, trägt nur, wenn er der einzige nötige
ist.

**2. „Jetzt umstellen“ und „Zusammenlegen“ an echten Projekten.** Beide sind heute an vier echten
Websites und am Benutzerhandbuch gelaufen. Laut `plan-1.1-umsetzung.md` (P8) blieben die
berechneten Stile auf je fünf bis sechs Seiten gleich, mit `scripts/styles-snapshot.mjs --site`.
**Trägt diese Messung?**
- Sechs Seiten je Website, drei Breiten, hell und dunkel, ohne Hover, Fokus oder geöffnete Popups:
  Was ändert die Umordnung von 31 auf 12 Dateien, das so nicht auffällt? Kandidaten sind Regeln mit
  gleicher Spezifität aus verschiedenen alten Dateien, `@media`-Blöcke und Zustände (`:hover`,
  `:focus-visible`, `[open]`).
- Die Bauten von davor und danach liegen im Scratchpad der bauenden Sitzung, nicht im Repo. Du
  musst sie selbst erzeugen, an Kopien.

**3. Das Basis-Template am Release-Tag.** Punkt 4 und 8 von `docs/release.md` legen fest, wann
`qc-basic.qtpl` online geht; `9e223ef7` entscheidet nach `createdAt` zwischen Cache und
mitgeliefertem Paket. **Spiel den Tag durch**, für 1.0.2 und 1.1, jeweils:
- mit dem alten Paket im Cache;
- mit einem Cache, der jünger ist als das mitgelieferte, aber älter als das neue online;
- ohne Netz;
- mit einer Uhr, die falsch geht.

Gibt es einen Zustand, in dem ein Nutzer von 1.1 die zwölf Stylesheets nicht bekommt, oder einer
von 1.0.2 sie bekommt, bevor seine App sie lesen kann?

**4. Ein Server, den die App für laufend hält.** `f5cafeb0` nimmt eine Zeile aus Quartz' Ausgabe
als zweiten Beweis. **Wessen Zeile ist das?**
- ein zweiter Quartz-Server auf demselben Projekt;
- ein Neustart nach einer geänderten Config, der die Zeile ein zweites Mal schreibt;
- eine Ausgabe, die die App nach einem Absturz aus der Logdatei nachliest (`logBuffer`, `logs:history`);
- ein Quartz, das die Zeile in einer anderen Sprache oder Form schreibt.

Die Regel dazu steht in `conventions.md` („Wer einen Zustand aus fremden Ausgabezeilen liest, weiß,
wessen Zeilen er liest“).

Dann Block A:

**5. „Nur hell“, dreimal geschrieben.** `b94a01be` (Editieren), `47c22f5f` (Import) und
`39af502f` (die Form selbst) schreiben dieselbe Sache an drei Stellen nach drei Regeln. **Stimmen
die drei überein**, auch wenn das Theme zwischen Lesen und Schreiben wechselt, das Theme
ausgeschaltet ist, die Variable im Graphen fehlt (der Import lässt sie dann „nur hell“ — was tut
1.0.2 damit) oder das Projekt während der Seite umgestellt wird?

**6. Die Kaskade, nachgerechnet.** `32471bf3` und die neue Regel „Wer die Kaskade nachrechnet,
rechnet die Schichten mit“ beschreiben drei Schichten (`quartz-base`, `obsidian-theme`,
ungeschichtet). **Rechnet `variableGraphService` die Kaskade so, wie Chrome sie rechnet?** Prüfe
das an einem Theme mit eigener `@layer`-Anordnung, an `!important`, an `@media
(prefers-color-scheme)`, an einem Stylesheet, das selbst eine Schicht öffnet, und an der
Reihenfolge innerhalb einer Schicht. Gemessen werden kann das gegen den Browser:
`getComputedStyle` auf der gebauten Website gegen den Wert, den die Variablen-Seite anzeigt.

**7. Kapitel 4.7 und der alte Pfad.** Die alte Adresse soll durch `aliases:` weiterleiten
(`@quartz-community/alias-redirects`); belegt ist das nur durch Lesen des Plugins, nicht durch
einen Bau der App-Website. **Stimmt das für beide Sprachen, mit `quartz-multilanguage` im Projekt**,
das Pfade je Sprache umschreibt? Die Website `QuartzControl-Web` darf erst am Release-Tag online,
also: an einer Kopie bauen, über `--serve` aufrufen, beide alten Pfade. Und: Welche weiteren
Kennungen in `src/data/handbookPages.ts` zeigen auf Seiten, die es in 1.1 inhaltlich nicht mehr
gibt?

**8. Die Plugin-Handbücher, veröffentlicht.** Sie stehen seit heute online (gh-pages
`3fdc430`, `c0530f5`, `ad2927f`) und tragen die Stylesheets von 1.1 mit layout-box 0.4.2,
multilanguage 0.2.0 und navigations 0.4.3. **Sieh sie dir an** — im Browser, nicht im Quelltext,
hell und dunkel, schmal und breit, mit Tastatur. Ein Fehler dort ist sofort öffentlich.

Dann das Handbuch:

**9. Kapitel 4.4 bis 4.9 gegen die laufende App.** `npm run check:handbook` prüft nur Blockzitate.
Alles andere — Aufzählungen von Reitern, Feldern, Zuständen, Reihenfolgen, Bedingungen, „ab acht
Optionen“, „einmal am Tag“, „vor jedem Build und Start des Dev-Servers“ — hat das Modell
geschrieben, das auch die App gebaut hat, nach einem Blick in die App und den Code. **Halte jede
Behauptung gegen die gebaute App**, deutsch und englisch. Eine Aufzählung, die vollständig wirkt
und es nicht ist, ist ein Befund (`docs/release.md`, Punkt 3, nennt den Fall aus 7.3). Achte
besonders auf Sätze, die Verhalten versprechen statt Beschriftungen zu nennen.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was der Nutzer verlieren kann

Abwägungen 1, 2 und 5: ein Projekt, das zwischen den Fassungen etwas verliert, eine Umordnung, die
das Aussehen still ändert, ein Wert „nur hell“, der in einer Fassung verschwindet.

### 2. Was nach dem Release nicht mehr zurückzuholen ist

Abwägungen 3, 7 und 8: das Basis-Template online, die Adresse eines Kapitels, eine veröffentlichte
Website.

### 3. Was die App anders zeigt, als es ist

Abwägungen 4 und 6.

### 4. Was das Handbuch anders sagt, als es ist

Abwägung 9.

## Wenn du misst

An einer **Kopie** eines Projekts (`cp -Rc`), gebaute App mit einem **Wegwerf-Profil**
(`--user-data-dir`). Der Skill `run-desktop` (`.claude/skills/run-desktop/`) zeigt, wie man die
gebaute App über Playwright fährt; `npm run build` baut `out/` dieses Stands. Was es an Skripten
gibt und was sie schreiben, steht in `docs/scripts.md` — **lies dort, bevor du eines mit Optionen
startest.** Besonders `npm run template:example` schreibt in echte Projekte, und
`npm run screenshots` ohne `--demo` arbeitet gegen das echte Profil; beide brauchst du für diese
Runde nicht.

**Für 1.0.2 daneben:** ein lokaler Klon des Tags in deinen Scratchpad (`git clone --branch v1.0.2
/Users/boxi/Development/QuartzControl <scratchpad>/qc-102`, dort `npm ci` und `npm run build`),
kein `git worktree` in diesem Repo. Dieselbe Kopie eines Projekts abwechselnd mit beiden Fassungen
öffnen, je mit eigenem Wegwerf-Profil, und nach jedem Speichern `git diff` in der Kopie.

**Gute Ausgangsprojekte** unter `~/Documents/QuartzProjekte/`, nur als Kopie:
- `gui-test` (umgestellt, zwölf Stylesheets);
- `navigations-testprojekt` (nicht umgestellt);
- `quartz-navigations-handbuch` (seit heute umgestellt, zwölf Stylesheets, fünf Navigationen);
- `QuartzControl-Web` (die App-Website, baut den Handbuch-Vault).

In einer Kopie ist `content/` oft ein Symlink in einen Vault: dort nichts schreiben, auch keine
mtimes. Gebaute Websites nur über `node scripts/styles-snapshot.mjs --site --serve <ordner>` oder
einen eigenen Server auf `localhost` aufrufen. **Die veröffentlichten Plugin-Handbücher** liest du
unter `https://boxi-os.github.io/quartz-navigations/`, `…/quartz-layout-box/` und
`…/quartz-multilanguage/`.

## Was offen bleibt, und nicht für diese Runde

Bekannt und gesammelt; ein Befund dazu ist nur willkommen, wenn er schwerer wiegt als hier gesagt:

- **Der Release-Tag selbst**: Fassungsnummer 1.1.0, `git cherry`, die zehn Pakete, Release-Seite,
  `latest.json`, das Basis-Template online, QuartzControl-Web veröffentlichen und danach die
  Pfadprüfung aus `release.md` Punkt 3. Dass `template:example -- --variant basic --check-sync` bis
  dahin mit 1 endet, weil die veröffentlichte Kopie vom 30. September ist, ist so gewollt. Dass
  `https://boxi-os.github.io/QuartzControl/` bis dahin das Handbuch von 1.0.2 zeigt und die neue
  Adresse von 4.7 dort 404 antwortet, ebenfalls.
- **Entschieden, nicht zu prüfen**: Alte Systemversionen werden nicht unterstützt — ein Linux mit
  glibc unter 2.34 und ein System-git vor 2.38 (`docs/alpha-test.md`, Gruppe D). Offen ist nur
  macOS x64 auf einer Maschine seiner Architektur; dafür gibt es hier keine.
- Aus früheren Runden offen: der Seitentyp `excalidraw` ohne Anzeigenamen; Cmd+S bei nur einem
  getippten Feld der Seitenleiste; eine Komponente im Vorrat je Seitentyp ausschließen; ein
  umbenannter Sprachcode zieht nichts mit; CLI-Schreibvorgänge ohne Schloss der Config.
- Die Website-Projekte (`QuartzControl-Web`, die drei Plugin-Handbücher) sind nicht committet, mit
  Absicht; ihr `v5` ist Quartz' Geschichte.

## Eine Frage über den Code hinaus

Getrennt von den Befunden, am Ende deines Dokuments:

**Ist 1.1 nach dieser Runde veröffentlichbar?** Welche deiner Befunde müssen vor dem Release
behoben sein, welche können in die Release-Notizen, und welche warten auf 1.1.1? Und: **Was hat dir
als anderem Modell an der Arbeitsweise dieses Projekts auffällig geschienen** — eine Art Fehler,
die über die Runden immer wieder vorkommt, eine Messung, die immer gleich gebaut ist, eine Frage,
die nie gestellt wird? Das ist kein Befund am Code, aber der Grund, aus dem du hier bist.

## Form der Befunde

Schreibe `docs/REVIEW-2026-10-23.md`. Je Befund: die Stelle (Datei, Funktion, Commit), was
passiert, wie es sich zeigt, was dagegen spräche es so zu lassen, und — wo du eine hast — eine
Richtung. Nach Gewicht sortiert, Hoch/Mittel/Niedrig, und je Befund, aus welchem Block oder welcher
Abwägung er kommt. Was du gemessen hast, kennzeichne als gemessen und sag womit (und an welcher
Fassung, 1.0.2 oder 1.1); was du gelesen hast, als gelesen. Eine Behauptung dieses Auftrags oder
einer Commit-Nachricht, die nicht trägt, ist ein Befund wie jeder andere. Was dir nebenbei auffällt
und kein Befund ist, kommt in einen eigenen Abschnitt am Ende.

**Ändere nichts am Code und committe nichts.** Die einzige neue Datei im Repo ist dein Dokument.
Schreibe in keinen Obsidian-Vault. In kein Projekt unter `~/Documents/QuartzProjekte/` — Kopien mit
`cp -Rc` sind der Weg. Das Projekt `hinterland-history` nie lesen und aus jeder Schleife und jedem
Glob über Projekte vorher ausschließen, nicht hinterher filtern. **Eintragen, Bauen,
Serverstarten, npm-Installieren und Vorlagen anwenden schreiben in das Projekt**: nur in einer
Kopie. **Für die gebaute App ein Wegwerf-Profil** (`--user-data-dir`), für 1.0.2 ein eigenes;
`npm run smoke` tut das selbst. **Löse keinen Schlüsselbund-Dialog aus**; die echten Zugänge und
Ziele dieses Rechners nicht anfassen und nicht abbilden. Prüfskripte mit Chrome öffnen keine
`mailto:`-Links. In den Plugin-Repos unter `~/Development/` nichts ändern. **Veröffentliche nichts,
deploye nichts und pushe nichts.**
