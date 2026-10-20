import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { MonitorPlay, Play, RefreshCw, Square } from 'lucide-react'
import type { FrameBreakpoint, FrameBreakpointWidths, ServerOptions, ServerStatus, SitePreviewReport } from '@shared/ipc-contract'
import { DEFAULT_FRAME_BREAKPOINT_WIDTHS } from '@shared/gridFrameCss'
import { Button, Card, CardHeading, SegmentedControl, TextInput, Toggle } from './ui'
import { useStickyState, peekStickyState } from '../state/uiState'
import { serverErrorText } from '../utils/serverStatus'
import { DEFAULT_SERVER_OPTIONS, parsePreviewReport, previewWidthPx, urlFor, zoomOnto } from '../utils/sitePreview'

/**
 * The project's real site beside an editor: the dev server's page in a frame, the way the Vorschau
 * & Build page shows it. No copy of the rendering - what the frame shows is what Quartz built.
 *
 * Nothing here reloads after a save: every config write in the app makes the dev server rebuild,
 * and Quartz's own page reloads itself over its websocket once that is done. The button is for
 * the case where that socket is not connected (a page that failed to load).
 *
 * A server started here asks for the ports the Vorschau & Build page holds, so the two pages do not
 * start servers on different ports. A remote dev host is not framed (index.html allows only this
 * machine in frame-src) and the card says so instead.
 *
 * `highlight` is the component the editor beside it has selected. The main process runs a script
 * in the frame that outlines it and reports where it is (previewHighlight.ts); with "Auf Element
 * zoomen" the frame is scaled and moved onto that rectangle. The site keeps its device width
 * either way - only the cut-out changes, so the media queries see what they saw before.
 */
const DESKTOP_WIDTH = 1280
const FRAME_HEIGHT = 640

