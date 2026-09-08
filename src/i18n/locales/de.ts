export default {
  common: {
    back: 'Zurück',
    save: 'Speichern',
    handbookFor: 'Im Handbuch nachlesen',
    saving: 'Speichere…',
    saved: 'Gespeichert.',
    cancel: 'Abbrechen',
    close: 'Schließen',
    select: 'Auswählen',
    copy: 'Kopieren',
    remove: 'Entfernen',
    edit: 'Bearbeiten',
    loading: 'Lade…',
    openInBrowser: 'Im Browser öffnen',
    // Name der Sub-Tab-Leiste für Screenreader. Nicht „Bereich“ - das heißt im Layout-Editor ein
    // Frame-Bereich, und ein Wort hat einen Namen.
    viewSwitcher: 'Ansicht',
    copied: 'Kopiert — {{value}}',
    serverState: {
      stopped: 'Gestoppt',
      starting: 'Startet…',
      running: 'Läuft',
      stopping: 'Stoppt…',
      error: 'Fehler'
    }
  },
  // The seven places a component can sit on a page. One table, read by the Layout editor and by
  // the plugin list - they used to have a copy each, with different words for the same slot.
  positions: {
    header: 'Kopfbereich',
    left: 'Linke Seitenleiste',
    right: 'Rechte Seitenleiste',
    beforeBody: 'Vor dem Inhalt',
    afterBody: 'Nach dem Inhalt',
    footer: 'Fußzeile',
    body: 'Im Inhalt',
    pageBody: 'Seiteninhalt'
  },
  errors: {
    renderFailed: 'Diese Ansicht konnte nicht angezeigt werden.',
    retry: 'Nochmal versuchen'
  },
  devServer: {
    staleHint: 'Der laufende Dev-Server zeigt die Änderung erst nach einem Neustart.',
    restart: 'Dev-Server neu starten',
    restarting: 'Starte neu…',
    restarted: 'Dev-Server neu gestartet'
  },
  home: {
    subtitle: 'Deine Quartz-Websites an einem Ort — einrichten, gestalten, veröffentlichen.',
    update: {
      available: 'Es gibt eine neuere Fassung: {{latest}} — du hast {{current}}.',
      get: 'Herunterladen'
    },
    settings: 'Einstellungen',
    openExisting: 'Vorhandenes Projekt öffnen',
    createNew: 'Neues Projekt erstellen',
    searchPlaceholder: 'Projekt suchen…',
    noSearchResults: 'Kein Projekt passt zur Suche.',
    lastOpened: 'Zuletzt geöffnet {{when}}',
    neverOpened: 'Noch nie geöffnet',
    serverRunning: 'Dev-Server läuft',
    serverRunningOnPort: 'Dev-Server auf Port {{port}}',
    folderMissing: 'Ordner nicht gefunden — verschoben, umbenannt oder auf einem nicht eingebundenen Laufwerk.',
    notAQuartzProject: 'Kein Quartz-Projekt — in diesem Ordner liegt keine quartz.config.yaml.',
    locateFolder: 'Ordner suchen…',
    duplicate: {
      action: 'Duplizieren',
      title: '„{{name}}“ duplizieren',
      intro:
        'Kopiert Gestaltung, Konfiguration, Plugins und die eigenen Frames in einen neuen Ordner. Der Inhalt kommt nicht mit — wähle unten, woher das Duplikat seine Notizen bekommt.',
      nameHint: 'Der Ordnername des Duplikats. Er wird auch der Projektname in dieser Liste.',
      contentLabel: 'Inhalt des Duplikats',
      contentHint: 'Der Content-Ordner des Originals wird nie mitkopiert — zwei Projekte, die durch denselben Link schreiben, wüssten nichts voneinander.',
      contentBlank: 'Leer beginnen (eine Startseite)',
      contentSymlink: 'Mit einem Ordner verknüpfen (z. B. einem Obsidian-Vault)',
      contentCopy: 'Einen Ordner hineinkopieren',
      contentFolder: 'Quellordner',
      contentFolderHint: 'Beim Verknüpfen bleibt dieser Ordner der Ort, an dem du schreibst; beim Kopieren wird er einmal übernommen.',
      whatStaysBehind:
        'Nicht mitkopiert werden: Snapshots, beiseitegelegte Content-Ordner und die Veröffentlichungsziele. Das Duplikat könnte sonst mit dem ersten Klick die Website des Originals überschreiben. Die Basis-URL wird übernommen — ändere sie unter „Einrichtung“, wenn das Duplikat woanders stehen soll.',
      confirm: 'Duplizieren',
      running: 'Kopiere…',
      failed: 'Das Duplizieren ist fehlgeschlagen.'
    },
    confirmRemove: '„{{name}}“ aus der Liste entfernen?\n\nDer Ordner auf der Festplatte bleibt unangetastet.',
    confirmRemoveAction: 'Aus der Liste entfernen',
    confirmRemoveRunning:
      '„{{name}}“ aus der Liste entfernen?\n\nDer laufende Dev-Server wird dabei beendet. Der Ordner auf der Festplatte bleibt unangetastet.',
    environment: {
      titleProblem: 'Diese Werkzeuge fehlen',
      description: 'Ohne sie schlagen Builds, neue Projekte, Plugins aus einer Git-Quelle und Snapshots fehl.',
      missing: 'nicht gefunden',
      brokenTool: 'gefunden, lässt sich aber nicht ausführen',
      embeddedBroken:
        'Diese Werkzeuge gehören zur App. Dass sie sich nicht ausführen lassen, heißt, dass diese Installation unvollständig ist — am schnellsten hilft, die App neu zu installieren.',
      bundled: 'in der App',
      fromSystem: 'vom System',
      recheck: 'Erneut prüfen',
      ready: 'Werkzeuge bereit',
      secretsBackend: 'Zugangsdaten verschlüsselt über {{backend}}',
      secretsTitle: 'Zugangsdaten liegen unverschlüsselt',
      secretsBody:
        'Auf diesem System ist kein Schlüsselbund aktiv, deshalb speichert Electron Passwörter und Token nur mit einem fest eingebauten Schlüssel ({{backend}}) — das ist praktisch Klartext. Mit gnome-keyring oder KWallet werden sie richtig geschützt.',
      secretsUnavailable:
        'Auf diesem System steht keine Verschlüsselung zur Verfügung. Zugangsdaten mit Passwort oder Token lassen sich deshalb nicht speichern.'
    },
    gettingStarted: {
      title: 'Erste Schritte',
      description:
        'QuartzControl verwaltet Quartz-Projekte: aus einem Ordner voller Markdown-Dateien wird eine fertige Website.',
      step1: 'Lege ein neues Projekt an oder öffne einen Ordner, in dem Quartz schon eingerichtet ist.',
      step2: 'Verknüpfe den Content-Ordner mit deinen Notizen — auch direkt mit einem Obsidian-Vault.',
      step3: 'Starte die Vorschau, gestalte die Seite nach deinem Geschmack und veröffentliche sie.'
    },
    capabilities: {
      title: 'Was du hier tun kannst',
      setup: {
        title: 'Einrichtung',
        body: 'Titel, Adresse und Sprache der Seite festlegen, Plugins aus dem Marktplatz installieren und den Content-Ordner mit deinem Obsidian-Vault verknüpfen.'
      },
      design: {
        title: 'Gestaltung',
        body: 'Farben, Schriften und CSS-Variablen anpassen, Community-Themes installieren, eigenes CSS schreiben und Layout-Rahmen selbst bauen.'
      },
      publish: {
        title: 'Veröffentlichung',
        body: 'Lokal bauen und in der Vorschau ansehen, per Git synchronisieren und auf GitHub Pages, SFTP, rsync oder einen Webspace veröffentlichen.'
      },
      maintenance: {
        title: 'Wartung',
        body: 'Quartz-Kern und Plugins aktualisieren, Snapshots anlegen und einzelne Dateien oder das ganze Projekt zurückspielen.'
      }
    },
    aboutQuartz: {
      title: 'Was ist Quartz?',
      body: 'Quartz 5 ist ein statischer Website-Generator für vernetzte Notizen: Markdown rein, fertige Website raus — mit Backlinks, Graph-Ansicht und Volltextsuche. Es versteht Obsidian-Wikilinks, du kannst deinen Vault also direkt veröffentlichen.',
      handbook: 'Handbuch zu QuartzControl',
      docs: 'Quartz-Dokumentation',
      catalog: 'Plugin-Katalog auf GitHub'
    },
    wizard: {
      title: 'Neues Quartz-Projekt',
      intro:
        'QuartzControl legt einen neuen Ordner an und lädt Quartz von GitHub hinein. Der Ordner darf noch nicht existieren — er wird für dich erstellt. Das dauert ein bis zwei Minuten, weil dabei auch die Abhängigkeiten installiert werden.',
      parentDirectory: 'Wo soll das Projekt liegen?',
      parentDirectoryHint:
        'Der übergeordnete Ordner, der schon existiert — zum Beispiel „Dokumente“. Darin entsteht ein neuer Ordner mit dem Namen von unten.',
      parentDirectoryPlaceholder: '/Users/du/Dokumente',
      projectName: 'Name des Projektordners',
      projectNameHint:
        'Nur der Ordnername, nicht der Titel der Website — den stellst du später unter Konfiguration ein. Am einfachsten sind Kleinbuchstaben und Bindestriche.',
      projectNamePlaceholder: 'meine-notizen',
      targetPreview: 'Angelegt wird:',
      nameInvalid: 'Der Name darf kein „/“ enthalten und nicht „.“ oder „..“ sein.',
      template: 'Quartz-Grundgerüst',
      templateHint:
        'Welche Beispielseiten und Grundeinstellungen Quartz selbst mitbringt. „default“ ist der normale Startpunkt; alles daran lässt sich später ändern.',
      contentStrategy: 'Woher kommen die Notizen?',
      contentStrategyHint:
        'Beim Verknüpfen bleiben die Notizen dort, wo sie sind — zum Beispiel in deinem Obsidian-Vault — und werden nicht kopiert. Beim Kopieren entsteht eine zweite, unabhängige Sammlung. Auch das ist später umstellbar.',
      strategyNew: 'Neu anfangen (leerer Content-Ordner)',
      strategyCopy: 'Vorhandene Notizen kopieren',
      strategySymlink: 'Auf vorhandene Notizen verweisen (symbolischer Link)',
      sourceFolder: 'Quellordner (z. B. Obsidian-Vault)',
      sourceFolderHint: 'Der Ordner, in dem deine Markdown-Dateien liegen.',
      linkResolution: 'Wie sind deine [[Wikilinks]] geschrieben?',
      linkResolutionHint:
        'Muss zu deinen Notizen passen, sonst finden die Links ihr Ziel nicht. Obsidian benutzt in der Voreinstellung die kürzeste Form.',
      linkShortest: 'Kürzeste Form (wie Obsidian)',
      linkAbsolute: 'Absolut (vom Wurzelordner aus)',
      linkRelative: 'Relativ (von der aktuellen Notiz aus)',
      baseUrl: 'Basis-URL',
      baseUrlHint:
        'Die Adresse, unter der die Website später erreichbar ist — ohne https://. Wenn du sie noch nicht kennst, lass „localhost“ stehen und trage sie später unter Konfiguration nach.',
      useTemplate: 'Beispielvorlage mitinstallieren',
      useTemplateHint:
        'Eine fertige Gestaltung: gemessene Farben für hell und dunkel, drei eigene Seitenraster, selbst gehostete Schriften und jede Komponente einzeln gestaltet. Lässt sich hinterher überall ändern.',
      templateContent: 'Mit den Beispielseiten',
      templateContentHint:
        'Rund 270 Seiten, die die Vorlage selbst erklären — zu jeder Komponente die Seite, auf der sie beschrieben ist. Zum Nachschlagen gedacht; wenn du eigene Notizen mitbringst, lass sie weg.',
      templateContentHintCopy:
        'Nicht verfügbar: Die Notizen kommen aus dem gewählten Ordner. Die Beispielseiten würden gleichnamige Dateien daraus überschreiben — die Vorlage bringt eine eigene index.md mit.',
      templateContentHintSymlink:
        'Nicht verfügbar: Der Content-Ordner wird ein Link in den gewählten Ordner. Dorthin schreibt eine Vorlage nichts, damit fremde Notizen nicht in deinem Vault landen.',
      templateFailed: 'Das Projekt wurde angelegt, aber die Vorlage ließ sich nicht anwenden: {{detail}}',
      templateUnreadable: 'Das Paket ließ sich nicht lesen.',
      doneTitle: 'Projekt angelegt',
      doneWithWarnings: 'Das Projekt ist da. Beim Anwenden der Vorlage gab es aber etwas zu melden:',
      doneWithFailure: 'Das Projekt ist da und benutzbar. Die Vorlage ließ sich aber nicht anwenden:',
      toProject: 'Zum Projekt',
      creating: 'Erstelle… (Klonen und npm install dauern ein bis zwei Minuten)',
      create: 'Projekt anlegen',
      createFailed: 'Projekt konnte nicht erstellt werden.'
    }
  },
  projectLayout: {
    unsavedLeave: 'Änderungen verwerfen',
    unsavedSave: 'Speichern',
    unsavedWarning:
      'Auf dieser Seite gibt es Änderungen, die noch nicht gespeichert sind. Beim Wechseln gehen sie verloren. Trotzdem wechseln?',
    unsavedWarningWithSave:
      'Auf dieser Seite gibt es Änderungen, die noch nicht gespeichert sind. Was soll damit geschehen?',
    unsavedBadge: 'Nicht gespeichert',
    allProjects: 'Alle Projekte',
    navLabel: 'Projektbereiche',
    loading: 'Lade Projekt…',
    tabs: {
      overview: 'Übersicht',
      config: 'Konfiguration',
      layout: 'Layout',
      styles: 'Stile',
      plugins: 'Plugins',
      updates: 'Updates',
      server: 'Vorschau & Build',
      sync: 'Git-Sync',
      backups: 'Backups',
      publish: 'Veröffentlichen',
      templates: 'Vorlagen'
    },
    groups: {
      setup: 'Einrichtung',
      design: 'Gestaltung',
      publish: 'Veröffentlichung',
      maintenance: 'Wartung'
    },
    descriptions: {
      overview: 'Der Überblick über dieses Projekt: Server-Status, wichtigste Einstellungen und Schnellzugriffe auf alle Bereiche.',
      layout: 'Legt fest, welche Komponenten (z. B. Suche, Inhaltsverzeichnis, Navigation) wo auf der Seite erscheinen.',
      styles:
        'Alles zum Aussehen an einem Ort: Basisfarben und Schriften, Community-Themes, CSS-Variablen und eigenes CSS — in genau der Reihenfolge, in der sie sich gegenseitig überschreiben.',
      updates:
        'Bringt den Quartz-Kern und die installierten Plugins auf den neuesten Stand. Vor jedem Update wird automatisch ein Snapshot angelegt, über den sich der Stand unter Backups zurückholen lässt.',
      server: 'Zeigt deine Website lokal in der Vorschau an und erstellt bei Bedarf einen einmaligen Build zum Exportieren.',
      sync: 'Gleicht deine lokalen Änderungen mit dem Git-Repository ab: Hochladen (Push) und Herunterladen (Pull).',
      backups:
        'Snapshots deines ganzen Projekts — automatisch vor jeder größeren Änderung angelegt, jederzeit selbst auslösbar, vergleichbar und einzeln zurückholbar.'
    }
  },
  dashboard: {
    attention: {
      title: 'Handlungsbedarf',
      allGood: 'Nichts zu tun — Content, Git, CSS und Konfiguration sind in Ordnung.',
      serverError: 'Der Dev-Server ist mit einem Fehler beendet worden',
      contentTargetMissing: 'Der Content-Ordner zeigt ins Leere',
      contentMissing: 'Es gibt keinen Content-Ordner',
      gitConflicts: '{{count}} Datei im Konflikt',
      gitConflicts_other: '{{count}} Dateien im Konflikt',
      gitConflictsDetail: 'Bis der Konflikt gelöst ist, kann nicht gepusht werden.',
      gitInProgress: 'Ein {{operation}} ist angefangen und nicht abgeschlossen',
      scssError: 'Dein CSS lässt sich nicht übersetzen',
      line: 'Zeile {{line}}',
      noBaseUrl: 'Keine Basis-URL gesetzt',
      noBaseUrlDetail: 'Ohne sie schlägt der Build fehl, sobald Schriften selbst gehostet werden.'
    },
    contentTab: 'Content-Ordner',
    devServer: 'Dev-Server',
    noPreview: 'Keine Vorschau aktiv',
    startedAgo: 'Gestartet {{since}}',
    serverIdleHint: 'Startet die lokale Vorschau deiner Website.',
    start: 'Starten',
    stop: 'Stoppen',
    restart: 'Neu starten',
    site: 'Die Seite',
    pageTitle: 'Titel',
    baseUrl: 'Basis-URL',
    notSet: 'nicht gesetzt',
    locale: 'Sprache',
    contentFolder: 'Content-Ordner',
    notPresent: 'nicht vorhanden',
    targetMissing: 'Ziel fehlt',
    realFolderFiles: 'Eigener Ordner · {{count}} Datei',
    realFolderFiles_other: 'Eigener Ordner · {{count}} Dateien',
    openProjectFolder: 'Projektordner öffnen',
    git: {
      inProgress: '{{operation}} läuft',
      noRepo: 'Kein Git-Repository',
      noRepoHint: 'Dieses Projekt ist nicht unter Versionskontrolle.',
      noUpstream: 'ohne Remote-Branch',
      conflicts: '{{count}} Datei im Konflikt',
      conflicts_other: '{{count}} Dateien im Konflikt',
      uncommitted: 'noch nicht committete Änderungen'
    },
    plugins: {
      ofTotal: 'von {{total}} aktiv',
      disabled: '{{count}} deaktiviert',
      allEnabled: 'Alle aktiv'
    },
    design: {
      stockTheme: 'Quartz-Standard',
      frames: '{{count}} eigener Frame',
      frames_other: '{{count}} eigene Frames',
      stylesheets: '{{count}} Stylesheet',
      stylesheets_other: '{{count}} Stylesheets',
      cssOk: 'CSS übersetzt',
      cssError: 'CSS-Fehler',
      cssUnchecked: 'CSS ungeprüft'
    },
    build: {
      title: 'Build',
      never: 'Noch nie gebaut',
      neverHint: 'Es liegt noch kein Build-Ordner vor.',
      files: '{{count}} Datei',
      files_other: '{{count}} Dateien',
      run: 'Build ausführen',
      running: 'Baue…',
      done: 'Build fertig.',
      failed: 'Build fehlgeschlagen — die Ausgabe steht unter Vorschau & Build.'
    },
    publish: {
      targets: 'Ziel',
      targets_other: 'Ziele',
      none: 'Kein Ziel',
      noneHint: 'Noch kein Veröffentlichungsziel eingerichtet.'
    },
    updates: {
      checking: 'Prüfe auf Updates…',
      coreBehind: 'Kern veraltet',
      pluginsOnly: 'Plugins veraltet',
      allCurrent: 'Alles aktuell',
      unknown: 'Nicht prüfbar',
      pluginsBehind: '{{count}} Plugin veraltet',
      pluginsBehind_other: '{{count}} Plugins veraltet',
      pluginsCurrent: '{{count}} Plugin geprüft',
      pluginsCurrent_other: '{{count}} Plugins geprüft',
      checkFailed: '{{count}} Prüfung fehlgeschlagen',
      checkFailed_other: '{{count}} Prüfungen fehlgeschlagen'
    },
    backups: {
      states: 'Snapshot',
      states_other: 'Snapshots',
      newest: 'Zuletzt {{when}}',
      none: 'Noch keiner',
      noneHint: 'Vor jeder größeren Änderung wird automatisch einer angelegt.',
      save: 'Snapshot anlegen',
      saving: 'Lege an…'
    }
  },
  content: {
    currentFolder: 'Aktueller Content-Ordner',
    loading: 'Lade…',
    noFolder: 'Kein Content-Ordner gefunden.',
    symlinkBadge: 'Symbolischer Link',
    realFolderBadge: 'Echter Ordner',
    filesCount: '{{count}} Dateien',
    targetMissingSuffix: ' (Ziel existiert nicht)',
    changeSource: 'Quelle ändern…',
    dialogTitle: 'Content-Quelle ändern',
    dialogWarning:
      'Der bisherige Content-Ordner wird vor der Änderung beiseitegelegt statt gelöscht — unter Backups lässt er sich zurückholen.',
    newSourceFolder: 'Neuer Quellordner',
    strategy: 'Strategie',
    strategySymlink: 'Verknüpfen (symbolischer Link, z. B. auf ein Obsidian-Vault)',
    strategyCopy: 'Kopieren (echter Ordner)',
    progress: '{{processed}} / {{total}} Dateien kopiert…',
    applying: 'Wird angewendet…',
    apply: 'Übernehmen'
  },
  buildServer: {
    devServer: 'Dev-Server',
    devServerHint: 'Zeigt deine Website live im Browser an, mit automatischem Neuladen bei Änderungen — ideal zum Ausprobieren.',
    oneOffBuildHint: 'Erstellt einmalig die fertigen HTML-Dateien, z. B. um sie manuell hochzuladen oder zu prüfen, bevor du veröffentlichst.',
    port: 'Port',
    wsPort: 'WS-Port',
    remoteDevHost: 'Remote-Dev-Host (optional)',
    remoteDevHostPlaceholder: 'nur für Tunnel/Remote-Vorschau',
    start: 'Starten',
    restart: 'Neustarten',
    stop: 'Stoppen',
    serverOptions: 'Server-Einstellungen',
    optionsLocked: 'Zum Ändern zuerst den Server stoppen.',
    autoReload: 'lädt automatisch neu',
    startedAgo: 'Gestartet {{since}}',
    exitedWithCode: 'Der Server wurde unerwartet beendet (Code {{code}}).',
    exitedUnexpectedly: 'Der Server wurde unerwartet beendet.',
    livePreview: 'Live-Vorschau',
    reloadPreview: 'Vorschau neu laden',
    viewport: {
      label: 'Vorschaubreite',
      desktop: 'Desktop',
      tablet: 'Tablet',
      mobile: 'Mobil',
      full: 'volle Breite'
    },
    oneOffBuild: 'Einmaliger Build',
    serverLogLabel: 'Ausgabe des Vorschau-Servers',
    buildLogLabel: 'Ausgabe des Builds',
    building: 'Baue…',
    buildNow: 'Jetzt bauen',
    lastBuilt: 'Zuletzt gebaut {{when}}',
    neverBuilt: 'Noch nie gebaut',
    outputFiles: '{{count}} Datei',
    outputFiles_other: '{{count}} Dateien',
    openFolder: 'Ordner öffnen',
    exportDir: 'Ausgabeordner (optional)',
    exportDirPlaceholder: 'Standard: public/ im Projekt',
    exportDirShared: 'Gilt auch für Veröffentlichen — dort wird aus demselben Ordner hochgeladen.',
    exportDirWipes: 'Jeder Build leert diesen Ordner vorher vollständig.',
    exportDirForeign:
      'Achtung: In diesem Ordner liegen {{count}} Dateien, die nicht nach einem Build aussehen. Der nächste Build löscht sie unwiderruflich.',
    reset: 'Zurücksetzen',
    success: 'Erfolgreich',
    failed: 'Fehlgeschlagen',
    resultLine: '{{status}} in {{seconds}}s',
    discovery: {
      title: 'Laufende Server auf diesem Rechner',
      refresh: 'Aktualisieren',
      scanning: 'Suche laufende Server…',
      unavailable:
        'Auf diesem System lässt sich die Prozessliste nicht lesen. Ob Server laufen, ist damit unbekannt — nicht „keiner“.',
      partial_zero:
        'Für mindestens einen Prozess ließ sich nicht feststellen, welchen Port er hält. Es kann also ein Server laufen, der hier fehlt.',
      partial_one:
        'Ein Quartz-Server läuft auf diesem Rechner. Für mindestens einen weiteren Prozess ließ sich der Port nicht feststellen — die Liste kann unvollständig sein.',
      partial_other:
        '{{count}} Quartz-Server laufen auf diesem Rechner. Für mindestens einen weiteren Prozess ließ sich der Port nicht feststellen — die Liste kann unvollständig sein.',
      none: 'Es läuft kein Quartz-Server auf diesem Rechner.',
      found_one: 'Ein Quartz-Server läuft auf diesem Rechner.',
      found_other: '{{count}} Quartz-Server laufen auf diesem Rechner.',
      fromApp: 'Von dieser App',
      fromOutside: 'Außerhalb gestartet',
      unknownProject: 'Projekt unbekannt',
      notAnswering: 'antwortet nicht',
      stopServer: 'Server beenden',
      confirmOwn:
        'Server auf Port {{port}} beenden?\n\nEr gehört zu {{name}} und wurde von dieser App gestartet. Die Vorschau im Browser ist danach nicht mehr erreichbar.',
      confirmForeign:
        'Server auf Port {{port}} beenden?\n\nDieser Server wurde nicht von dieser App gestartet ({{name}}). Wer ihn gestartet hat — ein Terminal, ein anderes Fenster, eine frühere Sitzung —, arbeitet vielleicht gerade damit.',
      stopped: 'Der Server auf Port {{port}} wurde beendet.',
      stopFailed:
        'Der Server auf Port {{port}} konnte nicht beendet werden. Vielleicht war er schon weg, oder der Prozess gehört inzwischen jemand anderem.',
      portTaken:
        'Port {{ports}} ist belegt, aber von keinem erkennbaren Quartz-Server. Ein Start auf diesem Port wird scheitern.',
      warning:
        'Server, die außerhalb dieser App gestartet wurden, gehören jemand anderem — einem Terminal, einem zweiten Fenster, einer Sitzung, die hart beendet wurde. Die App beendet sie nie von sich aus; das Beenden ist hier jedes Mal eine Entscheidung.'
    }
  },
  gitSync: {
    title: 'Git-Sync',
    explainer:
      'Jeder Sync committet zuerst deine Änderungen (falls unten aktiviert), holt dann den Branch „{{branch}}“ von origin und pusht deinen aktuellen Branch — als Force-Push, so macht es die Quartz-CLI.',
    commitChanges: 'Änderungen vorher committen',
    commitMessage: 'Commit-Nachricht (optional)',
    commitMessagePlaceholder: 'Standard: „Quartz sync: <Datum>“',
    commitHint: 'Die {{count}} lokale Änderung wird committet.',
    commitHint_other: 'Alle {{count}} lokalen Änderungen werden in einem Commit zusammengefasst.',
    commitHintClean: 'Es gibt gerade nichts zu committen.',
    noCommitHint: 'Ohne Commit wird nur der bereits committete Stand gepusht bzw. geholt.',
    pullBranchWarning:
      'Pull holt immer den Branch „{{source}}“ von origin, unabhängig davon, welcher Branch hier ausgecheckt ist („{{branch}}“). Auf einem anderen Branch schlägt der Pull entweder fehl oder mischt Fremdes herein.',
    openOnGithub: 'Auf GitHub öffnen',
    pull: 'Pull',
    pullRunning: 'Pull läuft…',
    push: 'Push',
    pushRunning: 'Push läuft…',
    both: 'Push + Pull',
    bothRunning: 'Sync läuft…',
    success: 'Erfolgreich.',
    failed: 'Fehlgeschlagen.',
    createRepo: {
      title: 'Repository auf GitHub anlegen',
      asAccount: 'Wird unter dem Konto „{{login}}“ angelegt und als „origin“ eingetragen.',
      noToken: 'Dafür wird ein GitHub-Token mit „repo“-Berechtigung gebraucht — in den Einstellungen eintragen.',
      name: 'Repository-Name',
      private: 'Privat',
      privateHint:
        'GitHub Pages gibt es für private Repositories nur in den bezahlten Tarifen. Wenn die Website über GitHub Pages veröffentlicht werden soll, muss das Repository im kostenlosen Konto öffentlich sein — die Sichtbarkeit lässt sich auf GitHub später ändern.',
      action: 'Anlegen'
    },
    statusTitle: 'Stand des Repositorys',
    notARepo: 'Dieses Projekt ist kein Git-Repository — Sync ist hier nicht möglich.',
    noRemote: 'Kein „origin“-Remote konfiguriert. Push und Pull haben kein Ziel.',
    detached: 'Kein Branch ausgecheckt',
    detachedHint:
      'Dieses Projekt steht gerade auf einem einzelnen Commit statt auf einem Branch („detached HEAD“). Push und Pull haben so kein Ziel — wechsle mit git checkout auf einen Branch, bevor du synchronisierst.',
    noUpstream: 'Kein Upstream',
    noUpstreamHint: 'Dieser Branch hat keine Entsprechung auf dem Server — es lässt sich deshalb nicht sagen, wie viele Commits fehlen. Der erste Push legt sie an.',
    upToDate: 'Auf dem Stand des Remotes',
    ahead: '{{count}} Commit noch nicht hochgeladen',
    ahead_other: '{{count}} Commits noch nicht hochgeladen',
    behind: '{{count}} Commit noch nicht geholt',
    behind_other: '{{count}} Commits noch nicht geholt',
    clean: 'Keine lokalen Änderungen',
    changes: '{{count}} lokale Änderung',
    changes_other: '{{count}} lokale Änderungen',
    conflicts: '{{count}} Konflikt',
    conflicts_other: '{{count}} Konflikte',
    moreChanges: '… und {{count}} weitere',
    lastCommit: 'Letzter Commit',
    abortMerge: 'Merge abbrechen',
    refresh: 'Aktualisieren',
    inProgress: {
      merge: 'Ein Merge ist angefangen und nicht abgeschlossen.',
      rebase: 'Ein Rebase ist angefangen und nicht abgeschlossen.',
      'cherry-pick': 'Ein Cherry-Pick ist angefangen und nicht abgeschlossen.',
      revert: 'Ein Revert ist angefangen und nicht abgeschlossen.'
    },
    fileStatus: {
      added: 'neu',
      modified: 'geändert',
      deleted: 'gelöscht',
      renamed: 'umbenannt',
      copied: 'kopiert',
      untracked: 'unverfolgt',
      conflicted: 'Konflikt'
    },
    staged: 'vorgemerkt'
  },
  backups: {
    vsGitSync:
      'Ein Snapshot ist eine Kopie dieses Projekts, die nur diese App kennt: Sie bleibt im Projekt, wird nie hochgeladen und rührt deine eigene Git-Historie nicht an. Git-Sync ist zum Teilen da — dein Stand landet auf GitHub und damit auf anderen Rechnern. Ein Snapshot ist zum Zurückholen da — er stellt einen früheren Stand auf diesem Rechner wieder her, auch wenn das Projekt gar kein Git-Repository ist.',
    newHeading: 'Neuer Snapshot',
    newHint:
      'Ein Snapshot sichert alles, was dir in diesem Projekt gehört: Konfiguration, Plugin-Sperrdatei, Layout-Frames, eigene Stylesheets, Übersetzungen und Veröffentlichungsziele. Nicht enthalten sind node_modules, der Build-Ordner und installierte Plugin-Dateien — die entstehen beim nächsten Build ohnehin neu.',
    labelPlaceholder: 'Name (optional), z. B. „vor dem Theme-Wechsel“',
    create: 'Snapshot anlegen',
    created: 'Snapshot angelegt.',
    includeContent: 'Content-Ordner mitsichern',
    contentFolderHint: 'Ein echter Ordner mit Markdown-Dateien — klein genug, um immer mitzulaufen.',
    contentSymlinkHint:
      'Dein Content-Ordner ist mit einem Vault außerhalb des Projekts verknüpft. Der lässt sich nicht mitsichern — im Snapshot landet die Verknüpfung, keine einzige Notiz. Dein Vault ist deine eigene Datenquelle mit eigener Sicherung, und ein Snapshot würde ihn ohnehin nie überschreiben.',
    vaultNotCompared:
      'Notizen aus dem verknüpften Vault sind hier nicht dabei — verglichen wird alles außer dem Content-Ordner.',
    contentMissing: 'Es gibt keinen Content-Ordner, den man mitsichern könnte.',
    none: 'Noch keine Snapshots. Vor jedem Kern-Update, jeder Plugin-Änderung, jedem Content-Wechsel und jedem Vorlagen-Import wird automatisch einer angelegt.',
    compare: 'Vergleichen',
    close: 'Schließen',
    comparing: 'Vergleiche mit dem heutigen Stand…',
    identical: 'Keine Unterschiede zum heutigen Stand.',
    changeCount: '{{count}} Datei unterscheidet sich',
    changeCount_other: '{{count}} Dateien unterscheiden sich',
    noDiff: 'Kein Textunterschied (z. B. eine Binärdatei).',
    restoreAll: 'Alles wiederherstellen',
    restoreSelected: 'Auswahl wiederherstellen ({{count}})',
    restore: 'Wiederherstellen',
    restored: 'Wiederhergestellt.',
    export: 'Als ZIP exportieren',
    exported: 'Snapshot exportiert.',
    delete: 'Löschen',
    confirmDeleteAction: 'Snapshot löschen',
    confirmDelete: 'Diesen Snapshot endgültig löschen?',
    confirmRestoreAction: 'Wiederherstellen',
    confirmRestoreAll:
      'Das gesamte Projekt auf diesen Snapshot zurücksetzen?\n\nDateien, die es damals nicht gab, werden dabei gelöscht. Vom aktuellen Stand wird vorher automatisch ein Snapshot angelegt.',
    confirmRestoreFiles:
      '{{count}} ausgewählte Datei(en) auf den Stand dieses Snapshots zurücksetzen?\n\nVom aktuellen Stand wird vorher automatisch ein Snapshot angelegt.',
    resetProjectHead: 'Auch den Projekt-Commit auf {{commit}} zurücksetzen',
    resetProjectHeadHint:
      'Setzt zusätzlich die Git-Historie des Projekts zurück — nötig, wenn du ein Kern-Update rückgängig machst, sonst meldet die Updates-Seite weiterhin den neuen Stand. Wenn du diesen Commit schon gepusht hast, weicht dein lokaler Stand danach vom Remote ab.',
    status: {
      modified: 'geändert',
      addedSince: 'seitdem neu',
      removedSince: 'seitdem gelöscht'
    },
    kinds: {
      manual: 'Von dir',
      configChange: 'Vor Konfigurations-Änderung',
      coreUpdate: 'Vor Kern-Update',
      pluginChange: 'Vor Plugin-Änderung',
      contentChange: 'Vor Content-Wechsel',
      restore: 'Vor Wiederherstellung',
      styleChange: 'Vor Gestaltungs-Import',
      imported: 'Altes Config-Backup'
    },
    movedFoldersHeading: 'Beiseitegelegte Content-Ordner',
    movedFoldersHint:
      'Beim Wechsel des Content-Ordners wird der bisherige hierher verschoben statt gelöscht. Das ist kein Backup deiner Notizen: ein verknüpfter Vault wurde nie kopiert, nur die Verknüpfung selbst notiert.',
    confirmRestoreFolderAction: 'Ordner einsetzen',
    confirmRestoreFolder: 'Diesen Content-Ordner wieder einsetzen? Der aktuelle wird dabei ebenfalls beiseitegelegt.',
    confirmDeleteFolderAction: 'Ordner löschen',
    confirmDeleteFolder:
      'Diesen beiseitegelegten Content-Ordner endgültig löschen ({{size}})?\n\nEs ist die einzige Kopie: In den Snapshots ist er nicht enthalten, und rückgängig machen lässt sich das nicht.',
    folderSize: '{{count}} Datei · {{size}}',
    folderSize_other: '{{count}} Dateien · {{size}}',
    folderLink: 'Nur der Link auf {{target}} — die Notizen liegen dort und wurden nie kopiert.'
  },
  settings: {
    title: 'Einstellungen',
    subtitle: 'Gilt für die App als Ganzes — projektbezogene Einstellungen stehen im jeweiligen Projekt.',
    githubTokenStored: 'gespeichert — zum Ersetzen neu eingeben',
    defaultProjectDirectory: 'Standard-Projektverzeichnis',
    language: 'Sprache',
    languageSystem: 'Systemsprache folgen',
    languageDe: 'Deutsch',
    languageEn: 'English',
    appearance: {
      title: 'Erscheinungsbild',
      description: 'Wie die App aussieht und in welcher Sprache sie mit dir spricht.',
      theme: 'Design',
      themeLight: 'Hell',
      themeDark: 'Dunkel',
      themeSystem: 'Systemeinstellung',
      appliedImmediately: 'Design und Sprache werden sofort übernommen und gespeichert.'
    },
    projects: {
      title: 'Projekte',
      description: 'Wo die Ordner-Dialoge starten, wenn du ein Projekt öffnest oder anlegst.',
      mustBeAbsolute: 'Das ist kein vollständiger Pfad. Er muss mit „/“ oder „~/“ beginnen — oder wähle den Ordner aus.'
    },
    github: {
      title: 'GitHub',
      description:
        'Hebt das Rate-Limit im Plugin- und Theme-Marktplatz an und wird zum Anlegen von Repositories und zum Einrichten von GitHub Pages gebraucht.',
      token: 'Persönlicher Zugriffstoken',
      saveAndCheck: 'Speichern & prüfen',
      valid: 'Gültig',
      rejected: 'Abgelehnt',
      rejectedHint: 'GitHub akzeptiert diesen Token nicht — abgelaufen oder zurückgezogen.',
      checking: 'Prüfe…',
      unknown: 'Nicht prüfbar',
      unknownHint: 'GitHub war nicht erreichbar — ob der Token gilt, ist damit offen.',
      recheck: 'Erneut prüfen',
      remove: 'Token entfernen',
      scopeHint:
        'Für den Marktplatz genügt ein Token ganz ohne Berechtigungen. Zum Anlegen von Repositories und für GitHub Pages wird der Scope „repo“ benötigt. Der Token wird verschlüsselt im Schlüsselbund deines Systems abgelegt.'
    },
    connections: {
      title: 'Zugänge',
      description:
        'Server-Logins und Build-Hooks, die du zum Veröffentlichen brauchst. Sie gehören zur App, nicht zu einem Projekt — dasselbe Webspace-Konto kann mehrere Websites tragen, und ein Passwortwechsel ist damit eine Änderung statt einer pro Projekt.',
      empty: 'Noch keine Zugänge angelegt.',
      addSsh: '+ SFTP / SSH',
      addFtp: '+ FTP',
      addWebhook: '+ Webhook',
      noSecret: 'kein Passwort/Key',
      plaintext: 'unverschlüsselt',
      usedBy_one: 'von {{count}} Projekt verwendet',
      usedBy_other: 'von {{count}} Projekten verwendet',
      confirmDelete: 'Diesen Zugang löschen?\n\nDas hinterlegte Passwort bzw. der Key wird dabei mitgelöscht und lässt sich nicht wiederherstellen.',
      confirmDeleteAction: 'Zugang löschen',
      confirmDeleteInUse_one:
        'Dieser Zugang wird von {{count}} Projekt verwendet.\n\nNach dem Löschen zeigt dessen Veröffentlichungsziel ins Leere. Trotzdem löschen?',
      confirmDeleteInUse_other:
        'Dieser Zugang wird von {{count}} Projekten verwendet.\n\nNach dem Löschen zeigen deren Veröffentlichungsziele ins Leere. Trotzdem löschen?',
      targetHint:
        'Wohin genau ein Projekt damit veröffentlicht — Serverpfad, Branch, Ausschlüsse — legst du im Projekt unter „Veröffentlichen“ fest.'
    },
    quit: {
      title: 'Beim Beenden',
      description: 'Was mit einem laufenden Dev-Server passiert, wenn du die App schließt.',
      label: 'Laufende Dev-Server',
      ask: 'Fragen',
      keep: 'Weiterlaufen lassen',
      stop: 'Beenden',
      hint: {
        ask: 'Läuft beim Beenden ein Server, fragt die App, was mit ihm geschehen soll.',
        keep: 'Server laufen weiter und bleiben im Browser erreichbar. Beim nächsten Start fragt die App, ob sie beendet werden sollen — und die Seite „Vorschau & Build“ listet sie.',
        stop: 'Server werden beim Beenden ohne Rückfrage gestoppt.'
      }
    },
    runtime: {
      title: 'Laufzeit',
      description: 'Womit die App Quartz und npm ausführt.',
      label: 'Node-Laufzeit',
      embedded: 'In der App',
      system: 'Vom System',
      inUseEmbedded: 'Im Einsatz: Node {{node}} und npm {{npm}} aus der App — nichts muss dafür installiert sein.',
      inUseSystem: 'Im Einsatz: Node {{node}} von diesem Rechner.',
      noSystemNode: 'nicht gefunden',
      hintSwitchable: 'Auf diesem Rechner liegt Node {{node}}. Umschalten lohnt sich nur, wenn ein Paket beim Installieren erst kompiliert werden muss — die Fehlermeldung nennt dann node-gyp, und dafür bringt die eingebettete Laufzeit nicht alles mit.',
      hintNoHostNode: 'Auf diesem Rechner ist kein Node gefunden worden. „Vom System“ würde Builds, Plugins und neue Projekte deshalb scheitern lassen.',
      hintSystem: 'Quartz verlangt Node 22 oder neuer. Ein Projekt bringt außerdem eine .node-version mit — nvm, fnm, asdf und mise lösen die pro Ordner auf, die Laufzeit kann hier also je Projekt eine andere sein.',
      gitBundled: 'git {{version}} aus der App — auf diesem Rechner läuft keines, deshalb bringt QuartzControl eines mit.',
      gitHost: 'git {{version}} von diesem Rechner. Die App bringt zwar eines mit, benutzt es aber nur, wenn keines da ist — deine eigene Einrichtung (~/.gitconfig, Zugangshelfer) gilt so weiter.',
      gitLicense: 'git steht unter der GPL v2; der vollständige Lizenztext liegt in der App.',
      gitSource: 'Quelltext ansehen',
      appliesToNewProcesses: 'Gilt für Vorgänge, die danach starten. Ein laufender Dev-Server behält seine Umgebung, bis er neu gestartet wird.'
    },
    maintenance: {
      title: 'Daten & Wartung',
      description: 'Was die App außerhalb deiner Projekte ablegt.',
      cache: 'Theme-Dokumentation',
      cacheSize_one: '{{count}} Eintrag · {{size}}',
      cacheSize_other: '{{count}} Einträge · {{size}}',
      cacheHint:
        'Beschriftungen und Beschreibungen der Optionen von Community-Themes, einmal von GitHub geholt und dauerhaft aufbewahrt. Leeren erzwingt ein erneutes Laden.',
      clearCache: 'Cache leeren',
      clearing: 'Leere…',
      storage: 'Speicherort',
      storageHint: 'Hier liegen Projektliste, Einstellungen und die verschlüsselten Zugänge.',
      reveal: 'Im Finder zeigen',
      unreadableTitle: 'Eine gespeicherte Datei war nicht lesbar',
      unreadableHint:
        'Beim Start konnte QuartzControl eine seiner Dateien nicht lesen — vermutlich, weil die App beim Speichern hart beendet wurde. Sie wurde zur Seite gelegt statt überschrieben; was darin stand (etwa Zugänge oder die Projektliste), fehlt in der App und muss neu angelegt werden.'
    }
  },
  configEditor: {
    tabs: {
      site: 'Website',
      content: 'Content-Ordner',
      localization: 'Übersetzungen'
    },
    descriptions: {
      site: 'Grundeinstellungen deiner Website — Titel, Adresse und Sprache.',
      content: 'Der Ordner mit deinen Markdown-Notizen — als echte Kopie oder verknüpft mit einem bestehenden Ordner, z. B. deinem Obsidian-Vault.',
      localization:
        'Feste Textbausteine der Website (z. B. „Suche“, „Zuletzt geändert“) in den verfügbaren Sprachen. Nur Kern-Texte — eigene Plugin-Texte werden hier nicht erfasst.'
    },
    loadError: 'quartz.config.yaml konnte nicht gelesen werden.',
    loadErrorHint:
      'Existiert die Datei im Projektordner? Ein neu erstelltes Projekt braucht dafür einen erfolgreich durchgelaufenen Setup-Assistenten.',
    loading: 'Lade Konfiguration…',
    themeMoved:
      'Farben und Schriften sind zu den Stilen umgezogen — dort bilden sie die Basis-Ebene, auf der Themes, Variablen und eigenes CSS aufbauen.',
    themeMovedLink: 'Zu den Stilen'
  },
  projectImage: {
    label: 'Projektbild',
    choose: 'Bild wählen…',
    replace: 'Bild ersetzen…',
    remove: 'Bild entfernen',
    fileFilter: 'Bilder (PNG, JPEG)',
    defaultHint:
      'Ohne eigenes Bild zeigt die App den Anfangsbuchstaben, und die Seite bekommt das Standard-Icon von Quartz. PNG oder JPEG, quadratisch am besten.',
    customHint: 'Liegt als quartz/static/icon.png im Projekt, {{width}} × {{height}} Pixel.',
    faviconOn: 'Das Favicon der Seite wird beim nächsten Build aus diesem Bild erzeugt.',
    faviconOff: 'Das Favicon-Plugin ist ausgeschaltet — die Seite bekommt daraus kein Favicon.',
    faviconMissing: 'Das Favicon-Plugin ist nicht installiert — die Seite bekommt daraus kein Favicon.',
    faviconLink: 'Zu den Plugins',
    announceSet: 'Projektbild gesetzt.',
    announceCleared: 'Projektbild entfernt, das ursprüngliche Icon ist wieder da.'
  },
  siteSettings: {
    pageTitle: 'Seitentitel',
    pageTitleHint: 'Der Name deiner Website. Er steht im Browser-Tab, im RSS-Feed und meist oben in der Seitenleiste.',
    pageTitleSuffix: 'Titel-Zusatz',
    pageTitleSuffixHint: 'Wird im Browser-Tab hinter den Titel der einzelnen Seite gehängt, z. B. „ · Mein Wiki“. Auf der Seite selbst erscheint er nicht.',
    baseUrl: 'Basis-URL',
    baseUrlHint:
      'Die Adresse, unter der die Website später erreichbar ist — ohne https://, z. B. notizen.example.com. Links, RSS-Feed und Vorschaubilder werden daraus gebaut; ohne sie schlägt der Build fehl, sobald Schriften selbst ausgeliefert werden.',
    locale: 'Sprache der Website',
    spa: 'Seitenwechsel ohne Neuladen',
    spaHint:
      'Beim Klick auf einen internen Link wird nur der Inhalt ausgetauscht statt die ganze Seite neu geladen. Das fühlt sich schneller an; ohne JavaScript funktioniert die Website trotzdem.',
    popovers: 'Vorschau beim Zeigen auf einen Link',
    popoversHint: 'Zeigt beim Überfahren eines internen Links ein kleines Fenster mit dem Anfang der Zielseite.',
    ignorePatterns: 'Notizen ausschließen (ein Muster pro Zeile)',
    ignorePatternsHint:
      'Dateien und Ordner im Content-Ordner, die gar nicht erst in die Website kommen — z. B. privat/** oder *.excalidraw.md. Betrifft nur diesen Build, nicht das Veröffentlichen.',
    localeHint: 'Bestimmt die festen Textbausteine der Website (Suche, Zuletzt geändert, …). Zur Auswahl stehen die Sprachdateien, die dieses Projekt mitbringt.',
    localeHintFree: 'Bestimmt die festen Textbausteine der Website (Suche, Zuletzt geändert, …). Format: Sprache-Land, z. B. de-DE.',
    localeUnknownSuffix: '(nicht im Projekt)',
    analyticsHeading: 'Statistik',
    analyticsDescription:
      'Bindet das Zählskript eines Anbieters in jede Seite ein. Ohne Anbieter wird nichts geladen und nichts gemessen.',
    analyticsProvider: 'Anbieter',
    analyticsNone: 'Keine Statistik',
    analyticsMissing: 'Noch auszufüllen, sonst kann das Skript nichts senden: {{fields}}',
    analyticsFields: {
      host: 'Nur bei selbst gehosteter Instanz — sonst leer lassen',
      hostRequired: 'Adresse deiner Installation, z. B. https://analytics.example.com',
      tagId: 'Mess-ID, z. B. G-XXXXXXX',
      websiteId: 'ID der Website im Konto des Anbieters',
      scriptSrc: 'Abweichende Skript-URL',
      apiKey: 'Projekt-API-Key',
      siteId: 'ID der Website im Konto des Anbieters',
      projectId: 'Projekt-ID'
    }
  },
  themeEditor: {
    goToThemeTab: 'Zu den Community-Themes',
    overrideChecking: 'Prüfe, welche dieser Werte das aktive Theme überschreibt…',
    overrideCounted:
        'Das Theme „{{themeId}}“ überschreibt {{colors}} von {{totalColors}} Farben und {{fonts}} von {{totalFonts}} Schriften — diese sind unten abgeblendet.',
    overrideStillEditable:
        'Bearbeiten geht trotzdem: die Werte gelten wieder, sobald das Theme aus ist, und lassen sich jederzeit im Variablen-Tab gezielt überschreiben.',
    overriddenByTheme: 'Wird vom aktiven Theme überschrieben',
    overriddenShort: 'Theme',
    fontSource: 'Font-Quelle',
    googleFonts: 'Google Fonts',
    googleFontsHint: 'Quartz holt die gewählten Schriften bei Google. Wie sie ausgeliefert werden, entscheidet der Schalter unten.',
    localHint: 'Quartz lädt dann gar nichts — die Schrift muss selbst vorliegen, z. B. über „Eigene Schriftart importieren“ unten.',
    local: 'Selbst mitgebracht',
    fontFor: 'Schriftart ({{slot}})',
    delivery: {
      heading: 'Schrift-Auslieferung',
      description:
        'Lokal ausliefern heißt: Quartz lädt die Schriftdateien einmal beim Build herunter und legt sie unter static/fonts ab. Die Seite ruft dann nichts mehr bei Google auf — das ist die DSGVO-freundliche Variante.',
      selfHost: 'Schriften lokal ausliefern (kein Google-Aufruf beim Besuch)',
      baseUrlMissing:
        'Dafür muss eine Basis-URL gesetzt sein (Konfiguration → Basis-URL) — die Schrift-URLs werden darauf umgeschrieben, sonst bricht der Build ab.',
      state: {
        core: {
          google: 'Quartz-Kern: verlinkt Google Fonts direkt.',
          selfHosted: 'Quartz-Kern: lädt beim Build herunter und liefert lokal aus.'
        },
        plugin: {
          google: 'Plugin „Fonts“: verlinkt Google Fonts direkt.',
          selfHosted: 'Plugin „Fonts“: lädt beim Build herunter und liefert lokal aus.'
        },
        theme: {
          cdn: 'Community-Theme: lädt seine Schriften von unpkg.com.'
        }
      },
      themeFonts: 'Theme-eigene Schriften laden',
      themeFontsHint:
        'Das Theme bringt eigene Schriften mit und lädt sie von unpkg.com — auch das ist ein Aufruf bei Dritten. Lokal ausliefern lässt sich das nicht; ausschalten heißt, die Schriften des Themes wegzulassen, dann greifen die Schriftarten von oben.',
      themeFontsOff:
        'Die Schriften des Themes sind abgeschaltet — es wird nichts bei unpkg.com geladen, dafür sieht das Theme anders aus als vorgesehen.'
    },
    localFontHeading: 'Eigene Schriftart importieren',
    localFontDescription: 'Lädt eine .ttf/.otf/.woff/.woff2-Datei ins Projekt und erzeugt die passende @font-face-Regel in custom.scss.',
    localFontPick: 'Datei auswählen…',
    localFontFamily: 'Font-Familienname',
    localFontSlot: 'Direkt verwenden für',
    localFontNoSlot: '— keins —',
    localFontConfirm: 'Importieren',
    fontImportSuccess: '„{{family}}“ importiert.',
    fontImportDetected: '„{{family}}“ importiert — Gewicht {{weight}} aus der Datei gelesen.',
    fontImportDetectedItalic: '„{{family}}“ importiert — Gewicht {{weight}}, kursiv, aus der Datei gelesen.',
    fontImportUndetected:
      '„{{family}}“ importiert. Die Datei nennt kein Gewicht, die Regel bleibt deshalb ohne — bei Bedarf in custom.scss ergänzen.',
    colors: 'Farben'
  },
  themes: {
    loading: 'Lade Community-Themes…',
    disableAll: 'Community-Themes deaktivieren',
    allDisabled: 'Community-Themes deaktiviert',
    active: {
      title: 'Aktuelles Theme',
      none: 'Kein Community-Theme aktiv — es gilt das klassische Theme aus „Konfiguration → Theme“. Installiere unten eines aus dem Katalog, um loszulegen.',
      heading: 'Aktuelles Theme: {{themeId}}',
      saveAsPreset: 'Als Preset speichern',
      presetNamePlaceholder: 'Name für das Preset',
      overrideNote:
        'Dieses Plugin ({{source}}) überschreibt die Farben aus der Basis-Ebene. Änderungen unten wirken sich direkt auf die Vorschau aus.',
      disabledHeading: 'Community-Theme deaktiviert ({{themeId}})',
      disabledNote:
        'Es gilt jetzt wieder das klassische Theme aus „Konfiguration → Theme“. Die Einstellungen dieses Community-Themes bleiben erhalten und lassen sich jederzeit wieder aktivieren.',
      reactivate: 'Wieder aktivieren',
      checkingStyleSettings: 'Prüfe Style-Settings des Themes…',
      noStyleSettingsNote:
        'Das Theme {{themeId}} bietet keine eigenen Farbeinstellungen an — hier lässt sich für dieses Theme nichts anpassen. Das liegt am Theme selbst, nicht an dieser App: Änderungen würden von Quartz schlicht ignoriert.',
      styleSettingsHeading: 'Style-Settings ({{ids}})',
      ownValuesHint:
        'Hier stehen nur die Optionen, die das Theme selbst mitbringt. Eigene Werte für einzelne CSS-Variablen gehören in den Variablen-Tab oder ins eigene CSS.',
      goToVariables: 'Zu den Variablen →'
    },
    presets: {
      title: 'Meine Presets',
      description:
        'Eigene, gespeicherte Anpassungen eines Basis-Themes. Um ein neues Theme zu erstellen: unten im Katalog ein Basis-Theme installieren & aktivieren, oben anpassen, dann als Preset speichern.',
      none: 'Noch keine Presets gespeichert.',
      basisLabel: '(Basis: {{base}})',
      active: 'Aktiv',
      apply: 'Anwenden',
      saveSettings: 'Einstellungen speichern',
      delete: 'Löschen'
    },
    catalog: {
      title: 'Katalog',
      description:
        'Vorgefertigte Farbschemata aus dem @quartz-themes-Ökosystem (installiert und aktiviert das Plugin @quartz-themes/core mit dem gewählten Theme).',
      searchPlaceholder: 'Theme suchen (z. B. tokyo-night, catppuccin, nord)…',
      refresh: 'Neu laden',
      refreshing: 'Lädt…',
      unavailable:
        'Die Theme-Liste konnte nicht von npm geladen werden. Unten stehen nur ein paar bekannte Themes als Platzhalter — mit „Neu laden“ nochmal versuchen.',
      installing: 'Installiere…',
      install: 'Installieren & aktivieren',
      active: 'Aktiv',
      noResults: 'Keine Treffer.',
      moreResults: '{{count}} weitere Treffer — weiter tippen zum Filtern.',
      installSuccess: '„{{id}}“ installiert und aktiviert — nicht vergessen, oben auf „Speichern“ zu klicken.',
      installFailed: 'Installation von „{{id}}“ fehlgeschlagen: {{output}}',
      detailLoading: 'Lade Details…',
      detailNone: 'Keine Details verfügbar.',
      modes: 'Modi: {{modes}}',
      variations: 'Varianten: {{variations}}',
      customColorsLabel: 'Eigene Farben anpassbar: {{value}}',
      yes: 'Ja',
      no: 'Nein',
      fonts: 'Schriftarten: {{fonts}}',
      github: 'GitHub: {{text}}'
    }
  },
  plugins: {
    tabs: {
      installed: 'Installiert',
      marketplace: 'Marktplatz'
    },
    descriptions: {
      installed: 'Erweitert Quartz um zusätzliche Funktionen — hier siehst du, was aktiv ist, und stellst es ein.',
      marketplace: 'Der Plugin-Katalog der quartz-community-Organisation, inklusive der mitgelieferten. Plugins von anderswo fügst du über „owner/repo“ hinzu.'
    }
  },
  pluginsInstalled: {
    searchPlaceholder: 'Plugins filtern…',
    filters: {
      all: 'Alle',
      active: 'Aktiv',
      inactive: 'Inaktiv'
    },
    countActive: '{{active}} von {{total}} aktiv',
    countFiltered: '{{visible}} von {{total}} angezeigt',
    reorderDisabledByFilter:
      'Solange gefiltert wird, ist das Umsortieren abgeschaltet — die Reihenfolge würde sonst auch die ausgeblendeten Einträge verschieben.',
    noMatches: 'Kein Plugin passt zu Filter und Suche.',
    none: 'Keine Plugins installiert.',
    framesHeading: 'Eigene Frames',
    framesDescription:
      'Im Layout-Editor gebaute Seitengerüste. Quartz registriert jedes davon als Plugin — deshalb stehen sie hier — eingestellt werden sie aber im Layout-Editor.',
    frameBadge: 'Frame',
    enabledSwitch: '„{{name}}“ aktiv',
    frameSource: 'Eigener Frame aus dem Layout-Editor',
    frameSummary: '{{count}} Bereiche',
    openInLayoutEditor: 'Im Layout-Editor',
    componentsHeading: 'Sichtbare Komponenten',
    componentsDescription: 'Diese Plugins sind sichtbar auf der Seite — z. B. im Kopfbereich, in der Seitenleiste oder im Footer.',
    processingHeading: 'Verarbeitung',
    processingDescription:
      'Diese Plugins verändern deine Inhalte im Hintergrund (z. B. Formatierung, Links, Bilder) und erscheinen selbst nicht sichtbar auf der Seite. Seitentypen — Plugins, die eine eigene Art von Seite erzeugen, z. B. Tag-Seiten — werden unten separat aufgeführt.',
    pageTypesGroup: 'Seitentypen',
    otherProcessingGroup: 'Transformer, Filter & Emitter',
    dragHint: 'Ziehen zum Umsortieren',
    dragHandle: 'Umsortieren: {{name}}',
    savedAnnounce: 'Einstellungen von {{name}} gespeichert.',
    reorderedAnnounce: '{{name}} ist jetzt an Position {{position}} von {{total}}.',
    moveUp: 'Nach oben: {{name}}',
    moveDown: 'Nach unten: {{name}}',
    updateAvailable: 'Update verfügbar',
    savedFlash: 'Gespeichert',
    maintenanceHeading: 'Wartung',
    maintenanceDescription:
      'Betrifft die gebauten Dateien der Plugins, die du aus einer Quelle installiert hast — nicht das, was die Website kann. Sie gehören nicht ins Repository und müssen auf einem zweiten Rechner erst wiederhergestellt werden.',
    installFromLock: 'Aus quartz.lock.json wiederherstellen',
    installFromLockRunning: 'Stelle wieder her…',
    installDone: 'Plugins aus der Lockdatei wiederhergestellt.',
    prune: 'Verwaiste Plugin-Ordner entfernen',
    pruneRunning: 'Räume auf…',
    pruneDone: 'Verwaiste Plugin-Ordner entfernt.',
    pruneConfirmAction: 'Ordner entfernen',
    pruneConfirm:
      'Entfernt alle gebauten Plugin-Ordner, auf die keine Konfiguration mehr zeigt. Die Konfiguration selbst bleibt unverändert. Fortfahren?',
    openRepo: 'Repository auf GitHub öffnen',
    showOptions: 'Optionen anzeigen',
    hideOptions: 'Optionen einklappen',
    removeConfirm: 'Plugin „{{name}}“ wirklich entfernen? Vorher wird automatisch ein Snapshot angelegt, über den du es zurückholen kannst.',
    removeFrameConfirm:
      'Frame „{{name}}“ wirklich löschen? Das entfernt ihn aus der Konfiguration und von der Festplatte. Vorher wird automatisch ein Snapshot angelegt.',
    availableOptions: 'Verfügbare Optionen:',
    onlyViaYaml: ', nur per YAML',
    noSchemaInfo:
      'Für mitgelieferte Plugins liefert Quartz keine Options-Beschreibung mit — bekannte Optionen lassen sich deshalb nicht auflisten. Vorhandene Werte kannst du hier ändern, weitere unten von Hand anlegen (Namen siehe Plugin-Repository).',
    optionKeyPlaceholder: 'Option',
    optionValuePlaceholder: 'Wert',
    addOption: 'Anlegen',
    optionKeyExists: 'Diese Option ist bereits gesetzt.',
    optionValueHint: 'true/false und Zahlen werden als solche gespeichert, [..] und {..} als JSON, alles andere als Text.',
    removeOption: 'Option „{{name}}“ entfernen',
    notSet: 'nicht gesetzt',
    summaryPosPriority: 'position: {{position}} · priority: {{priority}}',
    summaryOrder: 'order: {{order}}',
    layoutFields: {
      position: 'header = Kopfbereich, left/right = Sidebar, beforeBody/afterBody = um den Inhalt herum, footer = Fußzeile',
      priority: 'Reihenfolge innerhalb der Position — kleiner zuerst',
      display: 'all = alle Geräte, mobile-only = nur mobil, desktop-only = nur Desktop',
      condition:
        'Mitgeliefert: not-index, has-tags, has-backlinks, has-toc. Ein unbekannter Name wird beim Build ignoriert, das Element erscheint dann immer.',
      group: 'Name einer Toolbar-Gruppe, z. B. „toolbar“'
    },
    groupOptionsFields: {
      grow: 'Element wächst, um freien Platz in der Gruppe zu füllen',
      shrink: 'Element darf bei Platzmangel schrumpfen',
      basis: 'Flex-Basisgröße, z. B. „auto“ oder „100px“',
      order: 'Reihenfolge innerhalb der Gruppe — kleiner zuerst',
      align: 'CSS align-items, z. B. „center“',
      justify: 'CSS justify-content, z. B. „space-between“'
    }
  },
  pluginDescriptions: {
    'created-modified-date': 'Ermittelt Erstellungs-, Änderungs- und Veröffentlichungsdatum aus Frontmatter, Git-Historie oder Dateisystem.',
    'syntax-highlighting': 'Hebt Code-Blöcke farblich hervor.',
    'obsidian-flavored-markdown': 'Unterstützt Obsidian-spezifische Markdown-Syntax (Wikilinks, Callouts, Embeds, …).',
    'github-flavored-markdown': 'Erweitert Markdown um GitHub-Funktionen wie Fußnoten, Tabellen und Tasklisten.',
    'table-of-contents': 'Erzeugt ein Inhaltsverzeichnis für jede Seite.',
    'crawl-links': 'Verarbeitet Links, damit sie auf die richtigen Zielseiten zeigen.',
    description: 'Erzeugt Beschreibungstexte für Meta-Tags, RSS und Listenansichten.',
    latex: 'Fügt LaTeX-Unterstützung für mathematische Formeln hinzu.',
    citations: 'Fügt Unterstützung für Zitate und Literaturverweise hinzu.',
    'hard-line-breaks': 'Wandelt einzelne Zeilenumbrüche in harte Umbrüche um (Obsidian-Verhalten).',
    'ox-hugo': 'Unterstützt mit ox-hugo exportierte Markdown-Dateien.',
    roam: 'Unterstützt aus Roam Research exportierte Notizen.',
    'quartz-fonts': 'Steuert Schriftarten pro Überschriftenebene, inkl. Google-Fonts-Integration.',
    core: 'Wendet das gewählte Theme (Farben, Typografie, Darstellung) auf die Seite an.',
    'remove-draft': 'Blendet Seiten mit „draft: true“ im Frontmatter aus.',
    'explicit-publish': 'Veröffentlicht nur Seiten, die im Frontmatter explizit mit „publish: true“ markiert sind.',
    'unlisted-pages':
      'Blendet Seiten mit „unlisted: true“ aus allen Listen (Suche, Graph, Explorer, …) aus — bleiben aber über die URL erreichbar.',
    'encrypted-pages': 'Verschlüsselt einzelne Seiten passwortgeschützt (AES-256-GCM).',
    'stacked-pages': 'Öffnet interne Links als nebeneinander gestapelte Panes (Andy-Matuschak-Stil).',
    'alias-redirects': 'Erzeugt Weiterleitungsseiten für Alias-URLs.',
    'content-index': 'Erzeugt RSS-Feed, Sitemap und die contentIndex.json für Suche und Graph.',
    favicon: 'Erzeugt das Favicon aus quartz/static/icon.png.',
    'og-image': 'Erzeugt Social-Media-Vorschaubilder (Open-Graph-Images) pro Seite.',
    cname: 'Schreibt eine CNAME-Datei für eine eigene Domain.',
    'canvas-page': 'Rendert Obsidian-Canvas-Dateien als interaktive, zoombare Seiten.',
    'content-page': 'Erzeugt die vollständige HTML-Seite für jede Markdown-Datei.',
    'folder-page': 'Erzeugt Übersichtsseiten für Ordner mit mehreren Inhalten.',
    'tag-page': 'Erzeugt eine eigene Seite je Tag.',
    'bases-page': 'Rendert Obsidian-Bases-(.base)-Dateien als Tabellen-, Karten- oder Listenansichten.',
    explorer: 'Datei-Baum-Navigation in der Seitenleiste.',
    graph: 'Interaktive Graph-Visualisierung der verlinkten Notizen.',
    search: 'Volltextsuche über alle Inhalte.',
    backlinks: 'Zeigt Seiten an, die auf die aktuelle Seite verlinken.',
    'article-title': 'Zeigt den Seitentitel als Überschrift über dem Inhalt.',
    'content-meta': 'Zeigt Metadaten wie Erstellungsdatum und Lesezeit unter dem Titel.',
    'tag-list': 'Zeigt die Tags einer Seite als klickbare Liste.',
    'page-title': 'Zeigt den Website-Titel als Link zur Startseite, meist in der Seitenleiste.',
    darkmode: 'Umschalter für Hell-/Dunkelmodus.',
    'reader-mode': 'Ablenkungsfreier Lesemodus.',
    breadcrumbs: 'Zeigt den Navigationspfad (Breadcrumbs) oberhalb des Inhalts.',
    comments: 'Bindet ein Kommentarsystem ein (z. B. giscus, utterances).',
    footer: 'Zeigt eine Fußzeile mit konfigurierbaren Links.',
    'recent-notes': 'Zeigt zuletzt geänderte Notizen an.',
    spacer: 'Flexibler Platzhalter, der Elemente in einer Toolbar-Gruppe auseinanderschiebt.',
    'note-properties': 'Zeigt ausgewählte Frontmatter-Eigenschaften in einem einklappbaren Panel.',
    assets: 'Kopiert alle Nicht-Markdown-Dateien (Bilder, Videos, …) in die Ausgabe.',
    static: 'Kopiert statische Ressourcen wie Schriften und feste Bilder in die Ausgabe.',
    'component-resources': 'Bindet die CSS- und JS-Ressourcen ein, die Theme und Components benötigen.'
  },
  layoutEditor: {
    title: 'Layout-Editor',
    templateCustomPlaceholder: 'z. B. Startseite mit Seitenleiste',
    tabGlobal: 'Global',
    tabPageTypes: 'Seitentypen',
    tabFrames: 'Eigene Frames',
    pageTypesHint: 'Wähle einen Seitentyp, um ihn anzupassen.',
    pageTypeHasOverride: 'Angepasst',
    loading: 'Lade Layout…',
    emptySlot: 'Leer — hierher ziehen',
    activeFrameLabel: 'Zeigt Grid-Struktur von: {{name}}',
    activeFrameDefault: '(Standard-Raster)',
    previewPageTypeLabel: 'Grid-Vorschau für:',
    breakpoints: {
      title: 'Breakpoints',
      tablet: 'Tablet bis (px)',
      mobile: 'Mobil bis (px)',
      saved: 'Gespeichert',
      invalid: 'Mobil muss kleiner als Tablet sein (240–3840 px).',
      hint: 'Ab welcher Fensterbreite deine eigenen Frames auf das Tablet- bzw. Mobil-Layout umschalten. Quartz’ eingebaute Frames (Standard, Volle Breite, Minimal) und Community-Themes bringen eigene Werte mit und folgen diesen hier nicht. Vorgabe ist 1200 / 800 — dieselben Werte, die Quartz benutzt.'
    },
    groupLabel: 'Gruppe',
    displayLabel: 'Sichtbarkeit',
    noGroup: '— keine —',
    displayAll: 'Immer',
    displayDesktopOnly: 'Nur Desktop',
    displayMobileOnly: 'Nur Mobil',
    groupsPanel: {
      title: 'Flex-Gruppen',
      description:
        'Komponenten mit derselben Gruppe stehen nebeneinander (oder untereinander) statt einzeln untereinander.',
      none: 'Keine Flex-Gruppen definiert.',
      newGroupPlaceholder: 'Name der neuen Gruppe',
      add: 'Hinzufügen',
      direction: 'Anordnung',
      directionRow: 'Nebeneinander',
      directionRowReverse: 'Nebeneinander, rückwärts',
      directionColumn: 'Untereinander',
      directionColumnReverse: 'Untereinander, rückwärts',
      gap: 'Abstand',
      priority: 'Priorität',
      priorityPlaceholder: 'optional',
      delete: 'Löschen'
    },
    pageTypes: {
      '404': '404-Seite',
      content: 'Inhaltsseiten',
      folder: 'Ordnerseiten',
      tag: 'Tag-Seiten',
      canvas: 'Canvas-Seiten',
      bases: 'Bases-Seiten'
    },
    removeOverride: 'Override entfernen',
    excludeHeading: 'Sichtbare Komponenten',
    excludeDescription: 'Schalte eine Komponente aus, um sie auf Seiten dieses Typs auszublenden.',
    excludeDuplicateHint: 'Betrifft alle {{count}} Instanzen von „{{name}}“ — Quartz kann einzelne Duplikate hier nicht getrennt ausschließen.',
    excludeDeadHint_one: 'In der Datei steht noch der Ausschluss „{{names}}“ aus einer früheren Fassung. Er wirkt nicht und verschwindet beim nächsten Speichern dieses Seitentyps.',
    excludeDeadHint_other: 'In der Datei stehen noch {{count}} Ausschlüsse aus einer früheren Fassung ({{names}}). Sie wirken nicht und verschwinden beim nächsten Speichern dieses Seitentyps.',
    template: 'Frame',
    templateDefault: 'Standard',
    templateFullWidth: 'Volle Breite',
    templateMinimal: 'Minimal',
    templatePluginDefault: '„{{frame}}“ (Plugin-Standard, aktiv)',
    pluginFrameUnknownLayout:
      'Dieser Seitentyp benutzt automatisch das Frame „{{frame}}“ aus dem zugehörigen Plugin. Wie es aufgebaut ist, weiß nur das Plugin selbst — deshalb gibt es hier keine Vorschau.',
    clearSlotsHeading: 'Bereiche für diesen Seitentyp leeren',
    clearSlotsDescription: 'Aktivierte Bereiche bleiben für diesen Seitentyp immer leer, unabhängig von der globalen Belegung.',
    frameBuilder: {
      whatIsAFrame:
        'Ein Frame ist das Raster einer Seite: Es legt fest, welche Bereiche es gibt — Kopfbereich, Seitenleisten, Inhalt, Fußzeile —, wo sie liegen und wie breit sie sind. Was in diesen Bereichen erscheint, entscheidest du im Tab „Global“; welcher Seitentyp welchen Frame benutzt, im Tab „Seitentypen“. Quartz bringt drei Frames mit (Standard, Volle Breite, Minimal). Hier baust du eigene.',
      description: 'Die eigenen Frames dieses Projekts.',
      newFrame: 'Neuer Frame',
      none: 'Noch keine eigenen Frames erstellt.',
      gridSummary: '{{rows}}×{{cols}}-Raster, {{areas}} Bereich(e)',
      frameName: 'Frame-Name',
      rows: 'Zeilen',
      cols: 'Spalten',
      rowGap: 'Zeilenabstand',
      columnGap: 'Spaltenabstand',
      gridSection: 'Raster',
      boxSection: 'Rahmen',
      appliesTo: 'Werte für {{breakpoint}}',
      maxWidth: 'Maximalbreite',
      maxWidthPlaceholder: 'keine',
      align: 'Ausrichtung',
      alignOption: {
        left: 'Links',
        center: 'Zentriert',
        right: 'Rechts'
      },
      paddingBlock: 'Innenabstand oben/unten',
      paddingInline: 'Innenabstand links/rechts',
      boxHint:
        'Gilt nur für diesen Breakpoint. Der Rahmen ist nie breiter als die Maximalbreite; die Ausrichtung verteilt den übrigen Platz. Innenabstände liegen zwischen Rahmenkante und Inhalt.',
      boxHintNoMaxWidth:
        'Gilt nur für diesen Breakpoint. Ohne Maximalbreite nutzt der Rahmen die volle Fensterbreite. Die Ausrichtung wirkt erst mit einer Maximalbreite — vorher bleibt nichts zu verteilen.',
      saved: 'Gespeichert',
      closeEditor: 'Editor schließen',
      resetTracks: 'Spurgrößen zurücksetzen',
      columnSizesLabel: 'Spaltenbreiten (leer = 1fr)',
      rowSizesLabel: 'Zeilenhöhen (leer = auto)',
      lineNamesLabel: 'Benannte Grid-Lines (optional)',
      lineNamesHint:
        'Braucht der Editor nicht — die Bereiche platzierst du hier per Ziehen. Namen wie „sidebar-start“ sind nur nützlich, wenn du diese Linien später in eigenem CSS ansprechen willst.',
      columnLinesLabel: 'Spalten-Lines',
      rowLinesLabel: 'Zeilen-Lines',
      copyLayoutTo: 'Auf {{target}} kopieren',
      breakpointLabel: 'Breakpoint',
      breakpoint: {
        desktop: 'Desktop',
        tablet: 'Tablet',
        mobile: 'Mobil'
      },
      availableAreasLabel: 'Verfügbare Bereiche (ins Raster ziehen, um sie zu platzieren)',
      newArea: '+ Bereich hinzufügen',
      allPlaced: 'Alle Bereiche sind platziert.',
      hintDragToPlace:
        'Ziehe einen Bereich auf eine freie Zelle, um ihn zu platzieren — oder einen platzierten Bereich zurück in diese Liste, um ihn wieder zu lösen. Ein Klick öffnet seine Einstellungen dort, wo er gerade liegt; Zeilen- und Spalten-Spanne gibt es nur für einen platzierten Bereich.',
      expandArea: 'Bereichseinstellungen aufklappen',
      placeArea: 'Bereich {{name}} platzieren',
      moveArea: 'Bereich {{name}} verschieben',
      cellName: 'Zelle Zeile {{row}}, Spalte {{col}}',
      areaName: 'Bereichsname',
      areaSlot: 'Belegung',
      slotNone: 'Keine (leer)',
      ownGroup: 'Eigener Bereich',
      ownGroupShort: 'eigen',
      hiddenShort: 'ausgeblendet',
      ownGroupHint:
        'Zeigt nur die Komponenten, die im Reiter „Global“ hierher gezogen werden. Ohne das zeigt der Bereich alles, was die Belegung sonst noch hat.',
      ownGroupRenamed:
        'Hält die Gruppe „{{group}}“. Beim Umbenennen bleibt der Gruppenname stehen, damit die im Reiter „Global“ zugeordneten Komponenten hier bleiben.',
      rowSpanLabel: 'Zeilen-Spanne',
      colSpanLabel: 'Spalten-Spanne',
      removeArea: 'Bereich löschen',
      unplace: 'Aus Raster lösen',
      visibleOnBreakpoint: 'Sichtbar auf {{breakpoint}}',
      overlapError: 'Dieser Bereich überschneidet sich mit einem bestehenden Bereich.',
      unassignedWarning: 'Nicht zugewiesen: {{slots}}. Komponenten für diese Positionen werden in diesem Frame nicht angezeigt.',
      homelessWarning:
        'Ohne einfachen Bereich: {{slots}}. Was dieser Belegung gehört und in keinem eigenen Bereich liegt, erscheint auf keiner Seite.',
      doubledWarning:
        'Doppelt belegt: {{slots}}. Jeder dieser Bereiche zeigt dieselben Komponenten, sie erscheinen also mehrfach auf der Seite.',
      neverVisibleWarning: 'Auf keinem Breakpoint sichtbar: {{areas}}. Diese Bereiche werden nirgends gerendert.',
      nameRequired: 'Bitte einen Frame-Namen vergeben.',
      areaNameCollision:
        'Zwei Bereiche heißen „{{names}}“. Ein Bereichsname darf nur einmal vorkommen — sonst verliert das Frame sein ganzes Raster, nicht nur einen Bereich.',
      areaGroupCollision:
        'Zwei Bereiche derselben Belegung halten die Gruppe „{{names}}“. Beide zeigten dann dieselben Komponenten, also doppelt auf jeder Seite.',
      nameCollision: 'Dieser Name ist bereits vergeben (ein eingebautes Frame oder ein anderes eigenes).',
      deleteFrame: 'Diesen Frame löschen',
      deleteConfirmAction: 'Frame löschen',
      deleteConfirm: 'Frame „{{name}}“ wirklich löschen? Seitentypen, die ihn benutzen, fallen dann auf das Standard-Frame zurück.',
      preview: {
        pageContent: 'Seiteninhalt'
      }
    },
    componentPill: {
      paletteLabel: 'Komponente hinzufügen',
      paletteDropToRemove: 'Hier ablegen zum Entfernen',
      paletteHint: 'Ziehe eine Komponente auf einen Bereich, um eine weitere Instanz mit eigenen Einstellungen einzufügen.',
      dragHandle: 'Zum Verschieben ziehen',
      duplicate: 'Duplizieren',
      removeDuplicate: 'Duplikat entfernen'
    }
  },
  styles: {
    fixes: {
      heading: 'Bekannte Konflikte',
      description:
        'Konflikte zwischen Plugins, die sich nicht über eine Einstellung lösen lassen, sondern nur im CSS. Der Fix wird als ganz normale Datei unter „Eigenes CSS“ angelegt — dort bearbeitbar, verschiebbar und löschbar.',
      add: 'Fix anlegen',
      open: 'Datei öffnen',
      alreadyAdded: 'Angelegt als {{file}}',
      'heading-fonts': {
        title: 'Überschriften folgen nicht dem Theme',
        summary:
          'Das Plugin „Fonts“ setzt die Schrift für Überschriften so, dass sie gegen das Theme und gegen dein eigenes CSS gewinnt. Der Fix stellt sie auf die Variablen von hier zurück.',
        comment:
          'Das Plugin @quartz-community/quartz-fonts setzt "h1,…,h6 { font-family: … }" ungelayert.\nUngelayert schlägt jedes @layer — also auch das aktive Theme —, und weil die Datei nach\ncustom.scss geladen wird, gewinnt sie auch gegen eine gleich spezifische Regel von dir.\n"body h1" ist eine Stufe spezifischer und gewinnt deshalb unabhängig von der Reihenfolge.\n\nDie Verweise auf die Variablen sorgen dafür, dass der Variablen-Tab wieder die Kontrolle hat.\nAngelegt von QuartzControl — frei bearbeitbar.'
      }
    },
    tabs: {
      basics: 'Basis',
      theme: 'Community-Themes',
      variables: 'Variablen',
      customCss: 'Eigenes CSS'
    },
    cascade: {
      themeActive:
        'Reihenfolge: Basis → Community-Theme → Variablen → eigenes CSS. Das Theme „{{themeId}}“ ist aktiv und überschreibt die Basisfarben.',
      themeInactive:
        'Reihenfolge: Basis → Community-Theme → Variablen → eigenes CSS. Kein Community-Theme aktiv — es gelten deine Basis-Farben und -Schriften.',
      overrides: '{{count}} Variable(n) überschrieben.'
    },
    scssStale:
      'custom.scss wurde inzwischen von einem anderen Tab geändert (Variablen-Überschreibung oder Font-Import). Dein Entwurf hier ist noch ungespeichert — Speichern würde diese Änderung überschreiben.',
    scssStaleReload: 'Von Festplatte neu laden (Entwurf verwerfen)',
    styleSettings: {
      sourceNote:
        'Beschreibungen aus dem Original-Theme „{{theme}}“ von {{author}} — {{count}} Optionen.',
      searchPlaceholder: 'Option suchen…',
      loading: 'Lade Beschreibungen zu den Optionen…',
      refresh: 'Doku neu laden',
      unavailable:
        'Zu diesem Theme sind keine Beschreibungen auffindbar — es hat keinen Eintrag im Obsidian-Theme-Verzeichnis oder bringt keinen @settings-Block mit. Darum hier nur die rohen Schalter.',
      themeDefault: '— Theme-Standard —',
      reset: 'Zurücksetzen'
    },
    variables: {
      mainHeading: 'Hauptvariablen',
      mainDescription:
        'Die Variablen, die Quartz selbst aus den Grundfarben ableitet. Zeile aufklappen zeigt, woher der Wert kommt und was daran hängt.',
      allHeading: 'Alle Theme- und Build-Variablen',
      allDescription:
        'Alles, was das aktive Theme, Plugins oder der letzte Build an Variablen mitbringen — getrennt von den Hauptvariablen, weil es sehr viele werden können.',
      allDescriptionTheme:
        'Alles, was das Theme „{{themeId}}“, Plugins oder der letzte Build mitbringen: {{count}} Variablen. Suche eingeben, um darin zu blättern.',
      counter: '{{overridden}} von {{total}} überschrieben',
      searchPlaceholder: 'Variable suchen (z. B. callout, h1, background)…',
      onlyChanged: 'Nur geänderte',
      searchHint: 'Suchbegriff eingeben, um in {{count}} Variablen zu suchen.',
      noResults: 'Keine Treffer.',
      moreResults: '{{count}} weitere Treffer — weiter tippen zum Eingrenzen.',
      noSources: 'Keine zusätzlichen Variablen gefunden.',
      noTheme: 'Es ist kein Community-Theme installiert.',
      noBuild: 'Es gibt noch keinen Build-Output — einmal bauen, dann hier neu einlesen.',
      reload: 'Neu einlesen',
      reset: 'Zurücksetzen',
      resetToOriginal: 'Auf Originalwert zurücksetzen',
      light: 'Hell',
      dark: 'Dunkel',
      chainToggle: 'Herkunft und Abhängigkeiten anzeigen',
      unresolved: 'nicht auflösbar (nur in einem Selektor gesetzt)',
      dependents: '{{count}} abhängig',
      dependentsWarning: 'Ein eigener Wert hier wirkt sich auf {{count}} weitere Variablen aus.',
      dependentsNone: 'Keine andere Variable verweist hierauf.',
      usesNone: 'Verweist auf keine andere Variable — der Wert steht direkt hier.',
      moreKeys: '+{{count}} weitere',
      chipHint: 'Zu dieser Variable springen',
      themeNote:
        'Deine Werte hier gewinnen gegen das Theme „{{themeId}}“, auch wo es dieselbe Variable setzt. Die Ausnahme sind Farben, die ein Theme nur für eine Art von Element setzt — Callouts etwa; die änderst du unter „Eigenes CSS“.',
      section: {
        current: 'Aktueller Wert',
        origin: 'Herkunft',
        uses: 'Verwendet diese Variablen',
        dependents: 'Wird von diesen Variablen verwendet',
        edit: 'Eigener Wert'
      },
      groupChanged: '{{count}} geändert',
      groups: {
        baseColors: 'Grundfarben',
        surfaces: 'Flächen',
        text: 'Text',
        interaction: 'Bedienelemente',
        baseScale: 'Grauwert-Skala',
        fonts: 'Schriften',
        navigation: 'Navigation',
        tags: 'Tags',
        other: 'Sonstiges',
        accentHsl: 'Akzentfarbe (H/S/L)'
      },
      origin: {
        core: 'Quartz-Kern',
        theme: 'Community-Theme',
        build: 'Letzter Build',
        user: 'Von dir'
      }
    }
  },
  styleEditor: {
    openExternally: 'Extern öffnen',
    importFile: 'Datei importieren…',
    componentPlaceholder: 'Komponente wählen…',
    componentHint: 'Fügt einen Selektor für die gewählte Komponente an der Cursor-Position ein.',
    insertSelector: 'Selektor einfügen',
    referenceHeading: 'Original-Styles (nur lesend)',
    files: {
      heading: 'Ladereihenfolge',
      description:
        'Quartz bindet nur custom.scss ein — alles andere wird von dort aus geladen, und zwar in dieser Reihenfolge. Später geladene Dateien überschreiben frühere; custom.scss selbst kommt immer zuletzt.',
      alwaysLast: 'immer zuletzt',
      moveUp: 'Nach oben',
      moveDown: 'Nach unten',
      rename: 'Umbenennen',
      delete: 'Löschen',
      deleteConfirm: 'Wirklich löschen',
      create: 'Neue Datei',
      createConfirm: 'Anlegen',
      namePlaceholder: 'Dateiname (z. B. typografie)',
      orphansHeading: 'Vorhanden, aber nicht eingebunden',
      include: 'Einbinden',
      unsaved: 'Ungespeicherte Änderungen',
      saveActive: 'Datei speichern',
      closeTab: 'Tab schließen'
    },
    check: {
      ok: 'SCSS kompiliert fehlerfrei.',
      failed: 'SCSS-Fehler — der Build würde fehlschlagen:',
      location: 'In {{file}}, Zeile {{line}} öffnen',
      locationExternal: 'In {{file}}, Zeile {{line}} (nicht hier bearbeitbar)',
      recheck: 'Erneut prüfen',
      checkActive: 'Code prüfen',
      running: 'Prüfe…',
      unavailable: 'SCSS-Prüfung nicht möglich: {{reason}}'
    },
    current: {
      colors: 'Aktuell geltende Farben',
      fonts: 'Aktuell geltende Schriften',
      variable: 'Variable',
      sample: 'Aa Bb Cc 123 — Beispieltext',
      notInstalled: 'nicht installiert',
      notInstalledExplainer:
        '„Nicht installiert“ heißt: die Schrift liegt auf diesem Rechner nicht vor und die App lädt nichts aus dem Netz — die Probe zeigt die Ersatzschrift, nicht die echte.',
      italic: 'kursiv',
      noFace: 'keine @font-face-Regel gefunden',
      familyDefault: '(Standardstärke)',
      noLoader:
        'Es lädt nichts Schriften nach: verfügbar ist nur, was ein aktives Theme mitbringt oder was du per @font-face deklarierst.',
      loader: {
        core: {
          google: 'Quartz lädt bei jedem Seitenaufruf von Google Fonts: {{specs}}.',
          selfHosted: 'Quartz lädt beim Build von Google und liefert die Dateien selbst aus: {{specs}}.'
        },
        plugin: {
          google: 'Das Plugin „Fonts“ lädt bei jedem Seitenaufruf von Google Fonts.',
          selfHosted: 'Das Plugin „Fonts“ lädt beim Build und liefert die Dateien selbst aus.'
        },
        theme: {
          cdn: 'Das Community-Theme lädt seine eigenen Schriften bei jedem Seitenaufruf von unpkg.com.'
        }
      }
    },
    cssVars: {
      heading: 'Verfügbare CSS-Variablen',
      description:
        'Diese Variablen sind an dieser Stelle nutzbar (z. B. var(--text-normal)). Die Werte zeigen den aktuellen Stand aus der Basis-Ebene, hell/dunkel.',
      goToVariables: 'Variablen überschreiben →',
      searchPlaceholder: 'Variable suchen…',
      insertHint: 'Klicken fügt die Variable an der Cursor-Position ein — ⌥ + Klick kopiert sie.',
      insertValueHint: 'Klicken fügt {{value}} ein — ⌥ + Klick kopiert.',
      insertValueLabel: '--{{key}}: Wert für {{mode}} einfügen',
      insertValue: 'Wert einfügen',
      rowHint: 'Jeder Klick fügt an der Cursor-Position ein: der Name als var(--name), ein Farbfeld als Wert. ⌥ + Klick kopiert stattdessen.',
      calloutsGroup: 'Callout-Typen',
      copyHint: 'Klicken, um {{value}} zu kopieren',
      discoveredGroup: 'Im Build-Output gefunden',
      noResults: 'Keine Treffer.',
      calloutsHeading: 'Callout-Farben',
      calloutsDescription:
        'Jeder Callout-Typ ([!note], [!warning], …) hat eigene --color/--border/--bg-Variablen — aber nur innerhalb von .callout[data-callout="…"] gültig, kein globales var(--color). Klick fügt das passende Grundgerüst mit den echten Werten ein.',
      calloutsInsertHint: 'Klicken, um das Override-Grundgerüst für diesen Callout-Typ einzufügen.'
    }
  },
  localization: {
    none: 'Keine Locale-Dateien gefunden (quartz/i18n/locales fehlt).',
    searchPlaceholder: 'Nach Schlüssel oder Text suchen…',
    unsavedCount: '{{count}} ungespeichert',
    saveError: 'Speichern fehlgeschlagen.',
    noResults: 'Keine Treffer.',
    advancedBadge: 'JS',
    gitAttributesOk: 'Update-Schutz aktiv',
    gitAttributesMissing: 'Update-Schutz nicht aktiv',
    gitAttributesExplain:
      'Deine Formulierungen stehen in Quartz’ eigenen Dateien. Der Schutz sorgt dafür, dass ein Kern-Update sie nicht überschreibt; eingerichtet wird er beim nächsten Speichern automatisch.',
    gitAttributesEnable: 'Jetzt aktivieren'
  },
  updates: {
    upToDate: 'Aktuell',
    updateAvailable: 'Update verfügbar',
    checkFailed: 'Nicht prüfbar',
    recheck: 'Erneut prüfen',
    core: {
      heading: 'Quartz-Kern',
      commits: 'Installiert: {{current}} · Neueste Version: {{latest}}',
      runUpdate: 'Update durchführen',
      confirm:
        'Quartz-Kern aktualisieren?\n\nDabei werden Änderungen von jackyzha0/quartz geholt und die Abhängigkeiten neu installiert; bei Konflikten kann Handarbeit nötig sein.\n\nVorher wird automatisch ein Snapshot angelegt — unter Backups holst du den jetzigen Stand jederzeit zurück.',
      abortMerge: 'Merge abbrechen',
      openSnapshot: 'Snapshot von vor dem Update öffnen →',
      conflictHeading: 'Konflikte in folgenden Dateien (außer den durch .gitattributes geschützten Locale-Dateien):'
    },
    plugins: {
      heading: 'Plugins',
      hint: 'Zeigt nur Plugins, die du über den Marktplatz oder per Kommandozeile hinzugefügt hast. Eingebaute Plugins (die meisten in einem neuen Projekt) werden automatisch mit dem Quartz-Kern oben aktualisiert.',
      updateAll: 'Alle aktualisieren',
      update: 'Aktualisieren',
      local: 'Lokal',
      none: 'Keine über den Marktplatz oder per Kommandozeile hinzugefügten Plugins gefunden.'
    },
    snapshots: {
      heading: 'Snapshots',
      movedHint:
        'Vor jedem Kern- und Plugin-Update wird automatisch ein Snapshot angelegt. Verwaltet werden sie unter Backups — dort liegen auch die Snapshots aller anderen Bereiche.',
      openBackups: 'Zu den Backups →'
    }
  },
  publish: {
    title: 'Veröffentlichen',
    description: 'Baut das Projekt und bringt das Ergebnis an seine Ziele — per SFTP/rsync, FTP, in einen Ordner, auf einen Git-Branch oder über einen Webhook.',
    baseUrlWarning: 'configuration.baseUrl steht noch auf „{{baseUrl}}“ — vor dem Veröffentlichen auf die echte Domain setzen.',
    connectionVsTarget:
      'Ein Zugang ist die Anmeldung bei einem Anbieter und gehört der App; ein Ziel gehört zu diesem Projekt und sagt, wohin das Ergebnis soll.',
    targetHeading: 'Ziel',
    newConnectionOfKind: '+ Neuer {{kind}}-Zugang',
    connectionKindFixed:
      'Die Art des Zugangs ergibt sich aus der Art des Ziels: dieses Ziel braucht einen {{kind}}-Zugang. Andere Arten legst du in den Einstellungen an.',
    manageConnections: 'Zugänge verwalten',
    manageConnectionsHere: 'Zugänge in den Einstellungen verwalten →',
    newTarget: '+ Neues Ziel',
    confirmDiscardTargetDraftAction: 'Änderungen verwerfen',
    confirmDiscardTargetDraft:
      'Am geöffneten Ziel gibt es ungespeicherte Änderungen. Wer jetzt wechselt, verliert sie.',
    confirmDeleteTargetAction: 'Ziel löschen',
    confirmDeleteTarget: 'Dieses Veröffentlichungsziel wirklich löschen? Der hinterlegte Zugang bleibt bestehen.',
    noTargets: 'Noch kein Veröffentlichungsziel angelegt. Über „+ Neues Ziel“ eines anlegen — z. B. GitHub Pages, einen Webspace per SFTP oder einen lokalen Ordner.',
    confirmDeployAction: 'Jetzt veröffentlichen',
    confirmDeployBranch:
      'Auf den Branch „{{branch}}“ veröffentlichen?\n\nDer Branch wird dabei vollständig durch den aktuellen Build ersetzt (force-push).',
    branchHint: {
      github:
        'Schiebt den Build als einzelnen Commit auf den Branch des „origin“-Remotes (dasselbe wie bei Git-Sync). In den Repository-Einstellungen muss GitHub Pages auf diesen Branch zeigen.',
      codeberg:
        'Codeberg Pages liefert den Branch „pages“ direkt aus — nach dem ersten Push ist die Seite ohne weitere Einstellungen erreichbar.',
      gitlab:
        'Achtung: Bei GitLab veröffentlicht der Branch allein noch nichts — dort muss ein CI-Job die Dateien als „public“-Artefakt ausliefern. Der Push funktioniert trotzdem.'
    },
    pages: {
      title: 'GitHub Pages',
      reload: 'Status neu laden',
      noGithubOrigin: 'Das „origin“-Remote dieses Projekts zeigt nicht auf github.com. Pages lässt sich von hier aus erst einrichten, wenn das Repository auf GitHub liegt — siehe Git-Sync.',
      notConfigured: 'Für dieses Repository sind noch keine Pages eingerichtet. Mit dem Knopf unten wird Pages angelegt und auf diesen Branch gestellt.',
      source: 'Quelle: {{branch}}',
      status: {
        built: 'Veröffentlicht',
        building: 'Wird gebaut',
        errored: 'Fehlgeschlagen',
        unknown: 'Noch nie gebaut'
      },
      cname: 'Eigene Domain',
      cnamePlaceholder: 'z. B. wiki.example.com',
      httpsEnforced: 'HTTPS erzwingen',
      httpsOnlyWithDomain:
        'Nur mit eigener Domain einstellbar. Eine Adresse auf github.io wird ohnehin immer über HTTPS ausgeliefert.',
      apply: 'Auf „{{branch}}“ stellen',
      saveSettings: 'Einstellungen speichern',
      cnameHint:
        'Die Domain wird bei GitHub gespeichert, nicht im Branch — anders als eine CNAME-Datei überlebt sie damit jedes Deploy, das den Branch vollständig ersetzt. HTTPS lässt sich erst erzwingen, wenn GitHub das Zertifikat ausgestellt hat; das dauert nach dem Setzen der Domain einige Minuten.'
    },
    sftpHint:
      'SFTP vergleicht den Build mit einer lokalen Liste dessen, was zuletzt hochgeladen wurde. Dateien, die jemand direkt auf dem Server ändert oder löscht, bleiben dabei unbemerkt.',
    rsyncHint:
      'rsync fragt den Server selbst, was dort liegt — der Diff stimmt also auch dann, wenn dort jemand von Hand etwas geändert hat. Setzt voraus, dass rsync auf dem Server installiert ist.',
    rsyncBlocked: {
      'no-connection': 'rsync steht zur Verfügung, sobald ein SSH-Zugang mit Schlüsseldatei oder SSH-Agent gewählt ist.',
      'password-auth': 'rsync ist mit Passwort-Anmeldung nicht möglich — ssh kann das Passwort nicht entgegennehmen. Mit Schlüsseldatei oder SSH-Agent geht es.',
      'key-not-a-file':
        'rsync braucht den privaten Schlüssel als Datei; ein hier eingefügter Schlüsseltext reicht nicht. Den Zugang auf eine Schlüsseldatei umstellen.',
      'no-pinned-host-key':
        'rsync braucht einen bestätigten Host-Key. Einmal über SFTP veröffentlichen — dabei wird der Fingerprint abgefragt und gespeichert — danach lässt sich rsync wählen.',
      'platform-unsupported':
        'rsync gibt es auf diesem Betriebssystem nicht. SFTP überträgt dieselben Dateien, nur ohne den Abgleich mit dem Server.',
      'not-installed':
        'Auf diesem Rechner ist kein rsync installiert. Unter Debian und Ubuntu: sudo apt install rsync. SFTP überträgt bis dahin dieselben Dateien, nur ohne den Abgleich mit dem Server.'
    },
    webhookNoUrl: 'keine URL hinterlegt',
    webhookExplainer:
      'Ein Webhook lädt keine Dateien hoch, sondern stößt einen Build beim Anbieter an (Netlify, Cloudflare Pages, Vercel, CI). Deshalb gibt es hier keine Dateiliste — der Build läuft dort, nicht hier.',
    deleteDisabledHint: 'Löschen ist für dieses Ziel deaktiviert — entfernte Dateien bleiben dort liegen, werden aber weiter mitgezählt.',
    targetForm: {
      heading: 'Veröffentlichungsziel',
      explainer:
        'Ein Ziel beschreibt, wohin dieses Projekt veröffentlicht — Pfad, Löschverhalten und welcher Zugang dafür benutzt wird. Der Zugang selbst gilt appweit und kann von mehreren Projekten benutzt werden.',
      name: 'Name',
      type: 'Art',
      remotePath: 'Remote-Pfad',
      remotePathPlaceholder: 'z. B. httpdocs oder /var/www/example.com',
      remotePathHint:
        'Der Ordner auf dem Server, in den die Website kommt. Ohne führenden Schrägstrich zählt er ab dem Anmeldeverzeichnis — bei einem Webspace ist das der Normalfall.',
      remotePathError: {
        empty: 'Ohne Zielordner kann nichts veröffentlicht werden.',
        'whole-root': 'Das Anmeldeverzeichnis selbst geht nicht — mit aktiviertem Löschen würde es geleert. Gib den Unterordner an, in dem die Website liegt.',
        traversal: 'Ein Pfad mit „..“ ist nicht erlaubt.'
      },
      transfer: 'Übertragung',
      transferSftp: 'SFTP (Datei für Datei)',
      transferRsync: 'rsync (schneller, vergleicht mit dem Server)',
      typeFolder: 'Ordner',
      typeWebhook: 'Webhook',
      typeGitBranch: 'Git-Branch',
      provider: 'Anbieter',
      branch: 'Branch',
      folderPath: 'Zielordner',
      connection: 'Zugang',
      pickConnection: '— Zugang wählen —',
      deleteRemoved: 'Entfernte Dateien auch im Ziel löschen',
      excludes: 'Nie veröffentlichen (ein Pfad pro Zeile)',
      excludesPlaceholder: 'z. B. .htaccess\nstats/'
    },
    noSecretWarning: '(kein Passwort/Key hinterlegt)',
    hostKeyPinned: 'Host-Key bestätigt',
    hostKeyUnknown: 'Host-Key noch nicht bestätigt — wird beim ersten Verbinden abgefragt',
    forgetHostKey: 'Host-Key vergessen',
    confirmForgetHostKeyAction: 'Host-Key vergessen',
    confirmForgetHostKey:
      'Gespeicherten Host-Key für {{host}} verwerfen?\n\nBeim nächsten Verbinden wird der Fingerprint erneut abgefragt. Nur tun, wenn der Server nachweislich neu aufgesetzt wurde.',
    ftpPlaintextWarning: 'FTP überträgt Passwort und Dateien im Klartext. Ohne FTPS kann jeder im selben Netz mitlesen — falls dein Anbieter es unterstützt, unbedingt aktivieren (oder besser SFTP nutzen).',
    confirmDeployWebhook:
      'Webhook „{{target}}“ auslösen?\n\nDabei werden keine Dateien übertragen — der Anbieter wird nur aufgefordert, selbst zu bauen.',
    confirmDeployConnection:
      'Nach {{target}} veröffentlichen?\n\n{{uploads}} Datei(en) werden hochgeladen, {{deletions}} Datei(en) werden auf dem Server gelöscht.',
    connectionForm: {
      heading: 'Zugang',
      explainer:
        'Zugangsdaten werden verschlüsselt im Schlüsselbund des Systems abgelegt und gelten appweit — nicht nur für dieses Projekt.',
      name: 'Name',
      host: 'Host',
      port: 'Port',
      username: 'Benutzername',
      authMethod: 'Authentifizierung',
      authPassword: 'Passwort',
      authPrivateKey: 'Privater Schlüssel',
      authAgent: 'SSH-Agent',
      keyPath: 'Schlüsseldatei',
      agentHint:
        'Der Schlüssel bleibt im SSH-Agent des Systems; diese App speichert dafür nichts. Vorausgesetzt wird eine gesetzte SSH_AUTH_SOCK-Umgebungsvariable.',
      secure: 'FTPS (verschlüsselt)',
      password: 'Passwort',
      privateKey: 'Privater Schlüssel (Inhalt)',
      webhookUrl: 'Webhook-URL',
      secretUnchangedPlaceholder: 'unverändert lassen'
    },
    outputDir: 'Ausgabeordner',
    outputDirPlaceholder: 'Standard: public/ im Projekt',
    outputDirShared: 'Derselbe Ordner wie unter Vorschau & Build.',
    diffHeading: 'Änderungen',
    buildNow: 'Jetzt bauen',
    refreshDiff: 'Diff aktualisieren',
      uploadEverything: 'Alles neu hochladen',
      uploadEverythingHint:
        'Verwirft, was diese App zuletzt an dieses Ziel geschickt hat — danach bietet die Vorschau wieder den ganzen Build an. Für alles, was die App nicht sehen kann: eine von Hand gelöschte Datei auf dem Server, eine abgebrochene Übertragung, eine Wiederherstellung durch den Anbieter.',
    noDiffYet: 'Noch kein Diff berechnet — zuerst bauen oder Diff aktualisieren.',
    noChanges: 'Keine Änderungen seit dem letzten Deploy.',
    status: {
      added: 'Neu',
      changed: 'Geändert',
      removed: 'Entfernt'
    },
    deployHeading: 'Veröffentlichen',
    deployButton: 'Jetzt veröffentlichen',
    progress: '{{processed}}/{{total}} — {{file}}',
    deploySuccess: 'Veröffentlichung erfolgreich.',
    deployFailed: 'Veröffentlichung fehlgeschlagen.'
  },
  templates: {
    title: 'Vorlagen',
    description:
      'Bündelt die Gestaltung dieses Projekts in einer Datei: Farben, Theme, CSS, Schriften, Layout, Frames, Plugins und Übersetzungen — ganz oder in Teilen. Nach dem Import in ein anderes Projekt ist alles so eingestellt wie hier.',
    exportHeading: 'Vorlage erstellen',
    exportHint:
      'Es wird eine einzelne .qtpl-Datei geschrieben, die du weitergeben kannst. Ausgewählt ist alles, was dieses Projekt hat; was fehlt, taucht gar nicht erst auf.',
    nameLabel: 'Name der Vorlage',
    descriptionLabel: 'Beschreibung (optional)',
    descriptionPlaceholder: 'Wofür ist diese Vorlage gedacht?',
    partsHeading: 'Inhalt',
    nothingToExport: 'In diesem Projekt ist noch nichts, was sich als Vorlage sichern ließe.',
    selectedCount: '{{count}} von {{total}} Bausteinen',
    exportButton: 'Vorlage speichern…',
    exporting: 'Speichere…',
    exportSuccess: 'Gespeichert ({{size}}): {{path}}',
    exportCancelled: 'Abgebrochen.',
    scopeLabel: 'Umfang',
    scopeChanged: 'Nur deine Änderungen ({{count}})',
    scopeNoChanges: 'keine Änderungen erkannt',
    scopeAll: 'Alle Texte ({{count}})',
    baselineHint:
      'Für eine Sprache lässt sich nicht feststellen, was du geändert hast — die Vergleichsbasis entsteht erst, wenn du einen Text in dieser App bearbeitest. Nimm „Alle Texte“, wenn sie dabei sein soll.',
    baselineHint_other:
      'Für {{count}} Sprachen lässt sich nicht feststellen, was du geändert hast — die Vergleichsbasis entsteht erst, wenn du einen Text in dieser App bearbeitest. Nimm „Alle Texte“, wenn eine davon dabei sein soll.',
    importHeading: 'Vorlage anwenden',
    importHint:
      'Vorher wird automatisch ein Snapshot angelegt, der Import lässt sich also über „Backups“ komplett zurücknehmen.',
    planning: 'Paket wird geprüft…',
    pickPackage: 'Vorlage wählen…',
    previewError: 'Das ist keine lesbare Vorlage (keine manifest.json gefunden).',
    legacyBadge: 'Altes Format',
    packageOrigin: 'Erstellt am {{date}} aus dem Projekt „{{project}}“',
    unknownProject: 'unbekannt',
    unknownParts:
      'Diese Vorlage enthält Bausteine, die diese Version noch nicht kennt ({{parts}}) — sie werden übersprungen.',
    strategyHeading: 'Bei Konflikten',
    strategyPackage: 'Vorlage gewinnt',
    strategyProject: 'Projekt gewinnt',
    strategyPackageHint: 'Was dieses Projekt schon hat, wird durch die Vorlage ersetzt.',
    strategyProjectHint: 'Was dieses Projekt schon hat, bleibt; nur Fehlendes kommt hinzu.',
    planAdditions: '{{count}} neu',
    planReplaced: '{{count}} wird ersetzt',
    planKept: '{{count}} bleibt unverändert',
    planIdentical: '{{count}} identisch',
    planOutside: '{{count}} wird abgelehnt',
    planOutside_other: '{{count}} werden abgelehnt',
    planContentIsSymlink:
        'Wird übersprungen: Der Content-Ordner dieses Projekts ist ein Link in einen anderen Ordner. Dorthin schreibt eine Vorlage nichts.',
    planOutsideDetail: 'Wird abgelehnt: {{names}} würde außerhalb des Projekts geschrieben werden.',
    planOutsideDetail_other: 'Wird abgelehnt: {{names}} würden außerhalb des Projekts geschrieben werden.',
    planOutsideMore: '{{names}} und {{count}} weitere',
    planInvalidFrames: '{{count}} Frame nicht lesbar',
    planInvalidFrames_other: '{{count}} Frames nicht lesbar',
    planInvalidFrameDetail: 'Wird übersprungen: {{detail}}',
    planInvalidFramesMore: 'und {{count}} weiterer Frame',
    planInvalidFramesMore_other: 'und {{count}} weitere Frames',
    quotedName: '„{{value}}“',
    planNoChange: 'ändert nichts',
    willInstall: 'Wird nachinstalliert: {{packages}}',
    importButton: 'Vorlage anwenden',
    importing: 'Wird angewendet…',
    importPreparing: 'Snapshot wird angelegt…',
    confirmImportAction: 'Anwenden',
    confirmOverwrite:
      '{{count}} Baustein(e) anwenden? Vorhandenes in diesem Projekt wird dabei durch die Vorlage ersetzt. Vorher wird ein Snapshot angelegt.',
    confirmMerge: '{{count}} Baustein(e) anwenden? Vorhandenes in diesem Projekt bleibt unverändert.',
    importSuccessNoWarnings: 'Fertig — alles übernommen, nichts blieb offen.',
    warningsMore: 'und {{count}} weiterer Fall',
    warningsMore_other: 'und {{count}} weitere Fälle',
    parts: {
      appearance: {
        label: 'Farben & Schriften',
        description: 'Die Basisfarben für hell und dunkel, die drei Schriftrollen und woher die Schriftdateien kommen.'
      },
      theme: {
        label: 'Community-Theme',
        description: 'Das gewählte Theme mit allen seinen Einstellungen. Das npm-Paket wird beim Import mitinstalliert.'
      },
      cssVariables: {
        label: 'CSS-Variablen',
        description: 'Deine eigenen Werte für einzelne CSS-Variablen, getrennt nach hell und dunkel.'
      },
      styles: {
        label: 'Eigenes CSS',
        description: 'custom.scss und alle Stylesheets, die du angelegt oder importiert hast — samt ihrer Ladereihenfolge.'
      },
      fonts: {
        label: 'Schriftdateien',
        description: 'Die selbst mitgebrachten Schriftdateien und die @font-face-Regeln, die auf sie zeigen.'
      },
      static: {
        label: 'Statische Dateien',
        description:
          'Alles unter quartz/static außer den Schriften: Logos, Bilder und die Textschnipsel, auf die Plugin-Optionen zeigen.'
      },
      layout: {
        label: 'Layout',
        description: 'Welche Komponente wo erscheint, pro Seitentyp — und ab welcher Breite umgebrochen wird.'
      },
      frames: {
        label: 'Eigene Frames',
        description: 'Selbst gebaute Seitenraster. Werden im Zielprojekt neu registriert, nicht bloß kopiert.'
      },
      plugins: {
        label: 'Plugins',
        description: 'Alle Plugin-Einträge mit ihren Optionen, ihrer Reihenfolge und ihrer Position.'
      },
      translations: {
        label: 'Übersetzungen',
        description: 'Die Texte, die du in Quartz’ Sprachdateien geändert hast.'
      },
      presets: {
        label: 'Theme-Presets',
        description: 'Deine gespeicherten Theme-Zusammenstellungen.'
      },
      content: {
        label: 'Inhalt',
        description:
          'Die Notizen selbst. Bei den meisten Vorlagen willst du das nicht — eine Vorlage ist eine Gestaltung. Bei einer, die sich selbst erklärt, schon.'
      }
    },
    stats: {
      colors: '{{count}} Farbe',
      colors_other: '{{count}} Farben',
      fonts: '{{count}} Schrift',
      fonts_other: '{{count}} Schriften',
      files: '{{count}} Datei',
      files_other: '{{count}} Dateien',
      variables: '{{count}} Variable',
      variables_other: '{{count}} Variablen',
      styleSettings: '{{count}} Einstellung',
      styleSettings_other: '{{count}} Einstellungen',
      groups: '{{count}} Gruppe',
      groups_other: '{{count}} Gruppen',
      pageTypes: '{{count}} Seitentyp',
      pageTypes_other: '{{count}} Seitentypen',
      frames: '{{count}} Frame',
      frames_other: '{{count}} Frames',
      plugins: '{{count}} Plugin',
      plugins_other: '{{count}} Plugins',
      active: '{{count}} aktiv',
      languages: '{{count}} Sprache',
      languages_other: '{{count}} Sprachen',
      entries: '{{count}} Text',
      entries_other: '{{count}} Texte',
      presets: '{{count}} Preset',
      presets_other: '{{count}} Presets',
      kilobytes: '{{count}} kB'
    },
    warnings: {
      unknown: '{{count}}× {{kind}}',
      appearanceSkipped: 'Farben & Schriften blieben unverändert.',
      themeSkipped: 'Das vorhandene Theme blieb unverändert.',
      layoutSkipped: 'Layout und Breakpoints blieben unverändert.',
      themeInstallFailed: 'Das Theme-Paket ließ sich nicht installieren: {{detail}}',
      pluginInstallFailed: 'Nicht installierbar: {{detail}}',
      pluginSkipped: '{{count}} vorhandenes Plugin blieb unverändert.',
      pluginSkipped_other: '{{count}} vorhandene Plugins blieben unverändert.',
      pluginUnsupported: '{{count}} Plugin hat eine Quellenform, die nicht übertragbar ist.',
      pluginUnsupported_other: '{{count}} Plugins haben eine Quellenform, die nicht übertragbar ist.',
      frameSkipped: '{{count}} vorhandener Frame blieb unverändert.',
      frameSkipped_other: '{{count}} vorhandene Frames blieben unverändert.',
      frameFailed: 'Frame konnte nicht angelegt werden: {{detail}}',
      styleFileSkipped: '{{count}} vorhandene Stylesheet-Datei blieb unverändert.',
      styleFileSkipped_other: '{{count}} vorhandene Stylesheet-Dateien blieben unverändert.',
      fontSkipped: '{{count}} gleichnamige Schriftdatei mit anderem Inhalt blieb unverändert.',
      fontSkipped_other: '{{count}} gleichnamige Schriftdateien mit anderem Inhalt blieben unverändert.',
      staticSkipped: '{{count}} gleichnamige Datei unter quartz/static blieb unverändert.',
      staticSkipped_other: '{{count}} gleichnamige Dateien unter quartz/static blieben unverändert.',
      presetSkipped: '{{count}} vorhandenes Preset blieb unverändert.',
      presetSkipped_other: '{{count}} vorhandene Presets blieben unverändert.',
      missingKey: '{{count}} Text gibt es in diesem Quartz-Stand nicht mehr.',
      missingKey_other: '{{count}} Texte gibt es in diesem Quartz-Stand nicht mehr.',
      translationFailed: 'Text nicht schreibbar: {{detail}}',
      partUnreadable: 'Ein Baustein war nicht lesbar: {{detail}}',
      partFailed: 'Ein Baustein ist fehlgeschlagen: {{detail}}',
      contentIsSymlink:
        'Der Inhalt wurde nicht geschrieben: Der Content-Ordner dieses Projekts ist ein Link auf {{detail}}. Die Notizen einer Vorlage in einen fremden Vault zu schütten wäre nicht rückgängig zu machen.',
      contentSkipped: '{{count}} vorhandene Notiz blieb unverändert.',
      contentSkipped_other: '{{count}} vorhandene Notizen blieben unverändert.',
      fileOutsideProject:
        '{{count}} Datei der Vorlage sollte außerhalb des Projekts geschrieben werden und wurde übersprungen.',
      fileOutsideProject_other:
        '{{count}} Dateien der Vorlage sollten außerhalb des Projekts geschrieben werden und wurden übersprungen.',
      packageUnreadable: 'Die Vorlage ließ sich nicht lesen.'
    }
  },
  pluginsMarketplace: {
    searchPlaceholder: 'Plugins durchsuchen…',
    addFromGithub: 'Plugin von GitHub hinzufügen',
    addPlaceholder: 'github:owner/repo',
    add: 'Hinzufügen',
    installed: 'Installiert',
    installing: 'Installiere…',
    install: 'Installieren',
    archived: 'Archiviert',
    openRepo: 'Repository auf GitHub öffnen',
    noResults: 'Keine Plugins gefunden.',
    showOther: 'Weitere {{count}} Repositories anzeigen',
    hideOther: 'Weitere {{count}} Repositories ausblenden',
    otherDescription:
      'Repositories der quartz-community-Organisation ohne die Markierung „quartz-plugin“ — darunter Quartz selbst, gemeinsam genutzte Bibliotheken, Vorlagen und Forks. Meistens nicht als Plugin installierbar.',
    installedMessage: '{{name}} installiert.',
    loading: 'Katalog wird geladen…',
    refresh: 'Katalog neu laden',
    refreshing: 'Lade…',
    unavailable:
      'Der Katalog ist gerade nicht erreichbar (GitHub antwortet nicht oder das Anfragelimit ist erschöpft). Unten steht deshalb nur ein Platzhalter — mit „Katalog neu laden“ nochmal versuchen. Ein GitHub-Token in den Einstellungen hebt das Limit deutlich an.'
  },
  dnd: {
    instructions:
      'Mit Leertaste oder Eingabetaste aufnehmen. Beim Ziehen mit den Pfeiltasten bewegen, mit Leertaste oder Eingabetaste ablegen, mit Escape abbrechen.',
    picked: '{{name}} aufgenommen.',
    over: '{{name}} liegt über {{target}}.',
    outside: '{{name}} liegt über keinem Ablageort.',
    dropped: '{{name}} bei {{target}} abgelegt.',
    cancelled: '{{name}} abgebrochen, nichts verschoben.'
  },
  logConsole: {
    noOutput: 'Noch keine Ausgabe.',
    clear: 'Ausgabe leeren'
  }
} as const
