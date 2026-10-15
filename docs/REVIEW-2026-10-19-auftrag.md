Du bist als zweites Paar Augen an einem Projekt, dessen Fassung `1.0.2` (2026-10-07) draußen ist
und dessen nächste, **1.1**, auf dem Branch `feat/1.1` entsteht. Es geht um ein Review — nicht um
Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Sie ist die letzte vor dem Release von 1.1.** Danach kommen nur noch Handbuch, Vorlagen,
Release-Notizen und das Packen (P8 in `docs/plan-1.1-umsetzung.md`). Ein Befund, der erst nach dem
Release auffiele, erreicht also Nutzer — gewichte danach.

**Sie liest drei Blöcke, und nur einer davon ist eine Runde der Serie.**

- **Block A — die Fixes des vierundvierzigsten Reviews.** Zwei Mittel, neun Niedrig, dazu die
  Nebenbei-Liste und zwei neue Regeln, am 2026-10-10/11 abgearbeitet. Wie jede Runde die Fixes der
  vorigen liest.
- **Block B — die zwölf Befunde des Nutzers vom 2026-10-14.** Aus der Bedienung gemeldet,
  einzeln abgearbeitet, ohne Review dahinter. Darunter zwei, die mehr sind als Oberfläche: das
  mitgelieferte Basis-Template lässt sich jetzt über „Vorlage anwenden“ auf ein **bestehendes**
  Projekt legen, und die Frames der Vorlage haben eine neue Zeilenaufteilung.
- **Block C — die Plugin-Optionen neu gegliedert.** Das gemeinsame Formular
  (`src/components/PluginOptionsForm/`) zeigt die Gruppen jetzt aus den Schemas der Plugins,
  graut Optionen ohne Wirkung an Ort und Stelle aus, faltet, markiert die Suche; Navigationen,
  Zusätzliche Inhalte und Mehrsprachigkeit stehen darauf. Dazu zwei Plugin-Releases
  (quartz-navigations und quartz-layout-box **0.4.2, veröffentlicht**) und am Ende eine
  mechanische Ersetzung „Knopf“ → „Button“ über App, Doku, Kommentare und Handbücher.

**Gewichte B und C höher.** Block A ist die gewohnte Arbeit. B und C sind aus Gesprächen
entstanden; Block C hat **ein** Gegenlesen in einem frischen Agenten gehabt, ohne Dokument (die
Funde stehen in `0234c38`..`07c12d2` und am Ende des Absatzes in
`docs/decisions/plugins-and-config.md`), Block B keines.

**Alles, was du liest, hat ein einziges Modell geschrieben**: Claude Opus 5.5 — die Commits aller
drei Blöcke, das vierundvierzigste Review, das Gegenlesen von Block C und diesen Auftrag. Was als
„gemessen“ dasteht, steht aus den Commit-Nachrichten und den Absätzen in `docs/decisions/`; prüfe
entsprechend. Eine Zahl, die nicht stimmt, ist ein Befund.

