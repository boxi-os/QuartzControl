import { app, BrowserWindow, dialog, shell, Menu, nativeImage, nativeTheme, type MenuItemConstructorOptions } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { registerIpcHandlers } from './ipc/handlers'
import { killAllServers, detectOrphanedServers, killOrphanedServers } from './services/buildService'
import { getProject } from './services/projectStore'
import { resolveMainStrings, type MainStrings } from './i18n'

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
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#f5f5f7',
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
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// A tailored native menu, not just so it looks right, but because Electron only wires up
// Cmd+C/Cmd+V/Cmd+Z etc. in text fields when a menu with those roles is actually installed.
function buildMenu(strings: MainStrings): void {
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: APP_NAME,
            submenu: [
              { role: 'about' },
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
      submenu: [isMac ? { role: 'close' } : { role: 'quit' }]
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
  if (isMac && app.dock) {
    const iconPath = resolveIconPath()
    if (iconPath) app.dock.setIcon(nativeImage.createFromPath(iconPath))
  }
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
