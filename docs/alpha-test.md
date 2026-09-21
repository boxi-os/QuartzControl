# Alpha-Test

Die Szenen, die nur ein Mensch fahren kann — an der **gepackten oder gebauten App**, an **Projekten
aus der Beispielvorlage**, und **mit einer gebauten Website am Ende jeder Szene**.

## Warum es ihn gibt

Die Review-Serie hat vierunddreißig Listen gelesen. Die Befunde, auf die es zuletzt ankam, kamen
aber nicht aus dem Lesen der Commits, sondern daraus, die Funktion auf Wegen zu benutzen, die ihr
Autor nicht gegangen ist — und drei der vier mittleren Befunde des dreiunddreißigsten Reviews waren
**in der App unsichtbar und erst im Browser zu sehen**.
Beide Fixes, die das vierunddreißigste Review nicht halten sah, brechen auf Wegen, die dieser Test
von selbst geht: niemand wartet eine halbe Sekunde vor Cmd+S, und wer nicht lateinisch schreibt,
wählt als Erstes eine Schrift, die es kann.

Deshalb empfehlen zwei Reviews in Folge diesen Test **statt** einer Runde 35. Die Vorgaben stehen in
[`REVIEW-2026-10-07.md`](REVIEW-2026-10-07.md) (letzter Abschnitt) und die Szenenliste in
[`REVIEW-2026-10-08.md`](REVIEW-2026-10-08.md) (ebenda).

Das ist **nicht** der Alpha-Test von 2026-08-30 (Checkliste T1–T6, Plattformen und Hosting). Der ist
durch; er steht im Gedächtnis unter `project_v1_review_plan`. Dieser hier hat einen anderen
Zuschnitt: die Schicht, die seit dem 2026-09-18 dazugekommen ist — Schriften, Speichern über vier
Reiter, Abbruch eines Kern-Updates.

## Vorher

- **Gebaut, nicht `npm run dev`.** `npm run build && npm run start`, oder eine gepackte App. Der
  Dev-Server der App baut parallel in dasselbe `public/` und macht jede Aussage über die Website
  wertlos.
- **Eigene Projekte in Ruhe lassen.** Jede Szene legt sich ihr Projekt selbst an (Schritt 1), und
  zwar unter einem Namen, der nicht schon da ist. „Jetzt bauen“ leert `public/` des Projekts, auf
  dem es läuft.
- **Die Website ansehen heißt: im Browser.** Entweder nach „Jetzt bauen“ die Dateien in `public/`
  öffnen, oder den Dev-Server starten und „Im Browser öffnen“. Nicht die Vorschau in der App.
- **Befunde mitschreiben**, mit dem, was zu sehen war — nicht mit dem, was gemeint war. Ein
  Screenshot ist besser als ein Satz.

### Ein Projekt aus der Beispielvorlage anlegen

Startseite → „Neues Projekt erstellen“, dann im Assistenten:

- Übergeordneter Ordner: `~/Documents/QuartzProjekte`
- Name: der aus der Szene
- Quartz-Vorlage: `default`, Strategie „Neu anfangen (leerer Content-Ordner)“
- **„Beispielvorlage mitinstallieren“ an**, **„Mit den Beispielseiten“ an**

Das sind rund 270 Seiten, die die Vorlage selbst erklären — genug Inhalt, dass ein Bau etwas zu tun
hat und eine falsche Schrift auffällt.

---

## A — Schriften

### A1. Eine CJK-Familie, lokal ausgeliefert

*Der Weg, auf dem `f9f6029` eine Sperre war: Google benennt jede Scheibe einer japanischen,
koreanischen oder chinesischen Familie `<hash>.<n>.woff2`.*

1. Projekt `alpha-cjk` aus der Beispielvorlage anlegen.
2. Stile → Basis. Font-Quelle auf **Google Fonts**, „Schriften lokal ausliefern“ **an**.
3. **Schriftart (body)** auf `Noto Sans JP`. Speichern.
4. Erwartet: **kein** Fehlersatz. Die Notiz unter dem Kopf nennt, was entfernt wurde. Im Projekt
   liegen rund 124 Dateien unter `quartz/static/fonts/`.
5. Zusätzlich **Schriftart (header)** auf `Noto Serif JP`, **code** auf `M PLUS 1p`,
   **title** (falls gesetzt) auf `Zen Kaku Gothic New`. Speichern.
   Erwartet: rund 495 Dateien, rund 14 MB, weiterhin kein Fehler.
