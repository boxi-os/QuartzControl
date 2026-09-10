# QuartzControl

*In English: [README.md](README.md) — das ist die maßgebliche Fassung; diese hier wird nachgezogen.*

Eine Desktop-App zum Verwalten von [Quartz-5](https://quartz.jzhao.xyz/)-Websites: Konfiguration,
Gestaltung, Plugins, Layout, Vorschau, Veröffentlichen und Sicherungen — ohne YAML von Hand und ohne
Terminal.

Quartz macht aus einem Ordner voller Markdown-Dateien eine Website. Das ist die gute Nachricht. Die
weniger gute: Bis dahin sind eine `quartz.config.yaml`, ein Layout aus verschachtelten Komponenten,
eine Handvoll Plugins und ein Deploy-Weg einzurichten, und nichts davon erklärt sich beim Ansehen.
QuartzControl legt eine Oberfläche darüber, die zeigt, was es tut, und die man wieder verlassen
kann — die Dateien bleiben normale Quartz-Dateien.

> **Beta.** Version 1.0.0-beta.1. Läuft auf macOS und Linux; Windows fehlt bewusst (siehe unten).
> Rückmeldungen sind willkommen — am liebsten als Issue.

## Was die App kann

- **Einrichtung** — Titel, Adresse und Verhalten der Website; den `content/`-Ordner zwischen einem
  echten Verzeichnis und einem Symlink umschalten (etwa in einen Obsidian-Vault); Übersetzungen.
- **Gestaltung** — Farben und Schriften, Community-Themes, alle CSS-Variablen mit ihrem
  Abhängigkeitsgraph, eigenes CSS. Dazu ein Layout-Editor, der die Quartz-Layouts als Raster zeigt,
  und Frames, die man ziehen statt schreiben kann.
- **Plugins** — installieren, konfigurieren und sortieren, offizielle wie aus dem Marktplatz. Die
  Optionen kommen aus den `.d.ts`-Dateien des Plugins, es gibt also keine gepflegte Liste, die
  veraltet.
- **Vorlagenpakete** — eine fertige Gestaltung als `.qtpl` exportieren und in ein anderes Projekt
  einspielen.
- **Vorschau und Bauen** — Dev-Server starten und stoppen, Build mit Log.
- **Veröffentlichen** — Zugänge (SFTP, FTP, GitHub, rsync, Ordner) app-weit, Ziele pro Projekt;
  dazu `quartz sync` und Git-Sync.
- **Wartung** — Snapshots als eigenes Git-Repo neben dem Projekt, Wiederherstellen einzelner
  Dateien, Update-Prüfung für Quartz und Plugins.

Mehrere Projekte nebeneinander sind vorgesehen; die App merkt sich für jedes, wo es liegt und wie
es eingerichtet ist.

## Was mitreist

Damit ein erster Start nichts voraussetzt, liefert die App aus:

| | |
| --- | --- |
| **Node und npm** | Electrons eigene Node-Laufzeit über drei Shims im PATH — es muss also kein Node installiert sein |
| **git** | nur benutzt, wenn auf dem Rechner keines antwortet; sonst gewinnt das des Systems |
| **Das Benutzerhandbuch** | rund 100 Seiten in zwei Sprachen, ohne Netz lesbar, aus jedem Bildschirm verlinkt |
| **Eine Beispielvorlage** | als Reserve, falls beim Anlegen eines Projekts kein Netz da ist |

## Installation

**1.0.0-beta.1** ist da und liegt unter
[Releases](https://github.com/boxi-os/QuartzControl/releases): DMG und zip für macOS (arm64 und
x64), AppImage und deb für Linux (arm64 und x86_64) und ein Flatpak für x86_64 und aarch64. Jede
Datei nennt ihre Architektur, zwei Downloads sehen also nie gleich aus. Selbst bauen geht
weiterhin — siehe [Selbst bauen](#selbst-bauen).

Die zwei Hinweise darunter gelten für die fertigen Pakete wie für einen eigenen Bau.

**macOS:** Die App ist nicht signiert — es gibt kein Developer-ID-Zertifikat. Beim ersten Start
verweigert Gatekeeper sie deshalb. Entweder einmal über das Kontextmenü öffnen (Rechtsklick →
Öffnen) oder:

```
xattr -dr com.apple.quarantine /Applications/QuartzControl.app
```

**Linux:** AppImage ausführbar machen und starten, oder das deb installieren. Der Flatpak braucht
`--filesystem`-Zugriff auf den Ort, an dem die Projekte liegen, falls das nicht das Home ist.

## Selbst bauen

```
npm install
npm run dev        # Entwicklungsmodus
npm run build      # Produktionsbau nach out/
npm run dist:mac   # bzw. dist:linux, dist:flatpak
```

Es gibt keine Testsuite. Was es stattdessen gibt, sind Prüfungen, die je eine Frage beantworten,
die weder Typcheck noch Build beantworten:

| | |
| --- | --- |
| `npm run typecheck` | beide `tsconfig`s |
| `npm run smoke` | startet den Bau und besucht jeden Bildschirm in zwei Fenstergrößen |
| `npm run check:i18n` | jeden `t('…')`-Schlüssel gegen beide Sprachdateien, in beide Richtungen |
| `npm run check:semver` | die Versionsvergleiche des Update-Hinweises |
| `npm run check:plugin-names` | die Namensbildung gegen Quartz' *eigene* Funktion |
| `npm run check:handbook` | die Zitate des Handbuchs gegen das, was die App wirklich sagt |
| `npm run check:runtime` | die eingebettete Laufzeit gegen ein echtes Projekt |
| `npm run check:tokens` | ob eine CSS-Variable in einer laufenden Seite wirklich etwas bewegt |

Warum jede davon existiert, steht in [`CLAUDE.md`](CLAUDE.md) neben dem Fehler, der sie erzwungen
hat.

## Warum kein Windows

Nicht aus Desinteresse, sondern weil drei Dinge dort anders sind und die App ohne sie nicht das
täte, was sie verspricht: Verzeichnis-Symlinks brauchen erhöhte Rechte (das ist die
Obsidian-Vault-Funktion), npm und npx werden über `cmd.exe` gestartet, wo freie Textargumente neu
interpretiert werden, und für rsync gibt es keine Entsprechung. Ein `win:`-Block in der
Paketkonfiguration würde einen Installer für eine Fassung erzeugen, die nicht funktioniert.

## Wie das hier entstanden ist

Ein Hobbyprojekt, aus Spaß, technischem Interesse und für den eigenen Gebrauch geschrieben. Die
manuelle Konfiguration von Quartz hat mich an meine Grenzen gebracht, sodass ich QuartzControl ins
Leben gerufen habe. Da es sich für mich selbst als sehr nützlich erwiesen hat, möchte ich es der
Allgemeinheit zur Verfügung stellen … vielleicht findet es ja der eine oder die andere genauso
nützlich wie ich. Im Zuge von QuartzControl sind außerdem zwei Plugins entstanden:
[quartz-layout-box](https://github.com/boxi-os/quartz-layout-box) und
[quartz-multilanguage](https://github.com/boxi-os/quartz-multilanguage), die ich euch ebenfalls
gerne zur Verfügung stelle. Darüber hinaus stelle ich eine Beispiel-Vorlage bereit, die eine
komplette Konfiguration umfasst und als Basis für ein eigenes Website-Design dienen kann.

Folgendes möchte ich an dieser Stelle transparent machen: Der Code ist zum größten Teil mit
[Claude Code](https://claude.com/claude-code) entstanden; die Commits sagen das mit einem
`Co-Authored-By`-Eintrag. Mir ist bewusst, dass Vibe-coding teilweise kontrovers diskutiert wird,
und ich möchte hier nichts verbergen.

## Wie gut ist der Code geprüft?

Die Antwort, so gut sie sich geben lässt: Es gibt Review-Runden mit einem zweiten Modell, die als
Dokumente in [`docs/`](docs/) liegen — mit jedem Befund, seiner Schwere und dem, was daraus wurde.
Jede Regel in [`CLAUDE.md`](CLAUDE.md) steht neben dem Experiment, das sie erzwungen hat, und die
Messungen dazu in [`docs/decisions/`](docs/decisions/). Es gilt die Arbeitsregel, dass jede Zahl in
einem Kommentar eine Messung ist oder nicht dort steht, und dass „kann nicht prüfen" nie „alles
gut" heißt. Wo etwas nicht gemessen werden konnte, steht das dabei. Das ist keine Garantie, und
Fehler sind sicher drin. Aber es ist nachlesbar, und das ist mehr, als ein Versprechen wert wäre.

Hinzu kommen meine persönlichen Testläufe mit der App — und vielleicht auch bald Eure … feel free!

## Verwandte Repos

- **[quartz-layout-box](https://github.com/boxi-os/quartz-layout-box)** — Quartz-Plugin, setzt eine
  HTML-Box ins Layout
- **[quartz-multilanguage](https://github.com/boxi-os/quartz-multilanguage)** — Quartz-Plugin für
  mehrsprachige Inhalte: Spracherkennung, Übersetzungsverknüpfung, Sprachumschalter, hreflang,
  Weiterleitungen
- **[quartzcontrol-templates](https://github.com/boxi-os/quartzcontrol-templates)** —
  Vorlagenpakete, die die App beim Anlegen eines Projekts holt

Beide Plugins funktionieren unabhängig von QuartzControl in jedem Quartz-5-Projekt.

## Lizenz

[GPL-3.0-or-later](LICENSE). Die mitgelieferten fremden Programme behalten ihre eigenen Lizenzen —
git (GPLv2), Electron (MIT, mit Chromium und Node.js) und npm (Artistic-2.0); die Texte liegen in
[`resources/licenses/`](resources/licenses/) und sind in der App unter *Hilfe → Lizenzen öffnen*
erreichbar.

QuartzControl ist ein eigenständiges Werkzeug und weder Teil von Quartz noch mit dem Quartz-Projekt
verbunden.
