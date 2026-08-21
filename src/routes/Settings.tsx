import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../state/store'
import { Button, Card, Field, TextInput } from '../components/ui'

export default function Settings(): JSX.Element {
  const { settings, loadSettings, saveSettings } = useAppStore()
  const [githubToken, setGithubToken] = useState('')
  const [defaultProjectDirectory, setDefaultProjectDirectory] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    setGithubToken(settings.githubToken ?? '')
    setDefaultProjectDirectory(settings.defaultProjectDirectory ?? '')
  }, [settings])

  async function pickDefaultDirectory(): Promise<void> {
    const folder = await window.quartzGui.dialog.pickFolder()
    if (folder) setDefaultProjectDirectory(folder)
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/" className="text-sm text-slate-500 hover:text-slate-800">
        ← Zurück
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-semibold">Einstellungen</h1>

      <Card className="flex flex-col gap-4">
        <Field label="GitHub-Token (für Marktplatz-Rate-Limit)">
          <TextInput
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            placeholder="ghp_…"
          />
        </Field>

        <Field label="Standard-Projektverzeichnis">
          <div className="flex gap-2">
            <TextInput
              value={defaultProjectDirectory}
              onChange={(e) => setDefaultProjectDirectory(e.target.value)}
              className="flex-1"
            />
            <Button variant="ghost" onClick={pickDefaultDirectory}>
              Auswählen
            </Button>
          </div>
        </Field>

        <div className="flex items-center gap-3">
          <Button
            onClick={async () => {
              await saveSettings({ githubToken: githubToken || undefined, defaultProjectDirectory: defaultProjectDirectory || undefined })
              setSaved(true)
              setTimeout(() => setSaved(false), 2000)
            }}
          >
            Speichern
          </Button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400">Gespeichert.</span>}
        </div>
      </Card>
    </div>
  )
}
