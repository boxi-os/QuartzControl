import { EventEmitter } from 'events'
import { existsSync } from 'fs'
import { writeFile } from 'fs/promises'
import { join, posix } from 'path'
import type { DeployDiffEntry, DeployProgressEvent, DeployResult, PublishTarget } from '@shared/ipc-contract'
import { relaySubdir, rsyncUnsafeChar } from '@shared/remotePath'
import type { DeployAdapter, DeployContext } from './types'
import { quartzGuiDir, resolveBuildDir } from '../projectDirs'
import { forgetManifest } from './manifest'
import * as connectionsService from '../connectionsService'
import * as publishTargetsService from '../publishTargetsService'
import { sftpAdapter } from './sftp'
import { ftpAdapter } from './ftp'
import { folderAdapter } from './folder'
import { webhookAdapter } from './webhook'
import { rsyncAdapter } from './rsync'
import { gitBranchAdapter } from './gitBranch'
import { mainT } from '../../i18n'
import { remotePathProblem } from '@shared/remotePath'
import { reanchorTildeManifest } from './manifest'

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
  // The schema refuses such a path when a target is saved; one saved before the rule knew "~"
  // (shared/remotePath.ts) is refused here, before preview and upload.
  if ('remotePath' in target.destination && remotePathProblem(target.destination.remotePath, target.destination.deleteRemoved) === 'whole-root') {
    throw new Error(mainT('deployWholeRoot', { path: target.destination.remotePath }))
  }
  // Here rather than in the adapters, so the preview already offers every file again.
  const d = target.destination
  if ((d.type === 'ftp' || (d.type === 'sftp' && d.transfer !== 'rsync')) && d.remotePath.startsWith('~')) {
    await reanchorTildeManifest(projectPath, target.id)
  }

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

/**
 * Uploads a directory that is not the build - the quartz-forms relay (formsService) - through an
 * existing target's connection, below its remote path. The target's adapter does the work, so
 * host keys, the manifest diff, progress and rsync's quirks are the publish page's own; what
 * differs is decided here:
 *
 * - its own manifest (`deploy-manifest-<manifestKey>.json`), so neither upload takes the other's
 *   files for its own - an sftp/ftp/folder deploy deletes only what its manifest says it sent;
 * - never `deleteRemoved`: the relay's directory also holds what the server writes (counters, used
 *   proofs of work), and a wrong path with deletion would empty a directory this app does not own;
 * - no `excludes` of the site's;
 * - sftp, ftp and folder only: a webhook or a branch has no path to put a directory below;
 * - every file on every run, with its local mode (`keepLocalModes`), see below.
 */
export async function runDirectoryUpload(
  projectPath: string,
  targetId: string,
  localDir: string,
  subdir: string,
  manifestKey: string
): Promise<DeployResult> {
  const target = await publishTargetsService.getTarget(projectPath, targetId)
  if (!target) return { success: false, output: mainT('deployTargetMissing', { id: targetId }) }
  // keepLocalModes below sets the mode of the folder it uploads into, which must not be the
  // target's own (relaySubdir). The schema refuses such a subdir; this is for one saved before.
  if (relaySubdir(subdir) !== subdir) return { success: false, output: mainT('relaySubdirInvalid', { subdir }) }
  const d = target.destination
  if (d.type !== 'sftp' && d.type !== 'ftp' && d.type !== 'folder') return { success: false, output: mainT('relayTargetType', { type: d.type }) }
  const adapter = adapterFor(d)
  if (!adapter) return { success: false, output: mainT('deployNoAdapter', { type: d.type }) }
  // The adapter refuses the whole path and advises SFTP, where another folder would do: measured
  // with "kontakt!" over rsync (review 2026-10-30, N5). The target's own path it says itself.
  const unsafe = d.type === 'sftp' && d.transfer === 'rsync' && !rsyncUnsafeChar(d.remotePath) ? rsyncUnsafeChar(subdir) : null
  if (unsafe) return { success: false, output: /\s/.test(unsafe) ? mainT('relaySubdirRsyncSpace', { subdir }) : mainT('relaySubdirRsyncChar', { subdir, char: unsafe }) }
  const destination: PublishTarget['destination'] =
    d.type === 'folder' ? { ...d, path: join(d.path, subdir), deleteRemoved: false } : { ...d, remotePath: posix.join(d.remotePath, subdir), deleteRemoved: false }
  // What QuartzControl uploads gets its mode from QuartzControl, on every run and every way. A mode
  // is no change a manifest sees, so the manifest is forgotten first: rsync's -p set the modes of
  // all files on every run anyway, SFTP and FTP only with "Alles neu hochladen". Measured on
  // debian-vm with counters/ 0777 and config.php 0640 set by hand and an ordinary upload: rsync
  // 755/600, SFTP and FTP 777/640 (review 2026-10-29, M2). The relay is a few small files.
  await forgetManifest(projectPath, manifestKey)
  // A manifest of its own from the first run: an unclaimed legacy deploy-manifest.json is adopted
  // by whichever id asks first (manifest.ts), and that must be the site's target, not this one.
  const own = quartzGuiDir(projectPath)
  const manifestFile = join(own, `deploy-manifest-${manifestKey}.json`)
  if (!existsSync(manifestFile)) await writeFile(manifestFile, '{}\n', 'utf-8')
  try {
    const secret = target.connectionId ? await connectionsService.getSecret(target.connectionId) : null
    const ctx: DeployContext = {
      projectPath,
      target: { ...target, id: manifestKey, destination, excludes: [] },
      buildDir: localDir,
      secret,
      keepLocalModes: true,
      // Every one, not only the last: a link "lnk -> /srv/qc/www" in the target and the subdir
      // "lnk/review56-other" put the relay into another site's folder and set it from 2750 to 755,
      // over SFTP, FTP and rsync alike (debian-vm, review 2026-10-31, N3).
      relayFolders:
        d.type === 'folder' ? undefined : subdir.split('/').map((_, i, segments) => posix.join(d.remotePath, ...segments.slice(0, i + 1))),
      emitProgress(processed, total, currentFile) {
        const event: DeployProgressEvent = { targetId: manifestKey, processed, total, currentFile }
        deployEvents.emit('progress', event)
      }
    }
    return await adapter.run(ctx, [])
  } catch (err) {
    return { success: false, output: String(err instanceof Error ? err.message : err) }
  }
}
