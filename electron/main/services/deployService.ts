import { dialog } from 'electron'
import { createHash } from 'crypto'
import { EventEmitter } from 'events'
import { readFile, readdir, stat, writeFile } from 'fs/promises'
import { join, relative, posix } from 'path'
import SftpClient from 'ssh2-sftp-client'
import { Client as FtpClient } from 'basic-ftp'
import type { DeployConnectionProfile, DeployDiffEntry, DeployProgressEvent, DeployResult } from '@shared/ipc-contract'
import * as secretsService from './secretsService'
import { quartzGuiDir } from './projectDirs'

export const deployEvents = new EventEmitter()

// Path relative to the build directory -> sha256 hex digest. Stored per-project (not per-target,
// since the same build output is likely deployed to more than one target) - a target-specific
// "what's already live there" concept would need probing the remote on every diff, which none of
// SFTP/FTP/GitHub Pages make cheap; this manifest instead tracks "what we last deployed from here"
// which is the only diff Quartz-GUI itself can know without a remote round-trip.
function manifestPath(projectPath: string): string {
  return join(quartzGuiDir(projectPath), 'deploy-manifest.json')
}

type Manifest = Record<string, string>

async function readManifest(projectPath: string): Promise<Manifest> {
  try {
    return JSON.parse(await readFile(manifestPath(projectPath), 'utf-8')) as Manifest
  } catch {
    return {}
  }
}

async function writeManifest(projectPath: string, manifest: Manifest): Promise<void> {
  await writeFile(manifestPath(projectPath), JSON.stringify(manifest, null, 2), 'utf-8')
}

async function walkFiles(dir: string, base = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const results: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) results.push(...(await walkFiles(full, base)))
    else results.push(relative(base, full))
  }
  return results
}

async function hashFile(path: string): Promise<string> {
  const content = await readFile(path)
  return createHash('sha256').update(content).digest('hex')
}

async function buildCurrentManifest(buildDir: string): Promise<Manifest> {
  const files = await walkFiles(buildDir)
  const manifest: Manifest = {}
  await Promise.all(
    files.map(async (relPath) => {
      manifest[relPath.split('\\').join('/')] = await hashFile(join(buildDir, relPath))
    })
  )
  return manifest
}

// `quartz build`'s own default output dir is "public" (verified against quartz/cli/args.js's
// BuildArgv) - resolved here rather than in the renderer so callers only ever pass a project path
// and stay OS-path-separator-agnostic.
function resolveBuildDir(projectPath: string, outputDir?: string): string {
  return join(projectPath, outputDir || 'public')
}

export async function diffBuildOutput(projectPath: string, outputDir?: string): Promise<DeployDiffEntry[]> {
  const buildDir = resolveBuildDir(projectPath, outputDir)
  const previous = await readManifest(projectPath)
  const current = await buildCurrentManifest(buildDir)
  const entries: DeployDiffEntry[] = []
  for (const [path, hash] of Object.entries(current)) {
    if (!(path in previous)) entries.push({ path, status: 'added' })
    else if (previous[path] !== hash) entries.push({ path, status: 'changed' })
  }
  for (const path of Object.keys(previous)) {
    if (!(path in current)) entries.push({ path, status: 'removed' })
  }
  return entries.sort((a, b) => a.path.localeCompare(b.path))
}

async function commitManifest(projectPath: string, buildDir: string, excludePaths: string[]): Promise<void> {
  const current = await buildCurrentManifest(buildDir)
  const excluded = new Set(excludePaths)
  const previous = await readManifest(projectPath)
  const next: Manifest = {}
  for (const [path, hash] of Object.entries(current)) {
    // an excluded file was never actually uploaded/deleted this run, so its manifest entry must
    // reflect that: carry over its previous entry unchanged, or - if it has none (new file,
    // excluded on its very first appearance) - omit it entirely rather than falling through to
    // the current hash, which would wrongly mark a never-uploaded file as up to date.
    if (excluded.has(path)) {
      if (path in previous) next[path] = previous[path]
      continue
    }
    next[path] = hash
  }
  // a removed-but-excluded file was never actually deleted remotely either, so it must be carried
  // forward too - the loop above only ever visits paths still present in `current`, so a file
  // that no longer exists locally would otherwise vanish from the manifest outright, and the next
  // diff would forget it was ever deployed at all instead of continuing to offer its removal.
  for (const path of Object.keys(previous)) {
    if (!(path in current) && excluded.has(path)) next[path] = previous[path]
  }
  await writeManifest(projectPath, next)
}

