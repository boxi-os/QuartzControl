import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from './ProjectLayout'
import type { BackupEntry } from '@shared/ipc-contract'
import { Button, Card, SegmentedControl } from '../components/ui'

export default function Backups(): JSX.Element {
  const { t, i18n } = useTranslation()
  const project = useProject()
  const [kind, setKind] = useState<'config' | 'content'>('config')
  const [entries, setEntries] = useState<BackupEntry[]>([])
  const [diff, setDiff] = useState<{ id: string; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function reload(): Promise<void> {
    setEntries(await window.quartzGui.backups.list(project.path, kind))
  }

  useEffect(() => {
    setDiff(null)
    reload()
  }, [project.path, kind])

  async function showDiff(entry: BackupEntry): Promise<void> {
    const text = await window.quartzGui.backups.diff(project.path, entry.id)
    setDiff({ id: entry.id, text })
  }

  async function restore(entry: BackupEntry): Promise<void> {
    if (!confirm(t('backups.confirmRestore'))) return
    setBusy(true)
    await window.quartzGui.backups.restore(project.path, kind, entry.id)
    setBusy(false)
    await reload()
  }

  return (
    <div className="max-w-3xl">
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

      <div className="flex flex-col gap-3">
        {entries.length === 0 && <p className="text-sm text-slate-500">{t('backups.none')}</p>}
        {entries.map((entry) => (
          <Card key={entry.id}>
            <div className="flex items-center justify-between">
              <p className="text-sm">{new Date(entry.createdAt).toLocaleString(i18n.language)}</p>
              <div className="flex gap-2">
                {kind === 'config' && (
                  <Button variant="ghost" onClick={() => showDiff(entry)}>
                    {t('backups.viewDiff')}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => restore(entry)} disabled={busy}>
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
