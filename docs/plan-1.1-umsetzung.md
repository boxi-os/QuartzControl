# Umsetzungsplan QuartzControl 1.1

## Kontext

1.0.2 ist am 2026-10-07 veröffentlicht. Für 1.1 stehen fünf Vorhaben in `docs/plan-1.1.md`:
Plugin-Optionen vollständig und verständlich, verwaltete CSS-Blöcke in eigene Datei, zwölf statt 31
Stylesheets im Basis-Template, Layout als Bühne mit Seitenleiste, Snippets und Bilder für die
Layout-Box. Die Erkundung hat dazu gezeigt:

- **Plugin-Optionen:** Die App rät das Schema aus `.d.ts` (`pluginSchemaService.ts`). Bei
  quartz-navigations fallen alle Auswahlfelder weg. Bei quartz-multilanguage wird `SeoOptions` statt
  `MultilanguageOptions` gelesen; Schalter schreiben an die falsche Stelle. Plugins unter
  `node_modules` bekommen gar kein Schema. Der Cache wird nie geleert. Vorhandene, aber nicht
  darstellbare Schlüssel (`byLang`, `breakpoints`) sind unsichtbar. ~32 Plugins tragen
  `quartz.optionSchema`, 45 von 49 `quartz.defaultOptions` — beides liest die App nicht. Quartz
  selbst sieht `quartz.configSchema` (JSON Schema) vor.
- **CSS:** Es gibt fünf verwaltete Marker (`imports`, `fonts`, `google-fonts`, `css-vars`,
  `imported-styles`). Mindestens neun Stellen hängen fest an `custom.scss`; drei davon brechen beim
  Umzug still (ungenutzte Schriften werden nie mehr angeboten bzw. gelöscht, `@font-face` des
  `fonts`-Blocks fehlen in der Schriftenliste).
- **Messwerkzeug:** `scripts/styles-snapshot.mjs` misst nur die App, nicht die gebaute Website — ohne
  Erweiterung gibt es für die CSS-Vorhaben keine Vorher/Nachher-Messung.
- **Begriffe:** „Baustein“ ist vergeben (Teil eines Vorlagenpakets). Der Bereich heißt weiter
  „Layout“, die Teile „Komponenten“.

## Entscheidungen des Nutzers

- Alle fünf Vorhaben in **einer** Fassung 1.1.
- Schema-Quelle: App liest `quartz.configSchema` → `quartz.optionSchema` → `.d.ts` (Rückfall).
  Die drei eigenen Plugins bekommen ein vollständiges **`configSchema`** mit Verschachtelung und
  Bedingungen und je ein Release.
- Der multilanguage-Fehler wird **in 1.1** behoben, nicht vorab.
- Variablen in **Form C**: wie heute (`:root` hell, `:root[saved-theme="dark"]` dunkel) plus eine
  dritte Regel `:root:not([saved-theme="dark"])` für „nur hell“ — löst Befund 7 des 38. Reviews.
- `_quartzcontrol.scss` ist im Reiter „Eigenes CSS“ **bearbeitbar** (eigener Reiter, Warnband).
- Breakpoint-Breiten ziehen in den Reiter **„Frames“**.
- Nutzerbefund 4 aus 1.0.1: Einzige Instanz in den Vorrat ziehen = `enabled: false`; zurückziehen
  schaltet wieder ein.
- Ältere offene Punkte (VoiceOver, Schlüsselbund-Hänger unter Linux, Smoke-GC-Abbruch, git < 2.38 /
  glibc < 2.34, macOS x64) bleiben **außerhalb** von 1.1.

Von mir entschieden (Empfehlung, beim Bau umkehrbar): `imported-styles` bleibt in `custom.scss`
(freier Rumpf eines Pakets, Paketformat bleibt Version 1); `.layout-box-current-folder` zieht nach
`plugin-layout-box`.

## Reihenfolge

P0 → P1 → P2 (parallel in den Plugin-Repos) → P4 → P3 → P5 → P6 → P7.1 → P7.2 → P7.3 → P7.4 → P8.
Jeder Schritt in Einzel-Commits auf einem Branch `feat/1.1` (bzw. je Phase), je Commit
`typecheck`, `build`, `smoke`, Messung an der gebauten App mit Vorher-Stand. Als Erstes wird
`docs/plan-1.1.md` auf diese Entscheidungen und Reihenfolge nachgezogen.

Warum P4 vor P5: Der CSS-Umzug ist die einzige Änderung mit erwarteten Abweichungen (Spezifität) und
wird an der bekannten 31-Dateien-Vorlage gemessen; danach muss der Diff der Umstrukturierung leer
sein. P4 migriert Nutzerdateien und soll am längsten auf dem Branch liegen.

## P0 — Messwerkzeuge

- `scripts/styles-snapshot.mjs --site <baseUrl> <datei.json>`: chromium aus `playwright-core` (wie
  `scripts/check-tokens.mjs`), Seitenliste aus `check-tokens.mjs` nach `scripts/example-template/`
  ziehen und von beiden importieren; Breiten 1456/1000/390, hell/dunkel; neben Farben/Schrift auch
  `display`, `position`, Maße, `margin*`, `padding*`, `grid-template-*`, `gap`, `order`.
  Rauschboden: zwei Aufnahmen ohne Änderung → leerer Diff.
- Sass-Messung (Projekt-`sass` 1.104.1) der Ausgabereihenfolge und der drei Variablenregeln aus
  Form C, mit berechneten Werten im Browser → `docs/decisions/styles-and-fonts.md`.
