Du bist als zweites Paar Augen an zwei Projekten, die zusammengehören: QuartzControl, dessen
Fassung `1.1.0` (2026-10-18) draußen ist und dessen nächste, **1.2**, auf dem Branch `feat/1.2`
entsteht, und **quartz-forms**, einem eigenen Quartz-Plugin für Web-Formulare, das mit 1.2
veröffentlicht werden soll, samt einem eigenen Handbuch. Es geht um ein Review, nicht um
Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Warum diese Runde

Das zweiundfünfzigste Review (Claude Fable 5.1, Bericht `docs/REVIEW-2026-10-27.md`) hat
quartz-forms 0.5.7, die Handbuch-Commits dazu und den Reiter „Formulare“ gelesen. Sein Urteil:
so veröffentlichbar, 0 Hoch, 0 Mittel, 3 Niedrig, dazu eine Nebenbei-Liste. **Alles danach hat
Claude Opus 5.5 am 2026-10-20 geschrieben, und nichts davon hat ein Review gelesen:**

- die Fixes von N1 und N2 und zwei Punkte der Nebenbei-Liste im Plugin, versioniert als
  **0.5.8** (`34d77d5`), dazu ein Handbuch-Commit;
- **vier Änderungen am Reiter „Formulare“**, die der Nutzer nach einem Blick auf die laufende App
  verlangt hat (Rückmeldung vom 2026-10-20): Felder einer Vorlage ohne Übernehmen bearbeiten, die
  Teile eines Formulars zum Aufklappen, der Abschnitt „Texte“ mit allen Texten des Plugins, und
  eine Vorschau, die auf eine Seite mit dem gewählten Formular springt;
- für den Abschnitt „Texte“ ein neuer Befehl im Plugin (`dist/cli.js texts`), versioniert als
  **0.5.9** (`f8d46a7`, gepusht, Tag `v0.5.9`).

Anders als in den letzten Runden liegt das Gewicht diesmal **bei QuartzControl**: knapp 370
Zeilen neuer Oberfläche, ein neuer IPC-Kanal und ein Eingriff in die Vorschau, die bisher nur
markierte und jetzt selbst navigiert.

Was jeder Fix behebt und womit er gemessen sein soll, steht am Ende von `docs/reviews.md` und in
den Commit-Nachrichten. Die Haltung ist dieselbe wie zuletzt: **Nimm nichts als gemessen hin, nur
weil es so dasteht.** Jede Zahl in einer Commit-Nachricht, im CHANGELOG, in `docs/reviews.md` und
in diesem Auftrag hat dasselbe Modell erhoben, ausgewertet und aufgeschrieben. Mehrere Messungen
dieser Runde liefen an einer Wegwerf-Kopie von **gui-test**, nicht an einem Projekt mit mehreren
Sprachen, Vorlagen und vielen Seiten; prüf, ob sie tragen.

In der Zählung von `CLAUDE.md` ist das das **dreiundfünfzigste** Review.

## Die Projekte

**QuartzControl:** Electron + React + TypeScript, `/Users/boxi/Development/QuartzControl`.

- Lies zuerst `CLAUDE.md` **und `docs/conventions.md`**, das sie einbindet. Die Begründungen der
  Regeln stehen in `docs/decisions/conventions-full.md`. Für diese Runde besonders: „Eine Route
  ist gemountet, und sie besitzt ihr Dokument“, „Ein Ref, den ein Effekt zurücksetzt …“, „Was
  ohne Zutun erscheint, wird angesagt“, „Ein Hinweis sagt, was passiert“, „Was ein eigenes Plugin
  über eine Definition urteilt, fragt die App das Plugin“ und „Code, den die App in die Website
  setzt …“.
- Zusätzlich: in `docs/decisions/plugins-and-config.md` der Abschnitt über quartz-forms (am Ende),
  in `docs/scripts.md` der Eintrag zu `check:plugin-copies`.
- Was aus dem zweiundfünfzigsten Review wurde, steht am Ende von `docs/reviews.md`; den Bericht
  selbst (`docs/REVIEW-2026-10-27.md`) brauchst du, um die Fixes gegen die Befunde zu halten.

**quartz-forms:** `/Users/boxi/Development/quartz-forms`, privat auf GitHub (`boxi-os/quartz-forms`).

- Lies `AGENTS.md` (Arbeitsweise und die Zwänge, die das Plugin einhält), `ARCHITECTURE.md`,
  `README.md`/`README.de.md`, `relay/php/README.md` und `CHANGELOG.md`.
