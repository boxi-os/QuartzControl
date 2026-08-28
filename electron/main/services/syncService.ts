import { runCommand } from './runCommand'
import { gitAuthForOrigin } from './gitAuth'
import type { SyncOptions, SyncResult } from '@shared/ipc-contract'

export async function runSync(
  projectPath: string,
  direction: 'push' | 'pull' | 'both' = 'both',
  options: SyncOptions = { commit: true }
): Promise<SyncResult> {
  // --push/--pull both default to true (yargs booleans), so a single direction is
  // selected by negating the other one rather than by only passing the one wanted
  const args = ['quartz', 'sync']
  if (direction === 'push') args.push('--no-pull')
  if (direction === 'pull') args.push('--no-push')

  // --commit defaults to true as well: every run stages the whole working tree and commits it.
  // That was invisible in the UI, which offered "Pull" as if it only fetched.
  if (!options.commit) args.push('--no-commit')
  else if (options.message?.trim()) args.push('-m', options.message.trim())

  // The push inside `quartz sync` is a plain `git push` to origin, and this app is the one place
  // that holds a GitHub token - without handing it over, a user whose git has no credential helper
  // for github.com got "could not read Username for 'https://github.com': Device not configured"
  // (measured) while the app's own branch deploy, which does use the token, worked. The
  // environment reaches git through npx and quartz, which spawn it with the environment they were
  // given; gitAuthForOrigin answers nothing at all for a non-GitHub or ssh remote.
  const auth = await gitAuthForOrigin(projectPath)
  try {
    return await runCommand('npx', args, projectPath, auth.env)
  } finally {
    await auth.cleanup()
  }
}
