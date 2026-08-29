import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Check, FileArchive, FolderInput, Package } from 'lucide-react'
import { useProject } from './ProjectLayout'
import type {
  Project,
  TemplateConflictStrategy,
  TemplateImportProgress,
  TemplatePackagePlan,
  TemplatePartId,
  TemplatePartPlan,
  TemplatePartSummary
} from '@shared/ipc-contract'
import { TEMPLATE_PART_IDS } from '@shared/ipc-contract'
import { Badge, Button, Card, Field, PageHeader, SegmentedControl, TextInput } from '../components/ui'
import { formatIpcError } from '../components/ErrorSurface'
import { useStickyState } from '../state/uiState'
import { TAB_ICONS } from './navConfig'

// Reading order for the user, which is not the order the parts are applied in (that one is
// dependency-driven and lives in the contract): what the site looks like first, what it is built
// from after.
const DISPLAY_ORDER: TemplatePartId[] = [
  'appearance',
  'theme',
  'cssVariables',
  'styles',
  'fonts',
  'layout',
  'frames',
  'plugins',
  'translations',
  'presets'
]

function sortForDisplay<T extends { id: TemplatePartId }>(items: T[]): T[] {
  return [...items].sort((a, b) => DISPLAY_ORDER.indexOf(a.id) - DISPLAY_ORDER.indexOf(b.id))
}

export default function Templates(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={TAB_ICONS.templates} title={t('templates.title')} description={t('templates.description')} />
      {/* Two independent halves of the same job - width puts them side by side rather than
          stretching each one across the window. */}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <ExportSection project={project} />
        <ImportSection project={project} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- shared bits */

function PartRow({
  id,
  checked,
  disabled,
  onToggle,
  summary,
  children
}: {
  id: TemplatePartId
  checked: boolean
  disabled?: boolean
  onToggle: () => void
  summary: string
  children?: React.ReactNode
}): JSX.Element {
  const { t } = useTranslation()
  return (
    <label
      className={`flex items-start gap-2.5 rounded-md px-2 py-1.5 text-sm ${
        disabled ? 'opacity-45' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      <input type="checkbox" className="mt-1" checked={checked} disabled={disabled} onChange={onToggle} />
      <span className="min-w-0 flex-1">
        <span className="font-medium">{t(`templates.parts.${id}.label`)}</span>
        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{summary}</span>
        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{t(`templates.parts.${id}.description`)}</span>
        {children}
      </span>
    </label>
  )
}

/* ------------------------------------------------------------------------ export */

function ExportSection({ project }: { project: Project }): JSX.Element {
  const { t } = useTranslation()
  const [name, setName] = useStickyState('templates.name', `${project.name}`)
  const [description, setDescription] = useStickyState('templates.description', '')
  const [available, setAvailable] = useState<TemplatePartSummary[] | null>(null)
  const [selected, setSelected] = useStickyState<TemplatePartId[] | null>('templates.exportParts', null)
  const [scope, setScope] = useStickyState<'changed' | 'all'>('templates.scope', 'changed')
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    window.quartzGui.templatePackage.inspect(project.path).then((parts) => {
      if (cancelled) return
      setAvailable(parts)
      // Everything the project actually has is preselected - a template is normally "all of it",
      // and unticking is the rarer edit. Translations are the exception: the part is offered even
      // when no change could be detected (so the all-texts fallback is reachable), and preselecting
      // it there would put an empty part in every package by default.
      setSelected((current) => current ?? parts.filter((p) => p.id !== 'translations' || p.stats.entries > 0).map((p) => p.id))
    })
    return () => {
      cancelled = true
    }
  }, [project.path, setSelected])

  function toggle(id: TemplatePartId): void {
    setSelected((current) => {
      const list = current ?? []
      return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
    })
  }

  async function runExport(): Promise<void> {
    setExporting(true)
    setResult(null)
    try {
      const written = await window.quartzGui.templatePackage.export(project.path, {
        name: name.trim(),
        description: description.trim() || undefined,
        parts: selected ?? [],
        translationScope: scope
      })
      setResult(
        written
          ? { ok: true, message: t('templates.exportSuccess', { path: written.filePath, size: formatBytes(written.bytes) }) }
          : { ok: true, message: t('templates.exportCancelled') }
      )
    } catch (err) {
      setResult({ ok: false, message: formatIpcError(err) })
    } finally {
      setExporting(false)
    }
  }

  const chosen = selected ?? []
  const canExport = chosen.length > 0 && name.trim().length > 0 && !exporting
  const translations = available?.find((p) => p.id === 'translations')

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <Package size={15} /> {t('templates.exportHeading')}
      </h2>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{t('templates.exportHint')}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('templates.nameLabel')}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
        </Field>
        <Field label={t('templates.descriptionLabel')}>
          <TextInput
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('templates.descriptionPlaceholder')}
            className="w-full"
          />
        </Field>
      </div>

      <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">{t('templates.partsHeading')}</p>
      {available === null ? (
        <p className="px-2 py-1.5 text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
      ) : available.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-slate-500 dark:text-slate-400">{t('templates.nothingToExport')}</p>
      ) : (
        <div className="flex flex-col">
          {sortForDisplay(available).map((part) => (
            <PartRow
              key={part.id}
              id={part.id}
              checked={chosen.includes(part.id)}
              onToggle={() => toggle(part.id)}
              summary={
                part.id === 'translations'
                  ? scope === 'all'
                    ? statsSummary(t, part.id, { languages: part.stats.allLanguages, entries: part.stats.allEntries })
                    : statsSummary(t, part.id, part.stats) || t('templates.scopeNoChanges')
                  : statsSummary(t, part.id, part.stats)
              }
            >
              {part.id === 'translations' && chosen.includes('translations') && (
                <TranslationScope scope={scope} setScope={setScope} stats={part.stats} />
              )}
            </PartRow>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={runExport} disabled={!canExport}>
          {exporting ? t('templates.exporting') : t('templates.exportButton')}
        </Button>
        {available !== null && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('templates.selectedCount', { count: chosen.length, total: available.length })}
          </span>
        )}
      </div>
      {result && (
        <p className={`mt-3 break-all text-xs ${result.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {result.message}
        </p>
      )}
      {translations && translations.stats.undetermined > 0 && chosen.includes('translations') && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {t('templates.baselineHint', { count: translations.stats.undetermined })}
        </p>
      )}
    </Card>
  )
}

