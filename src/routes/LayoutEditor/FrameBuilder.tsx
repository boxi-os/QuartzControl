import { createContext, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DraggableAttributes,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { confirmDialog } from '../../utils/confirm'
import { GripVertical } from 'lucide-react'
import type {
  FrameAlign,
  FrameBreakpoint,
  FrameBreakpointWidths,
  FrameSlot,
  GridAreaPlacement,
  GridBreakpointLayout,
  GridFrameArea,
  GridFrameDefinition
} from '@shared/ipc-contract'
import { DEFAULT_FRAME_BREAKPOINT_WIDTHS, FRAME_BREAKPOINTS, buildFrameBox, buildGridStyle } from '@shared/gridFrameCss'
import {
  Badge,
  Button,
  Card,
  Field,
  FieldGroup,
  InfoNote,
  SegmentedControl,
  Select,
  SettingsSection,
  TextInput,
  Toggle
} from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import DevServerRestartHint from '../../components/DevServerRestartHint'
import { breakpointRangeLabel } from './utils'
import { announce } from '../../state/announcer'
import { useStickyState } from '../../state/uiState'
import { dndAccessibility } from '../../utils/dndAnnouncements'
import { nearestDroppableCoordinates } from '../../utils/dndKeyboard'

const RESERVED_FRAME_NAMES = ['default', 'full-width', 'minimal']
const SLOTS: FrameSlot[] = ['header', 'left', 'right', 'beforeBody', 'pageBody', 'afterBody', 'footer']
const ALIGNMENTS: FrameAlign[] = ['left', 'center', 'right']

function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'frame'
  )
}

function defaultBreakpointLayout(rows: number, cols: number): GridBreakpointLayout {
  return { rows, cols, rowGap: '1rem', columnGap: '1rem', placements: {} }
}

// "beforeBody" -> "before-body" - kebab-cases a slot name into a readable default area name,
// derived from SLOTS rather than a separately maintained list.
function slotToName(slot: FrameSlot): string {
  return slot.replace(/([A-Z])/g, '-$1').toLowerCase()
}

// "custom-3" counted areas, so deleting one and adding another produced a name that was already
// taken - and two areas with the same name are one grid-template-areas cell, i.e. the second one
// silently overwrites the first. Counts up until the name is free instead.
function nextAreaName(areas: GridFrameArea[]): string {
  const taken = new Set(areas.map((a) => a.name))
  let n = areas.length + 1
  while (taken.has(`custom-${n}`)) n++
  return `custom-${n}`
}

// A brand-new frame starts with one area per real component slot (including pageBody, the actual
// page content - almost every frame needs it), all unplaced. That way the "available areas" tray
// has something to drag onto the grid immediately, instead of an empty editor that only gains
// draggable boxes once the user has already created one by hand via "+ Bereich hinzufügen".
function defaultAreas(): GridFrameArea[] {
  return SLOTS.map((slot) => ({ id: `area-${slot}`, name: slotToName(slot), slot }))
}

function emptyDraft(): GridFrameDefinition {
  return {
    id: `frame-${Date.now()}`,
    frameName: '',
    areas: defaultAreas(),
    breakpoints: {
      desktop: defaultBreakpointLayout(2, 2),
      tablet: defaultBreakpointLayout(2, 2),
      mobile: defaultBreakpointLayout(2, 2)
    }
  }
}

function placementAt(layout: GridBreakpointLayout, areas: GridFrameArea[], row: number, col: number): GridFrameArea | undefined {
  return areas.find((a) => {
    const p = layout.placements[a.id]
    return p && !p.hidden && row >= p.row && row < p.row + p.rowSpan && col >= p.col && col < p.col + p.colSpan
  })
}

function overlaps(
  layout: GridBreakpointLayout,
  areas: GridFrameArea[],
  row: number,
  col: number,
  rowSpan: number,
  colSpan: number,
  excludeId?: string
): boolean {
  for (let r = row; r < row + rowSpan; r++) {
    for (let c = col; c < col + colSpan; c++) {
      const hit = placementAt(layout, areas, r, c)
      if (hit && hit.id !== excludeId) return true
    }
  }
  return false
}

function withPlacement(def: GridFrameDefinition, breakpoint: FrameBreakpoint, areaId: string, placement: GridAreaPlacement): GridFrameDefinition {
  const layout = def.breakpoints[breakpoint]
  return {
    ...def,
    breakpoints: { ...def.breakpoints, [breakpoint]: { ...layout, placements: { ...layout.placements, [areaId]: placement } } }
  }
}

// The board's drop targets, as ids. A cell carries its coordinates in its id because there is
// nothing else to identify it by; a placed box is its own target (dropping onto it means "this
// area's cell", the same as before) and is prefixed so it cannot collide with an area id; the tray
// is the one fixed target that unplaces.
const cellId = (row: number, col: number): string => `cell:${row}:${col}`
const BOX_PREFIX = 'box:'
const TRAY_ID = 'unplaced-tray'

function parseCellId(id: string): { row: number; col: number } | null {
  const parts = id.split(':')
  if (parts[0] !== 'cell') return null
  return { row: Number(parts[1]), col: Number(parts[2]) }
}

// Grabbing a wide box by its small handle puts the dragged rect's centre far from the cursor, so
// the pointer decides while it is over something and the centre only settles ties - the same
// reasoning (and the same pair) as on the global board.
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args)
  return pointerCollisions.length > 0 ? pointerCollisions : closestCenter(args)
}

