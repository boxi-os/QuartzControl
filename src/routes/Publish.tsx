import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from './ProjectLayout'
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
import { Badge, Button, Card, Field, PageHeader, Select, TextInput, Toggle } from '../components/ui'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { useStickyState } from '../state/uiState'
import { TAB_ICONS } from './navConfig'

// GitHub Pages is not a stored target: it needs no credential of its own (it pushes over the
// repo's existing origin) and no per-project settings beyond the branch, so it stays a built-in
// choice rather than something the user has to create first.
type Selection = { kind: 'github-pages' } | { kind: 'target'; id: string }

function emptyTargetDraft(): SavePublishTargetInput {
  return { name: '', destination: { type: 'sftp', remotePath: '/', transfer: 'sftp', deleteRemoved: true } }
}

function emptyConnectionDraft(kind: 'ssh' | 'ftp' | 'webhook'): SaveConnectionInput {
  if (kind === 'ssh') return { kind: 'ssh', name: '', host: '', port: 22, username: '', authMethod: 'password', secret: '' }
  if (kind === 'ftp') return { kind: 'ftp', name: '', host: '', port: 21, username: '', secure: true, secret: '' }
  return { kind: 'webhook', name: '', secret: '' }
}

/** Which connection kind a destination needs, or null when it needs none - a folder is reached
 *  through the filesystem, and a git branch through the repo's own origin remote. */
function requiredKind(destination: SavePublishTargetInput['destination']): 'ssh' | 'ftp' | 'webhook' | null {
  if (destination.type === 'sftp') return 'ssh'
  if (destination.type === 'ftp') return 'ftp'
  if (destination.type === 'webhook') return 'webhook'
  return null
}

