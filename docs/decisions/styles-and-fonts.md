# Stile, Variablen, Community-Themes und Schriften

Aus CLAUDE.md ausgelagert (2026-09-02): die Messungen und Beobachtungen hinter den Regeln, wortgleich. Die Regeln selbst stehen in CLAUDE.md; hier steht, welches Experiment sie erzwungen hat. Neue Einträge kommen mit derselben Form dazu: was gemessen wurde, was daraus folgt.

- **Everything that changes how the site looks lives on one page, ordered by the CSS cascade.** `routes/Styles/` has four sub-tabs — Basis (the classic `theme.colors`/`typography`, moved out of ConfigEditor, which now only links here), Community-Themes (the former standalone Themes route: catalog, presets, style settings), Variablen (CSS custom-property overrides) and Eigenes CSS (`custom.scss`) — in exactly the order they override each other, which the line under the tab bar states. `index.tsx` owns *all* editing state and exposes it through `useStyles()`: only one sub-tab is mounted at a time, so a lifted draft is what survives a tab switch, and the page has a single Save button that each sub-tab defines via `registerSave()`. The old `/themes` path redirects to `?tab=theme` (the tab key stays `theme`; only its label became "Community-Themes"). The Community-Themes tab shows **only what the theme itself declares** — the raw `<id>@@<key>` editor that could write any CSS custom property from there is gone, because that is the Variablen tab's job and doing it in two places meant two different mental models for the same edit.
  - **The variable table is built from `theme.json`, not from scanning build output.** `variableGraphService` reads the installed `@quartz-themes/<id>` package's compiled `light.base`/`dark.base` — whose first rule is the theme's own `:root` block — because it needs no build, splits cleanly per mode, and mixes in nothing else; compiled build output only fills the gaps, and only from genuinely root-level selectors (a `.callout[data-callout]` declaration is a structurally different thing a global `:root` override can't reach). Both a `var()` in any value and the theme's own `brokenVarLinks` table feed one inverted dependency graph, which is what the "N abhängig" chip counts. Verified against a real project: 1030 variables, 503 of them derived, 394 with dependents. It reads that build output itself, which is what made the older `styles.scanBuildOutputVariables` channel dead - a whole IPC channel, contract entry and a second copy of `findCssFiles` that no screen had called since; it is gone.
  - **Resolving a value means following aliases *and* substituting embedded ones.** `src/routes/Styles/variableGraph.ts` does both, because ported themes are full of `var(--a, var(--b))` (a fallback that is itself a var, which no `[^)]*` regex matches — hence the brace-counting `pureAlias()`) and of `hsl(var(--x))` / `rgba(var(--x), .8)`, where the chain ends on a value that *contains* a reference rather than being one. Skipping either leaves a blank swatch next to a perfectly resolvable color. Both paths are depth-capped rather than cycle-tracked, since they call each other.
  - **The theme catalog says when it could not be fetched.** `npm search` failing left seven hard-coded placeholder themes standing in for a registry that really holds ~250 (measured), cached for fifteen minutes, with `invalidateCache()` exported and called from nowhere - so there was no way to even retry. `listThemes` answers a `ThemeCatalogResult` with `unavailable` now, a failed search is never cached, and the tab has a reload button. A failed *detail* fetch is no longer cached either: an hour of "this theme has no details" over one network blip was the previous behaviour.
  - **A community theme's options are labelled from the *upstream* Obsidian theme, not from the port.** A `@quartz-themes/<id>` package's theme.json ships only compiled CSS plus bare `classSettings` keys, so `styleSettingsSchemaService` resolves the theme id against `obsidianmd/obsidian-releases`' registry (slugified display name; 636 of 700 ported ids match, the rest fall back to the raw editor), fetches the original `theme.css` from `raw.githubusercontent.com/<repo>/HEAD/`, and parses its `/* @settings */` YAML into titles, descriptions, types, per-mode defaults, min/max/step, select options and the heading tree the form groups by. Resolved answers — **including `null`** — are cached in `userData/theme-docs/` permanently, since they describe a published upstream file; the tab's "Doku neu laden" button clears one. Class settings are cross-checked against the port's own `classSettingKeys`, because the upstream theme declares toggles whose CSS the port didn't carry over. Verified: Ultra Lobster 176 upstream settings → 139 usable, tokyo-night 179 across two blocks.
  - **A variable override beats an active community theme — verified, not assumed.** `@quartz-themes/core` emits *everything* it produces inside `@layer` (`obsidian-theme`, `quartz-themes-base`, `obsidian-theme-overrides`, style settings included), while Quartz appends `custom.scss` unlayered after `@layer quartz-base {…}` (`quartz/plugins/emitters/componentResources.ts`: `` `@layer quartz-base {\n${quartzBase}\n}\n${customStyles}` ``), and an unlayered declaration outranks every layered one regardless of load order. Confirmed end-to-end against a real build (ultra-lobster + an override on `--background-primary`): computed `--background-primary` and the painted `body` background were the override's value in *both* modes. That is what the blue note at the top of the Variablen tab states — together with the one real limit, a variable a theme only ever declares inside a scoped selector, which no `:root` rule can reach.
  - **Expanding a variable row is not overriding it.** The editors open pre-filled with `baseValue()` — the value that would apply *without* this key's own override — and `VariableRow` only writes one when a draft differs from that pair, which is also how typing the original back removes it again. Anything that compares against `effectiveValue()` instead would count every expanded row as changed, since that function reads the override first. There is no "Anpassen" link any more, and the "Von dir" badge means a real difference.
  - **`<input type="color">` needs a hex, and a theme's values are almost never one.** `cssColorToHex()` (in `variableGraph.ts`) normalises through canvas' `fillStyle`, i.e. the browser's own color parser, so `hsl(…)`/`rgb(…)`/an alias chain all reach the picker as `#rrggbb`. It is primed with a sentinel first, because an unparseable value leaves the previous `fillStyle` standing — without that, "not a color" reads as black. Feeding the raw draft straight in was the bug where the picker showed white next to a swatch painting the real color.
  - **Writing a style setting is not just `<id>@@<key>: value`.** `src/routes/Styles/styleSettings.ts` owns the encoding, because core implements only half of Style Settings' own semantics: a boolean is a class toggle, a string matching a `classSettings` key is a class select, anything else is emitted literally as `--<settingId>`, and a `@@light`/`@@dark` suffix **on the setting id** scopes it (without one the value lands in *both* modes). On top of that, a `variable-themed-color` with `format: hsl-split` is three variables (`--accent-h/-s/-l`, values `202`/`100%`/`75%`) — `--accent: #80D0FF` does nothing at all — and `format: rgb` wants `rgb(r, g, b)`. That is why the form takes **one batched patch** rather than a setter per key: such a color writes up to six keys, and six separate calls would each start from the same pre-change state and lose five.
  - **Quartz imports exactly one stylesheet, so the load order of every other one lives inside it.** `componentResources.ts` does `import customStyles from "../../styles/custom.scss"` and nothing else, so an extra file is only reachable *through* custom.scss - and Sass rejects a `@use` that follows a rule. `styleService`'s `imports` managed block therefore sits at the very top, right after Quartz's own `@use "./variables.scss" as *;` and **before** the leading comments, not after them: `upsertManagedBlock` appends at the end of the file, which would put a later hand-written rule above the block and break the build. The file stays the source of truth rather than a sidecar JSON - the project still builds without this app, hand-editing works, and there is no second copy of the order to drift. Verified against a real `npx quartz build`: reordering two files in the UI flipped which one's `--probe` survived into the emitted CSS, with custom.scss's own value winning over both. Extra files live under `quartz/styles/custom/` (created here) and `imported/` (copied in), which is exactly what `styleFileSubPath` pins - a bare `relativeSubPath` would still reach Quartz's own `base.scss`. An `@use` whose file no longer exists is dropped on the next write rather than kept, since leaving it in breaks the build; that is also why `renameStyleFile` reads the order *before* renaming, or the entry for the file being renamed no longer resolves and silently disappears.
  - **Saving is per file, and the reference list has two click targets per row.** The page's Save button and the editor's own both write only the tab in front - several open files are several separate pieces of work, and the tab bar's dots are what show the rest. `styles.checkSource` compiles the *unsaved* draft of one file on its own, which is not an approximation: with Sass modules a partial sees nothing of what included it, so compiling it alone is exactly how the build sees it (custom.scss, being the entry, pulls in the chain anyway). In `CssVariableReference` the name inserts `var(--x)` while the swatch copies the resolved value - two needs, two targets - and the literal value is no longer printed next to either: it was the widest thing in a narrow sidebar and ran out of the card.
  - **Two independent mechanisms load webfonts, and `theme.fontOrigin: local` on its own does *not* mean the site avoids Google.** Quartz core (`Head.tsx` + `componentResources.ts`) links `fonts.googleapis.com` for `fontOrigin: "googleFonts"` with `cdnCaching: true`, downloads and self-hosts under `<baseUrl>/static/fonts` with `cdnCaching: false`, and emits nothing at all for `"local"` (its branch is a comment reading "let the user do it themselves in css"). But the plugin **`@quartz-community/quartz-fonts` has its own `fontOrigin`** with a different vocabulary — `"googleFonts"` (its **default**, so an entry with no options set *does* call Google) or `"selfHosted"`, which downloads at build time and emits `static/fonts/quartz-fonts.css`. Verified by building a real project twice: with the plugin's default the built HTML links Google even though `theme.fontOrigin` is `local`; with `selfHosted` there is no `fonts.googleapis.com` reference anywhere and the `.ttf` files ship in `public/static/fonts`. A **third** source is the easiest to miss: `@quartz-themes/core` emits its theme's `@font-face` rules against a hardcoded `FONT_CDN_BASE = "https://unpkg.com"`, so an active community theme means third-party requests regardless of either setting above, and its only off switch is the plugin option `themeFonts: false` — which *drops* the theme's fonts rather than localising them (verified: 22 unpkg references in the built CSS without it, 0 with it). `src/routes/Styles/fontDelivery.ts` is the one place that knows this — it reports *every* loader (both can be active at once) and the Basis tab's self-hosting switch flips the two Google ones together, writing the plugin option by array index and core's `cdnCaching`; the theme's fonts get their own control, because turning them off changes how the site looks rather than only where the files come from. Both self-hosting paths rewrite URLs to `baseUrl`, and the plugin throws without one, so an empty baseUrl is a build failure rather than a detail.
  - **What weights and styles exist is read, not guessed.** `collectFontFaces()` reports the `@font-face` rules the site really has: the font files a community theme ships (`theme.json`'s `meta.fontFiles`, with family, style and weight per file, variable ranges like `"100 1000"` included) plus every `@font-face` in the project's own stylesheets. What Quartz *requests* from Google is reproduced separately by `src/routes/Styles/fontSpec.ts` from its own `formatFontSpecification()`: the defaults are **per slot** (header `[400,700]`, body `[400,600]` **plus italic**, code `[400,600]`), and a **single** configured weight is silently dropped — `if (weights.length > 1)` means `weights: [500]` emits no `wght@` at all and Google serves the family default, so the UI says "Standardstärke" rather than printing a number the site never loads. Differential-tested against the real `googleFontHref()` from a clone, that case included.
  - **A theme overriding a base value is asked per variable, never assumed for all of them.** The Basis tab dims exactly the colours and fonts the *installed* theme declares (`graph.vars[key].origin === 'theme'`, i.e. read from that theme's own `:root` block) and counts them in the banner. Nothing is disabled: a theme that happens not to declare `--textHighlight` leaves that field working, greying it out would be a lie, and setting a base value while a theme is on is how you prepare for switching the theme off. This is also why it is not a blanket rule — themes differ, and the answer has to come from the theme that is actually installed.
  - **Some conflicts can only be fixed in CSS, and those ship as a file the user owns.** `src/routes/Styles/cssFixes.ts` is a small catalogue: each entry knows whether this project is affected and generates a stylesheet, written into `quartz/styles/custom/` through the normal create/save path so it appears in the editor and can be edited, reordered or deleted like anything else. Nothing is applied silently. The first entry is the heading-font conflict: `quartz-fonts` emits `h1,…,h6 { font-family: … }` **unlayered**, which beats every `@layer` *and* — because its stylesheet is linked after custom.scss — an equally specific rule of your own; verified in a real build that neither a `--headerFont` override nor a plain `h1 { … }` changed anything, while `body h1` (one step more specific) did. The generated rules point at `var(--hN-font, var(--headerFont))` so the Variablen tab is back in control: with the fix, h1 followed the theme's own Getai and h2 fell back to the header font.
  - **The SCSS check compiles with the *project's* sass, not one bundled here.** `checkStyles()` resolves `sass` via `createRequire(<project>/package.json)` - the same dart-sass `esbuild-sass-plugin` uses in a real build (`quartz/cli/handlers.js`) - so the check can never disagree with the build over a language feature, and this app gains no dependency. A project without `node_modules` returns `unavailable`, never `ok`: "cannot check" and "no errors" are different answers. The error's `span` is mapped back to a `relativePath` so the banner can open the file it actually came from, which is regularly not the one being edited.
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

