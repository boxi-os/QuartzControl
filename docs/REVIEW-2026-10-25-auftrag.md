Du bist als zweites Paar Augen an zwei Projekten, die zusammengehören: QuartzControl, dessen
Fassung `1.1.0` (2026-10-18) draußen ist und dessen nächste, **1.2**, auf dem Branch `feat/1.2`
entsteht, und **quartz-forms**, einem eigenen Quartz-Plugin für Web-Formulare, das mit 1.2
veröffentlicht werden soll, samt einem eigenen Handbuch. Es geht um ein Review, nicht um
Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Warum diese Runde

Das neunundvierzigste Review (Claude Fable 5.1, Bericht `docs/REVIEW-2026-10-24.md`) hat den Reiter
„Formulare“ und quartz-forms bis 0.4.0 gelesen. **Alles danach hat Claude Opus 5.5 an einem Tag
geschrieben (2026-10-19), und nichts davon hat ein Review gelesen:**

- die Fixes des neunundvierzigsten Reviews und seiner Nebenbei-Liste, im Plugin (0.4.1) und im
  Reiter;
- quartz-forms 0.5.0 bis 0.5.4: ein Versandweg `demo`, der nichts sendet; das Du in den deutschen
  Texten; eine Korrektur an der Art, wie Quartz die `defaultOptions` mischt; zweimal die
  Kaskadenschicht des Stylesheets, dazu zwei Regeln, die bewusst außerhalb stehen; die Rechte von
  `config.php`; zwei Zeilen der Nachricht, die bis 0.5.3 immer englisch waren;
- Formular-Stile in der Beispielvorlage von QuartzControl (`plugin-forms.scss`), gemessen mit
  einem Kontrastskript;
- das Handbuch zu quartz-forms (ein Obsidian-Vault und ein Quartz-Projekt mit dreizehn
  Demo-Formularen) und ein neuer Abschnitt im Handbuch von QuartzControl.

Die Haltung ist dieselbe wie zuletzt: **Nimm nichts als gemessen hin, nur weil es so dasteht.**
Jede Zahl in einer Commit-Nachricht, im CHANGELOG und in diesem Auftrag hat dasselbe Modell
erhoben, ausgewertet und aufgeschrieben. Wo eine Messung einen Fix trägt, versuche sie zu
widerlegen. Mehrere Fixes dieser Runde sind Fixes von Regressionen, die der Fix davor eingeführt
hat (0.5.2 → 0.5.3 → 0.5.4); such die nächste.

In der Zählung von `CLAUDE.md` ist das das **fünfzigste** Review.

## Die Projekte

**QuartzControl:** Electron + React + TypeScript, `/Users/boxi/Development/QuartzControl`.

- Lies zuerst `CLAUDE.md` **und `docs/conventions.md`**, das sie einbindet. Die Begründungen der
  Regeln stehen in `docs/decisions/conventions-full.md`.
- Für diese Runde zusätzlich: in `docs/decisions/plugins-and-config.md` der Abschnitt über
  quartz-forms (am Ende), in `docs/scripts.md` die Einträge zu `check:plugin-copies` und
  `template:example`, in `docs/release.md` Punkt 5.
- Was aus dem neunundvierzigsten Review wurde, steht am Ende von `docs/reviews.md`.

**quartz-forms:** `/Users/boxi/Development/quartz-forms`, privat auf GitHub (`boxi-os/quartz-forms`).

- Lies `AGENTS.md` (Arbeitsweise und die Zwänge, die das Plugin einhält), `ARCHITECTURE.md`,
  `README.md`/`README.de.md`, `relay/php/README.md` und `CHANGELOG.md`.
- Drei Ebenen prüfen dieselben Regeln: der Bau (`src/validate.ts`), der Browser
  (`src/scripts/forms.inline.ts`, ein einfaches Skript ohne Bundler-Laufzeit) und das Relay
  (`relay/php/send.php`). `test/parity-cases.ts` hält Browser und Relay an einem Katalog.

**Das Handbuch zu quartz-forms:**

- Inhalt: der Vault `/Users/boxi/Obsidian/QuartzProjekte/quartz-forms-handbuch` (Deutsch im
  Wurzelordner, Englisch unter `en/`, 41 + 41 Seiten, gepaart über `translationKey`; `private/`
  wird nicht veröffentlicht). Eigenes privates Repo `boxi-os/quartz-forms-handbuch`.
