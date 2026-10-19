import { existsSync } from 'fs'
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join, posix, relative, sep } from 'path'
import type { FormsCheckResult, FormsKeyImport, FormsKeyReport, PluginSource, PublishTarget, RelayConflict, RelayLastUpload, RelaySettings, RelayState, RelayUploadResult } from '@shared/ipc-contract'
import * as connectionsService from './connectionsService'
import { runDirectoryUpload } from './deploy'
import { readJsonFile, writeJsonFile } from './jsonStore'
import { quartzGuiDir, quartzGuiPath } from './projectDirs'
import { getTarget, listTargets, saveTarget } from './publishTargetsService'
import { pluginPackageDir } from './pluginSchemaService'
import { runCommand } from './runCommand'
import { writableTarget } from './templatePackage/shared'
import { mainT } from '../i18n'

// What the Formulare tab asks quartz-forms itself, instead of copying its rules: the problems and
// hints its build would give (`check`) and what a key is (`key`). Both run the plugin's command
// line (dist/cli.js, 0.2.0 and later) in a child process under the app's Node - never in this
// process, where only sass and globby from a project may run (docs/conventions.md). A secret or a
// pasted key travels through the child's environment, never argv.
//
// "Cannot check" is an answer of its own (`unavailable`), never an empty list of problems: an older
// plugin without the command line, a missing node, output that is not the JSON asked for.

const CHECK_TIMEOUT_MS = 30_000
/** A public key is a few KiB; a file far beyond that is not one, and is not read whole. */
const MAX_KEY_FILE_BYTES = 256 * 1024
/** Where an imported key file goes, relative to the site root - outside content/ and static/, so the
 *  build reads it (keys.<name>.file) and does not publish it as a file. */
export const KEY_DIR = 'quartz-forms/keys'

function cliPath(projectPath: string, source: PluginSource): string | null {
  const dir = pluginPackageDir(projectPath, source)
  if (!dir) return null
  const cli = join(dir, 'dist', 'cli.js')
  return existsSync(cli) ? cli : null
}

async function runCli(projectPath: string, source: PluginSource, args: string[], env?: Record<string, string>): Promise<{ ok: true; json: Record<string, unknown> } | { ok: false; reason: string }> {
  const cli = cliPath(projectPath, source)
  if (!cli) return { ok: false, reason: mainT('formsNoCli') }
  const result = await runCommand('node', [cli, ...args, '--json'], projectPath, env, CHECK_TIMEOUT_MS)
  let json: Record<string, unknown>
  try {
    json = JSON.parse(result.stdout.trim().split('\n').at(-1) ?? '') as Record<string, unknown>
  } catch {
    return { ok: false, reason: mainT('formsCliOutput', { output: result.output.trim().slice(0, 400) }) }
  }
  if (json.ok !== true) return { ok: false, reason: typeof json.error === 'string' ? json.error : mainT('formsCliOutput', { output: result.output.trim().slice(0, 400) }) }
  return { ok: true, json }
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

function keyReport(v: unknown): FormsKeyReport {
  const r = v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
  return {
    name: typeof r.name === 'string' ? r.name : '',
    fingerprint: typeof r.fingerprint === 'string' ? r.fingerprint : '',
    userIds: strings(r.userIds),
    ...(typeof r.expires === 'string' ? { expires: r.expires } : {}),
    ...(typeof r.problem === 'string' ? { problem: r.problem } : {})
  }
}

/** The plugin's own verdict on the options as they stand in quartz.config.yaml. */
export async function check(projectPath: string, source: PluginSource): Promise<FormsCheckResult> {
  const r = await runCli(projectPath, source, ['check', '--site', projectPath])
  if (!r.ok) return { state: 'unavailable', reason: r.reason }
  return {
    state: 'checked',
    problems: strings(r.json.problems),
    hints: strings(r.json.hints),
    keys: Array.isArray(r.json.keys) ? r.json.keys.map(keyReport) : []
  }
}

/** What a pasted key is, and the public key block alone to store (never the text around it). */
export async function inspectKey(projectPath: string, source: PluginSource, armored: string): Promise<{ key: FormsKeyReport; armored?: string } | { unavailable: string }> {
  const r = await runCli(projectPath, source, ['key'], { QF_KEY_ARMORED: armored })
  if (!r.ok) return { unavailable: r.reason }
  return { key: keyReport(r.json.key), ...(typeof r.json.armored === 'string' ? { armored: r.json.armored } : {}) }
}

/**
 * Copies a key file into the project under quartz-forms/keys/<name>.asc. A file that holds a
 * private key block is refused before anything is written: it would land in the project, its
 * snapshots and its repository (quartz-forms 0.1.2 learned the same lesson for the page itself).
 * An existing file is not overwritten unless asked.
 */
export async function importKeyFile(projectPath: string, sourcePath: string, name: string, overwrite: boolean): Promise<FormsKeyImport> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(name)) throw new Error(mainT('formsKeyName'))
  const info = await stat(sourcePath)
  if (!info.isFile()) throw new Error(mainT('formsKeyNotAFile'))
  if (info.size > MAX_KEY_FILE_BYTES) throw new Error(mainT('formsKeyTooLarge'))
  const text = await readFile(sourcePath, 'utf-8')
  if (/-----BEGIN PGP PRIVATE KEY BLOCK-----/.test(text)) throw new Error(mainT('formsKeyPrivate'))
  if (!/-----BEGIN PGP PUBLIC KEY BLOCK-----/.test(text)) throw new Error(mainT('formsKeyNoPublic'))
  const dir = join(projectPath, ...KEY_DIR.split('/'))
  await mkdir(dir, { recursive: true })
  const target = await writableTarget(dir, `${name}.asc`)
  if (!target) throw new Error(mainT('formsKeyName'))
  const rel = relative(projectPath, target).split(sep).join('/')
  if (existsSync(target) && !overwrite) return { exists: rel }
  const temp = `${target}.tmp-${process.pid}`
  await writeFile(temp, text, 'utf-8')
  await rename(temp, target)
  return { file: rel }
}

