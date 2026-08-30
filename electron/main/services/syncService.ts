import { runCommand } from './runCommand'
import { gitAuthForOrigin } from './gitAuth'
import { TEMPLATE_REPO } from './createService'
import { mainT } from '../i18n'
import type { SyncOptions, SyncResult } from '@shared/ipc-contract'

/**
 * Completes a shallow history before a push, because git will not push one. Projects created by
 * this app used to be cloned with `--depth 1`, and the first push to a fresh repository then died
 * with "remote: fatal: did not receive expected object" / "index-pack failed" on GitHub, or
 * "shallow update not allowed" against a plain remote - both reproduced, and the second is git
 * saying plainly what the first one means.
 *
 * The objects come from Quartz upstream rather than from `origin`: origin is the user's own
 * repository, which on a first push is empty and has none of them. `updateService` already keeps a
 * `quartz-upstream` remote for core updates, so that is preferred when it exists.
 *
 * A no-op for every project cloned since (one `rev-parse`), and a failure here is reported but not
 * fatal - the push may still be worth attempting, and its own error is the more informative one.
 */
async function completeHistoryForPush(projectPath: string): Promise<string> {
  const shallow = await runCommand('git', ['rev-parse', '--is-shallow-repository'], projectPath)
  if (!shallow.success || shallow.output.trim() !== 'true') return ''

  const configured = await runCommand('git', ['remote', 'get-url', 'quartz-upstream'], projectPath)
  const source = configured.success && configured.output.trim() ? configured.output.trim() : TEMPLATE_REPO
  const fetched = await runCommand('git', ['fetch', '--unshallow', '--', source], projectPath)
  return fetched.success
    ? `${mainT('syncHistoryCompleted')}\n\n`
    : `${mainT('syncHistoryIncomplete')}\n${fetched.output}\n\n`
}

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
  const prelude = direction === 'pull' ? '' : await completeHistoryForPush(projectPath)

  const auth = await gitAuthForOrigin(projectPath)
  try {
    const result = await runCommand('npx', args, projectPath, auth.env)
    // `quartz sync` reports a failed push in prose and exits 0 anyway: its handler prints
    // "An error occurred while pushing to remote origin." and *returns* (quartz/cli/handlers.js,
    // read in a real checkout). So the exit code says success while the output says the push was
    // rejected - which is exactly what the page showed, a green "Erfolgreich" above a rejected
    // push. The same shape covers its failed-pull path.
    const cliFailed = result.success && /An error occurred while/.test(result.output)
    return { success: !cliFailed && result.success, output: prelude + result.output }
  } finally {
    await auth.cleanup()
  }
}
