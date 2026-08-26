import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from './ProjectLayout'
import type {
  DeployConnectionProfile,
  DeployDiffEntry,
  DeployProgressEvent,
  DeployResult,
  QuartzConfig,
  SaveDeployConnectionInput
} from '@shared/ipc-contract'
import { Badge, Button, Card, Field, PageHeader, Select, TextInput, Toggle } from '../components/ui'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { useStickyState } from '../state/uiState'
import { TAB_ICONS } from './navConfig'

type Target = { kind: 'github-pages' } | { kind: 'connection'; id: string }

function emptyDraft(projectPath: string): SaveDeployConnectionInput {
  return {
    projectPath,
    name: '',
    protocol: 'sftp',
    host: '',
    port: 22,
    username: '',
    remotePath: '/',
    authMethod: 'password',
    secret: ''
  }
}

export default function Publish(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [connections, setConnections] = useState<DeployConnectionProfile[]>([])
  // Which destination is selected, and the two fields that describe it, are "where the user was" -
  // kept across a trip to another area (see useStickyState). The diff below deliberately is not:
  // it's a snapshot of the build output and has to be re-taken.
  const [target, setTarget] = useStickyState<Target>('publish.target', { kind: 'github-pages' })
  const [githubBranch, setGithubBranch] = useStickyState('publish.githubBranch', 'gh-pages')
  // Which directory gets published. Empty means quartz's own default, public/. Kept explicit
  // rather than assumed: BuildServer's one-off export can write somewhere else entirely, and
  // silently diffing a stale public/ against the server is exactly the kind of wrong that looks
  // like it worked.
  const [outputDir, setOutputDir] = useStickyState('publish.outputDir', '')
  const [editingDraft, setEditingDraft] = useState<SaveDeployConnectionInput | null>(null)
  const [diff, setDiff] = useState<DeployDiffEntry[] | null>(null)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null)
  const [progress, setProgress] = useState<DeployProgressEvent | null>(null)

  async function reloadConnections(): Promise<void> {
    setConnections(await window.quartzGui.deploy.listConnections(project.path))
  }

  useEffect(() => {
    window.quartzGui.config.get(project.path).then(setConfig)
    reloadConnections()
  }, [project.path])

  useEffect(() => window.quartzGui.deploy.onProgress(setProgress), [])

  // The diff reads the build output directory, which simply doesn't exist until the first build -
  // the call then rejects, and before this hook the "Diff aktualisieren" button stayed disabled on
  // "Speichere…" for good, with nothing on screen saying why.
  const diffAction = useAsyncAction(async () => {
    setDeployResult(null)
    const result = await window.quartzGui.deploy.diff(project.path, outputDir || undefined)
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
    if (target.kind === 'github-pages') {
      if (!confirm(t('publish.confirmDeployGithubPages', { branch: githubBranch }))) return
    } else {
      const uploads = (diff ?? []).filter((e) => e.status !== 'removed' && !excluded.has(e.path)).length
      const deletions = (diff ?? []).filter((e) => e.status === 'removed' && !excluded.has(e.path)).length
      const label = activeConnection ? `${activeConnection.host}:${activeConnection.remotePath}` : ''
      if (!confirm(t('publish.confirmDeployConnection', { target: label, uploads, deletions }))) return
    }

    await deployAction.run()
  }

  const deployAction = useAsyncAction(async () => {
    setDeployResult(null)
    setProgress(null)
    const result =
      target.kind === 'github-pages'
        ? await window.quartzGui.deploy.runGithubPages(project.path, outputDir || undefined, { branch: githubBranch })
        : await window.quartzGui.deploy.run(target.id, outputDir || undefined, Array.from(excluded))
    setDeployResult(result)
    if (result.success) await refreshDiff()
  })

  async function saveConnection(): Promise<void> {
    if (!editingDraft) return
    const saved = await window.quartzGui.deploy.saveConnection(editingDraft)
    setEditingDraft(null)
    await reloadConnections()
    setTarget({ kind: 'connection', id: saved.id })
  }

  // Deliberately a separate, confirmed action rather than an option in the mismatch dialog - see
  // deployService's hostVerifier for why a "key changed, continue?" prompt is the wrong shape.
  async function forgetHostKey(connection: DeployConnectionProfile): Promise<void> {
    if (!confirm(t('publish.confirmForgetHostKey', { host: connection.host }))) return
    await window.quartzGui.deploy.forgetHostKey(connection.id)
    await reloadConnections()
  }

  async function deleteConnection(id: string): Promise<void> {
    if (!confirm(t('publish.confirmDeleteConnection'))) return
    await window.quartzGui.deploy.deleteConnection(id)
    if (target.kind === 'connection' && target.id === id) setTarget({ kind: 'github-pages' })
    await reloadConnections()
  }

  const baseUrl = typeof config?.configuration.baseUrl === 'string' ? config.configuration.baseUrl : ''
  const baseUrlWarning = !baseUrl || baseUrl === 'localhost'

  const grouped = useMemo(() => {
    const groups: Record<'added' | 'changed' | 'removed', DeployDiffEntry[]> = { added: [], changed: [], removed: [] }
    for (const entry of diff ?? []) groups[entry.status].push(entry)
    return groups
  }, [diff])

  const activeConnection = target.kind === 'connection' ? connections.find((c) => c.id === target.id) : undefined
  const canDeploy = target.kind === 'github-pages' || !!activeConnection

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
            onClick={() => setTarget({ kind: 'github-pages' })}
            className={`rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
              target.kind === 'github-pages'
                ? 'bg-blue-600 text-white'
                : 'bg-black/[0.05] text-slate-700 hover:bg-black/[0.08] dark:bg-white/10 dark:text-slate-200'
            }`}
          >
            {t('publish.githubPages')}
          </button>
          {connections.map((c) => (
            <button
              key={c.id}
              onClick={() => setTarget({ kind: 'connection', id: c.id })}
              className={`rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                target.kind === 'connection' && target.id === c.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-black/[0.05] text-slate-700 hover:bg-black/[0.08] dark:bg-white/10 dark:text-slate-200'
              }`}
            >
              {c.name} ({c.protocol.toUpperCase()})
            </button>
          ))}
          <Button variant="ghost" onClick={() => setEditingDraft(emptyDraft(project.path))}>
            {t('publish.newConnection')}
          </Button>
        </div>

        {target.kind === 'github-pages' && (
          <div className="mt-3 flex items-end gap-2">
            <Field label={t('publish.githubBranch')}>
              <TextInput value={githubBranch} onChange={(e) => setGithubBranch(e.target.value)} className="w-40" />
            </Field>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('publish.githubPagesHint')}</p>
          </div>
        )}

        {activeConnection && (
          <div className="mt-3 flex items-center justify-between rounded-md border border-black/[0.06] p-2.5 text-xs dark:border-white/10">
            <span>
              {activeConnection.username}@{activeConnection.host}:{activeConnection.port} → {activeConnection.remotePath}
              {!activeConnection.hasSecret && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">{t('publish.noSecretWarning')}</span>
              )}
              {activeConnection.protocol === 'sftp' && (
                <span className="mt-1 block font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {activeConnection.hostKeyFingerprint
                    ? `${t('publish.hostKeyPinned')}: ${activeConnection.hostKeyFingerprint}`
                    : t('publish.hostKeyUnknown')}
                </span>
              )}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-slate-500 underline"
                onClick={() => setEditingDraft({ ...activeConnection, secret: undefined })}
              >
                {t('common.edit')}
              </button>
              {activeConnection.protocol === 'sftp' && activeConnection.hostKeyFingerprint && (
                <button type="button" className="text-slate-500 underline" onClick={() => forgetHostKey(activeConnection)}>
                  {t('publish.forgetHostKey')}
                </button>
              )}
              <button type="button" className="text-red-600 underline dark:text-red-400" onClick={() => deleteConnection(activeConnection.id)}>
                {t('common.remove')}
              </button>
            </div>
          </div>
        )}
      </Card>

      {editingDraft && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold">{t('publish.connectionForm.heading')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('publish.connectionForm.name')}>
              <TextInput value={editingDraft.name} onChange={(e) => setEditingDraft({ ...editingDraft, name: e.target.value })} />
            </Field>
            <Field label={t('publish.connectionForm.protocol')}>
              <Select
                value={editingDraft.protocol}
                onChange={(e) =>
                  setEditingDraft({ ...editingDraft, protocol: e.target.value as 'sftp' | 'ftp', port: e.target.value === 'sftp' ? 22 : 21 })
                }
              >
                <option value="sftp">SFTP</option>
                <option value="ftp">FTP</option>
              </Select>
            </Field>
            <Field label={t('publish.connectionForm.host')}>
              <TextInput value={editingDraft.host} onChange={(e) => setEditingDraft({ ...editingDraft, host: e.target.value })} />
            </Field>
            <Field label={t('publish.connectionForm.port')}>
              <TextInput
                type="number"
                value={editingDraft.port}
                onChange={(e) => setEditingDraft({ ...editingDraft, port: Number(e.target.value) || 0 })}
              />
            </Field>
            <Field label={t('publish.connectionForm.username')}>
              <TextInput value={editingDraft.username} onChange={(e) => setEditingDraft({ ...editingDraft, username: e.target.value })} />
            </Field>
            <Field label={t('publish.connectionForm.remotePath')}>
              <TextInput value={editingDraft.remotePath} onChange={(e) => setEditingDraft({ ...editingDraft, remotePath: e.target.value })} />
            </Field>
            <Field label={t('publish.connectionForm.authMethod')}>
              <Select
                value={editingDraft.authMethod}
                onChange={(e) => setEditingDraft({ ...editingDraft, authMethod: e.target.value as 'password' | 'privateKey' })}
              >
                <option value="password">{t('publish.connectionForm.authPassword')}</option>
                <option value="privateKey">{t('publish.connectionForm.authPrivateKey')}</option>
              </Select>
            </Field>
            {editingDraft.protocol === 'ftp' && (
              <div className="flex items-end pb-1.5">
                <Toggle
                  label={t('publish.connectionForm.secure')}
                  checked={!!editingDraft.secure}
                  onChange={(checked) => setEditingDraft({ ...editingDraft, secure: checked })}
                />
              </div>
            )}
            {editingDraft.protocol === 'ftp' && !editingDraft.secure && (
              <p className="col-span-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                {t('publish.ftpPlaintextWarning')}
              </p>
            )}
            <Field
              label={
                editingDraft.authMethod === 'password' ? t('publish.connectionForm.password') : t('publish.connectionForm.privateKey')
              }
            >
              {editingDraft.authMethod === 'password' ? (
                <TextInput
                  type="password"
                  value={editingDraft.secret ?? ''}
                  onChange={(e) => setEditingDraft({ ...editingDraft, secret: e.target.value })}
                  placeholder={editingDraft.id ? t('publish.connectionForm.secretUnchangedPlaceholder') : ''}
                />
              ) : (
                <textarea
                  value={editingDraft.secret ?? ''}
                  onChange={(e) => setEditingDraft({ ...editingDraft, secret: e.target.value })}
                  rows={3}
                  placeholder={editingDraft.id ? t('publish.connectionForm.secretUnchangedPlaceholder') : ''}
                  className="rounded-[7px] border border-black/10 bg-white px-2.5 py-1.5 font-mono text-[12px] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                />
              )}
            </Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={saveConnection} disabled={!editingDraft.name.trim() || !editingDraft.host.trim()}>
              {t('common.save')}
            </Button>
            <Button variant="ghost" onClick={() => setEditingDraft(null)}>
              {t('common.cancel')}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('publish.diffHeading')}</h2>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => buildAction.run()} disabled={buildAction.pending}>
              {buildAction.pending ? t('common.saving') : t('publish.buildNow')}
            </Button>
            <Button variant="ghost" onClick={() => refreshDiff()} disabled={diffAction.pending}>
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
                    <div className="flex flex-col gap-1">
                      {grouped[status].map((entry) => (
                        <label key={entry.path} className="flex items-center gap-2 font-mono text-xs">
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

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('publish.deployHeading')}</h2>
          <Button onClick={deploy} disabled={deployAction.pending || !canDeploy || !diff}>
            {deployAction.pending ? t('common.saving') : t('publish.deployButton')}
          </Button>
        </div>
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
