import { runCommand } from './runCommand'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { PluginActionResult } from '@shared/ipc-contract'
import { createSnapshot } from './snapshotService'

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

export function installFromLock(projectPath: string): Promise<PluginActionResult> {
  return runQuartzCli(projectPath, ['plugin', 'install'])
}

export function prunePlugins(projectPath: string): Promise<PluginActionResult> {
  return runQuartzCli(projectPath, ['plugin', 'prune'])
}

export async function readLockfile(projectPath: string): Promise<Record<string, unknown> | null> {
  const path = join(projectPath, 'quartz.lock.json')
  if (!existsSync(path)) return null
  return JSON.parse(await readFile(path, 'utf-8')) as Record<string, unknown>
}
