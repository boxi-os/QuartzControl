# Vor einem Release

Was außerhalb von `npm run dist` getan werden muss, damit ein Release vollständig ist. Jeder Punkt
hier stand bis zum Review 2026-09-19 nur in Commit-Nachrichten und im Auftrag eines Reviews, also
in Dateien, die nach dem Release niemand mehr aufschlägt (Befund 7). Ein neuer Handgriff kommt mit
dem Anlass dazu, der ihn erzwungen hat.

Die Reihenfolge ist die, in der die Punkte voneinander abhängen.

## 1. Nichts liegt auf einem Branch, der nie gemergt wurde

    for b in $(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes); do
      git cherry <release-branch> "$b" | grep -q '^+' && echo "$b"
    done

Was ein `+` zeigt, wird gemergt oder bewusst verworfen (Regel in `CLAUDE.md`, „Ein Fix auf einem
Branch, der nie gemergt wurde, ist keiner“). Am 2026-09-14 zeigte nur `origin/gh-pages` eines —
der Deploy-Branch, erwartet.

## 2. Das Handbuch reist mit

`beforePack` baut es aus `~/Documents/QuartzProjekte/QuartzControl-Handbuch` und **bricht ab**,
wenn das Projekt fehlt. Auf einer Baumaschine ohne das Projekt (die VMs) vorher die auf dem Mac
gebaute Website spiegeln und `QUARTZCONTROL_HANDBOOK_SITE` darauf setzen; wie, steht im Eintrag
`build:handbook` in `CLAUDE.md` (tar durch ssh, mit `COPYFILE_DISABLE=1` und `--no-xattrs`).
Im Bau-Log steht, welcher Weg gegriffen hat.

Das Handbuch sollte dabei auf dem Stand der App sein: `npm run check:handbook` nach dem letzten
Textdurchgang, und die Screenshots nach der letzten sichtbaren Änderung
(`npm run screenshots -- --demo --cards`, siehe [`handbuch.md`](handbuch.md)).

## 3. Die Beispielvorlage liegt dreimal gleich

Die Vorlage existiert als Export (`~/Documents/QuartzProjekte/minimal-lesbar.qtpl`, Phase 10), als
mitgelieferte Kopie (`resources/templates/minimal-lesbar.qtpl`) und veröffentlicht in
`boxi-os/quartzcontrol-templates`. Die App nimmt die veröffentlichte, sobald das Netz antwortet,
und die mitgelieferte nur ohne Netz (`builtinTemplateService.ts`) — eine neu exportierte Vorlage,
die nicht gepusht ist, erreicht also niemanden, der online ist.

    npm run template:example -- --check-sync

vergleicht außer den Stylesheets auch die drei Kopien byte-weise und nennt je Kopie `createdAt`.
Exit 0 heißt: alle drei gleich. Ist die veröffentlichte nicht abrufbar, sagt es das und endet mit 1.

## 4. `latest.json` nennt die neue Fassung

Der Hinweis auf eine neuere Fassung auf der Startseite liest
`https://raw.githubusercontent.com/boxi-os/quartzcontrol-templates/main/latest.json`
(`appUpdateService.ts`, sechs Stunden Cache): `version`, `url` auf die Release-Seite, `notes`.
Erst setzen, wenn die Release-Seite mit ihren Paketen online ist — sonst führt der Hinweis ins
Leere. Am 2026-09-14 stand dort `1.0.0-beta.1`.

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
heißt: alle sechs anfassen, Vorlage neu exportieren (Punkt 3), die vier Websites neu
veröffentlichen. Der Footer des mitgelieferten Handbuchs hatte bis `f61333b` zwei Links, während
die Vorlage vier trug — genau die Drift, die eine Liste an sechs Orten erzeugt.

## 6. Die Website nennt die neue Fassung — und wird erst mit dem Release veröffentlicht

`QuartzControl-Web` baut aus demselben Vault wie das mitgelieferte Handbuch (`content` ist ein Link
auf `~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`), trägt also sofort den neuen Text. Band und
Download-Kasten sind Schnipsel und nennen die Fassung ausdrücklich:

- `quartz/static/snippets/version.html` und `version.en.html` („Handbuch zur Fassung …“)
- `quartz/static/snippets/download.html` und `download.en.html` (Fassung und Pakete)

Die Kopie derselben vier Dateien im Handbuch-Vault unter `private/snippets/` wird mitgezogen (am
2026-09-14 alle vier byte-gleich). Veröffentlicht wird die Website erst zusammen mit dem Release,
nicht vorher — sonst beschreibt sie eine Fassung, die es zum Herunterladen noch nicht gibt.
