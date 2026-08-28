import { BrowserWindow, nativeTheme } from 'electron'
import type { Settings } from '@shared/ipc-contract'
import { getSettings } from './services/settingsService'

// Light/dark/system lives in the main process rather than in the renderer, for one measured
// reason: setting nativeTheme.themeSource also flips the *renderer's* `prefers-color-scheme`
// media query. Verified against this repo's own Electron binary - with the OS on dark,
// themeSource 'light' made the page report `(prefers-color-scheme: light)` and back again on
// 'system'. So Tailwind stays on darkMode: 'media' and every `dark:` variant in the app keeps
// working untouched; the alternative (the class strategy plus a class on <html>) would have
// meant migrating the whole renderer for the same result, and would still have left the native
// dialogs - the host-key confirmation, the file pickers - following the OS instead of the app.
const BACKGROUND = { light: '#f5f5f7', dark: '#1e1e1e' }

/** The colour Electron paints before the renderer's first frame. Must be read *after* the theme
 *  preference has been applied, or the window flashes the OS appearance on open and on resize. */
export function windowBackgroundColor(): string {
  return nativeTheme.shouldUseDarkColors ? BACKGROUND.dark : BACKGROUND.light
}

export function applyTheme(theme: Settings['theme']): void {
  nativeTheme.themeSource = theme === 'light' || theme === 'dark' ? theme : 'system'
  // BrowserWindow's `backgroundColor` is a creation-time option, so an already-open window keeps
  // the colour it was born with - visible as the old theme flashing through during a resize.
  const color = windowBackgroundColor()
  for (const win of BrowserWindow.getAllWindows()) win.setBackgroundColor(color)
}

/** Applied before the first window is created, so there is no frame in the wrong appearance. */
export async function applyStoredTheme(): Promise<void> {
  applyTheme((await getSettings()).theme)
}
