Du bist als zweites Paar Augen an QuartzControl, dessen Fassung `1.1.0` (2026-10-18) draußen ist.
Fixes für 1.1 entstehen auf `fix/1.1.x`, die nächste Fassung **1.2** auf `feat/1.2`. Es geht um ein
Review, nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Warum diese Runde

Das siebenundfünfzigste Review (`docs/REVIEW-2026-11-01.md`) hat 0 Hoch, 2 Mittel, 4 Niedrig und
12 Nebenbei-Punkte gefunden. Claude Opus 5.5 hat am 2026-10-22 abgearbeitet:

- beide Mittel und alle vier Niedrig;
- die Nebenbei-Punkte 2, 5, 7, 8 und 12;
- drei Punkte, die beim Abarbeiten auffielen.

**Keinen dieser Fixes hat ein Review gelesen.** Die Fix-Linie hat seit dem 57. Review 10 Commits im
Code und geht als Nächstes als **1.1.1** hinaus. Diese Runde ist die letzte davor.

Jede Messung in den Commit-Nachrichten, in `docs/reviews.md`, in
`docs/decisions/publishing-and-credentials.md`, in der Matrix und in diesem Auftrag stammt von
demselben Modell, das auch die Fixes geschrieben hat. **Nimm nichts als gemessen hin, nur weil es so
dasteht.** Prüf besonders, ob ein Fix den Befund wirklich trifft oder nur die eine Szene, an der er
gemessen wurde. Einer der Fixes (`6dba3247`) beruhte schon einmal auf einer falschen Annahme über
die Oberfläche und musste nachgebessert werden (`67ef4ae6`).

In der Zählung von `CLAUDE.md` ist das das **achtundfünfzigste** Review.

## Die Unterstützungsmatrix und der Umfang dieser Runde

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

**Diese Runde umfasst nur die Bereiche Übertragung sowie Rechte und Pfade.** Der Bereich Relay hatte
im 57. Review nichts über Niedrig und ist nach der Regel abgeschlossen. Von ihm liest du nur den
einen neuen Satz `relayDirWriteOnly` (`82f68bd8`); öffne den Bereich nicht neu. Findet diese Runde
in einem der beiden Bereiche nichts über Niedrig, gibt es dort keine weitere Runde. **Sag am Ende je
Bereich, ob das so ist.**

## Das Projekt

**QuartzControl:** Electron + React + TypeScript, `/Users/boxi/Development/QuartzControl`.

- Lies zuerst `CLAUDE.md` **und `docs/conventions.md`**, das sie einbindet. Die Begründungen der
  Regeln stehen in `docs/decisions/conventions-full.md`. Für diese Runde zählen besonders:
  - die Regel „Was die App auf einen Server lädt, bekommt seinen Modus von der App …“ (Löschen,
    Ordner-Ziel, „~“, `.tilde.json`); sie wurde in dieser Runde geändert;
  - „Zwei Arten zu scheitern bekommen zwei Antworten“;
  - „Kann nicht prüfen ist nie alles gut“;
  - „Ein Rat gehört zu dem Zustand, den er meint …“ und „Ein Hinweis sagt, was passiert …“.
- Lies das vorige Review samt Auftrag (`docs/REVIEW-2026-11-01.md`, `…-auftrag.md`). Lies in
  `docs/reviews.md` den Abschnitt „Das siebenundfünfzigste Review“ samt Nachtrag. Dort steht, welcher
  Commit welchen Befund beheben soll.
- Lies in `docs/decisions/publishing-and-credentials.md` die Nachträge vom 2026-10-22 am Ende.

## Umfang

    git log --oneline --no-merges 47ef6429..feat/1.2               # feat/1.2, bei 3c833017
    git diff 47ef6429..feat/1.2 -- electron src shared
    git log --oneline e41df35f..fix/1.1.x                         # fix/1.1.x, bei 955fe048
    git diff e41df35f..fix/1.1.x

