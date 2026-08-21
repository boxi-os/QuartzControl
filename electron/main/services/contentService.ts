import { existsSync } from 'fs'
import { lstat, readlink, readdir, cp, symlink, mkdir } from 'fs/promises'
import { join } from 'path'
import type { ContentStatus, ContentStrategy } from '@shared/ipc-contract'
import { snapshotContent } from './backupService'

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
