Du bist als zweites Paar Augen an einem Projekt, dessen Fassung `1.0.2` (2026-10-07) draußen ist
und dessen nächste, **1.1**, auf dem Branch `feat/1.1` fertig wird. Es geht um ein Review — nicht um
Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Sie ist das Review vor dem Release, das der Plan verlangt** (`docs/plan-1.1-umsetzung.md`, P8:
„Ein Review der 1.1-Commits vor dem Release“). Danach folgen nur noch die Vorlagen, das Handbuch
und das Packen. Ein Befund, der erst nach dem Release auffiele, erreicht Nutzer — und mit den
Vorlagen online auch Nutzer von 1.0.x, die nichts aktualisiert haben. Gewichte danach.

**Zwei Blöcke, und nur einer davon ist eine gewohnte Runde der Serie.**

- **Block A — was seit dem sechsundvierzigsten Review gebaut wurde.** Dessen Fixes (zwei Mittel,
  sechs Niedrig) samt Nebenbei-Liste, die Alpha-Szene 7 mit Befund 7.1 und zwei Fixes, zwei Punkte
  am Variablen-Reiter und die Doku-Commits aus P8. Wie jede Runde die Fixes der vorigen liest.
- **Block B — 1.1 als Ganzes, gesehen von 1.0.2 aus.** Nicht die 290 Commits noch einmal Zeile
  für Zeile; die Phasen P1 bis P7 haben die Runden 40 bis 46 gelesen. Sondern das, was **zwischen
  den Fassungen** liegt: Formate, die 1.1 schreibt und 1.0.x liest, Pakete, die in beide Richtungen
  reisen, Plugin-Fassungen, die nicht zur App passen, und die Release-Notizen, die das alles
  versprechen.

**Gewichte B höher.** Block A ist klein und hat ein Review als Grundlage. Die Fragen in B hat noch
keine Runde gestellt: Jedes Review las einen Stand gegen sich selbst, keins las 1.1 gegen 1.0.2,
und gemessen wurde an 1.0.x bisher nur ein einziges Vorlagenpaket.

**Alles, was du liest, hat ein einziges Modell geschrieben**: Claude Opus 5.5 — die Commits beider
Blöcke, das sechsundvierzigste Review, die Szene 7 und diesen Auftrag. Ein anderes Modell steht
nicht zur Verfügung; du bist ein eigener Agent ohne den Kontext der Sitzung, die das alles gebaut
hat. Was als „gemessen“ dasteht, steht aus den Commit-Nachrichten, dem Protokoll und den Absätzen
in `docs/decisions/`; prüfe entsprechend, und versuche jeden Fix zu widerlegen. Eine Zahl, die nicht
stimmt, ist ein Befund.

