import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isInsideDirectory } from '../utils/platform'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FolderOpen,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react'
import { useProject } from './ProjectLayout'
import type {
  BuildOutputInfo,
  FrameBreakpoint,
  FrameBreakpointWidths,
  ServerOptions,
  ServerStatus,
  BuildResult
} from '@shared/ipc-contract'
import { DEFAULT_FRAME_BREAKPOINT_WIDTHS } from '@shared/gridFrameCss'
import { Badge, Button, Card, Field, PageHeader, SegmentedControl, TextInput, useCopyToClipboard } from '../components/ui'
import { LogConsole } from '../components/LogConsole'
import { formatIpcError } from '../components/ErrorSurface'
import { TAB_ICONS } from './navConfig'
import { EMPTY_LOG_LINES, useLogStore } from '../state/store'
import { useStickyState } from '../state/uiState'
import { formatBytes, formatRelativeTime } from '../utils/format'
import { serverErrorText } from '../utils/serverStatus'

// `host` is only meaningful as Quartz's `--remoteDevHost`: an override for the live-reload
// websocket URL when previewing through a tunnel/remote host, which makes the browser connect
// via `wss://` instead of `ws://`. There's no TLS termination on that plain websocket server, so
// defaulting this to 'localhost' (as if it were a bind address) broke live-reload for every local
// session - the browser tried a TLS handshake against a plaintext socket and silently never
// connected. Leave it empty unless the user is actually serving through a tunnel.
//
// There is no `watch` here any more: `quartz build --serve` sets `argv.watch = true` itself
// (quartz/cli/handlers.js), so the switch this page used to offer could never turn watching off.
const DEFAULT_OPTIONS: ServerOptions = { port: 8080, wsPort: 3001, host: '' }

