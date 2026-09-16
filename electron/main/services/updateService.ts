import { runCommand as run } from './runCommand'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { CoreUpdateStatus, PluginActionResult, PluginUpdateStatus, UpdateResult } from '@shared/ipc-contract'
import {
  dependencyRange,
  localPackageChanges,
  reinstallCommands,
  type LocalPackageChanges,
  type PackageAddition
} from '@shared/packageJsonDeps'
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

// Which of the two git actually has under version control. `git checkout -- a b` is all or
// nothing: one pathspec it does not know and it checks out neither, with exit 1 and a message
// about the pathspec - measured on a repo whose package-lock.json had been taken out of the index
// and gitignored, where package.json stayed modified and the plan below ran on a working tree it
// believed it had reset. A project may well do that; the lockfile is generated, and ignoring it is
// a defensible choice.
async function trackedNpmOwnedFiles(projectPath: string): Promise<string[]> {
  const listed = await run('git', ['ls-files', '--', ...NPM_OWNED_FILES], projectPath)
  if (!listed.success) return []
  return listed.output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * Whether one of the two files stands at three different versions at once: HEAD, a staged one, and
 * a third in the working tree. The plan reads the working tree, the stash holds the index as well,
 * so in that one case the stash carries something the plan cannot name - and a `drop` at the end
 * takes it with it. Measured (seventeenth review, finding 2): a staged theme entry with the working
 * tree back on HEAD went out of both without a word.
 *
 * The ordinary staged case (index and working tree the same) is not this: there the stash holds
 * exactly what `localEdits` names. Only three-way disagreement is, and then the rule is the one
 * this whole plan follows - what it cannot replay it does not touch, git decides, and the user
 * reads the message they read before it existed.
 */
async function stagedApartFromWorkingTree(projectPath: string, tracked: string[]): Promise<boolean> {
  const staged = await run('git', ['diff', '--name-only', '--cached', 'HEAD', '--', ...tracked], projectPath)
  const unstaged = await run('git', ['diff', '--name-only', '--', ...tracked], projectPath)
  // Could not look is not "all clear": hands off, exactly as an unreadable package.json does.
  if (!staged.success || !unstaged.success) return true
  const names = (output: string): string[] =>
    output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  const differsFromHead = new Set(names(staged.output))
  return names(unstaged.output).some((file) => differsFromHead.has(file))
}

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
  /**
   * The second comparison, HEAD against the working tree: what the stash below holds, expressed in
   * packages. Two doors act on the plan and both open against HEAD - the files are handed to git
   * and come back as HEAD's copy, and the sentence about what is missing right now describes that
   * copy. `reinstall` against the merge base cannot answer either: after one merge the base is
   * upstream's commit, which never had this project's own packages, so it lists them for ever.
   */
  localEdits: LocalPackageChanges
}

const NO_CHANGES: LocalPackageChanges = { reinstall: [], upstreamWins: [], unreproducible: [] }

// Worked out *before* the merge, because afterwards the working tree no longer holds "ours".
async function planPackageFiles(projectPath: string): Promise<PackagePlan> {
  const handsOff: PackagePlan = { ...NO_CHANGES, reproducible: false, localEdits: NO_CHANGES }
  const mergeBase = await run('git', ['merge-base', 'HEAD', 'FETCH_HEAD'], projectPath)
  if (!mergeBase.success) return handsOff
  const base = await jsonAtRevision(projectPath, mergeBase.output.trim(), 'package.json')
  const theirs = await jsonAtRevision(projectPath, 'FETCH_HEAD', 'package.json')
  const head = await jsonAtRevision(projectPath, 'HEAD', 'package.json')
  if (base === undefined || theirs === undefined || head === undefined) return handsOff
  let ours: unknown
  try {
    ours = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'))
  } catch {
    return handsOff
  }
  const changes = localPackageChanges(base, ours, theirs)
  // HEAD on both sides: "theirs" is what the working tree is about to be reset to, so the only
  // question left is what the reset takes away. A package removed here after it was committed
  // differs from HEAD and not from the base - measured (sixteenth review, scene 3), that removal
  // was silently undone and the package came back.
  const localEdits = localPackageChanges(head, ours, head)
  // An edit this plan cannot replay is not a reason to guess: git merges both files as before and
  // says what it says today. That holds for either comparison.
  return {
    ...changes,
    localEdits,
    reproducible: changes.unreproducible.length === 0 && localEdits.unreproducible.length === 0
  }
}

/**
 * What of the plan the merged package.json does not already say. After one merge the base is
 * upstream's commit, so `plan.reinstall` names this project's own packages for ever - and every
 * update then ran an `npm install` over the network that changed nothing, under a line claiming
 * packages had been put back (sixteenth review, finding 3b).
 */
