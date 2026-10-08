import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Code2, Copy, FileText, PanelTop, Plus, Trash2 } from 'lucide-react'
import type { LayoutPosition, PluginEntry, QuartzConfig } from '@shared/ipc-contract'
import { Badge, Button, Card, CardHeading, DetailLayout, IconButton, InfoNote, SegmentedControl, SelectableRow, Toggle } from '../../components/ui'
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
import ExtraContentFiles from './ExtraContentFiles'
import {
  LAYOUT_BOX_PLUGIN,
  boxContentKind,
  boxDir,
  boxesOf,
  langsWithOwnText,
  renameSnippetRefs,
  snippetRefs,
  type BoxContentKind,
  type BoxInstance
} from './layoutBoxes'

/**
 * The editor for quartz-layout-box (plan 1.1, phase 6): one box is one config entry of the plugin.
 * It starts from the question the generic form leaves to two separate fields - is the content text
 * in the configuration or a file - and shows the options for that answer; the other one, if it is
 * still set, folds away below as "ohne Wirkung" (html wins over file, layoutBoxes.ts). Below the
 * list, the files the boxes show; beside it, the real site.
 *
 * The writes follow the plugin list's rules (Installed.tsx), as in Navigations.tsx: each one against
 * the newest state, queued, and re-read once the queue is empty.
 */