export default function SitePreview({
  projectId,
  projectPath,
  stickyPrefix,
  hint,
  highlight,
  goTo
}: {
  projectId: string
  projectPath: string
  /** Namespace for the remembered page and width, one per editor. */
  stickyPrefix: string
  /** A line under the heading: what to look for on the page. */
  hint?: string
  /**
   * What to mark: a selector from componentSelectors, the name the list shows, and how many
   * entries of the editor that selector matches - more than one means it has no class of its own.
   */
  highlight?: PreviewHighlight | null
  /** A page the editor beside it wants shown (the Formulare tab's "Zeigen" at a page that embeds
   *  the form). A new object each time, so asking for the same page twice shows it twice. */
  goTo?: { page: string } | null
}): JSX.Element {
  const { t } = useTranslation()
  const [status, setStatus] = useState<ServerStatus>({ state: 'stopped' })
  const [page, setPage] = useStickyState(`${stickyPrefix}.previewPage`, '')
  // What the field holds while typing; the frame loads on Enter or blur, not per keystroke.
  const [draft, setDraft] = useState(page)
  const [mode, setMode] = useStickyState<FrameBreakpoint>(`${stickyPrefix}.previewMode`, 'desktop')
  const [nonce, setNonce] = useState(0)
  const [widths, setWidths] = useState<FrameBreakpointWidths>(DEFAULT_FRAME_BREAKPOINT_WIDTHS)
  const [starting, setStarting] = useState(false)
  // The column's width, for the scale below.
  const boxRef = useRef<HTMLDivElement>(null)
  const [boxWidth, setBoxWidth] = useState(0)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [zoom, setZoom] = useStickyState(`${stickyPrefix}.previewZoom`, false)
  // Counts loads of the frame, so the marks are installed again after every reload - Quartz's own
  // live reload included, which the page hears of only through this event.
  const [loads, setLoads] = useState(0)
  const [report, setReport] = useState<SitePreviewReport | null>(null)
  const selector = highlight?.selector ?? null
  // The first report since the selection changed decides whether the frame goes to a page that
  // has the entry (`highlight.pages`); later ones do not, so a page opened by hand, or a link
  // followed inside the site, stays. The report is read from a ref that the highlight effect
  // clears in the same commit, so a report about the previous selection never decides.
  const decided = useRef(false)
  const lastReport = useRef<SitePreviewReport | null>(null)
  const [jumpedTo, setJumpedTo] = useState<string | null>(null)
  const pages = highlight?.pages ?? null
  const pagesKey = pages ? JSON.stringify(pages) : null

  useEffect(() => {
    if (!goTo) return
    setPage(goTo.page)
    setDraft(goTo.page)
    setJumpedTo(null)
  }, [goTo, setPage])

  useEffect(() => {
    decided.current = false
    setJumpedTo(null)
  }, [selector])

  useEffect(() => {
    void window.quartzGui.server.status(projectId).then(setStatus)
    return window.quartzGui.server.onStatus((id, s) => {
      if (id === projectId) setStatus(s)
    })
  }, [projectId])

  useEffect(() => {
    window.quartzGui.layoutFrames.getBreakpoints(projectPath).then(setWidths).catch(() => {})
  }, [projectPath])

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setBoxWidth(el.clientWidth))
    observer.observe(el)
    setBoxWidth(el.clientWidth)
    return () => observer.disconnect()
  })

  useEffect(() => {
    function onMessage(e: MessageEvent): void {
      // Only the frame itself; anything the site's scripts post is checked field by field.
      if (!frameRef.current || e.source !== frameRef.current.contentWindow) return
      const parsed = parsePreviewReport(e.data)
      if (!parsed) return
      lastReport.current = parsed
      setReport(parsed)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    setReport(null)
    lastReport.current = null
    if (loads === 0) return
    void window.quartzGui.sitePreview.highlight({ projectId, selector, focus: zoom })
  }, [projectId, selector, zoom, loads])

  useEffect(() => {
    const r = lastReport.current
    if (decided.current || !r || !selector || pagesKey === null) return
    decided.current = true
    const list = JSON.parse(pagesKey) as string[]
    const trim = (p: string): string => p.replace(/^\/+|\/+$/g, '')
    if (r.found > 0 || list.length === 0 || list.some((p) => trim(p) === trim(page))) return
    setPage(list[0])
    setDraft(list[0])
    setJumpedTo(list[0])
  }, [report, pagesKey, selector, page, setPage])

  async function start(): Promise<void> {
    setStarting(true)
    try {
      const options = peekStickyState<ServerOptions>(`/project/${projectId}/server`, 'server.options') ?? DEFAULT_SERVER_OPTIONS
      await window.quartzGui.server.start(projectId, projectPath, options)
    } finally {
      setStarting(false)
    }
  }

  const running = status.state === 'running'
  const options = status.options ?? DEFAULT_SERVER_OPTIONS
  const remote = running && !!options.host
  const path = page.replace(/^\/+/, '')
  const url = `${urlFor(options)}/${path}`
  // Beside an editor the column is about half the window, and at 100% the site would see that as
  // its viewport - with a 900px mobile breakpoint a "desktop" preview showed the burger menu. So the
  // frame gets a real device width (desktop: above the tablet band, at least 1280) and is scaled
  // down to the column. Nothing is dragged here, so the scale is free of dnd-kit's measuring
  // (conventions.md: a surface something is dragged onto is not scaled).
  const width = previewWidthPx(mode, widths) ?? Math.max(widths.tablet + 1, DESKTOP_WIDTH)
  const scale = boxWidth > 0 ? Math.min(1, boxWidth / width) : 1
  const frameHeight = FRAME_HEIGHT / scale
  const zoomed =
    zoom && selector && report?.rect && boxWidth > 0
      ? zoomOnto(report.rect, { width, height: frameHeight }, { width: boxWidth, height: FRAME_HEIGHT }, scale)
      : null
  const shownScale = zoomed?.scale ?? scale
  const error = serverErrorText(status, t)

  function commitPage(): void {
    if (draft === page) return
    setPage(draft)
    setJumpedTo(null)
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CardHeading icon={MonitorPlay}>{t('sitePreview.title')}</CardHeading>
        <div className="flex flex-wrap items-center gap-2">
          {running && !remote && (
            <Button variant="ghost" onClick={() => setNonce((n) => n + 1)}>
              <RefreshCw size={13} aria-hidden />
              {t('buildServer.reloadPreview')}
            </Button>
          )}
          {/* The same dev server the Vorschau & Build page runs - there is only one per project -
              so the button says so on hover rather than pretending to close just this frame.
              Offered while starting too, like both other places that stop a server. */}
          {(running || status.state === 'starting') && (
            <Button variant="ghost" onClick={() => void window.quartzGui.server.stop(projectId)} title={t('sitePreview.stopHint')}>
              <Square size={13} aria-hidden />
              {t('sitePreview.stop')}
            </Button>
          )}
        </div>
      </div>
      {hint && <p className="text-micro text-text-muted">{hint}</p>}

      {!running ? (
        <div className="flex flex-col items-start gap-2 rounded-md border border-dashed border-ink/15 px-4 py-6 dark:border-ink/15">
          <p className="text-ui text-text-secondary">
            {status.state === 'starting' ? t('sitePreview.starting') : t('sitePreview.notRunning')}
          </p>
          {error && <p className="text-micro text-red-600 dark:text-red-400">{error}</p>}
          {(status.state === 'stopped' || status.state === 'error') && (
            <Button onClick={() => void start()} disabled={starting}>
              <Play size={13} aria-hidden />
              {t('sitePreview.start')}
            </Button>
          )}
        </div>
      ) : remote ? (
        <p className="text-ui text-text-secondary">{t('sitePreview.remote')}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-48 flex-1 items-center gap-1 text-ui">
              <span className="shrink-0 text-text-muted">{urlFor(options)}/</span>
              <TextInput
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitPage}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitPage()
                }}
                placeholder={t('sitePreview.pagePlaceholder')}
                aria-label={t('sitePreview.page')}
                className="min-w-0 flex-1"
              />
            </div>
            <SegmentedControl
              label={t('buildServer.viewport.label')}
              value={mode}
              onChange={setMode}
              options={[
                { value: 'desktop', label: t('buildServer.viewport.desktop') },
                { value: 'tablet', label: t('buildServer.viewport.tablet') },
                { value: 'mobile', label: t('buildServer.viewport.mobile') }
              ]}
            />
            {highlight && <Toggle label={t('sitePreview.zoom')} checked={zoom} onChange={setZoom} />}
          </div>
          <div
            ref={boxRef}
            // `clip`, not `hidden`: an overflow-hidden box is still a scroll container, and a jump
            // to an anchor inside the site (a click in its table of contents) scrolled it along -
            // measured 116.5px, the site's header gone above the edge. Nobody can scroll a hidden
            // box back, and a reload or another page only replaces the iframe, not this box.
            className="overflow-clip rounded-md border border-ink/[0.08] dark:border-ink/10"
            style={{ height: FRAME_HEIGHT }}
          >
            <iframe
              ref={frameRef}
              key={`${url}#${nonce}`}
              src={url}
              title={t('sitePreview.title')}
              sandbox="allow-scripts allow-same-origin allow-forms"
              onLoad={() => setLoads((n) => n + 1)}
              style={{
                // The frame's own size never changes with the zoom: a new size would be a new
                // viewport, and the site would lay itself out again under the cut-out.
                width,
                height: frameHeight,
                transform: zoomed
                  ? `translate(${-zoomed.x * zoomed.scale}px, ${-zoomed.y * zoomed.scale}px) scale(${zoomed.scale})`
                  : `scale(${scale})`,
                transformOrigin: 'top left',
                // Centred when narrower than the column (a phone).
                marginLeft: width * shownScale < boxWidth ? (boxWidth - width * shownScale) / 2 : 0
              }}
              className="block bg-white motion-safe:transition-transform motion-safe:duration-200"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {/* Rendered empty, so the sentence is announced when it appears (conventions.md). The
                  button stays outside: it changes because the selection did, not on its own. */}
              <p role="status" className="text-micro text-text-secondary">
                {highlight && report
                  ? `${jumpedTo !== null ? `${t('sitePreview.jumped', { page: `/${jumpedTo}`, name: highlight.name })} ` : ''}${markSentence(report, highlight, t)}`
                  : null}
              </p>
              {highlight && highlight.matches > 1 && highlight.onAssignClass && (
                <Button variant="ghost" onClick={highlight.onAssignClass}>
                  {t('sitePreview.assignClass')}
                </Button>
              )}
            </div>
            <p className="text-micro text-text-muted">{t('sitePreview.scaled', { width, percent: Math.round(shownScale * 100) })}</p>
          </div>
        </>
      )}
    </Card>
  )
}