function TranslationScope({
  scope,
  setScope,
  stats
}: {
  scope: 'changed' | 'all'
  setScope: (value: 'changed' | 'all') => void
  stats: Record<string, number>
}): JSX.Element {
  const { t } = useTranslation()
  return (
    <span
      className="mt-1.5 block"
      // The row is a <label>, so a click inside it would toggle the checkbox as well.
      onClick={(e) => e.preventDefault()}
    >
      <SegmentedControl
        value={scope}
        onChange={setScope}
        options={[
          { value: 'changed', label: t('templates.scopeChanged', { count: stats.entries ?? 0 }) },
          { value: 'all', label: t('templates.scopeAll', { count: stats.allEntries ?? 0 }) }
        ]}
      />
    </span>
  )
}

/* ------------------------------------------------------------------------ import */

function ImportSection({ project }: { project: Project }): JSX.Element {
  const { t } = useTranslation()
  const [packagePath, setPackagePath] = useState<string | null>(null)
  const [plan, setPlan] = useState<TemplatePackagePlan | null>(null)
  const [unreadable, setUnreadable] = useState(false)
  const [selected, setSelected] = useState<TemplatePartId[]>([])
  const [strategy, setStrategy] = useStickyState<TemplateConflictStrategy>('templates.strategy', 'packageWins')
  const [progress, setProgress] = useState<TemplateImportProgress | null>(null)
  const [warnings, setWarnings] = useState<string[] | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  // The preview is a real dry run - it reads the package and the target project - so it takes long
  // enough that the button needs to say something.
  const [planning, setPlanning] = useState(false)

  // Installed once for the section's lifetime, not per import: the main process emits while the
  // import runs, and a subscription created inside the click handler would miss the first events.
  useEffect(() => window.quartzGui.templatePackage.onProgress(setProgress), [])

  async function pick(): Promise<void> {
    const picked = await window.quartzGui.templatePackage.pick()
    if (!picked) return
    setPackagePath(picked)
    setWarnings(null)
    setFailure(null)
    setProgress(null)
    setPlan(null)
    setUnreadable(false)
    setPlanning(true)
    try {
      const result = await window.quartzGui.templatePackage.plan(project.path, picked)
      setPlan(result)
      setUnreadable(result === null)
      setSelected(result?.parts.map((p) => p.id) ?? [])
    } catch (err) {
      setFailure(formatIpcError(err))
      setUnreadable(false)
    } finally {
      setPlanning(false)
    }
  }

  function toggle(id: TemplatePartId): void {
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
  }

  async function runImport(): Promise<void> {
    if (!packagePath || selected.length === 0) return
    if (!confirm(t(strategy === 'packageWins' ? 'templates.confirmOverwrite' : 'templates.confirmMerge', { count: selected.length }))) return
    setWarnings(null)
    setFailure(null)
    setProgress({ projectPath: project.path, partId: null, message: '', done: 0, total: selected.length })
    try {
      const result = await window.quartzGui.templatePackage.import(project.path, packagePath, selected, strategy)
      setWarnings(result.warnings)
    } catch (err) {
      setFailure(formatIpcError(err))
    } finally {
      setProgress(null)
    }
  }

  const running = progress !== null
  const missing = useMemo(
    () => [...new Set((plan?.parts ?? []).filter((p) => selected.includes(p.id)).flatMap((p) => p.missingPackages.map((m) => m.name)))],
    [plan, selected]
  )

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
        <FolderInput size={15} /> {t('templates.importHeading')}
      </h2>
      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{t('templates.importHint')}</p>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={pick} disabled={running || planning}>
          {planning ? t('templates.planning') : t('templates.pickPackage')}
        </Button>
        {packagePath && <span className="min-w-0 flex-1 truncate text-xs text-slate-500 dark:text-slate-400">{packagePath}</span>}
      </div>

      {unreadable && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{t('templates.previewError')}</p>}

      {plan && (
        <>
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex flex-wrap items-baseline gap-2">
              <FileArchive size={14} className="shrink-0 text-slate-500 dark:text-slate-400" />
              <span className="text-sm font-medium">{plan.manifest.name}</span>
              {plan.legacy && <Badge tone="slate">{t('templates.legacyBadge')}</Badge>}
            </div>
            {plan.manifest.description && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{plan.manifest.description}</p>}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('templates.packageOrigin', {
                date: new Date(plan.manifest.createdAt).toLocaleDateString(),
                project: plan.manifest.source.projectName ?? t('templates.unknownProject')
              })}
            </p>
          </div>

          {plan.unknownParts.length > 0 && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {t('templates.unknownParts', { parts: plan.unknownParts.join(', ') })}
            </p>
          )}

          <div className="mt-4">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">{t('templates.strategyHeading')}</p>
            <SegmentedControl
              value={strategy}
              onChange={setStrategy}
              options={[
                { value: 'packageWins', label: t('templates.strategyPackage') },
                { value: 'projectWins', label: t('templates.strategyProject') }
              ]}
            />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {t(strategy === 'packageWins' ? 'templates.strategyPackageHint' : 'templates.strategyProjectHint')}
            </p>
          </div>

          <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">{t('templates.partsHeading')}</p>
          <div className="flex flex-col">
            {sortForDisplay(plan.parts).map((part) => (
              <PartRow
                key={part.id}
                id={part.id}
                checked={selected.includes(part.id)}
                disabled={running}
                onToggle={() => toggle(part.id)}
                summary={planSummary(t, part, strategy)}
              />
            ))}
          </div>

          {missing.length > 0 && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {t('templates.willInstall', { packages: missing.join(', ') })}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={runImport} disabled={running || selected.length === 0}>
              {running ? t('templates.importing') : t('templates.importButton')}
            </Button>
            {running && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {progress?.partId
                  ? `${t(`templates.parts.${progress.partId}.label`)}${progress.message ? ` — ${progress.message}` : ''}`
                  : t('templates.importPreparing')}
              </span>
            )}
          </div>
          {running && progress && progress.total > 0 && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
              />
            </div>
          )}
        </>
      )}

      {failure && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{failure}</p>}
      {warnings && <ImportOutcome warnings={warnings} />}
    </Card>
  )
}

