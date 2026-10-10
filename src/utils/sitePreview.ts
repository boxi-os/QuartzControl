import type { FrameBreakpoint, FrameBreakpointWidths, ServerOptions, SitePreviewReport } from '@shared/ipc-contract'

// Shared by the Vorschau & Build page and the preview beside the plugin editors, so both show a
// phone at the same width and start a server with the same defaults.

// `host` is only meaningful as Quartz's `--remoteDevHost`: an override for the live-reload
// websocket URL when previewing through a tunnel/remote host, which makes the browser connect
// via `wss://` instead of `ws://`. There's no TLS termination on that plain websocket server, so
// defaulting this to 'localhost' (as if it were a bind address) broke live-reload for every local
// session - the browser tried a TLS handshake against a plaintext socket and silently never
// connected. Leave it empty unless the user is actually serving through a tunnel.
//
// There is no `watch` here any more: `quartz build --serve` sets `argv.watch = true` itself
// (quartz/cli/handlers.js), so the switch this page used to offer could never turn watching off.
export const DEFAULT_SERVER_OPTIONS: ServerOptions = { port: 8080, wsPort: 3001, host: '' }

export function urlFor(options: ServerOptions): string {
  return `http://${options.host || 'localhost'}:${options.port}`
}

// The width the preview is rendered at, per band. Real device widths rather than the breakpoints
// themselves - a breakpoint is the *widest* point of its band, which is where a layout is least
// likely to break, and "wie sieht es auf dem Handy aus" means a phone, not an 800px viewport. 390
// is the width this repo has been measuring mobile frame layouts at all along; 820 is an iPad in
// portrait. Both are then pulled into the project's own bands, because those widths are the
// project's to choose (.quartz-gui/layout-breakpoints.json) and a device width that falls outside
// its band would preview the wrong layout entirely - with a 900px mobile breakpoint, 820 is a
// phone, not a tablet.
const PHONE_WIDTH = 390
const TABLET_PORTRAIT_WIDTH = 820

export function previewWidthPx(mode: FrameBreakpoint, widths: FrameBreakpointWidths): number | null {
  if (mode === 'desktop') return null
  if (mode === 'mobile') return Math.min(PHONE_WIDTH, widths.mobile)
  return Math.max(Math.min(TABLET_PORTRAIT_WIDTH, widths.tablet), widths.mobile + 1)
}

// The report of the marking script, read from a postMessage the site's own scripts could have sent
// too - so every field is checked, and anything else is no report.
export function parsePreviewReport(data: unknown): SitePreviewReport | null {
  if (typeof data !== 'object' || data === null) return null
  const d = data as Record<string, unknown>
  if (d.source !== 'quartzcontrol-preview') return null
  const count = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 10_000
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
  if (!count(d.found) || !count(d.visible) || d.visible > d.found) return null
  const vp = d.viewport as Record<string, unknown> | null
  if (typeof vp !== 'object' || vp === null || !num(vp.width) || !num(vp.height)) return null
  let rect: SitePreviewReport['rect'] = null
  if (d.rect !== null) {
    const r = d.rect as Record<string, unknown>
    if (typeof r !== 'object' || !num(r.x) || !num(r.y) || !num(r.width) || !num(r.height)) return null
    if (r.width <= 0 || r.height <= 0) return null
    rect = { x: r.x, y: r.y, width: r.width, height: r.height }
  }
  return { source: 'quartzcontrol-preview', found: d.found, visible: d.visible, rect, viewport: { width: vp.width, height: vp.height } }
}

type Size = { width: number; height: number }

// Room around the element, in pixels of the site, so its outline and a little context stay inside.
const ZOOM_PAD = 24
// Beyond one and a half times the real size a component shows its type, not its layout - at 2 an
// accordion of four entries filled the box with four words.
const ZOOM_MAX = 1.5

/**
 * Where the frame goes when the preview zooms onto `rect` (the element in the frame's viewport):
 * the scale, and the top-left corner of the cut-out in the site's pixels.
 *
 * The scale fits the element's width and height into the box, never below the scale the whole
 * page is shown at, never above ZOOM_MAX - and an element taller than the box is not shrunk
 * further than real size to fit (a sidebar navigation would otherwise end up smaller than with no
 * zoom at all); it is cut at the bottom instead. The cut-out centres the element where it fits
 * and starts at its edge where it does not, and stays inside the frame either way.
 */
export function zoomOnto(rect: NonNullable<SitePreviewReport['rect']>, frame: Size, box: Size, baseScale: number): { scale: number; x: number; y: number } {
  const fitWidth = box.width / (rect.width + 2 * ZOOM_PAD)
  const fitHeight = box.height / (rect.height + 2 * ZOOM_PAD)
  const scale = Math.max(baseScale, Math.min(ZOOM_MAX, fitWidth, Math.max(fitHeight, 1)))
  const view = { width: box.width / scale, height: box.height / scale }
  const along = (start: number, length: number, viewLength: number, frameLength: number): number => {
    const ideal = length + 2 * ZOOM_PAD <= viewLength ? start + length / 2 - viewLength / 2 : start - ZOOM_PAD
    return Math.min(Math.max(0, ideal), Math.max(0, frameLength - viewLength))
  }
  return {
    scale,
    x: along(rect.x, rect.width, view.width, frame.width),
    y: along(rect.y, rect.height, view.height, frame.height)
  }
}
