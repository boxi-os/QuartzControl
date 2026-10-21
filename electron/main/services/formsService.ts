import { createHash } from 'crypto'
import { existsSync, readFileSync, rmSync } from 'fs'
import { chmod, mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from 'fs/promises'
import { net } from 'electron'
import { isIPv4, isIPv6 } from 'net'
import { tmpdir } from 'os'
import { join, posix, relative, sep } from 'path'
import type { FormsCheckResult, FormsKeyImport, FormsTextsResult, FormsKeyReport, PluginSource, PublishTarget, RelayCheck, RelayConflict, RelayLastUpload, RelaySettings, RelayState, RelayUploadResult } from '@shared/ipc-contract'
import * as connectionsService from './connectionsService'
import { runDirectoryUpload } from './deploy'
import { readJsonFile, writeJsonFile } from './jsonStore'
import { quartzGuiDir, quartzGuiPath } from './projectDirs'
import { getTarget, listTargets, saveTarget } from './publishTargetsService'
import { isNewerVersion } from '@shared/semver'
import { pluginPackageDir } from './pluginSchemaService'
import { runCommand } from './runCommand'
import { writableTarget } from './templatePackage/shared'
import { mainLanguage, mainT } from '../i18n'

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

/**
 * `--lang` for the plugin's command line, from 0.3.0 on, which has its messages in German too; an
 * older one refuses the flag as an unknown argument, and the tab would say "konnte nicht geprüft
 * werden" for a plugin that can check. Asked of its package.json, the version Quartz loads.
 */
function langArgs(projectPath: string, source: PluginSource): string[] {
  const dir = pluginPackageDir(projectPath, source)
  try {
    const version = (JSON.parse(readFileSync(join(dir ?? '', 'package.json'), 'utf-8')) as { version?: unknown }).version
    if (typeof version === 'string' && !isNewerVersion('0.3.0', version)) return ['--lang', mainLanguage()]
  } catch {
    // No readable package.json: no flag, the messages come in English.
  }
  return []
}

async function runCli(projectPath: string, source: PluginSource, args: string[], env?: Record<string, string>): Promise<{ ok: true; json: Record<string, unknown> } | { ok: false; reason: string }> {
  const cli = cliPath(projectPath, source)
  if (!cli) return { ok: false, reason: mainT('formsNoCli') }
  const result = await runCommand('node', [cli, ...args, '--json', ...langArgs(projectPath, source)], projectPath, env, CHECK_TIMEOUT_MS)
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
    ...(typeof r.problem === 'string' ? { problem: r.problem } : {}),
    ...(typeof r.notice === 'string' ? { notice: r.notice } : {})
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

/**
 * The plugin's own wording of every text, by locale (`texts`, the command after 0.5.8): what the
 * Texte section shows beside the site's own wording. An answer without one locale of strings is
 * not the answer asked for, and says so.
 */
export async function texts(projectPath: string, source: PluginSource): Promise<FormsTextsResult> {
  const cli = cliPath(projectPath, source)
  const stamp = cli ? textsStamp(cli) : null
  const cached = cli ? textsCache.get(cli) : undefined
  if (cached && stamp && cached.stamp === stamp) return cached.result
  const result = await readTexts(projectPath, source)
  if (cli && stamp && result.state === 'read') textsCache.set(cli, { stamp, result })
  return result
}

// The wording changes only with the plugin, and each open of the Texte section asked it again in
// a child process (about 90 ms; review 2026-10-28, Nebenbei). Kept per command line and keyed by
// its content, not its mtime: npm gives every file of a package the same one. The texts live in a
// chunk that cli.js imports by a name holding the chunk's hash, so new texts are a new cli.js.
const textsCache = new Map<string, { stamp: string; result: FormsTextsResult }>()

function textsStamp(cli: string): string | null {
  try {
    return createHash('sha256').update(readFileSync(cli)).digest('hex')
  } catch {
    return null
  }
}

async function readTexts(projectPath: string, source: PluginSource): Promise<FormsTextsResult> {
  const r = await runCli(projectPath, source, ['texts'])
  if (!r.ok) return { state: 'unavailable', reason: r.reason }
  const locales: Record<string, Record<string, string>> = {}
  const raw = r.json.locales && typeof r.json.locales === 'object' ? (r.json.locales as Record<string, unknown>) : {}
  for (const [locale, entries] of Object.entries(raw)) {
    if (!entries || typeof entries !== 'object') continue
    const own = Object.entries(entries as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string')
    if (own.length) locales[locale] = Object.fromEntries(own)
  }
  if (!Object.keys(locales).length) return { state: 'unavailable', reason: mainT('formsCliOutput', { output: JSON.stringify(r.json).slice(0, 400) }) }
  return { state: 'read', locales }
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
  counterDir: '',
  configReadable: false
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
  const args = [cli, 'relay', '--site', projectPath, '--out', outDir, ...(skipPatternCheck ? ['--skip-pattern-check'] : []), '--json', ...langArgs(projectPath, source)]
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

const TEMP_PREFIX = 'qc-relay-'
const openTempDirs = new Set<string>()

async function withTempDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), TEMP_PREFIX))
  openTempDirs.add(dir)
  try {
    return await run(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
    openTempDirs.delete(dir)
  }
}

/**
 * The `finally` above runs for an exception, not for a crash, a kill or a quit in the middle of a
 * run, and the folder stayed under $TMPDIR with config.php and the relay's secret in it
 * (forty-ninth review, Niedrig 6). On quit the folders still open go (synchronously: `will-quit`
 * does not wait); at start the ones a previous run left. Only what this file names
 * (`qc-relay-*` directly in tmpdir()) and only after an hour: a relay run takes seconds, and a
 * second instance of the app may be in the middle of one.
 */
export function removeOpenRelayTempDirs(): void {
  for (const dir of openTempDirs) rmSync(dir, { recursive: true, force: true })
  openTempDirs.clear()
}

export async function sweepRelayTempDirs(now = Date.now()): Promise<string[]> {
  const removed: string[] = []
  for (const name of await readdir(tmpdir()).catch(() => [] as string[])) {
    if (!name.startsWith(TEMP_PREFIX)) continue
    const dir = join(tmpdir(), name)
    const info = await stat(dir).catch(() => null)
    if (!info?.isDirectory() || now - info.mtimeMs < 60 * 60_000) continue
    await rm(dir, { recursive: true, force: true })
    removed.push(dir)
  }
  return removed
}

export async function relayState(projectId: string, projectPath: string, source: PluginSource): Promise<RelayState> {
  const file = await readRelayFile(projectPath)
  const settings: RelaySettings = { ...DEFAULT_RELAY, ...(file.settings ?? {}) }
  const info = await connectionsService.getRelaySecretInfo(projectId)
  const targets = (await listTargets(projectPath))
    .filter((t) => t.destination.type === 'sftp' || t.destination.type === 'ftp' || t.destination.type === 'folder')
    .map((t) => ({ id: t.id, name: t.name, type: t.destination.type, where: t.destination.type === 'folder' ? t.destination.path : 'remotePath' in t.destination ? t.destination.remotePath : '', rsync: t.destination.type === 'sftp' && t.destination.transfer === 'rsync' }))
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
    ...(target && file.lastUpload ? { moved: file.lastUpload.location !== locationOf(target, settings.subdir) } : {}),
    // The switch is written at once, the mode only by the next upload (review 2026-10-29, M4).
    ...(file.lastUpload?.configReadable !== undefined && file.lastUpload.configReadable !== settings.configReadable ? { configModeChanged: true } : {}),
    ...(file.lastUpload?.operator !== undefined && file.lastUpload.operator !== operatorStamp(settings, info.fingerprint) ? { operatorChanged: true } : {})
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

/**
 * What config.php would get from the settings and the stored secrets, as one value: the settings
 * through operatorOf with the secrets left out, the secrets as their fingerprint (no decrypt, so
 * no keychain question on every visit). The status said "aktuell" after a new sender or a new
 * address, both only on the server with the next upload (review 2026-10-29, nebenbei).
 */
function operatorStamp(settings: RelaySettings, fingerprint: string | null): string {
  const open = operatorOf(settings, { secret: '', recipients: {} })
  return createHash('sha256').update(JSON.stringify([open, fingerprint])).digest('hex').slice(0, 32)
}

/** Secrets for the relay: the stored ones, or a first set with only a fresh signing secret. */
async function secretsFor(projectId: string): Promise<connectionsService.RelaySecrets> {
  const stored = await connectionsService.getRelaySecrets(projectId)
  if (stored) return stored
  await connectionsService.saveRelaySecrets(projectId, {})
  return (await connectionsService.getRelaySecrets(projectId)) as connectionsService.RelaySecrets
}

/**
 * The modes the relay is uploaded with, set on the folder quartz-forms wrote and carried by the
 * adapters (keepLocalModes). As written, the folder is mkdtemp()'s 0700 and config.php 0600: over
 * rsync the relay's folder arrived as 0700 and Apache answered 403 under mod_php and PHP-FPM
 * alike, and over SFTP everything arrived as 0666. Measured on debian-vm as a host: config.php
 * as 0600 works where PHP runs as the account (PHP-FPM, suEXEC) and stops mod_php, which runs as
 * www-data, with a 500 - hence the setting, and the check after the upload that finds it.
 */
async function setRelayModes(dir: string, configReadable: boolean): Promise<void> {
  const configMode = configReadable ? 0o644 : 0o600
  const walk = async (folder: string): Promise<void> => {
    await chmod(folder, 0o755)
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name)
      if (entry.isDirectory()) await walk(path)
      else await chmod(path, folder === dir && entry.name === 'config.php' ? configMode : 0o644)
    }
  }
  await walk(dir)
}

