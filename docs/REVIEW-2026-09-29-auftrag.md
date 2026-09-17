Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist. Es geht um ein
Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Was diese Runde anders macht

**Der Diff hat drei Schichten, die nichts miteinander zu tun haben.** Die erste sind die zwölf
Commits, mit denen die sieben Befunde des vierundzwanzigsten Reviews und drei Punkte seiner
Nebenbei-Liste abgearbeitet wurden — dieselbe Kette wie in den sechs Runden davor, Kern-Update und
Drag-Ansagen. Die zweite ist neu in dieser Serie: **eine Runde, die kein Review angestoßen hat,
sondern der Nutzer.** Drei Sätze über die Darstellung — ein Knopf bricht um, eine Seite ist
schlecht verteilt, eine Box ist zu groß —, dazu ein Handbuch-Kapitel in zwei Sprachen und zehn
Screenshots im Vault. Lies die zwei mit derselben Frage, aber nicht mit derselben Erwartung: Die
erste ist an Bündeln und an der gebauten App gemessen, die zweite an der gebauten App und an zwei
Fensterbreiten, und sie hat keine Attrappe und kein Prüfskript hinter sich.

**Die dritte ist diese Datei selbst, oder genauer ihre Nachbarin: `CLAUDE.md` ist geteilt worden.**
Sie war auf 189 KB gewachsen und bekam dafür eine Warnung. Heraus sind zwei Dateien gewandert,
jeweils **wörtlich**: die Review-Chronik nach `docs/reviews.md` (100 KB) und der Regelteil nach
`docs/conventions.md` (66 KB), letzterer über `@docs/conventions.md` von `CLAUDE.md` eingebunden.
`CLAUDE.md` ist damit 25 KB. **Das ist die Schicht, die dich am meisten angeht**, denn sie ändert,
was eine Sitzung überhaupt liest: Greift die Einbindung nicht, gilt eine Regel, die niemand mehr
vor Augen hat. Der Satz daneben („lies die Datei zuerst“) ist der Rückfall dafür, und er ist
**nicht gemessen** — meine eigene Sitzung hatte `CLAUDE.md` längst gelesen, als sie sie geteilt
hat.

**Diese Runde geht an ein anderes Modell als die Commits.** Alle zwölf Commits, die drei
Darstellungsänderungen und dieser Auftrag stammen von Opus 5; das Review davor (`docs/REVIEW-2026-09-28.md`)
von demselben Modell aus einer anderen Sitzung, und es sagt das in seinem zweiten Absatz selbst. Du
bist ein anderes. Das ist der Fall, den der Vorbehalt des zweiundzwanzigsten Reviews wollte — nutz
ihn: Was hier als Begründung dasteht, ist nicht mit dir abgesprochen.

**Die Paketliste des Kern-Updates ist wieder anders gebunden** — `git log -G<name>` je Paket,
gefragt vor dem Merge. **Die Nachträge dazu in `docs/decisions/snapshots-and-updates.md`
hintereinander zu lesen ist der beste Weg in diese Runde** (Zeilen 295, 340, 402, 433, 473). Jede
Bindung hat eine Tür geschlossen und eine geöffnet; such die Lage, die keine von ihnen trifft.
**Und entscheide unterwegs, die wievielte es ist**: Nach der Aufzählung des letzten Auftrags waren
es vier („an den SHA, ohne SHA, mit Räumung nach npm, jetzt mit `packageJsonCommittedSince`“), also
ist diese die fünfte; das Review davor nennt seinen eigenen Vorschlag dagegen „die sechste Bindung
derselben Liste“. Eine der zwei Zahlen ist falsch, und das ist in diesem Projekt ein Befund.

**Eine Vorgabe aus der Vorrunde ist an einer vierten Stelle überschrieben worden.** `isHome` hat
seit dem dreiundzwanzigsten Review eine Vorgabe (Ids vergleichen) und seit diesem eine
Überschreibung am Layout-Board. Prüf, ob die Überschreibung die Lücke wirklich schließt — ihr
Kommentar nennt selbst einen Fall, den sie **nicht** abdeckt.

In der Zählung von `CLAUDE.md` ist das das fünfundzwanzigste Review. Die Dateinamen zählen nach
Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie einbindet** — dort stehen seit dieser Runde
die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik der Reviews in
`docs/reviews.md`. Lies dann
`docs/REVIEW-2026-09-28.md` — die sieben Befunde, deren Fixes du liest, samt den Messungen, die sie
belegen, und seine Liste „Nebenbei aufgefallen“, von der drei Punkte mit erledigt sind (der vierte
bleibt bewusst stehen, 12 ms). Der Auftrag dazu steht in `docs/REVIEW-2026-09-28-auftrag.md`.

