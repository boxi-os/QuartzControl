# Das Benutzerhandbuch

Das Handbuch zur App — nicht zu verwechseln mit dem **Example-Handbuch**, das die Beispielvorlage
erklärt und im Vault `~/Obsidian/QuartzProjekte/Example` lebt
(`scripts/example-template/README.md`).

**Stand 2026-09-07: fertig.** 104 Seiten in zwei Sprachen (52 und 52, jede mit ihrem Partner über
`translationKey`), 695 Wikilinks, alle auflösbar; 130 Aufnahmen, 74 davon in den Seiten; in der App
erreichbar und aus jedem Bildschirm heraus verlinkt, in der Sprache, die die App gerade spricht.

Die Kapitel entstanden aus den Quellen — `de.ts`, die Routen, `electron-builder.yml`,
`docs/decisions/` — und wurden danach gegen die **laufende** App gehalten: je Route die sichtbaren
`h1`, Umschaltleisten und Kartenüberschriften ausgelesen und mit dem verglichen, was im Handbuch
steht. Das fand drei Abweichungen, die aus keiner Quelldatei hervorgingen (die Handlungsbedarf-Karte
ist immer da, nicht nur im Problemfall; die Kachel heißt „Git-Sync“, nicht „Git“; die eigenen Frames
stehen in der Plugin-Liste zuoberst, nicht zuunterst). **Wer eine Seite ändert, hält sie wieder
dagegen** — der Wortlaut einer Sprachdatei sagt nicht, in welcher Reihenfolge und unter welcher
Bedingung er auf dem Bildschirm erscheint.

## Warum es nicht im Example-Vault steht

Der Example-Vault reist im Vorlagenpaket mit. `resources/templates/minimal-lesbar.qtpl` (754 KB)
enthält 301 Einträge unter `files/content/`: der `content`-Baustein
(`electron/main/services/templatePackage/parts.ts`) liest durch den Symlink hindurch und packt den
ganzen Vault ein. Ein App-Handbuch als achtes Kapitel dort landete damit bei jedem Nutzer im
Import — als Inhalt seiner Website.

Also ein eigener Ort:

```
~/Obsidian/QuartzProjekte/QuartzControl-Handbuch/   der Vault — der Inhalt, eigenes git
        ↑ Symlink
~/Documents/QuartzControl-Handbuch/content/         das Projekt, mit der Example-Vorlage
```

Nicht `Handbuch`: In `QuartzProjekte/` liegt bereits `brain-handbuch`, und das ist ein
vollständiges Quartz-*Projekt*, kein Vault. Ein Vault namens `Handbuch` daneben führt beim nächsten
Lesen in die Irre.

Das Projekt entstand aus `minimal-lesbar.qtpl` — **ohne den Baustein `content`**. Bei einem
Symlink lehnt der Baustein sich zwar selbst ab (`contentIsSymlink`), aber abwählen ist ehrlicher
als sich darauf zu verlassen. Gemessen am 2026-09-07: 12 Bausteine im Paket, 11 importiert, keine
Warnung; die Website baut mit 9 Seiten zu 101 Dateien durch. Damit ist das Handbuch zugleich der
zweite echte Importtest des Pakets — das erste Projekt, das die Vorlage benutzt, ohne sie gebaut
zu haben.

Aufgesetzt wurde es wie in `scripts/build-example-template.mjs`: `git clone` von jackyzha0/quartz
(voll, nicht flach — ein flacher Klon lässt sich später nirgends hinpushen), `npm install`,
`npx quartz create`, dann der Import über die **gebaute App** per Playwright, also durch dieselben
IPC-Pfade wie ein Klick.

**Der Handbuch-Vault hat bewusst kein Remote** (Stand 2026-09-07). Er ist ein git-Repo, aber nur
auf dieser Maschine — anders als der Example-Vault, der nach `boxi-os/Quartz-Example-Vault` (privat)
gepusht wird. Das kostet keine Funktion, weil das Handbuch gebaut in der App mitreist; es heißt
aber, dass es außerhalb dieser Maschine keine Kopie des Quelltexts gibt. Wer das ändert, legt ein
privates Repo an und trägt es als `origin` ein.