6. Vorschau & Build → **„Jetzt bauen“**.
7. **Website im Browser:** Ein japanischer Text muss in der gewählten Schrift stehen, nicht in der
   Ersatzschrift. In den Entwicklerwerkzeugen darf **keine** Anfrage an `fonts.gstatic.com` oder
   `fonts.googleapis.com` gehen.

Nebenfrage, die nur hier auffällt: Wie lange dauert das Speichern bei 495 Dateien, und sagt die App
währenddessen etwas?

### A2. Eine importierte Schrift in einem Slot, bei Font-Quelle Google

*Die Mischung, die die App ausdrücklich anbietet — und die bis `6d6f53a` eine Warnung bekam.*

1. Projekt `alpha-mix` anlegen.
2. Stile → Basis → **„Eigene Schriftart importieren“ → „Datei auswählen…“**, eine `.woff2` oder
   `.ttf` wählen, Font-Familienname z. B. `Meine Schrift`, **„Direkt verwenden für“ auf `header`**.
   Importieren.
3. Font-Quelle bleibt **Google Fonts**, „lokal ausliefern“ an. `body` auf irgendeine Google-Familie.
   Speichern.
4. Erwartet: **keine** Warnung „Google kennt diese Schrift nicht … prüfe die Schreibweise“ über
   `Meine Schrift`. Unter dem Feld ebenfalls kein Hinweis „Keine im Projekt deklarierte Schrift mit
   diesem Namen“.
5. Bauen. **Website:** Überschriften in der importierten Schrift, Fließtext in der Google-Familie.

### A3. „Selbst mitgebracht“ mit einer Systemschrift

*Der Zustand ist richtig erkannt, der Satz war zu sicher.*

1. Projekt `alpha-system` anlegen.
2. Stile → Basis → Font-Quelle **„Selbst mitgebracht“**.
3. **Schriftart (body)** auf `Georgia`. Speichern.
4. Erwartet: Der Hinweis sagt, dass Besucher die Schrift sehen, **wenn sie auf ihrem Rechner
   installiert ist** — nicht, dass die Website eine Ersatzschrift zeigt.
5. Bauen. **Website:** Georgia (auf diesem Rechner installiert), und keine Schriftanfrage ins Netz.

### A4. Ein `custom/`-Ordner, der ein Symlink ist

*Stile zwischen Projekten teilen — in einer App, die den Content-Ordner selbst als Link anbietet,
kein abwegiger Nutzer.*

1. Projekt `alpha-symlink` anlegen. Stile → Basis → „Eigene Schriftart importieren“, Familienname
   `Meine Schrift`, **„Direkt verwenden für“ auf „— keins —“** (nur dann zählt sie später als
   ungenutzt). Speichern.
2. App schließen. Im Terminal `quartz/styles/custom/` an einen anderen Ort verschieben und durch
   einen Symlink dorthin ersetzen. In einer `.scss`-Datei darin eine **eigene** Regel anlegen, die
   **dieselbe Datei** nennt, unter anderem Familiennamen:

       @font-face { font-family: "Eigen"; src: url("../static/fonts/<datei>.woff2") format("woff2"); }

3. App starten, Stile → Basis → Karte **„Ungenutzte Schriften“** → bei `Meine Schrift`
   **„Entfernen“**, bestätigen.
4. Erwartet: Die Regel verschwindet aus `custom.scss`, die **Datei unter `quartz/static/fonts/`
   bleibt liegen** — die eigene Regel hinter dem Symlink nennt sie noch.
5. **Die Zahl im Bestätigungsdialog** muss stimmen. Sie hat es bis `2026-09-20` nicht getan:
   `unusedImportedFonts` zählte, wie viele Dateien die *Regeln dieser Familie* nennen, je Regel
   nur die **erste** `url()` — während `deleteUnreferencedFontFiles` beim Löschen alle `url()` und
   alle Stylesheets fragt. An der gebauten App gemessen, vorher und nachher, Dialog im
   Hauptprozess gespiegelt:

   | Szene                                    | vorher | jetzt | wirklich weg |
   |------------------------------------------|--------|-------|--------------|
   | nichts schützt die Datei *(Kontrolle)*   | 1      | 1     | 1            |
   | eine eigene Regel nennt dieselbe Datei   | 1      | **0** | 0            |
   | die Regel nennt drei Dateien             | 1      | **3** | 3            |

   Beim Entfernen hier muss der Dialog also sagen, dass **keine** Datei gelöscht wird — ein eigener
   Satz, nicht „0 Datei(en)“.
