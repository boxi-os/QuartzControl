Du bist als zweites Paar Augen an zwei Projekten, die zusammengehören: QuartzControl, dessen
Fassung `1.1.0` (2026-10-18) draußen ist und dessen nächste, **1.2**, auf dem Branch `feat/1.2`
entsteht, und **quartz-forms**, einem eigenen Quartz-Plugin für Web-Formulare, das mit 1.2
veröffentlicht werden soll. Es geht um ein Review, nicht um Änderungen. Am Ende steht eine Liste
von Befunden, über die der Nutzer entscheidet.

## Warum diese Runde

**Du bist wieder ein anderes Modell als alles, was du liest.** Das achtundvierzigste Review hat
Claude Fable 5.1 geschrieben. Alles danach stammt von Claude Opus 5.5, an einem einzigen Tag
(2026-10-19):

- der Reiter „Formulare“ in QuartzControl (`feat/1.2`);
- quartz-forms von der ersten Zeile bis 0.4.0;
- die zwei Reviews des Plugins. Beide wurden von Opus-Agenten mit frischem Kontext geschrieben,
  also vom selben Modell;
- dieser Auftrag.

Nichts davon hat ein anderes Modell gelesen.

**Das Plugin trägt mehr Verantwortung als die übrigen Plugins dieses Projekts.** Es nimmt
Eingaben fremder Besucher an, verschlüsselt sie mit OpenPGP im Browser und verschickt sie über
ein PHP-Relay, das auf dem Webspace des Betreibers liegt. Ein Fehler dort zeigt sich nicht als
falsches Aussehen. Er zeigt sich als Nachricht, die im Klartext ankommt, als Mail, die nicht
ankommt, oder als offener Mailer auf fremdem Webspace.

Die Haltung ist dieselbe wie in der achtundvierzigsten Runde: **Nimm nichts als gemessen hin, nur
weil es so dasteht.** Jede Zahl in einer Commit-Nachricht, in `docs/decisions/` und in der
Paritätstabelle des Plugins hat dasselbe Modell erhoben, ausgewertet und aufgeschrieben. Wo eine
Messung einen Fix trägt, versuche sie zu widerlegen. Suche nach Fragen, die keine Runde gestellt
hat, nicht nach Varianten der gestellten.

In der Zählung von `CLAUDE.md` ist das das **neunundvierzigste** Review. Die zwei Reviews des
Plugins zählen dort nicht mit; ihre Berichte stehen nicht im Repo.

## Die Projekte

**QuartzControl:** Electron + React + TypeScript, `/Users/boxi/Development/QuartzControl`.

- Lies zuerst `CLAUDE.md` **und `docs/conventions.md`**, das sie einbindet.
- Die Begründungen der Regeln stehen in `docs/decisions/conventions-full.md`.
- Für diese Runde zusätzlich:
  - in `docs/decisions/plugins-and-config.md` der Abschnitt über quartz-forms (am Ende);
  - in `docs/decisions/publishing-and-credentials.md` die zwei Absätze über das Relay (am Ende);
  - in `docs/scripts.md` der Eintrag zu `check:plugin-copies`;
  - in `docs/release.md` Punkt 2, die zwei Linien.
- Die Chronik steht in `docs/reviews.md`. Am Ende steht, was aus dem achtundvierzigsten geworden
  ist, mit Auftrag und Bericht `docs/REVIEW-2026-10-23*.md`.

**quartz-forms:** `/Users/boxi/Development/quartz-forms`, privat auf GitHub (`boxi-os/quartz-forms`).
Lizenz und Veröffentlichung sind noch nicht entschieden.

- Lies `CLAUDE.md`, `AGENTS.md` (Arbeitsweise), `ARCHITECTURE.md` (Lebenslauf, Dateikarte),
  `README.md`/`README.de.md` (alle Optionen und das, was dem Betreiber versprochen wird),
  `relay/php/README.md` und `CHANGELOG.md`.
