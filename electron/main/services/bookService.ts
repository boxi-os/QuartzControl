import { join } from 'path'
import { mkdir, readdir, readFile, rm } from 'fs/promises'
import type { BookDefinition, BookListing, SaveBookInput } from '@shared/ipc-contract'
import { BOOK_DIR, BOOK_ID, bookIdFromTitle, normalizeBook, serializeBook } from '@shared/bookDefinition'
import { writeFileAtomic } from './jsonStore'
import { writableTarget } from './templatePackage/shared'
import { mainT } from '../i18n'

/**
 * The books of a project: quartz-books/<id>.json, one file each (see shared/bookDefinition.ts for
 * why there and not in .quartz-gui/).
 *
 * Written like every other store, through a temp file and a rename (jsonStore.writeFileAtomic).
 * Read differently, on purpose: jsonStore moves an unreadable file aside, which is right for a
 * store only this app writes - but this one is versioned. A merge conflict or a typo by hand would
 * be renamed to `<id>.json.corrupt-…`, and the next commit would carry both the rename and the
 * stray file into the user's repository. So an unreadable book stays where it is, is listed with
 * its reason, and cannot be overwritten by a save until it is readable again.
 *
 * Reading never creates the folder; only a save does.
 */

type ReadResult = { kind: 'ok'; book: BookDefinition } | { kind: 'missing' } | { kind: 'unreadable'; reason: string }

function bookDir(projectPath: string): string {
  return join(projectPath, BOOK_DIR)
}

function errorCode(err: unknown): string {
  return typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : ''
}

async function readOne(projectPath: string, id: string): Promise<ReadResult> {
  let raw: string
  try {
    raw = await readFile(join(bookDir(projectPath), `${id}.json`), 'utf-8')
  } catch (err) {
    if (errorCode(err) === 'ENOENT') return { kind: 'missing' }
    return { kind: 'unreadable', reason: String((err as Error).message ?? err) }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    return { kind: 'unreadable', reason: String((err as Error).message ?? err) }
  }
  const book = normalizeBook(id, parsed)
  return book ? { kind: 'ok', book } : { kind: 'unreadable', reason: mainT('bookNotAnObject') }
}

/** The ids of the book files present, whatever their content. A file whose name is not a book id
 *  (`Notizen.json`, a `.corrupt-` copy) is not a book and is passed over. */
async function presentIds(projectPath: string): Promise<string[]> {
  let names: string[]
  try {
    names = await readdir(bookDir(projectPath))
  } catch (err) {
    if (errorCode(err) === 'ENOENT' || errorCode(err) === 'ENOTDIR') return []
    throw err
  }
  return names
    .filter((n) => n.endsWith('.json'))
    .map((n) => n.slice(0, -'.json'.length))
    .filter((id) => BOOK_ID.test(id))
    .sort()
}

export async function listBooks(projectPath: string): Promise<BookListing> {
  const listing: BookListing = { books: [], unreadable: [] }
  for (const id of await presentIds(projectPath)) {
    const r = await readOne(projectPath, id)
    if (r.kind === 'ok') listing.books.push(r.book)
    else if (r.kind === 'unreadable') listing.unreadable.push({ id, reason: r.reason })
  }
  return listing
}

export async function readBook(projectPath: string, id: string): Promise<BookDefinition | null> {
  const r = await readOne(projectPath, id)
  if (r.kind === 'unreadable') throw new Error(mainT('bookUnreadable', { file: `${BOOK_DIR}/${id}.json`, reason: r.reason }))
  return r.kind === 'ok' ? r.book : null
}

export async function saveBook(projectPath: string, input: SaveBookInput): Promise<BookDefinition> {
  let id = input.id
  if (id) {
    // A file that is there but unreadable is somebody's unfinished edit or merge; writing over it
    // would decide that conflict for them.
    const existing = await readOne(projectPath, id)
    if (existing.kind === 'unreadable') {
      throw new Error(mainT('bookUnreadable', { file: `${BOOK_DIR}/${id}.json`, reason: existing.reason }))
    }
  } else {
    id = bookIdFromTitle(input.title, new Set(await presentIds(projectPath)))
  }
  // Every segment, the folder included: quartz-books/ as a link into another project (or a vault)
  // would turn this save into a write there.
  const target = await writableTarget(projectPath, join(BOOK_DIR, `${id}.json`))
  if (!target) throw new Error(mainT('bookPathBlocked', { dir: BOOK_DIR }))
  await mkdir(bookDir(projectPath), { recursive: true })
  const book = { ...input, id } as BookDefinition
  await writeFileAtomic(target, JSON.stringify(serializeBook(book), null, 2) + '\n')
  // Read back what the file now says, so the page holds the normalised form, not its own draft.
  const saved = await readOne(projectPath, id)
  if (saved.kind !== 'ok') throw new Error(mainT('bookUnreadable', { file: `${BOOK_DIR}/${id}.json`, reason: saved.kind }))
  return saved.book
}

export async function deleteBook(projectPath: string, id: string): Promise<void> {
  const target = await writableTarget(projectPath, join(BOOK_DIR, `${id}.json`))
  if (!target) throw new Error(mainT('bookPathBlocked', { dir: BOOK_DIR }))
  await rm(target, { force: true })
}
