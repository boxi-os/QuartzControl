import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { confirmDialog } from '../utils/confirm'
import { Link, useNavigate } from 'react-router-dom'
import { Blocks, Camera, Package, RefreshCw } from 'lucide-react'
import { useProject } from './ProjectLayout'
import type { CoreUpdateStatus, GitStatus, PluginUpdateStatus, UpdateCheckState, UpdateResult } from '@shared/ipc-contract'
import { Badge, Button, Card, CardHeading, PageHeader } from '../components/ui'
import { formatIpcError } from '../components/ErrorSurface'
import { primeStickyState } from '../state/uiState'
import { TAB_ICONS } from './navConfig'
import HandbookLink from '../components/HandbookLink'

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
  const navigate = useNavigate()
  const [coreStatus, setCoreStatus] = useState<CoreUpdateStatus | null>(null)
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [pluginStatuses, setPluginStatuses] = useState<PluginUpdateStatus[] | null>(null)
  const [coreBusy, setCoreBusy] = useState(false)
  const [coreResult, setCoreResult] = useState<UpdateResult | null>(null)
  const [pluginBusy, setPluginBusy] = useState<string | null>(null)
  const [pluginMessage, setPluginMessage] = useState<string | null>(null)

  // Both checks talk to a remote host, so the page says it is working rather than leaving the
  // previous answer standing with nothing to indicate it is being replaced.
  async function reload(): Promise<void> {
    setChecking(true)
    try {
      const [core, plugins, git] = await Promise.all([
        window.quartzGui.updates.coreStatus(project.path),
        window.quartzGui.updates.pluginsStatus(project.path),
        window.quartzGui.sync.status(project.path)
      ])
      setCoreStatus(core)
      setPluginStatuses(plugins)
      setGitStatus(git)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    reload()
  }, [project.path])

  // Every handler here resets its busy flag in a finally: these are the longest-running actions
  // in the app (a core update runs git merge + npm install + a warm-up build), and a rejected
  // invoke used to leave the button disabled with no way back except leaving the page.
  async function runCoreUpdate(): Promise<void> {
    if (!(await confirmDialog({ text: t('updates.core.confirm'), confirmLabel: t('updates.core.runUpdate') }))) return
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

  // The restore point runCoreUpdate takes is reported by the service and was shown nowhere: after
  // a failed merge the one thing the user needs is the way back to the state before it.
  function openSnapshot(snapshotId: string): void {
    const target = `/project/${project.id}/backups`
    primeStickyState(target, 'backups.open', snapshotId)
    navigate(target)
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

  // 'unknown' counts here for the same reason it gets a button of its own: a check that never
  // reached the remote says nothing about whether the update works.
  const actionablePlugins = (pluginStatuses ?? []).filter((p) => p.state === 'behind' || p.state === 'unknown')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        handbook={<HandbookLink page="updates" />}
        icon={TAB_ICONS.updates}
        title={t('projectLayout.tabs.updates')}
        description={t('projectLayout.descriptions.updates')}
      />

      <Card>
        <div className="flex items-center justify-between gap-2">
          <CardHeading icon={Package}>{t('updates.core.heading')}</CardHeading>
          <div className="flex shrink-0 items-center gap-2">
            {coreStatus && <UpdateStateBadge state={coreStatus.state} />}
            {/* "Nicht prüfbar" is a network answer, and there was no way to ask again short of
                leaving the page and coming back - the same gap the marketplace catalog had. */}
            <Button
              variant="ghost"
              onClick={reload}
              disabled={checking || coreBusy}
              className="inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw size={13} className={checking ? 'animate-spin' : ''} aria-hidden />
              {t('updates.recheck')}
            </Button>
          </div>
        </div>
        {coreStatus && (
          <p className="mt-1 text-xs text-text-muted">
            {t('updates.core.commits', { current: shortCommit(coreStatus.currentCommit), latest: shortCommit(coreStatus.latestCommit) })}
          </p>
        )}
        {/* Read from git rather than from this session's last result: the abort used to appear
            only next to the failure that produced it, so switching pages once left a half-finished
            merge with nothing anywhere in the app to say so, let alone a way out. Same banner and
            same action as Git-Sync's, which is where the other half of this state is visible. */}
        {gitStatus?.inProgress && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <span>{t(`gitSync.inProgress.${gitStatus.inProgress}`)}</span>
            {gitStatus.inProgress === 'merge' && (
              <Button variant="ghost" onClick={abortMerge} disabled={coreBusy}>
                {coreBusy ? t('common.saving') : t('updates.core.abortMerge')}
              </Button>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          {/* Only a positive "you already have it" disables the button. An unknown state means the
              check failed, not that there is nothing to do - the update itself may well work. */}
          <Button onClick={runCoreUpdate} disabled={coreBusy || coreStatus?.state === 'upToDate'}>
            {coreBusy ? t('common.saving') : t('updates.core.runUpdate')}
          </Button>
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
        {coreResult?.snapshotId && (
          <button
            type="button"
            onClick={() => openSnapshot(coreResult.snapshotId as string)}
            className="mt-2 text-xs text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {t('updates.core.openSnapshot')}
          </button>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <CardHeading icon={Blocks}>{t('updates.plugins.heading')}</CardHeading>
          <Button variant="ghost" onClick={() => updatePlugin(undefined)} disabled={pluginBusy !== null || actionablePlugins.length === 0}>
            {pluginBusy === '__all__' ? t('common.saving') : t('updates.plugins.updateAll')}
          </Button>
        </div>
        <p className="mt-1 text-xs text-text-muted">{t('updates.plugins.hint')}</p>
        {pluginStatuses === null && <p className="mt-2 text-xs text-text-muted">{t('common.loading')}</p>}
        {pluginStatuses && pluginStatuses.length === 0 && <p className="mt-2 text-xs text-text-muted">{t('updates.plugins.none')}</p>}
        <div className="mt-2 flex flex-col gap-1.5">
          {pluginStatuses?.map((p) => (
            <div key={p.name} className="flex items-center justify-between rounded-md border border-ink/[0.06] px-2.5 py-1.5 text-sm dark:border-ink/10">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{p.name}</span>
                {p.state === 'local' ? (
                  <Badge>{t('updates.plugins.local')}</Badge>
                ) : (
                  <span className="text-xs text-text-muted">
                    {shortCommit(p.installedCommit)} → {shortCommit(p.latestCommit)}
                  </span>
                )}
              </div>
              {/* An unknown state gets the button too, for the reason the core card states: the
                  check failed to reach the remote, which says nothing about whether updating
                  works. Only a positive "up to date" leaves nothing to do. */}
              {p.state === 'behind' || p.state === 'unknown' ? (
                <div className="flex shrink-0 items-center gap-2">
                  {p.state === 'unknown' && <UpdateStateBadge state={p.state} />}
                  <Button variant="ghost" onClick={() => updatePlugin(p.name)} disabled={pluginBusy !== null}>
                    {pluginBusy === p.name ? t('common.saving') : t('updates.plugins.update')}
                  </Button>
                </div>
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
        <CardHeading icon={Camera} className="mb-1">{t('updates.snapshots.heading')}</CardHeading>
        <p className="text-xs text-text-muted">{t('updates.snapshots.movedHint')}</p>
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
