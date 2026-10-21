import { join, posix } from 'path'
import { Client as FtpClient, FTPError } from 'basic-ftp'
import type { DeployDiffEntry, DeployResult } from '@shared/ipc-contract'
import { fromLoginDir } from '@shared/remotePath'
import type { DeployAdapter, DeployContext } from './types'
import { commitManifest, diffAgainstManifest, partitionDiff } from './manifest'
import * as connectionsService from '../connectionsService'
import { mainT } from '../../i18n'

export const ftpAdapter: DeployAdapter = {
  async preview(ctx: DeployContext): Promise<DeployDiffEntry[]> {
    return diffAgainstManifest(ctx.projectPath, ctx.target.id, ctx.buildDir)
  },

  async run(ctx, excludePaths): Promise<DeployResult> {
    const destination = ctx.target.destination
    if (destination.type !== 'ftp') throw new Error(mainT('deployWrongType', { adapter: 'FTP' }))
    const connection = ctx.target.connectionId ? await connectionsService.getConnection(ctx.target.connectionId) : null
    if (!connection || connection.kind !== 'ftp') throw new Error(mainT('ftpNoConnection'))

    const diff = await diffAgainstManifest(ctx.projectPath, ctx.target.id, ctx.buildDir)
    const { toUpload, toDelete, manifestExcludes } = partitionDiff(diff, excludePaths, destination.deleteRemoved)

    const client = new FtpClient()
    let output = ''
    try {
      await client.access({
        host: connection.host,
        port: connection.port,
        user: connection.username,
        password: ctx.secret ?? undefined,
        // FTP is cleartext by nature and has no host key to pin - FTPS is the only protection
        // available here, which is why the connection carries it as an explicit flag.
        secure: connection.secure
      })

      // A relative remote path is meant from where the login starts, and ensureDir moves the working
      // folder, so back there after each, not to "/": on a vsftpd without chroot "/" is the server's
      // root, and a target "review57-rel" failed at its first file with "553 Could not create file"
      // (debian-vm, since 1.1.0, review 2026-10-31).
      const start = await client.pwd()
      const root = fromLoginDir(destination.remotePath, start, connection.username)
      if (root === null) return { success: false, output: mainT('deployTildeOtherAccount', { path: destination.remotePath }) }
      const total = toUpload.length + toDelete.length
      let processed = 0
      const ensuredDirs = new Set<string>()

      for (const relPath of toUpload) {
        const remotePath = posix.join(root, relPath)
        const remoteDir = posix.dirname(remotePath)
        if (!ensuredDirs.has(remoteDir)) {
          await client.ensureDir(remoteDir)
          await client.cd(start)
          ensuredDirs.add(remoteDir)
        }
        await client.uploadFrom(join(ctx.buildDir, relPath), remotePath)
        processed++
        ctx.emitProgress(processed, total, relPath)
        output += `↑ ${relPath}\n`
      }

      // What was not deleted stays in the manifest, so the next upload offers it again (sftp.ts, run).
      const kept: string[] = []
      for (const relPath of toDelete) {
        const remotePath = posix.join(root, relPath)
        try {
          await client.remove(remotePath)
          output += `✗ ${relPath}\n`
        } catch (err) {
          // Only a reply of the server counts. With vsftpd frozen, the run said success and left 47 of
          // 178 files online, all of them gone from the manifest (review 2026-10-31, M1).
          if (!(err instanceof FTPError)) throw err
          // 550 is the answer for a missing file and for a refused one alike, on vsftpd, ProFTPD and
          // Pure-FTPd: a file in a folder 555 was said deleted, stayed online and left the manifest,
          // so no later run tried again (debian-vm, support matrix, 2026-10-21). SIZE tells them
          // apart on all three; what it cannot answer is kept, to be asked again next time.
          const gone =
            err.code === 550 &&
            (await client.size(remotePath).then(
              () => false,
              (sizeErr: unknown) => {
                if (!(sizeErr instanceof FTPError)) throw sizeErr
                return sizeErr.code === 550
              }
            ))
          if (gone) output += `✗ ${relPath}\n`
          else {
            kept.push(relPath)
            output += mainT('deployDeleteRefused', { path: relPath, reason: err.message })
          }
        }
        processed++
        ctx.emitProgress(processed, total, relPath)
      }

      await commitManifest(ctx.projectPath, ctx.target.id, ctx.buildDir, [...manifestExcludes, ...kept])
      return { success: true, output }
    } catch (err) {
      return { success: false, output: `${output}\n${String(err)}` }
    } finally {
      client.close()
    }
  }
}
