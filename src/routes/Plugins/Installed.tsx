import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { confirmDialog } from '../../utils/confirm'
import type { TFunction } from 'i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, ExternalLink, GripVertical, Search, Trash2 } from 'lucide-react'
import { useProject } from '../ProjectLayout'
import type {
  GridFrameDefinition,
  PluginEntry,
  PluginLayoutDeclaration,
  PluginOptionField,
  QuartzConfig
} from '@shared/ipc-contract'
import { Badge, Button, Card, Select, TextInput, Toggle } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { announce } from '../../state/announcer'
import { primeStickyState, useStickyState } from '../../state/uiState'
import { dndAccessibility } from '../../utils/dndAnnouncements'
import { repoUrl } from './pluginSource'

// A row is one line of text plus two fixed-width controls, so it no longer needs the ~710px the
// old wrap-or-squeeze layout did - the name/source/description column shrinks freely (min-w-0)
// and only the action group is pinned. The breakpoint below is measured in the running app, not
// picked off Tailwind's scale: two columns need enough width that the plugin name still reads at
// a glance, which is where a second column stops being a gain.
const PLUGIN_LIST = 'grid gap-2 min-[1500px]:grid-cols-2'

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

// What a row is called on screen: a frame carries its own name, everything else the plugin name
// quartz addresses it by. Used for the sticky key, the drag narration and the reorder message, so
// all three speak of the same thing.
function displayName(item: IndexedPlugin): string {
  return item.frame ? item.frame.frameName : item.plugin.name
}

