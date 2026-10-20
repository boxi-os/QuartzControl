Du bist als zweites Paar Augen an zwei Projekten, die zusammengehören: QuartzControl, dessen
Fassung `1.1.0` (2026-10-18) draußen ist und dessen nächste, **1.2**, auf dem Branch `feat/1.2`
entsteht, und **quartz-forms**, einem eigenen Quartz-Plugin für Web-Formulare, das mit 1.2
veröffentlicht werden soll, samt einem eigenen Handbuch. Es geht um ein Review, nicht um
Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Warum diese Runde

Das einundfünfzigste Review (Claude Fable 5.1, Bericht `docs/REVIEW-2026-10-26.md`) hat
quartz-forms 0.5.5 und 0.5.6, die Handbuch-Commits dazu und den Reiter „Formulare“ gelesen. Sein
Urteil: so veröffentlichbar, 0 Hoch, 0 Mittel, 4 Niedrig, dazu eine Nebenbei-Liste. **Alles
danach hat Claude Opus 5.5 am 2026-10-20 geschrieben, und nichts davon hat ein Review gelesen:**

- die Fixes der vier Niedrig-Befunde (N1–N3 im Plugin, N4 im Handbuch);
- die Nebenbei-Liste, darunter ein Eingriff in die Frage, wann Stylesheet und Skript überhaupt
  auf die Seite kommen (`d044ae4`), und ein neuer Teil des gemeinsamen Katalogs, der die Mail von
  Skript und Relay festhält (`eff79eb`);
- zusammen als **0.5.7** versioniert (`fd9c411`), dazu vier Commits im Handbuch.

Was jeder Fix behebt und womit er gemessen sein soll, steht am Ende von `docs/reviews.md`. Die
Haltung ist dieselbe wie zuletzt: **Nimm nichts als gemessen hin, nur weil es so dasteht.** Jede
Zahl in einer Commit-Nachricht, im CHANGELOG, in `docs/reviews.md` und in diesem Auftrag hat
dasselbe Modell erhoben, ausgewertet und aufgeschrieben. Ein Punkt der Nebenbei-Liste wurde mit einer
Messung als Begründung **ohne Änderung** geschlossen (die 404er ohne `/quartz-forms`, „nicht das
Plugin“); prüfe, ob die Begründung trägt. N1 und N2 erweitern einen Fix der vorigen Runde (M1, M2); such, ob 0.5.7 ein
neues Glied der Kette ist, die mit 0.5.2 begann.

In der Zählung von `CLAUDE.md` ist das das **zweiundfünfzigste** Review.

## Die Projekte

**QuartzControl:** Electron + React + TypeScript, `/Users/boxi/Development/QuartzControl`.

- Lies zuerst `CLAUDE.md` **und `docs/conventions.md`**, das sie einbindet. Die Begründungen der
  Regeln stehen in `docs/decisions/conventions-full.md`.
- Für diese Runde zusätzlich: in `docs/decisions/plugins-and-config.md` der Abschnitt über
  quartz-forms (am Ende), in `docs/scripts.md` der Eintrag zu `check:plugin-copies`.
- Was aus dem einundfünfzigsten Review wurde (Befunde und Nebenbei-Liste), steht am Ende von
  `docs/reviews.md`; den Bericht selbst (`docs/REVIEW-2026-10-26.md`) brauchst du, um die Fixes
  gegen die Befunde zu halten.

**quartz-forms:** `/Users/boxi/Development/quartz-forms`, privat auf GitHub (`boxi-os/quartz-forms`).

- Lies `AGENTS.md` (Arbeitsweise und die Zwänge, die das Plugin einhält), `ARCHITECTURE.md`,
  `README.md`/`README.de.md`, `relay/php/README.md` und `CHANGELOG.md`.
- Drei Ebenen prüfen dieselben Regeln: der Bau (`src/validate.ts`), der Browser
  (`src/scripts/forms.inline.ts`, ein einfaches Skript ohne Bundler-Laufzeit) und das Relay
  (`relay/php/send.php`). `test/parity-cases.ts` hält Browser und Relay an einem Katalog, seit
  `eff79eb` auch für die Mail.

**Das Handbuch zu quartz-forms:**

- Inhalt: der Vault `/Users/boxi/Obsidian/QuartzProjekte/quartz-forms-handbuch` (Deutsch im
  Wurzelordner, Englisch unter `en/`, gepaart über `translationKey`; `private/` wird nicht
  veröffentlicht). Eigenes privates Repo `boxi-os/quartz-forms-handbuch`.
- Website: das Quartz-Projekt `/Users/boxi/Documents/QuartzProjekte/quartz-forms-handbuch`
  (`content` ist ein Symlink auf den Vault). Dort ist quartz-forms **noch 0.5.6** installiert,
  während das Handbuch schon „ab 0.5.7“ sagt.

