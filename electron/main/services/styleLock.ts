import { AsyncLocalStorage } from 'async_hooks'
import { realpath } from 'fs/promises'
import { resolve } from 'path'

/**
 * One writer at a time per project for the project's stylesheets and its font folder, and a
 * writer waits rather than being refused.
 *
 * It began as the fonts' lock (thirty-fourth review, "nebenbei" 2): the font writers rewrite a
 * managed block in custom.scss and then delete the files no rule names any more, and two of them
 * are reached from two doors at once - a save on the Styles page and the build door that refreshes
 * the Google fonts before every build. Run side by side, the one that breaks off deletes files the
 * other skipped as "already there" and is about to name in its block. Refusing would be wrong:
 * neither caller is a click that could be repeated, and the build door has to see the finished
 * state.
 *
 * Every other writer of custom.scss read the file, changed its own section and wrote the whole of
 * it back - outside the lock, so a font writer's write between those two steps was undone, and the
 * other way round. Measured (1.0.1) on a bundle of both services, a Google fetch whose download
 * took 20 ms and a variable save started 0-40 ms after it: of 300 runs, 34 to 44 lost the
 * variable and 27 to 34 the Google block (three runs, one of them the thirty-eighth review's; a
 * measurement, not a constant), none with the lock. The file is written atomically with an fsync, which is what makes the
 * window that wide. So every writer of a stylesheet in these services holds it: custom.scss (the
 * whole file from the CSS tab, the variables, the import order, the font URL migration at the
 * build door, a template import) and the files under quartz/styles, which the font deletion reads
 * as well.
 *
 * Where it ends. It covers the writers in styleService and fontService and the three parts of a
 * template import that write stylesheets (`styles`, `fonts`, `cssVariables`). It does not cover
 * four ways custom.scss is written as part of a repository - a snapshot restore, `quartz sync
 * --pull`, the core update's `git merge`, and the user's own editor - which run under their own
 * lock or under none. Nor does it cover a draft older than the file: the CSS tab reads custom.scss
 * when the page mounts and writes it whole on save, so read and write are not one call under the
 * lock; that gap is what the "stale draft" band on the tab (staleBy) is for. A writer that reads
 * and writes in one function under the lock is safe; one that reads earlier is not made safe by
 * holding it for the write.
 *
 * And nothing under the lock may start something that outlives it. Reentrance goes with the async
 * context, so a timer or an unawaited call planted inside still counts as a holder after the
 * release and runs past the next writer in line (measured on a bundle in the thirty-eighth review:
 * A start, A end, B start, the late one starts, B end). None of the writers does that today - the
 * only timers are AbortSignal.timeout, and progress events are a synchronous broadcast.
 *
 * Reentrant, because the writers call one another - a template import saves the variables, a
 * rename sets the import order - and a lock that waited for itself would hang the import for
 * good. A caller already holding it for the same project just runs.
 *
 * Per project path through `realpath`, for the reason spelled out at coreUpdatesRunning in
 * updateService: two spellings of one folder must not be two keys. The entry is cleared only when
 * it is still this run's, the way forgetServer() does it - a later caller has already chained onto
 * it and owns the key.
 */
const running = new Map<string, Promise<unknown>>()
const held = new AsyncLocalStorage<ReadonlySet<string>>()

export async function whileHoldingStyles<T>(projectPath: string, run: () => Promise<T>): Promise<T> {
  const key = await realpath(projectPath).catch(() => resolve(projectPath))
  const mine = held.getStore()
  if (mine?.has(key)) return run()
  const inside = (): Promise<T> => held.run(new Set([...(mine ?? []), key]), run)
  const previous = running.get(key)
  // The predecessor's failure is not this run's business, hence the swallowing catch on both
  // sides: one that stays would reject every later caller in the chain.
  const result = (previous ?? Promise.resolve()).then(inside, inside)
  const queued = result.then(
    () => undefined,
    () => undefined
  )
  running.set(key, queued)
  try {
    return await result
  } finally {
    await queued
    if (running.get(key) === queued) running.delete(key)
  }
}
