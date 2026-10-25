# Unterstützungsmatrix: Veröffentlichen und Relay

Festgelegt am 2026-10-21 mit dem Nutzer, nach dem 56. Review. Anlass: Sechs Review-Runden über das
Hochladen und das Relay fanden je Runde etwa gleich viele Punkte (54.: 15 Befunde und 13 nebenbei,
55.: 10 und 10, 56.: 7 und 14). Die Befunde wurden leichter, aber nicht weniger. Alle sieben
Befunde des 56. hingen an Fixes des 55., und viele Funde betrafen Konfigurationen, von denen nirgends
stand, ob QuartzControl sie überhaupt bedienen will. Diese Datei sagt das jetzt. Die Stufe eines
Falls entscheidet, was mit einem Befund geschieht.

## Die drei Stufen

- **Unterstützt:** gemessen (an der gebauten App gegen einen echten Server, wo es geht). Jeder
  Befund wird behoben und nachgemessen.
- **Geduldet:** soll funktionieren, ist aber nicht oder nur gelesen geprüft. Ein Befund wird nur
  behoben, wenn Daten verloren gehen, fremde Dateien oder Ordner berührt werden oder ein Geheimnis
  offenliegt. Sonst bekommt er einen Satz hier und, wo Nutzer ihn brauchen, im Handbuch.
- **Nicht unterstützt:** steht hier. Wo QuartzControl den Fall erkennt, sagt es das. Befunde
  werden nicht bearbeitet.

„Messung ausstehend“ heißt: Die Stufe ist entschieden, die Messung, die sie trägt, fehlt noch. Bis
dahin gilt der Fall als geduldet.

## Wo QuartzControl läuft

| Fall | Stufe | Stand |
|---|---|---|
| macOS arm64 | unterstützt | gemessen (`docs/release.md`) |
| Linux x64: deb, AppImage, Flatpak, ab glibc 2.34 | unterstützt | gemessen auf den VMs |
| macOS x64 | geduldet | gebaut, nie gestartet (kein Intel-Mac) |
| Windows | nicht unterstützt | kein rsync, keine Shell für `-e`; es gibt kein Paket |
| glibc unter 2.34, git unter 2.38 | nicht unterstützt | Entscheidung vom 2026-10-18 |

## Übertragung

| Fall | Stufe | Stand |
|---|---|---|
| SFTP gegen OpenSSH (`sftp-server`, `internal-sftp`) | unterstützt | gemessen auf `debian-vm` |
| SFTP mit Passwort an einem Server, der Passwörter nur über keyboard-interactive annimmt (etwa FreeBSD) | nicht unterstützt | QuartzControl schickt nur die Methode `password`; der Satz `sshPasswordRejected` sagt seit `98b7168a`, dass ein richtiges Passwort dann nicht reicht (gemessen mit einem zweiten sshd auf `debian-vm`, 58. Review, N5). Stufe mit dem Nutzer eingeordnet (2026-10-22) |
| SFTP und rsync über einen SSH-Agent mit mehr Schlüsseln als `MaxAuthTries` | geduldet | gemessen (58. Review, N5): `sshTooManyKeys` rät zur Schlüsseldatei (`98b7168a`). Stufe mit dem Nutzer eingeordnet (2026-10-22) |
| SFTP mit `ChrootDirectory` | Messung ausstehend | |
| SFTP-Server außer OpenSSH (ProFTPD `mod_sftp`, SFTPGo) | geduldet | nicht gemessen |
| rsync über SSH, Server rsync 3.x, Client openrsync (macOS) | unterstützt | gemessen |
| rsync über SSH, Client rsync ab 3.2.4 (Linux-App) | unterstützt | gemessen 2026-10-21 (rsync 3.5.0 auf `debian-vm`, gebaute App beider Linien, Server auf derselben Maschine; nicht aus deb, AppImage oder Flatpak). Schützt die Argumente bis auf die Wildcards: „fix58-v[a]“ ging in einen vorhandenen Ordner `fix58-va`, „$x“ und „#1“ blieben wörtlich (58. Review, N4); die Ablehnung der Zeichen der Shell braucht es also auch hier |
| rsync über SSH, Client rsync 3.0 bis 3.2.3 (etwa RHEL 9) | Messung ausstehend | schützt die Argumente nicht und wertet Zeichen der Shell aus wie openrsync (57. Review, N4, gelesen); die Ablehnung dieser Zeichen hängt nicht am Client (`131b92cb`, Fix-Linie `a1d9aef3`) |
| rsync und ssh in den Linux-Paketen (deb, AppImage, Flatpak) | Messung ausstehend | alle rsync-Messungen liefen außerhalb des Pakets |
| Konten, die per `rrsync` auf rsync beschränkt sind | geduldet | mit App gemessen (57. Review): die Website mit und ohne `-wo`; das Relay unter `-wo` abgelehnt, weil es nicht lesen darf (`relayDirWriteOnly`, `82f68bd8`) |
| FTP gegen vsftpd | unterstützt | gemessen (`debian-vm`, ohne chroot; Reihe `fix56/ftp-suite.sh`) |
| FTP gegen ProFTPD | unterstützt | gemessen 2026-10-21 (1.3.8c aus Debian im Container auf `debian-vm`, mit und ohne chroot) |
| FTP gegen Pure-FTPd | unterstützt | gemessen 2026-10-21 (1.0.50 aus Debian im Container auf `debian-vm`, mit und ohne chroot) |
| FTPS (explizit, `secure: true`) | geduldet | nicht gemessen |
| FTP-Server, die `SIZE` sperren (vsftpd `cmds_denied`, ProFTPD `<Limit SIZE>`) | geduldet | vsftpd gemessen (57. Review, N1): Eine abgelehnte Löschung zählt dort wieder als gelöscht, die Datei bleibt online und verlässt das Manifest. Daten gehen nicht verloren, fremde Dateien bleiben unberührt; ProFTPD nicht gemessen |
| relativer Pfad über FTP ohne chroot | unterstützt | gemessen nach dem Fix `6f005a4e` (vorher „553“ bei der ersten Datei, seit 1.1.0) |
| FTP-Server, deren Antwort auf `PWD` basic-ftp nicht lesen kann | geduldet | hinter einem Proxy gemessen (`4de01109`, `d9d42887`): ein absoluter Pfad geht wie in 1.1.0, ein relativer und „~“ bekommen `ftpPwdUnreadable` mit der Antwort des Servers und dem Rat zum absoluten Pfad |
| Pfad mit Leerzeichen über SFTP und FTP | unterstützt | gemessen im 57. Review (Website absolut und relativ auf allen vier Wegen, Relay in „forms/a b“) |
| Ordner, Webhook, Git-Branch | unterstützt | gemessen |
| Ordner-Ziel auf einem Wechsel- oder Netzlaufwerk | unterstützt | gemessen mit einem Disk-Image (`6dba3247`, `fde8d49e`): fehlt der Ordner oder enthält er keine der veröffentlichten Dateien (auch ein Mountpoint mit nur einer `.DS_Store`), lehnt ein schon veröffentlichtes Ziel ab; der Mountpoint unter Linux nur nachgestellt, ein Netzlaufwerk (SMB, NFS) nicht gemessen |
| Ordner, den ein anderes Programm nach jedem Lauf leert | geduldet | gemessen (58. Review, N2): jeder Lauf lehnt ab, bis „Alles neu hochladen“ gewählt wird (Handbuch 6.5); mit 1.1.0 lief das. Stufe mit dem Nutzer eingeordnet (2026-10-22) |

