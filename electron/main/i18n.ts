import { app } from 'electron'
import { getSettings } from './services/settingsService'

// Small, hand-rolled dictionary instead of i18next: the main process has no DOM/navigator, and
// nothing here needs plurals, contexts or namespaces - just a key, two languages and a few
// {{placeholders}}. Every string the *user* can end up reading belongs in here: the native menu,
// the native dialogs, and the messages services throw or return, which the renderer surfaces
// verbatim in an ErrorSurface toast or a result pane.
//
// Deliberately *not* in here: the zod messages in ipc/schemas.ts. An invalid IPC argument is a bug
// in this app rather than something a user typed, the message is assembled by zod at schema
// construction time (i.e. before any language is known), and no wording makes it actionable.
const STRINGS = {
  de: {
    menuFile: 'Datei',
    menuEdit: 'Bearbeiten',
    menuView: 'Ansicht',
    menuWindow: 'Fenster',
    menuHelp: 'Hilfe',
    menuSave: 'Speichern',
    menuSettings: 'Einstellungen…',
    menuHandbook: 'Handbuch',
    handbookOpenFailedTitle: 'Das Handbuch ließ sich nicht öffnen',
    handbookOpenFailedDetail: 'Der Browser ließ sich nicht öffnen: {{error}}',
    menuQuartzDocs: 'Quartz-Dokumentation',
    menuPluginCatalog: 'Plugin-Katalog',
    menuDataFolder: 'Datenordner von QuartzControl öffnen',
    menuLicenses: 'Lizenzen öffnen',
    licensesMissingTitle: 'Die Lizenztexte fehlen in dieser Installation.',
    licensesMissingDetail:
      'Sie reisen normalerweise mit der App. Eine Neuinstallation bringt sie zurück; online stehen sie unter https://github.com/boxi-os/QuartzControl.',
    menuFeedback: 'Rückmeldung senden…',
    feedbackSubject: 'Rückmeldung',
    menuAbout: 'Über QuartzControl',
    aboutDetail: 'Verwaltung für Quartz-Websites',
    aboutLicense:
      'Freie Software unter der GNU General Public License, Version 3 oder später.\nQuelltext: https://github.com/boxi-os/QuartzControl',

    orphanTitle: 'Laufende Server gefunden',
    orphanMessage: 'Von einer vorherigen Sitzung laufen noch Dev-Server im Hintergrund:',
    orphanQuit: 'Beenden',
    orphanKeepRunning: 'Weiterlaufen lassen',
    orphanEntry: '{{name}} — Port {{port}}',

    // Dieselben zwei Antworten wie beim Start, dieselben Worte - und `orphanEntry` beschreibt
    // dieselbe Zeile, deshalb wird sie hier wiederverwendet statt zweimal geschrieben.
    quitTitle: 'Laufende Server',
    quitMessage: 'Beim Beenden laufen noch Dev-Server.',
    quitDetail: 'Weiterlaufende Server bleiben im Browser erreichbar und werden beim nächsten Start wieder gefunden.',
    quitStopServers: 'Server beenden',
    quitDontAskAgain: 'Nicht mehr fragen',

    // Content folder
    contentSourceInsideTarget:
      'Der Quellordner liegt im Content-Ordner des Projekts ({{target}}). Dieser wird beim Wechsel zuerst beiseitegelegt — wähle einen Ordner außerhalb.',
    contentTargetInsideSource:
      'Der Content-Ordner des Projekts ({{target}}) liegt im gewählten Quellordner. Wähle einen Ordner, der ihn nicht enthält.',

    // Build output guard
    buildDirIsProject: 'Das ist der Projektordner selbst.',
    buildDirContainsProject: 'Dieser Ordner enthält das Projekt.',
    buildDirIsHome: 'Das ist dein Benutzerordner.',
    buildDirReserved: 'Dieser Ordner gehört zum Projekt und wird gebraucht.',
    buildDirRefused:
      'In „{{dir}}“ kann nicht gebaut werden: {{why}} Jeder Build löscht seinen Ausgabeordner vollständig. Bitte einen eigenen Ordner wählen, z. B. „public“ oder „dist“.',
    buildDirConfirmTitle: 'Ordner wird geleert',
    buildDirConfirmMessage: 'In „{{dir}}“ bauen?',
    buildDirConfirmDetail:
      'Darin liegen {{count}} Einträge, die nicht nach einem Quartz-Build aussehen. Jeder Build löscht seinen Ausgabeordner vollständig — das lässt sich nicht rückgängig machen.',
    buildDirConfirmCancel: 'Abbrechen',
    confirmCancel: 'Abbrechen',
    buildDirConfirmProceed: 'Ordner leeren und bauen',
    buildDirCancelled: 'Abgebrochen — es wurde nichts gelöscht und nichts gebaut.',
    buildDirBusy: 'Es läuft schon ein Build nach „{{running}}“. Nach „{{dir}}“ lässt sich bauen, sobald er fertig ist.',
    // Der Dev-Server baut bei jeder Änderung neu, ein Build leert seinen Ordner zuerst - beide
    // zugleich in denselben Ordner hinterlässt einen Stand, der von keinem der beiden ist.
    buildDirServerRunning:
      'Der Dev-Server schreibt gerade in „{{dir}}“. Beende ihn unter „Vorschau & Build“ oder wähle einen anderen Ausgabeordner.',
    serverWaitsForBuild: 'Es läuft ein Build nach „{{dir}}“. Der Server startet, sobald er fertig ist.',

    ipcInvalidArguments:
      'QuartzControl hat „{{channel}}“ mit unerwarteten Daten aufgerufen — das ist ein Fehler in der App und keine Folge deiner Eingabe. Technische Details:',
    openPathOutsideProjects: 'Dieser Pfad liegt außerhalb der registrierten Projekte und wird nicht geöffnet.',

    // Credentials
    // Sagt den Grund *und* den Weg: Ohne den zweiten Satz weiß der Nutzer, dass es nicht geht, aber
    // nicht, was er dagegen tun kann - und tun kann er etwas, das ist der ganze Grund, warum diese
    // Antwort von „verschlüsselt" getrennt gemeldet wird.
    secretStorageUnavailable:
      'Die Zugangsdaten können nicht sicher gespeichert werden, weil der Schlüsselbund des Systems nicht verfügbar ist. Unter Linux hilft ein laufender Schlüsselbund, etwa gnome-keyring oder KWallet.',

    // Core update
    updateBlockedBySymlink:
      'Der Content-Ordner ist ein Symlink, durch den git nicht schreiben kann. Wechsle unter Konfiguration → Website, Gruppe „Content-Ordner“, vorübergehend auf einen echten Ordner und versuche es erneut.\n\n',
    // Nicht „an Dateien, die das Update ebenfalls anfasst“: git verweigert einen echten Merge auch
    // über einer vorgemerkten Änderung an einer Datei, von der upstream nichts weiß (gemessen im
    // Wegwerf-Repo: „Your local changes to the following files would be overwritten by merge:
    // b.txt“, während upstream nur a.txt anfasst). Welche es sind, sagt gits Ausgabe darunter.
    updateBlockedByLocalChanges:
      'Eigene Änderungen stehen im Weg — git nennt die Dateien darunter. Committe oder verwirf sie unter Git-Sync und versuche es erneut.\n\n',
    updateMergeUnfinished:
      'Ein früheres Update steckt noch mitten in einem Merge. Brich es oben auf dieser Seite ab und starte das Update erneut.\n\n',
    updatePackagesReinstalled: 'Eigene Pakete wieder eingetragen: {{packages}}',
    // Ein voller Merkzettel, den dieser Lauf nicht abgearbeitet hat, weil seit dem letzten Lauf
    // jemand eine dieser Zeilen committet hat. Das ist richtig so - aber schweigend fiel damit
    // auch der einzige Ort weg, an dem die Namen standen.
    updatePackagesDropped:
      'Diese eigenen Pakete trägt das Update nicht wieder ein, weil package.json seit dem letzten Lauf von anderer Hand geändert wurde: {{packages}}.',
    // Dieselbe Entscheidung, anderer Grund: Der Merkzettel nennt einen Commit, den git nicht mehr
    // hat — dann ist nicht „jemand hat geantwortet“ gemessen, sondern „die App konnte nicht
    // nachsehen“. Der erste Satz erzählte dafür von einer Änderung, die niemand gemacht hat.
    updatePackagesDroppedUnreadable:
      'Diese eigenen Pakete trägt das Update nicht wieder ein: {{packages}}. Der Stand, auf den sich der Merkzettel aus dem letzten Lauf bezog, lässt sich in git nicht mehr nachlesen — trage sie bei Bedarf selbst wieder ein.',
    updatePackagesUpstreamWins: 'Quartz hat diese Pakete selbst geändert, seine Fassung gilt: {{packages}}',
    updatePackagesPending:
      'Diese eigenen Pakete stehen gerade nicht in package.json: {{packages}}. „Merge abbrechen“ oben trägt sie wieder ein, und der Wiederherstellungspunkt bringt sie ebenfalls zurück.',
    // Zwei Sätze für zwei Lagen: oben steckt der Merge noch fest, hier ist er durch und npm
    // gescheitert - „abbrechen und erneut" hilft dann nicht, „Fehler beheben und erneut" schon.
    updatePackagesMissing:
      'Diese eigenen Pakete stehen nicht mehr in package.json: {{packages}}. Behebe den Fehler oben und starte das Update erneut, oder nimm den Wiederherstellungspunkt — mit dem Schalter „Auch den Projekt-Commit zurücksetzen“.',
    // Ein Stash, den ein früherer Lauf zurückgelegt und nie wieder eingetragen hat. Er gehört zu
    // einem anderen Stand, also fasst ihn niemand mehr an - gesagt wird er trotzdem, weil sonst
    // nichts in dieser App Stashes zeigt. Mit seinem Namen, weil beide Befehle ohne Argument den
    // obersten Eintrag meinen und der dem Nutzer gehört, sobald er selbst einen zurückgelegt hat.
    updateStashLeftover:
      'Aus einem früheren Update liegt in git noch ein zurückgelegter Stand mit eigenen Paketeinträgen ({{entry}} in „git stash list“). Er gehört zu einem Stand, den es nicht mehr gibt: „git stash show -p {{entry}}“ zeigt ihn an, „git stash drop {{entry}}“ verwirft ihn.',
    // Derselbe Stand, nur gehört er zu genau diesem Update - dann ist der Knopf auf der Seite der
    // Weg, und ein geratenes „git stash pop“ wäre die schlechtere Hälfte desselben Vorgangs.
    updateStashMine:
      'Aus einem früheren Update liegt in git noch ein zurückgelegter Stand mit eigenen Paketeinträgen („git stash list“). „Merge abbrechen“ trägt ihn wieder ein.',
    // Derselbe Stand, und der Knopf ist auch hier der Weg - nur steht eine eigene, nicht
    // vorgemerkte Änderung davor, an der git den Abbruch verweigert. Gesagt, bevor der Nutzer drückt,
    // statt danach - und ohne eigenen Rat: Ob die Datei aus dem Merge stammt („git checkout --“)
    // oder selbst vorgemerkt ist („git reset --“), sagt der Knopf je Datei (zweiunddreißigstes
    // Review, Befund 2); hier stand der eine Rat für beide.
    updateStashMineBlocked:
      'Aus einem früheren Update liegt in git noch ein zurückgelegter Stand mit eigenen Paketeinträgen („git stash list“). „Merge abbrechen“ trägt ihn wieder ein, sobald git den Abbruch zulässt; woran es gerade scheitert und was zu tun ist, sagt der Knopf selbst.',
    // Derselbe Stand, der Knopf bricht auch ab - aber eine Datei, die er hält, steht ungestaget
    // geändert da, und daran scheitert das Eintragen. Nicht „gehört zu einem Stand, den es nicht mehr
    // gibt“: er passt auf HEAD und hält die eigenen Pakete (zweiunddreißigstes Review, nebenbei).
    updateStashMineOccupied:
      'Aus einem früheren Update liegt in git noch ein zurückgelegter Stand mit eigenen Paketeinträgen ({{entry}} in „git stash list“). „Merge abbrechen“ kann ihn nicht wieder eintragen, solange diese Dateien geändert sind: {{files}}. Sichere deine Änderung daran und verwirf sie (im Terminal: „git checkout -- <Datei>“), dann trägt der Knopf ihn ein.',
    // Drei Arten, wie quartz.config.yaml unlesbar ist, drei Sätze. Gesagt wird jede, statt die
    // Datei als halb leer zu lesen und dem Nutzer eine leere Seite ohne Begründung zu zeigen; die
    // Datei selbst ist dabei nie in Gefahr, das Speichern scheitert an ihr ebenfalls.
    configNotAMapping:
      'In quartz.config.yaml steht keine Zuordnung aus Schlüsseln und Werten. Die App liest die Datei deshalb nicht; repariere sie in einem Editor oder nimm einen Wiederherstellungspunkt.',
    // Nennt keinen Knopf: Der Satz wird an zwei Stellen gelesen, und der Knopf heißt dort
    // verschieden („Erneut prüfen“ auf Updates, „Aktualisieren“ auf Git-Sync) — auf Updates ist er
    // während des Laufs obendrein deaktiviert (fünfundzwanzigstes Review, Befund 1 und
    // „nebenbei“ 4).
    updateAlreadyRunning:
      'Für dieses Projekt läuft gerade ein Kern-Update. Warte, bis es durch ist, und sieh dann noch einmal nach — die Ausgabe des Laufs sieht nur, wer die Updates-Seite so lange offen lässt.',
    // Der häufigste Fall: ein nicht geschlossenes Anführungszeichen, ein Tab als Einrückung. yamls
    // eigene Meldung nennt Zeile und Spalte und bleibt deshalb englisch, wie die übrigen
    // Werkzeugmeldungen auch.
    configNotParseable:
      'quartz.config.yaml lässt sich nicht als YAML lesen: {{reason}}. Repariere sie in einem Editor oder nimm einen Wiederherstellungspunkt.',
    configMissing:
      'quartz.config.yaml liegt nicht im Projektordner. Ein neu erstelltes Projekt braucht dafür einen erfolgreich durchgelaufenen Setup-Assistenten.',
    // Die Zeile, die über der Ignore-Regel in der .gitignore des Nutzers steht.
    gitignoreComment: 'Arbeitsverzeichnis von QuartzControl (Backups, Presets, Deploy-Manifest)',
    // Beim Duplizieren ist die unlesbare Datei die des *Originals*, und der Satz darüber sagt das
    // nicht von selbst - er steht sonst immer über dem Projekt, das gerade offen ist.
    duplicateSourceConfigUnreadable:
      'Das Projekt „{{path}}“ lässt sich nicht duplizieren, weil seine Konfiguration nicht lesbar ist. {{reason}}',
    configPluginsNotAList:
      'In quartz.config.yaml ist „plugins“ keine Liste. Die App liest die Datei deshalb nicht; repariere sie in einem Editor oder nimm einen Wiederherstellungspunkt.',
    // Derselbe Stand, und er passt noch - nur ist kein Merge mehr offen, an dem der Knopf hinge.
    // Was die App nicht mehr tun kann, tut „git stash pop“; deshalb steht hier kein „drop“.
    updateStashFitsHead:
      'Aus einem früheren Update liegt in git noch ein zurückgelegter Stand mit eigenen Paketeinträgen ({{entry}} in „git stash list“). Er passt auf den jetzigen Stand, wird aber von dieser App nicht mehr eingetragen: „git stash show -p {{entry}}“ zeigt ihn an, „git stash pop {{entry}}“ trägt ihn ein.',
    // Derselbe ältere Stand, aber unmittelbar nachdem der Abbruch den neueren eingetragen hat. Dann
    // stimmt „git stash pop trägt ihn ein“ nicht, wenn beide Einträge dieselbe Datei halten: die
    // steht gerade wieder geändert da, und git verweigert den Pop mit
    // „Your local changes … would be overwritten“ (einunddreißigstes Review, Befund 2, gemessen mit
    // einem Eintrag, wie die App ihn schreibt - die Szene davor hielt README.md). Der Satz steht
    // seit der dreißigsten Runde vorn, also sagt er zuerst, dass er von einem *anderen* Eintrag
    // spricht als der Satz am Ende („… sind wieder eingetragen“). Halten die zwei Einträge
    // verschiedene Dateien, geht der Pop durch, und es gilt der Satz darüber (zweiunddreißigstes
    // Review, Befund 5).
    updateStashUnderRestored:
      'Außer dem Stand, den dieser Abbruch wieder einträgt, liegt in git noch ein älterer mit eigenen Paketeinträgen ({{entry}} in „git stash list“). „git stash pop“ nimmt git für ihn jetzt nicht an, weil dieselben Dateien gerade wieder geändert sind: „git stash show -p {{entry}}“ zeigt ihn an — übertrage von Hand, was dir daraus fehlt, und verwirf ihn dann mit „git stash drop {{entry}}“.',
    // Mit seinem Namen wie die zwei Sätze darüber - ohne ihn blieb „git stash list“ eine Liste,
    // in der der Nutzer den Eintrag selbst suchen musste (sechsundzwanzigstes Review, nebenbei 2).
    // Kein „pop“: genau der ist gerade gescheitert.
    // Der Abbruch hat die Paketeinträge wieder eingetragen, die der Lauf zurückgelegt hatte. Ein
    // eigener Satz, weil git darauf mit einem ganzen „git status“ antwortet und dessen erste Zeile
    // sonst die Ansage war (achtundzwanzigstes Review, Befund 1).
    updateStashRestored: 'Das Update ist abgebrochen, und die zurückgelegten Paketeinträge sind wieder eingetragen.',
    updateStashPopFailed:
      'Die zurückgelegten Paketeinträge ließen sich nicht wieder eintragen und bleiben in git liegen ({{entry}} in „git stash list“): „git stash show -p {{entry}}“ zeigt sie an.',
    // Der Abbruch kann nur zurücknehmen, was seit dem Steckenbleiben unverändert ist. git nennt
    // die Datei, nicht aber den einen Weg weiter. Der Weg steht im Satz selbst, weil keine der zwei
    // Seiten, auf denen er gelesen wird, eine Änderung verwerfen kann - „unter Git-Sync“ schickte
    // den Leser auf die Seite, auf der er stand (sechsundzwanzigstes Review, Befund 6).
    updateAbortBlockedByEdit:
      'Eine Datei aus dem Merge wurde inzwischen geändert, deshalb lässt sich das Update nicht abbrechen. Verwirf, was du seit dem Merge an ihr geändert hast (im Terminal: „git checkout -- <Datei>“), und brich dann erneut ab.\n\n',
    // Dasselbe, wenn git die Datei nennt: Die Ansage sagt nur die Sätze, nie gits Text, und „die
    // unten genannte Datei“ verwies dort auf etwas, das niemand sagt (dreißigstes Review, Befund 4).
    // Der Satz darüber ist der Rückfall, wenn git keinen Namen liefert, und verspricht deshalb
    // auch keinen.
    // Für eine wie für mehrere Dateien geschrieben: git nennt nur die erste, die App fragt die
    // übrigen selbst (einunddreißigstes Review, Befund 3).
    updateAbortBlockedByEditNamed:
      'An Dateien aus dem Merge wurde inzwischen weitergearbeitet, deshalb lässt sich das Update nicht abbrechen: {{files}}. Verwirf, was du dort seitdem geändert hast (im Terminal je Datei: „git checkout -- <Datei>“), und brich dann erneut ab.\n\n',
    // Die dritte Verweigerung: eine Datei, die HEAD kennt, ist aus der Vormerkung genommen
    // („git rm --cached“) und liegt noch im Ordner. „git checkout --“ hilft dort nicht, wieder
    // vormerken schon (zweiunddreißigstes Review, nebenbei 6).
    updateAbortBlockedByUntracked:
      'Diese Dateien sind nicht mehr vorgemerkt, liegen aber noch im Projektordner, deshalb lässt sich das Update nicht abbrechen: {{files}}. Merke sie wieder vor (im Terminal je Datei: „git add -- <Datei>“) und brich dann erneut ab.\n\n',
    // Dieselbe Verweigerung über Dateien, die der Nutzer selbst vorgemerkt hat. Für sie ist der Rat
    // oben teuer: „git checkout --“ nimmt die ungestagete Hälfte, der Abbruch danach die gestagete.
    // „git reset --“ nimmt nur die Vormerkung, beide Hälften bleiben (zweiunddreißigstes Review,
    // Befund 2).
    updateAbortBlockedByOwnStaged:
      'Diese Dateien hast du selbst vorgemerkt und danach weiter geändert, deshalb lässt sich das Update nicht abbrechen: {{files}}. Nimm dort nur die Vormerkung zurück (im Terminal je Datei: „git reset -- <Datei>“), deine Änderungen bleiben dabei erhalten, und brich dann erneut ab.\n\n',
    // Was der Abbruch nebenbei mitnimmt. git sagt darüber nichts, und rückgängig ist es nicht -
    // genannt wird es trotzdem, damit der Nutzer weiß, was fehlt.
    updateAbortDroppedStaged:
      'Der Abbruch hat den vorgemerkten Stand dieser Dateien verworfen: {{files}}. git setzt beim Abbrechen alles zurück, was vorgemerkt war — auch, was du selbst dazu vorgemerkt hast, und von Hand gelöste Konflikte.',
    // Die Notiz, mit der sich ein Lauf beim nächsten meldet, ließ sich nicht schreiben. Sie ist ein
    // Zeiger und kein Ergebnis, also läuft das Update weiter - gesagt wird es trotzdem, weil der
    // nächste Lauf sich danach anders verhält, als er sollte.
    updateNoteUnwritable:
      'Die Notiz zu diesem Update ließ sich nicht schreiben ({{reason}}). Das Update lief trotzdem zu Ende; der nächste Lauf kann deshalb noch einmal installieren oder „nichts zu tun“ melden.',
    npmInstallFailed: 'npm install ist fehlgeschlagen:',
    warmupBuild: 'Aufwärm-Build:',
    serverLogUnavailable:
      'Die Ausgabe des Servers lässt sich nicht mitschreiben ({{reason}}). Der Server läuft, diese Konsole bleibt für diesen Lauf leer.',

    // Project creation
    createTargetExists:
      'In „{{path}}“ liegen bereits Dateien. Wähle einen anderen Namen oder einen anderen Ordner — ein vorhandener Ordner wird nicht überschrieben.',
    createCloneFailed: 'Quartz konnte nicht von GitHub geladen werden:',
    templateContentTooLarge:
      'Der Inhalt dieses Projekts ist größer als {{limit}} MB. Eine Vorlage ist eine Gestaltung, keine Sicherung — nimm den Baustein „Inhalt“ heraus.',
    templateStaticTooLarge:
      'Die Dateien unter quartz/static sind zusammen größer als {{limit}} MB. Eine Vorlage trägt Schnipsel, Logos und Bilder mit — keine Mediathek; nimm den Baustein „Statische Dateien“ heraus.',
    duplicateSourceNotAProject:
      'In „{{path}}“ liegt keine quartz.config.yaml — das ist kein Quartz-Projekt.',
    duplicateNested:
      'Das Duplikat darf nicht im Originalprojekt liegen und das Original nicht im Duplikat. Wähle einen Ordner daneben.',
    duplicateBlankContent:
      'Dieses Projekt ist eine Kopie und hat noch keinen Inhalt. Unter „Konfiguration → Website“, Gruppe „Content-Ordner“, kannst du einen Ordner oder einen Obsidian-Vault verknüpfen.',
    createInstallFailed: 'npm install ist fehlgeschlagen:',
    createNoConfig:
      '\n\nDer Setup-Assistent hat quartz.config.yaml nicht geschrieben (vermutlich fehlt eine Antwort auf eine interaktive Rückfrage oben).',

    // GitHub
    githubOriginExists:
      'Dieses Projekt hat bereits ein „origin“-Remote ({{remote}}). Es wird nicht überschrieben — bitte zuerst manuell entfernen, wenn das gewollt ist.',
    githubPagesCreated: 'GitHub Pages eingerichtet, Quelle: {{branch}} (/)',
    githubPagesSourceSet: 'Quelle gesetzt: {{branch}} (/)',
    githubDomainSet: 'Domain gesetzt: {{domain}}',
    githubDomainCleared: 'Eigene Domain entfernt.',
    githubHttpsPending:
      'HTTPS konnte noch nicht erzwungen werden — GitHub stellt das Zertifikat für eine eigene Domain erst einige Minuten nach dem Setzen aus. Später erneut versuchen.',

    // Frames
    frameIdInvalid: 'Ungültige Frame-ID „{{id}}“ — erlaubt sind nur Buchstaben, Ziffern und Bindestriche.',
    frameShapeInvalid: 'Der Frame ist nicht lesbar: {{detail}}',
    frameIssueType: 'Das Feld „{{where}}“ fehlt oder hat den falschen Typ.',
    frameIssueTooBig: 'Der Wert bei „{{where}}“ ist zu groß oder zu lang (Höchstwert {{limit}}).',
    frameIssueTooSmall: 'Der Wert bei „{{where}}“ ist zu klein oder zu kurz (Mindestwert {{limit}}).',
    frameIssueValue: 'Der Wert bei „{{where}}“ ist keine der erlaubten Angaben ({{values}}).',
    frameIssueFormat: 'Der Wert bei „{{where}}“ hat eine Form, die hier nicht erlaubt ist.',
    frameIssueKey: 'Der Schlüssel bei „{{where}}“ ist hier nicht erlaubt.',
    frameNameAndReason: '„{{name}}“ — {{reason}}',
    frameGroupsUnreadable:
      'Die Gruppen des Layouts konnten nicht gelesen werden ({{error}}). Die Frames zeigen ihre Positionen für diesen Lauf ungeteilt.',
    frameRefreshFailed:
      'Die Frames konnten vor diesem Lauf nicht aufgefrischt werden ({{error}}). Gebaut wird mit dem Stand, der auf der Platte liegt.',
    frameAreaNameDuplicate:
      'Zwei Bereiche heißen „{{name}}“. Ein Bereichsname darf nur einmal vorkommen — sonst verliert das Frame sein ganzes Raster.',
    frameAreaGroupDuplicate:
      'Zwei Bereiche derselben Belegung halten die Gruppe „{{name}}“. Beide zeigten dieselben Komponenten, also doppelt auf jeder Seite.',

    // Commands
    commandTimeout: 'Zeitüberschreitung nach {{ms}} ms: {{command}}',

    // Template packages
    zipEntryTooLarge: 'Die Datei „{{name}}“ ist zu groß für ein Paket (über 4 GB).',
    zipBadDirectory: 'Das Paket ist beschädigt (Verzeichniseintrag ungültig).',
    zipBadHeader: 'Das Paket ist beschädigt (Dateikopf ungültig).',
    zipUnsupportedMethod: 'Das Paket verwendet ein nicht unterstütztes Kompressionsverfahren ({{method}}).',
    zipEntryCorrupt: 'Die Datei „{{name}}“ im Paket ist beschädigt.',
    zipEntryUnsafeName: 'Die Datei „{{name}}“ im Paket würde außerhalb des Projekts geschrieben werden.',
    zipTooLarge: 'Das Paket entpackt sich auf mehr als {{limit}} MB und wird nicht gelesen.',

    // Publishing
    ftpWrongTarget: 'Falscher Zieltyp für den FTP-Adapter.',
    ftpNoConnection: 'Für dieses Ziel ist kein FTP-Zugang hinterlegt.',
    hostKeyChanged:
      'Der Host-Key von {{host}} hat sich geändert!\n\nerwartet:  {{expected}}\nempfangen: {{received}}\n\nDie Verbindung wurde abgebrochen. Das kann ein neu aufgesetzter Server sein — oder ein Angriff. Prüfe den Fingerprint beim Anbieter und setze ihn erst danach über „Host-Key vergessen“ zurück.',
    hostKeyUnknownTitle: 'Unbekannter Server',
    hostKeyUnknownMessage: '{{host}} ist zum ersten Mal kontaktiert worden.',
    hostKeyUnknownDetail:
      'Fingerprint des Servers:\n{{fingerprint}}\n\nVergleiche ihn mit dem, den dein Anbieter angibt (oder mit `ssh-keyscan -t rsa,ed25519 {{host}} | ssh-keygen -lf -`). Nur bei Übereinstimmung verbinden.',
    hostKeyCancel: 'Abbrechen',
    hostKeyAccept: 'Verbinden und merken',
    hostKeyRejected: 'Verbindung abgebrochen — der Host-Key wurde nicht bestätigt.',
    contentSourceMissing: 'Den Quellordner gibt es nicht: {{path}}',
    indexPageExists: 'Im Content-Ordner liegt schon eine index.md. Sie bleibt, wie sie ist.',
    indexPageNoContent: 'Es gibt keinen erreichbaren Content-Ordner, in den die Startseite gelegt werden könnte.',
    indexPageGlobbyBroken:
      'Die Dateisuche von Quartz im Projekt lässt sich nicht laden, deshalb ist keine Startseite angelegt ({{message}}). Ein erneutes npm install im Projekt behebt das meist.',

    projectAlreadyRegistered: 'Dieser Ordner ist bereits als anderes Projekt registriert.',
    projectIconUnsupportedFormat: 'Nur PNG- und JPEG-Dateien können als Projektbild verwendet werden.',
    projectIconUnreadable: 'Diese Datei konnte nicht als Bild gelesen werden.',

    // Snapshots
    snapshotStageFailed: 'Der Projektstand konnte nicht erfasst werden:',
    snapshotWriteTreeFailed: 'Der Snapshot konnte nicht angelegt werden: git write-tree lieferte kein Ergebnis.',
    snapshotMissing: 'Den Snapshot „{{id}}“ gibt es nicht.',
    snapshotVaultUntouched:
      'Hinweis: content/ zeigt auf einen Ordner außerhalb des Projekts (z. B. einen Obsidian-Vault). Dessen Dateien wurden nicht angetastet — alles außerhalb von content/ wurde wiederhergestellt.',

    // Stylesheets
    styleFileExists: 'Es gibt bereits eine Datei {{name}}.',
    styleCustomScssMissing: 'custom.scss gibt es nicht.',
    styleSassMissing: 'Im Projekt ist kein sass installiert (npm install).',

    zipNotAPackage: 'Die Datei ist kein lesbares Paket (kein ZIP-Verzeichnis gefunden).',
    zipFileMissing: 'Die Datei gibt es nicht.',

    // Publishing - dispatcher
    deployTargetMissing: 'Es gibt kein Veröffentlichungsziel mit der ID {{id}}.',
    deployNoAdapter: 'Für den Zieltyp „{{type}}“ gibt es noch keinen Adapter.',
    deployNoBuild:
      'In „{{dir}}“ liegt noch kein Build. Bitte zuerst bauen — oder unter Vorschau & Build einen anderen Ausgabeordner einstellen.',
    deployWrongType: 'Falscher Zieltyp für den {{adapter}}-Adapter.',
    deployNothingToDo: 'Nichts zu tun — das Ziel ist bereits auf dem Stand des Builds.\n',

    // Publishing - folder
    folderOverlapsBuild:
      'Der Zielordner ({{dest}}) liegt im Build-Ordner ({{build}}) oder umgekehrt. Bitte einen davon unabhängigen Ordner wählen.',
    folderIsProject: 'Der Projektordner selbst kann kein Veröffentlichungsziel sein.',

    // Publishing - git branch
    branchNoOrigin:
      'Kein „origin“-Remote konfiguriert. Git-Sync muss das Projekt zuerst mit einem Repository verbinden (git remote add origin <url>).',
    branchProtected:
      '„{{branch}}“ ist der aktuelle bzw. der Standard-Branch dieses Repositorys. Ein Branch-Deploy überschreibt den Ziel-Branch vollständig (force-push) — bitte einen eigenen Branch wie „gh-pages“ verwenden.',
    branchUnchanged: 'Keine Änderungen gegenüber dem veröffentlichten Stand — Push übersprungen.',

    // Publishing - SSH
    sshNoConnection: 'Für dieses Ziel ist kein SSH-Zugang hinterlegt.',
    sshNoAgent: 'Kein SSH-Agent gefunden (SSH_AUTH_SOCK ist nicht gesetzt).',
    sshNoPrivateKey: 'Für diesen Zugang ist kein privater Schlüssel hinterlegt.',

    // Publishing - rsync
    rsyncPasswordAuth:
      'rsync kann kein Passwort übergeben. Bitte einen Zugang mit Schlüsseldatei oder SSH-Agent verwenden — oder bei SFTP bleiben.',
    rsyncKeyNotAFile:
      'Für rsync muss der private Schlüssel als Datei hinterlegt sein; ein eingefügter Schlüsseltext reicht nicht, weil ssh eine Datei braucht.',
    rsyncNoPinnedHostKey:
      'Der Host-Key dieses Servers ist noch nicht vollständig hinterlegt. Bitte das Ziel einmal über SFTP veröffentlichen — dabei wird der Schlüssel bestätigt und gespeichert — und danach auf rsync umstellen.',
    rsyncUnsupportedPlatform: 'rsync gibt es auf diesem Betriebssystem nicht. Bitte SFTP verwenden.',
    rsyncNotInstalled:
      'Auf diesem Rechner ist kein rsync installiert. Unter Debian und Ubuntu: sudo apt install rsync. Bis dahin überträgt SFTP dieselben Dateien.',
    rsyncHostKeyMismatch:
      'Der Host-Key von {{host}} stimmt nicht mit dem gespeicherten überein.\n\nerwartet:  {{expected}}\nempfangen: {{received}}\n\nDie Übertragung wurde abgebrochen. Das kann ein neu aufgesetzter Server sein — oder ein Angriff. Prüfe den Fingerprint beim Anbieter und setze ihn erst danach über „Host-Key vergessen“ zurück.',
    unknownFingerprint: 'unbekannt',
    rsyncKeyRejected:
      'Der Server hat die Anmeldung als {{user}}@{{host}} abgelehnt. Angeboten wurde: {{identity}}. Prüfe, ob genau dieser Schlüssel beim Anbieter hinterlegt ist — und ob der Pfad auf den privaten Schlüssel zeigt, nicht auf die .pub-Datei.',
    rsyncPathWithSpace:
      'Ein Remote-Pfad mit Leerzeichen lässt sich mit rsync nicht sicher übertragen. Bitte SFTP für dieses Ziel verwenden.',
    rsyncExitCode: 'rsync endete mit Code {{code}}, ohne eine Meldung auszugeben.',

    // Publishing - webhook
    webhookNoUrl: 'Für dieses Ziel ist keine Webhook-URL hinterlegt.',
    webhookInvalidUrl: 'Die hinterlegte Webhook-URL ist ungültig.',
    webhookHttpsOnly: 'Webhooks werden nur über https ausgelöst.',
    webhookFailed: 'POST {{origin}} fehlgeschlagen.',
    webhookTimeout: 'Keine Antwort innerhalb von {{seconds}} Sekunden.',
    webhookRedacted: '[Token entfernt]',
    syncHistoryCompleted:
      'Die Projekt-Historie war unvollständig (flacher Klon) und konnte so nicht gepusht werden. Sie wurde vor dem Push vervollständigt — das passiert nur einmal.',
    syncHistoryIncomplete:
      'Die Projekt-Historie ist unvollständig (flacher Klon) und ließ sich nicht vervollständigen. Ein Push wird daran voraussichtlich scheitern:',
    sshAgentIdentity: 'der SSH-Agent',
    sshKeyFileUnreadable:
      'Die Schlüsseldatei „{{path}}“ lässt sich nicht lesen. Prüfe den Pfad und die Rechte (chmod 600).',

    // GitHub
    githubNoToken: 'Kein GitHub-Token hinterlegt. Trage in den Einstellungen einen Token mit „repo“-Berechtigung ein.',
    githubRepoCreateFailed: 'Das Repository konnte nicht angelegt werden.',
    githubRemoteSetFailed: 'Das Repository {{repo}} wurde angelegt, aber das Remote konnte nicht gesetzt werden.',
    githubRepoCreated: 'Das Repository {{repo}} ist angelegt und als „origin“ eingetragen.',
    githubNoGithubOrigin: 'Dieses Projekt hat kein „origin“-Remote, das auf github.com zeigt.',
    githubPagesSetupFailed: 'GitHub Pages konnte nicht eingerichtet werden.',
    githubPagesSaveFailed: 'Die Pages-Einstellungen konnten nicht gespeichert werden.',
    githubHttpsEnforced: 'HTTPS erzwingen: {{state}}',
    githubOn: 'an',
    githubOff: 'aus',
    googleFontsNoFamily: 'Keine Schriftart gewählt — es gibt nichts, was von Google geholt werden könnte.',
    googleFontsRequestFailed:
      'Google Fonts hat die Anfrage abgelehnt (HTTP {{status}}). Meist ist ein Schriftname falsch geschrieben — Google unterscheidet Groß- und Kleinschreibung.',
    googleFontsFileFailed: 'Die Schriftdatei {{file}} ließ sich nicht von Google laden (HTTP {{status}}).',
    googleFontsFileTooLarge: 'Die Schriftdatei {{file}} ist größer, als eine Schrift sein sollte, und wurde nicht gespeichert.',
    googleFontsNothingFound: 'Google Fonts hat für diese Schriften keine Dateien geliefert.',
    googleFontsBadFileName:
      'Google Fonts hat eine Datei unter einem unerwarteten Namen angeboten („{{name}}“). Es wurde nichts ins Projekt geholt.',
    googleFontsTooManyFiles:
      'Google Fonts hat {{count}} Dateien angeboten — mehr als die {{max}}, die für Schriften vorgesehen sind. Es wurde nichts ins Projekt geholt.',
    googleFontsTooLarge: 'Die Schriften von Google sind zusammen größer, als Schriften sein sollten — der Rest wurde nicht geholt.',
    googleFontsUnreachable: 'Google Fonts ist nicht erreichbar.',
    googleFontsFileUnreachable:
      'Die Schriftdatei {{file}} ließ sich nicht laden — Google Fonts ist nicht erreichbar.',
    googleFontsTimedOut: 'Google Fonts antwortet nicht (20 Sekunden gewartet).',
    googleFontsFileTimedOut: 'Die Schriftdatei {{file}} kam nicht an — Google Fonts antwortet nicht.',
    googleFontsRefreshFailed:
      'Die Google-Schriften ließen sich nicht ins Projekt holen: {{message}} — gebaut wird mit den Dateien, die schon im Projekt liegen.',
    googleFontsRefreshed: 'Die gewählten Google-Schriften wurden ins Projekt geholt ({{count}} Dateien).'
  },
  en: {
    menuFile: 'File',
    menuEdit: 'Edit',
    menuView: 'View',
    menuWindow: 'Window',
    menuHelp: 'Help',
    menuSave: 'Save',
    menuSettings: 'Settings…',
    menuHandbook: 'Handbook',
    handbookOpenFailedTitle: 'The handbook could not be opened',
    handbookOpenFailedDetail: 'The browser could not be opened: {{error}}',
    menuQuartzDocs: 'Quartz documentation',
    menuPluginCatalog: 'Plugin catalog',
    menuDataFolder: 'Open QuartzControl’s data folder',
    menuLicenses: 'Open licences',
    licensesMissingTitle: 'The licence texts are missing from this installation.',
    licensesMissingDetail:
      'They normally ship with the app. Reinstalling brings them back; online they are at https://github.com/boxi-os/QuartzControl.',
    menuFeedback: 'Send feedback…',
    feedbackSubject: 'Feedback',
    menuAbout: 'About QuartzControl',
    aboutDetail: 'Manage Quartz websites',
    aboutLicense:
      'Free software under the GNU General Public License, version 3 or later.\nSource: https://github.com/boxi-os/QuartzControl',

    orphanTitle: 'Running servers found',
    orphanMessage: 'Dev servers from a previous session are still running in the background:',
    orphanQuit: 'Quit',
    orphanKeepRunning: 'Keep running',
    orphanEntry: '{{name}} — port {{port}}',

    quitTitle: 'Running servers',
    quitMessage: 'Dev servers are still running.',
    quitDetail: 'Servers left running stay reachable in the browser and are found again on the next start.',
    quitStopServers: 'Stop servers',
    quitDontAskAgain: 'Don’t ask again',

    contentSourceInsideTarget:
      'The source folder is inside the project’s content folder ({{target}}), which is moved aside before the switch — pick a folder outside it.',
    contentTargetInsideSource:
      'The project’s content folder ({{target}}) is inside the folder you picked. Pick one that does not contain it.',

    buildDirIsProject: 'That is the project folder itself.',
    buildDirContainsProject: 'That folder contains the project.',
    buildDirIsHome: 'That is your home folder.',
    buildDirReserved: 'That folder belongs to the project and is needed.',
    buildDirRefused:
      'Cannot build into “{{dir}}”: {{why}} Every build wipes its output folder completely. Please pick a folder of its own, e.g. “public” or “dist”.',
    buildDirConfirmTitle: 'Folder will be emptied',
    buildDirConfirmMessage: 'Build into “{{dir}}”?',
    buildDirConfirmDetail:
      'It holds {{count}} entries that do not look like a Quartz build. Every build wipes its output folder completely — this cannot be undone.',
    buildDirConfirmCancel: 'Cancel',
    confirmCancel: 'Cancel',
    buildDirConfirmProceed: 'Empty the folder and build',
    buildDirCancelled: 'Cancelled — nothing was deleted and nothing was built.',
    buildDirBusy: 'A build into “{{running}}” is already running. You can build into “{{dir}}” once it has finished.',
    buildDirServerRunning:
      'The dev server is writing into “{{dir}}” right now. Stop it under “Preview & build” or pick a different output folder.',
    serverWaitsForBuild: 'A build into “{{dir}}” is running. The server starts as soon as it has finished.',

    ipcInvalidArguments:
      'QuartzControl called “{{channel}}” with unexpected data — that is a bug in the app, not a result of what you entered. Technical details:',
    openPathOutsideProjects: 'This path is outside the registered projects and will not be opened.',

    secretStorageUnavailable:
      'Credentials cannot be stored securely because the system keyring is unavailable. On Linux, running a keyring such as gnome-keyring or KWallet fixes this.',

    updateBlockedBySymlink:
      'The content folder is a symlink, and git cannot write through it. Switch to a real folder under Configuration → Site, group “Content folder”, for now and try again.\n\n',
    updateBlockedByLocalChanges:
      'Your own changes are in the way — git names the files below. Commit or discard them under Git sync and try again.\n\n',
    updateMergeUnfinished:
      'An earlier update is still half-merged. Cancel it at the top of this page and start the update again.\n\n',
    updatePackagesReinstalled: 'Your own packages put back: {{packages}}',
    updatePackagesDropped:
      'The update is not putting these packages of yours back, because package.json has been changed by another hand since the last run: {{packages}}.',
    updatePackagesDroppedUnreadable:
      'The update is not putting these packages of yours back: {{packages}}. The state the note from the last run referred to can no longer be read in git — add them again yourself if you need them.',
    updatePackagesUpstreamWins: 'Quartz changed these packages itself, so its version applies: {{packages}}',
    updatePackagesPending:
      'These packages of yours are currently not in package.json: {{packages}}. “Abort merge” above puts them back, and so does the restore point.',
    updatePackagesMissing:
      'These packages of yours are no longer in package.json: {{packages}}. Fix the error above and run the update again, or use the restore point — with the “Also reset the project commit” switch on.',
    updateStashLeftover:
      'An earlier update left package entries of yours stashed in git ({{entry}} in “git stash list”). They belong to a state that is gone: “git stash show -p {{entry}}” shows them, “git stash drop {{entry}}” discards them.',
    updateStashMine:
      'An earlier update left package entries of yours stashed in git (“git stash list”). “Abort merge” puts them back.',
    updateStashMineBlocked:
      'An earlier update left package entries of yours stashed in git (“git stash list”). “Abort merge” puts them back once git allows the cancel; the button itself says what is in the way and what to do.',
    updateStashMineOccupied:
      'An earlier update left package entries of yours stashed in git ({{entry}} in “git stash list”). “Abort merge” cannot put them back while these files are changed: {{files}}. Save your change to them and discard it (in a terminal: “git checkout -- <file>”), then the button puts them back.',
    configNotAMapping:
      'quartz.config.yaml does not hold a mapping of keys and values. The app will not read it; fix it in an editor or use a restore point.',
    updateAlreadyRunning:
      'A core update is already running for this project. Wait for it to finish and then look again — the run’s own output is only seen by whoever leaves the Updates page open until then.',
    configNotParseable:
      'quartz.config.yaml cannot be read as YAML: {{reason}}. Fix it in an editor or use a restore point.',
    configMissing:
      'quartz.config.yaml is not in the project folder. A newly created project needs the setup assistant to have run through successfully.',
    gitignoreComment: 'QuartzControl working directory (backups, presets, deploy manifest)',
    duplicateSourceConfigUnreadable:
      '“{{path}}” cannot be duplicated because its configuration cannot be read. {{reason}}',
    configPluginsNotAList:
      'In quartz.config.yaml, “plugins” is not a list. The app will not read it; fix it in an editor or use a restore point.',
    updateStashFitsHead:
      'An earlier update left package entries of yours stashed in git ({{entry}} in “git stash list”). They fit the state the project is in now, but this app has no way left to put them back: “git stash show -p {{entry}}” shows them, “git stash pop {{entry}}” puts them back.',
    updateStashUnderRestored:
      'Besides the entries cancelling puts back, git still holds an older stash with package entries of yours ({{entry}} in “git stash list”). git will not take “git stash pop” for it right now, because the same files have just been changed again: “git stash show -p {{entry}}” shows it — copy over by hand what you are missing, then discard it with “git stash drop {{entry}}”.',
    updateStashRestored: 'The update is cancelled, and your stashed package entries are back in place.',
    updateStashPopFailed:
      'Your stashed package entries could not be put back and are still in git ({{entry}} in “git stash list”): “git stash show -p {{entry}}” shows them.',
    updateAbortBlockedByEdit:
      'A file from the merge has been changed since, so the update cannot be cancelled. Discard what you changed in it since the merge (in a terminal: “git checkout -- <file>”), then cancel again.\n\n',
    updateAbortBlockedByEditNamed:
      'Work has continued on files from the merge, so the update cannot be cancelled: {{files}}. Discard what you changed there since (in a terminal, for each file: “git checkout -- <file>”), then cancel again.\n\n',
    updateAbortBlockedByUntracked:
      'These files are no longer staged but still lie in the project folder, so the update cannot be cancelled: {{files}}. Stage them again (in a terminal, for each file: “git add -- <file>”), then cancel again.\n\n',
    updateAbortBlockedByOwnStaged:
      'You staged these files yourself and changed them again afterwards, so the update cannot be cancelled: {{files}}. Undo only the staging there (in a terminal, for each file: “git reset -- <file>”), which keeps your changes, then cancel again.\n\n',
    updateAbortDroppedStaged:
      'Cancelling discarded the staged state of these files: {{files}}. When cancelling, git resets everything that was staged — including what you staged yourself and conflicts you resolved by hand.',
    updateNoteUnwritable:
      'The note for this update could not be written ({{reason}}). The update still ran to the end; the next run may therefore install again or report “nothing to do”.',
    npmInstallFailed: 'npm install failed:',
    warmupBuild: 'Warm-up build:',
    serverLogUnavailable:
      'The server’s output cannot be recorded ({{reason}}). The server is running; this console stays empty for this run.',

    createTargetExists:
      '“{{path}}” already contains files. Pick a different name or a different folder — an existing folder is never overwritten.',
    createCloneFailed: 'Quartz could not be downloaded from GitHub:',
    templateContentTooLarge:
      'This project\'s content is larger than {{limit}} MB. A template is a design, not a backup — leave the “content” part out.',
    templateStaticTooLarge:
      'The files under quartz/static add up to more than {{limit}} MB. A template carries snippets, logos and images — not a media library; leave the “Static files” part out.',
    duplicateSourceNotAProject: 'There is no quartz.config.yaml in “{{path}}” — that is not a Quartz project.',
    duplicateNested:
      'The copy must not sit inside the original project, nor the original inside the copy. Pick a folder beside it.',
    duplicateBlankContent:
      'This project is a copy and has no content yet. Under “Configuration → Site”, group “Content folder”, you can link a folder or an Obsidian vault.',
    createInstallFailed: 'npm install failed:',
    createNoConfig:
      '\n\nThe setup wizard did not write quartz.config.yaml (most likely an interactive question above went unanswered).',

    githubOriginExists:
      'This project already has an “origin” remote ({{remote}}). It is not overwritten — remove it by hand first if that is what you want.',
    githubPagesCreated: 'GitHub Pages set up, source: {{branch}} (/)',
    githubPagesSourceSet: 'Source set: {{branch}} (/)',
    githubDomainSet: 'Domain set: {{domain}}',
    githubDomainCleared: 'Custom domain removed.',
    githubHttpsPending:
      'HTTPS could not be enforced yet — GitHub only issues the certificate for a custom domain a few minutes after the domain is set. Try again later.',

    frameIdInvalid: 'Invalid frame id “{{id}}” — only letters, digits and hyphens are allowed.',
    frameShapeInvalid: 'The frame cannot be read: {{detail}}',
    frameIssueType: 'The “{{where}}” field is missing or has the wrong type.',
    frameIssueTooBig: 'The value at “{{where}}” is too large or too long (maximum {{limit}}).',
    frameIssueTooSmall: 'The value at “{{where}}” is too small or too short (minimum {{limit}}).',
    frameIssueValue: 'The value at “{{where}}” is none of the allowed ones ({{values}}).',
    frameIssueFormat: 'The value at “{{where}}” has a form that is not allowed here.',
    frameIssueKey: 'The key at “{{where}}” is not allowed here.',
    frameNameAndReason: '“{{name}}” — {{reason}}',
    frameGroupsUnreadable:
      'The layout groups could not be read ({{error}}). Frames show their positions undivided for this run.',
    frameRefreshFailed:
      'The frames could not be refreshed before this run ({{error}}). Building with what is on disk.',
    frameAreaNameDuplicate:
      'Two areas are called “{{name}}”. An area name may only appear once — otherwise the frame loses its whole grid.',
    frameAreaGroupDuplicate:
      'Two areas on the same slot hold the group “{{name}}”. Both would show the same components, so they would appear twice on every page.',

    commandTimeout: 'Timed out after {{ms}} ms: {{command}}',

    zipEntryTooLarge: 'The file “{{name}}” is too large for a package (over 4 GB).',
    zipBadDirectory: 'The package is damaged (invalid directory entry).',
    zipBadHeader: 'The package is damaged (invalid file header).',
    zipUnsupportedMethod: 'The package uses an unsupported compression method ({{method}}).',
    zipEntryCorrupt: 'The file “{{name}}” in the package is damaged.',
    zipEntryUnsafeName: 'The file “{{name}}” in the package would be written outside the project.',
    zipTooLarge: 'The package unpacks to more than {{limit}} MB and is not read.',

    ftpWrongTarget: 'Wrong destination type for the FTP adapter.',
    ftpNoConnection: 'No FTP credential is set for this target.',
    hostKeyChanged:
      'The host key of {{host}} has changed!\n\nexpected: {{expected}}\nreceived: {{received}}\n\nThe connection was aborted. This can be a rebuilt server — or an attack. Check the fingerprint with your provider and only then clear it via “Forget host key”.',
    hostKeyUnknownTitle: 'Unknown server',
    hostKeyUnknownMessage: '{{host}} has been contacted for the first time.',
    hostKeyUnknownDetail:
      'The server’s fingerprint:\n{{fingerprint}}\n\nCompare it with the one your provider publishes (or with `ssh-keyscan -t rsa,ed25519 {{host}} | ssh-keygen -lf -`). Only connect if they match.',
    hostKeyCancel: 'Cancel',
    hostKeyAccept: 'Connect and remember',
    hostKeyRejected: 'Connection aborted — the host key was not confirmed.',
    contentSourceMissing: 'The source folder does not exist: {{path}}',
    indexPageExists: 'The content folder already has an index.md. It stays as it is.',
    indexPageNoContent: 'There is no reachable content folder to put the start page in.',
    indexPageGlobbyBroken:
      'Quartz’s file search in the project cannot be loaded, so no start page was created ({{message}}). Running npm install in the project again usually fixes this.',

    projectAlreadyRegistered: 'This folder is already registered as another project.',
    projectIconUnsupportedFormat: 'Only PNG and JPEG files can be used as a project image.',
    projectIconUnreadable: 'This file could not be read as an image.',

    snapshotStageFailed: 'The project state could not be captured:',
    snapshotWriteTreeFailed: 'The snapshot could not be taken: git write-tree returned nothing.',
    snapshotMissing: 'There is no snapshot “{{id}}”.',
    snapshotVaultUntouched:
      'Note: content/ points at a folder outside the project (e.g. an Obsidian vault). Its files were left untouched — everything outside content/ was restored.',

    styleFileExists: 'A file {{name}} already exists.',
    styleCustomScssMissing: 'custom.scss does not exist.',
    styleSassMissing: 'The project has no sass installed (npm install).',

    zipNotAPackage: 'The file is not a readable package (no ZIP directory found).',
    zipFileMissing: 'The file does not exist.',

    deployTargetMissing: 'There is no publish target with the id {{id}}.',
    deployNoAdapter: 'There is no adapter for the target type “{{type}}” yet.',
    deployNoBuild:
      'There is no build in “{{dir}}” yet. Build first — or pick a different output folder under Preview & build.',
    deployWrongType: 'Wrong destination type for the {{adapter}} adapter.',
    deployNothingToDo: 'Nothing to do — the target already matches the build.\n',

    folderOverlapsBuild:
      'The target folder ({{dest}}) is inside the build folder ({{build}}) or the other way round. Please pick a folder independent of it.',
    folderIsProject: 'The project folder itself cannot be a publish target.',

    branchNoOrigin:
      'No “origin” remote configured. Git sync has to connect the project to a repository first (git remote add origin <url>).',
    branchProtected:
      '“{{branch}}” is this repository’s current or default branch. A branch deploy replaces the target branch wholesale (force push) — please use a branch of its own such as “gh-pages”.',
    branchUnchanged: 'No changes against what is published — push skipped.',

    sshNoConnection: 'No SSH credential is set for this target.',
    sshNoAgent: 'No SSH agent found (SSH_AUTH_SOCK is not set).',
    sshNoPrivateKey: 'No private key is stored for this credential.',

    rsyncPasswordAuth:
      'rsync cannot hand over a password. Please use a credential with a key file or the SSH agent — or stay on SFTP.',
    rsyncKeyNotAFile:
      'rsync needs the private key as a file; a pasted key text is not enough, because ssh wants a file.',
    rsyncNoPinnedHostKey:
      'The host key of this server is not fully stored yet. Publish to this target over SFTP once — that confirms and stores the key — and then switch to rsync.',
    rsyncUnsupportedPlatform: 'rsync does not exist on this operating system. Please use SFTP.',
    rsyncNotInstalled:
      'No rsync is installed on this machine. On Debian and Ubuntu: sudo apt install rsync. Until then SFTP transfers the same files.',
    rsyncHostKeyMismatch:
      'The host key of {{host}} does not match the stored one.\n\nexpected: {{expected}}\nreceived: {{received}}\n\nThe transfer was aborted. This can be a rebuilt server — or an attack. Check the fingerprint with your provider and only then clear it via “Forget host key”.',
    unknownFingerprint: 'unknown',
    rsyncKeyRejected:
      'The server refused the login as {{user}}@{{host}}. What was offered: {{identity}}. Check that this exact key is registered with the provider — and that the path points at the private key, not the .pub file.',
    rsyncPathWithSpace:
      'A remote path containing a space cannot be transferred safely with rsync. Please use SFTP for this target.',
    rsyncExitCode: 'rsync exited with code {{code}} without printing a message.',

    webhookNoUrl: 'No webhook URL is stored for this target.',
    webhookInvalidUrl: 'The stored webhook URL is invalid.',
    webhookHttpsOnly: 'Webhooks are only triggered over https.',
    webhookFailed: 'POST {{origin}} failed.',
    webhookTimeout: 'No answer within {{seconds}} seconds.',
    webhookRedacted: '[token removed]',
    syncHistoryCompleted:
      'The project history was incomplete (a shallow clone) and could not have been pushed. It was completed before the push — this happens only once.',
    syncHistoryIncomplete:
      'The project history is incomplete (a shallow clone) and could not be completed. A push will most likely fail because of it:',
    sshAgentIdentity: 'the SSH agent',
    sshKeyFileUnreadable:
      'The key file “{{path}}” cannot be read. Check the path and its permissions (chmod 600).',

    githubNoToken: 'No GitHub token stored. Add one with the “repo” scope in the settings.',
    githubRepoCreateFailed: 'The repository could not be created.',
    githubRemoteSetFailed: 'The repository {{repo}} was created, but the remote could not be set.',
    githubRepoCreated: 'The repository {{repo}} was created and wired up as “origin”.',
    githubNoGithubOrigin: 'This project has no “origin” remote pointing at github.com.',
    githubPagesSetupFailed: 'GitHub Pages could not be set up.',
    githubPagesSaveFailed: 'The Pages settings could not be saved.',
    githubHttpsEnforced: 'Enforce HTTPS: {{state}}',
    githubOn: 'on',
    githubOff: 'off',
    googleFontsNoFamily: 'No font is selected — there is nothing to fetch from Google.',
    googleFontsRequestFailed:
      'Google Fonts rejected the request (HTTP {{status}}). Usually a font name is misspelled — Google is case-sensitive.',
    googleFontsFileFailed: 'The font file {{file}} could not be loaded from Google (HTTP {{status}}).',
    googleFontsFileTooLarge: 'The font file {{file}} is larger than a font should be and was not saved.',
    googleFontsNothingFound: 'Google Fonts returned no files for these fonts.',
    googleFontsBadFileName:
      'Google Fonts offered a file under an unexpected name (“{{name}}”). Nothing was fetched into the project.',
    googleFontsTooManyFiles:
      'Google Fonts offered {{count}} files — more than the {{max}} meant for fonts. Nothing was fetched into the project.',
    googleFontsTooLarge: 'The fonts from Google are larger together than fonts should be — the rest was not fetched.',
    googleFontsUnreachable: 'Google Fonts cannot be reached.',
    googleFontsFileUnreachable: 'The font file {{file}} could not be loaded — Google Fonts cannot be reached.',
    googleFontsTimedOut: 'Google Fonts is not answering (waited 20 seconds).',
    googleFontsFileTimedOut: 'The font file {{file}} did not arrive — Google Fonts is not answering.',
    googleFontsRefreshFailed:
      'The Google fonts could not be fetched into the project: {{message}} — the build uses the files already in the project.',
    googleFontsRefreshed: 'The selected Google fonts were fetched into the project ({{count}} files).'
  }
} as const

