Du bist als zweites Paar Augen an QuartzControl, dessen Fassung `1.1.0` (2026-10-18) draußen ist.
Fixes für 1.1 entstehen auf `fix/1.1.x`, die nächste Fassung **1.2** auf `feat/1.2`. Es geht um ein
Review, nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Warum diese Runde

Das fünfundfünfzigste Review (`docs/REVIEW-2026-10-30.md`) hat 0 Hoch, 3 Mittel, 7 Niedrig und eine
Nebenbei-Liste mit neun Punkten gefunden. Claude Opus 5.5 hat am 2026-10-21 alles davon abgearbeitet
bis auf zwei Nebenbei-Punkte, die nur nie veröffentlichte Fassungen von quartz-forms betreffen. Dazu
kamen vier neue Punkte, und quartz-forms 0.5.12 bis 0.5.14 wurden veröffentlicht. Das sind 22
Commits mit Code in QuartzControl, fünf davon auf der Fix-Linie, und acht in quartz-forms. **Diese
Fixes hat kein Review gelesen.**

Jede Messung in den Commit-Nachrichten, in `docs/reviews.md`, in
`docs/decisions/publishing-and-credentials.md` und in diesem Auftrag stammt von demselben Modell,
das auch die Fixes geschrieben hat. Es hat sie erhoben, ausgewertet und aufgeschrieben. **Nimm
nichts als gemessen hin, nur weil es so dasteht.** Prüf besonders, ob ein Fix den Befund wirklich
trifft oder nur die eine Szene, an der er gemessen wurde.

Mehrere Änderungen greifen über das Relay hinaus auf **jede Veröffentlichung einer Website**. Ihr
Gewicht ist entsprechend größer:

- `aecbb8a8` (Fix-Linie) gibt jeder SSH-Verbindung, über SFTP wie über rsync, Keepalives: 15 s
  Abstand, nach drei unbeantworteten endet die Verbindung.
- `8a9061ac` (Fix-Linie) lehnt `~` und `~user` als ganzen Remote-Pfad ab, beim Speichern, im
  Formular und beim Veröffentlichen. Das trifft auch Ziele, die mit 1.1.0 gespeichert wurden.
- `b08e2ddc` (Fix-Linie) zählt den einmaligen chmod-Durchgang in den Fortschritt.
- `bd023df3` legt über SFTP und FTP keine Ordner über dem Ordner eines Ziels mehr an und lehnt den
  Upload ab, wenn der Elternordner fehlt. Über FTP geschieht das mit `pwd` und `cd`.
- `b83d4a99` ändert, wie rsync den Remote-Pfad schreibt: `./-…` für einen führenden `-`, und
  `~user/` außerhalb der Anführungszeichen.

Auf der Fix-Linie liegen außerdem M1 `5ff41a5c` und M2 `4dc57dcc` aus dem 55. Review. Sie gehen
mit dem nächsten 1.1.x hinaus.

In der Zählung von `CLAUDE.md` ist das das **sechsundfünfzigste** Review.

## Das Projekt

**QuartzControl:** Electron + React + TypeScript, `/Users/boxi/Development/QuartzControl`.

- Lies zuerst `CLAUDE.md` **und `docs/conventions.md`**, das sie einbindet. Die Begründungen der
  Regeln stehen in `docs/decisions/conventions-full.md`. Für diese Runde zählen besonders diese
  Regeln:
  - „Was die App auf einen Server lädt, bekommt seinen Modus von der App …“. Sie ist in dieser Runde
    wieder um mehrere Sätze gewachsen: „~“, Symlink, 45 s, Weiterleitung, gekürzter Text.
  - „Zwei Arten zu scheitern bekommen zwei Antworten“
  - „Ein fremder Dienst, der nicht scheitert, hat nicht unbedingt geliefert“
  - „Kann nicht prüfen ist nie alles gut“
  - „Was ohne Zutun erscheint, wird angesagt“
  - „Ein Symlink-Schutz prüft jedes Segment …“
- Lies das vorige Review samt Auftrag (`docs/REVIEW-2026-10-30.md`, `…-auftrag.md`) und in
  `docs/reviews.md` den Abschnitt „Das fünfundfünfzigste Review“ samt Nachtrag. Dort steht, welcher
  Commit welchen Befund beheben soll und was gelassen wurde.
