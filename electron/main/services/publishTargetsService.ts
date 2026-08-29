import { join } from 'path'
import { randomUUID } from 'crypto'
import type { PublishTarget, SavePublishTargetInput } from '@shared/ipc-contract'
import { quartzGuiDir, quartzGuiPath } from './projectDirs'
import { claimLegacyTargets } from './connectionsService'
import { readJsonFileOr, writeJsonFile } from './jsonStore'
import { forgetManifest } from './deploy/manifest'

// Targets live in the project, not in userData: they describe what *this* project publishes and
// where, they carry no secret (that is the connection's half), and keeping them here means they
// travel with the project folder and are covered by the existing backups. .quartz-gui/ is already
// gitignored by projectDirs, so they don't end up in the user's own repo either.
const FILE = 'publish-targets.json'

// Reading must not create anything: quartzGuiDir() creates the directory it is asked for *and*
// writes the .gitignore entry that goes with it, so a read path using it left both behind in every
// project merely opened - and the Uebersicht reads this on mount. Only write() creates.
function targetsPath(projectPath: string): string {
  return quartzGuiPath(projectPath, FILE)
}

async function read(projectPath: string): Promise<PublishTarget[]> {
  return readJsonFileOr<PublishTarget[]>(targetsPath(projectPath), [])
}

async function write(projectPath: string, targets: PublishTarget[]): Promise<void> {
  await writeJsonFile(join(quartzGuiDir(projectPath), FILE), targets)
}

export async function listTargets(projectPath: string): Promise<PublishTarget[]> {
  const existing = await read(projectPath)

  // The other half of the connection/target split: the pre-split profiles carried a remotePath,
  // which is target-shaped, so connectionsService staged those and this claims the ones belonging
  // to this project the first time it is opened after the migration.
  const legacy = await claimLegacyTargets(projectPath)
  if (legacy.length === 0) return existing

  const migrated: PublishTarget[] = legacy.map((entry) => ({
    // A fresh id for the target - the *connection* kept the old profile's id, and the deploy
    // manifest is re-keyed onto this one by deployService's own migration.
    id: randomUUID(),
    name: entry.name,
    connectionId: entry.connectionId,
    destination:
      entry.protocol === 'sftp'
        ? { type: 'sftp', remotePath: entry.remotePath, transfer: 'sftp', deleteRemoved: true }
        : { type: 'ftp', remotePath: entry.remotePath, deleteRemoved: true },
    excludes: []
  }))

  const all = [...existing, ...migrated]
  await write(projectPath, all)
  return all
}

export async function getTarget(projectPath: string, id: string): Promise<PublishTarget | null> {
  return (await listTargets(projectPath)).find((t) => t.id === id) ?? null
}

/**
 * Where a target actually points, as one comparable string. The manifest records what was last
 * sent *there*; re-pointing the same target somewhere else makes every entry in it a claim about a
 * different machine or a different folder. Reported from a real deploy: after changing the remote
 * path, the diff offered two files, because the manifest still described the old path - the same
 * failure per-target manifests were introduced to fix, one level further down.
 *
 * Deliberately not part of it: the transfer mode (rsync and sftp reach the same directory) and the
 * target's name or exclusions, which change nothing about what is on the far end.
 */
function locationKey(target: Pick<PublishTarget, 'connectionId' | 'destination'>): string {
  const d = target.destination
  const where =
    'remotePath' in d ? d.remotePath : 'path' in d ? d.path : 'branch' in d ? `${d.provider}:${d.branch}` : ''
  return `${target.connectionId ?? ''}|${d.type}|${where}`
}

export async function saveTarget(projectPath: string, input: SavePublishTargetInput): Promise<PublishTarget> {
  const all = await listTargets(projectPath)
  const index = input.id ? all.findIndex((t) => t.id === input.id) : -1
  const target: PublishTarget = {
    id: index !== -1 ? all[index].id : randomUUID(),
    name: input.name,
    connectionId: input.connectionId,
    destination: input.destination,
    excludes: input.excludes ?? (index !== -1 ? all[index].excludes : [])
  }
  const movedAway = index !== -1 && locationKey(all[index]) !== locationKey(target)
  if (index !== -1) all[index] = target
  else all.push(target)
  await write(projectPath, all)
  // After the write, so a target that could not be saved does not lose its manifest anyway.
  if (movedAway) await forgetManifest(projectPath, target.id)
  return target
}

export async function deleteTarget(projectPath: string, id: string): Promise<void> {
  const all = await listTargets(projectPath)
  await write(
    projectPath,
    all.filter((t) => t.id !== id)
  )
}

/** Every target in this project that points at the given connection - the "still in use" check
 *  the connection list runs before offering to delete one. */
export async function targetsUsingConnection(projectPath: string, connectionId: string): Promise<PublishTarget[]> {
  return (await listTargets(projectPath)).filter((t) => t.connectionId === connectionId)
}
