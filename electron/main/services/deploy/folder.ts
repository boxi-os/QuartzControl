import { randomBytes } from 'crypto'
import { existsSync } from 'fs'
import { chmod, cp, lstat, mkdir, readFile, readdir, rename, rm, stat } from 'fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'path'
import type { DeployDiffEntry, DeployResult } from '@shared/ipc-contract'
import type { DeployAdapter, DeployContext } from './types'
import { commitManifest, diffAgainstManifest, partitionDiff, readManifest } from './manifest'
import { RELAY_GENERATED, relayGuard } from './relayGuard'
import { mainT } from '../../i18n'

// True when `child` is `parent` or lies underneath it. Checked via relative() rather than a
// startsWith() on the strings, which would call "/tmp/site-old" a child of "/tmp/site". A result
// that is absolute means the two share no root at all (different drives on Windows), and a leading
// ".." segment means child sits outside - note the separator in the test, or a sibling directory
// literally named "..foo" would read as an escape.
function isInside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child))
  if (rel === '') return true
  if (isAbsolute(rel)) return false
  return rel !== '..' && !rel.startsWith(`..${sep}`)
}

// 'missing' and 'unpublished' rather than a boolean: the two read differently to someone looking at
// the folder. 'unpublished' asks for the files this target put there, not for an empty folder: the
// bare mount point of a detached share often still holds a .DS_Store or a marker file, and an empty
// readdir() let that through (review 2026-11-02, N1). One file found is enough, so a folder that is
// there costs a single lstat(). Anything else readdir() or lstat() refuses (permissions) is a
// failure of its own and is thrown.
async function folderState(dir: string, published: string[]): Promise<'missing' | 'unpublished' | 'published'> {
  try {
    await readdir(dir)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return 'missing'
    throw err
  }
  for (const relPath of published) {
    try {
      await lstat(join(dir, relPath))
      return 'published'
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      if (code !== 'ENOENT' && code !== 'ENOTDIR') throw err
    }
  }
  return 'unpublished'
}

