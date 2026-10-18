Du bist als zweites Paar Augen an einem Projekt, dessen Fassung `1.0.2` (2026-10-07) draußen ist
und dessen nächste, **1.1**, auf dem Branch `feat/1.1` entsteht. Es geht um ein Review — nicht um
Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Sie liest, was seit dem letzten Review gebaut wurde, und danach kommt kein Review mehr vor dem
Release.** Es folgen nur noch P8 aus `docs/plan-1.1-umsetzung.md` (Vorlagen neu bauen, Handbuch,
Release-Notizen, Packen). Ein Befund, der erst nach dem Release auffiele, erreicht Nutzer —
gewichte danach.

**Drei Blöcke, und nur einer davon ist eine gewohnte Runde der Serie.**

- **Block A — die Fixes des fünfundvierzigsten Reviews** samt Nebenbei-Liste. Zwei Mittel, acht
  Niedrig, sieben Nebenbei-Punkte, am 2026-10-16 abgearbeitet. Wie jede Runde die Fixes der
  vorigen liest.
- **Block B — die Texte und die Regeln.** Der Nutzer hat jeden deutschen Nutzertext gelesen und
  198 umgeschrieben (kürzer, ohne technische Begründung, „QuartzControl“ statt „die App“); die
  englischen folgen. `CLAUDE.md` und `docs/conventions.md` sind von 144 KB auf etwa 33 KB
  gekürzt, die Langfassung liegt wörtlich in `docs/decisions/conventions-full.md`. Dazu ein
  Umbau der Variablen auf der Stile-Seite.
- **Block C — der Alpha-Test vor 1.1.** Sechs Szenen an echten Projekten und der gepackten App,
  Protokoll `docs/ALPHA-2026-10-17.md`, fünf Befunde (1.1, 2.1, 3.1, 4.1, 6.1) und ihre Fixes,
  dazu sechs Nebenbei-Fixes vor Szene 3 und eine neue Regel.

**Gewichte B und C höher.** Block A hat ein Review als Grundlage. Die Fixes in C sind aus
Szenen entstanden und von niemandem gegengelesen; die Texte in B hat der Nutzer geschrieben, die
Übernahme in den Code und das Englische nicht, und den Variablen-Umbau hat niemand gelesen.

**Alles, was du liest, hat ein einziges Modell geschrieben**: Claude Opus 5.5 — die Commits aller
drei Blöcke, das fünfundvierzigste Review, das Alpha-Protokoll (bis auf die Beobachtungen des
Nutzers in Szene 3) und diesen Auftrag. Was als „gemessen“ dasteht, steht aus den
Commit-Nachrichten, dem Protokoll und den Absätzen in `docs/decisions/`; prüfe entsprechend. Eine
Zahl, die nicht stimmt, ist ein Befund.

