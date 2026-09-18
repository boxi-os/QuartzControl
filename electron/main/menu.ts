import { app, BrowserWindow, dialog, shell, Menu, type MenuItemConstructorOptions } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { IPC, type AppCommand } from '@shared/ipc-contract'
import { mainLanguage, mainT, refreshMainLanguage } from './i18n'

export const APP_NAME = 'QuartzControl'

const isMac = process.platform === 'darwin'

// The two external links the Help menu offers. Opened through shell.openExternal like every other
// outbound link in this app; these are constants here, not user input.
const QUARTZ_DOCS = 'https://quartz.jzhao.xyz/'
const PLUGIN_CATALOG = 'https://github.com/quartz-community'

/**
 * Das Benutzerhandbuch wird nur online gepflegt und nicht mehr mitgeliefert (seit 2026-09-18).
 * Es ist die Website, die `QuartzControl-Web` aus dem Handbuch-Vault baut; wie sie veröffentlicht
 * wird, steht in `docs/release.md`. Der Preis: ohne Netz kein Handbuch, und es beschreibt die
 * zuletzt veröffentlichte Fassung, nicht zwingend die installierte.
 *
 * Eine Konstante wie `FEEDBACK_URL` und nicht eine Einstellung: Die Pfade in `handbookPages.ts`
 * gehören zu genau dieser Website.
 */
const HANDBOOK_URL = 'https://boxi-os.github.io/QuartzControl'

/**
 * Wo die Lizenztexte liegen, die mit der App reisen.
 *
 * Eine Funktion statt zweier Stellen, die den Pfad selbst zusammensetzen - die laufen auseinander. Was darin liegt, sagt `resources/licenses/README.txt` -
 * die eigene GPLv3 (aus `LICENSE` im Wurzelverzeichnis, siehe `electron-builder.yml`), dazu git,
 * Electron und der Verweis auf npm.
 */
function licensesRoot(): string {
  const base = app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
  return join(base, 'licenses')
}

/**
 * Öffnet das Verzeichnis mit den Lizenztexten im Dateimanager.
 *
 * `shell.openPath` auf ein *Verzeichnis* ist hier richtig, anders als auf eine `.html`, für die das
 * System womöglich einen Editor führt: Ein Ordner öffnet den Finder bzw. den Dateimanager, und genau das ist gemeint -
 * der Nutzer soll sehen, was drinliegt, und sich den Text aussuchen. Fehlen kann das Verzeichnis
 * nicht: `resources/licenses` liegt im Repo und reist über `extraResources` mit. Wenn es doch
 * fehlt, ist die Installation unvollständig, und der Nutzer bekommt einen Satz statt eines stumm
 * ins Leere laufenden Klicks.
 */
async function openLicenses(): Promise<void> {
  const dir = licensesRoot()
  if (!existsSync(dir)) {
    await dialog.showMessageBox({
      type: 'info',
      title: mainT('menuLicenses'),
      message: mainT('licensesMissingTitle'),
      detail: mainT('licensesMissingDetail')
    })
    return
  }
  await shell.openPath(dir)
}

/**
 * Öffnet das Handbuch im Browser, auf der Seite `page` ("4-gestaltung/04-variablen", ohne Endung)
 * oder ohne sie auf der Startseite in der Sprache, in der die App gerade spricht. Für eine
 * *benannte* Seite entscheidet der Renderer, welcher der beiden Pfade gemeint ist
 * (handbookPages.ts): Das Handbuch übersetzt seine Kapitel und dabei auch ihre Pfade.
 *
 * Ob die Seite existiert, wird hier nicht gefragt - das hieße, bei jedem Klick erst ins Netz zu
 * gehen. Eine Seite, die fehlt, zeigt die 404-Seite der Website.
 */
export async function openHandbook(page?: string): Promise<void> {
  // Segmentweise kodiert, nicht als Ganzes: Ein "/" trennt hier, ein "/" in einem Namen nicht. Das
  // Schema lässt ohnehin nur Buchstaben, Ziffern, "/", "_" und "-" durch.
  const path = page
    ? page.split('/').map(encodeURIComponent).join('/')
    : mainLanguage() === 'en' ? 'en/' : ''
  try {
    await shell.openExternal(`${HANDBOOK_URL}/${path}`)
  } catch (error) {
    await dialog.showMessageBox({
      type: 'warning',
      title: mainT('menuHandbook'),
      message: mainT('handbookOpenFailedTitle'),
      detail: mainT('handbookOpenFailedDetail', { error: (error as Error).message })
    })
  }
}

// Where a beta tester's report goes. A constant rather than a setting: it is this app's own
// repository, the same handle as its appId, and a field for it would only invite a typo.
//
// This item rests on a state that lives outside the repository and that nothing in the repository
// can check: **the repository has to be public.** GitHub does not answer "no access" for a private
// one, it answers 404 - so for the very group this item exists for, everyone who is not a
// collaborator, the browser opens "This is not the web page you are looking for" and the report
// arrives nowhere. Measured on 2026-09-09, before the repository was opened: `gh repo view` said
// `isPrivate: true`, and an unauthenticated `curl` on both this address and the repository itself
// got 404. The `mailto:` version before it reached everyone; this one is the better form only once
// the repository is readable without an invitation. Whoever changes the visibility back takes this
// menu item with it, and the source offer in `resources/licenses/git-LICENSE.txt` does not depend
// on it any more - that one names an address on purpose.
const FEEDBACK_URL = 'https://github.com/boxi-os/QuartzControl/issues/new'

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
 * Opens a new issue in the app's repository with the version and the platform already in the body.
 *
 * The point is not convenience, it is that those two lines actually arrive. A tester writes what
 * went wrong; almost nobody writes "QuartzControl 1.0.0-beta.1, darwin arm64, Electron 43.4.1"
 * underneath it, and that is the half of the report that decides whether a finding can be placed
 * at all. Filled in rather than asked for.
 *
 * Built here rather than handed to the renderer's openExternal channel: that channel takes a URL
 * from a caller, and here the whole string comes out of constants and Electron's own version
 * numbers, so there is nothing to smuggle in. `shell.openExternal` on an https URL always goes to
 * the browser, which is what an issue form needs.
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
    `${FEEDBACK_URL}` +
    `?title=${encodeURIComponent(`${APP_NAME} ${app.getVersion()} — ${mainT('feedbackSubject')}`)}` +
    `&body=${encodeURIComponent(zeilen.join('\n'))}`
  void shell.openExternal(url)
}

function showAbout(): void {
  dialog.showMessageBox({
    type: 'info',
    title: mainT('menuAbout'),
    message: `${APP_NAME} ${app.getVersion()}`,
    // Die Lizenzzeile steht hier, weil GPLv3 §5 sie für ein interaktives Programm an genau der
    // Stelle verlangt, an der es ohnehin über sich Auskunft gibt - und weil der Verweis auf den
    // Quelltext dazugehört: Wer die Binärdatei hat, muss erfahren, wo die Quelle liegt.
    detail: `${mainT('aboutDetail')}\n\n${mainT('aboutLicense')}\n\nElectron ${process.versions.electron}\nChromium ${process.versions.chrome}\nNode ${process.versions.node}`
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
        { label: mainT('menuLicenses'), click: () => void openLicenses() },
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