function emitProgress(connectionId: string, processed: number, total: number, currentFile?: string): void {
  const event: DeployProgressEvent = { connectionId, processed, total, currentFile }
  deployEvents.emit('progress', event)
}

// OpenSSH's fingerprint format: base64 of the SHA-256 over the raw public-key blob, unpadded.
// Same bytes `ssh-keygen -lf` hashes, so this string can be compared 1:1 against what the user
// sees from ssh-keyscan or in their known_hosts.
export function fingerprintOf(hostKey: Buffer): string {
  return `SHA256:${createHash('sha256').update(hostKey).digest('base64').replace(/=+$/, '')}`
}

// Without a hostVerifier, ssh2 accepts ANY host key - verified in its own source
// (lib/protocol/kex.js: "Host accepted by default (no verification)"), which makes the connection
// trivially interceptable. This is trust-on-first-use, the same model OpenSSH and GUI clients like
// FileZilla use: ask once, showing the fingerprint, then pin it.
//
// A later mismatch is refused outright rather than re-prompting. A "the key changed, continue?"
// dialog is exactly the moment a user clicks through, and a changed key is either a rebuilt server
// or an active interception - the two cases are indistinguishable from here. Clearing the pin
// (deploy.forgetHostKey, an explicit button) is the way back, taken deliberately and not under
// pressure mid-deploy.
export function makeHostVerifier(profile: DeployConnectionProfile, onRejected: (message: string) => void) {
  return (hostKey: Buffer, accept: (ok: boolean) => void): void => {
    const fingerprint = fingerprintOf(hostKey)

    if (profile.hostKeyFingerprint) {
      if (profile.hostKeyFingerprint === fingerprint) return accept(true)
      onRejected(
        `Der Host-Key von ${profile.host} hat sich geändert!\n\n` +
          `erwartet:  ${profile.hostKeyFingerprint}\n` +
          `empfangen: ${fingerprint}\n\n` +
          'Die Verbindung wurde abgebrochen. Das kann ein neu aufgesetzter Server sein - oder ein ' +
          'Angriff. Prüfe den Fingerprint beim Anbieter und setze ihn erst danach über ' +
          '"Host-Key vergessen" zurück.'
      )
      return accept(false)
    }

    void dialog
      .showMessageBox({
        type: 'warning',
        buttons: ['Verbinden und merken', 'Abbrechen'],
        defaultId: 1,
        cancelId: 1,
        title: 'Unbekannter Server',
        message: `${profile.host} ist zum ersten Mal kontaktiert worden.`,
        detail:
          `Fingerprint des Servers:\n${fingerprint}\n\n` +
          'Vergleiche ihn mit dem, den dein Anbieter angibt (oder mit `ssh-keyscan -t rsa,ed25519 ' +
          `${profile.host} | ssh-keygen -lf -\`). Nur bei Übereinstimmung verbinden.`
      })
      .then(async ({ response }) => {
        if (response !== 0) {
          onRejected('Verbindung abgebrochen - der Host-Key wurde nicht bestätigt.')
          return accept(false)
        }
        await secretsService.rememberHostKey(profile.id, fingerprint)
        accept(true)
      })
  }
}

