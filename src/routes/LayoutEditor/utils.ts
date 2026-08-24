import type { FrameBreakpoint, LayoutPosition, PageTypeLayoutOverride, PluginEntry, PluginLayoutDeclaration } from '@shared/ipc-contract'

export const POSITIONS: LayoutPosition[] = ['header', 'left', 'right', 'beforeBody', 'afterBody', 'footer']

// A page type can have a key under layout.byPageType without actually customizing anything - e.g.
// `{}` (an empty object; historically written just by clicking a page type pill, before that got
// fixed) or `{ exclude: [], positions: {} }` (every individual toggle undone one at a time, leaving
// the empty containers behind instead of deleting the key). `positions` is the one exception where
// an empty *value* still counts: `{ beforeBody: [] }` is toggleClearSlot's deliberate "force this
// slot empty" state, so it's the key's presence, not its array length, that matters there.
export function hasPageTypeOverride(override: PageTypeLayoutOverride | undefined): boolean {
  if (!override) return false
  if (override.template) return true
  if (override.exclude && override.exclude.length > 0) return true
  if (override.positions && Object.keys(override.positions).length > 0) return true
  return false
}

// Real per-breakpoint grid shape of Quartz's own DefaultFrame, verified against
// quartz/styles/variables.scss's $mobileGrid/$tabletGrid/$desktopGrid ($sidePanelWidth: 320px) and
// quartz/components/frames/DefaultFrame.tsx - used to render Global's board as a truthful mockup
// instead of an equal-width approximation. Unlike the "eigene Frames" grid, this shape is fixed
// (not user-editable): header/footer are confined to the center column (not full page width), and
// the right sidebar collapses from its own column into a horizontal row once desktop is left -
// see `sidebarDirection` below, mirroring `.sidebar.right`'s `@media all and not ($desktop)`
// override in base.scss. Gap is an editorial choice (quartz's own 5px is too tight to read here).
export const DEFAULT_FRAME_GRID: Record<FrameBreakpoint, { columns: string; rows: string; areas: string }> = {
  desktop: {
    columns: '320px auto 320px',
    rows: 'auto auto auto',
    areas: '"sidebar-left header sidebar-right" "sidebar-left center sidebar-right" "sidebar-left footer sidebar-right"'
  },
  tablet: {
    columns: '320px auto',
    rows: 'auto auto auto auto',
    areas: '"sidebar-left header" "sidebar-left center" "sidebar-left sidebar-right" "sidebar-left footer"'
  },
  mobile: {
    columns: 'auto',
    rows: 'auto auto auto auto auto',
    areas: '"sidebar-left" "header" "center" "sidebar-right" "footer"'
  }
}

// Quartz's other two built-in frames (quartz/components/frames/FullWidthFrame.tsx,
// MinimalFrame.tsx) render a single column with no sidebars, verified against base.scss's own
// `.page[data-frame="full-width"/"minimal"] > #quartz-body` overrides (grid-template-columns:
// auto at every breakpoint - unlike DEFAULT_FRAME_GRID there's no $tablet/$mobile respecification
// to track). Critically, `left`/`right` aren't just visually hidden here - FullWidthFrame/
// MinimalFrame's render() never destructures or renders those PageFrameProps at all, so any
// component assigned to those positions (Explorer, Search, Graph, ...) is silently dropped on a
// page using one of these templates, same as an unassigned slot on a custom authored frame.
export const BUILTIN_FRAME_LAYOUT: Record<'full-width' | 'minimal', { areas: string; visibleSlots: LayoutPosition[] }> = {
  'full-width': {
    areas: '"header" "beforeBody" "center" "afterBody" "footer"',
    visibleSlots: ['header', 'beforeBody', 'afterBody', 'footer']
  },
  minimal: {
    areas: '"center" "footer"',
    visibleSlots: ['footer']
  }
}

// `.sidebar.left` only reflows to a horizontal row on mobile; `.sidebar.right` reflows on both
// tablet and mobile (verified against the same base.scss rules cited above) - everything else
// (header/beforeBody/afterBody/footer) is always a vertical stack of components.
export function sidebarDirection(position: 'left' | 'right', breakpoint: FrameBreakpoint): 'row' | 'column' {
  if (breakpoint === 'desktop') return 'column'
  if (position === 'right') return 'row'
  return breakpoint === 'mobile' ? 'row' : 'column'
}

// Counts, by derived display name, how many component entries share it - i.e. duplicated
// instances (two entries with the same `source` always derive the same name, see
// configService.deriveName). Used both to disambiguate identical names in the UI and to warn
// where Quartz's own `exclude` (matched by this same source-derived name, not array position -
// verified against config-loader.ts's `extractPluginName`) can't target one specific instance -
// see PageTypeOverrides.
export function duplicateNameCounts(plugins: PluginEntry[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const { plugin } of componentItems(plugins)) {
    counts.set(plugin.name, (counts.get(plugin.name) ?? 0) + 1)
  }
  return counts
}

