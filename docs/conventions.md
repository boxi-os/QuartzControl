# Konventionen und Architekturentscheidungen

Die Regeln dieses Projekts, gekürzt auf das, was gilt. `CLAUDE.md` bindet diese Datei ein, also
liest jede Sitzung sie. **Warum eine Regel so lautet, welche Messung sie erzwungen hat und welches
Review sie fand, steht unter derselben fett gesetzten Überschrift in
[`decisions/conventions-full.md`](decisions/conventions-full.md)** (die Fassung vom 2026-10-16
vor der Kürzung, wörtlich), die Messungen selbst in [`decisions/`](decisions/). Lies dort nach,
bevor du an einer Stelle arbeitest, die eine Regel berührt, oder bevor du von ihr abweichst.

Eine neue Regel kommt mit dem Experiment, das sie erzwungen hat: in den Code als Kommentar, in
`decisions/` als Absatz mit Messung, hierher als kurze Regel und in `conventions-full.md` mit
Begründung.

### Prozessgrenze

- **Drei Prozesse, ein Vertrag.** `shared/ipc-contract.ts` ist die einzige Quelle für Kanäle,
  Payloads und `QuartzGuiApi`. Reihenfolge einer Änderung: Vertrag → Schema (`ipc/schemas.ts`) →
  Handler → Preload → Renderer.
- **Jeder Kanal hat ein zod-Schema, sonst ist es ein Bug.** Schemas sind bewusst loser als die
  Typen (`looseObject`, `record`), weil `z.object()` unbekannte Keys streicht und den
  Config-Roundtrip bricht; daher die `as`-Casts in `handlers.ts`.
- **Ein Vorlagen-Paket ist so wenig eine Vertrauensgrenze wie der Renderer.** `readZip` weist
  absolute Namen, `..`, Laufwerksbuchstaben und NUL ab; jeder Name aus einem Baustein geht durch
  `containedPath()` (`templatePackage/shared.ts`), in `plan` wie in `apply`.
- **Fremdes Markup, das auf die Website geht, wird neu geschrieben, nicht durchgereicht — und
  geprüft wird mit dem Parser, der es dort liest.** `inlineSvg.ts` schreibt aus einer
  Erlaubnisliste. Jeder Leser zählt: Markdown-Struktur als Referenz maskieren, Attributnamen wie
  HTML, Werte wie CSS prüfen. Gegenprobe: `npm run check:inline-svg`.
- **Code, den die App in die Website setzt, ändert deren Verhalten nur dort, wo die Einbettung es
  verlangt — und gemessen wird er gegen die Website ohne Einbettung** (`previewHighlight.ts`:
  `scroll-margin`/`-padding`/`-behavior` der Website bleiben gültig, eine Markierung scrollt
  nicht).
- **Neue Kanäle nehmen ein Objekt-Argument** (Muster: `dialog.confirm`). Bestehende
  Positions-Kanäle bleiben; kein neuer Kanal für etwas, das ein bestehender mit einem Flag kann.
- **Der Renderer läuft in der Chromium-Sandbox** (`sandbox: true`). Das Preload wird als CommonJS
  gebaut; `platform` kommt aus dem Prozess-Polyfill, `homeDir` über `additionalArguments`.
- **Nur `ipcMain.handle` über `handle()`/`handleNoArgs()`; kein `ipcMain.on`.** Main → Renderer
  über `broadcast()`, der Renderer abonniert mit `onEvent` (gibt einen Abmelder zurück).
  `app:navigate` sendet `menu.ts` selbst.
- **Alles, was Main aus Projektdateien liest und an Prozesse gibt, ist mit `--` getrennt; `git`
  bekommt nie eine Shell; nur npm/npx brauchen eine.** `runCommand.ts` ist der Spawner. Was vor
  `--` stehen muss (eine Revision), wird vorher auf seine Form geprüft.
- **Quartz und npm laufen unter Electrons eigener Node-Laufzeit; git kommt vom System, wenn es dort
  eines gibt, und sonst ebenfalls aus der App.** `nodeRuntime.ts` schreibt bei jedem Start die
  Shims `node`/`npm`/`npx` (Vorlage `resources/runtime/shim.sh`, Loader `defaultapp.cjs`); npm
  reist gepinnt mit (zwei `extraResources`-Einträge). Ausweg: `nodeRuntime: 'system'`. Für git
  (`gitRuntime.ts`) gewinnt das System, sobald es antwortet. Es gewinnt die Quelle, die die
  Anforderung garantiert erfüllt.
