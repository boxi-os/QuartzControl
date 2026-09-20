Du bist als zweites Paar Augen an einem Projekt, dessen zweite Beta draußen ist und dessen nächste
Fassung ein Release Candidate werden soll. Es geht um ein Review — nicht um Änderungen. Am Ende
steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Das vorige Review hat von dieser Runde abgeraten.** Sein letzter Abschnitt sagt, der nächste
Gewinn liege nicht in Runde 34, sondern in einem Alpha-Test an Projekten aus der Beispielvorlage,
mit einer gebauten Website am Ende jeder Szene. Der Nutzer hat sie trotzdem angefordert, und das
ändert, wofür sie da ist: **Nicht „finde das Nächste“, sondern „halten die zweiundzwanzig Fixes,
die niemand gelesen hat?“** Die Serie ist so gebaut, dass jede Runde liest, was die vorige gebaut
hat — bei dieser Schicht ist das noch nicht passiert, und sie ist die größte Einzelabarbeitung der
Serie: dreizehn Befunde und sieben Nebenbei-Punkte in einem Durchgang.

**Die Schicht darunter ist klein und fast kein Code.** Nach den Fixes hat derselbe Durchgang die
zwei Handbuch-Projekte gebaut und die Website veröffentlicht, `npm run fetch:google-fonts` laufen
lassen und drei Sätze in `docs/release.md` korrigiert, die nicht trugen. Der größte Einzelposten
darin ist eine erzeugte Namensliste, die sich vollständig umsortiert hat und inhaltlich gleich
geblieben ist.

**Wer was geschrieben hat:** Die gelesenen Commits sind von Claude Opus 5, das dreiunddreißigste
Review war von Claude Fable 5.1. Der Normalfall der Serie also — zwei Modelle, und der Leser hat
den Code nicht selbst gebaut. **Dieser Auftrag ist von demselben Modell wie die Commits und aus
derselben Sitzung.** Das ist der ungünstigste Fall für die Zahlen unten: Was hier als „gemessen“
steht, steht aus der Erinnerung an die Messung, nicht aus einem fremden Dokument. Prüfe es
entsprechend; wo eine Zahl nicht stimmt, ist das ein Befund.

