# Die Review-Serie

Die Chronik der Reviews: welches Review welchen Stand gelesen hat, mit welchen Zahlen, was es
gefunden hat und was daraus als Regel geblieben ist. Sie stand bis zum 2026-09-17 in `CLAUDE.md`
und ist von dort **wörtlich** hierher gewandert — dieselbe Bewegung wie die der Messungen nach
`decisions/` und aus demselben Grund: `CLAUDE.md` war auf 192 KB gewachsen (189 055 Zeichen, und
beide Zahlen standen als „189 KB“ nebeneinander), von denen diese Chronik gut 100 KB waren, und sie
beschreibt, was *war*, nicht was *gilt*. Was gilt, steht als Regel in
[`conventions.md`](conventions.md); die Messungen dahinter in [`decisions/`](decisions/).

Geändert ist gegenüber der Fassung in `CLAUDE.md` nur das Ziel der Markdown-Links: `](docs/…)` ist
`](…)`, weil diese Datei selbst in `docs/` liegt. Pfade im Fließtext nennen weiter die
Projektwurzel. **„Oben“ meint in diesem Text `conventions.md`**: Der verschobene Text sagt an gut
zwei Dutzend Stellen „Regel oben unter Prozessgrenze“ oder „steht oben in den passenden
Abschnitten“, und oben steht hier nichts mehr — das ist der Preis dafür, dass er wörtlich gewandert
ist (fünfundzwanzigstes Review, Befund 8). Die Arbeitsregel steht in `CLAUDE.md`: sie sagt, wie
gearbeitet wird, und nicht, was war.

## Befunde aus den Reviews (Stand 2026-09-21)

Alle fünfunddreißig Listen sind abgearbeitet; die zwei jüngsten (`REVIEW-2026-10-08.md`,
`REVIEW-2026-10-09.md`) stehen am Ende dieser Datei. [`docs/REVIEW-2026-09-02.md`](REVIEW-2026-09-02.md),
[`docs/REVIEW-2026-09-05.md`](REVIEW-2026-09-05.md) mit seinen 15 Befunden,
[`docs/REVIEW-2026-09-06.md`](REVIEW-2026-09-06.md) mit seinen sechs,
[`docs/REVIEW-2026-09-07.md`](REVIEW-2026-09-07.md) mit seinen acht,
[`docs/REVIEW-2026-09-08.md`](REVIEW-2026-09-08.md) mit seinen acht,
[`docs/REVIEW-2026-09-09.md`](REVIEW-2026-09-09.md) mit seinen acht,
[`docs/REVIEW-2026-09-10.md`](REVIEW-2026-09-10.md) mit seinen acht und
[`docs/REVIEW-2026-09-11.md`](REVIEW-2026-09-11.md) mit seinen acht und
[`docs/REVIEW-2026-09-12.md`](REVIEW-2026-09-12.md) mit seinen fünf und
[`docs/REVIEW-2026-09-13.md`](REVIEW-2026-09-13.md) mit seinen sieben und
[`docs/REVIEW-2026-09-14.md`](REVIEW-2026-09-14.md) mit seinen zwölf und
[`docs/REVIEW-2026-09-16.md`](REVIEW-2026-09-16.md) mit seinen neun und
[`docs/REVIEW-2026-09-17.md`](REVIEW-2026-09-17.md) mit seinen vier und
[`docs/REVIEW-2026-09-18.md`](REVIEW-2026-09-18.md) mit seinen vier und
[`docs/REVIEW-2026-09-19.md`](REVIEW-2026-09-19.md) mit seinen sieben und
[`docs/REVIEW-2026-09-20.md`](REVIEW-2026-09-20.md) mit seinen neun und
[`docs/REVIEW-2026-09-21.md`](REVIEW-2026-09-21.md) mit seinen acht und
[`docs/REVIEW-2026-09-22.md`](REVIEW-2026-09-22.md) mit seinen sieben und
[`docs/REVIEW-2026-09-23.md`](REVIEW-2026-09-23.md) mit seinen sieben und
[`docs/REVIEW-2026-09-24.md`](REVIEW-2026-09-24.md) mit seinen fünf und
[`docs/REVIEW-2026-09-25.md`](REVIEW-2026-09-25.md) mit seinen sieben und
[`docs/REVIEW-2026-09-26.md`](REVIEW-2026-09-26.md) mit seinen vier und
[`docs/REVIEW-2026-09-27.md`](REVIEW-2026-09-27.md) mit seinen sechs und
[`docs/REVIEW-2026-09-28.md`](REVIEW-2026-09-28.md) mit seinen sieben und
[`docs/REVIEW-2026-09-29.md`](REVIEW-2026-09-29.md) mit seinen neun und
[`docs/REVIEW-2026-09-30.md`](REVIEW-2026-09-30.md) mit seinen neun und
[`docs/REVIEW-2026-10-01.md`](REVIEW-2026-10-01.md) mit seinen sechs und
[`docs/REVIEW-2026-10-02.md`](REVIEW-2026-10-02.md) mit seinen fünf und
[`docs/REVIEW-2026-10-03.md`](REVIEW-2026-10-03.md) mit seinen fünf und
[`docs/REVIEW-2026-10-04.md`](REVIEW-2026-10-04.md) mit seinen fünf und
[`docs/REVIEW-2026-10-05.md`](REVIEW-2026-10-05.md) mit seinen fünf und
[`docs/REVIEW-2026-10-06.md`](REVIEW-2026-10-06.md) mit seinen sechs und
[`docs/REVIEW-2026-10-07.md`](REVIEW-2026-10-07.md) mit seinen dreizehn (Aufträge daneben in
`docs/REVIEW-2026-09-05-auftrag.md`, `-06-` bis `-30-`, `2026-10-01-` bis `-07-auftrag.md`) stehen als
Dokumente unverändert; die Messungen zu jedem Fix liegen in `docs/decisions/`, und was dauerhaft
gilt, steht oben als Regel. [`docs/REVIEW-2026-09-15.md`](REVIEW-2026-09-15.md) gehört nicht
in diese Zählung: Die „fünfzehnte Runde“ las die Handbücher der zwei Plugins gegen deren Code und
aus diesem Repo nur zwei Commits der Beispielvorlage (`fe2b701`, `9592121`).

**Das fünfundzwanzigste Review misst ab `review-2026-09-29`** und liest bis
`review-2026-09-30`, das auf dem Commit „Der Auftrag fuer das fuenfundzwanzigste Review“ (`main`)
sitzt; der Auftrag steht in
[`docs/REVIEW-2026-09-29-auftrag.md`](REVIEW-2026-09-29-auftrag.md). Es ist das erste, dessen Diff
**drei Schichten** hat, von denen zwei kein Review angestoßen hat:

- die zwölf Commits, mit denen die sieben Befunde des vierundzwanzigsten Reviews und drei Punkte
  seiner Nebenbei-Liste abgearbeitet wurden (11 Dateien, +327/−75, im App-Code 7 Dateien,
  +186/−66) — gepusht;
- **drei Sätze des Nutzers über die Darstellung**: ein umbrechender Knopf in der Serverliste, die
  Vorlagen-Seite, die ihre Breite jetzt in Spalten ausgibt statt in eine 1041 px lange Karte, und
  die Box „Aktuell geltende Farben und Schriften“, die eingeklappt beginnt (5 Dateien, +199/−130,
  ohne die Einrückung des ausklappbaren Blocks +84/−15). Dazu Kapitel 4.5 und 4.9 des Handbuchs in
  beiden Sprachen und zehn Screenshots, die im Vault liegen und nicht in diesem Repo;
- **die Teilung dieser Datei und der Regeln**: `CLAUDE.md` war auf 192 KB gewachsen und bekam
  dafür eine Warnung; die Chronik (diese Datei, 103 KB) und der Regelteil
  ([`conventions.md`](conventions.md), 68 KB) sind wörtlich herausgewandert, letzterer über
  `@docs/conventions.md` eingebunden. `CLAUDE.md` ist damit 25 KB (3 Dateien, +2023/−1957, netto
  +66; mit dem, was der Auftrags-Commit an denselben drei Dateien nachträgt, +2054/−1957). Die
  −1884 einer früheren Fassung waren die Löschungen des *Gesamtdiffs* gegen den Tag, in einem
  Absatz, der selbst sagt, dass jede Schicht gegen ihre eigene Basis gerechnet wird
  (fünfundzwanzigstes Review, Befund 8).

Als größtes Risiko nennt der Auftrag die dritte Schicht, und zwar nicht das Verschieben — das ist
in beide Richtungen gegengeprüft und byte-gleich —, sondern die Einbindung: Greift
`@docs/conventions.md` in einer Sitzung nicht, gilt eine Regel, die niemand mehr vor Augen hat. Der
Rückfallsatz daneben („lies die Datei zuerst“) ist dafür da und ist **nicht gemessen**; die Sitzung,
die geteilt hat, hatte die alte Datei längst gelesen. Daneben: der `2xl`-Zweig der neuen
Spaltenleiter, den ein Fenster auf diesem Bildschirm (1470 px) nie erreicht, und die Zahl in der
eingeklappten Zeile, die eine Konstante ist. Das Review geht an ein anderes Modell als die Commits.
Der Stand ist **nicht gepusht**.

**Das sechsundzwanzigste Review misst ab `review-2026-09-30`** und liest bis `review-2026-10-01`,
das auf dem Commit „Der Auftrag fuer das sechsundzwanzigste Review“ (`fix/review-2026-09-29`)
sitzt; der Auftrag steht in [`docs/REVIEW-2026-09-30-auftrag.md`](REVIEW-2026-09-30-auftrag.md).
Sein Diff sind die vierzehn Commits, mit denen die neun Befunde des fünfundzwanzigsten Reviews und
drei Punkte seiner Nebenbei-Liste abgearbeitet wurden: ohne Review-Dokument und Auftragsdatei
19 Dateien, +496/−113, davon in App-Code und Skripten 14 Dateien, +316/−81. Als größtes Risiko
nennt er die sechste Runde an der Paketliste — diesmal keine neue Bindung, sondern zwei
Verengungen — und den neuen Zustand `installFailed`, der „Nicht abgeschlossen“ einen zweiten Grund
gibt, den das Handbuch noch nicht kennt. **Nachgetragen:** Der Tag ist danach auf den Nachtrag
zum Auftrag versetzt worden, damit die Runde auch `a684e37` liest (`inline-flex` im
`Button`-Primitive, Schicht 2: 12 Dateien, +45/−60); beide Schichten sind auf `main` gepusht.

**Das siebenundzwanzigste Review misst ab `review-2026-10-01`** und liest bis `review-2026-10-02`,
das auf dem Commit „Der Auftrag fuer das siebenundzwanzigste Review“ (`main`) sitzt; der Auftrag
steht in [`docs/REVIEW-2026-10-01-auftrag.md`](REVIEW-2026-10-01-auftrag.md). Sein Diff hat zwei
Schichten: die Fixes der neun Befunde des sechsundzwanzigsten Reviews und eines Nebenbei-Punkts
(ohne Review-Dokument 17 Dateien, +336/−86), und zwei Wünsche des Nutzers, die kein Review
angestoßen hat — der Marker in `custom.scss` heißt `QuartzControl:managed:`, mit Migration und
gegen die Regel, die das bis dahin ausschloss, und der Content-Ordner ist kein eigener Reiter mehr,
sondern die erste Gruppe unter „Website“ (13 Dateien, +179/−104). Als größtes Risiko nennt er die
Migration, weil der Marker ein Format auf fremder Platte ist. Das Review geht wieder an Claude
Fable 5.1 — an dasselbe Modell, dessen Vorschläge (`putBack`, die SHA-Prüfung, `dropOutcome` im
Frame-Builder) diese Runde umsetzt; der Auftrag bittet deshalb, zuerst die Vorschläge anzugreifen
und dann die Umsetzung.

**Das achtundzwanzigste Review misst ab `review-2026-10-02`** und liest bis `review-2026-10-03`,
das auf dem Commit „Der Auftrag fuer das achtundzwanzigste Review“ (`main`) sitzt; der Auftrag
steht in [`docs/REVIEW-2026-10-02-auftrag.md`](REVIEW-2026-10-02-auftrag.md). Sein Diff hat zwei
Schichten: die Fixes der sechs Befunde des siebenundzwanzigsten Reviews (ohne Review-Dokument
16 Dateien, +294/−81) und, auf Wunsch des Nutzers, alles, was danach noch offen stand
(10 Dateien, +71/−29). Als größtes Risiko nennt er die zweite Runde an den Markern, weil sie nicht
mehr nur den Namen, sondern die Semantik ändert (zwei Kopien werden als Vereinigung gelesen und
geschrieben), und das bisher nur an Bündeln gemessen ist. Er bittet außerdem um einen eigenen
Abschnitt dazu, ob der Stand ein Release Candidate sein kann.

**Das neunundzwanzigste Review misst ab `review-2026-10-03`** und liest bis `review-2026-10-04`,
das auf dem Commit „Der Auftrag fuer das neunundzwanzigste Review“ sitzt; der Auftrag steht in
[`docs/REVIEW-2026-10-03-auftrag.md`](REVIEW-2026-10-03-auftrag.md). Sein Diff hat drei Schichten:
die fünf Befunde des achtundzwanzigsten Reviews (ohne Review-Dokument 10 Dateien, +199/−37), die
vier Nebenbei-Punkte (12 Dateien, +189/−19) und zwei beim Abarbeiten gefundene Punkte (5 Dateien,
+47/−20). Anders als in den Vorrunden sind nicht alle Richtungen vom Review: Vier Entscheidungen hat
kein zweites Modell vorgeschlagen — ein sechster Satz auf dem Abbruch-Kanal, welcher Abschnitt für
einen fehlenden einspringen darf, die Kollisionsrechnung für Tastatur-Drags im Frame-Builder und
`isOwnPlace`. Als größtes Risiko nennt der Auftrag die Kollisionsrechnung, weil sie für jeden
Tastatur-Drag gilt und nur an einem Frame ohne Scrollen gemessen ist.

**Das dreißigste Review misst ab `review-2026-10-04`** und liest bis `review-2026-10-05`, das auf
dem Commit „Der Auftrag fuer das dreissigste Review“ sitzt; der Auftrag steht in
[`docs/REVIEW-2026-10-04-auftrag.md`](REVIEW-2026-10-04-auftrag.md). Es ist bewusst kurz und steht
vor dem RC: zwei Schichten (die fünf Befunde, 10 Dateien +204/−39 ohne Review-Dokument; die vier
Nebenbei-Punkte, 13 Dateien +187/−36). Als größtes Risiko nennt der Auftrag den Frame-Builder, weil
zwei Commits ändern, was ein Drag dort tut — die Startzelle als Platz beim Aufnehmen und die
24-px-Spalten der Ablagefläche samt waagerechtem Rollen —, und weil das *Wie* in beiden eine eigene
Entscheidung ist, die kein zweites Modell geprüft hat.

**Das einunddreißigste Review misst ab `review-2026-10-05`** und liest bis `review-2026-10-06`,
das auf dem Commit „Der Auftrag fuer das einunddreissigste Review“ sitzt; der Auftrag steht in
[`docs/REVIEW-2026-10-05-auftrag.md`](REVIEW-2026-10-05-auftrag.md). Es ist die letzte Runde vor
dem RC. Zwei Schichten: die fünf Befunde des dreißigsten Reviews (ohne Review-Dokument 6 Dateien,
+95/−15), vier davon mit einer Richtung vom Review, und die Nebenbei-Liste samt drei beim
Abarbeiten gefundenen Punkten (12 Dateien, +331/−113), **sieben Code-Commits ohne Richtung**. Als
größtes Risiko nennt der Auftrag `0920f95`, weil er für jeden Tastatur-Drag im Frame-Builder
ändert, was „noch nicht bewegt“ heißt — die Annahme, die das dreißigste Review ausdrücklich
bestätigt hatte —, und bittet, die zweite Schicht zuerst anzugreifen.

**Das zweiunddreißigste Review misst ab `review-2026-10-06`** und liest bis `review-2026-10-07`,
das auf dem Commit „Der Auftrag fuer das zweiunddreissigste Review“ sitzt; der Auftrag steht in
[`docs/REVIEW-2026-10-06-auftrag.md`](REVIEW-2026-10-06-auftrag.md). Zwei Schichten: die fünf
Befunde des einunddreißigsten Reviews (ohne Review-Dokument 11 Dateien, +256/−28) und seine
Nebenbei-Liste (9 Dateien, +182/−11). **Es ist die erste Runde, in der Review, Fixes und Auftrag
vom selben Modell stammen** (Claude Fable 5.1, eine Sitzung) — der Auftrag sagt das an erster
Stelle und bittet einen Leser desselben Modells, mehr zu messen als zu lesen. Als größtes Risiko
nennt er die zwei Eingriffe in geteilten Code (`inSight` in `stepFrom`, das beide Boards bedient,
und `editedSinceMergeStopped`, eine Nachbildung von gits Regel, geprüft an einer Szene), als
wertvollste einzelne Messung die von `179afbf` an einem übersetzten git auf der Debian-VM. Und er
fragt, ob eine weitere Runde noch sinnvoll ist.

**Das dreiunddreißigste Review misst ab `review-2026-10-07`** und liest bis `review-2026-10-08`,
das auf dem Commit „Der Auftrag fuer das dreiunddreissigste Review“ sitzt; der Auftrag steht in
[`docs/REVIEW-2026-10-07-auftrag.md`](REVIEW-2026-10-07-auftrag.md). Zwei Schichten, und die
zweite ist **zum ersten Mal in dieser Serie kein Review-Fix**: die abgearbeitete zweiunddreißigste
Runde (ohne Review-Dokument 14 Dateien, +425/−143) und ein Funktionsdurchgang, den kein Review
angestoßen hat (47 Dateien, +3919/−1010, davon 1957 Zeilen erzeugte Namensliste) — die Schriften
der Stile-Seite von der Auswahl bis zu den Dateien im Projekt, der Rückbau des mitreisenden
Handbuchs und der Reiter „Website“ als fünf Karten. Als größtes Risiko nennt der Auftrag den Code,
der **aus dem Netz in das Projekt des Nutzers schreibt und dort löscht** — das gab es hier vorher
nicht, und ein Build hängt seitdem am Netz —, dazu die drei Stellen, die `custom.scss` ohne
Rückfrage anfassen. Geschrieben ist er von demselben Modell wie die gelesenen Commits (Claude
Opus 5), aber nicht aus deren Sitzung; das Review selbst liest wieder ein anderes Modell.

**Das neunundzwanzigste Review las alle drei Schichten** und fand **keinen Befund Hoch, keinen
Mittel, fünf Niedrig**, dazu fünf Punkte nebenbei — wieder von Claude Fable 5.1, die zweite Runde
in Folge ohne mittleren Befund. Die vier Entscheidungen ohne Vorschlag tragen alle, zwei besser als
beschrieben: Die Kollisionsrechnung war längst unter Scrollen gemessen und reparierte nebenbei fünf
von dreizehn Kästen, die bei Leertaste · Leertaste auf eine fremde Zelle zielten. Die Niedrigen:
Der Abbruch sagte von bis zu drei Sätzen nur den ersten, nach einem gescheiterten Pop also nicht
den, für den `success: false` steht; der Satz des Normalfalls nannte ein Paket in zwei Abschnitten
weiter doppelt; „eigener Platz“ war die linke obere Zelle, die Chip-Mitte aber lag bei schmaler
erster Spalte in einer anderen Zelle desselben Kastens; zwei Behauptungen des Auftrags stimmten
nicht, beide zugunsten des Codes; und — älter als der Diff — der erste Pfeil aus einem breiten
Kasten ging von dessen Mitte aus, „links“ wanderte nach rechts. Alle fünf sind abgearbeitet
(`fix/review-2026-10-03`, Typcheck, Build und Smoke je Code-Commit): Der Abbruch gibt seine Sätze
getrennt von gits Text zurück, nach Gewicht, und beide Seiten sagen alle (`6991fe6`, AB3 mit der
git-Attrappe des Reviews am Bündel und an beiden Seiten der gebauten App); die drei übrigen Sätze
gehen über `entryLabels` (`d9a9fa8`, nur per `node -e` geprüft, nicht mit npm gefahren); 3 und 5
haben eine Wurzel und einen Commit — ein platzierter Bereich steht beim Aufnehmen auf seiner
Startzelle, und die Pfeile des Frame-Builders gehen von der Zelle aus, die die Kollisionsrechnung
nennt (`fd23703`, alle Szenen des Reviews an der gebauten App, 33 von 33 Kästen bleiben, `page-body`
← → jetzt Spalte 3/5 statt 6/7); Befund 4 ist eine Korrektur in `layout-frames.md` (`0c7b077`).
Das Layout-Board behält seinen Getter unverändert. **Danach, auf Wunsch des Nutzers, auch die
vier Nebenbei-Punkte** (`fix/review-2026-10-03-rest`, je ein Commit mit Typcheck, Build und
Smoke): Das Band über einem veralteten Entwurf nennt den Schreiber statt „ein anderer Tab“
(`ffe925a`, gebaute App; Handbuch 4.5 in beiden Sprachen, Vault-Commit `370cfab`); eine Ablage am
Rand sagt, auf wie viel sie die Spanne gekürzt hat (`0939d27`, gebaute App); die flexiblen Spalten
der Ablagefläche sind mindestens 24 px breit, die Fläche rollt dafür bei 1470 px 112 px und bei
1280 px 302 px waagerecht (`d1125b0`, gebaute App, alle Drag-Szenen bei beiden Breiten); und der
Status zählt eine Zeile aus `putBack` nur, solange sie ganz fehlt (`a0233eb`, R2 mit echtem npm,
vier statt zwei Namen vorher). Derselbe R2-Lauf bestätigt Befund 2 nachträglich mit echtem npm.
**Diese Fixes hat kein Review gelesen.**

**Das dreißigste Review las beide Schichten** und fand **keinen Befund Hoch, keinen Mittel, fünf
Niedrig**, dazu sieben Punkte nebenbei — die dritte Runde in Folge von Claude Fable 5.1 ohne
mittleren Befund. Die Startzelle als Platz (`fd23703`) trägt in jeder Szene, die der Auftrag
ungemessen nannte, der Abbruch-Kanal (`6991fe6`) ebenso. Zwei der vier Nebenbei-Fixes haben etwas
mitgebracht, beide für Fixes ohne Richtung aus dem Review davor und beide an einem Geschirr
vorbei, das für den Fall davor gebaut war: Seit den 24-px-Spalten rollt der `KeyboardSensor` bei
jedem breiten Kasten auf Desktop, weich über rund 300 ms, und dazwischen sagte die Ansage „liegt
wieder auf seinem Ausgangsplatz“ (Befund 1 — senkrecht gab es das schon vorher); und der Status
ließ mit Bereichen, wie npm sie schreibt, ein Paket aus, weil `absentFromPackageJson` nur die
fehlende Hälfte der Liste bekam (Befund 2). Die übrigen: Der neue Roller schnitt den Auswahl-Ring
eines Frames ohne Innenabstand ab (3), der verweigerte Abbruch sagte „die unten genannte Datei“ in
einer Ansage, die gits Text nie sagt (4), und Behauptungen der Runde, die nicht trugen (5; darunter
`check:i18n`, das 1139 und nicht 1136 Schlüssel zählte). Alle fünf sind abgearbeitet
(`fix/review-2026-10-04`, je ein Commit mit Typcheck, Build und Smoke): `scrollBehavior: 'auto'` am
`KeyboardSensor` des Frame-Builders (`3d5f2b2`, gebaute App mit den Szenen des Reviews, 1280 und
1470 px, 40-ms-Pfeile und mehrzeilig — keine Zwischenansage, vier Pfeile landen auf Spalte 8; das
Layout-Board behält die Vorgabe und ist nicht gemessen); der Status fragt `absent` über die ganze
Liste (`3865910`, R2N mit echtem npm jetzt `is-odd, kind-of` wie der Satz des Laufs, R2
unverändert); `-m-1 p-1` am Roller (`171822d`, Bildausschnitt alt gegen neu); der Satz nennt den
Dateinamen aus `Entry '…' not uptodate` (`5acf57b`, am Bündel, nicht an der Seite); und die
Korrekturen in `layout-frames.md` (in `3d5f2b2` und `26edb1c`). **Danach, auf Wunsch des
Nutzers, die Nebenbei-Liste**, je ein Commit mit Typcheck, Build und Smoke: Einblenden prüft auf
Überschneidung (`5feb5f5`); ein Pfeil lässt den Chip auf seiner Querachse, und „noch nicht bewegt“
heißt seitdem „noch kein Pfeil hat einen Schritt ergeben“, weil ein erster Schritt ohne
Querkomponente, der nur rollt, sonst als Aufnahme galt — gefunden an der eigenen Gegenprobe, bevor
es committet war (`0920f95`); eine Kopfzeile in einer 57-px-Spalte bricht um und die Badge kürzt
(`45a4b1e`, neue Eigenschaft `truncate` an `Badge`); der Abbruch ordnet auch im geglückten Fall nach
Gewicht (`4e1e1ac`). Punkt 2 war mit Befund 1 erledigt, 6 und 7 bleiben ohne Code (begründet in
`layout-frames.md`), die zweite Hälfte von 3 — beim Aufnehmen eines hohen Kastens steht der Chip
über dem Fenster — ist nicht angefasst. Dazu drei Punkte, die beim Abarbeiten auffielen: Das
Layout-Board verlor bei gehaltener Taste Schritte und rollt jetzt ebenfalls ohne Gleiten
(`d9ace7d`), der Rückfallsatz des verweigerten Abbruchs verspricht keine Datei mehr (`7bb3f67`), und
`check:core-update` prüft die Statusliste, die dafür als reine Funktion in `shared/` steht
(`3afe5ae`; mit dem alten Argument meldet er R2N). **Diese Fixes hat kein Review gelesen.**

**Das einunddreißigste Review las beide Schichten** und fand **keinen Befund Hoch, keinen Mittel,
fünf Niedrig**, dazu fünf Punkte nebenbei — die vierte Runde in Folge von Claude Fable 5.1 ohne
mittleren Befund. `0920f95`, vor dem der Auftrag warnte, trägt in jeder Szene, die er ungemessen
nannte (Raster ↔ Ablage, Chip aus der Ablage, Pfeile über Kästen, hohe Zeile, breite Spalten eines
neuen Frames, 40 ms, Maus, Überschneidung in der Datei), und macht nebenbei aus der Ablage einen
Rundweg; die Statusrechnung in `shared/` antwortet für R4 wortgleich wie das Bündel davor, und die
Gegenprobe zu R2N stimmt. Was die Runde fand, lag daneben, und zweimal an der Messung vorbei statt
am Lesen: Das abgelehnte Einblenden (`5feb5f5`) schrieb seine Meldung 273 px über das Fenster und
in keine Live-Region, während im Testprojekt alle 15 ausgeblendeten Platzierungen abgelehnt werden
— die Szene dazu fragte, ob der Satz im Dokument steht, nicht ob im Fenster (Befund 1); der Satz,
den `4e1e1ac` nach vorn stellte, rät `git stash pop` für einen Eintrag, den git in genau diesem
Augenblick verweigert, weil beide Einträge der App `package.json` halten — der ältere Eintrag des
Geschirrs hielt `README.md` (2); git nennt bei einem verweigerten Abbruch je Runde *eine* Datei,
der Komma-Zweig aus `5acf57b` lief nie (3); am Layout-Board setzte → aus der Zone voller Breite den
Chip 685 px unter den Fensterrand, alt wie neu (4); und zwei Kommentare beschrieben den Rückfall
der Kollisionsrechnung noch als Aufnahme-Sonderregel, der seit `keepCrossAxis` jeder Schritt ist
(5). Alle fünf sind abgearbeitet (`fix/review-2026-10-05`, je ein Commit mit Typcheck, Build und
Smoke): Eine Ablehnung aus dem Bereichsformular ist ein eigener Zustand, steht als letzte Zeile im
Formular, wird in den Blick gerollt und über `announce()` gesagt, mit dem Weg, der geht — auch für
die Spannen-Felder (`22e55fb`, gebaute App vorher/nachher); der ältere Eintrag unter einem eben
eingetragenen bekommt `updateStashUnderRestored` statt des Pop-Rats (`f14b9a6`, Bündel mit einem
Eintrag, wie die App ihn schreibt, beide geratenen Befehle ausgeführt, an der Git-Sync-Seite
gegengelesen); der verweigerte Abbruch fragt die geänderten Dateien selbst, mit `-z`
(`bce9470`, vier Dateien in einem Satz statt vier Runden, danach ein Abbruch); in der zweiten
Runde des Pfeil-Getters ist ein Ziel, dessen Mitte auf der anderen Achse außerhalb des Fensters
liegt, kein Schritt (`bbc51c4`, Layout-Board und fünf Frame-Builder-Szenen an der gebauten App,
Regel in `conventions.md`); und die zwei Kommentare samt einem ungenutzten Import (`2204ff1`).
**Danach, auf Wunsch des Nutzers, die vier offenen Nebenbei-Punkte**
(`fix/review-2026-10-05-rest`, je Commit Typcheck, Build und Smoke): Die zwei git-Aufrufe, deren
*Text* `explainGitFailure` liest, bekommen `LC_MESSAGES=C` und ein leeres `LANGUAGE`, weil git drei
der vier Sätze übersetzt (`179afbf` — **gelesen an gits `de.po`, nicht gemessen**: auf diesem
Rechner gab es kein git mit Übersetzungen, die VM war aus; gemessen ist nur, dass die Variablen
ankommen, und was auf der VM nachzuholen ist, steht in `snapshots-and-updates.md`); die Griffe des
Layout-Boards tragen den Namen ihrer Komponente (`9f213f6`, 33 von 33 verschieden, nicht mit
VoiceOver gehört); und der Editor warnt vor zwei sichtbaren Bereichen auf einer Zelle und vor einem
Bereich über das Raster hinaus, der Schalter lehnt auch das Einblenden jenseits des verkleinerten
Rasters ab (`487d5e7`, ein Commit für Punkt 3 und 4 — eine Funktion, eine Messung). **Diese Fixes hat kein Review gelesen.**

**Das zweiunddreißigste Review las beide Schichten** und fand **keinen Befund Hoch, keinen Mittel,
sechs Niedrig**, dazu sechs Punkte nebenbei — geschrieben von Claude Fable 5.1, demselben Modell,
das die gelesenen Commits und den Auftrag geschrieben hatte (der Vorbehalt steht im Dokument).
Die zwei Eingriffe in geteilten Code (`bbc51c4`, `bce9470`) trugen in jeder gestellten Szene, und
`179afbf` ist jetzt gemessen, an einem git 2.53.0 mit Übersetzungen, im Scratchpad aus der Quelle
gebaut. Gefunden hat die Runde durch **Verstellen der Szenen**, nicht durch Lesen: Der Abbruch
verschwieg den vorgemerkten Stand jeder Datei, in der sich Projekt und Upstream unterscheiden, weil
`stagedOutsideMerge` die zwei Bäume verglich statt zu fragen, was Upstream geändert hat — acht
Runden lang gemessen mit einer *neu angelegten* Datei, die in keinem der beiden Bäume steht (1);
der verweigerte Abbruch nannte eigene vorgemerkte Dateien „aus dem Zusammenführen“ und riet dort
`git checkout --`, das beide Hälften der Arbeit kostet (2); Backspace im Spannen-Feld machte die
Spanne still zu 1, die nächste Ziffer eine abgelehnte 12 (3); ein Bereich ganz außerhalb des
Rasters bekommt auf der Seite eine eigene Spalte, statt keinen Platz zu haben (4); der neue
Stash-Satz riet vom Pop ab, wo die zwei Einträge verschiedene Dateien halten und der Pop durchgeht
(5); und drei Behauptungen um `gitTextEnv()` (6). Alle sechs sind abgearbeitet
(`fix/review-2026-10-06`, je ein Commit mit Typcheck, Build und Smoke, diesmal von Claude Opus 5):
drei Punkte statt zwei (`f3ab898`, Bündel mit echtem git, vorher eine von drei vorgemerkten Dateien
genannt, nachher alle drei); die Liste der Verweigerung geteilt, für eigene Dateien
`git reset --`, gelöschte nicht mehr genannt, zwei Sätze als zwei Einträge der Ansage (`01f19e8`,
Bündel, der neue Rat befolgt: beide Hälften bleiben); `NumberInput` in `ui.tsx` hält den Entwurf
und wendet nur ganze Zahlen an (`02d1404`, gebaute App mit echten Tastendrücken vorher/nachher);
der Satz sagt, wo der Bereich landet — gemessen auch für einen Bereich nur *unterhalb* des
Rasters, und das Ausblenden im CSS bewusst nicht genommen, weil es `page-body` von der Seite nähme
(`36efbb1`); der Stash-Satz fragt die Schnittmenge (`f00bbf2`, beide Szenen des Reviews); und
Kommentar und Nachtrag zu `gitTextEnv()` (`81f8005`, glibc bleibt ungemessen).
**Danach, auf Wunsch des Nutzers, die vier eigenen Nebenbei-Punkte und die ganze Nebenbei-Liste
des Reviews** (gleicher Branch, je Commit Typcheck, Build und Smoke): Die Notiz vor einem Abbruch
fragt gits Regel statt der Zwei-Punkt-Form, und ein Eintrag, dessen Pop an einer geänderten Datei
scheitern wird, bekommt einen eigenen Satz statt „ein Stand, den es nicht mehr gibt … `git stash
drop`“ (`e727c0d`, Bündel mit einem neuen Upstream-Stand `L`); die Konfliktliste liest mit `-z`
(`93facf8`); Zeilen- und Spaltenfeld nehmen `NumberInput` (`c0dcdda`, gebaute App); eine eigene
Zeile *auf* einer vom Merge vorgemerkten Datei wird über `git merge-tree --write-tree` erkannt, und
eine von Hand gelöste, vorgemerkte Konfliktdatei damit auch (`fe30ca4`, git ≥ 2.38, ein älteres
nicht gemessen). Aus der Liste des Reviews: ein Wort „Merge“ statt „Zusammenführen“, und der
Blockiert-Satz verweist auf den Knopf statt einen Rat zu geben, der seit Befund 2 nicht mehr für
jede Datei stimmt (`f208f94`, Punkt 4); der Rat für ein volles Raster, ohne „inzwischen“
(`ae59787`, Punkt 5 und die Anmerkung zu `showRefused`, an der gebauten App befolgt); „this cancel“
(`9812a84`); ein eigener Satz mit `git add --` für eine aus dem Index genommene Datei (`e2e75b1`,
Punkt 6); die Drag-Ansagen des Layout-Boards nummerieren Instanzen wie die Griffe (`1b491b6`,
Punkt 3, nicht mit VoiceOver gehört); und das Layout-Board geht keinen schrägen Pfeilschritt mehr,
womit Rollstand und Fensterbreite die Antwort nicht mehr ändern und ← + Leertaste kein Löschweg
mehr ist (`96ab045`, Punkt 1 und 2, elf Szenen bei 1280 und 1470 px wortgleich, Regel in
`conventions.md`). Die zwei Punkte, die dabei neu auffielen, sind ebenfalls erledigt: Die Vorschau
eines Branch-Ziels liest mit `-z` und `--no-renames` — vorher `"\303\244.html"` und eine
verschobene Seite als ein Pfad mit Tab darin, „geändert“ (`8923e78`, Adapter als Bündel mit
lokalem Remote); und `NumberInput` kappt getippte Werte auf `max`, „18“ ergibt 12 Spalten statt 18
(`96d3fa7`, gebaute App). **Diese Fixes hat kein Review gelesen.**

**Das siebenundzwanzigste Review las beide Schichten** und fand **keinen Befund Hoch, einen
Mittel, fünf Niedrig**, dazu drei Punkte nebenbei — und der mittlere ist ein Fehler im eigenen
Vorschlag der Vorrunde: `putBack` markierte unter echtem npm nichts, weil npm den Bereich schreibt,
den es auflöst (`^3.0.1` für `is-odd@^3.0.0`), und `stillMissing` die frisch geschriebene Zeile
deshalb weiter für fehlend hielt. Gesehen hat das fünf Runden lang niemand, weil die npm-Attrappe
des Messgeschirrs Bereiche wörtlich schrieb; das Review stellte zum ersten Mal echtes npm daneben.
Die Niedrigen: die Links in den Content-Ordner landeten per Sticky-State auf „Übersetzungen“, der
Marker kostet jenseits der Versionsgrenze mehr als beschrieben (beta.2 liest nichts, ein Klick
bricht Sass) und „gilt der neue“ widersprach der Kaskade, die Ansage nach einem gescheiterten
Stash-Pop las zwölf Zeilen git vor, der zweite Handbuch-Verweis fehlte als Ausnahme in der Regel,
und drei Sätze nannten den alten Reiter. Alle sechs sind abgearbeitet (`fix/review-2026-10-01`, je
ein Commit mit Typcheck, Build und Smoke): `putBack` vergleicht die Zeilen vor und nach den
npm-Aufrufen (gemessen mit beiden Attrappen-Arten und mit echtem npm 11.17.0), beide Kopien eines
Blocks werden gelesen und ein Schreiben benennt alle um (gemessen am `styleService` von beta.2 als
Bündel), die übrigen an der gebauten App. **Danach, auf Wunsch des Nutzers, auch der Rest**, je
ein Commit: Der baseUrl-Hinweis der Übersicht verlinkte ebenfalls `config` ohne Reiter
(`c9e968c`); ein Chip im Frame-Builder, auf seiner eigenen Ablage losgelassen, bleibt, wie er war
(`dcb221b` — das Review hatte die Ablage für wirkungslos gehalten, sein Chip war aber ein
ausgeblendeter, und der verlor dabei still seine Platzierung); „`stillMissing` räumt ohnehin weg“
sagt jetzt, dass das nur für denselben Bereich gilt, und die zwei Byte-Zahlen zu H3 haben ihren
Satz (`585a0d7`, nachgemessen: 41 Bytes, wenn ein Commit den Paketnamen trägt, sonst 0);
`stripManagedBlock` zieht Leerzeilen nur noch an der Schnittstelle zusammen (`ca5780b`, vorher
gegen alle zehn echten `custom.scss` verglichen, Vorlagen-Export byte-gleich); Handbuch 3.4 sagt
„Gruppe“ statt „Karte“ (Vault-Commit `391f77a`). Der dritte Nebenbei-Punkt des Reviews — die
npm-Attrappe schreibt Bereiche wie npm — betrifft das Messgeschirr außerhalb des Repos. **Diese
Fixes hat kein Review gelesen.**

