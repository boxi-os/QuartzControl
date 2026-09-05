import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  CircleCheck,
  ExternalLink,
  FolderOpen,
  Globe,
  Hammer,
  Link2,
  Play,
  RotateCw,
  Square,
  TriangleAlert,
  type LucideIcon
} from 'lucide-react'
import type {
  BuildOutputInfo,
  ContentStatus,
  CoreUpdateStatus,
  GitStatus,
  GridFrameDefinition,
  PluginEntry,
  PluginUpdateStatus,
  PublishTarget,
  QuartzConfig,
  ScssCheckResult,
  ServerStatus,
  Snapshot,
  StyleFileSet
} from '@shared/ipc-contract'
import { useProject } from './ProjectLayout'
import { Badge, Button, Card, PageHeader } from '../components/ui'
import { TAB_ICONS } from './navConfig'
import { formatBytes, formatRelativeTime } from '../utils/format'
import { serverErrorText } from '../utils/serverStatus'

// Same detection quartz-themes/core convention as Styles/Theme.tsx - the active theme isn't its
// own config field, it's read off whichever @quartz-themes/* plugin entry is enabled.
function findOverridingThemePlugin(plugins: PluginEntry[]): PluginEntry | undefined {
  return plugins.find((p) => p.enabled && typeof p.source === 'string' && p.source.startsWith('@quartz-themes/'))
}

// ------------------------------------------------------------------------------------------
// Tile anatomy. Every tile is the same three-part box - a labelled header, a body that leads with
// the one number or name the tile is about, and a footer linking to the page that owns it - so the
// dashboard can be scanned column by column instead of read.
// ------------------------------------------------------------------------------------------

function Tile({
  icon: Icon,
  title,
  badge,
  to,
  linkLabel,
  className = '',
  children
}: {
  icon: LucideIcon
  title: string
  badge?: ReactNode
  to: string
  linkLabel: string
  className?: string
  children: ReactNode
}): JSX.Element {
  return (
    <Card className={`flex flex-col gap-3 ${className}`}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-ink/[0.04] text-text-muted dark:bg-ink/[0.06]">
          <Icon size={14} strokeWidth={2} aria-hidden />
        </span>
        <h2 className="truncate text-micro font-semibold uppercase tracking-wide text-text-secondary">
          {title}
        </h2>
        {badge && <span className="ml-auto shrink-0">{badge}</span>}
      </div>
      {children}
      <Link
        to={to}
        className="mt-auto inline-flex items-center gap-1 pt-0.5 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        {linkLabel}
        <ChevronRight size={13} aria-hidden />
      </Link>
    </Card>
  )
}

/** The one number or name a tile leads with. */
function Metric({ children, tone }: { children: ReactNode; tone?: 'green' | 'muted' }): JSX.Element {
  const color =
    tone === 'green'
      ? 'text-green-700 dark:text-green-400'
      : tone === 'muted'
        ? 'text-text-muted'
        : 'text-text'
  return <p className={`text-[19px] font-semibold leading-tight tracking-tight ${color}`}>{children}</p>
}

/** The muted half of a metric line ("von 21 aktiv"), sitting on the same baseline. */
function MetricNote({ children }: { children: ReactNode }): JSX.Element {
  return <span className="ml-1.5 text-xs font-medium tracking-normal text-text-muted">{children}</span>
}

function Facts({ children }: { children: ReactNode }): JSX.Element {
  return <div className="flex flex-col gap-1 text-[12.5px] text-text-secondary">{children}</div>
}

function Skeleton({ className = '' }: { className?: string }): JSX.Element {
  return <span className={`block animate-pulse rounded bg-ink/[0.07] dark:bg-ink/[0.09] ${className}`} aria-hidden />
}

// ------------------------------------------------------------------------------------------

type BusyKind = 'server' | 'build' | 'snapshot'

interface Issue {
  id: string
  tone: 'red' | 'amber'
  icon: LucideIcon
  title: string
  detail?: string
  to: string
  linkLabel: string
}

