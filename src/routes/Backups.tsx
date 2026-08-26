import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from './ProjectLayout'
import type { BackupEntry } from '@shared/ipc-contract'
import { Button, Card, PageHeader, SegmentedControl } from '../components/ui'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { useStickyState } from '../state/uiState'
import { TAB_ICONS } from './navConfig'

export default function Backups(): JSX.Element {
  const { t, i18n } = useTranslation()
  const project = useProject()
  const [kind, setKind] = useStickyState<'config' | 'content'>('backups.kind', 'config')
  const [entries, setEntries] = useState<BackupEntry[]>([])
  const [diff, setDiff] = useState<{ id: string; text: string } | null>(null)

  async function reload(): Promise<void> {
    setEntries(await window.quartzGui.backups.list(project.path, kind))
  }

  useEffect(() => {
    setDiff(null)
    reload()
  }, [project.path, kind])

  const diffAction = useAsyncAction(async (entry: BackupEntry) => {
    const text = await window.quartzGui.backups.diff(project.path, entry.id)
    setDiff({ id: entry.id, text })
  })

  // A restore can fail for real reasons - a content backup whose directory a previous restore
  // already consumed, for one - so the row must come back out of its disabled state and say so.
  const restoreAction = useAsyncAction(async (entry: BackupEntry) => {
    await window.quartzGui.backups.restore(project.path, kind, entry.id)
    await reload()
  })

  async function restore(entry: BackupEntry): Promise<void> {
    if (!confirm(t('backups.confirmRestore'))) return
    await restoreAction.run(entry)
  }

  return (
    <div>
      <PageHeader
        icon={TAB_ICONS.backups}
        title={t('projectLayout.tabs.backups')}
        description={t('projectLayout.descriptions.backups')}
      />
      <div className="mb-6">
        <SegmentedControl
          value={kind}
          onChange={setKind}
          options={[
            { value: 'config', label: t('backups.config') },
            { value: 'content', label: t('backups.content') }
          ]}
        />
      </div>

      {(restoreAction.error || diffAction.error) && (
        <p className="mb-3 whitespace-pre-wrap break-words text-sm text-red-600 dark:text-red-400">
          {restoreAction.error ?? diffAction.error}
        </p>
      )}

      {/* A backup is a timestamp and two buttons - a single full-width row would be almost entirely
          empty space, so width buys columns instead. The one exception is the entry whose diff is
          open: that pane is the one thing here that genuinely wants the whole window. */}
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {entries.length === 0 && <p className="text-sm text-slate-500">{t('backups.none')}</p>}
        {entries.map((entry) => (
          <Card key={entry.id} className={diff?.id === entry.id ? 'col-span-full' : ''}>
            <div className="flex items-center justify-between">
              <p className="text-sm">{new Date(entry.createdAt).toLocaleString(i18n.language)}</p>
              <div className="flex gap-2">
                {kind === 'config' && (
                  <Button variant="ghost" onClick={() => diffAction.run(entry)} disabled={diffAction.pending}>
                    {t('backups.viewDiff')}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => restore(entry)} disabled={restoreAction.pending}>
                  {t('backups.restore')}
                </Button>
              </div>
            </div>
            {diff?.id === entry.id && (
              <pre className="mt-3 max-h-72 overflow-y-auto rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-200">
                {diff.text || t('backups.noDiff')}
              </pre>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
