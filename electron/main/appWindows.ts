import { BrowserWindow } from 'electron'

/**
 * The app's own windows, as opposed to helper windows it opens for work - today the hidden window
 * a document export renders the site in (services/export/exportWindow.ts).
 *
 * Until that window existed, "every window" and "the app's window" were the same list, and five
 * places asked BrowserWindow.getAllWindows() for the second: the IPC broadcast, the menu's
 * navigate and command events, the theme colour, macOS' `activate`, and the parent of a native
 * dialog. With a helper window around, a broadcast would send the app's logs into the user's site,
 * and a confirmation dialog could attach to a window nobody can see - modal to it, and so to
 * nothing on screen.
 */

const helperIds = new Set<number>()

export function markHelperWindow(win: BrowserWindow): void {
  const id = win.id
  helperIds.add(id)
  win.once('closed', () => helperIds.delete(id))
}

export function appWindows(): BrowserWindow[] {
  return BrowserWindow.getAllWindows().filter((w) => !helperIds.has(w.id))
}

/** The window a native dialog belongs to: the focused one if it is the app's, else the first. */
export function dialogParent(): BrowserWindow | undefined {
  const focused = BrowserWindow.getFocusedWindow()
  return focused && !helperIds.has(focused.id) ? focused : appWindows()[0]
}
