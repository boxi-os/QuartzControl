import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MonitorPlay, Play, RefreshCw, Square } from 'lucide-react'
import type { FrameBreakpoint, FrameBreakpointWidths, ServerOptions, ServerStatus } from '@shared/ipc-contract'
import { DEFAULT_FRAME_BREAKPOINT_WIDTHS } from '@shared/gridFrameCss'
import { Button, Card, CardHeading, SegmentedControl, TextInput } from './ui'
import { useStickyState, peekStickyState } from '../state/uiState'
import { serverErrorText } from '../utils/serverStatus'
import { DEFAULT_SERVER_OPTIONS, previewWidthPx, urlFor } from '../utils/sitePreview'

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
 */
const DESKTOP_WIDTH = 1280
const FRAME_HEIGHT = 640

export default function SitePreview({
  projectId,
  projectPath,
  stickyPrefix,
  hint
}: {
  projectId: string
  projectPath: string
  /** Namespace for the remembered page and width, one per editor. */
  stickyPrefix: string
  /** A line under the heading: what to look for on the page. */
  hint?: string
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
  const error = serverErrorText(status, t)

  function commitPage(): void {
    if (draft !== page) setPage(draft)
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
              key={`${url}#${nonce}`}
              src={url}
              title={t('sitePreview.title')}
              sandbox="allow-scripts allow-same-origin allow-forms"
              style={{
                width,
                height: FRAME_HEIGHT / scale,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                // Centred when narrower than the column (a phone).
                marginLeft: width * scale < boxWidth ? (boxWidth - width * scale) / 2 : 0
              }}
              className="block bg-white"
            />
          </div>
          <p className="text-micro text-text-muted">{t('sitePreview.scaled', { width, percent: Math.round(scale * 100) })}</p>
        </>
      )}
    </Card>
  )
}
