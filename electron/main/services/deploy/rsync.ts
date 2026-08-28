import { spawn } from 'child_process'
import { chmod, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join, posix } from 'path'
import type { DeployDiffEntry, DeployResult, SshConnection } from '@shared/ipc-contract'
import type { DeployAdapter, DeployContext } from './types'
import { rsyncBlockReason, type RsyncBlockReason } from '@shared/rsyncSupport'
import * as connectionsService from '../connectionsService'

// rsync asks the *remote* what it has instead of trusting a local record of what we last sent, so
// this adapter keeps no manifest at all - which also means it notices a file someone deleted on
// the server behind our back, something the manifest-based adapters structurally cannot.
//
// macOS ships openrsync (protocol 29, "rsync 2.6.9 compatible"), not rsync 3.x, so every flag used
// here was checked against it rather than against rsync's man page: -rlt, --delete, --dry-run,
// --itemize-changes, --exclude-from, -e and --port all exist. Notably absent: --protect-args, which
// is why a remote path containing whitespace is refused below rather than quoted.

// The rule itself lives in shared/rsyncSupport.ts so the target form can ask the same question
// before offering rsync; only the wording is local.
const BLOCKER_MESSAGES: Record<RsyncBlockReason, string> = {
  'password-auth':
    'rsync kann kein Passwort übergeben. Bitte einen Zugang mit Schlüsseldatei oder SSH-Agent verwenden - oder bei SFTP bleiben.',
  'key-not-a-file':
    'Für rsync muss der private Schlüssel als Datei hinterlegt sein; ein eingefügter Schlüsseltext reicht nicht, weil ssh eine Datei braucht.',
  'no-pinned-host-key':
    'Der Host-Key dieses Servers ist noch nicht vollständig hinterlegt. Bitte das Ziel einmal über SFTP veröffentlichen - dabei wird der Schlüssel bestätigt und gespeichert - und danach auf rsync umstellen.',
  'platform-unsupported': 'rsync steht auf diesem Betriebssystem nicht zur Verfügung. Bitte SFTP verwenden.'
}

// "host key-type base64" - with the bracketed form ssh itself uses whenever the port is not 22.
function knownHostsLine(connection: SshConnection): string {
  const host = connection.port === 22 ? connection.host : `[${connection.host}]:${connection.port}`
  return `${host} ${connection.hostKey?.type ?? ''} ${connection.hostKey?.blob ?? ''}\n`
}

interface SshEnv {
  dir: string
  rshCommand: string
  cleanup(): Promise<void>
}

// rsync splits its -e value on whitespace, and both paths that have to go in there routinely
// contain a space: Electron's userData lives under "Application Support", and a key file can sit
// anywhere. So -e gets a wrapper script instead, created in a directory that has no spaces of its
// own (os.tmpdir() is /var/folders/... on macOS) with everything quoted *inside* the script, where
// the shell - not rsync - does the parsing.
async function prepareSshEnv(connection: SshConnection): Promise<SshEnv> {
  const dir = await mkdtemp(join(tmpdir(), 'qc-rsync-'))
  const knownHosts = join(dir, 'known_hosts')
  await writeFile(knownHosts, knownHostsLine(connection), 'utf-8')

  const options = [
    `-o UserKnownHostsFile='${knownHosts}'`,
    "-o StrictHostKeyChecking=yes",
    // No prompts of any kind: rsync runs unattended here, and a password or confirmation prompt
    // would hang forever behind a pipe nobody reads.
    '-o BatchMode=yes',
    `-p ${connection.port}`
  ]
  if (connection.authMethod === 'privateKey' && connection.keyPath) {
    options.push(`-i '${connection.keyPath}'`, '-o IdentitiesOnly=yes')
  }

  const script = join(dir, 'ssh.sh')
  await writeFile(script, `#!/bin/sh\nexec ssh ${options.join(' ')} "$@"\n`, 'utf-8')
  await chmod(script, 0o700)

  return { dir, rshCommand: script, cleanup: () => rm(dir, { recursive: true, force: true }) }
}

