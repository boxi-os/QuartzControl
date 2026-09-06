import { spawn, execFileSync, type ChildProcess } from 'child_process'
import { createConnection } from 'net'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import treeKill from 'tree-kill'
import { EventEmitter } from 'events'
import type { BuildOutputInfo, LogLine, ServerOptions, ServerStatus, BuildResult } from '@shared/ipc-contract'
import { needsShell } from './runCommand'
import { looksLikeQuartzBuild } from './buildOutputGuard'
import { resolveBuildDir } from './projectDirs'
import * as runningServersStore from './runningServersStore'

interface RunningServer {
  process: ChildProcess
  status: ServerStatus
}

const runningServers = new Map<string, RunningServer>()
// Why a second map: runningServers only ever holds *live* processes, and both the exit and error
// handlers below have to remove their entry so a restart isn't blocked by a stale one. Writing the
// failure into that just-deleted entry's `status` object loses it - getServerStatus would fall
// straight through to "stopped", so a dev server that died on its own looked cleanly stopped in
// the UI and its exit code was never shown. Terminal states therefore outlive the entry here.
const lastTerminalStatus = new Map<string, ServerStatus>()
export const serverEvents = new EventEmitter()

// host is Quartz's --remoteDevHost, not a bind address - leave it empty locally, see BuildServer.tsx
const DEFAULT_OPTIONS: ServerOptions = { port: 8080, wsPort: 3001, host: '' }

function emitLog(projectId: string, stream: 'stdout' | 'stderr', text: string): void {
  serverEvents.emit('log', { projectId, stream, text, timestamp: new Date().toISOString() } satisfies LogLine)
}

function emitStatus(projectId: string): void {
  serverEvents.emit('status', projectId, getServerStatus(projectId))
}

export function getServerStatus(projectId: string): ServerStatus {
  return runningServers.get(projectId)?.status ?? lastTerminalStatus.get(projectId) ?? { state: 'stopped' }
}

// What is running right now, for the question at quit: project and port, which is what the
// dialog names. Kept next to ownedServerPids() because both answer "what does this app own".
export function runningServerSummaries(): { projectId: string; port: number }[] {
  return [...runningServers.entries()].map(([projectId, { status }]) => ({
    projectId,
    port: status.options?.port ?? DEFAULT_OPTIONS.port
  }))
}

// pid -> projectId for the servers this app has running right now, so serverDiscovery can tell
// its own from a stranger's. The pid is the one this app spawned (npx), which is also the root of
// the process group a scan finds - the child below it is npx's, not a second server.
export function ownedServerPids(): Map<number, string> {
  const owned = new Map<number, string>()
  for (const [projectId, { process: child }] of runningServers) {
    if (child.pid) owned.set(child.pid, projectId)
  }
  return owned
}

export async function startServer(
  projectId: string,
  projectPath: string,
  options: ServerOptions = DEFAULT_OPTIONS
): Promise<ServerStatus> {
  const existing = runningServers.get(projectId)
  if (existing) return existing.status
  // a fresh attempt supersedes whatever the previous run ended as
  lastTerminalStatus.delete(projectId)

  const args = ['quartz', 'build', '--serve', '--port', String(options.port), '--wsPort', String(options.wsPort)]
  if (options.host) args.push('--remoteDevHost', options.host)
  // No --watch: `quartz build --serve` sets argv.watch itself (quartz/cli/handlers.js), so passing
  // it is at best redundant and offering it as a switch was a control that could not be honoured.

  const child = spawn('npx', args, {
    cwd: projectPath,
    shell: needsShell('npx'),
    stdio: ['ignore', 'pipe', 'pipe']
  })
  const status: ServerStatus = { state: 'starting', options, pid: child.pid, startedAt: new Date().toISOString() }
  runningServers.set(projectId, { process: child, status })
  emitStatus(projectId)
  if (child.pid) void runningServersStore.record(projectId, { pid: child.pid, port: options.port, startedAt: status.startedAt! })

  // "running" has to mean there is something to open at that URL. Quartz prints its first line
  // (the version banner) while it is still *building*, a second or more before the http server
  // listens - marking the state on that line made every consumer of it wrong for that window: the
  // Übersicht's link led nowhere, and the live-preview iframe mounted into a connection refusal and
  // stayed blank (reproduced in the running app). Probing the port answers the question directly
  // and, unlike matching the "Started a Quartz server" line, does not depend on its wording.
  waitForPort(options.port, () => {
    if (runningServers.get(projectId)?.status !== status || status.state !== 'starting') return
    status.state = 'running'
    emitStatus(projectId)
  })
  child.stdout?.on('data', (chunk: Buffer) => emitLog(projectId, 'stdout', chunk.toString()))
  child.stderr?.on('data', (chunk: Buffer) => emitLog(projectId, 'stderr', chunk.toString()))
  // Without this listener a failed spawn (e.g. npx missing from PATH) makes the ChildProcess
  // emit an unhandled 'error', which EventEmitter rethrows and takes the whole main process
  // down - and 'exit' never fires, so the status would otherwise stay stuck on "starting".
  child.on('error', (err) => {
    emitLog(projectId, 'stderr', `${err.message}\n`)
    runningServers.delete(projectId)
    void runningServersStore.remove(projectId)
    lastTerminalStatus.set(projectId, { state: 'error', error: err.message })
    emitStatus(projectId)
  })
  child.on('exit', (code) => {
    const running = runningServers.get(projectId)
    const wasStopping = running?.status.state === 'stopping'
    runningServers.delete(projectId)
    void runningServersStore.remove(projectId)
    // an explicit stop ends as "stopped"; anything else means the process died on its own
    if (running && !wasStopping) {
      // The code, not a sentence about it: the renderer owns every user-facing text, and this
      // one is shown on two pages in whichever language the user picked.
      lastTerminalStatus.set(projectId, { state: 'error', exitCode: code })
    } else {
      lastTerminalStatus.delete(projectId)
    }
    emitStatus(projectId)
  })

  return status
}