Code auf der Fix-Linie: 7 Dateien (+136 / −9). Auf `feat/1.2` dieselben 7 Dateien (+130 / −9), über
die Merges `3916a5b1`, `e2c46ec9`, `2eefaa0a`. Dazu kommt die Doku: `docs/support-matrix.md`,
`docs/conventions.md`, `docs/decisions/conventions-full.md`,
`docs/decisions/publishing-and-credentials.md`, `docs/reviews.md`, `CLAUDE.md`.

Die Zuordnung Befund → Commit (Nummern nach `docs/REVIEW-2026-11-01.md`):

- **Fix-Linie, gemergt in `feat/1.2`:**
  - M1 `a1d9aef3`: Zeichen der Shell im rsync-Pfad abgelehnt (`rsyncPathWithSpecial`). Beim Merge
    blieb die Fassung von `feat/1.2` (`131b92cb`, `rsyncUnsafeChar` in `shared/remotePath.ts`).
  - M2 `6dba3247` und `67ef4ae6`: Ein Ordner-Ziel mit Manifest lehnt ab, wenn sein Ordner fehlt oder
    leer ist (`folderMissing`, `folderEmpty`), auch wenn es nichts zu tun gibt.
  - N2 `3a7aecce`: Ein SFTP- oder FTP-Ziel mit „~“ aus 1.1.0 schickt einmal alles neu
    (`reanchorTildeManifest` in `manifest.ts`, aufgerufen in `makeContext`, Merker
    `deploy-manifest-<id>.tilde.json`).
  - Nebenbei 2 `cffca085`: kein doppelter Punkt in `deployDeleteRefused` über FTP.
  - Nebenbei 5 `4de01109` und `d9d42887`: `PWD` nur für relative Pfade und „~“; ist die Antwort
    unlesbar, `ftpPwdUnreadable`.
  - Nebenbei 7 `cee97cbe`: Eine schweigende FTP-Verbindung sagt `sshSilent` (30 s,
    `FTP_TIMEOUT_MS`).
  - Nebenbei 8 `2fff1874` und `955fe048`: Eine abgelehnte SFTP-Anmeldung nennt, was angeboten wurde
    (`sshPasswordRejected`, `sshStoredKeyRejected`, sonst `rsyncKeyRejected`).
- **Nur `feat/1.2`:**
  - N3 `82f68bd8`: `relayDirWriteOnly` unter `rrsync -wo`.
  - N1 `d523ab17`, N4 `a2e24b0e`, Nebenbei 12 `7f3f33b6`: nur Doku (Matrix, Regel, Langfassung,
    Nachtrag).
  - `3c833017`: Matrix und Chronik zu den drei Punkten aus dem Nachtrag.

Nicht gewählt und deshalb kein Befund dieser Runde: Nebenbei 1, 3, 4, 6, 9, 10, 11 des 57. Reviews.
Nenn sie nur, wenn ein Fix dieser Runde sie schwerer macht.

## Abwägungen, die niemand gegengelesen hat

**1. Zeichen der Shell im rsync-Pfad auf der Fix-Linie (`a1d9aef3`).**

- `SHELL_SPECIAL` in `rsync.ts` ist eine eigene Liste, nicht `rsyncUnsafeChar` aus `feat/1.2`.
  Stimmen beide Listen überein? Fehlt ein Zeichen, das eine POSIX-Shell auswertet (Zeilenumbruch,
  Tab, `^` in alten Shells, `~` mitten im Pfad, `=` vorn)?
- Lehnt die Liste einen Pfad ab, der mit 1.1.0 über rsync lief und dabei richtig landete (etwa
  `#` mitten im Namen, `!` ohne History, `[a]` ohne Treffer)? Was sagt die Vorschau dazu, was der
  Lauf?