In der Zählung von `CLAUDE.md` ist das das **fünfundvierzigste** Review. Die Dateinamen zählen
nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md` (am Ende: was aus dem vierundvierzigsten geworden ist). Dazu
`docs/REVIEW-2026-10-18.md` (das vierundvierzigste) und sein Auftrag daneben.

## Umfang

Vom Tag `review-2026-10-19` (der Auftrag des vierundvierzigsten) bis `review-2026-10-20`:

    git log --oneline review-2026-10-19..review-2026-10-20
    git diff review-2026-10-19..review-2026-10-20

55 Commits und dieser Auftrag; ohne ihn 75 Dateien, +3 011 / −2 463.

### Block A — `review-2026-10-19..9c8cbd8` (21 Commits)

35 Dateien, +1 176 / −1 698 (das Minus ist überwiegend die alte Kopie der Markdown-Kette, die
`281531a` aus dem Repo nimmt). Was jeder Fix behauptet, steht am Ende von `docs/reviews.md`. Die
Fixes, in der Reihenfolge der Commits:

- **`755dc54` — Mittel 1, der Ankersprung in der Vorschau** landet wie auf der Website
  (`scroll-margin`, `scroll-padding`, `scroll-behavior` werden gelesen statt übergangen).
- **`3074372` — Mittel 2, der Reiter „Eigenes CSS“** sagt, wenn eine Klasse auch die Kopien trifft.
- `028b8cb`, `12f1100`, `10b6306`, `55f4f54`, `d8986ed`, `72ab29e`, `9f28595`, `57fd2b4`,
  `281531a` — die Niedrigen. **`72ab29e`** bringt einen neuen Kanal `styles.takenClasses`, der
  Stylesheets und `.quartz/plugins/*/dist` liest; **`9f28595`** erkennt ein Projekt aus der
  Vorlage von 1.1 an der ersten Zeile ihrer Stylesheets — geschrieben, als die Vorlage noch
  nirgends ausgeliefert war (siehe Abwägung 9).
- `8f86799` — auf Wunsch des Nutzers: die Platzhalter einer Box als Liste, Einfügen am Cursor.
- `860db4d` (das Dokument), die Nebenbei-Liste `f78179d`..`2bdeb1a`, die Chronik `6f75f37`,
  `42ccc93`, und `9c8cbd8` — zwei neue Regeln in `conventions.md` („Code, den die App in die
  Website setzt …“, „Was eine Kopie nicht erbt …“).

### Block B — `9c8cbd8..9249f3a` (17 Commits)

31 Dateien, +944 / −328. Die zwölf Punkte stehen als Liste nirgends im Repo; hier sind sie, mit
dem Commit dazu:

1. Dateiauswahl: „Änderungsdatum“ statt „Hinzugefügt am“, und 2. der Dialog ließ sich mehrfach
   öffnen — `19b26e7` (der Dialog beginnt im Ordner, in dem der letzte endete) und `e90470c`
   (Öffnen- und Speichern-Dialog hängen am Fenster).
3. `//`-Kommentare im SCSS-Editor wie `/* */` — `3e9d3b6`, `e4b1d20`.
4. Einrückhilfen im Editor — `f96ac13`.
5. Ein Link in einen anderen Bereich führt zurück — `6c8d663` (`state/returnLink.ts`).
6. Platzhalter doppelt — `96e4775`.
7. „Einen Frame … kennt QuartzControl nicht“ blitzte auf — `d96476e`.
8. **Vorlage**: Lücke vor After-Body bei kurzem Text und langer Seitenspalte — `5c020ef`
   (`scripts/example-template/frames.mjs`, eine leere `1fr`-Zeile vor dem Footer). Ausgerollt
   ist das nur in `qc-basic.qtpl` (`4a716a5`); Example, Doku und Plugin kommen mit P8.
9.–11. Layout-Seite: Abstände der Zusammenfassung, Kacheln klappen ihre Information auf,
   Frame-Einstellungen wieder über der Bühne — `bb69e2d`, `08f897c`, `8e0c639`, `0139a10`.
12. **„Vorlage anwenden“ bietet das mitgelieferte Basis-Template an** — `c129323`.

Dazu `cc64e77` („Box“ statt „Kasten“, Wortwahl des Nutzers), `4a716a5` (das Basis-Template von
1.1 mit zwölf Stylesheets in der App) und `9249f3a`.

### Block C — `9249f3a..review-2026-10-20` (17 Commits)

Zwei Teile:

- **`3285d8c`..`93c14be` — Navigationen und Zusätzliche Inhalte.** Eigene Tabellen der App,
  welche Option bei welcher Variante wirkt (`routes/Plugins/navigationVariants.ts`, `hasNoEffect`,
  `noEffectReason`, `VARIANT_KEYS`), das Formular mit `lead` (der Abschnitt der gewählten
  Variante), `inactiveReason`, `hideUnlessSet`, `entryReason` für `byLang`-Einträge, eine Suche,
  die die Gruppen stehen lässt und den Begriff markiert (`Marked`). In den Plugin-Repos dazu
  `ba3bc02` (quartz-navigations) und `03ac391` (quartz-layout-box): nur `x-quartz-group`,
  `-order`, `-advanced` und deren Übersetzung, kein neues Schlüsselwort. **Gemessen ist die
  Gliederung an gui-test, das zu dem Zeitpunkt 0.4.1 installiert hatte** — die `package.json`
  der Plugins wurden für die Messung getauscht und zurückgelegt (`59b83b8`). gui-test steht
  seit dem 2026-10-15 auf 0.4.2.
- **`b3e7919` — Mehrsprachigkeit.** Die Zeilen unter „Einstellungen“ kommen aus den Gruppen des
  installierten Schemas (`settingsGroups`), nicht mehr aus einer Liste der App; eine Gruppe, die
  nur aus einem Objekt besteht (`switcher`, `seo`), zeigt dessen Inneres mit `keyPrefix`
  (`switcher.style`); die Felder einer Sprache heißen wie ihre Schlüssel (`Field configKey`).
- **`45f04d7` — „Knopf“ → „Button“**, per Regex über 63 Dateien (auch außerhalb des Repos: die
  Handbuch-Vaults, das Example-Vault, das Schema von quartz-navigations, dort nicht
  veröffentlicht). Die Review-Protokolle blieben, `docs/decisions/` nicht.

## Abwägungen, die niemand gegengelesen hat

Block B zuerst, dann C, dann A.

**1. Eine Vorlage über ein bestehendes Projekt.** Bis `c129323` kam ein Paket nur aus einer Datei,
die jemand bewusst gewählt hat; jetzt steht das mitgelieferte unter „Vorlage anwenden“, einen
Klick entfernt. **Was nimmt das Anwenden einem Projekt, das schon eigene Stylesheets, Frames,
Schnipsel und eine Config hat** — und sagt der Dry-Run das, bevor es passiert? Liegt davor ein
Snapshot, und holt er alles zurück, was der Import schreibt (auch `_quartzcontrol.scss`, das das
Paket von 1.1 mitbringt, und `quartz/static/images`)? Ein Projekt in der Form von 1.0
(`custom.scss` mit den verwalteten Blöcken, 31 Stylesheets) bekommt Teile einer Vorlage in der
Form von 1.1: **Welcher Teil passt nicht zum anderen**, wenn der Nutzer nur einen Teil wählt —
etwa nur die Stylesheets, nicht die Variablen? Die Regel aus dem vierzigsten Review — kein
Schreiber zieht ein Projekt nach `_quartzcontrol.scss` um, der Vorlagen-Import auch nicht
(`replaceCustomBody`) — gilt sie hier noch?

**2. Die neue Zeile im Frame.** `5c020ef` ändert die Zeilen von `editorial` und `index`
(Desktop und Tablet, Mobil nicht). Die App rechnet aus den Frames eine Kopie in die Config
(Gruppenordnungen, `layout-frames.md`) und zeichnet sie auf der Bühne. **Zeichnet die Bühne eine
leere Zeile ohne Bereich richtig, zählt die Übersicht sie nicht als Bereich, und was passiert in
einem bestehenden Projekt, das die alten Frames hat und nur das Basis-Template anwendet** — trifft
die Rechnung dann zwei verschiedene Fassungen desselben Frame-Namens? Gemessen ist die Lücke an
einer gebauten Website, nicht an der Bühne.

**3. `//` in einem SCSS-Editor.** `3e9d3b6` zeigt `//` als Kommentar. In SCSS ist `//` in einem
String und in `url(http://…)` keiner. **Hält die Markierung beides auseinander**, und ändert sie
irgendetwas an dem, was gespeichert wird (sie sollte nur malen)?

