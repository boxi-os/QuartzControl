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

Der Diff seit dem Tag `review-2026-09-08`. **Nicht seit dem Dateinamen dieses Auftrags** — der ist
geraten, der Tag ist es nicht.

    git log --oneline review-2026-09-08..main
    git diff review-2026-09-08..main -- electron/ src/ shared/ scripts/

20 Commits, 23 Dateien, +1046/−135 in diesen Verzeichnissen. **Der Diff hat zwei Schichten, und
sie haben nichts miteinander zu tun.**

**Die untere** sind die acht Fixes des fünften Reviews (`docs/REVIEW-2026-09-08.md`) — gemessen,
jeder mit Vorher und Nachher, und von niemandem gelesen; der Tag sitzt bewusst davor. Der größte
Eingriff ist `handbookServer.ts` (+170): ein neuer Dienst im Hauptprozess, der das mitgereiste
Benutzerhandbuch über http auf `127.0.0.1` ausliefert, weil unter `file://` von 4876 Links kein
einziger auflöste. Dazu `serverDiscovery.ts` (+146) mit einer dritten Antwort `'partial'` und einem
`/proc`-Weg, **den diese Maschine nicht messen kann**, sowie `menu.ts`, `before-pack.mjs` und drei
Skripte um die Sprachwahl.

