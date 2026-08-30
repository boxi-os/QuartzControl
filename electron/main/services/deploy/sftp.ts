import { readFile } from 'fs/promises'
import { join, posix } from 'path'
import SftpClient from 'ssh2-sftp-client'
import type { DeployDiffEntry, DeployResult, SshConnection } from '@shared/ipc-contract'
import type { DeployAdapter, DeployContext } from './types'
import { commitManifest, diffAgainstManifest, partitionDiff } from './manifest'
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
          ensuredDirs.add(remoteDir)
        }
        await client.put(join(ctx.buildDir, relPath), remotePath)
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
