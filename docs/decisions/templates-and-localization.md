# Vorlagen-Pakete und Übersetzungen

Aus CLAUDE.md ausgelagert (2026-09-02): die Messungen und Beobachtungen hinter den Regeln, wortgleich. Die Regeln selbst stehen in CLAUDE.md; hier steht, welches Experiment sie erzwungen hat. Neue Einträge kommen mit derselben Form dazu: was gemessen wurde, was daraus folgt.

**A Vorlagen-Paket is one file, and every slice of it is self-contained.** `templatePackage/` (dispatcher + `parts.ts` + `shared.ts`, the same shape `deploy/` has) writes a `.qtpl` - a ZIP holding `manifest.json`, one `parts/<id>.json` per slice, and the binary files under `files/` - so a template can be handed to another person rather than being a folder they have to zip themselves. `zipArchive.ts` reads and writes it with Node's own zlib (`deflateRawSync` *is* ZIP's method 8; `zlib.crc32` exists in Electron 33's Node 20.18.3, verified against the real binary), hand-rolled rather than pulled in as a dependency. Verified round-trip against `unzip -t`, python's `zipfile` and macOS' `ditto`, unicode filenames included; an already-compressed payload is stored rather than deflated, and ZIP64 is refused rather than silently truncated.
  - **The twelve parts are finer-grained than the six categories they replaced, because each one has to reproduce itself alone.** Three splits carry the reasoning. `theme` owns the whole `@quartz-themes/core` entry *and* installs `@quartz-themes/<id>` - the old `plugins` category carried the config entry and never the npm package, so a package with a community theme built nowhere but the machine it was made on. `plugins` also excludes authored frames: their entry's `source` is an absolute path under the **exporting** machine's `.quartz-gui/authored-frames/` (confirmed in a real export - two entries reading `/Users/…/gui-test/…`), which is meaningless elsewhere, so `frames` re-registers them from their definitions. And custom.scss is split along its own managed blocks - `cssVariables` owns `css-vars`, `fonts` owns `fonts` (the @font-face rules travel with the files they point at), `styles` owns the free body plus `custom/`+`imported/` and the load order - which is what makes any subset importable in any combination. The old export carried **none** of `quartz/styles/custom/`, the breakpoints, the presets or the translations, and flattened the `@use` order it did carry.
  - **Adding a part later is one entry in `PARTS`, not a branch in three if-chains.** A part is `collect`/`plan`/`apply` (plus an optional `probe` for a part whose export has an option). `TEMPLATE_PART_IDS` is *both* the registry order and the apply order, and that order is load-bearing: frames and plugins mutate quartz.config.yaml through the Quartz CLI and must precede the parts that write it from an in-memory copy, and the three parts that share custom.scss run last, one at a time. A part id an older app does not know is reported in `TemplatePackagePlan.unknownParts` rather than silently skipped, which is what `formatVersion` is for.
  - **The preview is a real dry run, and the conflict rule is a choice.** `planImport` reads the package *and* the target and reports per part what would be added and what already exists; the old preview only echoed the manifest back, so the first thing a user learned about an import was its warnings. `packageWins` (the default, since "everything as it was at export" is the point) replaces; `projectWins` keeps and warns. A snapshot is taken first either way, which is what makes the default safe.
  - **`quartz plugin add` can exit 0 and write no config entry.** With a `.quartz/plugins/<id>` link already in place - which a project that once had this frame can easily still have - the CLI reports success and quartz.config.yaml gains nothing, so the frame is built by nothing while looking installed. Reproduced against a real project (45 → 45 entries instead of 47). The frames part therefore re-reads the config and writes the entry itself if it is missing, the same "check the file, don't trust the exit code" rule `createService` applies to `quartz create`.
  - **The plugins part installs only what is missing and writes one config save.** The old import ran `quartz plugin add` per entry: for the 48-entry package a real project produces that meant 48 npm installs for packages Quartz already ships, 48 snapshots (`pluginChange` does not coalesce) and 48 config writes. Now a bare npm specifier that already resolves in `node_modules` is only a config entry, and only a `github:`/`git+`/path source - which the CLI has to clone and build - goes through it. `saveFrame` grew a `{ snapshot: false }` option for the same reason. Measured: a full import of a 48-plugin, 2-frame, 1-theme package into a fresh install takes about 5 seconds, and the resulting `quartz.config.yaml` is semantically identical to the source's - all 48 entries, theme and layout equal - and builds.
  - **The update protection has two halves, and the attribute alone is inert.** `merge=ours` in `.gitattributes` names a merge *driver*, and git ships none by that name - measured against real git 2.50.1: with the line in place but `merge.ours.driver` unset, merging an upstream change into an edited locale file conflicted exactly as it does without the attribute, with no warning of any kind; setting `git config merge.ours.driver true` (that is `/usr/bin/true`, which succeeds without writing, so git takes the working-tree version) made the same merge keep the user's wording. The driver is repository configuration and is never committed, so shipping only the `.gitattributes` line could not have protected anything anywhere. `ensureGitAttributes` therefore writes both and `getGitAttributesStatus` requires both - and since the app could fix it all along, the tab's badge now offers the action instead of only naming the problem.
  - **Translations are exported as *your changes*, and that needs a baseline the project does not otherwise have.** Quartz has no override layer - edits go straight into its tracked `quartz/i18n/locales/*.ts` - and once an edit is committed (which Git-Sync does routinely, and the update protection below then preserves through every core update) git can no longer tell the user's wording from upstream's. So `saveLocaleEntry` copies the file to `.quartz-gui/locale-baseline/<code>.ts` **before** its first edit; the comparison then reuses `getLocaleEntries` on both sides, which makes a key changed and changed back correctly read as unchanged. Where no baseline exists the fallback is `git show HEAD:<file>`, but *only* when the working tree differs from HEAD - a clean file tells us nothing, and answering "no changes" there would be a lie, so it reports `none` and the export form offers "Alle Texte" instead with both counts shown. Reading must never create the directory: `quartzGuiDir()` creates what it is asked for, and the read path using it left an empty `locale-baseline/` in every project merely looked at.
  - **Packages in the pre-1 folder format stay readable.** `loadLegacyFolder` converts the six old files into the new parts in memory - splitting `colors.json` into `appearance`+`cssVariables`, lifting the theme entry out of `plugins.json` and dropping the frame entries' absolute paths. Nothing writes that shape any more; it is read so that folders already on a user's disk do not become unopenable.
  - **A package's own file names were a way out of the project (2026-09-05).** `payload.files` and the ZIP entry names were joined onto a directory unchecked in three parts. Measured with a hand-built package whose `content` part listed `../REVIEW-TRAVERSAL-PROOF.md`, with a matching entry `files/content/../REVIEW-TRAVERSAL-PROOF.md`: the file landed in the target project's root, the plan called it an addition, and the import answered `success: true` with an empty warning list. `fonts` and `styles` carried the same shape, older than that review. Now two layers: `readZip` refuses an archive carrying an absolute name, a `..` segment, a drive letter or a NUL - nothing this app writes produces one, so such an archive was written by something else and a file list that cannot be trusted has no trustworthy half - and `containedPath()` decides every write target by `resolve()`+`relative()`, in `plan` as well as in `apply`, so the plan cannot promise a file apply would refuse. Measured after: the prepared package is rejected by `plan` (null) and by `import` (`packageUnreadable`), nothing is written, a benign package of the same construction still imports, and the real example template (34 stylesheets, 51 plugins) plans unchanged.
  - **Ein halb geschriebener Cache schlug die heile Kopie, einen Tag lang (2026-09-05).** `builtinTemplateService` schrieb den Download mit einem blanken `writeFile`, prüfte ihn an zwei Magic-Bytes und entschied per `existsSync`, welche Kopie herausgeht. Stirbt die App beim Schreiben, ist der Torso trotzdem eine Datei mit frischer mtime: `getBuiltinTemplate` gab ihn heraus, `planImport` antwortete `null`, und `Home.tsx` legte das Projekt wegen eines `if (plan)` ohne `else` still ohne Vorlage an - der Nutzer bekam ein Projekt, dem seine ganze Gestaltung fehlte, ohne ein Wort dazu. Jetzt wird der Download durch *Lesen* geprüft (`readZip` verifiziert nebenbei jede CRC; ein Paket ohne `manifest.json` ist keines), über Temp-Datei mit `fsync` und `rename` geschrieben, und herausgegeben wird nur eine Kopie, die sich öffnen lässt - Cache wie Bundle. Ein unlesbarer Cache wird gelöscht statt übersprungen, weil seine mtime den reparierenden Download sonst 24 Stunden aufhält, und *ein* Download wird sofort versucht. Gemessen an der gebauten App mit den ersten 120 kB des echten Pakets als Torso: mit Netz wird er gelöscht, neu geholt und als `downloaded` mit 11-teiligem Plan beantwortet; mit der URL auf einen 404 gezeigt wird derselbe Torso gelöscht und die mitgelieferte Kopie beantwortet, ebenfalls mit 11 Teilen. Vorher gab es in beiden Zuständen den Torso. Kosten der Prüfung, gemessen am echten Paket (552 kB, 323 Einträge): 7 ms.
  - **Der Assistent versprach Dinge, die er nicht halten konnte (2026-09-05).** Vier Befunde aus demselben Durchgang, alle im Weg „neues Projekt mit Beispielvorlage“. *Der Schalter „Mit den Beispielseiten“ stand unabhängig von der Content-Strategie auf an*, und der Import lief mit `packageWins`: bei „vorhandene Notizen kopieren“ ersetzte die Startseite der Vorlage die `index.md` des Nutzers, und die einzige Spur war der Snapshot, von dem er nichts weiß; bei „Symlink“ konnte der Schalter gar nichts tun, weil der content-Baustein einen verlinkten Ordner ohnehin verweigert. Er ist jetzt nur bei „neu anfangen“ lebendig, sonst aus und deaktiviert, mit dem jeweiligen Grund als Hinweis — gemessen in beiden Farbschemata. *Das Ergebnis von `templatePackage.import` wurde weggeworfen*, also verschwanden genau die Warnungen, die auf der Vorlagen-Seite sichtbar sind, auf dem Weg, den die meisten nehmen; `ImportOutcome` ist jetzt eine eigene Komponente und wird von beiden benutzt, und mit etwas zu melden bleibt der Dialog auf einem Abschluss-Schirm stehen, statt wegzunavigieren. *`plan.notes` wurde nirgends gerendert*: gemessen am echten Paket meldete der content-Baustein 273 `identical:`-Notizen und der fonts-Baustein 4, und beide Zeilen sagten „ändert nichts“; die zählbaren Notizen stehen jetzt bei den anderen Zahlen, die eine, die ein ganzer Satz ist (`contentIsSymlink`), auf einer eigenen Zeile. *Und ein Fehler beim Vorlagenschritt ließ den Assistenten tot stehen* — das Projekt war angelegt, ein zweiter Klick konnte nur an „Ziel existiert“ scheitern, Abbrechen führte auf eine Liste ohne das neue Projekt, und die Meldung überlebte bis zum nächsten Öffnen; alle Wege nach `quartz create` enden jetzt an derselben Stelle.
  - **Zwei Wege an der Symlink-Sperre vorbei, und einer aus dem Export heraus (2026-09-05).** `getContentStatus` fragte `existsSync`, das dem Link folgt: ein `content/` auf ein ausgehängtes Laufwerk antwortete „gibt es nicht“ (`exists: false, isSymlink: false`), der Plan listete jede Notiz als Ergänzung und der Import endete in `partFailed:content:ENOTDIR … mkdir …/content` — gemessen. Mit `lstat` ist es ein Link mit fehlendem Ziel, der Plan sagt, dass der Baustein übersprungen wird, und der Import warnt. Geprüft wurde außerdem nur `content/` selbst: mit `content/notizen -> ein Ordner außerhalb des Projekts` schrieb der Import `notizen/durch-den-link.md` genau dorthin und meldete Erfolg ohne Warnung — die Notizen einer Vorlage im Vault eines Fremden, das eine, was diese Sperre verhindern soll. `writableTarget` prüft jetzt jedes Segment des Zielpfads, die Datei eingeschlossen, für content, fonts und styles gleichermaßen. Umgekehrt beim Export: `readdir`s `isDirectory()` antwortet für den Eintrag, nicht für sein Ziel, also war ein verlinkter Ordner eine „Datei“ und `readFile` warf EISDIR — `inspectProject` fängt mit `null`, und damit verschwand der ganze content-Baustein aus dem Export-Formular (gemessen: `inspect` antwortete ohne ihn). Links werden jetzt mit `stat` aufgelöst, Schleifen über die schon betretenen Realpfade abgeschnitten, hängende übersprungen.


