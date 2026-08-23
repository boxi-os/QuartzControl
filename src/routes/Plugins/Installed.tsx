import { useEffect, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Link } from 'react-router-dom'
import { useProject } from '../ProjectLayout'
import type { PluginEntry, PluginLayoutDeclaration, PluginOptionField, QuartzConfig } from '@shared/ipc-contract'
import { Badge, Button, Card, PageHeader, Select, TextInput, Toggle } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { TAB_ICONS } from '../navConfig'

// Quartz plugins fall into distinct kinds - transformers, filters, page types, emitters,
// components (see https://quartz.jzhao.xyz/plugins/) - but that exact category isn't stored
// in quartz.config.yaml, and some plugins span more than one kind anyway (Quartz's own loader
// sometimes fails to detect a plugin's category, see the earlier obsidian-plugin-excalidraw
// warning). What *is* reliable, straight from the config: a plugin has a `layout` block (with
// `position`/`priority`/...) if and only if it renders into the page layout - i.e. is a
// Component - so that's the one structural split this view draws. Everything else (transformer/
// filter/emitter/page-type) is shown together as "Verarbeitung" since they can't be told apart
// from the config alone.
type PluginLayout = PluginLayoutDeclaration

// Straight from quartz's own plugin-config JSON schema (quartz/plugins/quartz-plugins.schema.json)
// plus "footer" (seen in real generated configs but missing from that schema) - this is fixed
// across every plugin, unlike `options` which is plugin-specific, so it's just a static list
// rather than something extracted at runtime. Field names/values (position/kind/enumValues) are
// kept as Quartz writes them (English, camelCase) rather than translated, so they match what's
// actually in the YAML - only the human-facing `description` is looked up via t().
function buildLayoutFields(t: TFunction): PluginOptionField[] {
  return [
    {
      name: 'position',
      kind: 'enum',
      optional: true,
      // Verified against quartz/plugins/loader/config-loader.ts's `buildLayoutForEntries`: the
      // real position map has exactly these 6 keys (no "body" - that's the fixed page content).
      enumValues: ['header', 'left', 'right', 'beforeBody', 'afterBody', 'footer'],
      description: t('pluginsInstalled.layoutFields.position')
    },
    { name: 'priority', kind: 'number', optional: true, description: t('pluginsInstalled.layoutFields.priority') },
    {
      name: 'display',
      kind: 'enum',
      optional: true,
      enumValues: ['all', 'mobile-only', 'desktop-only'],
      description: t('pluginsInstalled.layoutFields.display')
    },
    { name: 'condition', kind: 'string', optional: true, description: t('pluginsInstalled.layoutFields.condition') },
    { name: 'group', kind: 'string', optional: true, description: t('pluginsInstalled.layoutFields.group') }
  ]
}

// Keys straight from pluginDescriptions in the translation resources - kept as a plain list here
// (rather than re-deriving from the resource object) so this file doesn't need a runtime import of
// the locale JSON just to know which plugin names have a description at all.
const KNOWN_PLUGIN_DESCRIPTION_KEYS = new Set([
  'created-modified-date',
  'syntax-highlighting',
  'obsidian-flavored-markdown',
  'github-flavored-markdown',
  'table-of-contents',
  'crawl-links',
  'description',
  'latex',
  'citations',
  'hard-line-breaks',
  'ox-hugo',
  'roam',
  'quartz-fonts',
  'core',
  'remove-draft',
  'explicit-publish',
  'unlisted-pages',
  'encrypted-pages',
  'stacked-pages',
  'alias-redirects',
  'content-index',
  'favicon',
  'og-image',
  'cname',
  'canvas-page',
  'content-page',
  'folder-page',
  'tag-page',
  'bases-page',
  'explorer',
  'graph',
  'search',
  'backlinks',
  'article-title',
  'content-meta',
  'tag-list',
  'page-title',
  'darkmode',
  'reader-mode',
  'breadcrumbs',
  'comments',
  'footer',
  'recent-notes',
  'spacer',
  'note-properties',
  'assets',
  'static',
  'component-resources'
])