- `npm run check:option-schema -- <projekt>`: zählt je Plugin Schlüssel in Config, Schema, `.d.ts`,
  Vorgaben und „ohne Darstellung“. Lädt die Logik aus `shared/` (Regel „laden statt abschreiben“).

## P1 — Schema-Leser und die vier bekannten Fehler

- **`shared/pluginOptionSchema.ts`** (rein): `NormalizedOptionSchema`, `OptionNode`
  (boolean/string/number/enum/union/object/record/array/json), `OptionField` (`default`, `when`,
  `group`, `order`, `advanced`, `text.l10n`), `OptionWidget` (`snippetFile`, `html`, `markdown`, …).
  Normalisierer für `configSchema` (JSON Schema mit `x-quartz-*`: `when`, `group`, `order`,
  `advanced`, `widget`, `keys`, `l10n`; lokale `$ref`/`$defs` mit Tiefendecke), flaches
  `optionSchema`, `.d.ts`-Ergebnis. Lücken aus `defaultOptions` füllen (`inferred`), Typ-Widerspruch
  zur Vorgabe → `union`, Unlesbares → `json` + `notes` (gezählt, nie verschwiegen).
  Helfer `setAtPath` (verallgemeinert `setDeep`, `undefined` entfernt), `pruneEmptyObjects`,
  `evaluateCondition`.
- **`electron/main/services/pluginSchemaService.ts`** umbauen: `getPluginOptionSchema(projectPath,
  source)`; Paketordner wie Quartz' `readManifestFromPackageJson` (npm → `node_modules`, git →
  `.quartz/plugins/<quartzPluginName(source)>`); `package.json` mit Größendecke, `JSON.parse` im
  `try`, kein Fremdcode.
- Commits je Fehler, je mit Vorher-Messung an einer Kopie von gui-test:
  1. Wurzel-Interface im `.d.ts`-Rückfall (nicht referenziert, kein `Resolved*`) — `hreflang`
     schreibt danach `options.seo.hreflang`.
  2. Cache-Schlüssel aus mtime/Größe von `package.json` und `dist/` statt nie geleertem Cache.
  3. Plugins unter `node_modules` (explorer: vier Felder statt „kein Schema“).
  4. Vorhandene, unbekannte Schlüssel werden mitgeliefert.
- **IPC** (Vertrag → zod → Handler → Preload): `plugin:optionSchema`,
  `plugins.optionSchema({ projectPath, source })` (ohne `name`: der Hauptprozess leitet ihn aus der
  Quelle ab wie Quartz, ein zweiter Name vom Renderer könnte nur widersprechen) →
  `{ schema: NormalizedOptionSchema | null; packageVersion?; unreadable? }`. Alter Positionskanal
  `plugin:optionsSchema` entfällt mit dem letzten P3-Commit. `attachDefaults` (schreibt heute ein
  hartes deutsches „Standard: …“ in die Beschreibung) entfällt.

## P2 — Die drei eigenen Plugins (eigene Repos)

`~/Development/quartz-layout-box`, `~/Development/quartz-multilanguage`,
`~/Development/quartz-navigations`, je:
- `quartz.configSchema` vollständig: layout-box mit `file` als `snippetFile` (`x-quartz-dir-option:
  dir`), `html` als `html`, `byLang` per `$ref` ohne `dir`/`frontmatterKey`; multilanguage mit
  `languages` (string | Objekt), `seo`, `switcher`, `frontmatterKeys`, fehlende Vorgabe
  `availableTranslationNotice`; navigations mit Bedingungen (`tabs`/`flyout`/`select`/`columns`/
  `pager` je `variant`, `align` für bar/dropdown/mega/tabs, `trigger` für dropdown/mega/flyout),
  `nodeIcons`/`order` als Record, `include`/`exclude` als Glob-Listen. Deutsche Texte über
  `x-quartz-l10n`.
- vitest: jeder Schlüssel aus `defaultOptions` und aus dem Options-Interface steht im Schema.
- Release (`version` = `quartz.version`, CHANGELOG, Tag): layout-box 0.4.0, multilanguage 0.2.0,
  navigations 0.4.0. Plugin-Handbücher bekommen einen Abschnitt „In QuartzControl konfigurieren“.
- Messung: `check:option-schema` zeigt 0 Schlüssel ohne Darstellung für die drei.

## P3 — `src/components/PluginOptionsForm/`

- Aus `src/routes/Plugins/Installed.tsx` ausgelagert: `FieldRow`, `InferredFieldRow`,
  `AddOptionRow`, `parseOptionValue`; neu `ObjectBlock`, `ListEditor`, `RecordEditor`,
  `widgets/`-Registry. `PluginOptionsForm({ schema, values, onChange(path, value), explicitEmpty })`.
- Schalter, Auswahl, Zahl, Text; ungesetzt zeigt die Vorgabe, „Zurücksetzen“ entfernt den Schlüssel;
  1.0.2-Verhalten bleibt (geleert entfernt, „Leer setzen“ schreibt `""`).
- Bedingte Blöcke nach `when`; gesetzte Werte in verborgenen Blöcken bleiben sichtbar unter „Wirkt
  bei dieser Einstellung nicht“ (kein stiller Verlust).
- Records (`byLang` mit Sprachen aus multilanguage bzw. `locale`), Listen (Mülleimer `IconButton`),
  Abschnitte nach `x-quartz-group`, „Weitere Schlüssel“ für alles Unbekannte.
- `Installed.tsx`: `updateField(index, ['options', ...path], value)` bleibt.
- i18n `pluginOptions.*` in `de.ts`/`en.ts`, `check:i18n`.
- Messung an der gebauten App mit den drei Plugins, explorer, graph, quartz-fonts: je Feldart
  schreiben → YAML lesen; `variant` → `tabs` blendet Block ein; `byLang.en.title` setzen und leeren →
  `byLang` weg.

