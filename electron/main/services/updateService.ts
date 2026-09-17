import { runCommand as run } from './runCommand'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { CoreUpdateStatus, PluginActionResult, PluginUpdateStatus, UpdateResult } from '@shared/ipc-contract'
import {
  dependencyRange,
  DEPENDENCY_SECTIONS,
  localPackageChanges,
  reinstallCommands,
  type LocalPackageChanges,
  type PackageAddition
} from '@shared/packageJsonDeps'
import { TEMPLATE_REPO } from './createService'
import { withContentSymlinkParked } from './contentSymlink'
import { createSnapshot } from './snapshotService'
import { quartzGuiDir, quartzGuiPath } from './projectDirs'
import { readJsonFileOr, writeJsonFile } from './jsonStore'
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

/**
 * What an earlier run has left the project owing, in the names the user reads - empty when nothing
 * is outstanding.
 *
 * The same three questions the run itself asks, in the same order and out of the same functions,
 * so that the page and the run cannot disagree: is there a note at all, is its list still this
 * app's to answer (see packageJsonCommittedSince), and is any of it actually missing from
 * package.json right now (`stillMissing` - a user who wrote the lines back by hand owes nothing,
 * whether or not they committed).
 *
 * Deliberately not every note: between npm getting through and the warm-up build the note is still
 * there with an empty list, and nothing is missing then - the state it describes is "this run is
 * not finished", which costs the next one a build it would have skipped and nothing else.
 */
async function outstandingCoreInstall(projectPath: string): Promise<string[]> {
  const pending = await readPendingInstall(projectPath)
  if (pending.head === '' || pending.reinstall.length === 0) return []
  if (await packageJsonCommittedSince(projectPath, pending.head)) return []
  return (await stillMissing(projectPath, pending.reinstall)).map((entry) => entry.name)
}