- **Code aus dem `node_modules` eines Projekts läuft an genau zwei Stellen im Hauptprozess**:
  `sass` (`styleService`) und `globby` (`contentService`). Eine dritte Stelle begründet selbst,
  warum sie nicht im Kindprozess laufen kann.
- **Eine Datei, die ein Werkzeug erzeugt, wird nicht gemergt, sondern neu erzeugt.** Beim
  Core-Update gehören `package.json`/Lockfile npm: Plan aus `shared/packageJsonDeps.ts`, Quartz'
  Fassung nehmen, eigene Pakete per npm zurückschreiben. Was der Plan nicht nachspielen kann,
  fasst die App nicht an. Die vielen Ränder (Stash, Notiz in `.quartz-gui/core-update.json` mit
  `wanted`/`putBack`, `-G`-Abfrage, Amend mit `--only`, `ls-files`) stehen in der Langfassung —
  **vor jeder Änderung am Core-Update dort lesen.** Prüfskript: `npm run check:core-update`.
- **Ein Kindprozess, der die App überleben soll, hängt nicht an einer Pipe zu ihr.** Ausgabe in
  Dateien unter `.quartz-gui/logs/`, die Main tailt. Ein neues Verzeichnis unter `.quartz-gui/`
  muss `isSnapshotWorthy()` und `SKIP` in `duplicateService` lernen.
- **Ein Ausgabeordner hat einen Schreiber, und die zwei Richtungen bekommen zwei Antworten.**
  „Jetzt bauen“ wird abgelehnt, solange der Server dieses Projekts `public/` hält
  (`assertOutputFree()`), und „Starten“ wartet auf einen laufenden Build (`pendingStarts`, Status
  `starting`, `startedAt` beim Spawn). Ein fremder Quartz-Server desselben Projekts lässt den
  Start ablehnen; ausgewichen wird nur vor anderen Ports.
- **Zwei Türen auf denselben Ordner brauchen ein Schloss, und ein Schloss, das keinen Klick
  abweist, wartet.** `whileHoldingStyles` (`styleLock.ts`) reiht je `realpath` auf, ist
  wiedereintrittsfähig und gilt für jeden Stylesheet-Schreiber der App (auch `writeManagedBlocks`).
  Restore, `sync --pull`, Core-Update und der Editor des Nutzers bleiben außen vor. Unter dem
  Schloss wird kein Timer angestoßen, der es überlebt.
- **Ein Vorgang, der ein Repository schreibt, wird im Hauptprozess gesperrt, nicht im Renderer.**
  Der Schlüssel ist `realpath` des Projekts; das Schloss gilt für Update und Abbruch; `git fetch`
  bekommt eine Frist.
- **Wer einen Zustand aus fremden Ausgabezeilen liest, weiß, wessen Zeilen er liest.**
  `buildService` hält eine Aktivität je Projekt; jede Quelle bewegt nur ihre, ein Build gewinnt;
  Muster gegen alle Ströme und beide Rebuild-Sätze.
- **Was eine Liste wegnimmt, holt dieselbe Liste zurück.** `styles.apply` holt jeden gestrippten
  verwalteten Block zurück, nach Vorhandensein, nicht nach Inhalt (auch leer).
- **Jede Dekompression bekommt eine Obergrenze, und die Datei selbst liefert sie nicht.**
  `maxOutputLength` überall (64 MiB je Schrift, 256 MiB je Paket), geprüft vor dem ersten Byte.
  Downloads ins Projekt: drei Grenzen (Anzahl, Summe, je Datei). Ein unbrauchbarer Name ist ein
  Fehler; ein Abbruch räumt auf.
- **Ja/Nein-Bestätigungen laufen über den nativen Dialog im Main-Prozess.** `confirmDialog()` →
  `dialog.confirm`, nie `window.confirm()`. Die sichere Antwort steht in `buttons[0]` mit
  `cancelId: 0`, der bestätigende Button ist nach der Aktion benannt. Overlays nur für Formulare.
- **Das Benutzerhandbuch liegt nur online, und nur der Hauptprozess kennt die Adresse.**
  `openHandbook()` (`menu.ts`) aus `HANDBOOK_URL` und einer Kennung aus
  `src/data/handbookPages.ts`; der Kanal ist `dialog.openHandbook`. Das Schema lässt nur
  `[A-Za-z0-9/_-]` zu.
