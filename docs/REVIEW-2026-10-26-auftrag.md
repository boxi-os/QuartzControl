Du bist als zweites Paar Augen an zwei Projekten, die zusammengehören: QuartzControl, dessen
Fassung `1.1.0` (2026-10-18) draußen ist und dessen nächste, **1.2**, auf dem Branch `feat/1.2`
entsteht, und **quartz-forms**, einem eigenen Quartz-Plugin für Web-Formulare, das mit 1.2
veröffentlicht werden soll, samt einem eigenen Handbuch. Es geht um ein Review, nicht um
Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Warum diese Runde

Das fünfzigste Review (Claude Fable 5.1, Bericht `docs/REVIEW-2026-10-25.md`) hat quartz-forms bis
0.5.4, sein Handbuch und den Reiter „Formulare“ gelesen. Sein Urteil: veröffentlichbar nach M1, M2
und M3. **Alles danach hat Claude Opus 5.5 am 2026-10-20 geschrieben, und nichts davon hat ein
Review gelesen:**

- die Fixes der drei Mittel- und sechs Niedrig-Befunde, im Plugin als **0.5.5**, im Handbuch und
  im Reiter;
- die Nebenbei-Liste des fünfzigsten Reviews als **0.5.6**, darunter ein Eingriff in die Art, wie
  Stylesheet und Skript auf die Seite kommen (`72af084`), und zwei Angleichungen der
  Plain-Post-Mail an die Mail des Skripts;
- dreizehn Commits im Handbuch, darunter ein neues Demo-Schlüsselpaar.

Was jeder Fix behebt und womit er gemessen sein soll, steht am Ende von `docs/reviews.md`. Die
Haltung ist dieselbe wie zuletzt: **Nimm nichts als gemessen hin, nur weil es so dasteht.** Jede
Zahl in einer Commit-Nachricht, im CHANGELOG, in `docs/reviews.md` und in diesem Auftrag hat
dasselbe Modell erhoben, ausgewertet und aufgeschrieben. Zweimal hat das fünfzigste Review schon
eine Messung geliefert, die der Fix dann anders nachstellen musste (M1: der Druck traf `<html>`);
prüfe, ob die Neu-Messung selbst trägt. Die letzte Runde vor dieser hatte eine Regressionskette
(0.5.2 → 0.5.3 → 0.5.4); such, ob 0.5.5 oder 0.5.6 ein neues Glied ist.

In der Zählung von `CLAUDE.md` ist das das **einundfünfzigste** Review.

## Die Projekte

**QuartzControl:** Electron + React + TypeScript, `/Users/boxi/Development/QuartzControl`.

- Lies zuerst `CLAUDE.md` **und `docs/conventions.md`**, das sie einbindet. Die Begründungen der
  Regeln stehen in `docs/decisions/conventions-full.md`.
- Für diese Runde zusätzlich: in `docs/decisions/plugins-and-config.md` der Abschnitt über
  quartz-forms (am Ende), in `docs/scripts.md` der Eintrag zu `check:plugin-copies`.
- Was aus dem fünfzigsten Review wurde, steht am Ende von `docs/reviews.md`; den Bericht selbst
  (`docs/REVIEW-2026-10-25.md`) brauchst du, um die Fixes gegen die Befunde zu halten.

**quartz-forms:** `/Users/boxi/Development/quartz-forms`, privat auf GitHub (`boxi-os/quartz-forms`).

- Lies `AGENTS.md` (Arbeitsweise und die Zwänge, die das Plugin einhält), `ARCHITECTURE.md`,
  `README.md`/`README.de.md`, `relay/php/README.md` und `CHANGELOG.md`.
- Drei Ebenen prüfen dieselben Regeln: der Bau (`src/validate.ts`), der Browser
  (`src/scripts/forms.inline.ts`, ein einfaches Skript ohne Bundler-Laufzeit) und das Relay
  (`relay/php/send.php`). `test/parity-cases.ts` hält Browser und Relay an einem Katalog.