export type MainStringKey = keyof (typeof STRINGS)['de']

// The language every mainT() call reads. Cached rather than looked up per call, because most
// callers are error paths deep inside a service where an async settings read has no place - and
// because a message must not change language halfway through one operation. refreshMainLanguage()
// runs at startup before the window exists and again on every settings save, which is exactly
// where applyAppMenu() already rides along.
let language: 'de' | 'en' = 'en'

let refreshed = false

/** Die Sprache, in der der Hauptprozess gerade spricht. Für Entscheidungen, die keine Zeichenkette
 *  sind - etwa welche Fassung des Handbuchs geöffnet wird. */
export function mainLanguage(): 'de' | 'en' {
  // Derselbe Wächter wie in mainT() eine Funktion tiefer, und aus demselben Grund: Der Wert steckt
  // vor refreshMainLanguage() für die Lebensdauer des Prozesses in der Vorgabesprache. Heute laufen
  // beide Aufrufer nach whenReady; wer als Nächstes `const X = mainLanguage()` auf Modulebene
  // schreibt, bekäme ohne diese Zeile das englische Handbuch auf einer deutschen App und keinen
  // Hinweis darauf - genau der Bug vom 2026-09-02, nur eine Tür weiter.
  if (!refreshed) {
    console.error(
      'mainLanguage() resolved before refreshMainLanguage(); this answer is frozen in the default language. Call it inside a function, not at module scope.'
    )
  }
  return language
}

export async function refreshMainLanguage(): Promise<void> {
  const setting = (await getSettings()).language
  language = setting === 'de' || setting === 'en' ? setting : app.getLocale().startsWith('de') ? 'de' : 'en'
  refreshed = true
}

export function mainT(key: MainStringKey, vars?: Record<string, string | number>): string {
  // Anything resolved before whenReady has run refreshMainLanguage() is stuck with the default
  // above for the life of the process. That is not a hypothetical: two module-level constants
  // (rsync's blocker table, githubService's NO_TOKEN) were evaluated when handlers.ts imported
  // their file and answered in English on a German app until 2026-09-02. English on purpose - it
  // describes a bug in this app, not something a user typed.
  if (!refreshed) {
    console.error(`mainT('${key}') resolved before refreshMainLanguage(); this string is frozen in the default language. Call it inside a function, not at module scope.`)
  }
  const template: string = STRINGS[language][key]
  if (!vars) return template
  return template.replace(/\{\{(\w+)\}\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole))
}
