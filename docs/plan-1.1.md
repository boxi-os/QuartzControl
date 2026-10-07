# Plan für 1.1

Stand: 2026-10-07. Fünf Vorhaben, die zusammen 1.1 ausmachen. Die beiden CSS-Vorhaben (2, 3) gehören
zusammen, weil beide ändern, wie eine Website ihre Stylesheets lädt, und beide einen Umzug bestehender
Projekte nach sich ziehen — einmal statt zweimal. Die Plugin-Optionen (1), der Layout-Baukasten (4) und
die Werkzeuge der Layout-Box (5) gehören ebenfalls zusammen: Die Optionen eines Plugins erscheinen im
Baukasten direkt in der Seitenleiste, also wird die neue Darstellung der Optionen einmal gebaut und an
beiden Stellen benutzt.

Nichts davon ist begonnen. Was hier „gemessen“ heißt, ist es; alles andere ist Plan.

## 1. Plugin-Optionen vollständig und verständlich

**Wunsch:** Plugins sollen sich möglichst vollständig in der App konfigurieren lassen, ohne die YAML von
Hand anzufassen. Vor allem die drei eigenen — `quartz-layout-box`, `quartz-multilanguage`,
`quartz-navigations` —, deren Optionen alle bekannt sind; aber auch bei fremden Plugins fehlen Optionen.

**Heute:** Das Schema kommt aus den `.d.ts` des Plugins
([`decisions/plugins-and-config.md`](decisions/plugins-and-config.md)); was sich daraus nicht ableiten
lässt, ist `unsupported` und fällt weg. Dargestellt wird eine flache Liste aus `FieldRow`
(`src/routes/Plugins/Installed.tsx`): Schlüssel links, ein Feld rechts.

**Ziel:** eine Darstellung, die die Optionen erklärt statt sie aufzuzählen — Schalter, Auswahllisten,
und Options-Blöcke, die nur erscheinen, wenn sie gelten (eine Option, die nur bei einer bestimmten
Darstellung wirkt, steht erst dann da).

**Offen, vor dem Planen zu klären:**

- Woher kommt das Wissen über die Optionen der drei eigenen Plugins — ein Schema, das jedes Plugin
  selbst mitbringt (und das dann auch fremde Plugins liefern könnten), oder eine Tabelle in der App?
- Was fehlt bei fremden Plugins genau: Typen, die die `.d.ts`-Auswertung nicht versteht, oder Optionen,
  die gar nicht in den Typen stehen? Das ist an den installierten Plugins zu zählen, bevor gebaut wird.
- Verschachtelte Optionen (`byLang`, Listen von Objekten) — heute werden sie als JSON-Text bearbeitet.

Seit 1.0.2 gilt bereits: Ein geleertes Feld entfernt den Schlüssel, statt `""` oder `null` zu schreiben;
„Leer setzen“ schreibt ausdrücklich `""`.

Die Darstellung wird als eigene Komponente gebaut, die nicht an die Plugins-Seite gebunden ist: Der
Layout-Baukasten (4) zeigt dieselben Optionen in seiner Seitenleiste.

## 2. Verwaltete Blöcke aus `custom.scss` in eine eigene Datei

**Wunsch:** `custom.scss` soll weitgehend dem Nutzer gehören.

**Heute:** Die App verwaltet vier Blöcke in `custom.scss` — `imports`, `fonts`, `google-fonts`,
`css-vars`. In gui-test sind das rund 600 von 657 Zeilen, `google-fonts` allein 470. Der Nutzer schreibt
in die Lücken dazwischen.

**Plan:** Die vier Blöcke ziehen in eine eigene Datei, etwa `quartz/styles/_quartzcontrol.scss`. In
`custom.scss` bleibt eine Zeile ganz oben: `@use "./quartzcontrol";`. Ganz ohne geht es nicht — Quartz
lädt nur `custom.scss` (`quartz/plugins/emitters/componentResources.ts`), und Sass verlangt `@use` vor
allen anderen Regeln.

**Gemessen** (2026-10-06, mit dem `sass` eines Projekts, 1.104.1): Das CSS eines per `@use` geladenen
Moduls steht im Ergebnis vor dem CSS von `custom.scss`, und relative `url(static/fonts/…)` bleiben
unverändert — die Schriften laden also weiter.

