// The window's title bar is macOS-only chrome: `titleBarStyle: 'hiddenInset'` (electron/main/
// index.ts) hides the OS title bar and insets the traffic lights over the app's own header, which
// is why every full-height screen reserves a 48px drag strip at the top. Windows and Linux get
// `titleBarStyle: 'default'`, i.e. a real title bar above the window - so that strip is pure empty
// space there, at the top of every single screen.
//
// Read from the preload bridge rather than an IPC call because the answer is needed during the
// first render; fetching it would paint the wrong layout first and then jump.
export const isMac = window.quartzGui.platform === 'darwin'

/**
 * Class names for the top drag strip: a 48px draggable band on macOS, nothing anywhere else.
 * Kept as one export so the four screens that need it cannot drift apart.
 */
export const titlebarStripClass = isMac ? 'titlebar-drag h-12 shrink-0' : ''

/**
 * Whether `child` is `parent` itself or lies inside it, comparing path strings. Both separators
 * are accepted because the renderer sees whatever the main process produced, and a hardcoded '/'
 * would make every such check silently false on Windows - which is what hid BuildServer's
 * "open folder" button there.
 */
export function isInsideDirectory(parent: string, child: string): boolean {
  if (child === parent) return true
  const prefix = /[\\/]$/.test(parent) ? parent : parent + '/'
  return child.startsWith(prefix) || child.startsWith(prefix.slice(0, -1) + '\\')
}
