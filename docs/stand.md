# Stand und Reviews — aus CLAUDE.md

Wörtlich aus `CLAUDE.md` hierher gezogen am 2026-10-16 (Abschnitt „Die Reviews“ samt Release-, Alpha- und Gruppe-D-Stand). Die Chronik selbst steht in [`reviews.md`](reviews.md). Links in diesem Text nennen die Projektwurzel (`docs/…`).

## Die Reviews

Alle fünfundvierzig Listen sind abgearbeitet (die fünfundvierzigste am 2026-10-16, die letzte vor
dem Release von 1.1: die Fixes des vierundvierzigsten, die zwölf Nutzerbefunde vom 2026-10-14 und
die neu gegliederten Plugin-Optionen auf `feat/1.1`,
[`docs/REVIEW-2026-10-19.md`](REVIEW-2026-10-19.md); was daraus geworden ist und was aus ihr
noch auf den Nutzer wartet, steht am Ende der Chronik — **keinen dieser Fixes hat ein Review
gelesen**). Seit der zweiundvierzigsten wird fremdes Markup für die Website neu geschrieben und am
Parser der Website geprüft (`check:inline-svg`), seit der dreiundvierzigsten an *jedem* Leser:
auch an der Markdown-Kette eines Schnipsels, mit Attributnamen wie HTML und Werten wie CSS. Seit
der dreiundvierzigsten nennt eine Zahl, die einen Fix belegt, mindestens einen ihrer Fälle mit
Ursache (`docs/conventions.md`). Seit der vierzigsten zieht kein
Schreiber ein Projekt nach `_quartzcontrol.scss` um; das tut nur „Jetzt umstellen“ auf der
Stile-Seite, mit Snapshot. Seit der einundvierzigsten ist die Liste mit Leiste (`DetailLayout`)
eine Regel in `docs/conventions.md`. Die
Chronik steht in [`docs/reviews.md`](reviews.md) — welches Review welchen Stand gelesen hat,
mit welchen Zahlen, was es gefunden hat und welche Fixes noch niemand gelesen hat. Sie stand bis zum
2026-09-17 hier und ist wörtlich dorthin gewandert; die Review-Dokumente selbst liegen als
`docs/REVIEW-<datum>.md`, die Aufträge daneben als `docs/REVIEW-<datum>-auftrag.md`.

**Was aus einer Runde dauerhaft gilt, steht als Regel in `docs/conventions.md`** — nicht in der
Chronik. Die Chronik nachzulesen lohnt für zwei Fragen: *warum* eine Regel so lautet, wenn der
Absatz in `docs/decisions/` sie nicht beantwortet, und *was gerade ungelesen ist* — die Serie ist
so gebaut, dass jede Runde liest, was die vorige gebaut hat.

**Release:** `1.0.2` ist am 2026-10-07 veröffentlicht (Tag `v1.0.2` auf `985fbde`, zehn Pakete,
`latest.json`, die App-Website) — die Fehlerbehebung nach 1.0.1 samt den Fixes des
neununddreißigsten Reviews. Davor `1.0.1` am 2026-09-28 (Tag `v1.0.1` auf `1653dc0`). Davor `1.0.0` am 2026-09-25 (Tag `v1.0.0` auf `f98a991`, Release-Seite
mit zehn Paketen, `latest.json`, die App-Website, die drei Plugin-Handbücher und die
Example-Website); Ablauf und Funde oben in [`docs/release.md`](release.md). Davor
`1.0.0-rc.1` am 2026-09-21.

**Die Fehlerbehebung für 1.0.2** (2026-10-06/07, `fix/1.0.2`, mit 1.0.2 am 2026-10-07
veröffentlicht): vier Befunde des Nutzers (Variable an der
Cursorposition, geleerte Plugin-Option entfernt den Schlüssel, Dev-Server weicht belegten Ports
aus, Git-Sync ohne `origin` gesperrt) und [`docs/plan-1.1.md`](plan-1.1.md), der Plan für 1.1.
**Das neununddreißigste Review ist abgearbeitet** ([`docs/REVIEW-2026-10-13.md`](REVIEW-2026-10-13.md);
0 Hoch, 2 Mittel, 5 Niedrig) — **gelesen vom selben Modell, das die Commits geschrieben hat**
(Claude Opus 5.5 in einem eigenen Agenten; Fable stand nicht mehr zur Verfügung). Ein Start lehnt
jetzt ab, wenn ein Server desselben Projekts außerhalb der App läuft, statt still einen zweiten in
dasselbe `public/` zu setzen; der Cursor im CSS-Editor gilt nur nach einer Aktion des Nutzers als
gesetzt; Git-Sync trennt „kein Repository“ von „konnte nicht lesen“; ein Plugin-Feld lässt sich
ausdrücklich leer setzen. Was daraus geworden ist, steht am Ende von
[`docs/reviews.md`](reviews.md). **Keinen dieser Fixes hat ein Review gelesen, und kein
anderes Modell die Commits davor.**