## Umfang

Alles auf `main`. Die zwölf Commits der ersten Schicht sind gepusht, die fünf danach **nicht**.
Von `review-2026-09-29` bis `review-2026-09-30`:

    git log --oneline review-2026-09-29..review-2026-09-30
    git diff review-2026-09-29..review-2026-09-30 -- . \
      ':!docs/REVIEW-2026-09-28.md' ':!docs/REVIEW-2026-09-29-auftrag.md'

Ausgenommen sind zwei Dateien: `docs/REVIEW-2026-09-28.md` (das Review, das du liest, statt es zu
prüfen — allein +452) und diese Auftragsdatei.

**Die Zahlen, und woran sie gezählt sind.** Gezählt ist gegen den Arbeitsbereich, **bevor** der
Commit existiert, der diese Datei trägt — also ohne ihn. Das ist der wiederkehrende Befund dieser
Serie (sechzehntes, zwanzigstes, dreiundzwanzigstes Review); hier steht er als Warnung statt als
Behauptung. Rechne nach:

    # alle drei Schichten, ohne Review-Dokument und Auftrag: 16 Dateien, +2498 / −2080
    #
    # Schicht 1, die zwölf Commits (review-2026-09-29..ae79bdc~1):
    #   11 Dateien, +327 / −75
    #     davon App-Code (electron/, src/):      7 Dateien, +186 / −66
    #     davon docs/decisions/:                 2 Dateien,  +51 / −0
    #     davon CLAUDE.md:                       1 Datei,    +82 / −9
    #     davon docs/release.md:                 1 Datei,     +8 / −0
    #
    # Schicht 2, die drei Darstellungsänderungen (alle in src/):
    #    5 Dateien, +199 / −130  —  mit `git diff -w`: +84 / −15
    #
    # Schicht 3, die geteilte CLAUDE.md:
    #    3 Dateien, +2054 / −1884  (netto +170)
    #      CLAUDE.md            +27 / −1884
    #      docs/conventions.md  +749  (neu, 749 Zeilen)
    #      docs/reviews.md     +1278  (neu, 1278 Zeilen)

**Die drei Schichten addieren sich nicht auf die Gesamtzahl, und das ist kein Fehler**: 327 + 199 +
2054 sind 2580, nicht 2498. Die Differenz von 82 Zeilen (und 9 gelöschten) ist der Absatz, den
Schicht 1 an `CLAUDE.md` angefügt hat und den Schicht 3 nach `docs/reviews.md` weitergeschoben hat
— im Gesamtdiff gegen den Tag steht er einmal, in der Schichtrechnung zweimal. Wer die Zahlen
prüft, prüft sie je Schicht gegen ihre eigene Basis.

**Zwei Zahlen darin sind Einrückung und Umzug, nicht Arbeit.** Erstens: Der ausklappbare Block in
`src/routes/Styles/CustomCss.tsx` ist um vier Spalten eingerückt worden, weil er jetzt in einem
`{open && ( … )}` steht — lies die Datei mit `git diff -w`, sonst liest du 271 geänderte Zeilen,
von denen 226 nichts sagen. Zweitens: Von Schicht 3 sind 1984 Zeilen derselbe Text an einem anderen
Ort. **Nachprüfbar, und zwar wörtlich** — die Umwandlung, die dabei stattgefunden hat, betrifft nur
die Ziele der Markdown-Links (`](docs/…)` wurde `](…)`, weil die zwei Dateien selbst in `docs/`
liegen):

    # Chronik, Rückumwandlung gegen den Stand vor der Teilung (2640ef0 = `main` vor dieser Runde):
    git show 2640ef0:CLAUDE.md \
      | sed -n '/^## Befunde aus den Reviews/,/^## Claude-Skills/p' | sed '$d' > /tmp/alt-chronik
    sed -n '/^## Befunde aus den Reviews/,$p' docs/reviews.md \
      | sed -E 's#\]\((docs/)?#](docs/#g' > /tmp/neu-chronik
    diff /tmp/alt-chronik /tmp/neu-chronik        # gemessen: keine Ausgabe

    # Regelteil, dasselbe ab '### Prozessgrenze':
    git show 2640ef0:CLAUDE.md \
      | sed -n '/^### Prozessgrenze/,/^## Wo die Messungen stehen/p' | sed '$d' > /tmp/alt-regeln
    sed -n '/^### Prozessgrenze/,$p' docs/conventions.md \
      | sed -E 's#\]\((docs/)?#](docs/#g' > /tmp/neu-regeln
    diff /tmp/alt-regeln /tmp/neu-regeln          # gemessen: "733d732 <", eine leere Zeile

