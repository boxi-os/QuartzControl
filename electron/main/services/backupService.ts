import { existsSync, mkdirSync } from 'fs'
import { cp, readdir, readFile, writeFile, rename, rm, lstat, readlink, symlink } from 'fs/promises'
import { join } from 'path'
import { diffLines } from 'diff'
import type { BackupEntry } from '@shared/ipc-contract'
import { quartzGuiDir } from './projectDirs'

function backupsRoot(projectPath: string, kind: 'config' | 'content'): string {
  return quartzGuiDir(projectPath, kind === 'config' ? 'backups' : 'content-backups')
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

// Every writeConfig() snapshots the previous file, and the editor tabs save often - a session of
// tweaking colors can leave dozens of near-identical copies. Config backups are a short-term undo,
// not an archive (git is the archive), so only the newest are kept. Content backups are NOT pruned:
// each one holds a whole content directory the user may have moved away, which is not something to
// delete behind their back.
const MAX_CONFIG_BACKUPS = 50

async function pruneConfigBackups(projectPath: string): Promise<void> {
  const dir = backupsRoot(projectPath, 'config')
  const files = (await readdir(dir)).filter((f) => f.endsWith('.yaml')).sort()
  // sorted ascending, and the timestamp format sorts lexicographically == chronologically
  const stale = files.slice(0, Math.max(0, files.length - MAX_CONFIG_BACKUPS))
  await Promise.all(stale.map((f) => rm(join(dir, f), { force: true })))
}

export async function snapshotConfig(projectPath: string, rawYaml: string): Promise<BackupEntry> {
  const id = timestampId()
  await writeFile(join(backupsRoot(projectPath, 'config'), `${id}.yaml`), rawYaml, 'utf-8')
  await pruneConfigBackups(projectPath)
  return { id, createdAt: new Date().toISOString(), kind: 'config' }
}

export async function listConfigBackups(projectPath: string): Promise<BackupEntry[]> {
  const files = await readdir(backupsRoot(projectPath, 'config'))
  return files
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => {
      const id = f.replace(/\.yaml$/, '')
      return { id, createdAt: idToIso(id), kind: 'config' as const }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function diffConfigBackup(projectPath: string, id: string): Promise<string> {
  const backupRaw = await readFile(join(backupsRoot(projectPath, 'config'), `${id}.yaml`), 'utf-8')
  const currentPath = join(projectPath, 'quartz.config.yaml')
  const currentRaw = existsSync(currentPath) ? await readFile(currentPath, 'utf-8') : ''
  const parts = diffLines(backupRaw, currentRaw)
  return parts
    .map((part) => {
      const prefix = part.added ? '+ ' : part.removed ? '- ' : '  '
      const lines = part.value.split('\n')
      if (lines[lines.length - 1] === '') lines.pop()
      return lines.map((line) => prefix + line).join('\n')
    })
    .join('\n')
}

export async function restoreConfigBackup(projectPath: string, id: string): Promise<void> {
  const backupRaw = await readFile(join(backupsRoot(projectPath, 'config'), `${id}.yaml`), 'utf-8')
  const currentPath = join(projectPath, 'quartz.config.yaml')
  if (existsSync(currentPath)) {
    // restoring is itself reversible
    await snapshotConfig(projectPath, await readFile(currentPath, 'utf-8'))
  }
  await writeFile(currentPath, backupRaw, 'utf-8')
}

export async function snapshotContent(projectPath: string, contentDir: string): Promise<BackupEntry | null> {
  if (!existsSync(contentDir)) return null
  const id = timestampId()
  const dir = join(backupsRoot(projectPath, 'content'), id)
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
  return { id, createdAt: new Date().toISOString(), kind: 'content' }
}

export async function listContentBackups(projectPath: string): Promise<BackupEntry[]> {
  const entries = await readdir(backupsRoot(projectPath, 'content'), { withFileTypes: true })
  return entries
    // Only real snapshot directories: a stray file (.DS_Store, which macOS drops into any folder
    // the user opens in Finder) was otherwise listed as a backup whose date rendered as
    // "Invalid Date" and whose restore could only fail.
    .filter((e) => e.isDirectory() && TIMESTAMP_ID_RE.test(e.name))
    .map((e) => ({ id: e.name, createdAt: idToIso(e.name), kind: 'content' as const }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function restoreContentBackup(projectPath: string, contentDir: string, id: string): Promise<void> {
  const dir = join(backupsRoot(projectPath, 'content'), id)
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
