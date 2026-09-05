# Plugins, Marktplatz und die zwei Wege in quartz.config.yaml

Aus CLAUDE.md ausgelagert (2026-09-02): die Messungen und Beobachtungen hinter den Regeln, wortgleich. Die Regeln selbst stehen in CLAUDE.md; hier steht, welches Experiment sie erzwungen hat. Neue Einträge kommen mit derselben Form dazu: was gemessen wurde, was daraus folgt.

**Plugin options are edited against a real schema, not free-form YAML.** `pluginSchemaService.ts` runs the TypeScript Compiler API (`ts.createSourceFile`, AST walking only — no type-checker) at runtime over an installed plugin's compiled `.quartz/plugins/<name>/dist/**/*.d.ts` to find an `interface *Options` and turns each property into a `PluginOptionField` (`boolean`/`string`/`number`/`enum` off a string-literal union/`unsupported` for anything else, e.g. functions or nested objects), then separately mines `dist/**/*.js` for whichever top-level object-literal variable shares the most property names with that field set (a plugin-agnostic heuristic, not a fixed `defaultOptions` name) to annotate each field's description with its real default. This only works for plugins installed via `quartz plugin add` (i.e. anything under `.quartz/plugins/`) — built-ins (`@quartz-community/x` config entries) ship no discoverable compiled output, so `plugins.optionsSchema()` returns `null` for those and `Installed.tsx` falls back to an inferred-type editor. That fallback **does** offer a key/value adder, because the alternative was worse than an unvalidated key: `explorer` and every other built-in has real options upstream, and editing "only the keys already in the config" meant a freshly configured plugin offered nothing at all to set. A typed value (`true`/`false`, a number, `[…]`/`{…}` as JSON) is parsed rather than stored as the string it was typed as, and each existing key gets a delete button - a key you can add and never remove is a typo you keep forever.

**An authored frame is a plugin, and the plugin list is where that leaks.** `layoutFrameService.saveFrame()` registers a new frame with `quartz plugin add <the frame's own directory>`, so `quartz.config.yaml` carries an entry whose source is an absolute path under `.quartz-gui/authored-frames/` - it has to, or the frame is not built. `Installed.tsx` therefore reads `layoutFrames.list()` alongside the config and gives those entries their own section: the frame's `frameName` instead of the directory id, its area count instead of a 60-character path, and a link that hands the Layout editor its tab *and* the frame to open (`primeStickyState`, since neither lives in the URL). An entry only counts as a frame when **both** halves agree - a frame with that id exists and the source really points at its directory - so a plugin that merely shares a name is still a plugin.
- **Removing one has to go through `layoutFrames.delete`.** `quartz plugin remove` unregisters the frame but leaves its directory, and `saveFrame` only re-registers a frame whose directory is *new* - so the frame stayed in the Layout editor's list, editable and saveable, while being part of no build ever again, with nothing in the UI to show it. This was the row's Remove button until it was routed through the frame API, which deletes the directory too.

**Der Griff muss aussehen, als ließe er sich greifen (2026-09-02).** Der Anfasser war ein blankes
Braille-Zeichen `⠿` in Muted-Grau auf dem Kartengrund - technisch der einzige `draggable`-Punkt der
Zeile, optisch aber Dekoration. Im Alpha-Test nebeneinander mit dem Layout-Editor gesehen, dessen
Griff seit jeher eine gerahmte, gepolsterte Fläche mit `GripVertical` ist: dort erkennt man ihn, hier
nicht. Jetzt dieselbe Fläche, mit Hover-Zustand und in Farb-Tokens statt Palette. Die Zeile mit
`canDrag={false}` (Frames, und jede Zeile bei aktivem Filter) behält den Platz, verliert aber Rahmen
und Fläche und wird `text-text-muted` - gedimmt statt unsichtbar, wie es die Regel für deaktivierte
Bedienelemente verlangt. Gemessen im laufenden Programm in beiden Farbschemata; dass das Icon die
Geste nicht schluckt (SVG-Kinder sind in Chromium nicht selbst `draggable`), mit einem
`dragstart`/`dragend`-Paar auf dem `<svg>` geprüft, das im Handler der Zeile ankommt.

