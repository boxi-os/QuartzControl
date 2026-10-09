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
 *   twelve (a user's own `callouts.scss`) is renamed with a number, in the same place.
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

/**
 * Whether there is anything to put together: a stylesheet in the load order that only the 31
 * have. A project that only has its own files, or has been put together already, has none.
 */
export function canConsolidate(order: string[]): boolean {
  return order.some(isLegacyOnly)
}

/** How many of the 31 the load order names, or 0 when there is nothing to put together. */
export function legacyCount(order: string[]): number {
  return canConsolidate(order) ? order.filter(isLegacy).length : 0
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
 * styleService keeps it), `files` the content of every stylesheet in it and `onDisk` every
 * stylesheet in the folder, loaded or not - a name is only free when no file has it.
 */
export function planConsolidation(order: string[], files: Record<string, string>, onDisk: string[]): ConsolidationPlan {
  if (!canConsolidate(order)) return { write: {}, remove: [], rename: {}, order }
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
        if (share) sections.push(`${sectionMarker('base')}\n// Until 1.1 part of base.scss.\n\n${share}`)
      } else {
        sections.push(`${sectionMarker(part)}\n// Until 1.1 its own stylesheet, ${part}.scss.\n\n${read(part)}`)
      }
    }
    if (sections.length === 0) continue
    const header =
      `// ${target} - put together by QuartzControl from the stylesheets named in the sections below.\n` +
      `// Until 1.1 each of them was a file of its own; a comment that names one of them means that section.`
    write[`${DIR}${target}.scss`] = `${header}\n\n${sections.join('\n\n')}\n`
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
