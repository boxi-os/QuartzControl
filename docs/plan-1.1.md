# Plan für 1.1

Stand: 2026-10-06. Drei Vorhaben, die zusammen 1.1 ausmachen. Die beiden CSS-Vorhaben gehören
zusammen, weil beide ändern, wie eine Website ihre Stylesheets lädt, und beide einen Umzug bestehender
Projekte nach sich ziehen — einmal statt zweimal. Die Plugin-Optionen stehen für sich.

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

Seit 1.0.2 gilt bereits: Ein geleertes Feld entfernt den Schlüssel, statt `""` oder `null` zu schreiben.

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

**Was sich dadurch ändert:** Heute steht `css-vars` am Ende der Datei und schlägt eigene Regeln davor,
aber nicht danach. Ausgelagert steht alles Verwaltete vorn: Wer in `custom.scss` dieselbe Variable setzt,
gewinnt immer gegen die Variablen-Seite. Das ist die klarere Regel, aber eine Verhaltensänderung, die in
die Release-Notizen gehört.

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