**Instanzen eines Plugins werden nach ihrer Position unterschieden, nicht nach ihrem Namen
(2026-09-06).** Ein Eintrag in `quartz.config.yaml` hat keine Kennung: `name` leitet
`configService.deriveName()` aus dem letzten Pfadsegment der Quelle ab. Sechs Verwendungen von
`quartz-layout-box` sind damit sechs Einträge mit einem Namen — und eine `Map`, die danach
schlüsselt, hält einen davon. Genau das tat der `plugins`-Baustein, und es kostete die anderen
fünf: Die Beispielvorlage liefert sechs Instanzen aus, im Zielprojekt kam **eine** an (BEFUNDE 1).
Mehrfachverwendung ist keine Randerscheinung — das Plugin ist dafür gemacht, und der Layout-Editor
hat einen Knopf „Duplizieren“.

`instanceKeys()` vergibt `quartz-layout-box#0`, `#1`, … in Dokumentreihenfolge, und die drei
Stellen, die vorher nach dem Namen suchten, suchen jetzt danach: die Zuordnung in `apply`, die
Vorschau in `plan` und die Verschmelzung nach dem Neulesen. Die n-te Instanz aus dem Paket
aktualisiert die n-te im Projekt, alles Weitere wird in seiner Reihenfolge angehängt.

