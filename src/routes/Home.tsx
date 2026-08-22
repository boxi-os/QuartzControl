import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router-dom'
import { useAppStore } from '../state/store'
import { Button, Card, Field, Select, TextInput } from '../components/ui'
import type { CreateProjectOptions } from '@shared/ipc-contract'
import appIcon from '../assets/app-icon.png'

const TEMPLATES: NonNullable<CreateProjectOptions['template']>[] = ['default', 'obsidian', 'ttrpg', 'blog']
const STRATEGIES: NonNullable<CreateProjectOptions['strategy']>[] = ['new', 'copy', 'symlink']

export default function Home(): JSX.Element {
  const { t } = useTranslation()
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
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <img src={appIcon} alt="" className="h-14 w-14 rounded-2xl shadow-sm" />
            <div>
              <h1 className="text-2xl font-semibold">QuartzControl</h1>
              <p className="mt-0.5 max-w-md text-[13px] text-slate-500 dark:text-slate-400">{t('home.subtitle')}</p>
            </div>
          </div>
          <Link
            to="/settings"
            className="shrink-0 pt-1 text-[13px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            {t('home.settings')}
          </Link>
        </div>

        <div className="mb-6 flex gap-3">
          <Button onClick={openExisting}>{t('home.openExisting')}</Button>
          <Button variant="ghost" onClick={() => setShowWizard(true)}>
            {t('home.createNew')}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {projects.length === 0 && <p className="text-sm text-slate-500">{t('home.noProjects')}</p>}
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
                {t('common.remove')}
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
              setError(result.output || t('home.wizard.createFailed'))
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
  const { t } = useTranslation()
  const [targetDirectory, setTargetDirectory] = useState('')
  const [template, setTemplate] = useState<NonNullable<CreateProjectOptions['template']>>('default')
  const [source, setSource] = useState('')
  const [strategy, setStrategy] = useState<NonNullable<CreateProjectOptions['strategy']>>('new')
  const [linkResolution, setLinkResolution] = useState<NonNullable<CreateProjectOptions['linkResolution']>>('shortest')
  const [baseUrl, setBaseUrl] = useState('localhost')

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
        <h2 className="mb-4 text-lg font-semibold">{t('home.wizard.title')}</h2>
        <div className="flex flex-col gap-3">
          <Field label={t('home.wizard.targetDirectory')}>
            <div className="flex gap-2">
              <TextInput value={targetDirectory} onChange={(e) => setTargetDirectory(e.target.value)} className="flex-1" />
              <Button variant="ghost" onClick={pickTarget}>
                {t('common.select')}
              </Button>
            </div>
          </Field>

          <Field label={t('home.wizard.template')}>
            <Select value={template} onChange={(e) => setTemplate(e.target.value as typeof template)}>
              {TEMPLATES.map((tpl) => (
                <option key={tpl} value={tpl}>
                  {tpl}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('home.wizard.contentStrategy')}>
            <Select value={strategy} onChange={(e) => setStrategy(e.target.value as typeof strategy)}>
              <option value="new">{t('home.wizard.strategyNew')}</option>
              <option value="copy">{t('home.wizard.strategyCopy')}</option>
              <option value="symlink">{t('home.wizard.strategySymlink')}</option>
            </Select>
          </Field>

          {strategy !== 'new' && (
            <Field label={t('home.wizard.sourceFolder')}>
              <div className="flex gap-2">
                <TextInput value={source} onChange={(e) => setSource(e.target.value)} className="flex-1" />
                <Button variant="ghost" onClick={pickSource}>
                  {t('common.select')}
                </Button>
              </div>
            </Field>
          )}

          <Field label={t('home.wizard.linkResolution')}>
            <Select value={linkResolution} onChange={(e) => setLinkResolution(e.target.value as typeof linkResolution)}>
              <option value="shortest">{t('home.wizard.linkShortest')}</option>
              <option value="absolute">{t('home.wizard.linkAbsolute')}</option>
              <option value="relative">{t('home.wizard.linkRelative')}</option>
            </Select>
          </Field>

          <Field label={t('home.wizard.baseUrl')}>
            <TextInput value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="example.com" />
          </Field>

          {error && (
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-red-50 p-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </pre>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={busy}>
              {t('common.cancel')}
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
              {busy ? t('home.wizard.creating') : t('home.wizard.create')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