## Relay (quartz-forms)

| Fall | Stufe | Stand |
|---|---|---|
| Apache mit mod_php, Apache mit PHP-FPM, nginx mit PHP-FPM | unterstützt | gemessen auf `debian-vm` |
| PHP 8.4 und 8.5 mit mbstring | unterstützt | gemessen (8.4 auf `debian-vm`, 8.5 lokal) |
| PHP 8.1 bis 8.3 | unterstützt | 8.1.34 gemessen 2026-10-21 (alle 61 Relay-Tests; Apache im Container: Upload, Abfrage, Sendung aus Chrome); 8.2 und 8.3 dazwischen nicht einzeln |
| PHP unter 8.1, PHP ohne mbstring | nicht unterstützt | das Relay sagt es selbst |
| LiteSpeed und andere Webserver | geduldet | nicht gemessen |
| OPcache mit Standardwerten | unterstützt | gemessen |
| OPcache mit `validate_timestamps=0` oder `restrict_api` | geduldet | gemessen und behandelt (quartz-forms 0.5.12 bis 0.5.15, QuartzControl N4 des 56.); mit `restrict_api` und `revalidate_freq` über 3 s kommt die zweite Frage zu früh, und die Abfrage sagt „ein anderes Relay“ (57. Review, gelesen) |
| PHP mit `disable_functions=mail` oder `open_basedir` | geduldet | nicht gemessen |
| Versand über `mail()` oder ein sendmail des Hosts | unterstützt | gemessen (Postfix lokal auf `debian-vm`); der Absender geht seit quartz-forms 0.5.16 als `-f` mit (bei all-inkl gemessen), ein Hoster, der das ablehnt, bekommt den Schalter „Absender als Umschlag-Absender (-f)“ (60. Review, M3; nur an einer sendmail-Attrappe gemessen) |
| SMTP | nicht unterstützt | nicht angeboten |
| ein CDN vor dem Server | geduldet | an der Attrappe gemessen |
| eine Weiterleitung an der Adresse von send.php | geduldet | an Attrappe und `debian-vm` gemessen; die Abfrage deutet fremde Antworten und kann irren |
| Relay vom Server entfernen (Ordner, SFTP, rsync, FTP) | unterstützt | Mailtest-Befund 7 (2026-10-25): löscht nur send.php, config.php und config.generated.php am Ort des letzten Hochladens, `counters/` bleibt; Ordner lokal und SFTP/rsync auf `debian-vm` (Account `boxi`, Home statt Webroot) gemessen, auch mit fehlenden Dateien, fehlendem Ordner und geändertem Unterordner/Ziel; FTP gegen vsftpd, ProFTPD und Pure-FTPd (Account `qchost`, ohne chroot) mit denselben Fällen gemessen. Eine abgelehnte Löschung (Ordner 555) ist seit dem Fix nach Befund 7 über FTP und SFTP ein Fehlschlag, der Stand bleibt „hochgeladen“; vorher hieß sie „vom Server entfernt“, und config.php blieb liegen. rsync scheiterte schon vorher richtig. Ein Ordner ohne `x` (644, auch der darüber) hieß über FTP noch „lag kein Relay mehr“, weil `SIZE` dort für eine vorhandene Datei ebenfalls 550 sagt und `LIST` eine leere Liste gibt (60. Review, H1); seit dem Fix fragt FTP, ob sich der Ordner öffnen lässt, und sagt sonst „konnte nicht geprüft werden“, der Stand bleibt, gemessen auf allen drei Servern. rsync und das Ordner-Ziel sagen eine abgelehnte Löschung seit M1 desselben Reviews in denselben Sätzen wie SFTP und FTP; das Ordner-Ziel versucht dabei alle drei Dateien. Ein geänderter Unterordner entfernt am hochgeladenen; ein geändertes Ziel (Ordner, Pfad, Zugang) wird abgelehnt, und der Satz nennt seit M2 den alten Ort und Zugang |

