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

## Rückstand außerhalb von 1.1

VoiceOver-Durchgang (Git-Sync, Board, Frame-Builder, Schriftliste), Schlüsselbund-Hänger beim Start
unter Linux, Smoke-Abbruch „promise was garbage collected“, Kern-Update-Abbruch mit git < 2.38 auf
Linux, glibc < 2.34, macOS x64.
