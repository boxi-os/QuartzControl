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

import { MARK_LIGHT, MARK_DARK } from './site-mark.mjs'

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

// The mark is the app's own icon, and it is built rather than pasted: site-mark.mjs reads
// build/icon-source/quartzcontrol-icon.svg and returns a light and a dark version of it. See there
// for what the two differ in and why the gradient ids have to differ too.
//
// Inline SVG rather than a file. `quartz/static/` does travel in a package since 2026-09-06 (the
// `static` part, BEFUNDE 5), so a file would work now - but as markup inside the config entry the
// mark cannot arrive without the entry that references it, and that is one failure mode fewer for
// something that is on every page of the site.

/**
 * Six instances of quartz-layout-box, one per thing the plugin can do.
 *
 * Four use `html:` inline instead of `file:`. That is not a stylistic choice: snippet files live in
 * quartz/static/snippets/, which no part of a template package collects, so a `file:` instance
 * arrives in the importing project pointing at nothing. Inline HTML rides along inside the config
 * entry. The one `file:` instance is deliberate - it demonstrates the file path *and* the gap, and
 * site/README.md says which file has to be copied along with the package.
 *
 * Four of the five carry text and therefore carry a `byLang` entry as well: the plugin reads the
 * page's `lang` frontmatter field - the one Quartz renders <html lang> from - and merges that entry
 * over the base options. Before the plugin could do that, every one of the 126 English pages had to
 * repeat the same four blocks in its own frontmatter (876 lines), and the two headings could not be
 * translated at all. The site mark stays without one: it carries the site name, which is not
 * translated.
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
    // In the `brand` group with page-title (layout.mjs): the mark and the site name are one
    // logotype, and saying so here is what lets the header be two flex items instead of three
    // children held apart by a margin.
    layout: { position: 'header', priority: 10, group: 'brand' }
  },
  {
    // The page's own title, in the bar, for the moment the article's h1 has scrolled out of sight.
    // Several pages here are three screens tall, and from the second screen on the bar carried the
    // one name the reader already knew - the site's - while the one they needed was gone.
    //
    // The chapter, in the bar, next to the site name.
    //
    // It used to be `{{title}}` - the page's own name - and it was invisible until the h1 scrolled
    // out, at which point a scroll-driven crossfade traded it against the site name. That worked in
    // Chromium and WebKit and not in Firefox, which has no scroll timelines and never will, so
    // since 2026-09-09 the bar has no states: it says the site and the chapter, both all the time.
    //
    // `{{frontmatter.section}}` rather than the title, and that is what makes a permanent second
    // name possible at all. The title would repeat the h1 six lines below it on every page; the
    // chapter repeats it on the pages whose own name *is* the chapter and nowhere else - in this
    // vault the seven chapter index pages per language, 14 of 266 (counted on 2026-09-10:
    // `section` equal to `title`; the two start pages are a third case, where it is the *site
    // name* beside it that says what the h1 says). On the other 252 it answers exactly the
    // question the exchange was built for - not "what am I reading", which the heading says, but
    // "where in the site is this". On the 14 it is the heading again, one line up: a small
    // redundancy on a landing page, against a name that is otherwise missing from the second
    // screen down.
    //
    // Why a layout box and not a component: it renders a `span` that is `aria-hidden`, which is the
    // honest shape for a visual echo. The breadcrumb below carries the same information in a
    // structure a screen reader can actually use.
    source: LAYOUT_BOX_SOURCE,
    name: LAYOUT_BOX_NAME,
    enabled: true,
    order: 505,
    options: {
      // The chapter rides in an attribute and is painted from there with `content: attr()`, which
      // looks roundabout and is the only way to survive a page that has no frontmatter at all.
      //
      // The plugin leaves a placeholder it cannot resolve standing as literal text
      // (`resolvePlaceholder` returns undefined, `applyPlaceholders` returns the match) - so with
      // the value in the element's text, 72 of the 345 built pages showed `{{frontmatter.section}}`
      // in the bar: every base, canvas, excalidraw, tag page and the 404. There is no fallback
      // syntax, and CSS cannot test what an element's text says.
      //
      // It can test an attribute. `[data-section^="{{"]` is exactly "this page had no frontmatter",
      // independent of page type, and it hides the box - see nav-header.scss.
      html: '<span class="bar-page-name" aria-hidden="true" data-section="{{frontmatter.section}}"></span>',
      className: 'layout-box-page-name',
      placeholders: true,
      frontmatterKey: 'layoutBoxPageName'
    },
    // Priority 30: the brand group is mark, site name, chapter, in that order in the document and
    // in three grid columns (nav-header.scss). A page without `section` - the generated listings,
    // the 404 - renders the span empty, and `:empty` removes it and its separator.
    layout: { position: 'header', priority: 30, group: 'brand' }
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
      // Closed to begin with. It is a note *about* the handbook, not part of it, and open it was
      // the first thing on every page of the left column - above the explorer's own heading.
      collapsed: true,
      className: 'layout-box-note',
      frontmatterKey: 'layoutBoxNote',
      byLang: { en: { file: 'sidebar-note.en.md', title: 'About this handbook' } }
    },
    layout: { position: 'left', priority: 40, display: 'desktop-only' }
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
      frontmatterKey: 'layoutBoxHint',
      byLang: { en: { html: '<p>On a narrow screen the navigation is collapsed at the top.</p>' } }
    },
    // Under the article, not above it. It sat in the left area, which on a phone is the first thing
    // between the bar and the text - 45px of explanation before a single line of what the page is
    // about. It is still `mobile-only`, which is what this instance demonstrates; it just no longer
    // charges the reader for the demonstration on the way in.
    layout: { position: 'afterBody', priority: 70, display: 'mobile-only' }
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
      frontmatterKey: 'layoutBoxCta',
      byLang: {
        en: {
          title: 'Read on',
          html: '<p>This page belongs to <a href="{{root}}/en/">{{siteTitle}}</a> — the example template for QuartzControl. An overview of every area is on the <a href="{{root}}/en/">English home page</a>.</p>'
        }
      }
    },
    layout: { position: 'afterBody', priority: 30 }
  },
  {
    source: LAYOUT_BOX_SOURCE,
    name: LAYOUT_BOX_NAME,
    enabled: true,
    order: 540,
    options: {
      html: '<p>{{siteTitle}} · Sprache: {{locale}} · Diese Seite: <code>{{slug}}</code></p>',
      className: 'layout-box-colophon',
      frontmatterKey: 'layoutBoxColophon',
      byLang: { en: { html: '<p>{{siteTitle}} · Language: {{locale}} · This page: <code>{{slug}}</code></p>' } }
    },
    layout: { position: 'footer', priority: 10 }
  },
  {
    // **Ein Stylesheet, das nur diese eine Seite kennt** - und der einzige Weg, im Explorer die
    // *Ordnerseite* zu markieren, auf der man gerade steht.
    //
    // Das Plugin setzt `.active` ausschließlich auf Datei-Anker (`u.data.slug === D` in
    // `dist/index.js`, gelesen). Eine Ordnerzeile bekommt nie eine Klasse; sie trägt nur
    // `data-folderpath`, und die aktuelle Seite steht in `<body data-slug>`. Zwei Attribute
    // miteinander zu vergleichen kann kein Selektor - und der Fold-Zustand als Ersatz ("der
    // tiefste offene Ordner") wäre falsch, sobald jemand von Hand einen weiteren aufklappt.
    //
    // Also wird die Regel gebaut statt gesucht: `{{slug}}` steht beim Rendern der Seite zur
    // Verfügung, und der Platzhalter füllt genau den einen Wert, den der Selektor braucht. Der
    // Kasten rendert nichts als dieses `<style>` und ist selbst ausgeblendet
    // (`nav-explorer.scss`); ein `display: none` nimmt ihn aus dem Fluss, also kostet er auch
    // keine Rinne im Footer-Bereich.
    //
    // Die Grenze dazu: `applyPlaceholders` escaped den Wert als HTML, und ein `<style>` ist ein
    // Raw-Text-Element - eine Entity darin wird nicht zurückgelesen. Slugs sind pfadsicher
    // (`a-z0-9/-`), also trifft das hier nichts; ein Slug mit `&` oder `"` wäre eine Regel, die
    // nicht mehr passt, und nicht etwa eine, die zu viel trifft.
    source: LAYOUT_BOX_SOURCE,
    name: LAYOUT_BOX_NAME,
    enabled: true,
    order: 550,
    options: {
      html: '<style>.explorer .folder-container[data-folderpath="{{slug}}"]{background:var(--tpl-surface-tint)}.explorer .folder-container[data-folderpath="{{slug}}"] .folder-title{color:var(--secondary)}</style>',
      className: 'layout-box-current-folder',
      placeholders: true
    },
    layout: { position: 'footer', priority: 20 }
  }
]

/* --------------------------------------------------------------------- patches by name */

