# Sprachdateien, Vokabular und Fachbegriffe

Aus CLAUDE.md ausgelagert (2026-09-02): die Messungen und Beobachtungen hinter den Regeln, wortgleich. Die Regeln selbst stehen in CLAUDE.md; hier steht, welches Experiment sie erzwungen hat. Neue Einträge kommen mit derselben Form dazu: was gemessen wurde, was daraus folgt.

**Every string a user reads is in `de.ts`/`en.ts` or in `electron/main/i18n.ts` — there is no third place.** The renderer's two files are kept in exact key parity (1151 keys, checked by flattening both and diffing, including `{{placeholder}}` sets); the main process has its own hand-rolled dictionary because it has no DOM and needs no plurals or namespaces. Four rules that each came out of a real defect:
- **A data file is not a place for a label.** `data/cssVariables.ts` filed every variable under a German group name and both panels that list groups printed that string as a heading, so the English build showed "Grundfarben". A group is an id now, and `groupLabel()` next to `groupOf()` in `variableGraph.ts` is the one place that resolves it — including the uncurated case, where the id *is* the variable's own name prefix and passes straight through as the label.
- **A class component reads the i18next singleton, not a hook.** `RouteErrorBoundary` has to be a class (only a class catches a render error), so its two strings come from `i18n.t`. That is the whole exception; everything else uses `useTranslation`.
- **`mainT()` is synchronous and the language is cached.** Its callers are error paths deep inside services where an async settings read has no place, and a message must not change language halfway through one operation. `refreshMainLanguage()` runs where `applyAppMenu()` already does — in `whenReady` before the window exists, and on every settings save — which is what makes the macOS menu bar *and* a thrown service message follow the Sprache select live, verified both ways in the running app.
- **The zod messages in `ipc/schemas.ts` and every `console.error` stay English on purpose.** An invalid IPC argument is a bug in this app rather than something a user typed, and zod assembles the message at schema-construction time, before any language is known. The sentence `handle.ts` puts in front of that detail *is* translated and says exactly that, so the user learns it is a bug to report rather than a field to fix.

**Vocabulary is a single table, not a per-page copy.** The seven layout slots had one in `layoutEditor.positions` and another in `pluginsInstalled.positions`, and they disagreed ("Header"/"Links"/"Footer" vs "Kopfbereich"/"Linke Seitenleiste"/"Fußzeile") for the very same slot; they are one top-level `positions` table both pages read. Same rule caught three more drifts: the content folder was the "Inhalte-Ordner", the "content/-Ordner" and the "content-Ordner" on three screens (it is the **Content-Ordner**), the base URL was "Base URL", "Adresse" and "Basis-URL" including in the hint that tells you where to set it (it is the **Basis-URL**), and the Übersicht counted "Stände" while the page it links to only ever says **Snapshot**. German prose uses `„…“`, English `“…”`, and a dash between two words is an em dash — the exceptions are the CSS comment the heading-fonts fix writes into a stylesheet and the `.callout[data-callout="…"]` selector, which quote code.

**A term of art needs a line under it, and `Field`/`Toggle` both carry one.** Konfiguration → Website was seven labels lifted straight out of quartz.config.yaml with one hint between them ("Base URL", "Locale", "Single-Page-App-Routing", "Popover-Vorschauen", "Ignore-Patterns"); `Toggle` grew the `hint` line `Field` already had, since two of those are switches. Where a whole page rests on a word the app never defines, that goes in an `InfoNote` at the top of the page that owns the word — what a snapshot is and how it is not Git-Sync (Backups), what separates a Zugang from a Ziel (Veröffentlichen), what a Frame is (Layout → Eigene Frames). It is capped at `max-w-[95ch]`: it is a paragraph to read, and at 1800px a line of it runs past 200 characters.

