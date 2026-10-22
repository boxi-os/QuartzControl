import { join, posix } from 'path'
import { Client as FtpClient, FTPError } from 'basic-ftp'
import type { DeployDiffEntry, DeployResult } from '@shared/ipc-contract'
import { fromLoginDir } from '@shared/remotePath'
import type { DeployAdapter, DeployContext } from './types'
import { commitManifest, diffAgainstManifest, partitionDiff } from './manifest'
import * as connectionsService from '../connectionsService'
import { mainT } from '../../i18n'

// basic-ftp's own default, written out so the sentence below names the same number. Without it a
// server that went silent while deleting ended the run with a bare "Error: Timeout (control
// socket)" after 30.5 s (vsftpd frozen on debian-vm, review 2026-11-01, nebenbei).
const FTP_TIMEOUT_MS = 30_000

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

    const client = new FtpClient(FTP_TIMEOUT_MS)
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
      // (debian-vm, since 1.1.0, review 2026-10-31). An absolute path does not need it and keeps "/",
      // as 1.1.0 did: a PWD reply without quotes, which basic-ftp cannot parse, failed every run
      // with "Can't parse response to command 'PWD'" (proxy in front of vsftpd, review 2026-11-01,
      // nebenbei).
      // A relative path and "~" do need it, so a reply that cannot be read gets a sentence with the
      // reply in it - it usually names the folder - and the way out, an absolute path (same proxy).
      let start = '/'
      if (!destination.remotePath.startsWith('/')) {
        try {
          start = await client.pwd()
        } catch (err) {
          const unread = err instanceof Error && /^Can't parse response to command 'PWD': /.exec(err.message)
          if (!(err instanceof FTPError) && !unread) throw err
          // the reply goes in parentheses mid-sentence, so its own closing period goes, as in
          // deployDeleteRefused ("(550 PWD not allowed here.).", review 2026-11-02, nebenbei)
          const reply = (unread ? err.message.slice(unread[0].length) : (err as Error).message).replace(/\.+$/, '')
          return { success: false, output: mainT('ftpPwdUnreadable', { path: destination.remotePath, reply }) }
        }
      }
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
            // The server's own sentence, which vsftpd ends with a period: "(550 Delete operation
            // failed.)." (review 2026-11-01, nebenbei). Not on SFTP, whose message ends with the path.
            output += mainT('deployDeleteRefused', { path: relPath, reason: err.message.replace(/\.+$/, '') })
          }
        }
        processed++
        ctx.emitProgress(processed, total, relPath)
      }

      await commitManifest(ctx.projectPath, ctx.target.id, ctx.buildDir, [...manifestExcludes, ...kept])
      return { success: true, output }
    } catch (err) {
      const silent = /^Timeout \((control|data) socket\)$/.test(err instanceof Error ? err.message : '')
        ? `${mainT('sshSilent', { host: connection.host, seconds: FTP_TIMEOUT_MS / 1000 })}\n\n`
        : ''
      return { success: false, output: `${output}\n${silent}${String(err)}` }
    } finally {
      client.close()
    }
  }
}
