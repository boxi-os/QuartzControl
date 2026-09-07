Du bist als zweites Paar Augen an einem Electron-Projekt, das kurz vor einer Beta steht. Es geht um
ein Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites. Repository: /Users/boxi/Development/Quartz-GUI, Branch `main`.

Lies zuerst `CLAUDE.md` im Wurzelverzeichnis. Dort stehen die Konventionen dieses Projekts als
Regeln, die Messungen dahinter in `docs/decisions/`. Ein Befund, der gegen eine dieser Regeln
verstößt, ist ein Befund; ein Befund, der eine Regel für falsch hält, ist auch einer — braucht dann
aber die Begründung.

## Umfang

Der Diff seit dem Tag `review-2026-09-07`. **Nicht seit dem Dateinamen dieses Auftrags** — der ist
geraten, der Tag ist es nicht.

    git log --oneline review-2026-09-07..main
    git diff review-2026-09-07..main -- electron/ src/ shared/ scripts/ electron-builder.yml

Der App-Code steht fest, die Doku wächst noch (dieser Auftrag liegt selbst im Bereich) — deshalb
steht hier keine Commit-Zahl.

**Dieser Diff ist deutlich größer als der letzte, und er hat zwei Schichten.** Die untere sind die
acht Fixes des vierten Reviews (`docs/REVIEW-2026-09-07.md`, PR #22) — gemessen, jeder mit Vorher
und Nachher, und von niemandem gelesen; der Tag sitzt bewusst davor. Die obere ist eine
Dokumentations-Sitzung, aus der mehr App-Code entstanden ist, als der Name vermuten lässt: ein neuer
IPC-Kanal, eine Änderung an der Verpackung, fünf neue Skripte und rund fünfzig geänderte
Nutzertexte.

Lies beide Review-Dokumente mit — nicht als Wahrheit, sondern als das, was behauptet wurde. Und
lies `docs/REVIEW-2026-09-07-auftrag.md`, damit du siehst, wonach zuletzt gesucht wurde.

## Zwei Dinge, die du zum Umfang wissen musst

**Das Benutzerhandbuch liegt außerhalb dieses Repos**, in einem Obsidian-Vault
(`~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`) und einem Quartz-Projekt daneben. Seine 104
Seiten sind *nicht* Gegenstand dieses Reviews; `docs/handbuch.md` beschreibt, wie es entsteht und
wie es in die App kommt. Was dich angeht, ist der Weg dorthin: das Skript, das es baut, die
Verpackung, die es mitnimmt, und der Kanal, der es öffnet.

**`resources/handbook/` ist gitignoriert** und entsteht beim Packen. Wer den Diff liest, sieht die
36 MB nicht, die dabei ins Bundle wandern.

## Eine Besonderheit, die du wissen musst

**Die Commits stammen von demselben Modell, das diesen Auftrag schreibt.** Meine Einschätzung, wo
die Risiken liegen, ist deshalb weniger wert als sonst: Ich kenne meine Zweifel, aber nicht meine
blinden Flecken. Die Liste unten ist ehrlich gemeint und ausdrücklich nicht die Grenze des Auftrags
— was ich *nicht* nenne, ist eher verdächtig als unverdächtig.

Drei Dinge folgen daraus für dich:

- Lies die Commit-Nachrichten als Behauptungen, nicht als Dokumentation. In diesem Projekt gilt eine
  Behauptung in einer Commit-Nachricht als Messung; wenn eine nicht trägt, ist das ein Befund. Alle
  drei mittleren Befunde des dritten Reviews waren genau das, und in diesem Diff stehen besonders
  viele Zahlen in Commit-Nachrichten.
- Prüfe besonders, wo ich **eine Zahl oder eine Grenze gewählt** habe.
- **Alles ist auf macOS gemessen.** Linux ist abgeleitet, Windows kommt nicht vor. Wo eine Aussage
  plattformabhängig ist und nur auf einer gemessen wurde, ist das ein Befund, kein Detail.

## Wo ich die größten Risiken vermute

Meine Einschätzung, nicht die Grenze des Auftrags. Nach abnehmender Unsicherheit.

### 1. `dialog.openHandbook` — Renderer-Eingabe wird zu einem Dateipfad

Der neue Kanal (`shared/ipc-contract.ts`, `electron/main/ipc/schemas.ts`,
`electron/main/ipc/handlers.ts`, `electron/main/menu.ts`) nimmt aus dem Renderer eine Zeichenkette
`page` und macht daraus einen Pfad, den `shell.openPath` öffnet. Das ist die Klasse, in der die
letzten Reviews Bugs gefunden haben.

Zwei Schranken sind eingebaut, und ich halte beide für richtig aufgeteilt — ein zod-Schema
(`handbookPage`, nur `[A-Za-z0-9/_-]`, also kein `.` und damit kein `..`) und danach
`resolve()`+`relative()` in `handbookFile()`. Was ich **nicht** geprüft habe:

- Ob `resolve()`+`relative()` reicht, wenn im Handbuch-Verzeichnis ein **Symlink** liegt.
  `containedPath()` in `templatePackage/shared.ts` löst dieselbe Frage — vergleiche die beiden, und
  wenn sie sich unterscheiden, ist die Abweichung ein Befund.
- Ob `shell.openPath` auf eine `.html`-Datei wirklich einen Browser öffnet und nicht irgendeinen
  registrierten Handler. Auf macOS tut es das; auf Linux ist es `xdg-open`.
- Der **stille Rückfall**: Eine Seite, die es nicht gibt, öffnet wortlos die Startseite des
  Handbuchs. Ich halte das für richtig gegenüber dem Nutzer — aber es ist genau das Muster, das der
  vierte Review als Befund führte („Ein Fehler, der weiß warum, muss den Grund tragen"). Entscheide
  selbst, ob die Begründung hier trägt.

### 2. Die Verpackung — und der Pfad, den ich nie ausgelöst habe

`electron-builder.yml` nimmt `resources/handbook` als `extraResources` mit, `scripts/before-pack.mjs`
baut es vorher. Gemessen habe ich an einer gepackten App: `isPackaged: true`, Pfad
`Contents/Resources/handbook/index.html`, vorhanden, Bundle 369 → 395 MB (inzwischen ~405 MB,
zweisprachig).

Was ungeprüft ist:

- **Der Fall „gepackt ohne Handbuch"** existiert im Code (`beforePack` fängt den Fehler, warnt und
  packt weiter; `openHandbook()` zeigt dann einen Dialog), ist aber **nie ausgelöst worden**. Der
  Dialog, sein Text und der Rückgabewert von `shell.openPath` sind ungetestet.
- Der `try/catch` in `beforePack` schluckt jeden Fehler, auch einen, der nichts mit einem fehlenden
  Projekt zu tun hat — ein voller Datenträger sähe genauso aus wie „kein Handbuch da".
- `process.resourcesPath` ist nur auf macOS gemessen. AppImage und deb sind abgeleitet.
- 36 MB in `extraResources` bei `asar: true`: geprüft ist, dass die Datei da ist, nicht was das mit
  Startzeit oder Signatur macht.

### 3. `mainLanguage()` — eine neue Ausnahme von einer Regel, die es schon gibt

`electron/main/i18n.ts` exportiert jetzt die gecachte Sprache, damit `menu.ts` zwischen
`index.html` und `en/index.html` wählen kann. `mainT()` hat für genau diesen Cache einen Wächter,
weil ein Aufruf vor `refreshMainLanguage()` die Sprache einfriert (dokumentiert in
`docs/decisions/i18n-and-vocabulary.md`, ein echter Bug von 2026-09-02). **`mainLanguage()` hat
diesen Wächter nicht.** Heute wird es nur innerhalb einer Funktion gerufen; ob das so bleibt,
entscheidet der nächste, der es benutzt.

### 4. Fünf neue Skripte, drei davon mit `rmSync(recursive, force)`

`scripts/screenshots.mjs`, `screenshot-demo.mjs`, `screenshot-scenes.mjs`, `build-handbook.mjs`,
`check-handbook-quotes.mjs`, dazu `routes.mjs` und ein Umbau an `smoke.mjs`. Sie laufen nicht in der
App, aber sie laufen auf dem Rechner des Nutzers:

- `resetDemoProfile()` löscht ein Verzeichnis unter `os.tmpdir()` rekursiv. `buildHandbook()` löscht
  `resources/handbook` rekursiv. Beide Pfade sind berechnet, keiner wird vor dem Löschen darauf
  geprüft, dass er das ist, wofür man ihn hält.
- `--demo` schreibt **in ein echtes Projekt**: Die drei Demo-Ziele landen in
  `~/Documents/QuartzControl-Handbuch/.quartz-gui/`. Das ist beabsichtigt und dokumentiert, aber ein
  Skript, das ein Projekt verändert, sollte man zweimal ansehen.
- `screenshot-scenes.mjs` startet einen Dev-Server und beendet ihn am Ende der Szene. Wirft etwas
  dazwischen, bleibt er laufen — es gibt kein `try/finally` um den Start.
- `check-handbook-quotes.mjs` und `screenshots.mjs` lesen `de.ts`/`en.ts` mit `new Function(src)()`.
  Eigene Dateien, also kein Angriffspfad — aber prüfe, ob die Regex, die `export default` und
  `as const` abschneidet, an jeder Fassung dieser Dateien trägt.

### 5. Rund fünfzig geänderte Nutzertexte, geprüft von einem Werkzeug, das nur Schlüssel sieht

Zwei Textdurchgänge (Commits „Fünfzehn Hinweise…" und „Vier Begriffe meinten zwei Dinge"). Vier
Begriffe wurden vereinheitlicht: `Baustein` → `Komponente` (für das auf der Seite Sichtbare),
`Vorlage` → `Quartz-Startvorlage` (für Quartz' eigene), `Frame/Template` → `Frame`,
`Ausgabeverzeichnis` → `Ausgabeordner`.

`npm run check:i18n` prüft, dass jeder Schlüssel existiert und dass de und en paritätisch sind. Es
prüft **nicht**, ob beide dasselbe sagen, und nicht, ob irgendwo im Code auf einen dieser Texte
gematcht wird. Beim Handbuch hat mich ein pauschales Ersetzen sechs Grammatikbrüche gekostet, die
ich selbst gefunden habe — such nach derselben Klasse in den Sprachdateien.

### 6. `PageHeader` bekommt eine vierte Ecke

`src/components/ui.tsx` nimmt jetzt einen `handbook`-Knoten, elf Routen reichen
`<HandbookLink page="…" />` herein, und `src/data/handbookPages.ts` ist die einzige Tabelle, die
deutsche und englische Pfade paart. Fragen, die ich nicht beantwortet habe:

- Der Verweis sitzt in derselben Spalte wie `<h1>` und Beschreibung. Ändert das etwas an der
  Vorlesereihenfolge oder an der Live-Region (`role="status"`) daneben?
- `HandbookLink` liest `i18n.resolvedLanguage`. Bei „Systemsprache folgen" mit einer dritten Sprache
  fällt es auf `de` zurück — ist das richtig, oder sollte es der Vorgabesprache folgen?
- Die Tabelle ist von Hand gepflegt und wird von nichts geprüft. Ein Tippfehler darin fällt still
  auf die Startseite des Handbuchs zurück (siehe 1). Ich habe alle 20 Verweise einmal an der
  laufenden App gedrückt; ein Skript daraus gibt es nicht.

### 7. Was aus dem vierten Review darunterliegt

`buildService.ts` (+182), `serverDiscovery.ts` (+99), `zipArchive.ts` (+36),
`templatePackage/index.ts`, `builtinTemplateService.ts`, `Templates.tsx`. Das sind die acht Fixes,
die niemand gelesen hat — der Logdateiname pro Lauf mitsamt Aufräumen und die Server-Erkennung, die
einen Vorgabeport nur noch nimmt, wenn der Prozess ihn hält, sind die größten Eingriffe.
`docs/REVIEW-2026-09-07.md` sagt, was sie tun sollen.

## Was ausdrücklich kein Befund ist

- Dass die Seitenleiste „Backups" sagt und alles darin „Snapshot": bekannt, notiert, und eine
  Umbenennung träfe vierzehn Screenshots. Die Oberfläche ist bis zur Beta eingefroren.
- Dass `scripts/routes.mjs` Layout als einen Eintrag führt, während Konfiguration, Stile und Plugins
  ihre Unterreiter einzeln nennen: bekannt, steht in `docs/handbuch.md`. Dass Smoke-Test und
  Screenshots zwei Bildschirme deshalb nie sehen, ist die Folge — ob *die* ein Befund ist,
  entscheidest du.
- Dass auf englischen Handbuchseiten „Inhaltsverzeichnis" steht: eine Grenze von Quartz, gemessen
  (BEFUNDE 29), in beiden Fassungen als Grenze dokumentiert.

## Form der Befunde

Wie bei den letzten vier: je Befund eine Überschrift, die die Sache benennt, dann was passiert, dann
woran du es festmachst (Datei und Zeile), dann eine Einschätzung der Schwere. Kein Fix im Text —
darüber entscheidet der Nutzer.

Wenn du nichts findest, ist das ein Ergebnis. Schreib dann, wo du gesucht hast.
