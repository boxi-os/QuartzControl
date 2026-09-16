import { runCommand as run } from './runCommand'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { CoreUpdateStatus, PluginActionResult, PluginUpdateStatus, UpdateResult } from '@shared/ipc-contract'
import { localPackageChanges, reinstallCommands, type LocalPackageChanges } from '@shared/packageJsonDeps'
import { TEMPLATE_REPO } from './createService'
import { withContentSymlinkParked } from './contentSymlink'
import { createSnapshot } from './snapshotService'
import { mainT } from '../i18n'

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
// git has no timeout of its own, and a stalled connection - a captive portal, a route that went
// away mid-flight - leaves ls-remote waiting on the kernel's TCP retries. That is fine on a
// command line and not fine here, where four of these run unprompted on opening the Updates tab
// and the page has no cancel. 20s is well past a normal handshake against a slow host, and a
// timeout answers `unknown` ("konnte nicht prüfen"), never "aktuell".
const LS_REMOTE_TIMEOUT_MS = 20_000

async function lsRemote(url: string, ref: string): Promise<Array<{ commit: string; ref: string }>> {
  const result = await run('git', ['ls-remote', '--', url, ref], undefined, undefined, LS_REMOTE_TIMEOUT_MS)
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

// Fetching the missing upstream commits is bounded like ls-remote, but longer: it transfers
// objects, and a project far behind has more of them. The same objects are what runCoreUpdate
// fetches next, so nothing downloaded here is wasted.
const FETCH_TIMEOUT_MS = 60_000

// "Installiert" is the newest *upstream* commit this project contains, not HEAD. HEAD is the
// project's own last commit as soon as it has one - measured on Example before its last update:
// the card said "Installiert: 09a888c", a commit GitHub does not know, next to upstream's f1fba3f,
// while the answer is 075afd3, f1fba3f's parent, with exactly one commit missing. That is the
// merge base of HEAD and upstream's HEAD, which needs upstream's commit as a local object.
//
// Up to date means the merge base *is* upstream's HEAD, so no git call is needed. Behind with the
// object missing needs a fetch, and that is why it only happens when the caller asks: the
// Übersicht reads this status too, and it must cost nothing to open (docs/decisions/
// navigation-and-pages.md). Without the fetch an unknown answer stays unknown - an empty string,
// never HEAD standing in for it.
async function installedUpstream(
  projectPath: string,
  latestCommit: string,
  allowFetch: boolean
): Promise<{ commit: string; missing?: number }> {
  let known = (await run('git', ['cat-file', '-e', `${latestCommit}^{commit}`], projectPath)).success
  if (!known && allowFetch) {
    // Into FETCH_HEAD, not a remote-tracking ref - the same way runCoreUpdate fetches, so this
    // leaves no ref behind that a push or `quartz sync` could carry along.
    await run('git', ['fetch', '--no-tags', '--quiet', TEMPLATE_REPO, 'HEAD'], projectPath, undefined, FETCH_TIMEOUT_MS)
    known = (await run('git', ['cat-file', '-e', `${latestCommit}^{commit}`], projectPath)).success
  }
  if (!known) return { commit: '' }
  const base = await run('git', ['merge-base', 'HEAD', latestCommit], projectPath)
  if (!base.success) return { commit: '' }
  const count = await run('git', ['rev-list', '--count', `HEAD..${latestCommit}`], projectPath)
  const missing = count.success ? Number.parseInt(count.output.trim(), 10) : Number.NaN
  return { commit: base.output.trim(), missing: Number.isFinite(missing) ? missing : undefined }
}

export async function getCoreUpdateStatus(
  projectPath: string,
  options: { resolveInstalled?: boolean } = {}
): Promise<CoreUpdateStatus> {
  const head = await run('git', ['rev-parse', 'HEAD'], projectPath)
  const latestCommit = (await lsRemoteHead(TEMPLATE_REPO)) ?? ''
  if (!head.success || !latestCommit) return { currentCommit: '', latestCommit, state: 'unknown' }
  if (await historyContains(projectPath, latestCommit)) {
    return { currentCommit: latestCommit, latestCommit, state: 'upToDate', missingCommits: 0 }
  }
  const installed = await installedUpstream(projectPath, latestCommit, options.resolveInstalled === true)
  return { currentCommit: installed.commit, latestCommit, state: 'behind', missingCommits: installed.missing }
}

// git's own wording for the three failures a user can actually act on is either buried in a wall of
// other output or (for the symlink case) points at a state we just repaired behind their back.
function explainGitFailure(output: string): string {
  if (/beyond a symbolic link/.test(output)) {
    return mainT('updateBlockedBySymlink')
  }
  if (/local changes to the following files would be overwritten/i.test(output)) {
    return mainT('updateBlockedByLocalChanges')
  }
  // The state a conflicted merge leaves behind, which every later attempt runs into. git says
  // "Merging is not possible because you have unmerged files" and leaves the user to know that
  // the way out is the abort button two elements up this very page.
  if (/unmerged files|MERGE_HEAD exists|not possible because you have/i.test(output)) {
    return mainT('updateMergeUnfinished')
  }
  return ''
}

// package.json and package-lock.json are not merged - they are taken from upstream and then
// rewritten by npm. See shared/packageJsonDeps.ts for what that buys and what it costs.
const NPM_OWNED_FILES = ['package.json', 'package-lock.json']

async function mergeInProgress(projectPath: string): Promise<boolean> {
  return (await run('git', ['rev-parse', '-q', '--verify', 'MERGE_HEAD'], projectPath)).success
}

async function jsonAtRevision(projectPath: string, revision: string, file: string): Promise<unknown> {
  const shown = await run('git', ['show', `${revision}:${file}`], projectPath)
  if (!shown.success) return undefined
  try {
    return JSON.parse(shown.output)
  } catch {
    return undefined
  }
}

interface PackagePlan extends LocalPackageChanges {
  /** False means: we could not read all three sides, so git decides and the user gets git's answer. */
  reproducible: boolean
}

// Worked out *before* the merge, because afterwards the working tree no longer holds "ours".
async function planPackageFiles(projectPath: string): Promise<PackagePlan> {
  const handsOff: PackagePlan = { reinstall: [], upstreamWins: [], unreproducible: [], reproducible: false }
  const mergeBase = await run('git', ['merge-base', 'HEAD', 'FETCH_HEAD'], projectPath)
  if (!mergeBase.success) return handsOff
  const base = await jsonAtRevision(projectPath, mergeBase.output.trim(), 'package.json')
  const theirs = await jsonAtRevision(projectPath, 'FETCH_HEAD', 'package.json')
  if (base === undefined || theirs === undefined) return handsOff
  let ours: unknown
  try {
    ours = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'))
  } catch {
    return handsOff
  }
  const changes = localPackageChanges(base, ours, theirs)
  // An edit this plan cannot replay is not a reason to guess: git merges both files as before and
  // says what it says today.
  return { ...changes, reproducible: changes.unreproducible.length === 0 }
}

async function readNpmOwnedFiles(projectPath: string): Promise<Array<{ file: string; content: string }>> {
  const saved: Array<{ file: string; content: string }> = []
  for (const file of NPM_OWNED_FILES) {
    try {
      saved.push({ file, content: await readFile(join(projectPath, file), 'utf-8') })
    } catch {
      // A project without a lockfile is normal before the first install.
    }
  }
  return saved
}

async function restoreNpmOwnedFiles(projectPath: string, saved: Array<{ file: string; content: string }>): Promise<void> {
  for (const entry of saved) {
    try {
      await writeFile(join(projectPath, entry.file), entry.content)
    } catch {
      // The snapshot taken at the start of the update is the second way back.
    }
  }
}

async function conflictedFiles(projectPath: string): Promise<string[]> {
  const conflicts = await run('git', ['diff', '--name-only', '--diff-filter=U'], projectPath)
  if (!conflicts.success) return []
  return conflicts.output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export async function runCoreUpdate(projectPath: string): Promise<UpdateResult> {
  // A merge left over from an earlier attempt blocks every git command that would write the
  // working tree, and git's own answer to that names neither the earlier update nor the way out.
  // Asked before the snapshot: nothing has happened yet, so there is nothing to restore to.
  if (await mergeInProgress(projectPath)) {
    return { success: false, output: mainT('updateMergeUnfinished'), conflicts: await conflictedFiles(projectPath) }
  }

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
    const plan = await planPackageFiles(projectPath)
    // Kept in memory so a merge that never starts - a symlink, a local change in some *other*
    // file - leaves the project exactly as it was found.
    const saved = plan.reproducible ? await readNpmOwnedFiles(projectPath) : []
    if (plan.reproducible) {
      // Takes both files back to HEAD so git has nothing to overwrite. Nothing is lost that npm
      // cannot write again: what the plan holds is a list of packages and the ranges asked for.
      await run('git', ['checkout', 'HEAD', '--', ...NPM_OWNED_FILES], projectPath)
    }

    const merge = await run('git', ['merge', 'FETCH_HEAD', '-m', 'Merge quartz-upstream (via QuartzControl)'], projectPath)
    let mergeOutput = merge.output
    // Set only where *we* wrote the merge commit, which is the one commit this run may amend. A
    // fast-forward leaves upstream's own commit at HEAD, and amending that would rewrite history
    // this project did not make.
    let ourMergeCommit = false
    if (!merge.success) {
      const conflictFiles = await conflictedFiles(projectPath)
      const onlyNpmOwned = conflictFiles.length > 0 && conflictFiles.every((file) => NPM_OWNED_FILES.includes(file))
      if (plan.reproducible && onlyNpmOwned) {
        // The case that used to leave the project stuck: both sides wrote the same two generated
        // files. Upstream's copy wins and npm writes the local packages back in below.
        const resolved = await run('git', ['checkout', '--theirs', '--', ...NPM_OWNED_FILES], projectPath)
        const staged = resolved.success && (await run('git', ['add', '--', ...NPM_OWNED_FILES], projectPath)).success
        const committed = staged && (await run('git', ['commit', '--no-edit'], projectPath))
        if (!committed || !committed.success) {
          return {
            success: false,
            output: explainGitFailure(merge.output) + merge.output,
            snapshotId,
            conflicts: conflictFiles
          }
        }
        mergeOutput = `${merge.output}\n${committed.output}`
        ourMergeCommit = true
      } else {
        // Two ways to leave this: the merge never started, and then the project goes back to how
        // it was found; or it is half-done and stays that way for the abort button on the page -
        // in which case the packages are named, because they are no longer in package.json.
        const inProgress = await mergeInProgress(projectPath)
        if (!inProgress) await restoreNpmOwnedFiles(projectPath, saved)
        const pending =
          inProgress && plan.reinstall.length > 0
            ? `\n\n${mainT('updatePackagesPending', { packages: plan.reinstall.map((entry) => entry.name).join(', ') })}`
            : ''
        return {
          success: false,
          output: explainGitFailure(merge.output) + merge.output + pending,
          snapshotId,
          conflicts: conflictFiles
        }
      }
    }

    // One `npm install` per dependency section when this project has packages of its own, and a
    // plain one otherwise. Either way npm writes the lockfile that upstream's copy just replaced.
    const installCalls = plan.reinstall.length > 0 ? reinstallCommands(plan.reinstall) : [{ args: ['install'] }]
    let installOutput = ''
    for (const call of installCalls) {
      const install = await run('npm', call.args, projectPath)
      installOutput += install.output
      if (!install.success) {
        // The merge is done and package.json is upstream's, so a failure here is the one moment the
        // project's own packages are named nowhere: npm's error is about a version range, not about
        // what was taken out. Without this line the way back (the restore point, or installing them
        // again) needs a list the user no longer has.
        const missing =
          plan.reinstall.length > 0
            ? `\n\n${mainT('updatePackagesMissing', { packages: plan.reinstall.map((entry) => entry.name).join(', ') })}`
            : ''
        return {
          success: false,
          output: `${mergeOutput}\n\n${mainT('npmInstallFailed')}\n${installOutput}${missing}`,
          snapshotId
        }
      }
    }

    // Both files were committed before this run (that is why they conflicted), so they belong in
    // the commit that resolved them rather than standing in Git-Sync as a change nobody made. Only
    // these two paths are staged, so anything else the user is working on stays untouched.
    if (ourMergeCommit) {
      await run('git', ['add', '--', ...NPM_OWNED_FILES], projectPath)
      await run('git', ['commit', '--amend', '--no-edit'], projectPath)
    }

    const packageNotes = [
      plan.reinstall.length > 0
        ? mainT('updatePackagesReinstalled', { packages: plan.reinstall.map((entry) => entry.name).join(', ') })
        : '',
      plan.upstreamWins.length > 0 ? mainT('updatePackagesUpstreamWins', { packages: plan.upstreamWins.join(', ') }) : ''
    ]
      .filter(Boolean)
      .join('\n')

    // Same benign first-build hiccup createService.ts already tolerates for some templates -
    // report it, but a failed warm-up build doesn't undo an otherwise-successful merge+install.
    const warmup = await run('npx', ['quartz', 'build'], projectPath)
    const warmupNote = warmup.success ? '' : `\n\n${mainT('warmupBuild')}\n${warmup.output}`

    return {
      success: true,
      output: `${mergeOutput}\n${installOutput}${packageNotes ? `\n${packageNotes}` : ''}${warmupNote}`,
      snapshotId
    }
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