- **Fenster:** ein Fenster, `hiddenInset` nur auf macOS, `will-navigate` nur auf das eigene
  Dokument, `setWindowOpenHandler` nur für http(s), eine CSP ohne externe Hosts, und
  `nativeTheme.themeSource` wird vor `createWindow()` gesetzt.

### Renderer

- **Eine Route ist gemountet, und sie besitzt ihr Dokument.** Beim Mount lesen, in `useState`
  halten, explizit speichern, `dirty` per Vergleich mit dem Gelesenen. Nach jedem eigenen
  Schreiben neu lesen; nie über eine Aktion hinweg halten, die Main schreiben könnte.
- **Was der Build liest, ist die Datei, nicht der Entwurf.** Ein Satz über Folgen außerhalb der
  Seite fragt `savedSnapshot`.
- **Ein Satz über einen Zustand steht nicht in dem Kasten, den dieser Zustand mit sich nimmt.**
- **Eine Bedingung fragt das, was sie anzeigt.**
- **Was im Renderer lebt, stirbt mit dem Fenster — unter macOS aber nicht die App.** Was danach
  noch stimmen soll, gehört in Main (Logs: `services/logBuffer.ts`, `logs:history`).
- **App-weit gibt es vier Dinge im Store** (`state/store.ts`): die Projektliste, die Settings, die
  Fehler und den Log-Puffer pro Projekt. Das Log-Abonnement lebt einmal in `App.tsx`.
- **„Wo war ich“ überlebt einen Routenwechsel, nicht einen Neustart.** `useStickyState(key)` mit
  stabilen Kennungen, nie Listenindizes. Übergaben schreiben vor der Navigation mit
  `primeStickyState`; ein Link in einen anderen Bereich ruft `markReturn` (`state/returnLink.ts`),
  innerhalb einer Seite `noteTabChange`.
- **Ein Menüpunkt, der die Seite meint, geht über `app:command`** (heute nur `'save'`, Register
  `state/saveCommand.ts`; wer nichts zu tun hat, registriert `null`).
- **Verlassen mit ungespeicherten Änderungen fragt.** `unsavedGuard.tsx` und `confirmLeave()` für
  Sidebar, „Zurück“ und Menü-Sprung; die Antworten sind Abbrechen, Speichern und Verwerfen.
  Scheitert das Speichern, bleibt man auf der Seite.
- **Eine Liste mit Leiste ist `DetailLayout` mit `SelectableRow`, und die Leiste zu verlassen ist
  ein Verlassen wie jedes andere.** Die Auswahl steht im Sticky-State. Escape, ein Klick ins Leere,
  eine andere Zeile und die Sidebar übernehmen oder fragen, nie still verwerfen. Der Fokus landet
  nie auf `<body>` (`focusRowAt`). Die Leiste sagt selbst, ob sie sofort schreibt
  (`SavesImmediately`).
- **Das registrierte Speichern schreibt alles, was `dirty` zählt.** Wer eine Teilmenge speichern
  will, braucht einen eigenen Button, der seine Reichweite im Namen trägt.
- **Ein Rückruf, den ein Effekt bei jedem Render neu setzt, ist nicht der Stand, den der Aufrufer
  meint.** Was nach einem `await` gebraucht wird, geht als Argument mit.
- **Ein Bedienelement, das seinen Wert von außen bekommt, darf nicht durch einen Zwischenstand
  geschickt werden.** Zusammengehörige Zustände werden im selben Tick gesetzt
  (`@uiw/react-codemirror` hält sonst ein `pendingUpdate` mit dem alten Wert zurück).
- **Der Statusplatz des Seitenkopfes ist für die kurze Antwort; ein Satz, der einen Weg nennt,
  steht unter dem Kopf**, in einer eigenen Live-Region.
- **Wer vor einem Überschreiben warnt, warnt dort, wo überschrieben wird — sonst wird dort nicht
  überschrieben.** `save()` schreibt den veralteten `custom.scss`-Entwurf nur vom Reiter mit dem
  Band und lässt die Seite sonst `dirty`.
- **Ein Lesevorgang, dessen Schlüssel sich per Klick ändert, braucht einen Abbruch-Guard**
  (`useIpcQuery`); bei konstantem Schlüssel nicht.
