/**
 * Putting a project's 31 template stylesheets together into the twelve of 1.1 (docs/plan-1.1.md,
 * section 3) - the same step the template itself took in f2cdb69, run on the project's own files.
 *
 * Pure concatenation, as there: every section starts with a marker line naming the stylesheet it
 * came from, nothing inside a file is changed, and base.scss is split at its own section headings
 * into foundation, layout and content. What the user changed in those files therefore stays, and
 * only the load order moves - in the places f2cdb69 moved it, which were measured unchanged on the
 * built Example and Basis sites.
 *
 * One difference from f2cdb69: the rule that hides the current-folder layout box stays with the
 * explorer instead of moving to plugin-layout-box. It is inside a file the user may have edited,
 * and cutting a rule out of one is not concatenation; both places load before every layout-box
 * rule, so its place in the cascade is the same.
 *
 * What is left alone:
 * - a template stylesheet that is not in the load order (switched off on the Styles page) - put
 *   into a file that loads, it would be switched on;
 * - every stylesheet that is not one of the 31: the user's own, the app's CSS fixes. They keep
 *   their place after the template file they followed. One whose name is taken by one of the
 *   twelve (a user's own `callouts.scss`) is renamed with a number, in the same place;
 * - a project that has been put together once. One of the 31 left out then (switched off) and
 *   switched on later is a stylesheet of its own from there on: a second run wrapped a11y and
 *   plugin-layout-box into themselves again, moved the first components-header aside as a user's
 *   file and put the new one in front of both (forty-second review, finding 4). Told apart by the
 *   header line each of the twelve gets, or by the first line the 1.1 template gives them - not
 *   by a name, since a user's own `callouts.scss` has one (wasConsolidated).
 *
 * Pure, so `shared/` can hold it and a check can load it: the caller reads the files and writes
 * the result (styleService.consolidateStylesheets).
 */

/** The twelve, in load order - scripts/example-template/style-order.mjs. */
export const CONSOLIDATED_ORDER = [
  'foundation',
  'layout',
  'components-header',
  'plugin-multilanguage',
  'components-navigation',
  'plugin-navigations',
  'components-note',
  'content',
  'callouts',
  'pages',
  'plugin-layout-box',
  'a11y'
] as const
export type ConsolidatedName = (typeof CONSOLIDATED_ORDER)[number]

/** The sections of base.scss that open foundation and content; every other one goes to layout. */
const BASE_FOUNDATION = ['box model', 'icons', 'disclosure icons', 'focus', 'skip navigation', 'motion']
const BASE_CONTENT = ['typographic rhythm']

/** What each of the twelve is made of, in order. `base` stands for its share of base.scss. */
const PARTS: Record<ConsolidatedName, string[]> = {
  foundation: ['base'],
  layout: ['base', 'site-footer'],
  'components-header': ['nav-header', 'nav-search', 'page-search-results', 'nav-darkmode', 'nav-reader-mode'],
  'plugin-multilanguage': ['nav-language-switcher'],
  'components-navigation': ['nav-explorer', 'meta-breadcrumbs'],
  'plugin-navigations': ['nav-navigations'],
  'components-note': ['meta-note-properties', 'meta-tag-list', 'aside-toc', 'aside-backlinks', 'aside-graph', 'aside-recent-notes'],
  content: ['meta-title-and-date', 'base', 'body-content', 'body-code', 'body-math', 'body-mermaid', 'body-media'],
  callouts: ['body-callouts'],
  pages: ['page-listing', 'page-bases', 'page-canvas', 'page-popover', 'page-404'],
  'plugin-layout-box': ['plugin-layout-box'],
  a11y: ['a11y']
}

/** The 31 stylesheets of the template before 1.1. */
export const LEGACY_STYLESHEETS: ReadonlySet<string> = new Set(Object.values(PARTS).flat())

const DIR = 'custom/'
const stem = (relativePath: string): string => relativePath.slice(DIR.length).replace(/\.scss$/, '')
const isLegacy = (relativePath: string): boolean => relativePath.startsWith(DIR) && relativePath.endsWith('.scss') && LEGACY_STYLESHEETS.has(stem(relativePath))

// a11y and plugin-layout-box have the same name before and after, so they say nothing about which
// form a project is in: a second run that counted them wrapped both into themselves again.
const CONSOLIDATED_NAMES: ReadonlySet<string> = new Set(CONSOLIDATED_ORDER)
const isLegacyOnly = (relativePath: string): boolean => isLegacy(relativePath) && !CONSOLIDATED_NAMES.has(stem(relativePath))

/** Whether a stylesheet in the load order is one only the 31 have (not a11y or plugin-layout-box). */
export const isLegacyOnlyStylesheet = isLegacyOnly

