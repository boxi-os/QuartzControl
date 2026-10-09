import type { FrameBreakpoint, FrameSlot, GridAreaPlacement, GridBreakpointLayout, GridFrameDefinition, QuartzFrameMeasures } from '@shared/ipc-contract'

/**
 * Quartz's own DefaultFrame as an authored frame - what the Frames tab shows when the project has
 * none of its own, and what "Als eigenen Frame anpassen" copies.
 *
 * Read from quartz/styles/variables.scss ($desktopGrid/$tabletGrid/$mobileGrid, $sidePanelWidth
 * 320px, 5px gaps) and base.scss (`.page` capped at desktop + 300px = 1500px and centred). Quartz
 * puts beforeBody, the page and afterBody into one `center` cell; an authored frame gives each its
 * own row in that column, which stacks the same way. What a copy does not take over is how
 * Quartz's `.sidebar` behaves inside its cell - sticky on desktop, a row on narrow widths - because
 * an authored frame renders its areas as `.qgframe-area-*`, never as `.sidebar` (gridFrameCss.ts).
 * The panel beside the preview says so.
 *
 * The sizes come from the project when it can be read (layoutFrames.quartzMeasures, compiled with
 * its own sass) and fall back to QUARTZ_MEASURES - Quartz's own numbers - when it cannot; the panel
 * says which. Only sizes are taken over, not the arrangement: a grid whose column count differs
 * from Quartz's keeps Quartz's columns, because the placements below are Quartz's areas.
 */

export const QUARTZ_MEASURES: QuartzFrameMeasures = {
  grids: {
    desktop: { columns: ['320px', 'auto', '320px'], rowGap: '5px', columnGap: '5px' },
    tablet: { columns: ['320px', 'auto'], rowGap: '5px', columnGap: '5px' },
    mobile: { columns: ['auto'], rowGap: '5px', columnGap: '5px' }
  },
  breakpoints: { mobile: 800, desktop: 1200 },
  pageMaxWidth: '1500px'
}

/** Whether a breakpoint's measured columns fit Quartz's arrangement (three, two, one). */
export function columnsFit(measures: QuartzFrameMeasures, bp: FrameBreakpoint): boolean {
  return measures.grids[bp].columns.length === QUARTZ_MEASURES.grids[bp].columns.length
}

const AREAS: { slot: FrameSlot; name: string }[] = [
  { slot: 'header', name: 'header' },
  { slot: 'left', name: 'left' },
  { slot: 'right', name: 'right' },
  { slot: 'beforeBody', name: 'before-body' },
  { slot: 'pageBody', name: 'page-body' },
  { slot: 'afterBody', name: 'after-body' },
  { slot: 'footer', name: 'footer' }
]

const id = (slot: FrameSlot): string => `area-${slot}`
const at = (row: number, col: number, rowSpan = 1): GridAreaPlacement => ({ row, col, rowSpan, colSpan: 1 })

function layout(
  measures: QuartzFrameMeasures,
  bp: FrameBreakpoint,
  placements: Partial<Record<FrameSlot, GridAreaPlacement>>
): GridBreakpointLayout {
  const rows = Math.max(...Object.values(placements).map((p) => p!.row + p!.rowSpan - 1))
  const grid = measures.grids[bp]
  // Quartz's `auto` middle column is what an authored frame calls `1fr`: the rest of the width.
  const columnSizes = (columnsFit(measures, bp) ? grid.columns : QUARTZ_MEASURES.grids[bp].columns).map((c) => (c === 'auto' ? '1fr' : c))
  return {
    rows,
    cols: columnSizes.length,
    columnSizes,
    rowGap: grid.rowGap,
    columnGap: grid.columnGap,
    maxWidth: measures.pageMaxWidth ?? QUARTZ_MEASURES.pageMaxWidth ?? undefined,
    align: 'center',
    placements: Object.fromEntries(Object.entries(placements).map(([slot, p]) => [id(slot as FrameSlot), p!]))
  }
}

/** A fresh copy each call: the editor writes into what it is given. */
export function quartzDefaultFrame(frameName: string, measures: QuartzFrameMeasures = QUARTZ_MEASURES): GridFrameDefinition {
  return {
    id: `frame-${Date.now()}`,
    frameName,
    areas: AREAS.map((a) => ({ id: id(a.slot), name: a.name, slot: a.slot })),
    breakpoints: {
      // "sidebar-left header sidebar-right" / "… center …" / "… footer …"
      desktop: layout(measures, 'desktop', {
        left: at(1, 1, 5),
        header: at(1, 2),
        beforeBody: at(2, 2),
        pageBody: at(3, 2),
        afterBody: at(4, 2),
        footer: at(5, 2),
        right: at(1, 3, 5)
      }),
      // The right sidebar drops below the page, the left one keeps its column.
      tablet: layout(measures, 'tablet', {
        left: at(1, 1, 6),
        header: at(1, 2),
        beforeBody: at(2, 2),
        pageBody: at(3, 2),
        afterBody: at(4, 2),
        right: at(5, 2),
        footer: at(6, 2)
      }),
      // One column: left sidebar first, right sidebar after the page.
      mobile: layout(measures, 'mobile', {
        left: at(1, 1),
        header: at(2, 1),
        beforeBody: at(3, 1),
        pageBody: at(4, 1),
        afterBody: at(5, 1),
        right: at(6, 1),
        footer: at(7, 1)
      })
    }
  }
}