- Auf der Fix-Linie sagt das Formular nichts; erst der Lauf lehnt ab. Reicht das für 1.1.1?
- Gilt die Ablehnung auch für rsync 3.x als Client (Linux-App), wo die Argumente geschützt sind und
  1.1.0 richtig lud?

**2. Das Ordner-Ziel ohne Ordner (`6dba3247`, `67ef4ae6`).**

- Gefragt wird, wenn das Manifest Einträge hat. Wann hat ein Ziel ein Manifest, obwohl es nie
  veröffentlicht wurde, und wann keines, obwohl es veröffentlicht wurde (Snapshot-Restore,
  Projekt dupliziert, Ziel umbenannt oder Pfad geändert, `locationKey`)?
- Ist „Alles neu hochladen“ der Ausweg, den die Sätze nennen, und funktioniert er in jedem der zwei
  Fälle? Prüf das an der Oberfläche, nicht am Kanal.
- „Leer“ heißt `readdir` liefert nichts. Was ist mit einem Ordner, der nur `.DS_Store` oder
  `.localized` enthält, einem leeren Mountpoint unter Linux, einem Link auf ein ausgehängtes
  Laufwerk, fehlendem Leserecht?
- Was, wenn der Nutzer den Ordner absichtlich geleert hat und neu veröffentlichen will?

**3. „~“-Ziele aus 1.1.0 (`3a7aecce`).**

- Der Merker gilt je Ziel-ID. Was geschieht, wenn ein Ziel von „~/a“ auf „/abs“ und zurück
  geändert wird, wenn es dupliziert wird (`duplicateService`), wenn ein Snapshot ein altes Manifest
  ohne Merker zurückbringt, wenn das Ziel gelöscht wird (bleibt der Merker liegen)?
- Der Merker wird in `makeContext` geschrieben, vor dem Lauf. Was, wenn der Lauf scheitert oder
  abgebrochen wird? Lädt der nächste Lauf dann noch alles, was fehlt?
- rsync ist ausgenommen. Stimmt das für jede Form von „~“ über rsync?
- Leere Hashes statt eines vergessenen Manifests: Was tut das mit „Entfernt“ in der Vorschau und
  mit Löschen, wenn ein Ziel mit „~/a“ (nicht „~“ allein) Löschen an hat?

**4. FTP: `PWD`, Timeout, Punkt (`4de01109`, `d9d42887`, `cee97cbe`, `cffca085`).**

- Ein absoluter Pfad startet jetzt bei „/“ ohne `PWD`. Stimmt das mit chroot, mit einem Server,
  dessen Anmeldeverzeichnis nicht „/“ ist, und auf `feat/1.2` mit der Elternprüfung und der
  Symlink-Frage des Relays, die dasselbe `start` benutzen?
- Wann wirft `pwd()` etwas anderes als einen Parse-Fehler oder `FTPError`, und was sagt die App
  dann?
- `FTP_TIMEOUT_MS` ist 30 s. War das vorher schon der Standard von basic-ftp, oder ändert der Commit
  das Verhalten? Kann ein langsamer Server oder eine große Datei jetzt mit `sshSilent` enden, obwohl
  die Verbindung lebt (etwa nach `STOR`, bis die Antwort kommt)? Ist „Versuche es noch einmal“ dort
  der richtige Rat?
- Ist der Satz `sshSilent` für FTP richtig, obwohl er nach SSH heißt? Sagen de und en dasselbe?

**5. Abgelehnte SFTP-Anmeldung (`2fff1874`, `955fe048`).**

- Welche Zugänge gibt es (Passwort, Schlüsseldatei, hinterlegter Schlüssel, Agent, Passwort und
  Schlüssel zugleich, keyboard-interactive)? Fällt jeder in den richtigen Satz?
- Kann der Satz einen Pfad, einen Benutzernamen oder ein Geheimnis zeigen, das nicht dahin gehört?
- Wird ein Fehler, der keine Ablehnung ist (Host-Key, Verbindungsabbruch während der Anmeldung,
  „Too many authentication failures“), falsch als Ablehnung gesagt?

