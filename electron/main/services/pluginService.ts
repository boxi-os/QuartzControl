import { runCommand } from './runCommand'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { PluginActionResult } from '@shared/ipc-contract'
import { createSnapshot } from './snapshotService'
import { missingDependencies } from './projectDependencies'

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
export async function installFromLock(projectPath: string): Promise<PluginActionResult> {
  const missing = await missingDependencies(projectPath)
  if (!missing?.length) return runQuartzCli(projectPath, ['plugin', 'install'])
  const npm = await runCommand('npm', ['install'], projectPath)
  if (!npm.success) return npm
  const plugins = await runQuartzCli(projectPath, ['plugin', 'install'])
  return { success: plugins.success, output: `${npm.output}\n${plugins.output}`.trim() }
}

export function prunePlugins(projectPath: string): Promise<PluginActionResult> {
  return runQuartzCli(projectPath, ['plugin', 'prune'])
}

export async function readLockfile(projectPath: string): Promise<Record<string, unknown> | null> {
  const path = join(projectPath, 'quartz.lock.json')
  if (!existsSync(path)) return null
  return JSON.parse(await readFile(path, 'utf-8')) as Record<string, unknown>
}
