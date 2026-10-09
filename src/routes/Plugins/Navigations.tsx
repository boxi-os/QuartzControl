import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Copy, Navigation, Plus, Shapes, SlidersHorizontal, Trash2, type LucideIcon } from 'lucide-react'
import { quartzPluginName } from '@shared/quartzPluginName'
import type { LayoutPosition, PluginEntry, QuartzConfig } from '@shared/ipc-contract'
import { Badge, Button, Card, CardHeading, DetailLayout, FoldBox, IconButton, InfoNote, PanelSection, SegmentedControl, SelectableRow, Toggle } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import PluginOptionsForm from '../../components/PluginOptionsForm'
import { siteLanguages } from '../../components/PluginOptionsForm/siteLanguages'
import SitePreview from '../../components/SitePreview'
import { announce } from '../../state/announcer'
import { primeStickyState, useStickyState } from '../../state/uiState'
import { useIpcQuery } from '../../state/useIpcQuery'
import { confirmDialog } from '../../utils/confirm'
import { componentRef, duplicateAfter, getLayout } from '../LayoutEditor/utils'
import { useProject } from '../ProjectLayout'
import { ReadAgainstNote } from './ReadAgainstNote'
import { SavesImmediately } from './SavesImmediately'
import { NAVIGATIONS_PLUGIN, NAVIGATIONS_READ_AGAINST, NAV_VARIANTS, hasNoEffect, variantOf, type NavVariant } from './navigationVariants'

interface NavInstance {
  plugin: PluginEntry
  index: number
  /** 1-based among the navigations, in config order - the "#n" the plugin list and stage show. */
  occurrence: number
}

/**
 * The editor for quartz-navigations (plan 1.1, phase 5): one navigation is one config entry of the
 * plugin. It starts from the question the generic form leaves for last - which kind of navigation -
 * and shows the options that kind reads; what it does not read (navigationVariants.ts) folds away
 * below instead of disappearing, so a value set there stays in sight. Beside it, the real site.
 *
 * Everything else about an entry stays where it is: placement on the layout stage, every option in
 * the plugin list ("Alle Optionen"). The writes follow the plugin list's rules (Installed.tsx):
 * each one against the newest state, queued, and re-read once the queue is empty.
 */
