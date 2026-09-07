// Pure, Node-free CSS-string builders for grid frames - shared between the main-process codegen
// (layoutFrameService, which writes these strings into a generated companion plugin's CSS) and
// the renderer's live preview (FramePreview), so the preview can never drift from what actually
// gets built: both call the exact same functions.
import type {
  FrameBreakpoint,
  FrameBreakpointWidths,
  GridBreakpointLayout,
  GridFrameArea,
  GridFrameDefinition,
  LegacyGridFrameDefinition
} from './ipc-contract'

// Order matters for buildFrameCss's cascade (desktop base, then narrowing media queries) - reused
// by the editor/preview UI too so the breakpoint list only lives in one place.
export const FRAME_BREAKPOINTS: FrameBreakpoint[] = ['desktop', 'tablet', 'mobile']
const BREAKPOINTS = FRAME_BREAKPOINTS

// Quartz's own thresholds, read from quartz/styles/variables.scss ($breakpoints: mobile 800px,
// desktop 1200px) - see the FrameBreakpoint doc comment in ipc-contract.ts. They are the default a
// project starts on, not a constant: buildFrameCss takes whatever widths the project configured.
// Only tablet/mobile need a media query; desktop is the unconditional base.
export const DEFAULT_FRAME_BREAKPOINT_WIDTHS: FrameBreakpointWidths = {
  tablet: 1200,
  mobile: 800
}

export function isDefaultBreakpointWidths(widths: FrameBreakpointWidths): boolean {
  return widths.tablet === DEFAULT_FRAME_BREAKPOINT_WIDTHS.tablet && widths.mobile === DEFAULT_FRAME_BREAKPOINT_WIDTHS.mobile
}

function trackSizeAt(sizes: string[] | undefined, index: number, fallback: string): string {
  const value = sizes?.[index]?.trim()
  return value ? value : fallback
}

function lineNamePrefix(names: Record<number, string[]> | undefined, index: number): string {
  const list = names?.[index]
  return list && list.length > 0 ? `[${list.join(' ')}] ` : ''
}

// Builds a `grid-template-columns`/`grid-template-rows` value with inline `[line-name]` prefixes.
// There are `count + 1` line positions (0-based) around `count` tracks.
export function buildTrackList(
  sizes: string[] | undefined,
  count: number,
  fallback: string,
  lineNames: Record<number, string[]> | undefined
): string {
  const parts: string[] = []
  for (let i = 0; i < count; i++) {
    parts.push(lineNamePrefix(lineNames, i) + trackSizeAt(sizes, i, fallback))
  }
  parts.push(lineNamePrefix(lineNames, count))
  return parts.join(' ').trim()
}

function isPlaced(layout: GridBreakpointLayout, areaId: string): boolean {
  const placement = layout.placements[areaId]
  return !!placement && !placement.hidden
}

// 1-based row/col, matching CSS grid-row/grid-column line numbers. Cells not covered by any
// visible-on-this-breakpoint area become "." (an intentional empty gap).
export function buildTemplateAreas(layout: GridBreakpointLayout, areas: GridFrameArea[]): string {
  const grid: string[][] = Array.from({ length: layout.rows }, () => Array.from({ length: layout.cols }, () => '.'))
  for (const area of areas) {
    const placement = layout.placements[area.id]
    if (!placement || placement.hidden) continue
    for (let r = placement.row; r < placement.row + placement.rowSpan; r++) {
      for (let c = placement.col; c < placement.col + placement.colSpan; c++) {
        if (r >= 1 && r <= layout.rows && c >= 1 && c <= layout.cols) grid[r - 1][c - 1] = area.name
      }
    }
  }
  return grid.map((row) => `"${row.join(' ')}"`).join('\n      ')
}

export interface GridStyle {
  display: 'grid'
  gridTemplateColumns: string
  gridTemplateRows: string
  gridTemplateAreas: string
  rowGap: string
  columnGap: string
}

