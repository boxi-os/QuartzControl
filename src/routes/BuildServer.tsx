import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from './ProjectLayout'
import type { ServerOptions, ServerStatus, BuildResult } from '@shared/ipc-contract'
import { Badge, Button, Card, Field, PageHeader, TextInput, Toggle } from '../components/ui'
import { LogConsole } from '../components/LogConsole'
import { formatIpcError } from '../components/ErrorSurface'
import { TAB_ICONS } from './navConfig'
import { EMPTY_LOG_LINES, useLogStore } from '../state/store'

// `host` is only meaningful as Quartz's `--remoteDevHost`: an override for the live-reload
// websocket URL when previewing through a tunnel/remote host, which makes the browser connect
// via `wss://` instead of `ws://`. There's no TLS termination on that plain websocket server, so
// defaulting this to 'localhost' (as if it were a bind address) broke live-reload for every local
// session - the browser tried a TLS handshake against a plaintext socket and silently never
// connected. Leave it empty unless the user is actually serving through a tunnel.
const DEFAULT_OPTIONS: ServerOptions = { port: 8080, wsPort: 3001, host: '', watch: true }

export default function BuildServer(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [status, setStatus] = useState<ServerStatus>({ state: 'stopped' })
  const [options, setOptions] = useState<ServerOptions>(DEFAULT_OPTIONS)
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null)
  const [building, setBuilding] = useState(false)
  const [exportDir, setExportDir] = useState('')
  const logs = useLogStore((s) => s.serverLogs[project.id] ?? EMPTY_LOG_LINES)
  const buildLogs = useLogStore((s) => s.buildLogs[project.id] ?? EMPTY_LOG_LINES)
  const clearServerLog = useLogStore((s) => s.clearServerLog)
  const clearBuildLog = useLogStore((s) => s.clearBuildLog)
  const appendBuildLog = useLogStore((s) => s.appendBuildLog)

  useEffect(() => {
    window.quartzGui.server.status(project.id).then(setStatus)
    const offStatus = window.quartzGui.server.onStatus((projectId, s) => {
      if (projectId === project.id) setStatus(s)
    })
    return () => {
      offStatus()
    }
  }, [project.id])

  const busy = status.state === 'starting' || status.state === 'stopping'

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
      setBuildResult(await window.quartzGui.build.run(project.id, project.path, exportDir || undefined))
    } catch (err) {
      // e.g. an export directory the validation layer rejects - shown in the build log panel,
      // which is where the user is already looking
      appendBuildLog({ projectId: project.id, stream: 'stderr', text: formatIpcError(err), timestamp: new Date().toISOString() })
    } finally {
      setBuilding(false)
    }
  }

  async function pickExportDir(): Promise<void> {
    const folder = await window.quartzGui.dialog.pickFolder()
    if (folder) setExportDir(folder)
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        icon={TAB_ICONS.server}
        title={t('projectLayout.tabs.server')}
        description={t('projectLayout.descriptions.server')}
      />
      <Card>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-medium">{t('buildServer.devServer')}</h2>
          <Badge tone={status.state === 'running' ? 'green' : status.state === 'error' ? 'red' : 'slate'}>
            {t(`common.serverState.${status.state}`)}
          </Badge>
        </div>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('buildServer.devServerHint')}</p>

        <div className="mb-3 grid grid-cols-4 gap-3">
          <Field label={t('buildServer.port')}>
            <TextInput
              type="number"
              value={options.port}
              onChange={(e) => setOptions({ ...options, port: Number(e.target.value) })}
              disabled={status.state !== 'stopped'}
            />
          </Field>
          <Field label={t('buildServer.wsPort')}>
            <TextInput
              type="number"
              value={options.wsPort}
              onChange={(e) => setOptions({ ...options, wsPort: Number(e.target.value) })}
              disabled={status.state !== 'stopped'}
            />
          </Field>
          <Field label={t('buildServer.remoteDevHost')}>
            <TextInput
              value={options.host}
              placeholder={t('buildServer.remoteDevHostPlaceholder')}
              onChange={(e) => setOptions({ ...options, host: e.target.value })}
              disabled={status.state !== 'stopped'}
            />
          </Field>
          <div className="flex items-end pb-1.5">
            <Toggle
              label={t('buildServer.watch')}
              checked={options.watch}
              onChange={(checked) => setOptions({ ...options, watch: checked })}
              disabled={status.state !== 'stopped'}
            />
          </div>
        </div>

        <div className="mb-3 flex gap-2">
          <Button onClick={start} disabled={busy || status.state === 'running'}>
            {t('buildServer.start')}
          </Button>
          <Button variant="ghost" onClick={restart} disabled={busy || status.state !== 'running'}>
            {t('buildServer.restart')}
          </Button>
          <Button variant="danger" onClick={stop} disabled={busy || status.state !== 'running'}>
            {t('buildServer.stop')}
          </Button>
          {status.state === 'running' && status.options && (
            <a
              href={`http://${status.options.host || 'localhost'}:${status.options.port}`}
              target="_blank"
              rel="noreferrer"
              className="ml-auto self-center text-sm text-slate-600 hover:underline dark:text-slate-300"
            >
              {t('common.openInBrowser')}
            </a>
          )}
        </div>

        <LogConsole lines={logs} onClear={() => clearServerLog(project.id)} />
      </Card>

      <Card>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-medium">{t('buildServer.oneOffBuild')}</h2>
          <Button onClick={runBuild} disabled={building}>
            {building ? t('buildServer.building') : t('buildServer.buildNow')}
          </Button>
        </div>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('buildServer.oneOffBuildHint')}</p>

        <div className="mb-3">
          <Field label={t('buildServer.exportDir')}>
            <div className="flex gap-2">
              <TextInput
                value={exportDir}
                onChange={(e) => setExportDir(e.target.value)}
                placeholder={t('buildServer.exportDirPlaceholder')}
                disabled={building}
                className="flex-1"
              />
              <Button variant="ghost" onClick={pickExportDir} disabled={building}>
                {t('common.select')}
              </Button>
              {exportDir && (
                <Button variant="ghost" onClick={() => setExportDir('')} disabled={building}>
                  {t('buildServer.reset')}
                </Button>
              )}
            </div>
          </Field>
        </div>

        {buildResult && (
          <p className={`mb-3 text-sm ${buildResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {t('buildServer.resultLine', {
              status: buildResult.success ? t('buildServer.success') : t('buildServer.failed'),
              seconds: (buildResult.durationMs / 1000).toFixed(1)
            })}
            {buildResult.success && exportDir && t('buildServer.exportedTo', { dir: exportDir })}
          </p>
        )}
        <LogConsole lines={buildLogs} onClear={() => clearBuildLog(project.id)} />
      </Card>
    </div>
  )
}
