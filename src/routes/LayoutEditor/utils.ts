import type {
  FrameBreakpoint,
  FrameBreakpointWidths,
  GridFrameDefinition,
  LayoutPosition,
  PluginEntry,
  PluginLayoutDeclaration,
  QuartzConfig
} from '@shared/ipc-contract'
import { withOwnClassForCopy } from '../Plugins/instanceClass'

// The width band a breakpoint actually covers, for the tab labels - three reiters called
// "Desktop/Tablet/Mobil" say nothing about where they switch, and once the thresholds are the
// user's own choice that stops being guessable. Mirrors buildFrameCss's cascade: desktop is the
// unconditional base, so it owns everything above the tablet threshold.
export function breakpointRangeLabel(breakpoint: FrameBreakpoint, widths: FrameBreakpointWidths): string {
  if (breakpoint === 'desktop') return `> ${widths.tablet} px`
  if (breakpoint === 'tablet') return `${widths.mobile + 1}–${widths.tablet} px`
  return `≤ ${widths.mobile} px`
}

export const POSITIONS: LayoutPosition[] = ['header', 'left', 'right', 'beforeBody', 'afterBody', 'footer']

// Real per-breakpoint grid shape of Quartz's own DefaultFrame, verified against
// quartz/styles/variables.scss's $mobileGrid/$tabletGrid/$desktopGrid and
// quartz/components/frames/DefaultFrame.tsx - used to render Global's board as a truthful mockup
// instead of an equal-width approximation. The column sizes are not here: they come from the
// project's variables.scss (layoutFrames.quartzMeasures, QUARTZ_MEASURES in defaultFrame.ts).
// Unlike the "eigene Frames" grid, this shape is fixed (not user-editable): header/footer are confined to the center column (not full page width), and
// the right sidebar collapses from its own column into a horizontal row once desktop is left -
// see `sidebarDirection` below, mirroring `.sidebar.right`'s `@media all and not ($desktop)`
// override in base.scss. Gap is an editorial choice (quartz's own 5px is too tight to read here).
export const DEFAULT_FRAME_GRID: Record<FrameBreakpoint, { rows: string; areas: string }> = {
  desktop: {
    rows: 'auto auto auto',
    areas: '"sidebar-left header sidebar-right" "sidebar-left center sidebar-right" "sidebar-left footer sidebar-right"'
  },
  tablet: {
    rows: 'auto auto auto auto',
    areas: '"sidebar-left header" "sidebar-left center" "sidebar-left sidebar-right" "sidebar-left footer"'
  },
  mobile: {
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
// where Quartz's own `exclude` can't target one specific instance - see the side panel (Inspector).
//
// Quartz matches `exclude` by a name derived from the source too, but not by *this* name: its
// `extractPluginName` leaves an npm source with a scope whole. So the display name is right for
// counting instances (they share a source, hence both names) and wrong for writing an exclusion,
// which goes through shared/quartzPluginName.ts.
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
// A navigation or a layout box gets a CSS class of its own on the way (instanceClass.ts), so the copy
// can be told from the original by a stylesheet and by the preview's marks.
export function duplicateEntry(source: PluginEntry, layout: PluginLayoutDeclaration, plugins: PluginEntry[], name?: string): PluginEntry {
  const copy = { ...source, layout, options: source.options ? { ...source.options } : undefined }
  return withOwnClassForCopy(copy, source, plugins, name)
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
//
// The convention is a convention, not a rule, and a plugin is free to ignore it:
// `obsidian-plugin-excalidraw` declares `quartz.category: ["pageType", ...]` and registers the page
// type `excalidraw`, with no `-page` anywhere in its name. Quartz builds it either way - it reads
// the category, not the name - but this list is what the layout editor offers, so the type was
// unreachable here and the frame it uses could only be chosen by editing the YAML.
//
// So the config gets a say as well: any key already written under `layout.byPageType` is a page
// type by demonstration. That covers the plugin above and anything else that names itself its own
// way, without this file having to keep a list of exceptions. Order is stable and duplicates are
// dropped - a type that is both derived and overridden appears once, where the derivation put it.
export function derivePageTypes(config: QuartzConfig): string[] {
  const fromPlugins = config.plugins
    .filter((p) => p.enabled && p.name.endsWith('-page'))
    .map((p) => p.name.slice(0, -'-page'.length))
  const fromConfig = Object.keys(config.layout?.byPageType ?? {})
  const found = [...new Set(['404', ...fromPlugins, ...fromConfig])]
  // The order a reader meets them: the notes first, the 404 page last. A type this list does not
  // know goes before the 404 page, in the order it was found.
  const rank = (pt: string): number => {
    const k = PAGE_TYPE_ORDER.indexOf(pt)
    return k === -1 ? (pt === '404' ? 1001 : 1000) : k
  }
  return found.map((pt, k) => ({ pt, k })).sort((a, b) => rank(a.pt) - rank(b.pt) || a.k - b.k).map(({ pt }) => pt)
}

const PAGE_TYPE_ORDER = ['content', 'folder', 'tag', 'bases', 'canvas', 'excalidraw']

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
export function duplicateAfter(plugins: PluginEntry[], sourceIndex: number, name?: string): MutationResult | null {
  const source = plugins[sourceIndex]
  const layout = getLayout(source)
  if (!layout) return null
  const positions = buildPositionMap(plugins)
  const order = insertAt(positions[layout.position], positions[layout.position].indexOf(sourceIndex) + 1, -1)
  const priorities = renumberPriorities(order)
  const newIndex = plugins.length
  const newEntry = duplicateEntry(source, { ...layout, priority: priorities.get(-1) ?? layout.priority + 1 }, plugins, name)
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
  const newEntry = duplicateEntry(source, { position, priority: priorities.get(-1) ?? 10 }, plugins)
  const next: PluginEntry[] = [...plugins, newEntry].map((plugin, i) => {
    const priority = priorities.get(i)
    if (priority === undefined || !plugin.layout || plugin.layout.position !== position) return plugin
    return { ...plugin, layout: { ...plugin.layout, position, priority } }
  })
  return { plugins: next, newIndex }
}

// A component that is switched off and is the only one of its name lives in the component tray, not
// on the board: Quartz drops a disabled entry before it builds the layout, so it renders nowhere,
// and the tray is where the board keeps what is not on the page (1.0.1, user finding 4). Dragging it
// back switches it on again. A disabled *duplicate* stays on the board with its badge - the tray
// holds one chip per name, and that chip already stands for the enabled instance.
export function parkedIndices(plugins: PluginEntry[]): Set<number> {
  const counts = duplicateNameCounts(plugins)
  const parked = new Set<number>()
  for (const { plugin, index } of componentItems(plugins)) {
    if (!plugin.enabled && (counts.get(plugin.name) ?? 0) === 1) parked.add(index)
  }
  return parked
}

// The board's position lists without the parked entries - see parkedIndices.
export function buildBoardPositionMap(plugins: PluginEntry[], parked: Set<number>): Record<LayoutPosition, number[]> {
  const map = buildPositionMap(plugins)
  for (const position of POSITIONS) map[position] = map[position].filter((i) => !parked.has(i))
  return map
}

// Which component the side panel shows, by name and its n-th occurrence among entries of that name
// - not by array index. An index belongs to whatever sits at that place after a removal, and a
// duplicate removed further up would hand the panel to its neighbour (conventions.md: "Schlüssel
// sind stabile Kennungen, nie Listenindizes").
export interface ComponentRef {
  name: string
  occurrence: number
}

export function componentRef(plugins: PluginEntry[], index: number): ComponentRef | null {
  const plugin = plugins[index]
  if (!plugin || !getLayout(plugin)) return null
  return { name: plugin.name, occurrence: duplicateRanks(plugins).get(index) ?? 1 }
}

export function resolveComponentRef(plugins: PluginEntry[], ref: ComponentRef | null): number | null {
  if (!ref) return null
  const ranks = duplicateRanks(plugins)
  for (const { plugin, index } of componentItems(plugins)) {
    if (plugin.name === ref.name && ranks.get(index) === ref.occurrence) return index
  }
  return null
}

/**
 * Puts the entry at `index` into `position` at `insertIndex` of that position's list (the end when
 * left out) and renumbers the lists it left and joined - the one move behind a drop, the position
 * select and "früher/später". `positions` are the lists as the board shows them; an entry that is
 * in none of them (a parked one) simply joins. `group` is the area it lands in: a group area makes
 * it a member, the plain area takes it out of any group, and `undefined` leaves the group alone.
 */
export function placeComponent(
  plugins: PluginEntry[],
  positions: Record<LayoutPosition, number[]>,
  index: number,
  position: LayoutPosition,
  insertIndex?: number,
  group?: string | null
): PluginEntry[] {
  const next: Record<LayoutPosition, number[]> = { ...positions }
  const touched = new Set<LayoutPosition>([position])
  for (const pos of POSITIONS) {
    if (!positions[pos].includes(index)) continue
    next[pos] = positions[pos].filter((i) => i !== index)
    touched.add(pos)
  }
  const target = [...next[position]]
  target.splice(Math.min(insertIndex ?? target.length, target.length), 0, index)
  next[position] = target
  const renumbered = new Map<number, { position: LayoutPosition; priority: number }>()
  for (const pos of touched) {
    for (const [i, priority] of renumberPriorities(next[pos])) renumbered.set(i, { position: pos, priority })
  }
  return plugins.map((plugin, i) => {
    const update = renumbered.get(i)
    if (!update || !plugin.layout) return plugin
    const layout = { ...plugin.layout, position: update.position, priority: update.priority }
    if (i === index && group !== undefined) {
      if (group) layout.group = group
      else delete layout.group
    }
    return { ...plugin, layout }
  })
}

export function withEnabled(plugins: PluginEntry[], index: number, enabled: boolean): PluginEntry[] {
  return plugins.map((p, i) => (i === index ? { ...p, enabled } : p))
}

// Quartz's four built-in conditions (quartz/plugins/loader/conditions.ts). A plugin can register
// more under its own names; those go through "Eigene…" as text. An unknown name does not fail the
// build - Quartz warns and renders the component always.
export const BUILTIN_CONDITIONS = ['not-index', 'has-tags', 'has-backlinks', 'has-toc'] as const

export function withCondition(plugins: PluginEntry[], index: number, condition: string): PluginEntry[] {
  return plugins.map((p, i) => {
    if (i !== index || !p.layout) return p
    const layout = { ...p.layout }
    if (condition.trim()) layout.condition = condition.trim()
    else delete layout.condition
    return { ...p, layout }
  })
}

type GroupOptions = NonNullable<PluginLayoutDeclaration['groupOptions']>

// What Quartz's Flex fills in for a key that is not there (quartz/components/Flex.tsx). A value
// equal to it is written as "not there", so switching something on and off again leaves the file
// as it was.
export const GROUP_OPTION_DEFAULTS = { grow: false, shrink: true, basis: 'auto', order: 0, align: 'center' } as const

export function withGroupOption<K extends keyof GroupOptions>(
  plugins: PluginEntry[],
  index: number,
  key: K,
  value: GroupOptions[K] | undefined
): PluginEntry[] {
  return plugins.map((p, i) => {
    if (i !== index || !p.layout) return p
    const options: GroupOptions = { ...(p.layout.groupOptions ?? {}) }
    const fallback = (GROUP_OPTION_DEFAULTS as Partial<GroupOptions>)[key]
    if (value === undefined || value === '' || value === fallback) delete options[key]
    else options[key] = value
    const layout = { ...p.layout }
    if (Object.keys(options).length > 0) layout.groupOptions = options
    else delete layout.groupOptions
    return { ...p, layout }
  })
}

// The plugin's own options, as PluginOptionsForm hands them back: the whole object, or undefined
// when nothing is left - then the key goes, as on the plugins page (Installed.tsx, setDeep).
export function withOptions(plugins: PluginEntry[], index: number, options: Record<string, unknown> | undefined): PluginEntry[] {
  return plugins.map((p, i) => {
    if (i !== index) return p
    if (options !== undefined) return { ...p, options }
    const { options: _removed, ...without } = p
    return without as PluginEntry
  })
}

/**
 * Every group name of a layout, in a stable order - the order the group colours are taken from
 * (ComponentChip.groupColor), so the stage and the overview colour a group alike. Declared groups
 * plus the ones the frames' areas name: a group exists as soon as a component names it -
 * `layout.groups` only holds direction and gap - so an area's group is missing from that object
 * until someone gives it those, and until then the component's own "Gruppe" select could not offer
 * it. Drag-and-drop would have been the only way in, which is no way at all for anyone working by
 * keyboard. And every group a component actually names: without this last source a group can
 * become invisible while still being in force - delete the area that carried it (or the entry
 * under `layout.groups`) and the member keeps `layout.group`, but the select has no option for it,
 * so it displays as "no group" and cannot be cleared. Measured while tidying up a test project -
 * the yaml still said `group: custom-8` after the area was gone.
 */
export function groupNamesOf(config: QuartzConfig, frames: GridFrameDefinition[]): string[] {
  return [
    ...new Set([
      ...Object.keys(config.layout?.groups ?? {}),
      ...frames.flatMap((f) => f.areas.map((a) => a.group).filter((g): g is string => !!g)),
      ...config.plugins.map((p) => p.layout?.group).filter((g): g is string => !!g)
    ])
  ]
}