const CHECK_RELAY_TIMEOUT_MS = 10_000
/** The relay's answer is a line of JSON; a host's error page is a few KiB. Nothing more is read:
 *  the request stops there and is judged by what came (review 2026-10-29, N4). */
const CHECK_RELAY_MAX_BYTES = 64 * 1024

/**
 * Chromium's code alone ("net::ERR_CERT_AUTHORITY_INVALID") was the sentence (review 2026-10-29,
 * N5, and nebenbei for the rest); each code here was met through the built app, the name through
 * `--host-resolver-rules` so that no lookup left the machine. Any other code stays as it is.
 */
function unreachableReason(code: string): string {
  // Visitors' browsers refuse the same certificate, so that is said with it.
  if (/^net::ERR_CERT_/.test(code)) return mainT('relayCheckCertificate', { code })
  if (code === 'net::ERR_NAME_NOT_RESOLVED') return mainT('relayCheckNoName', { code })
  if (code === 'net::ERR_CONNECTION_REFUSED') return mainT('relayCheckRefused', { code })
  // A host that answers with ICMP unreachable (measured with an nft reject on debian-vm, which macOS
  // reports as ENETUNREACH); one that stays silent runs into CHECK_RELAY_TIMEOUT_MS instead.
  if (code === 'net::ERR_ADDRESS_UNREACHABLE') return mainT('relayCheckNoRoute', { code })
  if (code === 'net::ERR_EMPTY_RESPONSE' || code === 'net::ERR_CONNECTION_RESET') return mainT('relayCheckDropped', { code })
  if (code === 'net::ERR_SSL_PROTOCOL_ERROR') return mainT('relayCheckNoTls', { code })
  return code
}

