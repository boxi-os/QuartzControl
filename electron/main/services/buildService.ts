import { spawn, type ChildProcess } from 'child_process'
import treeKill from 'tree-kill'
import { EventEmitter } from 'events'
import type { LogLine, ServerOptions, ServerStatus, BuildResult } from '@shared/ipc-contract'

interface RunningServer {
  process: ChildProcess
  status: ServerStatus
}

const runningServers = new Map<string, RunningServer>()
export const serverEvents = new EventEmitter()

const DEFAULT_OPTIONS: ServerOptions = { port: 8080, wsPort: 3001, host: 'localhost', watch: true }

function emitLog(projectId: string, stream: 'stdout' | 'stderr', text: string): void {
  serverEvents.emit('log', { projectId, stream, text, timestamp: new Date().toISOString() } satisfies LogLine)
}

function emitStatus(projectId: string): void {
  serverEvents.emit('status', projectId, getServerStatus(projectId))
}

export function getServerStatus(projectId: string): ServerStatus {
  return runningServers.get(projectId)?.status ?? { state: 'stopped' }
}

export async function startServer(
  projectId: string,
  projectPath: string,
  options: ServerOptions = DEFAULT_OPTIONS
): Promise<ServerStatus> {
  const existing = runningServers.get(projectId)
  if (existing) return existing.status

  const args = ['quartz', 'build', '--serve', '--port', String(options.port), '--wsPort', String(options.wsPort)]
  if (options.host) args.push('--remoteDevHost', options.host)
  if (options.watch) args.push('--watch')

  const child = spawn('npx', args, {
    cwd: projectPath,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe']
  })
  const status: ServerStatus = { state: 'starting', options, pid: child.pid, startedAt: new Date().toISOString() }
  runningServers.set(projectId, { process: child, status })
  emitStatus(projectId)

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
  child.on('exit', (code) => {
    const running = runningServers.get(projectId)
    runningServers.delete(projectId)
    if (running && running.status.state !== 'stopping') {
      running.status = { state: 'error', error: `Prozess beendet mit Code ${code}` }
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
    treeKill(running.process.pid!, 'SIGTERM', (err) => {
      if (err) rejectPromise(err)
      else resolvePromise()
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

export function runBuild(projectId: string, projectPath: string): Promise<BuildResult> {
  const start = Date.now()
  return new Promise((resolvePromise) => {
    const child = spawn('npx', ['quartz', 'build'], {
      cwd: projectPath,
      shell: process.platform === 'win32',
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
    child.on('exit', (code) => resolvePromise({ success: code === 0, durationMs: Date.now() - start, exitCode: code }))
  })
}

export function killAllServers(): void {
  for (const running of runningServers.values()) {
    if (running.process.pid) treeKill(running.process.pid)
  }
  runningServers.clear()
}
