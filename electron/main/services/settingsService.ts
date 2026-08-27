import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { Settings } from '@shared/ipc-contract'

// No credentials here any more. The GitHub token used to live in this file (encrypted), which meant
// two credential stores with two migration paths and a token the renderer had to relay back to main
// on every marketplace call. It is now one connection among the others in connectionsService.ts,
// which migrates whatever this file still holds on its first read and strips it from here.
interface StoredSettings extends Settings {
  // Only ever read, by connectionsService's migration; never written by this service again.
  githubToken?: string
  githubTokenEncrypted?: string
}

function settingsPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'settings.json')
}

async function readStored(): Promise<StoredSettings> {
  try {
    return JSON.parse(await readFile(settingsPath(), 'utf-8')) as StoredSettings
  } catch {
    return {}
  }
}

export async function getSettings(): Promise<Settings> {
  const { githubToken: _legacy, githubTokenEncrypted: _encrypted, ...rest } = await readStored()
  return rest
}

export async function saveSettings(settings: Settings): Promise<void> {
  // Read-modify-write rather than a plain overwrite: a token still awaiting migration (the user
  // can reach Settings before ever opening the marketplace) must survive a save from here.
  const stored = await readStored()
  const next: StoredSettings = { ...settings }
  if (stored.githubToken) next.githubToken = stored.githubToken
  if (stored.githubTokenEncrypted) next.githubTokenEncrypted = stored.githubTokenEncrypted
  await writeFile(settingsPath(), JSON.stringify(next, null, 2), 'utf-8')
}
