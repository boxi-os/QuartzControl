Du bist als zweites Paar Augen an QuartzControl, dessen Fassung `1.1.0` (2026-10-18) draußen ist.
Fixes für 1.1 entstehen auf `fix/1.1.x`, die nächste Fassung **1.2** auf `feat/1.2`. Es geht um ein
Review, nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Warum diese Runde

Das sechsundfünfzigste Review (`docs/REVIEW-2026-10-31.md`) hat 0 Hoch, 2 Mittel, 5 Niedrig und
eine Nebenbei-Liste mit 14 Punkten gefunden. Claude Opus 5.5 hat am 2026-10-21 alles davon
abgearbeitet. Danach hat es mit dem Nutzer festgelegt, was QuartzControl beim Veröffentlichen und
beim Relay bedienen will: **`docs/support-matrix.md`**. Die Messungen für diese Matrix haben noch
drei Fehler gefunden, die seitdem behoben sind:

- ein relativer FTP-Pfad auf einem Server ohne chroot („553“, seit 1.1.0);
- eine abgelehnte Löschung über FTP, die als gelöscht zählte;
- „~“, das über SFTP und FTP je Server etwas anderes hieß.

**Keinen dieser Fixes hat ein Review gelesen.**

Diese Runde ist als **letzte vor 1.1.1** gedacht. Die Fix-Linie hat seit `v1.1.0` 19 Commits und
geht als Nächstes hinaus.

Jede Messung in den Commit-Nachrichten, in `docs/reviews.md`, in
`docs/decisions/publishing-and-credentials.md`, in der Matrix und in diesem Auftrag stammt von
demselben Modell, das auch die Fixes geschrieben hat. **Nimm nichts als gemessen hin, nur weil es so
dasteht.** Prüf besonders, ob ein Fix den Befund wirklich trifft oder nur die eine Szene, an der er
gemessen wurde.

In der Zählung von `CLAUDE.md` ist das das **siebenundfünfzigste** Review.

## Neu in dieser Runde: die Unterstützungsmatrix

Lies `docs/support-matrix.md` vor allem anderen. **Jeder Befund nennt die Stufe des Falls, in dem er
auftritt** (unterstützt, geduldet, nicht unterstützt, „Messung ausstehend“). Die Stufe entscheidet,
was mit ihm geschieht:

- **Unterstützt:** Er wird behoben und nachgemessen.
- **Geduldet:** Er wird nur behoben, wenn Daten verloren gehen, fremde Dateien berührt werden oder
  ein Geheimnis offenliegt. Sonst bekommt er einen Satz in der Matrix.
- **Nicht unterstützt:** Er wird nur dokumentiert.

Steht ein Fall nicht in der Matrix, schlag eine Stufe vor und begründe sie. Hoch und Mittel nur für
das, was in seiner Stufe behoben würde. Alles andere ist Niedrig oder Nebenbei, und der Nutzer wählt
daraus aus.

Findet diese Runde in einem Bereich (Übertragung, Relay, Rechte und Pfade) nichts über Niedrig, gibt
es dort keine weitere Runde. **Sag am Ende je Bereich, ob das so ist.**

Prüf auch die Matrix selbst:

- Stimmt jeder Eintrag mit dem Code und mit dem, was du nachmessen kannst?
- Fehlt ein Fall, den echte Hoster häufig haben?
- Ist eine Stufe zu großzügig, also „unterstützt“ ohne Messung, die das trägt?

## Das Projekt

**QuartzControl:** Electron + React + TypeScript, `/Users/boxi/Development/QuartzControl`.

- Lies zuerst `CLAUDE.md` **und `docs/conventions.md`**, das sie einbindet. Die Begründungen der
  Regeln stehen in `docs/decisions/conventions-full.md`. Für diese Runde zählen besonders:
  - die Regel „Was die App auf einen Server lädt, bekommt seinen Modus von der App …“ (Löschen,
    „~“, Elternordner, Symlink);
  - die neue Regel zur Matrix unter „Arbeitsweise“;
  - „Zwei Arten zu scheitern bekommen zwei Antworten“;
  - „Kann nicht prüfen ist nie alles gut“;
  - „Ein Symlink-Schutz prüft jedes Segment …“.
- Lies das vorige Review samt Auftrag (`docs/REVIEW-2026-10-31.md`, `…-auftrag.md`). Lies in
  `docs/reviews.md` den Abschnitt „Das sechsundfünfzigste Review“ samt Nachträgen. Dort steht, welcher
  Commit welchen Befund beheben soll.
