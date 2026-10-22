# Vor einem Release

> **Zuletzt durchlaufen für 1.1.0 am 2026-10-18** (annotierter Tag `v1.1.0` auf `505bc3fb`, Branch
> `release/1.1.0`, `main` per Fast-Forward von `a282f549`). Zehn Pakete, neun auf einer Maschine
> ihrer Architektur gestartet (macOS x64 nicht; statisch: `Info.plist` 1.1.0, App und git x86_64),
> jedes mit Wegwerf-Profil und App-Version 1.1.0 im User-Agent, Node 24.18.1, npm 11.17.0, das
> mitgelieferte git 2.53.0; macOS arm64 aus dem gemounteten DMG. glibc-Untergrenze unverändert
> 2.34 (git), Electron 2.25. Die Digests der Release-Seite stimmen mit `shasum -c` über `release/`.
> Vor Punkt 1 ein kurzes Review der zwei ungelesenen Nebenbei-Fixes (`7a1e5ab6`). Punkt 4 hat
> alle vier Varianten neu exportiert (`1dcd2604`, `505bc3fb`; je nur das Manifest anders), und
> dabei fiel auf, dass `scripts/example-template/pakete/` noch die Pakete vom 2026-09-21 trug. Das
> Vorlagen-Repo steht auf `6d8ed8b` (`latest.json`, `qc-basic`, `qc-example`, Zahlen im README),
> `--check-sync` für `basic` und `example` danach Exit 0. QuartzControl-Web: Schnipsel auf 1.1.0
> (Vault `6d1b86b`), über die gebaute App gebaut, gegen `gh-pages` 271 geändert, 53 neu, 5 entfallen
> (wie `deploy.diff`), veröffentlicht als `d90f0a69` und byte-gleich mit dem Bau; online alle 36
> Pfade und die zwei alten von 4.7 mit 200. Drei Dinge für das nächste Mal: **debian-x86 hat kein
> `curl`** (Version über `node` lesen), **ein Start auf der emulierten VM braucht über eine
> Minute** bis zum Band, und **wer auf das Band wartet, wartet auf „Werkzeuge bereit“** — „git“
> steht schon vorher in „GitHub“.
>
> Davor **1.0.2 am 2026-10-07** (Tag `v1.0.2` auf `985fbde`, vom Branch
> `release/1.0.2` per Fast-Forward; `fix/1.0.2` ebenfalls gepusht). Zehn Pakete, neun auf einer
> Maschine ihrer Architektur gestartet (macOS x64 nicht), alle mit App-Version 1.0.2, Node 24.18.1
> und npm 11.17.0; das mitgelieferte git ist 2.53.0. Die Digests der Release-Seite stimmen mit
> `shasum` über `release/` überein, die kopierten Linux-Pakete mit `sha256sum` auf den VMs.
> Veröffentlicht wurde nur die App-Website, durch die gebaute App mit Wegwerf-Profil: 155 geänderte
> Dateien, nichts neu, nichts entfernt; danach alle 36 Pfade aus `handbookPages.ts` mit 200. Drei
> Dinge für das nächste Mal: **Je VM ein eigener ssh-Aufruf** — zwei mit `;` in einem Bash-Aufruf
> ließen den zweiten erst laufen, als der erste nach dem Bau zurückkehrte, und der startete einen
> zweiten Flatpak-Bau auf debian-vm (gescheitert, das Paket des ersten blieb heil). **Ein gesperrter
> `login`-Schlüsselbund hält die App beim Start an** — nach einem Neustart der VM startete keines
> der drei arm64-Pakete bis zur Seite; geprüft mit `--password-store=basic`, oder den Schlüsselbund
> vorher am Bildschirm der VM entsperren. Und die Release-Notizen haben zwei Kopfzeilen
> (`tail -n +3`, nicht `+4`).
>
> Davor **1.0.1 am 2026-09-28** (Tag `v1.0.1` auf `1653dc0`, vom Branch
> `release/1.0.1` per Fast-Forward; `fix/1.0.1` ebenfalls gepusht). Zehn Pakete, neun auf einer
> Maschine ihrer Architektur gestartet (macOS x64 nicht), alle mit App-Version 1.0.1, Node 24.18.1,
> npm 11.17.0 und git 2.53.0. Die Digests der Release-Seite stimmen mit `shasum` über `release/`
> überein. Veröffentlicht wurde nur die App-Website (die Fixes ändern weder Vorlagen noch
> Plugin-Handbücher), durch die gebaute App mit Wegwerf-Profil: 139 geänderte Dateien, nichts neu,
> nichts entfernt; danach alle 36 Pfade aus `handbookPages.ts` mit 200. Zwei Dinge für das nächste
> Mal: Der x86_64-Flatpak brauchte diesmal rund 35 statt 46 Minuten, weil flatpak-builder das
> git-Modul aus dem Cache des vorigen Baus nahm — die meiste Zeit war `flatpak build-bundle`. Und
> ein lokaler Klon von `quartzcontrol-templates` existiert nicht; `latest.json` geht über einen
> Wegwerf-Klon (`gh repo clone`).
>
> Davor **1.0.0 am 2026-09-24/25** (Tag `v1.0.0` auf `f98a991`, vom Branch
> `release/1.0.0` per Fast-Forward). Zehn Pakete, neun auf einer Maschine ihrer Architektur
> gestartet (macOS x64 nicht, kein Intel-Mac), alle mit App-Version 1.0.0, Node 24.18.1 und npm
> 11.17.0 gelesen, git 2.53.0 im macOS-Paket und in beiden Flatpaks. Die Digests der Release-Seite
> stimmen mit `shasum` über `release/` überein. Veröffentlicht durch die gebaute App (`build.run`,
> dann `deploy.diff` und `deploy.run` je Ziel): App-Website, drei Plugin-Handbücher und Example;
> danach alle 36 Pfade aus `handbookPages.ts` mit 200 und das neue `icon.png` auf allen fünf.
> Drei Dinge, die dabei auffielen: Der Code kommt ohne Push auf die VMs, per `git bundle
> 224c08d..release/1.0.0`. Ein `nohup … &` über ssh hält die Sitzung offen, bis der Bau endet —
> `setsid nohup … < /dev/null > /dev/null 2>&1 &` kehrt sofort zurück. Und GitHub Pages liefert
> eine geänderte statische Datei ein paar Minuten lang aus dem Cache (`x-cache: HIT`), auch mit
> Abfrageparameter; das Icon des Example sah so zunächst alt aus.
>
> Davor 1.0.0-rc.1 am 2026-09-21 (Tag auf `224c08d`); dabei fiel auf, dass ein `pkill -f` über ssh
> die eigene Sitzung beendet — auf der VM über die gemerkte PID beenden.

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

