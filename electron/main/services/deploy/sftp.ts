import { readFile, stat } from 'fs/promises'
import { join, posix } from 'path'
import SftpClient from 'ssh2-sftp-client'
import type { DeployDiffEntry, DeployResult, SshConnection } from '@shared/ipc-contract'
import type { DeployAdapter, DeployContext } from './types'
import { commitManifest, diffAgainstManifest, modesSettled, partitionDiff, readManifest, settleModes } from './manifest'
import { makeHostVerifier } from './hostVerifier'
import * as connectionsService from '../connectionsService'
import { mainT } from '../../i18n'

async function resolveConnection(ctx: DeployContext): Promise<SshConnection> {
  const connection = ctx.target.connectionId ? await connectionsService.getConnection(ctx.target.connectionId) : null
  if (!connection || connection.kind !== 'ssh') throw new Error(mainT('sshNoConnection'))
  return connection
}

// Auth is resolved here rather than at save time so a key file the user moves or replaces is
// picked up without re-saving the connection, and so the key contents exist only for the duration
// of the connect call.
async function readKeyFile(keyPath: string): Promise<string> {
  try {
    return await readFile(keyPath, 'utf-8')
  } catch {
    throw new Error(mainT('sshKeyFileUnreadable', { path: keyPath }))
  }
}

export async function sshAuthOptions(connection: SshConnection, secret: string | null): Promise<Record<string, unknown>> {
  if (connection.authMethod === 'agent') {
    const agent = process.env.SSH_AUTH_SOCK
    if (!agent) throw new Error(mainT('sshNoAgent'))
    return { agent }
  }
  if (connection.authMethod === 'privateKey') {
    // With a keyPath the file is the source of truth; without one the key contents are the stored
    // secret (a pasted key, or one carried over from the pre-split profiles).
    // Read here rather than trusted: `ssh -i` silently skips a key file it cannot open and then
    // fails as "Permission denied (publickey)", which both this adapter and rsync's report as the
    // *server* having rejected the key. A path that moved, a wrong name or a file this user cannot
    // read is a different problem with a different fix, and it has to say so.
    const privateKey = connection.keyPath ? await readKeyFile(connection.keyPath) : (secret ?? undefined)
    if (!privateKey) throw new Error(mainT('sshNoPrivateKey'))
    return { privateKey }
  }
  return { password: secret ?? undefined }
}

// Long enough for someone to open their provider's page and compare a SHA256 fingerprint by eye.
const HANDSHAKE_WITH_PROMPT_MS = 180_000

// The one-time chmod pass below; ssh2-sftp-client adds listeners per call, and Node warns past ten.
const CHMOD_CONCURRENCY = 8

/**
 * A server may refuse to change a mode (internal-sftp -P setstat,fsetstat, ProFTPD's mod_sftp).
 * For a file ssh2 swallows that and keeps the mode it opened the file with, which the umask cut
 * (a new file) or which was there before (an existing one); a folder's chmod is caught in `run`. The
 * upload goes on either way, so what the server holds is asked and said when it differs. Measured
 * with such an account on debian-vm: the relay upload stopped at the folder with "_chmod:
 * Permission denied" and uploaded nothing. Compared with the special bits: a folder at 2750 was
 * said as "750", and a setgid the host gave it went unseen (review 2026-10-29, N8).
 */
async function modeNote(client: SftpClient, remotePath: string, wanted: number): Promise<string> {
  // A stat the server refuses says nothing about the upload, which went through: measured with a
  // stub client whose stat rejects, the relay upload stopped at its first folder and said only
  // "_stat: Permission denied" (review 2026-10-29, nebenbei).
  const actual = await client.stat(remotePath).then(
    (s) => s.mode & 0o7777,
    () => null
  )
  if (actual === null) return `${mainT('modeUnchecked', { mode: wanted.toString(8), path: remotePath })}\n`
  return actual === wanted ? '' : `${mainT('modeNotSet', { mode: wanted.toString(8), actual: actual.toString(8), path: remotePath })}\n`
}