**Beide Aufrufe sind gelaufen, bevor sie hier standen.** Der Regelteil unterscheidet sich um genau
eine leere Zeile: Im alten Block stand sie vor der nächsten Überschrift, in `docs/conventions.md`
endet die Datei ohne sie. Der erste Anlauf dieser Gegenprobe nahm `review-2026-09-29:CLAUDE.md` als
alten Stand und Zeilennummern statt Mustern — falsch in beidem, weil Schicht 1 an derselben Datei
82 Zeilen geändert hat. Gegengerechnet habe ich zusätzlich in Python, über den ganzen Block statt
über `sed`: „wörtlich gleich: True“, je Datei.

**Einen Hash für den Commit, der diese Datei trägt, nennt sie nicht** — er kann nicht in sich
selbst stehen. `git rev-parse review-2026-09-30^{commit}` beantwortet die Frage genauer.

`review-2026-09-29` sitzt auf `37e5348` („Der Auftrag fuer das vierundzwanzigste Review“), dem
Stand, den das letzte Review gelesen hat. Die Commits:

| Woher | Commit | Worum es geht |
| --- | --- | --- |
| Befund 1 | `4fc87ff` | **Was `abortCoreMerge` antwortet, lesen jetzt beide Aufrufer** |
| Befund 2 | `4f37cca` | **`listTakenInHandSince`: `git log -G<name>` statt `rev-list` auf die Datei** |
| Befund 3 | `156bca6` | „fehlen oder stehen mit einer anderen Version da“ statt „stehen nicht mehr in package.json“ |
| Befund 4 | `d201fb0` | „n Commits fehlen“ hängt an der Zahl, nicht am Zustand |
| Befund 5 | `03847a1` | **Der Schlüssel des Lauf-Schlosses ist ein `realpath`** |
| Befund 6 | `e5e1099` | **`isHomeOnBoard`: der Paletten-Chip wohnt im Vorrat** |
| Befund 7 | `7380b71` | vier Sätze und zwei Kommentare richtiggestellt |
| Nebenbei 1–3 | `ec9381a` | git nennt die Dateien selbst; der Snapshot-Schalter wird genannt; `busy` ist ein Thunk |
| — | `d254c11` | `docs/release.md`: was `check:handbook` nicht sieht |
| — | `caea2f0` | zwei Nachträge in `docs/decisions/` |
| — | `07f2cff` | `CLAUDE.md`: die Regeln dieser Runde |
| — | `2640ef0` | das Review-Dokument selbst (ausgenommen) |
| Schicht 2 | `ae79bdc` | **Der Aktualisieren-Knopf der Serverliste bleibt in einer Zeile** |
| Schicht 2 | `8497e9c` | **Die Vorlagen-Seite gibt ihre Breite in Spalten aus** |
| Schicht 2 | `539f091` | **„Aktuell geltende Farben und Schriften“ beginnt eingeklappt** |
| Schicht 3 | `c0e5e11` | **`CLAUDE.md` geteilt: `docs/conventions.md`, `docs/reviews.md`** |
| — | — | dieser Auftrag, samt dem Absatz über diese Runde in `docs/reviews.md` |

**Zum Stand der zweiten und dritten Schicht**: Sie sind committet, aber nicht gepusht, und ihre
vier Commits haben kein Review gesehen. Steht in `git log` etwas anderes als hier, gilt `git log`.

**Im Handbuch-Vault liegt etwas von dieser Runde** — anders als bei den letzten drei:
`~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`, ein eigenes git-Repo, beim Schreiben
unkommittiert. Vier `.md` (+11/−8) und zehn PNG: `4-gestaltung/05-eigenes-css.md`,
`4-gestaltung/09-vorlagenpakete.md` und ihre englischen Zwillinge, dazu acht neu aufgenommene
Screenshots und zwei neue. **Lies dort, schreib dort nichts.**

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung — siehe „Wie gemessen werden kann“, bevor du eine Kopie anfasst.

## Was du wissen musst, bevor du liest