**Das Handbuch zu quartz-forms:**

- Inhalt: der Vault `/Users/boxi/Obsidian/QuartzProjekte/quartz-forms-handbuch` (Deutsch im
  Wurzelordner, Englisch unter `en/`, gepaart über `translationKey`; `private/` wird nicht
  veröffentlicht). Eigenes privates Repo `boxi-os/quartz-forms-handbuch`.
- Website: das Quartz-Projekt `/Users/boxi/Documents/QuartzProjekte/quartz-forms-handbuch`
  (`content` ist ein Symlink auf den Vault). Dort ist quartz-forms **0.5.6** installiert.

## Umfang

### Block A: quartz-forms, `f5b6f94..78c3244`

    cd /Users/boxi/Development/quartz-forms
    git log --oneline f5b6f94..78c3244
    git diff f5b6f94..78c3244 -- src relay scripts test

16 Commits, 43 Dateien (mit `dist/`), +565 / −109.

- **0.5.5** (`1c0c0aa` bis `777b758`): M1 `1c0c0aa` (Prüfung beim Verlassen eines Felds wartet,
  solange ein Zeiger im Formular gedrückt ist), M2 `8931309` (Hinweis auf X25519/X448-Schlüssel
  nach RFC 9580), M3 `97e5065` (kein Captcha bei `demo`), N1 `379b426`, N2 `0c7114a` (Proof-of-Work
  nach abgelehntem Stempel neu), N3 `6ae2f6a` (Seite im Chiffrat auch bei Diensten), N4 `b49142c`
  (READMEs), N6 `f221fb3` (`success` ohne `mode`).
- **0.5.6** (`d140f35` bis `78c3244`): keine Zeitfalle bei `demo`; eigener `<noscript>`-Satz der
  Demo (`demoNoScript`); nicht angehaktes Kästchen und `qf_trim` in der Plain-Post-Mail;
  **`72af084`: `FormBox` ohne eigenes CSS und Skript, der Transformer bringt beides auf jede
  Seite**; ein verrutschter Doc-Kommentar in `send.php`.

### Block B: QuartzControl, `review-2026-10-25..review-2026-10-26`

    git log --oneline review-2026-10-25..review-2026-10-26
    git diff review-2026-10-25..review-2026-10-26 -- electron src shared scripts

Code: 4 Dateien, +6 / −2. `a9d33958` (der Reiter zeigt den Hinweis des Plugins unter einem
Schlüssel: `formsService.ts`, `ipc-contract.ts`, `FormsKeys.tsx`), `23ebb860` und `92437730`
(`FORMS_READ_AGAINST` 0.5.5, 0.5.6). Klein, aber der Reiter liest seine Kopien gegen ein Plugin,
das sich in 0.5.5/0.5.6 an Stellen geändert hat, die er abschreibt (`demo`, Captcha, Zeitfalle).

### Block C: das Handbuch zu quartz-forms, `0c98b97..dafb9d6`

    cd /Users/boxi/Obsidian/QuartzProjekte/quartz-forms-handbuch
    git log --oneline 0c98b97..dafb9d6

13 Commits. Gefragt ist, wo das Handbuch jetzt etwas anderes sagt als der Code in 0.5.6, und ob
jede deutsche Änderung auch in der englischen Fassung angekommen ist.

## Abwägungen, die niemand gegengelesen hat

Die Reihenfolge ist A, C, B.

**1. M1: die zurückgehaltene Prüfung (`1c0c0aa`).** Eine Prüfung, die wartet, kann verloren gehen.

- Wird sie in jedem Fall nachgeholt: Zeiger außerhalb des Formulars oder des Fensters losgelassen,
  `pointercancel`, Touch mit Scrollen, ein Kontextmenü, ein Drag, der Fokus wandert per Tab
  während der Druck anhält, ein Element, das zwischen Druck und Loslassen verschwindet
  (Schritt-Wechsel)?
