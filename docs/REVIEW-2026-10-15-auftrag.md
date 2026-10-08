Du bist als zweites Paar Augen an einem Projekt, dessen Fassung `1.0.2` (2026-10-07) draußen ist
und dessen nächste, **1.1**, auf dem Branch `feat/1.1` entsteht. Es geht um ein Review — nicht um
Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Sie liest zwei Dinge, die verschieden alt und verschieden geprüft sind.** Teil A sind die Fixes
des vierzigsten Reviews, wie jede Runde die Fixes der vorigen liest. Teil B ist neu und
der Hauptteil: eine Runde nach einer Rückmeldung des Nutzers zu 1.1, die das Muster des
Layout-Editors — Liste links, Seitenleiste rechts — auf acht Seiten getragen und drei eigene
Editoren für die drei eigenen Plugins gebaut hat. **Für Teil B gibt es keinen Plan im Repo**; die
Stellungnahme samt Entscheidungen des Nutzers steht in
`/Users/boxi/.claude/plans/starry-painting-abelson.md` (lesen, nicht ändern), und die Kurzfassung
steht unten.

**Alles, was du liest, hat ein einziges Modell geschrieben**: Claude Opus 5.5, am 2026-10-08, und
dieser Auftrag stammt aus derselben Sitzung. Das vierzigste Review stammte ebenfalls von diesem
Modell (in einem eigenen Agenten). Was als „gemessen“ dasteht, steht aus den Commit-Nachrichten;
prüfe entsprechend. Eine Zahl, die nicht stimmt, ist ein Befund.