- Drei Ebenen prüfen dieselben Regeln: der Bau (`src/validate.ts`), der Browser
  (`src/scripts/forms.inline.ts`) und das Relay (`relay/php/send.php`). `test/parity-cases.ts`
  hält Browser und Relay an einem Katalog. Die Kommandozeile (`src/cli.ts`) ist die Tür, durch
  die QuartzControl das Plugin fragt (`electron/main/services/formsService.ts`).

**Das Handbuch zu quartz-forms:**

- Inhalt: der Vault `/Users/boxi/Obsidian/QuartzProjekte/quartz-forms-handbuch` (Deutsch im
  Wurzelordner, Englisch unter `en/`, gepaart über `translationKey`; `private/` wird nicht
  veröffentlicht). Eigenes privates Repo `boxi-os/quartz-forms-handbuch`.
- Website: das Quartz-Projekt `/Users/boxi/Documents/QuartzProjekte/quartz-forms-handbuch`
  (`content` ist ein Symlink auf den Vault). Installiert ist dort jetzt **0.5.9**.

**Das Handbuch zu QuartzControl:** der Vault
`/Users/boxi/Obsidian/QuartzProjekte/QuartzControl-Handbuch`. Der Abschnitt über den Reiter
„Formulare“ in `4-gestaltung/08-plugins.md` hat eine **nicht committete** Änderung (`git diff`
dort), die drei der vier Änderungen am Reiter beschreibt; die Vorschau fehlt darin.

## Umfang

### Block B: QuartzControl, `review-2026-10-27..feat/1.2`

    git log --oneline review-2026-10-27..feat/1.2
    git diff review-2026-10-27..feat/1.2 -- electron src shared scripts

12 Dateien (+368 / −59). Der Rest ist Chronik (`docs/reviews.md`, `CLAUDE.md`).

- `17391c3b` Felder einer Vorlage ohne „Felder übernehmen und bearbeiten“: Die Liste ist sofort
  bearbeitbar, die erste Änderung schreibt die ganze Liste als eigene (tiefe Kopie), ein Satz
  darüber sagt das. Dateien: `FormFieldsEditor.tsx`, `Forms.tsx`, Sprachdateien.
- `f0465f68` die Teile eines Formulars als `FoldBox` (Allgemein und Felder anfangs offen, ein
  Sticky-State für alle Teile), Probleme des Plugins als Plakette am Band über `partOf()` in
  `formsOptions.ts`.
- `5bb9265b` der Abschnitt „Texte“ (`FormsTexts.tsx`, neu): alle Texte des Plugins in einer
  Sprache der Website, sein Wortlaut als Platzhalter, `options.texts` als Wert, Suche, „wirkt
  nicht“ für unbekannte Schlüssel. Neuer Kanal `forms:texts` (Vertrag, Schema, Handler, Preload,
  `formsService.texts`).
- `3d87200b` ein Plugin vor `FORMS_TEXTS_SINCE` (0.5.9) wird nicht gefragt; der Abschnitt nennt
  die nötige und die installierte Fassung und behält den alten Editor.
- `c1e27d9a`, `8a4eda02` `FORMS_READ_AGAINST` 0.5.8 bzw. 0.5.9.
- `3e0d0406` die Vorschau springt: Der erste Bericht nach einer neuen Auswahl entscheidet; findet
  er das Formular nicht und kennt die Suche „Verwendet auf“ Seiten, die es einbinden, geht die
  Vorschau zur ersten davon und sagt das in ihrer Statuszeile. Dateien: `SitePreview.tsx`
  (`decided`, `lastReport`, `jumpedTo`, `pages` am `PreviewHighlight`), `Forms.tsx`
  (`pagesOf(…).map(slugPath)`), Sprachdateien. Der Bericht kommt aus dem Skript, das
  `electron/main/services/previewHighlight.ts` in die Seite setzt (unverändert).

### Block A: quartz-forms, `fd9c411..f8d46a7`

    cd /Users/boxi/Development/quartz-forms
    git log --oneline fd9c411..f8d46a7
    git diff fd9c411..f8d46a7 -- src relay scripts test

9 Commits, ohne `dist/` 19 Dateien (+200 / −34).

