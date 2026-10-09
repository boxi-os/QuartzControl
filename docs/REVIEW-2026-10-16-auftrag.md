Du bist als zweites Paar Augen an einem Projekt, dessen Fassung `1.0.2` (2026-10-07) draußen ist
und dessen nächste, **1.1**, auf dem Branch `feat/1.1` entsteht. Es geht um ein Review — nicht um
Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Sie liest drei Dinge, die verschieden alt und verschieden geprüft sind.** Teil A sind die Fixes
des einundvierzigsten Reviews, wie jede Runde die Fixes der vorigen liest. Teil B ist die Liste
„Offen auf `feat/1.1`“ aus `docs/plan-1.1-umsetzung.md`, abgearbeitet am Vormittag des
2026-10-09, mit Vorher-/Nachher-Messung je Commit. Teil C ist eine Runde am Abend desselben Tages
nach einer Rückmeldung des Nutzers — **für sie gibt es keinen Plan im Repo**, ein Teil der Commits
nennt keine Messung, und keines der drei Teile hat ein Review gelesen.

**Alles, was du liest, hat ein einziges Modell geschrieben**: Claude Opus 5.5, am 2026-10-09, und
dieser Auftrag stammt aus derselben Linie. Das vierzigste und das einundvierzigste Review stammten
ebenfalls von diesem Modell (je in einem eigenen Agenten). Was als „gemessen“ dasteht, steht aus
den Commit-Nachrichten und dem Plan; prüfe entsprechend. Eine Zahl, die nicht stimmt, ist ein
Befund.