**Was sich dadurch ändert:** Heute steht `css-vars` am Ende der Datei und schlägt eigene Regeln
gleicher Spezifität davor, aber nicht danach. Ausgelagert steht alles Verwaltete vorn: Eine eigene
Regel in `custom.scss` gewinnt dann gegen die Variablen-Seite, **wo sie mindestens so spezifisch
ist**. Für die helle Hälfte genügt `:root { --x: … }`. Die dunkle Hälfte schreibt die App unter
`:root[saved-theme="dark"]` (Spezifität 0,2,0) — dort gewinnt nur eine eigene Regel mit
mindestens diesem Selektor, unabhängig von der Reihenfolge (Review 2026-10-13, Befund 7). Das ist
eine Verhaltensänderung, die in die Release-Notizen gehört; vor dem Satz dort wird die
`sass`-Messung um den dunklen Fall ergänzt.

Dazu gehört der verschobene Befund 7 des 38. Reviews: Die helle Überschreibung als
`:root:not([saved-theme="dark"])` zu schreiben, damit die dunkle Hälfte leer bleiben kann, wo sie
leer sein soll. Er ändert die Form desselben Blocks und braucht denselben Leser für alte und neue
Form — also einmal mit dem Umzug, nicht getrennt davon. Und er ändert den Satz oben: Mit
`:root:not(…)` hat auch die helle Hälfte die Spezifität 0,2,0, und ein eigenes `:root { --x: … }`
gewinnt dann in keinem der beiden Modi mehr. Welche Form gilt, wird zusammen entschieden ([`REVIEW-2026-10-12.md`](REVIEW-2026-10-12.md),
Befund 7).

**Was es kostet:**

- **Umzug bestehender Projekte:** Beim ersten Schreiben nimmt die App die Blöcke aus `custom.scss` und
  setzt die `@use`-Zeile — wie beim Umzug der Marker im September (`MARKER_NAMES` in
  `styleService.ts`). Lesen muss sie beide Orte.
- **Ältere App-Fassungen:** Ein Projekt, das per Git-Sync zu einer 1.0.x-App reist, zeigt dort
  0 Variablen und 0 eingebundene Dateien; deren erstes Speichern legt die Blöcke wieder in `custom.scss`
  an. Derselbe Preis, den [`conventions.md`](conventions.md) für den Marker-Umzug beschreibt — er gehört
  in die Release-Notizen ([`release.md`](release.md), Punkt 7).
- **Das Schloss** (`styleLock.ts`) muss beide Dateien decken; die Bau-Tür muss die fehlende
  `@use`-Zeile erkennen und zurücksetzen.
- **Vorlagen:** der Teil `styles` im `.qtpl`-Paket, `scripts/build-example-template.mjs` samt
  `--check-sync`.
- **Editor:** „Eigenes CSS“ zeigt die verwaltete Datei mindestens lesbar.
- **Handbuch:** Kapitel 4.5.

## 3. Weniger Stylesheets im Basis-Template

**Wunsch:** 31 Dateien sind deutlich zu viele.

**Heute:** 31 Dateien mit 6647 Zeilen in `scripts/example-template/styles/`, Reihenfolge in
`style-order.mjs`, gemeinsam für alle vier Varianten (Basis, Example, Doku, Plugin).

**Beschlossen:** zwölf Dateien — eine fürs Layout, eine für den Content, eine je Komponenten-Kategorie,
eine für die Callouts und je eine für die drei eigenen Plugins. In Ladereihenfolge:

| Datei | Inhalt (heutige Dateien) | Zeilen ca. |
|---|---|---|
| `foundation` | aus `base.scss`: `box-sizing`, Symbole, Aufklapp-Pfeile, Ausblenden langer Listen, Fokusring, reduzierte Bewegung | 300 |
| `layout` | aus `base.scss` Z. 127–401 und 657–1021 (klebender Kopf, Spalten, Bildlauf, Panels, Breakpoints); `site-footer` | 700 |
| `components-header` | `nav-header`, `nav-search`, `page-search-results`, `nav-darkmode`, `nav-reader-mode` | 705 |
| `plugin-multilanguage` | `nav-language-switcher` | 300 |
| `components-navigation` | `nav-explorer`, `meta-breadcrumbs` | 825 |
| `plugin-navigations` | `nav-navigations` | 360 |
| `components-note` | `meta-note-properties`, `meta-tag-list`, `aside-toc`, `aside-backlinks`, `aside-graph`, `aside-recent-notes` | 700 |
| `content` | `meta-title-and-date`; aus `base.scss` Z. 507–591 (Zeilenabstände); `body-content`, `body-code`, `body-math`, `body-mermaid`, `body-media`, `page-popover` | 1430 |
| `callouts` | `body-callouts` | 175 |
| `pages` | `page-listing`, `page-bases`, `page-canvas`, `page-404` | 770 |
| `plugin-layout-box` | `plugin-layout-box` | 250 |
| `a11y` | `a11y` — zuletzt, damit diese Regeln gewinnen | 150 |