- Lies in `docs/decisions/publishing-and-credentials.md` die Nachträge vom 2026-10-21 am Ende.
- quartz-forms liegt unter `/Users/boxi/Development/quartz-forms` (veröffentlicht: 0.5.15). Seitdem
  kam nur ein Test hinzu (`ab6c0f9`, `test/relay.test.ts`).

## Umfang

    git log --oneline --no-merges review-2026-10-31..3d569629      # feat/1.2
    git diff review-2026-10-31..3d569629 -- electron src shared
    git log --oneline 8a9061ac..e41df35f                          # fix/1.1.x
    git diff 8a9061ac..e41df35f
    git -C /Users/boxi/Development/quartz-forms show ab6c0f9

Code auf `feat/1.2`: 14 Dateien (+297 / −83). Auf der Fix-Linie davon 10 Dateien (+127 / −39).
Dazu kommen die Doku (`docs/support-matrix.md` neu, `docs/conventions.md`,
`docs/decisions/conventions-full.md`, `docs/decisions/publishing-and-credentials.md`,
`docs/reviews.md`, `CLAUDE.md`) und der Skill `.claude/skills/review-befund/SKILL.md`.

Die Zuordnung Befund → Commit:

- **Aus dem 56. Review** (Fix-Linie, über Merges in `feat/1.2`):
  - M1 `07e63010`, N2 `2a4df8dc`, N5 `7371135f`.
- **Aus dem 56. Review** (nur `feat/1.2`):
  - N1 `cbea9395`, N3 `f0c5e559`, N4 `dbd340df`;
  - M2 quartz-forms 0.5.15 mit `252b3f7e`.
- **Nebenbei des 56.:**
  - Fix-Linie: `550ac8d0`, `88b56538`;
  - `feat/1.2`: `6d7e3d11`, `36c4ebc3`, `672fba38`, `1ec5394d`, `73966695`, `19abc38c`,
    `812d1baf`, `d963d7b3`, `6e293da1`, `63eb5ce0`;
  - quartz-forms `ab6c0f9`.
- **Aus den Messungen für die Matrix** (Fix-Linie):
  - `6f005a4e`: relativer FTP-Pfad ab dem Anmeldeverzeichnis;
  - `466117a2`: nach `550` auf `DELE` fragt FTP mit `SIZE` nach;
  - `e41df35f`: „~“ über SFTP und FTP ist das Anmeldeverzeichnis (`fromLoginDir` in
    `shared/remotePath.ts`).
- **Doku:** `12d3d36d` (Matrix), `4b69138a`, und was danach kommt (rsync 3.x als Client, siehe
  unten).

## Abwägungen, die niemand gegengelesen hat

**1. FTP: `550` auf `DELE`, dann `SIZE` (`466117a2`).**

- Ein `550` auf `SIZE` heißt „weg“, eine Größe heißt „liegt noch“, jeder andere FTP-Fehler „behalten“.
- Wann antwortet ein Server auf `SIZE` mit `550`, obwohl die Datei noch liegt? Denk an:
  - den ASCII-Modus;
  - Server, die `SIZE` abschalten oder nur für bestimmte Dateien beantworten;
  - fehlendes Leserecht auf die Datei;
  - einen Namen mit Leerzeichen oder Sonderzeichen.
- Was geschieht, wenn `SIZE` die Verbindung abbricht?
- Gemessen wurde mit einem Ordner 555 auf vsftpd, ProFTPD und Pure-FTPd. Trägt das?

**2. „~“ als Anmeldeverzeichnis (`e41df35f`, `fromLoginDir`).**

- SFTP nimmt `realPath('.')`, FTP `pwd()` nach dem Login.
- `~name` wird nur angenommen, wenn `name` der Benutzername des Zugangs ist. Was ist mit FTP-Konten
  bei Hostern, deren Benutzername kein Unix-Name ist (`web123@example.com`, `example.com|ftp`,
  Großschreibung)? Wird etwas abgelehnt, das mit 1.1.0 lief?
- Was ist mit:
  - `~//a`, `~/./a`, `~/../a`, `~` allein mit Löschen;
  - einem `pwd`, das in Anführungszeichen, mit Laufwerksbuchstaben oder gar nicht antwortet;
  - einem chroot, in dem das Anmeldeverzeichnis `/` ist?
- Stimmen Formular (`remotePathProblem`), `deployWholeRoot` und das, was die Adapter tatsächlich
  tun, noch überein? Ist „~“ mit Löschen auf jedem Weg abgelehnt?

**3. Relativer FTP-Pfad (`6f005a4e`).**

