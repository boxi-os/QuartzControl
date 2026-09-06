# Das Benutzerhandbuch

Das Handbuch zur App — nicht zu verwechseln mit dem **Example-Handbuch**, das die Beispielvorlage
erklärt und im Vault `~/Obsidian/QuartzProjekte/Example` lebt
(`scripts/example-template/README.md`).

**Stand 2026-09-07:** Regeln, Gliederung, Vault und Projekt stehen. Geschrieben ist das Gerüst —
Startseite und acht Kapitelseiten, die nennen, was hineinkommt. Die Kapitel selbst und das
Screenshot-Skript gibt es noch nicht; deren Abschnitte hier beschreiben, was entstehen soll.

## Warum es nicht im Example-Vault steht

Der Example-Vault reist im Vorlagenpaket mit. `resources/templates/minimal-lesbar.qtpl` (754 KB)
enthält 301 Einträge unter `files/content/`: der `content`-Baustein
(`electron/main/services/templatePackage/parts.ts`) liest durch den Symlink hindurch und packt den
ganzen Vault ein. Ein App-Handbuch als achtes Kapitel dort landete damit bei jedem Nutzer im
Import — als Inhalt seiner Website.

Also ein eigener Ort:

```
~/Obsidian/QuartzProjekte/QuartzControl-Handbuch/   der Vault — der Inhalt, eigenes git
        ↑ Symlink
~/Documents/QuartzControl-Handbuch/content/         das Projekt, mit der Example-Vorlage
```

Nicht `Handbuch`: In `QuartzProjekte/` liegt bereits `brain-handbuch`, und das ist ein
vollständiges Quartz-*Projekt*, kein Vault. Ein Vault namens `Handbuch` daneben führt beim nächsten
Lesen in die Irre.

Das Projekt entstand aus `minimal-lesbar.qtpl` — **ohne den Baustein `content`**. Bei einem
Symlink lehnt der Baustein sich zwar selbst ab (`contentIsSymlink`), aber abwählen ist ehrlicher
als sich darauf zu verlassen. Gemessen am 2026-09-07: 12 Bausteine im Paket, 11 importiert, keine
Warnung; die Website baut mit 9 Seiten zu 101 Dateien durch. Damit ist das Handbuch zugleich der
zweite echte Importtest des Pakets — das erste Projekt, das die Vorlage benutzt, ohne sie gebaut
zu haben.

Aufgesetzt wurde es wie in `scripts/build-example-template.mjs`: `git clone` von jackyzha0/quartz
(voll, nicht flach — ein flacher Klon lässt sich später nirgends hinpushen), `npm install`,
`npx quartz create`, dann der Import über die **gebaute App** per Playwright, also durch dieselben
IPC-Pfade wie ein Klick.

**Die Vault-Schreibregel gilt weiter, nur für zwei Vaults:** `Example` und
`QuartzControl-Handbuch` werden gepflegt, alle anderen unter `~/Obsidian/` sind tabu. Gepflegt wird mit gewöhnlichen
Dateioperationen, nicht über das Obsidian-CLI — das fällt bei einem ihm unbekannten Vault-Namen
still auf einen anderen zurück (gemessen 2026-09-04).

## Die acht Kapitel

| Kapitel | Die Frage, die es beantwortet |
| --- | --- |
| 1 Einstieg | Was ist QuartzControl, was Quartz, was Obsidian — und was nimmt mir die App ab? Installieren, erster Start, wie das Fenster gelesen wird. |
| 2 Projekte | Wie lege ich ein Projekt an, hole ein vorhandenes dazu, dupliziere es? Was steht in den Einstellungen? |
| 3 Einrichtung | Übersicht, Titel und Basis-URL, Projektbild, Content-Ordner (echter Ordner oder Vault), Übersetzungen. |
| 4 Gestaltung | Stile (Basis, Community-Themes, Variablen, eigenes CSS), Layout (Frames, Global, Seitentypen), Plugins, Vorlagenpakete. |
| 5 Ansehen und bauen | Vorschau, Dev-Server, Build, was in der Konsole steht. |
| 6 Veröffentlichen | Zugänge und Ziele, GitHub Pages, Git-Sync, Ordner, rsync, Webhook. |
| 7 Wartung | Snapshots und Zurückholen, Quartz-Updates, App-Updates. |
| 8 Nachschlagen | Glossar der App-Begriffe, Menü und Tastenkürzel, wo die Daten liegen, bekannte Grenzen. |

