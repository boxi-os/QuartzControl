// Pure, Node-free CSS-string builders for grid frames - shared between the main-process codegen
// (layoutFrameService, which writes these strings into a generated companion plugin's CSS) and
// the renderer's live preview (FramePreview), so the preview can never drift from what actually
// gets built: both call the exact same functions.
import type {
  FrameBreakpoint,
  GridBreakpointLayout,
  GridFrameArea,
  GridFrameDefinition,
  LegacyGridFrameDefinition
} from './ipc-contract'

// Order matters for buildFrameCss's cascade (desktop base, then narrowing media queries) - reused
// by the editor/preview UI too so the breakpoint list only lives in one place.
export const FRAME_BREAKPOINTS: FrameBreakpoint[] = ['desktop', 'tablet', 'mobile']
const BREAKPOINTS = FRAME_BREAKPOINTS

// Verified against quartz/styles/variables.scss - see the FrameBreakpoint doc comment in
// ipc-contract.ts. Only tablet/mobile need a media query; desktop is the unconditional base.
export const BREAKPOINT_MEDIA_MAX_WIDTH: Partial<Record<FrameBreakpoint, number>> = {
  tablet: 1200,
  mobile: 800
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
    `}`
  ].join('\n')
}

// Full generated CSS for a frame: the outer-grid override first, then desktop unconditional,
// then tablet/mobile cascaded via max-width media queries in narrowing order so a later, narrower
// block always wins over an earlier, wider one at the same specificity (verified: 800px block
// comes after and therefore overrides the 1200px block at any width <=800px too).
export function buildFrameCss(def: GridFrameDefinition): string {
  const blocks = BREAKPOINTS.map((bp) => {
    const block = buildBreakpointBlock('.qgframe-grid', def.breakpoints[bp], def.areas)
    const maxWidth = BREAKPOINT_MEDIA_MAX_WIDTH[bp]
    return maxWidth ? `@media (max-width: ${maxWidth}px) {\n${block}\n}` : block
  })
  return [buildOuterGridOverride(def.frameName), ...blocks].join('\n\n')
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
