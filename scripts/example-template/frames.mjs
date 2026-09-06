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
// The column system (2026-09-06)
//
// All three frames share one desktop grid: **twelve columns, a 4rem gutter, 20px outer padding,
// capped at 1440px** - and the two side columns are a fixed 300px rather than a share of what is
// left. That is the one thing a fractional grid cannot express: with `1fr` everywhere, widening
// the gutter narrows the sidebars, because eleven gutters come out of the same 1400px the columns
// are dividing. Measured before this: raising the desktop gutter from 2rem to 4rem took the side
// columns from 326px to 302px without anybody asking it to.
//
// A block that spans three tracks is three tracks *plus the two gutters between them*, so a fixed
// 300px block is not three 100px tracks - it is three tracks of (300 - 2 x gutter) / 3, and that
// is what `sideTrack` below computes. Written as a `calc()` rather than a number because the
// gutter is written once, at the top of each breakpoint, and the arithmetic has to follow it.
//
//     desktop  gutter 4rem = 64px   track (300 - 128) / 3 = 57.33px
//     tablet   gutter 3rem = 48px   track (300 -  96) / 3 = 68px
//
// The middle six tracks stay `1fr` and take whatever is left: 1400 - 300 - 300 - 2 x 64 = 672px of
// text on a 1440px page, about 70 characters at 1rem. That is why no stylesheet caps the measure
// any more (base.scss says so at length): the grid decides it, in one place.
//
// The right column is present on *every* page type on desktop - listing pages and the error page
// included, where it stays empty. That is deliberate: the content column then starts at the same x
// on every page, so navigating from an article to its folder does not shift the text. The same
// reasoning is why all three frames now use the same gutter. They did not: `editorial` had been
// moved to 4rem/3rem/1rem and `index` and `focus` still had 2rem/2rem/20px, so a folder page laid
// its text out 32px further left than the article it linked to.
//
// Tablet keeps the twelve columns and the fixed left column and drops the right *column*: `right`
// moves below the content instead of vanishing, because a 1000px screen still wants a table of
// contents. Mobile is a single column in reading order, and there the tracks go back to `1fr` -
// every area spans all twelve, so a fixed side track would only be a lower bound on the page
// width.

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

/** The box: same insets on all three sizes; the cap, the alignment and the gutter change. */
//
// The phone keeps a 1rem gutter, and that is not a taste decision. A twelve-column grid has eleven
// gutters whatever its content does, and they set its minimum width: at 2rem that is 11 x 32 + 40
// of inset = 392px, which is wider than a 390px screen. Measured before this line existed - every
// page scrolled sideways by 18px. The column gutter is invisible there anyway, because on the
// phone every area spans all twelve columns; only the row gutter is doing any work, and it keeps
// the full 2rem.
const box = (maxWidth, align, columnGap, columnSizes) => ({
  columnSizes,
  rowGap: '2rem',
  columnGap,
  maxWidth,
  align,
  paddingBlock: '20px',
  paddingInline: '20px'
})

/**
 * Twelve tracks, of which the ones carrying a side column are fixed so that three of them plus the
 * two gutters between them come to `SIDE_COLUMN`.
 *
 * `twoGutters` is twice the breakpoint's own `columnGap`, written as a CSS length - two gutters fit
 * between three tracks. No comma appears anywhere: a frame track value may not contain one
 * (schemas.ts).
 *
 * `both` decides whether the closing three are fixed as well, and that is not symmetry for its own
 * sake. A fixed track is incompressible, so every one of them raises the grid's minimum width.
 * Fixing 10-12 on the *tablet*, where the right column has moved below the text and those tracks
 * are part of the body, cost 3 x 68px of floor for nothing: the grid could not go below
 * 6 x 68 + 11 x 48 + 40 = 976px and every page scrolled 92px sideways in a 900px window - measured
 * on all 32 pages of the sweep, in both colour schemes. There, only the left three are fixed.
 */
const SIDE_COLUMN = '300px'
const sideTrack = (twoGutters) => `calc((${SIDE_COLUMN} - ${twoGutters}) / 3)`
const fixedSides = (twoGutters, both) => {
  const side = sideTrack(twoGutters)
  const rest = both ? [side, side, side] : ['1fr', '1fr', '1fr']
  return [side, side, side, '1fr', '1fr', '1fr', '1fr', '1fr', '1fr', ...rest]
}

/**
 * The gutter per breakpoint, and why it is not one number.
 *
 * 4rem is the chosen value and the desktop uses it. The other two cannot: eleven gutters are the
 * minimum width of a twelve-column grid whatever it contains, and they do not compress.
 *
 *   tablet, worst case 801px:  15px of scrollbar and 40px of inset leave 746. The left column is
 *                              300px including two of its gutters, so 9 gutters + 300 <= 746, and
 *                              the gutter cannot exceed 49.5px. 3rem = 48px is the largest step
 *                              that fits; 4rem = 64px puts the grid at 916px in a 900px window.
 *   mobile, worst case 390px:  11 gutters + 40 of inset <= 375, so the gutter cannot exceed 30px.
 *                              4rem would be 744px of gutter alone. It is invisible there anyway -
 *                              every area spans all twelve columns, so only the row gap works, and
 *                              that one IS 2rem everywhere.
 *
 * Measured the hard way once already: 2rem on the phone scrolled every page sideways by 18px
 * (BEFUNDE 34). What IS uniform is that all four frames now use the same three values.
 */