Ein zweites Feld im Dateiformat wäre die andere Lösung gewesen und ist bewusst unterblieben: Die
Reihenfolge beantwortet die Frage schon, und ein neues Feld müsste von jedem Leser dieser Datei
verstanden werden — auch von Quartz selbst, das es nicht kennt.

Nebenbei löst dasselbe Schlüsseln ein zweites Problem, das vorher der Namensabgleich verdeckt hat:
`quartz plugin add` hängt beim Installieren einen nackten Eintrag an die Konfiguration, weil unsere
Einträge zu dem Zeitpunkt noch nicht geschrieben sind. Er liegt als nächstes Vorkommen eines Namens,
den der Baustein gerade schreibt, und bekommt deshalb einen unserer Einträge, statt als zusätzliche
optionslose Instanz stehen zu bleiben.

Gemessen an einem frisch angelegten Kontrollprojekt (`node scripts/build-example-template.mjs
--only 10,11 --fresh`): „Layout-Box-Instanzen im Ziel … 6 von 6“, keine Warnung, Build grün. An
derselben Stelle vorher: 1 von 6.

**Vier Wege durch dieselbe Stelle, alle gemessen (2026-09-06).** „Sechs von sechs" zählt Zeilen und
beantwortet damit nur ein Viertel der Frage. Nachgemessen wurde deshalb an drei Stationen —
Quellprojekt, entpacktes `.qtpl`, Zielprojekt — und über jeden Eintrag, nicht nur über die Boxen:
verglichen wurden `enabled`, `order`, `options` und `layout` je Instanzschlüssel.

