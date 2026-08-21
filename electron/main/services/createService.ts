import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import type { CreateProjectOptions, CreateProjectResult } from '@shared/ipc-contract'

const TEMPLATE_REPO = 'https://github.com/jackyzha0/quartz.git'

function run(command: string, args: string[], cwd?: string): Promise<{ success: boolean; output: string }> {
  return new Promise((resolvePromise) => {
    const child = spawn(command, args, {
      cwd,
      shell: process.platform === 'win32',
      // closed stdin makes an unanswered interactive prompt (e.g. a missing wizard flag)
      // fail fast instead of hanging forever - verified against the real quartz create wizard,
      // which then exits 0 without writing quartz.config.yaml, which is why success below is
      // re-checked against the file actually existing rather than trusting the exit code alone
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let output = ''
    child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.stderr?.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.on('exit', (code) => resolvePromise({ success: code === 0, output }))
    child.on('error', (err) => resolvePromise({ success: false, output: String(err) }))
  })
}

// There is no single CLI command that scaffolds a brand-new Quartz project from an arbitrary
// empty directory: `quartz` is a private, never-published package, and `quartz create` only
// works once run *inside* an already-cloned-and-`npm install`ed copy of the project. So this
// clones the upstream template, installs its dependencies, then runs the local wizard.
export async function createProject(options: CreateProjectOptions): Promise<CreateProjectResult> {
  const clone = await run('git', ['clone', '--depth', '1', TEMPLATE_REPO, options.targetDirectory])
  if (!clone.success) {
    return { success: false, output: `Klonen des Quartz-Templates fehlgeschlagen:\n${clone.output}` }
  }

  // detach from jackyzha0/quartz so a later "Git-Sync" push never targets the upstream repo
  await run('git', ['remote', 'remove', 'origin'], options.targetDirectory)

  const install = await run('npm', ['install'], options.targetDirectory)
  if (!install.success) {
    return { success: false, output: `${clone.output}\n\nnpm install fehlgeschlagen:\n${install.output}` }
  }

  const args = [
    'quartz',
    'create',
    '-t',
    options.template ?? 'default',
    '-X',
    options.strategy ?? 'new',
    '-l',
    options.linkResolution ?? 'shortest'
  ]
  if (options.source) args.push('-s', options.source)
  if (options.baseUrl) args.push('-b', options.baseUrl)

  const create = await run('npx', args, options.targetDirectory)
  const configWritten = existsSync(join(options.targetDirectory, 'quartz.config.yaml'))
  return {
    success: create.success && configWritten,
    output: `${clone.output}\n${install.output}\n${create.output}${
      create.success && !configWritten
        ? '\n\nDer Setup-Assistent hat quartz.config.yaml nicht geschrieben (vermutlich fehlt eine Antwort auf eine interaktive Rückfrage oben).'
        : ''
    }`
  }
}