function AttentionBand({ issues }: { issues: Issue[] }): JSX.Element {
  const { t } = useTranslation()
  return (
    <Card className="!p-0">
      <div className="flex items-center gap-2 border-b border-ink/[0.06] px-4 py-2.5 dark:border-ink/10">
        <TriangleAlert size={14} className="text-amber-600 dark:text-amber-400" aria-hidden />
        <h2 className="text-micro font-semibold uppercase tracking-wide text-text-secondary">
          {t('dashboard.attention.title')}
        </h2>
        <Badge tone="amber">{issues.length}</Badge>
      </div>
      {issues.map((issue, i) => (
        <div
          key={issue.id}
          className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-ink/[0.06] dark:border-ink/10' : ''}`}
        >
          <span
            className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] ${
              issue.tone === 'red'
                ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
            }`}
          >
            <issue.icon size={14} strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-ui font-medium">{issue.title}</p>
            {issue.detail && <p className="truncate text-xs text-text-muted">{issue.detail}</p>}
          </div>
          <Link
            to={issue.to}
            className="ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {issue.linkLabel}
            <ChevronRight size={13} aria-hidden />
          </Link>
        </div>
      ))}
    </Card>
  )
}

export default function ProjectDashboard(): JSX.Element {
  const { t, i18n } = useTranslation()
  const project = useProject()

  // Live, pushed from main for the app's whole lifetime.
  const [server, setServer] = useState<ServerStatus>({ state: 'stopped' })

  // Local reads - every one of these comes out of a file in the project, so the page is filled
  // before the user has finished looking at it. Each tile keeps its own state and each fetch
  // swallows its own failure into a null, so one unreadable file cannot blank the whole page.
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [content, setContent] = useState<ContentStatus | null>(null)
  const [git, setGit] = useState<GitStatus | null>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null)
  const [frames, setFrames] = useState<GridFrameDefinition[] | null>(null)
  const [styleFiles, setStyleFiles] = useState<StyleFileSet | null>(null)
  const [scss, setScss] = useState<ScssCheckResult | null>(null)
  const [targets, setTargets] = useState<PublishTarget[] | null>(null)
  const [build, setBuild] = useState<BuildOutputInfo | null>(null)

  // The only network reads on this page. Deferred into their own effect and never awaited by
  // anything above, so a slow or unreachable remote costs the Updates tile a spinner and nothing
  // else. A failed check is 'unknown', never 'upToDate' - same distinction updateService makes.
  const [core, setCore] = useState<CoreUpdateStatus | null>(null)
  const [pluginUpdates, setPluginUpdates] = useState<PluginUpdateStatus[] | null>(null)
  const [updatesPending, setUpdatesPending] = useState(true)

  // A list rather than one slot: the actions are independent (a build takes half a minute, and
  // starting the preview meanwhile is reasonable), so a second action finishing must not clear the
  // first one's pending state.
  // Every relative age on this page ("Gestartet vor …", the build's, the newest snapshot's) is
  // computed at render, so without a nudge a tile keeps showing the age it had when it last
  // changed for another reason - measured in the running app: 55 seconds after the server had
  // started, its line still read "vor 1 Sekunde". Half a minute is enough for minute granularity
  // and costs one re-render.
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const [busy, setBusy] = useState<BusyKind[]>([])
  const isBusy = (kind: BusyKind): boolean => busy.includes(kind)
  const [buildMessage, setBuildMessage] = useState<string | null>(null)

  const api = window.quartzGui

  const loadBuild = useCallback(() => {
    api.build
      .lastOutput(project.path)
      .then(setBuild)
      .catch(() => setBuild(null))
  }, [api, project.path])

  const loadSnapshots = useCallback(() => {
    api.snapshots
      .list(project.path)
      .then(setSnapshots)
      .catch(() => setSnapshots(null))
  }, [api, project.path])

  useEffect(() => {
    api.server.status(project.id).then(setServer)
    api.config.get(project.path).then(setConfig).catch(() => setConfig(null))
    api.content.status(project.path).then(setContent).catch(() => setContent(null))
    api.sync.status(project.path).then(setGit).catch(() => setGit(null))
    api.layoutFrames.list(project.path).then(setFrames).catch(() => setFrames(null))
    api.styles.listFiles(project.path).then(setStyleFiles).catch(() => setStyleFiles(null))
    api.styles.check(project.path).then(setScss).catch(() => setScss(null))
    api.publishTargets.list(project.path).then(setTargets).catch(() => setTargets(null))
    loadBuild()
    loadSnapshots()

    const offStatus = api.server.onStatus((projectId, status) => {
      if (projectId === project.id) setServer(status)
    })
    return () => offStatus()
  }, [api, project.id, project.path, loadBuild, loadSnapshots])

  useEffect(() => {
    let cancelled = false
    setUpdatesPending(true)
    Promise.allSettled([api.updates.coreStatus(project.path), api.updates.pluginsStatus(project.path)]).then(
      ([coreResult, pluginResult]) => {
        if (cancelled) return
        setCore(coreResult.status === 'fulfilled' ? coreResult.value : null)
        setPluginUpdates(pluginResult.status === 'fulfilled' ? pluginResult.value : null)
        setUpdatesPending(false)
      }
    )
    return () => {
      cancelled = true
    }
  }, [api, project.path])

  // --- actions -----------------------------------------------------------------------------

  async function withBusy(kind: BusyKind, run: () => Promise<void>): Promise<void> {
    setBusy((kinds) => [...kinds, kind])
    try {
      await run()
    } finally {
      // the global toast reports the failure; this only has to un-stick the button
      setBusy((kinds) => kinds.filter((k) => k !== kind))
    }
  }

  const startServer = (): Promise<void> =>
    withBusy('server', async () => setServer(await api.server.start(project.id, project.path)))
  const stopServer = (): Promise<void> => withBusy('server', () => api.server.stop(project.id))
  const restartServer = (): Promise<void> =>
    withBusy('server', async () => setServer(await api.server.restart(project.id, project.path)))

  const runBuild = (): Promise<void> =>
    withBusy('build', async () => {
      setBuildMessage(null)
      const result = await api.build.run(project.id, project.path)
      setBuildMessage(result.success ? t('dashboard.build.done') : t('dashboard.build.failed'))
      loadBuild()
    })

  const takeSnapshot = (): Promise<void> =>
    withBusy('snapshot', async () => {
      await api.snapshots.create(project.path, 'manual')
      loadSnapshots()
    })

  // --- derived -----------------------------------------------------------------------------

  const serverUrl =
    server.state === 'running' && server.options
      ? `http://${server.options.host || 'localhost'}:${server.options.port}`
      : null
  const serverTransitioning = server.state === 'starting' || server.state === 'stopping'

  const themePlugin = config ? findOverridingThemePlugin(config.plugins) : undefined
  const activeTheme = typeof themePlugin?.options?.theme === 'string' ? themePlugin.options.theme : null
  const activePlugins = config?.plugins.filter((p) => p.enabled).length ?? 0
  const totalPlugins = config?.plugins.length ?? 0
  const baseUrl = typeof config?.configuration.baseUrl === 'string' ? config.configuration.baseUrl.trim() : ''

  const newestSnapshot = snapshots?.[0]
  const pluginsBehind = pluginUpdates?.filter((p) => p.state === 'behind').length ?? 0
  const pluginsUnknown = pluginUpdates?.filter((p) => p.state === 'unknown').length ?? 0

  const issues: Issue[] = []
  if (server.state === 'error') {
    issues.push({
      id: 'server',
      tone: 'red',
      icon: TAB_ICONS.server,
      title: t('dashboard.attention.serverError'),
      detail: serverErrorText(server, t) ?? undefined,
      to: 'server',
      linkLabel: t('projectLayout.tabs.server')
    })
  }
  if (content && content.isSymlink && content.targetExists === false) {
    issues.push({
      id: 'content',
      tone: 'red',
      icon: Link2,
      title: t('dashboard.attention.contentTargetMissing'),
      detail: content.symlinkTarget,
      to: 'config?tab=content',
      linkLabel: t('dashboard.contentTab')
    })
  }
  if (content && !content.exists) {
    issues.push({
      id: 'content-missing',
      tone: 'amber',
      icon: Link2,
      title: t('dashboard.attention.contentMissing'),
      to: 'config?tab=content',
      linkLabel: t('dashboard.contentTab')
    })
  }
  if (git?.conflictCount) {
    issues.push({
      id: 'git-conflict',
      tone: 'red',
      icon: TAB_ICONS.sync,
      title: t('dashboard.attention.gitConflicts', { count: git.conflictCount }),
      detail: t('dashboard.attention.gitConflictsDetail'),
      to: 'sync',
      linkLabel: t('projectLayout.tabs.sync')
    })
  } else if (git?.inProgress) {
    issues.push({
      id: 'git-progress',
      tone: 'amber',
      icon: TAB_ICONS.sync,
      title: t('dashboard.attention.gitInProgress', { operation: git.inProgress }),
      to: 'sync',
      linkLabel: t('projectLayout.tabs.sync')
    })
  }
  if (scss?.status === 'error') {
    const { relativePath, line, message } = scss.diagnostic
    issues.push({
      id: 'scss',
      tone: 'amber',
      icon: TAB_ICONS.styles,
      title: t('dashboard.attention.scssError'),
      detail: [relativePath, line != null ? t('dashboard.attention.line', { line }) : null, message]
        .filter(Boolean)
        .join(' · '),
      to: 'styles?tab=css',
      linkLabel: t('projectLayout.tabs.styles')
    })
  }
  if (config && !baseUrl) {
    issues.push({
      id: 'baseurl',
      tone: 'amber',
      icon: Globe,
      title: t('dashboard.attention.noBaseUrl'),
      detail: t('dashboard.attention.noBaseUrlDetail'),
      to: 'config',
      linkLabel: t('projectLayout.tabs.config')
    })
  }

  // --- render ------------------------------------------------------------------------------

  return (
    <div className="grid gap-4">
      <PageHeader
        icon={TAB_ICONS.overview}
        title={t('projectLayout.tabs.overview')}
        description={t('projectLayout.descriptions.overview')}
      />

      {issues.length > 0 ? (
        <AttentionBand issues={issues} />
      ) : (
        config && (
          <p className="flex items-center gap-2 text-[12.5px] font-medium text-green-700 dark:text-green-400">
            <CircleCheck size={15} aria-hidden />
            {t('dashboard.attention.allGood')}
          </p>
        )
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Dev-Server: the URL leads, because that is what gets clicked - the state is already in
            the badge. No log here; it lives on Vorschau & Build and is kept per project in the
            store regardless of which page is mounted. */}
        <Tile
          icon={TAB_ICONS.server}
          title={t('dashboard.devServer')}
          badge={
            <Badge tone={server.state === 'running' ? 'green' : server.state === 'error' ? 'red' : 'slate'}>
              {t(`common.serverState.${server.state}`)}
            </Badge>
          }
          to="server"
          linkLabel={t('projectLayout.tabs.server')}
        >
          {serverUrl ? (
            <a
              href={serverUrl}
              target="_blank"
              rel="noreferrer"
              title={t('common.openInBrowser')}
              className="inline-flex items-center gap-1.5 text-[17px] font-semibold tracking-tight text-blue-600 hover:underline dark:text-blue-400"
            >
              {serverUrl}
              <ExternalLink size={13} aria-hidden />
            </a>
          ) : (
            <Metric tone="muted">{t('dashboard.noPreview')}</Metric>
          )}
          <Facts>
            {server.state === 'running' ? (
              <span className="text-text-muted">
                {t('dashboard.startedAgo', { since: formatRelativeTime(server.startedAt, i18n.language) ?? '–' })}
                {server.options && ` · WebSocket ${server.options.wsPort}`}
                {server.pid != null && ` · PID ${server.pid}`}
              </span>
            ) : (
              <span className="text-text-muted">
                {serverErrorText(server, t) ?? t('dashboard.serverIdleHint')}
              </span>
            )}
          </Facts>
          <div className="flex flex-wrap items-center gap-2">
            {server.state === 'running' ? (
              <Button variant="danger" onClick={stopServer} disabled={isBusy('server') || serverTransitioning}>
                <span className="inline-flex items-center gap-1.5">
                  <Square size={12} aria-hidden /> {t('dashboard.stop')}
                </span>
              </Button>
            ) : (
              <Button onClick={startServer} disabled={isBusy('server') || serverTransitioning}>
                <span className="inline-flex items-center gap-1.5">
                  <Play size={12} aria-hidden /> {t('dashboard.start')}
                </span>
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={restartServer}
              disabled={isBusy('server') || serverTransitioning || server.state !== 'running'}
            >
              <span className="inline-flex items-center gap-1.5">
                <RotateCw size={12} aria-hidden /> {t('dashboard.restart')}
              </span>
            </Button>
          </div>
        </Tile>

        {/* Die Seite - what this project *is*, from quartz.config.yaml plus the content folder. */}
        <Tile
          icon={TAB_ICONS.config}
          title={t('dashboard.site')}
          to="config"
          linkLabel={t('projectLayout.tabs.config')}
        >
          <dl className="grid gap-1.5">
            <Row label={t('dashboard.pageTitle')}>{config?.configuration.pageTitle || '–'}</Row>
            <Row label={t('dashboard.baseUrl')}>
              {baseUrl ? <span className="font-mono text-[12px]">{baseUrl}</span> : <Badge tone="amber">{t('dashboard.notSet')}</Badge>}
            </Row>
            <Row label={t('dashboard.locale')}>{(config?.configuration.locale as string) || '–'}</Row>
            <Row label={t('dashboard.contentFolder')}>
              {!content ? (
                '–'
              ) : !content.exists ? (
                <Badge tone="amber">{t('dashboard.notPresent')}</Badge>
              ) : content.isSymlink ? (
                content.targetExists === false ? (
                  <Badge tone="red">{t('dashboard.targetMissing')}</Badge>
                ) : (
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Link2 size={13} className="shrink-0 text-text-muted" aria-hidden />
                    <span className="truncate font-mono text-[12px]">{content.symlinkTarget}</span>
                  </span>
                )
              ) : (
                t('dashboard.realFolderFiles', { count: content.fileCount ?? 0 })
              )}
            </Row>
          </dl>
          <button
            type="button"
            onClick={() => void api.dialog.openPath(project.path)}
            className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-text-muted hover:underline"
          >
            <FolderOpen size={13} aria-hidden />
            {t('dashboard.openProjectFolder')}
          </button>
        </Tile>

        {/* Git-Sync - read straight from git, no token and no network. At the two-column step it
            spans both, since three tiles in two columns otherwise leave it alone next to a gap. */}
        <Tile
          className="md:col-span-2 xl:col-span-1"
          icon={TAB_ICONS.sync}
          title={t('projectLayout.tabs.sync')}
          badge={
            git?.inProgress ? (
              <Badge tone="red">{t('dashboard.git.inProgress', { operation: git.inProgress })}</Badge>
            ) : git?.branch ? (
              <Badge>
                <span className="font-mono">{git.branch}</span>
              </Badge>
            ) : undefined
          }
          to="sync"
          linkLabel={t('projectLayout.tabs.sync')}
        >
          {!git?.isRepo ? (
            <>
              <Metric tone="muted">{t('dashboard.git.noRepo')}</Metric>
              <Facts>
                <span className="text-text-muted">{t('dashboard.git.noRepoHint')}</span>
              </Facts>
            </>
          ) : (
            <>
              <Metric>
                <span className="tabular-nums">↑ {git.ahead}</span>
                <span className="ml-2.5 tabular-nums text-text-muted">↓ {git.behind}</span>
                {git.conflictCount > 0 && (
                  <span className="ml-2.5 text-ui font-medium text-red-600 dark:text-red-400">
                    {t('dashboard.git.conflicts', { count: git.conflictCount })}
                  </span>
                )}
                {!git.upstream && <MetricNote>{t('dashboard.git.noUpstream')}</MetricNote>}
              </Metric>
              <Facts>
                <span>
                  <b className="font-semibold tabular-nums">{git.changeCount}</b>{' '}
                  <span className="text-text-muted">{t('dashboard.git.uncommitted')}</span>
                </span>
                {git.lastCommit && (
                  <span className="truncate text-text-muted">
                    „{git.lastCommit.subject}“ · {formatRelativeTime(git.lastCommit.date, i18n.language) ?? '–'} ·{' '}
                    {git.lastCommit.author}
                  </span>
                )}
              </Facts>
            </>
          )}
        </Tile>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {/* Plugins */}
        <Tile icon={TAB_ICONS.plugins} title={t('projectLayout.tabs.plugins')} to="plugins" linkLabel={t('projectLayout.tabs.plugins')}>
          {config ? (
            <>
              <Metric>
                <span className="tabular-nums">{activePlugins}</span>
                <MetricNote>{t('dashboard.plugins.ofTotal', { total: totalPlugins })}</MetricNote>
              </Metric>
              <Facts>
                <span className="text-text-muted">
                  {totalPlugins - activePlugins > 0
                    ? t('dashboard.plugins.disabled', { count: totalPlugins - activePlugins })
                    : t('dashboard.plugins.allEnabled')}
                </span>
              </Facts>
            </>
          ) : (
            <Skeleton className="h-5 w-2/3" />
          )}
        </Tile>

        {/* Gestaltung */}
        <Tile
          icon={TAB_ICONS.styles}
          title={t('projectLayout.groups.design')}
          to="styles"
          linkLabel={t('projectLayout.tabs.styles')}
        >
          <Metric>{activeTheme ?? t('dashboard.design.stockTheme')}</Metric>
          <Facts>
            <span className="text-text-muted">
              {t('dashboard.design.frames', { count: frames?.length ?? 0 })} ·{' '}
              {t('dashboard.design.stylesheets', { count: styleFiles?.files.length ?? 0 })}
            </span>
            <span className="pt-0.5">
              {!scss ? (
                <Skeleton className="h-4 w-20 rounded-full" />
              ) : scss.status === 'ok' ? (
                <Badge tone="green">{t('dashboard.design.cssOk')}</Badge>
              ) : scss.status === 'error' ? (
                <Badge tone="red">{t('dashboard.design.cssError')}</Badge>
              ) : (
                <Badge>{t('dashboard.design.cssUnchecked')}</Badge>
              )}
            </span>
          </Facts>
        </Tile>

        {/* Build - nothing records that a build happened, so this describes the output directory
            as it is on disk right now. */}
        <Tile icon={Hammer} title={t('dashboard.build.title')} to="server" linkLabel={t('projectLayout.tabs.server')}>
          {!build ? (
            <Skeleton className="h-5 w-2/3" />
          ) : build.exists ? (
            <>
              <Metric>{formatRelativeTime(build.builtAt, i18n.language) ?? '–'}</Metric>
              <Facts>
                <span className="text-text-muted">
                  {t('dashboard.build.files', { count: build.fileCount })} · {formatBytes(build.sizeBytes, i18n.language)}
                </span>
              </Facts>
            </>
          ) : (
            <>
              <Metric tone="muted">{t('dashboard.build.never')}</Metric>
              <Facts>
                <span className="text-text-muted">{t('dashboard.build.neverHint')}</span>
              </Facts>
            </>
          )}
        </Tile>

        {/* Veröffentlichen */}
        <Tile
          icon={TAB_ICONS.publish}
          title={t('projectLayout.tabs.publish')}
          to="publish"
          linkLabel={t('projectLayout.tabs.publish')}
        >
          {targets && targets.length > 0 ? (
            <>
              <Metric>
                <span className="tabular-nums">{targets.length}</span>
                <MetricNote>{t('dashboard.publish.targets', { count: targets.length })}</MetricNote>
              </Metric>
              <Facts>
                {targets.slice(0, 3).map((target) => (
                  <span key={target.id} className="truncate text-text-muted">
                    {target.name} <span className="text-text-muted">· {target.destination.type}</span>
                  </span>
                ))}
              </Facts>
            </>
          ) : (
            <>
              <Metric tone="muted">{t('dashboard.publish.none')}</Metric>
              <Facts>
                <span className="text-text-muted">{t('dashboard.publish.noneHint')}</span>
              </Facts>
            </>
          )}
        </Tile>

        {/* Updates - the one tile that goes to the network. */}
        <Tile
          icon={TAB_ICONS.updates}
          title={t('projectLayout.tabs.updates')}
          badge={
            !updatesPending && (core?.state === 'behind' || pluginsBehind > 0) ? (
              <Badge tone="amber">{(core?.state === 'behind' ? 1 : 0) + pluginsBehind}</Badge>
            ) : undefined
          }
          to="updates"
          linkLabel={t('projectLayout.tabs.updates')}
        >
          {updatesPending ? (
            <>
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <p className="text-[11.5px] text-text-muted">{t('dashboard.updates.checking')}</p>
            </>
          ) : (
            <>
              <Metric tone={core?.state === 'upToDate' && pluginsBehind === 0 ? 'green' : undefined}>
                {core?.state === 'behind'
                  ? t('dashboard.updates.coreBehind')
                  : core?.state === 'upToDate'
                    ? pluginsBehind > 0
                      ? t('dashboard.updates.pluginsOnly')
                      : t('dashboard.updates.allCurrent')
                    : t('dashboard.updates.unknown')}
              </Metric>
              <Facts>
                <span className="text-text-muted">
                  {pluginsBehind > 0
                    ? t('dashboard.updates.pluginsBehind', { count: pluginsBehind })
                    : t('dashboard.updates.pluginsCurrent', { count: pluginUpdates?.length ?? 0 })}
                </span>
                {pluginsUnknown > 0 && (
                  <span className="text-text-muted">
                    {t('dashboard.updates.checkFailed', { count: pluginsUnknown })}
                  </span>
                )}
              </Facts>
            </>
          )}
        </Tile>

        {/* Backups */}
        <Tile
          icon={TAB_ICONS.backups}
          title={t('projectLayout.tabs.backups')}
          to="backups"
          linkLabel={t('projectLayout.tabs.backups')}
        >
          {snapshots && snapshots.length > 0 ? (
            <>
              <Metric>
                <span className="tabular-nums">{snapshots.length}</span>
                <MetricNote>{t('dashboard.backups.states', { count: snapshots.length })}</MetricNote>
              </Metric>
              <Facts>
                <span className="text-text-muted">
                  {t('dashboard.backups.newest', {
                    when: formatRelativeTime(newestSnapshot?.createdAt, i18n.language) ?? '–'
                  })}
                </span>
                {newestSnapshot && (
                  <span className="truncate text-text-muted">
                    {newestSnapshot.label || t(`backups.kinds.${newestSnapshot.kind}`)}
                  </span>
                )}
              </Facts>
            </>
          ) : (
            <>
              <Metric tone="muted">{t('dashboard.backups.none')}</Metric>
              <Facts>
                <span className="text-text-muted">{t('dashboard.backups.noneHint')}</span>
              </Facts>
            </>
          )}
        </Tile>
      </div>

      {/* The three things worth doing from here without opening a page first. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={runBuild} disabled={isBusy('build')}>
          <span className="inline-flex items-center gap-1.5">
            <Hammer size={13} aria-hidden />
            {isBusy('build') ? t('dashboard.build.running') : t('dashboard.build.run')}
          </span>
        </Button>
        <Button variant="ghost" onClick={takeSnapshot} disabled={isBusy('snapshot')}>
          <span className="inline-flex items-center gap-1.5">
            <TAB_ICONS.backups size={13} aria-hidden />
            {isBusy('snapshot') ? t('dashboard.backups.saving') : t('dashboard.backups.save')}
          </span>
        </Button>
        <Button variant="ghost" onClick={() => void api.dialog.openPath(project.path)}>
          <span className="inline-flex items-center gap-1.5">
            <FolderOpen size={13} aria-hidden />
            {t('dashboard.openProjectFolder')}
          </span>
        </Button>
        {buildMessage && <span className="text-xs text-text-muted">{buildMessage}</span>}
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex min-w-0 items-baseline gap-2.5">
      <dt className="w-20 shrink-0 text-micro text-text-muted">{label}</dt>
      <dd className="m-0 min-w-0 truncate text-[12.5px] text-text-secondary">{children}</dd>
    </div>
  )
}