6. Bauen. **Website:** Die Datei ist in `public/static/fonts/` und wird ausgeliefert.

Dieselbe Frage lohnt mit `quartz/styles/custom.scss` als Symlink, und mit einer einzelnen Datei
unter `custom/` als Symlink. Und eine Variante, die dasselbe von der anderen Seite prüft:
dieselben Schritte mit der Regel in `quartz/styles/meine.scss` statt hinter dem Link — auch dort
muss die Datei bleiben.

---

## B — Speichern

### B1. Tippen und sofort Cmd+S, mit etwas Zweitem ungespeichert

*Die Szene, an der `479af74` durchfiel. **Am echten Tastendruck** — die bisherigen Messungen haben
Cmd+S aus dem Hauptprozess gesendet und den Dateidialog gespiegelt.*

1. Projekt `alpha-save` anlegen.
2. Stile → Basis: **eine Farbe ändern** (nicht speichern).
3. Stile → Eigenes CSS: eine **zusätzliche Datei** öffnen (nicht `custom.scss`), oben
   `/* ENTWURF */` tippen.
4. **Ohne Pause** Cmd+S drücken — aus der Tippbewegung heraus, nicht nach dem Nachdenken.
5. Zwei Sekunden warten und **hinsehen**: Steht im Editor noch `/* ENTWURF */`?
6. Weitertippen (`/* ZWEI */`), speichern, und die Datei auf der Platte ansehen: Stehen **beide**
   Kommentare darin?
7. Dasselbe noch einmal mit dem Speichern-Knopf statt Cmd+S, und einmal mit `custom.scss` als
   zweiter ungespeicherter Sache statt der Farbe.

Fällt einer dieser Wege durch, ist es derselbe Datenverlust wie in Runde 33 und 34: gespeicherter
Text geht beim nächsten Speichern verloren, ohne Badge und ohne Satz.

### B2. Die Verweigerung bei 1280 px lesen

*Der Satz, der bis `490175a` am Fensterrand abgeschnitten war.*

1. Fenster auf **1280 × 800** (schmal — nicht am großen Monitor testen).
2. Projekt `alpha-refuse` anlegen.
3. Stile → Eigenes CSS: in `custom.scss` etwas tippen.
4. Stile → Basis: eine Schrift **importieren** (das schreibt `custom.scss` hinter dem Editor).
5. Auf **Basis** speichern.
6. Erwartet: Der Satz steht **unter** dem Seitenkopf, bricht um, ist **ganz** zu lesen — inklusive
   „Alles andere ist gespeichert; im Reiter ‚Eigenes CSS‘ kannst du neu laden oder bewusst
   überschreiben“. Keine horizontale Rollleiste. Der Titel daneben bleibt lesbar.
7. Über die Seitenleiste weggehen → der Dialog erscheint → **„Speichern“** wählen. Erwartet: Du
   bleibst auf der Seite, und der Satz steht noch da.
8. Auf den Reiter „Eigenes CSS“ wechseln: Das Band steht dort, der Entwurf lebt noch.

Dasselbe lohnt auf **Konfiguration** und **Layout** — sie haben seit `490175a` dasselbe Muster, und
dort ist es nicht gemessen.

---

## C — Kern-Update

### C1. Ein Abbruch auf einem Linux mit altem System-git

*Ubuntu 22.04 liefert git 2.34; `merge-tree --write-tree` gibt es erst ab 2.38. Bis `1efa1f5` sagte
**jeder** Abbruch dort einen Warnsatz.*

1. Auf einer Maschine mit **git < 2.38** (`git --version` prüfen; die App bevorzugt das System-git).
2. Ein Projekt, dessen Kern-Update einen Konflikt erzeugt — am einfachsten ein Projekt, das schon
   eine Weile steht und eigene Änderungen in `quartz/` hat.
3. Updates → Quartz-Kern → **„Update durchführen“**, bis der Konflikt stehen bleibt.
4. **Ohne irgendetwas anzufassen**: „Merge abbrechen“.
   Erwartet: kein Satz über „ließ sich mit diesem git nicht prüfen“.
5. Wiederholen, diesmal einen Konflikt **von Hand lösen** und die Datei mit `git add` vormerken,
   dann abbrechen.
   Erwartet: Der Satz kommt, und er sagt, dass der Abbruch etwas Vorgemerktes verworfen haben kann
   — nicht, dass „die Liste oben unvollständig“ sei.
