import { useTranslation } from 'react-i18next'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { PluginEntry } from '@shared/ipc-contract'
import { PaletteChip } from './ComponentChip'
import { distinctComponentChips } from './utils'

// A palette chip's drag id is namespaced so handleDragEnd can tell "create a new instance here" (or
// "switch the parked one back on here") apart from "move this existing instance here" without a
// second DnD implementation.
export const PALETTE_PREFIX = 'palette:'

// Dropping a placed instance back onto the palette removes a duplicate and switches a sole instance
// off - the reverse of dragging a palette chip out. Fixed id, distinct from any LayoutPosition or
// plugin index string.
export const PALETTE_DROP_ID = 'palette-drop-zone'

/**
 * The component tray: one draggable chip per component name in the config. Dropping a chip onto
 * the board inserts another instance there - or, for a component whose only instance is switched
 * off and therefore lies here (`parked`), switches that instance back on at the drop. The same
 * area is a drop target: a placed duplicate dropped here is removed, a sole instance switched off.
 * `dropHint` is what such a drop would do for the thing being dragged right now, so the zone can
 * say it before the user lets go.
 */
export function ComponentPalette({
  plugins,
  parked,
  activePaletteSource,
  dropHint
}: {
  plugins: PluginEntry[]
  parked: Set<number>
  activePaletteSource: boolean
  dropHint: 'remove' | 'disable' | null
}): JSX.Element {
  const { t } = useTranslation()
  const chips = distinctComponentChips(plugins)
  const { setNodeRef, isOver } = useDroppable({ id: PALETTE_DROP_ID })

  return (
    // The droppable hit area covers this whole block (label + chips + hint), not just the chip
    // box - a component dragged back from elsewhere on the board only needs to land generally in
    // this region, not thread a needle into the narrower box below.
    <div ref={setNodeRef} className="flex flex-col gap-1.5">
      <p className="text-micro font-medium text-text-muted">
        {dropHint === 'remove'
          ? t('layoutEditor.componentPill.paletteDropToRemove')
          : dropHint === 'disable'
            ? t('layoutEditor.componentPill.paletteDropToDisable')
            : t('layoutEditor.componentPill.paletteLabel')}
      </p>
      <div
        className={`flex flex-wrap gap-1.5 rounded-[8px] border border-dashed p-2 transition-colors ${
          dropHint && isOver
            ? 'border-red-400 bg-red-50/50 dark:border-red-500/40 dark:bg-red-500/5'
            : activePaletteSource
              ? 'border-blue-400 bg-blue-50/50 dark:border-blue-500/40 dark:bg-blue-500/5'
              : 'border-ink/[0.08] dark:border-ink/10'
        }`}
      >
        {chips.map(({ index, plugin }) => (
          <DraggablePaletteChip key={index} index={index} plugin={plugin} off={parked.has(index)} />
        ))}
      </div>
      <p className="text-micro text-text-muted">{t('layoutEditor.componentPill.paletteHint')}</p>
    </div>
  )
}

function DraggablePaletteChip({ index, plugin, off }: { index: number; plugin: PluginEntry; off: boolean }): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `${PALETTE_PREFIX}${index}` })
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-board-focus={`palette:${index}`}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={isDragging ? 'opacity-30' : ''}
    >
      <PaletteChip plugin={plugin} off={off} />
    </div>
  )
}