async function stillMissing(projectPath: string, reinstall: PackageAddition[]): Promise<PackageAddition[]> {
  let merged: unknown
  try {
    merged = JSON.parse(await readFile(join(projectPath, 'package.json'), 'utf-8'))
  } catch {
    // Unreadable is not "nothing to do": write them all back and let npm answer.
    return reinstall
  }
  return reinstall.filter((entry) => dependencyRange(merged, entry.section, entry.name) !== entry.range)
}

// The name of the stash this run writes. An identifier another machine may already have written
// is a format and not a spelling (see CLAUDE.md); this one is new, it is what abortCoreMerge
// matches on, and it is what the user reads in `git stash list`.
//
// The commit being merged is part of that name, and it is load-bearing rather than informative: a
// stash belongs to *one* merge against *one* HEAD, and popping it against any other HEAD is a
// merge against a state that is gone. Measured (seventeenth review, finding 1): a user who
// resolves one half-done merge by hand keeps the stash, nothing later says so, and weeks later the
// abort button pops it onto package.json - conflict markers in both files, `UU` in both, under
// `success: true`. Matching on the merge's own SHA makes that impossible; what does not match
// stays where it is and is named.
const CORE_UPDATE_STASH = 'QuartzControl: core update'

function stashMessage(mergeCommit: string): string {
  return `${CORE_UPDATE_STASH} ${mergeCommit}`
}

async function stashRef(projectPath: string): Promise<string | null> {
  const ref = await run('git', ['rev-parse', '--verify', '--quiet', 'refs/stash'], projectPath)
  const sha = ref.success ? ref.output.trim() : ''
  return sha || null
}

/** The subject of the newest stash entry, as `git stash list` shows it ("On main: <message>"). */
async function topStashSubject(projectPath: string): Promise<string> {
  const subject = await run('git', ['log', '-1', '--format=%s', 'refs/stash'], projectPath)
  return subject.success ? subject.output.trim() : ''
}

/**
 * Whether any stash entry at all was written by this app. Only the newest can ever be popped, but
 * one further down is just as much a leftover the user should hear about - and hears about
 * nowhere else, because nothing in this app lists stashes.
 */
async function hasCoreUpdateStash(projectPath: string): Promise<boolean> {
  const list = await run('git', ['stash', 'list', '--format=%s'], projectPath)
  if (!list.success) return false
  return list.output.split('\n').some((line) => line.includes(CORE_UPDATE_STASH))
}

type HeldFiles =
  /** git is holding the working tree's version of the two files, as this stash. */
  | { kind: 'held'; sha: string }
  /** Nothing to hold: the two files were already what HEAD has. */
  | { kind: 'clean' }
  /** git would not hold them, so they are still in the working tree and the plan is off. */
  | { kind: 'failed'; output: string }

/**
 * Hands the two npm-owned files to git for the length of the merge, instead of throwing the
 * working tree's version away with `git checkout HEAD --`.
 *
 * Why it matters which of the two: the merge does not only fail over these files. Any conflict in
 * quartz.config.ts, in a plugin, any uncommitted change to something upstream touches ends in a
 * half-done merge - and then the discarded packages were gone for good: not in the working tree,
 * not after "Merge abbrechen", and not put back by a second update, because the plan compares
 * against the merge base and the working tree no longer differs from it. Measured (sixteenth
 * review, scene 4): the theme was in package.json before and in nothing afterwards but the
 * snapshot. A stash survives the half-done merge, `git stash list` shows it to anyone tidying up
 * by hand, and abortCoreMerge pops it.
 */
async function holdNpmOwnedFiles(projectPath: string, tracked: string[], mergeCommit: string): Promise<HeldFiles> {
  const before = await stashRef(projectPath)
  const pushed = await run('git', ['stash', 'push', '-m', stashMessage(mergeCommit), '--', ...tracked], projectPath)
  const after = await stashRef(projectPath)
  // What git *did*, not what it said about it. Measured against git 2.54 (seventeenth review,
  // finding 2): with the index ahead of HEAD and the working tree back on HEAD, `git stash push --
  // <paths>` writes the stash, takes both files out of index and working tree, and then exits 1
  // with "No valid patches in input". Reading that exit as "nothing held" left the stash standing
  // for ever - no `drop` ever touched it, because `held.kind` was `failed` - and the staged entry
  // was gone without a word. A new ref is a held stash whatever the exit code says.
  if (after !== null && after !== before) return { kind: 'held', sha: after }
  // No stash, so the two files are still where they were, and now the exit code is the whole
  // answer: "No local changes to save" is a success that writes none, anything else is a refusal
  // and hands the merge back to git.
  if (!pushed.success) return { kind: 'failed', output: pushed.output }
  return { kind: 'clean' }
}