**Key parity is not key completeness — `npm run check:i18n` (2026-09-02).** The alpha test's GitHub-Pages step showed a button labelled `publish.pages.saveSettings`: i18next resolves a missing key to the key itself, so the gap reached the screen as a dotted string instead of an error. Both language files were missing it, so the parity check that guards `de.ts`/`en.ts` said nothing, and the label only appears in one state — once Pages already reads the target branch, which is the second visit onwards — so no earlier pass had seen it. `scripts/check-i18n-keys.mjs` closes that: it collects every literal `t('…')` in `src/` and `mainT('…')` in `electron/` and resolves each against the flattened language files, counting `key_one`/`key_other` as a match because i18next does (`usedBy`, `confirmDeleteInUse` and `cacheSize` only exist in plural form and were false positives until that rule went in). Over the current tree: 921 renderer keys, 107 main-process keys, one genuine gap — the one above. Keys built from a variable are deliberately out of scope; they cannot be resolved statically, and guessing the possible values would report failures that are not real.

**`mainT()` auf Modulebene friert die Sprache ein (2026-09-02).** Die Regel oben — `mainT()` ist synchron und liest eine gecachte Sprache, die `refreshMainLanguage()` in `whenReady` füllt — hat eine Bedingung, die vorher nirgends stand: *aufgerufen* werden darf sie erst danach. Zwei Konstanten taten es früher. `rsync.ts` baute eine `Record<RsyncBlockReason, string>`-Tabelle mit fünf `mainT()`-Aufrufen im Modulrumpf, `githubService.ts` hielt `const NO_TOKEN = mainT('githubNoToken')`; beide Module importiert `handlers.ts`, und ein Import läuft lange vor `whenReady`. Ergebnis: sechs Texte standen für die Lebensdauer des Prozesses in der Vorgabesprache (`let language = 'en'`), unabhängig davon, was der Sprache-Schalter sagte. Aufgefallen ist es beim Nachmessen des rsync-Befunds — eine durchgehend deutsche App antwortete „No rsync is installed on this machine“. Behoben, indem beide Stellen zu Aufrufen *innerhalb* einer Funktion werden (`blockerMessage(reason)` mit `switch`, `mainT()` direkt am Rückgabewert), und abgesichert durch einen Wächter in `mainT()` selbst: wird es vor dem ersten `refreshMainLanguage()` aufgerufen, geht eine `console.error` mit dem Schlüssel und dem Grund raus. Der Wächter blieb über einen vollständigen Smoke-Lauf (38 Aufrufe) still — es gibt keinen legitimen Aufruf vor der Initialisierung.

## `<html lang>` folgt der Sprache (S3, 2026-09-03)

`index.html` trug `lang="de"` als feste Zeichenkette — seit die App zwei Sprachen spricht, ist das
schlicht falsch, sobald sie Englisch spricht. Das Attribut ist kein Beiwerk: ein Screenreader wählt
danach Stimme und Aussprache, und die Rechtschreibprüfung in jedem Textfeld richtet sich ebenfalls
danach. Gesetzt wird jetzt in `i18n/index.ts` aus `resolvedLanguage` — beim Start und über
`i18n.on('languageChanged', …)` bei jedem Wechsel. Aus der *aufgelösten* Sprache, nicht aus der
Einstellung: „Systemeinstellung“ sagt nichts darüber, welche Sprache dabei herauskam.

Im Produktions-Build gemessen: `document.documentElement.lang` steht beim Start auf `de` und wechselt
mit dem Select in den Einstellungen auf `en`, ohne Neustart.

Zwei kleinere Dinge aus demselben Befund: `Home` und `Einstellungen` lasen den Store ohne Selektor
(`useAppStore()`), rendern also bei jeder Änderung irgendwo darin neu — jetzt ein Selektor pro Wert,
die Aktionen sind ohnehin stabile Referenzen. Und die Einstellungen wurden beim Start zweimal
gelesen: einmal in `main.tsx` für die Sprache, einmal von der ersten Seite für den Store. `main.tsx`
geht jetzt durch den Store, `Home` lädt gar nicht mehr; die Einstellungsseite behält ihr eigenes
Laden, weil dort ein von außen geänderter Wert falsch stünde.