- **Leeres Ziel (0 → 6).** 52 Einträge im Paket, 57 im Ziel (die vier Frames und der Theme-Eintrag
  reisen in ihren eigenen Bausteinen). **Null Abweichungen** an beiden Übergängen; jede der sechs
  Boxen kommt mit ihrer eigenen Klasse, ihrer Position, ihrer Priorität und ihrer Gruppe an.
- **Zweiter Import in dasselbe Ziel (6 → 6).** Weiterhin 57 Einträge, null Abweichungen, und die
  Vorschau meldet jetzt wahrheitsgemäß `+0 ~52` statt sechsmal denselben Namen.
- **Teilweise vorhanden (2 → 6).** Der Fall, den weder „leer" noch „vollständig" abdeckt: zwei
  Boxen im Ziel, der ersten absichtlich falsche Optionen gegeben. Danach sechs, die falschen
  Optionen **überschrieben**, die fehlenden vier in ihrer Reihenfolge angehängt (510, 520, 530,
  540), 53 → 57 Einträge, keine Warnung.
- **`projectWins` (6 → 6).** Alle 52 Einträge übersprungen, die sechs Boxen einzeln benannt
  (`pluginSkipped:quartz-layout-box` sechsmal), nichts verdoppelt, nichts verloren.

Die Reihenfolge im YAML-Array weicht dabei ab — die Frames stehen im Ziel woanders, weil sie ihr
eigener Baustein schreibt. Das ist folgenlos und nachgesehen statt angenommen:
`quartz/plugins/loader/config-loader.ts` sortiert nach `entry.order ?? manifest.defaultOrder ?? 50`
und die Komponenten danach nach `priority`. Beide Felder stimmen exakt überein.