export const sftpAdapter: DeployAdapter = {
  async preview(ctx): Promise<DeployDiffEntry[]> {
    return diffAgainstManifest(ctx.projectPath, ctx.target.id, ctx.buildDir)
  },

  async run(ctx, excludePaths): Promise<DeployResult> {
    const destination = ctx.target.destination
    if (destination.type !== 'sftp') throw new Error(mainT('deployWrongType', { adapter: 'SFTP' }))
    const connection = await resolveConnection(ctx)

    const diff = await diffAgainstManifest(ctx.projectPath, ctx.target.id, ctx.buildDir)
    const { toUpload, toDelete, manifestExcludes } = partitionDiff(diff, excludePaths, destination.deleteRemoved)

    const client = new SftpClient()
    let output = ''
    // ssh2 surfaces a rejected host key as a generic "All configured authentication methods
    // failed"-style error, which would hide the real reason - so the verifier records it here and
    // the catch below prefers this message.
    let hostKeyRejection: string | null = null
    try {
      await client.connect({
        host: connection.host,
        port: connection.port,
        username: connection.username,
        // ssh2's readyTimeout (20s by default) runs across the *whole* handshake - and the host
        // verifier below opens a native dialog in the middle of it, asking the user to compare a
        // fingerprint against what their provider publishes. That is a task measured in minutes,
        // not seconds. Reported from the alpha test as "first attempt: Timed out while waiting for
        // handshake, second attempt fine" - the second having no dialog because the key was pinned
        // by then. ssh2 offers no way to pause the clock, so the budget is widened for exactly the
        // connection that will ask, and left at the default afterwards, where a long wait really
        // does mean an unreachable host.
        readyTimeout: connection.hostKey?.fingerprint ? undefined : HANDSHAKE_WITH_PROMPT_MS,
        hostVerifier: makeHostVerifier(connection, (message) => (hostKeyRejection = message)),
        ...(await sshAuthOptions(connection, ctx.secret))
      })

      const total = toUpload.length + toDelete.length
      let processed = 0
      const ensuredDirs = new Set<string>()

      for (const relPath of toUpload) {
        const remotePath = posix.join(destination.remotePath, relPath)
        const remoteDir = posix.dirname(remotePath)
        if (!ensuredDirs.has(remoteDir)) {
          await client.mkdir(remoteDir, true)
          // mkdir leaves a folder that is already there as it is, and one the relay's rsync upload
          // had made 0700 kept Apache out of it (403) until its mode was set again.
          if (ctx.keepLocalModes) {
            const wanted = (await stat(join(ctx.buildDir, posix.dirname(relPath)))).mode & 0o777
            await client.chmod(remoteDir, wanted).catch(() => undefined)
            output += await modeNote(client, remoteDir, wanted)
          }
          ensuredDirs.add(remoteDir)
        }
        // ssh2 opens every file with mode 0666 and then sets that mode with fchmod, so the server's
        // umask never applies: measured on a Debian host (OpenSSH sftp-server), all 475 files of a
        // published site were writable by every account there, and a file that had been 0644
        // became 0666 when overwritten. An explicit mode is set the same way and wins.
        const mode = ctx.keepLocalModes ? (await stat(join(ctx.buildDir, relPath))).mode & 0o777 : 0o644
        await client.put(join(ctx.buildDir, relPath), remotePath, { writeStreamOptions: { mode } })
        if (ctx.keepLocalModes) output += await modeNote(client, remotePath, mode)
        processed++
        ctx.emitProgress(processed, total, relPath)
        output += `↑ ${relPath}\n`
      }

      for (const relPath of toDelete) {
        try {
          await client.delete(posix.join(destination.remotePath, relPath))
        } catch {
          // already absent remotely - not an error for our purposes
        }
        processed++
        ctx.emitProgress(processed, total, relPath)
        output += `✗ ${relPath}\n`
      }

      // Up to 1.1.0 every file went up as 0666 (above), and the manifest never sends an unchanged
      // file again: after the fix, 474 of a site's 475 files stayed 0666 on debian-vm, and nothing
      // said so (review 2026-10-29, M6). So once per target, every file sent before and not sent
      // now gets its mode alone, no data. A server that refuses chmod has kept its umask anyway.
      // Several requests at a time on the one channel: one after the other, 474 took 23 s.
      // Not for an upload that brings its own modes (the relay): those are set above, every time.
      if (!ctx.keepLocalModes && !modesSettled(ctx.projectPath, ctx.target.id)) {
        const skip = new Set([...toUpload, ...toDelete, ...excludePaths])
        const earlier = Object.keys(await readManifest(ctx.projectPath, ctx.target.id)).filter((path) => !skip.has(path))
        let set = 0
        let next = 0
        await Promise.all(
          Array.from({ length: Math.min(CHMOD_CONCURRENCY, earlier.length) }, async () => {
            for (let i = next++; i < earlier.length; i = next++) {
              try {
                await client.chmod(posix.join(destination.remotePath, earlier[i]), 0o644)
                set++
              } catch {
                // removed on the server by hand, or chmod refused: nothing this pass can fix
              }
            }
          })
        )
        // A server that refused every chmod refused ssh2's fchmod too, so its files never were 0666:
        // said apart, measured with sftp-server -P setstat,fsetstat,lsetstat on debian-vm.
        if (set) output += mainT('sftpModesSettled', { count: set, total: earlier.length })
        else if (earlier.length) output += mainT('sftpModesRefused', { total: earlier.length })
        await settleModes(ctx.projectPath, ctx.target.id)
      }

      await commitManifest(ctx.projectPath, ctx.target.id, ctx.buildDir, manifestExcludes)
      return { success: true, output }
    } catch (err) {
      // the host-key message explains what actually happened; ssh2's own error does not
      return { success: false, output: `${output}\n${hostKeyRejection ?? String(err)}` }
    } finally {
      client.end().catch(() => {})
    }
  }
}

export { resolveConnection as resolveSshConnection }
