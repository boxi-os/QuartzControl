import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { confirmDialog } from '../utils/confirm'
import { AlertTriangle, FileArchive, FolderInput, Package } from 'lucide-react'
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
import { Badge, Button, Card, CardHeading, Field, PageHeader, SegmentedControl, TextInput } from '../components/ui'
import { formatIpcError } from '../components/ErrorSurface'
import { ImportOutcome } from '../components/ImportOutcome'
import { useStickyState } from '../state/uiState'
import { TAB_ICONS } from './navConfig'
import HandbookLink from '../components/HandbookLink'

// Reading order for the user, which is not the order the parts are applied in (that one is
// dependency-driven and lives in the contract): what the site looks like first, what it is built
// from after.
//
// A `Record` rather than a list, so the typecheck asks for all twelve: as a list it named eleven,
// `indexOf` answered -1 for the twelfth, and `content` stood first by accident rather than because
// anyone had put it there (twenty-fifth review, finding 7). It belongs first - it is the only part
// that carries notes rather than looks - so the accident was right and now says so.
const DISPLAY_ORDER: Record<TemplatePartId, number> = {
  content: 0,
  appearance: 1,
  theme: 2,
  cssVariables: 3,
  styles: 4,
  fonts: 5,
  static: 6,
  layout: 7,
  frames: 8,
  plugins: 9,
  translations: 10,
  presets: 11
}

function sortForDisplay<T extends { id: TemplatePartId }>(items: T[]): T[] {
  return [...items].sort((a, b) => DISPLAY_ORDER[a.id] - DISPLAY_ORDER[b.id])
}

