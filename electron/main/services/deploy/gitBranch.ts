import { cp, mkdir, readdir, rm } from 'fs/promises'
import { join } from 'path'
import type { DeployDiffEntry, DeployResult, PublishTarget } from '@shared/ipc-contract'
import type { DeployAdapter, DeployContext } from './types'
import { runCommand as run } from '../runCommand'
import { quartzGuiDir } from '../projectDirs'

// Publishing by pushing the build output to a branch of the project's own repo. Three providers
// use exactly this mechanism and differ only in what they call the branch and what they do with
// it, so there is one adapter rather than three: GitHub Pages (gh-pages), Codeberg Pages (pages,
// served directly), GitLab Pages (needs a CI job of its own to actually publish - the push works
// either way, which is why the UI says so rather than the code pretending otherwise).
//
// No syncService reuse here - that only wraps `quartz sync`, which has no git primitives for an
// orphan/squash branch push. Uses the project's existing "origin" remote (the same one Git-Sync
// pushes to) rather than a separate concept, since it's the same repo, just a different branch -
// and a git worktree rather than a throwaway clone.
//
// Every deploy publishes a single ROOT commit, replacing whatever the branch held before. The
// branch carries only generated build output, which is always reproducible from the source, so
// keeping a history of it costs repo size for nothing recoverable - and a static-site build
// rewrites nearly every HTML file, so each deploy would otherwise add a near-complete set of new
// blobs. This matches what the standard "gh-pages" npm package does. Consequence, by design:
// nothing may be kept on that branch that the build does not produce (a CNAME file for a custom
// domain would have to be emitted into the build output, not committed to the branch by hand).
//
// The commit is built with plumbing (write-tree + commit-tree) rather than `git commit`, because
// commit-tree with no -p is precisely "a commit with no parent". The porcelain alternative,
// `git checkout --orphan <branch>`, leaves a local branch behind that makes the *next* deploy
// fail with "branch already exists"; pushing a raw commit sha to refs/heads/<branch> needs no
// local branch at all.

async function clearWorktreeContents(worktreeDir: string): Promise<void> {
  const entries = await readdir(worktreeDir)
  await Promise.all(entries.filter((e) => e !== '.git').map((e) => rm(join(worktreeDir, e), { recursive: true, force: true })))
}

// Per target, not one shared path: two git-branch targets (a live branch and a staging one) would
// otherwise fight over the same worktree registration.
function worktreePath(projectPath: string, target: PublishTarget): string {
  return join(quartzGuiDir(projectPath), `branch-worktree-${target.id}`)
}

interface Staged {
  tree: string
  remoteTip: string
  output: string
}

/** Everything both preview and run need: the branch fetched, the build output staged, a tree written. */
async function stageBuild(ctx: DeployContext, branch: string, worktreeDir: string): Promise<Staged> {
  let output = ''

  // Clean up any stale worktree registration/directory from a previous (e.g. interrupted) deploy
  // before adding a fresh one - `git worktree add` fails outright if the path is already registered.
  // The prune also clears registrations whose directory is long gone, including ones left by the
  // single shared path this used before targets existed.
  await run('git', ['worktree', 'prune'], ctx.projectPath)
  await run('git', ['worktree', 'remove', '--force', worktreeDir], ctx.projectPath)
  await rm(worktreeDir, { recursive: true, force: true })

  const fetchBranch = await run('git', ['fetch', 'origin', branch], ctx.projectPath)
  // The remote tip we just fetched, used as the explicit lease on push. Read from FETCH_HEAD rather
  // than refs/remotes/origin/<branch>, which a single-branch fetch only updates opportunistically.
  const remoteTip = fetchBranch.success ? (await run('git', ['rev-parse', 'FETCH_HEAD'], ctx.projectPath)).output.trim() : ''

  // Detached, and always from HEAD: the commit built later has no parent, so where the worktree
  // starts is irrelevant - it only has to provide a working directory and an index to stage into.
  const addWorktree = await run('git', ['worktree', 'add', '--detach', worktreeDir], ctx.projectPath)
  output += addWorktree.output
  if (!addWorktree.success) throw new Error(output)

  await clearWorktreeContents(worktreeDir)
  await mkdir(worktreeDir, { recursive: true })
  await cp(ctx.buildDir, worktreeDir, { recursive: true })

  // --force: the build output has to be staged whatever ignore rules might apply to it. A
  // worktree shares .git/info/exclude with the main one and core.excludesFile is global, so a
  // rule the user never thought about here would silently drop a file from the live site.
  const add = await run('git', ['add', '-A', '--force'], worktreeDir)
  output += add.output
  if (!add.success) throw new Error(output)

  const writeTree = await run('git', ['write-tree'], worktreeDir)
  output += writeTree.output
  if (!writeTree.success) throw new Error(output)

  return { tree: writeTree.output.trim(), remoteTip, output }
}

function parseNameStatus(raw: string): DeployDiffEntry[] {
  const entries: DeployDiffEntry[] = []
  for (const line of raw.split('\n')) {
    const [code, ...rest] = line.split('\t')
    const path = rest.join('\t').trim()
    if (!path) continue
    if (code.startsWith('A')) entries.push({ path, status: 'added' })
    else if (code.startsWith('D')) entries.push({ path, status: 'removed' })
    else if (code.startsWith('M') || code.startsWith('T') || code.startsWith('R') || code.startsWith('C')) {
      entries.push({ path, status: 'changed' })
    }
  }
  return entries
}

