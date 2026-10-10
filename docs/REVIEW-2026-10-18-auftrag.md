Du bist als zweites Paar Augen an einem Projekt, dessen Fassung `1.0.2` (2026-10-07) draußen ist
und dessen nächste, **1.1**, auf dem Branch `feat/1.1` entsteht. Es geht um ein Review — nicht um
Änderungen. Am Ende steht eine Liste von Befunden, über die der Nutzer entscheidet.

## Was diese Runde anders macht

**Sie liest zwei Blöcke, und nur einer davon ist eine Runde der Serie.**

- **Block A — die Fixes des dreiundvierzigsten Reviews.** Neun Befunde (1 Hoch, 2 Mittel, 6
  Niedrig), alle am 2026-10-10 abgearbeitet, dazu die ganze Nebenbei-Liste. Wie jede Runde die
  Fixes der vorigen liest.
- **Block B — sechs Commits, hinter denen kein Review steht.** Der Nutzer hat am 2026-10-10 drei
  Befunde aus der Bedienung gemeldet (die Vorschau unter „Plugins“ verliert nach einem Klick ins
  Inhaltsverzeichnis den Header, sie soll zu beenden sein, und sie zeigt immer die ganze Website;
  externe Links tragen zwei Pfeile) und danach zwei Wünsche geäußert (eine CSS-Klasse je
  Navigation und Kasten automatisch, auch für Duplikate auf der Layout-Bühne). Daraus sind ein
  neuer IPC-Kanal, ein Skript, das der Hauptprozess **in die Vorschau der Website** einsetzt, und
  eine Regel geworden, die jede Kopie einer Navigation oder eines Kastens verändert. Das ist mehr
  neue Fläche als in Block A, und niemand hat sie gegengelesen.

**Gewichte Block B höher.** Block A ist die gewohnte Arbeit: Fixes mit Vorher-/Nachher-Messung,
gegen die Befunde eines Dokuments. Block B ist neuer Code mit einer neuen Vertrauensgrenze — der
Hauptprozess führt Code in einem Frame aus, dessen Inhalt die Website des Nutzers ist, und liest
Nachrichten zurück, die dieselbe Website auch selbst schicken könnte.

**Alles, was du liest, hat ein einziges Modell geschrieben**: Claude Opus 5.5 — die Commits beider
Blöcke, das dreiundvierzigste Review (in einem eigenen Agenten) und diesen Auftrag. Was als
„gemessen“ dasteht, steht aus den Commit-Nachrichten und den Absätzen in `docs/decisions/`; prüfe
entsprechend. Eine Zahl, die nicht stimmt, ist ein Befund.

In der Zählung von `CLAUDE.md` ist das das **vierundvierzigste** Review. Die Dateinamen zählen
nach Datum.

## Das Projekt

QuartzControl: Electron + React + TypeScript, ein Desktop-Programm zur Verwaltung von
Quartz-5-Websites, `/Users/boxi/Development/QuartzControl`. Lies zuerst `CLAUDE.md` im
Wurzelverzeichnis **und `docs/conventions.md`, das sie über `@docs/conventions.md` einbindet** —
dort stehen die Regeln. Die Messungen dahinter stehen in `docs/decisions/`, die Chronik in
`docs/reviews.md` (am Ende: was aus dem dreiundvierzigsten geworden ist). Dazu
`docs/REVIEW-2026-10-17.md` (das dreiundvierzigste) und sein Auftrag daneben.

## Umfang

Vom Tag `review-2026-10-18` (der Auftrag des dreiundvierzigsten) bis `review-2026-10-19`:

    git log --oneline review-2026-10-18..review-2026-10-19
    git diff review-2026-10-18..review-2026-10-19

25 Commits und dieser Auftrag; ohne ihn 41 Dateien, +3 459 / −239.

### Block A — `review-2026-10-18..c0f1858` (19 Commits)

Der erste (`564eea7`) ist das Dokument des dreiundvierzigsten Reviews; ohne ihn 24 Dateien,
+2 279 / −185. Was jeder Fix behauptet, steht am Ende von `docs/reviews.md`, in der Reihenfolge,
in der sie gebaut wurden:

- **`631cd9c` — Befund 2 (Mittel), Snapshot vor dem Config-Schloss.** Im Bündel gemessen: vorher
  Restore und Speichern nach 30 s nicht fertig, nachher unter 0,6 s.
- **`3628e39` — Befund 1 (Hoch), Markdown-Struktur im SVG-Text.** `check:inline-svg` schickt
  jedes Ergebnis zusätzlich durch die Kette von quartz-layout-box, **die dafür als
  devDependencies ins Repo kam** — prüfe, ob das die Auslieferung berührt.