**Ein zwölfter Baustein: die Dateien unter `quartz/static/` (2026-09-06).** Ein Paket erfasste
`quartz/styles/` und `quartz/static/fonts/` — und sonst nichts aus dem Projekt. Damit kam jede
Plugin-Option, die auf eine Datei zeigt, im Zielprojekt ins Leere: Gemessen an der Beispielvorlage
rendert `layout-box-note` dort auf **0 von 334** Seiten, während die fünf Geschwister auf jeder
stehen, und im Build-Log steht `[layout-box] Snippet file not found`. Die Vorlage wich dem aus,
indem sie ihre übrigen Instanzen auf Inline-HTML stellte und Logos als Inline-SVG führte; das ist
eine Umgehung, keine Lösung.

Der Baustein `static` trägt jetzt alles unter `quartz/static/` außer den Schriften, die ihren
eigenen haben. Gebaut wie `fonts`, samt dessen Regel, dass eine **inhaltsgleiche Datei weder
Ergänzung noch Konflikt** ist — und genau die trägt hier die Entscheidung, alles mitzunehmen statt
zu filtern: Von den sechs Dateien der Beispielvorlage sind vier byteweise Quartz' eigenes Gerüst
(`icon.png`, `og-image.png`, zwei giscus-Stylesheets, gegen ein frisch angelegtes Projekt
verglichen) und nur die zwei Snippets gehören der Vorlage. Die Vorschau meldet deshalb
`static +2 ~0`, und niemandem wird das Gerüst eines anderen übergestülpt. Was *nicht* identisch ist
— das eigene Logo eines Vorlagen-Autors — ist Gestaltung, und die trägt eine Vorlage.

