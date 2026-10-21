Du bist als zweites Paar Augen an QuartzControl, dessen Fassung `1.1.0` (2026-10-18) draußen ist.
Fixes für 1.1 entstehen auf `fix/1.1.x`, die nächste Fassung **1.2** auf `feat/1.2`. Es geht um ein
Review, nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Warum diese Runde

Das vierundfünfzigste Review (`docs/REVIEW-2026-10-29.md`) hat 1 Hoch, 6 Mittel, 8 Niedrig und
eine Nebenbei-Liste gefunden. Claude Opus 5.5 hat am 2026-10-21 alles davon abgearbeitet, dazu drei
neue Punkte, und quartz-forms 0.5.11 veröffentlicht: gut dreißig Commits in QuartzControl, drei in
quartz-forms, einer davon auf der Fix-Linie. **Diese Fixes hat kein Review gelesen.** Jede Messung
in den Commit-Nachrichten, in `docs/reviews.md`, in `docs/decisions/publishing-and-credentials.md`
und in diesem Auftrag hat dasselbe Modell erhoben, ausgewertet und aufgeschrieben, das auch die
Fixes geschrieben hat. **Nimm nichts als gemessen hin, nur weil es so dasteht**, und prüf
besonders, ob ein Fix den Befund wirklich trifft oder nur die eine Szene, an der er gemessen wurde.

Drei Änderungen greifen über das Relay hinaus. Ihr Gewicht ist entsprechend größer:

- `5dcfb3f6` (Fix-Linie) setzt einmal je SFTP-Ziel **jede früher hochgeladene Datei jeder
  Website** auf 0644.
- `131b92cb` lehnt Zeichen der Shell im Remote-Pfad **jedes rsync-Ziels** ab, also auch Ziele, die
  mit 1.1.0 funktioniert haben.
- `4cdced36` wiederholt einen gescheiterten rsync-Lauf mit `--rsync-path="mkdir -p … && rsync"`,
  also mit einem Befehl für die Shell des Servers.

In der Zählung von `CLAUDE.md` ist das das **fünfundfünfzigste** Review.

## Das Projekt

**QuartzControl:** Electron + React + TypeScript, `/Users/boxi/Development/QuartzControl`.

- Lies zuerst `CLAUDE.md` **und `docs/conventions.md`**, das sie einbindet. Die Begründungen der
  Regeln stehen in `docs/decisions/conventions-full.md`. Für diese Runde besonders: die Regel „Was
  die App auf einen Server lädt, bekommt seinen Modus von der App …“ (in dieser Runde zweimal
  geändert), „Alles, was Main aus Projektdateien liest und an Prozesse gibt, ist mit `--`
  getrennt …“, „Zwei Arten zu scheitern bekommen zwei Antworten“, „Ein fremder Dienst, der nicht
  scheitert, hat nicht unbedingt geliefert“, „Kann nicht prüfen ist nie alles gut“ und „Was ohne
  Zutun erscheint, wird angesagt“.
- Lies das vorige Review samt Auftrag (`docs/REVIEW-2026-10-29.md`, `…-auftrag.md`) und in
  `docs/reviews.md` den Abschnitt „Das vierundfünfzigste Review“. Dort steht, welcher Commit
  welchen Befund beheben soll.
- In `docs/decisions/publishing-and-credentials.md` die Absätze vom 2026-10-21 am Ende.
- quartz-forms liegt unter `/Users/boxi/Development/quartz-forms` (installiert und veröffentlicht:
  0.5.11). Für diese Runde zählen `relay/php/send.php` (das Ticket auf `GET ?challenge=`, die
  Schlüssel `counters` und `generation`, `counters/qf-probe.count`), `relay/php/README.md` und
  `src/cli.ts` (`relay`), weil `formsService.ts` es so aufruft.

## Umfang

    git log --oneline review-2026-10-29..2dc10a52          # feat/1.2
    git diff review-2026-10-29..2dc10a52 -- electron src shared
    git show 5dcfb3f6                                      # fix/1.1.x, gemergt mit 172e61ba
    git -C /Users/boxi/Development/quartz-forms log --oneline v0.5.10..v0.5.11

