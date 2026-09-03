import type { LogHistory, LogLine } from '@shared/ipc-contract'

// The same cap the renderer's store uses, per project and per stream rather than globally: one busy
// project's build output must not push another project's server log out.
const MAX_LINES = 999

// In memory only, exactly like the renderer's store - this is not a log file, it is the answer to
// "what did the server say while no window was open". On macOS a closed window leaves the app (and
// every dev server it started) running, and the next window gets a fresh renderer with an empty
// store; without this buffer that output is gone. Cleared when the app quits, which is also when
// before-quit kills the servers.
const buffers = new Map<string, LogHistory>()

function bufferFor(projectId: string): LogHistory {
  const existing = buffers.get(projectId)
  if (existing) return existing
  const created: LogHistory = { server: [], build: [] }
  buffers.set(projectId, created)
  return created
}

export function recordLogLine(stream: 'server' | 'build', line: LogLine): void {
  const buffer = bufferFor(line.projectId)
  const lines = buffer[stream]
  lines.push(line)
  if (lines.length > MAX_LINES) lines.splice(0, lines.length - MAX_LINES)
}

export function logHistory(projectId: string): LogHistory {
  const buffer = buffers.get(projectId)
  // Copies, not the live arrays: what goes over IPC is structured-cloned anyway, and handing out
  // the array this module keeps appending to would be a trap the moment something reads it twice.
  return { server: [...(buffer?.server ?? [])], build: [...(buffer?.build ?? [])] }
}

export function clearLogHistory(projectId: string, stream: 'server' | 'build'): void {
  bufferFor(projectId)[stream] = []
}
