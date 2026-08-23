import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import type { Settings } from '@shared/ipc-contract'

// The GitHub token is a credential (a PAT with `repo` scope is at least as sensitive as the FTP
// passwords secretsService.ts already protects), so it is encrypted at rest via safeStorage
// instead of sitting in plaintext in a mode-0644 file in the user's profile. Same Electron 33.x
// sync encryptString/decryptString API secretsService.ts documents.
interface StoredSettings extends Omit<Settings, 'githubToken'> {
  // Written by versions before the token was encrypted. Read once, then dropped on the next save.
  githubToken?: string
  githubTokenEncrypted?: string // base64 of safeStorage.encryptString() output
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

function decryptToken(stored: StoredSettings): string | undefined {
  // A legacy plaintext token still works so an existing install doesn't silently lose it; the
  // next saveSettings() re-writes it encrypted and removes the plaintext key.
  if (!stored.githubTokenEncrypted) return stored.githubToken
  if (!safeStorage.isEncryptionAvailable()) return undefined
  try {
    return safeStorage.decryptString(Buffer.from(stored.githubTokenEncrypted, 'base64'))
  } catch {
    return undefined
  }
}

export async function getSettings(): Promise<Settings> {
  const stored = await readStored()
  const { githubToken: _legacy, githubTokenEncrypted: _encrypted, ...rest } = stored
  return { ...rest, githubToken: decryptToken(stored) }
}

export async function saveSettings(settings: Settings): Promise<void> {
  const { githubToken, ...rest } = settings

  // Refuse rather than fall back to plaintext: silently writing an unencrypted credential would
  // defeat the point, and silently dropping it would leave the user thinking it was saved.
  if (githubToken && !safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'Der GitHub-Token kann nicht sicher gespeichert werden, weil der Schlüsselbund des Systems nicht verfügbar ist.'
    )
  }

  const stored: StoredSettings = {
    ...rest,
    githubTokenEncrypted: githubToken ? safeStorage.encryptString(githubToken).toString('base64') : undefined
  }
  await writeFile(settingsPath(), JSON.stringify(stored, null, 2), 'utf-8')
}
