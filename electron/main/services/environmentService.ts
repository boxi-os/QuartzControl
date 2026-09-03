import { execFileSync } from 'child_process'
import { accessSync, constants, existsSync, statSync } from 'fs'
import { homedir } from 'os'
import { delimiter, join } from 'path'
import type { EnvironmentInfo, SecretStorageInfo, ToolInfo } from '@shared/ipc-contract'

// Every external command this app runs - `npx quartz`, `npm install`, `git` - is looked up on
// PATH. That works in development, where the app is started from a terminal and inherits the
// shell's PATH, and fails in the one place it matters: a packaged app started from the Dock,
// Finder or a desktop launcher, which on macOS inherits launchd's PATH
// (/usr/bin:/bin:/usr/sbin:/sbin) and on Linux whatever the session manager exports. Developer
// tools are almost never in either - Homebrew puts them in /opt/homebrew/bin, MacPorts in
// /opt/local/bin - so every build, every plugin install and every project creation would fail
// with ENOENT, while the same app started from a terminal works perfectly. That difference is
// invisible during development, which is why this exists.
//
// Since node and npm travel with the app (nodeRuntime.ts), the tool this search is *for* is git,
// and git is what decides whether it has to keep looking. It used to be node: with the embedded
// runtime on PATH that test now always succeeds, so the search would stop before it ever reached
// the directory holding git and a packaged app launched from the Dock would find no git at all.
//
// The fix runs once at startup and patches process.env.PATH, so every existing spawn keeps
// working unchanged rather than each caller having to thread an environment through.

export interface ResolvedPath {
  source: 'inherited' | 'login-shell' | 'probed'
  /** Directories added to PATH beyond what the process inherited. */
  added: string[]
}

let resolved: ResolvedPath | null = null

function pathEntries(): string[] {
  return (process.env.PATH ?? '').split(delimiter).filter(Boolean)
}

// Windows needs the PATHEXT dance; the two platforms this ships for do not. Kept name-based so a
// later Windows pass has one place to change.
function isExecutableFile(path: string): boolean {
  try {
    if (!statSync(path).isFile()) return false
    accessSync(path, constants.X_OK)
    return true
  } catch {
    return false
  }
}

/** Absolute path of `name` on the current PATH, or null. The equivalent of `command -v`. */
export function findExecutable(name: string): string | null {
  for (const dir of pathEntries()) {
    const candidate = join(dir, name)
    if (isExecutableFile(candidate)) return candidate
  }
  return null
}

// Asking the user's own login shell is the only approach that finds a version manager's shims,
// because those are not in a fixed location - nvm's directory carries the version number, and
// asdf/mise resolve per project. `-ilc` makes it an interactive login shell so ~/.zprofile and
// ~/.zshrc are both read, which is where those managers install themselves. The marker is needed
// because an interactive shell prints greetings, version notices and whatever else the user's
// dotfiles echo; the timeout because a shell waiting for input would otherwise hang startup
// forever.
function pathFromLoginShell(): string[] {
  const shell = process.env.SHELL
  if (!shell || process.platform === 'win32' || !existsSync(shell)) return []
  try {
    const out = execFileSync(shell, ['-ilc', 'printf "__QC_PATH__%s\\n" "$PATH"'], {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore']
    })
    const line = out.split('\n').find((l) => l.startsWith('__QC_PATH__'))
    return line ? line.slice('__QC_PATH__'.length).split(delimiter).filter(Boolean) : []
  } catch {
    return []
  }
}

// Last resort when the login shell told us nothing (a non-interactive shell, a hung dotfile, a
// SHELL that no longer exists). Covers where the common installers actually put things. The
// version-manager shim directories stay in the list even though node no longer comes from there:
// on a machine without Xcode's command line tools, git often does (Homebrew, MacPorts, Nix).
function candidateDirs(): string[] {
  const home = homedir()
  return [
    '/opt/homebrew/bin', // Homebrew, Apple silicon
    '/usr/local/bin', // Homebrew, Intel - and the Node installer's own target
    '/opt/local/bin', // MacPorts
    '/snap/bin', // Linux, snap
    '/var/lib/flatpak/exports/bin',
    join(home, '.local/bin'),
    join(home, '.volta/bin'),
    join(home, '.asdf/shims'),
    join(home, '.local/share/mise/shims'),
    join(home, 'Library/Application Support/fnm'),
    join(home, '.local/share/fnm'),
    join(home, '.bun/bin')
  ]
}