export default function FrameBuilder({
  projectPath,
  onFramesChanged
}: {
  projectPath: string
  onFramesChanged: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const [frames, setFrames] = useState<GridFrameDefinition[] | null>(null)
  // The open frame draft and everything that says *where* in it the user is survives leaving the
  // area (see useStickyState) - a frame is edited over many small steps, and having the editor
  // close itself every time the user checks another tab meant clicking back in each time. Nothing
  // here is written to disk until Save, exactly as before.
  const [editing, setEditing] = useStickyState<GridFrameDefinition | null>('frames.editing', null)
  const [isNewDraft, setIsNewDraft] = useStickyState('frames.isNewDraft', false)
  const [activeBreakpoint, setActiveBreakpoint] = useStickyState<FrameBreakpoint>('frames.breakpoint', 'desktop')
  // Which area's own settings panel is expanded - all edits write straight into `editing` as they
  // happen, nothing buffered here.
  const [selectedAreaId, setSelectedAreaId] = useStickyState<string | null>('frames.selectedArea', null)
  // The name field is the one exception: it needs to hold whatever the user is literally typing,
  // not the slugified value committed into `editing` on every keystroke (mid-word that value can
  // have its trailing "-" stripped, which would fight typing a multi-word name). Reset only when
  // the *selection* changes, not on every edit - see the effect below.
  const [nameDraft, setNameDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // Saving keeps the editor open (a frame is built in many passes, and being thrown back to the
  // list after every save meant clicking back in each time), so a save that worked needs to say so
  // - otherwise the button just flickers and nothing visibly happens. Held as the serialized
  // definition that was written rather than as a flag, so the notice disappears by itself the
  // moment the draft differs from it again - there is no reset to forget at one of the ~15 places
  // that write into `editing`.
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  // Whether that save was an *edit*. Only an edit needs a dev-server restart: creating a frame runs
  // `quartz plugin add`, which writes quartz.config.yaml and so triggers a rebuild - and the new
  // frame's module has never been imported, so nothing is cached yet. Both measured against a real
  // `--serve` run; see DevServerRestartHint.
  const [savedWasEdit, setSavedWasEdit] = useState(false)
  const [dragAreaId, setDragAreaId] = useState<string | null>(null)
  // Read-only here - edited on the Global tab, because they apply to every frame. Used only to
  // label the three breakpoint tabs with the width band each one actually covers.
  const [breakpointWidths, setBreakpointWidths] = useState<FrameBreakpointWidths>(DEFAULT_FRAME_BREAKPOINT_WIDTHS)

  function refresh(): void {
    window.quartzGui.layoutFrames.list(projectPath).then(setFrames)
  }

  useEffect(() => {
    refresh()
    window.quartzGui.layoutFrames.getBreakpoints(projectPath).then(setBreakpointWidths)
  }, [projectPath])

  useEffect(() => {
    const area = selectedAreaId ? (editing?.areas.find((a) => a.id === selectedAreaId) ?? null) : null
    setNameDraft(area?.name ?? '')
    // Deliberately only re-syncs when the *selection* changes, not on every `editing` update -
    // otherwise each live-committed (slugified) keystroke would snap the field back over the raw
    // text the user is still typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAreaId])

  function startNewFrame(): void {
    setEditing(emptyDraft())
    setIsNewDraft(true)
    setActiveBreakpoint('desktop')
    setSelectedAreaId(null)
    setMessage(null)
    setSavedSnapshot(null)
  }

  function startEditFrame(def: GridFrameDefinition): void {
    setEditing(def)
    setIsNewDraft(false)
    setActiveBreakpoint('desktop')
    setSelectedAreaId(null)
    setMessage(null)
    setSavedSnapshot(null)
  }

  function closeEditor(): void {
    setEditing(null)
    setSelectedAreaId(null)
    setDragAreaId(null)
  }

  function nameCollision(def: GridFrameDefinition): boolean {
    if (RESERVED_FRAME_NAMES.includes(def.frameName)) return true
    return (frames ?? []).some((f) => f.id !== def.id && f.frameName === def.frameName)
  }

  /**
   * Two areas sharing a name, which blocks the save rather than warning.
   *
   * An area's name is its `grid-area`, and two areas carrying one name put it on two rectangles of
   * the grid. CSS requires a named area to be a single rectangle, so the browser rejects the whole
   * `grid-template-areas` declaration - not the one name, the declaration. Measured on a real
   * build after renaming one area to match another: `grid-template-areas` computed to `none`, the
   * tracks collapsed to `0px 0px 0px 0px 1248px`, and every area sat at the same place with the
   * same height. The frame does not lose an area, it loses its layout.
   *
   * That is more than a warning underneath the grid is worth, and the editor already refuses to
   * save a frame whose *own* name is taken - this is the same kind of mistake, one level down.
   */
  function duplicateAreaNames(def: GridFrameDefinition): string[] {
    const seen = new Set<string>()
    const twice = new Set<string>()
    for (const area of def.areas) {
      if (seen.has(area.name)) twice.add(area.name)
      seen.add(area.name)
    }
    return [...twice]
  }

  /**
   * Two areas holding the same group on the same slot show the same components twice - the same
   * mistake as two areas on one slot, one level down. It only became reachable once renaming an
   * area stopped renaming its group: an area keeps "toolbar" while its name moves on, a later area
   * called "toolbar" switches its group on, and both now claim the k-th flex.
   */
  function duplicateAreaGroups(def: GridFrameDefinition): string[] {
    const seen = new Set<string>()
    const twice = new Set<string>()
    for (const area of def.areas) {
      if (!area.slot || !area.group) continue
      const key = `${area.slot}\u0000${area.group}`
      if (seen.has(key)) twice.add(area.group)
      seen.add(key)
    }
    return [...twice]
  }

  function updateLayout(patch: Partial<GridBreakpointLayout>): void {
    if (!editing) return
    const layout = editing.breakpoints[activeBreakpoint]
    setEditing({ ...editing, breakpoints: { ...editing.breakpoints, [activeBreakpoint]: { ...layout, ...patch } } })
  }

  function setColumnSize(index: number, value: string): void {
    if (!editing) return
    const layout = editing.breakpoints[activeBreakpoint]
    const sizes = [...(layout.columnSizes ?? [])]
    sizes[index] = value
    updateLayout({ columnSizes: sizes })
  }

  function setRowSize(index: number, value: string): void {
    if (!editing) return
    const layout = editing.breakpoints[activeBreakpoint]
    const sizes = [...(layout.rowSizes ?? [])]
    sizes[index] = value
    updateLayout({ rowSizes: sizes })
  }

  function setColumnLineName(index: number, value: string): void {
    if (!editing) return
    const layout = editing.breakpoints[activeBreakpoint]
    const names = { ...(layout.columnLineNames ?? {}) }
    if (value.trim()) names[index] = [value.trim()]
    else delete names[index]
    updateLayout({ columnLineNames: names })
  }

  function setRowLineName(index: number, value: string): void {
    if (!editing) return
    const layout = editing.breakpoints[activeBreakpoint]
    const names = { ...(layout.rowLineNames ?? {}) }
    if (value.trim()) names[index] = [value.trim()]
    else delete names[index]
    updateLayout({ rowLineNames: names })
  }

  function copyLayoutTo(target: FrameBreakpoint): void {
    if (!editing) return
    const layout = editing.breakpoints[activeBreakpoint]
    setEditing({
      ...editing,
      breakpoints: { ...editing.breakpoints, [target]: { ...layout, placements: { ...layout.placements } } }
    })
  }

  // Always a plain single-point placement: the area lands at exactly the cell dropped on, keeping
  // whatever span it already had (or 1x1 for a brand-new one). An earlier version tried to also
  // let a drag *across* several cells before releasing draw a rectangle spanning them - dropped
  // again after real-world testing: a real mouse drag easily grazes an unrelated cell (occupied or
  // not) on the way to the intended target, silently expanding/moving the placement from wherever
  // that graze happened rather than from where the drag started. Span is set exclusively through
  // the row/col span number fields in the area form below, which don't have that failure mode.
  function handleDrop(areaId: string, row: number, col: number): void {
    if (!editing) return
    const layout = editing.breakpoints[activeBreakpoint]
    const area = editing.areas.find((a) => a.id === areaId)
    if (!area) return
    const existing = layout.placements[areaId]
    const rowSpan = Math.min(existing?.rowSpan ?? 1, layout.rows - row + 1)
    const colSpan = Math.min(existing?.colSpan ?? 1, layout.cols - col + 1)
    if (overlaps(layout, editing.areas, row, col, rowSpan, colSpan, areaId)) {
      // Said as well as shown: the drag's own narration ends with "bei Zelle ... abgelegt", which
      // would otherwise be the last thing anyone hears about a drop that was refused.
      setMessage(t('layoutEditor.frameBuilder.overlapError'))
      announce(t('layoutEditor.frameBuilder.overlapError'))
      return
    }
    setEditing((prev) => (prev ? withPlacement(prev, activeBreakpoint, areaId, { row, col, rowSpan, colSpan, hidden: false }) : prev))
    setSelectedAreaId(areaId)
    setMessage(null)
  }

  // Distance before a drag starts, so a click on a tray chip still selects it: without it every
  // press on the chip's handle is a drag of zero pixels and the click never lands.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: nearestDroppableCoordinates })
  )
  // Every id on this board in words: an area by its name, a cell by its coordinates, the tray by
  // its label - see dndAccessibility.
  const { announcements, screenReaderInstructions } = dndAccessibility(t, (id) => {
    if (id === TRAY_ID) return t('layoutEditor.frameBuilder.availableAreasLabel')
    const cell = parseCellId(id)
    if (cell) return t('layoutEditor.frameBuilder.cellName', { row: cell.row, col: cell.col })
    const areaId = id.startsWith(BOX_PREFIX) ? id.slice(BOX_PREFIX.length) : id
    return editing?.areas.find((a) => a.id === areaId)?.name ?? id
  })

  function handleDragStart(event: DragStartEvent): void {
    setDragAreaId(String(event.active.id))
  }

  // One place decides what a drop meant, instead of a handler per target: the tray unplaces, a cell
  // places at its coordinates, a placed box places at *its* cell (dropping onto a box has always
  // meant "here", not "swap"), and anything else is a drag that ended over nothing.
  function handleDragEnd(event: DragEndEvent): void {
    setDragAreaId(null)
    const areaId = String(event.active.id)
    const over = event.over ? String(event.over.id) : null
    if (!over) return

    if (over === TRAY_ID) {
      unplaceAreaById(areaId)
      setSelectedAreaId(areaId)
      return
    }

    const cell = parseCellId(over)
    if (cell) {
      handleDrop(areaId, cell.row, cell.col)
      return
    }

    if (over.startsWith(BOX_PREFIX) && editing) {
      const placement = editing.breakpoints[activeBreakpoint].placements[over.slice(BOX_PREFIX.length)]
      if (placement) handleDrop(areaId, placement.row, placement.col)
    }
  }

  // Created immediately (not as a buffered draft) so it's live the moment it exists: it shows up
  // in the "available areas" tray right away and is pre-selected, ready to rename/place.
  function addNewArea(): void {
    if (!editing) return
    const id = `area-${Date.now()}`
    // No slot: quartz hands out seven sources of content and a frame may have more areas, so a new
    // one starts as an empty cell and says so. It used to be born on `left`, which is why this
    // project's "editorial" frame ended up with three areas on that slot - and built the whole
    // left sidebar three times onto every page.
    const newArea: GridFrameArea = { id, name: nextAreaName(editing.areas) }
    setEditing({ ...editing, areas: [...editing.areas, newArea] })
    setSelectedAreaId(id)
    setMessage(null)
  }

  // Every update* below writes straight into `editing`, so the grid reflects each change as it
  // happens - no separate "confirm" step. `updateAreaName` is the one that also updates the raw
  // `nameDraft` the input displays (see the effect above for why the two are kept separate).
  function updateAreaName(id: string, rawName: string): void {
    if (!editing) return
    setNameDraft(rawName)
    const name = slugify(rawName)
    setEditing({
      ...editing,
      // The group is deliberately left alone. It is the area's own name only at the moment the
      // switch is flipped (see updateAreaGroup); afterwards it is a key into quartz.config.yaml,
      // where the members carry `layout.group: <that name>` - and this editor does not know the
      // config, let alone write it. Renaming the group along with the area would therefore point
      // the area at a group nobody is in, and the components it used to hold would fall back into
      // the position's plain area on every built page, with the flex count still adding up and so
      // nothing to warn about. The panel says which group an area holds once the two differ.
      areas: editing.areas.map((a) => (a.id === id ? { ...a, name } : a))
    })
  }

  function updateAreaSlot(id: string, slot: FrameSlot | undefined): void {
    if (!editing) return
    // Only the six real positions can be split; "no slot" is an empty cell and pageBody is a single
    // component, so a group left over from a previous choice would be a setting with no effect.
    const keepsGroup = !!slot && slot !== 'pageBody'
    setEditing({
      ...editing,
      areas: editing.areas.map((a) => (a.id === id ? { ...a, slot, group: keepsGroup ? a.group : undefined } : a))
    })
  }

  // A group exists as soon as a component names it - `layout.groups` only ever holds its direction
  // and gap - so switching this on writes nothing to quartz.config.yaml. What it does is make the
  // area its own drop target in the layout board; the components dragged there get
  // `layout.group: <area name>` and stop appearing in the position's plain area.
  function updateAreaGroup(id: string, own: boolean): void {
    if (!editing) return
    setEditing({
      ...editing,
      areas: editing.areas.map((a) => (a.id === id ? { ...a, group: own ? a.name : undefined } : a))
    })
  }

  function updateAreaSpan(id: string, patch: { rowSpan?: number; colSpan?: number }): void {
    if (!editing) return
    const layout = editing.breakpoints[activeBreakpoint]
    const existing = layout.placements[id]
    if (!existing) return
    const rowSpan = patch.rowSpan !== undefined ? Math.min(Math.max(1, patch.rowSpan), layout.rows - existing.row + 1) : existing.rowSpan
    const colSpan = patch.colSpan !== undefined ? Math.min(Math.max(1, patch.colSpan), layout.cols - existing.col + 1) : existing.colSpan
    if (overlaps(layout, editing.areas, existing.row, existing.col, rowSpan, colSpan, id)) {
      setMessage(t('layoutEditor.frameBuilder.overlapError'))
      return
    }
    setEditing(withPlacement(editing, activeBreakpoint, id, { ...existing, rowSpan, colSpan }))
    setMessage(null)
  }

  function updateAreaHidden(id: string, hidden: boolean): void {
    if (!editing) return
    const layout = editing.breakpoints[activeBreakpoint]
    const existing = layout.placements[id]
    if (!existing) return
    setEditing(withPlacement(editing, activeBreakpoint, id, { ...existing, hidden }))
  }

  // Removes just this breakpoint's placement, sending the area back to the "available areas"
  // tray without touching its placements on other breakpoints or deleting it outright. Reachable
  // both from the panel's own button and by dragging a placed box back onto the tray.
  function unplaceAreaById(id: string): void {
    if (!editing) return
    const layout = editing.breakpoints[activeBreakpoint]
    if (!layout.placements[id]) return
    const placements = { ...layout.placements }
    delete placements[id]
    setEditing({ ...editing, breakpoints: { ...editing.breakpoints, [activeBreakpoint]: { ...layout, placements } } })
  }

  function deleteAreaById(id: string): void {
    if (!editing) return
    const breakpoints = { ...editing.breakpoints }
    for (const bp of FRAME_BREAKPOINTS) {
      const placements = { ...breakpoints[bp].placements }
      delete placements[id]
      breakpoints[bp] = { ...breakpoints[bp], placements }
    }
    setEditing({ ...editing, areas: editing.areas.filter((a) => a.id !== id), breakpoints })
    setSelectedAreaId((prev) => (prev === id ? null : prev))
  }

  async function save(): Promise<void> {
    if (!editing) return
    if (!editing.frameName.trim()) {
      setMessage(t('layoutEditor.frameBuilder.nameRequired'))
      return
    }
    if (nameCollision(editing)) {
      setMessage(t('layoutEditor.frameBuilder.nameCollision'))
      return
    }
    const twice = duplicateAreaNames(editing)
    if (twice.length > 0) {
      setMessage(t('layoutEditor.frameBuilder.areaNameCollision', { names: twice.join(', ') }))
      return
    }
    const twiceGrouped = duplicateAreaGroups(editing)
    if (twiceGrouped.length > 0) {
      setMessage(t('layoutEditor.frameBuilder.areaGroupCollision', { names: twiceGrouped.join(', ') }))
      return
    }
    setSaving(true)
    try {
      const result = await window.quartzGui.layoutFrames.save(projectPath, editing)
      if (!result.success) {
        setSavedSnapshot(null)
        setMessage(result.output)
        return
      }
      refresh()
      onFramesChanged()
      // Deliberately no closeEditor() here - see savedNotice. `isNewDraft` flips because the frame
      // now exists on disk: saveFrame() only registers the companion plugin the first time, and the
      // delete link belongs to a frame that is real.
      setSavedWasEdit(!isNewDraft)
      setIsNewDraft(false)
      setMessage(null)
      setSavedSnapshot(JSON.stringify(editing))
    } catch (err) {
      // e.g. an area name the validation layer refuses because it would break the generated CSS
      setMessage(formatIpcError(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove(def: GridFrameDefinition): Promise<void> {
    if (
      !(await confirmDialog({
        text: t('layoutEditor.frameBuilder.deleteConfirm', { name: def.frameName }),
        confirmLabel: t('layoutEditor.frameBuilder.deleteConfirmAction'),
        danger: true
      }))
    )
      return
    const result = await window.quartzGui.layoutFrames.delete(projectPath, def.id)
    setMessage(result.success ? null : result.output)
    refresh()
    onFramesChanged()
    if (editing?.id === def.id) closeEditor()
  }

  if (!frames) return <p className="text-sm text-text-muted">{t('layoutEditor.loading')}</p>

  if (!editing) {
    return (
      <div className="flex flex-col gap-4">
        {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}
        {/* The whole app says "Frame" and no screen said what one is. It belongs here, on the
            list that is the first thing anyone opens who wants to build one. */}
        <InfoNote>{t('layoutEditor.frameBuilder.whatIsAFrame')}</InfoNote>
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">{t('layoutEditor.frameBuilder.description')}</p>
          <Button onClick={startNewFrame}>{t('layoutEditor.frameBuilder.newFrame')}</Button>
        </div>
        {frames.length === 0 && <p className="text-sm text-text-muted">{t('layoutEditor.frameBuilder.none')}</p>}
        <div className="flex flex-col gap-2">
          {frames.map((def) => (
            <Card key={def.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{def.frameName}</p>
                <p className="text-xs text-text-muted">
                  {t('layoutEditor.frameBuilder.gridSummary', {
                    rows: def.breakpoints.desktop.rows,
                    cols: def.breakpoints.desktop.cols,
                    areas: def.areas.length
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => startEditFrame(def)}>
                  {t('common.edit')}
                </Button>
                <Button variant="danger" onClick={() => remove(def)}>
                  {t('common.remove')}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const savedNotice = savedSnapshot !== null && savedSnapshot === JSON.stringify(editing)
  const layout = editing.breakpoints[activeBreakpoint]
  const gridStyle = buildGridStyle(layout, editing.areas)
  const box = buildFrameBox(layout)
  const hasMaxWidth = !!layout.maxWidth?.trim()
  const hasBox = hasMaxWidth || box.paddingBlock !== '0' || box.paddingInline !== '0'
  const visibleAreas = editing.areas.filter((a) => {
    const p = layout.placements[a.id]
    return p && !p.hidden
  })
  const usedSlots = new Set(visibleAreas.map((a) => a.slot).filter((s): s is FrameSlot => !!s))
  const unassignedSlots = SLOTS.filter((s) => s !== 'pageBody' && !usedSlots.has(s))
  // Two visible areas on one slot render that slot's whole component list twice - measured on this
  // project's "editorial" frame, which had three on `left`. The editor used to allow it silently;
  // the build was the first place it showed.
  // Only areas without a group double up - two group areas on one slot are the point of the
  // exercise, they show different components.
  const doubledSlots = SLOTS.filter((s) => visibleAreas.filter((a) => a.slot === s && !a.group).length > 1)
  // The other half of that: a slot whose visible areas *all* have a group has nowhere to put the
  // components that are in no group, and they then appear on no page at all. Measured on a real
  // build - two group areas on `left` and no plain one took the spacer, the dark-mode switch and
  // the reader-mode switch off every page, with nothing said anywhere. Structural, so the frame
  // editor can see it without knowing which components the project has.
  const homelessSlots = SLOTS.filter(
    (s) => s !== 'pageBody' && visibleAreas.some((a) => a.slot === s && a.group) && !visibleAreas.some((a) => a.slot === s && !a.group)
  )
  /**
   * The one form for an area, wherever it currently lies.
   *
   * It used to live inside `PlacedBox` only - and `PlacedBox` renders nothing for an area without a
   * placement on this breakpoint, so an area in the tray had no name field, no slot picker and, the
   * part that made it a trap, no way to delete it. A brand-new area is born exactly like that
   * (`addNewArea` gives it neither slot nor placement), so the first thing anyone does here led
   * straight into it: the area could only be worked on after being dragged onto the grid.
   *
   * `placement` is what the two cases differ by, and only the fields that describe a placement are
   * conditional on it - the spans, "visible on this breakpoint", and taking it back off the grid.
   * Name, slot, group and deleting the area belong to the area itself and are always there.
   *
   * The two cases are *not* "on the grid" and "in the tray": an area that is placed but hidden sits
   * in the tray and has a placement, so the tray passes it on. It was the caller that decided this,
   * not the form, and the caller decided wrong - the switch that had just hidden the area was then
   * missing from the only form the area had, and the sole way back was a drag, which assigns a new
   * cell rather than restoring the old one.
   */
  function areaForm(area: GridFrameArea, placement?: GridAreaPlacement): JSX.Element {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        // The keyboard's half of the same guard. A placed area's box is itself a role="button" with
        // an Enter/Space handler, and this form is a child of it - so every keystroke in a field
        // rose to the box, which called preventDefault() and collapsed the form. The character
        // never arrived: no space in a name, no toggle by Space, no Return anywhere. The click path
        // had this line from the start; the key path never did, and in the tray, where nothing
        // listens above, the same form always worked - which is what made the difference visible.
        onKeyDown={(e) => e.stopPropagation()}
        className="flex flex-wrap items-end gap-2 border-t border-ink/[0.06] pt-2 dark:border-ink/10"
      >
        <Field label={t('layoutEditor.frameBuilder.areaName')}>
          <TextInput value={nameDraft} onChange={(e) => updateAreaName(area.id, e.target.value)} autoFocus className="w-32" />
        </Field>
        <Field label={t('layoutEditor.frameBuilder.areaSlot')}>
          <Select
            value={area.slot ?? ''}
            onChange={(e) => updateAreaSlot(area.id, (e.target.value || undefined) as FrameSlot | undefined)}
            className="w-32"
          >
            <option value="">{t('layoutEditor.frameBuilder.slotNone')}</option>
            {SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {t(`positions.${slot}`, slot)}
              </option>
            ))}
          </Select>
        </Field>
        {area.slot && area.slot !== 'pageBody' && (
          <Toggle
            label={t('layoutEditor.frameBuilder.ownGroup')}
            hint={
              area.group && area.group !== area.name
                ? t('layoutEditor.frameBuilder.ownGroupRenamed', { group: area.group })
                : t('layoutEditor.frameBuilder.ownGroupHint')
            }
            checked={!!area.group}
            onChange={(checked) => updateAreaGroup(area.id, checked)}
          />
        )}
        {placement && (
          <>
            <Field label={t('layoutEditor.frameBuilder.rowSpanLabel')}>
              <TextInput
                type="number"
                min={1}
                max={layout.rows}
                value={placement.rowSpan}
                onChange={(e) => updateAreaSpan(area.id, { rowSpan: Number(e.target.value) || 1 })}
                className="w-16"
              />
            </Field>
            <Field label={t('layoutEditor.frameBuilder.colSpanLabel')}>
              <TextInput
                type="number"
                min={1}
                max={layout.cols}
                value={placement.colSpan}
                onChange={(e) => updateAreaSpan(area.id, { colSpan: Number(e.target.value) || 1 })}
                className="w-16"
              />
            </Field>
            <Toggle
              label={t('layoutEditor.frameBuilder.visibleOnBreakpoint', {
                breakpoint: t(`layoutEditor.frameBuilder.breakpoint.${activeBreakpoint}`)
              })}
              checked={!placement.hidden}
              onChange={(checked) => updateAreaHidden(area.id, !checked)}
            />
            <Button variant="ghost" onClick={() => unplaceAreaById(area.id)}>
              {t('layoutEditor.frameBuilder.unplace')}
            </Button>
          </>
        )}
        <Button variant="danger" onClick={() => deleteAreaById(area.id)}>
          {t('layoutEditor.frameBuilder.removeArea')}
        </Button>
      </div>
    )
  }

  // Two kinds of chip: never placed on this breakpoint, and placed but hidden. They read the same
  // in the tray, so the chip says which - "no groups" and "a group whose members never render" all
  // over again, one level up.
  const unplacedAreas = editing.areas.filter((a) => {
    const p = layout.placements[a.id]
    return !p || p.hidden
  })
  const draggedArea = dragAreaId ? (editing.areas.find((a) => a.id === dragAreaId) ?? null) : null
  const neverVisibleAreas = editing.areas.filter((a) =>
    FRAME_BREAKPOINTS.every((bp) => {
      const p = editing.breakpoints[bp].placements[a.id]
      return !p || p.hidden
    })
  )

  const breakpointOptions = FRAME_BREAKPOINTS.map((bp) => ({
    value: bp,
    label: `${t(`layoutEditor.frameBuilder.breakpoint.${bp}`)} · ${breakpointRangeLabel(bp, breakpointWidths)}`
  }))

  return (
    <div className="flex flex-col gap-4">
      {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}

      <SegmentedControl
        label={t('layoutEditor.frameBuilder.breakpointLabel')}
        value={activeBreakpoint}
        onChange={setActiveBreakpoint}
        options={breakpointOptions}
      />

      <Card>
        {/* Everything above the board is one breakpoint's settings, so it reads as such: the frame's
            identity once at the top, then the grid, then the frame's own box - each with the actions
            that belong to it rather than in one long row of controls. */}
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Field label={t('layoutEditor.frameBuilder.frameName')} className="w-full max-w-xs">
              <TextInput
                value={editing.frameName}
                onChange={(e) => setEditing({ ...editing, frameName: e.target.value })}
                placeholder={t('layoutEditor.templateCustomPlaceholder')}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-micro text-text-muted">
                {t('layoutEditor.frameBuilder.appliesTo', {
                  breakpoint: t(`layoutEditor.frameBuilder.breakpoint.${activeBreakpoint}`)
                })}
              </span>
              {FRAME_BREAKPOINTS.filter((bp) => bp !== activeBreakpoint).map((bp) => (
                <Button key={bp} variant="ghost" onClick={() => copyLayoutTo(bp)}>
                  {t('layoutEditor.frameBuilder.copyLayoutTo', { target: t(`layoutEditor.frameBuilder.breakpoint.${bp}`) })}
                </Button>
              ))}
            </div>
          </div>

          <SettingsSection
            title={t('layoutEditor.frameBuilder.gridSection')}
            actions={
              <button
                type="button"
                className="text-micro text-text-muted underline hover:text-text"
                onClick={() => updateLayout({ columnSizes: undefined, rowSizes: undefined })}
              >
                {t('layoutEditor.frameBuilder.resetTracks')}
              </button>
            }
          >
            <div className="grid max-w-3xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={t('layoutEditor.frameBuilder.rows')}>
                <TextInput
                  type="number"
                  min={1}
                  max={12}
                  value={layout.rows}
                  onChange={(e) => updateLayout({ rows: Math.max(1, Number(e.target.value) || 1) })}
                />
              </Field>
              <Field label={t('layoutEditor.frameBuilder.cols')}>
                <TextInput
                  type="number"
                  min={1}
                  max={12}
                  value={layout.cols}
                  onChange={(e) => updateLayout({ cols: Math.max(1, Number(e.target.value) || 1) })}
                />
              </Field>
              <Field label={t('layoutEditor.frameBuilder.rowGap')}>
                <TextInput value={layout.rowGap} onChange={(e) => updateLayout({ rowGap: e.target.value })} />
              </Field>
              <Field label={t('layoutEditor.frameBuilder.columnGap')}>
                <TextInput value={layout.columnGap} onChange={(e) => updateLayout({ columnGap: e.target.value })} />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <TrackInputs
                label={t('layoutEditor.frameBuilder.columnSizesLabel')}
                count={layout.cols}
                firstIndex={1}
                placeholder="1fr"
                valueAt={(i) => layout.columnSizes?.[i] ?? ''}
                onChange={setColumnSize}
              />
              <TrackInputs
                label={t('layoutEditor.frameBuilder.rowSizesLabel')}
                count={layout.rows}
                firstIndex={1}
                placeholder="auto"
                valueAt={(i) => layout.rowSizes?.[i] ?? ''}
                onChange={setRowSize}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title={t('layoutEditor.frameBuilder.boxSection')}
            hint={t(hasMaxWidth ? 'layoutEditor.frameBuilder.boxHint' : 'layoutEditor.frameBuilder.boxHintNoMaxWidth')}
          >
            <div className="grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Field label={t('layoutEditor.frameBuilder.maxWidth')}>
                <TextInput
                  value={layout.maxWidth ?? ''}
                  placeholder={t('layoutEditor.frameBuilder.maxWidthPlaceholder')}
                  onChange={(e) => updateLayout({ maxWidth: e.target.value })}
                />
              </Field>
              {/* Three options side by side need more than one column's worth of width. */}
              {/* FieldGroup, not Field - see ui.tsx: a <label> around buttons steals the click. */}
              <FieldGroup label={t('layoutEditor.frameBuilder.align')} className="sm:col-span-2">
                <SegmentedControl
                  label={t('layoutEditor.frameBuilder.align')}
                  value={layout.align ?? 'left'}
                  onChange={(align: FrameAlign) => updateLayout({ align })}
                  options={ALIGNMENTS.map((value) => ({ value, label: t(`layoutEditor.frameBuilder.alignOption.${value}`) }))}
                />
              </FieldGroup>
              <Field label={t('layoutEditor.frameBuilder.paddingBlock')}>
                <TextInput
                  value={layout.paddingBlock ?? ''}
                  placeholder="0"
                  onChange={(e) => updateLayout({ paddingBlock: e.target.value })}
                />
              </Field>
              <Field label={t('layoutEditor.frameBuilder.paddingInline')}>
                <TextInput
                  value={layout.paddingInline ?? ''}
                  placeholder="0"
                  onChange={(e) => updateLayout({ paddingInline: e.target.value })}
                />
              </Field>
            </div>
          </SettingsSection>

          <SettingsSection
            title={t('layoutEditor.frameBuilder.lineNamesLabel')}
            hint={t('layoutEditor.frameBuilder.lineNamesHint')}
            collapsible
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <TrackInputs
                label={t('layoutEditor.frameBuilder.columnLinesLabel')}
                count={layout.cols + 1}
                firstIndex={0}
                placeholder=""
                valueAt={(i) => layout.columnLineNames?.[i]?.[0] ?? ''}
                onChange={setColumnLineName}
              />
              <TrackInputs
                label={t('layoutEditor.frameBuilder.rowLinesLabel')}
                count={layout.rows + 1}
                firstIndex={0}
                placeholder=""
                valueAt={(i) => layout.rowLineNames?.[i]?.[0] ?? ''}
                onChange={setRowLineName}
              />
            </div>
          </SettingsSection>
        </div>

        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-micro font-medium text-text-muted">{t('layoutEditor.frameBuilder.availableAreasLabel')}</p>
          <Button variant="ghost" onClick={addNewArea}>
            {t('layoutEditor.frameBuilder.newArea')}
          </Button>
        </div>
        {/* Tray and board are one drag context: a chip goes from the tray onto a cell, and a placed
            box goes back to the tray. Two contexts could not see each other's targets. */}
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDragAreaId(null)}
          accessibility={{ announcements, screenReaderInstructions }}
        >
        <UnplacedTray dragging={dragAreaId !== null}>
          {unplacedAreas.length === 0 && <span className="px-1 text-micro text-text-muted">{t('layoutEditor.frameBuilder.allPlaced')}</span>}
          {unplacedAreas.map((a) => (
            <TrayChip
              key={a.id}
              area={a}
              selected={selectedAreaId === a.id}
              dragging={dragAreaId === a.id}
              hidden={!!layout.placements[a.id]}
              onSelect={() => setSelectedAreaId(selectedAreaId === a.id ? null : a.id)}
            >
              {/* With its placement where it has one: a chip is in the tray for two reasons, and a
                  hidden area still has row, column and spans - it is just not drawn on this
                  breakpoint. Without them the one switch that put it here ("visible on ...") was
                  not in its form, so the only way back was a drag, which hands out a new cell. */}
              {areaForm(a, layout.placements[a.id])}
            </TrayChip>
          ))}
        </UnplacedTray>

        <p className="mb-2 text-xs text-text-muted">{t('layoutEditor.frameBuilder.hintDragToPlace')}</p>

        {/* The drop board carries the frame's own box, so a cap, an alignment or a padding is
            something you can see rather than a value you have to imagine. It is the same box the
            codegen writes - both come out of buildFrameBox - but at panel width, so a cap wider
            than this panel legitimately looks like nothing happened. */}
        <div
          className={`relative grid gap-1 ${
            hasBox ? 'rounded-[8px] border border-dashed border-blue-400/50 dark:border-blue-400/40' : ''
          }`}
          style={{
            gridTemplateColumns: gridStyle.gridTemplateColumns,
            gridTemplateRows: gridStyle.gridTemplateRows,
            rowGap: gridStyle.rowGap,
            columnGap: gridStyle.columnGap,
            width: box.width,
            maxWidth: box.maxWidth,
            marginInline: box.marginInline,
            paddingBlock: box.paddingBlock,
            paddingInline: box.paddingInline
          }}
        >
          {Array.from({ length: layout.rows }, (_, r) =>
            Array.from({ length: layout.cols }, (_, c) => <DropCell key={`${r + 1}-${c + 1}`} row={r + 1} col={c + 1} />)
          )}
          {editing.areas.map((area) => {
            const placement = layout.placements[area.id]
            if (!placement || placement.hidden) return null
            const isSelected = selectedAreaId === area.id
            return (
              <PlacedBox
                key={area.id}
                areaId={area.id}
                placement={placement}
                selected={isSelected}
                dragging={dragAreaId === area.id}
                label={t('layoutEditor.frameBuilder.expandArea')}
                onToggle={() => setSelectedAreaId(isSelected ? null : area.id)}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <AreaDragHandle label={t('layoutEditor.frameBuilder.moveArea', { name: area.name })} />
                    <span className="truncate font-medium">{area.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge>
                      {area.slot ? t(`positions.${area.slot}`, area.slot) : t('layoutEditor.frameBuilder.slotNone')}
                      {area.group ? ` · ${t('layoutEditor.frameBuilder.ownGroupShort')}` : ''}
                    </Badge>
                    <span aria-hidden="true" className="rounded-[4px] p-0.5 text-text-muted">
                      {isSelected ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {isSelected && areaForm(area, placement)}

                {area.slot === 'pageBody' && (
                  <div className="rounded-[4px] border border-dashed border-ink/10 px-2 py-3 text-center text-text-muted dark:border-ink/10">
                    {t('layoutEditor.frameBuilder.preview.pageContent')}
                  </div>
                )}
              </PlacedBox>
            )
          })}
        </div>

        {/* What follows the cursor - without it a dnd-kit drag moves nothing visible, since the
            source keeps its place in the grid until the drop. */}
        <DragOverlay>
          {draggedArea && (
            <div className="rounded-[6px] border border-blue-500 bg-blue-100 px-2 py-1 text-micro font-medium shadow-md dark:border-blue-400 dark:bg-blue-500/30">
              {draggedArea.name}
            </div>
          )}
        </DragOverlay>
        </DndContext>

        {unassignedSlots.length > 0 && (
          <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
            {t('layoutEditor.frameBuilder.unassignedWarning', {
              slots: unassignedSlots.map((s) => t(`positions.${s}`, s)).join(', ')
            })}
          </p>
        )}
        {homelessSlots.length > 0 && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            {t('layoutEditor.frameBuilder.homelessWarning', {
              slots: homelessSlots.map((s) => t(`positions.${s}`, s)).join(', ')
            })}
          </p>
        )}
        {doubledSlots.length > 0 && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            {t('layoutEditor.frameBuilder.doubledWarning', {
              slots: doubledSlots.map((s) => t(`positions.${s}`, s)).join(', ')
            })}
          </p>
        )}
        {neverVisibleAreas.length > 0 && (
          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            {t('layoutEditor.frameBuilder.neverVisibleWarning', {
              areas: neverVisibleAreas.map((a) => a.name).join(', ')
            })}
          </p>
        )}
      </Card>

      <div className="flex items-center justify-end gap-3">
        {savedNotice && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('layoutEditor.frameBuilder.saved')}</span>
        )}
        <DevServerRestartHint show={savedNotice && savedWasEdit} />
        <Button variant="ghost" onClick={closeEditor}>
          {t('layoutEditor.frameBuilder.closeEditor')}
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>
      {!isNewDraft && (
        <p className="text-right">
          <button type="button" onClick={() => remove(editing)} className="text-xs text-red-600 underline dark:text-red-400">
            {t('layoutEditor.frameBuilder.deleteFrame')}
          </button>
        </p>
      )}
    </div>
  )
}

// The per-track inputs (column widths, row heights, line names) with the position each one belongs
// to printed under it - without that number the row is a line of identical boxes, and the line-name
// inputs start at 0 while the track inputs start at 1.
function TrackInputs({
  label,
  count,
  firstIndex,
  placeholder,
  valueAt,
  onChange
}: {
  label: string
  count: number
  firstIndex: number
  placeholder: string
  valueAt: (index: number) => string
  onChange: (index: number, value: string) => void
}): JSX.Element {
  return (
    <div>
      <p className="mb-1.5 text-micro font-medium text-text-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: count }, (_, i) => (
          <label key={i} className="flex flex-col items-center gap-0.5">
            <TextInput
              value={valueAt(i)}
              placeholder={placeholder}
              onChange={(e) => onChange(i, e.target.value)}
              className="w-16 text-center"
            />
            <span className="text-[10px] text-text-muted">{i + firstIndex}</span>
          </label>
        ))}
      </div>
    </div>
  )
}


// The tray of areas that have no place on this breakpoint. It is a drop target itself: dropping a
// placed box here unplaces it, which is the same thing the box's own "Nicht platzieren" button does.
// What the drag *is* (the whole chip, the whole box) and what starts it (the grip inside) are two
// different nodes, and dnd-kit wants the first as its node and the second as its activator: the node
// is what collision detection measures. With the grip as the node, picking a placed box up put a
// 18px rect at the box's top-left corner, and the nearest target to that was the tray above - so a
// pick-up-and-drop without moving unplaced the area instead of leaving it where it was. Measured on
// the frame board. The context is how the grip, which is written at the call site inside the box,
// gets the activator props of the box that contains it.
type DragActivator = {
  attributes: DraggableAttributes
  listeners: ReturnType<typeof useDraggable>['listeners']
  setActivatorNodeRef: (node: HTMLElement | null) => void
}
const ActivatorContext = createContext<DragActivator | null>(null)

function UnplacedTray({ dragging, children }: { dragging: boolean; children: React.ReactNode }): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: TRAY_ID })
  return (
    <div
      ref={setNodeRef}
      className={`mb-3 flex min-h-[44px] flex-wrap items-center gap-2 rounded-[8px] border border-dashed p-2 transition-colors ${
        isOver
          ? 'border-blue-500 bg-blue-100/60 dark:border-blue-400 dark:bg-blue-500/10'
          : dragging
            ? 'border-blue-400 bg-blue-50/50 dark:border-blue-500/40 dark:bg-blue-500/5'
            : 'border-transparent'
      }`}
    >
      {children}
    </div>
  )
}

// An unplaced area. The chip selects on click as it always did; the grip beside it is what drags,
// the same split the placed box uses - with the whole chip as the activator, keyboard users would
// have no way left to select it (space and enter both belong to the drag then).
function TrayChip({
  area,
  selected,
  dragging,
  hidden,
  onSelect,
  children
}: {
  area: GridFrameArea
  selected: boolean
  dragging: boolean
  onSelect: () => void
  // Placed on this breakpoint but hidden, rather than not placed at all.
  hidden: boolean
  // The area's form, same as a placed box gets - rendered only while this chip is the selected one.
  // A selected chip takes a whole row of the wrapping tray rather than staying chip-sized, because
  // the form is a row of fields and squeezing it between two other chips would leave neither
  // readable.
  children?: React.ReactNode
}): JSX.Element {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef } = useDraggable({ id: area.id })
  return (
    <div
      ref={setNodeRef}
      className={`rounded-[6px] border border-dashed px-1.5 py-1 text-micro ${
        selected
          ? 'w-full border-blue-500 bg-blue-100 ring-2 ring-blue-500/40 dark:border-blue-400 dark:bg-blue-500/20'
          : 'border-blue-300 bg-blue-50/60 dark:border-blue-500/40 dark:bg-blue-500/10'
      } ${dragging ? 'opacity-30' : ''}`}
    >
      <div className="flex items-center gap-1">
        <ActivatorContext.Provider value={{ attributes, listeners, setActivatorNodeRef }}>
          <AreaDragHandle label={t('layoutEditor.frameBuilder.placeArea', { name: area.name })} />
        </ActivatorContext.Provider>
        <button type="button" onClick={onSelect} className="flex flex-col items-center gap-0.5 text-center">
          <span className="font-medium">{area.name}</span>
          <span className="text-text-muted">
            {area.slot ? t(`positions.${area.slot}`, area.slot) : t('layoutEditor.frameBuilder.slotNone')}
            {area.group ? ` · ${t('layoutEditor.frameBuilder.ownGroupShort')}` : ''}
            {hidden ? ` · ${t('layoutEditor.frameBuilder.hiddenShort')}` : ''}
          </span>
        </button>
      </div>
      {selected && children}
    </div>
  )
}

// One empty cell of the board. Its id carries its coordinates, since that is the only thing that
// identifies it; `isOver` replaces the dropCell state the native version had to keep by hand.
function DropCell({ row, col }: { row: number; col: number }): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: cellId(row, col) })
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[40px] rounded-[6px] border transition-colors ${
        isOver ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40' : 'border-dashed border-ink/15 bg-ink/[0.02] dark:border-ink/15 dark:bg-ink/[0.02]'
      }`}
      style={{ gridRow: `${row} / span 1`, gridColumn: `${col} / span 1` }}
    />
  )
}

// A placed area: a drop target of its own (dropping onto it means "this cell") and the container
// for the area's form. The box is not the drag activator - the handle inside it is - so a click
// anywhere on it still opens and closes the form.
function PlacedBox({
  areaId,
  placement,
  selected,
  dragging,
  label,
  onToggle,
  children
}: {
  areaId: string
  placement: GridAreaPlacement
  selected: boolean
  dragging: boolean
  label: string
  onToggle: () => void
  children: React.ReactNode
}): JSX.Element {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `${BOX_PREFIX}${areaId}` })
  const { attributes, listeners, setNodeRef: setDragRef, setActivatorNodeRef } = useDraggable({ id: areaId })
  return (
    <div
      ref={(node) => {
        setDropRef(node)
        setDragRef(node)
      }}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      className={`flex min-h-[48px] cursor-pointer flex-col gap-1.5 rounded-[6px] border p-2 text-micro ${
        selected
          ? 'border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-500/40 dark:border-blue-400 dark:bg-blue-500/10'
          : 'border-slate-300 bg-surface shadow-sm hover:border-blue-300 dark:border-ink/15 dark:bg-ink/[0.03] dark:hover:border-blue-500/30'
      } ${isOver ? 'ring-2 ring-blue-500' : ''} ${dragging ? 'opacity-30' : ''}`}
      style={{ gridRow: `${placement.row} / span ${placement.rowSpan}`, gridColumn: `${placement.col} / span ${placement.colSpan}` }}
    >
      <ActivatorContext.Provider value={{ attributes, listeners, setActivatorNodeRef }}>{children}</ActivatorContext.Provider>
    </div>
  )
}

// The one thing that drags, in both places. A real button: dnd-kit's keyboard sensor needs an
// activator that can take focus, and the attributes it hands over (tabIndex, role, the
// aria-describedby pointing at its instructions) belong on something that can.
function AreaDragHandle({ label }: { label: string }): JSX.Element {
  const activator = useContext(ActivatorContext)
  return (
    <button
      type="button"
      ref={activator?.setActivatorNodeRef}
      {...activator?.attributes}
      {...activator?.listeners}
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
      className="-ml-1 flex shrink-0 cursor-grab select-none items-center rounded-[6px] border border-ink/10 bg-ink/[0.03] p-0.5 text-text-muted transition-colors hover:border-ink/20 hover:bg-ink/[0.08] hover:text-text active:cursor-grabbing dark:bg-ink/[0.04]"
    >
      <GripVertical size={13} aria-hidden />
    </button>
  )
}