## Umfang

### Block A: quartz-forms, `78c3244..fd9c411`

    cd /Users/boxi/Development/quartz-forms
    git log --oneline 78c3244..fd9c411
    git diff 78c3244..fd9c411 -- src relay scripts test

7 Commits, 32 Dateien mit `dist/` (+330 / −56), ohne `dist/` 15 Dateien (+261 / −18).

- **Befunde:** N1 `06fb52d` (die Prüfung beim Verlassen eines Felds wartet bei einem Druck
  irgendwo auf der Seite; `pointerdown`, `pointerup`, `pointercancel` am Dokument in der
  Capture-Phase), N2 `f179fd9` (Hinweis `pgpVersion6` für jeden Schlüssel der Version 6, vor
  dem des Algorithmus), N3 `0daf53d` (bei `demo` kein `siteKeyNeeded` und kein
  `encryptionCaptcha`, ein geschriebenes `minSeconds` bekommt `demoNoEffect`).
- **Nebenbei:** `d044ae4` (`externalResources()` liefert bei leerem `forms` nichts),
  `eff79eb` (`mailCases` in `test/parity-cases.ts`, gelesen von `client.test.ts` und
  `relay.test.ts`), `f1d562b` (README-Statuszeilen), `fd9c411` (Release 0.5.7).

### Block B: QuartzControl, `review-2026-10-26..feat/1.2`

    git log --oneline review-2026-10-26..feat/1.2
    git diff review-2026-10-26..feat/1.2 -- electron src shared scripts

Code: eine Zeile, `44c6e004` (`FORMS_READ_AGAINST` 0.5.7). Der Rest ist Chronik
(`docs/reviews.md`, darunter `2b774c1a`, eine korrigierte Aussage über Scroll Anchoring). Klein,
aber der Reiter zeigt, was das Plugin über eine Definition und einen Schlüssel sagt, und genau
das hat sich in 0.5.7 geändert (`pgpVersion6`, `demoNoEffect`, kein `siteKeyNeeded` bei `demo`).
Der Reiter selbst wurde dafür nicht geändert und **nicht an der App gemessen**.

### Block C: das Handbuch zu quartz-forms, `dafb9d6..840c415`

    cd /Users/boxi/Obsidian/QuartzProjekte/quartz-forms-handbuch
    git log --oneline dafb9d6..840c415

4 Commits, 10 Dateien (+18 / −16): 9.2 zweimal (`4e56be1`, `009ae4d`), 5.1 und 6.3 (`18d033c`),
7.1 und 9.1 (`840c415`). Gefragt ist, wo das Handbuch jetzt etwas anderes sagt als der Code in
0.5.7, und ob jede deutsche Änderung auch in der englischen Fassung angekommen ist.

## Abwägungen, die niemand gegengelesen hat

Die Reihenfolge ist A, C, B.

**1. N1: die Prüfung wartet auf jeden Druck der Seite (`06fb52d`).** Jedes Formular hört jetzt am
Dokument mit.

- Ein Druck, dessen Loslassen nie ankommt (natives Kontextmenü, Popup eines `<select>`, ein
  Drag aus dem Fenster, ein Druck auf die Scrollleiste, ein Wechsel des Tabs während des
  Drucks): Bleibt `pressed` stehen, und warten dann die Prüfungen **aller** Formulare der Seite
  bis zum nächsten Loslassen? Geht eine verloren, oder kommt sie nur spät?
- Ein Druck außerhalb jedes Formulars (ein Link, Text markieren, die Seitenleiste): Wird die
  Prüfung des verlassenen Felds sichtbar später, und stört das, wo sie früher sofort kam?
- SPA-Navigation: werden die drei Dokument-Listener jedes Formulars wieder entfernt
  (`addCleanup`), oder sammeln sie sich über Navigationen an? Doppelte Bindung nach Zurück?
- Die Messung (`measure-m1c.mjs`, 475 → 503 px vorher, 475 px nachher) und die M1-Messung im
  selben Formular: tragen sie, und deckt der neue Client-Test die zwei Formulare oder nur das
  Dokument als Ziel?

**2. N2: „GnuPG kann Version 6 nicht lesen“ (`f179fd9`).** Gemessen ist gpg 2.5.22 mit Schlüsseln
aus OpenPGP.js 6.3.2.

- Trägt der Satz über GnuPG allgemein, oder nur über diese Fassung? Was sagen GnuPG-Fassungen,
  die ein Empfänger realistisch hat, und was andere Werkzeuge (Thunderbird, Sequoia), die ein
  Empfänger stattdessen nutzt? Ist „gpg entschlüsselt Mails an ihn nicht“ für ihn die richtige
  Warnung, oder sagt sie zu viel?
