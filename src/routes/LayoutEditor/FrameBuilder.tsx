import { useEffect, useState } from 'react'
import type { DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
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
import { useStickyState } from '../../state/uiState'

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

// dataTransfer carries a bare area id across a native HTML5 drag - repositioning that area onto
// whichever cell it's dropped on. See handleDrop.
const DRAG_MIME = 'text/plain'

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
  const [dropCell, setDropCell] = useState<{ row: number; col: number } | null>(null)
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
    endDrag()
  }

  function nameCollision(def: GridFrameDefinition): boolean {
    if (RESERVED_FRAME_NAMES.includes(def.frameName)) return true
    return (frames ?? []).some((f) => f.id !== def.id && f.frameName === def.frameName)
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
      setMessage(t('layoutEditor.frameBuilder.overlapError'))
      return
    }
    setEditing((prev) => (prev ? withPlacement(prev, activeBreakpoint, areaId, { row, col, rowSpan, colSpan, hidden: false }) : prev))
    setSelectedAreaId(areaId)
    setMessage(null)
  }

  function beginDrag(e: DragEvent<HTMLElement>, areaId: string): void {
    e.dataTransfer.setData(DRAG_MIME, areaId)
    e.dataTransfer.effectAllowed = 'move'
    setDragAreaId(areaId)
  }

  function endDrag(): void {
    setDragAreaId(null)
    setDropCell(null)
  }

  // Created immediately (not as a buffered draft) so it's live the moment it exists: it shows up
  // in the "available areas" tray right away and is pre-selected, ready to rename/place.
  function addNewArea(): void {
    if (!editing) return
    const id = `area-${Date.now()}`
    const newArea: GridFrameArea = { id, name: `custom-${editing.areas.length + 1}`, slot: 'left' }
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
    setEditing({ ...editing, areas: editing.areas.map((a) => (a.id === id ? { ...a, name } : a)) })
  }

  function updateAreaSlot(id: string, slot: FrameSlot): void {
    if (!editing) return
    setEditing({ ...editing, areas: editing.areas.map((a) => (a.id === id ? { ...a, slot } : a)) })
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

  if (!frames) return <p className="text-sm text-slate-500 dark:text-slate-400">{t('layoutEditor.loading')}</p>

  if (!editing) {
    return (
      <div className="flex flex-col gap-4">
        {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}
        {/* The whole app says "Frame" and no screen said what one is. It belongs here, on the
            list that is the first thing anyone opens who wants to build one. */}
        <InfoNote>{t('layoutEditor.frameBuilder.whatIsAFrame')}</InfoNote>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('layoutEditor.frameBuilder.description')}</p>
          <Button onClick={startNewFrame}>{t('layoutEditor.frameBuilder.newFrame')}</Button>
        </div>
        {frames.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{t('layoutEditor.frameBuilder.none')}</p>}
        <div className="flex flex-col gap-2">
          {frames.map((def) => (
            <Card key={def.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{def.frameName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
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
  const usedSlots = new Set(
    editing.areas.filter((a) => {
      const p = layout.placements[a.id]
      return p && !p.hidden
    }).map((a) => a.slot)
  )
  const unassignedSlots = SLOTS.filter((s) => s !== 'pageBody' && !usedSlots.has(s))
  const unplacedAreas = editing.areas.filter((a) => {
    const p = layout.placements[a.id]
    return !p || p.hidden
  })
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

      <SegmentedControl value={activeBreakpoint} onChange={setActiveBreakpoint} options={breakpointOptions} />

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
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
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
                className="text-[11px] text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
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
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t('layoutEditor.frameBuilder.availableAreasLabel')}</p>
          <Button variant="ghost" onClick={addNewArea}>
            {t('layoutEditor.frameBuilder.newArea')}
          </Button>
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault()
          }}
          onDrop={(e) => {
            e.preventDefault()
            const areaId = e.dataTransfer.getData(DRAG_MIME)
            endDrag()
            if (areaId) {
              unplaceAreaById(areaId)
              setSelectedAreaId(areaId)
            }
          }}
          className={`mb-3 flex min-h-[44px] flex-wrap items-center gap-2 rounded-[8px] border border-dashed p-2 transition-colors ${
            dragAreaId ? 'border-blue-400 bg-blue-50/50 dark:border-blue-500/40 dark:bg-blue-500/5' : 'border-transparent'
          }`}
        >
          {unplacedAreas.length === 0 && <span className="px-1 text-[11px] text-slate-500 dark:text-slate-400">{t('layoutEditor.frameBuilder.allPlaced')}</span>}
          {unplacedAreas.map((a) => {
            const isSelected = selectedAreaId === a.id
            return (
              <div
                key={a.id}
                role="button"
                tabIndex={0}
                draggable
                onDragStart={(e) => beginDrag(e, a.id)}
                onDragEnd={endDrag}
                onClick={() => setSelectedAreaId(a.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedAreaId(a.id)
                  }
                }}
                className={`flex cursor-grab flex-col items-center justify-center gap-0.5 rounded-[6px] border border-dashed px-2.5 py-1.5 text-center text-[11px] active:cursor-grabbing ${
                  isSelected
                    ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-500/40 dark:border-blue-400 dark:bg-blue-500/20'
                    : 'border-blue-300 bg-blue-50/60 dark:border-blue-500/40 dark:bg-blue-500/10'
                } ${dragAreaId === a.id ? 'opacity-30' : ''}`}
              >
                <span className="font-medium">{a.name}</span>
                <span className="text-slate-500 dark:text-slate-400">{t(`positions.${a.slot}`, a.slot)}</span>
              </div>
            )
          })}
        </div>

        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t('layoutEditor.frameBuilder.hintDragToPlace')}</p>

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
            Array.from({ length: layout.cols }, (_, c) => {
              const row = r + 1
              const col = c + 1
              const isDropTarget = dropCell?.row === row && dropCell?.col === col
              return (
                <div
                  key={`${row}-${col}`}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDropCell({ row, col })
                  }}
                  onDragLeave={() => setDropCell((c) => (c?.row === row && c?.col === col ? null : c))}
                  onDrop={(e) => {
                    e.preventDefault()
                    const areaId = e.dataTransfer.getData(DRAG_MIME)
                    if (areaId) handleDrop(areaId, row, col)
                    endDrag()
                  }}
                  className={`min-h-[40px] rounded-[6px] border transition-colors ${
                    isDropTarget
                      ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40'
                      : 'border-dashed border-black/15 bg-black/[0.02] dark:border-white/15 dark:bg-white/[0.02]'
                  }`}
                  style={{ gridRow: `${row} / span 1`, gridColumn: `${col} / span 1` }}
                />
              )
            })
          )}
          {editing.areas.map((area) => {
            const placement = layout.placements[area.id]
            if (!placement || placement.hidden) return null
            const isSelected = selectedAreaId === area.id
            return (
              <div
                key={area.id}
                role="button"
                tabIndex={0}
                aria-label={t('layoutEditor.frameBuilder.expandArea')}
                onClick={() => setSelectedAreaId(isSelected ? null : area.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedAreaId(isSelected ? null : area.id)
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDropCell({ row: placement.row, col: placement.col })
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const areaId = e.dataTransfer.getData(DRAG_MIME)
                  if (areaId) handleDrop(areaId, placement.row, placement.col)
                  endDrag()
                }}
                className={`flex min-h-[48px] cursor-pointer flex-col gap-1.5 rounded-[6px] border p-2 text-[11px] ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-500/40 dark:border-blue-400 dark:bg-blue-500/10'
                    : 'border-slate-300 bg-white shadow-sm hover:border-blue-300 dark:border-white/15 dark:bg-white/[0.03] dark:hover:border-blue-500/30'
                }`}
                style={{ gridRow: `${placement.row} / span ${placement.rowSpan}`, gridColumn: `${placement.col} / span ${placement.colSpan}` }}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      draggable
                      onDragStart={(e) => beginDrag(e, area.id)}
                      onDragEnd={endDrag}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={t('layoutEditor.componentPill.dragHandle')}
                      className="-ml-1 flex shrink-0 cursor-grab select-none items-center rounded-[6px] border border-black/10 bg-black/[0.03] p-0.5 text-slate-500 transition-colors hover:border-black/20 hover:bg-black/[0.08] hover:text-slate-700 active:cursor-grabbing dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
                    >
                      <GripVertical size={13} />
                    </span>
                    <span className="truncate font-medium">{area.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge>{t(`positions.${area.slot}`, area.slot)}</Badge>
                    <span aria-hidden="true" className="rounded-[4px] p-0.5 text-slate-500 dark:text-slate-400">
                      {isSelected ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex flex-wrap items-end gap-2 border-t border-black/[0.06] pt-2 dark:border-white/10"
                  >
                    <Field label={t('layoutEditor.frameBuilder.areaName')}>
                      <TextInput value={nameDraft} onChange={(e) => updateAreaName(area.id, e.target.value)} autoFocus className="w-32" />
                    </Field>
                    <Field label={t('layoutEditor.frameBuilder.areaSlot')}>
                      <Select value={area.slot} onChange={(e) => updateAreaSlot(area.id, e.target.value as FrameSlot)} className="w-32">
                        {SLOTS.map((slot) => (
                          <option key={slot} value={slot}>
                            {t(`positions.${slot}`, slot)}
                          </option>
                        ))}
                      </Select>
                    </Field>
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
                    <Button variant="danger" onClick={() => deleteAreaById(area.id)}>
                      {t('layoutEditor.frameBuilder.removeArea')}
                    </Button>
                  </div>
                )}

                {area.slot === 'pageBody' && (
                  <div className="rounded-[4px] border border-dashed border-black/10 px-2 py-3 text-center text-slate-500 dark:text-slate-400 dark:border-white/10">
                    {t('layoutEditor.frameBuilder.preview.pageContent')}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {unassignedSlots.length > 0 && (
          <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
            {t('layoutEditor.frameBuilder.unassignedWarning', {
              slots: unassignedSlots.map((s) => t(`positions.${s}`, s)).join(', ')
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
      <p className="mb-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: count }, (_, i) => (
          <label key={i} className="flex flex-col items-center gap-0.5">
            <TextInput
              value={valueAt(i)}
              placeholder={placeholder}
              onChange={(e) => onChange(i, e.target.value)}
              className="w-16 text-center"
            />
            <span className="text-[10px] text-slate-500 dark:text-slate-400">{i + firstIndex}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

