import { useEffect, useRef } from 'react'

/**
 * "Cmd+S means this", registered by whichever page is mounted.
 *
 * The sibling of unsavedGuard's flag, and a module-level variable for the same reason: the menu
 * item lives in the main process, the listener for its event lives once in App.tsx, and the page
 * that knows how to save is neither of them - but only ever one page is mounted (see App.tsx's
 * <Routes>), so there is exactly one answer at a time.
 *
 * A page registers `null` when it currently has nothing to save (no edits, a save already running,
 * a sub-tab that saves elsewhere). Cmd+S then does nothing at all, which is the honest outcome: the
 * native menu item cannot be greyed out from here without telling the main process about every
 * mount and every keystroke, and a menu item that is enabled but idle is better than a save that
 * rewrites an unchanged file and makes the dev server rebuild.
 */
let handler: (() => void | Promise<void | boolean>) | null = null

/**
 * Registers this page's save for as long as it is mounted. Pass `null` while there is nothing to
 * save. The handler is read through a ref, so it is always the current one even though the
 * registration itself happens once - a save captured at mount would write the document as it
 * looked then.
 */
export function useSaveCommand(save: (() => void | Promise<void | boolean>) | null): void {
  const current = useRef(save)
  current.current = save
  // Registered only while there *is* something to save, because two things ask: Cmd+S, which can
  // afford a no-op, and the leave guard, which offers a "Speichern" button only if this says yes.
  // A trampoline installed unconditionally would answer yes on a page with nothing to save.
  const active = save !== null

  useEffect(() => {
    if (!active) return
    const run = (): void | Promise<void | boolean> => current.current?.()
    handler = run
    return () => {
      // Only clear what we installed: with two pages briefly overlapping during a route change,
      // the outgoing one's cleanup must not remove the incoming one's registration.
      if (handler === run) handler = null
    }
  }, [active])
}

/**
 * Runs the mounted page's save, if it registered one, and says whether it worked - the leave guard
 * navigates away only on `true`. A page that returns nothing counts as success: it did not throw,
 * and the three pages that register here all return the boolean.
 */
export async function runSaveCommand(): Promise<boolean> {
  if (!handler) return false
  return (await handler()) !== false
}

/**
 * Whether the mounted page has a save to offer right now. The leave guard asks before deciding
 * whether its question has two answers or three - offering "Speichern" on a page that registered
 * nothing would be a button that does nothing.
 */
export function hasSaveCommand(): boolean {
  return handler !== null
}
