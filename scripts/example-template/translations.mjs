// Wording changes to quartz's own German strings - the `translations` part of the package.
//
// Two things about this part are easy to get wrong:
//
//   1. It exports *what the user changed*, not the whole language file. The comparison needs a
//      baseline, and the baseline is only created when a string is first edited through the app
//      (.quartz-gui/locale-baseline/<code>.ts, see localizationService). So these have to be
//      written through `localization.saveEntry` - editing the file directly would leave the
//      `translations` part with nothing to report.
//   2. `path` is the key path into the locale file, and `kind` says whether the value is a plain
//      string or a template function. Only plain strings are changed here; a template would have
//      to keep its parameters intact and is a different kind of edit.
//
// The changes themselves follow the same rule the app's own vocabulary table follows: one word per
// thing, and the user's word rather than the implementation's. "Backlinks" is the clearest case -
// it is a term from the tool, not from the language.
//
// MEASURED, AND IT MATTERS: none of the component headings below actually change the built site.
// Every visible heading on a Quartz 5 page comes from a component *plugin* - explorer, graph,
// backlinks, recent-notes, table-of-contents, search, reader-mode - and each of those npm packages
// bundles its own compiled translations inside dist/. Checked one by one: all seven contain the
// German strings themselves, so editing quartz/i18n/locales/de-DE.ts (which is what
// localizationService writes, and what this part of a template package carries) leaves them
// untouched. Verified on the built page: "Backlinks", "Graphansicht" and "Zuletzt bearbeitete
// Seiten" all survived the edit.
//
// The entries stay, for two reasons: the mechanism is correct and does reach everything the core
// still renders, and a template part that carries nothing would hide the problem rather than show
// it. But nobody should promise a user that renaming "Backlinks" here renames it on their site.
// Reported as a finding.

export const LOCALE = 'de-DE'

export const TRANSLATIONS = [
  {
    path: ['components', 'backlinks', 'title'],
    kind: 'string',
    value: 'Verweise hierher',
    why: 'Backlinks is a tool word; "what points here" is the thing itself.'
  },
  {
    path: ['components', 'backlinks', 'noBacklinksFound'],
    kind: 'string',
    value: 'Noch verweist nichts hierher',
    why: 'An answer rather than a failure - "found nothing" reads like a broken search.'
  },
  {
    path: ['components', 'graph', 'title'],
    kind: 'string',
    value: 'Umgebung',
    why: '"Graphansicht" names the drawing; "Umgebung" names what it shows.'
  },
  {
    path: ['components', 'explorer', 'title'],
    kind: 'string',
    value: 'Inhalt',
    why: 'The tree is the site\'s contents; "Explorer" is a file manager.'
  },
  {
    path: ['components', 'recentNotes', 'title'],
    kind: 'string',
    value: 'Zuletzt geändert',
    why: 'Shorter, and "Seiten" is already obvious from the list underneath.'
  },
  {
    path: ['components', 'search', 'searchBarPlaceholder'],
    kind: 'string',
    value: 'Suchen …',
    why: '"Suche nach etwas" asks the reader to think of something first.'
  },
  {
    path: ['components', 'themeToggle', 'lightMode'],
    kind: 'string',
    value: 'Helles Farbschema',
    why: 'Consistent with the dark one, and "Modus" says nothing here.'
  },
  {
    path: ['components', 'themeToggle', 'darkMode'],
    kind: 'string',
    value: 'Dunkles Farbschema',
    why: 'See above.'
  },
  {
    path: ['components', 'readerMode', 'title'],
    kind: 'string',
    value: 'Nur der Text',
    why: 'Says what the control does instead of naming a mode.'
  },
  {
    path: ['components', 'transcludes', 'linkToOriginal'],
    kind: 'string',
    value: 'Zur vollständigen Seite',
    why: '"Original" implies this is a copy; it is the same page, shown in part.'
  },
  {
    path: ['propertyDefaults', 'description'],
    kind: 'string',
    value: 'Ohne Beschreibung',
    why: 'Three words shorter, in a place that appears in every search result.'
  }
]