- **`c576a8f` — Befund 3 (Mittel), Attributnamen wie HTML, Werte wie CSS.**
- **`81bc6a7` — Befund 5.** Gelesen, nicht gemessen: gui-test hat keinen Plugin-Frame.
- **`05db5bc` — Befund 4.** Neuer Zustand „auf keiner Breite“.
- **`c567acc` — Befund 6.** Zusammengelegt heißt jetzt auch: mindestens die Hälfte der zehn neuen
  Namen ist geladen. **Eine Schwelle, kein Beweis** — siehe Abwägung 8.
- **`45628eb` — Befund 7.** Nicht durch den Dateidialog geklickt.
- **`adc5917` — Befund 8.**
- **`5671b0b` — Befund 9.**
- Die Chronik (`c2a7411`) und die neue Regel in `conventions.md` (`0b94af6`, „eine Zahl, die
  einen Fix belegen soll, nennt mindestens einen ihrer Fälle mit seiner Ursache“).
- Die Nebenbei-Liste: `290b710` (Vorlagen-Import ohne eigene Snapshots), `58d8f5c` (Ids eines
  eingefügten SVG mit Präfix je Datei), `befd9ef` (das Prüfskript öffnete `mailto:` im
  Mail-Programm des Nutzers), `8670cd8` (eine Kopfzeile zählt nur an einer geladenen Datei),
  `549a3eb` (`projectLock()` in eigener Datei), `7f7f1c8`/`c0f1858` (Chronik).

### Block B — `c0f1858..review-2026-10-19` (6 Commits)

18 Dateien, +761 / −54. Gemessen ist alles an der gebauten App an **einem** Projekt,
`werkstatt/basic-gegenprobe` (Basis-Vorlage, noch mit 31 Stylesheets, Website dunkel), über
eigene Playwright-Skripte — **im echten Profil des Nutzers, nicht in einem Wegwerf-Profil**. Die
Absätze dazu stehen am Ende von `docs/decisions/navigation-and-pages.md`.

- **`a1575d8` — der Header in der Plugin-Vorschau.** Der Kasten um das verkleinerte iframe war
  `overflow-hidden` und damit ein Scroll-Container; ein Sprung zu einem Anker scrollte ihn mit
  (0 → 116,5 px). Jetzt `overflow-clip`. Dazu „Vorschau beenden“: stoppt den **einen** Dev-Server
  des Projekts, also auch den der Seite „Vorschau & Build“.
- **`214ba3a` — ein Pfeil an externen Links.** Die Vorlage setzte `::after { content: "↗" }`
  neben das SVG, das crawl-links ohnehin anhängt (`externalLinkIcon`, Vorgabe an). Jetzt färbt sie
  nur noch das SVG mit `--gray`. **Nur im Repo**, nicht ausgerollt (`docs/release.md`, Ende von
  Abschnitt 4); gemessen an der gebauten Example-Website mit der Regel im Browser getauscht, nicht
  an einem Bau, und nur hell.
- **`8520091` — Markierung und Zoom.** Neuer Kanal `sitePreview:highlight`; der Hauptprozess sucht
  über alle Fenster den Unterframe mit dem Origin des laufenden Dev-Servers und führt dort per
  `WebFrameMain.executeJavaScript` ein festes Skript aus (`services/previewHighlight.ts`, als
  `Function.toString()` übergeben). Das Skript rahmt, was der Selektor trifft, dunkelt den Rest
  ab, meldet per `postMessage` Anzahl, Sichtbarkeit und Rechteck, und **ersetzt
  `Element.prototype.scrollIntoView`** durch eine Fassung, die nur innerhalb der Seite scrollt —
  denn nach `a1575d8` scrollte derselbe Ankersprung das `<main>` der App (307,5 px), weil Quartz'
  Router `scrollIntoView` ruft und `defaultPrevented` nicht fragt. Die Seite prüft jede Meldung
  Feld für Feld (`parsePreviewReport`) und rechnet daraus den Zoom (`zoomOnto`, höchstens 150 %).
- **`2614dea` — eine eigene Klasse je Navigation und Kasten.** `routes/Plugins/instanceClass.ts`:
  Präfix `nav-` bzw. `layout-box-`, Umlaute umgeschrieben, eindeutig gegen alle `className` der
  Config. Gesetzt beim Anlegen, beim Duplizieren und auf „Eigene Klasse vergeben“ unter der
  Vorschau; nie beim Umbenennen. Eine Kopie behält die Klassen des Originals und bekommt ihre
  eigene dahinter; „die eigene“ ist deshalb die **letzte**, und der Selektor des Originals schließt
  die seiner Kopien aus (`.layout-box-mark:not(.layout-box-mark-2)`). Das zod-Schema lässt dafür
  `:not(.x)` zu.
