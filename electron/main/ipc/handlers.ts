import { app, ipcMain, BrowserWindow, dialog, shell } from 'electron'
import { existsSync } from 'fs'
import { join, resolve, sep } from 'path'
import { z } from 'zod'
import { IPC, TEMPLATE_PACKAGE_EXTENSION } from '@shared/ipc-contract'
import type {
  CreateProjectOptions,
  DuplicateProjectOptions,
  GridFrameDefinition,
  ProjectPrefs,
  QuartzConfig,
  SaveConnectionInput,
  SavePublishTargetInput,
  ServerOptions,
  Settings,
  SyncOptions,
  TemplateExportOptions,
  ThemePreset
} from '@shared/ipc-contract'
import * as projectStore from '../services/projectStore'
import { repointProjectPaths } from '../services/projectPaths'
import * as projectOverviewService from '../services/projectOverviewService'
import * as projectIconService from '../services/projectIconService'
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
import { forgetManifest } from '../services/deploy/manifest'
import * as marketplaceService from '../services/marketplaceService'
import * as buildService from '../services/buildService'
import * as serverDiscovery from '../services/serverDiscovery'
import * as buildOutputGuard from '../services/buildOutputGuard'
import { resolveBuildDir } from '../services/projectDirs'
import * as projectPrefsService from '../services/projectPrefsService'
import * as syncService from '../services/syncService'
import * as gitStatusService from '../services/gitStatusService'
import * as backupService from '../services/backupService'
import * as snapshotService from '../services/snapshotService'
import * as contentService from '../services/contentService'
import * as createService from '../services/createService'
import * as duplicateService from '../services/duplicateService'
import * as builtinTemplateService from '../services/builtinTemplateService'
import * as appUpdateService from '../services/appUpdateService'
import * as environmentService from '../services/environmentService'
import * as nodeRuntime from '../services/nodeRuntime'
import * as gitRuntime from '../services/gitRuntime'
import * as settingsService from '../services/settingsService'
import * as templatePackageService from '../services/templatePackage'
import { applyTheme } from '../theme'
import { applyAppMenu, openHandbook } from '../menu'
import { mainT, type MainStringKey } from '../i18n'
import { handle, handleNoArgs } from './handle'
import * as s from './schemas'
import { clearLogHistory, logHistory, recordLogLine } from '../services/logBuffer'

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
    console.error(`[ipc] openPath outside every registered project, refused: ${target}`)
    throw new Error(mainT('openPathOutsideProjects'))
  }
  return shell.openPath(target)
}

let handlersRegistered = false

