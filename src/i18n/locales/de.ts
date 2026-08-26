export default {
  common: {
    back: 'Zurück',
    save: 'Speichern',
    saving: 'Speichere…',
    saved: 'Gespeichert.',
    cancel: 'Abbrechen',
    close: 'Schließen',
    select: 'Auswählen',
    remove: 'Entfernen',
    edit: 'Bearbeiten',
    loading: 'Lade…',
    openInBrowser: 'Im Browser öffnen ↗',
    copied: 'Kopiert — {{value}}',
    serverState: {
      stopped: 'Gestoppt',
      starting: 'Startet…',
      running: 'Läuft',
      stopping: 'Stoppt…',
      error: 'Fehler'
    }
  },
  home: {
    subtitle:
      'Verwalte deine Quartz-5-Projekte an einem Ort: Konfiguration und Themes bearbeiten, Plugins installieren, den Content-Ordner mit einem Obsidian-Vault verknüpfen und Builds sowie den lokalen Dev-Server steuern.',
    settings: 'Einstellungen',
    openExisting: 'Vorhandenes Projekt öffnen',
    createNew: 'Neues Projekt erstellen',
    noProjects: 'Noch keine Projekte hinzugefügt.',
    wizard: {
      title: 'Neues Quartz-Projekt',
      targetDirectory: 'Zielverzeichnis',
      template: 'Template',
      contentStrategy: 'Content-Strategie',
      strategyNew: 'Neu (leerer Ordner)',
      strategyCopy: 'Kopieren (echter Ordner)',
      strategySymlink: 'Verknüpfen (symbolischer Link)',
      sourceFolder: 'Quellordner (z. B. Obsidian-Vault)',
      linkResolution: 'Link-Auflösung',
      linkShortest: 'Kürzeste (wie Obsidian)',
      linkAbsolute: 'Absolut',
      linkRelative: 'Relativ',
      baseUrl: 'Base URL (später in der Konfiguration änderbar)',
      creating: 'Erstelle… (Klonen + npm install kann etwas dauern)',
      create: 'Erstellen',
      createFailed: 'Projekt konnte nicht erstellt werden.'
    }
  },
  projectLayout: {
    allProjects: 'Alle Projekte',
    loading: 'Lade Projekt…',
    tabs: {
      overview: 'Übersicht',
      config: 'Konfiguration',
      layout: 'Layout',
      styles: 'Stile',
      localization: 'Übersetzungen',
      plugins: 'Plugins',
      content: 'Content-Ordner',
      server: 'Build & Server',
      sync: 'Git-Sync',
      backups: 'Backups',
      updates: 'Updates',
      publish: 'Veröffentlichen',
      templates: 'Vorlagen'
    },
    groups: {
      design: 'Gestaltung',
      content: 'Inhalte',
      plugins: 'Plugins',
      publish: 'Veröffentlichung'
    },
    descriptions: {
      overview: 'Der Überblick über dieses Projekt: Server-Status, wichtigste Einstellungen und Schnellzugriffe auf alle Bereiche.',
      config: 'Grundeinstellungen deiner Website — Titel, Adresse und Sprache.',
      layout: 'Legt fest, welche Bausteine (z. B. Suche, Inhaltsverzeichnis, Navigation) wo auf der Seite erscheinen.',
      styles:
        'Alles zum Aussehen an einem Ort: Basisfarben und Schriften, Community-Themes, CSS-Variablen und eigenes CSS — in genau der Reihenfolge, in der sie sich gegenseitig überschreiben.',
      templates: 'Deine Gestaltung — Layout, Farben, Plugins, Schriften — als wiederverwendbares Paket exportieren oder in ein anderes Projekt importieren.',
      content: 'Verwaltet den Ordner mit deinen Markdown-Notizen — als echte Kopie oder verknüpft mit einem bestehenden Ordner, z. B. deinem Obsidian-Vault.',
      localization: 'Bearbeitet feste Textbausteine der Website (z. B. „Suche“, „Zuletzt geändert“) in den verfügbaren Sprachen.',
      plugins: 'Erweitert Quartz um zusätzliche Funktionen — von Volltextsuche bis Kommentaren.',
      updates: 'Hält Quartz selbst und die installierten Plugins auf dem neuesten Stand.',
      server: 'Zeigt deine Website lokal in der Vorschau an und erstellt bei Bedarf einen einmaligen Build zum Exportieren.',
      sync: 'Gleicht deine lokalen Änderungen mit dem Git-Repository ab: Hochladen (Push) und Herunterladen (Pull).',
      backups: 'Automatisch gesicherte Stände deiner Konfiguration und deines Content-Ordners — zum Vergleichen und Wiederherstellen.',
      publish: 'Baut die Website und lädt nur die geänderten Dateien auf deinen Webspace oder zu GitHub Pages hoch.'
    }
  },
  dashboard: {
    devServer: 'Dev-Server',
    notReachable: 'Nicht erreichbar',
    start: 'Starten',
    stop: 'Stoppen',
    detailsOptions: 'Details & Optionen →',
    config: 'Konfiguration',
    pageTitle: 'Seitentitel',
    baseUrl: 'Base URL',
    theme: 'Theme',
    default: 'Standard',
    plugins: 'Plugins',
    pluginsActiveTotal: '{{active}} aktiv · {{total}} gesamt',
    editConfig: 'Konfiguration bearbeiten →',
    contentFolder: 'Content-Ordner',
    notPresent: 'Nicht vorhanden',
    realFolder: 'Echter Ordner',
    filesSuffix: ' · {{count}} Dateien',
    symlinkTo: 'Symlink → {{target}}',
    symlink: 'Symlink',
    targetMissing: 'Ziel fehlt',
    manageContentFolder: 'Content-Ordner verwalten →',
    managePlugins: 'Plugins verwalten',
    gitSync: 'Git-Sync',
    viewBackups: 'Backups ansehen'
  },
  content: {
    currentFolder: 'Aktueller Content-Ordner',
    loading: 'Lade…',
    noFolder: 'Kein content/-Ordner gefunden.',
    symlinkBadge: 'Symbolischer Link',
    realFolderBadge: 'Echter Ordner',
    filesCount: '{{count}} Dateien',
    targetMissingSuffix: ' (Ziel existiert nicht)',
    changeSource: 'Quelle ändern…',
    dialogTitle: 'Content-Quelle ändern',
    dialogWarning:
      'Der aktuelle content/-Ordner wird vor der Änderung nach .quartz-gui/content-backups/ verschoben und kann über die Backups-Ansicht wiederhergestellt werden.',
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
    watch: 'Watch',
    start: 'Starten',
    restart: 'Neustarten',
    stop: 'Stoppen',
    oneOffBuild: 'Einmaliger Build',
    building: 'Baue…',
    buildNow: 'Jetzt bauen',
    exportDir: 'Export-Ordner (optional)',
    exportDirPlaceholder: 'Standard: public/ im Projekt',
    reset: 'Zurücksetzen',
    success: 'Erfolgreich',
    failed: 'Fehlgeschlagen',
    resultLine: '{{status}} in {{seconds}}s',
    exportedTo: ' · exportiert nach {{dir}}'
  },
  gitSync: {
    title: 'Git-Sync',
    explainer: 'Pull holt Änderungen aus dem Repository ab. Push lädt deine lokalen Änderungen dorthin hoch.',
    pull: 'Pull',
    pullRunning: 'Pull läuft…',
    push: 'Push',
    pushRunning: 'Push läuft…',
    both: 'Push + Pull',
    bothRunning: 'Sync läuft…',
    success: 'Erfolgreich.',
    failed: 'Fehlgeschlagen.'
  },
  backups: {
    config: 'Konfiguration',
    content: 'Content-Ordner',
    none: 'Keine Backups vorhanden.',
    viewDiff: 'Diff ansehen',
    restore: 'Wiederherstellen',
    noDiff: 'Keine Unterschiede.',
    confirmRestore: 'Diesen Stand wiederherstellen? Der aktuelle Stand wird vorher gesichert.'
  },
  settings: {
    title: 'Einstellungen',
    githubToken: 'GitHub-Token (für Marktplatz-Rate-Limit)',
    defaultProjectDirectory: 'Standard-Projektverzeichnis',
    language: 'Sprache',
    languageSystem: 'Systemsprache folgen',
    languageDe: 'Deutsch',
    languageEn: 'English'
  },
  configEditor: {
    loadError: 'quartz.config.yaml konnte nicht gelesen werden.',
    loadErrorHint:
      'Existiert die Datei im Projektordner? Ein neu erstelltes Projekt braucht dafür einen erfolgreich durchgelaufenen Setup-Assistenten.',
    loading: 'Lade Konfiguration…',
    themeMoved:
      'Farben und Schriften sind zu den Stilen umgezogen — dort bilden sie die Basis-Ebene, auf der Themes, Variablen und eigenes CSS aufbauen.',
    themeMovedLink: 'Zu den Stilen'
  },
  siteSettings: {
    pageTitle: 'Seitentitel',
    pageTitleSuffix: 'Titel-Suffix (nur Browser-Tab)',
    baseUrl: 'Base URL',
    locale: 'Locale',
    spa: 'Single-Page-App-Routing',
    popovers: 'Popover-Vorschauen',
    ignorePatterns: 'Ignore-Patterns (eine Zeile pro Muster)'
  },
  themeEditor: {
    overrideWarningPrefix: 'Das Theme-Plugin ',
    overrideWarningSuffix: ' ist aktiv und kann diese Farben in der Vorschau überschreiben. Dort lässt es sich auch wieder deaktivieren.',
    goToThemeTab: 'Zu den Community-Themes',
    fontSource: 'Font-Quelle',
    googleFonts: 'Google Fonts',
    googleFontsHint: 'Quartz holt die gewählten Schriften bei Google. Wie sie ausgeliefert werden, entscheidet der Schalter unten.',
    localHint: 'Quartz lädt dann gar nichts — die Schrift muss selbst vorliegen, z.B. über „Eigene Schriftart importieren" unten.',
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
          google: 'Plugin „Fonts": verlinkt Google Fonts direkt.',
          selfHosted: 'Plugin „Fonts": lädt beim Build herunter und liefert lokal aus.'
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
    fontImportSuccess: '"{{family}}" importiert.',
    colors: 'Farben'
  },
  themes: {
    loading: 'Lade Community-Themes…',
    disableAll: 'Community-Themes deaktivieren',
    allDisabled: 'Community-Themes deaktiviert',
    active: {
      title: 'Aktuelles Theme',
      none: 'Kein Community-Theme aktiv — es gilt das klassische Theme aus „Konfiguration → Theme". Installiere unten eines aus dem Katalog, um loszulegen.',
      heading: 'Aktuelles Theme: {{themeId}}',
      saveAsPreset: 'Als Preset speichern',
      presetNamePlaceholder: 'Name für das Preset',
      overrideNote:
        'Dieses Plugin ({{source}}) überschreibt die Farben aus der Basis-Ebene. Änderungen unten wirken sich direkt auf die Vorschau aus.',
      disabledHeading: 'Community-Theme deaktiviert ({{themeId}})',
      disabledNote:
        'Es gilt jetzt wieder das klassische Theme aus „Konfiguration → Theme". Die Einstellungen dieses Community-Themes bleiben erhalten und lassen sich jederzeit wieder aktivieren.',
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
      delete: 'Löschen'
    },
    catalog: {
      title: 'Katalog',
      description:
        'Vorgefertigte Farbschemata aus dem @quartz-themes-Ökosystem (installiert und aktiviert das Plugin @quartz-themes/core mit dem gewählten Theme).',
      searchPlaceholder: 'Theme suchen (z.B. tokyo-night, catppuccin, nord)…',
      installing: 'Installiere…',
      install: 'Installieren & aktivieren',
      active: 'Aktiv',
      noResults: 'Keine Treffer.',
      moreResults: '{{count}} weitere Treffer — weiter tippen zum Filtern.',
      installSuccess: '"{{id}}" installiert und aktiviert — nicht vergessen, oben auf "Speichern" zu klicken.',
      installFailed: 'Installation von "{{id}}" fehlgeschlagen: {{output}}',
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
  pluginsInstalled: {
    addPlaceholder: 'github:owner/repo',
    add: 'Hinzufügen',
    marketplaceLink: 'Marktplatz durchsuchen →',
    none: 'Keine Plugins installiert.',
    componentsHeading: 'Components',
    componentsDescription: 'Diese Plugins sind sichtbar auf der Seite — z. B. im Kopfbereich, in der Seitenleiste oder im Footer.',
    processingHeading: 'Verarbeitung',
    processingDescription:
      'Diese Plugins verändern deine Inhalte im Hintergrund (z. B. Formatierung, Links, Bilder) und erscheinen selbst nicht sichtbar auf der Seite. Seitentypen — Plugins, die eine eigene Art von Seite erzeugen, z. B. Tag-Seiten — werden unten separat aufgeführt.',
    pageTypesHeading: 'Seitentypen ({{count}})',
    otherProcessingHeading: 'Transformer, Filter & Emitter ({{count}})',
    dragHint: 'Ziehen zum Umsortieren',
    active: 'Aktiv',
    disabled: 'Deaktiviert',
    showOptions: 'Optionen anzeigen',
    hideOptions: 'Optionen einklappen',
    disable: 'Deaktivieren',
    enable: 'Aktivieren',
    removeConfirm: 'Plugin "{{name}}" wirklich entfernen?',
    availableOptions: 'Verfügbare Optionen:',
    onlyViaYaml: ', nur per YAML',
    noSchemaInfo: 'Keine Options-Schema-Information für dieses Plugin gefunden — nur vorhandene Werte bearbeitbar.',
    notSet: 'nicht gesetzt',
    summaryPosPriority: 'position: {{position}} · priority: {{priority}}',
    summaryOrder: 'order: {{order}}',
    layoutFields: {
      position: 'header = Kopfbereich, left/right = Sidebar, beforeBody/afterBody = um den Inhalt herum, footer = Fußzeile',
      priority: 'Reihenfolge innerhalb der Position — kleiner zuerst',
      display: 'all = alle Geräte, mobile-only = nur mobil, desktop-only = nur Desktop',
      condition: 'Freitext-Bedingung, z. B. "not-index"',
      group: 'Name einer Toolbar-Gruppe, z. B. "toolbar"'
    },
    groupOptionsFields: {
      grow: 'Element wächst, um freien Platz in der Gruppe zu füllen',
      shrink: 'Element darf bei Platzmangel schrumpfen',
      basis: 'Flex-Basisgröße, z. B. "auto" oder "100px"',
      order: 'Reihenfolge innerhalb der Gruppe — kleiner zuerst',
      align: 'CSS align-items, z. B. "center"',
      justify: 'CSS justify-content, z. B. "space-between"'
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
    'remove-draft': 'Blendet Seiten mit „draft: true" im Frontmatter aus.',
    'explicit-publish': 'Veröffentlicht nur Seiten, die im Frontmatter explizit mit „publish: true" markiert sind.',
    'unlisted-pages':
      'Blendet Seiten mit „unlisted: true" aus allen Listen (Suche, Graph, Explorer, …) aus — bleiben aber über die URL erreichbar.',
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
    tabGlobal: 'Global',
    tabPageTypes: 'Seitentypen',
    tabFrames: 'Eigene Frames',
    pageTypesHint: 'Wählen Sie einen Seitentyp, um ihn anzupassen.',
    pageTypeHasOverride: 'Angepasst',
    loading: 'Lade Layout…',
    positions: {
      header: 'Header',
      left: 'Links',
      right: 'Rechts',
      beforeBody: 'Vor dem Inhalt',
      pageBody: 'Seiteninhalt',
      afterBody: 'Nach dem Inhalt',
      footer: 'Footer'
    },
    emptySlot: 'Leer — hierher ziehen',
    activeFrameLabel: 'Zeigt Grid-Struktur von: {{name}}',
    activeFrameDefault: '(Standard-Raster)',
    previewPageTypeLabel: 'Grid-Vorschau für:',
    groupLabel: 'Gruppe',
    displayLabel: 'Sichtbarkeit',
    noGroup: '— keine —',
    displayAll: 'Immer',
    displayDesktopOnly: 'Nur Desktop',
    displayMobileOnly: 'Nur Mobil',
    groupsPanel: {
      title: 'Flex-Gruppen',
      description:
        'Komponenten mit derselben Gruppe werden nebeneinander (oder untereinander) in einer Flexbox gerendert, statt einzeln untereinander.',
      none: 'Keine Flex-Gruppen definiert.',
      newGroupPlaceholder: 'Name der neuen Gruppe',
      add: 'Hinzufügen',
      direction: 'Richtung',
      gap: 'Abstand',
      priority: 'Priorität (optional)',
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
    excludeDescription: 'Schalten Sie eine Komponente aus, um sie auf Seiten dieses Typs auszublenden.',
    excludeDuplicateHint: 'Betrifft alle {{count}} Instanzen von „{{name}}" — Quartz kann einzelne Duplikate hier nicht getrennt ausschließen.',
    template: 'Frame/Template',
    templateDefault: 'Standard',
    templateFullWidth: 'Volle Breite',
    templateMinimal: 'Minimal',
    templatePluginDefault: '„{{frame}}" (Plugin-Standard, aktiv)',
    pluginFrameUnknownLayout:
      'Dieser Seitentyp nutzt automatisch das Frame „{{frame}}", das von der zugehörigen Plugin mitgebracht wird. Die genaue Grid-Struktur kann hier nicht als Vorschau angezeigt werden, da sie vom Plugin selbst gerendert wird — nicht das Standard-Raster.',
    clearSlotsHeading: 'Bereiche für diesen Seitentyp leeren',
    clearSlotsDescription: 'Aktivierte Bereiche bleiben für diesen Seitentyp immer leer, unabhängig von der globalen Belegung.',
    frameBuilder: {
      description: 'Erstellen Sie eigene Grid-Layouts als neue Frames. Sie werden bei den Seitentyp-Overrides als Frame/Template auswählbar.',
      newFrame: 'Neuer Frame',
      none: 'Noch keine eigenen Frames erstellt.',
      gridSummary: '{{rows}}×{{cols}}-Raster, {{areas}} Bereich(e)',
      frameName: 'Frame-Name',
      rows: 'Zeilen',
      cols: 'Spalten',
      gap: 'Abstand',
      rowGap: 'Zeilenabstand',
      columnGap: 'Spaltenabstand',
      resetTracks: 'Spurgrößen zurücksetzen',
      columnSizesLabel: 'Spaltenbreiten (leer = 1fr)',
      rowSizesLabel: 'Zeilenhöhen (leer = auto)',
      lineNamesLabel: 'Benannte Grid-Lines (optional)',
      lineNamesHint:
        'Vergibt Namen für die Linien zwischen den Spalten bzw. Zeilen (z. B. „sidebar-start"). Wird für die Bereichszuweisung hier im Editor nicht benötigt — nützlich nur, wenn Sie später in eigenem CSS (z. B. custom.scss) gezielt auf diese Linie verweisen wollen, etwa mit grid-column: sidebar-start / content-end.',
      columnLinesLabel: 'Spalten-Lines',
      rowLinesLabel: 'Zeilen-Lines',
      copyLayoutTo: 'Auf {{target}} kopieren',
      breakpoint: {
        desktop: 'Desktop',
        tablet: 'Tablet',
        mobile: 'Mobil'
      },
      availableAreasLabel: 'Verfügbare Bereiche (ins Raster ziehen, um sie zu platzieren)',
      newArea: '+ Bereich hinzufügen',
      allPlaced: 'Alle Bereiche sind platziert.',
      hintDragToPlace:
        'Ziehen Sie einen Bereich auf eine freie Zelle, um ihn zu platzieren — oder einen platzierten Bereich zurück in diese Liste, um ihn wieder zu lösen. Ein Klick wählt einen Bereich aus und zeigt seine Einstellungen unten, dort auch die Zeilen- und Spalten-Spanne — Änderungen wirken sich sofort aus.',
      expandArea: 'Bereichseinstellungen aufklappen',
      areaName: 'Bereichsname',
      areaSlot: 'Belegung',
      rowSpanLabel: 'Zeilen-Spanne',
      colSpanLabel: 'Spalten-Spanne',
      removeArea: 'Bereich löschen',
      unplace: 'Aus Raster lösen',
      visibleOnBreakpoint: 'Sichtbar auf {{breakpoint}}',
      overlapError: 'Dieser Bereich überschneidet sich mit einem bestehenden Bereich.',
      unassignedWarning: 'Nicht zugewiesen: {{slots}}. Komponenten für diese Positionen werden in diesem Frame nicht angezeigt.',
      neverVisibleWarning: 'Auf keinem Breakpoint sichtbar: {{areas}}. Diese Bereiche werden nirgends gerendert.',
      nameRequired: 'Bitte einen Frame-Namen vergeben.',
      nameCollision: 'Dieser Name ist bereits vergeben (Standard-Templates oder ein anderer eigener Frame).',
      deleteFrame: 'Diesen Frame löschen',
      deleteConfirm: 'Frame "{{name}}" wirklich löschen? Seitentypen, die ihn referenzieren, fallen dann auf das Standard-Template zurück.',
      preview: {
        pageContent: 'Seiteninhalt'
      }
    },
    componentPill: {
      paletteLabel: 'Komponente hinzufügen',
      paletteDropToRemove: 'Hier ablegen zum Entfernen',
      paletteHint: 'Ziehen Sie eine Komponente auf einen Bereich, um eine weitere Instanz mit eigenen Einstellungen einzufügen.',
      dragHandle: 'Zum Verschieben ziehen',
      duplicate: 'Duplizieren',
      removeDuplicate: 'Duplikat entfernen'
    }
  },
  styles: {
    tabs: {
      basics: 'Basis',
      theme: 'Community-Themes',
      variables: 'Variablen',
      customCss: 'Eigenes CSS'
    },
    cascade: {
      themeActive:
        'Reihenfolge: Basis → Community-Theme → Variablen → eigenes CSS. Das Theme „{{themeId}}" ist aktiv und überschreibt die Basisfarben.',
      themeInactive:
        'Reihenfolge: Basis → Community-Theme → Variablen → eigenes CSS. Kein Community-Theme aktiv — es gelten deine Basis-Farben und -Schriften.',
      overrides: '{{count}} Variable(n) überschrieben.'
    },
    scssStale:
      'custom.scss wurde inzwischen von einem anderen Tab geändert (Variablen-Überschreibung oder Font-Import). Dein Entwurf hier ist noch ungespeichert — Speichern würde diese Änderung überschreiben.',
    scssStaleReload: 'Von Festplatte neu laden (Entwurf verwerfen)',
    styleSettings: {
      sourceNote:
        'Beschreibungen aus dem Original-Theme „{{theme}}" von {{author}} — {{count}} Optionen.',
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
        'Alles, was das Theme „{{themeId}}", Plugins oder der letzte Build mitbringen: {{count}} Variablen. Suche eingeben, um darin zu blättern.',
      counter: '{{overridden}} von {{total}} überschrieben',
      searchPlaceholder: 'Variable suchen (z.B. callout, h1, background)…',
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
        'Das Community-Theme „{{themeId}}" liefert seine Variablen in @layer aus, deine Werte hier landen ungelayert in custom.scss — ungelayerte Regeln gewinnen immer. Geprüft an einem echten Build (hell und dunkel). Nur Variablen, die ein Theme ausschließlich innerhalb eines Selektors setzt (z.B. .callout[data-callout]), lassen sich hier nicht global überschreiben.',
      section: {
        current: 'Aktueller Wert',
        origin: 'Herkunft',
        uses: 'Verwendet diese Variablen',
        dependents: 'Wird von diesen Variablen verwendet',
        edit: 'Eigener Wert'
      },
      origin: {
        core: 'Quartz-Kern',
        theme: 'Theme',
        build: 'Build',
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
      namePlaceholder: 'Dateiname (z.B. typografie)',
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
      recheck: 'Erneut prüfen',
      checkActive: 'Code prüfen',
      running: 'Prüfe…',
      unavailable: 'SCSS-Prüfung nicht möglich: {{reason}}'
    },
    current: {
      colors: 'Aktuell geltende Farben (hell / dunkel)',
      fonts: 'Aktuell geltende Schriften',
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
          google: 'Das Plugin „Fonts" lädt bei jedem Seitenaufruf von Google Fonts.',
          selfHosted: 'Das Plugin „Fonts" lädt beim Build und liefert die Dateien selbst aus.'
        },
        theme: {
          cdn: 'Das Community-Theme lädt seine eigenen Schriften bei jedem Seitenaufruf von unpkg.com.'
        }
      }
    },
    cssVars: {
      heading: 'Verfügbare CSS-Variablen',
      description:
        'Diese Variablen sind an dieser Stelle nutzbar (z.B. var(--text-normal)). Die Werte zeigen den aktuellen Stand aus der Basis-Ebene, hell/dunkel.',
      goToVariables: 'Variablen überschreiben →',
      searchPlaceholder: 'Variable suchen…',
      insertHint: 'Klicken, um die Variable an der Cursor-Position einzufügen.',
      rowHint: 'Name anklicken fügt var(--name) ein, Farbfeld anklicken kopiert den Wert.',
      copyHint: 'Klicken, um {{value}} zu kopieren',
      copyValue: 'Wert kopieren',
      discoveredGroup: 'Im Build-Output gefunden',
      noResults: 'Keine Treffer.',
      calloutsHeading: 'Callout-Farben',
      calloutsDescription:
        'Jeder Callout-Typ ([!note], [!warning], …) hat eigene --color/--border/--bg-Variablen — aber nur innerhalb von .callout[data-callout="…"] gültig, kein globales var(--color). Klick fügt das passende Grundgerüst mit den echten Werten ein.',
      calloutsInsertHint: 'Klicken, um das Override-Grundgerüst für diesen Callout-Typ einzufügen.'
    }
  },
  localization: {
    title: 'Übersetzungen',
    description:
      'Bearbeitet die eingebauten Übersetzungstexte von Quartz direkt in quartz/i18n/locales/*.ts. Nur Kern-Texte — eigene Plugin-Texte werden hier nicht erfasst.',
    none: 'Keine Locale-Dateien gefunden (quartz/i18n/locales fehlt).',
    searchPlaceholder: 'Nach Schlüssel oder Text suchen…',
    unsavedCount: '{{count}} ungespeichert',
    saveError: 'Speichern fehlgeschlagen.',
    noResults: 'Keine Treffer.',
    advancedBadge: 'JS',
    gitAttributesOk: 'Update-Schutz aktiv (.gitattributes: merge=ours)',
    gitAttributesMissing: 'Update-Schutz wird beim nächsten Speichern automatisch aktiviert'
  },
  updates: {
    title: 'Updates',
    description: 'Quartz-Kern und installierte Plugins auf den neuesten Stand bringen. Vor jedem Kern-Update wird automatisch ein wiederherstellbarer Snapshot angelegt.',
    upToDate: 'Aktuell',
    updateAvailable: 'Update verfügbar',
    core: {
      heading: 'Quartz-Kern',
      commits: 'Installiert: {{current}} · Neueste Version: {{latest}}',
      runUpdate: 'Update durchführen',
      confirm:
        'Quartz-Kern aktualisieren? Ein Snapshot wird zuerst automatisch angelegt. Der Vorgang holt Änderungen von jackyzha0/quartz, führt npm install aus und kann bei Konflikten manuelles Eingreifen erfordern.',
      abortMerge: 'Merge abbrechen',
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
      description: 'Automatisch vor jedem Kern-Update angelegt. Wiederherstellen setzt das Projekt komplett auf diesen Stand zurück (verwirft spätere Änderungen).',
      none: 'Noch keine Snapshots vorhanden.',
      restore: 'Wiederherstellen',
      confirmRestore: 'Projekt auf Snapshot "{{tag}}" zurücksetzen? Alle Änderungen seitdem gehen verloren.'
    }
  },
  publish: {
    title: 'Veröffentlichen',
    description: 'Baut das Projekt und lädt nur geänderte Dateien zu SFTP/FTP oder GitHub Pages hoch.',
    baseUrlWarning: 'configuration.baseUrl steht noch auf "{{baseUrl}}" — vor dem Veröffentlichen auf die echte Domain setzen.',
    targetHeading: 'Ziel',
    githubPages: 'GitHub Pages',
    githubBranch: 'Branch',
    githubPagesHint: 'Nutzt das bereits konfigurierte "origin"-Remote (dasselbe wie bei Git-Sync).',
    newConnection: '+ Neue Verbindung',
    noSecretWarning: '(kein Passwort/Key hinterlegt)',
    hostKeyPinned: 'Host-Key bestätigt',
    hostKeyUnknown: 'Host-Key noch nicht bestätigt — wird beim ersten Verbinden abgefragt',
    forgetHostKey: 'Host-Key vergessen',
    confirmForgetHostKey:
      'Gespeicherten Host-Key für {{host}} verwerfen?\n\nBeim nächsten Verbinden wird der Fingerprint erneut abgefragt. Nur tun, wenn der Server nachweislich neu aufgesetzt wurde.',
    ftpPlaintextWarning: 'FTP überträgt Passwort und Dateien im Klartext. Ohne FTPS kann jeder im selben Netz mitlesen — falls dein Anbieter es unterstützt, unbedingt aktivieren (oder besser SFTP nutzen).',
    confirmDeleteConnection: 'Diese Verbindung wirklich löschen?',
    confirmDeployGithubPages:
      'Veröffentlichen nach GitHub Pages?\n\nDer Branch "{{branch}}" wird dabei vollständig durch den aktuellen Build ersetzt (force-push).',
    confirmDeployConnection:
      'Nach {{target}} veröffentlichen?\n\n{{uploads}} Datei(en) werden hochgeladen, {{deletions}} Datei(en) werden auf dem Server gelöscht.',
    connectionForm: {
      heading: 'Verbindung',
      name: 'Name',
      protocol: 'Protokoll',
      host: 'Host',
      port: 'Port',
      username: 'Benutzername',
      remotePath: 'Remote-Pfad',
      authMethod: 'Authentifizierung',
      authPassword: 'Passwort',
      authPrivateKey: 'Privater Schlüssel',
      secure: 'FTPS (verschlüsselt)',
      password: 'Passwort',
      privateKey: 'Privater Schlüssel (Inhalt)',
      secretUnchangedPlaceholder: 'unverändert lassen'
    },
    outputDir: 'Ausgabeverzeichnis',
    outputDirPlaceholder: 'Standard: public/ im Projekt',
    diffHeading: 'Änderungen',
    buildNow: 'Jetzt bauen',
    refreshDiff: 'Diff aktualisieren',
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
    description: 'Exportiert Layout, Farben, Plugins, Frames, Styles und Schriften als wiederverwendbares Template-Paket — auch teilweise.',
    exportHeading: 'Exportieren',
    nameLabel: 'Name',
    categoriesHeading: 'Enthaltene Kategorien',
    categories: {
      layout: 'Layout',
      colors: 'Farben (inkl. CSS-Variablen)',
      plugins: 'Plugins',
      frames: 'Eigene Frames',
      styles: 'Styles (custom.scss)',
      fonts: 'Schriften'
    },
    pickDestDir: 'Zielordner wählen…',
    exportButton: 'Paket exportieren',
    exportSuccess: 'Paket exportiert nach: {{path}}',
    importHeading: 'Importieren',
    pickSourceDir: 'Paket-Ordner wählen…',
    previewError: 'Kein gültiges Template-Paket in diesem Ordner gefunden (keine manifest.json).',
    previewHeading: 'Paket: {{name}} — verfügbare Kategorien ankreuzbar, fehlende sind ausgegraut.',
    importButton: 'Ausgewählte Kategorien importieren',
    confirmImport: '{{count}} Kategorie(n) wirklich importieren? Vorhandene Plugins/Frames/Dateien werden dabei übersprungen, nicht überschrieben.',
    importSuccessNoWarnings: 'Import abgeschlossen, keine Konflikte.'
  },
  pluginsMarketplace: {
    title: 'Marktplatz',
    description: 'Durchsucht Plugins, die die Community auf GitHub veröffentlicht hat — zusätzlich zu den mitgelieferten.',
    backToInstalled: '← Installierte Plugins',
    searchPlaceholder: 'Plugins durchsuchen…',
    installed: 'Installiert',
    installing: 'Installiere…',
    install: 'Installieren',
    noResults: 'Keine Ergebnisse.',
    installedMessage: '{{name}} installiert.'
  },
  logConsole: {
    noOutput: 'Noch keine Ausgabe.',
    clear: 'Ausgabe leeren'
  }
} as const