- **`8c78eb8` — dasselbe für die Layout-Bühne.** Die Klasse entsteht jetzt in `duplicateEntry`
  (`LayoutEditor/utils.ts`), durch das alle Duplikate gehen. Ohne Namen vom Aufrufer nimmt sie
  Titel, Variante oder Dateinamen — **unübersetzt**, die Seiten dagegen übersetzt.
- **`4ab1b88` — die `id` einer Navigation geht bei keinem Duplikat mit.** Vorher strich sie nur die
  Seite Navigationen, die Bühne kopierte sie.

## Abwägungen, die niemand gegengelesen hat

Block B zuerst, weil dort nie jemand nachgesehen hat.

**1. Ein Skript in der Website des Nutzers.** `executeJavaScript` läuft in der Hauptwelt der Seite,
nicht in einer isolierten — die Skripte der Website sehen `window.__quartzcontrolPreview`, das
ersetzte `scrollIntoView` und können selbst `{ source: 'quartzcontrol-preview', … }` posten.
**Was kann eine feindliche oder bloß kaputte Website damit erreichen** — mehr als eine falsche
Statuszeile und einen falschen Zoom? Prüfe: den Weg der Meldung (`e.source === iframe.contentWindow`
und `parsePreviewReport`), den Selektor (Schema-Regex, danach `JSON.stringify`), die Wahl des Frames
(Origin `http://localhost:<port>` des laufenden Servers dieses Projekts, über *alle* Fenster), und
ob ein anderer Unterframe derselben Origin — ein iframe *in* der Website — mitgetroffen wird
(`framesInSubtree` und `frame.parent`). Und: Der Kanal nimmt eine Projekt-ID; reicht ein
`server.status` dieses Projekts als Ausweis, dass der Frame zu ihm gehört?

**2. Die Vorschau zeigt jetzt anders an als die Website.** Das ersetzte `scrollIntoView` übergeht
`scroll-padding-top` (Quartz' `base.scss`: 4rem) und `scroll-margin-block-start` (die Vorlage,
`layout.scss`), richtet nicht horizontal aus und kennt `behavior: smooth` nicht. Ein Ankersprung
landet in der Vorschau also anders als auf der Website — beim Schreiben dieses Auftrags gelesen,
nicht gemessen. **Wie weit, und wäre ein `scrollTo` mit den berechneten Abständen besser als das
Ersetzen?** Und gibt es einen Weg, das Mitscrollen der Container um das Frame zu verhindern, ohne
das Verhalten der Website anzufassen?

**3. Läuft dauerhaft.** Solange eine Markierung steht, läuft im Frame eine
`requestAnimationFrame`-Schleife (zeichnet die Rahmen) und ein `setInterval` alle 500 ms (misst
die Größen); beide pro Dokument, bei Quartz' SPA-Navigation bleibt dasselbe Dokument. Chromium hält
rAF in einem fremden Frame außerhalb des Fensters an — gemessen —, das Intervall nicht. **Was
kostet das, und wird je etwas davon abgeräumt?** Nebenbei: Der Parameter `focus` wird im Skript
nur noch für die Frage „hat sich etwas geändert“ gelesen; ob er so noch etwas bedeutet, ist offen.

**4. Ein Präfix, das nicht schützt.** Die Klassen tragen `nav-` bzw. `layout-box-`, damit eine
Navigation „Explorer“ nicht `.explorer` wird. Die Vorlage gestaltet aber `a.nav-file-title`
(`components-navigation.scss`, `a11y.scss`), und die Eindeutigkeit prüft nur gegen die
`className` der Config, nicht gegen die Stylesheets. Eine Navigation „File title“ bekäme genau
diese Klasse — gelesen, nicht gemessen. **Welche Klassen schreiben Quartz, die Plugins und die vier
Vorlagen mit `nav-…` oder `layout-box-…`, und welcher Name trifft sie?**