// The frame container's own box - separate from GridStyle because it describes the box the grid
// sits in rather than the grid itself, and the previews apply it to a wrapper.
export interface FrameBoxStyle {
  width: string
  maxWidth: string
  marginInline: string
  paddingBlock: string
  paddingInline: string
}

/**
 * The box metrics for one breakpoint, with every property spelled out.
 *
 * Alignment is auto margins rather than `justify-self`, because a frame is a grid *item* in
 * Quartz's `#quartz-body` (see buildOuterGridOverride) and auto margins take precedence over an
 * item's stretch.
 *
 * `width: 100%` is why they are safe. An auto margin makes a grid item shrink-to-fit rather than
 * stretch, so with `margin-inline: auto` and no cap the frame collapsed to its *max-content* width
 * and left the rest of the page empty - measured in a real build at a 1728px viewport: 778px wide,
 * centred, with `1fr 2fr 2fr` resolving to 149/298/298px instead of filling. A definite width takes
 * the shrink-to-fit path away, and an auto margin then only has to distribute what a `maxWidth`
 * actually leaves over (verified: 1728px with no cap, 900px centred at x=414 with one). The editor
 * hint still says alignment needs a maximum width, because that part is unchanged - with no cap
 * there is simply nothing left to distribute.
 */
export function buildFrameBox(layout: GridBreakpointLayout): FrameBoxStyle {
  const maxWidth = layout.maxWidth?.trim()
  const align = layout.align ?? 'left'
  const marginInline = align === 'center' ? 'auto' : align === 'right' ? 'auto 0' : '0'
  return {
    width: '100%',
    maxWidth: maxWidth || 'none',
    marginInline,
    paddingBlock: layout.paddingBlock?.trim() || '0',
    paddingInline: layout.paddingInline?.trim() || '0'
  }
}

// The inline-style equivalent of a breakpoint block's grid-container rules - used directly by
// FramePreview so its rendering is a truthful reconstruction, not a hand-approximated one.
export function buildGridStyle(layout: GridBreakpointLayout, areas: GridFrameArea[]): GridStyle {
  return {
    display: 'grid',
    gridTemplateColumns: buildTrackList(layout.columnSizes, layout.cols, '1fr', layout.columnLineNames),
    gridTemplateRows: buildTrackList(layout.rowSizes, layout.rows, 'auto', layout.rowLineNames),
    gridTemplateAreas: buildTemplateAreas(layout, areas),
    rowGap: layout.rowGap,
    columnGap: layout.columnGap
  }
}

// One breakpoint's full CSS rule set for `selector`: the grid container itself, a `grid-area`
// rule per visible area, and an explicit `display: none` for every area that's absent/hidden on
// this breakpoint - without that, an area omitted from grid-template-areas would still be placed
// as an unclaimed auto-placed grid item instead of disappearing.
export function buildBreakpointBlock(selector: string, layout: GridBreakpointLayout, areas: GridFrameArea[]): string {
  const style = buildGridStyle(layout, areas)
  const box = buildFrameBox(layout)
  const rules = [
    `${selector} {`,
    `  display: grid;`,
    `  grid-template-columns: ${style.gridTemplateColumns};`,
    `  grid-template-rows: ${style.gridTemplateRows};`,
    `  row-gap: ${style.rowGap};`,
    `  column-gap: ${style.columnGap};`,
    // Written out even when unset: the narrower breakpoints are media-query overrides of this same
    // selector, so a value only present on desktop would otherwise still apply on mobile.
    //
    // border-box because the editor's field says "maximum width", and Quartz sets no global
    // box-sizing for this element: measured in a real build, a 900px cap with 3rem of padding
    // produced a 996px-wide frame, which is not what anyone typing 900 means.
    `  box-sizing: border-box;`,
    // A definite width, or an auto margin from `align` would collapse the frame to its content -
    // see buildFrameBox. Written out per breakpoint like everything else here.
    `  width: ${box.width};`,
    `  max-width: ${box.maxWidth};`,
    `  margin-inline: ${box.marginInline};`,
    `  padding-block: ${box.paddingBlock};`,
    `  padding-inline: ${box.paddingInline};`,
    `  grid-template-areas:`,
    `      ${style.gridTemplateAreas};`,
    `}`
  ]
  for (const area of areas) {
    const visible = isPlaced(layout, area.id)
    rules.push(visible ? `.qgframe-area-${area.name} { grid-area: ${area.name}; }` : `.qgframe-area-${area.name} { display: none; }`)
  }
  return rules.join('\n')
}

function escapeAttrValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

// A custom frame renders as a single, un-positioned child inside Quartz core's `#quartz-body`
// (see quartz/components/Body.tsx). Quartz's *default* `.page > #quartz-body` rule (base.scss)
// lays out a fixed desktop grid-template-columns of "<sidebar> auto <sidebar>" with no grid-area
// assigned to our child, so without an override it gets auto-placed into that grid's first
// (narrow, sidebar-width) cell instead of spanning the row - reproduced by hand: content renders,
// but confined to a slim column. Quartz's own built-in "full-width"/"minimal" frames dodge exactly
// this via a `.page[data-frame="..."] > #quartz-body` override, whose two class/attribute
// selectors outrank the base rule's one-class specificity regardless of source order or media
// queries (verified against base.scss's own full-width/minimal blocks) - mirrored here per custom
// frame, keyed off `frameName` since that's the exact value renderPage.tsx sets `data-frame` to.
function buildOuterGridOverride(frameName: string): string {
  const page = `.page[data-frame="${escapeAttrValue(frameName)}"]`
  const selector = `${page} > #quartz-body`
  return [
    // Quartz caps every page at `max-width: calc(<desktop breakpoint> + 300px)` = 1500px
    // (base.scss's `.page` rule), which its own "full-width" frame does not lift either. For an
    // authored frame that cap is a second, invisible width limit next to the one the editor offers:
    // measured at a 1728px viewport, a frame with no maximum width still stopped at 1500px. Lifting
    // it here makes the frame's own `max-width` the single place a width limit is decided - leave it
    // blank and the frame really does use the whole window.
    `${page} {`,
    `  max-width: none;`,
    `}`,
    `${selector} {`,
    `  grid-template-columns: auto;`,
    `  grid-template-rows: auto;`,
    `  grid-template-areas: "qgframe-root";`,
    `}`,
    `${selector} > .qgframe-grid {`,
    `  grid-area: qgframe-root;`,
    `}`,
    // An `fr` track is `minmax(auto, 1fr)`, so a track can never shrink below its item's min-content
    // and the declared proportions quietly stop holding once the viewport gets narrow - measured at
    // 390px, `1fr 2fr 2fr` rendered as 149/71/106px because the first area's content would not go
    // below 149px. That contradicts both the editor's own preview (whose placeholder areas have no
    // such floor) and the point of having per-breakpoint track sizes at all. Overflow is the
    // trade-off, and Quartz's own content styles already handle it: with this rule and a long
    // unbreakable code line in an area, the page still had no horizontal scroll at 390px.
    `${selector} .qgframe-area {`,
    `  min-width: 0;`,
    `  min-height: 0;`,
    `}`,
    // The area holding pageBody also carries `center`, so the client scripts that look for it keep
    // working (see layoutFrameService's codegen). That class brings two of quartz's own rules with
    // it - `margin-inline: auto` and `min-width: 100%` from base.scss - and the auto margin makes a
    // grid item shrink-to-fit, exactly the trap documented for the frame box itself. Measured: an
    // area sitting in a 796px column rendered 466px wide and centred in it, on every page of a site
    // using an authored frame. `width: 100%` takes that route away again, and the margins go back
    // to zero so `align` on the frame box stays the only thing that positions anything.
    `${selector} .qgframe-area.center {`,
    `  width: 100%;`,
    `  max-width: none;`,
    `  margin-inline: 0;`,
    `}`
  ].join('\n')
}