/**
 * Warnings arrive as `kind:detail` strings from main, deliberately not as finished sentences: the
 * service has no i18n and an import of a 48-plugin package produces 45 near-identical ones. They
 * are grouped by kind here, so "45 Plugins übersprungen" is one line rather than forty-five.
 */
function ImportOutcome({ warnings }: { warnings: string[] }): JSX.Element {
  const { t } = useTranslation()
  const grouped = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const warning of warnings) {
      const kind = warning.split(':')[0]
      const detail = warning.slice(kind.length + 1)
      map.set(kind, [...(map.get(kind) ?? []), detail])
    }
    return [...map.entries()]
  }, [warnings])

  if (warnings.length === 0) {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
        <Check size={13} /> {t('templates.importSuccessNoWarnings')}
      </p>
    )
  }
  return (
    <ul className="mt-3 flex flex-col gap-1 text-xs text-amber-700 dark:text-amber-400">
      {grouped.map(([kind, details]) => (
        <li key={kind}>
          {t([`templates.warnings.${kind}`, 'templates.warnings.unknown'], { count: details.length, detail: details[0], kind })}
          {details.length > 1 && <span className="text-slate-500 dark:text-slate-400"> — {details.slice(0, 6).join(', ')}{details.length > 6 ? ' …' : ''}</span>}
        </li>
      ))}
    </ul>
  )
}

/* ----------------------------------------------------------------------- helpers */

type Translate = ReturnType<typeof useTranslation>['t']

function statsSummary(t: Translate, id: TemplatePartId, stats: Record<string, number>): string {
  const parts = Object.entries(stats)
    .filter(([key, value]) => value > 0 && !key.startsWith('all') && key !== 'undetermined')
    .map(([key, value]) => t([`templates.stats.${id}.${key}`, `templates.stats.${key}`], { count: value }))
  return parts.join(', ')
}

function planSummary(t: Translate, plan: TemplatePartPlan, strategy: TemplateConflictStrategy): string {
  const bits: string[] = []
  if (plan.additions.length > 0) bits.push(t('templates.planAdditions', { count: plan.additions.length }))
  if (plan.conflicts.length > 0) {
    bits.push(t(strategy === 'packageWins' ? 'templates.planReplaced' : 'templates.planKept', { count: plan.conflicts.length }))
  }
  if (bits.length === 0) bits.push(t('templates.planNoChange'))
  return bits.join(', ')
}

function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