**Die Vault-Schreibregel gilt weiter, nur für zwei Vaults:** `Example` und
`QuartzControl-Handbuch` werden gepflegt, alle anderen unter `~/Obsidian/` sind tabu. Gepflegt wird mit gewöhnlichen
Dateioperationen, nicht über das Obsidian-CLI — das fällt bei einem ihm unbekannten Vault-Namen
still auf einen anderen zurück (gemessen 2026-09-04).

## Die acht Kapitel

| Kapitel | Die Frage, die es beantwortet |
| --- | --- |
| 1 Einstieg | Was ist QuartzControl, was Quartz, was Obsidian — und was nimmt mir die App ab? Installieren, erster Start, wie das Fenster gelesen wird. |
| 2 Projekte | Wie lege ich ein Projekt an, hole ein vorhandenes dazu, dupliziere es? Was steht in den Einstellungen? |
| 3 Einrichtung | Übersicht, Titel und Basis-URL, Projektbild, Content-Ordner (echter Ordner oder Vault), Übersetzungen. |
| 4 Gestaltung | Stile (Basis, Community-Themes, Variablen, eigenes CSS), Layout (Frames, Global, Seitentypen), Plugins, Vorlagenpakete. |
| 5 Ansehen und bauen | Vorschau, Dev-Server, Build, was in der Konsole steht. |
| 6 Veröffentlichen | Zugänge und Ziele, GitHub Pages, Git-Sync, Ordner, rsync, Webhook. |
| 7 Wartung | Snapshots und Zurückholen, Quartz-Updates, App-Updates. |
| 8 Nachschlagen | Glossar der App-Begriffe, Menü und Tastenkürzel, wo die Daten liegen, bekannte Grenzen. |

Konventionen wie im Example-Vault: Nummer im Titel *und* im Dateinamen (der Explorer sortiert nach
dem Titel), `translationKey` = deutscher Pfad ohne Nummern-Prefix, `section` = Kapitelname, erster
Tag = Kapitel-Slug. Deutsch in der Wurzel, Englisch unter `en/`.

Das Glossar in Kapitel 8 erklärt die **App**-Begriffe: Projekt, Snapshot, Zugang, Ziel, Frame,
Baustein, Vorlagenpaket. Für Quartz- und Obsidian-Begriffe verlinkt es auf das Glossar des
Example-Handbuchs, statt es zu kopieren — eine zweite Kopie würde driften, und welche der beiden
dann stimmt, sieht niemand.

## Screenshots

`npm run screenshots` (`scripts/screenshots.mjs`) ist der Zwilling von `scripts/smoke.mjs`:
derselbe Launcher, dieselbe Wartelogik, und **dieselbe Routenliste** aus `scripts/routes.mjs`, die
beide importieren — sonst zeigt das Handbuch Bildschirme, die der Smoke-Test nicht mehr prüft.

- **`--demo` ist der Normalfall.** Es legt ein frisches Profil in einem Wegwerf-Verzeichnis an
  (`--user-data-dir`, nachgemessen: `app.getPath('userData')` folgt dem Schalter) und trägt über
  dieselben IPC-Pfade wie ein Klick ein, was auf den Bildern zu sehen sein soll — zwei Projekte,
  drei Zugänge und drei Veröffentlichungsziele. Was es einträgt, steht in
  `scripts/screenshot-demo.mjs`; alle Namen liegen unter `example.com`, das RFC 2606 genau dafür
  freihält. Ohne `--demo` wird gegen das echte Profil aufgenommen — dann zeigen die Bilder, was auf
  diesem Rechner eingerichtet ist.