In der Zählung von `CLAUDE.md` ist das das vierunddreißigste Review. Die Dateinamen zählen nach
Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md`. Lies dann **`docs/REVIEW-2026-10-07.md`**: Das sind die dreizehn Befunde und die
sieben Nebenbei-Punkte, deren Fixes die erste Schicht sind. Ohne dieses Dokument ist die Hälfte der
Commits nicht zu beurteilen — es steht dort, *was* gemessen wurde und *wie*.

Die Einbindung von `conventions.md` griff in den letzten neun Runden. Wenn das bei dir anders ist,
ist das eine Messung und gehört in dein Dokument.

## Umfang

Von `review-2026-10-08` bis `review-2026-10-09`:

    git log --oneline review-2026-10-08..review-2026-10-09
    git diff review-2026-10-08..review-2026-10-09 -- . \
      ':!docs/REVIEW-2026-10-07.md' ':!docs/REVIEW-2026-10-08-auftrag.md'

Ausgenommen sind das Review-Dokument der Vorrunde (`df9fff2`) und diese Auftragsdatei.

**Die Zahlen**, mit `git diff --shortstat` gezählt, **einschließlich** des Commits, der diese
Datei trägt (er verlängert auch `docs/reviews.md` um den Eintrag dieser Runde — deshalb stimmen
sie nur mit den Ausschlüssen oben):

    # gesamt, ohne Review-Dokument und ohne diese Datei:    21 Dateien, +2670 / −1855
    #   davon electron/, src/, shared/:                     15 Dateien, +2311 / −1836
    #     davon src/data/googleFonts.ts (erzeugte Liste):    1 Datei,   +1728 / −1728
    #     also echter Code:                                 14 Dateien,  +583 /  −108
    #   davon docs/:                                          5 Dateien,  +336 /    −7
    #
    # Schicht 1 (df9fff2^..c242c46), ohne Review-Dokument:  20 Dateien,  +895 /  −127
    #   davon Code:                                         14 Dateien,  +583 /  −108
    # Schicht 2 (c242c46..HEAD), ohne diese Datei:           3 Dateien, +1784 / −1737
    #   ohne die erzeugte Liste:                             2 Dateien,   +56 /    −9

**583 geänderte Code-Zeilen für zwanzig Befunde** — das ist der eigentliche Umfang. Der Rest ist
eine umsortierte Namensliste und Dokumentation.

### Schicht 1 — die dreiunddreißigste Runde, abgearbeitet (23 Commits, davon 22 Fixes)

Je ein Commit pro Befund, jeder mit Typcheck, Build und Smoke, jeder mit einer Vorher/Nachher-
Messung in der Commit-Nachricht. In der Reihenfolge der Befunde:

| Befund | Commit | was er tut |
|---|---|---|
| 1 (M) | `479af74` | `save()` reicht die geschriebenen Dateientwürfe als Argument durch, statt sie aus einer Closure lesen zu lassen |
| 2 (M) | `8db19d2` | Ein veralteter `custom.scss`-Entwurf wird nur noch vom Reiter mit dem Warnband geschrieben; sonst Verweigerung, `dirty` bleibt, `false` an den Verlassen-Dialog |
| 3 (M) | `c4d45bf` | `styles.apply` holt den `google-fonts`-Block zurück, nach Vorhandensein statt nach Inhalt |
| 3b | `2666dd8` | Neuer Zustand `noRule`: nichts lädt eine Webschrift und keine Regel nennt die Familie |
| 4 (M) | `f4e474f` | Der Reiter „Basis“ sagt unter dem Feld, wenn die eigene Variable die Schrift schlägt |
| 5 | `77d143b` | Google lässt still aus: `missingFamilies` in der Antwort, und `unknownToGoogle` fragt `faces` |
| 6 | `ddbe304` | „Noch genannt?“ liest alle Stylesheets unter `quartz/styles` rekursiv und jede `url()` einer Regel |
| 7 | `9be9fdd` | Drei Arten zu scheitern, drei Sätze (keine Route, keine Antwort, abgelehnt) |
| 8 | `f9f6029` | Decke über Zahl und Summe, ein unbekannter Dateiname ist ein Fehler, `usableFile()` fragt die Größe |
| 9 | `e34b4df` | `migrateFontUrls()` an der Bau-Tür, neben `writeAllFrames()` und `refreshGoogleFonts()` |
| 10 | `920c3c1` | Die Schrift-Notiz steht unter dem Kopf; der „Gespeichert“-Timer hängt an einem Ref |
| 11 | `35a8a1d` | `stagedOnTopOfMerge` gibt `null` statt `[]`, wenn git es nicht prüfen kann, und der Abbruch sagt es |
| 12 | `4f40e6b` | Dritte Klasse: Merge-Datei mit eigener Vormerkung obenauf, mit dem Preis im Satz |
| 13 | `292ee6c` | Sätze, die die alte Bedingung nannten; ein Wort je Sache; zwei Punkte in `docs/release.md` |
| nb 1+2 | `f36b980` | Combobox: Tippen hebt nichts hervor, `aria-selected` folgt `aria-activedescendant`, die Listbox hat einen Namen |
| nb 3 | `abdd85c` | Ein abgebrochenes Holen nimmt mit, was es schon geschrieben hat |
| nb 4 | `c000066` | `net.fetch` statt Nodes `fetch`; Timeout wird am Signal gefragt, nicht am Fehlernamen |
| nb 5 | `83c5b2e` | `readPreviewFonts` fragt `lstat` |
| nb 6 | `5dd28a0` | `--no-renames` in beiden `diffNames`; der ältere Stash bekommt einen Vorspann |
| nb 7 | `61b96cb` | `git add -N` als eigene Klasse, der Preis von `git add --`, zwei Gründe statt einem |
| — | `23ec4b9` | Die Messungen nach `docs/decisions/`, sechs neue Regeln nach `docs/conventions.md` |
| — | `c242c46` | Die Chronik in `docs/reviews.md`, der Stand in `CLAUDE.md` |

Der erste der 23 ist `df9fff2`, das Review-Dokument selbst; die 22 darunter sind die Arbeit.

### Schicht 2 — was danach geschah (3 Commits)

- `53f9c13` korrigiert `docs/release.md` Punkt 3: Die zwei Handbuch-Projekte haben nichts zu
  committen (beide sitzen auf Quartz' eigenem Commit, alles Eigene uncommittet), veröffentlicht
  wird der *Bau*. Dazu, was der Lauf gemessen hat.
- `1f6eb01` ist `npm run fetch:google-fonts`: `GOOGLE_FONTS_FETCHED` von `2026-09-18` auf
  `2026-09-20`, **1946 Familien vorher wie nachher, keine dazu, keine weg, keine Kategorie
  geändert**, 1945 von 1946 Positionen verschoben. Der Release-Punkt sagt das jetzt dazu.
- `a440dcd` trägt Punkt 4 als bewusst zurückgestellt ein, mit den Zahlen und dem ersten Schritt
  für den nächsten Vorlagen-Durchgang.

**Nicht im Diff, aber in dieser Runde passiert:** Die Website `boxi-os.github.io/QuartzControl/`
wurde neu gebaut und veröffentlicht (`gh-pages`, `9ee7a37` → `53445ee`), und der falsche Satz des
Handbuchs zu Kapitel 4.2 wurde im Vault korrigiert, deutsch und englisch. Beides liegt außerhalb
dieses Repos; nachprüfbar ist es an der Live-Website.

## Was du wissen musst, bevor du liest

**Jede Commit-Nachricht trägt eine Vorher/Nachher-Messung.** Das sind Behauptungen, keine
Tatsachen. Sie sind der günstigste Ansatzpunkt dieser Runde: Wenn eine nicht reproduzierbar ist,
steht entweder die Messung falsch da oder der Fix trägt nicht.

**Womit gemessen wurde**, damit du dasselbe Geschirr bauen kannst:

1. **Bündel von `fontService.ts` und `updateService.ts`** über esbuild, mit einem
   `electron`-Stub. Der Stub muss seit `c000066` auch `net.fetch` anbieten:
   `{ app: { getPath: () => '/tmp', getLocale: () => 'de' }, safeStorage: {}, net: { fetch: (...a) => globalThis.fetch(...a) } }`.
   Beim Bündeln `--alias:@shared=<repo>/shared`. **Falle:** Der Timer von `AbortSignal.timeout()`
   hält die Node-Ereignisschleife nicht am Leben — ohne ein `setInterval` daneben endet ein
   Timeout-Szenario damit, dass der Prozess wortlos aussteigt.
2. **Die gebaute App** über ein eigenes Playwright-Skript (`_electron.launch`, Wegwerf-Profil,
   frische `cp -Rc`-Kopie eines echten Projekts, `page.emulateMedia({ colorScheme: null })`).
   Echte Tastendrücke im CodeMirror-Editor, native Dialoge im Hauptprozess gespiegelt.
   **Falle:** Der Reiter fällt ohne `?tab=` auf den gemerkten zurück — den Reiter wechselt man
   über `getByRole('radio', { name: 'Basis' })`, nicht über `location.hash`.
3. **Das echte Google**, nur lesend.
4. **Echte git-Repos** für `updateService`, mit dem git 2.54 dieses Rechners.

**Die eine Messung, die kein echtes Instrument hatte:** Für Befund 11 („ein git vor 2.38 kennt
`merge-tree --write-tree` nicht“) wurde **kein git 2.37 gebaut**. Stattdessen stand eine
Shell-Attrappe im PATH, die genau die Antwort gibt, die das dreiunddreißigste Review an einem aus
der Quelle gebauten git 2.37.0 gemessen hat (`fatal: unknown rev --write-tree`, Exit 128), und
alles andere an das echte git weiterreicht. Das prüft die Reaktion des Codes, nicht die Annahme
über git. Wenn du ein echtes altes git baust, ist das die wertvollste einzelne Messung dieser
Runde.

**Die Prüfskripte auf diesem Stand** (alle grün): `typecheck`, `build`, `smoke` (40 Aufrufe),
`check:i18n` 1182 / 206 / 67, `check:semver` 18, `check:core-update` 14 / 3 / 5, `check:handbook`
26, `check:plugin-names` (ohne Projektpfad), `template:example -- --check-sync` (30 Stylesheets,
3 Kopien byte-gleich). Nicht gelaufen: `check:runtime`, `check:tokens`, `dist`.

**Sprache:** 6 neue Schlüssel je Sprache im Renderer, 12 im Hauptprozess, dazu mehrere
umformulierte. `check:i18n` sieht nur, *ob* ein Schlüssel existiert, nie *was* er sagt.

## Abwägungen im Code, die niemand gegengelesen hat

Zwölf Stellen, an denen eine Entscheidung fiel, die auch anders hätte ausfallen können. Keine
davon ist als Befund gemeint; sie sind die Orte, an denen einer wahrscheinlich ist.

1. **Ein Speichern, das schreibt und trotzdem `false` meldet.** `save()` schreibt seit `8db19d2`
   alles außer dem einen veralteten `custom.scss`-Entwurf, setzt `status: 'error'` und gibt
   `false` zurück. Die Regel „das registrierte Speichern schreibt alles, was `dirty` zählt“ war
   genau gegen so etwas geschrieben. Trägt die Umkehrung — und was macht Cmd+S daraus, was der
   Verlassen-Dialog, was das Badge?
2. **Verhalten, das vom vorderen Reiter abhängt.** Dieselbe Verweigerung greift auf drei Reitern
   und auf dem vierten nicht (`tab !== 'customCss'`). Begründet ist das mit dem Band, das nur dort
   steht. Ist die Begründung stärker als die Regel, gegen die sie verstößt?
3. **`intentToAdd()` ist `git diff --diff-filter=A`** — diff-files, Index gegen Arbeitsbereich.
   Gemeint ist „mit `git add -N` angekündigt“. Trifft das auch andere Zustände? Eine Datei, die
   `git add` kennt und die danach im Arbeitsbereich gelöscht wurde? Eine leere Datei?
4. **`allStylesheets()` liest rekursiv alles unter `quartz/styles`** — also auch Quartz' eigene
   `base.scss`, `syntax.scss`, `callouts.scss`. Für die Frage „nennt noch eine Regel diese Datei“
   ist zu viel finden die sichere Seite; für „ist diese Familie ungenutzt“ heißt es, dass ein
   wörtlicher Familienname in einem dieser Dateien die Entfernung für immer verhindert. In
   `gui-test` gemessen: kein wörtlicher Name, nur `var(--bodyFont)`. **Nicht gemessen** an einem
   Projekt mit aktivem Community-Theme.
5. **`MAX_FONT_FILES = 200`, `MAX_FONT_TOTAL_BYTES = 128 MiB`.** Gemessen ist das gegen selbst
   geschriebene Antworten, nie gegen eine echte Familie mit vielen Subsets — Noto Sans mit allen
   Schriftsystemen ist der Fall, an den niemand gehalten hat. Eine Decke, die den Normalfall
   trifft, ist schlimmer als keine.
6. **`signal.aborted` statt des Fehlernamens** entscheidet seit `c000066`, ob eine Verweigerung
   ein Timeout war. Das ist bewusst unabhängig davon, was der Stack wirft — **gemessen wurde es
   aber nur durch Nodes `fetch` im Bündel, nie durch Electrons `net.fetch`.**
7. **`migrateFontUrls()` schreibt die Datei des Nutzers, ohne dass jemand danach gefragt hat.**
   Es ist der dritte Schreiber an dieser Tür. Bewusst ohne die zweite Hälfte von
   `migrateOnWrite` (die Marker-Umbenennung), weil die eine Fassung vor dem 2026-09-18 teuer zu
   stehen kommt. Trägt die Trennung?
8. **`noRule` filtert Build-Faces heraus.** Begründet damit, dass unter `fontOrigin: local` kein
   Emitter übrig ist, der sie geschrieben haben könnte. Gibt es einen Plugin-Emitter, der das
   widerlegt?
9. **Der `google-fonts`-Block wird nach Vorhandensein zurückgeholt** (`!== null`), nicht nach
   Inhalt — ein leerer Block ist das Kennzeichen „dieses Projekt hält seine Google-Schriften
   selbst“. Das macht einen leeren Block unsterblich. Ist das gewollt?
10. **Die Combobox hebt beim Tippen nichts mehr hervor.** Das macht Enter zu „nimm das Getippte“
    — richtig für ein freies Feld. Es nimmt aber auch `aria-activedescendant` weg, solange
    getippt wird: Was liest eine Sprachausgabe dann über die gefilterte Liste vor?
11. **`usableFile()` ruft `statSync` in einer `async`-Funktion**, je Face, bei jedem Aufruf der
    Bau-Tür. Gemessen wurde die Abkürzung mit 1 ms; nicht gemessen an einem Block mit dreißig
    Regeln auf einem langsamen Dateisystem.
12. **`--no-renames` in beiden `diffNames` von `stagedOutsideMerge`.** Die Begründung ist „die
    Frage ist nach Pfaden“. Ändert es eine andere Antwort mit — etwa die Liste, die der Abbruch
    als verworfen nennt, wenn upstream eine Datei *nur* umbenennt?

## Worauf es ankommt, in dieser Reihenfolge

### 1. Die vier mittleren Befunde, und ob ihre Fixes die Wege decken, auf denen sie lagen

Das Review fand sie, indem es die Funktion auf Wegen benutzte, die ihr Autor nicht gegangen war.
Die Fixes sind auf denselben Wegen gemessen — also auf denen, die jetzt bekannt sind. Die Frage
ist der nächste Weg: zwei Dinge zugleich ungespeichert, ein Reiterwechsel mitten im Speichern, ein
Import während eines laufenden Baus, zwei Fenster auf demselben Projekt.

### 2. Was der Nutzer verlieren kann

Alles, was löscht oder überschreibt: `deleteUnreferencedFontFiles` (jetzt mit breiterer Suche),
`dropGoogleFonts`, der zurückgenommene Download in `abdd85c`, `styles.apply`, und `save()` in
seinen drei Ausgängen (alles geschrieben, teilweise geschrieben mit Fehler, verweigert).

### 3. Die Abbruch-Sätze (`updateService.ts`, rund 130 geänderte Zeilen)

Vier Befunde und zwei Nebenbei-Punkte liegen dort, alle an derselben Funktion. `explainGitFailure`
hat jetzt fünf Klassen und gibt mehrere Sätze zurück; `stagedOutsideMerge` gibt drei Dinge zurück
statt einer Liste. Das ist die dichteste Stelle der Runde und die mit den meisten Zuständen.

### 4. Die Sätze selbst

18 neue Schlüssel, mehrere umformulierte. Zwei Regeln gelten: höchstens zwei Sätze, und ein Rat
nennt sein Argument. Der Satz zu `updateAbortBlockedByOwnStagedOnMerge` ist der längste der Runde
und nennt bewusst einen Preis.

### 5. Schicht 2

`1f6eb01` ist 1728 Zeilen Umsortierung — lies das Skript daneben, nicht die Liste. Bei `53f9c13`
und `a440dcd` geht es darum, ob die Sätze stimmen, nicht um Code.

## Was offen bleibt, und nicht für diese Runde

- **Das Ausrollen von `d4da5ef`** (die fünf Schriftvariablen aus der Beispielvorlage) ist
  ausdrücklich zurückgestellt, bis der Nutzer ohnehin an der Vorlage arbeitet. Steht als Absatz in
  `docs/release.md` Punkt 4, mit den Zahlen. Kein Befund.
- **Die Liste, die nur der Nutzer abarbeiten kann:** VoiceOver über Git-Sync und die zwei Boards,
  die gepackte App je Plattform, glibc.
- **Der Alpha-Test**, den das vorige Review empfiehlt.

## Eine Frage über den Code hinaus

Getrennt von den Befunden, am Ende deines Dokuments: **Hältst du, nachdem du die Fixes gelesen
hast, die Empfehlung der Vorrunde aufrecht?** Sie lautete, nicht Runde 34 zu fahren, sondern einen
Alpha-Test an Projekten aus der Beispielvorlage, mit einer gebauten Website am Ende jeder Szene.
Wenn ja: Was gehört in dessen Szenenliste, das aus dieser Schicht folgt? Wenn nein: was hat dich
umgestimmt?

Und, falls du dazu etwas sagen kannst: **Spricht aus diesem Stand etwas gegen einen RC?**

## Form der Befunde

Schreibe `docs/REVIEW-2026-10-08.md`. Je Befund: die Stelle (Datei, Funktion, Commit), was
passiert, wie es sich zeigt, was dagegen spräche es so zu lassen, und — wo du eine hast — eine
Richtung. Nach Gewicht sortiert, Hoch/Mittel/Niedrig. Was du gemessen hast, kennzeichne als
gemessen und sag womit; was du gelesen hast, als gelesen. Eine Behauptung dieses Auftrags, die
nicht trägt, ist ein Befund wie jeder andere — und in dieser Runde besonders wahrscheinlich, weil
der Auftrag aus derselben Sitzung stammt wie der Code.

**Ändere nichts am Code und committe nichts.** Die einzige neue Datei ist dein Dokument. Schreibe
in keinen Obsidian-Vault außer `Example` und `QuartzControl-Handbuch`, und in kein Projekt unter
`~/Documents/QuartzProjekte/` — Kopien mit `cp -Rc` sind der Weg.
