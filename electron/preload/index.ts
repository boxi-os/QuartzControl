import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  AppCommand,
  QuartzGuiApi,
  LogLine,
  ServerStatus,
  ContentProgress,
  QuartzConfig,
  ServerOptions,
  ContentStrategy,
  Settings,
  CreateProjectOptions,
  ThemePreset,
  GridFrameDefinition,
  FrameBreakpointWidths,
  PluginEntry,
  ProjectPrefs,
  RestoreOptions,
  SaveConnectionInput,
  SnapshotKind,
  SyncOptions,
  SavePublishTargetInput,
  DeployProgressEvent,
  CssVariableOverride,
  TemplateConflictStrategy,
  TemplateExportOptions,
  TemplateImportProgress,
  TemplatePartId,
  ConfirmDialogOptions
} from '@shared/ipc-contract'

function onEvent<Args extends unknown[]>(channel: string, cb: (...args: Args) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, ...args: Args): void => cb(...args)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

// This file runs inside the renderer sandbox (electron/main/index.ts), which means: no Node
// modules, only `electron`. `process` here is Electron's polyfill for sandboxed preloads and
// carries `platform` and `argv` - `argv` is where main puts the home directory, via
// webPreferences.additionalArguments, because `os.homedir()` is exactly the kind of call that is
// no longer available in here. Read once; a missing switch is a wiring bug in createWindow, not
// a runtime condition, so it is loud rather than defaulted.
function argvValue(name: string): string {
  const prefix = `--${name}=`
  const entry = process.argv.find((arg) => arg.startsWith(prefix))
  if (entry === undefined) throw new Error(`preload: expected ${prefix} in process.argv (see createWindow)`)
  return entry.slice(prefix.length)
}