// ── the relay: settings, state, upload, export ──────────────────────────────────────────────────
//
// What is not secret lives with the project in .quartz-gui/forms-relay.json (the target, the
// directory below it, sender, origins, mailer, counter directory, and what was last uploaded); what
// is secret lives encrypted in connectionsService, keyed by project id. The relay itself is
// written by quartz-forms (`dist/cli.js relay`) into a temporary directory, with the owner's values
// in the child's environment, uploaded through the target's adapter (deploy.runDirectoryUpload),
// and removed at every exit - a plain-text config.php never stays in the project.

const RELAY_FILE = 'forms-relay.json'

const DEFAULT_RELAY: RelaySettings = {
  subdir: 'forms',
  from: '',
  allowedOrigins: [],
  subjectPrefix: '',
  mailer: 'mail',
  sendmailPath: '/usr/sbin/sendmail -t -i',
  counterDir: ''
}

interface RelayFile {
  settings?: Partial<RelaySettings>
  lastUpload?: RelayLastUpload
}

async function readRelayFile(projectPath: string): Promise<RelayFile> {
  const read = await readJsonFile<RelayFile>(quartzGuiPath(projectPath, RELAY_FILE))
  return read.kind === 'ok' && read.value && typeof read.value === 'object' ? read.value : {}
}

async function writeRelayFile(projectPath: string, file: RelayFile): Promise<void> {
  await writeJsonFile(join(quartzGuiDir(projectPath), RELAY_FILE), file)
}

export async function saveRelaySettings(projectPath: string, settings: RelaySettings): Promise<void> {
  const file = await readRelayFile(projectPath)
  await writeRelayFile(projectPath, { ...file, settings })
}

/** Where a relay upload lands, as one string: a change of it means the remote has not seen this relay. */
function locationOf(target: PublishTarget, subdir: string): string {
  const d = target.destination
  const where = d.type === 'folder' ? d.path : 'remotePath' in d ? d.remotePath : ''
  return `${d.type}|${target.connectionId ?? ''}|${where}|${subdir}`
}

/**
 * A site target that would delete the relay: rsync with "delete removed files" on the same
 * connection, with the relay's directory inside its remote path and not in its excludes. sftp, ftp
 * and folder delete only what their own manifest says they sent, which the relay's files never are
 * (runDirectoryUpload keeps a manifest of its own); rsync's --delete removes whatever the build
 * does not have, unless it is excluded.
 */