- 1440 × 900, Vorgabe hell (`--scheme dunkel` oder `beide`). `emulateMedia` wird hier ausdrücklich
  gesetzt; im Smoke-Test steht dort bewusst `null`, weil er das Schema des Systems treffen soll.
- Ein Fenster je Schema statt eines Wechsels im laufenden: Das Farbschema wird im Hauptprozess
  gesetzt, und ein Wechsel danach lässt Seiten zurück, die ihre Farben beim Mount gelesen haben.
- Ziel: `<vault>/assets/screenshots/<sprache>/<route>-<hell|dunkel>.png`, verkleinert auf 1920 px
  Breite (Karten auf 1400).
- `--only <teil,teil>` für einzelne Aufnahmen, `--cards` zusätzlich für jede Karte,
  `--lang`, `--out`, `--project`.

### Zwei Dinge, die gemessen sind

**Eine Vollseiten-Aufnahme gibt es nicht.** Zwei Gründe übereinander: Eine Seite dieser App rollt
nicht im Dokument, sondern in einem Element darin, wovon `fullPage: true` nichts sieht — und ein
Fenster wird nicht höher als der Arbeitsbereich des Bildschirms. Am 2026-09-07 gemessen: angefragt
1200, 1600 und 2400 px Höhe, bekommen jedes Mal 923. Ein Screenshot zeigt nur, was das Fenster
wirklich rendert. Deshalb `--cards`: Playwright rollt ein Element vor seiner Aufnahme in den
sichtbaren Bereich und erreicht damit auch, was unter der Kante liegt. Erkannt wird eine Karte
nicht am Klassennamen einer Komponente, sondern an dem, was sie zur Karte macht — gerundet, mit
Rand und Fläche —, gesucht von der `<h2>` aus nach oben, denn `CardHeading` ist die einzige `<h2>`
in einer Karte.

**Die Zugänge-Karte wird ohne `--demo` nie aufgenommen.** Sie listet echte Server, Benutzernamen
und Host-Key-Fingerprints des Rechners, auf dem das Skript läuft; am 2026-09-07 stand genau das in
zwei Bildern, bevor sie gelöscht wurden. `CARD_BLOCKLIST` hält sie draußen. Unter `--demo` entfällt
die Sperre, und das ist keine Nachlässigkeit: Dort legt das Skript das Profil selbst an, leer, und
trägt seine eigenen erfundenen Zugänge ein — echte kann es dort nicht geben.

Dasselbe Profil löst zwei weitere Probleme, die keine Sicherheitsfrage sind, sondern eine der
Verständlichkeit: Die Projektliste zeigt zwei aufgeräumte Einträge statt fünf Wegwerf-Projekte, und
die Veröffentlichen-Seite zeigt drei Ziele statt „noch kein Ziel angelegt“. Eine Seite über Ziele,
die ein leeres Ziel-Panel abbildet, erklärt nichts.

**Was hier bewusst *nicht* gefälscht wird:** die Basis-URL bleibt `localhost`, also steht auf der
Veröffentlichen-Seite der Warnhinweis darüber — den beschreibt Kapitel 6.1, und ein Bild ohne ihn
wäre schöner und falsch. Ebenso bleibt der Host-Key unbestätigt: Bestätigen ginge nur an einem
echten Server.

### Die Szenen

`--scenes` nimmt auf, was eine Routenliste nicht trifft. Sie heißen im Plan „Handaufnahmen“, sind
aber gescriptet (`scripts/screenshot-scenes.mjs`) — eine Handaufnahme ohne notierten Weg ist beim
nächsten Mal keine, und ein geänderter Text macht sie still falsch. Zehn Stück: der Assistent, der
Duplizieren-Dialog, der Content-Quelle-Dialog, die Formulare für Ziel, Zugang und Frame, der
Frame-Editor beim Ziehen, der Snapshot-Vergleich, ein fertiger Build mit Konsolenausgabe und der
laufende Dev-Server mit Live-Vorschau.

