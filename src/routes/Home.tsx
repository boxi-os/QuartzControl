import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppStore } from '../state/store'
import { Button, Card, Field, Select, TextInput } from '../components/ui'
import type { CreateProjectOptions } from '@shared/ipc-contract'

const TEMPLATES: NonNullable<CreateProjectOptions['template']>[] = ['default', 'obsidian', 'ttrpg', 'blog']
const STRATEGIES: NonNullable<CreateProjectOptions['strategy']>[] = ['new', 'copy', 'symlink']

export default function Home(): JSX.Element {
  const { projects, loadProjects, addProject, removeProject } = useAppStore()
  const [showWizard, setShowWizard] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  async function openExisting(): Promise<void> {
    const folder = await window.quartzGui.dialog.pickFolder()
    if (!folder) return
    const project = await addProject(folder)
    navigate(`/project/${project.id}`)
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="titlebar-drag h-12 shrink-0" />
      <div className="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-6 pb-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Quartz GUI</h1>
          <Link to="/settings" className="text-[13px] text-slate-500 hover:text-slate-900 dark:hover:text-white">
            Einstellungen
          </Link>
        </div>

        <div className="mb-6 flex gap-3">
          <Button onClick={openExisting}>Vorhandenes Projekt öffnen</Button>
          <Button variant="ghost" onClick={() => setShowWizard(true)}>
            Neues Projekt erstellen
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {projects.length === 0 && <p className="text-sm text-slate-500">Noch keine Projekte hinzugefügt.</p>}
          {projects.map((project) => (
            <Card key={project.id} className="flex items-center justify-between">
              <div>
                <button
                  className="text-left text-[15px] font-medium hover:underline"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  {project.name}
                </button>
                <p className="text-xs text-slate-400">{project.path}</p>
              </div>
              <Button variant="ghost" onClick={() => removeProject(project.id)}>
                Entfernen
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {showWizard && (
        <CreateWizard
          busy={busy}
          error={error}
          onCancel={() => setShowWizard(false)}
          onCreate={async (options) => {
            setBusy(true)
            setError(null)
            const result = await window.quartzGui.projects.create(options)
            setBusy(false)
            if (!result.success) {
              setError(result.output || 'Projekt konnte nicht erstellt werden.')
              return
            }
            await loadProjects()
            const created = useAppStore.getState().projects.find((p) => p.path === options.targetDirectory)
            setShowWizard(false)
            if (created) navigate(`/project/${created.id}`)
          }}
        />
      )}
    </div>
  )
}

function CreateWizard({
  busy,
  error,
  onCancel,
  onCreate
}: {
  busy: boolean
  error: string | null
  onCancel: () => void
  onCreate: (options: CreateProjectOptions) => void
}): JSX.Element {
  const [targetDirectory, setTargetDirectory] = useState('')
  const [template, setTemplate] = useState<NonNullable<CreateProjectOptions['template']>>('default')
  const [source, setSource] = useState('')
  const [strategy, setStrategy] = useState<NonNullable<CreateProjectOptions['strategy']>>('new')
  const [linkResolution, setLinkResolution] = useState<NonNullable<CreateProjectOptions['linkResolution']>>('shortest')
  const [baseUrl, setBaseUrl] = useState('')

  async function pickTarget(): Promise<void> {
    const folder = await window.quartzGui.dialog.pickFolder()
    if (folder) setTargetDirectory(folder)
  }

  async function pickSource(): Promise<void> {
    const folder = await window.quartzGui.dialog.pickFolder()
    if (folder) setSource(folder)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-6 backdrop-blur-sm">
      <Card className="w-full max-w-lg">
        <h2 className="mb-4 text-lg font-semibold">Neues Quartz-Projekt</h2>
        <div className="flex flex-col gap-3">
          <Field label="Zielverzeichnis">
            <div className="flex gap-2">
              <TextInput value={targetDirectory} onChange={(e) => setTargetDirectory(e.target.value)} className="flex-1" />
              <Button variant="ghost" onClick={pickTarget}>
                Auswählen
              </Button>
            </div>
          </Field>

          <Field label="Template">
            <Select value={template} onChange={(e) => setTemplate(e.target.value as typeof template)}>
              {TEMPLATES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Content-Strategie">
            <Select value={strategy} onChange={(e) => setStrategy(e.target.value as typeof strategy)}>
              <option value="new">Neu (leerer Ordner)</option>
              <option value="copy">Kopieren (echter Ordner)</option>
              <option value="symlink">Verknüpfen (symbolischer Link)</option>
            </Select>
          </Field>

          {strategy !== 'new' && (
            <Field label="Quellordner (z. B. Obsidian-Vault)">
              <div className="flex gap-2">
                <TextInput value={source} onChange={(e) => setSource(e.target.value)} className="flex-1" />
                <Button variant="ghost" onClick={pickSource}>
                  Auswählen
                </Button>
              </div>
            </Field>
          )}

          <Field label="Link-Auflösung">
            <Select value={linkResolution} onChange={(e) => setLinkResolution(e.target.value as typeof linkResolution)}>
              <option value="shortest">Kürzeste (wie Obsidian)</option>
              <option value="absolute">Absolut</option>
              <option value="relative">Relativ</option>
            </Select>
          </Field>

          <Field label="Base URL (optional)">
            <TextInput value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="example.com" />
          </Field>

          {error && (
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-red-50 p-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </pre>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={busy}>
              Abbrechen
            </Button>
            <Button
              disabled={busy || !targetDirectory || (strategy !== 'new' && !source)}
              onClick={() =>
                onCreate({
                  targetDirectory,
                  template,
                  strategy,
                  linkResolution,
                  source: strategy === 'new' ? undefined : source,
                  baseUrl: baseUrl || undefined
                })
              }
            >
              {busy ? 'Erstelle… (Klonen + npm install kann etwas dauern)' : 'Erstellen'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
