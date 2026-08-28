import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { titlebarStripClass } from '../utils/platform'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2, FolderSearch, Search, TriangleAlert, Trash2 } from 'lucide-react'
import type { CreateProjectOptions, EnvironmentInfo, ProjectOverview } from '@shared/ipc-contract'
import { useAppStore } from '../state/store'
import { Button, Card, Field, Select, TextInput } from '../components/ui'
import { GROUP_ICONS } from './navConfig'
import { formatRelativeTime } from '../utils/format'
import { useAsyncAction } from '../hooks/useAsyncAction'
import appIcon from '../assets/app-icon.png'

const TEMPLATES: NonNullable<CreateProjectOptions['template']>[] = ['default', 'obsidian', 'ttrpg', 'blog']

// Two external links, opened through dialog.openExternal (https only, validated in main) rather
// than an <a target="_blank"> relying on the window-open handler - an explicit, allow-listed
// channel is the same treatment dialog.openPath already gets.
const QUARTZ_DOCS = 'https://quartz.jzhao.xyz/'
const PLUGIN_CATALOG = 'https://github.com/quartz-community'

// The search box appears only once the list is long enough to need one - below that it is a
// control that costs a row and saves nothing.
const SEARCH_THRESHOLD = 6

export default function Home(): JSX.Element {
  const { t, i18n } = useTranslation()
  const { settings, loadSettings, removeProject } = useAppStore()
  const [projects, setProjects] = useState<ProjectOverview[] | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [environment, recheckEnvironment] = useEnvironment()
  const navigate = useNavigate()

  const reload = useCallback(async () => {
    setProjects(await window.quartzGui.projects.overview())
  }, [])

  useEffect(() => {
    void reload()
    void loadSettings()
  }, [reload, loadSettings])

  // Most recently opened first, never-opened last, and a stable name order within each group -
  // the list used to be in insertion order, so `lastOpenedAt` was written on every project open
  // and then read by nobody.
  const sorted = useMemo(() => {
    const list = [...(projects ?? [])]
    list.sort((a, b) => {
      const at = a.lastOpenedAt ? Date.parse(a.lastOpenedAt) : 0
      const bt = b.lastOpenedAt ? Date.parse(b.lastOpenedAt) : 0
      return bt - at || a.name.localeCompare(b.name)
    })
    return list
  }, [projects])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return sorted
    return sorted.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.path.toLowerCase().includes(needle) ||
        (p.siteTitle ?? '').toLowerCase().includes(needle)
    )
  }, [sorted, query])

  // Two columns only once there is a second card to put there - a lone project rendered at half
  // width with an empty column beside it reads as a layout fault rather than as breathing room.
  const listColumns = filtered.length > 1 ? '2xl:grid-cols-2' : ''

  async function openExisting(): Promise<void> {
    const folder = await window.quartzGui.dialog.pickFolder(settings.defaultProjectDirectory)
    if (!folder) return
    const project = await window.quartzGui.projects.add(folder)
    const overview = await window.quartzGui.projects.overview()
    setProjects(overview)
    // A folder that holds no quartz.config.yaml is added but *not* opened: its project page would
    // fail on every fetch, and the row on this page says what is actually wrong with it.
    if (overview.find((p) => p.id === project.id)?.isQuartzProject) navigate(`/project/${project.id}`)
  }

  return (
    <div className="flex h-screen flex-col">
      <div className={titlebarStripClass} />
      {/* Still a centred column, unlike the project pages: this is a launcher, and a start screen
          stretched across a 27" display reads as broken rather than spacious. What the extra width
          buys here is a second column - the projects stay the main thing on the left, and what the
          app can do sits beside them instead of pushing them down the page. */}
      <div className="mx-auto w-full max-w-6xl flex-1 overflow-y-auto px-6 pb-12">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={appIcon} alt="" className="h-14 w-14 rounded-2xl shadow-sm" />
            <div>
              <h1 className="text-2xl font-semibold">QuartzControl</h1>
              <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{t('home.subtitle')}</p>
            </div>
          </div>
          <Link
            to="/settings"
            className="shrink-0 pt-1 text-[13px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            {t('home.settings')}
          </Link>
        </div>

        {environment && <EnvironmentBand info={environment} onRecheck={recheckEnvironment} />}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Button onClick={openExisting}>{t('home.openExisting')}</Button>
              <Button variant="ghost" onClick={() => setShowWizard(true)}>
                {t('home.createNew')}
              </Button>
              {sorted.length >= SEARCH_THRESHOLD && (
                <div className="relative ml-auto">
                  <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <TextInput
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('home.searchPlaceholder')}
                    className="w-56 pl-8"
                  />
                </div>
              )}
            </div>

            {projects === null ? (
              <p className="text-[13px] text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
            ) : sorted.length === 0 ? (
              <GettingStarted onOpen={openExisting} onCreate={() => setShowWizard(true)} />
            ) : (
              <div className={`grid gap-3 ${listColumns}`}>
                {filtered.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    locale={i18n.language}
                    onOpen={() => navigate(`/project/${project.id}`)}
                    onRemove={async () => {
                      if (!confirm(t('home.confirmRemove', { name: project.name }))) return
                      await removeProject(project.id)
                      await reload()
                    }}
                    onRelocated={reload}
                  />
                ))}
                {filtered.length === 0 && (
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">{t('home.noSearchResults')}</p>
                )}
              </div>
            )}
          </div>

          <WhatYouCanDo environment={environment} />
        </div>
      </div>

      {showWizard && (
        <CreateWizard
          busy={busy}
          error={error}
          defaultDirectory={settings.defaultProjectDirectory}
          onCancel={() => setShowWizard(false)}
          onCreate={async (options) => {
            setBusy(true)
            setError(null)
            try {
              const result = await window.quartzGui.projects.create(options)
              if (!result.success) {
                setError(result.output || t('home.wizard.createFailed'))
                return
              }
              const overview = await window.quartzGui.projects.overview()
              setProjects(overview)
              const created = overview.find((p) => p.path === options.targetDirectory)
              setShowWizard(false)
              if (created) navigate(`/project/${created.id}`)
            } finally {
              // Without this the button stays on "Erstelle…" forever when the invoke rejects,
              // which is the failure mode every busy flag in this app resets in a finally.
              setBusy(false)
            }
          }}
        />
      )}
    </div>
  )
}

