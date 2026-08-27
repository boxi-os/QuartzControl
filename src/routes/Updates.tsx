import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useProject } from './ProjectLayout'
import type { CoreUpdateStatus, PluginUpdateStatus, UpdateCheckState, UpdateResult } from '@shared/ipc-contract'
import { Badge, Button, Card, PageHeader } from '../components/ui'
import { formatIpcError } from '../components/ErrorSurface'
import { TAB_ICONS } from './navConfig'

function shortCommit(commit?: string | null): string {
  return commit ? commit.slice(0, 7) : '—'
}

// Three answers, three badges. "Konnte nicht pruefen" used to render as the green "Aktuell" one,
// which is the one thing a user must not be told when the check never reached the remote.
function UpdateStateBadge({ state }: { state: UpdateCheckState }): JSX.Element {
  const { t } = useTranslation()
  if (state === 'upToDate') return <Badge tone="green">{t('updates.upToDate')}</Badge>
  if (state === 'behind') return <Badge tone="amber">{t('updates.updateAvailable')}</Badge>
  return <Badge>{t('updates.checkFailed')}</Badge>
}

export default function Updates(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [coreStatus, setCoreStatus] = useState<CoreUpdateStatus | null>(null)
  const [pluginStatuses, setPluginStatuses] = useState<PluginUpdateStatus[] | null>(null)
  const [coreBusy, setCoreBusy] = useState(false)
  const [coreResult, setCoreResult] = useState<UpdateResult | null>(null)
  const [pluginBusy, setPluginBusy] = useState<string | null>(null)
  const [pluginMessage, setPluginMessage] = useState<string | null>(null)

  async function reload(): Promise<void> {
    window.quartzGui.updates.coreStatus(project.path).then(setCoreStatus)
    window.quartzGui.updates.pluginsStatus(project.path).then(setPluginStatuses)
  }

  useEffect(() => {
    reload()
  }, [project.path])

  // Every handler here resets its busy flag in a finally: these are the longest-running actions
  // in the app (a core update runs git merge + npm install + a warm-up build), and a rejected
  // invoke used to leave the button disabled with no way back except leaving the page.
  async function runCoreUpdate(): Promise<void> {
    if (!confirm(t('updates.core.confirm'))) return
    setCoreBusy(true)
    setCoreResult(null)
    try {
      setCoreResult(await window.quartzGui.updates.runCoreUpdate(project.path))
    } catch (err) {
      setCoreResult({ success: false, output: formatIpcError(err) })
    } finally {
      setCoreBusy(false)
      reload()
    }
  }

  async function abortMerge(): Promise<void> {
    setCoreBusy(true)
    try {
      await window.quartzGui.updates.abortCoreMerge(project.path)
      setCoreResult(null)
    } catch (err) {
      setCoreResult({ success: false, output: formatIpcError(err) })
    } finally {
      setCoreBusy(false)
      reload()
    }
  }

  async function updatePlugin(name?: string): Promise<void> {
    setPluginBusy(name ?? '__all__')
    setPluginMessage(null)
    try {
      const result = await window.quartzGui.updates.updatePlugin(project.path, name)
      setPluginMessage(result.output.slice(-2000))
    } catch (err) {
      setPluginMessage(formatIpcError(err))
    } finally {
      setPluginBusy(null)
      window.quartzGui.updates.pluginsStatus(project.path).then(setPluginStatuses)
    }
  }

  const outdatedPlugins = (pluginStatuses ?? []).filter((p) => p.state === 'behind')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={TAB_ICONS.updates}
        title={t('projectLayout.tabs.updates')}
        description={t('projectLayout.descriptions.updates')}
      />

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('updates.core.heading')}</h2>
          {coreStatus && <UpdateStateBadge state={coreStatus.state} />}
        </div>
        {coreStatus && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('updates.core.commits', { current: shortCommit(coreStatus.currentCommit), latest: shortCommit(coreStatus.latestCommit) })}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2">
          {/* Only a positive "you already have it" disables the button. An unknown state means the
              check failed, not that there is nothing to do - the update itself may well work. */}
          <Button onClick={runCoreUpdate} disabled={coreBusy || coreStatus?.state === 'upToDate'}>
            {coreBusy ? t('common.saving') : t('updates.core.runUpdate')}
          </Button>
          {coreResult && !coreResult.success && coreResult.conflicts && coreResult.conflicts.length > 0 && (
            <Button variant="danger" onClick={abortMerge} disabled={coreBusy}>
              {t('updates.core.abortMerge')}
            </Button>
          )}
        </div>
        {coreResult && coreResult.conflicts && coreResult.conflicts.length > 0 && (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <p className="mb-1 font-medium">{t('updates.core.conflictHeading')}</p>
            <ul className="list-inside list-disc font-mono">
              {coreResult.conflicts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}
        {coreResult && (
          <pre className="mt-3 max-h-56 overflow-y-auto rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-200">{coreResult.output}</pre>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('updates.plugins.heading')}</h2>
          <Button variant="ghost" onClick={() => updatePlugin(undefined)} disabled={pluginBusy !== null || outdatedPlugins.length === 0}>
            {pluginBusy === '__all__' ? t('common.saving') : t('updates.plugins.updateAll')}
          </Button>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('updates.plugins.hint')}</p>
        {pluginStatuses === null && <p className="mt-2 text-xs text-slate-500">{t('common.loading')}</p>}
        {pluginStatuses && pluginStatuses.length === 0 && <p className="mt-2 text-xs text-slate-500">{t('updates.plugins.none')}</p>}
        <div className="mt-2 flex flex-col gap-1.5">
          {pluginStatuses?.map((p) => (
            <div key={p.name} className="flex items-center justify-between rounded-md border border-black/[0.06] px-2.5 py-1.5 text-sm dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{p.name}</span>
                {p.state === 'local' ? (
                  <Badge>{t('updates.plugins.local')}</Badge>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {shortCommit(p.installedCommit)} → {shortCommit(p.latestCommit)}
                  </span>
                )}
              </div>
              {p.state === 'behind' ? (
                <Button variant="ghost" onClick={() => updatePlugin(p.name)} disabled={pluginBusy !== null}>
                  {pluginBusy === p.name ? t('common.saving') : t('updates.plugins.update')}
                </Button>
              ) : (
                p.state !== 'local' && <UpdateStateBadge state={p.state} />
              )}
            </div>
          ))}
        </div>
        {pluginMessage && (
          <pre className="mt-3 max-h-56 overflow-y-auto rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-200">{pluginMessage}</pre>
        )}
      </Card>

      {/* Snapshots are not this page's job any more: the store behind them covers the config, the
          lockfile, the content folder and the user's own stylesheets, none of which the git tags
          this card used to list ever captured. One list, on the page that is about it. */}
      <Card>
        <h2 className="mb-1 text-sm font-semibold">{t('updates.snapshots.heading')}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('updates.snapshots.movedHint')}</p>
        <Link
          to="../backups"
          className="mt-2 inline-block text-sm text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {t('updates.snapshots.openBackups')}
        </Link>
      </Card>
    </div>
  )
}
