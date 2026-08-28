import { runCommand as run } from './runCommand'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { CoreUpdateStatus, PluginActionResult, PluginUpdateStatus, UpdateCheckState, UpdateResult } from '@shared/ipc-contract'
import { TEMPLATE_REPO } from './createService'
import { withContentSymlinkParked } from './contentSymlink'
import { createSnapshot } from './snapshotService'

// `git ls-remote <url> <ref>` returns "<commit>\t<full ref>" lines, without needing to know the
// remote's default branch name (jackyzha0/quartz's branch naming isn't guaranteed stable) and
// without any GitHub API call/token - works for any public git remote.
//
// The "--" is load-bearing, not decoration. `url` and `ref` come out of the project's
// quartz.lock.json, i.e. from whatever plugin sources have been installed - and git reads a
// leading-dash argument as an option wherever it appears. Verified against real git: without the
// separator, `git ls-remote --upload-pack=<cmd> <repo> HEAD` *executes* <cmd>; with it, git
// refuses ("fatal: strange pathname ... blocked"). getPluginsUpdateStatus calls this for every
// entry in the lockfile on opening the Updates tab, with no user action in between.
async function lsRemote(url: string, ref: string): Promise<Array<{ commit: string; ref: string }>> {
  const result = await run('git', ['ls-remote', '--', url, ref])
  if (!result.success) return []
  return result.output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('\t'))
    .map((line) => {
      const [commit, refName] = line.split('\t')
      return { commit: commit.trim(), ref: refName.trim() }
    })
}

async function lsRemoteHead(url: string): Promise<string | null> {
  const rows = await lsRemote(url, 'HEAD')
  return rows[0]?.commit ?? null
}

// A lockfile's `ref` is whatever the user pinned to, which is not necessarily a branch. Passing it
// raw lets ls-remote's own tail matching resolve a branch *or* a tag; the previous
// `refs/heads/<ref>` prefix silently returned nothing for a tag, which then read as "up to date".
// A pattern can legitimately match both, so a branch wins over a tag rather than "whichever git
// printed first".
async function lsRemoteRef(url: string, ref: string): Promise<string | null> {
  const rows = await lsRemote(url, ref)
  const branch = rows.find((r) => r.ref === `refs/heads/${ref}`)
  const tag = rows.find((r) => r.ref === `refs/tags/${ref}` || r.ref === `refs/tags/${ref}^{}`)
  return (branch ?? tag ?? rows[0])?.commit ?? null
}

// Whether `commit` is already contained in this project's history - NOT whether it equals HEAD.
// runCoreUpdate merges, so as soon as the project has a commit of its own (i.e. after the first
// Git-Sync) HEAD is a merge commit and can never equal upstream's HEAD again. Verified against
// real git: after a successful merge the two SHAs differ while `--is-ancestor` answers yes, which
// is why the card used to say "Update verfuegbar" forever.
//
// `cat-file -e` comes first because `merge-base` cannot answer about an object we don't have, and
// its non-zero exit for an unknown commit is indistinguishable from a plain "no". Not having the
// object at all is itself a definite answer: we cannot contain it.
async function historyContains(projectPath: string, commit: string): Promise<boolean> {
  const known = await run('git', ['cat-file', '-e', `${commit}^{commit}`], projectPath)
  if (!known.success) return false
  const contains = await run('git', ['merge-base', '--is-ancestor', commit, 'HEAD'], projectPath)
  return contains.success
}

export async function getCoreUpdateStatus(projectPath: string): Promise<CoreUpdateStatus> {
  const current = await run('git', ['rev-parse', 'HEAD'], projectPath)
  const currentCommit = current.success ? current.output.trim() : ''
  const latestCommit = (await lsRemoteHead(TEMPLATE_REPO)) ?? ''
  if (!currentCommit || !latestCommit) return { currentCommit, latestCommit, state: 'unknown' }
  const state: UpdateCheckState = (await historyContains(projectPath, latestCommit)) ? 'upToDate' : 'behind'
  return { currentCommit, latestCommit, state }
}

// git's own wording for the two failures a user can actually act on is either buried in a wall of
// other output or (for the symlink case) points at a state we just repaired behind their back.
function explainGitFailure(output: string): string {
  if (/beyond a symbolic link/.test(output)) {
    return 'Der content-Ordner ist ein Symlink, durch den git nicht schreiben kann. Wechsle unter Konfiguration → Content-Ordner vorübergehend auf einen echten Ordner und versuche es erneut.\n\n'
  }
  if (/local changes to the following files would be overwritten/i.test(output)) {
    return 'Eigene Änderungen an Dateien, die das Update ebenfalls anfasst, stehen im Weg. Committe oder verwirf sie unter Git-Sync und versuche es erneut.\n\n'
  }
  return ''
}