Code: 20 Dateien (+581 / −108). Dazu Doku: `docs/conventions.md`,
`docs/decisions/conventions-full.md`, `docs/decisions/publishing-and-credentials.md`. quartz-forms:
15 Dateien (+166 / −35).

Die Zuordnung Befund → Commit steht in `docs/reviews.md`. Kurz:

- **Aus dem 54. Review:**
  - H1 `922c3adf`
  - M1 quartz-forms `88352a8` und `59b77701`
  - M2 `3d1bd55d`
  - M3 quartz-forms `df007c1` und `9600308e`
  - M4 `ab046463`
  - M5 `72f74b2a`
  - M6 `5dcfb3f6` (Fix-Linie)
  - N1 quartz-forms `606a31c` und `aa11091a`
  - N2 `68f0dc8f`, N3 `153d5ec7`, N4 `572611ee`, N5 `0dfb85e6`, N6 `ae20e646`, N7 `5afd124d`,
    N8 `43e800d1`
- **Nebenbei:** `4cdced36`, `a2bcef12`, `fc9f8357`, `893bfa2f`, `edd43620`, `d670c6ed`, `e3184875`,
  `7a45caec`, `0072bc0e`, `ddeaaedf`, `c49faf5c`, `a5df184c`
- **Danach:** `1e072f79`, `131b92cb`, `63486f26`, `19ca4f93`

## Abwägungen, die niemand gegengelesen hat

**1. Der einmalige chmod je SFTP-Ziel (`5dcfb3f6`, Fix-Linie).**

- Er trifft jede Datei im Manifest, die in diesem Lauf nicht übertragen wird. Was geschieht mit
  Dateien, die der Nutzer auf dem Server absichtlich anders gesetzt hat: ein CGI-Skript mit 0755,
  eine Datei mit 0600, eine, die ein CMS daneben pflegt? Und mit Pfaden im Manifest, die auf dem
  Server inzwischen ein Symlink oder ein Ordner sind?
- Wann gilt ein Ziel als „erledigt“ (`deploy-manifest-<id>.modes.json`, `modesSettled`,
  `settleModes`)? Prüf dabei:
  - Läuft der chmod erneut oder gar nicht bei einem geänderten `remotePath`, bei „Alles neu
    hochladen“, bei einem kopierten Projekt (`duplicateService`), bei einem Snapshot-Restore?
  - Wird der Marker auch geschrieben, wenn der Lauf danach scheitert oder abgebrochen wird?
  - Lernen `isSnapshotWorthy()` und `SKIP` die neue Datei?
- Acht `chmod` zugleich auf einem Kanal: Hält das ein langsamer oder ein strenger Server aus
  (`MaxSessions`, Ratenlimits)? Wie verhalten sich die Listener-Warnungen, die der Kommentar
  nennt?
- Sagen die Ausgabezeilen `sftpModesSettled`/`sftpModesRefused` die Wahrheit, auch wenn ein Teil
  scheitert? Und ist ein solcher Eingriff auf einer Fix-Linie richtig aufgehoben?

**2. rsync: abgelehnte Zeichen und der zweite Lauf (`131b92cb`, `4cdced36`).**

- `SHELL_SPECIAL` lehnt `'"\$`;&|<>(){}[]*?!#` ab, „~“ bewusst nicht. Sind Pfade mit diesen
  Zeichen bei Hostern üblich, sodass ein mit 1.1.0 funktionierendes Ziel jetzt abgewiesen wird?
  Wo wird abgewiesen: beim Speichern des Ziels oder erst beim Upload? Und sagt die Oberfläche es
  früh genug?
- Ist die Liste vollständig? Denk an Zeilenumbrüche, Steuerzeichen, Unicode-Leerraum, ein `~` mitten
  im Pfad und einen führenden `-`. Wie verhält sich das alles mit openrsync (macOS
  `/usr/bin/rsync`) und mit rsync ≥ 3.2.4 (`--protect-args` bzw. eigenes Escaping)?