Vier Dinge, die dabei zu wissen sind:

- **Nicht alles, was wie ein Dialog aussieht, ist einer.** Vier Szenen treffen ein natives
  `<dialog open>`; Ziel, Zugang und Frame sind Formulare *in* der Seite, und `dialog[open]` blieb
  bei ihnen leer. Die Szenen heißen entsprechend `dialog-…` oder `formular-…`, und die Kapitel
  sagen es genauso.
- **Zwischen zwei Szenen auf derselben Route muss man weg und wieder hin.** Ein Hash, der sich
  nicht ändert, mountet nichts neu, und das Formular der vorigen Szene verdeckte den Knopf der
  nächsten. Beim Frame-Editor reicht das nicht einmal: Er überlebt einen Routenwechsel (sticky per
  Pathname) und wird deshalb ausdrücklich geschlossen.
- **Das Ziehen wird mit Escape abgebrochen, nicht losgelassen.** Ein Loslassen würde den Bereich
  wirklich platzieren. Und der Griff muss vorher an den *oberen* Rand gerollt werden: Das Overlay
  ist ein `position: fixed`-Element mit `z-index: 999`, das dem Zeiger folgt — bei einem Griff am
  unteren Rand landete es bei y = 1230 und damit außerhalb des 900 px hohen Fensters. Im Bild sah
  das aus wie „kein Overlay“.
- **Der Dev-Server wird über `server.stop(id)` beendet**, nicht über den Pfad — sonst läuft er nach
  dem Lauf weiter.

### Was wirklich von Hand kommt

**Die nativen Bestätigungsdialoge.** Sie sind Fenster des Betriebssystems, kein DOM: Playwright
sieht sie nicht, und der Hauptprozess wartet auf ihre Antwort. Wer eine davon im Handbuch zeigen
will, nimmt sie mit dem Bildschirmfoto des Systems auf und notiert den Weg dorthin hier.

**Fehlerzustände.** Ein SCSS-Fehler oder ein fehlgeschlagener Build ließe sich herstellen, indem
man das Projekt kaputtmacht — und ein abgebrochener Lauf ließe es kaputt. Auch das bleibt Handarbeit
oder braucht ein Wegwerf-Projekt.

## Der Ablauf

Die Reihenfolge ist nicht beliebig: **Texte, dann Handbuch, dann Screenshots.** Jeder Screenshot
friert die App-Texte ein, und beim Schreiben eines Kapitels fällt erst auf, welcher Hinweis sich
nicht erklären lässt, ohne ihn zu ersetzen.

1. App-Texte überarbeiten, Bildschirm für Bildschirm, eigener Commit je Bereich.
2. Vault, Projekt, Kapitelgerüst.
3. Kapitel schreiben, mit der gebauten App daneben (`run-desktop`). Textbefunde **sammeln**, nicht
   nebenbei beheben.
4. Screenshot-Skript, Aufnahmen.
5. Zweiter Textdurchgang aus den gesammelten Befunden, betroffene Bilder mit `--only` neu.
6. Hilfe-Menü und Startseite verlinken das Handbuch; veröffentlichen.
7. Englisch als eigener Durchgang.

**Die Oberfläche ist dabei eingefroren.** Fällt beim Schreiben ein Bedienweg auf, der falsch ist,
wird er notiert und genannt — nicht behoben. Sonst veralten die Screenshots, während sie entstehen.

## Prüfen

Nach jedem Textdurchgang:

    npm run check:i18n && npm run typecheck && npm run build && npm run smoke

`check:i18n` ist das entscheidende Netz: Es löst jeden literalen `t('…')` und `mainT('…')` gegen
beide Sprachdateien auf und prüft die Parität in beide Richtungen. Solange nur *Werte* geändert
werden und keine Schlüssel, kann ein Textdurchgang nichts brechen, was es nicht sieht.

