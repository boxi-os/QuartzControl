# Plugins, Marktplatz und die zwei Wege in quartz.config.yaml

Aus CLAUDE.md ausgelagert (2026-09-02): die Messungen und Beobachtungen hinter den Regeln, wortgleich. Die Regeln selbst stehen in CLAUDE.md; hier steht, welches Experiment sie erzwungen hat. Neue Einträge kommen mit derselben Form dazu: was gemessen wurde, was daraus folgt.

**Plugin options are edited against a real schema, not free-form YAML.** *(Stand 1.0. Seit 1.1 abgelöst: „Das Options-Schema hat drei Quellen“ weiter unten.)* `pluginSchemaService.ts` runs the TypeScript Compiler API (`ts.createSourceFile`, AST walking only — no type-checker) at runtime over an installed plugin's compiled `.quartz/plugins/<name>/dist/**/*.d.ts` to find an `interface *Options` and turns each property into a `PluginOptionField` (`boolean`/`string`/`number`/`enum` off a string-literal union/`unsupported` for anything else, e.g. functions or nested objects), then separately mines `dist/**/*.js` for whichever top-level object-literal variable shares the most property names with that field set (a plugin-agnostic heuristic, not a fixed `defaultOptions` name) to annotate each field's description with its real default. This only works for plugins installed via `quartz plugin add` (i.e. anything under `.quartz/plugins/`) — built-ins (`@quartz-community/x` config entries) ship no discoverable compiled output, so `plugins.optionsSchema()` returns `null` for those and `Installed.tsx` falls back to an inferred-type editor. That fallback **does** offer a key/value adder, because the alternative was worse than an unvalidated key: `explorer` and every other built-in has real options upstream, and editing "only the keys already in the config" meant a freshly configured plugin offered nothing at all to set. A typed value (`true`/`false`, a number, `[…]`/`{…}` as JSON) is parsed rather than stored as the string it was typed as, and each existing key gets a delete button - a key you can add and never remove is a typo you keep forever.

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
- **Der Drag trägt `CSS.Translate`, nicht `CSS.Transform`.** `rectSortingStrategy` tauscht
  *Rechtecke* und paßt jede Karte per `scaleY` an das an, in das sie rückt. Solange die Zeilen
  gleich hoch waren, war der Faktor 1 — seit `items-start` ist er es nicht mehr, und der Kommentar,
  der die gleichen Höhen mit „ruhigere Ablageziele“ aufgab, hatte genau diesen Preis nie gemessen.
  An der gebauten App bei 1728×1000, zwei Spalten, jeder Drag mit Escape abgebrochen: mit allen
  Karten zu skalierten die Nachbarn auf 0,86 und 0,81, mit einer aufgeklappten Karte wurde eine
  77-px-Karte auf 733 px gestreckt (9,58) und die offene auf 0,15 gestaucht, Text und alles.
  `CSS.Translate` läßt die Skalierung weg — dnd-kits eigene Antwort für Listen mit ungleich großen
  Elementen; die Nachbarn schieben sich, was die Geste ohnehin zeigt. Nachgemessen: die Transforms
  während des Drags sind reine `translate3d(…)`.
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
  hier hätte einen zweiten Schreiber auf `quartz.config.yaml` neben dem Speichern-Button derselben
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

**Die Bau-Tür als Schreiber der Config (zweiundvierzigstes Review, Befund 6).** Seit `c448709` läuft
dieselbe Reparatur, nach Muster statt nach Präfix (`repointAuthoredFrames`), beim Eintragen eines
Ordners und vor jedem Bau — damit schreibt die Bau-Tür die Config, und zwei Fragen kamen dazu. Eine
Seite, die die Config beim Mount gelesen hat (Layout-Editor, Plugin-Reiter), schrieb beim nächsten
Speichern die Pfade des Originals zurück; gemessen an der gebauten App mit einer `cp -Rc`-Kopie von
gui-test über den IPC-Weg (Config von außen auf die Pfade des Originals zurückgelegt, `config.get`,
Reparatur, `config.save` des Gelesenen): vorher danach 5 fremde und 0 eigene Frame-Pfade, nachher 0
und 5. `writeConfig` nimmt dafür dieselbe Regel (`framePaths.ownFramePath`) auf jede Quelle, die ein
Schreiber übergibt. Und die Reparatur liest und schreibt in einem Zug, also konnte ein Speichern
dazwischen verloren gehen; sie läuft jetzt unter einem Schloss für die Config
(`configService.whileHoldingConfig`, gebaut wie `whileHoldingStyles`), an dem `writeConfig` wartet.
Dieses Fenster ist nicht getroffen worden: 40 Läufe mit Reparatur und Speichern nebeneinander, 0 bis
7 ms versetzt, verloren vorher wie nachher keinen Titel — das Schloss ist gelesen, nicht gemessen.
Nicht darunter: die Schreibvorgänge der CLI (`quartz plugin add` u. a.) im Kindprozess. Die Grenze
der Regel steht an `ownFramePath`: Ein Projekt, das den Frame eines anderen absichtlich nennt und
selbst einen Frame derselben ID hat, wird auf den eigenen gelenkt; `frame-<name>` kann sich zwischen
Projekten wiederholen. Ein echter Bau der Kopie mit den Pfaden des Originals in der Config: 8,8 s,
`success: true`, danach Config und alle fünf Symlinks auf der Kopie.

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


**Der Ausschluss im Reiter „Seitentypen“ hieß nicht so, wie Quartz ihn nennt (2026-09-07).** Ein
Schalter, den der Reiter als gesetzt zeigte, wirkte für jedes `@quartz-community/*`-Plugin nicht.
Quartz vergleicht `layout.byPageType.<typ>.exclude` gegen `extractPluginName(source)`
(`config-loader.ts`), und das kennt vier Formen — Objekt, lokaler Pfad, `github:`, `git+`/`https://`.
Alles andere kommt unverändert zurück, und „alles andere“ ist jede npm-Quelle mit Scope. Die App
schrieb `deriveName(source)`, also den Kurznamen `page-title`, so wie Quartz' eigene Dokumentation es
zeigt (`docs/layout.md`: `exclude: [reader-mode]`). Der Fehler liegt bei Quartz; was die App tun
kann, ist die Schreibweise zu schreiben, die wirkt.