- Drei Ebenen prüfen dieselben Regeln:
  - der Bau: `src/validate.ts`;
  - der Browser: `src/scripts/forms.inline.ts`, ein einfaches Skript ohne Bundler-Laufzeit;
  - das Relay: `relay/php/send.php`.
- `test/parity-cases.ts` hält Browser und Relay an einem gemeinsamen Katalog von Fällen.

**Der Plan für 0.4.0 und die Phasen 5 bis 8 des Reiters** steht außerhalb beider Repos:
`/Users/boxi/.claude/plans/pasted-content-id-716b-wir-arbeiten-virtual-sedgewick.md`.

**Die zwei früheren Reviews des Plugins** liegen noch im Scratchpad einer alten Sitzung. Das ist
ein Ordner unter `/private/tmp`, er kann also verschwunden sein:

- das erste: `/private/tmp/claude-501/-Users-boxi-Development-QuartzControl/ddf844f4-1123-4c75-a1d8-9b94b87b6cd7/scratchpad/review-opus/review.md`;
- das zweite, daneben, in `review-opus-2/review.md`.

Was aus ihren Befunden wurde, steht in den Commit-Nachrichten des Plugins: `32bbe60` bis
`a81757f` für das erste, `5800c4e` bis `62ff96d` für das zweite.

## Umfang

### Block A: der Reiter „Formulare“, `v1.1.0..review-2026-10-24`

    git log --oneline v1.1.0..review-2026-10-24
    git diff v1.1.0..review-2026-10-24 -- electron src shared scripts

19 Commits und dieser Auftrag. Code: 29 Dateien, +5787 / −67. Der größte Teil liegt in
`src/routes/Plugins/` (`Forms.tsx`, `FormFieldsEditor.tsx`, `FormsRelay.tsx`, `FormsKeys.tsx`,
`FormText.tsx`, `formsOptions.ts`), in `electron/main/services/formsService.ts` und
`connectionsService.ts` und in `shared/formUsages.ts`.

- **Der Reiter:**
  - `a65df63d`: Liste und Abschnitte.
  - `1b573ac4`: die Leiste eines Formulars.
  - `4cd2032f`: der Feld-Baukasten.
  - `9781c2f5`: die Fundstellen, mit Rückfrage vor einem Umbenennen und Vorschau.
  - `44490258`: die Schlüssel.
  - `a0929daf`: die Prüfung des Plugins, an der Stelle angezeigt, die sie nennt.
  - `57a2fe67`: das Relay mit seinen Geheimnissen und dem Hochladen.
  - `1c0b6798`: `check:plugin-copies` und die Doku.
- **Nachgezogen:** `c93b2a51`, `c2f9735c`, `acf5891c`, `48e3ada6`.
- **0.4.0 im Reiter:** `b61c1f2e` (Breite, Anordnung), `34630197` (Bedingungen), `e5db319d`
  (Seitenumbrüche), `78aac7dc` (gegen 0.4.0 gelesen, die Abschriften geprüft).
- **Ohne Formularbezug:** `169f3865`, `f062050f` und `1ee6dba3`.

Nicht gepusht. `fix/1.1.x` ist vollständig in `feat/1.2` enthalten.

### Block B: quartz-forms 0.2.0 bis 0.4.0, `665f51f..e79aaa6`

    cd /Users/boxi/Development/quartz-forms
    git log --oneline 665f51f..e79aaa6
    git diff 665f51f..e79aaa6 -- src relay scripts test .github

9 Commits, 31 Dateien, +3396 / −473.

- **0.2.0** (`b2b20b1`): eine Kommandozeile `dist/cli.js` mit `check`, `key` und `relay`, die
  QuartzControl im Kindprozess fragt. Der Relay-Generator zog dafür von `scripts/` nach
  `src/relay/generate.ts`.
- **0.3.0** (`5de9501`): Meldungen als Code mit Werten, deutsch und englisch (`src/messages/`).
- **0.4.0:**
  - `f64b0ad`: Feldbreiten in einem Container-Query-Raster, Optionen nebeneinander.
  - `1328b5c`: bedingte Felder (`showIf`).
  - `9f5542f`: Schritte (`pageBreak`).
  - Dazu `504559f`, `8964f22` und das Release `7b56bd7`.
