# Konventionen und Architekturentscheidungen

Die Regeln dieses Projekts: was gilt und warum. Sie standen bis zum 2026-09-17 in `CLAUDE.md` und
sind von dort **wörtlich** hierher gewandert, weil die Datei auf 192 KB gewachsen war und darüber
eine Warnung bekam — 103 KB davon waren die Review-Chronik ([`reviews.md`](reviews.md)), 68 KB
dieser Regelteil. (189 KB stand für dieselbe Datei daneben: das sind ihre 189 055 Zeichen, nicht
ihre Bytes.) `CLAUDE.md` bindet diese Datei ein; sie ist damit weiter Teil dessen, was jede
Sitzung liest, und nicht Nachschlagewerk.

Die Kurzfassung dessen, was gilt und warum. Die Messungen hinter jedem Punkt stehen in
[`decisions/`](decisions/) (Liste am Ende von `CLAUDE.md`); hier steht nur die Regel. Neue Regeln
kommen mit dem Experiment dazu, das sie erzwungen hat - in den Code als Kommentar, in
`decisions/` als Absatz.

Geändert ist gegenüber der Fassung in `CLAUDE.md` nur das Ziel der Markdown-Links: `](docs/…)` ist
`](…)`, weil diese Datei selbst in `docs/` liegt. Pfade im Fließtext nennen weiter die
Projektwurzel.

### Prozessgrenze

- **Drei Prozesse, ein Vertrag.** `shared/ipc-contract.ts` ist die einzige Quelle für Kanalnamen,
  Payload-Typen und die `QuartzGuiApi`-Schnittstelle. Reihenfolge einer Änderung: Vertrag → Schema
  (`ipc/schemas.ts`) → Handler → Preload → Renderer. Der Typcheck erzwingt die Vollständigkeit.
- **Jeder Kanal hat ein zod-Schema, sonst ist es ein Bug.** Der Renderer ist keine Vertrauensgrenze:
  er rendert Daten von GitHub. Schemas sind bewusst *loser* als die Typen (`looseObject`, `record`),
  weil `z.object()` unbekannte Keys streicht und damit den Config-Roundtrip bricht. Daraus folgen die
  `as`-Casts in `handlers.ts`.
- **Ein Vorlagen-Paket ist so wenig eine Vertrauensgrenze wie der Renderer.** Ein `.qtpl` ist eine
  Datei, die jemand weitergereicht hat: `readZip` weist ein Archiv mit absolutem Namen,
  `..`-Segment, Laufwerksbuchstaben oder NUL komplett zurück, und ein Name aus einem Baustein wird
  nie ungeprüft auf ein Verzeichnis gelegt - `containedPath()` (`templatePackage/shared.ts`)
  entscheidet per `resolve()`+`relative()`, in `plan` wie in `apply`. Messungen in
  [`templates-and-localization.md`](decisions/templates-and-localization.md).
- **Neue Kanäle nehmen ein Objekt-Argument**, kein Positions-Tupel (`dialog.confirm` ist das Muster):
  ein späterer optionaler Key ist dann eine Zeile im Vertrag und eine im Schema, nicht ein vierter
  Slot in vier Dateien. Bestehende Kanäle bleiben, wie sie sind (123 mit Positions-Argumenten,
  kein Umbau), und es gibt keinen neuen Kanal für etwas, das ein bestehender mit einem Flag kann.
- **Der Renderer läuft in der Chromium-Sandbox** (`sandbox: true`, seit 2026-09-02). Das Preload wird
  deshalb als CommonJS gebaut (`electron.vite.config.ts`): Electron lädt ein ESM-Preload nur ohne
  Sandbox, und genau das war der einzige Grund für das frühere `sandbox: false`. Im Preload gibt es
  kein Node - `platform` kommt aus Electrons Prozess-Polyfill, `homeDir` aus `process.argv`, wohin
  `createWindow` es über `webPreferences.additionalArguments` legt. Beides liegt synchron beim ersten
  Render vor, was `titlebarStripClass` braucht.
- **Nur `ipcMain.handle` über `handle()`/`handleNoArgs()`; kein `ipcMain.on`.** Events von Main zum
  Renderer gehen über `broadcast()` an alle Fenster; der Renderer abonniert über `onEvent` mit
  Rückgabe eines Abmelders. Sieben Events laufen so (`server:log`, `build:log`,
  `server:statusChanged`, `build:activityChanged`, `deploy:progress`, `templatePackage:progress`,
  `content:progress`); das achte, `app:navigate`, sendet `menu.ts` selbst an alle Fenster, weil das
  Menü ohne den Handler-Kontext lebt.
- **Alles, was Main aus Projektdateien liest und an Prozesse gibt, ist mit `--` getrennt; `git`
  bekommt nie eine Shell; nur npm/npx brauchen eine.** `runCommand.ts` ist der eine Spawner für
  kurzlebige Kommandos. Was *vor* dem `--` stehen muss — eine Revision wie `<sha>..HEAD` —, wird
  vorher auf seine Form geprüft: Die SHA aus `.quartz-gui/core-update.json` ging ungeprüft an
  `git log`, und `--output=<datei>` leerte beim Mount der Übersicht eine Datei
  (sechsundzwanzigstes Review).
- **Quartz und npm laufen unter Electrons eigener Node-Laufzeit; git kommt vom System, wenn es dort
  eines gibt, und sonst ebenfalls aus der App.**
  `nodeRuntime.ts` schreibt bei *jedem* Start drei Shell-Skripte (`node`, `npm`, `npx`) nach
  `<userData>/runtime/bin` und hängt das Verzeichnis vorn in den PATH — jedes Mal neu, weil der
  Pfad auf die Electron-Binärdatei im AppImage pro Start wechselt. Ein neuer Spawn muss davon
  nichts wissen: er ruft weiter `npx`. Die Shim-Vorlage steht in `resources/runtime/shim.sh`, weil
  `scripts/check-runtime.mjs` dieselbe füllt; der `-r`-Loader
  (`resources/runtime/defaultapp.cjs`) setzt `process.defaultApp`, ohne den liest yargs den
  Skriptpfad als Kommandonamen. npm reist als exakt gepinnte devDependency mit und braucht in
  `electron-builder.yml` **zwei** `extraResources`-Einträge. `ensureToolPath()` sucht deshalb nach
  **git**, nicht nach node. Der Ausweg ist eine Einstellung (`nodeRuntime: 'embedded' | 'system'`,
  Vorgabe eingebettet) für den einen Fall, der ihn braucht: ein Paket, das node-gyp verlangt.
  Warum nicht „Host zuerst" wie bei git, und alle Messungen: siehe
  [`electron-runtime-and-packaging.md`](decisions/electron-runtime-and-packaging.md).
  Für git gilt die umgekehrte Regel (`gitRuntime.ts`): das vom Rechner gewinnt, sobald es auf
  `git --version` *antwortet* — es trägt die Einrichtung des Nutzers, und eine Versionsuntergrenze
  gibt es nicht. Sonst das mitgelieferte (`scripts/fetch-git.mjs`, `npm run fetch:git`, geholt beim
  Packen über `beforePack`), mit `GIT_EXEC_PATH`, `GIT_TEMPLATE_DIR` und auf Linux
  `GIT_SSL_CAINFO`. Der gemeinsame Satz hinter beiden Regeln: **es gewinnt die Quelle, die die
  Anforderung garantiert erfüllt.** Damit kann kein Werkzeug mehr „fehlen, aber nachinstallierbar"
  sein — fehlt eines, ist die Installation unvollständig, und genau das sagt das Warnband.
- **Code aus dem `node_modules` eines Projekts läuft an genau zwei Stellen im Hauptprozess**:
  `sass` für den SCSS-Check (`styleService`) und `globby` für die Liste der Startseite
  (`contentService`). Beides fragt das Modul des Builds, statt eines mitzubringen oder
  nachzubauen — und beides läuft damit neben `safeStorage`, das die Zugangsdaten entschlüsselt;
  ein Kindprozess bekommt höchstens das eine Geheimnis seiner Aktion. Hingenommen, weil es Quartz'
  eigene Abhängigkeiten sind, die jeder `quartz build` ohnehin ausführt: Wer dort ein feindliches
  Paket ablegt, führt schon Code als der Nutzer aus. Eine dritte Stelle beruft sich nicht auf
  „`sass` macht das auch“, sondern sagt selbst, warum das Modul das des Builds ist und warum es
  nicht im Kind laufen kann; der Ausweg wäre ein Skript unter der eingebetteten Laufzeit über
  `runCommand`, dann auch für `sass`. Begründung in
  [`process-model-and-ipc.md`](decisions/process-model-and-ipc.md).