export async function runCoreUpdate(projectPath: string): Promise<UpdateResult> {
  // One snapshot mechanism for the whole app now (snapshotService). The git tag this used to
  // create captured only *tracked* files, which in a project created here is neither the config
  // nor the lockfile nor the content nor the user's own stylesheets.
  const snapshot = await createSnapshot(projectPath, 'coreUpdate', '')
  const snapshotId = snapshot?.id

  const remoteCheck = await run('git', ['remote', 'get-url', 'quartz-upstream'], projectPath)
  if (!remoteCheck.success) {
    const added = await run('git', ['remote', 'add', 'quartz-upstream', TEMPLATE_REPO], projectPath)
    if (!added.success) return { success: false, output: added.output, snapshotId }
  }

  // Fetches the remote's default branch into FETCH_HEAD without needing to know its name (see
  // lsRemote above for the same reasoning), then merges that directly.
  const fetch = await run('git', ['fetch', 'quartz-upstream', 'HEAD'], projectPath)
  if (!fetch.success) return { success: false, output: fetch.output, snapshotId }

  return withContentSymlinkParked(projectPath, async () => {
    const merge = await run('git', ['merge', 'FETCH_HEAD', '-m', 'Merge quartz-upstream (via QuartzControl)'], projectPath)
    if (!merge.success) {
      const conflicts = await run('git', ['diff', '--name-only', '--diff-filter=U'], projectPath)
      const conflictFiles = conflicts.success
        ? conflicts.output
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
        : []
      return { success: false, output: explainGitFailure(merge.output) + merge.output, snapshotId, conflicts: conflictFiles }
    }

    const install = await run('npm', ['install'], projectPath)
    if (!install.success) {
      return { success: false, output: `${merge.output}\n\nnpm install fehlgeschlagen:\n${install.output}`, snapshotId }
    }

    // Same benign first-build hiccup createService.ts already tolerates for some templates -
    // report it, but a failed warm-up build doesn't undo an otherwise-successful merge+install.
    const warmup = await run('npx', ['quartz', 'build'], projectPath)
    const warmupNote = warmup.success ? '' : `\n\nAufwärm-Build:\n${warmup.output}`

    return { success: true, output: `${merge.output}\n${install.output}${warmupNote}`, snapshotId }
  })
}

export function abortCoreMerge(projectPath: string): Promise<PluginActionResult> {
  // Parked for the same reason the merge itself is: an abort has to rewrite the working tree, and
  // content/ is part of what the conflicted merge touched.
  return withContentSymlinkParked(projectPath, async () => {
    const result = await run('git', ['merge', '--abort'], projectPath)
    return { success: result.success, output: explainGitFailure(result.output) + result.output }
  })
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

// Each check spawns a `git ls-remote` that talks to a remote host, and this runs unprompted on
// opening the Updates tab - a lockfile with twenty plugins would otherwise open twenty
// connections at once.
const MAX_PARALLEL_CHECKS = 4

async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (let i = next++; i < items.length; i = next++) results[i] = await fn(items[i])
  })
  await Promise.all(workers)
  return results
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

  return mapWithLimit(entries, MAX_PARALLEL_CHECKS, async ([name, entry]) => {
    if (entry.commit === 'local' || !entry.resolved) {
      return { name, state: 'local' as const }
    }
    const latestCommit = entry.ref ? await lsRemoteRef(entry.resolved, entry.ref) : await lsRemoteHead(entry.resolved)
    // A failed lookup is "konnte nicht pruefen", never "aktuell" - the remote may be unreachable,
    // renamed or gone, and a green badge for any of those is a lie.
    if (latestCommit === null) return { name, installedCommit: entry.commit, latestCommit, state: 'unknown' as const }
    return {
      name,
      installedCommit: entry.commit,
      latestCommit,
      state: latestCommit === entry.commit ? ('upToDate' as const) : ('behind' as const)
    }
  })
}

// Shells out to the real, already-battle-tested `quartz plugin install --latest` rather than
// reimplementing its fetch/checkout/rebuild/lockfile-update logic - `plugin update` still works
// too but is a deprecated alias for this exact invocation (verified against the CLI's own command
// wiring), so this uses the non-deprecated form directly.
//
// The snapshot is not decoration: read from the CLI's own handler, --latest does `git fetch` plus
// `git reset --hard origin/<ref>` inside each plugin directory and rewrites quartz.lock.json, and
// a plugin that builds a broken site after an update is exactly the situation a restore point is
// for. Every other action that changes a project takes one (pluginService.add/remove,
// configService, contentService, the core update above); this one silently did not.
export async function updatePlugin(projectPath: string, name?: string): Promise<PluginActionResult> {
  await createSnapshot(projectPath, 'pluginChange', name ?? '')
  const args = ['quartz', 'plugin', 'install', '--latest']
  if (name) args.push(name)
  return run('npx', args, projectPath)
}
