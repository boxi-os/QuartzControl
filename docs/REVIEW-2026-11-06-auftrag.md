Du bist als zweites Paar Augen an QuartzControl, dessen Fassung `1.2.0` (2026-10-26) draußen ist.
Auf dem Branch `feat/1.3` ist das erste große Vorhaben für 1.3 fertig: der **Export als PDF, ePub
und Offline-HTML** (Zieltyp „Dokument“). Es geht um ein Review, nicht um Änderungen. Am Ende steht
eine Liste von Befunden, über die der Nutzer entscheidet.

## Warum diese Runde

Das ist in der Zählung von `CLAUDE.md` die **zweiundsechzigste** Runde, die erste auf `feat/1.3`.
Der Export ist an einem Tag in zwanzig Commits entstanden. Danach wurde er gemessen: in Apple Books,
Calibre und Thorium, unter Linux, beim Mitladen über alle Wege und am Unsaved-Guard der neuen Seite.
**Jeder dieser Commits ist von demselben Modell gemessen, das ihn geschrieben hat.** Gelesen hat
ihn noch niemand sonst.

**Nimm nichts als gemessen hin, nur weil es so dasteht.** Das gilt für die Commit-Nachrichten, für
`docs/decisions/export.md`, für `docs/support-matrix.md` und für diesen Auftrag.

## Das Projekt

- **QuartzControl:** Electron + React + TypeScript, `/Users/boxi/Development/QuartzControl`. Lies
  zuerst `CLAUDE.md` **und `docs/conventions.md`**, das sie einbindet; die Begründungen stehen in
  `docs/decisions/conventions-full.md`. Für diese Runde zählen besonders:
  - die neuen Regeln „Ein Dokument entsteht aus der gebauten Website“, „Ein Hilfsfenster ist kein
    Fenster der App“, „Was das Exportfenster von außen lädt, ist eine Regel“, „Wer ein gerendertes
    Ergebnis abholt, wartet, bis es fertig ist“ und „Im ePub ist nur Text, was der Reader
    umgestalten darf“;
  - „Fremdes Markup, das auf die Website geht, wird neu geschrieben, nicht durchgereicht“;
  - „Ein Ausgabeordner hat einen Schreiber“, „Eine Route ist gemountet, und sie besitzt ihr
    Dokument“, „Verlassen mit ungespeicherten Änderungen fragt“;
  - „JSON-Stores nur über `jsonStore.ts`“ mit der Ausnahme für `quartz-books/`;
  - „Kann nicht prüfen ist nie alles gut“, „Eine Messung trägt nur so weit wie ihr Instrument“.
- **Der Plan** des Vorhabens: `~/.claude/plans/dann-lass-uns-mal-toasty-stream.md`. Er sagt, was
  gewollt war. Wo der Code davon abweicht, frag, ob die Abweichung gesagt ist.
- `docs/decisions/export.md`: Vorher-Messung, Entscheidungen und Messungen des Exports.
- `docs/support-matrix.md`: Was QuartzControl bedienen will. Die Stufe eines Falls entscheidet, ob
  ein Befund behoben wird.
- **Das Handbuch-Kapitel 6.8** im Vault `~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`
  (git, Commits `1cdda55` und `cdcdd3f`, nicht gepusht). Die Website des Handbuchs ist noch nicht
  neu veröffentlicht.

## Umfang

    # A: der Export, Schritt für Schritt (Plan-Schritte 1 bis 12)
    git log --reverse fea45cdc^..43fdc49e
    # B: was die Messungen danach geändert haben
    git log --reverse 43fdc49e..feat/1.3
    # das Ganze
    git diff --stat fea45cdc^..feat/1.3      # 53 Dateien, rund 5400 Zeilen
    # C: das Handbuch-Kapitel
    git -C ~/Obsidian/QuartzProjekte/QuartzControl-Handbuch show 1cdda55 cdcdd3f

Der Kern liegt in `electron/main/services/export/`, `electron/main/services/bookService.ts`,
`electron/main/services/deploy/` (Adapter `document`, Staging für „Dokumente mitladen“),
`shared/exportModel.ts`, `src/routes/Documents/` und `scripts/build-handbook-pdf.mjs`.

## Abwägungen, die niemand gegengelesen hat

**1. Das Exportfenster lädt die Website des Nutzers.** Ein unsichtbares Fenster ohne Preload, mit
Sandbox und eigener Sitzung, lädt eine Kopie des Baus über einen Server auf `127.0.0.1`. Die
Website bringt eigenes JavaScript mit (Plugins, eingebettetes HTML im Markdown).
- Was kann Code der Website in diesem Fenster erreichen: das Netz, andere Pfade des lokalen
  Servers, Dateien außerhalb der Kopie, den Hauptprozess, ein neues Fenster, eine Navigation?
