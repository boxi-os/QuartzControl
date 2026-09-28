Du bist als zweites Paar Augen an einem Projekt, dessen erste Fassung (`1.0.0`, 2026-09-25)
draußen ist. Die nächste soll **1.0.1** werden, eine reine Fehlerbehebung. Es geht um ein Review —
nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Es ist die erste Runde nach einem Release, und ihr Anlass sind Befunde eines Nutzers, nicht die
eines Reviews.** Der Nutzer hat 1.0.0 an seinen eigenen Projekten benutzt und sieben Fehler
gemeldet; sechs sind behoben, einer ist bewusst verschoben (siehe unten). Dazu kommen zwei Punkte,
die beim Beheben nebenbei auffielen — und einer davon ist der größte Eingriff dieser Runde.

**Alles, was du liest, hat ein einziges Modell geschrieben**: Claude Opus 5.5, in zwei Sitzungen
am 2026-09-27 und 2026-09-28, und dieser Auftrag stammt aus der zweiten. Was hier als „gemessen“
steht, steht aus der Erinnerung an die Messung und aus den Commit-Nachrichten; prüfe entsprechend.
Eine Zahl, die nicht stimmt, ist ein Befund.

In der Zählung von `CLAUDE.md` ist das das **achtunddreißigste** Review. Die Dateinamen zählen
nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md`, der Release-Ablauf in `docs/release.md`.

## Umfang

Von `main` (= `dd005d8`, zwei Doku-Commits nach dem Tag `v1.0.0`) bis `review-2026-10-13`:

    git log --oneline main..review-2026-10-13
    git diff main..review-2026-10-13

Das sind acht Commits auf dem Branch `fix/1.0.1` und dieser Auftrag; ohne ihn 18 Dateien,
+323 / −98. Dazu ein Commit außerhalb dieses Repos (Schicht 3).

### Schicht 1 — sechs Befunde des Nutzers (2026-09-27)

- `8ac60f9` — Die Liste „Server auf diesem Rechner“ (`DiscoveredServers.tsx`) sucht neu, sobald
  irgendein Projekt seinen Server-Status ändert, und eine Sekunde danach noch einmal, weil das
  Kind, das den Port hält, `npx` kurz überlebt. Vorher suchte sie nur beim Mount, bei Fokus und
  auf Klick.
- `c4cc7ab` — Das Layout-Board (`GlobalBoard.tsx`) übernimmt von einem eigenen Frame Spalten und
  Bereiche, aber **nicht mehr die Zeilenhöhen**. Anlass: Die Beispiel-Frames geben der linken
  Seitenleiste auf Mobil eine 0-px-Zeile (dort ist sie eine Schublade), und das Board zeichnete
  `before-body` über ihre Karten.
- `93d7765` — Eine Karte auf dem Board, deren Plugin `enabled: false` hat, trägt ein Badge
  „Deaktiviert“ und einen gedämpften Namen. Sie behält ihren Platz, weil die Config sie hält.
- `d5538ef` — „Lokal ausliefern“ fragt Google nicht mehr nach einer Familie, die `custom.scss`
  außerhalb des Google-Blocks selbst deklariert. Anlass: Nach dem Import der Basis-Vorlage stand
  Noto Sans zweimal da (3 Regeln aus der Vorlage, 54 von Google, 23 Dateien doppelt). Bleibt
  nichts zu fragen, bleibt der Block als einzeiliger Kommentar stehen, weil er das Kennzeichen
  ist, an dem die Bau-Tür erkennt, dass das Projekt seine Google-Schriften selbst hält.
  **Vertragsänderung** (`ownFamilies` im Ergebnis, additiv).
- `0c9f95c` — Seitenleiste, Karte „Projektbild“ und Startseite zeigen `icon.png`, sobald es nicht
  Quartz' eigenes ist — auch ohne die Markierung, die die App beim Wählen eines Bildes schreibt.
  Vorher zeigte ein Projekt aus der Basis-Vorlage in der App den Anfangsbuchstaben, daneben aber
  das dunkle Bild der Vorlage.
- `e51a4cb` — Wer bei einer Variable, deren Grundwert sich zwischen hell und dunkel unterscheidet,
  nur die helle Hälfte ändert, bekommt die dunkle jetzt ausdrücklich mitgeschrieben. Vorher
  schrieb die App eine einzelne ungeschichtete `:root`-Zeile, die Quartz' geschichtete dunkle
  Farbe schlug — die Website zeigte die neue helle Farbe auch im Dunkelmodus.

### Schicht 2 — zwei Nebenbei-Punkte (2026-09-28), dein Schwerpunkt

- `b4e32ba` — `findManagedBlocks` (`styleService.ts`) findet **jede** Kopie eines verwalteten
  Abschnitts, nicht nur die erste je Markername (`managedCopies`); `renameLegacyMarkers` benennt
  alle alten Kopien um (`replaceAll`). Gemessen an einem esbuild-Bündel von `styleService` mit
  zwei `css-vars`-Blöcken unter demselben Namen: vorher las die Seite eine von zwei Variablen,
  und nach dem Speichern stand der zweite Block mit dem alten Wert weiter da (und gewann, weil er
  später steht); nachher werden beide gelesen und das Speichern hinterlässt einen.
- `18f68db` — **Ein Schloss für jeden, der ein Stylesheet schreibt.** Bisher hielt nur
  `fontService` ein Schloss je Projekt (`whileHoldingFonts`). Die übrigen Schreiber von
  `custom.scss` — Variablen, Importreihenfolge, der ganze CSS-Reiter, die Adress-Migration an der
  Bau-Tür, der Vorlagen-Import — lasen die Datei, änderten ihren Abschnitt und schrieben alles
  zurück, am Schloss vorbei. Das Schloss liegt jetzt in `electron/main/services/styleLock.ts`
  (`whileHoldingStyles`) und umschließt:
  - alle Schreiber in `fontService` wie zuvor,
  - in `styleService` die neue `saveCustomScss` (der Kanal `styles.save` ruft sie statt
    `writeCustomScss`), `saveVariableOverrides`, `setImportOrder`, `migrateFontUrls`,
    `importStyleFile`, `writeStyleFile`, `createStyleFile`, `renameStyleFile`, `deleteStyleFile`
    — jeweils als Hülle um eine `…Now`-Funktion mit unverändertem Rumpf,
  - im Vorlagen-Import (`templatePackage/index.ts`) die Teile `styles`, `fonts` und
    `cssVariables`, jeweils als Ganzes.

  Es ist **wiedereintrittsfähig über `AsyncLocalStorage`**: Wer das Schloss für denselben Projekt-
  pfad schon hält, läuft direkt. Gemessen an einem Bündel beider Dienste mit einem gestellten
  `net.fetch` (Download 20 ms) und einem Speichern der Variablen 0–40 ms nach Beginn des Abrufs,
  je 300 Läufe: ohne Schloss verloren 44 bzw. 34 Läufe die Variable und 27 den Google-Block, mit
  Schloss 0 und 0. Dazu ein Lauf, der Anlegen, Umbenennen, Löschen und drei gleichzeitige
  Schreiber durchfährt, und ein Vorlagen-Import (`qc-basic.qtpl`, drei Teile) neben einem
  Speichern — beide ohne Hänger. **In diesem letzten Lauf kam das Speichern vor dem Import ans
  Schloss**; dass ein Import einen anderen Schreiber wirklich warten lässt, ist nur über die
  Wettlauf-Messung am Schloss belegt, nicht am Import selbst.

  Nichts davon ist an der gebauten App gemessen; der Test-Build des Nutzers
  (`release/test-fix-1.0.1/`) enthält diese zwei Commits nicht.

### Schicht 3 — außerhalb dieses Repos

- Handbuch-Vault `~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`, Commit `a3a1087` (lokal,
  **nicht gepusht**): Seite 3.3 „Das Projektbild“, deutsch und englisch, an zwei Stellen dem Fix
  `0c9f95c` nachgezogen — ohne eigenes Bild zeigt die App, was die Website zeigt, und „Bild
  entfernen“ holt das Bild der Vorlage zurück, nicht den Anfangsbuchstaben (gelesen an
  `clearProjectIcon`, das `.quartz-gui/icon-original.png` zurückkopiert). `check:handbook`: 26
  Zitate, keines veraltet. Die Website ist nicht neu gebaut.

## Abwägungen, die niemand gegengelesen hat

**1. Der Wiedereintritt erbt mehr als den Aufruf.** `AsyncLocalStorage` gibt den Zustand an alles
weiter, was im Lauf des Schlosses *entsteht* — auch an einen Timer, einen Event-Handler oder ein
Promise, das erst nach der Freigabe weiterläuft. Ein solcher Nachläufer hielte das Schloss für
gehalten und liefe an jedem Wartenden vorbei. **Gibt es unter den umschlossenen Funktionen eine,
die so etwas anstößt?** Und umgekehrt: **Gibt es einen Weg, auf dem ein Schreiber unter dem
Schloss auf etwas wartet, das selbst das Schloss braucht, aber *nicht* in seinem asynchronen
Kontext läuft** — dann hinge er für immer.

**2. Wie weit das Schloss reicht.** Es umschließt die Schreiber, die diese App über ihre
Stylesheet-Dienste führt. **Nicht** umschlossen sind die Wege, die `custom.scss` als Teil von
etwas Größerem schreiben: ein Restore aus einem Snapshot, `quartz sync --pull`, das Core-Update
(`git merge`), und der Nutzer im eigenen Editor. Und umgekehrt hält der Vorlagen-Import das
Schloss für die Dauer dreier Teile — die Bau-Tür wartet so lange. **Ist die Grenze an der
richtigen Stelle, und ist sie irgendwo gesagt, wo der nächste Leser sie findet?**

**3. Die eigene Schrift gewinnt, auch wenn sie weniger kann (`d5538ef`).** Eine Familie, die das
Projekt selbst deklariert, wird bei Google nicht gefragt — gleich mit welchen Schnitten. Hat die
eigene Regel nur 400 und die Typografie verlangt 400 und 700, bekommt die Website ein
synthetisches Fett. Der Vergleich geht über den Familiennamen ohne Groß-/Kleinschreibung. **Ist
das die richtige Antwort, und sagt die Seite genug darüber?**

**4. Eine ausdrücklich geschriebene dunkle Hälfte ist eingefroren (`e51a4cb`).** Die dunkle
Hälfte wird mit dem Grundwert des Themes geschrieben, der beim Speichern gilt. Ändert der Nutzer
später das Theme, bleibt die dunkle Farbe dieser Variable die alte. Vorher war sie falsch, jetzt
ist sie eine Momentaufnahme. **Ist das der bessere Fehler, und bemerkt ihn ein Nutzer?**

**5. Das Board ist kein Abbild der Seite mehr (`c4cc7ab`).** Die Zeilen wachsen mit ihren Karten;
eine Zeile, die auf der Website 0 px hoch ist, ist auf dem Board so hoch wie ihr Inhalt. **Täuscht
das an einer Stelle, an der der Nutzer die Höhe braucht, um zu entscheiden?**

**6. Zwei Kopien desselben Namens (`b4e32ba`).** `managedCopies` sucht nach dem Ende einer Kopie
die nächste. Eine Kopie, die in einer *gleichnamigen* steht, liest sie falsch (Anfang der äußeren
bis Ende der inneren) — das war vorher für die erste Kopie genauso. Zwei `fonts`-Blöcke werden
beim Lesen vereinigt und erst beim nächsten Schreiben dieses Abschnitts zu einem. **Gibt es einen
Leser, der eine Kopie noch einzeln fragt** (`findManagedBlock` direkt, die Regex in
`src/routes/Styles/fontDelivery.ts`, das Vorlagen-Skript `scripts/build-example-template.mjs`)?

**7. Neu suchen bei jedem Statuswechsel (`8ac60f9`).** Die Suche fragt die Prozesse und Ports des
Rechners ab. Sie läuft jetzt bei jedem Statuswechsel *jedes* Projekts zweimal. **Was kostet das
bei mehreren laufenden Servern, und kann eine langsame Suche eine schnellere überholen?**

## Worauf es ankommt, in dieser Reihenfolge

### 1. Das Schloss

Schicht 2, `18f68db`, gegen die Regeln „Zwei Türen auf denselben Ordner brauchen ein Schloss …“
und „Ein Vorgang, der ein Repository schreibt, wird im Hauptprozess gesperrt …“ in
`docs/conventions.md` und den neuen Absatz in `docs/decisions/styles-and-fonts.md`. Abwägungen 1
und 2. Jede Funktion, die jetzt unter dem Schloss läuft, und jede, die `custom.scss` oder eine
Datei unter `quartz/styles` schreibt und es nicht tut.

### 2. Was der Nutzer verlieren kann

Drei Wege: ein verlorener Abschnitt von `custom.scss` (das Schloss, und die gelesenen Kopien aus
`b4e32ba`); Schriftdateien, die gelöscht werden, weil `d5538ef` eine Familie nicht mehr bei Google
holt (der Google-Block wird kürzer, `deleteUnreferencedFontFiles` räumt die Dateien des alten);
und eine Farbe, die im Dunkelmodus anders aussieht als gewollt (`e51a4cb`).

### 3. Was eine 1.0.1 ausliefern würde, das kein Nutzer getragen hat

Schicht 1 hat der Nutzer an einem Test-Build durchgeklickt, Schicht 2 nicht. Lies Schicht 1 gegen
die Regeln des Renderers in `docs/conventions.md` — `VariableRow.tsx` hatte an denselben Stellen
in früheren Runden Befunde („Ein Bedienelement, das seinen Wert von außen bekommt …“).

### 4. Was draußen liegt

Der Vault-Commit `a3a1087` gegen den Code, den er beschreibt.

## Was offen bleibt, und nicht für diese Runde

- **Der siebte Befund des Nutzers ist verschoben, nicht vergessen**: Die einzige Instanz einer
  Komponente vom Board in den Vorrat zu ziehen, wird abgelehnt. Quartz kennt keinen Zustand
  „installiert, an, aber nirgends platziert“; die einzige ehrliche Abbildung wäre
  `enabled: false`. Der Nutzer hat entschieden, das nicht in 1.0.1 zu nehmen.
- **macOS x64 auf einer Maschine seiner Architektur**, **ein Linux mit glibc unter 2.34**, **C1 auf
  einem Linux mit git vor 2.38** — wie in den Runden davor.

## Eine Frage über den Code hinaus

Getrennt von den Befunden, am Ende deines Dokuments:

**Gehört das Schloss in eine Fehlerbehebungs-Fassung?** Die sechs Befunde des Nutzers sind kleine,
eng umrissene Fixes. `18f68db` ändert, wer wann auf wen wartet, in jedem Schreibweg der
Stile-Seite und im Vorlagen-Import — und behebt dafür einen Verlust, den noch kein Nutzer gemeldet
hat, der aber gemessen in jedem siebten gleichzeitigen Lauf eintritt. Spricht aus dem, was du
gelesen hast, etwas dafür, ihn bis nach 1.0.1 zurückzuhalten?

## Form der Befunde

Schreibe `docs/REVIEW-2026-10-12.md`. Je Befund: die Stelle (Datei, Funktion, Commit), was
passiert, wie es sich zeigt, was dagegen spräche es so zu lassen, und — wo du eine hast — eine
Richtung. Nach Gewicht sortiert, Hoch/Mittel/Niedrig. Was du gemessen hast, kennzeichne als
gemessen und sag womit; was du gelesen hast, als gelesen. Eine Behauptung dieses Auftrags, die
nicht trägt, ist ein Befund wie jeder andere.

**Ändere nichts am Code und committe nichts.** Die einzige neue Datei ist dein Dokument. Schreibe
in keinen Obsidian-Vault außer `Example` und `QuartzControl-Handbuch`, und in kein Projekt unter
`~/Documents/QuartzProjekte/` — Kopien mit `cp -Rc` sind der Weg (und `content/` ist dort oft ein
Symlink in einen Vault: in der Kopie darunter nichts schreiben). Für die gebaute App ein
Wegwerf-Profil (`--user-data-dir`). **Löse keinen Schlüsselbund-Dialog aus**: Eine gebaute App,
die unter dem Namen QuartzControl auf „QuartzControl Safe Storage“ zugreift, fragt den Nutzer auf
seinem Bildschirm. **Veröffentliche nichts**, und pushe nichts — auch nicht den Vault.