/** name -> partial entry. Anything absent is left exactly as the project had it. */
export const PLUGIN_PATCHES = {
  /* --- components: where each one sits ------------------------------------------------ */
  'page-title': { enabled: true, layout: { position: 'header', priority: 20, group: 'brand' } },

  // The three site-wide controls live in the header, at its right end, on every breakpoint. They
  // were in the left sidebar until 2026-09-04; the header is where a reader looks for them, and it
  // is the one area that survives every frame - including `focus`, where the 404 page has no
  // sidebars at all and previously offered no way to switch the theme or search.
  //
  // `grow` is gone with the move: in a 335px sidebar the search field wanting the leftover width
  // was right, in a header row it would push the two icon buttons to the far edge of a 1440px page.
  //
  // What replaced it was `basis: '15rem'` here, and that is gone again since 2026-09-06: the width
  // is now `width: 15rem` on `.search` in nav-header.scss. A flex-basis sizes the item correctly in
  // every engine - measured 240px in all three - but Gecko and WebKit do not count it towards the
  // *group's* max-content contribution; they use the item's content width, 110px. The group came
  // out 322px wide instead of 452 in Firefox and Safari and its own children hung 130px out of the
  // window. A width on the component makes the wrapper's content size 240px, which every engine
  // agrees on. See nav-header.scss for the full measurement.
  //
  // `shrink: false` stays: without it the field gives up its width to the two icon buttons long
  // before the bar is full.
  search: {
    enabled: true,
    layout: {
      position: 'header',
      priority: 30,
      group: 'toolbar',
      groupOptions: { shrink: false }
    }
  },
  darkmode: { enabled: true, layout: { position: 'header', priority: 40, group: 'toolbar' } },
  'reader-mode': { enabled: true, layout: { position: 'header', priority: 50, group: 'toolbar' } },
  // Off since 2026-09-09. Its whole job was to hold the mobile strip open above the drawer trigger
  // - and there is no strip any more: the trigger is `position: fixed` in the app bar and the
  // drawer is `position: absolute`, so the left area needs no height on a phone at all. Measured
  // before: the spacer was 8px of nothing between two 24px gaps.
  spacer: { enabled: false },
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
    layout: { position: 'left', priority: 30 }
  },
  'recent-notes': {
    enabled: true,
    // `hideFolderPages` nimmt jede `…/index`-Seite aus der Liste, die zwei Startseiten
    // eingeschlossen (`isFolderPath` prüft auf ein `index`-Ende, gelesen in dist/index.js 0.1.0).
    // Ohne sie war der Kasten die Spitze der Gliederung - vier Ordner- und Startseiten von fünf,
    // und auf der Startseite führte er sie selbst auf, zweimal, weil beide Sprachen "Example"
    // heißen. Das ist die Folge davon, dass die Staffelung der Dateizeiten der Gliederung folgt
    // (scripts/stagger-vault-mtimes.mjs): oben steht dann eben das Inhaltsverzeichnis. Ein Kasten,
    // der "zuletzt bearbeitet" heißt, soll Notizen zeigen.
    //
    // Einen Sprachfilter gibt es nicht - `filter` ist eine Funktion und lässt sich in einer YAML-
    // Konfiguration nicht schreiben -, also stehen in beiden Sprachfassungen beide Sprachen im
    // Kasten. Bei einer Staffelung, die DE und EN paarweise verschränkt, ist das jeder zweite
    // Eintrag.
    options: { limit: 5, hideFolderPages: true },
    layout: {
      // 50, and backlinks is 60: within a position quartz sorts by ascending priority, so this is
      // the left of the two boxes. They were the other way round until 2026-09-10 - "was hierher
      // zeigt" first, "zuletzt bearbeitet" second.
      position: 'afterBody',
      priority: 50,
      group: 'custom-8',
      groupOptions: { grow: true, shrink: true, basis: '18rem', align: 'stretch' }
    }
  },

  'table-of-contents': {
    enabled: true,
    // The plugin stops at `maxDepth: 3` by default, so a document with h4/h5/h6 gets a truncated
    // outline - measured: only `depth-0` and `depth-1` ever appeared in the markup, and the five
    // depth rules in aside-toc.scss matched nothing. 6 is the whole range, which is the point of
    // styling all seven levels.
    options: { maxDepth: 6, minEntries: 1, showByDefault: true, collapseByDefault: false },
    layout: { position: 'right', priority: 10, display: 'all' }
  },
  // The two boxes under the text share one area and one group (layout.mjs), so their widths are
  // settled against each other rather than by the grid. `basis` is what decides when they stop
  // being two columns: at 18rem each they sit side by side while the *text block* is at least
  // 600px wide (2 x 288 plus the 24px gap) and go under each other below that, which is the width
  // at which a two-column list of page titles stops being readable.
  //
  // That 600 is the text line, not the window, and the two are far apart - the line is 672px from
  // 1440px of window up and narrows with it. Measured in Firefox at seven widths on 2026-09-10:
  // side by side at 1600/1440 (line 672), 1400 (632) and 1380 (612), under each other from 1366
  // (598) down. So on both of the common laptop widths, 1366 and 1280, these are two full-width
  // boxes stacked - which is the design, and is worth knowing when reading "600px".
  //
  // `stretch` because they now have visible edges - two boxes of different heights beside each
  // other look like one of them failed to load.
  backlinks: {
    enabled: true,
    layout: {
      position: 'afterBody',
      priority: 60,
      group: 'custom-8',
      groupOptions: { grow: true, shrink: true, basis: '18rem', align: 'stretch' }
    }
  },
  graph: { enabled: true, layout: { position: 'right', priority: 20, display: 'desktop-only' } },

  breadcrumbs: { enabled: true, layout: { position: 'beforeBody', priority: 10, condition: 'not-index' } },
  'article-title': { enabled: true, layout: { position: 'beforeBody', priority: 30 } },
  'content-meta': { enabled: true, layout: { position: 'beforeBody', priority: 40 } },
  'note-properties': {
    enabled: true,
    options: {
      includeAll: false,
      // The five type-demo fields are listed alongside the three real ones so the value types the
      // stylesheet distinguishes - boolean true, boolean false, number, list, empty - are actually
      // reachable. A page that does not define them simply shows nothing for them; measured, only
      // the fields present in a page's frontmatter get a row.
      //
      // `falsch` joined them on 2026-09-05: a sweep for styled classes that never occur in the
      // built HTML found `.is-false`, which the stylesheet colours and the demo page carried in its
      // frontmatter without ever listing. A template that styles a state should show it.
      // Both languages' demo fields, because the two demo pages name them in their own language and
      // a field the plugin does not list simply has no row: measured before this, the English "Data
      // types" page showed three properties and none of the four value types it describes.
      includedProperties: [
        'description',
        'tags',
        'section',
        'zahl',
        'wahr',
        'falsch',
        'liste',
        'leer',
        'number',
        'truthy',
        'falsy',
        'list',
        'empty'
      ],
      excludedProperties: [],
      hidePropertiesView: false
    },
    layout: { position: 'afterBody', priority: 40 }
  },
  'tag-list': { enabled: true, layout: { position: 'beforeBody', priority: 20 } },

  footer: {
    enabled: true,
    // The four projects this site actually stands on: the generator, the app that configures it,
    // and the two plugins the template itself uses. site-footer.scss lays them out as one wrapping
    // row, so a fifth would cost nothing.
    options: {
      links: {
        Quartz: 'https://quartz.jzhao.xyz/',
        QuartzControl: 'https://github.com/boxi-os/QuartzControl',
        'Layout Box': 'https://github.com/boxi-os/quartz-layout-box',
        Multilanguage: 'https://github.com/boxi-os/quartz-multilanguage'
      }
    },
    layout: { position: 'footer', priority: 20 }
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
  // `git` is missing from the priority list on purpose. It cannot answer while `content/` is a
  // symlink into a vault, which is this template's whole arrangement - and the default one
  // QuartzControl offers. The plugin finds its repository with `Repository.discover("content")`;
  // libgit2 resolves the symlink and so lands in the *vault's* repo, but then computes the file's
  // path against the project directory, producing a path that leads back out of the vault
  // (`../../../Documents/Example/content/...`). Every lookup throws, and the build warned for 250
  // of 254 pages. Measured: the date came from `filesystem` either way, so dropping `git` changes
  // nothing but the noise; and one `fs.realpathSync()` inside the plugin builds with 0 warnings
  // and real commit timestamps. Put `git` back before `filesystem` once that is upstream.
  'created-modified-date': { enabled: true, options: { defaultDateType: 'modified', priority: ['frontmatter', 'filesystem'] } },
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
  // The drawing pages. Left off until 2026-09-05 by oversight - the entry had to be written by
  // hand (finding 9) and was written disabled, so every .excalidraw.md rendered as its own raw
  // source, warning banner and all, on a page that exists to show the format.
  'obsidian-plugin-excalidraw': { enabled: true },

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
  cname: { enabled: false }
}

