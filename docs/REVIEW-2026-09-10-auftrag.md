Du bist als zweites Paar Augen an einem Electron-Projekt, das kurz vor einer Beta steht. Es geht um
ein Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites. Repository: /Users/boxi/Development/Quartz-GUI.

Lies zuerst `CLAUDE.md` im Wurzelverzeichnis. Dort stehen die Konventionen dieses Projekts als
Regeln, die Messungen dahinter in `docs/decisions/`. Ein Befund, der gegen eine dieser Regeln
verstößt, ist ein Befund; ein Befund, der eine Regel für falsch hält, ist auch einer — braucht dann
aber die Begründung.

## Umfang

Der Diff seit dem Tag `review-2026-09-09`. **Nicht seit dem Dateinamen dieses Auftrags** — der ist
geraten, der Tag ist es nicht.

    git log --oneline review-2026-09-09..main
    git diff review-2026-09-09..main -- electron/ src/ shared/ scripts/

13 Commits, im App-Code 12 Dateien, +432/−82; mit den Dokumenten (dieser hier eingerechnet)
18 Dateien, +1268/−102.

**Dieser Diff hat nur eine Schicht, und das ist neu.** Er besteht fast vollständig aus den acht
Fixes des sechsten Reviews (`docs/REVIEW-2026-09-09.md`) plus einem Nachtrag, den ich beim
Schreiben dieses Auftrags an meiner eigenen Änderung gefunden habe. Kein zweites Vorhaben liegt
darunter. Drei Viertel der Zeilen stecken in zwei Dateien:

    electron/main/services/layoutFrameService.ts   288 Zeilen berührt   (Kern)
    shared/gridFrameCss.ts                          77 Zeilen berührt   (die Kandidatenrechnung)

Lies `docs/REVIEW-2026-09-09.md` und `docs/REVIEW-2026-09-09-auftrag.md` mit — nicht als Wahrheit,
sondern als das, was behauptet und wonach zuletzt gesucht wurde. Das Review davor
(`-2026-09-08.md`) hilft für den Ton, ist aber inhaltlich erledigt.

## Eine Besonderheit, die du wissen musst

**Die Commits stammen von demselben Modell, das diesen Auftrag schreibt** — und diesmal ist die
Lage schärfer als beim letzten Mal: Ich habe nicht nur die Fixes geschrieben, ich habe auch
entschieden, *was* an den Befunden des sechsten Reviews behoben wird und wie weit. Zwei dieser
Entscheidungen hat der Nutzer getroffen (unten benannt), die übrigen sechs ich allein.

Drei Dinge folgen daraus:

- Lies die Commit-Nachrichten als Behauptungen. In diesem Projekt gilt eine Zahl in einer
  Commit-Nachricht als Messung; wenn eine nicht trägt, ist das ein Befund. In diesem Diff stehen
  besonders viele — Vorher-Nachher-Tabellen an fast jedem Commit. Sie stammen fast alle aus
  **einem** Messweg (unten), und wenn der Messweg das Falsche misst, stimmt keine davon.
- Prüfe besonders, wo ich **eine Zahl, eine Grenze, einen Ort oder einen Umfang gewählt** habe.
- **Alles ist auf macOS gemessen.** Linux ist abgeleitet, Windows kommt nicht vor.

## Der Messweg, auf dem fast alles ruht

Die Frame-Befunde sind nicht an einem echten `quartz build` gemessen, sondern so:

1. `electron/main/services/layoutFrameService.ts` wird mit esbuild gebündelt
   (`--platform=node --format=cjs --alias:electron=<stub>`), damit `writeAllFrames` und
   `frameDefinitionProblem` in reinem Node aufrufbar sind.
2. Ein Wegwerf-Projekt bekommt eine `quartz.config.yaml` und eine `frame.json`.
3. Das erzeugte `dist/frames.js` wird importiert — mit einem selbstgeschriebenen `preact`, dessen
   `h()` nur `{type, props, children}` zurückgibt — und `Frame.render(props)` mit Stub-Komponenten
   aufgerufen, deren **Funktionsname** `Flex`, `Search` usw. lautet. `console.warn` wird abgefangen.

