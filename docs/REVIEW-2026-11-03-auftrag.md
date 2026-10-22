Du bist als zweites Paar Augen an QuartzControl, dessen Fassung `1.1.1` (2026-10-22) draußen ist,
und an **quartz-forms**, einem eigenen Quartz-Plugin für Web-Formulare, das mit **1.2** (Branch
`feat/1.2`) veröffentlicht werden soll. Es geht um ein Review, nicht um Änderungen. Am Ende steht
eine Liste von Befunden, über die der Nutzer entscheidet.

## Warum diese Runde

Am 2026-10-22 hat der Nutzer zwei offene Punkte vor 1.2 entschieden, und Claude Opus 5.5 hat sie
am selben Tag umgesetzt:

1. **quartz-forms steht unter MIT**, wie die drei anderen eigenen Plugins (layout-box,
   multilanguage, navigations); nur QuartzControl selbst ist GPL-3.0-or-later. Das Repository bleibt
   privat bis zum Release 1.2.
2. **Die Basis-Vorlage `qc-basic` installiert quartz-forms**, mit einem Formular, das nichts sendet
   (`transport.kind: demo`), und je einer Beispielseite auf Deutsch und Englisch, die es einbindet.
   `qc-basic` ist das Paket, das der Anlege-Assistent anbietet („Basis-Template mitinstallieren“);
   eine Kopie reist in der App mit (`resources/templates/`), eine liegt online im Vorlagen-Repo, und
   **die App 1.1 holt die Online-Kopie** (`builtinTemplateService.ts`, `TEMPLATE_URL`).

**Nichts davon hat ein Review gelesen.** Jede Messung in den Commit-Nachrichten und in diesem
Auftrag stammt von demselben Modell, das die Änderungen geschrieben hat. **Nimm nichts als gemessen
hin, nur weil es so dasteht.**

In der Zählung von `CLAUDE.md` ist das das **neunundfünfzigste** Review.

## Das Projekt

- **QuartzControl:** Electron + React + TypeScript, `/Users/boxi/Development/QuartzControl`. Lies
  zuerst `CLAUDE.md` **und `docs/conventions.md`**, das sie einbindet; die Begründungen stehen in
  `docs/decisions/conventions-full.md`. Für diese Runde zählen besonders:
  - „Wer einen Nutzen misst, misst auch den Preis.“
  - „Ein Wort, ein Name — und zwar über App und Handbuch hinweg.“
  - „Ein Hinweis sagt, was passiert …“ und „Ein Rat gehört zu dem Zustand, den er meint …“
  - „Kann nicht prüfen ist nie alles gut.“
- Die Vorlagen entstehen aus `scripts/example-template/` über `scripts/build-example-template.mjs`
  (Kopf der Datei und `docs/scripts.md`, Eintrag `template:example`). Der Ablauf eines Releases
  samt Vorlagen steht in `docs/release.md` (Punkte 2, 4 und 5).
- **quartz-forms:** `/Users/boxi/Development/quartz-forms`, README (en/de), `CHANGELOG.md`,
  `AGENTS.md`. Der Reiter „Formulare“ der App liegt unter `src/routes/Plugins/Forms*.tsx` und
  `formsOptions.ts`.
- Die Handbücher sind Obsidian-Vaults: `~/Obsidian/QuartzProjekte/QuartzControl-Handbuch`
  (App) und `~/Obsidian/QuartzProjekte/quartz-forms-handbuch` (Plugin).

## Umfang

    # quartz-forms
    git -C ~/Development/quartz-forms show 6012230                  # Lizenz
    # QuartzControl, feat/1.2
    git show 47421728 -- . ':!resources/templates/qc-basic.qtpl'     # qc-basic, release.md Punkt 5
    # App-Handbuch
    git -C ~/Obsidian/QuartzProjekte/QuartzControl-Handbuch show d3902f8

Das Paket selbst: `resources/templates/qc-basic.qtpl` (ein ZIP; `parts/plugins.json`,
`files/content/…`). Zum Vergleich die Fassung davor: `git show 47421728^:resources/templates/qc-basic.qtpl`.

## Abwägungen, die niemand gegengelesen hat