Die Zeilenangaben zu `base.scss` beziehen sich auf den Stand vom 2026-10-06.

**Zu den Namen:** `foundation` statt `base`, weil die Vorlage sonst eine `custom/base.scss` neben Quartz'
`styles/base.scss` hätte — zwei Dateien gleichen Namens mit verschiedenem Inhalt. Kein Name beginnt mit
einer Ziffer (Grund in `style-order.mjs`).

**Plugin-Regeln außerhalb der Plugin-Dateien** (gezählt am 2026-10-06):

- `a11y.scss`: vier Regeln für die Layout-Box — bleiben in `a11y`, weil sie zuletzt laden müssen.
- `base.scss` Z. 603: Fokus für `.layout-box` — bleibt beim Fokusring in `foundation`.
- `nav-explorer.scss` Z. 474: `.layout-box-current-folder`, eine Layout-Box im Stil des Explorers —
  beim Umbau entscheiden, vermutlich nach `plugin-layout-box`.
- `nav-explorer.scss` ab Z. 708: der Sprachfilter von multilanguage — bleibt beim Explorer, weil er
  dessen Verhalten betrifft.

**Was getrennt bleibt:**

- **Quartz' eigene Dateien:** `quartz/styles/*.scss`, `quartz/components/styles/`, das CSS der Plugins.
  Der Umbau betrifft nur `quartz/styles/custom/`.
- **Die CSS-Fixes der App** (`src/routes/Styles/cssFixes.ts`), etwa `fix-heading-fonts.scss`, das die
  App anbietet, wenn `quartz-fonts` aktiv ist. Es gehört zu einem Konflikt, nicht zur Vorlage, und fällt
  weg, wenn das Plugin wieder aus ist. Vorsorglich mitliefern geht nicht: In der Vorlage ist
  `quartz-fonts` aus, und `body h1` würde ihre eigenen Überschrift-Regeln schlagen.
- **Eigene Dateien des Nutzers.**

**Was man aufgibt:** Eine einzelne Komponente lässt sich im Reiter „Eigenes CSS“ nicht mehr durch
Abwählen ihrer Datei ausschalten, nur noch eine Kategorie. Wer eine Komponente einschaltet, bekommt ihre
Gestaltung weiter fertig — die Regeln bleiben alle drin.

**Zu prüfen:** Die Reihenfolge ändert sich an drei Stellen — der Footer lädt früher (mit `layout`), die
Brotkrumen mit der Navigation, die Link-Vorschau vor den Seitentypen. Ob dabei eine Regel eine andere
überholt, zeigt `scripts/styles-snapshot.mjs` an der gebauten Website: vorher aufnehmen, umbauen,
nachher aufnehmen, `--diff`. Erwartet ist kein Unterschied; jeder Unterschied ist ein Befund.

**Was nicht passiert:** Bestehende Projekte behalten ihre 31 Dateien. Nur neue Vorlagen-Pakete bekommen
die neue Struktur. `minimal-lesbar.qtpl` bleibt eingefroren, wie es ist.

## 4. Layout als Baukasten

**Wunsch:** Der Layout-Bereich soll einfacher werden — ein Baukasten: kleine, ziehbare Bausteine auf
einer verkleinerten Seite, die Optionen eines Bausteins in einer Seitenleiste rechts, ohne waagerechten
Bildlauf. Seitentypen und die Ansichten Mobil und Tablet gehören hinein.

**Heute:** drei Reiter in `src/routes/LayoutEditor/` — „Global“ (`GlobalBoard.tsx`, das Board mit den
Positionen und dem Vorrat), „Seitentypen“ (`PageTypeOverrides.tsx`, Frame und Ausschlüsse je Typ) und
„Frames“ (`FrameBuilder.tsx`, der Editor eigener Frames); zusammen rund 3400 Zeilen.

**Plan — Bühne mit Seitenleiste:**

- **Die Bühne:** eine schematische Seite — Kopf, linke Spalte, Mitte (über dem Text, Text, unter dem
  Text), rechte Spalte, Fußzeile —, gezeichnet nach dem Frame, der für die Auswahl gilt. Sie passt sich
  der verfügbaren Breite an. **Verkleinert über die Proportionen des Rasters, nicht über
  `transform: scale`**: dnd-kit misst Rechtecke, und eine skalierte Ebene verfälscht diese Messung —
  dieselbe Art Fehler wie die in [`conventions.md`](conventions.md) unter „Kein natives HTML5-Drag“.
