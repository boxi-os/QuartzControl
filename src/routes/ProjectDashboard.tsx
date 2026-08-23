import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { ContentStatus, LogLine, PluginEntry, QuartzConfig, ServerStatus } from '@shared/ipc-contract'
import { useProject } from './ProjectLayout'
import { Badge, Button, Card, PageHeader } from '../components/ui'
import { LogConsole } from '../components/LogConsole'
import { TAB_ICONS } from './navConfig'

// Same detection quartz-themes/core convention as Themes/index.tsx - the active theme isn't its
// own config field, it's read off whichever @quartz-themes/* plugin entry is enabled.
function findOverridingThemePluginIndex(plugins: PluginEntry[]): number {
  return plugins.findIndex((p) => p.enabled && typeof p.source === 'string' && p.source.startsWith('@quartz-themes/'))
}

export default function ProjectDashboard(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [server, setServer] = useState<ServerStatus>({ state: 'stopped' })
  const [content, setContent] = useState<ContentStatus | null>(null)
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [logs, setLogs] = useState<LogLine[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    window.quartzGui.server.status(project.id).then(setServer)
    window.quartzGui.content.status(project.path).then(setContent)
    window.quartzGui.config.get(project.path).then(setConfig).catch(() => setConfig(null))
    const offStatus = window.quartzGui.server.onStatus((projectId, status) => {
      if (projectId === project.id) setServer(status)
    })
    const offLog = window.quartzGui.server.onLog((line) => {
      if (line.projectId === project.id) setLogs((prev) => [...prev.slice(-199), line])
    })
    return () => {
      offStatus()
      offLog()
    }
  }, [project.id, project.path])

  const transitioning = server.state === 'starting' || server.state === 'stopping'

  async function start(): Promise<void> {
    setBusy(true)
    setLogs([])
    try {
      setServer(await window.quartzGui.server.start(project.id, project.path))
    } finally {
      // the global toast reports the failure; this only has to un-stick the button
      setBusy(false)
    }
  }

  async function stop(): Promise<void> {
    setBusy(true)
    try {
      await window.quartzGui.server.stop(project.id)
    } finally {
      setBusy(false)
    }
  }

  const overridingIndex = config ? findOverridingThemePluginIndex(config.plugins) : -1
  const overridingPlugin = config && overridingIndex !== -1 ? config.plugins[overridingIndex] : undefined
  const activeThemeId = typeof overridingPlugin?.options?.theme === 'string' ? overridingPlugin.options.theme : undefined
  const activePlugins = config?.plugins.filter((p) => p.enabled).length ?? 0
  const totalPlugins = config?.plugins.length ?? 0

  return (
    <div className="grid max-w-3xl gap-4">
      <PageHeader
        icon={TAB_ICONS.overview}
        title={t('projectLayout.tabs.overview')}
        description={t('projectLayout.descriptions.overview')}
      />
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-medium">{t('dashboard.devServer')}</h2>
            <p className="text-sm text-slate-500">
              {server.state === 'running' && server.options
                ? `http://${server.options.host || 'localhost'}:${server.options.port}`
                : t('dashboard.notReachable')}
            </p>
          </div>
          <Badge tone={server.state === 'running' ? 'green' : server.state === 'error' ? 'red' : 'slate'}>
            {t(`common.serverState.${server.state}`)}
          </Badge>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <Button onClick={start} disabled={busy || transitioning || server.state === 'running'}>
            {t('dashboard.start')}
          </Button>
          <Button variant="danger" onClick={stop} disabled={busy || transitioning || server.state !== 'running'}>
            {t('dashboard.stop')}
          </Button>
          {server.state === 'running' && server.options && (
            <a
              href={`http://${server.options.host || 'localhost'}:${server.options.port}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-slate-600 hover:underline dark:text-slate-300"
            >
              {t('common.openInBrowser')}
            </a>
          )}
          <Link to="server" className="ml-auto text-sm text-slate-600 hover:underline dark:text-slate-300">
            {t('dashboard.detailsOptions')}
          </Link>
        </div>

        <LogConsole lines={logs} />
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">{t('dashboard.config')}</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-400">{t('dashboard.pageTitle')}</p>
            <p className="truncate">{config?.configuration.pageTitle || '–'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">{t('dashboard.baseUrl')}</p>
            <p className="truncate">{config?.configuration.baseUrl || '–'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">{t('dashboard.theme')}</p>
            <p className="truncate">{activeThemeId ?? t('dashboard.default')}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">{t('dashboard.plugins')}</p>
            <p>{t('dashboard.pluginsActiveTotal', { active: activePlugins, total: totalPlugins })}</p>
          </div>
        </div>
        <Link to="config" className="mt-3 inline-block text-sm text-slate-600 hover:underline dark:text-slate-300">
          {t('dashboard.editConfig')}
        </Link>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium">{t('dashboard.contentFolder')}</h2>
            <p className="text-sm text-slate-500">
              {!content?.exists && t('dashboard.notPresent')}
              {content?.exists &&
                !content.isSymlink &&
                `${t('dashboard.realFolder')}${content.fileCount != null ? t('dashboard.filesSuffix', { count: content.fileCount }) : ''}`}
              {content?.exists && content.isSymlink && t('dashboard.symlinkTo', { target: content.symlinkTarget })}
            </p>
          </div>
          {content?.isSymlink && (
            <Badge tone={content.targetExists ? 'slate' : 'red'}>
              {content.targetExists ? t('dashboard.symlink') : t('dashboard.targetMissing')}
            </Badge>
          )}
        </div>
        <Link to="content" className="mt-2 inline-block text-sm text-slate-600 hover:underline">
          {t('dashboard.manageContentFolder')}
        </Link>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Link to="config">
          <Card className="hover:border-slate-400">{t('dashboard.config')}</Card>
        </Link>
        <Link to="themes">
          <Card className="hover:border-slate-400">{t('projectLayout.tabs.themes')}</Card>
        </Link>
        <Link to="plugins">
          <Card className="hover:border-slate-400">{t('dashboard.managePlugins')}</Card>
        </Link>
        <Link to="sync">
          <Card className="hover:border-slate-400">{t('dashboard.gitSync')}</Card>
        </Link>
        <Link to="backups">
          <Card className="hover:border-slate-400">{t('dashboard.viewBackups')}</Card>
        </Link>
      </div>
    </div>
  )
}
