import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from './ProjectLayout'
import type { BackupEntry, Snapshot, SnapshotFileChange, SnapshotSettings } from '@shared/ipc-contract'
import { Badge, Button, Card, PageHeader, TextInput, Toggle } from '../components/ui'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { formatBytes } from '../utils/format'
import { useStickyState } from '../state/uiState'
import { TAB_ICONS } from './navConfig'

function SnapshotRow({
  snapshot,
  expanded,
  onToggle,
  children
}: {
  snapshot: Snapshot
  expanded: boolean
  onToggle: () => void
  children?: React.ReactNode
}): JSX.Element {
  const { t, i18n } = useTranslation()
  return (
    <Card className={expanded ? 'col-span-full' : ''}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={snapshot.kind === 'manual' ? 'green' : 'slate'}>{t(`backups.kinds.${snapshot.kind}`)}</Badge>
            <span className="text-sm">{new Date(snapshot.createdAt).toLocaleString(i18n.language)}</span>
          </div>
          {snapshot.label && <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">{snapshot.label}</p>}
        </div>
        <Button variant="ghost" className="shrink-0 whitespace-nowrap" onClick={onToggle}>
          {expanded ? t('backups.close') : t('backups.compare')}
        </Button>
      </div>
      {children}
    </Card>
  )
}

export default function Backups(): JSX.Element {
  const { t, i18n } = useTranslation()
  const project = useProject()

  const [snapshots, setSnapshots] = useState<Snapshot[] | null>(null)
  const [settings, setSettings] = useState<SnapshotSettings | null>(null)
  const [openId, setOpenId] = useStickyState<string | null>('backups.open', null)
  const [changes, setChanges] = useState<SnapshotFileChange[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [resetHead, setResetHead] = useState(false)
  const [fileDiff, setFileDiff] = useState<{ path: string; text: string } | null>(null)
  const [newLabel, setNewLabel] = useStickyState('backups.newLabel', '')
  const [message, setMessage] = useState<string | null>(null)
  const [contentFolders, setContentFolders] = useState<BackupEntry[]>([])
  const [currentHead, setCurrentHead] = useState<string | null>(null)

  const openSnapshot = snapshots?.find((s) => s.id === openId) ?? null

  async function reload(): Promise<void> {
    const [list, s, folders, status] = await Promise.all([
      window.quartzGui.snapshots.list(project.path),
      window.quartzGui.snapshots.settings(project.path),
      window.quartzGui.backups.listContentFolders(project.path),
      window.quartzGui.sync.status(project.path)
    ])
    setSnapshots(list)
    setSettings(s)
    setContentFolders(folders)
    setCurrentHead(status.lastCommit?.sha ?? null)
  }

  useEffect(() => {
    reload()
  }, [project.path])

  // Opening a snapshot is what loads its diff; the list itself stays cheap, since a diff stages
  // the whole project against that commit.
  useEffect(() => {
    setChanges(null)
    setSelected(new Set())
    setFileDiff(null)
    setResetHead(false)
    if (!openId) return
    let current = true
    window.quartzGui.snapshots.diff(project.path, openId).then((result) => {
      if (current) setChanges(result)
    })
    return () => {
      current = false
    }
  }, [openId, project.path])

  const createAction = useAsyncAction(async () => {
    const created = await window.quartzGui.snapshots.create(project.path, 'manual', newLabel)
    setNewLabel('')
    setMessage(created ? t('backups.created') : null)
    await reload()
  })

  const restoreAction = useAsyncAction(async (mode: 'all' | 'selected') => {
    if (!openId) return
    const paths = mode === 'selected' ? [...selected] : undefined
    if (!confirm(mode === 'selected' ? t('backups.confirmRestoreFiles', { count: paths?.length ?? 0 }) : t('backups.confirmRestoreAll')))
      return
    const result = await window.quartzGui.snapshots.restore(project.path, openId, { paths, resetProjectHead: resetHead })
    setMessage(result.success ? t('backups.restored') : result.output)
    setOpenId(null)
    await reload()
  })

  const deleteAction = useAsyncAction(async (id: string) => {
    if (!confirm(t('backups.confirmDelete'))) return
    await window.quartzGui.snapshots.delete(project.path, id)
    if (openId === id) setOpenId(null)
    await reload()
  })

  const exportAction = useAsyncAction(async (id: string) => {
    const done = await window.quartzGui.snapshots.export(project.path, id)
    if (done) setMessage(t('backups.exported'))
  })

  const fileDiffAction = useAsyncAction(async (path: string) => {
    if (!openId) return
    setFileDiff({ path, text: await window.quartzGui.snapshots.fileDiff(project.path, openId, path) })
  })

  const settingsAction = useAsyncAction(async (includeContent: boolean) => {
    setSettings(await window.quartzGui.snapshots.saveSettings(project.path, includeContent))
  })

  const restoreFolderAction = useAsyncAction(async (entry: BackupEntry) => {
    if (!confirm(t('backups.confirmRestoreFolder'))) return
    await window.quartzGui.backups.restoreContentFolder(project.path, entry.id)
    await reload()
  })

  // The list only ever grew - and every restore adds to it, since restoring moves the current
  // folder aside first. Nothing else in the app deletes these, and a snapshot does not hold them.
  const deleteFolderAction = useAsyncAction(async (entry: BackupEntry) => {
    if (!confirm(t('backups.confirmDeleteFolder', { size: formatBytes(entry.sizeBytes, i18n.language) }))) return
    await window.quartzGui.backups.deleteContentFolder(project.path, entry.id)
    await reload()
  })

  const error = restoreAction.error ?? createAction.error ?? deleteAction.error ?? exportAction.error ?? fileDiffAction.error
  // Only offer the history rewind when it would actually change something: the snapshot recorded
  // a commit and the project has moved on from it since.
  const headDiffers = !!openSnapshot?.projectHead && !!currentHead && openSnapshot.projectHead !== currentHead

  function toggleFile(path: string): void {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={TAB_ICONS.backups}
        title={t('projectLayout.tabs.backups')}
        description={t('projectLayout.descriptions.backups')}
      />

      <Card>
        <h2 className="text-sm font-semibold">{t('backups.newHeading')}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('backups.newHint')}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TextInput
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={t('backups.labelPlaceholder')}
            className="w-full max-w-sm"
          />
          <Button onClick={() => createAction.run()} disabled={createAction.pending}>
            {createAction.pending ? t('common.saving') : t('backups.create')}
          </Button>
        </div>

        {settings && (
          <div className="mt-4 border-t border-black/[0.06] pt-3 dark:border-white/10">
            <Toggle
              checked={settings.includeContent}
              onChange={(checked) => settingsAction.run(checked)}
              label={t('backups.includeContent')}
              disabled={settingsAction.pending || !settings.contentExists}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {!settings.contentExists
                ? t('backups.contentMissing')
                : settings.contentIsSymlink
                  ? t('backups.contentSymlinkHint')
                  : t('backups.contentFolderHint')}
            </p>
          </div>
        )}
      </Card>

      {message && <p className="whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-slate-300">{message}</p>}
      {error && <p className="whitespace-pre-wrap break-words text-sm text-red-600 dark:text-red-400">{error}</p>}

      {/* A snapshot is a date, a category and two buttons - a full-width row per entry would be
          almost entirely empty space. The one that is open is the exception: its file list and
          diff want the whole window. */}
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {snapshots === null && <p className="text-sm text-slate-500">{t('common.loading')}</p>}
        {snapshots?.length === 0 && <p className="text-sm text-slate-500">{t('backups.none')}</p>}
        {snapshots?.map((snapshot) => (
          <SnapshotRow
            key={snapshot.id}
            snapshot={snapshot}
            expanded={openId === snapshot.id}
            onToggle={() => setOpenId(openId === snapshot.id ? null : snapshot.id)}
          >
            {openId === snapshot.id && (
              <div className="mt-4 border-t border-black/[0.06] pt-3 dark:border-white/10">
                {changes === null && <p className="text-xs text-slate-500">{t('backups.comparing')}</p>}
                {changes?.length === 0 && <p className="text-xs text-slate-500">{t('backups.identical')}</p>}
                {changes && changes.length > 0 && (
                  <>
                    <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                      {t('backups.changeCount', { count: changes.length })}
                    </p>
                    <div className="max-h-72 overflow-y-auto rounded-md border border-black/[0.06] dark:border-white/10">
                      {changes.map((change) => (
                        <div
                          key={change.path}
                          className="flex items-center gap-2 border-b border-black/[0.04] px-2.5 py-1 last:border-b-0 dark:border-white/5"
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(change.path)}
                            onChange={() => toggleFile(change.path)}
                            aria-label={change.path}
                          />
                          <span className="w-32 shrink-0 text-xs text-slate-500 dark:text-slate-400">
                            {t(`backups.status.${change.status}`)}
                          </span>
                          <button
                            type="button"
                            className="min-w-0 flex-1 truncate text-left font-mono text-xs hover:underline"
                            onClick={() => fileDiffAction.run(change.path)}
                            disabled={change.status !== 'modified'}
                          >
                            {change.path}
                          </button>
                        </div>
                      ))}
                    </div>

                    {fileDiff && (
                      <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-200">
                        {fileDiff.text || t('backups.noDiff')}
                      </pre>
                    )}

                    {/* Moving the project's own branch back is its own decision, off by default:
                        it rewrites git history rather than files, which is not what pressing
                        "restore" in a backup list means anywhere else. */}
                    {headDiffers && (
                      <div className="mt-3">
                        <Toggle
                          checked={resetHead}
                          onChange={setResetHead}
                          label={t('backups.resetProjectHead', { commit: snapshot.projectHead?.slice(0, 7) })}
                        />
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('backups.resetProjectHeadHint')}</p>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button onClick={() => restoreAction.run('all')} disabled={restoreAction.pending}>
                        {t('backups.restoreAll')}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => restoreAction.run('selected')}
                        disabled={restoreAction.pending || selected.size === 0}
                      >
                        {t('backups.restoreSelected', { count: selected.size })}
                      </Button>
                    </div>
                  </>
                )}

                <div className="mt-3 flex flex-wrap gap-2 border-t border-black/[0.06] pt-3 dark:border-white/10">
                  <Button variant="ghost" onClick={() => exportAction.run(snapshot.id)} disabled={exportAction.pending}>
                    {t('backups.export')}
                  </Button>
                  <Button variant="danger" onClick={() => deleteAction.run(snapshot.id)} disabled={deleteAction.pending}>
                    {t('backups.delete')}
                  </Button>
                </div>
              </div>
            )}
          </SnapshotRow>
        ))}
      </div>

      {/* Not a backup and no longer presented as one: these are the content folders that were
          moved aside when the content source was switched. Keeping them reachable matters - it is
          the only way back to a folder the user replaced - but a symlinked vault was never copied
          here, which is exactly what the old "Backups -> Inhalte" tab implied. */}
      {contentFolders.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold">{t('backups.movedFoldersHeading')}</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('backups.movedFoldersHint')}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
            {contentFolders.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-md border border-black/[0.06] px-2.5 py-1.5 dark:border-white/10"
              >
                {/* A recorded symlink and a real copy of a folder are worlds apart on disk, and
                    the row now has a delete button - so it says which one this is and what it
                    costs rather than leaving that to a timestamp. */}
                <div className="min-w-0">
                  <p className="truncate text-sm">{new Date(entry.createdAt).toLocaleString(i18n.language)}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {entry.kind === 'link'
                      ? t('backups.folderLink', { target: entry.target ?? '?' })
                      : t('backups.folderSize', {
                          count: entry.fileCount,
                          size: formatBytes(entry.sizeBytes, i18n.language)
                        })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                  <Button variant="ghost" onClick={() => restoreFolderAction.run(entry)} disabled={restoreFolderAction.pending}>
                    {t('backups.restore')}
                  </Button>
                  <Button variant="danger" onClick={() => deleteFolderAction.run(entry)} disabled={deleteFolderAction.pending}>
                    {t('backups.delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {(restoreFolderAction.error ?? deleteFolderAction.error) && (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-red-600 dark:text-red-400">
              {restoreFolderAction.error ?? deleteFolderAction.error}
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
