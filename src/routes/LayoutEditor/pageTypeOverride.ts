import type { LayoutPosition, PageTypeLayoutOverride, PluginEntry, QuartzConfig } from '@shared/ipc-contract'
import { quartzPluginName } from '@shared/quartzPluginName'

/**
 * What `layout.byPageType.<type>` says and how the stage's page-type selector changes it - the pure
 * half of what the "Seitentypen" tab of 1.0 did inside its component.
 *
 * Quartz reads three keys there (config-loader.ts): `exclude` drops components by
 * `extractPluginName(source)` before the type's layout is built, an *empty* array under
 * `positions.<pos>` clears that position (any other value is ignored), and `template` names the
 * frame. The frame is `template ?? <the page type plugin's own frame> ?? "default"`, and a name no
 * frame is registered under renders the default frame (frames/index.ts, resolveFrame).
 */

export const BUILTIN_FRAMES = ['default', 'full-width', 'minimal'] as const

export function overrideOf(config: QuartzConfig, pageType: string): PageTypeLayoutOverride {
  return config.layout?.byPageType?.[pageType] ?? {}
}

// A page type can have a key under layout.byPageType without customizing anything - `{}` (written
// in 1.0 just by clicking a page type, before that was fixed) or `{ exclude: [], positions: {} }`
// (every toggle undone one by one). `positions` is the one place where an empty *value* counts:
// `{ beforeBody: [] }` is the deliberate "clear this position", so the key's presence matters.
export function hasPageTypeOverride(override: PageTypeLayoutOverride | undefined): boolean {
  if (!override) return false
  if (override.template) return true
  if (override.exclude && override.exclude.length > 0) return true
  if (override.positions && Object.keys(override.positions).length > 0) return true
  return false
}

// Read with quartz's name, not the app's: an entry in the display spelling excludes nothing, so
// showing it as hidden would describe a page that shows it (shared/quartzPluginName.ts).
export function isExcluded(override: PageTypeLayoutOverride, plugin: PluginEntry): boolean {
  return (override.exclude ?? []).includes(quartzPluginName(plugin.source))
}

export function isPositionCleared(override: PageTypeLayoutOverride, position: LayoutPosition): boolean {
  const value = override.positions?.[position]
  return Array.isArray(value) && value.length === 0
}

/**
 * Every `exclude` entry that names a plugin of this config in the app's display spelling rather than
 * the one quartz compares against. Those exclude nothing - the app wrote them before it knew the
 * difference - so they are dropped the next time this page type is written, not converted:
 * converting would hide a component on the built site because of an app update.
 */
export function deadExcludes(config: QuartzConfig, override: PageTypeLayoutOverride): Set<string> {
  return new Set(
    (override.exclude ?? []).filter((name) => config.plugins.some((p) => p.name === name && quartzPluginName(p.source) !== name))
  )
}

/**
 * The one door every change to a page type goes through. Undoing each customization one at a time
 * leaves no trace: a page type that customizes nothing any more is deleted from byPageType rather
 * than written as `{}`. The dead excludes go out here and not in withExcluded, because "the next
 * time this page type is written" has three doors - a component, a position, the frame.
 */
export function withOverride(config: QuartzConfig, pageType: string, patch: Partial<PageTypeLayoutOverride>): QuartzConfig {
  const current = overrideOf(config, pageType)
  const dead = deadExcludes(config, current)
  const merged: PageTypeLayoutOverride = { ...current, ...patch }
  for (const key of Object.keys(patch) as (keyof PageTypeLayoutOverride)[]) {
    if (patch[key] === undefined) delete merged[key]
  }
  if (merged.exclude?.some((name) => dead.has(name))) {
    const kept = merged.exclude.filter((name) => !dead.has(name))
    if (kept.length > 0) merged.exclude = kept
    else delete merged.exclude
  }
  if (merged.exclude?.length === 0) delete merged.exclude
  if (merged.positions && Object.keys(merged.positions).length === 0) delete merged.positions
  const byPageType = { ...(config.layout?.byPageType ?? {}) }
  if (hasPageTypeOverride(merged)) byPageType[pageType] = merged
  else delete byPageType[pageType]
  return { ...config, layout: { ...config.layout, byPageType } }
}

// By quartz's name, so it hits every instance of the component: quartz cannot exclude one
// duplicate on its own (the side panel says so where it matters).
export function withExcluded(config: QuartzConfig, pageType: string, plugin: PluginEntry, excluded: boolean): QuartzConfig {
  const exclude = new Set(overrideOf(config, pageType).exclude ?? [])
  const name = quartzPluginName(plugin.source)
  if (excluded) exclude.add(name)
  else exclude.delete(name)
  return withOverride(config, pageType, { exclude: [...exclude] })
}

export function withPositionCleared(config: QuartzConfig, pageType: string, position: LayoutPosition, cleared: boolean): QuartzConfig {
  const positions = { ...(overrideOf(config, pageType).positions ?? {}) }
  if (cleared) positions[position] = []
  else delete positions[position]
  return withOverride(config, pageType, { positions })
}

// `undefined` takes the override away, which is not the same as `"default"`: without it the page
// type's own plugin may bring a frame of its own (canvas-page brings "canvas").
export function withTemplate(config: QuartzConfig, pageType: string, template: string | undefined): QuartzConfig {
  return withOverride(config, pageType, { template })
}

// The whole key, also when it customizes nothing - that is how a stray `{}` from 1.0 leaves the file.
export function withoutOverride(config: QuartzConfig, pageType: string): QuartzConfig {
  const byPageType = { ...(config.layout?.byPageType ?? {}) }
  delete byPageType[pageType]
  return { ...config, layout: { ...config.layout, byPageType } }
}

/**
 * The frame a page type is built with, by quartz's rule, and where that answer came from. `plugin`
 * is the frame the type's own page plugin brings (LayoutEditor/index.tsx, builtinPageTypeFrames).
 */
export function resolvedFrame(
  config: QuartzConfig,
  pageType: string,
  builtinPageTypeFrames: Record<string, string>
): { name: string; from: 'override' | 'plugin' | 'default' } {
  const template = overrideOf(config, pageType).template
  if (template) return { name: template, from: 'override' }
  const plugin = builtinPageTypeFrames[`${pageType}-page`]
  if (plugin) return { name: plugin, from: 'plugin' }
  return { name: 'default', from: 'default' }
}
