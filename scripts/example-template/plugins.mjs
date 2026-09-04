// What this template does to the project's plugin list - the `plugins` part of the package.
//
// Written as *patches* onto whatever the project already has, not as a replacement list. A fresh
// Quartz install ships 45 entries; restating them here would mean this file silently going stale
// the next time upstream adds one, and would put a source string under our name that we do not
// own. Each patch names only what the template decides: on or off, its options, and where it sits.
//
// Positions and priorities together are the layout: within one position, quartz sorts by ascending
// `priority` (config-loader.ts's buildLayoutForEntries). Priorities go in tens so a later insert
// has room.

export const LAYOUT_BOX_SOURCE = 'github:boxi-os/quartz-layout-box'

// Every instance carries the same name, and it is not a choice: configService.deriveName() takes
// the last path segment of the source (configService.ts:12), so all five entries below are called
// `quartz-layout-box` whatever we write here - readConfig overwrites the field on every read. The
// name is stated explicitly only because the config:save schema requires it (schemas.ts,
// pluginEntry.name).
//
// This is the collision worth watching: the `plugins` part of a template package keys its entries
// by name when it applies them (parts.ts:554), so five instances may well arrive as one. Measured
// in phase 11 of the build script rather than assumed.
const LAYOUT_BOX_NAME = 'quartz-layout-box'

/* ------------------------------------------------------------------ the site's own mark */

// Inline SVG rather than a file: quartz/static/ travels in no part of a template package (only
// quartz/static/fonts does), so a logo referenced as a file would resolve to nothing in whatever
// project imports this. As markup inside the config entry it travels with the `plugins` part.
// Two variants to exercise the plugin's .img-light/.img-dark switching; a single currentColor mark
// would also work and is what a real site would probably use.
// The site mark, one SVG per mode. The two fills are the palette's `secondary` written out as
// hex, not `var(--secondary)`: this string is an option value in quartz.config.yaml that the
// layout-box plugin drops into the page as raw HTML, and a CSS variable resolves there but the
// *dark* copy would then be the light value - the two SVGs are both in the document at all times
// and switched with `.img-light` / `.img-dark`, so each has to carry its own colour. Change the
// palette in palette.mjs and these two follow by hand.
const MARK_LIGHT = `<svg class="img-light" width="26" height="26" viewBox="0 0 26 26" role="img" aria-label=""><rect width="26" height="26" rx="7" fill="#2A4E6C"/><path d="M8 17.5V8.5h3.4c2.3 0 3.8 1.2 3.8 3.1 0 1.4-.8 2.4-2.1 2.8l2.9 3.1h-2.6l-2.5-2.8h-.7v2.8H8Zm2.2-4.6h1.1c1 0 1.6-.5 1.6-1.3s-.6-1.2-1.6-1.2h-1.1v2.5Z" fill="#FCFCFA"/></svg>`
const MARK_DARK = `<svg class="img-dark" width="26" height="26" viewBox="0 0 26 26" role="img" aria-label=""><rect width="26" height="26" rx="7" fill="#8CB8DA"/><path d="M8 17.5V8.5h3.4c2.3 0 3.8 1.2 3.8 3.1 0 1.4-.8 2.4-2.1 2.8l2.9 3.1h-2.6l-2.5-2.8h-.7v2.8H8Zm2.2-4.6h1.1c1 0 1.6-.5 1.6-1.3s-.6-1.2-1.6-1.2h-1.1v2.5Z" fill="#16171A"/></svg>`

/**
 * Five instances of quartz-layout-box, one per thing the plugin can do.
 *
 * Four use `html:` inline instead of `file:`. That is not a stylistic choice: snippet files live in
 * quartz/static/snippets/, which no part of a template package collects, so a `file:` instance
 * arrives in the importing project pointing at nothing. Inline HTML rides along inside the config
 * entry. The one `file:` instance is deliberate - it demonstrates the file path *and* the gap, and
 * site/README.md says which file has to be copied along with the package.
 */
