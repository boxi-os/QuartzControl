Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist und dessen nächste
Fassung ein Release Candidate werden soll. Es geht um ein Review — nicht um Änderungen. Am Ende
steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Das vorige Review hat seinen eigenen Vorschlag widerlegt, und die Antwort darauf ist wieder ein
Vorschlag desselben Reviews.** `docs/REVIEW-2026-10-01.md` (Claude Fable 5.1) fand, dass `putBack`
— sein Vorschlag aus der Runde davor — unter echtem npm nichts markierte, und nannte eine Richtung,
ausdrücklich „ungemessen“: markiert wird, wessen Zeile sich in diesem Lauf bewegt hat. Genau das ist
umgesetzt (`28ddeb2`). Ebenso beim Marker: „Lesen ließe sich beides … der spätere gewinnt“ und „Wer
einen Abschnitt schreibt, könnte die Marker der anderen mit umbenennen“ sind beide Code geworden
(`8c4d157`). Die Fixes und dieser Auftrag sind von Opus 5.

Also wie in der letzten Runde: **zuerst die Richtung angreifen, dann die Umsetzung.** Die letzte
Runde hat gezeigt, dass das lohnt — der mittlere Befund war ein Fehler im Vorschlag, nicht im Code.

**Der Diff hat zwei Schichten.**

- **Schicht 1**: die sechs Befunde des siebenundzwanzigsten Reviews, je ein Commit, dazu die
  Chronik (`28ddeb2` bis `76edfce`).
- **Schicht 2**: auf Wunsch des Nutzers auch alles, was in Schicht 1 noch offen stand — die zwei
  Nebenbei-Punkte des Reviews, die ein Code-Problem waren, und vier Punkte, die beim Abarbeiten
  aufgefallen sind (`c9e968c` bis `0419577`). **An einem davon lag das Review daneben**: Der Chip im
  Frame-Builder, den es „zurück auf seine Ablage“ zog, war ein *ausgeblendeter* Bereich, und die
  Ablage war nicht wirkungslos, sondern löschte still seine Platzierung. Die Antwort (`dcb221b`)
  ändert damit, was ein Drag tut, nicht nur, was er sagt.

**Das größte Risiko ist, was die Marker-Änderung liest und schreibt.** Sie ist die zweite Runde an
einem Format auf fremder Platte, und diesmal ändert sie nicht nur den Namen, sondern die Semantik:
Wo zwei Kopien eines Blocks stehen, zeigt die App jetzt eine *Vereinigung*, und das nächste
Speichern schreibt sie. Gemessen ist das nur an Bündeln, nicht an der gebauten App.

