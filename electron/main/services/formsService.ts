import { existsSync } from 'fs'
import { mkdir, readFile, rename, stat, writeFile } from 'fs/promises'
import { join, relative, sep } from 'path'
import type { FormsCheckResult, FormsKeyImport, FormsKeyReport, PluginSource } from '@shared/ipc-contract'
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
