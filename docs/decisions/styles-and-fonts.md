# Stile, Variablen, Community-Themes und Schriften

Aus CLAUDE.md ausgelagert (2026-09-02): die Messungen und Beobachtungen hinter den Regeln, wortgleich. Die Regeln selbst stehen in CLAUDE.md; hier steht, welches Experiment sie erzwungen hat. Neue Einträge kommen mit derselben Form dazu: was gemessen wurde, was daraus folgt.

- **Everything that changes how the site looks lives on one page, ordered by the CSS cascade.** `routes/Styles/` has four sub-tabs — Basis (the classic `theme.colors`/`typography`, moved out of ConfigEditor, which now only links here), Community-Themes (the former standalone Themes route: catalog, presets, style settings), Variablen (CSS custom-property overrides) and Eigenes CSS (`custom.scss`) — in exactly the order they override each other, which the line under the tab bar states. `index.tsx` owns *all* editing state and exposes it through `useStyles()`: only one sub-tab is mounted at a time, so a lifted draft is what survives a tab switch, and the page has a single Save button that each sub-tab defines via `registerSave()`. **That one button speaks for the page, so what it registers has to write everything the page's `dirty` counts** — the badge, the Cmd+S guard and the leave dialog all read that same flag. Eigenes CSS registered a save that wrote only the tab in front while `dirty` counted every draft, which made the leave dialog a way to lose work: it offered Speichern, `runSaveCommand()` reported `true`, the navigation went ahead, and the drafts of the other tabs died with the route. It writes all of them since 2026-09-10, measured against the real project through the built app: two files edited, one click, both markers on disk. A per-file save is still a legitimate thing to offer — it just needs its own button saying so, and the one that did was removed on 2026-09-09. The old `/themes` path redirects to `?tab=theme` (the tab key stays `theme`; only its label became "Community-Themes"). The Community-Themes tab shows **only what the theme itself declares** — the raw `<id>@@<key>` editor that could write any CSS custom property from there is gone, because that is the Variablen tab's job and doing it in two places meant two different mental models for the same edit.
  - **The variable table is built from `theme.json`, not from scanning build output.** `variableGraphService` reads the installed `@quartz-themes/<id>` package's compiled `light.base`/`dark.base` — whose first rule is the theme's own `:root` block — because it needs no build, splits cleanly per mode, and mixes in nothing else; compiled build output only fills the gaps, and only from genuinely root-level selectors (a `.callout[data-callout]` declaration is a structurally different thing a global `:root` override can't reach). Both a `var()` in any value and the theme's own `brokenVarLinks` table feed one inverted dependency graph, which is what the "N abhängig" chip counts. Verified against a real project: 1030 variables, 503 of them derived, 394 with dependents. It reads that build output itself, which is what made the older `styles.scanBuildOutputVariables` channel dead - a whole IPC channel, contract entry and a second copy of `findCssFiles` that no screen had called since; it is gone.
  - **Resolving a value means following aliases *and* substituting embedded ones.** `src/routes/Styles/variableGraph.ts` does both, because ported themes are full of `var(--a, var(--b))` (a fallback that is itself a var, which no `[^)]*` regex matches — hence the brace-counting `pureAlias()`) and of `hsl(var(--x))` / `rgba(var(--x), .8)`, where the chain ends on a value that *contains* a reference rather than being one. Skipping either leaves a blank swatch next to a perfectly resolvable color. Both paths are depth-capped rather than cycle-tracked, since they call each other.
  - **The theme catalog says when it could not be fetched.** `npm search` failing left seven hard-coded placeholder themes standing in for a registry that really holds ~250 (measured), cached for fifteen minutes, with `invalidateCache()` exported and called from nowhere - so there was no way to even retry. `listThemes` answers a `ThemeCatalogResult` with `unavailable` now, a failed search is never cached, and the tab has a reload button. A failed *detail* fetch is no longer cached either: an hour of "this theme has no details" over one network blip was the previous behaviour.
  - **A community theme's options are labelled from the *upstream* Obsidian theme, not from the port.** A `@quartz-themes/<id>` package's theme.json ships only compiled CSS plus bare `classSettings` keys, so `styleSettingsSchemaService` resolves the theme id against `obsidianmd/obsidian-releases`' registry (slugified display name; 636 of 700 ported ids match, the rest fall back to the raw editor), fetches the original `theme.css` from `raw.githubusercontent.com/<repo>/HEAD/`, and parses its `/* @settings */` YAML into titles, descriptions, types, per-mode defaults, min/max/step, select options and the heading tree the form groups by. Resolved answers — **including `null`** — are cached in `userData/theme-docs/` permanently, since they describe a published upstream file; the tab's "Doku neu laden" button clears one. Class settings are cross-checked against the port's own `classSettingKeys`, because the upstream theme declares toggles whose CSS the port didn't carry over. Verified: Ultra Lobster 176 upstream settings → 139 usable, tokyo-night 179 across two blocks.
  - **A variable override beats an active community theme — verified, not assumed.** `@quartz-themes/core` emits *everything* it produces inside `@layer` (`obsidian-theme`, `quartz-themes-base`, `obsidian-theme-overrides`, style settings included), while Quartz appends `custom.scss` unlayered after `@layer quartz-base {…}` (`quartz/plugins/emitters/componentResources.ts`: `` `@layer quartz-base {\n${quartzBase}\n}\n${customStyles}` ``), and an unlayered declaration outranks every layered one regardless of load order. Confirmed end-to-end against a real build (ultra-lobster + an override on `--background-primary`): computed `--background-primary` and the painted `body` background were the override's value in *both* modes. That is what the blue note at the top of the Variablen tab states — together with the one real limit, a variable a theme only ever declares inside a scoped selector, which no `:root` rule can reach.
  - **Expanding a variable row is not overriding it.** The editors open pre-filled with `baseValue()` — the value that would apply *without* this key's own override — and `VariableRow` only writes one when a draft differs from that pair, which is also how typing the original back removes it again. Anything that compares against `effectiveValue()` instead would count every expanded row as changed, since that function reads the override first. There is no "Anpassen" link any more, and the "Von dir" badge means a real difference.
  - **`<input type="color">` needs a hex, and a theme's values are almost never one.** `cssColorToHex()` (in `variableGraph.ts`) normalises through canvas' `fillStyle`, i.e. the browser's own color parser, so `hsl(…)`/`rgb(…)`/an alias chain all reach the picker as `#rrggbb`. It is primed with a sentinel first, because an unparseable value leaves the previous `fillStyle` standing — without that, "not a color" reads as black. Feeding the raw draft straight in was the bug where the picker showed white next to a swatch painting the real color. **Canvas answers in three notations, and all three are read** (measured in this Electron on 2026-09-10): `#rrggbb` for an opaque colour, `rgba(r, g, b, a)` for a translucent one, and `color(srgb r g b / a)` — channels in 0..1 — for a `color-mix()` in sRGB, which is what the example template's own drawer tint is. What canvas keeps *outside* sRGB is deliberately `null`: `oklch(70% .1 200 / .5)` and `color(display-p3 1 0 0)` come back as themselves, and squeezing either into `#rrggbb` would hand the picker a colour the page is not painting — so the picker opens on black there and the text field beside it stays the way to edit them. The comment used to promise "every notation the browser can paint", which was two notations more than the parser had.
  - **Writing a style setting is not just `<id>@@<key>: value`.** `src/routes/Styles/styleSettings.ts` owns the encoding, because core implements only half of Style Settings' own semantics: a boolean is a class toggle, a string matching a `classSettings` key is a class select, anything else is emitted literally as `--<settingId>`, and a `@@light`/`@@dark` suffix **on the setting id** scopes it (without one the value lands in *both* modes). On top of that, a `variable-themed-color` with `format: hsl-split` is three variables (`--accent-h/-s/-l`, values `202`/`100%`/`75%`) — `--accent: #80D0FF` does nothing at all — and `format: rgb` wants `rgb(r, g, b)`. That is why the form takes **one batched patch** rather than a setter per key: such a color writes up to six keys, and six separate calls would each start from the same pre-change state and lose five.
  - **Quartz imports exactly one stylesheet, so the load order of every other one lives inside it.** `componentResources.ts` does `import customStyles from "../../styles/custom.scss"` and nothing else, so an extra file is only reachable *through* custom.scss - and Sass rejects a `@use` that follows a rule. `styleService`'s `imports` managed block therefore sits at the very top, right after Quartz's own `@use "./variables.scss" as *;` and **before** the leading comments, not after them: `upsertManagedBlock` appends at the end of the file, which would put a later hand-written rule above the block and break the build. The file stays the source of truth rather than a sidecar JSON - the project still builds without this app, hand-editing works, and there is no second copy of the order to drift. Verified against a real `npx quartz build`: reordering two files in the UI flipped which one's `--probe` survived into the emitted CSS, with custom.scss's own value winning over both. Extra files live under `quartz/styles/custom/` (created here) and `imported/` (copied in), which is exactly what `styleFileSubPath` pins - a bare `relativeSubPath` would still reach Quartz's own `base.scss`. An `@use` whose file no longer exists is dropped on the next write rather than kept, since leaving it in breaks the build; that is also why `renameStyleFile` reads the order *before* renaming, or the entry for the file being renamed no longer resolves and silently disappears.
  - **Saving is per file, and the reference list has two click targets per row.** The page's Save button and the editor's own both write only the tab in front - several open files are several separate pieces of work, and the tab bar's dots are what show the rest. `styles.checkSource` compiles the *unsaved* draft of one file on its own, which is not an approximation: with Sass modules a partial sees nothing of what included it, so compiling it alone is exactly how the build sees it (custom.scss, being the entry, pulls in the chain anyway). In `CssVariableReference` the name inserts `var(--x)` while the swatch copies the resolved value - two needs, two targets - and the literal value is no longer printed next to either: it was the widest thing in a narrow sidebar and ran out of the card.
  - **Two independent mechanisms load webfonts, and `theme.fontOrigin: local` on its own does *not* mean the site avoids Google.** Quartz core (`Head.tsx` + `componentResources.ts`) links `fonts.googleapis.com` for `fontOrigin: "googleFonts"` with `cdnCaching: true`, downloads and self-hosts under `<baseUrl>/static/fonts` with `cdnCaching: false`, and emits nothing at all for `"local"` (its branch is a comment reading "let the user do it themselves in css"). But the plugin **`@quartz-community/quartz-fonts` has its own `fontOrigin`** with a different vocabulary — `"googleFonts"` (its **default**, so an entry with no options set *does* call Google) or `"selfHosted"`, which downloads at build time and emits `static/fonts/quartz-fonts.css`. Verified by building a real project twice: with the plugin's default the built HTML links Google even though `theme.fontOrigin` is `local`; with `selfHosted` there is no `fonts.googleapis.com` reference anywhere and the `.ttf` files ship in `public/static/fonts`. A **third** source is the easiest to miss: `@quartz-themes/core` emits its theme's `@font-face` rules against a hardcoded `FONT_CDN_BASE = "https://unpkg.com"`, so an active community theme means third-party requests regardless of either setting above, and its only off switch is the plugin option `themeFonts: false` — which *drops* the theme's fonts rather than localising them (verified: 22 unpkg references in the built CSS without it, 0 with it). `src/routes/Styles/fontDelivery.ts` is the one place that knows this — it reports *every* loader (both can be active at once) and the Basis tab's self-hosting switch flips the two Google ones together, writing the plugin option by array index and core's `cdnCaching`; the theme's fonts get their own control, because turning them off changes how the site looks rather than only where the files come from. Both self-hosting paths rewrite URLs to `baseUrl`, and the plugin throws without one, so an empty baseUrl is a build failure rather than a detail.
  - **What weights and styles exist is read, not guessed.** `collectFontFaces()` reports the `@font-face` rules the site really has: the font files a community theme ships (`theme.json`'s `meta.fontFiles`, with family, style and weight per file, variable ranges like `"100 1000"` included) plus every `@font-face` in the project's own stylesheets. What Quartz *requests* from Google is reproduced separately by `src/routes/Styles/fontSpec.ts` from its own `formatFontSpecification()`: the defaults are **per slot** (header `[400,700]`, body `[400,600]` **plus italic**, code `[400,600]`), and a **single** configured weight is silently dropped — `if (weights.length > 1)` means `weights: [500]` emits no `wght@` at all and Google serves the family default, so the UI says "Standardstärke" rather than printing a number the site never loads. Differential-tested against the real `googleFontHref()` from a clone, that case included.
  - **A theme overriding a base value is asked per variable, never assumed for all of them.** The Basis tab dims exactly the colours and fonts the *installed* theme declares (`graph.vars[key].origin === 'theme'`, i.e. read from that theme's own `:root` block) and counts them in the banner. Nothing is disabled: a theme that happens not to declare `--textHighlight` leaves that field working, greying it out would be a lie, and setting a base value while a theme is on is how you prepare for switching the theme off. This is also why it is not a blanket rule — themes differ, and the answer has to come from the theme that is actually installed.
  - **Some conflicts can only be fixed in CSS, and those ship as a file the user owns.** `src/routes/Styles/cssFixes.ts` is a small catalogue: each entry knows whether this project is affected and generates a stylesheet, written into `quartz/styles/custom/` through the normal create/save path so it appears in the editor and can be edited, reordered or deleted like anything else. Nothing is applied silently. The first entry is the heading-font conflict: `quartz-fonts` emits `h1,…,h6 { font-family: … }` **unlayered**, which beats every `@layer` *and* — because its stylesheet is linked after custom.scss — an equally specific rule of your own; verified in a real build that neither a `--headerFont` override nor a plain `h1 { … }` changed anything, while `body h1` (one step more specific) did. The generated rules point at `var(--hN-font, var(--headerFont))` so the Variablen tab is back in control: with the fix, h1 followed the theme's own Getai and h2 fell back to the header font.
  - **The SCSS check compiles with the *project's* sass, not one bundled here.** `checkStyles()` resolves `sass` via `createRequire(<project>/package.json)` - the same dart-sass `esbuild-sass-plugin` uses in a real build (`quartz/cli/handlers.js`) - so the check can never disagree with the build over a language feature, and this app gains no dependency. A project without `node_modules` returns `unavailable`, never `ok`: "cannot check" and "no errors" are different answers. That this loads project code into the main process, next to `safeStorage`, and why that is accepted: `process-model-and-ipc.md`, "Code from a project's `node_modules` runs inside the main process". The error's `span` is mapped back to a `relativePath` so the banner can open the file it actually came from, which is regularly not the one being edited.
  - **Anything that writes `custom.scss` behind the editor's back must call `reloadScss()`** — variable overrides and the local-font import each rewrite their own managed block (see `styleService`'s markers), and without the re-read the CSS tab's next save would write the pre-change file straight back. An unsaved draft is never discarded silently: it stays, flagged `staleOnDisk`, and the CSS tab offers an explicit reload.

**Zehn Kategorien, alle offen, drei Bildschirme (2026-09-03).** Die Karte „Hauptvariablen" rendert
64 Zeilen in zehn Kategorien, und sie standen alle immer da: gemessen bei 1728×1000 waren das
2620 px Inhalt in einem 875 px hohen Bereich. Jede Kategorie klappt jetzt auf und zu, offen ist nur
*Grundfarben* — die neun anderen sind daraus abgeleitet, wer sie sucht, sucht gezielt. Danach:
929 px, 9 Zeilen statt 64. Der Kopf einer zugeklappten Kategorie nennt die Anzahl und, wenn darin
etwas überschrieben ist, wie viel — sonst hieße „finde meine eigene Änderung" alle zehn zu öffnen.
Der Zustand liegt in `useStickyState`, überlebt also einen Bereichswechsel und keinen Neustart, wie
jedes andere „wo war ich" in dieser App.

Der Kopf trägt eine Fläche (`ink` bei 4,5 %, in beiden Schemata dasselbe Gewicht). Ohne sie sitzt
eine Überschrift optisch näher an den Zeilen *darüber* als an ihren eigenen — genau der Eindruck
einer einzigen langen Liste, den das Zuklappen beheben soll.

**Zweispaltig wäre die falsche Antwort gewesen.** Die Zeile ist 1380 px breit und ihr Inhalt endet
bei 500 px, also lag es nahe. Dagegen spricht das Aufklappen: eine offene Zeile braucht die volle
Breite, in zwei Spalten hätte jedes Aufklappen die halbe Liste verschoben. Die Breite geht
stattdessen an eine Sache, die sie nicht verdient hat: das Abzeichen „Letzter Build" stand auf 60
von 64 Zeilen wortgleich am rechten Rand. Es ist aus der Zeile raus und erscheint nur noch als
Abweichung („Von dir", „Community-Theme"); dafür nennt das aufgeklappte Panel die Herkunft jetzt
für jede Zeile, was es vorher nicht tat.

**Ein Sprung öffnet die Kategorie seines Ziels.** Die Abhängigkeits-Chips navigieren zu einer
Variablen und scrollen zu ihrer Zeile. Mit zugeklappten Kategorien gibt es diese Zeile unter
Umständen nicht — `navigateTo` schlägt den Schlüssel deshalb in `CSS_VARIABLES` nach und öffnet
seine Kategorie mit, bevor der Scroll läuft.

**Die Schriftvorschau zeigte die Ersatzschrift und sagte es nicht (2026-09-03).** Der Musterknopf in
„Aktuell geltende Schriften" setzt `fontFamily` auf den Stack der Website — nur lädt dieses Fenster
die Schriften der Website nirgends: die CSP lässt keinen externen Host zu, und eine Schrift, die
Quartz beim Seitenaufruf von Google holt, hat im Projekt auch keine Datei zum Lesen. Im Alpha-Test
gemeldet („sieht mir nicht danach aus"), danach nachgemessen: „Schibsted Grotesk", „Source Sans Pro"
und „IBM Plex Mono" ergeben auf einem Canvas exakt dieselbe Textbreite wie ein erfundener
Familienname, „Helvetica" nicht. Die Probe war also die Ersatzschrift, in jeder der vier Zeilen.

`document.fonts.check('16px "X"')` beantwortet die Frage **nicht** — es meldete für alle vier
Familien `true`, die nachweislich zurückfielen. Der Breitenvergleich gegen eine Familie, die es
nicht geben kann, beantwortet sie, weil ein Rückfall exakt die Metrik des Rückfalls erzeugt.
`fontIsAvailable()` in `fontSpec.ts` macht genau das, einmal pro Familie und gemerkt.

Was daraus folgt, ist eine Anzeige statt einer Reparatur: die Zeile sagt „nicht installiert", die
Probe steht in Muted, und *einmal* unter dem Block steht, was das heißt. Viermal derselbe Satz
liest sich als vier Probleme. Eine echte Vorschau bräuchte die Schriftdatei im Renderer — neuer
IPC-Kanal plus `font-src 'self' data:` in der CSP — und hülfe nur bei selbst mitgebrachten oder
vom Theme gelieferten Schriften; zurückgestellt.

**Und die Farben stehen jetzt als Tabelle da.** Neun Paare als umbrechende Reihe von Feldern, die
Werte selbst nur im `title` — ein Hex, für das man erst hovern muss, ist kein ablesbarer Wert.
Jetzt `Variable | Hell | Dunkel` mit Feld und Hex nebeneinander, Kopieren pro Hälfte wie vorher.
Der Schriftblock daneben ist von vier Zeilen pro Schrift auf zwei runter, damit die beiden Blöcke
gleich hoch enden: die Box sitzt über dem Editor, und jede Zeile hier ist eine Zeile, die man zum
Schreiben wegscrollen muss.

**In der Editor-Seitenleiste fügt jetzt jeder Klick ein (2026-09-03).** Die Leiste hatte zwei
Klickziele mit zwei verschiedenen Zielen: der Name fügte `var(--x)` in den Editor ein, das Farbfeld
kopierte den Wert in die Zwischenablage. Der Editor steht einen Zentimeter daneben — die
Zwischenablage war der Umweg. Beides fügt jetzt ein, und **⌥ + Klick** kopiert, für Farbfeld *und*
Namen; es ist dieselbe Geste mit einem anderen Ziel. Was eingefügt wird, bleibt pro Ziel
verschieden, und das ist der Punkt: der Name fügt `var(--x)` ein, damit die Regel der Variablen
folgt, ein Farbfeld das Literal dieser Hälfte, was man braucht, wenn eine Regel eine Farbe
*treffen* statt ihr folgen soll.

Die Zeile hat dabei ihre Hover-Fläche verloren. Die beiden Dinge, die man treffen kann, sagen es
selbst — der Name unterstreicht, ein Feld bekommt einen Ring —, und ein Farbblock hinter der ganzen
Zeile ließ die Leiste wie eine Liste ausgewählter Einträge aussehen. Dieselben aufklappbaren
Kategorien wie im Variablen-Tab, dieselbe Komponente (`VariableGroup`), Grundfarben offen. Eine
Suche hebt das Zuklappen komplett auf: eine Suche, die ihre eigenen Treffer in zugeklappten
Kategorien versteckt, wäre schlechter als keine.

**Die letzte Deklaration jeder Regel fiel unter den Tisch (2026-09-03).** `DECLARATION_RE` im
`variableGraphService` verlangte hinter dem Wert ein `;` oder `}`. Beides fehlt genau einmal pro
Regel: `eachRule()` übergibt den Rumpf *ohne* die schließende Klammer, und minifiziertes CSS spart
das Semikolon hinter der letzten Deklaration. Wer zuletzt im Block steht, existierte für die
Variablen-Tabelle also nicht. Gegen einen echten Build von `gui-test` gemessen: drei Deklarationen,
`--codeFont` (hell), `--textHighlight` (dunkel) und `--accent-l` — der Graph kannte 70 Variablen,
mit dem Fix 72.

Sichtbar wurde es erst durch die neue Farbtabelle. Ohne dunklen Wert fällt `baseValue()` auf den
hellen zurück, und `--textHighlight` stand für beide Modi auf `#fff23688`, während Config und
gebaute CSS für dunkel `#b3aa0288` sagen. Vorher war daneben nur ein 12-px-Feld, jetzt steht der
Hex da — dieselbe Sorte Fund wie beim Schlüssel, der als Schlüssel gerendert wurde: die Anzeige
war das Messgerät.

Der Rückfall selbst bleibt, wie er ist. Eine `:root`-Deklaration ohne dunkles Gegenstück gilt in
beiden Modi — den hellen Wert für dunkel zu zeigen, ist dann richtig und nicht geraten. Falsch war
nur, dass das Gegenstück existierte und nicht gelesen wurde. `parseDeclarations` in
`styleService.ts` hat dasselbe Muster und bleibt ebenfalls unangetastet: es liest ausschließlich
den Block, den `renderVariableOverrides()` selbst schreibt, und der endet immer auf `;`.

## Der Farbwähler zeigt, was dasteht (T2, 2026-09-03)

`<input type="color">` kennt nur `#rrggbb`. Alles andere — `var(--secondary)`, ein `hsl()`, ein
Verlauf, eine Kette, die ins Leere zeigt — ersetzt es still durch Weiß, und alle drei Aufrufstellen
gaben ihm dafür `'#ffffff'` mit. Zwei davon zeigten dieses Feld direkt, also stand da ein weißes
Kästchen für eine Variable, die eine echte Farbe hat: das eine, wofür der Wähler da ist, war genau
dann falsch, wenn der Wert interessant war.

Jetzt ein gemeinsames `ColorPicker`: das Eingabefeld ist durchsichtig, die Farbe liegt dahinter —
das Muster, das die Basis-Seite schon hatte, nur an allen drei Stellen. Der Browser malt, was CSS
versteht, und das ist deutlich mehr, als der Wähler annimmt. Zwei Dinge kamen beim Messen dazu:

- **Gemalt wird über `isDisplayableColor`, nicht mit dem rohen Wert.** Das CSSOM *verwirft* einen
  Wert, den es nicht parsen kann, und behält den vorherigen — nach dem Tippen von
  `linear-gradient(red, blue)` in ein Farbfeld zeigte das Kästchen weiter das Grün von eben. Ein
  unmalbarer Wert ist jetzt durchsichtig.
- **Der Startwert des Wählers ist Schwarz statt Weiß**, wenn es keinen Hex gibt. Er entscheidet nur,
  wo sich das Betriebssystem-Fenster öffnet; Schwarz sieht dabei weniger nach „gelesen: weiß“ aus.

Im Produktions-Build gemessen, in der Variablen-Ansicht: bei `#faf8f8`/`#161618` zeigt das Kästchen
die Farbe und der Wähler startet dort; nach `var(--secondary)` zeigt es das aufgelöste `#10bc3b` und
startet dort; nach `linear-gradient(red, blue)` ist es durchsichtig und der Wähler startet auf
Schwarz, während der Titel den rohen Wert nennt. Nichts davon wurde gespeichert.

**Ein `@use` bekommt einen Namensraum, sobald sein eigener nicht trägt (2026-09-06).** Der Block,
den `setImportOrder` schreibt, bestand aus `@use "./custom/<name>";` — ohne `as`, also mit dem
Namensraum, den Sass aus dem Dateinamen ableitet. Zwei Namen, die die App selbst erlaubt, machen
daraus einen Fehler, der **das gesamte CSS des Projekts** stoppt (mit dem dart-sass des Projekts
gemessen, nicht aus der Dokumentation geschlossen):

    @use "./custom/01-typografie";      The default namespace "01-typografie" is not a valid
                                        Sass identifier.
    @use "./custom/typo.grafie";        There's already a module with namespace "typo".
    @use "./custom/typo";

Der erste stand als BEFUNDE 2 in der Liste, der zweite fiel beim Nachmessen auf: Sass leitet den
Namensraum nur bis zum **ersten Punkt** ab, und `styleFileName` erlaubt Punkte.

Nicht der Dateiname wird eingeschränkt — nummerierte Stylesheets sind der Grund, warum jemand eine
Ziffer voranstellt. Stattdessen schreibt der Block ein explizites `as`, **nur wo es nötig ist**:
`ns-01-typografie` für einen ungültigen Namen, `typo-2` für einen schon vergebenen, und für jeden
gewöhnlichen Namen bleibt die Zeile, die sie immer war. Niemand tippt diese Namensräume, sie
existieren nur, weil Sass je Modul einen verlangt.

Der Rückleser trägt das ohne Änderung: `parseImportOrder` matcht `@use\s+["']([^"']+)["']` und
ignoriert alles dahinter, die Reihenfolge überlebt den Roundtrip also. Nachgefahren durch die App
an einem echten Projekt, mit `styles.check()` nach jedem Schritt: dreimal `ok`.

**Eine importierte Schrift bringt ihr Gewicht selbst mit (2026-09-06).** Die erzeugte
`@font-face`-Regel bestand aus `font-family`, `src` und `font-display`. Was fehlte, entscheidet,
wie die Schrift aussieht: Ohne `font-weight` hält ein Browser die Datei für 400 und **fälscht**
jeden fetten Schnitt daraus, statt die mitgelieferte Achse zu benutzen; und zwei Schnitte derselben
Familie — aufrecht und kursiv — beanspruchen dieselbe Kennung, sodass der zweite den ersten
verdrängt (BEFUNDE 3). Die Beispielvorlage korrigierte den Block deshalb nach jedem Import von
Hand.

`fontFile.ts` liest jetzt, was die Datei sagt: die `wght`-Achse aus `fvar`, sonst `usWeightClass`
aus `OS/2`, dazu das Kursiv-Bit aus `OS/2` **oder** `head` (beide behaupten es, und sie widersprechen
sich in freier Wildbahn). Für eine variable Schrift ist das Gewicht ein Bereich, kein Wert —
gemessen an den vier Schriften der Vorlage: `400 700`, `100 900`, `100 900`, `400 800`. Inter trägt
also eine breitere Achse, als sein Dateiname sagt, und genau das hätte niemand von Hand eingetippt.

Hand geschrieben statt eine Abhängigkeit dafür zu holen, aus demselben Grund wie der ZIP-Leser in
`zipArchive.ts`: gebraucht werden drei Zahlen aus zwei Tabellen. Für WOFF2 heißt das, die
Tabellenlängen im Brotli-Strom aufzuaddieren, um an `OS/2` und `fvar` zu kommen — mit der
Besonderheit, dass die Transformationsregel für `glyf` und `loca` **invertiert** ist (dort ist
Version 0 die Transformation, 3 die Null-Transformation; bei allen anderen Tabellen umgekehrt).

**Jeder Fehlschlag endet bei `null`, nie bei einer Ausnahme.** Eine Schrift, die dieser Leser nicht
versteht, ist immer noch eine, die der Browser benutzen kann, und ein Import darf daran nicht
scheitern. Gemessen an `/System/Library/Fonts/LastResort.otf`, das gar keine `OS/2`-Tabelle hat:
Der Import läuft durch, die Regel entsteht wie vorher, und die Oberfläche sagt es — „die Datei nennt
kein Gewicht" ist eine eigene Meldung, keine stille Lücke. Dieselbe Unterscheidung wie bei
`unavailable` überall sonst in dieser App.

Gegen die drei Fälle in der laufenden App gefahren: `100 900`, `100 900` + `italic`, und die Regel
ohne Gewicht — danach `styles.check()` → `ok`.

**Sechs Aufgaben-Zustände statt zwei (2026-09-06).** Obsidian lässt in den Klammern jedes Zeichen
zu — `[/]` in Arbeit, `[-]` verworfen, `[>]` verschoben, `[?]` fraglich — und Quartz warf sie bis
vor kurzem weg. Seit `obsidian-flavored-markdown` das Zeichen als `data-task` an das `<li>`
schreibt, kommen alle sechs an (im Build der Beispielvorlage gezählt), und die Vorlage zeichnet
sie: ein gerundetes Kästchen mit der Marke darin, Akzentfarbe für die zwei, die noch irgendwohin
führen, gedämpft für die drei, die es nicht tun.

Zwei Dinge daran waren nicht vorherzusehen und sind gemessen:

**Eine Maske schneidet den Rahmen weg.** Der erste Entwurf gab dem Kästchen einen `border` und
legte die Marke als `mask-image` darauf; der Rahmen war im Bild nicht da, in allen drei Engines.
Eine Maske beschneidet alles, was das Element malt — Rahmen, Schatten, Hintergrund. Also gehört
der Kasten *in* die Maske: Jeder Zustand ist ein Glyph aus Rechteck plus Marke, das Element selbst
malt nichts, und der offene Zustand ist das Rechteck ohne Inhalt.

**Für den Parser ist jedes Zeichen außer dem Leerzeichen ein Haken.** `[/]`, `[-]`, `[>]` und `[?]`
kommen mit `checked` am Input an, und Quartz' eigenes `li:has(> input:checked)` streicht sie durch.
Vier der sechs Zustände waren damit durchgestrichen, obwohl nur zwei erledigt sind. Für die drei
offenen nimmt die Vorlage das ausdrücklich zurück.

Dazu eine Kleinigkeit, die dieselbe Regel in WebKit anders aussehen ließ: `em` an einem
Formularelement rechnet gegen dessen eigene Schriftgröße, und WebKit gibt Eingabefeldern eine
kleinere — 12×12 px gegen 14×14 in Chrome und Firefox. `font: inherit` macht daraus überall
dasselbe Kästchen.


**Der Marker über die Versionsgrenze (2026-09-18, siebenundzwanzigstes Review, Befund 3).** Seit
der Umbenennung `Quartz-GUI:managed:` → `QuartzControl:managed:` liest die App beide Namen. Was
auf der anderen Seite passiert, war nur als „hängt einen zweiten an“ beschrieben; gemessen am
`styleService` aus `v1.0.0-beta.2` (Bündel) gegen eine Kopie von `navigations-testprojekt`, das
dieser Stand einmal geschrieben hat: beta.2 liest 0 von 50 Variablen und 0 von 30 importierten
Dateien, hängt beim Speichern einer Variable einen alten css-vars-Block ans Dateiende, und wer
eine Datei einschaltet, bekommt den alten imports-Block **in** den neuen (Zeile 35–37 von 3–38) —
Sass: „There's already a module with namespace "base".“ Verhindern kann ein neuer Stand das nicht,
nur lesen, was der alte hinterlässt. Drei Änderungen, gemessen mit demselben Ablauf (Bündel vor
und nach dem Fix, dazu beta.2):

    nach einem Schreiben (Variablen)   vorher imports/fonts alt, css-vars neu → jetzt alle drei neu
    beta.2 speichert --secondary, neu liest
                                       vorher 50 Variablen, --secondary fehlt, das nächste
                                       Speichern löscht sie von der Website
                                       jetzt 51, --secondary = beta.2s Wert, bleibt beim Speichern
    Leerzeilen im eigenen CSS          vorher beim Entfernen der alten Kopie über die ganze Datei
                                       zusammengezogen, jetzt nur an der Schnittstelle
    geschachtelter imports-Block       unverändert: gelesen 30, beim Speichern im Ganzen ersetzt,
                                       Check danach grün

Gelesen werden beide Kopien, in Dateireihenfolge, und bei den Variablen gewinnt je Schlüssel die
spätere — so wendet der Browser sie an. Geschrieben wird die Vereinigung an die Stelle der
*ersten* Kopie: Die spätere ist die, die der alte Build ans Ende gehängt hat, und an ihrer Stelle
wanderten alle 50 Variablen hinter die eigenen Regeln des Nutzers, um die eine zu behalten.
`stripManagedBlock` schließt die Lücke seitdem ebenfalls nur an der Schnittstelle (vorher
`\n{3,}` über die ganze Datei). Vorher gegen die zehn `custom.scss` unter
`~/Documents/QuartzProjekte/` verglichen, nur gelesen: Der Vorlagen-Export (alle vier Blöcke
heraus, dann `trim()`) ist in allen zehn byte-gleich; der css-vars-Block allein heraus weicht in
acht ab, und zwar nur um die Leerzeile, die die alte Fassung am Dateiende stehen ließ.

**Nachtrag (2026-09-18, achtundzwanzigstes Review, nebenbei 3): Der Schriftblock nimmt jede Regel
einmal.** Unter `projectWins` hängte der Vorlagen-Import die `@font-face`-Regeln des Pakets an die
des Projekts, auch wenn sie wortgleich dastanden, und der Schrift-Import hängte eine Datei, die
schon eingeführt war, ein zweites Mal an. Beide gehen jetzt über `joinUniqueRules`
(`styleService.ts`): eine Regel ist alles bis zu ihrer schließenden Klammer auf Tiefe 0, gleich
ist, was bis auf Leerraum gleich ist, die erste gewinnt. Das räumt nebenbei die Vereinigung zweier
Marker-Kopien auf, die dieselbe Schrift trugen. Gemessen an Bündeln beider Stände gegen die
Zwei-Kopien-Datei des Reviews (Kopie von `navigations-testprojekt`), `aus-alt.qtpl`:

                      vorher                 jetzt
    Ausgang           5 (Instrument Sans ×2)  5
    projectWins #1    9                       4
    projectWins #2    13                      4
    Schrift #1        14                      5
    Schrift #2 (dies. Datei)  15              5

Zwei Regeln derselben Familie mit verschiedenem Schnitt (`Inter` zweimal) bleiben zwei.

**Nachtrag (2026-09-18, achtundzwanzigstes Review, nebenbei 5): Der eine Sass-Fehler, dessen
Ausweg die App kennt, nennt ihn.** Schaltet beta.2 in einem Projekt, das schon den neuen Marker
trägt, eine Datei ein, schreibt es seinen Import-Block *in* den der App — zwei `@use` desselben
Namensraums, und der Check sagt „There's already a module with namespace …“ über einen Block, den
der Nutzer nicht geschrieben hat. Jedes Schreiben der Ladereihenfolge ersetzt das Paar durch einen
Block. `checkStyles` fragt deshalb bei einem Fehler die Datei (nicht Sass' Wortlaut, der für einen
von Hand verdoppelten Namensraum derselbe ist), ob eine Kopie des Import-Blocks in der anderen
steht, und setzt `nestedImportBlock`; „Eigenes CSS“ sagt dann einen Satz und bietet
„Ladereihenfolge neu schreiben“ an, das die bestehende Reihenfolge über `setImportOrder` schreibt.
Gemessen an der gebauten App mit der Zwei-Kopien-Datei des Reviews: Fehler in Zeile 36 mit Satz
und Knopf; nach dem Klick ein Import-Block statt zwei, 30 von 30 Einträgen in derselben
Reihenfolge, „SCSS kompiliert fehlerfrei“. Die Übersicht zeigt denselben Fehler weiter ohne den
Satz.

**Nachtrag (2026-09-18, neunundzwanzigstes Review, nebenbei 1): Das Band über einem veralteten
Entwurf sagt, wer die Datei geschrieben hat.** Es hieß für jeden Schreiber „von einem anderen Tab
geändert (Variablen-Überschreibung oder Font-Import)“, auch nach Ladereihenfolge, Pfeilen und dem
Knopf „Ladereihenfolge neu schreiben“ auf demselben Reiter, und nach einer CSS-Korrektur aus den
Grundlagen, die ebenfalls den Import-Block schreibt. `reloadScss` nimmt jetzt den Schreiber
(`'variables' | 'fontImport' | 'stylesheets'`, oder `'force'` für Speichern und Neu laden), und
das Band hat einen Satz je Schreiber. Gemessen an der gebauten App mit der Zwei-Kopien-Datei des
Reviews: Entwurf getippt, Knopf geklickt — das Band sagt „… geändert, weil sich die Stylesheets
geändert haben (Ladereihenfolge, Import oder neue Datei) …“. Handbuch 4.5 in beiden Sprachen
nachgezogen.

**Schriftdateien werden relativ zur Stildatei adressiert, nicht zur Domain (2026-09-19).** Der
Schriftimport und die Beispielvorlage schrieben `url("/static/fonts/<datei>")`. Der führende
Schrägstrich meint die Wurzel der Domain, und eine Website unter einem Unterpfad liegt nicht dort:
Das veröffentlichte Handbuch (`baseUrl: boxi-os.github.io/QuartzControl`) fragte nach
`boxi-os.github.io/static/fonts/inter-latin-400-700.woff2` (404), während die Datei eine Ebene
tiefer stand (200). Lokal fiel das nie auf, weil die Vorschau an der Wurzel läuft. Quartz baut
`custom.scss` in die eine `index-<hash>.css` im Wurzelordner der Website ein, und ein `url()` löst
sich gegen die Stildatei auf, nicht gegen die Seite. Also `static/fonts/<datei>`: Gemessen an einem
gebauten Example (Kopie im Scratchpad, `npx quartz build`), Chrome über Playwright, `python3 -m
http.server`: unter `/QuartzControl/`, auf einer Seite drei Ebenen tiefer und an der Wurzel alle
drei benutzten Schriften `loaded`, jede Datei mit 200. Gegenprobe mit dem Schrägstrich im gebauten
CSS unter dem Unterpfad: alle drei `error`, jede Datei 404. Der relative Pfad kommt unverändert
durch Sass und Quartz' CSS-Verarbeitung. Bestehende Blöcke stellt jedes Schreiben von
`custom.scss` mit um (`migrateOnWrite`, dieselbe Stelle wie die Markerumbenennung), ein Paket von
vorher wird beim Einspielen umgeschrieben und gilt nicht als Konflikt. Regeln außerhalb des
verwalteten Blocks fasst die App nicht an.

Das betrifft nicht die Google-Schriften, die Quartz bei „Schriften lokal ausliefern“ selbst
herunterlädt: Deren Adressen schreibt Quartz absolut auf die `baseUrl`
(`quartz/util/theme.ts`, `processGoogleFonts`), und die lokale Vorschau lädt sie deshalb von der
veröffentlichten Website — solange dort nichts liegt, gar nicht.

**„Schriften lokal ausliefern“ holt die Google-Schriften ins Projekt (2026-09-19).** Der Schalter
war Quartz' `cdnCaching: false`: Quartz lädt beim Build herunter, legt die Dateien *nur in den
Build* und schreibt ihre Adressen absolut auf die `baseUrl` (`processGoogleFonts`). Die lokale
Vorschau lud sie damit von der veröffentlichten Website, und solange dort nichts lag, von nirgends:
gui-test, alle sieben Dateien 404 unter `boxi-os.github.io/quartzcontrol-testing`, jede Schrift
fiel auf die Ausweichschrift. Jetzt stellt die App dieselbe Anfrage wie Quartz
(`shared/googleFontRequest.ts`, gegen Quartz' eigenes `googleFontHref` in vier Fällen
parametergleich, auch mit Objektform, einem Gewicht und Kursiv), legt die Dateien nach
`quartz/static/fonts/` und ihre Regeln relativ in einen eigenen verwalteten Block `google-fonts`,
und die Config sagt `fontOrigin: local`. Eigener Block, weil `fonts` die Importe des Nutzers
sind: „ungenutzte Schriften entfernen“ darf keine Google-Schrift treffen, ein Schriftwechsel keinen
Import. Die erste Zeile des Blocks ist die Anfrage, aus der er stammt — daran erkennt der nächste
Aufruf, ob es etwas zu tun gibt (1 ms statt eines Netzaufrufs). Mit einem Browser-User-Agent
liefert Google woff2 nach `unicode-range` geteilt, und eine Seite lädt nur die Teilmengen, die sie
braucht.

Wann geholt wird: beim Speichern auf der Stile-Seite (vor der Config, damit ein Fehlschlag die
Datei lässt, wie sie war) und vor jedem Build und Serverstart (`refreshGoogleFonts` in
`buildService`, neben den Frames), weil die Schriften die Config auch über Vorlagen-Import,
`quartz sync --pull` und Restore erreichen. Ein Fehlschlag dort ist eine Zeile im Log, gebaut wird
mit dem, was da ist. Die Stile-Seite liest `local` plus Block als „Google, lokal ausgeliefert“
(`presentFontDelivery`), der Entwurf behält die alte Schreibweise, und nur Laden und Speichern
übersetzen. Ein Projekt, das noch `cdnCaching: false` ohne Block trägt, zeigt den Schalter an, sagt
es und bietet „Jetzt ins Projekt holen“ an. Der Block reist mit dem Vorlagen-Teil `fonts`, nicht mit
dem freien Rest von `custom.scss`.

Gemessen an Kopien von gui-test mit der gebauten App (Wegwerf-Profil, Playwright): alter Modus →
Hinweis → Klick → `local`, Block, 29 Dateien; Schalter aus und speichern → `googleFonts`,
`cdnCaching: true`, Block und alle Dateien weg; wieder an → „Noch nicht im Projekt: …“, speichern →
29 Dateien; Routenwechsel → derselbe Zustand, nichts ungespeichert. Textschrift in der Datei auf
Inter gesetzt und über die App gebaut → „… ins Projekt geholt (23 Dateien)“, Open Sans weg; im
gebauten CSS kein `fonts.gstatic.com`, kein `fonts.googleapis.com`, keine `baseUrl`-Adresse, 43
relative Verweise; in Chrome unter `/quartzcontrol-testing/` alle drei Schriften `loaded`, jede
Datei 200. Export als `.qtpl` und Import in eine frische Kopie: ein Block, nicht verschachtelt,
`local`, 23 Dateien. Nicht davon betroffen: das Plugin „Fonts“ mit `selfHosted` (lädt weiter beim
Build auf die `baseUrl`) und `@quartz-community/og-image`, das beim Build selbst bei Google fragt,
um die Vorschaubilder zu zeichnen.

**Das Speichern der Stile-Seite schreibt alle vier Reiter, egal welcher vorn ist (2026-09-19).**
`save()` rief nur, was der vordere Reiter registriert hatte, und nahm danach die Vergleichsstände
für Config *und* Variablen neu. Gemessen an der gebauten App (Kopie von gui-test): Textschrift in
„Basis“ auf Lora, auf „Variablen“, „Eigenes CSS“ oder „Community-Themes“ gespeichert → Badge weg,
`quartz.config.yaml` weiter Open Sans, nach einem Routenwechsel Open Sans im Feld. Dieselbe Regel
wie beim elften Review, nur eine Ebene höher: Dort schrieb „Eigenes CSS“ nicht alle seine Dateien,
hier schrieb die Seite nicht alle ihre Reiter. Jetzt schreibt `save()` selbst, in dieser
Reihenfolge: `custom.scss` als Ganzes, die übrigen Stylesheets, die Config (samt Google-Schriften),
die Variablen — die letzten beiden ersetzen je einen verwalteten Block, und in der anderen
Reihenfolge schriebe der Entwurf die alten Blöcke zurück. Ein Reiter registriert nur noch, was
*nach* einem Speichern kommt (Schriften neu lesen, SCSS-Check). Nachgemessen: die drei Fälle oben
→ Lora in der Datei und nach dem Routenwechsel; CSS-Entwurf und `--secondary` zugleich, auf
„Basis“ gespeichert → beides in der Datei, der Editor zeigt die Datei, kein Veraltet-Band. Der Fall
„Entwurf in einer weiteren Stildatei, auf einem anderen Reiter gespeichert“ ist nur gelesen.

**Was das Speichern aller vier Reiter gekostet hat, und was es nicht mehr kostet (2026-09-20,
dreiunddreißigstes Review).** Zwei Dinge hielten vorher und hielten danach nicht mehr, beide an
der gebauten App mit frischen Kopien von `gui-test` gemessen:

*Der Entwurf in einer weiteren Stildatei.* `afterSave` las `fileDrafts` aus der Closure des
Renders, in dem es registriert wurde — und `registerSave` läuft in einem Effekt nach *jedem*
Render. Liegt zwischen `clearFileDrafts()` und dem Aufruf ein `await` (eine geänderte Farbe auf
„Basis“ genügt), ist die neu registrierte Closure leer, `loaded` wird nie nachgezogen, und der
Editor zeigt `fileDrafts[tab] ?? loaded[tab]`, also den Stand von vor dem Speichern. Gemessen:
Entwurf in `custom/a11y.scss`, eine Farbe geändert, vom CSS-Reiter gespeichert → Platte richtig,
Editor zurück auf „// Accessibility …“; eine weitere Zeile getippt und gespeichert → der Entwurf
war von der Platte weg. Mit nur einem kurzen `await` dazwischen gewann die alte Closure das Rennen
— es ist eines, kein Entwurf. `save()` reicht die geschriebenen Entwürfe jetzt an
`saveRef.current(drafts)` durch.

*Der veraltete `custom.scss`-Entwurf.* Schreibt jemand anderes die Datei, während der CSS-Reiter
einen Entwurf hält, bleibt der Entwurf mit `staleBy` stehen und der CSS-Reiter zeigt ein Band.
Seit alle vier Reiter schreiben, schrieben auch die drei ohne Band. Gemessen: Entwurf in
`custom.scss`, Pfeil „nach unten“ an der ersten Datei, auf „Basis“ gespeichert → die Reihenfolge
war zurückgenommen; Entwurf in `custom.scss`, Schrift importiert, auf „Basis“ gespeichert → die
`@font-face`-Regel der gerade importierten Schrift war weg, ihre Datei lag verwaist im Projekt.
`save()` schreibt `custom.scss` jetzt nur noch vom CSS-Reiter aus, wenn `staleBy` gesetzt ist,
sagt sonst, warum nicht, lässt die Seite `dirty` und gibt dem Verlassen-Dialog `false`. Auf dem
CSS-Reiter selbst bleibt das Überschreiben die Wahl, die es immer war — dort steht das Band.

**Der `google-fonts`-Block ist Datum und Kennzeichen zugleich, und das hat zwei Preise.** Er kam
mit `2c5a9b7` in `MANAGED_MARKERS`, also strich `stripAllManaged()` ihn beim Vorlagen-Import mit —
auf die Liste dessen, was `styles.apply` danach zurückholt, kam er nicht. Gemessen an Kopien von
`gui-test`, nur der Teil `styles` aus `minimal-lesbar.qtpl`: `projectWins` wie `packageWins`
hinterher ohne Block, `success: true`, 28 Schriftdateien verwaist, und die Bau-Tür sah es nicht,
weil `refreshGoogleFonts` am Block erkennt, ob es etwas zu tun gibt. Jetzt wird er wie `keptFonts`
zurückgeholt, und zwar nach Vorhandensein, nicht nach Inhalt: ein leerer Block ist das Kennzeichen
auch. Der zweite Preis blieb: `fontOrigin: local` ohne Block ist ein Zustand, den niemand nannte —
er entsteht auch bei einem Restore von `custom.scss` aus einem Snapshot von vor dem Holen. Dafür
gibt es jetzt `fontBuildState` mit `noRule`: Lädt gar niemand eine Webschrift und nennt keine
`@font-face`-Regel des Projekts die gewählte Familie, sagen beide Karten das. Gemessen: Block von
Hand herausgeschnitten → „Keine @font-face-Regel im Projekt nennt: Just Another Hand, Open Sans,
Roboto Mono“; Block wieder da → nichts.

**Was die Vorlage schreibt, schlägt, was „Basis“ wählt — in acht der neun Projekte dieses
Rechners.** `d4da5ef` hat die fünf ungeschichteten Schriftvariablen aus der Vorlage genommen; die
Projekte tragen sie weiter. Gemessen an einer Kopie von `navigations-testprojekt`: Quelle auf
Google, `body` auf Lora, „lokal ausliefern“, gespeichert → 26 Dateien, 28 Lora-Regeln,
`fontOrigin: local` — und `--bodyFont: "Inter", …` unverändert, die Website weiter Inter. Der
Reiter sagt es jetzt unter dem Feld, gefragt am `overrides`-Zustand der Seite; der Variablen-Graph
kennt nur `theme` und `build`, nicht den eigenen Block. Gegenprobe in `gui-test`, wo die vier
Variablen von Hand entfernt sind: kein Hinweis.

**Google lässt eine unbekannte Familie still aus.** Gemessen an der echten CSS2-API mit dem
User-Agent der App: `family=MeineSchrift` allein → 400; `family=Inter:wght@400;700&family=
MeineSchrift…` → 200 mit 14 Regeln, alle `Inter`. Die App fragt drei oder vier auf einmal, der
gewöhnliche Fall ist also die 200 — und der Satz, der für genau diesen Fall geschrieben ist
(„Meist ist ein Schriftname falsch geschrieben“), kam nie. `fetchGoogleFonts` hält die Familien
der Antwort jetzt gegen die der Anfrage und meldet die fehlenden; die Seite nennt sie nach dem
Speichern neben dem, was entfernt wurde. Und `unknownToGoogle` fragt `faces`: eine Familie, die
das Projekt selbst deklariert, ist niemandem unbekannt — der Satz stand unter einer Schrift, die
der Nutzer gerade importiert hatte.

**Wer fragt, ob eine Datei noch gebraucht wird, sucht breit.** `deleteUnreferencedFontFiles` und
`unusedImportedFonts` lasen `custom.scss` plus die zwei flachen Ordner, die die App selbst
beschreibt, und je Regel nur die erste `url()`. Am Bündel mit Mini-Projekten gemessen, eine
Familie „Alt“ auf `shared.woff2` und daneben eine eigene Regel des Nutzers auf dieselbe Datei:
zweite `url()` einer Regel, `custom/teil/own.scss`, `quartz/styles/meine.scss` — jedes Mal wurde
die Datei gelöscht, und `body { font-family: "Alt" }` in `quartz/styles/meine.scss` machte die
Familie „ungenutzt“. Jetzt: alle `.scss`/`.css` unter `quartz/styles`, rekursiv, und jede `url()`
einer Regel. `projectStylesheets()` bleibt, was es war — die Liste, die der Editor anbietet und
die Face-Liste meldet.

**Drei Grenzen an dem, was aus dem Netz ins Projekt geht.** Am Bündel mit selbst geschriebenen
Antworten: 300 Dateien à 1 MiB wurden in 242 ms geschrieben, ohne ein Wort; ein Dateiname, den
`FONT_FILE_NAME` nicht kennt, wurde übersprungen und ließ die Google-Adresse in der Regel stehen,
womit die Website „lokal“ bei Google lud und *jeder* Build wieder ins Netz ging (`fontFileIn()`
liefert für sie `undefined`, `allFilesPresent` wird nie wahr); eine 0-Byte-Datei unter dem
richtigen Namen galt zweimal als vorhanden — die Abkürzung nahm sie, und der Download ging an ihr
vorbei. Jetzt: eine Zahl (200) vor dem ersten Download, eine Summe (128 MiB) währenddessen, ein
unbekannter Name ist ein Fehler, und `usableFile()` beantwortet beide Fragen nach der Größe.
Gemessen danach: 300 Dateien abgelehnt ohne eine geschriebene, 20 × 8 MiB bei 17 abgebrochen,
10 × 8 MiB und die drei kleinen Dateien des Normalfalls durch, die 0-Byte-Datei neu geholt.
Und ein Lauf, der in der Mitte abbricht, nimmt mit, was er schon geschrieben hat: der Block
entsteht am Ende, also standen die Dateien sonst unter gar keiner Regel und wurden von nichts
mehr gelöscht.

**„Kein Netz“ ist eine eigene Antwort.** Ohne `catch` um die zwei `fetch` sagte die Seite
„TypeError: fetch failed (fonts:fetchGoogle)“ und das Build-Log klebte den englischen Fehler in
einen deutschen Satz. Drei Arten zu scheitern, drei Sätze: keine Route, keine Antwort in 20 s,
eine abgelehnte Anfrage. Gemessen am Bündel (6 ms / 20 001 ms / 2 ms) und an der gebauten App mit
einem `fetch`, das wirft wie Node ohne DNS: „Google Fonts ist nicht erreichbar.
(fonts:fetchGoogle)“, Badge bleibt, Config unberührt. Ob eine Verweigerung ein Timeout war, fragt
seither das Signal und nicht der Name des Fehlers — seit dem Wechsel auf Electrons `net.fetch`
(Proxy und Zertifikatsspeicher des Rechners, wie Update-Check und mitgelieferte Vorlage) ist es
nicht mehr Nodes Stack, der wirft.

**Der Fix für relative Schrift-URLs erreicht ein Projekt nur, wenn jemand darin schreibt.**
`migrateOnWrite` hängt an `upsertManagedBlock`, `upsertImportBlock` und `saveVariableOverrides`.
Gelesen in den neun echten Projekten: acht hatten noch `url("/static/fonts/…")`, darunter das
Handbuch — dessen veröffentlichte CSS fragte
`boxi-os.github.io/static/fonts/inter-latin-400-700.woff2` (404), während die Datei unter
`…/QuartzControl/static/fonts/…` lag (200). Der Wächter steht deshalb an der Tür, an der die Datei
gelesen wird: `buildService` ruft `styleService.migrateFontUrls()` neben `writeAllFrames()` und
`refreshGoogleFonts()`. Nur die URLs, nicht die Marker-Umbenennung der zweiten Hälfte von
`migrateOnWrite` — die kostet eine Fassung vor dem 2026-09-18 jeden verwalteten Block, den sie
lesen kann, und wer „Bauen“ drückt, hat das nicht bestellt. Gemessen an einer Kopie von
`navigations-testprojekt`: 4 root-relative `url()` vorher, 0 nach dem Start des Dev-Servers, und
der Satz im Log.

**Außerhalb des lateinischen Alphabets kostet eine Familie das Zwanzigfache, und beide Zahlen
daneben waren an Latein gemessen.** Der Fix des dreiunddreißigsten Reviews — „ein Dateiname, den
der Code nicht verwenden kann, ist ein Fehler“ — prüfte gegen `^[\w-]+\.(?:woff2|…)$`, und Google
benennt jede Scheibe einer CJK-Familie `<hash>.<n>.woff2`. Damit war jede japanische, koreanische
und chinesische Schrift nicht mehr speicherbar, unter einem Satz, der die Schuld bei Google sucht;
vorher war dieselbe Familie still zu sieben Achteln von Google ausgeliefert worden. Am echten
Google gemessen (User-Agent der App, 2026-09-20): eine lateinische Familie sind 7 bis 29 Dateien,
eine CJK-Familie 92 bis 126, vier CJK-Slots 439 bis 495 — die Dateidecke von 200 hätte also den
Normalfall dieser Nutzer getroffen, und steht seither auf 800. Die Byte-Decke ist reichlich: Alle
124 Dateien von Noto Sans JP sind 5,4 MB, die vier Familien zusammen 14,0 MB. Am Bündel gegen das
echte Google, drei Stände: vor dem Fix des dreiunddreißigsten 17 Dateien und 240 Regeln, die weiter
auf `fonts.gstatic.com` zeigten; danach 0 Dateien und ein Fehler; jetzt 137 Dateien und keine
fremde Adresse mehr.

**Die breitere Suche war an drei Stellen schmaler, als ihr Kommentar sagte.** `allStylesheets`
entscheidet, ob eine Schriftdatei gelöscht werden darf, und blieb an jedem Symlink stehen —
`readdir`s Dirent folgt keinem, also ist für einen Link sowohl `isDirectory()` als auch `isFile()`
falsch. Gemessen am Bündel, je ein Mini-Projekt mit einer eigenen Regel auf `shared.woff2` und
`removeImportedFont('Alt')`: `custom/` als Link, `custom.scss` als Link und `custom/own.scss` als
Link verloren die Datei alle drei. Dazu zwei Schreibweisen, die keine `url()` hergaben: die alte
„bulletproof“-Form mit zwei `src:`-Deklarationen (gelesen wurde die erste, die auf das `.eot`
zeigt) und `url("#{$f}/shared.woff2")`, bei dem `FONT_FACE_RE` am Brace der Interpolation endete
und die Regel deshalb gar keine `url()` hatte. Alle fünf behalten die Datei jetzt; der Lesepfad
ist unverändert (`navigations-testprojekt`: 4 Regeln, 3 Familien), und die Regex kostet nichts
messbar (2000 Rauten in 1 ms).

**Zwei Schreiber auf demselben Schriftordner lassen beide scheitern.** Speichern und Bau-Tür rufen
dieselbe Funktion, und wer abbricht, räumt auf — auch die Dateien, die der andere als „schon da“
übersprungen hat. Am Bündel gemessen, zwei überlappende Läufe, der zweite scheitert an seiner
siebten Datei: vorher scheiterten *beide*, der erste mit `ENOENT` beim `rename` einer Datei, die
der zweite gerade gelöscht hatte, und der Ordner blieb leer. Mit einem wartenden Schloss je
Projektpfad (`whileHoldingFonts`) läuft der erste durch, der zweite scheitert für sich, und jede
Datei, die der Block nennt, liegt da. Wartend und nicht ablehnend, weil keiner der beiden Aufrufer
ein Klick ist, den man wiederholen könnte, und die Bau-Tür den fertigen Stand sehen muss.

**Der Editor darf zwischen zwei Ständen nicht durch einen dritten.** `contentOf` liest
`fileDrafts[tab] ?? loaded[tab]`, und das Speichern leerte die Entwürfe mehrere `await` bevor der
Reiter `loaded` nachzog: Der Wert ging Entwurf → alter Stand → Entwurf. `@uiw/react-codemirror`
wendet eine Änderung von außen nicht an, solange getippt wird — es legt sie als `pendingUpdate`
zurück und holt sie nach Ablauf eines Latches nach, mit dem Wert von damals. Der dritte Wert ist
gleich dem Dokument, erzeugt also kein neues `pendingUpdate`, und rund 0,8 s *nach* dem
„Gespeichert.“ schrieb das alte den alten Stand in den Editor. An der gebauten App gemessen (Kopie
von `gui-test`, `custom/a11y.scss`, daneben eine Farbe geändert), vorher/nachher, fünf Zeilen: 0 ms
mit Klick, 0 ms und 150 ms mit Cmd+S, 150 ms mit einem zweiten SCSS-Entwurf und 300 ms mit Klick
fielen alle auf den alten Stand zurück und schrieben ihn beim nächsten Speichern über die Datei;
mit dem Leeren im selben Tick wie das Nachziehen hält jede. Die Grenze lag zwischen 150 und 300 ms
und hängt an der Dauer der IPC-Aufrufe, ist also keine Zahl zum Zitieren.

**Wer vorher fragt, was ein Löschen kostet, stellt dieselbe Frage wie der, der löscht.** Der
Bestätigungsdialog der Karte „Ungenutzte Schriften“ nannte die Zahl aus `unusedImportedFonts`, und
die zählte, wie viele Dateien die *Regeln dieser Familie* nennen — je Regel nur die erste `url()`,
und ohne zu fragen, ob eine andere Regel die Datei noch hält. `deleteUnreferencedFontFiles` fragt
beides. An der gebauten App gemessen (2026-09-20, Dialog im Hauptprozess gespiegelt), und der Satz
lag in beide Richtungen daneben: Mit einer eigenen Regel auf derselben Datei sagte er „1 Datei(en)“
und es ging keine; mit drei `url()` in der Regel der Familie sagte er „1“ und es gingen drei. Die
Kontrolle ohne beides sagte „1“ und es ging eine — die Zahl war also nicht offensichtlich falsch,
sondern nur meistens. Beide Seiten fragen jetzt dieselbe Funktion (`fontFilesNamedBy`,
`fontFilesStillNamed`), und der Fall „keine Datei“ hat einen eigenen Satz statt einer Null:
gemessen 1/1, 0/0 und 3/3. Die erste Messung des Drei-`url()`-Falls war ungültig und meldete
trotzdem ein Ergebnis — das Ersetzungsmuster im Skript nahm `../static/fonts/…` an, wo der Import
`static/fonts/…` schreibt, sodass die Regel nie umgeschrieben wurde; seither bricht der Lauf ab,
statt über eine Regel zu berichten, die er nicht geschrieben hat.

**Was diese Schicht in Gecko tut, ist am 2026-09-21 nachgemessen — und der Weg dorthin gehört
dazu.** Die Befunde vom 20. September (die Maske über der Graph-Vollansicht, die drei
Spaltenschalter, der Umbruch der zwei Kästen an der Mobilbreite, die drei Plugin-Korrekturen)
waren in Chromium und WebKit belegt und in Firefox nicht — er startet auf diesem Mac weder über
Playwright (Timeout nach 240 s) noch headless mit eigenem Profil („Could not find profile folder",
drei Wege probiert). Das ist die Lücke, die „kann nicht prüfen ist nicht alles gut" meint.

Der Weg, der trägt, ist die Debian-VM (`reference_debian_vm`): `npm i playwright` und
`npx playwright install firefox` laufen dort auf aarch64 durch und holen Playwrights **eigenen**
Firefox-Build — Playwright kann kein Standard-Firefox steuern, das System-Firefox 140 ESR der VM
ist also nicht der gemessene. Gemessen wurde gegen die *veröffentlichte* Website, nicht gegen einen
lokalen Bau, damit die Messung dasselbe trifft wie ein Besucher.

Sieben Messungen, und alle sieben stimmen mit Chromium und WebKit überein: der Schalter in drei
Zuständen; die Kästen bei 1440/902/901/900/390 px, mit der Kante genau zwischen 901 und 900; das
Overlay der Vollansicht 1440×1000 mit allen drei Messpunkten darauf; der Kopf 69 px hoch mit zwei
Kindern (274 + 435 gegen Chromes 267 + 436, also Schriftmetrik und keine Layoutfrage) und ohne
Überlauf; der leere Pager-Platzhalter 0×0; der Pager am Telefon zweizeilig; und das Akkordeon, das
nach einem Kapitelwechsel das gelesene Kapitel offen hat und nicht das gemerkte.

Zweimal gemessen, weil der erste Lauf eine ältere Engine traf: Playwright 1.49 bringt Firefox 132,
das aktuelle Playwright Firefox 155. Beide Läufe liefern Zeile für Zeile dasselbe. Ein Ergebnis aus
einer Engine, die drei Jahrgänge alt ist, wäre sonst ein Ergebnis über eine andere Frage gewesen.

**Die zwei CSS-Fixes des fünfunddreißigsten Reviews in drei Engines** (2026-09-21, gegen die
veröffentlichten Websites, ohne eingespeistes CSS): Chrome 152, WebKit 26.5 (Playwright 1.62.1 auf
dem Mac, der Build in einem Wegwerf-Verzeichnis statt im globalen Speicher) und Firefox 153 (in
der aarch64-VM, dort Playwrights eigener Build). Gezählt wird je sichtbarem fokussierbarem Element
einer Seitenspalte, ob sein Ring (Box ± 4 px) die Polsterbox eines beschneidenden Vorfahren
verlässt, an allen vier Kanten.

| | Example, Start | Example, Kapitel offen | Navigations-Handbuch | Suche über Graph | Suche über Burger |
| --- | --- | --- | --- | --- | --- |
| alle drei | links 0/9, rechts 0/5 | 0/23, 0/4 | 0/11, 0/4 | am Feld `input.search-bar`, Mitte `div.search-container` | `div.search-container` |

Vorher (nur Chrome gemessen): links 8/9 und 22/23, rechts 4/5 und 3/4; am Suchfeld das `<canvas>`
des Graphen, am Burger sein Icon. Die drei Engines sind sich Zeile für Zeile einig, auch in der
Frage, an der sie am ehesten auseinandergehen könnten — `:has()` auf dem Kopfbereich und ein
Stapelkontext aus `position: sticky`.