**Die obere** ist der Frame-Bereichs-Umbau (PR #24, sieben Commits). Er ist der eigentliche Anlass
dieses Auftrags und steht unten ausführlich.

Lies `docs/REVIEW-2026-09-08.md` und `docs/REVIEW-2026-09-08-auftrag.md` mit — nicht als Wahrheit,
sondern als das, was behauptet und wonach zuletzt gesucht wurde.

## Eine Besonderheit, die du wissen musst

**Die Commits stammen von demselben Modell, das diesen Auftrag schreibt.** Meine Einschätzung, wo
die Risiken liegen, ist deshalb weniger wert als sonst: Ich kenne meine Zweifel, aber nicht meine
blinden Flecken. Die Liste unten ist ehrlich gemeint und ausdrücklich nicht die Grenze des Auftrags
— was ich *nicht* nenne, ist eher verdächtig als unverdächtig.

Drei Dinge folgen daraus:

- Lies die Commit-Nachrichten als Behauptungen, nicht als Dokumentation. In diesem Projekt gilt eine
  Behauptung in einer Commit-Nachricht als Messung; wenn eine nicht trägt, ist das ein Befund. In
  diesem Diff stehen besonders viele Zahlen in Commit-Nachrichten, und **mehrere davon habe ich
  selbst im Lauf der Sitzung revidiert** — der Wächter stand erst am Config-Speichern, dann am
  Import, dann an beiden, am Ende an keinem von beiden. Die Zwischenstände stehen als eigene
  Commits im Diff. Ob die Reihe an einem sinnvollen Punkt endet, ist eine offene Frage.
- Prüfe besonders, wo ich **eine Zahl, eine Grenze oder einen Ort gewählt** habe.
- **Alles ist auf macOS gemessen.** Linux ist abgeleitet, Windows kommt nicht vor.

## Was der Frame-Umbau tut

Kurz, damit du den Diff nicht rückwärts erschließen musst.

Ein *Frame* ist das Raster einer Seite; es besteht aus *Bereichen* (Geometrie: Name, Zeile, Spalte,
Spanne, je Breakpoint). Jeder Bereich hatte bisher eine *Belegung* — eine der sechs Positionen, in
die Quartz Komponenten sortiert, plus den Seiteninhalt. Sieben Quellen, also höchstens sieben
sinnvolle Bereiche; ein achter musste sich eine Belegung teilen, und der Codegen bildet jeden
Bereich auf `bySlot[area.slot]` ab — zwei Bereiche auf einer Belegung rendern dieselbe
Komponentenliste zweimal. Gefunden an einem echten Frame mit **drei** Bereichen auf `left`.

Der Umbau macht zweierlei:

1. `slot` ist optional. Ein Bereich ohne Belegung ist eine leere Zelle.
2. Ein Bereich kann eine *Gruppe* haben (`layout.group`, Quartz' eigener zweiter Schlüssel).
   `resolveGroups` faltet die gruppierten Einträge einer Position zu **einer** Komponente zusammen —
   einer `Flex`. Die Regel im erzeugten Frame lautet: **die k-te Flex einer Position ist die k-te
   Gruppe.** Das k steht als `GROUP_ORDER` im erzeugten Modul, weil es aus der flachen
   Positionsliste nicht ablesbar ist.

## Wo ich die größten Risiken vermute

Meine Einschätzung, nicht die Grenze des Auftrags. Nach abnehmender Unsicherheit.

### 1. Die ganze Konstruktion ruht auf einem Funktionsnamen

`layoutFrameService.ts:124` (`contentsFor`, im erzeugten Modul) erkennt eine Gruppe an
`C.name === "Flex"`. Gemessen mit einer Probe in einem echten Build:

    left: [ {name:"MobileOnly"}, {name:"Flex"}, {name:"ExplorerComponent"} ]

`displayName` war bei allen `undefined`, der Funktionsname also die einzige Identität. Er überlebt,
weil Quartz sich mit esbuilds `keepNames: true` baut (`quartz/cli/handlers.js:338`) — **eine
Einstellung in fremdem Code, keine zugesicherte Schnittstelle.**

Fragen, die ich nicht beantwortet habe: Was passiert, wenn ein *Plugin* eine Komponente namens
`Flex` in dieselbe Position stellt? Was, wenn Quartz `keepNames` abschaltet oder `resolveGroups`
umbaut? Der Zähl-Abgleich fängt einen Bruch ab (alles in den einfachen Bereich, Warnung), aber er
prüft nur die *Anzahl* — zwei vertauschte Gruppen kommen durch. Ist der Rückfall an der richtigen
Stelle, und ist „alles in den einfachen Bereich" das richtige Verhalten?

### 2. `groupOrderByPosition` ist die zweite, inverse Umsetzung von `resolveGroups`

`shared/gridFrameCss.ts:364`. Genau das Muster, vor dem `CLAUDE.md` bei den Vorlagen warnt („ein
Rückleser wäre deren zweite, inverse Umsetzung"), hier wissentlich gemacht.

Prüfe die Nachbildung gegen das Original (`quartz/plugins/loader/config-loader.ts`, `resolveGroups`
und `buildLayoutForEntries`) — im Projekt `/Users/boxi/Documents/Example` liegt ein echter
Quartz-5-Checkout. Was ich weiß und was ich vermute:

- Ich filtere `enabled !== false`. `buildLayoutForEntries` bekommt bereits gefilterte Einträge —
  stimmt der Filter?
- Ich sortiere Mitglieder nach Priorität, gebe jeder Gruppe die Position ihres ersten Mitglieds,
  sofern `layout.groups.<name>.priority` nichts anderes sagt, und sortiere dann stabil. Das ist
  meine Lesart von `resolveGroups`; prüf sie Zeile für Zeile.
- Ich behaupte, Einträge **ohne** `layout` (die Quartz über `defaultPosition` aus dem Manifest
  platziert) könnten keine Gruppe tragen und daher hier nicht vorkommen. Wenn das falsch ist,
  verschiebt es Ränge.
- Was ist mit einer Gruppe, deren Mitglieder auf *mehrere* Positionen verteilt sind?

### 3. Der Wächter steht vor jedem Build — ist das der richtige Ort?

`buildService.ts:277` (`refreshAuthoredFrames`) ruft `writeAllFrames()` vor jedem `quartz build`
(Zeile 420) und jedem `--serve`-Start (Zeile 291). Die Begründung steht im Kommentar dort: die
Kopie wird nur beim Bauen gelesen, also wird sie dort aufgefrischt statt an den acht Türen, die die
Config ändern können.

**Diese Entscheidung ist zweimal umgefallen, bevor sie stand.** Fragen:

- `writeAllFrames` (`layoutFrameService.ts:268`) **wirft nie** und schluckt jeden Fehler in ein
  `console.error`. Vor einem Build heißt das: ein Frame, das nicht geschrieben werden konnte, wird
  mit dem alten Stand gebaut, und niemand erfährt es. Ist „ein Build darf nicht an einer Reparatur
  scheitern, die er nicht bestellt hat" die richtige Abwägung?
- Ein Build **während ein Dev-Server läuft** schreibt Dateien neu, die dieser Server beobachtet.
  Nicht gemessen.
- `readGroupOrder` (`:229`) gibt bei unlesbarer Config `{}` zurück — also „keine Gruppen", was jedes
  Gruppen-Frame still in den Rückfall schickt. Ist das besser als abzubrechen?
- Nebenläufigkeit: `saveBreakpointWidths` schreibt dieselben Dateien und hat keine Sperre. Der
  Import ruft `saveFrame` je Frame. Was passiert bei zwei Builds gleichzeitig (zwei Projekte, ein
  Prozess)?
- Mein Kantenzug `buildService → layoutFrameService` hängt sich an einen Graphen, der schon zwei
  Zyklen enthält (`configService → snapshotService → projectPaths → configService` und
  `… → pluginService → snapshotService`). buildService liegt in keinem davon, aber die
  Initialisierungsreihenfolge im gebündelten Hauptprozess ist damit einen Schritt komplizierter.

### 4. Der `warned`-Set lebt so lange wie der Prozess

`layoutFrameService.ts:122`, im erzeugten Modul. Er verhindert, dass dieselbe Warnung 300-mal
erscheint — bei `quartz build` also einmal pro Lauf, richtig. Bei `quartz build --serve` ist es
einmal **überhaupt**: der Dev-Server importiert das Modul einmal und läuft stundenlang. Wer den
Fehler behebt und wieder hineinläuft, bekommt nichts mehr zu sehen.

### 5. Das Verbot doppelter Bereichsnamen steht nur im Renderer

`FrameBuilder.tsx:266` (`duplicateAreaNames`) verweigert das Speichern. Der Grund ist gemessen: zwei
Bereiche mit einem Namen setzen dieselbe `grid-area` auf zwei Rechtecke, CSS verwirft daraufhin die
*ganze* Deklaration — `grid-template-areas` wurde `none`, die Spuren fielen auf
`0px 0px 0px 0px 1248px` zusammen, alle Bereiche saßen übereinander.

**Der Hauptprozess prüft es nicht.** `saveFrame` nimmt, was kommt, und der Vorlagen-Import ruft es
direkt mit dem Inhalt eines fremden `.qtpl` (`templatePackage/parts.ts`, Teil `frames`). Ein Paket
mit zwei gleichnamigen Bereichen zerlegt das Raster des Zielprojekts, und `check:i18n`-artige
Prüfungen gibt es dafür nicht. Ich halte das für den wahrscheinlichsten echten Befund in diesem
Diff.

### 6. Eine Gruppe bleibt in der Config zurück, wenn ihr Bereich verschwindet

`FrameBuilder.tsx:445` (`updateAreaGroup`) und das Löschen eines Bereichs entfernen den Bereich,
aber nichts entfernt `layout.group` bei den Komponenten, die darauf zeigten. Sie werden dann von
`contentsFor` als unbeanspruchte Gruppe behandelt und landen im einfachen Bereich — kein Datenverlust,
aber ein Zustand, den niemand aufräumt. `GlobalBoard.tsx:132` (`groupNames`) speist die Auswahl
inzwischen aus drei Quellen, damit so eine Gruppe wenigstens sichtbar bleibt; das ist eine
Sichtbarmachung, keine Lösung.

### 7. Die Aufteilung im Board ist eine zweite Umsetzung von `contentsFor`

`GlobalBoard.tsx:179` (`indicesForArea`) rechnet im Renderer aus, was der erzeugte Frame beim Bauen
tut. Zwei Umsetzungen derselben Regel — genau die Bauart, die `gridFrameCss.ts` für die CSS-Seite
ausdrücklich vermeidet („beide rufen dieselben Funktionen auf"). Läuft sie auseinander? Der
auffälligste Unterschied: der Renderer kennt keine `Flex`, er filtert über `layout.group`; der Frame
kennt keine Config, er zählt Flexe.

### 8. Was ich benutzt und gemessen habe, und was daran offen blieb

Die interaktive Hälfte ist an der gebauten App durchgegangen (siehe letzten Commit und
`docs/decisions/layout-frames.md`). Zwei Befunde daraus habe ich **bewusst nicht** behoben:

- Ein Gruppen-Bereich, der nur auf Desktop platziert ist, nimmt seine Komponenten auf Tablet und
  Mobil von der Seite (`display: none`). Der Editor platziert einen neuen Bereich immer auf dem
  gerade bearbeiteten Breakpoint — der Normalfall ist also genau dieser, und `neverVisibleWarning`
  greift nicht.
- Der Hinweis am neuen Schalter kommt auf 4,37:1, wo bestehende Hinweise auf weißem Grund 4,76
  erreichen (beide 11px, `--text-muted`, in Hell gemessen). Unter AA, und es liegt am Ort — es ist
  der erste Hinweis in diesem blau getönten Panel.

Ob das die richtigen Entscheidungen waren, entscheidest du mit.

### 9. Die untere Schicht: der Handbuch-Server

`handbookServer.ts` bindet nur die Loopback-Adresse, antwortet nur auf GET und HEAD, prüft die
Einbettung nach `resolve()`/`relative()` und sendet kein `Access-Control-Allow-Origin`. Er bekommt
seinen Port vom Betriebssystem und wird über einen `will-quit`-Haken beendet. Das ist die
Behauptung; sie ist von niemandem gelesen worden. Dazu die dritte Antwort `'partial'` im Vertrag der
Server-Suche und ein `/proc`-Weg, der auf dieser Maschine nicht ausführbar ist.

## Was ausdrücklich kein Befund ist

- Dass die Seitenleiste „Backups" sagt und alles darin „Snapshot": bekannt, notiert, und eine
  Umbenennung träfe vierzehn Screenshots. Die Oberfläche ist bis zur Beta eingefroren.
- Dass `GlobalBoard` seinem `DndContext` keine `sensors` übergibt und der Tastatur-Sensor damit auf
  dnd-kits 25-px-Vorgabe läuft: gemessen (die Gruppen-Bereiche sind erreichbar, es brauchte rund 28
  Tastendrücke), vorbestehend, und als eigener Durchgang notiert. Wenn du meinst, dass der
  Gruppen-Umbau daraus einen *neuen* Fehler macht, ist das sehr wohl ein Befund.
- Dass die Beispielvorlage zwei leere Bereiche mitbringt, die +2rem auf jeder Inhaltsseite kosten:
  gemessen, gewollt, vom Nutzer entschieden.

## Form der Befunde

Wie bei den letzten fünf: je Befund eine Überschrift, die die Sache benennt, dann was passiert, dann
woran du es festmachst (Datei und Zeile), dann eine Einschätzung der Schwere. Kein Fix im Text —
darüber entscheidet der Nutzer.

Wenn du nichts findest, ist das ein Ergebnis. Schreib dann, wo du gesucht hast.
