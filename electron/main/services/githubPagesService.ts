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
// branch - reuses a git worktree (not a second clone) checked out to the Pages branch.
//
// NB: each deploy adds one commit on top of the existing branch, it does NOT squash to a single
// root commit (verified against local bare repos: three deploys leave three commits). The branch
// is fetched first and the worktree is based on that tip, so a commit pushed there by someone
// else stays reachable as an ancestor rather than being discarded. Only the orphan case below
// (branch does not exist remotely yet) starts a fresh history.
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

  let addWorktree: { success: boolean; output: string }
  if (branchExists) {
    addWorktree = await run('git', ['worktree', 'add', worktreeDir, '-B', branch, `origin/${branch}`], projectPath)
  } else {
    addWorktree = await run('git', ['worktree', 'add', '--detach', worktreeDir], projectPath)
    if (addWorktree.success) {
      const orphan = await run('git', ['checkout', '--orphan', branch], worktreeDir)
      output += orphan.output
      const clearIndex = await run('git', ['rm', '-rf', '--quiet', '.'], worktreeDir)
      output += clearIndex.output
    }
  }
  output += addWorktree.output
  if (!addWorktree.success) return { success: false, output }

  try {
    await clearWorktreeContents(worktreeDir)
    await mkdir(worktreeDir, { recursive: true })
    await cp(buildDir, worktreeDir, { recursive: true })

    await run('git', ['add', '-A'], worktreeDir)
    const commit = await run('git', ['commit', '-m', `Deploy ${new Date().toISOString()}`], worktreeDir)
    output += commit.output
    // "nothing to commit" (identical output to the last deploy) isn't a failure - the branch is
    // already up to date, so push is skipped but the overall deploy still succeeds.
    const nothingToCommit = !commit.success && /nothing to commit/i.test(commit.output)

    if (!commit.success && !nothingToCommit) return { success: false, output }

    if (!nothingToCommit) {
      // --force-with-lease pinned to the tip fetched above. The fetch happens at the start of
      // this function, so the lease only covers the window between fetch and push (a push landing
      // mid-deploy) - it is not broad protection, but it is strictly narrower than a bare --force
      // and costs nothing. A branch that doesn't exist remotely yet needs no force at all.
      const pushArgs =
        remoteTip.length > 0
          ? ['push', `--force-with-lease=refs/heads/${branch}:${remoteTip}`, 'origin', `HEAD:${branch}`]
          : ['push', 'origin', `HEAD:${branch}`]
      const push = await run('git', pushArgs, worktreeDir)
      output += push.output
      if (!push.success) return { success: false, output }
    }

    return { success: true, output }
  } finally {
    await run('git', ['worktree', 'remove', '--force', worktreeDir], projectPath)
  }
}