In der Zählung von `CLAUDE.md` ist das das **zweiundvierzigste** Review. Die Dateinamen zählen
nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md` (am Ende: was aus dem einundvierzigsten geworden ist). Dazu `docs/plan-1.1.md`,
`docs/plan-1.1-umsetzung.md` (Abschnitte „Runde nach der Rückmeldung“ und „Offen auf
`feat/1.1`“) und `docs/REVIEW-2026-10-15.md` (das einundvierzigste).

## Umfang

Vom Tag `review-2026-10-16` (der Auftrag des einundvierzigsten) bis `review-2026-10-17`:

    git log --oneline review-2026-10-16..review-2026-10-17
    git diff review-2026-10-16..review-2026-10-17

52 Commits und dieser Auftrag; ohne ihn 75 Dateien, +4 529 / −3 253. Der erste Commit
(`eafc111`) ist das Dokument des einundvierzigsten Reviews selbst. Gut 2 400 der gelöschten Zeilen
sind Kommentare in den zwölf Vorlagen-Stylesheets (`deccfa0`).

### Teil A — die Fixes des einundvierzigsten Reviews (`8ea21a5`..`113757d`, 12 Commits nach dem Review-Dokument)

24 Dateien, +828 / −60 (mit dem Review-Dokument). Was jeder Fix behauptet, steht am Ende von
`docs/reviews.md`; die Befunde in `docs/REVIEW-2026-10-15.md`. Kurz:

- `8ea21a5` die einzige veröffentlichte Sprache zu entfernen fragt — **gemessen ist die Frage,
  nicht das Schreiben**.
- `00ddb72` `DetailLayout` lässt ein Feld der Leiste vor `onDismiss` los.
- `c284ef4` Lade- und Aktionsfehler der Dateien-Karte getrennt — **der echte Papierkorb bleibt
  ungemessen**, auf Linux und im Flatpak erst recht.
- `a1861bf` README-Leser linear in der Länge, auch die zwei HTML-Entferner davor.
- `a6cd398` Snippet heißt wieder wie vorher, wenn die Config nicht folgt; `renameSnippetRefs` je
  Leseort und Ordner.
- `94a5d0e` `focusRowAt` nach `flushSync`.
- `2d108a2` Fassung, gegen die jede Plugin-Abschrift gelesen ist — **von Teil B weitergebaut**
  (`878c8d7`, `9712748`, `982c189`).
- `8512daf` Verlassen-Frage auf Veröffentlichen und Zugängen — **von Teil B weitergebaut**
  (`cb07d39`).
- `79bee11` erster Layout-Reiter „Seitentypen“ — **von Teil C zurückgenommen** (`796c359`: er heißt
  wieder „Übersicht“).
- `97f944b` `SELECTING` nennt Bedienelemente statt `[role]`.
- `0b30b14`, `113757d` Chronik, Regel „Liste mit Leiste“ in `conventions.md`, Offen-Liste.

**Frage zu Teil A:** Trägt jeder Fix, was er behauptet — und hat Teil B oder C einen davon wieder
aufgemacht? `79bee11` ist ausdrücklich zurückgenommen; prüfe, ob damit das Wort-Problem, das
Befund 9 des einundvierzigsten benannt hat („Übersicht“ als Reiter des Layouts *und* als Seite der
Sidebar), wieder dasteht, und ob das eine Entscheidung ist, die irgendwo gesagt wird.

### Teil B — die Offen-Liste (`2f708a9`..`e9f538b`, 25 Commits)

37 Dateien, +1 549 / −326. Jeder Punkt steht mit Messung im Plan, Abschnitt „Offen auf
`feat/1.1`“. Die Teile, die schreiben:

- **Plugins → Installiert**: Schalter und Pfeile gehen über dieselbe Warteschlange `commit()` wie
  die Felder (`2f708a9`); das Entfernen steht ebenfalls darin, die Felder der Leiste sitzen in
  einem während des Entfernens gesperrten `fieldset` (`85ba1b2`); eingebaute Plugins werden über
  `quartzPluginName(source)` entfernt (`14ec6db`).
- **Mehrsprachigkeit**: `writeLanguages` legt die Sprachen in die gelesene Liste zurück, eine
  unveränderte Sprache bleibt in ihrer Schreibweise, Einträge ohne Code bleiben stehen (`d505e79`).
- **Die Bau-Tür schreibt jetzt in das Projekt**: `repointAuthoredFrames` läuft bei `projects.add`
  *und* vor jedem Build und Serverstart (`c448709`) — es schreibt Config, Lockfile und Symlinks
  unter `.quartz/plugins/`, wenn es Pfade eines anderen Projekts findet.
- **Zwei Formate der CLI**: `quartz.config.yaml` mit `lineWidth: 120` (`1d4f2b4`), das Lockfile mit
  Zeilenumbruch am Ende (`6004171`). Laut Plan wird jedes Projekt, das zuletzt die App geschrieben
  hat, beim ersten Speichern einmal neu umgebrochen.
- **Fremder Code im Hauptprozess**: `layoutFrames.quartzMeasures` (neuer Kanal) kompiliert mit dem
  `sass` des Projekts ein Stück SCSS gegen dessen `variables.scss` (`06b50eb`); die Bühne nimmt die
  Maße auch (`fdef35b`). `conventions.md` nennt das als Erweiterung der ersten der „genau zwei
  Stellen“.
- **Die drei Abschriften** gegen die installierten Plugins: `npm run check:plugin-copies`
  (`878c8d7`, 645 Fälle), die 20 Abweichungen des ersten Laufs behoben (`9712748`), quartz-layout-box
  0.4.1 gelesen, mit `nullBreaks` für ältere Fassungen (`982c189`).
- **Prüfskripte**: `check:i18n` meldet jetzt auch ungenutzte Schlüssel, 16 sind gelöscht
  (`1dbe754`); `npm run smoke` läuft in einem Wegwerf-Profil (`8b01477`).
- Kleineres: Menü-Sprung fragt (`cb07d39`), `SavesImmediately` in jeder Plugin-Leiste
  (`2ec6a2ce`), Textfeld schrumpft in die Leiste (`001a8ee`), Begründung der Einstellungsbreite
  (`5041e79`), Rücksetzknopf als Symbol (`51de659`), Kartenname (`1514567`), Auge an ausgeblendeten
  Chips (`c02014e`), `owner/.` abgewiesen (`d6dcb1a`).

### Teil C — die Abendrunde (`869da1b`..`a06f654`, 14 Commits)

52 Dateien, +2 204 / −2 919 (davon die Kommentare). Ohne Plan im Repo; was die Commits behaupten,
steht nur in ihren Nachrichten. **`fe6460c`, `76ce263`, `b12ba81`, `a744db5`, `3fcb0a8` und
`fe22526` nennen keine Messung.**

- **Zusammenlegen der Stylesheets** (`f957201`, `a06f654`): „Zusammenlegen“ auf dem Reiter
  *Eigenes CSS* macht für ein Projekt, was `f2cdb69` für die Vorlage tat — 31 Dateien zu zwölf, nach
  einem Snapshot `styleMigration`; abgeschaltete und eigene Stylesheets bleiben, eine eigene Datei
  mit einem der neuen Namen wird beiseitegelegt (`callouts-2.scss`). Logik in
  `shared/stylesheetConsolidation.ts`, Kanal in `styleService.ts`, Prüfskript
  `check:stylesheet-consolidation`. Behauptet: an Klonen von Example und gui-test vorher/nachher
  gebaut, 135 182 und 44 918 Elemente, kein berechneter Wert verändert.
- **SVG als Code in ein Snippet** (`06c05e9`): neuer Kanal `staticImage.readSvg` (nur `.svg`,
  höchstens 2 MB), **bereinigt wird im Renderer** (`src/utils/inlineSvg.ts`): `script`,
  `foreignObject`, `on*`-Attribute, `javascript:`/`data:`-Links. Das Ergebnis steht danach in einem
  Snippet, das auf **jeder Seite der gebauten Website** gerendert wird. **Nicht gemessen: die Box
  auf einer gebauten Website.**
- **Layout → Übersicht als Matrix** (`796c359`, `a744db5`, `fe22526`): Komponenten × Seitentypen,
  fünf Symbole statt Wörtern, eine Zeile je Gruppe mit „eigener Bereich oder Flex-Gruppe“,
  `PageTypeOverview.tsx` ersetzt durch `LayoutOverview.tsx` (495 Zeilen).
- **Kopf über beiden Layout-Arbeitsflächen** (`EditingContext.tsx`, `fe6460c`).
- **Flex-Gruppen mit `wrap`** (`76ce263`): ein dritter Containerwert, die Vorgabe schreibt keinen
  Schlüssel, „weil Quartz einen fehlenden als `nowrap` liest“.
- **Projektbild in der Dateien-Karte**, schreibgeschützt (`b12ba81`).
- **Oberfläche**: `overscroll-contain` aus der Leiste entfernt (`869da1b`), `InfoNote` ohne 95ch
  (`e5384da`), `FoldBox` und `PanelSection` in `ui.tsx`, Rücksetzknopf neben dem Namen der Option
  (`4cd2079`), „der Frame“ statt „das Frame“ in den deutschen Texten (`3fcb0a8`).
- **Vorlagen-Stylesheets**: 2 551 Kommentarzeilen auf 624 gekürzt (`deccfa0`), behauptet
  byte-gleiches komprimiertes CSS vor und nach. **Gemessen beim Schreiben dieses Auftrags**
  (`template:example -- --check-sync`): Das Example-Projekt trägt noch die 31 Stylesheets von
  davor, das Repo die zwölf — das ist P8 und bekannt, aber jede Messung an „der Vorlage“ muss
  sagen, welche Seite sie meint.

## Abwägungen, die niemand gegengelesen hat

**1. Ein Lesepfad, der schreibt.** Die Bau-Tür war bisher eine Tür, an der Frames *erzeugt* werden
(`writeAllFrames`); jetzt schreibt sie auch Config und Lockfile um (`c448709`). Fünf Seiten halten
eine Kopie der Config im `useState`, und die Regel lautet: „ein Dokument wird nie über eine Aktion
hinweg gehalten, die Main daran schreiben könnte“. **Was passiert, wenn auf einer Seite mit
ungespeicherter Config ein Build oder Serverstart läuft und danach gespeichert wird — und läuft das
Umschreiben unter irgendeinem Schloss, gegen ein gleichzeitiges Speichern, eine CLI-Plugin-Aktion
oder einen zweiten Build?** Und: Wann hält es einen Pfad für „fremd“ — kann ein Projekt, das
absichtlich die Frames eines anderen nennt, dadurch seine Config verlieren?

**2. Einmal alles neu umbrechen.** `lineWidth: 120` heißt, dass das erste Speichern nach dem Update
in jedem Projekt hunderte Zeilen ändert (gemessen: 218 von 547 in gui-test). **Was sieht der Nutzer
davon auf Git-Sync, in einem Snapshot-Vergleich und bei einem Core-Update** (das `package.json` und
Lockfile nach eigenen Regeln behandelt, die Config aber über git mergt)?

**3. Ein Bereiniger im Renderer für Code, der auf der Website läuft.** `inlineSvg.ts` entscheidet,
was aus einer fremden SVG-Datei in ein Snippet kommt, das jede Seite rendert. Die Liste ist eine
Sperrliste. **Was kommt durch** — `<use href>` auf eine fremde Adresse, `<animate>`/`<set>`, die ein
`href` auf `javascript:` setzen, entitätskodierte Schemata, `xlink:href`, `<style>` mit `url()` oder
`@import`, `<iframe>`/`<embed>` in einem `foreignObject`-freien Baum, ein Namensraum-Präfix vor
`script`? Und: Gehört eine solche Entscheidung nach den Regeln über Vertrauensgrenzen in den
Renderer oder in den Hauptprozess? Gibt es einen Bereiniger, den die App schon mitbringt?

**4. Zusammenlegen ist ein Formatwechsel.** `conventions.md` sagt über `_quartzcontrol.scss`:
„ein Bezeichner, den ein anderer Rechner schon geschrieben hat, ist ein Format“, und deshalb zieht
kein Schreiber ein Projekt still um. **Gilt dasselbe für die zwölf Dateinamen — was liest 1.0.2
in einem zusammengelegten Projekt, das per Git-Sync auf einen zweiten Rechner reist, und was
schreibt es dort?** Läuft das Zusammenlegen unter dem Stile-Schloss? Ist es idempotent, auch nach
einem Restore des Snapshots, nach einem halben Lauf, mit einer abgeschalteten Datei, deren
Gegenstück eingeschaltet ist?

**5. Ungenutzte Schlüssel gelöscht.** `check:i18n` sagt in die eine Richtung „kein Literal, kein
Template, kein Präfix kann diesen Schlüssel buchstabieren“ und hat 16 Schlüssel gelöscht. 99
berechnete Aufrufe bleiben ungeprüft. **Ist einer der 16 über einen solchen Aufruf erreichbar** —
dann rendert i18next ihn als Schlüssel, und kein Prüfskript sieht es.

**6. Fünf Symbole statt Wörter.** Die Übersicht zeigt je Zelle eines von fünf Zeichen. **Liest ein
Screenreader die Tabelle als Tabelle, mit Spalten- und Zeilenkopf, und sagt er je Zelle das Wort,
nicht das Zeichen?** Und stimmen die Zellen mit dem, was Quartz je Seitentyp baut — insbesondere
„kein Platz im Frame“ für eine Gruppe, die ein Frame als eigenen Bereich führt (die Regeln „Ein
Bereich eines Frames ist Geometrie …“ und „Eine Priorität ordnet innerhalb eines Bereichs …“)?

**7. `wrap` nach Quartz' Regel.** Die Begründung steht im Kommentar, nicht in einer Messung.
**Kennt Quartz' `FlexGroupConfig` den Schlüssel, und wie liest es einen fehlenden?** Die Regel
„Ein Wert, den ein fremdes Programm vergleicht, wird nach dessen Regel gebildet — und gegen das
fremde Programm geprüft“ gilt auch hier.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was der Nutzer verlieren kann

Abwägungen 1, 2 und 4; die Warteschlange der Plugin-Leiste mit Entfernen und gesperrtem `fieldset`
(`85ba1b2`) gegen jeden Weg aus der Leiste (Escape, Klick ins Leere, andere Zeile, Sidebar,
Cmd+S, Menü); `writeLanguages` (`d505e79`) beim Umbenennen und Entfernen; Teil A gegen B und C.

### 2. Was von draußen hereinkommt

Abwägung 3; `quartzMeasures` gegen die Regel über Code aus dem `node_modules` eines Projekts im
Hauptprozess (Wo läuft er, was kann eine präparierte `variables.scss` dort tun, gibt es eine
Frist?); der neue Kanal `staticImage.readSvg` gegen `containedPath()`/Symlink-Regeln.

### 3. Was die App anders zeigt als die Website oder das Plugin

Abwägungen 6 und 7; die Maße des Standard-Frames aus `variables.scss` gegen eine gebaute Seite;
die Abschriften gegen `check:plugin-copies` (läuft das Skript bei dir durch, und deckt es, was der
Editor tatsächlich faltet?); „kein berechneter Wert verändert“ beim Zusammenlegen.

### 4. Die Oberfläche

Die neuen Primitives `FoldBox` und `PanelSection` gegen „`ui.tsx` wrappt native Elemente;
erweitern statt daneben bauen“ und `CardHeading`; `overscroll-contain` weg — rollt jetzt die Seite
unter einer Leiste, die *etwas* zu rollen hat, wenn deren Ende erreicht ist?; „der Frame“ über App
**und Handbuch** (`npm run check:handbook` prüft Zitate; das Handbuch liegt außerhalb dieses
Repos); kein waagerechter Bildlauf bei 1280 und 1728 px; „Übersicht“ als Wort zweimal.

## Was offen bleibt, und nicht für diese Runde

Bekannt und gesammelt; ein Befund dazu ist nur willkommen, wenn er schwerer wiegt als hier gesagt:

- **P8** steht weiter aus: Vorlagen neu bauen (das Example-Projekt trägt noch 31 Stylesheets),
  Handbuch-Kapitel und Screenshots für die neuen Reiter und Leisten, Release-Notizen.
- Der Seitentyp `excalidraw` hat keinen Namen in `layoutEditor.pageTypes`.
- Ein umbenannter Sprachcode zieht weder Inhaltsordner noch `byLang`-Schlüssel anderer Plugins mit.
- `ReadmeText` kennt keine Bilder, keine verschachtelten Listen, keine HTML-Tabellen.
- Messungen, die die Config schreiben, legen Snapshots an.
- Kein Projekt ist auf quartz-layout-box 0.4.1 gehoben.
- Rückstand außerhalb von 1.1, wie am Ende von `docs/plan-1.1-umsetzung.md`: VoiceOver, Linux-
  Schlüsselbund, **macOS x64**, **glibc unter 2.34**, **C1 mit git vor 2.38**.

## Eine Frage über den Code hinaus

Getrennt von den Befunden, am Ende deines Dokuments:

**Die Abendrunde hat sechs Commits ohne Messung und ohne Plan.** Die Arbeitsregel in `CLAUDE.md`
lautet „ein Befund pro Durchgang, jeweils mit Typcheck, Build, Smoke und eigenem Commit“ und „was
nur ein laufendes Programm beantworten kann, wird an der gebauten App gemessen“. **Gilt diese Regel
auch für Arbeit nach einer Rückmeldung des Nutzers, die kein Review-Befund ist — und wenn ja,
welche der sechs hätte eine Messung gebraucht, und welche Messung?**

## Form der Befunde

Schreibe `docs/REVIEW-2026-10-16.md`. Je Befund: die Stelle (Datei, Funktion, Commit), was
passiert, wie es sich zeigt, was dagegen spräche es so zu lassen, und — wo du eine hast — eine
Richtung. Nach Gewicht sortiert, Hoch/Mittel/Niedrig, Teil A, B und C gemischt. Was du gemessen
hast, kennzeichne als gemessen und sag womit; was du gelesen hast, als gelesen. Eine Behauptung
dieses Auftrags, die nicht trägt, ist ein Befund wie jeder andere. Was dir nebenbei auffällt und
kein Befund ist, kommt in einen eigenen Abschnitt am Ende.

**Ändere nichts am Code und committe nichts.** Die einzige neue Datei ist dein Dokument. Schreibe
in keinen Obsidian-Vault. In kein Projekt unter `~/Documents/QuartzProjekte/` — Kopien mit
`cp -Rc` sind der Weg (und `content/` ist dort oft ein Symlink in einen Vault: in der Kopie
darunter nichts schreiben, auch keine mtimes). `gui-test` ist das Testprojekt der Sitzung; es hat
uncommittete Änderungen (Config, Lockfile, **zusammengelegte Stylesheets**), die dem Nutzer
gehören — auch dort nur in einer Kopie arbeiten. **Bauen und Serverstarten schreiben jetzt in das
Projekt** (Abwägung 1): nur in einer Kopie. Für die gebaute App ein Wegwerf-Profil
(`--user-data-dir`); `npm run smoke` tut das jetzt selbst. Eine Messung, die die Config schreibt,
legt im Projekt einen Snapshot an — in einer Kopie egal, im Original nicht. **Kein Papierkorb des
Systems**: `staticFiles.trash` nur mit einem im Hauptprozess ersetzten `shell.trashItem`. Eine
präparierte SVG nur in einer Kopie, und eine gebaute Website damit nur über `--serve` auf
`localhost`. **Löse keinen Schlüsselbund-Dialog aus**; die echten Zugänge und Ziele dieses Rechners
nicht anfassen und nicht abbilden. In den drei Plugin-Repos nichts ändern. **Veröffentliche
nichts**, und pushe nichts.
