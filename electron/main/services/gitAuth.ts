import { chmod, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { runCommand as run } from './runCommand'
import * as connectionsService from './connectionsService'
import { parseGithubRemote } from './githubService'

// A repository this app just created has no credentials cached anywhere, so the first push would
// fail with git asking for a username on a pipe nobody reads. The stored GitHub token answers
// that - but only ever through GIT_ASKPASS:
//
//   - not in the remote URL, which git writes into the project's own .git/config and prints from
//     `git remote -v`, so the token would end up on disk in the user's repo and in any log,
//   - not in argv (`-c http.extraHeader=...`), which is visible in `ps` output.
//
// The token reaches the helper through the environment of that one call, which is what git's own
// documentation and the GitHub CLI do.
export interface GitAuth {
  env: Record<string, string>
  cleanup(): Promise<void>
}

const NO_AUTH: GitAuth = { env: {}, cleanup: async () => {} }

/** Credentials for pushing to this project's origin, or nothing when none apply. */
export async function gitAuthForOrigin(projectPath: string): Promise<GitAuth> {
  const origin = await run('git', ['remote', 'get-url', 'origin'], projectPath)
  // Only github.com: handing the token to some other host would be sending a credential to a
  // party it was never issued for.
  if (!origin.success || !parseGithubRemote(origin.output)) return NO_AUTH
  // An ssh remote authenticates with a key, not a token - nothing to add.
  if (!/^https?:\/\//.test(origin.output.trim())) return NO_AUTH

  const token = await connectionsService.getGithubToken()
  if (!token) return NO_AUTH

  const dir = await mkdtemp(join(tmpdir(), 'qc-git-'))
  const script = join(dir, 'askpass.sh')
  // git calls the helper once per prompt with the prompt text as $1; GitHub accepts any username
  // alongside a token, so the literal x-access-token is used rather than looking the login up.
  await writeFile(
    script,
    '#!/bin/sh\ncase "$1" in\n  *[Uu]sername*) printf %s "x-access-token" ;;\n  *) printf %s "$QC_GIT_TOKEN" ;;\nesac\n',
    'utf-8'
  )
  await chmod(script, 0o700)

  return {
    env: {
      GIT_ASKPASS: script,
      QC_GIT_TOKEN: token,
      // Without this, a git that cannot use the helper falls back to prompting on the terminal and
      // hangs forever behind the closed stdin every spawn here uses.
      GIT_TERMINAL_PROMPT: '0'
    },
    cleanup: () => rm(dir, { recursive: true, force: true })
  }
}