Kein Filter also, sondern eine Grenze: 25 MB für den ganzen Baustein, mit demselben Wortlaut wie
beim Inhalt („eine Vorlage ist keine Mediathek"), geworfen statt stillschweigend gekürzt. Jede
Datei geht durch `writableTarget()` — Name aus einem fremden Paket, Segment für Segment auf
Symlinks geprüft.

Gemessen an einem frisch angelegten Zielprojekt: `static +2 ~0`, keine Warnung, Build grün, und
**alle sechs Boxen rendern** — `layout-box-note` auf 327 von 334 Seiten (Desktop-only), mit ihrem
Text aus der Datei statt eines Platzhalters.


---

## Eine Grenze für jede Dekompression (2026-09-06, drittes Review)

Zwei handgeschriebene Leser packen aus, was jemand anders geschrieben hat: `fontFile.ts` den
Brotli-Strom eines WOFF2 (bzw. jede Deflate-Tabelle eines WOFF), `zipArchive.ts` jeden
Deflate-Eintrag eines `.qtpl`. Beide taten es ohne `maxOutputLength`, im Hauptprozess.

Gemessen mit den gebündelten Modulen (esbuild, unveränderter Code), jede Bombe erst auf Platte und
dann in einem eigenen frischen Prozess gelesen, damit der RSS nur das Auspacken zeigt:

| Eingabe | vorher | nachher |
|---|---|---|
| 863-Byte-WOFF2, Brotli aus 512 MiB Nullen | 881 ms, 1087 MiB | 108 ms, 120 MiB |
| 261-KB-WOFF, Deflate aus 256 MiB Nullen | 129 ms, 567 MiB | 26 ms, 116 MiB |
| `.qtpl`, Eintrag behauptet 4 KiB, entpackt 512 MiB | 296 ms, 1087 MiB | 1 ms, 48 MiB |
| `.qtpl`, Eintrag behauptet ehrlich 512 MiB | 246 ms, 1086 MiB | 1 ms, 48 MiB |

Die Antwort war in allen vier Fällen vorher wie nachher dieselbe (`null` bzw. eine Fehlermeldung);
verschieden ist der Preis. Bei rund 620 000:1 erreicht eine 7-KB-Datei 4 GiB — und was darüber
liegt, endet nicht in `null`, sondern in einem abgebrochenen Hauptprozess samt aller Fenster. Der
`catch` in `readFontFace` fängt einen `RangeError` aus einer *begrenzten* Dekompression, nie einen
Out-of-Memory-Abbruch.

Die Grenze ist die eigene Zahl der Datei, wo sie kleiner ist — die Summe der WOFF2-Verzeichnislängen
ist genau das, worauf sich der Strom entpackt, weil eine transformierte Tabelle ihre transformierte
Länge trägt; `origLength` je WOFF-Tabelle; `uncompressedSize` je ZIP-Eintrag — und eine absolute
Decke, wo sie es nicht ist: 64 MiB je Schrift, 256 MiB je Paket. Die Paket-Decke wird gegen die
*angemeldeten* Größen geprüft, bevor das erste Byte entpackt wird, sonst zahlt man die ehrliche
Bombe. 256 MiB ist **nicht** aus dem eigenen Export abgeleitet — das ist keine Zahl: Von den vier
Bausteinen, die Dateien tragen, haben nur zwei eine eigene Grenze (`CONTENT_MAX_BYTES` 100 MB,
`STATIC_MAX_BYTES` 25 MB), `fonts` und `styles` lesen ohne. Die Decke ist also für das gewählt, was
der Hauptprozess halten soll, und lässt den beiden begrenzten Bausteinen den Faktor zwei. Was sie
kostet: Die größte Einzelschrift auf diesem Rechner ist 22 MB; ein volles `content` und `static`
plus acht solcher Schriften wären 301 MB und würden abgelehnt. (Der Satz stand hier bis zum
2026-09-07 als „doppelt so viel, wie der eigene Export erzeugen kann (Inhalt 100 MB, static 25)" —
ein Urteil über zwei von vier Bausteinen, das viertes Review als Befund geführt hat.)
`fontService` fragt zusätzlich die Dateigröße *vor* `readFile`, weil auch die unkomprimierte Datei
ganz in den Speicher geht; darüber wird die Regel geschrieben wie immer, dieselbe Antwort wie bei
einer unlesbaren Datei.

Gegenproben: Arial 400/700/400 kursiv/900 unverändert, `LastResort.otf` ohne `OS/2` und
`Helvetica.ttc` weiter `null`, sechs absichtlich kaputte Eingaben weiter `null`, längste Dauer 1 ms;
ein echtes 754-KB-Paket liest vorher wie nachher 354 Einträge.

---

## Der Dry-Run verschwieg, was der Import ablehnen wird (2026-09-06, drittes Review)

Vier Bausteine rufen `writableTarget()` je Datei, und alle vier beantworteten eine Ablehnung auf den
zwei Seiten derselben Entscheidung verschieden: `plan` ließ den Namen mit einem nackten `continue`
fallen, `apply` warnte `fileOutsideProject`. Der Assistent zeigte also „static +2", und der Import
meldete danach eine Warnung, die die Vorschau nie angekündigt hatte — obwohl der Plan genau das ist,
was der Nutzer ankreuzt.

Alle vier sagen jetzt `outside:<name>` in `plan.notes`, und die Zusammenfassung zählt sie neben den
anderen Zahlen, so wie `identical` seit Befund 6 vom 2026-09-05 gezählt wird. Gemessen gegen
`PARTS.static.plan` an einem Projekt, dessen `quartz/static/bilder` ein Symlink aus dem Projekt
heraus ist:

    vorher   additions=["logo.png"] conflicts=[] notes=[]
    nachher  additions=["logo.png"] conflicts=[] notes=["outside:bilder/fremd.png"]

`static` ist der neue Baustein und hatte das Muster von den drei älteren übernommen; sie werden
zusammen korrigiert, weil das Schweigen eine Gewohnheit war und nicht vier Entscheidungen.

## Der Import prüfte Frames überhaupt nicht (2026-09-07, sechstes Review)

Der Vorlagen-Baustein `frames` las seine Datei als `Array<{ id: string }>` — eine Typbehauptung,
keine Prüfung — und reichte jeden Eintrag an `saveFrame` durch. Dort wurde die **ID** geprüft
(`FRAME_ID_RE`, wirft) und sonst nichts; `migrateGridFrameDefinition` formt um und prüft nicht.
Derselbe Inhalt wird am IPC-Kanal daneben vollständig validiert (`gridFrameDefinition`: `cssIdent`
für Bereichsname und Gruppe, `frameSlot` für die Belegung), also stand die Regel „ein
Vorlagen-Paket ist so wenig eine Vertrauensgrenze wie der Renderer“ an genau einer der beiden
Türen.

Was ein ungeprüfter Bereichsname kostet, ist nicht abstrakt: Er geht wörtlich in
`grid-template-areas`, in ein `grid-area`, in den Klassennamen des erzeugten Moduls und in `AREAS`;
eine ungeprüfte Belegung indiziert `bySlot`, wo `"constructor"` dem Frame eine Funktion statt einer
Liste gibt und jeder Seiten-Render wirft.

Der Wächter steht deshalb an der Tür, an der eine Definition zu Dateien wird
(`frameDefinitionProblem()` in `layoutFrameService`, gerufen von `saveFrame`) — nicht an den
Aufrufstellen, denn davon gibt es zwei und die nächste würde ihn nicht mitbekommen. Er stellt drei
Fragen: das zod-Schema des IPC-Kanals, zwei gleiche Bereichsnamen, zwei Bereiche derselben Belegung
mit derselben Gruppe. Die letzten beiden kann kein Schema stellen, und beide kosten dasselbe wie im
Editor: CSS wirft eine ganze `grid-template-areas`-Deklaration weg, wenn ein Name zwei Rechtecke
benennt, und zwei Bereiche auf einer Gruppe zeigen deren Komponenten doppelt.

Gemessen über ein esbuild-Bündel des Dienstes, zehn Fälle:

    gültig                              — angenommen
    zwei Bereiche mit demselben Namen   Zwei Bereiche heißen „kopf“ …
    Name mit Leerzeichen                areas.0.name: not a valid CSS identifier
    Name mit }                          areas.0.name: not a valid CSS identifier
    Belegung "constructor"              areas.0.slot: Invalid option …
    Belegung "__proto__"                areas.0.slot: Invalid option …
    zwei Bereiche, eine Gruppe          Zwei Bereiche derselben Belegung halten die Gruppe „tb“ …
    Gruppe mit Leerzeichen              areas.0.group: not a valid CSS identifier
    kein Objekt                         frame: expected object, received number
    Bereiche fehlen                     areas: expected array, received undefined

