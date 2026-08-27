import { ipcMain, BrowserWindow, dialog, shell } from 'electron'
import { resolve, sep } from 'path'
import { z } from 'zod'
import { IPC } from '@shared/ipc-contract'
import type {
  CreateProjectOptions,
  GridFrameDefinition,
  QuartzConfig,
  SaveConnectionInput,
  SavePublishTargetInput,
  ServerOptions,
  Settings,
  ThemePreset
} from '@shared/ipc-contract'
import * as projectStore from '../services/projectStore'
import * as configService from '../services/configService'
import * as pluginService from '../services/pluginService'
import * as pluginSchemaService from '../services/pluginSchemaService'
import * as themeMarketplaceService from '../services/themeMarketplaceService'
import * as styleSettingsSchemaService from '../services/styleSettingsSchemaService'
import * as themePresetsService from '../services/themePresetsService'
import * as layoutFrameService from '../services/layoutFrameService'
import * as styleService from '../services/styleService'
import * as variableGraphService from '../services/variableGraphService'
import * as fontService from '../services/fontService'
import * as localizationService from '../services/localizationService'
import * as updateService from '../services/updateService'
import * as connectionsService from '../services/connectionsService'
import * as publishTargetsService from '../services/publishTargetsService'
import * as githubService from '../services/githubService'
import * as deployService from '../services/deploy'
import * as marketplaceService from '../services/marketplaceService'
import * as buildService from '../services/buildService'
import * as syncService from '../services/syncService'
import * as gitStatusService from '../services/gitStatusService'
import * as backupService from '../services/backupService'
import * as contentService from '../services/contentService'
import * as createService from '../services/createService'
import * as settingsService from '../services/settingsService'
import * as templatePackageService from '../services/templatePackageService'
import { handle, handleNoArgs } from './handle'
import * as s from './schemas'

const t = z.tuple

// Why the `as` casts on the payload handlers below: the schemas in schemas.ts are deliberately
// *looser* than the contract types - they use looseObject/record so unknown keys survive a
// round-trip to disk (see the note at the top of schemas.ts). Writing a zod mirror of every
// contract type precise enough to infer identically would duplicate ipc-contract.ts, which
// CLAUDE.md designates the single source of truth, and the copy would drift. So the schema
// enforces the security-relevant shape at runtime and the cast restates the contract's own type,
// which the renderer already had to satisfy to call the API at all.

function broadcast(channel: string, ...args: unknown[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, ...args)
  }
}

// shell.openPath hands the path to the OS, which happily launches an .app bundle or an executable.
// Both renderer call sites (StyleEditor's "extern öffnen") pass a file inside the open project, so
// restricting it to registered project directories costs nothing and stops the channel from being
// a general "run anything on this machine" primitive.
async function openPathWithinProject(path: string): Promise<string> {
  const target = resolve(path)
  const projects = await projectStore.listProjects()
  const allowed = projects.some((p) => {
    const root = resolve(p.path)
    return target === root || target.startsWith(root + sep)
  })
  if (!allowed) {
    console.error(`[ipc] openPath außerhalb jedes registrierten Projekts abgelehnt: ${target}`)
    throw new Error('Pfad liegt außerhalb der registrierten Projekte.')
  }
  return shell.openPath(target)
}

let handlersRegistered = false