async function assertOrigin(projectPath: string): Promise<void> {
  const originCheck = await run('git', ['remote', 'get-url', 'origin'], projectPath)
  if (!originCheck.success) {
    throw new Error(
      'Kein "origin"-Remote konfiguriert. Git-Sync muss zuerst mit einem Repository verbunden werden (git remote add origin <url>).'
    )
  }
}

// The branch name is a free-text field, and every deploy force-pushes over whatever it names - so
// a typo like "main" would otherwise overwrite the site's own history irrecoverably. Both the
// checked-out branch and origin's default branch are refused outright; a pages branch is never
// either of those. This cannot live in a zod schema: only here can "the current branch" be
// resolved.
async function assertBranchSafe(projectPath: string, branch: string): Promise<void> {
  const currentBranch = await run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], projectPath)
  const originHead = await run('git', ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], projectPath)
  const protectedBranches = new Set<string>()
  if (currentBranch.success) protectedBranches.add(currentBranch.output.trim())
  // "origin/main" -> "main"; absent unless the remote HEAD was ever resolved locally, hence the
  // current branch above as the always-available second guard
  if (originHead.success) protectedBranches.add(originHead.output.trim().replace(/^origin\//, ''))
  if (protectedBranches.has(branch)) {
    throw new Error(
      `"${branch}" ist der aktuelle bzw. der Standard-Branch dieses Repos. Ein Branch-Deploy überschreibt den Ziel-Branch vollständig (force-push) - bitte einen separaten Branch wie "gh-pages" verwenden.`
    )
  }
}

export const gitBranchAdapter: DeployAdapter = {
  // A real diff against what is actually published, not against a local record: the branch is
  // fetched and the freshly written tree compared with the remote one. Costs a fetch and a staging
  // pass, which is why it happens on demand rather than on every page visit.
  async preview(ctx): Promise<DeployDiffEntry[]> {
    const destination = ctx.target.destination
    if (destination.type !== 'git-branch') throw new Error('Falscher Zieltyp für den Branch-Adapter.')
    await assertOrigin(ctx.projectPath)
    await assertBranchSafe(ctx.projectPath, destination.branch)

    const worktreeDir = worktreePath(ctx.projectPath, ctx.target)
    try {
      const staged = await stageBuild(ctx, destination.branch, worktreeDir)
      if (!staged.remoteTip) {
        // Branch does not exist yet - everything in the tree is new.
        const listing = await run('git', ['ls-tree', '-r', '--name-only', staged.tree], ctx.projectPath)
        if (!listing.success) throw new Error(listing.output)
        return listing.output
          .split('\n')
          .map((p) => p.trim())
          .filter(Boolean)
          .map((path) => ({ path, status: 'added' as const }))
      }
      const diff = await run('git', ['diff', '--name-status', `${staged.remoteTip}^{tree}`, staged.tree], ctx.projectPath)
      if (!diff.success) throw new Error(diff.output)
      return parseNameStatus(diff.output).sort((a, b) => a.path.localeCompare(b.path))
    } finally {
      await run('git', ['worktree', 'remove', '--force', worktreeDir], ctx.projectPath)
    }
  },

  // excludePaths is deliberately ignored: the branch is replaced wholesale by one root commit, so
  // "publish everything except this file" would mean the file disappears from the live site rather
  // than being left untouched. The UI hides the per-file checkboxes for this target type.
  async run(ctx): Promise<DeployResult> {
    const destination = ctx.target.destination
    if (destination.type !== 'git-branch') throw new Error('Falscher Zieltyp für den Branch-Adapter.')
    await assertOrigin(ctx.projectPath)
    await assertBranchSafe(ctx.projectPath, destination.branch)

    const worktreeDir = worktreePath(ctx.projectPath, ctx.target)
    let output = ''
    try {
      const staged = await stageBuild(ctx, destination.branch, worktreeDir)
      output += staged.output

      // Comparing trees answers "is what's published already byte-identical?" exactly. It also
      // replaces a parse of `git commit`'s "nothing to commit" message, which does not apply here:
      // a fresh root commit is always a new commit, even when its content is unchanged.
      if (staged.remoteTip) {
        const remoteTree = await run('git', ['rev-parse', `${staged.remoteTip}^{tree}`], ctx.projectPath)
        if (remoteTree.success && remoteTree.output.trim() === staged.tree) {
          return { success: true, output: `${output}\nKeine Änderungen gegenüber dem veröffentlichten Stand - Push übersprungen.` }
        }
      }

      ctx.emitProgress(0, 1, destination.branch)
      const commitTree = await run('git', ['commit-tree', staged.tree, '-m', `Deploy ${new Date().toISOString()}`], worktreeDir)
      output += commitTree.output
      if (!commitTree.success) return { success: false, output }
      const commit = commitTree.output.trim()

      // A root commit is never a descendant of the previous tip, so replacing an existing branch
      // always needs force. --force-with-lease is pinned to the tip fetched above, which covers a
      // push landing between that fetch and this one. A branch that doesn't exist yet needs no force.
      const pushArgs = staged.remoteTip
        ? ['push', `--force-with-lease=refs/heads/${destination.branch}:${staged.remoteTip}`, 'origin', `${commit}:refs/heads/${destination.branch}`]
        : ['push', 'origin', `${commit}:refs/heads/${destination.branch}`]
      const push = await run('git', pushArgs, worktreeDir)
      output += push.output
      ctx.emitProgress(1, 1, destination.branch)
      return { success: push.success, output }
    } catch (err) {
      return { success: false, output: `${output}\n${String(err instanceof Error ? err.message : err)}` }
    } finally {
      await run('git', ['worktree', 'remove', '--force', worktreeDir], ctx.projectPath)
    }
  }
}
