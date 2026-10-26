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

> **Version 1.2.0.** Läuft auf macOS und Linux; Windows fehlt bewusst (siehe unten). Rückmeldungen
> sind willkommen — am liebsten als Issue.

## Was die App kann

- **Einrichtung** — Titel, Adresse und Verhalten der Website; den `content/`-Ordner zwischen einem
  echten Verzeichnis und einem Symlink umschalten (etwa in einen Obsidian-Vault); Übersetzungen.
- **Gestaltung** — Farben und Schriften, Community-Themes, alle CSS-Variablen mit ihrem
  Abhängigkeitsgraph, eigenes CSS. Dazu eine Layout-Bühne, auf die man die Komponenten zieht, und
  Frames, die man ziehen statt schreiben kann.
- **Plugins** — installieren, konfigurieren und sortieren, offizielle wie aus dem Marktplatz. Die
  Optionen beschreibt das Plugin selbst, mit einem Schema oder seinen `.d.ts`-Dateien; es gibt also
  keine gepflegte Liste, die veraltet.
- **Vorlagenpakete** — eine fertige Gestaltung als `.qtpl` exportieren und in ein anderes Projekt
  einspielen.
- **Vorschau und Bauen** — Dev-Server starten und stoppen, Build mit Log.
- **Veröffentlichen** — Zugänge (SFTP, FTP, GitHub, rsync, Ordner) app-weit, Ziele pro Projekt;
  dazu `quartz sync` und Git-Sync.
- **Wartung** — Snapshots als eigenes Git-Repo neben dem Projekt, Wiederherstellen einzelner
  Dateien, Update-Prüfung für Quartz und Plugins.

Mehrere Projekte nebeneinander sind vorgesehen; die App merkt sich für jedes, wo es liegt und wie
es eingerichtet ist.

## Neu in 1.1

- **Plugin-Optionen als Formular** — Abschnitte, Schalter und Auswahllisten statt einer Reihe von
  Feldern; eine Option, die nur unter einer Bedingung wirkt, erscheint erst dann. Das Formular
  beschreibt das Plugin in seinem `quartz.configSchema` (Format in
  [`docs/plugin-config-schema.md`](docs/plugin-config-schema.md)); ohne Schema liest QuartzControl
  wie bisher die `.d.ts`-Dateien. Die drei eigenen Plugins bringen es ab layout-box 0.4.0,
  multilanguage 0.2.0 und navigations 0.4.0 mit.
- **Layout auf einer Bühne** — die Seite schematisch, die Komponenten werden darauf gezogen, ihre
  Optionen stehen in der Seitenleiste daneben. Der Seitentyp wird auf der Bühne gewählt, mit eigenem
  Frame und Ausschlüssen; die Breiten der Breakpoints stehen jetzt im Reiter „Frames“. Wer die
  letzte Instanz einer Komponente in den Vorrat zieht, schaltet ihr Plugin aus.
- **Dateien für die Layout-Box** — HTML- und Markdown-Schnipsel anlegen, hinzufügen, bearbeiten und
  umbenennen, Bilder nach `quartz/static/images` hinzufügen; Boxen, die eine umbenannte Datei
  nennen, werden nachgezogen.
- **`custom.scss` gehört wieder dir** — Ladereihenfolge, Schriften und Variablen der Stile-Seite
  stehen in einer eigenen Datei, `quartz/styles/_quartzcontrol.scss`. Neue Projekte beginnen so,
  bestehende stellt „Jetzt umstellen“ auf der Stile-Seite um, mit einem Snapshot davor.
- **Ein schlankeres Basis-Template** — zwölf Stylesheets statt 31.