- Was der Export aus dem Fenster zurückholt (Artikel-HTML, Titel, Tags, Links), wird zu PDF, ePub
  und Offline-HTML. Wird es dabei neu geschrieben oder durchgereicht? Kann eine Seite Markup
  einschleusen, das im ePub oder im Offline-HTML Skript ausführt, aus dem Dokument hinauslädt oder
  epubcheck bricht?
- Hält die Pfadprüfung des Servers (`..`, kodierte Schrägstriche, Symlinks in `public/`)?
- Was zählt die Sperrliste der Anfragen, und sagt der Bericht die Wahrheit über das, was geladen
  oder gesperrt wurde?

**2. Die Reihenfolge kommt aus der gerenderten Navigation.** Gelesen wird der Navigationsbaum der
Startseite, ersatzweise `contentIndex.json`.
- Woran erkennt der Export, welche Navigation er liest (quartz-navigations, Explorer, keine)? Was
  geschieht mit einer Website, die beides hat, oder einer, deren Navigation erst per Skript
  entsteht?
- Stimmen Sprache, Kapitelebene und Ordnerseiten bei einer zweisprachigen Website (Example, de und
  en) mit dem überein, was die Website zeigt?
- Was geschieht mit einer eigenen Reihenfolge, wenn danach Seiten dazukommen, umbenannt oder
  gelöscht werden?

**3. PDF mit zwei Durchgängen.** Erst drucken, die Zielseiten der Lesezeichen aus dem PDF lesen,
eintragen, neu drucken; danach Metadaten mit `pdf-lib`.
- Kann der zweite Durchgang andere Seitenzahlen ergeben als der erste (längeres Verzeichnis,
  Register mit Seitenzahlen), und merkt der Export das?
- Stimmen Lesezeichen, Seitenbeschriftung, Sprache und Tagging im fertigen PDF?
- Was geschieht bei Abbruch, bei einer Seite, die nie fertig lädt, bei einem Mermaid-Diagramm, das
  nicht rendert?
- Ist das Ergebnis von `build:handbook-pdf` mindestens so gut wie die Vorher-Messung des alten
  Skripts (`fea45cdc`, `docs/decisions/export.md`)?

**4. Das ePub.** Eine XHTML-Datei je Seite, eigenes Lese-CSS, Formeln und Diagramme als PNG,
Fußnoten als `noteref`/`footnote`, feste Kennung je Buch.
- Besteht jedes ePub epubcheck, auch bei Seiten mit ungewöhnlichem Inhalt (leere Seiten, Seiten
  nur mit Einbettung, sehr lange Tabellen, Bilder ohne Größe, Unicode in Dateinamen, Anker mit
  Sonderzeichen)?
- Haben die Bilder der Formeln und Diagramme brauchbare Alternativtexte? Was liest ein
  Bildschirmleser an ihrer Stelle?
- Sind die Bilder scharf und vollständig, auch bei einem sehr breiten oder sehr hohen Diagramm?
- Was geschieht mit Elementen, die das ePub nicht kann (Formulare, iframes, Videos, Leinwände)?

**5. Das Offline-HTML.** Eine Datei, Bilder und Schriften als `data:`-URI, mit Größengrenze.
- Lädt die Datei offline geöffnet wirklich nichts aus dem Netz?
- Greift die Größengrenze vor dem Schreiben, und was sagt sie?
- Funktionieren Anker, Inhaltsverzeichnis, Fußnoten und Dark Mode?

**6. Das Buch als versionierte Datei** (`quartz-books/<id>.json`, außerhalb von `.quartz-gui/`).
- Was geschieht mit einer kaputten, unlesbaren oder von Hand geänderten Buchdatei? Mit zwei Büchern
  gleichen Titels? Mit einer Kennung, die ein Dateisystem nicht mag?
- Was tun Snapshots, „Duplizieren“, Git-Sync (`quartz sync`) und ein Restore mit `quartz-books/`
  und mit `.quartz-gui/staging/`?
- Bleibt die Kennung beim Umbenennen stabil, und ist das für den Nutzer verständlich?

**7. „Dokumente mitladen“.** Ein Website-Ziel lädt den letzten Export unter `downloads/` mit hoch,
über einen Staging-Ordner aus Hardlinks auf den Bau.
- Kann über einen Hardlink etwas in `public/` geschrieben oder geändert werden?
- Was geschieht, wenn die Website selbst einen Ordner `downloads/` hat, oder wenn „Löschen“ am Ziel
  an ist und das Dokument später abgewählt wird?
