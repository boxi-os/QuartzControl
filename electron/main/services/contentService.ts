import { existsSync } from 'fs'
import { lstat, readlink, readdir, cp, symlink, mkdir } from 'fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'path'
import type { ContentStatus, ContentStrategy } from '@shared/ipc-contract'
import { snapshotContent } from './backupService'
import { createSnapshot } from './snapshotService'
import { mainT } from '../i18n'

export function contentDirPath(projectPath: string): string {
  return join(projectPath, 'content')
}

// Hidden entries are not content, and counting them made the number meaningless: a vault carries
// its own .git, Obsidian keeps its settings in .obsidian, and quartz ignores both. Measured on the
// example vault - 1392 entries reported for 273 files of actual content, the other 1119 being git
// objects and Obsidian's own state. Whatever the folder hides from Quartz it should hide here too.
async function countFiles(dir: string): Promise<number> {
  let count = 0
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (entry.isDirectory()) count += await countFiles(join(dir, entry.name))
    else count += 1
  }
  return count
}

export async function getContentStatus(projectPath: string): Promise<ContentStatus> {
  const path = contentDirPath(projectPath)
  // lstat, not existsSync: the latter follows the link, so a content/ pointing at an unmounted
  // drive answered "there is no content folder here" - and everything that asks this question in
  // order to decide whether it may write (the template import's content part above all) then read
  // the answer as "an ordinary, absent folder", planned every note as an addition and failed with
  // a raw ENOENT from mkdir. A link that is there but hanging is a link, and saying so is what
  // keeps the guard on.
  let stat
  try {
    stat = await lstat(path)
  } catch {
    return { path, exists: false, isSymlink: false }
  }
  if (stat.isSymbolicLink()) {
    const target = await readlink(path)
    // readlink() hands back the link's *raw* target, and a relative one is relative to the link's
    // own directory - not to the working directory of whoever asks. Resolving it against the
    // latter reported a perfectly good link as broken: measured on a project whose content/ points
    // at ../vault, `targetExists` came back false and the file count was missing, while the link
    // itself worked. The dialog in this app always writes an absolute path, so only a hand-made or
    // moved project ever hit it.
    const targetPath = isAbsolute(target) ? target : resolve(dirname(path), target)
    const targetExists = existsSync(targetPath)
    return {
      path,
      exists: true,
      isSymlink: true,
      symlinkTarget: target,
      targetExists,
      fileCount: targetExists ? await countFiles(targetPath) : undefined
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
    throw new Error(mainT('contentSourceMissing', { path: sourcePath }))
  }
  const target = contentDirPath(projectPath)
  const from = resolve(sourcePath)
  const to = resolve(target)
  if (contains(to, from)) {
    throw new Error(
      mainT('contentSourceInsideTarget', { target })
    )
  }
  if (contains(from, to)) {
    throw new Error(
      mainT('contentTargetInsideSource', { target })
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
