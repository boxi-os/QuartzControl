Du bist als zweites Paar Augen an QuartzControl, dessen Fassung `1.1.0` (2026-10-18) draußen ist.
Fixes für 1.1 entstehen auf `fix/1.1.x`, die nächste Fassung **1.2** auf `feat/1.2`. Es geht um ein
Review, nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Warum diese Runde

Am 2026-10-21 hat Claude Opus 5.5 das Relay von quartz-forms unter echten Bedingungen getestet: auf
einer Debian-VM als Hoster (Apache mit mod_php und PHP-FPM, nginx, SFTP, rsync, FTP, ein
Postfix, das nichts nach außen schickt), angesteuert über die gebaute App. Daraus sind sieben
Befunde und sieben Commits entstanden, einer davon auf der Fix-Linie. **Nichts davon hat ein Review
gelesen**, und jede Zahl in den Commit-Nachrichten, in `docs/decisions/publishing-and-credentials.md`
und in diesem Auftrag hat dasselbe Modell erhoben, ausgewertet und aufgeschrieben. **Nimm nichts als
gemessen hin, nur weil es so dasteht.**

Zwei der Änderungen greifen über das Relay hinaus: Jede Website, die per SFTP veröffentlicht wird,
bekommt jetzt einen festen Modus, und die Deploy-Adapter haben einen neuen Pfad
(`keepLocalModes`). Das Gewicht liegt deshalb nicht nur auf dem Reiter „Formulare“.

In der Zählung von `CLAUDE.md` ist das das **vierundfünfzigste** Review.

## Das Projekt

**QuartzControl:** Electron + React + TypeScript, `/Users/boxi/Development/QuartzControl`.

- Lies zuerst `CLAUDE.md` **und `docs/conventions.md`**, das sie einbindet. Die Begründungen der
  Regeln stehen in `docs/decisions/conventions-full.md`. Für diese Runde besonders die neue Regel
  „Was die App auf einen Server lädt, bekommt seinen Modus von der App …“, dazu „Zwei Arten zu
  scheitern bekommen zwei Antworten“, „Ein fremder Dienst, der nicht scheitert, hat nicht
  unbedingt geliefert“, „Was einen Fehler beheben soll, hängt nicht an der Antwort, die der Fehler
  verhindert“, „Was ohne Zutun erscheint, wird angesagt“ und „Ein Hinweis sagt, was passiert“.
- In `docs/decisions/publishing-and-credentials.md` die fünf Absätze vom 2026-10-21 am Ende (die
  Messungen dieser Runde) und davor die Absätze über rsync, Manifeste und den Ordner-Upload.
- quartz-forms liegt unter `/Users/boxi/Development/quartz-forms` (installiert 0.5.10). Für diese
  Runde zählen `relay/php/send.php` (was ein `GET ?challenge=` tut und schreibt, `counters/`),
  `relay/php/README.md` und `src/cli.ts` (`relay`), weil `formsService.ts` es so aufruft.

## Umfang

    git log --oneline e6c385b8..afe5b90a
    git diff e6c385b8..afe5b90a -- electron src shared
    git show 6ff44e45      # derselbe Fix auf fix/1.1.x, dort allein

17 Dateien (+367 / −21), davon 3 Doku.

- `6ff44e45` (fix/1.1.x, in `feat/1.2` gemergt mit `3867b7dd`): SFTP lädt jede Datei mit
  `writeStreamOptions: { mode: 0o644 }` hoch, weil ssh2 sonst 0666 per `fchmod` setzt. Datei:
  `deploy/sftp.ts`.
- `23a9523f` Das Relay bekommt seine Modi: `formsService.setRelayModes()` (Ordner 0755, Dateien
  0644, `config.php` 0600 oder mit dem Schalter `configReadable` 0644), `DeployContext.keepLocalModes`
  (nur `runDirectoryUpload`), SFTP mit lokalem Modus und `chmod` der Ordner, rsync mit `-p`, FTP mit
  `SITE CHMOD`. Ein geänderter Modus von `config.php` lädt alles neu hoch (`lastUpload.configMode`).
  Nach dem Upload eine Abfrage `GET <send.php>?challenge=<erstes Formular>` mit der Origin der
  Website, Antworten `ok`/`phpError`/`relayError`/`http`/`unreachable`/`noUrl`, in der Oberfläche
  ein Satz und bei `phpError` ein Button „config.php für den Webserver lesbar machen“. Vertrag,
  Schema, Handler, Preload, `FormsRelay.tsx`, Sprachdateien, Doku.