// ── one project ─────────────────────────────────────────────────────────────────────────────

function ProjectRow({
  project,
  locale,
  onOpen,
  onRemove,
  onRelocated
}: {
  project: ProjectOverview
  locale: string
  onOpen: () => void
  onRemove: () => void
  onRelocated: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const broken = project.missing || !project.isQuartzProject
  const lastOpened = formatRelativeTime(project.lastOpenedAt, locale)

  const relocate = useAsyncAction(async () => {
    const folder = await window.quartzGui.dialog.pickFolder()
    if (!folder) return
    await window.quartzGui.projects.relocate(project.id, folder)
    onRelocated()
  })

  return (
    <Card
      className={`relative flex flex-col gap-1.5 ${
        broken ? 'border-amber-300/70 dark:border-amber-500/30' : ''
      }`}
    >
      <div className="flex items-start gap-2 pr-8">
        <button
          className="min-w-0 text-left text-[15px] font-medium hover:underline disabled:cursor-default disabled:no-underline"
          onClick={onOpen}
          disabled={broken}
        >
          {project.name}
        </button>
        {project.serverRunning && (
          <span className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-green-700 dark:text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            {project.serverPort ? t('home.serverRunningOnPort', { port: project.serverPort }) : t('home.serverRunning')}
          </span>
        )}
      </div>

      {project.missing ? (
        <p className="flex items-center gap-1.5 text-[13px] text-amber-700 dark:text-amber-400">
          <TriangleAlert size={13} className="shrink-0" />
          {t('home.folderMissing')}
        </p>
      ) : !project.isQuartzProject ? (
        <p className="flex items-center gap-1.5 text-[13px] text-amber-700 dark:text-amber-400">
          <TriangleAlert size={13} className="shrink-0" />
          {t('home.notAQuartzProject')}
        </p>
      ) : (
        (project.siteTitle || project.baseUrl) && (
          <p className="truncate text-[13px] text-slate-600 dark:text-slate-300">
            {project.siteTitle && `„${project.siteTitle}“`}
            {project.siteTitle && project.baseUrl && ' · '}
            {project.baseUrl}
          </p>
        )
      )}

      <p className="truncate text-xs text-slate-400 dark:text-slate-500" title={project.path}>
        {project.path}
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        {lastOpened ? (
          <span className="text-xs text-slate-400 dark:text-slate-500">{t('home.lastOpened', { when: lastOpened })}</span>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500">{t('home.neverOpened')}</span>
        )}
        {project.missing && (
          <Button variant="ghost" className="ml-auto" onClick={() => relocate.run()} disabled={relocate.pending}>
            <span className="flex items-center gap-1.5">
              <FolderSearch size={13} />
              {t('home.locateFolder')}
            </span>
          </Button>
        )}
      </div>
      {relocate.error && <p className="text-xs text-red-600 dark:text-red-400">{relocate.error}</p>}

      <button
        type="button"
        aria-label={t('common.remove')}
        title={t('common.remove')}
        onClick={onRemove}
        className="absolute right-3 top-3 rounded-[6px] p-1 text-slate-400 transition-colors hover:bg-black/[0.05] hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
      >
        <Trash2 size={14} />
      </button>
    </Card>
  )
}

// ── first run ───────────────────────────────────────────────────────────────────────────────

function GettingStarted({ onOpen, onCreate }: { onOpen: () => void; onCreate: () => void }): JSX.Element {
  const { t } = useTranslation()
  // Numbered because it genuinely is a sequence - you cannot link a vault before there is a
  // project, and there is nothing to preview before that.
  const steps = [t('home.gettingStarted.step1'), t('home.gettingStarted.step2'), t('home.gettingStarted.step3')]

  return (
    <Card>
      <h2 className="text-[15px] font-semibold">{t('home.gettingStarted.title')}</h2>
      <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{t('home.gettingStarted.description')}</p>
      <ol className="mt-4 flex flex-col gap-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-[11px] font-semibold text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
              {index + 1}
            </span>
            <span className="text-[13px] text-slate-600 dark:text-slate-300">{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onCreate}>{t('home.createNew')}</Button>
        <Button variant="ghost" onClick={onOpen}>
          {t('home.openExisting')}
        </Button>
      </div>
    </Card>
  )
}

// ── environment ─────────────────────────────────────────────────────────────────────────────

// Nothing in this app works without node, npm and git - a build, a plugin install and creating a
// project all shell out. Before this, a machine missing one of them said so as a cryptic failure
// halfway through a clone; now it says so before anything is attempted.
//
// Two presentations, never both: a full-width band above everything when something is wrong (the
// same rule ProjectDashboard's attention band follows - it exists only when there is real
// breakage), and a single quiet line in the side column when everything is fine. A broken
// environment must not sit in a 320px column that collapses below the project list on a narrow
// window.
function useEnvironment(): [EnvironmentInfo | null, () => void] {
  const [info, setInfo] = useState<EnvironmentInfo | null>(null)
  const load = useCallback(() => {
    void window.quartzGui.settings.environment().then(setInfo)
  }, [])
  useEffect(load, [load])
  return [info, load]
}

function environmentIsHealthy(info: EnvironmentInfo): boolean {
  return info.ok && info.secretStorage.secure
}

function EnvironmentBand({ info, onRecheck }: { info: EnvironmentInfo; onRecheck: () => void }): JSX.Element | null {
  const { t } = useTranslation()
  if (environmentIsHealthy(info)) return null

  const broken = info.tools.filter((tool) => tool.version === null)
  return (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-950/40">
      {broken.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <TriangleAlert size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {t('home.environment.titleProblem')}
            </h2>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-amber-900/80 dark:text-amber-200/80">
            {t('home.environment.description')}
          </p>
          <ul className="mt-2.5 flex flex-col gap-1">
            {broken.map((tool) => (
              <li key={tool.name} className="font-mono text-xs text-amber-900 dark:text-amber-200">
                {tool.name} — {tool.path ? t('home.environment.brokenTool') : t('home.environment.missing')}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-xs leading-relaxed text-amber-900/70 dark:text-amber-200/70">
            {t('home.environment.installHint')}
          </p>
        </>
      )}
      {!info.secretStorage.secure && (
        <div className={broken.length > 0 ? 'mt-4 border-t border-amber-300/60 pt-3 dark:border-amber-500/30' : ''}>
          <div className="flex items-center gap-2">
            <TriangleAlert size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {t('home.environment.secretsTitle')}
            </h2>
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-amber-900/80 dark:text-amber-200/80">
            {info.secretStorage.available
              ? t('home.environment.secretsBody', { backend: info.secretStorage.backend ?? '?' })
              : t('home.environment.secretsUnavailable')}
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={onRecheck}
        className="mt-3 text-xs font-medium text-amber-800 hover:underline dark:text-amber-300"
      >
        {t('home.environment.recheck')}
      </button>
    </div>
  )
}

// The tools disagree on what --version prints: node answers "v26.5.1", npm a bare "11.17.0", git a
// whole sentence with a vendor suffix ("git version 2.50.1 (Apple Git-155)"). This line is a
// reassurance, not a diagnosis, so it shows the number and nothing else - the full string is what
// the warning band prints when something is actually wrong.
function versionNumber(version: string | null): string {
  return /\d[\d.]*/.exec(version ?? '')?.[0] ?? ''
}

function EnvironmentLine({ info }: { info: EnvironmentInfo }): JSX.Element | null {
  const { t } = useTranslation()
  if (!environmentIsHealthy(info)) return null
  return (
    <div className="flex items-start gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
      <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-500" />
      <p className="min-w-0">
        <span className="font-medium">{t('home.environment.ready')}</span>{' '}
        <span className="break-words">
          {info.tools.map((tool) => `${tool.name} ${versionNumber(tool.version)}`).join(' · ')}
        </span>
      </p>
    </div>
  )
}

// ── what the app is for ─────────────────────────────────────────────────────────────────────

function WhatYouCanDo({ environment }: { environment: EnvironmentInfo | null }): JSX.Element {
  const { t } = useTranslation()
  // The four blocks are exactly the sidebar's four groups, in the same order - so the start
  // screen teaches the structure of a project before you are inside one.
  const areas = [
    { key: 'setup', icon: GROUP_ICONS.setup },
    { key: 'design', icon: GROUP_ICONS.design },
    { key: 'publish', icon: GROUP_ICONS.publish },
    { key: 'maintenance', icon: GROUP_ICONS.maintenance }
  ] as const

  return (
    <aside className="flex flex-col gap-4">
      {environment && <EnvironmentLine info={environment} />}
      <Card>
        <h2 className="text-[15px] font-semibold">{t('home.capabilities.title')}</h2>
        <div className="mt-3 flex flex-col gap-3.5">
          {areas.map(({ key, icon: Icon }) => (
            <div key={key} className="flex gap-2.5">
              <Icon size={15} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium">{t(`home.capabilities.${key}.title`)}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {t(`home.capabilities.${key}.body`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-[15px] font-semibold">{t('home.aboutQuartz.title')}</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('home.aboutQuartz.body')}</p>
        <div className="mt-3 flex flex-col gap-1.5">
          <ExternalLink url={QUARTZ_DOCS} label={t('home.aboutQuartz.docs')} />
          <ExternalLink url={PLUGIN_CATALOG} label={t('home.aboutQuartz.catalog')} />
        </div>
      </Card>
    </aside>
  )
}

function ExternalLink({ url, label }: { url: string; label: string }): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => void window.quartzGui.dialog.openExternal(url)}
      className="flex w-fit items-center gap-1 text-[13px] text-blue-600 hover:underline dark:text-blue-400"
    >
      {label}
      <ArrowUpRight size={13} />
    </button>
  )
}

// ── create wizard ───────────────────────────────────────────────────────────────────────────

function CreateWizard({
  busy,
  error,
  defaultDirectory,
  onCancel,
  onCreate
}: {
  busy: boolean
  error: string | null
  defaultDirectory?: string
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
    const folder = await window.quartzGui.dialog.pickFolder(targetDirectory || defaultDirectory)
    if (folder) setTargetDirectory(folder)
  }

  async function pickSource(): Promise<void> {
    const folder = await window.quartzGui.dialog.pickFolder(source || undefined)
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
