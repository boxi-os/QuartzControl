import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  FlexGroupConfig,
  FrameBreakpoint,
  FrameBreakpointWidths,
  GridFrameDefinition,
  LayoutPosition,
  PluginEntry,
  PluginLayoutDeclaration,
  QuartzConfig
} from '@shared/ipc-contract'
import { DEFAULT_FRAME_BREAKPOINT_WIDTHS, FRAME_BREAKPOINTS, buildFrameBox, buildGridStyle } from '@shared/gridFrameCss'
import { Badge, Button, Card, Field, SegmentedControl, Select, SettingsSection, TextInput } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import DevServerRestartHint from '../../components/DevServerRestartHint'
import { ItemCard, PaletteChip, GROUP_COLORS } from './ComponentPill'
import { dndAccessibility } from '../../utils/dndAnnouncements'
import {
  BUILTIN_FRAME_LAYOUT,
  DEFAULT_FRAME_GRID,
  POSITIONS,
  breakpointRangeLabel,
  appendDuplicateToPosition,
  buildPositionMap,
  derivePageTypes,
  distinctComponentChips,
  duplicateAfter,
  duplicateNameCounts,
  duplicateRanks,
  renumberPriorities,
  sidebarDirection,
  withDisplay,
  withGroup
} from './utils'

// A palette chip's drag id is namespaced so handleDragEnd can tell "create a new instance here"
// apart from "move this existing instance here" without a second DnD implementation.
const PALETTE_PREFIX = 'palette:'

// Dropping a placed instance back onto the palette removes it - the reverse of dragging a palette
// chip out. Fixed id, distinct from any LayoutPosition or plugin index string.
const PALETTE_DROP_ID = 'palette-drop-zone'

// Plain closestCenter compares the *dragged rect's* center (not the cursor) against each
// droppable's center - grabbing a wide card by its left-edge handle offsets that rect's center
// well away from the cursor, so a drop that's visually over a small/distant target like the
// palette can resolve to whatever unrelated droppable happens to be nearer that offset center
// instead. Falling back to closestCenter only when the pointer isn't over anything keeps ordinary
// reordering (dragging one list item over another, same-size rects, no such offset problem) as
// forgiving as before.
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  return pointerCollisions.length > 0 ? pointerCollisions : closestCenter(args)
}

function findContainer(positions: Record<LayoutPosition, number[]>, id: string): LayoutPosition | null {
  if ((POSITIONS as string[]).includes(id)) return id as LayoutPosition
  for (const pos of POSITIONS) {
    if (positions[pos].some((i) => String(i) === id)) return pos
  }
  return null
}