`saveFrame` mit dem zweiten Fall gab `success: false` zurück und legte **kein** Verzeichnis an.
Gegenprobe, dass der Wächter nichts Echtes abweist: die vier Frames des Beispielprojekts und die
vier der Beispielvorlage gehen alle durch.

Und weil ein Dry-Run, der einen Frame als Zugang listet und ihn dann ablehnt, einen anderen Import
beschrieben hat als den, der läuft: `plan` stellt jetzt dieselbe Frage und legt `invalidFrame:<name>`
in die Notizen — gezählt in der Zusammenfassung, benannt in der Zeile darunter, genau wie `outside`
seit dem dritten Review.

## Der Dry-Run kennt den Grund und sagt ihn jetzt auch (2026-09-07)

`plan()` fragte `frameDefinitionProblem(frame) !== null`, warf die Antwort weg und legte
`invalidFrame:<name>` ab. Der Dialog sagte damit „Nicht lesbar und werden übersprungen:
„Kaputtrahmen“, „Zweitrahmen“.“ — und *warum* erfuhr man erst nach dem Klick auf Importieren.
Die Regel aus dem vierten Review (**ein Fehler, der weiß warum, muss den Grund tragen**) gilt hier
genauso, und der Grund ist zwei Zeilen vorher schon berechnet.

