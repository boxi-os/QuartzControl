import { app, BrowserWindow, dialog, shell, Menu, type MenuItemConstructorOptions } from 'electron'
import { existsSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { IPC, type AppCommand } from '@shared/ipc-contract'
import { mainLanguage, mainT, refreshMainLanguage } from './i18n'

export const APP_NAME = 'QuartzControl'

const isMac = process.platform === 'darwin'

// The two external links the Help menu offers. Opened through shell.openExternal like every other
// outbound link in this app; these are constants here, not user input.
const QUARTZ_DOCS = 'https://quartz.jzhao.xyz/'
const PLUGIN_CATALOG = 'https://github.com/quartz-community'

/**
 * Das Benutzerhandbuch reist als gebaute Website mit (`extraResources`, aus `resources/handbook`,
 * erzeugt von `npm run build:handbook`). Kein Link nach draußen, aus zwei Gründen: Es ist ohne Netz
 * lesbar, und es passt immer zu der Fassung, die gerade installiert ist.
 *
 * Geöffnet wird es im Standardbrowser über `shell.openPath` - ein Pfad, keine URL, deshalb muss
 * hier nichts kodiert werden und ein Leerzeichen im Installationspfad tut nicht weh.
 */
function handbookRoot(): string {
  // Gepackt liegt es neben den anderen extraResources; in der Entwicklung im Repo, damit
  // `npm run dev` denselben Weg nimmt und ihn nicht erst beim Packen jemand ausprobiert.
  const base = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
  return join(base, 'handbook')
}

/**
 * Die Datei zu einer Seite des Handbuchs, oder null, wenn der Pfad hinausführt.
 *
 * Das zod-Schema lässt kein ".." durch, aber ein Schema ist der falsche Ort für die Frage, ob ein
 * Pfad in einem Verzeichnis liegt - dieselbe Trennung wie bei `containedPath()` im Vorlagen-Paket:
 * entschieden wird über `resolve()` und `relative()`, hier wie dort.
 */
function handbookFile(page?: string): string | null {
  const root = handbookRoot()
  // Ohne Seite die Startseite - in der Sprache, in der die App gerade spricht. Für eine *benannte*
  // Seite entscheidet der Renderer, welcher der beiden Pfade gemeint ist (handbookPages.ts): Das
  // Handbuch übersetzt seine Kapitel und dabei auch ihre Pfade.
  if (!page) return join(root, mainLanguage() === 'en' ? 'en' : '.', 'index.html')
  const target = resolve(root, `${page}.html`)
  const rel = relative(root, target)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null
  return target
}

export async function openHandbook(page?: string): Promise<void> {
  // Eine Seite, die es nicht gibt, fällt auf die Startseite zurück statt in einen Fehler: Ein
  // Verweis, der ins Leere zeigt, ist ein Fehler im Handbuch, und der Nutzer kann nichts dafür.
  // Genauso ein Pfad, der hinausführt - der käme ohnehin nur aus einem Angriff.
  const wanted = handbookFile(page)
  const index = wanted && existsSync(wanted) ? wanted : handbookFile()!
  // Erst nachsehen, dann öffnen: `openPath` gibt bei einer fehlenden Datei eine Zeichenkette des
  // Betriebssystems zurück, und die erklärt niemandem, was los ist. Fehlen kann sie in genau einem
  // Fall - ein Bau ohne `resources/handbook`, den `beforePack` mit einer Warnung durchlässt.
  if (!existsSync(index)) {
    await dialog.showMessageBox({
      type: 'info',
      title: mainT('menuHandbook'),
      message: mainT('handbookMissingTitle'),
      detail: mainT('handbookMissingDetail')
    })
    return
  }
  const error = await shell.openPath(index)
  if (error) {
    await dialog.showMessageBox({
      type: 'warning',
      title: mainT('menuHandbook'),
      message: mainT('handbookMissingTitle'),
      detail: error
    })
  }
}

// Where a beta tester's report goes. A constant rather than a setting: it is this app's own
// address, the same domain as its appId, and a field for it would only invite a typo.
const FEEDBACK_ADDRESS = 'mail@holgerborker.de'

// Menu items that need the renderer to go somewhere. The menu lives in the main process and the
// routes live in a HashRouter, so the only way across is an event the renderer listens for -
// App.tsx installs exactly one listener for the app's lifetime.
function navigateRenderer(hashPath: string): void {
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IPC.appNavigate, hashPath)
}

// The other direction a menu item can go: not "move the router" but "act on what is on screen".
// Deliberately not disabled when no page can save - the main process would have to be told about
// every mount and every keystroke to know that, and the renderer already knows: a command nobody
// has registered for does nothing.
function commandRenderer(command: AppCommand): void {
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IPC.appCommand, command)
}