async function rsyncConflict(projectPath: string, relayTarget: PublishTarget, subdir: string): Promise<RelayConflict | null> {
  const d = relayTarget.destination
  if (d.type !== 'sftp') return null
  const relayRemote = posix.join(d.remotePath, subdir)
  for (const site of await listTargets(projectPath)) {
    const s = site.destination
    if (s.type !== 'sftp' || s.transfer !== 'rsync' || !s.deleteRemoved || site.connectionId !== relayTarget.connectionId) continue
    const rel = posix.relative(s.remotePath, relayRemote)
    if (rel === '' || rel.startsWith('..') || posix.isAbsolute(rel)) continue
    if (site.excludes.includes(rel) || site.excludes.includes(`${rel}/`)) continue
    return { targetId: site.id, targetName: site.name, exclude: rel }
  }
  return null
}

async function runRelayCli(projectPath: string, source: PluginSource, outDir: string, operator?: Record<string, unknown>, skipPatternCheck = false): Promise<{ ok: true; json: Record<string, unknown> } | { ok: false; reason: string; json?: Record<string, unknown> }> {
  const cli = cliPath(projectPath, source)
  if (!cli) return { ok: false, reason: mainT('formsNoCli') }
  const args = [cli, 'relay', '--site', projectPath, '--out', outDir, ...(skipPatternCheck ? ['--skip-pattern-check'] : []), '--json']
  const result = await runCommand('node', args, projectPath, operator ? { QF_RELAY_OPERATOR: JSON.stringify(operator) } : undefined, CHECK_TIMEOUT_MS)
  let json: Record<string, unknown>
  try {
    json = JSON.parse(result.stdout.trim().split('\n').at(-1) ?? '') as Record<string, unknown>
  } catch {
    return { ok: false, reason: mainT('formsCliOutput', { output: result.output.trim().slice(0, 400) }) }
  }
  if (json.ok !== true) {
    // The error of a refusal over problems lists them already (resolveOrThrow's sentence).
    const problems = strings(json.problems)
    const reason = problems.length
      ? problems.map((p) => `- ${p}`).join('\n')
      : [typeof json.error === 'string' ? json.error : '', ...strings(json.warnings)].filter(Boolean).join('\n')
    return { ok: false, reason, json }
  }
  return { ok: true, json }
}