// One itemized line. The format is "YXcstpoguax path": Y is what happened, X is the entry type.
// Directory entries are skipped - the diff is a list of files, and a bare "cd+++++++ unter/" for a
// directory that only exists because a file inside it changed would be noise.
function parseItemized(line: string): DeployDiffEntry | null {
  if (line.startsWith('*deleting ')) return { path: line.slice('*deleting '.length).trim(), status: 'removed' }
  const match = /^([<>ch.])([fdLDS])([^ ]*) (.+)$/.exec(line)
  if (!match) return null
  const [, , entryType, flags, path] = match
  if (entryType !== 'f') return null
  return { path: path.trim(), status: flags.startsWith('+++') ? 'added' : 'changed' }
}

// ssh's own failure text is written for a terminal, not for this panel: the host-key warning is a
// wall of "@" characters that ends by telling the user to edit a known_hosts file which is a
// throwaway in /var/folders and will not exist a second later. The two failures that actually
// happen get the same wording the SFTP path uses; everything else is passed through, because an
// unrecognised error is more useful verbatim than summarised.
function translateSshFailure(output: string, connection: SshConnection): string | null {
  if (output.includes('REMOTE HOST IDENTIFICATION HAS CHANGED') || output.includes('Host key verification failed')) {
    const received = /SHA256:[A-Za-z0-9+/=]+/.exec(output)?.[0]
    return (
      `Der Host-Key von ${connection.host} stimmt nicht mit dem gespeicherten überein.\n\n` +
      `erwartet:  ${connection.hostKey?.fingerprint ?? '—'}\n` +
      `empfangen: ${received ?? 'unbekannt'}\n\n` +
      'Die Übertragung wurde abgebrochen. Das kann ein neu aufgesetzter Server sein - oder ein ' +
      'Angriff. Prüfe den Fingerprint beim Anbieter und setze ihn erst danach über ' +
      '"Host-Key vergessen" zurück.'
    )
  }
  if (output.includes('Permission denied (publickey')) {
    return `Der Server hat den Schlüssel abgelehnt (${connection.username}@${connection.host}). Stimmen Benutzername und Schlüsseldatei?`
  }
  return null
}

interface RsyncRun {
  code: number | null
  entries: DeployDiffEntry[]
  output: string
}

// Its own spawn rather than runCommand, for the same reason buildService keeps one: the itemized
// lines have to be read as they arrive so progress can be reported during a long transfer.
function runRsync(args: string[], onEntry?: (entry: DeployDiffEntry) => void): Promise<RsyncRun> {
  return new Promise((resolvePromise) => {
    // No shell: every argument here contains user-controlled data (host, path, key path), and a
    // shell would re-interpret metacharacters in them. rsync is a real binary, so it needs none.
    const child = spawn('rsync', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const entries: DeployDiffEntry[] = []
    let output = ''
    let pending = ''

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      output += text
      pending += text
      const lines = pending.split('\n')
      pending = lines.pop() ?? ''
      for (const line of lines) {
        const entry = parseItemized(line)
        if (!entry) continue
        entries.push(entry)
        onEntry?.(entry)
      }
    })
    child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.on('exit', (code) => {
      const entry = parseItemized(pending)
      if (entry) {
        entries.push(entry)
        onEntry?.(entry)
      }
      resolvePromise({ code, entries, output })
    })
    child.on('error', (err) => resolvePromise({ code: null, entries, output: `${output}\n${String(err)}` }))
  })
}

async function resolveConnection(ctx: DeployContext): Promise<SshConnection> {
  const connection = ctx.target.connectionId ? await connectionsService.getConnection(ctx.target.connectionId) : null
  if (!connection || connection.kind !== 'ssh') throw new Error('Für dieses Ziel ist kein SSH-Zugang hinterlegt.')
  const blocker = rsyncBlockReason(connection, process.platform)
  if (blocker) throw new Error(BLOCKER_MESSAGES[blocker])
  return connection
}

