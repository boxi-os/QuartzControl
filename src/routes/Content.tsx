import { useEffect, useState } from 'react'
import { useProject } from './ProjectLayout'
import type { ContentProgress, ContentStatus, ContentStrategy } from '@shared/ipc-contract'
import { Badge, Button, Card, Field, Select, TextInput } from '../components/ui'

export default function Content(): JSX.Element {
  const project = useProject()
  const [status, setStatus] = useState<ContentStatus | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [source, setSource] = useState('')
  const [strategy, setStrategy] = useState<ContentStrategy>('symlink')
  const [progress, setProgress] = useState<ContentProgress | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reload(): Promise<void> {
    setStatus(await window.quartzGui.content.status(project.path))
  }

  useEffect(() => {
    reload()
    return window.quartzGui.content.onProgress((p) => {
      if (p.projectId === project.id) setProgress(p)
    })
  }, [project.id, project.path])

  async function pickSource(): Promise<void> {
    const folder = await window.quartzGui.dialog.pickFolder()
    if (folder) setSource(folder)
  }

  async function apply(): Promise<void> {
    setBusy(true)
    setError(null)
    setProgress(null)
    try {
      await window.quartzGui.content.change(project.id, project.path, source, strategy)
      setShowDialog(false)
      setSource('')
      await reload()
    } catch (err) {
      setError(String(err))
    }
    setBusy(false)
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <h2 className="mb-3 font-medium">Aktueller Content-Ordner</h2>
        {!status && <p className="text-sm text-slate-500">Lade…</p>}
        {status && !status.exists && <p className="text-sm text-amber-600">Kein content/-Ordner gefunden.</p>}
        {status?.exists && (
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center gap-2">
              <Badge tone={status.isSymlink ? (status.targetExists ? 'slate' : 'red') : 'green'}>
                {status.isSymlink ? 'Symbolischer Link' : 'Echter Ordner'}
              </Badge>
              {status.fileCount != null && <span className="text-slate-500">{status.fileCount} Dateien</span>}
            </div>
            <p className="text-slate-500">{status.path}</p>
            {status.isSymlink && (
              <p className={status.targetExists ? 'text-slate-500' : 'text-red-600'}>
                → {status.symlinkTarget}
                {!status.targetExists && ' (Ziel existiert nicht)'}
              </p>
            )}
          </div>
        )}
        <Button className="mt-4" variant="ghost" onClick={() => setShowDialog(true)}>
          Quelle ändern…
        </Button>
      </Card>

      {showDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-6">
          <Card className="w-full max-w-lg">
            <h3 className="mb-1 text-lg font-semibold">Content-Quelle ändern</h3>
            <p className="mb-4 text-sm text-amber-700">
              Der aktuelle content/-Ordner wird vor der Änderung nach .quartz-gui/content-backups/ verschoben und kann
              über die Backups-Ansicht wiederhergestellt werden.
            </p>
            <div className="flex flex-col gap-3">
              <Field label="Neuer Quellordner">
                <div className="flex gap-2">
                  <TextInput value={source} onChange={(e) => setSource(e.target.value)} className="flex-1" />
                  <Button variant="ghost" onClick={pickSource}>
                    Auswählen
                  </Button>
                </div>
              </Field>
              <Field label="Strategie">
                <Select value={strategy} onChange={(e) => setStrategy(e.target.value as ContentStrategy)}>
                  <option value="symlink">Verknüpfen (symbolischer Link, z. B. auf ein Obsidian-Vault)</option>
                  <option value="copy">Kopieren (echter Ordner)</option>
                </Select>
              </Field>

              {progress && (
                <p className="text-sm text-slate-500">
                  {progress.processed} / {progress.total} Dateien kopiert…
                </p>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="mt-2 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowDialog(false)} disabled={busy}>
                  Abbrechen
                </Button>
                <Button onClick={apply} disabled={busy || !source}>
                  {busy ? 'Wird angewendet…' : 'Übernehmen'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
