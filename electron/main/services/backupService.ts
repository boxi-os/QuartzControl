import { existsSync, mkdirSync } from 'fs'
import { cp, readdir, readFile, writeFile, rename, rm, lstat, readlink, symlink } from 'fs/promises'
import { join } from 'path'
import type { BackupEntry } from '@shared/ipc-contract'
import { quartzGuiDir, quartzGuiPath } from './projectDirs'

// Read path: quartzGuiDir() *creates* what it is asked for and writes the .gitignore entry that
// goes with it, so using it here left an empty content-backups/ - and an edited .gitignore - in
// every project that was merely opened, for a feature the user may never touch. Measured on a
// fresh repository. Writers call quartzGuiDir(); this is the same split localizationService's
// locale baseline needed.
function backupsRoot(projectPath: string): string {
  return quartzGuiPath(projectPath, 'content-backups')
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
  const dir = join(quartzGuiDir(projectPath, 'content-backups'), id)
  mkdirSync(dir, { recursive: true })

  const info = await lstat(contentDir)
  if (info.isSymbolicLink()) {
    // the link target is left untouched - only the link itself is recorded
    const target = await readlink(contentDir)
    await writeFile(join(dir, 'symlink.json'), JSON.stringify({ target }, null, 2), 'utf-8')
    await rm(contentDir)
    return { id, createdAt: new Date().toISOString(), kind: 'link', sizeBytes: 0, fileCount: 0, target }
  }
  await rename(contentDir, join(dir, 'content'))
  return { id, createdAt: new Date().toISOString(), kind: 'folder', ...(await measure(join(dir, 'content'))) }
}

// What a moved folder actually costs. Walked rather than guessed because the page offers to delete
// one and a timestamp says nothing about whether that frees a megabyte or ten gigabytes. Symlinks
// inside are counted as the link, never followed - the walk must not wander into a vault.
async function measure(dir: string): Promise<{ sizeBytes: number; fileCount: number }> {
  let sizeBytes = 0
  let fileCount = 0
  const walk = async (current: string): Promise<void> => {
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) await walk(full)
      else {
        fileCount += 1
        try {
          sizeBytes += (await lstat(full)).size
        } catch {
          // vanished between readdir and lstat - it simply doesn't count
        }
      }
    }
  }
  await walk(dir)
  return { sizeBytes, fileCount }
}

export async function listContentBackups(projectPath: string): Promise<BackupEntry[]> {
  let entries
  try {
    entries = await readdir(backupsRoot(projectPath), { withFileTypes: true })
  } catch {
    return [] // nothing was ever moved aside in this project
  }
  const rows = await Promise.all(
    entries
      // Only real snapshot directories: a stray file (.DS_Store, which macOS drops into any folder
      // the user opens in Finder) was otherwise listed as a backup whose date rendered as
      // "Invalid Date" and whose restore could only fail.
      .filter((e) => e.isDirectory() && TIMESTAMP_ID_RE.test(e.name))
      .map(async (e): Promise<BackupEntry> => {
        const dir = join(backupsRoot(projectPath), e.name)
        const marker = join(dir, 'symlink.json')
        if (existsSync(marker)) {
          let target: string | undefined
          try {
            target = (JSON.parse(await readFile(marker, 'utf-8')) as { target?: string }).target
          } catch {
            // an unreadable marker still describes a link, just not where it pointed
          }
          return { id: e.name, createdAt: idToIso(e.name), kind: 'link', sizeBytes: 0, fileCount: 0, target }
        }
        return { id: e.name, createdAt: idToIso(e.name), kind: 'folder', ...(await measure(join(dir, 'content'))) }
      })
  )
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// The only copy there is: what was moved aside is not in a snapshot either (the store excludes a
// symlinked content folder by default and never sees this directory at all - isSnapshotWorthy
// filters it out). Without this the list only ever grew, and every restore adds another entry to
// it, since restoring is itself made reversible by moving the current folder aside first.
export async function deleteContentBackup(projectPath: string, id: string): Promise<void> {
  const dir = join(backupsRoot(projectPath), id)
  if (!TIMESTAMP_ID_RE.test(id) || !existsSync(dir)) return
  await rm(dir, { recursive: true, force: true })
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