**6. Die Doku.** Halten die Matrix, die Nachträge in `decisions/` und die geänderte Regel in
`docs/conventions.md` dem Code stand? Trägt jede Zeile „gemessen“ wirklich eine Messung? Stimmt der
Satz für die Release-Notes, den die Chronik vorschlägt (einen Ordner „~“, den 1.1.0 auf dem Server
angelegt hat, kann man löschen)? Fehlt etwas im Handbuch, das ein Nutzer von 1.1.1 braucht?

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was auf dem Server des Nutzers etwas falsch setzt, löscht oder ausführt, und was eine Website-Veröffentlichung bricht, die mit 1.1.0 lief

Abwägungen 1 bis 4. Die Fix-Linie zuerst: Sie geht als Nächstes hinaus.

### 2. Was QuartzControl falsch sagt

Ein „ok“, das keines ist, ein Fehler, der keiner ist, ein Satz, der stehen bleibt. Die neuen Sätze
sind `rsyncPathWithSpecial`, `folderMissing`, `folderEmpty`, `ftpPwdUnreadable`,
`sshPasswordRejected`, `sshStoredKeyRejected` und `relayDirWriteOnly`. Prüf an ihnen:

- höchstens zwei Sätze, „QuartzControl“ statt „die App“, „konnte nicht … werden“;
- ob de und en dasselbe sagen;
- ob ein Satz einen Ausweg nennt, den es gibt.

### 3. Was in der Doku und in der Matrix nicht stimmt

Abwägung 6.

## Wenn du misst

Ändere nichts in diesem Repo, in quartz-forms, in einem Vault oder in einem Projekt unter
`~/Documents/QuartzProjekte`. Arbeite in Kopien in deinem Ordner
`/private/tmp/claude-501/-Users-boxi-Development-QuartzControl/25997937-8b2b-4faf-a3e8-e7b9a4a2121f/scratchpad/review-58/`
(im Folgenden `<r58>`).

- **Lies nie etwas aus einem Projekt oder Vault namens `HinterlandHistory`/`hinterland-history`**,
  auch nicht in einer Schleife oder einem `grep` über alle Projekte.
- **Keine Anfrage an einen Host außerhalb dieses Rechners und der VM**, außer `npm ci` in deinen
  Klonen. Das gilt auch für die VM: Installiere dort keine Pakete und lade keine Images.
- Hat die Rechteprüfung einen Schritt abgelehnt, umgeh ihn nicht auf anderem Weg. Nenn ihn im
  Bericht als nicht gemessen.

**Die VM als Hoster:** `ssh debian-vm` (Hostname aus Sicht des Mac `debian.local`). Die
Einrichtung steht in
`/Users/boxi/.claude/projects/-Users-boxi-Development-QuartzControl/memory/reference_relay_vm_harness.md`:

- Account `qchost`, Webroot `/srv/qc/www`; Account `qcsftp` (`/srv/qc/www/nochmod`).
- vsftpd auf `:21` (ohne chroot). In Podman-Containern ProFTPD 1.3.8c auf `:2121` und Pure-FTPd
  1.0.50 auf `:2122`, Start und Stopp mit `~/qcftp/run.sh <proftpd|pureftpd|stop> [chroot]`.
  **Stopp die Container am Ende wieder.**
- sshd lässt keine Passwort-Anmeldung zu; `rrsync` liegt unter `/usr/bin/rrsync`.
- rsync 3.5.0 als Client und die Linux-App beider Linien: `~/rs3/` auf der VM.

Der SSH-Schlüssel für `qchost` und das FTP-Passwort liegen unter
`/private/tmp/claude-501/-Users-boxi-Development-QuartzControl/62a1ddd0-2d6c-4d64-bf4d-7fd46d34609e/scratchpad/relaytest/`
(`qchost_key`, `ftp_password`), das Projekt dort unter `site/`.

