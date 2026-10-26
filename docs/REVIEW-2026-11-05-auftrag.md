Du bist als zweites Paar Augen an QuartzControl, dessen Fassung `1.1.1` (2026-10-22) draußen ist und
dessen Fassung **1.2** (Branch `feat/1.2`) als Nächstes erscheinen soll. Es geht um ein Review, nicht
um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Warum diese Runde

Das ist die **letzte Runde vor 1.2**, in der Zählung von `CLAUDE.md` die **einundsechzigste**. Seit
dem 2026-10-26 gilt für `feat/1.2` ein Freeze: Es kommt nur noch hinein, was ein Befund verlangt.
Danach folgt der Ablauf in `docs/release.md`, Punkte 1 bis 9.

Vier Dinge hat noch kein Review gelesen:

1. **Die Abarbeitung des sechzigsten Reviews** (2026-10-25): der Umschlag-Absender als Schalter,
   was „entfernt“ über FTP, rsync und ein Ordner-Ziel heißt, das Entfernen nur des eigenen Relays,
   die Origin-Regel gegen `send.php`. Jeder dieser Commits ist von demselben Modell gemessen, das
   ihn geschrieben hat.
2. **Die Vorlage** (`bb1a1cd3`): Seitenspalten, Kopf und Fuß bekommen eigene Flächen, die linke
   Spalte klebt. Dazu `bffc618b`, die Korrektur an `check:tokens`, die das belegt.
3. **Die Plugin-Website.** Die vier Plugin-Handbücher (quartz-layout-box, quartz-multilanguage,
   quartz-navigations, quartz-forms) sind seit dem 2026-10-26 **ein** Vault und werden **eine**
   Website, `https://boxi-os.github.io/quartz-plugins/`, mit einem Ordner je Plugin (`<plugin>/…`,
   englisch `en/<plugin>/…`) und einer gemeinsamen Startseite. Die git-Geschichte der vier Vaults
   ist per `filter-repo` übernommen, Links, `translationKey` und Tags sind per Skript umgeschrieben.
   Die drei alten Websites (forms hatte nie eine) werden am Release-Tag zu Weiterleitungen. Nichts
   davon ist online.
4. **`docs/release.md` als Plan für den Release-Tag**, vor allem die neuen Schritte für die
   Plugin-Website und für quartz-forms, das mit 1.2 öffentlich wird.

**Nimm nichts als gemessen hin, nur weil es so dasteht.** Das gilt für die Commit-Nachrichten, für
`docs/reviews.md` und für diesen Auftrag.

## Das Projekt

- **QuartzControl:** Electron + React + TypeScript, `/Users/boxi/Development/QuartzControl`. Lies
  zuerst `CLAUDE.md` **und `docs/conventions.md`**, das sie einbindet; die Begründungen stehen in
  `docs/decisions/conventions-full.md`. Für diese Runde zählen besonders:
  - die lange Regel „Was die App auf einen Server lädt, bekommt seinen Modus von der App …“
    (Prozessgrenze), mit den Zusätzen aus dem sechzigsten Review („Über FTP heißt 550 ‚fehlt‘ nur,
    wo sich der Ordner öffnen lässt. Das Relay entfernt nur sein eigenes“);
  - „Wer fragt, ob etwas noch gebraucht wird, sucht breit; wer löscht, löscht schmal.“
  - „Kann nicht prüfen ist nie alles gut“ und „Zwei Arten zu scheitern bekommen zwei Antworten“;
  - „Eine Maske beschneidet auch ein `position: fixed` in ihrem Stapelkontext, und eine klebende
    Spalte ist ebenfalls ein Stapelkontext.“
  - „Eine Messung trägt nur so weit wie ihr Instrument“ und „Drift läuft in beide Richtungen“;
  - „Ein Handgriff, der nur in einer Commit-Nachricht steht, wird beim nächsten Mal vergessen.“
- `docs/support-matrix.md`: was QuartzControl beim Veröffentlichen und beim Relay bedienen will; die
  Stufe eines Falls entscheidet, ob ein Befund behoben wird.
- `docs/reviews.md`, Einträge zum neunundfünfzigsten und sechzigsten Review: was gewählt und was
  bewusst nicht gewählt wurde. Ein dort abgelehnter Punkt ist kein neuer Befund, außer du zeigst,
  dass er mehr kostet als dort angenommen.
- **quartz-forms:** `/Users/boxi/Development/quartz-forms`, Tag `v0.6.0` auf `c126612`, Repository
  noch privat. Die drei anderen Plugins liegen daneben (`quartz-layout-box`, `quartz-multilanguage`,
  `quartz-navigations`), alle MIT, alle öffentlich.
