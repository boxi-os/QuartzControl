import { stat } from 'fs/promises'
import { join, posix } from 'path'
import { Client as FtpClient } from 'basic-ftp'
import type { DeployDiffEntry, DeployResult } from '@shared/ipc-contract'
import type { DeployAdapter, DeployContext } from './types'
import { commitManifest, diffAgainstManifest, partitionDiff } from './manifest'
import * as connectionsService from '../connectionsService'
import { mainT } from '../../i18n'

interface Refused {
  remotePath: string
  wanted: number
}

/**
 * FTP has no mode of its own: a file gets what the server's umask leaves (vsftpd's default is 077,
 * most hosts 022). SITE CHMOD is an extension that a server may refuse; a refusal is not a
 * failure, since the file is there and may well have the wanted mode already. Answers the refusal,
 * for modeNotes() to look at.
 */
async function siteChmod(client: FtpClient, remotePath: string, localPath: string): Promise<Refused | null> {
  const wanted = (await stat(localPath)).mode & 0o777
  if (/[\r\n]/.test(remotePath)) return { remotePath, wanted }
  try {
    await client.send(`SITE CHMOD ${wanted.toString(8)} ${remotePath}`)
    return null
  } catch {
    return { remotePath, wanted }
  }
}

/**
 * What the server holds for each refused path, read from LIST (one per folder): a line only where
 * it is not what was wanted. Measured with vsftpd's chmod_enable=NO: a line for every file and
 * folder said "not set", five of six of them already holding the wanted mode through the umask.
 * A server whose LIST carries no Unix modes (basic-ftp: no `permissions`) cannot be asked, and
 * gets the refusal itself.
 */
async function modeNotes(client: FtpClient, refused: Refused[]): Promise<string> {
  const byFolder = new Map<string, Refused[]>()
  for (const r of refused) byFolder.set(posix.dirname(r.remotePath), [...(byFolder.get(posix.dirname(r.remotePath)) ?? []), r])
  let out = ''
  for (const [folder, entries] of byFolder) {
    const listing = await client.list(folder).catch(() => [])
    for (const { remotePath, wanted } of entries) {
      const p = listing.find((f) => f.name === posix.basename(remotePath))?.permissions
      const mode = wanted.toString(8)
      if (!p) out += `${mainT('ftpChmodRefused', { mode, path: remotePath })}\n`
      else {
        const actual = (p.user << 6) | (p.group << 3) | p.world
        if (actual !== wanted) out += `${mainT('modeNotSet', { mode, actual: actual.toString(8), path: remotePath })}\n`
      }
    }
  }
  return out
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
      const refused: Refused[] = []
      const chmod = async (remotePath: string, localPath: string): Promise<void> => {
        const r = await siteChmod(client, remotePath, localPath)
        if (r) refused.push(r)
      }

      for (const relPath of toUpload) {
        const remotePath = posix.join(destination.remotePath, relPath)
        const remoteDir = posix.dirname(remotePath)
        if (!ensuredDirs.has(remoteDir)) {
          await client.ensureDir(remoteDir)
          await client.cd('/')
          ensuredDirs.add(remoteDir)
          if (ctx.keepLocalModes) await chmod(remoteDir, join(ctx.buildDir, posix.dirname(relPath)))
        }
        await client.uploadFrom(join(ctx.buildDir, relPath), remotePath)
        if (ctx.keepLocalModes) await chmod(remotePath, join(ctx.buildDir, relPath))
        processed++
        ctx.emitProgress(processed, total, relPath)
        output += `↑ ${relPath}\n`
      }
      if (refused.length) output += await modeNotes(client, refused)

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