**Lies Commit-Nachrichten als Behauptungen.** In diesem Projekt gilt eine Zahl in einer
Commit-Nachricht als Messung; trägt sie nicht, ist das ein Befund.

**`npm run smoke` startet gegen das echte Profil dieses Rechners.** Das Review davor hat es
deswegen nicht laufen lassen; ich habe es dreimal laufen lassen (42 Aufrufe, grün). Es navigiert
nur, aber die Einschränkung gilt weiter: Wer es laufen lässt, öffnet damit die echten Projekte
dieses Rechners.

**Ein Fenster wird auf diesem Bildschirm nicht breiter als 1470 px.** `setContentSize(1728, …)`
liefert 1470 (Inhaltsspalte 1220 px) — gemessen, und der Grund, warum eine der Änderungen unten
einen Zweig hat, der hier nie gerendert wurde. Dasselbe gilt für die Höhe (923 px, Eintrag
`screenshots` in `CLAUDE.md`).

**Abwägungen, die ich selbst getroffen habe — prüf, ob sie tragen:**

- **Der umbrechende Knopf ist an der Aufrufstelle behoben, nicht im Primitive.** Ursache: Als
  Flex-Kind einer Kartenkopfzeile ist `<Button>` ein Block, und Tailwinds Preflight setzt
  `svg { display: block }` — das Icon stand in einer eigenen Zeile, der Knopf war 45 statt 32 px
  hoch. Gemessen im Baum: **138 `<Button>`-Aufrufe, 13 davon mit einem Icon als Kind. Vier lösen es
  mit `inline-flex` am Knopf, neun mit einem `<span className="…flex…">` darin, einer löste es gar
  nicht** — der hier. Zwei Formen für ein Problem, und das Primitive kennt keine davon. Ich habe
  die Form der vier genommen, weil sie an der Nachbarstelle steht (`Settings`, `Updates`,
  `Marketplace`). **Prüf, ob das die richtige Ebene ist** und was ein `inline-flex items-center`
  in `Button` selbst kosten würde — 138 Aufrufstellen, davon 125 ohne Icon.
- **Die Vorlagen-Seite liegt nicht mehr nebeneinander.** Vorher: `xl:grid-cols-2`, gemessen
  1041 px linke Karte gegen 140 px rechte bei 1470 px Fenster. Jetzt zwei Karten über die ganze
  Breite, und die Breite geht in eine mehrspaltige Bausteinliste (`md:columns-2 2xl:columns-3`).
  Drei Fragen daran: **(a)** Die Leiter ist eine Stufe später als an den zwei Stellen, die dasselbe
  schon tun (`GitSync`, `Publish/index.tsx`: `sm:columns-2 xl:columns-3`) — der Kommentar sagt
  warum, prüf die Begründung. **(b)** `2xl:columns-3` ist auf diesem Rechner **nie gerendert**
  worden; der Zweig ist gelesen, nicht gemessen. **(c)** Die Leserichtung ist jetzt spaltenweise.
  `DISPLAY_ORDER` nennt sich „Reading order for the user … what the site looks like first, what it
  is built from after“ — die zweite Hälfte steht jetzt *neben* der ersten. Trägt der Kommentar noch?
- **Und daneben, älter als diese Runde**: `DISPLAY_ORDER` in `src/routes/Templates.tsx` führt elf
  Bausteine, `TEMPLATE_PART_IDS` zwölf. `content` fehlt in der Anzeigeordnung, bekommt aus
  `indexOf` also `-1` und sortiert vor allem anderen — was die Seite zeigt („Inhalt“ zuerst) ist
  damit ein Zufall, und der nächste Baustein, den jemand hinzufügt, springt genauso nach vorn. Ich
  habe das nicht angefasst; es ist mir beim Zählen für einen Kommentar aufgefallen (der zuerst
  „elf“ sagte).
- **Die Box „Aktuell geltende Farben und Schriften“ ist eingeklappt, und ihr Zustand hängt an
  `useStickyState`** — also am Store des Fensters, nicht auf der Platte. Vorgabe eingeklappt, weil
  der Nutzer genau das verlangt hat. Zwei Preise: Eingeklappt steht eine **neue** Zeile darunter
  (`styleEditor.current.summary`), und die IPC-Abfrage `styles.fontFaces` läuft weiter, obwohl
  nichts davon zu sehen ist — sie liefert die Schriftnamen für diese Zeile.
