# Layout-Frames und Breakpoints

Aus CLAUDE.md ausgelagert (2026-09-02): die Messungen und Beobachtungen hinter den Regeln, wortgleich. Die Regeln selbst stehen in CLAUDE.md; hier steht, welches Experiment sie erzwungen hat. Neue Einträge kommen mit derselben Form dazu: was gemessen wurde, was daraus folgt.

**A frame's own box is per breakpoint, and every property is written out in every block.** Besides the grid itself, a `GridBreakpointLayout` carries `maxWidth`/`align`/`paddingBlock`/`paddingInline` (`buildFrameBox` in `shared/gridFrameCss.ts`). They are optional in the type but never optional in the output: desktop is the unconditional base and tablet/mobile are `max-width` media overrides of the *same* selector, so a value only emitted where it was set would leak downward — verified in a real build, where the narrower blocks reset it to `none`/`0` and a 1100px/700px viewport measured exactly that. `box-sizing: border-box` is emitted because Quartz sets no global box-sizing here, and without it a 900px cap plus 3rem of padding painted a 996px-wide frame. Both previews (`FrameBuilder`'s drop board, `GlobalBoard`) apply the same `buildFrameBox` output, so the box you drag areas into is the box that gets built.
  - **Three separate things each capped a frame that was supposed to fill the window, and all three were measured in a real build** (Chrome, a 1728px viewport, a frame with no maximum width and `align: center`, which rendered 778px wide and centred). **(1) An auto margin makes a grid item shrink-to-fit rather than stretch**, so `margin-inline: auto` with no cap collapsed the frame to its *max-content* width and `1fr 2fr 2fr` resolved to 149/298/298px. `width: 100%` (part of `FrameBoxStyle`, so both previews get it too) takes that path away; an auto margin then only distributes what a `maxWidth` genuinely leaves over — verified: 1728px uncapped, 900px at x=414 centred, x=828 right-aligned. **(2) Quartz caps every page at `.page { max-width: calc(<desktop> + 300px) }` = 1500px** and its own "full-width" frame does not lift it either, so `buildOuterGridOverride` emits `.page[data-frame="<name>"] { max-width: none }` — that makes the frame's own field the single place a width limit is decided. **(3) An `fr` track is `minmax(auto, 1fr)`**, so at 390px the declared `1fr 2fr 2fr` rendered as 149/71/106px because one area's content would not shrink below 149px — the editor's preview, whose placeholder areas have no such floor, showed proportions the build did not keep. `min-width: 0` (plus `min-height: 0`) on `.qgframe-area` fixes that; overflow is the trade-off and Quartz's own content styles absorb it — with a long unbreakable code line in an area the page still had no horizontal scroll at 390px. After all three: 1:2:2 holds exactly at 1728/1400/1100/700/390px, the frame fills the viewport minus Quartz's own 1rem `#quartz-body` padding below the desktop breakpoint, and nothing overflows. The tablet/mobile media queries were checked against Quartz's own edges and agree with them at exactly 1200px and exactly 800px.
  - **The breakpoint widths are the project's, not Quartz's — but only authored frames follow them.** `.quartz-gui/layout-breakpoints.json` (default 1200/800, exactly Quartz's own `$breakpoints`) is edited on the Layout page's **Global** tab and threaded into `buildFrameCss`, whose media queries were always ours to choose. Sass makes the alternative impossible: `$breakpoints` cannot be reconfigured from `custom.scss`, because `@use … with ()` fails once `base.scss` has loaded the module — the only project-wide route is editing the tracked core file, which this app does not do. So `buildQuartzBreakpointCompat` restates, scoped under `.page[data-frame="<name>"]` (which outranks core's bare `.desktop-only`), the handful of core rules that switch on Quartz's thresholds. That list is exhaustive, from grepping every consumer of `$mobile`/`$tablet`/`$desktop` in a real checkout: `.desktop-only`/`.mobile-only`, `#quartz-body`'s sub-desktop padding, plus `html`'s scroll-padding and one popover rule, which are cosmetic and left alone — and **no TS or JS in Quartz reads a breakpoint at all**, so CSS is the whole surface. Emitted only when the widths differ from Quartz's, so a project that never touches the setting gets byte-identical CSS to before. Verified end to end at 1000/600 in a real build: the frame's own layout, `#quartz-body`'s padding and `.mobile-only` all flip at exactly those widths (1001 vs 1000, 601 vs 600) instead of 1200/800, with no overflow — and switch back after resetting to the defaults. Built-in frames and community themes keep Quartz's numbers, which the editor's hint says.
    - **Core was never the whole surface: `buildPluginBreakpointCompat` restates the community plugins too** (explorer, search, graph 0.1.0, read out of `dist/index.js` in a real install on 2026-09-09). The navigation that switches between a sidebar tree and a drawer is the explorer's, and it hard-codes `max-width: 800px`; search hard-codes a second number, `not (min-width: 1200px)` for its overlay width, which is why there is a tablet block between the two halves. Measured at the edges: 901px shows the tree, 899px the burger. The price is stated in the doc comment — this is somebody else's stylesheet, copied, and a copy has to follow.
    - **A generated stylesheet belongs in the cascade layer of the stylesheet it restates.** Quartz renders `frame.css` as an *unlayered* `<style>` at the top of `<body>` (`renderPage.tsx`), while its own CSS and every plugin's are inside `@layer quartz-base` and the project's `custom.scss` follows unlayered. Unlayered beats layered whatever the specificity, so `.page[data-frame="x"] .explorer` (0,3,0) did not only outrank the plugin it was copied from — it outranked every `.explorer` rule a project can write, at every width, because the desktop half is unconditional. Measured on the example site in Firefox and WebKit, with the compat rules in place and after moving them into the layer: the template's drawer went from `position: absolute`/100vw/opaque/`overflow: hidden` back to `fixed`/335px/88% frosted/`overflow-y: auto` (a tree with three chapters open scrolled 464px under a wheel instead of 0), the folded desktop explorer from a 19px stub back to 44px, and the drawer trigger's padding from the plugin's 5px back to the template's 0. Both compat blocks are therefore emitted inside `@layer quartz-base`; the frame's own grid rules stay unlayered, because those are this app's answer to a question nothing else answers. The layer block appends to the one `index.css` already opened in `<head>`, so no new layer and no new order.
    - **Copying a foreign media block means copying all of it, and the completeness claim is checked rule by rule.** Four were missing, found by reading the source next to the copy: the explorer's `.hide-until-loaded ~ .explorer-content { display: none }` (without it a page in the band showed the drawer over its own content before the first script ran — measured at 850px with JavaScript off, an 850×900 panel; `display: none` after), search's `[data-preview] > .results-container` sizing (measured at 850px: `flex-basis` `min(30%, 450px)` instead of `100%`, no `max-height: 60vh`), search's `p.card-description { display: none }` beside a preview pane — content, not polish — and its `.search-space { width: 90% }` at the tablet number. One declaration in that band cannot be moved from here at all: search hides its preview pane with `display: none !important`, which beats every normal declaration whatever the layer, so a project whose mobile width is *below* 800 keeps a hidden preview pane in the band. Matching it with an `!important` of our own would outrank the project's stylesheet, which is the thing this whole paragraph is about not doing.
    - **`quartzGuiDir(projectPath, x)` creates `x` as a *directory*.** It is not a path joiner: passing a file name through it produced a directory named `layout-breakpoints.json` and every write after it failed with `EISDIR`. A file inside `.quartz-gui` is `join(quartzGuiDir(projectPath), FILE)`, which is what every other service there already does.
    - **Changing the widths rewrites every frame's CSS.** They are baked into each frame's media queries at codegen time, so a frame not rewritten would silently keep the old thresholds with nothing in the UI to show it. No `quartz plugin add` is involved — the frame directories are already symlinked into `.quartz/plugins`.
  - **The dev server cannot pick up an edited frame — a restart is the only way, and the editor says so.** Measured against a real `quartz build --serve`, for two independent reasons. First, the watcher never sees the file: `--serve` implies `--watch`, and chokidar gets a fixed list from one `globby(["**/*.ts", "quartz/cli/*.js", "quartz/static/**/*", "**/*.tsx", "**/*.scss", "package.json", "quartz.config.yaml", "quartz.config.default.yaml"])` call — a frame's generated `dist/frames.js` matches none of them (`*.js` only under `quartz/cli/`), and editing it produced no rebuild at all. Second, and decisive: even a rebuild forced by changing `quartz.config.yaml` ("Detected a source code change, doing a hard rebuild…") still served the *old* CSS, because `quartz/plugins/loader/frameLoader.ts` does a bare `await import(toFileUrl(...))` with no cache-buster and Node caches an ESM module for the process's lifetime. Only `Ctrl-C` + restart showed the change. **A brand-new frame is the exception** and needs no restart — `quartz plugin add` writes quartz.config.yaml, which does trigger a rebuild, and that module was never imported so nothing is cached; verified with a throwaway frame, which appeared immediately and then froze on its next edit like any other. Hence `DevServerRestartHint`, offered after a *frame edit* and after a breakpoint save (which rewrites every frame) but not after creating a frame, and only when a server is actually running. It prompts rather than restarting by itself: a frame is saved many times while being built, and bouncing the server on each intermediate save is worse than the stale preview.
  - **Saving a frame does not close the editor.** A frame is built in many passes across three breakpoints, and being thrown back to the frame list after every save meant clicking back in each time. The success notice is derived from `JSON.stringify(editing) === savedSnapshot` rather than held as a flag, so it clears itself the moment the draft differs again — there is no reset to forget at one of the ~15 places that write into `editing`.

## Der Frame-Builder zieht mit `@dnd-kit` (2026-09-03)

Die letzte Stelle mit nativem HTML5-Drag. Sie ist kein Umsortieren, sondern ein Setzen: ein Bereich
wandert aus der Ablage auf eine Rasterzelle, ein platzierter Bereich zurück in die Ablage. Deshalb
kein `SortableContext`, sondern `useDraggable`/`useDroppable` von Hand — Zellen als
`cell:<Zeile>:<Spalte>`, platzierte Kästen als `box:<id>`, die Ablage als eine feste ID. Ein
`onDragEnd` entscheidet, was ein Abwurf hieß, statt eines Handlers pro Ziel.

Drei Dinge, die erst das laufende Programm gezeigt hat:

- **Der Knoten ist der Kasten, der Griff nur der Auslöser.** Erst hing beides am Griff — und weil
  dnd-kit den *Knoten* für die Kollisionsrechnung vermisst, lag beim Aufnehmen eines platzierten
  Kastens ein 18px-Rechteck in seiner linken oberen Ecke, dessen nächstes Ziel die Ablage darüber
  war: Aufnehmen und ohne Bewegung ablegen löste den Bereich, statt ihn liegen zu lassen. Mit
  `setNodeRef` am Kasten und `setActivatorNodeRef` am Griff meldet dasselbe Manöver „bei Zelle Zeile
  1, Spalte 1 abgelegt“ und ändert nichts. Der Griff steht im JSX innerhalb des Kastens, also reicht
  ein kleiner Kontext die Aktivator-Props hinein.
- **Pfeiltasten brauchen einen eigenen Koordinatengeber, und der braucht eine Achsenregel**
  (`utils/dndKeyboard.ts`). dnd-kits Standard schiebt um feste 25px; der Sortable-Geber verlangt,
  dass das gezogene Element selbst ein Ablageziel ist, was hier nie zutrifft. Der erste eigene Versuch
  wertete nur Entfernungen — und „nach rechts“ aus Zelle (1,1) landete in der Ablage: die nächste
  Spalte lag 800px weit, die Ablage 50px rechts und 150px darüber. Jetzt zählen zuerst nur Ziele, die
  quer zur Richtung noch überlappen (die Spalte bei hoch/runter, die Zeile bei links/rechts); erst
  wenn es keine gibt, entscheidet die Entfernung — so kommt man vom Raster auch wieder hinauf in die
  Ablage.
- **Ein Klick muss ein Klick bleiben.** `PointerSensor` mit `activationConstraint: { distance: 4 }`,
  sonst ist jeder Druck auf den Griff ein Null-Pixel-Drag und die Auswahl per Klick fällt aus.

Dazu ein `DragOverlay` (ohne das folgt dem Zeiger nichts, weil die Quelle bis zum Abwurf an ihrem
Platz bleibt) und die Ansagen aus `utils/dndAnnouncements.ts`, die hier Bereichsnamen, „Zelle Zeile
2, Spalte 2“ und die Ablage benennen. Die Überschneidungs-Absage wird jetzt zusätzlich angesagt:
sonst wäre „bei Zelle … abgelegt“ das Letzte, was von einem abgelehnten Abwurf zu hören ist.

Gemessen im Produktions-Build am Frame `rename-test`, ohne zu speichern (der Editor hält alles bis
zum Speichern in seinem eigenen Zustand): Tastatur-Platzierung aus der Ablage, Tastatur-Lösen zurück
in die Ablage, Aufnehmen-und-Ablegen ohne Bewegung, Maus-Drag auf eine freie Zelle, Klick zum
Auswählen, und ein Abwurf auf eine belegte Zelle, der weiterhin an `overlaps` scheitert.

## Ein authored Frame muss `center` mitrendern (2026-09-04)

Gefunden beim Bau der Beispielvorlage, an einer echten Seite mit einem echten Frame.

Quartz' drei mitgelieferte Frames rendern alle einen `<div class="center …">` um den Seiteninhalt
(`DefaultFrame.tsx`, `FullWidthFrame.tsx`, `MinimalFrame.tsx`). Der Codegen in
`layoutFrameService.generateFrameJs` tat das nicht — er schrieb je Area nur
`qgframe-area qgframe-area-<name>`. Für das *Layout* war das folgenlos, und genau deshalb ist es
nie aufgefallen: `.center` hat in `base.scss` nur eine Regel (`.center > article { grid-area }`,
in einem Flex-Container wirkungslos) plus die beiden Varianten `.full-width`/`.minimal`.

Die Klasse ist aber **Vertrag für die Client-Skripte**. Der Mermaid-Initialisierer macht auf jeder
Seite, unbedingt:

    document.querySelector(".center").querySelectorAll("code.mermaid")

Ohne `.center` ist das `null.querySelectorAll` — ein TypeError im `nav`-Handler, und weil alle
Komponentenskripte an derselben Stelle registriert werden, **bricht damit jedes danach
registrierte Skript ab**. Gemessen an einem gebauten Projekt: der Explorer rendert seinen
Container, aber weder seinen Baum noch seine Überschrift, und die Konsole zeigt genau einen Fehler,
der nichts über den Explorer sagt. Ein Frame kostete also die halbe Interaktivität der Seite, ohne
dass irgendwo „Frame“ auftauchte.

Der Codegen hängt `center` daher an die Area, die `pageBody` trägt — die eine Area, die dem
`.center` der eingebauten Frames entspricht. Nachgemessen: Fehler weg, Explorer vollständig.

Regel daraus: **was Quartz' eigene Frames ins Markup schreiben, ist Schnittstelle, nicht
Dekoration.** Ein generierter Frame, der eine Klasse weglässt, bricht Code, den man in der
Frame-Ansicht nie zu Gesicht bekommt.

**Nachtrag (2026-09-04): `center` bringt Quartz' Auto-Margin mit.** Der Fix oben hat eine
Regression erzeugt, die erst beim Vermessen einer Mermaid-Seite auffiel. `base.scss` setzt auf
`.center` nicht nur `min-width: 100%`, sondern auch `margin-left: auto; margin-right: auto` — und
ein Auto-Margin macht ein Grid-Item shrink-to-fit, exakt die Falle aus Befund 2(1) weiter oben.
Gemessen an drei Fensterbreiten: die pageBody-Area rendert 466px breit und in ihrer 796px-Spalte
zentriert, auf **jeder** Seite eines Projekts mit authored Frame. Das Lesemaß der Beispielvorlage
lag damit nicht bei 686px, sondern bei 466.

Der Codegen emittiert deshalb zusätzlich `.qgframe-area.center { width: 100%; max-width: none;
margin-inline: 0 }`. Damit gilt weiter, was in Befund 2 steht: **`align` auf der Frame-Box ist das
einzige, was etwas positioniert** — und eine geerbte Regel darf das nicht unterlaufen.

Die Lehre für den nächsten solchen Fix: Eine Klasse, die man wegen ihres *Verhaltens* setzt, bringt
ihr *Aussehen* mit. Beides ist zu prüfen, und zwar am gemessenen Layout, nicht am Screenshot — 466
gegen 796 sieht auf einem Bild nach einer Gestaltungsentscheidung aus.

## Ein Bereich ist keine Belegung (2026-09-07)

Gefunden im Beispielprojekt, an einem Frame, das der Nutzer selbst gebaut hatte: `editorial` hatte
neun Bereiche, davon **drei auf der Belegung „links“**. Der Codegen mappt jeden Bereich über
`bySlot[area.slot]`, also rendert er dieselbe Komponentenliste dreimal — Spacer, Explorer, die
Notiz und „Neueste Notizen“ standen auf jeder gebauten Seite drei Mal untereinander. Weder der
Editor noch der Build sagten etwas dazu; sichtbar wurde es erst auf der fertigen Website.

Die Ursache war eine Vorgabe: `addNewArea()` schrieb `slot: 'left'` fest. Etwas anderes hatte es
auch nicht anzubieten. Quartz sortiert Komponenten in genau sechs Positionen — `buildLayoutForEntries`
in `plugins/loader/config-loader.ts` hält sie als Objektliteral mit sechs Schlüsseln, und
`positions[layout.position]` verwirft still, was nicht dazugehört. Ein siebter Bereich hatte also
keine eigene Quelle, und ein achter musste sich eine teilen.

Damit fällt auch die Frage auseinander, ob Bereich und Belegung nicht dasselbe sind. **Ein Bereich
ist Geometrie** — Name, Zeile, Spalte, Spanne, Sichtbarkeit, je Breakpoint. **Eine Belegung ist die
Herkunft des Inhalts** und der einzige Punkt, an dem ein Frame an `quartz.config.yaml` andockt.
Solange ein Frame höchstens sieben Bereiche hat, stehen sie eins zu eins, und genau das erzeugt den
Eindruck.

### Der zweite Schlüssel: `layout.group`

Quartz hat neben der Position noch einen Schlüssel, und er stand in diesem Projekt längst in
Benutzung (`brand`, `toolbar`): `resolveGroups` faltet die gruppierten Einträge einer Position zu
*einer* Komponente zusammen und lässt die ungruppierten stehen. Ob sich diese eine Komponente beim
Frame wiedererkennen lässt, war die ganze Frage — gemessen mit einer Probe im Frame eines
Wegwerfprojekts, ein echter Build, danach zurückgenommen:

    left: [ {name: "MobileOnly"}, {name: "Flex"}, {name: "ExplorerComponent"} ]

`displayName` war bei allen dreien `undefined`. Die Gruppe ist also erkennbar, aber nur an ihrem
Funktionsnamen — quartz baut sich mit esbuilds `keepNames: true` (`quartz/cli/handlers.js`), sonst
gäbe es hier gar keine Identität. Das ist zugleich die Reichweite dieser Messung: sie hängt an
einer Einstellung in Quartz' eigenem Build, nicht an einer zugesicherten Schnittstelle.

Die Regel im Codegen lautet daher: **die k-te Flex einer Position ist die k-te Gruppe.** Ein
Bereich mit Gruppe nimmt seine, der Bereich ohne nimmt alles übrige — einschließlich der Gruppen,
denen dieses Frame keinen Bereich gegeben hat, die sonst von der Seite verschwänden.

### Woher das k kommt, und was es kostet

Die Reihenfolge der Gruppen kann das Frame nicht aus dem herauslesen, was es bekommt: die
Positionsliste ist flach, und jede Gruppe darin ist eine namenlose Flex. Sie steht deshalb im
generierten Code; `groupOrderByPosition()` in `shared/gridFrameCss.ts` bildet `resolveGroups`'
eigene Sortierung nach (Mitglieder nach Priorität, jede Gruppe an der Stelle ihres ersten
Mitglieds, sofern `layout.groups.<name>.priority` nichts anderes sagt).

Damit hält ein Frame eine Kopie von etwas, das die Config besitzt — dasselbe Verhältnis wie bei den
Breakpoint-Breiten. **Eine Kopie, die niemand auffrischt, ist eine Kopie, die still aufhört zu
stimmen**, also braucht sie einen Wächter; wo der steht, ist unten der eigene Abschnitt.

Und weil eine Kopie trotzdem veralten kann — jemand ändert die yaml von Hand —, zählt der
generierte Code beim Rendern nach: passen Flexes und Gruppenzahl nicht zusammen, wird nichts
geraten. Der einfache Bereich bekommt alles, die Gruppen-Bereiche bleiben leer, und der Build sagt
es. **Eine Seite ohne Aufteilung ist reparierbar, eine mit vertauschten Bereichen nicht** — dort
sieht alles richtig aus, nur steht das Falsche darin.

### Das k gehört dem Seitentyp, nicht der Config

Das war der erste mittlere Befund des sechsten Reviews, und er trifft die Grundlage: `GROUP_ORDER`
stand einmal im Modul, gerechnet aus der ganzen Config — **Quartz baut aber je Seitentyp ein
eigenes Layout.** `loadQuartzLayout` nimmt die aktivierten Plugins, wirft die unter
`byPageType.<t>.exclude` genannten hinaus, ruft `buildLayoutForEntries` (und darin `resolveGroups`)
auf dieser kürzeren Liste und leert erst danach die Positionen, die `positions` mit `[]` nennt.
Zahl *und* Reihenfolge der Flexes einer Position sind damit Eigenschaften des Seitentyps, und
beides erreicht der Nutzer im Reiter „Seitentypen“ mit einem Klick.

Sagen kann Quartz dem Frame den Seitentyp nicht: `PageFrameProps` trägt die fertigen Listen und
sonst nichts, `componentData` auch keinen Namen, und der Dispatcher wählt das Layout, bevor das
Frame ins Spiel kommt. Was ein Frame messen kann, ist **wie viele Flexes in jeder Position
stehen** — die Zahl der Einträge insgesamt taugt nicht, weil Plugins ohne `layout` über die
Vorgabe ihres Manifests platziert werden und die App die nicht kennt.

Also bekommt das Frame nicht eine Ordnung, sondern alle, die diese Config hergibt
(`groupLayoutCandidates()`): die globale und je eine pro Seitentyp mit `exclude` oder geleerter
Position, gleiche fallen weg. Der Ausschluss wird dabei mit *Quartz'* Namen gelesen
(`shared/quartzPluginName.ts`), nicht mit dem Anzeigenamen der App — sonst entsteht eine Ordnung,
die Quartz nie erzeugt; die Messung dazu steht in
[`plugins-and-config.md`](plugins-and-config.md). Beim Rendern wählt `pickGroupOrder()` einmal pro Seite die
Kandidatin, deren Gruppenzahlen passen — in zwei Durchgängen: erst auf allen sechs Positionen, und
nur wenn dort keine passt, auf den Positionen, die dieses Frame wirklich teilt (warum zwei, steht
unten unter „Ein Bruch außerhalb der geteilten Positionen“). Genau eine ist die Antwort;
mehrere, die auf den geteilten Positionen dieselben Gruppen in derselben Reihenfolge nennen, sind
dieselbe Antwort zweimal. Alles andere heißt raten, und geraten wird nicht.

Gemessen am erzeugten Modul, mit vier Plugins auf `header` (Gruppe `gx` mit Priorität 10 und 60,
`gy` mit 40, dazu eine Suche ohne Gruppe) und drei Seitentypen; das Frame hat zwei Gruppen-Bereiche
und einen einfachen:

| Seite | vorher | jetzt |
| --- | --- | --- |
| Standard (`gx`, `gy`, Suche) | richtig aufgeteilt | **erkannt und nicht aufgeteilt**, mit Grund |
| Seitentyp schließt `gx`' erstes Mitglied aus | „richtig“ aufgeteilt — mit vertauschtem Inhalt | erkannt, nicht aufgeteilt |
| Seitentyp schließt `gy` ganz aus | Rückfall, Rat „Save the layout once“ | **richtig aufgeteilt** |
| Seitentyp leert `header` | Warnung, obwohl es nichts zu teilen gibt | still |
| Frame ohne Gruppen-Bereich auf `header` | Warnung bei geleerter Position | still, immer |

Die erste Zeile ist der Preis: Ein Ausschluss, der die Reihenfolge zweier Gruppen kippt, macht die
Aufteilung für *alle* Seiten unentscheidbar, weil beide Ordnungen dieselbe Flex-Zahl ergeben. Das
ist genau der Fall, den dieser Abschnitt oben als den nicht reparierbaren beschreibt — vorher sah
er richtig aus und zeigte das Falsche, jetzt fällt er auf und sagt, was zu tun ist. Der Rat ist
gemessen, nicht geraten: Mit `layout.groups.gx.priority` und `…gy.priority` ist die Reihenfolge
seitentyp-unabhängig, beide Kandidatinnen fallen zusammen, und alle vier Seiten oben teilen wieder
auf.

Zwei Nebenwirkungen, beide erwünscht: Eine Position, für die dieses Frame keinen Gruppen-Bereich
hat, wird nie aufgeteilt und warnt nie über ihren eigenen Inhalt — sie hat nichts aufzuteilen. (An
der *Entscheidung* nimmt sie sehr wohl teil, und was das kostet, steht im nächsten Abschnitt.) Und der
Warnplatz hängt jetzt an der gemessenen Gestalt, nicht nur an der Position: zwei verschiedene
Brüche im selben Lauf sagen beide etwas, vorher verbrauchte der erste den Platz des zweiten.

**Was bleibt:** `npx quartz build` von Hand kann eine Config lesen, die kein Wächter dieser App
gesehen hat; dann fällt es auf die erste Zeile der Tabelle zurück, statt still zu vertauschen.

### Ein Bruch außerhalb der geteilten Positionen darf die geteilten nicht leeren

Der Abgleich über *alle sechs* Positionen war als Schlüssel gewollt und ist es weiterhin: Eine
Position, die dieses Frame gar nicht teilt, kann das Einzige sein, was zwei Seitentypen
auseinanderhält — leert einer davon `right`, unterscheiden sich die Kandidatinnen nur dort, und
ohne diese Spalte wären beide gleich gut. Nur hieß „passt überall oder gar nicht“ eben auch: Stimmt
die Zahl auf einer Position nicht, die das Frame nie anfasst, passt *keine* Kandidatin, und die
Aufteilung fällt für die ganze Seite aus — auch für die Positionen, auf denen alles stimmt. Vor dem
Umbau prüfte `contentsFor` je Position, ein Bruch auf `right` ließ `header` in Ruhe.

Gemessen am echten Build (Kopie des Beispielprojekts, 266 Markdown-Dateien, 334 Seiten mit einem
qgframe-Grid, davon 201 mit dem `editorial`-Frame; dessen Bereiche `custom-8` und `custom-9`
tragen die Gruppen `brand` und `toolbar` auf `header`). Der Bruch ist ein von Hand geschriebener
zweiter `backlinks`-Eintrag **ohne** `enabled:` mit `layout.group: gf` auf `footer`: `configService`
liest ihn als eingeschaltet, die Kandidatin trägt also `footer: [gf]`, Quartz' Loader wirft ihn
hinaus und rendert dort keine Flex.

| | `custom-8` | `custom-9` | `header` | Meldung |
| --- | --- | --- | --- | --- |
| vorher | 0 | 0 | 2 | `header 2 … which no layout produces (the config as a whole: header 2)` |
| jetzt | 1 | 1 | 0 | `footer renders 0 group flex(es), not the 1 …` |

Je 201 von 201 Seiten. Die alte Meldung ist der zweite Teil des Befunds: `rendered` und `countsOf`
liefen beide nur über die geteilten Positionen, also kam die Position, die den Ausschlag gab, in
dem Satz nicht vor — und was blieb, war ein Widerspruch mit `header 2` auf beiden Seiten. Der
Leser konnte daraus nicht ableiten, was er ändern soll.

Also zwei Durchgänge: erst alle sechs genau, dann — nur wenn nichts passte — noch einmal alle
sechs, aber die ungeteilten nur noch als **Obergrenze**. Das ist immer eine Erweiterung einer
*leeren* Treffermenge, nie ein Ersatz; eine Kandidatin, die überall genau passt, gewinnt weiterhin.
Warum eine Obergrenze und nicht „die ungeteilten weglassen“, steht unten unter „Eine Position
außerhalb spricht nur in eine Richtung“. Beides nachgemessen, am erzeugten Modul wie am Build:

| Fall | Ergebnis |
| --- | --- |
| gesunde Config (Grundfall) | 201 von 201 aufgeteilt, keine Warnung — Wort für Wort wie vorher |
| Bruch auf `footer` (oben) | 201 von 201 aufgeteilt, eine Warnung, die `footer` nennt |
| Bruch auf `header` selbst (Gruppe ohne Flex) | Rückfall wie bisher, Meldung ohne Widerspruch (`header 2` gegen `header 3`) |
| Reihenfolge gekippt (`content` ohne `quartz-layout-box`, Gruppen ohne feste Priorität) | 201 von 201 Rückfall, genau eine Warnung — der Preis aus der Tabelle oben, unverändert |
| zwei Seitentypen, nur über `right` unterscheidbar | weiter unterschieden: global wählt `[gx, gy]`, `p1` wählt `[gy, gx]` |

Die letzte Zeile ist die Gegenprobe für den ersten Durchgang: Ohne ihn wären die beiden
Kandidatinnen auf `header` gleich zahlreich und verschieden geordnet, also mehrdeutig, also
Rückfall. Sie ist am Modul gemessen, weil das Beispielprojekt keinen solchen Seitentyp hat.

Dass der neue Fall überhaupt eine Warnung bekommt, statt still durchzugehen, ist dieselbe Regel wie
eine Ebene höher: „keine Gruppe hier“ und „eine Gruppe, deren Mitglieder nie rendern“ sehen auf der
gebauten Seite gleich aus, und dies ist die einzige Stelle, die sie noch auseinanderhalten kann.
Die Aufteilung selbst ändert die Warnung nicht — sie ist ein Hinweis, kein Rückfall.

### Eine Position außerhalb spricht nur in eine Richtung, und deshalb wird sie nicht weggelassen

Der zweite Durchgang ließ zuerst die ungeteilten Positionen **ganz** weg und fragte nur noch die
geteilten. Der Kommentar daneben nannte das „immer eine Erweiterung einer leeren Treffermenge, nie
ein Ersatz“, und das stimmte für die Menge — nicht für das Ergebnis. Denn die Menge war aus zwei
Gründen leer, die von innen gleich aussehen: ein Bruch außerhalb der geteilten Positionen (der Fall
oben, den der Durchgang heilen soll) oder ein Bruch *innerhalb* einer geteilten. Im zweiten Fall ist
die Zahl auf der geteilten Position falsch, und der Durchgang fragte nur noch sie. Trifft eine
zweite Kandidatin diese falsche Zahl zufällig — ein Seitentyp, der genau eine Gruppe ausschließt —,
gewann sie, und ihre Ordnung schob die verbliebene Flex in den Bereich der *anderen* Gruppe.
Vorher hatte genau die Position außerhalb das verhindert.

Der Unterschied zwischen beiden Fällen steht in der **Richtung** der Abweichung, und er ist am
echten Build ablesbar:

- Die Seite rendert **weniger** Flexes, als die Kandidatin beschreibt. Dafür gibt es die
  gewöhnliche Erklärung: eine Gruppe, deren Mitglieder alle abgeschaltet sind, ein Eintrag, für den
  Quartz keine Flex baut. Die Kandidatin kann trotzdem die richtige sein.
- Die Seite rendert **mehr**. Dafür gibt es keine: Nichts an einer Seite kann eine Gruppe
  hinzufügen, von der die Ordnung nie gehört hat. Das ist die Kandidatin, die sich selbst
  widerspricht.

Also fragt der zweite Durchgang weiter alle sechs Positionen, die geteilten auf Gleichheit, die
übrigen auf „beschrieben ≥ gerendert“ (`countsFit`). Gemessen, vorher und nachher, am erzeugten
Modul und am echten Build (derselbe Klon, 211 Editorial-Seiten; der Geist ist diesmal
`note-properties` ohne `enabled:` in der Gruppe `custom-9`, dazu bekommt der Seitentyp `bases`
`template: editorial`, `exclude: ["@quartz-community/recent-notes"]` und `positions: { header: [],
right: [] }`):

| | `custom-8` | `custom-9` | `after-body` | Meldung |
| --- | --- | --- | --- | --- |
| vorher | leer | **Flex(recent-notes)** | Layout-Box | `header renders 2 …, not the 0 page type "bases" describes … so afterBody was divided as usual` |
| jetzt | leer | leer | Layout-Box, Flex(recent-notes) | `this page renders afterBody 1 …, which no layout … accounts for … page type "bases" fits that, but header renders 2 group flex(es) it has no group for` |

Je 203 von 211 Seiten; die übrigen 8 rendern auf `afterBody` keine Flex und fallen in beiden
Fassungen zurück. Vorher zeigte der Bereich `custom-9` also die Komponente der Gruppe `custom-8`,
unter einem Satz, der die Teilung ausdrücklich für normal erklärte. Die beiden Fälle, die weiter
gelten müssen, sind mit demselben Klon gegengemessen: die gesunde Config baut Wort für Wort
identisch (201 von 201 geteilt, keine Warnung), und der Fall des Abschnitts davor — eine Gruppe auf
`footer`, für die Quartz keine Flex baut — bleibt bei 201 von 201 geteilt mit derselben Warnung.

Zwei Nebensachen fielen dabei mit an. Die Rückfall-Meldung listet nur die geteilten Positionen,
also stand dort „no layout produces afterBody 1“ neben einer Kandidatin, die genau `afterBody 1`
beschreibt — sie sagt jetzt „accounts for“ und nennt die Position, die die Kandidatin
ausgeschlossen hat. Und wo mehrere Kandidatinnen die geteilten Positionen gleich teilen und sich
nur außerhalb unterscheiden, nannte die Hinweis-Meldung willkürlich die erste als *die*
beschreibende; sie nennt die anderen jetzt dazu.

### Eine Kandidatin für ein Frame, das dieser Seitentyp nie rendert, gehört nicht in dessen Liste

Die Kandidatinnen wurden je **Projekt** gerechnet und an jedes Frame gegeben. Ein Seitentyp mit
`template: irgendwas-anderes` rendert dieses Frame aber unter keinen Umständen: Quartz nimmt
`overrides.frame ?? pageType.frame ?? "default"` (`dispatcher.ts`, `resolveLayout`), und ein
unbekannter Name fällt auf das Standard-Frame zurück, nie auf ein anderes eigenes
(`components/frames`, `resolveFrame`). Seine Ordnung stand trotzdem in `GROUP_LAYOUTS`.

Das Argument „eine Kandidatin zu viel führt höchstens zum Rückfall“ hält nicht. Beides gemessen am
erzeugten Modul, beides mit einem Seitentyp, der ein anderes Frame nennt:

| | vorher | jetzt |
| --- | --- | --- |
| Seitentyp kippt per `exclude` die Reihenfolge | Mehrdeutigkeit auf **jeder** Seite, Rückfall, Rat nennt einen Seitentyp, der dieses Frame nie benutzt | richtig aufgeteilt, keine Warnung |
| Seitentyp leert `right`, und auf `right` bricht wirklich eine Gruppe weg | dessen Kandidatin passte, **keine Warnung**, richtig aus Zufall | Warnung, die `right` nennt, richtig aufgeteilt |

Die zweite Zeile auch am echten Build, mit demselben Bruch wie im Abschnitt davor, nur auf `right`
statt `footer`: Vorher passte die Kandidatin des `404`-Seitentyps (`template: focus`, `right`
geleert) auf die 201 Editorial-Seiten und verschluckte die Warnung; die Seiten waren richtig, weil
diese fremde Ordnung auf `header` zufällig dieselbe ist. Jetzt hat `editorial` im Beispielprojekt
noch **eine** Kandidatin statt zweier, der zweite Durchgang rettet die Aufteilung, und im Log steht
der Satz. Eine Kandidatin zu viel kann eine Auswahl also *ermöglichen*, die es sonst nicht gäbe —
und das ist die gefährlichere Richtung, weil sie stumm ist.

**Nur ein ausdrückliches `template` zählt.** Die Kette hat drei Glieder, und das mittlere — das
Frame, das ein Seitentyp-Plugin für sich selbst erklärt — kann die App nur raten
(`pluginSchemaService`, `discoverBuiltinPageTypeFrames`). Ein Rat darf keine Kandidatin *entfernen*:
zu wenige ist der Fehler, der Inhalte stumm vertauscht, zu viele höchstens der, der zu oft
zurückfällt. Deshalb filtert `groupLayoutCandidates` nur, was in der Config steht, und `frameName`
ist ein Pflichtargument — eine Kandidatenliste gehört immer zu einem Frame, und ein optionales
Argument ließe das Vergessen wie einen gültigen Aufruf aussehen.

### „Gib den Gruppen eine Priorität“ hilft nur, wenn es dieselben Gruppen sind

Die Mehrdeutigkeits-Meldung behandelte jeden Fall als Reihenfolge-Problem („they order the groups
differently“) und empfahl `layout.groups.<name>.priority`. Es gibt aber zwei verschiedene Lagen, und
in der zweiten berührt dieser Rat den Zustand nicht: Zwei Seitentypen, die je eine *andere* Gruppe
ganz ausschließen — `p1` verliert `gx`, `p2` verliert `gy` —, rendern beide **eine** Flex, und ihre
Kandidatinnen nennen `[gy]` und `[gx]`. Das sind nicht dieselben Gruppen in anderer Ordnung, das sind
andere Gruppen; keine Priorität macht sie gleich. Gemessen am erzeugten Modul, ohne und mit
`gx.priority: 10, gy.priority: 40`: dieselbe Meldung, derselbe Rückfall, Wort für Wort.

Also unterscheidet `pickGroupOrder` die beiden jetzt (`namesAlike`: dieselben Gruppen je geteilter
Position, gleich wie geordnet). Die alte Meldung bleibt für den Reihenfolge-Fall unverändert — ihr
Rat ist gemessen und im Reiter „Global“ erreichbar. Der andere Fall bekommt eine eigene: dass keine
Priorität hier hilft, warum (die Flex-Zahl ist alles, was ein Frame messen kann, und beide Seitentypen
erzeugen dieselbe), und zwei Auswege, die **beide gemessen sind**:

| Ausweg | Ergebnis |
| --- | --- |
| je Gruppe *ein* Mitglied stehen lassen statt die ganze auszuschließen | beide Gruppen bleiben, die Kandidatinnen fallen zusammen, alles teilt richtig auf, keine Warnung |
| die Position für einen der Seitentypen ganz leeren | dessen Zahl unterscheidet sich, die Seite wählt die richtige Kandidatin und teilt auf |

Was **nicht** in der Meldung steht, obwohl es naheliegt: `display` und `condition` wickeln ein
Mitglied, bevor `resolveGroups` gruppiert (`buildLayoutForEntries`), die Gruppe bliebe also stehen.
Nur ist `display` `mobile-only`/`desktop-only` und `condition` eine von vier eingebauten
(`not-index`, `has-tags`, `has-backlinks`, `has-toc`) — keins davon kann „auf Seiten dieses Typs
nicht“ sagen. Ein Rat, den man nicht befolgen kann, ist genau der Fehler, den dieser Abschnitt
behebt.

### Ein Wächter, der scheitert, sagt es im Build-Log

`writeAllFrames()` fing alles in ein `console.error` — die Konsole des Hauptprozesses, in die kein
Nutzer sieht. Ein `EACCES` auf einem Frame-Verzeichnis hieß damit: gebaut wird mit dem Stand von
vorher, und nichts auf dem Bildschirm sagt es. Dasselbe eine Ebene tiefer bei der Config: „keine
Gruppen“ und „konnte nicht nachsehen“ rendern gleich (jede Position ungeteilt), und das Frame kann
die beiden auch nicht unterscheiden, weil es die leere Ordnung bekommt und sonst nichts.

Also sagt es die Stelle, die es weiß: `writeAllFrames()` wirft weiterhin nie, gibt jetzt aber die
Sätze zurück, die in das Log gehören, und `buildService` legt sie dorthin — beim Bauen in
`buildLog`, beim Serverstart in das Server-Log. Gemessen über ein esbuild-Bündel des Dienstes an
vier Wegwerf-Projekten:

    heil                 []                                              frames.js geschrieben
    plugins kaputt       ["Die Gruppen des Layouts konnten nicht …"]      frames.js geschrieben
    config fehlt         ["Die Gruppen des Layouts konnten nicht …"]      frames.js geschrieben
    Verzeichnis 0555     ["Die Frames konnten … nicht aufgefrischt …"]    alter Stand bleibt

Der Unterschied zu `getBreakpointWidths`, wo „unlesbar → Vorgabe“ folgenlos ist, bleibt damit
benannt statt stumm: Dort ist die Vorgabe eine richtige Antwort, hier ist sie eine Seite ohne
Aufteilung.

### Gemessen

Von Hand durch die gebaute App, gegen ein echtes Projekt: Bereich anlegen, ins Raster ziehen,
Belegung „links“, „Eigener Bereich“ an, im Reiter „Global“ den Explorer in dessen Gruppe. Danach
`npx quartz build` und die 114 erzeugten Seiten ausgezählt — der Explorer steht **genau einmal**,
in `.qgframe-area-custom-8`; Suche und Spacer stehen weiter in `.qgframe-area-left`. Vorher, mit
drei Bereichen auf „links“: dieselbe Liste dreimal.

Nebenbefund aus demselben Durchgang: die Gruppen-Auswahl einer Komponente listete nur, was unter
`layout.groups` deklariert war. Eine Gruppe entsteht aber, sobald eine Komponente sie nennt —
`layout.groups` trägt nur Richtung und Abstand. Der Bereichsname stand dort also nie, und Ziehen
wäre der einzige Weg hinein gewesen. **Für die Tastatur wäre das gar keiner.**

### Nachtrag: was der Vorlagen-Rundlauf davon merkt (2026-09-07)

Gefragt, weil ein Frame jetzt eine Kopie aus der Config hält: kommt beim Export und Import noch
alles mit?

Der Export ja, und zwar ohne Zutun — gemessen an einem echten `.qtpl` aus einem echten Projekt
(Speichern-Dialog im Hauptprozess gespiegelt, weil er nativ ist):

    frames.json   custom-8 → slot "left", group "custom-8"
    plugins.json  explorer → layout.group "custom-8"   (dazu drei in "toolbar")
    layout.json   groups: { toolbar: { priority: 35, … } }

Dass `custom-8` in `layout.groups` **fehlt**, ist richtig und kein Verlust: eine Gruppe entsteht,
sobald eine Komponente sie nennt; `layout.groups` trägt nur Richtung und Abstand. Der Teil
`plugins` bringt sie zurück.

Der Import dagegen hatte eine Lücke, und die Teil-Reihenfolge kann sie nicht schließen: `frames`
läuft **zuerst** (es muss, weil es über die Quartz-CLI in die Config schreibt), also stehen die
Gruppen, die ein Frame aufteilen soll, zu diesem Zeitpunkt noch gar nicht dort. Ein *vollständiger*
Import korrigierte sich selbst, aber nur zufällig: `layout` läuft später und ruft
`saveBreakpointWidths`, das ohnehin jedes Frame neu schreibt.

Gemessen, indem genau dieser Zufall weggenommen wurde — Import ohne den Teil `layout`, in ein
Projekt, dem die Gruppe vorher entzogen worden war. Die Tabellen dieses und des nächsten Abschnitts
nennen die eingebackene Ordnung noch `GROUP_ORDER`, so wie sie damals hieß; seit dem sechsten
Review sind es mehrere (`GROUP_LAYOUTS`, eine je Seitentyp), an den Messungen ändert das nichts:

| | Config nach dem Import | `GROUP_ORDER` im Frame | gebaute Seite |
|---|---|---|---|
| ohne den Fix | `group: custom-8` ✓ | `{"left":["toolbar"]}` ✗ | Explorer in `left`, `custom-8` leer, Warnung im Build |
| mit dem Fix | `group: custom-8` ✓ | `{"left":["toolbar","custom-8"]}` ✓ | Explorer genau einmal in `custom-8` |

Der erste Anlauf war deshalb ein `writeAllFrames()` am Ende von `importPackage()`. Er stand genau
zwei Commits lang: Die Regel aus dem vierten Review — **ein Wächter gehört an jede Tür zu demselben
Zustand** — führt eine Ebene weiter zu der Frage, welche Tür das eigentlich ist, und die Antwort ist
nicht der Import, sondern der Bau. Der Aufruf ist wieder heraus; wie es jetzt steht, sagt der
Abschnitt „Der Wächter steht an der Tür, an der gelesen wird“ unten.

Zwei Nebenbefunde aus demselben Durchgang:

- **Der Rückfall meldete sich einmal pro Bereich pro Seite** und behauptete für den Gruppen-Bereich,
  er zeige jetzt alles — dabei bleibt genau der leer. Jetzt einmal je Position und Build, und die
  Meldung nennt den Bereich, der wirklich alles bekommt.
- **Eine Gruppe konnte unsichtbar weitergelten.** Löscht man den Bereich, der sie trug, verschwand
  ihr Name aus der Auswahl der Komponente; die Komponente behielt `layout.group`, die Auswahl zeigte
  „keine Gruppe“, und wegräumen ließ sie sich damit auch nicht. Beim Aufräumen des Testprojekts
  aufgefallen: die yaml sagte noch `group: custom-8`, der Bildschirm nichts. Die Liste speist sich
  jetzt aus drei Quellen — `layout.groups`, die Bereiche der Frames, und **was die Komponenten
  tatsächlich nennen**. Dieselbe Lücke gab es vorher schon für eine unter `layout.groups` gelöschte
  Gruppe; der Kommentar an `deleteGroup` hatte sie als harmlos notiert.

### Der Wächter steht an der Tür, an der gelesen wird (2026-09-07)

Erst hing er am IPC-Handler fürs Config-Speichern. Das war naheliegend und falsch, und die Liste der
Türen, die er nicht abdeckte, wuchs beim Nachsehen weiter:

| Tür | schreibt die Config | vom ersten Wächter abgedeckt |
|---|---|---|
| `config:save` (die App selbst) | ja | ja |
| `plugin add/remove/install/prune` | die Quartz-CLI schreibt sie zurück | nein |
| `quartz plugin install --latest` (Plugin-Update) | dito | nein |
| `quartz sync --pull` | bringt die Config des Gegenübers mit | nein |
| Vorlagen-Import | vier Aufrufe, alle an `handle()` vorbei | nein |
| Snapshot-Restore je Datei | kann `quartz.config.yaml` allein zurückholen | nein |
| `npx quartz build` im Terminal | gar nicht durch die App | nein |
| Snapshot-Restore ganz / Duplizieren / Umbenennen | — | **braucht keinen** |

Die letzte Zeile ist kein Versehen: Ein ganzer Restore holt Config und Frames aus demselben Commit
(`read-tree -u --reset`), und ein Snapshot hält die erzeugte Datei — an einem echten Store
nachgesehen, `dist/frames.js` steht in jedem Baum neben seiner `frame.json`. Das Duplizieren kopiert
beide Seiten (`authored-frames` steht in keiner `SKIP`-Liste), und `repointProjectPaths` fasst nur
`entry.source` und das Lockfile an, nie `layout.group`.

Für alle anderen gilt: **einen Wächter je Tür zu setzen ist eine Liste, an die die nächste Tür nicht
angebaut wird.** Gelesen wird die Kopie aber nur an einer einzigen Stelle — beim Bauen. Also steht
der Wächter dort: `buildService` ruft `writeAllFrames()` unmittelbar vor jedem `quartz build` und
jedem `quartz build --serve`. Damit sind alle Zeilen der Tabelle abgedeckt, auch die, an die niemand
gedacht hat. Es kostet drei Schreibvorgänge je Frame (ein Projekt ohne Frames kehrt sofort zurück)
gegen einen Build, der in Sekunden misst.

Gemessen an einem echten Projekt, über einen Weg **ohne jeden Wächter** — die yaml von Hand
geändert, dann durch die App gebaut:

| | `GROUP_ORDER` vor dem Bau | danach | gebaute Seite |
|---|---|---|---|
| Gruppe von Hand eingetragen | `{"left":["toolbar"]}` | `{"left":["toolbar","custom-8"]}` | Explorer in `custom-8` |
| Gruppe von Hand entfernt | `{"left":["toolbar","custom-8"]}` | `{"left":["toolbar"]}` | Explorer in `left` |

Dasselbe am Dev-Server: `server.start` frischte die Kopie vor dem Spawn auf, gemessen an derselben
Zeile. Keine Warnung in beiden Fällen, in beide Richtungen.

Bleibt der eine Fall, den auch das nicht erreicht: `npx quartz build` in einem Terminal. Dafür ist
der Zähl-Abgleich im erzeugten Frame da — er rät nicht, legt alles in den einfachen Bereich und sagt
im Build-Log, welchen.

### Die Beispielvorlage führt die freien Bereiche vor (2026-09-07)

`editorial` hat seit heute zwei freie Bereiche nebeneinander unter dem Text, `custom-8` und
`custom-9` (`EXTRA_AREAS` in `scripts/example-template/frames.mjs`) — ohne Belegung, also leer, und
nur auf dem Desktop. Sie sind die Einladung, den zweiten Schlüssel zu benutzen: „Eigener Bereich“
im Frame-Editor, dann im Reiter „Global“ eine Komponente hineinziehen.

Was sie kosten, ist gemessen und nicht gerechnet — die gebaute Seite bei 1440 px im Browser:

    grid-template-rows: 69px 376.703px 1545.52px 0px 140.312px 236.219px
    row-gap: 32px
    page-body  endet bei 2075
    custom-8/9 0px hoch, beide bei 2107
    after-body beginnt bei 2139

Die Zeile selbst ist **0 px** hoch, aber sie bringt einen zweiten Zeilenabstand mit: zwischen
Seiteninhalt und after-body stehen jetzt 64 statt 32 px. **+2rem auf jeder der 201 Inhaltsseiten**,
und das ist der Preis dafür, dass die beiden Bereiche im Editor bereitstehen, statt erst angelegt
werden zu müssen.

Der Anlass war ein Verlust: die beiden Bereiche waren von Hand im Example-Projekt entstanden, und
`npm run template:example` hat sie überschrieben — Phase 3 schreibt die vier Frames aus
`frames.mjs`, und ein Rückweg ist für Config und Frames bewusst nicht vorgesehen. Kein Snapshot
half, denn keiner hatte sie: `saveFrame` nimmt nur für ein *neues* Frame eine Aufnahme, das
Bearbeiten eines bestehenden nicht. **Was im Werkstattprojekt bleiben soll, gehört ins Skript** —
das ist die Regel, und dieser Absatz ist ihr Beleg.

### Was das Benutzen fand, was das Lesen nicht fand (2026-09-07)

Sieben Punkte durchgegangen, an der gebauten App und an echten Builds. Drei waren Fehler, zwei
Befunde ohne Fix, zwei in Ordnung.

**Die rohe ID im Ohr.** `describeDragId` löst eine Drag-ID in einen Namen auf. Die neuen
Ablageziele heißen `<position>#<gruppe>`; das ist nicht die Palette, `Number()` macht `NaN` daraus,
und in `POSITIONS` steht es auch nicht — also fiel es durch auf die Plugin-Suche und gab die ID
zurück. Ein Screenreader hörte beim Ziehen **„left#custom-8"**. Nach dem Fix, an der laufenden App
mit der Tastatur gemessen: „search liegt über custom-8." und „search bei custom-8 abgelegt."
Gefunden wurde das durch Lesen, aber nur weil ich danach gesucht habe — bemerkt hätte es erst
jemand, der die App benutzt.

**Eine Position, deren Bereiche alle eine Gruppe haben, verliert alles andere.** Kein Fall, den der
Vertrag verbietet, und keiner, den irgendetwas gemeldet hätte. Gemessen: `left` mit zwei
Gruppen-Bereichen und keinem einfachen nahm den Spacer, den Dunkelmodus- und den Lesemodus-Schalter
von **jeder** der 20 Seiten — Editor stumm, Build-Log stumm. Jetzt sagen es beide: der Editor
strukturell („Ohne einfachen Bereich: …", er kennt die Komponenten nicht), der Build mit der Zahl.
Die Meldung zählt *Einträge*, nicht Komponenten: einer davon kann die Flex einer anderen Gruppe
sein, und in die kann sie nicht hineinsehen — eine zu kleine Zahl wäre schlimmer als ein vages Wort.

**Zwei Bereiche mit demselben Namen kosten das ganze Raster.** Ein Bereichsname *ist* die
`grid-area`, und zwei Bereiche mit einem Namen setzen ihn auf zwei Rechtecke. CSS verlangt ein
einziges, also verwirft der Browser nicht den Namen, sondern **die ganze Deklaration**. Am echten
Build im Browser gemessen, nach einem Umbenennen:

    grid-template-areas: none
    grid-template-columns: 0px 0px 0px 0px 1248px
    left / page-body / after-body: alle drei bei top 256, bottom 1007

Das Frame verliert also nicht einen Bereich, sondern seine Anordnung. Der Editor verweigert das
Speichern jetzt, so wie er es bei einem doppelten *Frame*-Namen schon tat — derselbe Fehler eine
Ebene tiefer. Vorbestehend, nicht durch die Gruppen entstanden; erreichbar mit einem Umbenennen.

**Zwei Befunde ohne Fix**, weil beide eine Entscheidung sind und keine Panne:

- *Ein Gruppen-Bereich, der nur auf Desktop platziert ist, nimmt seine Komponenten auf Tablet und
  Mobil von der Seite.* Der Editor platziert einen neuen Bereich auf dem Breakpoint, den man gerade
  bearbeitet — der Normalfall ist also genau dieser. Im erzeugten CSS nachgesehen:
  `.qgframe-area-custom-8 { display: none }` in beiden schmalen Blöcken. Für einen einfachen Bereich
  war das immer so und fällt auf (die Seitenleiste fehlt); für einen Gruppen-Bereich fehlen
  *Komponenten*, und die sind woanders auch nicht. `neverVisibleWarning` greift nicht, sie ist ja
  auf Desktop sichtbar.
- *Der Hinweis am neuen Schalter liegt im blau getönten Auswahl-Panel und kommt auf 4,37:1*, wo die
  bestehenden Hinweise auf weißem Grund 4,76 erreichen (beide 11px, beide `--text-muted`, gemessen
  in Hell). Unter der AA-Schwelle von 4,5, und es liegt am Ort, nicht am Token: es ist der erste
  Hinweis überhaupt in diesem Panel.

**In Ordnung:** eine Komponente per Maus in einen Gruppen-Bereich ziehen (Explorer wechselte von
`left` nach `custom-8`, Config bekam `group: custom-8`), und der Dunkelmodus der neuen Bedienelemente
(Schalter-Label 8,48, Hinweis 4,91, Badge 11,49 — im Dunkeln also alle drei über AA).

Nebenbei gemessen und **nicht** geändert: `GlobalBoard` übergibt seinem `DndContext` gar keine
`sensors`, anders als der Frame-Builder. Der Tastatur-Sensor läuft damit auf dnd-kits Vorgabe von
25px je Pfeildruck — die Gruppen-Bereiche sind erreichbar, aber es brauchte rund 28 Tastendrücke.
Vorbestehend und einen eigenen Durchgang wert.

### Die Datei, die Quartz importiert, wird nicht mehr halb gesehen

Vor dem Gruppen-Umbau schrieb genau ein Weg die drei Dateien eines Frames: das Speichern im Editor.
Jetzt sind es drei — Speichern, die Breakpoint-Breiten, und die Auffrischung vor jedem Bau und
jedem Serverstart —, und ausgerechnet `dist/frames.js`, die einzige, die ein *fremdes* Programm
liest, ging durch ein nacktes `writeFile`. Das kürzt erst und schreibt dann; wer dazwischen liest,
liest einen Torso.

Gemessen an einer 90-KB-Datei (so groß ist das erzeugte Modul des `editorial`-Frames), ein
Schreiber und ein Leser gegeneinander:

    writeFile      401 Lesevorgänge, 18 unvollständig
    rename       23771 Lesevorgänge,  0 unvollständig

Alle drei Dateien gehen deshalb über `writeFileAtomic()` — dieselbe Temp-Datei, dasselbe `fsync`,
dasselbe `rename` wie `writeJsonFile`, das jetzt nur noch dessen JSON-Hülle ist. Dazu ein
Schreiber je Projekt (`serialised()`): Atomarität hält jede Datei ganz, aber nicht einen *Satz* aus
drei Dateien davon ab, halb vom einen und halb vom anderen Aufrufer zu stammen — und „Jetzt bauen“
direkt nach „Starten“ sind zwei Aufrufer in einer Sekunde. Nachgemessen: 120 gleichzeitige
Auffrischungen gegen einen Leser, 35066 Lesevorgänge, kein einziger unvollständig.

Der Dev-Server ist von diesen Schreibvorgängen nicht betroffen — aber die erste Fassung dieses
Absatzes begründete das mit dem falschen Watcher, und ein Ergebnis mit einer Begründung, die es
nicht trägt, ist kein Befund, sondern einer in Wartestellung. **`quartz build --serve` hat zwei
Watcher**, nicht einen:

- der in `quartz/build.ts:160-164` läuft mit `cwd: argv.directory`, also im Content-Ordner, und
  sieht `.quartz-gui/` tatsächlich nie;
- der in `quartz/cli/handlers.js:588-603` läuft in der Projektwurzel (die App spawnt mit
  `cwd: projectPath`) über eine **feste Liste**, die `globby` beim Start auflöst — `**/*.ts`,
  `quartz/cli/*.js`, `quartz/static/**/*`, `**/*.tsx`, `**/*.scss`, `package.json`,
  `quartz.config.yaml`, `quartz.config.default.yaml` —, und *dieser* antwortet auf eine
  Config-Änderung mit einem harten Rebuild.

Mit dem zweiten gemessen, an einer Kopie des Beispielprojekts: 1478 Pfade, davon **0** unter
`.quartz-gui/`, **0** mit `frames.js` oder `authored-frames`. `package.json` ohne `**/` trifft nur
die Datei in der Wurzel, nicht die, die jedes Frame-Verzeichnis mitbringt; und `globby` läuft
ohne `dot`, also fällt `.quartz-gui/` ohnehin heraus. Ein Bau, während ein Dev-Server läuft, stört
ihn also nicht — so wenig wie ein gespeichertes Frame.

Was der zweite Watcher dagegen sehr wohl auslöst, ist ein Rebuild nach einem **Config**-Speichern —
und der liest `dist/frames.js` nicht neu, weil `frameLoader.ts:17` ein blankes
`await import(...)` ohne Cache-Buster macht und Node ein ESM-Modul für die Prozesslebensdauer hält.
Genau dafür gibt es den `DevServerRestartHint` nach dem Speichern im Reiter „Global“; die Zeile
ganz oben in dieser Datei beschreibt denselben Mechanismus für den Frame-Editor.

## Ein Bereich wird dort bearbeitet, wo er gerade liegt (2026-09-07)

Das Formular eines Bereichs — Name, Belegung, eigene Gruppe, Spannweiten, „Aus Raster lösen“,
„Bereich löschen“ — steckte in `PlacedBox`. Und `PlacedBox` rendert für einen Bereich, der auf
diesem Breakpoint keine Platzierung hat, gar nichts. Ein Bereich in der Ablage hatte damit kein
Namensfeld, keine Belegung und, der Teil, der es zur Falle machte, keinen Weg zum Löschen.

Ein **neu angelegter** Bereich beginnt genau so: `addNewArea` gibt ihm weder Belegung noch
Platzierung (aus gutem Grund — er wurde einmal auf `left` geboren, und so bekam das
`editorial`-Frame dieses Projekts drei Bereiche auf dieser Position). Wer also auf
„+ Bereich hinzufügen“ klickte, hatte einen Bereich, den er erst aufs Raster ziehen musste, um ihm
überhaupt eine Belegung geben oder ihn wieder loswerden zu können. `deleteAreaById` konnte das die
ganze Zeit; es führte nur kein Bedienelement dorthin.

Gemessen an der gebauten App, derselbe Ablauf in beiden Fassungen — Frame öffnen,
„+ Bereich hinzufügen“, dann den Chip in der Ablage anklicken:

| | vorher | jetzt |
| --- | --- | --- |
| Felder am Chip | keine | Bereichsname, Belegung |
| nach Belegung „Kopfbereich“ | — | zusätzlich „Eigener Bereich“, Chip zeigt die Belegung |
| „Bereich löschen“ | nicht vorhanden | vorhanden, `custom-8` verschwindet |

Das Formular ist jetzt eine Funktion (`areaForm(area, placement?)`) und wird von beiden Seiten
gerufen. **`placement` ist der ganze Unterschied**, und nur die Felder, die eine Platzierung
beschreiben, hängen daran: die beiden Spannweiten, „Sichtbar auf …“ und „Aus Raster lösen“. Name,
Belegung, Gruppe und das Löschen gehören dem Bereich selbst und sind immer da. Gegenprobe an
derselben Aufnahme: Ein platzierter Bereich zeigt vorher wie nachher dasselbe Formular in derselben
Reihenfolge — an der gebauten App nachgezählt (2026-09-08, Bereich `right` des `editorial`-Frames)
sind das **sechs beschriftete Felder** (Bereichsname, Belegung, Eigener Bereich, Zeilen-Spanne,
Spalten-Spanne, Sichtbar auf Desktop) und **zwei Knöpfe**; mit dem Ziehgriff und dem Kasten selbst
zehn Tabstopps. Die Zahl zehn stand hier einmal für die Felder — sie war keine Messung.

Ein ausgewählter Chip nimmt eine ganze Zeile der umbrechenden Ablage, statt chipgroß zu bleiben —
das Formular ist eine Feldreihe, und zwischen zwei anderen Chips eingequetscht wäre keins von
beiden lesbar. Der Hinweis über der Ablage sagt jetzt „öffnet seine Einstellungen dort, wo er
gerade liegt“ statt „zeigt seine Einstellungen unten“; das war schon vorher nicht der Ort, an dem
sie erschienen.

**Nachtrag (2026-09-08): Die zwei Fälle sind nicht „im Raster“ und „in der Ablage“.** In der Ablage
liegen zwei Arten von Bereichen — die ohne Platzierung auf diesem Breakpoint und die *mit* einer
Platzierung, die `hidden` ist —, und der Aufrufer reichte für beide keine Platzierung durch.
Ausgerechnet der Schalter, der einen Bereich gerade dorthin gebracht hatte („Sichtbar auf …“),
fehlte damit im einzigen Formular, das der Bereich noch hatte; der einzige Weg zurück war ein
Ziehen, und das vergibt eine neue Zelle. Die Ablage reicht die Platzierung jetzt durch, und weil
die beiden Arten von Chips sonst gleich aussehen, sagt der Chip, welche er ist (`hiddenShort`).
Gemessen an der gebauten App, Bereich `right` des `editorial`-Frames: vorher drei Felder, ein
Schalter, ein Knopf; jetzt sechs Felder, zwei Schalter, zwei Knöpfe — und Schalter aus, Schalter
wieder an legt den Bereich auf `2 / span 4`, `10 / span 3` zurück, genau dorthin, wo er lag.

**Und ein Tastendruck im Formular blieb nicht im Formular.** Der Kasten eines platzierten Bereichs
ist selbst ein `role="button"` mit Enter/Leertaste-Handler, das Formular liegt in ihm: Jeder
Tastendruck stieg auf, der Handler rief `preventDefault()`, das Zeichen kam nie an und das
Formular klappte zu. Der Klick-Pfad hatte sein `stopPropagation()` von Anfang an, der
Tastatur-Pfad nie — in der Ablage, wo nichts darüber hört, ging dasselbe Formular immer, und genau
dieser Vergleich hat es sichtbar gemacht. Gemessen mit echten Tastendrücken: `type('x y')` im
Namensfeld ergab vorher ein geschlossenes Formular und `activeElement: body`, jetzt den Namen
„rightx y“; die Leertaste auf „Eigener Bereich“ schloss vorher das Formular, ohne den Schalter
umzulegen, und legt ihn jetzt um.

**Nachtrag (2026-09-08, neuntes Review): Dieser Guard saß an der falschen Tür.** Er lag auf dem
Formular (`onKeyDown={(e) => e.stopPropagation()}`), und React ruft dafür auch das native
`stopPropagation()` am Wurzelknoten — über dem liegt das Dokument, und dort hört `@dnd-kit`s
`KeyboardSensor`, sobald ein Drag läuft (`core.esm.js:1147`). Ein Tastatur-Nutzer nimmt einen
platzierten Bereich mit der Leertaste auf dem Griff auf; derselbe Tastendruck stieg zum Kasten auf,
klappte das Formular auf, und dessen Namensfeld holte sich per `autoFocus` den Fokus — mitten im
Drag. Von da an kam beim Sensor nichts mehr an.

Gemessen an der gebauten App mit echten Tastendrücken, Bereich `right` des `editorial`-Frames
(`2 / span 4`, `10 / span 3`), Griff fokussiert:

| | vorher | jetzt |
| --- | --- | --- |
| Leertaste | Drag läuft, Formular offen, Fokus im Namensfeld, „liegt über Zeile 2, Spalte 11“ | Drag läuft, Formular zu, Fokus auf dem Griff, dieselbe Ansage |
| Pfeil links | nichts | „… Spalte 10“ |
| Escape | nichts | „right abgebrochen, nichts verschoben“ |

Und vorher endete der Drag beim neunten Tab — dem ersten Tastendruck außerhalb des Formulars — als
Ablage: `11 / span 2` statt `10 / span 3`. Der Guard sitzt jetzt am Hörer statt an dem, was
aufsteigt: `PlacedBox` reagiert nur noch auf `e.target === e.currentTarget`, das Formular braucht
keinen eigenen mehr, und der Griff behält seine Leertaste für sich. Gegengeprobt, dass der Fix
oben seine Wirkung behält: Leertaste auf dem Kasten klappt auf, „a b“ im Namensfeld kommt an,
Return lässt das Formular offen.

**Nachtrag (2026-09-08, neuntes Review): Die zwei Sätze um die Ablage wussten davon nichts.** Ihre
Überschrift hieß „Verfügbare Bereiche (ins Raster ziehen, um sie zu platzieren)“, der Hinweis
darunter endete mit „Zeilen- und Spalten-Spanne gibt es nur für einen platzierten Bereich“ — und
darüber lag seit dem Nachtrag oben ein Chip, der platziert ist, „ausgeblendet“ sagt und seine
Spannen zeigt. Beides war wörtlich wahr und las sich als Widerspruch zu dem, was daneben stand.
Die Überschrift heißt jetzt „Bereiche, die hier nicht im Raster liegen“ — beide Arten, ohne
Anweisung: Sie ist zugleich der Name, mit dem `dndAccessibility` das Ablageziel ansagt („right
liegt über …“), und die Anweisung steht ohnehin im Satz eine Zeile darunter. Der endet jetzt mit
„ein hier ausgeblendeter Bereich behält dabei Zeilen- und Spalten-Spanne, ein nie platzierter hat
keine“. Gemessen an der gebauten App, `right` des `editorial`-Frames auf Desktop ausgeblendet:
Überschrift, Chip („right · Rechte Seitenleiste · ausgeblendet“) und Hinweis sagen dasselbe.

## Das Board rollt seitwärts in sich selbst, und der Tastatur-Drag hat gefehlt (2026-09-16)

`npm run smoke` meldete auf 1280×800 „Layout · layout: Inhalt scrollt horizontal“, und zwar bei
jedem Lauf. Gemessen an der gebauten App mit Wegwerf-Profil gegen eine Kopie von
`navigations-testprojekt` hatte `main` dort `scrollWidth` 1100 gegen `clientWidth` 1030, das Board
selbst 1068 gegen 966.

**Die Ursache ist nicht im Code dieser App, sondern in der Frame-Box des Projekts.** Das Board
rendert die echte Geometrie: zwölf Spalten, `gap: 2rem 4rem`. Bei 966 px Platz sind die sechs
`1fr`-Spalten schon auf 0 px geschrumpft, übrig bleiben sechs feste à 57,33 px = 344 px — und
**elf Lücken à 64 px = 704 px**. Zusammen 1048 px. Gaps schrumpfen nicht, also passt das Frame bei
dieser Fensterbreite nicht, und das Board sagt genau das.

Zwei Verdächtige, die es nicht sind, beide an der laufenden Seite durchprobiert: Die Grid-Items
tragen `min-width: auto`, aber ein `min-width: 0` auf alle dreizehn ändert nichts (1048 px vorher
wie nachher); `overflow-wrap: anywhere` auf jeden Nachfahren ebenso wenig, einzeln wie zusammen.
Der Inhalt ist nicht das Problem, die Lücken sind es.

**Der Fix ist ein Roller am Wrapper** (`overflow-x: auto` am `div` um das Grid): `main` steht
danach auf 1030 gegen 1030, der Roller sitzt an der Panelkante, wie es die Regel „Wer rollt, ist
nicht wer die Breite deckelt“ für einen Panel-eigenen Roller verlangt, und nichts wird
abgeschnitten (kein positioniertes Kind im Board, nichts ragt senkrecht heraus; das Board steht
danach bei `clientHeight` 2147 gegen `offsetHeight` 2157, also 10 px Rollleiste). Im Code gemessen,
nicht nur per `eval`: `npm run smoke` meldet seither nichts mehr, auf beiden Größen.

### Was die erste Fassung dieses Absatzes dem Roller zuschrieb

Der erste Anlauf am selben Tag ließ den Überlauf stehen, weil eine Messung ihn teuer aussehen ließ:

    ohne Roller, Space + ArrowDown:  „quartz-layout-box liegt über page-title.“
    mit  Roller, Space + ArrowDown:  „quartz-layout-box aufgenommen.“  (unverändert)

Die zwei Zeilen stimmen, und der Schluss daraus war falsch. Sie wurden in *dieser* Reihenfolge
gemessen, Roller zuerst — und der Unterschied gehört dem Versuch, nicht dem Roller: Der **erste**
Pfeil nach dem Aufnehmen rollt bloß den Scroll-Container, der zweite bewegt. Nachgemessen in sechs
kontrollierten Durchgängen mit vorher gesetztem `main.scrollTop`, abwechselnd mit und ohne Roller
(achtzehntes Review, Befund 3): bei `scrollTop 0` rollt der erste Pfeil `main` um 40 px und bewegt
nichts, der zweite bewegt; bei `scrollTop 280` tat damals keiner von beiden etwas — mit und ohne
Roller gleich. `main` ist ohnehin `overflow-y: auto`, also der Scroll-Container, den `@dnd-kit`
sieht; ein Roller am Wrapper ändert daran nichts.

Der Mechanismus, den der Absatz nannte, ist echt: `handleKeyDown` in `@dnd-kit/core` 6.3.1 ruft
`scrollTo` und kehrt ohne `handleMove` zurück, wenn das Ziel in der unteren Hälfte des Containers
liegt und die Bewegung rein senkrecht ist. Er wirkt nur schon vorher, über `main`, und trifft den
Frame-Builder genauso.

### Der Preis war kein Preis, sondern ein fehlender Sensor

Was die Messung als Kosten des Rollers las, war der Zustand des Boards ohne ihn: `GlobalBoard` gab
seinem `DndContext` **keine Sensoren** mit, zog also mit dnd-kits Vorgabe von 25 px je Pfeildruck —
bei 51 px von Zeile zu Zeile (eine 43-px-Karte plus die 8 px `gap` der Zone; die 52 px daneben
sind die `min-h` der *Zone*, nicht die einer Zeile — gemessen am 2026-09-16) ein Treffer nach
Zufall, und für einen Chip aus der Palette gar keiner.
`CLAUDE.md` zählte das Board dabei seit dem neunten Review zu den vier Stellen, die es richtig
machen. Gemessen an der gebauten App, echte Tastendrücke, je frischer Mount:

    Palette („explorer“), Space + 3× ArrowDown + Space
      ohne Sensoren:  dreimal „liegt über Komponente hinzufügen“, dann „bei Komponente hinzufügen
                      abgelegt“ — nichts eingefügt, HEADER unverändert
      mit  Sensoren:  „liegt über quartz-layout-box“, „liegt über page-title“, dann „bei page-title
                      abgelegt“ — HEADER trägt danach explorer #2
    Board (erster Griff), scrollTop 280, Space + 2× ArrowDown
      ohne Sensoren:  beide Pfeile ohne Wirkung
      mit  Sensoren:  erster Pfeil rollt, zweiter „liegt über explorer“

Der Getter ist `nearestDroppableCoordinates` und nicht `sortableKeyboardCoordinates`: Ein
Paletten-Chip ist ein `useDraggable` und kein Droppable, und der Getter aus `@dnd-kit/sortable`
liest `droppableContainers.get(active.id)` — für einen Chip also nichts; dazu hat das Board leere
Zonen, auf die keine Sortierliste zeigt. Der Zeiger-Sensor ist wörtlich dnd-kits Vorgabe
(`PointerSensor` ohne Optionen), damit sich am Ziehen mit der Maus nichts ändert.

Mit dem Getter kostet der Roller nichts mehr: dieselben Tastenfolgen mit echtem `overflow-x: auto`
im gebauten Renderer ergeben Zeile für Zeile dasselbe wie ohne (`scrollTop 0`: 0 / 35 / 118,5 und
„liegt über page-title“; `scrollTop 280`: der zweite Pfeil bewegt; Palette: „bei page-title
abgelegt“, `explorer #2` steht danach im Kopfbereich). Deshalb ist der Roller jetzt drin.

Die drei Zahlen gehören dazu, wie das Board damals war: Das Aufnehmen klappte die Karte des Griffs
auf (Befund 1 des neunzehnten Reviews), also maßen sie eine Liste, die 65 px länger war als die,
die der Nutzer vor dem Space sah. Mit dem Guard an der Karte ist dieselbe Folge **0 / 2,5 / 53,5**,
Karte durchgehend 43 px — gleiche Form, gleicher Satz („liegt über page-title“ beim zweiten Pfeil),
andere Zahlen.

**Was daraus als Regel bleibt:** Wer zwei Zustände vergleicht, vergleicht sie in beiden
Reihenfolgen — sonst misst er den ersten Versuch. Und eine Begründung, die eine Frage schließt,
wird an dem geprüft, was sie behauptet: Der Getter, den dieser Absatz für unwissend erklärte, war
an diesem Board gar nicht angeschlossen.

### Nachtrag (2026-09-17, zwanzigstes Review): der erste Pfeil verpuffte auch ohne Rollen

Der Absatz oben schreibt den verschluckten ersten Pfeildruck dnd-kits `handleKeyDown` zu, das statt
zu bewegen den Scroll-Container rollt. Der Mechanismus ist echt, aber er ist nicht der ganze Grund:
Gemessen an der gebauten App mit **gesetztem** `main.scrollTop`, je frischer Mount, Chip
`table-of-contents` aus der Palette, alte gegen neue Fassung des Getters:

    alt, scrollTop 0     Space 0 · Palette → ArrowDown 0 · Palette → ArrowDown 194 · layout-box
    alt, scrollTop 280   Space 280 · Palette → ArrowDown 280 · Palette → ArrowDown 280 · layout-box
    neu, scrollTop 0     Space 0 · Palette → ArrowDown 233 · layout-box → ArrowDown 284 · page-title
    neu, scrollTop 280   Space 280 · Palette → ArrowDown 280 · layout-box → ArrowDown 280 · page-title

Bei 280 rollt **nichts** (der Wert steht still), und der erste Druck verpuffte trotzdem. Der Grund
liegt im Getter: Die Palette ist selbst ein Ablageziel, der Chip liegt darin, und ihr Zentrum lag
knapp „vor“ dem des Chips — also gewann sie ihren eigenen Vergleich. Im Frame-Builder ist dieselbe
Sache handfester: Dort meldete dnd-kit das gezogene Rect 26,5 px hoch, wo das Rect derselben Box 48
ist, das eigene Ziel lag 11 px „unter“ dem eigenen Zentrum und gewann *jeden* Druck — ArrowDown
bewegte den Bereich `header` nie, die Live-Region sagte vor wie nach dem Druck „header liegt über
header“.

Zwei Zeilen im Getter (`utils/dndKeyboard.ts`): Ein Ziel, in dem der Ausgangspunkt schon liegt, ist
kein Schritt; und der Ausgangspunkt ist die Mitte des **kleinsten** Ziels, in dem man steht, statt
der Mitte des gezogenen Rects. Das zweite ist nötig, weil der erste Druck sonst in einer anderen
Zelle *derselben* Zeile landete; auf einer Sortierliste ist das kleinste enthaltende Ziel die
gezogene Zeile selbst, dort ändert sich damit nichts. Nachher im Frame-Builder: ArrowDown → „über
before-body“, noch einmal → „über page-body“, ArrowUp zurück, Links/Rechts durch die Spalten, Space
legt ab (samt Überschneidungs-Warnung), Escape bricht ab, der Fokus bleibt auf dem Griff.

**Was daraus als Regel bleibt:** Ein Ergebnis mit einer Begründung, die es nur halb trägt, ist ein
Befund in Wartestellung — hier stand die halbe Begründung neun Tage, und die andere Hälfte machte
den Tastatur-Drag eines ganzen Reiters unbrauchbar.


## Nachtrag (2026-09-17, einundzwanzigstes Review): das gezogene Rechteck war der ganze Bereich

Der erste waagerechte Pfeildruck aus einem breiten Bereich sprang in dessen Mitte: `header`
antwortete auf ArrowRight mit „Zelle Zeile 1, Spalte 7“ und lief von dort spaltenweise zurück
(6, 5, 4) — ein Druck, der sechs Spalten wert war, in einem Drag, in dem jeder andere eine wert
ist.

Die Ursache sitzt **nicht** im Pfeil-Getter. Mit einer Sonde in ihm an der gebauten App abgelesen:
dnd-kit gibt dem `DragOverlay` die Größe des gezogenen Knotens — hier die Box des Bereichs,
1060 px breit — und misst dann dessen *einziges Kind* (`getMeasurableNode`, `core.esm.js:2413`),
und das war ein Block-`div`, also ebenfalls 1060 px. Der Getter zentriert dieses Rechteck auf der
Zielzelle; für Spalte 2 ergab das eine linke Kante bei −70, und der `KeyboardSensor` scrollt dann,
statt zu bewegen. Gemessen (`out.x = -69,99` beim ersten Druck, `cur.x` danach unverändert 310,
während `cur.y` den Rückgabewert übernahm): erreichbar war nur, was weit genug rechts lag.

Ein Versuch, das im Getter zu beheben — der erste Druck geht von der linken oberen Ecke des
Bereichs aus —, machte es schlimmer: Der Druck traf dann Spalte 2, das 1060-px-Rechteck landete
bei −70, der Sensor scrollte, und der Drag bewegte sich gar nicht. Behoben ist es deshalb dort,
wo die Zahl entsteht: **`w-fit` am Chip im `DragOverlay`**, damit das gezogene Rechteck so breit
ist wie das, was gezogen wird — so breit wie die Chips in der Ablage ohnehin sind.

Gemessen an der gebauten App mit echten Tastendrücken (Wegwerf-Profil, Projektkopie,
`colorscheme none`), Frame `drawing`, Bereich `header`:

    waagerecht  vorher   7, 8 — zurück 7, 6
                nachher  2, 3 — zurück 2, 1
    senkrecht   nachher  Zeile 2 Spalte 1, Zeile 3 Spalte 1 — zurück 2, 1
                         (vorher landete es auf den Bereichen darunter, weil das
                          1060-px-Rechteck mit jeder Zelle der Zeile überlappte)
    Ablage      ArrowUp aus Zeile 1 erreicht sie weiterhin

`utils/dndKeyboard.ts` ist dabei unverändert geblieben; die Regel des zwanzigsten Reviews („ein
Schritt geht von dem Feld aus, auf dem man steht“) trägt mit dem richtigen Rechteck genauso.

**Was daraus als Regel bleibt:** Wer eine Rechnung nachbessert, prüft zuerst, ob ihre *Eingabe*
stimmt. Das gezogene Rechteck war nie das, was gezogen wurde.

## Nachtrag (2026-09-17): ein Schritt zurück auf den eigenen Platz wird angesagt

`onDragOver` schwieg, wenn das gemeldete Ziel das eigene Feld ist. Der Grund dafür ist echt —
dnd-kit meldet das eigene Feld in dem Augenblick, in dem etwas aufgenommen wird, und der Satz
würde das „aufgenommen“ übertönen —, aber er gilt nur für diesen einen Augenblick. Seit der
Pfeil-Getter jeden Druck zählen lässt, ist ein Hin und Zurück in zwei Drücken erreichbar, und dann
behielt die Live-Region den Satz von davor. Gemessen am Layout-Board: `ArrowDown` → „liegt über
page-title“, `ArrowUp` → derselbe Satz, obwohl das Overlay wieder auf dem Ausgangsplatz stand.

Gefragt wird jetzt am **Namen**, nicht an der Id — der Name ist das, was vorgelesen wird —, und die
Antwort auf die Rückkehr ist ein eigener Satz (`dnd.backHome`). Damit fällt auch die zweite Antwort
auf dieselbe Lage weg: Im Frame-Builder war der eigene Platz ein Kasten mit eigener Id, der auf
denselben Namen beschrieben wird, und dort sagte die Region schon **beim Aufnehmen** „header liegt
über header“ — die Aufnahme-Ansage war also von Anfang an übertönt, genau das, was der Guard am
Board verhindern sollte.

Seit der Chip schmal ist (Nachtrag oben), meldet der Frame-Builder beim Aufnehmen die *Zelle*, und
die heißt anders als der Bereich — der Namensvergleich greift dort also nicht mehr. Deshalb ein
zweiter Ref: die **erste** Meldung eines jeden Drags schweigt. Gemessen, beide Bretter, vorher und
nachher, mit echten Tastendrücken.

`useDndAccessibility` heißt dafür so und hält seine zwei Refs: alle drei Aufrufstellen rufen sie aus
dem Render-Body, und ein Drag rendert sie bei jedem Wechsel von `over` neu — eine einfache Variable
wäre vor dem zweiten Satz wieder zurückgesetzt.

## Nachtrag (2026-09-17): ein Ablegen, das nichts bewegt

Dieselbe Frage wie in `onDragOver`, am anderen Ende des Drags: Wer aufnimmt und ohne Bewegung ablegt, hörte „X bei X abgelegt“ — ein Satz, der eine Bewegung behauptet. Erreichbar mit zwei Tastendrücken und mit einem Klick auf den Griff, der kein Pixel zieht. Gemessen am Layout-Board mit echten Tastendrücken: `Space, Space` sagte vorher „quartz-layout-box bei quartz-layout-box abgelegt“ und sagt jetzt „quartz-layout-box blieb an seinem Platz“; `Space, ArrowDown, Space` ist unverändert („… bei page-title abgelegt“). Gefragt wird am Namen, nicht an der Id, aus demselben Grund wie oben: Im Frame-Builder trägt der eigene Platz eine eigene Id.

## Nachtrag (2026-09-17, zweiundzwanzigstes Review): der erste Satz nennt auch das Ziel

Der Guard, der die erste Zielmeldung schluckt, damit sie das „aufgenommen“ nicht übertönt, hatte einen Preis, den erst eine Messung zeigte: Wo diese Meldung einen *anderen* Platz nennt als das Ding selbst — im Frame-Builder die Zelle, auf der ein Bereich liegt —, war Schweigen die einzige Antwort, die der Nutzer bekam. Ein erster Pfeildruck, der dasselbe Ziel behält, ändert nichts und löst deshalb gar kein `onDragOver` aus. Gemessen (Chip `left` aus der Ablage, echte Tastendrücke): `Space` → „left aufgenommen.“, `ArrowDown` → nichts, `ArrowDown` → „Zelle Zeile 2, Spalte 1“. Jetzt trägt ein Satz beide Hälften („left aufgenommen, liegt über Zelle Zeile 1, Spalte 1.“); wo das gemeldete Ziel denselben Namen hat wie das Gezogene — das Layout-Board meldet das eigene Feld —, bleibt es beim Schweigen, sonst hieße es „X aufgenommen, liegt über X“.

## Nachtrag (2026-09-17, dreiundzwanzigstes Review): „eigener Platz“ ist eine Auskunft der Aufrufstelle

Der Satz oben endet auf „wo das gemeldete Ziel denselben Namen hat wie das Gezogene“ — und genau
dieser Vergleich trägt nur dort, wofür er gewählt wurde. Im Frame-Builder hat der eigene Platz eine
eigene Id (`box:<id>`) und löst zum selben Wort auf; am Layout-Board ist Namensgleichheit dagegen
der Normalfall zweier *verschiedener* Dinge: Ein Paletten-Chip trägt den Namen des Plugins, das er
dupliziert, und dasselbe Plugin darf mehrfach platziert sein. Dieselbe Lage hat die Plugin-Liste,
wo zwei Instanzen desselben Plugins gleich heißen. Jede Ablage auf dem Namensvetter galt damit als
„nichts bewegt“ — für jemanden, der nur die Ansage hat, die gegenteilige Auskunft.

`useDndAccessibility` bekommt deshalb ein `isHome` neben `describe`. Die Vorgabe vergleicht die Ids
und stimmt überall dort, wo der eigene Platz die eigene Id ist — sortierbare Listen und das
Layout-Board; der Frame-Builder reicht seine eigene Antwort herein. Gemessen an der gebauten App
mit echten Tastendrücken nach `el.focus()`, gegen eine Zone mit drei `quartz-navigations`
nebeneinander:

    vorher   Space      „quartz-navigations aufgenommen.“
             ArrowDown  (nichts — die Region behält den Satz von vorhin)
             Space      „quartz-navigations blieb an seinem Platz.“ — die Zeile ist einen
                        Platz gewandert
    nachher  Space      „quartz-navigations aufgenommen.“
             ArrowDown  „quartz-navigations liegt über quartz-navigations.“
             Space      „quartz-navigations bei quartz-navigations abgelegt.“

Gegenproben, beide nachher: `Space, Space` auf derselben Zeile sagt weiter „blieb an seinem Platz“,
und im Frame-Builder sagen `Space` / `ArrowRight` / `Escape` weiter „aufgenommen, liegt über Zelle
Zeile 1, Spalte 1“ / „liegt über Zelle Zeile 1, Spalte 2“ / „abgebrochen, nichts verschoben“.
Vorher ebenfalls gemessen, wortgleich zum Review: eine Zeile, die drei Plätze gewandert war
(`quartz-layout-box` über `page-title` und `search` auf ihren Namensvetter), meldete beim dritten
Pfeildruck „liegt wieder auf seinem Ausgangsplatz“ und beim Ablegen „blieb an seinem Platz“.

**Und die Palette bekommt einen Namen statt einer Anweisung.** Ihre Überschrift ist eine
Aufforderung („Komponente hinzufügen“) und als solche richtig — vorgelesen wird sie aber seit
`pickedOver` bei jeder Aufnahme aus der Palette, und zwar als Ablageziel. Der Frame-Builder sagt in
seinem Kommentar genau deshalb, warum sein Ablage-Label ein Name ist. Gemessen: vorher „page-title
aufgenommen, liegt über Komponente hinzufügen.“, nachher „… liegt über Komponentenvorrat.“

**Nachtrag (2026-09-17, vierundzwanzigstes Review): der Paletten-Chip wohnt im Vorrat, nicht unter
seiner eigenen Id.** Die Vorgabe von `isHome` — „der eigene Platz ist die eigene Id“ — trägt an drei
der vier Dinge, die sich in dieser App ziehen lassen. Am Layout-Board nicht: Ein Paletten-Chip heißt
`palette:<index>`, sein Platz ist `palette-drop-zone`. Jeder Satz über den Vorrat las sich damit als
Bewegung, und der Schritt zurück, für den `dnd.backHome` geschrieben wurde, kam dort nie vor.
Gemessen an der gebauten App mit Wegwerf-Profil und echten Tastendrücken (Kopie von
`navigations-testprojekt`, erster Chip fokussiert):

    vorher   Space      „table-of-contents aufgenommen, liegt über Komponentenvorrat.“
             ArrowDown  „… liegt über quartz-layout-box.“
             ArrowUp    „… liegt über Komponentenvorrat.“
             Space      „… bei Komponentenvorrat abgelegt.“ — es ist nichts passiert
    nachher  Space      „table-of-contents aufgenommen.“
             ArrowDown  „… liegt über quartz-layout-box.“
             ArrowUp    „… liegt wieder auf seinem Ausgangsplatz.“
             Space      „… blieb an seinem Platz.“

Nicht mit eingeschlossen: eine platzierte Einzelinstanz, die auf dem Vorrat abgelegt wird. Sie
bewegt sich ebenfalls nicht (der Zweig davor braucht ein Duplikat), aber der Vorrat ist nicht ihr
Platz — „blieb an seinem Platz“ wäre so falsch wie „abgelegt“, und das braucht einen eigenen Satz,
nicht diese Frage.

**Nachtrag (2026-09-18, fünfundzwanzigstes Review, Befund 6): die zwei Ablagen auf dem Vorrat, die
der Absatz darüber ausdrücklich offengelassen hat.** Beide kamen als „X bei Komponentenvorrat
abgelegt“ heraus, und beide sind etwas anderes als eine Bewegung: ein platziertes **Duplikat** wird
dort gelöscht, eine platzierte **Einzelinstanz** bleibt liegen, wo sie war. Gemessen an der
gebauten App mit echten Tastendrücken (Kopie eines echten Projekts, ein Duplikat in der Config):

    table-of-contents (Duplikat)   Space, 12x ArrowUp, Space
      vorher   „… bei Komponentenvorrat abgelegt.“   Zeilen auf dem Board 34 → 33
      nachher  „table-of-contents aus dem Layout entfernt.“
    search (einzige Instanz)       Space, 3x ArrowUp, Space
      vorher   „… bei Komponentenvorrat abgelegt.“   Zeilen 33 → 33
      nachher  „search bleibt, wo es war — nur ein Duplikat lässt sich in den
               Komponentenvorrat zurücklegen.“

Was eine Ablage *bedeutet*, weiß nur die Aufrufstelle — wie der Name einer Drag-Id und wie
`isHome`. `useDndAccessibility` nimmt dafür ein drittes, optionales `dropOutcome`; wo es nichts
sagt, bleiben die gewohnten Sätze. Genutzt wird es heute nur vom Layout-Board. Dabei fielen zwei
Sätze im Doc-Kommentar, die seit `e5e1099` nicht mehr stimmten: die Vorgabe von `isHome` hat genau
einen Nutzer (die Plugin-Liste), und es sind drei Stellen, die ziehen, nicht zwei.

**Nachtrag (2026-09-18, sechsundzwanzigstes Review, Befund 7): die Ablehnung im Frame-Builder.**
`handleDrop` lehnt eine Ablage ab, die einen anderen Bereich überdeckt, und sagte das über
`announce()`; dnd-kits Region sagte im selben Augenblick „left bei Zelle Zeile 2, Spalte 2
abgelegt.“ Der Frame-Builder gibt jetzt ein `dropOutcome` mit, das dieselbe Rechnung fragt wie
`handleDrop` (`landing()`), und der zweite `announce()` fällt weg. Gemessen an der gebauten App mit
echten Tasten (Space, Down, Down, Right, Space auf `left`): „left bleibt, wo es war — dort
überschneidet es sich mit einem bestehenden Bereich.“, die Region der Seite schweigt. Dazu der Satz
des Layout-Boards für eine Löschung auf dem Vorrat: Sie trifft immer eine Instanz von mehreren und
heißt jetzt „Ein Duplikat von X aus dem Layout entfernt.“

**Ein Chip auf seiner eigenen Ablage (2026-09-18, siebenundzwanzigstes Review, nebenbei 1).** Das
Review hörte „left bei Bereiche, die hier nicht im Raster liegen abgelegt“ und las die Ablage als
wirkungslos. Sie war es nicht: Der Chip in seiner Szene war ein *ausgeblendeter* Bereich, und
`unplaceAreaById` löschte dessen Platzierung — Zeile, Spalte und Spannen, die der Chip noch trägt —
bei einem Drag, der dort endete, wo er begann. Gemessen per Maus an der gebauten App
(`navigations-testprojekt`-Kopie, erstes Frame, Chip `left`): vorher „· ausgeblendet“ danach weg und
der Satz „abgelegt“, jetzt bleibt der Chip, wie er war, und die Ansage sagt „left blieb an seinem
Platz.“ Die Ablage gilt für jeden Chip als sein eigener Platz (`inTray`, dieselbe Frage, nach der die
Ablage ihre Chips rendert), in `isHome` wie in `handleDragEnd`.

**Nachtrag (2026-09-18, achtundzwanzigstes Review, nebenbei 4): Ohne Zeiger steht ein Drag beim
Aufnehmen auf seinem eigenen Feld.** Die Kollisionsrechnung des Frame-Builders fragt erst den
Zeiger, dann `closestCenter`. Bei einem Tastatur-Drag gibt es keinen Zeiger, und das ist für jeden
Schritt richtig — `nearestDroppableCoordinates` legt die Mitte des Gezogenen genau auf die des
Ziels —, nur nicht für den Augenblick des Aufnehmens: Ein Chip liegt dann in der Ablage, deren
Mitte weit weg ist, und die Mitte der nächsten Zelle ist nah. Leertaste · Leertaste zielte so auf
eine Zelle und hätte den Chip dort platziert, wäre sie frei gewesen. Steht jetzt keine Zielmitte
auf der gezogenen, gilt das kleinste Ziel, das die Mitte enthält — dasselbe „Feld, auf dem man
steht“, von dem die Pfeiltasten ausgehen. Gemessen an der gebauten App, Kopie von
`navigations-testprojekt`, erstes Frame:

    Chip left (ausgeblendet), Space · Space
      vorher   „left aufgenommen, liegt über Zelle Zeile 1, Spalte 1.“ · „… bleibt, wo es war —
               dort überschneidet es sich …“
      jetzt    „left aufgenommen.“ · „left blieb an seinem Platz.“
    Chip left, Space · ↓ · ↓ · Escape   Zeile 1, dann Zeile 2, abgebrochen
    header (platziert), Space · Space und Space · ↓ · ↑ · Escape   vorher wie jetzt

**Korrektur (neunundzwanzigstes Review, Befund 4):** „vorher wie jetzt“ gilt für `header` im
ersten Frame und nicht allgemein. In den Frames „focus“ und „index“ zielte Leertaste · Leertaste
vor dieser Regel bei 5 von 13 platzierten Kästen auf eine *fremde* Zelle (`right` auf „Zeile 1,
Spalte 10“, `page-body` und die Körper-Bereiche in „index“ je auf „Spalte 5“) und wurde nur
abgelehnt, weil dort etwas lag; auf freiem Feld wäre der Kasten gewandert. Die Regel hat das
repariert, ohne dass es hier stand. Ebenso stimmte die Annahme des Auftrags nicht, gemessen sei
nur ohne Scrollen: Der Fokus auf dem Griff rollt `<main>` schon beim Aufnehmen, und der
`KeyboardSensor` scrollt bei jedem Pfeil nach unten, dessen Ziel unter der Mitte des Rollers
liegt — ein Zwischenziel erschien dabei in keiner Szene. Beides zugunsten des Codes; gemessen vom
Review an zwei gebauten Apps (alt und neu).

Dabei aufgefallen und nicht mit erledigt: Leertaste · Leertaste auf einem *platzierten* Bereich
sagt „header bei Zelle Zeile 1, Spalte 1 abgelegt“, obwohl nichts wandert — vorher genauso.
**Erledigt im Anschluss:** Die Zelle, an der die Platzierung eines Bereichs beginnt, ist jetzt sein
eigener Platz, neben `box:<id>` und der Ablage für einen Chip (`isOwnPlace`, zugleich `isHome` der
Ansagen). Ein Drag, der dort endet, ändert nichts — auch nicht die Auswahl, wie beim Chip auf der
Ablage. Gebaute App, `header`:

    Space · Space                  „header aufgenommen.“ · „header blieb an seinem Platz.“
    Space · ↓ · ↑ · Space          … „liegt wieder auf seinem Ausgangsplatz.“ · „blieb an seinem Platz.“
    Space · ↓ · Space              weiter „bleibt, wo es war — dort überschneidet es sich …“
    danach                         kein Bereichsformular offen

**Nachtrag (2026-09-18, neunundzwanzigstes Review, Befunde 3 und 5): Der Platz eines platzierten
Bereichs ist seine Startzelle, nicht die Mitte seines Chips.** Beim Tastatur-Drag ist das gezogene
Rechteck der Chip des `DragOverlay`, und der sitzt an der linken oberen Ecke des Kastens. Das
kleinste Ziel unter seiner Mitte ist in den echten Frames meist der Kasten selbst (die Mitte liegt
in einem 68-px-Spaltenabstand), bei schmaler erster Spalte aber eine *andere Zelle desselben
Kastens*. Zwei Folgen, beide älter als die Regel darüber: Der erste Pfeil ging von der Mitte des
Kastens aus (`page-body` auf Spalten 4–9 im Frame „focus“: ← „Zeile 2, Spalte 6“, → „Spalte 7“),
und mit Spalten von 20 px verschob Leertaste · Leertaste den Bereich um eine Spalte und kappte
dabei still seine Spanne. Jetzt trägt der Draggable eines platzierten Kastens seine Startzelle
(`data.home`), die Kollisionsrechnung gibt sie zurück, solange der Sensor nichts verschoben hat
(Translate null — nicht „keine Zielmitte liegt auf der gezogenen“, denn ein Schritt, den der
`KeyboardSensor` aufs Scrollen verwendet, lässt beides kurz zurück), und die Pfeile gehen von der
Mitte des Feldes aus, das die Kollisionsrechnung nennt, sobald das eine Zelle ist
(`nearestDroppableCoordinatesFrom`). Über einem Kasten oder der Ablage entscheidet weiter die
Geometrie, und das Layout-Board behält `nearestDroppableCoordinates` unverändert. Gemessen an der
gebauten App mit den Szenen des Reviews:

    focus, page-body (Sp. 4–9)   Space · ←   vorher Spalte 6    jetzt Spalte 3
                                 Space · →   vorher Spalte 7    jetzt Spalte 5
    drawing, Spalten 1–3 auf 20 px, Space · Space, alle fünf Kästen
                                 vorher je eine Spalte nach rechts abgelegt   jetzt „blieb an seinem Platz“
    alle vier Frames, alle platzierten Kästen, Space · Space   33 × „blieb an seinem Platz“

Gegenprobe ohne Änderung: Scrollen beim Pfeil nach unten (drawing, index), `custom-8` ↑ ↓ zurück
auf den Ausgangsplatz, Mobil mit der Zeile der Größe 0, ein Chip aus der Ablage (↓ landet weiter
auf Zeile 1, Spalte 1), `right` in die Ablage und zurück, die Maus 8 px und 400 px im eigenen
Kasten.

**Nachtrag (2026-09-18, neunundzwanzigstes Review, nebenbei 2): Eine Ablage am Rand, die die
Spanne kürzt, sagt das.** `landing()` kappt Zeilen- und Spalten-Spanne auf das, was ab der
Zielzelle noch ins Raster passt, und die Ansage sagte nur „abgelegt“ — wer sieht, sieht den Kasten
schmaler werden, wer hört, erfuhr es nicht. Das `dropOutcome` des Frame-Builders nennt jetzt die
gekürzte Spanne. Gebaute App, Frame „focus“, `right` in die Ablage, dann `page-body` (Spalten 4–9)
mit fünfmal → auf Spalte 9: „page-body bei Zelle Zeile 2, Spalte 9 abgelegt. Dort endet das
Raster: Spalten-Spanne jetzt 4 statt 6.“ Ein Schritt ohne Kürzung sagt weiter nur „abgelegt“.

**Nachtrag (2026-09-18, neunundzwanzigstes Review, nebenbei 3): Eine flexible Spalte der
Ablagefläche ist mindestens 24 px breit.** Die Fläche gibt das Raster des Frames in Panelbreite
wieder, und in Panelbreite fressen die Abstände eines echten Frames die flexiblen Spalten auf: Die
vier Frames dieses Projekts haben 4rem Abstand und sechs feste Spalten, und bei 1470 px Fenster
kamen ihre sechs `1fr`-Spalten auf 5 px — Zellen, die eine Maus unter einem überspannenden Kasten
nicht treffen konnte. Nur auf der Ablagefläche (nicht im erzeugten CSS, nicht in der Vorschau) wird
jetzt aus einem blanken `<n>fr` ein `minmax(24px, <n>fr)` (WCAG 2.2, Mindestgröße einer Zielfläche),
und die Fläche bekommt `min-width: min-content` in einem waagerecht rollenden Rahmen. Der Preis ist
genau dieses Rollen. Gebaute App, Frames „drawing“ und „focus“:

    1280 px   Spalten 57 · 57 · 57 · 24 ×6 · 57 · 57 · 57   Fläche 1234 in 932, rollt 302 px
    1470 px   dieselben                                       Fläche 1234 in 1122, rollt 112 px
    1728 px   57 ×3 · 48 ×6 · 57 ×3                           passt, rollt nicht
    Seite     rollt in keiner Breite waagerecht

**Korrektur (dreißigstes Review, Befund 5):** Die Tabelle nennt nur Desktop. Tablet rollt bei
1280 px ebenfalls (Fläche 990 in 932, 58 px), bei 1470 px nicht; Mobil nie.

Die Tastatur- und Mausszenen der Befunde 3 und 5 und des Nachtrags zur Spanne bei 1280 und 1470 px
unverändert. Eine Verschiebung: Beim zweiten ↑ von `right` in die Ablage (Frame „focus“) nennt die
Ansage während des weichen Scrollens „Zeile 1, Spalte 8“ als Zwischenziel, wo vorher „liegt über
header“ stand — ein Zwischenziel gab es also schon; jetzt ist es eine Zelle statt des Kastens,
weil die Mitte des Chips nicht mehr in einen 64-px-Abstand fällt.

**Nachtrag (2026-09-18, dreißigstes Review, Befund 1): Der `KeyboardSensor` des Frame-Builders
rollt ohne Gleiten.** Liegt das Ziel eines Pfeils jenseits der Mitte des Rollers, bewegt dnd-kit
nicht den Chip, sondern rollt den Behälter, per Vorgabe weich über rund 300 ms. In diesem Fenster
liegt keine Zielmitte auf dem Chip, der Rückfall nimmt das kleinste Ziel darunter — einen
Spaltenabstand, also den eigenen Kasten —, und die Ansage sagte zwischen zwei Spalten „liegt
wieder auf seinem Ausgangsplatz“; eine Leertaste in dem Fenster legte dort ab, gehaltene Pfeile
verloren Schritte. Seit dem waagerechten Roller (Nachtrag darüber) war das jeder breite Kasten auf
Desktop. Damit tragen zwei Sätze oben nicht: „ein Zwischenziel erschien dabei in keiner Szene“
(senkrecht gab es das schon vorher, mehrzeiliger Kasten durch die eigenen Zeilen) und „die
Tastatur- und Mausszenen … unverändert“ — die Szene des 29. Durchgangs stand mit dem Roller schon
am Anschlag, bevor der erste Pfeil fiel; der echte Tastaturweg (Tab auf den Griff, Pause) rollte.
Jetzt `scrollBehavior: 'auto'`. Gebaute App, Kopie mit `right` ausgeblendet, Frame „focus“,
`page-body`, Tab · Space · → → → → · Space:

    1280 px, 1200 ms je Taste   vorher dreimal „… Ausgangsplatz“ dazwischen   jetzt Spalte 5 · 6 · 7 · 8, keine Zwischenansage
    1280 px,   40 ms je Taste   vorher Spalte 7                                jetzt Spalte 8
    1470 px                     vorher einmal „… Ausgangsplatz“                jetzt keine
    mehrzeilig (left 3 × 1), ↓ ↓ ↑   vorher „Zeile 4 · Ausgangsplatz · Zeile 3“   jetzt ohne Zwischenansage, Plätze wie vorher

Nicht gemessen: ob der Sprung statt des Gleitens für Sehende stört, und das Layout-Board — es
behält die Vorgabe; ob dort ein weiches Rollen dasselbe Zwischenziel erzeugt, ist offen.
