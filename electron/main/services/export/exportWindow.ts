import { BrowserWindow, session } from 'electron'
import { randomUUID } from 'crypto'
import { markHelperWindow } from '../../appWindows'

/**
 * The window a document export renders the user's site in: never shown, sandboxed, without the
 * app's preload (the site must not see `window.quartzGui`), in its own in-memory session so the
 * site's storage neither mixes with the app's nor outlives the run.
 *
 * What it may load from outside is a rule, not a blanket block - measured on 2026-11-05 (see
 * docs/decisions/export.md): the handbook and Example load KaTeX's stylesheet from jsdelivr,
 * Mermaid from cdnjs, d3/pixi for the graph, and the handbook Plausible's script. A block of all
 * of it loses formulas and diagrams; letting all of it through counts every exported page as a
 * visit and renders a graph nobody sees.
 *
 *  - from the export's own origin: everything;
 *  - from outside: stylesheets, fonts and images (formulas, webfonts, a picture hotlinked in a
 *    note), and scripts only when their address is Mermaid's;
 *  - everything else from outside - other scripts, fetch/XHR, beacons, sockets, frames - is
 *    refused and counted by host, so the run can say what was not loaded.
 */

export interface ExportWindow {
  readonly win: BrowserWindow
  /** Requests refused under the rule above, by `<resourceType> <host>`. */
  readonly refused: Map<string, number>
  /** What was fetched from outside under the rule above, by host: the run names them, because a
   *  picture is a request like any other - a counter pixel on the site counts every exported page
   *  as a visit, and a script of the site can put what it read into the picture's address. */
  readonly fetched: Map<string, number>
  load(url: string): Promise<void>
  /** Runs a self-contained function (see pageScripts.ts) with JSON-serialisable arguments and
   *  further functions passed as source. */
  run<T>(fn: (...args: never[]) => T | Promise<T>, args: unknown[], helpers?: ((...a: never[]) => unknown)[]): Promise<T>
  close(): void
}

const OUTSIDE_TYPES = new Set(['stylesheet', 'font', 'image'])
const MERMAID = /\/mermaid[@/.-]/

/**
 * `offscreen`: rendered without a window on screen, for drawing formulas and diagrams (see
 * drawPictures in writeEpub.ts) - a hidden window on Linux paints no frames.
 */
export function openExportWindow(origin: string, size: { width: number; height: number }, opts: { offscreen?: boolean } = {}): ExportWindow {
  const partition = `quartzcontrol-export-${randomUUID()}`
  const ses = session.fromPartition(partition, { cache: false })
  const refused = new Map<string, number>()
  const fetched = new Map<string, number>()
  ses.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url
    if (url.startsWith(`${origin}/`) || url === origin || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('devtools:')) {
      return callback({})
    }
    let host = url.slice(0, 40)
    try {
      const u = new URL(url)
      // An address that is not on the web (an embedded PDF asks for Chromium's own viewer,
      // chrome-extension://mhjfbmdg…) is nothing a reader of the report could place.
      host = /^(https?|wss?):$/.test(u.protocol) ? u.host : `(${u.protocol.slice(0, -1)})`
    } catch {
      // keep the raw prefix
    }
    const allowed = OUTSIDE_TYPES.has(details.resourceType) || (details.resourceType === 'script' && MERMAID.test(url))
    if (allowed) {
      fetched.set(host, (fetched.get(host) ?? 0) + 1)
      return callback({})
    }
    const key = `${details.resourceType} ${host}`
    refused.set(key, (refused.get(key) ?? 0) + 1)
    callback({ cancel: true })
  })
  // No permission is ever granted: no notifications, camera, geolocation, clipboard.
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))

  const win = new BrowserWindow({
    show: false,
    width: size.width,
    height: size.height,
    skipTaskbar: true,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      partition,
      // A hidden window is throttled like a background tab; Mermaid's layout and the fonts would
      // then crawl or stall.
      backgroundThrottling: false,
      spellcheck: false,
      offscreen: opts.offscreen ?? false
    }
  })
  markHelperWindow(win)
  const wc = win.webContents
  wc.setWindowOpenHandler(() => ({ action: 'deny' }))
  wc.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${origin}/`)) event.preventDefault()
  })
  wc.on('will-redirect', (event, url) => {
    if (!url.startsWith(`${origin}/`)) event.preventDefault()
  })

  // A document is printed light, whatever the app or the system shows: Quartz picks its theme from
  // localStorage `theme`, else prefers-color-scheme, and Mermaid renders its diagrams in that
  // theme - collected in a dark app, every diagram came out dark (measured on Example,
  // 2026-11-05). Both are set once, on the export's own origin, before the first page: the
  // debugger has to attach after a first navigation (attached to the blank start page, its target
  // was replaced by the load and the command failed with "target closed"), and every later page
  // stays on that origin, in that renderer, with both settings.
  let prepared: Promise<void> | null = null
  const prepare = async (): Promise<void> => {
    await win.loadURL(`${origin}/__quartzcontrol/start`)
    if (!wc.debugger.isAttached()) wc.debugger.attach('1.3')
    await wc.debugger.sendCommand('Emulation.setEmulatedMedia', { media: 'screen', features: [{ name: 'prefers-color-scheme', value: 'light' }] })
    await wc.executeJavaScript(`localStorage.setItem('theme', 'light')`)
  }

  return {
    win,
    refused,
    fetched,
    async load(url) {
      prepared ??= prepare()
      await prepared
      await win.loadURL(url)
    },
    async run(fn, args, helpers = []) {
      const call = `(${fn.toString()})(${[...args.map((a) => JSON.stringify(a)), ...helpers.map((h) => `(${h.toString()})`)].join(', ')})`
      // executeJavaScript reports a throw in the page as "Script failed to execute" and drops the
      // message, so the page catches it and hands it back.
      const wrapped = `(async () => { try { return { ok: true, value: await ${call} } } catch (e) { return { ok: false, error: String((e && e.message) || e) } } })()`
      const r = (await wc.executeJavaScript(wrapped)) as { ok: true; value: never } | { ok: false; error: string }
      if (!r.ok) throw new Error(r.error)
      return r.value
    },
    close() {
      if (!win.isDestroyed()) win.destroy()
      void ses.clearStorageData().catch(() => undefined)
    }
  }
}
