import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useProject } from '../ProjectLayout'
import type {
  Connection,
  DeployDiffEntry,
  DeployProgressEvent,
  DeployResult,
  PublishTarget,
  QuartzConfig,
  SaveConnectionInput,
  SavePublishTargetInput
} from '@shared/ipc-contract'
import { Badge, Button, Card, Field, PageHeader, Select, TextInput, Toggle } from '../../components/ui'
import { ConnectionFormFields, emptyConnectionDraft } from '../../components/ConnectionForm'
import { useAsyncAction } from '../../hooks/useAsyncAction'
import { useStickyState } from '../../state/uiState'
import { rsyncBlockReason } from '@shared/rsyncSupport'
import { TAB_ICONS } from '../navConfig'
import GithubPages from './GithubPages'

// GitHub Pages used to be a built-in choice that bypassed the target list entirely. It is now a
// regular git-branch target like any other: the special case was the one thing left that made this
// page reach past its own model, and a branch push to Codeberg or GitLab is the same mechanism
// with a different name for the branch.

function emptyTargetDraft(): SavePublishTargetInput {
  return { name: '', destination: { type: 'sftp', remotePath: '/', transfer: 'sftp', deleteRemoved: true } }
}

/** Which connection kind a destination needs, or null when it needs none - a folder is reached
 *  through the filesystem, and a git branch through the repo's own origin remote. */
function requiredKind(destination: SavePublishTargetInput['destination']): 'ssh' | 'ftp' | 'webhook' | null {
  if (destination.type === 'sftp') return 'ssh'
  if (destination.type === 'ftp') return 'ftp'
  if (destination.type === 'webhook') return 'webhook'
  return null
}

// Each provider serves a different branch by convention: GitHub Pages reads gh-pages, Codeberg
// Pages reads a branch literally named pages. GitLab has no fixed convention because the branch
// alone does not publish there - a CI job does - so it gets the same default and a hint.
const BRANCH_DEFAULTS: Record<'github' | 'gitlab' | 'codeberg', string> = {
  github: 'gh-pages',
  gitlab: 'pages',
  codeberg: 'pages'
}

function emptyDestination(type: 'sftp' | 'ftp' | 'folder' | 'webhook' | 'git-branch'): SavePublishTargetInput['destination'] {
  switch (type) {
    case 'sftp':
      return { type: 'sftp', remotePath: '/', transfer: 'sftp', deleteRemoved: true }
    case 'ftp':
      return { type: 'ftp', remotePath: '/', deleteRemoved: true }
    case 'folder':
      return { type: 'folder', path: '', deleteRemoved: true }
    case 'webhook':
      return { type: 'webhook' }
    case 'git-branch':
      return { type: 'git-branch', branch: BRANCH_DEFAULTS.github, provider: 'github' }
  }
}