- `97958c01` Ein abgelehnter Modus bricht den Upload nicht mehr ab; SFTP fragt mit `stat`, was der
  Server hält, und sagt es (`modeNote`).
- `0f58161d` Die Abfrage geht über `net.request` statt `net.fetch` (CORS bei fremder Origin).
- `243d1eee` `countersServed()`: Ist „Ordner für Zähler“ leer, wird `counters/.htaccess` abgefragt;
  200 mit dem Kopf `# quartz-forms relay` heißt „für jeden lesbar“ (nginx), Satz in Amber.
- `afe5b90a` FTP sammelt die abgelehnten `SITE CHMOD` und nennt nach dem Upload nur, was `LIST`
  wirklich anders zeigt (`modeNotes`).

## Abwägungen, die niemand gegengelesen hat

**1. 0644 für jede Datei einer Website über SFTP (`6ff44e45`).** Das gilt für alle Nutzer, nicht
nur für das Relay.

- Gibt es Hoster oder Einrichtungen, bei denen 0644 schlechter ist als das, was vorher ankam
  (Gruppen-Schreibrecht für einen Webserver in derselben Gruppe, ein CMS neben der Website, Dateien,
  die der Nutzer auf dem Server absichtlich anders gesetzt hat und die jetzt bei jedem Upload
  zurückgesetzt werden)? Ist der Fix auf einer Fix-Linie richtig aufgehoben, oder ändert er dort
  Verhalten, das jemand braucht?
- Wer mit 1.1.0 hochgeladen hat, behält 0666 für jede Datei, die das Manifest nicht neu überträgt.
  Die Doku sagt „einmal ‚Alles neu hochladen‘“; die Oberfläche sagt es nicht. Reicht das?
- Stimmt die Beschreibung des ssh2-Verhaltens (`WriteStream`, `fchmod`, Rückfall auf `chmod`) mit
  der installierten Fassung in `node_modules`? Gilt der Modus auch, wenn ssh2-sftp-client
  `fastPut` oder einen anderen Weg nimmt?

**2. `keepLocalModes` in drei Adaptern (`23a9523f`, `97958c01`, `afe5b90a`).**

- rsync mit `-p`: Wohin genau lädt der Relay-Upload, und kann `-p` den Modus eines Ordners ändern,
  der nicht dem Relay gehört (das Ziel selbst, die Webroot, wenn `subdir` leer oder `.` ist)? Was
  geschieht mit `deleteRemoved`, mit Excludes, mit der Vorschau (`preview`), wenn rsync bei null
  Dateien trotzdem läuft?
- SFTP: Der Ordner-Modus kommt aus `stat` des lokalen Ordners, `ensuredDirs` je Upload. Werden
  Zwischenordner, die `mkdir(…, true)` anlegt, gesetzt oder nicht, und muss das so sein? Was kostet
  `stat` nach jeder Datei bei einem langsamen Server?
- FTP: `modeNotes` liest `LIST` je Ordner. Passt der Vergleich bei Servern, deren `LIST` andere
  Formen liefert (MLSD, Windows-Format, Symlinks, Namen mit Leerzeichen), und bei Sonderbits
  (setgid auf Ordnern, die auf geteiltem Webspace häufig sind)? Kann eine Abweichung verschwiegen
  werden, die da ist?
- Eine Website-Veröffentlichung darf von all dem nichts merken (`keepLocalModes` fehlt). Stimmt das
  für jeden Adapter, auch für den Ordner-Adapter und den Webhook?

**3. `config.php` mit 0600 als Vorgabe (`23a9523f`).**

- Unter mod_php (und bei jedem Hoster, dessen PHP nicht als Account läuft) bricht 0600 das Relay;
  die Abfrage soll das sagen und der Button den Weg zeigen. Ist 0600 die richtige Vorgabe, gemessen
  an den Hostern, die Nutzer dieser App wahrscheinlich haben? Sagen Schalter und Satz, was 0644 auf
  einem geteilten Server kostet (Adressen und Secret für jeden Account lesbar)?