- Stimmen Vorschau (Diff), Bestätigung und Lauf überein?
- Was geschieht, wenn der Bau neuer ist als der Export oder der Export fehlt?
- Bleibt nach einem Abbruch oder Fehler ein Staging-Ordner liegen?
- Ist das auf allen Wegen gleich (Ordner, SFTP, rsync, FTP, Git-Branch)?

**8. Die Seite „Dokumente“** (`DetailLayout`, Drag, Unsaved-Guard, registriertes Speichern).
- Hält sie die Renderer-Regeln aus `docs/conventions.md` (Leiste verlassen, Fokus, Sticky-State,
  Ansagen, Drag mit Tastatur, Dark Mode)?
- Fragt jede Tür hinaus, und bleibt man bei einem gescheiterten Speichern auf der Seite?
- Was zeigt die Seite, wenn kein Bau da ist, das Buch kaputt ist oder der Export läuft?

**9. Bilder zeichnen in einem Offscreen-Fenster** (`writeEpub.ts`, `drawPictures`).
- Was kostet das (Zeit, Speicher) bei einem Buch mit vielen Formeln oder Diagrammen?
- Wird das Fenster an jedem Ausgang geschlossen, auch bei Abbruch und Fehler?
- Zählt es irgendwo als Fenster der App (Menü, Theme, Broadcast, Dock, Fensterliste)?

**10. 1.3 aus der Sicht eines Nutzers von 1.2.**
- Was schreibt 1.3 neu in `publish-targets.json`, in Projekte und ins Profil? Kann der Nutzer
  danach zu 1.2.0 zurück, und was tut 1.2.0 mit einem Ziel vom Typ `document` oder dem Feld
  `withDocuments`?
- Ist etwas aus `fix/1.2.x` nicht in `feat/1.3`?
- Steht im Export etwas, das nur für die Entwicklung gedacht war (Konsolenausgaben, Testpfade,
  Debug-Schalter)?

## Worauf es ankommt, in dieser Reihenfolge

1. **Was Code oder Inhalt einer Website aus dem Exportfenster heraus tun kann, oder was der Export
   an Dateien des Nutzers ändert, die er nicht ändern soll** (Abwägungen 1, 6, 7).
2. **Was auf einem Server etwas löscht oder liegen lässt, während QuartzControl Erfolg sagt**
   (Abwägung 7).
3. **Ein Dokument, das still falsch ist:** fehlende Seiten, falsche Reihenfolge, falsche
   Seitenzahlen, tote Verweise, ein ePub, das epubcheck nicht besteht (Abwägungen 2 bis 5, 9).
4. **Was QuartzControl, das Handbuch oder die Doku falsch sagt**, und alles Übrige (8, 10).

## Schon bekannt, nicht neu melden

Diese Punkte kennt der Nutzer. Melde einen nur, wenn er mehr kostet als hier steht:

- Die Hinweise zum Mitladen (Export älter als der Bau, Export fehlt) erscheinen erst nach dem Lauf,
  nicht in der Vorschau.
- Über SFTP und FTP bleibt ein leerer Ordner `downloads/` stehen, wenn das Dokument abgewählt wird.
- Im PDF zeigt ein Callout, der über einen Spaltenumbruch läuft, ein Stück seines Rahmens.
- Im Fußnoten-Popup der Reader steht der Rückpfeil „↩“ mit.
- Ein PDF-Lauf unter Linux dauerte einmal 234 s; das ließ sich nicht wiederholen.
- Nicht gemessen: Linux x86_64, X11, eine echte GPU, das helle Theme von Calibre.
- Bewusst nicht: Silbentrennung, PDF/A, PDF/X. Der Download-Link ist ein kopierbarer
  Markdown-Link, kein Layout-Box-Snippet (Abweichung vom Plan). Die Kennung eines Buchs bleibt beim
  ersten Titel.
- Die Handbuch-Website ist nicht neu veröffentlicht; der Link der Seite „Dokumente“ ins Handbuch
  zeigt bis dahin ins Leere. Die Bildschirmfotos für Kapitel 6.8 fehlen noch.

## Wenn du misst

Ändere nichts in diesem Repo, in einem Vault oder in einem Projekt unter
`~/Documents/QuartzProjekte`. Arbeite in Kopien in deinem Ordner
`/private/tmp/claude-501/-Users-boxi-Development-QuartzControl/0fceafef-82dd-4110-a694-000216ee4ffd/scratchpad/review-62/`
(im Folgenden `<r62>`).

- **Lies nie etwas aus einem Projekt oder Vault namens `HinterlandHistory`/`hinterland-history`**,
  auch nicht in einer Schleife oder einem `grep` über alle Projekte. Nimm es aus jeder Liste,
  **bevor** du sie durchläufst. Nenn den Namen nicht in deinem Bericht.