export default function Publish(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [connections, setConnections] = useState<Connection[]>([])
  const [targets, setTargets] = useState<PublishTarget[]>([])
  // Which destination is selected, and the two fields that describe it, are "where the user was" -
  // kept across a trip to another area (see useStickyState). The diff below deliberately is not:
  // it's a snapshot of the build output and has to be re-taken.
  const [selectedId, setSelectedId] = useStickyState<string | null>('publish.target', null)
  // Which directory gets published. Empty means quartz's own default, public/. Stored per project
  // (ProjectPrefs) rather than kept in this page, because Vorschau & Build writes the build into
  // the same directory: when each page had its own field, building to an export folder and then
  // publishing silently shipped a stale public/ - the kind of wrong that looks like it worked.
  const [outputDir, setOutputDir] = useState('')
  const [targetDraft, setTargetDraft] = useState<SavePublishTargetInput | null>(null)
  const [connectionDraft, setConnectionDraft] = useState<SaveConnectionInput | null>(null)
  const [diff, setDiff] = useState<DeployDiffEntry[] | null>(null)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null)
  const [progress, setProgress] = useState<DeployProgressEvent | null>(null)

  async function reload(): Promise<void> {
    setConnections(await window.quartzGui.connections.list())
    setTargets(await window.quartzGui.publishTargets.list(project.path))
  }

  useEffect(() => {
    window.quartzGui.config.get(project.path).then(setConfig)
    window.quartzGui.projectPrefs.get(project.path).then((prefs) => setOutputDir(prefs.outputDir))
    reload()
  }, [project.path])

  useEffect(() => window.quartzGui.deploy.onProgress(setProgress), [])

  // Everything below describes *one* target. Left standing across a switch, the previous target's
  // success message and file list read as statements about the newly selected one - seen in the
  // running app, where a folder deploy's "nothing to do" sat under a webhook target that had never
  // run. The key covers the whole selection, so the GitHub Pages/target switch clears it too.
  useEffect(() => {
    setDiff(null)
    setExcluded(new Set())
    setDeployResult(null)
    setProgress(null)
  }, [selectedId])

  const activeTarget = targets.find((tg) => tg.id === selectedId)
  const activeConnection = activeTarget?.connectionId ? connections.find((c) => c.id === activeTarget.connectionId) : undefined

  // The diff reads the build output directory, which simply doesn't exist until the first build -
  // the call then rejects, and before this hook the "Diff aktualisieren" button stayed disabled on
  // "Speichere…" for good, with nothing on screen saying why.
  // `keepResult` exists because a successful deploy refreshes the diff itself, and clearing the
  // result there wiped the very output that says what was published - the success line and file
  // list flashed and vanished, leaving only the progress counter. A failed deploy kept its message
  // only because it skipped the refresh, which is why this went unnoticed.
  const diffAction = useAsyncAction(async (keepResult?: boolean) => {
    if (!keepResult) setDeployResult(null)
    if (!activeTarget) return
    const result = await window.quartzGui.deploy.diff(project.path, activeTarget.id, outputDir || undefined)
    setDiff(result)
    setExcluded(new Set())
  })
  const refreshDiff = diffAction.run

  const buildAction = useAsyncAction(async () => {
    await window.quartzGui.build.run(project.id, project.path, outputDir || undefined)
    await refreshDiff()
  })

  function toggleExclude(path: string): void {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  async function deploy(): Promise<void> {
    // A deploy is not reversible from inside the app: it force-pushes over the Pages branch, or
    // uploads to and deletes files on a remote server. Deleting a mere connection profile already
    // asks, so the destructive action has to as well.
    if (!activeTarget) return
    if (activeTarget.destination.type === 'git-branch') {
      if (!confirm(t('publish.confirmDeployBranch', { branch: activeTarget.destination.branch }))) return
    } else {
      const uploads = (diff ?? []).filter((e) => e.status !== 'removed' && !excluded.has(e.path)).length
      const deletions = (diff ?? []).filter((e) => e.status === 'removed' && !excluded.has(e.path)).length
      if (!confirm(t('publish.confirmDeployConnection', { target: activeTarget.name, uploads, deletions }))) return
    }

    await deployAction.run()
  }

  const deployAction = useAsyncAction(async () => {
    setDeployResult(null)
    setProgress(null)
    if (!activeTarget) return
    const result = await window.quartzGui.deploy.run(project.path, activeTarget.id, outputDir || undefined, Array.from(excluded))
    setDeployResult(result)
    if (result.success) await refreshDiff(true)
  })

  // Both saves go through useAsyncAction so a rejected write lands *in the form*. The validation
  // layer refuses more here than anywhere else in the app (port range, absolute remote path, https
  // webhook), and a plain await let those failures fall through to the global toast: the form
  // simply stayed open with nothing changed and nothing said. Seen in the running app with a port
  // that had been typed as text and arrived as 0.
  const saveTargetAction = useAsyncAction(async () => {
    if (!targetDraft) return
    const saved = await window.quartzGui.publishTargets.save(project.path, targetDraft)
    setTargetDraft(null)
    await reload()
    setSelectedId(saved.id)
  })

  const saveConnectionAction = useAsyncAction(async () => {
    if (!connectionDraft) return
    const saved = await window.quartzGui.connections.save(connectionDraft)
    setConnectionDraft(null)
    setConnections(await window.quartzGui.connections.list())
    // A connection created from inside the target form is immediately what that target uses -
    // otherwise the user has to pick it from the dropdown they just implicitly filled.
    setTargetDraft((prev) => (prev ? { ...prev, connectionId: saved.id } : prev))
  })

  // Deliberately a separate, confirmed action rather than an option in the mismatch dialog - see
  // the host verifier for why a "key changed, continue?" prompt is the wrong shape.
  async function forgetHostKey(connection: Connection): Promise<void> {
    if (connection.kind !== 'ssh') return
    if (!confirm(t('publish.confirmForgetHostKey', { host: connection.host }))) return
    await window.quartzGui.connections.forgetHostKey(connection.id)
    await reload()
  }

  async function deleteTarget(id: string): Promise<void> {
    if (!confirm(t('publish.confirmDeleteTarget'))) return
    await window.quartzGui.publishTargets.delete(project.path, id)
    if (selectedId === id) setSelectedId(null)
    await reload()
  }

  const baseUrl = typeof config?.configuration.baseUrl === 'string' ? config.configuration.baseUrl : ''
  const baseUrlWarning = !baseUrl || baseUrl === 'localhost'

  const grouped = useMemo(() => {
    const groups: Record<'added' | 'changed' | 'removed', DeployDiffEntry[]> = { added: [], changed: [], removed: [] }
    for (const entry of diff ?? []) groups[entry.status].push(entry)
    return groups
  }, [diff])

  const draftKind = targetDraft ? requiredKind(targetDraft.destination) : null
  const eligibleConnections = draftKind ? connections.filter((c) => c.kind === draftKind) : []
  // Asked of the *picked* connection, with the shared rule the adapter itself uses - so the form
  // never offers a transfer that would then be refused at deploy time. Without a connection chosen
  // yet there is nothing to judge, and rsync stays unavailable rather than being offered blindly.
  const draftConnection = targetDraft?.connectionId ? connections.find((c) => c.id === targetDraft.connectionId) : undefined
  const rsyncBlocker =
    targetDraft?.destination.type === 'sftp'
      ? draftConnection?.kind === 'ssh'
        ? rsyncBlockReason(draftConnection, window.quartzGui.platform)
        : 'no-connection'
      : null

  // What "ready to save" means is per destination, and deriving it from requiredKind is what keeps
  // it honest: a type that needs no credential must not be gated on one. The earlier version had a
  // folder special case and required a connection for everything else, which made a git-branch
  // target - which authenticates through the repo's own origin - impossible to save at all.
  const targetReady = (() => {
    if (!targetDraft) return false
    const destination = targetDraft.destination
    if (destination.type === 'folder') return !!destination.path.trim()
    if (destination.type === 'git-branch') return !!destination.branch.trim()
    return !!targetDraft.connectionId
  })()
  // Which targets have a file diff at all. GitHub Pages compares trees on the remote itself and
  // skips the push when they match; a webhook only asks a provider to build. Neither has a local
  // file list, so neither may be gated on one - that check used to leave their deploy button
  // permanently disabled.
  const hasFileDiff = !!activeTarget && activeTarget.destination.type !== 'webhook'
  // A branch deploy replaces the branch with one root commit, so "publish everything except this
  // file" would delete that file from the live site rather than leave it alone. The diff is shown
  // for it, but read-only.
  const canExclude = !!activeTarget && activeTarget.destination.type !== 'git-branch'
  const canDeploy = !!activeTarget && (!hasFileDiff || !!diff)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={TAB_ICONS.publish} title={t('publish.title')} description={t('publish.description')} />

      {baseUrlWarning && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {t('publish.baseUrlWarning', { baseUrl: baseUrl || '—' })}
        </p>
      )}

      <Card>
        <h2 className="mb-2 text-sm font-semibold">{t('publish.targetHeading')}</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {targets.map((target) => (
            <button
              key={target.id}
              onClick={() => setSelectedId(target.id)}
              className={`rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                selectedId === target.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-black/[0.05] text-slate-700 hover:bg-black/[0.08] dark:bg-white/10 dark:text-slate-200'
              }`}
            >
              {target.name} ({target.destination.type.toUpperCase()})
            </button>
          ))}
          <Button variant="ghost" onClick={() => setTargetDraft(emptyTargetDraft())}>
            {t('publish.newTarget')}
          </Button>
        </div>

        {targets.length === 0 && <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t('publish.noTargets')}</p>}

        {activeTarget && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-black/[0.06] p-2.5 text-xs dark:border-white/10">
            <span className="min-w-0">
              {activeConnection && activeConnection.kind !== 'github' && activeConnection.kind !== 'webhook' && (
                <>
                  {activeConnection.username}@{activeConnection.host}:{activeConnection.port}
                  {' → '}
                </>
              )}
              {'remotePath' in activeTarget.destination && activeTarget.destination.remotePath}
              {activeTarget.destination.type === 'folder' && activeTarget.destination.path}
              {activeTarget.destination.type === 'git-branch' && `origin → ${activeTarget.destination.branch}`}
              {activeTarget.destination.type === 'webhook' &&
                (activeConnection?.kind === 'webhook' && activeConnection.displayOrigin
                  ? `POST → ${activeConnection.displayOrigin}`
                  : t('publish.webhookNoUrl'))}
              {activeConnection && !activeConnection.hasSecret && activeConnection.kind === 'ssh' && activeConnection.authMethod !== 'agent' && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">{t('publish.noSecretWarning')}</span>
              )}
              {activeConnection?.kind === 'ssh' && (
                <span className="mt-1 block font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {activeConnection.hostKey
                    ? `${t('publish.hostKeyPinned')}: ${activeConnection.hostKey.fingerprint}`
                    : t('publish.hostKeyUnknown')}
                </span>
              )}
            </span>
            <div className="flex shrink-0 gap-2 whitespace-nowrap">
              <button
                type="button"
                className="text-slate-500 underline"
                onClick={() =>
                  setTargetDraft({
                    id: activeTarget.id,
                    name: activeTarget.name,
                    connectionId: activeTarget.connectionId,
                    destination: activeTarget.destination,
                    excludes: activeTarget.excludes
                  })
                }
              >
                {t('common.edit')}
              </button>
              {activeConnection?.kind === 'ssh' && activeConnection.hostKey && (
                <button type="button" className="text-slate-500 underline" onClick={() => forgetHostKey(activeConnection)}>
                  {t('publish.forgetHostKey')}
                </button>
              )}
              <button type="button" className="text-red-600 underline dark:text-red-400" onClick={() => deleteTarget(activeTarget.id)}>
                {t('common.remove')}
              </button>
            </div>
          </div>
        )}
      </Card>

      {targetDraft && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold">{t('publish.targetForm.heading')}</h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('publish.targetForm.explainer')}</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Field label={t('publish.targetForm.name')}>
              <TextInput value={targetDraft.name} onChange={(e) => setTargetDraft({ ...targetDraft, name: e.target.value })} />
            </Field>
            <Field label={t('publish.targetForm.type')}>
              <Select
                value={targetDraft.destination.type}
                onChange={(e) => {
                  const type = e.target.value as 'sftp' | 'ftp' | 'folder' | 'webhook' | 'git-branch'
                  setTargetDraft({
                    ...targetDraft,
                    // The connection is cleared with the type: an FTP account cannot serve an
                    // SFTP destination, and silently keeping it would fail only at deploy time.
                    connectionId: undefined,
                    destination: emptyDestination(type)
                  })
                }}
              >
                <option value="sftp">SFTP</option>
                <option value="ftp">FTP</option>
                <option value="folder">{t('publish.targetForm.typeFolder')}</option>
                <option value="webhook">{t('publish.targetForm.typeWebhook')}</option>
                <option value="git-branch">{t('publish.targetForm.typeGitBranch')}</option>
              </Select>
            </Field>
            {'remotePath' in targetDraft.destination && (
              <Field label={t('publish.targetForm.remotePath')}>
                <TextInput
                  value={targetDraft.destination.remotePath}
                  onChange={(e) =>
                    setTargetDraft({
                      ...targetDraft,
                      destination: { ...targetDraft.destination, remotePath: e.target.value } as SavePublishTargetInput['destination']
                    })
                  }
                />
              </Field>
            )}
            {targetDraft.destination.type === 'sftp' && (
              <Field label={t('publish.targetForm.transfer')}>
                <Select
                  value={targetDraft.destination.transfer}
                  onChange={(e) =>
                    setTargetDraft({
                      ...targetDraft,
                      destination: { ...targetDraft.destination, transfer: e.target.value as 'sftp' | 'rsync' } as SavePublishTargetInput['destination']
                    })
                  }
                  disabled={!!rsyncBlocker}
                >
                  <option value="sftp">{t('publish.targetForm.transferSftp')}</option>
                  <option value="rsync">{t('publish.targetForm.transferRsync')}</option>
                </Select>
              </Field>
            )}
            {targetDraft.destination.type === 'git-branch' && (
              <>
                <Field label={t('publish.targetForm.provider')}>
                  <Select
                    value={targetDraft.destination.provider}
                    onChange={(e) => {
                      const provider = e.target.value as 'github' | 'gitlab' | 'codeberg'
                      setTargetDraft((prev) =>
                        prev && prev.destination.type === 'git-branch'
                          ? {
                              ...prev,
                              destination: {
                                ...prev.destination,
                                provider,
                                // Only follow the provider while the branch is still whichever
                                // default a provider set - a name the user typed stays.
                                branch: Object.values(BRANCH_DEFAULTS).includes(prev.destination.branch)
                                  ? BRANCH_DEFAULTS[provider]
                                  : prev.destination.branch
                              }
                            }
                          : prev
                      )
                    }}
                  >
                    <option value="github">GitHub Pages</option>
                    <option value="codeberg">Codeberg Pages</option>
                    <option value="gitlab">GitLab Pages</option>
                  </Select>
                </Field>
                <Field label={t('publish.targetForm.branch')}>
                  <TextInput
                    value={targetDraft.destination.branch}
                    onChange={(e) =>
                      setTargetDraft((prev) =>
                        prev && prev.destination.type === 'git-branch'
                          ? { ...prev, destination: { ...prev.destination, branch: e.target.value } }
                          : prev
                      )
                    }
                  />
                </Field>
              </>
            )}
            {targetDraft.destination.type === 'folder' && (
              <Field label={t('publish.targetForm.folderPath')}>
                <div className="flex gap-2">
                  <TextInput
                    value={targetDraft.destination.path}
                    onChange={(e) =>
                      setTargetDraft({
                        ...targetDraft,
                        destination: { type: 'folder', path: e.target.value, deleteRemoved: true }
                      })
                    }
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      const folder = await window.quartzGui.dialog.pickFolder()
                      if (folder) {
                        setTargetDraft((prev) =>
                          prev && prev.destination.type === 'folder'
                            ? { ...prev, destination: { ...prev.destination, path: folder } }
                            : prev
                        )
                      }
                    }}
                  >
                    {t('common.select')}
                  </Button>
                </div>
              </Field>
            )}
            {draftKind && (
            <Field label={t('publish.targetForm.connection')}>
              <Select
                value={targetDraft.connectionId ?? ''}
                onChange={(e) => {
                  const connectionId = e.target.value || undefined
                  const picked = connections.find((c) => c.id === connectionId)
                  const blocked = picked?.kind === 'ssh' ? !!rsyncBlockReason(picked, window.quartzGui.platform) : true
                  setTargetDraft({
                    ...targetDraft,
                    connectionId,
                    // Switching to a credential rsync cannot use must not leave the target on a
                    // transfer that will fail - it falls back to SFTP, which every credential can do.
                    destination:
                      targetDraft.destination.type === 'sftp' && blocked
                        ? { ...targetDraft.destination, transfer: 'sftp' }
                        : targetDraft.destination
                  })
                }}
              >
                <option value="">{t('publish.targetForm.pickConnection')}</option>
                {eligibleConnections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {'host' in c ? ` (${c.username}@${c.host})` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            )}
            {'deleteRemoved' in targetDraft.destination && (
              <div className="flex items-end pb-1.5">
                <Toggle
                  label={t('publish.targetForm.deleteRemoved')}
                  checked={targetDraft.destination.deleteRemoved}
                  onChange={(checked) =>
                    setTargetDraft({
                      ...targetDraft,
                      destination: { ...targetDraft.destination, deleteRemoved: checked } as SavePublishTargetInput['destination']
                    })
                  }
                />
              </div>
            )}
          </div>

          {targetDraft.destination.type === 'git-branch' && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {t(`publish.branchHint.${targetDraft.destination.provider}`)}
            </p>
          )}

          {targetDraft.destination.type === 'sftp' && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {rsyncBlocker
                ? t(`publish.rsyncBlocked.${rsyncBlocker}`)
                : targetDraft.destination.transfer === 'rsync'
                  ? t('publish.rsyncHint')
                  : t('publish.sftpHint')}
            </p>
          )}

          {draftKind && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button variant="ghost" onClick={() => setConnectionDraft(emptyConnectionDraft(draftKind))}>
                {t('publish.newConnection')}
              </Button>
              {/* Creating one in the flow stays here; everything else about a connection - editing
                  it, rotating its password, forgetting a host key - is app-level and lives in the
                  Einstellungen, because one login commonly serves several projects. */}
              <Link to="/settings" className="text-[13px] text-slate-500 underline hover:text-slate-900 dark:hover:text-white">
                {t('publish.manageConnections')}
              </Link>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <Button onClick={() => saveTargetAction.run()} disabled={saveTargetAction.pending || !targetDraft.name.trim() || !targetReady}>
              {saveTargetAction.pending ? t('common.saving') : t('common.save')}
            </Button>
            <Button variant="ghost" onClick={() => setTargetDraft(null)}>
              {t('common.cancel')}
            </Button>
          </div>
          {saveTargetAction.error && (
            <p className="mt-2 whitespace-pre-wrap break-words text-xs text-red-600 dark:text-red-400">{saveTargetAction.error}</p>
          )}
        </Card>
      )}

      {connectionDraft && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold">{t('publish.connectionForm.heading')}</h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('publish.connectionForm.explainer')}</p>
          <ConnectionFormFields draft={connectionDraft} onChange={setConnectionDraft} />
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => saveConnectionAction.run()}
              disabled={saveConnectionAction.pending || !connectionDraft.name.trim()}
            >
              {saveConnectionAction.pending ? t('common.saving') : t('common.save')}
            </Button>
            <Button variant="ghost" onClick={() => setConnectionDraft(null)}>
              {t('common.cancel')}
            </Button>
          </div>
          {saveConnectionAction.error && (
            <p className="mt-2 whitespace-pre-wrap break-words text-xs text-red-600 dark:text-red-400">
              {saveConnectionAction.error}
            </p>
          )}
        </Card>
      )}

      {activeTarget?.destination.type === 'git-branch' && activeTarget.destination.provider === 'github' && (
        <GithubPages projectPath={project.path} branch={activeTarget.destination.branch} />
      )}

      {activeTarget && !hasFileDiff && (
        <Card>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('publish.webhookExplainer')}</p>
        </Card>
      )}

      {hasFileDiff && (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t('publish.diffHeading')}</h2>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => buildAction.run()} disabled={buildAction.pending}>
                {buildAction.pending ? t('common.saving') : t('publish.buildNow')}
              </Button>
              <Button variant="ghost" onClick={() => refreshDiff()} disabled={diffAction.pending || !activeTarget}>
                {diffAction.pending ? t('common.saving') : t('publish.refreshDiff')}
              </Button>
            </div>
          </div>

          <div className="mt-3">
            <Field label={t('publish.outputDir')}>
              <TextInput
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                // Written when the value is settled, not per keystroke - same as on Vorschau & Build,
                // where the other half of this shared setting lives.
                onBlur={(e) => void window.quartzGui.projectPrefs.save(project.path, { outputDir: e.target.value })}
                placeholder={t('publish.outputDirPlaceholder')}
                className="max-w-md"
              />
            </Field>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('publish.outputDirShared')}</p>
          </div>

          {(diffAction.error || buildAction.error) && (
            <p className="mt-2 whitespace-pre-wrap break-words text-xs text-red-600 dark:text-red-400">
              {diffAction.error ?? buildAction.error}
            </p>
          )}

          {diff === null && !diffAction.error && <p className="mt-2 text-xs text-slate-500">{t('publish.noDiffYet')}</p>}
          {diff && diff.length === 0 && <p className="mt-2 text-xs text-slate-500">{t('publish.noChanges')}</p>}

          {diff && diff.length > 0 && (
            <div className="mt-2 flex flex-col gap-3">
              {(['added', 'changed', 'removed'] as const).map(
                (status) =>
                  grouped[status].length > 0 && (
                    <div key={status}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t(`publish.status.${status}`)} ({grouped[status].length})
                      </p>
                      <div className="columns-1 gap-x-6 sm:columns-2 xl:columns-3">
                        {grouped[status].map((entry) =>
                          canExclude ? (
                            <label key={entry.path} className="flex break-inside-avoid items-center gap-2 font-mono text-xs">
                              <input
                                type="checkbox"
                                checked={!excluded.has(entry.path)}
                                onChange={() => toggleExclude(entry.path)}
                              />
                              <span className={excluded.has(entry.path) ? 'text-slate-400 line-through' : ''}>{entry.path}</span>
                            </label>
                          ) : (
                            <p key={entry.path} className="break-inside-avoid font-mono text-xs text-slate-600 dark:text-slate-300">
                              {entry.path}
                            </p>
                          )
                        )}
                      </div>
                    </div>
                  )
              )}
            </div>
          )}
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('publish.deployHeading')}</h2>
          <Button onClick={deploy} disabled={deployAction.pending || !canDeploy}>
            {deployAction.pending ? t('common.saving') : t('publish.deployButton')}
          </Button>
        </div>
        {activeTarget && 'deleteRemoved' in activeTarget.destination && !activeTarget.destination.deleteRemoved && (
          <Badge tone="slate">{t('publish.deleteDisabledHint')}</Badge>
        )}
        {deployAction.error && (
          <p className="mt-2 whitespace-pre-wrap break-words text-xs text-red-600 dark:text-red-400">{deployAction.error}</p>
        )}
        {progress && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {t('publish.progress', { processed: progress.processed, total: progress.total, file: progress.currentFile ?? '' })}
          </p>
        )}
        {deployResult && (
          <>
            <p className={`mt-2 text-xs ${deployResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {deployResult.success ? t('publish.deploySuccess') : t('publish.deployFailed')}
            </p>
            <pre className="mt-2 max-h-56 overflow-y-auto rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-200">{deployResult.output}</pre>
          </>
        )}
      </Card>
    </div>
  )
}