- Lies in `docs/decisions/publishing-and-credentials.md` die Absätze vom 2026-10-21 am Ende.
- quartz-forms liegt unter `/Users/boxi/Development/quartz-forms` (installiert und veröffentlicht:
  0.5.14). Für diese Runde zählen:
  - `relay/php/send.php`: OPcache vor dem Laden der Config, `counters` und `generation` nur für
    den, der die `generation` nennt;
  - `src/scripts/forms.inline.ts`: der zweite Versuch nach einem abgelehnten Proof of Work;
  - `test/relay.test.ts` (mit OPcache) und `test/client.test.ts`.

## Umfang

    git log --oneline review-2026-10-30..66f1d646                 # feat/1.2
    git diff review-2026-10-30..66f1d646 -- electron src shared
    git log --oneline 5dcfb3f6..8a9061ac                          # fix/1.1.x
    git diff 5dcfb3f6..8a9061ac
    git -C /Users/boxi/Development/quartz-forms log --oneline v0.5.11..v0.5.14

Der Code umfasst 14 Dateien (+352 / −78), die Fix-Linie davon 6 Dateien (+105 / −18). Dazu kommt
die Doku: `docs/conventions.md`, `docs/decisions/conventions-full.md`,
`docs/decisions/publishing-and-credentials.md` und `docs/reviews.md`. In quartz-forms ändern sich
10 Dateien ohne `dist/` (+226 / −39). `dist/` ist eingecheckt, und die CI prüft, ob es einem
frischen Bau gleicht.

Die Zuordnung Befund → Commit steht in `docs/reviews.md`:

- **Aus dem 55. Review:**
  - M1 `5ff41a5c` und M2 `4dc57dcc` (beide Fix-Linie, gemergt mit `03642926`)
  - M3 quartz-forms `3b9de40` und `4aedb726`
  - N1 `e4809fee`
  - N2 quartz-forms `992dbc4` und `26f64b44`
  - N3 `0698c0a1`, N4 `bb10c942`, N5 `a20034f8`, N6 `73492ed3`, N7 `3ec468f2`
- **Nebenbei:**
  - `f1f0e46b`, `b4941b47`, `d6df466f`, `b99ca7b2`, `1706a3eb`, `b83d4a99`
  - auf der Fix-Linie `b08e2ddc`, `aecbb8a8`, `8a9061ac`, gemergt mit `02b94496` und `2d34ab19`
- **Neu:**
  - `b908f8fc` und `bd023df3`
  - quartz-forms `90cdc53` und `da3dfb0` (0.5.14, `e0ca971`, `dist/` in `5377564`)
  - `e19385bf`
- **Bewusst gelassen:**
  - Ein Relay vor 0.5.11 sagt nichts zu den Zählern.
  - Liegengebliebene Dateien einer älteren Relay-Fassung.
  - `validate_timestamps=0` vor 0.5.12.
  - Ein Projekt mit 0.5.11.
  - Offen, nicht behoben: Ein relativer FTP-Pfad scheitert auf einem Server, der das Login nicht
    einsperrt, mit 553.

Prüf auch, ob die Begründung für das Lassen trägt.

## Abwägungen, die niemand gegengelesen hat

**1. Keepalives für jede SSH-Verbindung (`aecbb8a8`, Fix-Linie).**

- `SSH_KEEPALIVE_MS` und `SSH_KEEPALIVE_COUNT` in `sftp.ts`, `ServerAliveInterval` und
  `ServerAliveCountMax` im ssh-Aufruf von `rsync.ts`. Kann ein Upload, der richtig läuft, nach 45 s
  abgebrochen werden? Denk an:
  - eine große Datei auf langsamer Leitung,
  - einen Server unter Last,
  - einen Server, der Keepalive-Anfragen nicht beantwortet (manche SFTP-Server, Windows OpenSSH,
    Hoster mit eigener sshd).
- Was geschieht mit dem Manifest und dem chmod-Marker, wenn die Verbindung so endet? Und was sagt
  die Oberfläche (`sshSilent`)?
- Gemessen wurde mit SIGSTOP auf die Sitzung. Trifft das, was in Wirklichkeit hängt (WLAN weg,
  Laptop zugeklappt, NAT-Timeout)?

**2. Pfade (`8a9061ac`, `b83d4a99`, `bd023df3`, `shared/remotePath.ts`).**