export function registerIpcHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true

  buildService.serverEvents.on('log', (line) => broadcast(IPC.serverLog, line))
  buildService.serverEvents.on('buildLog', (line) => broadcast(IPC.buildLog, line))
  buildService.serverEvents.on('status', (projectId, status) => broadcast(IPC.serverStatusChanged, projectId, status))
  deployService.deployEvents.on('progress', (event) => broadcast(IPC.deployProgress, event))

  handleNoArgs(IPC.projectList, () => projectStore.listProjects())
  handle(IPC.projectAdd, t([s.absolutePath]), (path) => projectStore.addProject(path))
  handle(IPC.projectOpen, t([s.uuid]), async (id) => {
    await projectStore.touchProject(id)
    return projectStore.getProject(id)
  })
  handle(IPC.projectRemove, t([s.uuid]), (id) => projectStore.removeProject(id))
  handle(IPC.projectCreate, t([s.createProjectOptions]), async (options) => {
    const result = await createService.createProject(options as CreateProjectOptions)
    if (result.success) await projectStore.addProject(options.targetDirectory)
    return result
  })

  handle(IPC.configGet, t([s.absolutePath]), (projectPath) => configService.readConfig(projectPath))
  handle(IPC.configSave, t([s.absolutePath, s.quartzConfig]), (projectPath, config) =>
    configService.writeConfig(projectPath, config as QuartzConfig)
  )

  handle(IPC.pluginAdd, t([s.absolutePath, s.pluginSource]), (projectPath, source) =>
    pluginService.addPlugin(projectPath, source)
  )
  handle(IPC.pluginRemove, t([s.absolutePath, s.pluginName]), (projectPath, name) =>
    pluginService.removePlugin(projectPath, name)
  )
  handle(IPC.pluginOptionsSchema, t([s.absolutePath, s.pluginName]), (projectPath, name) =>
    pluginSchemaService.getPluginOptionsSchema(projectPath, name)
  )
  handle(IPC.pluginThemeStyleSettingsInfo, t([s.absolutePath, s.themeId]), (projectPath, themeId) =>
    pluginSchemaService.getThemeStyleSettingsInfo(projectPath, themeId)
  )

  handleNoArgs(IPC.themeMarketplaceList, () => themeMarketplaceService.listThemes())
  handle(IPC.themeMarketplaceInstall, t([s.absolutePath, s.themeId]), (projectPath, themeId) =>
    themeMarketplaceService.installTheme(projectPath, themeId)
  )
  handle(IPC.themeMarketplaceStyleSettingsSchema, t([s.themeId]), (themeId) =>
    styleSettingsSchemaService.getStyleSettingsSchema(themeId)
  )
  handle(IPC.themeMarketplaceRefreshStyleSettingsSchema, t([s.themeId]), async (themeId) => {
    await styleSettingsSchemaService.clearStyleSettingsSchemaCache(themeId)
    return styleSettingsSchemaService.getStyleSettingsSchema(themeId)
  })
  handle(IPC.themeMarketplaceDetail, t([s.absolutePath, s.themeId]), (projectPath, themeId) =>
    themeMarketplaceService.getThemeDetail(projectPath, themeId)
  )

  handle(IPC.themePresetList, t([s.absolutePath]), (projectPath) => themePresetsService.listPresets(projectPath))
  handle(IPC.themePresetSave, t([s.absolutePath, s.themePreset]), (projectPath, preset) =>
    themePresetsService.savePreset(projectPath, preset as ThemePreset)
  )
  handle(IPC.themePresetDelete, t([s.absolutePath, s.shortText]), (projectPath, id) =>
    themePresetsService.deletePreset(projectPath, id)
  )

  handle(IPC.pluginInstallFromLock, t([s.absolutePath]), (projectPath) => pluginService.installFromLock(projectPath))
  handle(IPC.pluginPrune, t([s.absolutePath]), (projectPath) => pluginService.prunePlugins(projectPath))

  handle(IPC.layoutFrameList, t([s.absolutePath]), (projectPath) => layoutFrameService.listFrames(projectPath))
  handle(IPC.layoutFrameSave, t([s.absolutePath, s.gridFrameDefinition]), (projectPath, def) =>
    layoutFrameService.saveFrame(projectPath, def as GridFrameDefinition)
  )
  handle(IPC.layoutFrameDelete, t([s.absolutePath, s.frameId]), (projectPath, id) =>
    layoutFrameService.deleteFrame(projectPath, id)
  )
  handle(IPC.layoutFrameBuiltinPageTypeFrames, t([s.absolutePath, s.pluginSourceList]), (projectPath, plugins) =>
    pluginSchemaService.discoverBuiltinPageTypeFrames(projectPath, plugins as { name: string; source: unknown }[])
  )

  handle(IPC.stylesGet, t([s.absolutePath]), (projectPath) => styleService.readCustomScss(projectPath))
  handle(IPC.stylesSave, t([s.absolutePath, s.longText]), (projectPath, content) =>
    styleService.writeCustomScss(projectPath, content)
  )
  handle(IPC.stylesReference, t([s.absolutePath, s.pluginName]), (projectPath, pluginName) =>
    styleService.getStyleReferences(projectPath, pluginName)
  )
  handle(IPC.stylesImportFile, t([s.absolutePath, s.absolutePath]), (projectPath, sourcePath) =>
    styleService.importStyleFile(projectPath, sourcePath)
  )
  handle(IPC.stylesListFiles, t([s.absolutePath]), (projectPath) => styleService.listStyleFiles(projectPath))
  handle(IPC.stylesReadFile, t([s.absolutePath, s.styleFileSubPath]), (projectPath, relativePath) =>
    styleService.readStyleFile(projectPath, relativePath)
  )
  handle(
    IPC.stylesSaveFile,
    t([s.absolutePath, s.styleFileSubPath, s.longText]),
    (projectPath, relativePath, content) => styleService.writeStyleFile(projectPath, relativePath, content)
  )
  handle(IPC.stylesCreateFile, t([s.absolutePath, s.styleFileName]), (projectPath, name) =>
    styleService.createStyleFile(projectPath, name)
  )
  handle(
    IPC.stylesRenameFile,
    t([s.absolutePath, s.styleFileSubPath, s.styleFileName]),
    (projectPath, relativePath, newName) => styleService.renameStyleFile(projectPath, relativePath, newName)
  )
  handle(IPC.stylesDeleteFile, t([s.absolutePath, s.styleFileSubPath]), (projectPath, relativePath) =>
    styleService.deleteStyleFile(projectPath, relativePath)
  )
  handle(
    IPC.stylesSetImportOrder,
    t([s.absolutePath, z.array(s.styleFileSubPath).max(200)]),
    (projectPath, relativePaths) => styleService.setImportOrder(projectPath, relativePaths)
  )
  handle(IPC.stylesCheck, t([s.absolutePath]), (projectPath) => styleService.checkStyles(projectPath))
  handle(
    IPC.stylesCheckSource,
    t([s.absolutePath, s.styleEntryPath, s.longText]),
    (projectPath, relativePath, content) => styleService.checkStyleSource(projectPath, relativePath, content)
  )
  handle(IPC.stylesFontFaces, t([s.absolutePath, s.themeId.optional()]), (projectPath, themeId) =>
    styleService.collectFontFaces(projectPath, themeId)
  )
  handle(IPC.stylesGetVariableOverrides, t([s.absolutePath]), (projectPath) =>
    styleService.getVariableOverrides(projectPath)
  )
  handle(
    IPC.stylesSaveVariableOverrides,
    t([s.absolutePath, z.array(s.cssVariableOverride).max(1000)]),
    (projectPath, overrides) => styleService.saveVariableOverrides(projectPath, overrides)
  )
  handle(IPC.stylesScanBuildOutputVariables, t([s.absolutePath, s.buildOutputDir.optional()]), (projectPath, outputDir) =>
    styleService.scanBuildOutputVariables(projectPath, outputDir)
  )
  handle(
    IPC.stylesVariableGraph,
    t([s.absolutePath, s.themeId.optional(), s.buildOutputDir.optional()]),
    (projectPath, themeId, outputDir) => variableGraphService.getVariableGraph(projectPath, themeId, outputDir)
  )

  handle(IPC.fontsImportFile, t([s.absolutePath, s.absolutePath, s.shortText]), (projectPath, sourcePath, family) =>
    fontService.importFontFile(projectPath, sourcePath, family)
  )

  handle(IPC.localizationList, t([s.absolutePath]), (projectPath) => localizationService.listLocales(projectPath))
  handle(IPC.localizationGetEntries, t([s.absolutePath, s.localeCode]), (projectPath, code) =>
    localizationService.getLocaleEntries(projectPath, code)
  )
  handle(
    IPC.localizationSaveEntry,
    t([s.absolutePath, s.localeCode, z.array(z.string().max(200)).min(1).max(20), z.enum(['string', 'template']), s.longText]),
    (projectPath, code, path, kind, value) => localizationService.saveLocaleEntry(projectPath, code, path, kind, value)
  )
  handle(IPC.localizationGitAttributesStatus, t([s.absolutePath]), (projectPath) =>
    localizationService.getGitAttributesStatus(projectPath)
  )
  handle(IPC.localizationEnsureGitAttributes, t([s.absolutePath]), (projectPath) =>
    localizationService.ensureGitAttributes(projectPath)
  )

  handle(IPC.updateCoreStatus, t([s.absolutePath]), (projectPath) => updateService.getCoreUpdateStatus(projectPath))
  handle(IPC.updateCoreRun, t([s.absolutePath]), (projectPath) => updateService.runCoreUpdate(projectPath))
  handle(IPC.updateCoreAbort, t([s.absolutePath]), (projectPath) => updateService.abortCoreMerge(projectPath))
  handle(IPC.updatePluginsStatus, t([s.absolutePath]), (projectPath) => updateService.getPluginsUpdateStatus(projectPath))
  handle(IPC.updatePluginRun, t([s.absolutePath, s.pluginName.optional()]), (projectPath, name) =>
    updateService.updatePlugin(projectPath, name)
  )
  handle(IPC.updateSnapshotList, t([s.absolutePath]), (projectPath) => updateService.listSnapshots(projectPath))
  handle(IPC.updateSnapshotRestore, t([s.absolutePath, s.snapshotTag]), (projectPath, tag) =>
    updateService.restoreSnapshot(projectPath, tag)
  )

  handleNoArgs(IPC.connectionsList, () => connectionsService.listConnections())
  handle(IPC.connectionSave, t([s.saveConnectionInput]), (input) =>
    connectionsService.saveConnection(input as SaveConnectionInput)
  )
  handle(IPC.connectionDelete, t([s.uuid]), (id) => connectionsService.deleteConnection(id))
  handle(IPC.connectionForgetHostKey, t([s.uuid]), (id) => connectionsService.forgetHostKey(id))
  // Asked across every registered project, because a connection is app-level while the targets
  // that reference it are not - only the union answers "is this still in use anywhere?".
  handle(IPC.connectionUsage, t([s.uuid]), async (id) => {
    const projects = await projectStore.listProjects()
    const usage: { projectPath: string; targetName: string }[] = []
    for (const project of projects) {
      for (const target of await publishTargetsService.targetsUsingConnection(project.path, id)) {
        usage.push({ projectPath: project.path, targetName: target.name })
      }
    }
    return usage
  })

  handleNoArgs(IPC.githubViewer, () => githubService.getViewer())
  handle(IPC.githubOriginRepo, t([s.absolutePath]), (projectPath) => githubService.getOriginRepo(projectPath))
  handle(IPC.githubCreateRepo, t([s.absolutePath, s.createRepoInput]), (projectPath, input) =>
    githubService.createRepo(projectPath, input as { name: string; private: boolean; description?: string })
  )
  handle(IPC.githubPagesInfo, t([s.absolutePath]), (projectPath) => githubService.getPagesInfo(projectPath))
  handle(IPC.githubConfigurePages, t([s.absolutePath, s.configurePagesInput]), (projectPath, input) =>
    githubService.configurePages(projectPath, input as { branch: string; cname?: string | null; httpsEnforced?: boolean })
  )

  handle(IPC.publishTargetsList, t([s.absolutePath]), (projectPath) => publishTargetsService.listTargets(projectPath))
  handle(IPC.publishTargetSave, t([s.absolutePath, s.savePublishTargetInput]), (projectPath, input) =>
    publishTargetsService.saveTarget(projectPath, input as SavePublishTargetInput)
  )
  handle(IPC.publishTargetDelete, t([s.absolutePath, s.uuid]), (projectPath, id) =>
    publishTargetsService.deleteTarget(projectPath, id)
  )

  handle(IPC.deployDiff, t([s.absolutePath, s.uuid, s.buildOutputDir.optional()]), (projectPath, targetId, outputDir) =>
    deployService.previewDeploy(projectPath, targetId, outputDir)
  )
  handle(
    IPC.deployRun,
    t([s.absolutePath, s.uuid, s.buildOutputDir.optional(), s.excludePaths]),
    (projectPath, targetId, outputDir, excludePaths) =>
      deployService.runDeploy(projectPath, targetId, outputDir, excludePaths)
  )

  handle(
    IPC.templatePackageExport,
    t([s.absolutePath, s.absolutePath, z.string().min(1).max(200), z.array(s.templatePackageCategory).max(6)]),
    (projectPath, destDir, name, categories) => templatePackageService.exportPackage(projectPath, destDir, name, categories)
  )
  handle(IPC.templatePackagePreview, t([s.absolutePath]), (sourceDir) => templatePackageService.previewPackage(sourceDir))
  handle(
    IPC.templatePackageImport,
    t([s.absolutePath, s.absolutePath, z.array(s.templatePackageCategory).max(6)]),
    (projectPath, sourceDir, categories) => templatePackageService.importPackage(projectPath, sourceDir, categories)
  )

  handle(IPC.marketplaceSearch, t([s.shortText]), (query) => marketplaceService.searchPlugins(query))
  handleNoArgs(IPC.marketplaceRefresh, () => {
    marketplaceService.invalidateCache()
  })

  handle(IPC.serverStart, t([s.uuid, s.absolutePath, s.serverOptions.optional()]), (projectId, projectPath, options) =>
    buildService.startServer(projectId, projectPath, options as ServerOptions | undefined)
  )
  handle(IPC.serverStop, t([s.uuid]), (projectId) => buildService.stopServer(projectId))
  handle(IPC.serverRestart, t([s.uuid, s.absolutePath, s.serverOptions.optional()]), (projectId, projectPath, options) =>
    buildService.restartServer(projectId, projectPath, options as ServerOptions | undefined)
  )
  handle(IPC.serverStatus, t([s.uuid]), (projectId) => buildService.getServerStatus(projectId))

  handle(IPC.buildRun, t([s.uuid, s.absolutePath, s.buildOutputDir.optional()]), (projectId, projectPath, outputDir) =>
    buildService.runBuild(projectId, projectPath, outputDir)
  )

  handle(IPC.syncStatus, t([s.absolutePath]), (projectPath) => gitStatusService.getGitStatus(projectPath))

  handle(IPC.syncRun, t([s.absolutePath, s.syncDirection.optional()]), (projectPath, direction) =>
    syncService.runSync(projectPath, direction)
  )

  handle(IPC.backupList, t([s.absolutePath, s.backupKind]), (projectPath, kind) =>
    kind === 'config' ? backupService.listConfigBackups(projectPath) : backupService.listContentBackups(projectPath)
  )
  handle(IPC.backupDiff, t([s.absolutePath, s.backupId]), (projectPath, id) =>
    backupService.diffConfigBackup(projectPath, id)
  )
  handle(IPC.backupRestore, t([s.absolutePath, s.backupKind, s.backupId]), (projectPath, kind, id) =>
    kind === 'config'
      ? backupService.restoreConfigBackup(projectPath, id)
      : backupService.restoreContentBackup(projectPath, contentService.contentDirPath(projectPath), id)
  )

  handle(IPC.contentStatus, t([s.absolutePath]), (projectPath) => contentService.getContentStatus(projectPath))
  handle(
    IPC.contentChange,
    t([s.uuid, s.absolutePath, s.absolutePath, s.contentStrategy]),
    (projectId, projectPath, sourcePath, strategy) =>
      contentService.changeContentSource(projectPath, sourcePath, strategy, (processed, total, currentFile) =>
        broadcast(IPC.contentProgress, { projectId, processed, total, currentFile })
      )
  )

  handleNoArgs(IPC.settingsGet, () => settingsService.getSettings())
  handle(IPC.settingsSave, t([s.settings]), (next) => settingsService.saveSettings(next as Settings))

  handleNoArgs(IPC.dialogPickFolder, async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  handle(IPC.dialogPickFile, t([s.dialogFileFilters.optional()]), async (filters) => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'], filters })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  handle(IPC.dialogOpenPath, t([s.absolutePath]), (path) => openPathWithinProject(path))
}