async function deployViaSftp(
  profile: DeployConnectionProfile,
  secret: string | null,
  buildDir: string,
  toUpload: string[],
  toDelete: string[]
): Promise<DeployResult> {
  const client = new SftpClient()
  let output = ''
  // ssh2 surfaces a rejected host key as a generic "All configured authentication methods
  // failed"-style error, which would hide the real reason - so the verifier records it here and
  // the catch below prefers this message.
  let hostKeyRejection: string | null = null
  try {
    await client.connect({
      host: profile.host,
      port: profile.port,
      username: profile.username,
      hostVerifier: makeHostVerifier(profile, (message) => (hostKeyRejection = message)),
      ...(profile.authMethod === 'privateKey' ? { privateKey: secret ?? undefined } : { password: secret ?? undefined })
    })

    const total = toUpload.length + toDelete.length
    let processed = 0
    const ensuredDirs = new Set<string>()

    for (const relPath of toUpload) {
      const remotePath = posix.join(profile.remotePath, relPath)
      const remoteDir = posix.dirname(remotePath)
      if (!ensuredDirs.has(remoteDir)) {
        await client.mkdir(remoteDir, true)
        ensuredDirs.add(remoteDir)
      }
      await client.put(join(buildDir, relPath), remotePath)
      processed++
      emitProgress(profile.id, processed, total, relPath)
      output += `↑ ${relPath}\n`
    }

    for (const relPath of toDelete) {
      const remotePath = posix.join(profile.remotePath, relPath)
      try {
        await client.delete(remotePath)
      } catch {
        // already absent remotely - not an error for our purposes
      }
      processed++
      emitProgress(profile.id, processed, total, relPath)
      output += `✗ ${relPath}\n`
    }

    return { success: true, output }
  } catch (err) {
    // the host-key message explains what actually happened; ssh2's own error does not
    return { success: false, output: `${output}\n${hostKeyRejection ?? String(err)}` }
  } finally {
    client.end().catch(() => {})
  }
}

async function deployViaFtp(
  profile: DeployConnectionProfile,
  secret: string | null,
  buildDir: string,
  toUpload: string[],
  toDelete: string[]
): Promise<DeployResult> {
  const client = new FtpClient()
  let output = ''
  try {
    await client.access({
      host: profile.host,
      port: profile.port,
      user: profile.username,
      password: secret ?? undefined,
      secure: profile.secure ?? false
    })

    const total = toUpload.length + toDelete.length
    let processed = 0
    const ensuredDirs = new Set<string>()

    for (const relPath of toUpload) {
      const remotePath = posix.join(profile.remotePath, relPath)
      const remoteDir = posix.dirname(remotePath)
      if (!ensuredDirs.has(remoteDir)) {
        await client.ensureDir(remoteDir)
        await client.cd('/')
        ensuredDirs.add(remoteDir)
      }
      await client.uploadFrom(join(buildDir, relPath), remotePath)
      processed++
      emitProgress(profile.id, processed, total, relPath)
      output += `↑ ${relPath}\n`
    }

    for (const relPath of toDelete) {
      const remotePath = posix.join(profile.remotePath, relPath)
      try {
        await client.remove(remotePath)
      } catch {
        // already absent remotely
      }
      processed++
      emitProgress(profile.id, processed, total, relPath)
      output += `✗ ${relPath}\n`
    }

    return { success: true, output }
  } catch (err) {
    return { success: false, output: `${output}\n${String(err)}` }
  } finally {
    client.close()
  }
}

export async function runDeploy(profileId: string, outputDir: string | undefined, excludePaths: string[]): Promise<DeployResult> {
  const profile = await secretsService.getConnection(profileId)
  if (!profile) return { success: false, output: `Kein Verbindungsprofil mit ID ${profileId} gefunden.` }
  const secret = await secretsService.getDecryptedSecret(profileId)
  const buildDir = resolveBuildDir(profile.projectPath, outputDir)

  const diff = await diffBuildOutput(profile.projectPath, outputDir)
  const excluded = new Set(excludePaths)
  const toUpload = diff.filter((e) => e.status !== 'removed' && !excluded.has(e.path)).map((e) => e.path)
  const toDelete = diff.filter((e) => e.status === 'removed' && !excluded.has(e.path)).map((e) => e.path)

  const result =
    profile.protocol === 'sftp'
      ? await deployViaSftp(profile, secret, buildDir, toUpload, toDelete)
      : await deployViaFtp(profile, secret, buildDir, toUpload, toDelete)

  if (result.success) await commitManifest(profile.projectPath, buildDir, excludePaths)
  return result
}
