Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist. Es geht um ein
Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Was diese Runde anders macht

**Du liest die Umsetzung deiner eigenen Vorschläge.** `docs/REVIEW-2026-09-30.md` ist von Claude
Fable 5.1, und du bist es wieder. Die Fixes und dieser Auftrag sind von Opus 5. Das vorige Review
hat an drei Stellen eine *Richtung* genannt und sie ausdrücklich „ungemessen“ genannt — und an
mindestens einer davon ist die Umsetzung genau diese Richtung:

- Befund 1 schlug vor: „Die Notiz behält die volle Liste und merkt sich daneben, welche Einträge die
  App selbst zurückgeschrieben hat — `listTakenInHandSince` überspringt diese Namen.“ Das ist
  `putBack` in `bf3edc2`, fast wörtlich.
- Befund 4 schlug `/^[0-9a-f]{40,64}$/` vor; umgesetzt ist `/^[0-9a-f]{40}([0-9a-f]{24})?$/`.
- Befund 7 schlug `dropOutcome` für den Frame-Builder vor; umgesetzt.

Die Serie ist so gebaut, dass niemand seine eigene Begründung prüft. Hier geht das nicht ganz, also
bitte in dieser Reihenfolge: **zuerst den Vorschlag selbst angreifen** — trägt die Idee, oder war
sie nur die naheliegende? —, dann die Umsetzung. Ein Fehler in einem Vorschlag, den du selbst
gemacht hast, ist genauso ein Befund, und er ist der, den am wenigsten jemand anders findet.

**Der Diff hat zwei Schichten, und die zweite hat kein Review angestoßen.**

- **Schicht 1**: die neun Befunde des sechsundzwanzigsten Reviews und einer seiner zwei
  Nebenbei-Punkte, je ein Commit, dazu Regeln und Chronik.
- **Schicht 2**: zwei Wünsche des Nutzers vom selben Tag. Der Marker, mit dem die App ihre Blöcke in
  `custom.scss` abgrenzt, heißt jetzt `QuartzControl:managed:` statt `Quartz-GUI:managed:` —
  **gegen eine Regel, die bis dahin ausdrücklich das Gegenteil sagte**, und deshalb mit Migration.
  Und der Reiter „Content-Ordner“ der Konfiguration ist weg; der Content-Ordner steht als erste
  Gruppe im Reiter „Website“.

**Das größte Risiko dieser Runde ist die zweite Schicht, nicht die erste.** Die Paketliste ist
zum siebten Mal angefasst, aber gegen ein lokales Geschirr gemessen, das es seit fünf Runden gibt.
Der Marker dagegen ist ein **Format auf fremder Platte**: Er steht in der `custom.scss` jedes
Projekts, das die App je gestylt hat, in exportierten `.qtpl`-Paketen und in drei Kopien der
Beispielvorlage. Ein Fehler darin sieht aus wie ein Stil, der nicht mehr greift, oder wie ein
Block, der doppelt dasteht.

In der Zählung von `CLAUDE.md` ist das das siebenundzwanzigste Review. Die Dateinamen zählen nach
Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik der Reviews
in `docs/reviews.md`. Lies dann `docs/REVIEW-2026-09-30.md` — die neun Befunde, deren Fixes du
liest, und seine Fragen-Abschnitte, deren Richtungen zum Teil umgesetzt sind. Der Auftrag dazu
steht in `docs/REVIEW-2026-09-30-auftrag.md`; er behält seinen Wortlaut, auch wo das Review ihn
widerlegt hat.

Die Einbindung greift nach den Messungen der letzten zwei Runden. Wenn das bei dir anders ist, ist
das eine Messung und gehört in dein Dokument.

## Umfang

Beide Schichten sind per Fast-Forward auf `main` und gepusht (2026-09-18). Von `review-2026-10-01`
bis `review-2026-10-02`:

    git log --oneline review-2026-10-01..review-2026-10-02
    git diff review-2026-10-01..review-2026-10-02 -- . \
      ':!docs/REVIEW-2026-09-30.md' ':!docs/REVIEW-2026-10-01-auftrag.md'

Ausgenommen sind das Review-Dokument, dessen Fixes du liest (`85ab5be`, +369 — es ist deins), und
diese Auftragsdatei.