- **Eine Datei, die ein Werkzeug erzeugt, wird nicht gemergt, sondern neu erzeugt.** `package.json`
  und `package-lock.json` gehören npm, und beim Core-Update schreiben beide Seiten sie: Quartz'
  `3dff48b` hob alle Plugin-Versionen an, die Projekte hatten eigene Theme-Pakete darin. Uncommittet
  verweigerte git den Merge, committet ließ er zwei Dateien im Konflikt und einen hängenden Merge
  zurück, an dem jeder weitere Versuch starb. `runCoreUpdate` rechnet deshalb vorher einen Plan
  (`shared/packageJsonDeps.ts`), nimmt Quartz' Fassung beider Dateien und lässt npm die eigenen
  Pakete zurückschreiben. Was der Plan nicht nachspielen kann — ein lokal entferntes Paket, eine
  Änderung außerhalb der Abhängigkeitsblöcke —, fasst die App nicht an: Dann entscheidet git, und
  der Nutzer liest die Meldung, die er auch vorher las. Drei Ränder, die das sechzehnte Review
  gemessen hat und die jetzt dazugehören: **Die zwei Dateien werden nicht weggeworfen, sondern an
  git gegeben** (`git stash push -m 'QuartzControl: core update'`), weil ein Merge aus mehr Gründen
  hängen bleibt als wegen ihrer — bei einem halb fertigen Merge bleibt der Stash stehen und
  `abortCoreMerge` poppt ihn nach `merge --abort`. **Ob der Knopf ihn tragen wird, wird nach gits
  Regel gefragt, nicht nach einer Vereinfachung davon**: `reset --merge` behält die *ungestagete*
  Hälfte einer Änderung und wirft die gestagete weg, und wo der Merge um denselben Pfad geht,
  verweigert es den Abbruch ganz — drei Ausgänge, drei Sätze. **Und die Notiz trägt nicht nur den
  SHA, sondern auch die eigenen Pakete, die der Lauf gerade aus `package.json` genommen hat**:
  Der Plan rechnet gegen die Merge-Basis, und nach dem Merge ist die upstreams Commit — ein
  späterer Lauf rechnet also einen leeren Plan und installierte sie nicht wieder (gemessen am
  ersten *echten* Core-Update: „Already up to date“, `success: true`, npm „removed 52 packages“,
  und kein Wort darüber). Gelesen wird die Liste geprüft, nicht gecastet; sie liegt im Projekt des
  Nutzers und wird zu `npm install name@range`. **Ob sie noch gilt, wird an ihren eigenen Zeilen
  gefragt** (`git log -G<name>`), nicht an der Datei: „Wurde `package.json` seit der Notiz
  committet“ feuert auch für einen eigenen Commit aus anderem Grund, für upstreams Commits, sobald
  ein handaufgelöster Merge sie nach HEAD bringt, und für den Amend der App — ein Merge-Commit
  zeigt ohne `--diff-merges` gar keinen Diff, die beiden letzten sind damit von selbst draußen.
  Und wenn ein Lauf eine Liste fallen lässt, sagt er es (vierundzwanzigstes Review) — und zwar mit
  dem Grund, den er gemessen hat: „jemand hat eine dieser Zeilen angefasst“ und „der Commit der
  Notiz ist in git nicht mehr zu finden“ sind zwei Sätze, und genannt wird, was *fehlt*, nicht, was
  mit einem anderen Bereich dasteht (fünfundzwanzigstes Review). **Wer eine Frage an die Geschichte
  stellt, schreibt sich nicht selbst in die Antwort**: Ein Lauf, der zwischen zwei `npm install`
  scheitert, markiert in seiner Notiz, was er selbst schon zurückgeschrieben hat (`putBack`) —
  sonst ist der nächste Commit über eine dieser Zeilen die eigene Schrift der App, gelesen als
  fremde Hand. **Markiert, nicht gestrichen**: Diese Zeilen stehen uncommittet da, und ein
  `git checkout -- package.json` nach dem gescheiterten Update nimmt sie wieder weg; eine auf den
  Rest gekürzte Liste nannte sie danach nirgends mehr (sechsundzwanzigstes Review, Befund 1 — die
  Kürzung war der Fix der Runde davor, und ihr Preis stand nicht daneben). **Und „zurückgeschrieben“
  heißt „die Zeile hat sich in diesem Lauf bewegt“**, verglichen vor und nach den npm-Aufrufen:
  npm schreibt den Bereich, den es auflöst (`^3.0.1` für `is-odd@^3.0.0`), also sagt ein Vergleich
  mit dem Bereich der Notiz nicht, wer geschrieben hat — gemessen war vorher nur an einer
  Attrappe, die wörtlich schrieb (siebenundzwanzigstes Review, Befund 1). Und die Nadel des
  `-G` steht in Anführungszeichen, weil ein blanker Name jede Zeile trifft, die ihn *enthält*. Und ein vierter Satz für den Eintrag, der
  auf HEAD passt, während gar kein Merge offen ist: Dann gibt es keinen Knopf, aber auch keinen
  „Stand, den es nicht mehr gibt“ — `git stash pop` trägt ihn ein (alles zwanzigstes Review). **Der Plan
  fragt die Merge-Basis, die Türen öffnen sich gegen HEAD**, also gibt es einen zweiten Vergleich (`localPackageChanges(head, ours,
  head)`) für das, was der Reset wegnimmt, und `stillMissing()` für das, was die gemergte Datei
  noch nicht sagt. **Und angefasst wird nur, was `git ls-files` führt**: `git checkout -- a b` ist
  alles oder nichts, und ein Pfad, den HEAD nicht kennt, wird im Konflikt als gelöscht aufgelöst
  statt mit `--theirs` zurückgeholt. Zwei Ränder aus dem achtzehnten Review: **Der Stash gehört dem
  HEAD, auf dem er entstand** (`refs/stash^`, nicht dem Merge-Commit — derselbe Merge kann gegen
  zwei HEADs versucht werden, und `merge --abort` bewegt HEAD nicht); damit ist der Rückfall von
  `pop --index` auf einen einfachen Pop überflüssig, und schädlich war er auch, weil er aus einer
  sauberen Verweigerung Konfliktmarker machte. Und **„der Merge hat nichts geholt“ ist nicht „es
  ist nichts zu tun“**: HEAD steht auch still, wenn ein früherer Lauf den Merge committet hat und
  danach an `npm install` gescheitert ist — deshalb hält der Dienst zwischen Merge-Commit und
  Aufwärm-Build eine Notiz in `.quartz-gui/core-update.json`, und zwar als „steht aus“ und nicht
  als „fertig“, damit ein Projekt, das schlicht aktuell ist, seine Abkürzung behält. Drei Ränder
  aus dem zwanzigsten Review: **Ein Amend nimmt die Pfade, um die es geht, nicht den Index**
  (`--amend --only -- package.json package-lock.json`) — der Index gehört dem Nutzer, und nur im
  Konfliktzweig hält git ihn frei, weil es einen Merge über einer gestageten Änderung gar nicht
  erst beginnt; ein erneuter Lauf hat diesen Merge nicht mehr vor sich. **„Ein Merge-Commit dieses
  Laufs“ ist eine Menge, nicht zwei**: Auch der saubere, nicht vorspulbare Merge ist einer (HEAD
  steht danach weder, wo er stand, noch auf dem Geholten), nur die Vorspulung nicht — sonst
  antwortet derselbe Zustand beim ersten Lauf anders als beim zweiten. Und **der Wächter davor
  sagt, was er misst**: `git branch -r --contains HEAD` findet ein Remote-Tracking-Ref, nicht
  „hat die Maschine verlassen“ — die Wege der App schreiben eines (`quartz sync` pusht mit `-u`),
  ein Push per URL nicht, und eine lokale Spur davon gibt es ohne Netz nicht. Vier Ränder aus dem
  einundzwanzigsten Review, drei davon an derselben Notiz: **Sie wird geschrieben, bevor sie
  gelesen wird**, also mit dem, was der *nächste* Lauf braucht (`wanted`), nicht mit dem Plan
  dieses Laufs — der ist im fortsetzenden Lauf leer, und die Liste überschrieb sich so selbst mit
  `[]`, eine Zeile bevor sie benutzt wurde. **Die Bindung an den SHA gehört an das, was einen
  Commit beschreibt**: an den Amend ja, an die Paketliste nicht — ein einziger Commit zwischen
  zwei Läufen ließ sie sonst verfallen, und was schon dasteht, kostet höchstens einen npm-Aufruf,
  der nichts ändert — im Normalfall nicht einmal den, weil ein Lauf, dessen Plan greift, die
  Zeilen mit npms Bereich in die Liste legt (achtundzwanzigstes Review, Befund 3).
  **Und „weicht von HEAD ab“ ist nicht „npm hat es geschrieben“**: `--only` nimmt die Pfade aus
  dem Arbeitsbereich, also committete der Amend nach einem sauberen Merge, was der Nutzer
  uncommittet gehalten hat. Was das trennt, wird *vor* dem Merge gemessen (standen beide Dateien,
  Index und Arbeitsbereich, auf HEAD?) und für den fortsetzenden Lauf als drittes Feld der Notiz
  weitergereicht; eine Notiz ohne dieses Feld erlaubt nichts. **Und die Notiz beschreibt einen
  Lauf, nicht die Zeit danach:** Zwischen dem gescheiterten und dem fortsetzenden Lauf kann der
  Nutzer an denselben zwei Dateien gearbeitet haben, und von npms Resten ist das nicht zu
  unterscheiden — also müssen beide Hälften stimmen, die Auskunft der Notiz und die eigene Messung
  des fortsetzenden Laufs. Gemessen an einem echten Lauf: ohne diese zweite Hälfte stand ein
  `scripts`-Eintrag, den der Plan ausdrücklich nicht anfasst, im Merge-Commit. Der vierte: **ein Rat, der einen
  Befehl nennt, nennt auch sein Argument** — `git stash drop` ohne eines trifft den obersten
  Eintrag, und der gehört dem Nutzer, sobald er selbst einen zurückgelegt hat. Messungen in
  [`snapshots-and-updates.md`](decisions/snapshots-and-updates.md).
- **Ein Kindprozess, der die App überleben soll, hängt nicht an einer Pipe zu ihr.** Die Leseenden
  von stdout/stderr sterben mit dem Prozess, der sie hält, und der nächste Schreibversuch des Kindes
  bringt es um — bei einem Dev-Server also der erste Rebuild nach dem Beenden der App, ohne Meldung,
  weil niemand mehr liest. Die Ausgabe geht deshalb in eine Datei unter `.quartz-gui/logs/`, die
  Main tailt (`buildService.ts`); zwei Dateien, weil die Konsole stderr einfärbt. Ein neues
  Verzeichnis unter `.quartz-gui/` muss zwei Listen lernen: `isSnapshotWorthy()` nimmt alles mit,
  was nicht ausdrücklich genannt ist, und `duplicateService` kopiert alles, was nicht in `SKIP`
  steht. Messungen in [`navigation-and-pages.md`](decisions/navigation-and-pages.md).
- **Ein Ausgabeordner hat einen Schreiber, und die zwei Richtungen bekommen zwei Antworten.** Ein
  einmaliger Build leert `public/` und schreibt es neu, der Dev-Server baut bei jeder Änderung
  hinein — beides zugleich hinterlässt einen Stand, der von keinem der beiden ist. „Jetzt bauen“
  wird deshalb **abgelehnt**, solange der Server dieses Projekts denselben Ordner hält
  (`assertOutputFree()`, im Handler vor der Ordner-Rückfrage und noch einmal in `runBuild`), mit
  den zwei Wegen in der Meldung; „Starten“ dagegen **wartet** auf den laufenden Build, weil nur
  diese Richtung warten kann, ohne dass jemand ein zweites Mal klickt — und sagt in der Konsole,
  worauf. **Das Warten hat dafür einen Eintrag** (`pendingStarts`, Status `starting`): Ein Fenster,
  in dem der Status „stopped“ heißt und der Knopf „Starten“ dasteht, ist genau das, worauf ein
  zweites Mal geklickt wird — und ohne den Eintrag war dieses Fenster die Dauer des Builds statt
  der 38 ms von `refreshAuthoredFrames`, die es vor der Sperre war. Wer während des Wartens stoppt,
  bricht das Warten ab; es gibt nichts zu signalisieren, und beide Seiten bieten dafür bei
  `starting` „Stoppen“ an. `startedAt` entsteht beim Spawn, nicht beim Klick — dazwischen liegt
  jetzt ein ganzer Build, und „Gestartet vor …“ liest die Zeit.
  `stopping` zählt weiter als Schreiber, ein wartender Start auch. Ein Server aus einer früheren Sitzung gehört
  keinem Eintrag und wird nicht gesehen; ihn zu finden hieße, bei jedem Klick Ports abzusuchen.
  Messungen in [`navigation-and-pages.md`](decisions/navigation-and-pages.md).
- **Ein Vorgang, der ein Repository schreibt, wird im Hauptprozess gesperrt, nicht im Renderer.**
  `coreBusy` war ein `useState`: das Gedächtnis eines Fensters an das, was es selbst gestartet hat,
  und es stirbt mit der Route. Zwei gleichzeitige Core-Updates auf demselben Projekt ließen den
  zweiten mitten aus dem ersten heraus scheitern und hinterließen Konfliktmarker in `package.json`
  — kein gültiges JSON mehr, kein Merge-Commit. Das Schloss hängt am Projektpfad und gilt für
  Update *und* Abbruch, weil beide dasselbe Repository schreiben; der zweite Anrufer bekommt einen
  Satz statt eines git-Fehlers. **Sein Schlüssel ist ein Ordner, nicht eine Schreibweise**: `p` und
  `p + '/'` liefen nebeneinander, bis `realpath` davorstand — das antwortet für den Schrägstrich,
  für einen Symlink und auf APFS auch für die Großschreibung, weil die Promises-Fassung das native
  `realpath(3)` ist und die Schreibweise der Platte zurückgibt. Und `git fetch` im
  Lauf hat dieselbe Frist wie der des Status, weil ein Hangen das Projekt sonst bis zum Neustart
  der App hält. Messungen in
  [`snapshots-and-updates.md`](decisions/snapshots-and-updates.md).
