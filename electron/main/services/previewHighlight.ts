import { BrowserWindow, type WebFrameMain } from 'electron'
import type { SitePreviewHighlightInput } from '../../../shared/ipc-contract'
import { getServerStatus } from './buildService'

// The marks in the preview beside a plugin editor. The site runs on the dev server's origin and the
// renderer on file://, so the renderer cannot reach into the frame - the main process can, through
// WebFrameMain.executeJavaScript, which works on a cross-origin subframe of the app's own window
// (measured 2026-10-10 on the built app, Electron 43: the sandboxed iframe answered, and its
// postMessage reached the page with the frame as source).
//
// Which frame: the one whose origin is this project's running dev server, and nothing else. The
// script is fixed; only the selector varies, and that has passed the schema's shape before it is
// quoted here.

const DEFAULT_PORT = 8080

function previewFrames(origin: string): WebFrameMain[] {
  const out: WebFrameMain[] = []
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    for (const frame of win.webContents.mainFrame.framesInSubtree) {
      if (frame.parent && frame.origin === origin) out.push(frame)
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
 * - Bringing an element into view uses window.scrollTo, never scrollIntoView: the latter scrolls
 *   the app's own containers around the frame as well (the anchor bug of a1575d8).
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
    rects.forEach((r, i) => {
      const box = layer.children[i] as HTMLElement
      box.style.cssText =
        `position:fixed;left:${r.left - 4}px;top:${r.top - 4}px;width:${r.width + 8}px;height:${r.height + 8}px;` +
        `outline:2px solid ${ACCENT};outline-offset:0;border-radius:6px;${dim}`
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

  // Brings the first visible match into the frame's viewport when it is not fully there: centred
  // if it fits, else its top a little below the edge. Centred rather than at the top, because a
  // sticky header covers the top - measured on the basic template, where scrolling a navigation
  // that was already in view put the header over its first entry. A fixed or sticky element does
  // not move either way.
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
    // This one scrolls the scrollable containers inside the page and the window, vertically,
    // with the same `block` answers; inline alignment is left out, the site does not use it.
    Element.prototype.scrollIntoView = function (this: Element, arg?: boolean | ScrollIntoViewOptions): void {
      const block = typeof arg === 'object' && arg !== null ? (arg.block ?? 'start') : arg === false ? 'end' : 'start'
      const delta = (r: DOMRect, top: number, height: number): number => {
        if (block === 'center') return r.top - top - (height - r.height) / 2
        if (block === 'end') return r.bottom - top - height
        if (block === 'nearest') return r.top < top ? r.top - top : r.bottom > top + height ? r.bottom - top - height : 0
        return r.top - top
      }
      for (let p = this.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
        if (/(auto|scroll|overlay)/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight) {
          p.scrollTop += delta(this.getBoundingClientRect(), p.getBoundingClientRect().top + p.clientTop, p.clientHeight)
        }
      }
      scrollBy({ top: delta(this.getBoundingClientRect(), 0, innerHeight), behavior: 'instant' as ScrollBehavior })
    }
    document.addEventListener('nav', () => look(true))
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
  look(fresh || changed)
}
