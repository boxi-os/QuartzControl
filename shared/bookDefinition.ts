import type { BookDefinition, BookEntry, BookPageSize, SaveBookInput } from './ipc-contract'

/**
 * The book file: quartz-books/<id>.json in the project root, versioned with it.
 *
 * Not in .quartz-gui/ like the publish targets: that folder is gitignored, and a book is closer to
 * content than to a setting of this machine - it says which pages make up a document and in which
 * order, and it should travel with Git-Sync and with a copy of the project. Outside content/ and
 * static/, so Quartz neither builds nor publishes it (the same reasoning as quartz-forms/keys/).
 *
 * The file is an exchange format between machines, and a person or a merge may edit it. So
 * reading is a normaliser rather than a cast: a missing or wrongly typed key gets its default, an
 * unknown key is kept (a newer QuartzControl may have written it), and only something that is not
 * an object at all is refused. `version` is written with every save; a file without it is read as
 * version 1.
 */

export const BOOK_DIR = 'quartz-books'
export const BOOK_FILE_VERSION = 1

/** A book id is its file name: lowercase ASCII, digits and dashes, starting with a letter or digit. */
export const BOOK_ID = /^[a-z0-9][a-z0-9-]{0,62}$/

/** Limits that keep a hand-edited or hostile file from making the editor or the export unusable.
 *  The handbook has 56 pages; a site with ten thousand is far past anything a document holds. */
export const BOOK_MAX_ENTRIES = 10_000
const MAX_TEXT = 500
const MAX_SLUG = 1024

const PAGE_SIZES: readonly BookPageSize[] = ['A4', 'A5', 'Letter']

export function emptyBook(title = ''): SaveBookInput {
  return {
    title,
    subtitle: '',
    author: '',
    language: '',
    root: '',
    order: null,
    excluded: [],
    coverImage: '',
    toc: true,
    tagIndex: false,
    backlinks: false,
    outsideLinks: 'site',
    pdf: { pageSize: 'A4', landscape: false }
  }
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.slice(0, MAX_TEXT) : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function slug(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_SLUG ? value : null
}

function entry(value: unknown): BookEntry | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const s = slug(v.slug)
  if (s !== null) return { slug: s }
  if (typeof v.heading === 'string' && v.heading.trim()) return { heading: v.heading.slice(0, MAX_TEXT) }
  return null
}

/**
 * The stored object as a BookDefinition, or null when it is not an object. Every field is read on
 * its own, so one broken value costs that value, not the book. Duplicate slugs in `order` keep
 * their first position: a page cannot appear twice in one document without its anchors colliding.
 */
export function normalizeBook(id: string, raw: unknown): BookDefinition | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const defaults = emptyBook()
  let order: BookEntry[] | null = null
  if (Array.isArray(r.order)) {
    const seen = new Set<string>()
    order = []
    for (const item of r.order.slice(0, BOOK_MAX_ENTRIES)) {
      const e = entry(item)
      if (!e) continue
      if ('slug' in e) {
        if (seen.has(e.slug)) continue
        seen.add(e.slug)
      }
      order.push(e)
    }
  }
  const excluded = Array.isArray(r.excluded)
    ? [...new Set(r.excluded.slice(0, BOOK_MAX_ENTRIES).map(slug).filter((s): s is string => s !== null))]
    : []
  const pdf = r.pdf && typeof r.pdf === 'object' ? (r.pdf as Record<string, unknown>) : {}
  return {
    // Unknown keys first, so a key a newer version wrote survives a save by this one.
    ...(r as object),
    id,
    title: text(r.title),
    subtitle: text(r.subtitle),
    author: text(r.author),
    language: text(r.language),
    root: typeof r.root === 'string' ? r.root.replace(/^\/+|\/+$/g, '').slice(0, MAX_SLUG) : '',
    order,
    excluded,
    coverImage: text(r.coverImage),
    toc: bool(r.toc, defaults.toc),
    tagIndex: bool(r.tagIndex, defaults.tagIndex),
    backlinks: bool(r.backlinks, defaults.backlinks),
    outsideLinks: r.outsideLinks === 'text' ? 'text' : 'site',
    pdf: {
      ...(pdf as object),
      pageSize: PAGE_SIZES.includes(pdf.pageSize as BookPageSize) ? (pdf.pageSize as BookPageSize) : 'A4',
      landscape: bool(pdf.landscape, false)
    }
  } as BookDefinition
}

/** What goes into the file: the book without its id (that is the file name), with the version. */
export function serializeBook(book: BookDefinition | SaveBookInput): Record<string, unknown> {
  const { id: _id, ...rest } = book as BookDefinition & { version?: unknown }
  // After the spread: the version says what *this* writer wrote, even over a file a newer one left.
  return { ...rest, version: BOOK_FILE_VERSION }
}

/** A new book's id from its title: "Handbuch für Einsteiger" -> "handbuch-fuer-einsteiger", unique
 *  among `taken` by a counter. German umlauts are spelled out rather than stripped, so two titles
 *  that differ only in an umlaut do not end up as the same word. */
export function bookIdFromTitle(title: string, taken: ReadonlySet<string>): string {
  const base =
    title
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48)
      .replace(/-+$/, '') || 'dokument'
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`
    if (!taken.has(candidate)) return candidate
  }
}