- Die Messung fand, dass ein OPcache, den sich FPM-Pools teilen, 0600 aushebeln kann. Gehört das in
  einen Satz für den Nutzer, oder nur in die Doku?
- Ein geänderter Modus lädt alles neu hoch. Was, wenn `lastUpload` aus einer Fassung vor 1.2 stammt
  (`configMode` fehlt)?

**4. Die Abfrage nach dem Upload (`23a9523f`, `0f58161d`).**

- **Was tut `GET send.php?challenge=…` auf dem Server?** Lies `send.php`: Zählt es gegen das
  Ratenlimit, schreibt es Dateien (Spent-Verzeichnis, Zähler), schickt es Mail, loggt es? Eine
  Abfrage, die nach jedem Upload Spuren hinterlässt oder ein Limit verbraucht, wäre ein Preis.
- Woher kommt die Adresse (`transportUrl` aus der Config), und kann sie auf etwas anderes zeigen als
  das, was gerade hochgeladen wurde (anderes Ziel, anderer Unterordner, alte Fassung)? Dann sagt
  „Das Relay antwortet“ etwas Falsches. Gleiches für die Origin und das erste Formular.
- Die Einteilung `phpError` (500 ohne JSON des Relays) gegen `relayError` gegen `http`: Gibt es
  Antworten echter Hoster, die falsch einsortiert werden (eine Fehlerseite des Hosters mit 500, ein
  WAF mit 403, ein Redirect auf HTTPS oder eine Login-Seite, eine 200 mit HTML)? Folgt `net.request`
  Redirects, und geht die Origin dann mit?
- Frist 10 s, 64 KiB, Zertifikatsfehler, Proxy, keine Netzverbindung: Bekommt jeder Fall eine
  eigene Antwort, und ist „unreachable“ nie ein „ok“? Läuft die Abfrage nur nach einem Upload, der
  gelungen ist?
- Die drei frühen Zeitüberschreitungen sind ungeklärt. Siehst du im Code einen Grund dafür?

**5. `countersServed()` (`243d1eee`).** Was genau wird abgefragt, und wann? Kann ein falsches „für
jeden lesbar“ entstehen (ein Proxy-Cache, eine Website, die `.htaccess` als Text ausliefert, obwohl
Zähldateien gesperrt sind) oder ein falsches Schweigen (Apache mit `AllowOverride None`, wo die
`.htaccess` nicht wirkt, die Datei aber trotzdem 403 bekommt, oder umgekehrt)? Stimmt der Satz mit
dem, was `counters/` wirklich preisgibt?

**6. Die Oberfläche (`FormsRelay.tsx`, Sprachdateien, `electron/main/i18n.ts`).**

- Wird der Satz der Abfrage einmal angesagt, steht er dort, wo der Zustand ist, und bleibt er
  stehen, wenn er nicht mehr stimmt (Schalter umgelegt, andere Adresse, anderes Projekt)?
- Der Button setzt den Schalter, lädt aber nicht hoch. Weiß der Nutzer danach, dass er noch einmal
  hochladen muss? Was geschieht, wenn die Seite `dirty` ist?
- Hinweise höchstens zwei Sätze, „QuartzControl“ statt „die App“, de und en gleich.

**7. Die Doku.** Halten die neue Regel in `docs/conventions.md`, ihre Langfassung und die Absätze in
`decisions/` dem Code stand? Stimmen die Zahlen (475 Dateien, die Modi je Weg), soweit du sie
nachmessen kannst?

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was auf dem Server des Nutzers etwas falsch setzt oder kaputt macht

Abwägungen 1 und 2: Modi, die jemand nicht wollte, an Orten, die nicht dem Relay gehören.

### 2. Was Absendern, Empfängern oder dem Betreiber schaden kann

Abwägungen 3, 4 (die Spuren der Abfrage) und 5.

### 3. Was QuartzControl falsch sagt

Abwägungen 4, 5 und 6: ein „ok“, das keines ist, ein Fehler, der keiner ist.

### 4. Was in der Doku nicht stimmt

Abwägung 7.

## Wenn du misst