/**
 * Retargets the handful of Quartz core rules that switch on *its* breakpoints, so a project using
 * its own widths does not end up with the frame reflowing at one width and the page's own chrome at
 * another. Emitted only when the widths actually differ from Quartz's - at the defaults the two
 * agree and there is nothing to restate.
 *
 * The list is exhaustive, not a sample: every consumer of `$mobile`/`$tablet`/`$desktop` in a real
 * Quartz 5 checkout was grepped, and outside the `.page > #quartz-body` grid an authored frame
 * already replaces, only these are left - `.desktop-only`/`.mobile-only` (the DesktopOnly and
 * MobileOnly wrapper components), `#quartz-body`'s sub-desktop padding, plus `html`'s
 * scroll-padding and one popover rule, which are cosmetic and deliberately left alone. No TS or JS
 * in Quartz reads a breakpoint at all, so CSS is the whole surface.
 *
 * Everything here is scoped by `.page[data-frame="<name>"]`, which outranks core's bare
 * `.desktop-only` (and `.desktop-only.flex-component`) at any source order - so no core file is
 * touched, and pages rendered with a *built-in* frame keep Quartz's own widths, which is right:
 * their layout comes from Quartz, not from here.
 */
function buildQuartzBreakpointCompat(frameName: string, widths: FrameBreakpointWidths): string {
  if (isDefaultBreakpointWidths(widths)) return ''
  const page = `.page[data-frame="${escapeAttrValue(frameName)}"]`
  return [
    // core: `@media all and not ($desktop) { padding: 0 1rem }` on #quartz-body. Restated against
    // the frame's own tablet threshold, which also makes it agree with the frame's media queries at
    // the exact boundary pixel - core's `not (min-width: N)` excludes N, our `max-width: N` includes it.
    `${page} > #quartz-body {`,
    `  padding: 0;`,
    `}`,
    `@media (max-width: ${widths.tablet}px) {`,
    `${page} > #quartz-body {`,
    `  padding: 0 1rem;`,
    `}`,
    `}`,
    // core: `.desktop-only`/`.mobile-only` flip at $mobile. Both halves are restated, not just the
    // media half - a rule that only overrode inside the query would lose to core's own base
    // declaration in the band between the two mobile thresholds.
    `${page} .desktop-only {`,
    `  display: contents;`,
    `}`,
    `${page} .desktop-only.flex-component {`,
    `  display: flex;`,
    `}`,
    `${page} .mobile-only, ${page} .mobile-only.flex-component {`,
    `  display: none;`,
    `}`,
    `@media (max-width: ${widths.mobile}px) {`,
    `${page} .desktop-only, ${page} .desktop-only.flex-component {`,
    `  display: none;`,
    `}`,
    `${page} .mobile-only {`,
    `  display: contents;`,
    `}`,
    `${page} .mobile-only.flex-component {`,
    `  display: flex;`,
    `}`,
    `}`
  ].join('\n')
}

// Full generated CSS for a frame: the outer-grid override first, then desktop unconditional,
// then tablet/mobile cascaded via max-width media queries in narrowing order so a later, narrower
// block always wins over an earlier, wider one at the same specificity (verified: 800px block
// comes after and therefore overrides the 1200px block at any width <=800px too).
export function buildFrameCss(def: GridFrameDefinition, widths: FrameBreakpointWidths = DEFAULT_FRAME_BREAKPOINT_WIDTHS): string {
  const blocks = BREAKPOINTS.map((bp) => {
    const block = buildBreakpointBlock('.qgframe-grid', def.breakpoints[bp], def.areas)
    const maxWidth = bp === 'desktop' ? undefined : widths[bp]
    return maxWidth ? `@media (max-width: ${maxWidth}px) {\n${block}\n}` : block
  })
  const compat = buildQuartzBreakpointCompat(def.frameName, widths)
  return [buildOuterGridOverride(def.frameName), ...(compat ? [compat] : []), ...blocks].join('\n\n')
}