## P4 — Verwaltete Blöcke nach `quartz/styles/_quartzcontrol.scss`

- `styleService.ts`: `managedScssPath`; `getManagedBlock` liest beide Dateien (Kopie in
  `custom.scss` gewinnt — 1.1 schreibt dort nie mehr Blöcke); zentraler Schreiber
  `writeManagedBlocks` unter `whileHoldingStyles`: erst verwaltete Datei (Reihenfolge `imports`,
  `fonts`, `google-fonts`, `css-vars`), dann Blöcke aus `custom.scss` streichen und
  `@use "./quartzcontrol";` vor alle Regeln setzen (Logik aus `upsertImportBlock`). Abbruch dazwischen
  → doppelt, nicht verloren. `migrateOnWrite` auf beiden Dateien.
- Je Stelle ein Commit: `fontService` (`unusedImportedFonts`, `fontFilesStillNamed`, `ownFaces`,
  `notDelivered`), `projectStylesheets`, `checkStyles`/`checkStyleSource` (Diagnose „Zeile da, Datei
  fehlt“), `schemas.ts` `styleEntryPath` (+ `_quartzcontrol.scss`), `StylesInfo.managed`,
  `fontDelivery.holdsGoogleFonts`, `templatePackage/parts.ts` (`stripAllManaged`, `plan`, `apply`).
- Bau-Tür `ensureManagedUse` in `buildService.refreshGoogleFonts`: Zeile fehlt → setzen; Datei fehlt
  → leer anlegen; je ein `mainT`-Satz im Log.
- Reiter „Eigenes CSS“: eigener, bearbeitbarer Reiter für `_quartzcontrol.scss` mit Warnband; das
  `staleBy`-Band wandert dorthin; `saveCustomScss` setzt eine gelöschte `@use`-Zeile wieder und sagt es.
- Variablen Form C: `CssVariableOverride.lightOnly?: true` (nicht `dark: null` — 1.0.x ruft
  `dark.trim()`); `parseVariableOverrides`/`renderVariableOverrides` lernen die dritte Regel;
  `setMode` in `VariableRow.tsx` schreibt „nur hell“ statt die dunkle Grundfarbe einzufrieren.
- Beim ersten Umzug ein Hinweis, wenn der Rumpf von `custom.scss` eine verwaltete Variable selbst
  per `:root` setzt (Rangfolge kippt).
- `scripts/build-example-template.mjs`: `readCustomBody` streicht die `@use`-Zeile statt Blöcke zu
  verlangen; Phase 5/6 schreiben über die verwaltete Datei; `checkSync` vergleicht den Rumpf.
- Messung: gui-test-Kopie, Site-Aufnahme vorher; Variable speichern → `custom.scss` ~57 Zeilen +
  `@use`, `_quartzcontrol.scss` ~600; Bau → Diff leer (außer eigenen Kollisionen); Gegenprobe mit
  1.0.2-Bündel (Variable + Reihenfolge speichern, zurück in 1.1, Build in beiden grün); Dev-Server
  sieht Änderung an `_quartzcontrol.scss` ohne Neustart; Zeile von Hand löschen → Bau-Tür repariert;
  Schloss-Messung 300 Läufe → 0 Verluste; „ungenutzte Schriften“ bietet weiter an und löscht.

## P5 — Zwölf Stylesheets im Basis-Template

- `scripts/example-template/styles/` 31 → 12 nach der Tabelle in `docs/plan-1.1.md`, reines
  Zusammenfügen, je Abschnitt Kopfkommentar mit altem Namen; `base.scss` nach gemessenen Zeilen
  zerlegt (`foundation`, `layout`, `content`).
- Mitziehen: `style-order.mjs`, `palette.mjs` (Syntax-Block), `variable-docs.mjs`, README/BEFUNDE,
  Texte im Example-Vault; Werkstatt räumt die 29 alten Dateien über `styles.deleteFile` (31 ohne
  die zwei, die ihren Namen behalten).
- Messung: Site-Diff vorher/nachher an Example und Basis leer (besonders Footer, Brotkrumen,
  Link-Vorschau); `--check-contrast` (93 Paare); `check:tokens` gleiche Zahl lebender Tokens.

## P6 — Layout-Box: Snippets und Bilder

- Neuer `electron/main/services/snippetService.ts`: Ziele nur über `writableTarget()`/
  `containedPath()` (`templatePackage/shared.ts`); verweigert `.git`, `node_modules`, `.quartz`,
  `.quartz-gui`, Ausgabeordner; Endungen `.html/.htm/.md` bzw. `png/jpg/jpeg/gif/webp/svg/avif`;
  Decken 2 MB / 20 MB; atomar schreiben; Rückfrage vor Überschreiben über `confirmDialog()`.
- IPC (Objekt-Argumente, `looseObject`): `snippets.list|read|write|import({ projectPath, dir, … })`,
  `staticImage.import({ projectPath, sourcePath, name?, overwrite? })` → `relativePath:
  'images/x.png'`. Dateiwahl über bestehendes `dialog.pickFile`.
- Renderer-Widgets (am Schema-`widget`, nicht am Plugin-Namen): `SnippetFilePicker` (Auswahl aus
  `dir`, Neu, Importieren, Bearbeiten), `SnippetEditor` (CodeMirror, neu `@codemirror/lang-html` und
  `@codemirror/lang-markdown`, eigener Knopf „Snippet speichern“), „Bild hochladen“ fügt
  `<img src="{{root}}/static/images/x.png" alt="">` bzw. `![](<{{root}}/static/images/x.png>)` an der
  Cursorposition ein (Layout-Box ersetzt `{{root}}` auch URL-kodiert); Hinweis bei
  `placeholders: false`.
