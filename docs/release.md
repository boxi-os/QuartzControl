# Vor einem Release

Was außerhalb von `npm run dist` getan werden muss, damit ein Release vollständig ist. Jeder Punkt
hier stand bis zum Review 2026-09-19 nur in Commit-Nachrichten und im Auftrag eines Reviews, also
in Dateien, die nach dem Release niemand mehr aufschlägt (Befund 7). Ein neuer Handgriff kommt mit
dem Anlass dazu, der ihn erzwungen hat.

Die Liste ist an dem gemessen, was für **Beta 2** tatsächlich getan wurde: Das sechzehnte Review
hat sie gegen `git log` und `git tag` gehalten und vier Handgriffe gefunden, die in *dieser Liste*
fehlten: die Fassungsnummer, der Tag, die Release-Seite und die Prüfung der Linux-Pakete. Für die
ersten drei heißt das zugleich „nur in Commit-Nachrichten“ — die Fassungsnummer steht sonst nur in
`d426f57` (vier Dateien), der Tag nur in `git tag`, die Release-Seite nur auf GitHub. Die Prüfung
der Linux-Pakete dagegen steht seit dem 2026-09-14 mit Messung in
[`electron-runtime-and-packaging.md`](decisions/electron-runtime-and-packaging.md) und in
`CLAUDE.md` unter `dist` („Ein Cross-Paket prüft man nicht mit dem Werkzeug darin“); ihr fehlte nur
der Platz hier. Alle vier stehen jetzt als Punkte 1, 6 und 7, und die fehlende Handbuch-Seite in
Punkt 3.

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

## 3. Das Handbuch steht online auf dem Stand der Fassung

Es reist seit dem 2026-09-18 nicht mehr mit; die App öffnet
`https://boxi-os.github.io/QuartzControl/` (`HANDBOOK_URL` in `electron/main/menu.ts`), und diese
Website wird mit dem Release veröffentlicht (Punkt 9). Die Pfade in `src/data/handbookPages.ts`
müssen dort existieren — nach einer Umbenennung im Vault alle 36 prüfen (sie antworten mit 200 oder
404).

Das Handbuch sollte auf dem Stand der App sein: `npm run check:handbook` nach dem letzten
Textdurchgang, und die Screenshots nach der letzten sichtbaren Änderung
(`npm run screenshots -- --demo --cards`, siehe [`handbuch.md`](handbuch.md)).

**Was `check:handbook` nicht sieht, ist alles außerhalb eines Blockzitats** — also jede Aufzählung,
die behauptet, vollständig zu sein. Beim Review 2026-09-28 war das 7.3: „Der Zustand einer Prüfung
ist **Aktuell**, **Update verfügbar** — oder **Nicht prüfbar**“, während die Updates-Seite seit
einer Runde einen vierten Zustand zeigt und genau dieses Kapitel im Kopf verlinkt. Wer einen
Zustand, eine Antwort oder einen Knopf hinzufügt, sucht im Vault nach der Liste, die ihn nicht
kennt (`grep -rn` auf die Beschriftungen der Geschwister) — und prüft dabei die englische Fassung
mit, die dort drei Beschriftungen nannte, die es in der App nie gab.

**Und es bekommt eine Seite „Neu in <Fassung>“**, zweisprachig, neben `neu-in-beta-1.md` /
`en/new-in-beta-1.md`. Am 2026-09-16 fehlte sie: Das Handbuch zu Beta 2 nannte als
neueste Seite „Neu in Beta 1“, während `latest.json` vier Änderungen aufzählt — wer die App
aktualisiert und im Handbuch nachsieht, findet nichts davon. Eine neue Seite auf
oberster Ebene muss außerdem in die `APPENDIX`-Liste in `scripts/build-handbook-pdf.mjs`; das
Skript bricht sonst ab, und genau dafür ist es da.