**Die Umstellung auf `@dnd-kit` (2026-09-03).** Der vorige Durchgang ließ den Griff aussehen wie
einen Griff, ohne dass er mehr konnte; natives HTML5-Drag kennt keine Tastatur. Jetzt `useSortable`
wie im Layout-Editor, plus zwei Pfeile pro Zeile als das, was man ohne Anleitung findet.

Drei Dinge, die dabei gemessen wurden:

- **Ein `DndContext` pro Gruppe, nicht einer um die Seite.** Die Gruppen sind getrennte Folgen in
  `quartz.config.yaml` - `layout.priority` einer Komponente, `order` eines Verarbeitungs-Plugins -
  und kein Eintrag wandert von einer in die andere. Mit je einem Kontext ist das baulich wahr statt
  eine Abfrage im Drop-Handler.
- **`rectSortingStrategy`, nicht `verticalListSortingStrategy`.** Ab 1500px ist die Liste zweispaltig
  (`PLUGIN_LIST`); die Listenstrategie rechnet mit einer Spalte.
- **Der Tastatur-Sensor braucht `sortableKeyboardCoordinates`.** `DndContext` bringt den
  `KeyboardSensor` von sich aus mit, aber mit seinem Standard-Koordinatengeber: der schiebt den
  aufgenommenen Eintrag pro Pfeildruck um feste 25px. Bei Karten von ~130px Höhe erreicht das nie die
  nächste Karte - im laufenden Programm gemessen, die Ansage blieb bei „moved over droppable area 37“,
  also über sich selbst. Mit dem Sortable-Koordinatengeber läuft die Aufnahme über Leertaste,
  Pfeiltaste, Leertaste durch bis in die Datei. Im Zweispalter geht „hoch“ dabei geometrisch, also in
  die Zeile darüber und damit ggf. zwei Plätze weit; das ist richtig so, es ist die Karte, die oben
  liegt.

Geprüft im Produktions-Build gegen `gui-test`, jeweils an der Datei: Maus-Drag (Pointer-Events, die
das alte HTML5-Drag nicht hatte), Tastatur-Aufnahme, beide Pfeile, die Randfälle (erster Eintrag ohne
„nach oben“, einziger Eintrag ohne beides, Frame-Zeilen ohne Pfeile) und der aktive Filter, der
Griff *und* Pfeile deaktiviert. Danach die Konfiguration byte-gleich zurückgestellt.

**Was dabei offen bleibt:** die Ansagen von dnd-kit sind Englisch, in dieser Liste wie im
Layout-Editor - `accessibility.announcements` nimmt eigene Texte, und die gehören dann beiden
Stellen gemeinsam, nicht dieser hier allein.

**Dragging is off while the list is filtered, and that is a correctness rule, not a nicety.** `reorderGroup` renumbers a whole group in steps of ten from the sequence it is handed. Handed a *filtered* group, it assigns those numbers as though the hidden entries did not exist, silently reshuffling them - so the search/filter row disables the handles and says why. The handle is also the only `draggable` element now: with it on the whole card, selecting a description or dragging inside an option field started a reorder. Verified end to end by dispatching the drag/drop pair against a real project and diffing `quartz.config.yaml`: a move and its reverse leave the file byte-identical.

**The marketplace is one organisation's repository list, and most of it is not a plugin.** `marketplaceService` fetches every repo of `quartz-community` - which includes the core itself (`v5`, archived), the shared libraries (`types`/`runtime`/`utils`), a `registry`, a `plugin-template`, an awesome-list and several forks. The org marks the real ones with the **`quartz-plugin` topic** (47 of 63 at the time of writing, checked against the API), so `Marketplace.tsx` splits on that plus `archived` rather than filtering: the marker is not perfect either - a forked plugin can lack it - and hiding a real plugin is worse than listing an odd repository under a collapsed "other" heading. This is also why the `github:owner/repo` field lives here rather than on the Installed tab: a plugin outside this one organisation is unreachable through the catalog, and on the Installed tab that unlabelled field sat exactly where a search box belongs.
- **A catalog that could not be fetched says so.** `searchPlugins` answers a `MarketplaceResult` carrying `unavailable`, because the failure path returns one hard-coded entry and an unreachable or rate-limited GitHub was otherwise indistinguishable from a one-plugin organisation - the same "cannot check is not the same as fine" distinction `styleService`'s `unavailable` and `updateService`'s `'unknown'` make. A failed fetch is never cached (retrying costs one request; waiting out fifteen minutes on a placeholder does not help anyone), and the renderer holds `null` until the first answer arrives - it used to start at `[]`, so for the second the fetch takes the tab said "Keine Plugins gefunden", measured in the running app. The fifteen-minute cache also has a "Katalog neu laden" button now; `marketplace.refresh` had been wired through to preload and called from nowhere.
- **`quartz plugin install` and `plugin prune` are on the Installed tab under "Wartung".** Both were wired end-to-end and reachable from no screen. They act on `.quartz/plugins`, which is not committed: restoring it from `quartz.lock.json` is what a freshly cloned copy of a project needs, and pruning drops directories no config entry points at any more. They are kept apart from the plugin list proper because neither changes what the site does.