## Was ein App-Text sagt und was ins Handbuch gehört (2026-09-07)

Vor dem Benutzerhandbuch einmal nachgezählt, was der Nutzer überhaupt liest: **1475 Sätze**, 1341
in `de.ts` und 134 in `electron/main/i18n.ts`. Davon sind 192 länger als 120 Zeichen, 49 länger als
200, 11 länger als 300.

**Die Länge ist nicht die Metrik.** Der Verdacht war, die Texte seien zu lang; gelesen sind alle
192, und die meisten sind lang, weil sie etwas erklären, das man wissen muss, bevor man klickt.
`home.wizard.intro` (230 Zeichen) sagt, dass ein neues Projekt ein bis zwei Minuten braucht und
warum — das ist der Grund, aus dem niemand die App für hängengeblieben hält.
`publish.ftpPlaintextWarning` (178) ist die Warnung, die ein Passwort rettet. Diese Sätze bleiben.

Die zweite Messung trifft besser: **75 Sätze nennen einen Begriff aus der Maschinenwelt** —
gezählt gegen eine Liste von 37 (`@layer`, `ungelayert`, `Selektor`, `Spezifität`, `Flexbox`,
`grid-column`, `var(--`, `custom.scss`, `.gitattributes`, `Merge-Treiber`, `node-gyp`,
`.node-version`, `npm install`, `node_modules`, `origin`, `.quartz-gui`, `quartz.config.yaml`,
`Symlink`, `CNAME`, `Sperrdatei`, `flacher Klon`, `Breakpoint`, `@font-face`, …). Auch diese Liste
entscheidet nichts: `origin` (11 Treffer) steht auf der Git-Sync-Seite völlig zu Recht, wer dort
etwas tut, kennt das Wort. Sie erzeugt die Kandidaten, gelesen wird jeder einzeln.

Was dabei wirklich schiefgeht, ist enger und hat eine Form: **ein Hinweis erklärt die Mechanik,
statt die Entscheidung.** `styles.variables.themeNote` (361 Zeichen) erklärt Kaskadenschichten
(`@layer`, ungelayert, `.callout[data-callout]`), damit der Nutzer versteht, warum manche Variablen
sich nicht überschreiben lassen — die Entscheidung, vor der er steht, ist aber nur: *hier ändern
oder im eigenen CSS*. `layoutEditor.frameBuilder.lineNamesHint` (306) endet in
`grid-column: sidebar-start / content-end` an einer Stelle, an der der Editor gerade sagt, dass man
das Feld nicht braucht. `localization.gitAttributesExplain` (297) nennt zwei Dateien, die die App
selbst schreibt.

Daraus die Regeln, die für App **und** Handbuch gelten:

- **Ein Hinweis sagt, was passiert — nicht, warum es technisch so ist.** Höchstens zwei Sätze. Die
  Mechanik gehört ins Handbuch; der Hinweis nennt das Kapitel.
- **Ein Begriff aus der Maschinenwelt steht nur da, wo der Nutzer ihn zum Entscheiden braucht.**
  Auf der Veröffentlichen-Seite ist „Host-Key“ genau richtig — wer einen Fingerprint vergleichen
  soll, muss wissen, wie das Ding heißt. Im Variablen-Tab ist „ungelayert“ es nicht.
- **Ein Bestätigungsdialog hat drei Teile:** die Frage, ein Satz über die Folgen, ein Satz über den
  Rückweg. `updates.core.confirm` (459 Zeichen) ist der Musterfall dagegen — er zählt auf, was ein
  Snapshot enthält, an der Stelle, an der nur zu entscheiden ist, ob aktualisiert wird.