**Die Handbuch-Website lädt ihre eigenen Schriften nur, wenn sie einmal gebaut wurde, seit die
Schrift-URLs relativ sind.** `1df4ee4` schreibt `url("static/fonts/…")` statt
`url("/static/fonts/…")`; die zweite Form findet auf einer Website unter einem Unterpfad nichts,
und genau dort liegt das Handbuch (`boxi-os.github.io/QuartzControl`). Am 2026-09-19 gemessen: die
veröffentlichte CSS fragte `boxi-os.github.io/static/fonts/inter-latin-400-700.woff2` (404), die
Datei lag eine Ebene tiefer (200) — vier Schriften, keine geladen. Seit dem dreiunddreißigsten
Review zieht die Bau-Tür das nach (`styleService.migrateFontUrls`), also genügt **ein Bau** des
Handbuch- und des Web-Projekts **durch die App** — ein `npx quartz build` im Terminal geht an
dieser Tür vorbei; das Log sagt, wenn es passiert ist. Zu committen ist dabei nichts: Beide
Projekte sitzen auf Quartz' eigenem Commit und halten alles Eigene uncommittet, und das
Web-Projekt hat `origin` nur, um `gh-pages` zu schieben. Veröffentlicht wird also der *Bau*, über
das Ziel „GitHub Pages“ auf der Veröffentlichen-Seite. **Und ein Satz in den Release-Notizen** für
alle, deren Website unter einem Unterpfad liegt: Ihr nächster Bau in der App bringt die Schriften
zurück.

**Beide Projekte sind am 2026-09-20 durch die App gebaut** — nebenbei beim Entfernen der
Schriftvariablen (Punkt 4), denn dieselbe Tür schreibt beide Änderungen. Gemessen an der gebauten
Website unter einem Unterpfad (`/QuartzControl/`, wie GitHub Pages sie ausliefert), mit Chrome und
`CSS.getPlatformFontsForNode`:

| | geladene `@font-face` | `h1` rendert | 404 |
|---|---|---|---|
| mit `url(/static/…)`, dem alten Stand | **0** | `.SF NS` (Systemschrift) | 4 |
| mit `url(static/…)`, jetzt | 4 | Instrument Sans | 0 |

Die erste Zeile ist keine Erinnerung, sondern nachgestellt: in der *gebauten* CSS den Schrägstrich
wieder eingesetzt, gemessen, zurückgestellt.

**Die Messung gehört zum Deploy um 13:47 (`53445ee`), nicht zu dem am Abend.** Die CSS dieses
Deploys trägt die relativen URLs bereits; die des Deploys davor (`9ee7a37`, `index-03307897.css`)
trug die absoluten. Der Abend-Deploy (`7ececb0`, force-push, 1 neu / 135 geändert / 1 entfernt)
brachte die **Schriftvariablen** aus Punkt 4 auf die Website, nicht die URL-Form. An der echten
Adresse danach nachgemessen: `h1` in Instrument Sans, Fließtext in Inter, alle vier `@font-face`
geladen, keine Antwort über 400.

Zwei Dinge, die dabei auffielen und beim nächsten Mal Zeit sparen: Der Knopf „Jetzt
veröffentlichen" ist deaktiviert, solange in *dieser* Sitzung kein Diff berechnet wurde
(`canDeploy` in `Publish/index.tsx`) — also erst „Diff aktualisieren", dann veröffentlichen. Und
GitHub Pages liefert ein paar Minuten lang weiter die alte CSS aus; wer sofort nachsieht, misst
den Stand von vorher.

Am 2026-09-20 getan: beide Projekte gebaut (je 4 root-relative `url()` vorher, 0 nachher, die
Zeile im Log), im Bau des Web-Projekts vier `url(static/fonts/…)`, kein `fonts.gstatic.com` und
vier Dateien unter `public/static/fonts`; veröffentlicht nach `gh-pages`
(`9ee7a37` → `53445ee`, forced update), 171 geänderte, 10 entfernte, 8 neue Dateien.

## 4. Die Beispielvorlage liegt dreimal gleich

Die Vorlage existiert als Export (`~/Documents/QuartzProjekte/minimal-lesbar.qtpl`, Phase 10), als
mitgelieferte Kopie (`resources/templates/minimal-lesbar.qtpl`) und veröffentlicht in
`boxi-os/quartzcontrol-templates`. Die App nimmt die veröffentlichte, sobald das Netz antwortet,
und die mitgelieferte nur ohne Netz (`builtinTemplateService.ts`) — eine neu exportierte Vorlage,
die nicht gepusht ist, erreicht also niemanden, der online ist.

    npm run template:example -- --check-sync

vergleicht außer den Stylesheets auch die drei Kopien byte-weise und nennt je Kopie `createdAt`.
Exit 0 heißt: alle drei gleich. Ist die veröffentlichte nicht abrufbar, sagt es das und endet mit 1.

**Was `--check-sync` nicht sieht:** die Drift zwischen diesem Repo und den drei Kopien, sobald sie
aus `plugins.mjs`, `variables.mjs`, `layout.mjs` oder `frames.mjs` kommt. Die vier haben bewusst
keinen Rückweg (ein Rückleser wäre ihre zweite, inverse Umsetzung, siehe `CLAUDE.md`), und die
Kopien sind *untereinander* gleich, auch wenn alle drei veraltet sind. Der Aufruf antwortet dann
„deckungsgleich“ und meint nur die Stylesheets und die Schnipsel.

