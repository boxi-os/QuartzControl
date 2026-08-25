import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
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
  PluginEntry,
  SaveDeployConnectionInput,
  GithubPagesDeployOptions,
  DeployProgressEvent,
  CssVariableOverride,
  TemplatePackageCategory
} from '@shared/ipc-contract'

function onEvent<Args extends unknown[]>(channel: string, cb: (...args: Args) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, ...args: Args): void => cb(...args)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: QuartzGuiApi = {
  projects: {
    list: () => ipcRenderer.invoke(IPC.projectList),
    add: (path: string) => ipcRenderer.invoke(IPC.projectAdd, path),
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
      ipcRenderer.invoke(IPC.layoutFrameBuiltinPageTypeFrames, projectPath, plugins)
  },
  styles: {
    get: (projectPath: string) => ipcRenderer.invoke(IPC.stylesGet, projectPath),
    save: (projectPath: string, content: string) => ipcRenderer.invoke(IPC.stylesSave, projectPath, content),
    reference: (projectPath: string, pluginName: string) => ipcRenderer.invoke(IPC.stylesReference, projectPath, pluginName),
    importFile: (projectPath: string, sourcePath: string) => ipcRenderer.invoke(IPC.stylesImportFile, projectPath, sourcePath),
    getVariableOverrides: (projectPath: string) => ipcRenderer.invoke(IPC.stylesGetVariableOverrides, projectPath),
    saveVariableOverrides: (projectPath: string, overrides: CssVariableOverride[]) =>
      ipcRenderer.invoke(IPC.stylesSaveVariableOverrides, projectPath, overrides),
    scanBuildOutputVariables: (projectPath: string, outputDir?: string) =>
      ipcRenderer.invoke(IPC.stylesScanBuildOutputVariables, projectPath, outputDir),
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
  updates: {
    coreStatus: (projectPath: string) => ipcRenderer.invoke(IPC.updateCoreStatus, projectPath),
    runCoreUpdate: (projectPath: string) => ipcRenderer.invoke(IPC.updateCoreRun, projectPath),
    abortCoreMerge: (projectPath: string) => ipcRenderer.invoke(IPC.updateCoreAbort, projectPath),
    pluginsStatus: (projectPath: string) => ipcRenderer.invoke(IPC.updatePluginsStatus, projectPath),
    updatePlugin: (projectPath: string, name?: string) => ipcRenderer.invoke(IPC.updatePluginRun, projectPath, name),
    listSnapshots: (projectPath: string) => ipcRenderer.invoke(IPC.updateSnapshotList, projectPath),
    restoreSnapshot: (projectPath: string, tag: string) => ipcRenderer.invoke(IPC.updateSnapshotRestore, projectPath, tag)
  },
  deploy: {
    listConnections: (projectPath: string) => ipcRenderer.invoke(IPC.deployConnectionsList, projectPath),
    saveConnection: (input: SaveDeployConnectionInput) => ipcRenderer.invoke(IPC.deployConnectionSave, input),
    deleteConnection: (id: string) => ipcRenderer.invoke(IPC.deployConnectionDelete, id),
    forgetHostKey: (id: string) => ipcRenderer.invoke(IPC.deployForgetHostKey, id),
    diff: (projectPath: string, outputDir?: string) => ipcRenderer.invoke(IPC.deployDiff, projectPath, outputDir),
    run: (connectionId: string, outputDir: string | undefined, excludePaths: string[]) =>
      ipcRenderer.invoke(IPC.deployRun, connectionId, outputDir, excludePaths),
    runGithubPages: (projectPath: string, outputDir: string | undefined, options: GithubPagesDeployOptions) =>
      ipcRenderer.invoke(IPC.deployGithubPagesRun, projectPath, outputDir, options),
    onProgress: (cb: (event: DeployProgressEvent) => void) => onEvent<[DeployProgressEvent]>(IPC.deployProgress, cb)
  },
  templatePackage: {
    export: (projectPath: string, destDir: string, name: string, categories: TemplatePackageCategory[]) =>
      ipcRenderer.invoke(IPC.templatePackageExport, projectPath, destDir, name, categories),
    preview: (sourceDir: string) => ipcRenderer.invoke(IPC.templatePackagePreview, sourceDir),
    import: (projectPath: string, sourceDir: string, categories: TemplatePackageCategory[]) =>
      ipcRenderer.invoke(IPC.templatePackageImport, projectPath, sourceDir, categories)
  },
  themeMarketplace: {
    list: (githubToken?: string) => ipcRenderer.invoke(IPC.themeMarketplaceList, githubToken),
    install: (projectPath: string, themeId: string) => ipcRenderer.invoke(IPC.themeMarketplaceInstall, projectPath, themeId),
    detail: (projectPath: string, themeId: string) => ipcRenderer.invoke(IPC.themeMarketplaceDetail, projectPath, themeId)
  },
  themePresets: {
    list: (projectPath: string) => ipcRenderer.invoke(IPC.themePresetList, projectPath),
    save: (projectPath: string, preset: ThemePreset) => ipcRenderer.invoke(IPC.themePresetSave, projectPath, preset),
    delete: (projectPath: string, id: string) => ipcRenderer.invoke(IPC.themePresetDelete, projectPath, id)
  },
  marketplace: {
    search: (query: string, githubToken?: string) => ipcRenderer.invoke(IPC.marketplaceSearch, query, githubToken),
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
    onLog: (cb: (line: LogLine) => void) => onEvent<[LogLine]>(IPC.buildLog, cb)
  },
  sync: {
    run: (projectPath: string, direction?: 'push' | 'pull' | 'both') =>
      ipcRenderer.invoke(IPC.syncRun, projectPath, direction)
  },
  backups: {
    list: (projectPath: string, kind: 'config' | 'content') => ipcRenderer.invoke(IPC.backupList, projectPath, kind),
    diff: (projectPath: string, id: string) => ipcRenderer.invoke(IPC.backupDiff, projectPath, id),
    restore: (projectPath: string, kind: 'config' | 'content', id: string) =>
      ipcRenderer.invoke(IPC.backupRestore, projectPath, kind, id)
  },
  content: {
    status: (projectPath: string) => ipcRenderer.invoke(IPC.contentStatus, projectPath),
    change: (projectId: string, projectPath: string, sourcePath: string, strategy: ContentStrategy) =>
      ipcRenderer.invoke(IPC.contentChange, projectId, projectPath, sourcePath, strategy),
    onProgress: (cb: (progress: ContentProgress) => void) => onEvent<[ContentProgress]>(IPC.contentProgress, cb)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC.settingsGet),
    save: (settings: Settings) => ipcRenderer.invoke(IPC.settingsSave, settings)
  },
  dialog: {
    pickFolder: () => ipcRenderer.invoke(IPC.dialogPickFolder),
    pickFile: (filters?: { name: string; extensions: string[] }[]) => ipcRenderer.invoke(IPC.dialogPickFile, filters),
    openPath: (path: string) => ipcRenderer.invoke(IPC.dialogOpenPath, path)
  }
}

contextBridge.exposeInMainWorld('quartzGui', api)