**Das achtundzwanzigste Review las beide Schichten** und fand **keinen Befund Hoch, keinen
Mittel, fünf Niedrig**, dazu sechs Punkte nebenbei — die erste Runde der Serie ohne mittleren
Befund, wieder von Claude Fable 5.1 und damit vom selben Modell wie die Richtungen, die sie prüfte;
das Dokument sagt das. Beide Richtungen tragen: `putBack` unter echtem npm mit eigenen Paketen in
allen vier Abschnitten, die Marker-Vereinigung an der gebauten App. Die Niedrigen: Die Ansage nach
einem Abbruch war „On branch v5“, sobald ein Stash zurückkam, weil zwei der fünf Sätze hinter gits
Ausgabe standen; „ein Schreiben benennt alle um“ macht beta.2 schon nach einer eingeführten Schrift
für alle drei Abschnitte blind, und das stand nirgends als Abwägung; zwei Sätze über `putBack`
beschrieben einen Weg, den der Lauf im Normalfall nicht geht; ein Paket in zwei Abschnitten stand
doppelt in Liste und Notiz, und der Satz verschwieg seinen fehlenden Eintrag; und die Kachel „Die
Seite“ verlinkte `config` ohne Reiter. Alle fünf sind abgearbeitet (`fix/review-2026-10-02`, je
ein Commit mit Typcheck, Build und Smoke): der Abbruch stellt seine Sätze vor gits Text und hat für
einen geglückten Pop einen eigenen (`b415b86`, Szenen AB1/AB2 am Bündel mit echtem npm), der Preis
der Umbenennung steht in Kommentar, Regel und als Punkt der Release-Notizen in `docs/release.md`
(`1aea7fa`, kein Code), die zwei Sätze nennen den Weg, den sie meinen (`b310bc9`, kein
Verhalten), Namen werden dedupliziert und ein Abschnitt springt nur für einen ein, den die Liste
nicht beansprucht (`1bd5c1e`, Szene R2 mit echtem npm), und die Kachel nennt „Website“
(`97787cc`, gebaute App). **Danach, auf Wunsch des Nutzers, die Nebenbei-Liste**, je ein Commit:
Handbuch 2.2 nennt „Konfiguration → Website“ (Vault-Commit `084f425`); der Schriftblock nimmt jede
`@font-face`-Regel einmal, beim Vorlagen-Import unter `projectWins` wie beim Schrift-Import
(`f68866d`, Bündel: zweimal importiert vorher 5 → 9 → 13, jetzt 5 → 4 → 4); ein Tastatur-Drag
steht beim Aufnehmen auf seinem eigenen Feld, ein Chip also auf der Ablage statt auf Zeile 1,
Spalte 1 (`7466ab5`, gebaute App); und der Sass-Fehler des geschachtelten Import-Blocks sagt einen
Satz und bietet „Ladereihenfolge neu schreiben“ an (`6ce4c82`, gebaute App: danach ein Block,
30 von 30 in derselben Reihenfolge, Check grün). Die übrigen zwei (ein Satz in `conventions.md`,
der seit dieser Runde stimmt, und eine erklärte Zeilenzahl) brauchen nichts. **Dabei aufgefallen
und danach, wieder auf Wunsch des Nutzers, auch erledigt:** Der SCSS-Fehler auf der Übersicht
verlinkte `styles?tab=css`, einen Reiter, den es nicht gibt (er heißt `customCss`), und landete
damit auf dem zuletzt offenen (`70cde5d`, gebaute App; alle anderen `?tab=` in `src/` und
`scripts/` nennen echte Reiter); und Leertaste · Leertaste auf einem *platzierten* Frame-Bereich
sagte „bei Zelle … abgelegt“ und wählte ihn aus, obwohl nichts wanderte — die linke obere Zelle
der eigenen Platzierung zählt jetzt als eigener Platz (`isOwnPlace`, `08d3f15`, gebaute App). **Beim Abarbeiten gelesen, nicht gemessen:** die verschobene Zeile in
`absentFromPackageJson` (ein Eintrag, Name nur in einem anderen Abschnitt) und der Weg ohne Plan
in den zwei `putBack`-Sätzen. Die Frage des Reviews nach einem Release Candidate ist keine Frage an
den Code; was es dafür vor den Bau stellt — gepackte App je Plattform, neu gebautes Handbuch und
PDF, der Satz zum Marker in den Notizen, und die offene Liste (Push, ERESOLVE, VoiceOver, VMs) —,
steht im Dokument. **Diese Fixes hat kein Review gelesen.**

**Das sechsundzwanzigste Review las die vierzehn Commits und den Button** und fand **keinen
Befund Hoch, einen Mittel, acht Niedrig**, dazu zwei Punkte nebenbei — wieder von Claude Fable 5.1,
also vom selben Modell wie das Review, dessen Behauptungen die gelesenen Commits übernommen hatten;
das Dokument sagt das selbst. Der mittlere Befund beantwortet die Frage, die der Auftrag gestellt
hatte: Die gekürzte Notiz des fünfundzwanzigsten Reviews (2a) *konnte* etwas verlieren — die Themes
des ersten npm-Aufrufs standen danach nur uncommittet da, und ein `git checkout` nach dem
gescheiterten Update nahm sie für immer mit, unter grünem Badge. Die Notiz behält jetzt die ganze
Liste und markiert die eigene Hand (`putBack`). Die Niedrigen saßen fast alle an den Rändern von
`installFailed` (Übersicht mit leerer Paketliste, der Snapshot-Ausweg ohne seinen Schalter, ein
Duplikat, das den Zustand erbt), dazu eine SHA aus der Notiz, die ungeprüft als git-Argument ging,
ein Abbruch-Satz, der auf Git-Sync „unter Git-Sync verwerfen“ riet, eine abgelehnte Ablage im
Frame-Builder, die „abgelegt“ hieß, und `shootProject`, das nur ohne `--demo` entschied. Und der
Fall, nach dem der Auftrag zuerst fragte — ein Fix trägt eine Behauptung des Reviews ungemessen —,
existierte: **14 Icon-Knöpfe und 10 `<span>`, nicht 13 und 9.** Alle neun sind abgearbeitet
(`fix/review-2026-09-30`, je ein Commit mit Typcheck, Build und Smoke), dazu der zweite
Nebenbei-Punkt (der Satz nach einem gescheiterten Stash-Pop nennt seinen Eintrag); der erste — die
Nummerierung im Auftrag — bleibt, weil Review-Dokumente bleiben, wie sie sind. Das Handbuch 7.3
kennt den Schalter jetzt auch (Vault-Commit `f0fa3a3`). Per Fast-Forward auf `main` und gepusht.

**Das fünfundzwanzigste Review las die drei Schichten oben** und fand **keinen Befund Hoch, zwei
Mittel, sieben Niedrig**, dazu vier Punkte nebenbei — von Claude Fable 5.1, also von einem anderen
Modell als dem, das die gelesenen Commits geschrieben hat. Die zwei Mittleren sitzen beide in dem,
was die Vorrunde gebaut hatte: der Satz des Abbruchs stand auf Git-Sync in dem Band, das ein
geglückter Abbruch abräumt (die verworfene vorgemerkte Datei ging damit ohne ein Wort), und die
fünfte Bindung der Paketliste hatte drei Türen offen — die „andere Hand“ konnte die App selbst
sein, die Nadel traf Teilnamen, und eine Antwort in einem Merge-Commit sieht `-G` nicht. Alle neun
sind abgearbeitet (`fix/review-2026-09-29`, je ein Commit mit Typcheck, Build und Smoke), dazu drei
der vier Nebenbei-Punkte; **offen bleibt einer**: Die zwei Formen des Icon-Knopfs sind verschieden
hoch (an der gebauten App gemessen 32,8–33,3 px mit `<span>` auf der Übersicht gegen 31,5 px mit
`inline-flex` am Knopf auf Updates). Er fällt weg, wenn `inline-flex` ins `Button`-Primitive zieht,
und das kostet nach der Messung des Reviews 66 Knöpfe ihre Textzentrierung — `justify-center` dazu,
und eine eigene Runde. **Nachgetragen am 2026-09-18** (`fix/button-inline-flex`): Das Primitive
trägt jetzt `inline-flex items-center justify-center gap-1.5`, die zehn `<span>` und die vier
Klassenfolgen an den Aufrufstellen sind weg (hier stand „neun“, die Zahl des fünfundzwanzigsten
Reviews; der Diff desselben Commits entfernt zehn — sechsundzwanzigstes Review, Befund 8). Gemessen an der gebauten App, alle 806 Knöpfe auf 21
Bildschirmen vorher und nachher: sechs Kästen ändern ihre Höhe (32,8–33,3 → 31,5 px, die mit
`<span>` auf Übersicht und „Neue Datei“), der Inhalt keines einzigen Knopfs verschiebt sich —
auch nicht in den 66 mit fester Breite —, und unter „Neue Datei“ rückt der Rest der Spalte um
1,8 px nach. Die zwei Knöpfe der Startseite hatten schon vorher 31,5 px (ein `flex`-`<span>`, kein
`inline-flex`). Zwei Befunde waren reine Beschreibungsfehler: Das Schloss deckt die
Großschreibung längst (gemessen war an `fs.realpathSync` statt an dem `fs.promises.realpath`, das
im Code steht), und die Zahlen um die Naht der geteilten `CLAUDE.md` mischten Bytes mit Zeichen und
Schichtdiffs mit Gesamtdiff. Was `@docs/conventions.md` angeht, ist die offene Frage der Vorrunde
beantwortet: **die Einbindung greift** — in der Sitzung des Reviews lag der volle Text vor dem
ersten Werkzeugaufruf im Kontext, als eigener Block hinter `CLAUDE.md`. Geladen werden damit
25 + 68 = 93 KB statt 192; der Rückfallsatz bleibt für Fassungen, die es nicht können.

**Das vierundzwanzigste Review misst ab `review-2026-09-28`** und liest bis `review-2026-09-29`,
das auf dem Commit „Der Auftrag fuer das vierundzwanzigste Review“ (`fix/review-2026-09-27`) sitzt;
der Auftrag steht in [`docs/REVIEW-2026-09-28-auftrag.md`](REVIEW-2026-09-28-auftrag.md). Sein
Diff sind die sechs Fixes des dreiundzwanzigsten Reviews und fünf Punkte seiner Nebenbei-Liste:
ohne Review-Dokument und Auftragsdatei 20 Dateien, +528/−123, im App-Code 15 Dateien, +344/−99. Als
größtes Risiko nennt er den vierten Zustand `'pending'`, der gegen alle drei anderen Antworten
gewinnt und bei jedem Mount der Übersicht gelesen wird — und die Paketliste, die damit in vier
aufeinander folgenden Runden viermal anders gebunden ist; er bittet um die Lage, die keine der vier
Bindungen trifft. Der Branch ist nicht gepusht.

**Das vierundzwanzigste Review las die sechs Fixes des dreiundzwanzigsten und fünf Punkte seiner
Nebenbei-Liste** (`review-2026-09-28..review-2026-09-29`, ohne Review-Dokument und Auftragsdatei
20 Dateien, +528/−123, im App-Code 15 Dateien, +344/−99) und fand **zwei Befunde Mittel, fünf
Niedrig**, alle sieben abgearbeitet, dazu die vier Punkte seiner Nebenbei-Liste und das
Handbuch-Kapitel, das es daneben als niedrigen Befund führt. Es stammt vom selben Modell wie die
Commits, aber aus einer anderen Sitzung; es hat die Kette „npm scheitert, Nutzer behebt es, klickt
erneut, Lauf kommt durch“ zum ersten Mal am echten Knopf und am Stück gemessen, und sie trägt.
Beide mittleren sitzen dort, wo der Auftrag sie vermutet hat — an der Oberfläche über einem Kanal,
der stimmt, und an der Paketliste, die in fünf Runden fünfmal anders gebunden ist. Was daraus als
Regel bleibt, steht oben in den passenden Abschnitten:

- **Ein Kanal, der einen Satz antwortet statt zu werfen, braucht einen Aufrufer, der ihn liest.**
  `abortCoreMerge` hat zwei, und beide behandelten ihn als „läuft durch oder wirft“; die
  Updates-Seite setzte danach sogar das Feld auf `null`, in dem der Satz hätte stehen können. Fünf
  Runden haben Sätze für genau die Lagen geschrieben, in denen der Knopf allein nicht reicht — ein
  verweigerter Abbruch war trotzdem ein Knopf, der nichts tut, und die vorgemerkte Datei, die er
  wegwirft, ging ohne ein Wort. Dieselbe Lücke wie beim Knopf der Vorrunde, eine Tür weiter: an
  Bündeln gemessen, und ein Bündel hat keine Seite.
- **Eine Frage an die Geschichte wird an dem gestellt, worum es geht.** „Wurde `package.json` seit
  der Notiz committet“ sollte heißen „hat der Nutzer die Paketfrage selbst beantwortet“ — es feuert
  aber auch für einen eigenen Commit aus anderem Grund, für upstreams Commits, sobald ein
  handaufgelöster Merge sie nach HEAD bringt, und für den Amend der App. `git log -G<name>` fragt
  die Zeilen der Liste, und ein Merge-Commit zeigt ohne `--diff-merges` gar keinen Diff — die
  beiden letzten sind damit von selbst draußen. **Und wenn ein Lauf eine Liste fallen lässt, sagt
  er es.**
- **Ein Prädikat, das für einen Lauf geschrieben ist, wird als Aussagesatz nicht wahr.**
  `stillMissing` fragt „fehlt, oder steht mit einem anderen Bereich da, oder ist nicht lesbar“, und
  für den Lauf ist jede dieser Antworten richtig herum. Der Status machte daraus „stehen nicht mehr
  in package.json“, mit Namen, Badge und Zähler — für Zeilen, die dastehen.
- **Eine Bedingung fragt das, was sie anzeigt.** Die Zeile „n Commits fehlen“ hing am Zustand
  `behind`, und seit `pending` gegen alle drei anderen gewinnt, verschwand die Zahl genau dann,
  wenn sie zu zwei Hashes nebeneinander gehört hätte.
- **Ein Schlüssel, der ein Pfad ist, meint erst nach `realpath` einen Ordner.** Das Lauf-Schloss
  hielt `p` und `p + '/'` auseinander — und genau diese Lage führte sein Kommentar als gedeckt.
  Zwei weitere Sätze daneben trugen nicht: „sein Ergebnis steht danach auf der Updates-Seite“ (das
  hält `useState` nicht) und „Two windows“ (die App hat eines).
- **Eine Vorgabe, die „an drei von vier Stellen“ trägt, ist eine Vorgabe mit einer Ausnahme.** Der
  eigene Platz eines Paletten-Chips ist nicht seine Id, sondern der Vorrat; jeder Satz darüber las
  sich als Bewegung, und ein Ablegen, bei dem nichts passiert, hieß „abgelegt“.
- **Was ein Prüfskript nicht sehen kann, gehört in die Liste vor dem Release.** `check:handbook`
  prüft Blockzitate; eine Aufzählung daneben, die behauptet vollständig zu sein, sieht es nicht —
  das Handbuch nannte drei Prüfzustände, während die Updates-Seite vier zeigt und genau dieses
  Kapitel im Kopf verlinkt.

**Das dreiundzwanzigste Review ging an ein anderes Modell** — das war die Begründung seines
Auftrags: Die Runde davor hatte sich selbst gelesen, und der Auftrag machte deshalb
`docs/REVIEW-2026-09-26.md` zum **Prüfgegenstand** statt es auszunehmen, wie es sonst die Regel
ist. Es las `review-2026-09-27..review-2026-09-28` (ohne Auftragsdatei 12 Dateien, +353/−13, im
App-Code 6 Dateien, +87/−8) und fand **zwei Befunde Mittel, vier Niedrig**, alle sechs abgearbeitet,
dazu fünf der sechs Punkte seiner Nebenbei-Liste (der übrige, Nebenbei 1, war Teil von Befund 1). Beide
mittleren hängen zusammen und beide bestätigen den Verdacht des Auftrags, nur an einer Kante, die
er nicht genannt hatte: **Die vier Runden Arbeit an der Notiz beschreiben einen zweiten Klick, den
die Oberfläche nicht anbietet.** Alle echten Läufe dieser Runden riefen den IPC-Kanal direkt; den
Knopf hatte niemand angesehen, und er ist nach einem gescheiterten `npm install` deaktiviert, weil
HEAD den Merge schon enthält. Der vierte Fall, um den der Auftrag bat, folgt daraus: Wer nicht
erneut klicken kann, trägt seine Pakete von Hand ein — und die Liste räumte nur ein Lauf, in dem
npm durchkommt. Was daraus als Regel bleibt, steht oben in den passenden Abschnitten:

- **Ein Ausweg, den eine Meldung nennt, wird an der Oberfläche gemessen, nicht am Kanal darunter.**
  „Behebe den Fehler oben und starte das Update erneut“ stand vier Runden lang über einem
  deaktivierten Knopf; die Attrappen kennen keine Seite, und der `evalfile`-Weg, den die Aufträge
  empfehlen, geht an genau dieser Stelle vorbei. Zugleich: Ein Zustand, den die App selbst notiert,
  gehört dorthin, wo der Nutzer nachsieht — die Paketnamen standen an genau einer Stelle, bis zum
  ersten Routenwechsel.
- **Eine Frage, die ein gespeicherter Wert offen hält, kann auch jemand anders beantworten als die
  App.** Der Fix der Vorrunde beendete die Liste, „sobald npm sie eingetragen hat“ — gemeint war:
  sobald *dieser Dienst* npm erfolgreich gerufen hat. Gefragt wird deshalb, ob `package.json` seit
  der Notiz committet wurde, nicht ob sie noch so aussieht: Die Datei kommt byte-gleich zurück, wenn
  jemand eine Zeile einträgt und später wieder herausnimmt.
- **„Dasselbe Ding“ wird an der Identität gefragt, nicht am Namen.** Der Name ist das, was
  vorgelesen wird; identisch macht er nichts. Am Layout-Board tragen ein Paletten-Chip und die
  Zeile, die er dupliziert, denselben — und jede Ablage auf dem Namensvetter galt als „nichts
  bewegt“.
- **Ein Wächter misst, was sein Kommentar behauptet.** `git diff HEAD` vergleicht den
  Arbeitsbereich; „index and working tree alike“ stand daneben, und die eine Lage dazwischen ließ
  den Amend eine vorgemerkte Zeile schlucken.
- **Ein Schutz im Renderer schützt ein Fenster, keinen Vorgang.** `coreBusy` ist ein `useState` und
  stirbt mit der Route; das Schloss gegen zwei gleichzeitige Core-Updates gehört in den
  Hauptprozess, zusammen mit dem Abbruch, der dasselbe Repository schreibt.
- **Was eine Liste anbietet, muss die Tür dahinter annehmen.** `listLocales` führte jede `*.ts`, der
  Kanal wies alles ab, was kein Locale-Code ist — eine fremde Datei im Ordner wurde damit zu einem
  Eintrag, der nur scheitern kann, unter einem Satz, der den Fehlschlag der App zuschrieb.

**Das zweiundzwanzigste Review ist das erste dieser Serie, das vom selben Modell und aus derselben
Sitzung stammt wie die Commits, die es liest** — der Vorbehalt steht oben in seinem Dokument, und
er ist der Grund, warum darin fast alles gemessen und fast nichts gelesen ist. Es las
`review-2026-09-26..review-2026-09-27` (27 Commits, ohne Review-Dokument und Auftrag 19 Dateien,
+795/−111) und fand **einen Befund Mittel, drei Niedrig**, alle vier abgearbeitet. Zwei Prüfungen
haben dabei die Erwartung des Reviews widerlegt und stehen als „kein Befund“ da: Der schmale
Drag-Chip bricht den Maus-Drag nicht (`pointerWithin` entscheidet, solange der Zeiger über einem
Ziel steht), und ein Build mit kaputter `quartz.config.yaml` sagt in der Konsole zweimal, was los
ist — Quartz scheitert an dieser Datei ohnehin. Was daraus als Regel bleibt:

- **Ein gespeicherter Wert endet, wenn die Frage beantwortet ist, die er offen hält.** Die
  Paketliste beschreibt das Fenster zwischen „`package.json` ist upstreams“ und „npm hat die
  eigenen Pakete zurück“; geräumt wurde sie aber nur von einem Lauf, der bis zum Ende kommt. Eine
  Notiz, die einen Absturz überlebt hat, trug damit ein Paket wieder ein, das der Nutzer entfernt
  *und committet* hatte — unter „erfolgreich“, in einem Lauf ohne etwas zu holen. Das ist die
  Kehrseite der Bindung, die eine Runde vorher gefallen war.
- **Eine Seite, die auf einen Lesevorgang angewiesen ist, sagt selbst, wenn er scheitert** — und
  „die Seite ist darauf angewiesen“ ist eine Frage je Lesevorgang, nicht je Seite. Der Reiter
  *Übersetzungen* hielt an einem Aufruf an, der nur die Vorauswahl bestimmt; `ProjectLayout` hielt
  an einem `null` an, das gar kein Fehler ist, sondern ein entferntes Projekt — auf dem einen
  Bildschirm ohne Seitenleiste und damit ohne Ausgang.
- **Schweigen ist keine Antwort, wenn es die einzige bleibt.** Der Guard, der die erste
  Zielmeldung schluckt, war richtig gegen das Übertönen und falsch dort, wo der erste Pfeildruck
  das Ziel nicht wechselt und deshalb gar kein Ereignis auslöst. Ein Satz trägt jetzt beide
  Hälften.

**Das einundzwanzigste Review las die fünf Fixes des zwanzigsten, die vier aus seiner
Nebenbei-Liste und den Befund aus dem ersten echten Core-Update** —
`review-2026-09-25..review-2026-09-26` ohne Review-Dokument und Auftrag, 9 Dateien, +575/−76,
davon im App-Code 4 Dateien, +250/−62 — und maß an vier Wegen: `runCoreUpdate`, `abortCoreMerge`,
`readConfig`/`writeConfig` und `duplicateProject` als esbuild-Bündel in zwei Fassungen gegen ein
lokales Upstream-Repo, **drei echte Läufe** gegen `github.com/jackyzha0/quartz` durch die gebaute
App, die gebaute App mit echten Tastendrücken im Frame-Builder und am Layout-Board, und die
Prüfskripte. Kein Befund der Stufe Hoch, **zwei Mittel, fünf Niedrig**, alle sieben abgearbeitet.
Beide mittleren saßen dort, wo der Auftrag sie vermutet hat, und beide waren Türen, die ein Fix
erst geöffnet hatte. Was daraus als Regel bleibt, steht oben in den passenden Abschnitten:

- **Ein gespeicherter Wert wird geschrieben, bevor er gelesen wird — also mit dem, was der
  *nächste* Lauf braucht, nicht mit dem, was dieser weiß.** Die Notiz trug `takenOut`, den Plan
  dieses Laufs, und der ist im fortsetzenden Lauf leer: Sie überschrieb sich selbst mit `[]`,
  eine Zeile bevor sie benutzt wurde, und überlebte damit genau einen Fehlschlag. Dass ein Fehler
  beim zweiten Versuch noch da ist, ist bei EACCES, einem Proxy oder einem abgelaufenen Token der
  Normalfall.
- **Eine Bindung an einen SHA gehört an das, was einen Commit beschreibt.** Der Amend braucht
  ihn, die Paketliste nicht: Sie beantwortet „was hat ein Update aus `package.json` genommen“, und
  ein einziger Commit zwischen zwei Läufen — ein Git-Sync, eine Notiz im README — ließ sie
  verfallen.
- **„Weicht von HEAD ab“ ist nicht „npm hat es geschrieben“.** `--only` nimmt die Pfade aus dem
  Arbeitsbereich, und seit der Amend auch nach einem sauberen Merge läuft, committet er, was der
  Nutzer uncommittet gehalten hat — auch einen Eintrag, für den der Plan ausdrücklich „Finger
  weg“ gesagt hat. Die Auskunft, die trägt, wird vor dem Merge genommen und für den fortsetzenden
  Lauf in der Notiz weitergereicht; eine Notiz, die sie nicht kennt, erlaubt nichts.
- **Ein Rat, der einen Befehl nennt, nennt auch sein Argument.** „`git stash drop` verwirft ihn“
  traf den Eintrag des Nutzers, sobald der obenauf lag — gemessen: der Rat löschte wörtlich
  befolgt dessen Arbeit und ließ unseren liegen.
- **Zwei Arten, unlesbar zu sein, waren drei** (vier mit `plugins:`, das keine Liste ist), und die
  häufigste — der Syntaxfehler — kam durch beide Wächter, weil `parseDocument()` dabei nicht
  wirft, sondern `doc.errors` sammelt. **Und die Begründung daneben war eine Vorhersage, keine
  Messung**: „das nächste Speichern schreibt darüber“ — `writeConfig` schreibt nicht darüber, es
  wirft, und die Datei bleibt byte-gleich.
- **Ein Wächter gehört vor den Schritt, den er verhindern soll.** Das Duplizieren las die
  Konfiguration erst nach dem Kopieren und vor `git remote remove origin`, also blieb bei einem
  Wurf eine halbe Kopie mit dem Remote des Originals zurück — das eine, was der Kommentar am Kopf
  der Datei ausschließt.
- **Eine Zahl gehört zu dem, woran sie gemessen wurde** — viermal, darunter ein Kommentar, der
  die E404-Szene beschrieb, während drei andere Stellen denselben Befund mit EACCES und „removed
  52 packages“ belegen, und keine die andere nannte.

**Das zwanzigste Review las die sieben Fixes des neunzehnten** —
`review-2026-09-24..review-2026-09-25` ohne Review-Dokument und Auftrag, 9 Dateien, +353/−41,
davon im App-Code 6 Dateien, +169/−27 — und maß an fünf Wegen, darunter `runCoreUpdate`,
`abortCoreMerge` und `duplicateProject` als esbuild-Bündel in zwei Fassungen gegen ein lokales
Upstream-Repo mit den Ständen A/B/D/E (sechzehn Szenen), git allein in Wegwerf-Repos, die gebaute
App mit echten Tastendrücken am Layout-Board und im Frame-Builder, `git log` und `git cherry`
gegen alle Zahlen und Branch-Sätze der Runde, und die Prüfskripte. Kein Befund der Stufe Hoch,
**einer Mittel, vier Niedrig**, alle fünf abgearbeitet. Die sieben Fixes des Vorgängers tun, was
sie sollen; der mittlere Befund sitzt dort, wo der Auftrag sein größtes Risiko vermutet hat, aber
an einer anderen Kante — nicht der Wächter vor dem Amend ist das Problem, sondern was der Amend
*mitnimmt*. Was daraus als Regel bleibt, steht oben in den passenden Abschnitten:

- **Ein Befehl, der einen Zustand committet, nimmt so viel mit, wie man ihm lässt.**
  `git commit --amend --no-edit` committet den ganzen Index. Im Konfliktzweig kann dort nichts
  Fremdes liegen, weil git einen Merge über einer gestageten Änderung gar nicht erst beginnt — und
  genau diese Zusicherung fehlt dem erneuten Lauf, der keinen Merge mehr vor sich hat. Gemessen
  landete eine gestagete Zeile des Nutzers in einem Commit mit fremdem Betreff und fremdem Datum,
  unter der Ausgabe „Already up to date.“
- **Eine Bedingung, die zwei Stellen dieselbe Frage stellen, beschreibt an beiden dieselbe
  Menge** — oder eine von beiden nennt die Ausnahme. `ourMergeCommit` hieß „ein Merge-Commit, den
  dieser Zweig nach einem Konflikt gemacht hat“, `resuming` „ein Merge-Commit dieser App“, und der
  Kommentar nannte beides denselben Commit eine Runde später.
- **Wer fremdes Verhalten vorhersagt, nimmt dessen eigene Regel, nicht eine Vereinfachung
  davon.** Die vierte Frage am Stash-Satz las `git diff HEAD` (Index *und* Arbeitsbereich),
  `reset --merge` entscheidet aber an „different between the index and working tree“ — und wirft
  eine gestagete Änderung weg. Das ist derselbe Fehler, den die Runde davor dem `apply --check`
  nachgewiesen hat, in der eigenen Fassung.
- **Ein Wächter heißt nach dem, was er misst.** `git branch -r --contains HEAD` findet ein
  Remote-Tracking-Ref und hieß „has left this machine“; ein Push per URL schreibt keines und
  hinterlässt ohne Netz überhaupt keine lokale Spur.
- **Eine Zahl gehört zu dem, woran sie gemessen wurde** — zweimal, beide Male vor dem Commit
  gezählt, der die Datei trägt: +341 statt +353 in einer Commit-Nachricht und „22 Commits vor
  `origin/main`“ statt 23 im Auftrag.

**Danach ist das Core-Update zum ersten Mal in dieser Serie gegen echte Gegenseiten gelaufen** —
eine `cp -Rc`-Kopie von `navigations-testprojekt`, sieben Commits hinter `jackyzha0/quartz`,
echtes `git fetch`, echtes npm, durch die gebaute App. Drei der Fixes dieser Runde sind damit an
echten Daten bestätigt, darunter einer von der Seite, die die Attrappe verdeckt hatte (echtes npm
lässt das Lockfile in Ruhe, also gab es nichts zu amenden). Ein neuer Befund kam dabei heraus, den
keine Attrappe zeigen konnte: **Der Lauf, der die Arbeit eines an `npm install` gescheiterten
früheren beendet, trug dessen eigene Pakete nicht wieder ein** — er meldete „Already up to date“
und Erfolg, während npm sie aus `node_modules` entfernte. Behoben, Messungen im Nachtrag in
[`snapshots-and-updates.md`](decisions/snapshots-and-updates.md).

Vier Punkte seiner Nebenbei-Liste sind mit abgearbeitet, und einer davon war größer als sein
Platz: **Im Frame-Builder bewegte kein Pfeildruck einen Bereich.** Die Ursache — ein Ablageziel,
das den Ausgangspunkt schon enthält, gewinnt jeden Vergleich — traf auch das Layout-Board, wo sie
den ersten Druck verpuffen ließ und bis dahin dnd-kits `scrollTo` zugeschrieben war; die Messung
mit gesetztem `scrollTop` trennt beides (Nachtrag in
[`layout-frames.md`](decisions/layout-frames.md)). Dazu: der Leftover-Satz sagte „Stand, den
es nicht mehr gibt“ auch über einen Eintrag, der auf HEAD passt; ein Amend ohne etwas hinzuzufügen
schrieb den Commit trotzdem um; und eine leere `quartz.config.yaml` warf einen rohen `TypeError`,
während eine Datei mit *etwas anderem* darin still als leer gelesen wurde.

**Das neunzehnte Review las die sieben Fixes des achtzehnten** —
`review-2026-09-23..review-2026-09-24` ohne Review-Dokument und Auftrag, 9 Dateien, +380/−88,
davon im App-Code 3 Dateien, +168/−44 — und maß an sieben Wegen, darunter `runCoreUpdate`,
`abortCoreMerge`, `restoreSnapshot` und `duplicateProject` als esbuild-Bündel in zwei Fassungen
gegen ein lokales Upstream-Repo mit den Ständen A/B/C/D, git allein in Wegwerf-Repos, die gebaute
App mit echten Tastendrücken am Layout-Board, das ausgelieferte Handbuch-PDF gegen `pdfinfo` und
den Quelltext von `@dnd-kit/core` 6.3.1. Kein Befund der Stufe Hoch, **keiner Mittel, sieben
Niedrig**, alle sieben abgearbeitet. Die sieben Fixes des Vorgängers tragen, und die Begründung,
die sein Auftrag zuerst zu prüfen bat, trägt auch: Mit dem Getter kostet der Roller nichts, und
`smoke` bleibt still. Was daraus als Regel bleibt, steht oben in den passenden Abschnitten:

- **Wer zu viel hört, verengt am Hörer — auch am Hörer darüber.** Der Guard des zehnten Reviews
  saß am Bereichsformular des Frame-Builders; die Karte des Layout-Boards hatte ihn nicht, und
  dnd-kits Tastatur-Aktivator ruft `preventDefault()`, aber kein `stopPropagation()`. Jedes
  Aufnehmen klappte damit die Karte auf (43 → 108 px, also verschob es die Liste unter dem Drag),
  Escape ließ sie offen.
- **Eine Regel gilt für jede Stelle, die sie nennt, oder sie nennt die Ausnahme mit Grund.** Zwei
  Behauptungen derselben `@dnd-kit`-Regel trafen das Board nicht: `setActivatorNodeRef` (es war die
  einzige der drei Stellen ohne — nach einer Ablage in eine andere Zone stand der Fokus auf der
  Karte) und „Sortierbare Zeilen tragen zusätzlich ‚nach oben / nach unten‘“ (zwei von drei tun
  es; die Ausnahme steht jetzt mit Grund da).
- **Ein Satz über den Preis einer Richtung wird an der Richtung geprüft, die ihn zahlt.** „Eine
  unschreibbare Notiz liest sich als ‚nichts steht aus‘“ stand an drei Stellen — und beschrieb die
  *Lesehälfte*. Geschrieben wurde sie über `writeFileAtomic`, das wirft, und unbehandelt endete der
  Lauf zwischen Merge-Commit und `npm install`, im Zustand, den die Notiz erfunden wurde zu
  beschreiben.
- **Ein Gürtel, der den falschen Baum fragt, ist enger als kein Gürtel.** Der vom achtzehnten
  Review vorgeschlagene `git stash show -p | git apply --check` fragt den Baum, der mitten im Merge
  dasteht, nicht den, den `merge --abort` macht — gemessen hätte er in einer von drei Szenen einem
  Nutzer `git stash drop` für Einträge geraten, die der Knopf gleich zurückträgt. Die Frage, die
  trägt, ist gits eigene: `reset --merge` befreit einen Pfad genau dann, wenn der Merge um ihn
  geht.
- **Ein gespeicherter Wert, der nichts entscheidet, ist ein Fehler in Wartestellung.** Der SHA in
  der Notiz wurde nur auf „nicht leer“ gelesen; mit ihm erkennt der Lauf, der die Arbeit eines
  früheren beendet, dessen Merge-Commit wieder und bessert ihn nach — aber nicht, wenn der Commit
  die Maschine schon verlassen hat.
- **Eine Zahl gehört zu dem, woran sie gemessen wurde** — dreimal: 52 px ist die `min-h` der Zone
  und 51 px der Abstand von Zeile zu Zeile (beide richtig, keine Stelle sagte wofür); „0 / 35 /
  118,5“ maß eine Liste, die der aufgeklappten Karte 65 px verdankte; und „ein Duplikat erbt keine
  liegende Notiz“ stimmte nicht, es erbt sie wörtlich.

**Das achtzehnte Review las die acht Fixes des siebzehnten** —
`review-2026-09-22..review-2026-09-23` ohne Review-Dokument und Auftrag, 13 Dateien, +474/−53,
davon im App-Code 4 Dateien, +226/−34 — und maß an sechs Wegen, darunter `runCoreUpdate` in zwei
Fassungen als esbuild-Bündel gegen ein lokales Upstream-Repo, git allein in Wegwerf-Repos, die
gebaute App mit echten Tastendrücken am Layout-Board und das ausgelieferte Handbuch-PDF gegen
`pdfinfo`. Kein Befund der Stufe Hoch, **drei Mittel, vier Niedrig**, alle sieben abgearbeitet. Die
acht Fixes des Vorgängers tragen; zwei der drei mittleren saßen in den zwei Commits, die sein
Auftrag als „Nebenbei“ führte, der dritte war eine Begründung, die nicht trug. Was daraus als Regel
bleibt, steht oben in den passenden Abschnitten:

- **„Der Merge hat nichts geholt“ ist nicht „es ist nichts zu tun“.** Die Abkürzung entschied an
  HEAD, und HEAD steht auch still, wenn ein *früherer* Lauf den Merge committet hat und dann an
  `npm install` gescheitert ist — genau der Zustand, in den die App mit „starte das Update erneut“
  schickt. Der erneute Lauf sagte „Already up to date.“, `success: true`, und rief weder npm noch
  den Aufwärm-Build. Die Notiz dagegen ist **umgedreht** gebaut („steht aus“ statt „fertig“), weil
  die andere Richtung den ersten Lauf jedes bestehenden Projekts wieder zum Volldurchlauf gemacht
  hätte — gemessen, nicht überlegt.
- **Ein Ding, das einem Vorgang gehört, hängt an dem Zustand, gegen den es zurückgegeben wird.**
  Der Stash war an den Merge-Commit gebunden; derselbe Merge kann gegen zwei HEADs versucht werden,
  und dann poppt der Abbruch-Knopf auf einen fremden Stand — `UU package.json`, Konfliktmarker,
  kein gültiges JSON. git hält die Antwort selbst: `refs/stash^` ist der HEAD, auf dem der Stash
  entstand.
- **Ein Rückfall, der nur noch die schlechtere Hälfte tun kann, gehört weg.** `pop --index`
  verweigert sauber; der einfache Pop dahinter schrieb dann die Marker, die die Verweigerung gerade
  verhindert hatte.
- **Zwei Sätze derselben Sitzung dürfen einander nicht widersprechen.** Der Lauf nannte einen Stash
  „gehört nicht zu diesem Update“ und riet zu `git stash pop`, während der Abbruch-Knopf ihn
  Sekunden später selbst aufnahm. Der Satz stellt jetzt dieselbe Frage wie der Knopf.
- **Wer zwei Zustände vergleicht, vergleicht sie in beiden Reihenfolgen** — sonst misst er den
  ersten Versuch. Der Layout-Absatz schrieb dem Roller zu, was der erste Pfeildruck ohnehin tut, und
  schloss damit eine Frage, die offen war: Das Board hatte gar keine `@dnd-kit`-Sensoren, ein
  Paletten-Chip war per Tastatur nicht ins Board zu bringen. Mit dem Getter kostet der Roller
  nichts, also ist er drin, und `npm run smoke` meldet zum ersten Mal nichts.
