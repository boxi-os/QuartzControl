import { app, BrowserWindow, dialog, shell, nativeImage } from 'electron'
import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { registerIpcHandlers } from './ipc/handlers'
import { killAllServers, detectOrphanedServers, killOrphanedServers } from './services/buildService'
import { getProject } from './services/projectStore'
import { getSettings } from './services/settingsService'
import { ensureToolPath } from './services/environmentService'
import { applyRuntimeMode } from './services/nodeRuntime'
import { applyGitRuntime } from './services/gitRuntime'
import { mainT } from './i18n'
import { applyAppMenu, APP_NAME } from './menu'
import { applyStoredTheme, windowBackgroundColor } from './theme'

const isMac = process.platform === 'darwin'

// Set before whenReady so Electron picks it up for the macOS app menu / About panel -
// on macOS that top-level menu label always tracks app.name, the Menu template's own
// `label` for that item is ignored. When run unpackaged this only takes effect because we
// call it explicitly; a packaged build would also get it from package.json's `productName`.
app.setName(APP_NAME)

// build/icon.png (512px, copied from build/icon-source/ by scripts/build-icon.mjs) - present both
// in the repo (dev, `npm run dev` runs from the project root) and, once an electron-builder config
// exists, copied next to the packaged app; check both locations rather than assuming one.
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
      // index.js, not index.mjs: the preload is built as CommonJS (see electron.vite.config.ts),
      // because that is the only form Electron loads into a sandboxed renderer.
      preload: join(__dirname, '../preload/index.js'),
      // The renderer sandbox is on. It used to be off, and not by choice: the ESM preload could not
      // be loaded any other way. contextIsolation alone only fences window.quartzGui; without the
      // sandbox a Chromium bug in this renderer - which renders Marketplace and theme data fetched
      // from GitHub - would have had full Node through the preload context. The zod boundary in
      // ipc/schemas.ts is the other half of that reasoning and assumed this half all along.
      sandbox: true,
      // The home directory rides into the preload on argv rather than over IPC: a sandboxed preload
      // has no `os` module, the value is needed synchronously during the first render (expandHome
      // in src/utils/platform.ts), and a sendSync would put a round trip into preload startup for
      // one constant string. Read back by the preload from process.argv.
      additionalArguments: [`--quartz-home-dir=${homedir()}`]
    }
  })

  // Drei Wege, sichtbar zu werden, und nur der erste ist der Normalfall.
  //
  // 'ready-to-show' feuert, wenn der Renderer seinen ersten Frame gemalt hat - deshalb `show:
  // false`, sonst blitzt ein leeres Fenster auf. Auf einer Maschine ohne GL-Kontext kommt dieser
  // Frame aber nie: gemessen auf Debian 13 in einer VM unter Wayland, wo `eglCreateContext ES 3.0`
  // scheitert, der GPU-Prozess sich beendet und Chromium mit `--use-gl=disabled` weiterläuft. Die
  // App lief dort mit Haupt-, Renderer- und GPU-Prozess und zeigte nie ein Fenster - vier
  // Startversuche, vier unsichtbare Instanzen.
  //
  // 'did-finish-load' ist das nächstbeste Signal: das Dokument ist geladen, auch wenn nichts
  // gemalt wurde. Eine Sekunde Nachlauf, damit auf gesunden Maschinen weiterhin der erste Frame
  // gewinnt und niemand ein ungemaltes Fenster sieht. Der Timer darüber ist die letzte Instanz für
  // den Fall, dass auch das Laden nichts meldet.
  let shown = false
  const show = (reason: string): void => {
    if (shown || win.isDestroyed() || win.isVisible()) return
    shown = true
    if (reason !== 'ready-to-show') console.error(`[main] window shown via fallback: ${reason}`)
    win.show()
  }
  win.on('ready-to-show', () => show('ready-to-show'))
  win.webContents.on('did-finish-load', () => setTimeout(() => show('did-finish-load'), 1000).unref())
  setTimeout(() => show('timeout'), 5000).unref()
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

  // setWindowOpenHandler only covers window.open and target="_blank". A navigation of the window
  // itself - a link without a target, or anything setting location.href - was unguarded, and this
  // is the window that carries the preload bridge: a page loaded into it would find window.
  // quartzGui sitting there with every channel behind it. Only the app's own document may load
  // here; http(s) is handed to the browser like any other external link, everything else dropped.
  // (Hash changes and reloads do not fire this, so the HashRouter and dev-mode HMR are unaffected
  // - verified by navigating the whole app in dev with this in place.)
  const rendererFile = join(__dirname, '../renderer/index.html')
  const devOrigin = process.env.ELECTRON_RENDERER_URL ? new URL(process.env.ELECTRON_RENDERER_URL).origin : null
  win.webContents.on('will-navigate', (event, url) => {
    let parsed: URL | null = null
    try {
      parsed = new URL(url)
    } catch {
      /* not a URL at all - nothing this window should be loading */
    }
    // A file: URL has an opaque origin ("null" in Chromium), so the packaged case is decided on
    // the path: exactly the document this window was loaded with, not "any local file".
    const allowed = parsed
      ? devOrigin
        ? parsed.origin === devOrigin
        : parsed.protocol === 'file:' && decodeURIComponent(parsed.pathname) === rendererFile
      : false
    if (allowed) return
    event.preventDefault()
    console.error(`[main] refused to navigate the app window to: ${url}`)
    if (parsed?.protocol === 'https:' || parsed?.protocol === 'http:') shell.openExternal(url)
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Servers left running by a previous non-graceful exit (before-quit below only fires on a
// clean quit) might have been deliberately left running by the user, so this asks rather than
// silently killing them - it could just as well be a server the user still wants to browse.
async function promptForOrphanedServers(): Promise<void> {
  const orphaned = await detectOrphanedServers()
  if (orphaned.length === 0) return

  const lines = await Promise.all(
    orphaned.map(async (o) => {
      const project = await getProject(o.projectId)
      return mainT('orphanEntry', { name: project?.name ?? o.projectId, port: o.port })
    })
  )

  const { response } = await dialog.showMessageBox({
    type: 'question',
    buttons: [mainT('orphanQuit'), mainT('orphanKeepRunning')],
    defaultId: 0,
    cancelId: 1,
    title: mainT('orphanTitle'),
    message: mainT('orphanMessage'),
    detail: lines.join('\n')
  })
  if (response === 0) killOrphanedServers(orphaned)
}

// Everything the first window needs, and nothing else. Each step is guarded on its own: none of
// them is worth losing the window over, and one of them - the runtime setup - reads files that a
// broken installation may not have. What a failure costs is written on the start screen anyway
// (the environment band), which is a far better place for it than a window that never appears.
async function prepareBeforeWindow(): Promise<void> {
  // First, before anything can spawn a command: a packaged app started from the Dock, Finder or a
  // desktop launcher inherits no shell PATH, so without this every project creation and every
  // snapshot fails with ENOENT while the same app started from a terminal works. It looks for git,
  // which is the one tool that still has to come from the outside.
  step('tool path', () => ensureToolPath())
  // Then git: the machine's if it has one, ours otherwise. After ensureToolPath(), because a git
  // reachable only through the login shell's PATH would be invisible before it.
  step('git runtime', () => applyGitRuntime())
  // Then this app's own node/npm/npx at the *front* of that PATH, so Quartz runs on Electron's
  // Node 24 rather than on whatever the machine has - or has not - installed. Last of the three,
  // because the searches above must not be answered by our own shims.
  const settings = await stepAsync('settings', () => getSettings(), {})
  step('node runtime', () => applyRuntimeMode(settings.nodeRuntime ?? 'embedded'))

  if (isMac && app.dock) {
    step('dock icon', () => {
      const iconPath = resolveIconPath()
      if (iconPath) app.dock?.setIcon(nativeImage.createFromPath(iconPath))
    })
  }
  // Before createWindow(), so the very first frame is painted in the chosen appearance.
  await stepAsync('theme', () => applyStoredTheme(), undefined)
  // applyAppMenu() refreshes the cached language first, so every mainT() afterwards - the orphan
  // dialog included - already speaks the language the settings ask for.
  await stepAsync('menu', () => applyAppMenu(), undefined)
}

// English, like every other console.error here: these describe a bug, not something a user typed.
function step(name: string, run: () => void): void {
  try {
    run()
  } catch (error) {
    console.error(`[main] startup step "${name}" failed:`, error)
  }
}

async function stepAsync<T>(name: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run()
  } catch (error) {
    console.error(`[main] startup step "${name}" failed:`, error)
    return fallback
  }
}

app.whenReady().then(async () => {
  await prepareBeforeWindow()
  registerIpcHandlers()

  // The window comes before the orphan question, and that order is the point: the question runs
  // code that can fail - killOrphanedServers walks a process tree and signals pids that may since
  // have been recycled - and until this was reordered, a failure there meant the app kept running
  // with no window at all and nothing on screen to say why. Nothing between "app is ready" and
  // "there is a window" may be able to prevent the window.
  createWindow()
  void promptForOrphanedServers().catch((error) => console.error('[main] orphan check failed:', error))

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