/**
 * Whether a load order is that of the twelve: it names one of the ten new names and none that only
 * the 31 have. Asked of a template package, whose stylesheets are its own - not of a project, where
 * a file named like one of the twelve may be the user's (wasConsolidated asks the content).
 */
export function isConsolidatedOrder(order: string[]): boolean {
  const newOnly = order.some((p) => p.startsWith(DIR) && CONSOLIDATED_NAMES.has(stem(p)) && !LEGACY_STYLESHEETS.has(stem(p)))
  return newOnly && !order.some(isLegacyOnly)
}

const header = (target: string): string => `// ${target} - put together by QuartzControl; each section is named after its former stylesheet.`
// The header of f957201, before a06f654 shortened it. Never shipped, but projects on the machine
// that built 1.1 were put together with it (gui-test), and read as never put together they would
// be offered the run again once one of the 31 is switched on (forty-fifth review, nebenbei).
const earlierHeader = (target: string): string => `// ${target} - put together by QuartzControl from the stylesheets named in the sections below.`

/**
 * The first line of each of the ten new names as the 1.1 template writes it (scripts/example-
 * template/styles). A project made from that template is recognised by it - the template writes
 * the line, so it can carry it, and a user's own `layout.scss` does not start with it.
 * check:stylesheet-consolidation holds the table against the template, so a reworded first line
 * fails there and not silently here. a11y and plugin-layout-box are left out for the reason above.
 */
export const TEMPLATE_FIRST_LINES: Readonly<Record<string, string>> = {
  foundation: '// Foundation: box model, icons, disclosure chevron, focus, skip link, reduced motion.',
  layout: '// Layout: sticky header, columns and their scrolling, panels, breakpoints, footer.',
  'components-header': '// Header components: the bar, search and its results, colour scheme, reader mode.',
  'plugin-multilanguage': '// quartz-multilanguage: language switcher and translation notice.',
  'components-navigation': "// Navigation components: Quartz's explorer and the breadcrumbs.",
  'plugin-navigations': '// quartz-navigations: all ten variants. This site uses the accordion (left column, drawer on',
  'components-note': '// Note components: properties and tags above it; outline, backlinks, graph and recent notes beside it.',
  content: '// Content: title and date, typographic rhythm, text, code, maths, diagrams and media.',
  callouts: '// Callouts: colours per type, fold, nesting.',
  pages: '// Generated pages: folder and tag listings, Bases, Canvas, Excalidraw, link preview, 404.'
}

/**
 * Whether the project is in the form of the twelve already: a loaded one of them was written by a
 * run before (its header line) or comes from the 1.1 template (its first line, TEMPLATE_FIRST_LINES).
 * `files` maps `custom/<name>.scss` to its content, for every one of the twelve names that is on
 * disk, loaded or not.
 *
 * Until the forty-fourth review the template's half was a count - half of the ten new names
 * loaded - and both sides of it were reachable: a 1.1 project with six of the ten switched off and
 * one of the 31 added was offered the run, which wrapped a11y and plugin-layout-box into
 * themselves again; a 1.0 project with five own files named like the twelve was never offered it
 * (review 2026-10-18, Niedrig 7).
 */
export function wasConsolidated(files: Record<string, string>, order: string[]): boolean {
  const loaded = new Set(order)
  // Only a loaded one counts: a restore of single files can bring back the 31 and their order and
  // leave the twelve lying there unloaded, and the project, back in the form of the 31, was never
  // offered the run again (forty-third review, nebenbei). The forty-second's case is unaffected -
  // after one of the 31 is switched on, the twelve are still loaded.
  const firstLine = (t: string): string => (files[`${DIR}${t}.scss`] ?? '').split('\n', 1)[0].trimEnd()
  return CONSOLIDATED_ORDER.some((t) => {
    if (!loaded.has(`${DIR}${t}.scss`)) return false
    const content = files[`${DIR}${t}.scss`] ?? ''
    return content.startsWith(header(t)) || content.startsWith(earlierHeader(t)) || (TEMPLATE_FIRST_LINES[t] !== undefined && firstLine(t) === TEMPLATE_FIRST_LINES[t])
  })
}

/**
 * Whether there is anything to put together: a stylesheet in the load order that only the 31
 * have, in a project that has not been put together yet (`consolidated`, from wasConsolidated).
 */
export function canConsolidate(order: string[], consolidated: boolean): boolean {
  return !consolidated && order.some(isLegacyOnly)
}

/** How many of the 31 the load order names, or 0 when there is nothing to put together. */
export function legacyCount(order: string[], consolidated: boolean): number {
  return canConsolidate(order, consolidated) ? order.filter(isLegacy).length : 0
}

/** f2cdb69's marker line: `// ===… name`, 100 characters wide. */
export function sectionMarker(name: string): string {
  return `// ${'='.repeat(Math.max(3, 100 - 4 - name.length))} ${name}`
}

