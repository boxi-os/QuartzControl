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
  const rules = [
    `${selector} {`,
    `  display: grid;`,
    `  grid-template-columns: ${style.gridTemplateColumns};`,
    `  grid-template-rows: ${style.gridTemplateRows};`,
    `  row-gap: ${style.rowGap};`,
    `  column-gap: ${style.columnGap};`,
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

// Full generated CSS for a frame: desktop unconditional, then tablet/mobile cascaded via
// max-width media queries in narrowing order so a later, narrower block always wins over an
// earlier, wider one at the same specificity (verified: 800px block comes after and therefore
// overrides the 1200px block at any width <=800px too).
export function buildFrameCss(def: GridFrameDefinition): string {
  const blocks = BREAKPOINTS.map((bp) => {
    const block = buildBreakpointBlock('.qgframe-grid', def.breakpoints[bp], def.areas)
    const maxWidth = BREAKPOINT_MEDIA_MAX_WIDTH[bp]
    return maxWidth ? `@media (max-width: ${maxWidth}px) {\n${block}\n}` : block
  })
  return blocks.join('\n\n')
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
