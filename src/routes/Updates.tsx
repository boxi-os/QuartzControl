import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from './ProjectLayout'
import type { CoreUpdateStatus, PluginUpdateStatus, ProjectSnapshot, UpdateResult } from '@shared/ipc-contract'
import { Badge, Button, Card, PageHeader } from '../components/ui'
import { formatIpcError } from '../components/ErrorSurface'
import { TAB_ICONS } from './navConfig'

function shortCommit(commit?: string | null): string {
  return commit ? commit.slice(0, 7) : '—'
}

export default function Updates(): JSX.Element {
  const { t, i18n } = useTranslation()
  const project = useProject()
  const [coreStatus, setCoreStatus] = useState<CoreUpdateStatus | null>(null)
  const [pluginStatuses, setPluginStatuses] = useState<PluginUpdateStatus[] | null>(null)
  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([])
  const [coreBusy, setCoreBusy] = useState(false)
  const [coreResult, setCoreResult] = useState<UpdateResult | null>(null)
  const [pluginBusy, setPluginBusy] = useState<string | null>(null)
  const [pluginMessage, setPluginMessage] = useState<string | null>(null)
  const [restoreBusy, setRestoreBusy] = useState<string | null>(null)

  async function reload(): Promise<void> {
    window.quartzGui.updates.coreStatus(project.path).then(setCoreStatus)
    window.quartzGui.updates.pluginsStatus(project.path).then(setPluginStatuses)
    window.quartzGui.updates.listSnapshots(project.path).then(setSnapshots)
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

  async function restoreSnapshot(tag: string): Promise<void> {
    if (!confirm(t('updates.snapshots.confirmRestore', { tag }))) return
    setRestoreBusy(tag)
    try {
      await window.quartzGui.updates.restoreSnapshot(project.path, tag)
    } catch (err) {
      setCoreResult({ success: false, output: formatIpcError(err) })
    } finally {
      setRestoreBusy(null)
      reload()
    }
  }

  const outdatedPlugins = (pluginStatuses ?? []).filter((p) => !p.isLocal && !p.upToDate)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={TAB_ICONS.updates} title={t('updates.title')} description={t('updates.description')} />

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('updates.core.heading')}</h2>
          {coreStatus &&
            (coreStatus.upToDate ? (
              <Badge tone="green">{t('updates.upToDate')}</Badge>
            ) : (
              <Badge tone="amber">{t('updates.updateAvailable')}</Badge>
            ))}
        </div>
        {coreStatus && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('updates.core.commits', { current: shortCommit(coreStatus.currentCommit), latest: shortCommit(coreStatus.latestCommit) })}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={runCoreUpdate} disabled={coreBusy || coreStatus?.upToDate}>
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
                {p.isLocal ? (
                  <Badge>{t('updates.plugins.local')}</Badge>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {shortCommit(p.installedCommit)} → {shortCommit(p.latestCommit)}
                  </span>
                )}
              </div>
              {!p.isLocal &&
                (p.upToDate ? (
                  <Badge tone="green">{t('updates.upToDate')}</Badge>
                ) : (
                  <Button variant="ghost" onClick={() => updatePlugin(p.name)} disabled={pluginBusy !== null}>
                    {pluginBusy === p.name ? t('common.saving') : t('updates.plugins.update')}
                  </Button>
                ))}
            </div>
          ))}
        </div>
        {pluginMessage && (
          <pre className="mt-3 max-h-56 overflow-y-auto rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-200">{pluginMessage}</pre>
        )}
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-semibold">{t('updates.snapshots.heading')}</h2>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t('updates.snapshots.description')}</p>
        {snapshots.length === 0 && <p className="text-xs text-slate-500">{t('updates.snapshots.none')}</p>}
        <div className="flex flex-col gap-1.5">
          {snapshots.map((s) => (
            <div key={s.tag} className="flex items-center justify-between rounded-md border border-black/[0.06] px-2.5 py-1.5 text-sm dark:border-white/10">
              <span className="text-xs">{new Date(s.createdAt).toLocaleString(i18n.language)}</span>
              <Button variant="ghost" onClick={() => restoreSnapshot(s.tag)} disabled={restoreBusy !== null}>
                {restoreBusy === s.tag ? t('common.saving') : t('updates.snapshots.restore')}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