function isLegacyDefinition(def: unknown): def is LegacyGridFrameDefinition {
  return typeof def === 'object' && def !== null && typeof (def as { rows?: unknown }).rows === 'number'
}

// Upgrades a pre-breakpoint on-disk frame.json (flat rows/cols/gap/areas-with-geometry) into the
// current shape: `desktop` gets the old geometry as-is, `tablet`/`mobile` start as copies of it
// so nothing visually changes until the user deliberately customizes a breakpoint. Idempotent -
// a definition already in the new shape passes through untouched.
export function migrateGridFrameDefinition(def: GridFrameDefinition | LegacyGridFrameDefinition): GridFrameDefinition {
  if (!isLegacyDefinition(def)) return def as GridFrameDefinition

  const areas: GridFrameArea[] = def.areas.map((a) => ({ id: a.id, name: a.name, slot: a.slot }))
  const placements: GridBreakpointLayout['placements'] = {}
  for (const a of def.areas) {
    placements[a.id] = { row: a.row, col: a.col, rowSpan: a.rowSpan, colSpan: a.colSpan }
  }
  const desktop: GridBreakpointLayout = {
    rows: def.rows,
    cols: def.cols,
    rowGap: def.gap,
    columnGap: def.gap,
    placements
  }
  return {
    id: def.id,
    frameName: def.frameName,
    areas,
    breakpoints: {
      desktop,
      tablet: { ...desktop, placements: { ...placements } },
      mobile: { ...desktop, placements: { ...placements } }
    }
  }
}

// Which groups a position holds, in the order quartz will hand them to a frame.
//
// A frame area can only render what quartz sorted into one of its six positions
// (config-loader.ts's buildLayoutForEntries), so a frame with more component areas than that needs
// a second key - and quartz has one: `layout.group` collapses a position's grouped entries into a
// single Flex component (resolveGroups), leaving the ungrouped ones as themselves. Measured on a
// real build, a position holding one group arrived as [MobileOnly, Flex, ExplorerComponent]: the
// group is a function literally named "Flex" (quartz builds itself with esbuild's `keepNames`),
// and `displayName` was undefined on every entry, so that name is the only identity there is.
//
// Rank is therefore how a group is addressed, and this is where the rank comes from. It follows
// resolveGroups and needs nothing but the config: members sorted by their own priority, each group
// taking the position of its first member unless `layout.groups.<name>.priority` says otherwise,
// then a stable sort by that. Plugins with no `layout` at all (quartz places those by their
// manifest's defaultPosition) cannot carry a group and so cannot appear here - which is why the
// frame counts Flexes rather than array positions.
//
// One thing it cannot follow, and saying so is the point: buildLayoutForEntries skips an entry
// whose name is in no component registry (config-loader.ts:762, :773), and whether a name is
// registered is knowable only inside quartz's own build. A plugin that declares `layout` without
// being a component plugin, or one whose install failed, is such an entry - quartz renders no flex
// for it, this counts its group, and the frame then falls back for that position with the message
// pickGroupOrder writes. A fallback, not a swap; the count is what disagrees, never the order.
//
// `enabled` is read the way the *loader* reads it - `filter((e) => e.enabled)` on the parsed yaml,
// so anything falsy is out. Two things about that, both measured rather than assumed. Quartz does
// not agree with itself: the loader drops an entry with no `enabled` key, while its own CLI treats
// the same entry as on (`entry.enabled !== false`, plugin-git-handlers.js:1574), and configService
// follows the CLI when it reads (`enabled: p.enabled ?? true`). So by the time a config reaches
// here the key is always a boolean and this filter cannot actually see the disagreement - it is
// written this way because the frame's copy is a copy of what the *loader* builds, and because the
// next caller may not come through configService.
export interface GroupLayoutCandidate {
  // The page type this ordering belongs to, or null for the config as a whole. Only ever read by
  // a human out of the generated frame - the frame itself cannot tell which page type it is
  // rendering (PageFrameProps carries the resolved lists and nothing else), which is the whole
  // reason there is a list of candidates instead of one ordering.
  pageType: string | null
  order: Record<string, string[]>
}

