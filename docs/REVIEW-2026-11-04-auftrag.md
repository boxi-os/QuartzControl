Du bist als zweites Paar Augen an QuartzControl, dessen Fassung `1.1.1` (2026-10-22) draußen ist,
und an **quartz-forms**, einem eigenen Quartz-Plugin für Web-Formulare, das mit **1.2** (Branch
`feat/1.2`) veröffentlicht werden soll. Es geht um ein Review, nicht um Änderungen. Am Ende steht
eine Liste von Befunden, über die der Nutzer entscheidet.

## Warum diese Runde

Am 2026-10-25 hat der Nutzer quartz-forms zum ersten Mal echt senden lassen: das Testprojekt
`gui-test`, veröffentlicht über SFTP bei einem Hoster (all-inkl), das Relay über QuartzControl
hochgeladen, Mails an ein externes Postfach, mit und ohne JavaScript, verschlüsselt, anonym und mit
hCaptcha. Der Versand ging. Acht Befunde und eine Nebenbei-Liste kamen dabei heraus, und Claude
Opus 5.5 hat sie am selben Tag behoben, einen nach dem anderen:

1. Der Relay-Abschnitt sagte nicht, wo die Adresse von send.php eingetragen wird.
2. Die Prüfung nach dem Hochladen riet, eine Origin einzutragen, die schon eingetragen war; gemeint
   war die Basis-URL.
3. Das Relay gab `mail()` keinen Umschlag-Absender (`-f`); die Mails liefen mit dem Absender des
   Hosters, SPF passte nicht zur From-Domain.
4. Eine gespeicherte Änderung (Empfängeradresse, Secret, Formular), die erst mit dem nächsten
   Hochladen wirkt, wurde nur fern vom Ort der Änderung gesagt.
5. Die Antwortseite des Relays ohne JavaScript war eine nackte Seite ohne Viewport und ohne Weg
   zurück.
6. Ein Satz von quartz-forms sagte „die Prüfung unten“, das Captcha steht aber über dem Button.
7. Das Relay ließ sich hochladen, aber nicht wieder vom Server nehmen. Neu: „Vom Server entfernen“.
   Dabei gefunden: Eine abgelehnte Löschung hieß über FTP und SFTP „entfernt“.
8. Die Optionen des Relay-Abschnitts und der Formular-Leiste waren kaum voneinander abgegrenzt.

Nebenbei: zu schmale Textfelder, waagrechtes Scrollen bei 1000 px, der Hochladen-Bereich als Fuß
der Karte. quartz-forms ist als `0.5.16` erschienen (Tag gepusht, Repository weiter privat).

**Nichts davon hat ein Review gelesen.** Jede Messung in den Commit-Nachrichten und in diesem
Auftrag stammt von demselben Modell, das die Änderungen geschrieben hat. **Nimm nichts als gemessen
hin, nur weil es so dasteht.** Der echte Versand bei all-inkl ist nicht wiederholbar und gehört
nicht zu dieser Runde; was dort gemessen wurde, steht in den Commit-Nachrichten.

In der Zählung von `CLAUDE.md` ist das das **sechzigste** Review.

## Das Projekt

- **QuartzControl:** Electron + React + TypeScript, `/Users/boxi/Development/QuartzControl`. Lies
  zuerst `CLAUDE.md` **und `docs/conventions.md`**, das sie einbindet; die Begründungen stehen in
  `docs/decisions/conventions-full.md`. Für diese Runde zählen besonders:
  - die lange Regel „Was die App auf einen Server lädt, bekommt seinen Modus von der App …“
    (Prozessgrenze), samt Manifesten und „Als gelöscht zählt nur die Antwort des Servers“;
  - „Wer fragt, ob etwas noch gebraucht wird, sucht breit; wer löscht, löscht schmal.“
  - „Zwei Arten zu scheitern bekommen zwei Antworten“ und „Kann nicht prüfen ist nie alles gut.“
  - „Ein Satz über einen Zustand steht nicht in dem Kasten, den dieser Zustand mit sich nimmt.“ und
    „Eine Bedingung fragt das, was sie anzeigt.“
  - „Wer einen Nutzen misst, misst auch den Preis.“
- `docs/support-matrix.md`: was QuartzControl beim Veröffentlichen und beim Relay bedienen will;
  die Stufe eines Falls entscheidet, ob ein Befund behoben wird. Eine Zeile ist neu („Relay vom
  Server entfernen“).