/**
 * This machine and its network by the host's literal: loopback, private, link-local, unique-local,
 * `localhost`. A name is resolved by Chromium and not judged here. The hostname is the URL
 * parser's: it writes an IPv4-mapped address in hex ("[::ffff:127.0.0.1]" is "[::ffff:7f00:1]")
 * and keeps a final dot ("localhost."); both were followed and offered as send.php's address
 * (review 2026-10-31, N1).
 */
function localHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '')
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host)
  const mapped = hex ? [parseInt(hex[1], 16) >> 8, parseInt(hex[1], 16) & 255, parseInt(hex[2], 16) >> 8, parseInt(hex[2], 16) & 255].join('.') : undefined
  const v4 = isIPv4(host) ? host : (mapped ?? /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(host)?.[1])
  if (v4 && isIPv4(v4)) {
    const [a, b] = v4.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
  }
  return isIPv6(host) && (host === '::' || host === '::1' || /^f[cd]/.test(host) || /^fe[89ab]/.test(host))
}

/**
 * One GET through Chromium's stack (the machine's proxy and certificates, as builtinTemplateService
 * says), answering with whatever status came back. `net.request`, not `net.fetch`: fetch treats an
 * Origin that is not the URL's as a CORS request and turns every answer without
 * Access-Control-Allow-Origin into net::ERR_FAILED - and a PHP error (500) or a missing send.php
 * (404) never has one. Measured with the relay on another origin than the site, the common case:
 * fetch said ERR_FAILED for both, request said 500 and 404, and 200 for the relay's own JSON.
 */
type Answer = { status: number; body: string; redirectedTo?: string; postDropped?: number; local?: true }