In der Zählung von `CLAUDE.md` ist das das **sechsundvierzigste** Review. Die Dateinamen zählen
nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln, seit dieser Runde gekürzt; die Begründungen unter derselben Überschrift in
`docs/decisions/conventions-full.md`. Die Messungen stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md` (am Ende: was aus dem fünfundvierzigsten geworden ist). Dazu
`docs/REVIEW-2026-10-19.md` (das fünfundvierzigste) mit seinem Auftrag und
`docs/ALPHA-2026-10-17.md`.

## Umfang

Vom Tag `review-2026-10-20` (der Auftrag des fünfundvierzigsten) bis `review-2026-10-21`:

    git log --oneline review-2026-10-20..review-2026-10-21
    git diff review-2026-10-20..review-2026-10-21

58 Commits und dieser Auftrag.

### Block A — `review-2026-10-20..e20d43e` (20 Commits)

27 Dateien, +926 / −67. Was jeder Fix behauptet, steht am Ende von `docs/reviews.md`.

- `09421c4` — das Dokument.
- **`7732fdf` — Mittel 1**: Nach einer Vorlage von 1.1 werden die zwölf *oder* die 31
  Stylesheets geladen, nie beide.
- **`af784a3` — Mittel 2**: Das Basis-Template beginnt auf einem bestehenden Projekt mit „nur
  das Aussehen“ und sagt, was „Ersetzen“ tut.
- `f935c0d`, `56f93c0`, `8d74c33`, `a0b71eb`, `66006c5`, `fa9e747`, `3eb0855`, `8d933d3` — die
  Niedrigen. **`fa9e747`**: Speicher-Dialoge beginnen nicht im `content/` eines Projekts; der Fall
  mit Symlink in einen Vault ist nach eigener Angabe gelesen, nicht gemessen.
- `59ff80b` (Chronik), die Nebenbei-Liste `5de31a3`..`1b8cd65`, `e20d43e`.

### Block B — `e20d43e..4fa24da` (13 Commits)

20 Dateien, +2 915 / −2 365, davon das meiste Verschiebung von Regeltext.

- **`0db0bb8`, `758ea0f`, `c574051` — die Regeln.** `758ea0f` kürzt `conventions.md` auf je eine
  bis drei Sätze je Regel, legt die Langfassung nach `docs/decisions/conventions-full.md`, die
  Befehle nach `docs/scripts.md`, die Stand-Absätze nach `docs/stand.md` und den Ablauf je Befund
  in den Skill `.claude/skills/review-befund/`. Nach eigener Angabe geprüft: jede Überschrift der
  Langfassung steht in der Kurzfassung, alle relativen Links lösen auf.
- **`4d6afd6`, `d445733` — die Texte**, zwei Runden, `de.ts`, `en.ts`, `electron/main/i18n.ts`.
  Sechs Umschreibungen des Nutzers wurden angepasst, wo der kürzere Text eine Tatsache verlor.
- **`06c33c4`, `3fb2f2c`, `600ab9a`, `2429df1`, `371404f`, `816d31d` — die Variablen.** Der
  Scanner zählte Klammern in Strings; Build-Deklarationen, die der css-vars-Block selbst setzt,
  galten als „Original“; eine Variable ohne Basis heißt jetzt „eigene Variable“ und hat einen
  Mülleimer statt Zurücksetzen; `:root` unter `@media`/`@supports`/`@container` zählt nicht mehr als
  Grundwert; die Herkunft einer Projekt-Variable wird genannt; der Reiter „Basis“ hat zwei Karten.
- `7f93c52`, `4fa24da`.

### Block C — `4fa24da..review-2026-10-21` (25 Commits)

23 Dateien, +740 / −57 (davon 346 das Protokoll). Je Befund Fix und Eintrag ins Protokoll:

- **1.1** (Niedrig, „Projekt gewinnt“ schrieb einen falschen Kommentar in `custom.scss`) —
  `337bb5d`, `81e315b`, dazu `31c9afc`, `14ac61e` (der Plan sagt es vorher).
- **2.1** (Mittel, eigene Frames reisen über Git-Sync nicht mit) — `2dddc3f`, `20f0a93`.
- **4.1** (Mittel, ein frischer Klon kommt aus der App nicht zum Laufen) — `1676661`
  (`projectDependencies.ts`, „Installieren“ in der Übersicht, `installFromLock` installiert erst),
  `d728cde`.
- **6.1** (Mittel, ein Dev-Server mit langem ersten Build bleibt „starting“) — `46b1006`
  (`waitForPort` ohne Frist), `948bb83`.
- **3.1** (Niedrig, ausgegraut sieht man nicht) — `0d79b92` (Plakette „wirkt nicht“),
  `e4e7cd8`, Regel `e252631`, `29abfb9`.
- Nebenbei vor Szene 3: `401ef9f` (git-Status nur aus stdout), `dabced8` („Alles ok“ erst, wenn
  alle geantwortet haben), `ce1806f`, `f96f024`, `48fafac`, `7bb9032`, Protokoll `53e102a`.

## Abwägungen, die niemand gegengelesen hat

Block C zuerst, dann B, dann A.

**1. npm aus der Übersicht.** `1676661` lässt QuartzControl `npm install` in einem frisch
geklonten Projekt laufen, auf einen Klick in der Übersicht und vor „Aus quartz.lock.json
wiederherstellen“. **`npm install` führt die Lifecycle-Skripte der `package.json` und aller
Abhängigkeiten aus** — vorher tat das nur, wer es im Terminal selbst tippte. Sagt die Oberfläche,
was der Klick ausführt? Unterscheidet `missingDependencies()` „fehlt“ von „nicht lesbar“
(`null`) an jeder Stelle, die es liest, auch bei `workspaces`, `optionalDependencies`, einem
Symlink als `node_modules` und einem Paket, das unter anderem Namen installiert ist? Was passiert
bei einem Abbruch mitten im Install, und wird danach gebaut, obwohl er scheiterte?

**2. Ein Port ohne Frist.** `46b1006` lässt `waitForPort` laufen, solange der Eintrag „starting“
ist. **Wer antwortet auf dem Port?** Öffnet ein fremder Prozess denselben Port, bevor Quartz
fertig ist, wird der Server dann „running“, und die Vorschau zeigt eine fremde Seite? Läuft die
Probe nach „Stoppen“, nach einem Projektwechsel und beim Beenden der App wirklich aus, oder
hängt ein Timer, der ein Fenster überlebt? Die Gegenprobe im Commit (`process.exit(3)` nach
150 s) prüft einen Fall; prüfe den, in dem der Prozess lebt, aber nie lauscht.

**3. Eigene Frames auf dem zweiten Rechner.** `2dddc3f` sagt, dass die Frames nicht mitkamen und
welche Plugins scheiterten. **Stimmt die Grenze zwischen „nicht mitgekommen“ und „gelöscht“**,
und sagt die App es auf jeder Seite, die einen fehlenden Frame zeichnet, oder nur auf einer?
Bleibt der Satz stehen, wenn die Frames später ankommen?

**4. „Alles ok“ erst, wenn alle geantwortet haben.** `dabced8` wartet auf Inhalt, git, CSS und
Config. **Was zeigt die Übersicht, wenn einer nie antwortet** (git hängt, ein Lesen scheitert)?
Die Regel „Kann nicht prüfen ist nie alles gut“ verlangt eine eigene Antwort; „lädt“ für immer ist
keine. Dazu `401ef9f`: Ein git mit deutscher Ausgabe (lässt sich aus den
Übersetzungen der Quelle bauen): liest der Parser das noch?

**5. Die Plakette.** `0d79b92` setzt „wirkt nicht“ neben jede Option, die bei der gewählten
Variante nichts tut, `aria-hidden`, weil der Name den Grund trägt. **Stimmt die Zahl der
Plaketten mit der Zahl der Gründe an jeder Stelle, die `FieldRow` benutzt** (Navigationen,
Zusätzliche Inhalte, Mehrsprachigkeit, „Alle Optionen“, Inspektor der Bühne)? Die neue Regel in
`conventions.md` sagt „Eine Option ohne Wirkung trägt die Plakette“ — gilt das für jede Art,
nichts zu tun (auch `hideUnlessSet`, `entryReason`), oder nur für eine?

Dann Block B:

**6. 198 Texte, von Hand umgeschrieben, maschinell übernommen.** `4d6afd6` und `d445733` ersetzen
je Schlüssel. **Gibt es einen Text, dessen Platzhalter (`{name}`, `{count}`), Plural oder Genus
nicht mehr zum Aufrufer passt**, einen, der in `en.ts` etwas anderes sagt als in `de.ts`, oder
einen, der jetzt eine Tatsache weglässt, die eine datenkostende Verwechslung verhinderte (die
Regel sagt: solche Sätze bleiben lang)? Besonders: Bestätigungsdialoge vor Löschen, Restore,
Force-Push, Vorlage ersetzen, Content-Ordner umstellen. `npm run check:i18n` prüft Schlüssel,
nicht Sinn.

**7. Die Regeln, gekürzt.** `758ea0f` verdichtet 102 KB Regeltext auf 24 KB. Jede Sitzung liest
jetzt nur die Kurzfassung. **Gibt es eine Regel, deren Kurzfassung etwas anderes erlaubt oder
verbietet als die Langfassung** — eine weggefallene Ausnahme, eine Bedingung, die zur Pflicht
wurde, ein Verweis, der ins Leere zeigt? Prüfe nicht jede, sondern die, an denen Daten hängen
(Core-Update, Schlösser, Symlink-Schutz, `.quartz-gui/`, Snapshots, Vertrauensgrenzen) und die
Drag-Regel. Stimmt die Behauptung „jede Überschrift steht in der Kurzfassung“?

**8. Eine eigene Variable löschen.** `06c33c4` gibt einer Variable ohne Grundwert einen Mülleimer.
**Welche Variablen landen fälschlich dort** — eine, deren Grundwert in einem Stylesheet steht, das
der Scanner nicht liest (Plugin-CSS, `@import` aus `node_modules`, ein Theme), oder jetzt, nach
`3fb2f2c`, eine, die nur unter `@media` einen Wert hat? Löschen nimmt dann einen Wert, der wirkt.
Und `371404f`: Stimmt die genannte Herkunft bei zwei Stylesheets, die denselben Namen setzen?

Dann Block A:

**9. Zwölf oder 31.** `7732fdf` entscheidet, welche Stylesheets nach einer Vorlage geladen werden.
**Gilt das auch für ein Projekt, das nur einen Teil einer Vorlage von 1.1 bekam** (Szene 1 des
Alpha-Tests hat ein Projekt der Form 1.0 gefahren, nicht beide Formen mit Teilen), und nach einem
Restore auf einen Snapshot von davor?

**10. Der Speicher-Dialog und der Vault.** `fa9e747` ist für `content/` als Symlink nur gelesen.
**Miss es** an einer Kopie, deren `content/` auf ein Wegwerf-Verzeichnis zeigt (kein Vault).

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was der Nutzer verlieren kann

Abwägungen 1 (fremder Code läuft auf einen Klick), 8 (eine Variable, die wirkt, wird gelöscht),
6 (ein gekürzter Dialog, der eine Verwechslung nicht mehr verhindert), 9 und 3.

### 2. Was die App anders zeigt, als es ist

Abwägungen 2, 4 und 5 — ein Server, der „running“ ist, ohne dass Quartz lauscht; eine Übersicht,
die zu früh oder nie „Alles ok“ sagt; eine Plakette, die fehlt oder zu viel ist.

### 3. Was die nächste Sitzung falsch macht

Abwägung 7. Die Kurzfassung ist ab jetzt das, was jedes Modell an diesem Projekt liest.

### 4. Die Dokumentation

Stimmen `docs/ALPHA-2026-10-17.md` und die neuen Absätze in `docs/decisions/` mit dem Code? Das
Benutzerhandbuch kennt die neuen Texte und Flächen noch nicht; das ist bekannt (P8) und kein
Befund.

## Wenn du misst

An einer **Kopie** eines Projekts (`cp -Rc` von `gui-test`), gebaute App mit einem
**Wegwerf-Profil** (`--user-data-dir`). Der Skill `run-desktop` (`.claude/skills/run-desktop/`)
zeigt, wie man die gebaute App über Playwright fährt. Für Abwägung 1 ein frischer Klon in ein
Wegwerf-Verzeichnis, für Abwägung 2 eine Kopie, deren `quartz/cli/handlers.js` vor
`server.listen` wartet (so ist 6.1 gemessen), und ein zweiter Prozess auf dem Port. Für
Abwägung 8 `getVariableGraph()` gegen Kopien mehrerer Projekte, nicht nur eines.

## Was offen bleibt, und nicht für diese Runde

Bekannt und gesammelt; ein Befund dazu ist nur willkommen, wenn er schwerer wiegt als hier gesagt:

- **P8**: Vorlagen Example, Doku und Plugin neu bauen, Handbuch-Kapitel und Screenshots für alles
  aus 1.1, Release-Notizen, quartz-navigations 0.4.3, Version 1.1.0.
- Aus dem fünfundvierzigsten offen: der Seitentyp `excalidraw` ohne Anzeigenamen; Cmd+S bei nur
  einem getippten Feld der Seitenleiste; eine Komponente im Vorrat je Seitentyp ausschließen; ein
  umbenannter Sprachcode zieht nichts mit; CLI-Schreibvorgänge ohne Schloss der Config.
- Aufräumen auf den VMs (Testprojekt, alpha-6-Pakete, installiertes deb von `20f0a93`).
- Rückstand außerhalb von 1.1, wie am Ende von `docs/plan-1.1-umsetzung.md`: Linux-Schlüsselbund,
  macOS x64, glibc unter 2.34, C1 mit git vor 2.38.

## Eine Frage über den Code hinaus

Getrennt von den Befunden, am Ende deines Dokuments:

**Nach Review und Alpha-Test.** Das fünfundvierzigste empfahl statt einer weiteren Runde die
Alpha-Szenen; sie sind gefahren und haben drei Mittel gefunden, die 45 Reviews nicht gesehen
hatten (eins davon, 6.1, seit 1.0.2 draußen). **Was sagt das über die Flächen, die weder Review
noch Szene getroffen hat** — welche wären die nächsten Kandidaten, und lohnt sich davon etwas vor
dem Release, oder ist P8 der richtige nächste Schritt?

## Form der Befunde

Schreibe `docs/REVIEW-2026-10-20.md`. Je Befund: die Stelle (Datei, Funktion, Commit), was
passiert, wie es sich zeigt, was dagegen spräche es so zu lassen, und — wo du eine hast — eine
Richtung. Nach Gewicht sortiert, Hoch/Mittel/Niedrig, und je Befund, aus welchem Block er kommt.
Was du gemessen hast, kennzeichne als gemessen und sag womit; was du gelesen hast, als gelesen.
Eine Behauptung dieses Auftrags, die nicht trägt, ist ein Befund wie jeder andere. Was dir nebenbei
auffällt und kein Befund ist, kommt in einen eigenen Abschnitt am Ende.

**Ändere nichts am Code und committe nichts.** Die einzige neue Datei ist dein Dokument. Schreibe
in keinen Obsidian-Vault. In kein Projekt unter `~/Documents/QuartzProjekte/` — Kopien mit
`cp -Rc` sind der Weg (und `content/` ist dort oft ein Symlink in einen Vault: in der Kopie
darunter nichts schreiben, auch keine mtimes). Das Projekt `hinterland-history` nie lesen und aus
jeder Schleife über Projekte ausschließen. **Eintragen, Bauen, Serverstarten, npm-Installieren und
Vorlagen anwenden schreiben in das Projekt**: nur in einer Kopie. **Für die gebaute App ein
Wegwerf-Profil** (`--user-data-dir`); `npm run smoke` tut das selbst. Eine gebaute Website nur
über `--serve` auf `localhost`. **Löse keinen Schlüsselbund-Dialog aus**; die echten Zugänge und
Ziele dieses Rechners nicht anfassen und nicht abbilden. Prüfskripte mit Chrome öffnen keine
`mailto:`-Links. In den Plugin-Repos unter `~/Development/` nichts ändern. **Veröffentliche
nichts**, und pushe nichts.