Wer ein Projekt auf mehreren Rechnern bearbeitet, aktualisiert zuerst alle Rechner auf 1.1 und
stellt die Stile erst danach um; was 1.0 an einem umgestellten Projekt nicht mehr versteht, steht in
den Notizen der [Release-Seite](https://github.com/boxi-os/QuartzControl/releases).

## Was mitreist

Damit ein erster Start nichts voraussetzt, liefert die App aus:

| | |
| --- | --- |
| **Node und npm** | Electrons eigene Node-Laufzeit über drei Shims im PATH — es muss also kein Node installiert sein |
| **git** | nur benutzt, wenn auf dem Rechner keines antwortet; sonst gewinnt das des Systems |
| **Das Basis-Template** | als Reserve, falls beim Anlegen eines Projekts kein Netz da ist |

## Installation

**1.2.0** ist da und liegt unter
[Releases](https://github.com/boxi-os/QuartzControl/releases): DMG und zip für macOS (arm64 und
x64), AppImage und deb für Linux (arm64 und x86_64) und ein Flatpak für x86_64 und aarch64. Jede
Datei nennt ihre Architektur, zwei Downloads sehen also nie gleich aus. Selbst bauen geht
weiterhin — siehe [Selbst bauen](#selbst-bauen).

Die zwei Hinweise darunter gelten für die fertigen Pakete wie für einen eigenen Bau.

**macOS:** Die App ist nur ad-hoc signiert und nicht notarisiert — es gibt kein
Developer-ID-Zertifikat. Beim ersten Start verweigert macOS sie deshalb. Freigeben lässt sie sich
unter **Systemeinstellungen → Datenschutz & Sicherheit → Sicherheit → „Dennoch öffnen“**, und zwar
bis etwa eine Stunde nach dem abgewiesenen Startversuch. Das Kontextmenü (Rechtsklick → Öffnen) ist
seit macOS 15 kein Weg mehr. Oder im Terminal:

```
xattr -dr com.apple.quarantine /Applications/QuartzControl.app
```

Meldet macOS, die App **„ist beschädigt“**, ist es 1.0.0-beta.1: Deren Signatur war defekt, und für
diese Fassung hilft nur der Terminal-Befehl oben.

**Linux:** AppImage ausführbar machen und starten, oder das deb installieren. Der Flatpak braucht
`--filesystem`-Zugriff auf den Ort, an dem die Projekte liegen, falls das nicht das Home ist.

Gebraucht wird **glibc 2.34 oder neuer** — Ubuntu 22.04, Debian 12, RHEL 9, Fedora 35 und alles
danach. Die Zahl kommt nicht von Electron, dem 2.25 genügt, sondern vom mitgelieferten git. Auf
einem älteren System startet die App, sagt aber, dass sie ihr git dort nicht benutzen kann; wer
`git` über die Paketverwaltung installiert, kommt damit weiter, denn die App bevorzugt ohnehin das
des Rechners. Der Flatpak stellt die Frage nicht: sein git wird in der Sandbox gebaut.

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
nützlich wie ich. Im Zuge von QuartzControl sind außerdem vier Plugins entstanden:
[quartz-layout-box](https://github.com/boxi-os/quartz-layout-box),
[quartz-multilanguage](https://github.com/boxi-os/quartz-multilanguage),
[quartz-navigations](https://github.com/boxi-os/quartz-navigations) und
[quartz-forms](https://github.com/boxi-os/quartz-forms), die ich euch ebenfalls
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
- **[quartz-navigations](https://github.com/boxi-os/quartz-navigations)** — Quartz-Plugin,
  Navigationen aus der Ordnerstruktur des Contents: Menüleiste, Akkordeon, Sitemap, Blättern
- **[quartz-forms](https://github.com/boxi-os/quartz-forms)** — Quartz-Plugin, Formulare für eine
  statische Website: im Browser geprüft, auf Wunsch mit OpenPGP verschlüsselt, zugestellt über ein
  PHP-Skript auf dem eigenen Webspace oder einen Formular-Dienst
- **[quartzcontrol-templates](https://github.com/boxi-os/quartzcontrol-templates)** —
  Vorlagenpakete, die die App beim Anlegen eines Projekts holt

Alle vier Plugins funktionieren unabhängig von QuartzControl in jedem Quartz-5-Projekt.

## Lizenz

[GPL-3.0-or-later](LICENSE). Die mitgelieferten fremden Programme behalten ihre eigenen Lizenzen —
git (GPLv2), Electron (MIT, mit Chromium und Node.js) und npm (Artistic-2.0); die Texte liegen in
[`resources/licenses/`](resources/licenses/) und sind in der App unter *Hilfe → Lizenzen öffnen*
erreichbar.

QuartzControl ist ein eigenständiges Werkzeug und weder Teil von Quartz noch mit dem Quartz-Projekt
verbunden.