- **0.5.8:** N1 `27c91d7` (ein Druck endet auch mit `blur` des Fensters und `visibilitychange`
  auf `hidden`), N2 `225f3c8` (vierter Mail-Fall: Beschriftungen `{en, de}`, deutsche Seite, ein
  Feld mit nicht erfüllter Bedingung, `pgpKey`), Nebenbei `1e05c46` (bei `demo` nur `url`/`extra`,
  die das Formular selbst schreibt), `3b3707f` (mit `--serve` Stylesheet und Skript auch bei
  leerem `forms`), `a34e63c`, Release `34d77d5`.
- **0.5.9:** `539d2b7` (`dist/cli.js texts`: der Wortlaut jedes Textes je Locale, ohne Website),
  Release `f8d46a7`.

### Block C: das Handbuch zu quartz-forms, `840c415..c5f8a13`

Ein Commit (`c5f8a13`, 9.2: ein Demo-Formular hört nur von `url`/`extra`, die es selbst
schreibt). Gefragt ist, ob 9.2 jetzt 0.5.8 sagt, ob die englische Fassung mitgezogen ist und ob
irgendein Kapitel die Texte (`texts`) anders beschreibt, als QuartzControl sie jetzt schreibt.

### Block D: der Abschnitt im QuartzControl-Handbuch, nicht committet

`git diff` in `QuartzControl-Handbuch`, Satz für Satz gegen die App. Fehlt etwas, das ein Leser
braucht (die Vorschau)?

## Abwägungen, die niemand gegengelesen hat

Die Reihenfolge ist B, A, C, D.

**1. Die Vorschau springt (`3e0d0406`).** Sie navigiert jetzt ohne Zutun des Nutzers.