Das ist bequem und schnell, und es hat eine Annahme in sich: **dass die Listen, die ich dem Frame
übergebe, das sind, was Quartz übergibt.** Wenn das nicht stimmt, ist die ganze Kandidaten-Logik
gegen ein Phantom geprüft. Ein echter Build mit einem Gruppen-Frame ist in dieser Sitzung **nicht**
gelaufen. Das ist die erste Frage dieses Auftrags.

## Was in diesem Diff steckt

### 1. Die Gruppenordnung gehört dem Seitentyp (`6bf7f40`) — der große Eingriff

Bis hierher backte der Codegen **eine** Gruppenordnung je Position in das Frame (`GROUP_ORDER`),
gerechnet aus der ganzen Config. Der Befund: Quartz baut je Seitentyp ein eigenes Layout
(`loadQuartzLayout` wirft `byPageType.<t>.exclude` hinaus, ruft dann `buildLayoutForEntries` samt
`resolveGroups`, leert danach die Positionen aus `positions`), sagt dem Frame den Seitentyp aber
nie — `PageFrameProps` trägt ihn nicht, `componentData` auch nicht.

Meine Lösung: `groupLayoutCandidates()` (`shared/gridFrameCss.ts`) rechnet **alle** Ordnungen aus,
die die Config hergeben kann — die globale und je eine pro Seitentyp —, gleiche fallen weg. Das
Frame bekommt sie alle als `GROUP_LAYOUTS`, und `pickGroupOrder()` wählt beim Rendern die, deren
Gruppenzahlen zu **allen sechs Positionen** passen. Genau eine Treffende ist die Antwort; mehrere,
die auf den geteilten Positionen dieselben Gruppen in derselben Reihenfolge nennen, sind dieselbe
Antwort; alles andere ist Raten und fällt zurück.

Woran ich zweifle, in dieser Reihenfolge:

- **Der Preis ist eine Regression, und ich habe ihn akzeptiert.** Ein Seitentyp, dessen `exclude`
  die Reihenfolge zweier Gruppen kippt, macht die Aufteilung für *jede* Seite unentscheidbar — auch
  für die Standardseiten, die vorher richtig aufgeteilt waren. Das ist bewusst so (raten hieße
  vertauschen), aber es heißt: **ein Klick im Reiter „Seitentypen“ kann die Aufteilung des ganzen
  Projekts abschalten.** Der Nutzer hat diese Richtung gewählt, in Kenntnis des Preises. Ob die
  Meldung ihn trägt, ist offen.
- **Der Rat in der Meldung** lautet, den Gruppen unter `layout.groups` eine ausdrückliche Priorität
  zu geben. Das ist gegengeprüft (danach fallen die Kandidatinnen zusammen), und die Oberfläche kann
  es auch — `GroupsPanel` im Reiter „Global“ hat ein Feld „Priorität“ (`GlobalBoard.tsx:832`). Die
  Meldung nennt aber den yaml-Schlüssel, nicht den Weg dorthin, und sie steht englisch im Build-Log
  einer sonst deutschen Oberfläche. Ob ein Rat, den der Leser erst übersetzen muss, ein Rat ist,
  entscheidest du.
- **`template` wird bei den Kandidaten ignoriert.** Ein Seitentyp, der über `template` ein *anderes*
  Frame benutzt, liefert trotzdem eine Kandidatin für dieses Frame. Konservativ gedacht — eine
  Kandidatin zu viel führt höchstens zum Rückfall —, aber sie kann eine Mehrdeutigkeit *erzeugen*,
  die es in Wirklichkeit nie gibt. Ich habe das gewählt, weil die App nicht sicher weiß, welcher
  Seitentyp welches Frame auflöst (`override.template ?? pageType.frame ?? "default"`). Ist die
  Abwägung richtig herum?
- **`GROUP_LAYOUTS` hat keine Obergrenze.** Ein Projekt mit vielen Seitentypen backt viele Ordnungen
  in *jedes* Frame. Keine Messung dazu, keine Grenze.
- **`pickGroupOrder` läuft einmal je Seite**, also über hundertmal je Build, und filtert dabei über
  alle Kandidatinnen. Nicht gemessen.
- **Die Erkennung ruht weiter auf `C.name === "Flex"`**, also auf esbuilds `keepNames` in Quartz'
  eigenem Build. Das war schon im letzten Auftrag die Grundlage und ist es geblieben.