Gemessen an der gebauten App, mit einem von Hand gebauten `.qtpl` (Manifest, `parts/frames.json`,
ein heiler und zwei kaputte Frames) und einem Wegwerf-Profil; der Dateidialog ist ein Fenster des
Systems und wurde im Hauptprozess ersetzt, alles danach ist der gewöhnliche Weg:

    vorher   Nicht lesbar und werden übersprungen: „Kaputtrahmen“, „Zweitrahmen“.
    jetzt    Wird übersprungen: „Kaputtrahmen“ — Der Frame ist nicht lesbar: Das Feld „areas“
               fehlt oder hat den falschen Typ.
             Wird übersprungen: „Zweitrahmen“ — Der Frame ist nicht lesbar: Der Wert bei
               „breakpoints.desktop.rows“ ist zu klein oder zu kurz (Mindestwert 1).

**Eine Zeile je Frame statt einer Liste**, weil aus Namen Sätze geworden sind: Namen lassen sich mit
Komma reihen, Sätze nicht. Gekappt wie die Dateinamen daneben — drei, dann „und 2 weitere Frames“;
mit fünf kaputten Frames nachgemessen. Der Name ist schon im Hauptprozess in Anführungszeichen
gesetzt (`mainT('frameNameAndReason')`, dieselbe Fügung wie die Fehlerwarnung des Imports), denn
Deutsch und Englisch zitieren nicht gleich.

## Was für den Dry-Run galt, galt auch für das Ergebnis (2026-09-08)

Derselbe Satz wurde einen Commit vorher zur `detail` von `frameFailed` — und `ImportOutcome`
behandelt jede Art als Liste: erster Eintrag in den Satz, dann alle Einträge mit Komma dahinter. Bei
zwei kaputten Frames stand der erste damit zweimal da, und der Gedankenstrich, der in jedem Satz
Name und Grund trennt, sah aus wie der Trenner der Liste. Für 45 übersprungene Plugins ist die
Gruppierung richtig; für Sätze ist sie es hier so wenig wie im Dry-Run.

Wer eine Zeile je Fall bekommt, ist **an i18next gefragt, nicht als Namensliste gepflegt**: Eine
Interpolation mit einem Wert, der in keiner Übersetzung vorkommen kann, sagt, ob die Vorlage
`{{detail}}` überhaupt verbraucht. Der erste Anlauf war eine handgeschriebene Liste mit drei Namen —
und sie war schon beim Schreiben falsch. Gemessen gegen echtes i18next mit den gebündelten
Sprachdateien: von 22 Arten verbrauchen **sieben** ein `detail`, in beiden Sprachen dieselben
(`contentIsSymlink`, `frameFailed`, `partFailed`, `partUnreadable`, `pluginInstallFailed`,
`themeInstallFailed`, `translationFailed`). Die Liste hätte vier davon verloren, und zwar genau die,
die niemand vor Augen hat. Dieselbe Bauart wie die fünf zod-Codes eine Datei weiter, die vier Runden
hielten und dann nicht mehr — deshalb hier keine Liste.

Gekappt wird bei sechs mit „und N weitere Fälle“. Alles ohne `detail` bleibt gruppiert: Dort ist die
Kommareihe eine Liste von Namen, und für die ist sie richtig.

Gemessen an der gebauten App am **echten Import** eines von Hand gebauten `.qtpl` (Manifest,
`parts/frames.json` mit zwei kaputten Frames), Wegwerf-Profil, Klon des Beispielprojekts; die
beiden nativen Dialoge (Dateiwahl, Bestätigung) wurden im Hauptprozess ersetzt, alles danach ist
der gewöhnliche Weg:

    vorher   1. Frame konnte nicht angelegt werden: „a“ — … falschen Typ. — „a“ — … falschen
                Typ., „b“ — … erlaubten Angaben (…).
    jetzt    1. Frame konnte nicht angelegt werden: „a“ — Der Frame ist nicht lesbar: Das Feld
                „areas“ fehlt oder hat den falschen Typ.
             2. Frame konnte nicht angelegt werden: „b“ — Der Frame ist nicht lesbar: Der Wert bei
                „areas.0.slot“ ist keine der erlaubten Angaben (…).
