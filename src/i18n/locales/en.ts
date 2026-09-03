export default {
  common: {
    back: 'Back',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved.',
    cancel: 'Cancel',
    close: 'Close',
    select: 'Select',
    copy: 'Copy',
    remove: 'Remove',
    edit: 'Edit',
    loading: 'Loading…',
    openInBrowser: 'Open in browser',
    viewSwitcher: 'View',
    copied: 'Copied — {{value}}',
    serverState: {
      stopped: 'Stopped',
      starting: 'Starting…',
      running: 'Running',
      stopping: 'Stopping…',
      error: 'Error'
    }
  },
  // The seven places a component can sit on a page. One table, read by the Layout editor and by
  // the plugin list - they used to have a copy each, with different words for the same slot.
  positions: {
    header: 'Header',
    left: 'Left sidebar',
    right: 'Right sidebar',
    beforeBody: 'Before the content',
    afterBody: 'After the content',
    footer: 'Footer',
    body: 'In the content',
    pageBody: 'Page content'
  },
  errors: {
    renderFailed: 'This view could not be displayed.',
    retry: 'Try again'
  },
  devServer: {
    staleHint: 'The running dev server will not show this change until it restarts.',
    restart: 'Restart dev server',
    restarting: 'Restarting…',
    restarted: 'Dev server restarted'
  },
  home: {
    subtitle: 'Your Quartz sites in one place — set up, design, publish.',
    settings: 'Settings',
    openExisting: 'Open existing project',
    createNew: 'Create new project',
    searchPlaceholder: 'Search projects…',
    noSearchResults: 'No project matches your search.',
    lastOpened: 'Last opened {{when}}',
    neverOpened: 'Never opened',
    serverRunning: 'Dev server running',
    serverRunningOnPort: 'Dev server on port {{port}}',
    folderMissing: 'Folder not found — moved, renamed, or on a volume that is not mounted.',
    notAQuartzProject: 'Not a Quartz project — this folder has no quartz.config.yaml.',
    locateFolder: 'Locate folder…',
    confirmRemove: 'Remove “{{name}}” from the list?\n\nThe folder on disk is left untouched.',
    confirmRemoveAction: 'Remove from list',
    confirmRemoveRunning:
      'Remove “{{name}}” from the list?\n\nIts running dev server will be stopped. The folder on disk is left untouched.',
    environment: {
      titleProblem: 'These tools are missing',
      description: 'Without them builds, new projects, plugins from a git source and snapshots all fail.',
      missing: 'not found',
      brokenTool: 'found, but does not run',
      embeddedBroken:
        'These tools are part of the app. If they cannot run, this installation is incomplete — reinstalling the app is the quickest fix.',
      bundled: 'in the app',
      fromSystem: 'from the system',
      recheck: 'Check again',
      ready: 'Tools ready',
      secretsBackend: 'Credentials encrypted via {{backend}}',
      secretsTitle: 'Credentials are stored unencrypted',
      secretsBody:
        'No keyring is running on this system, so Electron stores passwords and tokens with a hardcoded key ({{backend}}) — effectively plaintext. Running gnome-keyring or KWallet protects them properly.',
      secretsUnavailable:
        'No encryption is available on this system, so connections with a password or token cannot be saved.'
    },
    gettingStarted: {
      title: 'Getting started',
      description: 'QuartzControl manages Quartz projects: a folder full of Markdown files becomes a finished website.',
      step1: 'Create a new project, or open a folder where Quartz is already set up.',
      step2: 'Link the content folder to your notes — an Obsidian vault works directly.',
      step3: 'Start the preview, design the site to your taste, and publish it.'
    },
    capabilities: {
      title: 'What you can do here',
      setup: {
        title: 'Setup',
        body: 'Set the site’s title, address and language, install plugins from the marketplace, and link the content folder to your Obsidian vault.'
      },
      design: {
        title: 'Design',
        body: 'Adjust colours, fonts and CSS variables, install community themes, write your own CSS, and build layout frames yourself.'
      },
      publish: {
        title: 'Publishing',
        body: 'Build locally and check the preview, sync via Git, and publish to GitHub Pages, SFTP, rsync or a web space.'
      },
      maintenance: {
        title: 'Maintenance',
        body: 'Update the Quartz core and your plugins, take snapshots, and restore single files or the whole project.'
      }
    },
    aboutQuartz: {
      title: 'What is Quartz?',
      body: 'Quartz 5 is a static site generator for linked notes: Markdown in, finished website out — with backlinks, a graph view and full-text search. It understands Obsidian wikilinks, so you can publish your vault directly.',
      docs: 'Quartz documentation',
      catalog: 'Plugin catalogue on GitHub'
    },
    wizard: {
      title: 'New Quartz project',
      intro:
        'QuartzControl creates a new folder and downloads Quartz from GitHub into it. The folder must not exist yet — it is created for you. This takes a minute or two, because the dependencies are installed along the way.',
      parentDirectory: 'Where should the project live?',
      parentDirectoryHint:
        'An existing parent folder — “Documents”, for example. A new folder with the name below is created inside it.',
      parentDirectoryPlaceholder: '/Users/you/Documents',
      projectName: 'Name of the project folder',
      projectNameHint:
        'The folder name only, not the title of the site — you set that later under Configuration. Lowercase letters and hyphens are the easiest choice.',
      projectNamePlaceholder: 'my-notes',
      targetPreview: 'Will be created:',
      nameInvalid: 'The name must not contain “/” and cannot be “.” or “..”.',
      template: 'Template',
      templateHint:
        'Decides which example pages and which starting settings the project comes with. “default” is the normal starting point; everything about it can be changed later.',
      contentStrategy: 'Where do the notes come from?',
      contentStrategyHint:
        'Linking leaves the notes where they are — in your Obsidian vault, for example — and copies nothing. Copying creates a second, independent collection. This can be changed later too.',
      strategyNew: 'Start fresh (empty content folder)',
      strategyCopy: 'Copy existing notes',
      strategySymlink: 'Point at existing notes (symbolic link)',
      sourceFolder: 'Source folder (e.g. an Obsidian vault)',
      sourceFolderHint: 'The folder your Markdown files live in.',
      linkResolution: 'How are your [[wikilinks]] written?',
      linkResolutionHint:
        'This has to match your notes, or the links will not find their target. Obsidian uses the shortest form by default.',
      linkShortest: 'Shortest form (like Obsidian)',
      linkAbsolute: 'Absolute (from the root folder)',
      linkRelative: 'Relative (from the current note)',
      baseUrl: 'Base URL',
      baseUrlHint:
        'The address the site will be reachable at later — without https://. If you do not know it yet, leave “localhost” and fill it in later under Configuration.',
      creating: 'Creating… (cloning and npm install take a minute or two)',
      create: 'Create project',
      createFailed: 'The project could not be created.'
    }
  },
  projectLayout: {
    unsavedLeave: 'Discard changes',
    unsavedSave: 'Save',
    unsavedWarning:
      'This page has changes that are not saved yet. Leaving discards them. Switch anyway?',
    unsavedWarningWithSave: 'This page has changes that are not saved yet. What should happen to them?',
    unsavedBadge: 'Unsaved',
    allProjects: 'All projects',
    navLabel: 'Project areas',
    loading: 'Loading project…',
    tabs: {
      overview: 'Overview',
      config: 'Configuration',
      layout: 'Layout',
      styles: 'Styles',
      plugins: 'Plugins',
      updates: 'Updates',
      server: 'Preview & build',
      sync: 'Git sync',
      backups: 'Backups',
      publish: 'Publish',
      templates: 'Templates'
    },
    groups: {
      setup: 'Setup',
      design: 'Design',
      publish: 'Publishing',
      maintenance: 'Maintenance'
    },
    descriptions: {
      overview: 'The overview for this project: server status, key settings, and quick links to every area.',
      layout: 'Decides which building blocks (e.g. search, table of contents, navigation) appear where on the page.',
      styles:
        'Everything about the look in one place: base colors and fonts, community themes, CSS variables, and your own CSS — in the exact order they override each other.',
      updates:
        'Brings Quartz’s core and the installed plugins up to date. A snapshot is taken automatically before every update, so you can go back to that state under Backups.',
      server: 'Previews your site locally, and can produce a one-off build for export.',
      sync: 'Syncs your local changes with the Git repository: uploading (push) and downloading (pull).',
      backups:
        'Snapshots of your whole project — taken automatically before every major change, triggerable yourself at any time, comparable and restorable file by file.'
    }
  },
  dashboard: {
    attention: {
      title: 'Needs attention',
      allGood: 'Nothing to do — content, git, CSS and configuration are all fine.',
      serverError: 'The dev server exited with an error',
      contentTargetMissing: 'The content folder points nowhere',
      contentMissing: 'There is no content folder',
      gitConflicts: '{{count}} file in conflict',
      gitConflicts_other: '{{count}} files in conflict',
      gitConflictsDetail: 'Nothing can be pushed until the conflict is resolved.',
      gitInProgress: 'A {{operation}} was started and never finished',
      scssError: 'Your CSS does not compile',
      line: 'line {{line}}',
      noBaseUrl: 'No base URL set',
      noBaseUrlDetail: 'Without it the build fails as soon as fonts are self-hosted.'
    },
    contentTab: 'Content',
    devServer: 'Dev server',
    noPreview: 'No preview running',
    startedAgo: 'Started {{since}}',
    serverIdleHint: 'Starts the local preview of your site.',
    start: 'Start',
    stop: 'Stop',
    restart: 'Restart',
    site: 'The site',
    pageTitle: 'Title',
    baseUrl: 'Base URL',
    notSet: 'not set',
    locale: 'Language',
    contentFolder: 'Content',
    notPresent: 'not present',
    targetMissing: 'target missing',
    realFolderFiles: 'Own folder · {{count}} file',
    realFolderFiles_other: 'Own folder · {{count}} files',
    openProjectFolder: 'Open project folder',
    git: {
      inProgress: '{{operation}} in progress',
      noRepo: 'Not a git repository',
      noRepoHint: 'This project is not under version control.',
      noUpstream: 'no remote branch',
      conflicts: '{{count}} file in conflict',
      conflicts_other: '{{count}} files in conflict',
      uncommitted: 'uncommitted changes'
    },
    plugins: {
      ofTotal: 'of {{total}} enabled',
      disabled: '{{count}} disabled',
      allEnabled: 'All enabled'
    },
    design: {
      stockTheme: 'Quartz default',
      frames: '{{count}} own frame',
      frames_other: '{{count}} own frames',
      stylesheets: '{{count}} stylesheet',
      stylesheets_other: '{{count}} stylesheets',
      cssOk: 'CSS compiles',
      cssError: 'CSS error',
      cssUnchecked: 'CSS unchecked'
    },
    build: {
      title: 'Build',
      never: 'Never built',
      neverHint: 'There is no build output yet.',
      files: '{{count}} file',
      files_other: '{{count}} files',
      run: 'Run build',
      running: 'Building…',
      done: 'Build finished.',
      failed: 'Build failed — the output is on Preview & build.'
    },
    publish: {
      targets: 'target',
      targets_other: 'targets',
      none: 'No target',
      noneHint: 'No publishing target set up yet.'
    },
    updates: {
      checking: 'Checking for updates…',
      coreBehind: 'Core out of date',
      pluginsOnly: 'Plugins outdated',
      allCurrent: 'All up to date',
      unknown: 'Cannot check',
      pluginsBehind: '{{count}} plugin outdated',
      pluginsBehind_other: '{{count}} plugins outdated',
      pluginsCurrent: '{{count}} plugin checked',
      pluginsCurrent_other: '{{count}} plugins checked',
      checkFailed: '{{count}} check failed',
      checkFailed_other: '{{count}} checks failed'
    },
    backups: {
      states: 'snapshot',
      states_other: 'snapshots',
      newest: 'Last {{when}}',
      none: 'None yet',
      noneHint: 'One is created automatically before every major change.',
      save: 'Take snapshot',
      saving: 'Saving…'
    }
  },
  content: {
    currentFolder: 'Current content folder',
    loading: 'Loading…',
    noFolder: 'No content/ folder found.',
    symlinkBadge: 'Symbolic link',
    realFolderBadge: 'Real folder',
    filesCount: '{{count}} files',
    targetMissingSuffix: ' (target does not exist)',
    changeSource: 'Change source…',
    dialogTitle: 'Change content source',
    dialogWarning:
      'The current content/ folder is moved to .quartz-gui/content-backups/ before the change and can be restored from the Backups view.',
    newSourceFolder: 'New source folder',
    strategy: 'Strategy',
    strategySymlink: 'Link (symbolic link, e.g. to an Obsidian vault)',
    strategyCopy: 'Copy (real folder)',
    progress: '{{processed}} / {{total}} files copied…',
    applying: 'Applying…',
    apply: 'Apply'
  },
  buildServer: {
    devServer: 'Dev server',
    devServerHint: 'Shows your site live in the browser, reloading automatically on changes — great for trying things out.',
    oneOffBuildHint: 'Produces the finished HTML files once, e.g. to upload manually or check before you publish.',
    port: 'Port',
    wsPort: 'WS port',
    remoteDevHost: 'Remote dev host (optional)',
    remoteDevHostPlaceholder: 'only for tunnel/remote preview',
    start: 'Start',
    restart: 'Restart',
    stop: 'Stop',
    serverOptions: 'Server settings',
    optionsLocked: 'Stop the server to change these.',
    autoReload: 'reloads automatically',
    startedAgo: 'Started {{since}}',
    exitedWithCode: 'The server exited unexpectedly (code {{code}}).',
    exitedUnexpectedly: 'The server exited unexpectedly.',
    livePreview: 'Live preview',
    reloadPreview: 'Reload preview',
    viewport: {
      label: 'Preview width',
      desktop: 'Desktop',
      tablet: 'Tablet',
      mobile: 'Mobile',
      full: 'full width'
    },
    oneOffBuild: 'One-off build',
    serverLogLabel: 'Preview server output',
    buildLogLabel: 'Build output',
    building: 'Building…',
    buildNow: 'Build now',
    lastBuilt: 'Last built {{when}}',
    neverBuilt: 'Never built',
    outputFiles: '{{count}} file',
    outputFiles_other: '{{count}} files',
    openFolder: 'Open folder',
    exportDir: 'Output folder (optional)',
    exportDirPlaceholder: 'Default: public/ in the project',
    exportDirShared: 'Also used by Publish — the upload comes from the same folder.',
    exportDirWipes: 'Every build empties this folder first.',
    exportDirForeign:
      'Careful: this folder holds {{count}} files that do not look like a build. The next build deletes them for good.',
    reset: 'Reset',
    success: 'Successful',
    failed: 'Failed',
    resultLine: '{{status}} in {{seconds}}s'
  },
  gitSync: {
    title: 'Git sync',
    explainer:
      'Every sync first commits your changes (when enabled below), then fetches the branch “{{branch}}” from origin and pushes your current branch — as a force push, which is what the Quartz CLI does.',
    commitChanges: 'Commit changes first',
    commitMessage: 'Commit message (optional)',
    commitMessagePlaceholder: 'Default: “Quartz sync: <date>”',
    commitHint: '{{count}} local change goes into the commit.',
    commitHint_other: 'All {{count}} local changes go into a single commit.',
    commitHintClean: 'There is nothing to commit right now.',
    noCommitHint: 'Without a commit, only the already committed state is pushed or fetched.',
    pullBranchWarning:
      'Pull always fetches the branch “{{source}}” from origin, no matter which branch is checked out here (“{{branch}}”). On any other branch the pull either fails or merges in something unrelated.',
    openOnGithub: 'Open on GitHub',
    pull: 'Pull',
    pullRunning: 'Pull running…',
    push: 'Push',
    pushRunning: 'Push running…',
    both: 'Push + pull',
    bothRunning: 'Sync running…',
    success: 'Successful.',
    failed: 'Failed.',
    createRepo: {
      title: 'Create a repository on GitHub',
      asAccount: 'Created under the account “{{login}}” and wired up as “origin”.',
      noToken: 'This needs a GitHub token with the “repo” scope — add one in the settings.',
      name: 'Repository name',
      private: 'Private',
      privateHint:
        'GitHub Pages is only available for private repositories on the paid plans. To publish the site through GitHub Pages on a free account the repository has to be public — visibility can be changed on GitHub later.',
      action: 'Create'
    },
    statusTitle: 'Repository state',
    notARepo: 'This project is not a git repository — syncing is not possible here.',
    noRemote: 'No “origin” remote configured. Push and pull have no target.',
    detached: 'No branch checked out',
    detachedHint:
      'This project currently sits on a single commit rather than on a branch (“detached HEAD”). Push and pull have no target that way — check out a branch with git checkout before syncing.',
    noUpstream: 'No upstream',
    noUpstreamHint: 'This branch has no counterpart on the server, so there is no way to say how many commits are missing. The first push creates it.',
    upToDate: 'Up to date with the remote',
    ahead: '{{count}} commit not pushed yet',
    ahead_other: '{{count}} commits not pushed yet',
    behind: '{{count}} commit not fetched yet',
    behind_other: '{{count}} commits not fetched yet',
    clean: 'No local changes',
    changes: '{{count}} local change',
    changes_other: '{{count}} local changes',
    conflicts: '{{count}} conflict',
    conflicts_other: '{{count}} conflicts',
    moreChanges: '… and {{count}} more',
    lastCommit: 'Last commit',
    abortMerge: 'Abort merge',
    refresh: 'Refresh',
    inProgress: {
      merge: 'A merge has been started and is not finished.',
      rebase: 'A rebase has been started and is not finished.',
      'cherry-pick': 'A cherry-pick has been started and is not finished.',
      revert: 'A revert has been started and is not finished.'
    },
    fileStatus: {
      added: 'new',
      modified: 'modified',
      deleted: 'deleted',
      renamed: 'renamed',
      copied: 'copied',
      untracked: 'untracked',
      conflicted: 'conflict'
    },
    staged: 'staged'
  },
  backups: {
    vsGitSync:
      'A snapshot is a copy of this project that only this app knows about: it lives inside the project under .quartz-gui/, is never uploaded, and does not touch your own git history. Git sync is for sharing — your work ends up on GitHub and from there on other machines. A snapshot is for going back — it restores an earlier state on this machine, even if the project is not a git repository at all.',
    newHeading: 'New snapshot',
    newHint:
      'A snapshot captures everything that is yours in this project: the configuration, the plugin lockfile, layout frames, your own stylesheets, translations and publish targets. Not included are node_modules, the build folder and installed plugin files — the next build produces those anyway.',
    labelPlaceholder: 'Name (optional), e.g. “before switching themes”',
    create: 'Take snapshot',
    created: 'Snapshot taken.',
    includeContent: 'Include the content folder',
    contentFolderHint: 'A real folder of markdown files — small enough to always come along.',
    contentSymlinkHint:
      'Your content folder is a symlink to a vault outside the project. It is NOT included by default: it is your own primary data, it can be very large, and it usually has a backup of its own. Only turn this on if you know what you are doing.',
    contentMissing: 'There is no content folder to include.',
    none: 'No snapshots yet. One is taken automatically before every core update, plugin change, content switch and template import.',
    compare: 'Compare',
    close: 'Close',
    comparing: 'Comparing with the current state…',
    identical: 'No differences from the current state.',
    changeCount: '{{count}} file differs',
    changeCount_other: '{{count}} files differ',
    noDiff: 'No text difference (a binary file, for instance).',
    restoreAll: 'Restore everything',
    restoreSelected: 'Restore selection ({{count}})',
    restore: 'Restore',
    restored: 'Restored.',
    export: 'Export as ZIP',
    exported: 'Snapshot exported.',
    delete: 'Delete',
    confirmDeleteAction: 'Delete snapshot',
    confirmDelete: 'Delete this snapshot permanently?',
    confirmRestoreAction: 'Restore',
    confirmRestoreAll:
      'Reset the whole project to this snapshot?\n\nFiles that did not exist back then will be deleted. A snapshot of the current state is taken first.',
    confirmRestoreFiles:
      'Reset {{count}} selected file(s) to this snapshot?\n\nA snapshot of the current state is taken first.',
    resetProjectHead: 'Also reset the project commit to {{commit}}',
    resetProjectHeadHint:
      'Also rewinds the project’s git history — needed when undoing a core update, or the Updates page will keep reporting the new state. If you have already pushed that commit, your local state will diverge from the remote afterwards.',
    status: {
      modified: 'changed',
      addedSince: 'new since',
      removedSince: 'deleted since'
    },
    kinds: {
      manual: 'Yours',
      configChange: 'Before config change',
      coreUpdate: 'Before core update',
      pluginChange: 'Before plugin change',
      contentChange: 'Before content switch',
      restore: 'Before restore',
      styleChange: 'Before template import',
      imported: 'Old config backup'
    },
    movedFoldersHeading: 'Set-aside content folders',
    movedFoldersHint:
      'When the content source is switched, the previous folder is moved here rather than deleted. This is not a backup of your notes: a symlink to a vault was never copied, only the link itself recorded.',
    confirmRestoreFolderAction: 'Put folder back',
    confirmRestoreFolder: 'Put this content folder back? The current one is set aside as well.',
    confirmDeleteFolderAction: 'Delete folder',
    confirmDeleteFolder:
      'Delete this set-aside content folder for good ({{size}})?\n\nIt is the only copy: snapshots do not contain it, and this cannot be undone.',
    folderSize: '{{count}} file · {{size}}',
    folderSize_other: '{{count}} files · {{size}}',
    folderLink: 'Only the link to {{target}} — the notes live there and were never copied.'
  },
  settings: {
    title: 'Settings',
    subtitle: 'These apply to the whole app — per-project settings live inside each project.',
    githubTokenStored: 'stored — type a new one to replace it',
    defaultProjectDirectory: 'Default project directory',
    language: 'Language',
    languageSystem: 'Follow system language',
    languageDe: 'Deutsch',
    languageEn: 'English',
    appearance: {
      title: 'Appearance',
      description: 'How the app looks, and which language it speaks to you in.',
      theme: 'Theme',
      themeLight: 'Light',
      themeDark: 'Dark',
      themeSystem: 'System setting',
      appliedImmediately: 'Theme and language apply and save immediately.'
    },
    projects: {
      title: 'Projects',
      description: 'Where the folder dialogs start when you open or create a project.',
      mustBeAbsolute: 'That is not a full path. It has to start with “/” or “~/” — or pick the folder instead.'
    },
    github: {
      title: 'GitHub',
      description:
        'Raises the rate limit in the plugin and theme marketplaces, and is required to create repositories and configure GitHub Pages.',
      token: 'Personal access token',
      saveAndCheck: 'Save & check',
      valid: 'Valid',
      rejected: 'Rejected',
      rejectedHint: 'GitHub does not accept this token — expired or revoked.',
      checking: 'Checking…',
      unknown: 'Cannot check',
      unknownHint: 'GitHub could not be reached — whether the token is valid is unknown.',
      recheck: 'Check again',
      remove: 'Remove token',
      scopeHint:
        'For the marketplace a token with no permissions at all is enough. Creating repositories and configuring GitHub Pages needs the “repo” scope. The token is stored encrypted in your system keychain.'
    },
    connections: {
      title: 'Connections',
      description:
        'Server logins and build hooks used for publishing. They belong to the app, not to a project — one web space commonly carries several sites, and rotating a password is then one edit instead of one per project.',
      empty: 'No connections yet.',
      addSsh: '+ SFTP / SSH',
      addFtp: '+ FTP',
      addWebhook: '+ Webhook',
      noSecret: 'no password/key',
      plaintext: 'unencrypted',
      usedBy_one: 'used by {{count}} project',
      usedBy_other: 'used by {{count}} projects',
      confirmDelete: 'Delete this connection?\n\nThe stored password or key is deleted with it and cannot be recovered.',
      confirmDeleteAction: 'Delete connection',
      confirmDeleteInUse_one:
        'This connection is used by {{count}} project.\n\nAfter deleting it, that project’s publish target points nowhere. Delete anyway?',
      confirmDeleteInUse_other:
        'This connection is used by {{count}} projects.\n\nAfter deleting it, those projects’ publish targets point nowhere. Delete anyway?',
      targetHint:
        'Where exactly a project publishes to — remote path, branch, exclusions — is set inside that project under “Publish”.'
    },
    runtime: {
      title: 'Runtime',
      description: 'What the app runs Quartz and npm with.',
      label: 'Node runtime',
      embedded: 'In the app',
      system: 'From the system',
      inUseEmbedded: 'In use: Node {{node}} and npm {{npm}} from the app — nothing has to be installed for it.',
      inUseSystem: 'In use: Node {{node}} from this machine.',
      noSystemNode: 'not found',
      hintSwitchable: 'This machine has Node {{node}}. Switching only pays off when a package has to be compiled during install (node-gyp) — that needs real Node headers, which the app does not carry.',
      hintNoHostNode: 'No Node was found on this machine, so “From the system” would make builds, plugins and new projects fail.',
      hintSystem: 'Quartz requires Node 22 or newer. A project also ships a .node-version, and nvm, fnm, asdf and mise resolve that per folder — so the runtime here can differ from project to project.',
      gitBundled: 'git {{version}} from the app — this machine has none, so QuartzControl brings one.',
      gitHost: 'git {{version}} from this machine. The app carries one too but only uses it when there is none — so your own setup (~/.gitconfig, credential helpers) keeps applying.',
      gitLicense: 'git is licensed under the GPL v2; the full licence text ships with the app.',
      gitSource: 'View source',
      appliesToNewProcesses: 'Applies to processes started afterwards. A running dev server keeps its environment until it is restarted.'
    },
    maintenance: {
      title: 'Data & maintenance',
      description: 'What the app stores outside your projects.',
      cache: 'Theme documentation',
      cacheSize_one: '{{count}} entry · {{size}}',
      cacheSize_other: '{{count}} entries · {{size}}',
      cacheHint:
        'Labels and descriptions for community theme options, fetched from GitHub once and kept permanently. Clearing forces a fresh fetch.',
      clearCache: 'Clear cache',
      clearing: 'Clearing…',
      storage: 'Storage location',
      storageHint: 'Holds the project list, the settings, and the encrypted connections.',
      reveal: 'Show in Finder',
      unreadableTitle: 'A saved file could not be read',
      unreadableHint:
        'QuartzControl found one of its own files unreadable — most likely because the app was killed while saving it. It was moved aside instead of overwritten, so its contents are still on disk. Whatever it held (connections, the project list) is missing from the app and has to be set up again.'
    }
  },
  configEditor: {
    tabs: {
      site: 'Site',
      content: 'Content folder',
      localization: 'Localization'
    },
    descriptions: {
      site: 'Basic settings for your site — title, address, and language.',
      content: 'The folder with your Markdown notes — as a real copy, or linked to an existing folder, e.g. your Obsidian vault.',
      localization:
        'The site’s built-in text labels (e.g. “Search”, “Last modified”) in the available languages. Core texts only — plugin texts are not covered here.'
    },
    loadError: 'quartz.config.yaml could not be read.',
    loadErrorHint:
      'Does the file exist in the project folder? A newly created project needs a successfully completed setup wizard for this.',
    loading: 'Loading configuration…',
    themeMoved:
      'Colors and fonts have moved to Styles — there they form the base layer that themes, variables, and custom CSS build on.',
    themeMovedLink: 'Go to Styles'
  },
  projectImage: {
    label: 'Project image',
    choose: 'Choose image…',
    replace: 'Replace image…',
    remove: 'Remove image',
    fileFilter: 'Images (PNG, JPEG)',
    defaultHint:
      'Without an image of its own the app shows the initial, and the site gets the default Quartz icon. PNG or JPEG, square works best.',
    customHint: 'Stored as quartz/static/icon.png in the project, {{width}} × {{height}} pixels.',
    faviconOn: "The site's favicon is generated from this image on the next build.",
    faviconOff: 'The favicon plugin is switched off — no favicon is generated from this image.',
    faviconMissing: 'The favicon plugin is not installed — no favicon is generated from this image.',
    faviconLink: 'Go to Plugins',
    announceSet: 'Project image set.',
    announceCleared: 'Project image removed, the original icon is back.'
  },
  siteSettings: {
    pageTitle: 'Site title',
    pageTitleHint: 'The name of your site. It appears in the browser tab, in the RSS feed and usually at the top of the sidebar.',
    pageTitleSuffix: 'Title suffix',
    pageTitleSuffixHint: 'Appended after each page’s own title in the browser tab, e.g. “ · My wiki”. It does not appear on the page itself.',
    baseUrl: 'Base URL',
    baseUrlHint:
      'The address the site will be reachable at — without https://, e.g. notes.example.com. Links, the RSS feed and preview images are built from it; without it the build fails as soon as fonts are self-hosted.',
    locale: 'Site language',
    spa: 'Switch pages without reloading',
    spaHint:
      'Clicking an internal link swaps the content instead of reloading the whole page. It feels faster; the site still works without JavaScript.',
    popovers: 'Preview on hovering a link',
    popoversHint: 'Hovering an internal link shows a small window with the beginning of the target page.',
    ignorePatterns: 'Exclude notes (one pattern per line)',
    ignorePatternsHint:
      'Files and folders in the content folder that never make it into the site — e.g. private/** or *.excalidraw.md. Affects this build only, not publishing.',
    localeHint: 'Sets the site’s built-in text labels (Search, Last modified, …). The choices are the language files this project ships.',
    localeHintFree: 'Sets the site’s built-in text labels (Search, Last modified, …). Format: language-country, e.g. en-US.',
    localeUnknownSuffix: '(not in this project)',
    analyticsHeading: 'Analytics',
    analyticsDescription:
      'Embeds a provider’s counting script into every page. With no provider, nothing is loaded and nothing is measured.',
    analyticsProvider: 'Provider',
    analyticsNone: 'No analytics',
    analyticsMissing: 'Still missing, or the script has nothing to send to: {{fields}}',
    analyticsFields: {
      host: 'Only for a self-hosted instance — leave empty otherwise',
      hostRequired: 'Address of your installation, e.g. https://analytics.example.com',
      tagId: 'Measurement ID, e.g. G-XXXXXXX',
      websiteId: 'The site’s id in your provider account',
      scriptSrc: 'Alternative script URL',
      apiKey: 'Project API key',
      siteId: 'The site’s id in your provider account',
      projectId: 'Project id'
    }
  },
  themeEditor: {
    goToThemeTab: 'Go to community themes',
    overrideChecking: 'Checking which of these values the active theme overrides…',
    overrideCounted:
        'The theme “{{themeId}}” overrides {{colors}} of {{totalColors}} colors and {{fonts}} of {{totalFonts}} fonts — those are dimmed below.',
    overrideStillEditable:
        'You can still edit them: they apply again the moment the theme is off, and can be overridden individually in the Variables tab.',
    overriddenByTheme: 'Overridden by the active theme',
    overriddenShort: 'theme',
    fontSource: 'Font source',
    googleFonts: 'Google Fonts',
    googleFontsHint: 'Quartz fetches the chosen fonts from Google. How they are delivered is the switch below.',
    localHint: 'Quartz then fetches nothing at all — the font has to be present already, e.g. via “Import your own font” below.',
    local: 'Bring your own',
    fontFor: 'Font ({{slot}})',
    delivery: {
      heading: 'Font delivery',
      description:
        'Serving locally means Quartz downloads the font files once at build time and puts them under static/fonts. The site then makes no request to Google at all — the GDPR-friendly option.',
      selfHost: 'Serve fonts locally (no Google request on visit)',
      baseUrlMissing:
        'This needs a base URL (Configuration → base URL) — the font URLs are rewritten to it, and the build fails without one.',
      state: {
        core: {
          google: 'Quartz core: links Google Fonts directly.',
          selfHosted: 'Quartz core: downloads at build time and serves locally.'
        },
        plugin: {
          google: '“Fonts” plugin: links Google Fonts directly.',
          selfHosted: '“Fonts” plugin: downloads at build time and serves locally.'
        },
        theme: {
          cdn: 'Community theme: loads its fonts from unpkg.com.'
        }
      },
      themeFonts: 'Load the theme’s own fonts',
      themeFontsHint:
        'The theme ships its own fonts and loads them from unpkg.com — another third-party request. There is no option to serve those locally; turning them off means dropping them, and the fonts chosen above apply instead.',
      themeFontsOff:
        'The theme’s fonts are off — nothing is loaded from unpkg.com, but the theme looks different from how it was designed.'
    },
    localFontHeading: 'Import a custom font',
    localFontDescription: 'Copies a .ttf/.otf/.woff/.woff2 file into the project and generates the matching @font-face rule in custom.scss.',
    localFontPick: 'Choose file…',
    localFontFamily: 'Font family name',
    localFontSlot: 'Use directly for',
    localFontNoSlot: '— none —',
    localFontConfirm: 'Import',
    fontImportSuccess: '“{{family}}” imported.',
    colors: 'Colors'
  },
  themes: {
    loading: 'Loading community themes…',
    disableAll: 'Disable community themes',
    allDisabled: 'Community themes disabled',
    active: {
      title: 'Current theme',
      none: 'No community theme active — the classic theme from “Configuration → Theme” applies. Install one from the catalog below to get started.',
      heading: 'Current theme: {{themeId}}',
      saveAsPreset: 'Save as preset',
      presetNamePlaceholder: 'Name for the preset',
      overrideNote:
        'This plugin ({{source}}) overrides the colors from the Basics layer. Changes below take effect immediately in the preview.',
      disabledHeading: 'Community theme disabled ({{themeId}})',
      disabledNote:
        'The classic theme from “Configuration → Theme” applies again now. This community theme’s settings are kept and can be turned back on any time.',
      reactivate: 'Turn back on',
      checkingStyleSettings: 'Checking the theme’s style settings…',
      noStyleSettingsNote:
        'The theme {{themeId}} doesn’t offer its own color settings — there’s nothing to customize here for this theme. That’s down to the theme itself, not this app: changes would simply be ignored by Quartz.',
      styleSettingsHeading: 'Style settings ({{ids}})',
      ownValuesHint:
        'This card only carries the options the theme itself declares. Your own values for individual CSS variables belong in the Variables tab or in your own CSS.',
      goToVariables: 'Go to variables →'
    },
    presets: {
      title: 'My presets',
      description:
        'Your own saved customizations of a base theme. To create a new theme: install & activate a base theme in the catalog below, customize it above, then save it as a preset.',
      none: 'No presets saved yet.',
      basisLabel: '(base: {{base}})',
      active: 'Active',
      apply: 'Apply',
      saveSettings: 'Save settings',
      delete: 'Delete'
    },
    catalog: {
      title: 'Catalog',
      description:
        'Ready-made color schemes from the @quartz-themes ecosystem (installs and activates the @quartz-themes/core plugin with the chosen theme).',
      searchPlaceholder: 'Search themes (e.g. tokyo-night, catppuccin, nord)…',
      refresh: 'Reload',
      refreshing: 'Loading…',
      unavailable:
        'The theme list could not be loaded from npm. What is listed below is a handful of well-known themes as a placeholder — try “Reload”.',
      installing: 'Installing…',
      install: 'Install & activate',
      active: 'Active',
      noResults: 'No results.',
      moreResults: '{{count}} more results — keep typing to filter.',
      installSuccess: '“{{id}}” installed and activated — don’t forget to click “Save” above.',
      installFailed: 'Installation of “{{id}}” failed: {{output}}',
      detailLoading: 'Loading details…',
      detailNone: 'No details available.',
      modes: 'Modes: {{modes}}',
      variations: 'Variations: {{variations}}',
      customColorsLabel: 'Custom colors adjustable: {{value}}',
      yes: 'Yes',
      no: 'No',
      fonts: 'Fonts: {{fonts}}',
      github: 'GitHub: {{text}}'
    }
  },
  plugins: {
    tabs: {
      installed: 'Installed',
      marketplace: 'Marketplace'
    },
    descriptions: {
      installed: 'Extends Quartz with extra functionality — this is what is active, and where you configure it.',
      marketplace: 'The plugin catalog of the quartz-community organisation, built-in ones included. Add plugins from anywhere else via “owner/repo”.'
    }
  },
  pluginsInstalled: {
    searchPlaceholder: 'Filter plugins…',
    filters: {
      all: 'All',
      active: 'Active',
      inactive: 'Inactive'
    },
    countActive: '{{active}} of {{total}} active',
    countFiltered: '{{visible}} of {{total}} shown',
    reorderDisabledByFilter:
      'Reordering is off while a filter is active — the new order would move the hidden entries as well.',
    noMatches: 'No plugin matches the filter and search.',
    none: 'No plugins installed.',
    framesHeading: 'Your frames',
    framesDescription:
      'Page frames built in the Layout editor. Quartz registers each one as a plugin — which is why they appear here — but they are configured in the Layout editor.',
    frameBadge: 'Frame',
    enabledSwitch: '“{{name}}” enabled',
    frameSource: 'Your own frame from the Layout editor',
    frameSummary: '{{count}} areas',
    openInLayoutEditor: 'Open in Layout',
    componentsHeading: 'Visible components',
    componentsDescription: 'These plugins are visible on the page — e.g. in the header, sidebar, or footer.',
    processingHeading: 'Processing',
    processingDescription:
      'These plugins change your content behind the scenes (e.g. formatting, links, images) and aren’t visible on the page themselves. Page types — plugins that create their own kind of page, e.g. tag pages — are listed separately below.',
    pageTypesGroup: 'Page types',
    otherProcessingGroup: 'Transformers, filters & emitters',
    dragHint: 'Drag to reorder',
    dragHandle: 'Reorder: {{name}}',
    savedAnnounce: 'Settings for {{name}} saved.',
    reorderedAnnounce: '{{name}} is now at position {{position}} of {{total}}.',
    moveUp: 'Move up: {{name}}',
    moveDown: 'Move down: {{name}}',
    updateAvailable: 'Update available',
    savedFlash: 'Saved',
    maintenanceHeading: 'Maintenance',
    maintenanceDescription:
      'Acts on the .quartz/plugins folder, where source-installed plugins are built — not on what the site does. That folder does not belong in the git repository, so a second machine has to rebuild it first.',
    installFromLock: 'Restore from quartz.lock.json',
    installFromLockRunning: 'Restoring…',
    installDone: 'Plugins restored from the lockfile.',
    prune: 'Remove orphaned plugin folders',
    pruneRunning: 'Cleaning up…',
    pruneDone: 'Orphaned plugin folders removed.',
    pruneConfirmAction: 'Remove folders',
    pruneConfirm:
      'Removes every built plugin folder no config entry points at any more. The configuration itself is left untouched. Continue?',
    openRepo: 'Open repository on GitHub',
    showOptions: 'Show options',
    hideOptions: 'Hide options',
    removeConfirm: 'Really remove plugin “{{name}}”? A snapshot is taken first, so you can bring it back.',
    removeFrameConfirm:
      'Really delete frame “{{name}}”? This removes it from the configuration and from disk. A snapshot is taken first.',
    availableOptions: 'Available options:',
    onlyViaYaml: ', YAML only',
    noSchemaInfo:
      'Quartz ships no options description for its built-in plugins, so the known options can’t be listed. Existing values can be edited here; add further ones by hand below (see the plugin’s repository for names).',
    optionKeyPlaceholder: 'Option',
    optionValuePlaceholder: 'Value',
    addOption: 'Add',
    optionKeyExists: 'That option is already set.',
    optionValueHint: 'true/false and numbers are stored as such, [..] and {..} as JSON, anything else as text.',
    removeOption: 'Remove option “{{name}}”',
    notSet: 'not set',
    summaryPosPriority: 'position: {{position}} · priority: {{priority}}',
    summaryOrder: 'order: {{order}}',
    layoutFields: {
      position: 'header = top header, left/right = sidebar, beforeBody/afterBody = around the content, footer = footer',
      priority: 'Order within the position — smaller first',
      display: 'all = all devices, mobile-only = mobile only, desktop-only = desktop only',
      condition:
        'Built in: not-index, has-tags, has-backlinks, has-toc. An unknown name is ignored at build time and the element always renders.',
      group: 'Name of a toolbar group, e.g. “toolbar”'
    },
    groupOptionsFields: {
      grow: 'Element grows to fill free space in the group',
      shrink: 'Element may shrink when space is limited',
      basis: 'Flex basis size, e.g. “auto” or “100px”',
      order: 'Order within the group — smaller first',
      align: 'CSS align-items, e.g. “center”',
      justify: 'CSS justify-content, e.g. “space-between”'
    }
  },
  pluginDescriptions: {
    'created-modified-date': 'Determines creation, modification and publish dates from frontmatter, git history or the filesystem.',
    'syntax-highlighting': 'Highlights code blocks.',
    'obsidian-flavored-markdown': 'Supports Obsidian-specific markdown syntax (wikilinks, callouts, embeds, …).',
    'github-flavored-markdown': 'Extends markdown with GitHub features like footnotes, tables and task lists.',
    'table-of-contents': 'Generates a table of contents for each page.',
    'crawl-links': 'Processes links so they point to the correct target pages.',
    description: 'Generates description text for meta tags, RSS and list views.',
    latex: 'Adds LaTeX support for mathematical formulas.',
    citations: 'Adds support for citations and bibliography references.',
    'hard-line-breaks': 'Turns single line breaks into hard breaks (Obsidian behavior).',
    'ox-hugo': 'Supports markdown files exported with ox-hugo.',
    roam: 'Supports notes exported from Roam Research.',
    'quartz-fonts': 'Controls fonts per heading level, including Google Fonts integration.',
    core: 'Applies the chosen theme (colors, typography, appearance) to the page.',
    'remove-draft': 'Hides pages with “draft: true” in the frontmatter.',
    'explicit-publish': 'Only publishes pages explicitly marked “publish: true” in the frontmatter.',
    'unlisted-pages':
      'Hides pages marked “unlisted: true” from all listings (search, graph, explorer, …) — they remain reachable via their URL.',
    'encrypted-pages': 'Password-protects individual pages (AES-256-GCM encryption).',
    'stacked-pages': 'Opens internal links as side-by-side stacked panes (Andy Matuschak style).',
    'alias-redirects': 'Generates redirect pages for alias URLs.',
    'content-index': 'Generates the RSS feed, sitemap and contentIndex.json for search and the graph.',
    favicon: 'Generates the favicon from quartz/static/icon.png.',
    'og-image': 'Generates social-media preview images (Open Graph images) per page.',
    cname: 'Writes a CNAME file for a custom domain.',
    'canvas-page': 'Renders Obsidian canvas files as interactive, zoomable pages.',
    'content-page': 'Generates the full HTML page for each markdown file.',
    'folder-page': 'Generates overview pages for folders with multiple items.',
    'tag-page': 'Generates a dedicated page per tag.',
    'bases-page': 'Renders Obsidian bases (.base) files as table, card or list views.',
    explorer: 'File-tree navigation in the sidebar.',
    graph: 'Interactive graph visualization of linked notes.',
    search: 'Full-text search across all content.',
    backlinks: 'Shows pages that link to the current page.',
    'article-title': 'Shows the page title as a heading above the content.',
    'content-meta': 'Shows metadata like creation date and reading time below the title.',
    'tag-list': 'Shows a page’s tags as a clickable list.',
    'page-title': 'Shows the site’s title as a link to the homepage, usually in the sidebar.',
    darkmode: 'Toggle for light/dark mode.',
    'reader-mode': 'Distraction-free reading mode.',
    breadcrumbs: 'Shows the navigation path (breadcrumbs) above the content.',
    comments: 'Embeds a comment system (e.g. giscus, utterances).',
    footer: 'Shows a footer with configurable links.',
    'recent-notes': 'Shows recently modified notes.',
    spacer: 'Flexible placeholder that pushes elements apart within a toolbar group.',
    'note-properties': 'Shows selected frontmatter properties in a collapsible panel.',
    assets: 'Copies all non-markdown files (images, videos, …) into the output.',
    static: 'Copies static resources like fonts and fixed images into the output.',
    'component-resources': 'Includes the CSS and JS resources that the theme and components need.'
  },
  layoutEditor: {
    title: 'Layout Editor',
    templateCustomPlaceholder: 'e.g. Home page with sidebar',
    tabGlobal: 'Global',
    tabPageTypes: 'Page types',
    tabFrames: 'Custom frames',
    pageTypesHint: 'Choose a page type to customize it.',
    pageTypeHasOverride: 'Customized',
    loading: 'Loading layout…',
    emptySlot: 'Empty — drag here',
    activeFrameLabel: 'Showing grid structure from: {{name}}',
    activeFrameDefault: '(default grid)',
    previewPageTypeLabel: 'Grid preview for:',
    breakpoints: {
      title: 'Breakpoints',
      tablet: 'Tablet up to (px)',
      mobile: 'Mobile up to (px)',
      saved: 'Saved',
      invalid: 'Mobile must be smaller than tablet (240–3840 px).',
      hint: 'The window widths at which your own frames switch to the tablet and mobile layout. Applies to every authored frame in this project and is rewritten into their CSS on save. Quartz’ built-in frames (default, full-width, minimal) and community themes carry their own breakpoints and do not follow these values. The default is 1200 / 800 — exactly what Quartz itself uses.'
    },
    groupLabel: 'Group',
    displayLabel: 'Visibility',
    noGroup: '— none —',
    displayAll: 'Always',
    displayDesktopOnly: 'Desktop only',
    displayMobileOnly: 'Mobile only',
    groupsPanel: {
      title: 'Flex groups',
      description:
        'Components sharing the same group are rendered side by side (or stacked) in a flexbox instead of individually one after another.',
      none: 'No flex groups defined yet.',
      newGroupPlaceholder: 'New group name',
      add: 'Add',
      direction: 'Arrangement',
      directionRow: 'Side by side',
      directionRowReverse: 'Side by side, reversed',
      directionColumn: 'Stacked',
      directionColumnReverse: 'Stacked, reversed',
      gap: 'Gap',
      priority: 'Priority',
      priorityPlaceholder: 'optional',
      delete: 'Delete'
    },
    pageTypes: {
      '404': '404 page',
      content: 'Content pages',
      folder: 'Folder pages',
      tag: 'Tag pages',
      canvas: 'Canvas pages',
      bases: 'Bases pages'
    },
    removeOverride: 'Remove override',
    excludeHeading: 'Visible components',
    excludeDescription: 'Turn off a component to hide it on pages of this type.',
    excludeDuplicateHint: 'Affects all {{count}} instances of “{{name}}” — Quartz cannot exclude individual duplicates here separately.',
    template: 'Frame/template',
    templateDefault: 'Default',
    templateFullWidth: 'Full width',
    templateMinimal: 'Minimal',
    templatePluginDefault: '“{{frame}}” (plugin default, active)',
    pluginFrameUnknownLayout:
      'This page type automatically uses the “{{frame}}” frame provided by its plugin. Its exact grid structure can’t be previewed here, since the plugin renders it itself — this is not the standard layout.',
    clearSlotsHeading: 'Clear slots for this page type',
    clearSlotsDescription: 'Enabled slots always stay empty for this page type, regardless of the global layout.',
    frameBuilder: {
      whatIsAFrame:
        'A frame is a page’s grid: it decides which areas exist — header, sidebars, content, footer —, where they sit and how wide they are. What appears inside those areas is set on the “Global” tab; which page type uses which frame, on the “Page types” tab. Quartz ships three frames (Default, Full width, Minimal). Here you build your own.',
      description: 'This project’s own frames.',
      newFrame: 'New frame',
      none: 'No custom frames created yet.',
      gridSummary: '{{rows}}×{{cols}} grid, {{areas}} area(s)',
      frameName: 'Frame name',
      rows: 'Rows',
      cols: 'Columns',
      rowGap: 'Row gap',
      columnGap: 'Column gap',
      gridSection: 'Grid',
      boxSection: 'Frame box',
      appliesTo: 'Values for {{breakpoint}}',
      maxWidth: 'Maximum width',
      maxWidthPlaceholder: 'none',
      align: 'Alignment',
      alignOption: {
        left: 'Left',
        center: 'Centered',
        right: 'Right'
      },
      paddingBlock: 'Padding top/bottom',
      paddingInline: 'Padding left/right',
      boxHint:
        'Applies to this breakpoint only. The frame never gets wider than the maximum width; the alignment distributes what is left. Padding sits between the frame edge and its content.',
      boxHintNoMaxWidth:
        'Applies to this breakpoint only. Without a maximum width the frame uses the full window width. Alignment needs a maximum width to do anything — before that there is nothing left to distribute.',
      saved: 'Saved',
      closeEditor: 'Close editor',
      resetTracks: 'Reset track sizes',
      columnSizesLabel: 'Column widths (blank = 1fr)',
      rowSizesLabel: 'Row heights (blank = auto)',
      lineNamesLabel: 'Named grid lines (optional)',
      lineNamesHint:
        'Gives names to the lines between columns/rows (e.g. “sidebar-start”). Not needed for placing areas here in the editor — only useful if you later want to reference this exact line from your own CSS (e.g. custom.scss), like grid-column: sidebar-start / content-end.',
      columnLinesLabel: 'Column lines',
      rowLinesLabel: 'Row lines',
      copyLayoutTo: 'Copy to {{target}}',
      breakpointLabel: 'Breakpoint',
      breakpoint: {
        desktop: 'Desktop',
        tablet: 'Tablet',
        mobile: 'Mobile'
      },
      availableAreasLabel: 'Available areas (drag onto the grid to place them)',
      newArea: '+ Add area',
      allPlaced: 'All areas are placed.',
      hintDragToPlace:
        'Drag an area onto an open cell to place it — or drag a placed one back into this list to unplace it. Click an area to select it and show its settings below, including the row/column span — changes apply right away.',
      expandArea: 'Expand area settings',
      placeArea: 'Place area {{name}}',
      moveArea: 'Move area {{name}}',
      cellName: 'Cell row {{row}}, column {{col}}',
      areaName: 'Area name',
      areaSlot: 'Slot',
      rowSpanLabel: 'Row span',
      colSpanLabel: 'Column span',
      removeArea: 'Remove area',
      unplace: 'Remove from grid',
      visibleOnBreakpoint: 'Visible on {{breakpoint}}',
      overlapError: 'This area overlaps an existing area.',
      unassignedWarning: 'Not assigned: {{slots}}. Components for these slots will not render in this frame.',
      neverVisibleWarning: 'Not visible on any breakpoint: {{areas}}. These areas will not render anywhere.',
      nameRequired: 'Please give the frame a name.',
      nameCollision: 'This name is already taken (a built-in template or another custom frame).',
      deleteFrame: 'Delete this frame',
      deleteConfirmAction: 'Delete frame',
      deleteConfirm: 'Really delete frame “{{name}}”? Page types referencing it will fall back to the default template.',
      preview: {
        pageContent: 'Page content'
      }
    },
    componentPill: {
      paletteLabel: 'Add component',
      paletteDropToRemove: 'Drop here to remove',
      paletteHint: 'Drag a component onto a slot to insert another instance with its own settings.',
      dragHandle: 'Drag to move',
      duplicate: 'Duplicate',
      removeDuplicate: 'Remove duplicate'
    }
  },
  styles: {
    fixes: {
      heading: 'Known conflicts',
      description:
        'Conflicts between plugins that no setting can resolve, only CSS can. The fix is written as an ordinary file under “Custom CSS” — editable, reorderable and deletable like any other.',
      add: 'Add fix',
      open: 'Open file',
      alreadyAdded: 'Added as {{file}}',
      'heading-fonts': {
        title: 'Headings ignore the theme',
        summary:
          'The “Fonts” plugin sets the h1–h6 font with an unlayered rule, which beats both the theme and your own CSS. The fix points the headings back at the CSS variables.',
        comment:
          'The plugin @quartz-community/quartz-fonts sets "h1,…,h6 { font-family: … }" unlayered.\nUnlayered beats every @layer - including the active theme - and because its stylesheet is\nlinked after custom.scss, it also beats an equally specific rule of your own.\n"body h1" is one step more specific and therefore wins regardless of load order.\n\nPointing at the variables puts the Variables tab back in control.\nWritten by QuartzControl - edit freely.'
      }
    },
    tabs: {
      basics: 'Basics',
      theme: 'Community themes',
      variables: 'Variables',
      customCss: 'Custom CSS'
    },
    cascade: {
      themeActive:
        'Order: basics → community theme → variables → custom CSS. The theme “{{themeId}}” is active and overrides the base colors.',
      themeInactive:
        'Order: basics → community theme → variables → custom CSS. No community theme active — your base colors and fonts apply.',
      overrides: '{{count}} variable(s) overridden.'
    },
    scssStale:
      'custom.scss has since been changed from another tab (a variable override or a font import). Your draft here is still unsaved — saving it would overwrite that change.',
    scssStaleReload: 'Reload from disk (discard draft)',
    styleSettings: {
      sourceNote: 'Descriptions from the original theme “{{theme}}” by {{author}} — {{count}} options.',
      searchPlaceholder: 'Search option…',
      loading: 'Loading option descriptions…',
      refresh: 'Reload docs',
      unavailable:
        'No descriptions could be found for this theme — it has no entry in the Obsidian theme registry, or ships no @settings block. Only the raw switches are shown here.',
      themeDefault: '— theme default —',
      reset: 'Reset'
    },
    variables: {
      mainHeading: 'Main variables',
      mainDescription:
        'The variables Quartz itself derives from the base colors. Expand a row to see where its value comes from and what depends on it.',
      allHeading: 'All theme and build variables',
      allDescription:
        'Everything the active theme, plugins, or the last build bring along — kept separate from the main variables, because there can be a great many.',
      allDescriptionTheme:
        'Everything the theme “{{themeId}}”, plugins, or the last build bring along: {{count}} variables. Type a search to browse them.',
      counter: '{{overridden}} of {{total}} overridden',
      searchPlaceholder: 'Search variable (e.g. callout, h1, background)…',
      onlyChanged: 'Changed only',
      searchHint: 'Type a search term to look through {{count}} variables.',
      noResults: 'No matches.',
      moreResults: '{{count}} more matches — keep typing to narrow down.',
      noSources: 'No additional variables found.',
      noTheme: 'No community theme is installed.',
      noBuild: 'There is no build output yet — build once, then reload here.',
      reload: 'Reload',
      reset: 'Reset',
      resetToOriginal: 'Reset to original value',
      light: 'Light',
      dark: 'Dark',
      chainToggle: 'Show origin and dependencies',
      unresolved: 'not resolvable (only set inside a selector)',
      dependents: '{{count}} depend on it',
      dependentsWarning: 'Your own value here affects {{count}} other variables.',
      dependentsNone: 'No other variable references this one.',
      usesNone: 'References no other variable — the value is right here.',
      moreKeys: '+{{count}} more',
      chipHint: 'Jump to this variable',
      themeNote:
        'The community theme “{{themeId}}” ships its variables inside @layer, while your values here land unlayered in custom.scss — unlayered rules always win. Verified against a real build (light and dark). Only variables a theme sets exclusively inside a selector (e.g. .callout[data-callout]) cannot be overridden globally here.',
      section: {
        current: 'Current value',
        origin: 'Origin',
        uses: 'Uses these variables',
        dependents: 'Used by these variables',
        edit: 'Your own value'
      },
      groupChanged: '{{count}} changed',
      groups: {
        baseColors: 'Base colors',
        surfaces: 'Surfaces',
        text: 'Text',
        interaction: 'Controls',
        baseScale: 'Grayscale ramp',
        fonts: 'Fonts',
        navigation: 'Navigation',
        tags: 'Tags',
        other: 'Other',
        accentHsl: 'Accent color (H/S/L)'
      },
      origin: {
        core: 'Quartz core',
        theme: 'Community theme',
        build: 'Last build',
        user: 'Yours'
      }
    }
  },
  styleEditor: {
    openExternally: 'Open externally',
    importFile: 'Import file…',
    componentPlaceholder: 'Choose a component…',
    componentHint: 'Inserts a selector for the chosen component at the cursor position.',
    insertSelector: 'Insert selector',
    referenceHeading: 'Original styles (read-only)',
    files: {
      heading: 'Load order',
      description:
        'Quartz only ever imports custom.scss — everything else is loaded from there, in this order. Later files override earlier ones; custom.scss itself always comes last.',
      alwaysLast: 'always last',
      moveUp: 'Move up',
      moveDown: 'Move down',
      rename: 'Rename',
      delete: 'Delete',
      deleteConfirm: 'Really delete',
      create: 'New file',
      createConfirm: 'Create',
      namePlaceholder: 'File name (e.g. typography)',
      orphansHeading: 'Present, but not loaded',
      include: 'Load it',
      unsaved: 'Unsaved changes',
      saveActive: 'Save file',
      closeTab: 'Close tab'
    },
    check: {
      ok: 'SCSS compiles without errors.',
      failed: 'SCSS error — the build would fail:',
      location: 'Open {{file}}, line {{line}}',
      locationExternal: 'In {{file}}, line {{line}} (not editable here)',
      recheck: 'Check again',
      checkActive: 'Check code',
      running: 'Checking…',
      unavailable: 'SCSS check not possible: {{reason}}'
    },
    current: {
      colors: 'Colors in effect',
      fonts: 'Fonts in effect',
      variable: 'Variable',
      sample: 'Aa Bb Cc 123 — sample text',
      notInstalled: 'not installed',
      notInstalledExplainer:
        '“Not installed” means the font is not on this machine and the app fetches nothing from the network — the sample shows the fallback, not the real face.',
      italic: 'italic',
      noFace: 'no @font-face rule found',
      familyDefault: '(family default)',
      noLoader:
        'Nothing fetches fonts: only what an active theme ships, or what you declare via @font-face, is available.',
      loader: {
        core: {
          google: 'Quartz links Google Fonts on every page view: {{specs}}.',
          selfHosted: 'Quartz downloads from Google at build time and serves the files itself: {{specs}}.'
        },
        plugin: {
          google: 'The “Fonts” plugin links Google Fonts on every page view.',
          selfHosted: 'The “Fonts” plugin downloads at build time and serves the files itself.'
        },
        theme: {
          cdn: 'The community theme loads its own fonts from unpkg.com on every page view.'
        }
      }
    },
    cssVars: {
      heading: 'Available CSS variables',
      description: 'These variables are usable at this point (e.g. var(--text-normal)). Values reflect the current base layer, light/dark.',
      goToVariables: 'Override variables →',
      searchPlaceholder: 'Search variable…',
      insertHint: 'Click inserts the variable at the cursor position — ⌥ + click copies it.',
      insertValueHint: 'Click inserts {{value}} — ⌥ + click copies.',
      insertValueLabel: '--{{key}}: insert the {{mode}} value',
      insertValue: 'Insert value',
      rowHint: 'Every click inserts at the cursor position: the name as var(--name), a swatch as its value. ⌥ + click copies instead.',
      calloutsGroup: 'Callout types',
      copyHint: 'Click to copy {{value}}',
      discoveredGroup: 'Found in build output',
      noResults: 'No matches.',
      calloutsHeading: 'Callout colors',
      calloutsDescription:
        'Each callout type ([!note], [!warning], …) has its own --color/--border/--bg variables — but only valid inside .callout[data-callout="…"], not as a global var(--color). Click inserts the matching scaffold prefilled with the real values.',
      calloutsInsertHint: 'Click to insert the override scaffold for this callout type.'
    }
  },
  localization: {
    none: 'No locale files found (quartz/i18n/locales is missing).',
    searchPlaceholder: 'Search by key or text…',
    unsavedCount: '{{count}} unsaved',
    saveError: 'Save failed.',
    noResults: 'No matches.',
    advancedBadge: 'JS',
    gitAttributesOk: 'Update protection active',
    gitAttributesMissing: 'Update protection not active',
    gitAttributesExplain:
      'Your wording lives in Quartz’ own files. The protection keeps a core update from overwriting it, and it takes two parts: the line in .gitattributes and the merge driver in this project’s git configuration. Both are set automatically on the next save.',
    gitAttributesEnable: 'Enable now'
  },
  updates: {
    upToDate: 'Up to date',
    updateAvailable: 'Update available',
    checkFailed: 'Check failed',
    recheck: 'Check again',
    core: {
      heading: 'Quartz core',
      commits: 'Installed: {{current}} · Latest: {{latest}}',
      runUpdate: 'Run update',
      confirm:
        'Update Quartz’s core?\n\nA snapshot is taken first: quartz.config.yaml, quartz.lock.json, your own stylesheets and this app’s settings are part of it; your content folder only if it is a real folder and switched on under Backups. You can go back to that state any time under Backups.\n\nThis fetches changes from jackyzha0/quartz, runs npm install, and may require manual intervention on conflicts.',
      abortMerge: 'Abort merge',
      openSnapshot: 'Open the snapshot from before the update →',
      conflictHeading: 'Conflicts in these files (aside from the locale files .gitattributes protects):'
    },
    plugins: {
      heading: 'Plugins',
      hint: 'Only shows plugins you added via the marketplace or command line. Built-in plugins (most of them in a new project) update automatically with the Quartz core above.',
      updateAll: 'Update all',
      update: 'Update',
      local: 'Local',
      none: 'No plugins added via the marketplace or command line were found.'
    },
    snapshots: {
      heading: 'Snapshots',
      movedHint:
        'A snapshot is taken automatically before every core and plugin update. They are managed under Backups, together with the snapshots from every other area.',
      openBackups: 'Go to Backups →'
    }
  },
  publish: {
    title: 'Publish',
    description: 'Builds the project and takes the result to its targets — over SFTP/rsync, FTP, into a folder, onto a git branch, or via a webhook.',
    baseUrlWarning: 'configuration.baseUrl is still set to “{{baseUrl}}” — set it to the real domain before publishing.',
    connectionVsTarget:
      'Two things that belong together: a credential is the login at a provider — server, username, password or key. It belongs to the app and can be used by several projects, so rotating a password is one edit rather than one per project. A target belongs to this project and says what to do with that credential: which folder on the server, which branch, and what happens to deleted files.',
    targetHeading: 'Target',
    newConnectionOfKind: '+ New {{kind}} credential',
    connectionKindFixed:
      'The kind of credential follows from the kind of target: this one needs a {{kind}} credential. Other kinds are created in the settings.',
    manageConnections: 'Manage connections',
    manageConnectionsHere: 'Manage credentials in the settings →',
    newTarget: '+ New target',
    confirmDiscardTargetDraftAction: 'Discard changes',
    confirmDiscardTargetDraft: 'The open target has unsaved changes. Switching now loses them.',
    confirmDeleteTargetAction: 'Delete target',
    confirmDeleteTarget: 'Really delete this publish target? The credential it uses stays.',
    noTargets: 'No publish target yet. Create one via “+ New target” — e.g. GitHub Pages, a webspace over SFTP, or a local folder.',
    confirmDeployAction: 'Publish now',
    confirmDeployBranch:
      'Publish to branch “{{branch}}”?\n\nThe branch is replaced entirely by the current build (force push).',
    branchHint: {
      github:
        'Pushes the build as a single commit to that branch of the “origin” remote (the same one Git sync uses). GitHub Pages must be pointed at this branch in the repository settings.',
      codeberg:
        'Codeberg Pages serves the “pages” branch directly — after the first push the site is reachable with no further setup.',
      gitlab:
        'Note: on GitLab the branch alone publishes nothing — a CI job has to ship the files as a “public” artifact. The push works regardless.'
    },
    pages: {
      title: 'GitHub Pages',
      reload: 'Reload status',
      noGithubOrigin: 'This project’s “origin” remote does not point at github.com. Pages can only be set up from here once the repository lives on GitHub — see Git sync.',
      notConfigured: 'This repository has no Pages site yet. The button below creates one and points it at this branch.',
      source: 'Source: {{branch}}',
      status: {
        built: 'Published',
        building: 'Building',
        errored: 'Failed',
        unknown: 'Never built'
      },
      cname: 'Custom domain',
      cnamePlaceholder: 'e.g. wiki.example.com',
      httpsEnforced: 'Enforce HTTPS',
      httpsOnlyWithDomain:
        'Only adjustable with a custom domain. A github.io address is always served over HTTPS anyway.',
      apply: 'Point at “{{branch}}”',
      saveSettings: 'Save settings',
      cnameHint:
        'The domain is stored by GitHub, not in the branch — unlike a CNAME file it therefore survives every deploy that replaces the branch wholesale. HTTPS can only be enforced once GitHub has issued the certificate, which takes a few minutes after setting the domain.'
    },
    sftpHint:
      'SFTP compares against a local record of what was last uploaded. Files someone changes or deletes directly on the server go unnoticed.',
    rsyncHint:
      'rsync asks the server what is actually there, so the diff is right even if someone changed something by hand. Requires rsync on the server.',
    rsyncBlocked: {
      'no-connection': 'rsync becomes available once an SSH credential with a key file or the SSH agent is selected.',
      'password-auth': 'rsync cannot be used with password login — ssh has no way to accept the password. A key file or the SSH agent works.',
      'key-not-a-file':
        'rsync needs the private key as a file; a key pasted here is not enough. Switch the credential to a key file.',
      'no-pinned-host-key':
        'rsync needs a confirmed host key. Publish once over SFTP — the fingerprint is asked for and stored — then rsync can be selected.',
      'platform-unsupported':
        'rsync is not available on this operating system. SFTP transfers the same files, just without asking the server what it has.',
      'not-installed':
        'No rsync is installed on this machine. On Debian and Ubuntu: sudo apt install rsync. Until then SFTP transfers the same files, just without asking the server what it has.'
    },
    webhookNoUrl: 'no URL stored',
    webhookExplainer:
      'A webhook uploads nothing — it asks a provider (Netlify, Cloudflare Pages, Vercel, CI) to build. That is why there is no file list here: the build runs there, not on this machine.',
    deleteDisabledHint: 'Deleting is off for this target — removed files stay there, but are still tracked.',
    targetForm: {
      heading: 'Publish target',
      explainer:
        'A target describes where this project publishes to — path, deletion behaviour and which credential it uses. The credential itself is app-wide and can be shared by several projects.',
      name: 'Name',
      type: 'Type',
      remotePath: 'Remote path',
      remotePathPlaceholder: 'e.g. httpdocs or /var/www/example.com',
      remotePathHint:
        'The folder on the server the site goes into. Without a leading slash it counts from the login directory — on a shared webspace that is the normal case.',
      remotePathError: {
        empty: 'Nothing can be published without a target folder.',
        'whole-root': 'The login directory itself is not allowed — with deletion enabled it would be emptied. Name the subfolder the site lives in.',
        traversal: 'A path containing “..” is not allowed.'
      },
      transfer: 'Transfer',
      transferSftp: 'SFTP (file by file)',
      transferRsync: 'rsync (faster, compares against the server)',
      typeFolder: 'Folder',
      typeWebhook: 'Webhook',
      typeGitBranch: 'Git branch',
      provider: 'Provider',
      branch: 'Branch',
      folderPath: 'Target folder',
      connection: 'Credential',
      pickConnection: '— pick a credential —',
      deleteRemoved: 'Also delete removed files at the target',
      excludes: 'Never publish (one path per line)',
      excludesPlaceholder: 'e.g. .htaccess\nstats/'
    },
    noSecretWarning: '(no password/key stored)',
    hostKeyPinned: 'Host key confirmed',
    hostKeyUnknown: 'Host key not confirmed yet — you will be asked on first connect',
    forgetHostKey: 'Forget host key',
    confirmForgetHostKeyAction: 'Forget host key',
    confirmForgetHostKey:
      'Discard the stored host key for {{host}}?\n\nYou will be asked to confirm the fingerprint again on the next connect. Only do this if the server was genuinely rebuilt.',
    ftpPlaintextWarning: 'FTP sends the password and all files in the clear. Without FTPS anyone on the same network can read along — enable it if your provider supports it (or use SFTP instead).',
    confirmDeployWebhook:
      'Trigger the webhook “{{target}}”?\n\nNo files are transferred — the provider is only asked to build on its own.',
    confirmDeployConnection:
      'Publish to {{target}}?\n\n{{uploads}} file(s) will be uploaded, {{deletions}} file(s) will be deleted on the server.',
    connectionForm: {
      heading: 'Credential',
      explainer:
        'Credentials are encrypted in the system keychain and are app-wide, not tied to this project.',
      name: 'Name',
      host: 'Host',
      port: 'Port',
      username: 'Username',
      authMethod: 'Authentication',
      authPassword: 'Password',
      authPrivateKey: 'Private key',
      authAgent: 'SSH agent',
      keyPath: 'Key file',
      agentHint:
        'The key stays in the system SSH agent; this app stores nothing for it. Requires SSH_AUTH_SOCK to be set.',
      secure: 'FTPS (encrypted)',
      password: 'Password',
      privateKey: 'Private key (contents)',
      webhookUrl: 'Webhook URL',
      secretUnchangedPlaceholder: 'leave unchanged'
    },
    outputDir: 'Output directory',
    outputDirPlaceholder: 'Default: public/ in the project',
    outputDirShared: 'The same folder as under Preview & Build.',
    diffHeading: 'Changes',
    buildNow: 'Build now',
    refreshDiff: 'Refresh diff',
      uploadEverything: 'Upload everything again',
      uploadEverythingHint:
        'Discards what this app last sent to this target — the preview then offers the whole build again. For everything the app cannot see: a file deleted on the server by hand, an interrupted transfer, a restore by the provider.',
    noDiffYet: 'No diff computed yet — build or refresh the diff first.',
    noChanges: 'No changes since the last deploy.',
    status: {
      added: 'Added',
      changed: 'Changed',
      removed: 'Removed'
    },
    deployHeading: 'Publish',
    deployButton: 'Publish now',
    progress: '{{processed}}/{{total}} — {{file}}',
    deploySuccess: 'Published successfully.',
    deployFailed: 'Publish failed.'
  },
  templates: {
    title: 'Templates',
    description:
      'Bundles this project’s design into a single file: colours, theme, CSS, fonts, layout, frames, plugins and translations — in whole or in part. After importing into another project everything is set up the way it is here.',
    exportHeading: 'Create a template',
    exportHint:
      'Writes a single .qtpl file you can pass on. Everything this project has is preselected; what it does not have is not offered.',
    nameLabel: 'Template name',
    descriptionLabel: 'Description (optional)',
    descriptionPlaceholder: 'What is this template for?',
    partsHeading: 'Contents',
    nothingToExport: 'There is nothing in this project yet that could be saved as a template.',
    selectedCount: '{{count}} of {{total}} parts',
    exportButton: 'Save template…',
    exporting: 'Saving…',
    exportSuccess: 'Saved ({{size}}): {{path}}',
    exportCancelled: 'Cancelled.',
    scopeLabel: 'Scope',
    scopeChanged: 'Only your changes ({{count}})',
    scopeNoChanges: 'no changes detected',
    scopeAll: 'All texts ({{count}})',
    baselineHint:
      'For one language there is no way to tell what you changed — the comparison baseline is created the first time you edit a text in this app. Pick “All texts” if it should be included.',
    baselineHint_other:
      'For {{count}} languages there is no way to tell what you changed — the comparison baseline is created the first time you edit a text in this app. Pick “All texts” if one of them should be included.',
    importHeading: 'Apply a template',
    importHint: 'A snapshot is taken first, so the import can be undone completely from “Backups”.',
    planning: 'Checking the package…',
    pickPackage: 'Choose a template…',
    previewError: 'This is not a readable template (no manifest.json found).',
    legacyBadge: 'Old format',
    packageOrigin: 'Created on {{date}} from the project “{{project}}”',
    unknownProject: 'unknown',
    unknownParts: 'This template contains parts this version does not know yet ({{parts}}) — they are skipped.',
    strategyHeading: 'On conflict',
    strategyPackage: 'Template wins',
    strategyProject: 'Project wins',
    strategyPackageHint: 'Whatever this project already has is replaced by the template.',
    strategyProjectHint: 'Whatever this project already has stays; only what is missing is added.',
    planAdditions: '{{count}} new',
    planReplaced: '{{count}} replaced',
    planKept: '{{count}} kept as is',
    planNoChange: 'changes nothing',
    willInstall: 'Will be installed: {{packages}}',
    importButton: 'Apply template',
    importing: 'Applying…',
    importPreparing: 'Taking a snapshot…',
    confirmImportAction: 'Apply',
    confirmOverwrite:
      'Apply {{count}} part(s)? What this project already has will be replaced by the template. A snapshot is taken first.',
    confirmMerge: 'Apply {{count}} part(s)? What this project already has stays untouched.',
    importSuccessNoWarnings: 'Done — everything applied, nothing left open.',
    parts: {
      appearance: {
        label: 'Colours & fonts',
        description: 'The base colours for light and dark, the three font roles, and where the font files come from.'
      },
      theme: {
        label: 'Community theme',
        description: 'The chosen theme with all its settings. Its npm package is installed along with it.'
      },
      cssVariables: {
        label: 'CSS variables',
        description: 'Your own values for individual CSS variables, separately for light and dark.'
      },
      styles: {
        label: 'Custom CSS',
        description: 'custom.scss and every stylesheet you created or imported — including their load order.'
      },
      fonts: {
        label: 'Font files',
        description: 'The font files you brought yourself and the @font-face rules pointing at them.'
      },
      layout: {
        label: 'Layout',
        description: 'Which component appears where, per page type — and at which width things reflow.'
      },
      frames: {
        label: 'Custom frames',
        description: 'Page grids you built yourself. Registered afresh in the target project, not just copied.'
      },
      plugins: {
        label: 'Plugins',
        description: 'Every plugin entry with its options, its order and its position.'
      },
      translations: {
        label: 'Translations',
        description: 'The texts you changed in Quartz’ language files.'
      },
      presets: {
        label: 'Theme presets',
        description: 'Your saved theme combinations.'
      }
    },
    stats: {
      colors: '{{count}} colour',
      colors_other: '{{count}} colours',
      fonts: '{{count}} font',
      fonts_other: '{{count}} fonts',
      files: '{{count}} file',
      files_other: '{{count}} files',
      variables: '{{count}} variable',
      variables_other: '{{count}} variables',
      styleSettings: '{{count}} setting',
      styleSettings_other: '{{count}} settings',
      groups: '{{count}} group',
      groups_other: '{{count}} groups',
      pageTypes: '{{count}} page type',
      pageTypes_other: '{{count}} page types',
      frames: '{{count}} frame',
      frames_other: '{{count}} frames',
      plugins: '{{count}} plugin',
      plugins_other: '{{count}} plugins',
      active: '{{count}} active',
      languages: '{{count}} language',
      languages_other: '{{count}} languages',
      entries: '{{count}} text',
      entries_other: '{{count}} texts',
      presets: '{{count}} preset',
      presets_other: '{{count}} presets'
    },
    warnings: {
      unknown: '{{count}}× {{kind}}',
      appearanceSkipped: 'Colours and fonts were left unchanged.',
      themeSkipped: 'The existing theme was left unchanged.',
      layoutSkipped: 'Layout and breakpoints were left unchanged.',
      themeInstallFailed: 'The theme package could not be installed: {{detail}}',
      pluginInstallFailed: 'Could not be installed: {{detail}}',
      pluginSkipped: '{{count}} existing plugin was left unchanged.',
      pluginSkipped_other: '{{count}} existing plugins were left unchanged.',
      pluginUnsupported: '{{count}} plugin has a source form that cannot be transferred.',
      pluginUnsupported_other: '{{count}} plugins have a source form that cannot be transferred.',
      frameSkipped: '{{count}} existing frame was left unchanged.',
      frameSkipped_other: '{{count}} existing frames were left unchanged.',
      frameFailed: 'A frame could not be created: {{detail}}',
      styleFileSkipped: '{{count}} existing stylesheet was left unchanged.',
      styleFileSkipped_other: '{{count}} existing stylesheets were left unchanged.',
      fontSkipped: '{{count}} font file of the same name but different content was left unchanged.',
      fontSkipped_other: '{{count}} font files of the same name but different content were left unchanged.',
      presetSkipped: '{{count}} existing preset was left unchanged.',
      presetSkipped_other: '{{count}} existing presets were left unchanged.',
      missingKey: '{{count}} text no longer exists in this Quartz version.',
      missingKey_other: '{{count}} texts no longer exist in this Quartz version.',
      translationFailed: 'Text could not be written: {{detail}}',
      partUnreadable: 'One part could not be read: {{detail}}',
      partFailed: 'One part failed: {{detail}}',
      packageUnreadable: 'The template could not be read.'
    }
  },
  pluginsMarketplace: {
    searchPlaceholder: 'Search plugins…',
    addFromGithub: 'Add a plugin from GitHub',
    addPlaceholder: 'github:owner/repo',
    add: 'Add',
    installed: 'Installed',
    installing: 'Installing…',
    install: 'Install',
    archived: 'Archived',
    openRepo: 'Open repository on GitHub',
    noResults: 'No plugins found.',
    showOther: 'Show {{count}} more repositories',
    hideOther: 'Hide {{count}} more repositories',
    otherDescription:
      'Repositories of the quartz-community organisation without the “quartz-plugin” topic — among them Quartz itself, shared libraries, templates and forks. Mostly not installable as a plugin.',
    installedMessage: '{{name}} installed.',
    loading: 'Loading the catalog…',
    refresh: 'Reload catalog',
    refreshing: 'Loading…',
    unavailable:
      'The catalog is unreachable right now (GitHub is not answering, or the rate limit is used up). What is listed below is a placeholder — try “Reload catalog”. A GitHub token in the settings raises the limit considerably.'
  },
  dnd: {
    instructions:
      'Press space or enter to pick up. While dragging, use the arrow keys to move, space or enter to drop, escape to cancel.',
    picked: '{{name}} picked up.',
    over: '{{name}} is over {{target}}.',
    outside: '{{name}} is over no drop target.',
    dropped: '{{name}} dropped on {{target}}.',
    cancelled: '{{name}} cancelled, nothing moved.'
  },
  logConsole: {
    noOutput: 'No output yet.',
    clear: 'Clear output'
  }
} as const