- **Die Plugin-Website:**
  - Vault `~/Obsidian/QuartzProjekte/quartz-plugins-handbuch` (git, Remote privat
    `boxi-os/quartz-plugins-handbuch`). Erst `private/LIESMICH.md` lesen. Der Generator der
    Weiterleitungen: `private/redirects/make-redirects.mjs`.
  - Projekt `~/Documents/QuartzProjekte/quartz-plugins-handbuch`, eine Kopie des Forms-Projekts,
    `content/` ist ein Symlink auf den Vault. `origin` ist das öffentliche, leere
    `boxi-os/quartz-plugins` (nur für `gh-pages`). Ein Ziel zum Veröffentlichen gibt es noch nicht.
    `public/` ist am 2026-10-26 gebaut, mit quartz-forms 0.6.0, 282 Seiten.
  - Die Wegwerf-Skripte des Umbaus liegen in
    `/private/tmp/claude-501/-Users-boxi-Development-QuartzControl/0c2b7f79-77df-49cc-a099-1a5ea75c16c8/scratchpad/plugins/`:
    `rewrite.mjs` mit `lib.mjs` und `pathmap.json` (der Umbau), `linkcheck.mjs`, `navcheck.mjs`,
    `redircheck.mjs` (seine Prüfungen), `ghpages/<plugin>/` (Klone der alten `gh-pages`),
    `redirects/<plugin>/` (die erzeugten Weiterleitungen). Nur lesen.
  - Die vier alten Vaults (`~/Obsidian/QuartzProjekte/quartz-{layout-box,multilanguage,navigations,forms}-handbuch`)
    und ihre Projekte gleichen Namens sind der Stand vor dem Umbau.
- Die Vorlage: `scripts/example-template/` (Aufsatz `BEFUNDE.md`, Variablen in `variables.mjs`,
  Stylesheets in `styles/`), gebaut in `~/Documents/QuartzProjekte/Example` (Vault
  `~/Obsidian/QuartzProjekte/Example`).

## Umfang

    # A: die Abarbeitung des sechzigsten Reviews
    git log --reverse 155e783f..de5cd0cb
    # B: die Vorlage, die Website-Footer, release.md, check:tokens
    git log --reverse de5cd0cb..feat/1.2
    # C: die Plugin-Website
    # (die drei „Bring in“ sind Merges; der Forms-Vault ist die erste Elternlinie bis aa2e9b6)
    git -C ~/Obsidian/QuartzProjekte/quartz-plugins-handbuch log --first-parent --reverse aa2e9b6..HEAD
    git -C ~/Obsidian/QuartzProjekte/quartz-plugins-handbuch show de605ae --stat
    # D: die vier Plugins seit ihren Tags (unveröffentlichte Commits)
    git -C ~/Development/quartz-layout-box log v0.4.2..HEAD
    git -C ~/Development/quartz-multilanguage log v0.2.0..HEAD
    git -C ~/Development/quartz-navigations log v0.4.3..HEAD
    git -C ~/Development/quartz-forms log v0.6.0..HEAD
    # E: 1.2 als Ganzes, von außen gelesen
    git diff --stat v1.1.1..feat/1.2      # 242 Commits; die meisten haben Reviews 45 bis 60 gelesen
    docs/release.md

Für E sollst du nicht die 242 Commits noch einmal lesen. Lies 1.2 so, wie ein Nutzer von 1.1.1 es
erlebt, der das Update installiert.

## Abwägungen, die niemand gegengelesen hat

**1. Nur das eigene Relay löschen** (`742b5246`, `5be75e82`). Das Entfernen liest vorher
`config.generated.php` und löscht nur bei der `generation` des letzten Hochladens. Ein Zugang, der
inzwischen auf einen anderen Server zeigt, wird abgelehnt.
- Was geschieht, wenn sich die Datei nicht lesen lässt, kaputt ist, fehlt oder ein Symlink ist?
- Was, wenn die Verbindung zwischen Lesen und Löschen abreißt, oder wenn ein anderes Projekt genau
  dazwischen hochlädt?
- Worauf vergleicht „zeigt auf einen anderen Server“: Host, aufgelöste Adresse, Host-Key? Lehnt es
  einen Fall ab, den es durchlassen müsste (IPv4 gegen IPv6, ein neuer Host-Key nach einem Umzug
  des Hosters)?