- Nach jedem `ensureDir` geht der Adapter mit `cd(start)` zurück, nicht mehr nach `/`.
- Was, wenn `start` ein Pfad mit Leerzeichen ist oder `cd(start)` scheitert?
- Die Elternprüfung und die Symlink-Frage des Relays benutzen auf `feat/1.2` dasselbe `start`.
  Stimmen sie mit relativen Pfaden und mit „~“?

**4. Das Löschen bei abgebrochener Verbindung (`07e63010`) und das Anmeldeverzeichnis ohne Löschen
(`2a4df8dc`).**

- Trifft M1 jetzt jeden Weg, auf dem eine Datei als gelöscht zählen kann (SFTP, FTP, Ordner-Ziel)?
- Kann N2 dazu führen, dass doch das Anmeldeverzeichnis geleert wird, etwa wenn ein Ziel später auf
  Löschen umgestellt wird oder über ein importiertes oder mit 1.1.0 gespeichertes Ziel?

**5. Relay und Abfrage (nur `feat/1.2`).**

- `672fba38` lehnt das Relay ab, wenn ein Ordner auf dem Weg nicht auf einen Symlink geprüft werden
  kann. Lehnt das einen Hoster ab, der richtig lief? Die Matrix nennt solche Ordner „geduldet:
  sauber ablehnen, nicht weiter verfeinern“. Ist die Ablehnung sauber?
- `1ec5394d`, `73966695`, `19abc38c`, `812d1baf`, `dbd340df`, `cbea9395`: Fällt eine Antwort echter
  Hoster jetzt in die falsche Schublade? Wird irgendwo aus „konnte nicht prüfen“ ein „ok“?

**6. rsync 3.x als Client.** Die Matrix nannte das zuletzt „Messung ausstehend“. Gemessen ist es seit
dem 2026-10-21 auf `debian-vm`, mit der Linux-App aus beiden Linien und rsync 3.5.0 als Client.
Das Harness liegt in `~/rs3/` auf der VM (`h.mjs`, `run.sh`, `suite.sh`, `relay.sh`), die Protokolle
in `~/rs3/*.log`. Trägt die Messung die Stufe „unterstützt“? Was davon gilt nur, weil Server und
Client auf derselben Maschine liefen?

Bekannt und offen: Auf der Fix-Linie lehnt rsync im Pfad nur Leerzeichen ab, nicht die übrigen
Zeichen der Shell (`131b92cb` liegt nur auf `feat/1.2`). Unter rsync 3.x ist das gemessen harmlos,
unter openrsync (macOS) wertet die entfernte Shell sie aus. Wie schwer wiegt das für 1.1.1?

**7. Die Doku.** Halten die Matrix, die Nachträge in `decisions/` und die Regel in
`docs/conventions.md` dem Code stand?

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was auf dem Server des Nutzers etwas falsch setzt, löscht oder ausführt, und was eine Website-Veröffentlichung bricht, die mit 1.1.0 lief

Abwägungen 1 bis 4. Die Fix-Linie zuerst: Sie geht als Nächstes hinaus.

### 2. Was Absendern, Empfängern oder dem Betreiber schaden kann

Abwägung 5.

### 3. Was QuartzControl falsch sagt

Ein „ok“, das keines ist, ein Fehler, der keiner ist, ein Satz, der stehen bleibt. Die neuen Sätze
sind `deployTildeOtherAccount` und `deployDeleteRefused`. Prüf an ihnen:

- höchstens zwei Sätze, „QuartzControl“ statt „die App“, „konnte nicht … werden“;
- ob de und en dasselbe sagen;
- ob ein Satz einen Ausweg nennt, den es gibt.

### 4. Was in der Doku und in der Matrix nicht stimmt

Abwägungen 6 und 7.

## Wenn du misst

Ändere nichts in diesem Repo, in quartz-forms, in einem Vault oder in einem Projekt unter
`~/Documents/QuartzProjekte`. Arbeite in Kopien in deinem Ordner `<scratchpad>/review-57/`.

- **Lies nie etwas aus einem Projekt oder Vault namens `HinterlandHistory`/`hinterland-history`**,
  auch nicht in einer Schleife oder einem `grep` über alle Projekte.
- **Keine Anfrage an einen Host außerhalb dieses Rechners und der VM.** Das gilt auch für die VM:
  Installiere dort keine Pakete und lade keine Images.
- Hat die Rechteprüfung einen Schritt abgelehnt, umgeh ihn nicht auf anderem Weg. Nenn ihn im
  Bericht als nicht gemessen.

**Die VM als Hoster:** `ssh debian-vm` (Hostname aus Sicht des Mac `debian.local`). Die
Einrichtung steht in
`/Users/boxi/.claude/projects/-Users-boxi-Development-QuartzControl/memory/reference_relay_vm_harness.md`:

- Account `qchost`, Webroot `/srv/qc/www`.
- Apache `:8441` (mod_php, `www-data`) und `:8442` (FPM-Pool `qchost`); nginx `:8443` bis `:8446`.
- Account `qcsftp` mit SFTP ohne Modus-Änderung (`/srv/qc/www/nochmod`).
- vsftpd auf `:21`, Postfix nur lokal, `nft` unter `/usr/sbin/nft`.
- In Podman-Containern: ProFTPD 1.3.8c auf `:2121`, Pure-FTPd 1.0.50 auf `:2122`, PHP 8.1 mit Apache
  auf `:8451`. Start und Stopp mit `~/qcftp/run.sh <proftpd|pureftpd|php81|stop> [chroot]`.
  **Stopp die Container am Ende wieder.**

Der SSH-Schlüssel für beide Accounts und das FTP-Passwort liegen unter
`/private/tmp/claude-501/-Users-boxi-Development-QuartzControl/62a1ddd0-2d6c-4d64-bf4d-7fd46d34609e/scratchpad/relaytest/`
(`qchost_key`, `ftp_password`).

Das Messgeschirr der letzten Runden liegt im selben Scratchpad unter `review-56/` und `fix56/`:

- `fix56/h.mjs` mit den Schritten `ftptarget` (mit `FTP_PORT`), `deploy`, `deployui`, `relay`,
  `relayui`;
- `fix56/ftp-suite.sh`, `ftp-freeze.sh`, `ftp-chroot.sh`, `ftp-refused.sh`, `ftp-delcheck.sh`,
  `tilde-scene.sh`, `feat-tilde.sh`;
- die Sonden `ftppwd.cjs` und `ftpdele.cjs`;
- `review-56/attrappe56.mjs` und `review-56/ka/`.

**Lies es, aber ändere es nicht.** Kopier, was du brauchst. Das gilt auch für `~/rs3/` auf der VM.

- Lade nur in eigene Unterordner `/srv/qc/www/review57-*`, `/srv/qc/www/nochmod/review57-*` und
  `/home/qchost/review57-*`. Räum sie am Ende weg, ebenso Mails, die deine Messungen in
  `/var/mail/boxi`, `/var/mail/qchost` oder `~/qf81/mail/out` hinterlassen.
- Änderungen an Diensten der VM nur, wenn du sie am Ende zurückstellst. Sag im Bericht, was du
  geändert hattest. `sudo` geht ohne Passwort.

**Die App:**

- `git clone /Users/boxi/Development/QuartzControl <scratchpad>/review-57/qc`, dort `git checkout
  feat/1.2`, `npm ci`, `npm run build`. Für die Fix-Linie: ein zweiter Klon auf `fix/1.1.x`.
- Starten mit `_electron.launch` aus `playwright-core` und einem eigenen `--user-data-dir` im
  Scratchpad, **nie mit dem echten Profil**; für das Snakeoil-Zertifikat der VM
  `--ignore-certificate-errors`. Die Muster stehen in `.claude/skills/run-desktop/SKILL.md`.
- Das Projekt ist eine eigene Kopie (`cp -Rc` von `relaytest/site`). Bieg dort
  `.quartz/plugins/quartz-forms` auf einen eigenen Klon von quartz-forms um; er zeigt sonst auf das
  echte Repo. Ist `content` ein Symlink, schreib nichts darunter.
- `npm run typecheck`, `npm run smoke` und `npm run check:i18n` im Klon.

## Was du ablieferst

Einen Bericht auf Deutsch in `<scratchpad>/review-57/review.md`:

- Befunde nach Gewicht (Hoch, Mittel, Niedrig), je mit Ort, Stufe aus der Matrix, Szenario, Beleg
  (gemessen oder gelesen, und womit) und einem Vorschlag.
- Getrennt davon eine Liste „Nebenbei“ für Kleinigkeiten.
- Eine Tabelle: Befund und Nebenbei-Punkt des 56. Reviews und die drei Fixes aus den Messungen →
  trifft der Fix ihn ganz, teilweise oder nicht?
- Je Bereich der Matrix (Übertragung, Relay, Rechte und Pfade): Gab es einen Befund über Niedrig?
- Am Ende ein Urteil:
  - ob die Fix-Linie (`fix/1.1.x` bei `e41df35f`) als 1.1.1 veröffentlicht werden kann;
  - ob die Änderungen auf `feat/1.2` so mit 1.2 veröffentlicht werden können;
  - was vorher geschehen muss.

Kennzeichne bei jedem Befund, ob du ihn gemessen oder nur gelesen hast.
