import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FrameSlot, GridFrameArea, GridFrameDefinition } from '@shared/ipc-contract'
import { Button, Card, Field, Select, TextInput } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'

const RESERVED_FRAME_NAMES = ['default', 'full-width', 'minimal']
const SLOTS: FrameSlot[] = ['header', 'left', 'right', 'beforeBody', 'pageBody', 'afterBody', 'footer']

function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'frame'
  )
}

function emptyDraft(): GridFrameDefinition {
  return { id: `frame-${Date.now()}`, frameName: '', rows: 2, cols: 2, gap: '1rem', areas: [] }
}

function areaAt(areas: GridFrameArea[], row: number, col: number): GridFrameArea | undefined {
  return areas.find((a) => row >= a.row && row < a.row + a.rowSpan && col >= a.col && col < a.col + a.colSpan)
}

function overlaps(areas: GridFrameArea[], row: number, col: number, rowSpan: number, colSpan: number, excludeId?: string): boolean {
  for (let r = row; r < row + rowSpan; r++) {
    for (let c = col; c < col + colSpan; c++) {
      const hit = areaAt(areas, r, c)
      if (hit && hit.id !== excludeId) return true
    }
  }
  return false
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
  const [editing, setEditing] = useState<GridFrameDefinition | null>(null)
  const [isNewDraft, setIsNewDraft] = useState(false)
  const [pendingStart, setPendingStart] = useState<{ row: number; col: number } | null>(null)
  const [pendingRect, setPendingRect] = useState<{ row: number; col: number; rowSpan: number; colSpan: number } | null>(null)
  const [areaForm, setAreaForm] = useState<{ name: string; slot: FrameSlot } | null>(null)
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function refresh(): void {
    window.quartzGui.layoutFrames.list(projectPath).then(setFrames)
  }

  useEffect(() => {
    refresh()
  }, [projectPath])

  function startNewFrame(): void {
    setEditing(emptyDraft())
    setIsNewDraft(true)
    setMessage(null)
  }

  function startEditFrame(def: GridFrameDefinition): void {
    setEditing(def)
    setIsNewDraft(false)
    setMessage(null)
  }

  function closeEditor(): void {
    setEditing(null)
    setPendingStart(null)
    setPendingRect(null)
    setAreaForm(null)
    setEditingAreaId(null)
  }

  function nameCollision(def: GridFrameDefinition): boolean {
    if (RESERVED_FRAME_NAMES.includes(def.frameName)) return true
    return (frames ?? []).some((f) => f.id !== def.id && f.frameName === def.frameName)
  }

  function handleCellClick(row: number, col: number): void {
    if (!editing) return
    const existing = areaAt(editing.areas, row, col)
    if (existing) {
      setPendingStart(null)
      setPendingRect(null)
      setEditingAreaId(existing.id)
      setAreaForm({ name: existing.name, slot: existing.slot })
      return
    }
    if (!pendingStart) {
      setPendingStart({ row, col })
      return
    }
    const rowSpan = Math.abs(row - pendingStart.row) + 1
    const colSpan = Math.abs(col - pendingStart.col) + 1
    const rect = { row: Math.min(row, pendingStart.row), col: Math.min(col, pendingStart.col), rowSpan, colSpan }
    setPendingStart(null)
    if (overlaps(editing.areas, rect.row, rect.col, rect.rowSpan, rect.colSpan)) {
      setMessage(t('layoutEditor.frameBuilder.overlapError'))
      return
    }
    setPendingRect(rect)
    setEditingAreaId(null)
    setAreaForm({ name: '', slot: 'left' })
  }

  function confirmArea(): void {
    if (!editing || !areaForm) return
    const name = slugify(areaForm.name)
    if (editingAreaId) {
      setEditing({
        ...editing,
        areas: editing.areas.map((a) => (a.id === editingAreaId ? { ...a, name, slot: areaForm.slot } : a))
      })
    } else if (pendingRect) {
      const newArea: GridFrameArea = { id: `area-${Date.now()}`, name, slot: areaForm.slot, ...pendingRect }
      setEditing({ ...editing, areas: [...editing.areas, newArea] })
    }
    setPendingRect(null)
    setEditingAreaId(null)
    setAreaForm(null)
  }

  function deleteArea(): void {
    if (!editing || !editingAreaId) return
    setEditing({ ...editing, areas: editing.areas.filter((a) => a.id !== editingAreaId) })
    setEditingAreaId(null)
    setAreaForm(null)
  }

  function cancelAreaForm(): void {
    setPendingRect(null)
    setEditingAreaId(null)
    setAreaForm(null)
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
        setMessage(result.output)
        return
      }
      refresh()
      onFramesChanged()
      closeEditor()
    } catch (err) {
      // e.g. an area name the validation layer refuses because it would break the generated CSS
      setMessage(formatIpcError(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove(def: GridFrameDefinition): Promise<void> {
    if (!confirm(t('layoutEditor.frameBuilder.deleteConfirm', { name: def.frameName }))) return
    const result = await window.quartzGui.layoutFrames.delete(projectPath, def.id)
    setMessage(result.success ? null : result.output)
    refresh()
    onFramesChanged()
    if (editing?.id === def.id) closeEditor()
  }

  const usedSlots = new Set((editing?.areas ?? []).map((a) => a.slot))
  const unassignedSlots = SLOTS.filter((s) => s !== 'pageBody' && !usedSlots.has(s))

  if (!frames) return <p className="text-sm text-slate-500">{t('layoutEditor.loading')}</p>

  if (!editing) {
    return (
      <div className="flex flex-col gap-4">
        {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('layoutEditor.frameBuilder.description')}</p>
          <Button onClick={startNewFrame}>{t('layoutEditor.frameBuilder.newFrame')}</Button>
        </div>
        {frames.length === 0 && <p className="text-sm text-slate-500">{t('layoutEditor.frameBuilder.none')}</p>}
        <div className="flex flex-col gap-2">
          {frames.map((def) => (
            <Card key={def.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{def.frameName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('layoutEditor.frameBuilder.gridSummary', { rows: def.rows, cols: def.cols, areas: def.areas.length })}
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

  return (
    <div className="flex flex-col gap-4">
      {message && <p className="text-sm text-red-600 dark:text-red-400">{message}</p>}
      <Card>
        <div className="mb-3 grid grid-cols-4 gap-3">
          <Field label={t('layoutEditor.frameBuilder.frameName')}>
            <TextInput
              value={editing.frameName}
              onChange={(e) => setEditing({ ...editing, frameName: e.target.value })}
              placeholder={t('layoutEditor.templateCustomPlaceholder')}
            />
          </Field>
          <Field label={t('layoutEditor.frameBuilder.rows')}>
            <TextInput
              type="number"
              min={1}
              max={12}
              value={editing.rows}
              onChange={(e) => setEditing({ ...editing, rows: Math.max(1, Number(e.target.value) || 1) })}
            />
          </Field>
          <Field label={t('layoutEditor.frameBuilder.cols')}>
            <TextInput
              type="number"
              min={1}
              max={12}
              value={editing.cols}
              onChange={(e) => setEditing({ ...editing, cols: Math.max(1, Number(e.target.value) || 1) })}
            />
          </Field>
          <Field label={t('layoutEditor.frameBuilder.gap')}>
            <TextInput value={editing.gap} onChange={(e) => setEditing({ ...editing, gap: e.target.value })} />
          </Field>
        </div>

        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
          {pendingStart ? t('layoutEditor.frameBuilder.hintFinishSelection') : t('layoutEditor.frameBuilder.hintStartSelection')}
        </p>

        <div
          className="relative grid gap-1"
          style={{ gridTemplateColumns: `repeat(${editing.cols}, minmax(64px, 1fr))`, gridTemplateRows: `repeat(${editing.rows}, 48px)` }}
        >
          {Array.from({ length: editing.rows }, (_, r) =>
            Array.from({ length: editing.cols }, (_, c) => {
              const row = r + 1
              const col = c + 1
              const isPendingStart = pendingStart?.row === row && pendingStart?.col === col
              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  onClick={() => handleCellClick(row, col)}
                  className={`rounded-[6px] border text-[11px] ${
                    isPendingStart
                      ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40'
                      : 'border-dashed border-black/15 bg-black/[0.02] hover:bg-black/[0.05] dark:border-white/15 dark:bg-white/[0.02]'
                  }`}
                />
              )
            })
          )}
          {editing.areas.map((area) => (
            <button
              key={area.id}
              type="button"
              onClick={() => handleCellClick(area.row, area.col)}
              className="z-10 flex flex-col items-center justify-center gap-0.5 rounded-[6px] border border-blue-400 bg-blue-50 px-1 text-center text-[11px] shadow-sm dark:border-blue-500/50 dark:bg-blue-500/10"
              style={{ gridRow: `${area.row} / span ${area.rowSpan}`, gridColumn: `${area.col} / span ${area.colSpan}` }}
            >
              <span className="font-medium">{area.name}</span>
              <span className="text-slate-500 dark:text-slate-400">{t(`layoutEditor.positions.${area.slot}`, area.slot)}</span>
            </button>
          ))}
        </div>

        {areaForm && (
          <div className="mt-4 flex items-end gap-2 rounded-[8px] border border-black/10 p-3 dark:border-white/10">
            <Field label={t('layoutEditor.frameBuilder.areaName')}>
              <TextInput value={areaForm.name} onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })} />
            </Field>
            <Field label={t('layoutEditor.frameBuilder.areaSlot')}>
              <Select value={areaForm.slot} onChange={(e) => setAreaForm({ ...areaForm, slot: e.target.value as FrameSlot })}>
                {SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {t(`layoutEditor.positions.${slot}`, slot)}
                  </option>
                ))}
              </Select>
            </Field>
            <Button onClick={confirmArea} disabled={!areaForm.name.trim()}>
              {editingAreaId ? t('common.save') : t('layoutEditor.frameBuilder.addArea')}
            </Button>
            {editingAreaId && (
              <Button variant="danger" onClick={deleteArea}>
                {t('layoutEditor.frameBuilder.removeArea')}
              </Button>
            )}
            <Button variant="ghost" onClick={cancelAreaForm}>
              {t('common.cancel')}
            </Button>
          </div>
        )}

        {unassignedSlots.length > 0 && (
          <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
            {t('layoutEditor.frameBuilder.unassignedWarning', {
              slots: unassignedSlots.map((s) => t(`layoutEditor.positions.${s}`, s)).join(', ')
            })}
          </p>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={closeEditor}>
          {t('common.cancel')}
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