- Kann ein Formular abgesendet werden, dessen zurückgehaltene Prüfung einen Fehler gefunden
  hätte? Was sagt `aria-invalid`/die Fehlerzeile danach?
- Die Neu-Messung (28 px bei scrollY 0 in 1200×1300, „bei gescrollter Seite gleicht Scroll
  Anchoring aus“): stimmt sie, und gilt sie für Safari/Firefox ebenso, wo Scroll Anchoring fehlt
  oder anders arbeitet? Gemessen werden kann nur Chrome; sag, was offen bleibt.

**2. `72af084`: Stylesheet und Skript nur noch über den Transformer.**

- Kommt ein Formular in der Seitenleiste (`FormBox`) auf **jeder** Seite zu CSS und Skript, auch
  auf Seiten, die der Transformer nicht anfasst (Ordner-, Tag-, 404-Seiten, Bases-Seiten,
  Seiten, die ein anderer Emitter erzeugt)? Was, wenn ein Betreiber nur die Komponente nutzt?
- Was kostet es eine Website ohne ein einziges Formular, auf jeder Seite Skript und Stil zu
  laden? Wer den Nutzen misst, misst auch den Preis.
- SPA-Navigation von einer Seite ohne Formular auf eine mit, und zurück; doppelte Bindung.
- Hält das, was das fünfzigste Review über zwei Kopien von `forms.scss` gemessen hat, und hält
  die Kaskade (N4, `guard.scss`) mit nur einer Kopie, die jetzt in einer anderen Reihenfolge
  geladen werden könnte?

**3. Die Demo nach 0.5.5/0.5.6.** Kein Captcha, keine Zeitfalle, eigener `<noscript>`-Satz,
„Nichts wurde gesendet“ auch bei eigenem `success.text`.

- Gibt es noch einen Weg, auf dem `transport: demo` eine Anfrage stellt oder wie ein Versand
  aussieht (Redirect, `transportOverride`, ein Relay, das QuartzControl erzeugt)?
- Fordert der Bau, die CLI (`check`) oder der Reiter in QuartzControl für ein Demo-Formular noch
  etwas, das die Demo nicht mehr braucht (Captcha-Geheimnis, `minSeconds`)?
- Das neue Demo-Schlüsselpaar (Vault `fab3ad8`): Fingerabdruck an jeder Stelle in beiden Sprachen
  gleich und gleich dem Schlüssel unter `keys/` des Handbuch-Projekts? Entschlüsselt der
  veröffentlichte private Schlüssel die Ausgabe **jedes** verschlüsselnden Demo-Formulars?

**4. M2: der Hinweis auf RFC-9580-Schlüssel (`8931309`).**

- Trifft er genau die Schlüssel, die gpg nicht lesen kann, und keine, die gpg liest (v4 mit
  `ed25519`/`cv25519` „legacy“, v6-Schlüssel anderer Algorithmen, Unterschlüssel gemischt)?
- Kommt er in QuartzControl an (`a9d33958`) und wird er dort gesagt, wo der Schlüssel steht?

**5. Browser und Relay schreiben dieselbe Mail.** N3 (`6ae2f6a`), `a97a0b7`, `3dc2d33`.

- Unterscheiden sich die Mail des Skripts und die Plain-Post-Mail des Relays für dasselbe
  Formular und dieselbe Eingabe noch irgendwo (Kästchen, Leerraum, Mehrfachwahl, leere Felder,
  Seite, Sprache)? Hält `test/parity-cases.ts` das fest, oder nur die Prüfregeln?
- Was reist bei Diensten jetzt neben dem Chiffrat, und sagen README und Handbuch 6.2 genau das?

**6. N2: Proof-of-Work nach abgelehntem Stempel (`0c7114a`).** Kann die Wiederholung in eine
Schleife laufen, wenn das Relay dauerhaft ablehnt? Wird der Besucher dann informiert?

