import { existsSync } from 'fs'
import { lstat, readlink, readdir, cp, symlink, mkdir } from 'fs/promises'
import { isAbsolute, join, relative, resolve } from 'path'
import type { ContentStatus, ContentStrategy } from '@shared/ipc-contract'
import { snapshotContent } from './backupService'
import { createSnapshot } from './snapshotService'

export function contentDirPath(projectPath: string): string {
  return join(projectPath, 'content')
}

async function countFiles(dir: string): Promise<number> {
  let count = 0
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) count += await countFiles(join(dir, entry.name))
    else count += 1
  }
  return count
}

export async function getContentStatus(projectPath: string): Promise<ContentStatus> {
  const path = contentDirPath(projectPath)
  if (!existsSync(path)) {
    return { path, exists: false, isSymlink: false }
  }
  const stat = await lstat(path)
  if (stat.isSymbolicLink()) {
    const target = await readlink(path)
    const targetExists = existsSync(target)
    return {
      path,
      exists: true,
      isSymlink: true,
      symlinkTarget: target,
      targetExists,
      fileCount: targetExists ? await countFiles(target) : undefined
    }
  }
  return { path, exists: true, isSymlink: false, fileCount: await countFiles(path) }
}

// Neither direction of containment is allowed between the source and the content directory.
// The current content/ is moved aside *before* anything is read, so a source that lives inside it
// is already gone by then - measured on a real project: with the symlink strategy the call
// reported success and left a link pointing at itself (the page then said the folder was missing),
// with the copy strategy it failed with a raw ENOENT. In both cases the notes existed only in
// .quartz-gui/content-backups/, which nothing in the UI leads to. The reverse case (the source
// contains content/, e.g. the project directory itself) would copy the project into its own
// content folder. `relative()` rather than a prefix test, which would call /notes-old a child
// of /notes - the same reasoning deploy/folder.ts's containment check follows.
function contains(parent: string, child: string): boolean {
  const rel = relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

export async function changeContentSource(
  projectPath: string,
  sourcePath: string,
  strategy: ContentStrategy,
  onProgress?: (processed: number, total: number, currentFile?: string) => void
): Promise<void> {
  if (!existsSync(sourcePath)) {
    throw new Error(`Quellordner existiert nicht: ${sourcePath}`)
  }
  const target = contentDirPath(projectPath)
  const from = resolve(sourcePath)
  const to = resolve(target)
  if (contains(to, from)) {
    throw new Error(
      `Der Quellordner liegt im Content-Ordner des Projekts (${target}). Dieser wird beim Wechsel zuerst beiseitegelegt - wähle einen Ordner außerhalb.`
    )
  }
  if (contains(from, to)) {
    throw new Error(
      `Der Content-Ordner des Projekts (${target}) liegt im gewählten Quellordner. Wähle einen Ordner, der ihn nicht enthält.`
    )
  }
  // Two different safety nets, both needed: the snapshot records the project's files as they are
  // now, and the move-aside keeps the whole old content directory - which the snapshot may not
  // hold at all, since a symlinked vault is excluded by default.
  await createSnapshot(projectPath, 'contentChange', '')
  // moves the current content/ into .quartz-gui/content-backups/ instead of deleting it
  await snapshotContent(projectPath, target)

  if (strategy === 'symlink') {
    await symlink(sourcePath, target, 'dir')
    return
  }

  const total = await countFiles(sourcePath)
  let processed = 0
  await mkdir(target, { recursive: true })
  await cp(sourcePath, target, {
    recursive: true,
    filter: (src) => {
      processed += 1
      onProgress?.(processed, total, src)
      return true
    }
  })
}