- **Die Zahl in dieser Zeile ist eine Konstante.** „9 Farben für hell und dunkel“ kommt aus
  `SUMMARY_COLORS.length`, nicht aus dem Projekt. Mein Argument: Es ist die Zahl der Zeilen, die die
  Tabelle darunter zeigt, und die ist immer dieselbe. **Prüf, ob der Satz damit etwas über das
  Projekt behauptet, das falsch sein kann** — eine Variable, die sich nicht auflösen lässt, steht in
  der Tabelle als „—“ und zählt hier mit.
- **Die Überschrift ist der Schalter.** `CardHeading` bekommt einen `<button>` als Kind
  (`<h2>` → `<button>`, `aria-expanded`, Chevron dahinter). Damit bleibt die Regel „eine Karte hat
  eine Überschrift, und die hat ein Icon“ erfüllt, aber das Icon selbst ist kein Klickziel.
  Gelesen, nicht mit einem Screenreader gemessen.
- **Die zwei Spaltenüberschriften heißen jetzt „Farben“ und „Schriften“** (vorher „Aktuell geltende
  Farben“/„… Schriften“), weil die Karten-Überschrift beides schon nennt. Das ändert zwei Namen, die
  das Handbuch fett zitiert — deshalb die Vault-Änderung. `check:handbook` sieht das **nicht**: Es
  prüft Blockzitate, und das waren fette Namen im Fließtext.
- **Im Handbuch ist dabei ein Satz mitgefallen, der schon vorher falsch war.** „Ein Klick fügt den
  Namen als Variablenverweis ein, ein Klick auf ein Farbfeld den Wert“ — das tut die
  Variablen-Referenz rechts neben dem Editor; diese Box **kopiert** (`copyHint`: „Klicken, um … zu
  kopieren“). Steht jetzt anders da. **Prüf beide Fassungen gegen den Code**, und prüf den neuen
  Halbsatz „die App merkt sich das, bis das Fenster zugeht“ gegen `useStickyState`.
- **Die Screenshots sind mit `--project` neu aufgenommen, der erste Anlauf ohne.** Ohne Angabe
  nimmt `scripts/screenshots.mjs` „das erste Projekt, dessen Name auf `Example` endet“ — alle
  übrigen Handbuch-Bilder zeigen aber `QuartzControl-Handbuch`. Der erste Lauf hat also vier Bilder
  gegen das falsche Projekt aufgenommen; sie sind überschrieben. **Ob eine Vorgabe, die vom Rest
  des Handbuchs abweicht, eine Vorgabe sein soll, ist eine offene Frage** — sag, wenn du sie für
  einen Befund hältst.
- **Zwei Kartenbilder habe ich nach dem Lauf zurückgesetzt** (`…--callout-farben-hell.png`,
  `…--callout-colors-hell.png`): Sie zeigen die Variablen-Referenz, die diese Runde nicht angefasst
  hat, und unterschieden sich nur im Bildrauschen. Das ist eine Entscheidung über den Vault-Diff,
  keine Messung.

## Worauf es ankommt, in dieser Reihenfolge

### 1. `listTakenInHandSince` (`4f37cca`) — die nächste Bindung derselben Liste

Gefragt wird jetzt je Paketname mit `git log --max-count=1 -G<needle> <sha>..HEAD -- package.json`.
Drei Dinge daran:

- **Der Fluchtmechanismus.** `entry.name.replace(/[\\.*+?^${}()|[\]]/g, '\\$&')` — und die
  Kommentarbegründung sagt, dass die Frage „welcher Regex-Dialekt“ offen bleibt, solange das Muster
  keine Alternative enthält. Prüf, ob das für das Fluchten selbst auch gilt: In gits Vorgabe
  (POSIX basic) bedeuten `\+`, `\?` und `\(` das **Gegenteil** von „wörtlich“. Welche Zeichen in
  einem Paketnamen aus einer fremden `package.json` überhaupt vorkommen können, ist die zweite
  Hälfte der Antwort.
- **Die drei Commits, die es aussparen soll** (eigener Commit an anderer Stelle, upstreams Commits
  nach einem handaufgelösten Merge, der Amend der App). Der Kommentar begründet jeden einzeln.
  Such einen vierten Commit, der die Liste fallen lässt, ohne dass jemand die Paketfrage beantwortet
  hat — und einen, der sie stehen lässt, obwohl jemand sie beantwortet hat.
- **Der Lauf sagt es jetzt, wenn er eine Liste fallen lässt** (`updatePackagesDropped`), aber nur,
  was `stillMissing` **nach** npm noch findet, und gerechnet wird das **nach** dem Amend. Prüf die
  Reihenfolge: Kann der Satz etwas nennen, das der Amend gerade committet hat?

