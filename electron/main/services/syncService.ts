import { spawn } from 'child_process'
import type { SyncResult } from '@shared/ipc-contract'

export function runSync(projectPath: string, direction: 'push' | 'pull' | 'both' = 'both'): Promise<SyncResult> {
  // --push/--pull both default to true (yargs booleans), so a single direction is
  // selected by negating the other one rather than by only passing the one wanted
  const args = ['quartz', 'sync']
  if (direction === 'push') args.push('--no-pull')
  if (direction === 'pull') args.push('--no-push')

  return new Promise((resolvePromise) => {
    const child = spawn('npx', args, {
      cwd: projectPath,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let output = ''
    child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.on('exit', (code) => resolvePromise({ success: code === 0, output }))
    child.on('error', (err) => resolvePromise({ success: false, output: String(err) }))
  })
}
