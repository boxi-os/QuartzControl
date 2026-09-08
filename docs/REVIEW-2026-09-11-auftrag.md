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

Der Diff seit dem Tag `review-2026-09-10`. **Nicht seit dem Dateinamen dieses Auftrags** — der ist
geraten, der Tag ist es nicht.

    git log --oneline review-2026-09-10..main
    git diff review-2026-09-10..main -- electron/ src/ shared/ scripts/

14 Commits, im App-Code 18 Dateien, +611/−170; mit den Dokumenten (dieser hier eingerechnet)
26 Dateien, +1439/−204.

**Dieser Diff hat drei Schichten, und nur die erste ist groß.** Zwei Drittel der App-Zeilen sind die
acht Fixes des siebten Reviews (`docs/REVIEW-2026-09-10.md`, PR #26). Darunter liegen zwei kleine
eigene Vorhaben, die nichts damit zu tun haben: ein Formular, das jetzt auch an einem unplatzierten
Frame-Bereich hängt (PR #27), und eine Suche, die den Namen versteht, wie er dasteht (PR #28). Der
Schwerpunkt in Zeilen:

    src/routes/LayoutEditor/FrameBuilder.tsx       200 Zeilen berührt   (PR #27, ein Umbau)
    electron/main/services/layoutFrameService.ts   192 Zeilen berührt   (Kern der Frame-Fixes)
    scripts/check-plugin-names.mjs                 117 Zeilen           (neu)
    shared/quartzPluginName.ts                      71 Zeilen           (neu)

Lies `docs/REVIEW-2026-09-10.md` und `docs/REVIEW-2026-09-10-auftrag.md` mit — nicht als Wahrheit,
sondern als das, was behauptet und wonach zuletzt gesucht wurde. Die Reviews davor helfen für den
Ton, sind aber inhaltlich erledigt.

## Eine Besonderheit, die du wissen musst

**Die Commits stammen von demselben Modell, das diesen Auftrag schreibt.** Ich habe die Fixes
geschrieben und auch entschieden, *was* an den Befunden des siebten Reviews behoben wird und wie
weit; die beiden Vorhaben darunter kamen aus je einem Satz des Nutzers.

Drei Dinge folgen daraus:

- Lies die Commit-Nachrichten als Behauptungen. In diesem Projekt gilt eine Zahl in einer
  Commit-Nachricht als Messung; wenn eine nicht trägt, ist das ein Befund. Der letzte Auftrag hat
  genau so einen gefunden (Befund 8: das Ergebnis stimmte, das Instrument maß etwas anderes).
- Prüfe besonders, wo ich **eine Zahl, eine Grenze, einen Ort oder einen Umfang gewählt** habe.
- **Alles ist auf macOS gemessen.** Linux ist abgeleitet, Windows kommt nicht vor — und ausgerechnet
  in diesem Diff steckt eine Funktion, deren einziger bekannter Rand ein Windows-Pfad ist (unten).

## Der Messweg — diesmal drei, und das ist die Verbesserung

Das siebte Review war das erste, das an einem echten `quartz build` gemessen hat, und die Fixes sind
diesem Weg gefolgt. Drei Instrumente kommen im Diff vor:

1. **Ein echter Build** an einer Kopie des Beispielprojekts (266 Markdown-Dateien, 334 Seiten mit
   Grid, 201 davon `editorial`), die gebauten Seiten mit `hast-util-from-html` ausgezählt. Die
   beiden mittleren Befunde des Reviews waren nur so sichtbar.
2. **Das erzeugte Modul** — `dist/frames.js` importiert, mit einem selbstgeschriebenen `preact`,
   `Frame.render(props)` mit Stub-Komponenten, deren Funktionsname `Flex`, `Search` usw. lautet.
   Schnell, und für die Fälle nötig, die das Beispielprojekt nicht hat.
3. **Die gebaute App** über Playwright im Wegwerf-Profil (`--user-data-dir`).

Was das *nicht* beantwortet: Weg 2 setzt weiterhin voraus, dass die Listen, die ich dem Frame
übergebe, das sind, was Quartz übergibt — Weg 1 stützt das jetzt für die Fälle, die das
Beispielprojekt hergibt, aber es hat **keinen Gruppen-Bereich** und keinen zweiten Seitentyp mit
`template`. Die Fälle, die nur auf Weg 2 gemessen sind, sind unten je Punkt genannt.

## Was in diesem Diff steckt

### 1. Der zweite Durchgang in `pickGroupOrder` (`d14bb08`)

Der Abgleich lief über alle sechs Positionen; stimmte die Zahl auf einer Position, die das Frame gar
nicht teilt, fiel die Aufteilung für die *ganze* Seite aus. Jetzt zwei Durchgänge: erst alle sechs,
und nur wenn dort nichts passt, die geteilten Positionen allein.

- **„Immer eine Erweiterung einer leeren Treffermenge, nie ein Ersatz"** ist die Regel, die ich mir
  dafür gegeben habe. Ob sie im Code wirklich so steht — und was passiert, wenn im *zweiten*
  Durchgang mehrere passen, die im ersten alle durchfielen —, ist die Frage.
- Die neue Meldung nennt die Position, die den Ausschlag gab. Die alte fällt jetzt erst nach dem
  zweiten Durchgang. Zwei Meldungen für zwei Lagen: ist die Grenze zwischen ihnen die richtige?
- Gemessen am echten Build, 201 von 201 Seiten, mit Gegenproben. Der Fall „zwei Seitentypen, die
  sich nur über `right` unterscheiden" nur am erzeugten Modul.

### 2. Der Plugin-Name, wie Quartz ihn vergleicht (`ecf7537`) — der stillste Fix

Ein Schalter im Reiter „Seitentypen" wirkte für jedes `@quartz-community/*`-Plugin nicht: Quartz
vergleicht gegen `extractPluginName(source)`, und für jede npm-Quelle mit Scope ist das die ganze
Quelle. Der Name steht jetzt in `shared/quartzPluginName.ts`, wird auch zum *Lesen* benutzt, und
`npm run check:plugin-names` schneidet Quartz' eigene Funktion aus dessen Quelldatei und vergleicht.

- **Das ist eine Nachbildung einer fremden Funktion.** Die Gegenprobe fand sofort einen Rand
  (`path.basename` trennt am Backslash nur auf `win32`, ein Windows-Pfad kommt hier also ungeteilt
  zurück). Gibt es weitere? Die Gegenprobe läuft gegen den Quartz-Checkout in `~/Documents/Example`
  — also gegen **eine** Version.
- **Die tote Schreibweise wird beim nächsten Schreiben entfernt, nicht umgeschrieben.** Begründung:
  Umschreiben ließe eine Komponente auf der gebauten Seite verschwinden, weil die App ein Update
  bekam. Das ist eine Wahl mit einer stillen Seite — der Nutzer verliert einen Eintrag, den er
  einmal gesetzt hat, ohne dass es jemand sagt.
- Die zweite Hälfte des Fixes ist `groupLayoutCandidates`, das jetzt mit demselben Namen filtert.
  Aus einem Ausschluss, der nichts tut, baute die Rechnung vorher eine Ordnung, die Quartz nie
  erzeugt. Gemessen — aber die Kandidatenrechnung ist der Teil, der am schwersten zu widerlegen ist.

### 3. `frameName` als Pflichtargument (`5cbf2f6`)

Ein Seitentyp mit `template: etwas-anderes` liefert keine Kandidatin mehr für dieses Frame.

- **Nur ein ausdrückliches `template` zählt.** Das mittlere Glied der Kette — das Frame, das ein
  Seitentyp-Plugin für sich selbst erklärt — kann die App nur raten
  (`discoverBuiltinPageTypeFrames`), und ein Rat darf keine Kandidatin *entfernen*. Ist die Abwägung
  richtig herum? Der letzte Auftrag hat sie andersherum verteidigt, und das Review hat das gekippt.
- Das Argument, mit dem ich sie damals verteidigt hatte („eine Kandidatin zu viel führt höchstens
  zum Rückfall"), war falsch: Sie kann eine Auswahl *ermöglichen*, die es sonst nicht gäbe. Prüf, ob
  die Umkehrung jetzt vollständig ist oder ob dieselbe stumme Richtung woanders noch steht.
- `readGroupLayouts` gibt jetzt eine Funktion zurück (Config einmal je Schreibdurchgang, Einengung
  je Frame). Ein Zustand mehr, der zwischen zwei Aufrufen liegt.

### 4. Die zweite Meldung (`9bbebc8`)

Es gibt zwei Lagen von Mehrdeutigkeit, und für die zweite tat der bisherige Rat
(`layout.groups.<name>.priority`) nachweislich nichts. Der neue Fall bekommt eine eigene Meldung mit
zwei Auswegen, beide gemessen.

- `namesAlike` ist neu und entscheidet, welche der beiden Meldungen fällt. Am erzeugten Modul
  gemessen, nicht am Build.
- Beide Meldungen stehen **englisch** im Build-Log einer sonst deutschen Oberfläche. Das war schon
  im letzten Auftrag eine offene Frage und ist offen geblieben.

### 5. Der zod-Satz in den Worten der App (`c308f63`)

`frameDefinitionProblem()` setzt nicht mehr `issue.message` in einen Nutzersatz ein, sondern
übersetzt fünf Fehlercodes.

- **„Die fünf Codes sind am Schema gemessen, nicht geraten"** — an `gridFrameDefinition`, elf kaputte
  Frames. Ein unbekannter Code behält zod' eigenen Text. Was passiert bei einem zod-Update, das einen
  Code umbenennt? Und: ist die Behauptung „das ist alles, was das Schema hergibt" haltbar, wenn das
  Schema morgen eine Regel dazubekommt?
- Der Pfad wird als Daten in den Satz gesetzt (`breakpoints.desktop.rows`). Ein Pfad aus einer
  fremden Datei landet damit in einem Nutzertext.

### 6. Der Grund im Dry-Run (`65b13d6`)

Der Import-Plan nennt jetzt je Frame den Grund statt nur den Namen. Gekappt auf drei, dann „und N
weitere Frames" — die Zahl ist gewählt, nachgemessen mit fünf kaputten Frames.

### 7. Ein dritter Wert in `LogLine.stream` (`aba8772`)

`warn` neben `stdout` und `stderr`, bernstein statt rot, damit eine Warnung vor einem gelingenden
Build nicht wie sein Fehler aussieht.

- **Das ist eine Vertragsänderung** (`shared/ipc-contract.ts`). Jede Stelle, die `stream` vergleicht,
  filtert oder speichert, muss den dritten Wert kennen — der Log-Puffer im Hauptprozess, die
  Historie über `logs:history`, die Konsole. Ich habe die gefunden, die ich kenne.
- Die Grenze ist „diese App färbt, was sie selbst geschrieben hat". Alles aus dem Kindprozess bleibt
  rot, auch eine echte Warnung, die ein Frame selbst schreibt. Gewollt und begründet — trag es
  gegen, wenn du es anders siehst.

### 8. Nur Dokumentation (`df8de09`, `b2c36f1`, `581139a`)

Der Absatz über den Dev-Server-Watcher (mit dem richtigen Instrument neu gemessen), die Regeln in
`CLAUDE.md`, das Review selbst. Behauptungen über Verhalten — prüf sie wie Code.

### 9. Das Bereichsformular am unplatzierten Bereich (`7bedf1b`, PR #27)

Das Formular eines Frame-Bereichs steckte in `PlacedBox`, und `PlacedBox` rendert für einen Bereich
ohne Platzierung nichts. Ein neu angelegter Bereich beginnt genau so — er hatte damit kein
Namensfeld, keine Belegung und keinen Weg zum Löschen. Das Formular ist jetzt `areaForm(area,
placement?)` und wird von beiden Seiten gerufen.

Das ist der größte Einzeleingriff des Diffs (116/84 Zeilen in einer Datei), und er hat mit den
Frame-Fixes nichts zu tun. Woran ich zweifle:

- **`areaForm(a)` wird für *jeden* Chip der Ablage aufgerufen** (`FrameBuilder.tsx:945`), gerendert
  wird es nur im ausgewählten (`TrayChip`: `{selected && children}`). Das Feld trägt `autoFocus`.
  Was das bei acht unplatzierten Bereichen kostet und ob der Fokus dorthin springt, wo er soll, ist
  nicht gemessen.
- **Ein Formular liegt jetzt in einem `useDraggable`-Knoten.** Der Griff ist der Aktivator, nicht der
  ganze Chip — das war schon so —, aber Eingabefelder in einem ziehbaren Element sind eine neue Lage.
  Tastaturbedienung: Der Chip ist ein Tabstopp, der Griff ein zweiter, die Felder sind weitere.
- **Ein ausgewählter Chip nimmt eine ganze Zeile der umbrechenden Ablage** (`w-full`). Angesehen,
  nicht in Breiten gemessen; bei 1280 px steht das Formular in einer Ablage, die selbst umbricht.
- Die Gegenprobe („ein platzierter Bereich zeigt vorher wie nachher dieselben zehn Felder und
  dieselben zwei Knöpfe, in derselben Reihenfolge") ist gezählt, nicht Feld für Feld verglichen.
- `onClick={(e) => e.stopPropagation()}` auf dem Formular — an beiden Orten nötig? An einem davon?

### 10. Die Variablensuche (`59de3a5`, PR #28)

Beide Suchfelder der Stile-Seite verglichen die Eingabe gegen den bar gehaltenen Schlüssel
(`tpl-space-lg`), während jede Zeile `--tpl-space-lg` anzeigt. Wer den Namen so sucht, wie er
dasteht, bekam null Treffer. `normalizeVarQuery()` schneidet die führenden Bindestriche ab.

Klein und gemessen (gebaute App, Wegwerf-Profil, vorher/nachher). Die Frage daran ist, ob die Stelle
die richtige ist: Es gibt in dieser App weitere Suchen über Namen mit einem festen Präfix.

## Was ausdrücklich kein Befund ist

- Dass die Seitenleiste „Backups" sagt und alles darin „Snapshot": bekannt, notiert, Oberfläche bis
  zur Beta eingefroren.
- Dass die Beispielvorlage zwei leere Bereiche mitbringt, die +2rem kosten: gemessen, vom Nutzer
  entschieden.
- Dass `GlobalBoard` seinem `DndContext` keine `sensors` übergibt: vorbestehend, gemessen, als
  eigener Durchgang notiert.
- Dass ein Klick im Reiter „Seitentypen" die Aufteilung des ganzen Projekts abschalten kann: der
  Nutzer hat diese Richtung in Kenntnis des Preises gewählt. Ob die *Meldung* ihn trägt, ist offen —
  das ist ein Befund, die Richtung nicht.

## Was ich gefunden und bewusst liegengelassen habe

Sie stehen hier, damit du sie nicht für Funde hältst — und damit du widersprechen kannst, wenn du
das Liegenlassen für falsch hältst.

- **`homelessSlots` (`FrameBuilder.tsx`) rechnet nur über den aktiven Breakpoint.** Ein
  Gruppen-Bereich, der nur auf Desktop platziert ist, nimmt seine Komponenten auf Tablet und Mobil
  von jeder Seite, und der Editor sagt nichts. Zwei Reviews haben es als Frage gestellt, keins als
  Befund. PR #27 hat die Ablage angefasst, ohne das anzurühren.
- **Quartz liest `enabled` an zwei Stellen verschieden.** Der Loader wirft alles Falsy hinaus, die
  CLI hält einen Eintrag ohne den Schlüssel für eingeschaltet. `configService` folgt der CLI.
  Notiert in `docs/decisions/quartz-cli.md`.
- **`GROUP_LAYOUTS` hat weiterhin keine Obergrenze**, und `pickGroupOrder` läuft weiter einmal je
  Seite. Der letzte Auftrag hat beides genannt, das Review hat es nicht aufgegriffen, ich habe es
  nicht angefasst. Wenn es ein Befund ist, ist er es immer noch.
- **Wer den Gruppen-Schalter aus- und wieder einschaltet, bindet den Bereich an eine Gruppe mit dem
  neuen Namen.** Vertretbar, weil ausdrückliche Handlung; nirgends gesagt.

## Ablauf

Alles läuft ohne Netz. `npm run typecheck`, `npm run build`, `npm run smoke`, `npm run check:i18n`,
`npm run check:semver` und `npm run check:plugin-names` sind auf diesem Stand grün — wenn nicht, ist
das dein erster Befund.

Ein echtes Quartz-Projekt liegt unter `~/Documents/Example` (mit dem Quartz-Checkout darin, also
`config-loader.ts`, `dispatcher.ts`, `Flex.tsx` zum Nachlesen). **Verändere es nicht**; kopieren und
lesen ist in Ordnung. Es hat vier eigene Frames und die Beispielvorlage installiert, aber **keinen
Gruppen-Bereich** — wenn du einen echten Build mit Gruppen willst, bau ihn in einer Kopie. Es kann
sein, dass der Nutzer die App und einen Dev-Server darauf offen hat: `running-servers.json` prüfen,
bevor du die gebaute App startest, und im Zweifel ein eigenes `--user-data-dir` nehmen.

## Form der Befunde

Wie bei den letzten sieben: je Befund eine Überschrift, die die Sache benennt, dann was passiert,
dann woran du es festmachst (Datei und Zeile), dann eine Einschätzung der Schwere
(Hoch/Mittel/Niedrig, Maßstab in `docs/REVIEW-2026-09-10.md`). Schreib zu jedem Befund dazu, ob du
ihn **gelesen** oder **gemessen** hast. Kein Fix im Text — darüber entscheidet der Nutzer.

Leg das Ergebnis als `docs/REVIEW-2026-09-11.md` ab.

Wenn du nichts findest, ist das ein Ergebnis. Schreib dann, wo du gesucht hast.