- Sagen alle vier Wege (SFTP, FTP, rsync, Ordner) dasselbe?

**2. Was „weg“ heißt** (`8e7bb090`, `a234a8be`, `cbfbab87`, `f837b2b8`, `f07b19f9`). Über FTP zählt
eine Datei nur dort als fehlend, wo sich ihr Ordner öffnen lässt. rsync und das Ordner-Ziel sagen
eine abgelehnte Löschung wie SFTP und FTP.
- Gilt das auch für das Veröffentlichen der Website mit „Löschen“, nicht nur für das Relay?
- Kann ein Ordner, der sich nicht öffnen lässt, jetzt ein Veröffentlichen scheitern lassen, das unter
  1.1.1 ging?
- Bleibt das Manifest in jedem Fall stehen, in dem eine Datei geblieben ist?

**3. Der Umschlag-Absender als Schalter** (quartz-forms `e3a3d0a`/`v0.6.0`, QuartzControl
`d34ee7e0`).
- Welcher Wert gilt für eine Config ohne den Schlüssel, und ist das derselbe Versand wie unter
  0.5.16 und wie vor 0.5.16?
- Was sagt QuartzControl einem Projekt mit quartz-forms 0.5.x, das den Schalter nicht kennt?
- Stimmt die Zählung 0.6.0 (minor) nach der Regel in `AGENTS.md`?

**4. Die Origin-Regel als Abschrift** (`fcc277b4`). `shared/relayOrigin.ts` und
`check:plugin-copies` lassen PHP `qf_origin_allowed` mit 16 Fällen gegen die Abschrift antworten.
- Decken die 16 Fälle das Feld ab: IDN/Punycode, Port 443 ausgeschrieben, nachgestellter Punkt,
  Großschreibung außerhalb ASCII, leere Liste, `null`-Origin?
- Läuft die Gegenprobe, wenn PHP fehlt, und sagt sie das dann?

**5. Die Vorlage** (`bb1a1cd3`, `bffc618b`). Die Seitenspalten, der Kopf und der Fuß bekommen eigene
Flächen, die linke Spalte klebt.
- Was geschieht mit einer linken Spalte, die höher ist als das Fenster (Höhe, eigenes Rollen,
  Maske)?
- Was geschieht mit dem Menü als Schublade auf dem Smartphone, mit Popovers, mit der Suche, mit dem
  Druck, mit dark?
- Was geschieht mit einem `position: fixed` in der Spalte (Regel oben)?
- Wie sieht es in allen vier Varianten aus (`example`, `basic`, `doku`, `plugin`), und auf den
  Websites, die auf der Vorlage stehen (QuartzControl-Web, die Plugin-Website)?
- `check:tokens` meldet seit `bffc618b` alle 70 Tokens als wirksam. Misst das Skript jetzt, was es
  behauptet?
- Gibt es weitere Tokens, deren Wert `probe()` in eine ungültige Form übersetzt, sodass ein Token
  nur zufällig wirkt oder zu Unrecht als tot gälte?

**6. Der Umbau der Plugin-Handbücher.**
- Hat jede alte Seite einen Platz in der neuen Website? Zeigt jeder Wikilink, Markdown-Link und
  `translationKey` danach auf das, worauf er vorher zeigte? Denk an:
  - Links in Codeblöcken und Tabellen,
  - Aliasse (`|`), Anker (`#`) und Block-Referenzen (`^`),
  - Einbettungen (`![[…]]`) und Bilder,
  - Links zwischen den Handbüchern,
  - Links auf die alten Adressen `boxi-os.github.io/quartz-<plugin>/`.
- Gleichnamige Tags kommen jetzt aus vier Handbüchern auf eine Tag-Seite: gewollt, oder ein
  Durcheinander für den Leser?
- Was tun Suche, Graph, Backlinks, RSS (`index.xml`), `sitemap.xml` und die Sprachumschaltung
  (quartz-multilanguage) mit vier Handbüchern in einem Baum?
- Halten `scope: section` (Menü und Pager, quartz-navigations) und die Startseite ohne Menü, was
  das Handbuch auf `navigations/8-rezepte/01-…` dazu sagt?
- Stimmen die mtimes? Die Seiten zeigen ihr Datum.
- Ist die übernommene Geschichte vollständig, und liegt in ihr oder im Vault etwas, das nicht
  öffentlich werden soll? Der Vault ist privat, `public/` nicht. Sieh dir `private/` und die
  Demo-Schlüssel an, und was `ignorePatterns` wirklich ausschließt.