// Short descriptions for the official @quartz-community/* (and @quartz-themes/core) plugins,
// compiled from quartz's own docs/plugins/*.md - there's no description field in
// quartz.config.yaml or the compiled .d.ts to read this from at runtime. Keyed by the derived
// display name (deriveName() in configService - last path segment of the source), same key
// PluginRow already uses. Custom/marketplace plugins not in this list simply show no description
// rather than a guessed one.
function getPluginDescription(t: TFunction, name: string): string | undefined {
  return KNOWN_PLUGIN_DESCRIPTION_KEYS.has(name) ? t(`pluginDescriptions.${name}`) : undefined
}

function buildGroupOptionsFields(t: TFunction): PluginOptionField[] {
  return [
    { name: 'grow', kind: 'boolean', optional: true, description: t('pluginsInstalled.groupOptionsFields.grow') },
    { name: 'shrink', kind: 'boolean', optional: true, description: t('pluginsInstalled.groupOptionsFields.shrink') },
    { name: 'basis', kind: 'string', optional: true, description: t('pluginsInstalled.groupOptionsFields.basis') },
    { name: 'order', kind: 'number', optional: true, description: t('pluginsInstalled.groupOptionsFields.order') },
    { name: 'align', kind: 'string', optional: true, description: t('pluginsInstalled.groupOptionsFields.align') },
    { name: 'justify', kind: 'string', optional: true, description: t('pluginsInstalled.groupOptionsFields.justify') }
  ]
}

function getLayout(plugin: PluginEntry): PluginLayout | null {
  const layout = plugin.layout
  return layout && typeof layout === 'object' ? (layout as PluginLayout) : null
}

// Quartz's own plugin loader sorts every plugin "by order within each category" (transformer/
// filter/emitter/pageType - verified in quartz/plugins/loader/config-loader.ts), and every
// built-in page-type plugin's derived name ends in "-page" (content-page, folder-page, tag-page,
// canvas-page, bases-page - verified against quartz.config.yaml). So splitting this group by that
// suffix, and reordering each split independently, actually matches quartz's real per-category
// ordering better than treating all non-Component plugins as one flat sequence.
function isPageType(plugin: PluginEntry): boolean {
  return plugin.name.endsWith('-page')
}

function sourceLabel(source: PluginEntry['source']): string {
  if (typeof source === 'string') return source
  return [source.repo, source.ref ? `#${source.ref}` : '', source.subdir ? ` (${source.subdir})` : ''].join('')
}

// Immutable nested set, e.g. setDeep(plugin, ['layout', 'groupOptions', 'grow'], true)
function setDeep(obj: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  const [head, ...rest] = path
  if (rest.length === 0) return { ...obj, [head]: value }
  const child = (obj[head] as Record<string, unknown> | undefined) ?? {}
  return { ...obj, [head]: setDeep(child, rest, value) }
}

interface IndexedPlugin {
  plugin: PluginEntry
  index: number
}

interface DragTarget {
  group: string
  index: number
}