- **Ein Satz, der eine Verwechslung verhindert, die Daten kostet, bleibt lang.** Drei tun das:
  `backups.vsGitSync` (Snapshot ist nicht Git-Sync), `backups.contentSymlinkHint` (ein verknüpfter
  Vault wird nicht mitgesichert), `home.duplicate.whatStaysBehind` (das Duplikat erbt keine Ziele
  und überschriebe sonst die Website des Originals). Sie werden geschärft, nicht gekürzt.
- **Ein Wort, ein Name — und zwar derselbe wie im Handbuch.** Die Vokabular-Tabelle oben gilt für
  beide. Wo das Handbuch einen Begriff einführt, benutzt die App genau diesen.

Die Zielgruppe ist in beiden Fällen dieselbe wie beim Example-Handbuch: jemand, der Obsidian kennt
und Quartz nicht. Du-Anrede, wie bisher.

## Ein zod-Satz beschreibt hier eine Eingabe, keinen Bug (2026-09-07)

Die Regel „zod- und `console.error`-Texte bleiben Englisch, weil sie Bugs beschreiben, nicht
Eingaben“ hatte eine Stelle, an der beides nicht stimmte. `frameDefinitionProblem()` setzte
`issue.path` und `issue.message` von zod in einen Satz ein, den der Nutzer in seiner Sprache liest —
und die Eingabe ist ein `.qtpl`, also eine Datei, die jemand weitergereicht hat:

    Der Frame ist nicht lesbar: frame: Invalid input: expected object, received null
    Der Frame ist nicht lesbar: areas: Invalid input: expected array, received null
    Der Frame ist nicht lesbar: frameName: Too big: expected string to have <=120 characters

Gesagt wird das jetzt in den Worten der App: der Pfad, der Daten ist und keine Prosa, dazu ein Satz
je Fehlercode, dazu die Zahl oder die Liste, die der Fehler mitbringt (eine Grenze, die erlaubten
Werte — auch Daten):

    Der Frame ist nicht lesbar: Das Feld „areas“ fehlt oder hat den falschen Typ.
    Der Frame ist nicht lesbar: Der Wert bei „frameName“ ist zu groß oder zu lang (Höchstwert 120).
    Der Frame ist nicht lesbar: Der Wert bei „areas.0.slot“ ist keine der erlaubten Angaben
      (header, left, right, beforeBody, afterBody, footer, pageBody).

Die fünf Codes sind **am Schema gemessen, nicht geraten**: `invalid_type`, `too_big`, `too_small`,
`invalid_value` (ein Enum) und `invalid_format` (eine Regex) sind alles, was
`gridFrameDefinition` hergibt — durchgespielt an elf kaputten Frames. Ein Code, den die Liste nicht
kennt, behält zod' eigenen Text, und *dieser* Fall ist wirklich ein Bug: Das Schema hat eine Regel
bekommen, von der hier niemand weiß. Der Typ der Liste ist aus dem Schema abgeleitet
(`NonNullable<ReturnType<typeof gridFrameDefinition.safeParse>['error']>['issues'][number]`), also
verengt der `case` die Felder `maximum`/`minimum`/`values` von selbst, statt sie zu casten.

**Und der Import hängte den Satz an einen zweiten.** Eine Warnung reist als `kind:detail` und wird
im Renderer am **ersten** Doppelpunkt getrennt (`ImportOutcome`) — ein Name, der mit einem weiteren
Doppelpunkt an seinen Grund geklebt wird, kommt also so an:

    vorher   Frame konnte nicht angelegt werden: editorial:Der Frame ist nicht lesbar: frame:
             Invalid input: expected object, received null
    jetzt    Frame konnte nicht angelegt werden: „editorial“ — Der Frame ist nicht lesbar:
             Das Feld „areas“ fehlt oder hat den falschen Typ.

Der Gedankenstrich und die Anführungszeichen kommen aus `mainT('frameFailedDetail')`, nicht aus
einer Zeichenkette im Code: Deutsch zitiert „…“, Englisch “…”, und der Hauptprozess weiß, welche
Sprache gerade gilt.