Ändere nichts in diesem Repo, in quartz-forms, in einem Vault oder in einem Projekt unter
`~/Documents/QuartzProjekte`. Arbeite in Kopien in deinem Ordner `<scratchpad>/review-54/`. **Lies
nie etwas aus einem Projekt oder Vault namens `HinterlandHistory`/`hinterland-history`**, auch nicht
in einer Schleife über alle Projekte. **Keine Anfrage an einen Host außerhalb dieses Rechners und
der VM**; das Relay verschickt nichts nach außen, und so soll es bleiben.

**Die VM als Hoster:** `ssh debian-vm` (läuft gerade; Hostname aus Sicht des Mac `debian.local`).
Die Einrichtung steht in
`/Users/boxi/.claude/projects/-Users-boxi-Development-QuartzControl/memory/reference_relay_vm_harness.md`:
Account `qchost`, Webroot `/srv/qc/www`, Apache `:8441` (mod_php, `www-data`) und `:8442` (FPM-Pool
`qchost`), nginx `:8443` (FPM `www-data`), `:8444` (Pool `qchost`), `:8445` (`try_files`-Rückfall),
Account `qcsftp` mit SFTP ohne Modus-Änderung (`/srv/qc/www/nochmod`), vsftpd, Postfix nur lokal.
Der SSH-Schlüssel für beide Accounts und das FTP-Passwort liegen unter
`/private/tmp/claude-501/-Users-boxi-Development-QuartzControl/62a1ddd0-2d6c-4d64-bf4d-7fd46d34609e/scratchpad/relaytest/`
(`qchost_key`, `ftp_password`); dort auch das Messgeschirr dieser Runde (`app.mjs`, Kopie von gui-test
mit drei Formularen unter `site/`). **Lies es, aber ändere es nicht**; kopier, was du brauchst.

- Lade nur in eigene Unterordner unter `/srv/qc/www/review54-*` bzw. `/srv/qc/www/nochmod/review54-*`
  und räum sie am Ende weg.
- Änderungen an Diensten der VM (vsftpd, nginx, PHP, sshd) nur, wenn du sie am Ende
  zurückstellst, und sag im Bericht, was du geändert hattest. `sudo` geht ohne Passwort.

**Die App:**

- `git clone /Users/boxi/Development/QuartzControl <scratchpad>/review-54/qc`, dort `git checkout
  feat/1.2`, `npm ci`, `npm run build`. Starten mit `_electron.launch` aus `playwright-core` und einem
  eigenen `--user-data-dir` im Scratchpad, **nie mit dem echten Profil**; für das Snakeoil-Zertifikat
  der VM `--ignore-certificate-errors`. Die Muster stehen in `.claude/skills/run-desktop/SKILL.md`.
- Das Projekt ist eine eigene Kopie (`cp -Rc` von `relaytest/site`), deren
  `.quartz/plugins/quartz-forms` auf `/Users/boxi/Development/quartz-forms` zeigt oder auf einen Klon
  davon. Ist `content` ein Symlink, schreib nichts darunter.
- `npm run typecheck`, `npm run smoke` und `npm run check:i18n` im Klon.

**Im Browser** (falls du eine Website gegen das Relay schickst): Chrome über `playwright-core` mit
`channel: 'chrome'`, `ignoreHTTPSErrors`. Prüfskripte öffnen keine `mailto:`-Links. Testschlüssel für
OpenPGP mit gpg in einem kurzen `GNUPGHOME` unter `$(getconf DARWIN_USER_TEMP_DIR)`; räum die Ordner
am Ende weg und beende ihre Agenten.

## Was du ablieferst

Einen Bericht auf Deutsch in `<scratchpad>/review-54/review.md`:

- Befunde nach Gewicht (Hoch, Mittel, Niedrig), je mit Ort, Szenario, Beleg (gemessen oder gelesen,
  und womit) und einem Vorschlag;
- getrennt davon eine Liste „Nebenbei“ für Kleinigkeiten;
- am Ende ein Urteil, ob die Änderungen so mit 1.2 (und `6ff44e45` mit dem nächsten 1.1.x)
  veröffentlicht werden können, und was vorher geschehen muss.

Kennzeichne bei jedem Befund, ob du ihn gemessen oder nur gelesen hast.
