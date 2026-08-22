import { existsSync } from 'fs'
import { readFile, writeFile, rename } from 'fs/promises'
import { join } from 'path'
import { parseDocument, Document } from 'yaml'
import type { QuartzConfig, PluginEntry, PluginSource, LayoutConfig } from '@shared/ipc-contract'
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
    layout?: LayoutConfig
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
    plugins,
    layout: json.layout
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
  // Only touch the top-level `layout:` node when the in-memory config actually carries one -
  // every tab's save() round-trips whatever it loaded unchanged, so this only creates a new
  // `layout:` block the first time the Layout Editor itself initializes one on a project that
  // didn't have it yet, never as a side effect of saving from an unrelated tab.
  if (config.layout !== undefined) {
    doc.setIn(['layout', 'groups'], config.layout.groups ?? {})
    doc.setIn(['layout', 'byPageType'], config.layout.byPageType ?? {})
  }

  const serialized = doc.toString()
  if (existingRaw) await snapshotConfig(projectPath, existingRaw)
  await atomicWrite(path, serialized)
}