### 2. Was der Abbruch antwortet (`4fc87ff`) — zwei Seiten, ein Kanal

`abortCoreMerge` antwortet mit Satz statt zu werfen, und beide Aufrufer lesen ihn jetzt:
`Updates.tsx` schreibt ihn in `coreResult`, `GitSync.tsx` in ein eigenes `abortNote`. Prüf:

- Auf der Updates-Seite bleibt bei `success: true` **mit** Satz der Kasten stehen — der Kommentar
  sagt, nur der glatte Erfolg dürfe „eine veraltete Kiste räumen“. Stimmt das für den Fall
  „Abbruch hat geklappt und dabei eine vorgemerkte Datei weggeworfen“?
- Auf Git-Sync stehen `abort.error` und `abortNote` nebeneinander, letzteres in `font-mono` ohne
  Farbe. Ein verweigerter Abbruch und ein geglückter mit Verlust sehen damit gleich aus.
- Und der eine Satz, den beide Seiten von dort bekommen können, ist der des Schlosses. Er sagt
  jetzt „drücke dann ‚Erneut prüfen‘“ — ein Knopf, den es auf Git-Sync nicht gibt.

### 3. Der Schlüssel des Schlosses (`03847a1`)

`lockKey` ist `realpath`, mit `resolve` als Rückfall. Drei Fragen: Der Schlüssel entsteht jetzt
**hinter einem `await`** — liegt zwischen `has` und `add` noch etwas? Was passiert, wenn zwei
Anrufer denselben Ordner in verschiedener Großschreibung nennen (der Kommentar nennt das als
bewusst offen, gemessen auf APFS)? Und was, wenn `realpath` für den einen Anrufer gelingt und für
den anderen nicht?

### 4. `isHomeOnBoard` (`e5e1099`)

Die Überschreibung gilt nur am Layout-Board; die Vorgabe (Ids) gilt weiter für Frame-Builder,
`Plugins/Installed` und `Styles/CustomCss`. Der Kommentar nennt einen Fall, den er ausdrücklich
nicht abdeckt: eine **platzierte** einzige Instanz, die auf dem Vorrat abgelegt wird und dabei
nichts tut. Welchen Satz sagt die Live-Region dann? Und prüf die Wechselwirkung mit `firstOver` und
`movedAway` — die drei Zweige in `onDragOver` sind in drei verschiedenen Runden entstanden.

### 5. Die zweite Schicht an der Oberfläche

Drei Änderungen, drei Fragen:

- **`DiscoveredServers`**: Der Knopf ist 32 px hoch und einzeilig (gemessen, vorher 45). Gibt es
  eine zweite Stelle im Baum, an der ein Icon in einem Block-Kontext steht und niemand es bemerkt
  hat — außerhalb von `<Button>`?
- **`Templates`**: Zwei Karten über die ganze Breite, Bausteine in Spalten. Gemessen bei 1470 px
  (Export 1041 → 645 px, Seite 1232 → 984 px) und bei 1280 px, beide Male zwei Spalten, dunkel;
  hell über die Handbuch-Screenshots bei 1440 px. Mit geladenem Paket (echtes `doku.qtpl`, Dialog
  im Hauptprozess gestellt): Import-Karte 743 px, keine Zeile über eine Spaltengrenze. **Nicht
  gemessen: unter 768 px** (eine Spalte) und der `2xl`-Zweig.
- **`Styles/CustomCss`**: Karte eingeklappt 73 px, ausgeklappt 373 px (vorher 335 — die
  Überschriftenzeile kommt dazu), Seite 1425 → 1163 px. Prüf, was der ausgeklappte Zustand über
  einen Routenwechsel und über einen Projektwechsel hinweg macht: Der Schlüssel ist
  `styles.css.activeStyles`, und `useStickyState` ist pro Pathname benannt — der Pathname enthält
  die Projekt-ID.

### 6. Die geteilte `CLAUDE.md`

Drei Fragen, in dieser Reihenfolge:

- **Ist wirklich nichts verlorengegangen?** Die Gegenprobe steht oben. Prüf sie in beide
  Richtungen: Steht jede Regel, die vorher in `CLAUDE.md` stand, in `docs/conventions.md`, und
  steht in `docs/conventions.md` nichts, was vorher nicht dastand?