- **Eine Zahl gehört zu dem, woran sie gemessen wurde** — zweimal: „achtzehn `/Type /Pages` mit je
  `/Count 8`“ (es sind 14, dazu zwei Zwischenknoten und ein Wurzelknoten mit 115), und die Klammern
  der Nachträge in `docs/decisions/`, die Review-Nummern als Datum lasen.
- **Ein Bezeichner ist erst dann ein Format, wenn ihn ein fremder Rechner geschrieben hat.** Der
  Stash-Name kam nach beiden Betas; bis zum nächsten Release darf er sich ohne Migration ändern.

**Das siebzehnte Review las die zehn Fixes des sechzehnten** —
`review-2026-09-21..review-2026-09-22` ohne Review-Dokument und Auftrag, 13 Dateien, +520/−101,
davon im App-Code 6 Dateien, +322/−74 — und maß an sieben Wegen, darunter `runCoreUpdate` in zwei
Fassungen als esbuild-Bündel gegen ein lokales Upstream-Repo, git allein in Wegwerf-Klonen und die
gebaute App mit mitgeschriebenen Statusereignissen. Kein Befund der Stufe Hoch, einer Mittel,
sieben Niedrig, alle acht abgearbeitet. Beide Fixes des Vorgängers tragen; der mittlere Befund saß
in dem, was der Auftrag als größtes Risiko genannt hatte — der Stash ist neu, und nichts band ihn
an den Lauf, der ihn geschrieben hat. Was daraus als Regel bleibt, steht oben in den passenden
Abschnitten:

- **Ein Ding, das einem Vorgang gehört, wird nach dem Vorgang benannt, nicht nach dem Werkzeug.**
  „Merge abbrechen“ verglich den Betreff von `refs/stash`; wer einen hängenden Merge einmal von
  Hand auflöst, behält den Stash, kein späterer Lauf sagt es, und beim nächsten Konflikt poppt der
  Knopf ihn auf einen HEAD, gegen den er nie gemacht wurde — `UU` in beiden Paketdateien,
  Konfliktmarker, kein gültiges JSON, unter `success: true`. Die Nachricht trägt jetzt den Commit,
  und `abortCoreMerge` liest `MERGE_HEAD`, bevor `merge --abort` ihn wegwirft.
- **Was ein fremdes Programm getan hat, sagt sein Ergebnis, nicht sein Exit-Code.**
  `git stash push -- <pfade>` legt den Stash an, nimmt beide Dateien und endet trotzdem mit 1, wenn
  der Index vor HEAD steht und der Arbeitsbereich auf HEAD. Der Besitz hängt jetzt am Ref.
- **Wer etwas hält, das er nicht zurückgeben kann, hält es gar nicht erst.** Der Plan liest den
  Arbeitsbereich, der Stash hält auch den Index; wo eine Datei auf drei Ständen zugleich steht,
  fasst die App sie nicht an — dieselbe Regel wie für jede andere Änderung, die der Plan nicht
  nachspielen kann.
- **Eine Wartezeit, die man sehen kann, braucht auch einen Ausgang** — und eine Zeit, die einen
  Prozess beschreibt, entsteht mit ihm. Seit ein Start auf einen Build wartet, dauert `starting`
  einen Build: Die Übersicht bot in dieser Zeit „Starten“ und „Neu starten“ an, beide deaktiviert,
  und `startedAt` stand auf der Klickzeit.
- **Zwei Arten zu scheitern bekommen zwei Antworten** — noch einmal, im Konfliktzweig: Ein Abbruch,
  den git verweigert, kam roh, und der Grund eines gescheiterten Merge-Commits kam gar nicht an.
- **Eine Regel ohne ihr Experiment ist eine Behauptung.** Drei Regeln verwiesen auf Messungen in
  `docs/decisions/`, die dort nicht standen; sie standen in Review-Dokumenten und
  Commit-Nachrichten, also in den Dateien, gegen die die Regel daneben geschrieben wurde.
- **Eine Zahl gehört zu dem, woran sie gemessen wurde** — dreimal: `brew.sh:183` gilt nur für root
  (der Schnellpfad ist das `exit 0` in Zeile 112), „nur in Commit-Nachrichten“ traf drei der vier
  Handgriffe, und das PDF-Skript sagte „57 Seiten“ für ein PDF mit 115. Es zählt jetzt beide.

**Das sechzehnte Review war das zweite Paar Augen nach der zweiten Beta** — es las
`review-2026-09-20..review-2026-09-21` (30 Dateien, +1846/−83) und maß an sieben Wegen, darunter
`runCoreUpdate` als esbuild-Bündel gegen ein lokales Upstream-Repo mit npm-Attrappen und die
gebaute App gegen eine Projektkopie. Kein Befund der Stufe Hoch, zwei Mittel, sieben Niedrig, alle
neun abgearbeitet. Beide mittleren lagen in den zwei Fixes, die der Auftrag als ungemessen benannt
hatte, und beide waren Türen, die ein Fix erst geöffnet hatte: Der wartende Serverstart war für die
Oberfläche unsichtbar, und das Core-Update warf die uncommitteten Paketeinträge weg, bevor es
wußte, ob der Merge durchkommt. Was daraus als Regel bleibt, steht oben in den passenden
Abschnitten:

- **Eine Wartezeit, die niemand sieht, ist eine Einladung zum zweiten Klick** — und ein Map-Eintrag
  unter einer Projekt-ID trägt so wenig über die Zeit wie eine PID. Gemessen: zwei Klicks kamen an
  der Sperre vorbei, beide spawnten, der zweite starb am Port und löschte die Buchführung des
  ersten; danach sagte die Seite „Fehler“ und bot „Starten“, während der erste Server lief.
- **Wer etwas wegnimmt, um Platz zu machen, gibt es zurück, wenn der Platz nicht gebraucht wird** —
  und zwar über git, nicht über den Arbeitsspeicher: ein Stash übersteht den halb fertigen Merge,
  den `merge --abort` und die Sitzung, und `git stash list` zeigt ihn dem, der von Hand aufräumt.
- **Zwei Fragen, zwei Vergleiche.** Der Plan fragt die Merge-Basis, die Türen öffnen sich gegen
  HEAD. Eine uncommittete Entfernung wurde so stumm rückgängig gemacht, und ein Projekt auf dem
  Stand installierte bei jedem Update nach, unter einer Zeile, die etwas behauptete, was nicht
  geschah.
- **Ein Wert, den ein fremdes Programm vergleicht** — noch einmal, diesmal ein Pathspec:
  `git checkout -- a b` ist alles oder nichts, und für ein Projekt mit gitignoriertem Lockfile war
  der Fix des Vorgängers still wirkungslos.
- **Eine Zahl gehört zu dem, woran sie gemessen wurde** — dreimal: 118 PDF-Seiten für eine Fassung,
  die es nicht mehr gibt (es sind 115); ein Commit-Hash, den ein Amend überholt hat; und eine
  `curl`-Kette, die einen Tag später nicht mehr galt, weil Quartz ein `sharp` pinnt, das
  `brew --prefix` fragt statt `brew environment`. Das PDF-Skript sagt seine Zahlen seit diesem
  Durchgang selbst.
- **Ein Handgriff, der nur in einer Commit-Nachricht steht** — noch einmal, und diesmal in der
  Liste, die genau dagegen entstand: `docs/release.md` deckte vier der Handgriffe nicht, die Beta 2
  gebraucht hat.

**Das fünfzehnte Review las die vier Fixes des vierzehnten, den Merge und alles, was danach vor der
zweiten Beta kam** (`review-2026-09-19..fix/review-2026-09-18`, 33 Dateien, +1036/−143) — und war
das erste dieser Serie, das auf der Debian-VM gemessen hat. Kein Befund der Stufe Hoch, einer
Mittel, sechs Niedrig, alle sieben abgearbeitet. Der Abbruch in `beforePack`, den der Auftrag als
erstes Risiko nannte, trägt auf beiden Maschinen: ohne Handbuch-Projekt Exit 1 und kein Paket, mit
`QUARTZCONTROL_HANDBOOK_SITE` 461 Dateien im Paket. Der mittlere Befund lag im kleinsten Commit:
Das Demo-Skript der Screenshots schreibt seine Ziele in ein echtes Projekt, und seit `e06eed5`
überschrieb es dort gleichnamige. Die übrigen: der Ersatz für `globby` normalisierte seine Muster
nicht wie fast-glob (`tpl//`, `tpl/.`, `x/..` — die Richtung des toten Links), ein Kommentar nannte
ein öffentliches Repository privat, der Skill `projekt-dokumentieren` verwies auf eine Datei, die
es nicht gab, und rief `python`, eine Zählung in dieser Datei stimmte nicht, Handbuch 5.3 nannte
die Meldung von `require()` statt der von Quartz 5, und drei Handgriffe vor dem Release standen in
keinem Dokument. Was daraus als Regel bleibt, steht oben unter Arbeitsweise:

- **Was ein Skript leiht, gibt es zurück — an jedem Ausgang.**
- **Ein Handgriff, der nur in einer Commit-Nachricht steht, wird beim nächsten Mal vergessen.**

Dazu, ohne eigene Regel, weil es sie schon gibt: Eine Nachbildung sagt, *woran* ihre Liste der
Abweichungen gemessen ist („außer `{x,y}` und `!!x` fehlt nur ein Link“ galt für 31 Muster, nicht
für jedes), und eine Referenz, die dieselben Aufrufe noch einmal aufschreibt, sagt, dass sie eine
Kopie ist.

**Das vierzehnte Review las die vier Fixes des dreizehnten** (`review-2026-09-18..fix/review-2026-09-17`,
im App-Code 7 Dateien, +175/−48) — und war das erste dieser Serie, das an der *gepackten* App
gemessen hat. Kein Befund der Stufe Hoch, keiner Mittel, drei Niedrig im Diff und einer außerhalb,
alle vier abgearbeitet. Der `import()` von `globby` aus dem Projekt trägt auch aus `app.asar`
heraus; der Hinweis am dunklen Bild trägt in sechs Zuständen; der Checker zählt richtig, bis auf
eine Deklaration. Der wichtigste Befund lag außerhalb: Das Paket, das die Messung packen musste,
kam ohne Handbuch, weil `build-handbook.mjs` das Projekt am Ort vor dem Umzug suchte — und der Fix
dafür lag seit zwei Tagen auf einem Branch, der nie gemergt wurde. Was daraus als Regel bleibt,
steht oben in den passenden Abschnitten:

- **Zwei Arten zu scheitern bekommen zwei Antworten**, und ein Ersatz sagt, dass er lief.
- **Code aus dem `node_modules` eines Projekts im Hauptprozess** ist eine Entscheidung mit Preis
  (`safeStorage`), und der steht jetzt da; eine dritte Stelle begründet sich selbst.
- **Ein Bau, dem etwas fehlt, bricht ab, statt zu warnen.**
- **Ein Fix auf einem Branch, der nie gemergt wurde, ist keiner.**
- **Die Zahl eines Prüfskripts zählt, was sie zu zählen behauptet.**

**Das dreizehnte Review las die neun Fixes des zwölften und die Lücke daneben** — die 16 Commits
zwischen `review-2026-09-14` und `review-2026-09-16`, die bis dahin kein Review dieser Zählung
gelesen hatte (unten). Kein Befund der Stufe Hoch, keiner Mittel, vier Niedrig, alle vier
abgearbeitet. Der Folger-Umbau, der das zwölfte am meisten beschäftigt hatte, trägt: in drei
Szenarien an der gebauten App bewegte kein Server-Satz die Build-Aktivität und umgekehrt, und zum
ersten Mal ist dabei auch die Oberfläche gemessen, nicht nur die Ereignisse. Zwei der vier Befunde
waren Nachschärfungen an Fixes des zwölften (Ignore-Muster, dunkles Bild), einer ein Prüfskript,
das eine Schreibweise nicht las, einer ein Kommentar. Was daraus als Regel bleibt, steht oben in
den passenden Abschnitten:

- **Liegt das fremde Programm im Projekt, fragt die App es selbst** — der dritte Schritt nach
  „nach dessen Regel bilden“ und „gegen das fremde Programm prüfen“. Auch die geprüfte Nachbildung
  lag daneben, weil eine Gegenprobe nur die Muster trifft, die man sich ausdenkt.
- **Mit denselben Eingaben heißt auch: mit denselben unsichtbaren.** Das cwd entscheidet, welche
  `.gitignore` gilt; gemessen zählt das `.gitignore` des Projekts nur, wenn das Projekt ein
  git-Repo ist, und dann für App und Quartz gleich.
- **Was der Build liest, ist die Datei, nicht der Entwurf.**
- **Ein Prüfskript sagt, was es nicht prüfen konnte.** `check:i18n` nennt jetzt 67 Aufrufe im
  Renderer und keinen im Hauptprozess, deren Schlüssel berechnet ist (bis zum Review 2026-09-18
  stand dort einer — die Deklaration von `mainT`); die Gegenprobe mit vier
  gelöschten Schlüsseln, die nur in Ternären standen, sah der alte Checker nicht, der neue alle vier.
- **Eine Liste des absichtlich Weggelassenen gehört zur Behauptung „vollständig“.**

**Das zwölfte Review las die Beta-2-Liste** — fünfzehn Punkte aus den Rückmeldungen der ersten
Beta, vierzehn Branches von `main`, die einander nie gesehen hatten und nur zum Lesen in
`review/beta2` zusammengeführt waren; 42 Dateien, +1420/−178. Kein Befund der Stufe Hoch, einer
Mittel, acht Niedrig, alle neun abgearbeitet. Der mittlere war genau das Zusammenspiel, das der
Auftrag als ungeprüft genannt hatte: Der neue Build-Zustand im Hauptprozess hält eine Aktivität je
Projekt, und der Dev-Server schrieb seinen Neubau ohne Rücksicht hinein — ein einmaliger Build lief
3,3 seiner 6,9 Sekunden ohne Zeile und ohne Sperre, und die Übersicht las in dieser Zeit den halb
geschriebenen Ausgabeordner als „zuletzt gebaut“. Drei der neun hingen an derselben Funktion, ein
vierter am Handler daneben. Was daraus als Regel bleibt — die ersten zwei Punkte als eine Regel
unter Prozessgrenze, der Ref unter Renderer, das Prüfskript unter Arbeitsweise, das „noch einmal“
bei der Regel, die es schon gab:

- **Wer einen Zustand aus fremden Ausgabezeilen liest, weiß, wessen Zeilen er liest** — und liest
  jeden Strom und jeden Weg, auf dem das fremde Programm den Satz schreibt. Drei Befunde waren
  dieselbe Lücke von drei Seiten: die Quelle (Build oder Server), der Strom („Rebuild failed“ auf
  stderr) und der zweite Neubau, den jedes Speichern in der App auslöst und der einen anderen
  Satz sagt.
- **Wer einem laufenden Vorgang beitritt, prüft, ob er dasselbe will.** `IPC.buildRun` gab das
  Ergebnis des laufenden Builds zurück, bevor es den Ordner ansah — „erfolgreich“ für `dist/`,
  das nie entstand. Die Prüfung steht in Handler *und* Dienst, weil zwischen beiden ein
  Lesevorgang und womöglich ein Dialog liegen.
- **Ein Ref, den ein Effekt zurücksetzt, hängt an einem Render, den React auslassen darf** — eine
  Regression aus einem Fix derselben Runde, gemessen mit `document.activeElement` nach jedem Klick.
- **Eine Warnung eines Werkzeugs ist kein Befund über die eigene Konfiguration.** Der Kommentar an
  `hardenedRuntime: false` nahm electron-builders Warnung zu `disable-library-validation` als Beleg,
  dass dyld das Framework ablehnen würde. Die Warnung kommt bei `-` unbedingt, und die Vorlage, die
  hier ohne eigene Datei greift, trägt das Entitlement schon. Die Entscheidung blieb, die
  Begründung ist jetzt die, die trägt — und was nur gelesen ist, steht als gelesen da.
- **Ein Wert, den ein fremdes Programm vergleicht, wird nach dessen Regel gebildet** — noch einmal:
  Die Liste der neuen Startseite prüfte Quartz' `ignorePatterns` gegen den Namen, Quartz prüft sie
  gegen den Pfad, und `private/**` verlinkte einen Ordner, den der Build weglässt. Die Gegenprobe
  lief diesmal gegen Quartz' eigenes `globby` aus dem Projekt — und traf trotzdem nicht `name/*`;
  seit dem dreizehnten Review fragt die App `globby` selbst.
- **Ein Prüfskript lädt die Logik der App, statt sie abzuschreiben** (`shared/macNodeBinary.ts`).
- **Wo eine Seite sofort schreibt und im Entwurf nachzieht, sagt sie den Riss dort, wo er
  besteht.** „Dunkles Bild entfernen“ löscht die Datei sofort, der Kopfbereich hört erst mit dem
  Speichern auf, sie zu nennen; der Hinweis dazu erscheint nur, wenn die *gespeicherte* Config den
  Kopfbereich mit dunklem Bild trägt und das Bild da ist. (Die erste Fassung fragte den Entwurf —
  dreizehntes Review, Befund 2.)

Von den zwei Beobachtungen des Reviews, die nicht aus dieser Runde stammen, ist eine nicht behoben:
Ein YAML-Fehler im Frontmatter *einer* Notiz beendet den Dev-Server — das ist Quartz (`trace()` ruft
auf dem Hauptthread `process.exit(1)`), und die App zeigt danach korrekt „abgestürzt“. Die zweite
ist am 2026-09-16 entschieden und umgesetzt: Ein einmaliger Build und der Dev-Server schrieben
zugleich in dasselbe `public/` (im Mitschnitt 16 Dateien des Neubaus mitten in „Emitting files“ des
Builds). Der Build wird jetzt abgelehnt, der Serverstart wartet — Regel oben unter Prozessgrenze.

**Das elfte Review las die Beispielvorlage und den Kopfleisten-Umbau daneben** — 30 Commits, im
App-Code nur +478/−71, der Rest Vorlage und Text. Kein Befund der Stufe Hoch, drei Mittel, neun
Niedrig, alle zwölf abgearbeitet. Der erste saß in dem Block, den der Auftrag zuerst gelesen haben
wollte: Das erzeugte Frame-CSS ist ungeschichtet, der neue Plugin-Kompatibilitätsblock damit auch —
und ungeschichtet schlägt `@layer quartz-base` unabhängig von der Spezifität. Auf dem Telefon war
die Schublade wieder die des Plugins und nicht mehr scrollbar, auf dem Desktop war der gefaltete
Explorer wieder der 19-px-Stummel, den die Vorlage in ihrem Kommentar als behobenen Fehler führt.
Beides in Firefox und WebKit gemessen, vorher und nachher, an der neu gebauten Website. Was daraus
als Regel bleibt, steht oben in den passenden Abschnitten:

- **Erzeugtes CSS gehört in die Schicht dessen, was es nachspricht** — sonst überholt eine Kopie
  nicht nur ihre Quelle, sondern auch jeden, der die Quelle überschreiben dürfte.
- **Das registrierte Speichern schreibt alles, was `dirty` zählt.** Auf *Eigenes CSS* schrieb es
  nur den aktiven Reiter, meldete `true`, und der Verlassen-Dialog navigierte — „Speichern" gesagt
  und einen Teil verloren. Gemessen an der gebauten App: zwei Entwürfe, ein Klick, beide auf der
  Platte.
- **Eine Prüfliste ist eine Spalte, keine Zeile.** Drei Flächen für die Ruhefarbe, eine für den
  Hover — und das Ergebnis „89 Paare, keines darunter“ als Beleg für eine Palette, deren
  Hover-Farbe auf der Karte bei 3,71:1 stand. Jetzt 93 Paare, `tertiary` hell auf `#196B6B`.
- **Wer einen Nutzen misst, misst auch den Preis** (`rectSortingStrategy` skalierte die Nachbarn,
  seit die Karten verschieden hoch sind; der Drag trägt jetzt `CSS.Translate`).
- **Drift läuft in beide Richtungen** — `--check-sync` sagt es, ohne eine Seite zu bevorzugen.
- **Eine Zahl gehört zu dem, woran sie gemessen wurde.** Die zwei Kästen stehen unter 600 px
  *Textzeile* untereinander, nicht unter 600 px Fenster — das sind rund 1370, also auf beiden
  gängigen Laptop-Breiten. Dazu vier weitere Sätze, die den Code beschrieben, den es nicht gibt:
  4,87 statt 4,90, „das Kapitel wiederholt die Überschrift nie“ (auf 14 von 266 Seiten doch), eine
  geteilte Gitterzeile, die `frames.mjs` ausdrücklich für unmöglich erklärt, und „jede Schreibweise,
  die der Browser malen kann“ für einen Parser, der `oklch()` nicht kennt.

**Das zehnte Review las die fünf Fixes des neunten und die Linux-x86_64-Schicht daneben** — und war
das erste, dessen Befunde fast alle *außerhalb* des laufenden Programms lagen: in der
Verpackungsschicht, in den Skripten und in Sätzen über beide. Kein Befund der Stufe Hoch, einer
Mittel, sechs Niedrig, alle sieben abgearbeitet. Der mittlere saß in der einen Stelle, die der
Commit selbst als „nicht gemessen“ geführt hatte: Der Menüpunkt „Rückmeldung senden“ zeigte auf ein
privates Repository, und GitHub antwortet darauf nicht „kein Zugriff“, sondern 404 — für jeden
Beta-Tester also nichts. Was daraus als Regel bleibt, steht oben in den passenden Abschnitten:

- **Ein Link nach draußen wird an dem gemessen, was am anderen Ende antwortet.** Zum dritten Mal in
  dieser Serie war es eine Übergabe an etwas außerhalb der App, die nicht gemessen wurde (fünftes
  Review: `openPath`; achtes: dieselbe Sorte). Wer eine URL in die App schreibt, ruft sie einmal
  ohne Anmeldung ab.
- **Ein Ausweg, den niemand ausprobiert hat, ist eine Vermutung.** `npm run dist:linux -- --x64`
  stand als Ausweg im Kommentar und baut beide Architekturen; die Regel, die dagegen hilft, stand
  zwanzig Zeilen tiefer in derselben Datei.
- **Ein `rmSync` fragt nicht, wessen Verzeichnis das ist.** Wer ein Zielverzeichnis leert, prüft
  vorher, ob die Quelle darin liegt — und zwar in beide Richtungen, nach `resolve()`/`relative()`.
  Die Reihenfolge „erst prüfen, dann leeren“ hilft nur, wenn sie *das* prüft.
- **Ein Wächter gehört an jede Tür zu demselben Zustand** — noch einmal, und diesmal waren es fünf:
  Die `basic_text`-Korrektur hatte zwei gefunden, die anderen drei (der Vertrag, zwei Sätze im
  Entscheidungsdokument) und das Handbuch in beiden Sprachen sagten weiter das Widerlegte.
- **Der Rat gehört in den Absatz, den der Nutzer wirklich zu sehen bekommt.** Er stand im Zweig
  `available === true`, den diese App nie erreicht, während der Zweig daneben zweimal sagte, dass
  es nicht geht, und nie, was zu tun ist.
- **Zwei Erklärungen für dasselbe Symptom sind eine zu viel.** Das `--no-sandbox` im DMG-Skript gab
  dem Sandkasten die Schuld an einem `ERR_FAILED`, das mit wie ohne Flag auftritt — und ein Flag
  mit einer Begründung, die nicht trägt, ist das, was der nächste Leser kopiert.
- **„Kostet nichts“ ist eine Messung oder es gehört da nicht hin.** Der Wechsel der Bundle-ID kostet
  eine Preferences-Datei, sieben Launch-Services-Einträge und eine TCC-Freigabe, die neu erfragt
  wird — klein, aber nicht nichts; und die Begründung daneben („ein Flatpak wurde nie gebaut“) war
  155 Zeilen weiter in derselben Datei überholt.

**Das neunte Review las die acht Fixes des achten und den Nachtrag daneben.** Kein Befund der Stufe
Hoch, einer Mittel, vier Niedrig, alle fünf abgearbeitet. Der mittlere war wieder eine Regression
aus einem Fix des Vorgängers: Der Tastatur-Guard am Bereichsformular hielt nicht nur die
Tastendrücke auf, die zum Kasten wollten, sondern auch die, die zu `@dnd-kit` wollten — Pfeile und
Escape kamen nicht mehr an, und ein Tastatur-Drag endete beim ersten Tastendruck außerhalb des
Formulars als Ablage auf einer Zelle, die niemand gewählt hatte. Was daraus als Regel bleibt, steht
oben in den passenden Abschnitten:

- **Ein Guard hält die Kette für jeden an, der weiter oben hört — auch für den, den man nicht
  sieht.** Der `KeyboardSensor` hört während eines Drags auf dem Dokument. Wer zu viel hört,
  verengt am Hörer, nicht an dem, was aufsteigt.
- **Ein Hinweis beschreibt die Tür, hinter der die Sache passiert.** „Verschwindet beim nächsten
  Speichern" stand über einem Filter, der in `update` sitzt; ein Klick auf Speichern schrieb die
  Datei neu und ließ den toten Ausschluss darin.
- **Eine Zahl gehört zu dem, woran sie gemessen wurde.** 3110 und 3105 waren beide richtig, für
  `columnLineNames` und für `placements` — und keine der zwei Stellen nannte das Feld, also liest
  der Nächste eine davon als falsch.
- **Wer einen zweiten Fall einführt, liest die Sätze daneben noch einmal.** Der Chip lernte
  „ausgeblendet"; die Überschrift über ihm und der Hinweis unter ihm sprachen weiter so, als läge
  in der Ablage nur Unplatziertes.