- **Ein Ref, den ein Effekt zurücksetzt, hängt an einem Render, den React auslassen darf.** Vor dem
  Umlegen eines Refs prüfen, ob sich der Wert überhaupt ändert.
- **Kein API-Aufruf ohne Netz:** Der globale `unhandledrejection`-Handler macht einen Toast. Jedes
  Busy-Flag wird in `finally` zurückgesetzt (`useAsyncAction`). Ein Lesevorgang, der die Seite
  trägt, bekommt ein `catch` und einen Fehlerzustand in der Seite (`formatIpcError`).
- **URL zuerst, Sticky-State als Fallback** für Sub-Tabs (`?tab=`). Der Default-Tab löscht den
  Parameter, alte Pfade bleiben als Redirects.
- **Eine Stelle bestimmt die Seitenbreite** (`ProjectLayout`, 1800px). Seiten setzen keine eigene
  Maximalbreite.
- **Wer rollt, ist nicht wer die Breite deckelt.** Der Roller geht über die volle Breite, die
  Kappung sitzt in einem Kind.

### Primitives und Gestaltung

- **`ui.tsx` wrappt native Elemente; erweitern statt daneben bauen.** `Field` ist ein `<label>`
  ohne Button darin (dafür gibt es `FieldGroup`). `className` auf einem Primitive dient der
  Platzierung, nie der Farbe; neue Varianten kommen nach `VARIANTS`.
- **`Modal` ist das native `<dialog>` mit `showModal()`.** `data-autofocus` für den Startfokus.
  Kein `fixed inset-0`-Overlay (Toasts sind erlaubt). `onSubmit` = bestätigt (Dialog bleibt offen,
  die Seite schließt per `open`/Unmount), `onClose` = nicht bestätigt; ein Modal mit Eingabe hat
  `onSubmit`.
- **`Button` hat `type="button"` als Default** und ist selbst eine Flex-Zeile: Ein Icon kommt
  direkt neben das Wort, ohne `<span>`.
- **Einen Eintrag aus einer Liste nehmen ist ein Mülleimer.** `IconButton` mit `Trash2`, `title`
  über `common.deleteNamed`/`removeNamed`, Frage über `confirmDialog()`. In Formularen und Panels
  behält eine Aktion ihr Wort.
- **`SegmentedControl` ist eine Radiogruppe, keine Button-Reihe**: `radiogroup`/`radio`,
  Roving-Tabindex, Pfeile ändern die Auswahl mit Umbruch, der Fokus wandert vor `onChange`, `label`
  ist Pflicht. `variant="chips"` ist für Optionen, die Daten sind und umbrechen.
- **Eine Karte hat eine Überschrift, und die hat ein Icon.** `CardHeading` ist das einzige `<h2>`
  einer Karte (`text-heading`, Lucide `size={15}`). Bei gleichem Thema kommt das Icon aus
  `navConfig`.
- **Farben heißen nach Rolle, nicht nach Palette.** Die zehn Tokens in `src/index.css` (`bg-ground`,
  `bg-surface`, `text-text`, `text-text-secondary`, `text-text-muted`, `border-ink/…`, `bg-accent`,
  `text-accent-text` …). Statusfarben bleiben Palette. `theme.ts` hält den Grund als zweite Kopie.
  Umgestellt wird beim Anfassen, kein sed.
- **Was ohne Zutun erscheint, wird angesagt.** Live-Region (`PageHeader` `status`, `role="log"`)
  vor ihrem Text, leer gerendert. `status={null}` heißt „leer, aber da“. Eine `<h1>` pro Seite,
  jede `<nav>` mit Namen.
- **Eine Ansage, die schweigt, sagt den Satz von vorhin.** Die erste Meldung eines Drags schweigt;
  ein späterer Schritt zurück bekommt `dnd.backHome`, gefragt über `isHome`.
- **Was keinen festen Platz hat, wird über `announce()` gesagt** (`state/announcer.tsx`). Sätze
  sind ganz, mit Subjekt. Drag-Ansagen kommen aus `utils/dndAnnouncements.ts`; die Aufrufstelle
  liefert den Namen, `isHome` und `dropOutcome`, damit gesagt wird, was passiert ist. Eine
  Ablehnung wird in der Region gesagt, die gerade spricht.