- **Die CI:** `e79aaa6`, Actions auf Node 24.

### Block C: quartz-forms als Ganzes, mit frischen Augen

    git log --oneline              # das ganze Repo
    wc -l relay/php/send.php src/scripts/forms.inline.ts src/validate.ts src/render/form.ts

Dieser Block ist nicht als Diff zu lesen. Die zwei Reviews davor haben den Stand bis `a81757f`
gelesen, beide mit den Augen desselben Modells. Gefragt ist, was sie übersehen haben, nicht eine
Wiederholung. Der Einstieg ist das Bedrohungsmodell, das die READMEs dem Betreiber versprechen.

## Abwägungen, die niemand gegengelesen hat

Die Reihenfolge ist C, B, A.

**1. Was das Relay einem Fremden erlaubt.** `send.php` ist ein öffentlicher Endpunkt auf
geteiltem PHP-Webspace, der Mail verschickt. Seine Schutzmechanismen:

- eine Prüfung des Origin;
- ein signierter Zeitstempel (`?challenge=`);
- ein Proof of Work;
- ein Captcha;
- ein Ratenlimit je Formular und Stunde;
- Empfänger, die nur in der `config.php` stehen;
- ein Reply-To aus einem Feld.

**Wer kein Browser ist, setzt jeden Header selbst.** Was hält dann noch?

- Kann jemand das Relay benutzen, um an andere Adressen als die des Betreibers zu schreiben, um
  Header einzuschleusen oder um Reply-To und Betreff zu formen?
- Kann jemand den Webspace füllen: Zähler, Verzeichnisse verbrauchter Beweise, Logs?
- Kann jemand den Betreiber durch das Ratenlimit von seinen echten Absendern abschneiden?
- Stimmt, was die READMEs versprechen, mit dem überein, was der Code tut, Satz für Satz?

**2. Verschlüsselung, die hält, was sie verspricht.** Es gibt drei Modi: `required`, `optional`
und `off`, dazu `anonymous`, den Schlüssel des Besuchers (`pgpKey`) und die Seite, die im
Chiffrat mitreist. OpenPGP.js 6.3.2 liegt unverändert in `dist/vendor/` und wird unter
`static/` ausgeliefert.

- Was erreicht bei `required` das Relay und die Mail im Klartext: Formular, Sprache, Betreff,
  Reply-To, Zeitpunkte, Größe?
- Was sieht ein fremdes Skript auf derselben Seite, bevor verschlüsselt wird? Dazu gehören das
  Captcha von Cloudflare oder hCaptcha, andere Quartz-Plugins und Quartz' SPA-Navigation. Sagt das
  README es?
- Gibt es einen Weg, auf dem der Browser bei `required` doch Klartext schickt: ein Skript, das
  mitten im Absenden scheitert, eine SPA-Navigation, ein Formular, das zweimal auf der Seite
  steht, ohne JavaScript?

**3. Bedingungen und Schritte, wo Browser und Relay nicht dasselbe sehen.** Entschieden ist:
Ein Wert für ein inaktives Feld wird verworfen, nicht abgelehnt, und ohne JavaScript stehen alle
Schritte untereinander. Die Ableitung steht in `src/conditions.ts` als `when`-Liste je Feld. In
ihr steckt auch die Bedingung des Schritts. Fragen dazu:

- **Ein Einwilligungsfeld in einem bedingten Schritt** fällt weg, wenn der Schritt übersprungen
  wird, und die Nachricht geht ohne Einwilligung hinaus. Das ist aufgefallen, aber nicht
  entschieden. Wiegt das als Bauproblem, als Hinweis, oder ist es so richtig?
- **Ein `hidden`-Feld in einem übersprungenen Schritt:** Kommt sein fester Wert an oder nicht? Und
  ist das das, was ein Betreiber erwartet?