export interface PreviewHighlight {
  selector: string
  /** The entry as the editor's list names it. */
  name: string
  /** How many entries of the config the selector matches; above one, the entry cannot be told apart. */
  matches: number
  /** Whether the entry has a class of its own - false: the selector is the plugin's root. */
  ownClass: boolean
  /**
   * Gives the entry a class of its own (instanceClass.ts). Offered beside the sentence that says
   * it has none; a page without the option leaves it out.
   */
  onAssignClass?: () => void
  /**
   * The pages that show the entry (paths as the page field takes them), when the editor knows
   * them; null while it does not. When the page shown does not have the entry, the preview goes
   * to the first of them once per selection (user, 2026-10-20: a marked form on another page
   * showed nothing).
   */
  pages?: string[] | null
}

function markSentence(report: SitePreviewReport, highlight: PreviewHighlight, t: TFunction): string {
  if (report.found === 0) return t('sitePreview.markNotFound', { name: highlight.name })
  if (report.visible === 0) return t('sitePreview.markHidden', { name: highlight.name })
  // Whether it can be told apart comes from the config; how many marks there are, from the page.
  if (highlight.matches > 1) {
    return t(highlight.ownClass ? 'sitePreview.markShared' : 'sitePreview.markNoClass', { name: highlight.name, count: report.visible })
  }
  return t('sitePreview.marked', { name: highlight.name })
}