// Every group ordering this config can produce, because quartz builds a layout *per page type*:
// `loadQuartzLayout` takes the enabled plugins, drops the ones a page type's `exclude` names,
// runs buildLayoutForEntries (and with it resolveGroups) on that shorter list, and only then
// empties the positions the page type cleared with `[]`. So both the number of flexes in a
// position and their order are properties of the page type, not of the config - and the app's
// "Page types" tab writes exactly those two keys.
//
// The frame gets all of these and picks the one that fits what it was handed (see the generated
// pickGroupOrder). Identical orderings collapse: a page type that only sets `template`, or that
// excludes something with no group, is not a second candidate.
export function groupLayoutCandidates(config: {
  plugins: Array<{ name: string; enabled?: boolean; layout?: { position: string; priority: number; group?: string } }>
  layout?: { groups?: Record<string, { priority?: number }>; byPageType?: Record<string, { exclude?: string[]; positions?: Record<string, unknown> }> }
}): GroupLayoutCandidate[] {
  const candidates: GroupLayoutCandidate[] = [{ pageType: null, order: groupOrderByPosition(config) }]
  // Key order follows whichever plugin came first, so two equal orderings can serialise
  // differently - the positions get sorted before they are compared.
  const key = (order: Record<string, string[]>): string =>
    JSON.stringify(Object.keys(order).sort().map((p) => [p, order[p]]))
  const seen = new Set([key(candidates[0].order)])
  for (const [pageType, override] of Object.entries(config.layout?.byPageType ?? {})) {
    const excluded = new Set(override?.exclude ?? [])
    const plugins = excluded.size > 0 ? config.plugins.filter((p) => !excluded.has(p.name)) : config.plugins
    const order = groupOrderByPosition({ plugins, layout: config.layout })
    // `positions` is only ever meaningful as an empty array - the position is cleared for this
    // page type, so nothing arrives there and no group of it can render (config-loader.ts:673-681).
    // Dropped rather than emptied, so "no groups here" has one spelling and the dedupe below sees
    // two equal orderings as equal.
    for (const [position, components] of Object.entries(override?.positions ?? {})) {
      if (Array.isArray(components) && components.length === 0) delete order[position]
    }
    if (seen.has(key(order))) continue
    seen.add(key(order))
    candidates.push({ pageType, order })
  }
  return candidates
}

export function groupOrderByPosition(config: {
  plugins: Array<{ enabled?: boolean; layout?: { position: string; priority: number; group?: string } }>
  layout?: { groups?: Record<string, { priority?: number }> }
}): Record<string, string[]> {
  const groupConfigs = config.layout?.groups ?? {}
  const result: Record<string, string[]> = {}
  const members = config.plugins
    .filter((p) => !!p.enabled && p.layout?.group)
    .map((p) => p.layout!)
    .sort((a, b) => a.priority - b.priority)
  for (const member of members) {
    const list = (result[member.position] ??= [])
    if (!list.includes(member.group!)) list.push(member.group!)
  }
  for (const position of Object.keys(result)) {
    // Stable, like resolveGroups' own sort - two groups on the same priority keep the order their
    // first members gave them.
    result[position] = result[position]
      .map((name, index) => ({ name, index, priority: groupConfigs[name]?.priority ?? priorityOfFirstMember(members, position, name) }))
      .sort((a, b) => a.priority - b.priority || a.index - b.index)
      .map((g) => g.name)
  }
  return result
}

function priorityOfFirstMember(
  members: Array<{ position: string; priority: number; group?: string }>,
  position: string,
  group: string
): number {
  return members.find((m) => m.position === position && m.group === group)?.priority ?? 50
}
