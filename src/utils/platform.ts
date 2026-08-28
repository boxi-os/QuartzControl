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

/**
 * Expands a leading "~" to the user's home directory, and answers whether the result is an
 * absolute path at all. Every path schema in electron/main/ipc/schemas.ts requires one, because
 * almost every path in this app comes out of a native dialog - but the Settings page's default
 * project directory is a text field, and a "~/Documents" typed into it (which was that field's own
 * placeholder) reached the boundary and came back as a raw validation error.
 */
export function expandHome(path: string): string {
  const trimmed = path.trim()
  if (trimmed !== '~' && !trimmed.startsWith('~/')) return trimmed
  const home = window.quartzGui.homeDir.replace(/\/$/, '')
  return trimmed === '~' ? home : `${home}/${trimmed.slice(2)}`
}

export function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path)
}
