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
//
// ---------------------------------------------------------------------------------------------
// The column system (2026-09-04)
//
// All three frames share one desktop grid: **twelve equal columns, 20px gutters, 20px outer
// padding, capped at 1440px**. That is 1400px of usable width, eleven 20px gutters, and therefore
// a column of (1400 - 220) / 12 = 98.33px. The three blocks snap to it:
//
//     left  cols 1-3    3 × 98.33 + 2 × 20  = 335px
//     body  cols 4-9    6 × 98.33 + 5 × 20  = 690px
//     right cols 10-12  3 × 98.33 + 2 × 20  = 335px
//
// 690px of text at 1rem is about 72 characters, which is why no stylesheet caps the measure any
// more (base.scss says so at length): the grid decides it, in one place.
//
// The right column is now present on *every* page type on desktop - listing pages and the error
// page included, where it stays empty. That is deliberate: the content column then starts at the
// same x on every page, so navigating from an article to its folder does not shift the text.
//
// Tablet keeps the twelve columns and drops the right *column*: `right` moves below the content
// instead of vanishing, because a 1000px screen still wants a table of contents. Mobile is a
// single column in reading order.

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

/** Twelve equal columns - the one track list every breakpoint of every frame uses. */
const TWELVE = Array.from({ length: 12 }, () => '1fr')

/** The box: same gutters and insets on all three sizes, only the cap and the alignment change. */
const box = (maxWidth, align) => ({
  columnSizes: TWELVE,
  rowGap: '20px',
  columnGap: '20px',
  maxWidth,
  align,
  paddingBlock: '20px',
  paddingInline: '20px'
})

/**
 * editorial - the reading frame, used by content pages.
 *
 * Desktop is 3 / 6 / 3: navigation, the text, and the page's own apparatus (table of contents,
 * backlinks, graph). Tablet is 3 / 9 with the apparatus moved below the text. Mobile is one column
 * in reading order: what the page *is* comes before what surrounds it.
 */
const editorial = {
  id: 'frame-editorial',
  frameName: 'editorial',
  areas: areas(),
  breakpoints: {
    desktop: {
      rows: 5,
      cols: 12,
      rowSizes: ['auto', 'auto', '1fr', 'auto', 'auto'],
      ...box('1440px', 'center'),
      placements: {
        'area-header': place(1, 1, 1, 12),
        'area-left': place(2, 1, 3, 3),
        'area-beforeBody': place(2, 4, 1, 6),
        'area-pageBody': place(3, 4, 1, 6),
        'area-afterBody': place(4, 4, 1, 6),
        'area-right': place(2, 10, 3, 3),
        'area-footer': place(5, 1, 1, 12)
      }
    },
    tablet: {
      rows: 6,
      cols: 12,
      rowSizes: ['auto', 'auto', '1fr', 'auto', 'auto', 'auto'],
      ...box('100%', 'left'),
      placements: {
        'area-header': place(1, 1, 1, 12),
        'area-left': place(2, 1, 4, 3),
        'area-beforeBody': place(2, 4, 1, 9),
        'area-pageBody': place(3, 4, 1, 9),
        'area-afterBody': place(4, 4, 1, 9),
        'area-right': place(5, 4, 1, 9),
        'area-footer': place(6, 1, 1, 12)
      }
    },
    mobile: {
      rows: 7,
      cols: 12,
      rowSizes: ['auto', 'auto', 'auto', '1fr', 'auto', 'auto', 'auto'],
      ...box('100%', 'left'),
      placements: {
        'area-header': place(1, 1, 1, 12),
        'area-left': place(2, 1, 1, 12),
        'area-beforeBody': place(3, 1, 1, 12),
        'area-pageBody': place(4, 1, 1, 12),
        'area-afterBody': place(5, 1, 1, 12),
        'area-right': place(6, 1, 1, 12),
        'area-footer': place(7, 1, 1, 12)
      }
    }
  }
}

/**
 * index - listing pages (folders, tags, bases).
 *
 * Geometrically the same as `editorial` on desktop, and that is the point: a folder page keeps the
 * empty right column so its list of links starts exactly where the article text starts. It is a
 * separate frame because the two page types are free to diverge again - and because the right slot
 * is genuinely dropped here below desktop, where `editorial` still has an outline to show.
 */