**5. Die Kopie behält die Klassen des Originals.** Gewollt: Sie sieht gleich aus. Die Folgen:
Eine Regel, die der Nutzer für `.layout-box-mark` geschrieben hat, gilt jetzt für beide; die
Vorschau unterscheidet sie über `:not()`, das Stylesheet nicht. Der Reiter „Eigenes CSS“ der
Stile-Seite (`componentSelectors()`) nennt für das Original `.layout-box-mark` und sagt nicht,
dass das auch die Kopie trifft. Und der Satz unter der Vorschau, „hat keine eigene CSS-Klasse —
markiert sind alle n, die sich diese Klasse teilen“, steht auch dann, wenn ein Eintrag gar keine
Klasse hat (dann gibt es nichts zu teilen) oder wenn zwei Einträge von Hand dieselbe eigene haben.
**Stimmen die Sätze in allen drei Fällen, und ist „behalten“ die richtige Wahl?**

**6. Eine Regel in `duplicateEntry` verändert jede Kopie.** Durch diese Funktion gehen die zwei
Editoren, „Duplizieren“ im Inspektor der Bühne und ein auf die Bühne gezogener Vorrats-Chip. Ein
Chip steht für das *erste* Vorkommen eines Plugins; eine so entstandene Instanz erbt also dessen
Klassen und bekommt eine eigene. **Ist das für einen Chip richtig — er heißt „eine weitere
Instanz“, nicht „eine Kopie von dieser“ —, und erreicht die Funktion noch einen Weg, der nicht
gemeint war** (Frame-Builder, Vorlagen-Import, Undo)?

**7. Der äußere Rahmen der Vorschau.** `a1575d8` setzt `overflow-clip`; geprüft ist Chromium in
Electron 43. Die Seite „Vorschau & Build“ hat ein eigenes, nicht verkleinertes iframe in einem
`overflow-x-auto`-Kasten und **läuft ohne das Skript** — ob ein Ankersprung dort die Seite der App
scrollt, ist nicht gemessen. Und „Vorschau beenden“ fragt nicht; ist das richtig für einen Knopf,
der den Server auch für eine andere Seite stoppt?

Dann Block A:

**8. Eine Schwelle als Erkennungsmerkmal.** `c567acc` zählt ein Projekt als zusammengelegt, wenn
mindestens fünf der zehn neuen Namen geladen sind; `8670cd8` zählt eine Kopfzeile nur an einer
geladenen Datei. **Welcher reale Zustand liegt zwischen den Schwellen** — ein halber Restore je
Datei, ein Git-Sync von einem Rechner mit 1.0.2, eine Vorlage, die nur einen Teil mitbringt — und
was bietet die Stile-Seite dann an?

**9. Testwerkzeug im Repo.** Für `check:inline-svg` kamen die Pakete der Markdown-Kette von
quartz-layout-box als devDependencies dazu. **Landet davon etwas in `out/` oder im gepackten
Bundle, und stimmen die Versionen mit denen überein, die quartz-layout-box zur Bauzeit wirklich
benutzt?** Sonst prüft das Skript eine Kette, die die Website nicht hat.

**10. Ids mit Präfix.** `58d8f5c` versieht die Ids eines eingefügten SVG je Datei mit einem
Präfix und zieht alle Verweise mit. **Auch die in `style`-Attributen, in `url(#…)` innerhalb von
Präsentationsattributen, in `begin="id.end"` einer Animation und in `aria-labelledby`?**

## Worauf es ankommt, in dieser Reihenfolge

### 1. Was von draußen hereinkommt

Abwägung 1 und die Fixes 1 und 3 aus Block A mit Abwägung 10. In Block B ist die Richtung
umgekehrt: Die App schickt Code hinein und liest Antworten heraus. Beides ist eine Grenze.

### 2. Was der Nutzer verlieren kann

Abwägungen 5 und 6 — eine Kopie, deren Klasse eine Regel trifft, die nicht für sie gedacht war,
ist ein still verändertes Aussehen der Website. Dazu Abwägung 8 und Fix 2 aus Block A.

### 3. Was die App anders zeigt als die Website

Abwägungen 2, 4 und 7. Wenn du misst: an einer **Kopie** eines Projekts mit
quartz-navigations und quartz-layout-box, Website gebaut und über `--serve` nur auf `localhost`.
Die Markierung in den drei Ansichten (Desktop, Tablet, Mobil), ein Ankersprung in Vorschau und
Browser nebeneinander, ein Projekt mit hellem Schema.

### 4. Die Dokumentation

Stimmen die zwei Absätze am Ende von `docs/decisions/navigation-and-pages.md` und der Punkt am
Ende von Abschnitt 4 in `docs/release.md` mit den Commits und dem Code? Das Benutzerhandbuch kennt
Markierung, Zoom, „Vorschau beenden“ und die automatischen Klassen noch nicht; das ist bekannt
(P8) und kein Befund. **Fehlt eine Regel in `conventions.md`** — zum Beispiel für Code, den die
App in die Website setzt, oder für eine Kopie, die etwas *nicht* erbt?