- Die Dedupe-Rechnung vergleicht `JSON.stringify` über sortierte Positionen. Reicht das?

### 2. Umbenennen lässt die Gruppe stehen (`7ca771b`)

`updateAreaName` benannte die Gruppe eines Bereichs mit um und zerschnitt damit die Bindung an die
Komponenten in der Config. Jetzt bleibt `group`, wie es ist.

**Damit ist ein Zustand möglich, den es vorher nicht gab: `area.name !== area.group`.** Der Rest des
Editors ist unter der Annahme geschrieben worden, dass die beiden gleich sind. Ich habe zwei Folgen
gesehen und behandelt — der Schalter zeigt die Gruppe an, sobald sie abweicht, und zwei Bereiche
derselben Belegung mit derselben Gruppe blocken das Speichern (`duplicateAreaGroups`, neu). Was ich
*nicht* systematisch durchgegangen bin: jede andere Stelle, die `area.name` und `area.group`
nebeneinander benutzt. Der Codegen tut es (Klassenname aus `name`, Bindung aus `group`).

Offen geblieben und bewusst so: Wer den Schalter aus- und wieder einschaltet, bindet den Bereich an
eine Gruppe mit dem *neuen* Namen — dieselbe Trennung wie vorher, nur jetzt als ausdrückliche
Handlung. Ich halte das für vertretbar; es ist nirgends gesagt.

### 3. Der Wächter am Vorlagen-Import (`1a4f146`)

`saveFrame` prüft eine Definition jetzt, bevor sie zu Dateien wird: das zod-Schema des IPC-Kanals,
plus zwei gleiche Bereichsnamen, plus zwei Bereiche derselben Belegung auf derselben Gruppe.

- **Ein Dienst importiert damit aus `electron/main/ipc/schemas.ts`.** Das ist in diesem Projekt neu
  (eine einzige andere Datei erwähnt die Schemas, und nur im Kommentar). Ist die Richtung richtig,
  oder gehört das Schema woandershin?
- **Was vorher durchging, geht jetzt nicht mehr durch.** Ich habe gegengeprüft, dass die vier Frames
  des Beispielprojekts und die vier der Beispielvorlage passieren — aber ein `.qtpl`, das jemand vor
  Monaten exportiert hat, habe ich nicht. Gibt es eine ältere, legitime Gestalt, die das Schema
  ablehnt? `migrateGridFrameDefinition` läuft davor, aber es formt nur die Vor-Breakpoint-Gestalt um.
- Der Dry-Run meldet abgelehnte Frames als `invalidFrame:<name>` — ohne den Grund. Die Zeile beim
  Import nennt ihn, der Plan nicht.

### 4. Was der Wächter nicht schafft, steht im Build-Log (`890a4e1`)

`writeAllFrames` gibt jetzt Sätze zurück, statt in `console.error` zu schweigen, und `buildService`
legt sie beim Bauen in `buildLog` und beim Serverstart in das Server-Log.

- Beide gehen auf **`stderr`**. Die Konsole färbt stderr ein; eine Reparatur-Warnung ist damit
  optisch ein Fehler des Builds, der sie gar nicht verursacht hat.
- Die Sätze sind Nutzertexte im Hauptprozess (`mainT`) und stehen mitten in einer Ausgabe, die sonst
  Quartz gehört und englisch ist. Gewollt?
- Ein unlesbares `quartz.config.yaml` erzeugt jetzt *zwei* Meldungen an verschiedenen Orten (diese
  hier und die, die Quartz gleich danach schreibt).

### 5. Atomar schreiben und ein Schreiber je Projekt (`17b335a`, `a31fa52`)

`dist/frames.js` und `package.json` gehen über `writeFileAtomic()` (aus `writeJsonFile`
herausgelöst), und `serialised()` hält einen Schreiber je Projekt.

- **`serialised()` ist eine Promise-Kette in einer Modul-`Map`.** Sie räumt sich selbst auf, wenn
  nichts nachrückt. Zwei Dinge daran sind ungeprüft: ob die Aufräumbedingung wirklich greift, und
  was passiert, wenn eine serialisierte Funktion je eine andere aufruft (heute tut es keine —
  morgen?).
