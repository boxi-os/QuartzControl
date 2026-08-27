import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'
import { useProject } from './ProjectLayout'
import type { GitFileChange, GithubAccount, GitStatus } from '@shared/ipc-contract'
import { Badge, Button, Card, Field, PageHeader, TextInput, Toggle } from '../components/ui'
import { formatIpcError } from '../components/ErrorSurface'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { TAB_ICONS } from './navConfig'

function StatusRow({ change }: { change: GitFileChange }): JSX.Element {
  const { t } = useTranslation()
  const tone = change.status === 'conflicted' ? 'red' : change.status === 'untracked' ? 'slate' : 'amber'
  return (
    <div className="flex min-w-0 items-center gap-2 break-inside-avoid py-0.5">
      <Badge tone={tone}>{t(`gitSync.fileStatus.${change.status}`)}</Badge>
      {change.staged && <Badge tone="green">{t('gitSync.staged')}</Badge>}
      <span className="min-w-0 truncate font-mono text-xs text-slate-600 dark:text-slate-300" title={change.path}>
        {change.origPath ? `${change.origPath} → ${change.path}` : change.path}
      </span>
    </div>
  )
}

function RepoStatus({ status }: { status: GitStatus }): JSX.Element {
  const { t } = useTranslation()

  if (!status.isRepo) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">{t('gitSync.notARepo')}</p>
  }

  const hidden = status.changeCount - status.changes.length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[13px] font-medium">
          {status.detached ? t('gitSync.detached') : status.branch}
        </span>
        {status.upstream && <span className="text-xs text-slate-500 dark:text-slate-400">→ {status.upstream}</span>}
        {status.upstream ? (
          status.ahead === 0 && status.behind === 0 ? (
            <Badge tone="green">{t('gitSync.upToDate')}</Badge>
          ) : (
            <>
              {status.ahead > 0 && <Badge tone="amber">{t('gitSync.ahead', { count: status.ahead })}</Badge>}
              {status.behind > 0 && <Badge tone="amber">{t('gitSync.behind', { count: status.behind })}</Badge>}
            </>
          )
        ) : (
          <Badge tone="slate">{t('gitSync.noUpstream')}</Badge>
        )}
        {status.conflictCount > 0 && (
          <Badge tone="red">{t('gitSync.conflicts', { count: status.conflictCount })}</Badge>
        )}
        <Badge tone={status.changeCount === 0 ? 'green' : 'amber'}>
          {status.changeCount === 0 ? t('gitSync.clean') : t('gitSync.changes', { count: status.changeCount })}
        </Badge>
      </div>

      {status.inProgress && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {t(`gitSync.inProgress.${status.inProgress}`)}
        </p>
      )}

      {!status.remoteUrl ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('gitSync.noRemote')}</p>
      ) : (
        <p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400" title={status.remoteUrl}>
          origin: {status.remoteUrl}
        </p>
      )}

      {status.remoteUrl && !status.upstream && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('gitSync.noUpstreamHint')}</p>
      )}

      {status.lastCommit && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('gitSync.lastCommit')}:{' '}
          <span className="font-mono">{status.lastCommit.shortSha}</span> {status.lastCommit.subject}
          {' · '}
          {status.lastCommit.author} · {new Date(status.lastCommit.date).toLocaleString()}
        </p>
      )}

      {/* Each row is one badge plus a path - short enough that extra window width buys columns
          rather than longer lines. CSS multi-column rather than a grid, because a file list is
          read down a column: a grid fills row-wise, which scatters the sort order across the
          window. `break-inside-avoid` keeps a row from being split across a column boundary. */}
      {status.changes.length > 0 && (
        <div className="columns-1 gap-x-6 sm:columns-2 xl:columns-3">
          {status.changes.map((change) => (
            <StatusRow key={`${change.origPath ?? ''}${change.path}`} change={change} />
          ))}
        </div>
      )}
      {hidden > 0 && <p className="text-xs text-slate-500 dark:text-slate-400">{t('gitSync.moreChanges', { count: hidden })}</p>}
    </div>
  )
}