- Trifft die Prüfung die Version am richtigen Paket (Hauptschlüssel, Unterschlüssel gemischt)?
- Kommt der Hinweis in QuartzControl an, und steht er dort beim Schlüssel?

**3. N3: was die Demo nicht mehr verlangt (`0daf53d`).**

- Wird `demo` dort gefragt, wo der Versand wirklich entschieden wird: global `demo` mit einem
  Formular, das selbst `relay` sagt, und umgekehrt? Ein Formular, das dann doch sendet, braucht
  den Site-Key wieder.
- `demoNoEffect` für `minSeconds`: nur bei geschriebenem Wert, nicht beim Standard? Und bei einer
  Vorlage, die `minSeconds` mitbringt?
- Was sagt `cli check` dazu, und was davon zeigt der Reiter?

**4. `d044ae4`: ohne Formulare keine Ressourcen.**

- Genau „leeres `forms`“, oder gibt es eine Website, die Formulare hat und trotzdem nichts
  bekommt (alle über eine Vorlage, nur `layoutForm`, `forms` erst nach dem Start von `--serve`
  ergänzt)? Liest Quartz `externalResources()` bei einem Neubau im Dev-Server neu, und was
  heißt das für QuartzControl, das die Config schreibt, während der Server läuft?
- Was zeigt eine Seite, die ein Formular einbindet, das es nicht gibt (`renderMissing`), wenn
  `forms` leer ist und kein Stylesheet mitkommt?
- Die Messung (465 → 462 Dateien, 26 661 B weniger je Seite) an einer Kopie von gui-test: trägt
  sie?

**5. `eff79eb`: die Mail im Katalog.**

- Vergleicht der Client-Test, was der Empfänger eines Relay-Formulars liest? Das Skript schreibt
  die Mail nur für mailto und Dienste, beim Relay schreibt sie `send.php`. Ist der Vergleich
  dann der richtige, und fehlt ein Weg?
- Die Relay-Suite wandelt CRLF in LF und schneidet Leerraum am Ende ab, bevor sie vergleicht.
  Verdeckt das einen Unterschied, den ein Empfänger sieht?
- Reichen drei Fälle in einer Sprache mit festen Beschriftungen? Was fehlt (Deutsch,
  übersetzte Optionen, Pflichtfelder, `pgpKey`, Schritte und Bedingungen)?

**6. Die 404er ohne `/quartz-forms`, ohne Änderung geschlossen.** Die Begründung in
`docs/reviews.md`: Sie entstehen nur, wenn Quartz' SPA-Router eine Ordnerseite ohne
Schrägstrich am Ende ansteuert, weil `normalizeRelativeURLs(html, url)` gegen die angefragte
Adresse rechnet; im Bau verweist kein Link so. Gibt es einen Weg, auf dem ein Besucher doch
dorthin kommt (Popover-Vorschau, Zurück, Suche, Graph, ein Link, den ein Autor von Hand schreibt,
die Weiterleitung von GitHub Pages)? Dann wäre es ein Befund für Quartz oder die Vorlage, nicht
fürs Plugin. Sag, wem er gehört.

**7. Was das Handbuch jetzt verspricht.** Die vier Commits in Block C, Satz für Satz gegen 0.5.7.
Und: Die Website ist noch mit 0.5.6 gebaut, das Handbuch sagt „ab 0.5.7“. Was davon sieht ein
Leser der Website heute falsch?

**8. Der Reiter.** `check:plugin-copies` wurde gegen eine Kopie von **gui-test** mit dem
Checkout gefahren, nicht gegen das Handbuch-Projekt (keine Abweichung). Prüft das die Stellen,
die sich in 0.5.7 geändert haben? Zeigt der Reiter an der laufenden App für ein Demo-Formular
mit Captcha und `minSeconds` und für einen v6-Schlüssel, was das Plugin jetzt sagt, und nichts,
was es nicht mehr sagt?

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was einem Absender oder Empfänger schaden kann

Abwägungen 1, 2 und 5: eine Prüfung, die zu lange wartet; eine Warnung, die einen Empfänger
falsch berät; eine Mail, die anders ankommt, als der Katalog behauptet.

### 2. Was einem Betreiber schaden kann, der dem Handbuch folgt

Abwägungen 3, 4 und 7.

### 3. Was auf einer Website falsch aussieht oder nicht funktioniert

Abwägungen 4 und 6.

### 4. Was QuartzControl falsch zeigt oder anbietet

Abwägungen 2, 3 und 8.

## Wenn du misst

