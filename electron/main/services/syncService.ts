import { runCommand } from './runCommand'
import type { SyncResult } from '@shared/ipc-contract'

export function runSync(projectPath: string, direction: 'push' | 'pull' | 'both' = 'both'): Promise<SyncResult> {
  // --push/--pull both default to true (yargs booleans), so a single direction is
  // selected by negating the other one rather than by only passing the one wanted
  const args = ['quartz', 'sync']
  if (direction === 'push') args.push('--no-pull')
  if (direction === 'pull') args.push('--no-push')

  return runCommand('npx', args, projectPath)
}