6. Wiederholen, diesmal auf einer Datei des Merges etwas Eigenes vormerken **und danach weiter
   ändern**, dann abbrechen.
   Erwartet: Der Abbruch wird verweigert, der Rat nennt `git checkout --`, und daneben steht, was
   das kostet und dass `git reset -- <Datei>` es nicht tut.

Nach jedem dieser Wege: `git status` ansehen und prüfen, ob der Zustand dem entspricht, was die App
gesagt hat.

---

## D — Was danebensteht

Diese Punkte gehören **nicht** in den Alpha-Test, sind aber dieselbe Art Arbeit. Zwei davon sind
am 2026-09-20 gefahren — die Pakete und glibc, Ergebnisse in
[`GRUPPE-D-2026-09-20.md`](GRUPPE-D-2026-09-20.md); dort steht auch, was aus dieser Gruppe offen
bleibt.

- ~~**VoiceOver** über Git-Sync, das Layout-Board und den Frame-Builder~~ — am 2026-09-21 vom
  Nutzer gefahren: Git-Sync, Layout-Board und Frame-Builder sagen, was sie sollen. Ein Befund, in
  der Schriftliste der Combobox: VoiceOver nannte nur den ersten Eintrag beim Namen, danach nur
  noch „2 von 214“. Chromiums Accessibility-Baum war richtig; der Name des Felds änderte sich mit
  jedem Pfeil, weil die Liste in einem `<label>` sitzt. Behoben mit einem festen `aria-label` und
  einer Live-Region, die den Eintrag nennt und beim Tippen die Trefferzahl — und die erst einen
  Augenblick nach VoiceOvers eigener Ansage spricht, weil diese sie sonst abschnitt (`deac593` und
  der Commit danach). Vom Nutzer nachgehört: Der Name kommt jetzt.
- ~~**Die gepackte App je Plattform**~~ — gefahren: zehn Pakete gebaut, neun auf einer Maschine
  ihrer Architektur gestartet. Offen bleibt **macOS x64**, wofür es hier keine Maschine gibt.
- ~~**glibc**~~ — gemessen: die App selbst verlangt `GLIBC_2.25`, das mitgelieferte git
  `GLIBC_2.34`. Offen bleibt ein System *unter* 2.34, um die Degradation zu sehen statt sie zu
  lesen.
- ~~Die zwei offenen Punkte aus [`release.md`](release.md)~~ — beide erledigt und nachgemessen.

Ungefahren ist damit von dieser Gruppe nur noch VoiceOver — und daneben, aus Gruppe C, [C1 gegen
ein echtes System-git vor 2.38](#c1-ein-abbruch-auf-einem-linux-mit-altem-system-git): beide
Debian-VMs liefern git 2.47.3, gemessen ist der Abbruch bisher nur unter macOS mit einem aus der
Quelle gebauten 2.37.0.

## Wenn etwas gefunden wird

Ein Befund gehört hierher wie in ein Review: **die Stelle, was schiefgeht, wie es sich zeigt** — und
bei allem, was die Website betrifft, **was der Browser zeigt**, nicht was die App sagt. Was daraus
wird, trägt [`reviews.md`](reviews.md) nach; was als Regel bleibt, [`conventions.md`](conventions.md);
was gemessen wurde, `decisions/`.

## Durchgänge

- **2026-09-20, erster Durchgang:** A1–A4, B1–B2 und C1 gefahren, Ergebnisse in
  [`ALPHA-2026-09-20.md`](ALPHA-2026-09-20.md). Zwei Befunde — der Abbruch unter altem git warnt
  weiter, wo er nicht müsste (`1efa1f5` deckt nur die Hälfte der Fälle), und die *veröffentlichte*
  Beispielvorlage macht die Schriftauswahl auf der Website wirkungslos (`d4da5ef`, `release.md`
  Punkt 4). Alles andere hält, B2 einschließlich des Nachsatzes auf Konfiguration und Layout.
- **2026-09-20, Gruppe D:** die Pakete und glibc, Ergebnisse in
  [`GRUPPE-D-2026-09-20.md`](GRUPPE-D-2026-09-20.md). Zwei Befunde — die Version des
  mitgelieferten git trug auf Linux einen Punkt zu viel (`19ecf30`), und `release.md` Punkt 4
  nannte offen, was derselbe Commit getan hatte (`469059a`). Die Pakete selbst halten.