Das achtunddreißigste Review ist abgearbeitet (gelesen 2026-09-28,
[`docs/REVIEW-2026-10-12.md`](REVIEW-2026-10-12.md); 0 Hoch, 2 Mittel, 7 Niedrig): Es las die
Fehlerbehebung für 1.0.1 auf `fix/1.0.1`. Die Google-Schriften holen jetzt, was die eigenen Regeln
eines Projekts nicht decken, statt die ganze Familie auszulassen; „In beiden Modi gleich“ tut, was
es sagt; das Schloss der Stylesheets sagt, wo es endet, und die Bau-Tür hält es selbst. Neun Commits
auf `fix/1.0.1`, mit 1.0.1 am 2026-09-28 veröffentlicht. Das neununddreißigste hat diese Fixes
gelesen und nicht neu gemessen.

Das siebenunddreißigste Review ist abgearbeitet (gelesen 2026-09-24,
[`docs/REVIEW-2026-10-11.md`](REVIEW-2026-10-11.md), Auftrag
[`docs/REVIEW-2026-10-11-auftrag.md`](REVIEW-2026-10-11-auftrag.md); 0 Hoch, 3 Mittel, 6
Niedrig): Es las die Fixes der 36. Runde und die Korrekturen danach und riet, nichts
zurückzunehmen. Alle neun Befunde und die Nebenbei-Liste auf `fix/review-2026-10-11`, per
Fast-Forward auf `main` und gepusht — die dunkle Marke der Vorlagen gilt nicht mehr als in der App
gewählt, ein verweigerter Schlüsselbund wird als solcher gesagt, und der Preis je Tastendruck auf
der Variablen-Seite ist gesenkt (Hub-Variablen 47–85 → 21–48 ms ohne Long Task). Was daraus
geworden ist, steht am Ende von [`docs/reviews.md`](reviews.md). Diese Fixes sind in
1.0.0 enthalten. **Keinen dieser Fixes hat ein Review gelesen.**

Die Runde davor (sechsunddreißigstes Review, [`docs/REVIEW-2026-10-10.md`](REVIEW-2026-10-10.md),
1 Mittel, 10 Niedrig) ist abgearbeitet; das siebenunddreißigste hat ihre Fixes gelesen.

**Stand:** Die neun Befunde des vierunddreißigsten Reviews (zwei Mittel, sieben Niedrig) sind
abgearbeitet, am 2026-09-20 auf `fix/review-2026-10-08`, dazu alle vier Nebenbei-Punkte — 12
Commits, je einer mit Typcheck, Build und Smoke. Die Runde las die zwanzig Fixes der vorigen und
fand zwei, die nicht halten, weil die Messung in der Commit-Nachricht einen Weg ausgelassen hatte:
der Editor fällt weiter auf den alten Stand zurück, wenn binnen einer Viertelsekunde nach dem
Tippen gespeichert wird (1), und „ein unbrauchbarer Dateiname ist ein Fehler“ war an lateinischen
Schriften gemessen und sperrte jede japanische, koreanische und chinesische Familie aus (2). Was
die Runde gefunden hat, steht in [`docs/REVIEW-2026-10-08.md`](REVIEW-2026-10-08.md), was
daraus geworden ist in [`docs/reviews.md`](reviews.md); die Messungen in
[`docs/decisions/styles-and-fonts.md`](decisions/styles-and-fonts.md) und
[`docs/decisions/snapshots-and-updates.md`](decisions/snapshots-and-updates.md), die fünf
neuen Regeln in [`docs/conventions.md`](conventions.md). Offen ist aus dieser Runde nichts.
Was `docs/release.md` daraus verlangte, ist am 2026-09-20 mit dem Alpha-Test erledigt: Punkt 3
(Handbuch- und Web-Projekt einmal durch die App bauen, damit die Schrift-URLs relativ werden) und
Punkt 4 (`d4da5ef` ausrollen — die Vorlage liegt in drei Kopien gleich, die sieben bestehenden
Projekte sind nachgezogen). Die Website ist am selben Tag veröffentlicht und an ihrer echten
Adresse nachgemessen; die relativen Schrift-URLs waren dort schon seit dem Deploy um 13:47.
**Keinen dieser Fixes hat ein Review gelesen.**