**Die Zahlen, und woran sie gezählt sind.** Gegen den Arbeitsbereich, **bevor** der Commit
existiert, der diese Datei trägt — also ohne ihn und ohne den Absatz, den er an `docs/reviews.md`
anfügt. Jede Schicht gegen ihre eigene Basis:

    # Schicht 1, review-2026-10-01..616dd79, ohne Review-Dokument: 17 Dateien, +336 / −86
    #   davon electron/, src/, scripts/, shared/:                  12 Dateien, +223 / −70
    #   davon docs/ und CLAUDE.md:                                  5 Dateien, +113 / −16
    # Schicht 2, 616dd79..c5062ae:                                 13 Dateien, +179 / −104
    #   davon electron/, src/, scripts/:                           12 Dateien, +158 / −93
    # beide zusammen bis c5062ae, ohne Review-Dokument:            26 Dateien, +515 / −190

`review-2026-10-01` sitzt auf `a2fe83c` („Der Auftrag nennt den Handbuch-Commit und den richtigen
Vault“), dem Stand, den das letzte Review gelesen hat. Die Commits:

| Woher | Commit | Worum es geht |
| --- | --- | --- |
| — | `85ab5be` | das Review-Dokument selbst (ausgenommen) |
| Befund 1 | `bf3edc2` | **Die Notiz behält die ganze Liste und trägt `putBack`** |
| Befund 2 | `f039d8a` | die Übersicht hat einen eigenen Satz für `installFailed` |
| Befund 3 | `57a3736` | der Snapshot-Ausweg nennt den Schalter (App und Handbuch 7.3) |
| Befund 4 | `3fe8f17` | **die SHA der Notiz wird auf ihre Form geprüft** |
| Befund 5 | `d42e36c` | **`noteInstallSucceeded`: ein Duplikat erbt `installFailed` nicht** |
| Befund 6 | `08f7335` | **Abbruch-Satz: Terminal-Befehl, `announce()`, `noteEpoch`** |
| Befund 7 | `e50e6e5` | **Frame-Builder: `dropOutcome` über `landing()`; „Ein Duplikat von X“** |
| Befund 8 | `fe6d1ee` | 14/10 statt 13/9, 32,8–33,3 px, `CLAUDE.md`-Stand |
| Befund 9 | `4c37ac0` | `seedDemoProfile` fragt `shootProject` für Ziele und Rückgabe |
| Nebenbei 2 | `bd4063b` | der Satz nach einem gescheiterten Stash-Pop nennt `stash@{n}` |
| — | `323bfd8` | Nachträge in `docs/decisions/`; in `conventions.md` eine Regel berichtigt, zwei ergänzt |
| — | `8781b11` | die Chronik trägt die Runde |
| — | `616dd79` | „nicht gepusht“ → gepusht, in Chronik und `CLAUDE.md` |
| Schicht 2 | `6c033e9` | **der Marker in `custom.scss` heißt `QuartzControl`** |
| Schicht 2 | `c5062ae` | **der Content-Ordner steht oben im Reiter „Website“** |
| — | — | dieser Auftrag samt Absatz in `docs/reviews.md`; der Tag sitzt hier |

Steht in `git log` etwas anderes als hier, gilt `git log`.

**Im Handbuch-Vault liegen von dieser Runde drei Commits**, alle gepusht: `f0fa3a3` (7.3: der
Snapshot-Weg braucht den Schalter), `0ad8a9f` (3.2 und 3.4: der Content-Ordner steht oben im Tab
Website) und `218fc7a` (neue Screenshots der Konfiguration, de/en, mit `--demo`; vier Bilder des
alten Tabs gelöscht). Der Vault ist `~/Obsidian/QuartzProjekte/QuartzControl-Handbuch` mit eigenem
git — nicht das Quartz-Projekt unter `~/Documents/QuartzProjekte/QuartzControl-Handbuch`, dessen
`content/` ein Symlink darauf ist. **Lies dort, schreib dort nichts.**

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung. Das gilt diesmal mit Nachdruck: Acht dieser Projekte tragen den alten
Marker in ihrer `custom.scss`, und jedes Speichern einer Variable, einer Schrift oder der
Import-Reihenfolge durch eine App dieses Standes schreibt ihn um. Miss an Kopien.

## Was du wissen musst, bevor du liest

**Lies Commit-Nachrichten als Behauptungen.** Eine Zahl in einer Commit-Nachricht gilt hier als
Messung. Die letzte Runde hat zwei Zahlen gefunden, die aus einem Review übernommen statt gezählt
waren; die Zahlen dieses Auftrags und der Commits sind gezählt, aber vom selben Modell, das sie
schreibt.