- **Ein Besucher wählt die Werte der Steuerfelder selbst.** Welche Pflichtfelder kann er damit
  abschalten? Das schließt das Feld für Reply-To und das `pgpKey`-Feld ein.
- **Eine verschlüsselte Nachricht** zeigt dem Relay keine Felder. Bedingungen und Pflicht prüft
  dann nur der Browser. Sagt das die Dokumentation an der Stelle, wo sie die drei Ebenen
  beschreibt?
- **Der Paritätskatalog** ist der Beleg dafür, dass Browser und Relay gleich entscheiden. Finde
  einen Fall, den er nicht enthält und in dem sie verschieden entscheiden. Kandidaten:
  - ein Steuerfeld in einem übersprungenen Schritt;
  - eine Kette über einen Schritt hinweg;
  - Checkboxen als String gegen Array;
  - leere oder doppelte Werte in `equals`;
  - ein Plain-Post, der ein Feld zweimal nennt.
- **Ein langer Fragebogen** über mehrere Schritte trifft auf die Zeitfalle, den Stempel
  (24 Stunden), das Fenster des Proof of Work und das Captcha, das erst im letzten Schritt
  erscheint. Was passiert dem, der nach einer Stunde absendet, oder am nächsten Tag?

**4. Die Kommandozeile des Plugins als Vertrauensgrenze.** `formsService` startet das
`dist/cli.js`, das es im Plugin-Ordner des Projekts findet, unter Electrons Node. Relay-Geheimnisse
und eingefügte Schlüssel gehen dabei in die Umgebung des Kindprozesses. Die Regel dazu steht in
`conventions.md` („Was ein eigenes Plugin über eine Definition urteilt, fragt die App das
Plugin …“). Fragen dazu:

- Woher stammt dieser Code? Möglich sind eine `github:`-Quelle, ein lokaler Pfad oder ein Fork mit
  demselben Namen.
- Bekommt er je nur die Geheimnisse *dieses* Projekts?
- Was tut der Reiter mit einer Fassung des Plugins, die älter oder neuer ist als
  `FORMS_READ_AGAINST`, und mit einem Projekt, dessen Plugin 0.1.x ist?
- Das Relay wird in einen Ordner mit Rechten 0700 geschrieben, der „an jedem Ausgang“ entfernt
  wird. Stimmt das auch bei einem Absturz, bei `kill` und beim Beenden der App mitten im
  Hochladen?

**5. Das Hochladen des Relays über ein Veröffentlichungsziel.** `57a2fe67` arbeitet mit einem
eigenen Manifest und mit `deleteRemoved` aus. Ein rsync-Ziel mit „Gelöschte entfernen“ weist es
ab. Gemessen ist das nur an einem Ordner-Ziel mit `php -S`.

- Kann das Hochladen der Website das Relay löschen oder überschreiben, oder umgekehrt? Prüfe das
  für jeden Zieltyp, den die App kennt, auch für die, auf denen PHP nie laufen wird (GitHub
  Pages, `quartz sync`).
- Was wird beim zweiten Hochladen mit den Zählern und den verbrauchten Beweisen auf dem Server?
- Mit welchen Rechten kommt die `config.generated.php` an, die das Geheimnis trägt? Was steht in
  den READMEs zum Schutz der Verzeichnisse, und gilt das für nginx?

**6. Die Begegnung von 1.1 und 1.2 in einem Projekt.** Die Geheimnisse liegen in einer eigenen
Datei, `userData/relay-secrets.json`, damit 1.1 nach einem Downgrade keinen fremden Eintrag in
seinen Zugängen sieht. Das ist eine Begegnung der zwei Fassungen. Welche andere hat niemand
betrachtet? Kandidaten:

- 1.1.0 öffnet ein Projekt, in dem 1.2 Formulare mit `showIf` und `pageBreak` angelegt hat. Das
  generische Plugin-Formular von 1.1 liest dann das Schema von 0.4.0. Speichert es
  verlustfrei?