export const LAYOUT_BOXES = [
  {
    source: LAYOUT_BOX_SOURCE,
    name: LAYOUT_BOX_NAME,
    enabled: true,
    order: 500,
    options: {
      html: `<a class="site-mark" href="{{root}}/">${MARK_LIGHT}${MARK_DARK}<span class="site-mark-text">{{siteTitle}}</span></a>`,
      className: 'layout-box-mark',
      placeholders: true,
      frontmatterKey: 'layoutBoxMark'
    },
    layout: { position: 'header', priority: 10 }
  },
  {
    // The file path, with a Markdown snippet: rendered at build time, GFM, no Obsidian syntax.
    // Also the only collapsible box, so <details>/<summary> gets exercised.
    source: LAYOUT_BOX_SOURCE,
    name: LAYOUT_BOX_NAME,
    enabled: true,
    order: 510,
    options: {
      file: 'sidebar-note.md',
      title: 'Über dieses Handbuch',
      collapsible: true,
      collapsed: false,
      className: 'layout-box-note',
      frontmatterKey: 'layoutBoxNote'
    },
    layout: { position: 'left', priority: 60, display: 'desktop-only' }
  },
  {
    // Same plugin, different instance, own frontmatterKey - the two-instance pattern from the
    // plugin's README, so a page can hide one without hiding the other.
    source: LAYOUT_BOX_SOURCE,
    name: LAYOUT_BOX_NAME,
    enabled: true,
    order: 520,
    options: {
      html: '<p>Auf einem schmalen Bildschirm ist die Navigation oben eingeklappt.</p>',
      className: 'layout-box-hint',
      frontmatterKey: 'layoutBoxHint'
    },
    layout: { position: 'left', priority: 15, display: 'mobile-only' }
  },
  {
    source: LAYOUT_BOX_SOURCE,
    name: LAYOUT_BOX_NAME,
    enabled: true,
    order: 530,
    options: {
      title: 'Weiterlesen',
      // No `{{frontmatter.section}}` here: a page without that field - a canvas, a base, a drawing -
      // prints the placeholder raw. A placeholder that can be empty does not belong in a box that
      // appears on every page.
      html: '<p>Diese Seite gehört zu <a href="{{root}}/">{{siteTitle}}</a> — der Beispielvorlage für QuartzControl. Ein Überblick über alle Bereiche steht auf der <a href="{{root}}/">Startseite</a>.</p>',
      className: 'layout-box-cta',
      frontmatterKey: 'layoutBoxCta'
    },
    layout: { position: 'afterBody', priority: 10 }
  },
  {
    source: LAYOUT_BOX_SOURCE,
    name: LAYOUT_BOX_NAME,
    enabled: true,
    order: 540,
    options: {
      html: '<p>{{siteTitle}} · Sprache: {{locale}} · Diese Seite: <code>{{slug}}</code></p>',
      className: 'layout-box-colophon',
      frontmatterKey: 'layoutBoxColophon'
    },
    layout: { position: 'footer', priority: 20 }
  }
]

/* --------------------------------------------------------------------- patches by name */

