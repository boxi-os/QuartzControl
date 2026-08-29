import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { readJsonFileOr, writeJsonFile } from './jsonStore'

// Tracks PIDs of dev servers this app has spawned, surviving an app restart, so an orphaned
// server left behind by a hard kill (Ctrl+C in a `npm run dev` terminal, a crash, force-quit -
// none of which give killAllServers() in buildService a chance to run) can be found and cleaned
// up the next time the app starts. Not meant to reflect "this project's server should still be
// running" - there is no such intent across restarts, only leftovers to sweep up.
export interface TrackedServer {
  pid: number
  port: number
  startedAt: string
}

function storePath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'running-servers.json')
}

async function readAll(): Promise<Record<string, TrackedServer>> {
  return readJsonFileOr<Record<string, TrackedServer>>(storePath(), {})
}

async function writeAll(entries: Record<string, TrackedServer>): Promise<void> {
  await writeJsonFile(storePath(), entries)
}

export async function record(projectId: string, server: TrackedServer): Promise<void> {
  const entries = await readAll()
  entries[projectId] = server
  await writeAll(entries)
}

export async function remove(projectId: string): Promise<void> {
  const entries = await readAll()
  if (!(projectId in entries)) return
  delete entries[projectId]
  await writeAll(entries)
}

export async function takeAll(): Promise<Record<string, TrackedServer>> {
  const entries = await readAll()
  await writeAll({})
  return entries
}