- **Der Nachtrag `a31fa52` ist ein Fix an meinem eigenen Fix**, und seine Begründung ist
  **strukturell, nicht gemessen**: Ich konnte das Fenster nicht herstellen. Wenn du es kannst, oder
  wenn du meinst, dass es keins gibt, ist beides ein Ergebnis.
- Die Torso-Messung (18 von 401 gegen 0 von 23771) ist an einer 90-KB-Datei mit einem Schreiber und
  einem Leser gemacht, **nicht** an Quartz' echtem Import.

### 6. Die zwei kleinen (`61d2438`, `774d140`, `b54e02b`)

Die Sprache, die das Screenshot-Skript zurückgibt (an der gebauten App mit Wegwerf-Profil gemessen,
vier Fälle); ein Kommentar, der „exactly“ behauptete; ein Absatz in `docs/decisions/`, der einen
entfernten Aufruf im Präsens beschrieb. Klein, aber alle drei sind Behauptungen über Verhalten —
prüf sie wie die anderen.

## Was ausdrücklich kein Befund ist

- Dass die Seitenleiste „Backups“ sagt und alles darin „Snapshot“: bekannt, notiert, Oberfläche bis
  zur Beta eingefroren.
- Dass die Beispielvorlage zwei leere Bereiche mitbringt, die +2rem kosten: gemessen, vom Nutzer
  entschieden.
- Dass `GlobalBoard` seinem `DndContext` keine `sensors` übergibt: vorbestehend, gemessen, als
  eigener Durchgang notiert.

## Zwei Dinge, die ich gefunden und bewusst liegengelassen habe

Sie stehen hier, damit du sie nicht für Funde hältst — und damit du widersprechen kannst, wenn du
das Liegenlassen für falsch hältst.

- **`homelessSlots` (`FrameBuilder.tsx`) rechnet nur über den aktiven Breakpoint.** Ein
  Gruppen-Bereich, der nur auf Desktop platziert ist, nimmt seine Komponenten auf Tablet und Mobil
  von jeder Seite, und der Editor sagt nichts — zwei Zeilen weiter warnt er für denselben Verlust
  pro Position. Das sechste Review hat es als Frage gestellt, nicht als Befund.
- **Quartz liest `enabled` an zwei Stellen verschieden.** Der Loader wirft alles Falsy hinaus
  (`filter((e) => e.enabled)`), die CLI hält einen Eintrag ohne den Schlüssel für eingeschaltet
  (`entry.enabled !== false`). Ein von Hand geschriebener Eintrag ohne `enabled:` steht in
  `quartz plugin list` als aktiv und wird nicht gebaut. `configService` folgt der CLI. Notiert in
  `docs/decisions/quartz-cli.md`; betrifft die ganze Plugin-Liste, nicht nur die Gruppen.

## Ablauf

Alles läuft ohne Netz. `npm run typecheck`, `npm run build`, `npm run smoke`, `npm run check:i18n`
und `npm run check:semver` sind auf diesem Stand grün — wenn nicht, ist das dein erster Befund.

Ein echtes Quartz-Projekt liegt unter `~/Documents/Example` (mit dem Quartz-Checkout darin, also
`config-loader.ts`, `Flex.tsx`, `dispatcher.ts` zum Nachlesen). **Verändere es nicht**; kopieren und
lesen ist in Ordnung. Es hat vier eigene Frames, aber **keinen Gruppen-Bereich** — wenn du einen
echten Build mit Gruppen willst, bau ihn in einer Kopie.

## Form der Befunde

Wie bei den letzten sechs: je Befund eine Überschrift, die die Sache benennt, dann was passiert,
dann woran du es festmachst (Datei und Zeile), dann eine Einschätzung der Schwere
(Hoch/Mittel/Niedrig, Maßstab in `docs/REVIEW-2026-09-09.md`). Schreib zu jedem Befund dazu, ob du
ihn **gelesen** oder **gemessen** hast. Kein Fix im Text — darüber entscheidet der Nutzer.

Leg das Ergebnis als `docs/REVIEW-2026-09-10.md` ab.

Wenn du nichts findest, ist das ein Ergebnis. Schreib dann, wo du gesucht hast.
