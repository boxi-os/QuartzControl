import { randomBytes } from 'crypto'
import { cp, mkdir, rename, rm } from 'fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'path'
import type { DeployDiffEntry, DeployResult } from '@shared/ipc-contract'
import type { DeployAdapter, DeployContext } from './types'
import { commitManifest, diffAgainstManifest, partitionDiff } from './manifest'

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
    if (destination.type !== 'folder') throw new Error('Falscher Zieltyp für den Ordner-Adapter.')
    const dest = resolve(destination.path)

    // Two directions, both fatal, both easy to configure by accident: publishing into the build
    // output copies the tree into itself, and publishing the build output *of* a folder that
    // contains it is the same loop seen from the other end.
    if (isInside(ctx.buildDir, dest) || isInside(dest, ctx.buildDir)) {
      return {
        success: false,
        output: `Das Zielverzeichnis (${dest}) liegt im Build-Verzeichnis (${ctx.buildDir}) oder umgekehrt. Bitte einen davon unabhängigen Ordner wählen.`
      }
    }
    if (dest === resolve(ctx.projectPath)) {
      return { success: false, output: 'Das Projektverzeichnis selbst kann kein Veröffentlichungsziel sein.' }
    }

    const diff = await diffAgainstManifest(ctx.projectPath, ctx.target.id, ctx.buildDir)
    const { toUpload, toDelete, manifestExcludes } = partitionDiff(diff, excludePaths, destination.deleteRemoved)

    let output = ''
    try {
      const total = toUpload.length + toDelete.length
      let processed = 0

      for (const relPath of toUpload) {
        const target = join(dest, relPath)
        await mkdir(dirname(target), { recursive: true })
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

      for (const relPath of toDelete) {
        // force: already gone is not an error here, same as on the remote adapters
        await rm(join(dest, relPath), { force: true })
        processed++
        ctx.emitProgress(processed, total, relPath)
        output += `✗ ${relPath}\n`
      }

      await commitManifest(ctx.projectPath, ctx.target.id, ctx.buildDir, manifestExcludes)
      return { success: true, output: output || 'Nichts zu tun - das Ziel ist bereits aktuell.\n' }
    } catch (err) {
      return { success: false, output: `${output}\n${String(err)}` }
    }
  }
}