const index = {
  id: 'frame-index',
  frameName: 'index',
  areas: areas(),
  breakpoints: {
    desktop: {
      rows: 5,
      cols: 12,
      rowSizes: ['auto', 'auto', '1fr', 'auto', 'auto'],
      ...box('1440px', 'center'),
      placements: {
        'area-header': place(1, 1, 1, 12),
        'area-left': place(2, 1, 3, 3),
        'area-beforeBody': place(2, 4, 1, 6),
        'area-pageBody': place(3, 4, 1, 6),
        'area-afterBody': place(4, 4, 1, 6),
        'area-right': place(2, 10, 3, 3),
        'area-footer': place(5, 1, 1, 12)
      }
    },
    tablet: {
      rows: 5,
      cols: 12,
      rowSizes: ['auto', 'auto', '1fr', 'auto', 'auto'],
      ...box('100%', 'left'),
      placements: {
        'area-header': place(1, 1, 1, 12),
        'area-left': place(2, 1, 3, 3),
        'area-beforeBody': place(2, 4, 1, 9),
        'area-pageBody': place(3, 4, 1, 9),
        'area-afterBody': place(4, 4, 1, 9),
        'area-right': hidden,
        'area-footer': place(5, 1, 1, 12)
      }
    },
    mobile: {
      rows: 6,
      cols: 12,
      rowSizes: ['auto', 'auto', 'auto', '1fr', 'auto', 'auto'],
      ...box('100%', 'left'),
      placements: {
        'area-header': place(1, 1, 1, 12),
        'area-left': place(2, 1, 1, 12),
        'area-beforeBody': place(3, 1, 1, 12),
        'area-pageBody': place(4, 1, 1, 12),
        'area-afterBody': place(5, 1, 1, 12),
        'area-right': hidden,
        'area-footer': place(6, 1, 1, 12)
      }
    }
  }
}

/**
 * focus - the error page.
 *
 * Same twelve columns and the same 3 / 6 / 3 split, so a 404 is recognisably the same site rather
 * than a differently-shaped page. Both side columns stay reserved and empty (layout.mjs empties
 * their component lists, so nothing is even built), and `beforeBody` / `afterBody` are hidden
 * outright: breadcrumbs and backlinks on an error are decoration on top of a dead end.
 *
 * The vertical breathing room a 404 wants is *not* set here: the frame's paddingBlock also moves
 * the header, and a site whose logo sits 60px lower on the error page looks broken rather than
 * calm. It lives in page-404.scss, inside the body area, where it belongs.
 */
const focus = {
  id: 'frame-focus',
  frameName: 'focus',
  areas: areas(),
  breakpoints: {
    desktop: {
      rows: 3,
      cols: 12,
      rowSizes: ['auto', '1fr', 'auto'],
      ...box('1440px', 'center'),
      placements: {
        'area-header': place(1, 1, 1, 12),
        'area-left': place(2, 1, 1, 3),
        'area-beforeBody': hidden,
        'area-pageBody': place(2, 4, 1, 6),
        'area-afterBody': hidden,
        'area-right': place(2, 10, 1, 3),
        'area-footer': place(3, 1, 1, 12)
      }
    },
    tablet: {
      rows: 3,
      cols: 12,
      rowSizes: ['auto', '1fr', 'auto'],
      ...box('100%', 'left'),
      placements: {
        'area-header': place(1, 1, 1, 12),
        'area-left': place(2, 1, 1, 3),
        'area-beforeBody': hidden,
        'area-pageBody': place(2, 4, 1, 9),
        'area-afterBody': hidden,
        'area-right': hidden,
        'area-footer': place(3, 1, 1, 12)
      }
    },
    mobile: {
      rows: 3,
      cols: 12,
      rowSizes: ['auto', '1fr', 'auto'],
      ...box('100%', 'left'),
      placements: {
        'area-header': place(1, 1, 1, 12),
        'area-left': hidden,
        'area-beforeBody': hidden,
        'area-pageBody': place(2, 1, 1, 12),
        'area-afterBody': hidden,
        'area-right': hidden,
        'area-footer': place(3, 1, 1, 12)
      }
    }
  }
}

export const FRAMES = [editorial, index, focus]

/**
 * The project's own breakpoint widths - see docs/decisions/layout-frames.md, finding 3.
 *
 * `mobile` is 800 and not a rounder number because the explorer plugin's own stylesheet hard-codes
 * `@media all and (max-width: 800px)` for its drawer. At the old 720 the two disagreed: between
 * 721 and 800px the explorer was already a hamburger while the frame still called it tablet, so
 * `.desktop-only` components (recent notes, the graph, the sidebar note) were still rendered and
 * `.mobile-only` ones were not. Aligning the frame to the plugin costs nothing and removes the
 * whole 80px band in which the two layouts contradicted each other.
 */
export const BREAKPOINT_WIDTHS = { tablet: 1100, mobile: 800 }