// Offered only when the project is a repo with no origin at all. That is exactly the state
// createService leaves a new project in - it removes origin on purpose, so a later Git-Sync push
// can never reach upstream jackyzha0/quartz - which used to mean a trip to github.com and a
// terminal before anything here could be pushed or published.
function CreateRepoCard({ projectPath, onCreated }: { projectPath: string; onCreated: () => void }): JSX.Element {
  const { t } = useTranslation()
  const [viewer, setViewer] = useState<GithubAccount | null>(null)
  const [name, setName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    // A missing or rejected token answers null; the card then says so instead of failing on click.
    window.quartzGui.github.viewer().then(setViewer).catch(() => setViewer(null))
    // A sensible default that the user can overwrite: the project folder's own name.
    setName(projectPath.split('/').filter(Boolean).pop() ?? '')
  }, [projectPath])

  const create = useAsyncAction(async () => {
    const created = await window.quartzGui.github.createRepo(projectPath, { name, private: isPrivate })
    setResult(created.output)
    if (created.success) onCreated()
  })

  return (
    <Card className="max-w-2xl">
      <h2 className="mb-1 font-medium">{t('gitSync.createRepo.title')}</h2>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
        {viewer ? t('gitSync.createRepo.asAccount', { login: viewer.login }) : t('gitSync.createRepo.noToken')}
      </p>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <Field label={t('gitSync.createRepo.name')}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} className="w-64" disabled={!viewer} />
        </Field>
        <div className="pb-1.5">
          <Toggle label={t('gitSync.createRepo.private')} checked={isPrivate} onChange={setIsPrivate} />
        </div>
        <Button onClick={() => create.run()} disabled={!viewer || !name.trim() || create.pending} className="mb-0.5">
          {create.pending ? t('common.saving') : t('gitSync.createRepo.action')}
        </Button>
      </div>
      {create.error && <p className="text-xs text-red-600 dark:text-red-400">{create.error}</p>}
      {result && <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-200">{result}</pre>}
    </Card>
  )
}

export default function GitSync(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [busy, setBusy] = useState<'push' | 'pull' | 'both' | null>(null)
  const [output, setOutput] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean | null>(null)
  const [status, setStatus] = useState<GitStatus | null>(null)

  const refresh = useAsyncAction(async () => {
    setStatus(await window.quartzGui.sync.status(project.path))
  })
  const refreshStatus = refresh.run

  useEffect(() => {
    refreshStatus()
  }, [project.path, refreshStatus])

  const run = useCallback(
    async (direction: 'push' | 'pull' | 'both'): Promise<void> => {
      setBusy(direction)
      setOutput(null)
      try {
        const result = await window.quartzGui.sync.run(project.path, direction)
        setSuccess(result.success)
        setOutput(result.output)
      } catch (err) {
        // A rejected invoke used to skip setBusy(null) below, leaving all three buttons disabled
        // for good. Reported through the existing output panel rather than a separate error slot.
        setSuccess(false)
        setOutput(formatIpcError(err))
      } finally {
        setBusy(null)
        // A sync is exactly what changes ahead/behind and the dirty file list, so the panel above
        // would otherwise describe the state from before the button was pressed.
        await refreshStatus()
      }
    },
    [project.path, refreshStatus]
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={TAB_ICONS.sync}
        title={t('projectLayout.tabs.sync')}
        description={t('projectLayout.descriptions.sync')}
      />

      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-medium">{t('gitSync.statusTitle')}</h2>
          <Button variant="ghost" onClick={() => refreshStatus()} disabled={refresh.pending}>
            <span className="flex items-center gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${refresh.pending ? 'animate-spin' : ''}`} />
              {t('gitSync.refresh')}
            </span>
          </Button>
        </div>
        {refresh.error && <p className="text-xs text-red-600 dark:text-red-400">{refresh.error}</p>}
        {status && <RepoStatus status={status} />}
      </Card>

      {status?.isRepo && !status.remoteUrl && <CreateRepoCard projectPath={project.path} onCreated={refreshStatus} />}

      {/* Three buttons don't need the whole window; the git output that appears underneath them
          does, so the card only caps itself while there is nothing to show. */}
      <Card className={output == null ? 'max-w-2xl' : ''}>
        <h2 className="mb-1 font-medium">{t('gitSync.title')}</h2>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('gitSync.explainer')}</p>
        <div className="mb-4 flex gap-2">
          <Button onClick={() => run('pull')} disabled={busy !== null}>
            {busy === 'pull' ? t('gitSync.pullRunning') : t('gitSync.pull')}
          </Button>
          <Button onClick={() => run('push')} disabled={busy !== null}>
            {busy === 'push' ? t('gitSync.pushRunning') : t('gitSync.push')}
          </Button>
          <Button variant="ghost" onClick={() => run('both')} disabled={busy !== null}>
            {busy === 'both' ? t('gitSync.bothRunning') : t('gitSync.both')}
          </Button>
        </div>
        {output != null && (
          <div>
            <p className={`mb-2 text-sm ${success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {success ? t('gitSync.success') : t('gitSync.failed')}
            </p>
            <pre className="max-h-72 overflow-y-auto rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-200">
              {output}
            </pre>
          </div>
        )}
      </Card>
    </div>
  )
}
