import type { FrameSlot, GridAreaPlacement, GridBreakpointLayout, GridFrameDefinition } from '@shared/ipc-contract'

/**
 * Quartz's own DefaultFrame as an authored frame - what the Frames tab shows when the project has
 * none of its own, and what "Als eigenes Frame anpassen" copies.
 *
 * Read from quartz/styles/variables.scss ($desktopGrid/$tabletGrid/$mobileGrid, $sidePanelWidth
 * 320px, 5px gaps) and base.scss (`.page` capped at desktop + 300px = 1500px and centred). Quartz
 * puts beforeBody, the page and afterBody into one `center` cell; an authored frame gives each its
 * own row in that column, which stacks the same way. What a copy does not take over is how
 * Quartz's `.sidebar` behaves inside its cell - sticky on desktop, a row on narrow widths - because
 * an authored frame renders its areas as `.qgframe-area-*`, never as `.sidebar` (gridFrameCss.ts).
 * The panel beside the preview says so.
 */

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

function layout(columnSizes: string[], placements: Partial<Record<FrameSlot, GridAreaPlacement>>): GridBreakpointLayout {
  const rows = Math.max(...Object.values(placements).map((p) => p!.row + p!.rowSpan - 1))
  return {
    rows,
    cols: columnSizes.length,
    columnSizes,
    rowGap: '5px',
    columnGap: '5px',
    maxWidth: '1500px',
    align: 'center',
    placements: Object.fromEntries(Object.entries(placements).map(([slot, p]) => [id(slot as FrameSlot), p!]))
  }
}

/** A fresh copy each call: the editor writes into what it is given. */
export function quartzDefaultFrame(frameName: string): GridFrameDefinition {
  return {
    id: `frame-${Date.now()}`,
    frameName,
    areas: AREAS.map((a) => ({ id: id(a.slot), name: a.name, slot: a.slot })),
    breakpoints: {
      // "sidebar-left header sidebar-right" / "… center …" / "… footer …"
      desktop: layout(['320px', '1fr', '320px'], {
        left: at(1, 1, 5),
        header: at(1, 2),
        beforeBody: at(2, 2),
        pageBody: at(3, 2),
        afterBody: at(4, 2),
        footer: at(5, 2),
        right: at(1, 3, 5)
      }),
      // The right sidebar drops below the page, the left one keeps its column.
      tablet: layout(['320px', '1fr'], {
        left: at(1, 1, 6),
        header: at(1, 2),
        beforeBody: at(2, 2),
        pageBody: at(3, 2),
        afterBody: at(4, 2),
        right: at(5, 2),
        footer: at(6, 2)
      }),
      // One column: left sidebar first, right sidebar after the page.
      mobile: layout(['1fr'], {
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
