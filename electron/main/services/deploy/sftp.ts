import { readFile } from 'fs/promises'
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

// A connection that goes silent (a frozen sshd-session on debian-vm, a NAT that forgets it) left
// the upload waiting for good: still running after 150 s (review 2026-10-30, nebenbei). ssh2 sends
// no keepalives unless asked, and the operating system's own probes start after two hours. rsync's
// ssh gets the same through ServerAliveInterval.
export const SSH_KEEPALIVE_MS = 15_000
export const SSH_KEEPALIVE_COUNT = 3
// Both give up at the fourth unanswered keepalive, 45 to 60 s after the last answer: measured 50
// to 62 s after a SIGSTOP on debian-vm. ssh2 counts only answers to its keepalives, not data, so a
// server that ignores them would end every SFTP upload after 60 s (a mock server, review
// 2026-10-31, N5); OpenSSH answers them, and no server that does not was found.
export const SSH_SILENT_SECONDS = (SSH_KEEPALIVE_MS * (SSH_KEEPALIVE_COUNT + 1)) / 1000

// The one-time chmod pass below; ssh2-sftp-client adds listeners per call, and Node warns past ten.
const CHMOD_CONCURRENCY = 8

// The server's answer to a request is an SFTP status, which ssh2 hands on as a number (measured: 2 for
// a missing file, 3 for a chmod qcsftp may not make); ssh2-sftp-client makes 2 and 4 of a stat
// 'ENOENT'. A dropped connection comes as ERR_NOT_CONNECTED or without a code.
function serverAnswered(err: unknown): boolean {
  const code = (err as { code?: unknown }).code
  return typeof code === 'number' || code === 'ENOENT'
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
    // ssh2 says "Keepalive timeout" as an 'error' event. When the deadline falls between two calls,
    // the next call only says "No SFTP connection available" (a mock server, review 2026-10-31, N5).
    let wentSilent = false
    client.on('error', (err: Error) => {
      if (/Keepalive timeout/.test(String(err))) wentSilent = true
    })
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
        keepaliveInterval: SSH_KEEPALIVE_MS,
        keepaliveCountMax: SSH_KEEPALIVE_COUNT,
        ...(await sshAuthOptions(connection, ctx.secret))
      })

      // The one-time pass below, counted in from the start: its paths are known now, and the
      // progress stood still through it, 6.6 s for 475 files on debian-vm (review 2026-10-30,
      // nebenbei).
      const settle = !modesSettled(ctx.projectPath, ctx.target.id)
      const skip = new Set([...toUpload, ...toDelete, ...excludePaths])
      const earlier = settle ? Object.keys(await readManifest(ctx.projectPath, ctx.target.id)).filter((path) => !skip.has(path)) : []
      const total = toUpload.length + toDelete.length + earlier.length
      let processed = 0
      const ensuredDirs = new Set<string>()

      for (const relPath of toUpload) {
        const remotePath = posix.join(destination.remotePath, relPath)
        const remoteDir = posix.dirname(remotePath)
        if (!ensuredDirs.has(remoteDir)) {
          await client.mkdir(remoteDir, true)
          ensuredDirs.add(remoteDir)
        }
        // ssh2 opens every file with mode 0666 and then sets that mode with fchmod, so the server's
        // umask never applies: measured on a Debian host (OpenSSH sftp-server), all 475 files of a
        // published site were writable by every account there, and a file that had been 0644
        // became 0666 when overwritten. An explicit mode is set the same way and wins.
        await client.put(join(ctx.buildDir, relPath), remotePath, { writeStreamOptions: { mode: 0o644 } })
        processed++
        ctx.emitProgress(processed, total, relPath)
        output += `↑ ${relPath}\n`
      }

      // What was not deleted stays in the manifest, so the next upload offers it again.
      const kept: string[] = []
      for (const relPath of toDelete) {
        try {
          await client.delete(posix.join(destination.remotePath, relPath))
          output += `✗ ${relPath}\n`
        } catch (err) {
          // Only the server saying the file is missing (status 2) means it is gone. Every error was
          // taken for that: measured on debian-vm with the session frozen at the 9th of 178
          // deletions, the run said success, 168 files stayed online and the manifest forgot all of
          // them (review 2026-10-31, M1). A dropped connection fails the run, and the manifest
          // stays as it was.
          if (!serverAnswered(err)) throw err
          if ((err as { code?: unknown }).code === 2) output += `✗ ${relPath}\n`
          else {
            kept.push(relPath)
            output += mainT('deployDeleteRefused', { path: relPath, reason: (err as Error).message })
          }
        }
        processed++
        ctx.emitProgress(processed, total, relPath)
      }

      // Up to 1.1.0 every file went up as 0666 (above), and the manifest never sends an unchanged
      // file again: after the fix, 474 of a site's 475 files stayed 0666 on debian-vm, and nothing
      // said so (review 2026-10-29, M6). So once per target, every file sent before and not sent
      // now gets its mode alone, no data. A server that refuses chmod has kept its umask anyway.
      // Several requests at a time on the one channel: one after the other, 474 took 23 s.
      if (settle) {
        let set = 0
        let refused = 0
        let answered = 0
        let next = 0
        await Promise.all(
          Array.from({ length: Math.min(CHMOD_CONCURRENCY, earlier.length) }, async () => {
            for (let i = next++; i < earlier.length; i = next++) {
              const remotePath = posix.join(destination.remotePath, earlier[i])
              try {
                // Only what 1.1.0 left behind: a regular file at exactly 0666. chmod is SETSTAT on
                // the path and follows a symlink; measured on debian-vm, the pass made a 0600 file
                // outside the site readable over the web through one, set a folder to 0644 (403 for
                // everything in it) and widened a file set to 0600 by hand (review 2026-10-30, M2).
                // lstat does not follow, and taking 0666 to 0644 can only narrow.
                const stats = await (client as SftpClient & { lstat(path: string): Promise<SftpClient.FileStats> }).lstat(remotePath)
                if (stats.isFile && (stats.mode & 0o7777) === 0o666) {
                  try {
                    await client.chmod(remotePath, 0o644)
                    set++
                  } catch (err) {
                    if (!serverAnswered(err)) throw err
                    refused++
                  }
                }
                answered++
              } catch (err) {
                // Anything the server did not answer is the connection, and every call after it fails
                // at once: measured on debian-vm with the session ended at the 64th mode, the pass
                // said 72 of 475 and settled the target with 403 files left at 0666 (review
                // 2026-10-30, M1). So the rest is left for the next upload.
                if (serverAnswered(err)) answered++
                else next = earlier.length
              }
              processed++
              ctx.emitProgress(processed, total, mainT('sftpModesProgress', { path: earlier[i] }))
            }
          })
        )
        const left = earlier.length - answered
        if (left) output += mainT('sftpModesUnfinished', { count: set, total: earlier.length, left })
        else if (set) output += mainT('sftpModesSettled', { count: set, total: earlier.length })
        // A server that refused every chmod refused ssh2's fchmod too, so its files never were 0666
        // and nothing is left to say (sftp-server -P setstat,fsetstat,lsetstat on debian-vm). One
        // that refuses now what it allowed then (another owner, say) leaves them writable.
        if (refused) output += mainT('sftpModesRefused', { count: refused, total: earlier.length })
        if (!left) await settleModes(ctx.projectPath, ctx.target.id)
      }

      await commitManifest(ctx.projectPath, ctx.target.id, ctx.buildDir, [...manifestExcludes, ...kept])
      return { success: true, output }
    } catch (err) {
      // the host-key message explains what actually happened; ssh2's own error does not
      const silent = wentSilent || /Keepalive timeout/.test(String(err)) ? `${mainT('sshSilent', { host: connection.host, seconds: SSH_SILENT_SECONDS })}\n\n` : ''
      return { success: false, output: `${output}\n${hostKeyRejection ?? `${silent}${String(err)}`}` }
    } finally {
      client.end().catch(() => {})
    }
  }
}

export { resolveConnection as resolveSshConnection }
