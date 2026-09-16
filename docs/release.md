# Vor einem Release

Was außerhalb von `npm run dist` getan werden muss, damit ein Release vollständig ist. Jeder Punkt
hier stand bis zum Review 2026-09-19 nur in Commit-Nachrichten und im Auftrag eines Reviews, also
in Dateien, die nach dem Release niemand mehr aufschlägt (Befund 7). Ein neuer Handgriff kommt mit
dem Anlass dazu, der ihn erzwungen hat.

Die Liste ist an dem gemessen, was für **Beta 2** tatsächlich getan wurde: Das sechzehnte Review
hat sie gegen `git log` und `git tag` gehalten und vier Handgriffe gefunden, die wieder nur in
Commit-Nachrichten standen — die Fassungsnummer, der Tag, die Release-Seite und die Prüfung der
Linux-Pakete. Sie stehen jetzt als Punkte 1, 6 und 7 hier, und die fehlende Handbuch-Seite in Punkt 3.

Die Reihenfolge ist die, in der die Punkte voneinander abhängen.

## 1. Die Fassungsnummer steht in vier Dateien

`package.json`, `package-lock.json` (die zwei Zeilen des Wurzelpakets) und beide READMEs
(Versionszeile und „ist da“). Der Absatz zu „ist beschädigt“ in den READMEs nennt weiter
`1.0.0-beta.1` — nur diese Fassung trägt die defekte Signatur, die Zahl dort ist keine
Fassungsnummer, sondern ein Befund. `npm run check:semver` danach: der Update-Hinweis vergleicht
die Nummer als semver, nicht als Zeichenkette.

## 2. Nichts liegt auf einem Branch, der nie gemergt wurde

    for b in $(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes); do
      git cherry <release-branch> "$b" | grep -q '^+' && echo "$b"
    done

Was ein `+` zeigt, wird gemergt oder bewusst verworfen (Regel in `CLAUDE.md`, „Ein Fix auf einem
Branch, der nie gemergt wurde, ist keiner“). Am 2026-09-14 zeigte nur `origin/gh-pages` eines —
der Deploy-Branch, erwartet.

## 3. Das Handbuch reist mit

`beforePack` baut es aus `~/Documents/QuartzProjekte/QuartzControl-Handbuch` und **bricht ab**,
wenn das Projekt fehlt. Auf einer Baumaschine ohne das Projekt (die VMs) vorher die auf dem Mac
gebaute Website spiegeln und `QUARTZCONTROL_HANDBOOK_SITE` darauf setzen; wie, steht im Eintrag
`build:handbook` in `CLAUDE.md` (tar durch ssh, mit `COPYFILE_DISABLE=1` und `--no-xattrs`).
Im Bau-Log steht, welcher Weg gegriffen hat.

Das Handbuch sollte dabei auf dem Stand der App sein: `npm run check:handbook` nach dem letzten
Textdurchgang, und die Screenshots nach der letzten sichtbaren Änderung
(`npm run screenshots -- --demo --cards`, siehe [`handbuch.md`](handbuch.md)).

**Und es bekommt eine Seite „Neu in <Fassung>“**, zweisprachig, neben `neu-in-beta-1.md` /
`en/new-in-beta-1.md`. Am 2026-09-16 fehlte sie: Das Handbuch, das mit Beta 2 reist, nennt als
neueste Seite „Neu in Beta 1“, während `latest.json` vier Änderungen aufzählt — wer die App
aktualisiert und im mitgelieferten Handbuch nachsieht, findet nichts davon. Eine neue Seite auf
oberster Ebene muss außerdem in die `APPENDIX`-Liste in `scripts/build-handbook-pdf.mjs`; das
Skript bricht sonst ab, und genau dafür ist es da.

## 4. Die Beispielvorlage liegt dreimal gleich

Die Vorlage existiert als Export (`~/Documents/QuartzProjekte/minimal-lesbar.qtpl`, Phase 10), als
mitgelieferte Kopie (`resources/templates/minimal-lesbar.qtpl`) und veröffentlicht in
`boxi-os/quartzcontrol-templates`. Die App nimmt die veröffentlichte, sobald das Netz antwortet,
und die mitgelieferte nur ohne Netz (`builtinTemplateService.ts`) — eine neu exportierte Vorlage,
die nicht gepusht ist, erreicht also niemanden, der online ist.

    npm run template:example -- --check-sync

vergleicht außer den Stylesheets auch die drei Kopien byte-weise und nennt je Kopie `createdAt`.
Exit 0 heißt: alle drei gleich. Ist die veröffentlichte nicht abrufbar, sagt es das und endet mit 1.

## 5. Der Footer steht an sechs Stellen gleich