**Two config-mutation paths coexist, and mixing them up breaks silently.** `quartz plugin enable/disable/config --set <key>=<value>` all **no-op (exit 0, no file change)** for any plugin not CLI-"installed" — i.e. every built-in `@quartz-community/x` entry, which is most of them. So `configurePlugin`/`enablePlugin`/`disablePlugin` were removed entirely (there's no `plugins.enable`/`.disable`/`.configure` in `ipc-contract.ts` — don't re-add them expecting the CLI to work); `Installed.tsx`'s `toggleEnabled`/`updateField`/`reorderGroup` instead call `config.save` directly. Only `plugins.add`/`.remove`/`.installFromLock`/`.prune` still shell out to the CLI (verified reliable for those specific actions).
- Direct-write mutations must address plugin entries **by array index, not derived display name** — a built-in `@quartz-community/explorer` entry and a CLI-installed `github:quartz-community/explorer` entry both derive the display name `"explorer"` (see `deriveName()`), so name-based lookup can silently mutate the wrong entry once both exist side by side. The Marketplace also blocks installing a plugin whose normalized repo id already matches an existing entry, to stop that situation from being created in the first place.

## Der Optionsschlüssel ist das Label (2026-09-03)

Der Befund aus dem U2-Durchgang war „der Name steht doppelt da“ — beim Nachsehen war das die
harmlosere Hälfte. Die andere: von den vier Zeilentypen in den beiden Options-Editoren trug nur der
Schalter überhaupt einen Namen. Select, Zahl und Text hatten links einen `<span>`, von dem das
Bedienelement nichts wusste; ein Screenreader sagte „Kombinationsfeld“ und sonst nichts, auf einer
Seite mit bis zu neun solchen Feldern pro Plugin.

Der Schlüssel ist jetzt ein `<label htmlFor>` und das Control trägt die passende `id` (`Select` und
`TextInput` reichen `id` an ihr Element durch, weil sie ihre Props spreizen). Der Schalter bleibt die
Ausnahme und behält sein eigenes verstecktes Label: sein `<input>` sitzt in einem `<label>`, ein
zweites außen herum ließe den Namen zweimal ansagen. In dieser einen Zeile steht der Name also
weiter zweimal im DOM — unordentlich, nicht falsch, und das Aufräumen hieße, `Toggle` beizubringen,
sich von außen benennen zu lassen.

Dazu die Zeile zum Hinzufügen einer Option: zwei Felder, die nur einen Platzhalter hatten. Ein
Platzhalter ist kein Name, er verschwindet beim ersten Tastendruck — sie tragen jetzt `aria-label`
mit demselben Wort.

Im Produktions-Build geprüft, über die Auflösung der Namen im DOM statt über den Augenschein: alle
neun Schema-Felder eines Plugins antworten mit ihrem Schlüssel (`position`, `priority`, `display`,
`condition`, `group`, `basis`, `order`, `align`, `justify`), die beiden Felder der Hinzufügen-Zeile
mit „Option“ und „Wert“. Die Ansicht selbst ist unverändert.

## Das Projektbild ist das Favicon der Seite (2026-09-03)

Die Projekte trugen in der Seitenleiste ein generiertes Avatar: Anfangsbuchstabe auf einer von acht
Farben, deterministisch aus der Projekt-ID. Auf der Startseite gab es gar keines. Gesucht war ein
eigenes Bild pro Projekt, das zugleich das Favicon der Website wird.