Ändere nichts in den beiden Repos, im Vault, im Handbuch-Projekt oder in einem anderen Projekt
unter `~/Documents/QuartzProjekte`. Arbeite in Kopien in deinem Scratchpad. **Lies nie etwas aus
einem Projekt oder Vault namens `HinterlandHistory`/`hinterland-history`**, auch nicht in einer
Schleife über alle Projekte. `obsidian-cli` nur mit `vault=gui-test-content`.

**Das Plugin:**

- Klone es in deinen Scratchpad: `git clone /Users/boxi/Development/quartz-forms <scratchpad>/qf`,
  dort `npm ci` und `npm run check`. Das sind Typen, Lint, Format und Tests mit der Relay-Suite.
- Die Relay-Suite braucht `php` im PATH. Homebrew-PHP 8.5 ist installiert.
- Starte `php -S` immer mit `-d opcache.enable=0`, sonst liefert Opcache eine umgeschriebene
  `config.php` bis zu zwei Sekunden alt aus. Das Relay schickt sich selbst Anfragen, deshalb
  braucht `php -S` `PHP_CLI_SERVER_WORKERS=4`. Mail geht in eine Datei:
  `mailer => ['file' => <outbox>]`, wie in `test/relay.test.ts`.

**Im Browser:**

- Chrome über `playwright-core` (in `/Users/boxi/Development/QuartzControl/node_modules`) mit
  `channel: 'chrome'`. Die Seite muss von `localhost` kommen, sonst fehlt `crypto.subtle`.
- Ein Kontext mit `javaScriptEnabled: false` braucht `{ force: true }` bei `click()`/`check()`.
- Wer einen Klick misst, prüft, dass das Ziel im Fenster liegt, und setzt `scroll-behavior` auf
  `auto` (eine laufende Scroll-Animation hat in der vorigen Runde zwei falsche „verlorene
  Klicks“ gezeigt).
- Prüfskripte öffnen keine `mailto:`-Links.
- Captcha nur mit den öffentlichen Testschlüsseln (Turnstile: Site-Key
  `1x00000000000000000000AA`, Secret `1x0000000000000000000000000000000AA`; hCaptcha: Site-Key
  `10000000-ffff-ffff-ffff-000000000001`, Secret `0x` und 40 Nullen).
- Testschlüssel für OpenPGP mit gpg in einem kurzen `GNUPGHOME` unter
  `$(getconf DARWIN_USER_TEMP_DIR)`; im Scratchpad ist der Pfad für den Socket zu lang. **Räum
  die Ordner am Ende weg und beende ihre Agenten** (die vorige Runde hat zwei liegen lassen). Der
  Demo-Schlüssel des Handbuchs liegt im Vault unter `private/keys/`.

**Die Website des Handbuchs:**

- Kopiere das Projekt: `cp -Rc ~/Documents/QuartzProjekte/quartz-forms-handbuch <scratchpad>/hb`.
  `content` ist dort ein Symlink auf den Vault: **schreib nichts unter `content/`**. Wer Inhalt
  ändern will, ersetzt den Symlink in der Kopie durch eine Kopie des Vaults.
- `.quartz/plugins/quartz-forms` ist dort das installierte 0.5.6; für 0.5.7 ersetze es in der
  Kopie durch einen Symlink auf deinen Klon. Die vier `frame-*` unter `.quartz/plugins/` sind
  Symlinks mit absolutem Pfad in das echte Projekt; Quartz liest sie nur, schreib nicht hinein.
- `npx quartz build` in der Kopie, ausliefern über einen eigenen Server auf `localhost` mit dem
  Pfad `/quartz-forms` davor (die `baseUrl` ist `boxi-os.github.io/quartz-forms`). Für
  Abwägung 6: Ein Server, der ein Verzeichnis ohne Schrägstrich nicht umleitet, verhält sich
  anders als GitHub Pages; sag, womit du gemessen hast.

**Die App:** `npm run build` in einem Klon von QuartzControl, nicht im Repo; starten mit
`_electron.launch` und einem eigenen `--user-data-dir` im Scratchpad, nie mit dem echten Profil.
Ein Projekt für den Reiter ist eine Kopie im Scratchpad, deren `.quartz/plugins/quartz-forms` auf
deinen Klon zeigt.

## Was du ablieferst

Einen Bericht auf Deutsch in `<scratchpad>/review-52/review.md`:

- Befunde nach Gewicht (Hoch, Mittel, Niedrig), je mit Ort, Szenario, Beleg (gemessen oder
  gelesen, und womit) und einem Vorschlag;
- getrennt davon eine Liste „Nebenbei“ für Kleinigkeiten;
- am Ende ein Urteil, ob quartz-forms 0.5.7 und sein Handbuch so mit 1.2 veröffentlicht werden
  können, und was vorher geschehen muss.

Kennzeichne bei jedem Befund, ob du ihn gemessen oder nur gelesen hast.