const api: QuartzGuiApi = {
  platform: process.platform,
  homeDir: argvValue('quartz-home-dir'),
  projects: {
    list: () => ipcRenderer.invoke(IPC.projectList),
    overview: () => ipcRenderer.invoke(IPC.projectOverview),
    add: (path: string) => ipcRenderer.invoke(IPC.projectAdd, path),
    relocate: (id: string, path: string) => ipcRenderer.invoke(IPC.projectRelocate, id, path),
    open: (id: string) => ipcRenderer.invoke(IPC.projectOpen, id),
    remove: (id: string) => ipcRenderer.invoke(IPC.projectRemove, id),
    create: (options: CreateProjectOptions) => ipcRenderer.invoke(IPC.projectCreate, options)
  },
  config: {
    get: (projectPath: string) => ipcRenderer.invoke(IPC.configGet, projectPath),
    save: (projectPath: string, config: QuartzConfig) => ipcRenderer.invoke(IPC.configSave, projectPath, config)
  },
  plugins: {
    add: (projectPath: string, source: string) => ipcRenderer.invoke(IPC.pluginAdd, projectPath, source),
    remove: (projectPath: string, name: string) => ipcRenderer.invoke(IPC.pluginRemove, projectPath, name),
    optionsSchema: (projectPath: string, name: string) => ipcRenderer.invoke(IPC.pluginOptionsSchema, projectPath, name),
    themeStyleSettingsInfo: (projectPath: string, themeId: string) =>
      ipcRenderer.invoke(IPC.pluginThemeStyleSettingsInfo, projectPath, themeId),
    installFromLock: (projectPath: string) => ipcRenderer.invoke(IPC.pluginInstallFromLock, projectPath),
    prune: (projectPath: string) => ipcRenderer.invoke(IPC.pluginPrune, projectPath)
  },
  layoutFrames: {
    list: (projectPath: string) => ipcRenderer.invoke(IPC.layoutFrameList, projectPath),
    save: (projectPath: string, definition: GridFrameDefinition) => ipcRenderer.invoke(IPC.layoutFrameSave, projectPath, definition),
    delete: (projectPath: string, id: string) => ipcRenderer.invoke(IPC.layoutFrameDelete, projectPath, id),
    builtinPageTypeFrames: (projectPath: string, plugins: PluginEntry[]) =>
      ipcRenderer.invoke(IPC.layoutFrameBuiltinPageTypeFrames, projectPath, plugins),
    getBreakpoints: (projectPath: string) => ipcRenderer.invoke(IPC.layoutFrameGetBreakpoints, projectPath),
    saveBreakpoints: (projectPath: string, widths: FrameBreakpointWidths) =>
      ipcRenderer.invoke(IPC.layoutFrameSaveBreakpoints, projectPath, widths)
  },
  styles: {
    get: (projectPath: string) => ipcRenderer.invoke(IPC.stylesGet, projectPath),
    save: (projectPath: string, content: string) => ipcRenderer.invoke(IPC.stylesSave, projectPath, content),
    reference: (projectPath: string, pluginName: string) => ipcRenderer.invoke(IPC.stylesReference, projectPath, pluginName),
    importFile: (projectPath: string, sourcePath: string) => ipcRenderer.invoke(IPC.stylesImportFile, projectPath, sourcePath),
    listFiles: (projectPath: string) => ipcRenderer.invoke(IPC.stylesListFiles, projectPath),
    readFile: (projectPath: string, relativePath: string) =>
      ipcRenderer.invoke(IPC.stylesReadFile, projectPath, relativePath),
    saveFile: (projectPath: string, relativePath: string, content: string) =>
      ipcRenderer.invoke(IPC.stylesSaveFile, projectPath, relativePath, content),
    createFile: (projectPath: string, name: string) => ipcRenderer.invoke(IPC.stylesCreateFile, projectPath, name),
    renameFile: (projectPath: string, relativePath: string, newName: string) =>
      ipcRenderer.invoke(IPC.stylesRenameFile, projectPath, relativePath, newName),
    deleteFile: (projectPath: string, relativePath: string) =>
      ipcRenderer.invoke(IPC.stylesDeleteFile, projectPath, relativePath),
    setImportOrder: (projectPath: string, relativePaths: string[]) =>
      ipcRenderer.invoke(IPC.stylesSetImportOrder, projectPath, relativePaths),
    check: (projectPath: string) => ipcRenderer.invoke(IPC.stylesCheck, projectPath),
    checkSource: (projectPath: string, relativePath: string, content: string) =>
      ipcRenderer.invoke(IPC.stylesCheckSource, projectPath, relativePath, content),
    fontFaces: (projectPath: string, themeId?: string) => ipcRenderer.invoke(IPC.stylesFontFaces, projectPath, themeId),
    getVariableOverrides: (projectPath: string) => ipcRenderer.invoke(IPC.stylesGetVariableOverrides, projectPath),
    saveVariableOverrides: (projectPath: string, overrides: CssVariableOverride[]) =>
      ipcRenderer.invoke(IPC.stylesSaveVariableOverrides, projectPath, overrides),
    variableGraph: (projectPath: string, themeId?: string, outputDir?: string) =>
      ipcRenderer.invoke(IPC.stylesVariableGraph, projectPath, themeId, outputDir)
  },
  fonts: {
    importFile: (projectPath: string, sourcePath: string, family: string) =>
      ipcRenderer.invoke(IPC.fontsImportFile, projectPath, sourcePath, family)
  },
  localization: {
    list: (projectPath: string) => ipcRenderer.invoke(IPC.localizationList, projectPath),
    getEntries: (projectPath: string, code: string) => ipcRenderer.invoke(IPC.localizationGetEntries, projectPath, code),
    saveEntry: (projectPath: string, code: string, path: string[], kind: 'string' | 'template', value: string) =>
      ipcRenderer.invoke(IPC.localizationSaveEntry, projectPath, code, path, kind, value),
    gitAttributesStatus: (projectPath: string) => ipcRenderer.invoke(IPC.localizationGitAttributesStatus, projectPath),
    ensureGitAttributes: (projectPath: string) => ipcRenderer.invoke(IPC.localizationEnsureGitAttributes, projectPath)
  },
  snapshots: {
    list: (projectPath: string) => ipcRenderer.invoke(IPC.snapshotList, projectPath),
    create: (projectPath: string, kind: SnapshotKind, label?: string) =>
      ipcRenderer.invoke(IPC.snapshotCreate, projectPath, kind, label),
    diff: (projectPath: string, id: string) => ipcRenderer.invoke(IPC.snapshotDiff, projectPath, id),
    fileDiff: (projectPath: string, id: string, path: string) =>
      ipcRenderer.invoke(IPC.snapshotFileDiff, projectPath, id, path),
    restore: (projectPath: string, id: string, options?: RestoreOptions) =>
      ipcRenderer.invoke(IPC.snapshotRestore, projectPath, id, options),
    delete: (projectPath: string, id: string) => ipcRenderer.invoke(IPC.snapshotDelete, projectPath, id),
    export: (projectPath: string, id: string) => ipcRenderer.invoke(IPC.snapshotExport, projectPath, id),
    settings: (projectPath: string) => ipcRenderer.invoke(IPC.snapshotSettings, projectPath),
    saveSettings: (projectPath: string, includeContent: boolean) =>
      ipcRenderer.invoke(IPC.snapshotSaveSettings, projectPath, includeContent)
  },
  updates: {
    coreStatus: (projectPath: string) => ipcRenderer.invoke(IPC.updateCoreStatus, projectPath),
    runCoreUpdate: (projectPath: string) => ipcRenderer.invoke(IPC.updateCoreRun, projectPath),
    abortCoreMerge: (projectPath: string) => ipcRenderer.invoke(IPC.updateCoreAbort, projectPath),
    pluginsStatus: (projectPath: string) => ipcRenderer.invoke(IPC.updatePluginsStatus, projectPath),
    updatePlugin: (projectPath: string, name?: string) => ipcRenderer.invoke(IPC.updatePluginRun, projectPath, name)
  },
  connections: {
    list: () => ipcRenderer.invoke(IPC.connectionsList),
    save: (input: SaveConnectionInput) => ipcRenderer.invoke(IPC.connectionSave, input),
    delete: (id: string) => ipcRenderer.invoke(IPC.connectionDelete, id),
    usage: (id: string) => ipcRenderer.invoke(IPC.connectionUsage, id),
    forgetHostKey: (id: string) => ipcRenderer.invoke(IPC.connectionForgetHostKey, id)
  },
  github: {
    viewer: () => ipcRenderer.invoke(IPC.githubViewer),
    originRepo: (projectPath: string) => ipcRenderer.invoke(IPC.githubOriginRepo, projectPath),
    createRepo: (projectPath: string, input: { name: string; private: boolean; description?: string }) =>
      ipcRenderer.invoke(IPC.githubCreateRepo, projectPath, input),
    pagesInfo: (projectPath: string) => ipcRenderer.invoke(IPC.githubPagesInfo, projectPath),
    configurePages: (projectPath: string, input: { branch: string; cname?: string | null; httpsEnforced?: boolean }) =>
      ipcRenderer.invoke(IPC.githubConfigurePages, projectPath, input)
  },
  publishTargets: {
    list: (projectPath: string) => ipcRenderer.invoke(IPC.publishTargetsList, projectPath),
    save: (projectPath: string, input: SavePublishTargetInput) =>
      ipcRenderer.invoke(IPC.publishTargetSave, projectPath, input),
    delete: (projectPath: string, id: string) => ipcRenderer.invoke(IPC.publishTargetDelete, projectPath, id)
  },
  deploy: {
    diff: (projectPath: string, targetId: string, outputDir?: string) =>
      ipcRenderer.invoke(IPC.deployDiff, projectPath, targetId, outputDir),
    run: (projectPath: string, targetId: string, outputDir: string | undefined, excludePaths: string[]) =>
      ipcRenderer.invoke(IPC.deployRun, projectPath, targetId, outputDir, excludePaths),
    forgetManifest: (projectPath: string, targetId: string) =>
      ipcRenderer.invoke(IPC.deployForgetManifest, projectPath, targetId),
    onProgress: (cb: (event: DeployProgressEvent) => void) => onEvent<[DeployProgressEvent]>(IPC.deployProgress, cb)
  },
  templatePackage: {
    inspect: (projectPath: string) => ipcRenderer.invoke(IPC.templatePackageInspect, projectPath),
    pick: () => ipcRenderer.invoke(IPC.templatePackagePick),
    export: (projectPath: string, options: TemplateExportOptions) =>
      ipcRenderer.invoke(IPC.templatePackageExport, projectPath, options),
    plan: (projectPath: string, packagePath: string) => ipcRenderer.invoke(IPC.templatePackagePlan, projectPath, packagePath),
    import: (projectPath: string, packagePath: string, parts: TemplatePartId[], strategy: TemplateConflictStrategy) =>
      ipcRenderer.invoke(IPC.templatePackageImport, projectPath, packagePath, parts, strategy),
    onProgress: (cb: (progress: TemplateImportProgress) => void) =>
      onEvent<[TemplateImportProgress]>(IPC.templatePackageProgress, cb)
  },
  themeMarketplace: {
    list: () => ipcRenderer.invoke(IPC.themeMarketplaceList),
    refresh: () => ipcRenderer.invoke(IPC.themeMarketplaceRefresh),
    install: (projectPath: string, themeId: string) => ipcRenderer.invoke(IPC.themeMarketplaceInstall, projectPath, themeId),
    detail: (projectPath: string, themeId: string) => ipcRenderer.invoke(IPC.themeMarketplaceDetail, projectPath, themeId),
    styleSettingsSchema: (themeId: string) => ipcRenderer.invoke(IPC.themeMarketplaceStyleSettingsSchema, themeId),
    refreshStyleSettingsSchema: (themeId: string) =>
      ipcRenderer.invoke(IPC.themeMarketplaceRefreshStyleSettingsSchema, themeId)
  },
  themePresets: {
    list: (projectPath: string) => ipcRenderer.invoke(IPC.themePresetList, projectPath),
    save: (projectPath: string, preset: ThemePreset) => ipcRenderer.invoke(IPC.themePresetSave, projectPath, preset),
    delete: (projectPath: string, id: string) => ipcRenderer.invoke(IPC.themePresetDelete, projectPath, id)
  },
  marketplace: {
    list: () => ipcRenderer.invoke(IPC.marketplaceList),
    refresh: () => ipcRenderer.invoke(IPC.marketplaceRefresh)
  },
  server: {
    start: (projectId: string, projectPath: string, options?: ServerOptions) =>
      ipcRenderer.invoke(IPC.serverStart, projectId, projectPath, options),
    stop: (projectId: string) => ipcRenderer.invoke(IPC.serverStop, projectId),
    restart: (projectId: string, projectPath: string, options?: ServerOptions) =>
      ipcRenderer.invoke(IPC.serverRestart, projectId, projectPath, options),
    status: (projectId: string) => ipcRenderer.invoke(IPC.serverStatus, projectId),
    onLog: (cb: (line: LogLine) => void) => onEvent<[LogLine]>(IPC.serverLog, cb),
    onStatus: (cb: (projectId: string, status: ServerStatus) => void) =>
      onEvent<[string, ServerStatus]>(IPC.serverStatusChanged, cb)
  },
  build: {
    run: (projectId: string, projectPath: string, outputDir?: string) =>
      ipcRenderer.invoke(IPC.buildRun, projectId, projectPath, outputDir),
    onLog: (cb: (line: LogLine) => void) => onEvent<[LogLine]>(IPC.buildLog, cb),
    lastOutput: (projectPath: string, outputDir?: string) =>
      ipcRenderer.invoke(IPC.buildLastOutput, projectPath, outputDir)
  },
  projectPrefs: {
    get: (projectPath: string) => ipcRenderer.invoke(IPC.projectPrefsGet, projectPath),
    save: (projectPath: string, prefs: ProjectPrefs) => ipcRenderer.invoke(IPC.projectPrefsSave, projectPath, prefs)
  },
  sync: {
    run: (projectPath: string, direction?: 'push' | 'pull' | 'both', options?: SyncOptions) =>
      ipcRenderer.invoke(IPC.syncRun, projectPath, direction, options),
    status: (projectPath: string) => ipcRenderer.invoke(IPC.syncStatus, projectPath)
  },
  backups: {
    listContentFolders: (projectPath: string) => ipcRenderer.invoke(IPC.backupList, projectPath),
    restoreContentFolder: (projectPath: string, id: string) => ipcRenderer.invoke(IPC.backupRestore, projectPath, id),
    deleteContentFolder: (projectPath: string, id: string) => ipcRenderer.invoke(IPC.backupDelete, projectPath, id)
  },
  content: {
    status: (projectPath: string) => ipcRenderer.invoke(IPC.contentStatus, projectPath),
    change: (projectId: string, projectPath: string, sourcePath: string, strategy: ContentStrategy) =>
      ipcRenderer.invoke(IPC.contentChange, projectId, projectPath, sourcePath, strategy),
    onProgress: (cb: (progress: ContentProgress) => void) => onEvent<[ContentProgress]>(IPC.contentProgress, cb)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.settingsGet),
    save: (settings: Settings) => ipcRenderer.invoke(IPC.settingsSave, settings),
    appInfo: () => ipcRenderer.invoke(IPC.settingsAppInfo),
    environment: () => ipcRenderer.invoke(IPC.settingsEnvironment),
    clearThemeDocsCache: () => ipcRenderer.invoke(IPC.settingsClearThemeDocsCache)
  },
  dialog: {
    pickFolder: (defaultPath?: string) => ipcRenderer.invoke(IPC.dialogPickFolder, defaultPath),
    pickFile: (filters?: { name: string; extensions: string[] }[]) => ipcRenderer.invoke(IPC.dialogPickFile, filters),
    openPath: (path: string) => ipcRenderer.invoke(IPC.dialogOpenPath, path),
    revealUserData: () => ipcRenderer.invoke(IPC.dialogRevealUserData),
    openExternal: (url: string) => ipcRenderer.invoke(IPC.dialogOpenExternal, url),
    confirm: (options: ConfirmDialogOptions) => ipcRenderer.invoke(IPC.dialogConfirm, options)
  },
  menu: {
    onNavigate: (cb: (hashPath: string) => void) => {
      const listener = (_e: unknown, hashPath: string): void => cb(hashPath)
      ipcRenderer.on(IPC.appNavigate, listener)
      return () => ipcRenderer.removeListener(IPC.appNavigate, listener)
    },
    onCommand: (cb: (command: AppCommand) => void) => {
      const listener = (_e: unknown, command: AppCommand): void => cb(command)
      ipcRenderer.on(IPC.appCommand, listener)
      return () => ipcRenderer.removeListener(IPC.appCommand, listener)
    }
  }
}

contextBridge.exposeInMainWorld('quartzGui', api)