**7. Die Weiterleitungen** (`private/redirects/make-redirects.mjs`).
- Bekommt jede alte Adresse ein Ziel, das es im neuen Bau gibt, mit Anker, mit englischer Fassung,
  mit und ohne `.html`, mit Ordnerseite und Schrägstrich?
- Was geschieht mit Adressen, die die alte Website nicht hatte (`404.html`), mit Tag-Seiten, mit
  `index.xml`, `sitemap.xml`, `static/…` und Bildern?
- Ist die erzeugte Seite sauber gegen eingeschleustes HTML aus Pfaden (Anführungszeichen, `<`,
  Unicode)?
- Zeigen `canonical`, `noindex` und `refresh` das, was eine Suchmaschine und ein Leser ohne
  JavaScript brauchen?
- Kann sie auf eine fremde Adresse führen?

**8. Der Release-Tag** (`docs/release.md`, besonders 2b, 4, 5, 9).
- Ist die Reihenfolge so, dass zu keiner Zeit ein öffentlicher Link ins Leere zeigt? Denk an:
  - quartz-forms öffentlich vor dem Paket, das es installiert,
  - die Plugin-Website vor den Weiterleitungen,
  - die README-Commits (layout-box `6fecd5a`, multilanguage `b7f89a8`, unpushed) und die Footer.
- Was geschieht, wenn ein Schritt mittendrin scheitert, und gibt es einen Rückweg?
- Was zeigt das ausgelieferte 1.1.1, das ein Nutzer weiter benutzt, nach dem Release-Tag:
  - Update-Hinweis, Handbuch-Links,
  - Vorlagen aus dem Vorlagen-Repo, die quartz-forms installieren?
- Nennt `release.md` jede Stelle, an der eine alte Plugin-Adresse steht (App, Handbuch,
  QuartzControl-Web, Vorlagen, READMEs, `package.json` der Plugins)?
- Was liest ein Prüfskript davon nicht?

**9. 1.2 aus der Sicht eines Nutzers von 1.1.1** (E).
- Was ändert sich beim ersten Start von 1.2 an Dateien, die 1.1.1 geschrieben hat? Denk an:
  - `.quartz-gui/` mit den neuen Manifest-Begleitern `.modes.json` und `.tilde.json`,
  - `_quartzcontrol.scss`, Config, Ziele, Zugänge.
- Kann der Nutzer danach zu 1.1.1 zurück, und was geht dabei verloren?
- Ist etwas aus `fix/1.1.x` nicht in `feat/1.2`?
- Steht in 1.2 noch etwas, das nur für die Entwicklung gedacht war (Schalter, Testpfade,
  Demo-Werte, Konsolenausgaben)?

## Worauf es ankommt, in dieser Reihenfolge

1. **Was auf einem Server etwas löscht, das nicht gelöscht werden soll, oder ein Geheimnis liegen
   lässt, während QuartzControl „entfernt“ sagt** (Abwägungen 1, 2).
2. **Was nach dem Release-Tag öffentlich kaputt ist oder etwas zeigt, das privat bleiben soll**
   (Abwägungen 6, 7, 8).
3. **Was auf der Website eines Nutzers still kaputtgeht oder nicht mehr sendet** (Abwägungen 3, 5,
   9).
4. **Was QuartzControl oder ein Handbuch falsch sagt** (Abwägung 4 und alles Übrige).

## Schon bekannt, nicht neu melden

Diese Punkte kennt der Nutzer. Melde einen nur, wenn er mehr kostet als hier steht:

- N10 aus dem sechzigsten Review (Bild des Relay-Abschnitts im App-Handbuch, kommt mit 1.2).
- Navigations 4.1 und 6.1 beschreiben noch eine Kapitelnavigation in der rechten Spalte, die die
  Website nicht mehr hat.
- Die READMEs von quartz-navigations und quartz-forms verlinken ihr Handbuch nicht.
- Die alten `index.xml` lassen sich auf GitHub Pages nicht weiterleiten.
- Das veröffentlichte `qc-basic` im Vorlagen-Repo ist älter als das gebaute (Punkt 4 am
  Release-Tag).

## Wenn du misst

Ändere nichts in diesem Repo, in einem der vier Plugin-Repos, in einem Vault oder in einem Projekt
unter `~/Documents/QuartzProjekte`. Arbeite in Kopien in deinem Ordner
`/private/tmp/claude-501/-Users-boxi-Development-QuartzControl/0c2b7f79-77df-49cc-a099-1a5ea75c16c8/scratchpad/review-61/`
(im Folgenden `<r61>`).