- `.quartz-gui/forms-relay.json` in einem Snapshot, einer Kopie oder einem Restore;
- ein Projekt, das dupliziert wird, nachdem das Relay hochgeladen ist.

**7. Die Abschriften im Reiter.** Abgeschrieben ist nur, was die Oberfläche vor jeder Antwort des
Plugins braucht (`formsOptions.ts`). `check:plugin-copies` hält es mit 48 Fällen gegen das
Plugin. Fragen dazu:

- **Deckt die Prüfung ab, was der Reiter schreibt,** oder nur, was er anbietet? Kandidaten:
  - `renameInConditions`;
  - `layout`, das beim Wechsel zu `select` wegfällt;
  - eine Bedingung, deren Steuerfeld gelöscht oder hinter das abhängige Feld geschoben wird;
  - Vorlagen, die beim Verlassen ihre Felder ins Formular schreiben.
- **Finde eine Config, die der Reiter schreibt und das Plugin ablehnt,** ohne dass der Reiter es
  vorher sagt.
- **Die Meldungen des Plugins** nennen `forms.<id>.fields[i]`. Seit 0.4.0 stehen in `fields` auch
  Seitenumbrüche. Hängt `placeMessage` eine Meldung noch an das richtige Feld, wenn davor ein
  Umbruch steht?

**8. Der Baukasten selbst.** Die Kennungen für dnd-kit sind `page:<n>`, wobei `n` die Umbrüche
zählt, und `name#i` bei doppelten Namen. Die Regel in `conventions.md` lautet „stabile Kennungen,
nie Listenindizes“. Was passiert dem offenen Feld, dem Sticky-State und der Drag-Ansage in diesen
Fällen?

- Ein Umbruch wird an einem anderen vorbeigezogen.
- Ein Umbruch wird gelöscht, während ein späterer offen ist.
- Ein Feld wird auf einen schon vergebenen Namen umbenannt.

**Einen Umbruch per Maus oder Tastatur zu ziehen, hat niemand gemessen**, nur die Pfeile. Der
Bedingungs-Editor und die Segmente sind nur in Chrome unter Playwright bedient worden.

**9. Die Formulare auf der Website.** Die Breiten folgen der Breite des Formulars, nicht der
Seite. Gemessen ist das in Chrome bei 640, 400 und 300 px und in der Seitenleiste. Fragen dazu:

- `8964f22` setzt `[hidden]` mit `!important` durch. Wo gilt das, und was trifft es außerhalb des
  Formulars?
- Was bekommt ein Browser ohne Container-Queries? Der Satz im README ist aus dem CSS abgeleitet,
  nicht gemessen.
- Bedienung nur mit Tastatur: Schritt vor und zurück, Fokus, Live-Region, die Fehlerliste über
  Schritte hinweg, der Sprung zum Schritt eines Fehlers, den das Relay meldet.
- Hell und dunkel, und ein Formular in einer schmalen Spalte neben dem Inhalt.

**10. Zwei Sprachen für die Meldungen.** Seit 0.3.0 kommen Meldungen als Code und Werte, der
Reiter fragt mit `--lang`. Fragen dazu:

- Sagt ein deutscher Satz dasselbe wie der englische, mit denselben Werten an der richtigen
  Stelle? `test/messages.test.ts` prüft nur, dass die Werte vorkommen.
- Hält sich der Reiter an das Vokabular von `conventions.md` dort, wo er Sätze des Plugins neben
  eigene stellt?

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was einem Absender oder Empfänger schaden kann

Abwägungen 1, 2 und 3: Klartext, wo Verschlüsselung versprochen ist; eine Nachricht ohne
Einwilligung; eine Mail, die verloren geht, ohne dass jemand es merkt.

### 2. Was dem Betreiber auf seinem Webspace schaden kann

Abwägungen 1 und 5: ein offener Mailer, ein volles Konto, ein gelöschtes Relay, ein Geheimnis,
das lesbar auf dem Server liegt.