- `static/images` reist schon im Vorlagenteil `static` mit — nur im Handbuch nennen.
- Messung: Snippet anlegen, `.md` importieren, Bild hochladen, bauen, Bild lädt unter Unterpfad;
  Gegenproben `../x.md`, Symlink-`dir`, vorhandene Datei (Dialog im Main gespiegelt, „nicht am OS
  gemessen“).

## P7 — Layout: Bühne mit Seitenleiste

- **7.1** Auf dem heutigen Board: `ComponentChip`, `Inspector`, `Palette`, `GroupsPanel` auslagern.
  Auswahl über `{name, occurrence}` statt Index. Seitenleiste: Position, früher/später, Anzeige,
  Bedingung als Auswahl (Immer / not-index / has-tags / has-backlinks / has-toc / Eigene…), Gruppe +
  `groupOptions`, Duplizieren/entfernen. Vorrat: einzige Instanz → `enabled: false`, Chip „aus“,
  zurück → aktiv und an Ablagestelle; `dropOutcome` sagt `dnd.disabled`/`dnd.reenabled`. Ids
  (`pos#group`, `palette:<index>`, `palette-drop-zone`), `useDndAccessibility`, `isHome`,
  `nearestDroppableCoordinates` bleiben. DnD-Absatz in `conventions.md` nachziehen.
- **7.2** `stageGeometry.ts`: Spuren aus `buildTrackList` in `fr`-Anteile (Bezugsbreiten 1456/1000/
  390), Abstände in Prozent — kein `transform: scale`, kein waagerechter Bildlauf. Ansicht
  Desktop/Tablet/Mobil graut `mobile-only`/`desktop-only` aus; Hinweis, wo die Mobil-Grenze des
  Frames von Quartz' 800 px abweicht. Kopf: geltender Frame + „Frame bearbeiten“
  (`primeStickyState(target, 'frames.editing', …)` wie `openFrameInLayoutEditor`). `FrameBreakpoints`
  zieht in den Reiter „Frames“.
- **7.3** Seitentyp-Wähler („Alle Seiten“ + Typen): Frame-Wahl je Typ, ausgeschlossene Komponenten
  ausgegraut, „Auf diesem Seitentyp ausblenden“, „Bereich leeren“, „Anpassung entfernen“; reine
  Logik nach `pageTypeOverride.ts`. Danach `PageTypeOverrides.tsx` löschen; `?tab=pagetypes` →
  `global`; `scripts/routes.mjs` und Tabelle `HANDBOOK` anpassen.
- **7.4** `PluginOptionsForm` in der Seitenleiste, schreibt in den Config-Entwurf; Speichern über
  den Kopfknopf (`dirty` deckt es ab). Snippet-Widgets erscheinen dort automatisch.
- Messung je Schritt: Maus und Tastatur (Leertaste/Pfeile/Leertaste, Ansagen lesen), Smoke bei 1280
  und 1728 ohne waagerechten Bildlauf, Gegenprobe gegen eine `byPageType`-YAML aus 1.0.2 (Ausschlüsse,
  geleerte Bereiche, unbekanntes Template), neue Screenshot-Szenen.

## P8 — Vorlagen, Handbuch, Release

- Vorlagen: alle vier Varianten neu bauen; `--variant basic --check-sync` und `--variant example
  --check-sync`; veröffentlichen; `minimal-lesbar.qtpl` bleibt; bestehende Websites behalten ihre
  31 Dateien.
- Handbuch (de+en, `check:handbook`, Screenshots `--demo --cards`): 4.4 Variablen (drei Regeln,
  Rangfolge), 4.5 Eigenes CSS (verwaltete Datei, `@use`-Zeile, Reparatur), 4.6 Frames (Breiten jetzt
  hier), 4.7 neu „Layout: Komponenten anordnen“ mit `aliases:` auf den alten Pfad (1.0.x öffnet
  `4-gestaltung/07-layout-global-und-seitentypen`) und `handbookPages.ts`, 4.8 Plugins (Formular,
  Bedingungen, Vorgaben, Snippets/Bilder), 4.9 Vorlagen (zwölf Stylesheets, `static/images`).
- `docs/decisions/` und `docs/conventions.md` nachziehen (Schloss über zwei Dateien, Marker-Absatz,
  DnD-Absatz, Schema-Format).
- `docs/release.md`: neuer Punkt „Plugin-Releases zuerst“; Notizen mit Sätzen zu älteren Fassungen
  (0 Variablen → alle Rechner zuerst aktualisieren), Rangfolge der Variablen, Seitentypen im Wähler,
  Vorrat schaltet aus, Formulare ab den neuen Plugin-Fassungen, 1.0.x liest „nur hell“ als beide.
- Ein Review der 1.1-Commits vor dem Release (selbst, frischer Agent, wie das 39., sofern kein anderes
  Modell verfügbar ist).

## Kritische Dateien

- `electron/main/services/pluginSchemaService.ts`, neu `shared/pluginOptionSchema.ts`
- `src/routes/Plugins/Installed.tsx`, neu `src/components/PluginOptionsForm/`
- `electron/main/services/styleService.ts`, `fontService.ts`, `styleLock.ts`,
  `templatePackage/parts.ts`, `buildService.ts`
- `src/routes/LayoutEditor/{index,GlobalBoard,PageTypeOverrides,ComponentPill,utils}.tsx`
- `scripts/build-example-template.mjs`, `scripts/example-template/styles/`, `style-order.mjs`,
  `scripts/styles-snapshot.mjs`