export default function PluginsInstalled(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [newSource, setNewSource] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dragging, setDragging] = useState<DragTarget | null>(null)

  async function reload(): Promise<void> {
    try {
      setConfig(await window.quartzGui.config.get(project.path))
      setLoadError(null)
    } catch (err) {
      setLoadError(String(err))
    }
  }

  useEffect(() => {
    reload()
  }, [project.path])

  async function addPlugin(): Promise<void> {
    if (!newSource.trim()) return
    setBusy(true)
    try {
      const result = await window.quartzGui.plugins.add(project.path, newSource.trim())
      setMessage(result.success ? null : result.output)
      setNewSource('')
    } catch (err) {
      setMessage(formatIpcError(err))
    } finally {
      setBusy(false)
      await reload()
    }
  }

  // Two config entries can derive the same display name (e.g. a built-in "@quartz-community/explorer"
  // alongside a separately `plugin add`ed "github:quartz-community/explorer"), so every mutation
  // that writes the config array directly targets the array index, not the derived name, to avoid
  // touching the wrong (or both) entries.
  async function updateField(index: number, path: string[], value: unknown): Promise<void> {
    if (!config) return
    const plugins = config.plugins.map((p, i) => (i === index ? (setDeep(p, path, value) as PluginEntry) : p))
    await window.quartzGui.config.save(project.path, { ...config, plugins })
    await reload()
  }

  async function toggleEnabled(index: number): Promise<void> {
    if (!config) return
    setBusy(true)
    const plugins = config.plugins.map((p, i) => (i === index ? { ...p, enabled: !p.enabled } : p))
    try {
      await window.quartzGui.config.save(project.path, { ...config, plugins })
    } catch (err) {
      setMessage(formatIpcError(err))
    } finally {
      setBusy(false)
      await reload()
    }
  }

  async function removePlugin(plugin: PluginEntry): Promise<void> {
    if (!confirm(t('pluginsInstalled.removeConfirm', { name: plugin.name }))) return
    setBusy(true)
    // still CLI-based: `quartz plugin remove <name>` also cleans up .quartz/plugins/<name> on
    // disk and quartz.lock.json, which a plain config.yaml edit wouldn't do
    try {
      const result = await window.quartzGui.plugins.remove(project.path, plugin.name)
      setMessage(result.success ? null : result.output)
    } catch (err) {
      setMessage(formatIpcError(err))
    } finally {
      setBusy(false)
      await reload()
    }
  }

  // Components are only reordered against siblings in the same layout position (their
  // `layout.priority`); everything else is reordered against the top-level `order` field -
  // these are separate concepts in quartz.config.yaml, not one shared sequence.
  async function reorderGroup(group: IndexedPlugin[], from: number, to: number, field: 'order' | 'layoutPriority'): Promise<void> {
    if (!config || from === to) return
    const reordered = [...group]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)

    const plugins = [...config.plugins]
    reordered.forEach((item, i) => {
      const value = (i + 1) * 10
      plugins[item.index] =
        field === 'order'
          ? { ...item.plugin, order: value }
          : { ...item.plugin, layout: { ...getLayout(item.plugin)!, priority: value } }
    })
    await window.quartzGui.config.save(project.path, { ...config, plugins })
    await reload()
  }

  if (loadError) {
    return (
      <div className="max-w-xl">
        <p className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">{t('configEditor.loadError')}</p>
        <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {loadError}
        </pre>
      </div>
    )
  }

  const items: IndexedPlugin[] = (config?.plugins ?? []).map((plugin, index) => ({ plugin, index }))
  const componentItems = items.filter(({ plugin }) => getLayout(plugin) !== null)
  const processingItems = [...items.filter(({ plugin }) => getLayout(plugin) === null)].sort(
    (a, b) => (Number(a.plugin.order) || 0) - (Number(b.plugin.order) || 0)
  )
  const pageTypeItems = processingItems.filter(({ plugin }) => isPageType(plugin))
  const otherProcessingItems = processingItems.filter(({ plugin }) => !isPageType(plugin))

  const byPosition = new Map<string, IndexedPlugin[]>()
  for (const item of componentItems) {
    const position = getLayout(item.plugin)?.position ?? 'body'
    byPosition.set(position, [...(byPosition.get(position) ?? []), item])
  }
  for (const group of byPosition.values()) {
    group.sort((a, b) => (getLayout(a.plugin)?.priority ?? 0) - (getLayout(b.plugin)?.priority ?? 0))
  }
  const knownPositionOrder = buildLayoutFields(t).find((f) => f.name === 'position')?.enumValues ?? []
  const positionKeys = [
    ...knownPositionOrder.filter((p) => byPosition.has(p)),
    ...[...byPosition.keys()].filter((p) => !knownPositionOrder.includes(p))
  ]

  const cardProps = { project, busy, toggleEnabled, removePlugin, updateField, dragging, setDragging }

  return (
    <div className="max-w-3xl">
      <PageHeader
        icon={TAB_ICONS.plugins}
        title={t('projectLayout.tabs.plugins')}
        description={t('projectLayout.descriptions.plugins')}
      />
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <TextInput
            value={newSource}
            onChange={(e) => setNewSource(e.target.value)}
            placeholder={t('pluginsInstalled.addPlaceholder')}
            className="w-72"
          />
          <Button onClick={addPlugin} disabled={busy || !newSource.trim()}>
            {t('pluginsInstalled.add')}
          </Button>
        </div>
        <Link to="marketplace" className="text-sm text-slate-600 hover:underline dark:text-slate-300">
          {t('pluginsInstalled.marketplaceLink')}
        </Link>
      </div>

      {message && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{message}</p>}

      {items.length === 0 && <p className="text-sm text-slate-500">{t('pluginsInstalled.none')}</p>}

      {componentItems.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 text-sm font-semibold">{t('pluginsInstalled.componentsHeading')}</h2>
          <p className="mb-3 text-xs text-slate-400">{t('pluginsInstalled.componentsDescription')}</p>
          <div className="flex flex-col gap-5">
            {positionKeys.map((position) => {
              const group = byPosition.get(position)!
              return (
                <div key={position}>
                  <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {position} ({group.length})
                  </h3>
                  <div className="flex flex-col gap-2">
                    {group.map((item, localIndex) => (
                      <PluginRow
                        key={item.index}
                        item={item}
                        groupKey={`pos:${position}`}
                        localIndex={localIndex}
                        onReorder={(from, to) => reorderGroup(group, from, to, 'layoutPriority')}
                        {...cardProps}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {processingItems.length > 0 && (
        <section>
          <h2 className="mb-1 text-sm font-semibold">{t('pluginsInstalled.processingHeading')}</h2>
          <p className="mb-3 text-xs text-slate-400">{t('pluginsInstalled.processingDescription')}</p>
          <div className="flex flex-col gap-5">
            {pageTypeItems.length > 0 && (
              <div>
                <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t('pluginsInstalled.pageTypesHeading', { count: pageTypeItems.length })}
                </h3>
                <div className="flex flex-col gap-2">
                  {pageTypeItems.map((item, localIndex) => (
                    <PluginRow
                      key={item.index}
                      item={item}
                      groupKey="pageTypes"
                      localIndex={localIndex}
                      onReorder={(from, to) => reorderGroup(pageTypeItems, from, to, 'order')}
                      {...cardProps}
                    />
                  ))}
                </div>
              </div>
            )}
            {otherProcessingItems.length > 0 && (
              <div>
                {pageTypeItems.length > 0 && (
                  <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t('pluginsInstalled.otherProcessingHeading', { count: otherProcessingItems.length })}
                  </h3>
                )}
                <div className="flex flex-col gap-2">
                  {otherProcessingItems.map((item, localIndex) => (
                    <PluginRow
                      key={item.index}
                      item={item}
                      groupKey="processing"
                      localIndex={localIndex}
                      onReorder={(from, to) => reorderGroup(otherProcessingItems, from, to, 'order')}
                      {...cardProps}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function PluginRow({
  item,
  groupKey,
  localIndex,
  busy,
  dragging,
  setDragging,
  onReorder,
  toggleEnabled,
  removePlugin,
  updateField
}: {
  item: IndexedPlugin
  groupKey: string
  localIndex: number
  project: { path: string }
  busy: boolean
  dragging: DragTarget | null
  setDragging: (d: DragTarget | null) => void
  onReorder: (from: number, to: number) => void
  toggleEnabled: (index: number) => void
  removePlugin: (plugin: PluginEntry) => void
  updateField: (index: number, path: string[], value: unknown) => void
}): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const { plugin, index } = item
  const layout = getLayout(plugin)
  const isDragging = dragging?.group === groupKey && dragging.index === localIndex
  const [expanded, setExpanded] = useState(false)
  const description = getPluginDescription(t, plugin.name)

  // Components always have layout fields (position/priority/...) to edit, so their button is
  // always shown. Processing plugins (no layout) may genuinely have nothing to configure, so the
  // schema is fetched eagerly here (not lazily on expand, like PluginOptions used to) to decide
  // whether the button is worth showing at all - and passed down to avoid re-fetching it there.
  const [processingSchema, setProcessingSchema] = useState<PluginOptionField[] | null | 'loading'>('loading')
  useEffect(() => {
    if (layout) return
    setProcessingSchema('loading')
    window.quartzGui.plugins.optionsSchema(project.path, plugin.name).then(setProcessingSchema)
  }, [project.path, plugin.name, layout])

  const hasOptions = layout
    ? true
    : processingSchema === 'loading'
      ? false
      : processingSchema
        ? processingSchema.some((f) => f.kind !== 'unsupported')
        : Object.keys(plugin.options ?? {}).length > 0

  const summary = layout
    ? t('pluginsInstalled.summaryPosPriority', { position: layout.position ?? '–', priority: layout.priority ?? '–' })
    : plugin.order != null
      ? t('pluginsInstalled.summaryOrder', { order: String(plugin.order) })
      : null

  return (
    <Card
      draggable
      onDragStart={() => setDragging({ group: groupKey, index: localIndex })}
      onDragOver={(e: DragEvent) => e.preventDefault()}
      onDrop={() => {
        if (dragging && dragging.group === groupKey) onReorder(dragging.index, localIndex)
        setDragging(null)
      }}
      onDragEnd={() => setDragging(null)}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span className="select-none pt-0.5 text-slate-300 dark:text-slate-600" title={t('pluginsInstalled.dragHint')}>
            ⠿
          </span>
          <div>
            <p className="font-medium">{plugin.name}</p>
            <p className="text-xs text-slate-500">{sourceLabel(plugin.source)}</p>
            {description && <p className="mt-0.5 max-w-md text-xs text-slate-400">{description}</p>}
            {!expanded && summary && <p className="mt-0.5 font-mono text-[11px] text-slate-400">{summary}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={plugin.enabled ? 'green' : 'slate'}>
            {plugin.enabled ? t('pluginsInstalled.active') : t('pluginsInstalled.disabled')}
          </Badge>
          {hasOptions && (
            <Button variant="ghost" onClick={() => setExpanded((v) => !v)}>
              {expanded ? t('pluginsInstalled.hideOptions') : t('pluginsInstalled.showOptions')}
            </Button>
          )}
          <Button variant="ghost" onClick={() => toggleEnabled(index)} disabled={busy}>
            {plugin.enabled ? t('pluginsInstalled.disable') : t('pluginsInstalled.enable')}
          </Button>
          <Button variant="danger" onClick={() => removePlugin(plugin)} disabled={busy}>
            {t('common.remove')}
          </Button>
        </div>
      </div>

      {expanded && layout && (
        <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/10">
          <FieldGroup
            fields={buildLayoutFields(t)}
            values={layout as unknown as Record<string, unknown>}
            onChange={(name, value) => updateField(index, ['layout', name], value)}
          />
          {/* groupOptions only makes sense once the plugin is actually placed in a group */}
          {layout.group && (
            <div className="mt-2 border-t border-dashed border-black/10 pt-2 dark:border-white/10">
              <p className="mb-1 font-mono text-[11px] text-slate-400">groupOptions</p>
              <FieldGroup
                fields={buildGroupOptionsFields(t)}
                values={layout.groupOptions ?? {}}
                onChange={(name, value) => updateField(index, ['layout', 'groupOptions', name], value)}
              />
            </div>
          )}
        </div>
      )}

      {expanded && (
        <PluginOptions plugin={plugin} index={index} updateField={updateField} preloadedSchema={layout ? undefined : processingSchema} />
      )}
    </Card>
  )
}

function PluginOptions({
  plugin,
  index,
  updateField,
  preloadedSchema
}: {
  plugin: PluginEntry
  index: number
  updateField: (index: number, path: string[], value: unknown) => void
  // Processing rows already fetched this in PluginRow (to decide whether to show the "Optionen
  // anzeigen" button at all) - reuse it here instead of fetching a second time. Components don't
  // fetch eagerly (their button is always shown), so this stays undefined for them and this
  // component fetches its own copy, same as before.
  preloadedSchema?: PluginOptionField[] | null | 'loading'
}): JSX.Element | null {
  const { t } = useTranslation()
  const project = useProject()
  const [fetchedSchema, setFetchedSchema] = useState<PluginOptionField[] | null | 'loading'>('loading')

  useEffect(() => {
    if (preloadedSchema !== undefined) return
    setFetchedSchema('loading')
    window.quartzGui.plugins.optionsSchema(project.path, plugin.name).then(setFetchedSchema)
  }, [project.path, plugin.name, preloadedSchema])

  const schema = preloadedSchema !== undefined ? preloadedSchema : fetchedSchema

  if (schema === 'loading') return null

  const options = plugin.options ?? {}
  const onChange = (key: string, value: unknown): void => updateField(index, ['options', key], value)

  if (schema) {
    return (
      <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/10">
        <p className="mb-2 text-[11px] text-slate-400">
          <span className="font-medium">{t('pluginsInstalled.availableOptions')}</span>{' '}
          {schema
            .map(
              (f) =>
                `${f.name} (${f.kind === 'enum' ? f.enumValues?.join('|') : f.kind}${f.kind === 'unsupported' ? t('pluginsInstalled.onlyViaYaml') : ''})`
            )
            .join(', ')}
        </p>
        <FieldGroup fields={schema.filter((f) => f.kind !== 'unsupported')} values={options} onChange={onChange} />
      </div>
    )
  }

  // no compiled type declarations found (true for built-in config entries that were never
  // `plugin add`ed) - we only know about keys that already happen to be in the config, so only
  // those can be edited; their control type is inferred from the current value's JS type
  const keys = Object.keys(options)
  if (keys.length === 0) return null
  return (
    <div className="mt-3 border-t border-black/10 pt-3 dark:border-white/10">
      <p className="mb-2 text-[11px] text-slate-400">{t('pluginsInstalled.noSchemaInfo')}</p>
      <div className="flex flex-col gap-2">
        {keys.map((key) => (
          <InferredFieldRow key={key} name={key} value={options[key]} onChange={(v) => onChange(key, v)} />
        ))}
      </div>
    </div>
  )
}

function FieldGroup({
  fields,
  values,
  onChange
}: {
  fields: PluginOptionField[]
  values: Record<string, unknown>
  onChange: (name: string, value: unknown) => void
}): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      {fields.map((field) => (
        <FieldRow key={field.name} field={field} value={values[field.name]} onChange={(v) => onChange(field.name, v)} />
      ))}
    </div>
  )
}

function FieldRow({
  field,
  value,
  onChange
}: {
  field: PluginOptionField
  value: unknown
  onChange: (value: unknown) => void
}): JSX.Element {
  const { t } = useTranslation()
  const currentText = value == null ? '' : String(value)
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 font-mono text-xs text-slate-600 dark:text-slate-300">
        {field.name}
        {!field.optional && <span className="text-red-500"> *</span>}
      </span>
      <div className="w-40 shrink-0">
        {field.kind === 'boolean' && (
          <Toggle label="" checked={value === true || value === 'true'} onChange={(checked) => onChange(checked)} />
        )}
        {field.kind === 'enum' && (
          <Select
            value={typeof value === 'string' && field.enumValues?.includes(value) ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-40"
          >
            <option value="" disabled>
              {t('pluginsInstalled.notSet')}
            </option>
            {field.enumValues?.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
        )}
        {field.kind === 'number' && (
          // key={currentText} forces a remount (and thus a fresh defaultValue) whenever the
          // persisted value changes from outside this input - e.g. a drag-and-drop reorder
          // renumbering `priority` - since an uncontrolled input otherwise never re-reads its
          // defaultValue after the first render
          <TextInput
            key={currentText}
            type="number"
            defaultValue={currentText}
            onBlur={(e) => {
              if (e.target.value !== currentText) onChange(e.target.value === '' ? undefined : Number(e.target.value))
            }}
            className="w-40"
          />
        )}
        {field.kind === 'string' && (
          <TextInput
            key={currentText}
            type="text"
            defaultValue={currentText}
            onBlur={(e) => {
              if (e.target.value !== currentText) onChange(e.target.value)
            }}
            className="w-40"
          />
        )}
      </div>
      {/* uses the free space to the right of the control to briefly explain the possible values,
          instead of cramming it under the (already narrow) label column */}
      {field.description && <p className="flex-1 text-[11px] text-slate-400">{field.description}</p>}
    </div>
  )
}

function InferredFieldRow({
  name,
  value,
  onChange
}: {
  name: string
  value: unknown
  onChange: (value: unknown) => void
}): JSX.Element {
  if (typeof value === 'boolean') {
    return (
      <div className="flex items-center gap-3">
        <span className="w-40 shrink-0 font-mono text-xs text-slate-600 dark:text-slate-300">{name}</span>
        <Toggle label="" checked={value} onChange={onChange} />
      </div>
    )
  }
  if (typeof value === 'number') {
    return (
      <div className="flex items-center gap-3">
        <span className="w-40 shrink-0 font-mono text-xs text-slate-600 dark:text-slate-300">{name}</span>
        <TextInput
          key={String(value)}
          type="number"
          defaultValue={String(value)}
          onBlur={(e) => onChange(Number(e.target.value))}
          className="w-40"
        />
      </div>
    )
  }
  // strings, arrays and objects: edited as text (JSON-encoded for arrays/objects), same as before
  const initial = typeof value === 'string' ? value : JSON.stringify(value)
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 font-mono text-xs text-slate-600 dark:text-slate-300">{name}</span>
      <TextInput
        key={initial}
        defaultValue={initial}
        onBlur={(e) => {
          if (e.target.value === initial) return
          if (typeof value === 'string') onChange(e.target.value)
          else {
            try {
              onChange(JSON.parse(e.target.value))
            } catch {
              onChange(e.target.value)
            }
          }
        }}
        className="w-56 font-mono"
      />
    </div>
  )
}