**7. Was das Handbuch jetzt verspricht.** Die dreizehn Commits in Block C, Satz für Satz gegen
0.5.6. Besonders 2.1 (`date`), 6.3 (`noScript`, Zeitfalle bei der Demo), 8.3 (YAML 1.2 und
`yes`), 9.2 (die acht Meldungen). Und: Tun die Demo-Formulare der Website mit 0.5.6 noch, was
ihre Seiten sagen?

**8. Der Reiter.** Bietet er für ein Demo-Formular Felder an, die nicht mehr wirken, oder fragt
er nach einem Captcha-Geheimnis, das die Demo nicht mehr braucht? `check:plugin-copies` sagt
„keine Abweichung“ gegen 0.5.6; prüft es die Stellen, die sich geändert haben?

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was einem Absender oder Empfänger schaden kann

Abwägungen 1, 3 und 5: eine Prüfung, die verloren geht; eine Demo, die sendet; eine Mail, die
anders ankommt, als der Besucher sie gesehen hat.

### 2. Was einem Betreiber schaden kann, der dem Handbuch folgt

Abwägungen 3, 4 und 7.

### 3. Was auf einer Website falsch aussieht oder nicht funktioniert

Abwägungen 2 und 6.

### 4. Was QuartzControl falsch schreibt oder anbietet

Abwägungen 4 und 8.

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
- Wer einen Klick misst, prüft, dass das Ziel im Fenster liegt (der Fehler der M1-Messung).
- Prüfskripte öffnen keine `mailto:`-Links.
- Captcha nur mit den öffentlichen Testschlüsseln (Turnstile: Site-Key
  `1x00000000000000000000AA`, Secret `1x0000000000000000000000000000000AA`; hCaptcha: Site-Key
  `10000000-ffff-ffff-ffff-000000000001`, Secret `0x` und 40 Nullen).
- Testschlüssel für OpenPGP mit gpg in einem kurzen `GNUPGHOME` unter
  `$(getconf DARWIN_USER_TEMP_DIR)`; im Scratchpad ist der Pfad für den Socket zu lang. Der
  Demo-Schlüssel des Handbuchs liegt im Vault unter `private/keys/`.

**Die Website des Handbuchs:**

- Kopiere das Projekt: `cp -Rc ~/Documents/QuartzProjekte/quartz-forms-handbuch <scratchpad>/hb`.
  `content` ist dort ein Symlink auf den Vault: **schreib nichts unter `content/`**. Wer Inhalt
  ändern will, ersetzt den Symlink in der Kopie durch eine Kopie des Vaults.
- `.quartz/plugins/quartz-forms` ist dort das installierte 0.5.6; für Änderungen am Plugin
  ersetze es in der Kopie durch einen Symlink auf deinen Klon. Die vier `frame-*` unter
  `.quartz/plugins/` sind Symlinks mit absolutem Pfad in das echte Projekt; Quartz liest sie nur,
  schreib nicht hinein.
- `npx quartz build` in der Kopie, ausliefern über einen eigenen Server auf `localhost` mit dem
  Pfad `/quartz-forms` davor (die `baseUrl` ist `boxi-os.github.io/quartz-forms`).

**Die App:** `npm run build` in einem Klon von QuartzControl, nicht im Repo; starten mit
`_electron.launch` und einem eigenen `--user-data-dir` im Scratchpad, nie mit dem echten Profil.

## Was du ablieferst

Einen Bericht auf Deutsch in `<scratchpad>/review-51/review.md`:

- Befunde nach Gewicht (Hoch, Mittel, Niedrig), je mit Ort, Szenario, Beleg (gemessen oder
  gelesen, und womit) und einem Vorschlag;
- getrennt davon eine Liste „Nebenbei“ für Kleinigkeiten;
- am Ende ein Urteil, ob quartz-forms 0.5.6 und sein Handbuch so mit 1.2 veröffentlicht werden
  können, und was vorher geschehen muss.

Kennzeichne bei jedem Befund, ob du ihn gemessen oder nur gelesen hast.