- **Schriftgrößen heißen nach Rolle, so wie die Farben.** `text-micro` (11px), `text-ui` (13px),
  `text-heading` (15px), nur die Größe. Ausreißer behalten ihre Zahl.
- **Ein deaktiviertes Control muss noch lesbar sein.** Explizite disabled-Farben, keine Opazität;
  `Field muted` setzt nur das Label.
- **`darkMode: 'media'`, und das ist der App-Schalter** (`nativeTheme.themeSource`). Kein Wechsel
  auf `'class'`; neue UI mit `dark:`-Varianten.
- **Ein Bereich eines Frames ist Geometrie, eine Belegung ist die Herkunft seines Inhalts.** `slot`
  ist optional, eine Doppelbelegung wird gesagt. Über sieben Bereiche hinaus geht es über
  `layout.group` (k-te Flex = k-te Gruppe). Ordnungen je erreichbarem Seitentyp werden beim Rendern
  gewählt, sonst wird gesagt statt geraten. `writeAllFrames()` läuft vor jedem Build und
  `--serve`-Start. **Vor Änderungen an der Gruppenwahl die Langfassung lesen.**
- **Eine Priorität ordnet innerhalb eines Bereichs, nicht zwischen Bereichen.**
- **Eine Maske beschneidet auch ein `position: fixed` in ihrem Stapelkontext**, und eine klebende
  Spalte ist ebenfalls ein Stapelkontext.
- **Was ein Baustein einpackt, ist der Ordner, nicht die Regel** (`fonts` packt
  `quartz/static/fonts`). Wer eine Menge austauscht, räumt die alte weg.
- **Erzeugtes CSS gehört in die Kaskadenschicht dessen, was es nachspricht.** Die Kompat-Blöcke in
  `shared/gridFrameCss.ts` stehen in `@layer quartz-base`; die Grid-Regeln des Frames bleiben
  ungeschichtet. Was absichtlich fehlt, steht mit Grund in der Liste daneben.
- **Kein natives HTML5-Drag mehr, nirgends.** Neue Stellen nehmen `@dnd-kit` mit
  `KeyboardSensor`; der Knoten ist das ganze Element, der Griff `setActivatorNodeRef`. Listen
  nehmen `sortableKeyboardCoordinates`, Raster `nearestDroppableCoordinates`
  (`utils/dndKeyboard.ts`). `PointerSensor` mit `distance: 4`; Sensoren an den `DndContext`
  übergeben. Ein Pfeildruck geht vom eigenen Feld aus, das Layout-Board nimmt keine schrägen
  Schritte. Kein `stopPropagation()` über einem Drag. Das Overlay-Kind bekommt `w-fit`, die Fläche
  wird nicht per `transform: scale` verkleinert. Das Layout-Board hat seine Pfeile im Inspector,
  der Vorrat schaltet aus (`parkedIndices`). **Vor jeder Drag-Änderung die Langfassung lesen.**
- **Ein Wort, ein Name — und zwar über App und Handbuch hinweg.** Vokabular-Tabelle
  `positions`. Festgelegt: „Variante“, „Box“, „Smartphone“, „Button“; „Übersicht“ ist die einzige
  eingetragene Doppelbedeutung. Anführungszeichen: Deutsch „…“, Englisch “…”. Jeder Nutzertext
  steht in `de.ts`/`en.ts` oder `electron/main/i18n.ts`; zod- und `console.error`-Texte bleiben
  Englisch. Zitate alter App-Sätze bleiben im alten Wortlaut, Messprotokolle in `decisions/` und
  Review-Protokolle ebenso (keine Wortersetzung). Ein Nutzertext sagt „QuartzControl“,
  nicht „die App“; „der Frame“; ein Fachwort wie „Header“ bleibt, wie es ist („Kopfbereich“ ist
  die Position); Gedankenstriche sparsam; „konnte nicht … werden“ statt „ließ sich nicht …“; wer
  per Klick kopiert, kopiert „in die Zwischenablage“.
- **Ein Fachbegriff bekommt eine Zeile darunter** (`hint`), ein tragender Begriff eine `InfoNote`
  über die volle Spaltenbreite.
- **Ein Rat gehört zu dem Zustand, den er meint, und wird dort gesagt, wo der Zustand bekannt
  ist** (z. B. `configMissing` aus Main).
