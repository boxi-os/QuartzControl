// The top-level `layout:` key - one half of the `layout` part of the package (the other half is
// the breakpoint widths in frames.mjs).
//
// `positions` is only meaningful as an *empty* array: quartz's loadQuartzLayout checks
// `components.length === 0` and ignores a non-empty one (ipc-contract.ts:62-65). So it is used
// here exactly once, to state "this page type has no sidebars" in the config as well as in the
// frame - the frame hides the slots geometrically, this stops the components from being built at
// all.
export const LAYOUT_CONFIG = {
  groups: {
    // The mark and the site name are one thing - a logotype - and on the page they always were:
    // the header's `flex-direction: row` put them side by side and `margin-inline-start: auto` on
    // the toolbar pushed everything else to the far end. That worked and said nothing. The header
    // was three children with a margin trick holding them apart, so the app's layout board listed
    // the mark and the title as two unrelated components in a column, and every rule about how the
    // header behaves when it runs out of room lived in nav-header.scss rather than in the layout.
    //
    // As a group it is one flex item, the header is two of them, and `justify-content:
    // space-between` is then the whole arrangement - no margin, no assumption about how many
    // children there are. `nowrap` because a logotype that breaks between its mark and its name is
    // not a logotype; the name truncates instead (nav-header.scss).
    brand: {
      priority: 10,
      direction: 'row',
      wrap: 'nowrap',
      gap: '0.75rem'
    },
    // Search, dark mode, reader mode and the language switcher read as one control strip rather
    // than four stacked blocks. They sit at the end of the header on every breakpoint since
    // 2026-09-04 - see plugins.mjs for why they left the sidebar.
    //
    // The fourth arrived with the multilanguage plugin and cost the site name its place in the
    // app bar: measured at 390px, the title had 84px with three controls and 24px with four,
    // which renders as "M…". nav-header.scss drops it below 480px; the word mark next to it
    // is a link home and carries the same name.
    //
    // `nowrap`, and it is the whole reason the bar behaves the same in three engines.
    //
    // A wrapping flex container has no interoperable max-content size. Measured at 1456, 1280,
    // 1100 and 900px with the same build: Chrome sizes this group to the sum of its children,
    // 452px, and it stays on one line. Firefox and WebKit size it to 322px - narrower than its own
    // contents - and the four controls then break onto a second row, taking the header from 61px
    // to 113px at *every* width. Nothing in the stylesheet can fix that; `flex-wrap: nowrap` on the
    // header itself does not reach inside the group, and the group's own wrap is written as an
    // inline style from this file (Flex.tsx), which no rule outranks.
    //
    // Wrapping was here for the 360px phone, and it is not needed there: the search gives up its
    // 15rem and becomes a 44px button, so the four controls measure 4 x 44 + 3 x 4 = 188px in the
    // 292px the app bar leaves beside the drawer trigger. Re-measured in all three engines at 390
    // and 360px after the change.
    toolbar: {
      priority: 35,
      direction: 'row',
      wrap: 'nowrap',
      gap: '0.5rem'
    }
  },
  byPageType: {
    content: { template: 'editorial' },
    folder: { template: 'index' },
    tag: { template: 'index' },
    bases: { template: 'index' },
    // The two page types that are a picture. Both used to be left to the frame their own plugin
    // ships, and both were unusable for it - a canvas collapsed to no height under quartz's
    // built-in `full-width` and had the rest of the page painted over it, an excalidraw drawing
    // rendered with no header and therefore no way back except the browser's own. `drawing`
    // (frames.mjs) gives them the site's bar, the breadcrumb trail and the footer, and nothing
    // else; the empty positions stop the two sidebars being built at all, the way the 404 does it.
    canvas: { template: 'drawing', positions: { left: [], right: [] } },
    excalidraw: { template: 'drawing', positions: { left: [], right: [] } },
    '404': {
      template: 'focus',
      positions: { left: [], right: [], beforeBody: [], afterBody: [] }
    }
  }
}
