import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
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
  GridFrameArea,
  GridFrameDefinition,
  LayoutPosition,
  PluginEntry,
  PluginLayoutDeclaration,
  QuartzConfig
} from '@shared/ipc-contract'
import { DEFAULT_FRAME_BREAKPOINT_WIDTHS, FRAME_BREAKPOINTS, buildGridStyle } from '@shared/gridFrameCss'
import { Button, Card, CardHeading, IconButton, SegmentedControl, Select } from '../../components/ui'
import { Eraser, LayoutGrid, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { announce } from '../../state/announcer'
import { useStickyState } from '../../state/uiState'
import { ComponentChip, PaletteChip } from './ComponentChip'
import { ComponentPalette, PALETTE_DROP_ID, PALETTE_PREFIX } from './Palette'
import GroupsPanel from './GroupsPanel'
import Inspector from './Inspector'
import { siteLanguages } from '../../components/PluginOptionsForm/siteLanguages'
import { useDndAccessibility } from '../../utils/dndAnnouncements'
import { nearestDroppableCoordinates } from '../../utils/dndKeyboard'
import {
  BUILTIN_FRAME_LAYOUT,
  DEFAULT_FRAME_GRID,
  POSITIONS,
  breakpointRangeLabel,
  appendDuplicateToPosition,
  buildBoardPositionMap,
  componentRef,
  derivePageTypes,
  getLayout,
  duplicateNameCounts,
  duplicateRanks,
  parkedIndices,
  placeComponent,
  resolveComponentRef,
  sidebarDirection,
  withEnabled,
  withGroup,
  type ComponentRef
} from './utils'
import { STAGE_REFERENCE_WIDTH, shownInView, stageFrame, stageTracks } from './stageGeometry'
import {
  BUILTIN_FRAMES,
  deadExcludes,
  hasPageTypeOverride,
  isExcluded,
  isPositionCleared,
  overrideOf,
  resolvedFrame,
  withExcluded,
  withPositionCleared,
  withTemplate,
  withoutOverride
} from './pageTypeOverride'

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

// A frame can give one position several areas - one per quartz group, plus one for everything
// ungrouped (see GridFrameArea.group) - so a position is no longer a single drop target. The id
// carries both halves; "#" cannot occur in either, a position is one of six literals and a group
// name is a CSS identifier.
function dropId(position: LayoutPosition, group?: string): string {
  return group ? `${position}#${group}` : position
}

interface DropTarget {
  position: LayoutPosition
  // undefined means the position's plain area: everything no group area claims.
  group?: string
}

function findContainer(
  positions: Record<LayoutPosition, number[]>,
  plugins: PluginEntry[],
  id: string
): DropTarget | null {
  const [head, group] = id.split('#')
  if ((POSITIONS as string[]).includes(head)) return { position: head as LayoutPosition, group: group || undefined }
  for (const pos of POSITIONS) {
    if (positions[pos].some((i) => String(i) === id)) return { position: pos, group: plugins[Number(id)]?.layout?.group }
  }
  return null
}

export default function GlobalBoard({
  projectPath,
  config,
  onChange,
  onEditFrame,
  builtinPageTypeFrames = {}
}: {
  projectPath: string
  config: QuartzConfig
  onChange: (next: QuartzConfig) => void
  // Opens the frame builder on this frame, in this view (LayoutEditor/index.tsx).
  onEditFrame: (frame: GridFrameDefinition, breakpoint: FrameBreakpoint) => void
  // Frame names built-in pageType plugins (e.g. canvas-page) default to, keyed by plugin display
  // name - see LayoutEditor/index.tsx. Needed so the mockup below doesn't claim the literal
  // 3-column default frame for a page type whose plugin actually renders something else.
  builtinPageTypeFrames?: Record<string, string>
}): JSX.Element {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [breakpoint, setBreakpoint] = useState<FrameBreakpoint>('desktop')
  // Which component the side panel shows - by name and occurrence, not by index (componentRef).
  // Sticky like any other "where was I": a trip to Stile and back keeps the panel on it.
  const [selected, setSelected] = useStickyState<ComponentRef | null>('layout.selected', null)
  const [frames, setFrames] = useState<GridFrameDefinition[]>([])
  // Which page the stage shows: null is "Alle Seiten", the layout every page type starts from; a
  // page type shows that type's frame and what its `layout.byPageType` entry hides or clears, and
  // offers to change exactly that (pageTypeOverride.ts). Until 1.1 this was a tab of its own with
  // switches and no page. Sticky, like the tab it replaces.
  const [storedPageType, setPageType] = useStickyState<string | null>('layout.pageType', null)
  // Read here to label the views and to compare the frames' mobile switch with Quartz's own; they
  // are edited on the Frames tab (FrameBreakpoints), which unmounts this board, so a read on mount
  // is always the current one.
  const [breakpointWidths, setBreakpointWidths] = useState<FrameBreakpointWidths>(DEFAULT_FRAME_BREAKPOINT_WIDTHS)
  const parked = parkedIndices(config.plugins)
  const positions = buildBoardPositionMap(config.plugins, parked)
  const selectedIndex = resolveComponentRef(config.plugins, selected)
  // Declared groups plus the ones the frames' areas name. A group exists as soon as a component
  // names it - `layout.groups` only holds direction and gap - so an area's group is missing from
  // that object until someone gives it those, and until then the component's own "Gruppe" select
  // could not offer it. Drag-and-drop would have been the only way in, which is no way at all for
  // anyone working by keyboard.
  const groupNames = [
    ...new Set([
      ...Object.keys(config.layout?.groups ?? {}),
      ...frames.flatMap((f) => f.areas.map((a) => a.group).filter((g): g is string => !!g)),
      // …and every group a component actually names. Without this last source a group can become
      // invisible while still being in force: delete the area that carried it (or the entry under
      // `layout.groups`) and the member keeps `layout.group`, but the select has no option for it,
      // so it displays as "no group" and cannot be cleared. Measured while tidying up a test
      // project - the yaml still said `group: custom-8` after the area was gone.
      ...config.plugins.map((p) => p.layout?.group).filter((g): g is string => !!g)
    ])
  ]
  // Keyed by its own result, so the list keeps its identity across the edits that do not touch it -
  // the form's context is memoized on it.
  const languagesKey = siteLanguages(config).join(',')
  const languages = useMemo(() => (languagesKey ? languagesKey.split(',') : []), [languagesKey])
  const nameCounts = duplicateNameCounts(config.plugins)
  const ranks = duplicateRanks(config.plugins)
  const pageTypes = derivePageTypes(config)
  // A type that is gone - its override removed, its plugin uninstalled - falls back to all pages
  // rather than to a selector showing nothing.
  const pageType = storedPageType && pageTypes.includes(storedPageType) ? storedPageType : null
  const pageTypeName = (pt: string): string => t(`layoutEditor.pageTypes.${pt}`, pt)
  const override = pageType ? overrideOf(config, pageType) : null
  const typeLabel = pageType ? pageTypeName(pageType) : ''
  const dead = override ? deadExcludes(config, override) : new Set<string>()

  // Every change the board and its panel make is a new plugin list, and some of them move the
  // panel along: a new duplicate is shown at once, a removed one closes the panel. The reference is
  // taken from the *new* list, because a removal renumbers the occurrences after it.
  function applyPlugins(plugins: PluginEntry[], select?: number | null): void {
    onChange({ ...config, plugins })
    if (select === null) setSelected(null)
    else if (select !== undefined) setSelected(componentRef(plugins, select))
  }

  useEffect(() => {
    window.quartzGui.layoutFrames.getBreakpoints(projectPath).then(setBreakpointWidths)
  }, [projectPath])

  useEffect(() => {
    window.quartzGui.layoutFrames.list(projectPath).then(setFrames)
  }, [projectPath])

  // The frame the stage is drawn in, by quartz's rule (resolvedFrame). "Alle Seiten" has no frame
  // of its own - every page type picks one - so it is drawn in the frame of content pages, the
  // pages a site mostly consists of, and the head says so.
  const frameChoice = resolvedFrame(config, pageType ?? 'content', builtinPageTypeFrames)
  const activeFrameName = frameChoice.name
  const activeFrame = activeFrameName !== 'default' ? (frames.find((f) => f.frameName === activeFrameName) ?? null) : null
  const activeLayout = activeFrame?.breakpoints[breakpoint] ?? null
  const activeAreas =
    activeFrame && activeLayout
      ? activeFrame.areas.filter((a) => {
          const p = activeLayout.placements[a.id]
          return p && !p.hidden
        })
      : null
  // Columns are the frame's geometry and stay; row heights do not. A row size describes the built
  // page's content, and the board's cells hold editing cards instead: the example frames give the
  // left sidebar a 0px row on mobile (it is a drawer there), so the board collapsed that area to
  // nothing and drew the next one over its cards. Every row sizes to what it holds here.
  const activeGridStyle =
    activeFrame && activeLayout ? buildGridStyle({ ...activeLayout, rowSizes: undefined }, activeFrame.areas) : null
  // The columns, gaps and the frame's own box (width cap, alignment, paddings - the page as it will
  // be built) as shares of the stage, so the grid fits whatever width the board has (stageGeometry).
  const activeStage = activeLayout ? stageFrame(activeLayout, breakpoint) : null
  // Which of a position's components each area of the active frame shows. It is the renderer's
  // half of the frame's own contentsFor(): a group area holds its group, and the area without one
  // holds everything the frame's group areas did not claim - including groups this frame gave no
  // area, which quartz would otherwise render nowhere.
  function indicesForArea(area: GridFrameArea): number[] {
    const position = area.slot as LayoutPosition
    const all = positions[position] ?? []
    if (area.group) return all.filter((i) => config.plugins[i]?.layout?.group === area.group)
    const claimed = new Set((activeAreas ?? []).filter((a) => a.slot === position && a.group).map((a) => a.group))
    return all.filter((i) => !claimed.has(config.plugins[i]?.layout?.group))
  }

  const activeUsedSlots = activeAreas
    ? new Set(activeAreas.map((a) => a.slot).filter((s): s is LayoutPosition => !!s && s !== 'pageBody'))
    : null

  // "full-width"/"minimal" are the two other built-in frames (besides the unnamed/"default" one
  // DEFAULT_FRAME_GRID depicts) - real, fixed single-column shapes, not a custom authored frame, so
  // they're looked up in BUILTIN_FRAME_LAYOUT rather than the `frames` list.
  const builtinFrame =
    !activeFrame && activeFrameName in BUILTIN_FRAME_LAYOUT ? BUILTIN_FRAME_LAYOUT[activeFrameName as 'full-width' | 'minimal'] : null

  const visibleSlots = activeUsedSlots ?? (builtinFrame ? new Set(builtinFrame.visibleSlots) : null)
  const activeUnassignedSlots = visibleSlots ? POSITIONS.filter((p) => !visibleSlots.has(p)) : []

  // A frame a page type plugin brings (canvas-page brings "canvas") has no declarative shape the
  // app could draw, unlike an authored frame or the built-ins above, so the honest answer is a
  // placeholder rather than a mockup that is simply wrong. A name that is neither - a deleted
  // authored frame, a typo in the file - quartz renders with the default frame (resolveFrame), and
  // the stage draws that one and says why.
  const otherFrame = !activeFrame && !builtinFrame && activeFrameName !== 'default'
  const unknownPluginFrame = otherFrame && Object.values(builtinPageTypeFrames).includes(activeFrameName)
  const unknownFrame = otherFrame && !unknownPluginFrame
  const builtinDefaultFrame = pageType ? builtinPageTypeFrames[`${pageType}-page`] : undefined
  const frameLabel = (name: string): string =>
    name === 'default'
      ? t('layoutEditor.templateDefault')
      : name === 'full-width'
        ? t('layoutEditor.templateFullWidth')
        : name === 'minimal'
          ? t('layoutEditor.templateMinimal')
          : name

  // Why a component is not on the page the stage shows, or nothing when it is. The page type's own
  // answers come first: they hold in every view, the view's only in this one.
  function hiddenReason(index: number): string | undefined {
    const plugin = config.plugins[index]
    if (!plugin) return undefined
    if (override && isExcluded(override, plugin)) return t('layoutEditor.pageType.excludedHere', { type: typeLabel })
    const position = getLayout(plugin)?.position
    if (override && position && isPositionCleared(override, position)) return t('layoutEditor.pageType.clearedHere', { type: typeLabel })
    if (!shownInView(getLayout(plugin)?.display, breakpoint)) return t('layoutEditor.stage.hiddenInView')
    return undefined
  }

  function togglePositionCleared(position: LayoutPosition): void {
    if (!pageType || !override) return
    const cleared = !isPositionCleared(override, position)
    onChange(withPositionCleared(config, pageType, position, cleared))
    announce(
      t(cleared ? 'layoutEditor.pageType.clearedAnnounce' : 'layoutEditor.pageType.restoredAnnounce', {
        position: t(`positions.${position}`, position),
        type: typeLabel
      })
    )
  }

  // The eraser in an area's head, while a page type is shown. It clears the position, so where a
  // frame gives one position several areas, each of them carries it and all of them follow.
  function clearAction(position: LayoutPosition): React.ReactNode {
    if (!pageType || !override) return undefined
    const cleared = isPositionCleared(override, position)
    const params = { position: t(`positions.${position}`, position), type: typeLabel }
    return (
      <IconButton
        tone="neutral"
        icon={cleared ? RotateCcw : Eraser}
        title={t(cleared ? 'layoutEditor.pageType.restoreArea' : 'layoutEditor.pageType.clearArea', params)}
        onClick={() => togglePositionCleared(position)}
      />
    )
  }
  const clearedNoteFor = (position: LayoutPosition): string | undefined =>
    override && isPositionCleared(override, position) ? t('layoutEditor.pageType.areaCleared', { type: typeLabel }) : undefined

  function removeOverride(): void {
    if (!pageType) return
    onChange(withoutOverride(config, pageType))
    announce(t('layoutEditor.pageType.removedAnnounce', { type: typeLabel }))
    // The button just pressed is gone with the customization; the keyboard goes back to the
    // selector it was reached from, not to <body>.
    requestAnimationFrame(() => document.getElementById('layout-page-type')?.focus())
  }

  // The frame select of a page type. Leaving `template` unset is not "the default frame" when the
  // type's plugin brings its own, so that option stands for the plugin's frame, and the plain
  // default gets an entry that writes `template: default`. A value that is none of the offered
  // ones - a deleted authored frame, a name written by hand - stays visible as itself.
  const hasPluginDefault = builtinDefaultFrame != null && builtinDefaultFrame !== 'default'
  const noOverrideValue = hasPluginDefault ? builtinDefaultFrame! : 'default'
  const authoredNames = frames.map((f) => f.frameName)
  const unknownTemplate =
    override?.template != null &&
    !(BUILTIN_FRAMES as readonly string[]).includes(override.template) &&
    !authoredNames.includes(override.template) &&
    override.template !== builtinDefaultFrame
  const customizedTypes = new Set(pageTypes.filter((pt) => hasPageTypeOverride(config.layout?.byPageType?.[pt])))

  // What a drag id means here, in words: a palette chip about to be placed, the palette itself as
  // a drop target, one of the six layout positions, or - a bare number - the plugin at that index
  // in the config. dnd-kit would otherwise narrate "droppable area 37" in English.
  function describeDragId(id: string): string {
    // Its own name, not the caption above it: the caption is an instruction ("Komponente
    // hinzufügen"), and this string is read out as a drop target - "page-title liegt über
    // Komponente hinzufügen". Same reasoning as the frame builder's tray label, which is a name
    // for exactly this reason (twenty-third review, "nebenbei" 4).
    if (id === PALETTE_DROP_ID) return t('layoutEditor.componentPill.paletteDragName')
    // A palette id carries the *index* of the plugin it would duplicate, not its name
    // (appendDuplicateToPosition needs the index) - so it resolves the same way as a placed item.
    const index = id.startsWith(PALETTE_PREFIX) ? Number(id.slice(PALETTE_PREFIX.length)) : Number(id)
    if (id.startsWith(PALETTE_PREFIX)) return config.plugins[index]?.name ?? id
    // A frame area bound to a group is `<position>#<group>` (see dropId), and it has a name of its
    // own on the board. Without this the whole id fell through to the plugin lookup, `Number()`
    // made NaN of it, and a drag onto such an area was announced as the literal string
    // "left#custom-8" - the one place in this file where a screen reader heard an internal
    // identifier instead of the thing it names.
    const [head, group] = id.split('#')
    if (group) {
      const area = (activeAreas ?? []).find((a) => a.slot === head && a.group === group)
      return area?.name ?? group
    }
    if ((POSITIONS as string[]).includes(id)) return t(`positions.${id}`, id)
    // With its number where it is one of several, as on its handle (ComponentPill): twelve
    // instances of quartz-navigations had handles "quartz-navigations #5 verschieben" and
    // announcements "quartz-navigations aufgenommen … liegt über quartz-navigations" - which one
    // lay over which, nobody could hear (thirty-second review, nebenbei 3). A palette chip above
    // stays the bare name: it stands for the component, not for an instance.
    const plugin = config.plugins[index]
    if (!plugin) return id
    return (nameCounts.get(plugin.name) ?? 0) > 1 ? `${plugin.name} #${ranks.get(index) ?? 1}` : plugin.name
  }
  // A palette chip is the one thing on this board whose own place is not its own id: it is called
  // `palette:<index>` and it lies in `palette-drop-zone`. The default `isHome` therefore read every
  // sentence about the tray as a move - "aufgenommen, liegt über Komponentenvorrat" on pickup,
  // "bei Komponentenvorrat abgelegt" for a drop that does nothing (handleDragEnd finds no
  // container for that id and returns), and never the step back the `dnd.backHome` of the last
  // round was written for. Measured (twenty-fourth review, finding 6).
  //
  // Not included: a *placed* sole instance dropped on the tray, which does nothing either (the
  // branch above needs a duplicate). The tray is not that row's place, so "blieb an seinem Platz"
  // would be as untrue as "abgelegt" - that one needs a sentence of its own, not this question.
  const isHomeOnBoard = (activeId: string, overId: string): boolean =>
    activeId === overId || (overId === PALETTE_DROP_ID && activeId.startsWith(PALETTE_PREFIX))
  // The drops the ordinary "X bei Y abgelegt" describes wrongly. Onto the tray: a placed duplicate
  // is *deleted* there, a placed sole instance switched off (twenty-fifth review, finding 6: the
  // deletion took a row out of the configuration under the word "abgelegt"). Out of the tray: the
  // chip of a switched-off component switches that one back on instead of adding another.
  const describeBoardDrop = (activeId: string, overId: string): string | undefined => {
    if (activeId.startsWith(PALETTE_PREFIX)) {
      const index = Number(activeId.slice(PALETTE_PREFIX.length))
      if (overId === PALETTE_DROP_ID || !parked.has(index)) return undefined
      return t('dnd.reenabled', { name: config.plugins[index]?.name ?? activeId, target: describeDragId(overId) })
    }
    if (overId !== PALETTE_DROP_ID) return undefined
    const plugin = config.plugins[Number(activeId)]
    if (!plugin) return undefined
    return (nameCounts.get(plugin.name) ?? 0) > 1 ? t('dnd.removed', { name: plugin.name }) : t('dnd.disabled', { name: plugin.name })
  }
  const { announcements, screenReaderInstructions } = useDndAccessibility(t, describeDragId, isHomeOnBoard, describeBoardDrop)

  // The pointer half is dnd-kit's own default, unchanged; the keyboard half is the whole point of
  // saying this out loud. Without a coordinate getter an arrow press moves the picked-up item by a
  // fixed 25px, which on a board whose rows step 51px (a 43px card plus the zone's 8px gap; the
  // 52px elsewhere in this file is the zone's own min-height, not a row) and whose zones are
  // columns wide is a press that does nothing - measured (eighteenth review, finding 3): space,
  // arrow, arrow left the item where it was and only scrolled the page. Not sortableKeyboardCoordinates, which the
  // sortable rows alone would be happy with: a palette chip is a plain draggable and not a
  // droppable, so that getter returns nothing at all for it (see dndKeyboard.ts), and an empty zone
  // has no sortable to step onto. nearestDroppableCoordinates steps to the nearest drop target in
  // the pressed direction, which is what this board is made of - the same getter the frame builder
  // uses, for the same reason. And like there without the smooth scroll: an arrow whose target lies
  // past the middle of <main> scrolls instead of moving, over ~300ms, and every press that came in
  // meanwhile was lost - six ArrowDowns 40ms apart (a held key) got two rows down (thirtieth
  // review, measured while checking the frame builder's fix on this board; no wrong intermediate
  // announcement here, closestCenter always has an answer).
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { scrollBehavior: 'auto', coordinateGetter: nearestDroppableCoordinates })
  )

  function handleDragStart(event: DragStartEvent): void {
    setActiveId(String(event.active.id))
  }

  // Where the keyboard goes after a drop that changes what the dragged thing *is*: a component put
  // in the tray is a tray chip afterwards, and a tray chip dragged back is a placed component.
  // dnd-kit hands the focus back to the element it picked up, and in both cases that element is
  // gone - the focus fell to <body>, and the next Tab started at the top of the page (measured on
  // the built app while building this). Asked for after the render that mounts the new element.
  const [focusAfterDrop, setFocusAfterDrop] = useState<string | null>(null)
  useEffect(() => {
    if (!focusAfterDrop) return
    const frame = requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-board-focus="${focusAfterDrop}"]`)?.focus()
      setFocusAfterDrop(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [focusAfterDrop])

  function handleDragEnd(event: DragEndEvent): void {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)

    // Dropping a placed component back onto the palette: a duplicate is removed (the panel's
    // "Duplikat entfernen"), the only instance of its name switched off - it then lies in the tray
    // (parkedIndices) until it is dragged out again.
    if (String(over.id) === PALETTE_DROP_ID) {
      if (activeId.startsWith(PALETTE_PREFIX)) return
      const index = Number(activeId)
      const plugin = config.plugins[index]
      if (!plugin) return
      if ((nameCounts.get(plugin.name) ?? 0) > 1) {
        // The panel stays on the entry it showed: a removal further up renumbers the occurrences
        // after it, so the reference is taken again from the shifted index.
        const keep = selectedIndex === null || selectedIndex === index ? null : selectedIndex > index ? selectedIndex - 1 : selectedIndex
        applyPlugins(
          config.plugins.filter((_, i) => i !== index),
          keep
        )
      } else {
        // Selected, so the panel says what is off now - for a plugin that is more than a component,
        // that is more than the chip (Inspector, alsoOff).
        applyPlugins(withEnabled(config.plugins, index, false), index)
        setFocusAfterDrop(`palette:${index}`)
      }
      return
    }

    const target = findContainer(positions, config.plugins, String(over.id))
    if (!target) return
    const toContainer = target.position
    const overIndex = positions[toContainer].indexOf(Number(over.id))
    const insertAt = overIndex === -1 ? undefined : overIndex

    if (activeId.startsWith(PALETTE_PREFIX)) {
      const sourceIndex = Number(activeId.slice(PALETTE_PREFIX.length))
      // The chip of a parked component stands for that one entry: it comes back on, at the drop,
      // with its options as they were - not as a second instance next to a switched-off first.
      if (parked.has(sourceIndex)) {
        const on = withEnabled(config.plugins, sourceIndex, true)
        applyPlugins(placeComponent(on, positions, sourceIndex, toContainer, insertAt, target.group ?? null), sourceIndex)
        setFocusAfterDrop(`placed:${sourceIndex}`)
        return
      }
      const result = appendDuplicateToPosition(config.plugins, sourceIndex, toContainer, insertAt)
      if (!result) return
      applyPlugins(withGroup(result.plugins, result.newIndex, target.group ?? ''), result.newIndex)
      return
    }

    const source = findContainer(positions, config.plugins, activeId)
    if (!source) return
    const moved = Number(activeId)
    // Which area of a position a component lands in is its group, and the drop decided it - a move
    // into a group area joins that group, a move into the plain area leaves whatever group it was
    // in (placeComponent, `group`).
    const plugins = placeComponent(config.plugins, positions, moved, toContainer, insertAt, target.group ?? null)
    if (JSON.stringify(plugins) === JSON.stringify(config.plugins)) return
    applyPlugins(plugins)
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
  // Quartz's own frame at the stage's scale. Its gap stays the board's 12px (gap-3): Quartz's real
  // 5px is too tight to tell two areas apart at this size, and twelve pixels in 1456 bend no track.
  const defaultColumns = stageTracks(grid.columns.split(' '), {
    inner: STAGE_REFERENCE_WIDTH[breakpoint],
    gap: 12,
    viewport: STAGE_REFERENCE_WIDTH[breakpoint]
  }).columns

  const slotProps = {
    config,
    groupNames,
    nameCounts,
    ranks,
    selectedIndex,
    hiddenReason,
    clearedNoteFor,
    onSelect: (index: number) => setSelected(componentRef(config.plugins, index))
  }
  // What a drop on the tray would do with the thing being dragged right now, for the tray's caption.
  const trayDropHint = activeItem ? ((nameCounts.get(activeItem.name) ?? 0) > 1 ? 'remove' : 'disable') : null

  return (
    <div className="flex flex-col gap-6">
      {/* The stage's head: which page and which view it shows, and the frame that gives it its
          shape - with the way into that frame's editor, since the frame is where the shape of a
          view changes (docs/plan-1.1.md, "Eigene Frames bleiben ein eigener Bereich"). */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-text-muted">
            {t('layoutEditor.pageType.label')}
            <Select id="layout-page-type" value={pageType ?? ''} onChange={(e) => setPageType(e.target.value || null)} className="w-52">
              <option value="">{t('layoutEditor.pageType.all')}</option>
              {pageTypes.map((pt) => (
                <option key={pt} value={pt}>
                  {customizedTypes.has(pt) ? t('layoutEditor.pageType.customized', { type: pageTypeName(pt) }) : pageTypeName(pt)}
                </option>
              ))}
            </Select>
          </label>
          <SegmentedControl
            label={t('layoutEditor.stage.viewLabel')}
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pageType ? (
            <label className="flex items-center gap-2 text-xs font-medium text-text-muted">
              {t('layoutEditor.template')}
              <Select
                value={override?.template ?? noOverrideValue}
                onChange={(e) => onChange(withTemplate(config, pageType, e.target.value === noOverrideValue ? undefined : e.target.value))}
                className="w-52"
              >
                {hasPluginDefault && (
                  <option value={builtinDefaultFrame}>{t('layoutEditor.templatePluginDefault', { frame: builtinDefaultFrame })}</option>
                )}
                <option value="default">{t('layoutEditor.templateDefault')}</option>
                <option value="full-width">{t('layoutEditor.templateFullWidth')}</option>
                <option value="minimal">{t('layoutEditor.templateMinimal')}</option>
                {authoredNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                {unknownTemplate && (
                  <option value={override!.template}>{t('layoutEditor.pageType.unknownOption', { frame: override!.template })}</option>
                )}
              </Select>
            </label>
          ) : (
            <p className="text-xs text-text-muted">{t('layoutEditor.pageType.allPagesFrame', { name: frameLabel(activeFrameName) })}</p>
          )}
          {activeFrame && (
            <Button variant="ghost" onClick={() => onEditFrame(activeFrame, breakpoint)}>
              <LayoutGrid size={14} aria-hidden />
              {t('layoutEditor.stage.editFrame')}
            </Button>
          )}
          {pageType && config.layout?.byPageType?.[pageType] && (
            <Button variant="ghost" onClick={removeOverride}>
              <RotateCcw size={14} aria-hidden />
              {t('layoutEditor.pageType.removeOverride')}
            </Button>
          )}
        </div>
        <div className="flex max-w-[95ch] flex-col gap-1 text-micro text-text-muted empty:hidden">
          {/* What a change does where: the selector suggests that everything below is about this
              page type, and only hiding and clearing are. */}
          {pageType && <p>{t('layoutEditor.pageType.scopeHint', { type: typeLabel })}</p>}
          {/* "Never excluded" and "excluded under a name that does nothing" look the same on the
              stage, so the difference is said where it is known. */}
          {dead.size > 0 && (
            <p className="text-amber-600 dark:text-amber-400">
              {t('layoutEditor.excludeDeadHint', { count: dead.size, names: [...dead].join(', ') })}
            </p>
          )}
          {unknownFrame && (
            <p className="text-amber-600 dark:text-amber-400">{t('layoutEditor.pageType.unknownFrame', { frame: activeFrameName })}</p>
          )}
        </div>
      </div>

      {/* useDraggable/useDroppable only register with the nearest ancestor DndContext, so the
          palette has to be a child of it, not a sibling - otherwise its chips are inert. */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        accessibility={{ announcements, screenReaderInstructions }}
      >
        {/* Board on the left, the selected component's panel on the right. The panel sticks while
            the board scrolls under it, so the place a component is being given and the component
            itself stay on screen together. */}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <ComponentPalette
              plugins={config.plugins}
              parked={parked}
              activePaletteSource={activePaletteSource !== null}
              dropHint={trayDropHint}
            />

            {/* The stage: the page in miniature, never wider than the board and never wider than the
                window the view stands for (a phone is drawn phone-wide, not stretched). Until 1.1
                this scrolled sideways, because the frame was drawn at its real pixel sizes - 1068px
                for the editorial frame in a 622px column at 1280px. stageGeometry reduces it through
                the proportions instead; a scaled layer would hand dnd-kit rectangles that are not
                where they appear. It is the container its `cqw` gaps refer to. */}
            <div
              data-stage
              className="mx-auto w-full"
              style={{ maxWidth: STAGE_REFERENCE_WIDTH[breakpoint], containerType: 'inline-size' }}
            >
              {activeFrame && activeAreas && activeGridStyle && activeStage ? (
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: activeStage.gridTemplateColumns,
                    gridTemplateRows: activeGridStyle.gridTemplateRows,
                    gridTemplateAreas: activeGridStyle.gridTemplateAreas,
                    rowGap: activeStage.rowGap,
                    columnGap: activeStage.columnGap,
                    width: activeStage.width,
                    marginInline: activeStage.marginInline,
                    paddingBlock: activeStage.paddingBlock,
                    paddingInline: activeStage.paddingInline
                  }}
                >
                  {activeAreas.map((area) => (
                    <div key={area.id} className="min-w-0" style={{ gridArea: area.name }}>
                      <AreaBox
                        label={area.name}
                        slotLabel={area.slot ? t(`positions.${area.slot}`, area.slot) : t('layoutEditor.frameBuilder.slotNone')}
                        action={area.slot && area.slot !== 'pageBody' ? clearAction(area.slot) : undefined}
                      >
                        {!area.slot ? (
                          // An area with no slot is an empty cell in the built page too, so the board
                          // shows it as one rather than as a drop target that would not hold anything.
                          <div className="rounded-[4px] border border-dashed border-ink/10 px-2 py-3 text-center text-text-muted dark:border-ink/10">
                            {t('layoutEditor.frameBuilder.slotNone')}
                          </div>
                        ) : area.slot === 'pageBody' ? (
                          <div className="rounded-[4px] border border-dashed border-ink/10 px-2 py-3 text-center text-text-muted dark:border-ink/10">
                            {t('layoutEditor.frameBuilder.preview.pageContent')}
                          </div>
                        ) : (
                          <PositionSlot
                            position={area.slot}
                            group={area.group}
                            indices={indicesForArea(area)}
                            direction="column"
                            {...slotProps}
                          />
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
                    <div className="min-w-0" style={{ gridArea: 'header' }}>
                      <AreaBox label={t('positions.header')} action={clearAction('header')}>
                        <PositionSlot position="header" indices={positions.header} direction="column" {...slotProps} />
                      </AreaBox>
                    </div>
                  )}
                  {builtinFrame.visibleSlots.includes('beforeBody') && (
                    <div style={{ gridArea: 'beforeBody' }}>
                      <AreaBox label={t('positions.beforeBody')} action={clearAction('beforeBody')}>
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
                      <AreaBox label={t('positions.afterBody')} action={clearAction('afterBody')}>
                        <PositionSlot position="afterBody" indices={positions.afterBody} direction="column" {...slotProps} />
                      </AreaBox>
                    </div>
                  )}
                  {builtinFrame.visibleSlots.includes('footer') && (
                    <div className="min-w-0" style={{ gridArea: 'footer' }}>
                      <AreaBox label={t('positions.footer')} action={clearAction('footer')}>
                        <PositionSlot position="footer" indices={positions.footer} direction="column" {...slotProps} />
                      </AreaBox>
                    </div>
                  )}
                </div>
              ) : unknownPluginFrame ? (
                <div className="rounded-[6px] border border-dashed border-amber-400/50 bg-amber-50/50 px-4 py-6 text-center text-sm text-amber-700 dark:border-amber-400/30 dark:bg-amber-950/20 dark:text-amber-400">
                  {t('layoutEditor.pluginFrameUnknownLayout', { frame: activeFrameName })}
                </div>
              ) : (
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: defaultColumns, gridTemplateRows: grid.rows, gridTemplateAreas: grid.areas }}
                >
                  <div className="min-w-0" style={{ gridArea: 'sidebar-left' }}>
                    <AreaBox label={t('positions.left')} action={clearAction('left')}>
                      <PositionSlot position="left" indices={positions.left} direction={sidebarDirection('left', breakpoint)} {...slotProps} />
                    </AreaBox>
                  </div>
                  <div style={{ gridArea: 'header' }}>
                    <AreaBox label={t('positions.header')} action={clearAction('header')}>
                      <PositionSlot position="header" indices={positions.header} direction="column" {...slotProps} />
                    </AreaBox>
                  </div>
                  <div style={{ gridArea: 'center' }} className="flex min-w-0 flex-col gap-3">
                    <AreaBox label={t('positions.beforeBody')} action={clearAction('beforeBody')}>
                      <PositionSlot position="beforeBody" indices={positions.beforeBody} direction="column" {...slotProps} />
                    </AreaBox>
                    <div className="rounded-[4px] border border-dashed border-ink/10 px-2 py-3 text-center text-text-muted dark:border-ink/10">
                      {t('layoutEditor.frameBuilder.preview.pageContent')}
                    </div>
                    <AreaBox label={t('positions.afterBody')} action={clearAction('afterBody')}>
                      <PositionSlot position="afterBody" indices={positions.afterBody} direction="column" {...slotProps} />
                    </AreaBox>
                  </div>
                  <div className="min-w-0" style={{ gridArea: 'sidebar-right' }}>
                    <AreaBox label={t('positions.right')} action={clearAction('right')}>
                      <PositionSlot position="right" indices={positions.right} direction={sidebarDirection('right', breakpoint)} {...slotProps} />
                    </AreaBox>
                  </div>
                  <div style={{ gridArea: 'footer' }}>
                    <AreaBox label={t('positions.footer')} action={clearAction('footer')}>
                      <PositionSlot position="footer" indices={positions.footer} direction="column" {...slotProps} />
                    </AreaBox>
                  </div>
                </div>
              )}
              {activeStage && activeStage.approximate.length > 0 && (
                <p className="mt-3 text-xs text-text-muted">
                  {t('layoutEditor.stage.approximate', { sizes: [...new Set(activeStage.approximate)].join(', ') })}
                </p>
              )}
              {(activeFrame || builtinFrame) && activeUnassignedSlots.length > 0 && (
                <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                  {t('layoutEditor.frameBuilder.unassignedWarning', {
                    slots: activeUnassignedSlots.map((s) => t(`positions.${s}`, s)).join(', ')
                  })}
                </p>
              )}
            </div>

            <GroupsPanel groups={config.layout?.groups ?? {}} onAdd={addGroup} onUpdate={updateGroup} onDelete={deleteGroup} />
          </div>

          {/* Its own scroller while it sticks: with a component's options the panel is taller than the
              window (navigations: 7300 px), and a sticky block that tall only shows its end once the
              board beside it has been scrolled to its own end. */}
          <aside
            aria-label={t('layoutEditor.inspector.title')}
            className="xl:sticky xl:top-4 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto xl:overscroll-contain"
          >
            {selectedIndex !== null && config.plugins[selectedIndex] ? (
              <Inspector
                key={`${selected?.name}#${selected?.occurrence}`}
                projectPath={projectPath}
                languages={languages}
                pageType={
                  pageType && override
                    ? {
                        label: typeLabel,
                        excluded: isExcluded(override, config.plugins[selectedIndex]),
                        instances: nameCounts.get(config.plugins[selectedIndex].name) ?? 1,
                        onChange: (excluded) => onChange(withExcluded(config, pageType, config.plugins[selectedIndex], excluded))
                      }
                    : undefined
                }
                plugins={config.plugins}
                index={selectedIndex}
                positions={positions}
                parked={parked.has(selectedIndex)}
                groupNames={groupNames}
                isDuplicate={(nameCounts.get(config.plugins[selectedIndex].name) ?? 0) > 1}
                rank={ranks.get(selectedIndex) ?? 1}
                onChange={applyPlugins}
              />
            ) : (
              <Card className="flex flex-col gap-2">
                <CardHeading icon={SlidersHorizontal}>{t('layoutEditor.inspector.title')}</CardHeading>
                <p className="text-ui text-text-muted">{t('layoutEditor.inspector.empty')}</p>
              </Card>
            )}
          </aside>
        </div>

        <DragOverlay>
          {/* No width of its own: dnd-kit sizes the overlay to the chip that was picked up and
              measures this one child, so a fixed width here would be a rectangle the stage does not
              have - a 256px chip centred on a 120px column. The chip is a block and fills it. */}
          {activeItem ? (
            <ComponentChip
              plugin={activeItem}
              groupNames={groupNames}
              rank={ranks.get(Number(activeId))}
              isDuplicate={(nameCounts.get(activeItem.name) ?? 0) > 1}
              hiddenReason={hiddenReason(Number(activeId))}
            />
          ) : null}
          {activePaletteSource ? (
            <PaletteChip plugin={activePaletteSource} off={parked.has(Number(activeId?.slice(PALETTE_PREFIX.length)))} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

// The card look every area gets on the board - name + slot badge header, bordered/shadowed body -
// mirrors FrameBuilder's own area boxes so a slot reads the same whether it's being assigned a
// grid position there or having components arranged into it here.
function AreaBox({
  label,
  slotLabel,
  action,
  children
}: {
  label: string
  slotLabel?: string
  // A control for the area as a whole, at the end of its head (the eraser of a page type).
  action?: React.ReactNode
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="flex h-full min-w-0 flex-col gap-1.5 rounded-[6px] border border-slate-300 bg-surface p-1.5 shadow-sm dark:border-ink/15 dark:bg-ink/[0.03]">
      {/* Wraps instead of pushing: on the stage a side column can be 120px, and the area's name and
          its position's name together are wider than that. */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-1">
        <span className="min-w-0 truncate text-micro font-semibold uppercase tracking-wide text-text-secondary">{label}</span>
        {slotLabel && slotLabel !== label && (
          <span className="min-w-0 truncate rounded-full bg-ink/[0.06] px-1.5 text-micro text-text-secondary dark:bg-ink/10">{slotLabel}</span>
        )}
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </div>
  )
}

function PositionSlot({
  position,
  group,
  indices,
  direction,
  config,
  groupNames,
  nameCounts,
  ranks,
  selectedIndex,
  hiddenReason,
  clearedNoteFor,
  onSelect
}: {
  position: LayoutPosition
  // Set when this box is a frame area bound to one quartz group; it makes the box its own drop
  // target, so a component dropped here joins that group instead of the position at large.
  group?: string
  indices: number[]
  direction: 'row' | 'column'
  config: QuartzConfig
  groupNames: string[]
  nameCounts: Map<string, number>
  ranks: Map<number, number>
  selectedIndex: number | null
  hiddenReason: (index: number) => string | undefined
  clearedNoteFor: (position: LayoutPosition) => string | undefined
  onSelect: (index: number) => void
}): JSX.Element {
  const { t } = useTranslation()
  const clearedNote = clearedNoteFor(position)
  const { setNodeRef } = useDroppable({ id: dropId(position, group) })
  const ids = indices.map(String)

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        // flex-1: the drop target is the whole area below the area's name, not just the height of
        // its chips. On the stage a row is as tall as its tallest area, so a short list sat at the
        // top of a 500px box, and a drop in the empty rest of it hit no target at all and went to
        // whatever closestCenter found - measured: a chip aimed at the right column landed after
        // the body.
        className={`flex min-h-[40px] min-w-0 flex-1 gap-1.5 rounded-md bg-ink/[0.02] p-1 dark:bg-ink/[0.03] ${direction === 'row' ? 'flex-row flex-wrap content-start' : 'flex-col'}`}
      >
        {/* Still a drop target: what is placed here is placed for every page, and shows on the
            ones that do not clear it. */}
        {clearedNote && <p className="w-full px-1 text-micro font-medium text-text-secondary">{clearedNote}</p>}
        {indices.length === 0 && <p className="px-2 py-2 text-center text-xs text-text-muted">{t('layoutEditor.emptySlot')}</p>}
        {indices.map((index) => (
          <SortableItem
            key={index}
            id={String(index)}
            plugin={config.plugins[index]}
            groupNames={groupNames}
            rank={ranks.get(index) ?? 1}
            direction={direction}
            selected={selectedIndex === index}
            onSelect={() => onSelect(index)}
            isDuplicate={(nameCounts.get(config.plugins[index].name) ?? 0) > 1}
            hiddenReason={hiddenReason(index)}
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
  selected,
  onSelect,
  isDuplicate,
  hiddenReason
}: {
  id: string
  plugin: PluginEntry
  groupNames: string[]
  rank: number
  direction: 'row' | 'column'
  selected: boolean
  onSelect: () => void
  isDuplicate: boolean
  hiddenReason?: string
}): JSX.Element {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id
  })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className={`min-w-0 ${direction === 'row' ? 'min-w-[6rem] flex-1' : ''} ${isDragging ? 'opacity-40' : ''}`}>
      <ComponentChip
        plugin={plugin}
        groupNames={groupNames}
        rank={rank}
        isDuplicate={isDuplicate}
        hiddenReason={hiddenReason}
        selected={selected}
        onSelect={onSelect}
        // The handle is the activator node, as at the two other @dnd-kit places. Without it
        // dnd-kit's restoreFocus takes the first focusable element of the *drag* node, which here
        // would be the handle by luck and the name button after any reordering of the chip -
        // and after a drop into another zone the element is re-mounted in another PositionSlot,
        // so the old handle is gone (nineteenth review, finding 2).
        dragHandleRef={setActivatorNodeRef}
        dragHandleProps={{ ...attributes, ...listeners, 'data-board-focus': `placed:${id}` }}
      />
    </div>
  )
}