- `remotePathProblem` behandelt ein erstes Segment `~` oder `~user` als Wurzel.
  - Was ist mit `~/.`, `~//`, `~user/./`, `~+`, `~-` und `~` mitten im Pfad?
  - Was ist mit Ordnern, die wirklich `~alt` heißen?
  - Über SFTP und FTP ist „~“ ein Ordner dieses Namens. Wird dort etwas abgelehnt, das richtig
    lief?
  - Wo greift die Ablehnung für ein mit 1.1.0 gespeichertes Ziel, und sagt die Oberfläche, was
    zu tun ist?
- rsync: `remoteShellPath` lässt `~…/` außerhalb der Anführungszeichen, `remoteSpec` setzt `./`
  vor einen führenden `-`.
  - Kann ein Pfad, der durch `SHELL_SPECIAL` kommt, über den unquotierten Teil doch etwas
    ausführen? `[A-Za-z0-9._-]` nach `~` …
  - Prüf das unter openrsync (macOS `/usr/bin/rsync`) und unter rsync 3.x.
- Der Elternordner über SFTP (`client.exists(parent)`) und FTP (`pwd`, `cd(parent)`, `cd(start)`):
  - Wird ein Ziel abgelehnt, das richtig lief? Etwa eines, dessen Elternordner nicht gelistet
    werden darf, ein chroot oder ein `remotePath` ohne `/`.
  - Was, wenn `cd(start)` scheitert?
  - Wie verträgt sich das mit dem offenen 553-Fehler bei relativen FTP-Pfaden (`client.cd('/')`
    nach jedem `ensureDir`)? Ist der 553-Fehler wirklich so, wie `docs/reviews.md` ihn beschreibt,
    und hängt er mit dem neuen Code zusammen?
- `makeContext` wirft `deployWholeRoot`. Erreicht das Vorschau und Veröffentlichen gleichermaßen?

**3. Das Relay in einem Symlink-Ordner (`b99ca7b2`).**

- SFTP fragt mit `lstat`, FTP über `list(dirname)` und `isSymbolicLink`, rsync über einen eigenen
  `--list-only`-Lauf vor dem Plan.
  - Ist der zusätzliche rsync-Lauf mit dem Handshake-Budget vereinbar
    (`publishing-and-credentials.md`)?
  - Was sagt ein Server, dessen LIST keine Symlinks kennt, und was geschieht, wenn die Abfrage
    scheitert?
  - Ist nur das letzte Segment geprüft? Ein Symlink weiter oben, etwa `relay` → `.` unter einem
    Unterordner `a/b`, würde nicht erkannt. Gilt die Regel „jedes Segment“?
  - Kann zwischen Prüfung und Upload getauscht werden, und ist das hier relevant?

**4. Der chmod-Durchgang auf der Fix-Linie (`5ff41a5c`, `4dc57dcc`, `b08e2ddc`).**

- Ist er jetzt mit dem nächsten 1.1.x veröffentlichbar? Das Urteil des 55. Reviews nannte
  Bedingungen. Prüf, ob M1 und M2 sie erfüllen.
- Stimmen der Fortschritt (`total` mit den `earlier` Pfaden) und die Zeilen `sftpModesSettled`,
  `sftpModesRefused` und `sftpModesProgress`, auch bei einem Abbruch mitten im Durchgang?
- Im Merge `02b94496` steht `!ctx.keepLocalModes` in `settle`. Ist der Konflikt richtig gelöst?

**5. Die Abfrage des Relays (`formsService.ts`: `getWithOrigin`, `checkRelay`, `localHost`).**

- Weiterleitung von draußen auf eine lokale Adresse: `localHost` prüft den Hostnamen der
  Weiterleitung.
  - Was ist mit einem Namen, der auf `127.0.0.1` oder ins LAN auflöst (DNS), mit `0.0.0.0`, mit
    IPv4-in-IPv6 (`::ffff:127.0.0.1`), mit dezimalen oder oktalen IPv4-Formen und mit `.local`?
  - Und was ist mit einer Abfrage, deren erste Adresse schon lokal ist?
  - Ist das bewusst so, und ist die Grenze richtig gezogen?
- Die Reihenfolge der Bedingungen in `checkRelay` mit den neuen Fällen 401, 429, 520 bis 527, 530
  und 307/308 in derselben Origin:
  - Fällt eine Antwort echter Hoster in die falsche Schublade?
  - Wird irgendwo aus „konnte nicht prüfen“ ein „ok“?
- `relayError` ist auf 80 bzw. 300 Zeichen gekürzt. Kann noch Markup, ein Pfad oder ein Secret in
  die Oberfläche gelangen? Und schneidet die Kürzung ein Surrogatpaar entzwei?
