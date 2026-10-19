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
// The second is that ordering *is* a decision. The foundation and the page layout before the
// components, the components before the article, the article before the generated pages, and
// accessibility last so its rules win over anything earlier that used a hover-only affordance or a
// colour-only state. A numeric prefix would encode that decision in a place where it cannot carry
// its reason.
//
// Twelve files since 1.1, 31 before: one for the layout, one for the content, one per category of
// component, one for the callouts and one for each of the three plugins this template brings.
// Thirteen since 1.2, with quartz-forms, which it styles without bringing it.
// Every file names, section by section, the old stylesheet its rules came from. Putting them
// together moved several sections in the load order - the footer now loads with the layout, the
// breadcrumbs with the navigation, the search results with the header, the language switcher
// before the explorer, title and date and the typographic rhythm after the note's components - and
// the built Example and Basis sites were measured unchanged across all of it
// (scripts/styles-snapshot.mjs --site, docs/decisions/styles-and-fonts.md). One move did not hold:
// the link preview restyles what the page types render, at their specificity, so it stays behind
// them in `pages` rather than going to `content` (pages.scss says how it showed).
export const STYLE_ORDER = [
  // what every other file assumes, then the page around the text
  'foundation',
  'layout',

  // the components, in the order they appear down the page: the header, then the navigation
  // beside the text, then what sits above and beside the note
  'components-header',
  'plugin-multilanguage',
  'components-navigation',
  // After the explorer, because both take the same place in the left column: whoever turns the
  // explorer back on reads the two files next to each other. Since 2026-09-20 the navigation is
  // the one that stands there.
  'plugin-navigations',
  'components-note',

  // the article itself
  'content',
  'callouts',

  // whole page types
  'pages',

  // the plugin this template brings with it
  'plugin-layout-box',
  // quartz-forms is styled although no variant installs it (yet): whoever adds it gets forms that
  // already look like the rest of the site, the same promise the template makes for the
  // components it switches off.
  'plugin-forms',

  // last on purpose: several of these have to beat a decision made further up
  'a11y'
]