**`npm run smoke` startet gegen das echte Profil dieses Rechners** und macht seit Schicht 2
**40 Aufrufe statt 42** (ein Reiter weniger, zwei Fenstergrößen). Es navigiert nur.

**`check:i18n` zählt 1131 + 183 Schlüssel am Ende von Schicht 1 und 1132 + 183 am Ende von
Schicht 2** (am Stand `616dd79` in einem eigenen Worktree gezählt). `check:core-update` (14 + 3),
`check:semver` (18) und `check:handbook` (26) sind auf `c5062ae` grün.

**Ein Fenster wird auf diesem Bildschirm nicht breiter als 1470 px** und nicht höher als 923 px;
die Mindestbreite ist 960 px.

**Abwägungen, die ich selbst getroffen habe — prüf, ob sie tragen:**

- **`putBack` wird aus dem gebildet, was npm *in diesem Lauf* bewegt hat** (`missingNow` minus
  `leftOver`), nicht aus dem, was nach dem Lauf dasteht. Eine Zeile, die der Nutzer vorher von
  Hand zurückgeschrieben hat, ist damit nicht markiert. **Nicht gefangen**, und im Kommentar so
  benannt: Ein *committetes* Entfernen einer markierten Zeile wird übersprungen, das Paket kommt
  beim nächsten Lauf zurück. Mein Argument: Von zwei falschen Antworten ist die, die ein Klick
  rückgängig macht, die bessere. Ein fortsetzender Lauf trägt `putBack` weiter
  (`carriedPutBack`), aber nur solange er die Liste trägt (`noteOverruled === 'stands'`).
  `markInstallPending` filtert `putBack` auf Namen, die `reinstall` enthält.
- **Die SHA-Prüfung akzeptiert nur Kleinbuchstaben und nur die volle Länge.** `git rev-parse HEAD`
  schreibt genau das; eine Notiz, die von Hand eine abgekürzte SHA trägt, liest sich als „keine
  Notiz“. Das vorige Review schlug `{40,64}` vor — ich habe 40 oder 64 genommen, weil es keine SHA
  dazwischen gibt.
- **`noteInstallSucceeded` setzt nur `installFailed` zurück** und lässt Liste und `putBack` stehen,
  weil ein nacktes `npm install` die eigenen Pakete nicht zurückschreibt. Es läuft nur im
  Duplikat, nach dessen eigenem Install. Ein Fehler darin wird geloggt, nicht gemeldet.
- **Der Abbruch-Satz rät jetzt zu `git checkout -- <Datei>`.** Das verwirft die Änderung des
  Nutzers an dieser Datei. Gemessen ist, dass der Abbruch danach durchgeht — nicht, ob es der
  richtige Rat ist, wenn die Änderung jemandem etwas wert war (`git stash` wäre die Alternative,
  und die App legt selbst Stashes ab, die der Nutzer dann unterscheiden müsste).
- **`announce()` sagt den ersten Absatz** der Ausgabe (`split('\n\n')[0]`). Wo die Ausgabe mit
  gits Text beginnt statt mit einem Satz der App, wird gits Text angesagt. Und `noteEpoch` räumt
  den Kasten bei „Aktualisieren“ und bei einem Sync, nicht aber beim `onChanged()` des Abbruchs
  selbst — Absicht, sonst verschwände er sofort.
- **„Ein Duplikat von X aus dem Layout entfernt“** setzt voraus, dass eine Löschung auf dem Vorrat
  immer eine von mehreren Instanzen trifft (`nameCounts > 1` in `describeBoardDrop`).
- **Die Marker-Migration entscheidet bei zwei Blöcken gleichen Namens für den neuen** und löscht
  den alten beim nächsten Schreiben. Der Fall entsteht, wenn ein Build von vorher (beta.2) auf ein
  schon umgestelltes Projekt trifft und einen alten Block *anhängt* — dann ist der alte der
  **neuere Inhalt**, und er geht verloren. Ich halte das für selten genug (Downgrade auf dasselbe
  Projekt); prüf, ob das stimmt und ob es eine billigere Antwort gibt.
- **`stripManagedBlock` ruft sich selbst**, bis kein Block unter keinem Namen mehr dasteht.
  `withoutLegacyBlock` kürzt dabei das Dateiende auf einen Zeilenumbruch — das ist die einzige
  Stelle, an der die Migration Bytes außerhalb eines Blocks anfasst.