- **Ein Hinweis sagt, was passiert — nicht, warum es technisch so ist.** Höchstens zwei Sätze. Das
  Kapitel nennt die Seite über `PageHeader` `handbook` und `<HandbookLink page="…">` (Kennung aus
  `handbookPages.ts`, kein Pfad). Einzige Ausnahme mit zweitem Verweis: der Content-Ordner im
  Reiter „Website“. Ein Bestätigungsdialog besteht aus Frage und einem Satz Folgen; den Rückweg
  nennt er nur, wenn er nicht offensichtlich ist (nur über git, Papierkorb, gar nicht, ein
  Schalter). Den automatischen Snapshot sagt er höchstens an, ohne ihn als Rückweg zu erklären.
  Sätze, die eine datenkostende Verwechslung verhindern, bleiben lang.
- **Sidebar nach Tätigkeit, eine Seite ist eine Aufgabe.** Die Übersicht ist eine Statusseite:
  nur lokale Reads, genau einer ins Netz, nie awaited.

### Arbeitsweise, die sich bewährt hat

- **„Kann nicht prüfen“ ist nie „alles gut“.** `unavailable`/`'unknown'` sind eigene Antworten,
  auch in Prüfskripten: Was nicht lesbar ist, wird gezählt und genannt.
- **„Kann nicht prüfen“ wird je Ding gefragt, nicht je Werkzeug — und ein Ersatz antwortet nur in
  die Richtung, die er beweisen kann** (z. B. `git merge-file` als Beweis „nichts Eigenes
  obenauf“). Die Gegenprobe gehört dazu.
- **Wer fragt, ob etwas noch gebraucht wird, sucht breit; wer löscht, löscht schmal.** Breit heißt
  rekursiv, durch Symlinks, durch jede Schreibweise. Die Oberfläche sagt, wo gesucht wurde.
- **Ein fremder Dienst, der nicht scheitert, hat nicht unbedingt geliefert.** Die Antwort wird
  gegen die Anfrage gehalten; was fehlt, wird genannt.
- **Ein Prädikat, das für einen Lauf geschrieben ist, wird als Aussagesatz nicht wahr.** Was ein
  Prüfskript nicht sehen kann, gehört in `docs/release.md`.
- **Ein Ausweg, den eine Meldung nennt, wird an der Oberfläche gemessen, nicht am Kanal darunter.**
  Ein Kanal, der einen Satz antwortet, braucht einen Aufrufer, der ihn liest.
- **Zwei Arten zu scheitern bekommen zwei Antworten** („fehlt“ ≠ „kaputt“, getrennt am Ort des
  Scheiterns). Ein Ersatz, der läuft, sagt, dass er lief.
- **Ein Bau, dem etwas fehlt, bricht ab, statt zu warnen.** Wer das Fehlende nicht will, sagt es
  mit einem Flag.
- **Ein Fix auf einem Branch, der nie gemergt wurde, ist keiner.** Vor einem Release
  `git cherry` über alle Branches (`docs/release.md`).
- **Ein Handgriff, der nur in einer Commit-Nachricht steht, wird beim nächsten Mal vergessen.**
  Release-Handgriffe gehören in `docs/release.md`, wo möglich als Skript (`--check-sync`).
- **Was ein Skript leiht, gibt es zurück — an jedem Ausgang** (`process.on('exit')` und Signale;
  Muster: `lendProjectTargets()`).
- **„Die Datei ist da“ ist nicht „die Datei lässt sich lesen“.** Inhalt prüfen; schreiben über
  Temp-Datei, `fsync`, `rename` (Muster `jsonStore.ts`); Unlesbares wegräumen.
- **Wer fremdem Code eine Lücke nachsagt, liest erst, was er schon tut.**
- **Eine Vorlage zu bauen ist der schärfste Test für das Plugin, auf dem sie steht.** Funde gehen
  ins Plugin zurück, statt sie je Vorlage zu umgehen.
- **Gemessen, nicht angenommen.** Jede Regel hat ihr Experiment in `docs/decisions/`.
- **Eine Zahl, die einen Fix belegen soll, nennt mindestens einen ihrer Fälle mit seiner
  Ursache.** Teilen sich zwei Befunde eine Funktion, wiederholt der spätere die Messung des
  früheren.
- **Wer einen Nutzen misst, misst auch den Preis.**
- **Eine Prüfliste ist eine Spalte, keine Zeile.** Ein Argument für einen Zustand gilt für alle
  Zustände, für die es gilt.