**`d4da5ef` ist am 2026-09-20 ausgerollt** (Befund 2 des Alpha-Tests, siehe
[`ALPHA-2026-09-20.md`](ALPHA-2026-09-20.md)): Phase 7 in der Werkstatt, Phase 5 für den
umbenannten Syntax-Marker, Phase 9/10 neu geprüft und exportiert, Phase 11 grün, und die
mitgelieferte Kopie ist gleichgezogen. **Auch die dritte** — `a54e3c4` hat die Datei nach
`boxi-os/quartzcontrol-templates` gepusht (`96ca8fe`); bis dahin bekam jeder, der online ist,
weiter die Vorlage vom 2026-09-14, denn die App zieht die veröffentlichte der mitgelieferten vor.
Die Vorlage hat jetzt 45 statt 50 Variablen. Am 2026-09-20 nachgemessen, nach dem Push:
`--check-sync` nennt alle drei Kopien mit 782 654 Bytes und demselben `createdAt`
(`2026-09-20T15:30:22.197Z`).

Dieser Absatz stand bis dahin auf „offen“, obwohl derselbe Commit den Push enthielt: `a54e3c4`
hat an dieser Datei nur Punkt 3 nachgezogen. Ein Punkt, der beschreibt, was noch zu tun ist, wird
von dem Commit geschlossen, der es tut — sonst liest der nächste Leser eine Liste, die ihn in
Arbeit schickt, die getan ist.

**Was die Gegenprobe gezeigt hat, und was hier vorher falsch stand.** Der Satz „die berechneten
Schriften dürfen sich dabei **nicht** ändern, denn Quartz' `joinStyles()` schreibt dieselben
Werte“ trifft nur die halbe Aussage. Gemessen an der gebauten Website der Werkstatt, acht Seiten
in hell und dunkel, 11 330 Elemente vorher und nachher:

- **Keine erste Familie, keine Schriftgröße und kein Gewicht hat sich bewegt** — 0 von 11 330.
- Die **Rückfall-Stapel dahinter** dagegen bei 10 680 Elementen. Die Vorlage schrieb
  `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`, Quartz schreibt
  `system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` plus die drei Emoji-Familien; beim
  Code-Stapel fällt `Consolas` weg.

Sichtbar wird das erst, wenn die erste Familie *nicht* lädt — und genau dann ist Quartz' eigener
Stapel die richtige Antwort, denn das ist der Zustand, den die fünf Zeilen verdeckt haben. Wer so
eine Zeile entfernt, misst also die erste Familie **und** den Stapel und sagt, welche Hälfte sich
bewegt.

**Bestehende Projekte erreicht das Ausrollen nicht** (ein Import unter `projectWins` behält die
Variablen, `styles.apply` holt den Block sogar zurück) — am 2026-09-20 acht von neun auf diesem
Rechner, alle bis auf `gui-test`. Für sie bleibt der Weg, den der Reiter „Basis“ seit dem
dreiunddreißigsten Review selbst nennt: der Hinweis unter jedem Schriftfeld und der Verweis auf
den Variablen-Reiter, wo „Zurücksetzen“ die Zeile wegnimmt. Das gehört in die Release-Notizen.

**Und wer als Nächstes an der Vorlage arbeitet:** `--check-sync` vergleicht die Stylesheets und
die drei Kopien gegeneinander, nicht das Repo gegen die Kopien — eine Drift, die aus `plugins.mjs`,
`variables.mjs`, `layout.mjs` oder `frames.mjs` kommt, sieht es nicht. Der Vergleich dafür ist von
Hand: die `key:`-Liste aus `variables.mjs` gegen den `css-vars`-Block der Werkstatt (am 2026-09-20
vor dem Ausrollen 45 gegen 50, Differenz genau die fünf Schriften).

## 4b. Die Liste der Google-Schriften ist nicht älter als das Release

    npm run fetch:google-fonts