export default function ExtraContent({ onShowAllOptions }: { onShowAllOptions: (stickyKey: string) => void }): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const navigate = useNavigate()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  // By #n among the boxes, as the plugin list keys a second instance (stickyKey there).
  const [selected, setSelected] = useStickyState<number | null>('extraContent.selected', null)
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

  const boxes = boxesOf(config)
  const current = boxes.find((b) => b.occurrence === selected) ?? null

  // A box has no name of its own. Its title says most; without one, the file it shows or the class
  // a stylesheet knows it by. The #n only where two would read the same.
  const baseLabel = (box: BoxInstance): string => {
    const o = box.plugin.options ?? {}
    if (typeof o.title === 'string' && o.title.trim()) return o.title.trim()
    if (boxContentKind(o) === 'file') return snippetRefs(o)[0]?.file ?? t('extraContent.unnamed')
    if (typeof o.className === 'string' && o.className.trim()) return o.className.trim().split(/\s+/)[0].replace(/^layout-box-/, '')
    return t('extraContent.unnamed')
  }
  const labelOf = (box: BoxInstance): string => {
    const base = baseLabel(box)
    return boxes.some((b) => b !== box && baseLabel(b) === base) ? `${base} #${box.occurrence}` : base
  }

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

  function updateEntry(index: number, change: (p: PluginEntry) => PluginEntry): void {
    const base = configRef.current
    if (!base) return
    void write({ ...base, plugins: base.plugins.map((p, i) => (i === index ? change(p) : p)) })
  }

  function setOptions(index: number, options: Record<string, unknown> | undefined): void {
    updateEntry(index, (p) => {
      const next = { ...p }
      if (options) next.options = options
      else delete next.options
      return next
    })
  }

  async function addBox(): Promise<void> {
    const base = configRef.current
    const first = boxes[0]
    if (!base || !first) return
    // The plugin's own default place (its manifest: left, 15) - last there, ten after the rest.
    const position: LayoutPosition = 'left'
    const priorities = base.plugins.map((p) => getLayout(p)).filter((l) => l?.position === position).map((l) => l!.priority)
    const entry: PluginEntry = {
      name: LAYOUT_BOX_PLUGIN,
      source: first.plugin.source,
      enabled: true,
      ...(first.plugin.order !== undefined ? { order: first.plugin.order } : {}),
      options: { title: t('extraContent.newTitle'), html: t('extraContent.newHtml') },
      layout: { position, priority: (priorities.length ? Math.max(...priorities) : 0) + 10 }
    }
    setSelected(boxes.length + 1)
    await write({ ...base, plugins: [...base.plugins, entry] }, t('extraContent.addedAnnounce', { position: t(`positions.${position}`, position) }))
  }

  async function duplicate(box: BoxInstance): Promise<void> {
    const base = configRef.current
    if (!base) return
    const result = duplicateAfter(base.plugins, box.index)
    if (!result) return
    // The copy lands right after the original, so it is the next box by number.
    setSelected(box.occurrence + 1)
    await write({ ...base, plugins: result.plugins }, t('extraContent.duplicatedAnnounce', { name: labelOf(box) }))
  }

  async function remove(box: BoxInstance): Promise<void> {
    const base = configRef.current
    if (!base) return
    const name = labelOf(box)
    if (!(await confirmDialog({ text: t('extraContent.removeConfirm', { name }), confirmLabel: t('common.remove'), danger: true }))) return
    if (selected === box.occurrence) setSelected(null)
    else if (selected !== null && selected > box.occurrence) setSelected(selected - 1)
    await write({ ...base, plugins: base.plugins.filter((_, i) => i !== box.index) }, t('extraContent.removedAnnounce', { name }))
  }

  async function snippetRenamed(dir: string, from: string, to: string): Promise<void> {
    const base = configRef.current
    if (!base) return
    const { plugins, count } = renameSnippetRefs(base.plugins, dir, from, to)
    if (count === 0) {
      announce(t('extraContent.files.renamedAnnounce', { from, to }))
      return
    }
    await write({ ...base, plugins }, t('extraContent.files.renamedWithBoxes', { from, to, count }))
  }

  function openOnStage(box: BoxInstance): void {
    if (!config) return
    const target = `/project/${project.id}/layout`
    primeStickyState(target, 'layout.pageType', null)
    primeStickyState(target, 'layout.selected', componentRef(config.plugins, box.index))
    primeStickyState(target, 'layout.tab', 'global')
    navigate(target)
  }

  if (loadError) return <p className="text-ui text-red-600 dark:text-red-400">{loadError}</p>
  if (!config) return <p className="text-ui text-text-muted">{t('common.loading')}</p>

  if (boxes.length === 0) {
    return (
      <Card className="flex max-w-[95ch] flex-col items-start gap-2">
        <CardHeading icon={PanelTop}>{t('extraContent.notInstalledTitle')}</CardHeading>
        <p className="text-ui text-text-secondary">{t('extraContent.notInstalledText')}</p>
      </Card>
    )
  }

  return (
    <DetailLayout
      panelWidth="wide"
      panelLabel={t('extraContent.panelLabel')}
      onDismiss={() => setSelected(null)}
      panel={
        current ? (
          <BoxPanel
            key={current.occurrence}
            box={current}
            label={labelOf(current)}
            saved={savedFlash}
            languages={siteLanguages(config)}
            onToggle={() => updateEntry(current.index, (p) => ({ ...p, enabled: !p.enabled }))}
            onOptions={(next) => setOptions(current.index, next)}
            onOpenOnStage={() => openOnStage(current)}
            onShowAllOptions={() =>
              onShowAllOptions(current.occurrence === 1 ? current.plugin.name : `${current.plugin.name}#${current.occurrence}`)
            }
          />
        ) : (
          <Card className="flex flex-col gap-2">
            <CardHeading icon={PanelTop}>{t('extraContent.panelEmptyTitle')}</CardHeading>
            <p className="text-ui text-text-secondary">{t('extraContent.panelEmptyText')}</p>
          </Card>
        )
      }
    >
      <InfoNote>{t('extraContent.intro')}</InfoNote>
      {message && (
        <p role="alert" className="text-ui text-red-600 dark:text-red-400">
          {message}
        </p>
      )}
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardHeading icon={PanelTop}>{t('extraContent.listTitle', { count: boxes.length })}</CardHeading>
          <Button variant="ghost" onClick={() => void addBox()}>
            <Plus size={14} aria-hidden />
            {t('extraContent.add')}
          </Button>
        </div>
        <ul className="flex flex-col gap-1.5">
          {boxes.map((box) => {
            const options = box.plugin.options ?? {}
            const kind = boxContentKind(options)
            const Icon = kind === 'html' ? Code2 : FileText
            const layout = getLayout(box.plugin)
            const isSelected = box.occurrence === selected
            const name = labelOf(box)
            const where = layout
              ? [t(`positions.${layout.position}`, layout.position), ...(layout.display === 'desktop-only' ? [t('layoutEditor.displayDesktopOnly')] : layout.display === 'mobile-only' ? [t('layoutEditor.displayMobileOnly')] : [])]
              : [t('extraContent.notPlaced')]
            return (
              <SelectableRow
                key={box.index}
                selected={isSelected}
                onSelect={() => setSelected(box.occurrence)}
                leading={<Icon size={16} aria-hidden className="shrink-0 text-text-secondary" />}
                title={name}
                subtitle={[
                  kind === 'html' ? t('extraContent.kindText') : t('extraContent.kindFile', { file: `${boxDir(options)}/${snippetRefs(options)[0]?.file ?? ''}` }),
                  ...where
                ].join(' · ')}
                trailing={
                  <>
                    {!box.plugin.enabled && <Badge>{t('extraContent.off')}</Badge>}
                    <IconButton icon={Copy} tone="neutral" title={t('extraContent.duplicateNamed', { name })} onClick={() => void duplicate(box)} />
                    {/* The last one is the plugin itself; removing that is the plugin list's job. */}
                    {boxes.length > 1 && <IconButton icon={Trash2} title={t('common.removeNamed', { name })} onClick={() => void remove(box)} />}
                  </>
                }
              />
            )
          })}
        </ul>
      </Card>
      <ExtraContentFiles projectPath={project.path} boxes={boxes} labelOf={labelOf} onSnippetRenamed={snippetRenamed} />
      <SitePreview projectId={project.id} projectPath={project.path} stickyPrefix="extraContent" hint={t('extraContent.previewHint')} />
    </DetailLayout>
  )
}