- **Greift `@docs/conventions.md`?** Das ist die Frage, die ich nicht beantworten kann — meine
  Sitzung hatte die alte Datei gelesen. Wenn deine Fassung von Claude Code den Import auflöst,
  müsstest du die Regeln ohne eigenen `Read` kennen; wenn nicht, hat der Rückfallsatz daneben seine
  Existenz verdient. **Sag, was bei dir passiert ist** — das ist die einzige Messung dieser Schicht,
  die nur von außen zu machen ist.
- **Stimmen die Sätze, die um die Naht herum stehen?** Vier Stellen sind angefasst: die Einleitung
  des Regelabschnitts in `CLAUDE.md`, der Abschnitt „Die Reviews“ (der die Arbeitsregel behalten
  hat, weil sie sagt, wie gearbeitet wird und nicht was war), die Kopfabsätze der zwei neuen
  Dateien, und der Satz über die 22 Kommentare im Code, die eine Regel mit „CLAUDE.md“ belegen und
  bewusst stehenbleiben. Die Zahl 22 (in 15 Dateien) ist gemessen; prüf sie.

### 7. Die Dokumente (`7380b71`, `ec9381a`, `d254c11`, `caea2f0`, `07f2cff`)

Zwei Nachträge in `docs/decisions/`, sechs neue Regeln und ein Absatz über die Runde in
`CLAUDE.md`, acht Zeilen in `docs/release.md`. Jede Zahl darin ist eine Messung oder ein Befund.
Diese Runde hat vier Sätze der Vorrunde richtiggestellt — prüf, ob die neuen Fassungen stimmen, und
ob die zwei Kommentare, die dabei umgeschrieben wurden, jetzt das beschreiben, was der Code tut.
Und: Der Absatz über diese Runde beschreibt die zweite und dritte Schicht **nicht**, wenn der
Auftrags-Commit ihn nicht mitbringt — und er stünde jetzt in `docs/reviews.md`, nicht in
`CLAUDE.md`. Sieh nach, an beiden Orten.

### 8. Was die Prüfskripte nicht sehen

`npm run typecheck`, `build`, `smoke` (42 Aufrufe), `check:i18n` (1126 + 182 Schlüssel),
`check:handbook` (26 Zitate), `check:core-update` (14 Pläne, 3 npm-Aufrufe), `check:semver`
(18 Vergleiche) und `check:plugin-names` (18 Namen, **ohne** die Gegenprobe gegen Quartz' eigene
Funktion — die braucht einen Projektpfad als Argument) sind auf diesem Stand grün. Keines sieht:
eine Notiz, den Status, das Schloss, einen Merge, einen Amend, einen Tastatur-Drag, eine
Spaltenumbruchstelle, eine Kartenhöhe, einen fetten Namen im Handbuch-Fließtext, ein Bild darin —
**und keines sieht, ob `CLAUDE.md` ihre eigene Nachbardatei noch einbindet.** Was misst du, das sie
nicht messen?

## Wie gemessen werden kann

- **Der Dienst ohne App**: esbuild-Bündel von `updateService.ts` (`--bundle --platform=node
  --format=cjs --tsconfig=tsconfig.node.json --external:electron`), `electron` über einen Stub.
  Gegenseite ist ein lokales Bare-Repo mit den bekannten Ständen; der Klon bekommt
  `git remote add quartz-upstream <pfad>`, und `git symbolic-ref` im Bare-Repo lässt
  `git fetch quartz-upstream HEAD` ohne Netz antworten. Für den **Status** ohne Netz:
  `GIT_CONFIG_COUNT=1`, `GIT_CONFIG_KEY_0=url.<bare>.insteadOf`,
  `GIT_CONFIG_VALUE_0=https://github.com/jackyzha0/quartz.git` — dann geben alle vier Zustände eine
  Antwort. Für eine Vorher-Messung ein zweites Bündel aus `git archive review-2026-09-29`; **kein
  Worktree**, dann bleibt das Repo unberührt.
- **npm und npx als Attrappen auf dem PATH**, in drei Betriebsarten: schreibt, scheitert, schreibt
  nichts.
- **Die gebaute App nicht-interaktiv**: `npm run build`, dann ein eigenes Playwright-Skript im
  Scratchpad, das `playwright-core` über den absoluten Pfad lädt
  (`_electron.launch({ executablePath: <node_modules/electron/dist + path.txt>, args: [REPO,
  '--user-data-dir=<wegwerf>'] })`), danach `page.emulateMedia({ colorScheme: null })`, Fenstergröße
  über `app.evaluate(({BrowserWindow}) => …setContentSize(w, h))`, Projekt über
  `window.quartzGui.projects.add(pfad)`, Routen über `location.hash`. Im Repo liegt dafür keine
  Datei. Den nativen Dateidialog stellt man im Hauptprozess
  (`dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [f] })`), den
  Bestätigungsdialog genauso — das ist dann **nicht am OS gemessen**.