**4. Der zuletzt benutzte Ordner.** `19b26e7` merkt sich, wo ein Dialog endete. **Wo steht das,
je Projekt oder app-weit, und kann ein Dialog in Projekt B im Ordner von Projekt A beginnen** —
mit der Folge, dass eine Datei aus dem falschen Projekt importiert wird? `e90470c` hängt die
Dialoge ans Fenster: Auf macOS wird daraus ein Sheet; **ist die Doppelöffnung damit für alle
Dialoge der App weg oder nur für die zwei**, und was tut der Renderer, während ein Sheet offen ist
(Cmd+S, ein `app:navigate` aus dem Menü)?

**5. Zurück-Link.** `markReturn` merkt sich den Ausgangsort je Projekt. **Was passiert, wenn das
Ziel den Nutzer weiterleitet** (ein Link aus Navigationen auf die Bühne, dort ein Klick auf „Frame
bearbeiten“), und zeigt der Link zurück auf einen Zustand, den es nicht mehr gibt (gelöschte
Navigation, umbenannte Sprache)?

Dann Block C:

**6. Eine Tabelle der App gegen das Plugin.** `hasNoEffect` sagt aus dem Rendering-Code von
quartz-navigations, welche Option bei welcher Variante nichts tut; `check:plugin-copies` hält das
gegen die echte Komponente. **Ein Fehler hier graut eine Option aus, die wirkt** — der Nutzer
lässt sie dann stehen oder sucht sie nicht. Prüfe die Tabelle am Rand: `mobile: accordion` mit
einer nicht aufklappenden Variante, `select` als Variante *und* als Mobil-Darstellung, die zwei
Varianten mit eigenem Renderer (`select`, `pager`). Und: **Was zeigt die App einem Projekt, das
noch 0.4.0 oder 0.4.1 installiert hat** — die Gruppen kommen dann aus dem alten Schema, der
Variantenabschnitt aus der Tabelle der App; ist das in jeder Kombination lesbar?