/**
 * Makes the tools this app spawns from the outside - git, and rsync where a target asks for it -
 * findable. Called once, before the window is created, so the first thing the user does already
 * works. A no-op when the inherited PATH already resolves git, which is the case for every
 * `npm run dev` - so nothing is paid for in development.
 */
export function ensureToolPath(): ResolvedPath {
  if (resolved) return resolved

  if (findExecutable('git')) {
    resolved = { source: 'inherited', added: [] }
    return resolved
  }

  const known = new Set(pathEntries())
  // `known` has to grow inside the loop, not after it: a login shell's PATH regularly lists the
  // same directory twice (~/.local/bin from two different dotfiles, in the measured case), and a
  // filter closing over a set updated afterwards would let both copies through.
  const add = (dirs: string[]): string[] => {
    const fresh: string[] = []
    for (const dir of dirs) {
      if (!dir || known.has(dir) || !existsSync(dir)) continue
      known.add(dir)
      fresh.push(dir)
    }
    if (fresh.length > 0) process.env.PATH = [...pathEntries(), ...fresh].join(delimiter)
    return fresh
  }

  const fromShell = add(pathFromLoginShell())
  if (findExecutable('git')) {
    resolved = { source: 'login-shell', added: fromShell }
    return resolved
  }

  const probed = add(candidateDirs())
  resolved = { source: findExecutable('git') ? 'probed' : 'inherited', added: [...fromShell, ...probed] }
  return resolved
}

// Presence is not the answer, running it is. /usr/bin/git exists on a macOS without the Xcode
// command line tools as a stub that pops a GUI installer instead of doing anything, so a check
// that only looked for the file would report git as available on exactly the machines where it
// is not.
function probe(name: string, versionArgs: string[], source: ToolInfo['source']): ToolInfo {
  const path = findExecutable(name)
  if (!path) return { name, source, path: null, version: null }
  try {
    const version = execFileSync(path, versionArgs, {
      encoding: 'utf-8',
      timeout: 10_000,
      stdio: ['ignore', 'pipe', 'ignore']
    })
    return { name, source, path, version: version.trim().split('\n')[0] || null }
  } catch {
    return { name, source, path, version: null }
  }
}

/**
 * What the app found, for the start screen to show. Deliberately not cached: a user who installs
 * Node because this told them to expects the answer to change without restarting the app.
 *
 * `secretStorage` is passed in rather than read here so this file keeps needing no Electron API -
 * safeStorage belongs to connectionsService, which owns every secret in the app.
 */
export function getEnvironmentInfo(secretStorage: SecretStorageInfo): EnvironmentInfo {
  const path = ensureToolPath()
  // node and npm are answered by the shims nodeRuntime.ts put at the front of PATH, so they are
  // probed the same way as before and simply report where they came from. Probing rather than
  // trusting the runtime's own numbers is deliberate: it is the shim that the app's spawns will
  // use, and a shim that cannot be executed is exactly the failure worth showing.
  const tools = [
    probe('node', ['--version'], 'embedded'),
    probe('npm', ['--version'], 'embedded'),
    probe('git', ['--version'], 'host')
  ]
  return {
    platform: process.platform,
    pathSource: path.source,
    addedPaths: path.added,
    tools,
    ok: tools.every((tool) => tool.version !== null),
    // A PATH lookup, not a probe: rsync is spawned by one adapter and is not part of what makes
    // this environment usable, so it neither runs here nor counts towards `ok`.
    rsyncAvailable: findExecutable('rsync') !== null,
    secretStorage
  }
}