/**
 * base.scss in three shares, at its `/* ---- title *\/` headings. What stands before the first
 * heading (the file's own introduction) opens foundation. A heading this table does not know - one
 * the user added - goes to layout, the largest share, which loads right after foundation as base
 * did.
 */
export function splitBase(text: string): Record<'foundation' | 'layout' | 'content', string> {
  const heading = /^\/\* -{3,} (.*?) \*\/\s*$/
  const shares = { foundation: [] as string[], layout: [] as string[], content: [] as string[] }
  let current: keyof typeof shares = 'foundation'
  for (const line of text.split('\n')) {
    const m = heading.exec(line)
    if (m) {
      const title = m[1].trim()
      current = BASE_FOUNDATION.includes(title) ? 'foundation' : BASE_CONTENT.includes(title) ? 'content' : 'layout'
    }
    shares[current].push(line)
  }
  const join = (lines: string[]): string => lines.join('\n').replace(/^\n+|\n+$/g, '')
  return { foundation: join(shares.foundation), layout: join(shares.layout), content: join(shares.content) }
}

export interface ConsolidationPlan {
  /** The new files, `custom/<name>.scss` → content. Only those with at least one part. */
  write: Record<string, string>
  /** The template stylesheets that went into them and are not one of them - the caller removes these. */
  remove: string[]
  /** User files whose name one of the twelve takes: from → to. */
  rename: Record<string, string>
  /** The new load order, as relative paths. */
  order: string[]
}

/**
 * The plan for one project. `order` is its load order (relative to quartz/styles, as
 * styleService keeps it), `files` the content of every stylesheet in it and of every one on disk
 * with one of the twelve names, and `onDisk` every stylesheet in the folder, loaded or not - a
 * name is only free when no file has it.
 */
export function planConsolidation(order: string[], files: Record<string, string>, onDisk: string[]): ConsolidationPlan {
  if (!canConsolidate(order, wasConsolidated(files, order))) return { write: {}, remove: [], rename: {}, order }
  const loaded = new Set(order.filter(isLegacy).map(stem))
  const read = (name: string): string => (files[`${DIR}${name}.scss`] ?? '').replace(/^\n+|\n+$/g, '')
  const base = loaded.has('base') ? splitBase(read('base')) : null

  const write: Record<string, string> = {}
  for (const target of CONSOLIDATED_ORDER) {
    const sections: string[] = []
    for (const part of PARTS[target]) {
      if (!loaded.has(part)) continue
      if (part === 'base') {
        const share = base![target as 'foundation' | 'layout' | 'content']
        if (share) sections.push(`${sectionMarker('base')}\n\n${share}`)
      } else {
        sections.push(`${sectionMarker(part)}\n\n${read(part)}`)
      }
    }
    if (sections.length === 0) continue
    write[`${DIR}${target}.scss`] = `${header(target)}\n\n${sections.join('\n\n')}\n`
  }

  // A user's file that has one of the new names moves aside, keeping its place in the order.
  const taken = new Set(onDisk.filter((p) => !isLegacy(p)))
  const rename: Record<string, string> = {}
  for (const path of Object.keys(write)) {
    if (!taken.has(path)) continue
    const base = path.replace(/\.scss$/, '')
    let n = 2
    while (taken.has(`${base}-${n}.scss`) || `${base}-${n}.scss` in write) n++
    rename[path] = `${base}-${n}.scss`
    taken.add(rename[path])
  }

  // The new order: the twelve in their order, and every other file after the target that the
  // template stylesheet before it went to - or at the start, when none came before it.
  const leading: string[] = []
  const after = new Map<string, string[]>()
  let anchor: string | null = null
  for (const path of order) {
    if (isLegacy(path)) {
      const name = stem(path)
      if (name === 'base') anchor = 'layout'
      else anchor = CONSOLIDATED_ORDER.find((t) => PARTS[t].includes(name)) ?? anchor
      continue
    }
    const placed = rename[path] ?? path
    if (anchor === null) leading.push(placed)
    else after.set(anchor, [...(after.get(anchor) ?? []), placed])
  }
  // An anchor whose file came out empty (base with only foundation sections, say) hands its
  // followers to the nearest earlier target that exists.
  const newOrder = [...leading]
  let pending: string[] = []
  for (const target of CONSOLIDATED_ORDER) {
    const path = `${DIR}${target}.scss`
    if (path in write) {
      newOrder.push(...pending, path)
      pending = []
    }
    pending.push(...(after.get(target) ?? []))
  }
  newOrder.push(...pending)

  // a11y and plugin-layout-box keep their names: they are written, not removed.
  const remove = [...loaded].map((name) => `${DIR}${name}.scss`).filter((path) => !(path in write))
  return { write, remove, rename, order: newOrder }
}