function BoxPanel({
  box,
  label,
  saved,
  languages,
  onToggle,
  onOptions,
  onOpenOnStage,
  onShowAllOptions
}: {
  box: BoxInstance
  label: string
  saved: boolean
  languages: string[]
  onToggle: () => void
  onOptions: (next: Record<string, unknown> | undefined) => void
  onOpenOnStage: () => void
  onShowAllOptions: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const { plugin } = box
  const values = plugin.options ?? {}
  const kind = boxContentKind(values)
  const layout = getLayout(plugin)
  const sourceKey = JSON.stringify(plugin.source)
  const schemaQuery = useIpcQuery(
    () => window.quartzGui.plugins.optionSchema({ projectPath: project.path, source: plugin.source }),
    [project.path, sourceKey]
  )
  const [restOpen, setRestOpen] = useStickyState('extraContent.noEffectOpen', false)

  // While text is set, `file` (and the folder it is read from) does nothing - the only pair of
  // options in this plugin where one silences the other.
  const silenced = useCallback((key: string) => kind === 'html' && (key === 'file' || key === 'dir'), [kind])
  const pickMain = useCallback((key: string) => !silenced(key) && !(kind === 'file' && key === 'html'), [kind, silenced])
  const restKeys = ['file', 'dir'].filter((k) => silenced(k) && k in values)
  const ownText = kind === 'file' ? langsWithOwnText(values) : []

  async function switchTo(next: BoxContentKind): Promise<void> {
    if (next === kind) return
    if (next === 'file') {
      const text = typeof values.html === 'string' ? values.html : ''
      if (
        text.trim() &&
        !(await confirmDialog({ text: t('extraContent.toFileConfirm'), confirmLabel: t('extraContent.toFileConfirmLabel'), danger: true }))
      )
        return
      const { html: _html, ...rest } = values
      onOptions(Object.keys(rest).length ? rest : undefined)
      return
    }
    // Into text: an HTML file the box showed becomes the starting text, so the box looks the same
    // until it is edited. Markdown is not HTML and is left behind; the file option stays (folded
    // below) so a switch back finds it. Without a text to start from, the new box's sample text:
    // an empty one renders nothing (layout-box returns null), and the box would just vanish.
    const ref = snippetRefs(values)[0]
    let html = ''
    if (ref && /\.html?$/i.test(ref.file)) {
      html = await window.quartzGui.snippets.read({ projectPath: project.path, dir: boxDir(values), file: ref.file }).catch(() => '')
    }
    onOptions({ ...values, html: html.trim() ? html : t('extraContent.newHtml') })
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardHeading icon={PanelTop}>
          <span className="break-words">{label}</span>
        </CardHeading>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-micro text-text-secondary">{layout ? t(`positions.${layout.position}`, layout.position) : t('extraContent.notPlaced')}</span>
          {saved && <span className="text-micro text-green-600 dark:text-green-400">{t('pluginsInstalled.savedFlash')}</span>}
        </div>
      </div>

      <Toggle label={t('extraContent.enabled')} checked={plugin.enabled} onChange={onToggle} />

      <section className="flex flex-col gap-2 border-t border-ink/[0.06] pt-3 dark:border-ink/10">
        <h3 className="text-micro font-semibold uppercase tracking-wide text-text-secondary">{t('extraContent.contentHeading')}</h3>
        <SegmentedControl
          variant="tiles"
          label={t('extraContent.contentHeading')}
          value={kind}
          onChange={(v) => void switchTo(v)}
          options={[
            { value: 'html', label: t('extraContent.contentText'), icon: Code2, description: t('extraContent.contentTextHint') },
            { value: 'file', label: t('extraContent.contentFile'), icon: FileText, description: t('extraContent.contentFileHint') }
          ]}
        />
        {ownText.length > 0 && <p className="text-micro text-text-muted">{t('extraContent.langOverride', { langs: ownText.join(', ') })}</p>}
      </section>

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={onOpenOnStage}>
          {t('pluginsInstalled.showOnStage')}
        </Button>
        <Button variant="ghost" onClick={onShowAllOptions}>
          {t('extraContent.allOptions')}
        </Button>
      </div>

      <section className="flex flex-col gap-3 border-t border-ink/[0.06] pt-3 dark:border-ink/10">
        <h3 className="text-micro font-semibold uppercase tracking-wide text-text-secondary">{t('extraContent.optionsHeading')}</h3>
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
              <div className="flex flex-col gap-3 rounded-md border border-ink/10 px-2.5 py-2 dark:border-ink/10">
                <button
                  type="button"
                  aria-expanded={restOpen}
                  onClick={() => setRestOpen(!restOpen)}
                  className="flex items-center gap-1.5 text-left text-micro font-semibold uppercase tracking-wide text-text-secondary hover:text-text"
                >
                  <ChevronRight size={13} aria-hidden className={`shrink-0 transition-transform ${restOpen ? 'rotate-90' : ''}`} />
                  <span className="min-w-0 flex-1">{t('extraContent.noEffectHeading')}</span>
                  <span className="shrink-0 font-normal normal-case tracking-normal text-text-muted">{restKeys.length}</span>
                </button>
                {restOpen && (
                  <>
                    <p className="text-micro text-text-muted">{t('extraContent.noEffectText')}</p>
                    <PluginOptionsForm
                      schema={schemaQuery.data.schema}
                      values={values}
                      onChange={onOptions}
                      explicitEmpty
                      languages={languages}
                      projectPath={project.path}
                      pick={(key) => restKeys.includes(key)}
                      freeKeys={false}
                    />
                  </>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </Card>
  )
}
