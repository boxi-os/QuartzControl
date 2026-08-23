import { ipcMain } from 'electron'
import { z } from 'zod'

// Wraps ipcMain.handle so every channel declares the exact shape of its arguments. See schemas.ts
// for why the renderer is not trusted here.
//
// Failure is loud and the handler never runs: a rejected invoke surfaces in the renderer, and the
// main-process log records the channel plus the specific issues. A validation failure is either a
// bug in our own preload/renderer or an attempt to reach a service directly - neither should be
// papered over with a default value.
export function handle<T extends z.ZodTuple>(
  channel: string,
  argsSchema: T,
  fn: (...args: z.infer<T>) => unknown
): void {
  ipcMain.handle(channel, (_event, ...rawArgs: unknown[]) => {
    const result = argsSchema.safeParse(rawArgs)
    if (!result.success) {
      const detail = result.error.issues
        .map((issue) => `arg[${issue.path.join('.')}]: ${issue.message}`)
        .join('; ')
      console.error(`[ipc] ungültige Argumente für "${channel}": ${detail}`)
      throw new Error(`Ungültige Argumente für "${channel}": ${detail}`)
    }
    return fn(...(result.data as z.infer<T>))
  })
}

// For the handful of channels that genuinely take no arguments.
export function handleNoArgs(channel: string, fn: () => unknown): void {
  handle(channel, z.tuple([]), fn)
}