Für das Handbuch selbst: Bau über den Dev-Server der App, **nie** ein zweites `quartz build`
daneben — zwei Builder im selben `public/` enden in `ENOTEMPTY`. Dazu Linkprüfung und eine
Bildprüfung in beide Richtungen (jedes Bild wird referenziert, jede Referenz existiert).

Und am Ende die einzige Prüfung, die zählt: das Handbuch einmal von vorn lesen, als jemand, der
die App nicht kennt.

## Der zweite Textdurchgang (2026-09-07)

Der Plan sah zwei Teile vor. Der erste — die Befunde aus dem Schreiben — ist gemacht und war
messbar statt erinnert: Vier Begriffe meinten in der App zwei Dinge, und zwar genau die vier, an
denen mir das Schreiben schwerfiel.

| Begriff | Meinte | Jetzt |
| --- | --- | --- |
| **Baustein** | eine Komponente auf der Seite *und* einen Teil eines Vorlagenpakets | Komponente / Baustein. Die App sagte im Layout- und im CSS-Editor längst „Komponente", das Englische überall — Deutsch war der Ausreißer. |
| **Vorlage** | Quartz' Startvorlage *und* das `.qtpl`-Paket | Quartz-Startvorlage / Vorlage. Im Assistenten standen beide untereinander. |
| **Frame/Template** | dasselbe wie „Frame" | Frame |
| **Ausgabeverzeichnis** | dasselbe wie „Ausgabeordner" | Ausgabeordner — „Ordner" ist das Hauswort der App (Content-, Projekt-, Quell-, Zielordner). |

Das Glossar des Handbuchs musste unter „Baustein" eine Warnung führen („nicht zu verwechseln
mit…"). Diese Warnung war der Hinweis auf den Fehler, nicht seine Lösung; sie ist weg.

**Der zweite Teil — Kapitelverweise in den App-Hinweisen — bleibt offen, und zwar mit Absicht.**
Ein Hinweis, der „siehe Handbuch 4.4" sagt, während niemand das Handbuch öffnen kann, ist
schlechter als keiner. Der Verweis gehört hinter den Hilfe-Menü-Eintrag, nicht davor.

### `npm run check:handbook`

Aus dem Durchgang blieb ein Prüfskript: `scripts/check-handbook-quotes.mjs` liest die Blockzitate
des Handbuchs und prüft, ob die App sie noch sagt. Es entstand, weil ein pauschales Ersetzen von
„Ausgabeverzeichnis" durch „Ausgabeordner" im Handbuch „Jeder Build löscht **sein** Ausgabeordner"
stehen ließ, während die App längst „seinen" sagte — und weil sonst nichts danach sieht: Das
Handbuch liegt außerhalb dieses Repos.

Verglichen wird großzügig normalisiert (ohne Platzhalter, Zahlen, Anführungszeichen,
Hervorhebungen), weil ein Zitat kürzen und Beispielwerte einsetzen darf. Callouts und Zitate mit
einem Wikilink darin zählen nicht mit — Ersteres ist eigener Text, Letzteres ist kein wörtliches
Zitat mehr.

Die Lehre daneben, die kein Skript abfängt: **Ein pauschales Ersetzen über Prosa bricht die
Grammatik.** Sechs Stellen mussten von Hand nach — „das Ausgabeordner", „des Ausgabeordnerses",
„sein Ausgabeordner". In den Sprachdateien der App fiel das nicht an, weil dort jede Zeichenkette
einzeln angefasst wurde.

## Wie das Handbuch in die App kommt

**Es reist mit**, als gebaute Website, nicht als Link. Zwei Gründe: Es ist ohne Netz lesbar, und es
passt immer zu der Fassung, die gerade installiert ist — eine Online-Fassung beschriebe irgendwann
eine andere.

    npm run build:handbook      # aus dem Projekt nach resources/handbook/ (252 Dateien, 18 MB)