- `shared/ipc-contract.ts`, `electron/main/ipc/{schemas,handlers}.ts`, `electron/preload/index.ts`

## Verifikation (gesamt)

- Je Commit: `npm run typecheck`, `npm run build`, `npm run smoke`; bei Texten `check:i18n`.
- Gemessen an der gebauten App (Playwright-Skript im Scratchpad, Wegwerf-Profil, APFS-Klone von
  gui-test unter `werkstatt/` oder im Scratchpad), jeweils Vorher/Nachher.
- CSS-Phasen: `styles-snapshot --site` leerer Diff (P5) bzw. erklärter Diff (P4), `--check-contrast`,
  `check:tokens`, `template:example --check-sync`.
- Plugins: `check:option-schema` 0 Schlüssel ohne Darstellung für die drei eigenen.
- Release: zehn Pakete wie bei 1.0.2, neun gestartet; Website und Vorlagen nach `docs/release.md`.

## Offen auf `feat/1.1` (Stand 2026-10-09, nach dem 41. Review)

Gesammelt, nicht nebenbei erledigt. Jeder Punkt ist ein eigener Durchgang.

**Nebenbei-Befunde des 41. Reviews:**

1. ~~`toggleEnabled` und `reorderGroup` in `Plugins/Installed.tsx` schreiben an der Warteschlange
   vorbei~~ — behoben (2026-10-09): alle drei Schreiber gehen über `commit()`. Vorher gingen an der
   gebauten App ohne künstliche Verzögerung 5 von 5 Schaltern verloren, wenn direkt danach ein Feld
   verlassen wurde, ein zweiter schneller Pfeilklick und ein Pfeil vor einem Feld; nachher keiner
   (1280 und 1600 px, 0 und 400 ms Speicherdauer). ~~Daneben: `removePlugin` wartet nicht auf die
   Warteschlange~~ — behoben (2026-10-09): Das Entfernen steht in derselben Warteschlange, und die
   Felder der Leiste sind gesperrt, bis die Seite danach neu gelesen hat. Gemessen an der gebauten
   App (1280 und 1600, Wegwerf-Profil, `cp -Rc`-Kopie von `gui-test`, entfernt wird
   `obsidian-plugin-excalidraw` mit zwei Instanzen): vorher standen nach einem Feld in `toc`, das
   der Klick auf den Mülleimer verließ (3 s Speicherdauer), und nach einem Feld, das 800 ms nach
   dem Klick geändert wurde (800 ms Speicherdauer), beide Einträge wieder in der Config, im
   Lockfile keiner; nachher 0, der Wert des ersten Felds gespeichert, das zweite Feld während des
   Entfernens gesperrt und danach wieder frei. Ohne Feld (Gegenprobe) vorher wie nachher 0. Die
   Leiste ist an beiden Breiten pixelgleich (16 Rechtecke).
6. ~~Der Mülleimer an einem eingebauten Plugin (`@quartz-community/…`) tut nichts~~ — behoben
   (2026-10-09; beim Messen von 1 gefunden): Die App gab `quartz plugin remove` den Anzeigenamen
   (`table-of-contents`); die CLI findet ein eingebautes Plugin nie im Lockfile (es ist ein
   npm-Paket, „is not installed“, Exit 0) und nimmt den Eintrag nur über ihren Config-Filter
   heraus, der gegen `extractPluginName(source)` vergleicht — für eine Quelle mit Scope die ganze
   Quelle. Jetzt bekommt sie `quartzPluginName(source)`. Mit der CLI an einer Kopie von
   `gui-test`: Kurzname → Eintrag bleibt, voller Name → Eintrag weg, die übrigen 60 inhaltsgleich,
   Lockfile byte-gleich, Bau grün (267 Dateien, kein `toc`). An der gebauten App (1280 und 1600,
   Wegwerf-Profil): vorher 1 → 1 Eintrag, die Zeile bleibt, keine Meldung; nachher 1 → 0, die Zeile
   ist weg; `obsidian-plugin-excalidraw` (git-Quelle, zwei Instanzen) als Gegenprobe vorher wie
   nachher 2 → 0. Nebenbei gesehen: ~~Jede CLI-Plugin-Aktion bricht lange Zeichenketten in
   `quartz.config.yaml` neu um (inhaltsgleich)~~ — behoben (2026-10-09): Es war ein Hin und Her.
   Die CLI schreibt mit `lineWidth: 120` (`writeDataToFile` in `quartz/cli/plugin-data.js`), die
   App schrieb mit der Vorgabe von `yaml` (80); jetzt `doc.toString({ lineWidth: 120 })`. Gemessen
   an der gebauten App (Wegwerf-Profil, `cp -Rc`-Kopie von `gui-test`, CLI-Schreiber wörtlich
   nachgespielt mit dem `yaml` des Projekts, dazwischen `config.save` der App): vorher wechselten
   je Richtung 218 von 547 Zeilen, nachher 0; Inhalt gleich. Ein Projekt, das zuletzt die App
   geschrieben hat, wird beim ersten Speichern einmal auf 120 umgebrochen. ~~Das Lockfile verliert nach
   der Reparatur aus Punkt 5 seinen Zeilenumbruch am Ende (`writeJsonFile`), den die CLI beim
   nächsten Schreiben wieder setzt~~ — behoben (2026-10-09): `repointProjectPaths` schreibt das
   Lockfile in der Form der CLI (`JSON.stringify(…, null, 2) + "\n"`, `writeLockfile` in
   `quartz/cli/plugin-data.js`). Gemessen an der gebauten App (Wegwerf-Profil, `cp -Rc`-Kopie von
   `gui-test`, `projects.add`): vorher 10 → 0 Pfade des Originals und kein Zeilenumbruch am Ende,
   nachher 10 → 0 und die Datei byte-gleich bis auf die Pfade.
