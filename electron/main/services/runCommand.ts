import { spawn } from 'child_process'
import { mainT } from '../i18n'

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
  env?: Record<string, string>,
  // For the calls that talk to a remote host. git has no timeout of its own, and a stalled TCP
  // connection (a captive portal, a dropped route) leaves the promise pending for as long as the
  // kernel keeps retrying - which on the Updates tab means a spinner with no way to cancel it.
  // Left unset for everything local and for npm install, which legitimately takes minutes.
  timeoutMs?: number
): Promise<CommandResult> {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd,
      shell: needsShell(command),
      stdio: ['ignore', 'pipe', 'pipe'],
      ...(env ? { env: { ...process.env, ...env } } : {})
    })
    let output = ''
    let settled = false
    let timer: NodeJS.Timeout | null = null
    const settle = (result: CommandResult): void => {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      resolvePromise(result)
    }
    if (timeoutMs) {
      timer = setTimeout(() => {
        // Answered right here rather than from the kill's 'close': a child that left a grandchild
        // holding stdout keeps the pipe open even after it dies, and waiting for that would put
        // the caller back where the missing timeout left it.
        settle({ success: false, output: `${output}\n${mainT('commandTimeout', { ms: timeoutMs, command: `${command} ${args[0] ?? ''}` })}` })
        child.kill('SIGTERM')
        setTimeout(() => child.kill('SIGKILL'), 2000).unref()
      }, timeoutMs)
      timer.unref()
    }
    child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()))
    // 'close', not 'exit': 'exit' fires when the process ends, while the pipes may still hold
    // output - measured with a child that leaves a grandchild holding stdout, where 'exit' saw
    // "HEAD" and 'close' saw "HEAD\nTAIL". A plain fast-exiting child drains first (30 runs at
    // 4 MB, not a byte missing), so this is the correct event rather than an observed bug here.
    child.on('close', (code) => settle({ success: code === 0, output }))
    child.on('error', (err) => settle({ success: false, output: String(err) }))
  })
}
