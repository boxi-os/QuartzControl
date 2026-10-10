import { AsyncLocalStorage } from "async_hooks";
import { realpath } from "fs/promises";
import { resolve } from "path";

/**
 * A lock per project that waits rather than refusing, with its own queue. Two exist, and no holder
 * of either takes the other: styleLock.whileHoldingStyles and configService.whileHoldingConfig. The
 * third queue per project is the snapshot store's (snapshotService.serialize), and that one is
 * ordered: a restore holds it and takes the config lock at its end, so nothing holding the config
 * lock waits on it (forty-third review, finding 2).
 *
 * Reentrant, because the writers call one another - a template import saves the variables, a
 * rename sets the import order - and a lock that waited for itself would hang the import for
 * good. A caller already holding it for the same project just runs.
 *
 * Per project path through `realpath`, for the reason spelled out at coreUpdatesRunning in
 * updateService: two spellings of one folder must not be two keys. The entry is cleared only when
 * it is still this run's, the way forgetServer() does it - a later caller has already chained onto
 * it and owns the key.
 *
 * Lived in styleLock.ts until the config got a lock of the same kind (df74116), and the file name
 * said "styles" for both (forty-third review, nebenbei).
 */
export function projectLock(): <T>(
  projectPath: string,
  run: () => Promise<T>,
) => Promise<T> {
  const running = new Map<string, Promise<unknown>>();
  const held = new AsyncLocalStorage<ReadonlySet<string>>();
  return (projectPath, run) => holding(running, held, projectPath, run);
}

async function holding<T>(
  running: Map<string, Promise<unknown>>,
  held: AsyncLocalStorage<ReadonlySet<string>>,
  projectPath: string,
  run: () => Promise<T>,
): Promise<T> {
  const key = await realpath(projectPath).catch(() => resolve(projectPath));
  const mine = held.getStore();
  if (mine?.has(key)) return run();
  const inside = (): Promise<T> =>
    held.run(new Set([...(mine ?? []), key]), run);
  const previous = running.get(key);
  // The predecessor's failure is not this run's business, hence the swallowing catch on both
  // sides: one that stays would reject every later caller in the chain.
  const result = (previous ?? Promise.resolve()).then(inside, inside);
  const queued = result.then(
    () => undefined,
    () => undefined,
  );
  running.set(key, queued);
  try {
    return await result;
  } finally {
    await queued;
    if (running.get(key) === queued) running.delete(key);
  }
}