- Die Deploy-Adapter liegen unter `electron/main/services/deploy/` (`index.ts` mit
  `runDirectoryUpload`, `sftp.ts`, `ftp.ts`, `rsync.ts`, `folder.ts`, `manifest.ts`), das Relay
  in `electron/main/services/formsService.ts`, der Reiter „Formulare“ unter
  `src/routes/Plugins/Forms.tsx`, `FormsRelay.tsx` und `formsOptions.ts`.
- **quartz-forms:** `/Users/boxi/Development/quartz-forms`, README (en/de), `CHANGELOG.md`,
  `AGENTS.md`, das Relay in `relay/php/send.php`, seine Tests in `test/relay.test.ts`.
- Die Handbücher sind Obsidian-Vaults: `~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`
  (App) und `~/Obsidian/QuartzProjekte/quartz-forms-handbuch` (Plugin).

## Umfang

    # QuartzControl, feat/1.2: elf Commits
    git log --reverse 91d15f3f..b111ad5d
    git diff 91d15f3f..b111ad5d
    # quartz-forms: fünf Commits, Tag v0.5.16 auf 76c0d90
    git -C ~/Development/quartz-forms log --reverse 4b12fe0..e2afa20
    # Handbücher (beide nur lokal, nicht gepusht)
    git -C ~/Obsidian/QuartzProjekte/QuartzControl-Handbuch show b7419c4
    git -C ~/Obsidian/QuartzProjekte/quartz-forms-handbuch show e37a6f6

## Abwägungen, die niemand gegengelesen hat

**1. Löschen auf einem fremden Server.** „Vom Server entfernen“ (`4b9d9eda`, `743cbedc`) geht
durch denselben Adapter wie ein Upload: SFTP, FTP und das Ordner-Ziel bekommen ein eigenes Manifest
mit genau den drei Pfaden und einen leeren lokalen Ordner, rsync die Filter `+ /<pfad>` und `- *`
mit `--delete`. Kann das irgendetwas anderes löschen als `send.php`, `config.php` und
`config.generated.php` am Ort des letzten Hochladens? Denk an `counters/` und was das Relay dort
schreibt, an einen Unterordner, der sich seit dem Hochladen geändert hat, an einen Symlink auf dem
Weg, an ein Ziel, dessen Ordner inzwischen eine andere Website hält, an einen leeren oder „~“-Pfad,
an Dateinamen mit Sonderzeichen. Berührt das Entfernen das Manifest der Website auf demselben Ziel
(`deploy-manifest-<id>.json`) oder ihr nächstes Veröffentlichen? Der Kopfkommentar von
`runDirectoryUpload` sagt „never `deleteRemoved`“, der Code setzt es beim Entfernen: Stimmt der
Code, stimmt der Kommentar?

**2. Was „entfernt“ heißt.** Seit `743cbedc` ist eine abgelehnte Löschung über SFTP und FTP ein
Fehlschlag. Das Ordner-Ziel wirft, rsync scheitert mit Exit 23. Sagen alle vier Wege dasselbe in
derselben Form, und bleibt der Stand „hochgeladen“ in jedem Fall, in dem eine Datei geblieben ist?
Was ist mit „lag kein Relay mehr“: Kann es kommen, obwohl Dateien liegen (etwa weil `stat` scheitert
oder der Server eine fremde Antwort gibt)? Was geschieht, wenn die Verbindung mitten im Entfernen
abreißt? Und was bleibt lokal: Adressen und Secrets bleiben bewusst. Sagt die Oberfläche das, und
sagt sie, dass `counters/` auf dem Server bleibt?

**3. Der Satz, der auf das nächste Hochladen wartet.** `6e7ceed5` sagt an der Empfängerzeile, an
der Captcha-Zeile, am Hochladen-Button und im Kopf der Formular-Leiste, dass eine gespeicherte
Änderung erst mit dem nächsten Hochladen wirkt. Wann verschwindet der Satz? Nach einem
fehlgeschlagenen Hochladen, nach „Vom Server entfernen“, nach dem Zurücksetzen auf den alten Wert,
nach einem Wechsel des Projekts oder der Route, nach einem Neustart? Fragt jede dieser Stellen den
Stand, den sie anzeigt (`operatorStamp`, Hash der Config), oder einen eigenen? Kann der Kopf der
Formular-Leiste „Relay seit dem Hochladen geändert“ sagen, obwohl das Formular gar nicht über das
Relay sendet, oder schweigen, obwohl es das tut?