Gemessen wurde zuerst, was das Favicon-Plugin wirklich tut — an der installierten Fassung in einem
echten Projekt (`node_modules/@quartz-community/favicon/dist/index.js`), nicht an der Doku: der
Emitter setzt den Pfad selbst zusammen (`joinSegments("quartz", "static", "icon.png")`), skaliert
mit sharp auf 48×48 und schreibt `favicon.ico` ins Ausgabeverzeichnis. Er hat **keine Optionen**, es
gibt also keinen zweiten Pfad, auf den man ihn richten könnte. Das Plugin steht in
`quartz.config.default.yaml` mit `enabled: true`, und `quartz/static/icon.png` liefert Quartz selbst
mit — in drei geprüften Projekten war die Datei da.

Daraus folgt der Zuschnitt: **eine Datei für beides.** Das Projektbild *ist* `quartz/static/icon.png`.
Eine Kopie in `.quartz-gui/` könnte nur von dem abweichen, was die Seite ausliefert.

Was das erzwingt:

- **„Es gibt eine Datei“ heißt nicht „jemand hat sie gewählt“.** Weil Quartz sein Standardicon
  überall mitliefert, würde ein Avatar aus der Datei allein in jedem Projekt dasselbe Bild zeigen und
  die Unterscheidbarkeit kosten, die der farbige Buchstabe hat. Die Antwort wird notiert, nicht
  geraten: `.quartz-gui/project-icon.json` (`custom`, `hasOriginal`) wird beim Zuweisen geschrieben,
  und das verdrängte Icon liegt als `icon-original.png` daneben. „Bild entfernen“ ist deshalb eine
  Wiederherstellung, keine Löschung — der Emitter liest `icon.png` bedingungslos, ein Projekt ohne
  die Datei baut eine Seite ganz ohne Favicon.
- **Normalisiert wird mit Electrons `nativeImage`**, nicht mit sharp: sharp hängt am Quartz-Projekt,
  nicht an der GUI, und wäre ein natives Binary im Bundle. JPEG wird zu PNG (der Emitter kennt nur
  den einen Dateinamen), alles über 512 px auf die längere Kante gedeckelt; ein PNG, das schon passt,
  wird byteweise kopiert statt neu kodiert — der Nutzer hat diese Datei gewählt. Gemessen: 1200er
  JPEG → 512×512-PNG, 512er PNG → identische md5. SVG kann `nativeImage` nicht dekodieren und kommt
  als leeres Bild an; das und eine Textdatei mit `.png` werden mit je eigener Meldung abgelehnt, ohne
  die vorhandene `icon.png` anzufassen.
- **Der Renderer bekommt eine Data-URL, keinen Pfad.** Die CSP erlaubt `img-src 'self' data:`, ein
  `file://` ins Projekt erreicht der Renderer in der Sandbox nicht. Das Thumbnail (128 px) entsteht im
  Hauptprozess und liegt dort in einem Cache über Pfad + mtime + Größe, damit die Startseite ihre
  Regel behält: nur lokale Reads, und ein Neuladen der Liste dekodiert nichts noch einmal.
- **Die Seitenleiste besitzt ihr Avatar, geändert wird es eine Ebene tiefer.** `ProjectLayout` gibt
  über den Outlet-Context ein `refreshIcon()` mit; die Konfigurationsseite ruft es nach dem Schreiben.
  Ein Datei-Watcher für ein Bild wäre ein zweiter Mechanismus für etwas, das ein Funktionsaufruf
  beantwortet — es gibt genau einen Schreiber.
- **Der Zustand des Favicon-Plugins wird gezeigt, nicht geschaltet.** Die Zeile unter dem Bild sagt,
  ob das Plugin an, aus oder nicht installiert ist, und verlinkt auf die Plugin-Seite. Ein Schalter
  hier hätte einen zweiten Schreiber auf `quartz.config.yaml` neben dem Speichern-Knopf derselben
  Seite gehabt, die die Config in `useState` hält.