2. ~~`marketplaceReadmeArgs` lässt `owner/.` als Repo-Angabe zu~~ — behoben (2026-10-09): `fetch`
   streicht das Segment `.`, `owner/.` fragte also `/repos/owner/readme`. Gemessen an der gebauten
   App mit gestubbtem `fetch` im Hauptprozess: vorher angenommen und dorthin gefragt, nachher
   abgewiesen; `owner/.github`, `owner/repo.js` und `owner/repo` gehen weiter durch.
3. ~~Jede Änderung der Sprachliste (Mehrsprachigkeit) schreibt alle Codes neu, auch unveränderte~~
   — behoben (2026-10-09): `writeLanguages` legt die Sprachen in die Liste zurück, aus der sie
   gelesen sind. Eine unveränderte Sprache bleibt, wie sie dasteht; ein Eintrag ohne Code bleibt
   an seinem Platz; ein doppelter Code bleibt, solange seine Sprache noch da ist und vor ihm steht,
   sonst brächte Entfernen oder Umbenennen ihn unter dem alten Code zurück. Gemessen an der
   gebauten App (1280 und 1600) mit `['DE', {code: ' En '}, {code: 'fr'}, {label: 'kaputt'}, 'de']`
   und „Früher“ auf `fr`: vorher `["de","fr",{"code":"en",…}]`, nachher
   `["DE",{"code":"fr"},{"code":" En ",…},{"label":"kaputt"},"de"]`.
4. ~~`npm run smoke` startet mit dem echten Profil des Nutzers, nicht mit einem Wegwerf-Profil~~
   — behoben (2026-10-09): ein Profil unter `os.tmpdir()`, am Ende gelöscht, darin das erste
   Projekt der Liste (oder `--project <pfad>`) über `projects.add` eingetragen. Vorher schrieb ein
   Lauf `window-state.json` (das Fenster stand danach auf 1728×1000), `projects.json`,
   `running-servers.json`, `Preferences` und den Sitzungsspeicher des echten Profils; nachher
   ändert sich dort keine Datei (Größe und mtime aller 3643 Dateien vor und nach dem Lauf
   verglichen). Die Zugänge-Karte zeigt im Wegwerf-Profil keine Einträge — der Smoke besucht sie
   damit leer.
5. ~~Eine `cp -Rc`-Kopie eines Projekts nennt die Frames des Originals mit absolutem Pfad~~ —
   behoben (2026-10-09): `repointAuthoredFrames`, bisher nur nach einem Restore, läuft jetzt auch
   bei `projects.add` und an der Bau-Tür (`refreshAuthoredFrames`). Gemessen an der gebauten App
   (1280 und 1600, Wegwerf-Profil) mit einer `cp -Rc`-Kopie von `gui-test` im Scratchpad: vorher
   nannten nach Eintragen und Bauen alle 5 Config-Einträge, 10 Lockfile-Pfade und 5 Symlinks unter
   `.quartz/plugins/` das Original; nachher nach dem Eintragen 0, und ebenso nach einem Bau, vor
   dem die alten Pfade wieder eingesetzt wurden (die Kopie, die vor dem Fix eingetragen war). In
   der Config ändern sich nur diese fünf Zeilen, das Lockfile nur in diesen Pfaden; Config,
   Lockfile, Frames und Symlinks des Originals unverändert (Prüfsumme und mtimes).

**Lücken, die das 41. Review stehen ließ:**

- ~~Ein Menüpunkt, der die Route wechselt (`app:navigate`), fragt nicht nach ungespeicherten
  Änderungen~~ — behoben (2026-10-09): Die Frage der Sidebar steht jetzt als `confirmLeave()` in
  `unsavedGuard.tsx`, und der Hörer in `App.tsx` stellt sie vor jedem Menü-Sprung; wer schon am
  Ziel ist (Cmd+, auf den Einstellungen), wird nicht gefragt. Gemessen an der gebauten App (1280
  und 1600, Wegwerf-Profil, `cp -Rc`-Kopie von `gui-test`, Menüpunkt über `MenuItem.click()`,
  Dialog im Hauptprozess gespiegelt): vorher landete Cmd+, mit geändertem Seitentitel auf
  Konfiguration in allen drei Antworten ohne Dialog auf den Einstellungen, die Änderung war weg;
  nachher drei Knöpfe, Abbrechen bleibt, Speichern schreibt den Titel und geht, Verwerfen geht
  ohne zu schreiben. Die Sidebar antwortet nach dem Umzug wie vorher (dieselben drei Fälle).
  Nicht verändert: „Zurück“ der Einstellungen fragt weiter mit eigenem Zwei-Knopf-Dialog.