// Maps each component entry's array index to its 1-based rank among entries sharing its name (in
// array order) - the stable "#1"/"#2" suffix GlobalBoard shows next to duplicated instances.
export function duplicateRanks(plugins: PluginEntry[]): Map<number, number> {
  const seen = new Map<string, number>()
  const ranks = new Map<number, number>()
  for (const { plugin, index } of componentItems(plugins)) {
    const rank = (seen.get(plugin.name) ?? 0) + 1
    seen.set(plugin.name, rank)
    ranks.set(index, rank)
  }
  return ranks
}

// A new entry duplicating `source`, carrying over `options` as a starting point but with its own
// `layout` (position/priority set by the caller) so it doesn't collide with the original's slot.
export function duplicateEntry(source: PluginEntry, layout: PluginLayoutDeclaration): PluginEntry {
  return { ...source, layout, options: source.options ? { ...source.options } : undefined }
}

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

// One entry per distinct component source already present in `plugins` (first occurrence wins) -
// the "add component" palette both GlobalBoard and FrameBuilder show above their grid; dragging a
// chip spawns another instance of that component (see appendDuplicateToPosition).
export function distinctComponentChips(plugins: PluginEntry[]): IndexedPlugin[] {
  const seen = new Set<string>()
  const chips: IndexedPlugin[] = []
  for (const item of componentItems(plugins)) {
    if (seen.has(item.plugin.name)) continue
    seen.add(item.plugin.name)
    chips.push(item)
  }
  return chips
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

function insertAt<T>(arr: T[], index: number, value: T): T[] {
  const next = [...arr]
  next.splice(index, 0, value)
  return next
}

export interface MutationResult {
  plugins: PluginEntry[]
  newIndex: number
}

// Patches a single plugin entry's `layout.group` (or clears it) - GlobalBoard's per-component
// group assignment.
export function withGroup(plugins: PluginEntry[], index: number, group: string): PluginEntry[] {
  return plugins.map((p, i) => {
    if (i !== index || !p.layout) return p
    const layout = { ...p.layout }
    if (group) layout.group = group
    else delete layout.group
    return { ...p, layout }
  })
}

// Quartz core already honors this at build time (styles/base.scss's .desktop-only/.mobile-only,
// switching at the same 800px breakpoint the grid-frame media queries use).
export function withDisplay(plugins: PluginEntry[], index: number, display: PluginLayoutDeclaration['display']): PluginEntry[] {
  return plugins.map((p, i) => {
    if (i !== index || !p.layout) return p
    const layout = { ...p.layout }
    if (display && display !== 'all') layout.display = display
    else delete layout.display
    return { ...p, layout }
  })
}

// Duplicates the entry at `sourceIndex`, inserting the copy immediately after it in the same slot
// and renumbering that slot's priorities - the "Duplizieren" button on a placed component's expand
// panel in GlobalBoard.
export function duplicateAfter(plugins: PluginEntry[], sourceIndex: number): MutationResult | null {
  const source = plugins[sourceIndex]
  const layout = getLayout(source)
  if (!layout) return null
  const positions = buildPositionMap(plugins)
  const order = insertAt(positions[layout.position], positions[layout.position].indexOf(sourceIndex) + 1, -1)
  const priorities = renumberPriorities(order)
  const newIndex = plugins.length
  const newEntry = duplicateEntry(source, { ...layout, priority: priorities.get(-1) ?? layout.priority + 1 })
  const next: PluginEntry[] = [...plugins, newEntry].map((plugin, i) => {
    const priority = priorities.get(i)
    if (priority === undefined || !plugin.layout || plugin.layout.position !== layout.position) return plugin
    return { ...plugin, layout: { ...plugin.layout, priority } }
  })
  return { plugins: next, newIndex }
}

// Duplicates the entry at `sourceIndex` into `position`, inserted at `insertIndex` within that
// position's current list (defaults to the end) - GlobalBoard's "drop a palette chip onto a slot"
// spawn action, using the precise `over.id` position from dnd-kit.
export function appendDuplicateToPosition(
  plugins: PluginEntry[],
  sourceIndex: number,
  position: LayoutPosition,
  insertIndex?: number
): MutationResult | null {
  const source = plugins[sourceIndex]
  if (!source) return null
  const positions = buildPositionMap(plugins)
  const order = insertAt(positions[position], insertIndex ?? positions[position].length, -1)
  const priorities = renumberPriorities(order)
  const newIndex = plugins.length
  const newEntry = duplicateEntry(source, { position, priority: priorities.get(-1) ?? 10 })
  const next: PluginEntry[] = [...plugins, newEntry].map((plugin, i) => {
    const priority = priorities.get(i)
    if (priority === undefined || !plugin.layout || plugin.layout.position !== position) return plugin
    return { ...plugin, layout: { ...plugin.layout, position, priority } }
  })
  return { plugins: next, newIndex }
}