**Zwei Linien nach einem Release.** Fixes für die veröffentlichte Fassung liegen auf
`fix/<major>.<minor>.x`, neue Features auf `feat/<nächste>`; beide zweigen vom selben Punkt ab
(seit 2026-10-19: `fix/1.1.x` und `feat/1.2` vom letzten Commit auf `feat/1.1`). Die Fix-Linie wird in die
Feature-Linie **gemergt**, nie umgekehrt und nicht per Cherry-Pick, spätestens nach jedem
Fix-Release. Ein Fix-Release entsteht aus der Fix-Linie (`release/<fassung>`, Tag, `main` per
Fast-Forward). Bei einem Fix-Release zeigt die Schleife oben die Feature-Linie mit `+` — erwartet;
bei einem Feature-Release darf die Fix-Linie keines zeigen. So lief es schon bei 1.0.1 und 1.0.2
(`fix/1.0.x` von `v1.0.0`, später in die 1.1-Linie gemergt).

## 2b. Die eigenen Plugins sind vor der App veröffentlicht

Seit 1.1 hängen App, Vorlage und Handbuch an Fassungen der drei eigenen Plugins
(`quartz-layout-box`, `quartz-multilanguage`, `quartz-navigations`):

- **Das Formular kommt aus dem Plugin.** Die App baut die Optionen aus dem `quartz.configSchema`
  der *installierten* Fassung (seit layout-box 0.4.0, multilanguage 0.2.0, navigations 0.4.0);
  eine ältere bekommt das Formular aus ihren `.d.ts`, ohne Abschnitte, Bedingungen und
  Snippet-Auswahl. Auch die Texte des Formulars stehen dort (`x-quartz-l10n`).
- **Die Vorlage installiert, was auf `main` liegt, und das ist entschieden.** `plugins.json` des
  Pakets nennt die drei als `github:boxi-os/<name>` ohne Ref; ein Import holt den Stand von `main`
  zu dem Tag, an dem er läuft. Mit `#v<fassung>` bekäme ein Projekt aus der Vorlage auf der
  Updates-Seite nie eine neuere Fassung angeboten. Der Preis: **Ein Breaking Change an den Optionen
  oder Klassen eines der drei verlangt neue Vorlagen am selben Tag**, sonst setzt jedes alte Paket
  das Plugin still auf eine Form, die es nicht mehr kennt (siebenundvierzigstes Review, Niedrig 4;
  Begründung in [`templates-and-localization.md`](decisions/templates-and-localization.md)).
- **Die Vorlage wird an der installierten Fassung gebaut** (Punkt 4), und ein Plugin, das im
  Projekt schon liegt, behält beim Import seine Fassung.

