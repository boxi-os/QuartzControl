import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import type { PluginActionResult } from '@shared/ipc-contract'

function runQuartzCli(projectPath: string, args: string[]): Promise<PluginActionResult> {
  return new Promise((resolvePromise) => {
    const child = spawn('npx', ['quartz', ...args], {
      cwd: projectPath,
      shell: process.platform === 'win32',
      // closed stdin makes an unexpected interactive prompt fail fast instead of hanging forever
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let output = ''
    child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.on('exit', (code) => resolvePromise({ success: code === 0, output }))
    child.on('error', (err) => resolvePromise({ success: false, output: String(err) }))
  })
}

export function addPlugin(projectPath: string, source: string): Promise<PluginActionResult> {
  return runQuartzCli(projectPath, ['plugin', 'add', source])
}

export function removePlugin(projectPath: string, name: string): Promise<PluginActionResult> {
  return runQuartzCli(projectPath, ['plugin', 'remove', name])
}

export function enablePlugin(projectPath: string, name: string): Promise<PluginActionResult> {
  return runQuartzCli(projectPath, ['plugin', 'enable', name])
}

export function disablePlugin(projectPath: string, name: string): Promise<PluginActionResult> {
  return runQuartzCli(projectPath, ['plugin', 'disable', name])
}

export function configurePlugin(
  projectPath: string,
  name: string,
  key: string,
  value: string
): Promise<PluginActionResult> {
  return runQuartzCli(projectPath, ['plugin', 'config', name, '--set', `${key}=${value}`])
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
