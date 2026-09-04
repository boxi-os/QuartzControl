// Three authored frames - the `frames` part of the package.
//
// Two constraints from schemas.ts shape every value below, and both are worth knowing before
// editing this file:
//
//   1. A track, gap, max-width or padding value may not contain a comma (cssTrackValue /
//      cssGapValue, schemas.ts:253-254). So no `minmax(0, 1fr)` and no `var(--x, fallback)`.
//      `1fr` alone is safe anyway: the generated CSS puts `min-width: 0` on every area, which is
//      the thing `minmax(0, …)` would have bought (docs/decisions/layout-frames.md, finding 2c).
//   2. Every box property is written into *every* breakpoint block by the codegen, so a value set
//      only on desktop does not leak down - but one left out is emitted as its default. They are
//      therefore all stated explicitly here.
//
// Lengths are literal rather than `var(--tpl-space-*)` on purpose: a frame has to still work when
// someone imports the `frames` part without `cssVariables`, and the no-comma rule above means a
// var() reference cannot carry a fallback.

const SLOTS = ['header', 'left', 'right', 'beforeBody', 'pageBody', 'afterBody', 'footer']

/** The seven standard areas, one per slot, named the way the frame builder names them. */
function areas() {
  return SLOTS.map((slot) => ({
    id: `area-${slot}`,
    name: slot.replace(/([A-Z])/g, '-$1').toLowerCase(),
    slot
  }))
}

const place = (row, col, rowSpan = 1, colSpan = 1) => ({ row, col, rowSpan, colSpan })
const hidden = { row: 1, col: 1, rowSpan: 1, colSpan: 1, hidden: true }

/**
 * editorial - the reading frame, used by content pages.
 *
 * Desktop is three columns: navigation, the text at its measure, and the page's own apparatus
 * (table of contents, backlinks, graph). Tablet drops to two and moves the apparatus below the
 * text, because a 260px panel next to a 60ch measure at 1100px leaves neither enough room.
 * Mobile is one column in reading order: what the page *is* comes before what surrounds it.
 */
const editorial = {
  id: 'frame-editorial',
  frameName: 'editorial',
  areas: areas(),
  breakpoints: {
    desktop: {
      rows: 5,
      cols: 3,
      columnSizes: ['240px', '1fr', '260px'],
      rowSizes: ['auto', 'auto', '1fr', 'auto', 'auto'],
      rowGap: '1.5rem',
      columnGap: '2.5rem',
      maxWidth: '1440px',
      align: 'center',
      paddingBlock: '1.5rem',
      paddingInline: '2rem',
      placements: {
        'area-header': place(1, 1, 1, 3),
        'area-left': place(2, 1, 3, 1),
        'area-beforeBody': place(2, 2),
        'area-pageBody': place(3, 2),
        'area-afterBody': place(4, 2),
        'area-right': place(2, 3, 3, 1),
        'area-footer': place(5, 1, 1, 3)
      }
    },
    tablet: {
      rows: 6,
      cols: 2,
      columnSizes: ['210px', '1fr'],
      rowSizes: ['auto', 'auto', '1fr', 'auto', 'auto', 'auto'],
      rowGap: '1.25rem',
      columnGap: '1.75rem',
      maxWidth: '100%',
      align: 'left',
      paddingBlock: '1.25rem',
      paddingInline: '1.5rem',
      placements: {
        'area-header': place(1, 1, 1, 2),
        'area-left': place(2, 1, 4, 1),
        'area-beforeBody': place(2, 2),
        'area-pageBody': place(3, 2),
        'area-afterBody': place(4, 2),
        'area-right': place(5, 2),
        'area-footer': place(6, 1, 1, 2)
      }
    },
    mobile: {
      rows: 7,
      cols: 1,
      columnSizes: ['1fr'],
      rowSizes: ['auto', 'auto', 'auto', '1fr', 'auto', 'auto', 'auto'],
      rowGap: '1rem',
      columnGap: '0',
      maxWidth: '100%',
      align: 'left',
      paddingBlock: '1rem',
      paddingInline: '1rem',
      placements: {
        'area-header': place(1, 1),
        'area-left': place(2, 1),
        'area-beforeBody': place(3, 1),
        'area-pageBody': place(4, 1),
        'area-afterBody': place(5, 1),
        'area-right': place(6, 1),
        'area-footer': place(7, 1)
      }
    }
  }
}

/**
 * index - listing pages (folders, tags).
 *
 * A list of links needs no table of contents and no backlinks panel, so the right slot is hidden
 * outright rather than left empty: `hidden` keeps the area's identity while excluding it from this
 * breakpoint's grid, which is what stops an empty 260px column from reserving space.
 */