Also zuerst, vor dem Neubau der Vorlagen: Was App, Vorlage oder Handbuch von einem Plugin erwarten,
ist gepusht und als Fassung veröffentlicht (`version` = `quartz.version`, CHANGELOG, Tag), und die
Werkstätten und Websites stehen über die Updates-Seite der App auf dieser Fassung. Geprüft je Repo:

    git -C ~/Development/<plugin> fetch && git -C ~/Development/<plugin> status -sb   # nichts voraus
    git -C ~/Development/<plugin> describe --tags                                     # ein Tag ohne -N-g…

Ein Commit nach dem Tag, der nur Tests oder README ändert, braucht keine Fassung, solange er
gepusht ist.

**Jede neue Fassung braucht auch die App.** Der Editor eines Plugins ist gegen eine Fassung gelesen
(`*_READ_AGAINST` in `src/routes/Plugins/`) und kennt die mit demselben Code (`*_SAME_CODE`); jede
andere bekommt in jeder Zeile den Hinweis, die Angaben könnten abweichen. Ist
`git diff v<gelesen> v<neu> -- src` leer, kommt die neue Fassung in `*_SAME_CODE`, sonst wird der
Editor gegen sie gelesen (`npm run check:plugin-copies`) und `*_READ_AGAINST` gehoben. 0.4.3 von
navigations fehlte dort bis zum 47. Review (Mittel 3). **Stand 2026-10-18:** layout-box steht auf `v0.4.2`, gepusht; multilanguage einen
Commit nach `v0.2.0` (`85428bf`, Test und README), gepusht; navigations auf `v0.4.3`
(`1bffddb`, am selben Tag veröffentlicht: „Button“ statt „Knopf“ in drei Texten des Schemas),
gepusht. Werkstätten (Example, basic, doku, plugin) und die vier Websites stehen seit dem
2026-10-18 über die Updates-Seite auf 0.4.3, die vier Vorlagen sind danach neu gebaut (`88e45037`).
Die Websites kamen von 0.3.2 und sind seither nicht neu gebaut: vor ihrer Veröffentlichung
(Punkt 9) bauen und gegen `gh-pages` vergleichen.

## 3. Das Handbuch steht online auf dem Stand der Fassung

Es reist seit dem 2026-09-18 nicht mehr mit; die App öffnet
`https://boxi-os.github.io/QuartzControl/` (`HANDBOOK_URL` in `electron/main/menu.ts`), und diese
Website wird mit dem Release veröffentlicht (Punkt 9). Die Pfade in `src/data/handbookPages.ts`
müssen dort existieren — nach einer Umbenennung im Vault alle 36 prüfen (sie antworten mit 200 oder
404).

**Für 1.1: Kapitel 4.7 heißt neu.** Aus `4-gestaltung/07-layout-global-und-seitentypen` wurde
`4-gestaltung/07-layout-komponenten-anordnen` (en: `07-layout-arranging-components`), und
`handbookPages.ts` nennt seit `6e06a333` den neuen Pfad. Bis QuartzControl-Web am Release-Tag
veröffentlicht ist, antwortet er dort mit 404 — am 2026-10-18 gemessen, die übrigen 34 mit 200. Der
alte Pfad, den 1.0.x öffnet, steht als `aliases:` auf der neuen Seite und wird zur Weiterleitung.
Nach dem Veröffentlichen (Punkt 9) alle Pfade der Tabelle und die zwei alten:

    for p in $(grep -o "'\(en/\)\?[0-9]-[a-z0-9/-]*'" src/data/handbookPages.ts | tr -d "'") \
        4-gestaltung/07-layout-global-und-seitentypen en/4-design/07-layout-global-and-page-types; do
      c=$(curl -s -o /dev/null -w '%{http_code}' "https://boxi-os.github.io/QuartzControl/$p")
      [ "$c" = 200 ] || echo "$c $p"
    done

Keine Ausgabe heißt: alle antworten mit 200. Die alten zwei sind dann Weiterleitungsseiten; dass sie
auf die neue Seite führen, sieht man nur im Browser.

**Für 1.0.0 erledigt:** Kapitel 4.4 „Variablen“ (sechsunddreißigstes Review, Befund 10) und die
drei Plugin-Handbücher (Akkordeon und Pager im Navigations-Handbuch, Marke als Projektbild,
Startseiten mit den Fähigkeiten) stehen seit dem 2026-09-25 online, zusammen mit der App-Website.

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

**Eine Seite „Neu in <Fassung>“ bekommt es nicht mehr.** Bis zum 2026-09-24 gab es `neu-in-beta-1`
und `neu-in-rc-1`; sie sind gestrichen, weil der Versionsverlauf auf den Release-Seiten auf GitHub
nachzulesen ist und die Startseite des Handbuchs dorthin verweist. Was sich geändert hat, steht
also in den Release-Notizen, nicht im Vault. Eine neue Seite auf oberster Ebene muss weiterhin in
die `APPENDIX`-Liste in `scripts/build-handbook-pdf.mjs`; das Skript bricht sonst ab, und genau
dafür ist es da.

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