export default function GlobalBoard({
  projectPath,
  config,
  onChange,
  builtinPageTypeFrames = {}
}: {
  projectPath: string
  config: QuartzConfig
  onChange: (next: QuartzConfig) => void
  // Frame names built-in pageType plugins (e.g. canvas-page) default to, keyed by plugin display
  // name - see LayoutEditor/index.tsx. Needed so the mockup below doesn't claim the literal
  // 3-column default frame for a page type whose plugin actually renders something else.
  builtinPageTypeFrames?: Record<string, string>
}): JSX.Element {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [breakpoint, setBreakpoint] = useState<FrameBreakpoint>('desktop')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [frames, setFrames] = useState<GridFrameDefinition[]>([])
  // Which page type's assigned template the grid mockup below illustrates - purely a display
  // choice (see the comment below), defaults to "content" since that's Quartz's de-facto
  // site-wide default (ordinary notes). Not necessarily present in `pageTypes` on the very first
  // render (plugins may still be loading), which is fine - the byPageType lookup below just comes
  // back empty until it is.
  const [previewPageType, setPreviewPageType] = useState('content')
  // Only used to label the breakpoint tabs below; the editing state lives in FrameBreakpoints,
  // which reports back here so the labels follow a save without a remount.
  const [breakpointWidths, setBreakpointWidths] = useState<FrameBreakpointWidths>(DEFAULT_FRAME_BREAKPOINT_WIDTHS)
  const positions = buildPositionMap(config.plugins)
  const groupNames = Object.keys(config.layout?.groups ?? {})
  const nameCounts = duplicateNameCounts(config.plugins)
  const ranks = duplicateRanks(config.plugins)
  const pageTypes = derivePageTypes(config.plugins)

  useEffect(() => {
    window.quartzGui.layoutFrames.getBreakpoints(projectPath).then(setBreakpointWidths)
  }, [projectPath])

  useEffect(() => {
    window.quartzGui.layoutFrames.list(projectPath).then(setFrames)
  }, [projectPath])

  // Global's board doesn't carry a page-type context of its own - it edits the one component
  // list that feeds every page type, and this switcher doesn't change that: it only picks which
  // page type's assigned template the grid mockup illustrates (and, as a side effect, which
  // positions that template leaves "unassigned" below) - it does NOT apply that page type's own
  // exclude/positions overrides (that stays a Seitentypen-tab concern, PageTypeOverrides.tsx).
  const activeFrameName = config.layout?.byPageType?.[previewPageType]?.template
  const activeFrame = activeFrameName ? (frames.find((f) => f.frameName === activeFrameName) ?? null) : null
  const activeLayout = activeFrame?.breakpoints[breakpoint] ?? null
  const activeAreas =
    activeFrame && activeLayout
      ? activeFrame.areas.filter((a) => {
          const p = activeLayout.placements[a.id]
          return p && !p.hidden
        })
      : null
  const activeGridStyle = activeFrame && activeLayout ? buildGridStyle(activeLayout, activeFrame.areas) : null
  // A custom frame's width cap, alignment and padding belong on this board too - it is the page as
  // it will be built, and leaving them out would show a full-width layout for a frame that is not.
  const activeBox = activeLayout ? buildFrameBox(activeLayout) : null
  const activeUsedSlots = activeAreas
    ? new Set(activeAreas.map((a) => a.slot).filter((s): s is LayoutPosition => s !== 'pageBody'))
    : null

  // "full-width"/"minimal" are the two other built-in frames (besides the unnamed/"default" one
  // DEFAULT_FRAME_GRID depicts) - real, fixed single-column shapes, not a custom authored frame, so
  // they're looked up in BUILTIN_FRAME_LAYOUT rather than the `frames` list.
  const builtinFrame =
    activeFrameName && activeFrameName in BUILTIN_FRAME_LAYOUT ? BUILTIN_FRAME_LAYOUT[activeFrameName as 'full-width' | 'minimal'] : null

  const visibleSlots = activeUsedSlots ?? (builtinFrame ? new Set(builtinFrame.visibleSlots) : null)
  const activeUnassignedSlots = visibleSlots ? POSITIONS.filter((p) => !visibleSlots.has(p)) : []

  // Quartz resolves the frame as `override.template ?? pageType.frame ?? "default"` (dispatcher.ts)
  // - so when there's no explicit override AND this page type's own plugin declares its own default
  // frame (e.g. canvas-page -> "canvas"), the real rendered layout is that plugin's frame, not the
  // literal 3-column default this mockup otherwise falls back to. We have no declarative shape for
  // an arbitrary plugin-rendered frame (unlike our own authored GridFrameDefinitions or the two
  // other built-ins above), so the best honest answer here is a placeholder, not a mockup that's
  // simply wrong.
  const builtinDefaultFrame = builtinPageTypeFrames[`${previewPageType}-page`]
  const unknownPluginFrame = !activeFrameName && !activeFrame && builtinDefaultFrame != null && builtinDefaultFrame !== 'default'

  // What a drag id means here, in words: a palette chip about to be placed, the palette itself as
  // a drop target, one of the six layout positions, or - a bare number - the plugin at that index
  // in the config. dnd-kit would otherwise narrate "droppable area 37" in English.
  function describeDragId(id: string): string {
    if (id === PALETTE_DROP_ID) return t('layoutEditor.componentPill.paletteLabel')
    // A palette id carries the *index* of the plugin it would duplicate, not its name
    // (appendDuplicateToPosition needs the index) - so it resolves the same way as a placed item.
    const index = id.startsWith(PALETTE_PREFIX) ? Number(id.slice(PALETTE_PREFIX.length)) : Number(id)
    if (id.startsWith(PALETTE_PREFIX)) return config.plugins[index]?.name ?? id
    if ((POSITIONS as string[]).includes(id)) return t(`positions.${id}`, id)
    return config.plugins[index]?.name ?? id
  }
  const { announcements, screenReaderInstructions } = dndAccessibility(t, describeDragId)

  function handleDragStart(event: DragStartEvent): void {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent): void {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)

    // Dropping a placed duplicate back onto the palette removes it - mirrors the "Duplikat
    // entfernen" button in its expand panel, and only applies to duplicates for the same reason
    // that button is hidden for a sole instance (see removeDuplicate below).
    if (String(over.id) === PALETTE_DROP_ID && !activeId.startsWith(PALETTE_PREFIX)) {
      const index = Number(activeId)
      const plugin = config.plugins[index]
      if (plugin && (nameCounts.get(plugin.name) ?? 0) > 1) removeDuplicate(index)
      return
    }

    const toContainer = findContainer(positions, String(over.id))
    if (!toContainer) return

    if (activeId.startsWith(PALETTE_PREFIX)) {
      const sourceIndex = Number(activeId.slice(PALETTE_PREFIX.length))
      const overIndex = positions[toContainer].indexOf(Number(over.id))
      const result = appendDuplicateToPosition(config.plugins, sourceIndex, toContainer, overIndex === -1 ? undefined : overIndex)
      if (!result) return
      onChange({ ...config, plugins: result.plugins })
      setExpandedIndex(result.newIndex)
      return
    }

    const fromContainer = findContainer(positions, activeId)
    if (!fromContainer) return

    const sourceIndex = positions[fromContainer].indexOf(Number(activeId))
    const next: Record<LayoutPosition, number[]> = { ...positions }
    next[fromContainer] = [...positions[fromContainer]]
    next[fromContainer].splice(sourceIndex, 1)

    if (fromContainer === toContainer) {
      const overIndex = positions[toContainer].indexOf(Number(over.id))
      const targetIndex = overIndex === -1 ? next[toContainer].length : overIndex
      next[toContainer].splice(targetIndex, 0, Number(activeId))
    } else {
      next[toContainer] = [...positions[toContainer]]
      const overIndex = positions[toContainer].indexOf(Number(over.id))
      const targetIndex = overIndex === -1 ? next[toContainer].length : overIndex
      next[toContainer].splice(targetIndex, 0, Number(activeId))
    }

    if (next[fromContainer].join(',') === positions[fromContainer].join(',') && fromContainer === toContainer) return

    const renumbered = new Map<number, { position: LayoutPosition; priority: number }>()
    for (const pos of fromContainer === toContainer ? [fromContainer] : [fromContainer, toContainer]) {
      for (const [index, priority] of renumberPriorities(next[pos])) {
        renumbered.set(index, { position: pos, priority })
      }
    }

    const plugins: PluginEntry[] = config.plugins.map((plugin, index) => {
      const update = renumbered.get(index)
      if (!update || !plugin.layout) return plugin
      return { ...plugin, layout: { ...plugin.layout, position: update.position, priority: update.priority } }
    })
    onChange({ ...config, plugins })
  }

  function setGroup(index: number, group: string): void {
    onChange({ ...config, plugins: withGroup(config.plugins, index, group) })
  }

  function setDisplay(index: number, display: PluginLayoutDeclaration['display']): void {
    onChange({ ...config, plugins: withDisplay(config.plugins, index, display) })
  }

  function duplicate(index: number): void {
    const result = duplicateAfter(config.plugins, index)
    if (!result) return
    onChange({ ...config, plugins: result.plugins })
    setExpandedIndex(result.newIndex)
  }

  // Only offered for the 2nd+ instance of a source - deletes just this array entry, no CLI call.
  // The sole/original instance stays a Plugins -> Installed concern (uninstalling the plugin).
  function removeDuplicate(index: number): void {
    const plugins = config.plugins.filter((_, i) => i !== index)
    onChange({ ...config, plugins })
    setExpandedIndex(null)
  }

  function setGroups(groups: Record<string, FlexGroupConfig>): void {
    onChange({ ...config, layout: { ...config.layout, groups } })
  }

  function addGroup(name: string): void {
    if (!name.trim() || (config.layout?.groups ?? {})[name]) return
    setGroups({ ...(config.layout?.groups ?? {}), [name]: { direction: 'row', gap: '0.5rem' } })
  }

  function updateGroup(name: string, patch: Partial<FlexGroupConfig>): void {
    setGroups({ ...(config.layout?.groups ?? {}), [name]: { ...(config.layout?.groups ?? {})[name], ...patch } })
  }

  function deleteGroup(name: string): void {
    const groups = { ...(config.layout?.groups ?? {}) }
    delete groups[name]
    // members keep their `group` field pointing at a now-undefined group, which quartz's
    // resolveGroups() just renders as an ungrouped default-row flex of one - harmless, and
    // editable back to "keine" per-item without needing to touch every member here.
    setGroups(groups)
  }

  const activeItem = activeId && !activeId.startsWith(PALETTE_PREFIX) ? config.plugins[Number(activeId)] : null
  const activePaletteSource = activeId?.startsWith(PALETTE_PREFIX) ? config.plugins[Number(activeId.slice(PALETTE_PREFIX.length))] : null
  const grid = DEFAULT_FRAME_GRID[breakpoint]
  const narrow = breakpoint !== 'desktop'

  const slotProps = { config, groupNames, nameCounts, ranks, expandedIndex, onExpand: setExpandedIndex, onSetGroup: setGroup, onSetDisplay: setDisplay, onDuplicate: duplicate, onRemove: removeDuplicate }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label={t('layoutEditor.frameBuilder.breakpointLabel')}
          value={breakpoint}
          onChange={setBreakpoint}
          options={FRAME_BREAKPOINTS.map((bp) => ({
            value: bp,
            // Only an authored frame follows the configured widths - a page on a built-in frame
            // reflows at Quartz's own, so printing ours next to it would be a claim this preview
            // cannot keep.
            label: activeFrame
              ? `${t(`layoutEditor.frameBuilder.breakpoint.${bp}`)} · ${breakpointRangeLabel(bp, breakpointWidths)}`
              : t(`layoutEditor.frameBuilder.breakpoint.${bp}`)
          }))}
        />
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text-muted">{t('layoutEditor.previewPageTypeLabel')}</label>
          <Select value={previewPageType} onChange={(e) => setPreviewPageType(e.target.value)} className="w-40">
            {pageTypes.map((pt) => (
              <option key={pt} value={pt}>
                {t(`layoutEditor.pageTypes.${pt}`, pt)}
              </option>
            ))}
          </Select>
          <p className="text-xs text-text-muted">
            {activeFrame
              ? t('layoutEditor.activeFrameLabel', { name: activeFrame.frameName })
              : builtinFrame
                ? t('layoutEditor.activeFrameLabel', {
                    name: t(`layoutEditor.template${activeFrameName === 'full-width' ? 'FullWidth' : 'Minimal'}`)
                  })
                : unknownPluginFrame
                  ? t('layoutEditor.activeFrameLabel', { name: builtinDefaultFrame })
                  : t('layoutEditor.activeFrameDefault')}
          </p>
        </div>
      </div>

      <FrameBreakpoints
        projectPath={projectPath}
        widths={breakpointWidths}
        onSaved={setBreakpointWidths}
        hasFrames={frames.length > 0}
      />

      {/* useDraggable/useDroppable only register with the nearest ancestor DndContext, so the
          palette has to be a child of it, not a sibling - otherwise its chips are inert. */}
      <DndContext
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        accessibility={{ announcements, screenReaderInstructions }}
      >
        <ComponentPalette
          plugins={config.plugins}
          activePaletteSource={activePaletteSource !== null}
          removableActive={activeItem !== null && (nameCounts.get(activeItem.name) ?? 0) > 1}
        />

        <div className={narrow ? 'mx-auto w-full' : 'w-full'} style={{ maxWidth: breakpoint === 'mobile' ? '22rem' : undefined }}>
          {activeFrame && activeAreas && activeGridStyle ? (
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: activeGridStyle.gridTemplateColumns,
                gridTemplateRows: activeGridStyle.gridTemplateRows,
                gridTemplateAreas: activeGridStyle.gridTemplateAreas,
                rowGap: activeGridStyle.rowGap,
                columnGap: activeGridStyle.columnGap,
                width: activeBox?.width,
                maxWidth: activeBox?.maxWidth,
                marginInline: activeBox?.marginInline,
                paddingBlock: activeBox?.paddingBlock,
                paddingInline: activeBox?.paddingInline
              }}
            >
              {activeAreas.map((area) => (
                <div key={area.id} style={{ gridArea: area.name }}>
                  <AreaBox label={area.name} slotLabel={t(`positions.${area.slot}`, area.slot)}>
                    {area.slot === 'pageBody' ? (
                      <div className="rounded-[4px] border border-dashed border-ink/10 px-2 py-3 text-center text-text-muted dark:border-ink/10">
                        {t('layoutEditor.frameBuilder.preview.pageContent')}
                      </div>
                    ) : (
                      <PositionSlot position={area.slot} indices={positions[area.slot]} direction="column" {...slotProps} />
                    )}
                  </AreaBox>
                </div>
              ))}
            </div>
          ) : builtinFrame ? (
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: 'auto',
                gridTemplateRows: `repeat(${builtinFrame.visibleSlots.length + 1}, auto)`,
                gridTemplateAreas: builtinFrame.areas
              }}
            >
              {builtinFrame.visibleSlots.includes('header') && (
                <div style={{ gridArea: 'header' }}>
                  <AreaBox label={t('positions.header')}>
                    <PositionSlot position="header" indices={positions.header} direction="column" {...slotProps} />
                  </AreaBox>
                </div>
              )}
              {builtinFrame.visibleSlots.includes('beforeBody') && (
                <div style={{ gridArea: 'beforeBody' }}>
                  <AreaBox label={t('positions.beforeBody')}>
                    <PositionSlot position="beforeBody" indices={positions.beforeBody} direction="column" {...slotProps} />
                  </AreaBox>
                </div>
              )}
              <div
                style={{ gridArea: 'center' }}
                className="rounded-[4px] border border-dashed border-ink/10 px-2 py-3 text-center text-text-muted dark:border-ink/10"
              >
                {t('layoutEditor.frameBuilder.preview.pageContent')}
              </div>
              {builtinFrame.visibleSlots.includes('afterBody') && (
                <div style={{ gridArea: 'afterBody' }}>
                  <AreaBox label={t('positions.afterBody')}>
                    <PositionSlot position="afterBody" indices={positions.afterBody} direction="column" {...slotProps} />
                  </AreaBox>
                </div>
              )}
              {builtinFrame.visibleSlots.includes('footer') && (
                <div style={{ gridArea: 'footer' }}>
                  <AreaBox label={t('positions.footer')}>
                    <PositionSlot position="footer" indices={positions.footer} direction="column" {...slotProps} />
                  </AreaBox>
                </div>
              )}
            </div>
          ) : unknownPluginFrame ? (
            <div className="rounded-[6px] border border-dashed border-amber-400/50 bg-amber-50/50 px-4 py-6 text-center text-sm text-amber-700 dark:border-amber-400/30 dark:bg-amber-950/20 dark:text-amber-400">
              {t('layoutEditor.pluginFrameUnknownLayout', { frame: builtinDefaultFrame })}
            </div>
          ) : (
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: grid.columns, gridTemplateRows: grid.rows, gridTemplateAreas: grid.areas }}
            >
              <div style={{ gridArea: 'sidebar-left' }}>
                <AreaBox label={t('positions.left')}>
                  <PositionSlot position="left" indices={positions.left} direction={sidebarDirection('left', breakpoint)} {...slotProps} />
                </AreaBox>
              </div>
              <div style={{ gridArea: 'header' }}>
                <AreaBox label={t('positions.header')}>
                  <PositionSlot position="header" indices={positions.header} direction="column" {...slotProps} />
                </AreaBox>
              </div>
              <div style={{ gridArea: 'center' }} className="flex flex-col gap-3">
                <AreaBox label={t('positions.beforeBody')}>
                  <PositionSlot position="beforeBody" indices={positions.beforeBody} direction="column" {...slotProps} />
                </AreaBox>
                <div className="rounded-[4px] border border-dashed border-ink/10 px-2 py-3 text-center text-text-muted dark:border-ink/10">
                  {t('layoutEditor.frameBuilder.preview.pageContent')}
                </div>
                <AreaBox label={t('positions.afterBody')}>
                  <PositionSlot position="afterBody" indices={positions.afterBody} direction="column" {...slotProps} />
                </AreaBox>
              </div>
              <div style={{ gridArea: 'sidebar-right' }}>
                <AreaBox label={t('positions.right')}>
                  <PositionSlot position="right" indices={positions.right} direction={sidebarDirection('right', breakpoint)} {...slotProps} />
                </AreaBox>
              </div>
              <div style={{ gridArea: 'footer' }}>
                <AreaBox label={t('positions.footer')}>
                  <PositionSlot position="footer" indices={positions.footer} direction="column" {...slotProps} />
                </AreaBox>
              </div>
            </div>
          )}
          {(activeFrame || builtinFrame) && activeUnassignedSlots.length > 0 && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              {t('layoutEditor.frameBuilder.unassignedWarning', {
                slots: activeUnassignedSlots.map((s) => t(`positions.${s}`, s)).join(', ')
              })}
            </p>
          )}
        </div>

        <DragOverlay>
          {activeItem ? (
            <ItemCard
              plugin={activeItem}
              groupNames={groupNames}
              rank={ranks.get(Number(activeId))}
              isDuplicate={(nameCounts.get(activeItem.name) ?? 0) > 1}
              collapsed
            />
          ) : null}
          {activePaletteSource ? <PaletteChip plugin={activePaletteSource} /> : null}
        </DragOverlay>
      </DndContext>

      <GroupsPanel groups={config.layout?.groups ?? {}} onAdd={addGroup} onUpdate={updateGroup} onDelete={deleteGroup} />
    </div>
  )
}