Gemessen an einer Kopie des Beispielprojekts, Seitentyp `content`, 201 Seiten:

| `exclude` | wirkt | Ergebnis |
| --- | --- | --- |
| `quartz-layout-box` (`github:`-Quelle) | ja | 201 von 201 ohne Layout-Box |
| `page-title` (`@quartz-community/page-title`) | **nein** | 201 von 201 mit Seitentitel |
| `@quartz-community/page-title` | ja | 201 von 201 ohne Seitentitel |

Der Name, den Quartz vergleicht, steht jetzt in `shared/quartzPluginName.ts` und wird an zwei
Stellen gebraucht: der Reiter schreibt und **liest** ihn, und `groupLayoutCandidates` filtert damit.
Die zweite ist die stillere: Die Kandidatenrechnung baute aus einem Ausschluss, der nichts tut, eine
Ordnung, die Quartz nie erzeugt (gemessen: `content → header: [toolbar]`, während Quartz zwei Flexes
rendert). Eine solche Phantom-Kandidatin trifft womöglich die Flex-Zahl und nicht die Reihenfolge,
und das ist genau die Mehrdeutigkeit, die ein Frame nicht auflösen kann — ausgelöst von einer
Einstellung, die in Wirklichkeit gar nichts tat. Mit dem richtigen Namen fällt sie mit der globalen
Kandidatin zusammen, und es bleibt eine.

**Gelesen wird mit Quartz' Namen, und das ist die Entscheidung dahinter.** Ein Eintrag in der alten
Schreibweise schließt nichts aus, also zeigt der Schalter ihn als *sichtbar* — vorher stand er auf
„ausgeblendet“, während die Seite das Gegenteil zeigte. Vorher/nachher an der gebauten App gegen
dieselbe Config (`exclude: [quartz-layout-box, page-title]`), Wegwerf-Profil, Kopie des Projekts:

| | Schalter `page-title` | nach dem Umlegen und Speichern |
| --- | --- | --- |
| vorher | ausgeblendet | `exclude: [quartz-layout-box]` — der Titel stand vorher wie nachher auf jeder Seite |
| jetzt | sichtbar | `exclude: [quartz-layout-box, @quartz-community/page-title]` — der Titel verschwindet |

Die tote Schreibweise wird beim nächsten Schreiben dieses Seitentyps entfernt, **nicht** umgeschrieben:
Umschreiben würde eine Komponente auf der gebauten Seite verschwinden lassen, weil die App ein Update
bekommen hat, und danach hat niemand gefragt. Entfernen nimmt nur eine wirkungslose Zeichenkette aus
der Datei, und die Schalter sagen dann, was die Seite zeigt.

**„Beim nächsten Schreiben“ hat drei Türen, und der Filter stand hinter einer (2026-09-08).** Er saß
in `toggleExclude`; wer stattdessen eine Position leerte oder das Template wechselte, ging durch
dasselbe `update` und schrieb die toten Einträge mit in die Datei. Der Filter sitzt jetzt in
`update`, also an der einen Stelle, an der aus dem Entwurf eine Änderung wird. Gemessen an der
gebauten App gegen `content: { template: editorial, exclude: [recent-notes] }`, je einmal pro Tür,
je einmal vorher und nachher — die Datei nach „Speichern“:

| Tür | vorher | jetzt |
| --- | --- | --- |
| Fußzeile leeren | `exclude: [recent-notes]` bleibt, dazu `positions: { footer: [] }` | nur `positions: { footer: [] }` |
| Template auf `minimal` | `template: minimal`, `exclude: [recent-notes]` | nur `template: minimal` |
| Ausschluss umlegen | `exclude: ["@quartz-community/backlinks"]` | gleich |

Ist danach nichts mehr in der Liste, verschwindet der Schlüssel, statt als `exclude: []` liegen zu
bleiben — dieselbe Spurlosigkeit, für die `hasPageTypeOverride` existiert.

**Und der Reiter sagt es jetzt.** „Nie ausgeschlossen“ und „ausgeschlossen unter einem Namen, der
nichts tut“ rendern denselben Schalter; ohne einen Satz dazu findet der Nutzer seinen Eintrag beim
nächsten Klick weg, ohne dass jemand ihn gewarnt hätte. Über der Schalterliste steht deshalb, was in
der Datei steht und dass es verschwindet, sobald an diesem Seitentyp etwas umgelegt und
gespeichert wird (`excludeDeadHint`, de/en, mit Plural) — die Tür, an der der Filter sitzt, und
nicht die daneben. Der Satz hieß bis zum neunten Review „beim nächsten Speichern dieses
Seitentyps“, und das ist eine andere Tür: `save` in `index.tsx` schreibt die Config, wie sie ist.
Gemessen an der gebauten App (`gui-test`, Seitentyp `tag`, `exclude: [reader-mode]` neben
`@quartz-community/reader-mode`): Reiter offen, „Speichern“ geklickt — die Datei ist neu
geschrieben, ihr Inhalt Byte für Byte derselbe, der tote Ausschluss steht weiter darin. Erst nach
einem Umlegen an diesem Seitentyp verschwindet er, und dann ist er auch das Einzige, was der Diff
zeigt.

Die Nachbildung selbst hat einen eigenen Wächter, `npm run check:plugin-names`: 18 Quellen gegen eine
Tabelle, und mit einem Projektpfad zusätzlich gegen Quartz' **eigene** Funktion, aus
`config-loader.ts` und `gitLoader.ts` herausgeschnitten und ausgeführt. Diese Gegenprobe hat sofort
etwas gefunden, das beim Lesen richtig aussah: `path.basename` trennt am Backslash nur auf win32, ein
Windows-Pfad kommt auf diesem Rechner also ungeteilt zurück. Wer eine fremde Funktion nachbaut, prüft
sie gegen die fremde Funktion, nicht gegen die eigene Vorstellung von ihr.