## 4. Das Basis-Template liegt dreimal gleich

**Das eingebaute Paket ist seit dem 2026-09-20 das Basis-Template, nicht mehr das Example.**
Es existiert als Export (`~/Documents/QuartzProjekte/qc-basic.qtpl`, Phase 10 der Variante
`basic`), als mitgelieferte Kopie (`resources/templates/qc-basic.qtpl`) und veröffentlicht in
`boxi-os/quartzcontrol-templates`. Die App lädt die veröffentlichte (einmal am Tag) und nimmt von
ihr und der mitgelieferten die mit dem neueren `createdAt` (`builtinTemplateService.ts`, seit dem
47. Review) — eine neu exportierte Vorlage, die nicht gepusht ist, erreicht also nur die neue
App-Fassung, nicht die schon ausgelieferten.

    npm run template:example -- --variant basic --check-sync

vergleicht die drei Kopien byte-weise und nennt je Kopie `createdAt`. Exit 0 heißt: alle drei
gleich. Ist die veröffentlichte nicht abrufbar, sagt es das und endet mit 1. Die Stylesheets
vergleicht dieser Aufruf **nicht** — das tut nur `--variant example`, weil nur dort die Werkstatt
die Quelle ist und nicht eine Kopie, die der Lauf selbst geschrieben hat.

**Nach Punkt 1 wird das Basis-Template neu gebaut, auch wenn es schon „erledigt“ heißt.** Das
Manifest trägt `createdBy.appVersion` aus `app.getVersion()` (`templatePackage/index.ts`), also die
Nummer der gebauten App: Ein Paket, das vor Punkt 1 entstand, sagt die alte Fassung (für 1.1 stand
dort `1.0.2`, `88e45037`; achtundvierzigstes Review, Niedrig 3, entschieden vom Nutzer am
2026-10-18). Ablauf: `npm run build`, dann `npm run template:example -- --variant basic --only
9,10` (Prüfung und Export der bestehenden Werkstatt), dann
`cp ~/Documents/QuartzProjekte/qc-basic.qtpl resources/templates/`. `createdAt` wandert dabei
mit, und das ist gewollt: Daran entscheidet 1.1 zwischen Cache und mitgeliefertem Paket. Ob
`--only 9,10` ohne die Phasen davor genügt, ist nicht gemessen; meldet Phase 9 einen Fehler, den
ganzen Lauf der Variante fahren.

**Gepusht wird erst mit Punkt 8, nach der Release-Seite.** Hier entstehen Export und
mitgelieferte Kopie, und `--check-sync` muss diese beiden gleich nennen; die veröffentlichte ist
bis dahin noch die alte, und das meldet der Aufruf zu Recht. Jede ausgelieferte Fassung holt das
veröffentlichte Paket im Assistenten „Neues Projekt“: Ein Push vor der Release-Seite gibt den
Nutzern der alten Fassung das Paket der neuen, bevor es die neue zum Herunterladen gibt (für 1.1:
1.0.x bekäme die zwölf Stylesheets; siebenundvierzigstes Review, Niedrig 3). Nach dem Push in
Punkt 8 läuft `--check-sync` noch einmal und endet mit 0.

**`minimal-lesbar.qtpl` bleibt im veröffentlichten Repo liegen.** Jede ausgelieferte App-Fassung
vor dieser Änderung fragt genau diese Adresse; sie zu löschen nähme allen bestehenden
Installationen ihre Online-Vorlage. Kosten fürs Liegenlassen: eine Datei.

Die Example-Vorlage heißt seither `qc-example.qtpl` und ist kein eingebautes Paket mehr. Sie dort
abzulegen ist optional — die App fragt sie nicht, es ist ein Link für Menschen.

**Stand 2026-09-21: nichts offen.** Hier stand bis zum 35. Review (Befund 11) eine Liste „Offen,
Stand 2026-09-20 abends“ mit sechs Punkten, von denen fünf in derselben Nacht erledigt worden
waren — und diese Datei schickte den nächsten Leser in Arbeit, die getan war. Nachgemessen am
2026-09-21, je Punkt:

1. `qc-basic.qtpl` liegt in `boxi-os/quartzcontrol-templates` (`a4fa9b3`, seither mehrfach
   nachgezogen). `curl -sfI` auf die Rohadresse antwortet mit 200.
2. `npm run template:example -- --variant basic --check-sync` sagt „3 Kopien byte-gleich“, Exit 0.
   Seit Befund 8 derselben Runde vergleicht `--variant example --check-sync` auch das Example mit
   seiner veröffentlichten Kopie.
3. Siehe 1: Die Adresse, die eine ausgelieferte App fragt, antwortet.
4. **Bleibt als Regel:** `minimal-lesbar.qtpl` im veröffentlichten Repo **nicht** löschen
   (Begründung oben).