// Copying a build into a directory looks like the same thing as building into it directly (which
// BuildServer's output-directory field already does), and it is not. A target gets the diff, the
// per-file exclusions and the deletion of files that are no longer produced; a build writes
// progressively, so a sync client watching the folder uploads a half-finished site, and nothing
// stops it from clobbering whatever else lives there.
export const folderAdapter: DeployAdapter = {
  async preview(ctx: DeployContext): Promise<DeployDiffEntry[]> {
    return diffAgainstManifest(ctx.projectPath, ctx.target.id, ctx.buildDir)
  },

  async run(ctx, excludePaths): Promise<DeployResult> {
    const destination = ctx.target.destination
    if (destination.type !== 'folder') throw new Error(mainT('deployWrongType', { adapter: 'Ordner' }))
    const dest = resolve(destination.path)

    // Two directions, both fatal, both easy to configure by accident: publishing into the build
    // output copies the tree into itself, and publishing the build output *of* a folder that
    // contains it is the same loop seen from the other end.
    if (isInside(ctx.buildDir, dest) || isInside(dest, ctx.buildDir)) {
      return {
        success: false,
        output: mainT('folderOverlapsBuild', { dest, build: ctx.buildDir })
      }
    }
    if (dest === resolve(ctx.projectPath)) {
      return { success: false, output: mainT('folderIsProject') }
    }

    const diff = await diffAgainstManifest(ctx.projectPath, ctx.target.id, ctx.buildDir)
    const { toUpload, toDelete, manifestExcludes } = partitionDiff(diff, excludePaths, destination.deleteRemoved)

    let output = ''
    try {
      const total = toUpload.length + toDelete.length
      let processed = 0
      const ensuredDirs = new Set<string>()

      // A target that has been published to before and whose folder is now gone or holds none of
      // the files it published is not looking at the folder it was published to: a share or disk
      // that is not connected, or under Linux the bare mount point it leaves behind. rm() with force
      // counted every deletion there as done and the manifest forgot those files, which then stayed
      // on the drive for good; uploads failed with a raw EACCES on /Volumes, and into an emptied
      // folder only the changed files went while the run said success. Measured on a detached disk
      // image (review 2026-11-01, M2; the Linux mount point only as an emptied folder). Asked when
      // there is nothing to do as well: that run said "Nichts zu tun" with the image detached, and
      // the page shows "Upload everything again", the way out named below, for every folder target,
      // not only with changes.
      const published = Object.keys(await readManifest(ctx.projectPath, ctx.target.id))
      if (published.length > 0) {
        const state = await folderState(dest, published)
        // Removing the relay: none of its files there is what was asked for, and so is a missing
        // folder of its own while the one above it is there; without that one, it may be a disk
        // that is not connected.
        if (state === 'missing' && ctx.onlyPaths) {
          if (existsSync(dirname(dest))) return { success: true, output: mainT('relayRemoveGone', { path: dest }) }
          return { success: false, output: mainT('relayRemoveFolderMissing', { dest }) }
        }
        if (state === 'missing') return { success: false, output: mainT('folderMissing', { dest }) }
        if (state === 'unpublished') {
          if (ctx.onlyPaths) return { success: true, output: mainT('relayRemoveGone', { path: dest }) }
          return { success: false, output: mainT('folderNotPublished', { dest }) }
        }
      }

      // Removing the relay: only this upload's (relayGuard.ts).
      if (ctx.ownGeneration) {
        const read = await readFile(join(dest, RELAY_GENERATED), 'utf-8').catch((err: NodeJS.ErrnoException) =>
          err.code === 'ENOENT' || err.code === 'ENOTDIR' ? null : { unreadable: err.message.split(',')[0] }
        )
        const refusal = relayGuard(read, ctx.ownGeneration, dest)
        if (refusal) return refusal
      }

      for (const relPath of toUpload) {
        const target = join(dest, relPath)
        await mkdir(dirname(target), { recursive: true })
        // The relay's folders get their modes as over SFTP: cp carries a file's mode, and a folder
        // that was there kept its own, 0700 and 0777 after an upload (review 2026-10-29, N7 and
        // nebenbei). `dest` is the relay's folder below the target's (runDirectoryUpload).
        if (ctx.keepLocalModes && !ensuredDirs.has(dirname(target))) {
          ensuredDirs.add(dirname(target))
          const wanted = (await stat(join(ctx.buildDir, dirname(relPath)))).mode & 0o7777
          await chmod(dirname(target), wanted).catch(() => undefined)
          const actual = (await stat(dirname(target))).mode & 0o7777
          if (actual !== wanted) output += `${mainT('folderModeNotSet', { mode: wanted.toString(8), actual: actual.toString(8), path: dirname(target) })}\n`
        }
        // Written under a scratch name and renamed into place, because the whole point of a folder
        // target is that something else is watching the folder - a cloud client, a web server. A
        // direct copy is observable half-written; a rename within the same directory is not.
        const scratch = `${target}.qc-${randomBytes(4).toString('hex')}`
        try {
          await cp(join(ctx.buildDir, relPath), scratch)
          await rename(scratch, target)
        } catch (err) {
          await rm(scratch, { force: true })
          throw err
        }
        processed++
        ctx.emitProgress(processed, total, relPath)
        output += `→ ${relPath}\n`
      }

      // A refused deletion is said per file and the others are still tried, as over SFTP and FTP;
      // the file stays in the manifest. Thrown, the first one ended the run with a bare "Error:
      // EACCES: …, unlink '…/config.generated.php'" and the other two unnamed (folder 555, review
      // 2026-11-04, M1), and a website deploy the same way (nebenbei).
      const kept: string[] = []
      // Removing the relay: a file that was not there is not said deleted, as over SFTP and FTP. With
      // rm's force it said "✗ send.php" for a send.php deleted by hand (review 2026-11-04, N7).
      let missing = 0
      for (const relPath of toDelete) {
        try {
          await rm(join(dest, relPath))
          output += `✗ ${relPath}\n`
        } catch (err) {
          const code = (err as NodeJS.ErrnoException).code
          // Already gone is not an error here, same as on the remote adapters.
          if (code === 'ENOENT') {
            if (ctx.onlyPaths) missing++
            else output += `✗ ${relPath}\n`
          } else {
            if (code !== 'EACCES' && code !== 'EPERM') throw err
            kept.push(relPath)
            output += mainT(ctx.onlyPaths ? 'relayRemoveRefused' : 'deployDeleteRefused', { path: relPath, reason: (err as Error).message.split(',')[0] })
          }
        }
        processed++
        ctx.emitProgress(processed, total, relPath)
      }
      if (ctx.onlyPaths && missing === toDelete.length) output += mainT('relayRemoveGone', { path: dest })

      await commitManifest(ctx.projectPath, ctx.target.id, ctx.buildDir, [...manifestExcludes, ...kept])
      if (ctx.onlyPaths && kept.length > 0) return { success: false, output: output + mainT('relayRemoveRefusedRest') }
      return { success: true, output: output || mainT('deployNothingToDo') }
    } catch (err) {
      // Without a leading empty line: the relay's panel announces the first line (M1).
      return { success: false, output: [output.trimEnd(), String(err)].filter(Boolean).join('\n') }
    }
  }
}