/** Puts the held files back. Only ever touches the stash this run wrote, and only while it is the newest. */
async function releaseNpmOwnedFiles(projectPath: string, held: HeldFiles): Promise<boolean> {
  if (held.kind !== 'held') return true
  if ((await stashRef(projectPath)) !== held.sha) return false
  return (await run('git', ['stash', 'pop'], projectPath)).success
}

/** npm has written both files anew, so what the stash holds is history. Same ownership check. */
async function dropNpmOwnedFiles(projectPath: string, held: HeldFiles): Promise<void> {
  if (held.kind !== 'held') return
  if ((await stashRef(projectPath)) !== held.sha) return
  await run('git', ['stash', 'drop'], projectPath)
}

/**
 * The other half of holdNpmOwnedFiles, for the abort button: `git merge --abort` resets the
 * working tree to HEAD, so the files the stash holds are only back once this has run. Anything
 * that is not this app's stash for *this* merge is the user's or an earlier run's and stays where
 * it is - named, because nothing else in this app lists stashes.
 */
async function popCoreUpdateStash(
  projectPath: string,
  mergeCommit: string
): Promise<{ success: boolean; output: string }> {
  const subject = await topStashSubject(projectPath)
  // An empty `mergeCommit` (no MERGE_HEAD to read) must not match anything: the message is a
  // prefix plus a SHA, so an empty SHA is a substring of every entry this app has ever written.
  if (!mergeCommit || !subject.includes(stashMessage(mergeCommit))) {
    const leftover = (await hasCoreUpdateStash(projectPath)) ? `\n\n${mainT('updateStashLeftover')}` : ''
    return { success: true, output: leftover }
  }
  const popped = await run('git', ['stash', 'pop'], projectPath)
  // A pop that hits a conflict leaves the stash standing, which is the right end - but it is not
  // an abort that put the project back, and saying "erfolgreich" over git's conflict output is how
  // the user learns about it at the next build instead of now.
  if (!popped.success) return { success: false, output: `\n\n${mainT('updateStashPopFailed')}\n${popped.output}` }
  return { success: true, output: `\n${popped.output}` }
}