const DESKTOP_BOX = () => box('1440px', 'center', '4rem', fixedSides('8rem', true))
const TABLET_BOX = () => box('100%', 'left', '3rem', fixedSides('6rem', false))
const MOBILE_BOX = () => box('100%', 'left', '1rem', TWELVE)

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
      ...DESKTOP_BOX(),
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
      ...TABLET_BOX(),
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
      ...MOBILE_BOX(),
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
 * Geometrically identical to `editorial`, and that is the point: a folder page keeps the right
 * column so its list of links starts exactly where the article text starts. It stays a separate
 * frame because the two page types are free to diverge again, and because the layout editor keys
 * page types to frames by name.
 *
 * It used to drop the right slot below desktop, on the assumption that the column was empty there -
 * a listing page has no headings, so no table of contents. Measured on `/formatierung/`, it is not
 * empty: backlinks and the graph live there, and `display: none` at 900 and at 390px took both away
 * from every folder, tag and bases page. The slot now moves below the text, exactly as it does in
 * `editorial`.
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
      ...DESKTOP_BOX(),
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
      ...TABLET_BOX(),
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
      ...MOBILE_BOX(),
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
      ...DESKTOP_BOX(),
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
      ...TABLET_BOX(),
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
      ...MOBILE_BOX(),
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

/**
 * drawing - the two page types that are a picture: canvas and excalidraw.
 *
 * Both plugins ship a frame of their own, and both frames are the reason those pages were unusable.
 * Measured on the built site before this existed:
 *
 *   * A canvas page fell back to quartz's built-in `full-width`, whose `.center` has no definite
 *     height. `.canvas-page` and `.canvas-container` are `height: 100%` and resolve that against
 *     nothing, so the box collapsed and everything else in the page - the header, the footer, the
 *     "read on" box - was painted *over* the drawing rather than around it.
 *   * An excalidraw page used the plugin's own `ExcalidrawFrame`, which renders no header at all.
 *     There was no link home, no search, no theme switch and no breadcrumb: the only way out of the
 *     page was the browser's back button. Its own answer to that is a burger button opening a
 *     300px sidebar holding the *left* slot's components, which in this template are sized for a
 *     335px column and were cut off at the window edge.
 *
 * So both page types get a frame of the site's own instead. It is `focus` without the reserved side
 * columns: the bar at the top, the breadcrumb trail and the title, the drawing, whatever comes after
 * it, the footer - each in its own row, at the same 1440px width as every other page, so the header
 * lines up with the one on the page you arrived from. The drawing's height is not a grid question
 * and is not set here; `page-canvas.scss` gives both containers a definite one, because `1fr` in a
 * grid whose own height is auto is just the content's height, and the content's height is the thing
 * that was missing.
 *
 * `left` and `right` are hidden here *and* emptied in layout.mjs: the frame stops them taking room,
 * the empty positions stop them being built at all.
 */
const drawing = {
  id: 'frame-drawing',
  frameName: 'drawing',
  areas: areas(),
  breakpoints: {
    desktop: {
      rows: 5,
      cols: 12,
      rowSizes: ['auto', 'auto', '1fr', 'auto', 'auto'],
      ...DESKTOP_BOX(),
      placements: {
        'area-header': place(1, 1, 1, 12),
        'area-left': hidden,
        'area-beforeBody': place(2, 1, 1, 12),
        'area-pageBody': place(3, 1, 1, 12),
        'area-afterBody': place(4, 1, 1, 12),
        'area-right': hidden,
        'area-footer': place(5, 1, 1, 12)
      }
    },
    tablet: {
      rows: 5,
      cols: 12,
      rowSizes: ['auto', 'auto', '1fr', 'auto', 'auto'],
      ...TABLET_BOX(),
      placements: {
        'area-header': place(1, 1, 1, 12),
        'area-left': hidden,
        'area-beforeBody': place(2, 1, 1, 12),
        'area-pageBody': place(3, 1, 1, 12),
        'area-afterBody': place(4, 1, 1, 12),
        'area-right': hidden,
        'area-footer': place(5, 1, 1, 12)
      }
    },
    mobile: {
      rows: 5,
      cols: 12,
      rowSizes: ['auto', 'auto', '1fr', 'auto', 'auto'],
      ...MOBILE_BOX(),
      placements: {
        'area-header': place(1, 1, 1, 12),
        'area-left': hidden,
        'area-beforeBody': place(2, 1, 1, 12),
        'area-pageBody': place(3, 1, 1, 12),
        'area-afterBody': place(4, 1, 1, 12),
        'area-right': hidden,
        'area-footer': place(5, 1, 1, 12)
      }
    }
  }
}

export const FRAMES = [editorial, index, focus, drawing]

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
