import type { FrameBreakpoint, FrameBreakpointWidths, ServerOptions } from '@shared/ipc-contract'

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
