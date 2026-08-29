import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { AppInfo, Settings } from '@shared/ipc-contract'
import { themeDocsCacheStats } from './styleSettingsSchemaService'
import { listQuarantinedFiles, readJsonFileOr, writeJsonFile } from './jsonStore'

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
  return readJsonFileOr<StoredSettings>(settingsPath(), {})
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
  await writeJsonFile(settingsPath(), next)
}

// What the Settings page's maintenance section reports: which build this is, and where the app
// keeps the two things that are not inside a project - the connection store (encrypted secrets)
// and the permanent theme-docs cache.
export async function getAppInfo(): Promise<AppInfo> {
  return {
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    userDataPath: app.getPath('userData'),
    themeDocsCache: await themeDocsCacheStats(),
    unreadableStores: listQuarantinedFiles().map(({ path, quarantinedAs }) => ({ path, quarantinedAs }))
  }
}