- Website: das Quartz-Projekt `/Users/boxi/Documents/QuartzProjekte/quartz-forms-handbuch`
  (`content` ist ein Symlink auf den Vault). Darin die dreizehn Demo-Formulare in
  `quartz.config.yaml`, der öffentliche Demo-Schlüssel unter `keys/`, die Formular-Stile der
  Vorlage unter `quartz/styles/custom/plugin-forms.scss`. Dort ist quartz-forms **0.5.3** aus
  GitHub installiert, nicht 0.5.4 (0.5.4 ist nicht gepusht).
- Das Handbuch von QuartzControl: `/Users/boxi/Obsidian/QuartzProjekte/QuartzControl-Handbuch`,
  Abschnitt „Formulare“ in `4-gestaltung/08-plugins.md` und `en/4-design/08-plugins.md`.

## Umfang

### Block A: quartz-forms, `e79aaa6..f5b6f94`

    cd /Users/boxi/Development/quartz-forms
    git log --oneline e79aaa6..f5b6f94
    git diff e79aaa6..f5b6f94 -- src relay scripts test .github

34 Commits, 29 Dateien, +1170 / −202.

- **0.4.1** (`449ef9d` bis `81c957c`): die Fixes des neunundvierzigsten Reviews und seiner
  Nebenbei-Liste. Was jeder behebt, steht in `docs/reviews.md` von QuartzControl.
- **0.5.0** (`8cd2917`, `26a485b`, `4d1c5dd`): Du statt Sie; der Versandweg `demo`. Er sendet
  nichts und zeigt nach dem Absenden, was angekommen wäre, verschlüsselt, wenn das Formular
  verschlüsselt.
- **0.5.1** (`6f08b57`): Quartz legt die YAML-Optionen über die `defaultOptions` des Manifests,
  eine Ebene tief. Ein globaler Spam-Wert gilt seither nur als „geschrieben“, wenn er von der
  Vorgabe abweicht (`writtenSpam`).
- **0.5.2** (`0e2a6a4`): die Kopie des Stylesheets, die der Transformer liefert, liegt jetzt wie
  die der Komponente in `@layer quartz-base`, damit `custom.scss` gewinnt.
- **0.5.3** (`20cadc3`): Regression von 0.5.2, die Kästchen des Formulars wurden zu Symbolen der
  Aufgabenliste eines Themes. Eine Regel steht seitdem ohne Schicht in `guard.scss`.
- **0.5.4** (`40ad8b2`, `1989365`, `ad07128`, `e5c38ef`): `config.php` in beiden Zweigen 0600;
  `messagePage`/`messageKey` als Textschlüssel; Du im deutschen README; die Außenabstände des
  Formulars ebenfalls in `guard.scss` (Regression von 0.5.2).

### Block B: QuartzControl, `review-2026-10-24..review-2026-10-25`

    git log --oneline review-2026-10-24..review-2026-10-25
    git diff review-2026-10-24..review-2026-10-25 -- electron src shared scripts

19 Commits und dieser Auftrag. Code: 18 Dateien, +472 / −64.

- **Fixes des neunundvierzigsten:** `a14d6f0d`, `bf49cc21`, `cb85ef9c`, `29ad988a`, `3192d649`,
  `cd6f06e0`.
- **Der Reiter folgt dem Plugin:** `2a1bb7a5`, `1ecfe05e`, `e74c5b37` (der Versandweg `demo`),
  `41c815e1`, `523eda3f`, `3cf79d49`, `c6c2113a`.
- **Die Vorlage:** `9caf7581` (`scripts/example-template/styles/plugin-forms.scss`, Reihenfolge in
  `style-order.mjs`, Kontrastpaare in `palette.mjs`), `919e696d` (`docs/release.md`).

Nicht gepusht sind `c6c2113a` und dieser Auftrag; der Rest liegt auf `origin/feat/1.2`.

### Block C: das Handbuch zu quartz-forms

Dieser Block ist kein Diff. Das Handbuch soll mit 1.2 öffentlich werden und ist die erste Stelle,
an der ein Betreiber liest, was das Plugin verspricht. Gefragt ist, wo es etwas anderes sagt als
der Code.

## Abwägungen, die niemand gegengelesen hat

Die Reihenfolge ist A, C, B.

**1. Der Versandweg `demo`.** Er soll nie etwas verschicken und nie so aussehen, als hätte er
etwas verschickt.

- Gibt es einen Weg, auf dem ein Formular mit `transport: demo` doch eine Anfrage stellt? Denk an
  `redirect`, `captcha`, `mailto`, eine `url`, die trotzdem dasteht, ohne JavaScript,
  `transportOverride` je Formular, und ein Relay, das QuartzControl für die Website erzeugt.