In der Zählung von `CLAUDE.md` ist das das **siebenundvierzigste** Review. Die Dateinamen zählen
nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln, gekürzt; die Begründungen unter derselben Überschrift in
`docs/decisions/conventions-full.md`. Die Messungen stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md` (am Ende: was aus dem sechsundvierzigsten geworden ist). Dazu
`docs/REVIEW-2026-10-20.md` (das sechsundvierzigste) mit seinem Auftrag,
`docs/ALPHA-2026-10-17.md` (Szene 7 am Ende), `docs/release.md` (Punkt 2b und die Notizen „für 1.1
außerdem“ in Punkt 7) und `docs/plan-1.1-umsetzung.md`.

## Umfang

### Block A — `review-2026-10-21..review-2026-10-22`

    git log --oneline review-2026-10-21..review-2026-10-22
    git diff review-2026-10-21..review-2026-10-22

26 Commits und dieser Auftrag, 30 Dateien, +1 008 / −75 (ohne den Auftrag). Was jeder Fix
behauptet, steht am Ende von `docs/reviews.md`.

- `7386e20` — das Dokument.
- **`b605556` — Mittel 1**: „Datei löschen?“ auf der Stile-Seite sagt wieder, dass nur git oder ein
  früherer Snapshot eine gelöschte Datei zurückbringt.
- **`5f53326` — Mittel 2**: Die Herkunft einer Projekt-Variable kommt nur aus geladenen
  Stylesheets, das zuletzt geladene gewinnt.
- `41a4e1c`, `040a5c4`, `b662a11`, `e25a17d`, `e777f0e`, `a362b78` — Niedrig 1 bis 6.
  **`040a5c4`**: „running“ erst, wenn auch der WebSocket-Port antwortet. **`e25a17d`**: ein
  laufender Install liegt im Hauptprozess. **`a362b78`**: ein Paket der 31 auf ein Projekt der
  zwölf.
- `dc7ebef` (Chronik), die Nebenbei-Liste `a5aa052`, `20313e4`, `081d765`, `316c6bc`, `b4252ef`,
  `8b495a9`, dazu `8bc5828` (Chronik).
- **Szene 7**: `235da7a` (Protokoll), **`202a2e4`** (`sass`) und **`19bd78e`** (`globby`), beide
  über `halfUnpackedModule()` in `projectDependencies.ts`.
- `8d0234a`, `cf7e173`, `f33b121` — die Herkunft einer geänderten Variable nennt ihren Ursprung;
  ohne Build keine Gesamtzahl.
- **P8, Doku**: `95328f2` (eine neue Regel in `conventions.md` und ein neuer Absatz in
  `decisions/plugins-and-config.md`: das Options-Schema hat drei Quellen), `b30fa52` und
  `fcfff63` (`docs/release.md`: Punkt 2b „Die eigenen Plugins sind vor der App veröffentlicht“
  und die Notizen für 1.1).

### Block B — `v1.0.2..review-2026-10-22`

    git log --oneline v1.0.2..review-2026-10-22     # 290 Commits
    git diff --stat v1.0.2..review-2026-10-22       # 208 Dateien, +34 323 / −11 926

Nicht als Diff zu lesen, sondern von den Stellen her, an denen sich die Fassungen begegnen. Einstieg:
die Abschnitte „Entscheidungen des Nutzers“ und P1 bis P7 im Plan, die Notizen in
`docs/release.md` und die Liste „Kritische Dateien“ im Plan.

## Abwägungen, die niemand gegengelesen hat

Block B zuerst, dann A.

**1. Ein Projekt, zwei Fassungen.** Wer Git-Sync auf zwei Rechnern benutzt, hat für eine Weile
1.1 auf dem einen und 1.0.2 auf dem anderen. Die Notizen nennen dafür genau einen Fall: die Stile
nach „Jetzt umstellen“ (0 Variablen und 0 Stylesheets in 1.0.x). **Was schreibt 1.1 sonst, das
1.0.2 anders liest oder beim Speichern zerstört?** Kandidaten: `quartz.config.yaml` mit
`layout.group`, mit `enabled: false` aus dem Vorrat, mit Optionen, die erst das neue Formular
setzt (Abschnitte, Bedingungen, `x-quartz-*`-Werte); `.quartz-gui/` mit neuen Verzeichnissen
(`authored-frames` u. a.), die `isSnapshotWorthy()` und `duplicateService` in 1.0.2 nicht kennen;
die verwalteten Blöcke und ihr Marker; eine Ordnung je Seitentyp. Und umgekehrt: Was schreibt
1.0.2 in ein Projekt von 1.1, das 1.1 danach falsch liest? Der Satz „aktualisiert zuerst alle
Rechner auf 1.1“ trägt nur, wenn er der einzige nötige ist.

**2. Pakete in beide Richtungen.** Die Notizen sagen: „Ein Vorlagenpaket aus 1.1 mit einem Wert
‚nur hell‘ liest 1.0.x als Wert für beide Modi … Gemessen ist das am Paket, nicht an einem Projekt,
das 1.0.x nach 1.1 öffnet.“ **Was tut ein Paket aus 1.1 sonst in 1.0.2** — die zwölf Stylesheets,
`static/images`, Snippets und Bilder der Layout-Box, ein Frame mit `layout.group`? Und was tut
ein Paket aus 1.0 in 1.1, als Ganzes und in Teilen, auf beiden Formen eines Projekts (Mittel 1 und
Niedrig 6 der vorigen Runden haben je eine Richtung abgedeckt)? Die Vorlagen online erreichen jede
Fassung, die „Basis-Template“ oder den Vorlagen-Katalog öffnet.

**3. Plugin-Fassungen, die nicht zur App passen.** Punkt 2b in `docs/release.md` sagt, die Vorlage
installiert die drei eigenen Plugins von `main` ohne Ref, und das Formular kommt aus dem
`configSchema` der installierten Fassung; eine ältere bekommt das Formular aus den `.d.ts`.
**Was passiert, wenn ein Projekt eine ältere Fassung hat** (layout-box vor 0.4.0, navigations vor
0.4.0): Schreibt das Formular dann Schlüssel, die die alte Fassung ablehnt oder still ignoriert?
Und in die andere Richtung: **Was heißt „`main` ohne Ref“ für jemanden, der in einem halben Jahr
ein Paket von heute importiert** — gegen ein `main`, das dann eine andere Options-Form hat? Ist das
ein Release-Risiko oder eine bewusste Entscheidung (dann: steht sie irgendwo)?

**4. Online und offline.** Der Plan sagt: Bis die Vorlagen online auf 1.1 stehen, holt
„Basis-Template“ online das Paket 1.0 und offline das mitgelieferte von 1.1; deshalb am selben Tag
veröffentlichen. **Gibt es weitere Stellen, an denen die Form eines Projekts am Netz hängt** —
Katalog, Fallback bei langsamen Antworten, eine Frist, nach der auf das Mitgelieferte
zurückgegriffen wird? Und was sieht ein Nutzer von 1.0.2, der nach dem Release-Tag
„Basis-Template“ wählt?

**5. Die Release-Notizen als Behauptungen.** Jeder Satz unter „für 1.1 außerdem“ in Punkt 7 von
`docs/release.md` ist eine Aussage über den Code. **Prüfe sie einzeln** — besonders die
Spezifitäten der Rangfolge (`:root`, `:root[saved-theme="dark"]`, `:root:not([saved-theme="dark"])`
mit 0,2,0), „Ohne ‚Jetzt umstellen‘ schreibt 1.1 die Form von 1.0“, „Ein alter Link auf den Reiter
landet im Layout“ und „Das schaltet das ganze Plugin aus“. **Und: Was fehlt?** Eine Änderung im
Verhalten, die ein Nutzer von 1.0.2 bemerkt und die dort nicht steht, ist ein Befund.

Dann Block A:

**6. Ein halb ausgepackter Baum.** `halfUnpackedModule()` (`202a2e4`, `19bd78e`) „geht den Baum von
`sass` ab, wie Node sucht“, und meldet den ersten Ordner ohne lesbare `package.json`. **Sucht es
wirklich wie Node** — verschachtelte `node_modules`, gehobene Pakete, `optionalDependencies`, die
auf dieser Plattform fehlen dürfen (`sass` hat `@parcel/watcher` als optionale, das wiederum plattformabhängige), `peerDependencies`, ein
Symlink als `node_modules` oder pnpm-Layout? **Gibt es ein heiles Projekt, dem es „nur halb
installiert“ sagt?** Dann schreibt die Stile-Seite nichts mehr und „Startseite anlegen“ verweigert.
Die genannten Kosten (12 Dateien, rund 1 ms) gelten für gui-test; wie viele sind es im größten
Projekt unter `~/Documents/QuartzProjekte/`? Für `globby` ist nur `fast-glob` gemessen.

**7. Wer zählt als „running“.** `040a5c4` wartet zusätzlich auf den WebSocket-Port, und seit
`46b1006` gibt es keine Frist. **Was ist mit einem Server, der auf http lauscht und auf ws nie** —
ein anderer ws-Port in den Server-Optionen, ein Remote-Dev-Host, ein Quartz, dessen ws-Server scheitert?
Bleibt er für immer „starting“, und kommt man dann noch heraus (Stoppen, Projektwechsel, Beenden)?

**8. Ein Install im Hauptprozess, und einer, den er nicht kennt.** `e25a17d` hält den Install je
`realpath`; Szene 7 zeigt, dass nach einem Neustart ein zweites `npm install` neben der Waise
laufen kann (Läufe E, F, gemessen ging es gut). **Sagt die App irgendwo, dass noch ein npm läuft,
das sie nicht gestartet hat?** Und `b662a11`: 30 s Frist für `git status` — gibt es ein echtes
Projekt (Vault mit vielen Dateien als `content/`), bei dem ein gesundes `git status` länger braucht
und die Übersicht dann „konnte nicht gelesen werden“ sagt?

**9. Herkunft und Zurücksetzen.** `5f53326`, `41a4e1c`, `8b495a9`, `8d0234a` ändern, welche
Stylesheet-Zeile als Ursprung einer Variable gilt. **„Zurücksetzen“ stellt diesen Wert wieder her —
ist es der Wert, der nach dem Zurücksetzen wirkt?** Fälle: derselbe Name in zwei Stylesheets mit
unterschiedlichem Modus (hell/dunkel), unter `@media`, in einer Datei außerhalb der
Ladereihenfolge, auf beiden Formen eines Projekts. Ein falscher Ursprung ist hier keine Anzeige,
sondern ein Wert, der geschrieben wird.

**10. Die neue Regel gegen den Code.** `95328f2` schreibt eine Regel nach `conventions.md`, die
jede künftige Sitzung liest: „Unlesbares wird ein JSON-Feld mit Notiz, ein gesetzter Schlüssel
ohne Schema ein Feld; das Bedienelement wählt das Schema, nie der Name.“ **Stimmt jeder Halbsatz
mit `shared/pluginOptionSchema.ts`, `pluginSchemaService.ts` und
`src/components/PluginOptionsForm/`?** Und stimmen die zwei Kopien der `x-quartz-*`-Liste (Kopf
des Lesers, `docs/plugin-config-schema.md`) heute überein? Dazu der neue Absatz in
`decisions/plugins-and-config.md`: Stimmen die genannten Commits und Fassungen?

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was der Nutzer verlieren kann

Abwägungen 1 (ein Rechner mit 1.0.2 zerstört, was 1.1 schrieb, oder umgekehrt), 2 (ein Paket, das
in der anderen Fassung etwas Falsches anlegt), 9 (ein falscher Wert beim Zurücksetzen) und 6 (ein
heiles Projekt, dem Schreiben verweigert wird).

### 2. Was die App anders zeigt, als es ist

Abwägungen 7 und 8, dazu 3 (ein Formular, das Optionen anbietet, die die installierte Fassung
nicht kennt).

### 3. Was nach dem Release nicht mehr zurückzuholen ist

Abwägungen 3, 4 und 5: Vorlagen online, eine Plugin-Fassung auf `main`, ein Satz, der in den
Release-Notizen fehlt. Eine App lässt sich mit 1.1.1 korrigieren; ein Paket, das 1.0.x-Nutzer
schon importiert haben, nicht.

### 4. Was die nächste Sitzung falsch macht

Abwägung 10, und jede Stelle in `docs/release.md`, die einen Handgriff anders beschreibt, als er
gehen muss.

## Wenn du misst

An einer **Kopie** eines Projekts (`cp -Rc` von `gui-test`), gebaute App mit einem
**Wegwerf-Profil** (`--user-data-dir`). Der Skill `run-desktop` (`.claude/skills/run-desktop/`)
zeigt, wie man die gebaute App über Playwright fährt; `npm run build` baut `out/` dieses Stands.

**Für Block B brauchst du 1.0.2 daneben.** Ein lokaler Klon des Tags in den Scratchpad
(`git clone --branch v1.0.2 /Users/boxi/Development/QuartzControl <scratchpad>/qc-102`, dort
`npm ci` und `npm run build`) ist der Weg; kein `git worktree` in diesem Repo. Dann dieselbe Kopie
eines Projekts abwechselnd mit beiden Fassungen öffnen, je mit eigenem Wegwerf-Profil, und nach
jedem Speichern `git diff` in der Kopie. Ein Vorlagenpaket aus 1.1 baust du mit
`npm run template:example -- --variant basic` nur, wenn du vorher in `docs/scripts.md` gelesen
hast, was es in welches Projekt schreibt; sonst ein Paket aus der App exportieren, an einer Kopie.

Für Abwägung 6 Kopien mehrerer Projekte (nicht nur gui-test) und eine, deren `node_modules` du von
Hand halb leerst; für Abwägung 7 eine Kopie, deren Quartz den ws-Port nie öffnet.

## Was offen bleibt, und nicht für diese Runde

Bekannt und gesammelt; ein Befund dazu ist nur willkommen, wenn er schwerer wiegt als hier gesagt:

- **Der Rest von P8**: Werkstätten und Websites auf quartz-navigations 0.4.3 heben; alle vier
  Vorlagen neu bauen (vorher `custom-scss-body.scss` mit `--only 5` vorschieben);
  Handbuch-Kapitel 4.4 bis 4.9 in beiden Sprachen und Screenshots; Version 1.1.0; Packen. Dass
  das Handbuch die Flächen von 1.1 noch nicht kennt, ist kein Befund.
- Aus früheren Runden offen: der Seitentyp `excalidraw` ohne Anzeigenamen; Cmd+S bei nur einem
  getippten Feld der Seitenleiste; eine Komponente im Vorrat je Seitentyp ausschließen; ein
  umbenannter Sprachcode zieht nichts mit; CLI-Schreibvorgänge ohne Schloss der Config.
- Die Voraussetzungen, die das sechsundvierzigste als nächste Kandidaten nannte und nach 1.1
  verschob: kein oder langsames Netz (außer Abwägung 4), ein Projekt, das nicht in einem Zug
  entstand, ein zweiter Nutzer derselben Ressource.
- Rückstand außerhalb von 1.1, wie am Ende von `docs/plan-1.1-umsetzung.md`: Linux-Schlüsselbund,
  macOS x64, glibc unter 2.34, C1 mit git vor 2.38.

## Eine Frage über den Code hinaus

Getrennt von den Befunden, am Ende deines Dokuments:

**Ist 1.1 nach dieser Runde veröffentlichbar?** Nicht „fehlerfrei“, sondern: Welche deiner Befunde
müssen vor dem Release behoben sein, welche können in die Release-Notizen, und welche warten auf
1.1.1? Und gibt es etwas, das an der Reihenfolge in `docs/release.md` falsch ist — etwas, das vor
dem Veröffentlichen der Vorlagen geschehen muss und dort danach steht, oder ein Schritt, der eine
1.0.x-Installation erreicht, bevor die App draußen ist?

## Form der Befunde

Schreibe `docs/REVIEW-2026-10-21.md`. Je Befund: die Stelle (Datei, Funktion, Commit), was
passiert, wie es sich zeigt, was dagegen spräche es so zu lassen, und — wo du eine hast — eine
Richtung. Nach Gewicht sortiert, Hoch/Mittel/Niedrig, und je Befund, aus welchem Block er kommt.
Was du gemessen hast, kennzeichne als gemessen und sag womit (und an welcher Fassung, 1.0.2 oder
1.1); was du gelesen hast, als gelesen. Eine Behauptung dieses Auftrags, die nicht trägt, ist ein
Befund wie jeder andere. Was dir nebenbei auffällt und kein Befund ist, kommt in einen eigenen
Abschnitt am Ende.

**Ändere nichts am Code und committe nichts.** Die einzige neue Datei im Repo ist dein Dokument.
Schreibe in keinen Obsidian-Vault. In kein Projekt unter `~/Documents/QuartzProjekte/` — Kopien mit
`cp -Rc` sind der Weg (und `content/` ist dort oft ein Symlink in einen Vault: in der Kopie
darunter nichts schreiben, auch keine mtimes). Das Projekt `hinterland-history` nie lesen und aus
jeder Schleife und jedem Glob über Projekte vorher ausschließen, nicht hinterher filtern.
**Eintragen, Bauen, Serverstarten, npm-Installieren und Vorlagen anwenden schreiben in das
Projekt**: nur in einer Kopie. **Für die gebaute App ein Wegwerf-Profil** (`--user-data-dir`), für
1.0.2 ein eigenes; `npm run smoke` tut das selbst. Eine gebaute Website nur über `--serve` auf
`localhost`. **Löse keinen Schlüsselbund-Dialog aus**; die echten Zugänge und Ziele dieses Rechners
nicht anfassen und nicht abbilden. Prüfskripte mit Chrome öffnen keine `mailto:`-Links. In den
Plugin-Repos unter `~/Development/` nichts ändern. **Veröffentliche nichts**, und pushe nichts.