export async function getCoreUpdateStatus(
  projectPath: string,
  options: { resolveInstalled?: boolean } = {}
): Promise<CoreUpdateStatus> {
  // Asked first, and it wins over all three of the others, because it is true whatever they say
  // and it is the only one of the four with something for the user to do. It also needs no
  // network: a project can sit in this state with the answer to "is there anything newer"
  // unknown, and "nicht prüfbar" would then be the badge over a project that is demonstrably
  // half updated.
  const outstanding = await outstandingCoreInstall(projectPath)
  const head = await run('git', ['rev-parse', 'HEAD'], projectPath)
  const latestCommit = (await lsRemoteHead(TEMPLATE_REPO)) ?? ''
  const pending = (status: CoreUpdateStatus): CoreUpdateStatus =>
    outstanding.length > 0 ? { ...status, state: 'pending', pendingPackages: outstanding } : status
  if (!head.success || !latestCommit) return pending({ currentCommit: '', latestCommit, state: 'unknown' })
  if (await historyContains(projectPath, latestCommit)) {
    return pending({ currentCommit: latestCommit, latestCommit, state: 'upToDate', missingCommits: 0 })
  }
  const installed = await installedUpstream(projectPath, latestCommit, options.resolveInstalled === true)
  return pending({ currentCommit: installed.commit, latestCommit, state: 'behind', missingCommits: installed.missing })
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
  // `git merge --abort` refusing because a file was touched since the merge stopped. git names the
  // file - "Entry 'package.json' not uptodate. Cannot merge." - and that is exactly the file the
  // half-done merge's own message asks the user to look at, so this is the ordinary way to get
  // here, not an exotic one. What git does not say is that the way out is to give that one change
  // up; without that the abort button stays a button that does nothing.
  if (/not uptodate\. Cannot merge|Could not reset index file/i.test(output)) {
    return mainT('updateAbortBlockedByEdit')
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

// The name of the stash this run writes: the prefix says "this is the app's", and it is what the
// user reads in `git stash list`. Unlike `.quartz-gui/` or the `.qtpl` markers it is *not* an
// identifier on someone else's disk yet - it arrived with 2f4394d (2026-09-16), after beta.2, and
// `git grep CORE_UPDATE_STASH v1.0.0-beta.1 v1.0.0-beta.2` finds nothing. So until the next
// release the format is free to change without a migration; a stash written by an older build can
// only be one from a development build on this machine.
//
// The commit being merged is part of that name so that anyone reading `git stash list` can see
// which merge an entry belongs to. It is not what decides whether the abort button may pop it:
// what a pop merges against is the *HEAD* the stash was made on, and the same merge can be
// attempted twice against two different HEADs. Measured (eighteenth review, finding 2): after a
// `git merge --abort` in the terminal and a commit to package.json, the second attempt found the
// same MERGE_HEAD, popped the old stash, and left `UU package.json` with conflict markers. git
// answers the question itself - see stashBase.
const CORE_UPDATE_STASH = 'QuartzControl: core update'

/** The subject of the merge commit this app writes - and, one run later, how a run recognises it
 *  again at HEAD (see the amend in runCoreUpdateFrom). */
const MERGE_MESSAGE = 'Merge quartz-upstream (via QuartzControl)'

async function headSubject(projectPath: string): Promise<string> {
  const subject = await run('git', ['log', '-1', '--format=%s'], projectPath)
  return subject.success ? subject.output.trim() : ''
}

/**
 * Whether HEAD stands in a remote-tracking ref - which is what this can ask without the network,
 * not the same thing as "has left this machine". A commit that does is not one to amend, however
 * tidy the result would be, and a git call that fails answers the same way: not knowing is not
 * permission.
 *
 * It holds for the ways this app pushes. `quartz sync` runs `git push -uf origin <branch>` (read
 * in Quartz' cli/handlers.js), which writes `refs/remotes/origin/<branch>`, and the branch deploy
 * pushes a built tree to a *different* branch and never carries this commit. Measured (twentieth
 * review, finding 4), same scene twice: after `git push -uf origin local` there is a tracking ref
 * and no amend; after `git push <path-to-repo> local` - a push naming a URL - there is none, the
 * amend runs, and the commit the other side holds is no longer an ancestor of HEAD. Blind in the
 * same way to `--mirror=push` remotes with no fetch refspec and to a tracking ref removed by hand
 * since the push. There is no local trace of a push by URL to read instead; `git ls-remote` would
 * answer, at the price of a connection in a run that otherwise only talks to upstream. What
 * follows from the blind spot is one force-push later - `quartz sync` pushes with `-f` anyway.
 */
async function headIsPushed(projectPath: string): Promise<boolean> {
  const contains = await run('git', ['branch', '-r', '--contains', 'HEAD'], projectPath)
  return !contains.success || contains.output.trim() !== ''
}

function stashMessage(mergeCommit: string): string {
  return `${CORE_UPDATE_STASH} ${mergeCommit}`
}

async function stashRef(projectPath: string): Promise<string | null> {
  const ref = await run('git', ['rev-parse', '--verify', '--quiet', 'refs/stash'], projectPath)
  const sha = ref.success ? ref.output.trim() : ''
  return sha || null
}

/**
 * The commit the newest stash entry was made on: a stash commit's first parent is the HEAD it was
 * taken from, and that is the state `git stash pop` merges its diff against. Anything else is a
 * merge against a state that is gone.
 */
async function stashBase(projectPath: string, entry = 'refs/stash'): Promise<string> {
  const base = await run('git', ['rev-parse', `${entry}^`], projectPath)
  return base.success ? base.output.trim() : ''
}

/** The subject of the newest stash entry, as `git stash list` shows it ("On main: <message>"). */
async function topStashSubject(projectPath: string): Promise<string> {
  const subject = await run('git', ['log', '-1', '--format=%s', 'refs/stash'], projectPath)
  return subject.success ? subject.output.trim() : ''
}

/**
 * Where a stash entry of this app's stands in `git stash list`, as the `stash@{n}` a command needs
 * in order to mean *that* entry. Only the newest entry of all can ever be popped, but one further
 * down is just as much a leftover the user should hear about - and hears about nowhere else,
 * because nothing in this app lists stashes.
 *
 * The name is in the sentence because `git stash show -p` and `git stash drop` without an argument
 * mean the newest entry of all, which is the user's own as soon as they have stashed anything
 * since. Measured (twenty-first review, finding 4): with the user's entry on top, following the
 * advice verbatim showed their work, dropped their work, and left ours lying where it was.
 *
 * `from` skips the entry this run wrote itself, which is always the newest one.
 */
async function coreUpdateStashEntry(projectPath: string, from = 0): Promise<string | null> {
  const list = await run('git', ['stash', 'list', '--format=%s'], projectPath)
  if (!list.success) return null
  const lines = list.output.split('\n')
  for (let index = from; index < lines.length; index++) {
    if (lines[index].includes(CORE_UPDATE_STASH)) return `stash@{${index}}`
  }
  return null
}

/**
 * A note the run leaves behind between "the merge is committed" and "npm and the warm-up build
 * have had their turn" - the one window in which this project's package.json is upstream's while
 * its node_modules is still the one from before.
 *
 * It exists for the shortcut below, which decides on HEAD alone. HEAD is also unmoved when *this*
 * run has nothing to fetch because an *earlier* one already committed the merge and then failed at
 * `npm install` - and that is the state the app sends the user back here from, with "fix the error
 * above and run the update again". Measured (eighteenth review, finding 1): that second run said
 * "Already up to date.", `success: true`, and called neither npm nor the warm-up build. The same
 * window is open when the warm-up build fails, and when the app ends in between.
 *
 * Written as "something is outstanding" rather than "this run finished", so that a project that is
 * simply up to date keeps the shortcut it was given: reading it the other way round would make the
 * first update of every existing project a full install again, which is exactly what the shortcut
 * was for. The price of that direction is one the *reading* half pays: a file that is not there
 * reads as "nothing outstanding", the behaviour of before this note existed. An unwritable one is
 * not that price - writeFileAtomic throws, and unhandled that ended the run between the merge
 * commit and `npm install`, in the very state the note was invented to describe (measured,
 * nineteenth review, finding 3: `.quartz-gui/` at 555, EACCES out of the run, npm never called,
 * the next run back to "Already up to date."). So both writes say so and carry on - the note is a
 * pointer, not a result, and a run that cannot write it should still install.
 *
 * The SHA it stores is read, not decoration: it is how the run that finishes an earlier run's work
 * knows that the merge commit at HEAD is the one that run wrote - see the amend below. The flag
 * beside it belongs to the same question: only the run that started the merge can see what the two
 * files looked like before anything wrote them, and the amend needs that to tell npm's work from
 * the user's.
 *
 * So is the package list beside it. The plan is worked out against the merge base, and after the
 * merge that base is upstream's commit - so the run that takes over from a failed `npm install`
 * computes an *empty* plan and falls back to a plain `npm install`. Measured (2026-09-17, first
 * run of a real core update against jackyzha0/quartz with real npm, through the built app): the
 * first run failed at `npm install` - once on a package that does not exist, once on EACCES over a
 * `node_modules` set to 555 - the second said "Already up to date.", `success: true`, and npm
 * answered "removed 2 packages" in the first scene and "added 4 packages, removed 52 packages,
 * changed 81 packages" in the second. Either way the project's own themes were gone from
 * package.json *and* node_modules, and nothing in the output said so. (The numbers matter because
 * the note elsewhere quotes the EACCES scene: it is the one that fits "fix the error above and run
 * the update again", the missing package is not.) The list is what the earlier run took away, so
 * the later one can put it back; `stillMissing` then drops whatever the user or the merge has
 * already put back.
 */
const PENDING_UPDATE_FILE = 'core-update.json'

/** What an earlier run left outstanding: the commit it belongs to ('' for "nothing"), the
 *  project's own packages it took out of package.json on the way, and whether the two npm-owned
 *  files were exactly HEAD's when that run started - which is what tells a later amend that
 *  everything they differ by now was written by npm. */
interface PendingInstall {
  head: string
  reinstall: PackageAddition[]
  filesAtHead: boolean
}

/**
 * Whether somebody other than this app has taken package.json in hand since the note was written.
 *
 * The list answers one question - "which of this project's own packages has an update taken out of
 * package.json and not put back" - and this app is not the only one who can answer it. After a run
 * that failed at `npm install`, the user's way forward is to write those lines back themselves;
 * the run that does that is not ours, and neither is the decision to take one of them out again
 * later. Until now the list only ever ended in a run where npm got through, so it lay there with a
 * full list and the next update re-added a package the user had removed *and committed* - the
 * finding of the twenty-second review, through a door its fix does not close (twenty-third review,
 * finding 2, scenes f1 and r1).
 *
 * Asked as "has package.json been committed since", not as "does package.json still look the way
 * the run left it": the file coming back byte for byte is exactly what happens when the user puts
 * a line back and later takes it out again, which is the case this has to catch. A commit is also
 * the one signal that does not fire for npm's own rewriting, and it leaves h2 of the twenty-first
 * review alone - an unrelated commit between two runs (a Git-Sync, a note in the README) does not
 * touch this file.
 *
 * Asked before the merge, because the merge commit this run is about to write touches package.json
 * itself and would answer "yes" on every continuation run.
 *
 * Not caught: a repair and a removal that are both left uncommitted. The list then still applies,
 * and `stillMissing` cannot tell "not back yet" from "taken out again" - both are a missing entry.
 */
async function packageJsonCommittedSince(projectPath: string, head: string): Promise<boolean> {
  if (head === '') return false
  const listed = await run('git', ['rev-list', '--count', `${head}..HEAD`, '--', 'package.json'], projectPath)
  // Could not look is not "all clear" - and here the two answers are not symmetrical: keeping a
  // list we cannot vouch for writes a package line nobody asked for, silently and under
  // `success: true`, while dropping one leaves packages out where the user can see it and the
  // restore point still stands. A SHA the object database no longer has (an amended note from a
  // run long gone, a `git gc`) lands here.
  if (!listed.success) return true
  return Number.parseInt(listed.output.trim(), 10) > 0
}

/**
 * The note as it is on disk, which is a file in the user's project and therefore not to be trusted
 * further than it can be checked: a list read back is only used to build `npm install name@range`
 * arguments, so a name or range that is not a plain string, or one that could pass for a flag, is
 * dropped rather than handed on.
 */
async function readPendingInstall(projectPath: string): Promise<PendingInstall> {
  // Reading must not create the directory - see quartzGuiPath.
  const raw = await readJsonFileOr<{ installPendingFor?: unknown; reinstall?: unknown; filesAtHead?: unknown }>(
    quartzGuiPath(projectPath, PENDING_UPDATE_FILE),
    {}
  )
  const head = typeof raw.installPendingFor === 'string' ? raw.installPendingFor : ''
  // A note from a build before this field existed does not know, and not knowing is not
  // permission: the amend is skipped and the lockfile npm rewrote stands as a change to commit by
  // hand - the state before the nineteenth review, not a lost one.
  const filesAtHead = raw.filesAtHead === true
  const safe = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && !value.startsWith('-')
  const reinstall = Array.isArray(raw.reinstall)
    ? raw.reinstall.filter((entry): entry is PackageAddition => {
        if (typeof entry !== 'object' || entry === null) return false
        const candidate = entry as Record<string, unknown>
        return (
          safe(candidate.name) &&
          safe(candidate.range) &&
          typeof candidate.section === 'string' &&
          (DEPENDENCY_SECTIONS as string[]).includes(candidate.section)
        )
      })
    : []
  return { head, reinstall, filesAtHead }
}

async function markInstallPending(
  projectPath: string,
  head: string,
  reinstall: PackageAddition[],
  filesAtHead: boolean
): Promise<void> {
  await writeJsonFile(join(quartzGuiDir(projectPath), PENDING_UPDATE_FILE), {
    installPendingFor: head,
    reinstall,
    filesAtHead
  })
}

async function clearInstallPending(projectPath: string): Promise<void> {
  await writeJsonFile(join(quartzGuiDir(projectPath), PENDING_UPDATE_FILE), {
    installPendingFor: '',
    reinstall: [],
    filesAtHead: false
  })
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
  // `--index` and nothing behind it, for the reason spelled out at popCoreUpdateStash: the merge
  // never wrote anything here, so HEAD is still this stash's own base and the index diff applies.
  // A refusal is the answer to hand on (the caller names the packages and the stash stays for the
  // next run to report), not something to retry with a pop that would write conflict markers.
  return (await run('git', ['stash', 'pop', '--index'], projectPath)).success
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
async function popCoreUpdateStash(projectPath: string): Promise<{ success: boolean; output: string }> {
  const subject = await topStashSubject(projectPath)
  const head = (await run('git', ['rev-parse', 'HEAD'], projectPath)).output.trim()
  const base = await stashBase(projectPath)
  // Two questions, and the second is the one that matters: is this entry ours (the prefix), and
  // was it taken from the state the working tree has just been reset to (`refs/stash^` against
  // HEAD, both read *after* the abort, which does not move HEAD)? An entry from another HEAD is
  // one a pop would merge against a state that is gone - it stays where it is and is named.
  // Empty on either side is a "no": a repository that cannot answer `rev-parse` is not one to
  // write to.
  if (!subject.includes(CORE_UPDATE_STASH) || !head || base !== head) {
    // Nothing of this app's was written here, so the newest entry of all is ours if it is anywhere.
    const entry = await coreUpdateStashEntry(projectPath)
    const leftover = entry ? `\n\n${mainT('updateStashLeftover', { entry })}` : ''
    return { success: true, output: leftover }
  }
  // `--index`, because an abort should hand the project back the way it was found. A plain pop
  // restores the content but not the staging: measured against git 2.54, a `M ` (staged) goes back
  // as ` M` (unstaged), while with `--index` it stays `M `. For an unstaged change the two are
  // identical, so this only ever adds.
  //
  // No plain pop behind it any more. git says `--index` "may fail" where a plain one would get
  // through, but with the check above there is no such case left: the index holds the two files at
  // HEAD, HEAD is the stash's own base, so the index diff always applies. What the fallback did
  // instead was turn a clean refusal ("conflicts in index. Try without --index.") into a
  // package.json with conflict markers - measured, eighteenth review, finding 2.
  const popped = await run('git', ['stash', 'pop', '--index'], projectPath)
  // A pop that hits a conflict leaves the stash standing, which is the right end - but it is not
  // an abort that put the project back, and saying "erfolgreich" over git's conflict output is how
  // the user learns about it at the next build instead of now.
  if (!popped.success) return { success: false, output: `\n\n${mainT('updateStashPopFailed')}\n${popped.output}` }
  // And what the pop uncovered. An older entry of this app's can lie underneath - a run that never
  // got to put its own back - and until now the one moment it was certain to go unmentioned was
  // this one: the run that follows says nothing, because by then its own stash is gone and this
  // one is just an entry it did not write. Which of the two sentences it earns is the question
  // leftoverStashNote asks: does it still fit the state the project is in?
  const older = await coreUpdateStashEntry(projectPath)
  if (older === null) return { success: true, output: `\n${popped.output}` }
  const fits = head !== '' && (await stashBase(projectPath, older)) === head
  const note = mainT(fits ? 'updateStashFitsHead' : 'updateStashLeftover', { entry: older })
  return { success: true, output: `\n${popped.output}\n\n${note}` }
}

async function conflictedFiles(projectPath: string): Promise<string[]> {
  const conflicts = await run('git', ['diff', '--name-only', '--diff-filter=U'], projectPath)
  if (!conflicts.success) return []
  return conflicts.output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** What the abort button would do to the files the stash holds: hand them a working tree they fit
 *  into, leave one of them changed so the pop fails, or not run at all because git refuses. */
type StashAfterAbort = 'free' | 'occupied' | 'abortRefused'

/**
 * The fourth question of "the abort button will put it back", and the one the pop actually fails
 * on: will the files the stash holds be free in the working tree the *abort* leaves behind?
 *
 * Asked with git's own rule rather than a simplification of it. `git merge --abort` is
 * `reset --merge`, and what that keeps is what is "different between the index and working tree",
 * i.e. the *unstaged* half of a change - a staged one it throws away, whether the merge is about
 * that path or not. Where the merge *is* about the path as well, git refuses the abort outright
 * ("Entry 'package.json' not uptodate. Cannot merge."), and then the answer is neither of the two
 * sentences but the one the button itself will give. Measured (twentieth review, finding 2), each
 * a fresh clone with a leftover stash of ours and a half-done merge, `scripts` added to
 * package.json mid-merge:
 *
 *   s3 unstaged  upstream touches quartz/index.ts only, edit unstaged  abort runs, pop fails
 *   s3 staged    same, edit staged                                     abort runs, pop succeeds
 *   s4 unstaged  upstream touches package.json as well, unstaged       abort refused
 *   s4 staged    same, edit staged                                     abort runs, pop succeeds
 *
 * The version before this asked `git diff --name-only HEAD`, which reads index *and* working tree,
 * and called a staged change "differs from HEAD and the merge is not about it": s3 staged got
 * "they belong to a state that is gone" plus advice to `git stash drop`, seconds before the button
 * put them back. s4 unstaged got the opposite - "puts them back", then a button that refused.
 *
 * Not `git stash show -p | git apply --check`, the belt the eighteenth review proposed: that asks
 * about the tree standing there *now*, mid-merge, not about the one the abort will make. Measured
 * (nineteenth review, finding 4) it answers "would not apply" for two of three scenes whose
 * entries the button puts back - the same wrong direction as above, one layer further out.
 */
async function abortOutcomeForStash(projectPath: string): Promise<StashAfterAbort> {
  const stashed = await run('git', ['stash', 'show', '--name-only', 'refs/stash'], projectPath)
  if (!stashed.success) return 'occupied'
  const lines = (output: string): string[] =>
    output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  const paths = lines(stashed.output)
  if (paths.length === 0) return 'free'
  const names = async (revs: string[]): Promise<string[]> => {
    const diff = await run('git', ['diff', '--name-only', ...revs, '--', ...paths], projectPath)
    return diff.success ? lines(diff.output) : []
  }
  // Working tree against index: the one half of a change `reset --merge` keeps. Minus the paths
  // standing in conflict, which `git diff --name-only` lists as well - an unmerged path is not a
  // change of the user's that the abort would have to keep, it is the merge itself, and
  // `reset --merge` resets it without further ado. Measured (twenty-first review, finding 3): with
  // `UU package.json` beside a second conflict the answer was `abortRefused`, so the run advised
  // discarding a changed file under Git-Sync that does not exist, seconds before the button ran
  // and put the entry back.
  const conflicted = await conflictedFiles(projectPath)
  const unstaged = (await names([])).filter((file) => !conflicted.includes(file))
  if (unstaged.length === 0) return 'free'
  const fromMerge = await names(['HEAD', 'MERGE_HEAD'])
  return unstaged.some((file) => fromMerge.includes(file)) ? 'abortRefused' : 'occupied'
}

/**
 * Which sentence an entry that was already lying there has earned, asked *after* the run because
 * that is when the user reads it.
 *
 * The halves of "the abort button will put it back" are the ones popCoreUpdateStash asks (ours,
 * and taken from this very HEAD), plus the button existing at all - which it does only while a
 * merge is half-done - plus the one above, which is where the pop itself fails. Measured
 * (eighteenth review, finding 4): one run said "they do not belong to this update" and the abort
 * button popped that same entry seconds later.
 *
 * "A state that is gone" is the answer for an entry whose base is not this HEAD - a pop would
 * merge it against a state it was never taken from. It is *not* the answer merely because no
 * button is there to press: with the base still at HEAD the entry fits, this app just has no way
 * left to put it back, and `git stash pop` in a terminal does. Measured (twentieth review,
 * follow-up to the "nebenbei" list), scene s2 staged - first run leaves a half-done merge and a
 * stash, `git merge --abort` in the terminal, a staged edit to package.json, second run: git
 * refuses to start a merge at all, so no button, HEAD unmoved and equal to the stash base. The
 * old sentence advised `git stash drop` on entries that a plain pop merges in cleanly (measured:
 * "Auto-merging package.json", both the theme entry and the staged one in the file afterwards).
 * Against an *unstaged* change to the same file the pop refuses with git's own "commit your
 * changes or stash them" and leaves the entry where it is - a usable answer, and the reason this
 * is one sentence rather than two.
 */
async function leftoverStashNote(projectPath: string, before: string | null): Promise<string> {
  // A top of the stack that has moved means this run wrote an entry of its own and it is still
  // lying there - nothing here pops or drops anyone else's - so the leftover being described is
  // the next one down. Where the top has not moved, the leftover can be the top itself.
  const mine = (await stashRef(projectPath)) !== before
  const entry = await coreUpdateStashEntry(projectPath, mine ? 1 : 0)
  // Nothing of ours left to describe. Only reachable if something outside this app took the entry
  // away between the two reads, and then the sentence would name an entry that is not there.
  if (entry === null) return ''
  const leftover = mainT('updateStashLeftover', { entry })
  if (mine) return leftover
  const head = (await run('git', ['rev-parse', 'HEAD'], projectPath)).output.trim()
  const ours = (await topStashSubject(projectPath)).includes(CORE_UPDATE_STASH)
  if (!ours || head === '' || (await stashBase(projectPath)) !== head) return leftover
  // From here on the entry being described is the newest one of all, so the commands in these
  // sentences mean it without an argument - said with the name anyway, because the user reads them
  // beside `git stash list`.
  if (!(await mergeInProgress(projectPath))) return mainT('updateStashFitsHead', { entry })
  switch (await abortOutcomeForStash(projectPath)) {
    case 'free':
      return mainT('updateStashMine')
    // The button is the way back, and it is the user's own unstaged change standing in front of
    // it - the same sentence the button gives, said before they press it.
    case 'abortRefused':
      return mainT('updateStashMineBlocked')
    default:
      return leftover
  }
}

/**
 * A stash of this app's that is still there before this run has written one is a leftover: the run
 * that wrote it never got to put it back, because the user resolved that merge by hand or the app
 * ended in between. Measured (seventeenth review): two further updates ran afterwards and said
 * nothing at all about it, and nothing else in this app lists stashes. Said, not acted on - it is
 * the user's working tree, and what to do with it is their call.
 *
 * Asked before the run, because afterwards an entry of this run's own would answer the same way;
 * *which* sentence it earns is asked afterwards, see leftoverStashNote.
 */
export async function runCoreUpdate(projectPath: string): Promise<UpdateResult> {
  const before = (await coreUpdateStashEntry(projectPath)) !== null ? await stashRef(projectPath) : null
  const result = await runCoreUpdateFrom(projectPath)
  if (before === null) return result
  const note = await leftoverStashNote(projectPath, before)
  if (note === '') return result
  return { ...result, output: `${result.output}\n\n${note}` }
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
    // An earlier run's note, and whether its list is still this app's to answer. Both read before
    // the merge: the merge commit about to be written touches package.json itself, so asked
    // afterwards the second question says "yes" on every continuation run (see
    // packageJsonCommittedSince).
    const pending = await readPendingInstall(projectPath)
    const noteOverruled = await packageJsonCommittedSince(projectPath, pending.head)
    const tracked = await trackedNpmOwnedFiles(projectPath)
    // Whether the two files were, before this run touched anything, exactly what HEAD has - index
    // and working tree alike. It is the one thing that makes "everything they differ by at the end
    // was written by npm" true, and therefore the permission the amend below needs. Asked here
    // because the answer stops being readable one line later: holdNpmOwnedFiles takes any
    // difference away into the stash, and where the plan does not apply nothing takes it away at
    // all - so `held.kind` answers this for one of the two cases and not for the other.
    // Both halves, because `git diff HEAD` compares the *working tree* with HEAD and answers 0 for
    // a file that stands at three versions at once - staged away from HEAD, working tree back on
    // it. That is the very state `stagedApartFromWorkingTree` recognises for the plan, and the
    // permission for the amend did not ask it: measured (twenty-third review, finding 5, scene s3)
    // a staged line in package.json went out of the index, out of the working tree and into a
    // commit of ours without a word. Under `ourMergeCommit` it could not happen - git will not
    // begin a merge over a staged change - but under `resuming` there is no merge in front of this
    // run to say so.
    const npmFilesAtHead =
      tracked.length > 0 &&
      (await run('git', ['diff', '--quiet', 'HEAD', '--', ...tracked], projectPath)).success &&
      (await run('git', ['diff', '--quiet', '--cached', 'HEAD', '--', ...tracked], projectPath)).success
    // Whether the plan is actually in charge of these two files, as opposed to `reproducible`,
    // which only says the plan could be worked out. The step below has to succeed as well: if it
    // does not, the files are still in the working tree and git answers the way it did before this
    // plan existed - which is a usable answer, but only if nothing afterwards assumes otherwise.
    // A run that cannot even resolve what it just fetched hands the two files back to git instead:
    // the SHA is only the label on the stash now (the abort button decides on its base, see
    // popCoreUpdateStash), but a `rev-parse FETCH_HEAD` that does not answer after a fetch that
    // did is not a repository to take files out of. Same for a file that stands at three versions
    // at once: the stash would hold more than the plan can put back.
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

    // HEAD before the merge, to tell "nothing to fetch" from "merged something" without reading
    // git's English. A merge that does anything moves HEAD, fast-forward or merge commit alike.
    const headBefore = (await run('git', ['rev-parse', 'HEAD'], projectPath)).output.trim()
    const merge = await run('git', ['merge', 'FETCH_HEAD', '-m', MERGE_MESSAGE], projectPath)
    let mergeOutput = merge.output
    // Set where the commit at HEAD is one *this run* wrote, which is the one commit it may amend.
    // Two ways in: the conflict branch below commits the resolution itself, and a merge that could
    // not fast-forward gets its commit from git, with our -m. A fast-forward is the third case and
    // not one of them - there HEAD *is* upstream's own commit, and amending that would rewrite
    // history this project did not make. Set for the second case further down, where HEAD after
    // the merge is known.
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
          // The merge's own output only names the two files this branch has just resolved, so on
          // its own it reads as "these two are in conflict" for two files that are not. What went
          // wrong is in the commit's output - a pre-commit hook that exits 1, say - and it is the
          // only part of this the user can act on. Measured (seventeenth review, finding 7): with
          // a failing hook the reason did not reach the page at all.
          const why = committed ? `\n${committed.output}` : ''
          return {
            success: false,
            output: explainGitFailure(merge.output) + merge.output + why,
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

    // "Already up to date": the merge moved nothing, so there is nothing for npm to install and
    // nothing for a warm-up build to prove. Both ran anyway until now - a network install and a
    // whole `quartz build` for a run whose own output says it did not change a thing, and on the
    // way the two files were reset to HEAD and then written back by npm, so the user's own package
    // lines came out of this re-generated rather than untouched. The stash goes back instead of
    // being dropped, for exactly that reason: npm has not rewritten anything, so what git holds is
    // not history but the working tree as it was found.
    //
    // An unmoved HEAD alone does not say that, though: it is unmoved just as well when an earlier
    // run committed the merge and then never got its `npm install` through - see
    // PENDING_UPDATE_FILE, which is the second half of this question (eighteenth review, finding 1).
    const headAfter = (await run('git', ['rev-parse', 'HEAD'], projectPath)).output.trim()
    // The clean merge git committed itself, told from a fast-forward by HEAD being neither where
    // it was nor what was fetched. It is this run's commit as much as the resolved one, so the
    // lockfile npm is about to write belongs in it for the same reason. Measured (twentieth
    // review, finding 3): without this, a project whose merge went through cleanly kept
    // ` M package-lock.json` after the first run and had it amended away by a second - two answers
    // to one question, and the comment on `resuming` called them the same commit.
    // `mergeCommit` empty means this run could not resolve what it fetched, and then there is
    // nothing to tell a fast-forward from anything else - so no amend, as everywhere else that
    // value is missing.
    if (merge.success && headAfter !== '' && mergeCommit !== '' && headAfter !== headBefore && headAfter !== mergeCommit) {
      ourMergeCommit = true
    }
    const pendingFor = pending.head
    if (headBefore && headAfter === headBefore && pendingFor === '') {
      const restored = await releaseNpmOwnedFiles(projectPath, held)
      const pending =
        !restored && held.kind === 'held' && plan.localEdits.reinstall.length > 0
          ? `\n\n${mainT('updatePackagesPending', {
              packages: plan.localEdits.reinstall.map((entry) => entry.name).join(', ')
            })}`
          : ''
      return { success: true, output: mergeOutput + pending, snapshotId }
    }

    // One `npm install` per dependency section for the packages the merged package.json is
    // actually missing, and a plain one otherwise. Either way npm writes the lockfile that
    // upstream's copy just replaced.
    // From here on package.json is upstream's and node_modules is not: anything that ends this run
    // before the warm-up build below leaves the project in that state, and the note says so to the
    // next run. If it cannot be written the run goes on and says so - see PENDING_UPDATE_FILE.
    let noteFailure = ''
    const noteFailed = (error: unknown): void => {
      noteFailure = `\n\n${mainT('updateNoteUnwritable', { reason: error instanceof Error ? error.message : String(error) })}`
    }
    // What this run is about to take out of package.json, so that a run after a failed install can
    // put it back: from here on the file is upstream's, and a plan worked out later sees nothing.
    const takenOut = planApplies ? plan.reinstall : []

    // The plan of this run, plus what an earlier one noted down - the second half is what makes
    // "run the update again" finish the job rather than leave two packages out.
    //
    // Not asked against the SHA, unlike the amend below. The list answers "which of this project's
    // own packages has an update taken out of package.json", and that is not a property of one
    // commit: a single commit between the two runs - a Git-Sync, a note in the README - moved HEAD
    // and made this run read an empty list, write `[]` over the full one and delete it at the end.
    // Measured (twenty-first review, finding 1, scene h2): "Already up to date.", `success: true`,
    // a plain `npm install`, themes gone, note deleted. What the SHA would guard against is a list
    // from another state naming a package the user does not want back - and that is a question
    // about package.json, not about HEAD: `noteOverruled` asks it directly, and `stillMissing`
    // drops whatever is already there anyway.
    const carried = pendingFor !== '' && !noteOverruled ? pending.reinstall : []
    // The same question one run later: a run that takes over an earlier one's merge commit cannot
    // measure what the two files looked like before *that* run started, so it reads the answer the
    // note carries rather than its own - by then npm has written them at least once.
    const filesAtHead = pendingFor !== '' && pendingFor === headAfter ? pending.filesAtHead : npmFilesAtHead
    const wanted = [
      ...takenOut,
      ...carried.filter((entry) => !takenOut.some((own) => own.name === entry.name && own.section === entry.section))
    ]
    try {
      // `wanted`, not `takenOut`: the run that takes over from a failed install computes an empty
      // plan - that is the whole reason this list exists - so writing its own plan here would put
      // `[]` over the list it is about to use. It survived exactly one failed install. Measured
      // (twenty-first review, finding 1, scene h1 and the real run real2): the second failure left
      // `reinstall: []`, and the third run was verbatim the scene 32ff038 was built for.
      await markInstallPending(projectPath, headAfter, wanted, filesAtHead)
    } catch (error) {
      noteFailed(error)
    }
    const missingNow = wanted.length > 0 ? await stillMissing(projectPath, wanted) : []
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
          output: `${mergeOutput}\n\n${mainT('npmInstallFailed')}\n${installOutput}${missing}${noteFailure}`,
          snapshotId
        }
      }
    }

    // npm has them back, so the list has done its work - and a list that has done its work must not
    // outlive it. It only describes the window between "package.json is upstream's" and "npm has
    // put the project's own packages back"; the note as a whole outlives that window (the warm-up
    // build is still to come), the list does not.
    //
    // Without this it kept going for ever, because the only thing that clears the note is a run
    // that reaches the end - and a run that dies after this point (a crash, or a `.quartz-gui/`
    // that stops being writable in the middle of a run, which is how it was measured) leaves it
    // behind with a full list over a package.json that already has everything. A directory that is
    // unwritable from the start is not this case: then the first write fails too and there is no
    // note with a list at all. Measured (twenty-second review, finding 1): with such a note lying
    // around, a package the user had removed *and committed* came back on the next update -
    // `success: true`, in a run that had nothing to fetch.
    //
    // The SHA and `filesAtHead` stay because a *later* run reads them off the disk; the amend
    // below works from local variables and reads neither. And the SHA that stays can be one no ref
    // reaches any more - if the amend runs, it rewrites the very commit this names (measured,
    // twenty-third review, finding 6: `installPendingFor: 91cc795…` beside `HEAD f07a7a9…`).
    // Harmless, because the next run is then simply not a `resuming` one.
    try {
      await markInstallPending(projectPath, headAfter, [], filesAtHead)
    } catch (error) {
      noteFailed(error)
    }

    // What npm has just written to the two files belongs in the commit this run made rather than
    // standing in Git-Sync as a change nobody made. Which of it is npm's is the question
    // `filesAtHead` answers, below.
    //
    // `--only -- <paths>` rather than `git add` and then a plain amend, because a plain amend
    // commits the whole index, and the index is not ours. In the `ourMergeCommit` branch nothing
    // foreign can be in it - git refuses to start a merge over a staged change, so the run that
    // wrote that commit saw an index that matched HEAD (measured, twentieth review, finding 1:
    // "Your local changes to the following files would be overwritten by merge", for a file
    // upstream does not touch). Under `resuming` there is no merge in front of this run to say so,
    // and between the two runs the user can have staged anything: measured in the same scene, a
    // staged line in quartz/index.ts ended up inside a commit titled "Merge quartz-upstream (via
    // QuartzControl)", with the first run's author date, and left the index empty without a word.
    // `--only` takes these paths from the working tree, where npm has just written them, and
    // leaves every other index entry where it is (both merge parents survive; git refuses `--only`
    // only while a merge is still in progress, and by here it is committed).
    //
    // `resuming` is the same set of commits one run later: an earlier run wrote the merge and then
    // failed at `npm install`, so this run had nothing to fetch and `ourMergeCommit` is false -
    // while HEAD *is* that merge commit. The note says which one with the SHA it stored, and the subject says
    // the commit is this app's. Measured (nineteenth review, finding 5): without this the lockfile
    // npm had just rewritten stood in Git-Sync as ` M package-lock.json`, a change nobody made.
    // Not if the commit has left this machine, though: amending a merge the user has already
    // pushed under Git-Sync would rewrite published history to tidy up one file, which is the worse
    // of the two.
    const resuming =
      !ourMergeCommit &&
      pendingFor !== '' &&
      pendingFor === headAfter &&
      (await headSubject(projectPath)) === MERGE_MESSAGE &&
      !(await headIsPushed(projectPath))
    // And only when there is something to put in, and only when everything there is to put in was
    // written by npm.
    //
    // "Something to put in": npm rewrites the lockfile on most runs, but not on all of them - with
    // package.json unchanged it often leaves the file alone - and an amend with nothing to add
    // still writes a new commit: same tree, new committer time, new SHA (measured in a throwaway
    // repo, one second apart). Rewriting a commit that lacks nothing is the one thing this whole
    // branch exists to avoid doing lightly.
    //
    // "Written by npm": `git diff HEAD` answers "differs", not "npm wrote it", and the two part
    // company wherever the user held a package line uncommitted. `filesAtHead` is the difference -
    // measured before the merge, carried in the note for the run that finishes another's work.
    // Until the amend also ran after a clean merge, the comment above covered every case it could
    // reach: a conflict means both files were committed. It does not cover the clean merge, where
    // nothing conflicts and an uncommitted package line is exactly what the app's own theme
    // install leaves behind - nor the case where the plan says "hands off" and nothing was stashed
    // at all. Measured (twenty-first review, finding 2, upstream D, each a fresh clone): with the
    // themes uncommitted the merge commit carried package.json (+7/-2) and `git status` came back
    // clean; with a `scripts.mine` entry the plan will not reproduce, that entry stood in a commit
    // titled "Merge quartz-upstream (via QuartzControl)" - in the run where npm wrote nothing, it
    // was the *only* thing in it. Same at the real run (real3, real npm, real upstream): two theme
    // lines that were ` M package.json` before ended up inside merge commit 8648f0a. The
    // fast-forward beside it leaves the same lines uncommitted, which is the answer both should
    // give.
    // Both halves of the question, and under `resuming` they are two different runs' answers. The
    // note says what the run that made the merge commit saw before it; `npmFilesAtHead` says what
    // *this* run saw before it. Between them lies everything the user did while the update was
    // half-done, and this run cannot tell that from what npm left behind - so it does not try:
    // anything standing at the start of a resuming run is reason enough not to amend. Measured
    // (scene R4, real npm, real upstream, through the built app): first run leaves the merge commit
    // and fails at `npm install`, the user adds `scripts.mine` to package.json and leaves it
    // uncommitted, second run succeeds - and the entry stood inside "Merge quartz-upstream (via
    // QuartzControl)" with `git status` clean. In the same measurement npm had left both files
    // untouched when it failed (EACCES while moving packages into node_modules), which is why the
    // half that costs something - a lockfile npm rewrote before failing stays uncommitted - is the
    // rarer case and the cheaper one. In the `ourMergeCommit` branch the two halves are the same
    // measurement, so nothing changes there.
    const amendWorth =
      (ourMergeCommit || resuming) &&
      filesAtHead &&
      npmFilesAtHead &&
      tracked.length > 0 &&
      !(await run('git', ['diff', '--quiet', 'HEAD', '--', ...tracked], projectPath)).success
    if (amendWorth) {
      await run('git', ['commit', '--amend', '--no-edit', '--only', '--', ...tracked], projectPath)
    }

    const packageNotes = [
      missingNow.length > 0
        ? mainT('updatePackagesReinstalled', { packages: missingNow.map((entry) => entry.name).join(', ') })
        : '',
      // The `planApplies` here reads like it could withhold a true sentence - upstream changed
      // those packages whether or not this run touched the files. Measured (seventeenth review,
      // follow-up to its "only read" note): there is no way in. Every reason for `planApplies` to
      // be false is a reason git refuses the merge as soon as upstream touches the two files -
      // an unreproducible edit and a three-way staged file both end in "Your local changes to the
      // following files would be overwritten by merge: package.json", so this line is never
      // reached with a non-empty list. Left as it is, because loosening it changes nothing and a
      // condition that mirrors the one above is easier to read than one that does not.
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

    // The window is closed: npm has written both files and the build has had its turn. A warm-up
    // build that failed closes it too - it does not undo the merge and install, the note above says
    // so, and a rerun of the whole update would not build anything the next "Jetzt bauen" does not.
    try {
      await clearInstallPending(projectPath)
    } catch (error) {
      noteFailed(error)
    }

    return {
      success: true,
      output: `${mergeOutput}\n${installOutput}${packageNotes ? `\n${packageNotes}` : ''}${warmupNote}${noteFailure}`,
      snapshotId
    }
  })
}

/**
 * What `git merge --abort` is about to throw away without saying so: paths the user has staged that
 * the merge is not about. `reset --merge` keeps what is "different between the index and working
 * tree" - the *unstaged* half of a change - and resets the rest, so a staged edit to a file no one
 * else touched is gone, with no line of output about it. Measured (scene h9, upstream D): a staged
 * line in README.md next to a conflict in quartz/index.ts was not in the file afterwards and not in
 * `git status` either.
 *
 * The button stays a button - git allows this, and refusing where git does not is the app deciding
 * for the user. What it can do is name them, which is the difference between a loss and a silent
 * one. Paths the merge itself brought into the index are not in the list: they are its work, not
 * the user's.
 */
async function stagedOutsideMerge(projectPath: string): Promise<string[]> {
  const lines = (result: { success: boolean; output: string }): string[] =>
    result.success
      ? result.output
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
      : []
  const staged = lines(await run('git', ['diff', '--name-only', '--cached', 'HEAD'], projectPath))
  if (staged.length === 0) return []
  const fromMerge = new Set([
    ...lines(await run('git', ['diff', '--name-only', 'HEAD', 'MERGE_HEAD'], projectPath)),
    ...(await conflictedFiles(projectPath))
  ])
  return staged.filter((file) => !fromMerge.has(file))
}

export function abortCoreMerge(projectPath: string): Promise<PluginActionResult> {
  // Parked for the same reason the merge itself is: an abort has to rewrite the working tree, and
  // content/ is part of what the conflicted merge touched.
  return withContentSymlinkParked(projectPath, async () => {
    // Nothing to read before the abort: what decides whether the stash lying there is this run's
    // is the HEAD it was taken from, and `merge --abort` does not move HEAD (see
    // popCoreUpdateStash). MERGE_HEAD, which it does throw away, would only have said which merge
    // the entry accompanied - the same merge can be attempted against two different HEADs.
    // Read before the abort: MERGE_HEAD is one of the things it throws away, and without it there is
    // no way left to tell the user's staged work from the merge's own.
    const losing = await stagedOutsideMerge(projectPath)
    const result = await run('git', ['merge', '--abort'], projectPath)
    if (!result.success) return { success: false, output: explainGitFailure(result.output) + result.output }
    const popped = await popCoreUpdateStash(projectPath)
    const lost = losing.length > 0 ? `\n\n${mainT('updateAbortDroppedStaged', { files: losing.join(', ') })}` : ''
    return { success: popped.success, output: result.output + popped.output + lost }
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