- ~~Die Leisten der Plugin-Reiter sagen nur in der `InfoNote` über der Liste, dass sie sofort
  schreiben~~ — behoben (2026-10-09): `SavesImmediately` (`src/routes/Plugins/`) steht im Kopf
  jeder Leiste neben dem „Gespeichert“ und sagt „Speichert ohne Knopf — ein Schalter sofort, ein
  Textfeld beim Verlassen.“ Gemessen an der gebauten App (1280 und 1600, Wegwerf-Profil,
  `cp -Rc`-Kopie von `gui-test`), je erste Zeile von Installiert, Navigationen, Zusätzliche Inhalte,
  Mehrsprachigkeit und dort zusätzlich ein Abschnitt: vorher stand der Satz in 0 von 5 Leisten
  (Installiert sagte es auch über der Liste nicht), nachher in 5 von 5, eine Zeile, kein
  Seiten-Überlauf. Nebenbefund: ~~Die Leiste von „Zusätzliche Inhalte“ rollt bei 1280
  waagerecht (`scrollWidth > clientWidth`), vorher wie nachher; bei 1600 nicht~~ — erledigt mit
  `001a8ee` (Textfeld des Optionsformulars, unten). Nachgemessen an der gebauten App (Wegwerf-
  Profil, `cp -Rc`-Kopie von `gui-test`, alle sieben echten Kästen, jeder eingeklappte Abschnitt
  geöffnet): mit `editors.tsx` von vor `001a8ee` liefen bei 1280 alle sieben über (das Textfeld
  17 px, bei der Datei-Box 43 px über den Rand), mit dem Fix bei 1280 und 1600 keiner.
- ~~Kein Prüfskript lädt die Funktionen der installierten Plugins gegen ihre Abschriften
  (`*_READ_AGAINST`)~~ — erledigt (2026-10-09): `npm run check:plugin-copies -- <projekt>`.
  Gegenprobe: `normalizeCode` ohne `toLowerCase()` ergibt 129 von 240 Abweichungen bei
  Mehrsprachigkeit. Erster Lauf an `gui-test` (alle drei Plugins in der gelesenen Version):
  637 Fälle, **20 Abweichungen, nicht behoben** —
  - Mehrsprachigkeit: 240 Fälle, alle gleich.
  - Navigationen, `variantOf`: `variant: horizontal` liest das Plugin als `bar` (alter Name aus
    0.1.x), die App als `tree`.
  - Navigationen, `hasNoEffect`: `mobile` bei `select` und `pager` heißt „ohne Wirkung“, aber die
    Wurzel trägt `quartz-nav--mobile-<wert>`, und `hidden` blendet sie per CSS aus — die eine
    Richtung, in der die App eine wirksame Option wegfaltet. Dazu 14 in der anderen Richtung, alle
    mit `mobile: accordion`: `folderDefaultState` (sechs Arten; ein nur mobil faltender Ordner ist
    immer offen gerendert, Popups nie), `chevrons` (vier; dort steht der Pfeil wegen des getrennten
    Links immer), `expandActive` bei flyout/dropdown/mega (Popups bekommen nie `data-persist`).
  - Zusätzliche Inhalte: `file: ""` und `dir: ""` liest die App als Vorgabe, das Plugin rendert
    nichts (leerer Name verweigert, leerer Ordner ist die Projektwurzel); `html: null` (ein leeres
    `html:` in YAML) liest die App als Datei, das Plugin stürzt mit `TypeError` ab — das ist auch
    ein Befund für quartz-layout-box.
- ~~Die 20 Abweichungen~~ — behoben (2026-10-09), in den Abschriften, nicht im Plugin:
  `variantOf` kennt die alten Namen (`vertical`, `horizontal`); `mobile` hat bei keiner Art „keine
  Wirkung“ mehr; `chevrons`, `folderDefaultState` und `expandActive` fragen bei `mobile:
  accordion` nur noch das, was das Plugin für einen nur mobil faltenden Ordner liest (immer offen,
  immer getrennte Zeile mit Pfeil, `expandActive` nur neben einem gemerkten Zustand, den ein Popup
  nie hat). Bei layout-box gilt `html` als gesetzt, sobald der Schlüssel da ist, ein leerer `dir`
  ist das Projekt (`.`), ein leerer `file` der Ordner selbst, und ein Wert, der kein Text ist,
  heißt jetzt so: `brokenOptions()` nennt ihn, die Zeile sagt „Fehler: „html“ ohne Wert“, die
  Leiste sagt den Satz mit Ausweg. Das Prüfskript hat dafür vier Fälle mehr (`file: null`,
  `dir: null`, `html: null` je Sprache, eine Schnipseldatei in der Wurzel) und zählt einen Ordner
  als Pfad als „nichts“: 641 Fälle, keine Abweichung; Gegenprobe je Fix (sieben Rückbauten, jeder
  schlägt an). Gemessen an der gebauten App (1280 und 1600, Wegwerf-Profil, `cp -Rc`-Kopie von
  `gui-test` mit je drei Einträgen der Fälle), vorher → nachher: `horizontal` als „Baum“ →
  „Leiste“; `mobile` bei der Auswahlliste weggefaltet → oben; `chevrons` beim Baum mit
  Mobil-Akkordeon oben → weggefaltet; die drei Kästen alle „Datei quartz/static/snippets/
  snippet.html“ → „Fehler: „html“ ohne Wert“, „Datei quartz/static/snippets/“, „Datei
  ./snippet.html“. Der Ausweg der Meldung ist an der Oberfläche gemessen: Zurücksetzen an `html`
  lässt in der YAML nur `title` stehen, der Kasten zeigt „Datei“, der Satz ist weg. Offen: der
  `TypeError` an `null` in quartz-layout-box selbst (ein leeres `html:` sollte wie ein fehlendes
  gelten) — ein Fix dort ist ein Plugin-Release. Nebenbefund, nicht angefasst: Das JSON-Textfeld
  des allgemeinen Formulars (`w-[28rem] max-w-full`) steht in der 448-px-Leiste bei 1280 um 17 px
  über — vermutlich auch die Ursache des Überlaufs von „Zusätzliche Inhalte“ oben.
