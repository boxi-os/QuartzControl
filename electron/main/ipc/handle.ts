import { ipcMain } from 'electron'
import { z } from 'zod'
import { mainT } from '../i18n'

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
      console.error(`[ipc] invalid arguments for "${channel}": ${detail}`)
      // The detail is a developer diagnostic and stays in English (see schemas.ts); the sentence
      // in front of it is the only part a user can act on, so that one follows the language
      // setting and says what the app expects them to do about it.
      throw new Error(`${mainT('ipcInvalidArguments', { channel })} ${detail}`)
    }
    return fn(...(result.data as z.infer<T>))
  })
}

// For the handful of channels that genuinely take no arguments.
export function handleNoArgs(channel: string, fn: () => unknown): void {
  handle(channel, z.tuple([]), fn)
}
