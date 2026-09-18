Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist und dessen nächste
Fassung ein Release Candidate werden soll. Es geht um ein Review — nicht um Änderungen. Am Ende
steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Die letzte Runde war die erste ohne mittleren Befund, und diese liest mehr, als sie fand.** Das
achtundzwanzigste Review (`docs/REVIEW-2026-10-02.md`, Claude Fable 5.1) meldete fünf niedrige
Befunde und sechs Punkte nebenbei. Abgearbeitet sind alle fünf, dazu die vier Nebenbei-Punkte, die
etwas brauchten, und zwei Punkte, die beim Abarbeiten aufgefallen sind. Die Fixes und dieser
Auftrag sind von Opus 5.

**Diesmal sind nicht alle Richtungen vom Review.** Übernommen sind drei: Der Abbruch stellt seine
Sätze vor gits Text (Befund 1), ein Paket in zwei Abschnitten wird je Abschnitt gefragt (Befund 4),
und `checkStyles` erkennt den geschachtelten Import-Block (nebenbei 5). Eigene Entscheidungen, die
kein Review vorgeschlagen hat, sind vier: ein **sechster Satz** auf dem Abbruch-Kanal
(`updateStashRestored`), die Regel, **welcher Abschnitt für einen fehlenden einspringen darf**, eine
**Änderung an der Kollisionsrechnung** des Frame-Builders für Tastatur-Drags, und **`isOwnPlace`**,
das einen Drag auf der eigenen Zelle beendet, bevor er etwas schreibt. Die zwei letzten ändern, was
ein Drag *tut*, nicht nur, was er sagt.

Also: **Greif zuerst die eigenen Entscheidungen an**, dann die übernommenen Richtungen, dann die
Umsetzung. Bei den eigenen fehlt die Prüfung durch ein zweites Modell ganz.

**Der Diff hat drei Schichten.**

- **Schicht 1**: die fünf Befunde, je ein Commit, dazu die Chronik (`b415b86` bis `fcdde8f`).
- **Schicht 2**: die vier Nebenbei-Punkte (`f68866d` bis `212fcde`), einer davon im Handbuch-Vault.
  Diese Schicht ist per Fast-Forward auf `main` und gepusht.
- **Schicht 3**: die zwei beim Abarbeiten gefundenen Punkte (`70cde5d` bis `ca0218a`).

**Das größte Risiko ist die Kollisionsrechnung** (`7466ab5`). Sie gilt für *jeden* Tastatur-Drag im
Frame-Builder, nicht nur für den Chip, der den Anlass gab: Ohne Zeiger entscheidet jetzt, wenn keine
Zielmitte auf der Mitte des Gezogenen liegt (Abstand > 1 px), das kleinste Ziel, das diese Mitte
enthält. Das beruht auf der Annahme, dass `nearestDroppableCoordinates` nach jedem Pfeil die Mitten
exakt übereinanderlegt. Wo das nicht stimmt — Scrollen während des Drags, ein anders gemessenes
Rechteck, ein Breakpoint-Wechsel —, entscheidet mitten im Drag die neue Regel statt `closestCenter`.
Gemessen ist das nur am ersten Frame von `navigations-testprojekt`, bei 1470 × 900, ohne Scrollen.