**Der Alpha-Test ist gefahren** (A1–A4, B1–B2, C1): Ergebnisse in
[`docs/ALPHA-2026-09-20.md`](ALPHA-2026-09-20.md), Checkliste und Durchgänge in
[`docs/alpha-test.md`](alpha-test.md). Zwei Befunde, beide behoben.

**Danach, am 2026-09-20 und -21, eine Runde ohne Review dahinter: die Vorlagen.** Was dauerhaft
gilt, steht in [`docs/conventions.md`](conventions.md); hier nur, was sich am Stand geändert
hat.

- **Das eingebaute Paket ist nicht mehr das Example.** Wer ein Projekt anlegte, bekam entweder ein
  fremdes Handbuch mit 301 Inhaltsdateien oder — ohne das Häkchen — eine Gestaltung ohne einen
  einzigen Satz. `qc-basic.qtpl` („Basis-Template") ist die vierte Variante und seither das, was
  `builtinTemplateService.ts` holt: dieselbe Gestaltung, je eigenem Plugin ein oder zwei
  Komponenten, zwanzig Seiten in zwei Sprachen, **trotzdem alle Stylesheets** (31, seit 1.1 zu
  zwölf zusammengefügt) — wer eine abgeschaltete Komponente einschaltet, bekommt sie fertig. Das Example heißt jetzt
  `qc-example.qtpl`; `minimal-lesbar.qtpl` bleibt im Vorlagen-Repo **eingefroren** liegen, weil
  jede vor diesem Tag ausgelieferte App genau diese Adresse fragt.
- **Die Example-Website navigiert über quartz-navigations** (Akkordeon links mit Schublade, Pager
  unter dem Text), **seit dem 2026-09-21 auch die vier Handbuch-Websites** — die Doku-Pakete
  trugen bis dahin den Explorer, und als das Example ihn abschaltete, gingen drei Websites ohne
  Navigation online. Das Navigations-Handbuch bekommt die Doku-Pakete nur ohne den Baustein
  „Plugins“ (`docs/release.md`). Der Explorer ist abgeschaltet und bleibt gestaltet. Eine Kapitelleiste im Kopf
  stand einen Nachmittag lang und ist an einer Rechnung gescheitert, die kein CSS löst: sieben
  Kapitelnamen sind 880 px, der Kopf hat neben Marke und Bedienelementen 680 px.
- **Drei Befunde gingen ins Plugin zurück** (quartz-navigations 0.3.1): `persistState` schloss mit
  `exclusive` den Ordner der gelesenen Seite, der Pager zeigte einen leeren Kasten, und er quetschte
  zwei Buttons in 48 % einer Telefonzeile. Eine Vorlage zu bauen ist der schärfste Test für das
  Plugin, auf dem sie steht.
- **Schriften:** Noto Sans und Noto Sans Mono, zwei Familien statt drei, drei Dateien statt vier.
  Phase 6 räumt jetzt auf — der Baustein `fonts` packt ein, was im Ordner liegt, nicht, was der
  Block nennt.
- **66 CSS-Variablen** (waren 45): die dreizehn Callout-Farben zogen aus `body-callouts.scss` in
  den Variablen-Tab, dazu der Scrim der Schublade und sechs Schalter, mit denen jede Seitenspalte
  stehen bleibt oder mitläuft.
- **Fünf Websites sind auf diesem Stand veröffentlicht**: die App-Website, die drei
  Plugin-Handbücher und die Example-Vorführung. Die zwei Doku-Pakete sind neu gebaut; das
  Benutzerhandbuch nennt den richtigen Button (heute vier Nennungen je Sprache,
  gezählt am 2026-09-21).
- **Gegengeprüft in drei Engines.** Chromium und WebKit auf dem Mac, Gecko in der Debian-VM — auf
  dem Mac startet Firefox nicht, und die VM braucht Playwrights eigenen Build, nicht ihr
  System-Firefox. Sieben Messungen, alle drei Engines einig
  ([`docs/decisions/styles-and-fonts.md`](decisions/styles-and-fonts.md)).

**Aus Gruppe D sind die Pakete und glibc nachgezogen** (2026-09-20,
[`docs/GRUPPE-D-2026-09-20.md`](GRUPPE-D-2026-09-20.md)): `npm run dist` ist seit dem
Handbuch-Rückbau erstmals wieder gelaufen, zehn Pakete entstanden, **neun sind auf einer Maschine
ihrer Architektur gestartet**. Die Linux-Pakete verlangen **glibc ≥ 2.34** — nicht wegen Electron
(das kommt mit 2.25 aus), sondern wegen des mitgelieferten git, dessen Bauplatz die
libpthread-Verschmelzung hineinträgt. **Systeme darunter werden nicht unterstützt** (Anforderung
in beiden READMEs und `release.md` Punkt 7) — was aber nur sagt, was zugesagt wird, und nicht, was
die App dort sagt: Sie riet zum Neuinstallieren, dem einen Handgriff, der nichts ändert. Drei
Befunde, alle behoben: die Version des mitgelieferten git trug auf Linux einen Punkt zu viel,
`release.md` Punkt 4 nannte offen, was derselbe Commit getan hatte, und das Warnband gab einem
alten Linux den falschen Rat. Offen bleiben aus dieser Gruppe (VoiceOver ist am 2026-09-21 gefahren, ein Befund in der
Schriftliste, behoben) **macOS x64 auf einer Maschine seiner
Architektur** (kein Intel-Mac, kein Rosetta) und **ein Linux mit glibc unter 2.34** — dazu weiter
**C1 auf einem echten Linux mit git vor 2.38**; beide VMs liefern 2.47.3.

Die Runde davor (dreiunddreißigstes Review, dreizehn Befunde, vier Mittel) ist abgearbeitet und
auf `main`; das vierunddreißigste hat sie gelesen und achtzehn ihrer zwanzig Fixes bestätigt.
**Was drei Reviews in Folge vor dem RC empfehlen, ist keine weitere Runde dieser Art**, sondern
die Liste, die nur der Nutzer abarbeiten kann: VoiceOver über Git-Sync und die zwei Boards, die
gepackte App je Plattform, glibc — und den Alpha-Test, an Projekten aus der Beispielvorlage und
mit einer gebauten Website am Ende jeder Szene, weil die Befunde, auf die es ankommt, in der App
unsichtbar und erst im Browser zu sehen sind. **Die Szenen stehen als Checkliste in
[`docs/alpha-test.md`](alpha-test.md)** — sieben aus dieser Schicht, in drei Gruppen
(Schriften, Speichern, Kern-Update), je mit Vorbedingung, Schritten und dem, was der *Browser*
danach zeigen muss.

**Davor, am 2026-09-19, ein Durchgang ohne Review dahinter:** die Schriften der Stile-Seite von
der Auswahl bis zu den Dateien im Projekt (Combobox über alle Google-Familien, Vorschau aus dem
Bau, ungenutzte Importe, „lokal ausliefern“ holt die Dateien wirklich ins Projekt, relative
`url()`, `save()` über alle Reiter), der Rückbau des mitreisenden Handbuchs und der Reiter
„Website“ als fünf Karten. **Das dreiunddreißigste Review hat beides gelesen**
(`docs/REVIEW-2026-10-07-auftrag.md`, Tag `review-2026-10-08`) — sein größtes Risiko war der
Code, der aus dem Netz in das Projekt schreibt und dort löscht, und genau dort lagen drei der vier
mittleren Befunde.

**Arbeitsregel** für die nächste Liste: ein Befund pro Durchgang, jeweils mit `npm run typecheck`,
`npm run build`, `npm run smoke` und eigenem Commit; was dabei nebenbei auffällt, wird gesammelt und
genannt, nicht mit erledigt. Was nur ein laufendes Programm beantworten kann, wird an der gebauten
App gemessen — und wo es geht mit einer Vorher-Messung, denn zwei der Befunde traten anders auf als
das Review sie beschrieb (der geteilte Optionen-Zustand erst nach einem Routenwechsel, der hängende
Content-Link mit ENOTDIR statt ENOENT).

