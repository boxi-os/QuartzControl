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

// The environment for a git call whose *text* the app reads - explainGitFailure in updateService,
// and getGitStatus telling "not a git repository" from every other failure. git translates three of
// the four sentences matched there - its po/de.po (v2.53.0) has "Could not reset index file to
// revision '%s'." as "Konnte Index-Datei nicht zu Commit '%s' setzen.", likewise "Your local
// changes ... would be overwritten by merge" and "You have not concluded your merge (MERGE_HEAD
// exists)" - and no spawn of this app pinned the language. With the system's git on a German Linux
// desktop (Debian ships git.mo) the app's sentence would silently go missing, and with it the
// announcement. "Entry '%s' not uptodate. Cannot merge." is not in the catalogue, but its prefix
// is: "error: " becomes "Fehler: ", and the pattern that takes the file name out of that line
// (`^error: Entry`) missed it - the sentence came without the name.
//
// LC_MESSAGES and nothing wider, so that names and encodings stay the user's; LANGUAGE emptied,
// because gettext asks it before LC_MESSAGES; and an LC_ALL the user has set moves to LC_CTYPE,
// because it would override both. Only for these calls: everywhere else git's text is only shown
// and may stay in the user's language. Here it is read *and* shown, so a user with a German git
// reads English git text in the box of these two calls - the price, taken knowingly.
//
// Measured (thirty-second review, finding 6) with git 2.53.0 built with translations against GNU
// libintl on macOS, old state against new, "would be overwritten" and the refused abort: under
// LANG=de the old state showed git's German text and no sentence of the app's; the new one had the
// sentence under LANG=de, LC_ALL=de, LANGUAGE=de:en and all three at once. Not measured: glibc,
// where an empty LC_ALL is read as unset - by the documentation it behaves the same.
export function gitTextEnv(): Record<string, string> {
  const all = process.env.LC_ALL
  return { LC_MESSAGES: 'C', LANGUAGE: '', ...(all ? { LC_ALL: '', LC_CTYPE: all } : {}) }
}
