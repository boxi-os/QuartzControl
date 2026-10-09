import { useEffect, useId, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { confirmDialog } from '../../utils/confirm'
import type { TFunction } from 'i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, Blocks, ChevronRight, ExternalLink, GripVertical, LayoutGrid, Puzzle, Search, SlidersHorizontal, Trash2, Workflow, Wrench } from 'lucide-react'
import { useProject } from '../ProjectLayout'
import type {
  GridFrameDefinition,
  PluginEntry,
  PluginLayoutDeclaration,
  PluginOptionField,
  QuartzConfig
} from '@shared/ipc-contract'
import { Badge, Button, Card, CardHeading, DetailLayout, IconButton, Select, TextInput, Toggle } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { announce } from '../../state/announcer'
import { primeStickyState, useStickyState } from '../../state/uiState'
import { useDndAccessibility } from '../../utils/dndAnnouncements'
import { useIpcQuery } from '../../state/useIpcQuery'
import { componentRef } from '../LayoutEditor/utils'
import { repoUrl } from './pluginSource'
import PluginOptionsForm from '../../components/PluginOptionsForm'
import { siteLanguages } from '../../components/PluginOptionsForm/siteLanguages'

// One column since 1.1: a plugin's options moved out of its row into the side panel (DetailLayout),
// so a row is one line of text and a few controls and no longer grows when it is configured. The
// two-column grid this replaced had a history of its own - rows of unequal height beside each other
// read as "both opened", and rectSortingStrategy's scale factor stretched cards while dragging -
// and both went with it.
const PLUGIN_LIST = 'flex flex-col gap-1.5'

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
// has six `quartz-layout-box` entries - when rows folded open, opening one opened all six. The key
// is now what the side panel remembers as selected. The occurrence number separates them. It is not perfect either: removing the
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
// `undefined` removes the key instead of writing it: left in the object, the YAML writer turns it
// into an explicit null, and a plugin reads `html: null` (or `html: ""`, which the string fields
// sent before) as a value that is set - the layout-box then rendered the empty HTML and never
// read its file. A cleared field means "not set", and "not set" is a missing key.
function setDeep(obj: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> {
  const [head, ...rest] = path
  if (rest.length === 0) {
    if (value !== undefined) return { ...obj, [head]: value }
    const { [head]: _removed, ...without } = obj
    return without
  }
  const child = (obj[head] as Record<string, unknown> | undefined) ?? {}
  return { ...obj, [head]: setDeep(child, rest, value) }
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
  // Which entry the side panel shows, by stickyKey() - a name, never an index (conventions.md).
  const [selectedKey, setSelectedKey] = useStickyState<string | null>('plugins.selected', null)
  // A drag listens for Escape on the document; the panel must not take it as "let go" meanwhile.
  const [dragging, setDragging] = useState(false)

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
  //
  // Against the newest state, not the render's, and one write after the other. Every option is
  // written on its own blur, and the form hands up the whole options object built from what it
  // was rendered with: a second field committed before the first save's re-read had arrived wrote
  // the state from before the first plus its own value, and the first was gone - at 0 and 300 ms
  // apart, i.e. typing and tabbing on (fortieth review, finding 3, measured). So the edit goes into
  // the page's state at once (the next field renders from it), the saves queue up, and only the
  // last of a run re-reads the file - an earlier re-read would put an older state back on screen.
  const configRef = useRef(config)
  configRef.current = config
  const writes = useRef<Promise<unknown>>(Promise.resolve())
  // The one way an edit on this page reaches the file - fields, the enabled switch and both kinds
  // of reordering. The switch and the arrows used to save the config they were rendered with,
  // beside the queue: a switch and a field tabbed out of right after it lost the switch, and two
  // quick clicks on an arrow moved the row once (measured in the built app, five of five, with no
  // delay added to the save).
  async function commit(mutate: (plugins: PluginEntry[]) => PluginEntry[]): Promise<void> {
    const current = configRef.current
    if (!current) return
    const next = { ...current, plugins: mutate(current.plugins) }
    configRef.current = next
    setConfig(next)
    const write = writes.current.then(() => window.quartzGui.config.save(project.path, next))
    writes.current = write.catch(() => {})
    try {
      await write
    } catch (err) {
      // What the file holds, back on screen, and the failure to the toast as before.
      await reload()
      throw err
    }
    if (configRef.current === next) await reload()
  }

  async function updateField(index: number, path: string[], value: unknown): Promise<void> {
    await commit((plugins) => plugins.map((p, i) => (i === index ? (setDeep(p, path, value) as PluginEntry) : p)))
    flagSaved(index)
  }

  async function toggleEnabled(index: number): Promise<void> {
    try {
      await commit((plugins) => plugins.map((p, i) => (i === index ? { ...p, enabled: !p.enabled } : p)))
    } catch (err) {
      setMessage(formatIpcError(err))
    }
  }

  async function removePlugin(item: IndexedPlugin): Promise<void> {
    const { plugin, frame } = item
    const name = frame ? frame.frameName : plugin.name
    const question = t(frame ? 'pluginsInstalled.removeFrameConfirm' : 'pluginsInstalled.removeConfirm', { name })
    if (!(await confirmDialog({ text: question, confirmLabel: t('common.remove'), danger: true }))) return
    setBusy(true)
    // In the write queue like every edit: a save still pending - the field the click on the bin
    // just blurred - wrote the whole config as it was rendered, entry included, after the CLI had
    // taken the entry out, and the entry was back in the config with nothing in the lockfile
    // (measured in the built app with a 3 s save; with an 800 ms save, a field changed during the
    // removal did the same). The panel's fields are locked by `busy` until the re-read below, so
    // nothing queues behind this with the entry still in it.
    const removal = writes.current.then(() =>
      // A frame has to go through layoutFrames.delete: `quartz plugin remove` alone unregisters it
      // but leaves .quartz-gui/authored-frames/<id> behind, which keeps the frame in the Layout
      // editor's list while it is no longer part of any build - and saveFrame() only re-registers
      // a frame whose directory is *new*, so it could never come back.
      frame ? window.quartzGui.layoutFrames.delete(project.path, frame.id) : window.quartzGui.plugins.remove(project.path, plugin.name)
    )
    writes.current = removal.catch(() => {})
    try {
      const result = await removal
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
    if (from === to) return
    const reordered = [...group]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)

    // The group says which entries and in what order; the entries themselves are the newest ones,
    // so a field saved a moment ago is not written back to what this render held.
    await commit((plugins) => {
      const next = [...plugins]
      reordered.forEach((item, i) => {
        const value = (i + 1) * 10
        const plugin = next[item.index]
        next[item.index] =
          field === 'order' ? { ...plugin, order: value } : { ...plugin, layout: { ...getLayout(plugin)!, priority: value } }
      })
      return next
    })
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
  }

  // Opens the Layout editor on the frames tab with this frame already loaded. The tab travels in
  // the URL, like every other sub-tab; which frame is open cannot - it is a whole frame object, not
  // one of three fixed names - so that half is still primed into the target route's sticky store
  // before navigating there.
  function openFrameInLayoutEditor(frame: GridFrameDefinition): void {
    const target = `/project/${project.id}/layout`
    // The same five keys the layout page primes itself (primeFrame in LayoutEditor/index.tsx): the
    // frames tab opens a frame without asking only when its baseline says it is unchanged.
    primeStickyState(target, 'frames.editing', frame)
    primeStickyState(target, 'frames.baseline', JSON.stringify(frame))
    primeStickyState(target, 'frames.isNewDraft', false)
    primeStickyState(target, 'frames.standardChosen', false)
    primeStickyState(target, 'frames.selectedArea', null)
    navigate(`${target}?tab=frames`)
  }

  // The stage on all pages with this component selected - where it is placed, by dragging.
  function openComponentOnStage(index: number): void {
    if (!config) return
    const target = `/project/${project.id}/layout`
    primeStickyState(target, 'layout.pageType', null)
    primeStickyState(target, 'layout.selected', componentRef(config.plugins, index))
    // The components tab is the default and so has no `?tab=`; without this the layout page would
    // open on whichever tab it was left on.
    primeStickyState(target, 'layout.tab', 'global')
    navigate(target)
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

  const selected = selectedKey === null ? undefined : items.find((item) => stickyKey(item) === selectedKey)
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
    selectedKey: selected ? selectedKey : null,
    onSelect: (item: IndexedPlugin) => setSelectedKey(stickyKey(item)),
    toggleEnabled,
    removePlugin
  }

  return (
    <DetailLayout
      panelWidth="wide"
      mainClassName="gap-0"
      panelLabel={t('pluginsInstalled.panelLabel')}
      onDismiss={() => setSelectedKey(null)}
      busy={dragging}
      panel={
        selected ? (
          <PluginPanel
            // Per entry: the options form keeps its search and folded groups, which belong to one plugin.
            key={stickyKey(selected)}
            item={selected}
            saved={savedIndex === selected.index}
            outdated={outdated.has(selected.plugin.name)}
            busy={busy}
            languages={siteLanguages(config)}
            toggleEnabled={toggleEnabled}
            updateField={updateField}
            openFrameInLayoutEditor={openFrameInLayoutEditor}
            openComponentOnStage={openComponentOnStage}
          />
        ) : (
          <Card className="flex flex-col gap-3">
            <CardHeading icon={SlidersHorizontal}>{t('pluginsInstalled.panelEmptyTitle')}</CardHeading>
            <p className="text-ui text-text-secondary">{t('pluginsInstalled.panelEmptyText')}</p>
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-ui">
              <dt className="text-text-secondary">{t('pluginsInstalled.summaryActive')}</dt>
              <dd className="text-right tabular-nums">{t('pluginsInstalled.summaryOf', { count: activeCount, total: items.length })}</dd>
              <dt className="text-text-secondary">{t('pluginsInstalled.componentsHeading')}</dt>
              <dd className="text-right tabular-nums">{componentItems.length}</dd>
              <dt className="text-text-secondary">{t('pluginsInstalled.processingHeading')}</dt>
              <dd className="text-right tabular-nums">{processingItems.length}</dd>
              {frameItems.length > 0 && (
                <>
                  <dt className="text-text-secondary">{t('pluginsInstalled.framesHeading')}</dt>
                  <dd className="text-right tabular-nums">{frameItems.length}</dd>
                </>
              )}
              {outdated.size > 0 && (
                <>
                  <dt className="text-text-secondary">{t('pluginsInstalled.updateAvailable')}</dt>
                  <dd className="text-right tabular-nums">{outdated.size}</dd>
                </>
              )}
            </dl>
          </Card>
        )
      }
    >
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
              className={`rounded-[6px] px-3 py-1 text-ui font-medium transition-colors ${
                enabledFilter === key
                  ? 'bg-surface text-text shadow-sm dark:bg-ink/20'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              {t(`pluginsInstalled.filters.${key}`)}
            </button>
          ))}
        </div>
        <p className="ml-auto text-ui text-text-muted">
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
          <CardHeading icon={LayoutGrid} className="mb-1">{t('pluginsInstalled.framesHeading')}</CardHeading>
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
          <CardHeading icon={Blocks} className="mb-1">{t('pluginsInstalled.componentsHeading')}</CardHeading>
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
                    onDragState={setDragging}
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
          <CardHeading icon={Workflow} className="mb-1">{t('pluginsInstalled.processingHeading')}</CardHeading>
          <p className="mb-3 max-w-3xl text-xs text-text-muted">{t('pluginsInstalled.processingDescription')}</p>
          <div className="flex flex-col gap-5">
            {pageTypeItems.some(matches) && (
              <div>
                <GroupHeading label={t('pluginsInstalled.pageTypesGroup')} count={pageTypeItems.filter(matches).length} />
                <ReorderableList
                  onDragState={setDragging}
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
                  onDragState={setDragging}
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
        <CardHeading icon={Wrench} className="mb-1">{t('pluginsInstalled.maintenanceHeading')}</CardHeading>
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
    </DetailLayout>
  )
}

// The plain-language name of a group, with the raw config key next to it - the key is what is in
// quartz.config.yaml and what the row's own `position:` summary repeats, so dropping it entirely
// would break the link between this UI and the file it edits.
function GroupHeading({ label, rawKey, count }: { label: string; rawKey?: string; count: number }): JSX.Element {
  return (
    <h3 className="mb-2 flex items-baseline gap-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
      {label}
      {rawKey && <span className="font-mono text-micro font-normal normal-case tracking-normal text-text-muted">{rawKey}</span>}
      <span className="font-normal text-text-muted">({count})</span>
    </h3>
  )
}

interface PluginRowProps {
  item: IndexedPlugin
  busy: boolean
  canReorder: boolean
  outdated: Set<string>
  savedIndex: number | null
  selectedKey: string | null
  onSelect: (item: IndexedPlugin) => void
  toggleEnabled: (index: number) => void
  removePlugin: (item: IndexedPlugin) => void
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
  onDragState,
  children
}: {
  onDragState: (dragging: boolean) => void
  ids: string[]
  /** Display name per id, so the drag can be narrated with the names on screen. */
  names: Map<string, string>
  canReorder: boolean
  onReorder: (from: number, to: number) => void
  children: React.ReactNode
}): JSX.Element {
  const { t } = useTranslation()
  const { announcements, screenReaderInstructions } = useDndAccessibility(t, (id) => names.get(id) ?? '')
  // The keyboard sensor is a default of DndContext, but its default coordinate getter is not:
  // it moves the picked-up item by a fixed 25px per arrow press, which in this list (cards ~130px
  // tall when this was measured, two columns then) never reaches the next card - measured in the running app,
  // where space picked the row up and every arrow press left it over itself. sortableKeyboardCoordinates
  // walks to the neighbouring *item* instead, which is what "nach oben" means here.
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  function handleDragEnd(event: DragEndEvent): void {
    onDragState(false)
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
      onDragStart={() => onDragState(true)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => onDragState(false)}
      accessibility={{ announcements, screenReaderInstructions }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
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
  // own.
  //
  // `Translate`, not `Transform`, kept from the two-column grid: `rectSortingStrategy` swapped *rectangles*, and its transform
  // carries the scale factor that squeezes each card into the rectangle it moves into. With the
  // equal-height rows gone that factor stopped being 1 - measured in the built app at 1728x1000,
  // two columns: dragging one closed card past its neighbours scaled them to 0.86 and 0.81, and
  // with one card expanded, a 77px card was stretched to 733px (9.58x) and the open one squashed
  // to 0.15 while the pointer was down, text and all. Dropping the scale is dnd-kit's own answer
  // for a list whose items are not the same size; the neighbours slide, which is what the gesture
  // is showing anyway (review 2026-09-14, finding 12).
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? 'opacity-40' : undefined}
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
  selectedKey,
  onSelect,
  toggleEnabled,
  removePlugin,
  position,
  groupSize,
  onMove,
  handleRef,
  handleProps
}: PluginRowProps): JSX.Element {
  const { t } = useTranslation()
  const { plugin, index, frame } = item
  const layout = getLayout(plugin)
  const rowName = displayName(item)
  const selected = selectedKey === stickyKey(item)
  const description = getPluginDescription(t, plugin.name)
  const url = repoUrl(plugin.source)

  const summary = layout
    ? t('pluginsInstalled.summaryPosPriority', { position: layout.position ?? '–', priority: layout.priority ?? '–' })
    : frame
      ? t('pluginsInstalled.frameSummary', { count: frame.areas.length })
      : plugin.order != null
        ? t('pluginsInstalled.summaryOrder', { order: String(plugin.order) })
        : null

  // The whole row selects, except where a click means its own control - the switch, the handle,
  // the arrows, the bin, the repository link. The name is the button that does it for the
  // keyboard; the row's click is the larger target for the pointer.
  function onRowClick(e: MouseEvent<HTMLDivElement>): void {
    if ((e.target as HTMLElement).closest('button, a, input, label')) return
    // As in SelectableRow: left on <body>, the focus never lets Escape reach the DetailLayout.
    e.currentTarget.querySelector<HTMLElement>('button[aria-pressed]')?.focus()
    onSelect(item)
  }

  return (
    <Card
      data-selectable
      onClick={onRowClick}
      className={`cursor-pointer px-3 py-2 ${plugin.enabled ? '' : 'bg-ink/[0.02] dark:bg-ink/[0.02]'} ${
        selected ? 'outline outline-2 outline-offset-1 outline-blue-500' : ''
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Only the handle is the drag activator. With the whole card as one, any drag gesture -
            selecting the description, a click to select the row - started a reorder.
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
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(item)}
              className="break-words text-left font-medium leading-tight hover:underline"
            >
              {rowName}
            </button>
            {frame && <Badge>{t('pluginsInstalled.frameBadge')}</Badge>}
            {outdated.has(plugin.name) && <Badge tone="amber">{t('pluginsInstalled.updateAvailable')}</Badge>}
            {savedIndex === index && <span className="text-micro text-green-600 dark:text-green-400">{t('pluginsInstalled.savedFlash')}</span>}
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
          {description && <p className="mt-0.5 line-clamp-1 text-xs text-text-muted" title={description}>{description}</p>}
          {summary && <p className="mt-0.5 font-mono text-micro text-text-muted">{summary}</p>}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {/* The keyboard alternative to the handle. dnd-kit's keyboard sensor can do the same
              thing (space, arrows, space), but it is a modal gesture one has to know about;
              two arrows are one keystroke each and are the same control the CSS load order uses.
              Not the layout editor, which this used to name as well: a card there can move into
              six other zones and back onto the palette, so a pair of arrows would answer one of
              seven directions and look as though it answered all of them (nineteenth review,
              finding 6). They are as filter-sensitive as the drag is - see cardProps. */}
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
          <IconButton icon={Trash2} title={t('common.removeNamed', { name: rowName })} onClick={() => removePlugin(item)} disabled={busy} />
        </div>
      </div>
    </Card>
  )
}

/**
 * The selected entry in the side panel: what it is, where it sits, and its options. A component's
 * placement (`layout`) is the same five fields the row used to fold open, with a way to the stage
 * where it is placed by dragging; a frame is configured in the layout editor and only says so.
 *
 * Every field writes on its own (updateField, through the page's write queue) - there is no Save on
 * this page, and the green word beside the name is the sign that it happened.
 */
function PluginPanel({
  item,
  saved,
  outdated,
  busy,
  languages,
  toggleEnabled,
  updateField,
  openFrameInLayoutEditor,
  openComponentOnStage
}: {
  item: IndexedPlugin
  saved: boolean
  outdated: boolean
  busy: boolean
  /** The site's language codes, for option keys that are languages (layout-box's byLang). */
  languages: string[]
  toggleEnabled: (index: number) => void
  updateField: (index: number, path: string[], value: unknown) => void
  openFrameInLayoutEditor: (frame: GridFrameDefinition) => void
  openComponentOnStage: (index: number) => void
}): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const { plugin, index, frame } = item
  const layout = getLayout(plugin)
  const name = displayName(item)
  const description = getPluginDescription(t, plugin.name)
  const url = repoUrl(plugin.source)
  const sourceKey = JSON.stringify(plugin.source)
  // One choice for every plugin, not one per plugin: whoever opens it wants to see placements.
  const [placementOpen, setPlacementOpen] = useStickyState('plugins.placementOpen', false)
  const placementId = useId()
  // A frame's "plugin" is generated JS with no schema to read; it is configured in the layout editor.
  const schemaQuery = useIpcQuery(
    () => (frame ? Promise.resolve(null) : window.quartzGui.plugins.optionSchema({ projectPath: project.path, source: plugin.source })),
    [project.path, sourceKey, frame?.id]
  )

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardHeading icon={frame ? LayoutGrid : layout ? Blocks : Puzzle}>
          <span className="break-words">{name}</span>
        </CardHeading>
        <div className="flex flex-wrap items-center gap-2">
          {frame && <Badge>{t('pluginsInstalled.frameBadge')}</Badge>}
          {outdated && <Badge tone="amber">{t('pluginsInstalled.updateAvailable')}</Badge>}
          {saved && <span className="text-micro text-green-600 dark:text-green-400">{t('pluginsInstalled.savedFlash')}</span>}
        </div>
        <p className="break-all text-xs text-text-muted">
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
        {description && <p className="text-ui text-text-secondary">{description}</p>}
      </div>

      <Toggle
        label={t('pluginsInstalled.panelEnabled')}
        checked={plugin.enabled}
        onChange={() => toggleEnabled(index)}
        disabled={busy}
      />

      {frame && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-ui text-text-secondary">{t('pluginsInstalled.framesDescription')}</p>
          <Button variant="ghost" onClick={() => openFrameInLayoutEditor(frame)}>
            {t('pluginsInstalled.openInLayoutEditor')}
          </Button>
        </div>
      )}

      {/* Locked while an entry is being removed: a field that wrote now would queue the config as
          rendered, the removed entry still in it, behind the removal (see removePlugin). */}
      <fieldset disabled={busy} className="flex min-w-0 flex-col gap-4">
        {layout && (
          <section className="flex flex-col gap-3 border-t border-ink/[0.06] pt-3 dark:border-ink/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Folded by default: the stage is where placement is set, and with a group the fields
                  here pushed the options far down. Folded, one line says where it stands. */}
              <h3 className="min-w-0 flex-1">
                <button
                  type="button"
                  aria-expanded={placementOpen}
                  aria-controls={placementId}
                  onClick={() => setPlacementOpen(!placementOpen)}
                  className="flex w-full items-center gap-1.5 text-left text-micro font-semibold uppercase tracking-wide text-text-secondary hover:text-text"
                >
                  <ChevronRight size={13} aria-hidden className={`shrink-0 transition-transform ${placementOpen ? 'rotate-90' : ''}`} />
                  {t('pluginsInstalled.placementHeading')}
                </button>
              </h3>
              <Button variant="ghost" onClick={() => openComponentOnStage(index)}>
                {t('pluginsInstalled.showOnStage')}
              </Button>
            </div>
            {placementOpen ? (
              <div id={placementId} className="flex flex-col gap-3">
                <FieldGroup
                  fields={buildLayoutFields(t)}
                  values={layout as unknown as Record<string, unknown>}
                  onChange={(field, value) => updateField(index, ['layout', field], value)}
                />
                {/* groupOptions only makes sense once the plugin is actually placed in a group */}
                {layout.group && (
                  <div className="flex flex-col gap-3 border-t border-dashed border-ink/10 pt-3 dark:border-ink/10">
                    <p className="font-mono text-micro text-text-muted">groupOptions</p>
                    <FieldGroup
                      fields={buildGroupOptionsFields(t)}
                      values={layout.groupOptions ?? {}}
                      onChange={(field, value) => updateField(index, ['layout', 'groupOptions', field], value)}
                    />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-ui text-text-secondary">
                {[
                  t(`positions.${layout.position}`, layout.position),
                  t('pluginsInstalled.placementPriority', { priority: layout.priority }),
                  layout.group ? t('pluginsInstalled.placementGroup', { group: layout.group }) : null
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </section>
        )}

        {!frame && (
          <section className="flex flex-col gap-3 border-t border-ink/[0.06] pt-3 dark:border-ink/10">
            <h3 className="text-micro font-semibold uppercase tracking-wide text-text-secondary">{t('pluginsInstalled.optionsHeading')}</h3>
            {schemaQuery.loading ? (
              <p className="text-micro text-text-muted">{t('layoutEditor.inspector.optionsLoading')}</p>
            ) : schemaQuery.error || !schemaQuery.data ? (
              <p className="text-micro text-red-600 dark:text-red-400">{t('layoutEditor.inspector.optionsError', { reason: schemaQuery.error ?? '' })}</p>
            ) : (
              <>
                {schemaQuery.data.unreadable && (
                  <p className="text-micro text-amber-700 dark:text-amber-300">{t('pluginOptions.unreadable', { reason: schemaQuery.data.unreadable })}</p>
                )}
                <PluginOptionsForm
                  schema={schemaQuery.data.schema}
                  values={plugin.options ?? {}}
                  onChange={(next) => updateField(index, ['options'], next)}
                  explicitEmpty
                  languages={languages}
                  projectPath={project.path}
                />
              </>
            )}
          </section>
        )}
      </fieldset>
    </Card>
  )
}

// The placement fields of a component - quartz's own five, the same for every plugin, and
// groupOptions. One under the other like the plugin's options below them in the panel.
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
    <div className="flex flex-col gap-3">
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
  // The key is the control's label, not decoration next to it: a select, a number field and a text
  // field had no accessible name at all here once - the name was a <span> the control knew nothing
  // about. It is a real <label htmlFor> (Select and TextInput pass `id` straight through).
  //
  // The switch is the exception and keeps its own hidden label (see Toggle's hideLabel): its input
  // sits inside a <label> of its own, so the name would end up announced twice.
  const Key = field.kind === 'boolean' ? 'span' : 'label'
  return (
    <div className="flex flex-col gap-1">
      <Key {...(field.kind === 'boolean' ? {} : { htmlFor: id })} className="font-mono text-xs font-medium text-text-secondary">
        {field.name}
        {!field.optional && <span className="text-red-500"> *</span>}
      </Key>
      <div>
        {field.kind === 'boolean' && (
          <Toggle label={field.name} hideLabel checked={value === true || value === 'true'} onChange={(checked) => onChange(checked)} />
        )}
        {field.kind === 'enum' && (
          <Select
            id={id}
            value={typeof value === 'string' && field.enumValues?.includes(value) ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-56 max-w-full"
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
            className="w-32"
          />
        )}
        {field.kind === 'string' && (
          <TextInput
            key={currentText}
            id={id}
            type="text"
            defaultValue={currentText}
            onBlur={(e) => {
              if (e.target.value !== currentText) onChange(e.target.value === '' ? undefined : e.target.value)
            }}
            className="w-56 max-w-full"
          />
        )}
      </div>
      {field.description && <p className="text-micro text-text-muted">{field.description}</p>}
    </div>
  )
}