Messgeschirr, **lesen, nicht ändern; kopier, was du brauchst**:

- Das des 57. Reviews: `…/62a1ddd0-2d6c-4d64-bf4d-7fd46d34609e/scratchpad/review-57/` (`h.mjs`,
  `folder-gone.sh`, `migrate.sh`, `del57.sh`, `ftpdel57*.sh`, `parent57.sh`).
- Das der Fixes: `…/25997937-8b2b-4faf-a3e8-e7b9a4a2121f/scratchpad/m/`. `h.mjs`, Szenen
  `rsdollar.sh`, `folder-gone.sh`, `folder-idle.sh`, `migrate.sh`, `refused.sh`, `del.sh`,
  `auth.sh`, `rr.sh`, `pwd.sh` mit dem Proxy `pwdproxy.cjs` (beantwortet `PWD` ohne
  Anführungszeichen), Schlüssel `unregistered_key`, `rr_key`. Die Protokolle `*-before.log` und
  `*-after.log` sind die Messungen, auf die sich die Commits berufen.
- `~/rs3/` und `~/qcftp/` auf der VM.

Auf der VM:

- Lade nur in eigene Unterordner `/srv/qc/www/review58-*` und `/home/qchost/review58-*`. Räum sie
  am Ende weg. Legt eine Szene einen Ordner `/home/qchost/~` an, räum ihn ebenfalls weg.
- Änderungen an Diensten oder an `/home/qchost/.ssh/authorized_keys` nur, wenn du sie am Ende
  zurückstellst. Notier vorher Inhalt, Eigentümer und Modus. Sag im Bericht, was du geändert
  hattest. `sudo` geht ohne Passwort.

Auf dem Mac: Ein Disk-Image für das Ordner-Ziel legst du in `<r58>` an und hängst es am Ende aus.

**Die App:**

- `git clone /Users/boxi/Development/QuartzControl <r58>/qc`, dort `git checkout feat/1.2`,
  `npm ci`, `npm run build`. Für die Fix-Linie ein zweiter Klon `<r58>/qcfix` auf `fix/1.1.x`.
- Starten mit `_electron.launch` aus `playwright-core` und einem eigenen `--user-data-dir` in
  `<r58>`, **nie mit dem echten Profil**. Die Muster stehen in `.claude/skills/run-desktop/SKILL.md`
  und in den `h.mjs` oben.
- Das Projekt ist eine eigene Kopie (`cp -Rc` von `relaytest/site`). Ist `content` ein Symlink,
  schreib nichts darunter.
- `npm run typecheck`, `npm run smoke` und `npm run check:i18n` in beiden Klonen.

## Was du ablieferst

Einen Bericht auf Deutsch in `<r58>/review.md`:

- Befunde nach Gewicht (Hoch, Mittel, Niedrig), je mit Ort, Stufe aus der Matrix, Szenario, Beleg
  (gemessen oder gelesen, und womit) und einem Vorschlag.
- Getrennt davon eine Liste „Nebenbei“ für Kleinigkeiten.
- Eine Tabelle: jeder Commit aus der Zuordnung oben → trifft er seinen Befund ganz, teilweise oder
  nicht?
- Je Bereich (Übertragung, Rechte und Pfade): Gab es einen Befund über Niedrig?
- Am Ende ein Urteil:
  - ob die Fix-Linie (`fix/1.1.x` bei `955fe048`) als 1.1.1 veröffentlicht werden kann;
  - ob die Änderungen auf `feat/1.2` so mit 1.2 veröffentlicht werden können;
  - was vorher geschehen muss.
- Was du auf der VM und auf dem Mac angelegt, geändert und zurückgestellt hast.

Kennzeichne bei jedem Befund, ob du ihn gemessen oder nur gelesen hast.
