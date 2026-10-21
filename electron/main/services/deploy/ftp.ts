import { stat } from 'fs/promises'
import { join, posix } from 'path'
import { Client as FtpClient } from 'basic-ftp'
import type { DeployDiffEntry, DeployResult } from '@shared/ipc-contract'
import type { DeployAdapter, DeployContext } from './types'
import { commitManifest, diffAgainstManifest, partitionDiff } from './manifest'
import * as connectionsService from '../connectionsService'
import { mainT } from '../../i18n'

/**
 * FTP has no mode of its own: a file gets what the server's umask leaves (vsftpd's default is 077,
 * most hosts 022). SITE CHMOD is an extension that a server may refuse; a refusal is said, not
 * failed, since the file is there and the relay may well work with the server's mode.
 */
async function siteChmod(client: FtpClient, remotePath: string, localPath: string): Promise<string> {
  const mode = ((await stat(localPath)).mode & 0o777).toString(8)
  if (/[\r\n]/.test(remotePath)) return `${mainT('ftpChmodRefused', { mode, path: remotePath })}\n`
  try {
    await client.send(`SITE CHMOD ${mode} ${remotePath}`)
    return ''
  } catch {
    return `${mainT('ftpChmodRefused', { mode, path: remotePath })}\n`
  }
}

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

      const total = toUpload.length + toDelete.length
      let processed = 0
      const ensuredDirs = new Set<string>()

      for (const relPath of toUpload) {
        const remotePath = posix.join(destination.remotePath, relPath)
        const remoteDir = posix.dirname(remotePath)
        if (!ensuredDirs.has(remoteDir)) {
          await client.ensureDir(remoteDir)
          await client.cd('/')
          ensuredDirs.add(remoteDir)
          if (ctx.keepLocalModes) output += await siteChmod(client, remoteDir, join(ctx.buildDir, posix.dirname(relPath)))
        }
        await client.uploadFrom(join(ctx.buildDir, relPath), remotePath)
        if (ctx.keepLocalModes) output += await siteChmod(client, remotePath, join(ctx.buildDir, relPath))
        processed++
        ctx.emitProgress(processed, total, relPath)
        output += `↑ ${relPath}\n`
      }

      for (const relPath of toDelete) {
        try {
          await client.remove(posix.join(destination.remotePath, relPath))
        } catch {
          // already absent remotely
        }
        processed++
        ctx.emitProgress(processed, total, relPath)
        output += `✗ ${relPath}\n`
      }

      await commitManifest(ctx.projectPath, ctx.target.id, ctx.buildDir, manifestExcludes)
      return { success: true, output }
    } catch (err) {
      return { success: false, output: `${output}\n${String(err)}` }
    } finally {
      client.close()
    }
  }
}