- **`Quartz-GUI:syntax:` ist nicht umbenannt.** Er steht in `scripts/example-template/`, reist in
  drei Kopien der Vorlage, und `--check-sync` vergleicht sie byte-weise; die Umbenennung gehört
  zum nächsten Release der Vorlage. Die Regel in `docs/conventions.md` sagt das.
- **Der Content-Ordner ist eine `FieldGroup`, keine Karte**, und trägt einen eigenen
  `HandbookLink` auf 3.4. Die Regel sagt, das Kapitel nennt die *Seite* über `PageHeader`, nicht
  ein Hinweis; die Einstellungen haben einen solchen zweiten Link schon (`Settings.tsx`). Prüf, ob
  das eine Ausnahme mit Grund ist oder eine, die die Regel aushöhlt. Die Gruppe steht außerhalb
  von `config && …`, damit eine unlesbare `quartz.config.yaml` sie nicht versteckt — das ist
  gelesen, nicht gemessen.
- **`?tab=content` wird auf „Website“ umgeschrieben**, in der URL und im Sticky-State. Ein
  `lastTab` mit dem Wert `'content'` aus derselben Sitzung fällt über `isTab(lastTab)` auf
  `'site'`.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Die Marker-Migration (`6c033e9`)

Vier Wege schreiben `custom.scss`: Variablen (`saveVariableOverrides`), Import-Reihenfolge
(`setImportOrder`, eigener Einfügeort vor der ersten Regel), Schriften (`fontService`) und der
Vorlagen-Import (`templatePackage/parts.ts`, der Blöcke aus einem Paket übernimmt). Gemessen sind
die ersten drei an einer Kopie von `navigations-testprojekt` in der gebauten App: danach alle drei
Blöcke unter dem neuen Namen am alten Platz, sonst byte-gleich, SCSS-Check grün. **Nicht
gemessen**: der Vorlagen-Import eines `.qtpl` mit alten Markern in ein Projekt mit neuen (und
umgekehrt), der Export, ein Build von vorher auf einem umgestellten Projekt, und
`build-example-template.mjs` in einem echten Lauf (nur `node --check`). Prüf außerdem, ob irgendein
Leser außerhalb von `styleService.ts` den Marker als Text sucht — `grep` nach `managed:` fand
nichts, aber ein `grep` ist ein Instrument mit Reichweite.

### 2. `putBack` (`bf3edc2`)

Die siebte Runde an derselben Liste. Gemessen sind H1 (Zurücksetzen nach dem Fehlschlag) und G1
(Git-Sync, zweiter Fehlschlag, dritter Lauf) am Bündel, vorher gegen nachher. Such die Lage, die
keine der zwei Szenen trifft — besonders: Was passiert mit `putBack`, wenn der Nutzer zwischen zwei
Läufen **einen Teil** der markierten Zeilen zurücksetzt und den Rest committet? Und prüf die
Aussage im Kommentar, dass `stillMissing` markierte Einträge „ohnehin wegräumt, solange sie
dastehen“ — auch für einen Eintrag, der mit einem anderen Bereich dasteht.

### 3. Die übrigen Update-Fixes (`3fe8f17`, `d42e36c`, `08f7335`, `bd4063b`)

Die SHA-Prüfung, `noteInstallSucceeded`, der Abbruch-Kasten und der Stash-Satz. Der Kasten ist an
der gebauten App gemessen (Verweigerung, Ansage per MutationObserver, Räumen nach
„Aktualisieren“); der gescheiterte Stash-Pop nur am Bündel. Stell ihn an der App her.

### 4. Der Content-Ordner im Reiter „Website“ (`c5062ae`)

Gemessen bei 1470, 1280 und 960 px im dunklen Schema (das System steht auf dunkel), die
Umleitungen, der Reiter „Übersetzungen“; hell nur in den Screenshots (1440 px, `--demo`). Nicht gemessen: ein Projekt ohne `content/`, eines mit hängendem Symlink, eines
ohne `index.md` (die drei Zustände, für die die Übersicht auf diesen Reiter verlinkt), der Dialog
bei 960 px, ein Speichern der Felder darunter, während „Quelle ändern“ läuft. Und: Die
Reiterbeschreibung nennt jetzt „der Ordner mit deinen Notizen“ zuerst, der Hinweis in der Gruppe
steht **unter** dem Knopf. Ist das die richtige Reihenfolge?