Am laufenden Produktions-Build geprüft (1728×1000, hell und dunkel): Startseite und Seitenleiste
zeigen das Bild bzw. weiterhin den Buchstaben für ein Projekt ohne eigenes; „Bild entfernen“ setzt
Vorschau *und* Seitenleisten-Avatar im selben Klick zurück und stellt die ursprüngliche `icon.png`
byteidentisch wieder her. Nicht am OS gemessen: der native Dateidialog hinter „Bild wählen…“ — unter
Playwright blockiert er; geprüft ist der Weg dahinter (`projectIcon:set` mit dem Pfad, den der Dialog
liefert).

**Was ein Duplikat erbt, entscheidet eine Liste - und drei Dinge fehlten darin (2026-09-05).** Ein
authored frame ist ein Plugin mit absolutem `source`, und `cp` kopiert alle drei Stellen, die diesen
Pfad festhalten, wortgleich: den Config-Eintrag, `source`/`resolved` in `quartz.lock.json` und den
Symlink `.quartz/plugins/<id>`. Gemessen an einem Duplikat von `quartz-vorlage-gegenprobe` (drei
Frames): die Kopie baute aus den Verzeichnissen des Originals. Eine Änderung in der Kopie schrieb
`saveFrame` in deren eigenes `authored-frames/` - das Verzeichnis existiert ja, also gilt das Frame
als registriert und wird nicht neu angemeldet - und erschien in keinem Build; jede Änderung im
Original erschien dagegen in der Kopie, und ein dort gelöschtes Frame nahm der Kopie den Build.
`duplicateProject` schreibt deshalb jeden Pfad um, der *innerhalb* des Quellprojekts liegt; was
außerhalb liegt, bedeutet in beiden Projekten dasselbe und bleibt. `writeConfig` bekam dafür die
`snapshot: false`-Ausnahme, die `saveFrame` schon hatte - die Kopie hat bewusst keinen
Snapshot-Store und darf hier keinen anfangen.

Zwei weitere Einträge fehlten in derselben Liste. `.quartz-gui/project-prefs.json` hält als einzigen
Schlüssel den *absoluten* Ausgabepfad des Originals; geerbt, hätte der erste Klick auf „Bauen“ in der
Kopie den Export des Originals gelöscht und sich hineingeschrieben, ohne Rückfrage - `quartz build
--output` leert das Verzeichnis zuerst, und `buildOutputGuard` antwortet `ok`, weil ein Ordner mit
`index.html` und `static/` vom eigenen vorigen Build nicht zu unterscheiden ist. Und `SKIP_PREFIX`
traf `deploy-manifest-<id>.json`, nicht aber den Vor-Split-Namen `deploy-manifest.json`, den
`readManifest` für das erstfragende Ziel adoptiert: die Kopie hätte ihrem neuen Ziel gemeldet, ein
Server, auf dem sie nie war, sei bereits aktuell. `branch-worktree-<id>` - ein im `.git` des
*Originals* registrierter Worktree, den ein abgebrochener Deploy hinterlässt - stand nirgends.

**Ein Name ist keine Kennung, wenn ein Plugin mehrfach installiert sein darf (2026-09-05).** Der
Sticky-Schlüssel des Optionen-Panels war `plugins.expanded.<name>`, und ein echtes Projekt hat sechs
`quartz-layout-box`-Einträge. Gemessen an der gebauten App mit drei davon: solange die Seite
gemountet bleibt, fällt nichts auf — `useStickyState` liest den Speicher nur im
`useState`-Initialisierer, der Klick erreicht also den lokalen Zustand einer Zeile und die anderen
behalten ihren. Es zeigt sich beim Zurückkommen: zweite Box aufklappen, Seite verlassen, zurück —
alle drei stehen offen. Der Schlüssel trägt jetzt zusätzlich, die wievielte gleichnamige Zeile es
ist. Auch das ist nicht perfekt (das Entfernen der zweiten von sechs verschiebt die vier dahinter um
eins), aber diese Einträge sind für den Lesenden ohnehin nicht zu unterscheiden, während das geteilte
Panel in jedem Projekt sichtbar war, das eine Layout-Box mehr als einmal benutzt. Frames behalten den
blanken Namen: ihre IDs sind Verzeichnisnamen unter `authored-frames/` und schon eindeutig.