// One draggable chip per distinct component source already present in the board - dropping it
// onto a slot spawns a new duplicate instance there (see handleDragEnd's PALETTE_PREFIX branch).
// Existing instances aren't removed from here when dragged; the chip is a spawn source, not a
// placed item, so it stays put after the drop. The same area also doubles as a drop target: a
// placed *duplicate* dragged back here is removed (see handleDragEnd's PALETTE_DROP_ID branch) -
// `removableActive` is true while such a duplicate is the thing currently being dragged, so the
// zone can visually invite the drop instead of only reacting after the fact.
function ComponentPalette({
  plugins,
  activePaletteSource,
  removableActive
}: {
  plugins: PluginEntry[]
  activePaletteSource: boolean
  removableActive: boolean
}): JSX.Element {
  const { t } = useTranslation()
  const chips = distinctComponentChips(plugins)
  const { setNodeRef, isOver } = useDroppable({ id: PALETTE_DROP_ID })

  return (
    // The droppable hit area covers this whole block (label + chips + hint), not just the chip
    // box - a duplicate dragged back from elsewhere on the board only needs to land generally in
    // this region, not thread a needle into the narrower box below.
    <div ref={setNodeRef} className="flex flex-col gap-1.5">
      <p className="text-micro font-medium text-text-muted">
        {removableActive ? t('layoutEditor.componentPill.paletteDropToRemove') : t('layoutEditor.componentPill.paletteLabel')}
      </p>
      <div
        className={`flex flex-wrap gap-2 rounded-[8px] border border-dashed p-2 transition-colors ${
          removableActive && isOver
            ? 'border-red-400 bg-red-50/50 dark:border-red-500/40 dark:bg-red-500/5'
            : activePaletteSource
              ? 'border-blue-400 bg-blue-50/50 dark:border-blue-500/40 dark:bg-blue-500/5'
              : 'border-ink/[0.08] dark:border-ink/10'
        }`}
      >
        {chips.map(({ index, plugin }) => (
          <DraggablePaletteChip key={index} index={index} plugin={plugin} />
        ))}
      </div>
      <p className="text-micro text-text-muted">{t('layoutEditor.componentPill.paletteHint')}</p>
    </div>
  )
}