In der Zählung von `CLAUDE.md` ist das das neunundzwanzigste Review. Die Dateinamen zählen nach
Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md`. Lies dann `docs/REVIEW-2026-10-02.md` — die Befunde und Nebenbei-Punkte, deren
Fixes du liest. Der Auftrag dazu steht in `docs/REVIEW-2026-10-02-auftrag.md`; er behält seinen
Wortlaut, auch wo das Review ihn widerlegt hat (Befund 3).

Die Einbindung griff in den letzten vier Runden. Wenn das bei dir anders ist, ist das eine Messung
und gehört in dein Dokument.

## Umfang

Von `review-2026-10-03` bis `review-2026-10-04`:

    git log --oneline review-2026-10-03..review-2026-10-04
    git diff review-2026-10-03..review-2026-10-04 -- . \
      ':!docs/REVIEW-2026-10-02.md' ':!docs/REVIEW-2026-10-03-auftrag.md'

Ausgenommen sind das Review-Dokument, dessen Fixes du liest (`8d830e7`, +364 — es ist das deines
Vorgängers), und diese Auftragsdatei.

**Die Zahlen, und woran sie gezählt sind.** Mit `git diff --shortstat`, bevor der Commit existiert,
der diese Datei trägt. Jede Schicht gegen ihre eigene Basis:

    # Schicht 1, review-2026-10-03..fcdde8f, ohne Review-Dokument: 10 Dateien, +199 / −37
    #   davon electron/, src/, scripts/, shared/:                  5 Dateien, +104 / −24
    # Schicht 2, fcdde8f..212fcde:                                12 Dateien, +189 / −19
    #   davon electron/, src/, scripts/, shared/:                  8 Dateien, +117 / −8
    # Schicht 3, 212fcde..ca0218a:                                 5 Dateien, +47 / −20
    #   davon electron/, src/, scripts/, shared/:                  2 Dateien, +27 / −11
    # alle drei zusammen, ohne Review-Dokument:                   19 Dateien, +415 / −56
    #   davon electron/, src/, scripts/, shared/:                 12 Dateien, +248 / −43

| Woher | Commit | Worum es geht |
| --- | --- | --- |
| — | `8d830e7` | das Review-Dokument selbst (ausgenommen) |
| Befund 1 | `b415b86` | **der Abbruch reiht erst die Sätze der App, dann gits Text; neuer Satz `updateStashRestored`** |
| Befund 2 | `1aea7fa` | der Preis der Marker-Umbenennung in Kommentar, Regel und `docs/release.md` Punkt 7 (kein Code) |
| Befund 3 | `b310bc9` | zwei `putBack`-Kommentare und ein Satz in `conventions.md` nennen den Weg, den sie meinen (kein Verhalten) |
| Befund 4 | `1bd5c1e` | **Namen dedupliziert; `absentFromPackageJson` lässt nur einen nicht beanspruchten Abschnitt einspringen; `entryLabels`** |
| Befund 5 | `97787cc` | die Kachel „Die Seite“ nennt `?tab=site` |
| — | `fcdde8f` | Chronik und Stand |
| Nebenbei 3 | `f68866d` | **`joinUniqueRules`: der Schriftblock nimmt jede `@font-face`-Regel einmal** |
| Nebenbei 4 | `7466ab5` | **ein Tastatur-Drag steht beim Aufnehmen auf seinem eigenen Feld (Kollisionsrechnung)** |
| Nebenbei 5 | `6ce4c82` | **`nestedImportBlock` im Check, Satz und Knopf „Ladereihenfolge neu schreiben“** |
| — | `212fcde` | Chronik |
| beim Abarbeiten | `70cde5d` | der SCSS-Fehler der Übersicht nennt `?tab=customCss` statt `?tab=css` |
| beim Abarbeiten | `08d3f15` | **`isOwnPlace`: die eigene linke obere Zelle ist der eigene Platz, ein Drag dorthin endet ohne Schreiben und ohne Auswahl** |
| — | `ca0218a` | Chronik |
| — | — | dieser Auftrag samt Absatz in `docs/reviews.md`; der Tag sitzt hier |

Steht in `git log` etwas anderes als hier, gilt `git log`.

**Im Handbuch-Vault liegt von dieser Runde ein Commit**, gepusht: `084f425` (2.2, de/en: statt
„Einrichtung → Content-Ordner“ jetzt „Konfiguration → Website“ bzw. „Configuration → Site“ mit
Verweis auf 3.4). Der Vault ist `~/Obsidian/QuartzProjekte/QuartzControl-Handbuch` mit eigenem git.
**Lies dort, schreib dort nichts.**

**Verändere weder Vaults noch die Projekte unter `~/Documents/QuartzProjekte/`.** Lesen und
kopieren ist in Ordnung. Jedes Speichern auf der Stile-Seite benennt alle Marker-Blöcke der Datei
um, und ein Import einer Schrift schreibt jetzt den ganzen Schriftblock dedupliziert neu. Miss an
Kopien.

## Was du wissen musst, bevor du liest

**Lies Commit-Nachrichten als Behauptungen.** Die Zahlen darin sind gezählt, aber vom selben
Modell, das sie schreibt. Zwei Messungen in den Befunden 3 und 4 zitiere ich aus deinem Vorgänger
(Szenen R2, R3), statt sie zu wiederholen; R2 habe ich für Befund 4 selbst neu gefahren, R3 nicht.

**Das Messgeschirr**: Alles um die Paketliste bitte mit echtem npm (das gepinnte aus
`node_modules/npm`, 11.17.0) — die alte Attrappe schrieb Bereiche wörtlich. Eine Attrappe, die
einen *bestimmten* Aufruf scheitern lässt und sonst echtes npm ist (`NPM_FAIL_MATCH`), hat sich in
der letzten Runde bewährt.

**`npm run smoke` startet gegen das echte Profil dieses Rechners** und macht 40 Aufrufe; es
navigiert nur. `check:i18n` zählt 1134 + 184 Schlüssel (67 nicht prüfbar), `check:core-update`
(14 + 3), `check:semver` (18), `check:handbook` (26) und `template:example -- --check-sync`
(3 Kopien byte-gleich, 782 827 Bytes) sind auf `ca0218a` grün.

**Ein Fenster wird auf diesem Bildschirm nicht breiter als 1470 px** und nicht höher als 923 px;
die Mindestbreite ist 960 px.

**Abwägungen, die ich selbst getroffen habe — prüf, ob sie tragen:**

- **Ohne Zeiger gilt beim Abstand > 1 px das kleinste enthaltende Ziel** (`7466ab5`). Die Schwelle
  ist geraten, nicht gemessen; gemessen ist nur, dass nach einem Pfeil der Abstand 0 ist (die
  Ansagen der Pfeil-Szenen sind vorher und nachher gleich). Enthält kein Ziel die Mitte, bleibt es
  bei `closestCenter`. Beim Aufnehmen eines *platzierten* Bereichs gewinnt damit die Zelle unter
  seiner Mitte, nicht `box:<id>` — vorher war es über `closestCenter` dieselbe Zelle.
- **`isOwnPlace` beendet den Drag vor `handleDrop`**, für drei Formen: `box:<id>`, die Ablage für
  einen Chip und die linke obere Zelle der eigenen, sichtbaren Platzierung. Das ändert auch den
  Maus-Weg: Ein platzierter Bereich, per Maus auf seinem eigenen Kasten losgelassen, wurde vorher
  über `handleDrop` ausgewählt und ist es jetzt nicht mehr. Ich halte „ein Drag ohne Wirkung ändert
  die Auswahl nicht“ für richtig, weil der Chip es seit `dcb221b` so hält — gefragt hat niemand.
  Eine *andere* Zelle innerhalb des eigenen Kastens ist kein eigener Platz: Dorthin verschiebt der
  Drop die linke obere Ecke.
- **`absentFromPackageJson`**: Je Name zählen die Abschnitte, die den Namen halten, ohne dass die
  Liste ihn dort beansprucht; jeder davon deckt *einen* fehlenden Eintrag desselben Namens. Das
  hält die alte Antwort „eine verschobene Zeile ist eine Antwort“ für ein Paket in einem Abschnitt
  und nennt den fehlenden `peer`-Eintrag eines Pakets in zwei. **Nur gelesen, nicht gemessen**: der
  Fall der verschobenen Zeile selbst, und was bei drei Abschnitten desselben Namens passiert.
- **`entryLabels` schreibt den Abschnitt dazu, wo ein Name mehrfach in der Liste steht**
  („is-odd (peerDependencies)“). Der Abschnittsname ist npms Schlüssel, nicht übersetzt. Die
  Status-Liste der Seite nennt weiter nur Namen, jetzt dedupliziert.
- **`updateStashRestored`** ist ein sechster Satz auf dem Abbruch-Kanal, gesagt nach jedem
  geglückten Pop. Der Review-Vorschlag ließ offen, ob ein erfolgreicher Abbruch einen eigenen Satz
  bekommt oder schweigt; ich habe den Satz nur für den Fall gewählt, in dem git überhaupt etwas
  ausgibt (der Pop). Ein Abbruch ohne Stash bleibt still. Der Kasten auf der Updates-Seite zeigt
  damit auch nach einem ganz gewöhnlichen Abbruch mit Stash etwas, wo vorher nur gits Status stand.
- **`joinUniqueRules` teilt an der schließenden Klammer auf Tiefe 0.** Es kennt weder Strings noch
  Kommentare: Eine `}` in einem Kommentar oder einer URL zwischen zwei Regeln verschiebt die
  Grenze. Im Schriftblock schreibt die App die Regeln selbst, und ein Vorlagen-Paket bringt seine
  aus einem solchen Block mit — aber beide Blöcke stehen in einer Datei, die der Nutzer bearbeiten
  kann. Gleich ist, was bis auf Leerraum gleich ist; die erste Kopie gewinnt.
- **`nestedImportBlock` fragt die Datei, nicht Sass' Wortlaut** — dieselbe Meldung kommt auch für
  einen Namensraum, den der Nutzer von Hand verdoppelt hat. Die Datei wird dafür ein zweites Mal
  gelesen, nachdem Sass sie kompiliert hat. Der Knopf schreibt die Reihenfolge, die die Seite
  gerade zeigt; die Übersicht zeigt denselben Fehler ohne den Satz.
- **Befund 2 ist bewusst kein Code.** Die Frage „erst alle Rechner aktualisieren“ lässt sich von
  dieser Seite nicht erzwingen; der Satz steht in `docs/release.md` Punkt 7 für die Notizen des RC.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Die Kollisionsrechnung und `isOwnPlace` (`7466ab5`, `08d3f15`)

Gemessen an der gebauten App, `navigations-testprojekt`, erstes Frame, Desktop: der ausgeblendete
Chip `left` mit Leertaste · Leertaste und mit Pfeilen, `header` mit Leertaste · Leertaste, mit
↓ · ↑ und mit ↓ auf eine belegte Zelle. **Nicht gemessen**: ein Drag, bei dem die Seite scrollt;
ein anderer Breakpoint; ein Frame mit freien Zellen (also ein Drop, der wirklich verschiebt, nach
diesen Commits); die Maus auf dem eigenen Kasten (Auswahl vorher/nachher); ein Bereich, der über
mehrere Zellen reicht, per Tastatur aufgenommen; und das Layout-Board, das dieselbe
`nearestDroppableCoordinates` nutzt, aber seine eigene Kollisionsrechnung hat.

### 2. Der Abbruch-Kanal (`b415b86`)

Szenen AB1 und AB2 am Bündel mit echtem npm (Upstream E3 gegen ein eigenes `quartz/index.ts`,
`kind-of` uncommittet, einmal mit vorgemerkter `notes.txt`). **Nicht gemessen**: der gescheiterte
Pop (`updateStashPopFailed` steht vorn wie vorher, aber gits Text folgt jetzt nach einer Leerzeile
statt nach einem Umbruch), der verweigerte Abbruch (unverändert), die Notiz über einen älteren
Eintrag hinter einem geglückten Pop, und beide Seiten an der gebauten App.

### 3. Das Paket in zwei Abschnitten (`1bd5c1e`)

R2 mit echtem npm, Fehlschlag im `--save-peer`-Aufruf, danach ein zweiter Lauf ohne Fehlschlag.
Such die Lage, die das nicht trifft — besonders eine verschobene Zeile und ein Paket in drei
Abschnitten.

### 4. Der Schriftblock und der geschachtelte Import-Block (`f68866d`, `6ce4c82`)

Bündel für `joinUniqueRules` (Vorlagen-Import zweimal mit `projectWins`, dieselbe Schrift zweimal),
gebaute App für den Knopf (Zwei-Kopien-Datei deines Vorgängers, danach ein Block, 30 von 30 in
derselben Reihenfolge, Check grün). **Nicht gemessen**: eine Klammer in einem Kommentar des
Schriftblocks; der Knopf, während der Editor einen ungespeicherten Entwurf von `custom.scss` hält.

### 5. Die kleinen (`1aea7fa`, `b310bc9`, `97787cc`, `70cde5d`, Vault `084f425`)

Alle gebaut oder gelesen. Die Suche nach falschen `?tab=` war über `src/` und `scripts/`; das
Handbuch nennt Reiter mit Namen, nicht mit Schlüsseln.

## Wie gemessen werden kann

- **Der Dienst ohne App**: esbuild-Bündel (`--bundle --platform=node --format=cjs
  --external:electron --alias:@shared=./shared --tsconfig=tsconfig.node.json`), `electron` über
  einen Stub in einem `node_modules/electron/` neben dem Bündel. Lokales Upstream-Repo
  (A, E, E2, E3), Status ohne Netz über `url.<bare>.insteadOf`. Vorher-Bündel über
  `git archive review-2026-10-03`, beta.2 über `git archive v1.0.0-beta.2`.
- **npm echt** (das gepinnte aus `node_modules/npm`, gegen die Registry), wo nötig hinter einem
  `bin/npm`, das einen bestimmten Aufruf scheitern lässt.
- **Die gebaute App nicht-interaktiv**: `npm run build`, eigenes Playwright-Skript im Scratchpad,
  `playwright-core` über den absoluten Pfad, `--user-data-dir=<wegwerf>`,
  `page.emulateMedia({ colorScheme: null })`, Projekt über `window.quartzGui.projects.add`, Routen
  über `location.hash`. Ansagen über einen `MutationObserver` auf `[id^="DndLiveRegion"]`;
  Tastendrücke landen, wenn der Griff vorher per `focus()` fokussiert wird.
- **Ein Projekt zum Anfassen**: `cp -Rc` von `~/Documents/QuartzProjekte/navigations-testprojekt`
  in den Scratchpad. In der Kopie unter `content/` nichts schreiben.
- **Nicht gemessen** und deshalb offen für dich: die gepackte App; das gebaute Handbuch und das
  PDF; ein Screenreader; ERESOLVE; ein echter Push; die VMs; ein Lauf von
  `build-example-template.mjs`; helles Schema.

## Was diese Runde offen gelassen hat

1. **Die Richtungen der vorvorletzten Runde** sind weiter nicht verfolgt:
   `--diff-merges=first-parent` für die Antwort im Merge-Commit, `node_modules/.package-lock.json`
   als dritter Weg für `installFailed`.
2. **`Quartz-GUI:syntax:`** wartet auf das nächste Release der Vorlage, und der Satz zum Marker auf
   die Release-Notizen (`docs/release.md` Punkt 7).
3. **Das mitgelieferte Handbuch und das PDF sind nicht neu gebaut**, obwohl 2.2 und 3.4 sich
   geändert haben.
4. **Aus der offenen Liste der Vorrunden**: die gepackte App, ein echter Push, ERESOLVE, ein
   Screenreader (dein Vorgänger nannte für einen RC ausdrücklich VoiceOver über Git-Sync und den
   Frame-Builder), die VMs.

## Eine Frage über den Code hinaus

Dein Vorgänger hat die RC-Frage beantwortet: Aus dem Code spricht nichts dagegen, vor den Bau
gehören die gepackte App je Plattform, ein neu gebautes Handbuch, der Satz zum Marker in den
Notizen und — je nachdem, was „RC“ heißen soll — ein echter Push und ein Durchgang mit VoiceOver.
Wenn dir beim Lesen *dieser* Commits etwas begegnet, das die Antwort ändert — vor allem an den zwei
Drag-Änderungen, die mehr Verhalten ändern als alles andere in dieser Runde —, gehört es in einen
eigenen Abschnitt am Ende deines Dokuments, getrennt von den Befunden.

## Form der Befunde

Wie gehabt: je Befund eine Überschrift, eine Stufe (Hoch/Mittel/Niedrig), die Stelle im Code, was
schiefgeht, wie es sich zeigt und was dagegen spräche, es so zu lassen. Schreib das Ergebnis nach
`docs/REVIEW-2026-10-03.md`. Wenn eine Behauptung dieses Auftrags nicht trägt, ist das ein Befund
wie jeder andere — und wenn eine Richtung deines Vorgängers nicht trägt, auch.
