import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, FolderClock, History, Trash2 } from 'lucide-react'
import { confirmDialog } from '../utils/confirm'
import { useProject } from './ProjectLayout'
import type { BackupEntry, Snapshot, SnapshotFileChange, SnapshotSettings } from '@shared/ipc-contract'
import { Badge, Button, Card, CardHeading, DetailLayout, IconButton, InfoNote, PageHeader, SelectableRow, TextInput, Toggle } from '../components/ui'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { formatBytes } from '../utils/format'
import { useStickyState } from '../state/uiState'
import { TAB_ICONS } from './navConfig'
import HandbookLink from '../components/HandbookLink'

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
    const question = mode === 'selected' ? t('backups.confirmRestoreFiles', { count: paths?.length ?? 0 }) : t('backups.confirmRestoreAll')
    if (!(await confirmDialog({ text: question, confirmLabel: t('backups.confirmRestoreAction'), danger: true }))) return
    const result = await window.quartzGui.snapshots.restore(project.path, openId, { paths, resetProjectHead: resetHead })
    setMessage(result.success ? t('backups.restored') : result.output)
    setOpenId(null)
    await reload()
  })

  const deleteAction = useAsyncAction(async (id: string) => {
    if (!(await confirmDialog({ text: t('backups.confirmDelete'), confirmLabel: t('backups.confirmDeleteAction'), danger: true }))) return
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
    if (!(await confirmDialog({ text: t('backups.confirmRestoreFolder'), confirmLabel: t('backups.confirmRestoreFolderAction'), danger: true }))) return
    await window.quartzGui.backups.restoreContentFolder(project.path, entry.id)
    await reload()
  })

  // The list only ever grew - and every restore adds to it, since restoring moves the current
  // folder aside first. Nothing else in the app deletes these, and a snapshot does not hold them.
  const deleteFolderAction = useAsyncAction(async (entry: BackupEntry) => {
    if (
      !(await confirmDialog({
        text: t('backups.confirmDeleteFolder', { size: formatBytes(entry.sizeBytes, i18n.language) }),
        confirmLabel: t('backups.confirmDeleteFolderAction'),
        danger: true
      }))
    )
      return
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

  const whenOf = (snapshot: Snapshot): string => new Date(snapshot.createdAt).toLocaleString(i18n.language)

  const panel = openSnapshot ? (
    <Card key={openSnapshot.id} className="flex flex-col gap-3">
      <CardHeading icon={History}>{openSnapshot.label || whenOf(openSnapshot)}</CardHeading>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={openSnapshot.kind === 'manual' ? 'green' : 'slate'}>{t(`backups.kinds.${openSnapshot.kind}`)}</Badge>
        {openSnapshot.label && <span className="text-ui text-text-secondary">{whenOf(openSnapshot)}</span>}
      </div>

      {changes === null && <p className="text-xs text-text-muted">{t('backups.comparing')}</p>}
      {changes?.length === 0 && <p className="text-xs text-text-muted">{t('backups.identical')}</p>}
      {/* Genau hier ist der Irrtum entstanden, über den der Alpha-Test stolperte: eine geänderte
          Notiz im Vault taucht im Vergleich nie auf, und ohne diese Zeile liest sich das als
          "nichts hat sich geändert". */}
      {changes !== null && settings?.contentIsSymlink && <p className="text-xs text-text-muted">{t('backups.vaultNotCompared')}</p>}
      {changes && changes.length > 0 && (
        <>
          <p className="text-xs text-text-muted">{t('backups.changeCount', { count: changes.length })}</p>
          <div className="max-h-80 overflow-y-auto rounded-md border border-ink/[0.06] dark:border-ink/10">
            {changes.map((change) => (
              <div
                key={change.path}
                className="flex items-center gap-2 border-b border-ink/[0.04] px-2.5 py-1 last:border-b-0 dark:border-ink/5"
              >
                <input type="checkbox" checked={selected.has(change.path)} onChange={() => toggleFile(change.path)} aria-label={change.path} />
                <span className="w-24 shrink-0 text-xs text-text-muted">{t(`backups.status.${change.status}`)}</span>
                <button
                  type="button"
                  className={`min-w-0 flex-1 truncate text-left font-mono text-xs hover:underline ${
                    fileDiff?.path === change.path ? 'font-semibold' : ''
                  }`}
                  onClick={() => fileDiffAction.run(change.path)}
                  disabled={change.status !== 'modified'}
                  title={change.path}
                >
                  {change.path}
                </button>
              </div>
            ))}
          </div>

          {fileDiff && (
            <pre className="max-h-80 overflow-auto rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-200">
              {fileDiff.text || t('backups.noDiff')}
            </pre>
          )}

          {/* Moving the project's own branch back is its own decision, off by default: it
              rewrites git history rather than files, which is not what pressing "restore" in a
              backup list means anywhere else. */}
          {headDiffers && (
            <div>
              <Toggle
                checked={resetHead}
                onChange={setResetHead}
                label={t('backups.resetProjectHead', { commit: openSnapshot.projectHead?.slice(0, 7) })}
              />
              <p className="mt-1 text-xs text-text-muted">{t('backups.resetProjectHeadHint')}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => restoreAction.run('all')} disabled={restoreAction.pending}>
              {t('backups.restoreAll')}
            </Button>
            <Button variant="ghost" onClick={() => restoreAction.run('selected')} disabled={restoreAction.pending || selected.size === 0}>
              {t('backups.restoreSelected', { count: selected.size })}
            </Button>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-2 border-t border-ink/[0.06] pt-3 dark:border-ink/10">
        <Button variant="ghost" onClick={() => exportAction.run(openSnapshot.id)} disabled={exportAction.pending}>
          {t('backups.export')}
        </Button>
      </div>
    </Card>
  ) : (
    <Card className="flex flex-col gap-3">
      <CardHeading icon={History}>{t('backups.panelEmptyTitle')}</CardHeading>
      <p className="text-ui text-text-secondary">{t('backups.panelEmptyText')}</p>
      {snapshots && snapshots.length > 0 && (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-ui">
          <dt className="text-text-secondary">{t('backups.summaryCount')}</dt>
          <dd className="text-text">
            {t('backups.summaryCountValue', { count: snapshots.length, manual: snapshots.filter((s) => s.kind === 'manual').length })}
          </dd>
          <dt className="text-text-secondary">{t('backups.summaryNewest')}</dt>
          <dd className="text-text">{whenOf(snapshots[0])}</dd>
          <dt className="text-text-secondary">{t('backups.summaryOldest')}</dt>
          <dd className="text-text">{whenOf(snapshots[snapshots.length - 1])}</dd>
          {settings && (
            <>
              <dt className="text-text-secondary">{t('backups.summaryContent')}</dt>
              <dd className="text-text">
                {!settings.contentExists
                  ? t('backups.summaryContentMissing')
                  : settings.contentIsSymlink
                    ? t('backups.summaryContentVault')
                    : settings.includeContent
                      ? t('backups.summaryContentIncluded')
                      : t('backups.summaryContentExcluded')}
              </dd>
            </>
          )}
        </dl>
      )}
    </Card>
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        handbook={<HandbookLink page="snapshots" />}
        icon={TAB_ICONS.backups}
        title={t('projectLayout.tabs.backups')}
        description={t('projectLayout.descriptions.backups')}
      />

      <DetailLayout panelWidth="wide" panel={panel} panelLabel={t('backups.panelLabel')} onDismiss={() => setOpenId(null)}>

        {/* Both this page and Git-Sync keep old versions of the project, and nothing said how they
            differ. They are not alternatives: one is private to this machine, the other is what
            leaves it. */}
        <InfoNote>{t('backups.vsGitSync')}</InfoNote>

        <Card>
          <CardHeading icon={Camera}>{t('backups.newHeading')}</CardHeading>
          <p className="mt-1 text-xs text-text-muted">{t('backups.newHint')}</p>
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
            <div className="mt-4 border-t border-ink/[0.06] pt-3 dark:border-ink/10">
              {/* Bei einem Symlink ist das kein Vorgabewert, sondern eine Tatsache: git folgt keinem
                  Symlink, im Snapshot landet die Verknüpfung statt der Notizen. Der Schalter ist
                  deshalb aus und deaktiviert - lesbar, nicht ausgegraut (siehe CLAUDE.md), und der
                  Satz darunter sagt den Grund. */}
              <Toggle
                checked={settings.includeContent}
                onChange={(checked) => settingsAction.run(checked)}
                label={t('backups.includeContent')}
                disabled={settingsAction.pending || !settings.contentExists || settings.contentIsSymlink}
              />
              <p className="mt-1 text-xs text-text-muted">
                {!settings.contentExists
                  ? t('backups.contentMissing')
                  : settings.contentIsSymlink
                    ? t('backups.contentSymlinkHint')
                    : t('backups.contentFolderHint')}
              </p>
            </div>
          )}
        </Card>

        {message && <p className="whitespace-pre-wrap break-words text-sm text-text-secondary">{message}</p>}
        {error && <p className="whitespace-pre-wrap break-words text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Card className="flex flex-col gap-3">
          <CardHeading icon={History}>{t('backups.listTitle', { count: snapshots?.length ?? 0 })}</CardHeading>
          {snapshots === null && <p className="text-sm text-text-muted">{t('common.loading')}</p>}
          {snapshots?.length === 0 && <p className="text-sm text-text-muted">{t('backups.none')}</p>}
          {!!snapshots?.length && (
            <ul className="flex flex-col gap-1.5">
              {snapshots.map((snapshot) => {
                const when = whenOf(snapshot)
                return (
                  <SelectableRow
                    key={snapshot.id}
                    selected={openId === snapshot.id}
                    onSelect={() => setOpenId(snapshot.id)}
                    title={snapshot.label || when}
                    subtitle={snapshot.label ? when : undefined}
                    trailing={
                      <>
                        <Badge tone={snapshot.kind === 'manual' ? 'green' : 'slate'}>{t(`backups.kinds.${snapshot.kind}`)}</Badge>
                        <IconButton
                          icon={Trash2}
                          title={t('common.deleteNamed', { name: snapshot.label || when })}
                          onClick={() => deleteAction.run(snapshot.id)}
                          disabled={deleteAction.pending}
                        />
                      </>
                    }
                  />
                )
              })}
            </ul>
          )}
        </Card>

        {/* Not a backup and no longer presented as one: these are the content folders that were
            moved aside when the content source was switched. Keeping them reachable matters - it is
            the only way back to a folder the user replaced - but a symlinked vault was never copied
            here, which is exactly what the old "Backups -> Inhalte" tab implied. */}
        {contentFolders.length > 0 && (
          <Card>
            <CardHeading icon={FolderClock}>{t('backups.movedFoldersHeading')}</CardHeading>
            <p className="mt-1 text-xs text-text-muted">{t('backups.movedFoldersHint')}</p>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 2xl:grid-cols-3">
              {contentFolders.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-ink/[0.06] px-2.5 py-1.5 dark:border-ink/10"
                >
                  {/* A recorded symlink and a real copy of a folder are worlds apart on disk, and
                      the row now has a delete button - so it says which one this is and what it
                      costs rather than leaving that to a timestamp. */}
                  <div className="min-w-0">
                    <p className="truncate text-sm">{new Date(entry.createdAt).toLocaleString(i18n.language)}</p>
                    <p className="truncate text-xs text-text-muted">
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
                    <IconButton
                      icon={Trash2}
                      title={t('common.deleteNamed', { name: new Date(entry.createdAt).toLocaleString(i18n.language) })}
                      onClick={() => deleteFolderAction.run(entry)}
                      disabled={deleteFolderAction.pending}
                    />
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
      </DetailLayout>
    </div>
  )
}
