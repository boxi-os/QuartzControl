import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { readFile, rename, writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type {
  Connection,
  PinnedHostKey,
  SaveConnectionInput,
  SecretStorageInfo,
  SshAuthMethod
} from '@shared/ipc-contract'

// The single credential store. Before the connection/target split there were two - per-project
// SFTP profiles in deploy-secrets.json and the GitHub token inside settings.json - which meant two
// places to look, two encryption call sites, and a token the renderer had to relay back to main on
// every marketplace call. Both are migrated in on first read (see migrate() below).
//
// Secrets are encrypted at rest via Electron's safeStorage (OS keychain-backed: Keychain on macOS,
// DPAPI on Windows, libsecret on Linux) and never leave the main process. This project's pinned
// Electron version (33.x) only ships the sync encryptString/decryptString API - the newer async
// variants Electron's current docs recommend don't exist in it.
interface StoredConnection {
  id: string
  kind: 'ssh' | 'ftp' | 'github' | 'webhook'
  name: string
  host?: string
  port?: number
  username?: string
  authMethod?: SshAuthMethod
  keyPath?: string
  secure?: boolean
  login?: string
  encryptedSecret?: string // base64 of safeStorage.encryptString() output
  // Not a secret - a host's public key is public by nature - so it sits in the clear next to the
  // rest, which is the same protection every other field in this file gets.
  hostKey?: PinnedHostKey
}

function storePath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'connections.json')
}

function legacySecretsPath(): string {
  return join(app.getPath('userData'), 'deploy-secrets.json')
}

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

// Whether a secret written here is actually protected - which is not the same question on every
// platform. On Linux without a running keyring (gnome-keyring, kwallet) Electron falls back to the
// `basic_text` backend, which encrypts with a hardcoded key and still reports
// isEncryptionAvailable() === true. Every check in this file trusts that flag, so an SFTP password
// or the GitHub token would land in connections.json effectively in the clear with nothing saying
// so. The rest of this app is careful to distinguish "cannot check" from "fine" (see
// styleService's `unavailable` and updateService's 'unknown'); this is the same distinction for
// secrets, and the user is the only one who can fix it.
export function getSecretStorageInfo(): SecretStorageInfo {
  const available = safeStorage.isEncryptionAvailable()
  // getSelectedStorageBackend() only exists on Linux; elsewhere the backend is the OS keychain
  // and there is nothing to choose or to warn about.
  const backend = process.platform === 'linux' ? safeStorage.getSelectedStorageBackend() : null
  return { available, backend, secure: available && backend !== 'basic_text' }
}

function encrypt(secret: string): string | undefined {
  // An empty secret is not a secret. encryptString('') still produces bytes on some platforms, and
  // storing those would make hasSecret true for a credential that is not there - a row reading
  // "password stored" next to a connection that cannot log in anywhere.
  if (!secret || !safeStorage.isEncryptionAvailable()) return undefined
  return safeStorage.encryptString(secret).toString('base64')
}