### Behoben aus den Messungen vom 2026-10-21

- Eine abgelehnte Löschung über FTP zählte als gelöscht, bei allen drei Servern (550 für beides):
  `466117a2` fragt danach `SIZE`.
  In einem Ordner ohne `x` sagt auch `SIZE` 550, für eine Datei, die da ist; seit dem Fix nach dem
  60. Review (H1) zählt eine Datei nur als weg, wenn sich ihr Ordner öffnen lässt oder der Ordner
  darüber ihn nicht zeigt. Für die Website heißt das: Sie bleibt im Manifest, und der nächste
  Upload löscht sie.
- „~/…“ hieß je Weg etwas anderes: `e41df35f` löst „~“ und „~<eigenes Konto>“ über SFTP und FTP
  selbst zum Anmeldeverzeichnis auf, „~<anderes Konto>“ wird abgelehnt.
- Auf `fix/1.1.x` lehnte rsync nur Leerzeichen im Pfad ab, nicht die übrigen Zeichen der Shell;
  unter openrsync (macOS) wertete die entfernte Shell sie aus, und „…$x“ mit Löschen löschte in
  einem fremden Ordner (M1 des 57. Reviews). Behoben mit `a1d9aef3`, wie `131b92cb` auf `feat/1.2`.

## Rechte und Pfade auf dem Server

| Fall | Stufe | Stand |
|---|---|---|
| Der Ordner des Ziels gehört dem Upload-Konto, übliche Rechte | unterstützt | gemessen |
| „/“, „.“, „~“ als Ziel ohne Löschen | unterstützt | gemessen (N2 des 56.) |
| „~/…“ und „~<eigenes Konto>/…“ | unterstützt | gemessen über SFTP, rsync und alle drei FTP-Server (`e41df35f`) |
| „~<anderes Konto>/…“ über SFTP und FTP | nicht unterstützt | QuartzControl sagt es (`deployTildeOtherAccount`); über rsync löst die Shell es auf |
| fremde Eigentümer, Ordner ohne Lese- oder Suchrecht, Symlinks auf dem Weg zum Relay | geduldet | sauber ablehnen, nicht weiter verfeinern |
| ProFTPD mit `ShowSymlinks off` | geduldet | nicht gemessen; ein Link erscheint als Ordner, und die Symlink-Frage des Relays sieht ihn nicht |
| „~“ bei einem Konto, dessen Sitzung nicht im Home beginnt (`internal-sftp -d`, vsftpd `local_root`) | geduldet | gelesen (57. Review, N4): SFTP nimmt den Startordner der Sitzung, FTP `PWD`, rsync `$HOME`, und das sind dann zwei Ordner. Ein Wechsel zwischen SFTP und rsync behält das Manifest (`locationKey` ohne `transfer`) |
| Tilde-Formen außer `~` und `~user` (`~+`, `~-`) über rsync | geduldet | an der Shell gemessen |

## Was ein Review damit tut

- Der Auftrag eines Reviews nennt diese Datei. Ein Befund nennt seine Stufe; ein Befund ohne Stufe
  wird vor dem Abarbeiten eingeordnet.
- Hoch und Mittel werden sofort abgearbeitet, wenn ihre Stufe es verlangt. Niedrig und Nebenbei
  werden gesammelt, und der Nutzer wählt aus.
- Findet eine Runde in einem Bereich nichts über Niedrig, gibt es für diesen Bereich keine weitere
  Runde, bis sich dort etwas ändert.
- Ein neuer Fall kommt mit seiner Stufe hierher, ein gemessener mit dem Commit der Messung.