export default function Templates(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={TAB_ICONS.templates} title={t('templates.title')} description={t('templates.description')} handbook={<HandbookLink page="templates" />} />
      {/* Two independent halves of the same job, but not two halves of the same size: the export
          lists twelve parts, the import shows one button until a file is picked. Side by side that
          measured 1041px against 140px at a 1470px window - a long column left, a stub right and
          half the page empty. Both cards take the full width now, and the width goes into columns
          of parts rather than into longer lines (CLAUDE.md, "Breite wird in Spalten ausgegeben"). */}
      <ExportSection project={project} />
      <ImportSection project={project} />
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
  notes,
  children
}: {
  id: TemplatePartId
  checked: boolean
  disabled?: boolean
  onToggle: () => void
  summary: string
  /** Whole sentences the plan attached to this part, when there are any to say out loud. */
  notes?: string[]
  children?: React.ReactNode
}): JSX.Element {
  const { t } = useTranslation()
  return (
    <label
      // Muted text rather than `opacity-45` for the row that cannot be chosen: the opacity put the
      // label at 2.35:1 (docs/REVIEW-2026-09-02.md, d). The checkbox is the UA's and dims itself.
      // `break-inside-avoid`, because the list around it is a multi-column block: without it a
      // row's description can end up in the next column, away from its own checkbox.
      className={`flex break-inside-avoid items-start gap-2.5 rounded-md px-2 py-1.5 text-sm ${
        disabled ? 'text-text-muted' : 'hover:bg-ink/[0.04]'
      }`}
    >
      <input type="checkbox" className="mt-1" checked={checked} disabled={disabled} onChange={onToggle} />
      <span className="min-w-0 flex-1">
        <span className="font-medium">{t(`templates.parts.${id}.label`)}</span>
        <span className="ml-2 text-xs text-text-muted">{summary}</span>
        <span className="mt-0.5 block text-xs text-text-muted">{t(`templates.parts.${id}.description`)}</span>
        {notes?.map((note) => (
          <span key={note} className="mt-0.5 block text-xs text-amber-700 dark:text-amber-400">
            {note}
          </span>
        ))}
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
      <CardHeading icon={Package} className="mb-1">{t('templates.exportHeading')}</CardHeading>
      <p className="mb-4 text-xs text-text-muted">{t('templates.exportHint')}</p>

      {/* Capped: a name and a one-line description read worse, not better, as a 600px field - the
          rest of the card's width belongs to the parts list. */}
      <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
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

      <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-text-secondary">{t('templates.partsHeading')}</p>
      {available === null ? (
        <p className="px-2 py-1.5 text-sm text-text-muted">{t('common.loading')}</p>
      ) : available.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-text-muted">{t('templates.nothingToExport')}</p>
      ) : (
        // Columns rather than one tall list: the twelve parts under each other made the card
        // 1041px tall. Same mechanism as the change list in Git-Sync and the exclude list in
        // Veröffentlichen - a multi-column block, not a grid, because these rows differ in height
        // and a grid aligns them row by row, which puts the gaps back in; `break-inside-avoid`
        // sits on the row. The ladder differs from theirs in the one step that can differ:
        // `2xl` instead of `xl`, because a row here is a name plus a two-line sentence and three
        // columns at 1280px would be 290px each - as narrow as two are at the narrowest window.
        // The lower rung is decoration either way: the window has a minimum width of 960px
        // (`MIN_SIZE`), so `md` and `sm` alike are always true in this app, and an argument about
        // 640px describes a window that does not exist (twenty-fifth review, finding 7).
        // Measured at 1470 and 1280px window width, two columns both times; at 1633 and 1960
        // (reached through zoom) three.
        <div className="gap-x-8 md:columns-2 2xl:columns-3">
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
          <span className="text-xs text-text-muted">
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
        <p className="mt-2 text-xs text-text-muted">
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
        label={t('templates.scopeLabel')}
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
  // Where the package came from when it is the built-in one: its path is the app's cache or its
  // resources folder, which says nothing to anyone, so the line next to the buttons names it instead.
  const [builtinSource, setBuiltinSource] = useState<'downloaded' | 'bundled' | null>(null)
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
    await load(picked, null)
  }

  // The package every new project is offered (builtinTemplateService: the published copy, else the
  // one inside the app), so an existing project can take it whole or in parts without hunting for
  // a file first (Nutzerbefund 2026-10-14). Everything after this is the ordinary import.
  async function pickBuiltin(): Promise<void> {
    reset(null, null)
    setPlanning(true)
    try {
      const builtin = await window.quartzGui.templatePackage.builtin()
      if (builtin) await load(builtin.path, builtin.source)
      else setFailure(t('templates.builtinMissing'))
    } finally {
      setPlanning(false)
    }
  }

  function reset(path: string | null, source: 'downloaded' | 'bundled' | null): void {
    setPackagePath(path)
    setBuiltinSource(source)
    setWarnings(null)
    setFailure(null)
    setProgress(null)
    setPlan(null)
    setUnreadable(false)
  }

  async function load(path: string, source: 'downloaded' | 'bundled' | null): Promise<void> {
    reset(path, source)
    setPlanning(true)
    try {
      const result = await window.quartzGui.templatePackage.plan(project.path, path)
      setPlan(result)
      setUnreadable(result === null)
      // The built-in package is a whole site: sample pages, its plugins and their switches, its
      // layout. In a new project that is the point; on this one it starts with the look only
      // (DESIGN_PARTS) - ticked as it was, one click and a confirmation replaced the user's first
      // navigation, switched plugins on and off and deleted their font files (forty-fifth review,
      // Mittel 2). The rest is one tick away and says what it does.
      const parts = result?.parts.map((p) => p.id) ?? []
      setSelected(source ? parts.filter((id) => DESIGN_PARTS.includes(id)) : parts)
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
    const question = t(strategy === 'packageWins' ? 'templates.confirmOverwrite' : 'templates.confirmMerge', { count: selected.length })
    if (!(await confirmDialog({ text: question, confirmLabel: t('templates.confirmImportAction'), danger: strategy === 'packageWins' }))) return
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
      <CardHeading icon={FolderInput} className="mb-1">{t('templates.importHeading')}</CardHeading>
      <p className="mb-4 text-xs text-text-muted">{t('templates.importHint')}</p>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={pickBuiltin} disabled={running || planning}>
          {t('templates.pickBuiltin')}
        </Button>
        <Button variant="ghost" onClick={pick} disabled={running || planning}>
          {t('templates.pickPackage')}
        </Button>
        {planning ? (
          <span className="text-xs text-text-muted">{t('templates.planning')}</span>
        ) : (
          packagePath && (
            <span className="min-w-0 flex-1 truncate text-xs text-text-muted">
              {builtinSource
                ? t(builtinSource === 'downloaded' ? 'templates.builtinDownloaded' : 'templates.builtinBundled')
                : packagePath}
            </span>
          )
        )}
      </div>

      {unreadable && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{t('templates.previewError')}</p>}

      {plan && (
        <>
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex flex-wrap items-baseline gap-2">
              <FileArchive size={14} className="shrink-0 text-text-muted" />
              <span className="text-sm font-medium">{plan.manifest.name}</span>
              {plan.legacy && <Badge tone="slate">{t('templates.legacyBadge')}</Badge>}
            </div>
            {plan.manifest.description && <p className="mt-1 text-xs text-text-secondary">{plan.manifest.description}</p>}
            <p className="mt-1 text-xs text-text-muted">
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
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">{t('templates.strategyHeading')}</p>
            <SegmentedControl
              label={t('templates.strategyHeading')}
              value={strategy}
              onChange={setStrategy}
              options={[
                { value: 'packageWins', label: t('templates.strategyPackage') },
                { value: 'projectWins', label: t('templates.strategyProject') }
              ]}
            />
            <p className="mt-1.5 text-xs text-text-muted">
              {t(strategy === 'packageWins' ? 'templates.strategyPackageHint' : 'templates.strategyProjectHint')}
            </p>
          </div>

          <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-text-secondary">{t('templates.partsHeading')}</p>
          <div className="gap-x-8 md:columns-2 2xl:columns-3">
            {sortForDisplay(plan.parts).map((part) => (
              <PartRow
                key={part.id}
                id={part.id}
                checked={selected.includes(part.id)}
                disabled={running}
                onToggle={() => toggle(part.id)}
                summary={planSummary(t, part, strategy)}
                notes={planNotes(t, part, strategy)}
              />
            ))}
          </div>

          {missing.length > 0 && (
            <p className="mt-3 text-xs text-text-muted">
              {t('templates.willInstall', { packages: missing.join(', ') })}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={runImport} disabled={running || selected.length === 0}>
              {running ? t('templates.importing') : t('templates.importButton')}
            </Button>
            {running && (
              <span className="text-xs text-text-muted">
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


/* ----------------------------------------------------------------------- helpers */

type Translate = ReturnType<typeof useTranslation>['t']

function statsSummary(t: Translate, id: TemplatePartId, stats: Record<string, number>): string {
  const parts = Object.entries(stats)
    .filter(([key, value]) => value > 0 && !key.startsWith('all') && key !== 'undetermined')
    .map(([key, value]) => t([`templates.stats.${id}.${key}`, `templates.stats.${key}`], { count: value }))
  return parts.join(', ')
}

// What the built-in package brings for the look of a site, as opposed to what it brings for its
// workings (plugins, layout, translations, presets) and its sample pages.
const DESIGN_PARTS: TemplatePartId[] = ['appearance', 'cssVariables', 'theme', 'styles', 'fonts', 'static', 'frames']

// `notes` are the third thing a part's plan can report, next to additions and conflicts, and until
// now nothing rendered them - so the content part could appear with nothing to add and no reason
// given, get ticked, and be skipped with the explanation arriving only afterwards as a warning.
// Two kinds exist: a count of files - byte-identical on both sides, or refused because the name
// would write outside the project - which belongs in the summary next to the other counts, and a
// whole sentence about why this part cannot run, which belongs on its own line.
function noteCount(plan: TemplatePartPlan, kind: string): number {
  return plan.notes.filter((note) => note === kind || note.startsWith(`${kind}:`)).length
}

function planSummary(t: Translate, plan: TemplatePartPlan, strategy: TemplateConflictStrategy): string {
  const bits: string[] = []
  if (plan.additions.length > 0) bits.push(t('templates.planAdditions', { count: plan.additions.length }))
  // Under 'projectWins' a custom.scss that gains the package's lines is not kept; planNotes says
  // what happens to it instead.
  const merged = strategy === 'projectWins' && plan.notes.includes('customScssMerged') ? 1 : 0
  if (plan.conflicts.length - merged > 0) {
    bits.push(t(strategy === 'packageWins' ? 'templates.planReplaced' : 'templates.planKept', { count: plan.conflicts.length - merged }))
  }
  const identical = noteCount(plan, 'identical')
  if (identical > 0) bits.push(t('templates.planIdentical', { count: identical }))
  const outside = noteCount(plan, 'outside')
  if (outside > 0) bits.push(t('templates.planOutside', { count: outside }))
  const invalidFrames = noteCount(plan, 'invalidFrame')
  if (invalidFrames > 0) bits.push(t('templates.planInvalidFrames', { count: invalidFrames }))
  if (bits.length === 0) bits.push(t('templates.planNoChange'))
  return bits.join(', ')
}

// The sentences a part's plan wants said before the click. The count of refused files belongs in
// the summary next to the other counts, but a count is all the summary can be - and unlike
// `identical`, where the number is the whole story because there is nothing to do, a refused file
// has a name and a reason, and the user learned both only *after* the import, from the warning.
// Same shape as the sentence `apply` says later, and same place as the content part's own note.
const OUTSIDE_NAMES_SHOWN = 3

function planNotes(t: Translate, plan: TemplatePartPlan, strategy: TemplateConflictStrategy): string[] {
  const notes: string[] = []
  if (plan.notes.includes('contentIsSymlink')) notes.push(t('templates.planContentIsSymlink'))
  if (noteCount(plan, 'projectIcon') > 0) notes.push(t('templates.planProjectIconKept', { count: noteCount(plan, 'projectIcon') }))
  // A picture that is neither Quartz's nor recorded as chosen here - from another machine, or from
  // an earlier template. Main cannot tell which, so the sentence names the files and the choice.
  // icon-dark.png is one of them since every package ships one (thirty-seventh review, finding 1).
  const unrecorded = plan.notes.filter((note) => note.startsWith('unrecordedIcon:')).map((note) => note.slice('unrecordedIcon:'.length))
  if (unrecorded.length > 0) {
    notes.push(
      t(strategy === 'packageWins' ? 'templates.planUnrecordedIconReplaced' : 'templates.planUnrecordedIconKept', {
        count: unrecorded.length,
        names: unrecorded.map((name) => t('templates.quotedName', { value: name })).join(t('templates.namesAnd'))
      })
    )
  }
  // A package of the twelve on a project that loads the 31, or the other way round: which of the
  // two the project loads afterwards depends on the strategy (otherFormStylesheetsOf in
  // templatePackage/parts.ts).
  const legacy = plan.notes.find((note) => note.startsWith('legacyStyles:'))
  if (legacy) {
    const count = Number(legacy.slice('legacyStyles:'.length))
    notes.push(t(strategy === 'packageWins' ? 'templates.planLegacyStylesReplaced' : 'templates.planLegacyStylesKept', { count }))
  }
  const newer = plan.notes.find((note) => note.startsWith('newerStyles:'))
  if (newer) {
    const count = Number(newer.slice('newerStyles:'.length))
    notes.push(t(strategy === 'packageWins' ? 'templates.planNewerStylesReplaced' : 'templates.planNewerStylesKept', { count }))
  }
  if (strategy === 'projectWins' && plan.notes.includes('customScssMerged')) notes.push(t('templates.planCustomScssMerged'))
  // What replacing does besides the options and files it counts - only under 'packageWins', where
  // it happens.
  const listed = (kind: string): string[] =>
    plan.notes.filter((note) => note.startsWith(`${kind}:`)).flatMap((note) => note.slice(kind.length + 1).split(','))
  const quoted = (names: string[]): string => names.map((name) => t('templates.quotedName', { value: name })).join(', ')
  if (strategy === 'packageWins') {
    const on = listed('pluginOn')
    const off = listed('pluginOff')
    if (on.length > 0) notes.push(t('templates.planPluginsOn', { count: on.length, names: quoted(on) }))
    if (off.length > 0) notes.push(t('templates.planPluginsOff', { count: off.length, names: quoted(off) }))
    const byPosition = listed('byPosition')
    if (byPosition.length > 0) notes.push(t('templates.planByPosition', { count: byPosition.length, names: quoted(byPosition) }))
    const fonts = listed('fontsRemoved')
    if (fonts.length > 0) notes.push(t('templates.planFontsRemoved', { count: fonts.length, names: quoted(fonts) }))
    // quartz-forms is merged rather than replaced (mergeFormsOptions in templatePackage/parts.ts),
    // so it is one of the conflicts the summary counts as replaced, and this says what it keeps.
    const formsMerged = plan.notes.find((note) => note.startsWith('formsMerged:'))
    if (formsMerged !== undefined) {
      const added = formsMerged.slice('formsMerged:'.length).split(',').filter(Boolean)
      notes.push(added.length > 0 ? t('templates.planFormsMerged', { count: added.length, names: quoted(added) }) : t('templates.planFormsKept'))
      const pinned = plan.notes.find((note) => note.startsWith('formsPinned:'))?.slice('formsPinned:'.length)
      if (pinned) notes.push(t('templates.planFormsPinned', { count: added.length, kind: t(`formsEditor.transportKinds.${pinned}`, pinned) }))
      const own = listed('formsOwn')
      if (own.length > 0) notes.push(t('templates.planFormsOwn', { count: own.length, names: quoted(own) }))
    }
  }
  const missing = plan.notes.find((note) => note.startsWith('missingVariables:'))
  if (missing) {
    const names = missing.slice('missingVariables:'.length).split(',')
    const shown = names.slice(0, OUTSIDE_NAMES_SHOWN).join(', ')
    notes.push(
      t('templates.planMissingVariables', {
        count: names.length,
        names: names.length > OUTSIDE_NAMES_SHOWN ? t('templates.planOutsideMore', { names: shown, count: names.length - OUTSIDE_NAMES_SHOWN }) : shown
      })
    )
  }
  const outside = plan.notes.filter((note) => note.startsWith('outside:')).map((note) => note.slice('outside:'.length))
  if (outside.length > 0) {
    // All of them would be a paragraph in a row that is one line; the count in the summary already
    // says how many there are, so the names are what this line adds.
    const shown = outside
      .slice(0, OUTSIDE_NAMES_SHOWN)
      // Quoted one by one, not as a list: the quotation marks differ per language and belong
      // around a name, not around "… und 2 weitere".
      .map((name) => t('templates.quotedName', { value: name }))
      .join(', ')
    const names =
      outside.length > OUTSIDE_NAMES_SHOWN
        ? t('templates.planOutsideMore', { names: shown, count: outside.length - OUTSIDE_NAMES_SHOWN })
        : shown
    notes.push(t('templates.planOutsideDetail', { names, count: outside.length }))
  }
  // Not the same shape as `outside`, and the difference is the reason: main sends each of these as
  // a finished "name — why" sentence (it knows the reason at plan time), and a comma-joined list of
  // sentences is unreadable. So one line per frame, capped like the names above, with the rest
  // counted. Already quoted by main, because the quotation marks differ per language.
  const invalid = plan.notes.filter((note) => note.startsWith('invalidFrame:')).map((note) => note.slice('invalidFrame:'.length))
  for (const detail of invalid.slice(0, OUTSIDE_NAMES_SHOWN)) {
    notes.push(t('templates.planInvalidFrameDetail', { detail }))
  }
  if (invalid.length > OUTSIDE_NAMES_SHOWN) {
    notes.push(t('templates.planInvalidFramesMore', { count: invalid.length - OUTSIDE_NAMES_SHOWN }))
  }
  return notes
}

function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