Die Links auf Quartz, QuartzControl, Example und die Plugin-Handbücher stehen in
`scripts/example-template/plugins.mjs` (daraus Example-Projekt und Vorlage) und von Hand in der
`quartz.config.yaml` von fünf Projekten, die nicht versioniert sind:

- `QuartzControl-Web`
- `QuartzControl-Handbuch` (erreicht die App erst über `build:handbook`)
- `quartz-layout-box-handbuch`
- `quartz-multilanguage-handbuch`
- `quartz-navigations-handbuch`

Am 2026-09-14 trugen alle sechs dieselben sechs Links. Ein neues Plugin oder eine neue Website
heißt: alle sechs anfassen, Vorlage neu exportieren (Punkt 4), die vier Websites neu
veröffentlichen. Der Footer des mitgelieferten Handbuchs hatte bis `f61333b` zwei Links, während
die Vorlage vier trug — genau die Drift, die eine Liste an sechs Orten erzeugt.

## 6. Die Pakete entstehen, starten und bekommen einen Tag

`npm run dist:mac` auf diesem Mac, `dist:linux` und `dist:flatpak` auf den VMs (Eintrag `dist` in
`CLAUDE.md`, und Punkt 3 oben für das Handbuch). Für Beta 2 waren das zehn Pakete: dmg und zip je
für arm64 und x64, AppImage und deb je für arm64 und x86_64, Flatpak für aarch64 und x86_64.

**Jedes Paket wird auf einer Maschine seiner Architektur einmal gestartet**, und zwar bevor die
Release-Seite steht. Beta 1 hat gezeigt, warum: Ihr arm64-AppImage startete auf keiner Debian-VM
ohne Entwicklerpakete („error while loading shared libraries: libz.so“), und das fiel erst beim Bau
von Beta 2 auf — der Fix war `toolsets.appimage: '1.0.3'` (`ab29d48`), ein statisch gelinktes
Startprogramm. Ein Cross-Paket wird nicht mit dem Werkzeug darin geprüft (`--appimage-extract`
startet die fremde Laufzeit), sondern auf der VM seiner Architektur.

Dann der Tag: `git tag v<version>` auf dem Commit, der die Fassungsnummer trägt (Punkt 1), und
pushen. Beta 2 ist `v1.0.0-beta.2`.

## 7. Die Release-Seite trägt Pakete, Notizen und Prüfsummen

Die Seite, auf die Punkt 8 zeigt. Drei Teile:

- **die Pakete** aus Punkt 6 als Assets (Beta 2: zehn; das Handbuch-PDF aus
  `npm run build:handbook-pdf` war nicht dabei),
- **die Notizen** — was sich seit der vorigen Fassung geändert hat, in derselben Gliederung wie
  die Seite „Neu in …“ aus Punkt 3,
- **die Prüfsummen** als eigener Abschnitt „Checksums (SHA-256)“:

      cd release && shasum -a 256 <die Paketdateien>

  Am 2026-09-16 gegengeprüft: die zehn Zeilen auf der Seite von Beta 2 stimmen mit
  `shasum -a 256` über die Dateien in `release/` überein.

## 8. `latest.json` nennt die neue Fassung

Der Hinweis auf eine neuere Fassung auf der Startseite liest
`https://raw.githubusercontent.com/boxi-os/quartzcontrol-templates/main/latest.json`
(`appUpdateService.ts`, sechs Stunden Cache): `version`, `url` auf die Release-Seite, `notes`.
Erst setzen, wenn die Release-Seite mit ihren Paketen online ist — sonst führt der Hinweis ins
Leere. Am 2026-09-16 abgerufen: `1.0.0-beta.2`, `url` auf die Release-Seite des Tags, `notes` mit
vier Änderungen.

## 9. Die Website nennt die neue Fassung — und wird erst mit dem Release veröffentlicht

`QuartzControl-Web` baut aus demselben Vault wie das mitgelieferte Handbuch (`content` ist ein Link
auf `~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`), trägt also sofort den neuen Text. Band und
Download-Kasten sind Schnipsel und nennen die Fassung ausdrücklich:

- `quartz/static/snippets/version.html` und `version.en.html` („Handbuch zur Fassung …“)
- `quartz/static/snippets/download.html` und `download.en.html` (Fassung und Pakete)

Die Kopie derselben vier Dateien im Handbuch-Vault unter `private/snippets/` wird mitgezogen (am
2026-09-14 alle vier byte-gleich). Veröffentlicht wird die Website erst zusammen mit dem Release,
nicht vorher — sonst beschreibt sie eine Fassung, die es zum Herunterladen noch nicht gibt.