function DraggablePaletteChip({ index, plugin }: { index: number; plugin: PluginEntry }): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `${PALETTE_PREFIX}${index}` })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={isDragging ? 'opacity-30' : ''}
    >
      <PaletteChip plugin={plugin} />
    </div>
  )
}

// The card look every area gets on the board - name + slot badge header, bordered/shadowed body -
// mirrors FrameBuilder's own area boxes so a slot reads the same whether it's being assigned a
// grid position there or having components arranged into it here.
function AreaBox({ label, slotLabel, children }: { label: string; slotLabel?: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="flex h-full flex-col gap-1.5 rounded-[6px] border border-slate-300 bg-surface p-2 shadow-sm dark:border-ink/15 dark:bg-ink/[0.03]">
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-micro font-semibold uppercase tracking-wide text-text-secondary">{label}</span>
        {slotLabel && slotLabel !== label && <Badge>{slotLabel}</Badge>}
      </div>
      {children}
    </div>
  )
}

function PositionSlot({
  position,
  indices,
  direction,
  config,
  groupNames,
  nameCounts,
  ranks,
  expandedIndex,
  onExpand,
  onSetGroup,
  onSetDisplay,
  onDuplicate,
  onRemove
}: {
  position: LayoutPosition
  indices: number[]
  direction: 'row' | 'column'
  config: QuartzConfig
  groupNames: string[]
  nameCounts: Map<string, number>
  ranks: Map<number, number>
  expandedIndex: number | null
  onExpand: (index: number | null) => void
  onSetGroup: (index: number, group: string) => void
  onSetDisplay: (index: number, display: PluginLayoutDeclaration['display']) => void
  onDuplicate: (index: number) => void
  onRemove: (index: number) => void
}): JSX.Element {
  const { t } = useTranslation()
  const { setNodeRef } = useDroppable({ id: position })
  const ids = indices.map(String)

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={`flex min-h-[52px] gap-2 rounded-md bg-ink/[0.02] p-2 dark:bg-ink/[0.03] ${direction === 'row' ? 'flex-row flex-wrap' : 'flex-col'}`}
      >
        {indices.length === 0 && <p className="px-2 py-3 text-center text-xs text-text-muted">{t('layoutEditor.emptySlot')}</p>}
        {indices.map((index) => (
          <SortableItem
            key={index}
            id={String(index)}
            plugin={config.plugins[index]}
            groupNames={groupNames}
            rank={ranks.get(index) ?? 1}
            direction={direction}
            expanded={expandedIndex === index}
            onToggleExpand={() => onExpand(expandedIndex === index ? null : index)}
            onSetGroup={(group) => onSetGroup(index, group)}
            onSetDisplay={(display) => onSetDisplay(index, display)}
            onDuplicate={() => onDuplicate(index)}
            onRemove={() => onRemove(index)}
            isDuplicate={(nameCounts.get(config.plugins[index].name) ?? 0) > 1}
          />
        ))}
      </div>
    </SortableContext>
  )
}

