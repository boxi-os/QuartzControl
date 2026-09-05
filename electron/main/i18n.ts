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
    menuQuartzDocs: 'Quartz-Dokumentation',
    menuPluginCatalog: 'Plugin-Katalog',
    menuDataFolder: 'Datenordner von QuartzControl öffnen',
    menuFeedback: 'Rückmeldung senden…',
    feedbackSubject: 'Rückmeldung',
    menuAbout: 'Über QuartzControl',
    aboutDetail: 'Verwaltung für Quartz-Websites',

    orphanTitle: 'Laufende Server gefunden',
    orphanMessage: 'Von einer vorherigen Sitzung laufen noch Dev-Server im Hintergrund:',
    orphanQuit: 'Beenden',
    orphanKeepRunning: 'Weiterlaufen lassen',
    orphanEntry: '{{name}} — Port {{port}}',

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
      'In „{{dir}}“ kann nicht gebaut werden: {{why}} Jeder Build löscht sein Ausgabeverzeichnis vollständig. Bitte einen eigenen Ordner wählen, z. B. „public“ oder „dist“.',
    buildDirConfirmTitle: 'Ordner wird geleert',
    buildDirConfirmMessage: 'In „{{dir}}“ bauen?',
    buildDirConfirmDetail:
      'Darin liegen {{count}} Einträge, die nicht nach einem Quartz-Build aussehen. Jeder Build löscht sein Ausgabeverzeichnis vollständig — das lässt sich nicht rückgängig machen.',
    buildDirConfirmCancel: 'Abbrechen',
    confirmCancel: 'Abbrechen',
    buildDirConfirmProceed: 'Ordner leeren und bauen',
    buildDirCancelled: 'Abgebrochen — es wurde nichts gelöscht und nichts gebaut.',

    ipcInvalidArguments:
      'QuartzControl hat „{{channel}}“ mit unerwarteten Daten aufgerufen — das ist ein Fehler in der App und keine Folge deiner Eingabe. Technische Details:',
    openPathOutsideProjects: 'Dieser Pfad liegt außerhalb der registrierten Projekte und wird nicht geöffnet.',

    // Credentials
    secretStorageUnavailable:
      'Die Zugangsdaten können nicht sicher gespeichert werden, weil der Schlüsselbund des Systems nicht verfügbar ist.',

    // Core update
    updateBlockedBySymlink:
      'Der Content-Ordner ist ein Symlink, durch den git nicht schreiben kann. Wechsle unter Konfiguration → Content-Ordner vorübergehend auf einen echten Ordner und versuche es erneut.\n\n',
    updateBlockedByLocalChanges:
      'Eigene Änderungen an Dateien, die das Update ebenfalls anfasst, stehen im Weg. Committe oder verwirf sie unter Git-Sync und versuche es erneut.\n\n',
    warmupBuild: 'Aufwärm-Build:',

    // Project creation
    createTargetExists:
      'In „{{path}}“ liegen bereits Dateien. Wähle einen anderen Namen oder einen anderen Ordner — ein vorhandener Ordner wird nicht überschrieben.',
    createCloneFailed: 'Quartz konnte nicht von GitHub geladen werden:',
    templateContentTooLarge:
      'Der Inhalt dieses Projekts ist größer als {{limit}} MB. Eine Vorlage ist eine Gestaltung, keine Sicherung — nimm den Baustein „Inhalt“ heraus.',
    duplicateSourceNotAProject:
      'In „{{path}}“ liegt keine quartz.config.yaml — das ist kein Quartz-Projekt.',
    duplicateNested:
      'Das Duplikat darf nicht im Originalprojekt liegen und das Original nicht im Duplikat. Wähle einen Ordner daneben.',
    duplicateBlankContent:
      'Dieses Projekt ist eine Kopie und hat noch keinen Inhalt. Unter „Einrichtung → Content-Ordner“ kannst du einen Ordner oder einen Obsidian-Vault verknüpfen.',
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

    // Commands
    commandTimeout: 'Zeitüberschreitung nach {{ms}} ms: {{command}}',

    // Template packages
    zipEntryTooLarge: 'Die Datei „{{name}}“ ist zu groß für ein Paket (über 4 GB).',
    zipBadDirectory: 'Das Paket ist beschädigt (Verzeichniseintrag ungültig).',
    zipBadHeader: 'Das Paket ist beschädigt (Dateikopf ungültig).',
    zipUnsupportedMethod: 'Das Paket verwendet ein nicht unterstütztes Kompressionsverfahren ({{method}}).',
    zipEntryCorrupt: 'Die Datei „{{name}}“ im Paket ist beschädigt.',

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
    githubOff: 'aus'
  },
  en: {
    menuFile: 'File',
    menuEdit: 'Edit',
    menuView: 'View',
    menuWindow: 'Window',
    menuHelp: 'Help',
    menuSave: 'Save',
    menuSettings: 'Settings…',
    menuQuartzDocs: 'Quartz documentation',
    menuPluginCatalog: 'Plugin catalog',
    menuDataFolder: 'Open QuartzControl’s data folder',
    menuFeedback: 'Send feedback…',
    feedbackSubject: 'Feedback',
    menuAbout: 'About QuartzControl',
    aboutDetail: 'Manage Quartz websites',

    orphanTitle: 'Running servers found',
    orphanMessage: 'Dev servers from a previous session are still running in the background:',
    orphanQuit: 'Quit',
    orphanKeepRunning: 'Keep running',
    orphanEntry: '{{name}} — port {{port}}',

    contentSourceInsideTarget:
      'The source folder is inside the project’s content folder ({{target}}), which is moved aside before the switch — pick a folder outside it.',
    contentTargetInsideSource:
      'The project’s content folder ({{target}}) is inside the folder you picked. Pick one that does not contain it.',

    buildDirIsProject: 'That is the project folder itself.',
    buildDirContainsProject: 'That folder contains the project.',
    buildDirIsHome: 'That is your home folder.',
    buildDirReserved: 'That folder belongs to the project and is needed.',
    buildDirRefused:
      'Cannot build into “{{dir}}”: {{why}} Every build wipes its output directory completely. Please pick a folder of its own, e.g. “public” or “dist”.',
    buildDirConfirmTitle: 'Folder will be emptied',
    buildDirConfirmMessage: 'Build into “{{dir}}”?',
    buildDirConfirmDetail:
      'It holds {{count}} entries that do not look like a Quartz build. Every build wipes its output directory completely — this cannot be undone.',
    buildDirConfirmCancel: 'Cancel',
    confirmCancel: 'Cancel',
    buildDirConfirmProceed: 'Empty the folder and build',
    buildDirCancelled: 'Cancelled — nothing was deleted and nothing was built.',

    ipcInvalidArguments:
      'QuartzControl called “{{channel}}” with unexpected data — that is a bug in the app, not a result of what you entered. Technical details:',
    openPathOutsideProjects: 'This path is outside the registered projects and will not be opened.',

    secretStorageUnavailable: 'Credentials cannot be stored securely because the system keyring is unavailable.',

    updateBlockedBySymlink:
      'The content folder is a symlink, and git cannot write through it. Switch to a real folder under Configuration → Content folder for now and try again.\n\n',
    updateBlockedByLocalChanges:
      'Your own changes to files the update touches as well are in the way. Commit or discard them under Git sync and try again.\n\n',
    warmupBuild: 'Warm-up build:',

    createTargetExists:
      '“{{path}}” already contains files. Pick a different name or a different folder — an existing folder is never overwritten.',
    createCloneFailed: 'Quartz could not be downloaded from GitHub:',
    templateContentTooLarge:
      'This project\'s content is larger than {{limit}} MB. A template is a design, not a backup — leave the “content” part out.',
    duplicateSourceNotAProject: 'There is no quartz.config.yaml in “{{path}}” — that is not a Quartz project.',
    duplicateNested:
      'The copy must not sit inside the original project, nor the original inside the copy. Pick a folder beside it.',
    duplicateBlankContent:
      'This project is a copy and has no content yet. Under “Setup → Content folder” you can link a folder or an Obsidian vault.',
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

    commandTimeout: 'Timed out after {{ms}} ms: {{command}}',

    zipEntryTooLarge: 'The file “{{name}}” is too large for a package (over 4 GB).',
    zipBadDirectory: 'The package is damaged (invalid directory entry).',
    zipBadHeader: 'The package is damaged (invalid file header).',
    zipUnsupportedMethod: 'The package uses an unsupported compression method ({{method}}).',
    zipEntryCorrupt: 'The file “{{name}}” in the package is damaged.',

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
    githubOff: 'off'
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