// Retries a TCP connect to 127.0.0.1:<port> until it succeeds or the deadline passes, then calls
// back once. 127.0.0.1 regardless of --remoteDevHost: that flag only rewrites the live-reload
// websocket URL handed to the browser, the server itself always binds locally. Giving up silently
// is deliberate - a server that never listens ends in the 'exit' handler, which reports the real
// failure; guessing one here would only replace it with a worse message.
const PORT_PROBE_TIMEOUT_MS = 120_000

function waitForPort(port: number, onOpen: () => void): void {
  const deadline = Date.now() + PORT_PROBE_TIMEOUT_MS
  const attempt = (): void => {
    let settled = false
    const socket = createConnection({ port, host: '127.0.0.1' })
    const retry = (): void => {
      if (settled) return
      settled = true
      socket.destroy()
      if (Date.now() < deadline) setTimeout(attempt, 250)
    }
    socket.setTimeout(1000)
    socket.once('connect', () => {
      if (settled) return
      settled = true
      socket.destroy()
      onOpen()
    })
    socket.once('error', retry)
    socket.once('timeout', retry)
  }
  attempt()
}

export function stopServer(projectId: string): Promise<void> {
  const running = runningServers.get(projectId)
  if (!running || !running.process.pid) return Promise.resolve()
  running.status.state = 'stopping'
  emitStatus(projectId)
  return new Promise((resolvePromise, rejectPromise) => {
    // Wait for the process's actual 'exit' event, not just for the kill signal to be sent -
    // startServer() no-ops if an entry for this projectId is still in runningServers, and that
    // entry is only removed by the 'exit' handler registered in startServer(). Resolving as soon
    // as treeKill's callback fires (i.e. signal delivered) raced ahead of that removal, so a
    // restart's startServer() call would see the still-"stopping" entry and return it unchanged
    // instead of spawning a new process.
    running.process.once('exit', () => resolvePromise())
    treeKill(running.process.pid!, 'SIGTERM', (err) => {
      if (err) rejectPromise(err)
    })
  })
}

export async function restartServer(
  projectId: string,
  projectPath: string,
  options?: ServerOptions
): Promise<ServerStatus> {
  const previousOptions = runningServers.get(projectId)?.status.options ?? options ?? DEFAULT_OPTIONS
  await stopServer(projectId)
  return startServer(projectId, projectPath, previousOptions)
}

export function runBuild(projectId: string, projectPath: string, outputDir?: string): Promise<BuildResult> {
  const start = Date.now()
  const args = ['quartz', 'build']
  if (outputDir) args.push('--output', outputDir)
  return new Promise((resolvePromise) => {
    const child = spawn('npx', args, {
      cwd: projectPath,
      shell: needsShell('npx'),
      stdio: ['ignore', 'pipe', 'pipe']
    })
    child.stdout?.on('data', (chunk: Buffer) =>
      serverEvents.emit('buildLog', {
        projectId,
        stream: 'stdout',
        text: chunk.toString(),
        timestamp: new Date().toISOString()
      } satisfies LogLine)
    )
    child.stderr?.on('data', (chunk: Buffer) =>
      serverEvents.emit('buildLog', {
        projectId,
        stream: 'stderr',
        text: chunk.toString(),
        timestamp: new Date().toISOString()
      } satisfies LogLine)
    )
    // Same reasoning as startServer's handler: an unhandled 'error' crashes the main process,
    // and without it this promise would never settle, leaving the caller's UI stuck on "building".
    child.on('error', (err) => {
      serverEvents.emit('buildLog', {
        projectId,
        stream: 'stderr',
        text: `${err.message}\n`,
        timestamp: new Date().toISOString()
      } satisfies LogLine)
      resolvePromise({ success: false, durationMs: Date.now() - start, exitCode: null })
    })
    // 'close' rather than 'exit', so "Build fertig" cannot be reported while the last lines of
    // the output - which on a failure are the error itself - are still in the pipe.
    child.on('close', (code) => resolvePromise({ success: code === 0, durationMs: Date.now() - start, exitCode: code }))
  })
}