- N1 (`e4809fee`): Eine Weiterleitung wird nur noch empfohlen, wo ein Relay antwortet. Fragt die
  App dafür einen weiteren Host? Und gilt die Regel „keine Anfrage an einen fremden Dienst“?
- N7 (`3ec468f2`): Wann ist eine Antwort jetzt `phpMessage`? Prüf das gegen echte PHP-Fehlerseiten
  (`display_errors` an, `html_errors` an und aus, FPM, mod_php).

**6. quartz-forms 0.5.12 bis 0.5.14.**

- OPcache (`3b9de40`): `opcache_invalidate` bzw. die Zeitstempel-Frage vor dem Laden der Config.
  - Was kostet das je Anfrage?
  - Was geschieht ohne OPcache, mit `opcache.restrict_api` und mit `validate_timestamps=0`?
  - Die Tests laufen jetzt mit `opcache.enable=1` (`90cdc53`). Messen sie, was sie messen sollen?
    Ohne die Fix-Zeilen gab es angeblich 6 Fehlschläge.
- `counters` und `generation` nur für den, der die `generation` nennt (`992dbc4`):
  - Lässt sich die `generation` erraten, oder steht sie öffentlich in der Website?
  - Ist N2 damit wirklich behoben?
- Der zweite Versuch nach einem abgelehnten Proof of Work (`da3dfb0`):
  - Kann er in eine Schleife geraten?
  - Erzeugt er bei einem Angreifer-Relay oder einem kaputten Ticket zusätzliche Last?
  - Sieht der Besucher, was passiert?
  - Was, wenn sich die Challenge nicht ändert?
  - Gemessen wurde nur in den Client-Tests, nicht im Browser.
- README, CHANGELOG und die Tests gegen den Code.

**7. Die Oberfläche (`FormsRelay.tsx`, `Publish/index.tsx`, Sprachdateien, `electron/main/i18n.ts`).**

- Der Button steht jetzt nach der `role="status"`-Region, und `failedAnnounce` sagt einen
  Fehlschlag in einer Zeile an. Wird jeder Satz einmal angesagt? Verschwindet er, wenn er nicht
  mehr stimmt? Und was, wenn die Ausgabe mehrere Zeilen hat?
- Die neuen Sätze: `checkHttpAuth`, `checkHttpRate`, `checkHttpCdn`, `checkRedirectLocal`,
  `checkRelaySecret`, `sshSilent`, `deployWholeRoot`, `relayDirSymlink`, `deployParentMissing` und
  `sftpModesProgress`. Prüf an ihnen:
  - höchstens zwei Sätze, „QuartzControl“ statt „die App“, „konnte nicht … werden“;
  - ob de und en dasselbe sagen;
  - ob ein Satz einen Ausweg nennt, den es gibt.

**8. Die Doku.** Halten die gewachsene Regel in `docs/conventions.md`, ihre Langfassung und die
neuen Absätze in `decisions/` dem Code stand? Stimmen diese Zahlen, soweit du sie nachmessen
kannst:

- 0 → 475 Fortschrittsereignisse;
- SFTP endet 50 s, rsync 60 s nach dem Signal;
- 65 065 → 445 Zeichen;
- 989 Löschungen im Home bei „~“;
- 475 angelegte Dateien bei vertipptem Pfad;
- 8 von 16 → 0 von 16 `otherRelay`.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was auf dem Server des Nutzers etwas falsch setzt, löscht oder ausführt, und was eine Website-Veröffentlichung bricht, die mit 1.1.0 lief

Abwägungen 1, 2, 3 und 4. Die Fix-Linie zuerst: Sie geht als Nächstes hinaus.

### 2. Was Absendern, Empfängern oder dem Betreiber schaden kann

Abwägungen 5 (Anfragen an fremde oder lokale Hosts, Text des Servers in der Oberfläche) und 6.

### 3. Was QuartzControl falsch sagt

Abwägungen 5 und 7: ein „ok“, das keines ist, ein Fehler, der keiner ist, ein Satz, der stehen
bleibt.

### 4. Was in der Doku nicht stimmt

Abwägung 8.

## Wenn du misst

Ändere nichts in diesem Repo, in quartz-forms, in einem Vault oder in einem Projekt unter
`~/Documents/QuartzProjekte`. Arbeite in Kopien in deinem Ordner `<scratchpad>/review-56/`.