In der Zählung von `CLAUDE.md` ist das das **einundvierzigste** Review. Die Dateinamen zählen nach
Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md` (am Ende: was aus dem vierzigsten geworden ist). Dazu `docs/plan-1.1.md`,
`docs/plan-1.1-umsetzung.md`, `docs/REVIEW-2026-10-14.md` (das vierzigste) und der Plan oben.

## Umfang

Vom Tag `review-2026-10-15` (der Auftrag des vierzigsten) bis `review-2026-10-16`:

    git log --oneline review-2026-10-15..review-2026-10-16
    git diff review-2026-10-15..review-2026-10-16

27 Commits und dieser Auftrag; ohne ihn 65 Dateien, +7 749 / −1 909. Der erste Commit
(`dad1e77`) ist das Dokument des vierzigsten Reviews selbst.

### Teil A — die Fixes des vierzigsten Reviews (`fbdfa32`..`874935c`, 10 Commits)

31 Dateien, +607 / −72. Was jeder Fix behauptet, steht am Ende von `docs/reviews.md`; die
Befunde, auf die sie antworten, in `docs/REVIEW-2026-10-14.md`. Kurz:

- `fbdfa32` weitergetragene Ladereihenfolge aus `parseImportOrder` neu gebildet.
- `8552f53` **kein Schreiber zieht mehr um**: „Jetzt umstellen“ (`styles.migrate`) mit Snapshot
  `styleMigration`; neue Projekte ziehen beim Anlegen um, der Vorlagen-Import nicht. Nicht
  gemessen laut Chronik: der Assistent zum Anlegen.
- `c3964a3` ein gespeicherter Entwurf von `_quartzcontrol.scss` bleibt im Editor.
- `413fa0d` Plugin-Optionen gegen den neuesten Stand, hintereinander.
- `a084ca4` was beim Ausschalten mitgeht (`quartz.category`).
- `0eecdbb` Cmd+S auf der Bühne immer registriert.
- `9ffa4f5` unbekannte `x-quartz-*` als Notizen, `docs/plugin-config-schema.md`.
- `4e7ec59` Kollisionen nur bei gleichem Selektor.
- `2350428` Instanznummer eines Chips.
- `6d0ab55` Endung der Quelle beim Import.
- `874935c` Konventionen, Chronik, `CLAUDE.md`.

**Frage zu Teil A:** Trägt jeder Fix, was er behauptet — und hat Teil B einen davon wieder
aufgemacht? Teil B hat `Installed.tsx`, `PluginOptionsForm`, `snippetService.ts`, `Variables.tsx`
und `VariableRow.tsx` umgebaut, also gerade die Stellen von `413fa0d`, `a084ca4`, `6d0ab55` und
`4e7ec59`.

### Teil B — Seitenleiste überall, drei Plugin-Editoren (`1571357`..`96a1bb5`, 14 Commits)

47 Dateien, +6 807 / −1 837. Die Entscheidungen des Nutzers: Seitenleiste als Muster für jede
Seite, auf der man heute etwas aufklappt; Auswahl im Layout lösbar; Struktur Seitentyp ↔ Frame ↔
Komponente sichtbar; eigene Editoren für quartz-navigations, quartz-layout-box und
quartz-multilanguage; **Vorschau = die echte Seite des Dev-Servers**; alles in 1.1, P8 wartet.

**B1 — das Primitive.** `DetailLayout` und `SelectableRow` in `src/components/ui.tsx`
(`600d886`, `365e299`): Liste links, klebende Leiste rechts mit eigenem Roller; Escape und ein
Klick ins Leere lösen die Auswahl (`onDismiss` optional), ein Klick, dessen Zeiger sich mehr als
4 px bewegt hat, zählt nicht; Escape bleibt in Select, Textarea, Dialog, offener Combobox und
während eines Drags liegen, ein einzeiliges Feld gibt es ab. `SelectableRow` legt den Fokus auf den
Namensknopf, bevor es auswählt — sonst stand er auf `<body>` und Escape kam nie an (an drei
Stellen erst nachträglich gefunden: `365e299`, `ad49cbc`, `96a1bb5`).

**B2 — Layout** (`1571357`, `d3fa14e`, `600d886`, `ddb7143`):

- Frame-Editor mit Seitenleiste und **ziehbaren Bereichskanten** (acht Griffe, Pointer-Events
  mit Capture, *nicht* dnd-kit; Rasten an Gitterlinien, Stopp vor Nachbarn, Escape bricht ab,
  Ansage beim Loslassen). Laut Commit steht das Editorial-Frame bei 1280 px 2 px über.
- Die 800-px-Meldung der Bühne ist weg; Begründung: `buildQuartzBreakpointCompat` schreibt
  `.desktop-only`/`.mobile-only` auf die Mobil-Breite des Frames um, gemessen am gebauten Example
  bei 750/850/950 px. **Nur für eigene Frames** — prüfe, ob die Bühne für eine Seite mit Quartz'
  eingebautem Frame jetzt etwas anderes zeigt als die Website.
- Leere Seitenleiste = „Zusammenfassung“ (`LayoutSummary.tsx`).
- Reiter „Frames“ ohne Vorschaltseite; Quartz' Standard-Frame schreibgeschützt aus
  `defaultFrame.ts` (**eine Abschrift** von `variables.scss`/`base.scss`), „Als eigenes Frame
  anpassen“ macht einen Entwurf; jeder Weg weg von einem geänderten Entwurf fragt.
- Neuer erster Reiter „Übersicht“ (`PageTypeOverview.tsx`), die Reiter heißen jetzt Übersicht,
  Komponenten (URL-Wert weiter `global`), Frames.

**B3 — Plugins** (`b1f2cbc`, `cd0df7e`, `ee2f73e`, `8ac6921`, `577dd2c`, `96a1bb5`):

- „Installiert“ einspaltig, Optionen in der Leiste; das Formular faltet Gruppen, sucht ab acht
  Optionen, markiert „geändert“; Escape im Suchfeld leert es statt die Leiste zu schließen.
- **Navigationen**: eine Instanz je Zeile, Anlegen über die Art (zehn Kacheln, eine dritte Haut
  von `SegmentedControl`), was die Art nicht liest, faltet weg — **laut `navigationVariants.ts`,
  einer Abschrift von `render.tsx` aus quartz-navigations 0.4.1**. Duplizieren lässt `id` weg.
  Vorschau: `SitePreview.tsx` zeigt den Dev-Server im `<iframe>` in echter Gerätebreite,
  skaliert auf die Spalte; neu geladen wird über den Websocket des Dev-Servers.
- **Zusätzliche Inhalte** (`ExtraContent.tsx`, `ExtraContentFiles.tsx`, `layoutBoxes.ts`): je Box
  „Text in der Konfiguration oder Datei“; eine Dateien-Karte über die Snippets aller Ordner, die
  eine Box liest, und die Bilder unter `quartz/static/images`, mit „wird benutzt von“. **Drei neue
  Kanäle, die in das Projekt schreiben**: `staticFiles.listImages|rename|trash`. Ein Umbenennen
  eines Snippets schreibt jede Box mit um, die es nennt; ein Bild umbenennen fragt, wenn Text es
  erwähnt, und lässt den Text stehen. Gelöscht wird über `shell.trashItem` (Papierkorb des
  Systems) — **im Commit gestubbt, der echte Papierkorb ist ungemessen**, auf Linux und im Flatpak
  erst recht.
- **Mehrsprachigkeit** (`Multilanguage.tsx`, `multilanguageOptions.ts`): Sprachen als Liste;
  Umbenennen/Entfernen zieht `defaultLanguage`, `publishLanguages`, `seo.xDefault` mit; die
  Vorgaben „folgen `options.ts` des Plugins“ (**eine zweite Abschrift**). Bekannt und offen: ein
  umbenannter Sprachcode zieht weder Inhaltsordner noch `byLang`-Schlüssel anderer Plugins mit.

**B4 — die übrigen Seiten** (`365e299`, `02a1400`, `7f34418`, `c9e52de`, `ad49cbc`, `96a1bb5`):

- **Snapshots** als Zeilen, Vergleich/Diff/Wiederherstellen/Export in der Leiste.
- **Veröffentlichen**: Ziele als Zeilen, Details und Formulare (Ziel, darunter Zugang) in der
  Leiste. Die Auswahl ist Pflicht, also schließt Escape nur ein offenes Formular (fragt, wenn
  geändert). `ConnectionForm` verliert seine dritte Spalte.
- **Einstellungen → Zugänge**: Formular in der Leiste, Auswahl sticky per ID, Verlassen eines
  geänderten Formulars fragt — außer über „Abbrechen“.
- **Marktplatz**: Zeilen, README in der Leiste. **Neuer Kanal `marketplace:readme`**
  (Objekt-Argument, zod lässt nur ein `owner/repo` in den Pfad zu api.github.com), mit dem
  gespeicherten GitHub-Token, höchstens 256 KB, `ok`/`missing` (gecacht)/`unavailable`.
  **`ReadmeText.tsx` rendert fremdes Markdown ohne HTML** — eigener Leser, Links relativ auf
  github.com aufgelöst, `target="_blank"`.
- **Stile → Variablen**: eine Zeile wählt nur noch aus, der Editor der Variable sitzt in der
  Leiste. `VariableRow` ist weiter *eine* memoisierte Komponente mit `variant: 'row' | 'panel'`, mit
  eigenem Lese-Log je Variante. Tastendruck-Kosten bei großem Theme **nicht neu gemessen**.

## Abwägungen, die niemand gegengelesen hat

**1. Drei Speichersemantiken nebeneinander.** Die Plugin-Reiter (Installiert und alle drei
Editoren) schreiben jede Änderung sofort; Variablen, Frames und die Bühne schreiben in einen
Entwurf mit Speichern im Kopf; Ziele und Zugänge haben ein Formular mit eigenem Speichern in der
Leiste. Alle drei sehen jetzt gleich aus — Zeile links, Leiste rechts. **Erkennt der Nutzer, welche
er vor sich hat, und gibt es einen Weg, auf dem ein Wert in genau einer davon verloren geht** —
Escape, Klick ins Leere, Klick auf eine andere Zeile, Routenwechsel über die Sidebar, während ein
Feld noch fokussiert ist, Cmd+S?

**2. „Klick ins Leere löst die Auswahl“ gegen „Auswahl ist Pflicht“.** Veröffentlichen gibt kein
`onDismiss`, Zugänge fragt, Variablen und Plugins lassen still los. Der `SELECTING`-Selektor in
`DetailLayout` zählt auf, worauf ein Klick landen darf, ohne zu lösen. **Ist das eine Regel oder
acht Ausnahmen — und was passiert mit einem Klick auf etwas, das die Liste nicht kennt** (ein
Link, ein `<summary>`, ein Toast, der Rollbalken der Leiste)?

**3. Drei Abschriften fremden Codes im Renderer.** `navigationVariants.ts` (render.tsx 0.4.1),
`multilanguageOptions.ts` (options.ts des Plugins), `defaultFrame.ts` (Quartz' SCSS). Die
Konvention „Ein Prüfskript, das Logik der App braucht, lädt sie, statt sie abzuschreiben“ und „Ein
Wert, den ein fremdes Programm vergleicht, wird nach dessen Regel gebildet — und gegen das fremde
Programm geprüft“ haben dafür Prüfskripte erzwungen (`check:plugin-names`). **Was sagt die App,
wenn das installierte Plugin eine andere Fassung ist, und braucht es eine Gegenprobe?**

**4. Eine Datei umbenennen, die die Config nennt.** Ein Snippet-Umbenennen schreibt eine Datei
und die Config — zwei Schreibvorgänge, verschiedene Dateien. **In welcher Reihenfolge, was bleibt
nach einem Abbruch dazwischen, läuft es unter dem Stile-Schloss oder braucht es keins**, und trifft
„wird benutzt von“ alle Benutzer (eine Box per Vorgabe des Plugins, eine `byLang`-Fassung, ein
Snippet, das ein Bild per relativem Pfad nennt)?

**5. Der Papierkorb als Rückweg.** „Nothing is deleted“ hängt an `shell.trashItem`. Auf Linux
ohne Papierkorb, im Flatpak-Sandkasten oder auf einem Netzlaufwerk scheitert es oder löscht. **Was
sagt die App dann?**

**6. Fremdes Markdown, ein Token und ein Link nach draußen.** Der README-Leser baut nie HTML, aber
er baut Links, die `setWindowOpenHandler` an den Browser gibt, und der Token geht mit der Anfrage
mit. **Kann ein README einen Link bauen, der etwas anderes als http(s) öffnet, kann ein
Katalogeintrag den Pfad der Anfrage so lenken, dass der Token woanders hin geht, und hält der Leser
eine böswillige Eingabe aus** (sehr lange Zeilen, verschachtelte Klammern in der Link-Regex,
256 KB ohne Zeilenumbruch)?

**7. Die echte Seite im Panel.** `SitePreview` bettet `http://localhost:<port>` ein; die CSP hat
dafür `frame-src http://localhost:* http://127.0.0.1:*`. Die Seite führt das JavaScript der Plugins
des Projekts aus. **Erreicht ein Unterrahmen etwas vom Preload, kann er das App-Fenster
wegnavigieren, und was zeigt die Vorschau, wenn `host` (Quartz' `--remoteDevHost`) gesetzt ist?**

**8. Escape hat jetzt viele Hörer.** DetailLayout, das Suchfeld des Formulars, das Modal, die
Combobox, dnd-kits `KeyboardSensor`, die Kantengriffe des Frame-Editors. **Gibt es eine Stelle, an
der eine Escape zwei Dinge tut oder das falsche** — ein Drag abgebrochen *und* die Auswahl
gelöst, ein Suchfeld geleert *und* die Leiste geschlossen?

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was der Nutzer verlieren kann

Abwägungen 1, 4 und 5; die neuen schreibenden Kanäle (`staticFiles.*`) gegen die Regeln über
Vertrauensgrenzen, `containedPath()`/`writableTarget()` und Symlinks in `docs/conventions.md`;
`Multilanguage.tsx` beim Umbenennen und Entfernen einer Sprache; der Frame-Entwurf aus dem
Standard-Frame; und Teil A gegen Teil B (siehe die Frage dort).

### 2. Was die App anders zeigt als die Website oder das Plugin

Die drei Abschriften (Abwägung 3); die Bühne nach dem Wegfall der 800-px-Meldung, auch für
eingebaute Frames; die Zusammenfassung und die Übersicht gegen das, was Quartz je Seitentyp baut
(die Regeln „Ein Bereich eines Frames ist Geometrie …“ und „Eine Priorität ordnet innerhalb eines
Bereichs …“); die Vorschau in Gerätebreite gegen die Breakpoints des Projekts.

### 3. Was von draußen hereinkommt

Abwägungen 6 und 7.

### 4. Die Oberfläche

Die acht Seiten mit Leiste gegeneinander: dasselbe Verhalten für dieselbe Geste, Fokus nach jeder
Auswahl, Ablage und Löschung (nie `<body>`), Live-Regionen für das, was ohne Zutun erscheint,
`SegmentedControl` mit drei Häuten, kein waagerechter Bildlauf bei 1280 und 1728 px, deaktivierte
Controls lesbar, ein Wort ein Name (`de.ts`/`en.ts` — „Übersicht“ ist jetzt ein Reiter des Layouts
und eine Seite der Sidebar), `CardHeading`, Mülleimer-Regel. Und die Kantengriffe gegen die
DnD-Regel: sie sind kein dnd-kit — **gibt es einen Tastaturweg zum selben Ergebnis?**

## Was offen bleibt, und nicht für diese Runde

Bekannt und gesammelt; ein Befund dazu ist nur willkommen, wenn er schwerer wiegt als hier gesagt:

- **P8** steht weiter aus (Vorlagen neu bauen, Handbuch, Release-Notizen) — dazu jetzt: Handbuch-
  Kapitel und Screenshots für die neuen Reiter und Leisten; die Messwege dieser Runde stehen nicht
  in `docs/plan-1.1-umsetzung.md`.
- `variant="chips"` von `SegmentedControl` hat keinen Aufrufer mehr (in `conventions.md` gesagt).
- Die Einstellungen sind auf `max-w-5xl` gekappt, die Liste neben der Leiste ist dort schmal.
- Variablen haben zwei Wege zum Zurücksetzen.
- `ReadmeText` kennt keine Bilder, keine verschachtelten Listen, keine HTML-Tabellen.
- `check:i18n` findet keine *ungenutzten* Schlüssel.
- Messungen, die die Config schreiben, legen Snapshots an.
- In einer Abschnittsleiste der Mehrsprachigkeit steht die Gruppenüberschrift doppelt.
- Ein umbenannter Sprachcode zieht weder Inhaltsordner noch `byLang`-Schlüssel anderer Plugins mit.
- Bühnen-Chips, die ein Seitentyp ausblendet, tragen kein Kennzeichen (der Plan wollte eines).
- Aus dem vierzigsten Review offen: wie in `docs/reviews.md`.
- **macOS x64**, **glibc unter 2.34**, **C1 mit git vor 2.38**, VoiceOver — wie in den Runden
  davor.

## Eine Frage über den Code hinaus

Getrennt von den Befunden, am Ende deines Dokuments:

**Ist das Seitenleisten-Muster jetzt eine Regel, die in `docs/conventions.md` gehört — und wenn ja,
welche?** Acht Seiten tragen es, drei davon haben den Fokus-Fehler erst nachträglich bekommen, und
die Seiten antworten auf „Klick ins Leere“ und „Verlassen mit Änderungen“ verschieden. Formuliere,
was du für die Regel hältst, und nenne die Seiten, die ihr heute widersprechen.

## Form der Befunde

Schreibe `docs/REVIEW-2026-10-15.md`. Je Befund: die Stelle (Datei, Funktion, Commit), was
passiert, wie es sich zeigt, was dagegen spräche es so zu lassen, und — wo du eine hast — eine
Richtung. Nach Gewicht sortiert, Hoch/Mittel/Niedrig, Teil A und Teil B gemischt. Was du gemessen
hast, kennzeichne als gemessen und sag womit; was du gelesen hast, als gelesen. Eine Behauptung
dieses Auftrags, die nicht trägt, ist ein Befund wie jeder andere. Was dir nebenbei auffällt und
kein Befund ist, kommt in einen eigenen Abschnitt am Ende.

**Ändere nichts am Code und committe nichts.** Die einzige neue Datei ist dein Dokument. Schreibe
in keinen Obsidian-Vault. In kein Projekt unter `~/Documents/QuartzProjekte/` — Kopien mit
`cp -Rc` sind der Weg (und `content/` ist dort oft ein Symlink in einen Vault: in der Kopie
darunter nichts schreiben, auch keine mtimes). `gui-test` ist das Testprojekt der Sitzung; seine
`quartz.config.yaml` und `quartz.lock.json` sind uncommittet geändert und gehören dem Nutzer — auch
dort nur in einer Kopie arbeiten. Für die gebaute App ein Wegwerf-Profil (`--user-data-dir`). Eine
Messung, die die Config schreibt, legt im Projekt einen Snapshot an — in einer Kopie egal, im
Original nicht. **Kein Papierkorb des Systems**: `staticFiles.trash` nur mit einem im Hauptprozess
ersetzten `shell.trashItem`. **Löse keinen Schlüsselbund-Dialog aus**; die echten Zugänge und Ziele
dieses Rechners nicht anfassen und nicht abbilden. In den drei Plugin-Repos nichts ändern.
**Veröffentliche nichts**, und pushe nichts.
