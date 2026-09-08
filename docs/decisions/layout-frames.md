# Layout-Frames und Breakpoints

Aus CLAUDE.md ausgelagert (2026-09-02): die Messungen und Beobachtungen hinter den Regeln, wortgleich. Die Regeln selbst stehen in CLAUDE.md; hier steht, welches Experiment sie erzwungen hat. Neue Einträge kommen mit derselben Form dazu: was gemessen wurde, was daraus folgt.

**A frame's own box is per breakpoint, and every property is written out in every block.** Besides the grid itself, a `GridBreakpointLayout` carries `maxWidth`/`align`/`paddingBlock`/`paddingInline` (`buildFrameBox` in `shared/gridFrameCss.ts`). They are optional in the type but never optional in the output: desktop is the unconditional base and tablet/mobile are `max-width` media overrides of the *same* selector, so a value only emitted where it was set would leak downward — verified in a real build, where the narrower blocks reset it to `none`/`0` and a 1100px/700px viewport measured exactly that. `box-sizing: border-box` is emitted because Quartz sets no global box-sizing here, and without it a 900px cap plus 3rem of padding painted a 996px-wide frame. Both previews (`FrameBuilder`'s drop board, `GlobalBoard`) apply the same `buildFrameBox` output, so the box you drag areas into is the box that gets built.
  - **Three separate things each capped a frame that was supposed to fill the window, and all three were measured in a real build** (Chrome, a 1728px viewport, a frame with no maximum width and `align: center`, which rendered 778px wide and centred). **(1) An auto margin makes a grid item shrink-to-fit rather than stretch**, so `margin-inline: auto` with no cap collapsed the frame to its *max-content* width and `1fr 2fr 2fr` resolved to 149/298/298px. `width: 100%` (part of `FrameBoxStyle`, so both previews get it too) takes that path away; an auto margin then only distributes what a `maxWidth` genuinely leaves over — verified: 1728px uncapped, 900px at x=414 centred, x=828 right-aligned. **(2) Quartz caps every page at `.page { max-width: calc(<desktop> + 300px) }` = 1500px** and its own "full-width" frame does not lift it either, so `buildOuterGridOverride` emits `.page[data-frame="<name>"] { max-width: none }` — that makes the frame's own field the single place a width limit is decided. **(3) An `fr` track is `minmax(auto, 1fr)`**, so at 390px the declared `1fr 2fr 2fr` rendered as 149/71/106px because one area's content would not shrink below 149px — the editor's preview, whose placeholder areas have no such floor, showed proportions the build did not keep. `min-width: 0` (plus `min-height: 0`) on `.qgframe-area` fixes that; overflow is the trade-off and Quartz's own content styles absorb it — with a long unbreakable code line in an area the page still had no horizontal scroll at 390px. After all three: 1:2:2 holds exactly at 1728/1400/1100/700/390px, the frame fills the viewport minus Quartz's own 1rem `#quartz-body` padding below the desktop breakpoint, and nothing overflows. The tablet/mobile media queries were checked against Quartz's own edges and agree with them at exactly 1200px and exactly 800px.
  - **The breakpoint widths are the project's, not Quartz's — but only authored frames follow them.** `.quartz-gui/layout-breakpoints.json` (default 1200/800, exactly Quartz's own `$breakpoints`) is edited on the Layout page's **Global** tab and threaded into `buildFrameCss`, whose media queries were always ours to choose. Sass makes the alternative impossible: `$breakpoints` cannot be reconfigured from `custom.scss`, because `@use … with ()` fails once `base.scss` has loaded the module — the only project-wide route is editing the tracked core file, which this app does not do. So `buildQuartzBreakpointCompat` restates, scoped under `.page[data-frame="<name>"]` (which outranks core's bare `.desktop-only`), the handful of core rules that switch on Quartz's thresholds. That list is exhaustive, from grepping every consumer of `$mobile`/`$tablet`/`$desktop` in a real checkout: `.desktop-only`/`.mobile-only`, `#quartz-body`'s sub-desktop padding, plus `html`'s scroll-padding and one popover rule, which are cosmetic and left alone — and **no TS or JS in Quartz reads a breakpoint at all**, so CSS is the whole surface. Emitted only when the widths differ from Quartz's, so a project that never touches the setting gets byte-identical CSS to before. Verified end to end at 1000/600 in a real build: the frame's own layout, `#quartz-body`'s padding and `.mobile-only` all flip at exactly those widths (1001 vs 1000, 601 vs 600) instead of 1200/800, with no overflow — and switch back after resetting to the defaults. Built-in frames and community themes keep Quartz's numbers, which the editor's hint says.
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
