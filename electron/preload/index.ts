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
  ThemePreset
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
    run: (projectId: string, projectPath: string) => ipcRenderer.invoke(IPC.buildRun, projectId, projectPath),
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
    pickFolder: () => ipcRenderer.invoke(IPC.dialogPickFolder)
  }
}

contextBridge.exposeInMainWorld('quartzGui', api)