5. Das Benutzerhandbuch nennt die eingebaute Vorlage „Basis-Template“ bzw. „basic template“ und
   die Beispielseiten „zwanzig kurze Seiten“ — Vault-Commit `a038586`, drei Dateien je Sprache;
   gezählt mit `grep -o` stehen heute je Sprache vier Nennungen da. Die übrigen Nennungen von
   „Beispielvorlage“ meinen das Example und sind richtig. Live nachgesehen.
6. Beide Doku-Pakete sind neu gebaut (`8d1c38d`) und in die vier Websites importiert — mit dem
   Schaden, den Befund 1 beschreibt, und seither dreimal neu exportiert (ohne Schnipsel, mit dem
   Fokusring, mit der Suche über dem Graphen); die Websites tragen den Stand, geprüft per `cmp`
   gegen das Repo und am ausgelieferten CSS.

**Wer ein Paket unter „Paket gewinnt“ in eine echte Website importiert, liest vorher die
Konfliktliste des Dry-Runs** — Datei für Datei, und bei allem außerhalb der Stylesheets mit der
Frage, wem die Datei gehört. Am 2026-09-21 hat ein Skript die zwei Doku-Pakete in vier Websites
eingespielt, ohne dass jemand die Liste las; der Baustein `static` trug die Schnipsel des Example,
und auf jeder Seite der App-Website und der drei Plugin-Handbücher stand danach „Dieses Handbuch
gehört zur Vorlage Example“, mit drei Links auf 404 (35. Review, Befund 1). Zurückgeholt aus dem
Snapshot, den der Import selbst vorher angelegt hatte, und am selben Tag neu veröffentlicht. Die
Pakete tragen seither keine Schnipsel mehr (`dropSnippetsThatDoNotShip()` vor Phase 10), aber
dieselbe Frage stellt sich für `icon.png` und `og-image.png`, die jedes Paket aus Quartz' Gerüst
mitnimmt: Ein Projekt mit eigenem Favicon verliert es an derselben Stelle.

**Das Navigations-Handbuch bekommt die Doku-Pakete nur ohne den Baustein „Plugins“.** Seit dem
2026-09-21 tragen beide Doku-Pakete dieselben zwei quartz-navigations-Einträge wie das Example
(Akkordeon links, Pager unten), und der Baustein `plugins` ordnet gleichnamige Einträge nach ihrer
Position zu — im Navigations-Handbuch überschriebe er zwei seiner fünf eigenen Instanzen, die dort
die Vorführung des Plugins sind. Vorher gingen die Pakete ohne quartz-navigations und mit dem
Explorer des Example, und als das Example ihn abschaltete, standen die App-Website und zwei
Plugin-Handbücher einen Tag lang ohne jede Navigation da.

**Und nach dem Import die Updates-Seite.** Ein `github:`-Plugin, das im Projekt schon liegt, behält
beim Import seine Fassung (`parts.ts` installiert nur, was fehlt), während die Stylesheets des
Pakets sich auf eine neuere verlassen können: Das Navigations-Handbuch stand bis zum 35. Review
auf quartz-navigations 0.3.0 und zeigte die zwei Pager-Fehler, deren Übergangsregeln die Vorlage
gerade gestrichen hatte. Am 2026-09-21 über die App auf 0.3.1 gehoben und veröffentlicht, am
selben Tag alle fünf Websites und die Werkstätten auf 0.3.2.

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

**Überholt seit dem 2026-09-20, abends.** Das eingebaute Paket ist seither nicht mehr diese
Vorlage, sondern `qc-basic.qtpl` (Abschnitt 4 oben sagt, warum). Was von diesem Absatz bleibt, ist
die Messung: Die drei Kopien *waren* an diesem Tag gleich. Was jetzt offen ist, steht am Ende von
Abschnitt 4.

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

**Offen für das nächste Release (Stand 2026-10-10): der Pfeil an externen Links.** Im Repo steht
seither nur noch Quartz' eigenes Symbol (crawl-links, `externalLinkIcon`), gedämpft — vorher
setzte `content.scss` ein zweites `↗` per `::after` daneben. Die Werkstatt (Example), die vier
Pakete und die Websites tragen noch beide Pfeile; das Repo ist hier also *vorn*, und ein
`--sync` vor dem Ausrollen würde die Änderung zurücknehmen. Ausrollen mit `--only 5`, dann wie
oben. Gemessen an der gebauten Example-Website, Regel im Browser getauscht (nicht am Bau): das
`::after` ist `none`, das Symbol `rgb(95, 95, 95)` statt `rgb(23, 23, 26)`.

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

Seit dem 2026-10-19 gibt es eine siebte Stelle, `quartz-forms-handbuch` (privat bis 1.2). **Vor
dem Release 1.2** bekommen alle sieben einen Link „Forms“ auf `https://boxi-os.github.io/quartz-forms/`,
sobald Repository und Website öffentlich sind; zugleich wird entschieden, ob `qc-basic` quartz-forms
installiert (gestaltet wird es in allen Varianten schon, `plugin-forms.scss`).

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

