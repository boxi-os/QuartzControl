import { app, screen, type BrowserWindow, type Rectangle } from 'electron'
import { join } from 'path'
import { readJsonFileOr, writeJsonFile, writeJsonFileSync } from './jsonStore'

// Where the window was, so it opens there again - on the monitor it was on, at the size it had.
// Until 2026-09-13 every start opened 1280×800 in the middle of the primary display, which on a
// desk with two monitors meant dragging it back every time (reported from the beta).
//
// Stored in the app's profile, not in a project: it describes this machine's desk. `bounds` are the
// window's *normal* bounds (getNormalBounds), so a maximized or full-screen window remembers the
// size it returns to, and the two flags say whether to go back into that state.

export interface WindowState {
  bounds: Rectangle
  maximized: boolean
  fullScreen: boolean
}

export const DEFAULT_SIZE = { width: 1280, height: 800 }
export const MIN_SIZE = { width: 960, height: 600 }

// How much of the title strip has to land on a display for the stored position to count. A window
// whose top edge sits on no monitor - the one it was on is unplugged, or the arrangement changed -
// cannot be dragged back, because the strip you would grab is the part that is off-screen.
const TITLE_STRIP = 40
const MIN_VISIBLE_WIDTH = 120

let stored: WindowState | null = null

function statePath(): string {
  return join(app.getPath('userData'), 'window-state.json')
}

function isRectangle(value: unknown): value is Rectangle {
  const r = value as Rectangle
  return !!r && [r.x, r.y, r.width, r.height].every((n) => typeof n === 'number' && Number.isFinite(n))
}

/** Read once before the first window. A missing or broken file means: open as before. */
export async function loadWindowState(): Promise<void> {
  const raw = await readJsonFileOr<Partial<WindowState>>(statePath(), {})
  stored = isRectangle(raw.bounds)
    ? { bounds: raw.bounds, maximized: raw.maximized === true, fullScreen: raw.fullScreen === true }
    : null
}

/**
 * The bounds a new window gets, given the displays attached right now. Pure, so it can be checked
 * against arrangements that are not on this desk: the position is kept only when the title strip
 * overlaps some display's work area by MIN_VISIBLE_WIDTH, the size is capped to the work area it
 * lands on (a window taller than the monitor it opens on has its title bar pushed out of reach) and
 * never below the window's own minimum.
 */
export function fitToDisplays(state: WindowState | null, workAreas: Rectangle[]): Partial<Rectangle> & { width: number; height: number } {
  if (!state || workAreas.length === 0) return { ...DEFAULT_SIZE }
  const { x, y, width, height } = state.bounds
  const strip = { x, y, width, height: TITLE_STRIP }
  const overlap = (a: Rectangle, b: Rectangle): { w: number; h: number } => ({
    w: Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
    h: Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  })
  const home = workAreas.find((area) => {
    const o = overlap(strip, area)
    return o.w >= MIN_VISIBLE_WIDTH && o.h > 0
  })
  const area = home ?? workAreas[0]
  const size = {
    width: Math.max(MIN_SIZE.width, Math.min(width, area.width)),
    height: Math.max(MIN_SIZE.height, Math.min(height, area.height))
  }
  if (!home) return size
  // Keep it on its display after the size cap: a window moved partly past the right or bottom edge
  // is pulled back in, but only as far as needed.
  return {
    ...size,
    x: Math.min(Math.max(x, area.x), area.x + area.width - size.width),
    y: Math.min(Math.max(y, area.y), area.y + area.height - size.height)
  }
}

export function initialWindowBounds(): Partial<Rectangle> & { width: number; height: number } {
  return fitToDisplays(stored, screen.getAllDisplays().map((d) => d.workArea))
}

/** Whether the window should go back to maximized or full screen once it is shown. */
export function initialWindowMode(): { maximized: boolean; fullScreen: boolean } {
  return { maximized: stored?.maximized ?? false, fullScreen: stored?.fullScreen ?? false }
}

/**
 * Keeps the stored state current: shortly after the window stops moving (debounced, so a drag does
 * not write the file sixty times a second), and once more on close - synchronously, because an async
 * write there was cut off by the quit and left its temp file behind on every run.
 */
export function trackWindowState(win: BrowserWindow): void {
  let timer: NodeJS.Timeout | null = null
  const capture = (): void => {
    if (win.isDestroyed()) return
    stored = { bounds: win.getNormalBounds(), maximized: win.isMaximized(), fullScreen: win.isFullScreen() }
  }
  const schedule = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      capture()
      if (stored) void writeJsonFile(statePath(), stored).catch((err) => console.error('[windowState] write failed:', err))
    }, 400)
  }
  for (const event of ['resize', 'move', 'maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen'] as const) {
    win.on(event as 'resize', schedule)
  }
  win.on('close', () => {
    if (timer) clearTimeout(timer)
    capture()
    try {
      if (stored) writeJsonFileSync(statePath(), stored)
    } catch (err) {
      console.error('[windowState] write on close failed:', err)
    }
  })
}