// What is currently lying in the output directory - the only honest answer to "when was this site
// last built", since nothing records a build anywhere. Read from the files themselves: the newest
// mtime in the tree, plus how many files and how much they weigh.
//
// Why the newest mtime and not the directory's own: a directory's mtime only moves when an entry
// is added or removed, so rebuilding a site whose file list did not change would report the age of
// the *first* build. Symlinks are counted but not followed - a build never emits one, and
// following would let a link out of the tree distort both numbers.
export async function getBuildOutput(projectPath: string, outputDir?: string): Promise<BuildOutputInfo> {
  const dir = resolveBuildDir(projectPath, outputDir)
  const empty: BuildOutputInfo = { dir, exists: false, fileCount: 0, sizeBytes: 0, looksLikeBuild: false }
  try {
    if (!(await stat(dir)).isDirectory()) return empty
  } catch {
    return empty
  }

  let fileCount = 0
  let sizeBytes = 0
  let newest = 0

  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
        continue
      }
      try {
        const info = await stat(full)
        fileCount++
        sizeBytes += info.size
        if (info.mtimeMs > newest) newest = info.mtimeMs
      } catch {
        // a file that vanished between readdir and stat - a build running right now
      }
    }
  }
  await walk(dir)

  return {
    dir,
    exists: fileCount > 0,
    builtAt: newest > 0 ? new Date(newest).toISOString() : undefined,
    fileCount,
    sizeBytes,
    looksLikeBuild: await looksLikeQuartzBuild(dir)
  }
}

export function killAllServers(): void {
  for (const running of runningServers.values()) {
    if (running.process.pid) treeKill(running.process.pid)
  }
  runningServers.clear()
}

function isAlive(pid: number): boolean {
  try {
    // signal 0 sends nothing, just checks whether the process exists and is killable by us
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function looksLikeQuartzServer(pid: number): boolean {
  if (process.platform === 'win32') return true // best effort: no cheap command-line check here
  try {
    // execFileSync, not execSync with a template string: `pid` is read back from a JSON file in
    // userData, so interpolating it into a shell command line made a tampered file enough to run
    // arbitrary commands. Passing argv directly means there is no shell to interpret anything.
    const output = execFileSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf-8' })
    // What this actually reads, measured with a running server under the embedded runtime
    // (nodeRuntime.ts): "npm exec quartz build --serve --port 8080 --wsPort 3001". The tracked pid
    // is npx's, and npm rewrites its own process title, so both needles are matched by the
    // *arguments* this app passed - not by a path that happens to contain them. The child doing
    // the listening is one level below and carries the Electron binary's path instead; treeKill
    // in killOrphanedServers covers it, which is why the parent is the right thing to track.
    // The app's own process cannot match either needle: its path says "QuartzControl", capital Q.
    return output.includes('quartz') && output.includes('--serve')
  } catch {
    return false
  }
}

export interface OrphanedServer {
  projectId: string
  pid: number
  port: number
}

// Finds dev servers left running by a previous, non-graceful app exit (killAllServers() above
// only runs on a clean quit - a hard kill of the whole process tree, e.g. Ctrl+C in the terminal
// running `npm run dev`, never gives it the chance to run). Only reports a tracked PID as
// orphaned if it's both alive and still actually looks like one of our spawned
// `quartz ... --serve` processes, since PIDs can be reused by the OS across a restart. Does NOT
// kill anything itself - the user may have deliberately left it running (e.g. to keep previewing
// a site after force-quitting the GUI), so the caller should ask before calling killOrphanedServers.
// Clears the tracking store regardless of what the caller ends up doing, so a server the user
// chooses to leave running isn't asked about again on the next launch.
export async function detectOrphanedServers(): Promise<OrphanedServer[]> {
  const entries = await runningServersStore.takeAll()
  return Object.entries(entries)
    .filter(([, { pid }]) => isAlive(pid) && looksLikeQuartzServer(pid))
    .map(([projectId, { pid, port }]) => ({ projectId, pid, port }))
}

export function killOrphanedServers(servers: OrphanedServer[]): void {
  for (const { pid } of servers) {
    // Callback *and* try/catch, neither of them ceremony: tree-kill rethrows anything but ESRCH
    // from process.kill - EPERM, for instance, which is what a recycled pid now owned by someone
    // else's process gives - and without a callback it throws out of the 'close' handler of the
    // `ps` it spawned, where nothing can catch it. This runs during startup, so an uncaught throw
    // there took the whole app down before the window existed.
    try {
      treeKill(pid, undefined, (err) => {
        if (err) console.error(`[main] could not kill orphaned server ${pid}:`, err)
      })
    } catch (error) {
      console.error(`[main] could not kill orphaned server ${pid}:`, error)
    }
  }
}
