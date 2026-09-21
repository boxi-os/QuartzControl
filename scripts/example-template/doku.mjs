// The documentation variant of the template: the same design, fewer components.
//
// Three sites are built with it - the app's web presence and one handbook per plugin. They are
// reference texts, not a showcase, so the parts of the Example template whose job is to demonstrate
// something come out. Everything that carries the design - colours, fonts, variables, stylesheets,
// frames, the word mark - stays, and stays *shared*: this file derives from the Example data
// instead of copying it, so a colour changed in palette.mjs reaches both packages. A second
// datenset would have drifted the first time anyone touched one of them.
//
// What comes out, and why:
//
//   tag-list           the chip row above the title - in a handbook the tags are navigation, and
//                      the explorer already is
//   recent-notes       "zuletzt geändert" - a chapter order is fixed, so a recency list says
//                      nothing about where to read next
//   comments           none of the three sites has a comment backend
//   stacked-pages      only ever visible after a wikilink click, and unexplained where it appears
//   layoutBoxHint      the mobile-only notice - an Example demonstration of `display`
//   layoutBoxCta       the "Weiterlesen" call - its text points at the Example site
//   layoutBoxColophon  the footer line with locale and slug - a demonstration of {{placeholders}}
//
// `note-properties` looks like it belongs on that list and does not. With `order: 5`,
// `delimiters: ---` and `language: yaml` it is *also* the frontmatter transformer, and removing it
// costs every page its title, description and tags. Measured on a full build of the Example vault
// with the entry gone: `<title>` renders as "Unbenannt" on all 347 pages, and `draft:` stops being
// recognised - 2 filtered files instead of 4. Its own types name the way out:
// "Hide the visual properties panel while still processing frontmatter and resolving links."
// So it stays, with the panel off and without the thirteen demonstration properties the Example
// lists for the sake of its own chapter on data types.

// Components that keep their entry and their placement but are switched off. Off rather than
// deleted because a patch can only overwrite an entry, not remove one - and because a template
// that leaves them behind lets the app switch them back on, which a template that dropped them
// does not.
export const DISABLED = ['tag-list', 'recent-notes', 'comments', 'stacked-pages']

// The two plugin handbooks drop the graph on top of that. It earns its place on a site whose pages
// link sideways - the Example handbook and the app's, where a chapter refers to three others. A
// plugin handbook is a chain: nine chapters, each read after the one before it, roughly thirty
// pages. The picture that produces says nothing the explorer does not say more plainly, and it
// costs a sidebar block on every page. The app's site keeps it.
export const PLUGIN_DISABLED = ['graph']

// And one that is switched *on*, whatever the Example says. These sites navigate with the explorer
// (see "tag-list" above: "the explorer already is") and carry no quartz-navigations entry - on
// purpose, see variants.mjs. Deriving from the Example meant inheriting its switches, and when the
// Example moved to quartz-navigations on 2026-09-20 and turned its explorer off, the doku packages
// turned it off too: the import of 2026-09-21 left the app's website and two plugin handbooks
// without any navigation at all - noticed by the user a day later, on the live site. Only the one
// flag differed before and after that import (compared across every `enabled:` of all four sites).
// Named here so the next change to the Example cannot take it again without a line in this file.
//
// The navigations handbook applies the plugin package too and navigates with its own
// quartz-navigations instances instead; after an import into it, its explorer is switched off by
// hand again (docs/release.md).
export const ENABLED = ['explorer']

// Layout boxes are appended to the config rather than patched into it, so these simply do not
// travel.
export const BOXES_OUT = ['layoutBoxHint', 'layoutBoxCta', 'layoutBoxColophon']

// The properties the panel would show if it were shown. Kept truthful anyway: `includeAll: false`
// with a stale list is the kind of thing that reads as deliberate long after it stopped being so.
const KEPT_PROPERTIES = ['description', 'tags', 'section']

/**
 * The Example patches with the demonstration components switched off.
 * `variant` is 'doku' (the app's website) or 'plugin' (the two plugin handbooks).
 */
export function patches(base, variant = 'doku') {
  const off = variant === 'plugin' ? [...DISABLED, ...PLUGIN_DISABLED] : DISABLED
  const next = { ...base }
  for (const name of off) {
    if (!next[name]) throw new Error(`doku.mjs: ${name} steht nicht in PLUGIN_PATCHES`)
    next[name] = { ...next[name], enabled: false }
  }
  for (const name of ENABLED) {
    if (!next[name]) throw new Error(`doku.mjs: ${name} steht nicht in PLUGIN_PATCHES`)
    next[name] = { ...next[name], enabled: true }
  }
  if (!next['note-properties']) throw new Error('doku.mjs: note-properties steht nicht in PLUGIN_PATCHES')
  next['note-properties'] = {
    ...next['note-properties'],
    options: {
      ...next['note-properties'].options,
      includedProperties: KEPT_PROPERTIES,
      hidePropertiesView: true
    }
  }
  return next
}

/** The Example layout boxes without the three that demonstrate rather than carry. */
export function boxes(base) {
  const keys = base.map((box) => box.options?.frontmatterKey)
  for (const key of BOXES_OUT) {
    if (!keys.includes(key)) throw new Error(`doku.mjs: ${key} steht nicht in LAYOUT_BOXES`)
  }
  return base.filter((box) => !BOXES_OUT.includes(box.options?.frontmatterKey))
}