### 5. Die Ansagen (`e50e6e5`)

`landing()` wird zweimal je Ablage gefragt, einmal von der Ansage, einmal von `handleDrop` — aus
demselben Render-Zustand? Gemessen ist die Tastatur, nicht die Maus.

### 6. Was die Prüfskripte nicht sehen

Keines sieht einen Marker, ein Format auf fremder Platte oder eine Migration. `check:handbook` hat
26 Zitate geprüft, aber nicht, ob 3.2 und 3.4 die neue Seite richtig beschreiben — das ist
gelesen, gegen die Screenshots, die ich selbst aufgenommen habe. Und `smoke` zählt zwei Aufrufe
weniger, weil ein Bildschirm fehlt: Prüf, ob `routes.mjs`, `styles-snapshot.mjs` und
`screenshot-scenes.mjs` die einzigen Listen sind, die ihn kannten.

## Wie gemessen werden kann

- **Der Dienst ohne App**: esbuild-Bündel von `updateService.ts` bzw. `styleService.ts`
  (`--bundle --platform=node --format=cjs --tsconfig=tsconfig.node.json --external:electron`),
  `electron` über einen Stub in einem `node_modules/electron/` **neben dem Bündel**. Eine
  Einstiegsdatei, die mehrere Dienste exportiert (`duplicateProject` und `getCoreUpdateStatus`
  zusammen), darf im Scratchpad liegen: esbuild löst `@shared` über `--tsconfig` auch dort.
  Gegenseite ist ein lokales Upstream-Repo (Stände A, E, E2, E3, E4), der Status ohne Netz über
  `GIT_CONFIG_COUNT`/`url.<bare>.insteadOf`. Vorher-Bündel über `git archive review-2026-10-01`.
- **npm als Attrappe auf dem PATH**, vier Betriebsarten (schreibt, scheitert, schreibt nichts,
  scheitert beim zweiten Aufruf).
- **Die gebaute App nicht-interaktiv**: `npm run build`, eigenes Playwright-Skript im Scratchpad,
  `playwright-core` über den absoluten Pfad, `--user-data-dir=<wegwerf>`,
  `page.emulateMedia({ colorScheme: null })`, Projekt über `window.quartzGui.projects.add`, Routen
  über `location.hash`. Für den Status der Updates-Seite 26 s warten.
- **Ein Projekt zum Anfassen**: `cp -Rc` von `~/Documents/QuartzProjekte/navigations-testprojekt`
  in den Scratchpad; es trägt alle drei Blöcke mit dem alten Marker. In der Kopie unter `content/`
  nichts schreiben.
- **Nicht gemessen** und deshalb offen für dich: die gepackte App; das gebaute Handbuch
  (`resources/handbook/` ist nicht neu gebaut); ein Maus-Drag im Frame-Builder; ein Screenreader;
  ERESOLVE; ein echter Push; die VMs; ein Lauf von `build-example-template.mjs`; ein
  `.qtpl`-Import über die Marker-Grenze hinweg.

## Was diese Runde offen gelassen hat

1. **Nebenbei 1 des letzten Reviews** (die Nummerierung 1–5, 7, 6 im Auftrag) — bleibt, weil
   Review-Dokumente und Aufträge ihren Wortlaut behalten.
2. **Die Richtungen aus den Fragen des letzten Reviews** sind nicht verfolgt:
   `--diff-merges=first-parent` für die Antwort im Merge-Commit, `node_modules/.package-lock.json`
   als dritter Weg für `installFailed`, der erste Satz am `DISPLAY_ORDER`-Kommentar.
3. **`Quartz-GUI:syntax:`** wartet auf das nächste Release der Vorlage.
4. **Das mitgelieferte Handbuch und das PDF sind nicht neu gebaut.** Bis dahin zeigt die App
   Kapitel, die noch vom Reiter „Content-Ordner“ sprechen.
5. **Aus der offenen Liste der Vorrunden**: die gepackte App, ein echter Push, ERESOLVE, ein
   Screenreader, die VMs.

## Form der Befunde

Wie gehabt: je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was
schiefgeht, wie es sich zeigt und was dagegen spräche, es so zu lassen. Schreib das Ergebnis nach
`docs/REVIEW-2026-10-01.md`. Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund
wie jeder andere — und wenn einer deiner eigenen Vorschläge aus dem letzten Review nicht trägt,
auch.
