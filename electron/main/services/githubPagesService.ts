import { spawn } from 'child_process'
import { cp, mkdir, readdir, rm } from 'fs/promises'
import { join } from 'path'
import type { DeployResult, GithubPagesDeployOptions } from '@shared/ipc-contract'

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

async function clearWorktreeContents(worktreeDir: string): Promise<void> {
  const entries = await readdir(worktreeDir)
  await Promise.all(entries.filter((e) => e !== '.git').map((e) => rm(join(worktreeDir, e), { recursive: true, force: true })))
}

// No syncService.ts reuse here - that only wraps `quartz sync`, which has no git primitives for
// an orphan/squash branch push. Uses the project's existing "origin" remote (the same one
// Git-Sync pushes to) rather than a separate concept, since it's the same repo, just a different
// branch - reuses a git worktree (not a second clone) rather than a throwaway clone.
//
// Every deploy publishes a single ROOT commit, replacing whatever the branch held before. The
// Pages branch carries only generated build output, which is always reproducible from the source,
// so keeping a history of it costs repo size for nothing recoverable - and a static-site build
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
export async function deployGithubPages(
  projectPath: string,
  outputDir: string | undefined,
  options: GithubPagesDeployOptions
): Promise<DeployResult> {
  const branch = options.branch || 'gh-pages'
  const buildDir = join(projectPath, outputDir || 'public')
  let output = ''

  const originCheck = await run('git', ['remote', 'get-url', 'origin'], projectPath)
  if (!originCheck.success) {
    return {
      success: false,
      output: 'Kein "origin"-Remote konfiguriert. Git-Sync muss zuerst mit einem GitHub-Repo verbunden werden (git remote add origin <url>).'
    }
  }

  // The branch name is a free-text field in the UI, and every deploy force-pushes over whatever
  // it names - so a typo like "main" would otherwise overwrite the site's own history
  // irrecoverably. Both the checked-out branch and origin's default branch are refused outright;
  // a Pages branch is never either of those.
  const currentBranch = await run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], projectPath)
  const originHead = await run('git', ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], projectPath)
  const protectedBranches = new Set<string>()
  if (currentBranch.success) protectedBranches.add(currentBranch.output.trim())
  // "origin/main" -> "main"; absent unless the remote HEAD was ever resolved locally, hence the
  // current branch above as the always-available second guard
  if (originHead.success) protectedBranches.add(originHead.output.trim().replace(/^origin\//, ''))
  if (protectedBranches.has(branch)) {
    return {
      success: false,
      output: `"${branch}" ist der aktuelle bzw. der Standard-Branch dieses Repos. Ein Pages-Deploy überschreibt den Ziel-Branch vollständig (force-push) - bitte einen separaten Branch wie "gh-pages" verwenden.`
    }
  }

  const worktreeDir = join(projectPath, '.quartz-gui', 'gh-pages-worktree')

  // Clean up any stale worktree registration/directory from a previous (e.g. interrupted) deploy
  // before adding a fresh one - `git worktree add` fails outright if the path is already registered.
  await run('git', ['worktree', 'remove', '--force', worktreeDir], projectPath)
  await rm(worktreeDir, { recursive: true, force: true })

  const fetchBranch = await run('git', ['fetch', 'origin', branch], projectPath)
  const branchExists = fetchBranch.success
  // The remote tip we just fetched, used as the explicit lease below. Read from FETCH_HEAD rather
  // than refs/remotes/origin/<branch>, which a single-branch fetch only updates opportunistically.
  const remoteTip = branchExists ? (await run('git', ['rev-parse', 'FETCH_HEAD'], projectPath)).output.trim() : ''

  // Detached, and always from HEAD: the commit built below has no parent, so where the worktree
  // starts is irrelevant - it only has to provide a working directory and an index to stage into.
  const addWorktree = await run('git', ['worktree', 'add', '--detach', worktreeDir], projectPath)
  output += addWorktree.output
  if (!addWorktree.success) return { success: false, output }

  try {
    await clearWorktreeContents(worktreeDir)
    await mkdir(worktreeDir, { recursive: true })
    await cp(buildDir, worktreeDir, { recursive: true })

    // --force: the build output has to be staged whatever ignore rules might apply to it. A
    // worktree shares .git/info/exclude with the main one and core.excludesFile is global, so a
    // rule the user never thought about here would silently drop a file from the live site.
    const add = await run('git', ['add', '-A', '--force'], worktreeDir)
    output += add.output
    if (!add.success) return { success: false, output }

    const writeTree = await run('git', ['write-tree'], worktreeDir)
    output += writeTree.output
    if (!writeTree.success) return { success: false, output }
    const tree = writeTree.output.trim()

    // Comparing trees answers "is what's published already byte-identical?" exactly. It also
    // replaces the old parse of `git commit`'s "nothing to commit" message, which no longer
    // applies: a fresh root commit is always a new commit, even when its content is unchanged.
    if (remoteTip) {
      const remoteTree = await run('git', ['rev-parse', `${remoteTip}^{tree}`], projectPath)
      if (remoteTree.success && remoteTree.output.trim() === tree) {
        return { success: true, output: `${output}\nKeine Änderungen gegenüber dem veröffentlichten Stand - Push übersprungen.` }
      }
    }

    const commitTree = await run('git', ['commit-tree', tree, '-m', `Deploy ${new Date().toISOString()}`], worktreeDir)
    output += commitTree.output
    if (!commitTree.success) return { success: false, output }
    const commit = commitTree.output.trim()

    // A root commit is never a descendant of the previous tip, so replacing an existing branch
    // always needs force. --force-with-lease is pinned to the tip fetched above, which covers a
    // push landing between that fetch and this one. A branch that doesn't exist yet needs no force.
    const pushArgs = remoteTip
      ? ['push', `--force-with-lease=refs/heads/${branch}:${remoteTip}`, 'origin', `${commit}:refs/heads/${branch}`]
      : ['push', 'origin', `${commit}:refs/heads/${branch}`]
    const push = await run('git', pushArgs, worktreeDir)
    output += push.output
    if (!push.success) return { success: false, output }

    return { success: true, output }
  } finally {
    await run('git', ['worktree', 'remove', '--force', worktreeDir], projectPath)
  }
}