**Am 2026-09-20 ohne Release durchgespielt**, weil `npm run dist` seit dem Handbuch-Rückbau vom
2026-09-18 ungelaufen war: zehn Pakete, neun davon auf einer Maschine ihrer Architektur gestartet,
Einzelheiten in [`GRUPPE-D-2026-09-20.md`](GRUPPE-D-2026-09-20.md). Zwei Dinge daraus für die
nächste Runde. **macOS x64 lässt sich hier nicht starten** — kein Intel-Mac, und Rosetta 2 wäre
eine Messung unter Übersetzung, nicht die, die dieser Punkt verlangt; wer den Satz „jedes Paket
gestartet“ schreiben will, braucht dafür eine Maschine. Und **die Linux-Pakete verlangen
glibc ≥ 2.34**, nicht wegen Electron (2.25 genügt ihm), sondern wegen des mitgelieferten git. Das
steht seit dem 2026-09-20 in beiden READMEs unter „Linux“ und gehört in die Release-Notizen,
solange es so bleibt (Punkt 7).

Dann der Tag: `git tag v<version>` auf dem Commit, der die Fassungsnummer trägt (Punkt 1), und
pushen. Beta 2 ist `v1.0.0-beta.2`.

## 7. Die Release-Seite trägt Pakete, Notizen und Prüfsummen

Die Seite, auf die Punkt 8 zeigt. Drei Teile:

- **die Pakete** aus Punkt 6 als Assets (Beta 2: zehn; das Handbuch-PDF aus
  `npm run build:handbook-pdf` war nicht dabei),
