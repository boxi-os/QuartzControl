import { spawn, execFileSync, type ChildProcess } from 'child_process'
import treeKill from 'tree-kill'
import { EventEmitter } from 'events'
import type { LogLine, ServerOptions, ServerStatus, BuildResult } from '@shared/ipc-contract'
import { needsShell } from './runCommand'
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
const DEFAULT_OPTIONS: ServerOptions = { port: 8080, wsPort: 3001, host: '', watch: true }

function emitLog(projectId: string, stream: 'stdout' | 'stderr', text: string): void {
  serverEvents.emit('log', { projectId, stream, text, timestamp: new Date().toISOString() } satisfies LogLine)
}

function emitStatus(projectId: string): void {
  serverEvents.emit('status', projectId, getServerStatus(projectId))
}

export function getServerStatus(projectId: string): ServerStatus {
  return runningServers.get(projectId)?.status ?? lastTerminalStatus.get(projectId) ?? { state: 'stopped' }
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
  if (options.watch) args.push('--watch')

  const child = spawn('npx', args, {
    cwd: projectPath,
    shell: needsShell('npx'),
    stdio: ['ignore', 'pipe', 'pipe']
  })
  const status: ServerStatus = { state: 'starting', options, pid: child.pid, startedAt: new Date().toISOString() }
  runningServers.set(projectId, { process: child, status })
  emitStatus(projectId)
  if (child.pid) void runningServersStore.record(projectId, { pid: child.pid, port: options.port, startedAt: status.startedAt! })

  let markedRunning = false
  child.stdout?.on('data', (chunk: Buffer) => {
    emitLog(projectId, 'stdout', chunk.toString())
    if (!markedRunning) {
      markedRunning = true
      status.state = 'running'
      emitStatus(projectId)
    }
  })
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
      lastTerminalStatus.set(projectId, { state: 'error', error: `Prozess beendet mit Code ${code}` })
    } else {
      lastTerminalStatus.delete(projectId)
    }
    emitStatus(projectId)
  })

  return status
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
    child.on('exit', (code) => resolvePromise({ success: code === 0, durationMs: Date.now() - start, exitCode: code }))
  })
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
  for (const { pid } of servers) treeKill(pid)
}