- Was sieht ein Besucher, und kann er es mit einem echten Versand verwechseln?
- Das Handbuch veröffentlicht den **privaten** Demo-Schlüssel, damit Leser die Ausgabe
  entschlüsseln können. Ist sauber getrennt, dass dieser Schlüssel nie für etwas anderes taugt?
  Kann eine Website ihn versehentlich für ein echtes Formular übernehmen, z. B. über die
  Beispiel-Konfigurationen in Kapitel 8?

**2. Die Kaskade: drei Fassungen an einem Tag.** 0.5.2 hat das ganze Stylesheet in
`@layer quartz-base` gelegt; 0.5.3 und 0.5.4 haben je eine Regel wieder herausgenommen, weil
ungeschichtete Regeln eines Themes gewannen. Fragen dazu:

- Welche weiteren Regeln von `forms.scss` verlieren gegen übliche ungeschichtete Theme-Regeln für
  den Artikel (`article input`, `article select`, `article label`, `article textarea`,
  `article button`, `article h3`, `article pre`, `article fieldset`, `article ul`)? Gemessen ist
  nur die Vorlage von QuartzControl und gui-test.
- `guard.scss` steht ohne Schicht und beschneidet damit, was eine Website in `custom.scss`
  ändern kann. Gewinnt sie an einer Stelle, an der der Betreiber gewinnen sollte?
  `.quartz-form :is(p, h3, h4, fieldset, pre) { margin: 0 }` trifft jedes solche Element im
  Formular.
- Die Formular-Stile der Vorlage (`plugin-forms.scss`) beruhen auf der Annahme, dass sie gegen
  das geschichtete Stylesheet immer gewinnen. Stimmt das jetzt noch für jede ihrer Regeln, auch
  gegen `guard.scss`?
- Erreicht das Stylesheet eine Seite zweimal (Komponente und Transformer)? Was folgt daraus für
  ein Formular in der Seitenleiste (`FormBox`)?

**3. `writtenSpam` (0.5.1).** „Geschrieben“ heißt seitdem „weicht von der Vorgabe ab“. Wer den
Vorgabewert ausdrücklich schreibt, gilt als „nicht geschrieben“. Fragen dazu:

- Ändert das außer Hinweisen etwas, z. B. was ins Relay geschrieben wird oder welche
  Formular-Werte einen globalen überschreiben?
- Gilt das Mischen eine Ebene tief auch für andere Schlüssel oberster Ebene (`texts`,
  `transport`, `keys`, `layout`)? Hat das Plugin dort denselben Fehler, den 0.5.1 nur für `spam`
  behoben hat?

**4. Die Nachricht in der Sprache der Seite (0.5.4).** Das Relay kennt die Texte einer Website
nicht. Eine verschlüsselte Nachricht schreibt der Browser, eine unverschlüsselte ohne JavaScript
das Relay. Unterscheiden sich die zwei Nachrichten desselben Formulars jetzt an Stellen, an denen
sie es vorher nicht taten? Für welche Sprache, wenn die Seite weder Deutsch noch Englisch ist?

**5. Was das Handbuch verspricht.** Prüfe Satz für Satz gegen den Code, vor allem in:

- `5-versand/` (die Versandwege, das Relay, seine Rechte und das Hochladen);
- `6-schutz/` (anonym, Verschlüsselung, Spam);
- `9-nachschlagen/` (alle Optionen, Meldungen, Grenzen).

Die Tabellen der Textschlüssel in 9.1 sind aus den Locales erzeugt; die Optionstabellen nicht.
Für jedes der dreizehn Demo-Formulare gilt: Tut es, was die Seite darüber sagt?

**6. Die Formular-Stile der Vorlage.** `palette.mjs` liest die Zuweisungen der
`--quartz-forms-*`-Variablen aus `plugin-forms.scss` und misst 14 Paare. Fragen dazu:

- Misst es, was auf der Seite steht, oder was es aus der Datei liest?
- Welche Farben des Formulars misst es nicht: Platzhalter, deaktiviert, Hinweise, Fehler im
  dunklen Modus, die Ausgabe der Demo, die Fokusmarkierung?
- Gilt die Ziel-Größe von 44px für jedes Bedienelement des Formulars, auch die Kästchen und die
  Datei-Schaltfläche?

**7. Der Reiter und die Fassungen des Plugins.** Der Reiter bietet `demo` an. Was tut er mit
einem Projekt, dessen quartz-forms älter ist als 0.5.0? `29ad988a` blendet für eine Fassung ohne
0.4.0 die neuen Felder aus. Geschieht das für `demo` auch, und sagt der Reiter es?