- „Der erste Bericht nach einer neuen Auswahl entscheidet“: Kann dieser erste Bericht einer sein,
  der noch zur vorigen Seite, zum vorigen Selektor oder zu einem halb geladenen Dokument gehört
  (Quartz' SPA-Navigation, Neuaufbau des Dev-Servers, `about:blank` vor dem ersten Laden)? Dann
  springt sie, obwohl die Seite das Formular hat, oder bleibt, obwohl sie es nicht hat.
- `decided` ist ein Ref, den ein Effekt bei Wechsel des Selektors zurücksetzt; `lastReport` wird
  vom Markierungs-Effekt geleert. Hält das der Regel „Ein Ref, den ein Effekt zurücksetzt“ stand,
  auch bei schnellem Wechsel zwischen zwei Formularen und zurück, bei Strict Mode, bei Remount?
- Die Seiten kommen aus der Suche „Verwendet auf“ (`content.formUsages`) und gehen durch
  `slugPath()`. Treffen sie die Adresse, die die Vorschau braucht: `index`, Ordnerseiten, Slugs
  mit Leerzeichen, Umlauten oder Großbuchstaben, eine Website mit mehreren Sprachen (Präfix
  `/en/`), `baseUrl` mit Pfad? Was geschieht, wenn die erste Seite eine ist, die das Layout
  verbirgt (`hidesLayout`), die Suche veraltet ist oder die Seite im Dev-Server nicht gebaut wird
  (Entwurf, `ignorePatterns`)?
- Eine von Hand eingegebene Seite und ein Link in der Website bleiben stehen. Welche anderen
  Wege gibt es, die Seite zu wechseln (Zurück im Frame, `goTo` von außen, ein Neustart des
  Servers), und wie verhält sich der Sprung dort?
- Gefunden, aber nicht sichtbar (`found > 0`, `visible = 0`) springt nicht. Richtig?
- Die Statuszeile ist eine Live-Region. Wird der Satz einmal angesagt, oder bei jedem Bericht
  (alle 500 ms bei Größenänderung)? Ist er zwei Sätze lang, wo einer reichte?

**2. Der Abschnitt „Texte“ (`5bb9265b`, `3d87200b`).**

- `entryKey()` wählt den Eintrag, in den eine Sprache schreibt (exakt, dann Primärsubtag, sonst
  der Code). Liest das Plugin beim Bau dieselbe Reihenfolge (`wording()`)? Was, wenn `texts`
  sowohl `de` als auch `de-DE` hat, oder eine Website `de-AT` spricht?
- Der Platzhalter ist der Wortlaut des Plugins für die gleiche Primärsprache, sonst `en-US`.
  Zeigt er, was die Website tatsächlich anzeigt, auch bei einem Formular mit eigenen Texten
  oder einer Vorlage? Gibt es Texte mit Platzhaltern (`{…}`) oder Plural, die ein Eintrag brechen
  kann, und sagt jemand das?
- `setText` schneidet Leerraum ab und löscht einen leeren Eintrag. Kann ein Nutzer einen Text
  absichtlich leer machen oder mit Leerraum beginnen lassen? Kommt `texts: {}` je unnötig in die
  Config, und bleibt der Roundtrip anderer Schlüssel heil?
- Der Kanal: zod-Schema, Frist, Fehler „fehlt“ vs. „kaputt“, ein Plugin, das nicht
  `quartz-forms` ist, eine installierte Fassung, die `package.json` nicht hergibt (`installed`
  undefined: dann wird gefragt). Ist der Vergleich `isNewerVersion(FORMS_TEXTS_SINCE,
  installed)` für Vorabversionen und Git-Checkouts richtig?
- Die Sprachwahl ist Sticky-State `forms.textsLanguage` über alle Projekte. Was zeigt ein
  Projekt mit anderen Sprachen?

**3. Felder einer Vorlage ohne Übernehmen (`17391c3b`).**

- „Opening a row writes nothing“: Gilt das auch für Fokus und Verlassen eines Felds ohne
  Änderung, ein Ziehen auf denselben Platz, ein Feld, dessen Editor beim Öffnen normalisiert?
  Ein Formular, das ungewollt eigene Felder bekommt, folgt Änderungen der Vorlage nicht mehr.
- Gibt es einen Weg zurück zu den Feldern der Vorlage, und sagt die Oberfläche ihn?
- Wird `dirty` richtig, und überlebt die Kopie ein Speichern und Neulesen unverändert?

**4. Die Teile zum Aufklappen (`f0465f68`).**

- `partOf()` ordnet Probleme nach dem ersten Schlüssel ihres Pfads einem Teil zu. Gibt es
  Meldungen des Plugins, die so im falschen Teil oder in keinem landen (globale Meldungen,
  `fields.3.options`, Meldungen zu Schlüsseln, die nur der Teil „mehr Schlüssel“ zeigt)?
- Ein zugeklappter Teil mit einem Problem: Findet ein Tastatur- oder Screenreader-Nutzer es?
  Geht ein ungesicherter Entwurf in einem `DraftInput` beim Zuklappen verloren?
- Ein Sticky-State für alle Teile aller Formulare: gewollt laut Commit. Stört es?

**5. quartz-forms 0.5.8.**

- N1 (`27c91d7`): Ist `blur` des Fensters zu breit (ein `<select>`-Popup, ein `alert`, ein
  Iframe auf der Seite, etwa das Captcha-Widget, nimmt den Fokus)? Läuft die Warteliste dann zu
  früh, mitten in einem Druck, der noch ankommt? Das `blur` ist in der Messung von Hand ausgelöst,
  nicht am OS.
- N2 (`225f3c8`): Trägt der vierte Fall, was er behauptet? Vergleichen beide Suiten wirklich
  dieselbe Mail, oder normalisiert eine noch zu viel weg?
- `1e05c46`: Zeigt `cli check` jetzt bei keinem Formular einen Hinweis, den es geben müsste
  (ein Demo-Formular, das `extra` von einem globalen Demo erbt)?
- `3b3707f`: Erkennt `externalResources()` „serving“ zuverlässig, auch wenn QuartzControl den
  Server startet (`--serve` über die eingebettete Laufzeit)?

**6. `dist/cli.js texts` (`539d2b7`).** Ist `i18n(l)` genau der Wortlaut, über den `options.texts`
beim Bau gelegt wird, auch für Texte, die nur im Browser oder nur im Relay stehen (Mail, Fehler
von `send.php`)? Fehlen dort Texte, die ein Betreiber ersetzen will, oder stehen Texte darin, die
`options.texts` gar nicht ersetzen kann? Dann verspricht der Abschnitt „Texte“ zu viel.

**7. Was die zwei Handbücher jetzt sagen** (Blöcke C und D), gegen 0.5.9 und die App.

**8. `check:plugin-copies`** lief gegen eine Kopie von gui-test mit dem 0.5.9-Checkout (keine
Abweichung). Prüft das die Stellen, die sich seit 0.5.7 geändert haben, und hätte es eine neue
Abschrift bemerkt, die dieser Block eingeführt hat (etwa in `formsOptions.ts`)?

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was Daten oder Config des Nutzers falsch schreibt

Abwägungen 2 und 3: ein Text oder eine Feldliste, die geschrieben wird, ohne dass der Nutzer es
wollte, oder an der falschen Stelle.

### 2. Was einem Absender oder Empfänger schaden kann

Abwägungen 5 und 6.

### 3. Was QuartzControl falsch zeigt, ansagt oder tut

Abwägungen 1, 4 und 8.

### 4. Was ein Leser der Handbücher falsch versteht

Abwägung 7.

## Wenn du misst

Ändere nichts in den beiden Repos, in den Vaults, im Handbuch-Projekt oder in einem anderen
Projekt unter `~/Documents/QuartzProjekte`. Arbeite in Kopien in deinem Scratchpad. **Lies nie
etwas aus einem Projekt oder Vault namens `HinterlandHistory`/`hinterland-history`**, auch nicht
in einer Schleife über alle Projekte. `obsidian-cli` nur mit `vault=gui-test-content`.

**Das Plugin:**

- Klone es in deinen Scratchpad: `git clone /Users/boxi/Development/quartz-forms <scratchpad>/qf`,
  dort `npm ci` und `npm run check`. Das sind Typen, Lint, Format und Tests mit der Relay-Suite.
- Die Relay-Suite braucht `php` im PATH. Homebrew-PHP 8.5 ist installiert.
- Starte `php -S` immer mit `-d opcache.enable=0` und `PHP_CLI_SERVER_WORKERS=4`. Mail geht in
  eine Datei: `mailer => ['file' => <outbox>]`, wie in `test/relay.test.ts`.

**Im Browser:**

- Chrome über `playwright-core` (in `/Users/boxi/Development/QuartzControl/node_modules`) mit
  `channel: 'chrome'`. Die Seite muss von `localhost` kommen, sonst fehlt `crypto.subtle`.
- Wer einen Klick misst, prüft, dass das Ziel im Fenster liegt, und setzt `scroll-behavior` auf
  `auto`. Prüfskripte öffnen keine `mailto:`-Links.
- Captcha nur mit den öffentlichen Testschlüsseln (Turnstile: Site-Key
  `1x00000000000000000000AA`, Secret `1x0000000000000000000000000000000AA`; hCaptcha: Site-Key
  `10000000-ffff-ffff-ffff-000000000001`, Secret `0x` und 40 Nullen).
- Testschlüssel für OpenPGP mit gpg in einem kurzen `GNUPGHOME` unter
  `$(getconf DARWIN_USER_TEMP_DIR)`. **Räum die Ordner am Ende weg und beende ihre Agenten.**

**Die App (Schwerpunkt dieser Runde):**

- `git clone /Users/boxi/Development/QuartzControl <scratchpad>/qc`, dort `npm ci` und
  `npm run build`. Starten mit `_electron.launch` aus `playwright-core` und einem eigenen
  `--user-data-dir` im Scratchpad, **nie mit dem echten Profil**. Die Muster stehen in
  `.claude/skills/run-desktop/SKILL.md`; dort auch die Fallen (`press`/`type` kommen oft nicht an,
  `fill` über den nativen Setter; Escape zum Abwählen kam in der Messung dieser Runde nicht an).
- Ein Projekt ist eine Kopie im Scratchpad (`cp -Rc`), deren `.quartz/plugins/quartz-forms` auf
  deinen Klon zeigt. **Ist `content` ein Symlink, schreib nichts darunter**; ersetze ihn in der
  Kopie durch eine Kopie des Ordners. Für die Vorschau braucht es einen laufenden Dev-Server des
  Projekts (in der App „Starten“); ein Projekt mit Relay-Versand baut nur mit `transport.url`
  und einem Empfänger.
- Für Abwägung 1 taugt gui-test allein nicht: Nimm zusätzlich eine Kopie des Handbuch-Projekts
  (zwei Sprachen, `baseUrl` mit Pfad, viele Seiten mit Formularen) und sag, woran du gemessen
  hast.
- `npm run smoke` braucht `npm run build`; `npm run check:plugin-copies -- <projekt>` und
  `npm run check:i18n` im Klon.

## Was du ablieferst

Einen Bericht auf Deutsch in `<scratchpad>/review-53/review.md`:

- Befunde nach Gewicht (Hoch, Mittel, Niedrig), je mit Ort, Szenario, Beleg (gemessen oder
  gelesen, und womit) und einem Vorschlag;
- getrennt davon eine Liste „Nebenbei“ für Kleinigkeiten;
- am Ende ein Urteil, ob der Reiter „Formulare“ in dieser Form mit 1.2 und quartz-forms 0.5.9
  samt Handbuch veröffentlicht werden können, und was vorher geschehen muss.

Kennzeichne bei jedem Befund, ob du ihn gemessen oder nur gelesen hast.
