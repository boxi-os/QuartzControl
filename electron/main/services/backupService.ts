import { existsSync, mkdirSync } from 'fs'
import { cp, readdir, readFile, writeFile, rename, rm, lstat, readlink, symlink } from 'fs/promises'
import { join } from 'path'
import type { BackupEntry } from '@shared/ipc-contract'
import { quartzGuiDir } from './projectDirs'

function backupsRoot(projectPath: string): string {
  return quartzGuiDir(projectPath, 'content-backups')
}

function timestampId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

const TIMESTAMP_ID_RE = /^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/

// reverses timestampId(): "2026-08-22T10-00-00-000Z" -> "2026-08-22T10:00:00.000Z"
function idToIso(id: string): string {
  const match = id.match(TIMESTAMP_ID_RE)
  if (!match) return id
  const [, prefix, mm, ss, ms] = match
  return `${prefix}:${mm}:${ss}.${ms}Z`
}

// This is not a backup and is no longer presented as one: it is what happens to the *previous*
// content directory when the content source is switched - moved aside instead of deleted, so
// there is a way back to a folder the user replaced. A symlinked vault is never copied here, only
// the link itself recorded, which is exactly the promise the old "Backups -> Inhalte" tab made and
// could not keep. Whole-project snapshots live in snapshotService.
export async function snapshotContent(projectPath: string, contentDir: string): Promise<BackupEntry | null> {
  if (!existsSync(contentDir)) return null
  const id = timestampId()
  const dir = join(backupsRoot(projectPath), id)
  mkdirSync(dir, { recursive: true })

  const stat = await lstat(contentDir)
  if (stat.isSymbolicLink()) {
    // the link target is left untouched - only the link itself is recorded
    const target = await readlink(contentDir)
    await writeFile(join(dir, 'symlink.json'), JSON.stringify({ target }, null, 2), 'utf-8')
    await rm(contentDir)
  } else {
    await rename(contentDir, join(dir, 'content'))
  }
  return { id, createdAt: new Date().toISOString() }
}

export async function listContentBackups(projectPath: string): Promise<BackupEntry[]> {
  const entries = await readdir(backupsRoot(projectPath), { withFileTypes: true })
  return entries
    // Only real snapshot directories: a stray file (.DS_Store, which macOS drops into any folder
    // the user opens in Finder) was otherwise listed as a backup whose date rendered as
    // "Invalid Date" and whose restore could only fail.
    .filter((e) => e.isDirectory() && TIMESTAMP_ID_RE.test(e.name))
    .map((e) => ({ id: e.name, createdAt: idToIso(e.name) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function restoreContentBackup(projectPath: string, contentDir: string, id: string): Promise<void> {
  const dir = join(backupsRoot(projectPath), id)
  if (existsSync(contentDir)) {
    // restoring is itself reversible
    await snapshotContent(projectPath, contentDir)
  }
  const symlinkMarker = join(dir, 'symlink.json')
  if (existsSync(symlinkMarker)) {
    const { target } = JSON.parse(await readFile(symlinkMarker, 'utf-8')) as { target: string }
    await symlink(target, contentDir, 'dir')
    return
  }
  // Copy, don't move: a rename emptied the snapshot directory, so the entry stayed in the list but
  // restoring it a second time failed with ENOENT. A backup has to survive being used.
  await cp(join(dir, 'content'), contentDir, { recursive: true })
}