const index = {
  id: 'frame-index',
  frameName: 'index',
  areas: areas(),
  breakpoints: {
    desktop: {
      rows: 5,
      cols: 2,
      columnSizes: ['240px', '1fr'],
      rowSizes: ['auto', 'auto', '1fr', 'auto', 'auto'],
      rowGap: '1.5rem',
      columnGap: '2.5rem',
      maxWidth: '1200px',
      align: 'center',
      paddingBlock: '1.5rem',
      paddingInline: '2rem',
      placements: {
        'area-header': place(1, 1, 1, 2),
        'area-left': place(2, 1, 3, 1),
        'area-beforeBody': place(2, 2),
        'area-pageBody': place(3, 2),
        'area-afterBody': place(4, 2),
        'area-right': hidden,
        'area-footer': place(5, 1, 1, 2)
      }
    },
    tablet: {
      rows: 5,
      cols: 2,
      columnSizes: ['200px', '1fr'],
      rowSizes: ['auto', 'auto', '1fr', 'auto', 'auto'],
      rowGap: '1.25rem',
      columnGap: '1.75rem',
      maxWidth: '100%',
      align: 'left',
      paddingBlock: '1.25rem',
      paddingInline: '1.5rem',
      placements: {
        'area-header': place(1, 1, 1, 2),
        'area-left': place(2, 1, 3, 1),
        'area-beforeBody': place(2, 2),
        'area-pageBody': place(3, 2),
        'area-afterBody': place(4, 2),
        'area-right': hidden,
        'area-footer': place(5, 1, 1, 2)
      }
    },
    mobile: {
      rows: 6,
      cols: 1,
      columnSizes: ['1fr'],
      rowSizes: ['auto', 'auto', 'auto', '1fr', 'auto', 'auto'],
      rowGap: '1rem',
      columnGap: '0',
      maxWidth: '100%',
      align: 'left',
      paddingBlock: '1rem',
      paddingInline: '1rem',
      placements: {
        'area-header': place(1, 1),
        'area-left': place(2, 1),
        'area-beforeBody': place(3, 1),
        'area-pageBody': place(4, 1),
        'area-afterBody': place(5, 1),
        'area-right': hidden,
        'area-footer': place(6, 1)
      }
    }
  }
}

/**
 * focus - one column, nothing around it. Used by the 404 page, where an explorer tree and a graph
 * are decoration on top of an error.
 */
const focus = {
  id: 'frame-focus',
  frameName: 'focus',
  areas: areas(),
  breakpoints: {
    desktop: {
      rows: 3,
      cols: 1,
      columnSizes: ['1fr'],
      rowSizes: ['auto', '1fr', 'auto'],
      rowGap: '2.5rem',
      columnGap: '0',
      maxWidth: '680px',
      align: 'center',
      paddingBlock: '4rem',
      paddingInline: '1.5rem',
      placements: {
        'area-header': place(1, 1),
        'area-left': hidden,
        'area-right': hidden,
        'area-beforeBody': hidden,
        'area-pageBody': place(2, 1),
        'area-afterBody': hidden,
        'area-footer': place(3, 1)
      }
    },
    tablet: {
      rows: 3,
      cols: 1,
      columnSizes: ['1fr'],
      rowSizes: ['auto', '1fr', 'auto'],
      rowGap: '2rem',
      columnGap: '0',
      maxWidth: '640px',
      align: 'center',
      paddingBlock: '3rem',
      paddingInline: '1.5rem',
      placements: {
        'area-header': place(1, 1),
        'area-left': hidden,
        'area-right': hidden,
        'area-beforeBody': hidden,
        'area-pageBody': place(2, 1),
        'area-afterBody': hidden,
        'area-footer': place(3, 1)
      }
    },
    mobile: {
      rows: 3,
      cols: 1,
      columnSizes: ['1fr'],
      rowSizes: ['auto', '1fr', 'auto'],
      rowGap: '1.5rem',
      columnGap: '0',
      maxWidth: '100%',
      align: 'left',
      paddingBlock: '2rem',
      paddingInline: '1rem',
      placements: {
        'area-header': place(1, 1),
        'area-left': hidden,
        'area-right': hidden,
        'area-beforeBody': hidden,
        'area-pageBody': place(2, 1),
        'area-afterBody': hidden,
        'area-footer': place(3, 1)
      }
    }
  }
}

export const FRAMES = [editorial, index, focus]

/** The project's own breakpoint widths - see docs/decisions/layout-frames.md, finding 3. */
export const BREAKPOINT_WIDTHS = { tablet: 1100, mobile: 720 }
