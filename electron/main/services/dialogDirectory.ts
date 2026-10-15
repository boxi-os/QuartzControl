import { app, BrowserWindow, dialog, type OpenDialogOptions, type OpenDialogReturnValue, type SaveDialogOptions, type SaveDialogReturnValue } from 'electron'
import { statSync } from 'fs'
import { realpath } from 'fs/promises'
import { dirname, join, sep } from 'path'
import { readJsonFileOr, writeJsonFile } from './jsonStore'
import { listProjects } from './projectStore'

// Where an open or save dialog starts when its caller names no folder of its own: the folder the
// last dialog ended in, otherwise Documents. Without a defaultPath (or with a bare file name, which
// is what the two save dialogs pass) macOS opened every one of them in Downloads, so picking three
// images from the same folder meant navigating there three times (reported 2026-10-11).
//
// One folder for all dialogs, not one per purpose: the renderer would have to name the purpose on
// six positional channels, and "where I just was" is what the user expects from the next dialog.
// Stored in the app's profile like the window state - it describes this machine, not a project.

let last: string | null | undefined

function statePath(): string {
  return join(app.getPath('userData'), 'dialog-state.json')
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/** The folder the next dialog opens in. A remembered folder that is gone falls back to Documents. */
export async function dialogStartDirectory(): Promise<string> {
  if (last === undefined) {
    const raw = await readJsonFileOr<{ lastDirectory?: unknown }>(statePath(), {})
    last = typeof raw.lastDirectory === 'string' ? raw.lastDirectory : null
  }
  return last && isDirectory(last) ? last : app.getPath('documents')
}

/**
 * The folder a save dialog opens in: the remembered one, unless it lies in the `content/` of a
 * registered project - followed through its symlink into a vault. Quartz copies every file there
 * that is not Markdown into the site, so a snapshot or a template saved where the last picture
 * came from went online with the next publish, the whole project inside (forty-fifth review,
 * Niedrig 6). Then Documents. An open dialog may start there; it only reads.
 */
export async function saveDialogStartDirectory(): Promise<string> {
  const start = await dialogStartDirectory()
  return (await inPublishedContent(start)) ? app.getPath('documents') : start
}

async function inPublishedContent(folder: string): Promise<boolean> {
  const real = await realpath(folder).catch(() => folder)
  const within = (dir: string, root: string): boolean => dir === root || dir.startsWith(root + sep)
  for (const project of await listProjects().catch(() => [])) {
    const content = join(project.path, 'content')
    const roots = [content, await realpath(content).catch(() => content)]
    if (roots.some((root) => within(folder, root) || within(real, root))) return true
  }
  return false
}

/**
 * Remembers the folder a dialog ended in: the one holding the chosen file, and for a picked folder
 * its parent - the next dialog then shows the folder that was picked, rather than its inside.
 */
export function rememberDialogResult(chosen: string): void {
  const folder = dirname(chosen)
  if (folder === last) return
  last = folder
  void writeJsonFile(statePath(), { lastDirectory: folder }).catch((err) => console.error('[dialogDirectory] write failed:', err))
}

// Attached to the window, the way the confirm dialog is: on macOS a sheet, and while it is open the
// window takes no clicks. Without a window the panel floated free, and a second click on the same
// button opened a second one beside it (Nutzerbefund 2026-10-14).
function parentWindow(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
}

export function showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
  const win = parentWindow()
  return win ? dialog.showOpenDialog(win, options) : dialog.showOpenDialog(options)
}

export function showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogReturnValue> {
  const win = parentWindow()
  return win ? dialog.showSaveDialog(win, options) : dialog.showSaveDialog(options)
}