- **die Notizen** — was sich seit der vorigen Fassung geändert hat, in derselben Gliederung wie
  die Seite „Neu in …“ aus Punkt 3, **und die Untergrenze der Linux-Pakete**: glibc ≥ 2.34, also
  Ubuntu 22.04, Debian 12, RHEL 9 und neuer. Sie hängt am mitgelieferten git und ändert sich,
  sobald dessen Bundle von woanders kommt — also nachsehen statt abschreiben
  ([`GRUPPE-D-2026-09-20.md`](GRUPPE-D-2026-09-20.md) sagt, wie sie gemessen wird),
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
- **für 1.1 außerdem** (Stand 2026-10-18, Messungen in
  [`styles-and-fonts.md`](decisions/styles-and-fonts.md) und
  [`layout-frames.md`](decisions/layout-frames.md)):
  - *Ältere Fassungen.* „Jetzt umstellen“ auf der Stile-Seite legt Ladereihenfolge, Schriften und
    Variablen nach `quartz/styles/_quartzcontrol.scss`; ein Projekt, das 1.1 anlegt, beginnt so.
    1.0.x liest ein solches Projekt mit 0 Variablen und 0 Stylesheets, und was man dort
    einschaltet, steht danach als zweite Kopie in `custom.scss`; eine Variable, die 1.0.x dort
    ändert, gilt im dunklen Modus nur, wo 1.1 keinen dunklen Wert gesetzt hat, auch wenn 1.0.x sie
    als „beide Modi“ zeigt (gemessen an einer Kopie von gui-test: `--secondary: #00aa00` aus
    1.0.2, dunkel bleibt `#54d624`; achtundvierzigstes Review, Niedrig 4). Ohne „Jetzt umstellen“ schreibt
    1.1 die Form von 1.0. Unabhängig davon bricht 1.1 lange Zeilen in `quartz.config.yaml` bei 120
    Zeichen um wie die Quartz-CLI, 1.0.x bei 80; speichern beide Fassungen abwechselnd, trägt jeder
    Commit diesen Umbruch (gemessen an `ntp-lo`: 127 Zeilen, nur `pageTitle` geändert;
    siebenundvierzigstes Review, Niedrig 2), und zwei Rechner laufen beim Pull in Konflikte in
    Zeilen, die niemand geändert hat. Der Satz: „Wer ein Projekt auf mehreren Rechnern bearbeitet,
    aktualisiert zuerst alle Rechner auf 1.1 und stellt die Stile erst danach um. Solange ein
    Rechner noch 1.0 hat, bricht jedes Speichern die Config für die andere Fassung neu um.“
  - *Rangfolge der Variablen.* Umgestellt stehen die Variablen der Stile-Seite vor den eigenen
    Regeln in `custom.scss`, bis 1.0 standen sie dahinter. Eine eigene Regel gewinnt jetzt, wo sie
    mindestens so spezifisch ist: `:root { --x: … }` gegen den hellen Wert,
    `:root[saved-theme="dark"]` gegen den dunklen. Ein Wert „nur hell“ steht unter
    `:root:not([saved-theme="dark"])` und gewinnt im hellen Modus gegen ein eigenes `:root`; wer
    ihn selbst setzen will, nimmt `:root[saved-theme="light"]`. Die Variablen-Seite nennt die
    Namen, die `custom.scss` selbst setzt.
  - *Der Kommentar oben in `custom.scss`.* In Projekten aus dem Basis-Template bis 1.0 nennt er
    den Variablenblock „further down this file“; nach dem Umstellen steht er in
    `_quartzcontrol.scss`. Der Kommentar wirkt nicht, er ist nur falsch.
  - *Seitentypen im Wähler.* Der Reiter „Seitentypen“ im Layout ist weg; der Seitentyp wird auf der
    Bühne gewählt, mit eigenem Frame, ausgegrauten Ausschlüssen und „Anpassung entfernen“. Ein alter
    Link auf den Reiter landet im Layout.
  - *Breakpoints im Reiter „Frames“.* Die Breiten der Breakpoints standen bis 1.0 im Layout unter
    dem Reiter „Global“; jetzt stehen sie im Reiter „Frames“ (bis 1.0 „Eigene Frames“), der Reiter
    „Global“ heißt „Komponenten“ (Entscheidung im Plan 1.1; gelesen in `GlobalBoard.tsx` von 1.0.2
    und `FrameBuilder.tsx`; vom siebenundvierzigsten Review als fehlend genannt).
  - *Der Vorrat schaltet aus.* Die einzige Instanz einer Komponente in den Vorrat zu ziehen setzt
    `enabled: false` (bis 1.0 blieb sie liegen); zurückgezogen ist sie wieder an. Das schaltet das
    ganze Plugin aus, auch alles, was es außer der Komponente tut.
  - *Formulare ab den neuen Plugin-Fassungen.* Abschnitte und Bedingungen in den Optionen der drei
    eigenen Plugins, Snippets und Bilder in der Layout-Box gibt es ab layout-box 0.4.0, multilanguage 0.2.0 und
    navigations 0.4.0 (Punkt 2b); ältere Fassungen über die Updates-Seite heben.
  - *Zurück auf 1.0.x.* „Jetzt umstellen“ legt vorher einen Snapshot `styleMigration` an, und 1.1
    behält ihn wie einen manuellen (`KEPT_KINDS` in `snapshotService.ts`). 1.0.x kennt die Art
    nicht: Sie dünnt ihn aus wie jeden automatischen, sobald er älter als einen Tag ist und ein
    neuerer im selben Tages-, Wochen- oder Monats-Eimer liegt (`pruneAutomaticUnlocked`, nimmt nur
    `manual` aus), also beim nächsten automatischen Snapshot. In der Liste steht als Art
    `backups.kinds.styleMigration`. Der Snapshot-Speicher reist nicht über Git-Sync, es betrifft
    also nur den Rückweg auf demselben Rechner (gelesen in beiden Fassungen, nicht gemessen;
    siebenundvierzigstes Review, Niedrig 7). Der Satz: „Wer nach dem Umstellen zu 1.0 zurück will,
    stellt den Snapshot vor dem Umstellen zuerst in 1.1 wieder her und öffnet das Projekt erst
    danach mit 1.0.“
  - *Vorlagen und 1.0.x.* Ein Vorlagenpaket aus 1.1 mit einem Wert „nur hell“ liest 1.0.x als Wert
    für beide Modi, weil es die Angabe nicht kennt. Gemessen ist das am Paket, nicht an einem
    Projekt, das 1.0.x nach 1.1 öffnet. Außerdem bringt ein Paket aus 1.1 die zwölf Stylesheets
    der neuen Form mit, und 1.0.x setzt sie beim Import in ein bestehendes Projekt neben dessen
    alte in die Ladereihenfolge, unter „Vorlage gewinnt“ wie unter „Projekt gewinnt“. Der Build
    bleibt grün, aber beide Gestaltungen liegen übereinander; den Schutz (`otherFormStylesheetsOf`)
    hat erst 1.1. Der Weg dahin ist ein Paket, das ein Rechner mit 1.1 exportiert hat, oder eine
    Vorlage von der Website (der Assistent „Neues Projekt“ hat keine alte Form). Gemessen an 1.0.2
    mit dem mitgelieferten Paket und Kopien von brain-handbuch: 40 geladene Stylesheets statt 12
    bzw. 28 (siebenundvierzigstes Review, Niedrig 1). Der Satz: „Ein Vorlagenpaket aus 1.1 erst
    nach dem Update auf 1.1 in ein bestehendes Projekt importieren.“