- ~~Ein leeres `html:` bricht quartz-layout-box ab~~ — behoben im Plugin (2026-10-09,
  quartz-layout-box **0.4.1**, Tag `v0.4.1` auf `5a21a5b`, CI grün): Schlüssel mit `null` werden vor
  dem Zusammenführen verworfen, in den Grundoptionen und je `byLang`-Eintrag. Vier neue Tests, alle
  vier am alten Code mit `TypeError`. Gegenprobe am echten `quartz build` einer Kopie von gui-test
  mit drei solchen Kästen: 0.4.0 bricht in `applyPlaceholders` ab, 0.4.1 baut, und alle drei zeigen
  den Inhalt der Vorgabe. Die App liest jetzt gegen 0.4.1 (`withoutNulls`, `mergedVariants`) und
  sagt den Fehler nur noch, wenn das Projekt eine Version davor installiert hat (`nullBreaks`, die
  Version aus `optionSchema`); in 0.4.1 klappt ein leeres `html` unter „Ohne Wirkung, weil ohne
  Wert“ weg. `check:plugin-copies` hat zwei Fälle mehr (645) und ist gegen beide Versionen gleich;
  Gegenproben: Version ignoriert → 6 Abweichungen gegen 0.4.0, `null` nicht verworfen → 6 gegen
  0.4.1. Gemessen an der gebauten App bei 1280 und 1600 mit beiden Versionen, Zurücksetzen lässt
  in beiden nur `title` stehen. Kein Projekt ist auf 0.4.1 gehoben; gui-test bleibt auf 0.4.0.
- ~~Das Textfeld des Optionsformulars steht über die Leiste~~ — behoben (2026-10-09): Gemessen war
  es nicht das Feld selbst, sondern sein Flex-Element — `max-w-full` hatte nichts zu binden, weil
  ein Flex-Element nicht unter seinen Inhalt schrumpft (Textfeld 448 px in einer 404-px-Zeile). Die
  Zeile des Formulars gibt ihren Kindern `min-w-0`, das mehrzeilige Textfeld seiner Spalte auch.
  Vorher bei 1280 an allen drei Null-Kästen `scrollWidth > clientWidth`, nachher bei 1280 und 1600
  kein Element mehr über dem Rand der Leiste.
- ~~Das Standard-Frame liest nicht die `variables.scss` des Projekts, sondern nennt Quartz' Maße~~
  — behoben (2026-10-09): `layoutFrames.quartzMeasures` (neuer Kanal mit Objekt-Argument)
  kompiliert mit dem sass des Projekts ein Stück SCSS gegen `quartz/styles/variables.scss` —
  Spalten und Abstände der drei `$…Grid`, `$breakpoints` — und wertet die `max-width` von `.page`
  aus base.scss im selben Gültigkeitsbereich aus. Vorschau, Breakpoint-Reiter, Hinweis und „Als
  eigenes Frame anpassen“ nehmen diese Werte; nicht lesbar heißt „nicht lesbar“, mit Grund, und
  dann Quartz' Zahlen. Übernommen werden Maße, nicht die Anordnung: Eine abweichende Spaltenzahl
  behält Quartz' Spalten und sagt es. Gemessen an der gebauten App (1280 und 1600, Wegwerf-Profil,
  drei `cp -Rc`-Kopien von `gui-test`: unverändert; Seitenleisten 280 px, Spaltenabstand 2rem,
  Grenzen 700/1400, `+ 200px` in base.scss; ohne variables.scss): vorher zeigten alle drei
  320/806/320, 5 px, „> 1200 / ≤ 800“ und eine Kopie mit 1500px; nachher die geänderte Kopie
  280/832/280, Spaltenabstand 2rem, „> 1400 / 701–1400 / ≤ 700“ und eine Kopie mit 1600px, die
  unveränderte wie vorher, die ohne Datei Quartz' Werte mit dem Satz, dass die Datei fehlt. Original
  unverändert (Prüfsummen von Config, Lockfile, variables.scss, base.scss). Nicht angefasst: Die
  Bühne des Layout-Boards zeichnet das Standard-Frame weiter aus `DEFAULT_FRAME_GRID`
  (`LayoutEditor/utils.ts`), also mit Quartz' Proportionen.

**Ältere aus der 1.1-Arbeit:**

- `SegmentedControl` `variant="chips"` hat seit der Ziel-Liste keinen Aufrufer.
- Die Einstellungen setzen ein eigenes `max-w-5xl` (`Settings.tsx`).
- Eine Variable hat zwei Rücksetz-Knöpfe mit zwei Wörtern für dieselbe Handlung
  (`styles.variables.reset` in der Zeile, `resetToOriginal` im Panel).
- `check:i18n` meldet keine Schlüssel, die kein Aufruf mehr nennt.
- Die Mehrsprachigkeit-Seite trägt den Namen zweimal (Reiter und Karte `multilanguageEditor.title`).
- Ein umbenannter Sprachcode zieht Seiten und Ordner mit dem alten Code nicht mit (bewusst, siehe
  `renameLanguage`, aber nirgends gesagt).
- Die Chips der Bühne haben kein Kennzeichen für eine Abweichung je Seitentyp.
- Handbuch-Kapitel und Screenshots für die neuen Seiten (gehört zu P8).
- Die Messwege der Runde nach der Rückmeldung (Seitenleiste, Plugin-Editoren) stehen nicht in
  diesem Plan.

## Rückstand außerhalb von 1.1

VoiceOver-Durchgang (Git-Sync, Board, Frame-Builder, Schriftliste), Schlüsselbund-Hänger beim Start
unter Linux, Smoke-Abbruch „promise was garbage collected“, Kern-Update-Abbruch mit git < 2.38 auf
Linux, glibc < 2.34, macOS x64.