`resources/handbook/` ist gitignoriert und wird beim Packen erzeugt (`beforePack`) — dieselbe
Behandlung wie `resources/git` und ausdrücklich nicht wie `resources/templates`, das im Repo liegt.
Der Grund: Es ist ein erzeugtes Artefakt, dessen 16 MB Bilder bei jedem Textdurchgang neu
entstehen; im Repo wäre jede Aufnahme ein neuer Blob.

Anders als git lässt es sich **nicht** aus dem Netz nachholen — es entsteht aus einem Projekt, das
nur auf dieser Maschine liegt. Deshalb warnt `beforePack` und packt weiter, statt abzubrechen: Eine
App ohne Handbuch ist unvollständig, aber benutzbar. Und `openHandbook()` prüft die Datei, bevor es
sie öffnet, damit der Nutzer in diesem Fall einen Satz bekommt statt einer Fehlermeldung des
Betriebssystems.

Gebaut werden beide Sprachen in einem Lauf (437 Dateien, 36 MB); das Bundle wächst damit von 369
auf rund 405 MB. Erreichbar an zwei Stellen, die **dieselbe Funktion** rufen — zwei Stellen, die den Pfad selbst
zusammensetzen, laufen beim nächsten Umbau auseinander:

- **Hilfe → Handbuch**, als erster Eintrag: Wer dort nachsieht, sucht meistens etwas über diese App
  und nicht über Quartz.
- **Startseite**, über der Quartz-Dokumentation und dem Plugin-Katalog. Der Renderer kennt den Pfad
  nicht und bekommt dafür einen Kanal ohne Argument (`dialog.openHandbook`), nach dem Muster von
  `revealUserData`.

An der **gepackten** App gemessen (2026-09-07): `isPackaged: true`, Pfad
`Contents/Resources/handbook/index.html`, vorhanden (36 KB); 252 Dateien, 21 MB im Bundle, das
damit von 369 auf 395 MB wächst. Beide Wege rufen `shell.openPath` mit demselben Pfad — geprüft,
indem `openPath` im Hauptprozess abgefangen und mitgeschrieben wurde, statt zweimal einen Browser
zu öffnen.

## Wie ein Bildschirm sein Kapitel nennt

Jede Seite trägt unter ihrer Beschreibung einen Verweis auf das Kapitel, das *sie* erklärt —
`PageHeader` nimmt dafür einen `handbook`-Knoten, so wie er `status` und `actions` schon nimmt, und
die Seiten reichen `<HandbookLink page="4-gestaltung/04-variablen" />` herein. Bei einer Seite mit
Unterreitern entscheidet der offene Reiter; welche Kapitel das sind, steht als Tabelle `HANDBOOK`
oben in der Datei.

**Warum die Seite und nicht der Hinweis.** Die Regel in CLAUDE.md sagte ursprünglich, der Hinweis
nenne das Kapitel. Dreizehn Hinweise, die je ein Kapitel nennen, wären aber dreizehn Stellen, die
beim nächsten Umbau des Handbuchs veralten — und gesucht wird die Erklärung ohnehin nicht zu einem
Feld, sondern zu dem Bildschirm, auf dem man steht. Ein Verweis pro Seite deckt alle Hinweise
darauf ab und steht an einer Stelle.

**Warum ein Knoten und kein Pfad.** `ui.tsx` übersetzt nichts und spricht mit keinem Kanal; das ist
der Grund, aus dem dort Primitives leben. `HandbookLink` tut beides und liegt deshalb daneben, in
`src/components/`.

**Warum ein Rückfall statt eines Fehlers.** Zeigt ein Verweis ins Leere, öffnet sich die Startseite
des Handbuchs. Ein falscher Verweis ist ein Fehler im Handbuch, und der Nutzer kann nichts dafür.
Derselbe Rückfall fängt einen Pfad ab, der aus dem Handbuch hinausführte — geprüft in `menu.ts`
über `resolve()` und `relative()`, nach demselben Muster wie `containedPath()` im Vorlagen-Paket,
und davor durch ein zod-Schema, das nur Buchstaben, Ziffern und `/-_` durchlässt.

