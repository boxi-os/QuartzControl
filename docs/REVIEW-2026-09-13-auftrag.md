Du bist als zweites Paar Augen an einem Electron-Projekt, das kurz vor einer Beta steht. Es geht um
ein Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites. Repository: /Users/boxi/Development/Quartz-GUI.

Lies zuerst `CLAUDE.md` im Wurzelverzeichnis. Dort stehen die Konventionen dieses Projekts als
Regeln, die Messungen dahinter in `docs/decisions/`. Ein Befund, der gegen eine dieser Regeln
verstößt, ist ein Befund; ein Befund, der eine Regel für falsch hält, ist auch einer — braucht dann
aber die Begründung.

## Umfang

Der Diff seit dem Tag `review-2026-09-12`. **Nicht seit dem Dateinamen dieses Auftrags** — der ist
geraten, der Tag ist es nicht.

    git log --oneline review-2026-09-12..main
    git diff review-2026-09-12..main -- electron/ src/ shared/ scripts/

Im App-Code 12 Dateien, +307/−57; mit den Dokumenten und den beiden Review-Dateien 25 Dateien,
+925/−104 (dieser Auftrag hier nicht mitgezählt).

**Dieser Diff hat vier Schichten, die nichts miteinander zu tun haben** — die breiteste Streuung
seit dem fünften Review, und zugleich der geringste Anteil an Anwendungslogik. Drei der vier
Schichten liegen ganz außerhalb dessen, was ein Nutzer anklickt: in der Verpackung, in Bau-Skripten
und in Kommentaren.

    PR #30/#31   die fünf Fixes des neunten Reviews plus sein Nachtrag
    PR #32       App-Identität (appId, copyright, maintainer) und der DMG-Hintergrund
    PR #33       die ersten Linux-Messungen: safeStorage, erster Flatpak, erster Linux-Smoke
    PR #34       das Lockfile trägt die Version des Pakets
    PR #35       Linux x86_64: zweiarchige Ziele, Handbuch-Übernahme, git-Ausdünnung

Lies `docs/REVIEW-2026-09-12.md` und `docs/REVIEW-2026-09-12-auftrag.md` mit — nicht als Wahrheit,
sondern als das, was behauptet und wonach zuletzt gesucht wurde. Die Reviews davor helfen für den
Ton, sind aber inhaltlich erledigt.

## Eine Besonderheit, die du wissen musst

**Die Commits stammen von demselben Modell, das diesen Auftrag schreibt.** Ich habe die Fixes
geschrieben und auch entschieden, *was* an den Befunden des neunten Reviews behoben wird und wie
weit; die drei Schichten daneben sind eigene Vorhaben desselben Modells.

Drei Dinge folgen daraus:

- Lies die Commit-Nachrichten als Behauptungen. In diesem Projekt gilt eine Zahl in einer
  Commit-Nachricht als Messung; wenn eine nicht trägt, ist das ein Befund. Drei der letzten vier
  Aufträge haben genau so einen gefunden — zuletzt eine Zahl, die für zwei verschiedene Felder
  stand und an keiner der zwei Stellen sagte, für welches.
- Prüfe besonders, wo ich **eine Zahl, eine Grenze, einen Ort oder einen Umfang gewählt** habe. In
  diesem Diff sind das: die Regel `.so` in der git-Ausdünnung, `arch: [arm64, x64]` als Vorgabe
  statt als Flag, der Name `QUARTZCONTROL_HANDBOOK_SITE` und die Entscheidung, ein *Verzeichnis*
  statt eines Projekts zu übernehmen, `artifactName` für AppImage, und die zwei x-Werte im
  DMG-Hintergrund.
- **Diese Runde ist die erste, die nennenswert auf Linux gemessen hat** — und zwar auf zwei
  Maschinen, einer nativen aarch64-VM und einer emulierten x86_64-VM. macOS ist dafür an mehreren
  Stellen *nicht* mehr die Messgrundlage. Wo eine Aussage über Linux nur gelesen ist, steht es
  unten dabei.

## Der Messweg — und warum er diesmal anders aussieht

Die letzten Runden haben an drei Wegen gemessen (echter Build, erzeugtes Modul, gebaute App über
Playwright). Die Fixes des neunten Reviews sind ihnen gefolgt. Die drei Schichten daneben konnten
das nicht, weil ihre Fragen keine Renderer-Fragen sind:

1. **Am fertigen Paket**, nicht am Build: `dpkg-deb -x`, `unsquashfs`, `flatpak run --command=sh`,
   `file` auf die Binärdateien darin. Der einzige Weg, auf dem „reist das Handbuch mit" und „hat
   das Paket die richtige Architektur" überhaupt eine Antwort haben.
2. **Auf zwei fremden Maschinen über ssh.** Zugang und Fallen stehen in `CLAUDE.md` nicht; sie
   stehen in den Commit-Nachrichten und in `docs/decisions/electron-runtime-and-packaging.md`.
3. **An der fremden Bibliothek gelesen**, wo eine Messung zu teuer war: `getArtifactArchName` in
   `builder-util/out/arch.js` für die Hälfte einer Namensfrage, deren andere Hälfte gemessen ist.

Was das nicht beantwortet: **Zwei Messungen konnten auf keiner der beiden VMs wiederholt werden**,
und sie sind ausdrücklich als offen markiert statt als grün — die WM_CLASS-Gegenprobe (mutter führt
unter Wayland kein `_NET_CLIENT_LIST`) und `safeStorage` auf x86_64 (der Schlüsselbund der frischen
VM hat keine `login`-Sammlung). Prüf, ob die Stellen, die darauf ruhen, das sagen.

## Was in diesem Diff steckt

### 1. Der Tastatur-Guard, der von der Tür an den Kasten gewandert ist (`ad56e1e`)

Der mittlere Befund des neunten Reviews, und eine Regression aus Fix 3 des achten: Das
`stopPropagation()` am Bereichsformular nahm auch dem `KeyboardSensor` von `@dnd-kit` seine
Tastendrücke, weil der während eines Drags auf dem *Dokument* hört. Der Guard sitzt jetzt am Kasten
und verengt dort auf `e.target === e.currentTarget`.

- **Das ist die dritte Fassung derselben Stelle in drei Runden**: kein Guard → Guard am Formular →
  Guard am Kasten, verengt. Liegt sie diesmal richtig? Insbesondere: `e.target === e.currentTarget`
  ist eine Aussage über das *Ereignisziel*, nicht über den Fokus. Gibt es einen Weg, auf dem der
  Kasten selbst das Ziel ist und trotzdem etwas aufklappen soll?
- Gemessen an der gebauten App mit echten Tastendrücken, drei Fälle vorher/nachher (Leertaste,
  Pfeil links, Escape) plus der Tab-Fall, der vorher als Ablage endete. **Nicht** gemessen: die
  anderen drei `@dnd-kit`-Stellen (`Plugins/Installed`, `GlobalBoard`, `Styles/CustomCss`), an
  denen dasselbe Muster stehen könnte.

### 2. Zwei Sätze um die Ablage (`b7b4a63`)

Überschrift und Hinweis über der Ablage sprachen weiter so, als läge dort nur Unplatziertes,
während der Chip seit dem Bereichs-Nachtrag „ausgeblendet" sagt.