function SortableItem({
  id,
  plugin,
  groupNames,
  rank,
  direction,
  expanded,
  onToggleExpand,
  onSetGroup,
  onSetDisplay,
  onDuplicate,
  onRemove,
  isDuplicate
}: {
  id: string
  plugin: PluginEntry
  groupNames: string[]
  rank: number
  direction: 'row' | 'column'
  expanded: boolean
  onToggleExpand: () => void
  onSetGroup: (group: string) => void
  onSetDisplay: (display: PluginLayoutDeclaration['display']) => void
  onDuplicate: () => void
  onRemove: () => void
  isDuplicate: boolean
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${direction === 'row' ? 'min-w-[10rem] flex-1' : ''} ${isDragging ? 'opacity-40' : ''}`}
    >
      <ItemCard
        plugin={plugin}
        groupNames={groupNames}
        rank={rank}
        isDuplicate={isDuplicate}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        onSetGroup={onSetGroup}
        onSetDisplay={onSetDisplay}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

function GroupsPanel({
  groups,
  onAdd,
  onUpdate,
  onDelete
}: {
  groups: Record<string, FlexGroupConfig>
  onAdd: (name: string) => void
  onUpdate: (name: string, patch: Partial<FlexGroupConfig>) => void
  onDelete: (name: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [newName, setNewName] = useState('')
  const names = Object.keys(groups)

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold">{t('layoutEditor.groupsPanel.title')}</h3>
      <p className="mb-3 text-xs text-text-muted">{t('layoutEditor.groupsPanel.description')}</p>

      {names.length === 0 && <p className="mb-3 text-xs text-text-muted">{t('layoutEditor.groupsPanel.none')}</p>}

      <div className="mb-3 flex flex-col gap-2">
        {names.map((name, i) => {
          const group = groups[name]
          const color = GROUP_COLORS[i % GROUP_COLORS.length]
          return (
            // items-end, not items-center: every control below now carries a label above it, so
            // aligning on the boxes rather than on the whole column keeps the row one line high.
            <div key={name} className="flex flex-wrap items-end gap-3 rounded-md border border-ink/[0.06] p-2 dark:border-ink/10">
              <span className={`mb-2.5 h-2 w-2 shrink-0 rounded-full ${color.dot}`} />
              <span className="mb-2 w-32 shrink-0 truncate text-sm font-medium">{name}</span>
              {/* Three unlabelled controls in a row, one of them offering bare CSS keywords, is
                  not a form - the direction values say what they do on the page now, and each
                  field carries its own label. */}
              <Field label={t('layoutEditor.groupsPanel.direction')} className="w-44">
                <Select
                  value={group.direction ?? 'row'}
                  onChange={(e) => onUpdate(name, { direction: e.target.value as FlexGroupConfig['direction'] })}
                >
                  <option value="row">{t('layoutEditor.groupsPanel.directionRow')}</option>
                  <option value="row-reverse">{t('layoutEditor.groupsPanel.directionRowReverse')}</option>
                  <option value="column">{t('layoutEditor.groupsPanel.directionColumn')}</option>
                  <option value="column-reverse">{t('layoutEditor.groupsPanel.directionColumnReverse')}</option>
                </Select>
              </Field>
              <Field label={t('layoutEditor.groupsPanel.gap')} className="w-28">
                <TextInput value={group.gap ?? ''} onChange={(e) => onUpdate(name, { gap: e.target.value })} placeholder="0.5rem" />
              </Field>
              <Field label={t('layoutEditor.groupsPanel.priority')} className="w-28">
                <TextInput
                  type="number"
                  value={group.priority ?? ''}
                  onChange={(e) => onUpdate(name, { priority: e.target.value === '' ? undefined : Number(e.target.value) })}
                  placeholder={t('layoutEditor.groupsPanel.priorityPlaceholder')}
                />
              </Field>
              <button type="button" onClick={() => onDelete(name)} className="mb-2 ml-auto text-xs text-text-muted underline">
                {t('layoutEditor.groupsPanel.delete')}
              </button>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <TextInput
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('layoutEditor.groupsPanel.newGroupPlaceholder')}
          className="w-56"
        />
        <Button
          variant="ghost"
          onClick={() => {
            onAdd(newName.trim())
            setNewName('')
          }}
          disabled={!newName.trim()}
        >
          {t('layoutEditor.groupsPanel.add')}
        </Button>
      </div>
    </Card>
  )
}

/**
 * The two thresholds an authored frame's media queries are generated from, edited here because
 * they are a property of the site rather than of one frame (see FrameBreakpointWidths).
 *
 * It carries its own Save rather than joining the page header's: that button writes
 * quartz.config.yaml, this one writes .quartz-gui/layout-breakpoints.json *and* regenerates every
 * frame's CSS. Two different pieces of work behind one button would make a config save silently
 * rewrite frames.
 */
function FrameBreakpoints({
  projectPath,
  widths,
  onSaved,
  hasFrames
}: {
  projectPath: string
  widths: FrameBreakpointWidths
  onSaved: (widths: FrameBreakpointWidths) => void
  // A save rewrites every authored frame's CSS, so it needs a dev-server restart for the same
  // reason a frame edit does - but with no frames there is nothing it could have changed.
  hasFrames: boolean
}): JSX.Element {
  const { t } = useTranslation()
  // Held as text, not as numbers: a number input the user is clearing mid-edit is briefly "", and
  // coercing that to 0 on every keystroke fights the typing.
  const [draft, setDraft] = useState({ tablet: String(widths.tablet), mobile: String(widths.mobile) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Seeded from the loaded values once they arrive, and again whenever a save changes them.
  useEffect(() => {
    setDraft({ tablet: String(widths.tablet), mobile: String(widths.mobile) })
  }, [widths.tablet, widths.mobile])

  const tablet = Number(draft.tablet)
  const mobile = Number(draft.mobile)
  // Mirrors the IPC schema's bounds, so the form refuses what main would reject anyway rather than
  // letting the user find out through an error toast.
  const valid =
    Number.isInteger(tablet) && Number.isInteger(mobile) && mobile >= 240 && tablet <= 3840 && mobile < tablet
  const changed = tablet !== widths.tablet || mobile !== widths.mobile

  async function save(): Promise<void> {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      const next = { tablet, mobile }
      await window.quartzGui.layoutFrames.saveBreakpoints(projectPath, next)
      onSaved(next)
      setSaved(true)
    } catch (err) {
      setError(formatIpcError(err))
    } finally {
      setSaving(false)
    }
  }

  function edit(key: 'tablet' | 'mobile', value: string): void {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  return (
    <SettingsSection title={t('layoutEditor.breakpoints.title')} hint={t('layoutEditor.breakpoints.hint')} collapsible>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('layoutEditor.breakpoints.tablet')} className="w-40">
          <TextInput type="number" min={240} max={3840} value={draft.tablet} onChange={(e) => edit('tablet', e.target.value)} />
        </Field>
        <Field label={t('layoutEditor.breakpoints.mobile')} className="w-40">
          <TextInput type="number" min={240} max={3840} value={draft.mobile} onChange={(e) => edit('mobile', e.target.value)} />
        </Field>
        <Button onClick={save} disabled={saving || !valid || !changed}>
          {saving ? t('common.saving') : t('common.save')}
        </Button>
        {saved && !changed && <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('layoutEditor.breakpoints.saved')}</span>}
        <DevServerRestartHint show={saved && !changed && hasFrames} />
        {!valid && <span className="text-xs text-red-600 dark:text-red-400">{t('layoutEditor.breakpoints.invalid')}</span>}
        {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
      </div>
    </SettingsSection>
  )
}
