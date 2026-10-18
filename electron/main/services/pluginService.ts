import { runCommand } from './runCommand'
import { existsSync } from 'fs'
import { readFile, realpath } from 'fs/promises'
import { join, resolve } from 'path'
import type { PluginActionResult } from '@shared/ipc-contract'
import { createSnapshot } from './snapshotService'
import { missingDependencies } from './projectDependencies'
import { forgetDependencyErrors } from './buildService'

function runQuartzCli(projectPath: string, args: string[]): Promise<PluginActionResult> {
  return runCommand('npx', ['quartz', ...args], projectPath)
}

// The CLI call on its own, without a snapshot. Split out for the template-package import, which
// takes one snapshot for the whole import and would otherwise produce one per plugin - a package
// carrying 48 plugin entries would leave 48 snapshots behind, and pluginChange deliberately does
// not coalesce (see snapshotService).
export function installPluginSource(projectPath: string, source: string): Promise<PluginActionResult> {
  return runQuartzCli(projectPath, ['plugin', 'add', source])
}

// Installing or removing a plugin rewrites quartz.lock.json and the .quartz/ tree, and can change
// quartz.config.yaml - none of which the old backup mechanism ever covered.
export async function addPlugin(projectPath: string, source: string): Promise<PluginActionResult> {
  await createSnapshot(projectPath, 'pluginChange', source)
  return installPluginSource(projectPath, source)
}

export async function removePlugin(projectPath: string, name: string): Promise<PluginActionResult> {
  await createSnapshot(projectPath, 'pluginChange', name)
  return runQuartzCli(projectPath, ['plugin', 'remove', name])
}

// What a fresh clone needs, and the button the app names for it: in a clone node_modules is as
// absent as .quartz/plugins, and `quartz plugin install` then died on its own first import with a
// stack trace (alpha scenes 2026-10-17, finding 4.1). So npm goes first when packages are missing.
//
// `quartz plugin install` ends with 0 when single plugins fail: it prints "  ✗ <name>: <reason>"
// for each and "⚠ Installed 3 plugin(s), 4 failed", and a clone's authored frames fail that way
// every time (finding 2.1). So the names go back with the result, for the caller to say.
//
// One run per project, held here and not in a page: the overview's "Installiere…" lived in React
// state, so after a route change the overview said "Alles ok" while npm was still unpacking, and
// "Aus quartz.lock.json wiederherstellen" under Plugins started a second npm in the same folder
// (forty-sixth review, Niedrig 4). A second call joins the running one instead of being turned
// away. Keyed by realpath, like the other per-project locks.
const installs = new Map<string, Promise<PluginActionResult>>()

async function installKey(projectPath: string): Promise<string> {
  return realpath(projectPath).catch(() => resolve(projectPath))
}

export async function installFromLock(projectPath: string): Promise<PluginActionResult> {
  const key = await installKey(projectPath)
  const running = installs.get(key)
  if (running) return running
  const run = installFromLockNow(projectPath).finally(() => installs.delete(key))
  installs.set(key, run)
  return run
}

export async function isInstallingFromLock(projectPath: string): Promise<boolean> {
  return installs.has(await installKey(projectPath))
}

async function installFromLockNow(projectPath: string): Promise<PluginActionResult> {
  const missing = await missingDependencies(projectPath)
  let npmOutput = ''
  if (missing?.length) {
    const npm = await runCommand('npm', ['install'], projectPath)
    if (!npm.success) return npm
    npmOutput = npm.output
    if ((await missingDependencies(projectPath))?.length === 0) forgetDependencyErrors(projectPath)
  }
  const plugins = await runQuartzCli(projectPath, ['plugin', 'install'])
  return { success: plugins.success, output: `${npmOutput}\n${plugins.output}`.trim(), failed: failedPlugins(plugins.output) }
}

function failedPlugins(output: string): string[] {
  // eslint-disable-next-line no-control-regex
  const plain = output.replace(/\x1b\[[0-9;]*m/g, '')
  return [...new Set([...plain.matchAll(/^\s*✗ ([^\s:]+): /gm)].map((m) => m[1]))]
}

export function prunePlugins(projectPath: string): Promise<PluginActionResult> {
  return runQuartzCli(projectPath, ['plugin', 'prune'])
}

export async function readLockfile(projectPath: string): Promise<Record<string, unknown> | null> {
  const path = join(projectPath, 'quartz.lock.json')
  if (!existsSync(path)) return null
  return JSON.parse(await readFile(path, 'utf-8')) as Record<string, unknown>
}