- **Lies nie etwas aus einem Projekt oder Vault namens `HinterlandHistory`/`hinterland-history`**,
  auch nicht in einer Schleife oder einem `grep` über alle Projekte. Nimm es aus jeder Liste,
  **bevor** du sie durchläufst. Nenn den Namen nicht in deinem Bericht.
- **Keine Anfrage an einen Host außerhalb dieses Rechners.** Ausgenommen sind nur `npm ci` in deinen
  Klonen und das Klonen von `github:boxi-os/*`, das ein Import oder `quartz plugin add` selbst tut.
  Erlaubt ist auch lesendes `curl` auf `https://boxi-os.github.io/quartz-{layout-box,multilanguage,navigations}/`,
  um die alten Websites mit den Weiterleitungen zu vergleichen. **Kein `git push`, kein `gh`, keine
  Änderung an einem Repository oder an GitHub Pages.** Keine echte Mail.
- **`debian-vm`** (per `ssh debian-vm`) ist die lokale Test-VM, die als Hoster dient. Wie sie
  aufgebaut ist, steht in der Nachricht, mit der du gestartet wurdest. Antwortet sie nicht, ist sie
  aus. Nenn dann, was dadurch ungemessen bleibt.
  - Arbeite dort nur in eigenen Ordnern (`/srv/qc/www/review61-*` oder `~boxi/review61-*`).
  - Lege keine Konten an und ändere keine Passwörter, Schlüssel oder Server-Konfiguration.
  - Was du an Rechten eines eigenen Ordners änderst, setzt du zurück.
- Hat die Rechteprüfung einen Schritt abgelehnt, umgeh ihn nicht auf anderem Weg. Nenn ihn im
  Bericht als nicht gemessen.

**Die App:**

- `git clone /Users/boxi/Development/QuartzControl <r61>/qc`, dort `git checkout feat/1.2`,
  `npm ci`, `npm run build`. Für Vorher-Messungen ein zweiter Klon auf `v1.1.1` bzw. `155e783f`.
- Starten mit `_electron.launch` aus `playwright-core` und einem eigenen `--user-data-dir` in
  `<r61>`, **nie mit dem echten Profil**. Die Muster stehen in `.claude/skills/run-desktop/SKILL.md`.
  Für Abwägung 9 kannst du ein Profil mit dem gepackten oder gebauten 1.1.1 füllen und dann 1.2
  darauf starten.
- `npm run typecheck`, `npm run smoke`, `npm run check:i18n`, `npm run check:tokens` im Klon. Für
  die Prüfskripte mit Projekt (`check:plugin-copies`, `check:option-schema`, `check:runtime`) nimm
  Kopien der Projekte, per `cp -RL`, ohne `node_modules` ggf. mit Symlink.
- Das Relay ohne VM: `php -S` über einem Ordner-Ziel in `<r61>`, ein Ersatz für sendmail, der
  seine Argumente aufschreibt. Eine Seite öffnest du mit `chromium.launch({ channel: 'chrome' })`.

**Die Websites:**

- Die Plugin-Website baust du in einer Kopie des Projekts mit einer Kopie des Vaults als `content/`,
  nicht im Original. Gebaut wird mit `npx quartz build` in der Kopie. QuartzControl schreibt vor
  jedem Bau die Frames (`writeAllFrames()`); wer ohne App baut, baut mit den Frames, die im Projekt
  liegen. Serviert wird mit einem eigenen statischen Server unter dem Präfix `/quartz-plugins/`,
  wie GitHub Pages es tut.
- Die Weiterleitungen erzeugst du mit `make-redirects.mjs` in `<r61>` neu, gegen die Klone der
  alten `gh-pages` (oben) und gegen deinen Bau.

## Was du ablieferst

Einen Bericht auf Deutsch in `<r61>/review.md`:

- Befunde nach Gewicht (Hoch, Mittel, Niedrig), je mit Ort, Szenario, Beleg (gemessen oder gelesen,
  und womit) und einem Vorschlag.
- Getrennt davon eine Liste „Nebenbei“ für Kleinigkeiten.
- Zu jeder der neun Abwägungen eine Antwort, auch wenn sie „kein Befund“ lautet.
- Am Ende ein Urteil: ob 1.2 so veröffentlicht werden kann, und was vorher geschehen muss.
- Was du auf dem Mac und auf `debian-vm` angelegt hast.

Kennzeichne bei jedem Befund, ob du ihn gemessen oder nur gelesen hast.
