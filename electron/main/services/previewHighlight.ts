import { BrowserWindow, type WebFrameMain } from 'electron'
import type { SitePreviewHighlightInput } from '../../../shared/ipc-contract'
import { getServerStatus } from './buildService'

// The marks in the preview beside a plugin editor. The site runs on the dev server's origin and the
// renderer on file://, so the renderer cannot reach into the frame - the main process can, through
// WebFrameMain.executeJavaScript, which works on a cross-origin subframe of the app's own window
// (measured 2026-10-10 on the built app, Electron 43: the sandboxed iframe answered, and its
// postMessage reached the page with the frame as source).
//
// "Vorschau & Build" installs the same script without a selector, for its replaced scrollIntoView
// alone.
//
// Whatever this script changes in the site is measured against the site without the embedding
// (CLAUDE.md): the first scrollIntoView kept the app still and landed the heading 45 px off where
// the site puts it (review 2026-10-18, Mittel 1).
//
// Which frame: the one whose origin is this project's running dev server, and nothing else. The
// script is fixed; only the selector varies, and that has passed the schema's shape before it is
// quoted here.

const DEFAULT_PORT = 8080

function previewFrames(origin: string): WebFrameMain[] {
  const out: WebFrameMain[] = []
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    // The app page's own children, not every frame below it: framesInSubtree also lists the site's
    // frames, and one on the same origin (an embedded PDF) got the script too (review 2026-10-18,
    // Niedrig 6).
    for (const frame of win.webContents.mainFrame.frames) {
      if (frame.origin === origin) out.push(frame)
    }
  }
  return out
}

export async function highlightInPreview(input: SitePreviewHighlightInput): Promise<{ applied: boolean }> {
  const status = getServerStatus(input.projectId)
  if (status.state !== 'running' || status.options?.host) return { applied: false }
  const origin = `http://localhost:${status.options?.port ?? DEFAULT_PORT}`
  const frames = previewFrames(origin)
  const script = `(${previewScript.toString()})(${JSON.stringify(input.selector)}, ${JSON.stringify(input.focus)})`
  let applied = false
  for (const frame of frames) {
    try {
      await frame.executeJavaScript(script)
      applied = true
    } catch (err) {
      // A frame that navigated away between the lookup and the call; the page asks again on load.
      console.error('[preview] highlight failed:', err)
    }
  }
  return { applied }
}

/**
 * Runs inside the previewed site, stringified - so it closes over nothing and is written for the
 * site's browser, not for Node. Installing it twice only updates the selector.
 *
 * - The marks hang on <html>, not <body>: Quartz's SPA navigation morphs the body, and a node in it
 *   that the new page does not have is removed.
 * - They follow their element every frame, because a sticky header, an opening accordion or a
 *   drawer moves it without a scroll event. The report to the page does *not*: it is sent when the
 *   script has looked (installed, selector changed, Quartz's `nav`, a resize), so a zoom does not
 *   chase the element while someone scrolls.
 * - Bringing an element into view uses window.scrollTo, never the site's scrollIntoView: that one
 *   is replaced below by one that stops at the frame (the anchor bug of a1575d8).
 */