schreibt `src/data/googleFonts.ts` neu und setzt dabei `GOOGLE_FONTS_FETCHED`. **Das Datum liest
der Nutzer** — in dem einen Satz unter einem Schriftnamen, den die Liste nicht hat („Diesen Namen
führt Google nicht (Liste vom …)“), also gerade dort, wo er entscheiden muss, ob er sich vertippt
hat oder die Liste alt ist. Es ist keine interne Notiz. Die
Liste ist eine Tipphilfe und keine Sperre — eine Familie, die dort fehlt, wird trotzdem geholt,
wenn sie richtig geschrieben ist —, aber eine Liste, die zwei Fassungen alt ist, bietet neue
Familien nicht an und sagt über sie „kennt Google nicht“. Der Lauf braucht nur Netz — Quelle ist
`fonts.google.com/metadata/fonts`, dieselbe Datei, aus der fonts.google.com seine eigene Liste
baut, kein Schlüssel. Der Kopfkommentar der Datei entsteht aus der Vorlage im Skript und übersteht
den Lauf (nachgeprüft: Zeile für Zeile gleich bis auf das Datum darin).

**Der Diff ist groß und sagt wenig.** Sortiert wird nach Googles Beliebtheitsrang, und der bewegt
sich täglich: Am 2026-09-20, zwei Tage nach dem Lauf davor, waren 1945 von 1946 Positionen
verschoben — und dabei **keine Familie dazugekommen, keine weggefallen, keine Kategorie geändert**.
Wer den Diff liest, liest also eine Rangliste, nicht einen Zuwachs.

## 5. Der Footer steht an sechs Stellen gleich

Die Links auf Quartz, QuartzControl, Example und die Plugin-Handbücher stehen in
`scripts/example-template/plugins.mjs` (daraus Example-Projekt und Vorlage) und von Hand in der
`quartz.config.yaml` von fünf Projekten, die nicht versioniert sind:

- `QuartzControl-Web`
- `QuartzControl-Handbuch` (nur noch Quelle des PDFs; online geht `QuartzControl-Web`)
- `quartz-layout-box-handbuch`
- `quartz-multilanguage-handbuch`
- `quartz-navigations-handbuch`

Am 2026-09-14 trugen alle sechs dieselben sechs Links. Ein neues Plugin oder eine neue Website
heißt: alle sechs anfassen, Vorlage neu exportieren (Punkt 4), die vier Websites neu
veröffentlichen. Der Footer des damals mitgelieferten Handbuchs hatte bis `f61333b` zwei Links, während
die Vorlage vier trug — genau die Drift, die eine Liste an sechs Orten erzeugt.

## 6. Die Pakete entstehen, starten und bekommen einen Tag

`npm run dist:mac` auf diesem Mac, `dist:linux` und `dist:flatpak` auf den VMs (Eintrag `dist` in
`CLAUDE.md`). Für Beta 2 waren das zehn Pakete: dmg und zip je
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
- **was eine ältere Fassung auf einem zweiten Rechner nicht mehr versteht.** Ein Satz, wenn die
  neue Fassung etwas in das Projekt schreibt, das die alte nicht liest. Der erste Fall ist der
  Marker in `custom.scss` (`Quartz-GUI:managed:` → `QuartzControl:managed:`, erste Fassung nach
  beta.2): Das erste Speichern auf der Stile-Seite — eine Variable, eine Schrift, die
  Reihenfolge — benennt *alle* Abschnitte der Datei um, und beta.2 sieht danach 0 Variablen,
  0 importierte Dateien und keinen Schriftblock; ein Klick dort bricht den Build. Gemessen am
  Bündel beider Fassungen für eine gespeicherte Variable (achtundzwanzigstes Review, Befund 2);
  Schrift und Reihenfolge gehen durch dieselbe Funktion (`renameLegacyMarkers`). Der Satz für die Notizen:
  „Wer ein Projekt auf mehreren Rechnern bearbeitet (Git-Sync), aktualisiert zuerst alle Rechner
  und öffnet das Projekt erst danach mit der neuen Fassung.“ Dasselbe Release benennt den Marker
  `Quartz-GUI:syntax:` in `scripts/example-template/` um (siehe `docs/conventions.md`, Absatz zu
  `.quartz-gui/`), und dann gehört der Satz auch in die Notizen der Vorlage.
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

`QuartzControl-Web` baut aus dem Handbuch-Vault (`content` ist ein Link
auf `~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`), trägt also sofort den neuen Text. Band und
Download-Kasten sind Schnipsel und nennen die Fassung ausdrücklich:

- `quartz/static/snippets/version.html` und `version.en.html` („Handbuch zur Fassung …“)
- `quartz/static/snippets/download.html` und `download.en.html` (Fassung und Pakete)

Die Kopie derselben vier Dateien im Handbuch-Vault unter `private/snippets/` wird mitgezogen (am
2026-09-14 alle vier byte-gleich). Veröffentlicht wird die Website erst zusammen mit dem Release,
nicht vorher — sonst beschreibt sie eine Fassung, die es zum Herunterladen noch nicht gibt.