### 3. Was QuartzControl falsch schreibt oder verliert

Abwägungen 4, 6 und 7.

### 4. Was anders aussieht oder sich anders bedient, als es ist

Abwägungen 8, 9 und 10.

## Wenn du misst

**Das Plugin:**

- Klone es in deinen Scratchpad: `git clone /Users/boxi/Development/quartz-forms <scratchpad>/qf`,
  dort `npm ci` und `npm run check`. Das sind Typen, Lint, Format und Tests mit der Relay-Suite.
- Die Relay-Suite braucht `php` im PATH. Homebrew-PHP 8.5 ist installiert.
- Starte `php -S` immer mit `-d opcache.enable=0`. Sonst liefert Opcache eine umgeschriebene
  `config.php` bis zu zwei Sekunden alt aus.
- Das Relay schickt sich selbst Anfragen, deshalb braucht `php -S` `PHP_CLI_SERVER_WORKERS=4`.
- Mail geht in eine Datei: `mailer => ['file' => <outbox>]`, wie in `test/relay.test.ts`.

**Im Browser:**

- Chrome über `playwright-core` mit `channel: 'chrome'`.
- Die Seite muss von `localhost` kommen, sonst fehlt `crypto.subtle`.
- Ein Kontext mit `javaScriptEnabled: false` braucht `{ force: true }` bei `click()`/`check()`.
- Nach einem Fokuswechsel rückt das Layout. Vor Klicks deshalb `blur()` und 300 ms warten.
- Prüfskripte öffnen keine `mailto:`-Links.
- Captcha nur mit den öffentlichen Testschlüsseln:
  - Turnstile: Site-Key `1x00000000000000000000AA`, Secret `1x0000000000000000000000000000000AA`;
  - hCaptcha: Site-Key `10000000-ffff-ffff-ffff-000000000001`, Secret `0x` gefolgt von 40
    Nullen.
- Testschlüssel für OpenPGP erzeugst du mit gpg in einem kurzen `GNUPGHOME` unter
  `$(getconf DARWIN_USER_TEMP_DIR)`. Im Scratchpad ist der Pfad für den Socket zu lang.

**Eine Website mit Formularen:**

- Kopiere gui-test: `cp -Rc ~/Documents/QuartzProjekte/gui-test <scratchpad>/gt`.
- `content/` ist dort ein echter Ordner (`gui-test-content` ist der Symlink darauf). Prüfe es in
  der Kopie mit `ls -la`, bevor du schreibst.
- quartz-forms ist in gui-test über den lokalen Pfad `/Users/boxi/Development/quartz-forms`
  eingetragen (`quartz.config.yaml`, `quartz.lock.json`). Richte die Kopie auf deinen Klon, bevor
  du baust oder Plugins anfasst.
- Gebaute Websites nur über einen eigenen Server auf `localhost` aufrufen.

**QuartzControl:**

- `npm run build`, dann die gebaute App mit einem **Wegwerf-Profil** (`--user-data-dir`). Wie man
  sie über Playwright fährt, zeigt der Skill `.claude/skills/run-desktop/`.
- `npm run smoke` legt sein Profil selbst an.
- Lies `docs/scripts.md`, bevor du ein Skript mit Optionen startest. `npm run check:plugin-copies
  -- <projekt>` läuft gegen deine Kopie von gui-test, wie alles andere.
- **Die Relay-Geheimnisse gehen durch `safeStorage`**, und das fragt auf macOS den Schlüsselbund.
  Löse keinen Schlüsselbund-Dialog aus. Ersetze `safeStorage` im Hauptprozess über
  `app.evaluate`, oder lass diesen Teil weg und nenne ihn als ungemessen.
- Ein Ziel zum Hochladen ist ein **Ordner-Ziel im Wegwerf-Profil**. Die echten Zugänge und Ziele
  dieses Rechners nicht anfassen und nicht abbilden.

Was nicht ohne neue Installation geht, wird nicht installiert, sondern als ungemessen genannt.
Dazu gehören Playwright-Browser für WebKit oder Firefox, nginx und ein SFTP-Server.