**7. Versteckt, solange nicht gesetzt.** `hideUnlessSet` lässt die Optionen anderer Varianten weg,
außer sie sind gesetzt oder werden gesucht. **Gibt es eine Option, die man so nicht mehr setzen
kann, obwohl sie wirkt** — weil die Tabelle sie einer anderen Variante zuschlägt, als das Plugin
liest? Und die Gegenrichtung: eine gesetzte, graue Option zurücksetzen — verschwindet sie dann,
während der Fokus auf ihrem Reset liegt?

**8. Mehrsprachigkeit ohne Schema.** Die Zeilen unter „Einstellungen“ hängen jetzt am Schema.
Scheitert das Lesen, steht dort ein Fehlersatz und keine Zeile — vorher waren die sechs Bereiche
aus der App immer da. **Ist das der richtige Preis**, und bleibt „Alle Optionen“ (Plugin-Liste)
dann ein Weg? Ein Plugin ohne `configSchema` (`source: 'defaults'`) bekommt eine Zeile „Weitere
Optionen“ — **mit allem außer den drei Sprachschlüsseln?** Beim Objekt mit `keyPrefix`: Ein
unbekannter Schlüssel *in* `switcher` — wo erscheint er, und überlebt er das Schreiben eines
Geschwisters?

**9. Die Vorlage von 1.1 ist jetzt ausgeliefert.** `9f28595` erkennt sie an
`TEMPLATE_FIRST_LINES`; seit `4a716a5` liegt sie in der App, und `c129323` legt sie auf
bestehende Projekte. **Erkennt die Stile-Seite ein so entstandenes Projekt als zusammengelegt —
auch dann, wenn nur ein Teil angewendet wurde?** Und bietet sie „Zusammenlegen“ oder „Jetzt
umstellen“ an, wo es nichts mehr zu tun gibt?

**10. Eine Regex über Prosa.** `45f04d7` hat „Knopf“ durch „Button“ ersetzt, auch in
`docs/decisions/`. Dort stehen **Zitate aus der App, wie sie zum Zeitpunkt einer Messung
lautete**; die stimmen jetzt mit der App überein, aber nicht mehr mit dem, was gemessen wurde.
Ist das ein Befund oder richtig so? Und: Gibt es Stellen, an denen die Ersetzung den Satz
grammatisch oder inhaltlich verbogen hat (Genus, Plural, ein Kompositum, ein Wort, das gar keinen
Bedienknopf meint)?

Dann Block A:

**11. Die Vorschau gegen die Website.** `755dc54` liest die Scroll-Abstände der Website, statt
sie zu übergehen; die neue Regel in `conventions.md` verlangt, dass so etwas *an der Website*
gemessen wird. **Ist es das — auf allen drei Breiten, mit `scroll-behavior: smooth`, und in der
Vorschau unter „Vorschau & Build“, die `55f4f54` mit dem Skript ohne Markierung versorgt?**

**12. `styles.takenClasses` liest Plugin-Code.** Der Kanal liest `.quartz/plugins/*/dist` als
Text und sucht Klassennamen. **Wie groß wird das in einem Projekt mit vielen Plugins, und wird es
bei jedem Anlegen einer Navigation neu gelesen?** Eine Liste, die zu viel findet, kostet einen
Namen; eine, die zu wenig findet, eine Kollision.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was der Nutzer verlieren kann

Abwägungen 1, 2 und 9 — eine Vorlage, die einen Klick entfernt über einem bestehenden Projekt
liegt, ist die größte neue Fläche dieser Runde. Dazu 4 (eine Datei aus dem falschen Projekt) und
7 (eine Option, die wirkt, aber nicht erreichbar ist).

### 2. Was die App anders zeigt, als es ist

Abwägungen 6, 8, 11 — eine graue Option, die wirkt, und eine Vorschau, die anders springt als
die Website.

### 3. Was von draußen hereinkommt

Abwägung 12 und die Schema-Gruppen der Plugins (Block C): Die App zeigt Gruppennamen und Texte
aus einer `package.json`, die ein Plugin-Autor schreibt. Gilt dafür, was für jeden anderen Text
aus einem Plugin gilt?

### 4. Die Dokumentation

Stimmen die Absätze in `docs/decisions/plugins-and-config.md` (Gliederung der Optionen) und die
Wortschatz-Zeile in `conventions.md` mit dem Code? Das Benutzerhandbuch kennt die neuen Reiter,
die Gliederung, das Basis-Template unter „Vorlage anwenden“ und den Zurück-Link noch nicht; das
ist bekannt (P8) und kein Befund.

## Wenn du misst

