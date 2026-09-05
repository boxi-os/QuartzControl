import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { confirmDialog } from '../utils/confirm'
import { titlebarStripClass } from '../utils/platform'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2, Copy, FolderSearch, Search, TriangleAlert, Trash2 } from 'lucide-react'
import type {
  AppUpdateStatus,
  CreateProjectOptions,
  DuplicateProjectOptions,
  EnvironmentInfo,
  ProjectOverview,
  ToolInfo
} from '@shared/ipc-contract'
import type { TFunction } from 'i18next'
import { useAppStore } from '../state/store'
import { Button, Card, Field, InfoNote, Modal, Select, TextInput, Toggle } from '../components/ui'
import ProjectAvatar from '../components/ProjectAvatar'
import { ImportOutcome } from '../components/ImportOutcome'
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
  // One selector per value, not the whole store: without a selector this page re-renders on every
  // change anywhere in it - a pushed error, a reloaded project list - and it is the busiest page in
  // the app. The actions are stable references, so selecting them costs nothing.
  const settings = useAppStore((s) => s.settings)
  const removeProject = useAppStore((s) => s.removeProject)
  const [projects, setProjects] = useState<ProjectOverview[] | null>(null)
  const [showWizard, setShowWizard] = useState(false)
  // Set only when a created project's template import had something to report. It keeps the wizard
  // on screen with the outcome instead of navigating away from the one moment it can be shown.
  const [outcome, setOutcome] = useState<{ projectId: string; warnings: string[] } | null>(null)
  // The project a "Duplizieren" click opened the dialog for. One piece of state rather than a flag
  // per row: only one dialog can be open, and the row itself has nothing to remember afterwards.
  const [duplicating, setDuplicating] = useState<ProjectOverview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [environment, recheckEnvironment] = useEnvironment()
  const navigate = useNavigate()

  const reload = useCallback(async () => {
    setProjects(await window.quartzGui.projects.overview())
  }, [])

  // No settings load here any more: main.tsx fills the store before the first render, and the only
  // thing this page takes from it is the default folder for the picker. The Settings page keeps its
  // own load, because that is where a value edited outside the app would show up wrong.
  useEffect(() => {
    void reload()
  }, [reload])

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
      {/* Two boxes, and the split is the point: the scroller is the full width of the window, the
          width cap sits inside it. With one element doing both, the scrollbar sat at the right edge
          of the centred column - which on a wide window is the middle of the screen. Same shape as
          ProjectLayout, where <main> scrolls and the inner div caps.

          Still a centred column, unlike the project pages: this is a launcher, and a start screen
          stretched across a 27" display reads as broken rather than spacious. What the extra width
          buys here is a second column - the projects stay the main thing on the left, and what the
          app can do sits beside them instead of pushing them down the page. */}
      <div className="flex-1 overflow-y-auto px-6 pb-12">
        <div className="mx-auto w-full max-w-6xl">
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
              className="shrink-0 pt-1 text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              {t('home.settings')}
            </Link>
          </div>

          {environment && <EnvironmentBand info={environment} onRecheck={recheckEnvironment} />}
          <NewerVersionBand />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Button onClick={openExisting}>{t('home.openExisting')}</Button>
                <Button variant="ghost" onClick={() => setShowWizard(true)}>
                  {t('home.createNew')}
                </Button>
                {sorted.length >= SEARCH_THRESHOLD && (
                  <div className="relative ml-auto">
                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
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
                        // Removing the entry also stops the project's dev server (see the
                        // project:remove handler), so the question says so rather than leaving a
                        // process running that nothing in the app points at any more.
                        const question = project.serverRunning
                          ? t('home.confirmRemoveRunning', { name: project.name })
                          : t('home.confirmRemove', { name: project.name })
                        if (!(await confirmDialog({ text: question, confirmLabel: t('home.confirmRemoveAction'), danger: true }))) return
                        await removeProject(project.id)
                        await reload()
                      }}
                      onRelocated={reload}
                      onDuplicate={() => setDuplicating(project)}
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
      </div>

      {duplicating && (
        <DuplicateWizard
          source={duplicating}
          busy={busy}
          error={error}
          defaultDirectory={settings.defaultProjectDirectory}
          onCancel={() => {
            setDuplicating(null)
            setError(null)
          }}
          onDuplicate={async (options) => {
            setBusy(true)
            setError(null)
            try {
              const result = await window.quartzGui.projects.duplicate(options)
              if (!result.success) {
                setError(result.output || t('home.duplicate.failed'))
                return
              }
              const overview = await window.quartzGui.projects.overview()
              setProjects(overview)
              const created = overview.find((p) => p.path === options.targetDirectory)
              setDuplicating(null)
              if (created) navigate(`/project/${created.id}`)
            } finally {
              setBusy(false)
            }
          }}
        />
      )}

      {showWizard && (
        <CreateWizard
          busy={busy}
          error={error}
          defaultDirectory={settings.defaultProjectDirectory}
          outcome={outcome?.warnings ?? null}
          onContinue={() => {
            const id = outcome?.projectId
            setOutcome(null)
            setShowWizard(false)
            if (id) navigate(`/project/${id}`)
          }}
          onCancel={() => {
            setShowWizard(false)
            setOutcome(null)
          }}
          onCreate={async (options, template) => {
            setBusy(true)
            setError(null)
            try {
              const result = await window.quartzGui.projects.create(options)
              if (!result.success) {
                setError(result.output || t('home.wizard.createFailed'))
                return
              }
              // The template is applied to the project that now exists, through the ordinary import
              // path - plan first, so the parts come from the package rather than from a list here
              // that would go stale the next time a part is added. A failure does not undo the
              // project: it is a finished, usable Quartz project either way, and the message says
              // what did not happen rather than throwing the whole creation away.
              let warnings: string[] = []
              if (template) {
                try {
                  const plan = await window.quartzGui.templatePackage.plan(options.targetDirectory, template.path)
                  // null means the package could not be read at all. Silently skipping it left the
                  // user with a project that looks like the one they asked for minus its whole
                  // appearance, and nothing anywhere said why.
                  if (!plan) {
                    setError(t('home.wizard.templateFailed', { detail: t('home.wizard.templateUnreadable') }))
                    return
                  }
                  const parts = plan.parts
                    .map((part) => part.id)
                    .filter((id) => template.withContent || id !== 'content')
                  const imported = await window.quartzGui.templatePackage.import(
                    options.targetDirectory,
                    template.path,
                    parts,
                    'packageWins'
                  )
                  // What the import had to say about itself. Dropping it meant a package that was
                  // only half applied - offline, so no plugin could be installed, or a part that
                  // failed - produced a project that simply looked wrong, with the explanation
                  // available on the Vorlagen page and nowhere near the person who just clicked.
                  warnings = imported.warnings
                  // The one setting the template deliberately does not carry, set here because
                  // leaving it would be worse than either: `configuration` is a site's own
                  // identity and no part touches it, but `quartz create` writes en-US and the
                  // example pages are German. Without this a German user gets German pages under
                  // an English "Table of contents" - and the eleven translated strings the
                  // package just installed are not rendered at all, since quartz only reads a
                  // locale file the configuration names. The app's own language is the best
                  // answer available at this moment, and the config editor is one click away.
                  const config = await window.quartzGui.config.get(options.targetDirectory)
                  const wanted = i18n.language.startsWith('de') ? 'de-DE' : 'en-US'
                  if (config.configuration.locale !== wanted) {
                    await window.quartzGui.config.save(options.targetDirectory, {
                      ...config,
                      configuration: { ...config.configuration, locale: wanted }
                    })
                  }
                } catch (err) {
                  setError(t('home.wizard.templateFailed', { detail: String(err) }))
                  return
                }
              }
              const overview = await window.quartzGui.projects.overview()
              setProjects(overview)
              const created = overview.find((p) => p.path === options.targetDirectory)
              // The project exists either way. With warnings the dialog stays up to show them once,
              // because after the navigation there is no place left that knows they happened.
              if (warnings.length > 0 && created) {
                setOutcome({ projectId: created.id, warnings })
                return
              }
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

// ── duplicating a project ───────────────────────────────────────────────────────────────────

// Same two fields as the create wizard, for the same reason (a folder picker cannot return a
// folder that does not exist yet), plus the one question a copy has to answer: where its own
// content comes from. The original's content folder is deliberately not offered - it is either a
// link into a vault, which two projects would then write through without either saying so, or a
// folder that belongs to the original.
function DuplicateWizard({
  source,
  busy,
  error,
  defaultDirectory,
  onCancel,
  onDuplicate
}: {
  source: ProjectOverview
  busy: boolean
  error: string | null
  defaultDirectory?: string
  onCancel: () => void
  onDuplicate: (options: DuplicateProjectOptions) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [parentDirectory, setParentDirectory] = useState(defaultDirectory ?? '')
  const [projectName, setProjectName] = useState(`${source.name}-2`)
  const [strategy, setStrategy] = useState<DuplicateProjectOptions['contentStrategy']>('blank')
  const [contentSource, setContentSource] = useState('')

  const trimmedName = projectName.trim()
  const targetDirectory = parentDirectory && trimmedName ? `${parentDirectory.replace(/\/+$/, '')}/${trimmedName}` : ''
  const nameInvalid = trimmedName.includes('/') || trimmedName === '.' || trimmedName === '..'

  async function pickParent(): Promise<void> {
    const folder = await window.quartzGui.dialog.pickFolder(parentDirectory || defaultDirectory)
    if (folder) setParentDirectory(folder)
  }

  async function pickContent(): Promise<void> {
    const folder = await window.quartzGui.dialog.pickFolder(contentSource || undefined)
    if (folder) setContentSource(folder)
  }

  const canRun = !busy && !!targetDirectory && !nameInvalid && (strategy === 'blank' || !!contentSource)
  function run(): void {
    if (!canRun) return
    onDuplicate({
      sourcePath: source.path,
      targetDirectory,
      contentStrategy: strategy,
      contentSource: strategy === 'blank' ? undefined : contentSource
    })
  }

  return (
    <Modal open onClose={onCancel} onSubmit={run} dismissible={!busy} title={t('home.duplicate.title', { name: source.name })}>
      <InfoNote className="mb-1">{t('home.duplicate.intro')}</InfoNote>
      <div className="flex flex-col gap-3">
        <Field label={t('home.wizard.parentDirectory')} hint={t('home.wizard.parentDirectoryHint')}>
          <div className="flex gap-2">
            <TextInput
              value={parentDirectory}
              onChange={(e) => setParentDirectory(e.target.value)}
              placeholder={t('home.wizard.parentDirectoryPlaceholder')}
              className="flex-1"
            />
            <Button variant="ghost" onClick={pickParent}>
              {t('common.select')}
            </Button>
          </div>
        </Field>

        <Field label={t('home.wizard.projectName')} hint={t('home.duplicate.nameHint')}>
          <TextInput data-autofocus value={projectName} onChange={(e) => setProjectName(e.target.value)} />
        </Field>

        {nameInvalid ? (
          <p className="text-[11px] text-red-600 dark:text-red-400">{t('home.wizard.nameInvalid')}</p>
        ) : (
          targetDirectory && (
            <p className="break-all text-[11px] text-slate-500 dark:text-slate-400">
              {t('home.wizard.targetPreview')} <code className="font-mono">{targetDirectory}</code>
            </p>
          )
        )}

        <Field label={t('home.duplicate.contentLabel')} hint={t('home.duplicate.contentHint')}>
          <Select value={strategy} onChange={(e) => setStrategy(e.target.value as typeof strategy)}>
            <option value="blank">{t('home.duplicate.contentBlank')}</option>
            <option value="symlink">{t('home.duplicate.contentSymlink')}</option>
            <option value="copy">{t('home.duplicate.contentCopy')}</option>
          </Select>
        </Field>

        {strategy !== 'blank' && (
          <Field label={t('home.duplicate.contentFolder')} hint={t('home.duplicate.contentFolderHint')}>
            <div className="flex gap-2">
              <TextInput value={contentSource} onChange={(e) => setContentSource(e.target.value)} className="flex-1" />
              <Button variant="ghost" onClick={pickContent}>
                {t('common.select')}
              </Button>
            </div>
          </Field>
        )}

        <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('home.duplicate.whatStaysBehind')}</p>

        {error && <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-1 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={!canRun}>
            {busy ? t('home.duplicate.running') : t('home.duplicate.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── one project ─────────────────────────────────────────────────────────────────────────────

function ProjectRow({
  project,
  locale,
  onOpen,
  onRemove,
  onRelocated,
  onDuplicate
}: {
  project: ProjectOverview
  locale: string
  onOpen: () => void
  onRemove: () => void
  onRelocated: () => void
  onDuplicate: () => void
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
      <div className="flex items-start gap-2.5 pr-8">
        <ProjectAvatar id={project.id} name={project.name} icon={project.icon} size={40} className="mt-0.5" />
        <button
          className="min-w-0 text-left text-heading font-medium hover:underline disabled:cursor-default disabled:no-underline"
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

      <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={project.path}>
        {project.path}
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        {lastOpened ? (
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('home.lastOpened', { when: lastOpened })}</span>
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('home.neverOpened')}</span>
        )}
        {project.missing && (
          <Button variant="ghost" className="ml-auto" onClick={() => relocate.run()} disabled={relocate.pending}>
            <span className="flex items-center gap-1.5">
              <FolderSearch size={13} />
              {t('home.locateFolder')}
            </span>
          </Button>
        )}
        {!broken && (
          <Button variant="ghost" className="ml-auto" onClick={onDuplicate}>
            <span className="flex items-center gap-1.5">
              <Copy size={13} />
              {t('home.duplicate.action')}
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
        className="absolute right-3 top-3 rounded-[6px] p-1 text-slate-500 dark:text-slate-400 transition-colors hover:bg-black/[0.05] hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
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
      <h2 className="text-heading font-semibold">{t('home.gettingStarted.title')}</h2>
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

// ── a newer build ───────────────────────────────────────────────────────────────────────────

// Shown only when there *is* one. `unknown` says nothing on purpose: a band that reads "could not
// check for updates" every time somebody works offline is noise about the app instead of about
// their site, and the answer it would be hiding is one the user cannot act on anyway. The one state
// worth a line is the one that costs a tester an evening otherwise.
function NewerVersionBand(): JSX.Element | null {
  const { t } = useTranslation()
  const [status, setStatus] = useState<AppUpdateStatus | null>(null)

  useEffect(() => {
    // Not awaited into the render path: the start screen must come up at the speed of the local
    // reads around it, and this one goes to the network.
    void window.quartzGui.appUpdate.check().then(setStatus)
  }, [])

  if (!status || status.state !== 'newer') return null
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-blue-300/60 bg-blue-50/60 px-3 py-2 text-[13px] text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/[0.08] dark:text-blue-200">
      <span>{t('home.update.available', { latest: status.latest, current: status.current })}</span>
      {status.notes && <span className="text-blue-800/80 dark:text-blue-300/80">{status.notes}</span>}
      {status.url && (
        <button
          type="button"
          onClick={() => void window.quartzGui.dialog.openExternal(status.url as string)}
          className="ml-auto flex items-center gap-1 underline underline-offset-2 hover:no-underline"
        >
          {t('home.update.get')}
          <ArrowUpRight size={13} />
        </button>
      )}
    </div>
  )
}

// ── environment ─────────────────────────────────────────────────────────────────────────────

// A build, a plugin install and creating a project all shell out, and before this a machine
// missing a tool said so as a cryptic failure halfway through a clone; now it says so before
// anything is attempted. Since Phase 7c all three travel with the app - node and npm always
// (nodeRuntime.ts), git whenever the machine has none that runs (gitRuntime.ts) - so there is
// nothing left to ask the user to install, and a tool that does not run means this copy of the
// app is incomplete. That is why the band has one hint and not two: a *host* tool that is broken
// cannot occur any more, because git only counts as the host's once it has answered
// `git --version`.
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
            {t('home.environment.embeddedBroken')}
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

// Grouped by origin rather than listed flat, because the origin is the point: two of the three
// tools are the app's own and need nothing from the user. Naming that once per group beats a
// "(bundled)" tag repeated behind every version.
function toolSummary(info: EnvironmentInfo, t: TFunction): string {
  const groups: [string, ToolInfo['source']][] = [
    [t('home.environment.bundled'), 'embedded'],
    [t('home.environment.fromSystem'), 'host']
  ]
  return groups
    .map(([label, source]) => {
      const tools = info.tools.filter((tool) => tool.source === source)
      if (tools.length === 0) return null
      return `${label}: ${tools.map((tool) => `${tool.name} ${versionNumber(tool.version)}`).join(', ')}`
    })
    .filter((part): part is string => part !== null)
    .join(' · ')
}

function EnvironmentLine({ info }: { info: EnvironmentInfo }): JSX.Element | null {
  const { t } = useTranslation()
  if (!environmentIsHealthy(info)) return null
  return (
    <div className="flex items-start gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
      <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-500" />
      <p className="min-w-0">
        <span className="font-medium">{t('home.environment.ready')}</span>
        {' · '}
        <span className="break-words">{toolSummary(info, t)}</span>
        {/* Named rather than merely implied by the band's absence. "No warning" and "secrets are
            protected" look identical, and the alpha test asked exactly that question about a Linux
            machine - where the backend is the one thing that decides it (see
            connectionsService.getSecretStorageInfo). Only on Linux, because everywhere else there
            is one keychain and nothing to distinguish. */}
        {info.secretStorage.backend && (
          <>
            {' · '}
            <span className="break-words">
              {t('home.environment.secretsBackend', { backend: info.secretStorage.backend })}
            </span>
          </>
        )}
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
        <h2 className="text-heading font-semibold">{t('home.capabilities.title')}</h2>
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
        <h2 className="text-heading font-semibold">{t('home.aboutQuartz.title')}</h2>
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
  outcome,
  onContinue,
  onCancel,
  onCreate
}: {
  busy: boolean
  error: string | null
  defaultDirectory?: string
  /** Warnings from the template import, once the project exists. Null while it does not. */
  outcome: string[] | null
  onContinue: () => void
  onCancel: () => void
  onCreate: (options: CreateProjectOptions, template: { path: string; withContent: boolean } | null) => void
}): JSX.Element {
  const { t } = useTranslation()
  // Two fields rather than one path, because the folder is created here rather than chosen: a
  // native folder picker can only return a directory that already exists, so with a single
  // "target directory" field the only way to name a new project was to create the folder in the
  // dialog first - which is exactly what a first-time user does not think to do. The parent comes
  // from the picker, the name is typed, and the line under them shows what will be created.
  const [parentDirectory, setParentDirectory] = useState(defaultDirectory ?? '')
  const [projectName, setProjectName] = useState('')
  const [template, setTemplate] = useState<NonNullable<CreateProjectOptions['template']>>('default')
  const [source, setSource] = useState('')
  const [strategy, setStrategy] = useState<NonNullable<CreateProjectOptions['strategy']>>('new')
  const [linkResolution, setLinkResolution] = useState<NonNullable<CreateProjectOptions['linkResolution']>>('shortest')
  const [baseUrl, setBaseUrl] = useState('localhost')
  // The example template, if the app has one to offer. Asked for once on mount: the answer may
  // involve a download, and a dialog that re-checks on every keystroke would be checking the
  // network while somebody types a folder name.
  const [builtin, setBuiltin] = useState<{ path: string; source: 'downloaded' | 'bundled' } | null>(null)
  const [useTemplate, setUseTemplate] = useState(true)
  const [withContent, setWithContent] = useState(true)

  useEffect(() => {
    void window.quartzGui.templatePackage.builtin().then(setBuiltin)
  }, [])

  const trimmedName = projectName.trim()
  // macOS and Linux only (see electron-builder.yml on why Windows is absent), so one separator.
  const targetDirectory = parentDirectory && trimmedName ? `${parentDirectory.replace(/\/+$/, '')}/${trimmedName}` : ''
  const nameInvalid = trimmedName.includes('/') || trimmedName === '.' || trimmedName === '..'

  async function pickParent(): Promise<void> {
    const folder = await window.quartzGui.dialog.pickFolder(parentDirectory || defaultDirectory)
    if (folder) setParentDirectory(folder)
  }

  async function pickSource(): Promise<void> {
    const folder = await window.quartzGui.dialog.pickFolder(source || undefined)
    if (folder) setSource(folder)
  }

  const canCreate = !busy && !!targetDirectory && !nameInvalid && (strategy === 'new' || !!source)
  // The template's notes may only be written into a content folder the project itself just made.
  // Under 'copy' the folder holds the user's own notes and the import runs with packageWins, so an
  // index.md of theirs was replaced by the template's start page with no plan, no conflict list and
  // nothing but the pre-import snapshot - which they do not know about - to get it back. Under
  // 'symlink' it is a link into somebody's vault and the content part refuses outright, so the
  // switch promised something that could not happen either way.
  const contentAllowed = strategy === 'new'
  function create(): void {
    // Also the guard behind Return: the submit button is disabled in the same cases, which stops
    // implicit submission, but a check that lives in one place cannot disagree with the button.
    if (!canCreate) return
    onCreate(
      {
        targetDirectory,
        template,
        strategy,
        linkResolution,
        source: strategy === 'new' ? undefined : source,
        baseUrl: baseUrl || undefined
      },
      builtin && useTemplate ? { path: builtin.path, withContent: withContent && contentAllowed } : null
    )
  }

  // The project is made; the form behind this would only invite creating it a second time. One
  // screen, one message, one way on - and closing with Escape goes the same way, since onContinue
  // is what the parent hands to onClose in this state.
  if (outcome) {
    return (
      <Modal open onClose={onContinue} title={t('home.wizard.doneTitle')}>
        <div className="flex flex-col gap-1">
          <p className="text-ui text-text-secondary">{t('home.wizard.doneWithWarnings')}</p>
          <ImportOutcome warnings={outcome} />
          <div className="mt-4 flex justify-end">
            <Button onClick={onContinue}>{t('home.wizard.toProject')}</Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onCancel} onSubmit={create} dismissible={!busy} title={t('home.wizard.title')}>
      <InfoNote className="mb-1">{t('home.wizard.intro')}</InfoNote>
      <div className="flex flex-col gap-3">
          <Field label={t('home.wizard.parentDirectory')} hint={t('home.wizard.parentDirectoryHint')}>
            <div className="flex gap-2">
              <TextInput
                value={parentDirectory}
                onChange={(e) => setParentDirectory(e.target.value)}
                placeholder={t('home.wizard.parentDirectoryPlaceholder')}
                className="flex-1"
              />
              <Button variant="ghost" onClick={pickParent}>
                {t('common.select')}
              </Button>
            </div>
          </Field>

          <Field label={t('home.wizard.projectName')} hint={t('home.wizard.projectNameHint')}>
            {/* The parent directory above is usually pre-filled; the name is what gets typed. */}
            <TextInput
              data-autofocus
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={t('home.wizard.projectNamePlaceholder')}
            />
          </Field>

          {nameInvalid ? (
            <p className="text-[11px] text-red-600 dark:text-red-400">{t('home.wizard.nameInvalid')}</p>
          ) : (
            targetDirectory && (
              <p className="break-all text-[11px] text-slate-500 dark:text-slate-400">
                {t('home.wizard.targetPreview')} <code className="font-mono">{targetDirectory}</code>
              </p>
            )
          )}

          <Field label={t('home.wizard.template')} hint={t('home.wizard.templateHint')}>
            <Select value={template} onChange={(e) => setTemplate(e.target.value as typeof template)}>
              {TEMPLATES.map((tpl) => (
                <option key={tpl} value={tpl}>
                  {tpl}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('home.wizard.contentStrategy')} hint={t('home.wizard.contentStrategyHint')}>
            <Select value={strategy} onChange={(e) => setStrategy(e.target.value as typeof strategy)}>
              <option value="new">{t('home.wizard.strategyNew')}</option>
              <option value="copy">{t('home.wizard.strategyCopy')}</option>
              <option value="symlink">{t('home.wizard.strategySymlink')}</option>
            </Select>
          </Field>

          {strategy !== 'new' && (
            <Field label={t('home.wizard.sourceFolder')} hint={t('home.wizard.sourceFolderHint')}>
              <div className="flex gap-2">
                <TextInput value={source} onChange={(e) => setSource(e.target.value)} className="flex-1" />
                <Button variant="ghost" onClick={pickSource}>
                  {t('common.select')}
                </Button>
              </div>
            </Field>
          )}

          <Field label={t('home.wizard.linkResolution')} hint={t('home.wizard.linkResolutionHint')}>
            <Select value={linkResolution} onChange={(e) => setLinkResolution(e.target.value as typeof linkResolution)}>
              <option value="shortest">{t('home.wizard.linkShortest')}</option>
              <option value="absolute">{t('home.wizard.linkAbsolute')}</option>
              <option value="relative">{t('home.wizard.linkRelative')}</option>
            </Select>
          </Field>

          <Field label={t('home.wizard.baseUrl')} hint={t('home.wizard.baseUrlHint')}>
            <TextInput value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="example.com" />
          </Field>

          {/* Last, and deliberately after the Quartz options: this is a decision about how the site
              should look, and the ones above are about what the project *is*. A checkbox rather
              than a picker because there is one template to offer; when there are several this
              becomes a list and the second checkbox moves into it. */}
          {builtin && (
            <div className="rounded-md border border-ink/10 bg-ground p-2.5">
              <Toggle
                label={t('home.wizard.useTemplate')}
                hint={t('home.wizard.useTemplateHint')}
                checked={useTemplate}
                onChange={setUseTemplate}
              />
              {useTemplate && (
                <div className="mt-2 border-t border-ink/10 pt-2">
                  <Toggle
                    label={t('home.wizard.templateContent')}
                    hint={
                      contentAllowed
                        ? t('home.wizard.templateContentHint')
                        : strategy === 'copy'
                          ? t('home.wizard.templateContentHintCopy')
                          : t('home.wizard.templateContentHintSymlink')
                    }
                    checked={withContent && contentAllowed}
                    onChange={setWithContent}
                    disabled={!contentAllowed}
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-red-50 p-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </pre>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!canCreate}>
              {busy ? t('home.wizard.creating') : t('home.wizard.create')}
            </Button>
          </div>
      </div>
    </Modal>
  )
}