function urlFor(options: ServerOptions): string {
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

function previewWidthPx(mode: FrameBreakpoint, widths: FrameBreakpointWidths): number | null {
  if (mode === 'desktop') return null
  if (mode === 'mobile') return Math.min(PHONE_WIDTH, widths.mobile)
  return Math.max(Math.min(TABLET_PORTRAIT_WIDTH, widths.tablet), widths.mobile + 1)
}

export default function BuildServer(): JSX.Element {
  const { t, i18n } = useTranslation()
  const project = useProject()
  const [status, setStatus] = useState<ServerStatus>({ state: 'stopped' })
  // The options the *form* holds. Sticky, because a route fully unmounts on a sidebar switch and a
  // port typed a moment ago should still be there - and because plain useState made the fields
  // contradict the page: with a server running on 9000, coming back from another area showed 8080
  // next to a link to :9000 (reproduced in the running app).
  const [options, setOptions] = useStickyState<ServerOptions>('server.options', DEFAULT_OPTIONS)
  const [optionsOpen, setOptionsOpen] = useStickyState('server.optionsOpen', false)
  const [previewOpen, setPreviewOpen] = useStickyState('server.previewOpen', true)
  // Remounts the iframe. A cache-busting query would work too, but it changes the URL the user is
  // looking at - and Quartz serves the site at clean paths.
  const [previewNonce, setPreviewNonce] = useState(0)
  const [previewMode, setPreviewMode] = useStickyState<FrameBreakpoint>('server.previewMode', 'desktop')
  const [breakpoints, setBreakpoints] = useState<FrameBreakpointWidths>(DEFAULT_FRAME_BREAKPOINT_WIDTHS)
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null)
  const [building, setBuilding] = useState(false)
  const [output, setOutput] = useState<BuildOutputInfo | null>(null)
  const [outputDir, setOutputDir] = useState('')
  const [outputDirError, setOutputDirError] = useState<string | null>(null)
  const logs = useLogStore((s) => s.serverLogs[project.id] ?? EMPTY_LOG_LINES)
  const buildLogs = useLogStore((s) => s.buildLogs[project.id] ?? EMPTY_LOG_LINES)
  const clearServerLog = useLogStore((s) => s.clearServerLog)
  const clearBuildLog = useLogStore((s) => s.clearBuildLog)
  const appendBuildLog = useLogStore((s) => s.appendBuildLog)
  const { copied, copy } = useCopyToClipboard()

  useEffect(() => {
    window.quartzGui.server.status(project.id).then((initial) => {
      setStatus(initial)
      // A running server's real options win over whatever the form remembered: they are what the
      // process was actually started with, and the fields are disabled while it runs, so leaving
      // them at their old values would print a port nobody is listening on.
      if (initial.options) setOptions(initial.options)
    })
    const offStatus = window.quartzGui.server.onStatus((projectId, s) => {
      if (projectId === project.id) setStatus(s)
    })
    return () => {
      offStatus()
    }
  }, [project.id, setOptions])

  const refreshOutput = useCallback(
    async (dir: string) => {
      setOutput(await window.quartzGui.build.lastOutput(project.path, dir || undefined).catch(() => null))
    },
    [project.path]
  )

  useEffect(() => {
    window.quartzGui.projectPrefs.get(project.path).then((prefs) => {
      setOutputDir(prefs.outputDir)
      void refreshOutput(prefs.outputDir)
    })
    // Falls back to Quartz's own widths on its own when the project never set any.
    window.quartzGui.layoutFrames.getBreakpoints(project.path).then(setBreakpoints)
  }, [project.path, refreshOutput])

  // Relative ages ("gestartet vor 2 Minuten", "gebaut vor 5 Minuten") are computed at render, so
  // without a nudge the line keeps whatever it said when it last changed for another reason - the
  // same reason the Übersicht ticks.
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(timer)
  }, [])

  const running = status.state === 'running'
  // "Not stopped" is not the same as "busy": after the server died the state is 'error', and that
  // is precisely when someone needs to change the port before trying again - locking the fields
  // there left the only usable answer out of reach.
  const serverActive = status.state === 'starting' || status.state === 'running' || status.state === 'stopping'
  const liveOptions = running && status.options ? status.options : options
  const url = urlFor(liveOptions)
  // The iframe only ever points at this machine - that is the single source frame-src allows (see
  // index.html). A remoteDevHost preview is somewhere else entirely and keeps the external link.
  const embeddable = running && !liveOptions.host
  const errorText = serverErrorText(status, t)
  const previewWidth = previewWidthPx(previewMode, breakpoints)
  const outputInProject = output ? isInsideDirectory(project.path, output.dir) : false

  async function start(): Promise<void> {
    setStatus(await window.quartzGui.server.start(project.id, project.path, options))
  }

  async function stop(): Promise<void> {
    await window.quartzGui.server.stop(project.id)
  }

  async function restart(): Promise<void> {
    setStatus(await window.quartzGui.server.restart(project.id, project.path, options))
  }

  async function runBuild(): Promise<void> {
    setBuilding(true)
    setBuildResult(null)
    try {
      setBuildResult(await window.quartzGui.build.run(project.id, project.path, outputDir || undefined))
    } catch (err) {
      // e.g. an export directory the validation layer rejects - shown in the build log panel,
      // which is where the user is already looking
      appendBuildLog({ projectId: project.id, stream: 'stderr', text: formatIpcError(err), timestamp: new Date().toISOString() })
    } finally {
      setBuilding(false)
      await refreshOutput(outputDir)
    }
  }

  // Persisted rather than kept in the page, because Veröffentlichen publishes from the same
  // directory - see ProjectPrefs. Written when the value is settled (blur, picker, reset), not on
  // every keystroke, so a half-typed path never reaches the schema.
  async function commitOutputDir(next: string): Promise<void> {
    setOutputDir(next)
    setOutputDirError(null)
    try {
      await window.quartzGui.projectPrefs.save(project.path, { outputDir: next })
      await refreshOutput(next)
    } catch (err) {
      setOutputDirError(formatIpcError(err))
    }
  }

  async function pickOutputDir(): Promise<void> {
    const folder = await window.quartzGui.dialog.pickFolder()
    if (folder) await commitOutputDir(folder)
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        icon={TAB_ICONS.server}
        title={t('projectLayout.tabs.server')}
        description={t('projectLayout.descriptions.server')}
      />

      {/* min-w-0: a grid item's implicit `min-width: auto` lets its content push it wider than the
          column, so the fixed-width preview below dragged the whole card past the window edge and
          made <main> scroll sideways - buttons and all - instead of the preview scrolling inside
          its own container (reproduced at a 900px window with the tablet preset). */}
      <Card className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="font-medium">{t('buildServer.devServer')}</h2>
          <Badge tone={running ? 'green' : status.state === 'error' ? 'red' : 'slate'}>
            {t(`common.serverState.${status.state}`)}
          </Badge>
          {/* Only the actions that apply right now: a permanently visible row of two disabled
              buttons is noise, and "Stoppen" stays available while the server is still starting -
              that is exactly when someone wants to abort it. */}
          <div className="ml-auto flex gap-2">
            {status.state === 'stopped' || status.state === 'error' ? (
              <Button onClick={start}>{t('buildServer.start')}</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={restart} disabled={!running}>
                  {t('buildServer.restart')}
                </Button>
                <Button variant="danger" onClick={stop} disabled={status.state === 'stopping'}>
                  {t('buildServer.stop')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* The address leads, because it is what the page is for. Running or not, it is the same
            line - stopped it just says what the address will be, which nothing used to. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {running ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[17px] font-semibold tracking-tight text-blue-600 hover:underline dark:text-blue-400"
            >
              {url}
              <ExternalLink size={13} aria-hidden />
            </a>
          ) : (
            <span className="text-[17px] font-semibold tracking-tight text-slate-500 dark:text-slate-400">{url}</span>
          )}
          <button
            type="button"
            onClick={() => copy(url)}
            title={t('common.copy')}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-black/[0.05] dark:hover:bg-white/10"
          >
            {copied === url ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
            {t('common.copy')}
          </button>
        </div>

        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {running ? (
            <>
              {t('buildServer.startedAgo', { since: formatRelativeTime(status.startedAt, i18n.language) ?? '–' })}
              {` · ${t('buildServer.wsPort')} ${liveOptions.wsPort}`}
              {status.pid != null && ` · PID ${status.pid}`}
              {` · ${t('buildServer.autoReload')}`}
            </>
          ) : (
            t('buildServer.devServerHint')
          )}
        </p>

        {errorText && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-red-600 dark:text-red-400">{errorText}</p>}

        {/* Settings collapse: they are set once per project and then never touched, and at full
            width a four-digit port field was 390px wide on a maximized window. */}
        <button
          type="button"
          onClick={() => setOptionsOpen(!optionsOpen)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          {optionsOpen ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
          <SlidersHorizontal size={13} aria-hidden />
          {t('buildServer.serverOptions')}
        </button>

        {optionsOpen && (
          <div className="mt-2 rounded-md border border-black/[0.06] p-3 dark:border-white/10">
            <div className="flex flex-wrap items-end gap-3">
              <Field label={t('buildServer.port')} className="w-28">
                <TextInput
                  type="number"
                  value={options.port}
                  onChange={(e) => setOptions({ ...options, port: Number(e.target.value) })}
                  disabled={serverActive}
                />
              </Field>
              <Field label={t('buildServer.wsPort')} className="w-28">
                <TextInput
                  type="number"
                  value={options.wsPort}
                  onChange={(e) => setOptions({ ...options, wsPort: Number(e.target.value) })}
                  disabled={serverActive}
                />
              </Field>
              <Field label={t('buildServer.remoteDevHost')} className="min-w-64 flex-1">
                <TextInput
                  value={options.host}
                  placeholder={t('buildServer.remoteDevHostPlaceholder')}
                  onChange={(e) => setOptions({ ...options, host: e.target.value })}
                  disabled={serverActive}
                />
              </Field>
            </div>
            {serverActive && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('buildServer.optionsLocked')}</p>
            )}
          </div>
        )}

        {/* The live preview - the reason this page is called "Vorschau". Same origin rules as any
            cross-origin frame; the sandbox keeps the previewed site from navigating this window. */}
        {embeddable && (
          <div className="mt-4">
            <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-2">
              <button
                type="button"
                onClick={() => setPreviewOpen(!previewOpen)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                {previewOpen ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                {t('buildServer.livePreview')}
              </button>
              {previewOpen && (
                <>
                  {/* Its own labels rather than the Layout editor's: those live inside that
                      screen's frameBuilder namespace, and a page reaching into another page's keys
                      is a rename away from breaking silently - i18next keys are not typechecked. */}
                  <SegmentedControl
                    value={previewMode}
                    onChange={setPreviewMode}
                    options={[
                      { value: 'desktop', label: t('buildServer.viewport.desktop') },
                      { value: 'tablet', label: t('buildServer.viewport.tablet') },
                      { value: 'mobile', label: t('buildServer.viewport.mobile') }
                    ]}
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {previewWidth === null ? t('buildServer.viewport.full') : `${previewWidth} px`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewNonce((n) => n + 1)}
                    className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    <RefreshCw size={12} aria-hidden />
                    {t('buildServer.reloadPreview')}
                  </button>
                </>
              )}
            </div>
            {previewOpen && (
              /* Real CSS pixels, not a scaled-down mock: the iframe's own width *is* the viewport
                 the site's media queries see. Which means a narrow window cannot show a 1200px
                 tablet - hence the scroll container, the same answer this app gives every other
                 piece of content too wide for its column. */
              <div className="overflow-x-auto rounded-md border border-black/[0.08] dark:border-white/10">
                <iframe
                  key={`${url}#${previewNonce}`}
                  src={url}
                  title={t('buildServer.livePreview')}
                  sandbox="allow-scripts allow-same-origin allow-forms"
                  style={{ width: previewWidth === null ? '100%' : `${previewWidth}px` }}
                  className="mx-auto block h-[560px] bg-white"
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <LogConsole lines={logs} onClear={() => clearServerLog(project.id)} />
        </div>
      </Card>

      <Card>
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="font-medium">{t('buildServer.oneOffBuild')}</h2>
          <Button onClick={runBuild} disabled={building}>
            {building ? t('buildServer.building') : t('buildServer.buildNow')}
          </Button>
        </div>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('buildServer.oneOffBuildHint')}</p>

        {/* What is in the output directory right now - nothing records that a build happened, so
            this is read from the files themselves (see BuildOutputInfo). The Übersicht showed this
            long before the page that actually owns building did. */}
        <div className="mb-3 rounded-md border border-black/[0.06] p-3 dark:border-white/10">
          {output?.exists ? (
            <>
              <p className="text-[15px] font-semibold tracking-tight">
                {t('buildServer.lastBuilt', { when: formatRelativeTime(output.builtAt, i18n.language) ?? '–' })}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t('buildServer.outputFiles', { count: output.fileCount })} · {formatBytes(output.sizeBytes, i18n.language)}
              </p>
            </>
          ) : (
            <p className="text-[15px] font-semibold tracking-tight text-slate-500 dark:text-slate-400">
              {t('buildServer.neverBuilt')}
            </p>
          )}
          {output && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <code className="break-all text-xs text-slate-500 dark:text-slate-400">{output.dir}</code>
              {output.exists && outputInProject && (
                <button
                  type="button"
                  onClick={() => window.quartzGui.dialog.openPath(output.dir)}
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-600 hover:underline dark:text-slate-300"
                >
                  <FolderOpen size={12} aria-hidden />
                  {t('buildServer.openFolder')}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mb-3">
          <Field label={t('buildServer.exportDir')}>
            <div className="flex gap-2">
              <TextInput
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                onBlur={(e) => void commitOutputDir(e.target.value)}
                placeholder={t('buildServer.exportDirPlaceholder')}
                disabled={building}
                className="flex-1"
              />
              <Button variant="ghost" onClick={pickOutputDir} disabled={building}>
                {t('common.select')}
              </Button>
              {outputDir && (
                <Button variant="ghost" onClick={() => void commitOutputDir('')} disabled={building}>
                  {t('buildServer.reset')}
                </Button>
              )}
            </div>
          </Field>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('buildServer.exportDirShared')} {t('buildServer.exportDirWipes')}
          </p>
          {/* `quartz build` deletes its output directory before it writes - measured against a real
              build, which removed a subfolder of notes from a picked export folder. A folder that
              already holds a build is its own previous output and needs no warning; anything else
              in there is about to be lost, and the folder picker two lines up makes that one click
              away. Main asks again before the build actually runs (see buildOutputGuard). */}
          {output && output.fileCount > 0 && !output.looksLikeBuild && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
              {t('buildServer.exportDirForeign', { count: output.fileCount })}
            </p>
          )}
          {outputDirError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{outputDirError}</p>}
        </div>

        {buildResult && (
          <p className={`mb-3 text-sm ${buildResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {t('buildServer.resultLine', {
              status: buildResult.success ? t('buildServer.success') : t('buildServer.failed'),
              seconds: (buildResult.durationMs / 1000).toFixed(1)
            })}
          </p>
        )}
        <LogConsole lines={buildLogs} onClear={() => clearBuildLog(project.id)} />
      </Card>
    </div>
  )
}