- **Ein Projekt zum Anfassen**: `cp -Rc` von `~/Documents/QuartzProjekte/navigations-testprojekt`
  in den Scratchpad. `content/` ist dort ein Symlink in einen echten Vault — in der Kopie unter
  `content/` nichts schreiben, auch keine mtimes.
- **Die Screenshots**: `npm run screenshots -- --only <teil> --cards --lang de|en --project <id>`
  schreibt in den Vault. Ohne `--demo` läuft es gegen das echte Profil, setzt dort die Sprache und
  stellt sie danach zurück (auch den Zustand „kein Schlüssel“). Nach den vier Läufen dieser Runde
  steht `language: 'system'` — ein Wert, den kein Lauf geschrieben hat; das Zurückstellen hat also
  getragen. Wer es nachmisst: `~/Library/Application Support/QuartzControl/settings.json`.
- **Nicht gemessen** und deshalb offen für dich: die **gepackte** App; das gebaute Handbuch
  (`resources/handbook/`, siehe unten); der `2xl`-Zweig der Spalten; Fensterbreiten unter 768 px;
  ein Screenreader an der neuen Überschrift und an den Drag-Ansagen; der Maus-Drag; ERESOLVE; ein
  echter Push unter Git-Sync; die VMs und die Linux-Pakete; die Notiz über einen Restore oder ein
  Duplikat hinweg; zwei Anrufer des Schlosses in verschiedener Großschreibung desselben Ordners.

## Was diese Runde offen gelassen hat

1. **Das mitgelieferte Handbuch ist nicht neu gebaut.** `resources/handbook/` ist ein Artefakt,
   liegt nicht im Repo und entsteht bei `npm run build:handbook` bzw. beim Packen. Bis dahin zeigt
   das Handbuch **in der App** den alten Text und die alten Bilder, während der Vault den neuen
   trägt. Dasselbe gilt für das PDF (`build:handbook-pdf`). Das steht in `docs/release.md`; prüf, ob
   es dort vollständig steht.
2. **Der Vault ist nicht committet** (4 `.md`, 10 Bilder), und das Repo war es beim Schreiben
   dieser Datei auch nicht.
3. **Die Bildunterschrift auf der Vorlagen-Seite des Handbuchs ist nachgezogen, das Kapitel selbst
   nicht.** Der Screenshot zeigt jetzt den Export ganz und den Import nur angeschnitten; das
   Kapitel beschreibt beide Hälften im Text. Es gibt Kartenbilder dafür
   (`vorlagen--vorlage-anwenden-hell.png`), aber **kein Kapitel des Handbuchs bindet bisher ein
   Kartenbild ein** — das wäre ein neues Muster, und ich habe es nicht angefangen.
4. **Der vierte Punkt der Nebenbei-Liste des Vorgängers bleibt stehen**: Die Übersicht liest den
   Status bei jedem Mount, und `outstandingCoreInstall` läuft vor `lsRemoteHead` statt daneben.
   12 ms, bewusst gelassen.
5. **Ob `@docs/conventions.md` aufgelöst wird, ist nicht gemessen.** Der Rückfallsatz daneben
   („lies die Datei zuerst“) ist genau dafür da, aber er ist eine Anweisung an ein Modell und keine
   Zusicherung. Wenn du die Regeln ohne eigenen `Read` kennst, ist die Frage beantwortet.
6. **`Button` bleibt ohne `inline-flex`.** Dreizehn Aufrufstellen lösen dasselbe zweimal
   verschieden; das ist eine Aufräumarbeit, die ich in einer Runde über drei Darstellungssätze nicht
   angefangen habe.
7. **Aus der offenen Liste der Vorrunde ist nichts nachgeholt**: die gepackte App, ein echter Push,
   ERESOLVE, ein Screenreader, der Maus-Drag, die VMs.

## Form der Befunde

Wie gehabt: je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was
schiefgeht, wie es sich zeigt und was dagegen spräche, es so zu lassen. Schreib das Ergebnis nach
`docs/REVIEW-2026-09-29.md`. Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund
wie jeder andere.
