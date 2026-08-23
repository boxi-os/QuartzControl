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
// branch - reuses a git worktree (not a second clone) checked out to the Pages branch, squashing
// every deploy into a single commit (the standard technique tools like the "gh-pages" npm package
// use), force-pushed since a Pages branch's history isn't meant to accumulate.
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

  const worktreeDir = join(projectPath, '.quartz-gui', 'gh-pages-worktree')

  // Clean up any stale worktree registration/directory from a previous (e.g. interrupted) deploy
  // before adding a fresh one - `git worktree add` fails outright if the path is already registered.
  await run('git', ['worktree', 'remove', '--force', worktreeDir], projectPath)
  await rm(worktreeDir, { recursive: true, force: true })

  const fetchBranch = await run('git', ['fetch', 'origin', branch], projectPath)
  const branchExists = fetchBranch.success

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
      const push = await run('git', ['push', 'origin', `HEAD:${branch}`, '--force'], worktreeDir)
      output += push.output
      if (!push.success) return { success: false, output }
    }

    return { success: true, output }
  } finally {
    await run('git', ['worktree', 'remove', '--force', worktreeDir], projectPath)
  }
}