**4. Die Prüfung nach dem Hochladen.** `4fff1a2c` rechnet nach, ob die Origin in der Liste steht,
„nach der Regel von send.php“. Ist das eine Abschrift dieser Regel, und prüft sie
`check:plugin-copies` oder sonst etwas gegen das Plugin? Stimmen die drei Sätze (nicht gelistet,
gelistet, ohne Origin) mit dem, was das Relay wirklich tut, auch mit leerer Liste, Groß- und
Kleinschreibung, Port, Schrägstrich am Ende, `http` statt `https`?

**5. Der Umschlag-Absender.** `d8d3fb9` gibt `-f<adresse>` an `mail()` und an einen
sendmail-Befehl ohne eigenes `-f`. Was kostet das auf einem Hoster, der `-f` nur für bestimmte
Adressen zulässt oder ganz verbietet: Scheitert der Versand dann, wo er vorher ging, und sagt das
jemand (Relay, QuartzControl, README)? Ist das Einsetzen in die Kommandozeile dicht (Leerzeichen,
Anführungszeichen, ein Name mit `<…>`, IDN, eine Adresse mit `-` am Anfang)? Der README sagte
schon vorher, SPF prüfe die From-Domain; gibt es einen Ausweg für den, der den alten Weg braucht?

**6. Die Seite ohne JavaScript.** `183154e` verlinkt nach dem Senden auf den Referer, wenn er auf
der Origin der Website liegt, sonst auf die Startseite aus `sitePath` (neu in
`config.generated.php`). Ist das eine offene Weiterleitung oder eine Stelle für eingeschleustes
HTML (Referer mit Anführungszeichen, `javascript:`, `//fremd`, Pfad mit `..`, Unicode)? Was tut ein
Relay mit einer alten `config.generated.php` ohne `sitePath`? Welche Referrer-Policy hat eine
Quartz-Seite, und kommt der Referer überhaupt beim Relay an, wenn es auf einem anderen Host liegt?
`AGENTS.md` (`e2afa20`) nennt einen neuen Schlüssel, den QuartzControl liest, „minor“; `sitePath`
kam in einer Patch-Fassung. Liest QuartzControl ihn, und ist `0.5.16` nach der eigenen Regel
richtig gezählt?

**7. Der Preis der Gestaltung.** `e5902d0b` lässt jedes einzeilige Textfeld des Optionen-Formulars
mit seinem Inhalt wachsen (`field-sizing: content`), für alle Plugins. `08eb1b2f` ändert die
Spalten von `DetailLayout` unter `xl` für zwölf Seiten. `637db274` und `d891af5b` ziehen Linien und
einen Fuß. Was ändert sich auf den Seiten, die mit den Mailtest-Befunden nichts zu tun haben
(lange Werte, leere Felder, Platzhalter, schmale Fenster, dunkel)? Kennt Electron 43
`field-sizing`? Ist der klebende Kopf der Formular-Leiste mit Tastatur und Screenreader bedienbar,
verdeckt er beim Tabben ein fokussiertes Feld?

**8. Die Texte.** Neue und geänderte Sätze in `de.ts`/`en.ts` und `electron/main/i18n.ts`, die
zwei Handbuch-Commits (App: Abschnitt „Formulare“ in `4-gestaltung/08-plugins.md` und `en/…`;
Plugin: der Captcha-Satz), `docs/release.md` (`b111ad5d`) und die neue Zeile der Matrix. Stimmen
sie mit der Oberfläche überein, sagen de und en dasselbe, halten sie die Regeln für Hinweise und
Bestätigungsdialoge ein (höchstens zwei Sätze, Frage und ein Satz Folgen)? Die Bilder im Handbuch
zum Relay-Abschnitt sind nicht neu aufgenommen; nenn, was sie jetzt falsch zeigen.

## Worauf es ankommt, in dieser Reihenfolge

1. **Was auf einem Server etwas löscht, das nicht gelöscht werden soll, oder ein Geheimnis liegen
   lässt, während QuartzControl „entfernt“ sagt** (Abwägungen 1, 2).
2. **Was auf der Website eines Nutzers still kaputtgeht oder nicht mehr sendet** (Abwägungen 5, 6).
3. **Was QuartzControl falsch sagt** (Abwägungen 3, 4, 8).
4. **Was es kostet** (Abwägung 7).

