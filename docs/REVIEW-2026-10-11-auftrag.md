Du bist als zweites Paar Augen an einem Projekt, dessen erster Release Candidate (`1.0.0-rc.1`,
2026-09-21) draußen ist. Die nächste Fassung soll **1.0.0** werden, ohne weiteren RC — das hat der
Nutzer am 2026-09-24 entschieden. Es geht um ein Review — nicht um Änderungen. Am Ende steht eine
Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Alles, was du liest, hat ein einziges Modell in einer einzigen Sitzung geschrieben**: Claude
Opus 5.5, am 2026-09-24, 28 Commits — und dieser Auftrag stammt aus derselben Sitzung. Es gibt
also keine zweite Hand, die zwischen Bau und Auftrag stand. Was hier als „gemessen“ steht, steht
aus der Erinnerung an die Messung und aus den Commit-Nachrichten; prüfe entsprechend. Eine Zahl,
die nicht stimmt, ist ein Befund.

**Und es ist die erste Runde, in der der Nutzer selbst gemessen hat**: Die Zahl der
Schlüsselbund-Dialoge (Schicht 4) hat er beim Start einer frisch signierten App gezählt, nicht ein
Skript. Das Systemprotokoll dazu habe ich gelesen, gezählt hat er.

In der Zählung von `CLAUDE.md` ist das das **siebenunddreißigste** Review. Die Dateinamen zählen
nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md` (der letzte Abschnitt betrifft diese Runde), der Release-Ablauf in
`docs/release.md`.

## Umfang

Von `review-2026-10-11` bis `review-2026-10-12`:

    git log --oneline review-2026-10-11..review-2026-10-12
    git diff review-2026-10-11..review-2026-10-12

Das sind 28 Commits und dieser Auftrag; ohne ihn 41 Dateien, +1138 / −237. Dazu Dinge außerhalb dieses
Repos (Schicht 3). Die Schichten stehen in der Reihenfolge, in der sie entstanden sind — nicht in
der, in der sie wiegen.

### Schicht 1 — die Fixes des sechsunddreißigsten Reviews (15 Commits)

`review-2026-10-11..4c0849e`. Elf Befunde und vier Nebenbei-Punkte aus
`docs/REVIEW-2026-10-10.md`; was daraus geworden ist, steht am Ende von `docs/reviews.md`. Das
Gewicht liegt in `src/routes/Styles/` (Variablen-Seite), dazu `projectIconService.ts`,
`templatePackage/parts.ts`, `styleService.ts`, `fontService.ts`, `Home.tsx`, `Templates.tsx`.

Zwei davon sind anders gelöst, als das Review vorschlug, und sagen es in der Commit-Nachricht:
Befund 7 (`78780fe`, das Projektbild in einem Git-Sync-Klon) und Befund 1 (`f661f11`, Memo mit
Leseaufzeichnung statt Kappung). Ein Befund (9) ist nur gelesen, nicht gemessen.

### Schicht 2 — Korrekturen beim Durchklicken der gepackten App (4 Commits)

- `05240c4` — `<main>` in `ProjectLayout` ist jetzt `relative`. Anlass: 60 `sr-only`-Spans auf
  Plugins → Installiert verlängerten das Dokument auf 6353 px, eine zweite Rollleiste entstand.
  **Das ändert den Bezugsrahmen jedes absolut positionierten Elements auf jeder Projektseite.**
- `cdaecb0` — die Git-Sync-Karte in voller Breite.
- `7d7b90d`, `b0fea2f` — „Komponente wählen“ auf Eigenes CSS: erst ohne Dubletten, dann mit einer
  gemessenen Tabelle der Selektoren (`src/data/componentSelectors.ts`), weil `.<Pluginname>` für
  ein Drittel der Komponenten auf der Website nichts trifft.

### Schicht 3 — die Marke im Kopf ist das Projektbild (5 Commits, und draußen)

- `efad25c` — Die Karte „Projektbild“ erkennt eine Layout-Box, die `static/icon.png` schon zeigt,
  und bietet dann den Kopfbereich-Schalter nicht an; `ProjectIconInfo` bekommt `unrecorded`
  (**Vertragsänderung**, additiv).
- `cf91aba` — alle vier Vorlagen-Varianten zeigen im Kopf `icon.png`/`icon-dark.png` statt eines
  Inline-SVG (Example, Doku, Plugin) bzw. `qc-mark-*.png` (Basis). Phase 4 setzt beides über
  `projectIcon.set/setDark`, `RETIRED_STATIC_FILES` räumt die alten Dateien aus der Werkstatt.
- `8d06f8c`, `3dd2025` — die Bilder randlos auf die Kachel beschnitten; hell die dunkle Kachel, die
  macOS für das App-Icon zeichnet, dunkel deren Farbumkehrung (in `site-mark.mjs` gerechnet).
- `72aceaf` — `.site-mark img { margin: 0 }` gegen Quartz' `img { margin: 1rem 0 }`.

**Außerhalb dieses Repos**, und damit ohne Diff, den du lesen kannst:

- `boxi-os/quartzcontrol-templates`, Commits `48c9d42` und `639a199`: `qc-basic.qtpl` und
  `qc-example.qtpl` neu veröffentlicht. **Jede ausgelieferte App holt `qc-basic` von dort, auch
  rc.1.**
- Fünf Quartz-Projekte unter `~/Documents/QuartzProjekte/` (`QuartzControl-Web`,
  `QuartzControl-Handbuch` und die drei Plugin-Handbücher): **von Hand** umgestellt — über die
  IPC-Kanäle der gebauten App das Projektbild gesetzt, das HTML der Marken-Box per
  `config.save` ersetzt, und die Zeile `margin: 0` direkt in ihre Kopie von
  `plugin-layout-box.scss` geschrieben (`QuartzControl-Handbuch` hatte eine ältere Kopie ohne
  Bildregel und bekam den ganzen Block). Keines dieser Projekte ist versioniert; die Sicherungen
  der Configs und Bilder von vorher liegen im Scratchpad der Sitzung (`backup-marks/`), nicht im
  Repo. Veröffentlicht ist keine dieser Websites.
- Handbuch-Vault `QuartzControl-Handbuch`, Commits `2250e2b` (4.4) und `c2bd180` (3.3), gepusht.

### Schicht 4 — der Schlüsselbund auf macOS (4 Commits), dein Schwerpunkt

- `0ee9356` — `getSecretStorageInfo()` fragt auf macOS `isEncryptionAvailable()` nicht mehr und
  antwortet `{ available: true, backend: null, secure: true }`. Anlass: Nach jedem Neubau (ad-hoc
  signiert, Identität = Hash des Builds) fragte der Start zweimal nach dem Schlüsselbund, bevor
  irgendein Zugangsdatum gebraucht wurde. **Vom Nutzer gemessen:** danach beim Start kein
  Schlüsselbund-Dialog mehr, nur die Ordner-Abfrage des Datenschutzes.
- `76918e9` und seine Rücknahme `4d2a96b` — die Vermutung, der zweite Dialog stamme aus der
  Vorab-Frage `isEncryptionAvailable()` vor `decryptString()`. **Vom Nutzer widerlegt:** ohne sie
  weiter zwei Dialoge beim ersten Git-Sync. Die Rücknahme ist ein `git revert`, weil ein
  `reset --hard` abgelehnt wurde; beide stehen also in der Geschichte.
- `1123831` — die Erklärung in `docs/decisions/electron-runtime-and-packaging.md` und im
  Kommentar an `getSecretStorageInfo`: **ein** Lesezugriff, zwei Prüfungen von `securityd`
  (`action:24`, als Zugriffsliste des Eintrags gelesen, und `action:65538`, als Partitionsliste
  gelesen), zu erkennen im Systemprotokoll (`/usr/bin/log show --info --debug`, Prozess
  `securityd`, „displaying keychain prompt“, beide mit derselben PID, rund zehn Sekunden
  auseinander). **Die Zuordnung der zwei Nummern zu „Zugriffsliste“ und „Partitionsliste“ ist
  meine Lesart, nicht nachgeschlagen.**

## Abwägungen, die niemand gegengelesen hat

**1. „Kann nicht prüfen“ oder „geprüft“? (`0ee9356`).** `docs/conventions.md` sagt: „‚Kann nicht
prüfen‘ ist nie ‚alles gut‘.“ Auf macOS antwortet `getSecretStorageInfo()` jetzt `secure: true`,
ohne gefragt zu haben. Begründet ist das damit, dass das Backend dort immer der Schlüsselbund ist
und ein verweigerter Zugriff dort auffällt, wo er zählt (`saveConnection` wirft, `decrypt()` gibt
`null`). **Ist das eine Aussage, die die Regel bricht, oder eine, die sie nicht betrifft? Und was
sieht ein Nutzer, der den Zugriff verweigert hat, an den Stellen, wo `decrypt()` `null` gibt —
etwa „kein GitHub-Token hinterlegt“, obwohl eines hinterlegt ist?**

**2. Die Leseaufzeichnung am Memo (`f661f11`).** `VariableRow` zeichnet über einen Proxy auf,
welche Schlüssel von `ctx.overrides` sie beim Rendern liest, schreibt das in eine Map, die der
Seite gehört — **während des Renderns** —, und der Vergleich des `memo` fragt nur diese Schlüssel.
Die Rückrufe vergleicht er gar nicht, mit der Begründung, sie schlössen nur über Setter. **Hält
das unter StrictMode, unter einem Render, den React verwirft, und für jeden Weg, auf dem eine
Zeile etwas liest, das nicht über `ctx.overrides` kommt?**

**3. Eine gemessene Tabelle statt einer Regel (`b0fea2f`).** Die Selektoren stammen aus einem
Build (Quartz 5.0.0, die Community-Plugins eines Projekts, 349 Seiten). Aktualisiert jemand ein
Plugin und es ändert seine Klasse, merkt die App das nicht. **Ist eine Tabelle, die still veraltet,
besser als der geratene Name, der sichtbar nichts trifft? Und ist die Kennzeichnung
„Klasse ungeprüft“ für Unbekanntes genug?**

**4. Das Projektbild der Vorlagen (Schicht 3).** Neue Projekte aus der Basis haben jetzt die
QuartzControl-Marke auch als Favicon, bis ein eigenes Bild gewählt ist. Und rc.1 — das die
Karten-Änderung aus `efad25c` nicht hat — holt das neue `qc-basic` schon: Dort steht der Schalter
„Im Kopfbereich zeigen“ auf aus, während die Marke das Bild zeigt, und Einschalten zeigt es
doppelt. **Ist das ein Grund, mit dem Veröffentlichen bis 1.0.0 zu warten, und ist er jetzt noch
einer, wo es draußen ist?**

**5. `relative` an `<main>` (`05240c4`).** Gemessen ist: Auf keiner der 20 Routen ist das Dokument
höher als das Fenster, und kein Code rechnet mit Seitenkoordinaten. **Nicht gemessen ist, ob ein
absolut positioniertes Element irgendwo — ein Aufklapper, eine Liste der Schrift-Combobox, ein
Tooltip — jetzt an einer anderen Stelle erscheint oder von `<main>` abgeschnitten wird.**

## Worauf es ankommt, in dieser Reihenfolge

### 1. Zugangsdaten

Schicht 4, gegen `docs/decisions/publishing-and-credentials.md` und den Absatz zu `safeStorage` in
`docs/decisions/electron-runtime-and-packaging.md`. Und Abwägung 1: jede Stelle, die
`connectionsService.decrypt()` indirekt ruft (`getSecret`, `getGithubToken`), und was sie dem
Nutzer sagt, wenn sie `null` bekommt. Der Linux-Weg ist unverändert, aber gelesen, nicht auf der
VM gemessen.

### 2. Was ein 1.0.0 ausliefern würde, das kein RC getragen hat

Alles in diesem Umfang. Lies Schicht 1 und 2 gegen die Regeln des Renderers in
`docs/conventions.md`, besonders „Ein Ref, den ein Effekt zurücksetzt …“, „Ein Bedienelement, das
seinen Wert von außen bekommt …“ und „Was im Renderer lebt …“ — die Variablen-Seite hatte an genau
diesen Stellen in früheren Runden Befunde.

### 3. Was der Nutzer verlieren kann

Drei Wege: ein Import unter „Vorlage gewinnt“ in ein Projekt, dessen `icon.png` weder von Quartz
noch markiert ist (`78780fe`: er ersetzt es und sagt es vorher); das Aufräumen von Schriftdateien
beim Import (`889316a`: sucht jetzt breiter); und die fünf von Hand geänderten Projekte (Schicht
3), deren Vorher nur im Scratchpad liegt.

### 4. Was draußen liegt

Zwei Pakete in `boxi-os/quartzcontrol-templates` — `--check-sync` meldete am 2026-09-24 alle Kopien
byte-gleich —, der Vault, die fünf Projekte. Veröffentlicht ist keine Website; ihr Stand ist also
der der Projekte, nicht der unter `boxi-os.github.io`.

## Was offen bleibt, und nicht für diese Runde

- **Die Zahl der Schlüsselbund-Dialoge** beim Speichern eines Zugangs und beim Veröffentlichen per
  SFTP: nur Git-Sync ist gezählt. Nur der Nutzer kann zählen — jede Messung braucht eine neu
  signierte App und seinen Klick.
- **macOS x64 auf einer Maschine seiner Architektur**, **ein Linux mit glibc unter 2.34**, **C1 auf
  einem Linux mit git vor 2.38** — wie in den Runden davor.

## Eine Frage über den Code hinaus

Getrennt von den Befunden, am Ende deines Dokuments:

**Trägt 1.0.0?** Der Nutzer hat entschieden, ohne weiteren RC auszuliefern. Seit rc.1 sind jetzt
zwei Runden Änderungen entstanden, darunter zwei additive Vertragsänderungen (`pages`, dann
`unrecorded`), eine geänderte Aussage über Zugangsdaten und ein Umbau der Vorlagen, der schon
veröffentlicht ist. Spricht aus dem, was du gelesen hast, etwas, das vor 1.0.0 behoben, und was,
das zurückgenommen werden sollte?

## Form der Befunde

Schreibe `docs/REVIEW-2026-10-11.md`. Je Befund: die Stelle (Datei, Funktion, Commit), was
passiert, wie es sich zeigt, was dagegen spräche es so zu lassen, und — wo du eine hast — eine
Richtung. Nach Gewicht sortiert, Hoch/Mittel/Niedrig. Was du gemessen hast, kennzeichne als
gemessen und sag womit; was du gelesen hast, als gelesen. Eine Behauptung dieses Auftrags, die
nicht trägt, ist ein Befund wie jeder andere.

**Ändere nichts am Code und committe nichts.** Die einzige neue Datei ist dein Dokument. Schreibe
in keinen Obsidian-Vault außer `Example` und `QuartzControl-Handbuch`, und in kein Projekt unter
`~/Documents/QuartzProjekte/` — Kopien mit `cp -Rc` sind der Weg (und `content/` ist dort oft ein
Symlink in einen Vault: in der Kopie darunter nichts schreiben). Für die gebaute App ein
Wegwerf-Profil (`--user-data-dir`). **Löse keinen Schlüsselbund-Dialog aus**: Eine gebaute App,
die unter dem Namen QuartzControl auf „QuartzControl Safe Storage“ zugreift, fragt den Nutzer auf
seinem Bildschirm. Das Electron aus `node_modules` hat den Zugriff, eine selbst gepackte App nicht.
**Veröffentliche nichts**: Die Pakete und die Projekte sind der Stand, gegen den du prüfst, nicht
der, den du bewegst.
