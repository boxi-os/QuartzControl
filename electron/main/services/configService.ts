import { existsSync } from 'fs'
import { readFile, writeFile, rename } from 'fs/promises'
import { join } from 'path'
import { parseDocument, Document } from 'yaml'
import type { QuartzConfig, PluginEntry, PluginSource } from '@shared/ipc-contract'
import { snapshotConfig } from './backupService'

function configPath(projectPath: string): string {
  return join(projectPath, 'quartz.config.yaml')
}

function deriveName(source: PluginSource): string {
  if (typeof source === 'string') {
    const withoutRef = source.replace(/^github:/, '').replace(/^git\+/, '').split('#')[0]
    const parts = withoutRef.split('/')
    return parts[parts.length - 1] || withoutRef
  }
  if (source.name) return source.name
  const parts = source.repo.replace(/\.git$/, '').split('/')
  return parts[parts.length - 1]
}

export async function readConfig(projectPath: string): Promise<QuartzConfig> {
  const raw = await readFile(configPath(projectPath), 'utf-8')
  const json = parseDocument(raw).toJS() as {
    // quartz nests `theme` inside `configuration` on disk; plugin entries can carry
    // extra fields (e.g. `layout`) beyond source/enabled/order/options that must round-trip
    configuration?: (QuartzConfig['configuration'] & { theme?: QuartzConfig['theme'] }) | undefined
    plugins?: Array<Record<string, unknown> & { source: PluginSource; enabled?: boolean }>
  }
  const { theme, ...configuration } = json.configuration ?? {}
  const plugins: PluginEntry[] = (json.plugins ?? []).map((p) => ({
    ...p,
    name: deriveName(p.source),
    enabled: p.enabled ?? true
  })) as PluginEntry[]
  return {
    configuration,
    theme: theme ?? {},
    plugins
  }
}

async function atomicWrite(path: string, contents: string): Promise<void> {
  parseDocument(contents) // fail fast before touching the real file
  const tmpPath = `${path}.tmp-${Date.now()}`
  await writeFile(tmpPath, contents, 'utf-8')
  await rename(tmpPath, path)
}

export async function writeConfig(projectPath: string, config: QuartzConfig): Promise<void> {
  const path = configPath(projectPath)
  const existingRaw = existsSync(path) ? await readFile(path, 'utf-8') : ''
  // field-level setIn (rather than replacing whole subtrees) keeps existing YAML comments intact
  const doc = existingRaw ? parseDocument(existingRaw) : new Document({})

  for (const [key, value] of Object.entries(config.configuration)) {
    doc.setIn(['configuration', key], value)
  }
  for (const [key, value] of Object.entries(config.theme)) {
    doc.setIn(['configuration', 'theme', key], value)
  }
  doc.set(
    'plugins',
    config.plugins.map(({ name: _name, ...rest }) => rest)
  )

  const serialized = doc.toString()
  if (existingRaw) await snapshotConfig(projectPath, existingRaw)
  await atomicWrite(path, serialized)
}