async function conflictedFiles(projectPath: string): Promise<string[]> {
  const conflicts = await run('git', ['diff', '--name-only', '--diff-filter=U'], projectPath)
  if (!conflicts.success) return []
  return conflicts.output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * A stash of this app's that is still there before this run has written one is a leftover: the run
 * that wrote it never got to put it back, because the user resolved that merge by hand or the app
 * ended in between. Measured (seventeenth review): two further updates ran afterwards and said
 * nothing at all about it, and nothing else in this app lists stashes. Said, not acted on - it is
 * the user's working tree, and `git stash pop` is their call.
 */
export async function runCoreUpdate(projectPath: string): Promise<UpdateResult> {
  const leftover = (await hasCoreUpdateStash(projectPath)) ? `\n\n${mainT('updateStashLeftover')}` : ''
  const result = await runCoreUpdateFrom(projectPath)
  return leftover ? { ...result, output: result.output + leftover } : result
}

async function runCoreUpdateFrom(projectPath: string): Promise<UpdateResult> {
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
  // The commit about to be merged, resolved once: it names the stash below, and the abort button
  // reads the same SHA back out of MERGE_HEAD to decide whether that stash is its own.
  const fetched = await run('git', ['rev-parse', 'FETCH_HEAD'], projectPath)
  const mergeCommit = fetched.success ? fetched.output.trim() : ''

  return withContentSymlinkParked(projectPath, async () => {
    const plan = await planPackageFiles(projectPath)
    const tracked = await trackedNpmOwnedFiles(projectPath)
    // Whether the plan is actually in charge of these two files, as opposed to `reproducible`,
    // which only says the plan could be worked out. The step below has to succeed as well: if it
    // does not, the files are still in the working tree and git answers the way it did before this
    // plan existed - which is a usable answer, but only if nothing afterwards assumes otherwise.
    // A stash this run cannot name after the commit it belongs to is one the abort button cannot
    // recognise later, so without that SHA the plan hands the two files back to git instead. Same
    // for a file that stands at three versions at once: the stash would hold more than the plan
    // can put back.
    let planApplies =
      plan.reproducible &&
      tracked.length > 0 &&
      mergeCommit !== '' &&
      !(await stagedApartFromWorkingTree(projectPath, tracked))
    let held: HeldFiles = { kind: 'clean' }
    if (planApplies) {
      // Takes both files back to HEAD so git has nothing to overwrite - but hands them to git
      // rather than dropping them, because from here to the end of the merge there are several
      // ways out and only one of them writes them again.
      held = await holdNpmOwnedFiles(projectPath, tracked, mergeCommit)
      if (held.kind === 'failed') planApplies = false
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
      if (planApplies && onlyNpmOwned) {
        // The case that used to leave the project stuck: both sides wrote the same two generated
        // files. Upstream's copy wins and npm writes the local packages back in below.
        // The conflicted paths, not the pair: a conflicted file is by definition one git knows,
        // and only those have a "theirs" side to check out. A path HEAD does not track is a
        // modify/delete the other way round - the project took its lockfile out of the index and
        // gitignored it, upstream changed it. Taking upstream's copy would put it back under
        // version control against that decision; resolving as "still deleted" leaves the file on
        // disk for npm to rewrite and the index the way the project wanted it.
        const takeTheirs = conflictFiles.filter((file) => tracked.includes(file))
        const keepDeleted = conflictFiles.filter((file) => !tracked.includes(file))
        const resolved =
          takeTheirs.length === 0 || (await run('git', ['checkout', '--theirs', '--', ...takeTheirs], projectPath)).success
        const dropped =
          keepDeleted.length === 0 || (await run('git', ['rm', '--cached', '--force', '--', ...keepDeleted], projectPath)).success
        const staged =
          resolved && dropped && (takeTheirs.length === 0 || (await run('git', ['add', '--', ...takeTheirs], projectPath)).success)
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
        // The merge never started: the project goes back to exactly how it was found, stash and
        // all. Or it is half-done and stays that way for the abort button on the page - and then
        // the stash stays with it, because a `merge --abort` would reset the working tree again.
        const restored = inProgress ? false : await releaseNpmOwnedFiles(projectPath, held)
        const pending =
          !restored && held.kind === 'held' && plan.localEdits.reinstall.length > 0
            ? `\n\n${mainT('updatePackagesPending', {
                packages: plan.localEdits.reinstall.map((entry) => entry.name).join(', ')
              })}`
            : ''
        return {
          success: false,
          output: explainGitFailure(merge.output) + merge.output + pending,
          snapshotId,
          conflicts: conflictFiles
        }
      }
    }

    // One `npm install` per dependency section for the packages the merged package.json is
    // actually missing, and a plain one otherwise. Either way npm writes the lockfile that
    // upstream's copy just replaced.
    const missingNow = planApplies ? await stillMissing(projectPath, plan.reinstall) : []
    const installCalls = missingNow.length > 0 ? reinstallCommands(missingNow) : [{ args: ['install'] }]
    let installOutput = ''
    for (const call of installCalls) {
      const install = await run('npm', call.args, projectPath)
      installOutput += install.output
      if (!install.success) {
        // The merge is committed and npm has already rewritten both files at least once, so
        // popping the stash here would fight with what is on disk. The restore point is the way
        // back, and the sentence below names what to ask for.
        await dropNpmOwnedFiles(projectPath, held)
        // The merge is done and package.json is upstream's, so a failure here is the one moment the
        // project's own packages are named nowhere: npm's error is about a version range, not about
        // what was taken out. Without this line the way back (the restore point, or installing them
        // again) needs a list the user no longer has.
        const missing =
          missingNow.length > 0
            ? `\n\n${mainT('updatePackagesMissing', { packages: missingNow.map((entry) => entry.name).join(', ') })}`
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
    if (ourMergeCommit && tracked.length > 0) {
      await run('git', ['add', '--', ...tracked], projectPath)
      await run('git', ['commit', '--amend', '--no-edit'], projectPath)
    }

    const packageNotes = [
      missingNow.length > 0
        ? mainT('updatePackagesReinstalled', { packages: missingNow.map((entry) => entry.name).join(', ') })
        : '',
      planApplies && plan.upstreamWins.length > 0
        ? mainT('updatePackagesUpstreamWins', { packages: plan.upstreamWins.join(', ') })
        : ''
    ]
      .filter(Boolean)
      .join('\n')

    // npm has written both files, so what git was holding is history.
    await dropNpmOwnedFiles(projectPath, held)

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
    // Which merge this is, read *before* the abort throws MERGE_HEAD away: it is the only thing
    // that says whether the stash lying there belongs to this merge or to an earlier one.
    const mergeHead = await run('git', ['rev-parse', 'MERGE_HEAD'], projectPath)
    const mergeCommit = mergeHead.success ? mergeHead.output.trim() : ''
    const result = await run('git', ['merge', '--abort'], projectPath)
    if (!result.success) return { success: false, output: explainGitFailure(result.output) + result.output }
    const popped = await popCoreUpdateStash(projectPath, mergeCommit)
    return { success: popped.success, output: result.output + popped.output }
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
