import { ipcMain, BrowserWindow, dialog } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  QuartzConfig,
  ServerOptions,
  ContentStrategy,
  Settings,
  CreateProjectOptions,
  ThemePreset,
  GridFrameDefinition
} from '@shared/ipc-contract'
import * as projectStore from '../services/projectStore'
import * as configService from '../services/configService'
import * as pluginService from '../services/pluginService'
import * as pluginSchemaService from '../services/pluginSchemaService'
import * as themeMarketplaceService from '../services/themeMarketplaceService'
import * as themePresetsService from '../services/themePresetsService'
import * as layoutFrameService from '../services/layoutFrameService'
import * as marketplaceService from '../services/marketplaceService'
import * as buildService from '../services/buildService'
import * as syncService from '../services/syncService'
import * as backupService from '../services/backupService'
import * as contentService from '../services/contentService'
import * as createService from '../services/createService'
import * as settingsService from '../services/settingsService'

function broadcast(channel: string, ...args: unknown[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, ...args)
  }
}

let handlersRegistered = false

export function registerIpcHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true

  buildService.serverEvents.on('log', (line) => broadcast(IPC.serverLog, line))
  buildService.serverEvents.on('buildLog', (line) => broadcast(IPC.buildLog, line))
  buildService.serverEvents.on('status', (projectId, status) => broadcast(IPC.serverStatusChanged, projectId, status))

  ipcMain.handle(IPC.projectList, () => projectStore.listProjects())
  ipcMain.handle(IPC.projectAdd, (_e, path: string) => projectStore.addProject(path))
  ipcMain.handle(IPC.projectOpen, async (_e, id: string) => {
    await projectStore.touchProject(id)
    return projectStore.getProject(id)
  })
  ipcMain.handle(IPC.projectRemove, (_e, id: string) => projectStore.removeProject(id))
  ipcMain.handle(IPC.projectCreate, async (_e, options: CreateProjectOptions) => {
    const result = await createService.createProject(options)
    if (result.success) await projectStore.addProject(options.targetDirectory)
    return result
  })

  ipcMain.handle(IPC.configGet, (_e, projectPath: string) => configService.readConfig(projectPath))
  ipcMain.handle(IPC.configSave, (_e, projectPath: string, config: QuartzConfig) =>
    configService.writeConfig(projectPath, config)
  )

  ipcMain.handle(IPC.pluginAdd, (_e, projectPath: string, source: string) => pluginService.addPlugin(projectPath, source))
  ipcMain.handle(IPC.pluginRemove, (_e, projectPath: string, name: string) =>
    pluginService.removePlugin(projectPath, name)
  )
  ipcMain.handle(IPC.pluginOptionsSchema, (_e, projectPath: string, name: string) =>
    pluginSchemaService.getPluginOptionsSchema(projectPath, name)
  )
  ipcMain.handle(IPC.pluginThemeStyleSettingsInfo, (_e, projectPath: string, themeId: string) =>
    pluginSchemaService.getThemeStyleSettingsInfo(projectPath, themeId)
  )

  ipcMain.handle(IPC.themeMarketplaceList, (_e, githubToken?: string) => themeMarketplaceService.listThemes(githubToken))
  ipcMain.handle(IPC.themeMarketplaceInstall, (_e, projectPath: string, themeId: string) =>
    themeMarketplaceService.installTheme(projectPath, themeId)
  )
  ipcMain.handle(IPC.themeMarketplaceDetail, (_e, projectPath: string, themeId: string) =>
    themeMarketplaceService.getThemeDetail(projectPath, themeId)
  )

  ipcMain.handle(IPC.themePresetList, (_e, projectPath: string) => themePresetsService.listPresets(projectPath))
  ipcMain.handle(IPC.themePresetSave, (_e, projectPath: string, preset: ThemePreset) =>
    themePresetsService.savePreset(projectPath, preset)
  )
  ipcMain.handle(IPC.themePresetDelete, (_e, projectPath: string, id: string) =>
    themePresetsService.deletePreset(projectPath, id)
  )

  ipcMain.handle(IPC.pluginInstallFromLock, (_e, projectPath: string) => pluginService.installFromLock(projectPath))
  ipcMain.handle(IPC.pluginPrune, (_e, projectPath: string) => pluginService.prunePlugins(projectPath))

  ipcMain.handle(IPC.layoutFrameList, (_e, projectPath: string) => layoutFrameService.listFrames(projectPath))
  ipcMain.handle(IPC.layoutFrameSave, (_e, projectPath: string, def: GridFrameDefinition) =>
    layoutFrameService.saveFrame(projectPath, def)
  )
  ipcMain.handle(IPC.layoutFrameDelete, (_e, projectPath: string, id: string) => layoutFrameService.deleteFrame(projectPath, id))

  ipcMain.handle(IPC.marketplaceSearch, (_e, query: string, githubToken?: string) =>
    marketplaceService.searchPlugins(query, githubToken)
  )
  ipcMain.handle(IPC.marketplaceRefresh, () => {
    marketplaceService.invalidateCache()
  })

  ipcMain.handle(IPC.serverStart, (_e, projectId: string, projectPath: string, options?: ServerOptions) =>
    buildService.startServer(projectId, projectPath, options)
  )
  ipcMain.handle(IPC.serverStop, (_e, projectId: string) => buildService.stopServer(projectId))
  ipcMain.handle(IPC.serverRestart, (_e, projectId: string, projectPath: string, options?: ServerOptions) =>
    buildService.restartServer(projectId, projectPath, options)
  )
  ipcMain.handle(IPC.serverStatus, (_e, projectId: string) => buildService.getServerStatus(projectId))

  ipcMain.handle(IPC.buildRun, (_e, projectId: string, projectPath: string, outputDir?: string) =>
    buildService.runBuild(projectId, projectPath, outputDir)
  )

  ipcMain.handle(IPC.syncRun, (_e, projectPath: string, direction?: 'push' | 'pull' | 'both') =>
    syncService.runSync(projectPath, direction)
  )

  ipcMain.handle(IPC.backupList, (_e, projectPath: string, kind: 'config' | 'content') =>
    kind === 'config' ? backupService.listConfigBackups(projectPath) : backupService.listContentBackups(projectPath)
  )
  ipcMain.handle(IPC.backupDiff, (_e, projectPath: string, id: string) => backupService.diffConfigBackup(projectPath, id))
  ipcMain.handle(IPC.backupRestore, (_e, projectPath: string, kind: 'config' | 'content', id: string) =>
    kind === 'config'
      ? backupService.restoreConfigBackup(projectPath, id)
      : backupService.restoreContentBackup(projectPath, contentService.contentDirPath(projectPath), id)
  )

  ipcMain.handle(IPC.contentStatus, (_e, projectPath: string) => contentService.getContentStatus(projectPath))
  ipcMain.handle(
    IPC.contentChange,
    (_e, projectId: string, projectPath: string, sourcePath: string, strategy: ContentStrategy) =>
      contentService.changeContentSource(projectPath, sourcePath, strategy, (processed, total, currentFile) =>
        broadcast(IPC.contentProgress, { projectId, processed, total, currentFile })
      )
  )

  ipcMain.handle(IPC.settingsGet, () => settingsService.getSettings())
  ipcMain.handle(IPC.settingsSave, (_e, settings: Settings) => settingsService.saveSettings(settings))

  ipcMain.handle(IPC.dialogPickFolder, async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
}