- **Drift läuft in beide Richtungen, und ein Werkzeug, das nur eine kennt, sieht sie nicht.**
  `--check-sync` vor jeder Messung an der gebauten Website.
- **Ein Wert, den ein fremdes Programm vergleicht, wird nach dessen Regel gebildet — und die Regel
  wird gegen das fremde Programm geprüft** (`shared/quartzPluginName.ts`, `check:plugin-names`).
- **Liegt das fremde Programm im Projekt, fragt die App es selbst — mit denselben Eingaben, auch
  den unsichtbaren** (`globby` mit Quartz' cwd).
- **Ein Prüfskript, das Logik der App braucht, lädt sie, statt sie abzuschreiben.** Die Logik steht
  als reine Funktion in `shared/`, das Skript importiert eine `.mts`-Kopie.
- **Eine Messung trägt nur so weit wie ihre Stichprobe, und eine Decke wird an dem gemessen, was
  sie treffen soll** (Eingabe vom anderen Ende des Feldes, z. B. CJK-Schriften; Szenen auch mit
  0 ms).
- **Eine Messung trägt nur so weit wie ihr Instrument — und das Instrument ist das, das im Code
  steht.** In der Commit-Nachricht steht, womit gemessen wurde.
- **Eine Kopie erbt keinen Pfad, aber ein Snapshot bringt einen zurück.**
  `repointProjectPaths()`, `repointAuthoredFrames()` beim Restore, Eintragen und an der Bau-Tür;
  `writeConfig` wendet die Regel an und wartet an `whileHoldingConfig`.
- **Ein Symlink-Schutz prüft jedes Segment, nicht das oberste Verzeichnis** — und fragt mit
  `lstat`, nicht mit `existsSync` (`writableTarget`).
- **Eine Kopie erbt keinen Pfad, der in das Original zeigt.** `duplicateService.ts` führt beide
  Listen mit Grund; was schiefgehen kann, wird vor dem Kopieren gefragt.
- **Was eine Kopie nicht erbt, steht an einer Stelle mit Grund — und die nächste Ausnahme kommt
  dorthin, nicht auf eine Seite** (`duplicateEntry`, `classSource()` in `LayoutEditor/utils.ts`).
- **Eine PID trägt nicht über die Zeit.** Direkt vor dem Signal die Kommandozeile neu prüfen;
  eigene Server über `stopServer()` beenden; eine Map wird nur geräumt, wenn der Eintrag noch
  dieses Kind ist (`forgetServer()`).
- **Ein Lesepfad legt nie `.quartz-gui/` an.** Zum Lesen `quartzGuiPath()`, zum Schreiben
  `quartzGuiDir()`.
- **`.quartz-gui/` ist ein Name auf fremder Platte und bleibt, wie er ist.** Ein Bezeichner, den
  ein anderer Rechner schon geschrieben hat, ist ein Format. Der Marker in `custom.scss` heißt
  `QuartzControl:managed:`; gelesen werden beide Namen (`MARKER_NAMES`), wer schreibt, benennt alle
  um, bei Doppelten gewinnt die spätere Kopie. **`_quartzcontrol.scss` ist ab 1.1 ein Format:**
  Kein Schreiber zieht um, das tut nur „Jetzt umstellen“ (mit Snapshot `styleMigration`) oder das
  Anlegen eines Projekts. Beim Zusammenführen wird die Ladereihenfolge neu gebildet.
- **JSON-Stores nur über `jsonStore.ts`**: atomar schreiben, Unlesbares beiseitelegen.
- **Eine Datei, die leer ist, ist nicht dasselbe wie eine, die etwas anderes enthält.** Eine leere
  Config ist gültig. Syntaxfehler (`doc.errors`, `parseDocument` wirft nicht), kein Mapping und
  `plugins:` ohne Liste bekommen je einen Satz.
- **Was nur ein Kindprozess beantworten kann, wird auch dort gemessen** (`check:runtime`, die
  gepackte App).
- **Vor jedem UI-Urteil die App wirklich starten** (`run-desktop`, `npm run smoke`), unter
  Playwright zuerst `colorscheme none`. Was Playwright nicht erreicht, wird über `app.evaluate`
  gespiegelt und als „nicht am OS gemessen“ gekennzeichnet.
