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

## Befunde aus den Reviews (Stand 2026-09-18)

Alle fünfundzwanzig Listen sind abgearbeitet. [`docs/REVIEW-2026-09-02.md`](REVIEW-2026-09-02.md),
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
[`docs/REVIEW-2026-09-29.md`](REVIEW-2026-09-29.md) mit seinen neun (Aufträge daneben in
`docs/REVIEW-2026-09-05-auftrag.md`, `-06-` bis `-29-`) stehen als
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
und eine eigene Runde. Zwei Befunde waren reine Beschreibungsfehler: Das Schloss deckt die
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