An der laufenden App gemessen (2026-09-07): 20 Bildschirme mit Verweis, jeder auf eine Seite, die
es gibt, keiner mit Rückfall. Ohne Verweis bleibt die Startseite — die trägt den Link schon in
ihrer Karte „Was ist Quartz?".

**Nebenbei aufgefallen, nicht behoben:** `scripts/routes.mjs` führt Layout als *einen* Eintrag,
während Konfiguration, Stile und Plugins ihre Unterreiter einzeln nennen. Der Smoke-Test besucht
„Seitentypen" und „Eigene Frames" deshalb nie, und die Screenshots zeigen sie nicht. Für diese
Messung waren sie von Hand ergänzt.

## Die englische Fassung

52 Seiten unter `en/`, verknüpft über `translationKey` — derselbe Schlüssel wie auf der deutschen
Seite, ohne Nummern-Prefix, damit ein späteres Umnummerieren die Paarung nicht anfasst. Die
Zweisprachigkeit macht `@boxi-os/quartz-multilanguage`, das die Sprache am Ordner erkennt; im Bau
stehen dann `hreflang`-Verweise in beide Richtungen.

**Übersetzt sind auch die Pfade** — aus `4-gestaltung/04-variablen` wird
`en/4-design/04-variables`, nicht `en/4-gestaltung/04-variablen`. Das ist der Grund für
`src/data/handbookPages.ts`: Ein Verweis im Seitenkopf nennt eine *Kennung*, keinen Pfad, und
`HandbookLink` löst sie über die aufgelöste Sprache der App auf. Sonst stünden an elf Aufrufstellen
zwei Pfade nebeneinander, und beim nächsten Umbau zöge jemand nur einen davon nach. Der Menüpunkt
ohne Seite geht denselben Weg: `mainLanguage()` entscheidet zwischen `index.html` und
`en/index.html`.

**Screenshots gibt es je Sprache** (`--lang en` schreibt nach `assets/screenshots/en/`), weil ein
englisches Handbuch mit deutscher Oberfläche im Bild nichts erklärt.

**`check:handbook` prüft jetzt zweisprachig:** Eine englische Seite wird gegen `en.ts` und den
`en`-Block des Hauptprozesses gehalten, nicht gegen `de.ts`. Beim ersten Lauf fielen sieben Zitate
durch — ich hatte die deutschen Sätze übersetzt, statt die englischen der App zu übernehmen. Genau
dafür gibt es das Skript.

### Eine Grenze, die bleibt

Auf einer englischen Seite stehen „Inhaltsverzeichnis“, „Graphansicht“, „Zuletzt bearbeitete
Seiten“ und die Beschriftungen der Suche weiter auf Deutsch. **Quartz' Komponenten lesen die Sprache
der Website, nicht die der Seite**, die sie gerade bauen — nachgesehen im gebauten Code, notiert
schon als Befund 29 in `scripts/example-template/BEFUNDE.md`. Verschieben lässt sich davon eines:
Datumsangaben werden im Browser nachformatiert. Alles andere löst nur ein Bau je Sprache, mit zwei
Adressen als Preis. Das Handbuch der Beispielvorlage zeigt dasselbe; die Grenze steht deshalb in
beiden Fassungen unter „Bekannte Grenzen“.

### Was der Vorlagen-Import mitgebracht hat

Der `static`-Baustein brachte die Schnipsel der Beispielvorlage mit — eine Seitenleisten-Notiz, die
das *Example*-Handbuch beschreibt und in dessen Kapitel verlinkt. Vier tote Links auf jeder Seite,
in beiden Sprachen, bis sie neu geschrieben waren. Wer eine Vorlage importiert, sollte danach in
`quartz/static/` nachsehen: Was dort liegt, spricht von dem Projekt, aus dem es kam.