In der Zählung von `CLAUDE.md` ist das das achtundzwanzigste Review. Die Dateinamen zählen nach
Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md`. Lies dann `docs/REVIEW-2026-10-01.md` — die sechs Befunde, deren Fixes du liest,
und seine Richtungen. Der Auftrag dazu steht in `docs/REVIEW-2026-10-01-auftrag.md`; er behält
seinen Wortlaut, auch wo das Review ihn widerlegt hat.

Die Einbindung griff in den letzten drei Runden. Wenn das bei dir anders ist, ist das eine Messung
und gehört in dein Dokument.

## Umfang

Beide Schichten sind per Fast-Forward auf `main` und gepusht. Von `review-2026-10-02` bis
`review-2026-10-03`:

    git log --oneline review-2026-10-02..review-2026-10-03
    git diff review-2026-10-02..review-2026-10-03 -- . \
      ':!docs/REVIEW-2026-10-01.md' ':!docs/REVIEW-2026-10-02-auftrag.md'

Ausgenommen sind das Review-Dokument, dessen Fixes du liest (`6aa2ef2`, +371 — es ist das deines
Vorgängers), und diese Auftragsdatei.

**Die Zahlen, und woran sie gezählt sind.** Mit `git diff --shortstat`, bevor der Commit existiert,
der diese Datei trägt. Jede Schicht gegen ihre eigene Basis:

    # Schicht 1, review-2026-10-02..76edfce, ohne Review-Dokument: 16 Dateien, +294 / −81
    #   davon electron/, src/, scripts/, shared/:                  11 Dateien, +173 / −60
    # Schicht 2, 76edfce..0419577:                                 10 Dateien, +71 / −29
    #   davon electron/, src/, scripts/, shared/:                   4 Dateien, +30 / −9
    # beide zusammen, ohne Review-Dokument:                        18 Dateien, +349 / −94
    #   davon electron/, src/, scripts/, shared/:                  12 Dateien, +203 / −69

| Woher | Commit | Worum es geht |
| --- | --- | --- |
| — | `6aa2ef2` | das Review-Dokument selbst (ausgenommen) |
| Befund 1 | `28ddeb2` | **`putBack` aus den Zeilen vor und nach npm (`packageLines`); Fehlersatz über `absentFromPackageJson`** |
| Befund 2 | `158fdc1` | die Links in den Content-Ordner nennen `?tab=site` |
| Befund 3 | `8c4d157` | **beide Marker-Kopien werden gelesen, die spätere gewinnt; ein Schreiben benennt alle um; `cutSpan`** |
| Befund 4 | `4542777` | `announce()` sagt die erste Zeile, nicht den ersten Absatz |
| Befund 5 | `dced5ed` | der zweite Handbuch-Verweis steht als Ausnahme in `conventions.md` |
| Befund 6 | `3b3fb86` | drei Sätze nennen „Konfiguration → Website, Gruppe Content-Ordner“ |
| — | `76edfce` | Chronik und Stand |
| beim Abarbeiten | `c9e968c` | der baseUrl-Hinweis der Übersicht nennt `?tab=site` |
| Nebenbei 1 | `dcb221b` | **ein Chip auf seiner eigenen Ablage bleibt, wie er war (`inTray`)** |
| Nebenbei 2 + beim Abarbeiten | `585a0d7` | H3: 41 oder 0 Bytes; „`stillMissing` räumt ohnehin weg“ gilt nur für denselben Bereich |
| „daneben“ zu Befund 3 | `ca5780b` | **`stripManagedBlock` zieht Leerzeilen nur an der Schnittstelle zusammen** |
| — | `0419577` | Chronik |
| — | — | dieser Auftrag samt Absatz in `docs/reviews.md`; der Tag sitzt hier |

Steht in `git log` etwas anderes als hier, gilt `git log`.

**Im Handbuch-Vault liegt von dieser Runde ein Commit**, gepusht: `391f77a` (3.4, de/en: „Gruppe“
statt „Karte“, vier Wörter). Der Vault ist `~/Obsidian/QuartzProjekte/QuartzControl-Handbuch` mit
eigenem git. **Lies dort, schreib dort nichts.**

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung. Acht dieser Projekte tragen weiter den alten Marker, und jedes Speichern
durch eine App dieses Standes benennt jetzt **alle** Blöcke der Datei um, nicht nur den
geschriebenen. Miss an Kopien.

## Was du wissen musst, bevor du liest

**Lies Commit-Nachrichten als Behauptungen.** Die Zahlen darin sind gezählt, aber vom selben
Modell, das sie schreibt.

**Das Messgeschirr hat eine Falle, die die letzte Runde gefunden hat**: Die npm-Attrappe der
Reviews schrieb `name@range` wörtlich, echtes npm schreibt `^<aufgelöste Version>`. Alles um die
Paketliste bitte mit echtem npm oder einer Attrappe, die schreibt wie npm (Szenen des letzten
Reviews: G1, H1, R1 mit `is-odd`/`left-pad` und einer devDependency, die es nicht gibt).

**`npm run smoke` startet gegen das echte Profil dieses Rechners** und macht 40 Aufrufe; es
navigiert nur. `check:i18n` zählt 1132 + 183 Schlüssel, `check:core-update` (14 + 3),
`check:semver` (18), `check:handbook` (26) und `template:example -- --check-sync` (3 Kopien
byte-gleich) sind auf `0419577` grün.

**Ein Fenster wird auf diesem Bildschirm nicht breiter als 1470 px** und nicht höher als 923 px;
die Mindestbreite ist 960 px.

**Abwägungen, die ich selbst getroffen habe — prüf, ob sie tragen:**

- **`putBack` vergleicht je Name die Zeilen über alle Abschnitte**, vor den npm-Aufrufen gegen
  danach, und markiert, was sich bewegt hat und jetzt dasteht. Ist `package.json` vorher oder
  nachher unlesbar, wird nichts markiert — der Zustand vor `putBack`. Eine Zeile, die im Plan
  steht, deren Bereich npm aber *gleich* schreibt, wie er vorher dastand (der Nutzer hatte sie mit
  dem aufgelösten Bereich von Hand zurückgeschrieben), ist nicht markiert. Gemessen mit beiden
  Attrappen-Arten (G1, H1) und mit echtem npm 11.17.0 (R1, Lauf 1 und Lauf 2 nach einem
  Git-Sync). **Nicht gemessen**: ein Lauf, in dem npm eine Zeile in einen anderen Abschnitt
  schreibt als den der Notiz.
- **Der Fehlersatz nennt `absentFromPackageJson(wanted)`**, der Status weiter `stillMissing`. Nach
  R1 zeigte der Status also `pending [is-odd, left-pad, qc-…]`, während der Satz des Laufs nur
  `qc-…` nannte. Der Status sagt „fehlen oder stehen mit einer anderen Version da“ und stimmt
  damit — aber zwei Stellen nennen für dieselbe Lage verschieden viele Pakete.
- **Zwei Kopien eines Blocks werden in Dateireihenfolge gelesen; bei den Variablen gewinnt je
  Schlüssel die spätere, bei Schriften und Importen ist es die Vereinigung.** Geschrieben wird an
  die Stelle der *ersten* Kopie, nicht der späteren, obwohl die spätere die ist, die in der
  Kaskade gilt: Sonst wanderten alle 50 Variablen eines echten Projekts hinter die Regeln des
  Nutzers, um die eine zu behalten, die beta.2 angehängt hatte. Der Preis: Für die Variablen aus
  der späteren Kopie ändert sich damit ihre Stellung gegenüber eigenem CSS zwischen den beiden
  Kopien. Eine verschachtelte Kopie (beta.2 legt seinen Import-Block *in* unseren) zählt als Teil
  der äußeren.
- **`renameLegacyMarkers` benennt nur Abschnitte um, die keine Kopie unter dem neuen Namen
  haben.** Einen Abschnitt mit beiden Kopien überlässt es dem Schreiben *dieses* Abschnitts — eine
  Datei kann also nach einem Schreiben weiter beide Namen tragen, wenn beta.2 dazwischen war.
  Umbenannt wird in `upsertManagedBlock`, `upsertImportBlock` und im Leeren der Variablen, nicht
  in `stripManagedBlock` selbst (der Vorlagen-Export ruft es).
- **Ein Chip auf seiner eigenen Ablage tut nichts mehr** (`inTray`: nie platziert oder
  ausgeblendet). Vorher löschte die Ablage bei einem ausgeblendeten Bereich die Platzierung. War
  das ein Weg, den jemand *wollte* — eine ausgeblendete Platzierung ganz loszuwerden? Einen
  anderen dafür habe ich nicht gesucht.
- **`announce()` sagt die erste Zeile.** Das setzt voraus, dass jeder Satz der App auf diesem
  Kanal eine Zeile ist; gezählt habe ich fünf (`updateStashPopFailed`, `updateAbortBlockedByEdit`,
  `updateMergeUnfinished`, `updateAbortDroppedStaged`, `updateAlreadyRunning`) und die übrigen aus
  `explainGitFailure`, alle einzeilig mit `\n\n` am Ende. Wo gar kein Satz der App davorsteht, wird gits erste Zeile angesagt.
- **`stripManagedBlock` schließt die Lücke nur noch an der Schnittstelle.** Vorher lesend gegen die
  zehn echten `custom.scss` verglichen: Vorlagen-Export in allen byte-gleich, der css-vars-Block
  allein heraus weicht in acht um die Leerzeile am Dateiende ab.
- **Die Ausnahme für den zweiten Handbuch-Verweis** steht in `conventions.md` mit dem Satz „Eine
  zweite solche Gruppe wird hier eingetragen, nicht mit dieser begründet.“ Ob eine Regel mit
  genau einer Ausnahme besser ist als eine Regel, die die Ausnahme als Fall beschreibt, ist eine
  Frage der Form — sag, wenn sie dich stört.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Die Marker, zweite Runde (`8c4d157`, `ca5780b`)

Gemessen am `styleService` dieses Standes und dem aus `v1.0.0-beta.2`, beide als Bündel, gegen
eine Kopie von `navigations-testprojekt`: nach einem Schreiben alle drei Blöcke neu; beta.2
speichert `--secondary`, dieser Stand liest 51 statt 50 Variablen und behält sie beim Speichern;
der verschachtelte Import-Block wird beim Speichern im Ganzen ersetzt, Check danach grün;
Leerzeilen im eigenen CSS bleiben. **Nicht gemessen**: die gebaute App auf so einer Datei (was
zeigt die Variablen-Seite, was die Schriften-Liste, was die Import-Reihenfolge?), zwei Kopien des
fonts-Blocks mit derselben Schrift (die Vereinigung trägt sie zweimal), der Vorlagen-Import in ein
Projekt mit zwei Kopien, und ob `renameLegacyMarkers` je einen Kommentar trifft, den der Nutzer
geschrieben hat und der zufällig so aussieht.

### 2. `putBack`, achte Runde (`28ddeb2`)

Such die Lage, die G1, H1 und R1 nicht treffen — und bitte mit echtem npm. Besonders: ein Lauf mit
drei Abschnitten (`optionalDependencies`, `peerDependencies`), eine Zeile, die npm verschiebt, und
der Fall aus meinen Abwägungen, in dem npm genau das schreibt, was vorher dastand.

### 3. Der Chip auf der Ablage (`dcb221b`)

Gemessen per Maus an einem ausgeblendeten Chip. Nicht gemessen: ein nie platzierter Chip, die
Tastatur (dort ist das erste Ziel eine Zelle, nicht die Ablage), und ob die Seite nach der Ablage
noch denselben Chip ausgewählt hat — vorher wählte `handleDragEnd` ihn aus, jetzt kehrt es vorher
zurück.

### 4. Die kleinen (`158fdc1`, `c9e968c`, `4542777`, `dced5ed`, `3b3fb86`, `585a0d7`)

Alle an der gebauten App oder gelesen. Prüf, ob es weitere Links auf `config` ohne Reiter gibt, die
auf ein Feld im Reiter „Website“ zielen — ich habe fünf gefunden und nicht systematisch gesucht.

### 5. Was die Prüfskripte nicht sehen

Keines sieht die Marker-Semantik, keines ein zweites npm-Verhalten. Und `check:handbook` prüft
Blockzitate, nicht, ob 3.4 mit „Gruppe“ jetzt überall stimmt.

## Wie gemessen werden kann

- **Der Dienst ohne App**: esbuild-Bündel (`--bundle --platform=node --format=cjs
  --external:electron --alias:@shared=./shared`, oder `--tsconfig=tsconfig.node.json`), `electron`
  über einen Stub in einem `node_modules/electron/` neben dem Bündel. Lokales Upstream-Repo
  (A, E, E2, E3, E4), Status ohne Netz über `url.<bare>.insteadOf`. Vorher-Bündel über
  `git archive review-2026-10-02`, beta.2 über `git archive v1.0.0-beta.2`.
- **npm echt** (das gepinnte aus `node_modules/npm`, gegen die Registry) oder als Attrappe, die den
  Bereich schreibt wie npm.
- **Die gebaute App nicht-interaktiv**: `npm run build`, eigenes Playwright-Skript im Scratchpad,
  `playwright-core` über den absoluten Pfad, `--user-data-dir=<wegwerf>`,
  `page.emulateMedia({ colorScheme: null })`, Projekt über `window.quartzGui.projects.add`, Routen
  über `location.hash`.
- **Ein Projekt zum Anfassen**: `cp -Rc` von `~/Documents/QuartzProjekte/navigations-testprojekt`
  in den Scratchpad; es trägt alle drei Blöcke mit dem alten Marker. In der Kopie unter `content/`
  nichts schreiben.
- **Nicht gemessen** und deshalb offen für dich: die gepackte App; das gebaute Handbuch; ein
  Screenreader; ERESOLVE; ein echter Push; die VMs; ein Lauf von `build-example-template.mjs`.

## Was diese Runde offen gelassen hat

1. **Der dritte Nebenbei-Punkt des letzten Reviews** — die Attrappe soll wie npm schreiben —
   betrifft das Geschirr außerhalb des Repos und steht oben unter „Was du wissen musst“.
2. **Die Richtungen der vorletzten Runde** sind weiter nicht verfolgt:
   `--diff-merges=first-parent` für die Antwort im Merge-Commit, `node_modules/.package-lock.json`
   als dritter Weg für `installFailed`.
3. **`Quartz-GUI:syntax:`** wartet auf das nächste Release der Vorlage.
4. **Das mitgelieferte Handbuch und das PDF sind nicht neu gebaut.**
5. **Aus der offenen Liste der Vorrunden**: die gepackte App, ein echter Push, ERESOLVE, ein
   Screenreader, die VMs.

## Eine Frage über den Code hinaus

Der Nutzer überlegt, als Nächstes keine dritte Beta, sondern einen Release Candidate zu bauen.
Wenn dir beim Lesen etwas begegnet, das dafür spricht, den Stand noch nicht „Kandidat“ zu nennen —
eine Lücke, die eine Beta rechtfertigt, aber keinen RC —, gehört es in einen eigenen Abschnitt am
Ende deines Dokuments, getrennt von den Befunden.

## Form der Befunde

Wie gehabt: je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was
schiefgeht, wie es sich zeigt und was dagegen spräche, es so zu lassen. Schreib das Ergebnis nach
`docs/REVIEW-2026-10-02.md`. Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund
wie jeder andere — und wenn eine Richtung deines Vorgängers nicht trägt, auch.
