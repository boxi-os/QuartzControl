import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, FolderGit2, GitBranch, RefreshCw } from 'lucide-react'
import { useProject } from './ProjectLayout'
import type { GitFileChange, GithubAccount, GithubRepoRef, GitStatus } from '@shared/ipc-contract'
import { Badge, Button, Card, CardHeading, Field, PageHeader, TextInput, Toggle } from '../components/ui'
import { formatIpcError } from '../components/ErrorSurface'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { announce } from '../state/announcer'
import { useStickyState } from '../state/uiState'
import { TAB_ICONS } from './navConfig'
import HandbookLink from '../components/HandbookLink'

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
      <span className="min-w-0 truncate font-mono text-xs text-text-secondary" title={change.path}>
        {change.origPath ? `${change.origPath} → ${change.path}` : change.path}
      </span>
    </div>
  )
}

function RepoStatus({
  status,
  repo,
  projectPath,
  onChanged,
  noteEpoch
}: {
  status: GitStatus
  repo: GithubRepoRef | null
  projectPath: string
  onChanged: () => void
  /** Moves on every step the user takes on this page after an abort - see abortNote. */
  noteEpoch: number
}): JSX.Element {
  const { t } = useTranslation()
  // `quartz sync --pull` merges (--no-rebase), so a conflict leaves a half-finished merge right
  // here - and the way out used to be a terminal: this state was named and nothing more. The
  // channel is the one the Updates page uses; it is a plain `git merge --abort` with the content
  // symlink parked, which is exactly what is needed here too - only its name says "core".
  //
  // It answers with a sentence rather than throwing: a refusal from git, a failed stash pop and
  // the update lock are `success: false` with a reason, and the staged file the abort throws away
  // is `success: true` with one. `abort.error` only ever sees a throw, so all of those used to
  // stop here - the button simply did nothing visible.
  //
  // The sentence belongs to the moment after the click and to nothing after it: it hangs on no
  // state any more (that was the point of taking it out of the banner), so it goes with the next
  // step the user takes here - "Aktualisieren", or a sync. Until then it stood over whatever came
  // next (twenty-sixth review, finding 6, measured after "Aktualisieren").
  const [abortNote, setAbortNote] = useState<string | null>(null)
  useEffect(() => setAbortNote(null), [noteEpoch])
  const abort = useAsyncAction(async () => {
    setAbortNote(null)
    const result = await window.quartzGui.updates.abortCoreMerge(projectPath)
    const output = result.output.trim()
    setAbortNote(output === '' ? null : output)
    // The box does not exist before the click and appears on its own - and after an abort that
    // went through it is the one thing on the page that did not change for a screen reader, the
    // banner being gone. What is said is the app's sentences, all of them and heaviest first, as
    // the channel returns them apart from git's text (twenty-ninth review, finding 1: the first
    // line was said, and after a failed stash pop that was not the one `success: false` stands
    // for). Never git's text: that once ran twelve lines (twenty-seventh review, finding 4), and
    // its first line was "On branch v5" (twenty-eighth, finding 1). Only an answer without a
    // sentence of the app falls back to the first line of the box.
    const said = result.sentences.length > 0 ? result.sentences.join(' ') : output.split('\n')[0]
    if (said !== '') announce(said)
    onChanged()
  })

  if (!status.isRepo) {
    return <p className="text-xs text-text-muted">{t('gitSync.notARepo')}</p>
  }

  const hidden = status.changeCount - status.changes.length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-ui font-medium">
          {status.detached ? t('gitSync.detached') : status.branch}
        </span>
        {status.upstream && <span className="text-xs text-text-muted">→ {status.upstream}</span>}
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
        </div>
      )}

      {/* Outside the banner, because half of what the abort answers is said *after* the merge is
          gone: the staged file it throws away is `success: true` with a sentence, and a failed
          stash pop names a stand that is now only in `git stash list`. Inside, `onChanged()`
          brought back a status without `inProgress` and took the sentence down with the banner -
          visible for the length of one status read (twenty-fifth review, finding 1, measured on
          the built app). This page is the one that shows staged files at all, so it is the one
          where someone sees that a file is missing. */}
      {(abort.error || abortNote) && (
        <div className="rounded-md border border-ink/10 bg-ground p-2.5 text-xs">
          {abort.error && <p className="text-red-600 dark:text-red-400">{abort.error}</p>}
          {abortNote && <p className="whitespace-pre-wrap font-mono text-text-secondary">{abortNote}</p>}
        </div>
      )}

      {!status.remoteUrl ? (
        <p className="text-xs text-text-muted">{t('gitSync.noRemote')}</p>
      ) : (
        <p className="flex min-w-0 items-center gap-2 text-xs text-text-muted">
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
              className="inline-flex shrink-0 items-center gap-1 text-text-secondary hover:underline"
            >
              <ExternalLink size={12} aria-hidden />
              {t('gitSync.openOnGithub')}
            </button>
          )}
        </p>
      )}

      {status.remoteUrl && !status.upstream && (
        <p className="text-xs text-text-muted">{t('gitSync.noUpstreamHint')}</p>
      )}

      {/* "Losgelöster HEAD" is the state, not an explanation of it - and it is the one state in
          which nothing on this page does what it says. */}
      {status.detached && <p className="text-xs text-text-muted">{t('gitSync.detachedHint')}</p>}

      {status.lastCommit && (
        <p className="text-xs text-text-muted">
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
      {hidden > 0 && <p className="text-xs text-text-muted">{t('gitSync.moreChanges', { count: hidden })}</p>}
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
      <CardHeading icon={FolderGit2} className="mb-1">{t('gitSync.createRepo.title')}</CardHeading>
      <p className="mb-3 text-xs text-text-muted">
        {viewer ? t('gitSync.createRepo.asAccount', { login: viewer.login }) : t('gitSync.createRepo.noToken')}
      </p>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <Field label={t('gitSync.createRepo.name')}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} className="w-64" disabled={!viewer} />
        </Field>
        <div className="pb-1.5">
          {/* The consequence belongs where the decision is taken. GitHub refuses Pages for a
              private repository on a free account - "422: Your current plan does not support
              GitHub Pages for this repository", measured - and that answer arrives several steps
              later, on a different page, after the repository already exists. */}
          <Toggle
            label={t('gitSync.createRepo.private')}
            hint={t('gitSync.createRepo.privateHint')}
            checked={isPrivate}
            onChange={setIsPrivate}
          />
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

  // See abortNote in RepoStatus.
  const [noteEpoch, setNoteEpoch] = useState(0)

  const run = useCallback(
    async (direction: 'push' | 'pull' | 'both'): Promise<void> => {
      setBusy(direction)
      setOutput(null)
      setNoteEpoch((epoch) => epoch + 1)
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
        handbook={<HandbookLink page="gitSync" />}
        icon={TAB_ICONS.sync}
        title={t('projectLayout.tabs.sync')}
        description={t('projectLayout.descriptions.sync')}
      />

      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <CardHeading icon={GitBranch}>{t('gitSync.statusTitle')}</CardHeading>
          <Button
            variant="ghost"
            onClick={() => {
              setNoteEpoch((epoch) => epoch + 1)
              refreshStatus()
            }}
            disabled={refresh.pending}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refresh.pending ? 'animate-spin' : ''}`} />
            {t('gitSync.refresh')}
          </Button>
        </div>
        {refresh.error && <p className="text-xs text-red-600 dark:text-red-400">{refresh.error}</p>}
        {status && (
          <RepoStatus
            status={status}
            repo={repo}
            projectPath={project.path}
            onChanged={refreshStatus}
            noteEpoch={noteEpoch}
          />
        )}
      </Card>

      {status?.isRepo && !status.remoteUrl && <CreateRepoCard projectPath={project.path} onCreated={refreshStatus} />}

      {/* The full width like the status card above it: capped while there was no output, the
          card changed its width on the first run and stood as a narrow block under a wide one.
          The explainer keeps a line length of its own instead. */}
      <Card>
        <CardHeading icon={RefreshCw} className="mb-1">{t('gitSync.title')}</CardHeading>
        {/* What `quartz sync` actually does, in the order it does it. All three parts were
            invisible before: the commit (its --commit defaults to true, so even "Pull" committed
            the whole working tree under a generated message - measured), the force push
            (`git push -uf origin <current branch>`) and the fixed pull branch. */}
        <p className="mb-3 max-w-[95ch] text-xs text-text-muted">
          {t('gitSync.explainer', { branch: QUARTZ_SOURCE_BRANCH })}
        </p>

        {/* The commit is part of every direction, so it sits above the buttons rather than next to
            one of them. Unticking it maps to --no-commit, which syncs the last committed state. */}
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-md border border-ink/[0.06] p-3 dark:border-ink/10">
          <Toggle label={t('gitSync.commitChanges')} checked={commit} onChange={setCommit} />
          <Field label={t('gitSync.commitMessage')} className="min-w-64 flex-1">
            <TextInput
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('gitSync.commitMessagePlaceholder')}
              disabled={!commit || busy !== null}
            />
          </Field>
          <p className="basis-full text-xs text-text-muted">
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