## Was offen bleibt, und nicht für diese Runde

Bekannt und gesammelt. Ein Befund dazu ist nur willkommen, wenn er schwerer wiegt als hier
gesagt.

- **Entschieden, nicht zu prüfen:**
  - Das Build-Log bleibt englisch.
  - Eine Bedingung je Feld.
  - Inaktive Werte werden verworfen, nicht abgelehnt.
  - Ohne JavaScript stehen alle Schritte untereinander.
  - Keine Datei-Anhänge.
  - Empfängeradressen stehen nur in der Config des Relays.
  - Das Plugin bleibt privat, bis 1.2 erscheint; Lizenz offen.
- **Ungemessen, aus den Runden davor:**
  - echter Mailversand;
  - Apache mit FPM und nginx;
  - SFTP und FTP an einen echten Host, Dateirechte dort;
  - Safari, Firefox und echte Telefone;
  - das Captcha-Widget nach einer SPA-Navigation im echten Browser.
- **Noch nicht gemacht:**
  - das Handbuch des Plugins und die Kapitel des Reiters im Benutzerhandbuch;
  - Demo-Formulare für die Screenshots.

  Dass der Reiter dort fehlt, ist kein Befund.
- `feat/1.2` ist nicht gepusht; `docs/reviews.md` kennt diese Runde noch nicht.

## Eine Frage über den Code hinaus

Getrennt von den Befunden, am Ende deines Dokuments:

**Kann quartz-forms mit 1.2 veröffentlicht werden?** Welche deiner Befunde müssen vorher behoben
sein, welche gehören in die README als Vorbehalt, welche können warten?

Und: **Ein Plugin, das an einem Tag entstand und zweimal vom selben Modell geprüft wurde, ist ein
Versuchsaufbau.** Was fällt dir als anderem Modell auf, das die zwei Reviews nicht gefunden haben?
Damit sind keine Befunde gemeint, sondern die Art der Fragen, die sie nicht gestellt haben. Und
hält der Grundsatz des Reiters, „das Plugin wird gefragt, nicht abgeschrieben“, mit seinen
Abschriften und deren Prüfskript?

## Form der Befunde

Schreibe `docs/REVIEW-2026-10-24.md` in QuartzControl.

**Je Befund:**

- das Repo und die Stelle (Datei, Funktion, Commit);
- was passiert und wie es sich zeigt;
- was dagegen spräche, es so zu lassen;
- und, wo du eine hast, eine Richtung.

Sortiere nach Gewicht, Hoch, Mittel und Niedrig, und sag je Befund, aus welchem Block oder
welcher Abwägung er kommt. Kennzeichne, was du gemessen hast, und sag womit. Was du nur gelesen
hast, kennzeichne als gelesen. Eine Behauptung dieses Auftrags, einer Commit-Nachricht oder eines
README, die nicht trägt, ist ein Befund wie jeder andere. Was dir nebenbei auffällt und kein
Befund ist, kommt in einen eigenen Abschnitt am Ende.

**Grenzen:**

- **Ändere nichts am Code und committe nichts.** Die einzige neue Datei im Repo ist dein Dokument.
- **In `/Users/boxi/Development/quartz-forms` nichts ändern**, auch keine Tests dort laufen
  lassen. Die Suite schreibt nach `test/.tmp/`, also laufen Tests nur im Klon.
- Schreibe in keinen Obsidian-Vault.
- In kein Projekt unter `~/Documents/QuartzProjekte/`. Kopien mit `cp -Rc` sind der Weg.
- Das Projekt `hinterland-history` nie lesen. Schließe es aus jeder Schleife und jedem Glob über
  Projekte vorher aus, nicht hinterher.
- **Löse keinen Schlüsselbund-Dialog aus.**
- Schicke keine Mail an eine echte Adresse.
- Gib Geheimnisse nie über argv weiter.
- **Veröffentliche nichts, deploye nichts und pushe nichts.**