function getWithOrigin(url: string, origin: string | null): Promise<Answer | { error: string }> {
  return new Promise((resolve) => {
    let done = false
    const finish = (value: Answer | { error: string }): void => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve(value)
    }
    const req = net.request({ url, method: 'GET', redirect: 'follow' })
    // A server that answered and then did not finish is not one that never answered: a body of
    // 16 KiB every 20 ms and the relay's JSON spread over 12 s both said "no answer" before.
    let status: number | null = null
    let redirectedTo: string | undefined
    // 301, 302 and 303 turn a form's POST into a GET without a body: measured in Electron's
    // Chromium from a page of the origin, a 301 to the relay arrived as GET and was answered
    // "no such form", a 308 arrived as POST (debian-vm, review 2026-10-29, nebenbei).
    let postDropped: number | undefined
    const timer = setTimeout(() => {
      req.abort()
      const seconds = CHECK_RELAY_TIMEOUT_MS / 1000
      finish({ error: status === null ? mainT('relayCheckTimeout', { seconds }) : mainT('relayCheckIncomplete', { seconds, status }) })
    }, CHECK_RELAY_TIMEOUT_MS)
    if (origin) req.setHeader('Origin', origin)
    // Followed all the same ('follow'); only where it went is noted.
    req.on('redirect', (status, _method, to) => {
      redirectedTo = to
      if (status === 301 || status === 302 || status === 303) postDropped ??= status
      // Not from a server out there into this machine or its network: a redirect from debian-vm to
      // 127.0.0.1 was followed, a service there answering like the relay was taken for one, and its
      // address was recommended for send.php (review 2026-10-30, nebenbei). The place is the answer.
      if (localHost(new URL(to).hostname) && !localHost(new URL(url).hostname)) {
        req.abort()
        finish({ status, body: '', redirectedTo, postDropped, local: true })
      }
    })
    req.on('response', (res) => {
      status = res.statusCode
      const chunks: Buffer[] = []
      let size = 0
      res.on('data', (chunk: Buffer) => {
        if (done) return
        chunks.push(chunk)
        size += chunk.length
        if (size < CHECK_RELAY_MAX_BYTES) return
        req.abort()
        finish({ status: res.statusCode, body: Buffer.concat(chunks).subarray(0, CHECK_RELAY_MAX_BYTES).toString('utf-8'), redirectedTo, postDropped })
      })
      res.on('end', () => finish({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf-8'), redirectedTo, postDropped }))
      res.on('error', (err: Error) => finish({ error: err.message }))
    })
    req.on('error', (err) => finish({ error: unreachableReason(err.message) }))
    req.end()
  })
}

/**
 * The error PHP printed into the answer where `display_errors` is on: under mod_php on debian-vm
 * (`php_flag display_errors on`, config.php 0600) the probe got 200 with "Fatal error: Uncaught
 * Error: Failed opening required '…/config.php'" and said "no relay (HTTP 200)" (review
 * 2026-10-29, nebenbei). A warning before the relay's JSON breaks the forms just as well.
 */
function phpMessage(body: string): string | null {
  // Only what PHP wrote: its HTML form (html_errors, "<b>Warning</b>:") or text with no page
  // around it. A host's 404 page with a line "Warning: Diese Seite gibt es nicht mehr …" was said
  // as a PHP error (review 2026-10-30, N7).
  if (!/<b>(?:Fatal error|Parse error|Warning|Deprecated|Notice)<\/b>:/.test(body) && /<(?:!doctype|html|body)\b/i.test(body)) return null
  const text = body.replace(/<[^>]+>/g, '')
  const line = (kinds: string): string | null =>
    new RegExp(`^\\s*(?:PHP )?(?:${kinds}):\\s+(.+?)(?:\\s+in\\s+\\/\\S+?(?: on line \\d+|:\\d+))?\\s*$`, 'm').exec(text)?.[1]?.slice(0, 300) ?? null
  return line('Fatal error|Parse error') ?? line('Warning|Deprecated|Notice')
}

/**
 * Asks the uploaded relay for a stamp (`GET ?challenge=<form>`), as a form does when its page
 * opens, so a relay that cannot run is found by the upload and not by the first visitor. The
 * origin is the site's, as the relay checks it. `generation` is the one just uploaded, when the
 * plugin has one (quartz-forms 0.5.11).
 */
async function checkRelay(url: string | undefined, origin: string | null, form: string | undefined, generation: string | undefined): Promise<RelayCheck> {
  if (!url || !/^https?:\/\//i.test(url) || !form) return { kind: 'noUrl' }
  let probe: URL
  try {
    probe = new URL(url)
  } catch {
    return { kind: 'noUrl' }
  }
  probe.searchParams.set('challenge', form)
  // From quartz-forms 0.5.13 on the relay says `counters` and `generation` only to whoever names
  // the generation (review 2026-10-30, N2); 0.5.11 and 0.5.12 say both to anyone.
  if (generation) probe.searchParams.set('generation', generation)
  const res = await getWithOrigin(probe.toString(), origin)
  if ('error' in res) return { kind: 'unreachable', url, reason: res.error }
  let json: { ok?: unknown; error?: unknown; message?: unknown; counters?: unknown; generation?: unknown; stamp?: unknown } | null
  try {
    json = JSON.parse(res.body) as { ok?: unknown; error?: unknown; message?: unknown; counters?: unknown; generation?: unknown; stamp?: unknown } | null
  } catch {
    json = null
  }
  // A redirect to another origin (http:// to https://, the common case) arrived with `Origin:
  // null`, as Chromium sends it then, and the relay's refusal ("origin") named the wrong cause
  // (review 2026-10-29, N6). A visitor's browser does the same, so the place it went is the
  // answer. A redirect within the origin keeps the Origin and is judged by what answered.
  // The place is only an address for send.php where a relay answered there: a server that sends a
  // missing send.php home or to its login had both recommended (review 2026-10-30, N1).
  const to = res.redirectedTo ? new URL(res.redirectedTo) : null
  const relayAnswered = json?.ok === true ? typeof json.stamp === 'string' : json?.ok === false && typeof json.error === 'string'
  if (to && (to.origin !== new URL(url).origin || res.postDropped) && !relayAnswered) {
    to.search = ''
    return { kind: 'redirectNoRelay', url, to: to.toString(), ...(res.local ? { local: true as const } : {}) }
  }
  if (to && to.origin !== new URL(url).origin) {
    to.search = ''
    return { kind: 'redirect', url, to: to.toString() }
  }
  // Within the origin the probe gets through, a visitor's post does not (getWithOrigin).
  if (to && res.postDropped) {
    to.search = ''
    return { kind: 'postRedirect', url, to: to.toString(), status: res.postDropped }
  }
  // An answer is not a relay that works: under mod_php (www-data) with counters/ uploaded 0755 by
  // the account, the probe said ok while a form limited to 2 an hour sent three mails of three
  // (review 2026-10-29, M1). The ticket says so from quartz-forms 0.5.11 on.
  // Nor is it the relay just uploaded: with the folder changed and the address not, the probe
  // asked the relay left at the old one and said ok (review 2026-10-29, N1). A relay without a
  // generation is older than the one uploaded, so another one too.
  // Up to quartz-forms 0.5.11 the relay itself answered the old generation for up to
  // revalidate_freq seconds, from OPcache: 3 of 6 uploads on debian-vm said so with a visitor
  // asking every 0.2 s (review 2026-10-30, M3). 0.5.12 asks OPcache first; fixed there, where the
  // relay worked with the old config too, not by asking again here.
  if (res.status === 200 && json?.ok === true && generation && json.generation !== generation) return { kind: 'otherRelay', url }
  if (res.status === 200 && json?.ok === true) return { kind: 'ok', url, ...(typeof json.counters === 'boolean' ? { counters: json.counters } : {}) }
  // `form` is one of the relay just generated, so a relay that does not know it is another one.
  if (json?.error === 'unknown_form') return { kind: 'otherRelay', url }
  if (json && typeof json.error === 'string') {
    // The server's own words, cut as phpMessage cuts PHP's: 65 065 characters of a 64 KiB answer
    // stood in the status region (review 2026-10-30, nebenbei).
    return { kind: 'relayError', url, status: res.status, error: json.error.slice(0, 80), message: typeof json.message === 'string' ? json.message.slice(0, 300) : '' }
  }
  // PHP that stops (config.php unreadable, display_errors off) answers 500 with nothing: under
  // mod_php even an ErrorDocument 500 left it empty (debian-vm). A 500 with a page is the host's,
  // and the way out PHP's error offers (config.php readable) is the wrong one there (review
  // 2026-10-29, N2).
  if (res.status === 500 && !res.body.trim()) return { kind: 'phpError', url }
  // Where PHP does not run, the server hands out send.php as text - and config.php with it, secret
  // and addresses, when it was uploaded readable. Under Apache with `php_flag engine off` the probe
  // said "no relay (HTTP 200)" for both, and config.php came back 200 with 0644, 403 with 0600
  // (debian-vm, review 2026-10-29, M5). Asked by content, as countersServed does.
  if (res.body.startsWith('<?php')) {
    let config: URL | null = null
    try {
      config = new URL('config.php', url)
    } catch {
      config = null
    }
    const served = config ? await getWithOrigin(config.toString(), null) : null
    const configOpen = served && 'status' in served && served.status === 200 && served.body.startsWith('<?php') ? config?.toString() : undefined
    return { kind: 'noPhp', url, ...(configOpen ? { configOpen } : {}) }
  }
  const shown = phpMessage(res.body)
  if (shown) return { kind: 'phpMessage', url, message: shown }
  // PHP-FPM says this itself ("Primary script unknown" in the log) where the web server found the
  // file and PHP could not open it: a folder 2750 of the upload account and group www-data, read
  // by a pool running as another account, behind Apache (:8442) and nginx (:8444) on debian-vm.
  // A missing send.php got the server's own 404 page on both (review 2026-10-29, nebenbei).
  if (res.status === 404 && res.body.trim() === 'File not found.') return { kind: 'phpCannotRead', url }
  // What is left after a redirect within the origin with 307 or 308 (the others are postRedirect)
  // is said by the place it went: a 307 home said "no relay (HTTP 200)" without naming it (review
  // 2026-10-30, nebenbei).
  if (to) {
    to.search = ''
    return { kind: 'redirectNoRelay', url, to: to.toString() }
  }
  return { kind: 'http', url, status: res.status }
}

/**
 * Whether the server hands out the counters, whose names anyone can guess (`limit-<hour>.count`).
 * Asked for counters/qf-probe.count, which quartz-forms ships from 0.5.11 on with the counters'
 * ending: asking for the .htaccess said nothing where Apache ignores it (AllowOverride None) or
 * nginx denies `\.ht`, both 403 for it and 200 for a count (measured on debian-vm, review
 * 2026-10-29, M3). The .htaccess is still asked for a relay from an older quartz-forms, which
 * nginx without that rule serves. Asked by content, not status: a site that answers every
 * unknown path with 200 and its start page is not open.
 */
async function countersServed(url: string): Promise<string | null> {
  const ask = async (path: string, starts: string): Promise<string | null> => {
    let probe: URL
    try {
      probe = new URL(path, url)
    } catch {
      return null
    }
    const res = await getWithOrigin(probe.toString(), null)
    return 'status' in res && res.status === 200 && res.body.startsWith(starts) ? probe.toString() : null
  }
  const [probe, htaccess] = await Promise.all([ask('counters/qf-probe.count', 'quartz-forms relay probe'), ask('counters/.htaccess', '# quartz-forms relay')])
  return probe ?? htaccess
}

export async function relayUpload(projectId: string, projectPath: string, source: PluginSource, url?: string, form?: string): Promise<RelayUploadResult> {
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
    await setRelayModes(dir, settings.configReadable)
    const result = await runDirectoryUpload(projectPath, target.id, dir, settings.subdir, `relay-${target.id}`)
    if (result.success && typeof generated.json.hash === 'string') {
      const operator = operatorStamp(settings, (await connectionsService.getRelaySecretInfo(projectId)).fingerprint)
      await writeRelayFile(projectPath, { ...file, lastUpload: { at: new Date().toISOString(), hash: generated.json.hash, targetId: target.id, location, configReadable: settings.configReadable, operator } })
    }
    const warnings = strings(generated.json.warnings)
    const origin = typeof generated.json.siteOrigin === 'string' ? generated.json.siteOrigin : (settings.allowedOrigins[0] ?? null)
    const generation = typeof generated.json.generation === 'string' ? generated.json.generation : undefined
    // The form whose address `url` is, when the relay has it: a form with its own transport.url was
    // asked under the global one, or not at all (review 2026-10-29, nebenbei).
    const forms = strings(generated.json.forms)
    const probeForm = form && forms.includes(form) ? form : forms[0]
    const check = result.success ? await checkRelay(url, origin, probeForm, generation) : undefined
    // Not after `unreachable`: a server that kept silent once kept the upload waiting a second
    // time, 20.9 s for a port that accepts and never answers (review 2026-10-29, N3).
    const countersOpen = check && check.kind !== 'noUrl' && check.kind !== 'unreachable' && !settings.counterDir.trim() ? await countersServed(check.url) : null
    return { ...result, output: [...warnings, result.output].filter(Boolean).join('\n'), configReadable: settings.configReadable, ...(check ? { check } : {}), ...(countersOpen ? { countersOpen } : {}) }
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