- **Wer einen Zustand aus fremden Ausgabezeilen liest, weiß, wessen Zeilen er liest.** Ob gerade
  gebaut wird, hält `buildService` als *eine* Aktivität je Projekt, und zwei Quellen schreiben
  hinein: das stdout von `quartz build` und das Log des Dev-Servers. Jede bewegt nur die Aktivität,
  die ihr gehört, und ein laufender Build gewinnt — sonst ersetzt ein Neubau des Servers die Zeile
  des Builds und räumt sie ab, und mit ihr die Sperre (zwölftes Review: 3,3 von 6,9 s). Ein Muster
  wird gegen alle Ströme gelesen, auf denen Quartz den Satz schreibt („Rebuild failed“ kommt über
  `console.error`), und gegen beide Neubauten (der harte nach jedem Speichern in der App sagt einen
  anderen Satz als der weiche). Ein zweiter „Jetzt bauen“ tritt dem laufenden nur bei, wenn er in
  denselben Ordner will. Messungen in
  [`navigation-and-pages.md`](decisions/navigation-and-pages.md).
- **Jede Dekompression bekommt eine Obergrenze, und die Datei selbst liefert sie nicht.** Ein WOFF2
  sagt, wie lang seine Tabellen sind, ein ZIP-Eintrag, worauf er sich entpackt — geschrieben hat das
  jeweils der, von dem die Datei kommt. Also `maxOutputLength` an *jeder* Stelle: die eigene Zahl,
  wo sie kleiner ist, und eine absolute Decke darüber (64 MiB je Schrift, 256 MiB je Paket), geprüft
  *bevor* das erste Byte entpackt wird. Gemessen: 863 Bytes WOFF2 wurden zu 1,1 GiB RSS, ein 522-KB-
  Paket zu ebenso viel; darüber endet es nicht in `null`, sondern in einem abgebrochenen
  Hauptprozess. Der `catch` fängt einen `RangeError` aus einer begrenzten Dekompression, nie einen
  Out-of-Memory-Abbruch. Messungen in
  [`templates-and-localization.md`](decisions/templates-and-localization.md).
- **Ja/Nein-Bestätigungen laufen über den nativen Dialog im Main-Prozess. In-App-Overlays sind nur
  für Inhalte mit Formular oder Auswahl.** Der Renderer fragt über `confirmDialog()`
  (`src/utils/confirm.ts` → Kanal `dialog.confirm`), nie über `window.confirm()`. Die sichere Antwort
  sitzt in `buttons[0]` mit `cancelId: 0` - `defaultId` entscheidet unter macOS nicht, was Return tut.
  Der bestätigende Button ist nach der Aktion benannt („Snapshot löschen“), nie „OK“. Die Regel steht
  als Kommentar am Handler und am `Modal`-Primitive, damit sie nicht driftet.
- **Das Benutzerhandbuch reist in der App mit, und nur der Hauptprozess weiß wo.** `handbookRoot()`
  in `menu.ts` löst `process.resourcesPath` (gepackt) bzw. `resources/` im Repo (Entwicklung) auf;
  `openHandbook()` prüft die Datei, bevor es sie öffnet — sonst bekäme der Nutzer bei einem Bau ohne
  Handbuch eine Fehlerseite statt eines Satzes. Der Renderer bekommt dafür einen Kanal **ohne
  Argument** (`dialog.openHandbook`, Muster: `revealUserData`) und ruft dieselbe Funktion: Zwei
  Stellen, die den Pfad selbst zusammensetzen, laufen auseinander. Gemessen an der gepackten App am
  2026-09-07: `isPackaged: true`, Pfad `Contents/Resources/handbook/index.html`, vorhanden;
  Bundle 369 → 395 MB.
