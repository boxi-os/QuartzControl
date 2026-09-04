// The order the stylesheets are loaded in.
//
// Explicit rather than derived from the filenames, for two reasons.
//
// The first is a real constraint. Quartz loads exactly one stylesheet (custom.scss), so the load
// order lives inside it as a block of `@use` lines, and styleService writes those as
// `@use "./custom/<name>"` with no `as` clause. Sass then derives the module's namespace from the
// filename - and a namespace has to be a valid Sass identifier, which means it cannot start with
// a digit. A file called `00-base.scss` therefore produces
//
//     Error: The default namespace "00-base" is not a valid Sass identifier.
//
// and nothing in the project compiles any more. The app's own filename rule
// (`/^[A-Za-z0-9][A-Za-z0-9._-]*$/`, schemas.ts) allows the leading digit, so this is reachable
// from the UI: create a stylesheet named "01-typography" and the whole site stops building.
// Reported as a finding; worked around here by giving every file a name that starts with a letter.
//
// The second is that ordering *is* a decision. Base before components, components before the
// long tail of pages, and accessibility last so its rules win over anything earlier that used a
// hover-only affordance or a colour-only state. A numeric prefix would encode that decision in a
// place where it cannot carry its reason.
export const STYLE_ORDER = [
  // the ground everything else assumes
  'base',

  // navigation and controls, in the order they appear down the sidebar
  'nav-page-title',
  'nav-toolbar',
  'nav-search',
  'nav-darkmode',
  'nav-reader-mode',
  'nav-explorer',

  // the apparatus above the article
  'meta-breadcrumbs',
  'meta-article-title',
  'meta-content-meta',
  'meta-note-properties',
  'meta-tag-list',

  // the apparatus beside it
  'aside-toc',
  'aside-backlinks',
  'aside-graph',
  'aside-recent-notes',

  // the article itself
  'body-content',
  'body-callouts',
  'body-code',
  'body-math',
  'body-mermaid',
  'body-media',

  // whole page types
  'page-folder',
  'page-tag',
  'page-bases',
  'page-canvas',
  'page-popover',
  'page-search-results',
  'page-404',

  // the plugin this template brings with it
  'plugin-layout-box',

  // the bottom of every page
  'site-footer',
  'site-comments',

  // last on purpose: several of these have to beat a decision made further up
  'a11y'
]
