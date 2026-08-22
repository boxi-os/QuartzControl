import type { LayoutPosition, PluginEntry, PluginLayoutDeclaration } from '@shared/ipc-contract'

export const POSITIONS: LayoutPosition[] = ['header', 'left', 'right', 'beforeBody', 'afterBody', 'footer']

export function getLayout(plugin: PluginEntry): PluginLayoutDeclaration | null {
  return plugin.layout && typeof plugin.layout === 'object' ? plugin.layout : null
}

export interface IndexedPlugin {
  plugin: PluginEntry
  index: number
}

// Only component-providing plugins (ones with a `layout` block) can be arranged in the board -
// same split Installed.tsx already draws between "Components" and "Verarbeitung".
export function componentItems(plugins: PluginEntry[]): IndexedPlugin[] {
  return plugins.map((plugin, index) => ({ plugin, index })).filter(({ plugin }) => getLayout(plugin) !== null)
}

// Builds { position: [pluginIndex, ...] } sorted by priority, mirroring quartz's own
// `buildLayoutForEntries` sort in config-loader.ts.
export function buildPositionMap(plugins: PluginEntry[]): Record<LayoutPosition, number[]> {
  const map: Record<LayoutPosition, number[]> = { header: [], left: [], right: [], beforeBody: [], afterBody: [], footer: [] }
  const items = componentItems(plugins)
  for (const position of POSITIONS) {
    map[position] = items
      .filter(({ plugin }) => getLayout(plugin)!.position === position)
      .sort((a, b) => getLayout(a.plugin)!.priority - getLayout(b.plugin)!.priority)
      .map(({ index }) => index)
  }
  return map
}

// Derived, not hardcoded: page-type plugins conventionally derive their `layout` key (used in
// `quartz.config.yaml`'s `layout.byPageType`) by dropping the "-page" suffix from their name
// (content-page -> "content", folder-page -> "folder", ...) - verified against a real generated
// config (CLAUDE.md's "Verified Quartz 5 CLI facts"). "404" is always available since it's a
// built-in page type shipped with quartz itself, not a separate installable plugin.
export function derivePageTypes(plugins: PluginEntry[]): string[] {
  const fromPlugins = plugins
    .filter((p) => p.enabled && p.name.endsWith('-page'))
    .map((p) => p.name.slice(0, -'-page'.length))
  return ['404', ...fromPlugins]
}

export function renumberPriorities(indices: number[]): Map<number, number> {
  const result = new Map<number, number>()
  indices.forEach((index, i) => result.set(index, (i + 1) * 10))
  return result
}
