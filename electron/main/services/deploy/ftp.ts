import { stat } from 'fs/promises'
import { join, posix } from 'path'
import { Client as FtpClient, FTPError } from 'basic-ftp'
import type { DeployDiffEntry, DeployResult } from '@shared/ipc-contract'
import { fromLoginDir } from '@shared/remotePath'
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
 * gets the refusal itself. Special bits are not seen: basic-ftp reads `rws` as `rwx` and only the
 * last three digits of MLSD's unix.mode (review 2026-10-29, N8, read in basic-ftp 6.2.0).
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
          const reply = unread ? err.message.slice(unread[0].length) : (err as Error).message
          return { success: false, output: mainT('ftpPwdUnreadable', { path: destination.remotePath, reply }) }
        }
      }
      const root = fromLoginDir(destination.remotePath, start, connection.username)
      if (root === null) return { success: false, output: mainT('deployTildeOtherAccount', { path: destination.remotePath }) }

      // The folders above a site's folder are not made (sftp.ts, run).
      if (!ctx.keepLocalModes && toUpload.length > 0) {
        const parent = posix.dirname(root.replace(/\/+$/, ''))
        const found = await client.cd(parent).then(
          () => true,
          () => false
        )
        await client.cd(start)
        if (!found) return { success: false, output: mainT('deployParentMissing', { path: parent }) }
      }

      // The relay's folder must not be a symlink on the server (sftp.ts, run).
      if (ctx.keepLocalModes) {
        for (const folder of (ctx.relayFolders ?? [destination.remotePath]).map((f) => fromLoginDir(f, start, connection.username) ?? f)) {
          const listing = await client.list(posix.dirname(folder)).catch((err: unknown) => {
            if (!(err instanceof FTPError)) throw err
            return []
          })
          const entry = listing.find((f) => f.name === posix.basename(folder))
          if (entry?.isSymbolicLink) return { success: false, output: mainT('relayDirSymlink', { path: folder }) }
          if (entry) continue
          // vsftpd lists a missing folder and one it may not read alike, empty or with only that
          // folder's own entry: a link in a folder 311 went unseen, and the relay set the folder it
          // points to from 2750 to 755 (debian-vm, review 2026-10-31, nebenbei). A folder that
          // cannot be listed but entered is there, and what it is cannot be said.
          const there = await client.cd(folder).then(
            () => true,
            (err: unknown) => {
              if (!(err instanceof FTPError)) throw err
              return false
            }
          )
          await client.cd(start)
          if (there) return { success: false, output: mainT('relayDirUnchecked', { path: folder, reason: mainT('relayDirUnlisted') }) }
          break
        }
      }

      const total = toUpload.length + toDelete.length
      let processed = 0
      const ensuredDirs = new Set<string>()
      const refused: Refused[] = []
      const chmod = async (remotePath: string, localPath: string): Promise<void> => {
        const r = await siteChmod(client, remotePath, localPath)
        if (r) refused.push(r)
      }

      for (const relPath of toUpload) {
        const remotePath = posix.join(root, relPath)
        const remoteDir = posix.dirname(remotePath)
        if (!ensuredDirs.has(remoteDir)) {
          await client.ensureDir(remoteDir)
          await client.cd(start)
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