- `--rsync-path="mkdir -p … && rsync"`:
  - Wie ist der Pfad darin gequotet, und kann ein Pfad, der durch `SHELL_SPECIAL` kommt, dort
    trotzdem etwas ausführen?
  - Wann genau wird wiederholt? Kann der zweite Lauf etwas anlegen, das der Nutzer nicht wollte,
    etwa einen Tippfehler im Pfad als neuen Ordnerbaum?
  - Was geschieht hinter `rrsync` oder einer Shell, die `&&` nicht kennt?

**3. Das Relay über drei Wege, jedes Mal ganz (`3d1bd55d`, `922c3adf`, `a5df184c`, `1e072f79`).**

- Seit M2 vergisst `runDirectoryUpload` das Manifest des Relays vor jedem Lauf. Was bedeutet das
  für `deleteRemoved`, für Dateien, die eine ältere Fassung des Relays hinterlassen hat, und für
  die Zähler und das Spent-Verzeichnis auf dem Server? Können die gelöscht oder überschrieben
  werden?
- `relaySubdir` weist „.“, „..“ und leer ab. Kommt man über Schema, Feld, alte Einstellungen,
  `\`, `./x/..`, einen absoluten Pfad oder einen Symlink auf dem Server trotzdem in den Zielordner
  selbst oder darüber?
- Das Ordner-Ziel setzt jetzt Ordnermodi. Welche Ordner genau, auch den Zielordner selbst?
- `modeUnchecked`: Ein Server, der `stat` ablehnt, bekommt je Datei eine Zeile. Wird das bei einem
  großen Relay zu viel Ausgabe?

**4. Was die Abfrage nach dem Upload jetzt unterscheidet (`formsService.ts`, `checkRelay`).**

- Aus wenigen Antworten sind viele geworden:
  - `ok` und `otherRelay` (über `generation`)
  - `noPhp`, `phpCannotRead`, `phpMessage`, `phpError`
  - 403, 502 bis 504 und `http`
  - `postRedirect` und die Weiterleitung auf eine fremde Origin
  - Zertifikat, `relayCheckNoRoute`, die übrigen Chromium-Codes, die Frist von 10 s und die
    Grenze von 64 KiB

  Prüf die Reihenfolge der Bedingungen. Gibt es eine Antwort echter Hoster, die in die falsche
  Schublade fällt? Wird irgendwo aus „konnte nicht prüfen“ ein „ok“?
- `phpMessage` zeigt Text, den der Server geschickt hat, in der Oberfläche. Wie viel davon, wie
  bereinigt, und kann er Pfade, Secrets oder Markup zeigen, die dort nicht hingehören?
- `a2bcef12`: Gefragt wird das erste Relay-Formular unter **seiner** Adresse. Kann das ein Host
  sein, der mit dem eben hochgeladenen Relay nichts zu tun hat (ein fremder Dienst)? Dann ginge
  nach jedem Upload eine Anfrage dorthin. Was sagt `otherRelay` in diesem Fall?
- `generation`: Woher kommt sie (quartz-forms `606a31c`), und was, wenn ein Relay vor 0.5.11
  antwortet, das sie nicht kennt?

**5. Was das Relay jetzt preisgibt (quartz-forms 0.5.11).**

- Das Ticket auf `GET ?challenge=` sagt jetzt `counters` und `generation`, an jeden, der fragt. Ist
  das eine Information, die ein Angreifer nutzen kann, etwa um ein Relay ohne funktionierende
  Zähler (also ohne Ratenlimit?) zu erkennen?
- `counters/qf-probe.count` wird mit ausgeliefert. Sagt seine Abfrage zuverlässig, ob die
  wirklichen Zähldateien lesbar sind (`.htaccess`, nginx-`location`, Endungen)? Kann die Probe
  selbst etwas verraten?
- `README`, `CHANGELOG` und die Tests von quartz-forms gegen den Code von send.php.

**6. Status, Stempel und neues Secret (`e3184875`, `7a45caec`).**

- `operatorOf()` und ein HMAC-Fingerabdruck der Geheimnisse „ohne Entschlüsseln“:
  - Womit ist der HMAC verschlüsselt, wo liegt der Fingerabdruck, und lässt er Rückschlüsse auf
    das Secret oder die Empfänger zu?
  - Wird „aktuell“ falsch gemeldet, wenn sich nur ein Geheimnis ändert?
- „Neues Secret erzeugen“ (`renewSecret`):
  - Was passiert mit Formularen, die gerade mit dem alten Secret offen sind?
  - Was passiert, solange das neue Relay nicht hochgeladen ist?
  - Weiß der Nutzer, dass er hochladen muss? Und ist der Bestätigungsdialog richtig
    (`confirmDialog`, sichere Antwort zuerst)?

**7. Die Oberfläche (`FormsRelay.tsx`, `Forms.tsx`, Sprachdateien, `electron/main/i18n.ts`).**

- Eine Live-Region für Upload und Abfrage (`893bfa2f`; gemessen nur mit einem MutationObserver).
  Wird jeder Satz einmal angesagt, und verschwindet er, wenn er nicht mehr stimmt (anderes Projekt,
  Schalter umgelegt, neuer Upload)?
- M4: Satz und Button richten sich nach dem hochgeladenen Modus, der Button lädt gleich neu hoch.
  Was, wenn die Seite `dirty` ist?
- Hinweise höchstens zwei Sätze, „QuartzControl“ statt „die App“, „konnte nicht … werden“, de und
  en gleich. Prüf auch die Main-Texte in `electron/main/i18n.ts`.

**8. Die Doku.** Halten die geänderte Regel in `docs/conventions.md`, ihre Langfassung und die
neuen Absätze in `decisions/` dem Code stand? Stimmen diese Zahlen, soweit du sie nachmessen
kannst:

- 474 von 475 Dateien auf 0666, 3,9 s statt 23 s
- 22,0 s → 12,5 s
- „q$HOME“ lud nach `q/home/qchost/`

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was auf dem Server des Nutzers etwas falsch setzt, löscht oder ausführt

Abwägungen 1, 2 und 3.

### 2. Was Absendern, Empfängern oder dem Betreiber schaden kann

Abwägungen 4 (Anfragen an fremde Hosts, Text des Servers in der Oberfläche), 5 und 6.

### 3. Was QuartzControl falsch sagt

Abwägungen 4, 6 und 7: ein „ok“, das keines ist, ein Fehler, der keiner ist, ein Satz, der
stehen bleibt.

### 4. Was in der Doku nicht stimmt

Abwägung 8.

## Wenn du misst

Ändere nichts in diesem Repo, in quartz-forms, in einem Vault oder in einem Projekt unter
`~/Documents/QuartzProjekte`. Arbeite in Kopien in deinem Ordner `<scratchpad>/review-55/`.

- **Lies nie etwas aus einem Projekt oder Vault namens `HinterlandHistory`/`hinterland-history`**,
  auch nicht in einer Schleife oder einem `grep` über alle Projekte.
- **Keine Anfrage an einen Host außerhalb dieses Rechners und der VM.** Das Relay verschickt nichts
  nach außen, und so soll es bleiben.

**Die VM als Hoster:** `ssh debian-vm` (Hostname aus Sicht des Mac `debian.local`). Die
Einrichtung steht in
`/Users/boxi/.claude/projects/-Users-boxi-Development-QuartzControl/memory/reference_relay_vm_harness.md`:

- Account `qchost`, Webroot `/srv/qc/www`
- Apache `:8441` (mod_php, `www-data`) und `:8442` (FPM-Pool `qchost`)
- nginx `:8443` (FPM `www-data`), `:8444` (Pool `qchost`), `:8445` (`try_files`-Rückfall), `:8446`
  (`.ht` gesperrt)
- Account `qcsftp` mit SFTP ohne Modus-Änderung (`/srv/qc/www/nochmod`)
- vsftpd, Postfix nur lokal, `nft` unter `/usr/sbin/nft`

Der SSH-Schlüssel für beide Accounts und das FTP-Passwort liegen unter
`/private/tmp/claude-501/-Users-boxi-Development-QuartzControl/62a1ddd0-2d6c-4d64-bf4d-7fd46d34609e/scratchpad/relaytest/`
(`qchost_key`, `ftp_password`). Dort liegt auch das Messgeschirr der letzten Runde:

- `app.mjs` und `h1.mjs` (Schritte `upload rsync <subdir>`, `urls <url…>`, `urlui <url>`)
- `m6.mjs` und `attrappe.mjs` (ein Server auf 127.0.0.1, der jede Antwort spielen kann)
- `site/`, eine Kopie von gui-test mit drei Formularen
- unter `../modenote/` ein esbuild-Bündel mit Stub-Client

**Lies es, aber ändere es nicht**; kopier, was du brauchst.

- Lade nur in eigene Unterordner unter `/srv/qc/www/review55-*` bzw.
  `/srv/qc/www/nochmod/review55-*` und räum sie am Ende weg, ebenso Mails, die deine Messungen in
  `/var/mail/boxi` oder `/var/mail/qchost` hinterlassen.
- Änderungen an Diensten der VM (vsftpd, nginx, Apache, PHP, sshd, nft) nur, wenn du sie am Ende
  zurückstellst. Sag im Bericht, was du geändert hattest. `sudo` geht ohne Passwort.

**Die App:**

- `git clone /Users/boxi/Development/QuartzControl <scratchpad>/review-55/qc`, dort `git checkout
  feat/1.2`, `npm ci`, `npm run build`. Für den Fix-Linien-Commit allein: ein zweiter Klon auf
  `fix/1.1.x`.
- Starten mit `_electron.launch` aus `playwright-core` und einem eigenen `--user-data-dir` im
  Scratchpad, **nie mit dem echten Profil**; für das Snakeoil-Zertifikat der VM
  `--ignore-certificate-errors`. Die Muster stehen in `.claude/skills/run-desktop/SKILL.md`.
- Das Projekt ist eine eigene Kopie (`cp -Rc` von `relaytest/site`), deren
  `.quartz/plugins/quartz-forms` auf `/Users/boxi/Development/quartz-forms` zeigt oder auf einen
  Klon davon. Ist `content` ein Symlink, schreib nichts darunter.
- `npm run typecheck`, `npm run smoke` und `npm run check:i18n` im Klon; in quartz-forms (Klon)
  `npm run check`.

**Im Browser** (falls du eine Website gegen das Relay schickst):

- Chrome über `playwright-core` mit `channel: 'chrome'` und `ignoreHTTPSErrors`.
- Prüfskripte öffnen keine `mailto:`-Links.
- Testschlüssel für OpenPGP mit gpg in einem kurzen `GNUPGHOME` unter
  `$(getconf DARWIN_USER_TEMP_DIR)`. Räum die Ordner am Ende weg und beende ihre Agenten.

## Was du ablieferst

Einen Bericht auf Deutsch in `<scratchpad>/review-55/review.md`:

- Befunde nach Gewicht (Hoch, Mittel, Niedrig), je mit Ort, Szenario, Beleg (gemessen oder gelesen,
  und womit) und einem Vorschlag.
- Getrennt davon eine Liste „Nebenbei“ für Kleinigkeiten.
- Eine Tabelle: Befund des 54. Reviews → trifft der Fix ihn ganz, teilweise oder nicht?
- Am Ende ein Urteil:
  - ob die Änderungen so mit 1.2 veröffentlicht werden können;
  - ob `5dcfb3f6` mit dem nächsten 1.1.x veröffentlicht werden kann;
  - was vorher geschehen muss.

Kennzeichne bei jedem Befund, ob du ihn gemessen oder nur gelesen hast.