- **Lies nie etwas aus einem Projekt oder Vault namens `HinterlandHistory`/`hinterland-history`**,
  auch nicht in einer Schleife oder einem `grep` über alle Projekte.
- **Keine Anfrage an einen Host außerhalb dieses Rechners und der VM.** Das Relay verschickt nichts
  nach außen, und so soll es bleiben.
- Hat die Rechteprüfung einen Schritt abgelehnt, umgeh ihn nicht auf anderem Weg. Nenn ihn im
  Bericht als nicht gemessen.

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
(`qchost_key`, `ftp_password`). Das Messgeschirr der letzten beiden Runden liegt dort und unter
`…/scratchpad/review-55/`:

- `h.mjs` mit den Schritten `upload`, `urls`, `urlui`, `previewdel` und `ftptarget`; der Schritt
  `deploy` zeichnet Fortschrittsereignisse auf;
- `nbui.mjs` für echte Klicks;
- `attrappe55.mjs`, eine Attrappe eines Hosters auf 127.0.0.1, die u. a. 401, 429, 522, 307 und
  308, lange Texte und eine Weiterleitung ins LAN spielen kann;
- `drop.cjs`;
- `nb4-scene.sh` und `nb9-scene.sh`.

**Lies es, aber ändere es nicht.** Kopier, was du brauchst.

- Lade nur in eigene Unterordner unter `/srv/qc/www/review56-*` bzw.
  `/srv/qc/www/nochmod/review56-*` und räum sie am Ende weg, ebenso Mails, die deine Messungen in
  `/var/mail/boxi` oder `/var/mail/qchost` hinterlassen.
- Änderungen an Diensten der VM (vsftpd, nginx, Apache, PHP, sshd, nft) nur, wenn du sie am Ende
  zurückstellst. Sag im Bericht, was du geändert hattest. `sudo` geht ohne Passwort.

**Die App:**

- `git clone /Users/boxi/Development/QuartzControl <scratchpad>/review-56/qc`, dort `git checkout
  feat/1.2`, `npm ci`, `npm run build`. Für die Fix-Linie: ein zweiter Klon auf `fix/1.1.x`.
- Starten mit `_electron.launch` aus `playwright-core` und einem eigenen `--user-data-dir` im
  Scratchpad, **nie mit dem echten Profil**; für das Snakeoil-Zertifikat der VM
  `--ignore-certificate-errors`. Die Muster stehen in `.claude/skills/run-desktop/SKILL.md`.
- Das Projekt ist eine eigene Kopie (`cp -Rc` von `relaytest/site`), deren
  `.quartz/plugins/quartz-forms` auf einen Klon von quartz-forms auf `v0.5.14` zeigt. Ist `content`
  ein Symlink, schreib nichts darunter.
- `npm run typecheck`, `npm run smoke` und `npm run check:i18n` im Klon; in quartz-forms (Klon)
  `npm run check`.

**Im Browser** (falls du eine Website gegen das Relay schickst):

- Chrome über `playwright-core` mit `channel: 'chrome'` und `ignoreHTTPSErrors`.
- Prüfskripte öffnen keine `mailto:`-Links.
- Testschlüssel für OpenPGP mit gpg in einem kurzen `GNUPGHOME` unter
  `$(getconf DARWIN_USER_TEMP_DIR)`. Räum die Ordner am Ende weg und beende ihre Agenten.

## Was du ablieferst

Einen Bericht auf Deutsch in `<scratchpad>/review-56/review.md`:

- Befunde nach Gewicht (Hoch, Mittel, Niedrig), je mit Ort, Szenario, Beleg (gemessen oder gelesen,
  und womit) und einem Vorschlag.
- Getrennt davon eine Liste „Nebenbei“ für Kleinigkeiten.
- Eine Tabelle: Befund und Nebenbei-Punkt des 55. Reviews → trifft der Fix ihn ganz, teilweise oder
  nicht?
- Am Ende ein Urteil:
  - ob die Fix-Linie (`fix/1.1.x` bei `8a9061ac`) als nächstes 1.1.x veröffentlicht werden kann;
  - ob die Änderungen auf `feat/1.2` so mit 1.2 veröffentlicht werden können;
  - ob quartz-forms 0.5.14 so stehen bleiben kann;
  - was vorher geschehen muss.

Kennzeichne bei jedem Befund, ob du ihn gemessen oder nur gelesen hast.
