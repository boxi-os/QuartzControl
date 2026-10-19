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
    // Der Name eines Mülleimer-Buttons: sein Tooltip und das, was ein Screenreader vorliest. Mit dem
    // Namen des Eintrags, weil in einer Liste sonst zehn Buttons gleich heißen.
    removeNamed: '„{{name}}“ entfernen',
    deleteNamed: '„{{name}}“ löschen',
    edit: 'Bearbeiten',
    loading: 'Lade…',
    openInBrowser: 'Im Browser öffnen',
    // Name der Sub-Tab-Leiste für Screenreader. Nicht „Bereich“ - das heißt im Layout-Editor ein
    // Frame-Bereich, und ein Wort hat einen Namen.
    viewSwitcher: 'Ansicht',
    copied: 'In die Zwischenablage kopiert: {{value}}',
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
    subtitle: 'Deine Quartz-Websites an einem Ort: einrichten, gestalten, veröffentlichen.',
    update: {
      available: 'Es gibt eine neuere Fassung: {{latest}} (installiert: {{current}}).',
      get: 'Herunterladen'
    },
    settings: 'Einstellungen',
    openExisting: 'Vorhandenes Projekt öffnen',
    createNew: 'Neues Projekt erstellen',
    searchPlaceholder: 'Projekt suchen…',
    noSearchResults: 'Kein passendes Projekt gefunden.',
    lastOpened: 'Zuletzt geöffnet {{when}}',
    neverOpened: 'Noch nie geöffnet',
    serverRunning: 'Dev-Server läuft',
    serverRunningOnPort: 'Dev-Server auf Port {{port}}',
    folderMissing: 'Ordner nicht gefunden. Er wurde verschoben, umbenannt oder liegt auf einem nicht eingebundenen Laufwerk.',
    notAQuartzProject: 'Kein Quartz-Projekt: In diesem Ordner liegt keine quartz.config.yaml.',
    locateFolder: 'Ordner suchen…',
    duplicate: {
      action: 'Duplizieren',
      title: '„{{name}}“ duplizieren',
      intro:
        'Kopiert Gestaltung, Konfiguration, Plugins und die eigenen Frames in einen neuen Ordner. Der Inhalt kommt nicht mit; wähle unten, woher das Duplikat seine Inhalte bezieht.',
      nameHint: 'Ordner- und Projektname des Duplikats.',
      contentLabel: 'Inhalt des Duplikats',
      contentHint: 'Der Content-Ordner des Originals wird nicht mitkopiert.',
      contentBlank: 'Leer beginnen (nur eine Startseite)',
      contentSymlink: 'Mit einem Ordner verknüpfen (z. B. einem Obsidian-Vault)',
      contentCopy: 'Einen Ordner hineinkopieren',
      contentFolder: 'Quellordner',
      contentFolderHint: 'Beim Verknüpfen bleibt dieser Ordner der Ort, an dem du schreibst; beim Kopieren wird er einmal übernommen.',
      whatStaysBehind:
        'Nicht mitkopiert werden: Snapshots, beiseitegelegte Content-Ordner und die Veröffentlichungsziele. Die Basis-URL wird übernommen; ändere sie unter „Einrichtung“, wenn das Duplikat woanders stehen soll.',
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
      titleUnusable: 'Diese Werkzeuge lassen sich nicht benutzen',
      description: 'Ohne sie schlagen Builds, neue Projekte, Plugins aus einer Git-Quelle und Snapshots fehl.',
      missing: 'nicht gefunden',
      brokenTool: 'gefunden, lässt sich aber nicht ausführen',
      incompatibleTool: 'liegt bei, passt aber nicht zu diesem System',
      embeddedBroken:
        'Diese Werkzeuge gehören zu QuartzControl. Dass sie sich nicht ausführen lassen, heißt, dass diese Installation unvollständig ist. Am schnellsten hilft, QuartzControl neu zu installieren.',
      embeddedIncompatible:
        'Das mitgelieferte git lässt sich auf diesem System nicht starten. Installiere git auf deinem System.',
      bundled: 'in QuartzControl',
      fromSystem: 'vom System',
      recheck: 'Erneut prüfen',
      ready: 'Werkzeuge bereit',
      secretsBackend: 'Zugangsdaten verschlüsselt über {{backend}}',
      secretsTitle: 'Zugangsdaten liegen unverschlüsselt',
      secretsTitleUnavailable: 'Zugangsdaten lassen sich nicht speichern',
      secretsBody:
        'Auf diesem System läuft kein Schlüsselbund ({{backend}}), deshalb steht keine Verschlüsselung zur Verfügung. Mit gnome-keyring oder KWallet werden Passwörter und Token verschlüsselt abgelegt.',
      secretsUnavailable:
        'Auf diesem System steht keine Verschlüsselung zur Verfügung. Zugangsdaten mit Passwort oder Token lassen sich deshalb nicht speichern.',
      secretsUnavailableKeyring:
        'Auf diesem System läuft kein Schlüsselbund ({{backend}}), deshalb steht keine Verschlüsselung zur Verfügung. Mit gnome-keyring oder KWallet werden Passwörter und Token verschlüsselt abgelegt.'
    },
    gettingStarted: {
      title: 'Erste Schritte',
      step1: 'Lege ein neues Projekt an oder öffne einen Ordner, in dem Quartz schon eingerichtet ist.',
      step2: 'Verknüpfe den Content-Ordner mit deinen Notizen, auch direkt mit einem Obsidian-Vault.',
      step3: 'Starte die Vorschau, gestalte die Seite nach deinem Geschmack und veröffentliche sie.'
    },
    capabilities: {
      title: 'Was du hier tun kannst',
      setup: {
        title: 'Einrichtung',
        body: 'Titel, Adresse, Plugins, Content-Ordner'
      },
      design: {
        title: 'Gestaltung',
        body: 'Farben, Schriften, Themes, Layout'
      },
      publish: {
        title: 'Veröffentlichung',
        body: 'Vorschau, Build, Git-Sync, Hochladen'
      },
      maintenance: {
        title: 'Wartung',
        body: 'Updates und Snapshots'
      }
    },
    aboutQuartz: {
      title: 'Was ist Quartz?',
      body: 'Quartz 5 ist ein statischer Website-Generator für vernetzte Notizen: Markdown rein, fertige Website raus, mit Backlinks, Graph-Ansicht und Volltextsuche. Es versteht Obsidian-Wikilinks, du kannst deinen Vault also direkt veröffentlichen.',
      handbook: 'Handbuch zu QuartzControl',
      docs: 'Quartz-Dokumentation',
      catalog: 'Plugin-Katalog auf GitHub'
    },
    wizard: {
      title: 'Neues Quartz-Projekt',
      intro:
        'QuartzControl legt einen neuen Ordner an und lädt Quartz von GitHub hinein. Der Ordner darf noch nicht existieren, er wird für dich erstellt. Das dauert ein bis zwei Minuten.',
      parentDirectory: 'Wo soll das Projekt liegen?',
      parentDirectoryHint:
        'Der übergeordnete Ordner (z. B. „Dokumente“).',
      parentDirectoryPlaceholder: '/Users/du/Dokumente',
      projectName: 'Name des Projektordners',
      projectNameHint:
        'Nur der Ordnername. Der Titel der Website wird später unter Konfiguration eingestellt.',
      projectNamePlaceholder: 'meine-notizen',
      targetPreview: 'Angelegt wird:',
      nameInvalid: 'Der Name darf kein „/“ enthalten und nicht „.“ oder „..“ sein.',
      template: 'Quartz-Grundgerüst',
      templateHint:
        'Welche Beispielseiten und Grundeinstellungen Quartz selbst mitbringt. „default“ ist der Standard.',
      contentStrategy: 'Woher kommen die Notizen?',
      contentStrategyHint:
        'Beim Verknüpfen bleiben die Notizen dort, wo sie sind (z. B. in deinem Obsidian-Vault) und werden nicht kopiert. Beim Kopieren entsteht eine neue, unabhängige Sammlung im Projektordner.',
      strategyNew: 'Mit leerem Content-Ordner anfangen',
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
        'Die Adresse, unter der die Website später erreichbar ist (ohne https://). Wenn du sie noch nicht kennst, lass „localhost“ stehen und trage sie später nach.',
      useTemplate: 'Basis-Template mitinstallieren',
      useTemplateHint:
        'Eine fertige Gestaltung als Basis: Farben für Light- und Dark-Mode, eigene Seitenraster, lokal ausgelieferte Schriften und jede Komponente einzeln gestaltet.',
      templateContent: 'Mit Beispielseiten',
      templateContentHint:
        '{{count}} Seiten, die zeigen, wie die Website aussieht, bevor du eigene Notizen hast. Wenn du eigene Notizen mitbringst, lass sie weg.',
      templateContentHintCopy:
        'Nicht verfügbar: Die Notizen kommen aus dem gewählten Ordner. Die Beispielseiten würden gleichnamige Dateien daraus überschreiben.',
      templateContentHintSymlink:
        'Nicht verfügbar: Der Content-Ordner wird ein Link in den gewählten Ordner. Dorthin schreibt eine Vorlage nichts.',
      templateUnreadable: 'Das Paket konnte nicht gelesen werden',
      doneTitle: 'Projekt angelegt',
      doneWithWarnings: 'Das Projekt ist da. Beim Anwenden der Vorlage gab es aber etwas zu melden:',
      doneWithFailure: 'Das Projekt ist da und benutzbar. Die Vorlage ließ sich aber nicht anwenden:',
      toProject: 'Zum Projekt',
      creating: 'Erstelle… (dauert ca. ein bis zwei Minuten)',
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
    returnTo: 'Zurück zu „{{place}}“',
    notFound: 'Dieses Projekt steht nicht mehr in der Liste.',
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
      backups: 'Snapshots',
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
      overview: 'Überblick über dieses Projekt: Server-Status, wichtigste Einstellungen und Schnellzugriff auf alle Bereiche.',
      layout: 'Legt fest, welche Komponenten (z. B. Suche, Inhaltsverzeichnis, Navigation) wo auf der Seite erscheinen.',
      styles:
        'Alles zum Aussehen der Site: Basisfarben und Schriften, Community-Themes, CSS-Variablen und eigenes CSS (in der Reihenfolge, in der sie sich gegenseitig überschreiben).',
      updates:
        'Bringt den Quartz-Kern und die installierten Plugins auf den neuesten Stand. Vor jedem Update wird automatisch ein Snapshot angelegt.',
      server: 'Zeigt deine Website lokal in der Vorschau an und erstellt bei Bedarf einen einmaligen Build zum Exportieren.',
      sync: 'Gleicht deine lokalen Änderungen mit dem Git-Repository ab: Hochladen (Push) und Herunterladen (Pull).',
      backups:
        'Snapshots deines ganzen Projekts: automatisch vor jeder größeren Änderung angelegt, jederzeit selbst auslösbar, vergleichbar und einzeln zurückholbar.'
    }
  },
  dashboard: {
    attention: {
      title: 'Handlungsbedarf',
      allGood: 'Alles ok: Content, Git, CSS und Konfiguration sind in Ordnung.',
      dependenciesMissing: '{{count}} npm-Paket fehlt',
      dependenciesMissing_other: '{{count}} npm-Pakete fehlen',
      dependenciesMissingDetail: 'Ohne sie baut Quartz nicht. „Installieren“ führt npm install aus und holt die Plugins aus quartz.lock.json.',
      dependenciesInstall: 'Installieren',
      dependenciesInstalling: 'Installiere…',
      dependenciesInstallingTitle: 'npm-Pakete werden installiert',
      dependenciesUnreadable: 'Ob alle npm-Pakete installiert sind, konnte nicht geprüft werden',
      dependenciesUnreadableDetail: 'Die package.json des Projekts konnte nicht gelesen werden.',
      framesMissing: '{{count}} eigener Frame fehlt',
      framesMissing_other: '{{count}} eigene Frames fehlen',
      framesMissingDetail: 'Eigene Frames liegen in .quartz-gui/authored-frames und kommen nicht über git mit. Bis der Ordner wieder da ist, vom anderen Rechner kopiert oder aus einem Snapshot zurückgeholt, baut Quartz mit dem Standard-Frame.',
      serverError: 'Der Dev-Server ist mit einem Fehler beendet worden',
      contentTargetMissing: 'Der Content-Ordner zeigt ins Leere',
      contentMissing: 'Es gibt keinen Content-Ordner',
      gitConflicts: '{{count}} Datei im Konflikt',
      gitConflicts_other: '{{count}} Dateien im Konflikt',
      gitConflictsDetail: 'Bis der Konflikt gelöst ist, kann nicht gepusht werden.',
      gitInProgress: 'Ein {{operation}} ist angefangen und nicht abgeschlossen',
      gitUnreadable: 'Der Git-Stand konnte nicht gelesen werden',
      scssError: 'Dein CSS lässt sich nicht übersetzen',
      line: 'Zeile {{line}}',
      noIndex: 'Die Website hat keine Startseite',
      noIndexDetail: 'Im Content-Ordner fehlt die index.md, die Adresse der Website zeigt deshalb eine 404-Seite.',
      noBaseUrl: 'Keine Basis-URL gesetzt',
      noBaseUrlDetail:
        'Links, RSS-Feed und Vorschaubilder werden daraus gebaut. Liefert das Plugin „Fonts“ die Schriften aus, schlägt der Build ohne Base-URL fehl.',
      coreUpdatePending: 'Ein Quartz-Kern-Update ist nicht zu Ende gelaufen',
      coreUpdatePendingDetail:
        'Diese Pakete fehlen in package.json oder stehen dort mit einer anderen Version: {{packages}}. Einmal „Update durchführen“ löst es auf.',
      coreUpdatePendingInstallDetail:
        'Der Kern ist zusammengeführt, aber „npm install“ ist dabei fehlgeschlagen. Einmal „Update durchführen“ löst es auf.'
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
      unreadable: 'Stand nicht lesbar',
      unreadableHint: 'git konnte den Stand dieses Projekts nicht lesen (mehr dazu unter Git-Sync).',
      noRepoHint: 'Dieses Projekt hat keine Versionskontrolle.',
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
      failed: 'Build fehlgeschlagen. Die Ausgabe steht unter Vorschau & Build.'
    },
    publish: {
      targets: 'Ziel',
      targets_other: 'Ziele',
      none: 'Kein Ziel',
      noneHint: 'Noch kein Veröffentlichungsziel eingerichtet.'
    },
    updates: {
      checking: 'Prüfe auf Updates…',
      coreBehind: 'Kern-Update verfügbar',
      pluginsOnly: 'Update für Plugins verfügbar',
      allCurrent: 'Alles aktuell',
      unknown: 'Nicht prüfbar',
      corePending: 'Update nicht abgeschlossen',
      pluginsBehind: '{{count}} Plugin-Update verfügbar',
      pluginsBehind_other: '{{count}} Plugin-Updates verfügbar',
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
    label: 'Content-Ordner',
    cardHint: 'Der Ordner mit deinen Markdown-Notizen. Als echter Ordner oder verknüpft mit einem bestehenden Ordner, z. B. deinem Obsidian-Vault.',
    loading: 'Lade…',
    noFolder: 'Kein Content-Ordner gefunden.',
    symlinkBadge: 'Symbolischer Link',
    realFolderBadge: 'Echter Ordner',
    filesCount: '{{count}} Dateien',
    targetMissingSuffix: ' (Ziel existiert nicht)',
    changeSource: 'Quelle ändern…',
    dialogTitle: 'Content-Quelle ändern',
    dialogWarning:
      'Der bisherige Content-Ordner wird vor der Änderung beiseitegelegt statt gelöscht. Unter Snapshots lässt er sich zurückholen.',
    newSourceFolder: 'Neuer Quellordner',
    strategy: 'Strategie',
    strategySymlink: 'Verknüpfen (symbolischer Link, z. B. auf einen Obsidian-Vault)',
    strategyCopy: 'Kopieren (echter Ordner)',
    progress: '{{processed}} / {{total}} Dateien kopiert…',
    applying: 'Wird angewendet…',
    apply: 'Übernehmen',
    noIndex: 'Keine Startseite: Im Content-Ordner liegt keine index.md, deshalb zeigt die Adresse der Website eine 404-Seite.',
    createIndex: 'Startseite anlegen…',
    createIndexTitle: 'Startseite anlegen',
    createIndexTitleLabel: 'Titel der Startseite',
    createIndexTitleHint: 'Ohne Titel hieße die Seite „index“.',
    createIndexListHint:
      'Darunter kommt eine Liste der Ordner und Notizen, die jetzt oben im Content-Ordner liegen. Sie wird später nicht aktualisiert.',
    createIndexLinked: 'Die Datei wird im verknüpften Ordner angelegt, also bei deinen eigenen Notizen: {{path}}',
    createIndexAction: 'Startseite anlegen',
    creatingIndex: 'Lege an…',
    indexCreated: 'Die Startseite ist angelegt: {{path}}',
    indexCreatedFallback:
      'Die Liste auf der neuen Startseite entstand ohne die Ausschlussregeln von Quartz, weil im Projekt noch kein npm install gelaufen ist. Sie kann Ordner nennen, die die Website nicht hat.'
  },
  buildActivity: {
    kind: {
      build: 'Build läuft seit {{time}}',
      serve: 'Dev-Server baut seit {{time}}',
      rebuild: 'Baut nach einer Änderung neu, seit {{time}}'
    },
    phase: {
      preparing: 'bereitet vor',
      parsing: 'liest die Notizen',
      emitting: 'schreibt die Seiten'
    }
  },
  buildServer: {
    devServer: 'Dev-Server',
    noIndex: 'Im Content-Ordner fehlt die index.md. Die Vorschau zeigt unter ihrer Adresse deshalb eine 404-Seite.',
    noIndexLink: 'Startseite anlegen →',
    devServerHint: 'Zeigt deine Website live im Browser an, mit automatischem Neuladen bei Änderungen.',
    oneOffBuildHint: 'Erstellt einmalig die fertigen HTML-Dateien, z. B. um sie manuell hochzuladen oder zu prüfen.',
    port: 'Port',
    wsPort: 'WS-Port',
    remoteDevHost: 'Remote-Dev-Host (optional)',
    remoteDevHostPlaceholder: 'nur für Tunnel/Remote-Vorschau',
    start: 'Starten',
    restart: 'Neustarten',
    stop: 'Stoppen',
    serverOptions: 'Server-Einstellungen',
    optionsLocked: 'Zum Ändern zuerst den Server stoppen.',
    portsAuto: 'Ist ein Port belegt, nimmt der Server beim Start den nächsten freien.',
    portsFixedBehindTunnel: 'Mit Remote-Dev-Host weicht der Server nicht aus: Ist ein Port belegt, startet er nicht.',
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
    exportDirShared: 'Gilt auch für Veröffentlichen: Dort wird aus demselben Ordner hochgeladen.',
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
        'Auf diesem System lässt sich die Prozessliste nicht lesen. Ob Server laufen, ist damit unbekannt.',
      partial_zero:
        'Für mindestens einen Prozess ließ sich nicht feststellen, welchen Port er hält. Es kann also ein Server laufen, der hier fehlt.',
      partial_one:
        'Ein Quartz-Server läuft auf diesem Rechner. Für mindestens einen weiteren Prozess ließ sich der Port nicht feststellen. Die Liste kann unvollständig sein.',
      partial_other:
        '{{count}} Quartz-Server laufen auf diesem Rechner. Für mindestens einen weiteren Prozess ließ sich der Port nicht feststellen. Die Liste kann unvollständig sein.',
      none: 'Es läuft kein Quartz-Server auf diesem Rechner.',
      found_one: 'Ein Quartz-Server läuft auf diesem Rechner.',
      found_other: '{{count}} Quartz-Server laufen auf diesem Rechner.',
      fromApp: 'Von dieser App',
      fromOutside: 'Außerhalb gestartet',
      unknownProject: 'Projekt unbekannt',
      notAnswering: 'antwortet nicht',
      stopServer: 'Server beenden',
      confirmOwn:
        'Server auf Port {{port}} beenden?\n\nEr gehört zu {{name}} und wurde von QuartzControl gestartet. Die Vorschau im Browser ist danach nicht mehr erreichbar.',
      confirmForeign:
        'Server auf Port {{port}} beenden?\n\nDieser Server wurde nicht von QuartzControl gestartet ({{name}}). Wer ihn gestartet hat (ein Terminal, ein anderes Fenster, eine frühere Sitzung), arbeitet vielleicht gerade damit.',
      stopped: 'Der Server auf Port {{port}} wurde beendet.',
      stopFailed:
        'Der Server auf Port {{port}} konnte nicht beendet werden. Vielleicht war er schon weg, oder der Prozess gehört inzwischen jemand anderem.',
      portTaken:
        'Port {{ports}} ist belegt, aber von keinem erkennbaren Quartz-Server. Ein Start weicht auf den nächsten freien Port aus.',
      warning:
        'Server, die außerhalb von QuartzControl gestartet wurden, gehören jemand anderem (einem Terminal, einem zweiten Fenster, einer Sitzung, die hart beendet wurde). QuartzControl beendet sie nie von sich aus; das Beenden ist hier jedes Mal deine Entscheidung.'
    }
  },
  gitSync: {
    title: 'Git-Sync',
    explainer:
      'Jeder Sync committet zuerst deine Änderungen (falls unten aktiviert), holt dann den Branch „{{branch}}“ von origin und pusht deinen aktuellen Branch per Force-Push.',
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
      noToken: 'Dafür wird ein GitHub-Token mit „repo“-Berechtigung gebraucht. Trage ihn in den Einstellungen ein.',
      name: 'Repository-Name',
      private: 'Privat',
      privateHint:
        'GitHub Pages gibt es für private Repositories nur in den bezahlten Tarifen. Wenn die Website über GitHub Pages veröffentlicht werden soll, muss das Repository im kostenlosen Konto öffentlich sein.',
      action: 'Anlegen'
    },
    statusTitle: 'Stand des Repositorys',
    notARepo: 'Dieses Projekt ist kein Git-Repository. Sync ist hier nicht möglich.',
    readError: 'git konnte den Stand dieses Projekts nicht lesen. Ob es ein Repository ist, lässt sich damit nicht sagen. Das sagt git:',
    needsOrigin: 'Pull und Push brauchen einen „origin“-Remote. Ohne ihn bleibt das Projekt ein lokales Repository.',
    needsRepo: 'Pull und Push brauchen ein Git-Repository mit einem „origin“-Remote.',
    noRemote: 'Kein „origin“-Remote konfiguriert. Push und Pull haben kein Ziel.',
    detached: 'Kein Branch ausgecheckt',
    detachedHint:
      'Dieses Projekt steht gerade auf einem einzelnen Commit statt auf einem Branch („detached HEAD“). Push und Pull haben so kein Ziel. Wechsle mit git checkout auf einen Branch, bevor du synchronisierst.',
    noUpstream: 'Kein Upstream',
    noUpstreamHint: 'Dieser Branch hat keine Entsprechung auf dem Server. Es lässt sich deshalb nicht sagen, wie viele Commits fehlen. Der erste Push legt sie an.',
    upToDate: 'Auf dem Stand des Remotes',
    ahead: '{{count}} Commit noch nicht gepusht',
    ahead_other: '{{count}} Commits noch nicht gepusht',
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
      'Ein Snapshot ist zum Zurückholen da: eine Kopie dieses Projekts, die im Projekt bleibt, nie hochgeladen wird und deine Git-Historie nicht anrührt. Zum Teilen mit anderen Rechnern ist Git-Sync da.',
    newHeading: 'Neuer Snapshot',
    newHint:
      'Ein Snapshot sichert: Konfiguration, Plugin-Sperrdatei, Layout-Frames, eigene Stylesheets, Übersetzungen und Veröffentlichungsziele. Nicht enthalten sind node_modules, der Build-Ordner und installierte Plugin-Dateien. Diese entstehen beim nächsten Build ohnehin neu.',
    labelPlaceholder: 'Name (optional), z. B. „vor dem Theme-Wechsel“',
    create: 'Snapshot anlegen',
    created: 'Snapshot angelegt.',
    includeContent: 'Content-Ordner mitsichern',
    contentFolderHint: 'Echter Ordner mit Markdown-Dateien: klein genug, um immer mitzulaufen.',
    contentSymlinkHint:
      'Dein Content-Ordner ist mit einem Vault außerhalb des Projekts verknüpft. Dieser lässt sich nicht mitsichern.',
    vaultNotCompared:
      'Notizen aus dem verknüpften Vault sind hier nicht dabei. Verglichen wird alles außer dem Content-Ordner.',
    contentMissing: 'Es gibt keinen Content-Ordner, den man mitsichern könnte.',
    none: 'Noch keine Snapshots. Vor jedem Kern-Update, jeder Plugin-Änderung, jedem Content-Wechsel und jedem Vorlagen-Import wird automatisch einer angelegt.',
    listTitle: 'Snapshots ({{count}})',
    panelLabel: 'Snapshot',
    panelEmptyTitle: 'Snapshot vergleichen',
    panelEmptyText:
      'Wähle links einen Snapshot: Hier steht dann, welche Dateien sich seitdem geändert haben, und du kannst alles oder einzelne Dateien wiederherstellen.',
    summaryCount: 'Snapshots',
    summaryCountValue: '{{count}}, davon {{manual}} von dir',
    summaryNewest: 'Neuester',
    summaryOldest: 'Ältester',
    summaryContent: 'Content-Ordner',
    summaryContentMissing: 'nicht vorhanden',
    summaryContentVault: 'verknüpfter Vault, nicht gesichert',
    summaryContentIncluded: 'wird mitgesichert',
    summaryContentExcluded: 'wird nicht mitgesichert',
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
    confirmDeleteAction: 'Snapshot löschen',
    confirmDelete: 'Diesen Snapshot endgültig löschen?',
    confirmRestoreAction: 'Wiederherstellen',
    confirmRestoreAll:
      'Das gesamte Projekt auf diesen Snapshot zurücksetzen?\n\nDateien, die es damals nicht gab, werden dabei gelöscht. Vom aktuellen Stand wird vorher automatisch ein Snapshot angelegt.',
    confirmRestoreFiles:
      '{{count}} ausgewählte Datei(en) auf den Stand dieses Snapshots zurücksetzen?\n\nVom aktuellen Stand wird vorher automatisch ein Snapshot angelegt.',
    resetProjectHead: 'Auch den Projekt-Commit auf {{commit}} zurücksetzen',
    resetProjectHeadHint:
      'Setzt zusätzlich die Git-Historie des Projekts zurück. Das ist nötig, wenn du ein Kern-Update rückgängig machst, sonst meldet die Updates-Seite weiterhin den neuen Stand. Wenn du diesen Commit schon gepusht hast, weicht dein lokaler Stand danach vom Remote ab.',
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
      styleChange: 'Vor Vorlagen-Import',
      styleMigration: 'Vor Umstellung der Stile',
      imported: 'Altes Config-Backup'
    },
    movedFoldersHeading: 'Beiseitegelegte Content-Ordner',
    movedFoldersHint:
      'Beim Wechsel des Content-Ordners wird der bisherige hierher verschoben statt gelöscht. Das ist kein Backup deiner Notizen: ein verknüpfter Vault wird nie kopiert, nur die Verknüpfung selbst notiert.',
    confirmRestoreFolderAction: 'Ordner einsetzen',
    confirmRestoreFolder: 'Diesen Content-Ordner wieder einsetzen? Der aktuelle wird dabei ebenfalls beiseitegelegt.',
    confirmDeleteFolderAction: 'Ordner löschen',
    confirmDeleteFolder:
      'Diesen beiseitegelegten Content-Ordner endgültig löschen ({{size}})?\n\nEs ist die einzige Kopie: In den Snapshots ist er nicht enthalten, und rückgängig machen lässt sich das nicht.',
    folderSize: '{{count}} Datei · {{size}}',
    folderSize_other: '{{count}} Dateien · {{size}}',
    folderLink: 'Nur der Link auf {{target}} (die Notizen liegen dort und wurden nie kopiert).'
  },
  settings: {
    title: 'Einstellungen',
    subtitle: 'Einstellungen für QuartzControl. Projektbezogene Einstellungen stehen im jeweiligen Projekt.',
    githubTokenStored: 'gespeichert (zum Ersetzen neu eingeben)',
    defaultProjectDirectory: 'Standard-Projektverzeichnis',
    language: 'Sprache',
    languageSystem: 'Systemsprache folgen',
    languageDe: 'Deutsch',
    languageEn: 'English',
    appearance: {
      title: 'Erscheinungsbild',
      description: 'Aussehen und Sprache',
      theme: 'Design',
      themeLight: 'Hell',
      themeDark: 'Dunkel',
      themeSystem: 'Systemeinstellung',
      appliedImmediately: 'Design und Sprache werden sofort übernommen und gespeichert.'
    },
    projects: {
      title: 'Projekte',
      description: 'Wo die Ordner-Dialoge starten, wenn du ein Projekt öffnest oder anlegst.',
      mustBeAbsolute: 'Das ist kein vollständiger Pfad. Er muss mit „/“ oder „~/“ beginnen, oder du wählst den Ordner aus.'
    },
    github: {
      title: 'GitHub',
      description:
        'Wird zum Anlegen von Repositories und zum Einrichten von GitHub Pages gebraucht (und hebt das Rate-Limit im Plugin- und Theme-Marktplatz an).',
      token: 'Persönlicher Zugriffstoken',
      saveAndCheck: 'Speichern & prüfen',
      valid: 'Gültig',
      rejected: 'Abgelehnt',
      rejectedHint: 'GitHub akzeptiert diesen Token nicht. Er ist abgelaufen oder wurde zurückgezogen.',
      checking: 'Prüfe…',
      unknown: 'Nicht prüfbar',
      unknownHint: 'GitHub war nicht erreichbar. Ob der Token gilt, ist damit offen.',
      recheck: 'Erneut prüfen',
      remove: 'Token entfernen',
      scopeHint:
        'Für den Marktplatz genügt ein Token ganz ohne Berechtigungen. Zum Anlegen von Repositories und für GitHub Pages wird der Scope „repo“ benötigt. Der Token wird verschlüsselt im Schlüsselbund deines Systems abgelegt.'
    },
    connections: {
      title: 'Zugänge',
      description:
        'Server-Logins und Build-Hooks, die du zum Veröffentlichen brauchst. Sie werden global in QuartzControl eingerichtet. Veröffentlichungsziele, die diese Zugänge nutzen, werden im Projekt definiert.',
      empty: 'Noch keine Zugänge angelegt.',
      addSsh: 'SFTP / SSH',
      addFtp: 'FTP',
      addWebhook: 'Webhook',
      panelLabel: 'Zugang',
      panelEmptyTitle: 'Zugang wählen',
      panelEmptyText: 'Wähle links einen Zugang, um ihn zu bearbeiten, oder lege einen neuen an.',
      newHeading: 'Neuer {{kind}}-Zugang',
      confirmDiscard: 'Der offene Zugang hat ungespeicherte Änderungen. Wenn du jetzt wechselst, gehen sie verloren.',
      confirmDiscardAction: 'Änderungen verwerfen',
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
        'Wohin genau ein Projekt damit veröffentlicht (Serverpfad, Branch, Ausschlüsse) legst du im Projekt unter „Veröffentlichen“ fest.'
    },
    quit: {
      title: 'Beim Beenden',
      description: 'Was mit einem laufenden Dev-Server passiert, wenn du QuartzControl schließt.',
      label: 'Laufende Dev-Server',
      ask: 'Fragen',
      keep: 'Weiterlaufen lassen',
      stop: 'Beenden',
      hint: {
        ask: 'Läuft beim Beenden ein Server, fragt QuartzControl, was mit ihm geschehen soll.',
        keep: 'Server laufen weiter und bleiben im Browser erreichbar. Beim nächsten Start fragt QuartzControl, ob sie beendet werden sollen.',
        stop: 'Server werden beim Beenden ohne Rückfrage gestoppt.'
      }
    },
    runtime: {
      title: 'Laufzeit',
      description: 'Womit Quartz und npm ausgeführt werden.',
      label: 'Node-Laufzeit',
      embedded: 'In QuartzControl',
      system: 'Vom System',
      inUseEmbedded: 'Im Einsatz: Node {{node}} und npm {{npm}} aus QuartzControl.',
      inUseSystem: 'Im Einsatz: Node {{node}} von diesem Rechner.',
      noSystemNode: 'nicht gefunden',
      hintSwitchable: 'Auf diesem Rechner liegt Node {{node}}. Umschalten lohnt sich nur, wenn ein Paket beim Installieren erst kompiliert werden muss.',
      hintNoHostNode: 'Auf diesem Rechner ist kein Node gefunden worden. „Vom System“ würde Builds, Plugins und neue Projekte deshalb scheitern lassen.',
      hintSystem: 'Quartz verlangt Node 22 oder neuer. Ein Projekt bringt außerdem eine .node-version mit. nvm, fnm, asdf und mise lösen die pro Ordner auf, die Laufzeit kann hier also je Projekt eine andere sein.',
      gitBundled: 'git {{version}} aus QuartzControl. Auf diesem Rechner ist keines installiert, deshalb wird das mitgelieferte benutzt.',
      gitHost: 'git {{version}} von diesem Rechner. QuartzControl bringt zwar eines mit, benutzt es aber nur, wenn keines installiert ist. Deine eigene Einrichtung (~/.gitconfig, Zugangshelfer) gilt so weiter.',
      gitLicense: 'git steht unter der GPL v2; der vollständige Lizenztext liegt in QuartzControl.',
      gitSource: 'Quelltext ansehen',
      appliesToNewProcesses: 'Gilt für Vorgänge, die danach starten. Ein laufender Dev-Server behält seine Umgebung, bis er neu gestartet wird.'
    },
    maintenance: {
      title: 'Daten & Wartung',
      description: 'Was QuartzControl außerhalb deiner Projekte ablegt.',
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
        'Beim Start konnte QuartzControl eine seiner Dateien nicht lesen, vermutlich, weil das Programm beim Speichern hart beendet wurde. Die Datei wurde zur Seite gelegt statt überschrieben; was darin stand (etwa Zugänge oder die Projektliste), fehlt in QuartzControl und muss neu angelegt werden.'
    }
  },
  configEditor: {
    tabs: {
      site: 'Website',
      localization: 'Übersetzungen'
    },
    descriptions: {
      site: 'Grundeinstellungen deiner Website: der Ordner mit deinen Notizen, Titel, Adresse und Sprache.',
      localization:
        'Feste Textbausteine der Website (z. B. „Suche“, „Zuletzt geändert“) in den verfügbaren Sprachen. Nur Kern-Texte, eigene Plugin-Texte werden hier nicht erfasst.'
    },
    loadError: 'quartz.config.yaml konnte nicht gelesen werden.',
    loading: 'Lade Konfiguration…',
    stylesHint:
      'Farben und Schriften stellst du bei den Stilen ein.',
    stylesHintLink: 'Zu den Stilen'
  },
  projectImage: {
    label: 'Projektbild',
    choose: 'Bild wählen…',
    replace: 'Bild ersetzen…',
    remove: 'Bild entfernen',
    fileFilter: 'Bilder (PNG, JPEG)',
    defaultHint:
      'PNG oder JPEG, am besten quadratisch.',
    unrecordedHint:
      'Die Seite zeigt ein Bild, das nicht in QuartzControl gewählt wurde. Ein eigenes ersetzt es im Kopfbereich und als Favicon. PNG oder JPEG, am besten quadratisch.',
    customHint: 'Liegt als quartz/static/icon.png im Projekt, {{width}} × {{height}} Pixel.',
    faviconOn: 'Das Favicon der Seite wird beim nächsten Build aus diesem Bild erzeugt.',
    faviconOff: 'Das Favicon-Plugin ist ausgeschaltet.',
    faviconMissing: 'Das Favicon-Plugin ist nicht installiert.',
    faviconLink: 'Zu den Plugins',
    announceSet: 'Projektbild gesetzt.',
    announceCleared: 'Projektbild entfernt.',
    dark: {
      choose: 'Bild für den Dunkelmodus…',
      replace: 'Dunkles Bild ersetzen…',
      remove: 'Dunkles Bild entfernen',
      hint: 'Optional, nur für das Bild im Kopfbereich. Liegt als quartz/static/icon-dark.png im Projekt; das Favicon bleibt beim hellen Bild.',
      hintHeaderOn: 'Nur für das Bild im Kopfbereich; das Favicon bleibt beim hellen Bild. „Dunkles Bild entfernen“ löscht die Datei sofort.',
      notChosen: 'Das dunkle Bild wurde nicht in QuartzControl gewählt. Zeigt der Kopfbereich das Projektbild, dann wird im dunklen Modus solange dieses angezeigt, bis du ein eigenes wählst.',
      hintMark: 'Für den Dunkelmodus im Kopfbereich; das Favicon bleibt beim hellen Bild. Eine Layout-Box nutzt diese Datei; ohne sie fehlt dort im dunklen Modus das Bild.',
      announceSet: 'Bild für den Dunkelmodus gesetzt.',
      announceCleared: 'Bild für den Dunkelmodus entfernt.'
    },
    header: {
      label: 'Im Kopfbereich der Website zeigen',
      hint: 'Als Link zur Startseite, im dunklen Modus mit dem dunklen Bild.',
      hintInstall: 'Braucht das Plugin quartz-layout-box, QuartzControl bietet beim Einschalten an, es zu installieren.',
      needsImage: 'Erst ein eigenes Projektbild wählen.',
      shownByMark: 'Angezeigt im Kopfbereich: Eine Layout-Box zeigt dieses Bild, im dunklen Modus das dunkle.',
      installing: 'Installiere quartz-layout-box…',
      installConfirm:
        'Plugin quartz-layout-box installieren?\n\nDas Bild im Kopfbereich wird damit gebaut. Vorher speichert QuartzControl die ungespeicherten Änderungen dieser Seite.',
      installAction: 'Installieren',
      installed: 'quartz-layout-box ist installiert. Das Bild im Kopfbereich wird mit „Speichern“ übernommen.',
      saveFirstFailed: 'Die ungespeicherten Änderungen konnten nicht gespeichert werden, deshalb wurde nichts installiert.'
    }
  },
  siteSettings: {
    heading: 'Seiteneinstellungen',
    pageTitle: 'Seitentitel',
    pageTitleHint: 'Der Name deiner Website. Er steht im Browser-Tab, im RSS-Feed und meist oben in der Seitenleiste.',
    pageTitleSuffix: 'Titel-Zusatz',
    pageTitleSuffixHint: 'Wird im Browser-Tab hinter den Titel der einzelnen Seite gehängt. Auf der Seite selbst erscheint er nicht.',
    baseUrl: 'Basis-URL',
    baseUrlHint:
      'Die Adresse, unter der die Website später erreichbar ist (ohne https://). Links, RSS-Feed und Vorschaubilder werden daraus gebaut. Liefert das Plugin „Fonts“ die Schriften aus, schlägt der Build ohne Base-URL fehl.',
    locale: 'Sprache der Website',
    spa: 'Seitenwechsel ohne Neuladen',
    spaHint:
      'Beim Klick auf einen internen Link wird nur der Inhalt ausgetauscht statt die ganze Seite neu geladen. Das fühlt sich schneller an; ohne JavaScript funktioniert die Website trotzdem.',
    popovers: 'Vorschau bei Links',
    popoversHint: 'Zeigt beim Überfahren eines internen Links ein kleines Fenster mit dem Anfang der Zielseite.',
    ignoreHeading: 'Notizen und Ordner ausschließen',
    ignorePatterns: 'Muster (eins pro Zeile)',
    ignorePatternsHint:
      'Dateien und Ordner im Content-Ordner, die gar nicht erst in die Website kommen (z. B. privat/** oder *.excalidraw.md).',
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
      host: 'Nur bei selbst gehosteter Instanz, sonst leer lassen',
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
    goToVariablesTab: 'Zum Reiter „Variablen“',
    overrideChecking: 'Prüfe, welche dieser Werte das aktive Theme überschreibt…',
    overrideCounted:
        'Das Theme „{{themeId}}“ überschreibt {{colors}} von {{totalColors}} Farben und {{fonts}} von {{totalFonts}} Schriften. Diese sind unten abgeblendet.',
    overrideStillEditable:
        'Die Werte gelten wieder, sobald das Theme deaktiviert ist. Bei aktivem Theme lassen sie sich im Variablen-Tab gezielt überschreiben.',
    overriddenByTheme: 'Wird vom aktiven Theme überschrieben',
    overriddenByVariable:
      'Die Variable --{{variable}} im Projekt überschreibt diese Schrift. Auf der Website ändert dieses Feld nichts.',
    overriddenShort: 'Theme',
    fontSource: 'Font-Quelle',
    googleFonts: 'Google Fonts',
    googleFontsHint:
      'Die gewählten Schriften kommen von Google. Die Eingabefelder bieten alle {{count}} Google Fonts zur Auswahl (filtern durch tippen).',
    fontCategory: {
      sansSerif: 'Serifenlos',
      serif: 'Serif',
      monospace: 'Monospace',
      display: 'Display',
      handwriting: 'Handschrift'
    },
    fontFromTheme: 'Theme',
    fontNoGoogleMatch: 'Keine Google-Schrift mit diesem Namen',
    fontNoLocalMatch: 'Keine im Projekt deklarierte Schrift mit diesem Namen',
    fontSpelledDifferently: 'Google unterscheidet Groß- und Kleinschreibung. Gemeint ist vermutlich „{{name}}“.',
    fontUnknownToGoogle:
      'Diesen Namen führt Google nicht (Liste vom {{date}}). Kennt Google ihn wirklich nicht, fehlt die Schrift auf der Website.',
    localHint: 'Nichts wird geladen, die Schrift muss bereits lokal vorliegen, z. B. über „Eigene Schriftart importieren“ unten.',
    local: 'Eigene lokale Schriftart',
    fontFor: 'Schriftart ({{slot}})',
    fontListFor: 'Schriftarten zur Auswahl ({{slot}})',
    fontMatches: '{{count}} Schriftart passt',
    fontMatches_other: '{{count}} Schriftarten passen',
    delivery: {
      heading: 'Schrift-Auslieferung',
      description:
        'Lokal ausliefern: QuartzControl holt die Schriftdateien einmal von Google und legt sie im Projekt ab. Die Website ruft nichts mehr bei Google auf (die DSGVO-freundliche Variante).',
      quartzStillDownloads:
        'Quartz lädt diese Schriften erst beim Build und verweist dabei auf die veröffentlichte Website. Die Vorschau zeigt sie deshalb nicht. Speichern holt sie ins Projekt.',
      fetchNow: 'Jetzt ins Projekt holen',
      fetching: 'Hole Schriften…',
      selfHost: 'Schriften lokal ausliefern (kein Google-Aufruf beim Besuch)',
      baseUrlMissing:
        'Dafür muss eine Basis-URL gesetzt sein (Konfiguration → Basis-URL). Die Schrift-URLs werden darauf umgeschrieben, sonst bricht der Build ab.',
      state: {
        core: {
          google: 'Quartz-Kern: verlinkt Google Fonts direkt.',
          selfHosted: 'QuartzControl: holt die Schriften ins Projekt, die Website liefert sie selbst aus.'
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
        'Das Theme bringt eigene Schriften mit und lädt sie von unpkg.com. Lokal ausliefern lassen sie sich nicht. Ausschalten heißt, die Schriften des Themes wegzulassen, dann greifen die Schriftarten von oben.',
      themeFontsOff:
        'Die Schriften des Themes sind abgeschaltet. Es wird nichts bei unpkg.com geladen, dafür sieht das Theme anders aus als vorgesehen.'
    },
    unusedFonts: {
      heading: 'Ungenutzte Schriften',
      description:
        'custom.scss deklariert diese Schriften, aber weder eine Schriftart-Einstellung noch eine Variable noch ein Stylesheet unter quartz/styles, quartz/components/styles oder quartz/static nennt sie. Die Schriftdateien werden trotzdem mit jedem Build veröffentlicht.',
      noFile: 'keine Datei im Projekt',
      removing: 'Entferne…',
      confirm_one:
        '„{{family}}“ entfernen?\n\nDie @font-face-Regeln verschwinden aus dem CSS und eine Datei wird aus quartz/static/fonts gelöscht. Zurück geht es nur über einen Snapshot oder git.',
      confirm_other:
        '„{{family}}“ entfernen?\n\nDie @font-face-Regeln verschwinden aus dem CSS und {{count}} Dateien werden aus quartz/static/fonts gelöscht. Zurück geht es nur über einen Snapshot oder git.',
      confirmNoFiles:
        '„{{family}}“ entfernen?\n\nDie @font-face-Regeln verschwinden aus dem CSS. Gelöscht wird keine Datei, weil andere Regeln sie noch nennen oder sie nicht im Projekt liegt. Zurück geht es nur über einen Snapshot oder git.',
      confirmButton: 'Schrift entfernen'
    },
    localFontHeading: 'Eigene Schriftart importieren',
    localFontDescription: 'Lädt eine .ttf/.otf/.woff/.woff2-Datei ins Projekt und erzeugt die passende @font-face-Regel im CSS.',
    localFontPick: 'Datei auswählen…',
    localFontFamily: 'Font-Familienname',
    localFontSlot: 'Direkt verwenden für',
    localFontNoSlot: '— keins —',
    localFontConfirm: 'Importieren',
    fontImportDetected: '„{{family}}“ importiert: weight {{weight}} aus der Datei gelesen.',
    fontImportDetectedItalic: '„{{family}}“ importiert: weight {{weight}}, kursiv, aus der Datei gelesen.',
    fontImportUndetected:
      '„{{family}}“ importiert. Die Datei nennt kein „weight“, die Regel bleibt deshalb ohne. Bei Bedarf im CSS ergänzen.',
    fonts: 'Schriften',
    colors: 'Farben'
  },
  themes: {
    loading: 'Lade Community-Themes…',
    disableAll: 'Community-Themes deaktivieren',
    allDisabled: 'Community-Themes deaktiviert',
    active: {
      title: 'Aktuelles Theme',
      none: 'Kein Community-Theme aktiv: Es gelten deine Farben und Schriften aus „Stile → Basis“.',
      heading: 'Aktuelles Theme: {{themeId}}',
      saveAsPreset: 'Als Preset speichern',
      presetNamePlaceholder: 'Name für das Preset',
      overrideNote:
        'Dieses Plugin ({{source}}) überschreibt die Farben aus der Basis-Ebene. Änderungen unten wirken sich direkt auf die Vorschau aus.',
      disabledHeading: 'Community-Theme deaktiviert ({{themeId}})',
      disabledNote:
        'Es gelten die Farben und Schriften aus „Stile → Basis“. Die Einstellungen dieses Community-Themes bleiben erhalten und lassen sich jederzeit wieder aktivieren.',
      reactivate: 'Wieder aktivieren',
      checkingStyleSettings: 'Prüfe Style-Settings des Themes…',
      noStyleSettingsNote:
        'Das Theme {{themeId}} bietet keine eigenen Farbeinstellungen an.',
      styleSettingsHeading: 'Style-Settings ({{ids}})',
      ownValuesHint:
        'Hier stehen nur die Optionen, die das Theme selbst mitbringt. Eigene Werte für einzelne CSS-Variablen können im Variablen-Tab oder im eigenen CSS gesetzt werden.',
      goToVariables: 'Zu den Variablen →'
    },
    presets: {
      title: 'Meine Presets',
      description:
        'Eigene, gespeicherte Anpassungen eines Community-Themes.',
      none: 'Noch keine Presets gespeichert.',
      basisLabel: '(Basis: {{base}})',
      active: 'Aktiv',
      apply: 'Anwenden',
      confirmDelete: 'Preset „{{name}}“ löschen?\n\nDas eingestellte Theme bleibt, wie es ist; nur der gespeicherte Eintrag verschwindet. Zurückholen lässt er sich nicht.',
      confirmDeleteAction: 'Preset löschen'
    },
    catalog: {
      title: 'Katalog',
      description:
        'Vorgefertigte Farbschemata aus dem @quartz-themes-Ökosystem (installiert und aktiviert das Plugin @quartz-themes/core mit dem gewählten Theme).',
      searchPlaceholder: 'Theme suchen (z. B. tokyo-night, catppuccin, nord)…',
      refresh: 'Neu laden',
      refreshing: 'Lädt…',
      unavailable:
        'Die Theme-Liste konnte nicht geladen werden. Unten stehen nur ein paar bekannte Themes als Platzhalter. Mit „Neu laden“ nochmal versuchen.',
      installing: 'Installiere…',
      install: 'Installieren & aktivieren',
      active: 'Aktiv',
      noResults: 'Keine Treffer.',
      moreResults: '{{count}} weitere Treffer. Weiter tippen zum Filtern.',
      installSuccess: '„{{id}}“ installiert und aktiviert. Zum Übernehmen oben auf „Speichern“ klicken.',
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
    savesImmediately: 'Speichert ohne Button: Schalter sofort, Textfelder beim Verlassen.',
    readAgainst: 'Dieser Editor kennt {{plugin}} {{read}}, installiert ist {{installed}}. Angaben können deshalb abweichen.',
    tabs: {
      installed: 'Installiert',
      navigations: 'Navigationen',
      extras: 'Zusätzliche Inhalte',
      languages: 'Mehrsprachigkeit',
      forms: 'Formulare',
      marketplace: 'Marktplatz'
    },
    descriptions: {
      installed: 'Installierte Quartz-Plugins und deren Einstellungen',
      navigations: 'Einstellungen für das Plugin „quartz-navigations“: Navigationen erstellen, verwalten und konfigurieren.',
      extras: 'Einstellungen für das Plugin „quartz-layout-box“: Zusätzliche Inhaltsboxen erstellen, verwalten und konfigurieren.',
      languages: 'Einstellungen für das Plugin „quartz-multilanguage“: Sprachen der Website und wie sie erkannt, umgeschaltet und veröffentlicht werden.',
      forms: 'Einstellungen für das Plugin „quartz-forms“: Formulare erstellen, verwalten und konfigurieren, samt Versand, Verschlüsselung und Spamschutz.',
      marketplace: 'Der Plugin-Katalog der quartz-community, inklusive der mitgelieferten. Plugins von anderswo fügst du über „owner/repo“ hinzu.'
    }
  },
  sitePreview: {
    title: 'Vorschau',
    notRunning: 'Die Vorschau zeigt die Website über den Dev-Server, und der läuft gerade nicht.',
    starting: 'Der Dev-Server startet…',
    start: 'Vorschau starten',
    stop: 'Vorschau beenden',
    stopHint: 'Stoppt den Dev-Server dieses Projekts, auch für die Seite „Vorschau & Build“.',
    remote: 'Der Dev-Server läuft über einen entfernten Host und lässt sich hier nicht einbetten. Öffne ihn auf der Seite „Vorschau & Build“.',
    page: 'Seite',
    pagePlaceholder: 'Startseite – oder z. B. ordner/seite',
    scaled: 'Gerendert mit {{width}} px Breite, gezeigt mit {{percent}} %.',
    zoom: 'Auf Element zoomen',
    assignClass: 'Eigene Klasse vergeben',
    classAssigned: '„{{name}}“ hat jetzt die Klasse {{cls}}.',
    marked: 'Markiert: „{{name}}“.',
    markShared_one: '„{{name}}“ teilt seine CSS-Klasse mit anderen Einträgen. Markiert ist jeder davon, auf dieser Seite einer.',
    markShared_other: '„{{name}}“ teilt seine CSS-Klasse mit anderen Einträgen. Markiert ist jeder davon, auf dieser Seite {{count}}.',
    markNoClass_one: '„{{name}}“ hat keine CSS-Klasse. Markiert ist jeder Eintrag dieses Plugins, auf dieser Seite einer.',
    markNoClass_other: '„{{name}}“ hat keine CSS-Klasse. Markiert ist jeder Eintrag dieses Plugins, auf dieser Seite {{count}}.',
    markNotFound: '„{{name}}“ kommt auf dieser Seite nicht vor.',
    markHidden: '„{{name}}“ steht auf dieser Seite, ist in dieser Ansicht aber nicht zu sehen (etwa ausgeblendet oder in einer Schublade).'
  },
  extraContent: {
    intro: 'Jede Box ist ein eigener Eintrag von quartz-layout-box. Ihr Inhalt steht entweder als Text in der Konfiguration oder in einer Datei unter quartz/static. Wo sie steht, legst du auf der Layout-Bühne fest. Jede Änderung wird sofort gespeichert.',
    listTitle_one: 'Eine Box',
    listTitle_other: '{{count}} Boxen',
    add: 'Neue Box',
    newTitle: 'Neue Box',
    newHtml: '<p>Hier steht der Text der Box.</p>',
    addedAnnounce: 'Box angelegt, im Bereich {{position}}.',
    duplicatedAnnounce: '„{{name}}“ dupliziert.',
    duplicateNamed: '„{{name}}“ duplizieren',
    removeConfirm: 'Box „{{name}}“ entfernen?\n\nDer Eintrag verschwindet aus der Konfiguration. Eine Datei, die diese Box zeigt, bleibt liegen.',
    removedAnnounce: '„{{name}}“ entfernt.',
    unnamed: 'Box',
    notPlaced: 'nicht platziert',
    off: 'aus',
    kindText: 'Text',
    kindFile: 'Datei {{file}}',
    brokenRow: 'Fehler: „{{key}}“ ohne Wert',
    broken: '„{{key}}“ hat keinen Wert, und quartz-layout-box bricht daran mit einem Fehler ab. Gib einen Text ein oder entferne die Angabe.',
    brokenLang: 'Für {{lang}} hat „{{key}}“ keinen Wert, und quartz-layout-box bricht auf diesen Seiten mit einem Fehler ab. Gib unter „Je Seite und Sprache“ einen Text ein oder entferne die Angabe.',
    panelLabel: 'Box',
    panelEmptyTitle: 'Keine Box gewählt',
    panelEmptyText: 'Wähle links eine Box, um Inhalt, Überschrift und Sprachen einzustellen.',
    enabled: 'Box aktiv',
    contentHeading: 'Inhalt',
    contentText: 'Text in der Konfiguration',
    contentTextHint: 'HTML, direkt hier geschrieben',
    contentFile: 'Datei',
    contentFileHint: 'Markdown oder HTML unter quartz/static',
    toFileConfirm: 'Den Text aus der Konfiguration entfernen?\n\nDie Box zeigt danach die gewählte Datei. Der Text ist dann weg; kopiere ihn vorher, wenn du ihn noch brauchst.',
    toFileConfirmLabel: 'Text entfernen',
    langOverride: 'Für {{langs}} gilt eine eigene Angabe unter „Je Seite und Sprache“; sie geht diesem Inhalt vor.',
    allOptions: 'Alle Optionen in der Plugin-Liste',
    optionsHeading: 'Optionen',
    leadText: 'Inhalt: Text',
    leadFile: 'Inhalt: Datei',
    leadContent: 'Inhalt',
    silencedByText: 'Wirkt nicht, solange die Box eigenen Text hat. Die Angabe bleibt stehen, damit du zurückwechseln kannst.',
    silencedEmpty: 'Steht ohne Wert in der Konfiguration und gilt deshalb als nicht gesetzt. Setze es zurück, um die Angabe zu entfernen.',
    notInstalledTitle: 'quartz-layout-box ist nicht installiert',
    notInstalledText: 'Installiere das Plugin über den Marktplatz; danach erscheinen seine Boxen hier.',
    previewHint: 'Die Website mit allen Boxen. Eine Box, die nur auf dem Desktop oder nur mobil erscheint, braucht die passende Ansicht.',
    files: {
      title: 'Dateien',
      intro: 'Verwalten und Hochladen von HTML-/Markdown-Dateien und Bildern, die in den Boxen genutzt werden können.',
      snippetsIn: 'Schnipsel in {{dir}}',
      images: 'Bilder in {{dir}}',
      empty: 'Noch keine Datei.',
      dirMissing: 'Den Ordner gibt es noch nicht; die erste Datei legt ihn an.',
      dirLink: 'Der Ordner liegt hinter einer Verknüpfung. Lesen funktioniert, QuartzControl ändert hier nichts.',
      dirUnusable: 'QuartzControl liest und schreibt in diesem Ordner nicht.',
      usedBy: 'benutzt von {{names}}',
      unused: 'von keiner Box benutzt',
      inherited: '{{name}} (Vorgabe)',
      newSnippet: 'Neue Datei',
      addSnippet: 'Datei hinzufügen',
      addImage: 'Bild hinzufügen',
      editNamed: '„{{name}}“ bearbeiten',
      renameNamed: '„{{name}}“ umbenennen',
      renameLabel: 'Neuer Name für „{{name}}“',
      renameSubmit: 'Umbenennen',
      cancel: 'Abbrechen',
      renameTaken: '„{{name}}“ gibt es in diesem Ordner schon. Wähle einen anderen Namen.',
      renamedAnnounce: '„{{from}}“ heißt jetzt „{{to}}“.',
      renamedWithBoxes_one: '„{{from}}“ heißt jetzt „{{to}}“; eine Box ist nachgezogen.',
      renamedWithBoxes_other: '„{{from}}“ heißt jetzt „{{to}}“; {{count}} Boxen sind nachgezogen.',
      renameReverted: '„{{to}}“ heißt wieder „{{from}}“: Die Boxen, die die Datei nennen, konnten nicht nachgezogen werden, weil die Konfiguration nicht geschrieben werden konnte (Meldung oben).',
      renameStuck: '„{{from}}“ heißt jetzt „{{to}}“, aber die Boxen, die die Datei nennen, nennen weiter „{{from}}“. Die Konfiguration konnte nicht geschrieben werden, und das Zurückbenennen ist auch gescheitert. Benenne die Datei zurück oder trage den neuen Namen in den Boxen ein.',
      projectIcon: 'Projektbild in {{dir}}',
      projectIconNote: 'Kommt aus dem Projektbild unter Konfiguration → Website. In einem Schnipsel bindest du es mit dem Pfad darunter ein.',
      projectIconLocked: 'Gehört zum Projektbild und lässt sich hier weder umbenennen noch löschen. Quartz baut daraus das Favicon.',
      imagesSearched: '„benutzt von“ sucht in den Boxen und ihren Schnipseln, nicht in den Seiten, den Stylesheets oder anderen Plugins.',
      imageRenameConfirm: '„{{name}}“ umbenennen?\n\nBenutzt von {{names}}. Diese Verweise stehen im Text, QuartzControl ändert sie nicht. Das Bild fehlt dort, bis du sie anpasst.',
      trashNamed: '„{{name}}“ in den Papierkorb legen',
      trashConfirm: '„{{name}}“ in den Papierkorb legen?',
      trashConfirmUsed: '„{{name}}“ in den Papierkorb legen?\n\nBenutzt von {{names}}. Dort fehlt die Datei danach.',
      trashLabel: 'In den Papierkorb',
      trashedAnnounce: '„{{name}}“ liegt im Papierkorb.',
      addedAnnounce: '„{{name}}“ hinzugefügt.'
    }
  },
  formsEditor: {
    intro: 'quartz-forms hält alle Formulare der Website in einem Eintrag. Ein Formular steht auf einer Seite, wenn diese es über seine Kennung einbindet, oder als Layout-Formular auf jeder Seite. Jede Änderung wird sofort gespeichert.',
    notInstalledTitle: 'quartz-forms ist nicht installiert',
    notInstalledText: 'Dieser Reiter bearbeitet die Formulare des Plugins quartz-forms. Installiere es im Marktplatz über „boxi-os/quartz-forms“.',
    severalEntries: 'Die Konfiguration nennt quartz-forms {{count}}-mal. Hier steht der erste Eintrag; die übrigen bearbeitest du unter „Installiert“.',
    enabled: 'Eingeschaltet',
    enabledHint: 'Ausgeschaltet baut die Website ohne Formulare. Seiten, die eines einbinden, zeigen dann den Codeblock oder den Platzhalter.',
    enabledAnnounce: 'Formulare eingeschaltet.',
    disabledAnnounce: 'Formulare ausgeschaltet.',
    allOptions: 'Alle Optionen',
    listTitle_one: 'Ein Formular',
    listTitle_other: '{{count}} Formulare',
    empty: 'Noch kein Formular. Lege eines aus einer Vorlage an.',
    add: 'Neues Formular',
    addSubmit: 'Anlegen',
    start: 'Beginnen mit',
    id: 'Kennung',
    idHint: 'Damit bindet eine Seite das Formular ein. Kleinbuchstaben, Ziffern und Bindestriche.',
    idRenameHint: 'Seiten, die das Formular einbinden, nennen diese Kennung. Wer sie ändert, ändert sie auch dort.',
    idProblem: {
      empty: 'Die Kennung fehlt.',
      pattern: 'Nur Kleinbuchstaben, Ziffern und Bindestriche, am Anfang ein Buchstabe oder eine Ziffer.',
      taken: 'Diese Kennung hat schon ein anderes Formular.'
    },
    templates: {
      contact: 'Kontakt',
      feedback: 'Feedback',
      rsvp: 'Anmeldung',
      survey: 'Umfrage',
      empty: 'Leer'
    },
    templateIds: {
      contact: 'kontakt',
      feedback: 'feedback',
      rsvp: 'anmeldung',
      survey: 'umfrage',
      empty: 'formular'
    },
    templateHints: {
      contact: 'Name, E-Mail, Nachricht, Einwilligung',
      feedback: 'Bewertung und Kommentar zur Seite',
      rsvp: 'Name, E-Mail, Termin, Personen',
      survey: 'Anonym: Auswahl, Skala, Kommentar',
      empty: 'Ein Nachrichtenfeld, alles Weitere selbst'
    },
    messageLabel: 'Nachricht',
    fromTemplate: 'Felder der Vorlage „{{template}}“',
    fieldCount_one: 'Ein Feld',
    fieldCount_other: '{{count}} Felder',
    transportKinds: {
      relay: 'Relay',
      endpoint: 'Endpunkt',
      formspree: 'Formspree',
      web3forms: 'Web3Forms',
      mailto: 'E-Mail-Programm'
    },
    encryptionModes: {
      required: 'verschlüsselt',
      optional: 'wahlweise verschlüsselt',
      off: 'unverschlüsselt'
    },
    layoutBadge: 'Layout',
    anonymousBadge: 'anonym',
    duplicateNamed: '„{{name}}“ kopieren',
    addedAnnounce: 'Formular „{{id}}“ angelegt.',
    duplicatedAnnounce: 'Kopie „{{id}}“ angelegt.',
    removeConfirm: '„{{name}}“ entfernen?\n\nSeiten, die „{{id}}“ einbinden, bauen danach nicht mehr, bis die Kennung dort entfernt ist.',
    removedAnnounce: '„{{name}}“ entfernt.',
    renameConfirm: 'Kennung „{{from}}“ in „{{to}}“ ändern?\n\nSeiten, die „{{from}}“ einbinden, bauen danach nicht mehr, bis die Kennung dort angepasst ist. Das Layout-Formular zieht mit.',
    renameSubmit: 'Kennung ändern',
    renamedAnnounce: 'Kennung „{{from}}“ heißt jetzt „{{to}}“.',
    positionAnnounce: 'Das Layout-Formular steht jetzt in „{{position}}“.',
    layoutOnAnnounce: '„{{id}}“ ist jetzt das Layout-Formular.',
    layoutOffAnnounce: '„{{id}}“ ist nicht mehr das Layout-Formular.',
    sectionsTitle: 'Einstellungen für alle Formulare',
    sections: {
      transport: 'Versand',
      keys: 'Schlüssel',
      spam: 'Spamschutz',
      layout: 'Layout-Formular',
      relay: 'Relay',
      texts: 'Texte',
      technical: 'Technisches'
    },
    sectionHints: {
      transport: 'Wohin ein Formular sendet. Jedes Formular kann einzelne Angaben für sich ändern.',
      keys: 'Öffentliche PGP-Schlüssel, an die verschlüsselnde Formulare senden.',
      spam: 'Schutz und Grenzen für alle Formulare. Jedes Formular kann einzelne Werte für sich ändern.',
      layout: 'Ein Formular, das auf jeder Seite an derselben Stelle steht, etwa unter dem Text. Eine Seite blendet es mit „form: false“ im Frontmatter aus.',
      relay: 'Das PHP-Skript auf deinem Webspace, das die Formulare als Mail weitergibt: wohin es kommt, was es weiß und das Hochladen.',
      texts: 'Eigene Wortlaute für die Texte des Plugins, je Sprache.',
      technical: 'Woran das Plugin eine Einbindung in einer Seite erkennt.'
    },
    noUrl: 'keine Adresse',
    noKeys: 'keine',
    allOff: 'alles aus',
    spamShort: {
      honeypot: 'Honeypot',
      minSeconds: 'Zeitfalle {{seconds}} s',
      pow: 'Rechenaufgabe',
      rate: 'höchstens {{perHour}}/h'
    },
    noLayoutForm: 'Kein Layout-Formular',
    unknownForm: 'Unbekanntes Formular „{{id}}“',
    layoutFormHint: 'Das Formular, das über den Layout-Block dieses Eintrags auf jeder Seite steht.',
    notPlaced: 'nicht platziert',
    notPlacedHint: 'Der Eintrag hat noch keinen Layout-Block. Eine Position legt ihn an.',
    ownTexts_one: 'Ein eigener Text',
    ownTexts_other: '{{count}} eigene Texte',
    pluginTexts: 'Texte des Plugins',
    panelLabel: 'Formular bearbeiten',
    panelEmptyTitle: 'Formulare',
    panelEmptyText: 'Wähle links ein Formular oder eine Einstellung.',
    previewHint: 'Ein Formular erscheint auf Seiten, die es einbinden, und als Layout-Formular auf jeder Seite.',
    parts: {
      general: 'Allgemein',
      fields: 'Felder',
      sending: 'Versand',
      privacy: 'Datenschutz und Verschlüsselung',
      spam: 'Spamschutz',
      embed: 'Einbinden'
    },
    template: 'Vorlage',
    noTemplate: 'Keine Vorlage',
    templateHint: 'Die Vorlage liefert Felder, Titel und Voreinstellungen. Ohne Vorlage werden sie zu eigenen Angaben des Formulars.',
    templateOwnFieldsHint: 'Das Formular hat eigene Felder; die Vorlage liefert nur noch Titel und Voreinstellungen.',
    title: 'Titel',
    description: 'Beschreibung',
    descriptionHint: 'Ein Satz unter dem Titel.',
    submitLabel: 'Text des Senden-Buttons',
    submitLabelHint: 'Leer: der Text des Plugins.',
    afterSending: 'Nach dem Senden',
    successModes: {
      inline: 'Dank anzeigen',
      redirect: 'Zu einer Seite wechseln'
    },
    successText: 'Danktext',
    successTextHint: 'Ersetzt das Formular nach dem Senden. Leer: der Text des Plugins.',
    successSlug: 'Zielseite',
    successSlugHint: 'Der Slug einer Seite der Website, z. B. „danke“. Der Build prüft, ob es sie gibt.',
    classNameHint: 'Zusätzliche CSS-Klassen am Formular, neben „quartz-form“.',
    sendsVia: 'Sendet über: {{kind}}. Den Weg für alle Formulare legst du unter „Versand“ fest.',
    recipient: {
      relay: 'Empfänger (Name)',
      mailto: 'Empfänger (E-Mail-Adresse)',
      none: 'Empfänger'
    },
    recipientHint: {
      relay: 'Ein Name, dem das Relay eine Adresse zuordnet. Die Adresse steht nur auf dem Server.',
      mailto: 'Die Adresse, an die das E-Mail-Programm des Besuchers schreibt.',
      none: 'Wirkt nicht: Dieser Versandweg kennt keinen Empfänger, der Dienst stellt selbst zu.'
    },
    subject: 'Betreff',
    subjectHint: 'Leer: der Titel des Formulars.',
    encryption: 'Verschlüsselung',
    encryptionChoices: {
      off: 'Aus',
      optional: 'Wahlweise',
      required: 'Immer'
    },
    encryptionHints: {
      off: 'Die Nachricht geht als Klartext.',
      optional: 'Ein Häkchen, das der Besucher abwählen kann. Ohne JavaScript sendet das Formular unverschlüsselt.',
      required: 'Nichts verlässt die Seite unverschlüsselt. Ohne JavaScript kann das Formular nicht senden.'
    },
    noKeysYet: 'Es gibt noch keinen Schlüssel, an den verschlüsselt werden kann.',
    encryptTo: 'Verschlüsseln an',
    encryptToHint: 'Sind alle gewählt, gilt auch jeder später angelegte Schlüssel.',
    showFingerprint: 'Fingerabdruck zeigen',
    showFingerprintHint: 'Unter dem Formular, damit Besucher ihn mit dem vergleichen können, den du veröffentlichst.',
    anonymous: 'Anonym',
    anonymousHint: 'Keine Pflichtangaben zur Person, kein Reply-To, kein Seitenkontext, kein Captcha eines Drittanbieters.',
    pageContext: 'Seite mitschicken',
    pageContextHint: 'Titel und Slug der Seite, auf der das Formular steht, etwa für Feedback.',
    asAllForms: 'wie für alle Formulare',
    asAllFormsChoice: 'Wie für alle Formulare: {{value}}',
    text: {
      perLanguage: 'Je Sprache',
      oneForAll: 'Ein Text für alle Sprachen'
    },
    fieldGroups: {
      text: 'Eingabe',
      choice: 'Auswahl',
      other: 'Sonstiges'
    },
    fieldTypes: {
      text: 'Textzeile',
      textarea: 'Textfeld',
      email: 'E-Mail',
      tel: 'Telefon',
      url: 'Webadresse',
      number: 'Zahl',
      date: 'Datum',
      select: 'Auswahlliste',
      radio: 'Eine Wahl',
      checkboxes: 'Mehrfachwahl',
      checkbox: 'Häkchen',
      scale: 'Skala',
      consent: 'Einwilligung',
      pgpKey: 'Schlüssel des Besuchers',
      hidden: 'Verborgener Wert'
    },
    fieldTypeHints: {
      text: 'Eine Zeile, etwa ein Name',
      textarea: 'Mehrere Zeilen, etwa eine Nachricht',
      email: 'Eine E-Mail-Adresse, geprüft',
      tel: 'Eine Telefonnummer',
      url: 'Eine Webadresse, geprüft',
      number: 'Eine Zahl, mit Grenzen',
      date: 'Ein Datum',
      select: 'Eine Wahl aus einer aufklappenden Liste',
      radio: 'Eine Wahl, alle Möglichkeiten sichtbar',
      checkboxes: 'Mehrere Wahlen',
      checkbox: 'Ein einzelnes Ja',
      scale: 'Eine Bewertung, etwa 1 bis 5',
      consent: 'Ein Häkchen, ohne das nichts gesendet wird',
      pgpKey: 'Der öffentliche Schlüssel des Besuchers, für eine verschlüsselte Antwort',
      hidden: 'Ein fester Wert, der mitgeht und nicht zu sehen ist'
    },
    fieldNames: {
      text: 'text',
      textarea: 'nachricht',
      email: 'email',
      tel: 'telefon',
      url: 'webseite',
      number: 'zahl',
      date: 'datum',
      select: 'auswahl',
      radio: 'wahl',
      checkboxes: 'mehrfachwahl',
      checkbox: 'haekchen',
      scale: 'bewertung',
      consent: 'einwilligung',
      pgpKey: 'schluessel',
      hidden: 'quelle'
    },
    addField: 'Feld hinzufügen',
    noFields: 'Das Formular hat keine Felder. Ohne Feld bricht der Build ab.',
    takeTemplateFields: 'Felder übernehmen und bearbeiten',
    dragField: '{{name}} verschieben',
    requiredBadge: 'Pflicht',
    optionalByAnonymousBadge: 'optional, weil anonym',
    onePgpKey: 'Ein Formular hat höchstens ein Schlüsselfeld.',
    fieldAddedAnnounce: 'Feld „{{name}}“ hinzugefügt.',
    fieldRemovedAnnounce: 'Feld „{{name}}“ entfernt.',
    fieldMovedAnnounce: '„{{name}}“ steht jetzt an Stelle {{n}} von {{count}}.',
    removeFieldConfirm: 'Feld „{{name}}“ entfernen?\n\nWas Besucher darin angegeben hätten, geht dann nicht mehr mit.',
    consentDefault: 'Ich bin einverstanden, dass meine Angaben zur Bearbeitung meiner Anfrage verarbeitet werden.',
    optionDefault: 'Möglichkeit {{n}}',
    fieldName: 'Name',
    fieldNameHint: 'So heißt das Feld in der Nachricht und in der Konfiguration.',
    fieldNameProblem: {
      empty: 'Der Name fehlt.',
      pattern: 'Ein Buchstabe, dann Buchstaben, Ziffern, „_“ oder „-“.',
      reserved: 'Diesen Namen braucht das Plugin selbst.',
      taken: 'Ein anderes Feld heißt schon so.'
    },
    fieldType: 'Art',
    fieldLabel: 'Beschriftung',
    fieldHint: 'Hinweis',
    fieldHintHint: 'Ein Satz unter dem Feld.',
    placeholder: 'Platzhalter',
    required: 'Pflichtfeld',
    consentText: 'Text der Einwilligung',
    consentLinkLabel: 'Text des Links',
    consentLinkLabelHint: 'Leer: der Text des Plugins. Der Link selbst steht unten unter „link“.',
    minLabel: 'Beschriftung am unteren Ende',
    maxLabel: 'Beschriftung am oberen Ende',
    choiceOptions: 'Möglichkeiten',
    choiceOptionsHint: 'Der Wert geht mit der Nachricht, die Beschriftung sehen Besucher.',
    optionValue: 'Wert',
    optionLabel: 'Beschriftung',
    addOption: 'Möglichkeit hinzufügen',
    andMore: '{{list}} und {{count}} weitere',
    removeConfirmUsed_one: '„{{name}}“ entfernen?\n\nEine Seite bindet „{{id}}“ ein ({{pages}}). Sie baut danach nicht mehr, bis die Kennung dort entfernt ist.',
    removeConfirmUsed_other: '„{{name}}“ entfernen?\n\n{{count}} Seiten binden „{{id}}“ ein ({{pages}}). Sie bauen danach nicht mehr, bis die Kennung dort entfernt ist.',
    removeConfirmUnused: '„{{name}}“ entfernen?\n\nKeine Seite bindet es ein.',
    renameConfirmUsed_one: 'Kennung „{{from}}“ in „{{to}}“ ändern?\n\nEine Seite nennt „{{from}}“ ({{pages}}). Sie baut danach nicht mehr, bis die Kennung dort angepasst ist.',
    renameConfirmUsed_other: 'Kennung „{{from}}“ in „{{to}}“ ändern?\n\n{{count}} Seiten nennen „{{from}}“ ({{pages}}). Sie bauen danach nicht mehr, bis die Kennung dort angepasst ist.',
    onPages_one: 'auf einer Seite',
    onPages_other: 'auf {{count}} Seiten',
    onNoPage: 'auf keiner Seite',
    unknownUses_one: 'Eine Seite nennt ein Formular, das es nicht gibt: {{list}}. Der Build bricht daran ab.',
    unknownUses_other: '{{count}} Stellen nennen Formulare, die es nicht gibt: {{list}}. Der Build bricht daran ab.',
    scanFailed: 'Die Seiten konnten nicht durchsucht werden: {{reason}}',
    usedOn: 'Steht auf',
    rescan: 'Neu suchen',
    scanning: 'Seiten werden durchsucht …',
    onNoPageLayout: 'Keine Seite bindet es ein. Als Layout-Formular steht es auf jeder Seite.',
    onNoPageHint: 'Noch keine Seite bindet es ein. Füge eine der Zeilen oben in eine Seite ein.',
    showInPreview: 'Zeigen',
    usedOnHint: 'Gesucht in den Seiten, die Quartz baut. Ein Formular, das gerade erst eingefügt wurde, findet „Neu suchen“.',
    successSlugUnknown: 'Keine Seite der Website hat diesen Slug. Der Build bricht dann ab.',
    noSuchPage: 'Keine passende Seite',
    keys: {
      none: 'Noch kein Schlüssel. Verschlüsselnde Formulare brauchen mindestens einen.',
      add: 'Schlüssel hinzufügen',
      name: 'Name',
      nameHint: 'So nennen ihn die Formulare unter „Verschlüsseln an“. Buchstaben, Ziffern, „_“ und „-“.',
      nameProblem: {
        empty: 'Der Name fehlt.',
        pattern: 'Nur Buchstaben, Ziffern, „_“ und „-“, höchstens 64 Zeichen.',
        taken: 'Diesen Namen hat schon ein Schlüssel.'
      },
      way: 'Herkunft',
      wayFile: 'Aus einer Datei',
      wayPaste: 'Einfügen',
      pickFile: 'Datei wählen …',
      pickFileHint: 'Die Datei wird nach quartz-forms/keys/ im Projekt kopiert. Sie wird beim Bauen gelesen, aber nicht als Datei veröffentlicht.',
      pasteLabel: 'Öffentlicher Schlüssel im Textformat',
      pasteSubmit: 'Prüfen und übernehmen',
      fromFile: 'Datei {{file}}',
      pasted: 'eingefügt',
      expires: 'läuft ab am {{date}}',
      unread: 'quartz-forms hat diesen Schlüssel nicht gemeldet.',
      usedBy: 'verschlüsselt für: {{forms}}',
      unused: 'kein verschlüsselndes Formular nutzt ihn',
      checking: 'quartz-forms prüft die Schlüssel …',
      notChecked: 'Konnte nicht geprüft werden: {{reason}}',
      refused: 'Nicht übernommen: {{problem}}',
      overwriteConfirm: '„{{file}}“ ersetzen?\n\nDie Datei liegt schon im Projekt. Ersetzt, verschlüsseln Formulare danach an den neuen Schlüssel.',
      overwrite: 'Ersetzen',
      addedAnnounce: 'Schlüssel „{{name}}“ hinzugefügt.',
      removedAnnounce: 'Schlüssel „{{name}}“ entfernt.',
      removeConfirm: 'Schlüssel „{{name}}“ entfernen?',
      removeConfirmUsed_one: 'Schlüssel „{{name}}“ entfernen?\n\nDas Formular {{forms}} verschlüsselt an ihn. Ohne einen anderen Schlüssel bricht der Build ab.',
      removeConfirmUsed_other: 'Schlüssel „{{name}}“ entfernen?\n\nDie Formulare {{forms}} verschlüsseln an ihn. Ohne einen anderen Schlüssel bricht der Build ab.'
    },
    check: {
      checking: 'quartz-forms prüft …',
      unavailable: 'Konnte nicht geprüft werden: {{reason}}',
      summaryOk: 'quartz-forms meldet keine Probleme.',
      summaryProblems_one: 'quartz-forms meldet ein Problem. Der Build bricht daran ab.',
      summaryProblems_other: 'quartz-forms meldet {{count}} Probleme. Der Build bricht daran ab.',
      problemBadge_one: 'ein Problem',
      problemBadge_other: '{{count}} Probleme',
      problems_one: 'Ein Problem (Meldung von quartz-forms)',
      problems_other: '{{count}} Probleme (Meldungen von quartz-forms)',
      hints_one: 'Ein Hinweis',
      hints_other: '{{count}} Hinweise'
    },
    relay: {
      loading: 'Relay wird gelesen …',
      problemsFirst: 'quartz-forms erzeugt das Relay erst, wenn die Formulare ohne Probleme sind:',
      exampleAddress: 'Eine Adresse unter „@example.“ hält das Relay für den Platzhalter seiner Vorlage und weist das Formular ab. Trage eine echte Adresse ein.',
      captchaSecretFor: 'Captcha-Secret für „{{form}}“',
      captchaSecretForHint: 'Dieses Formular hat unter „Spamschutz“ einen eigenen Anbieter oder Site-Key ({{provider}}), also auch ein eigenes Secret.',
      captchaUnused: 'Kein Formular braucht es gerade. Entfernen schadet nicht.',
      secretMissing: 'fehlt',
      removeSecretNamed: '{{name}} entfernen',
      allForms: 'alle Formulare',
      blockCaptcha: 'Captcha-Secret fehlt für {{names}}.',
      statusNever: 'noch nie hochgeladen',
      statusCurrent: 'hochgeladen am {{date}}, aktuell',
      statusChanged: 'seit dem Hochladen am {{date}} geändert',
      statusMoved: 'Ziel oder Ordner geändert seit dem Hochladen am {{date}}',
      statusBroken: 'kann gerade nicht erzeugt werden',
      noStorage: 'Auf diesem System kann QuartzControl keine Zugangsdaten verschlüsselt speichern. Adressen und Secrets lassen sich deshalb nicht hinterlegen; „Als Ordner speichern“ schreibt Platzhalter.',
      target: 'Ziel',
      targetHint: 'Ein Veröffentlichungsziel dieses Projekts. Das Relay geht in einen Unterordner seines Pfads und löscht dort nie etwas.',
      noTargets: 'Es gibt noch kein SFTP-, FTP- oder Ordner-Ziel. Lege eines unter „Veröffentlichen“ an.',
      noTarget: 'Kein Ziel',
      subdir: 'Unterordner',
      subdirHint: 'Unter dem Pfad des Ziels, z. B. „forms“. Dort liegen danach send.php und die Konfiguration.',
      conflict: 'Das Ziel „{{target}}“ überträgt per rsync und löscht, was der Build nicht hat, also auch „{{path}}“.',
      excludeSubmit: '„{{path}}“ dort ausschließen',
      url: 'Adresse von send.php',
      useUrl: 'Vorschlag übernehmen',
      urlHint: 'Dorthin senden die Formulare (Versand für alle Formulare). Der Vorschlag gilt, wenn das Ziel die Website selbst ist.',
      urlAnnounce: 'Adresse des Relays eingetragen.',
      from: 'Absender',
      fromHint: 'Eine Adresse der Domain des Webspace, sonst weisen Mailserver die Nachrichten ab (SPF).',
      origins: 'Erlaubte Origins',
      originsHint: 'Nur Anfragen von diesen Adressen nimmt das Relay an, mit Komma getrennt. Leer: jede.',
      useOrigin: '{{origin}} eintragen',
      recipients: 'Empfänger',
      noRecipients: 'Noch kein Formular nennt einen Empfänger.',
      addressSet: 'Adresse gesetzt',
      addressMissing: 'Adresse fehlt',
      unusedName: 'von keinem Formular genutzt',
      removeAddress: 'Adresse für „{{name}}“ entfernen',
      addressRemovedAnnounce: 'Adresse für „{{name}}“ entfernt.',
      addressFor: 'Adresse für „{{name}}“',
      replaceAddress: 'neue Adresse, ersetzt die gespeicherte',
      saveAddress: 'Speichern',
      addressSetAnnounce: 'Adresse für „{{name}}“ gespeichert.',
      recipientsHint: 'Die Namen kommen aus den Formularen. Die Adressen speichert QuartzControl verschlüsselt und schreibt sie nur in die config.php des Relays, nie auf die Website.',
      captchaSecret: 'Captcha-Secret',
      secretSet: 'gesetzt',
      saveSecret: 'Speichern',
      secretSetAnnounce: 'Captcha-Secret gespeichert.',
      secretRemovedAnnounce: 'Captcha-Secret entfernt.',
      captchaSecretHint: 'Der geheime Schlüssel von {{provider}} für die Formulare, die das Captcha für alle nutzen. Der öffentliche steht unter „Spamschutz“.',
      mailer: 'Versand der Mails',
      mailerMail: 'PHP mail()',
      mailerHint: 'mail() reicht bei fast jedem Webhoster. sendmail nur, wenn der Hoster es so verlangt.',
      sendmailPath: 'sendmail-Aufruf',
      sendmailPathHint: 'Mit „-i“, sonst beendet eine Zeile mit einem einzelnen Punkt die Nachricht.',
      subjectPrefix: 'Betreff-Präfix',
      subjectPrefixHint: 'Steht vor jedem Betreff, z. B. „[Website]“.',
      counterDir: 'Ordner für Zähler',
      counterDirHint: 'Ein absoluter Pfad auf dem Server, am besten außerhalb des Web-Verzeichnisses. Leer: „counters“ neben send.php.',
      upload: 'Relay hochladen',
      uploading: 'Wird hochgeladen …',
      uploadAll: 'Alles neu hochladen',
      export: 'Als Ordner speichern …',
      exportConfirm: 'Relay nach „{{dir}}“ schreiben?\n\nDie config.php darin enthält Empfängeradressen und das Secret im Klartext. Lade den Ordner nur auf deinen Webspace und lege ihn nicht in die Website.',
      exportSubmit: 'Schreiben',
      cannotUpload: 'Noch nicht bereit: {{reasons}}',
      blockStorage: 'Zugangsdaten können nicht verschlüsselt gespeichert werden.',
      blockTarget: 'Kein Ziel gewählt.',
      blockFrom: 'Kein Absender.',
      blockRecipients: 'Adresse fehlt für {{names}}.',
      blockConflict: 'Ein Website-Ziel würde das Relay löschen.',
      blockProblems: 'Die Formulare haben Probleme.',
      done: 'Fertig.',
      uploadedAnnounce: 'Relay hochgeladen.',
      uploadFailedAnnounce: 'Relay konnte nicht hochgeladen werden.'
    },
    recipientPick: {
      none: 'Kein Empfänger',
      new: 'Neuer Empfänger …',
      name: 'Name des Empfängers',
      nameHint: 'So nennen ihn die Formulare und das Relay, z. B. „kontakt“ oder „redaktion“. Die Adresse sieht niemand auf der Website.',
      nameProblem: {
        empty: 'Der Name fehlt.',
        pattern: 'Buchstaben, Ziffern, „.“, „_“ und „-“, am Anfang ein Buchstabe oder eine Ziffer.',
        taken: 'Diesen Namen gibt es schon; wähle ihn in der Liste.'
      },
      address: 'Adresse',
      addressHint: 'Wird verschlüsselt gespeichert und nur in die config.php des Relays geschrieben. Leer lassen, um sie später im Abschnitt „Relay“ einzutragen.',
      add: 'Übernehmen'
    },
    templateFieldsNote: 'Das Formular nimmt die Felder seiner Vorlage. Eigene Felder ersetzen sie ganz.',
    ownTransport: 'Versandweg für dieses Formular',
    ownTransportHint: 'Was hier nicht gesetzt ist, gilt wie unter „Versand“ für alle Formulare.',
    ownSpamHint: 'Was hier nicht gesetzt ist, gilt wie unter „Spamschutz“ für alle Formulare.',
    pageContextAnonymous: 'Ein anonymes Formular schickt die Seite nie mit.',
    embedHint: 'Eine Seite bindet das Formular mit einer dieser Zeilen ein. QuartzControl schreibt nichts in deine Seiten.',
    embedKinds: {
      placeholder: 'Platzhalter im Text',
      codeBlock: 'Codeblock',
      frontmatter: 'Frontmatter (am Seitenende)'
    },
    copy: 'Kopieren',
    copied: 'In die Zwischenablage kopiert.',
    useAsLayoutForm: 'Als Layout-Formular verwenden',
    useAsLayoutFormHint: 'Steht dann auf jeder Seite an der Position des Layout-Formulars. Es gibt nur eines.'
  },
  multilanguageEditor: {
    intro: 'quartz-multilanguage betrifft die ganze Website. Jede Änderung wird sofort gespeichert.',
    notInstalledTitle: 'quartz-multilanguage ist nicht installiert',
    notInstalledText: 'Dieser Reiter bearbeitet die Sprachen einer Website mit quartz-multilanguage. Installiere das Plugin im Marktplatz, dann erscheinen sie hier.',
    severalEntries: 'Die Konfiguration nennt quartz-multilanguage {{count}}-mal. Hier steht der erste Eintrag; die übrigen bearbeitest du unter „Installiert“.',
    defaultUnknown: 'Die Standardsprache „{{code}}“ ist keine der Sprachen. Das Plugin nimmt deshalb die erste, {{name}}.',
    enabled: 'Eingeschaltet',
    enabledHint: 'Ausgeschaltet baut die Website ohne Spracherkennung, Sprachwechsler und Weiterleitungen.',
    enabledAnnounce: 'Mehrsprachigkeit eingeschaltet.',
    disabledAnnounce: 'Mehrsprachigkeit ausgeschaltet.',
    allOptions: 'Alle Optionen',
    listTitle_one: 'Eine Sprache',
    listTitle_other: '{{count}} Sprachen',
    add: 'Neue Sprache',
    addSubmit: 'Hinzufügen',
    addHint: 'Der Code, mit dem Ordner, Dateinamen und Frontmatter die Sprache nennen, z. B. „fr“.',
    addedAnnounce: 'Sprache „{{code}}“ hinzugefügt.',
    removeConfirm: 'Sprache „{{name}}“ entfernen?\n\nSie verschwindet aus der Konfiguration, auch als Standardsprache und aus der Liste der veröffentlichten. Ihre Seiten bleiben liegen und gelten danach als Seiten der Standardsprache.',
    removeOnlyPublishedConfirm: 'Sprache „{{name}}“ entfernen und {{others}} veröffentlichen?\n\n„{{name}}“ ist die einzige veröffentlichte Sprache. Ohne sie gilt die Liste als leer, und eine leere Liste veröffentlicht alle Sprachen. Der nächste Build und das nächste Veröffentlichen nehmen dann auch die mit, die du bisher zurückgehalten hast. Wer das nicht will, schaltet vorher eine andere Sprache auf „Veröffentlichen“.',
    removeAndPublish: 'Entfernen und veröffentlichen',
    removedAnnounce: '„{{name}}“ entfernt.',
    renamedAnnounce: 'Sprachcode „{{from}}“ heißt jetzt „{{to}}“.',
    defaultAnnounce: '{{name}} ist jetzt die Standardsprache.',
    publishedAnnounce: '{{name}} wird veröffentlicht.',
    unpublishedAnnounce: '{{name}} wird nicht mehr veröffentlicht.',
    movedAnnounce: '{{name}} steht jetzt an Stelle {{n}} von {{count}}.',
    defaultBadge: 'Standard',
    unpublishedBadge: 'nicht veröffentlicht',
    panelLabel: 'Sprache oder Einstellung',
    panelEmptyTitle: 'Überblick',
    panelEmptyText: 'Wähle links eine Sprache oder einen Bereich der Einstellungen.',
    summaryLanguages: 'Sprachen',
    summaryDefault: 'Standardsprache',
    summaryPublished: 'Veröffentlicht',
    publishedAll: 'alle',
    summaryDetection: 'Erkennung',
    summaryRoot: 'Startseite',
    summaryRemember: 'Wahl wird gemerkt',
    on: 'an',
    off: 'aus',
    none: 'keine',
    allOff: 'alle aus',
    detectionValues: { folder: 'Ordner', suffix: 'Suffix', frontmatter: 'Frontmatter' },
    short: {
      missingTranslationNotice: 'Hinweis bei fehlender Übersetzung',
      availableTranslationNotice: 'Hinweis bei vorhandener Übersetzung',
      rewriteCrossLanguageLinks: 'Links umschreiben',
      localizeDates: 'Datum übersetzen'
    },
    codeHint: 'Ordner und Dateinamen im Inhalt ändert ein neuer Code nicht; Standardsprache und Veröffentlichen ziehen mit.',
    codeProblem: {
      empty: 'Der Code darf nicht leer sein.',
      taken: 'Diese Sprache gibt es schon.',
      form: 'Ein Code enthält keine Leerzeichen und keine Schrägstriche.'
    },
    positionOf: 'Stelle {{n}} von {{count}}',
    isDefault: 'Standardsprache',
    isDefaultHint: 'Gilt für Seiten, die keine Erkennung einer Sprache zuordnet.',
    isDefaultHintOn: 'Um das abzugeben, mache eine andere Sprache zur Standardsprache.',
    publish: 'Veröffentlichen',
    publishHint: 'Ausgeschaltet baut die Website ohne die Seiten dieser Sprache. QUARTZ_LANGS beim Bauen hat Vorrang.',
    publishOnlyHint: 'Die einzige veröffentlichte Sprache bleibt aktiv.',
    order: 'Reihenfolge',
    orderHint: 'In dieser Reihenfolge stehen die Sprachen im Sprachwechsler.',
    noSchema: 'Ohne die Beschreibung des Plugins gibt es keine Gliederung. Was die Konfiguration setzt, steht unter „Weitere Optionen“; alles andere unter „Alle Optionen“.',
    otherGroup: 'Weitere Optionen',
    sectionsTitle: 'Einstellungen',
    switcherAt: 'Steht im Bereich {{position}}.',
    switcherNotPlaced: 'Steht noch nirgends auf der Seite.',
    previewHint: 'Der Sprachwechsler sitzt an der Position, die in der Layout-Bühne eingestellt ist.'
  },
  navigationsEditor: {
    intro: 'Jede Navigation ist ein eigener Eintrag von quartz-navigations. Wähle eine aus, um ihre Variante und Optionen einzustellen; wo sie steht, legst du auf der Layout-Bühne fest. Jede Änderung wird sofort gespeichert, und die Vorschau lädt nach dem Neubau von selbst.',
    listTitle_one: 'Navigation',
    listTitle_other: '{{count}} Navigationen',
    add: 'Neue Navigation',
    addQuestion: 'Welche Variante? Die Navigation wird dort platziert, wo diese Variante üblicherweise steht. Die Position lässt sich auf der Layout-Bühne verändern.',
    addedAnnounce: 'Navigation „{{variant}}“ angelegt, im Bereich {{position}}.',
    duplicatedAnnounce: '„{{name}}“ dupliziert.',
    duplicateNamed: '„{{name}}“ duplizieren',
    removeConfirm: 'Navigation „{{name}}“ entfernen?\n\nIhr Eintrag mit allen Optionen verschwindet aus der Konfiguration, das Plugin bleibt installiert. Zurück kommt sie nur über einen Snapshot, den du vorher angelegt hast.',
    removedAnnounce: '„{{name}}“ entfernt.',
    notPlaced: 'nicht platziert',
    off: 'aus',
    panelLabel: 'Einstellungen der Navigation',
    panelEmptyTitle: 'Keine Navigation gewählt',
    panelEmptyText: 'Wähle links eine Navigation, um ihre Variante und Optionen einzustellen.',
    enabled: 'Navigation aktiv',
    variantHeading: 'Variante',
    allOptions: 'Alle Optionen in der Plugin-Liste',
    optionsHeading: 'Optionen',
    leadTitle: 'Einstellungen der Variante „{{variant}}“',
    leadEmpty: 'Diese Variante hat keine eigenen Einstellungen.',
    leadByMobile: 'Dazu kommen Einstellungen, die wirken, weil auf dem Smartphone {{mobile}} gewählt ist.',
    notWith: 'Wirkt nicht bei der Variante {{variants}}.',
    notWith_other: 'Wirkt nicht bei den Varianten {{variants}}.',
    onlyWith: 'Wirkt nur bei der Variante {{variants}}.',
    onlyWith_other: 'Wirkt nur bei den Varianten {{variants}}.',
    withMobile: 'Bei „{{variant}}“ nur, wenn auf dem Smartphone {{mobile}} gewählt ist.',
    readNowhere: 'Das Plugin liest diese Option derzeit nicht.',
    notInstalledTitle: 'quartz-navigations ist nicht installiert',
    notInstalledText: 'Dieser Reiter stellt die Navigationen des Plugins quartz-navigations ein. Installiere es im Marktplatz über „boxi-os/quartz-navigations“.',
    previewHint: 'Die Website, wie der Dev-Server sie gerade baut.',
    variants: {
      tree: { label: 'Baum', text: 'Verschachtelte Liste, alles offen. Für Seitenleisten.' },
      accordion: { label: 'Akkordeon', text: 'Ordner klappen auf, der Pfad zur Seite ist offen.' },
      flyout: { label: 'Seitliche Panels', text: 'Ordner öffnen ein Panel daneben.' },
      bar: { label: 'Leiste', text: 'Erste Ebene in einer Zeile. Kopf oder Fuß.' },
      dropdown: { label: 'Aufklappmenü', text: 'Zeile, Ordner öffnen ein Panel darunter.' },
      mega: { label: 'Mega-Menü', text: 'Panel mit der zweiten Ebene als Spalten.' },
      tabs: { label: 'Reiter', text: 'Erste Ebene als Reiter, Kinder in einer zweiten Zeile.' },
      columns: { label: 'Spalten', text: 'Überschriften mit Kindern darunter. Sitemap im Fuß.' },
      select: { label: 'Auswahlliste', text: 'Ein Sprungmenü, Ordner als Gruppen.' },
      pager: { label: 'Zurück / Weiter', text: 'Vorige und nächste Seite. Unter den Text.' }
    }
  },
  pluginOptions: {
    notes_one: 'Eine Angabe im Schema dieses Plugins versteht QuartzControl nicht',
    notes_other: '{{count}} Angaben im Schema dieses Plugins versteht QuartzControl nicht',
    rarelyUsed: 'Selten gebraucht',
    onlyWhen: 'Wirkt nur, wenn {{conditions}}.',
    conditionPart: '„{{name}}“ auf {{values}} steht',
    conditionOn: '„{{name}}“ eingeschaltet ist',
    conditionOff: '„{{name}}“ ausgeschaltet ist',
    conditionOr: ' oder ',
    conditionAnd: ' und ',
    matches_one: 'Ein Treffer',
    matches_other: '{{count}} Treffer',
    moreKeys: 'Unbekannte Schlüssel',
    freeKey: 'Weitere Option eintragen',
    moreKeysHint: 'Diese Schlüssel stehen in der Konfiguration, das Plugin beschreibt sie aber nicht.',
    resetNamed: '{{name}} auf die Vorgabe zurücksetzen',
    removeNamed: '{{name}} entfernen',
    isDefault: 'Vorgabe',
    asAbove: 'wie oben',
    asAboveChoice: 'Wie oben: {{value}}',
    resetInheritNamed: '{{name}} wieder von oben übernehmen',
    notSet: 'nicht gesetzt',
    defaultChoice: 'Vorgabe: {{value}}',
    defaultList: 'Vorgabe: {{value}}',
    customize: 'Anpassen',
    addItem: 'Eintrag hinzufügen',
    emptyList: 'Die Liste ist leer.',
    moveItemUp: 'Eintrag {{n}} nach oben',
    moveItemDown: 'Eintrag {{n}} nach unten',
    removeItem: 'Eintrag {{n}} entfernen',
    emptyRecord: 'Noch keine Einträge.',
    removeEntry: '„{{key}}“ entfernen',
    addLanguage: 'Sprache hinzufügen',
    entryKeyPlaceholder: 'Schlüssel',
    addEntry: 'Hinzufügen',
    shape: 'Form von {{name}}',
    kind: {
      enum: 'Auswahl',
      boolean: 'Ja/Nein',
      string: 'Text',
      number: 'Zahl',
      object: 'Einstellungen',
      record: 'Zuordnung',
      array: 'Liste',
      json: 'JSON',
      union: 'Mehrere Formen'
    },
    jsonInvalid: 'Kein gültiges JSON – nicht gespeichert.',
    jsonHint: 'Als JSON bearbeiten; leer heißt „nicht gesetzt“.',
    fromDefaults: 'Das Plugin beschreibt seine Optionen nicht. Die Felder kommen aus seinen Vorgaben.',
    none: 'Dieses Plugin hat keine Optionen.',
    unreadable: 'Die Beschreibung der Optionen ließ sich nicht lesen: {{reason}}',
    changed: 'geändert',
    noEffect: 'wirkt nicht',
    groupCountChanged: '{{count}} · {{changed}} geändert',
    searchPlaceholder: 'Optionen durchsuchen…',
    noMatch: 'Keine Option passt zur Suche.'
  },
  snippets: {
    placeholders: {
      summary: 'Verfügbare Platzhalter ({{count}})',
      introInsert: 'Beim Bauen ersetzt, im Text und im Titel der Box; ein unbekannter bleibt stehen, wie er geschrieben ist. Ein Klick fügt ihn am Cursor ein.',
      off: 'Ausgeschaltet: Die Platzhalter bleiben stehen, wie sie geschrieben sind. Schalte „placeholders“ ein.',
      insertNamed: '{{token}} einfügen',
      title: 'Titel der Seite, aus ihrem Frontmatter',
      slug: 'Pfad der Seite, etwa „ordner/notiz“',
      root: 'Relativer Weg zur Startseite, für Links und Bilder: {{example}}',
      siteTitle: 'Titel der Website (pageTitle)',
      baseUrl: 'Adresse der Website (baseUrl)',
      locale: 'Sprache der Seite, etwa „de-DE“ (aus ihrem Frontmatter, sonst die der Website)',
      lang: 'Nur der Sprachcode, etwa „de“',
      frontmatter: 'Jeder Eintrag im Frontmatter der Seite (statt „author“ den Namen des Eintrags)'
    },
    imageFilter: 'Bilder',
    snippetFilter: 'Snippets',
    insertImage: 'Bild einfügen…',
    svgHow:
      'Die SVG-Datei als Code einfügen?\n\nWird der SVG-Code eingefügt, ist Styling über CSS möglich. Als Bild eingebunden wird die Grafik lediglich nach quartz/static/images kopiert und verlinkt.',
    svgInline: 'Als Code einfügen',
    svgAsImage: 'Als Bild einbinden',
    svgInvalid: '„{{name}}“ lässt sich nicht als SVG lesen.',
    svgCleaned_one: '{{count}} Stelle aus dem SVG-Code entfernt, die eingebettet auf jeder Seite Skript ausführen, sie gestalten oder etwas von außen laden könnte (etwa <script>, onload, <style>).',
    svgCleaned_other: '{{count}} Stellen aus dem SVG-Code entfernt, die eingebettet auf jeder Seite Skript ausführen, sie gestalten oder etwas von außen laden könnten (etwa <script>, onload, <style>).',
    svgStyleRemoved:
      'Die Farben dieser Datei standen in einem <style>-Block, der auf der Website alle Seiten gestalten würde; er wurde daher entfernt. Exportiere mit „Präsentationsattributen“ oder setze die Farben im CSS der Website.',
    imageExists:
      '„{{name}}“ gibt es unter quartz/static schon. Ersetzen?\n\nErsetzen überschreibt die Datei, und jedes Snippet, das sie zeigt, zeigt danach das neue Bild. „Vorhandenes verwenden“ fügt einen Verweis auf die Datei ein, die schon da ist.',
    fileExists:
      '„{{name}}“ gibt es in {{dir}} schon. Ersetzen?\n\nErsetzen überschreibt die Datei. „Vorhandene verwenden“ wählt die Datei, die schon da ist.',
    useExisting: 'Vorhandene verwenden',
    replace: 'Ersetzen',
    placeholdersOff:
      'Platzhalter sind ausgeschaltet: {{token}} bleibt stehen, wie es ist, und das Bild lädt nicht. Schalte „placeholders“ ein.',
    notInDir: '{{name}} (nicht im Ordner)',
    missingFile: '„{{name}}“ liegt nicht in {{dir}}. Die Box bleibt auf der Website leer.',
    new: 'Neu',
    import: 'Importieren…',
    edit: 'Bearbeiten',
    newName: 'Name des neuen Snippets',
    newNamePlaceholder: 'z. B. hinweis',
    newFormat: 'Format des neuen Snippets',
    formatMarkdown: 'Markdown',
    formatHtml: 'HTML',
    create: 'Anlegen',
    saved: '„{{name}}“ ist gespeichert.',
    unsaved: 'Ungespeichert',
    saveHint: 'Das Snippet ist eine eigene Datei. Es wird mit „Snippet speichern“ gespeichert, nicht mit dem „Speichern“-Button oben.',
    save: 'Snippet speichern',
    close: 'Schließen',
    discard: 'Verwerfen',
    discardConfirm: 'Änderungen an „{{name}}“ verwerfen?\n\nDie Datei bleibt, wie sie zuletzt gespeichert wurde.',
    dir: {
      missing: 'Den Ordner {{dir}} gibt es noch nicht. „Neu“ oder „Importieren“ legt ihn an.',
      link: 'Der Ordner {{dir}} liegt hinter einer Verknüpfung. Snippets lassen sich wählen, aber hier nicht anlegen oder bearbeiten.',
      outside: 'Der Ordner {{dir}} liegt außerhalb des Projekts. QuartzControl liest dort nicht, deshalb gibt es keine Auswahl.',
      reserved:
        'Der Ordner {{dir}} gehört einem Werkzeug (.git, node_modules, .quartz, .quartz-gui oder der Ausgabeordner). Deshalb gibt es keine Auswahl.'
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
      'Solange gefiltert wird, ist das Umsortieren abgeschaltet.',
    noMatches: 'Kein Plugin passt zu Filter und Suche.',
    none: 'Keine Plugins installiert.',
    framesHeading: 'Eigene Frames',
    framesDescription:
      'Im Layout-Editor gebaute eigene Frames. Quartz registriert jeden davon als Plugin. Eingestellt werden sie im Layout-Editor.',
    frameBadge: 'Frame',
    enabledSwitch: '„{{name}}“ aktiv',
    frameSource: 'Eigener Frame aus dem Layout-Editor',
    frameSummary: '{{count}} Bereiche',
    openInLayoutEditor: 'Im Layout-Editor',
    panelLabel: 'Plugin-Einstellungen',
    panelEmptyTitle: 'Plugin-Einstellungen',
    panelEmptyText: 'Wähle links ein Plugin, um es hier einzustellen. Escape oder ein Klick ins Leere hebt die Auswahl wieder auf.',
    summaryActive: 'Aktiv',
    summaryOf: '{{count}} von {{total}}',
    panelEnabled: 'Plugin aktiv',
    placementHeading: 'Platzierung',
    showOnStage: 'Auf der Bühne zeigen',
    placementPriority: 'Priorität {{priority}}',
    placementGroup: 'Gruppe {{group}}',
    optionsHeading: 'Optionen',
    componentsHeading: 'Sichtbare Komponenten',
    componentsDescription: 'Diese Plugins sind sichtbar auf der Seite, z. B. im Kopfbereich, in der Seitenleiste oder im Footer.',
    processingHeading: 'Verarbeitung',
    processingDescription:
      'Diese Plugins verändern deine Inhalte im Hintergrund (z. B. Formatierung, Links, Bilder) und erscheinen selbst nicht sichtbar auf der Seite.',
    pageTypesGroup: 'Seitentypen',
    otherProcessingGroup: 'Transformer, Filter & Emitter',
    dragHint: 'Ziehen zum Umsortieren',
    busyRemoving: 'Während ein Plugin entfernt wird, bleibt die Liste, wie sie ist. Die Änderung ist nicht gespeichert; versuche es danach noch einmal.',
    dragHandle: 'Umsortieren: {{name}}',
    savedAnnounce: 'Einstellungen von {{name}} gespeichert.',
    reorderedAnnounce: '{{name}} ist jetzt an Position {{position}} von {{total}}.',
    moveUp: 'Nach oben: {{name}}',
    moveDown: 'Nach unten: {{name}}',
    updateAvailable: 'Update verfügbar',
    savedFlash: 'Gespeichert',
    maintenanceHeading: 'Wartung',
    maintenanceDescription:
      'Die Buttons arbeiten an den heruntergeladenen Plugins in .quartz/plugins und ändern nichts an Konfiguration und Website. Nach dem Klonen auf einem anderen Rechner stellst du den Ordner hier aus quartz.lock.json wieder her, fehlende npm-Pakete werden dabei zuerst installiert.',
    installFromLock: 'Aus quartz.lock.json wiederherstellen',
    installFromLockRunning: 'Stelle wieder her…',
    installDone: 'Plugins aus der Lockdatei wiederhergestellt.',
    installPartial: '{{count}} Plugin konnte nicht installiert werden: {{names}}.',
    installPartial_other: '{{count}} Plugins konnten nicht installiert werden: {{names}}.',
    prune: 'Verwaiste Plugin-Ordner entfernen',
    pruneRunning: 'Räume auf…',
    pruneDone: 'Verwaiste Plugin-Ordner entfernt.',
    pruneConfirmAction: 'Ordner entfernen',
    pruneConfirm:
      'Entfernt alle gebauten Plugin-Ordner, auf die keine Konfiguration mehr zeigt. Die Konfiguration selbst bleibt unverändert. Fortfahren?',
    openRepo: 'Repository auf GitHub öffnen',
    removeConfirm: 'Plugin „{{name}}“ wirklich entfernen? Vorher wird automatisch ein Snapshot angelegt.',
    removeFrameConfirm:
      'Frame „{{name}}“ wirklich löschen? Das entfernt ihn aus der Konfiguration und von der Festplatte. Vorher wird automatisch ein Snapshot angelegt.',
    optionKeyPlaceholder: 'Option',
    optionValuePlaceholder: 'Wert',
    addOption: 'Anlegen',
    optionKeyExists: 'Diese Option ist bereits gesetzt.',
    optionValueHint: 'true/false und Zahlen werden als solche gespeichert, [..] und {..} als JSON, alles andere als Text.',
    explicitlyEmpty: 'leer gesetzt',
    setEmpty: 'Leer setzen',
    setEmptyHint: 'Schreibt einen leeren Text in die Konfiguration, statt die Option wegzulassen.',
    unsetEmpty: 'Zurücksetzen',
    unsetEmptyHint: 'Entfernt die Option wieder; das Plugin nimmt dann seinen Standardwert.',
    notSet: 'nicht gesetzt',
    summaryPosPriority: 'position: {{position}} · priority: {{priority}}',
    summaryOrder: 'order: {{order}}',
    layoutFields: {
      position: 'header = Kopfbereich, left/right = Sidebar, beforeBody/afterBody = um den Inhalt herum, footer = Fußzeile',
      priority: 'Reihenfolge innerhalb der Position (kleiner zuerst)',
      display: 'all = alle Geräte, mobile-only = nur mobil, desktop-only = nur Desktop',
      condition:
        'Mitgeliefert: not-index, has-tags, has-backlinks, has-toc. Ein unbekannter Name wird beim Build ignoriert, das Element erscheint dann immer.',
      group: 'Name einer Toolbar-Gruppe, z. B. „toolbar“'
    },
    groupOptionsFields: {
      grow: 'Element wächst, um freien Platz in der Gruppe zu füllen',
      shrink: 'Element darf bei Platzmangel schrumpfen',
      basis: 'Flex-Basisgröße, z. B. „auto“ oder „100px“',
      order: 'Reihenfolge innerhalb der Gruppe (kleiner zuerst)',
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
      'Blendet Seiten mit „unlisted: true“ aus allen Listen (Suche, Graph, Explorer, …) aus. Über ihre URL bleiben sie erreichbar.',
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
    'article-title': 'Zeigt den Seitentitel als Überschrift.',
    'content-meta': 'Zeigt Metadaten wie Erstellungsdatum und Lesezeit.',
    'tag-list': 'Zeigt die Tags einer Seite als klickbare Liste.',
    'page-title': 'Zeigt den Website-Titel als Link zur Startseite.',
    darkmode: 'Umschalter für Hell-/Dunkelmodus.',
    'reader-mode': 'Ablenkungsfreier Lesemodus.',
    breadcrumbs: 'Zeigt den Navigationspfad (Breadcrumbs).',
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
    templateCustomPlaceholder: 'z. B. Startseite mit Seitenleiste',
    tabOverview: 'Übersicht',
    tabGlobal: 'Komponenten',
    tabFrames: 'Frames',
    loading: 'Lade Layout…',
    emptySlot: 'Leer: hierher ziehen',
    breakpoints: {
      title: 'Breakpoints',
      tablet: 'Tablet bis (px)',
      mobile: 'Mobil bis (px)',
      saved: 'Gespeichert',
      invalid: 'Mobil muss kleiner als Tablet sein (240–3840 px).',
      hint: 'Ab welcher Fensterbreite deine eigenen Frames auf das Tablet- bzw. Mobil-Layout umschalten. Quartz’ eingebaute Frames (Standard, Volle Breite, Minimal) und Community-Themes bringen eigene Werte mit. Vorgabe ist 1200 / 800 (die Werte, die Quartz benutzt).'
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
      wrap: 'Umbruch',
      wrapNone: 'Kein Umbruch',
      wrapWrap: 'Umbrechen',
      wrapReverse: 'Umbrechen, rückwärts',
      gap: 'Abstand',
      priority: 'Priorität',
      priorityPlaceholder: 'optional',
    },
    pageTypes: {
      '404': '404-Seite',
      content: 'Inhaltsseiten',
      folder: 'Ordnerseiten',
      tag: 'Tag-Seiten',
      canvas: 'Canvas-Seiten',
      bases: 'Bases-Seiten',
      excalidraw: 'Excalidraw-Seiten'
    },
    excludeDuplicateHint: 'Betrifft alle {{count}} Instanzen von „{{name}}“. Quartz kann einzelne Duplikate hier nicht getrennt ausschließen.',
    excludeDeadHint_one: 'In der Datei steht noch der Ausschluss „{{names}}“ aus einer früheren Fassung. Er wirkt nicht und verschwindet, sobald du an diesem Seitentyp etwas umlegst und speicherst.',
    excludeDeadHint_other: 'In der Datei stehen noch {{count}} Ausschlüsse aus einer früheren Fassung ({{names}}). Sie wirken nicht und verschwinden, sobald du an diesem Seitentyp etwas umlegst und speicherst.',
    template: 'Frame',
    templateDefault: 'Standard',
    templateFullWidth: 'Volle Breite',
    templateMinimal: 'Minimal',
    templatePluginDefault: '„{{frame}}“ (Plugin-Standard, aktiv)',
    pluginFrameUnknownLayout:
      'Dieser Seitentyp benutzt automatisch den Frame „{{frame}}“ aus dem zugehörigen Plugin. Seinen Aufbau kennt nur das Plugin selbst, deshalb gibt es hier keine Vorschau.',
    frameBuilder: {
      whatIsAFrame:
        'Ein Frame ist das Raster einer Seite: welche Bereiche es gibt (Kopfbereich, Seitenleisten, Inhalt, Fußzeile), wo sie liegen und wie breit sie sind. Was in den Bereichen erscheint, legst du im Reiter „Komponenten“ fest, und dort wählst du auch den Frame je Seitentyp.',
      newFrame: 'Neuer Frame',
      newEmptyFrame: 'Leeren Frame anlegen',
      frameLabel: 'Frame',
      standardOption: 'Quartz-Standard (nur ansehen)',
      ownFrames: 'Eigene Frames',
      newDraftOption: '{{name}} (neu, nicht gespeichert)',
      unnamed: 'Ohne Namen',
      duplicate: 'Duplizieren',
      duplicated: 'Kopie „{{name}}“ angelegt. Sie wird erst beim Speichern geschrieben.',
      standardTitle: 'Quartz-Standard',
      standardText:
        'So teilt Quartz eine Seite auf, solange kein eigener Frame gewählt ist: Seitenleisten links und rechts, dazwischen Kopfbereich, Inhalt und Fußzeile. Umgeschaltet wird, wo quartz/styles/variables.scss es sagt.',
      standardSource:
        'Die Maße stammen aus quartz/styles/variables.scss und base.scss dieses Projekts: Spalten {{columns}}, Abstände {{gap}}, Seite höchstens {{max}}, Umschalten bei {{desktop}} / {{mobile}} px.',
      standardSourceUnavailable:
        'Die Maße dieses Projekts konnten nicht gelesen werden: {{reason}} Gezeigt sind Quartz’ eigene: Spalten {{columns}}, Abstände {{gap}}, Seite höchstens {{max}}, Umschalten bei {{desktop}} / {{mobile}} px.',
      standardCapUnread: '{{max}} (aus base.scss nicht gelesen, Quartz’ Wert)',
      standardShapeDiffers: 'Die Spaltenzahl in variables.scss weicht hier von Quartz’ Anordnung ab ({{breakpoints}}); Vorschau und Kopie zeigen dort Quartz’ Spalten.',
      standardCopyHint:
        'Eine Kopie folgt deinen Breakpoints. Die Seitenleisten verhalten sich darin wie jeder andere Bereich: Sie kleben nicht und werden auf schmalen Breiten nicht zur Zeile.',
      customizeStandard: 'Als eigenen Frame anpassen',
      discardConfirm: 'Ungespeicherte Änderungen an „{{name}}“ verwerfen?\n\nDer Frame bleibt, wie er zuletzt gespeichert wurde.',
      discardConfirmAction: 'Änderungen verwerfen',
      frameName: 'Frame-Name',
      rows: 'Zeilen',
      cols: 'Spalten',
      rowGap: 'Zeilenabstand',
      columnGap: 'Spaltenabstand',
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
        'Gilt nur für diesen Breakpoint. Ohne Maximalbreite nutzt der Rahmen die volle Fensterbreite. Die Ausrichtung wirkt erst mit eingestellter Maximalbreite.',
      saved: 'Gespeichert',
      resetTracks: 'Spurgrößen zurücksetzen',
      columnSizesLabel: 'Spaltenbreiten (leer = 1fr)',
      rowSizesLabel: 'Zeilenhöhen (leer = auto)',
      lineNamesLabel: 'Benannte Grid-Lines (optional)',
      lineNamesHint:
        'Namen wie „sidebar-start“ sind nützlich, wenn du diese Linien später in eigenem CSS ansprechen willst.',
      columnLinesLabel: 'Spalten-Lines',
      rowLinesLabel: 'Zeilen-Lines',
      copyLayoutTo: 'Auf {{target}} kopieren',
      breakpointLabel: 'Breakpoint',
      breakpoint: {
        desktop: 'Desktop',
        tablet: 'Tablet',
        mobile: 'Mobil'
      },
      availableAreasLabel: 'Bereiche, die hier nicht im Raster liegen',
      newArea: '+ Bereich hinzufügen',
      allPlaced: 'Alle Bereiche sind platziert.',
      hintDragToPlace:
        'Ziehe einen Bereich auf eine freie Zelle, um ihn zu platzieren, oder einen platzierten zurück in diese Liste, um ihn wieder zu lösen. An den Rändern eines platzierten Bereichs stellst du ein, über wie viele Zeilen und Spalten er reicht. Ein Klick zeigt seine Einstellungen in der Seitenleiste; ein hier ausgeblendeter Bereich behält seine Spannen, ein nie platzierter hat keine.',
      selectArea: 'Bereich {{name}} auswählen',
      resizeHandle: 'Ziehen, um Zeilen- und Spalten-Spanne zu ändern',
      resized: '{{name}} beginnt jetzt in Zeile {{row}}, Spalte {{col}}; Zeilen-Spanne {{rowSpan}}, Spalten-Spanne {{colSpan}}.',
      placementSummary: 'Beginnt in Zeile {{row}}, Spalte {{col}}. Die Spannen lassen sich auch an den Rändern des Bereichs ziehen.',
      areaPanelTitle: 'Bereich {{name}}',
      framePanelTitle: 'Frame',
      framePanelHint: 'Klicke im Raster auf einen Bereich, um ihn hier einzustellen.',
      areaPanelEmpty: 'Bereich',
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
        'Zeigt nur die Komponenten, die im Reiter „Komponenten“ hierher gezogen werden. Ohne das zeigt der Bereich alles, was die Belegung sonst noch hat.',
      ownGroupRenamed:
        'Hält die Gruppe „{{group}}“. Beim Umbenennen bleibt der Gruppenname stehen, damit die im Reiter „Komponenten“ zugeordneten Komponenten hier bleiben.',
      rowSpanLabel: 'Zeilen-Spanne',
      colSpanLabel: 'Spalten-Spanne',
      removeArea: 'Bereich löschen',
      removeAreaConfirm: 'Bereich „{{name}}“ löschen?\n\n{{consequence}} Geschrieben wird erst beim Speichern.',
      removeAreaPlaced: 'Seine Platzierung auf {{breakpoints}} geht mit.',
      removeAreaUnplaced: 'Er liegt auf keinem Breakpoint im Raster; seine Belegung geht mit.',
      unplace: 'Aus Raster lösen',
      visibleOnBreakpoint: 'Sichtbar auf {{breakpoint}}',
      overlapError: 'Dieser Bereich überschneidet sich mit einem bestehenden Bereich.',
      dropRefused: '{{name}} bleibt, wo es war: Dort überschneidet es sich mit einem bestehenden Bereich.',
      spanRefused: '{{name}} behält seine Spanne. Mit der neuen würde es sich mit einem bestehenden Bereich überschneiden.',
      showRefused:
        '{{name}} bleibt ausgeblendet, weil auf seinen Zellen ein anderer Bereich liegt. Ziehe es auf eine freie Zelle, um es zu zeigen; gibt es keine, gib dem Raster erst eine Zeile mehr.',
      showRefusedOutside:
        '{{name}} bleibt ausgeblendet, weil seine Zellen nicht mehr im Raster liegen. Ziehe es auf eine freie Zelle, um es zu zeigen; gibt es keine, gib dem Raster erst eine Zeile mehr.',
      overlapWarning:
        'Diese Bereiche liegen übereinander: {{pairs}}. Auf der gebauten Seite verdrängt einer den anderen. Ziehe einen davon auf freie Zellen.',
      outsideWarning:
        'Diese Bereiche reichen über das Raster hinaus: {{areas}}. Die gebaute Seite schneidet ab, was außerhalb liegt; ein Bereich ganz außerhalb bekommt dort eine eigene Spalte und Zeile hinter dem Raster, und die übrigen Spalten werden dafür schmaler.',
      dropNarrowed: '{{name}} bei {{target}} abgelegt. Dort endet das Raster: {{changes}}.',
      colSpanCut: 'Spalten-Spanne jetzt {{now}} statt {{before}}',
      rowSpanCut: 'Zeilen-Spanne jetzt {{now}} statt {{before}}',
      unassignedWarning: 'Nicht zugewiesen: {{slots}}. Komponenten für diese Positionen werden in diesem Frame nicht angezeigt.',
      hiddenGroupsWarning:
        'Auf {{breakpoint}} ausgeblendet: {{areas}}. Die Komponenten dieser eigenen Bereiche erscheinen auf dieser Breite nicht.',
      otherBreakpointsWarning: 'Auf {{breakpoints}} gibt es Hinweise, die hier nicht stehen.',
      homelessWarning:
        'Ohne einfachen Bereich: {{slots}}. Was dieser Belegung gehört und in keinem eigenen Bereich liegt, erscheint auf keiner Seite.',
      doubledWarning:
        'Doppelt belegt: {{slots}}. Jeder dieser Bereiche zeigt dieselben Komponenten, sie erscheinen also mehrfach auf der Seite.',
      neverVisibleWarning: 'Auf keinem Breakpoint sichtbar: {{areas}}. Diese Bereiche werden nirgends gerendert.',
      nameRequired: 'Bitte einen Frame-Namen vergeben.',
      areaNameCollision:
        'Zwei Bereiche heißen „{{names}}“. Ein Bereichsname darf nur einmal vorkommen.',
      areaGroupCollision:
        'Zwei Bereiche derselben Belegung halten die Gruppe „{{names}}“. Beide zeigten dann dieselben Komponenten, also doppelt auf jeder Seite.',
      nameCollision: 'Dieser Name ist bereits vergeben (ein eingebauter Frame oder ein anderer eigener).',
      deleteConfirmAction: 'Frame löschen',
      deleteConfirm: 'Frame „{{name}}“ wirklich löschen? Seitentypen, die ihn benutzen, fallen dann auf den Standard-Frame zurück.',
      preview: {
        pageContent: 'Seiteninhalt'
      }
    },
    componentPill: {
      paletteLabel: 'Komponente hinzufügen',
      paletteDropToRemove: 'Hier ablegen zum Entfernen',
      paletteDragName: 'Komponentenvorrat',
      paletteDropToDisable: 'Hier ablegen zum Ausschalten',
      paletteHint:
        'Ziehe eine Komponente auf einen Bereich, um eine weitere Instanz einzufügen. Ausgeschaltete Komponenten werden beim Hineinziehen wieder eingeschaltet.',
      dragHandle: '{{name}} verschieben',
      duplicate: 'Duplizieren',
      removeDuplicate: 'Duplikat entfernen',
      off: 'aus',
      disabledHint: 'Ausgeschaltet, wird nicht gebaut. Einschalten in der Seitenleiste.',
      parkedHint: 'Ausgeschaltet. Ziehe die Komponente auf einen Bereich, um sie dort wieder einzuschalten.',
      hiddenOnTypes: 'Ausgeblendet auf: {{types}}'
    },
    pageType: {
      label: 'Seitentyp',
      all: 'Alle Seiten',
      customized: '{{type}} (angepasst)',
      allPagesFrame: 'Gezeichnet im Frame der Inhaltsseiten: {{name}}',
      scopeHint:
        'Ausblenden und Leeren gelten nur für {{type}}. Was du verschiebst oder in der Seitenleiste einstellst, gilt für alle Seiten.',
      removeOverride: 'Anpassung entfernen',
      removedAnnounce: 'Die Anpassung für {{type}} ist entfernt.',
      excludedHere: 'Auf {{type}} ausgeblendet',
      clearedHere: 'Bereich auf {{type}} geleert',
      hideOnType: 'Auf {{type}} ausblenden',
      hiddenAnnounce: '{{name}} ist auf {{type}} ausgeblendet.',
      shownAnnounce: '{{name}} erscheint wieder auf {{type}}.',
      clearArea: '{{position}} auf {{type}} leeren',
      restoreArea: '{{position}} auf {{type}} wieder füllen',
      clearedAnnounce: '{{position}} ist auf {{type}} geleert.',
      restoredAnnounce: '{{position}} ist auf {{type}} wieder gefüllt.',
      areaCleared: 'Auf {{type}} leer',
      unknownOption: '„{{frame}}“ (unbekannt)',
      unknownFrame:
        'Den Frame „{{frame}}“ gibt es in diesem Projekt nicht. Quartz baut diese Seiten mit dem Standard-Frame.'
    },
    context: {
      customized: 'angepasst',
      ownFrame: 'Eigener Frame',
      builtinFrame: 'Eingebauter Frame',
      viewOnly: 'nur ansehen',
      newDraft: 'neu'
    },
    stage: {
      viewLabel: 'Ansicht',
      editFrame: 'Frame bearbeiten',
      hiddenInView: 'In dieser Ansicht nicht auf der Seite',
      approximate: 'Ungefähr gezeichnet: Spaltenbreiten wie {{sizes}} kennt erst der Browser, hier zählen sie als gleiche Anteile.',
      otherDraftOpen: 'Im Frame-Editor ist noch „{{name}}“ mit ungespeicherten Änderungen offen. Speichere oder schließe es, bevor du einen anderen Frame öffnest.'
    },
    summary: {
      title: 'Zusammenfassung',
      frame: 'Frame',
      frameAllPages: 'Jedem Seitentyp ist sein eigener Frame zugeordnet. Gezeichnet ist der der Inhaltsseiten.',
      frameFrom: {
        override: 'Für diesen Seitentyp gewählt.',
        plugin: 'Bringt das Plugin des Seitentyps mit.',
        default: 'Nichts gewählt: Quartz baut mit dem Standard-Frame.'
      },
      empty: 'leer',
      notInFrame: 'Dieser Frame hat dafür keinen Bereich. Was hier steht, erscheint nicht.',
      parked_one: '{{count}} Komponente ist ausgeschaltet und liegt im Vorrat.',
      parked_other: '{{count}} Komponenten sind ausgeschaltet und liegen im Vorrat.'
    },
    overview: {
      title: 'Wo welche Komponente erscheint',
      intro:
        'Komponenten werden einmal für alle Seiten platziert. Jeder Seitentyp wird in seinem zugeordneten Frame gebaut und kann einzelne Komponenten oder ganze Bereiche ausblenden. Der Frame entscheidet, für welche Bereiche er überhaupt Platz hat. Die Tabelle zeigt, was davon auf jedem Seitentyp ankommt.',
      componentColumn: 'Komponente',
      assignedFrame: 'Zugeordneter Frame',
      customized: 'Weicht von „Alle Seiten“ ab',
      frameFrom: {
        override: 'Frame für den Seitentyp gewählt',
        plugin: 'Frame bringt das Plugin des Seitentyps mit',
        default: 'Nichts gewählt: Quartz baut mit dem Standard-Frame'
      },
      state: {
        shown: 'Erscheint',
        someWidths: 'Erscheint nur auf manchen Breiten',
        excluded: 'Auf diesem Seitentyp ausgeblendet',
        cleared: 'Bereich auf diesem Seitentyp geleert',
        noArea: 'Bereich in diesem Frame nicht zugewiesen',
        hiddenArea: 'Bereich in diesem Frame auf keiner Breite gezeigt',
        noWidth: 'Auf keiner Breite (Komponente und Bereich gelten für verschiedene Breiten)',
        unknown: 'Unbekannt (der Frame kommt vom Plugin)'
      },
      cellTitle: '{{component}} auf {{pageType}}: {{state}}',
      someWidthsOn: 'Erscheint nur auf {{breakpoints}}',
      empty: 'leer',
      ownArea: 'Eigener Bereich „{{name}}“',
      ownAreaIn: 'im Frame',
      componentCount_one: '{{count}} Komponente',
      componentCount_other: '{{count}} Komponenten',
      flexGroup: 'Flex-Gruppe „{{name}}“',
      legend: 'Legende',
      legendCondition: 'Mit Bedingung',
      statPlaced_one: 'Komponente platziert',
      statPlaced_other: 'Komponenten platziert',
      statAlways_one: '{{count}} immer',
      statAlways_other: '{{count}} immer',
      statConditioned_one: 'mit Bedingung',
      statConditioned_other: 'mit Bedingung',
      statDisabled_one: 'ausgeschaltet',
      statDisabled_other: 'ausgeschaltet',
      statPageTypes_one: 'Seitentyp',
      statPageTypes_other: 'Seitentypen',
      statCustomized_one: '{{count}} weicht ab',
      statCustomized_other: '{{count}} weichen ab',
      statFrames_one: 'eigener Frame',
      statFrames_other: 'eigene Frames',
      statUnused_one: '{{count}} ohne Seitentyp',
      statUnused_other: '{{count}} ohne Seitentyp',
      panelPlacedTitle: 'Platzierte Komponenten',
      panelPlacedNone: 'Noch keine Komponente platziert.',
      panelAlways: 'In allen Breiten',
      panelConditionedTitle: 'Komponenten mit Bedingung',
      panelConditionedNone: 'Keine Komponente hat eine Bedingung. Alle erscheinen auf jeder Seite ihres Seitentyps.',
      panelPageTypesTitle: 'Seitentypen und was abweicht',
      panelSameAsAll: 'wie „Alle Seiten“',
      panelHidden: 'Ausgeblendet:',
      panelCleared: 'Geleerte Bereiche:',
      disabledTitle: 'Ausgeschaltet',
      disabledText: 'Liegen im Komponentenvorrat und werden nicht gebaut. Ein Klick zeigt sie auf der Bühne.',
      disabledNone: 'Keine. Alle Komponenten sind eingeschaltet.',
      framesTitle: 'Frames und ihre Seitentypen',
      frameKind: {
        builtin: 'von Quartz',
        own: 'eigener',
        plugin: 'vom Plugin'
      },
      unassigned: 'keinem Seitentyp zugeordnet',
      customAreas: 'Eigene Bereiche:'
    },
    inspector: {
      title: 'Komponente',
      empty: 'Wähle eine Komponente aus. Ihre Einstellungen erscheinen dann hier.',
      options: 'Optionen',
      optionsLoading: 'Lese Optionen…',
      optionsError: 'Die Optionen konnten nicht gelesen werden: {{reason}}',
      parked: 'Ausgeschaltet: liegt im Komponentenvorrat und wird nicht gebaut.',
      disabled: 'Ausgeschaltet: wird nicht gebaut.',
      enable: 'Einschalten',
      enabledAnnounce: '{{name}} eingeschaltet, steht in {{position}}.',
      position: 'Position',
      order: 'Reihenfolge',
      orderOf: 'Stelle {{n}} von {{count}}',
      earlier: 'Früher',
      later: 'Später',
      moved: '{{name}} steht jetzt an Stelle {{n}} von {{count}} in {{position}}.',
      displayHint: '„Nur Desktop“ gilt auch auf dem Tablet: Quartz schaltet erst an der Mobil-Grenze um.',
      condition: 'Bedingung',
      conditionAlways: 'Immer',
      conditionNotIndex: 'Nicht auf der Startseite',
      conditionHasTags: 'Nur auf Seiten mit Tags',
      conditionHasBacklinks: 'Nur auf Seiten mit Rückverweisen',
      conditionHasToc: 'Nur auf Seiten mit Inhaltsverzeichnis',
      conditionCustom: 'Eigene…',
      conditionCustomLabel: 'Name der Bedingung',
      conditionCustomHint: 'Eine Bedingung, die ein Plugin mitbringt. Kennt Quartz den Namen nicht, erscheint die Komponente immer.',
      groupOptions: 'In der Gruppe',
      grow: 'Freien Platz einnehmen',
      shrink: 'Darf schmaler werden',
      basis: 'Grundbreite',
      basisHint: 'Eine CSS-Länge, z. B. 12rem. Leer: so breit wie der Inhalt.',
      itemOrder: 'Reihenfolge in der Gruppe',
      itemOrderHint: 'Kleinere Zahlen stehen weiter vorn. Leer: 0.',
      align: 'Ausrichtung',
      alignStart: 'Anfang',
      alignCenter: 'Mitte',
      alignEnd: 'Ende',
      alignStretch: 'Strecken',
      actions: 'Aktionen',
      park: 'In den Vorrat legen',
      parkHintWhole:
        'Schaltet das ganze Plugin aus, nicht nur die Komponente – auch {{kinds}}. Aus dem Vorrat zurückgezogen, ist es wieder eingeschaltet.',
      offWhole: 'Damit ist das ganze Plugin aus, auch {{kinds}}.',
      categories: { transformer: 'seine Transformer', filter: 'sein Filter', emitter: 'sein Emitter', pageType: 'sein Seitentyp' },
      parkHint: 'Schaltet die Komponente aus. Aus dem Vorrat zurückgezogen, ist sie wieder eingeschaltet.'
    }
  },
  styles: {
    loadFailed: 'Die Stile konnten nicht geladen werden.',
    googleFontsMissing_one:
      'Google kennt diese Schrift nicht und hat sie stillschweigend weggelassen: {{families}}. Auf der Website fällt dieser Platz auf eine Ersatzschrift zurück.',
    googleFontsMissing_other:
      'Google kennt diese Schriften nicht und hat sie stillschweigend weggelassen: {{families}}. Auf der Website fallen diese Plätze auf eine Ersatzschrift zurück.',
    googleFontsOwn_one: 'Nicht bei Google geholt, weil das Projekt die Schrift schon selbst einbindet: {{families}}.',
    googleFontsOwn_other: 'Nicht bei Google geholt, weil das Projekt die Schriften schon selbst einbindet: {{families}}.',
    googleFontsCovered_one:
      'Von {{families}} bindet das Projekt einen Teil selbst ein; bei Google geholt ist nur, was die eigenen Regeln nicht abdecken.',
    googleFontsCovered_other:
      'Von {{families}} bindet das Projekt einen Teil selbst ein; bei Google geholt ist nur, was die eigenen Regeln nicht abdecken.',
    googleFontsFilesRemoved_one: 'Eine ungenutzte Schriftdatei ist aus dem Projekt entfernt.',
    googleFontsFilesRemoved_other: '{{count}} ungenutzte Schriftdateien sind aus dem Projekt entfernt.',
    googleFontsRemoved_one: 'Nicht mehr gewählt und aus dem Projekt entfernt: {{families}} (1 Datei).',
    googleFontsRemoved_other: 'Nicht mehr gewählt und aus dem Projekt entfernt: {{families}} ({{count}} Dateien).',
    googleFontsDropped_one: 'Die lokale Kopie der Google-Schriften ist entfernt (1 Datei), die Website lädt sie jetzt von Google.',
    googleFontsDropped_other: 'Die lokalen Kopien der Google-Schriften sind entfernt ({{count}} Dateien), die Website lädt sie jetzt von Google.',
    fixes: {
      heading: 'Bekannte Konflikte',
      description:
        'Konflikte zwischen Plugins, die sich nicht über eine Einstellung lösen lassen, sondern nur im CSS. Der Fix wird als ganz normale Datei unter „Eigenes CSS“ angelegt und ist dort bearbeitbar, verschiebbar und löschbar.',
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
    consolidate: {
      note: 'Dieses Projekt lädt noch die Stylesheets der Vorlagen in der Aufteilung bis 1.0, {{count}} Dateien; seit 1.1 sind es zwölf, nach Bereichen geordnet. Zusammenlegen behält jede Regel und legt vorher einen Snapshot an — eigene Stylesheets bleiben, wie sie sind.',
      action: 'Zusammenlegen',
      running: 'Lege zusammen…',
      confirm:
        '{{count}} Stylesheets zu den zwölf von 1.1 zusammenlegen?\n\nDie alten Dateien werden entfernt; ihr Inhalt steht danach abschnittsweise in den neuen.',
      done: '{{merged}} Stylesheets stehen jetzt in {{written}} Dateien.',
      renamed: 'Deine Datei {{from}} heißt jetzt {{to}}, weil eine der neuen so heißt.'
    },
    migrate: {
      note: 'Dieses Projekt hält Ladereihenfolge, Schriften und Variablen noch in custom.scss, wie QuartzControl 1.0. Umstellen legt sie in eine eigene Datei, quartz/styles/_quartzcontrol.scss. Ältere Fassungen von QuartzControl lesen das Projekt danach ohne Variablen und Stylesheets; arbeitest du auf mehreren Rechnern, stelle erst alle auf 1.1 um.',
      action: 'Jetzt umstellen',
      running: 'Stelle um…',
      saveFirst: 'Erst speichern oder verwerfen.',
      done: 'Umgestellt.'
    },
    cascade: {
      themeActive:
        'Reihenfolge: Basis → Community-Theme → Variablen → eigenes CSS. Das Theme „{{themeId}}“ ist aktiv und überschreibt die Basisfarben.',
      themeInactive:
        'Reihenfolge: Basis → Community-Theme → Variablen → eigenes CSS. Kein Community-Theme aktiv: Es gelten deine Basis-Farben und -Schriften.',
      overrides: '{{count}} Variable(n) überschrieben.'
    },
    // Einer je Schreiber: Der eine Satz „von einem anderen Tab (Variablen-Überschreibung oder
    // Font-Import)“ stand auch nach der Ladereihenfolge und dem Reparatur-Button dieses Reiters.
    scssStaleBy: {
      variables:
        '{{file}} wurde inzwischen beim Speichern der Variablen geändert. Dein Entwurf hier ist noch ungespeichert. Speichern würde diese Änderung überschreiben.',
      fontImport:
        '{{file}} wurde inzwischen beim Import einer Schrift geändert. Dein Entwurf hier ist noch ungespeichert. Speichern würde diese Änderung überschreiben.',
      fontRemoval:
        '{{file}} wurde inzwischen beim Entfernen einer ungenutzten Schrift geändert. Dein Entwurf hier ist noch ungespeichert. Speichern würde diese Änderung überschreiben.',
      googleFonts:
        '{{file}} wurde inzwischen geändert, weil die Google-Schriften ins Projekt geholt oder entfernt wurden. Dein Entwurf hier ist noch ungespeichert. Speichern würde diese Änderung überschreiben.',
      stylesheets:
        '{{file}} wurde inzwischen geändert, weil sich die Stylesheets geändert haben (Ladereihenfolge, Import oder neue Datei). Dein Entwurf hier ist noch ungespeichert. Speichern würde diese Änderung überschreiben.'
    },
    scssStaleNotSaved:
      'custom.scss hat sich geändert, seit du im Reiter „Eigenes CSS“ getippt hast. Dein Entwurf dort wurde nicht gespeichert. Alles andere ist gespeichert; im Reiter „Eigenes CSS“ kannst du neu laden oder bewusst überschreiben.',
    scssStaleReload: 'Von Festplatte neu laden (Entwurf verwerfen)',
    variableNotWritable:
      'Nichts wurde gespeichert: Der Wert von --{{name}} enthält ein Zeichen, das in einer Variable nicht stehen kann (Semikolon, geschweifte Klammer, Backslash oder Kommentar).',
    managedStaleNotSaved:
      '_quartzcontrol.scss hat sich geändert, seit du die Datei im Reiter „Eigenes CSS“ bearbeitet hast. Dein Entwurf dort wurde nicht gespeichert. Alles andere ist gespeichert; im Reiter „Eigenes CSS“ kannst du neu laden oder bewusst überschreiben.',
    managedUseRestored:
      'In custom.scss fehlte die Zeile @use "./quartzcontrol"; – sie ist wieder eingesetzt. Ohne sie fehlten der Website Ladereihenfolge, Schriften und Variablen dieser Seite.',
    styleSettings: {
      sourceNote:
        'Beschreibungen aus dem Original-Theme „{{theme}}“ von {{author}}, {{count}} Optionen.',
      searchPlaceholder: 'Option suchen…',
      loading: 'Lade Beschreibungen zu den Optionen…',
      refresh: 'Doku neu laden',
      unavailable:
        'Zu diesem Theme sind keine Beschreibungen auffindbar: Es hat keinen Eintrag im Obsidian-Theme-Verzeichnis oder bringt keinen @settings-Block mit. Darum hier nur die rohen Schalter.',
      themeDefault: '— Theme-Standard —',
      reset: 'Zurücksetzen'
    },
    variables: {
      mainHeading: 'Hauptvariablen',
      mainDescription:
        'Die Variablen, die Quartz selbst aus den Grundfarben ableitet.',
      allHeading: 'Alle Theme- und Build-Variablen',
      allDescription:
        'Alles, was das aktive Theme, Plugins oder der letzte Build an Variablen mitbringen (getrennt von den Hauptvariablen, weil es sehr viele werden können).',
      allDescriptionTheme:
        'Alles, was das Theme „{{themeId}}“, Plugins oder der letzte Build mitbringen: {{count}} Variablen, nach Namensanfang gruppiert. Gruppe aufklappen oder suchen.',
      counter: '{{overridden}} von {{total}} überschrieben',
      counterNoBuild: '{{overridden}} überschrieben, die Gesamtzahl kennt erst ein Build',
      searchPlaceholder: 'Variable suchen (z. B. callout, h1, background)…',
      onlyChanged: 'Nur geänderte',
      kind: {
        label: 'Art des Werts',
        all: 'Alle',
        color: 'Farben ({{count}})',
        other: 'Andere Werte ({{count}})'
      },
      noResults: 'Keine Treffer.',
      moreResults: '{{count}} weitere Treffer. Weiter tippen zum Eingrenzen.',
      noSources: 'Keine zusätzlichen Variablen gefunden.',
      noTheme: 'Es ist kein Community-Theme installiert.',
      noBuild: 'Es gibt noch keinen Build-Output. Einmal bauen, dann hier neu einlesen.',
      reload: 'Neu einlesen',
      resetNamed: '{{name}} auf Originalwert zurücksetzen',
      resetToOriginal: 'Auf Originalwert zurücksetzen',
      removeOwn: 'Variable entfernen',
      confirmRemoveOwn:
        '{{name}} entfernen?\n\nKein Theme und nicht Quartz setzen diese Variable, darum gibt es keinen Originalwert. Nach dem Speichern hat jede Stelle, die var({{name}}) verwendet, keinen Wert mehr.',
      confirmRemoveOwnAction: 'Entfernen',
      changedOver: 'Von dir geändert. Ursprung: {{base}}',
      ownHint: 'Nur hier gesetzt, weder vom Theme noch von Quartz. Darum gibt es keinen Originalwert.',
      light: 'Hell',
      dark: 'Dunkel',
      bothModes: 'Hell und dunkel',
      splitDark: 'Im Dunkelmodus abweichend',
      unsplitDark: 'In beiden Modi gleich',
      panelLabel: 'Variable',
      panelEmptyTitle: 'Variable wählen',
      panelEmptyText: 'Wähle links eine Variable: Hier stehen dann ihr Wert in beiden Modi, woher sie ihn hat, wer sie benutzt, und die Felder zum Ändern.',
      summaryMain: 'Hauptvariablen',
      summaryAll: 'Weitere Variablen',
      summaryChanged: 'Von dir geändert',
      unresolved: 'nicht auflösbar (nur in einem Selektor gesetzt)',
      unresolvedReference: 'nicht auflösbar (eine Variable darin hat hier keinen Wert)',
      swatchOver: '{{value}} über {{ground}}, dem Seitengrund der Website',
      swatchNone: 'In diesem Modus keine Farbe',
      dependents: '{{count}} abhängig',
      dependentsWarning: 'Ein eigener Wert hier wirkt sich auf {{count}} weitere Variablen aus.',
      dependentsNone: 'Keine andere Variable verweist hierauf.',
      usesNone: 'Verweist auf keine andere Variable, der Wert steht direkt hier.',
      moreKeys: '+{{count}} weitere',
      chipHint: 'Zu dieser Variable springen',
      themeNote:
        'Deine Werte hier gewinnen gegen das Theme „{{themeId}}“, auch wo es dieselbe Variable setzt. Die Ausnahme sind Farben, die ein Theme nur für eine Art von Element setzt (etwa Callouts); die änderst du unter „Eigenes CSS“.',
      collisionNote_one:
        'custom.scss setzt {{names}} auch selbst. Seit 1.1 steht seine Regel nach denen dieser Seite und gewinnt, wo beide gleich spezifisch sind – die Website zeigt dann den Wert aus custom.scss, nicht den hier.',
      collisionNote_other:
        'custom.scss setzt {{count}} dieser Variablen auch selbst: {{names}}. Seit 1.1 steht seine Regel nach denen dieser Seite und gewinnt, wo beide gleich spezifisch sind – die Website zeigt dann die Werte aus custom.scss, nicht die hier.',
      section: {
        current: 'Aktueller Wert',
        origin: 'Herkunft',
        uses: 'Verwendet diese Variablen',
        dependents: 'Wird von diesen Variablen verwendet',
        edit: 'Eigener Wert'
      },
      singlesGroup: 'Einzelne Variablen',
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
        project: 'Stylesheet {{file}}',
        user: 'geändert',
        own: 'eigene Variable'
      }
    }
  },
  styleEditor: {
    openExternally: 'Extern öffnen',
    importFile: 'Datei importieren…',
    componentPlaceholder: 'Komponente wählen…',
    componentOption: '{{name}} — {{selector}}',
    componentOptionUnverified: '{{name}} — {{selector}} (Klasse ungeprüft)',
    componentOptionWithCopies_one: '{{name}} — {{selector}} (trifft auch die Kopie)',
    componentOptionWithCopies_other: '{{name}} — {{selector}} (trifft auch die {{count}} Kopien)',
    componentOptionOnly_one: '{{name}} — {{selector}} (nur dieses, ohne die Kopie von jetzt)',
    componentOptionOnly_other: '{{name}} — {{selector}} (nur dieses, ohne die {{count}} Kopien von jetzt)',
    componentHint: 'Fügt einen Selektor für die gewählte Komponente an der Cursor-Position ein.',
    insertSelector: 'Selektor einfügen',
    referenceHeading: 'Original-Styles (nur lesend)',
    managedFile: {
      warning:
        'Diese Datei schreibt QuartzControl selbst. Was zwischen den QuartzControl-Markern steht, schreibt jede Änderung an Ladereihenfolge, Schriften oder Variablen auf dieser Seite neu; Text außerhalb der Marker bleibt.'
    },
    files: {
      heading: 'Ladereihenfolge',
      description:
        'Quartz bindet nur custom.scss ein. Alles andere wird von dort aus geladen, und zwar in dieser Reihenfolge. Später geladene Dateien überschreiben frühere; custom.scss selbst kommt immer zuletzt.',
      alwaysLast: 'immer zuletzt',
      managedRow: 'Schriften und Variablen dieser Seite',
      moveUp: 'Nach oben',
      moveDown: 'Nach unten',
      rename: 'Umbenennen',
      confirmDelete: 'Datei „{{name}}“ löschen?\n\nSie wird aus der Ladereihenfolge genommen und aus dem Projekt gelöscht. Zurückholen lässt sie sich nur über git oder einen älteren Snapshot.',
      confirmDeleteAction: 'Datei löschen',
      create: 'Neue Datei',
      createConfirm: 'Anlegen',
      namePlaceholder: 'Dateiname (z. B. typografie)',
      orphansHeading: 'Vorhanden, aber nicht eingebunden',
      include: 'Einbinden',
      unsaved: 'Ungespeicherte Änderungen',
      closeTab: 'Tab schließen'
    },
    check: {
      ok: 'SCSS kompiliert fehlerfrei.',
      failed: 'SCSS-Fehler, der Build würde fehlschlagen:',
      location: 'In {{file}}, Zeile {{line}} öffnen',
      locationExternal: 'In {{file}}, Zeile {{line}} (nicht hier bearbeitbar)',
      // Nur für den einen Fehler, dessen Ausweg die Seite kennt: den Import-Block einer älteren
      // Fassung (beta.2) innerhalb des eigenen (achtundzwanzigstes Review, nebenbei 5).
      nestedImports:
        'Eine ältere Fassung von QuartzControl hat ihren Import-Block in den der aktuellen Fassung geschrieben. Die Ladereihenfolge einmal neu zu schreiben, macht daraus wieder einen Block; die Reihenfolge bleibt, wie sie ist.',
      nestedImportsRepair: 'Ladereihenfolge neu schreiben',
      managedFileMissing:
        'custom.scss lädt _quartzcontrol.scss, aber die Datei fehlt. Der nächste Bau legt sie leer an; ihren Inhalt bringt ein Snapshot unter Wartung zurück.',
      recheck: 'Erneut prüfen',
      checkActive: 'Code prüfen',
      running: 'Prüfe…',
      unavailable: 'SCSS-Prüfung nicht möglich: {{reason}}'
    },
    current: {
      heading: 'Aktuell geltende Farben und Schriften',
      summary: '{{colors}} Farben für hell und dunkel · {{fonts}}',
      // Kurz, weil die Karten-Überschrift darüber beides schon nennt - dreimal „Aktuell
      // geltende…“ in einer Karte liest sich als Versehen.
      colors: 'Farben',
      fonts: 'Schriften',
      variable: 'Variable',
      sample: 'Aa Bb Cc 123 — Beispieltext',
      notInstalled: 'Ersatzschrift',
      notInstalledExplainer:
        '„Ersatzschrift“ heißt: Die Datei liegt weder im Projekt noch in dessen Build noch auf diesem Rechner, und QuartzControl lädt nichts aus dem Netz. Die Probe zeigt deshalb eine andere Schrift als die Website.',
      italic: 'kursiv',
      noFace: 'keine @font-face-Regel gefunden',
      faceAtBuild: 'kommt beim nächsten Build von Google',
      faceOnSave: 'kommt beim Speichern von Google ins Projekt',
      faceFromGoogle: 'lädt beim Seitenaufruf von Google',
      fontsNotBuilt:
        'Dieses Projekt wurde noch nicht gebaut. Quartz lädt die Google-Schriften erst beim Build herunter. „Jetzt bauen“ oder den Dev-Server starten.',
      fontsNotFetched: 'Noch nicht im Projekt: {{families}}. Speichern holt sie von Google.',
      fontsNoRule:
        'Keine @font-face-Regel im Projekt nennt: {{families}}. Besucher sehen sie nur, wenn die Schrift auf ihrem Rechner installiert ist. Sonst importiere die Datei unten oder wähle bei der Font-Quelle Google Fonts.',
      fontsMissingFromBuild:
        'Der letzte Build enthält {{families}} noch nicht: Quartz lädt die Schrift erst beim nächsten Build herunter. Nach dem Speichern „Jetzt bauen“ oder den Dev-Server starten.',
      familyDefault: '(Standardstärke)',
      noLoader:
        'Schriften werden nicht nachgeladen: verfügbar ist nur, was ein aktives Theme mitbringt oder was du per @font-face deklarierst.',
      loader: {
        core: {
          google: 'Quartz lädt bei jedem Seitenaufruf von Google Fonts: {{specs}}.',
          selfHosted: 'QuartzControl holt diese Schriften von Google ins Projekt, die Website liefert sie selbst aus: {{specs}}.'
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
      insertHint: 'Klicken fügt die Variable an der Cursor-Position ein, ⌥ + Klick kopiert sie in die Zwischenablage.',
      insertValueHint: 'Klicken fügt {{value}} ein, ⌥ + Klick kopiert in die Zwischenablage.',
      insertValueLabel: '--{{key}}: Wert für {{mode}} einfügen',
      insertValue: 'Wert einfügen',
      rowHint: 'Jeder Klick fügt an der Cursor-Position ein: der Name als var(--name), ein Farbfeld als Wert. ⌥ + Klick kopiert stattdessen in die Zwischenablage.',
      calloutsGroup: 'Callout-Typen',
      copyHint: 'Klicken, um {{value}} in die Zwischenablage zu kopieren',
      discoveredGroup: 'Im Build-Output gefunden',
      noResults: 'Keine Treffer.',
      calloutsHeading: 'Callout-Farben',
      calloutsDescription:
        'Jeder Callout-Typ ([!note], [!warning], …) hat eigene --color/--border/--bg-Variablen, die aber nur innerhalb von .callout[data-callout="…"] gelten, kein globales var(--color). Klick fügt das passende Grundgerüst mit den echten Werten ein.',
      calloutsInsertHint: 'Klicken, um das Override-Grundgerüst für diesen Callout-Typ einzufügen.'
    }
  },
  localization: {
    loadFailed: 'Die Übersetzungen konnten nicht geladen werden.',
    localeLoadFailed: 'Die Sprache „{{code}}“ ließ sich nicht laden.',
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
    unfinished: 'Nicht abgeschlossen',
    recheck: 'Erneut prüfen',
    core: {
      heading: 'Quartz-Kern',
      commits: 'Installiert: {{current}} · Neueste Version: {{latest}}',
      missing: '{{count}} Commit fehlt',
      missing_other: '{{count}} Commits fehlen',
      runUpdate: 'Update durchführen',
      confirm:
        'Quartz-Kern aktualisieren?\n\nDabei werden Änderungen von jackyzha0/quartz geholt und die Abhängigkeiten neu installiert; bei Konflikten kann Handarbeit nötig sein.\n\nVorher wird automatisch ein Snapshot angelegt.',
      abortMerge: 'Merge abbrechen',
      openSnapshot: 'Snapshot von vor dem Update öffnen →',
      conflictHeading: 'Konflikte in folgenden Dateien (außer den durch .gitattributes geschützten Locale-Dateien):',
      pendingHeading: 'Ein früheres Update ist nicht zu Ende gelaufen',
      pendingDetail:
        'Diese eigenen Pakete fehlen in package.json oder stehen dort mit einer anderen Version: {{packages}}. „Update durchführen“ trägt sie wieder ein. Alternativ holst du unter Snapshots den Stand von vorher zurück, dort mit dem Schalter „Auch den Projekt-Commit zurücksetzen“.',
      pendingInstallDetail:
        'Der Kern ist zusammengeführt, aber „npm install“ ist dabei fehlgeschlagen: Die Abhängigkeiten in node_modules passen nicht zu package.json. „Update durchführen“ holt das nach. Alternativ holst du unter Snapshots den Stand von vorher zurück, dort mit dem Schalter „Auch den Projekt-Commit zurücksetzen“.'
    },
    plugins: {
      heading: 'Plugins',
      hint: 'Zeigt nur Plugins, die du über den Marktplatz oder per Kommandozeile hinzugefügt hast. Eingebaute Plugins (die meisten in einem neuen Projekt) werden automatisch zusammen mit dem Quartz-Kern aktualisiert.',
      updateAll: 'Alle aktualisieren',
      update: 'Aktualisieren',
      local: 'Lokal',
      none: 'Keine über den Marktplatz oder per Kommandozeile hinzugefügten Plugins gefunden.'
    },
    snapshots: {
      heading: 'Snapshots',
      movedHint:
        'Vor jedem Kern- und Plugin-Update wird automatisch ein Snapshot angelegt. Verwaltet werden sie unter Snapshots, dort liegen auch die aller anderen Bereiche.',
      openBackups: 'Zu den Snapshots →'
    }
  },
  publish: {
    title: 'Veröffentlichen',
    description: 'Baut das Projekt und veröffentlicht das Ergebnis auf die eingestellten Ziele (per SFTP/rsync, FTP, in einen Ordner, auf einen Git-Branch oder über einen Webhook).',
    baseUrlWarning: 'configuration.baseUrl steht noch auf „{{baseUrl}}“. Vor dem Veröffentlichen auf die echte Domain setzen.',
    connectionVsTarget:
      'Ein Zugang ist ein Account bei einem Anbieter und wird global in QuartzControl eingerichtet. Ein Ziel gehört zu diesem Projekt und sagt, wohin das Ergebnis soll.',
    targetHeading: 'Ziele',
    newConnectionOfKind: '+ Neuer {{kind}}-Zugang',
    connectionKindFixed:
      'Die Art des Zugangs ergibt sich aus der Art des Ziels: dieses Ziel braucht einen {{kind}}-Zugang. Andere Zugänge legst du in den QuartzControl-Einstellungen an.',
    manageConnections: 'Zugänge verwalten',
    manageConnectionsHere: 'Zugänge in den Einstellungen verwalten →',
    newTarget: 'Neues Ziel',
    panelLabel: 'Ziel',
    panelEmptyTitle: 'Noch kein Ziel',
    panelEmptyText: 'Ein Ziel sagt, wohin die gebaute Website geht: ein Server, ein Ordner, ein Branch oder ein Webhook. Lege eins an, dann stehen hier seine Angaben.',
    confirmDiscardTargetDraftAction: 'Änderungen verwerfen',
    confirmDiscardTargetDraft:
      'Am geöffneten Ziel gibt es ungespeicherte Änderungen. Wer jetzt wechselt, verliert sie.',
    confirmDeleteTargetAction: 'Ziel löschen',
    confirmDeleteTarget: 'Dieses Veröffentlichungsziel wirklich löschen? Der hinterlegte Zugang bleibt bestehen.',
    noTargets: 'Noch kein Veröffentlichungsziel angelegt. Über „+ Neues Ziel“ eines anlegen, z. B. GitHub Pages, einen Webspace per SFTP oder einen lokalen Ordner.',
    confirmDeployAction: 'Jetzt veröffentlichen',
    confirmDeployBranch:
      'Auf den Branch „{{branch}}“ veröffentlichen?\n\nDer Branch wird dabei vollständig durch den aktuellen Build ersetzt (force-push).',
    branchHint: {
      github:
        'Schiebt den Build als einzelnen Commit auf den Branch des „origin“-Remotes (dasselbe wie bei Git-Sync). In den Repository-Einstellungen muss GitHub Pages auf diesen Branch zeigen.',
      codeberg:
        'Codeberg Pages liefert den Branch „pages“ direkt aus. Nach dem ersten Push ist die Seite ohne weitere Einstellungen erreichbar.',
      gitlab:
        'Achtung: Bei GitLab veröffentlicht der Branch allein noch nichts. Dort muss ein CI-Job die Dateien als „public“-Artefakt ausliefern. Der Push funktioniert trotzdem.'
    },
    pages: {
      title: 'GitHub Pages',
      reload: 'Status neu laden',
      noGithubOrigin: 'Das „origin“-Remote dieses Projekts zeigt nicht auf github.com. Pages lässt sich von hier aus erst einrichten, wenn das Repository auf GitHub liegt (siehe Git-Sync).',
      notConfigured: 'Für dieses Repository sind noch keine Pages eingerichtet. Mit dem Button unten wird Pages angelegt und auf diesen Branch gestellt.',
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
        'Die Domain wird bei GitHub gespeichert, nicht im Branch. Anders als eine CNAME-Datei überlebt sie damit jedes Deploy, das den Branch vollständig ersetzt. HTTPS lässt sich erst erzwingen, wenn GitHub das Zertifikat ausgestellt hat; das dauert nach dem Setzen der Domain einige Minuten.'
    },
    sftpHint:
      'SFTP vergleicht den Build mit einer lokalen Liste dessen, was zuletzt hochgeladen wurde. Dateien, die jemand direkt auf dem Server ändert oder löscht, bleiben dabei unbemerkt.',
    rsyncHint:
      'rsync fragt den Server selbst, was dort liegt. Der Diff stimmt also auch dann, wenn dort jemand von Hand etwas geändert hat. Setzt voraus, dass rsync auf dem Server installiert ist.',
    rsyncBlocked: {
      'no-connection': 'rsync steht zur Verfügung, sobald ein SSH-Zugang mit Schlüsseldatei oder SSH-Agent gewählt ist.',
      'password-auth': 'rsync ist mit Passwort-Anmeldung nicht möglich, weil ssh das Passwort nicht entgegennehmen kann. Mit Schlüsseldatei oder SSH-Agent geht es.',
      'key-not-a-file':
        'rsync braucht den privaten Schlüssel als Datei; ein hier eingefügter Schlüsseltext reicht nicht. Den Zugang auf eine Schlüsseldatei umstellen.',
      'no-pinned-host-key':
        'rsync braucht einen bestätigten Host-Key. Einmal über SFTP veröffentlichen (dabei wird der Fingerprint abgefragt und gespeichert), danach lässt sich rsync wählen.',
      'platform-unsupported':
        'rsync gibt es auf diesem Betriebssystem nicht. SFTP überträgt dieselben Dateien, nur ohne den Abgleich mit dem Server.',
      'not-installed':
        'Auf diesem Rechner ist kein rsync installiert. Unter Debian und Ubuntu: sudo apt install rsync. SFTP überträgt bis dahin dieselben Dateien, nur ohne den Abgleich mit dem Server.'
    },
    webhookNoUrl: 'keine URL hinterlegt',
    webhookExplainer:
      'Ein Webhook lädt keine Dateien hoch, sondern stößt einen Build beim Anbieter an (Netlify, Cloudflare Pages, Vercel, CI). Deshalb gibt es hier keine Dateiliste: Der Build läuft dort, nicht hier.',
    deleteDisabledHint: 'Löschen ist für dieses Ziel deaktiviert. Entfernte Dateien bleiben dort liegen, werden aber weiter mitgezählt.',
    targetForm: {
      heading: 'Veröffentlichungsziel',
      explainer:
        'Ein Ziel beschreibt, wohin dieses Projekt veröffentlicht: Pfad, Löschverhalten und welcher Zugang dafür benutzt wird. Der Zugang selbst wird global in QuartzControl eingerichtet und kann von mehreren Projekten benutzt werden.',
      name: 'Name',
      type: 'Art',
      remotePath: 'Remote-Pfad',
      remotePathPlaceholder: 'z. B. httpdocs oder /var/www/example.com',
      remotePathHint:
        'Der Ordner auf dem Server, in den die Website kommt. Ohne führenden Schrägstrich zählt er ab dem Anmeldeverzeichnis; bei einem Webspace ist das der Normalfall.',
      remotePathError: {
        empty: 'Ohne Zielordner kann nichts veröffentlicht werden.',
        'whole-root': 'Das Anmeldeverzeichnis selbst geht nicht, weil es mit aktiviertem Löschen geleert würde. Gib den Unterordner an, in dem die Website liegt.',
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
    hostKeyUnknown: 'Host-Key noch nicht bestätigt (wird beim ersten Verbinden abgefragt)',
    forgetHostKey: 'Host-Key vergessen',
    confirmForgetHostKeyAction: 'Host-Key vergessen',
    confirmForgetHostKey:
      'Gespeicherten Host-Key für {{host}} verwerfen?\n\nBeim nächsten Verbinden wird der Fingerprint erneut abgefragt. Nur ausführen, wenn der Server nachweislich neu aufgesetzt wurde.',
    ftpPlaintextWarning: 'FTP überträgt Passwort und Dateien im Klartext. Ohne FTPS kann jeder im selben Netz mitlesen. Falls dein Anbieter es unterstützt, unbedingt aktivieren (oder besser SFTP nutzen).',
    confirmDeployWebhook:
      'Webhook „{{target}}“ auslösen?\n\nDabei werden keine Dateien übertragen. Der Anbieter wird nur aufgefordert, selbst zu bauen.',
    confirmDeployConnection:
      'Nach {{target}} veröffentlichen?\n\n{{uploads}} Datei(en) werden hochgeladen, {{deletions}} Datei(en) werden auf dem Server gelöscht.',
    connectionForm: {
      heading: 'Zugang',
      explainer:
        'Zugangsdaten werden verschlüsselt im Schlüsselbund des Systems abgelegt und gelten global in QuartzControl, nicht nur für dieses Projekt.',
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
        'Der Schlüssel bleibt im SSH-Agent des Systems; QuartzControl speichert dafür nichts. Vorausgesetzt wird eine gesetzte SSH_AUTH_SOCK-Umgebungsvariable.',
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
        'Verwirft, was QuartzControl zuletzt an dieses Ziel geschickt hat. Danach bietet die Vorschau wieder den ganzen Build an. Für alles, was QuartzControl nicht sehen kann: eine von Hand gelöschte Datei auf dem Server, eine abgebrochene Übertragung, eine Wiederherstellung durch den Anbieter.',
    noDiffYet: 'Noch kein Diff berechnet. Zuerst bauen oder Diff aktualisieren.',
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
      'Bündelt die Gestaltung dieses Projekts in einer Datei: Farben, Theme, CSS, Schriften, Layout, Frames, Plugins und Übersetzungen, vollständig oder in Teilen. Nach dem Import in ein anderes Projekt ist dort alles so eingestellt wie hier.',
    exportHeading: 'Vorlage erstellen',
    exportHint:
      'Es wird eine einzelne .qtpl-Datei geschrieben, die du weitergeben kannst. Ausgewählt ist alles, was dieses Projekt beinhaltet.',
    nameLabel: 'Name der Vorlage',
    descriptionLabel: 'Beschreibung (optional)',
    descriptionPlaceholder: 'Wofür ist diese Vorlage gedacht?',
    partsHeading: 'Inhalt',
    nothingToExport: 'In diesem Projekt gibt es noch nichts, was sich als Vorlage sichern ließe.',
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
      'Für eine Sprache lässt sich nicht feststellen, was du geändert hast. Die Vergleichsbasis entsteht erst, wenn du einen Text in QuartzControl bearbeitest. Nimm „Alle Texte“, wenn sie dabei sein soll.',
    baselineHint_other:
      'Für {{count}} Sprachen lässt sich nicht feststellen, was du geändert hast. Die Vergleichsbasis entsteht erst, wenn du einen Text in QuartzControl bearbeitest. Nimm „Alle Texte“, wenn eine davon dabei sein soll.',
    importHeading: 'Vorlage anwenden',
    importHint:
      'Vorher wird automatisch ein Snapshot angelegt.',
    planning: 'Paket wird geprüft…',
    pickBuiltin: 'Basis-Template',
    builtinDownloaded: 'Basis-Template, von GitHub geladen',
    builtinBundled: 'Basis-Template, die Fassung aus QuartzControl (GitHub nicht erreichbar)',
    builtinMissing: 'Das Basis-Template konnte weder geladen noch in QuartzControl gefunden werden.',
    pickPackage: 'Vorlage wählen…',
    previewError: 'Das ist keine lesbare Vorlage (keine manifest.json gefunden).',
    legacyBadge: 'Altes Format',
    packageOrigin: 'Erstellt am {{date}} aus dem Projekt „{{project}}“',
    unknownProject: 'unbekannt',
    unknownParts:
      'Diese Vorlage enthält Bausteine, die diese Version noch nicht kennt ({{parts}}). Sie werden übersprungen.',
    strategyHeading: 'Bei Konflikten',
    strategyPackage: 'Vorlage gewinnt',
    strategyProject: 'Projekt gewinnt',
    strategyPackageHint: 'Was dieses Projekt schon hat, wird durch die Vorlage ersetzt.',
    strategyProjectHint: 'Was dieses Projekt schon hat, bleibt; nur Fehlendes kommt hinzu.',
    planAdditions: '{{count}} neu',
    planReplaced: '{{count}} wird ersetzt',
    planReplaced_other: '{{count}} werden ersetzt',
    planKept: '{{count}} bleibt unverändert',
    planKept_other: '{{count}} bleiben unverändert',
    planIdentical: '{{count}} identisch',
    planProjectIconKept: 'Das Projektbild bleibt: Du hast es in QuartzControl gewählt, die Vorlage ersetzt es nicht.',
    planProjectIconKept_other: 'Die Projektbilder bleiben: Du hast sie in QuartzControl gewählt, die Vorlage ersetzt sie nicht.',
    planUnrecordedIconReplaced: '{{names}} ist nicht das Bild von Quartz und wurde nicht in QuartzControl gewählt, vielleicht auf einem anderen Rechner oder mit einer früheren Vorlage. „Vorlage gewinnt“ ersetzt es; „Projekt gewinnt“ behält es.',
    planUnrecordedIconReplaced_other: '{{names}} wurden nicht in QuartzControl gewählt, vielleicht auf einem anderen Rechner oder mit einer früheren Vorlage. „Vorlage gewinnt“ ersetzt sie; „Projekt gewinnt“ behält sie.',
    planUnrecordedIconKept: '{{names}} ist nicht das Bild von Quartz und wurde nicht in QuartzControl gewählt, vielleicht auf einem anderen Rechner oder mit einer früheren Vorlage. Es bleibt, weil „Projekt gewinnt“ gewählt ist.',
    planUnrecordedIconKept_other: '{{names}} wurden nicht in QuartzControl gewählt, vielleicht auf einem anderen Rechner oder mit einer früheren Vorlage. Sie bleiben, weil „Projekt gewinnt“ gewählt ist.',
    namesAnd: ' und ',
    planOutside: '{{count}} wird abgelehnt',
    planOutside_other: '{{count}} werden abgelehnt',
    planContentIsSymlink:
        'Wird übersprungen: Der Content-Ordner dieses Projekts ist ein Link in einen anderen Ordner. Dorthin schreibt eine Vorlage nichts.',
    planLegacyStylesReplaced: '{{count}} Stylesheets aus der Aufteilung bis 1.0 lädt das Projekt danach nicht mehr; die zwölf der Vorlage ersetzen sie. Die Dateien bleiben im Ordner.',
    planCustomScssMerged: 'custom.scss behält deine Regeln und bekommt Zeilen der Vorlage dazu.',
    planNewerStylesReplaced: '{{count}} Stylesheets aus der Aufteilung von 1.1 lädt das Projekt danach nicht mehr; die Stylesheets der Vorlage aus der Aufteilung bis 1.0 ersetzen sie. Die Dateien bleiben im Ordner.',
    planNewerStylesKept: 'Dieses Projekt lädt {{count}} Stylesheets aus der Aufteilung von 1.1, und dabei bleibt es: Die Stylesheets der Vorlage aus der Aufteilung bis 1.0 kommen in den Ordner, geladen werden sie nicht.',
    planLegacyStylesKept: 'Dieses Projekt lädt noch {{count}} Stylesheets aus der Aufteilung bis 1.0, und dabei bleibt es: Die zwölf der Vorlage kommen in den Ordner, geladen werden sie nicht. Die eigenen führt „Zusammenlegen“ unter Stile → Eigenes CSS zusammen.',
    planMissingVariables: 'Die Stylesheets der Vorlage lesen {{count}} CSS-Variable, die dieses Projekt nicht hat ({{names}}). Sie kommt mit dem Teil „CSS-Variablen“; ohne ihn gilt die Regel nicht.',
    planMissingVariables_other: 'Die Stylesheets der Vorlage lesen {{count}} CSS-Variablen, die dieses Projekt nicht hat ({{names}}). Sie kommen mit dem Teil „CSS-Variablen“; ohne ihn gelten diese Regeln nicht.',
    planPluginsOn: 'Schaltet {{names}} ein.',
    planPluginsOn_other: 'Schaltet {{count}} Plugins ein: {{names}}.',
    planPluginsOff: 'Schaltet {{names}} aus.',
    planPluginsOff_other: 'Schaltet {{count}} Plugins aus: {{names}}.',
    planByPosition: 'Von {{names}} gibt es hier mehrere Einträge: Die Vorlage ersetzt sie nach der Reihenfolge, nicht nach dem Inhalt: ihr erster Eintrag den ersten hier, ihr zweiter den zweiten.',
    planByPosition_other: 'Von {{names}} gibt es hier mehrere Einträge: Die Vorlage ersetzt sie nach der Reihenfolge, nicht nach dem Inhalt: ihr erster Eintrag den ersten hier, ihr zweiter den zweiten.',
    planFontsRemoved: 'Löscht die Schriftdatei {{names}}: Die Regel, die sie nennt, wird ersetzt.',
    planFontsRemoved_other: 'Löscht {{count}} Schriftdateien ({{names}}): Die Regeln, die sie nennen, werden ersetzt.',
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
    importSuccessNoWarnings: 'Fertig: alles übernommen, nichts blieb offen.',
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
        description: 'custom.scss und alle Stylesheets, die du angelegt oder importiert hast, samt ihrer Ladereihenfolge.'
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
        description: 'Welche Komponente wo erscheint, pro Seitentyp, und ab welcher Breite umgebrochen wird.'
      },
      frames: {
        label: 'Eigene Frames',
        description: 'Selbst gebaute Frames. Werden im Zielprojekt neu registriert, nicht bloß kopiert.'
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
          'Die Notizen selbst. Bei den meisten Vorlagen willst du das nicht, denn eine Vorlage ist eine Gestaltung. Bei einer, die sich selbst erklärt, schon.'
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
      projectIconKept: '{{count}} Projektbild blieb unverändert, weil du es in QuartzControl gewählt hast.',
      projectIconKept_other: '{{count}} Projektbilder blieben unverändert, weil du sie in QuartzControl gewählt hast.',
      fontRemoved: '{{count}} Schriftdatei der ersetzten Regeln wurde entfernt, weil keine Regel sie mehr nennt.',
      fontRemoved_other: '{{count}} Schriftdateien der ersetzten Regeln wurden entfernt, weil keine Regel sie mehr nennt.',
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
      packageUnreadable: 'Die Vorlage konnte nicht gelesen werden.'
    }
  },
  pluginsMarketplace: {
    panelLabel: 'Plugin',
    panelEmptyTitle: 'Plugin wählen',
    panelEmptyText: 'Wähle links ein Plugin: Hier stehen dann seine Beschreibung aus dem Repository und der Button zum Installieren.',
    panelEmptyCount: '{{count}} Plugins im Katalog, {{installed}} davon in diesem Projekt.',
    readmeLoading: 'Lade die Beschreibung…',
    readmeMissing: 'Dieses Repository hat keine README.',
    readmeUnavailable: 'GitHub hat die README gerade nicht geliefert. Auf GitHub ansehen geht über den Link oben.',
    readmeTruncated: 'Die README ist länger; der Rest steht auf GitHub.',
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
      'Repositories der quartz-community ohne die Markierung „quartz-plugin“, darunter Quartz selbst, gemeinsam genutzte Bibliotheken, Vorlagen und Forks. Meistens nicht als Plugin installierbar.',
    installedMessage: '{{name}} installiert.',
    loading: 'Katalog wird geladen…',
    refresh: 'Katalog neu laden',
    refreshing: 'Lade…',
    unavailable:
      'Der Katalog ist gerade nicht erreichbar (GitHub antwortet nicht oder das Anfragelimit ist erschöpft). Unten steht deshalb nur ein Platzhalter. Mit „Katalog neu laden“ nochmal versuchen; ein GitHub-Token in den Einstellungen hebt das Limit deutlich an.'
  },
  dnd: {
    instructions:
      'Mit Leertaste oder Eingabetaste aufnehmen. Beim Ziehen mit den Pfeiltasten bewegen, mit Leertaste oder Eingabetaste ablegen, mit Escape abbrechen.',
    picked: '{{name}} aufgenommen.',
    pickedOver: '{{name}} aufgenommen, liegt über {{target}}.',
    over: '{{name}} liegt über {{target}}.',
    backHome: '{{name}} liegt wieder auf seinem Ausgangsplatz.',
    outside: '{{name}} liegt über keinem Ablageort.',
    dropped: '{{name}} bei {{target}} abgelegt.',
    droppedHome: '{{name}} blieb an seinem Platz.',
    // Zwei Ausgänge, die „abgelegt“ falsch beschreibt: Auf dem Komponentenvorrat wird ein
    // Duplikat gelöscht, und eine einzelne Instanz bleibt, wo sie ist.
    removed: 'Ein Duplikat von {{name}} aus dem Layout entfernt.',
    disabledWhole: '{{name}} ausgeschaltet und in den Komponentenvorrat gelegt – das ganze Plugin, auch {{kinds}}.',
    disabled: '{{name}} ausgeschaltet und in den Komponentenvorrat gelegt.',
    reenabled: '{{name}} eingeschaltet und bei {{target}} abgelegt.',
    cancelled: '{{name}} abgebrochen, nichts verschoben.'
  },
  logConsole: {
    noOutput: 'Noch keine Ausgabe.',
    clear: 'Ausgabe leeren'
  }
} as const