/** name -> partial entry. Anything absent is left exactly as the project had it. */
export const PLUGIN_PATCHES = {
  /* --- components: where each one sits ------------------------------------------------ */
  'page-title': { enabled: true, layout: { position: 'header', priority: 20 } },

  // The three site-wide controls live in the header, at its right end, on every breakpoint. They
  // were in the left sidebar until 2026-09-04; the header is where a reader looks for them, and it
  // is the one area that survives every frame - including `focus`, where the 404 page has no
  // sidebars at all and previously offered no way to switch the theme or search.
  //
  // `grow` is gone with the move: in a 335px sidebar the search field wanting the leftover width
  // was right, in a header row it would push the two icon buttons to the far edge of a 1440px page.
  // nav-toolbar.scss gives the field a width instead.
  search: { enabled: true, layout: { position: 'header', priority: 30, group: 'toolbar' } },
  darkmode: { enabled: true, layout: { position: 'header', priority: 40, group: 'toolbar' } },
  'reader-mode': { enabled: true, layout: { position: 'header', priority: 50, group: 'toolbar' } },
  // Kept, and now doing its actual job: with the toolbar gone from the left sidebar, the spacer is
  // what holds the mobile strip open above the drawer trigger.
  spacer: { enabled: true, layout: { position: 'left', priority: 10, display: 'mobile-only' } },
  explorer: {
    enabled: true,
    // `folderDefaultState: 'open'` states the intent and DOES NOT WORK - measured against
    // @quartz-community/explorer 0.1.0. The component writes the option into `data-collapsed`, but
    // its own inline script never reads that attribute: it takes the fold state from
    // localStorage's `fileTree` alone and defaults to *collapsed* for anything not saved there
    //
    //     let C = r[u.slug] !== undefined ? r[u.slug] : true      // true == collapsed
    //     if ((!C || onActivePath) && outer) outer.classList.add("open")
    //
    // so a first-time visitor gets the tree folded shut whatever this says, and only the folders
    // on the current page's path are open. `useSavedState` is ignored the same way. Both are left
    // here because they are the correct values the day the plugin honours them; the finding is
    // written up in BEFUNDE.md, and no stylesheet can undo it - the open and the never-touched
    // state share one class name, so CSS cannot tell them apart.
    options: { folderDefaultState: 'open', folderClickBehavior: 'link', useSavedState: true },
    layout: { position: 'left', priority: 50 }
  },
  'recent-notes': { enabled: true, options: { limit: 5 }, layout: { position: 'left', priority: 70, display: 'desktop-only' } },

  'table-of-contents': {
    enabled: true,
    // The plugin stops at `maxDepth: 3` by default, so a document with h4/h5/h6 gets a truncated
    // outline - measured: only `depth-0` and `depth-1` ever appeared in the markup, and the five
    // depth rules in aside-toc.scss matched nothing. 6 is the whole range, which is the point of
    // styling all seven levels.
    options: { maxDepth: 6, minEntries: 1, showByDefault: true, collapseByDefault: false },
    layout: { position: 'right', priority: 10 }
  },
  backlinks: { enabled: true, layout: { position: 'right', priority: 20 } },
  graph: { enabled: true, layout: { position: 'right', priority: 30, display: 'desktop-only' } },

  breadcrumbs: { enabled: true, layout: { position: 'beforeBody', priority: 10, condition: 'not-index' } },
  'article-title': { enabled: true, layout: { position: 'beforeBody', priority: 20 } },
  'content-meta': { enabled: true, layout: { position: 'beforeBody', priority: 30 } },
  'note-properties': {
    enabled: true,
    options: {
      includeAll: false,
      // The four type-demo fields are listed alongside the three real ones so the value types the
      // stylesheet distinguishes - boolean, number, list, empty - are actually reachable. A page
      // that does not define them simply shows nothing for them; measured, only the fields present
      // in a page's frontmatter get a row.
      includedProperties: ['description', 'tags', 'section', 'zahl', 'wahr', 'liste', 'leer'],
      excludedProperties: [],
      hidePropertiesView: false
    },
    layout: { position: 'beforeBody', priority: 40 }
  },
  'tag-list': { enabled: true, layout: { position: 'beforeBody', priority: 50 } },

  footer: {
    enabled: true,
    options: { links: { Quartz: 'https://quartz.jzhao.xyz/', 'Layout Box': 'https://github.com/boxi-os/quartz-layout-box' } },
    layout: { position: 'footer', priority: 10 }
  },

  /* --- transformers: on, with the options this template's content relies on ------------ */
  'obsidian-flavored-markdown': {
    enabled: true,
    options: {
      comments: true,
      highlight: true,
      wikilinks: true,
      callouts: true,
      mermaid: true,
      parseTags: true,
      parseArrows: true,
      parseBlockReferences: true,
      enableInHtmlEmbed: false,
      enableYouTubeEmbed: true,
      enableVideoEmbed: true,
      enableCheckbox: true
    }
  },
  'github-flavored-markdown': { enabled: true },
  'syntax-highlighting': { enabled: true, options: { theme: { light: 'github-light', dark: 'github-dark' }, keepBackground: false } },
  latex: { enabled: true, options: { renderEngine: 'katex' } },
  'created-modified-date': { enabled: true, options: { defaultDateType: 'modified', priority: ['frontmatter', 'git', 'filesystem'] } },
  description: { enabled: true },
  'crawl-links': { enabled: true, options: { markdownLinkResolution: 'shortest' } },
  // Off, deliberately. With it on, every line break in a note's source becomes a `<br>` on the
  // page - and prose written with a wrap at column 100, which is how these notes are written and
  // how they diff well, arrives on the site broken mid-sentence. Measured: nine of them on one
  // page. A break that is genuinely wanted is written as a paragraph, or as `<br>` where it has to
  // be a break.
  'hard-line-breaks': { enabled: false },

  /* --- the content rules the example notes demonstrate --------------------------------- */
  'remove-draft': { enabled: true },
  'unlisted-pages': { enabled: true },
  'alias-redirects': { enabled: true },
  'explicit-publish': { enabled: false }, // off: the example vault publishes everything but drafts

  /* --- page types --------------------------------------------------------------------- */
  'content-page': { enabled: true },
  'folder-page': { enabled: true },
  'tag-page': { enabled: true },
  'canvas-page': { enabled: true },
  'bases-page': { enabled: true },

  /* --- emitters ----------------------------------------------------------------------- */
  'content-index': { enabled: true, options: { enableSiteMap: true, enableRSS: true } },
  favicon: { enabled: true },
  'og-image': { enabled: true },

  /* --- deliberately off, and why ------------------------------------------------------- */
  // Fonts come from quartz/static/fonts via the template's own @font-face rules, so neither of the
  // two Google Fonts loaders may run - see docs/decisions/styles-and-fonts.md, finding 12.
  'quartz-fonts': { enabled: false },
  comments: { enabled: false },   // needs a giscus repo the importing site does not have
  citations: { enabled: false },
  'ox-hugo': { enabled: false },
  roam: { enabled: false },
  'stacked-pages': { enabled: false },
  'encrypted-pages': { enabled: false },
  cname: { enabled: false },
  'obsidian-plugin-excalidraw': { enabled: false }
}

/**
 * The community theme entry.
 *
 * Present so the `theme` part of the package is not empty - themeEntryIndex() finds any
 * @quartz-themes/* entry whether or not it is enabled. Whether `enabled` ends up true is decided by
 * measurement, not here: an active theme sets its own colours, and this template's palette is the
 * one that was checked for contrast. See the build script's phase 9.
 */
export const THEME_ENTRY = {
  name: 'core',
  options: { theme: 'minimal', mode: 'both', themeFonts: false }
}