function remoteSpec(connection: SshConnection, remotePath: string): string {
  // openrsync has no --protect-args, so a remote path is expanded once more by the remote shell.
  // Whitespace there would silently split into two arguments; refused rather than guessed at.
  if (/\s/.test(remotePath)) {
    throw new Error('Ein Remote-Pfad mit Leerzeichen lässt sich mit rsync nicht sicher übertragen. Bitte SFTP für dieses Ziel verwenden.')
  }
  const withSlash = remotePath.endsWith('/') ? remotePath : `${remotePath}/`
  return `${connection.username}@${connection.host}:${withSlash}`
}

async function buildArgs(
  ctx: DeployContext,
  connection: SshConnection,
  remotePath: string,
  deleteRemoved: boolean,
  excludePaths: string[],
  env: SshEnv,
  dryRun: boolean
): Promise<string[]> {
  const args = ['-rlt', '--itemize-changes', '--no-motd', '-e', env.rshCommand]
  // Deliberately -rlt rather than -a: -a also carries permissions, owner and group, which on a
  // web host means pushing this machine's uid/gid and umask onto the live site.
  if (deleteRemoved) args.push('--delete')
  if (dryRun) args.push('--dry-run')

  if (excludePaths.length > 0) {
    // A file rather than N --exclude arguments: the list is per-file and can be long, and a
    // leading slash anchors each pattern to the transfer root so "index.html" cannot also match
    // "unter/index.html".
    const excludeFile = join(env.dir, 'excludes')
    await writeFile(excludeFile, excludePaths.map((p) => `/${p.replace(/^\/+/, '')}`).join('\n') + '\n', 'utf-8')
    args.push(`--exclude-from=${excludeFile}`)
  }

  // Trailing slash on the source means "the contents of", not "the directory itself".
  args.push(`${ctx.buildDir}/`, remoteSpec(connection, remotePath))
  return args
}

export const rsyncAdapter: DeployAdapter = {
  async preview(ctx): Promise<DeployDiffEntry[]> {
    const destination = ctx.target.destination
    if (destination.type !== 'sftp') throw new Error('Falscher Zieltyp für den rsync-Adapter.')
    const connection = await resolveConnection(ctx)
    const env = await prepareSshEnv(connection)
    try {
      const args = await buildArgs(ctx, connection, destination.remotePath, destination.deleteRemoved, [], env, true)
      const result = await runRsync(args)
      if (result.code !== 0) {
        throw new Error(translateSshFailure(result.output, connection) ?? result.output.trim() ?? `rsync endete mit Code ${result.code}.`)
      }
      return result.entries.sort((a, b) => a.path.localeCompare(b.path))
    } finally {
      await env.cleanup()
    }
  },

  async run(ctx, excludePaths): Promise<DeployResult> {
    const destination = ctx.target.destination
    if (destination.type !== 'sftp') throw new Error('Falscher Zieltyp für den rsync-Adapter.')
    const connection = await resolveConnection(ctx)
    const env = await prepareSshEnv(connection)

    try {
      // A dry run first, purely to know the total: without it the progress bar has no denominator,
      // and rsync itself reports none until it is finished.
      const planArgs = await buildArgs(ctx, connection, destination.remotePath, destination.deleteRemoved, excludePaths, env, true)
      const plan = await runRsync(planArgs)
      if (plan.code !== 0) {
        return {
          success: false,
          output: translateSshFailure(plan.output, connection) ?? plan.output.trim() ?? `rsync endete mit Code ${plan.code}.`
        }
      }
      const total = plan.entries.length
      if (total === 0) return { success: true, output: 'Nichts zu tun - das Ziel ist bereits auf dem Stand des Builds.\n' }

      let processed = 0
      const args = await buildArgs(ctx, connection, destination.remotePath, destination.deleteRemoved, excludePaths, env, false)
      const result = await runRsync(args, (entry) => {
        processed++
        ctx.emitProgress(processed, total, entry.path)
      })

      const summary = result.entries
        .map((entry) => `${entry.status === 'removed' ? '✗' : '↑'} ${entry.path}`)
        .join('\n')
      return {
        success: result.code === 0,
        output:
          result.code === 0
            ? `${summary}\n`
            : (translateSshFailure(result.output, connection) ?? result.output.trim() ?? `rsync endete mit Code ${result.code}.`)
      }
    } finally {
      await env.cleanup()
    }
  }
}