**8. Die Fixes des neunundvierzigsten Reviews.** Jeder hat eine Messung in seiner
Commit-Nachricht. Versuche, sie zu widerlegen, besonders `0ef9f41` (neues Ticket nach
abgelehntem Stempel), `16d8a12` (Zähler zurückgeben bei `502 mail`), `00f7946` (`Reply-To`) und
`cb85ef9c` (Aufräumen von `qc-relay-*`).

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was einem Absender oder Empfänger schaden kann

Abwägungen 1 und 4: eine Demo, die sendet; eine Nachricht, die anders ankommt, als der Besucher
sie gesehen hat.

### 2. Was einem Betreiber schaden kann, der dem Handbuch folgt

Abwägungen 1 und 5: ein Satz, der etwas verspricht, was der Code nicht hält; eine
Beispiel-Konfiguration, die auf einer echten Website Schaden anrichtet.

### 3. Was auf einer Website falsch aussieht

Abwägungen 2 und 6.

### 4. Was QuartzControl falsch schreibt oder anbietet

Abwägungen 3, 7 und 8.

## Wenn du misst

Ändere nichts in den beiden Repos, im Vault, im Handbuch-Projekt oder in einem anderen Projekt
unter `~/Documents/QuartzProjekte`. Arbeite in Kopien in deinem Scratchpad. **Lies nie etwas aus
einem Projekt oder Vault namens `HinterlandHistory`/`hinterland-history`**, auch nicht in einer
Schleife über alle Projekte. `obsidian-cli` nur mit `vault=gui-test-content`.

**Das Plugin:**

- Klone es in deinen Scratchpad: `git clone /Users/boxi/Development/quartz-forms <scratchpad>/qf`,
  dort `npm ci` und `npm run check`. Das sind Typen, Lint, Format und Tests mit der Relay-Suite.
  Ein Test der Zeitfalle (`time trap: a stamp the relay issued just now is too fast`) ist einmal
  unter Last gescheitert und danach dreimal durchgelaufen.
- Die Relay-Suite braucht `php` im PATH. Homebrew-PHP 8.5 ist installiert.
- Starte `php -S` immer mit `-d opcache.enable=0`, sonst liefert Opcache eine umgeschriebene
  `config.php` bis zu zwei Sekunden alt aus. Das Relay schickt sich selbst Anfragen, deshalb
  braucht `php -S` `PHP_CLI_SERVER_WORKERS=4`. Mail geht in eine Datei:
  `mailer => ['file' => <outbox>]`, wie in `test/relay.test.ts`.

**Im Browser:**

- Chrome über `playwright-core` (in `/Users/boxi/Development/QuartzControl/node_modules`) mit
  `channel: 'chrome'`. Die Seite muss von `localhost` kommen, sonst fehlt `crypto.subtle`.
- Ein Kontext mit `javaScriptEnabled: false` braucht `{ force: true }` bei `click()`/`check()`.
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
- `.quartz/plugins/quartz-forms` ist dort das installierte 0.5.3. Für 0.5.4 ersetze es in der
  Kopie durch einen Symlink auf deinen Klon. Die vier `frame-*` unter `.quartz/plugins/` sind
  Symlinks mit absolutem Pfad in das echte Projekt; Quartz liest sie nur, schreib nicht hinein.
- `npx quartz build` in der Kopie, ausliefern über einen eigenen Server auf `localhost` mit dem
  Pfad `/quartz-forms` davor (die `baseUrl` ist `boxi-os.github.io/quartz-forms`).
- Die Vorlage messen: `npm run template:example -- --check-contrast` in QuartzControl misst die
  Kontrastpaare (107, braucht weder App noch Projekt); `--check-sync` sagt, ob die Stile des
  Beispiel-Projekts zu `scripts/example-template/styles/` passen (siehe `docs/scripts.md`).

**Die App:** `npm run build` in einem Klon von QuartzControl, nicht im Repo; starten mit
`_electron.launch` und einem eigenen `--user-data-dir` im Scratchpad, nie mit dem echten Profil.

## Was du ablieferst

Einen Bericht auf Deutsch in `<scratchpad>/review-50/review.md`:

- Befunde nach Gewicht (Hoch, Mittel, Niedrig), je mit Ort, Szenario, Beleg (gemessen oder
  gelesen, und womit) und einem Vorschlag;
- getrennt davon eine Liste „Nebenbei“ für Kleinigkeiten;
- am Ende ein Urteil, ob quartz-forms und sein Handbuch so mit 1.2 veröffentlicht werden können,
  und was vorher geschehen muss.

Kennzeichne bei jedem Befund, ob du ihn gemessen oder nur gelesen hast.
