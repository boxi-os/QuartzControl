import { existsSync } from 'fs'
import { readFile, writeFile, rename } from 'fs/promises'
import { join } from 'path'
import { parseDocument, Document, isMap } from 'yaml'
import type { QuartzConfig, PluginEntry, PluginSource, LayoutConfig } from '@shared/ipc-contract'
import { createSnapshot } from './snapshotService'

function configPath(projectPath: string): string {
  return join(projectPath, 'quartz.config.yaml')
}

export function deriveName(source: PluginSource): string {
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

// setIn alone can only add or update, so a key the user removed in the editor would survive every
// save forever. This reconciles a mapping node with the incoming object: keys absent from `next`
// are deleted, the rest are set field-by-field so surrounding YAML comments stay intact.
// `keep` exempts keys that live under the same node but are managed elsewhere.
function syncMapping(doc: Document, nodePath: string[], next: Record<string, unknown>, keep: string[] = []): void {
  const node = doc.getIn(nodePath)
  if (isMap(node)) {
    const exempt = new Set(keep)
    const stale = node.items
      .map((item) => String(item.key))
      .filter((key) => !exempt.has(key) && !(key in next))
    for (const key of stale) doc.deleteIn([...nodePath, key])
  }
  for (const [key, value] of Object.entries(next)) {
    doc.setIn([...nodePath, key], value)
  }
}

// `snapshot: false` for a write that is part of a larger operation which takes its own snapshot,
// or - as in duplicateService - happens inside a project that has no history yet and must not
// start one: the same escape hatch layoutFrameService.saveFrame offers for the same reason.
export async function writeConfig(
  projectPath: string,
  config: QuartzConfig,
  options?: { snapshot?: boolean }
): Promise<void> {
  const path = configPath(projectPath)
  const existingRaw = existsSync(path) ? await readFile(path, 'utf-8') : ''
  // field-level setIn (rather than replacing whole subtrees) keeps existing YAML comments intact
  const doc = existingRaw ? parseDocument(existingRaw) : new Document({})

  // `theme` is exempt: readConfig splits it out of `configuration` into its own field, so it is
  // never a key of config.configuration and would otherwise be deleted as stale on every save.
  syncMapping(doc, ['configuration'], config.configuration, ['theme'])
  // Only reconcile the theme block if it already exists or the config actually carries one, so an
  // empty theme never creates a bare `theme:` node on a project that never had one.
  if (isMap(doc.getIn(['configuration', 'theme'])) || Object.keys(config.theme).length > 0) {
    syncMapping(doc, ['configuration', 'theme'], config.theme)
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
  // A snapshot rather than the old per-save copy of this one file: the store covers the whole
  // project, and its coalescing window means a session of edits leaves the state from *before*
  // the session as one entry instead of one entry per save - which is what made the old backup
  // list fifty unreadable timestamps.
  if (existingRaw && options?.snapshot !== false) await createSnapshot(projectPath, 'configChange', '')
  await atomicWrite(path, serialized)
}
