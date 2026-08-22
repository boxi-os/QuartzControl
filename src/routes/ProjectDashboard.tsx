import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ContentStatus, LogLine, PluginEntry, QuartzConfig, ServerStatus } from '@shared/ipc-contract'
import { useProject } from './ProjectLayout'
import { Badge, Button, Card } from '../components/ui'
import { LogConsole } from '../components/LogConsole'

const SERVER_LABEL: Record<ServerStatus['state'], string> = {
  stopped: 'Gestoppt',
  starting: 'Startet…',
  running: 'Läuft',
  stopping: 'Stoppt…',
  error: 'Fehler'
}

// Same detection quartz-themes/core convention as Themes/index.tsx - the active theme isn't its
// own config field, it's read off whichever @quartz-themes/* plugin entry is enabled.
function findOverridingThemePluginIndex(plugins: PluginEntry[]): number {
  return plugins.findIndex((p) => p.enabled && typeof p.source === 'string' && p.source.startsWith('@quartz-themes/'))
}

export default function ProjectDashboard(): JSX.Element {
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
    setServer(await window.quartzGui.server.start(project.id, project.path))
    setBusy(false)
  }

  async function stop(): Promise<void> {
    setBusy(true)
    await window.quartzGui.server.stop(project.id)
    setBusy(false)
  }

  const overridingIndex = config ? findOverridingThemePluginIndex(config.plugins) : -1
  const overridingPlugin = config && overridingIndex !== -1 ? config.plugins[overridingIndex] : undefined
  const activeThemeId = typeof overridingPlugin?.options?.theme === 'string' ? overridingPlugin.options.theme : undefined
  const activePlugins = config?.plugins.filter((p) => p.enabled).length ?? 0
  const totalPlugins = config?.plugins.length ?? 0

  return (
    <div className="grid max-w-3xl gap-4">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-medium">Dev-Server</h2>
            <p className="text-sm text-slate-500">
              {server.state === 'running' && server.options
                ? `http://${server.options.host || 'localhost'}:${server.options.port}`
                : 'Nicht erreichbar'}
            </p>
          </div>
          <Badge tone={server.state === 'running' ? 'green' : server.state === 'error' ? 'red' : 'slate'}>
            {SERVER_LABEL[server.state]}
          </Badge>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <Button onClick={start} disabled={busy || transitioning || server.state === 'running'}>
            Starten
          </Button>
          <Button variant="danger" onClick={stop} disabled={busy || transitioning || server.state !== 'running'}>
            Stoppen
          </Button>
          {server.state === 'running' && server.options && (
            <a
              href={`http://${server.options.host || 'localhost'}:${server.options.port}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-slate-600 hover:underline dark:text-slate-300"
            >
              Im Browser öffnen ↗
            </a>
          )}
          <Link to="server" className="ml-auto text-sm text-slate-600 hover:underline dark:text-slate-300">
            Details & Optionen →
          </Link>
        </div>

        <LogConsole lines={logs} />
      </Card>

      <Card>
        <h2 className="mb-3 font-medium">Konfiguration</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-400">Seitentitel</p>
            <p className="truncate">{config?.configuration.pageTitle || '–'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Base URL</p>
            <p className="truncate">{config?.configuration.baseUrl || '–'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Theme</p>
            <p className="truncate">{activeThemeId ?? 'Standard'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Plugins</p>
            <p>
              {activePlugins} aktiv · {totalPlugins} gesamt
            </p>
          </div>
        </div>
        <Link to="config" className="mt-3 inline-block text-sm text-slate-600 hover:underline dark:text-slate-300">
          Konfiguration bearbeiten →
        </Link>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium">Content-Ordner</h2>
            <p className="text-sm text-slate-500">
              {!content?.exists && 'Nicht vorhanden'}
              {content?.exists && !content.isSymlink && `Echter Ordner${content.fileCount != null ? ` · ${content.fileCount} Dateien` : ''}`}
              {content?.exists && content.isSymlink && `Symlink → ${content.symlinkTarget}`}
            </p>
          </div>
          {content?.isSymlink && (
            <Badge tone={content.targetExists ? 'slate' : 'red'}>{content.targetExists ? 'Symlink' : 'Ziel fehlt'}</Badge>
          )}
        </div>
        <Link to="content" className="mt-2 inline-block text-sm text-slate-600 hover:underline">
          Content-Ordner verwalten →
        </Link>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Link to="config">
          <Card className="hover:border-slate-400">Konfiguration</Card>
        </Link>
        <Link to="themes">
          <Card className="hover:border-slate-400">Themes</Card>
        </Link>
        <Link to="plugins">
          <Card className="hover:border-slate-400">Plugins verwalten</Card>
        </Link>
        <Link to="sync">
          <Card className="hover:border-slate-400">Git-Sync</Card>
        </Link>
        <Link to="backups">
          <Card className="hover:border-slate-400">Backups ansehen</Card>
        </Link>
      </div>
    </div>
  )
}
