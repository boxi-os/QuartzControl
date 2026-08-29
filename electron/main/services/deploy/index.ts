import { EventEmitter } from 'events'
import { existsSync } from 'fs'
import type { DeployDiffEntry, DeployProgressEvent, DeployResult, PublishTarget } from '@shared/ipc-contract'
import type { DeployAdapter, DeployContext } from './types'
import { resolveBuildDir } from '../projectDirs'
import * as connectionsService from '../connectionsService'
import * as publishTargetsService from '../publishTargetsService'
import { sftpAdapter } from './sftp'
import { ftpAdapter } from './ftp'
import { folderAdapter } from './folder'
import { webhookAdapter } from './webhook'
import { rsyncAdapter } from './rsync'
import { gitBranchAdapter } from './gitBranch'
import { mainT } from '../../i18n'

export const deployEvents = new EventEmitter()

// One entry per destination type. Adding a target type is adding a file here and a case in the
// contract's PublishDestination union - nothing in this dispatcher special-cases a protocol.
const ADAPTERS: Partial<Record<string, DeployAdapter>> = {
  sftp: sftpAdapter,
  ftp: ftpAdapter,
  folder: folderAdapter,
  webhook: webhookAdapter,
  'git-branch': gitBranchAdapter
}

// The one destination type with two adapters. rsync is not a separate kind of target - it is the
// same server and the same remote path, reached a faster way - so it stays a field on the sftp
// destination and is resolved here rather than duplicating the type in the UI.
function adapterFor(destination: PublishTarget['destination']): DeployAdapter | undefined {
  if (destination.type === 'sftp' && destination.transfer === 'rsync') return rsyncAdapter
  return ADAPTERS[destination.type]
}

async function makeContext(projectPath: string, targetId: string, outputDir?: string): Promise<{ ctx: DeployContext; adapter: DeployAdapter }> {
  const target = await publishTargetsService.getTarget(projectPath, targetId)
  if (!target) throw new Error(mainT('deployTargetMissing', { id: targetId }))

  const adapter = adapterFor(target.destination)
  if (!adapter) throw new Error(mainT('deployNoAdapter', { type: target.destination.type }))

  // Resolved in main and never sent to the renderer; a target whose destination needs no
  // credential (a folder, a git branch) simply has no connection to look up.
  const secret = target.connectionId ? await connectionsService.getSecret(target.connectionId) : null

  const ctx: DeployContext = {
    projectPath,
    target,
    buildDir: resolveBuildDir(projectPath, outputDir),
    secret,
    emitProgress(processed, total, currentFile) {
      const event: DeployProgressEvent = { targetId: target.id, processed, total, currentFile }
      deployEvents.emit('progress', event)
    }
  }
  return { ctx, adapter }
}

// A target's own `excludes` are the paths it never publishes, kept between runs - as opposed to the
// per-run boxes the user unticks in the diff. They are applied here rather than in each adapter so
// that the preview and the run cannot disagree: a path in this list is simply invisible to
// publishing. A git-branch target is the exception the adapter documents - it replaces the branch
// with one root commit, so leaving a file out would delete it from the live site instead of leaving
// it alone; the target form does not offer the field for that type.
function persistentExcludes(ctx: DeployContext): string[] {
  return ctx.target.destination.type === 'git-branch' ? [] : ctx.target.excludes
}

// Every file adapter reads the build output, and on a project that has never been built that used
// to surface as a raw "ENOENT: no such file or directory, scandir '<dir>'" from deep inside the
// manifest walk. The page that shows this has a "Jetzt bauen" button right next to the message.
async function assertBuildExists(ctx: DeployContext): Promise<void> {
  if (ctx.target.destination.type === 'webhook') return
  if (existsSync(ctx.buildDir)) return
  throw new Error(
    mainT('deployNoBuild', { dir: ctx.buildDir })
  )
}

export async function previewDeploy(projectPath: string, targetId: string, outputDir?: string): Promise<DeployDiffEntry[]> {
  const { ctx, adapter } = await makeContext(projectPath, targetId, outputDir)
  await assertBuildExists(ctx)
  const hidden = new Set(persistentExcludes(ctx))
  const diff = await adapter.preview(ctx)
  return hidden.size === 0 ? diff : diff.filter((entry) => !hidden.has(entry.path))
}

export async function runDeploy(
  projectPath: string,
  targetId: string,
  outputDir: string | undefined,
  excludePaths: string[]
): Promise<DeployResult> {
  const { ctx, adapter } = await makeContext(projectPath, targetId, outputDir)
  try {
    await assertBuildExists(ctx)
    return await adapter.run(ctx, [...new Set([...excludePaths, ...persistentExcludes(ctx)])])
  } catch (err) {
    // An adapter's setup failures (no connection configured, no SSH agent, an unreadable key file)
    // are thrown rather than returned, so they arrive as one message in the same output panel the
    // transfer errors use instead of as an unhandled rejection.
    return { success: false, output: String(err instanceof Error ? err.message : err) }
  }
}