**1. Ein Import in ein Projekt, das schon Formulare hat.** `qc-basic` lässt sich auch in ein
bestehendes Projekt importieren, mit „Projekt gewinnt“ oder „Vorlage gewinnt“
(`electron/main/services/templatePackage/`, Baustein `plugins`). Was geschieht mit einem Projekt,
das quartz-forms schon hat, mit eigenem `transport` (etwa `relay` mit `url`), eigenen Formularen,
Schlüsseln und Spam-Einstellungen? Wird der Eintrag ganz ersetzt, zusammengeführt oder bleibt er?
Kann ein Import still dazu führen, dass eine laufende Website nichts mehr sendet, oder dass ein
zweiter quartz-forms-Eintrag entsteht? Was sagt die Vorschau (Dry-Run) dazu, bevor man zustimmt?
Prüf das an der Oberfläche und im Dry-Run, nicht nur im Code.

**2. Der Versand steht global auf `demo`, nicht am Formular.** Begründung in `basic.mjs`
(`forms()`): Ein neues Formular im Reiter funktioniert dann ebenfalls, und wer das Relay einrichtet,
stellt an einer Stelle um. Stimmt das mit dem Reiter überein? Stellt die Einrichtung des Relays
(`FormsRelay.tsx`) den Versand um, oder muss der Nutzer das selbst tun, und sagt ihm das jemand?
Was zeigt der Reiter bei einem Projekt frisch aus `qc-basic`, und passt das zu den Sätzen auf den
neuen Beispielseiten („Unter „Versand“ steht … „Vorführung“ …“)?

**3. Der Preis.** Ein Projekt aus `qc-basic` hat jetzt immer ein Formular, auch ohne die
Beispielseiten (das Häkchen „Mit den Beispielseiten“). quartz-forms legt Stylesheet und Skript auf
jede Seite, sobald `forms` nicht leer ist (`src/transformer.ts`, `externalResources`). Was kostet
das je Seite und je Website, die nie ein Formular zeigt? Sagt der Bau eines solchen Projekts etwas
(Hinweise von quartz-forms)? Ist das den Nutzen wert, oder gehört das Formular nur zu den
Beispielseiten?

**4. Die App 1.1 und das Vorlagen-Repo.** `docs/release.md` Punkt 5 sagt jetzt, das neue Paket gehe
erst mit 1.2 und erst bei öffentlichem quartz-forms ins Vorlagen-Repo. Was geschieht danach mit
einem Nutzer, der noch 1.1 hat und ein Projekt mit der Basis-Vorlage anlegt: Installiert seine App
das Plugin, baut die Website, was zeigt seine Plugin-Seite ohne den Reiter „Formulare“? Gibt es
einen Weg, auf dem eine 1.1-App das Paket schon vorher bekommt?

**5. Das Bauskript.** Phase 4 hängt den Eintrag an und filtert `FORMS_SOURCE` wie die anderen
github:-Quellen; Phase 11 zählt Einträge und Kennungen. Bleibt jede Phase wiederholbar (`--only 4`
zweimal, `--only 2` ohne 4)? Ändert sich für `example`, `doku` und `plugin` etwas, obwohl sie das
Plugin nicht installieren? Stimmt die Beschreibung des Pakets (`variants.mjs`, `describe`) mit dem,
was es enthält?
**Starte `template:example` nicht:** Das Skript startet die App mit dem echten Profil und schreibt
in die echten Werkstätten unter `~/Documents/QuartzProjekte/werkstatt/`. Lies es, und miss am
fertigen Paket.

**6. Die Lizenz.** Die `LICENSE` ist wörtlich die der Geschwister, auch mit „Copyright (c) 2026
Quartz Community“. Ist das der richtige Rechteinhaber für ein Plugin, das der Nutzer allein
schreibt (bei den Geschwistern genauso)? Passt MIT zu dem, was das Paket mitliefert (OpenPGP.js
unter LGPL-3.0-or-later in `dist/vendor/openpgp/` samt `LICENSE`, das PHP-Relay)? Steht irgendwo
noch „UNLICENSED“, „noch nicht entschieden“ oder Ähnliches (README, AGENTS.md, Handbuch-Vault des
Plugins, CI, `package.json` „files“)?