- **Keine Anfrage an einen Host außerhalb dieses Rechners.** Ausgenommen sind `npm ci` in deinem
  Klon und die Anfragen, die das Exportfenster selbst stellt (Google Fonts, Mermaid von
  `cdn.jsdelivr.net`). **Kein `git push`, kein `gh`, keine Änderung an einem Repository oder an
  GitHub Pages.**
- **`debian-vm`** (per `ssh debian-vm`, aarch64, Debian 13, GNOME auf Wayland) ist die lokale
  Test-VM. Antwortet sie nicht, ist sie aus; nenn dann, was dadurch ungemessen bleibt.
  - Über ssh setzt diese Zeile die Sitzungsumgebung: `eval "$(systemctl --user show-environment | sed 's/^/export /')"`.
  - Lange Läufe mit `setsid nohup … < /dev/null > log 2>&1 &` starten, je Aufruf nur ein
    `ssh -n -f`. `pkill -f`/`pgrep -f` über ssh treffen die eigene Kommandozeile.
  - epubcheck 5.4.0 liegt dort unter `~/epubcheck/epubcheck-5.4.0/epubcheck.jar` (OpenJDK 21).
  - Als Server: SFTP und rsync als `boxi` in eigenen Ordnern `~boxi/review62-*`; FTP (vsftpd) als
    `qchost` (Passwort in der Nachricht, mit der du gestartet wurdest) in `/srv/qc/www/review62-*`. curl-FTP-Pfade
    sind relativ zum Anmeldeordner (absolut mit `%2F`).
  - Code ohne Push hinbringen: `git bundle create x.bundle <von>..feat/1.3`, dort in einem eigenen
    Klon unter `~/review62/` holen.
  - Lege keine Konten an und ändere keine Passwörter, Schlüssel oder Server-Konfiguration. Was du
    an Rechten eines eigenen Ordners änderst, setzt du zurück.
- **Reader auf dem Mac:** Apple Books ist installiert. Calibre und Thorium liegen ausgepackt unter
  `/private/tmp/claude-501/-Users-boxi-Development-QuartzControl/0fceafef-82dd-4110-a694-000216ee4ffd/scratchpad/calibre-dl/`
  und `…/thorium-dl/`. Lehnt die Rechteprüfung den Start eines Readers ab, nenn das als nicht
  gemessen. Was du in Apple Books legst, nennst du am Ende, damit der Nutzer es entfernt.
- Hat die Rechteprüfung einen Schritt abgelehnt, umgeh ihn nicht auf anderem Weg. Nenn ihn im
  Bericht als nicht gemessen.

**Die App:**

- `git clone /Users/boxi/Development/QuartzControl <r62>/qc`, dort `git checkout feat/1.3`,
  `npm ci`, `npm run build`. Für Vorher-Messungen ein zweiter Klon auf `v1.2.0`.
- Starten mit `_electron.launch` aus `playwright-core` und einem eigenen `--user-data-dir` in
  `<r62>`, **nie mit dem echten Profil**. Die Muster stehen in `.claude/skills/run-desktop/SKILL.md`.
  Bücher, Ziele und Exporte lassen sich über `window.quartzGui.*` anlegen und starten
  (`books.save`, `publishTargets.save`, `deploy.run`). Native Fragen lassen sich über
  `app.evaluate` mit einem Ersatz für `dialog.showMessageBox` beantworten.
- `npm run typecheck`, `npm run smoke` und `npm run check:i18n` im Klon.
- Als Projekte nimm Kopien per `cp -RL` (ohne `node_modules`, ggf. mit Symlink) von `Example`
  (de und en, quartz-forms, Mermaid, Formeln), `QuartzControl-Handbuch` und `gui-test` aus
  `~/Documents/QuartzProjekte`. In einer Kopie mit Symlink auf einen Vault schreibst du nichts unter
  `content/`, bevor der Symlink aufgelöst ist.

## Was du ablieferst

Einen Bericht auf Deutsch in `<r62>/review.md`, im Aufbau wie `docs/REVIEW-2026-11-05.md`:

- Kopf mit Stand (Commit), Modell, was erreichbar war.
- Befunde nach Gewicht (Hoch, Mittel, Niedrig), je mit Ort, Szenario, Beleg (gemessen oder gelesen,
  und womit) und einem Vorschlag.
- Getrennt davon eine Liste „Nebenbei“ für Kleinigkeiten.
- Zu jeder der zehn Abwägungen eine Antwort, auch wenn sie „kein Befund“ lautet.
- Am Ende ein Urteil: ob der Export so in 1.3 gehen kann, und was vorher geschehen muss.
- Was du auf dem Mac, in Apple Books und auf `debian-vm` angelegt hast.

Kennzeichne bei jedem Befund, ob du ihn gemessen oder nur gelesen hast.