export function registerIpcHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true

  // Buffered *and* broadcast, in that order: a window that opens later reads the buffer, a window
  // that is open already gets the line as it happens - see services/logBuffer.ts.
  buildService.serverEvents.on('log', (line) => {
    recordLogLine('server', line)
    broadcast(IPC.serverLog, line)
  })
  buildService.serverEvents.on('buildLog', (line) => {
    recordLogLine('build', line)
    broadcast(IPC.buildLog, line)
  })
  buildService.serverEvents.on('status', (projectId, status) => broadcast(IPC.serverStatusChanged, projectId, status))
  deployService.deployEvents.on('progress', (event) => broadcast(IPC.deployProgress, event))

  handleNoArgs(IPC.projectList, () => projectStore.listProjects())
  handleNoArgs(IPC.projectOverview, () => projectOverviewService.getProjectOverviews())
  handle(IPC.projectAdd, t([s.absolutePath]), (path) => projectStore.addProject(path))
  handle(IPC.projectRelocate, t([s.uuid, s.absolutePath]), async (id, path) => {
    // Before the row moves, not after: an authored frame records its absolute path in three
    // places inside the project (see projectPaths.ts), and a renamed folder leaves all three
    // naming a directory that no longer exists - every frame dead, while the layout editor goes on
    // listing them. Repairing first means a failure here leaves the app exactly as it was, with
    // the message on the project row, rather than a moved entry pointing at a half-fixed project.
    const before = await projectStore.getProject(id)
    if (before && resolve(before.path) !== resolve(path)) await repointProjectPaths(before.path, path)
    return projectStore.relocateProject(id, path)
  })
  handle(IPC.projectOpen, t([s.uuid]), async (id) => {
    await projectStore.touchProject(id)
    return projectStore.getProject(id)
  })
  handle(IPC.projectRemove, t([s.uuid]), async (id) => {
    // Removing the entry is the last moment the app can still reach this project's dev server:
    // it is tracked by project id, so afterwards the process keeps serving with nothing in the UI
    // pointing at it and only a bare uuid left in running-servers.json for the next start's
    // orphan dialog to name. Measured before this: the removed project's site still answered on
    // its port and the tracking file still held the entry.
    await buildService.stopServer(id)
    await projectStore.removeProject(id)
  })
  handle(IPC.projectIconGet, t([s.projectIconTarget]), ({ projectPath }) => projectIconService.getProjectIcon(projectPath))
  handle(IPC.projectIconSet, t([s.projectIconSource]), ({ projectPath, sourcePath }) =>
    projectIconService.setProjectIcon(projectPath, sourcePath)
  )
  handle(IPC.projectIconClear, t([s.projectIconTarget]), ({ projectPath }) => projectIconService.clearProjectIcon(projectPath))

  handle(IPC.projectCreate, t([s.createProjectOptions]), async (options) => {
    const result = await createService.createProject(options as CreateProjectOptions)
    if (result.success) await projectStore.addProject(options.targetDirectory)
    return result
  })

  handle(IPC.projectDuplicate, t([s.duplicateProjectOptions]), async (options) => {
    const result = await duplicateService.duplicateProject(options as DuplicateProjectOptions)
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
  handleNoArgs(IPC.themeMarketplaceRefresh, () => {
    themeMarketplaceService.invalidateCache()
  })
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
  handle(IPC.layoutFrameGetBreakpoints, t([s.absolutePath]), (projectPath) =>
    layoutFrameService.getBreakpointWidths(projectPath)
  )
  handle(IPC.layoutFrameSaveBreakpoints, t([s.absolutePath, s.frameBreakpointWidths]), (projectPath, widths) =>
    layoutFrameService.saveBreakpointWidths(projectPath, widths)
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
  handle(IPC.deployForgetManifest, t([s.absolutePath, s.uuid]), (projectPath, targetId) =>
    forgetManifest(projectPath, targetId)
  )

  // A folder is selectable as well as a file: packages written before the single-file format are
  // folders, and they stay importable.
  handleNoArgs(IPC.templatePackagePick, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'openDirectory'],
      filters: [{ name: 'QuartzControl-Vorlage', extensions: [TEMPLATE_PACKAGE_EXTENSION.slice(1)] }]
    })
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
  })
  handle(IPC.templatePackageInspect, t([s.absolutePath]), (projectPath) => templatePackageService.inspectProject(projectPath))
  handleNoArgs(IPC.templatePackageBuiltin, () => builtinTemplateService.getBuiltinTemplate())
  handleNoArgs(IPC.appUpdateCheck, () => appUpdateService.checkAppUpdate())
  // The target file is chosen here rather than taken from the renderer, the same rule snapshot
  // export follows: an arbitrary path from there would let a page write a file anywhere on disk.
  handle(IPC.templatePackageExport, t([s.absolutePath, s.templateExportOptions]), async (projectPath, options) => {
    const result = await dialog.showSaveDialog({
      defaultPath: `${templatePackageService.slugifyFileName(options.name)}${TEMPLATE_PACKAGE_EXTENSION}`,
      filters: [{ name: 'QuartzControl-Vorlage', extensions: [TEMPLATE_PACKAGE_EXTENSION.slice(1)] }]
    })
    if (result.canceled || !result.filePath) return null
    return templatePackageService.exportPackage(projectPath, result.filePath, options as TemplateExportOptions)
  })
  handle(IPC.templatePackagePlan, t([s.absolutePath, s.absolutePath]), (projectPath, packagePath) =>
    templatePackageService.planImport(projectPath, packagePath)
  )
  handle(
    IPC.templatePackageImport,
    t([s.absolutePath, s.absolutePath, z.array(s.templatePartId).max(s.templatePartId.options.length), s.templateConflictStrategy]),
    (projectPath, packagePath, parts, strategy) =>
      templatePackageService.importPackage(projectPath, packagePath, parts, strategy, (progress) =>
        broadcast(IPC.templatePackageProgress, { projectPath, ...progress })
      )
  )

  handleNoArgs(IPC.marketplaceList, () => marketplaceService.listPlugins())
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
  handle(IPC.serverDiscover, t([s.serverDiscoverInput.optional()]), (input) =>
    serverDiscovery.discoverServers(input?.ports)
  )
  handle(IPC.serverKill, t([s.serverKillInput]), (input) => serverDiscovery.killServer(input.pid))

  handle(IPC.buildLastOutput, t([s.absolutePath, s.buildOutputDir.optional()]), (projectPath, outputDir) =>
    buildService.getBuildOutput(projectPath, outputDir)
  )
  // `quartz build` empties its output directory before writing (see buildOutputGuard) - so the
  // question "may this directory be deleted" is asked here, in the one place both pages that
  // build go through. A refusal and a cancelled confirmation are thrown rather than returned:
  // BuildResult has no room for a message, and both callers already show a rejected invoke -
  // Vorschau & Build in the build log, Veröffentlichen in the diff card.
  handle(
    IPC.buildRun,
    t([s.uuid, s.absolutePath, s.buildOutputDir.optional()]),
    async (projectId, projectPath, outputDir) => {
      const verdict = await buildOutputGuard.assessOutputDir(projectPath, outputDir)
      const dir = resolveBuildDir(projectPath, outputDir)
      if (verdict.kind === 'refused') {
        const why = mainT(
          {
            project: 'buildDirIsProject',
            containsProject: 'buildDirContainsProject',
            home: 'buildDirIsHome',
            protected: 'buildDirReserved'
          }[verdict.reason] as MainStringKey
        )
        throw new Error(mainT('buildDirRefused', { dir, why }))
      }
      if (verdict.kind === 'confirm') {
        // Cancel first, not second: `defaultId` is not honoured here - measured against this
        // Electron build on macOS with the destructive button in buttons[0] and defaultId
        // pointing at "Abbrechen", where Return emptied the folder anyway (Escape does honour
        // cancelId). So the safe answer has to be the one sitting first.
        const { response } = await dialog.showMessageBox({
          type: 'warning',
          buttons: [mainT('buildDirConfirmCancel'), mainT('buildDirConfirmProceed')],
          defaultId: 0,
          cancelId: 0,
          title: mainT('buildDirConfirmTitle'),
          message: mainT('buildDirConfirmMessage', { dir }),
          detail: mainT('buildDirConfirmDetail', { count: verdict.entryCount })
        })
        if (response !== 1) throw new Error(mainT('buildDirCancelled'))
      }
      return buildService.runBuild(projectId, projectPath, outputDir)
    }
  )

  handle(IPC.projectPrefsGet, t([s.absolutePath]), (projectPath) => projectPrefsService.getPrefs(projectPath))
  handle(IPC.projectPrefsSave, t([s.absolutePath, s.projectPrefs]), (projectPath, prefs) =>
    projectPrefsService.savePrefs(projectPath, prefs as ProjectPrefs)
  )

  handle(IPC.syncStatus, t([s.absolutePath]), (projectPath) => gitStatusService.getGitStatus(projectPath))

  handle(
    IPC.syncRun,
    t([s.absolutePath, s.syncDirection.optional(), s.syncOptions.optional()]),
    (projectPath, direction, options) => syncService.runSync(projectPath, direction, options as SyncOptions | undefined)
  )

  handle(IPC.backupList, t([s.absolutePath]), (projectPath) => backupService.listContentBackups(projectPath))
  handle(IPC.backupRestore, t([s.absolutePath, s.backupId]), (projectPath, id) =>
    backupService.restoreContentBackup(projectPath, contentService.contentDirPath(projectPath), id)
  )
  handle(IPC.backupDelete, t([s.absolutePath, s.backupId]), (projectPath, id) =>
    backupService.deleteContentBackup(projectPath, id)
  )

  // The one-time import of the old per-save config copies runs here rather than inside the
  // service: this is the single entry point a user reaches, and it renames the legacy directory
  // afterwards, so a second call finds nothing to do.
  handle(IPC.snapshotList, t([s.absolutePath]), async (projectPath) => {
    await snapshotService.migrateConfigBackups(projectPath)
    return snapshotService.listSnapshots(projectPath)
  })
  handle(IPC.snapshotCreate, t([s.absolutePath, s.snapshotKind, z.string().max(200).optional()]), (projectPath, kind, label) =>
    snapshotService.createSnapshot(projectPath, kind, label)
  )
  handle(IPC.snapshotDiff, t([s.absolutePath, s.snapshotId]), (projectPath, id) =>
    snapshotService.diffSnapshot(projectPath, id)
  )
  handle(IPC.snapshotFileDiff, t([s.absolutePath, s.snapshotId, s.snapshotFilePath]), (projectPath, id, path) =>
    snapshotService.fileDiff(projectPath, id, path)
  )
  handle(
    IPC.snapshotRestore,
    t([
      s.absolutePath,
      s.snapshotId,
      z
        .object({
          paths: z.array(s.snapshotFilePath).max(20000).optional(),
          resetProjectHead: z.boolean().optional()
        })
        .optional()
    ]),
    (projectPath, id, options) => snapshotService.restoreSnapshot(projectPath, id, options)
  )
  handle(IPC.snapshotDelete, t([s.absolutePath, s.snapshotId]), (projectPath, id) =>
    snapshotService.deleteSnapshot(projectPath, id)
  )
  // The target file is chosen here rather than taken from the renderer: an arbitrary path from
  // there would let a page write a zip anywhere on disk.
  handle(IPC.snapshotExport, t([s.absolutePath, s.snapshotId]), async (projectPath, id) => {
    const result = await dialog.showSaveDialog({
      defaultPath: `${id}.zip`,
      filters: [{ name: 'ZIP', extensions: ['zip'] }]
    })
    if (result.canceled || !result.filePath) return false
    await snapshotService.exportSnapshot(projectPath, id, result.filePath)
    return true
  })
  handle(IPC.snapshotSettings, t([s.absolutePath]), (projectPath) => snapshotService.getSettings(projectPath))
  handle(IPC.snapshotSaveSettings, t([s.absolutePath, z.boolean()]), (projectPath, includeContent) =>
    snapshotService.saveSettings(projectPath, includeContent)
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
  handle(IPC.settingsSave, t([s.settings]), async (next) => {
    await settingsService.saveSettings(next as Settings)
    // Applied here rather than in the renderer: the appearance is nativeTheme's to set, and doing
    // it on the save keeps the stored value and the live window from ever disagreeing. Guarded by
    // the key being present rather than by its value: a caller that saves other fields and leaves
    // `theme` out would otherwise silently reset the window to the OS appearance, since an absent
    // key and an explicit 'system' are the same thing once the payload has crossed IPC.
    if ('theme' in (next as object)) applyTheme((next as Settings).theme)
    // Same reasoning for the other half of the Erscheinungsbild section: the native menu is built
    // once from a snapshot of the strings, so without this the Sprache select switched the whole
    // renderer instantly and left Datei/Bearbeiten/Ansicht in the old language until a restart.
    if ('language' in (next as object)) await applyAppMenu()
    // Third of the same kind: PATH belongs to the main process, and applying the choice here keeps
    // the stored value and the live environment from disagreeing until the next start.
    if ('nodeRuntime' in (next as object)) {
      nodeRuntime.applyRuntimeMode((next as Settings).nodeRuntime ?? 'embedded')
    }
  })
  handleNoArgs(IPC.settingsAppInfo, () => settingsService.getAppInfo())
  handleNoArgs(IPC.settingsEnvironment, () =>
    environmentService.getEnvironmentInfo(
      connectionsService.getSecretStorageInfo(),
      nodeRuntime.embeddedRuntime()?.binDir ?? null,
      // 'embedded' auch dann, wenn gar keines gefunden wurde: dass git fehlt, heißt seit dem
      // mitgelieferten Bundle nicht mehr "installier dir eins", sondern "diese Installation ist
      // unvollständig" - und genau diesen Satz zeigt das Warnband für eingebettete Werkzeuge.
      gitRuntime.gitRuntime()?.source === 'host' ? 'host' : 'embedded'
    )
  )
  handleNoArgs(IPC.settingsClearThemeDocsCache, () => styleSettingsSchemaService.clearThemeDocsCache())

  handle(IPC.dialogPickFolder, t([s.absolutePath.optional()]), async (defaultPath) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      // Only honoured when it still exists - Electron shows the last-used folder otherwise, and
      // a stale default project directory must not make the dialog open somewhere surprising.
      defaultPath: defaultPath && existsSync(defaultPath) ? defaultPath : undefined
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // Takes no path from the renderer on purpose: there is exactly one directory this is for, and
  // main is the only side that knows where it is.
  handleNoArgs(IPC.dialogRevealUserData, () => {
    shell.showItemInFolder(join(app.getPath('userData'), 'settings.json'))
  })

  // Derselbe Weg wie der Menüpunkt Hilfe → Handbuch, und ausdrücklich dieselbe Funktion: Zwei
  // Stellen, die denselben Pfad selbst zusammensetzen, laufen beim nächsten Umbau auseinander.
  // Objekt-Argument, weil ein späterer optionaler Key hier dann eine Zeile ist und kein zweiter Slot.
  handle(IPC.dialogOpenHandbook, t([z.optional(z.object({ page: z.optional(s.handbookPage) }))]), async (options) => {
    await openHandbook(options?.page)
  })

  // The start screen links the Quartz documentation. `s.externalUrl` allows https and nothing
  // else - shell.openExternal hands the URL to whatever handler the OS registered for its scheme.
  handle(IPC.dialogOpenExternal, t([s.externalUrl]), async (url) => {
    await shell.openExternal(url)
  })

  handle(IPC.dialogPickFile, t([s.dialogFileFilters.optional()]), async (filters) => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'], filters })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  handle(IPC.dialogOpenPath, t([s.absolutePath]), (path) => openPathWithinProject(path))

  // The rule this channel and the Modal primitive in src/components/ui.tsx divide the app by:
  // yes/no confirmations run through the native dialog in the main process; in-app overlays are
  // only for content with a form or a selection. Kept as one sentence at both ends so the line
  // does not drift.
  //
  // Cancel sits in buttons[0] with cancelId 0: measured on macOS with the destructive button
  // first and defaultId on "Abbrechen", Return emptied the build folder anyway - Return takes
  // the first button, whatever defaultId says (see the build guard above). window.confirm(),
  // which the renderer used for every one of these questions before, offers no control over
  // that at all: its confirming answer is always the default.
  handle(IPC.logsHistory, t([s.logHistoryInput]), (input) => logHistory(input.projectId))
  handle(IPC.logsClear, t([s.logClearInput]), (input) => clearLogHistory(input.projectId, input.stream))

  handle(IPC.dialogConfirm, t([s.confirmDialog]), async (options) => {
    // The safe answer stays at index 0 with cancelId 0 - measured: Return takes the first button
    // regardless of defaultId. A third answer, when there is one, goes between cancel and confirm,
    // so the confirming button keeps its place at the end and only the middle is new.
    const buttons = options.altLabel
      ? [mainT('confirmCancel'), options.altLabel, options.confirmLabel]
      : [mainT('confirmCancel'), options.confirmLabel]
    const messageBox = {
      type: options.danger ? ('warning' as const) : ('question' as const),
      buttons,
      defaultId: 0,
      cancelId: 0,
      message: options.message,
      detail: options.detail
    }
    // Attached to the window so it is a sheet on macOS and modal to the app elsewhere; without a
    // window it would float free and could end up behind the app.
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const { response } = win ? await dialog.showMessageBox(win, messageBox) : await dialog.showMessageBox(messageBox)
    if (response === 0) return 'cancel'
    return options.altLabel && response === 1 ? 'alt' : 'confirm'
  })
}