- **Eine gebaute Website wird als Adresse geöffnet, nicht als Datei.** Was Quartz baut, ist für
  einen Webserver geschrieben: `./tags/publishing` ohne Endung, `./4-gestaltung/` als Verzeichnis,
  `/1-einstieg/` von der Wurzel *der Website*. Unter `file://` löst davon nichts auf — am
  2026-09-08 über die 123 gebauten Seiten gezählt: von 4876 Links zeigte **kein einziger** auf eine
  Datei (377 extern, 951 auf ein Verzeichnis, 2937 auf einen Namen ohne Datei, 611 auf die Wurzel
  des Dateisystems), und Chrome blockierte die Modul-Skripte gleich mit („origin 'null' … blocked
  by CORS policy"), also Suche, Explorer, Sprachwechsel und Dunkelmodus. Deshalb liefert
  `handbookServer.ts` das Handbuch über http auf `127.0.0.1` mit einem Port vom Betriebssystem aus
  und löst die drei Formen auf (Datei, `dir/index.html`, `name.html`), und `openHandbook()` ruft
  `shell.openExternal`. Das löst zwei Fragen mit derselben Antwort: `http:` geht **immer** an den
  Browser, während `shell.openPath` auf eine `.html` die Anwendung startet, die das System für
  `public.html` führt — bei jemandem, der Websites baut, gern ein Editor. Nach der Umstellung
  gemessen: 4499 von 4499 internen Links antworten mit 200, keine Konsolenfehler, und durch die
  gebaute App vier Aufrufe des Kanals auf einen Server. Der Server bindet nur die Loopback-Adresse,
  antwortet nur auf GET und HEAD, prüft die Einbettung nach `resolve()`/`relative()` und sendet
  **kein** `Access-Control-Allow-Origin`.
- **Fenster:** ein Fenster, `hiddenInset` nur auf macOS, `will-navigate` erlaubt nur das eigene
  Dokument, `setWindowOpenHandler` gibt nur http(s) an den Browser, CSP ohne externe Hosts. Theme
  wird in Main über `nativeTheme.themeSource` gesetzt, *vor* `createWindow()`.

### Renderer

- **Eine Route ist gemountet, und sie besitzt ihr Dokument.** Beim Mount lesen, in `useState`
  halten, expliziter Save, `dirty` durch Vergleich mit dem Gelesenen (nicht durch Flag beim ersten
  Tastendruck). Nach jedem eigenen Schreibvorgang neu lesen; ein Dokument wird nie über eine Aktion
  hinweg gehalten, die Main daran schreiben könnte. Fünf Seiten halten so je eine Kopie der Config;
  das ist sicher, solange nur eine Ansicht gemountet ist. Ein `project:changed`-Event kommt erst,
  wenn zwei Ansichten gleichzeitig leben - nicht vorher.
- **Was der Build liest, ist die Datei, nicht der Entwurf.** Ein Satz über eine Folge außerhalb der
  Seite — die Website zeigt ein kaputtes Bild, die Config nennt eine Datei, die fehlt — fragt den
  gespeicherten Stand (`savedSnapshot`), nicht das, was gerade im `useState` liegt. Der Hinweis am
  dunklen Projektbild las den Kopfbereich-Schalter aus dem Entwurf, und der Schalter stand direkt
  darüber: ausgeschaltet schwieg der Hinweis, obwohl die Datei das Bild noch nannte, eingeschaltet
  warnte er vor etwas, das nicht passiert (dreizehntes Review, an der gebauten App in vier Fällen
  gemessen, vorher zwei falsch).
- **Ein Satz über einen Zustand steht nicht in dem Kasten, den dieser Zustand mit sich nimmt.** Der
  Abbruch-Satz auf Git-Sync hing im Merge-Band; ein geglückter Abbruch räumt das Band ab, und genau
  die Hälfte der Antworten, für die es den Knopf gibt, wird *nach* dem Abbruch gesagt — die
  verworfene vorgemerkte Datei, der gescheiterte Stash-Pop. Zu sehen war der Satz für die Dauer
  eines Status-Reads (fünfundzwanzigstes Review, an der gebauten App gemessen).
- **Eine Bedingung fragt das, was sie anzeigt.** Die Zeile „n Commits fehlen“ hing am Zustand
  `behind`; seit `pending` gegen alle drei anderen Antworten gewinnt, fiel die Zahl genau dann weg,
  wenn ein Projekt halb aktualisiert *und* zugleich hinterher war — also dort, wo zwei verschiedene
  Hashes nebeneinander stehen und der Knopf zwei Dinge tut (vierundzwanzigstes Review).
- **Was im Renderer lebt, stirbt mit dem Fenster - unter macOS aber nicht die App.** Ein
  geschlossenes Fenster beendet weder die App noch die Dev-Server; alles, was danach noch stimmen
  soll, gehört in den Hauptprozess. Für die Log-Zeilen ist das `services/logBuffer.ts`, gelesen über
  `logs:history` beim Öffnen eines Projekts.
- **App-weit gibt es vier Dinge im Store** (`state/store.ts`): Projektliste, Settings, Fehler,
  Log-Puffer pro Projekt. Letzterer, weil Main Log-Zeilen unabhängig von der Seite sendet und ein
  seitenlokales Abonnement sie verlöre. Das Abonnement lebt einmal in `App.tsx`.
- **„Wo war ich“ überlebt einen Routenwechsel, nicht einen Neustart.** `useStickyState(key)` für
  Tab, Auswahl, Suchtext, Entwurf; keyed per Pathname, Namespace pro Komponente. Nicht für Gesten
  oder Pending-Flags. Scroll-Position analog in `ProjectLayout`. Schlüssel sind stabile Kennungen
  (ID, Name, Pfad), nie Listenindizes — ein Zustand an einer Position gehört nach dem Umsortieren
  zum falschen Ding. Die aufgeklappten Plugins waren der eine Fall, der so hing; sie hängen seit
  dem Instanzen-Durchgang am Namen (`stickyKey()` in `Plugins/Installed.tsx`, mit `#n` für die
  n-te Instanz desselben Plugins). Am 2026-09-06 nachgezählt: 20 `useStickyState`-Aufrufe im
  Renderer, davon 19 mit festem Schlüssel und genau einer mit einem berechneten — dem Namen oben.
  Keine Position. Ein Link in einen
  anderen Bereich, der mehr als einen Pfad übergeben will („diesen Frame im Layout-Editor öffnen“),
  schreibt vor der Navigation mit `primeStickyState(pathname, key, value)` in den Store der Zielroute;
  die liest es genau einmal beim Mount, danach ist der Aufruf wirkungslos.
- **Ein Menüpunkt, der die Seite meint, geht über `app:command`.** `app:navigate` bewegt den Router,
  `app:command` bittet die gemountete Seite (heute nur `'save'`, Cmd+S). Beide hören einmal in
  `App.tsx`; die Antwort auf ein Kommando steht in einem Modul-Register (`state/saveCommand.ts`),
  weil immer nur eine Route gemountet ist. Wer nichts zu tun hat, registriert `null` - ein Kommando
  ohne Registrierung tut nichts, und genau deshalb muss der Menüpunkt nicht ausgegraut werden.
- **Verlassen mit ungespeicherten Änderungen fragt.** Modul-Flag in `unsavedGuard.tsx`, gesetzt von
  der Seite, abgefragt von der Sidebar; `UnsavedBadge` neben dem Save. Nur Sidebar-Links sind
  geguardet. Die Frage ist ein nativer Dialog und damit asynchron: der Klick wird gestoppt und die
  Navigation von Hand ausgelöst. Drei Antworten, wenn die Seite ein Save registriert hat
  (`saveCommand.ts`): Abbrechen, Speichern, Verwerfen - bei einem gescheiterten Speichern bleibt der
  Guard auf der Seite, weil dort die Fehlermeldung steht.
- **Das registrierte Speichern schreibt alles, was `dirty` zählt.** Badge, Cmd+S und der
  Verlassen-Dialog lesen dasselbe Flag; ein Save, der weniger schreibt, macht aus der dritten Tür
  einen Datenverlust - „Speichern" gesagt, `true` zurückgemeldet, navigiert, und die Entwürfe der
  übrigen Reiter sterben mit der Route (*Eigenes CSS*, elftes Review). Wer eine Teilmenge speichern
  will, braucht einen eigenen Knopf, der seine Reichweite im Namen trägt - und der muss dann auch
  dastehen.
- **Ein Lesevorgang, dessen Schlüssel sich per Klick ändert, braucht einen Abbruch-Guard**
  (`useIpcQuery`). Zwei Antworten sind dann gleichzeitig unterwegs und die langsamere gewinnt, egal
  welche Frage später gestellt wurde. Wo der Schlüssel konstant ist oder sein Wechsel die Route neu
  mountet, ist ein Guard nur Zeremonie.
- **Ein Ref, den ein Effekt zurücksetzt, hängt an einem Render, den React auslassen darf.** Ein
  `setState` mit demselben Wert rendert nicht, der Effekt läuft nicht, und der Ref bleibt stehen —
  im Frame-Editor genügte ein Klick auf das schon aktive Breakpoint-Segment (`SegmentedControl`
  meldet auch den), und jedes Bereichsformular danach kam ohne Fokus. Wer einen Ref vor einem
  `setState` umlegt, prüft vorher, ob sich der Wert überhaupt ändert.
- **Kein API-Aufruf ohne Netz:** globaler `unhandledrejection`-Handler → Toast; jeder Busy-Flag wird
  in `finally` zurückgesetzt (`useAsyncAction` für boolesche, `try/finally` für keyed). **Der Toast
  ist aber nicht die Antwort für einen Lesevorgang, ohne den die Seite nicht existiert**: Die
  Stile-Seite blieb bei einem gescheiterten `config:get` für immer auf „Lade…“ stehen, ohne Kopf
  und ohne Reiter, und nur die Ecke sagte warum. Was die Seite trägt, bekommt ein `catch` und einen
  Fehlerzustand in der Seite (durch `formatIpcError`, wie überall sonst); was sie nicht trägt, darf
  weiter scheitern und den Toast bekommen.
- **URL zuerst, Sticky-State als Fallback** für Sub-Tabs (`?tab=`); alte Pfade bleiben als
  Redirects. Gilt für alle vier Leisten (Konfiguration, Stile, Plugins, Layout); der Default-Tab
  löscht den Parameter, statt ihn zu setzen. Was kein Name aus einer festen Liste ist - der offene
  Seitentyp, das gerade bearbeitete Frame - bleibt sticky-only und reist bei einer Übergabe über
  `primeStickyState`.
- **Eine Stelle bestimmt die Seitenbreite** (`ProjectLayout`, 1800px). Seiten setzen keine eigene
  Maximalbreite; Breite wird in Spalten ausgegeben, nicht in längeren Zeilen. Ein Block, der schmal
  bleiben will, sagt am Block, warum.
- **Wer rollt, ist nicht wer die Breite deckelt.** Der Roller (`overflow-y-auto`) geht über die
  volle Fensterbreite, die Kappung sitzt in einem Kind darin. Beides an einem Element hängt die
  Rollleiste an den rechten Rand der zentrierten Spalte — bei 1728 px Fenster und `max-w-6xl` sind
  das 288 px vom Fensterrand, also mitten im Bild. `ProjectLayout` war schon so gebaut (`<main>`
  rollt, das innere `div` deckelt), Startseite und Einstellungen nicht. Eine Leiste oder ein Panel
  mit eigenem Roller ist davon nicht betroffen: Dort gehört die Rollleiste an die Kante des Panels.

### Primitives und Gestaltung

- **`ui.tsx` wrappt native Elemente; erweitern statt daneben bauen.** `Field` ist ein `<label>` und
  darf keinen Button enthalten (`FieldGroup` dafür). `className` auf einem Primitive ist Platzierung,
  nie Farbe. Neue Variante → `VARIANTS`, nicht Klasse von außen.
- **`Modal` ist das native `<dialog>` mit `showModal()`.** Top-Layer, Backdrop, Escape, inerter
  Hintergrund und Fokus-Rückgabe kommen vom Element; `<form method="dialog">` macht Return zum
  Bestätigen, und ein deaktivierter Submit-Button unterdrückt das implizite Absenden. Das Feld, das
  den Fokus bekommen soll, trägt `data-autofocus`. Kein `fixed inset-0`-Overlay mehr, nirgends -
  gemeint sind Vollflächen-Overlays, die die Seite abdecken; die Toasts in `ErrorSurface`
  (`fixed bottom-4 right-4`) decken nichts ab und bleiben erlaubt.
  Bestätigen und Schließen sind zwei Callbacks, `dialog.returnValue` wird nicht benutzt: `onSubmit`
  fängt das Absenden ab (Return, Submit-Button), der Dialog bleibt dabei offen, und die Seite
  schließt ihn über `open` bzw. Unmount, wenn ihre Aktion durch ist. `onClose` heißt immer „nicht
  bestätigt“: Escape, oder ein Absenden in einem Modal *ohne* `onSubmit`. Ein Abbrechen-Button ruft
  dieselbe Funktion wie `onClose` direkt auf; das Schließen über `open`/Unmount löst `onClose` nicht
  noch einmal aus (`closingOurselves`). Ein Modal mit Eingabe hat `onSubmit`; ein Modal ohne
  Eingabe darf ohne auskommen - dann heißen Return und Escape beide „nicht bestätigt“, und für
  einen Anzeige-Dialog ist genau das richtig.
- **`Button` hat `type="button"` als Default.** In einem Formular reicht ein untypisierter `<button>`
  ein; der eine Button pro Dialog, der das soll, sagt `type="submit"`. `SegmentedControl`s Segmente
  tragen ihn seit U3 ebenfalls.
  Und er ist seine eigene Flex-Zeile (`inline-flex items-center justify-center gap-1.5`): Ein Icon
  kommt direkt neben das Wort, ohne `<span>` und ohne Klassen am Aufrufer. Vorher löste jeder der
  14 Icon-Knöpfe Tailwinds `svg { display: block }` selbst, in zwei Formen (vier mit
  `inline-flex` am Knopf, zehn mit `<span>`), und die standen mit 31,5 und 32,8–33,3 px
  nebeneinander (fünfundzwanzigstes Review; gezählt im sechsundzwanzigsten, Befund 8).
- **`SegmentedControl` ist eine Radiogruppe, keine Knopfreihe.** `role="radiogroup"` mit
  `role="radio"`-Segmenten, `aria-checked`, Roving-Tabindex (die Gruppe ist ein Tabstopp), Pfeile
  links/rechts/hoch/runter wandern durch die Optionen und *ändern dabei die Auswahl*, mit Umbruch an
  beiden Enden - so wie es die native Radiogruppe in diesem Chromium tut und wie jeder Klick hier
  ohnehin sofort committet. Auch für die vier Sub-Tab-Leisten: `tablist` ohne `aria-controls` auf ein
  `tabpanel` wäre ein halber Vertrag, „eins von N“ stimmt überall. Der Fokus wandert *vor* `onChange`,
  weil vier Aufrufstellen dabei navigieren. `label` ist Pflicht wie bei `Toggle` und wird zu
  `aria-label` (eine Gruppe hat kein `<label>`, das sie umschließen könnte); eine Gruppe ohne Namen
  ist damit am Aufrufer sichtbar falsch. Die Optionen dürfen Daten sein statt einer festen Liste -
  der Ziel-Wähler in Veröffentlichen ist seit 2026-09-03 einer, weshalb die Gruppe umbricht statt
  überzulaufen. **Dafür gibt es seit 2026-09-06 `variant="chips"`**: die gemeinsame graue Leiste
  setzt voraus, dass alles in eine Zeile passt, und `w-fit` kann nicht auf die breiteste
  *umgebrochene* Zeile schrumpfen - bei sieben Zielen stand neben der zweiten Zeile eine halbe
  Kartenbreite leere Fläche. Ohne gemeinsame Fläche ist ein Umbruch eine zweite Reihe statt einer
  Lücke. Die Bedienung ist in beiden Häuten dieselbe; alle elf anderen Aufrufstellen sind einzeilig
  (nachgemessen: 0-2 px Spiel bei 1728 wie bei 1280 px) und bleiben `track`. Messungen in
  [`navigation-and-pages.md`](decisions/navigation-and-pages.md) und
  [`publishing-and-credentials.md`](decisions/publishing-and-credentials.md).
- **Eine Karte hat eine Überschrift, und die hat ein Icon.** `CardHeading` (`ui.tsx`) ist das
  einzige `<h2>` in einer Karte: `text-heading` (15px, der Name, den `tailwind.config.js` genau
  dafür führt), halbfett, davor ein Lucide-Icon in `size={15}` und `text-text-secondary`. Kein
  getöntes Quadrat wie bei `PageHeader` und dem `Section` der Einstellungen — die benennen eine
  *Seite*, und eine Seite trägt sechs Karten. Welches Icon eine Karte bekommt, ist keine freie
  Erfindung: Geht es um dasselbe wie ein Eintrag der Seitenleiste, nimmt sie dessen Icon aus
  `navConfig` (Plugins → `Blocks`, Frames → `LayoutGrid`, Wartung → `Wrench`). Vorher waren es 30
  handgeschriebene Karten-Überschriften in drei Größen — 14px, 15px und 16px, letzteres aus einem
  nackten `font-medium` auf einem `<h2>`, das Tailwinds Preflight auf Grundschriftgröße lässt —,
  zwei Gewichten und mit Icon an dreien davon. Messungen in
  [`navigation-and-pages.md`](decisions/navigation-and-pages.md).
- **Farben heißen nach Rolle, nicht nach Palette.** Zehn Tokens in `src/index.css` (`--ground`,
  `--surface`, `--text`, `--text-secondary`, `--text-muted`, `--ink`, `--accent`, `--accent-hover`,
  `--accent-fg`, `--accent-text`), in `tailwind.config.js` als `bg-ground`, `bg-surface`, `text-text`,
  `text-text-secondary`, `text-text-muted`, `border-ink/10`, `bg-accent`, `text-accent-text`. Der
  Muted-Token ist `text-text-muted`; Labels und Micro-Labels in Großbuchstaben `text-text-secondary`.
  `--ink` trägt nur Kanäle (Schwarz hell, Weiß dunkel), das Alpha steht am Ort und darf pro Schema
  verschieden sein (`border-ink/[0.06] dark:border-ink/10`). Statusfarben (Danger-Rot, Badge-Töne,
  InfoNote-Blau) bleiben Palette; eine immer dunkle Fläche bekommt weder `dark:` noch Token.
  Umgestellt sind `ui.tsx`, `body` und die vier U4-Seiten; alles andere beiläufig beim Anfassen,
  kein sed. `theme.ts` hält den Grund als zweite Kopie - Electron malt ihn, bevor der Renderer
  existiert; beide Seiten verweisen aufeinander.
- **Was ohne Zutun erscheint, wird angesagt.** Eine Meldung, die nach einer Aktion von selbst
  auftaucht, gehört in eine Live-Region: der `status`-Platz des `PageHeader` (`role="status"`), eine
  Konsole in `role="log"`. Die Region muss *vor* ihrem Text im Dokument stehen - sie wird also leer
  gerendert, nicht mit dem Inhalt zusammen; im `PageHeader` heißt `status={null}` „leer, aber
  da“ und eine fehlende Eigenschaft „diese Seite sagt nichts“. Knöpfe und Badges bleiben draußen: die
  ändern sich, weil jemand tippt. Eine `<h1>` pro Seite, jede `<nav>` mit Namen. Messungen in
  [`navigation-and-pages.md`](decisions/navigation-and-pages.md).
- **Eine Ansage, die schweigt, sagt den Satz von vorhin.** Der Guard, der beim Aufnehmen eines
  Drags das „X liegt über X“ verhindert, gilt für *diesen einen Augenblick* — später ist ein
  Schritt zurück auf den eigenen Platz eine Bewegung wie jede andere und bekommt einen eigenen
  Satz (`dnd.backHome`). Gefragt wird über `isHome`, das die Aufrufstelle mitbringt — der Name war
  die Abkürzung, die den Frame-Builder deckte (dort hat der eigene Platz einen eigenen Bezeichner
  und heißt trotzdem gleich) und am Layout-Board falsch lag. Den Augenblick selbst hält ein zweiter
  Ref: die erste Meldung eines jeden Drags schweigt.
- **Was keinen festen Platz hat, wird über `announce()` gesagt.** Eine Meldung, die zu *einer Zeile*
  einer Liste gehört, oder der Verlauf eines Drags, hat keinen Ort für eine eigene Region - beides
  geht in die eine Region der Seite (`state/announcer.tsx`, gemountet in `App.tsx`). Ganze Sätze mit
  Subjekt, nicht „Gespeichert“. Drag-Ansagen kommen aus `utils/dndAnnouncements.ts`, damit die
  beiden Listen dieselben Sätze in derselben Sprache sagen; die Aufrufstelle liefert nur, wie aus
  einer Drag-ID ein Name wird — **und, getrennt davon, wann zwei IDs dasselbe Ding meinen**
  (`isHome`). Der Name ist das, was vorgelesen wird; identisch macht er nichts. Am Layout-Board
  tragen ein Paletten-Chip und die Zeile, die er dupliziert, denselben, und zwei Instanzen
  desselben Plugins auch — jede Ablage auf dem Namensvetter galt als „nichts bewegt“, während die
  Zeile drei Plätze gewandert war. **Die Vorgabe „der eigene Platz ist die eigene Id“ trägt an drei
  der vier Stellen**: Ein Paletten-Chip heißt `palette:<index>` und wohnt in `palette-drop-zone`,
  also las sich jeder Satz über den Vorrat als Bewegung, und ein Ablegen, bei dem nichts passiert,
  hieß „abgelegt“ (vierundzwanzigstes Review). **Und drittens, was eine Ablage überhaupt bewirkt
  hat** (`dropOutcome`): Auf dem Vorrat wird ein Duplikat *gelöscht* und eine Einzelinstanz
  *abgelehnt*, und beides kam als „abgelegt“ heraus — eine Löschung als Bewegung angesagt und ein
  Nichts ebenso (fünfundzwanzigstes Review). Eine Ansage sagt, was passiert ist, nicht, wohin
  gezogen wurde; wo die Aufrufstelle nichts sagt, bleiben die gewohnten Sätze. **Und eine
  Ablehnung wird in der Region gesagt, die gerade spricht**: Der Frame-Builder lehnte eine Ablage
  auf einem belegten Feld ab und sagte das über `announce()`, während dnd-kits Region im selben
  Augenblick „abgelegt“ sagte — zwei Sätze, einer falsch (sechsundzwanzigstes Review). Er gibt
  dafür jetzt selbst ein `dropOutcome` mit.
- **Schriftgrößen heißen nach Rolle, so wie die Farben.** `text-micro` (11px: Labels, Hinweise,
  Badges), `text-ui` (13px: Text in einem Bedienelement oder einer Zeile), `text-heading` (15px: die
  Überschrift einer Karte), definiert in `tailwind.config.js`. Seit dem 2026-09-06 gibt es keine
  `text-[11px]`, `text-[13px]` und `text-[15px]` mehr; die Ausreißer (10/11,5/12/12,5/14/17/19px,
  17 Stück) behalten ihre Zahl, bis einer einen Namen verdient. Die Tokens setzen **nur** die
  Schriftgröße, genau wie die arbitrary values, die sie ersetzt haben - deshalb war die Umstellung
  an 129 Stellen ohne jede Layoutfolge, gemessen mit `scripts/styles-snapshot.mjs`.
- **Ein deaktiviertes Control muss noch lesbar sein.** Explizite disabled-Farben, keine Opazität:
  Text wird `text-text-muted`, ein Feld sinkt auf `bg-ground`, ein Icon-Button geht von
  `text-text-secondary` auf `text-text-muted`. Gedimmt werden darf nur, was keine eigene Information
  trägt (der Toggle-Knopf, die native Checkbox). Ein Feld, dessen Wert gerade nicht gilt, ist nicht
  deaktiviert: `Field muted` setzt nur das Label auf Muted, Control und Hinweis bleiben.
- **`darkMode: 'media'`, und das ist der App-Schalter.** `nativeTheme.themeSource` flippt
  `prefers-color-scheme` im Renderer mit; `color-scheme: light dark` auf `:root`, explizite Farben
  auf `select option` für Linux. Neue UI mit `dark:`-Varianten. Kein Wechsel auf `'class'`: die
  nativen Dialoge, das Linux-`<select>`-Popup und die Scrollbar hängen an der Media-Query.
- **Ein Bereich eines Frames ist Geometrie, eine Belegung ist die Herkunft seines Inhalts.** Die
  beiden sehen wie dasselbe aus, solange ein Frame höchstens sieben Bereiche hat — mehr Quellen
  gibt Quartz nicht her, `buildLayoutForEntries` hält seine sechs Positionen als Literal. Zwei
  Bereiche auf derselben Belegung rendern dieselbe Liste zweimal (gemessen: drei auf `left`, also
  die ganze Seitenleiste dreimal auf jeder Seite), deshalb ist `slot` optional — ein Bereich ohne
  Belegung ist eine leere Zelle — und eine Doppelbelegung wird im Editor gesagt. Darüber hinaus
  geht es über Quartz' zweiten Schlüssel: `layout.group` faltet die gruppierten Einträge einer
  Position zu einer Flex zusammen, und **die k-te Flex einer Position ist die k-te Gruppe**. Das k
  steht im generierten Frame, weil es aus der flachen Positionsliste nicht ablesbar ist — und zwar
  nicht einmal, sondern einmal je Seitentyp: **Quartz baut je Seitentyp ein eigenes Layout**
  (`exclude` und geleerte Positionen wirken vor `resolveGroups`), sagt dem Frame aber nie, welchen
  es gerade rendert. Das Frame bekommt deshalb alle Ordnungen, die die Config hergibt **und dieses
  Frame erreichen können** — ein Seitentyp, dessen `template` ein anderes Frame nennt, ist keine
  Kandidatin — und wählt beim Rendern die, deren Gruppenzahlen passen: erst über alle sechs
  Positionen genau, dann, falls dort keine passt, noch einmal über alle sechs, die geteilten aber
  weiter genau und die übrigen nur noch als Obergrenze. **Eine Position außerhalb spricht nur in
  eine Richtung:** Rendert die Seite dort *weniger* Flexes als beschrieben, hat das die gewöhnliche
  Erklärung (eine Gruppe, deren Mitglieder alle abgeschaltet sind); rendert sie *mehr*, gibt es
  keine, und die Kandidatin widerspricht sich selbst. Sie ganz wegzulassen warf genau das Zeugnis
  weg, das eine falsche Kandidatin ausgeschlossen hatte — gemessen: 203 von 211 Editorial-Seiten
  zeigten die Komponente der einen Gruppe im Bereich der anderen, unter einer Warnung, die die
  Teilung für normal erklärte. Passen zwei verschieden geordnete gleich gut, wird nicht geraten,
  sondern gesagt. Die Frames halten damit eine Kopie aus der Config, und **der Wächter über eine
  solche Kopie steht an der Tür, an der sie gelesen wird, nicht an denen, an denen das Original
  sich ändert**: `buildService` ruft `writeAllFrames()` vor jedem `quartz build` und jedem
  `--serve`-Start. Zur Config führen acht Türen (Speichern, vier Plugin-Operationen über die CLI,
  Plugin-Update, `quartz sync --pull`, Vorlagen-Import, Restore je Datei) — eine Liste, an die die
  nächste nicht angebaut wird; die eine Bau-Tür deckt sie alle. Stimmen die Zahlen beim Bauen
  nicht, wird nichts geraten: alles in den einfachen Bereich, Warnung ins Log. Messungen in
  [`layout-frames.md`](decisions/layout-frames.md).
- **Erzeugtes CSS gehört in die Kaskadenschicht dessen, was es nachspricht.** Quartz rendert
  `frame.css` als *ungeschichtetes* `<style>` am Anfang des `<body>`; sein eigenes und das
  Plugin-CSS liegen in `@layer quartz-base`, das `custom.scss` des Projekts dahinter ungeschichtet.
  Ungeschichtet schlägt geschichtet unabhängig von der Spezifität — die zwei Kompat-Blöcke in
  `shared/gridFrameCss.ts` überholten damit nicht nur die Plugins, die sie zitieren, sondern jede
  Regel, die eine Vorlage über `.explorer` schreiben kann, und zwar an jeder Breite, weil die
  Desktop-Hälfte unbedingt gilt. Gemessen in Firefox und WebKit: die Schublade der Vorlage war
  wieder die des Plugins (`absolute` statt `fixed`, 100 vw statt 340 px, deckend, `overflow: hidden`
  und damit unscrollbar), der gefaltete Explorer wieder der 19-px-Stummel. Sie stehen deshalb in
  `@layer quartz-base` — dort schlägt der `[data-frame]`-Scope weiter das Plugin, und das Projekt
  schlägt weiter uns. Die Grid-Regeln des Frames bleiben ungeschichtet: das ist die Antwort der App
  auf eine Frage, die sonst niemand beantwortet. Wer fremdes CSS abschreibt, schreibt beide Hälften
  ab — und prüft die Behauptung „vollständig“ Regel für Regel gegen die Quelle, nicht gegen die
  Erinnerung an sie. Was dabei absichtlich fehlt, steht mit Grund in der Liste daneben; eine
  Auslassung ohne Satz schickt den nächsten Leser wieder in die Quelle, auch wenn sie richtig ist
  (dreizehntes Review: die `.sidebar`-Regeln aus `base.scss` und explorer, die ein eigenes Frame nie
  trifft, weil es seine Bereiche als `.qgframe-area-*` rendert).
- **Kein natives HTML5-Drag mehr, nirgends.** Alle vier Stellen ziehen mit `@dnd-kit`
  (`Plugins/Installed`, `LayoutEditor/GlobalBoard`, `LayoutEditor/FrameBuilder`; `Styles/CustomCss`
  hatte nie eines, nur Pfeile). Eine neue Stelle nimmt `@dnd-kit` mit `KeyboardSensor`, denn natives
  Drag kann weder Tastatur noch Ansagen. Was dabei gilt: der gezogene *Knoten* ist das ganze
  Element, der Griff nur `setActivatorNodeRef` (sonst vermisst die Kollisionsrechnung den Griff);
  eine Liste nimmt `useSortable` mit `sortableKeyboardCoordinates`, ein Raster `useDroppable` mit
  `nearestDroppableCoordinates` aus `utils/dndKeyboard.ts` - ohne einen der beiden schiebt ein
  Pfeildruck um 25px und damit um nichts; `PointerSensor` mit `distance: 4`, wo derselbe Griff auch
  klickbar ist. **Ein Pfeildruck geht von dem Feld aus, auf dem er steht**, und ein Ziel, in dem
  der Ausgangspunkt schon liegt, ist kein Schritt - sonst gewinnt das eigene Ablageziel jeden
  Vergleich, sobald sein Rect und das gezogene verschieden gemessen werden (im Frame-Builder 48
  gegen 26,5 px: ArrowDown bewegte den Bereich `header` nie, auf dem Layout-Board verpuffte der
  erste Druck). Auf einer Sortierliste ist das Feld die gezogene Zeile selbst, dort ändert die
  Regel nichts. **Und ein Schritt ohne Ziel auf der eigenen Achse endet nie dort, wohin der Sensor
  nicht rollt:** Der `KeyboardSensor` rollt nur entlang der Achse der Taste, also ist ein Ziel,
  dessen Mitte auf der *anderen* Achse außerhalb des Fensters liegt, kein Schritt — am
  Layout-Board setzte → aus dem Kopfbereich den Chip 685 px unter den Fensterrand, in die rechte
  Seitenleiste (einunddreißigstes Review, Befund 4). **Das Layout-Board geht gar keinen schrägen
Schritt:** Dort hing „im Fenster“ am Rollstand und an der Fensterbreite, dieselbe Taste am selben
Ort hatte zwei Antworten, und bei 1280 px war ← mit Leertaste ein Löschweg über den Vorrat
(zweiunddreißigstes Review, nebenbei 1 und 2). Der Frame-Builder behält die Runde, weil er über
sie aus dem Raster in die Ablage kommt. **Wer beides mischt, nimmt den Raster-Getter**: Das Layout-Board hat Sortierlisten
  *und* Ablagezonen *und* eine Palette, und ein Paletten-Chip ist ein `useDraggable` und kein
  Droppable - `sortableKeyboardCoordinates` liest `droppableContainers.get(active.id)` und liefert
  für ihn nichts, eine leere Zone erreicht er ohnehin nicht. Und die Regel gilt erst, wenn die
  Sensoren auch *übergeben* sind: `GlobalBoard` stand seit dem neunten Review in dieser Liste und
  gab seinem `DndContext` gar keine mit (achtzehntes Review, Befund 3; gemessen: ein Chip landete
  nach drei Pfeilen wieder auf der Palette). Zwei der drei sortierbaren Listen tragen zusätzlich „nach oben /
  nach unten“ (`Plugins/Installed`, und die Ladereihenfolge in `Styles/CustomCss`, die nie ein Drag
  hatte): die Tastatur-Aufnahme ist eine Geste, die man kennen muss. **Das Layout-Board ist die
  Ausnahme, und zwar mit Grund:** Eine seiner Zeilen kann nicht nur innerhalb ihrer Liste steigen
  und fallen, sondern in sechs andere Zonen und auf die Palette — ein Pfeilpaar beantwortet davon
  eine Richtung von sieben und sähe aus, als beantworte es alle. Was die Geste ersetzt, sind
  dnd-kits `screenReaderInstructions` aus `dndAccessibility` (neunzehntes Review, Befund 6). **Und über einem Drag steht nie ein `stopPropagation()`:**
  Der `KeyboardSensor` hört, sobald ein Drag läuft, auf dem *Dokument*, und React ruft für ein
  `stopPropagation()` im Renderer auch das native an der Wurzel — ein Guard, der ein Zeichen vom
  Elternknoten fernhalten soll, nimmt damit dem laufenden Drag Pfeile und Escape ab. Wer zu viel
  hört, verengt am Hörer (`e.target === e.currentTarget`), nicht an dem, was aufsteigt. **Und das
  gezogene Rechteck ist, was gezogen wird:** dnd-kit gibt dem `DragOverlay` die Größe des gezogenen
  Knotens und misst dann dessen *einziges Kind* — ein Block-Element darin ist damit so breit wie
  der ganze Knoten, und jede Pfeilrechnung zentriert diese Breite auf dem Ziel. Im Frame-Builder
  waren das 1060 px, die linke Kante landete bei −70 und der `KeyboardSensor` scrollte, statt zu
  bewegen; der Chip trägt deshalb `w-fit`. Wer eine Rechnung nachbessert, prüft zuerst, ob ihre
  Eingabe stimmt. Messungen in
  [`plugins-and-config.md`](decisions/plugins-and-config.md) und
  [`layout-frames.md`](decisions/layout-frames.md).
- **Ein Wort, ein Name — und zwar über App und Handbuch hinweg.** Vokabular ist eine Tabelle
  (`positions`), nicht pro Seite. Am 2026-09-07 fielen dabei vier Begriffe auf, die je zwei Dinge
  meinten: „Baustein“ (Komponente auf der Seite / Teil eines Vorlagenpakets), „Vorlage“
  (Quartz-Startvorlage / `.qtpl`), „Frame/Template“ und „Ausgabeverzeichnis“ neben
  „Ausgabeordner“. Der Tell war jedes Mal derselbe: Das Handbuch musste eine Warnung schreiben
  („nicht zu verwechseln mit…“). Eine solche Warnung ist der Hinweis auf den Fehler, nicht seine
  Lösung. Deutsch „…“,
  Englisch “…”, Gedankenstrich als Em-Dash. Jeder Nutzertext steht in `de.ts`/`en.ts`
  (Schlüssel-Parität) oder `electron/main/i18n.ts`; zod- und `console.error`-Texte
  bleiben Englisch, weil sie Bugs beschreiben, nicht Eingaben.
- **Ein Fachbegriff bekommt eine Zeile darunter** (`Field`/`Toggle` `hint`); ein Begriff, auf dem
  eine Seite ruht, eine `InfoNote` oben, gedeckelt auf 95ch.
- **Ein Rat gehört zu dem Zustand, den er meint, und wird dort gesagt, wo der Zustand bekannt
  ist.** „Existiert die Datei im Projektordner?“ stand im Renderer unter *jedem* Lesefehler der
  Config, auch unter einem, der gerade gesagt hatte, dass die Datei da ist und was in ihr steht.
  Der Hauptprozess kennt den Unterschied (`ENOENT` → `configMissing`), also sagt er ihn, und jeder
  der 19 Aufrufer bekommt ihn mit. Dieselbe Bewegung wie bei `check:i18n`: ein Satz je Zustand,
  nicht ein Satz über allen.
- **Ein Hinweis sagt, was passiert — nicht, warum es technisch so ist.** Höchstens zwei Sätze; die
  Mechanik gehört ins Handbuch. **Das Kapitel nennt aber nicht der Hinweis, sondern die Seite:**
  `PageHeader` nimmt einen `handbook`-Knoten, und die Seiten reichen `<HandbookLink page="…" />`
  herein (bei Unterreitern das Kapitel des offenen Reiters, Tabelle `HANDBOOK` je Seite). Dreizehn
  Hinweise, die je ein Kapitel nennen, wären dreizehn Stellen, die beim nächsten Umbau des
  Handbuchs veralten — und gesucht wird die Erklärung ohnehin zu einem Bildschirm, nicht zu einem
  Feld. Am 2026-09-07 an der laufenden App nachgemessen: 20 Bildschirme mit Verweis, jeder auf eine
  Seite, die es gibt, keiner mit Rückfall auf die Startseite; ohne Verweis bleibt die Startseite,
  die den Link schon in ihrer Quartz-Karte trägt. **Eine Ausnahme, und bisher nur diese:** Ein Teil eines
  Reiters, der ein Kapitel für sich hat, das keinem Reiter gehört, trägt einen zweiten Verweis am
  Teil selbst — der Content-Ordner im Reiter „Website“ (Kapitel 3.4), seit er kein eigener Reiter
  mehr ist. Der Einwand der Regel, Verweise in Hinweisen veralten, trifft ihn nicht, weil er eine
  Kennung aus `handbookPages.ts` nennt. Die Einstellungen sind kein Vorgänger: Sie haben keinen
  `PageHeader`, ihr Verweis ist der einzige der Seite. Eine zweite solche Gruppe wird hier
  eingetragen, nicht mit dieser begründet (siebenundzwanzigstes Review, Befund 5). Ein Begriff aus der Maschinenwelt
  steht nur da, wo der Nutzer ihn zum Entscheiden braucht: „Host-Key“ auf der Veröffentlichen-Seite
  ja, „ungelayert“ im Variablen-Tab nein. Ein Bestätigungsdialog hat drei Teile — die Frage, ein
  Satz Folgen, ein Satz Rückweg. Ausgenommen sind die Sätze, die eine Verwechslung verhindern, die
  Daten kostet (Snapshot ≠ Git-Sync, verknüpfter Vault wird nicht gesichert, ein Duplikat erbt keine
  Ziele); die bleiben lang. Gemessen am 2026-09-07: 1475 Nutzersätze, 192 über 120 Zeichen — und die
  Länge war nicht das Problem, sondern die 75, die Mechanik erklären statt der Entscheidung.
  Messungen in [`i18n-and-vocabulary.md`](decisions/i18n-and-vocabulary.md), der Ablauf und die
  Gliederung des Benutzerhandbuchs in [`docs/handbuch.md`](handbuch.md). Das Handbuch ist
  zweisprachig, und **es übersetzt auch seine Pfade** — deshalb nennt ein Verweis im Seitenkopf eine
  Kennung aus `src/data/handbookPages.ts` und keinen Pfad; `HandbookLink` löst sie über die
  aufgelöste Sprache auf, der Menüpunkt über `mainLanguage()`.
- **Sidebar nach Tätigkeit, eine Seite ist eine Aufgabe.** Einrichtung, Gestaltung, Veröffentlichung,
  Wartung; ein Screen, der eine Karte wäre, ist ein Sub-Tab. Die Übersicht ist eine Statusseite, die
  nichts kostet: nur lokale Reads beim Mount, genau einer ins Netz, nie awaited.

### Arbeitsweise, die sich bewährt hat

- **„Kann nicht prüfen“ ist nie „alles gut“.** `unavailable`/`'unknown'` sind eigene Antworten
  (Style-Check, Update-Check, Kataloge, Token-Prüfung, Secret-Backend). Das gilt auch für die
  Prüfskripte: Was eines nicht lesen kann, zählt es und sagt die Zahl, statt es zu übergehen — und
  eine Schreibweise, die ein Prüfskript nicht liest, ist eine, hinter der sich ein Fehler versteckt.
  `check:i18n` las nur `t('…')`; `t(bedingung ? 'a' : 'b')` stand an zwölf Stellen mit 21
  Schlüsseln, und ein Fix des zwölften Reviews hatte die Form gerade erst noch einmal geschrieben.
  Und die Zahl zählt, was sie zu zählen behauptet: „1 Aufruf im Hauptprozess“ war die Deklaration
  von `mainT` (vierzehntes Review).
- **Ein Prädikat, das für einen Lauf geschrieben ist, wird als Aussagesatz nicht wahr.**
  `stillMissing` fragt „fehlt, steht mit einem anderen Bereich da, oder ist gar nicht lesbar“, und
  für den Lauf ist jede dieser Antworten richtig herum: im Zweifel npm fragen. Dieselben Antworten
  wurden auf der Seite zu „Diese eigenen Pakete stehen nicht mehr in package.json“, mit Namen,
  Badge und Zähler — über Zeilen, die dastehen (vierundzwanzigstes Review). Und was ein Prüfskript
  nicht sehen kann, gehört in `docs/release.md`: `check:handbook` prüft Blockzitate, also sah es
  nicht, dass das Handbuch drei Prüfzustände aufzählt, während die Updates-Seite vier zeigt und
  genau dieses Kapitel im Kopf verlinkt.
- **Ein Ausweg, den eine Meldung nennt, wird an der Oberfläche gemessen, nicht am Kanal darunter.**
  „Behebe den Fehler oben und starte das Update erneut“ stand vier Runden lang über einem Knopf,
  den derselbe Lauf deaktiviert hatte — HEAD enthielt den Merge, der Status hieß „Aktuell“. Gesehen
  hat es keine dieser Runden, weil ihre echten Läufe `runCoreUpdate` per `evalfile` riefen und die
  Attrappen keine Seite kennen. Dazu gehört die Gegenrichtung: Ein Zustand, den die App sich selbst
  notiert, bekommt eine Antwort neben aktuell/dahinter/unbekannt und steht dort, wo der Nutzer
  nachsieht — die Namen der fehlenden Pakete standen an genau einer Stelle, bis zum ersten
  Routenwechsel. **Und dieselbe Lücke eine Tür weiter:** Ein Kanal, der einen Satz *antwortet*
  statt zu werfen, braucht einen Aufrufer, der ihn liest. `abortCoreMerge` hat zwei, und beide
  warfen das Ergebnis weg — ein verweigerter Abbruch war damit ein Knopf, der nichts tut, und die
  vorgemerkte Datei, die der Abbruch wegwirft, ging ohne ein Wort, obwohl der Kanal sie nennt
  (vierundzwanzigstes Review).
- **Zwei Arten zu scheitern bekommen zwei Antworten.** „Fehlt“ und „ist da, aber kaputt“ in einem
  `catch` zu fangen macht aus dem zweiten Fall ein stilles „alles gut“. Die Liste der Startseite
  fing ein `globby` mit Syntaxfehler wie ein fehlendes und schrieb zwei tote Links, ohne ein Wort
  (vierzehntes Review, an der gebauten und der gepackten App). Getrennt wird am Ort des Scheiterns:
  `resolve()` mit `MODULE_NOT_FOUND` ist „nicht installiert“, ein `import()`, der danach scheitert,
  ist ein Fehler. Und ein Ersatz, der läuft, sagt, *dass* er lief — nicht nur im Kommentar, was er
  nicht kann.
- **Ein Bau, dem etwas fehlt, bricht ab, statt zu warnen.** Eine Warnung im Log eines Laufs, dessen
  Paket schon fertig ist, liest niemand: `beforePack` packte zweimal still ohne Handbuch, erst auf
  der VM, dann nach dem Umzug der Projekte auf dem Mac, der die Beta-Pakete baut. Wer das Fehlende
  wirklich nicht will, sagt es mit einem Flag (`QUARTZCONTROL_WITHOUT_HANDBOOK=1`).
- **Ein Fix auf einem Branch, der nie gemergt wurde, ist keiner.** Der Pfad-Fix für das Handbuch
  existierte seit dem 2026-09-12 (`e6916ae`) — auf `feat/beispielvorlage-und-header`, zusammen mit
  sechs weiteren Commits. Die ersten zwei (`c8c143d`, `39bef46`) standen auf `origin/main`, die
  fünf ab `b39f5d4` in keiner Linie, und keiner der sieben in `fix/review-*`, aus der die Beta
  gebaut wird (nachgezählt im Review 2026-09-19 mit `git branch -a --contains`). Gefunden hat es
  erst ein Review, weil es die App packen musste. Vor einem Release: `git cherry <release-branch>
  <branch>` über alle lokalen und entfernten Branches, und was ein `+` zeigt, wird gemergt oder
  bewusst verworfen (die Schleife dafür steht in `docs/release.md`).
- **Ein Handgriff, der nur in einer Commit-Nachricht steht, wird beim nächsten Mal vergessen.** Die
  veröffentlichte Vorlage nachziehen, den Footer an sechs Stellen gleich halten, Band und
  Download-Kasten der Website umstellen: Das stand bis zum fünfzehnten Review in Commits und im
  Auftrag, also in Dateien, die nach dem Release niemand aufschlägt. Was ein Release außerhalb von
  `npm run dist` braucht, steht in `docs/release.md`, und wo es geht, prüft es ein Skript
  (`template:example -- --check-sync` hält die drei Kopien der Vorlage byte-weise gegeneinander).
- **Was ein Skript leiht, gibt es zurück — an jedem Ausgang.** Ein Wegwerf-Profil macht die
  Projekte darin nicht zu Wegwerf-Projekten: Das Demo-Skript der Screenshots schrieb seine Ziele in
  die `publish-targets.json` eines echten Projekts und überschrieb dort ein gleichnamiges
  (fünfzehntes Review). Gemerkt wird vor dem Schreiben, auch der Zustand „fehlt“; zurückgeschrieben
  über `process.on('exit')` und die zwei Signale, weil ein `finally` die `process.exit()` zwischen
  Leihen und Ende nicht sieht (`lendProjectTargets()` in `scripts/screenshot-demo.mjs`).
- **„Die Datei ist da“ ist nicht „die Datei lässt sich lesen“.** Ein Cache, ein Download, eine
  mitgelieferte Kopie: geprüft wird, ob der Inhalt sich öffnen lässt, nicht ob ein Verzeichniseintrag
  existiert - sonst gewinnt ein Torso gegen eine heile Kopie. Geschrieben wird so etwas über
  Temp-Datei, `fsync` und `rename` (`jsonStore.ts` ist das Muster), und was sich nicht lesen lässt,
  wird weggeräumt statt übersprungen, damit der reparierende Weg nicht blockiert bleibt.
- **Gemessen, nicht angenommen.** Jede Regel hier steht in `docs/decisions/` mit dem Experiment, das
  sie erzwungen hat. Neue Regeln genauso.
- **Wer einen Nutzen misst, misst auch den Preis.** „Die gleichen Höhen machen ruhigere
  Ablageziele" war die Begründung dafür, sie aufzugeben — und niemand hatte nachgesehen, was sie
  wirklich taten: `rectSortingStrategy` skaliert jede Karte in das Rechteck, in das sie rückt, und
  gleiche Höhen waren das Einzige, was den Faktor bei 1 hielt. Gemessen an der gebauten App wurde
  daraus eine 77-px-Karte, die während des Ziehens auf 733 px gestreckt wird.
- **Eine Prüfliste ist eine Spalte, keine Zeile.** Die Kontrastliste prüfte die Ruhefarbe eines
  Links gegen drei Flächen und die Hover-Farbe gegen eine — und meldete danach „kein Paar unter der
  Schwelle“, während der Hover im Callout bei 4,18:1 stand. Wer ein Argument für einen Zustand
  aufschreibt („ein Link sitzt nicht nur auf dem Grund“), trägt es in derselben Bewegung in alle
  Zustände ein, für die es gilt.
- **Drift läuft in beide Richtungen, und ein Werkzeug, das nur eine kennt, sieht sie nicht.**
  `--sync` holt die Stylesheets aus dem Projekt zurück; eine Regel, die im Repo entstand und nie
  vorgeschoben wurde, hätte es gelöscht statt gemeldet — und die Messung daneben war an einer
  Website gemacht, die die Regel nicht hatte. `--check-sync` vergleicht nur und entscheidet nichts;
  es ist der erste Aufruf vor jeder Messung an der gebauten Website.
- **Ein Wert, den ein fremdes Programm vergleicht, wird nach dessen Regel gebildet — und die Regel
  wird gegen das fremde Programm geprüft, nicht gegen unsere Vorstellung von ihm.** Der Ausschluss
  im Reiter „Seitentypen“ schrieb den Anzeigenamen der App, Quartz vergleicht gegen
  `extractPluginName(source)`, und für jede npm-Quelle mit Scope ist das die ganze Quelle — der
  Schalter wirkte nie, und die Kandidatenrechnung daneben baute Ordnungen, die Quartz nie erzeugt.
  Der Name steht jetzt an einer Stelle (`shared/quartzPluginName.ts`), wird auch zum *Lesen*
  benutzt (sonst zeigt der Schalter einen Zustand, den die Seite nicht hat), und
  `npm run check:plugin-names` schneidet Quartz' eigene Funktion aus dessen Quelldatei und
  vergleicht. Genau diese Gegenprobe fand einen Rand, den zweimaliges Lesen nicht gefunden hatte.
  Messungen in [`plugins-and-config.md`](decisions/plugins-and-config.md).
- **Liegt das fremde Programm im Projekt, fragt die App es selbst — mit denselben Eingaben, auch
  den unsichtbaren.** Die Liste der neuen Startseite bildete Quartz' Ignore-Muster zweimal nach;
  die zweite Fassung war gegen Quartz' eigenes `globby` geprüft und lag trotzdem bei 13 von 95
  Antworten daneben (dreizehntes Review): `name/*` für einen Ordner ohne Unterordner, fast-globs
  Regel, nach der nur ein statisches letztes Segment oder `/**` einen Ordner beschneidet, und
  `.gitignore`, von der die Nachbildung nichts wusste. `createIndexPage` lädt `globby` jetzt von
  dort, wo `quartz/util/glob.ts` es lädt, und ruft es wie Quartz — auch mit demselben cwd, `content/`
  und nicht dessen aufgelöstem Ziel, weil `globby` `.gitignore`-Dateien bis zur Wurzel des
  git-Repos liest. Wo das Programm fehlen kann, sagt der Ersatz, was er nicht kann. Messungen in
  [`navigation-and-pages.md`](decisions/navigation-and-pages.md).
- **Ein Prüfskript, das Logik der App braucht, lädt sie, statt sie abzuschreiben.** Die Logik steht
  als reine Funktion in `shared/` (das Dateisystem als Parameter, weil `shared/` auch für den
  Renderer kompiliert wird), und das Skript kopiert die `.ts` in eine temporäre `.mts` und
  importiert sie — node strippt die Typen, rät aber die Endung nicht. So laden `check:semver`,
  `check:plugin-names` und seit dem zwölften Review `check:runtime` (`shared/macNodeBinary.ts`); die
  Helper-Suche stand vorher gleich und ungeprüft zweimal da. Eine Kopie, die heute stimmt, ist
  genau die, die niemand mehr vergleicht.
- **Eine Messung trägt nur so weit wie ihr Instrument — und das Instrument ist das, das im Code
  steht.** Vier Stellen sagten, `realpath` lasse die Großschreibung, wie sie kommt; gemessen war das
  an `fs.realpathSync`, Nodes JS-Nachbildung, während der Code `fs.promises.realpath` ruft, das
  native `realpath(3)`. Das gibt auf APFS die Schreibweise der Platte zurück, das Schloss deckte die
  Großschreibung also die ganze Zeit (fünfundzwanzigstes Review; der Code war besser als seine
  Beschreibung, und „gemessen“ stand davor). Ein `grep` über `.quartz-gui/` fand den
  Projektpfad im Snapshot-Store nicht und hat daraus „nichts sonst hält seinen eigenen Pfad“ gemacht
  — der Store ist eine git-Objektdatenbank, und in einem zlib-komprimierten Objekt liest `grep`
  nichts (`git grep` je Ref schon: 8 von 8 Aufnahmen). Genauso „der Server antwortet unmittelbar
  nach dem Beenden noch“, was er tut, bis er das nächste Mal schreibt. Und genauso „der Watcher des
  Dev-Servers sieht `.quartz-gui/` nie“: `quartz build --serve` hat **zwei** Watcher, und gemessen
  war der, der auf eine Config-Änderung gar nicht reagiert. Das Ergebnis stimmte trotzdem — aber
  ein Ergebnis mit einer Begründung, die es nicht trägt, ist ein Befund in Wartestellung. Wer eine
  Behauptung in eine Commit-Nachricht schreibt, schreibt dazu, womit sie gemessen wurde, damit der
  nächste Leser die Reichweite prüfen kann statt die Aussage.
- **Eine Kopie erbt keinen Pfad, aber ein Snapshot bringt einen zurück.** `repointProjectPaths()`
  repariert beim Umbenennen und Duplizieren gegen ein bekanntes Vorher; `repointAuthoredFrames()`
  repariert nach jedem Restore, der Config oder Lockfile berührt, und braucht dafür kein Vorher: Ein
  Frame liegt unter `<projekt>/.quartz-gui/authored-frames/<id>`, also ist die ID die Identität und
  das Präfix davor Rauschen. Umgeschrieben wird nur, was hier auch existiert.
- **Ein Symlink-Schutz prüft jedes Segment, nicht das oberste Verzeichnis** — und fragt mit
  `lstat`, nicht mit `existsSync`. Letzteres folgt dem Link, also meldet ein hängender Link „ist
  nicht da“ statt „ist ein Link“, und die Sperre geht auf. Ein Link *innerhalb* des geschützten
  Ordners führt genauso hinaus wie der Ordner selbst (`writableTarget` in
  `templatePackage/shared.ts`).
- **Eine Kopie erbt keinen Pfad, der in das Original zeigt.** Config, Lockfile und Symlinks werden
  nach dem Kopieren umgeschrieben, alles Instanzgebundene (Ausgabeverzeichnis, Deploy-Manifeste,
  Worktrees, Snapshots, Ziele) bleibt zurück — `duplicateService.ts` führt beide Listen mit
  Begründung. **Was dabei schiefgehen kann, wird gefragt, bevor kopiert wird**: Das Umschreiben
  liest die Konfiguration und läuft *vor* `git remote remove origin`, also blieb ein Wurf dort als
  halbe Kopie mit dem Remote des Originals liegen — das eine, was der Kommentar am Kopf der Datei
  ausschließt (einundzwanzigstes Review).
- **Eine PID trägt nicht über die Zeit.** Wer eine Prozessnummer aus einer Liste, einer Datei oder
  einem früheren Scan bekommt, prüft direkt vor dem Signal noch einmal, dass sie dasselbe Programm
  meint — das Betriebssystem vergibt Nummern wieder, und dazwischen liegt bei einer Liste in der
  Oberfläche jede Menge Zeit. `detectOrphanedServers()` tut das seit dem ersten Tag,
  `serverDiscovery.killServer()` genauso; beide fragen dieselbe Nadel gegen eine frisch gelesene
  Kommandozeile. Was die App selbst gestartet hat, wird nicht signalisiert, sondern über
  `stopServer()` beendet, sonst zeigt die Seite „Läuft" für einen Prozess, den es nicht mehr gibt.
  **Dasselbe gilt für einen Map-Eintrag unter einer Projekt-ID**: Zwei Starts können sich
  überlappen, und der `exit`-Handler des Verlierers löschte den Eintrag des Gewinners samt seinem
  Satz in `running-servers.json` — geräumt wird nur, wenn `runningServers.get(id)?.process` noch
  dieses Kind ist (`forgetServer()`). Messungen in
  [`navigation-and-pages.md`](decisions/navigation-and-pages.md).
- **Ein Lesepfad legt nie `.quartz-gui/` an.** `quartzGuiPath()` zum Lesen, `quartzGuiDir()` zum
  Schreiben.
- **`.quartz-gui/` ist ein Name auf fremder Platte und bleibt, wie er ist.** Er trägt den alten
  Arbeitstitel des Projekts und steht nicht in diesem Repo, sondern in den Projekten der Nutzer:
  das Verzeichnis mit Snapshots, Deploy-Manifesten, authored-frames, Logs und Locale-Baselines. Am
  2026-09-09 nachgezählt: 121 der 161 Vorkommen des alten Namens im Baum sind das Verzeichnis, und
  allein auf dieser Maschine hängen fünf echte Projekte daran. Umbenennen hieße, jeden bestehenden
  Zustand zu verwaisen; es lesbar zu halten hieße, beide Namen zu lesen — dauerhaft, für einen
  Namen, den niemand sieht. Dieselbe Regel wie beim `.qtpl`-Marker: **ein Bezeichner, den ein
  anderer Rechner schon geschrieben hat, ist ein Format und keine Schreibweise.**
  **Der Marker in `custom.scss` ist seit dem 2026-09-18 umbenannt** (`Quartz-GUI:managed:` →
  `QuartzControl:managed:`), und zwar genau aus dem Grund, den der Satz oben für den Ordner
  ausschließt: Ihn *sieht* jemand — er ist ein Kommentar in der eigenen Stildatei des Nutzers. Also
  mit Migration: Gelesen werden beide Namen (`MARKER_NAMES` in `styleService.ts`, derselbe Satz in
  `scripts/build-example-template.mjs`), geschrieben nur der neue, und **wer einen Abschnitt
  schreibt, benennt die Marker aller anderen mit um** — je Abschnitt migriert, trug eine Datei
  beide Namen auf unbestimmte Zeit, denn eine Schrift importiert man einmal. Stehen beide Kopien
  eines Abschnitts da, werden **beide gelesen, und die spätere gewinnt** — die Regel der Kaskade,
  also zeigt die Seite, was die Website zeigt; das nächste Schreiben legt die Vereinigung an die
  Stelle der ersten Kopie. Gemessen an der gebauten App mit einer Kopie von
  `navigations-testprojekt`: alle drei Blöcke nach je einem Schreibvorgang unter dem neuen Namen und
  am alten Platz, sonst byte-gleich, SCSS-Check grün. **Der Preis liegt jenseits der
  Versionsgrenze, und er ist mehr als ein zweiter Block** (siebenundzwanzigstes Review, Befund 3,
  am `styleService` von beta.2 als Bündel): beta.2 liest 0 von 50 Variablen und 0 von 30
  importierten Dateien, hängt beim Speichern einer Variable einen eigenen Block an, und wer dort
  eine Datei einschaltet, bekommt dessen Import-Block *in* unseren geschachtelt — zwei `@use`
  desselben Namensraums, der Build ist in beiden Fassungen kaputt, bis diese Seite die Reihenfolge
  einmal speichert. Der gewöhnliche Weg dorthin sind zwei Rechner mit verschiedenen Fassungen und
  ein Projekt, das per Git-Sync zwischen ihnen reist. Und weil ein Schreiben alle Abschnitte
  umbenennt, ist der Preis beim ersten Speichern ganz fällig, nicht je Abschnitt — eine
  eingeführte Schrift genügt (achtundzwanzigstes Review, Befund 2). Beantwortet wird das nicht im
  Code, sondern in den Release-Notizen ([`release.md`](release.md), Punkt 7). Der Marker `Quartz-GUI:syntax:` in `scripts/example-template/` ist noch der alte — er
  reist in drei Kopien der Vorlage, die `--check-sync` byte-weise vergleicht, und wird mit dem
  nächsten Release der Vorlage umbenannt.
  Der Rest ist am 2026-09-09 nachgezogen: `name` in `package.json` (`quartz-gui` →
  `quartzcontrol`, also auch deb-Paket und Linux-Binärdatei), die Repo-URLs, eine DOM-Id. Die
  Review- und Entscheidungsdokumente behalten den alten Namen, wo sie eine Messung protokollieren —
  sie festzuhalten ist ihr Zweck.
- **JSON-Stores nur über `jsonStore.ts`**: atomar schreiben, Unlesbares beiseitelegen statt
  überschreiben.
- **Eine Datei, die leer ist, ist nicht dasselbe wie eine, die etwas anderes enthält — und „etwas
  anderes“ hat mehr als eine Form.** Eine leere `quartz.config.yaml` ist ein gültiges
  YAML-Dokument ohne Inhalt (`toJS()` sagt `null`) und wird gelesen wie ein Dokument ohne diese
  Schlüssel. Drei Arten, unlesbar zu sein, bekommen je einen Satz: **ein Syntaxfehler** (`parseDocument`
  wirft dabei *nicht*, es sammelt `doc.errors` und gibt zurück, was übrig ist), ein Dokument, das
  **kein Mapping** ist, und ein **`plugins:`, das keine Liste** ist. Die häufigste ist die erste —
  ein nicht geschlossenes Anführungszeichen, ein Tab als Einrückung —, und sie las sich still als
  halb leere Konfiguration: `pageTitle: "abc` schluckte die drei Zeilen darunter in den Titel, die
  Plugin-Liste war leer, kein Toast. Was **nicht** stimmt, ist die Begründung, mit der die zweite
  Antwort einmal eingeführt wurde („das nächste Speichern schreibt darüber“): `writeConfig` wirft an
  denselben Dateien und lässt sie byte-gleich. Eine leere Seite ohne ein Wort ist Grund genug.
- **Was nur ein Kindprozess beantworten kann, wird auch dort gemessen.** Die eingebettete Laufzeit,
  Lifecycle-Skripte, das gepackte Bundle: `npm run check:runtime` und eine Messung an der
  *gepackten* App, nicht am Build. Vier der fünf Befunde aus Phase 7a wären in Entwicklung
  unsichtbar geblieben.
- **Vor jedem UI-Urteil die App wirklich starten** (`run-desktop`-Skill, `npm run smoke`), und unter
  Playwright zuerst `colorscheme none`. Was Playwright nicht erreicht - den nativen Dialog, den
  echten Return-Tastendruck - im Main-Prozess spiegeln (`app.evaluate`) und das als „nicht am OS
  gemessen“ kennzeichnen.