- **Die Überschrift ist jetzt ein Name statt einer Anweisung** („Bereiche, die hier nicht im Raster
  liegen"), und sie ist zugleich die Ansage des Ablageziels in `dndAccessibility`. Zwei Verwender
  für einen Text — trägt der neue Wortlaut beide, oder liest sich die Ansage jetzt schlechter?
- Gemessen an der gebauten App, ein Bereich auf Desktop ausgeblendet. Nichts gespeichert. **Nicht**
  gemessen: Breiten (1280 px, wo die Ablage selbst umbricht).

### 3. Drei Kommentar- und Textkorrekturen (`2704fda`, `2ffc4ab`, `9d12054`)

Der Hinweis nennt jetzt die Tür, an der der Filter sitzt; der Kommentar über `DETAIL_PROBE` zählt
sieben statt sechs; und die zwei Zeichenzahlen tragen jetzt das Feld, an dem sie gemessen wurden.

- **Alle drei sind Behauptungen über Verhalten, in Prosa.** Prüf sie wie Code. Der erste ist an der
  gebauten App gemessen (Datei neu geschrieben, md5 unverändert, Ausschluss bleibt); der zweite an
  beiden Sprachdateien nachgezählt; der dritte an einem esbuild-Bündel des Hauptprozesses.
- Bei `9d12054` steht die Zahl jetzt an zwei Stellen und jede nennt das Paar der anderen. Das ist
  eine Kopplung, die niemand erzwingt.

### 4. Die App-Identität (`afc18e7`) — fünf Stellen, zwei davon in der ausgelieferten App

`copyright`, `appId` (auf die Flathub-Form mit Unterstrich), `maintainer`, `author` und die
Rückmeldungs-Adresse im Menü, die jetzt ein vorausgefülltes GitHub-Issue öffnet statt einer Mail.

- **Der Wechsel der `appId` wird als kostenlos begründet** („die App ist unsigniert, ein Flatpak
  wurde nie gebaut, `userData` hängt am Produktnamen"). Der mittlere Teil stimmt seit PR #33 nicht
  mehr — es *wurde* einer gebaut, und zwar unter der neuen ID. Trägt die Begründung trotzdem? Gibt
  es sonst etwas, das an einer appId hängt (macOS-Berechtigungen, `LSApplicationCategoryType`,
  gespeicherte Fensterzustände, Systemeinstellungen)?
- **Der Menüpunkt schickt Versionen und Plattform in eine URL.** Prüf die Konstruktion: Wer setzt
  die Zeichen zusammen, wird kodiert, und was passiert bei einem sehr langen Wert?
- Gemessen: eine Suche über den ganzen Baum nach dem Klarnamen. Nicht gemessen: dass der Menüpunkt
  wirklich ein Issue öffnet.

### 5. Der DMG-Hintergrund (`db96b0b`) — ein neues Skript, 152 Zeilen

`dmg-builder` greift zu seiner eigenen Vorlage, sobald weder `background` noch `backgroundColor`
gesetzt ist; genau das lag im 0.1.0-DMG. `scripts/dmg-background.mjs` zeichnet jetzt beide
Auflösungen, gerastert über Electron.

- **Zwei Ränder sind in der Commit-Nachricht als gemessen genannt** (ein Fenster zerstören und im
  selben Durchlauf das nächste laden scheiterte mit `ERR_FAILED`; die `.background.tiff` im
  gebauten DMG enthält beide Auflösungen, 538554 statt 37298 Bytes). Prüf, ob die Umgehung des
  ersten Randes das Problem löst oder nur verschiebt.
- **Die zwei x-Werte stehen im Skript und in `electron-builder.yml`.** Der Kommentar sagt, es sei
  „dieselbe Quelle" — ist es eine Quelle oder zwei Kopien?
- Ein Skript, das ein Bild in `build/` schreibt, das im Repo liegt: Was passiert, wenn es jemand
  nicht laufen lässt, und was, wenn er es mit einer anderen Electron-Fassung laufen lässt?

### 6. Die Linux-Messungen (`cf75375`) — ein Kommentar, der Electron 33 beschrieb

Der Kommentar über `getSecretStorageInfo` behauptete, ein `basic_text`-Backend melde weiterhin
`isEncryptionAvailable() === true`. Drei Messungen auf einer Debian-VM sagen das Gegenteil. Dazu
eine zweite Überschrift im Warnband, weil eine für zwei Zustände stand.

- **Die Prüfungen in der Datei stimmten, ihre Begründung nicht.** Das ist der interessante Fall:
  Code, der aus dem falschen Grund richtig ist. Prüf, ob die *neue* Begründung die Prüfungen noch
  trägt — insbesondere, ob der Zweig, der auf `setUsePlainTextEncryption` zeigt, noch erreichbar
  ist und ob er noch nötig ist.
- **Die zweite Überschrift ist ein neuer Nutzertext in zwei Sprachen.** Die zwei Zustände heißen
  „liegt unverschlüsselt" und „wird gar nicht gespeichert". Sagt die Oberfläche im zweiten Fall
  auch, was der Nutzer stattdessen tun soll?
- Alles auf **aarch64** gemessen. Auf x86_64 ist derselbe Weg ausdrücklich **offen** geblieben.

### 7. Das Lockfile (`1c7aadb`)

Zwei Zeilen, `0.1.0` → `1.0.0-beta.1`. Die Begründung ist gemessen (jedes `npm install` schrieb sie
um). Der interessante Teil ist die Frage daneben: Gibt es weitere Stellen, an denen die Version
doppelt steht und auseinanderlaufen kann?

### 8. Linux x86_64 (PR #35) — die größte Schicht, und die mit dem kleinsten Code

Fünf Commits, im App-Code nur `scripts/` und `electron-builder.yml`. Was sich ändert:
`linux.target` mit `arch: [arm64, x64]`, ein zweiter Weg zum Handbuch
(`QUARTZCONTROL_HANDBOOK_SITE`), `.so` in der git-Ausdünnungsregel, `appImage.artifactName`, und
eine Zahl, die an fünf Stellen falsch stand.

- **Der Handbuch-Weg ist der einzige Teil mit echter Logik.** `takeHandbook()` prüft die Quelle,
  bevor es das Ziel leert, und behandelt `site === out` gesondert. Vier Fälle sind an
  Wegwerf-Verzeichnissen gemessen. **Nicht** gemessen: eine Quelle, die ein Symlink ist; eine
  Quelle unterhalb des Ziels; ein `out`, in das gerade jemand anders schreibt. Und: Der Fehlerpfad
  in `before-pack.mjs` löscht `resources/handbook` — ist das auch dann richtig, wenn
  `QUARTZCONTROL_HANDBOOK_SITE` gesetzt war und *auf das Ziel selbst zeigte*?
- **`.so` in der Ausdünnungsregel ist eine gewählte Verallgemeinerung.** Die Begründung ist an zwei
  Dateien gemessen (`libSkiaSharp.so`, `libHarfBuzzSharp.so`, beide vom GCM, keine in den
  NEEDED-Einträgen von git). Die Regel ist aber nicht „diese zwei", sondern „alles auf `.so` in
  `libexec/git-core`". Was, wenn ein künftiges dugite-Bundle dort eine Bibliothek ablegt, die git
  braucht? Der Endanker `$` trifft außerdem kein `libfoo.so.1`.
- **`arch: [arm64, x64]` als Vorgabe** heißt: Jedes `npm run dist:linux` baut ab jetzt vier Pakete
  statt zwei, auch wenn jemand nur eines wollte. War das die richtige Wahl gegenüber einem Flag?
- **Die Aussage „Cross trägt in beide Richtungen" ruht auf vier gelesenen Stellen und einem
  Lauf.** Der Lauf ist echt (vier Pakete, Inhalte geprüft). Prüf die vier Lesungen: `context.arch`
  in `before-pack.mjs`, die Asset-Tabelle in `fetch-git.mjs`, `npmRebuild: false`, und der
  Host/Ziel-Unterschied in `app-builder-lib/out/toolsets/linux.js`. Trägt eine davon nicht, trägt
  die Aussage nicht.
- **`${arch}` für AppImage ist halb gemessen, halb gelesen** — x64 am echten Bau (`-x86_64`), arm64
  an `getArtifactArchName`. Die Namen sind damit asymmetrisch (`x86_64` neben `arm64`). Ist das
  besser als vorher, oder nur anders falsch?
- **Ein Fund mit Folgen, der hier nicht behoben ist:** Die Linux-Pakete vom 2026-09-08 reisten alle
  ohne Handbuch, und auf der aarch64-VM liegen sie noch. Sie sind nicht unterscheidbar, ohne
  hineinzusehen. Ist das etwas, das die App oder ein Skript sagen sollte?

## Was ausdrücklich kein Befund ist

- Dass die Seitenleiste „Backups" sagt und alles darin „Snapshot": bekannt, notiert, Oberfläche bis
  zur Beta eingefroren.
- Dass die Beispielvorlage zwei leere Bereiche mitbringt, die +2rem kosten: gemessen, vom Nutzer
  entschieden.
- Dass beide Mehrdeutigkeits-Meldungen englisch im Log stehen: seit vier Aufträgen bekannt, vom
  Nutzer nicht entschieden. Wenn du eine *neue* Begründung hast, warum es einen Unterschied macht,
  ist das ein Befund; die bloße Wiederholung nicht.
- Dass Windows fehlt: begründet in `electron-builder.yml`, Absicht.

## Was ich gefunden und bewusst liegengelassen habe

Sie stehen hier, damit du sie nicht für Funde hältst — und damit du widersprechen kannst, wenn du
das Liegenlassen für falsch hältst.

- **Quartz liest `enabled` an zwei Stellen verschieden.** Der Loader wirft alles Falsy hinaus, die
  CLI hält einen Eintrag ohne den Schlüssel für eingeschaltet; `configService` folgt der CLI. Das
  war zweimal in Folge die Voraussetzung eines mittleren Befunds und liegt weiter.
- **`homelessSlots` (`FrameBuilder.tsx`) rechnet nur über den aktiven Breakpoint.** Vier Reviews
  haben es als Frage gestellt, keins als Befund.
- **Der Frame-Editor rollt bei 1280 px horizontal.** Zwei Reviews sahen es außerhalb ihres Diffs.
  `npm run smoke` sieht es nicht, weil es keinen Editor öffnet.
- **`GROUP_LAYOUTS` hat weiterhin keine Obergrenze**, und `pickGroupOrder` läuft weiter einmal je
  Seite.
- **`GlobalBoard` übergibt seinem `DndContext` keine `sensors`.** Vorbestehend, gemessen, als
  eigener Durchgang notiert.
- **Das deb heißt `quartz-gui_…`, das AppImage `QuartzControl-…`** — der eine Name kommt aus
  `name`, der andere aus `productName`. Aufgefallen beim Bauen, nicht angefasst, weil ein
  Paketname, der sich ändert, ein Upgrade-Pfad ist.
- **`cpu-features` liegt als darwin-arm64-Binärdatei im Baum** und reiste bei einem Linux-Bau *auf
  dem Mac* mit. Harmlos (ssh2 fällt auf JS-Krypto zurück), aber ungeprüft, ob es sonst irgendwo
  stört.

## Ablauf

Alles läuft ohne Netz. `npm run typecheck`, `npm run build`, `npm run smoke` (42 Aufrufe),
`npm run check:i18n` (1058 + 144 Schlüssel), `npm run check:semver` (18 Vergleiche),
`npm run check:plugin-names` und `npm run check:handbook` (26 Zitate) sind auf diesem Stand grün —
am 2026-09-09 nachgefahren; wenn nicht, ist das dein erster Befund.

Ein echtes Quartz-Projekt liegt unter `~/Documents/Example` (mit dem Quartz-Checkout darin, also
`config-loader.ts`, `dispatcher.ts`, `Flex.tsx` zum Nachlesen). **Verändere es nicht**; kopieren und
lesen ist in Ordnung. Es hat vier eigene Frames, die Beispielvorlage installiert und zwei
Gruppen-Bereiche auf `afterBody`. Wenn du einen echten Build fährst: Klon anlegen, die vier
Symlinks unter `.quartz/plugins/` umbiegen und die absoluten Pfade in `quartz.config.yaml` *und*
`quartz.lock.json` ersetzen. Es kann sein, dass der Nutzer die App und einen Dev-Server darauf
offen hat: `running-servers.json` prüfen, bevor du die gebaute App startest, und im Zweifel ein
eigenes `--user-data-dir` nehmen.

**Was du an diesem Diff nicht selbst nachmessen kannst**, ist der größere Teil: Es gibt hier keine
zweite Maschine, kein Linux, kein DMG-Fenster. Drei der vier Schichten sind damit für dich Lektüre —
Kommentare, Commit-Nachrichten, `docs/decisions/`. Das ist kein Nachteil: Genau dort saßen die
Befunde der letzten drei Runden. Sag bei jedem Befund dazu, ob du ihn **gelesen** oder **gemessen**
hast, und bei einem gelesenen, was ihn messbar machen würde.

## Form der Befunde

Wie bei den letzten neun: je Befund eine Überschrift, die die Sache benennt, dann was passiert, dann
woran du es festmachst (Datei und Zeile), dann eine Einschätzung der Schwere (Hoch/Mittel/Niedrig,
Maßstab in `docs/REVIEW-2026-09-12.md`). Kein Fix im Text — darüber entscheidet der Nutzer.

Leg das Ergebnis als `docs/REVIEW-2026-09-13.md` ab.

Wenn du nichts findest, ist das ein Ergebnis. Schreib dann, wo du gesucht hast.