**Das achte Review las die acht Fixes des siebten und die zwei kleinen Vorhaben darunter** (PR #27
und #28). Kein Befund der Stufe Hoch, einer Mittel, sieben Niedrig, alle acht abgearbeitet. Der
mittlere war eine Regression aus dem Fix des siebten: Der zweite Durchgang in `pickGroupOrder`
ließ die ungeteilten Positionen ganz weg und warf damit genau das Zeugnis weg, das eine falsche
Kandidatin ausgeschlossen hatte — am echten Build zeigten 203 von 211 Editorial-Seiten die
Komponenten der einen Gruppe im Bereich der anderen, unter einer Warnung, die die Teilung für
normal erklärte. Was daraus als Regel bleibt, steht oben in den passenden Abschnitten:

- **Eine Position, die ein Frame nicht teilt, spricht nur in eine Richtung.** Weniger Flexes als
  beschrieben hat die gewöhnliche Erklärung, mehr hat keine. Wer eine Prüfung lockert, lockert sie
  in der Richtung, in der die Abweichung erklärbar ist — nicht, indem er die Spalte streicht.
- **„Beim nächsten Schreiben“ hat so viele Türen, wie zum Schreiben führen.** Der Filter für die
  toten Ausschlüsse saß in einer von dreien; er sitzt jetzt an der Stelle, an der aus dem Entwurf
  eine Änderung wird.
- **Zwei Dinge, die gleich aussehen, brauchen zwei Antworten** — noch einmal, zweimal: „nie
  ausgeschlossen“ gegen „ausgeschlossen unter einem toten Namen“, und „nicht platziert“ gegen
  „platziert und ausgeblendet“. Im zweiten Fall fehlte dem Formular ausgerechnet der Schalter, der
  den Bereich dorthin gebracht hatte.
- **Ein Guard hat zwei Hälften, Zeiger und Tastatur.** Das Bereichsformular hatte
  `stopPropagation()` nur für den Klick; per Tastatur war es damit unbedienbar.
- **„Am Schema gemessen“ heißt: kaputte Eingaben hindurchschicken, nicht das Schema lesen.** Der
  sechste zod-Code (`invalid_key`) stand die ganze Zeit da, und sein Pfad *ist* der fremde
  Schlüssel — also gekappt, je Segment.
- **Eine Zahl in einem Dokument ist eine Messung oder sie gehört da nicht hin.** „Dieselben zehn
  Felder“ war keine; gezählt sind es sechs.

**Das siebte Review war das erste, das an einem echten `quartz build` gemessen hat** — eine Kopie
des Beispielprojekts, 266 Markdown-Dateien, 201 Editorial-Seiten je Lauf, die gebauten Seiten mit
`hast-util-from-html` ausgezählt. Kein Befund der Stufe Hoch, zwei Mittel, sechs Niedrig, alle acht
abgearbeitet (PR #26). Beide mittleren waren erst an diesem Weg sichtbar: eine Regression aus dem
Fix des sechsten Reviews, die eine ganze Seite ungeteilt rendern ließ, weil die Zahl auf einer
Position nicht stimmte, die das Frame gar nicht teilt — und ein Quartz-Fehler, den die App geerbt
hatte, weil sie seiner Dokumentation folgte. Was daraus als Regel bleibt, steht oben in den
passenden Abschnitten:

- **Ein Wert, den ein fremdes Programm vergleicht, wird nach dessen Regel gebildet** — und die
  Nachbildung wird gegen das fremde Programm geprüft, nicht gegen die eigene Vorstellung von ihm.
  `npm run check:plugin-names` schneidet dafür Quartz' eigene Funktion aus dessen Quelldatei; die
  Gegenprobe fand sofort einen Rand, den zweimaliges Lesen nicht gefunden hatte.
- **Ein Wächter, der eine Kopie prüft, prüft sie so scharf wie nötig und nicht schärfer.** Alle
  sechs Positionen abzugleichen ist der bessere Schlüssel, „alles oder nichts“ war die falsche
  Folgerung daraus.
- **Eine Liste, die zu einem Frame gehört, wird auch je Frame gerechnet.** Eine Kandidatin zu viel
  kann eine Auswahl *ermöglichen*, die es sonst nicht gäbe — die stumme Richtung.
- **Ein Rat, den man nicht befolgen kann, ist der Fehler, nicht die Hilfe.** Zwei Meldungen statt
  einer, und die zweite nennt zwei Auswege, die beide gemessen sind.
- **Eine Warnung ist keine Fehlermeldung**, auch nicht in einer Konsole: `LogLine.stream` hat
  einen dritten Wert für die Sätze, die die App selbst schreibt.
- **Ein zod-Satz beschreibt nicht immer einen Bug.** Wo er eine Eingabe beschreibt und in einem
  Nutzersatz landet, wird er in den Worten der App gesagt.

**Das sechste Review traf die Grundlage des Umbaus, den es las.** Kein Befund der Stufe Hoch, drei
Mittel, fünf Niedrig; alle acht sind abgearbeitet, jeder mit einer Vorher-Messung. Der erste
mittlere lag an einer Stelle, die der Auftrag nicht genannt hatte: Die Gruppenordnung, die ein
Frame eingebacken bekommt, ist keine Eigenschaft der Config, sondern eine des Seitentyps — Regel
oben unter „Ein Bereich eines Frames ist Geometrie“, Messungen in
[`layout-frames.md`](decisions/layout-frames.md). Was daraus sonst als Regel bleibt:

- **Zwei Dinge, die gleich aussehen, brauchen zwei Antworten.** „Keine Gruppen“ und „konnte nicht
  nachsehen“ rendern identisch, also muss der Unterschied dort gesagt werden, wo er bekannt ist —
  und zwar dorthin, wo der Nutzer liest. Ein `console.error` im Hauptprozess ist eine Meldung an
  niemanden.
- **Wer eine Kopplung „trägt mit“ nennt, prüft, wohin die Kopie zeigt.** Das Umbenennen eines
  Bereichs benannte seine Gruppe mit um und zerschnitt damit genau die Bindung, die der Kommentar
  daneben zu erhalten behauptete — stumm, weil die Zahl der Flexes weiter stimmte.
- **Ein Wächter gehört an die Tür, an der der Wert *gelesen* wird, nicht an die Aufrufstellen.**
  Der Vorlagen-Import reichte Frames ungeprüft an `saveFrame` durch, während der IPC-Kanal daneben
  alles prüfte; die Prüfung sitzt jetzt in `saveFrame`, wo eine Definition zu Dateien wird.
- **Eine optionale Einstellung zurückzustellen heißt, auch ihr Fehlen zurückzustellen.** `undefined`
  als „nichts zu tun“ zu lesen war genau falsch herum: Der Vorgabezustand ist der häufigste.
- **Was ein fremdes Programm liest, wird atomar geschrieben.** Gemessen: 18 von 401 Lesevorgängen
  sahen bei `writeFile` einen Torso, 0 von 23771 bei `rename`.
- **Eine Nachbildung sagt, wo sie nicht hinreicht.** „It mirrors X exactly“ war an zwei Rändern
  falsch, und einer davon ist prinzipiell nicht erreichbar.

**Das fünfte Review traf das Herzstück des Diffs, den es las.** Ein Befund der Stufe Mittel und
sieben niedrige; der mittlere war, dass das mitgereiste Handbuch unter `file://` eine Seite ohne
Ausgang ist — von 4876 Links zeigte kein einziger auf eine Datei. Alle acht sind abgearbeitet,
jeder mit einer Vorher-Messung; was daraus als Regel bleibt, steht oben in den passenden
Abschnitten:

- **Eine Messung reicht nur so weit wie die Frage, die sie stellt.** Dass `openPath` mit dem
  richtigen Pfad gerufen wird, war gemessen — abgefangen im Hauptprozess, „statt zweimal einen
  Browser zu öffnen". Genau der Browser war die Messung. Wer eine Übergabe an etwas außerhalb der
  App prüft, prüft, was das andere Ende damit tut, nicht nur, was übergeben wurde.
- **Eine gebaute Website wird als Adresse geöffnet, nicht als Datei** — Regel oben unter
  Prozessgrenze, samt den Zahlen.
- **Ein Aufräumschritt, der nach dem Wurf käme, läuft nie.** `buildHandbook()` wirft, bevor es sein
  Ausgabeverzeichnis leert; also packte der `catch` daneben die Kopie des letzten Laufs mit,
  während sein Log „wird ohne Handbuch gepackt" schrieb. Wer einen Fehlerpfad „weiter" nennt, sagt
  dazu, in welchem Zustand er weitergeht.
- **Ein Dialog beschreibt den Zustand, in dem er erscheint.** „Fehlt in dieser Installation" stand
  an einer Stelle, an der die Datei zwei Zeilen vorher nachgewiesen worden war — und empfahl eine
  Neuinstallation gegen ein Problem, das sie nicht berührt.
- **Eine Warnung „nicht zu verwechseln mit…" ist der Befund, nicht seine Lösung** — auch wenn sie
  in der App steht statt im Handbuch. Wo zwei Dinge sich ein Wort teilen, gibt das kleinere den
  Namen ab: aus der „Quartz-Startvorlage" wurde das „Quartz-Grundgerüst", weil „Vorlage" der
  Vorlagen-Seite gehört.
- **Ein Skript verändert auf dem Rechner des Nutzers nichts, was ihm nicht gehört** — und wenn es
  etwas leihen muss, gibt es es in einem `finally` zurück. Was ein echtes Projekt baut oder
  startet, verlangt ein ausdrückliches Flag; „praktisch immer zusammen mit --demo" ist eine
  Dokumentation, keine Sperre.
- **Ein Wächter gehört an jede Tür zu demselben Zustand.** `mainT()` hatte ihn, `mainLanguage()`
  las denselben Cache ohne ihn.

**Das vierte Review las den Diff, den das dritte hinterlassen hatte** — seine sechs Fixes, von
niemandem sonst gelesen. Ein Befund der Stufe Mittel, sieben niedrige, und der mittlere war eine
Regression aus einem der sechs: Die Obergrenze, die die ZIP-Bombe abfing, fing die leere Datei mit,
weil zlib `maxOutputLength: 0` nicht annimmt. Vier der niedrigen lagen genau dort, wo der Auftrag
seine eigenen Risiken vermutet hatte. Alle acht sind abgearbeitet, jeder mit einer Vorher-Messung;
was daraus als Regel bleibt, steht oben in den passenden Abschnitten:

- **Eine Grenze, die aus den Daten kommt, kann Null sein — und Null ist selten „keine".** `zlib`
  liest `maxOutputLength: 0` als ungültig, nicht als „nichts". Wer eine angemeldete Größe als
  Grenze durchreicht, prüft den Rand, den die Bibliothek anders liest als er gemeint war.
- **Ein Fehler, der weiß warum, muss den Grund tragen.** Ein `catch`, der jede Ursache in dieselbe
  Antwort (`null`, „nicht lesbar") verwandelt, macht auch die sorgfältig übersetzten Sätze
  unsichtbar — `check:i18n` sieht das nicht, es prüft, ob ein Schlüssel existiert, nicht ob sein
  Wert je eine Oberfläche erreicht.
- **Ein Schreibpfad vor einem Spawn braucht einen Fallback**, sonst beantwortet er eine Frage, die
  vorher der Kindprozess beantwortet hat — und zwar schlechter (roher Toast statt Status).
- **Eine Datei, die zu einem Lauf gehört, trägt den Lauf im Namen.** Ein fester Name plus `'w'`
  heißt: Der vorherige Lauf, der noch lebt, schreibt in die abgeschnittene Datei des nächsten.
- **Ein Vorgabewert ist eine Vermutung, kein Fund.** Wer einen fehlenden Wert (hier: den Port) mit
  der Vorgabe füllt und dann *misst*, ob dort etwas antwortet, bestätigt fremde Beobachtungen als
  eigene. Erst der Besitz macht die Vermutung zum Fund.
- **Was zweimal aufgerufen werden kann, wird zweimal aufgerufen.** `stop()`, `close()`, `dispose()`
  bekommen ein Flag; ein `closeSync` auf einen geschlossenen Deskriptor wirft aus einem
  Event-Handler heraus, wo nichts es fängt.

Aus dem dritten Review, dessen drei mittlere Befunde alle Fälle waren, in denen eine Messung aus
einer Commit-Nachricht nicht weit genug reichte:

- **„Weiterlaufen lassen“ hielt den Server bis zu seiner nächsten Log-Zeile.** Gemessen war, dass er
  *unmittelbar* nach dem Beenden noch antwortet; mit der App sterben aber die Leseenden seiner
  Pipes, und der erste Rebuild danach bringt ihn um. Die Ausgabe geht seither in
  `.quartz-gui/logs/dev-server-<pid>.{out,err}.log`, die Main tailt — Regel oben unter
  Prozessgrenze.
- **Der Snapshot-Store hält den Projektpfad in jeder Aufnahme.** Der Kommentar in `projectPaths.ts`
  behauptete das Gegenteil auf Grundlage eines `grep`, und `grep` liest in einer git-Objektdatenbank
  nichts. Nach jedem Restore, der Config oder Lockfile berührt, läuft `repointAuthoredFrames()` —
  Regel oben unter Arbeitsweise.
- **Der Font-Parser entpackte ohne Obergrenze.** 863 Bytes wurden zu 1,1 GiB RSS. Grenzen jetzt in
  `fontFile.ts` *und* in `zipArchive.ts`, das dasselbe Muster länger trug — Regel oben unter
  Prozessgrenze.

Die drei niedrigen: der vierte Fundort der Zahl zehn (die Bausteine sind seit `b9831b9` zwölf, und
im gepflegten Vault stand sie noch sechsmal), ein Dry-Run, der verschwieg, was der Import ablehnen
wird, und eine Nadel, deren eigenes Beispiel sie nicht traf.

**Der Auftrag für das fünfte Review steht** in
[`docs/REVIEW-2026-09-08-auftrag.md`](REVIEW-2026-09-08-auftrag.md). Sein Diff hat zwei
Schichten: die acht Fixes des vierten Reviews, die niemand gelesen hat, und eine
Dokumentations-Sitzung, aus der mehr App-Code entstand, als der Name vermuten lässt — ein neuer
IPC-Kanal, der Renderer-Eingabe zu einem Dateipfad macht, eine Änderung an der Verpackung, fünf
neue Skripte und rund fünfzig geänderte Nutzertexte. 45 Dateien, +2043/−187.

**Der Auftrag für das siebte Review steht** in
[`docs/REVIEW-2026-09-10-auftrag.md`](REVIEW-2026-09-10-auftrag.md). Sein Diff war der
kleinste der Serie — 13 Commits, im App-Code 12 Dateien, +432/−82: die acht Fixes des sechsten
Reviews und ein Nachtrag. Was er als erste Frage stellte, hat der Messweg beantwortet und die
Antwort war „ja, aber“: Die Listen, die ein Frame bekommt, sind die von Quartz — für einen
Seitentyp mit einem Ausschluss auf ein `@quartz-community/*`-Plugin aber nicht.

**Der Auftrag für das sechste Review steht** in
[`docs/REVIEW-2026-09-09-auftrag.md`](REVIEW-2026-09-09-auftrag.md). Sein Diff hat wieder zwei
Schichten, die nichts miteinander zu tun haben: die acht Fixes des fünften Reviews, die niemand
gelesen hat (darunter der Handbuch-Server, +170), und den Frame-Bereichs-Umbau aus PR #24 — ein
Bereich darf ohne Belegung leer bleiben, und über `layout.group` kann er eigene Komponenten halten.
20 Commits, 23 Dateien, +1046/−135. Was der Auftrag als größtes Risiko nennt, ist die Grundlage des
Umbaus selbst: die Zuordnung ruht auf einem Funktionsnamen, den es nur gibt, weil Quartz sich mit
esbuilds `keepNames` baut.

**Der Auftrag für das fünfzehnte Review stand** in
[`docs/REVIEW-2026-09-19-auftrag.md`](REVIEW-2026-09-19-auftrag.md). Er las die vier Fixes
des vierzehnten, den Nachtrag, die neu exportierte Vorlage und den Merge von
`feat/beispielvorlage-und-header`, dazu die drei App-Texte, quartz-navigations in Footer und README
und den Fix am Demo-Skript (`review-2026-09-19..fix/review-2026-09-18`, ohne Review-Dokument und
Auftrag 33 Dateien, +1036/−143). Er ist als letztes Review vor der zweiten Beta gedacht und nennt
als erstes Risiko den Abbruch in `beforePack`, der jede Baumaschine ohne Handbuch-Projekt trifft —
und als zweites sieben Commits, die nie ein Review gesehen haben, darunter ein Python-Skript, das
mit einem Obsidian-Vault spricht.

**Der Auftrag für das vierzehnte Review stand** in
[`docs/REVIEW-2026-09-18-auftrag.md`](REVIEW-2026-09-18-auftrag.md). Er las die vier Fixes
des dreizehnten (`review-2026-09-18..fix/review-2026-09-17`, im App-Code 7 Dateien, +175/−48) und
nennt als größtes Risiko den `import()` von `globby` aus dem Projekt in den Hauptprozess — gemessen
an der gebauten, nicht an der gepackten App.

**Der Auftrag für das dreizehnte Review stand** in
[`docs/REVIEW-2026-09-17-auftrag.md`](REVIEW-2026-09-17-auftrag.md). Er liest zwei Bereiche:
die Fixes des zwölften (`review-2026-09-17..fix/review-2026-09-16`) und die Lücke
`review-2026-09-14..review-2026-09-16` (unten), in der die zwölf Fixes des elften liegen.

**Das zweiundzwanzigste Review misst ab `review-2026-09-26`** und liest bis `review-2026-09-27`,
das auf dem Commit „Der Auftrag für das zweiundzwanzigste Review“ (`main`) sitzt — dem Stand, den
es liest; der Auftrag steht in
[`docs/REVIEW-2026-09-26-auftrag.md`](REVIEW-2026-09-26-auftrag.md). Sein Diff sind die sieben
Fixes des einundzwanzigsten Reviews und die sechs Punkte seiner Nebenbei-Liste: ohne
Review-Dokument und Auftragsdatei 19 Dateien, +795/−111, im App-Code 14 Dateien, +446/−93. Als
größtes Risiko nennt der Auftrag zwei Dinge, die über ihren Anlass hinausreichen: `filesAtHead`,
das zum ersten Mal über *zwei Läufe hinweg* entscheidet, ob die App einen Commit umschreibt, und
`carried` ohne SHA-Bindung — eine Paketliste, die jetzt gilt, gleich zu welchem Commit die Notiz
gehört. Beide sind nach dem Auftrag an drei echten Läufen nachgemessen worden (Nachtrag in
[`snapshots-and-updates.md`](decisions/snapshots-and-updates.md)); das Risiko bleibt, wo die
Läufe nicht hinreichen. Daneben das `w-fit` am Drag-Chip, das die Zahl bewegt, mit der beide
Tastatur-Bretter rechnen, und das nur für die Tastatur gemessen ist. `review-2026-09-26` sitzt auf `93ba8bb` („Der
Auftrag für das einundzwanzigste Review“), dem Stand, den das einundzwanzigste Review gelesen hat;
er ist gepusht.

**Das einundzwanzigste Review misst ab `review-2026-09-25`** und liest bis `review-2026-09-26`,
das auf dem Commit „Der Auftrag für das einundzwanzigste Review“ (`main`) sitzt — dem Stand, den
es liest; der Auftrag steht in
[`docs/REVIEW-2026-09-25-auftrag.md`](REVIEW-2026-09-25-auftrag.md). Sein Diff sind die fünf
Fixes des zwanzigsten Reviews, die vier aus seiner Nebenbei-Liste, der Befund aus dem ersten echten
Core-Update und die Dokumentations-Commits daneben: ohne Review-Dokument und Auftragsdatei
9 Dateien, +575/−76, im App-Code 4 Dateien, +250/−62. Als größtes Risiko nennt der Auftrag die
Messung des echten Laufs selbst — die einzige dieser Serie ohne Attrappe und die einzige, die sich
nicht auf Knopfdruck wiederholen lässt; daneben den Amend, der in drei Runden dreimal geändert
wurde, und die zwei Zeilen im Pfeil-Getter. Der trägt nicht „jeden Tastatur-Drag der App“, wie
der Auftrag zweimal sagt, sondern die zwei, die ihn benutzen — `FrameBuilder` und `GlobalBoard`;
`Plugins/Installed` nimmt `sortableKeyboardCoordinates`, `Styles/CustomCss` hat nie ein Drag
gehabt. Beide sind gemessen (einundzwanzigstes Review, Befund 7).
`review-2026-09-25` sitzt auf `9052691` („Der Auftrag für das zwanzigste Review“), dem Stand, den
das zwanzigste Review gelesen hat; seit dem 2026-09-17 ist er gepusht.

**Das zwanzigste Review misst ab `review-2026-09-24`** und liest bis `review-2026-09-25`, das auf
dem Commit „Der Auftrag für das zwanzigste Review“ (`main`) sitzt — dem Stand, den es liest; der
Auftrag steht in [`docs/REVIEW-2026-09-24-auftrag.md`](REVIEW-2026-09-24-auftrag.md). Sein
Diff sind die sieben Fixes des neunzehnten Reviews und die zwei Dokumentations-Commits daneben:
ohne Review-Dokument und Auftragsdatei 9 Dateien, +353/−41 (davon 12 Zeilen dieser Absatz, den
der Auftrags-Commit mitbringt), im App-Code 6 Dateien, +169/−27. Die Nachricht des
Auftrags-Commits sagt dazu +341/−41 und „nach dem Commit nachgerechnet, der die Datei trägt“ —
gezählt war *vor* ihm, und die zwölf Zeilen dieses Absatzes sind der Unterschied (zwanzigstes
Review, Befund 5). Sie bleibt, wie sie ist: Auf dem Commit sitzt `review-2026-09-25`, der Stand,
den das Review gelesen hat. Als
größtes Risiko nennt der Auftrag den `resuming`-Amend — das erste Mal, dass die App einen Commit
umschreibt, den sie nicht in diesem Lauf gemacht hat, mit `git branch -r --contains HEAD` als
einzigem Wächter. `review-2026-09-24` sitzt auf `ff4feba` („Der Auftrag für das neunzehnte
Review“), dem Stand, den das neunzehnte Review gelesen hat; mit dem Fast-Forward vom 2026-09-16
liegt er in `main`.

**Das siebzehnte Review misst ab `review-2026-09-21`** und liest bis `review-2026-09-22`, das auf
dem Commit „Der Auftrag für das siebzehnte Review“ (`fix/review-2026-09-20`) sitzt — dem Stand, den
es liest. **Hier steht bewusst kein Hash**: Der Hash des Commits, der diesen Satz trägt, kann nicht
in diesem Satz stehen, und der Versuch war Befund 6 des sechzehnten Reviews — die Zahl wurde vor
einem Amend geschrieben und überlebte ihn. Die Hashes der älteren Tags stehen hier, weil sie
nachträglich aufgeschrieben und geprüft sind; `git rev-parse review-2026-09-22^{commit}` beantwortet
die Frage ohnehin genauer als jede Zeile hier. Der Auftrag steht in
[`docs/REVIEW-2026-09-21-auftrag.md`](REVIEW-2026-09-21-auftrag.md). Sein Diff sind die zehn
Fixes des sechzehnten Reviews: ohne Review-Dokument und Auftragsdatei 13 Dateien, +520/−101 (davon
15 Zeilen dieser `CLAUDE.md`-Absatz, den der Auftrags-Commit mitbringt), im App-Code 6 Dateien,
+322/−74. Der Branch ist am 2026-09-16 in `main` gelandet (`bc7d774`, Fast-Forward mit den zwei
Runden danach) und mit ihnen am 2026-09-17 auf `origin/main`; dazu
kommt ein Commit im Handbuch-Vault, der nicht in diesem Repo liegt (damals `b61a08d`; seine
Nachricht trug die von Befund 4 des siebzehnten Reviews widerlegte Zeilennummer und wurde vor dem
Push korrigiert, er heißt jetzt `b53a6c1` bei gleichem Baum). Als größtes Risiko
nennt der Auftrag den git-Stash, den `runCoreUpdate` jetzt im Repo des Nutzers anlegt — das erste
Mal, dass die App dessen Stash-Bereich anfasst.

**Das sechzehnte Review misst ab `review-2026-09-20`** und liest bis `review-2026-09-21`, das auf
`dc06e2d` („Der Auftrag für das sechzehnte Review“, `main`) sitzt — dem Stand, den es liest; der
Auftrag steht in [`docs/REVIEW-2026-09-20-auftrag.md`](REVIEW-2026-09-20-auftrag.md). Der Tag
`review-2026-09-20` sitzt auf `4e649a8` („Der Auftrag
2026-09-19 kennt die neu veroeffentlichten Websites“, `fix/review-2026-09-18`), dem Stand, den das
fünfzehnte Review gelesen hat. `review-2026-09-19` sitzt auf `59e149b` („Der Auftrag für das Review
2026-09-18“, `fix/review-2026-09-17`), dem Stand, den das vierzehnte Review gelesen hat.
`review-2026-09-18` sitzt auf `cc4bd50` („Der Auftrag für das Review 2026-09-17“,
`fix/review-2026-09-16`), dem Stand, den das dreizehnte Review gelesen hat. `review-2026-09-17` sitzt auf `8136760` („Der Auftrag für das sechzehnte Review“,
`review/beta2`), dem Stand, den das zwölfte Review gelesen hat. Die Regel ist dieselbe wie bei den
zwölf Vorgängern: Der Ausgangsstand ist das, was gelesen wurde, nicht das, was
danach entstanden ist. So sitzt `review-2026-09-14` auf `dcf28cf`, dem Stand des elften Reviews
(„Der Auftrag für das vierzehnte Review“), `review-2026-09-13` auf `9305d7b`, dem Stand des zehnten
Reviews (`main` nach PR #36 mit dem Auftrag), `review-2026-09-12` auf `7568803`, dem Stand des
neunten Reviews (`main` nach PR #29 plus der Nachtrag und der Auftrag aus PR #30),
`review-2026-09-11` auf `59de3a5`, dem Stand des achten
Reviews (`main` nach PR #27 plus die Variablensuche aus PR #28), `review-2026-09-10` auf `b1cf5bd`,
`main` nach PR #25, `review-2026-09-09` auf `c6da3d9` („Der Auftrag für das sechste Review“),
`review-2026-09-08` auf `0c76d6e`, `review-2026-09-07` auf `1994811`, dem letzten Merge vor den
Fixes des vierten Reviews, und `review-2026-09-06` auf `1bd69dc`; Letzterer war einmal 67 Commits
früher auf `0b0fb96` gesetzt und wurde verschoben, weil jener Stand gemessen, aber nicht gelesen
war.

**`review-2026-09-16` ist die Ausnahme von dieser Regel, und sie hat eine Lücke hinterlassen.** Der
Tag sitzt auf `dbcefc1`, dem `main`, von dem die vierzehn Beta-2-Branches abzweigen — nicht auf
einem Stand, den ein Review gelesen hat. Zwischen `review-2026-09-14` und ihm liegen 16 Commits,
die kein Review dieser Zählung gelesen hat: die zwölf Fixes des elften Reviews (`6ea83fc`), die
Arbeit an der Beispielvorlage danach, die zwei Dokumente der fünfzehnten Runde und die
x64-Benennung der macOS-Pakete — im App-Code 5 Dateien, +174/−55 (`shared/gridFrameCss.ts`,
`Styles/CustomCss.tsx`, `Styles/variableGraph.ts`, `Styles/Basics.tsx`, `Plugins/Installed.tsx`),
dazu `electron-builder.yml` und in `scripts/` +1298/−140. Die fünfzehnte Runde hat davon nur
`fe2b701` und `9592121` gelesen. Der Auftrag für das dreizehnte Review nimmt den Bereich deshalb
ausdrücklich mit, und es hat ihn gelesen: die Lücke ist geschlossen, drei seiner vier Befunde
betreffen sie nicht, der vierte ist ein Kommentar in `shared/gridFrameCss.ts`. `review-2026-09-16`
bleibt, wo er ist, weil der Auftrag des zwölften Reviews mit ihm rechnet.

**Die sieben Fixes des einundzwanzigsten Reviews, die sechs Punkte seiner Nebenbei-Liste und der
neunte Fix aus den echten Läufen danach liegen bewusst dahinter** (`fix/review-2026-09-25`, von `main` abgezweigt): ohne Review-Dokument
18 Dateien, +622/−104, im App-Code 13 Dateien, +345/−86 — nachgerechnet gegen den Commit, der diese
Zeilen trägt. Gemessen an
**Attrappen, nicht an einem echten Lauf**: `runCoreUpdate` und `abortCoreMerge` als esbuild-Bündel
in zwei Fassungen (dieser Stand und `main`, letzterer aus `git archive`) gegen ein lokales
Upstream-Repo mit den Ständen A/D/E, npm in drei Betriebsarten (schreibt, scheitert, schreibt
nichts) und einem npx, das 0 antwortet, je Szene ein eigenes Bare-Repo und ein frischer Klon —
**h1** (npm scheitert zweimal, dritter Lauf), **h2** (ein eigener Commit zwischen zwei Läufen),
**h5a/h5b/h5c** (uncommittete Paketeinträge, ein uncommitteter `scripts`-Eintrag, dasselbe mit
einem npm, das nichts schreibt), **h6** (Konflikt in `package.json` neben einem zweiten,
Terminal-Abbruch), **h7/h7b/h7c** (ein eigener Stash des Nutzers darüber, zwei Einträge der App,
ein Eintrag, der auf HEAD passt), **h10** (der fortsetzende Lauf, D und E), **h11** (eine Notiz im
alten Format), **s4** (beide Lagen), **norm** (der gewöhnliche Weg, D und E) — jede alt gegen neu.
Dazu `readConfig` gegen zehn Dateien und `writeConfig` gegen fünf davon, `duplicateProject` gegen
drei Quellen, und die Prüfskripte (`typecheck`, `build`, `smoke` mit 42 Aufrufen, `check:i18n` mit
1111 + 178 Schlüsseln, `check:handbook` mit 26 Zitaten). Die größten Eingriffe sind das dritte Feld
der Notiz (`filesAtHead`) samt dem Wächter vor dem Amend, `carried` ohne SHA-Bindung,
`coreUpdateStashEntry`, die drei neuen Würfe in `readConfig` und das `w-fit` am Drag-Chip. Neu sind
vier Texte in `electron/main/i18n.ts` (`configNotParseable`, `configPluginsNotAList`,
`configMissing`, `duplicateSourceConfigUnreadable`) und zwei im Renderer (`dnd.backHome`,
`styles.loadFailed`), geändert zwei (`updateStashLeftover`, `updateStashFitsHead`, beide mit
`{{entry}}`), entfallen einer (`configEditor.loadErrorHint`), dazu acht Nachträge in
`docs/decisions/`. Dazu die sechs Punkte der Nebenbei-Liste (unten), gemessen an **der gebauten
App mit echten Tastendrücken** — Wegwerf-Profil und Projektkopie im Scratchpad, `colorscheme
none`, eine Kopie des Treibers mit `--user-data-dir` (im Repo liegt keine): Layout-Board und
Frame-Builder je waagerecht und senkrecht, vorher und nachher, dazu die Konfigurations- und die
Stile-Seite gegen eine fehlende und eine syntaktisch kaputte `quartz.config.yaml`. **Und
nachgeholt: drei echte Läufe** gegen `github.com/jackyzha0/quartz` mit echtem `git fetch`, echtem
npm und durch die gebaute App, je eine `cp -Rc`-Kopie von `navigations-testprojekt` auf `f1fba3f`
zurückgesetzt — zwei Fehlschläge samt Fortsetzung (die Notiz hält ihre Liste, der `resuming`-Amend
läuft), uncommittete Paketzeilen bei sauberem Merge (sie bleiben uncommittet) und die Gegenprobe
mit committeten Dateien (der Amend läuft). **Ein neunter Fix ist dabei entstanden**: Eine
Nutzeränderung *zwischen* zwei Läufen landete im Merge-Commit, weil die Notiz nur den Lauf
beschreibt, der sie schrieb; der fortsetzende Lauf misst jetzt selbst mit (drei weitere echte
Läufe, R4/R5/R6). **Und danach die sieben Punkte, die der Auftrag als offen führte** — fünf mit
einem Fix (der `.gitignore`-Kommentar in der Sprache der App; `writeConfig` mit denselben zwei
Fragen wie das Lesen, denn „nicht erreichbar“ war falsch; der Abbruch nennt den Stash, den sein
Pop freilegt, *und* den vorgemerkten Edit, den er wegwirft; ein Ablegen ohne Bewegung sagt das),
zwei mit einer Messung (die Notiz im Duplikat; der fremde Worktree). **Nicht gemessen**: die gepackte App, die VMs, ERESOLVE, ein echter Push unter
Git-Sync, und der Maus-Drag mit dem schmalen Chip (der Zeiger entscheidet dort, nicht das
Rechteck). Sie gehören damit in den Diff des nächsten Auftrags.

**Die sechs Punkte seiner Nebenbei-Liste sind mit abgearbeitet**, und einer war größer als sein
Platz: **Das gezogene Rechteck im Frame-Builder war nie das, was gezogen wurde.** dnd-kit gibt dem
`DragOverlay` die Größe des gezogenen Knotens und misst dann dessen einziges Kind — ein
Block-`div`, also 1060 px breit —, und der Pfeil-Getter zentriert *dieses* Rechteck auf der
Zielzelle: für Spalte 2 eine linke Kante bei −70, worauf der `KeyboardSensor` scrollt statt zu
bewegen. Der erste ArrowRight aus `header` sprang deshalb auf Spalte 7. Ein Versuch, das im Getter
zu beheben, machte es schlimmer (der Druck bewegte dann gar nichts); behoben ist es an der Stelle,
an der die Zahl entsteht — `w-fit` am Chip. Dazu: der Schritt zurück auf den eigenen Platz wird
angesagt (`dnd.backHome`, gefragt am Namen statt an der Id, plus ein Guard für die *erste* Meldung
eines jeden Drags, die sonst das „aufgenommen“ übertönt); `atomicWrite` fragt `doc.errors`, statt
ein `parseDocument` zu rufen, das nie wirft; der Rat „Existiert die Datei im Projektordner?“ steht
nur noch dort, wo die Datei fehlen kann (`configMissing` im Hauptprozess, Nachsatz im Renderer
weg); und die Stile-Seite hat einen Fehlerzustand statt eines ewigen „Lade…“. **Der sechste ist
kein Fehler:** Dass die App in einem Projekt ohne `.gitignore` eine anlegt, ist die Entscheidung
aus `projectDirs.ts` — `.quartz-gui/` liegt im Repo des Nutzers, und `quartz sync` pusht alles. In
einem echten Quartz-Projekt gibt es die Datei längst und die App hängt eine Zeile an; nur die
Attrappen-Szenen dieser Runde haben keine. Dabei aufgefallen und **nicht** mit erledigt: Der
Kommentar, den die App in diese Datei schreibt, ist auch in einer englischen Installation
deutsch.

**Die fünf Fixes des zwanzigsten Reviews und die vier aus seiner Nebenbei-Liste liegen bewusst
dahinter** (`fix/review-2026-09-24`, von `main` abgezweigt, seit dem 2026-09-17 als Fast-Forward
darin und am 2026-09-17 mit den 38 Commits davor nach `origin/main` gepusht): ohne Review-Dokument
9 Dateien, +557/−73, im App-Code 4 Dateien, +250/−62 — nachgerechnet gegen den Commit, der diese
Zeilen trägt, nicht gegen den davor. Gemessen an drei Wegen: `runCoreUpdate` und
`abortCoreMerge` als esbuild-Bündel in zwei Fassungen gegen ein lokales Upstream-Repo mit den
Ständen A/B/D/E (A = Ausgangsstand, B = Paketversionen gehoben, D = nur `quartz/index.ts`,
E = beides), npm- und npx-Attrappen, je Szene ein frischer Klon — a4 (die gestagete Fremddatei
zwischen zwei Läufen), a7/a7f und ein vorspulbarer Klon (die zwei Antworten auf den sauberen
Merge), zwei Klone mit Push per Remote-Name und per URL, s3 und s4 in je zwei Lagen (gestaget und
ungestaget, Upstream D und E), n7h/n7b und die fünf Gegenproben a1/a5/a6/a7f/norm in beiden
Fassungen; dazu git allein für `--amend --only` an einem Merge-Commit, bei unveränderten Pfaden
und mitten in einem Merge. Und die Prüfskripte (`typecheck`, `build`, `smoke` mit 42 Aufrufen,
`check:i18n` mit 1111 + 174 Schlüsseln, `check:core-update`, `check:semver`,
`check:plugin-names`, `check:handbook`) — alle grün. Vierter Weg, und der einzige ohne Attrappen:
**ein echtes Core-Update** an einer `cp -Rc`-Kopie von `navigations-testprojekt`, künstlich sieben
Commits hinter `jackyzha0/quartz` gesetzt (`git reset --hard f1fba3f`, eigene Theme-Pakete wieder
eingetragen), mit echtem `git fetch`, echtem npm und der gebauten App über
`updates.runCoreUpdate` — in sechs Läufen: Fast-Forward, Konflikt-Merge, npm scheitert an einem
Paket, das es nicht gibt (E404), npm scheitert an `node_modules` auf 555 (EACCES) mit Fortsetzung
danach, dieselbe Lage gegen die alte Fassung, und eine Notiz im alten Format. Dazu ein Restore auf
den Punkt vor dem gescheiterten Lauf. Dritter Weg für die Nebenbei-Punkte: **die
gebaute App** mit Wegwerf-Profil (`--user-data-dir` in einer Kopie des Treibers, danach gelöscht)
gegen eine `cp -Rc`-Kopie von `navigations-testprojekt`, `colorscheme none`, echte Tastendrücke im
Frame-Builder und am Layout-Board, vorher und nachher, bei gesetztem `main.scrollTop` 0 und 280 —
dazu eine Sonde im Getter, die die Kandidaten und ihre Punktzahlen mitschreibt und für die Messung
wieder entfernt wurde. Die größten Eingriffe sind das `--only` am Amend,
`abortOutcomeForStash()` mit drei statt zwei Antworten, die zweite Tür zu `ourMergeCommit` und die
zwei Zeilen in `utils/dndKeyboard.ts`. Neu sind drei Texte in `i18n.ts`
(`updateStashMineBlocked`, `updateStashFitsHead`, `configNotAMapping`), dazu sieben Nachträge in
`docs/decisions/` — der letzte über das erste echte Core-Update und den Befund daraus (die Notiz
trägt jetzt auch die Paketliste). Nicht gemessen: die gepackte App, ein echter Push zu
GitHub, die VMs, die Notiz über einen Restore oder ein Duplikat hinweg, was echtes npm bei
ERESOLVE oder `--save-prod` auf einen fremden Abschnitt tut. Sie gehören damit in den Diff des
nächsten Auftrags. **Die Frage nach den 26,5 px ist beantwortet** (einundzwanzigstes Review; hier
gegen `@dnd-kit/core` 6.3.1 und den `DragOverlay` im Frame-Builder *nachgelesen*, nicht noch einmal
gemessen): `draggingNodeRect` ist `dragOverlay.rect` (`core.esm.js:2948`), und
`getMeasurableNode()` (Zeile 2413) vermisst das *einzige Kind* des Overlays, sobald der Knoten nur
eines hat — im Frame-Builder den Chip mit dem Bereichsnamen (`px-2 py-1 text-micro`, also 16,5 px
Zeile + 8 px Polster + 2 px Rand), nicht die 48 px hohe Box; am
Layout-Board die eingeklappte `ItemCard` mit 38,5 px. Die Messung war also richtig, und für die
Maus ändert sie nichts: `pointerWithin` entscheidet, solange der Zeiger über einem Ziel steht.

**Die sieben Fixes des neunzehnten Reviews liegen bewusst dahinter** (`fix/review-2026-09-23`, von
`fix/review-2026-09-22` abgezweigt, danach als Fast-Forward nach `main`, seit dem 2026-09-17
gepusht): ohne
Review-Dokument 9
Dateien, +264/−32, im App-Code 6 Dateien, +169/−27. Gemessen an drei Wegen: `updateService` und
`duplicateService` als esbuild-Bündel in zwei Fassungen gegen ein lokales Upstream-Repo mit den
Ständen A/B/D/E, npm- und npx-Attrappen (darunter ein `npm`, das mit 1 antwortet, und ein `npx`,
das `.quartz-gui` beim Bauen selbst auf 555 setzt), je Szene ein frischer Klon — n1 und n1b (die
zwei Türen der Notiz), n7/n7h/n7b (der Satz über den liegengebliebenen Stash in drei Lagen), n10
und n10p (der Amend, mit und ohne gepushten Merge-Commit), n4 (das Duplikat), „norm“ als
Gegenprobe; die gebaute App mit Wegwerf-Profil gegen eine `cp -Rc`-Kopie von
`navigations-testprojekt`, echte Tastendrücke am Layout-Board, vorher und nachher, je frischer Bau
— Karte, Fokus, Live-Region, Kartenhöhe, Zonen-Geometrie, dazu dieselbe Maus-Geste in beiden
Fassungen; und die Prüfskripte (`typecheck`, `build`, `smoke` mit 42 Aufrufen, `check:i18n` mit
1111 + 171 Schlüsseln, `check:core-update`, `check:semver`, `check:plugin-names`,
`check:handbook`). Die größten Eingriffe sind `abortWouldFreeStashedFiles()`, der `resuming`-Zweig
des Amends samt `headSubject()`/`headIsPushed()` und `installPendingFor()`, das jetzt den SHA
zurückgibt. Neu ist ein Text in `i18n.ts` (`updateNoteUnwritable`), dazu drei Absätze in
`docs/decisions/snapshots-and-updates.md` und einer in `layout-frames.md`. Nicht gemessen: die
gepackte App, ein echtes `npm install`, die VMs, ein echter Push unter Git-Sync (die Gegenprobe
n10p setzt `refs/remotes/origin/local` von Hand), und der Frame-Builder. Sie gehören damit in den
Diff des nächsten Auftrags.

**Die sieben Fixes des achtzehnten Reviews hat das neunzehnte gelesen** (`fix/review-2026-09-22`, von
`main` abgezweigt, seit dem 2026-09-16 darin und seit dem 2026-09-17 gepusht): ohne
Review-Dokument 8 Dateien,
+300/−81, im
App-Code 3 Dateien, +168/−44. Gemessen an fünf Wegen: `runCoreUpdate` und `abortCoreMerge` als
esbuild-Bündel in zwei Fassungen (`af1ffed` und hier) gegen ein lokales Upstream-Repo mit den
Ständen A/B/C, npm- und npx-Attrappen, je Szene ein frischer Klon — x1 (npm scheitert, dann
„erneut“), x2/x2s (veralteter Stash, ungestaget und gestaget), x2h (Gegenprobe: HEAD = Stash-Basis),
x7 (zwei Stashes übereinander), „up“ und „norm“ als Gegenproben des gewöhnlichen Wegs; die gebaute
App mit Wegwerf-Profil gegen eine `cp -Rc`-Kopie von `navigations-testprojekt`, echte Tastendrücke
am Layout-Board, vorher und nachher, aus der Palette und aus dem Board, bei `scrollTop` 0 und 280,
mit und ohne Roller; das ausgelieferte Handbuch-PDF gegen `pdfinfo`; `git log --date=short` für die
Daten; und die Prüfskripte (`typecheck`, `check:i18n` mit 1111 + 170 Schlüsseln, `smoke` zum ersten
Mal ohne Auffälligkeit). Die größten Eingriffe sind die Notiz `.quartz-gui/core-update.json` samt
der umgedrehten Leserichtung, `stashBase()` und der Wegfall beider Rückfall-Pops, die Sensoren des
`GlobalBoard` und der `overflow-x-auto` am Board. Neu ist ein Text in `i18n.ts`
(`updateStashMine`), geändert einer (`updateStashLeftover`), dazu fünf Absätze in
`docs/decisions/`. Nicht gemessen: die gepackte App, ein echtes `npm install`, die VMs, der
Frame-Builder mit dem neuen Roller daneben, und die Notiz über einen Restore oder ein Duplikat
hinweg. Das neunzehnte Review fand darin keine Regression; zwei seiner sieben Befunde schärfen
die Sensoren des Boards nach (der fehlende Guard an der Karte, der fehlende `setActivatorNodeRef`),
drei die Notiz und den Stash, zwei sind Sätze.

**Die acht Fixes des siebzehnten Reviews hat das achtzehnte gelesen** (`fix/review-2026-09-20`,
auf `4d2b50d` = `review-2026-09-22`, inzwischen in `main`). Sie sind
gemessen, und von niemandem sonst gelesen. Der Messweg für die Update-Befunde ist der des
Vorgängers, um einen vierten Upstream-Stand und ein zweites Bündel erweitert: zwei Fassungen von
`updateService` als esbuild-Bündel gegen ein lokales Repo mit den Ständen A/B/B2/C/D, npm- und
npx-Attrappen, je Szene ein frischer Klon — s2b (der veraltete Stash), s5 (Index ≠ Arbeitsbereich),
s4 und s13 (die zwei stummen Ausgänge), dazu s1, s8, s11 und s14 als Gegenprobe in beiden
Fassungen. `git stash push` allein in vier Ausgangslagen. `startedAt` an einem Bündel von
`buildService` mit einer npx-Attrappe. Die Knöpfe der Übersicht an der gebauten App mit
Wegwerf-Profil gegen eine `cp -Rc`-Kopie von `navigations-testprojekt`, vorher und nachher. Das
PDF an einem echten Lauf gegen `pdfinfo`. Die größten Eingriffe sind die SHA am Stash samt dem
`MERGE_HEAD`-Blick in `abortCoreMerge`, der Index-Wächter `stagedApartFromWorkingTree()`, der
`withBusy`-freie Serverteil der Übersicht und `pdfPageCount()`. Neu sind drei Texte in `i18n.ts`
(`updateStashLeftover`, `updateStashPopFailed`, `updateAbortBlockedByEdit`) und sieben Absätze in
`docs/decisions/`. **Dahinter liegen fünf weitere Commits vom 2026-09-16**, die aus der Liste
„Nebenbei aufgefallen“ desselben Reviews kommen: der Absatz, warum das Layout-Board seitwärts rollt
und was ein Roller darum kostet (mit einem Kommentar an der `sideways`-Prüfung in `smoke.mjs`),
drei neue Fälle in `check:core-update`, `git stash pop --index` an beiden Pop-Stellen, die
Abkürzung bei „Already up to date“, und ein Kommentar, der festhält, dass die `planApplies`-Klausel
am `upstreamWins`-Satz zu Recht dort steht. Nicht gemessen: die gepackte App, ein echtes
`npm install`, die VMs. Dazu kommt
zwei Commits im Handbuch-Vault, die nicht in diesem Repo liegen: `5d3af49` (der Halbsatz in 8.5,
beide Sprachen) und `b53a6c1`, das gereworde `b61a08d` — sein Baum ist unverändert, nur die
Nachricht sagt jetzt den Schnellpfad statt der Zeile 183. Beides ist gepusht, wie `main` dieses
Repos. Sie gehören damit in den Diff des nächsten Auftrags.

**Die sieben Fixes des fünfzehnten Reviews liegen bewusst dahinter** (`fix/review-2026-09-18`,
`12dd7d9..b25f61b`, dazu `311f929` im Handbuch-Vault). Gemessen: das Demo-Skript an einer
`cp -Rc`-Kopie des Handbuch-Projekts über `QUARTZCONTROL_PROJECT_ROOT` mit einem echten Ziel
gleichen Namens — vorher überschrieben, nachher byte-gleich in fünf Fällen, darunter `--only` ohne
Treffer und SIGINT mitten in der Aufnahme; der Ersatz für `globby` wörtlich herausgeschnitten gegen
Quartz' `globby` unter Electrons Node 24.18.1 und Node 26.5.1, 63 Muster, vorher 22 Abweichungen,
nachher 7; `--check-sync` gleich, mit einem angehängten Byte und gegen eine 404-Adresse; die
Skill-Meldungen ohne Obsidian; die Konsolenmeldung an einem Projekt ohne `node_modules` über `npx`.
Nicht neu gemessen: die gepackte App (die zwei App-Änderungen sind eine Zeile im Ersatz und
Kommentare). Die größten Eingriffe sind `lendProjectTargets()`, das über `process.on('exit')` in
ein echtes Projekt zurückschreibt, und `posix.normalize` im Ersatz. Neu ist `docs/release.md`. Sie
gehören damit in den Diff des nächsten Auftrags. Die drei Demo-Ziele früherer Läufe sind aus dem
echten Handbuch-Projekt entfernt (die Datei trug seit ihrem ersten Snapshot am 2026-09-07 nichts
anderes, und keine andere Datei nannte ihre IDs). Nebenbei gefunden und in `77433ac` behoben: Die
Bridge des Skills `projekt-dokumentieren` prüft vor dem ersten CLI-Aufruf, ob die CLI den
konfigurierten Vault trifft — die CLI meldet einen unbekannten mit Exit 0.

**Die vier Fixes des vierzehnten Reviews hat das fünfzehnte gelesen** (`fix/review-2026-09-18`, von
`fix/review-2026-09-17` abgezweigt), und mit ihnen der Merge von `feat/beispielvorlage-und-header`
(`962f079`: README zu Beta 1, Handbuch-Zahlen und tar-Anleitung, der Skill
`projekt-dokumentieren`, zwei gesicherte `.qtpl` und `minimal-lesbar.qtpl` vom 2026-09-10), und
danach die mitgelieferte Vorlage neu exportiert (Phasen 3–11, Gegenprobe grün; neu sind nur die
zwei Schnipsel aus `9592121`).
Gemessen: `beforePack` mit `electron-builder --dir` in drei Läufen (ohne Projekt Exit 1 und kein
Paket, mit Flag ein Paket ohne Handbuch, normal 457 Dateien im `.app`); `check:i18n` mit zwei
angehängten Aufrufen als Gegenprobe; der Ersatz für `globby` herausgeschnitten gegen Quartz'
`globby` mit 31 Mustern (8 Abweichungen bleiben, im Kommentar benannt) und an der gebauten App mit
drei Wegwerf-Projekten — ohne `node_modules`, mit echtem, mit kaputtem `globby`. Nicht neu gemessen
ist die gepackte App. Der vierte ist Dokumentation: die Vertrauensgrenze in
`process-model-and-ipc.md`, zwei Aussagen darin nur gelesen und so gekennzeichnet. Die größten
Eingriffe waren `listSource` im Vertrag von `content.createIndex` und der Abbruch in `beforePack`,
der jede Baumaschine ohne Handbuch-Projekt und ohne `QUARTZCONTROL_HANDBOOK_SITE` betrifft. Das
fünfzehnte Review fand darin keine Regression; Befund 2 schärft den Ersatz nach, Befund 7 und der
Halbsatz im `dist`-Eintrag den Weg für die VMs, Befund 1 den Fix am Demo-Skript aus derselben
Runde.

**Die vier Fixes des dreizehnten Reviews hat das vierzehnte gelesen** (`fix/review-2026-09-17`, von
`fix/review-2026-09-16` abgezweigt) — ohne Regression; Befund 1 schärft Fix 1 nach (der stille
Ersatz), Befund 3 Fix 3 (die Zählung). Gemessen: die Startseiten-Liste an einem esbuild-Bündel von
`contentService` gegen `globby` aus `gui-test/node_modules` (26 Muster, über `globby` 0
Abweichungen, im Ersatz ohne `node_modules` eine, `{x,y}`; `.gitignore` im Vault und im Projekt mit
und ohne git) und an der gebauten App; der Hinweis am dunklen Bild an der gebauten App mit
Wegwerf-Profil in vier Fällen vorher und nachher; `check:i18n` mit einer Gegenprobe aus vier
gelöschten Schlüsseln. Der vierte ist nur Kommentar. Der größte Eingriff ist der dynamische Import
von `globby` aus dem Projekt im Hauptprozess — nach `sass` in `styleService` der zweite Ort, an dem
die App zur Laufzeit Code aus dem `node_modules` eines Nutzerprojekts in sich selbst lädt, und der
erste als ES-Modul.

**Die neun Fixes des zwölften Reviews hat das dreizehnte gelesen** (`fix/review-2026-09-16`, von
`review/beta2` abgezweigt) — ohne Regression; zwei seiner Befunde schärfen Fix 7 und Fix 9 nach.
Sie waren gemessen, fast alle an der gebauten App mit Wegwerf-Profil
gegen eine Kopie von `gui-test` mit Dev-Server auf 8099/3099: die Neubauten mit mitgeschriebenen
Ereignissen im Renderer, „Rebuild failed“ über zwei von Hand an die Server-Logs gehängte Zeilen
(echt ausgelöst wird der Weg nur von einem Emitter, der außerhalb von `trace()` wirft), der
Beitritt mit drei gleichzeitigen `build.run`, der Fokus mit dem Messskript des Reviews, die
Ignore-Muster zusätzlich gegen Quartz' eigenes `globby`, die Bildnormalisierung als reiner Umbau
über SHA-256 der Ergebnisdateien vorher und nachher, die Helper-Suche alt gegen neu an neun Pfaden.
Nur gelesen ist der sechste (electron-builders Quelle, nicht mit eingeschalteter Hardened Runtime
gemessen). Die größten Eingriffe sind `followQuartzOutput(…, source)` samt den zwei Neubauten,
`joinRunningBuild()` und `shared/macNodeBinary.ts`, das `check:runtime` jetzt lädt.

**Die zwölf Fixes des elften Reviews hat das dreizehnte gelesen** — das zwölfte nicht, weil sein
Ausgangsstand hinter ihnen lag (oben). Ohne Befund außer dem Kommentar über die Auslassungen; neu
gemessen hat es davon den Kompat-Block in Firefox und WebKit bei 750, 850 und 950 px ohne das
Explorer-Stylesheet der Vorlage und den Farbparser mit 15 Schreibweisen. Sie waren gemessen, und
zum ersten Mal in dieser Serie an einer *neu gebauten* Website: die Kompat-Blöcke in Firefox und WebKit bei
390, 750, 850, 1300 px, mit und ohne JavaScript, die Schublade unter einem Wheel; die zwei
Speichern-Wege und der Drag an der gebauten App mit Wegwerf-Profil; der Farbparser an einer
Canvas-Probe in diesem Electron; die Palette an `--check-contrast` (93 Paare, 0 darunter). Der
Eingriff mit der größten Reichweite ist der `@layer quartz-base` um die zwei Kompat-Blöcke — er
gibt jedem Projekt seine Stylesheets über den Explorer zurück. Der zweite ist das Speichern auf
*Eigenes CSS*, das jetzt alle Entwürfe schreibt. Neu daneben: `--check-sync`.

**Die sieben Fixes des zehnten Reviews hat das elfte gelesen** — ohne Befund; die zwei Regressionen,
die es fand, stammen aus `8c43dcc`, nicht aus diesen Fixes. Neu gemessen hat es davon nichts: Die
Fixes 2, 3, 6 und 7 sind Kommentare und der Einschluss-Wächter in `takeHandbook()`, dessen zwei
Richtungen es gelesen und für richtig befunden hat (`docs/REVIEW-2026-09-14.md`, „Die erste
Hälfte“). Gemessen waren sie vorher an electron-builders eigener Zielrechnung, an sechs
Wegwerf-Verzeichnissen, an der gebauten App in einem erzwungenen Zustand ohne Schlüsselbund, an
sechs Läufen einer Skriptkopie und an `lsregister` und `~/Library/Preferences` dieses Rechners.

**Die fünf Fixes des neunten Reviews hat das zehnte gelesen** — ohne Regression, zum ersten Mal in
vier Runden. Die dritte Fassung des Tastatur-Guards liegt richtig (`e.target === e.currentTarget`
am Kasten), und das Muster steht an keiner der drei anderen `@dnd-kit`-Stellen. Gemessen waren sie
vorher und nachher an der gebauten App mit echten Tastendrücken, an einem Testprojekt mit einem
toten Ausschluss und an einem esbuild-Bündel des Hauptprozesses.

**Die acht Fixes des achten Reviews hat das neunte gelesen** — mit dem Ergebnis, dass einer davon
eine Regression war (der Tastatur-Guard, oben). Gemessen waren sie am echten Build eines Klons des
Beispielprojekts und an der gebauten App in einem Wegwerf-Profil (darunter ein echter Import eines
von Hand gebauten `.qtpl`). Die größten Eingriffe waren `countsFit` samt der Rückfall-Meldung, die
sagt, was eine Kandidatin ausgeschlossen hat, die Platzierung, die die Ablage jetzt durchreicht,
der Tastatur-Guard am Bereichsformular, der sechste zod-Code samt Kappung je Pfadsegment und der
Filter für tote Ausschlüsse in `update`.

**Die acht Fixes des siebten Reviews liegen bewusst dahinter** (PR #26, 22 Dateien, +1200/−93).
Sie sind gemessen, die meisten am echten Build oder an der gebauten App, und von niemandem sonst
gelesen — die größten Eingriffe sind der zweite Durchgang in `pickGroupOrder`, der Frame-Name als
Pflichtargument der Kandidatenrechnung, `shared/quartzPluginName.ts` samt
`npm run check:plugin-names` und der dritte Wert in `LogLine.stream`. Sie gehören damit in den
Diff des nächsten Auftrags.

Dasselbe galt zwei Runden vorher für die acht Fixes des fünften Reviews — der Handbuch-Server (ein
neuer Dienst im Hauptprozess, ein `will-quit`-Haken, `openExternal` statt `openPath`), die dritte
Antwort `'partial'` im Vertrag der Server-Suche und ein `/proc`-Weg, den diese Maschine nicht
messen kann — und eine Runde davor für die acht des vierten: den Dateinamen des Server-Logs pro
Lauf und die Server-Erkennung, die einen Vorgabeport nur nimmt, wenn der Prozess ihn hält. Die
Kette ist Absicht: Jede Runde liest, was die vorige gebaut hat.

Von dem, was beide Reviews als „beiläufig, kein sed“ führen, sind die Farbpaare am 2026-09-05
abgearbeitet, soweit sie eine Umbenennung waren: 322 Paare, die wörtlich das Token buchstabierten,
plus sechs Stellen ohne `dark:`-Partner (3,50:1 im Dunkeln) und dreizehn Micro-Labels, die in
Großbuchstaben zwei verschiedene Dunkel-Werte für dieselbe Rolle hatten. Gemessen mit
`scripts/styles-snapshot.mjs`: von 13543 Elementen blieben 13152 unverändert, im Hellen kein
einziges anders.

Im zweiten Durchgang am selben Tag die **Hover-Zustände**: 31 Stellen sprachen dieselbe Geste in
fünf verschiedenen Paaren aus, obwohl `hover:text-text` und `hover:bg-ink/…` im Code schon standen —
in `ui.tsx` und, für einen von drei identischen Ziehgriffen, in `Plugins/Installed.tsx`. Jetzt
sagen alle dasselbe. Gemessen mit `--hover`: der Ruhezustand blieb an allen 13543 Elementen
unverändert, im Hover änderten sich 51. Dabei kam ein Fehler heraus, den niemand gesehen hatte:
zwei Ziehgriffe hatten `hover:border-black/20` ohne `dark:`-Partner, ihr Rand wurde im Dunkelmodus
also **schwarz** — auf dunklem Grund unsichtbar. Mit dem Token ist er Weiß.

Im dritten Durchgang die Ränder und Flächen: 164 Klassen schrieben aus, wofür es `--ink` gibt
(`border-black/[0.06] dark:border-white/10`), dazu neun `bg-white`, hinter denen eine `dark:`-Klasse
stand und die damit wörtlich `--surface` sind. Vorher geprüft statt angenommen: **jede** der 75
`…-black/α`-Klassen hatte einen `dark:`-Partner derselben Eigenschaft, die schwarze Hälfte malt also
nur im Hellen und der Tausch kann sie nicht ändern. Gemessen: kein einziges Pixel, in Ruhe wie im
Hover. Danach 19 Stellen, an denen der Wert zwischen zwei Tokens lag und eine Rolle zu wählen war —
Überschrift, Wert und Variablenname auf `--text`, Fließtext der Übersicht auf `--text-secondary`,
zwei zu blasse Stellen ohne `dark:`-Partner auf `--text-muted`. 44 Elemente ändern sich dabei, alle
benannt im Commit.

Was bewusst Palette bleibt: die immer dunklen Konsolenflächen (`bg-slate-950` und der Text darauf —
eine Fläche, die in beiden Schemata dunkel ist, bekommt weder `dark:` noch Token), die Statusfarben,
und sieben strukturelle
Grautöne, für die es keine Rolle gibt: der Fortschrittsbalken, der Rahmen einer Karte, die Fläche
eines Hinweiskastens.

Die **Seitenleiste** ist am 2026-09-06 nachgezogen, und zwar auf `--text`, nicht auf
`--text-secondary`: die Gruppenüberschriften darüber (`EINRICHTUNG`, `GESTALTUNG`, …) sind bereits
secondary, ein Eintrag auf demselben Wert wöge also so viel wie seine eigene Überschrift. Mit
`--text` liest sich die Leiste als das, was sie ist — Überschrift schwächer, Eintrag stärker,
aktiver Eintrag weiß auf Blau. Gemessen auf dem Grund der Leiste: 9,10:1 → 15,69:1 im Hellen und
12,43:1 → 13,99:1 im Dunkeln, 1067 Elemente pro Schema. Die Größen-Tokens sind am 2026-09-06 nachgezogen: 129 Stellen
(83× `text-[11px]`, 46× `text-[13px]`) tragen jetzt `text-micro` bzw. `text-ui`, gemessen ohne jede
Änderung an Schriftgröße, Zeilenhöhe oder Farbe. Offen bleiben die 17 Ausreißer-Größen, die keinen
Namen haben — darunter dreimal 12,5px auf der Übersicht, der einzige Kandidat für einen vierten
Namen. Am 2026-09-06 nachgemessen und *nicht* umgestellt: die Übersicht hat fünf eigene Größen
(19/17/12,5/12/11,5px), das ist eine nach Augenmaß gesetzte Skala für einen Bildschirm und keine
Rolle; und die zwei Faktenzeilen auf `text-ui` zu heben (12,5 → 13px, 30 Elemente) ließ die Karte
„Kein Ziel“ eine Zeile mehr umbrechen — die halbe Pixel war genau dafür gewählt.

Die **Arbeitsregel** für die nächste Liste steht in `CLAUDE.md` und stand bis zum
fünfundzwanzigsten Review wortgleich auch hier — zwei Kopien, die auseinanderlaufen. Was sie
verlangt, in einem Satz: ein Befund pro Durchgang, mit Typcheck, Build, Smoke und eigenem Commit,
und was ein laufendes Programm beantworten muss, wird an der gebauten App gemessen.

Was aus dem 09-05-Durchgang als Regel hängengeblieben ist, steht jeweils oben im passenden Abschnitt:
ein Vorlagen-Paket ist keine Vertrauensgrenze; „die Datei ist da“ ist nicht „die Datei lässt sich
lesen“; eine Kopie erbt keinen Pfad, der in das Original zeigt; ein Symlink-Schutz, der nur das
oberste Verzeichnis prüft, prüft nichts.

Zwei Dinge waren dabei aufgefallen und bewusst nicht mit erledigt worden — **beide sind
inzwischen weg, nachgesehen am 2026-09-06:** `builtinTemplateAvailable()` gibt es in
`builtinTemplateService.ts` nicht mehr (im ganzen Baum kein Treffer außer diesem Absatz), und
`countFiles()` in `contentService.ts` folgt einem Link auf ein Verzeichnis inzwischen per `stat`
und steigt hinein, zählt ihn also nicht mehr als eine Datei. Beide fielen bei den Durchgängen
danach mit, ohne dass es jemand als eigenen Befund notiert hätte; hier steht es, weil ein
Absatz über offene Punkte, der zwei geschlossene führt, beim nächsten Lesen Arbeit erzeugt.

**Das dreiunddreißigste Review las beide Schichten** und fand **keinen Befund Hoch, vier Mittel,
neun Niedrig**, dazu sieben Punkte nebenbei — geschrieben von Claude Fable 5.1, gegen Commits und
Auftrag von Claude Opus 5, gemessen an sechs Wegen (Bündel von `fontService` mit ersetztem
`fetch`, dem echten Google, der gebauten App, der veröffentlichten Handbuch-Website, den neun
echten Projekten lesend, und Schicht 1 über einen Hilfsagenten mit einem aus der Quelle gebauten
git 2.37.0). **Nach fünf Runden ohne mittleren Befund ist das ein anderes Bild, und die Erklärung
steht im Dokument:** Zum ersten Mal lag kein Fix vor dem Leser, sondern eine Funktion, die nur ihr
Autor benutzt hatte — alle vier mittleren Befunde liegen auf Wegen, die er nicht gegangen ist.

Die vier Mittleren: Ein gespeicherter Entwurf in einem weiteren Stylesheet verschwand aus dem
Editor, und der nächste Tastendruck überschrieb ihn auf der Platte (1); ein veralteter
`custom.scss`-Entwurf wurde jetzt von *jedem* Reiter geschrieben, während das Band davor nur auf
einem steht — der gewöhnliche Weg dahin kostet die `@font-face`-Regel der gerade importierten
Schrift (2); der Vorlagen-Import streicht den `google-fonts`-Block, meldet Erfolg, und die Bau-Tür
sieht es nicht, weil sie am Block erkennt, ob es etwas zu tun gibt (3); und in acht der neun
Projekte dieses Rechners — allen aus der Beispielvorlage — ändert eine in „Basis“ gewählte Schrift
nichts an der Website, während die Seite 26 Dateien aus dem Netz holt und kein Wort dazu sagt (4).
Die neun Niedrigen: Google lässt eine unbekannte Familie still aus, und drei Sätze der App gehen
vom Gegenteil aus (5); „keine Regel nennt sie mehr“ fragte zwei flache Ordner und je Regel die
erste `url()` (6); ohne Netz sagte die Seite „TypeError: fetch failed“ (7); eine Grenze je Datei,
keine über alles, und ein unbekannter Dateiname blieb als Google-Adresse stehen (8); der Fix für
relative Schrift-URLs erreichte nur Projekte, in denen zufällig jemand schreibt — die
Handbuch-Website lud keine ihrer vier Schriften (9); die Notiz über entfernte Schriften drückte
den Seitenkopf auf 237 px und klebte an „Gespeichert.“, und ein Fehler kurz nach einem Erfolg wurde
vom Zwei-Sekunden-Timer gelöscht (10); unter einem git vor 2.38 schaltete sich `fe30ca4` still ab
(11); eine Datei *des Merges* mit eigener Vormerkung obenauf bekam einen Rat, dessen Preis niemand
nannte (12); und sechs Behauptungen, von denen vier nicht mehr trugen (13).

**Alle dreizehn sind abgearbeitet, dazu alle sieben Nebenbei-Punkte** — auf
`fix/review-2026-10-07`, je ein Commit mit Typcheck, Build und Smoke, von Claude Opus 5. Was dabei
an Messungen entstanden ist, steht in [`styles-and-fonts.md`](decisions/styles-and-fonts.md) und
[`snapshots-and-updates.md`](decisions/snapshots-and-updates.md), was als Regel bleibt, in
[`conventions.md`](conventions.md) — sechs neue, darunter „ein Rückruf, den ein Effekt bei jedem
Render neu setzt, ist nicht der Stand, den der Aufrufer meint“ und „wer fragt, ob etwas noch
gebraucht wird, sucht breit; wer löscht, löscht schmal“. Zwei Unterpunkte des dreizehnten Befunds
trugen nicht und sind stattdessen nachgeprüft: Der Kopfkommentar von `src/data/googleFonts.ts`
steht Zeile für Zeile in der Vorlage des Skripts und übersteht einen Lauf, und der Exit-Code eines
alten git für `merge-tree --write-tree` ändert am Code nichts, weil er den Hash prüft. Den
falschen Satz des Handbuchs (4.2, beide Sprachen) hat dieselbe Runde im Vault nachgezogen.

**Was das Review getrennt von den Befunden empfiehlt** — der Nutzer hat danach gefragt —, steht in
seinem letzten Abschnitt: aus *diesem* Stand keinen RC, aus dem Stand nach den Fixes zu 1 bis 4
schon; und als nächsten Schritt nicht Runde 34, sondern den Alpha-Test, an Projekten aus der
Beispielvorlage und mit einer gebauten Website am Ende jeder Szene, weil drei der vier mittleren
Befunde in der App unsichtbar und erst im Browser zu sehen sind.

**Das vierunddreißigste Review misst ab `review-2026-10-08`** und liest bis `review-2026-10-09`,
das auf dem Commit „Der Auftrag fuer das vierunddreissigste Review“ sitzt; der Auftrag steht in
[`docs/REVIEW-2026-10-08-auftrag.md`](REVIEW-2026-10-08-auftrag.md). **Es ist die erste Runde, von
der das vorige Review abgeraten hat** — es empfahl statt dessen den Alpha-Test; der Nutzer hat sie
trotzdem angefordert, und der Auftrag sagt an erster Stelle, dass sie damit eine andere Frage
stellt: nicht „finde das Nächste“, sondern „halten die zweiundzwanzig Fixes, die niemand gelesen
hat“. Zwei Schichten, und die zweite ist fast kein Code: die abgearbeitete dreiunddreißigste Runde
(23 Commits, davon 22 Fixes; 20 Dateien, +895/−127, davon Code 14 Dateien, +583/−108) und was
danach geschah (3 Commits — die Website veröffentlicht, die Google-Liste geholt, drei Sätze in
`docs/release.md` korrigiert; 3 Dateien, +1784/−1737, davon 1728 Zeilen umsortierte Namensliste). Als größtes Risiko
nennt der Auftrag `save()` in seinen drei Ausgängen und die Abbruch-Sätze in `updateService.ts`,
als schwächste Messung die Attrappe, die für Befund 11 an der Stelle eines echten alten git stand.
Geschrieben ist er von demselben Modell wie die Commits **und aus derselben Sitzung** — der
ungünstigste Fall für seine Zahlen, und er sagt das.

**Gelesen hat es Claude Fable 5.1, und es fand neun Befunde — zwei Mittel, sieben Niedrig, keinen
Hoch.** Von den zwanzig Fixes hielten achtzehn auf den Wegen, die das Review nachgefahren ist; die
zwei, die nicht halten, brechen aus demselben Grund wie in der Vorrunde: Der Weg, auf dem sie
brechen, ist einer, den die Messung in der Commit-Nachricht nicht gegangen ist. Bei Befund 1 war
das eine Pause vor dem Klick — ohne sie fällt der Editor weiter auf den alten Stand zurück, und
Weitertippen überschreibt das Gespeicherte; bei Befund 2 eine Messung, die nur lateinische Schriften
gesehen hatte, weshalb der Fix „ein unbrauchbarer Dateiname ist ein Fehler“ aus einem stillen
Fehler eine Sperre für jede japanische, koreanische und chinesische Familie machte. Die übrigen
sieben: der Verweigerungssatz der Vorrunde steht 1457 px breit im Statusplatz und ist vor der
Hälfte abgeschnitten, die den Weg nennt (3); eine gerade importierte Schrift bekommt „Google kennt
diese Schrift nicht — prüfe die Schreibweise“ (4); unter einem echten git 2.37 sagt *jeder* Abbruch
„ließ sich nicht prüfen“ (5); hängt die Antwort nach dem Kopf, kommt weiter der rohe englische Satz
(6); die breitere Suche folgt keinem Symlink und liest nur die erste `src:`-Deklaration (7); `noRule`
warnt vor einer Ersatzschrift, wo eine Systemschrift gewählt ist (8); und vier Sätze, die nicht mehr
tragen (9).

**Alle neun sind abgearbeitet, dazu alle vier Nebenbei-Punkte** — auf `fix/review-2026-10-08`, je
ein Commit mit Typcheck, Build und Smoke, von Claude Opus 5. Gemessen wurde auf denselben fünf
Wegen wie das Review, mit seinem Geschirr: die gebaute App, die Dienste als Bündel (alt gegen neu),
das echte Google, Electrons `net.fetch` und echte git-Repos unter 2.54.0 und dem aus der Quelle
gebauten 2.37.0. Drei Ränder kamen dabei dazu, die das Review nicht genannt hatte: ein
`custom/own.scss`, das ein Symlink ist, verlor seine Schrift schon vor der breiteren Suche; ein
`url("#{$f}/…")` ließ `FONT_FACE_RE` am Brace der Interpolation enden, sodass die Regel gar keine
`url()` hatte; und zwei gleichzeitige Läufe (Speichern und Bau-Tür) ließen sich *beide* scheitern,
einer mit `ENOENT` beim Umbenennen. Was als Regel bleibt, steht in
[`conventions.md`](conventions.md), die Messungen in
[`styles-and-fonts.md`](decisions/styles-and-fonts.md) und
[`snapshots-and-updates.md`](decisions/snapshots-and-updates.md).

**Seine Empfehlung hält das Review aufrecht**, und nennt diese Runde das Argument dafür: Sie hat
gefunden, was eine Runde dieser Art finden kann, und beide Wege sind solche, die ein Alpha-Test von
selbst geht. Gegen einen RC sprachen aus seiner Sicht Befund 2, mit Abstrichen Befund 1 und
mitzunehmen Befund 3 — alle drei sind behoben. Was danach offen bleibt, ist die Liste, die nur der
Nutzer abarbeiten kann (VoiceOver, die gepackte App je Plattform, glibc), und `dist`, das seit dem
Handbuch-Rückbau ungelaufen ist.

Die Szenen, die es dafür nennt, stehen seit dem 2026-09-20 als Checkliste in
[`alpha-test.md`](alpha-test.md), zusammen mit den zwei Vorgaben der Vorrunde und der Liste, die
danebensteht (VoiceOver, gepackte App je Plattform, glibc, die zwei offenen Punkte aus
`release.md`). Beim Schreiben fiel dabei ein Punkt auf, der zuerst nur gelesen war und dann auf
Wunsch des Nutzers an der gebauten App nachgemessen wurde: Der Bestätigungsdialog der Karte
„Ungenutzte Schriften“ nannte, wie viele Dateien *die Regeln dieser Familie* nennen — je Regel nur
die erste `url()` — und nicht, wie viele danach wirklich fehlen. Gemessen lag er in beide
Richtungen daneben (1 statt 0 und 1 statt 3, bei einer Kontrolle von 1/1). Behoben: Beide Seiten
fragen dieselbe Funktion, und „keine Datei“ hat einen eigenen Satz.

**Das fünfunddreißigste Review liest die Vorlagen-Runde** (`review-2026-10-09..review-2026-10-10`,
Auftrag [`REVIEW-2026-10-09-auftrag.md`](REVIEW-2026-10-09-auftrag.md), Dokument
[`REVIEW-2026-10-09.md`](REVIEW-2026-10-09.md), von Claude Fable 5.1). Ein Befund Hoch, vier Mittel,
neun Niedrig; der App-Code der Runde war unauffällig, das Gewicht lag bei dem, was draußen liegt, und
bei den Begründungen in den Kommentaren. **Abgearbeitet am 2026-09-21**, je Befund ein Commit mit
Typcheck, Build und Smoke, und alles, was veröffentlicht ist, danach an der echten Adresse
nachgemessen:

- **1 (Hoch):** Der Import der Doku-Pakete hatte vier Websites den Seitenleisten-Text genommen. Aus
  den Snapshots zurückgeholt und neu veröffentlicht; die Pakete tragen keine Schnipsel mehr.
- **2:** Die Seitenspalten schnitten jeden Fokusring an — auch die rechte, die das Review nicht
  gemessen hatte. Die Kante rückt um die Reichweite des Rings nach außen.
- **3:** Das Example-Handbuch beschreibt die Navigation, Noto Sans und 66 Variablen.
- **4, 5:** Gelöscht wird nur unter `werkstatt/` (`removeDisposable()`), und die Gegenprobe ist
  jedes Mal leer. Die Vorher-Messung zu 4 ging weiter als das Review annahm: `/usr/bin/git` gibt es
  immer, der Ordner wurde also nicht nur gelöscht, sondern durch einen Klon ersetzt.
- **6, 7:** Schriftdateien werden nur gelöscht, wenn keine Regel sie mehr nennt — im Vorlagenbau
  und, neu in der App, beim Import unter „Vorlage gewinnt“ (`fontRemoved`).
- **8:** `--check-sync` sagt, welche Kopien es verglichen hat, vergleicht jetzt auch das Example
  mit seiner veröffentlichten Kopie, und „nichts zuständig“ ist Exit 1.
- **9:** Die offene Suche liegt über Graph und Burger; neun Kommentare an ihrer Quelle korrigiert.
- **10, 14:** Das Basis-Template sagt, wie die Navigation klappt, was die Spaltenschalter sind und
  dass die Callout-Farben gemessen sind.
- **11:** `release.md` hat keine erledigten Punkte mehr als offen; `BEFUNDE.md` Eintrag 97.
- **12:** Eigen ist, was gleiche Bytes hat — mit der Quelle oder mit dem, was der letzte Lauf
  schrieb. Die erste Fassung des Fixes kannte nur die Quelle und blockierte die nächste Korrektur
  daran; die Nachbesserung steht als eigener Commit.
- **13:** Das Navigations-Handbuch läuft auf quartz-navigations 0.3.1. Kein Pin auf einen Tag, weil
  Quartz' Update-Prüfung `refs/heads/<ref>` fragt.

**Keinen dieser Fixes hat ein Review gelesen.** Nebenbei aufgefallen und nicht erledigt, sondern
hier gesammelt: `variants.mjs` nennt im Doc-Kommentar zu `stylesSource` „30 Stylesheets“ (es sind
31); README und `variants.mjs` sagen „Inhalte mitnehmen“, die App „Mit den Beispielseiten“; der
Assistent nennt „zwanzig kurze Seiten“ als festen Text, die Zahl im Paket wird gezählt; `--only 1`
startet trotzdem die App und schreibt per `projects.add` ins Profil. Der fünfte Punkt — `icon.png`
reiste in jedem Paket und überschrieb unter „Vorlage gewinnt“ ein eigenes Projektbild — ist
behoben: Was der Nutzer in der App als Projektbild gewählt hat (die Markierung von
`projectIconService`, dazu `icon-dark.png`), ersetzt keine Vorlage mehr, und Dry-Run und Ergebnis
sagen es.

**Statt eines weiteren Reviews eine Alpha-Szene über die Oberfläche** (2026-09-21, gebaute App,
Wegwerf-Profil, Kopie einer frischen Basis-Gegenprobe): eigenes Projektbild, eine über die App
importierte Schrift, ein eigenes Stylesheet, das eine weitere Schriftdatei nennt; dann
`qc-example.qtpl` mit allen zwölf Bausteinen unter „Vorlage gewinnt“ über „Vorlage wählen…“ und
„Vorlage anwenden“. Der Dry-Run kündigt an, dass das Projektbild bleibt; das Ergebnis nennt eine
entfernte Schriftdatei (die importierte, deren Regel die Vorlage ersetzt hat) und das unveränderte
Projektbild; die Datei, die das eigene Stylesheet nennt, bleibt; der Snapshot vor dem Import trägt
die entfernte Schrift und das Bild; die gebaute Website liefert das eigene Bild aus. Derselbe Lauf
mit dem Code davor: Projektbild wortlos ersetzt, die Website zeigt Quartz' Standardbild.

**Nach dem RC gefunden (2026-09-21, vom Nutzer an der Website bemerkt):** Der Import der
Doku-Pakete in der Nacht hatte auf der App-Website und zwei Plugin-Handbüchern den Explorer
abgeschaltet — geerbt vom Example, das auf quartz-navigations umgestiegen war — und damit jede
Navigation. Weder das Review noch die Befunde danach haben es gesehen, weil alle nach dem gesucht
hatten, was der Import *überschreibt*, nicht nach einem Schalter, der umgelegt wird. Zuerst mit
eingeschaltetem Explorer geflickt; dann, auf Wunsch des Nutzers, wie gemeint: **Alle vier
Handbuch-Websites navigieren jetzt über quartz-navigations** wie Example und Basis — die
Doku-Varianten tragen Akkordeon und Pager, der Import nur des Bausteins „Plugins“ lief vorher an
Kopien der drei Projekte (Eintrag für Eintrag: zwei Navigationen dazu, Explorer aus, sonst nichts),
live gemessen auf allen vier in beiden Sprachen und bei 390 px. Das Navigations-Handbuch behält
seine fünf eigenen Instanzen und bekommt die Pakete nur ohne „Plugins“ (`docs/release.md`).
Danach, ebenfalls auf Wunsch des Nutzers — die Vorlage soll jede Komponente fertig gestaltet
mitbringen, auch eine abgeschaltete —: **Der Explorer schneidet keinen Fokusring mehr ab.** Drei
Kästen beschnitten ihn (die Komponente, ihre Rollliste, die Liste eines offenen Ordners), gemessen
6 von 6 an einer Kopie des Basis-Templates mit eingeschaltetem Explorer; jetzt 0 von 6 bei 1400,
1000 und 390 px in Chrome, WebKit und Firefox, Zeilen auf denselben Pixeln, Einklappen und
Schublade wie vorher. `overflow-clip-margin` war der erste Versuch und trug nicht: WebKit ignoriert
den Rand, Chromium nimmt kein `calc()` dafür. Alle vier Pakete und alle fünf Websites nachgezogen.

**Danach, ebenfalls auf Wunsch des Nutzers:** Die Titel des QuartzControl-Handbuchs heißen jetzt
wie die der Plugin-Handbücher („2.3 – Ein vorhandenes Projekt hinzufügen“, Kapitel 8 nummeriert;
Vault-Commit `7cb1ec8`, 112 Dateien, `check:handbook` grün). Und **ein umbrochener Titel behält
sein Symbol neben der ersten Zeile**: quartz-navigations 0.3.2 richtet die Zeilen oben aus und
macht Symbol und Pfeil eine Zeile hoch (`1lh`); die Vorlage gibt den Zeilen unter 900 px ihre
44 px über den Innenabstand statt über `min-height`, die sonst eine einzeilige Zeile oben in ihren
Kasten gestellt hätte — und die bisher auch den Link *in* einer Ordnerzeile traf, weshalb
Ordnerzeilen 52 statt 44 px hoch waren. Live gemessen an „2.3“: Versatz Symbol zu erster Zeile
11,9 → 0,7 px in Chrome, 0 px in WebKit, einzeilige Zeilen bei 1400 px unverändert 30 px, bei
390 px alle 44. Plugin in allen Werkstätten und fünf Websites auf 0.3.2, vier Pakete neu
exportiert (Gegenproben grün), Basis und Example im Vorlagen-Repo (`7da4330`).

**Nach dem RC, am 2026-09-23: vier Commits an der Stile-Seite und an Veröffentlichen**, ohne Review
dahinter, je einer mit Typcheck, Build und Smoke und an der gebauten App gemessen (die Zahlen
stehen in den Commit-Nachrichten):

- `72e7632` — Die baseUrl-Warnung auf Veröffentlichen blitzte bei jedem Besuch mit „—“ auf, solange
  `config:get` unterwegs war (nach 46 ms); jetzt erst, wenn die Config gelesen ist.
- `024c005` — Eine Variable, die keine Farbe hält, bekommt ein Wertfeld „Hell und dunkel“ statt
  eines Paares mit Farbfeldern; das dunkle Feld liegt hinter „Im Dunkelmodus abweichend“. Die
  Speicherung ist unverändert (leere dunkle Hälfte heißt schon „in beiden gleich“). Klassifiziert
  am Grundwert, nicht am Entwurf, damit das Feld beim Tippen nicht verschwindet.
- `512fea9` — Theme- und Build-Variablen lassen sich ohne Suche durchblättern, gruppiert nach
  Präfix wie die Hauptkarte; neuer Filter „Art des Werts“ (Farben / Andere Werte). Gemessen mit
  den 1057 Variablen des minimal-Themes: 91 Gruppen, alle geöffnet in 108 ms. **Nicht
  reproduzierbar** (sechsunddreißigstes Review, Befund 11): Die Messung ersetzte den Graphen im
  Hauptprozess, ohne zu sagen, womit. Über den Weg der App — in einer `cp -Rc`-Kopie von
  `brain-handbuch` das Plugin `@quartz-themes/core` (Theme `minimal`) eingeschaltet, sodass der
  Graph `theme.json` aus dem `node_modules` des Projekts liest — sind es **101 Gruppen** (die
  letzte „Einzelne Variablen“ mit 50), alle geöffnet in **133 ms**, und die Suche „callout“ gibt
  23 Zeilen statt 32; gemessen im Review und am 2026-09-24 noch einmal (133 ms, Long Tasks 81 und
  51 ms).
- `ab9ceb3` — Ein Farbfeld malt seinen Wert über den Grund, den die Website malt (`var(--light)`
  des jeweiligen Modus), nicht über den der App: Eine Farbe mit Alpha zeigte vorher das, was die
  App dahinter hatte, in beiden Feldern gleich. Alle sechs Stellen mit Farbfeldern.

`024c005` und `512fea9` haben ein Handbuchkapitel nach sich gezogen: 4.4 „Variablen“ ist im Vault
neu (`99011c7`, beide Sprachen, gepusht), **die Website noch nicht** — sie zeigt die Seite von
rc.1 und wird mit dem Release gebaut (`docs/release.md`, Punkt 3; nachgetragen nach dem
sechsunddreißigsten Review, Befund 10).

**Am 2026-09-24 die vier Nebenbei-Punkte des fünfunddreißigsten Reviews**, auf
`fix/nebenbei-nach-rc1`, drei Commits, Typcheck, `check:i18n`, `check:handbook`, Build und Smoke
grün:

- `3e37817` — `variants.mjs` nennt 31 Stylesheets, und es und `basic-content/README.md` nennen das
  Häkchen so wie die App: „Mit den Beispielseiten“ (und es ist vorab an, also wird es nicht
  „angekreuzt“). Die „30 Stylesheets“ in `pakete/README.md` bleiben: Sie beschreiben die Fassung
  vom 2026-09-10.
- `eb89fe7` — Der Assistent zählt die Beispielseiten, statt „Zwanzig“ als festen Text zu sagen:
  `templatePackage.builtin()` liefert `pages`, gezählt an `parts/content.json` im selben Lesevorgang,
  der die Lesbarkeit prüft. Ein Paket ohne Seiten zeigt das Häkchen nicht. Gemessen an der gebauten
  App mit Wegwerf-Profil: `{source: 'downloaded', pages: 20}`, Hinweis „20 kurze Seiten in zwei
  Sprachen, …“.
- `1560257` — `template:example` startet die App nur noch für eine der Phasen 3 bis 10; `--only 1`
  trug vorher die Werkstatt per `projects.add` ins Profil ein. Gemessen: ein Lauf ohne App-Phase
  endet nach 0,3 s ohne Fenster, die Projektliste des Profils ist byte-gleich. Der Lauf mit dem
  alten Code ist nicht wiederholt, weil er das echte Profil beschrieben hätte.

**Keinen dieser sieben Commits hat ein Review gelesen.** Nebenbei aufgefallen und nicht erledigt:
`readBundledManifest()` in `builtinTemplateService.ts` hat keinen Aufrufer; und „in zwei Sprachen“
steht im Hinweis des Assistenten weiter als fester Text, genau wie vorher die Zahl.

## Das sechsunddreißigste Review (2026-09-24), abgearbeitet

Gelesen von Claude Fable 5.1, Stand `review-2026-10-10..review-2026-10-11`
([`REVIEW-2026-10-10.md`](REVIEW-2026-10-10.md)): kein Befund Hoch, einer Mittel, zehn Niedrig,
vier Nebenbei. Seine Antwort auf die Frage des Auftrags: Aus dem Code spricht nichts gegen 1.0.0;
vorher Befund 1 entscheiden und die Handbuch-Website bauen. **Die nächste Fassung ist 1.0.0**, kein
weiterer RC (Entscheidung des Nutzers, 2026-09-24).

Abgearbeitet am 2026-09-24 auf `fix/review-2026-10-10`, je Commit Typcheck, Build und Smoke, wo
Code sich ändert; gemessen an der gebauten App mit derselben Kopie von `brain-handbuch` wie das
Review (Theme `minimal` über das eingeschaltete Plugin, 1057 Variablen):

- **1 (Mittel)** `f661f11` — `VariableRow` ist gememot und zeichnet auf, welche Overrides es beim
  Rendern liest (Proxy auf `ctx.overrides`); neu gerendert wird nur, wenn sich einer davon ändert.
  Alle 101 Gruppen offen, Tippen in `--lightgray`: vorher 25–60 ms je Tastendruck und ein Long
  Task von 60 ms, jetzt 7–9 ms ohne Long Task. `--light` selbst rendert weiter alles, weil jedes
  Farbfeld es als Grund liest. (Das siebenunddreißigste Review hat die 7–9 ms am Weg der App nicht
  wiedergefunden, es misst 11–19 ms, und die Zeilen sind 1057 + 64, nicht 1066 + 64; womit die
  Zahl hier gemessen war, steht nicht da. Sein Befund 3 hat den Preis danach gesenkt.) Gegenprobe: Eine Alias-Zeile folgt dem Override ihres Ziels.
- **2, 3, 5** `b42ea54` — „Farbe“ heißt, was Canvas parsen kann, in jedem Farbraum
  (`probeColor`); `isDisplayableColor` fragt dasselbe (ohne `currentColor`). Zwei Antworten von
  `isColorVariable`: `'base'` für das, was sich beim Tippen nicht bewegen darf (zwei Felder,
  Filter), `'shown'` für die Farbfelder im Kopf. Farben 345 → 354, leere helle Farbfelder 72 → 1.
- **4** `54d14c5` — Farbfeld und Picker sagen im `title`, über welchem Grund sie malen; ein Feld
  ohne Farbe sagt das.
- **6** `2dd0059` — „Im Dunkelmodus abweichend“ ist sticky wie die aufgeklappte Zeile.
- **7** `78780fe` — **nicht wie vom Review vorgeschlagen**: „weicht von Quartz' `icon.png` ab“
  schützt zu viel, weil alle sechs Pakete ein eigenes mitbringen. Stattdessen nennt die Probe vor
  dem Import ein `icon.png`, das weder Quartz' eigenes (Blob `b6656a7`) noch in der App markiert
  ist, mit dem Satz für beide Strategien. `icon-dark.png` aus einer Vorlage bleibt bewusst offen.
- **8** `889316a` — `allStylesheets()` sucht auch unter `quartz/components/styles` und
  `quartz/static`; vorher/nachher an einem echten Import gemessen (vier gelöscht → drei).
- **9** `c8ec7b3` — ohne Seiten kein `content`-Teil. Nur gelesen, es gibt kein solches Paket.
- **10** `e3914a9` — Kapitel 4.4 steht in der Chronik und in `docs/release.md` Punkt 3 als
  ausstehend; die Website wird mit dem Release gebaut.
- **11** `7264971` — die Zahlen von `512fea9` oben richtiggestellt (101 Gruppen, 133 ms,
  23 Treffer; 50 statt 60 Einzel-Präfixe im Kommentar).
- **Nebenbei:** `3e9fc73` — „nicht auflösbar“ hat zwei Gründe und zwei Sätze; `42cf561` —
  `readBundledManifest()` und der tote `'discovered'`-Zweig entfernt; `b208399` — „in zwei
  Sprachen“ ist aus dem Hinweis des Assistenten gestrichen, statt geraten zu werden.

Im Handbuch-Vault dazu `2250e2b` (gepusht): 4.4 nennt den zweiten Satz, und die
englische Fassung zitiert den ersten so, wie die App ihn sagt — sie sagte „cannot be resolved (set
only inside a selector)“, was `check:handbook` nicht sieht, weil es kein Blockzitat ist.

**Keinen dieser Fixes hat ein Review gelesen.**

**Danach, am 2026-09-24, beim Durchklicken der gepackten App**, dreizehn Commits ohne Review
dahinter; der Auftrag für das siebenunddreißigste liest sie
([`REVIEW-2026-10-11-auftrag.md`](REVIEW-2026-10-11-auftrag.md)):

- `05240c4` — `<main>` ist `relative`: 60 `sr-only`-Spans auf Plugins → Installiert verlängerten
  das Dokument auf 6353 px und brachten eine zweite Rollleiste. `cdaecb0` — Git-Sync-Karte in
  voller Breite.
- `7d7b90d`, `b0fea2f` — „Komponente wählen“ ohne Dubletten und mit dem Selektor, den die
  Komponente wirklich rendert (gemessene Tabelle, `src/data/componentSelectors.ts`).
- `efad25c`, `cf91aba`, `8d06f8c`, `3dd2025`, `72aceaf` — die Marke im Kopf aller vier Vorlagen
  ist das Projektbild, randlos, hell die dunkle macOS-Kachel und dunkel ihre Umkehrung, ohne
  Quartz' Bildabstand; die Karte „Projektbild“ erkennt sie. Veröffentlicht in
  `boxi-os/quartzcontrol-templates` (`48c9d42`, `639a199`); die fünf Handbuch-Projekte von Hand
  nachgezogen, nicht veröffentlicht.
- `0ee9356` — die Startseite fragt auf macOS den Schlüsselbund nicht mehr ab; `76918e9` war eine
  falsche Vermutung zum zweiten Dialog und ist mit `4d2a96b` zurückgenommen; `1123831` hält fest,
  dass ein Zugriff einer ad-hoc signierten App zwei Dialoge zeigt und der Code daran nichts ändert.

**Keinen dieser Commits hat ein Review gelesen.**

**Das siebenunddreißigste Review** ([`REVIEW-2026-10-11.md`](REVIEW-2026-10-11.md), gelesen von
Claude Fable 5.1 am 2026-09-24, `review-2026-10-11..review-2026-10-12`): 0 Hoch, 3 Mittel, 6
Niedrig. Seine Antwort: nichts zurücknehmen; vor 1.0.0 Befund 1 und Befund 2 mit 8 beheben,
Befund 3 entscheiden. Der Nutzer hat entschieden, alle drei zu beheben.

Abgearbeitet am 2026-09-24 auf `fix/review-2026-10-11`, je Commit Typcheck, Build und Smoke;
gemessen an der gebauten App mit Kopien von `gui-test` und `brain-handbuch` (Theme `minimal`):

- **1 (Mittel)** `4a4b6d9` — der Marker trägt `customDark`; ein `icon-dark.png` ohne ihn ist
  „nicht in der App gewählt“ wie das helle, und die Probe nennt beide Dateien. Ein Marker von vor
  dem Feld zählt `icon-dark.png` nur neben einem gewählten `icon.png`, weil die Karte bis dahin
  nur dann eines zuließ.
- **2 und 8 (Mittel, Niedrig)** `3485b83` — `decrypt()` antwortet `null` nur, wenn nichts
  gespeichert ist, sonst wirft es einen Satz je Plattform (macOS: Zugriff verweigert, „Immer
  erlauben“ beim nächsten Start; Linux: der Schlüsselbund) oder den Satz für einen fremden
  Schlüssel. Gemessen mit einer `safeStorage`-Attrappe; dass ein echtes „Nicht erlauben“
  `isEncryptionAvailable()` falsch macht, ist in Chromium gelesen, nicht gemessen.
- **3 (Mittel)** `fbf3083` — `probeColor` merkt sich seine Antwort, `colorKeys` hängt nur an
  den eigenen Overrides, eine Zeile ohne Farbfeld liest `--light` nicht. Hub-Variablen 47–85 →
  21–48 ms ohne Long Task, eine Gruppe offen 8–17 → 4–11 ms.
- **4** `e547e5e` — „Dunkles Bild ersetzen…“ geht, sobald eines da ist.
- **5** — kein Code. Die Configs der fünf Handbuch-Projekte von vor dem 2026-09-24 liegen
  unter `~/Documents/QuartzControl-Sicherungen/marks-vor-2026-09-24/` statt im Scratchpad; das
  alte Bild liegt ohnehin in jedem Projekt (`.quartz-gui/icon-original.png`). In den fünf
  Projekten steht der Marker `{ custom: true, hasOriginal: true }`: Die Marke gilt dort als in
  der App gewählt, hell und — nach der Übergangsregel aus Befund 1 — auch dunkel, ein späterer
  Vorlagen-Import lässt beide stehen. Das ist so gewollt; wer das ändern will, entfernt das Bild
  auf der Karte.
- **6** `4a5dee5` — ein geleertes Wertfeld bleibt leer, eine leere Hälfte wird nicht als
  `--x: ;` geschrieben.
- **7** — die Zahlen oben richtiggestellt (7–9 ms, 1066 + 64) und in
  `decisions/electron-runtime-and-packaging.md` die zehn Sekunden, die nachgeschlagenen
  ACL-Nummern und die wachsende Liste der vertrauten Apps. „+1138 / −237“ im Auftrag ist der Diff
  bis `72aceaf`, also ohne den Commit des Auftrags; mit ihm (ohne dessen Datei) sind es +1163.
  Der Auftrag selbst bleibt, wie er ist.
- **9** `3aada79` — „Eine Layout-Box zeigt dieses Bild“ statt „die Marke der Vorlage“.
- **Nebenbei:** `73cb28e` — `smoke.mjs` setzt die Fenstergröße über `app.evaluate` statt über ein
  `JSHandle` (drei Läufe sauber; `screenshots.mjs` und `styles-snapshot.mjs` tragen dasselbe Handle
  noch); `a72b2d6` — die Lese-Map der Variablen entsteht einmal. Die wachsende Liste der vertrauten
  Apps steht in `decisions/electron-runtime-and-packaging.md`, der vierte Punkt ist Befund 8.

**Keinen dieser Fixes hat ein Review gelesen.**

**Nach 1.0.0: die Fehlerbehebung für 1.0.1** (2026-09-27/28, auf `fix/1.0.1`, nicht gepusht):
sieben Befunde des Nutzers am veröffentlichten 1.0.0, sechs davon behoben (`8ac60f9` Serverliste
folgt dem Start und Stopp, `c4cc7ab` Board-Zeilen ohne die Zeilenhöhen des Frames, `93d7765`
„Deaktiviert“ auf dem Board, `d5538ef` keine Google-Abfrage für eine selbst deklarierte Familie,
`0c9f95c` das Projektbild einer Vorlage in der App, `e51a4cb` die dunkle Hälfte einer Variable
bleibt), dazu `b4e32ba` (jede Kopie eines Abschnitts wird gelesen) und `18f68db` (das Schloss der
Stylesheets für jeden Schreiber von `custom.scss`). Der siebte Befund — die einzige Instanz in den
Vorrat ziehen — ist verschoben: Quartz kennt „nicht zugewiesen“ nicht. Auftrag
[`REVIEW-2026-10-12-auftrag.md`](REVIEW-2026-10-12-auftrag.md), Tag `review-2026-10-13`.

**Das achtunddreißigste Review** ([`REVIEW-2026-10-12.md`](REVIEW-2026-10-12.md), gelesen von
Claude Fable 5.1 am 2026-09-28, `main..review-2026-10-13`): 0 Hoch, 2 Mittel, 7 Niedrig. Seine
Antwort auf die Frage des Auftrags: Das Schloss gehört in 1.0.1; `d5538ef` nicht in dieser Form.

Abgearbeitet am 2026-09-28 auf `fix/1.0.1`, je Commit Typcheck, Build und Smoke (bei den reinen
Kommentar-Commits Typcheck; Build und Smoke liefen mit dem nächsten Code-Commit):

- **1 (Mittel)** `fe5eda8` — der Nutzer hat entschieden: nur Lücken holen. Die Familie wird
  wieder bei Google gefragt, aus der Antwort fallen nur die Regeln, die eine eigene deckt (Stil,
  Gewicht, `unicode-range`); nur eine eigene Regel ohne Bereich nimmt die ganze Familie heraus.
  Ein Abdruck der eigenen Regeln im Kopf des Blocks lässt dieselbe Anfrage neu stellen, wenn sie
  sich ändern. Bau-Tür und Stile-Seite sagen, was fehlt und was gelöscht wurde. Am Bündel gegen
  das echte Google: 1.0.0-Stand von `gui-test` 54 → 47 Google-Regeln (die sieben Latin), 26 → 23
  Dateien; der Stand des Test-Builds kommt auf dieselben Zahlen; ohne eigene Regeln bleibt der
  Block byte-gleich. Die Sätze der Stile-Seite sind nicht an der App gemessen.
- **2 (Mittel)** `c97790b` — „In beiden Modi gleich“ ruft `followLight()` und nimmt die dunkle
  Hälfte weg, statt `base.dark` hineinzuschreiben. An der gebauten App mit `--titleFont`
  vorher/nachher gemessen.
- **3** `46a6f33` — wo das Schloss endet, am Schloss und in `conventions.md`, dazu die Bedingung
  aus Abwägung 1.
- **4** `af824ef` — `refreshGoogleFonts` nimmt das Schloss selbst. Am Bündel: vorher `null` in
  der Lücke eines Imports, nachher wartet die Tür.
- **5** `4c35807` — ein Kommentar, keine Änderung, wie das Review rät.
- **6** `afdf82e` — Folgennummer in `scan()`. An der gebauten App mit ersetztem Handler: vorher
  stand der Server nach 2,5 s wieder in der Liste, nachher nicht.
- **7** — nicht für 1.0.1, wie das Review rät: Die helle Überschreibung als
  `:root:not([saved-theme="dark"])` zu schreiben ist eine Formänderung mit Lesern auf beiden
  Seiten und braucht eine eigene Runde mit Messung.
- **8** `bb65411` — die Zahl als Spanne (34–44 und 27–34).
- **9** — keine Änderung; das Board entscheidet keine Höhen.
- **Nebenbei:** `27f9151` — `writeStyleFileNow` schreibt atomar; `15d3712` — der Nachlauf der
  Serversuche nur nach `stopped`. Nicht angefasst: die drei Suchläufe nach einem Stopp aus der
  Karte (harmlos) und das Hashen von `icon.png` je Auffrischung (nichts).

**Keinen dieser Fixes hat ein Review gelesen.**

**Nach 1.0.1: die Fehlerbehebung für 1.0.2** (2026-10-06/07, auf `fix/1.0.2`, nicht gepusht):
vier Befunde des Nutzers — `fb8bb3c` die Variable an der Cursorposition einfügen, `f610bae` ein
geleertes Plugin-Optionsfeld entfernt den Schlüssel, `827043a` der Dev-Server weicht einem belegten
Port aus, `ba3ddaa` Git-Sync ohne `origin` gesperrt —, dazu `79f00aa` (der Satz der Server-Karte)
und `941bfc9` (`docs/plan-1.1.md`).

**Das neununddreißigste Review** ([`REVIEW-2026-10-13.md`](REVIEW-2026-10-13.md), gelesen am
2026-10-06, `f0886d9..fix/1.0.2` und die neun Fixes des achtunddreißigsten): **vom selben Modell
wie die gelesenen Commits** (Claude Opus 5.5, in einem eigenen Agenten ohne den Kontext der
Sitzung) — Fable stand nicht mehr zur Verfügung. 0 Hoch, 2 Mittel, 5 Niedrig. Seine Antwort: nicht
ganz — Befund 1 ist mit diesem Branch neu und gehört vorher behoben.

Abgearbeitet am 2026-10-07 auf `fix/1.0.2`, je Commit Typcheck, Build und Smoke, je mit Vorher- und
Nachher-Messung an der gebauten App (APFS-Klone von `gui-test`):

- **1 (Mittel)** `c7f962e` — „Starten“ liest vor der Port-Wahl die Prozessliste und lehnt ab, wenn
  ein Quartz-Server außerhalb der App dieses Projekt als Arbeitsordner hat; ausgewichen wird nur
  vor allem anderen. Vorher lief neben einem Terminal-Server auf 8080 ein zweiter auf 8081 im selben
  `public/`. `conventions.md` sagt jetzt, dass „Starten“ solche Server sieht und „Jetzt bauen“ nicht.
- **2 (Mittel)** `6d7e106` — der Cursor gilt nur nach einer Transaktion des Nutzers als gesetzt, eine
  Dokumentänderung ohne Nutzerereignis nimmt das zurück. Vorher landete die Variable nach „Nach
  unten“ und nach einem Fokus ohne Klick (gemessen, im Review nur gelesen) vor dem ersten `@use`.
- **3** `6e87bff` — der Nutzer hat entschieden: geleert entfernt weiter; „Leer setzen“ und
  „Zurücksetzen“ an leeren Textfeldern der Plugin-Optionen, nicht an den Layout-Feldern.
- **4** `b143afa` — das Formular übernimmt beim Mount nichts mehr; nach Routenwechsel und Stopp
  fragte der nächste Start den ausgewichenen Port an.
- **5** `bbcea24` — mit Remote-Dev-Host wird abgelehnt statt ausgewichen; eigene Meldung, wenn der
  eigene http-Port den gewünschten WebSocket-Port belegt; nur `EADDRINUSE` zählt als belegt
  (der `EACCES`-Zweig gelesen, nicht gemessen — macOS bindet niedrige Ports ohne Rechte).
- **6** `0376145` — `getGitStatus` trennt „not a git repository“ (unter `gitTextEnv`, dafür nach
  `runCommand.ts` gezogen) von jedem anderen Fehler (`readError`); Git-Sync zeigt git's Text und
  lässt die Knöpfe frei, die Übersicht sagt „Stand nicht lesbar“. Nicht gemessen: ein übersetztes git.
- **7** `f3a638e` — der Satz im Plan; dazu Befund 7 des achtunddreißigsten in denselben Abschnitt.
- **Nebenbei** `5282baa` — `ProjectLayout` rendert keine Seite, solange es das vorige Projekt hält,
  und verwirft die Antwort für eine verlassene ID: Beim Sprung per `location.hash` von der
  Git-Sync-Seite eines Projekts in die eines anderen zeigte die Seite den Stand des vorigen. Die
  Oberfläche selbst geht immer über die Startseite (gemessen nur über den Hash); `cbab1dc` — die
  Git-Karte der Übersicht trennt „noch nicht gelesen“ (Strich) von „Lesen gescheitert“ („Stand
  nicht lesbar“); vorher sagte sie in beiden Fällen „Kein Git-Repository“, gemessen mit ersetztem
  `sync:status` im Hauptprozess.

**Keinen dieser Fixes hat ein Review gelesen.**

**Das vierzigste Review** ([`REVIEW-2026-10-14.md`](REVIEW-2026-10-14.md), Auftrag
[`REVIEW-2026-10-14-auftrag.md`](REVIEW-2026-10-14-auftrag.md), Tag `review-2026-10-15`, gelesen am
2026-10-08, `main..feat/1.1` = P0–P7.4 von 1.1): **vom selben Modell wie die gelesenen Commits**
(Claude Opus 5.5, eigener Agent ohne den Kontext der Sitzung). 0 Hoch, 4 Mittel, 6 Niedrig. Seine
Antwort auf die Schlussfrage: P4 nicht in dieser Form — der Umzug nach `_quartzcontrol.scss` soll
ein ausdrücklicher Schritt mit Snapshot sein. **Der Nutzer hat so entschieden.**

Abgearbeitet am 2026-10-08 auf `feat/1.1`, je Commit Typcheck, Build und Smoke, je mit Vorher- und
Nachher-Messung (gebündelte Dienste oder gebaute App mit Wegwerf-Profil, Klone von gui-test):

- **2 (Mittel)** `fbdfa32` — eine weitergetragene Ladereihenfolge wird aus `parseImportOrder` neu
  gebildet, wenn sie aus zwei Kopien kommt oder doppelte Zeilen hat; vorher 35 bzw. 67 `@use` und Sass
  brach ab, nachher 33 und grün.
- **Schlussfrage und 5** `8552f53` — kein Schreiber zieht mehr um; „Jetzt umstellen“ auf der
  Stile-Seite (`styles.migrate`) mit Snapshot `styleMigration`, neue Projekte ziehen beim Anlegen um,
  der Vorlagen-Import nicht. 1.0.2 liest ein Projekt nach einer gespeicherten Variable mit 68 statt 0
  Variablen. Nicht gemessen: der Assistent zum Anlegen (braucht `quartz create`).
- **1 (Mittel)** `c3964a3` — ein gespeicherter Entwurf von `_quartzcontrol.scss` bleibt im Editor;
  vorher verlor das zweite Speichern das erste.
- **3 (Mittel)** `413fa0d` — Plugin-Optionen gegen den neuesten Stand, hintereinander; bei 0 und
  300 ms Abstand ging vorher die erste verloren.
- **4 (Mittel)** `a084ca4` — `plugins.optionSchema` liefert `quartz.category`; Seitenleiste und
  Ansage nennen, was beim Ausschalten mitgeht. Die Ablage im Vorrat wählt den Eintrag aus (gelesen,
  nicht gemessen).
- **6** `0eecdbb` — Cmd+S ist auf der Bühne immer registriert, `save()` schreibt nichts, wenn nichts
  zu schreiben ist.
- **7** `9ffa4f5` — unbekannte `x-quartz-*`-Angaben werden Notizen, das Formular nennt ihre Zahl;
  `docs/plugin-config-schema.md` beschreibt das Format.
- **8** `4e7ec59` — Kollisionen nur bei gleichem Selektor; die P0-Tabelle nennt den gemessenen
  Selektor.
- **9** `2350428` — die Instanznummer eines Chips wird nicht mehr abgeschnitten.
- **10** `6d0ab55` — beim Import wird auch die Endung der Quelle geprüft; Werkzeugordner ohne
  Rücksicht auf Groß-/Kleinschreibung.
- Abwägung 8 (`union` aus `withPresentKeys`) blieb ohne Befund und ohne Änderung.

**Keinen dieser Fixes hat ein Review gelesen.**

**Das einundvierzigste Review** ([`REVIEW-2026-10-15.md`](REVIEW-2026-10-15.md), Auftrag
[`REVIEW-2026-10-15-auftrag.md`](REVIEW-2026-10-15-auftrag.md), Tag `review-2026-10-16`, gelesen am
2026-10-09, `review-2026-10-15..review-2026-10-16` = die Fixes des vierzigsten und die Runde nach
der Rückmeldung des Nutzers zu 1.1: Seitenleiste auf neun Seiten, Layout mit Seitentyp-Tabelle und
Frame-Editor, eigene Editoren für die drei eigenen Plugins): **vom selben Modell wie die gelesenen
Commits** (Claude Opus 5.5, eigener Agent; einmal am Nutzungslimit unterbrochen und fortgesetzt).
0 Hoch, 3 Mittel, 7 Niedrig. Teil A trägt, Teil B hat keinen der Fixes wieder aufgemacht. Seine
Antwort auf die Schlussfrage — das Seitenleisten-Muster ist eine Regel — steht in
`conventions.md`, die Messungen in `decisions/navigation-and-pages.md`. **Der Nutzer hat beides so
entschieden.** Zwei Messwege des Reviews: eine `cp -Rc`-Kopie von gui-test nennt die Frames des
Originals mit absolutem Pfad, und `npm run smoke` startet mit dem echten Profil.

Abgearbeitet am 2026-10-09 auf `feat/1.1`, je Commit Typcheck, Build, `check:i18n` und Smoke, an
der gebauten App bei 1280 und 1600 px gegen gui-test (Config gesichert und byte-gleich
zurückgelegt, die vier Snapshots, die schreibende Messungen anlegten, über die App wieder
gelöscht):

- **2 (Mittel)** `8ea21a5` — die einzige veröffentlichte Sprache zu entfernen fragt, welche
  Sprachen dadurch online gehen („Entfernen und veröffentlichen“). Gemessen ist die Frage, nicht
  das Schreiben.
- **1 (Mittel)** `00ddb72` — `DetailLayout` lässt ein Feld der Leiste vor `onDismiss` los; vorher
  blieb die Config nach Tippen und Escape byte-gleich.
- **3 (Mittel)** `c284ef4` — Lade- und Aktionsfehler der Dateien-Karte getrennt; ein gescheiterter
  Papierkorb hat einen eigenen Satz. Gemessen mit ersetztem `shell.trashItem`; der echte
  Papierkorb auf Linux und im Flatpak bleibt ungemessen.
- **4** `a1861bf` — Link-Regex ohne überlappende Teile, Absätze über 4000 Zeichen als Text; dazu,
  vom Review nicht genannt, die zwei HTML-Entferner davor, die ebenso quadratisch waren (256 KB:
  13,3 und 5,4 s in Node), als Schleifen, gegen die Regexes an 200 000 Zufallstexten ohne
  Unterschied. In der App 71–141 ms für fünf feindliche READMEs von 256 KB.
- **5** `a6cd398` — scheitert die Config nach dem Umbenennen, heißt das Snippet wieder wie vorher;
  `renameSnippetRefs` je Leseort und Ordner (zehn Fälle im Bündel); die Bilder sagen, wo „benutzt
  von“ sucht.
- **6** `94a5d0e` — `focusRowAt` nach `flushSync`; der erste Versuch mit `requestAnimationFrame`
  fiel an den Sprachen durch und hatte an den Boxen nur zufällig getragen.
- **7** `2d108a2` — die Fassung, gegen die jede Plugin-Abschrift gelesen ist, und eine Zeile, wenn
  eine andere installiert ist; das Standard-Frame nennt seine abgeschriebenen Maße. **Nicht
  gebaut:** ein Prüfskript, das die Funktionen der installierten Plugins lädt, und ein Lesen der
  `variables.scss` des Projekts.
- **8** `8512daf` — `useUnsavedChanges` auf Veröffentlichen und den Zugängen, „Zurück“ der
  Einstellungen fragt. Ein Menüpunkt, der die Route wechselt, fragt weiter nicht.
- **9** `79bee11` — der erste Layout-Reiter heißt „Seitentypen“ (URL-Wert bleibt `overview`).
  **Zurückgenommen** mit `796c359` am selben Tag: Der Reiter zeigt seither das ganze Layout und
  heißt auf Wunsch des Nutzers wieder „Übersicht“ — als Ausnahme in `conventions.md` eingetragen
  (zweiundvierzigstes Review, Befund 5).
- **10** `97f944b` — `SELECTING` nennt Bedienelemente statt `[role]`, dazu die Kantengriffe.
- Nebenbei, nicht behoben: `toggleEnabled` und `reorderGroup` in `Installed.tsx` schreiben an der
  Warteschlange vorbei; `marketplaceReadmeArgs` lässt `owner/.` zu; jede Änderung der Sprachliste
  schreibt alle Codes neu. Alle offenen Punkte der Runde stehen in
  [`plan-1.1-umsetzung.md`](plan-1.1-umsetzung.md), Abschnitt „Offen auf `feat/1.1`“.

**Keinen dieser Fixes hat ein Review gelesen.**


**Das zweiundvierzigste Review** ([`REVIEW-2026-10-16.md`](REVIEW-2026-10-16.md), Auftrag
[`REVIEW-2026-10-16-auftrag.md`](REVIEW-2026-10-16-auftrag.md), Tag `review-2026-10-17`,
`review-2026-10-16..review-2026-10-17` = die Fixes des einundvierzigsten, die Offen-Liste von 1.1
und die Abendrunde, 52 Commits): **vom selben Modell wie die gelesenen Commits** (Claude Opus 5.5,
eigener Agent). 1 Hoch, 2 Mittel, 5 Niedrig. Das Hoch fand das Review in einem Bereiniger, den
vorher niemand am Parser der Website gemessen hatte.

Abgearbeitet am 2026-10-10 auf `feat/1.1`, je Commit Typcheck, Build, `check:i18n` und Smoke (46
Aufrufe), gemessen an der gebauten App mit Wegwerf-Profil und `cp -Rc`-Kopien, jeweils vorher
gegen den alten Build:

- **1 (Hoch)** `d3d511a` — `inlineSvg.ts` schreibt neu aus einer Erlaubnisliste;
  `npm run check:inline-svg` setzt jedes Ergebnis in Chrome als HTML: vorher 14 von 22 durch,
  nachher 0. Ein `quartz build` mit einem solchen Schnipsel ist nicht gemessen.
- **2 (Mittel)** `bcabf1e` — solange ein Plugin entfernt wird, lehnt „Installiert“ jede Änderung
  an der Liste mit einem Satz ab; der Griff ist gesperrt.
- **3 (Mittel)** `5437b48` — Übersicht und Bühne zählen jeden Bereich des Frames, auch einen
  versteckten; zwei neue Zustände (auf keiner Breite / auf manchen Breiten).
- **4** `b2fd158` — zusammengelegt wird einmal; erkannt an der Kopfzeile der zwölf, eine danach
  eingeschaltete Altdatei ist eine eigene.
- **5** `2a620a1` — „Übersicht“ für den Layout-Reiter ist die Entscheidung des Nutzers und steht
  als Ausnahme in `conventions.md`; nichts am Code.
- **6** `df74116` — `writeConfig` schreibt die eigenen Frame-Pfade, egal was die Seite hält; die
  Reparatur an der Bau-Tür liest und schreibt unter `whileHoldingConfig`. Das Schloss ist
  gelesen, nicht gemessen: 40 Läufe ohne Verlust schon vorher.
- **7** `5e33ac1` — der Plan nennt den echten Stand von quartz-layout-box (gui-test und
  testmitcss 0.4.1, alle anderen 0.3.1) und 105 statt 99 berechnete Aufrufe.
- **8** `660e8e5` — „geleert“ und „ausgeblendet“ vor „kein Platz“; die 15 Zellen „auf keiner
  Breite“ aus Befund 3 waren alle geleerte Positionen. Gruppen als eigenes `tbody`, die Zahl im
  Kopf als Satz. Mit VoiceOver nicht gehört.

**Keinen dieser Fixes hat ein Review gelesen.**


**Das dreiundvierzigste Review** ([`REVIEW-2026-10-17.md`](REVIEW-2026-10-17.md), Auftrag
[`REVIEW-2026-10-17-auftrag.md`](REVIEW-2026-10-17-auftrag.md),
`review-2026-10-17..review-2026-10-18` = die Fixes des zweiundvierzigsten): **vom selben Modell wie
die gelesenen Commits und wie der Auftrag** (Claude Opus 5.5). 1 Hoch, 2 Mittel, 6 Niedrig. Das Hoch
lag genau dort, wo der Fix der Runde davor „nicht gemessen“ geschrieben hatte: in einem echten
`quartz build` mit einem Markdown-Schnipsel. Das Mittel 2 hatte das Schloss gebaut, das die Runde
davor als „gelesen, nicht gemessen“ eingeführt hatte.

Abgearbeitet am 2026-10-10 auf `fix/review-2026-10-17` (von `feat/1.1`), je Commit Typcheck, Build
und Smoke (46 Aufrufe, Kopie von gui-test), gemessen jeweils vorher gegen den alten Stand:

- **2 (Mittel)** `631cd9c` — der Snapshot vor `writeConfig` kommt vor dem Config-Schloss, nicht
  darunter; Reihenfolge Warteschlange vor Schloss, an beiden Schlössern genannt. Bündel: vorher
  Restore und Speichern nach 30 s nicht fertig, nachher 378–392 / 488–501 ms.
- **1 (Hoch)** `3628e39` — Text im SVG trägt jedes Strukturzeichen von Markdown als Referenz,
  Attributwerte ihre Zeilenumbrüche; `check:inline-svg` schickt jedes Ergebnis zusätzlich durch die
  Kette von quartz-layout-box (neu als devDependencies) in drei Lagen. Vorher 5 von 7 neuen
  Eingaben durch, nachher 0; ein echter `quartz build` ohne `href="javascript`. remark-gfm macht aus
  Adressen im Text weiter https-/mailto-Links.
- **3 (Mittel)** `c576a8f` — Attributnamen wie HTML (klein, SVG-Tabelle, erster gewinnt), Werte
  CSS-entmaskiert, `image-set(` und Verwandte wie `url(`; Links nur https/mailto, Bilder nur https
  und Raster-`data:`. Vorher 8 von 8 neuen Eingaben durch, nachher 0; einmal auch in WebKit.
- **5** `81bc6a7` — geleert und ausgeblendet vor „unbekannt“. Gelesen; gui-test hat keinen
  Plugin-Frame.
- **4** `05db5bc` — „auf manchen Breiten“ schneidet mit `layout.display`; neuer Zustand „auf keiner
  Breite“. An der gebauten App mit dem Aufbau des Reviews gemessen.
- **6** `c567acc` — zusammengelegt heißt auch: mindestens die Hälfte der zehn neuen Namen geladen.
  Die Vorlage mit Kopfzeile zu bauen bleibt P8.
- **7** `45628eb` — ein eigener Satz, wenn ein `<style>` die Farben trug. Nicht durch den
  Dateidialog geklickt.
- **8** `adc5917` — die Ablehnung beim Entfernen wird angesagt (beim Zug als `dropOutcome`), der
  Satz geht nach einem gelungenen Speichern weg, die Zeilen warten auf eine Wartung. An der
  gebauten App mit gestubbtem Dialog und verzögertem Entfernen gemessen.
- **9** `5671b0b` — Plan (basic-vorlage auf 0.4.0) und `layout-frames.md` (Gruppenzeile,
  P#G-Regel); die Sätze über den Bereiniger stimmen seit `c576a8f`.

Aus der Nebenbei-Liste danach auf `fix/review-2026-10-17-nebenbei`: `290b710` — die Teile des
Vorlagen-Imports schreiben die Config ohne eigenen Snapshot (vorher ein zusätzlicher `configChange`
mitten im Import, nachher nur der `styleChange` davor); `58d8f5c` — die Ids eines eingefügten SVG
bekommen ein Präfix je Datei, alle Verweise ziehen mit (vorher 5 doppelte Ids und 6 Verweise ins
andere SVG, nachher 0). Danach auf `fix/review-2026-10-17-nebenbei-2` die letzten zwei: `8670cd8` — eine
Kopfzeile zählt nur an einer geladenen Datei, nach einem Restore je Datei kommt das Angebot zurück;
und `projectLock()` hat eine eigene Datei. Aus der Nebenbei-Liste ist damit nichts mehr offen. Der Regelvorschlag des Reviews („eine Zahl, die einen Fix belegen soll, nennt
mindestens einen ihrer Fälle mit seiner Ursache“) steht auf Wunsch des Nutzers in `conventions.md`.

**Keinen dieser Fixes hat ein Review gelesen.**


**Das vierundvierzigste Review** ([`REVIEW-2026-10-18.md`](REVIEW-2026-10-18.md), Auftrag
[`REVIEW-2026-10-18-auftrag.md`](REVIEW-2026-10-18-auftrag.md),
`review-2026-10-18..review-2026-10-19`: Block A die Fixes des dreiundvierzigsten, Block B sechs
Commits aus der Bedienung — Vorschau-Markierung, eigene Klassen je Instanz): **vom selben Modell
wie die gelesenen Commits und wie der Auftrag** (Claude Opus 5.5). 0 Hoch, 2 Mittel, 9 Niedrig.
Beide Mittel lagen in Block B und waren Fälle von „die App zeigt anders als die Website“.

Abgearbeitet am 2026-10-10 direkt auf `feat/1.1`, je Commit Typcheck, Build und Smoke (46 Aufrufe).
Gemessen wurde an dem Nachbau der zwei Einbettungen, den das Review gebaut hatte (Electron 43,
statischer Server, Kopie von `basic-gegenprobe/public` — nicht die gebaute App), wo nicht anders
gesagt:

- **Mittel 1** `755dc54` — der Ersatz für `scrollIntoView` ruft die native Fassung mit
  `container: 'nearest'`. Tablet 48 → 93 px (Website 93), Telefon 0 → 157 px (Website 157),
  `<main>` und Kasten 0.
- **Mittel 2** `3074372` — „Eigenes CSS“ bietet für ein Original mit Kopien beide Reichweiten an,
  `.layout-box-mark` („trifft auch die Kopie“) und `.layout-box-mark:not(.layout-box-mark-2)`.
  An der Funktion geprüft.
- **Niedrig 1** `028b8cb` — gescrollt wird nur für den Zoom, nach `nav` erst nach `scrollend`.
  Pager auf dem Telefon, Zoom aus: 0 statt 1319 px.
- **Niedrig 4** `12f1100` — ein Rahmen schreibt sein `cssText` nur, wenn es sich ändert. 4,4 → 3,1 %
  eines Kerns; die leere rAF-Schleife allein kostet 2,6 %, und die braucht das Mitlaufen.
- **Niedrig 6** `10b6306` — `mainFrame.frames` statt `framesInSubtree`. Gemessen mit einem Frame
  derselben Origin in der Website: vorher beide, nachher nur die Website.
- **Niedrig 5** `55f4f54` — „Vorschau & Build“ setzt das Skript ohne Markierung. **An der gebauten
  App** (basic-gegenprobe, eigener Dev-Server, 1280×800): `<main>` 432 → 0 px.
- **Niedrig 3** `d8986ed` — der Satz nimmt die Zahl von der Seite (`report.visible`), ob der Eintrag
  unterscheidbar ist aus der Config, und sagt „keine Klasse“ und „geteilte Klasse“ verschieden.
  An der Funktion geprüft, nicht in der App.
- **Niedrig 2** `72ab29e` — neuer Kanal `styles.takenClasses`: jede Klasse mit `nav-`/`layout-box-`
  aus `allStylesheets` und `.quartz/plugins/*/dist`; alle vier Wege, die eine Klasse vergeben,
  meiden sie. An der gebauten App: 32 Namen, alle neun des Reviews darunter; „Title“ →
  `layout-box-title-2`.
- **Niedrig 7** `9f28595` — die Vorlage von 1.1 wird an der ersten Zeile ihrer zehn neuen
  Stylesheets erkannt (`TEMPLATE_FIRST_LINES`), nicht an einer Zahl; ausgeliefert ist sie noch
  nirgends (die mitgelieferte `qc-basic.qtpl` hat 31). Das Prüfskript hält die Tabelle gegen die
  Vorlage; beide Ränder des Reviews fallen mit der alten Funktion durch, mit der neuen nicht.
- **Niedrig 8** `57fd2b4` — das Präfix der Ids zieht in den vier Schreibweisen mit;
  `check:inline-svg` fragt Chrome, wohin jeder Verweis zeigt (alter Stand: keiner der fünf am
  Ziel).
- **Niedrig 9** `281531a` — `check:inline-svg -- <projekt>` lädt die Markdown-Kette aus dem Bündel
  von quartz-layout-box; die sechs devDependencies sind weg (91 Pakete aus der Lockfile, keins dazu).

Dazu auf Wunsch des Nutzers `8f86799`: „Verfügbare Platzhalter“ unter dem Schalter `placeholders`
und an den Texteditoren eines Kastens, dort mit Einfügen am Cursor; die Liste ist eine Abschrift aus
`placeholders.ts`, und `check:plugin-copies` hält sie in beide Richtungen gegen das Plugin.

Die **Nebenbei-Liste** auf Wunsch des Nutzers, ein Punkt je Commit:

- `f78179d` — `ConfirmAnswer` hat seinen Doc-Kommentar zurück, `SitePreviewHighlightInput` einen
  eigenen.
- `190413c` — das Schema des Selektors schreibt die Grammatik von `entrySelector` nach (Wurzel als
  Klasse oder Tag, eigene Klasse, beliebig viele `:not()`), ohne Länge je Klasse, mit 4096 Zeichen
  fürs Ganze. Gegen die Regex: eine Klasse mit 120 Zeichen, 25 Kopien und `footer` fielen vorher
  durch und gehen jetzt; `.a b`, `.a,body`, `*` werden weiter abgelehnt.
- `0ca0538` — eine Endzahl zählt nur weiter, wenn der Name ohne sie auch belegt ist: `nav-2024` →
  `nav-2024-2` (vorher `nav-2`), `layout-box-mark-2` neben `layout-box-mark` → `-3` wie bisher.
  Preis: die Kopie von `nav-menue-2`, deren Original gelöscht ist, heißt `nav-menue-2-2`.
- `536aca5` — Bühne und Editoren bilden die Klasse aus derselben, unübersetzten Quelle
  (`classSource()`: Titel, sonst Variante, sonst Datei); der Parameter, über den die Editoren ihre
  übersetzte Beschriftung reichten, ist aus der Kette entfernt. Eine neue Navigation heißt damit
  `nav-<variante>` in jeder Sprache. Am Bündel von `utils.ts` geprüft.
- `2bdeb1a` — „Auf keiner Breite“ hat in der Übersicht ein eigenes Icon (`Unlink2`). Nicht am
  Bildschirm angesehen.
- `Installed.tsx`/`dropRefused` — **nicht nachvollziehbar, nichts geändert**: Die Ansage fragt
  `isHome` vor `dropOutcome` (seit `aea4cad`), ein Drop auf den eigenen Platz sagt
  `dnd.droppedHome`, und `reorderGroup` kehrt bei `from === to` vor `commit` zurück. Am Bündel von
  `dndAnnouncements.ts` mit einer Ablehnung, die immer antwortet: eigener Platz → `droppedHome`,
  anderer Platz → die Ablehnung.
- `basic-gegenprobe/public/` — erledigt, ohne Commit: Der Dev-Server der Messung zu Niedrig 5 hat
  die Website am 2026-10-10 um 23:10 neu gebaut; alle 32 Seiten sind jünger als die Config, keine
  trägt eine der vier Klassen.
- Die Markierung auf der Seite Mehrsprachigkeit fehlt nur in der Liste des Auftrags; am Code ist
  nichts zu tun.

Die **zwei Regelvorschläge** stehen auf Wunsch des Nutzers in `conventions.md` („Code, den die App
in die Website setzt …“ unter Prozessgrenze, „Was eine Kopie nicht erbt …“ unter Arbeitsweise),
mit je einem Satz am Code (`previewHighlight.ts`, `duplicateEntry`).

Offen aus dieser Runde: der Vorschlag einer Zehn-Zeilen-Notiz vor Änderungen an einer
Vertrauensgrenze oder einer gemeinsamen Funktion — er wartet auf den Nutzer.

**Keinen dieser Fixes hat ein Review gelesen.**


**Das fünfundvierzigste Review** ([`REVIEW-2026-10-19.md`](REVIEW-2026-10-19.md), Auftrag
[`REVIEW-2026-10-19-auftrag.md`](REVIEW-2026-10-19-auftrag.md),
`review-2026-10-19..review-2026-10-20`: Block A die Fixes des vierundvierzigsten, Block B die zwölf
Nutzerbefunde vom 2026-10-14, Block C die neu gegliederten Plugin-Optionen, der
Mehrsprachigkeits-Editor und „Button“): **vom selben Modell wie die gelesenen Commits und wie der
Auftrag** (Claude Opus 5.5, in einem eigenen Agenten). 0 Hoch, 2 Mittel, 8 Niedrig. Beide Mittel
lagen in Block B, an „Vorlage anwenden“ mit dem mitgelieferten Basis-Template auf ein bestehendes
Projekt, und beide hat erst ein gewachsenes Projekt gezeigt (navigations-testprojekt), nicht
gui-test. Abgearbeitet am 2026-10-16 auf `feat/1.1`, ein Befund je Commit, je mit Typcheck, Build,
Smoke und einer Messung an der gebauten App mit Wegwerf-Profil an Kopien:

- **Mittel 1** `7732fdf` — ein Paket in der Form der zwölf auf einem Projekt mit den 31: unter
  „Vorlage gewinnt“ verlassen die alten die Ladereihenfolge (bleiben im Ordner), unter „Projekt
  gewinnt“ werden die zwölf geschrieben, aber nicht geladen; der Plan sagt beides und nennt
  Template-Variablen, die dem Projekt fehlen. doku-gegenprobe: 31 → 12 statt 41.
- **Mittel 2** `af784a3` — „Basis-Template“ wählt auf einem bestehenden Projekt nur die Teile der
  Gestaltung vor; der Plan nennt unter „Vorlage gewinnt“, welche Plugins ein- und ausgeschaltet
  werden, dass mehrere Instanzen nach der Reihenfolge ersetzt werden, und welche Schriftdateien
  gehen (`fontFilesReplacedRulesWouldRemove`, dieselbe Regel wie das Löschen).
- **Niedrig 1** `f935c0d` — der Fokus geht vor dem Zurücksetzen einer nur gesetzt sichtbaren
  Option auf das nächste Bedienelement.
- **Niedrig 2** `56f93c0` — „Alle Optionen“ (und der Inspektor der Bühne) graut aus, blendet
  nicht aus.
- **Niedrig 3** `8d74c33` — Mehrsprachigkeit ohne Schema: Grund, Satz und eine Zeile „Weitere
  Optionen“ mit den gesetzten Schlüsseln.
- **Niedrig 4** `a0b71eb` — `url(//…)` im SCSS-Editor hingenommen, Absatz in
  `decisions/styles-and-fonts.md`.
- **Niedrig 5** `66006c5` — die Platzhalterliste auch neben dem einzeiligen `html` von
  layout-box 0.3.1.
- **Niedrig 6** `fa9e747` — Speicher-Dialoge beginnen nicht im `content/` eines eingetragenen
  Projekts; der Fall mit Symlink in einen Vault ist gelesen, nicht gemessen.
- **Niedrig 7** `3eb0855` — „der Knauf des Schalters“ statt „der Toggle-Button“ in
  `conventions.md`.
- **Niedrig 8** `8d933d3` — kein Versionshinweis bei Fassungen mit demselben `src/`
  (`*_SAME_CODE`).

Offen aus dieser Runde, beim Nutzer: die **Nebenbei-Liste** des Dokuments (alte Kopfzeile des
Zusammenlegens in Zwischenständen von 1.1, der Rumpf von `custom.scss` nennt
`_quartzcontrol.scss` auch in Projekten der Form 1.0, das Basis-Template hängt bis zum Release am
Netz, „Wirkt nur bei Seitliche Panels“, der Selektor „ohne die Kopien“ als Momentaufnahme, die
zweite Navigation heißt in der Plugin-Liste ohne `#2`), dazu „3 wird ersetzt“ im Plan einer
Vorlage (Singular für jede Zahl), die Frage, ob Messprotokolle in `docs/decisions/` von
Wortersetzungen ausgenommen sind, und die **sechs Alpha-Szenen**, die das Review vor dem Release
empfiehlt, statt einer sechsundvierzigsten Runde dieser Art.

**Keinen dieser Fixes hat ein Review gelesen.**

Die **Nebenbei-Liste** des fünfundvierzigsten auf Wunsch des Nutzers, ein Punkt je Commit (2026-10-16):
`5de31a3` („3 werden ersetzt“), `6dbfb7c` („bei der Variante „Seitliche Panels““), `2f38830`
(gleichnamige Zeilen der Plugin-Liste tragen `#n` wie auf der Bühne), `09ccab8` („ohne die Kopie
von jetzt“ — ein Selektor, der auch spätere Kopien ausschließt, bräuchte eine Grammatik, die Schema
und Vorschau nicht sprechen), `ca64190` (die Kopfzeile vor `a06f654` zählt als zusammengelegt),
`f66105b` (der Rumpf von `custom.scss` der Vorlage nennt „Stile → Eigenes CSS“; nur im Repo, die
Pakete bekommen es mit P8) und `1b8cd65` (zwei Release-Schritte in P8 des Plans). Offen bleibt
die Frage, ob Messprotokolle in `docs/decisions/` von Wortersetzungen ausgenommen sind, und die
sechs Alpha-Szenen.

Die Frage zu den Messprotokollen hat der Nutzer am 2026-10-17 beantwortet: Messprotokolle in
`docs/decisions/` sind von Wortersetzungen ausgenommen (Regel in `conventions.md`). Offen bleiben
die sechs Alpha-Szenen.

**Das sechsundvierzigste Review** ([`REVIEW-2026-10-20.md`](REVIEW-2026-10-20.md), Auftrag
[`REVIEW-2026-10-20-auftrag.md`](REVIEW-2026-10-20-auftrag.md),
`review-2026-10-20..review-2026-10-21`: Block A die Fixes des fünfundvierzigsten, Block B die
umgeschriebenen Texte, die gekürzten Regeln und der Umbau der Variablen, Block C der Alpha-Test vor
1.1 und seine Fixes): **vom selben Modell wie die gelesenen Commits und wie der Auftrag** (Claude
Opus 5.5, in einem eigenen Agenten). 0 Hoch, 2 Mittel, 6 Niedrig; beide Mittel in Block B. Die
letzte Runde vor dem Release von 1.1. Abgearbeitet am 2026-10-18 auf `feat/1.1`, ein Befund je
Commit, je mit Typcheck, Build und Smoke (außer Niedrig 5, nur Doku):

- **Mittel 1** `b605556` — „Datei löschen?“ auf der Stile-Seite sagt wieder, dass nur git oder ein
  älterer Snapshot die Datei zurückholt (kein Snapshot, `rm`); die Kurzfassung der Dialog-Regel
  nennt den Fall „ein Snapshot, den nichts automatisch anlegt“ wieder. Nur am Bündel geprüft, der
  native Dialog nicht geöffnet.
- **Mittel 2** `5f53326` — die Herkunft einer Projekt-Variable kommt nur aus geladenen
  Stylesheets, das zuletzt geladene gewinnt (`loadedStylesheetsLastFirst`). An 16 Kopien: einzige
  Änderung `gt-pkw`, `base.scss` (18) → `foundation.scss`/`layout.scss`.
- **Niedrig 1** `41a4e1c` — eine Variable, die ein Stylesheet und die Seite setzen, behält den
  Grundwert des Stylesheets („geändert“ mit Zurücksetzen statt „eigene Variable“ mit Mülleimer).
  Kein Wertvergleich gegen das minifizierte Build-CSS.
- **Niedrig 2** `040a5c4` — „running“ erst, wenn auch der WebSocket-Port antwortet; ein fremder
  Server auf dem http-Port macht den Server nicht mehr „running“ (9,2 s → 28,3 s, als Quartz
  lauschte).
- **Niedrig 3** `b662a11` — `git status` hat 30 s Frist; das Band sagt „Der Git-Stand konnte nicht
  gelesen werden“ mit dem Grund. Vorher-Messung aus dem Review übernommen, nicht wiederholt.
- **Niedrig 4** `e25a17d` — ein laufender Install aus `quartz.lock.json` liegt im Hauptprozess (je
  `realpath`, ein zweiter Aufruf schließt sich an); die Übersicht nimmt ihn nach einem
  Routenwechsel wieder auf. Vorher 2 npm gleichzeitig und dreimal „Alles ok“ mitten im Install,
  nachher keins von beidem.
- **Niedrig 5** `e777f0e` — drei verlorene Halbsätze zurück in `conventions.md` (Breite in
  Spalten, Raster-Getter, Schritt ohne Ziel auf der eigenen Achse).
- **Niedrig 6** `a362b78` — ein Paket der 31 auf ein Projekt der zwölf lädt nur noch eine Form
  (`otherFormStylesheetsOf`, Plan-Satz `newerStyles`): 14 → 43 vorher, nachher 33 bzw. 14.

Offen aus dieser Runde, beim Nutzer: die **Nebenbei-Liste** des Dokuments (fünf Code-Kommentare,
die sich auf Sätze berufen, die nicht mehr in `CLAUDE.md` stehen; `backups.vsGitSync` sagt
„Snapshot ≠ Git-Sync“ nur noch halb; „ausgewichen wird nur vor anderen Ports“ in
`conventions.md`; `missingDependencies() === null` ohne eigenen Satz; der Ausweg „vom anderen
Rechner kopieren“ bei fehlenden Frames auf demselben Rechner; Herkunft und „eigene Variable“ nur
mit `public/`), dazu: Bei Niedrig 4 kann ein gescheiterter Install, wenn die Übersicht ihn
gestartet hat, nach einem Routenwechsel nur noch über den globalen Toast des ersten Aufrufs
gemeldet werden. Und die Empfehlung, vor P8 eine kurze Szene „QuartzControl beenden während
‚Installieren‘“ zu fahren.

**Keinen dieser Fixes hat ein Review gelesen.**

**Danach, auf Wunsch des Nutzers, die Nebenbei-Liste** (2026-10-18, `feat/1.1`), je ein Commit:

- `a5aa052` — vier Code-Kommentare nennen statt „CLAUDE.md“ die Datei unter `docs/decisions/`, in
  der ihre Regel heute steht; der fünfte (`Templates.tsx`) stimmt seit `e777f0e` wieder. Nur
  Kommentare, Typcheck.
- `20313e4` — `backups.vsGitSync` sagt wieder, wofür ein Snapshot und wofür Git-Sync da ist.
- `081d765` — die Regel zum Ausgabeordner sagt, wovor der Start ausweicht (vor allem außer einem
  fremden Quartz-Server desselben Projekts); gegen `buildService` geprüft.
- `316c6bc` — eine unlesbare `package.json` bekommt auf der Übersicht eine eigene Zeile, und
  „Alles ok“ wartet auf die Paketprüfung. Gebaute App, Klon von gui-test: vorher „Alles ok“ nach
  315 ms, nachher der neue Satz; heil und „1 npm-Paket fehlt“ unverändert.
- `b4252ef` — fehlen eigene Frames, nennt der Satz neben dem anderen Rechner den Snapshot (der
  `authored-frames` enthält). Gebaute App mit gelöschtem Ordner.
- `8b495a9` — der Rückgriff auf den Stylesheet-Wert aus Niedrig 1 läuft auch ohne `public/`; vorher
  war die Variable vor dem ersten Build wieder „eigene Variable“ mit Mülleimer. Gebaute App, Kanal
  und Variablen-Reiter mit und ohne Build.
- Der eigene Punkt zu Niedrig 4 braucht nichts: Der Aufruf, der den Install gestartet hat, meldet
  sein Scheitern über den globalen Toast, der den Routenwechsel überlebt, und die Übersicht zeigt
  danach wieder die rote Zeile.

Dabei aufgefallen, nicht erledigt: Die „Herkunft“ im Inspector des Variablen-Reiters sagt bei
`--tpl-header-pad` (Stylesheet und Seite) nur „geändert“, mit und ohne Build, und nennt das
Stylesheet nicht, dessen Wert „Zurücksetzen“ wiederherstellt. Ohne Build zählt „Alle Theme- und
Build-Variablen“ „67 von 67 überschrieben“, weil nur die eigenen Variablen da sind. Offen bleibt
die empfohlene Szene „QuartzControl beenden während ‚Installieren‘“ vor P8.

Beide Punkte vor P8 erledigt (2026-10-18), je ein Commit: `8d0234a` (die Herkunft einer
geänderten Variable nennt ihren Ursprung, etwa „Von dir geändert. Ursprung: Stylesheet
custom/layout.scss“) und `cf7e173` (ohne Build zählt die Liste keine Gesamtzahl und wiederholt
den Satz „noch kein Build-Output“). Gebaute App, Klon von gui-test, mit und ohne `public/`.

**Das siebenundvierzigste Review** ([`REVIEW-2026-10-21.md`](REVIEW-2026-10-21.md), Auftrag
[`REVIEW-2026-10-21-auftrag.md`](REVIEW-2026-10-21-auftrag.md), Block A
`review-2026-10-21..review-2026-10-22`, Block B `v1.0.2..review-2026-10-22`, gelesen von den Stellen
her, an denen sich 1.0.x und 1.1 begegnen): **vom selben Modell wie die gelesenen Commits und wie
der Auftrag** (Claude Opus 5.5, in einem eigenen Agenten). 1 Hoch, 3 Mittel, 7 Niedrig. Abgearbeitet
am 2026-10-18 auf `feat/1.1`, ein Befund je Commit; Typcheck, Build und Smoke bei jeder
Code-Änderung, die reinen Doku-Befunde ohne:

- **Hoch 1** `b94a01be` — ein Wert „nur hell“ in einem nicht umgestellten Projekt schreibt die Form
  von 1.0.1 (dunkel ausdrücklich), nicht die `:not()`-Regel, die 1.0.2 nicht kennt und beim
  nächsten Speichern löschte. Gebaute 1.1 und 1.0.2 an derselben Kopie: vorher 45 von 46 Variablen
  und die Regel gelöscht, nachher 46 und nur die gespeicherte geändert.
- **Mittel 1** `9e223ef7` — von Cache und mitgeliefertem Basis-Template gewinnt das mit dem neueren
  `createdAt`; vorher schlug ein Cache 1.0 offline ohne Frist das Paket 1.1 (31 statt 12
  Stylesheets).
- **Mittel 2** `32471bf3` — der Variablen-Graph legt ungeschichtete Werte eigener Stylesheets über
  Quartz und Theme; `--secondary` zeigt jetzt in beiden Modi den Wert der Website, und „nur dunkel
  ändern“ schreibt den richtigen hellen Wert mit.
- **Mittel 3** `3982dab9` — navigations 0.4.3 steht in `NAVIGATIONS_SAME_CODE` (`src` gleich 0.4.2),
  der Hinweis „Angaben können abweichen“ ist weg; mit 0.3.2 bleibt er. `release.md` 2b sagt, dass
  jede neue Plugin-Fassung auch die App braucht.
- **Niedrig 1** `7d6fbf27`, **Niedrig 2** `3aae5b5b`, **Niedrig 7** `b32c03bb` — Sätze für die
  Notizen in `release.md` Punkt 7: Paket 1.1 erst nach dem Update importieren, der Umbruch der
  Config zwischen den Fassungen, und vor dem Rückweg auf 1.0.x den Snapshot `styleMigration` in 1.1
  wiederherstellen. Nicht nachgemessen; die Zahlen sind die des Reviews.
- **Niedrig 3** `871f127a` — das Basis-Template wird mit `latest.json` in Punkt 8 gepusht, nach der
  Release-Seite, nicht in Punkt 4.
- **Niedrig 4** `dfec1735` — „die Vorlage installiert `main`“ steht jetzt als Entscheidung mit Grund
  (ein Ref friert die Updates-Seite ein) und Preis (ein Breaking Change verlangt neue Vorlagen am
  selben Tag).
- **Niedrig 5** `f5cafeb0` — Quartz' Zeile „Started a Quartz server listening at …“ gilt als
  zweiter Beleg neben dem WebSocket-Port; nach 5 s ohne beides sagt das Log, worauf gewartet wird.
  Ohne WebSocket vorher 40 s „starting“, nachher „running“ nach 9,1 s; der fremde Server des
  sechsundvierzigsten Reviews zählt weiter nicht.
- **Niedrig 6** `ecabd122` — die Regel zum Options-Schema nennt ihre Ausnahmen
  (`optionFormExtras.ts`, zwei Schlüssel in `editors.tsx`).

Dazu ein Commit für die Notiz zu den Breakpoints im Reiter „Frames“, die das Review vermisste, und
die zwei neuen Regeln: „Wer die Kaskade nachrechnet, rechnet die Schichten mit“ und „die Form von
1.0 heißt: nur, was 1.0.x lesen kann“.

Offen aus dieser Runde, beim Nutzer, die **Nebenbei-Liste**: Der Vorlagen-Import (Teil
`cssVariables` in `parts.ts`) kann einen Wert „nur hell“ als `:not()`-Regel in ein nicht
umgestelltes Projekt schreiben (dieselbe Lücke wie Hoch 1, anderer Schreiber); Einträge mit
`lightOnly` aus Testfassungen bleiben, bis ihre Zeile bearbeitet wird; `serverLogUnavailable` sagt
„lässt sich nicht mitschreiben“ statt „konnte nicht … werden“.

**Keinen dieser Fixes hat ein Review gelesen.**

**Danach, auf Wunsch des Nutzers, die Nebenbei-Liste** (2026-10-18, `feat/1.1`):

- `47c22f5f` — der Import schreibt einen Wert „nur hell“ in ein nicht umgestelltes Projekt in der
  Form von 1.0.1 (dunkel aus dem Variablen-Graphen des Ziels). Gebaute 1.1 und 1.0.2: vorher 45
  Variablen und die Regel gelöscht, nachher 46; ein umgestelltes Ziel behält die `:not()`-Regel.
- Alte `lightOnly`-Einträge aus Testfassungen brauchen nichts: Gesucht in allen 17 eingetragenen
  Projekten des Profils (ohne HinterlandHistory, das nicht gelesen wird) und in allen sechs
  `.qtpl` unter `~/Documents/QuartzProjekte` und `resources/templates`: keine
  `:root:not([saved-theme="dark"])`-Regel in einem nicht umgestellten Projekt, kein `lightOnly`
  in einem Paket. Solche Einträge konnten nur unveröffentlichte Fassungen vor `b94a01be`
  schreiben.

**Das achtundvierzigste Review** ([`REVIEW-2026-10-23.md`](REVIEW-2026-10-23.md), Auftrag
[`REVIEW-2026-10-23-auftrag.md`](REVIEW-2026-10-23-auftrag.md), Block A
`review-2026-10-22..review-2026-10-23`, Block B `v1.0.2..review-2026-10-23`, dazu Handbuch 4.4 bis
4.9 und die drei Plugin-Handbücher): **von einem anderen Modell** (Claude Fable 5.1) als die
gelesenen Commits und der Auftrag. 0 Hoch, 1 Mittel, 4 Niedrig; Urteil „veröffentlichbar“.
Abgearbeitet am 2026-10-18 auf `feat/1.1`, ein Befund je Commit, gemessen mit dem Messgeschirr des
Reviews (`h/lib.mjs` im Scratchpad seiner Sitzung) an den gebauten Fassungen 1.1 und 1.0.2;
Typcheck, Build und Smoke bei jeder Code-Änderung, die reinen Doku-Befunde ohne:

- **Mittel 1** `1e81d415` — der Import schreibt einen Wert „nur hell“ in ein nicht umgestelltes
  Projekt **ohne Build** jetzt ebenfalls in der Form von 1.0.1: Kennt der Graph den Namen nicht,
  kommt der dunkle Wert aus `theme.colors.darkMode` der Config (daraus erzeugt Quartz seine dunkle
  Regel), sonst gilt der helle in beiden Modi. Vorher `:not()`-Regel, 1.0.2 las 67 Variablen und
  löschte sie; nachher `--tertiary` dunkel `#2CAFAD` (mit Build `#2cafad`), 1.0.2 liest 69. Am
  echten Fall nachgestellt (Ziel ohne `public/`), nicht nur am erfundenen Namen des Reviews.
- **Niedrig 1** Vault `c8f71d0` — 4.5, 4.7, 4.8 (und das deutsche Glossar, derselbe Satz), 4.9 je
  Sprache: die Beschriftungen der App und „das Löschen legt keinen Snapshot an“ (nachgesehen in
  `styleService.deleteFile`). `check:handbook` 36 von 36; der Fett-Abgleich des Reviews meldet die
  drei Beschriftungen nicht mehr.
- **Niedrig 2** `1e01842a` — der Graph liest einen Wert bis zum `;` außerhalb von Zeichenketten,
  Klammern und Kommentaren. Folgenreicher als beschrieben: Ein „nur dunkel“-Edit von
  `--xfa-unfocused-field-background` (Theme `minimal`) schrieb den abgeschnittenen hellen Wert, und
  `_quartzcontrol.scss` übersetzte nicht mehr. Mit `s6b` gegen Chrome 2231 → 2233 gleich, der
  Graph sonst unverändert. `styleService.parseDeclarations` bleibt, weil das Schema in eigenen
  Werten kein `;` zulässt.
- **Niedrig 3** `721d43ce` — entschieden vom Nutzer: Das Basis-Template wird am Release-Tag nach
  der Fassungsnummer neu gebaut (`release.md` Punkt 4 mit den Befehlen; ob `--only 9,10` genügt,
  ist nicht gemessen). P8 verweist dorthin.
- **Niedrig 4** `95ac8595` — Halbsatz für die Notizen: Was 1.0.x in einem umgestellten Projekt
  ändert, gilt im dunklen Modus nur, wo 1.1 keinen dunklen Wert gesetzt hat. Nachgemessen
  (`--secondary` `#00aa00` aus 1.0.2, dunkel bleibt `#54d624`).

Keine neue Regel. Den Abschnitt des Reviews zur Arbeitsweise (rechnen, wo eine Messung hinsehen
muss; die Form von 1.0 an einem Schreiber statt an dreien; 1.0.2 als Leser in einem Prüfskript)
hat diese Runde nicht umgesetzt; er liegt beim Nutzer.

Offen aus dieser Runde, beim Nutzer, die **Nebenbei-Liste**:

- Der Variablen-Graph kennt Quartz' Palette ohne Build weiter nicht; der Reiter zeigt sie in einem
  nie gebauten Projekt nicht. Die Config als Quelle im Graphen deckte Reiter und Import zugleich
  (Mittel 1 hat sie nur im Import).
- Ein Name, den weder Graph noch Config kennen, ändert mit „beide Modi“ den dunklen Modus der
  Website (Theme-Variable bei ausgeschaltetem Theme, abgeleitete Quartz-Variable ohne Build).
- Der „nur dunkel“-Edit von `--xfa-unfocused-field-background` wird jetzt vom Schema abgewiesen,
  mit der Meldung „Das ist ein Fehler in QuartzControl“; dieselbe Meldung kommt, wer `;` oder `{`
  in ein Variablenfeld tippt — der Renderer prüft nichts vorher.
- `firstRuleBody` und die Regel-Ausdrücke in `parseVariableOverrides` (`[^}]*`) enden am ersten
  `}`, auch in einer Zeichenkette; in keinem gemessenen Projekt getroffen.
- Handbuch 3.5 (en) „whether **all** texts come along or only the changed ones“: Prosa, liest sich
  wie die alte Beschriftung von 4.9.
- Aus dem Review selbst: die Beschreibung des Online-Pakets („31 Stylesheets“), `?tab=css` und
  `?tab=layoutBoxes` fallen still auf den Sticky-State, „Inhalt“ als erster bzw. letzter Baustein
  (App gegen 4.9), `collectDeclarations` kollabiert Leerraum, `backups.kinds.styleMigration` roh in
  1.0.2.

**Keinen dieser Fixes hat ein Review gelesen.**

**Danach, auf Wunsch des Nutzers, die Nebenbei-Liste** (2026-10-18, `feat/1.1`):

- Palette ohne Build `3f8c5bb6` — **der erste Punkt der Liste war falsch**: Der Reiter kennt
  Quartz' Variablen auch ohne Build, aus dem Katalog `cssVariables.ts` (64 Namen, aus
  `theme.colors` abgeleitet). Falsch war stattdessen der Import seit `1e81d415`: Er hatte eine
  zweite, schmalere Kopie (nur die neun Palettenfarben). Der Katalog liegt jetzt in
  `shared/cssVariables.ts`, und `inFormOfTarget()` fragt ihn wie `baseValue()`. Gemessen:
  `--background-primary` „nur hell“ in ein Projekt ohne Build, vorher für beide Modi, nachher
  dunkel `#16171A`; 1.0.2 liest 70 Variablen.
- Ein Name, den weder Graph noch Katalog kennen, gilt weiter in beiden Modi: „nur hell“ verlöre den
  Wert auf dem Rückweg zu 1.0.x, und „beide Modi“ schreibt der Reiter selbst für eine unbekannte
  Basis. Übrig sind eine Theme-Variable bei ausgeschaltetem Theme und eine fremde Plugin-Variable
  ohne Build.
- Falsche Fehlermeldung `9a1ec9d5` — die Regel des Schemas steht als `isWritableCssValue()` in
  `shared/cssVariables.ts`; `save()` fragt sie vor dem ersten Schreiben und nennt die Variable.
  Über den Reiter gemessen (`#c0392b;color:red` in `--secondary`): vorher „Das ist ein Fehler in
  QuartzControl“, nachher „Nichts wurde gespeichert: Der Wert von --secondary enthält …“, die
  Stylesheets unverändert.
- `}` in Zeichenketten: nichts geändert. Die eigenen Werte können seit jeher kein `}` enthalten
  (Schema), und `firstRuleBody` liest bei keinem der acht Themes in gui-test anders als ein Leser,
  der Zeichenketten kennt (16 von 16 Basen gleich, Skript `first-rule.mjs` im Scratchpad).
- Handbuch 3.5 Vault `09597e7` — die zwei Buttons mit ihrem Namen, je Sprache.
- Aus dem Review: 4.9 listet „Inhalt“ zuerst wie die App (Vault `a2d5044`). Ohne Änderung, je mit
  Grund: die Beschreibung des Online-Pakets stimmt nach dem Push am Release-Tag; ein unbekannter
  `?tab=` fällt nach der Regel „URL zuerst, Sticky-State als Fallback“ zurück, und eine Zeile im Log
  des Renderers sähe kein Skript; `collectDeclarations` fasst Leerraum für die Anzeige zusammen, so
  steht es im Kommentar; der rohe Schlüssel in 1.0.2 lässt sich nicht mehr ändern und steht in den
  Notizen.

**Kurz gelesen vor dem Release** (2026-10-18, selbst, Diff und Umgebung, nicht an der App
gemessen): kein Fehler in `3f8c5bb6` und `9a1ec9d5`. `inFormOfTarget()` fragt Graph und Katalog in
der Reihenfolge von `baseValue()`, `||` statt `??` wie dessen `if (value)`. Behoben: Der Kommentar
von `defaultValueFor()` stand nach dem Umzug über `catalogDef()` (`bf785f1c`). Bleibt, wie es ist:
Ein Wert über 512 Zeichen lehnt weiter nur das Schema ab („Fehler in QuartzControl“), und bei einer
nur dunklen Änderung, deren heller Wert aus dem Theme ein Semikolon trägt, nennt die Meldung die
Variable, aber nicht, dass es der helle Wert ist.

**Das neunundvierzigste Review** ([`REVIEW-2026-10-24.md`](REVIEW-2026-10-24.md), Auftrag
[`REVIEW-2026-10-24-auftrag.md`](REVIEW-2026-10-24-auftrag.md), Block A
`v1.1.0..review-2026-10-24` (der Reiter „Formulare“ auf `feat/1.2`), Block B quartz-forms
`665f51f..e79aaa6`, Block C quartz-forms als Ganzes): **von einem anderen Modell** (Claude Fable
5.1), als Subagent gestartet. 1 Hoch, 3 Mittel, 10 Niedrig; Urteil „veröffentlichbar nach H1, M2
und N8, M1 und M3 als Vorbehalt ins README“. Abgearbeitet am 2026-10-19, alle vierzehn, ein Befund
je Commit; im Plugin jeweils `npm run check` mit der Relay-Suite und `dist/` im selben Commit, in
QuartzControl Typcheck, Build und Smoke. Gemessen mit dem Messgeschirr des Reviews (`review-fable/`
im Scratchpad seiner Sitzung: Klon, gebaute Kopie von gui-test, Relay unter `php -S`, Chrome und die
gebaute App über playwright-core). Im Plugin (unveröffentlicht; gepusht am 2026-10-19, CI grün):

- **Hoch 1** `449ef9d` — ein `consent`-Feld in einem Schritt mit `showIf` lehnt der Build ab
  (`consentInConditionalStep`); vorher galt die Schrittbedingung auch für die Einwilligung, und
  die Mail ging ohne sie hinaus. `dist/cli.js check` am Formular des Reviews: vorher nichts,
  nachher `fields[7]`, `relay` schreibt nichts.
- **Mittel 1** `8c9007b` — Hinweis `rateLimitLever` bei jedem Relay-Formular ohne geladenes Captcha
  und ohne PoW, das ein Plain-Post nicht überspringt (also bei den Vorgaben), und ein README-Absatz,
  was das Limit schützt. Ein zweiter Zähler je Quelle ist nicht gebaut; das ist eine Entscheidung.
- **Mittel 2** `0ef9f41` — lehnt das Relay den Stempel ab, holt das Skript ein neues Ticket, wartet
  `minSeconds` und sendet einmal neu; nebenbei gefunden und mit behoben: mit `pow` und
  gescheitertem Ticket beim Öffnen kam vorher bei jedem Versuch „zu schnell“. In Chrome gegen das
  Relay: beide Fälle des Reviews jetzt nach rund 1,1 s gesendet, vorher „Bitte laden Sie die Seite
  neu“.
- **Mittel 3** `3cffedd` — README-Absatz, was die Verschlüsselung nicht schützt; Hinweis
  `encryptionCaptcha` bei verschlüsselndem Formular mit Captcha.
- **Niedrig 1** `ccdd1f6` — entschieden für den README-Satz: ein `hidden`-Wert bekommt keine
  Schrittbedingung und kommt immer an; Paritätsfall, der mit dem alten Code in Skript und Relay
  scheitert.
- **Niedrig 2** `16d8a12` — `qf_refund()` gibt bei `502 mail` den Platz im Stundenzähler und die
  Markierung des Beweises zurück (zählen erst nach der Übergabe hielte das Schloss über den Versand).
- **Niedrig 5** `9d45a96` — der php der Musterprüfung bekommt keine `QF_`-Variablen.
- **Niedrig 7** `c4a63c2` — nur Doku: ein Hochladen über SFTP/FTP behält die 0600 von `config.php`
  nicht, und welche Rechte gehen. Die Adapter setzen weiter keinen Modus: ein erzwungenes 0600
  sperrte ein PHP aus, das als Nutzer des Webservers läuft.
- **Niedrig 8** `30ebede` — Statuszeile beider READMEs auf 0.4.0, ein Test hält sie an
  `package.json`.
- **Niedrig 9** `5da8ba8` — halbe und Drittel-Spannen in `@supports (container-type: inline-size)`;
  ohne Container-Queries nachgestellt (nicht in einem alten Browser) jedes Feld über die Zeile.

In QuartzControl (`feat/1.2`):

- **Niedrig 3** `a14d6f0d` — `remove()` und `move()` führen die offene Zeile mit; Szenario A des
  Reviews an der gebauten App: offen bleibt „Schritt 2 · Third“, vorher sprang es auf „Last“.
- **Niedrig 4** `bf49cc21` — ein abgelehnter Feldname behält Entwurf und Satz.
- **Niedrig 6** `cb85ef9c` — offene `qc-relay-*` gehen bei `will-quit`, liegengebliebene über einer
  Stunde beim Start. Der erste Messlauf entfernte dabei einen echten Rest (`qc-relay-5XRbId`),
  bevor er angesehen war.
- **Niedrig 10** `29ad988a` — unter quartz-forms 0.4.0 keine Seitenumbruch-Kachel, Breite,
  Anordnung und Bedingung nur, wo gesetzt, mit „wirkt nicht“; gemessen mit einem Klon von 0.3.0.

`check:plugin-copies` gegen den Klon auf dem neuen Stand (`c4a63c2`): 413 Fälle, alle gleich.
Keine neue Regel.

Nebenbei, ebenfalls im Plugin: `6f22df9` — die Relay-Suite beendete `php -S`, aber nicht seine
vier Worker; 20 Prozesse je Lauf, 1452 nach einem Tag (vor der Arbeit beendet). Jetzt eigene
Prozessgruppe, nach einem Lauf keiner übrig.

**Danach, auf Wunsch des Nutzers, die Nebenbei-Liste des Reviews** (2026-10-19), ein Punkt je
Commit; im Plugin `npm run check` mit der Relay-Suite (Vorher-Messung: der neue Test scheitert am
alten Code), in QuartzControl Typcheck, Build, Smoke und eine Messung an der gebauten App vorher
und nachher. Im Plugin (unveröffentlicht, unter „Unreleased“, nicht gepusht):

- `88af51a` — ein Optionswert mit Leerraum am Rand ist ein Build-Fehler (`optionSpace`);
  `dist/cli.js check` an `" a "`, `"x\t"` und `" "`: vorher nichts, nachher je ein Fehler.
- `97cf72b` — ein Wert, der kein String ist, eine Liste für ein Feld mit einem Wert und ungültiges
  UTF-8 heißen `malformed` mit eigenem Satz („Dieser Wert konnte nicht gelesen werden.“), im Relay,
  in den Locales und im Skript. `comment=a&comment=b`: vorher „Was könnte besser sein?: Bitte
  verwenden Sie das verlangte Format.“
- `00f7946` — `Reply-To` nimmt ein `email`-Feld mit `autocomplete: email`, wenn es eins gibt (sonst
  wie bisher das erste ausgefüllte); der Build schreibt die Kandidaten als `replyTo` ins Relay.
  Freund vor eigener Adresse: vorher `Reply-To` an den Freund, nachher an die eigene.
- `d46e63f` — kein „Schritt 1 von 1“: unter zwei zählenden Schritten bleibt die Zeile leer und
  verborgen. In Chrome an der gebauten gt-Kopie (Einwilligung dort in den ersten Schritt
  verlegt, H1): vorher „Schritt 1 von 1“, nachher leer, mit Häkchen „Schritt 1 von 2“.
- `5509f6e` — „no quartz-forms entry“ sagt, dass die `source` auf `quartz-forms` enden muss.
- `c7a85c9` — das Relay fragt den Captcha-Anbieter zuletzt, nach Feldern, Verschlüsselung und
  Empfänger: Ein unbekanntes Feld und ein verschlüsselter Post an ein unverschlüsseltes Formular
  kosteten vorher zwei Anfragen beim Anbieter (und verbrauchten das Token), nachher keine.
  Abgewiesene Posts mit *gültigen* Feldern kosten weiter je eine; das trifft nur ein Zähler je
  Quelle (M1), und der bleibt beim Nutzer.
- `13a2e7f` — die Nachricht von `e79aaa6` bleibt, wie sie gepusht ist; ein Kommentar an
  `node-version` im Workflow sagt, dass die Prüfungen auf Node 22 laufen und Node 24 das der
  Actions ist.

In QuartzControl (`feat/1.2`):

- `3192d649` — das eigene Captcha-Secret eines Formulars zieht beim Umbenennen mit
  (`moveCaptchaSecret` an `forms.relaySaveSecrets`, nachdem die neue Kennung in der Datei steht).
  An der gebauten App mit `safeStorage`-Ersatz: vorher blieb es unter `plain`, nachher unter
  `plainx`; ohne Secret kein Eintrag und keine Entschlüsselung.
- `cd6f06e0` — geprüft, was die Frage beim Entfernen eines Projekts sagt: nur „Der Ordner auf der
  Festplatte bleibt unangetastet.“, obwohl Main dabei Adressen und Captcha-Secrets des Relays
  löscht. Jetzt sagt sie es, wenn welche gespeichert sind (`relaySecrets` in der Projektübersicht,
  ohne Entschlüsselung gelesen; das Signatur-Secret allein zählt nicht).

Der Punkt „fremde `php -S`-Prozesse“ war schon `6f22df9`. `check:plugin-copies` gegen den Klon auf
`13a2e7f`: keine Abweichung. Nebenbei gesehen, nicht behoben: In `send.php` steht der Doc-Kommentar
von `qf_parse_form` über `qf_decoded_size`, zwei Kommentarblöcke hintereinander.

Beide Repos gepusht (CI des Plugins 39314020044 grün). Danach, auf Wunsch des Nutzers: **kein
Zähler je Quelle** (M1; er hielte etwas von der Adresse des Besuchers, bremste alle hinter einer
geteilten Adresse und ist mit IPv6 leicht zu umgehen), und **quartz-forms 0.4.1** (`81c957c`):
Versionen, Statuszeilen, CHANGELOG; die gt-Kopie baut damit, das erzeugte Relay sagt 0.4.1. In
QuartzControl `2a1bb7a5` — `FORMS_READ_AGAINST` 0.4.1, `check:plugin-copies` 413 Fälle gleich; der
Hinweis „kennt 0.4.0, installiert ist 0.4.1“ im Reiter vorher da, nachher nicht.

**Keinen dieser Fixes hat ein Review gelesen.**

**Das fünfzigste Review** ([`REVIEW-2026-10-25.md`](REVIEW-2026-10-25.md), Auftrag
[`REVIEW-2026-10-25-auftrag.md`](REVIEW-2026-10-25-auftrag.md), Block A quartz-forms
`e79aaa6..f5b6f94` (0.4.1 bis 0.5.4), Block B `review-2026-10-24..review-2026-10-25`, Block C das
Handbuch zu quartz-forms): **von einem anderen Modell** (Claude Fable 5.1), als Subagent gestartet.
0 Hoch, 3 Mittel, 6 Niedrig; Urteil „veröffentlichbar nach M1, M2 und M3“. Vorher, auf Wunsch des
Nutzers, die vier Nebenbei-Punkte der Handbuch-Arbeit als quartz-forms 0.5.4 (`40ad8b2`
`config.php` 0600 in beiden Zweigen, `1989365` „Seite:“/„Öffentlicher Schlüssel des Absenders:“
als Textschlüssel, `ad07128` du im README, `e5c38ef` Außenabstände in `guard.scss`).

Abgearbeitet am 2026-10-20, ein Befund je Commit, im Plugin jeweils `npm run check` mit der
Relay-Suite und Gegenprobe (der neue Test scheitert am alten Code):

- **M1** `1c0c0aa` — die Prüfung beim Verlassen eines Felds wartet, solange ein Zeiger im
  Formular gedrückt ist. Die Messung des Reviews (14 px) drückte außerhalb des Fensters (Button
  bei y = 986 in 900 px, der Druck traf `<html>`); neu gemessen bei scrollY 0 in 1200×1300: vorher
  rutschte der Button 28 px und der Klick ging auch mittig verloren, nachher nichts. Chromes
  Scroll Anchoring gleicht die Verschiebung nur aus, wenn die Fehlerzeile über dem Fensterrand
  liegt (51. Review, m1b: 802 → 802 px); liegen Feld und Button beide im Fenster, wählt Chrome
  einen Anker oberhalb, und der Button rutscht auch bei gescrollter Seite (m1c: 475 → 503 px).
- **M2** Vault `fab3ad8` — neues Demo-Schlüsselpaar aus gpg (ed25519/cv25519), Fingerabdruck in
  1.3 und 6.2; der private Schlüssel aus der gebauten Seite 6.2 entschlüsselt in gpg 2.5.22 die
  Ausgabe des Demo-Formulars aus Chrome. Plugin `8931309` — Hinweis (`notice`, hält den Bau nicht
  an) für X25519/X448 in der Form von RFC 9580; gemessen: OpenPGP.js-6-Schlüssel `curve25519` und
  `curve448` entschlüsselt gpg nicht, P-256 und RSA schon. QuartzControl `a9d33958` — der Reiter
  zeigt den Hinweis unter dem Schlüssel (gebaute App, vorher nichts, nachher der deutsche Satz).
- **M3** `97e5065` — kein Captcha bei `demo`; Chrome mit globalem Turnstile-Testschlüssel:
  vorher Container und Anfragen an challenges.cloudflare.com, nachher keine fremde Anfrage.
- **N1** `379b426` — eine Demo sagt immer „Nichts wurde gesendet“, `success.text` bekommt
  `demoNoEffect`.
- **N2** `0c7114a` — die Wiederholung nach abgelehntem Stempel rechnet den Beweis zur neuen
  Aufgabe; mit dem Messgeschirr des Reviews (Relay unter `php -S`, Geheimnis gewechselt): vorher
  „Die Prüfung vor dem Senden ist fehlgeschlagen.“, nachher beim ersten Klick gesendet.
- **N3** `6ae2f6a` — bei Diensten bleibt die Seite im Chiffrat (`_page` nur bei Klartext); README
  und 6.2 sagen, was neben dem Chiffrat reist.
- **N4** `b49142c` — ein Abschnitt zum Aussehen in beiden READMEs, ein Satz in 7.2 (Vault
  `8cdafa0`). Button-Farben und Feldrand bleiben außerhalb des Wächters (Entscheidung des
  Nutzers, 2026-10-20): Eine Website soll sie in `custom.scss` ohne spezifischere Selektoren
  ändern können.
- **N5** Vault `5c6e3de` — 5.2: QuartzControl schreibt `config.php` bei jedem Hochladen neu.
- **N6** `f221fb3` — `success` ohne `mode` ist `inline`.

Dazu **quartz-forms 0.5.5** (`777b758`) und QuartzControl `23ebb860` (`FORMS_READ_AGAINST` 0.5.5,
`check:plugin-copies` gegen eine Kopie des Handbuch-Projekts mit dem Checkout: keine Abweichung).
**Keinen dieser Fixes hat ein Review gelesen.**

Die Nebenbei-Liste, ebenfalls am 2026-10-20, ein Punkt je Commit:

- Zeitfalle bei `demo`: Plugin `d140f35` (`minSeconds` 0 in der Render-Config, wie das
  Captcha), Vault `ec277d0` (6.3).
- `<noscript>` der Demo: Plugin `053b855`, neuer Textschlüssel `demoNoScript` (auch bei
  verschlüsselnder Demo), Vault `5afb87d` (4.3, 9.1).
- 8.3 `yes` in Anführungszeichen: Vault `31e2b8e`, Begründung richtig (Quartz liest YAML 1.2,
  `yaml` 2.9.1 im Handbuch-Projekt gemessen: `yes` bleibt ein String).
- 9.2, acht fehlende Meldungen: Vault `5e66a5b`; `pgpPrivate` gemessen (privater Schlüssel unter
  `PUBLIC KEY BLOCK` liest OpenPGP.js 6 mit `isPrivate()` true).
- 6.3 `noScript` wirkt mit jedem Weg: Vault `2120350`.
- 2.1 `date`: Vault `dafb9d6`, `autocomplete`; in Chrome gemessen: kein Platzhalter
  („tt.mm.jjjj“), `maxlength` ohne Wirkung.
- Plain-Post gegen Skript: zwei Commits, `a97a0b7` (nicht angehaktes Kästchen als `[ ]` auch im
  Plain-Post) und `3dc2d33` (`qf_trim` statt `trim()` in `qf_serialize`); je ein Relay-Test, der am
  alten `send.php` scheitert.
- Drei Kopien von `forms.scss`: gemessen zwei gleiche Dateien (`component-…css` und
  `resource-style-…css`, je 6356 B; `index.css` trägt nur die Regeln der Vorlage) und **auch das
  Skript zweimal** (20 kB). `72af084`: `FormBox` ohne eigenes CSS und Skript, der Transformer
  bringt beides auf jede Seite (Quartz instanziiert jede Kategorie eines aktivierten Plugins).
  Gemessen an einem Bau des Handbuchs mit `layoutForm`: nachher je eine Datei, das
  Seitenformular hat 44 px, Raster, ist gebunden, sendet seine Demo, auch nach SPA-Navigation.
- `send.php`, Doc-Kommentar von `qf_parse_form`: `d704e37`.
- Ohne Änderung: 44 px gilt nicht für Kästchen, Radios und Skalen-Stufen (WCAG 2.5.8 über die
  Abstandsausnahme, 7.2 verspricht nur Felder und Buttons); `palette.mjs`, Abwägungen 3, 7 und 8,
  Plain-Post ohne JavaScript, Block B: nichts zu tun.

Dazu **quartz-forms 0.5.6** (`78c3244`) und QuartzControl (`FORMS_READ_AGAINST` 0.5.6,
`check:plugin-copies` gegen die Kopie des Handbuch-Projekts: keine Abweichung). Auch diese Fixes
hat kein Review gelesen.

**Das einundfünfzigste Review** ([`REVIEW-2026-10-26.md`](REVIEW-2026-10-26.md), Auftrag
[`REVIEW-2026-10-26-auftrag.md`](REVIEW-2026-10-26-auftrag.md), Block A quartz-forms
`f5b6f94..78c3244` (0.5.5 und 0.5.6), Block B `review-2026-10-25..review-2026-10-26`, Block C das
Handbuch zu quartz-forms `0c98b97..dafb9d6`): **von einem anderen Modell** (Claude Fable 5.1),
als Subagent gestartet. 0 Hoch, 0 Mittel, 4 Niedrig; Urteil „so veröffentlichbar“, 0.5.5 und
0.5.6 kein neues Glied der Regressionskette. Die Fixes des fünfzigsten Reviews hat es nachgemessen
und bestätigt (M1 in acht Lagen, M2 mit jeder verschlüsselnden Demo in gpg, M3 ohne fremde
Anfrage, `72af084` eine Kopie je Stylesheet und Skript, Mail von Skript und Plain-Post in fünf
Paaren wortgleich).

Abgearbeitet am 2026-10-20, ein Befund je Commit, im Plugin jeweils `npm run check` mit der
Relay-Suite und Gegenprobe (der neue Test scheitert am alten Code):

- **N1** `06fb52d` — die Prüfung beim Verlassen eines Felds wartet bei einem Druck irgendwo auf
  der Seite, nicht nur im eigenen Formular (`pointerdown` am Dokument, alle drei in der
  Capture-Phase). Gemessen mit `measure-m1c.mjs` des Reviews (Chrome, 1200×1300, zwei
  Relay-Formulare): vorher rutschte der Button von B 475 → 503 px und B blieb still, nachher
  475 px, B sendet, A zeigt den Fehler nach dem Loslassen; die M1-Messung im selben Formular
  unverändert.
- **N2** `f179fd9` — eigener Hinweis `pgpVersion6` für jeden Schlüssel der Version 6, vor dem des
  Algorithmus. Selbst nachgemessen: gpg 2.5.22 lehnt v6 P-256 und v6 RSA aus OpenPGP.js 6.3.2 ab
  („Ungültiger Schlüsselbund“), v4 P-256 importiert es; `cli key` über acht Schlüssel: vorher v6
  P-256/RSA ohne Hinweis, nachher alle drei v6 mit, v4 unverändert. Vault `4e56be1` (9.2).
- **N3** `0daf53d` — bei `demo` kein `siteKeyNeeded` und kein `encryptionCaptcha`, ein
  geschriebenes `minSeconds` bekommt `demoNoEffect`. `cli check --lang de` an `site-democap` des
  Reviews: vorher „turnstile braucht den Site-Key“ und der Satz vom Skript, das die Seite liest,
  nachher keins von beiden und „forms.b.spam.minSeconds: wirkt nicht bei demo“. Der Reiter legt
  den Satz ans Formular wie die bestehenden `pow`-Hinweise (gelesen, nicht an der App gemessen).
  Vault `009ae4d` (9.2).
- **N4** Vault `18d033c` — 5.1 und 6.3: die Tabellen geben der Demo keine Zeitfalle mehr, beide
  Sprachen.

`check:plugin-copies` gegen die Kopie des Handbuch-Projekts mit diesem Stand: keine Abweichung.
Die Fixes liegen in quartz-forms unter `[Unreleased]`; das Handbuch nennt sie „ab 0.5.7“.
**Keinen dieser Fixes hat ein Review gelesen.**

Die Nebenbei-Liste, ebenfalls am 2026-10-20, ein Punkt je Commit:

- M1-Satz oben in dieser Datei: `2b774c1a`. Scroll Anchoring gleicht nur aus, wenn die
  Fehlerzeile über dem Fensterrand liegt (m1b), sonst rutscht der Button auch bei gescrollter
  Seite (m1c).
- Ohne Formulare 26 kB: Plugin `d044ae4`, `externalResources()` liefert bei leerem `forms`
  nichts. Gemessen an einer Kopie von gui-test (`forms: {}`, Plugin aus dem Checkout): vorher
  verlinkte `index.html` `resource-after-1e45c622.js` (20 132 B) und zwei Stylesheets (6356 B und
  173 B), 465 Dateien; nachher keine der drei, 462 Dateien, die übrigen sechs Ressourcen gleich.
- Parität der Mail im Katalog: Plugin `eff79eb`, `mailCases` in `test/parity-cases.ts` (zwei
  Themen und zwei Zeilen Text, ein Thema als String im Plain-Post, nichts gefüllt, jeweils mit
  Seite und Kästchen). Die Client-Suite schreibt die Mail über `qfSerialize` (mailto), die
  Relay-Suite aus dem JSON-Post und aus dem Plain-Post. Gegenprobe: mit zurückgedrehtem
  `a97a0b7` scheitert der Relay-Fall des Plain-Posts in den beiden Fällen mit leerem Kästchen.
- 7.1 und 9.1: Vault `840c415`, bei `demo` zeigt `success` den Satz der Vorführung und leitet nicht
  um, beide Sprachen.
- README-Statuszeile: Plugin `f1d562b` (fünf unabhängige Reviews).
- 404 ohne `/quartz-forms`: **nicht das Plugin, keine Änderung.** Gemessen mit dem `serve.mjs`
  des Reviews an seinem Bau (Chrome headless): Die 404er kommen nur von
  `spaNavigate('/quartz-forms/tags')` ohne Schrägstrich am Ende. `tags/index.html` lädt mit
  `../`, und Quartz rechnet die Pfade gegen die angefragte URL um (`normalizeRelativeURLs(html,
  url)` in `spa.inline.ts`). Mit `/tags/`, über einen Klick auf `../2-felder/` und beim Laden
  keiner. Im Bau verweist kein Link ohne Schrägstrich auf eine Ordnerseite; ein Wikilink
  `[[ordner]]` oder `[x](../ordner)` erzeugte einen (52. Review, N3), und nach dem Klick darauf
  zeigt jeder Link der Seite ohne `/quartz-forms`.
- Die zwei `GNUPGHOME`s `gpg51` und `gpg51m2` sind gelöscht (`gpg51` hielt nur den
  veröffentlichten Demo-Schlüssel `3EEC…D91B`).
- Ohne Änderung: `test/keys.ts` (bewusst), `docs-check.mjs` (Heuristik), `encryptionCaptcha`
  und `minSeconds` bei `demo` (in N3).

Dazu **quartz-forms 0.5.7** (`fd9c411`) und QuartzControl `44c6e004` (`FORMS_READ_AGAINST` 0.5.7,
`check:plugin-copies` gegen die gui-test-Kopie mit dem Checkout: keine Abweichung). Keinen der
Fixes von 0.5.7 hat ein Review gelesen.

**Das zweiundfünfzigste Review** ([`REVIEW-2026-10-27.md`](REVIEW-2026-10-27.md), Auftrag
[`REVIEW-2026-10-27-auftrag.md`](REVIEW-2026-10-27-auftrag.md), Block A quartz-forms
`78c3244..fd9c411` (0.5.7), Block B `review-2026-10-26..feat/1.2`, Block C das Handbuch
`dafb9d6..840c415`): **von einem anderen Modell** (Claude Fable 5.1), als Subagent gestartet.
0 Hoch, 0 Mittel, 3 Niedrig; Urteil „so veröffentlichbar“, 0.5.7 kein neues Glied der
Regressionskette; vorher zwingend nur, das Handbuch-Projekt von 0.5.6 zu heben. Nachgemessen und
bestätigt: N1–N4 der vorigen Runde, im Reiter an der laufenden App (v6-Hinweis in der Zeile des
Schlüssels, beim Demo-Formular zwei Hinweise und kein Site-Key), `d044ae4` samt Nachladen im
Dev-Server, `check:plugin-copies` gegen eine Kopie des Handbuch-Projekts.

Abgearbeitet am 2026-10-20, ein Punkt je Commit, im Plugin jeweils `npm run check` mit der
Relay-Suite und Gegenprobe (der neue Test scheitert am alten Code):

- **N1** `27c91d7` — ein Druck endet auch mit `blur` des Fensters und `visibilitychange` auf
  `hidden`. Gemessen in Chrome headless an der Handbuch-Kopie des Reviews (`review/review-52`,
  `rv-relay`): Druck auf die Überschrift, Tab aus „bad“, `blur` des Fensters; altes Skript ohne
  Fehler bis zum Loslassen, neues sofort mit Fehler. Das `blur` ist **von Hand ausgelöst**:
  Playwrights Chrome verliert den Fokus nie (Fokus-Emulation; weder eine zweite Seite noch ein
  Wechsel zum Finder per `osascript` kam an). Ein echter Fensterwechsel ist nicht am OS gemessen.
- **N2** `225f3c8` — vierter Mail-Fall: Beschriftungen als `{en, de}`, deutsche Seite, ein Feld
  `detail`, dessen Bedingung nicht hält (gepostet und vom Relay gestrichen), und `pgpKey`. Alle
  drei Wege schreiben dieselbe Mail; mit falschem Text im Katalog scheitern beide Suiten.
- **N3** ohne Änderung, **kein Issue bei Quartz** (Entscheidung des Nutzers). Die sechs Vaults
  unter `~/Obsidian/QuartzProjekte` enthalten keinen Wiki- oder Markdown-Link auf einen Ordner
  ohne Schrägstrich (Python-Scan, Gegenprobe mit einem gepflanzten `[[8-rezepte]]` und
  `[x](../8-rezepte)`: beide gefunden). Der Satz oben ist ergänzt (`1cf0599e`).

Die Nebenbei-Liste:

- `transport.url`/`extra` bei `demo` unter globalem Relay: Plugin `1e05c46`, gesagt wird nur, was
  das Formular schreibt oder ein globaler `demo`-Versand hat (auch die `extra`-Hinweise von
  `relay` und `mailto` folgen der Regel). `resolveOptions`: vorher zwei Hinweise an Formular `b`,
  nachher keiner. Vault `c5f8a13` (9.2).
- Notiz zu einem unbekannten Formular im Dev-Server ohne Stylesheet: Plugin `3b3707f`, mit
  `--serve` liefert das Plugin Stylesheet und Skript auch bei leerem `forms`. Gemessen mit
  `quartz build --serve`: vorher `border: none 0px`, Farbe `rgb(51, 51, 51)`, nachher `dashed 2px`,
  `rgb(176, 32, 32)`; ein Bau ohne `--serve` (gui-test, `forms: {}`) verlinkt weiterhin keine der
  drei Ressourcen.
- README-Statuszeilen: Plugin `a34e63c` (sechs Reviews).
- `pressed` je Formular: **ohne Änderung.** Jedes Formular braucht ohnehin seine eigene
  Warteliste; ein Handler je Formular und Druck ist der Preis dafür (Geschmack, sagt das Review
  selbst).
- Website auf 0.5.6, GNUPGHOMEs, nicht am OS Gemessenes: siehe unten bzw. nichts zu tun.

Dazu **quartz-forms 0.5.8** (`34d77d5`) und QuartzControl `c1e27d9a` (`FORMS_READ_AGAINST` 0.5.8,
`check:plugin-copies` gegen die Kopie des Handbuch-Projekts mit dem Checkout: keine Abweichung).
Keinen der Fixes von 0.5.8 hat ein Review gelesen.

Nach dem Push (2026-10-20) das Handbuch-Projekt mit `npx quartz plugin install --latest
quartz-forms` von `78c3244` (0.5.6) auf `34d77d5` (0.5.8) gehoben und über die gebaute App mit
Wegwerf-Profil gebaut (`build.run`, Exit 0, 270 Dateien, keine Warnung). In Chrome jede der 30
Seiten mit Formular geöffnet: 30 Formulare gebunden, keine Konsolenfehler. **Veröffentlicht ist
die Website nicht**: Das Projekt hat noch kein Veröffentlichungsziel (`publish-targets.json`
fehlt, `boxi-os.github.io/quartz-forms` antwortet 404); das gehört zum Release von 1.2.

**Das dreiundfünfzigste Review** ([`REVIEW-2026-10-28.md`](REVIEW-2026-10-28.md), Auftrag
[`REVIEW-2026-10-28-auftrag.md`](REVIEW-2026-10-28-auftrag.md), Block A quartz-forms
`fd9c411..f8d46a7` (0.5.8 und 0.5.9), Block B `review-2026-10-27..feat/1.2` (die vier Änderungen
am Reiter „Formulare“), Block C das Handbuch von quartz-forms `840c415..c5f8a13`, Block D der
nicht committete Abschnitt im QuartzControl-Handbuch): **von einem anderen Modell** (Claude Fable
5.1), als Subagent gestartet. 0 Hoch, 1 Mittel, 9 Niedrig; Urteil „mit 1.2 veröffentlichbar“,
vorher M1 (mit N3), N7 und N6. Gemessen an der gebauten App mit Wegwerf-Profil gegen Kopien von
gui-test und dem Handbuch-Projekt; im Plugin 233 Tests grün.

Abgearbeitet am 2026-10-21, ein Punkt je Commit, jeweils mit dem Messgeschirr des Reviews
(`driver53.mjs`, auf dieses Repo und ein eigenes Profil umgebogen) vorher und nachher:

- **M1** `2823f8e0` — der Bericht des Markierungsskripts trägt seinen Selektor, die Seite stempelt
  ihn mit dem Frame; er zählt nur, solange beide die gezeigten sind. Der Sprung wird einmal über
  `announce()` gesagt, die Statuszeile behält die Markierung, ein Reload desselben Frames leert sie
  nicht mehr. Die Entscheidung über den Sprung ist State je Selektor, die Zeile schweigt bis dahin.
  Vorher je Wechsel fünf Änderungen, zwei falsch, zwei Rebuilds sagten den Doppelsatz dreimal;
  nachher leer → Ansage des Sprungs → „Markiert: …“, zwei Rebuilds (4 Berichte) ändern die Zeile
  nicht. Nimmt **N3** mit (ein Bericht des alten Selektors entscheidet nicht mehr; nur gelesen,
  das Review traf das Fenster in 25 Versuchen nicht).
- **N1** `97afbbbc` — `pageFormUse` liest `draft`/`publish` wie remove-draft und explicit-publish;
  eine Seite, die ein eingeschalteter Filter auslässt, steht unter „Einbinden“ mit dem Grund statt
  „Zeigen“ und ist kein Sprungziel. Nennt die Liste die gezeigte Seite und fehlt das Formular dort,
  sagt die Zeile „… kommt auf dieser Seite nicht mehr vor. „Neu suchen“ liest die Seiten erneut.“
  explicit-publish nur gelesen.
- **N2** `759f040e` — die Entscheidung über den Sprung ist Sticky-State neben der Seite; eine
  eingetippte Seite übersteht den Weg über die Übersicht. Abwählen vergisst sie, aber erst, wenn
  dieser Mount eine Auswahl hatte (beim Lesen der Config ist keine da). M1-Szenen wiederholt.
- **N4** `d3b393b8` — ein Text wird geschrieben, wie er getippt ist, auch leer; „Plugin-Wortlaut“
  nimmt einen eigenen Text zurück. Vorher `" oder "` → `oder`, Leeren löschte; nachher
  `" oder "` bleibt, Leeren schreibt `""`. Dass das Plugin beides so zeigt, ist gelesen
  (`wording()`).
- **N5** `f6f7876b` — **zweiter Vorschlag des Reviews:** Welcher von `de` und `de-DE` oben liegt,
  entscheidet die Sprache der einzelnen Seite (`lang`, sonst der Locale der Website); der Abschnitt
  sagt bei mehreren Einträgen einer Sprache, welchen er bearbeitet.
- **N6** `2ce2467b` — Zeile unter `messagePage`/`messageKey`: das Relay schreibt jede
  unverschlüsselte Nachricht selbst, auch mit JavaScript (im Plugin nachgelesen:
  `encrypted: false, fields`, `qf_serialize`). Handbuch von quartz-forms 9.3 de/en `fd5c196`.
- **N7** Handbuch-Vault `2952547` (beide Sprachen: Teile zum Aufklappen, Vorlagenfelder, Texte ab
  0.5.9, die springende Vorschau, Entwürfe unter „Einbinden“) und `a3a4cb9` (Rückweg aus N9).
  Keine Änderung in diesem Repo.
- **N8** `0838f07e` — „keine Felder“ kommt auf dem Pfad des Formulars; `partOf()` liest diese eine
  Meldung an ihren Worten (de/en) und gibt sie „Felder“. Gemessen mit Skript 061 des Reviews,
  nur die deutschen Meldungen.
- **N9** `5ab36338` — „Felder der Vorlage „…“ nehmen“ unter der Liste eines Formulars mit Vorlage
  und eigenen Feldern, mit Rückfrage; der Hinweis über der Liste nennt den Weg. Abbrechen nur
  gelesen.

Aus der Nebenbei-Liste miterledigt, weil derselbe Code: „Zeigen“ bei Entwürfen (N1) und die
Wiederholung von „Markiert: …“ nach jedem Reload (M1). Offen und dem Nutzer genannt: der Sprung in
die andere Sprache (`list[0]`), der Neu-Lesen-Cache für `texts`, `FORMS_TEXTS_SINCE` gegen einen
Git-Checkout, eine Platzhalter-Prüfung im Plugin, `partOf` ohne `'more'`, die README-Statuszeilen
des Plugins, dazu aus dieser Runde: `check:plugin-copies` sieht `entryKey`, `PART_OF`, `NO_FIELDS`
und `RELAY_OWN_WORDS` nicht, und das Plugin könnte „keine Felder“ unter `forms.<id>.fields` melden.

**Die Nebenbei-Liste danach, auf Wunsch des Nutzers** (je Punkt ein Commit, gemessen an der
gebauten App mit dem Messgeschirr des Reviews):
- Sprung `c29eb2d1` — die Seite mit den meisten gemeinsamen Ordnern statt `list[0]`; von
  `en/8-recipes/01-contact` geht „Umfrage“ jetzt auf `en/8-recipes/04-survey` (`lang` en-US),
  von der deutschen Seite bleibt er deutsch. Sprache über Suffix oder Frontmatter sieht das nicht.
  Handbuch-Vault `508565c`.
- Cache `906c0517` — die Texte je `cli.js`, Schlüssel ist ein Hash des Inhalts (npm setzt allen
  Dateien dieselbe mtime). Je Aufruf vorher 93 ms, nachher 0–1 ms; ein geändertes `cli.js` liest
  neu. Die 0,5 s des Reviews waren hier nicht zu sehen.
- `FORMS_TEXTS_SINCE` `f007f679` — gefragt wird jedes Plugin; die Version sagt nur, was bis zur
  Antwort und bei „unbekannter Befehl“ steht. Preis: ein Kindprozess je Öffnen bei echtem 0.5.8.
- Platzhalter: quartz-forms `c2479b9` (fehlender und unbekannter Platzhalter als Hinweis, leerer
  Text gilt als gewollt), Plugin-Handbuch `af0d76d`, `8b32fae`.
- `'more'` `c650b45a` — eine Meldung zu einem Schlüssel außerhalb von `FORM_KEYS` steht unter
  „Unbekannte Schlüssel“; gemessen mit einer Attrappe der Kommandozeile, das Plugin hat keine.
- READMEs quartz-forms `2afe547`, `55efb5a`.
- `check:plugin-copies` `800b2000` — `entryKey`, `primary`, `RELAY_OWN_WORDS` ziehen nach
  `formsOptions.ts`; neuer Block mit 326 Fällen (FORM_KEYS, PART_OF, NO_FIELDS, entryKey gegen
  `wording()`, RELAY_OWN_WORDS gegen `qf_serialize`), Gegenprobe mit fünf Abweichungen.
- „keine Felder“ unter `fields`: quartz-forms `bb66b1c`, in der App nur der Kommentar
  (`ec08b6db`); `NO_FIELDS` bleibt für 0.5.9 und älter.

Die Plugin-Änderungen sind unveröffentlicht (nach 0.5.9). Nicht angefasst, weil nicht genannt:
die Felder-Liste beim Zuklappen und `extra` unter globalem `demo` aus der Nebenbei-Liste des
Reviews.

**Das vierundfünfzigste Review** ([`REVIEW-2026-10-29.md`](REVIEW-2026-10-29.md), Auftrag
[`REVIEW-2026-10-29-auftrag.md`](REVIEW-2026-10-29-auftrag.md), `feat/1.2` `e6c385b8..afe5b90a`
und `fix/1.1.x` `6ff44e45`: Modi beim Hochladen, die Abfrage des Relays nach dem Upload,
`countersServed`): von Claude Opus 5.5 als frisch gestarteter Subagent, ohne den Verlauf der
Sitzung. 1 Hoch, 6 Mittel, 8 Niedrig; Urteil: `6ff44e45` kann mit dem nächsten 1.1.x raus, die
übrigen Commits nicht ohne H1 und M1 bis M5. Gemessen an der gebauten App in einem Klon, mit
`debian-vm` als Hoster und einer Attrappe auf 127.0.0.1.

Abgearbeitet am 2026-10-21, ein Befund je Commit, gemessen an der gebauten App (Wegwerf-Profil,
`app.mjs`/`h1.mjs`/`m6.mjs`/`attrappe.mjs` im Scratchpad) gegen `debian-vm`, vorher und nachher:

- **H1** `922c3adf` — Unterordner „.“, „..“ und leer werden abgewiesen (`relaySubdir`, Schema,
  Feld, `runDirectoryUpload`); vorher setzten alle drei Wege den Zielordner 2750 auf 755.
- **M1** quartz-forms `88352a8`, `59b77701` — das Ticket sagt `counters`; unter mod_php mit
  `counters/` des Accounts sagt die Seite in Amber, dass das Relay nichts zählt.
- **M2** `3d1bd55d` — `runDirectoryUpload` vergisst das Manifest des Relays vor jedem Lauf; alle
  drei Wege setzen die Modi jedes Mal (Entscheidung des Nutzers: QuartzControl setzt immer).
- **M3** quartz-forms `df007c1`, `9600308e` — gefragt wird `counters/qf-probe.count`, nicht die
  `.htaccess`, die Apache und nginx auch dort ablehnen, wo die Zähler offen liegen.
- **M4** `ab046463` — Satz und Button nach der Abfrage richten sich nach dem hochgeladenen Modus;
  der Schalter allein heißt nicht mehr „aktuell“, der Button lädt gleich neu hoch.
- **M5** `72f74b2a` — `noPhp`, wenn send.php als Text kommt, und dann die Frage nach `config.php`.
- **M6** `5dcfb3f6` auf `fix/1.1.x`, gemergt in `172e61ba` — einmal je SFTP-Ziel `chmod 0644`
  für früher hochgeladene Dateien (474 von 475 standen auf 0666), 3,9 s mit acht Anfragen
  zugleich; „seit 1.0.0“. Das Relay bleibt auf `feat/1.2` davon ausgenommen.
- **N1** quartz-forms `606a31c`, `aa11091a` — `generation` je Lauf im Ticket; eine Adresse, unter
  der ein anderes Relay antwortet, heißt `otherRelay` statt „antwortet“.
- **N2** `68f0dc8f` — 403, 502 bis 504 und eine 500 mit eigener Seite je ein Satz; der Button nur
  noch bei der leeren 500.
- **N3** `153d5ec7` — nach `unreachable` keine Zähler-Abfrage (22,0 s → 12,5 s).
- **N4** `572611ee` — Abbruch bei 64 KiB; eine begonnene, langsame Antwort heißt nicht „keine
  Antwort“.
- **N5** `0dfb85e6` — `net::ERR_CERT_…` als Satz über das Zertifikat.
- **N6** `ae20e646` — eine Weiterleitung auf eine andere Origin nennt ihr Ziel.
- **N7** `5afd124d` — Doku: Nachtrag in der Langfassung, Absatz in `publishing-and-credentials.md`,
  kurze Regel (das Ordner-Ziel setzt keine Ordnermodi, gemessen), Kommentar in `deploy/types.ts`.
- **N8** `43e800d1` — `modeNote` vergleicht mit `0o7777` und nennt das ganze Oktal; über FTP
  bleiben Sonderbits unsichtbar (basic-ftp liest sie nicht).

Unveröffentlicht: quartz-forms `88352a8`, `df007c1`, `606a31c` (nach 0.5.10; `FORMS_READ_AGAINST`
steht noch auf 0.5.10). Nicht gepusht. Offen und dem Nutzer genannt: die Nebenbei-Liste des
Reviews (rsync und verschachtelte Unterordner, Formulare mit eigener `transport.url`, englische
Meldung des Relays im deutschen Satz, doppelte Ansage, `modeNote` wirft bei gescheitertem `stat`,
Pool-Benutzer ≠ Upload-Benutzer, Kommentar „caught above“) und aus dieser Runde: der Status-Hash
ohne die Einstellungen des Betreibers, kein Weg, das Secret des Relays neu zu erzeugen, PHP mit
`display_errors=1` (200 statt 500), andere Chromium-Codes roh, Weiterleitungen innerhalb der
Origin und das Ordner-Ziel ohne Ordnermodi.

Die Nebenbei-Liste, am selben Tag auf Wunsch des Nutzers abgearbeitet, je ein Commit mit Messung
an der gebauten App (Absätze in `publishing-and-credentials.md`):

- **rsync und verschachtelte Unterordner** `4cdced36` — genau dieser Fehler wird einmal mit
  `--rsync-path="mkdir -p … && rsync"` wiederholt (nicht bei jedem Lauf, wegen `rrsync`).
- **`rsyncConflict` mit `rel === ''`** — mit H1 erledigt (Unterordner „.“ wird abgelehnt).
- **Formulare mit eigener `transport.url`** `a2bcef12` — gefragt wird das erste Relay-Formular
  mit Adresse, unter seiner Adresse.
- **Englische Meldung des Relays** `fc9f8357` — `unknown_form` ist `otherRelay`, `origin`,
  `secret_config` und `mbstring_config` je ein Satz.
- **Doppelte Ansage** `893bfa2f` — eine Region; gemessen mit einem MutationObserver, nicht mit
  einem Screenreader.
- **`modeNote` wirft bei gescheitertem `stat`** — offen. Die Messung (SFTP-`stat` auf der VM für
  einen Test-Account sperren, ersatzweise `stat` in der gebauten App ersetzen) hat die
  Rechteprüfung abgelehnt; ohne Messung nicht geändert.
  Nachgetragen: gemessen am esbuild-Bündel mit einem Stub-Client, dann behoben (siehe unten).
- **Kommentar „caught above“** `edd43620`.
- **Pool-Benutzer ≠ Upload-Benutzer** `d670c6ed` — PHP-FPMs eigenes 404 „File not found.“ heißt
  `phpCannotRead`.
- **Status ohne die Werte des Betreibers** `e3184875` — Stempel aus `operatorOf()` und einem
  HMAC-Fingerabdruck der Geheimnisse, ohne Entschlüsseln.
- **Kein neues Secret** `7a45caec` — „Neues Secret erzeugen“ unter „Selten gebraucht“
  (`renewSecret`); das Handbuch nennt den Button noch nicht.
- **`display_errors=1`** `0072bc0e` — `phpMessage` mit der Meldung von PHP.
- **Andere Chromium-Codes** `ddeaaedf` — fünf gemessene Codes als Satz, der Rest roh.
- **Weiterleitung innerhalb der Origin** `c49faf5c` — gemessen: 301/302 machen aus dem Absenden
  ein GET; `postRedirect`.
- **Ordner-Ziel ohne Ordnermodi** `a5df184c` — setzt sie jetzt wie SFTP; kurze Regel angepasst.

Neu nebenbei aufgefallen: Ein `'` im Pfad eines rsync-Ziels bricht den Pfad, den rsync an die
entfernte Shell gibt (nur Leerraum wird abgelehnt).
