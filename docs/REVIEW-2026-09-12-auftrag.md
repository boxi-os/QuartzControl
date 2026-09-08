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

Der Diff seit dem Tag `review-2026-09-11`. **Nicht seit dem Dateinamen dieses Auftrags** — der ist
geraten, der Tag ist es nicht.

    git log --oneline review-2026-09-11..main
    git diff review-2026-09-11..main -- electron/ src/ shared/ scripts/

10 Commits plus der Merge, im App-Code 9 Dateien, +197/−38; mit den Dokumenten und den beiden
Review-Dateien 17 Dateien, +1107/−61 (dieser Auftrag hier nicht mitgezählt). Der zehnte Commit
(`47439a0`) ist ein Nachtrag zu Befund 7, der beim Schreiben dieses Auftrags entstanden ist — siehe
unten.

**Dieser Diff ist der schmalste der Serie, und das ist seine Eigenart.** Er hat genau eine Schicht:
die acht Fixes des achten Reviews (`docs/REVIEW-2026-09-11.md`, PR #29) plus einen Nachtrag zu
einem davon. Kein Vorhaben daneben, kein Umbau. Zwei Drittel der App-Zeilen liegen in zwei Dateien:

    electron/main/services/layoutFrameService.ts   95 Zeilen berührt   (der einzige mittlere Befund)
    src/routes/LayoutEditor/PageTypeOverrides.tsx  44 Zeilen berührt
    src/components/ImportOutcome.tsx               44 Zeilen berührt
    src/routes/LayoutEditor/FrameBuilder.tsx       27 Zeilen berührt

Lies `docs/REVIEW-2026-09-11.md` und `docs/REVIEW-2026-09-11-auftrag.md` mit — nicht als Wahrheit,
sondern als das, was behauptet und wonach zuletzt gesucht wurde. Die Reviews davor helfen für den
Ton, sind aber inhaltlich erledigt.

## Eine Besonderheit, die du wissen musst

**Die Commits stammen von demselben Modell, das diesen Auftrag schreibt.** Ich habe die Fixes
geschrieben und auch entschieden, *was* an den Befunden des achten Reviews behoben wird und wie
weit.

Drei Dinge folgen daraus:

- Lies die Commit-Nachrichten als Behauptungen. In diesem Projekt gilt eine Zahl in einer
  Commit-Nachricht als Messung; wenn eine nicht trägt, ist das ein Befund. Zwei der letzten drei
  Aufträge haben genau so einen gefunden.
- Prüfe besonders, wo ich **eine Zahl, eine Grenze, einen Ort oder einen Umfang gewählt** habe. In
  diesem Diff sind das: `40` (Zeichen je Pfadsegment), `6` (Zeilen je Warnungsart), die Richtung
  `>=` in `countsFit` und der Sondierungswert, mit dem `ImportOutcome` i18next befragt. Eine
  gewählte Menge von Namen gab es auch — sie hat es keine drei Stunden überlebt (`47439a0`).
- **Alles ist auf macOS gemessen.** Linux ist abgeleitet, Windows kommt nicht vor.

## Der Messweg — dieselben drei wie beim letzten Mal, und einer davon ist jetzt besser belegt

Das achte Review hat auf drei Wegen gemessen, und die Fixes sind ihnen gefolgt:

1. **Ein echter Build** an einer Kopie des Beispielprojekts (266 Markdown-Dateien, 638 Dateien je
   Lauf, ~20 s), die gebauten Seiten mit `hast-util-from-html` ausgezählt. Der mittlere Befund war
   nur so zu belegen, und der Fix ist auf demselben Weg gegengemessen.
2. **Das erzeugte Modul** — `dist/frames.js` importiert, mit einem selbstgeschriebenen `preact`,
   `Frame.render(props)` mit Stub-Komponenten, deren Funktionsname `Flex` lautet. Schnell, und für
   die Fälle nötig, die das Beispielprojekt nicht hergibt.
3. **Die gebaute App** über Playwright im Wegwerf-Profil (`--user-data-dir`). Neu dabei: ein
   **echter `.qtpl`-Import** wird messbar, indem `dialog.showOpenDialog` und `dialog.showMessageBox`
   im Hauptprozess über `app.evaluate` ersetzt werden — alles danach ist der gewöhnliche Weg.

**Eine Voraussetzung hat sich geändert:** Das Beispielprojekt hat seit dem 2026-09-07 **zwei
Gruppen-Bereiche** (`custom-8` und `custom-9` des `editorial`-Frames, beide auf `afterBody`). Der
letzte Auftrag behauptete noch das Gegenteil. Ein echter Build mit Gruppen ist damit ohne Umbau des
Frames möglich; was das Projekt weiterhin nicht hat, ist ein Gruppen-Bereich auf einer *anderen*
Position als `afterBody`.

Was das nicht beantwortet: Weg 2 setzt weiterhin voraus, dass die Listen, die ich dem Frame
übergebe, das sind, was Quartz übergibt. Weg 1 stützt das für die Fälle, die das Beispielprojekt
hergibt. Die Fälle, die nur auf Weg 2 gemessen sind, sind unten je Punkt genannt.

## Was in diesem Diff steckt

### 1. `countsFit` — die Lockerung des zweiten Durchgangs (`0ed6bb5`), der Kern des Diffs

Der zweite Durchgang in `pickGroupOrder` (aus PR #26) ließ die ungeteilten Positionen ganz weg. Das
war die Regression, die das achte Review als Befund 1 gefunden hat: Er warf damit genau das
Zeugnis weg, das eine falsche Kandidatin ausgeschlossen hatte. Jetzt fragt er weiter alle sechs
Positionen — die geteilten auf Gleichheit, die übrigen auf „beschrieben ≥ gerendert“.

- **Die ganze Entscheidung hängt an einer Behauptung über Richtungen:** Weniger Flexes als
  beschrieben habe die gewöhnliche Erklärung (eine Gruppe, deren Mitglieder alle abgeschaltet
  sind), mehr habe *keine*, weil „nichts an einer Seite eine Gruppe hinzufügen kann, von der die
  Ordnung nie gehört hat“. Stimmt das? Der letzte Auftrag selbst nennt als Voraussetzung des Falls
  „ein Plugin mit `layout.group` in keiner Registry“ — das ist ein Weg, auf dem eine Flex ohne
  Eintrag in der Ordnung entstehen könnte. Wenn es ihn gibt, fällt dieser Fall jetzt zurück, wo er
  vorher aufteilte. Ist das die richtige Antwort, und *sagt* die Meldung sie?
- Die Grenze ist damit zum dritten Mal in drei Runden verschoben worden: „alle sechs“ → „nur die
  geteilten“ → „alle sechs, außen als Obergrenze“. Prüf, ob sie diesmal an der richtigen Stelle
  liegt oder ob eine vierte Fassung schon absehbar ist.
- **Die Rückfall-Meldung ist mitgewachsen** und nennt jetzt die Position, die eine Kandidatin
  ausgeschlossen hat („page type "bases" fits that, but header renders 2 group flex(es) it has no
  group for“). Sie rechnet `contradicted` über *alle* `GROUP_LAYOUTS`, nicht über die Treffermenge
  — bei vielen Kandidatinnen kann das eine lange Zeile werden. Nicht gemessen.
- **Die Hinweis-Meldung nennt jetzt weitere gleich teilende Kandidatinnen** (`alsoFit`). Das
  Kriterium ist ein Vergleich der Längen über alle sechs Positionen; ob das die Menge trifft, die
  gemeint ist, ist gelesen, nicht gemessen.
- Gemessen wurde vorher/nachher am erzeugten Modul und am echten Build: 203 von 211 Seiten, dazu
  zwei Gegenproben (gesunde Config unverändert; der Fall des siebten Reviews weiter 201 von 201).
  Der Fall „mehrere Kandidatinnen passen im zweiten Durchgang“ nur am erzeugten Modul.

### 2. Die Platzierung, die die Ablage durchreicht (`8dceb50`)

In der Ablage liegen zwei Arten von Bereichen — ohne Platzierung und mit einer, die `hidden` ist —,
und `areaForm(a)` bekam für beide keine. Jetzt `areaForm(a, layout.placements[a.id])`, und der Chip
sagt „ausgeblendet“.

- **Ein neuer i18n-Schlüssel am Chip** (`hiddenShort`), also eine dritte Zeile im Chip-Text. Bei
  1280 px steht das in einer Ablage, die selbst umbricht. Nicht in Breiten gemessen.
- Der Hinweis über der Ablage sagt weiterhin „Zeilen- und Spalten-Spanne gibt es nur für einen
  platzierten Bereich“. Ein ausgeblendeter Bereich *ist* platziert und zeigt sie jetzt — liest ein
  Nutzer den Satz so?
- Gemessen an der gebauten App, inklusive des Rückwegs (Schalter aus, Schalter an, Bereich liegt auf
  `2 / span 4`, `10 / span 3`). **Nicht** gemessen: was passiert, wenn ein Bereich auf einem
  Breakpoint ausgeblendet und auf einem anderen platziert ist, und man zwischen den Breakpoints
  wechselt, während der Chip ausgewählt ist.

### 3. Der Tastatur-Guard am Bereichsformular (`48a4b53`)

`onKeyDown={(e) => e.stopPropagation()}` auf dem Formular, spiegelbildlich zum vorhandenen
`onClick`. Vorher stieg jeder Tastendruck zum Kasten auf, der `preventDefault()` rief.

- **Ein `stopPropagation()` ist ein grober Hebel.** Er hält jetzt *jeden* Tastendruck auf, auch
  Escape und Tab. Ob dadurch etwas verlorengeht, das oberhalb hören müsste — der `DndContext`, ein
  Dialog, ein Menü-Shortcut —, ist gelesen, nicht durchgespielt.
- Die Alternative wäre gewesen, den Handler am Kasten auf `e.target === e.currentTarget` zu
  verengen. Ich habe den Guard gewählt, weil er neben dem Klick-Guard steht. Trag es gegen, wenn du
  die andere Seite für richtiger hältst.
- Gemessen mit echten Tastendrücken an der gebauten App, zwei Fälle (Namensfeld, Schalter). Nicht
  gemessen: Escape, Tab, und der Chip in der Ablage (dort war es schon vorher richtig).

### 4. Der sechste zod-Code und die Kappung (`b34d38a`)

`invalid_key` kam dazu, und `where` wird je Pfadsegment auf 40 Zeichen gekappt.

- **Die vorige Fassung behauptete „am Schema gemessen, nicht geraten“, und war es nicht** — sie war
  gelesen. Die neue behauptet es wieder, diesmal mit acht kaputten Frames durch
  `frameDefinitionProblem`. Ist *diese* Liste vollständig? `z.looseObject`, `z.union`, `z.refine`
  und die beiden strukturellen Prüfungen daneben erzeugen möglicherweise weitere Codes.
- **40 Zeichen je Segment ist eine gewählte Zahl.** Der Pfad hat bis zu vier Segmente, also kann der
  Satz weiterhin ~160 Zeichen Fremddaten tragen. Reicht das, ist es zu viel, ist die Kappung an der
  richtigen Stelle (hier statt bei `frameFailed`, das auf 400 schneidet)?
- Der zweite Ausgang derselben Zeichenkette ist `plan.notes` im Dry-Run. Dort ist sie jetzt gekappt,
  weil `shapeIssue` kappt — aber der Weg ist nicht der, den ich gemessen habe.

### 5. Der dritte App-Satz auf `warn` (`31d1ce2`)

`serverLogUnavailable` ist von `stderr` auf `warn` gewechselt, und der Vertragskommentar formuliert
die Grenze neu: nicht „wer schreibt“, sondern „läuft es weiter“.

- **Das ist die zweite Vertragsänderung an derselben Stelle in zwei Runden.** Die erste behauptete
  Vollständigkeit und war es nicht. Prüf die neue Grenze an allen Erzeugern, nicht nur an denen in
  `buildService.ts`.
- Gemessen an der gebauten App mit `.quartz-gui/logs` auf `chmod 500`. Ein Server lief dabei
  wirklich und wurde gestoppt.

### 6. Der Filter in `update` statt in `toggleExclude` (`2ee2bc5`)

Die toten Ausschluss-Schreibweisen werden jetzt an jeder Tür entfernt, nicht nur beim Umlegen eines
Schalters; ist die Liste danach leer, verschwindet der Schlüssel. Dazu ein neuer Hinweis über der
Schalterliste.

- **`deadExcludes` wird jetzt oberhalb von `update` berechnet und in dessen Closure gelesen.** Das
  ist eine Reihenfolge, auf die man sich verlässt. Prüf, ob sie hält.
- **Der Hinweis ist ein neuer Nutzertext mit Plural in zwei Sprachen** und zählt Namen auf, die aus
  der Config kommen. Eine Obergrenze für die Zahl der genannten Namen gibt es nicht.
- **Die Wahl selbst — entfernen statt umschreiben — bleibt**, das achte Review hat sie für
  vertretbar gehalten und nur den fehlenden Satz bemängelt. Wenn du die Richtung anders siehst, ist
  das ein Befund.
- Gemessen an der gebauten App, je Tür vorher und nachher, gelesen wird die Datei nach „Speichern“.

### 7. Eine Zeile je Satz in `ImportOutcome` (`670c68b`, `47439a0`)

Eine Warnungsart, deren eigener Satz das erste `detail` schon einsetzt, bekommt jetzt eine Zeile je
Fall statt einer Kommareihe dahinter, die den ersten Eintrag wiederholt.

- **Der erste Anlauf war eine handgeschriebene Menge von drei Namen (`SENTENCE_KINDS`), und sie war
  schon beim Schreiben falsch.** Aufgefallen ist das beim Verfassen *dieses* Auftrags, nicht im
  Review: Von 22 Arten verbrauchen sieben ein `{{detail}}`, vier fehlten. Der Nachtrag `47439a0`
  fragt stattdessen i18next selbst — eine Interpolation mit einem Wert, der in keiner Übersetzung
  vorkommen kann. **Das ist der interessanteste Teil dieses Diffs für dich:** Ein Kriterium, das zur
  Laufzeit aus den Sprachdateien abgeleitet wird, statt danebenzuliegen. Trägt es? Was tut es bei
  einer Übersetzung, die `{{detail}}` weglässt, obwohl der Erzeuger eines schickt — oder umgekehrt,
  wenn de und en sich darin unterscheiden (heute tun sie es nicht, gemessen)?
- **Sechs ist gewählt**, wie drei im Dry-Run. Die beiden Zahlen sind jetzt verschieden, für dieselbe
  Sache an zwei Bildschirmen.
- Gemessen am echten Import eines von Hand gebauten `.qtpl` mit zwei kaputten Frames, und das
  Kriterium gegen echtes i18next mit den gebündelten Sprachdateien (7 von 22, in beiden Sprachen
  dieselben). **Nicht** gemessen: mehr als sechs Fälle, und die sechs anderen Arten in der Anzeige.

### 8. Vier Textstellen (`690d38c`) und die Dokumentation (`b897fd9`)

Ein falscher i18n-Schlüsselname, eine Zahl, die keine Messung war („dieselben zehn Felder“, gezählt
sechs), dazu die Nachträge in `docs/decisions/` und die neuen Regeln in `CLAUDE.md`. Behauptungen
über Verhalten — prüf sie wie Code. In `layout-frames.md` ist ein ganzer Abschnitt neu („Eine
Position außerhalb spricht nur in eine Richtung“), in `plugins-and-config.md`,
`templates-and-localization.md`, `navigation-and-pages.md` und `i18n-and-vocabulary.md` je einer.

## Was ausdrücklich kein Befund ist

- Dass die Seitenleiste „Backups“ sagt und alles darin „Snapshot“: bekannt, notiert, Oberfläche bis
  zur Beta eingefroren.
- Dass die Beispielvorlage zwei leere Bereiche mitbringt, die +2rem kosten: gemessen, vom Nutzer
  entschieden.
- Dass beide Mehrdeutigkeits-Meldungen englisch im Log stehen: seit drei Aufträgen bekannt, vom
  Nutzer nicht entschieden. Wenn du eine *neue* Begründung hast, warum es einen Unterschied macht,
  ist das ein Befund; die bloße Wiederholung nicht.

## Was ich gefunden und bewusst liegengelassen habe

Sie stehen hier, damit du sie nicht für Funde hältst — und damit du widersprechen kannst, wenn du
das Liegenlassen für falsch hältst.

- **Quartz liest `enabled` an zwei Stellen verschieden.** Der Loader wirft alles Falsy hinaus, die
  CLI hält einen Eintrag ohne den Schlüssel für eingeschaltet; `configService` folgt der CLI. Das
  war jetzt **zweimal in Folge die Voraussetzung des mittleren Befunds** — im siebten Review und im
  achten. Es liegt weiter. Wenn du meinst, dass die zweite Wiederholung die Sache selbst zum Befund
  macht, sag es.
- **`homelessSlots` (`FrameBuilder.tsx`) rechnet nur über den aktiven Breakpoint.** Drei Reviews
  haben es als Frage gestellt, keins als Befund.
- **Der Frame-Editor rollt bei 1280 px horizontal** (`main.scrollWidth` 1130 gegen `clientWidth`
  1030). Das achte Review sah es außerhalb seines Diffs und führte es nicht als Befund; ich habe es
  nicht angefasst. `npm run smoke` sieht es nicht, weil es keinen Editor öffnet.
- **`GROUP_LAYOUTS` hat weiterhin keine Obergrenze**, und `pickGroupOrder` läuft weiter einmal je
  Seite. Zwei Aufträge haben es genannt, kein Review hat es aufgegriffen.
- **`GlobalBoard` übergibt seinem `DndContext` keine `sensors`.** Vorbestehend, gemessen, als
  eigener Durchgang notiert.
- **Wer den Gruppen-Schalter aus- und wieder einschaltet, bindet den Bereich an eine Gruppe mit dem
  neuen Namen.** Vertretbar, weil ausdrückliche Handlung; nirgends gesagt.

## Ablauf

Alles läuft ohne Netz. `npm run typecheck`, `npm run build`, `npm run smoke`, `npm run check:i18n`,
`npm run check:semver`, `npm run check:plugin-names` und `npm run check:handbook` sind auf diesem
Stand grün — wenn nicht, ist das dein erster Befund.

Ein echtes Quartz-Projekt liegt unter `~/Documents/Example` (mit dem Quartz-Checkout darin, also
`config-loader.ts`, `dispatcher.ts`, `Flex.tsx` zum Nachlesen). **Verändere es nicht**; kopieren und
lesen ist in Ordnung. Es hat vier eigene Frames, die Beispielvorlage installiert und **zwei
Gruppen-Bereiche** auf `afterBody`. Wenn du einen echten Build fährst: Klon anlegen, die vier
Symlinks unter `.quartz/plugins/` umbiegen und die absoluten Pfade in `quartz.config.yaml` *und*
`quartz.lock.json` ersetzen — das Lockfile enthält auch Pfade in ein zweites Projekt. Es kann sein,
dass der Nutzer die App und einen Dev-Server darauf offen hat: `running-servers.json` prüfen, bevor
du die gebaute App startest, und im Zweifel ein eigenes `--user-data-dir` nehmen.

## Form der Befunde

Wie bei den letzten acht: je Befund eine Überschrift, die die Sache benennt, dann was passiert, dann
woran du es festmachst (Datei und Zeile), dann eine Einschätzung der Schwere (Hoch/Mittel/Niedrig,
Maßstab in `docs/REVIEW-2026-09-11.md`). Schreib zu jedem Befund dazu, ob du ihn **gelesen** oder
**gemessen** hast. Kein Fix im Text — darüber entscheidet der Nutzer.

Leg das Ergebnis als `docs/REVIEW-2026-09-12.md` ab.

Wenn du nichts findest, ist das ein Ergebnis. Schreib dann, wo du gesucht hast.