function previewScript(selector: string | null, focus: boolean): void {
  type State = {
    selector: string | null
    focus: boolean
    layer: HTMLDivElement | null
    raf: number
    elements: Element[]
    lastSize: string
  }
  const w = window as unknown as { __quartzcontrolPreview?: State }
  const ACCENT = '#2563eb'
  let st = w.__quartzcontrolPreview
  const fresh = !st
  if (!st) {
    st = { selector: null, focus: false, layer: null, raf: 0, elements: [], lastSize: '' }
    w.__quartzcontrolPreview = st
  }
  const state = st
  const changed = state.selector !== selector || state.focus !== focus
  state.selector = selector
  state.focus = focus

  function visibleRect(el: Element): DOMRect | null {
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return null
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') return null
    return r
  }

  function collect(): void {
    state.elements = state.selector ? Array.from(document.querySelectorAll(state.selector)) : []
  }

  function draw(): void {
    state.raf = 0
    if (!state.selector) {
      state.layer?.remove()
      state.layer = null
      return
    }
    if (!state.layer || !state.layer.isConnected) {
      state.layer = document.createElement('div')
      state.layer.setAttribute('aria-hidden', 'true')
      state.layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;'
      document.documentElement.appendChild(state.layer)
    }
    const rects = state.elements.map(visibleRect).filter((r): r is DOMRect => r !== null)
    const layer = state.layer
    while (layer.children.length > rects.length) layer.lastChild?.remove()
    while (layer.children.length < rects.length) layer.appendChild(document.createElement('div'))
    // One mark dims the rest of the page; several only get outlines, because overlapping dims
    // would darken each other's element.
    const dim = rects.length === 1 ? 'box-shadow:0 0 0 100vmax rgba(0,0,0,0.4);' : ''
    // Written only when it changed: per frame, the rewrite alone cost 3.3% of a core with one
    // navigation marked (review 2026-10-18, Niedrig 4). The last value stands on the element, so a
    // mark that was removed and recreated is written again.
    rects.forEach((r, i) => {
      const box = layer.children[i] as HTMLElement & { qcStyle?: string }
      const css =
        `position:fixed;left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px;` +
        `outline:2px solid ${ACCENT};outline-offset:0;border-radius:6px;${dim}`
      if (box.qcStyle === css) return
      box.qcStyle = css
      box.style.cssText = css
    })
    state.raf = requestAnimationFrame(draw)
  }

  function report(): void {
    const rects = state.elements.map(visibleRect).filter((r): r is DOMRect => r !== null)
    let rect: { x: number; y: number; width: number; height: number } | null = null
    if (rects.length > 0) {
      const left = Math.min(...rects.map((r) => r.left))
      const top = Math.min(...rects.map((r) => r.top))
      const right = Math.max(...rects.map((r) => r.right))
      const bottom = Math.max(...rects.map((r) => r.bottom))
      rect = { x: left, y: top, width: right - left, height: bottom - top }
    }
    parent.postMessage(
      {
        source: 'quartzcontrol-preview',
        found: state.elements.length,
        visible: rects.length,
        rect,
        viewport: { width: innerWidth, height: innerHeight }
      },
      '*'
    )
  }

  // Brings the first visible match into the frame's viewport when it is not fully there, for the
  // zoom (`focus`) only: centred if it fits, else its top a little below the edge. Centred rather
  // than at the top, because a sticky header covers the top - measured on the basic template,
  // where scrolling a navigation that was already in view put the header over its first entry. A
  // fixed or sticky element does not move either way.
  function reveal(): void {
    const first = state.elements.map(visibleRect).find((r): r is DOMRect => r !== null)
    if (!first) return
    if (first.top >= 0 && first.bottom <= innerHeight) return
    const offset = first.height < innerHeight ? (innerHeight - first.height) / 2 : 24
    scrollTo({ top: Math.max(0, scrollY + first.top - offset), behavior: 'instant' as ScrollBehavior })
  }

  function look(bringIntoView: boolean): void {
    collect()
    if (bringIntoView) reveal()
    if (!state.raf) state.raf = requestAnimationFrame(draw)
    report()
  }

  if (fresh) {
    // scrollIntoView, bounded by the frame. The browser's own scrolls every container around the
    // frame as well, and the site calls it on its own: Quartz's router for a link to an anchor on
    // the same page (the table of contents) and after a navigation to one, quartz-navigations for
    // the active entry. That scrolled the preview's box first, which hid the site's header
    // (a1575d8), and after that fix the app's page - measured 307.5px on the Plugins page; a click
    // handler of our own did not help, because Quartz's router does not ask defaultPrevented.
    // So the native call, limited to the nearest scroll container: everything else - the target's
    // scroll-margin, the site's scroll-padding, `scroll-behavior: smooth`, the inline axis - stays
    // the browser's. A rebuilt calculation of our own skipped all three, and a jump from the table
    // of contents landed under the sticky header (review 2026-10-18, Mittel 1). The one difference
    // to the site: an element inside an inner scroller (the active entry of a navigation list)
    // scrolls that scroller only, not the window as well.
    const native = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (this: Element, arg?: boolean | ScrollIntoViewOptions): void {
      const options: ScrollIntoViewOptions =
        typeof arg === 'object' && arg !== null ? arg : { block: arg === false ? 'end' : 'start', inline: 'nearest' }
      // `container` is newer than the DOM types here; Electron 43 honours it (measured).
      native.call(this, { ...options, container: 'nearest' } as ScrollIntoViewOptions)
    }
    // After a navigation, Quartz scrolls the new page to the top, smoothly - the event comes in the
    // middle of that (measured: `nav` at scrollY 1207, landed at 0). Bringing the element into view
    // then decided on a position that was still moving and could cancel the scroll to the top; so
    // the marks follow at once, and the zoom's scroll waits until the page has settled.
    document.addEventListener('nav', () => {
      look(false)
      if (!state.focus) return
      let done = false
      const settle = (): void => {
        if (done) return
        done = true
        look(state.focus)
      }
      addEventListener('scrollend', settle, { once: true })
      setTimeout(settle, 800)
    })
    addEventListener('resize', () => look(false))
    // An element that grows or shrinks (an accordion, a box whose content loads late) changes what
    // a zoom should frame; checked twice a second rather than per frame.
    setInterval(() => {
      if (!state.selector) return
      const rects = state.elements.map(visibleRect)
      const size = rects.map((r) => (r ? `${Math.round(r.width)}x${Math.round(r.height)}` : '-')).join(',')
      if (size !== state.lastSize) {
        state.lastSize = size
        report()
      }
    }, 500)
  }
  // Only the zoom brings an element into view; a mark alone does not move the page
  // (review 2026-10-18, Niedrig 1: selecting the pager scrolled a phone view by 1319px).
  look(state.focus && (fresh || changed))
}