**7. Die Texte.** Die zwei neuen Seiten (`basic-content/2-schreiben/3-formulare.md`,
`en/2-writing/3-forms.md`) und der Satz in Kapitel 2.2 des App-Handbuchs (DE und EN). Stimmen die
Namen mit der Oberfläche überein („Plugins → Formulare“, „Versand“, „Vorführung“, „Relay“, en
„Sending“, „Demo“)? Führt der Link `[[4-gestaltung/08-plugins#Formulare|Formulare]]` auf der
gebauten Handbuch-Website an die richtige Stelle? Sagen de und en dasselbe? Die Seiten sind zum
Lesen und Löschen gedacht (`basic-content/README.md`): kurz genug?

## Worauf es ankommt, in dieser Reihenfolge

1. **Was auf der Website eines Nutzers still kaputtgeht oder etwas sendet, das nicht gesendet
   werden soll** (Abwägung 1, dann 4).
2. **Was QuartzControl oder eine Seite falsch sagt** (Abwägungen 2, 7).
3. **Was es kostet** (Abwägung 3).
4. **Bauskript, Lizenz, Doku** (Abwägungen 5, 6).

## Wenn du misst

Ändere nichts in diesem Repo, in quartz-forms, in einem Vault oder in einem Projekt unter
`~/Documents/QuartzProjekte`. Arbeite in Kopien in deinem Ordner
`/private/tmp/claude-501/-Users-boxi-Development-QuartzControl/d5047753-f1e3-4666-9405-9eadb3f8176b/scratchpad/review-59/`
(im Folgenden `<r59>`).

- **Lies nie etwas aus einem Projekt oder Vault namens `HinterlandHistory`/`hinterland-history`**,
  auch nicht in einer Schleife oder einem `grep` über alle Projekte.
- **Keine Anfrage an einen Host außerhalb dieses Rechners**, außer `npm ci` in deinen Klonen und
  dem Klonen von `github:boxi-os/*`, das ein Import oder `quartz plugin add` selbst tut.
- Hat die Rechteprüfung einen Schritt abgelehnt, umgeh ihn nicht auf anderem Weg. Nenn ihn im
  Bericht als nicht gemessen.

**Die App:**

- `git clone /Users/boxi/Development/QuartzControl <r59>/qc`, dort `git checkout feat/1.2`,
  `npm ci`, `npm run build`.
- Starten mit `_electron.launch` aus `playwright-core` und einem eigenen `--user-data-dir` in
  `<r59>`, **nie mit dem echten Profil**. Die Muster stehen in `.claude/skills/run-desktop/SKILL.md`;
  Phase 11 von `scripts/build-example-template.mjs` (`verify()`) zeigt, wie ein Paket über
  `window.quartzGui.templatePackage.plan/import` in ein leeres Projekt kommt.
- Projekte legst du in `<r59>` an, über die App oder als Klon von Quartz wie `bootstrap()` im
  Bauskript. Für Abwägung 1 brauchst du ein Projekt mit quartz-forms und eigenem Relay-Versand;
  installiere das Plugin dort mit `npx quartz plugin add github:boxi-os/quartz-forms`.
- `npm run typecheck`, `npm run smoke` und `npm run check:i18n` im Klon.
- Eine gebaute Website öffnest du mit `chromium.launch({ channel: 'chrome' })` über einen eigenen
  kleinen Server in `<r59>`.

## Was du ablieferst

Einen Bericht auf Deutsch in `<r59>/review.md`:

- Befunde nach Gewicht (Hoch, Mittel, Niedrig), je mit Ort, Szenario, Beleg (gemessen oder gelesen,
  und womit) und einem Vorschlag.
- Getrennt davon eine Liste „Nebenbei“ für Kleinigkeiten.
- Zu jeder der sieben Abwägungen eine Antwort, auch wenn sie „kein Befund“ lautet.
- Am Ende ein Urteil: ob die Änderungen so mit 1.2 veröffentlicht werden können, und was vorher
  geschehen muss.
- Was du auf dem Mac angelegt hast (alles nur unter `<r59>`).

Kennzeichne bei jedem Befund, ob du ihn gemessen oder nur gelesen hast.
