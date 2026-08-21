import { useEffect, useState } from 'react'
import { useProject } from './ProjectLayout'
import type { BackupEntry } from '@shared/ipc-contract'
import { Button, Card } from '../components/ui'

export default function Backups(): JSX.Element {
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
    if (!confirm('Diesen Stand wiederherstellen? Der aktuelle Stand wird vorher gesichert.')) return
    setBusy(true)
    await window.quartzGui.backups.restore(project.path, kind, entry.id)
    setBusy(false)
    await reload()
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex gap-1">
        {(['config', 'content'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              kind === k ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {k === 'config' ? 'Konfiguration' : 'Content-Ordner'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {entries.length === 0 && <p className="text-sm text-slate-500">Keine Backups vorhanden.</p>}
        {entries.map((entry) => (
          <Card key={entry.id}>
            <div className="flex items-center justify-between">
              <p className="text-sm">{new Date(entry.createdAt).toLocaleString('de-DE')}</p>
              <div className="flex gap-2">
                {kind === 'config' && (
                  <Button variant="ghost" onClick={() => showDiff(entry)}>
                    Diff ansehen
                  </Button>
                )}
                <Button variant="ghost" onClick={() => restore(entry)} disabled={busy}>
                  Wiederherstellen
                </Button>
              </div>
            </div>
            {diff?.id === entry.id && (
              <pre className="mt-3 max-h-72 overflow-y-auto rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-200">
                {diff.text || 'Keine Unterschiede.'}
              </pre>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