// The name alone is not an identity: one plugin can be installed several times, and a real project
// has six `quartz-layout-box` entries - opening one row's options opened all six, closing one
// closed all six. The occurrence number separates them. It is not perfect either: removing the
// second of six renumbers the four behind it, so their panels shift by one - but those entries are
// indistinguishable to the reader anyway, whereas the shared panel was visible in every project
// that uses a layout box more than once. A frame keeps the plain name; frame ids are unique by
// construction (they are directory names under authored-frames/).
function stickyKey(item: IndexedPlugin): string {
  return item.frame || item.occurrence === 1 ? item.plugin.name : `${item.plugin.name}#${item.occurrence}`
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

// A hand-typed option value arrives as a string but the config is typed YAML, so "true" has to
// become a boolean and "3" a number - otherwise the plugin reads a string where it expects
// neither. JSON covers arrays/objects; anything else stays the literal string it was typed as.
function parseOptionValue(raw: string): unknown {
  const text = raw.trim()
  if (text === 'true') return true
  if (text === 'false') return false
  if (text !== '' && !Number.isNaN(Number(text))) return Number(text)
  if (/^[[{"]/.test(text)) {
    try {
      return JSON.parse(text)
    } catch {
      return raw
    }
  }
  return raw
}

interface IndexedPlugin {
  plugin: PluginEntry
  index: number
  /** The authored frame this entry registers, for the handful of entries that are one. */
  frame?: GridFrameDefinition
  /** Which of the same-named entries this is, counted from 1. See stickyKey(). */
  occurrence: number
}

type EnabledFilter = 'all' | 'active' | 'inactive'

export default function PluginsInstalled(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const navigate = useNavigate()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  // Authored frames are registered as plugins (`quartz plugin add <path>` on the frame's own
  // directory - see layoutFrameService), so they legitimately appear in this list. Reading the
  // frame list is what turns those entries from an opaque directory id into the frame's own name.
  const [frames, setFrames] = useState<GridFrameDefinition[]>([])
  // Which plugins the Updates page would offer an update for. Deliberately its own effect that
  // nothing awaits: it runs `git ls-remote` per lockfile entry, and a slow or failing network
  // check must not hold up (or blank) the list itself.
  const [outdated, setOutdated] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Which row last had a field written. Layout and option fields save on blur with no Save button,
  // so without this the config changes with no sign that anything happened.
  const [savedIndex, setSavedIndex] = useState<number | null>(null)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Which maintenance action is running, so only that one button says so.
  const [maintenance, setMaintenance] = useState<'install' | 'prune' | null>(null)
  // Its result is kept apart from `message`, which is rendered in red because everything else
  // that reaches it is a failure.
  const [maintenanceNotice, setMaintenanceNotice] = useState<string | null>(null)
  // Search and filter are "where the user was", not a draft - see useStickyState.
  const [query, setQuery] = useStickyState('plugins.query', '')
  const [enabledFilter, setEnabledFilter] = useStickyState<EnabledFilter>('plugins.filter', 'all')

  async function reload(): Promise<void> {
    try {
      setConfig(await window.quartzGui.config.get(project.path))
      setLoadError(null)
    } catch (err) {
      setLoadError(formatIpcError(err))
    }
  }

  async function reloadFrames(): Promise<void> {
    setFrames(await window.quartzGui.layoutFrames.list(project.path).catch(() => []))
  }

  useEffect(() => {
    reload()
    reloadFrames()
  }, [project.path])

  useEffect(() => {
    window.quartzGui.updates
      .pluginsStatus(project.path)
      .then((statuses) => setOutdated(new Set(statuses.filter((s) => s.state === 'behind').map((s) => s.name))))
      .catch(() => setOutdated(new Set()))
  }, [project.path])

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    },
    []
  )

  // The visible half is a green word next to one row of forty-eight; the spoken half has to name
  // the row, because "Gespeichert." on its own says nothing about which one. It goes through the
  // app's single live region rather than a region per row - see state/announcer.tsx.
  function flagSaved(index: number): void {
    setSavedIndex(index)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSavedIndex(null), 2000)
    const name = config?.plugins[index]?.name
    if (name) announce(t('pluginsInstalled.savedAnnounce', { name }))
  }

  // Two config entries can derive the same display name (e.g. a built-in "@quartz-community/explorer"
  // alongside a separately `plugin add`ed "github:quartz-community/explorer"), so every mutation
  // that writes the config array directly targets the array index, not the derived name, to avoid
  // touching the wrong (or both) entries.
  async function updateField(index: number, path: string[], value: unknown): Promise<void> {
    if (!config) return
    const plugins = config.plugins.map((p, i) => (i === index ? (setDeep(p, path, value) as PluginEntry) : p))
    await window.quartzGui.config.save(project.path, { ...config, plugins })
    flagSaved(index)
    await reload()
  }

  // Dropping a key needs its own path: setDeep can only ever *write* a value, and writing
  // `undefined` leaves the key in the object, where the YAML writer turns it into an explicit null
  // rather than removing it.
  async function removeOptionKey(index: number, key: string): Promise<void> {
    if (!config) return
    const plugins = config.plugins.map((p, i) => {
      if (i !== index) return p
      const rest = { ...(p.options ?? {}) }
      delete rest[key]
      return { ...p, options: rest }
    })
    await window.quartzGui.config.save(project.path, { ...config, plugins })
    flagSaved(index)
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

  async function removePlugin(item: IndexedPlugin): Promise<void> {
    const { plugin, frame } = item
    const name = frame ? frame.frameName : plugin.name
    const question = t(frame ? 'pluginsInstalled.removeFrameConfirm' : 'pluginsInstalled.removeConfirm', { name })
    if (!(await confirmDialog({ text: question, confirmLabel: t('common.remove'), danger: true }))) return
    setBusy(true)
    try {
      // A frame has to go through layoutFrames.delete: `quartz plugin remove` alone unregisters it
      // but leaves .quartz-gui/authored-frames/<id> behind, which keeps the frame in the Layout
      // editor's list while it is no longer part of any build - and saveFrame() only re-registers
      // a frame whose directory is *new*, so it could never come back.
      const result = frame
        ? await window.quartzGui.layoutFrames.delete(project.path, frame.id)
        : await window.quartzGui.plugins.remove(project.path, plugin.name)
      setMessage(result.success ? null : result.output)
    } catch (err) {
      setMessage(formatIpcError(err))
    } finally {
      setBusy(false)
      await reload()
      await reloadFrames()
    }
  }

  // `quartz plugin install` and `quartz plugin prune` are the two CLI actions that repair the
  // .quartz/plugins tree rather than change what the site does: the first rebuilds it from
  // quartz.lock.json (what a freshly cloned copy of the project needs, since that tree is not
  // committed), the second drops directories no config entry points at any more. Both were wired
  // all the way through to the preload bridge and reachable from nowhere in the app.
  async function runMaintenance(kind: 'install' | 'prune'): Promise<void> {
    if (kind === 'prune' && !(await confirmDialog({ text: t('pluginsInstalled.pruneConfirm'), confirmLabel: t('pluginsInstalled.pruneConfirmAction'), danger: true }))) return
    setMaintenance(kind)
    setMessage(null)
    setMaintenanceNotice(null)
    try {
      const result =
        kind === 'install'
          ? await window.quartzGui.plugins.installFromLock(project.path)
          : await window.quartzGui.plugins.prune(project.path)
      if (result.success) setMaintenanceNotice(t(`pluginsInstalled.${kind}Done`))
      else setMessage(result.output)
    } catch (err) {
      setMessage(formatIpcError(err))
    } finally {
      setMaintenance(null)
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
    // The one sentence that says what actually happened, for every way of getting here - drag,
    // keyboard drag, and the two arrows. The drag's own commentary stops at "abgelegt bei X";
    // this is the result.
    announce(
      t('pluginsInstalled.reorderedAnnounce', {
        name: displayName(moved),
        position: to + 1,
        total: reordered.length
      })
    )
    await reload()
  }

  // Opens the Layout editor on the frames tab with this frame already loaded. The tab travels in
  // the URL, like every other sub-tab; which frame is open cannot - it is a whole frame object, not
  // one of three fixed names - so that half is still primed into the target route's sticky store
  // before navigating there.
  function openFrameInLayoutEditor(frame: GridFrameDefinition): void {
    const target = `/project/${project.id}/layout`
    primeStickyState(target, 'frames.editing', frame)
    primeStickyState(target, 'frames.isNewDraft', false)
    navigate(`${target}?tab=frames`)
  }

  const frameById = useMemo(() => new Map(frames.map((f) => [f.id, f])), [frames])

  const items: IndexedPlugin[] = useMemo(() => {
    const seen = new Map<string, number>()
    return (config?.plugins ?? []).map((plugin, index) => {
      // Both halves have to agree before an entry counts as a frame: the frame list says a frame
      // with that id exists, and the entry really points at that frame's directory. A plugin that
      // merely shares a name with a frame is still a plugin.
      const frame = frameById.get(plugin.name)
      const isFrame =
        frame !== undefined && typeof plugin.source === 'string' && plugin.source.includes('authored-frames')
      const occurrence = (seen.get(plugin.name) ?? 0) + 1
      seen.set(plugin.name, occurrence)
      return { plugin, index, frame: isFrame ? frame : undefined, occurrence }
    })
  }, [config, frameById])

  const filtering = query.trim() !== '' || enabledFilter !== 'all'
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (item: IndexedPlugin): boolean => {
      if (enabledFilter === 'active' && !item.plugin.enabled) return false
      if (enabledFilter === 'inactive' && item.plugin.enabled) return false
      if (!q) return true
      const haystack = [
        item.frame ? item.frame.frameName : item.plugin.name,
        sourceLabel(item.plugin.source),
        getPluginDescription(t, item.plugin.name) ?? ''
      ]
      return haystack.some((s) => s.toLowerCase().includes(q))
    }
  }, [query, enabledFilter, t])

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

  const frameItems = items.filter((item) => item.frame)
  const pluginItems = items.filter((item) => !item.frame)
  const componentItems = pluginItems.filter(({ plugin }) => getLayout(plugin) !== null)
  const processingItems = [...pluginItems.filter(({ plugin }) => getLayout(plugin) === null)].sort(
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

  const activeCount = items.filter((item) => item.plugin.enabled).length
  const visibleCount = items.filter(matches).length

  const cardProps = {
    busy,
    // Reordering renumbers a whole group in steps of ten. With a filter on, the rendered group is
    // a subset, so those new numbers would be assigned as though the hidden entries weren't there
    // - which silently reshuffles them too. Reordering is therefore off while filtering (the
    // handle *and* the two arrows), and the hint above the list says so rather than leaving dead
    // controls.
    canReorder: !filtering,
    outdated,
    savedIndex,
    toggleEnabled,
    removePlugin,
    updateField,
    removeOptionKey,
    openFrameInLayoutEditor
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
            aria-hidden
          />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('pluginsInstalled.searchPlaceholder')}
            className="w-full pl-8"
          />
        </div>
        <div className="inline-flex w-fit gap-0.5 rounded-[8px] bg-ink/[0.05] p-0.5 dark:bg-ink/10">
          {(['all', 'active', 'inactive'] as EnabledFilter[]).map((key) => (
            <button
              key={key}
              onClick={() => setEnabledFilter(key)}
              className={`rounded-[6px] px-3 py-1 text-[13px] font-medium transition-colors ${
                enabledFilter === key
                  ? 'bg-surface text-text shadow-sm dark:bg-ink/20'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              {t(`pluginsInstalled.filters.${key}`)}
            </button>
          ))}
        </div>
        <p className="ml-auto text-[13px] text-text-muted">
          {filtering
            ? t('pluginsInstalled.countFiltered', { visible: visibleCount, total: items.length })
            : t('pluginsInstalled.countActive', { active: activeCount, total: items.length })}
        </p>
      </div>

      {filtering && <p className="mb-3 text-xs text-text-muted">{t('pluginsInstalled.reorderDisabledByFilter')}</p>}

      {message && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{message}</p>}

      {items.length === 0 && <p className="text-sm text-text-muted">{t('pluginsInstalled.none')}</p>}
      {items.length > 0 && visibleCount === 0 && <p className="text-sm text-text-muted">{t('pluginsInstalled.noMatches')}</p>}

      {frameItems.some(matches) && (
        <section className="mb-8">
          <h2 className="mb-1 text-sm font-semibold">{t('pluginsInstalled.framesHeading')}</h2>
          <p className="mb-3 max-w-3xl text-xs text-text-muted">{t('pluginsInstalled.framesDescription')}</p>
          <div className={PLUGIN_LIST}>
            {/* Frames are not part of either sequence - they are registered plugins without an
                order of their own - so this group has no handle and no arrows. */}
            {frameItems.filter(matches).map((item) => (
              <PluginRow key={item.index} item={item} {...cardProps} canReorder={false} />
            ))}
          </div>
        </section>
      )}

      {componentItems.some(matches) && (
        <section className="mb-8">
          <h2 className="mb-1 text-sm font-semibold">{t('pluginsInstalled.componentsHeading')}</h2>
          <p className="mb-3 max-w-3xl text-xs text-text-muted">{t('pluginsInstalled.componentsDescription')}</p>
          <div className="flex flex-col gap-5">
            {positionKeys.map((position) => {
              const group = byPosition.get(position)!
              const shown = group.filter(matches)
              if (shown.length === 0) return null
              return (
                <div key={position}>
                  <GroupHeading label={t(`positions.${position}`, position)} rawKey={position} count={shown.length} />
                  <ReorderableList
                    ids={group.map((item) => String(item.index))}
                    names={new Map(group.map((item) => [String(item.index), displayName(item)]))}
                    canReorder={cardProps.canReorder}
                    onReorder={(from, to) => reorderGroup(group, from, to, 'layoutPriority')}
                  >
                    {shown.map((item) => (
                      <Row
                        key={item.index}
                        item={item}
                        position={group.indexOf(item)}
                        groupSize={group.length}
                        onMove={(delta) => reorderGroup(group, group.indexOf(item), group.indexOf(item) + delta, 'layoutPriority')}
                        {...cardProps}
                      />
                    ))}
                  </ReorderableList>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {processingItems.some(matches) && (
        <section>
          <h2 className="mb-1 text-sm font-semibold">{t('pluginsInstalled.processingHeading')}</h2>
          <p className="mb-3 max-w-3xl text-xs text-text-muted">{t('pluginsInstalled.processingDescription')}</p>
          <div className="flex flex-col gap-5">
            {pageTypeItems.some(matches) && (
              <div>
                <GroupHeading label={t('pluginsInstalled.pageTypesGroup')} count={pageTypeItems.filter(matches).length} />
                <ReorderableList
                  ids={pageTypeItems.map((item) => String(item.index))}
                  names={new Map(pageTypeItems.map((item) => [String(item.index), displayName(item)]))}
                  canReorder={cardProps.canReorder}
                  onReorder={(from, to) => reorderGroup(pageTypeItems, from, to, 'order')}
                >
                  {pageTypeItems.filter(matches).map((item) => (
                    <Row
                      key={item.index}
                      item={item}
                      position={pageTypeItems.indexOf(item)}
                      groupSize={pageTypeItems.length}
                      onMove={(delta) =>
                        reorderGroup(pageTypeItems, pageTypeItems.indexOf(item), pageTypeItems.indexOf(item) + delta, 'order')
                      }
                      {...cardProps}
                    />
                  ))}
                </ReorderableList>
              </div>
            )}
            {otherProcessingItems.some(matches) && (
              <div>
                <GroupHeading
                  label={t('pluginsInstalled.otherProcessingGroup')}
                  count={otherProcessingItems.filter(matches).length}
                />
                <ReorderableList
                  ids={otherProcessingItems.map((item) => String(item.index))}
                  names={new Map(otherProcessingItems.map((item) => [String(item.index), displayName(item)]))}
                  canReorder={cardProps.canReorder}
                  onReorder={(from, to) => reorderGroup(otherProcessingItems, from, to, 'order')}
                >
                  {otherProcessingItems.filter(matches).map((item) => (
                    <Row
                      key={item.index}
                      item={item}
                      position={otherProcessingItems.indexOf(item)}
                      groupSize={otherProcessingItems.length}
                      onMove={(delta) =>
                        reorderGroup(
                          otherProcessingItems,
                          otherProcessingItems.indexOf(item),
                          otherProcessingItems.indexOf(item) + delta,
                          'order'
                        )
                      }
                      {...cardProps}
                    />
                  ))}
                </ReorderableList>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mt-10 border-t border-ink/[0.06] pt-5 dark:border-ink/10">
        <h2 className="mb-1 text-sm font-semibold">{t('pluginsInstalled.maintenanceHeading')}</h2>
        <p className="mb-3 max-w-3xl text-xs text-text-muted">{t('pluginsInstalled.maintenanceDescription')}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => runMaintenance('install')} disabled={maintenance !== null || busy}>
            {maintenance === 'install' ? t('pluginsInstalled.installFromLockRunning') : t('pluginsInstalled.installFromLock')}
          </Button>
          <Button variant="ghost" onClick={() => runMaintenance('prune')} disabled={maintenance !== null || busy}>
            {maintenance === 'prune' ? t('pluginsInstalled.pruneRunning') : t('pluginsInstalled.prune')}
          </Button>
        </div>
        {maintenanceNotice && (
          <p className="mt-3 text-sm text-green-700 dark:text-green-400">{maintenanceNotice}</p>
        )}
      </section>
    </div>
  )
}

// The plain-language name of a group, with the raw config key next to it - the key is what is in
// quartz.config.yaml and what the row's own `position:` summary repeats, so dropping it entirely
// would break the link between this UI and the file it edits.
function GroupHeading({ label, rawKey, count }: { label: string; rawKey?: string; count: number }): JSX.Element {
  return (
    <h3 className="mb-2 flex items-baseline gap-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
      {label}
      {rawKey && <span className="font-mono text-[11px] font-normal normal-case tracking-normal text-text-muted">{rawKey}</span>}
      <span className="font-normal text-text-muted">({count})</span>
    </h3>
  )
}

function IconButton({
  icon: Icon,
  title,
  onClick,
  disabled,
  tone = 'danger'
}: {
  icon: typeof Trash2
  title: string
  onClick: () => void
  disabled?: boolean
  tone?: 'danger' | 'neutral'
}): JSX.Element {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      // Enabled is the secondary tone and disabled the muted one, both explicit: `disabled:opacity-40`
      // on a muted icon measured 1.69:1 (docs/REVIEW-2026-09-02.md, d), and one step below muted
      // is below the floor - so the enabled icon moved up a step instead. Only a destructive
      // button turns red on hover; the two move arrows next to it are ordinary edits.
      className={`rounded-[7px] p-1.5 text-text-secondary transition-colors disabled:cursor-not-allowed disabled:text-text-muted ${
        tone === 'danger'
          ? 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15 dark:hover:text-red-400'
          : 'hover:bg-ink/[0.06] hover:text-text'
      }`}
    >
      <Icon size={15} strokeWidth={2} aria-hidden />
    </button>
  )
}

interface PluginRowProps {
  item: IndexedPlugin
  busy: boolean
  canReorder: boolean
  outdated: Set<string>
  savedIndex: number | null
  toggleEnabled: (index: number) => void
  removePlugin: (item: IndexedPlugin) => void
  updateField: (index: number, path: string[], value: unknown) => void
  removeOptionKey: (index: number, key: string) => void
  openFrameInLayoutEditor: (frame: GridFrameDefinition) => void
  /** Where this entry sits in its own (unfiltered) group, and how long that group is. */
  position?: number
  groupSize?: number
  onMove?: (delta: -1 | 1) => void
  /** Only set for a row inside a SortableContext - see SortableRow. */
  handleRef?: (node: HTMLElement | null) => void
  handleProps?: Record<string, unknown>
}

// One group's worth of rows. The dnd-kit context sits per group rather than once around the page
// because the groups are separate sequences in quartz.config.yaml - a component's layout.priority,
// a processing plugin's order - and an entry can never move from one into another; with a context
// each, that is true by construction instead of by a guard in the drop handler.
function ReorderableList({
  ids,
  names,
  canReorder,
  onReorder,
  children
}: {
  ids: string[]
  /** Display name per id, so the drag can be narrated with the names on screen. */
  names: Map<string, string>
  canReorder: boolean
  onReorder: (from: number, to: number) => void
  children: React.ReactNode
}): JSX.Element {
  const { t } = useTranslation()
  const { announcements, screenReaderInstructions } = dndAccessibility(t, (id) => names.get(id) ?? '')
  // The keyboard sensor is a default of DndContext, but its default coordinate getter is not:
  // it moves the picked-up item by a fixed 25px per arrow press, which in this list (cards ~130px
  // tall, two columns above 1500px) never reaches the next card - measured in the running app,
  // where space picked the row up and every arrow press left it over itself. sortableKeyboardCoordinates
  // walks to the neighbouring *item* instead, which is what "nach oben" means here.
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onReorder(from, to)
  }

  if (!canReorder) return <div className={PLUGIN_LIST}>{children}</div>

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{ announcements, screenReaderInstructions }}
    >
      {/* rect, not vertical list: above 1500px this list is two columns wide (PLUGIN_LIST), and
          the vertical strategy assumes a single column. */}
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className={PLUGIN_LIST}>{children}</div>
      </SortableContext>
    </DndContext>
  )
}

// The hook may only run inside a SortableContext, so which of the two components renders is
// decided here rather than by a condition inside one of them: a frame row, and every row while a
// filter is on, has no context to join.
function Row(props: PluginRowProps): JSX.Element {
  return props.canReorder ? <SortableRow {...props} /> : <PluginRow {...props} />
}

function SortableRow(props: PluginRowProps): JSX.Element {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: String(props.item.index)
  })
  // The wrapper carries the transform because Card is a plain div component with no ref of its
  // own; `h-full` on both keeps the grid's equal-height rows, which the extra element would
  // otherwise break.
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`h-full ${isDragging ? 'opacity-40' : ''}`}
    >
      <PluginRow {...props} handleRef={setActivatorNodeRef} handleProps={{ ...attributes, ...listeners }} />
    </div>
  )
}

function PluginRow({
  item,
  busy,
  canReorder,
  outdated,
  savedIndex,
  toggleEnabled,
  removePlugin,
  updateField,
  removeOptionKey,
  openFrameInLayoutEditor,
  position,
  groupSize,
  onMove,
  handleRef,
  handleProps
}: PluginRowProps): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const { plugin, index, frame } = item
  const layout = getLayout(plugin)
  const rowName = displayName(item)
  // Keyed by the plugin's *name* and which occurrence of it this row is, not by its position in
  // the config array. The index is what the list's React key uses, and it was what this key used
  // too - but removing a plugin shortens that array, so every entry behind it moves up one and the
  // open options panel was left on whichever plugin inherited the index. (Reordering is safe by
  // comparison: reorderGroup rewrites the `order`/`layout.priority` numbers in place and never
  // moves an entry within the array.) Names are what quartz addresses a plugin by (`quartz plugin
  // remove <name>`) and survive both - see stickyKey for why the name alone is still not enough.
  const [expanded, setExpanded] = useStickyState(`plugins.expanded.${stickyKey(item)}`, false)
  const description = getPluginDescription(t, plugin.name)
  const url = repoUrl(plugin.source)

  // Components always have layout fields (position/priority/...) to edit, so their button is
  // always shown. Processing plugins (no layout) may genuinely have nothing to configure, so the
  // schema is fetched eagerly here (not lazily on expand, like PluginOptions used to) to decide
  // whether the button is worth showing at all - and passed down to avoid re-fetching it there.
  // A frame is skipped entirely: its "plugin" is generated JS with no .d.ts to read, and it is
  // configured in the Layout editor, not here.
  const [processingSchema, setProcessingSchema] = useState<PluginOptionField[] | null | 'loading'>('loading')
  useEffect(() => {
    if (layout || frame) return
    setProcessingSchema('loading')
    window.quartzGui.plugins.optionsSchema(project.path, plugin.name).then(setProcessingSchema)
  }, [project.path, plugin.name, layout, frame])

  const hasOptions = frame
    ? false
    : layout
      ? true
      : processingSchema === 'loading'
        ? false
        : processingSchema
          ? processingSchema.some((f) => f.kind !== 'unsupported')
          : true // no schema: the editor still offers the existing keys plus a way to add one

  const summary = layout
    ? t('pluginsInstalled.summaryPosPriority', { position: layout.position ?? '–', priority: layout.priority ?? '–' })
    : frame
      ? t('pluginsInstalled.frameSummary', { count: frame.areas.length })
      : plugin.order != null
        ? t('pluginsInstalled.summaryOrder', { order: String(plugin.order) })
        : null

  return (
    <Card className={`h-full px-3 py-2.5 ${plugin.enabled ? '' : 'bg-ink/[0.02] dark:bg-ink/[0.02]'}`}>
      <div className="flex items-start gap-2.5">
        {/* Only the handle is the drag activator. With the whole card as one, any drag gesture -
            selecting the description, dragging inside an option field - started a reorder.
            A real <button>, not the span this used to be: dnd-kit's keyboard sensor needs a
            focusable activator, and the attributes it hands over (tabIndex, role, the
            aria-describedby pointing at its instructions) belong on something that can take focus.
            The bordered, padded box is the layout editor's handle - as a bare ⠿ on the card ground
            it was almost invisible and read as decoration, reported from the alpha test. */}
        <button
          type="button"
          ref={handleRef}
          {...handleProps}
          disabled={!canReorder}
          title={canReorder ? t('pluginsInstalled.dragHint') : undefined}
          aria-label={t('pluginsInstalled.dragHandle', { name: rowName })}
          className={`mt-px flex shrink-0 select-none items-center rounded-[6px] border p-1 transition-colors ${
            canReorder
              ? 'cursor-grab border-ink/10 bg-ink/[0.03] text-text-secondary hover:border-ink/20 hover:bg-ink/[0.08] hover:text-text active:cursor-grabbing'
              : 'cursor-default border-transparent text-text-muted'
          }`}
        >
          <GripVertical size={15} aria-hidden />
        </button>
        <div className="pt-px">
          <Toggle
            label={t('pluginsInstalled.enabledSwitch', { name: frame ? frame.frameName : plugin.name })}
            hideLabel
            checked={plugin.enabled}
            onChange={() => toggleEnabled(index)}
            disabled={busy}
          />
        </div>

        <div className={`min-w-0 flex-1 ${plugin.enabled ? '' : 'opacity-60'}`}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="break-words font-medium leading-tight">{rowName}</p>
            {frame && <Badge>{t('pluginsInstalled.frameBadge')}</Badge>}
            {outdated.has(plugin.name) && <Badge tone="amber">{t('pluginsInstalled.updateAvailable')}</Badge>}
            {savedIndex === index && <span className="text-[11px] text-green-600 dark:text-green-400">{t('pluginsInstalled.savedFlash')}</span>}
          </div>
          <p className="truncate text-xs text-text-muted" title={sourceLabel(plugin.source)}>
            {frame ? t('pluginsInstalled.frameSource') : sourceLabel(plugin.source)}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                title={t('pluginsInstalled.openRepo')}
                className="ml-1 inline-flex translate-y-[2px] text-text-muted hover:text-blue-600 dark:hover:text-blue-400"
              >
                <ExternalLink size={11} aria-hidden />
              </a>
            )}
          </p>
          {description && <p className="mt-0.5 text-xs text-text-muted">{description}</p>}
          {!expanded && summary && <p className="mt-0.5 font-mono text-[11px] text-text-muted">{summary}</p>}
        </div>

        {/* Fixed widths, not content-sized: across ~50 rows a button group that grew with the
            longest label produced three different right edges down the page. */}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {/* Wide enough for the longest label in either language and nowrap on top of it:
              at 150px "Optionen einklappen" wrapped onto two lines, so a row grew taller the
              moment it was expanded. */}
          <div className="w-[164px] text-right">
            {frame ? (
              <Button variant="ghost" className="w-full whitespace-nowrap" onClick={() => openFrameInLayoutEditor(frame)}>
                {t('pluginsInstalled.openInLayoutEditor')}
              </Button>
            ) : (
              hasOptions && (
                <Button variant="ghost" className="w-full whitespace-nowrap" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? t('pluginsInstalled.hideOptions') : t('pluginsInstalled.showOptions')}
                </Button>
              )
            )}
          </div>
          {/* The keyboard alternative to the handle. dnd-kit's keyboard sensor can do the same
              thing (space, arrows, space), but it is a modal gesture one has to know about;
              two arrows are one keystroke each and are the same control the CSS load order and
              the layout editor use. They are as filter-sensitive as the drag is - see cardProps. */}
          {onMove && position !== undefined && groupSize !== undefined && (
            <>
              <IconButton
                icon={ArrowUp}
                tone="neutral"
                title={t('pluginsInstalled.moveUp', { name: rowName })}
                onClick={() => onMove(-1)}
                disabled={busy || !canReorder || position === 0}
              />
              <IconButton
                icon={ArrowDown}
                tone="neutral"
                title={t('pluginsInstalled.moveDown', { name: rowName })}
                onClick={() => onMove(1)}
                disabled={busy || !canReorder || position === groupSize - 1}
              />
            </>
          )}
          <IconButton icon={Trash2} title={t('common.remove')} onClick={() => removePlugin(item)} disabled={busy} />
        </div>
      </div>

      {expanded && layout && (
        <div className="mt-3 border-t border-ink/10 pt-3 dark:border-ink/10">
          <FieldGroup
            fields={buildLayoutFields(t)}
            values={layout as unknown as Record<string, unknown>}
            onChange={(name, value) => updateField(index, ['layout', name], value)}
          />
          {/* groupOptions only makes sense once the plugin is actually placed in a group */}
          {layout.group && (
            <div className="mt-2 border-t border-dashed border-ink/10 pt-2 dark:border-ink/10">
              <p className="mb-1 font-mono text-[11px] text-text-muted">groupOptions</p>
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
        <PluginOptions
          plugin={plugin}
          index={index}
          updateField={updateField}
          removeOptionKey={removeOptionKey}
          preloadedSchema={layout ? undefined : processingSchema}
        />
      )}
    </Card>
  )
}

function PluginOptions({
  plugin,
  index,
  updateField,
  removeOptionKey,
  preloadedSchema
}: {
  plugin: PluginEntry
  index: number
  updateField: (index: number, path: string[], value: unknown) => void
  removeOptionKey: (index: number, key: string) => void
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
      <div className="mt-3 border-t border-ink/10 pt-3 dark:border-ink/10">
        <p className="mb-2 text-[11px] text-text-muted">
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

  // No compiled type declarations found - true for every built-in config entry, which ships no
  // discoverable dist/*.d.ts (see pluginSchemaService). Those plugins do have options upstream, so
  // showing only the keys that happen to be in the config already would mean a plugin like
  // `explorer` offers nothing at all to set. The key/value adder below is the way in; the control
  // type of an existing key is inferred from its current value.
  const keys = Object.keys(options)
  return (
    <div className="mt-3 border-t border-ink/10 pt-3 dark:border-ink/10">
      <p className="mb-2 text-[11px] text-text-muted">{t('pluginsInstalled.noSchemaInfo')}</p>
      <div className="flex flex-col gap-2">
        {keys.map((key) => (
          <InferredFieldRow
            key={key}
            name={key}
            value={options[key]}
            onChange={(v) => onChange(key, v)}
            onRemove={() => removeOptionKey(index, key)}
          />
        ))}
      </div>
      <AddOptionRow existingKeys={keys} onAdd={(key, value) => onChange(key, value)} />
    </div>
  )
}

function AddOptionRow({
  existingKeys,
  onAdd
}: {
  existingKeys: string[]
  onAdd: (key: string, value: unknown) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const trimmed = key.trim()
  const duplicate = existingKeys.includes(trimmed)

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-ink/10 pt-3 dark:border-ink/10">
      {/* aria-label rather than a visible label: the row is one line of controls with no column to
          put a label in, and a placeholder is not a name - it disappears the moment anyone types. */}
      <TextInput
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder={t('pluginsInstalled.optionKeyPlaceholder')}
        aria-label={t('pluginsInstalled.optionKeyPlaceholder')}
        className="w-40 font-mono"
      />
      <TextInput
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('pluginsInstalled.optionValuePlaceholder')}
        aria-label={t('pluginsInstalled.optionValuePlaceholder')}
        className="w-56 font-mono"
      />
      <Button
        variant="ghost"
        disabled={trimmed === '' || duplicate}
        onClick={() => {
          onAdd(trimmed, parseOptionValue(value))
          setKey('')
          setValue('')
        }}
      >
        {t('pluginsInstalled.addOption')}
      </Button>
      <p className="text-[11px] text-text-muted">
        {duplicate ? t('pluginsInstalled.optionKeyExists') : t('pluginsInstalled.optionValueHint')}
      </p>
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
  const id = useId()
  // The key in the left column is the control's label, not decoration next to it: a select, a
  // number field and a text field had no accessible name at all here - the name was a <span> the
  // control knew nothing about, so a screen reader announced "combobox" and nothing else. It is a
  // real <label htmlFor> now (Select and TextInput pass `id` straight through to their element).
  //
  // The switch is the exception and keeps its own hidden label (see Toggle's hideLabel): its input
  // sits inside a <label> of its own, so the name would end up announced twice. The visible key
  // therefore stays a <span> in that one row - the name is in the DOM twice there, which is untidy
  // rather than wrong, and fixing it means teaching Toggle to be named from outside.
  const Key = field.kind === 'boolean' ? 'span' : 'label'
  return (
    <div className="flex items-center gap-3">
      <Key
        {...(field.kind === 'boolean' ? {} : { htmlFor: id })}
        className="w-40 shrink-0 font-mono text-xs text-text-secondary"
      >
        {field.name}
        {!field.optional && <span className="text-red-500"> *</span>}
      </Key>
      <div className="w-40 shrink-0">
        {field.kind === 'boolean' && (
          <Toggle label={field.name} hideLabel checked={value === true || value === 'true'} onChange={(checked) => onChange(checked)} />
        )}
        {field.kind === 'enum' && (
          <Select
            id={id}
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
            id={id}
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
            id={id}
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
      {field.description && <p className="flex-1 text-[11px] text-text-muted">{field.description}</p>}
    </div>
  )
}

function InferredFieldRow({
  name,
  value,
  onChange,
  onRemove
}: {
  name: string
  value: unknown
  onChange: (value: unknown) => void
  onRemove: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const id = useId()
  // Same as FieldRow: the key is the control's label, except for the switch, which brings its own -
  // see the comment there.
  const remove = <IconButton icon={Trash2} title={t('pluginsInstalled.removeOption', { name })} onClick={onRemove} />
  const keyLabel = (
    <label htmlFor={id} className="w-40 shrink-0 font-mono text-xs text-text-secondary">
      {name}
    </label>
  )

  if (typeof value === 'boolean') {
    return (
      <div className="flex items-center gap-3">
        <span className="w-40 shrink-0 font-mono text-xs text-text-secondary">{name}</span>
        <Toggle label={name} hideLabel checked={value} onChange={onChange} />
        {remove}
      </div>
    )
  }
  if (typeof value === 'number') {
    return (
      <div className="flex items-center gap-3">
        {keyLabel}
        <TextInput
          key={String(value)}
          id={id}
          type="number"
          defaultValue={String(value)}
          onBlur={(e) => onChange(Number(e.target.value))}
          className="w-40"
        />
        {remove}
      </div>
    )
  }
  // strings, arrays and objects: edited as text (JSON-encoded for arrays/objects), same as before
  const initial = typeof value === 'string' ? value : JSON.stringify(value)
  return (
    <div className="flex items-center gap-3">
      {keyLabel}
      <TextInput
        key={initial}
        id={id}
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
      {remove}
    </div>
  )
}
