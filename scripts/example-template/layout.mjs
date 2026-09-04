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
    // Search, dark mode, reader mode and the language switcher read as one control strip rather
    // than four stacked blocks. They sit at the end of the header on every breakpoint since
    // 2026-09-04 - see plugins.mjs for why they left the sidebar. `wrap` stays: it is what keeps
    // the strip from overflowing the app bar on a 360px phone, where the four of them share the
    // row with the drawer trigger and the site name.
    //
    // The fourth arrived with the multilanguage plugin and cost the site name its place in the
    // app bar: measured at 390px, the title had 84px with three controls and 24px with four,
    // which renders as "M…". nav-page-title.scss drops it below 480px; the word mark next to it
    // is a link home and carries the same name.
    toolbar: {
      priority: 35,
      direction: 'row',
      wrap: 'wrap',
      gap: '0.5rem'
    }
  },
  byPageType: {
    content: { template: 'editorial' },
    folder: { template: 'index' },
    tag: { template: 'index' },
    bases: { template: 'index' },
    // Full width: a canvas draws its own space and a 68ch measure would crop it.
    canvas: { template: 'full-width' },
    '404': {
      template: 'focus',
      positions: { left: [], right: [], beforeBody: [], afterBody: [] }
    }
  }
}
