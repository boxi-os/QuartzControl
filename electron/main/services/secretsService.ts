import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { DeployConnectionProfile, SaveDeployConnectionInput } from '@shared/ipc-contract'

// Kept in Electron's userData (like settingsService.ts), never inside the project - these are
// machine-local credentials, and must never risk ending up committed into the project's own git
// repo. The secret itself is encrypted at rest via safeStorage (OS keychain-backed: Keychain on
// macOS, DPAPI on Windows, libsecret on Linux) - the same treatment settingsService.ts gives the
// GitHub token.
//
// This project's pinned Electron version (33.x) only ships the sync encryptString/decryptString
// API - verified directly against node_modules/electron/electron.d.ts, since Electron's current
// docs (main branch) now recommend the newer async encryptStringAsync/decryptStringAsync instead
// (supports key rotation, non-blocking) but that API doesn't exist in this installed version.
interface StoredProfile {
  id: string
  projectPath: string
  name: string
  protocol: 'sftp' | 'ftp'
  host: string
  port: number
  username: string
  remotePath: string
  authMethod: 'password' | 'privateKey'
  secure?: boolean
  encryptedSecret?: string // base64 of safeStorage.encryptString() output
  // Not a secret (a host's public-key fingerprint is public by nature), so it is stored in the
  // clear alongside the profile - it only has to be *tamper-evident within this file*, which is
  // the same protection every other field here gets.
  hostKeyFingerprint?: string
}

function secretsPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'deploy-secrets.json')
}

async function readAll(): Promise<StoredProfile[]> {
  try {
    return JSON.parse(await readFile(secretsPath(), 'utf-8')) as StoredProfile[]
  } catch {
    return []
  }
}

async function writeAll(profiles: StoredProfile[]): Promise<void> {
  await writeFile(secretsPath(), JSON.stringify(profiles, null, 2), 'utf-8')
}

function toPublic(p: StoredProfile): DeployConnectionProfile {
  return {
    id: p.id,
    projectPath: p.projectPath,
    name: p.name,
    protocol: p.protocol,
    host: p.host,
    port: p.port,
    username: p.username,
    remotePath: p.remotePath,
    authMethod: p.authMethod,
    secure: p.secure,
    hasSecret: !!p.encryptedSecret,
    hostKeyFingerprint: p.hostKeyFingerprint
  }
}

export async function listConnections(projectPath: string): Promise<DeployConnectionProfile[]> {
  const all = await readAll()
  return all.filter((p) => p.projectPath === projectPath).map(toPublic)
}

export async function saveConnection(input: SaveDeployConnectionInput): Promise<DeployConnectionProfile> {
  const all = await readAll()
  const index = input.id ? all.findIndex((p) => p.id === input.id) : -1
  const existing = index !== -1 ? all[index] : undefined

  const encryptedSecret =
    input.secret !== undefined
      ? safeStorage.isEncryptionAvailable()
        ? safeStorage.encryptString(input.secret).toString('base64')
        : undefined
      : existing?.encryptedSecret

  const stored: StoredProfile = {
    id: existing?.id ?? randomUUID(),
    projectPath: input.projectPath,
    name: input.name,
    protocol: input.protocol,
    host: input.host,
    port: input.port,
    username: input.username,
    remotePath: input.remotePath,
    authMethod: input.authMethod,
    secure: input.secure,
    encryptedSecret,
    // Carried over on edit: changing a password doesn't change which server we trust.
    hostKeyFingerprint: existing?.hostKeyFingerprint
  }

  if (index !== -1) all[index] = stored
  else all.push(stored)
  await writeAll(all)
  return toPublic(stored)
}

export async function deleteConnection(id: string): Promise<void> {
  const all = await readAll()
  await writeAll(all.filter((p) => p.id !== id))
}

// Main-process only - never sent to the renderer. Returns null if no secret is stored or
// decryption is unavailable (e.g. OS keychain locked/inaccessible).
export async function getDecryptedSecret(id: string): Promise<string | null> {
  const all = await readAll()
  const profile = all.find((p) => p.id === id)
  if (!profile?.encryptedSecret) return null
  if (!safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(Buffer.from(profile.encryptedSecret, 'base64'))
  } catch {
    return null
  }
}

// Recorded the first time the user confirms a server's key (see deployService's hostVerifier).
export async function rememberHostKey(id: string, fingerprint: string): Promise<void> {
  const all = await readAll()
  const profile = all.find((p) => p.id === id)
  if (!profile) return
  profile.hostKeyFingerprint = fingerprint
  await writeAll(all)
}

// The deliberate opt-out for a server that legitimately changed keys - the next connection then
// prompts again instead of being refused. Only ever reached through an explicit UI action.
export async function forgetHostKey(id: string): Promise<void> {
  const all = await readAll()
  const profile = all.find((p) => p.id === id)
  if (!profile?.hostKeyFingerprint) return
  delete profile.hostKeyFingerprint
  await writeAll(all)
}

export async function getConnection(id: string): Promise<DeployConnectionProfile | null> {
  const all = await readAll()
  const profile = all.find((p) => p.id === id)
  return profile ? toPublic(profile) : null
}