function emptyDestination(type: 'sftp' | 'ftp' | 'folder' | 'webhook'): SavePublishTargetInput['destination'] {
  switch (type) {
    case 'sftp':
      return { type: 'sftp', remotePath: '/', transfer: 'sftp', deleteRemoved: true }
    case 'ftp':
      return { type: 'ftp', remotePath: '/', deleteRemoved: true }
    case 'folder':
      return { type: 'folder', path: '', deleteRemoved: true }
    case 'webhook':
      return { type: 'webhook' }
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
  const [selection, setSelection] = useStickyState<Selection>('publish.target', { kind: 'github-pages' })
  const [githubBranch, setGithubBranch] = useStickyState('publish.githubBranch', 'gh-pages')
  // Which directory gets published. Empty means quartz's own default, public/. Kept explicit
  // rather than assumed: BuildServer's one-off export can write somewhere else entirely, and
  // silently diffing a stale public/ against the server is exactly the kind of wrong that looks
  // like it worked.
  const [outputDir, setOutputDir] = useStickyState('publish.outputDir', '')
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
    reload()
  }, [project.path])

  useEffect(() => window.quartzGui.deploy.onProgress(setProgress), [])

  // Everything below describes *one* target. Left standing across a switch, the previous target's
  // success message and file list read as statements about the newly selected one - seen in the
  // running app, where a folder deploy's "nothing to do" sat under a webhook target that had never
  // run. The key covers the whole selection, so the GitHub Pages/target switch clears it too.
  const selectionKey = selection.kind === 'target' ? selection.id : 'github-pages'
  useEffect(() => {
    setDiff(null)
    setExcluded(new Set())
    setDeployResult(null)
    setProgress(null)
  }, [selectionKey])

  const activeTarget = selection.kind === 'target' ? targets.find((tg) => tg.id === selection.id) : undefined
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
    if (selection.kind === 'github-pages') {
      if (!confirm(t('publish.confirmDeployGithubPages', { branch: githubBranch }))) return
    } else {
      const uploads = (diff ?? []).filter((e) => e.status !== 'removed' && !excluded.has(e.path)).length
      const deletions = (diff ?? []).filter((e) => e.status === 'removed' && !excluded.has(e.path)).length
      if (!confirm(t('publish.confirmDeployConnection', { target: activeTarget?.name ?? '', uploads, deletions }))) return
    }

    await deployAction.run()
  }

  const deployAction = useAsyncAction(async () => {
    setDeployResult(null)
    setProgress(null)
    const result =
      selection.kind === 'github-pages'
        ? await window.quartzGui.deploy.runGithubPages(project.path, outputDir || undefined, { branch: githubBranch })
        : await window.quartzGui.deploy.run(project.path, selection.id, outputDir || undefined, Array.from(excluded))
    setDeployResult(result)
    if (result.success && selection.kind === 'target') await refreshDiff(true)
  })

  async function saveTarget(): Promise<void> {
    if (!targetDraft) return
    const saved = await window.quartzGui.publishTargets.save(project.path, targetDraft)
    setTargetDraft(null)
    await reload()
    setSelection({ kind: 'target', id: saved.id })
  }

  async function saveConnection(): Promise<void> {
    if (!connectionDraft) return
    const saved = await window.quartzGui.connections.save(connectionDraft)
    setConnectionDraft(null)
    setConnections(await window.quartzGui.connections.list())
    // A connection created from inside the target form is immediately what that target uses -
    // otherwise the user has to pick it from the dropdown they just implicitly filled.
    setTargetDraft((prev) => (prev ? { ...prev, connectionId: saved.id } : prev))
  }

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
    if (selection.kind === 'target' && selection.id === id) setSelection({ kind: 'github-pages' })
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
  // A folder target needs no credential but does need a path; every other type needs its
  // connection picked before there is anything to save.
  const targetReady =
    !!targetDraft &&
    (targetDraft.destination.type === 'folder' ? !!targetDraft.destination.path.trim() : !!targetDraft.connectionId)
  // Which targets have a file diff at all. GitHub Pages compares trees on the remote itself and
  // skips the push when they match; a webhook only asks a provider to build. Neither has a local
  // file list, so neither may be gated on one - that check used to leave their deploy button
  // permanently disabled.
  const hasFileDiff =
    selection.kind === 'target' && !!activeTarget && activeTarget.destination.type !== 'webhook'
  const canDeploy = selection.kind === 'github-pages' ? true : !!activeTarget && (!hasFileDiff || !!diff)

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
          <button
            onClick={() => setSelection({ kind: 'github-pages' })}
            className={`rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
              selection.kind === 'github-pages'
                ? 'bg-blue-600 text-white'
                : 'bg-black/[0.05] text-slate-700 hover:bg-black/[0.08] dark:bg-white/10 dark:text-slate-200'
            }`}
          >
            {t('publish.githubPages')}
          </button>
          {targets.map((target) => (
            <button
              key={target.id}
              onClick={() => setSelection({ kind: 'target', id: target.id })}
              className={`rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                selection.kind === 'target' && selection.id === target.id
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

        {selection.kind === 'github-pages' && (
          <div className="mt-3 flex items-end gap-2">
            <Field label={t('publish.githubBranch')}>
              <TextInput value={githubBranch} onChange={(e) => setGithubBranch(e.target.value)} className="w-40" />
            </Field>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('publish.githubPagesHint')}</p>
          </div>
        )}

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
                  const type = e.target.value as 'sftp' | 'ftp' | 'folder' | 'webhook'
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
                onChange={(e) => setTargetDraft({ ...targetDraft, connectionId: e.target.value || undefined })}
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

          {draftKind && (
            <div className="mt-3">
              <Button variant="ghost" onClick={() => setConnectionDraft(emptyConnectionDraft(draftKind))}>
                {t('publish.newConnection')}
              </Button>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <Button onClick={saveTarget} disabled={!targetDraft.name.trim() || !targetReady}>
              {t('common.save')}
            </Button>
            <Button variant="ghost" onClick={() => setTargetDraft(null)}>
              {t('common.cancel')}
            </Button>
          </div>
        </Card>
      )}

      {connectionDraft && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold">{t('publish.connectionForm.heading')}</h2>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('publish.connectionForm.explainer')}</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Field label={t('publish.connectionForm.name')}>
              <TextInput value={connectionDraft.name} onChange={(e) => setConnectionDraft({ ...connectionDraft, name: e.target.value })} />
            </Field>
            {connectionDraft.kind !== 'webhook' && (
              <>
                <Field label={t('publish.connectionForm.host')}>
                  <TextInput
                    value={'host' in connectionDraft ? connectionDraft.host : ''}
                    onChange={(e) => setConnectionDraft({ ...connectionDraft, host: e.target.value } as SaveConnectionInput)}
                  />
                </Field>
                <Field label={t('publish.connectionForm.port')}>
                  <TextInput
                    type="number"
                    value={'port' in connectionDraft ? connectionDraft.port : 0}
                    onChange={(e) => setConnectionDraft({ ...connectionDraft, port: Number(e.target.value) || 0 } as SaveConnectionInput)}
                  />
                </Field>
                <Field label={t('publish.connectionForm.username')}>
                  <TextInput
                    value={'username' in connectionDraft ? connectionDraft.username : ''}
                    onChange={(e) => setConnectionDraft({ ...connectionDraft, username: e.target.value } as SaveConnectionInput)}
                  />
                </Field>
              </>
            )}
            {connectionDraft.kind === 'ssh' && (
              <Field label={t('publish.connectionForm.authMethod')}>
                <Select
                  value={connectionDraft.authMethod}
                  onChange={(e) =>
                    setConnectionDraft({
                      ...connectionDraft,
                      authMethod: e.target.value as 'password' | 'privateKey' | 'agent',
                      secret: ''
                    })
                  }
                >
                  <option value="password">{t('publish.connectionForm.authPassword')}</option>
                  <option value="privateKey">{t('publish.connectionForm.authPrivateKey')}</option>
                  <option value="agent">{t('publish.connectionForm.authAgent')}</option>
                </Select>
              </Field>
            )}
            {connectionDraft.kind === 'ftp' && (
              <div className="flex items-end pb-1.5">
                <Toggle
                  label={t('publish.connectionForm.secure')}
                  checked={connectionDraft.secure}
                  onChange={(checked) => setConnectionDraft({ ...connectionDraft, secure: checked })}
                />
              </div>
            )}
            {connectionDraft.kind === 'ssh' && connectionDraft.authMethod === 'privateKey' && (
              <Field label={t('publish.connectionForm.keyPath')}>
                <div className="flex gap-2">
                  <TextInput
                    value={connectionDraft.keyPath ?? ''}
                    onChange={(e) => setConnectionDraft({ ...connectionDraft, keyPath: e.target.value || undefined })}
                    className="flex-1"
                    placeholder="~/.ssh/id_ed25519"
                  />
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      const file = await window.quartzGui.dialog.pickFile()
                      if (file) setConnectionDraft({ ...connectionDraft, keyPath: file })
                    }}
                  >
                    {t('common.select')}
                  </Button>
                </div>
              </Field>
            )}
            {connectionDraft.kind === 'ssh' && connectionDraft.authMethod === 'agent' ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 sm:col-span-2 xl:col-span-3">
                {t('publish.connectionForm.agentHint')}
              </p>
            ) : connectionDraft.kind === 'webhook' ? (
              <Field label={t('publish.connectionForm.webhookUrl')}>
                {/* Not a password field: the URL has to be readable while pasting it, since a
                    mistyped build hook fails with a 404 that says nothing about which one. It is
                    still stored encrypted - its path is the token. */}
                <TextInput
                  value={connectionDraft.secret ?? ''}
                  onChange={(e) => setConnectionDraft({ ...connectionDraft, secret: e.target.value })}
                  placeholder="https://api.netlify.com/build_hooks/…"
                />
              </Field>
            ) : (
              <Field
                label={
                  connectionDraft.kind === 'ssh' && connectionDraft.authMethod === 'privateKey'
                    ? t('publish.connectionForm.privateKey')
                    : t('publish.connectionForm.password')
                }
              >
                <TextInput
                  type="password"
                  value={connectionDraft.secret ?? ''}
                  onChange={(e) => setConnectionDraft({ ...connectionDraft, secret: e.target.value })}
                  placeholder={connectionDraft.id ? t('publish.connectionForm.secretUnchangedPlaceholder') : ''}
                />
              </Field>
            )}
          </div>
          {connectionDraft.kind === 'ftp' && !connectionDraft.secure && (
            <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              {t('publish.ftpPlaintextWarning')}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button onClick={saveConnection} disabled={!connectionDraft.name.trim()}>
              {t('common.save')}
            </Button>
            <Button variant="ghost" onClick={() => setConnectionDraft(null)}>
              {t('common.cancel')}
            </Button>
          </div>
        </Card>
      )}

      {selection.kind === 'target' && !hasFileDiff && (
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
                placeholder={t('publish.outputDirPlaceholder')}
                className="max-w-md"
              />
            </Field>
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
                        {grouped[status].map((entry) => (
                          <label key={entry.path} className="flex break-inside-avoid items-center gap-2 font-mono text-xs">
                            <input
                              type="checkbox"
                              checked={!excluded.has(entry.path)}
                              onChange={() => toggleExclude(entry.path)}
                            />
                            <span className={excluded.has(entry.path) ? 'text-slate-400 line-through' : ''}>{entry.path}</span>
                          </label>
                        ))}
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
