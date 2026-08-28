import { app, BrowserWindow, dialog, shell, Menu, nativeImage, type MenuItemConstructorOptions } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { IPC } from '@shared/ipc-contract'
import { registerIpcHandlers } from './ipc/handlers'
import { killAllServers, detectOrphanedServers, killOrphanedServers } from './services/buildService'
import { getProject } from './services/projectStore'
import { ensureToolPath } from './services/environmentService'
import { resolveMainStrings, type MainStrings } from './i18n'
import { applyStoredTheme, windowBackgroundColor } from './theme'

const isMac = process.platform === 'darwin'
const APP_NAME = 'QuartzControl'

// Set before whenReady so Electron picks it up for the macOS app menu / About panel -
// on macOS that top-level menu label always tracks app.name, the Menu template's own
// `label` for that item is ignored. When run unpackaged this only takes effect because we
// call it explicitly; a packaged build would also get it from package.json's `productName`.
app.setName(APP_NAME)

// build/icon.png (1024px, generated from build/icon.icns's source) - present both in the repo
// (dev, `npm run dev` runs from the project root) and, once an electron-builder config exists,
// copied next to the packaged app; check both locations rather than assuming one.
function resolveIconPath(): string | undefined {
  const candidates = [
    join(app.getAppPath(), 'build/icon.png'),
    join(__dirname, '../../build/icon.png')
  ]
  return candidates.find((p) => existsSync(p))
}

function createWindow(): void {
  const iconPath = resolveIconPath()
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    title: APP_NAME,
    // inset traffic lights over a custom header instead of a native OS title bar,
    // matching how most modern macOS apps (Mail, Notes, Slack) present their chrome
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    // follows the app's own Hell/Dunkel/Systemeinstellung, not just the OS - applyStoredTheme()
    // has already run at this point, so nativeTheme reflects the user's choice
    backgroundColor: windowBackgroundColor(),
    // affects the Windows/Linux taskbar icon and the dev-mode dock icon on Linux; on macOS the
    // Dock icon is set separately below via app.dock.setIcon since BrowserWindow's `icon` option
    // has no effect there
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win.show())
  // Every target="_blank" in the app lands here, and shell.openExternal hands the URL to whatever
  // the OS registered for its scheme - so the scheme is checked rather than trusted. http is
  // allowed alongside https because the dev-server preview link is http://localhost:<port>, which
  // is also why those links cannot use dialog.openExternal's https-only channel.
  win.webContents.setWindowOpenHandler((details) => {
    let scheme = ''
    try {
      scheme = new URL(details.url).protocol
    } catch {
      scheme = ''
    }
    if (scheme === 'https:' || scheme === 'http:') shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// The two external links the Help menu offers. Opened through shell.openExternal like every other
// outbound link in this app; these are constants here, not user input.
const QUARTZ_DOCS = 'https://quartz.jzhao.xyz/'
const PLUGIN_CATALOG = 'https://github.com/quartz-community'

// Menu items that need the renderer to go somewhere. The menu lives in the main process and the
// routes live in a HashRouter, so the only way across is an event the renderer listens for -
// App.tsx installs exactly one listener for the app's lifetime.
function navigateRenderer(hashPath: string): void {
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send(IPC.appNavigate, hashPath)
}

// macOS puts About in the app menu and takes its content from the bundle; everywhere else it has
// to be built, and there is no bundle to read it from.
function showAbout(strings: MainStrings): void {
  dialog.showMessageBox({
    type: 'info',
    title: strings.menuAbout,
    message: `${APP_NAME} ${app.getVersion()}`,
    detail: `${strings.aboutDetail}\n\nElectron ${process.versions.electron}\nChromium ${process.versions.chrome}\nNode ${process.versions.node}`
  })
}

// A tailored native menu, not just so it looks right, but because Electron only wires up
// Cmd+C/Cmd+V/Cmd+Z etc. in text fields when a menu with those roles is actually installed.
function buildMenu(strings: MainStrings): void {
  // Cmd+, / Ctrl+, is what every user of either platform reaches for, and the Settings screen was
  // only reachable by clicking. On macOS it belongs in the app menu right after About; elsewhere
  // there is no app menu, so it goes at the top of File.
  const settingsItem: MenuItemConstructorOptions = {
    label: strings.menuSettings,
    accelerator: 'CmdOrCtrl+,',
    click: () => navigateRenderer('/settings')
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
      label: strings.menuFile,
      submenu: isMac ? [{ role: 'close' }] : [settingsItem, { type: 'separator' }, { role: 'quit' }]
    },
    {
      label: strings.menuEdit,
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
      label: strings.menuView,
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
      label: strings.menuWindow,
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
      label: strings.menuHelp,
      role: 'help',
      submenu: [
        { label: strings.menuQuartzDocs, click: () => void shell.openExternal(QUARTZ_DOCS) },
        { label: strings.menuPluginCatalog, click: () => void shell.openExternal(PLUGIN_CATALOG) },
        { type: 'separator' },
        { label: strings.menuDataFolder, click: () => void shell.openPath(app.getPath('userData')) },
        ...(isMac
          ? []
          : ([{ type: 'separator' }, { label: strings.menuAbout, click: () => showAbout(strings) }] satisfies MenuItemConstructorOptions[]))
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// Servers left running by a previous non-graceful exit (before-quit below only fires on a
// clean quit) might have been deliberately left running by the user, so this asks rather than
// silently killing them - it could just as well be a server the user still wants to browse.
async function promptForOrphanedServers(strings: MainStrings): Promise<void> {
  const orphaned = await detectOrphanedServers()
  if (orphaned.length === 0) return

  const lines = await Promise.all(
    orphaned.map(async (o) => {
      const project = await getProject(o.projectId)
      return `${project?.name ?? o.projectId} — Port ${o.port}`
    })
  )

  const { response } = await dialog.showMessageBox({
    type: 'question',
    buttons: [strings.orphanQuit, strings.orphanKeepRunning],
    defaultId: 0,
    cancelId: 1,
    title: strings.orphanTitle,
    message: strings.orphanMessage,
    detail: lines.join('\n')
  })
  if (response === 0) killOrphanedServers(orphaned)
}

app.whenReady().then(async () => {
  // First, before anything can spawn a command: a packaged app started from the Dock, Finder or a
  // desktop launcher does not inherit a shell's PATH, so node/npm/npx are not findable and every
  // build, plugin install and project creation would fail with ENOENT - while the same app
  // started from a terminal works. Patches process.env.PATH once; a no-op when node is already
  // findable, which is every `npm run dev`.
  ensureToolPath()
  if (isMac && app.dock) {
    const iconPath = resolveIconPath()
    if (iconPath) app.dock.setIcon(nativeImage.createFromPath(iconPath))
  }
  // Before createWindow(), so the very first frame is painted in the chosen appearance.
  await applyStoredTheme()
  const strings = await resolveMainStrings()
  buildMenu(strings)
  registerIpcHandlers()
  await promptForOrphanedServers(strings)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (!isMac) app.quit()
})

app.on('before-quit', () => {
  killAllServers()
})
