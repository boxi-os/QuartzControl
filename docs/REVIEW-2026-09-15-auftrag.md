Du bist als zweites Paar Augen an einem Projekt, das kurz vor einer Beta steht. Es geht um ein
Review — nicht um Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer
entscheidet.

## Was diese Runde anders macht

Die letzten vierzehn Runden prüften App-Code. **Diese prüft fast nur Dokumentation**, und sie
verteilt sich über sieben Repositories statt über eines. Beides ändert, wonach zu suchen ist.

Eine Anleitung hat keinen Typcheck. Kein Build fällt um, wenn ein Satz etwas Falsches behauptet —
und geglaubt wird er trotzdem, weil er in einem Handbuch steht. Der wertvollste Befund dieser Runde
ist deshalb **eine Aussage über Code, die nicht stimmt**, nicht ein holpriger Satz.

Zum Maßstab, wie ernst das ist: Beim Veröffentlichen dieser vier Websites stellte sich heraus, dass
mein eigenes Kapitel 4.2 („Adressen brauchen `{{root}}`") in denselben Schnipseln gebrochen war, die
es beschreibt — 14 tote Links auf vier Sites. Und beim Beheben zeigte sich, dass das empfohlene
`{{root}}` in einem Markdown-Link **gar nicht funktionierte**, was Kapitel 2.3 als funktionierend
zeigte. Beides ist repariert. Beides stand vorher schwarz auf weiß da und las sich richtig.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis; die Messungen hinter den Regeln stehen in `docs/decisions/`.

Dazu gehören zwei eigene Quartz-Plugins und vier Websites, die alle in dieser Runde entstanden oder
verändert wurden.

## Umfang

Es gibt keinen Tag über alles. Der Umfang ist diese Liste:

| Repository | Commits |
| --- | --- |
| `Development/QuartzControl` (Branch `feat/beispielvorlage-und-header`) | `fe2b701`, `9592121` |
| `Development/quartz-layout-box` | `bf13756`, `9b09ed2` |
| `Development/quartz-multilanguage` | `f7b5706` |
| Vault `QuartzControl-Handbuch` | `b7af233`, `b4b8dd4`, `60eb52e`, `8e4e59b` |
| Vault `quartz-layout-box-handbuch` | `6105d42`, `13055d7`, `a2c37ab` |
| Vault `quartz-multilanguage-handbuch` | `52af608`, `32a104a` |
| Vault `Example` | die vier bis `fd76c28` (nur nachgepusht, älter als diese Runde) |

Die Vaults liegen unter `~/Obsidian/QuartzProjekte/`, die zugehörigen Quartz-Projekte als Bauplätze
unter `~/Documents/`. **Verändere weder Vaults noch Bauplätze**; lesen und kopieren ist in Ordnung.

Die vier gebauten Websites stehen im Netz und entsprechen diesem Stand:

    https://boxi-os.github.io/QuartzControl/
    https://boxi-os.github.io/Quartz-Example-Template/
    https://boxi-os.github.io/quartz-layout-box/
    https://boxi-os.github.io/quartz-multilanguage/

## Eine Besonderheit, die du wissen musst

**Alle Commits dieser Runde stammen von demselben Modell, das diesen Auftrag schreibt.** Der Nutzer
hat die Entscheidungen abgenommen, die Sätze sind meine.

Daraus folgt dasselbe wie in den letzten Runden: Lies Commit-Nachrichten als Behauptungen, nicht als
Wahrheit. In diesem Projekt gilt eine Zahl in einer Commit-Nachricht als Messung; trägt sie nicht,
ist das ein Befund. Und prüfe besonders, wo ich **eine Zahl, eine Grenze oder einen Umfang gewählt**
habe.

Dazu kommt hier etwas Neues: Ich habe über fremden Code geschrieben, den ich selbst gelesen habe.
Wo ich ihn falsch verstanden habe, steht es jetzt in einem Handbuch.

## Worauf es ankommt, in dieser Reihenfolge

### 1. Die Handbücher gegen den Code, den sie beschreiben

Das ist der Kern dieser Runde. Zwei neue Handbücher, je neun Kapitel, zweisprachig:

- `quartz-layout-box-handbuch` — 66 Seiten, beschreibt `Development/quartz-layout-box`
- `quartz-multilanguage-handbuch` — 60 Seiten, beschreibt `Development/quartz-multilanguage`

Beide behaupten hunderte Male etwas über das jeweilige Plugin. **Halte die Aussagen gegen `src/`.**
Die Stellen, an denen ich mir am unsichersten bin:

- **`html` gewinnt gegen `file`, auch wenn es leer ist** (2.1 und 6.2 im Layout-Box-Handbuch). Ich
  leite daraus den ganzen Trick mit dem leeren Schnipsel ab. Stimmt die Reihenfolge in
  `LayoutBox.tsx` wirklich so, und gilt sie auch für `byLang` und Frontmatter?
- **Die Rangfolge Frontmatter → `byLang` → Grundoptionen** (6.1, 7.1). Ich behaupte, jede Ebene
  überschreibe nur, was sie selbst nennt. Prüf das an `optionsForPage`.
- **`if (html.trim() === "") return null`** — ich baue darauf, dass eine leere Box *nichts* ausgibt,
  kein leeres `div`, keinen Abstand. Der Download-Kasten der App-Site hängt daran.
- **Die `@layer`-Aussage** (5.2): „Ungelayertes Site-CSS schlägt gelayertes Plugin-CSS unabhängig von
  der Spezifität." Das ist die einzige Stelle, an der ich eine CSS-Regel als Gesetz hinschreibe, und
  ich habe sie **nicht gemessen**, sondern aus der Beschreibung des Plugins übernommen.
- **`order: 65` und `crawl-links` (60)** im Multilanguage-Handbuch (1.3, 7.2). Ich behaupte, die
  Reihenfolge zähle *nur* für `rewriteCrossLanguageLinks`. Stimmt das für alle sechs Rollen?
- **Die sechs Rollen** selbst (1.3): Transformer, Verknüpfung, Filter, Emitter, Komponente, Skript.
  Ist das die Zerlegung, die der Code hergibt, oder eine, die sich gut erzählt?
- **„Gefilterte Seiten sind für die Verknüpfung nicht da"** (3.2) — daraus folgt, dass ein Entwurf
  im Umschalter fehlt. Gelesen, nicht gemessen.
- **Die Fallback-Weiterleitungen lassen Ordnerseiten aus** (6.2). Ich nenne als Grund, dass sonst
  die Listen des folder-page-Plugins überschrieben würden. Aus der README übernommen.

### 2. Der Fix in `quartz-layout-box` (`bf13756`)

Der einzige echte Code dieser Runde: `applyPlaceholders` in `src/placeholders.ts` erkennt jetzt die
prozent-kodierte Form eines Platzhalters.

- **Das Regex ist meine Setzung**: `/%7B%7B([\w.\-%20]*?)%7D%7D/gi`, dazu eine zweite Prüfung des
  Inhalts gegen `/^[\w.-]*$/` nach Entfernen von `%20`. Findet es zu viel? Zu wenig? Was passiert
  bei `%7b%7B` gemischt, bei `%257B` (doppelt kodiert), bei einem `%7D%7D` ohne Anfang?
- **Die Rückschreibung passiert vor der Ersetzung**, damit ein Wert genau einmal escaped wird. Ist
  das an jeder Aufrufstelle richtig? `applyPlaceholders` wird auch für `title` aufgerufen, dort mit
  `escape = false`.
- **Der frühe Ausstieg** hieß `if (!html.includes("{{")) return html` und prüft jetzt zusätzlich auf
  `%7B%7B`. Zwei Durchläufe über den String statt einem — bei welcher Snippet-Größe fällt das auf?
- Ist der Fix an der **richtigen Stelle**? Die Alternative wäre gewesen, den Markdown-Renderer die
  Klammern nicht maskieren zu lassen.

### 3. Die Doku-Varianten des Vorlagen-Generators (`fe2b701`)

`scripts/example-template/doku.mjs` ist neu und leitet aus den Example-Daten zwei reduzierte
Fassungen ab; `build-example-template.mjs` kennt jetzt `--variant example|doku|plugin`.

- **`note-properties` bleibt drin, nur seine Ansicht geht aus.** Der Grund: Es ist zugleich der
  Frontmatter-Transformer (`order: 5`, `delimiters`, `language`). Gemessen an einem vollen Bau —
  ohne den Eintrag hieß jede der 347 Seiten „Unbenannt". Ist die Schlussfolgerung richtig, oder
  hängt der Titel an etwas anderem, das ich mitentfernt habe?
- **Zwei Fehler im bestehenden Generator behoben**: Phase 1 verweigerte den Vault-Symlink, weil
  `quartz create` ein echtes `content/` anlegt (jetzt ist genau der unberührte Starterinhalt
  zugelassen, erkannt an einem Satz); und `layoutFrames.save` backte die Gruppenordnung ein, lief
  aber vor Phase 4, die sie schreibt (jetzt werden die Frames zweimal geschrieben). **Beide Fixes
  sind von niemandem gegengelesen.** Der zweite ist der riskantere: Er schreibt bei *jedem* Lauf
  vier Frames ein zweites Mal.
- **Die Erkennung des Starterinhalts** hängt an einem Satz aus quartz' eigener Vorlage („This is a
  blank Quartz installation."). Ändert quartz ihn, schlägt der Zweig wieder fehl. Ich halte das für
  die richtige Richtung — prüf, ob das Argument trägt.
- Ein Beleg, den du nachfahren kannst: Ein Example-Lauf nach den Änderungen schreibt eine
  **byte-identische** `quartz.config.yaml` und byte-identische Frames.

### 4. Das Beispiel-Schnipsel der Vorlage (`9592121`)

`scripts/example-template/site/snippets/sidebar-note.md` hatte Links mit führendem `/`, die unter
einem Pfad-Präfix ins Leere zeigen. **Diese Datei erbt jeder, der die Example-Vorlage importiert.**
Jetzt stehen dort HTML-Anker mit `{{root}}`.

- Nach dem Fix in 2. wären Markdown-Links wieder möglich. Ich habe die Anker gelassen, damit die
  Vorlage auch mit einer älteren Plugin-Fassung funktioniert. Trägt die Abwägung?

### 5. Die App-Website (`b4b8dd4`, `60eb52e`)

Vier neue Seiten im Handbuch-Vault, dazu ein zweites Quartz-Projekt (`~/Documents/QuartzControl-Web`)
auf demselben Vault. Der Unterschied zwischen der Web- und der eingebetteten Fassung liegt allein in
der Konfiguration: Die Web-Fassung hat zwei Layout-Boxen, die die App-Fassung nicht kennt.

- **Die Zahlen auf `systemvoraussetzungen`** stammen aus zwei Quellen: `LSMinimumSystemVersion` im
  ausgelieferten Electron-Bundle (12.0) und Electrons README zu 43.4.1 („Monterey and up"; Linux ab
  Ubuntu 18.04, Debian 10, Fedora 32). Prüf sie nach.
- **Die Aussagen über Formate und Flatpak** kommen aus `electron-builder.yml`. Insbesondere: „Der
  Flatpak lässt sich nicht cross-bauen", „`--filesystem=home` ist gesetzt", „kein Selbstupdate".
- **`beziehen-und-aktualisieren` behauptet, es gebe kein Selbstupdate.** Belegt durch die Abwesenheit
  von `autoUpdater`/`electron-updater`. Eine Abwesenheit ist ein schwacher Beleg — such gegen.
- Der Download-Kasten steht nur auf den zwei Startseiten. Der Mechanismus ist der aus 1.

### 6. Was die Websites tatsächlich ausliefern

Alle vier sind live und lassen sich messen, ohne etwas zu verändern.

- **209 Adressen über acht Seiten geprüft, kein toter Link** — mein letzter Durchgang. Er deckt
  nicht alle 134 Seiten ab. Ein vollständiger Crawl wäre ein echter Zugewinn.
- **Der Sprachumschalter** soll auf die Übersetzung zeigen, nicht auf die Startseite. Geprüft an
  einer Seite je Site.
- **`hreflang`** steht mit absoluten Adressen im Kopf. Geprüft an einer Seite.
- **Kein `%7B%7B` mehr im HTML**, außer als Beispieltext auf der Seite, die den Fall beschreibt.

## Was ich nicht geprüft habe

- **Die Handbücher gegen die laufende Wirklichkeit.** Beim App-Handbuch gibt es dafür
  `npm run check:handbook` (26 Zitate). Für die zwei Plugin-Handbücher gibt es nichts Vergleichbares
  — keine einzige ihrer Aussagen wird von irgendetwas nachgehalten.
- **Die englischen Fassungen inhaltlich gegen die deutschen.** Beide sind von mir, in einem Zug
  geschrieben; geprüft ist nur, dass zu jeder Seite eine mit demselben `translationKey` existiert.
  Wo sie inhaltlich auseinandergehen, würde es niemand merken.
- **Die Beispiele in den Handbüchern.** Die YAML-Blöcke sind plausibel, aber keiner davon wurde
  gebaut. Ein Beispiel mit einem Tippfehler in einem Optionsnamen liest sich wie ein richtiges.
- **Die Snippets der drei neuen Bauplätze** liegen als Kopie unter `private/snippets/` im jeweiligen
  Vault. Ob Kopie und Original auseinanderlaufen, prüft nichts.
- **Ob die Sites unter anderen Bedingungen halten**: nur Chromium, nur Desktopbreite, keine Prüfung
  ohne JavaScript, keine Kontrastmessung an den zwei neuen Kästen der App-Site.
- **`--variant plugin` mit `--fresh`** lief einmal grün durch; die Example-Variante lief nach den
  Generator-Änderungen einmal. Kein Lauf ist wiederholt worden.

## Ablauf

    cd ~/Development/quartz-layout-box && npm run check     # 30 Tests
    cd ~/Development/quartz-multilanguage && npm run check  # 58 Tests
    cd ~/Development/QuartzControl && npm run typecheck && npm run check:handbook

Wenn eine davon nicht grün ist, ist das dein erster Befund.

Die Bauplätze unter `~/Documents/` sind gebaut; ihr `public/` entspricht dem, was im Netz steht. Für
eine Messung genügt ein lokaler Server darauf. Playwright hat hier Firefox und WebKit, aber kein
Chromium; für Chromium nimmt dieses Repo Electron (`_electron.launch`, siehe `scripts/smoke.mjs`).

Es kann sein, dass der Nutzer die App offen hat — `running-servers.json` prüfen, im Zweifel ein
eigenes `--user-data-dir`.

Sag bei jedem Befund dazu, ob du ihn **gelesen** oder **gemessen** hast, und bei einem gelesenen,
was ihn messbar machen würde.

## Form der Befunde

Wie bei den letzten Runden: je Befund eine Überschrift, die die Sache benennt, dann was passiert,
dann woran du es festmachst (Datei und Zeile, oder Adresse und Element), dann eine Einschätzung der
Schwere (Hoch/Mittel/Niedrig, Maßstab in `docs/REVIEW-2026-09-12.md`). Kein Fix im Text — darüber
entscheidet der Nutzer.

Eine Bitte zur Gewichtung, weil diese Runde fast nur Text ist: **Eine falsche Aussage über Code ist
Hoch, auch wenn sie in einem Nebensatz steht.** Ein umständlicher Satz ist kein Befund; ein Satz,
der jemanden eine Stunde kostet, schon.

Leg das Ergebnis als `docs/REVIEW-2026-09-15.md` ab.

Wenn du nichts findest, ist das ein Ergebnis. Schreib dann, wo du gesucht hast.
