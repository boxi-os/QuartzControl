import { randomUUID } from 'crypto'
import { open, readFile, rename, rm } from 'fs/promises'

/**
 * How this app's small JSON stores are read and written.
 *
 * Every one of them - projects.json, connections.json, settings.json, publish-targets.json,
 * theme-presets.json, project-prefs.json, running-servers.json, layout-breakpoints.json - used to
 * do `writeFile(path, JSON.stringify(...))` and, on the way back, `try { JSON.parse } catch {
 * return [] }`. Both halves are wrong in the same direction, and together they delete data:
 *
 *  - A plain writeFile truncates the target first and then streams into it, so a crash, a
 *    force-quit or a full disk leaves a half-written file where a complete one used to be.
 *  - The read then cannot parse it, answers with the empty default, and the next write commits
 *    that emptiness over the damaged file - which was the only copy. For connections.json the
 *    overwrite is not even deferred: readAll() ran the legacy migration on *any* parse failure and
 *    wrote its result straight back, so one unreadable byte cost every stored SFTP password,
 *    private key, webhook URL and the GitHub token, silently, on the next read of the store.
 *
 * So writing goes through a temp file that is fsync'd and then renamed over the target - a rename
 * within one directory is atomic, which means a reader ever only sees the old file or the new one.
 * And reading tells "there is no file yet" (the normal first run) apart from "there is a file and
 * it is not readable": the second case never returns a default that a later write could commit,
 * it moves the file aside as `<name>.corrupt-<timestamp>` and records that, so the data is still
 * on disk and the app can say what happened (see getAppInfo).
 */

export type JsonReadResult<T> =
  | { kind: 'ok'; value: T }
  // No file - the normal state before anything has been saved.
  | { kind: 'missing' }
  // A file that exists but could not be read or parsed, or whose shape is not what the caller
  // stores (an array where an object belongs, or a bare `null` from a zero-length file, both of
  // which JSON.parse happily accepts and every caller then treats as data).
  | { kind: 'unreadable'; quarantinedAs: string | null }

export interface QuarantinedFile {
  path: string
  quarantinedAs: string | null
  at: string
}

const quarantined: QuarantinedFile[] = []

/** What had to be moved aside during this session, for the Settings page to report. */
export function listQuarantinedFiles(): QuarantinedFile[] {
  return [...quarantined]
}

function errorCode(err: unknown): string {
  return typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : ''
}

async function quarantine(path: string): Promise<string | null> {
  const target = `${path}.corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}`
  try {
    await rename(path, target)
    quarantined.push({ path, quarantinedAs: target, at: new Date().toISOString() })
    return target
  } catch {
    // Could not even move it - record the problem anyway, since the caller must still not treat
    // the file as absent.
    quarantined.push({ path, quarantinedAs: null, at: new Date().toISOString() })
    return null
  }
}

export async function readJsonFile<T>(path: string): Promise<JsonReadResult<T>> {
  let raw: string
  try {
    raw = await readFile(path, 'utf-8')
  } catch (err) {
    if (errorCode(err) === 'ENOENT') return { kind: 'missing' }
    console.error(`[jsonStore] ${path} is not readable: ${String(err)}`)
    return { kind: 'unreadable', quarantinedAs: await quarantine(path) }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    console.error(`[jsonStore] ${path} does not hold valid JSON: ${String(err)}`)
    return { kind: 'unreadable', quarantinedAs: await quarantine(path) }
  }
  if (parsed === null || typeof parsed !== 'object') {
    console.error(`[jsonStore] ${path} holds neither an object nor a list`)
    return { kind: 'unreadable', quarantinedAs: await quarantine(path) }
  }
  return { kind: 'ok', value: parsed as T }
}

/**
 * The common case: a store that has one shape and one empty default. `missing` and `unreadable`
 * both answer with the fallback - the difference is that the unreadable file has been moved aside
 * first, so committing the fallback over it later cannot lose anything.
 */
export async function readJsonFileOr<T>(path: string, fallback: T): Promise<T> {
  const result = await readJsonFile<T>(path)
  if (result.kind !== 'ok') return fallback
  // An array store that finds an object (or the other way round) is as broken as unparseable
  // JSON, and every caller would go on to call .find/.map on it.
  if (Array.isArray(fallback) !== Array.isArray(result.value)) {
    console.error(`[jsonStore] ${path} has the wrong shape`)
    await quarantine(path)
    return fallback
  }
  return result.value
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  const text = JSON.stringify(value, null, 2)
  // Same directory as the target, or the rename would cross filesystems and stop being atomic.
  const tmp = `${path}.tmp-${process.pid}-${randomUUID().slice(0, 8)}`
  try {
    const handle = await open(tmp, 'w')
    try {
      await handle.writeFile(text, 'utf-8')
      // Without this the rename can land before the data does, which is the one crash window a
      // rename alone does not close.
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(tmp, path)
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => undefined)
    throw err
  }
}
