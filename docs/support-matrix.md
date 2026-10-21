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
| rsync über SSH, Server rsync 3.x, Client openrsync (macOS) | unterstützt | gemessen |
| rsync über SSH, Client rsync 3.x (Linux-App) | unterstützt | Messung ausstehend; bisher nur der `mkdir`-Befehl in der Shell |
| Konten, die per `rrsync` auf rsync beschränkt sind | geduldet | ohne App gemessen |
| FTP gegen vsftpd | unterstützt | gemessen (`debian-vm`, ohne chroot) |
| FTP gegen ProFTPD | unterstützt | Messung ausstehend (auf `debian-vm` aufsetzen) |
| FTP gegen Pure-FTPd | unterstützt | Messung ausstehend (auf `debian-vm` aufsetzen) |
| FTPS (explizit, `secure: true`) | geduldet | nicht gemessen |
| relativer Pfad über FTP ohne chroot | unterstützt | gemessen nach dem Fix `6f005a4e` (vorher „553“ bei der ersten Datei, seit 1.1.0) |
| Ordner, Webhook, Git-Branch | unterstützt | gemessen |

## Relay (quartz-forms)

| Fall | Stufe | Stand |
|---|---|---|
| Apache mit mod_php, Apache mit PHP-FPM, nginx mit PHP-FPM | unterstützt | gemessen auf `debian-vm` |
| PHP 8.4 und 8.5 mit mbstring | unterstützt | gemessen (8.4 auf `debian-vm`, 8.5 lokal) |
| PHP 8.1 bis 8.3 | unterstützt | Messung ausstehend (8.1 auf `debian-vm`: Relay-Tests und eine Sendung) |
| PHP unter 8.1, PHP ohne mbstring | nicht unterstützt | das Relay sagt es selbst |
| LiteSpeed und andere Webserver | geduldet | nicht gemessen |
| OPcache mit Standardwerten | unterstützt | gemessen |
| OPcache mit `validate_timestamps=0` oder `restrict_api` | geduldet | gemessen und behandelt (quartz-forms 0.5.12 bis 0.5.15, QuartzControl N4 des 56.) |
| Versand über `mail()` oder ein sendmail des Hosts | unterstützt | gemessen (Postfix lokal auf `debian-vm`) |
| SMTP | nicht unterstützt | nicht angeboten |
| ein CDN vor dem Server | geduldet | an der Attrappe gemessen |
| eine Weiterleitung an der Adresse von send.php | geduldet | an Attrappe und `debian-vm` gemessen; die Abfrage deutet fremde Antworten und kann irren |

## Rechte und Pfade auf dem Server

| Fall | Stufe | Stand |
|---|---|---|
| Der Ordner des Ziels gehört dem Upload-Konto, übliche Rechte | unterstützt | gemessen |
| „/“, „.“, „~“ als Ziel ohne Löschen | unterstützt | gemessen (N2 des 56.) |
| fremde Eigentümer, Ordner ohne Lese- oder Suchrecht, Symlinks auf dem Weg zum Relay | geduldet | sauber ablehnen, nicht weiter verfeinern |
| Tilde-Formen außer `~` und `~user` (`~+`, `~-`) | geduldet | an der Shell gemessen |

## Was ein Review damit tut

- Der Auftrag eines Reviews nennt diese Datei. Ein Befund nennt seine Stufe; ein Befund ohne Stufe
  wird vor dem Abarbeiten eingeordnet.
- Hoch und Mittel werden sofort abgearbeitet, wenn ihre Stufe es verlangt. Niedrig und Nebenbei
  werden gesammelt, und der Nutzer wählt aus.
- Findet eine Runde in einem Bereich nichts über Niedrig, gibt es für diesen Bereich keine weitere
  Runde, bis sich dort etwas ändert.
- Ein neuer Fall kommt mit seiner Stufe hierher, ein gemessener mit dem Commit der Messung.
