import { EventEmitter } from 'events'
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

export const deployEvents = new EventEmitter()

// One entry per destination type. Adding a target type is adding a file here and a case in the
// contract's PublishDestination union - nothing in this dispatcher special-cases a protocol.
const ADAPTERS: Partial<Record<string, DeployAdapter>> = {
  sftp: sftpAdapter,
  ftp: ftpAdapter,
  folder: folderAdapter,
  webhook: webhookAdapter
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
  if (!target) throw new Error(`Kein Veröffentlichungsziel mit der ID ${targetId} gefunden.`)

  const adapter = adapterFor(target.destination)
  if (!adapter) throw new Error(`Für den Zieltyp "${target.destination.type}" gibt es noch keinen Adapter.`)

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

export async function previewDeploy(projectPath: string, targetId: string, outputDir?: string): Promise<DeployDiffEntry[]> {
  const { ctx, adapter } = await makeContext(projectPath, targetId, outputDir)
  return adapter.preview(ctx)
}

export async function runDeploy(
  projectPath: string,
  targetId: string,
  outputDir: string | undefined,
  excludePaths: string[]
): Promise<DeployResult> {
  const { ctx, adapter } = await makeContext(projectPath, targetId, outputDir)
  try {
    return await adapter.run(ctx, excludePaths)
  } catch (err) {
    // An adapter's setup failures (no connection configured, no SSH agent, an unreadable key file)
    // are thrown rather than returned, so they arrive as one message in the same output panel the
    // transfer errors use instead of as an unhandled rejection.
    return { success: false, output: String(err instanceof Error ? err.message : err) }
  }
}