## Wenn du misst

Ändere nichts in diesem Repo, in quartz-forms, in einem Vault oder in einem Projekt unter
`~/Documents/QuartzProjekte` (auch nicht in `gui-test`, das noch auf den Mailtest eingestellt ist).
Arbeite in Kopien in deinem Ordner
`/private/tmp/claude-501/-Users-boxi-Development-QuartzControl/d080bb0e-97a9-4eb3-87ff-8ad696247b2f/scratchpad/review-60/`
(im Folgenden `<r60>`).

- **Lies nie etwas aus einem Projekt oder Vault namens `HinterlandHistory`/`hinterland-history`**,
  auch nicht in einer Schleife oder einem `grep` über alle Projekte.
- **Keine Anfrage an einen Host außerhalb dieses Rechners**, außer `npm ci` in deinen Klonen und dem
  Klonen von `github:boxi-os/*`, das ein Import oder `quartz plugin add` selbst tut. Insbesondere
  nichts an `quartzmac.borkel.net`, an all-inkl oder an ein echtes Postfach; keine echte Mail.
- **`debian-vm`** (per `ssh debian-vm`, Account `boxi` mit `sudo`) ist die lokale Test-VM, die als
  Hoster dient: Apache und nginx mit PHP, SFTP, rsync, vsftpd, ProFTPD und Pure-FTPd, Postfix nur
  lokal. Wie sie aufgebaut ist, steht in der Nachricht, mit der du gestartet wurdest. Antwortet sie
  nicht, ist sie aus; dann nenn, was dadurch ungemessen bleibt. Arbeite dort nur in eigenen Ordnern
  (`/srv/qc/www/review60-*` oder `~boxi/review60-*`), lege keine Konten an und ändere keine
  Passwörter, Schlüssel oder Server-Konfiguration; was du an Rechten eines eigenen Ordners änderst
  (etwa 555 für eine abgelehnte Löschung), setzt du zurück.
- Hat die Rechteprüfung einen Schritt abgelehnt, umgeh ihn nicht auf anderem Weg. Nenn ihn im
  Bericht als nicht gemessen.

**Die App:**

- `git clone /Users/boxi/Development/QuartzControl <r60>/qc`, dort `git checkout feat/1.2`,
  `npm ci`, `npm run build`. Für Vorher-Messungen ein zweiter Klon auf `91d15f3f`.
- Starten mit `_electron.launch` aus `playwright-core` und einem eigenen `--user-data-dir` in
  `<r60>`, **nie mit dem echten Profil**. Die Muster stehen in `.claude/skills/run-desktop/SKILL.md`.
- Ein Projekt mit quartz-forms legst du in `<r60>` an: als Kopie von `gui-test`
  (`~/Documents/QuartzProjekte/gui-test`, `content/` dort ist ggf. ein Symlink: in der Kopie nicht
  hineinschreiben, sondern durch einen eigenen Ordner ersetzen) oder frisch mit
  `npx quartz plugin add github:boxi-os/quartz-forms`. Welches quartz-forms die App hochlädt,
  entscheidet der Paketname im Projekt (`.quartz/plugins/quartz-forms` bzw. `node_modules`), nicht
  ein Quellpfad; eine Kopie mit Symlinks per `cp -RL`.
- `npm run typecheck`, `npm run smoke` und `npm run check:i18n` im Klon, `npm run check` im Klon
  von quartz-forms.
- Das Relay ohne VM: `php -S` über einem Ordner-Ziel in `<r60>`, ein Ersatz für sendmail, der seine
  Argumente aufschreibt. Eine Seite öffnest du mit `chromium.launch({ channel: 'chrome' })`.

## Was du ablieferst

Einen Bericht auf Deutsch in `<r60>/review.md`:

- Befunde nach Gewicht (Hoch, Mittel, Niedrig), je mit Ort, Szenario, Beleg (gemessen oder gelesen,
  und womit) und einem Vorschlag.
- Getrennt davon eine Liste „Nebenbei“ für Kleinigkeiten.
- Zu jeder der acht Abwägungen eine Antwort, auch wenn sie „kein Befund“ lautet.
- Am Ende ein Urteil: ob die Änderungen so mit 1.2 veröffentlicht werden können, und was vorher
  geschehen muss.
- Was du auf dem Mac und auf `debian-vm` angelegt hast.

Kennzeichne bei jedem Befund, ob du ihn gemessen oder nur gelesen hast.
