import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { useProject } from './ProjectLayout'
import type { GitFileChange, GithubAccount, GithubRepoRef, GitStatus } from '@shared/ipc-contract'
import { Badge, Button, Card, Field, PageHeader, TextInput, Toggle } from '../components/ui'
import { formatIpcError } from '../components/ErrorSurface'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { useStickyState } from '../state/uiState'
import { TAB_ICONS } from './navConfig'

// The branch `quartz sync --pull` fetches, hardcoded in the CLI itself
// (quartz/cli/constants.js: QUARTZ_SOURCE_BRANCH = "v5"), not derived from what is checked out -
// so on any other branch a pull merges Quartz's v5 into it, or fails because the remote has no
// such branch. Worth saying out loud; nothing else in the app would reveal it.
const QUARTZ_SOURCE_BRANCH = 'v5'

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

function RepoStatus({
  status,
  repo,
  projectPath,
  onChanged
}: {
  status: GitStatus
  repo: GithubRepoRef | null
  projectPath: string
  onChanged: () => void
}): JSX.Element {
  const { t } = useTranslation()
  // `quartz sync --pull` merges (--no-rebase), so a conflict leaves a half-finished merge right
  // here - and the way out used to be a terminal: this state was named and nothing more. The
  // channel is the one the Updates page uses; it is a plain `git merge --abort` with the content
  // symlink parked, which is exactly what is needed here too - only its name says "core".
  const abort = useAsyncAction(async () => {
    await window.quartzGui.updates.abortCoreMerge(projectPath)
    onChanged()
  })

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
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <span>{t(`gitSync.inProgress.${status.inProgress}`)}</span>
          {status.inProgress === 'merge' && (
            <Button variant="ghost" onClick={() => abort.run()} disabled={abort.pending}>
              {abort.pending ? t('common.saving') : t('gitSync.abortMerge')}
            </Button>
          )}
          {abort.error && <span className="text-red-600 dark:text-red-400">{abort.error}</span>}
        </div>
      )}

      {!status.remoteUrl ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('gitSync.noRemote')}</p>
      ) : (
        <p className="flex min-w-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="min-w-0 truncate font-mono" title={status.remoteUrl}>
            origin: {status.remoteUrl}
          </span>
          {/* github.originRepo answers null for anything that isn't github.com, which is exactly
              the condition for showing this - the URL itself is a remote spec and may be the
              scp-like form, which no browser opens. */}
          {repo && (
            <button
              type="button"
              onClick={() => window.quartzGui.dialog.openExternal(repo.htmlUrl)}
              className="inline-flex shrink-0 items-center gap-1 text-slate-600 hover:underline dark:text-slate-300"
            >
              <ExternalLink size={12} aria-hidden />
              {t('gitSync.openOnGithub')}
            </button>
          )}
        </p>
      )}

      {status.remoteUrl && !status.upstream && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('gitSync.noUpstreamHint')}</p>
      )}

      {/* "Losgelöster HEAD" is the state, not an explanation of it - and it is the one state in
          which nothing on this page does what it says. */}
      {status.detached && <p className="text-xs text-slate-500 dark:text-slate-400">{t('gitSync.detachedHint')}</p>}

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
  const [repo, setRepo] = useState<GithubRepoRef | null>(null)
  // Whether the sync commits, and under which message. Sticky rather than plain state: a message
  // typed a moment ago must survive the trip to another area, the same rule the rest of the app
  // follows for drafts.
  const [commit, setCommit] = useStickyState('sync.commit', true)
  const [message, setMessage] = useStickyState('sync.message', '')

  const refresh = useAsyncAction(async () => {
    setStatus(await window.quartzGui.sync.status(project.path))
  })
  const refreshStatus = refresh.run

  useEffect(() => {
    refreshStatus()
    window.quartzGui.github.originRepo(project.path).then(setRepo).catch(() => setRepo(null))
  }, [project.path, refreshStatus])

  const run = useCallback(
    async (direction: 'push' | 'pull' | 'both'): Promise<void> => {
      setBusy(direction)
      setOutput(null)
      try {
        const result = await window.quartzGui.sync.run(project.path, direction, { commit, message })
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
    [project.path, refreshStatus, commit, message]
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
        {status && (
          <RepoStatus status={status} repo={repo} projectPath={project.path} onChanged={refreshStatus} />
        )}
      </Card>

      {status?.isRepo && !status.remoteUrl && <CreateRepoCard projectPath={project.path} onCreated={refreshStatus} />}

      {/* Three buttons don't need the whole window; the git output that appears underneath them
          does, so the card only caps itself while there is nothing to show. */}
      <Card className={output == null ? 'max-w-2xl' : ''}>
        <h2 className="mb-1 font-medium">{t('gitSync.title')}</h2>
        {/* What `quartz sync` actually does, in the order it does it. All three parts were
            invisible before: the commit (its --commit defaults to true, so even "Pull" committed
            the whole working tree under a generated message - measured), the force push
            (`git push -uf origin <current branch>`) and the fixed pull branch. */}
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          {t('gitSync.explainer', { branch: QUARTZ_SOURCE_BRANCH })}
        </p>

        {/* The commit is part of every direction, so it sits above the buttons rather than next to
            one of them. Unticking it maps to --no-commit, which syncs the last committed state. */}
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-black/[0.06] p-3 dark:border-white/10">
          <Toggle label={t('gitSync.commitChanges')} checked={commit} onChange={setCommit} />
          <Field label={t('gitSync.commitMessage')} className="min-w-64 flex-1">
            <TextInput
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('gitSync.commitMessagePlaceholder')}
              disabled={!commit || busy !== null}
            />
          </Field>
          <p className="basis-full text-xs text-slate-500 dark:text-slate-400">
            {commit
              ? status && status.changeCount > 0
                ? t('gitSync.commitHint', { count: status.changeCount })
                : t('gitSync.commitHintClean')
              : t('gitSync.noCommitHint')}
          </p>
        </div>

        {status?.isRepo && !status.detached && status.branch && status.branch !== QUARTZ_SOURCE_BRANCH && (
          <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            {t('gitSync.pullBranchWarning', { branch: status.branch, source: QUARTZ_SOURCE_BRANCH })}
          </p>
        )}

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