function decrypt(encrypted?: string): string | null {
  if (!encrypted || !safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------------------------
// Migration
//
// Runs once, on the first read that finds no connections.json. Deliberately non-destructive on the
// project side: the old profiles carried a remotePath, which is target-shaped rather than
// connection-shaped, so migrateLegacyProfiles() hands those back to the caller instead of writing
// them - publishTargetsService picks them up per project, since only it knows where a project's
// .quartz-gui/ is.
// ---------------------------------------------------------------------------------------------

export interface LegacyProfileTarget {
  projectPath: string
  connectionId: string
  name: string
  protocol: 'sftp' | 'ftp'
  remotePath: string
}

interface LegacyProfile {
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
  encryptedSecret?: string
  hostKeyFingerprint?: string
}

// Staged on disk rather than held in memory, because the targets span every project the old file
// knew about and they are claimed one project at a time - whenever that project is next opened,
// possibly several app restarts later. An in-memory hand-off would drop every project but the
// first one opened after the migration.
function legacyTargetsPath(): string {
  return join(app.getPath('userData'), 'legacy-publish-targets.json')
}

async function migrate(): Promise<{ connections: StoredConnection[]; targets: LegacyProfileTarget[] }> {
  const connections: StoredConnection[] = []
  const targets: LegacyProfileTarget[] = []

  let profiles: LegacyProfile[] = []
  try {
    profiles = JSON.parse(await readFile(legacySecretsPath(), 'utf-8')) as LegacyProfile[]
  } catch {
    profiles = []
  }

  for (const profile of profiles) {
    // The connection id is kept, not regenerated: the deploy manifest and the remembered target
    // selection are both keyed by it, so reusing it makes the migration invisible to the user.
    connections.push({
      id: profile.id,
      kind: profile.protocol === 'sftp' ? 'ssh' : 'ftp',
      name: profile.name,
      host: profile.host,
      port: profile.port,
      username: profile.username,
      // A pre-split 'privateKey' profile stored the key *contents*, which is exactly what
      // 'privateKey' without a keyPath still means - so this carries over unchanged.
      authMethod: profile.protocol === 'sftp' ? profile.authMethod : undefined,
      secure: profile.protocol === 'ftp' ? profile.secure : undefined,
      encryptedSecret: profile.encryptedSecret,
      // Only the fingerprint survived the old format. The raw key blob cannot be derived from it,
      // so the pin stays fingerprint-only until the next SFTP connection records the blob too -
      // which means an rsync target on a migrated connection asks for confirmation once more.
      hostKey: profile.hostKeyFingerprint
        ? { fingerprint: profile.hostKeyFingerprint, blob: '', type: '' }
        : undefined
    })
    targets.push({
      projectPath: profile.projectPath,
      connectionId: profile.id,
      name: profile.name,
      protocol: profile.protocol,
      remotePath: profile.remotePath
    })
  }

  // The GitHub token was a Settings field; it is a credential like any other and moves here.
  try {
    const settings = JSON.parse(await readFile(settingsPath(), 'utf-8')) as {
      githubToken?: string
      githubTokenEncrypted?: string
    }
    const token = settings.githubTokenEncrypted ?? (settings.githubToken ? encrypt(settings.githubToken) : undefined)
    if (token) connections.push({ id: randomUUID(), kind: 'github', name: 'GitHub', encryptedSecret: token })
    if (settings.githubToken || settings.githubTokenEncrypted) {
      const { githubToken: _p, githubTokenEncrypted: _e, ...rest } = settings
      await writeFile(settingsPath(), JSON.stringify(rest, null, 2), 'utf-8')
    }
  } catch {
    // no settings file yet, or unreadable - nothing to migrate
  }

  // Renamed rather than deleted: if anything about the migration turns out wrong, the original
  // file is still there to look at.
  if (profiles.length > 0) await rename(legacySecretsPath(), `${legacySecretsPath()}.migrated`).catch(() => {})

  if (targets.length > 0) await writeFile(legacyTargetsPath(), JSON.stringify(targets, null, 2), 'utf-8')

  return { connections, targets }
}

async function readAll(): Promise<StoredConnection[]> {
  try {
    return JSON.parse(await readFile(storePath(), 'utf-8')) as StoredConnection[]
  } catch {
    const { connections } = await migrate()
    await writeAll(connections)
    return connections
  }
}

async function writeAll(connections: StoredConnection[]): Promise<void> {
  await writeFile(storePath(), JSON.stringify(connections, null, 2), 'utf-8')
}

// Claimed one project at a time by publishTargetsService; the claimed entries are removed so a
// target the user has since deleted is not resurrected on the next open.
export async function claimLegacyTargets(projectPath: string): Promise<LegacyProfileTarget[]> {
  // Forces the migration to have run before the staging file is read.
  await readAll()
  let staged: LegacyProfileTarget[] = []
  try {
    staged = JSON.parse(await readFile(legacyTargetsPath(), 'utf-8')) as LegacyProfileTarget[]
  } catch {
    return []
  }
  const mine = staged.filter((t) => t.projectPath === projectPath)
  if (mine.length === 0) return []
  await writeFile(legacyTargetsPath(), JSON.stringify(staged.filter((t) => t.projectPath !== projectPath), null, 2), 'utf-8')
  return mine
}

function toPublic(c: StoredConnection): Connection {
  const base = { id: c.id, name: c.name, hasSecret: !!c.encryptedSecret }
  switch (c.kind) {
    case 'ssh':
      return {
        ...base,
        kind: 'ssh',
        host: c.host ?? '',
        port: c.port ?? 22,
        username: c.username ?? '',
        authMethod: c.authMethod ?? 'password',
        keyPath: c.keyPath,
        hostKey: c.hostKey
      }
    case 'ftp':
      return { ...base, kind: 'ftp', host: c.host ?? '', port: c.port ?? 21, username: c.username ?? '', secure: !!c.secure }
    case 'github':
      return { ...base, kind: 'github', login: c.login }
    case 'webhook':
      return { ...base, kind: 'webhook', displayOrigin: c.login }
  }
}

export async function listConnections(): Promise<Connection[]> {
  return (await readAll()).map(toPublic)
}

export async function getConnection(id: string): Promise<Connection | null> {
  const found = (await readAll()).find((c) => c.id === id)
  return found ? toPublic(found) : null
}

export async function saveConnection(input: SaveConnectionInput): Promise<Connection> {
  const all = await readAll()
  const index = input.id ? all.findIndex((c) => c.id === input.id) : -1
  const existing = index !== -1 ? all[index] : undefined

  // Refuse rather than fall back to plaintext: silently writing an unencrypted credential defeats
  // the point, and silently dropping it would leave the user thinking it was saved.
  if (input.secret && !safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'Die Zugangsdaten können nicht sicher gespeichert werden, weil der Schlüsselbund des Systems nicht verfügbar ist.'
    )
  }

  // Changing the auth method invalidates whatever was stored for the previous one - a password is
  // not a key - and is the one case where an emptied field must not be read as "unchanged".
  const authMethodChanged =
    input.kind === 'ssh' && existing?.kind === 'ssh' && existing.authMethod !== input.authMethod

  // An empty field on an edit means "leave the stored secret alone", which is exactly what the
  // form's placeholder promises. Measured before this: clicking into the password field of a saved
  // SFTP connection, typing and deleting again wrote an empty secret over the stored one - the row
  // then read "kein Passwort/Key" and the credential was gone, with nothing having asked.
  const keepStoredSecret = input.secret === undefined || (input.secret === '' && !!existing && !authMethodChanged)

  const stored: StoredConnection = {
    id: existing?.id ?? randomUUID(),
    kind: input.kind,
    name: input.name,
    encryptedSecret: keepStoredSecret ? existing?.encryptedSecret : encrypt(input.secret as string),
    // Carried over on edit: changing a password does not change which server we trust.
    hostKey: existing?.hostKey
  }

  if (input.kind === 'ssh') {
    stored.host = input.host
    stored.port = input.port
    stored.username = input.username
    stored.authMethod = input.authMethod
    stored.keyPath = input.keyPath
    // A key read from a file is never copied into the store; a pasted one has no path.
    if (input.authMethod === 'agent' || input.keyPath) stored.encryptedSecret = input.secret ? encrypt(input.secret) : undefined
  } else if (input.kind === 'ftp') {
    stored.host = input.host
    stored.port = input.port
    stored.username = input.username
    stored.secure = input.secure
  } else if (input.kind === 'github') {
    stored.login = input.login
  } else if (input.kind === 'webhook') {
    // Only the origin is kept for display - the path carries the token part of a build-hook URL.
    try {
      stored.login = !keepStoredSecret && input.secret ? new URL(input.secret).origin : existing?.login
    } catch {
      stored.login = existing?.login
    }
  }

  if (index !== -1) all[index] = stored
  else all.push(stored)
  await writeAll(all)
  return toPublic(stored)
}

export async function deleteConnection(id: string): Promise<void> {
  const all = await readAll()
  await writeAll(all.filter((c) => c.id !== id))
}

/** Main-process only - never sent to the renderer. */
export async function getSecret(id: string): Promise<string | null> {
  const found = (await readAll()).find((c) => c.id === id)
  return found ? decrypt(found.encryptedSecret) : null
}

/** The GitHub token, resolved in main rather than relayed through the renderer on every call. */
export async function getGithubToken(): Promise<string | undefined> {
  const github = (await readAll()).find((c) => c.kind === 'github' && c.encryptedSecret)
  return (github ? decrypt(github.encryptedSecret) : null) ?? undefined
}

export async function rememberHostKey(id: string, hostKey: PinnedHostKey): Promise<void> {
  const all = await readAll()
  const connection = all.find((c) => c.id === id)
  if (!connection) return
  connection.hostKey = hostKey
  await writeAll(all)
}

/** The deliberate opt-out for a server that legitimately changed keys. */
export async function forgetHostKey(id: string): Promise<void> {
  const all = await readAll()
  const connection = all.find((c) => c.id === id)
  if (!connection?.hostKey) return
  delete connection.hostKey
  await writeAll(all)
}
