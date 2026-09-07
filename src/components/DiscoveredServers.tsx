import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, RefreshCw, ServerCog } from 'lucide-react'
import type { DiscoveredServer, ServerDiscovery } from '@shared/ipc-contract'
import { Badge, Button, Card, CardHeading, InfoNote } from './ui'
import { formatIpcError } from './ErrorSurface'
import { confirmDialog } from '../utils/confirm'
import { announce } from '../state/announcer'
import { formatRelativeTime } from '../utils/format'

/**
 * Every Quartz dev server on this machine, not only the ones this app started. The case it exists
 * for: a server left running in a terminal (or by a force-quit of this app) holds port 8080, the
 * app's own start then fails with a port that is "mysteriously" taken, and nothing in the app
 * could say who had it.
 *
 * A server this app did not start is listed but never quietly stopped: whoever started it may
 * still be using it, which is what the warning under the list says and what the confirmation
 * repeats. Stopping is always a decision made here, per server.
 */
export function DiscoveredServers({ ports, onChanged }: { ports: number[]; onChanged?: () => void }): JSX.Element {
  const { t, i18n } = useTranslation()
  const [discovery, setDiscovery] = useState<ServerDiscovery | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stopping, setStopping] = useState<number | null>(null)

  // The port list is a dependency by value, and an array literal from the parent is a new object
  // on every render - joined, so a re-render with the same two ports does not rescan.
  const portKey = ports.join(',')

  const scan = useCallback(async () => {
    setScanning(true)
    try {
      setDiscovery(await window.quartzGui.server.discover({ ports: portKey ? portKey.split(',').map(Number) : [] }))
      setError(null)
    } catch (err) {
      setError(formatIpcError(err))
    } finally {
      setScanning(false)
    }
  }, [portKey])

  useEffect(() => {
    void scan()
    // Rescanned when the window comes back, not on a timer: a server started in a terminal appears
    // while this window is in the background, and a poll would run a `ps` every few seconds for a
    // list that changes a handful of times a day.
    const onFocus = (): void => void scan()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [scan])

  async function stop(server: DiscoveredServer): Promise<void> {
    const name = server.projectName ?? server.cwd ?? String(server.port)
    const confirmed = await confirmDialog({
      text: server.ownedByApp
        ? t('buildServer.discovery.confirmOwn', { name, port: server.port })
        : t('buildServer.discovery.confirmForeign', { name, port: server.port }),
      confirmLabel: t('buildServer.discovery.stopServer'),
      danger: true
    })
    if (!confirmed) return
    setStopping(server.pid)
    try {
      const result = await window.quartzGui.server.kill({ pid: server.pid })
      announce(
        result.stopped
          ? t('buildServer.discovery.stopped', { port: server.port })
          : t('buildServer.discovery.stopFailed', { port: server.port })
      )
      onChanged?.()
    } catch (err) {
      setError(formatIpcError(err))
    } finally {
      setStopping(null)
      await scan()
    }
  }

  const servers = discovery?.servers ?? []
  const occupied = discovery?.occupiedPorts ?? []

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <CardHeading icon={ServerCog}>{t('buildServer.discovery.title')}</CardHeading>
        {discovery?.state === 'ok' && <Badge tone="slate">{servers.length}</Badge>}
        <Button variant="ghost" className="ml-auto" onClick={scan} disabled={scanning}>
          <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} aria-hidden />
          {t('buildServer.discovery.refresh')}
        </Button>
      </div>

      {/* The region is mounted empty and before its text, so what the scan finds is announced when
          it arrives rather than being read out as part of the page. */}
      <div role="status" className="text-xs text-text-secondary">
        {discovery === null
          ? t('buildServer.discovery.scanning')
          : discovery.state === 'unavailable'
            ? t('buildServer.discovery.unavailable')
            : discovery.state === 'partial'
              ? t('buildServer.discovery.partial', { count: servers.length })
              : servers.length === 0
                ? t('buildServer.discovery.none')
                : t('buildServer.discovery.found', { count: servers.length })}
      </div>

      {servers.length > 0 && (
        <ul className="mt-3 grid gap-2">
          {servers.map((server) => (
            <li
              key={server.pid}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-ink/[0.06] p-2.5 dark:border-ink/10"
            >
              <a
                href={`http://localhost:${server.port}`}
                target="_blank"
                rel="noreferrer"
                title={t('common.openInBrowser')}
                className="inline-flex items-center gap-1.5 text-ui font-semibold text-blue-600 hover:underline dark:text-blue-400"
              >
                {`localhost:${server.port}`}
                <ExternalLink size={12} aria-hidden />
              </a>
              <Badge tone={server.ownedByApp ? 'green' : 'amber'}>
                {server.ownedByApp ? t('buildServer.discovery.fromApp') : t('buildServer.discovery.fromOutside')}
              </Badge>
              <span className="min-w-0 break-all text-ui text-text">
                {server.projectName ?? server.siteTitle ?? server.cwd ?? t('buildServer.discovery.unknownProject')}
              </span>
              <span className="text-micro text-text-muted">
                {`PID ${server.pid}`}
                {server.wsPort != null && ` · ${t('buildServer.wsPort')} ${server.wsPort}`}
                {server.startedAt &&
                  ` · ${t('buildServer.startedAgo', { since: formatRelativeTime(server.startedAt, i18n.language) ?? '–' })}`}
                {!server.reachable && ` · ${t('buildServer.discovery.notAnswering')}`}
              </span>
              <Button
                variant="danger"
                className="ml-auto"
                onClick={() => stop(server)}
                disabled={stopping === server.pid}
              >
                {t('buildServer.discovery.stopServer')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {occupied.length > 0 && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
          {t('buildServer.discovery.portTaken', { ports: occupied.join(', ') })}
        </p>
      )}

      {error && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-red-600 dark:text-red-400">{error}</p>}

      {servers.some((s) => !s.ownedByApp) && <InfoNote className="mt-3">{t('buildServer.discovery.warning')}</InfoNote>}
    </Card>
  )
}