An einer **Kopie** eines Projekts (`cp -Rc` von `gui-test`, das quartz-navigations,
quartz-layout-box und quartz-multilanguage in 0.4.2 bzw. 0.2.0 hat), gebaute App mit einem
**Wegwerf-Profil** (`--user-data-dir`). Die Messskripte der Serie liegen nicht im Repo; der
Skill `run-desktop` (`.claude/skills/run-desktop/`) zeigt, wie man die gebaute App über
Playwright fährt. Für Abwägung 1 ein Projekt in der Form von 1.0 (ohne `_quartzcontrol.scss`) und
eines in der Form von 1.1, je einmal ganz und einmal nur mit Teilen angewendet. Für Abwägung 6
`npm run check:plugin-copies -- <kopie>`.

## Was offen bleibt, und nicht für diese Runde

Bekannt und gesammelt; ein Befund dazu ist nur willkommen, wenn er schwerer wiegt als hier gesagt:

- **P8**: Vorlagen Example, Doku und Plugin neu bauen (noch 31 Stylesheets und alte Frames),
  Handbuch-Kapitel und Screenshots für alles aus 1.1, Release-Notizen, quartz-navigations 0.4.3
  (nur „Button“), Version 1.1.0.
- Der Seitentyp `excalidraw` hat keinen Anzeigenamen; Cmd+S greift nicht, wenn nur ein getipptes
  Feld der Seitenleiste geändert ist; eine Komponente im Vorrat lässt sich je Seitentyp nicht
  einzeln ausschließen.
- Der Vorschlag des vierundvierzigsten Reviews, vor Änderungen an einer Vertrauensgrenze eine
  Zehn-Zeilen-Notiz zu schreiben — er wartet auf den Nutzer.
- Ein umbenannter Sprachcode zieht weder Inhaltsordner noch `byLang`-Schlüssel anderer Plugins
  mit; die CLI-Schreibvorgänge stehen unter keinem Schloss der Config.
- Rückstand außerhalb von 1.1, wie am Ende von `docs/plan-1.1-umsetzung.md`: VoiceOver, Linux-
  Schlüsselbund, macOS x64, glibc unter 2.34, C1 mit git vor 2.38.

## Eine Frage über den Code hinaus

Getrennt von den Befunden, am Ende deines Dokuments:

**Die Runde vor einem Release.** Die Serie liest seit 44 Runden, was die vorige gebaut hat, und
hat dabei in jeder Runde etwas gefunden. Vor 1.0.0 haben drei Reviews in Folge empfohlen, statt
einer weiteren Runde die Dinge zu tun, die nur der Nutzer tun kann (Alpha-Test an echten
Projekten, gepackte App je Plattform). **Was davon gilt für 1.1** — welche Szenen eines
Alpha-Tests (`docs/alpha-test.md`) würden die Flächen von Block B und C treffen, die kein Review
am Code sieht?

## Form der Befunde

Schreibe `docs/REVIEW-2026-10-19.md`. Je Befund: die Stelle (Datei, Funktion, Commit), was
passiert, wie es sich zeigt, was dagegen spräche es so zu lassen, und — wo du eine hast — eine
Richtung. Nach Gewicht sortiert, Hoch/Mittel/Niedrig, und je Befund, aus welchem Block er kommt.
Was du gemessen hast, kennzeichne als gemessen und sag womit; was du gelesen hast, als gelesen.
Eine Behauptung dieses Auftrags, die nicht trägt, ist ein Befund wie jeder andere. Was dir nebenbei
auffällt und kein Befund ist, kommt in einen eigenen Abschnitt am Ende.

**Ändere nichts am Code und committe nichts.** Die einzige neue Datei ist dein Dokument. Schreibe
in keinen Obsidian-Vault. In kein Projekt unter `~/Documents/QuartzProjekte/` — Kopien mit
`cp -Rc` sind der Weg (und `content/` ist dort oft ein Symlink in einen Vault: in der Kopie
darunter nichts schreiben, auch keine mtimes). **Eintragen, Bauen, Serverstarten und Vorlagen
anwenden schreiben in das Projekt**: nur in einer Kopie. **Für die gebaute App ein
Wegwerf-Profil** (`--user-data-dir`); `npm run smoke` tut das selbst. Eine Messung, die die Config
schreibt, legt im Projekt einen Snapshot an — in einer Kopie egal, im Original nicht. Eine gebaute
Website nur über `--serve` auf `localhost`. **Löse keinen Schlüsselbund-Dialog aus**; die echten
Zugänge und Ziele dieses Rechners nicht anfassen und nicht abbilden. Prüfskripte mit Chrome öffnen
keine `mailto:`-Links. In den Plugin-Repos unter `~/Development/` nichts ändern. **Veröffentliche
nichts**, und pushe nichts.