## Was offen bleibt, und nicht für diese Runde

Bekannt und gesammelt; ein Befund dazu ist nur willkommen, wenn er schwerer wiegt als hier gesagt:

- **P8** steht weiter aus: Vorlagen neu bauen (das Example-Projekt trägt noch 31 Stylesheets),
  Handbuch-Kapitel und Screenshots für die neuen Reiter und Leisten, Release-Notizen.
- Der eine Pfeil an externen Links ist nur im Repo; das Ausrollen ist ein Schritt des nächsten
  Release (`docs/release.md`, Abschnitt 4).
- Ein umbenannter Sprachcode zieht weder Inhaltsordner noch `byLang`-Schlüssel anderer Plugins mit.
- `ReadmeText` kennt keine Bilder, keine verschachtelten Listen, keine HTML-Tabellen.
- Die CLI-Schreibvorgänge (`quartz plugin add` u. a., im Kindprozess) stehen unter keinem Schloss
  der Config.
- Rückstand außerhalb von 1.1, wie am Ende von `docs/plan-1.1-umsetzung.md`: VoiceOver, Linux-
  Schlüsselbund, **macOS x64**, **glibc unter 2.34**, **C1 mit git vor 2.38**.

## Eine Frage über den Code hinaus

Getrennt von den Befunden, am Ende deines Dokuments:

**Block B ist aus Gesprächen entstanden, nicht aus einer Befundliste.** Jeder Schritt hat den
vorigen erweitert: erst der Kasten, dann `<main>`, dann das ersetzte `scrollIntoView`; erst die
Klasse auf zwei Seiten, dann in `duplicateEntry`, dann die `id` dazu. Die Arbeitsregel der Serie
(„ein Befund pro Durchgang, mit Typcheck, Build, Smoke und eigenem Commit“) ist eingehalten, aber
keiner der sechs Commits hatte vorher ein Dokument, das sagt, was er lösen soll und was nicht.
**Braucht Arbeit, die aus der Bedienung kommt, eine eigene Form — etwa einen kurzen Plan in
`docs/` vor dem ersten Commit, oder einen Auftrag wie diesen direkt danach —, oder genügt es, dass
die nächste Runde sie liest?**

## Form der Befunde

Schreibe `docs/REVIEW-2026-10-18.md`. Je Befund: die Stelle (Datei, Funktion, Commit), was
passiert, wie es sich zeigt, was dagegen spräche es so zu lassen, und — wo du eine hast — eine
Richtung. Nach Gewicht sortiert, Hoch/Mittel/Niedrig, und je Befund, ob er aus Block A oder B
kommt. Was du gemessen hast, kennzeichne als gemessen und sag womit; was du gelesen hast, als
gelesen. Eine Behauptung dieses Auftrags, die nicht trägt, ist ein Befund wie jeder andere. Was dir
nebenbei auffällt und kein Befund ist, kommt in einen eigenen Abschnitt am Ende.

**Ändere nichts am Code und committe nichts.** Die einzige neue Datei ist dein Dokument. Schreibe
in keinen Obsidian-Vault. In kein Projekt unter `~/Documents/QuartzProjekte/` — Kopien mit
`cp -Rc` sind der Weg (und `content/` ist dort oft ein Symlink in einen Vault: in der Kopie
darunter nichts schreiben, auch keine mtimes). `gui-test` hat uncommittete Änderungen, die dem
Nutzer gehören — auch dort nur in einer Kopie arbeiten. **Eintragen, Bauen und Serverstarten
schreiben in das Projekt** (Pfade der Frames, `public/`): nur in einer Kopie. **Für die gebaute App
ein Wegwerf-Profil** (`--user-data-dir`); `npm run smoke` tut das selbst — die Messungen von
Block B taten es nicht, das ist kein Vorbild. Eine Messung, die die Config schreibt, legt im
Projekt einen Snapshot an — in einer Kopie egal, im Original nicht. Eine gebaute Website nur über
`--serve` auf `localhost`. **Löse keinen Schlüsselbund-Dialog aus**; die echten Zugänge und Ziele
dieses Rechners nicht anfassen und nicht abbilden. Prüfskripte mit Chrome öffnen keine
`mailto:`-Links (`befd9ef`). In den drei Plugin-Repos nichts ändern. **Veröffentliche nichts**, und
pushe nichts.
