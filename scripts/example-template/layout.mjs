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
    // Search, dark mode and reader mode read as one control strip rather than three stacked
    // blocks. `wrap` matters at the narrow end: three controls in a 210px tablet sidebar would
    // otherwise overflow rather than break.
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