/* --------------------------------------------------------------- two languages, one site */

// The second github: plugin of this template. Quartz knows one `locale` per site; this one adds
// the language of a *page* - detection, the link between a page and its translation, the switcher,
// `<html lang>`, hreflang and the notices.
//
// The shape of the content decides most of the options. German sits at the root of the vault and
// English under `en/`, so German pages match no detection strategy and fall into
// `defaultLanguage`, while English ones are found by their folder. That asymmetry is the point:
// a `de/` folder would have meant moving 122 notes and rewriting 99 wikilinks for nothing.
export const MULTILANGUAGE_SOURCE = 'github:boxi-os/quartz-multilanguage'

export const MULTILANGUAGE_ENTRY = {
  source: MULTILANGUAGE_SOURCE,
  name: 'quartz-multilanguage',
  enabled: true,
  // After crawl-links (60). Only `rewriteCrossLanguageLinks` needs that, and it is off - but the
  // order is then already right for anyone who turns it on.
  order: 65,
  options: {
    languages: [
      { code: 'de', label: 'German', native: 'Deutsch', locale: 'de-DE' },
      { code: 'en', label: 'English', native: 'English', locale: 'en-US' }
    ],
    defaultLanguage: 'de',
    detection: ['folder', 'suffix', 'frontmatter'],
    // `frontmatter` first is not the default order by accident: several pages of this site share a
    // title ("Grundform" three times), so the alias strategy alone could not tell which English
    // page is meant and would skip the pair with a warning. Three pages carry no key on purpose
    // and are linked by their alias, one pair by its path - one live proof per strategy.
    linking: ['frontmatter', 'aliases', 'path'],
    frontmatterKeys: { lang: 'lang', key: 'translationKey', translations: 'translations' },
    // The root is the German home page, not a switch, so there is nothing to redirect.
    rootRedirect: 'none',
    rememberChoice: true,
    seo: { hreflang: true, ogLocale: true, xDefault: 'default' },
    // Of the three shapes, the collapsible one is the only one that fits a toolbar next to a
    // search field and does not grow with a third language. All three are styled in
    // styles/nav-language-switcher.scss.
    switcher: {
      style: 'dropdown',
      label: 'native',
      showCurrent: true,
      missing: 'home',
      separator: '|'
    },
    missingTranslationNotice: true,
    availableTranslationNotice: true,
    // Both only work for the folder and suffix conventions. German pages arrive through
    // `default` and have no derivable sibling path, so neither would do anything here.
    fallbackPages: 'none',
    rewriteCrossLanguageLinks: false,
    // Quartz formats dates site-wide from `configuration.locale`. This pulls them back into the
    // language of the page in the browser - the only part of the Quartz interface that becomes
    // bilingual without a second build.
    localizeDates: true,
    publishLanguages: []
  },
  layout: { position: 'header', group: 'toolbar', priority: 60 }
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