**The project image can sit in the site header, and the switch for it is a change to the page's draft, not a second writer (2026-09-13).** Asked for by the maintainer: the project image, which so far only became the favicon, also as a header image, with a second picture for dark mode. quartz-layout-box already does everything the site side needs — `html` instances with `{{root}}` and `{{siteTitle}}`, and a light/dark pair through `.img-light`/`.img-dark`, which the plugin styles itself (`display` on both, keyed to `saved-theme`). So the app writes one instance and recognises it again by its class (`shared/projectImageBox.ts`), and stores the optional dark picture as `quartz/static/icon-dark.png` next to `icon.png` (the favicon emitter reads only the latter). Two constraints decided the shape. The card sits on the Konfiguration tab whose Save button owns `quartz.config.yaml`, and the card's own comment already refused a second writer for the favicon checkbox; so the switch edits the draft (`onPluginsChange`) and is saved with the page. The exception is installing the plugin, which only the CLI can do and which writes the config itself: the page saves pending edits first, runs `plugins.add`, reads the config anew, and turns the entry the CLI just wrote (default options, a `file` that does not exist, left sidebar) into the header instance instead of leaving a second, empty box. The image heights sit inline on the `<img>`s, but `display` deliberately does not — inline it would beat the plugin's switch; and the HTML names `icon-dark.png` only while that file exists, so removing the dark picture rewrites the instance rather than leaving a broken image in dark mode. Measured before building the app part, on a copy of a fresh Quartz 5 project with the plugin added via `quartz plugin add`: the instance renders in the header, both images load from `{{root}}/static/…`, light shows the light one at 40×40 with the dark one `display: none`, and `saved-theme="dark"` swaps them. Then in the built app with a throwaway profile (native confirmation mirrored in the main process): on the fresh copy the switch asked once, installed in 3 s, left exactly one layout-box entry — the converted one — and the saved file built into a header with both images; removing the dark picture and saving left no `icon-dark.png` in the file or the config; switching off and saving removed the instance and kept the plugin in `quartz.lock.json`; on a copy of `gui-test`, which has seven layout-box instances, the switch asked nothing and appended an eighth with a single image.

**The warning about removing the dark picture reads the saved config, not the draft (2026-09-13, reviews 2026-09-16 and 2026-09-17).** Removing the dark picture deletes `icon-dark.png` at once, while the header instance that names it is a draft change that waits for Save — so in between, the built site shows a broken image in dark mode. The twelfth review asked for that gap to be said; the first hint appeared when the *draft* had the header switched on (`findProjectImageEntry(plugins) >= 0`). The switch sits directly above the hint and changes only the draft, so the two diverged: saved on and switched off in the draft gave no warning where the gap exists, saved off and switched on warned about nothing. `ConfigEditor` now hands `ProjectImage` the saved plugin list (parsed from `savedSnapshot` once per change), and the warning shows when the saved header instance is enabled and its HTML names `icon-dark.png`. Measured in the built app with a throwaway profile on a `cp -Rc` copy of `gui-test` (both pictures set through `projectIcon.set`/`setDark`, the instance written with `config.save`, the switch clicked): saved on/draft on warned before and after; saved on/draft off was silent before, warns now; saved off/draft off silent in both; saved off/draft on warned before, is silent now.

**Eine leere `quartz.config.yaml` liest sich als leer, eine Liste gar nicht (2026-09-17, zwanzigstes Review).** Eine leere Datei ist ein gültiges YAML-Dokument ohne Inhalt, und `parseDocument(raw).toJS()` antwortet darauf `null` — jeder Zugriff darauf wurde zu einem `TypeError: Cannot read properties of null (reading 'configuration')`. Gefunden hat es die Nebenbei-Liste des zwanzigsten Reviews an einem Duplikat: `repointProjectPaths` starb daran, roh. Gemessen an einem esbuild-Bündel von `configService` mit vier Dateien: leer wirft vorher, wird nachher wie ein Dokument ohne diese Schlüssel gelesen (Gegenprobe: lesen, `pageTitle` setzen, schreiben → wieder eine gültige Datei); `nur-ein-string` und `- a` wurden vorher **still** als leere Konfiguration gelesen — die Seite hätte leer ausgesehen und das nächste Speichern darüber geschrieben —, nachher nennt ein Satz die Datei (`configNotAMapping`); eine normale Datei antwortet unverändert. Zwei Arten, unlesbar zu sein, zwei Antworten.

**Nachtrag (2026-09-17, einundzwanzigstes Review): es sind drei, und der Satz daneben trug nicht.** `parseDocument()` wirft bei einem Syntaxfehler nicht — es sammelt `doc.errors` und `toJS()` liefert, was übrig ist. Das ist die Art, auf die eine Konfiguration wirklich kaputtgeht (der halb fertige Handedit, von dem zwei `catch`-Kommentare im Baum ausgehen), und sie kam durch beide Wächter hindurch. Gemessen am Bündel, elf Dateien: `pageTitle: "abc` ohne schließendes Zeichen wurde zu `pageTitle = "abc baseUrl: example.com plugins: - source: github:x/y enabled: true"` mit leerer Plugin-Liste; ein Tab als Einrückung zu `configuration = {}`; zwei Dokumente in einer Datei zu „alles leer“. An der gebauten App stand der erste Fall als Seitentitel auf der Konfigurationsseite, ohne einen Toast auf irgendeiner der achtzehn Routen. Dazu ein vierter Weg, den dieselbe Messung fand: `plugins: hallo` endete als roher `TypeError: (json.plugins ?? []).map is not a function`. Jetzt antworten alle vier mit einem Satz — `configNotParseable` trägt yamls eigene Meldung mit Zeile und Spalte, `configPluginsNotAList` nennt den Schlüssel —, und die Gegenprobe (leer, nur ein Kommentar, eine heile Datei) antwortet unverändert.