- **für 1.1.1 außerdem** (Stand 2026-10-22, aus dem 57. und 58. Review; Messungen in
  [`publishing-and-credentials.md`](decisions/publishing-and-credentials.md), Nachträge vom
  2026-10-21 und 2026-10-22):
  - *Ziele mit „~“.* Über SFTP und FTP heißt ein führendes „~“ oder „~<eigenes Konto>“ jetzt auf
    jedem Server das Anmeldeverzeichnis (`e41df35f`). 1.1.0 legte dafür über OpenSSH einen Ordner
    „~“ bzw. „~<Konto>“ im Anmeldeverzeichnis an, vsftpd einen Ordner „~<Konto>“; ProFTPD und
    Pure-FTPd lösten auf oder brachen ab. Jedes solche Ziel lädt beim ersten Lauf nach dem Update
    einmal alles (`3a7aecce`, Merker `.tilde.json`), auch wo „~“ schon vorher richtig lag. Der
    Satz: „Wer ein SFTP- oder FTP-Ziel hat, dessen Pfad mit ‚~‘ beginnt: 1.1.1 lädt beim ersten
    Veröffentlichen einmal alles in den richtigen Ordner. Ein Ordner namens ‚~‘ oder
    ‚~<Kontoname>‘, den 1.1.0 im Anmeldeverzeichnis angelegt hat, enthält eine alte Kopie der
    Website und kann gelöscht werden, am besten im Dateimanager des Anbieters oder im
    SFTP-Programm. In einer Shell heißt er `./~`, nie `~`: `rm -r ~` löscht das ganze
    Anmeldeverzeichnis. Lag die alte Kopie im Webroot, ist ihre Adresse mit `/~/` danach weg.“
    (58. Review, N6: der erste Vorschlag nannte nur „~“ und keinen sicheren Weg.)
  - *rsync und Zeichen der Shell.* `a1d9aef3` lehnt im Remote-Pfad Leerraum und jedes Zeichen ab,
    das eine Shell deutet, auch `#` und `!`, die 1.1.0 richtig übertragen hat (58. Review, N3).
    Der Satz: „rsync lehnt jetzt einen Remote-Pfad mit einem Zeichen ab, das eine Shell deutet
    (etwa `$`, `#`, `!`, `*`, `[`). Unter macOS, bei `*`, `?` und `[` auch unter Linux, konnte ein
    solcher Pfad in einen anderen Ordner laden und dort löschen. Ein solches Ziel auf SFTP
    umstellen.“
  - *Ordner-Ziele prüfen ihren Ordner.* `6dba3247`, `67ef4ae6`, `fde8d49e`: Ein Ordner-Ziel, das
    schon veröffentlicht hat, bricht ab, wenn sein Ordner fehlt oder keine der veröffentlichten
    Dateien enthält. Das trifft auch einen Ordner, den ein Skript absichtlich leert, was mit 1.1.0
    lief (58. Review, N2; Handbuch 6.5). Der Satz: „Ein Ordner-Ziel, das schon veröffentlicht hat,
    bricht jetzt ab, wenn sein Ordner fehlt oder keine der veröffentlichten Dateien enthält, etwa
    weil das Laufwerk nicht verbunden ist. Wer den Ordner absichtlich leeren lässt, wählt vor dem
    nächsten Lauf ‚Alles neu hochladen‘.“
  - *Kleineres.* Eigene Sätze für eine abgelehnte SSH-Anmeldung (Passwort, hinterlegter
    Schlüssel, SSH-Agent, zu viele Schlüssel im Agent), einen FTP-Server, der schweigt, und eine
    `PWD`-Antwort, die QuartzControl nicht lesen kann; ein absoluter FTP-Pfad fragt `PWD` nicht
    mehr.
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

**Im selben Push das Basis-Template aus Punkt 4.** Es liegt im selben Repo und hat dieselbe
Bedingung: erst, wenn die Release-Seite online ist, und am selben Tag, nicht Tage danach. Danach
`npm run template:example -- --variant basic --check-sync`, Exit 0.

## 9. Die Website nennt die neue Fassung — und wird erst mit dem Release veröffentlicht

`QuartzControl-Web` baut aus dem Handbuch-Vault (`content` ist ein Link
auf `~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`), trägt also sofort den neuen Text. Zwei
Schnipselpaare nennen die Fassung ausdrücklich:

- `quartz/static/snippets/sidebar-note.md` und `sidebar-note.en.md` (die Box „Über dieses
  Handbuch“ links; bis zum 2026-09-24 stand die Fassung in einem eigenen Band über jedem
  Seitentitel, `version.html`, das gestrichen ist)
- `quartz/static/snippets/download.html` und `download.en.html` (Fassung und Pakete)

Die Kopie dieser Dateien im Handbuch-Vault unter `private/snippets/` wird mitgezogen
(`diff -r` gegen den Schnipselordner des Projekts muss still bleiben). Veröffentlicht wird die Website erst zusammen mit dem Release,
nicht vorher — sonst beschreibt sie eine Fassung, die es zum Herunterladen noch nicht gibt.