- **Die Bausteine:** kompakt — Name, Griff, kleine Markierungen (nur mobil / nur Desktop, Gruppe,
  Bedingung). Ziehbar mit Maus und Tastatur nach den Regeln, die für das Board heute gelten. Nicht
  platzierte Komponenten liegen in einem Vorrat neben der Bühne.
- **Die Seitenleiste rechts:** Ein Klick auf einen Baustein öffnet dort zuerst die Layout-Angaben
  (Position, Reihenfolge, Anzeige, Bedingung, Gruppe; bei gewähltem Seitentyp „auf diesem Seitentyp
  ausblenden“), darunter **die vollständige Konfiguration des Plugins** in der Darstellung aus
  Abschnitt 1 — nicht nur ein Verweis darauf. Ein Panel, kein Modal.
- **Oben zwei Wähler:**
  - **Seitentyp:** „Alle Seiten“ bearbeitet das allgemeine Layout; ein bestimmter Typ (Ordner, Tag,
    Canvas, 404, …) zeigt die Bühne mit dessen Frame, graut ausgeblendete Komponenten aus und bietet die
    Frame-Wahl für diesen Typ an. Der Reiter „Seitentypen“ fällt damit weg.
  - **Ansicht:** Desktop, Tablet, Mobil — zeigt, wie der Frame die Bereiche bei dieser Breite anordnet,
    und graut aus, was dort nicht erscheint.
- **Gemessene Grenze beim Tablet:** Quartz kennt für eine Komponente nur `display: all | mobile-only |
  desktop-only`, und die Grenze ist die Mobil-Breite: `.desktop-only` wird nur unter `$mobile` (800 px)
  versteckt (`quartz/styles/base.scss`, `variables.scss` in gui-test), gilt also auch auf dem Tablet. In
  der Tablet-Ansicht lässt sich deshalb nichts eigens für das Tablet ein- oder ausschalten; sie zeigt die
  Anordnung des Frames, und die ändert man im Frame.

**Eigene Frames bleiben ein eigener Bereich.** Ein Frame ist Geometrie — welche Bereiche es bei welcher
Breite gibt —, der Baukasten ist Belegung — was in diesen Bereichen steht. Beides auf einer Fläche
überlädt den Baukasten. Verbunden werden sie über die Bühne: Dort steht der Name des geltenden Frames mit
„Frame bearbeiten“, das den Frame-Builder mit genau diesem Frame öffnet (`primeStickyState`).

**Reihenfolge:**

1. Kompakte Bausteine und die Seitenleiste auf dem heutigen Board.
2. Die verkleinerte Bühne nach Frame und Ansicht.
3. Der Seitentyp-Wähler; danach fällt der Reiter „Seitentypen“ weg.
4. Die Plugin-Optionen in der Seitenleiste, sobald Abschnitt 1 steht.

Jeder Schritt bleibt für sich benutzbar und wird an der gebauten App gemessen, das Ziehen auch mit der
Tastatur. Handbuch: Kapitel zum Layout neu, Screenshots neu.

## 5. Layout-Box: Snippets und Bilder in der App

**Wunsch:** In der Konfiguration der Layout-Box Snippets anlegen und importieren und Bilder hochladen,
die im `static`-Ordner abgelegt werden.

**Heute:** Die Layout-Box liest ein Snippet aus `dir` (Vorgabe `quartz/static/snippets`) über `file`,
oder nimmt `html` direkt. Die App bietet beides als freie Textfelder an.

**Plan:**

- **Snippets, HTML und Markdown:** `file` wird eine Auswahl aus den Dateien in `dir`, mit „Neu“,
  „Importieren“ (Datei wählen, wird in den Ordner kopiert) und „Bearbeiten“ (ein Editor wie beim eigenen
  CSS). Beide Formate, die die Layout-Box liest — gui-test nutzt schon eine `sidebar-note.md`.
- **Bilder nach `quartz/static/images`:** „Bild hochladen“ kopiert ein Bild dorthin und fügt an der
  Cursorposition des Snippets oder des `html`-Felds einen Verweis ein — als `<img src="{{root}}/static/images/…">`
  in HTML, als Markdown-Bild in Markdown. Ob die Layout-Box `{{root}}` in einem Markdown-Snippet
  ersetzt, ist vor dem Bauen an ihrem Code zu prüfen, sonst braucht Markdown einen anderen Pfad.
- **Namen werden geprüft**, wie beim Vorlagen-Import (`containedPath()`): nichts landet außerhalb von
  `dir` bzw. `static/images`, kein Überschreiben ohne Rückfrage.
- **Zu klären:** ob `static/images` in den Vorlagen-Baustein `static` einfließt, damit ein exportiertes
  Paket die Bilder seiner Snippets mitnimmt.
