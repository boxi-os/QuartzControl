import { useState } from 'react'
import { useProject } from './ProjectLayout'
import { Button, Card } from '../components/ui'

export default function GitSync(): JSX.Element {
  const project = useProject()
  const [busy, setBusy] = useState<'push' | 'pull' | 'both' | null>(null)
  const [output, setOutput] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean | null>(null)

  async function run(direction: 'push' | 'pull' | 'both'): Promise<void> {
    setBusy(direction)
    setOutput(null)
    const result = await window.quartzGui.sync.run(project.path, direction)
    setBusy(null)
    setSuccess(result.success)
    setOutput(result.output)
  }

  return (
    <div className="max-w-3xl">
      <Card>
        <h2 className="mb-3 font-medium">Git-Sync</h2>
        <div className="mb-4 flex gap-2">
          <Button onClick={() => run('pull')} disabled={busy !== null}>
            {busy === 'pull' ? 'Pull läuft…' : 'Pull'}
          </Button>
          <Button onClick={() => run('push')} disabled={busy !== null}>
            {busy === 'push' ? 'Push läuft…' : 'Push'}
          </Button>
          <Button variant="ghost" onClick={() => run('both')} disabled={busy !== null}>
            {busy === 'both' ? 'Sync läuft…' : 'Push + Pull'}
          </Button>
        </div>
        {output != null && (
          <div>
            <p className={`mb-2 text-sm ${success ? 'text-green-600' : 'text-red-600'}`}>
              {success ? 'Erfolgreich.' : 'Fehlgeschlagen.'}
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
