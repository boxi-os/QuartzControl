import { spawn } from 'child_process'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { CoreUpdateStatus, PluginActionResult, PluginUpdateStatus, ProjectSnapshot, UpdateResult } from '@shared/ipc-contract'
import { TEMPLATE_REPO } from './createService'

function run(command: string, args: string[], cwd?: string): Promise<{ success: boolean; output: string }> {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let output = ''
    child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.on('exit', (code) => resolvePromise({ success: code === 0, output }))
    child.on('error', (err) => resolvePromise({ success: false, output: String(err) }))
  })
}

// `git ls-remote <url> HEAD` returns "<commit>\tHEAD" for the remote's current default branch,
// without needing to know its name (jackyzha0/quartz's branch naming isn't guaranteed stable) and
// without any GitHub API call/token - works for any public git remote.
async function lsRemoteHead(url: string, ref = 'HEAD'): Promise<string | null> {
  const result = await run('git', ['ls-remote', url, ref])
  if (!result.success) return null
  const line = result.output.split('\n').find((l) => l.trim().length > 0)
  return line ? line.split('\t')[0].trim() : null
}

export async function getCoreUpdateStatus(projectPath: string): Promise<CoreUpdateStatus> {
  const current = await run('git', ['rev-parse', 'HEAD'], projectPath)
  const currentCommit = current.success ? current.output.trim() : ''
  const latestCommit = (await lsRemoteHead(TEMPLATE_REPO)) ?? ''
  return { currentCommit, latestCommit, upToDate: !!currentCommit && !!latestCommit && currentCommit === latestCommit }
}

const SNAPSHOT_PREFIX = 'quartz-gui-backup-'

// A non-destructive snapshot of the project's tracked-file state (including uncommitted changes)
// via `git stash create`, which - unlike `git stash push`/`save` - builds the stash commit object
// without touching the working tree or the actual stash ref list. Tagging that commit keeps it
// reachable permanently (a bare stash entry can be gc'd). On an already-clean tree, stash create
// produces no commit, so HEAD itself is tagged instead. Untracked files are NOT captured (stash
// create has no --include-untracked option) - backupService.ts's content snapshots cover those.
export async function snapshotProject(projectPath: string): Promise<string> {
  const tag = `${SNAPSHOT_PREFIX}${new Date().toISOString().replace(/[:.]/g, '-')}`
  const stash = await run('git', ['stash', 'create'], projectPath)
  const stashCommit = stash.success ? stash.output.trim() : ''
  if (stashCommit) {
    await run('git', ['tag', tag, stashCommit], projectPath)
  } else {
    await run('git', ['tag', tag], projectPath)
  }
  return tag
}

export async function listSnapshots(projectPath: string): Promise<ProjectSnapshot[]> {
  const result = await run(
    'git',
    ['tag', '-l', `${SNAPSHOT_PREFIX}*`, '--sort=-creatordate', '--format=%(refname:short) %(creatordate:iso-strict)'],
    projectPath
  )
  if (!result.success) return []
  return result.output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [tag, ...rest] = line.split(' ')
      return { tag, createdAt: rest.join(' ') }
    })
}

// Destructive by design: this is the "undo the update" safety net, not a general point-in-time
// restore, so it resets the branch/working tree/index completely to the snapshot rather than
// trying to preserve anything done since.
export async function restoreSnapshot(projectPath: string, tag: string): Promise<PluginActionResult> {
  const reset = await run('git', ['reset', '--hard', tag], projectPath)
  if (!reset.success) return { success: false, output: reset.output }
  const install = await run('npm', ['install'], projectPath)
  return { success: install.success, output: `${reset.output}\n${install.output}` }
}

export async function runCoreUpdate(projectPath: string): Promise<UpdateResult> {
  const snapshotTag = await snapshotProject(projectPath)

  const remoteCheck = await run('git', ['remote', 'get-url', 'quartz-upstream'], projectPath)
  if (!remoteCheck.success) {
    const added = await run('git', ['remote', 'add', 'quartz-upstream', TEMPLATE_REPO], projectPath)
    if (!added.success) return { success: false, output: added.output, snapshotTag }
  }

  // Fetches the remote's default branch into FETCH_HEAD without needing to know its name (see
  // lsRemoteHead above for the same reasoning), then merges that directly.
  const fetch = await run('git', ['fetch', 'quartz-upstream', 'HEAD'], projectPath)
  if (!fetch.success) return { success: false, output: fetch.output, snapshotTag }

  const merge = await run('git', ['merge', 'FETCH_HEAD', '-m', 'Merge quartz-upstream (via QuartzControl)'], projectPath)
  if (!merge.success) {
    const conflicts = await run('git', ['diff', '--name-only', '--diff-filter=U'], projectPath)
    const conflictFiles = conflicts.success
      ? conflicts.output
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
      : []
    return { success: false, output: merge.output, snapshotTag, conflicts: conflictFiles }
  }

  const install = await run('npm', ['install'], projectPath)
  if (!install.success) {
    return { success: false, output: `${merge.output}\n\nnpm install fehlgeschlagen:\n${install.output}`, snapshotTag }
  }

  // Same benign first-build hiccup createService.ts already tolerates for some templates -
  // report it, but a failed warm-up build doesn't undo an otherwise-successful merge+install.
  const warmup = await run('npx', ['quartz', 'build'], projectPath)
  const warmupNote = warmup.success ? '' : `\n\nAufwärm-Build:\n${warmup.output}`

  return { success: true, output: `${merge.output}\n${install.output}${warmupNote}`, snapshotTag }
}

export async function abortCoreMerge(projectPath: string): Promise<PluginActionResult> {
  const result = await run('git', ['merge', '--abort'], projectPath)
  return { success: result.success, output: result.output }
}

interface LockfilePluginEntry {
  source?: unknown
  resolved?: string
  commit?: string
  ref?: string
}

interface Lockfile {
  plugins?: Record<string, LockfilePluginEntry>
}

export async function getPluginsUpdateStatus(projectPath: string): Promise<PluginUpdateStatus[]> {
  const lockfilePath = join(projectPath, 'quartz.lock.json')
  let lockfile: Lockfile
  try {
    lockfile = JSON.parse(await readFile(lockfilePath, 'utf-8')) as Lockfile
  } catch {
    return []
  }
  const entries = Object.entries(lockfile.plugins ?? {})

  return Promise.all(
    entries.map(async ([name, entry]) => {
      if (entry.commit === 'local' || !entry.resolved) {
        return { name, isLocal: true, upToDate: true }
      }
      const ref = entry.ref ? `refs/heads/${entry.ref}` : 'HEAD'
      const latestCommit = await lsRemoteHead(entry.resolved, ref)
      return {
        name,
        isLocal: false,
        installedCommit: entry.commit,
        latestCommit,
        upToDate: latestCommit === null ? true : latestCommit === entry.commit
      }
    })
  )
}

// Shells out to the real, already-battle-tested `quartz plugin install --latest` rather than
// reimplementing its fetch/checkout/rebuild/lockfile-update logic - `plugin update` still works
// too but is a deprecated alias for this exact invocation (verified against the CLI's own command
// wiring), so this uses the non-deprecated form directly.
export function updatePlugin(projectPath: string, name?: string): Promise<PluginActionResult> {
  const args = ['quartz', 'plugin', 'install', '--latest']
  if (name) args.push(name)
  return run('npx', args, projectPath)
}