async function withTempDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'qc-relay-'))
  try {
    return await run(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export async function relayState(projectId: string, projectPath: string, source: PluginSource): Promise<RelayState> {
  const file = await readRelayFile(projectPath)
  const settings: RelaySettings = { ...DEFAULT_RELAY, ...(file.settings ?? {}) }
  const info = await connectionsService.getRelaySecretInfo(projectId)
  const targets = (await listTargets(projectPath))
    .filter((t) => t.destination.type === 'sftp' || t.destination.type === 'ftp' || t.destination.type === 'folder')
    .map((t) => ({ id: t.id, name: t.name, type: t.destination.type, where: t.destination.type === 'folder' ? t.destination.path : 'remotePath' in t.destination ? t.destination.remotePath : '' }))
  const target = settings.targetId ? await getTarget(projectPath, settings.targetId) : null
  const conflict = target ? await rsyncConflict(projectPath, target, settings.subdir) : null
  // What the relay would be told now - the hash covers the forms' rules, not the dated header.
  const generated = await withTempDir((dir) => runRelayCli(projectPath, source, dir, undefined, true))
  return {
    settings,
    lastUpload: file.lastUpload ?? null,
    secrets: { stored: info.stored, recipients: info.recipients, captchaSecret: info.captchaSecret, captchaSecrets: info.captchaSecrets, storageAvailable: info.storage.available },
    targets,
    conflict,
    ...(generated.ok
      ? { currentHash: typeof generated.json.hash === 'string' ? generated.json.hash : null, siteOrigin: typeof generated.json.siteOrigin === 'string' ? generated.json.siteOrigin : null, relayForms: strings(generated.json.forms), recipientNames: strings(generated.json.recipients) }
      : { currentHash: null, siteOrigin: null, relayForms: [], recipientNames: [], hashProblem: generated.reason }),
    ...(target && file.lastUpload ? { moved: file.lastUpload.location !== locationOf(target, settings.subdir) } : {})
  }
}

function operatorOf(settings: RelaySettings, secrets: connectionsService.RelaySecrets): Record<string, unknown> {
  return {
    secret: secrets.secret,
    allowedOrigins: settings.allowedOrigins,
    from: settings.from,
    subjectPrefix: settings.subjectPrefix,
    ...(secrets.captchaSecret ? { captchaSecret: secrets.captchaSecret } : {}),
    ...(secrets.captchaSecrets ? { captchaSecrets: secrets.captchaSecrets } : {}),
    mailer: settings.mailer === 'sendmail' ? { sendmail: settings.sendmailPath } : 'mail',
    recipients: secrets.recipients,
    ...(settings.counterDir.trim() ? { counterDir: settings.counterDir.trim() } : {})
  }
}

/** Secrets for the relay: the stored ones, or a first set with only a fresh signing secret. */
async function secretsFor(projectId: string): Promise<connectionsService.RelaySecrets> {
  const stored = await connectionsService.getRelaySecrets(projectId)
  if (stored) return stored
  await connectionsService.saveRelaySecrets(projectId, {})
  return (await connectionsService.getRelaySecrets(projectId)) as connectionsService.RelaySecrets
}

export async function relayUpload(projectId: string, projectPath: string, source: PluginSource, fresh: boolean): Promise<RelayUploadResult> {
  const file = await readRelayFile(projectPath)
  const settings: RelaySettings = { ...DEFAULT_RELAY, ...(file.settings ?? {}) }
  if (!settings.targetId) return { success: false, output: mainT('relayNoTarget') }
  const target = await getTarget(projectPath, settings.targetId)
  if (!target) return { success: false, output: mainT('deployTargetMissing', { id: settings.targetId }) }
  const conflict = await rsyncConflict(projectPath, target, settings.subdir)
  if (conflict) return { success: false, output: mainT('relayRsyncConflict', { target: conflict.targetName, path: conflict.exclude }) }
  const secrets = await secretsFor(projectId)
  return withTempDir(async (dir) => {
    const generated = await runRelayCli(projectPath, source, dir, operatorOf(settings, secrets))
    if (!generated.ok) return { success: false, output: generated.reason }
    const missing = strings(generated.json.missingRecipients)
    if (missing.length) return { success: false, output: mainT('relayMissingRecipients', { names: missing.join(', ') }) }
    const location = locationOf(target, settings.subdir)
    const result = await runDirectoryUpload(projectPath, target.id, dir, settings.subdir, `relay-${target.id}`, fresh || file.lastUpload?.location !== location)
    if (result.success && typeof generated.json.hash === 'string') {
      await writeRelayFile(projectPath, { ...file, lastUpload: { at: new Date().toISOString(), hash: generated.json.hash, targetId: target.id, location } })
    }
    const warnings = strings(generated.json.warnings)
    return { ...result, output: [...warnings, result.output].filter(Boolean).join('\n') }
  })
}

/**
 * The whole relay into a folder the user chose, config.php included - with the stored secrets
 * when there are any, else with the example's placeholders (a system that cannot keep secrets
 * still gets a relay to finish by hand).
 */
export async function relayExport(projectId: string, projectPath: string, source: PluginSource, dir: string): Promise<RelayUploadResult> {
  const file = await readRelayFile(projectPath)
  const settings: RelaySettings = { ...DEFAULT_RELAY, ...(file.settings ?? {}) }
  const stored = connectionsService.getSecretStorageInfo().available ? await secretsFor(projectId) : null
  const usable = stored && settings.from.trim()
  const generated = await runRelayCli(projectPath, source, dir, usable ? operatorOf(settings, stored) : undefined)
  if (!generated.ok) return { success: false, output: generated.reason }
  const written = strings(generated.json.written).map((f) => `→ ${f}`)
  return { success: true, output: [...strings(generated.json.warnings), ...written, usable ? '' : mainT('relayExportPlaceholders')].filter(Boolean).join('\n') }
}

/** Adds the relay's directory to a site target's excludes, so its rsync --delete leaves it alone. */
export async function excludeFromSite(projectPath: string, targetId: string, path: string): Promise<void> {
  const target = await getTarget(projectPath, targetId)
  if (!target) throw new Error(mainT('deployTargetMissing', { id: targetId }))
  if (target.excludes.includes(path)) return
  await saveTarget(projectPath, { id: target.id, name: target.name, connectionId: target.connectionId, destination: target.destination, excludes: [...target.excludes, path] })
}