export default function Navigations({ onShowAllOptions }: { onShowAllOptions: (stickyKey: string) => void }): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const navigate = useNavigate()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  // Which navigation the panel shows, by its #n among the navigations - the same key the plugin
  // list uses for a second instance of a plugin (stickyKey there). Instances have no name of their
  // own; `id` is optional and most entries leave it out.
  const [selected, setSelected] = useStickyState<number | null>('navigations.selected', null)
  const [adding, setAdding] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reload = useCallback(async (): Promise<void> => {
    try {
      setConfig(await window.quartzGui.config.get(project.path))
      setLoadError(null)
    } catch (err) {
      setLoadError(formatIpcError(err))
    }
  }, [project.path])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    },
    []
  )

  const instances: NavInstance[] = []
  config?.plugins.forEach((plugin, index) => {
    if (quartzPluginName(plugin.source) === NAVIGATIONS_PLUGIN) instances.push({ plugin, index, occurrence: instances.length + 1 })
  })
  const current = instances.find((i) => i.occurrence === selected) ?? null

  const variantLabel = (v: NavVariant): string => t(`navigationsEditor.variants.${v}.label`)
  const instanceLabel = (item: NavInstance): string => {
    const title = item.plugin.options?.title
    const base = typeof title === 'string' && title.trim() ? title.trim() : variantLabel(variantOf(item.plugin.options))
    return instances.length > 1 ? `${base} #${item.occurrence}` : base
  }

  // The plugin list's queue (Installed.tsx, updateField): the edit goes into state at once, saves
  // run one after the other, and only the last of a run re-reads the file.
  const configRef = useRef(config)
  configRef.current = config
  const writes = useRef<Promise<unknown>>(Promise.resolve())
  async function write(next: QuartzConfig, said?: string): Promise<void> {
    configRef.current = next
    setConfig(next)
    const pending = writes.current.then(() => window.quartzGui.config.save(project.path, next))
    writes.current = pending.catch(() => {})
    try {
      await pending
    } catch (err) {
      await reload()
      setMessage(formatIpcError(err))
      return
    }
    setMessage(null)
    setSavedFlash(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSavedFlash(false), 2000)
    if (said) announce(said)
    if (configRef.current === next) await reload()
  }

  function updateEntry(index: number, change: (p: PluginEntry) => PluginEntry, said?: string): void {
    const base = configRef.current
    if (!base) return
    void write({ ...base, plugins: base.plugins.map((p, i) => (i === index ? change(p) : p)) }, said)
  }

  function setOptions(index: number, options: Record<string, unknown> | undefined): void {
    updateEntry(index, (p) => {
      const next = { ...p }
      if (options) next.options = options
      else delete next.options
      return next
    })
  }

  async function addNavigation(variant: NavVariant): Promise<void> {
    const base = configRef.current
    const first = instances[0]
    if (!base || !first) return
    const position: LayoutPosition = NAV_VARIANTS.find((v) => v.value === variant)!.position
    // Last in its position, ten after whatever is there - the stage renumbers on the next move.
    const priorities = base.plugins.map((p) => getLayout(p)).filter((l) => l?.position === position).map((l) => l!.priority)
    const entry: PluginEntry = {
      name: NAVIGATIONS_PLUGIN,
      source: first.plugin.source,
      enabled: true,
      ...(first.plugin.order !== undefined ? { order: first.plugin.order } : {}),
      options: { variant },
      layout: { position, priority: (priorities.length ? Math.max(...priorities) : 0) + 10 }
    }
    setAdding(false)
    setSelected(instances.length + 1)
    await write(
      { ...base, plugins: [...base.plugins, entry] },
      t('navigationsEditor.addedAnnounce', { variant: variantLabel(variant), position: t(`positions.${position}`, position) })
    )
  }

  async function duplicate(item: NavInstance): Promise<void> {
    const base = configRef.current
    if (!base) return
    const result = duplicateAfter(base.plugins, item.index)
    if (!result) return
    // A copied `id` would give both navigations the same element ids and localStorage key - the
    // README's reason to set one at all. The copy goes without it.
    const plugins = result.plugins.map((p, i) => {
      if (i !== result.newIndex || !p.options || !('id' in p.options)) return p
      const { id: _id, ...rest } = p.options
      return { ...p, options: rest }
    })
    setSelected(instances.length + 1)
    await write({ ...base, plugins }, t('navigationsEditor.duplicatedAnnounce', { name: instanceLabel(item) }))
  }

  async function remove(item: NavInstance): Promise<void> {
    const base = configRef.current
    if (!base) return
    const name = instanceLabel(item)
    if (!(await confirmDialog({ text: t('navigationsEditor.removeConfirm', { name }), confirmLabel: t('common.remove'), danger: true }))) return
    if (selected === item.occurrence) setSelected(null)
    else if (selected !== null && selected > item.occurrence) setSelected(selected - 1)
    await write({ ...base, plugins: base.plugins.filter((_, i) => i !== item.index) }, t('navigationsEditor.removedAnnounce', { name }))
  }

  function openOnStage(item: NavInstance): void {
    if (!config) return
    const target = `/project/${project.id}/layout`
    primeStickyState(target, 'layout.pageType', null)
    primeStickyState(target, 'layout.selected', componentRef(config.plugins, item.index))
    primeStickyState(target, 'layout.tab', 'global')
    navigate(target)
  }

  if (loadError) return <p className="text-ui text-red-600 dark:text-red-400">{loadError}</p>
  if (!config) return <p className="text-ui text-text-muted">{t('common.loading')}</p>

  if (instances.length === 0) {
    return (
      <Card className="flex max-w-[95ch] flex-col items-start gap-2">
        <CardHeading icon={Navigation}>{t('navigationsEditor.notInstalledTitle')}</CardHeading>
        <p className="text-ui text-text-secondary">{t('navigationsEditor.notInstalledText')}</p>
      </Card>
    )
  }

  const tileOptions = NAV_VARIANTS.map((v) => ({
    value: v.value,
    label: variantLabel(v.value),
    icon: v.icon,
    description: t(`navigationsEditor.variants.${v.value}.text`)
  }))

  return (
    <DetailLayout
      panelWidth="wide"
      panelLabel={t('navigationsEditor.panelLabel')}
      onDismiss={() => setSelected(null)}
      panel={
        current ? (
          <NavigationPanel
            key={current.occurrence}
            item={current}
            label={instanceLabel(current)}
            saved={savedFlash}
            languages={siteLanguages(config)}
            tileOptions={tileOptions}
            onToggle={() =>
              updateEntry(current.index, (p) => ({ ...p, enabled: !p.enabled }))
            }
            onOptions={(next) => setOptions(current.index, next)}
            onOpenOnStage={() => openOnStage(current)}
            onShowAllOptions={() =>
              onShowAllOptions(current.occurrence === 1 ? current.plugin.name : `${current.plugin.name}#${current.occurrence}`)
            }
          />
        ) : (
          <Card className="flex flex-col gap-2">
            <CardHeading icon={Navigation}>{t('navigationsEditor.panelEmptyTitle')}</CardHeading>
            <p className="text-ui text-text-secondary">{t('navigationsEditor.panelEmptyText')}</p>
          </Card>
        )
      }
    >
      <InfoNote>{t('navigationsEditor.intro')}</InfoNote>
      {message && (
        <p role="alert" className="text-ui text-red-600 dark:text-red-400">
          {message}
        </p>
      )}
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardHeading icon={Navigation}>{t('navigationsEditor.listTitle', { count: instances.length })}</CardHeading>
          <Button variant="ghost" onClick={() => setAdding(!adding)} aria-expanded={adding}>
            <Plus size={14} aria-hidden />
            {t('navigationsEditor.add')}
          </Button>
        </div>
        {adding && (
          <div className="flex flex-col gap-2 rounded-md border border-dashed border-ink/15 p-3 dark:border-ink/15">
            <p className="text-ui text-text-secondary">{t('navigationsEditor.addQuestion')}</p>
            <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-5">
              {tileOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => void addNavigation(o.value)}
                  className="flex flex-col items-start gap-0.5 rounded-[7px] border border-ink/10 bg-surface px-2.5 py-2 text-left hover:border-ink/25"
                >
                  <span className="flex items-center gap-1.5 text-ui font-medium text-text">
                    <o.icon size={15} aria-hidden className="shrink-0 text-text-secondary" />
                    {o.label}
                  </span>
                  <span className="text-micro text-text-muted">{o.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <ul className="flex flex-col gap-1.5">
          {instances.map((item) => {
            const variant = variantOf(item.plugin.options)
            const Icon = NAV_VARIANTS.find((v) => v.value === variant)!.icon
            const layout = getLayout(item.plugin)
            const isSelected = item.occurrence === selected
            return (
              <SelectableRow
                key={item.index}
                selected={isSelected}
                onSelect={() => setSelected(item.occurrence)}
                leading={<Icon size={16} aria-hidden className="shrink-0 text-text-secondary" />}
                title={instanceLabel(item)}
                subtitle={[variantLabel(variant), layout ? t(`positions.${layout.position}`, layout.position) : t('navigationsEditor.notPlaced')].join(' · ')}
                trailing={
                  <>
                    {!item.plugin.enabled && <Badge>{t('navigationsEditor.off')}</Badge>}
                    <IconButton
                      icon={Copy}
                      tone="neutral"
                      title={t('navigationsEditor.duplicateNamed', { name: instanceLabel(item) })}
                      onClick={() => void duplicate(item)}
                    />
                    {/* The last one is the plugin itself; removing that is the plugin list's job,
                        where it says what it does to the installed package. */}
                    {instances.length > 1 && (
                      <IconButton
                        icon={Trash2}
                        title={t('common.removeNamed', { name: instanceLabel(item) })}
                        onClick={() => void remove(item)}
                      />
                    )}
                  </>
                }
              />
            )
          })}
        </ul>
      </Card>
      <SitePreview
        projectId={project.id}
        projectPath={project.path}
        stickyPrefix="navigations"
        hint={t('navigationsEditor.previewHint')}
      />
    </DetailLayout>
  )
}

function NavigationPanel({
  item,
  label,
  saved,
  languages,
  tileOptions,
  onToggle,
  onOptions,
  onOpenOnStage,
  onShowAllOptions
}: {
  item: NavInstance
  label: string
  saved: boolean
  languages: string[]
  tileOptions: { value: NavVariant; label: string; icon: LucideIcon; description: string }[]
  onToggle: () => void
  onOptions: (next: Record<string, unknown> | undefined) => void
  onOpenOnStage: () => void
  onShowAllOptions: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const { plugin } = item
  const values = plugin.options ?? {}
  const variant = variantOf(values)
  const layout = getLayout(plugin)
  const sourceKey = JSON.stringify(plugin.source)
  const schemaQuery = useIpcQuery(
    () => window.quartzGui.plugins.optionSchema({ projectPath: project.path, source: plugin.source }),
    [project.path, sourceKey]
  )
  const [restOpen, setRestOpen] = useStickyState('navigations.noEffectOpen', false)

  const noEffect = (key: string): boolean => hasNoEffect(key, variant, values.mobile)
  const pickMain = useCallback((key: string) => key !== 'variant' && !hasNoEffect(key, variant, values.mobile), [variant, values.mobile])
  const pickRest = useCallback((key: string) => hasNoEffect(key, variant, values.mobile), [variant, values.mobile])
  const restKeys = (schemaQuery.data?.schema?.fields ?? []).map((f) => f.key).filter(noEffect)
  const restSet = restKeys.filter((k) => k in values).length

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardHeading icon={Navigation}>
          <span className="break-words">{label}</span>
        </CardHeading>
        <div className="flex flex-wrap items-center gap-2">
          {layout ? (
            <span className="text-micro text-text-secondary">{t(`positions.${layout.position}`, layout.position)}</span>
          ) : (
            <span className="text-micro text-text-secondary">{t('navigationsEditor.notPlaced')}</span>
          )}
          <SavesImmediately saved={saved} />
        </div>
        <ReadAgainstNote plugin={NAVIGATIONS_PLUGIN} readAgainst={NAVIGATIONS_READ_AGAINST} installed={schemaQuery.data?.packageVersion} />
      </div>

      <Toggle label={t('navigationsEditor.enabled')} checked={plugin.enabled} onChange={onToggle} />

      <PanelSection icon={Shapes} title={t('navigationsEditor.variantHeading')} className="gap-2">
        <SegmentedControl
          variant="tiles"
          label={t('navigationsEditor.variantHeading')}
          value={variant}
          onChange={(v) => onOptions({ ...values, variant: v })}
          options={tileOptions}
        />
      </PanelSection>

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={onOpenOnStage}>
          {t('pluginsInstalled.showOnStage')}
        </Button>
        <Button variant="ghost" onClick={onShowAllOptions}>
          {t('navigationsEditor.allOptions')}
        </Button>
      </div>

      <PanelSection icon={SlidersHorizontal} title={t('navigationsEditor.optionsHeading')}>
        {schemaQuery.loading ? (
          <p className="text-micro text-text-muted">{t('layoutEditor.inspector.optionsLoading')}</p>
        ) : schemaQuery.error || !schemaQuery.data ? (
          <p className="text-micro text-red-600 dark:text-red-400">{t('layoutEditor.inspector.optionsError', { reason: schemaQuery.error ?? '' })}</p>
        ) : (
          <>
            <PluginOptionsForm
              schema={schemaQuery.data.schema}
              values={values}
              onChange={onOptions}
              explicitEmpty
              languages={languages}
              projectPath={project.path}
              pick={pickMain}
            />
            {restKeys.length > 0 && (
              <FoldBox
                title={t('navigationsEditor.noEffectHeading', { variant: t(`navigationsEditor.variants.${variant}.label`) })}
                aside={restSet > 0 ? t('pluginOptions.groupCountChanged', { count: restKeys.length, changed: restSet }) : restKeys.length}
                open={restOpen}
                onToggle={() => setRestOpen(!restOpen)}
                bodyClassName="gap-3"
              >
                <p className="text-micro text-text-muted">{t('navigationsEditor.noEffectText')}</p>
                <PluginOptionsForm
                  schema={schemaQuery.data.schema}
                  values={values}
                  onChange={onOptions}
                  explicitEmpty
                  languages={languages}
                  projectPath={project.path}
                  pick={pickRest}
                  freeKeys={false}
                />
              </FoldBox>
            )}
          </>
        )}
      </PanelSection>
    </Card>
  )
}