Konventionen wie im Example-Vault: Nummer im Titel *und* im Dateinamen (der Explorer sortiert nach
dem Titel), `translationKey` = deutscher Pfad ohne Nummern-Prefix, `section` = Kapitelname, erster
Tag = Kapitel-Slug. Deutsch in der Wurzel, Englisch unter `en/`.

Das Glossar in Kapitel 8 erklärt die **App**-Begriffe: Projekt, Snapshot, Zugang, Ziel, Frame,
Baustein, Vorlagenpaket. Für Quartz- und Obsidian-Begriffe verlinkt es auf das Glossar des
Example-Handbuchs, statt es zu kopieren — eine zweite Kopie würde driften, und welche der beiden
dann stimmt, sieht niemand.

## Screenshots

`scripts/screenshots.mjs` (geplant) ist der Zwilling von `scripts/smoke.mjs`: derselbe Launcher,
dieselbe Wartelogik, dieselbe Routenliste. Die Liste zieht dafür aus `smoke.mjs` nach
`scripts/routes.mjs`, damit beide dieselbe lesen — sonst zeigt das Handbuch Bildschirme, die der
Smoke-Test nicht mehr prüft.

- Aufgenommen wird gegen das **Example-Projekt**: echte Plugins, echte Stile, echter Inhalt. Ein
  leeres Demoprojekt sähe in einem Handbuch nach nichts aus.
- Feste Fenstergröße, Sprache über die Einstellungen gesetzt, jede Route hell **und** dunkel.
  `emulateMedia` wird hier ausdrücklich gesetzt — im Smoke-Test steht bewusst `null`, weil er das
  Schema des Systems treffen soll.
- Ziel: `<vault>/assets/screenshots/<sprache>/<route>-<hell|dunkel>.png`.
- `--only <route>` für einzelne Aufnahmen, damit ein geänderter Text nicht alle Bilder neu erzeugt.

Was eine Routenliste nicht trifft — offene Dialoge, ein laufender Build mit Konsolenausgabe, ein
Fehlerzustand, der Marktplatz mit Ergebnissen, der Frame-Editor beim Ziehen —, wird von Hand
aufgenommen. Der Weg dorthin gehört hierher, sobald es die erste solche Aufnahme gibt: eine
Handaufnahme ohne notierten Weg ist beim nächsten Mal keine.

## Der Ablauf

Die Reihenfolge ist nicht beliebig: **Texte, dann Handbuch, dann Screenshots.** Jeder Screenshot
friert die App-Texte ein, und beim Schreiben eines Kapitels fällt erst auf, welcher Hinweis sich
nicht erklären lässt, ohne ihn zu ersetzen.

1. App-Texte überarbeiten, Bildschirm für Bildschirm, eigener Commit je Bereich.
2. Vault, Projekt, Kapitelgerüst.
3. Kapitel schreiben, mit der gebauten App daneben (`run-desktop`). Textbefunde **sammeln**, nicht
   nebenbei beheben.
4. Screenshot-Skript, Aufnahmen.
5. Zweiter Textdurchgang aus den gesammelten Befunden, betroffene Bilder mit `--only` neu.
6. Hilfe-Menü und Startseite verlinken das Handbuch; veröffentlichen.
7. Englisch als eigener Durchgang.

**Die Oberfläche ist dabei eingefroren.** Fällt beim Schreiben ein Bedienweg auf, der falsch ist,
wird er notiert und genannt — nicht behoben. Sonst veralten die Screenshots, während sie entstehen.

## Prüfen

Nach jedem Textdurchgang:

    npm run check:i18n && npm run typecheck && npm run build && npm run smoke

`check:i18n` ist das entscheidende Netz: Es löst jeden literalen `t('…')` und `mainT('…')` gegen
beide Sprachdateien auf und prüft die Parität in beide Richtungen. Solange nur *Werte* geändert
werden und keine Schlüssel, kann ein Textdurchgang nichts brechen, was es nicht sieht.

Für das Handbuch selbst: Bau über den Dev-Server der App, **nie** ein zweites `quartz build`
daneben — zwei Builder im selben `public/` enden in `ENOTEMPTY`. Dazu Linkprüfung und eine
Bildprüfung in beide Richtungen (jedes Bild wird referenziert, jede Referenz existiert).

Und am Ende die einzige Prüfung, die zählt: das Handbuch einmal von vorn lesen, als jemand, der
die App nicht kennt.