// macOS puts About in the app menu and takes its content from the bundle; everywhere else it has
// to be built, and there is no bundle to read it from.
/**
 * Opens the user's mail client with the version and the platform already in the body.
 *
 * The point is not convenience, it is that those two lines actually arrive. A tester writes what
 * went wrong; almost nobody writes "QuartzControl 1.0.0-beta.1, darwin arm64, Electron 43.4.1"
 * underneath it, and that is the half of the report that decides whether a finding can be placed
 * at all. Filled in rather than asked for.
 *
 * `mailto:` rather than the renderer's openExternal channel, which is restricted to https on
 * purpose: that channel takes a URL from the renderer, and a scheme handler is a "run something"
 * primitive. Here the whole string is built in the main process out of constants and Electron's own
 * version numbers, so there is nothing for a caller to smuggle in.
 */
function sendFeedback(): void {
  const zeilen = [
    '',
    '',
    '---',
    `${APP_NAME} ${app.getVersion()}`,
    `${process.platform} ${process.arch}`,
    `Electron ${process.versions.electron} · Chromium ${process.versions.chrome} · Node ${process.versions.node}`
  ]
  const url =
    `mailto:${FEEDBACK_ADDRESS}` +
    `?subject=${encodeURIComponent(`${APP_NAME} ${app.getVersion()} — ${mainT('feedbackSubject')}`)}` +
    `&body=${encodeURIComponent(zeilen.join('\n'))}`
  void shell.openExternal(url)
}

function showAbout(): void {
  dialog.showMessageBox({
    type: 'info',
    title: mainT('menuAbout'),
    message: `${APP_NAME} ${app.getVersion()}`,
    detail: `${mainT('aboutDetail')}\n\nElectron ${process.versions.electron}\nChromium ${process.versions.chrome}\nNode ${process.versions.node}`
  })
}

// A tailored native menu, not just so it looks right, but because Electron only wires up
// Cmd+C/Cmd+V/Cmd+Z etc. in text fields when a menu with those roles is actually installed.
function buildMenu(): void {
  // Cmd+, / Ctrl+, is what every user of either platform reaches for, and the Settings screen was
  // only reachable by clicking. On macOS it belongs in the app menu right after About; elsewhere
  // there is no app menu, so it goes at the top of File.
  const settingsItem: MenuItemConstructorOptions = {
    label: mainT('menuSettings'),
    accelerator: 'CmdOrCtrl+,',
    click: () => navigateRenderer('/settings')
  }
  // Cmd+S is what one presses on a page that holds a document behind a Save button - Konfiguration,
  // Layout, Stile. It sits in File on both platforms, where every application keeps it.
  const saveItem: MenuItemConstructorOptions = {
    label: mainT('menuSave'),
    accelerator: 'CmdOrCtrl+S',
    click: () => commandRenderer('save')
  }
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: APP_NAME,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              settingsItem,
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ] satisfies MenuItemConstructorOptions[])
      : []),
    {
      label: mainT('menuFile'),
      submenu: isMac
        ? [saveItem, { type: 'separator' }, { role: 'close' }]
        : [saveItem, { type: 'separator' }, settingsItem, { type: 'separator' }, { role: 'quit' }]
    },
    {
      label: mainT('menuEdit'),
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? ([{ role: 'pasteAndMatchStyle' }, { role: 'delete' }, { role: 'selectAll' }] satisfies MenuItemConstructorOptions[])
          : ([{ role: 'delete' }, { role: 'selectAll' }] satisfies MenuItemConstructorOptions[]))
      ]
    },
    {
      label: mainT('menuView'),
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: mainT('menuWindow'),
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? ([{ type: 'separator' }, { role: 'front' }] satisfies MenuItemConstructorOptions[])
          : ([{ role: 'close' }] satisfies MenuItemConstructorOptions[]))
      ]
    },
    // macOS expects a Help menu and this app had none. It is also the only place that answers
    // "where does the truth live" (Quartz's own docs, the plugin org) and "where is my data" from
    // anywhere in the app rather than only from the start screen.
    {
      label: mainT('menuHelp'),
      role: 'help',
      submenu: [
        // Zuerst das eigene Handbuch, dann die fremden Quellen: Wer hier nachsieht, sucht meistens
        // etwas über diese App und nicht über Quartz.
        { label: mainT('menuHandbook'), click: () => void openHandbook() },
        { type: 'separator' },
        { label: mainT('menuFeedback'), click: () => sendFeedback() },
        { type: 'separator' },
        { label: mainT('menuQuartzDocs'), click: () => void shell.openExternal(QUARTZ_DOCS) },
        { label: mainT('menuPluginCatalog'), click: () => void shell.openExternal(PLUGIN_CATALOG) },
        { type: 'separator' },
        { label: mainT('menuDataFolder'), click: () => void shell.openPath(app.getPath('userData')) },
        ...(isMac
          ? []
          : ([{ type: 'separator' }, { label: mainT('menuAbout'), click: () => showAbout() }] satisfies MenuItemConstructorOptions[]))
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

/**
 * Installs the native menu in the language the settings ask for. Called at startup *and* again
 * whenever the language setting changes: the menu is built once from a snapshot of the strings, so
 * without the second call the Sprache select changed the whole renderer instantly while Datei /
 * Bearbeiten / Ansicht kept the language they had at launch until the app was restarted.
 */
export async function applyAppMenu(): Promise<void> {
  await refreshMainLanguage()
  buildMenu()
}