**Und die Begründung von 2026-09-17 stimmt nicht.** „Sonst zeigt die Seite eine leere Konfiguration und das nächste Speichern schreibt darüber“ stand an vier Stellen; gemessen mit `writeConfig` auf genau diese Dateien schreibt es *nicht* darüber, es wirft — „Expected a valid index, not configuration“ für die Liste, „Expected a YAML collection as document contents“ für den String, „Document with errors cannot be stringified“ für den Syntaxfehler, „Expected YAML collection at configuration“ für den Tab — und jede Datei bleibt byte-gleich. Der Fix bleibt richtig, die Begründung ist jetzt die gemessene: eine leere Seite ohne ein Wort dazu.

**Und der Weg, auf dem der Befund gefunden wurde, hatte einen eigenen.** `repointProjectPaths` liest die Konfiguration *nach* dem Kopieren und *vor* `git remote remove origin`, also warf `duplicateProject` mitten in der Kopie, statt `{ success: false }` zu antworten. Gemessen am Bündel, drei Quellen: mit einer Liste als Config und mit einem Syntaxfehler wirft es vorher, das Ziel trägt die kopierten Dateien und `origin` zeigt auf das Remote des Originals — genau das, was der Kommentar am Kopf von `duplicateService.ts` ausschließt („a later Git-Sync push must never land in the original's remote“) —, und der zweite Versuch antwortet „… enthält bereits Dateien“. Nachher wird die Quelle geprüft, bevor kopiert wird: `success: false`, das Zielverzeichnis entsteht gar nicht, die heile Quelle antwortet unverändert. Der Satz dazu ist ein eigener (`duplicateSourceConfigUnreadable`), weil die unlesbare Datei hier dem **Original** gehört — `configNotAMapping` und `configNotParseable` stehen sonst immer über dem Projekt, das gerade offen ist; der Grund darin ist der von `readConfig`, Wiederherstellungspunkt eingeschlossen, und den hat die Quelle.

**Nachtrag (2026-09-17): „readConfig wirft vorher, also ist der Fall nicht erreichbar“ trägt nicht.** `config.save` schreibt, was der Renderer geladen hat, und zwischen dem Laden und dem Klick kann die Datei auf der Platte etwas anderes geworden sein — ein Handedit in einem zweiten Editor ist der gewöhnliche Weg dorthin. `writeConfig` las sie mit `parseDocument` ohne Fehlerprüfung und starb dann in `doc.toString()` an yamls eigenem „Document with errors cannot be stringified“. Gemessen am Bündel, fünf kaputte Dateien: vorher vier verschiedene rohe yaml-Meldungen, nachher fünfmal der Satz, den auch das Lesen gibt. Verloren ging dabei nie etwas — die Datei blieb in allen zehn Fällen byte-gleich —, aber es sagte auch nichts, was zu tun ist. Gegenprobe: eine leere Datei, eine mit nur einem Kommentar, eine heile und eine, die es nicht gibt, werden weiter geschrieben; die leere ist der Grund für die Bedingung `contents !== null`, denn `setIn` macht daraus ein Mapping, und genau das braucht ein Projekt mit leerer Config.

## Das Options-Schema hat drei Quellen (2026-10-07, 1.1 P1)

Der Leser von 1.0 (Absatz oben) suchte nur unter `.quartz/plugins/<name>/dist` und nahm das erste
Interface, das auf `Options` endet. Gemessen mit `check:option-schema` an gui-test hatte das vier
Folgen, je ein Commit:

- **Jedes npm-Plugin war ohne Schema** (explorer, graph, search …), obwohl 33 von ihnen
  `quartz.optionSchema` mitbringen. Jetzt wird das Paket gefunden wie in Quartz'
  `readManifestFromPackageJson` (npm unter `node_modules`, git unter
  `.quartz/plugins/<quartzPluginName(source)>`), und gelesen wird `quartz.configSchema` →
  `quartz.optionSchema` → `.d.ts` → nur `quartz.defaultOptions`; die Vorgaben liegen über der
  Quelle, die gewinnt. gui-test: 280 Optionen, 268 als Feld, 10 als Text, 2 unsichtbar (vorher
  131/6/143); explorer hat vier Felder statt keines (`74f9db5`).
- **Bei quartz-multilanguage war es das falsche Interface**: `SeoOptions` liegt in der echten, also
  standen `hreflang`/`ogLocale`/`xDefault` oben und die 15 gesetzten Schlüssel fehlten. Jetzt gewinnt
  das Typargument von `QuartzTransformerPlugin<T>` und Geschwistern (`Partial<T>` ausgepackt), sonst
  das äußerste `…Options`, das nicht `Resolved…` heißt; `seo.hreflang` steht danach unter `seo`
  (`d14ed34`).
- **Der Cache wurde nie geleert**, nach einem Plugin-Update standen bis zum Neustart die alten
  Optionen da. Jetzt je Paketordner unter Größe und mtime von `package.json` und jeder `.d.ts`;
  gemessen mit dem gebündelten Dienst an einer Kopie von quartz-layout-box: nach einer neuen Option
  antwortete der alte Dienst weiter mit zehn Feldern, der neue mit elf (`1627e71`).
- **Ein gesetzter Schlüssel ohne Schema war unsichtbar** (`parseArrows` von
  obsidian-flavored-markdown). Jetzt wird er je Eintrag ein Feld, ein Wert, den das Schema nicht
  annimmt, macht das Feld zur `union`; 0 unsichtbar an gui-test (277), navigations-testprojekt (733)
  und Example (320) (`8c36f13`).

Es gibt einen Normalisierer, für JSON Schema, in `shared/pluginOptionSchema.ts` (rein, ohne Node);
die flache Form und das Ergebnis des `.d.ts`-Lesers werden zu ihm gebracht, und
`check:option-schema` lädt dieselbe Datei. Kein Plugin-Code läuft: `package.json` wird unter einer
Decke von 1 MiB als JSON gelesen, die `.d.ts` mit dem TypeScript der App als Syntaxbaum
(höchstens 200 Dateien, 4 MiB), ohne Typprüfer. Ein geteiltes Feld über `$ref` erbt Beschreibung,
Übersetzung und Widget seines Ziels, Schlüsselwörter neben dem `$ref` gewinnen (gefunden beim
Schreiben des `configSchema` der Layout-Box, `f31db43`). Der alte Kanal und `attachDefaults`, das
ein deutsches „Standard: …“ in jede Beschreibung schrieb, sind mit P3 weg (`a24bbf4`).

**Die `x-quartz-*`-Schlüsselwörter sind ein Format**, das nur QuartzControl liest und das in drei
veröffentlichten Plugins steht (seit layout-box 0.4.0, multilanguage 0.2.0, navigations 0.4.0). Die Liste steht
zweimal, gleichlautend: im Kopfkommentar des Lesers und für Plugin-Autoren in
[`docs/plugin-config-schema.md`](../plugin-config-schema.md). Was der Leser nicht kennt, wird eine
Notiz (Absatz zum vierzigsten Review weiter unten), nie ein stilles Textfeld; ein Schlüsselwort, das
wegfällt oder seine Bedeutung ändert, bricht ein veröffentlichtes Plugin.

## Snippets und Bilder der Layout-Box (2026-10-07, 1.1 P6)

Das Feld `file` der Layout-Box ist eine Auswahl aus den Dateien in `dir`, mit „Neu“, „Importieren…“
und „Bearbeiten“; `html` und der Snippet-Editor tragen „Bild einfügen…“. Gewählt wird das
Bedienelement am Schema (`x-quartz-widget: snippetFile`, `html`, `markdown`), nicht am Namen des
Plugins. Alles, was eine Datei liest oder schreibt, geht durch `snippetService.ts`, weil der
Renderer keine Vertrauensgrenze ist:

- `dir` wird gegen das Projekt aufgelöst. Hinaus (`../`, absolut) und in einen Ordner eines Werkzeugs
  (`.git`, `node_modules`, `.quartz`, `.quartz-gui`, der Ausgabeordner) gibt es keine Liste; das Feld
  bleibt ein Textfeld mit einem Satz darunter. Ein Name ist ein Segment ohne Punkt am Anfang, mit
  einer Endung aus der Liste (`.html/.htm/.md` bzw. sieben Bildformate), Decken 2 MB und 20 MB.
- **Lesen geht durch eine Verknüpfung, schreiben nicht.** Die Layout-Box liest einen verlinkten
  Snippet-Ordner selbst (`resolveSnippetPath` prüft nur, dass die Datei im aufgelösten Ordner
  bleibt), also listet die App ihn auch, mit derselben Prüfung beim Lesen. Geschrieben wird über
  `writableTarget()` wie beim Vorlagen-Import. Gemessen: eine Datei im echten Ordner, die hinaus
  zeigt, steht in der Liste, lässt sich aber weder lesen noch überschreiben, und ihr Ziel blieb
  byte-gleich.
- Eine vorhandene Datei wird nicht still überschrieben: Der Kanal antwortet `exists`, die Seite
  fragt mit drei Antworten (Abbrechen, Vorhandene verwenden, Ersetzen).
- Ein Bild landet in `quartz/static/images` und wird als `{{root}}/static/images/<name>` eingefügt,
  in Markdown als `![](<…>)` — Quartz' Static-Emitter veröffentlicht den Ordner als `static/`, und
  die Layout-Box ersetzt `{{root}}` auch in der prozentkodierten Form, die der Markdown-Renderer in
  eine URL schreibt. Gemessen an einem gebauten Klon von gui-test, ausgeliefert unter `/sub/`: beide
  Bilder (eines mit Leerzeichen im Namen) laden auf der Startseite und zwei Ebenen tief. Ist
  `placeholders` aus, sagt der Button, dass das Bild nicht laden wird. Der Vorlagenteil `static`
  nimmt den Ordner schon mit.
- **Welcher Editor offen ist, gehört dem Feld, nicht dem Ordner.** Der erste Bau hielt es als
  Sticky-State je Ordner — der Editor stand damit in jeder Box mit demselben `dir` offen, auch im
  `byLang`-Eintrag, und „Bild einfügen…“ der zweiten Box schrieb in die Kopie der ersten. Nur der
  Entwurf bleibt sticky, je Datei, damit ein Routenwechsel ihn nicht verliert.
- Der Editor speichert mit „Snippet speichern“, nicht über die Seite: Die Plugins-Seite schreibt
  jede Option sofort, das Snippet ist eine eigene Datei, und ein Button, der einen Teil schreibt,
  trägt seine Reichweite im Namen.

Native Dialoge (Dateiwahl, Rückfrage) sind in der Messung im Hauptprozess gespiegelt, also nicht am
OS gemessen.

**Was der Schema-Leser nicht versteht, sagt das Formular (2026-10-08, vierzigstes Review, Befund 7).**
Ein unbekanntes `x-quartz-*`-Schlüsselwort ging still durch, ein unbekanntes Widget wurde ein
Textfeld, und die Notizen, die der Leser schon führte, zeigte nur `check:option-schema`. Jetzt wird
beides eine Notiz, wie ein unlesbarer Teil, und das Formular nennt die Zahl über den Feldern, mit der
Liste zum Aufklappen — im Wortlaut des Lesers, weil sie den Autor des Plugins anspricht. Das Format
selbst steht für Plugin-Autoren in [`docs/plugin-config-schema.md`](../plugin-config-schema.md).
Gemessen mit einem Probe-Paket (`notes-probe`, ein unbekanntes Schlüsselwort, ein unbekanntes
Widget, ein unbekanntes `x-quartz-keys`) in einem Klon von gui-test: `check:option-schema` vorher 0
Notizen, nachher 3; die gebaute App zeigt auf der Plugins-Seite „3 Angaben im Schema dieses Plugins
versteht die App nicht“ mit den drei Zeilen, ohne waagerechten Bildlauf bei 1280 px. Die Zahl
„267 als Feld“ an gui-test deckt die `x-quartz-*`-Erweiterungen nicht: Dort sind die drei eigenen
Plugins in Fassungen vor `configSchema` installiert, gelesen wird ihr `.d.ts`.

**Eine SVG als Code: Erlaubnisliste statt Sperrliste (2026-10-09, zweiundvierzigstes Review,
Befund 1).** `06c05e9` parste die Datei als XML, nahm `script`, `foreignObject`, `on*` und
`javascript:`/`data:`-Verweise heraus und gab den Rest mit `XMLSerializer` aus. Die Website liest
das als HTML (quartz-layout-box über `dangerouslySetInnerHTML`, ein Markdown-Schnipsel über
rehype-raw). Gemessen mit `npm run check:inline-svg` (das Ergebnis in Chrome als HTML in einer
`.layout-box-content`, dazu ein Klick auf jedes Element und die Animationen auf `t = 1`), an der
alten Fassung 14 von 22 bösen Eingaben durch: ohne Klick lief Skript aus einer Processing
Instruction `<?x ><img onerror>?>` und — vom Review nicht genannt — aus einem Kommentar `<!--><img
onerror>-->`, den HTML nach `<!-->` beendet; beim Klick über einen Tab oder Zeilenumbruch im Schema
und über `<set>`/`<animate>` auf `href`; ein XHTML-`<meta refresh>`, ein `<iframe>`, ein `<style>`
für die ganze Seite, ein `<img>` im SVG-Namensraum (HTML lässt es ausbrechen), `<use>` und `url()`
auf fremde Adressen blieben stehen, meist mit „0 entfernt“. Die neue Fassung schreibt die Ausgabe
selbst: eine Erlaubnisliste von SVG-Elementen ohne die Namen, mit denen HTML aus fremdem Inhalt
ausbricht, Attribute ohne Namensraum (`xlink:href` wird `href`), keine `on*`, keine Animation auf
`href` oder `on*`, kein Wert mit `url()` außer auf `#…`, `href` nur auf `#…` (ein Link auch auf
https/mailto, ein Bild auch auf https und Raster-`data:`), geprüft nach dem Entfernen aller Zeichen
bis U+0020; Text und CDATA maskiert, Kommentare und Processing Instructions weg. Nachher 0 von 22;
die neun Prüfungen eines gewöhnlichen Icons (Klasse, `viewBox`, `<use href="#…">`, Verläufe,
`url(#…)`, Text, Animation auf `opacity`, https-Link, keine Leerzeile) wie vorher. Was Editoren
hinterlassen (Inkscape-, Sodipodi-, RDF-Namensräume, `<metadata>`), fällt ohne Zählung weg, damit
die Meldung „N Stellen entfernt“ nicht bei jeder Inkscape-Datei erscheint. Die HTML Sanitizer API
von Chromium, die das Review nannte, wäre die andere Richtung; sie streicht in der Vorgabe `class`,
`id` und `<use>`, und die eigene Konfiguration dafür hätte wieder vermessen werden müssen — die
Erlaubnisliste ist kürzer und mit demselben Skript geprüft. **Nicht gemessen:** ein echter
`quartz build` mit einem solchen Schnipsel; geprüft ist das Ergebnis im HTML-Parser von Chrome, den
parse5 (rehype-raw) nach derselben Spezifikation nachbaut.

**Ein Markdown-Schnipsel liest den Text im SVG als Markdown (2026-10-10, dreiundvierzigstes
Review, Befund 1).** Genau dort lag es, wo der Absatz darüber „nicht gemessen“ sagt. Die Kette von
quartz-layout-box ist `remark-parse` → `remark-gfm` → `remark-rehype` (`allowDangerousHtml`) →
`rehype-raw` → `rehype-stringify`, ohne Bereiniger. Steht das SVG in einer Zeile mit Text oder
direkt unter einer Textzeile — wohin „Bild einfügen…“ am Cursor einfügt —, ist es für CommonMark
kein HTML-Block (Typ 7 verlangt das Tag allein auf der Zeile und unterbricht keinen Absatz), und
der Text zwischen den Tags ist Markdown: `<text>[KLICK](javascript:…)</text>` wurde ein `<a
href="javascript:…">` im SVG, ein Klick führte das Skript aus. Ebenso wurden `![x](…)` ein `<img>`
außerhalb des SVG und ein Zeilenanfang `# …`/`- …` in einem Text *oder einem Attributwert* eine
Überschrift oder Liste, die das Tag mitten durchschnitt. Jetzt schreibt der Bereiniger im Text jedes
Zeichen, aus dem Markdown Struktur baut, als numerische Referenz (`[ ] ( ) ! * _ \` ~ \ | : # + = .
@ -` und `& < >`), in Attributwerten zusätzlich Zeilenumbrüche (`&#10;`), damit ein Tag auf seiner
Zeile bleibt. remark liest eine Referenz als das Zeichen und baut nichts daraus; in einem HTML-Block
und in der HTML-Box dekodiert parse5 sie genauso. Was das nicht verhindert: remark-gfm findet
Adressen und E-Mail-Adressen im schon dekodierten Text und macht daraus `https:`- bzw.
`mailto:`-Links — beides Schemata, die der Bereiniger für `<a>` selbst erlaubt. Ein Umbruch nach der
Wurzel als Lösung trägt nicht, sobald unter einer Textzeile eingefügt wird. Gemessen mit
`check:inline-svg`, das jedes Ergebnis seit diesem Durchgang zusätzlich durch dieselbe Kette
schickt (als devDependencies in den Bereichen des Plugins) und in drei Lagen rendert — eigener
Block, in einer Zeile, unter einer Textzeile: an der alten Fassung fielen 5 der 7 neuen Eingaben
durch, an der neuen keine, die 22 alten und die neun Icon-Prüfungen wie vorher. Und an einem echten
`quartz build` einer Kopie von gui-test, das Ergebnis unter „Zeile davor“ in `sidebar-note.md`:
im gebauten `index.html` kein `href="javascript`, der Text steht als Text im `<text>`.

**Namen, wie HTML sie liest, Werte, wie CSS sie liest (2026-10-10, dreiundvierzigstes Review,
Befund 3).** Der XML-Parser unterscheidet `HREF` und `href`, HTML schreibt Attributnamen klein und
gibt einer festen Liste von SVG-Namen ihre Großbuchstaben zurück (`attributename` →
`attributeName`). Ein `HREF` war für die Prüfung also kein `href`, ein `ATTRIBUTENAME` für
`getAttribute('attributeName')` nicht da, und ausgegeben wurde der Name, wie er kam — auf der Seite
ein `href`. Ebenso fragte `leavesFile` nach `url(` wörtlich, CSS liest aber `u\72 l(` als `url(`
und lädt aus `image-set("…")` ohne `url(`. Gemessen mit `check:inline-svg`, dem dafür acht
Eingaben aus der Tabelle des Reviews und eine Frage nach Anfragen an fremde Hosts zugekommen sind
(dazu, ob ein `<a>` nach dem Start der Animationen woandershin zeigt als in seinem Attribut): an der
alten Fassung alle acht durch, jede mit „0 entfernt“ — `<use HREF>` und `<feImage HREF>` luden von
example.com, `<set ATTRIBUTENAME="href">` lenkte einen Link auf `#` nach außen, `<use HREF="data:…">`
blieb stehen, die drei CSS-Werte luden. An der neuen keine. Jetzt werden die Attribute zuerst so
gelesen, wie die Website sie sieht — Name klein bzw. nach der Tabelle des HTML-Parsers, von zwei
gleichen Namen der erste (den behält HTML), ein eigenes `href` vor `xlink:href` —, dann geprüft und
unter diesem Namen geschrieben; ein Wert wird vor der Prüfung CSS-entmaskiert, und `image-set(`,
`image(`, `cross-fade(` und `src(` gelten wie ein fremdes `url(`. Dazu stimmt die Erlaubnis jetzt
mit dem überein, was der Absatz oben schon immer sagte: ein Link auf `https:` oder `mailto:`, ein
Bild auf `https:` oder Raster-`data:` — der Code ließ für beide auch `http:` durch. Einmal auch in WebKit
gefahren (das Skript mit `webkit` statt Chrome, Playwrights Build): alle Prüfungen bestanden.
Firefox ist nicht gemessen (er startet auf diesem Mac nicht).

**Ids gehören der Seite, nicht der Datei (2026-10-10, dreiundvierzigstes Review, nebenbei).** Zwei
eingefügte Icons aus Figma nennen ihren Clip-Pfad beide `clip0_1_2`, aus Illustrator ihre Wurzel
beide `Ebene_1`, und `url(#…)` nimmt das erste Element der Seite mit dieser Id — das zweite Icon trug
Verlauf und Clip-Pfad des ersten. Der Bereiniger gibt jetzt jeder Id, die die Datei definiert, ein
Präfix aus Dateiname und einem Hash des Inhalts (`logo-1amte-g`) und zieht jeden Verweis darauf
nach: `href="#…"`, `url(#…)` in jedem Wert (auch in `style`), `begin`/`end` einer Animation
(`id.click`) und die ARIA-Attribute, die Ids auflisten. Ein Verweis auf eine Id, die die Datei nicht
definiert, bleibt, wie er ist. Gemessen mit `check:inline-svg`: zwei Dateien mit denselben fünf Ids
auf einer Seite — vorher 5 doppelte Ids und 6 Verweise ins andere SVG, nachher 0 und 0. Die
Prüfungen des gewöhnlichen Icons fragen seither, ob ein Verweis im eigenen SVG auf das richtige
Element zeigt, statt den Namen wörtlich zu vergleichen. Der Preis: Wer eine Id der Datei in seinem
CSS ansprach, muss jetzt die Klasse der Wurzel nehmen (`svg-<name>`), die genau dafür da ist.

## Was nicht wirkt, steht als Wort da (2026-10-18, Alpha-Szene 3)

Eine Option, die bei der gewählten Variante nichts tut, war „grau dort, wo sie steht“: Der
Schlüssel ging von slate-600 (rgb(71, 85, 105)) auf slate-500 (rgb(100, 116, 139)), im Dunkelmodus
entsprechend, bei 11 px Monospace; Control und Beschreibung bleiben nach der Regel unverändert.
Vom Nutzer mit VoiceOver gefahren: Der Grund im Namen kam an, das Grau nicht, weder im Reiter
„Navigationen“ noch unter „Alle Optionen“. Gemessen an der gebauten App (Wegwerf-Profil, Kopie von
gui-test, Navigation „Test #2“, Baum, fünf Optionen anderer Varianten gesetzt): vorher 0
Plaketten, nachher 5 im Reiter „Navigationen“ und 13 unter „Alle Optionen“, gleich der Zahl der
kursiven Gründe. Die Namen laut CDP `Accessibility.getFullAXTree` sind unverändert („align
geändert Wirkt nur bei den Varianten …“), die Plakette steht nicht darin. Der Preis: eine
Plakette mehr in jeder grauen Zeile, unter „Alle Optionen“ einer Baum-Navigation dreizehn.

## Der Reiter Formulare (2026-10-19, 1.2)

quartz-forms ist ein Eintrag für die ganze Website, deshalb folgt der Reiter Mehrsprachigkeit:
links die Formulare (`options.forms`) und die Einstellungen für alle (Versand, Schlüssel,
Spamschutz, Layout-Formular, Relay, Texte, Technisches), rechts eine Leiste, die sofort schreibt.
Gemessen wurde jede Phase an der gebauten App, gegen gui-test (Config vorher kopiert, danach
`cmp`-gleich) oder gegen eine Wegwerf-Kopie, deren `content/` ein echter Ordner ist - nie im Vault.

**Das Plugin wird gefragt, nicht abgeschrieben.** quartz-forms 0.2.0 bringt `dist/cli.js` mit
(`check`, `key`, `relay`, je mit `--json`); `formsService` ruft es im Kindprozess. Die Prüfung läuft
600 ms nach jedem Schreiben erneut; ihre Meldungen tragen den Pfad der Option
(`forms.<id>.fields[i].pattern: …`), und nur daran hängt der Reiter sie an Formular, Feld oder
Abschnitt (`placeMessage`). Gemessen: ein Formular ohne Relay-Adresse und Empfänger zeigte
„2 Probleme“, nach dem Eintragen des Empfängers von allein „ein Problem“; ein Feld mit `[^]` trug den
Satz des Plugins am Feld. Seit quartz-forms 0.3.0 kommen die Meldungen in der Sprache der App
(`--lang`, Code und Werte je Meldung, `src/messages/` des Plugins); das Build-Log bleibt englisch
(Entscheidung des Nutzers, 2026-10-19).

**Mehrsprachige Texte haben einen eigenen Editor.** Das generische Formular zeigte einen
Vorlagentitel `{ en, de }` als leeres Feld und jedes Label als Union „Text / Liste“. `TextEditor`
(`FormText.tsx`) zeigt ein Feld je Website-Sprache für einen Record, eines für einen String, mit dem
Wort der Vorlage als Platzhalter. Ein Wert, der dem der Vorlage gleicht, wird nicht geschrieben.
Eine Vorlage verlassen schreibt ihre Felder, Titel und Schalter ins Formular - ohne eigene Felder
bräche der Build ab. `FormContext.above` benennt „wie oben“, wo „oben“ die Einstellungen für alle
Formulare sind („wie für alle Formulare“).

**Felder sind eine sortierbare Liste** (dnd-kit wie überall, Pfeilpaar wie in der Plugin-Liste).
Gemessen: Pfeil, Maus-Drag nach oben und Tastatur-Drag (Griff fokussiert, Leertaste, Pfeil hoch,
Leertaste; echte Tastendrücke) schrieben je die erwartete Reihenfolge, die Live-Region sagte
„Nachricht bei Name abgelegt.“

**Fundstellen.** `content.formUsages` liest die Markdown-Dateien, die Quartz baut
(`quartzInputFiles`, das globby des Projekts), und findet ein Formular auf denselben drei Wegen wie
das Plugin (`shared/formUsages.ts`). Gemessen: ein verschachtelter Codeblock, Inline-Code und der
ignorierte Ordner `private/` zählen nicht; eine Seite mit einer unbekannten Kennung erscheint nach
„Neu suchen“. „Zeigen“ lädt die Seite in die Vorschau über Quartz' Slug (`ordner/Umfrage Seite.md`
→ `/ordner/umfrage-seite`), die Markierung trifft `form.quartz-form[data-form="kontakt"]`. Dafür
bekam die Selektor-Grammatik von `sitePreview:highlight` genau ein Attribut: `[data-form="<id>"]`
mit dem Zeichensatz einer Kennung. Die erste Messung endete im Fehler-Toast des Schemas.

**Schlüssel.** Aus einer Datei nach `quartz-forms/keys/<name>.asc` im Projekt (außerhalb von
`content/` und `static/`: der Build liest sie, die Website trägt sie nicht als Datei), oder
eingefügt, dann gespeichert als Block allein, nachdem das Plugin ihn gelesen hat. Eine Datei mit
privatem Block wird abgewiesen, bevor etwas geschrieben ist. Gemessen mit OpenPGP.js 6.3.2: der
angezeigte Fingerabdruck gleich dem berechneten; ein abgelaufener Schlüssel mit dem Satz des
Plugins abgewiesen.

**In der Plugin-Liste** kennt `optionFormExtras.ts` quartz-forms über `formsRoot`: Ein Formular ist
dort ein Eintrag des Records `forms`, und unter einem anonymen steht `pageContext` als „wirkt
nicht“ (`entryReason`), wie im Reiter.

**Breite, Bedingungen und Schritte (quartz-forms 0.4.0).** Das Plugin bekam auf Wunsch des
Nutzers (2026-10-19) Feldbreiten (`width: full | half | third`), Optionen nebeneinander
(`layout: inline`), bedingte Felder (`showIf: { field, equals }`, eine Bedingung je Feld, Ketten
erlaubt) und Seitenumbrüche (`{ type: pageBreak, title?, showIf? }`). Welche Felder zählen, steht
dort einmal als `when`-Liste je Feld; Browser und Relay werten sie in einem Durchgang aus und werden
an einem Katalog gegeneinander gehalten. Gemessen in Chrome an einer mit Quartz gebauten Seite, mit
und ohne JavaScript, bis in die Mail (Commits des Plugins). Im Reiter: „Breite“ als Segmente an
jedem sichtbaren Feld, „Anordnung der Möglichkeiten“ bei Radio und Mehrfachwahl, „Nur zeigen,
wenn …“ mit den Steuerfeldern davor und je Wert einem Schalter, mindestens einer an. Ein
Umbenennen nimmt die Bedingungen mit, die den Namen nennen. Ein Seitenumbruch ist eine gestrichelte
Zeile „Schritt 2 · Titel“ mit der Kennung `page:<n>` für dnd-kit. Was der Bedingungs-Editor
anbietet, ist abgeschrieben (`CONTROLLER_TYPES`, `showIfOf`, `controllerValues`) und wird mit den
Feldtypen von `check:plugin-copies` gegen das Plugin gehalten: 48 Fälle, jeder angebotene Wert
besteht die Prüfung des Plugins, ein anderer nicht. Gegenprobe: `scale` aus `CONTROLLER_TYPES`
gestrichen und eine Skala einen Wert zu weit: drei Abweichungen. Gemessen an der gebauten App
gegen eine Wegwerf-Kopie von gui-test; ein Seitenumbruch wurde nur über die Pfeile verschoben,
nicht per Maus- oder Tastatur-Drag.
