import { spawn } from 'child_process'

export interface CommandResult {
  success: boolean
  output: string
}

// Why this isn't a blanket `shell: process.platform === 'win32'` (which is what every caller used
// to do): on Windows a shell re-interprets metacharacters in the *arguments*, so a project path or
// output directory containing "&" would both break and become an injection point. A shell is only
// needed for npm/npx, which are .cmd shims CreateProcess cannot execute directly. `git` is a real
// .exe on PATH and must not get one.
export function needsShell(command: string): boolean {
  if (process.platform !== 'win32') return false
  return command !== 'git'
}

// The one place this app spawns a short-lived command and waits for its combined output. Callers
// that stream output live (buildService) keep their own spawn.
//
// stdio's closed stdin is deliberate: an unexpected interactive prompt then fails fast instead of
// hanging forever - see CLAUDE.md on `quartz create`'s wizard.
export function runCommand(
  command: string,
  args: string[],
  cwd?: string,
  // Extra environment for this one call. Used to hand git a credential through GIT_ASKPASS -
  // argv would put it in `ps` output, and a token inside the remote URL would be written into the
  // project's own .git/config and printed by `git remote -v`.
  env?: Record<string, string>
): Promise<CommandResult> {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd,
      shell: needsShell(command),
      stdio: ['ignore', 'pipe', 'pipe'],
      ...(env ? { env: { ...process.env, ...env } } : {})
    })
    let output = ''
    child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.on('exit', (code) => resolvePromise({ success: code === 0, output }))
    child.on('error', (err) => resolvePromise({ success: false, output: String(err) }))
  })
}
