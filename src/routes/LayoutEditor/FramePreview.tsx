import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FrameBreakpoint, FrameSlot, GridFrameDefinition, PluginEntry } from '@shared/ipc-contract'
import { FRAME_BREAKPOINTS, buildGridStyle } from '@shared/gridFrameCss'
import { Badge, SegmentedControl } from '../../components/ui'
import { buildPositionMap } from './utils'

// Read-only, truthful re-rendering of a frame: the same shared/gridFrameCss builders that produce
// the actual generated CSS drive this grid's inline style, and each visible area shows the real
// plugin names currently assigned to its slot (not a placeholder) - see FrameBuilder's "Vorschau"
// mode toggle for where this is mounted.
export default function FramePreview({ frame, plugins }: { frame: GridFrameDefinition; plugins: PluginEntry[] }): JSX.Element {
  const { t } = useTranslation()
  const [breakpoint, setBreakpoint] = useState<FrameBreakpoint>('desktop')
  const layout = frame.breakpoints[breakpoint]
  const style = buildGridStyle(layout, frame.areas)
  const positionMap = buildPositionMap(plugins)

  function componentNames(slot: FrameSlot): string[] {
    if (slot === 'pageBody') return [t('layoutEditor.frameBuilder.preview.pageContent')]
    return positionMap[slot].map((index) => plugins[index]?.name).filter((name): name is string => !!name)
  }

  const visibleAreas = frame.areas.filter((a) => {
    const p = layout.placements[a.id]
    return p && !p.hidden
  })
  const hiddenAreas = frame.areas.filter((a) => {
    const p = layout.placements[a.id]
    return !p || p.hidden
  })

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        value={breakpoint}
        onChange={setBreakpoint}
        options={FRAME_BREAKPOINTS.map((bp) => ({ value: bp, label: t(`layoutEditor.frameBuilder.breakpoint.${bp}`) }))}
      />

      {visibleAreas.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('layoutEditor.frameBuilder.preview.none')}</p>
      ) : (
        <div
          className="grid gap-1 rounded-[8px] border border-black/[0.06] bg-black/[0.015] p-2 dark:border-white/10 dark:bg-white/[0.02]"
          style={{
            gridTemplateColumns: style.gridTemplateColumns,
            gridTemplateRows: style.gridTemplateRows,
            gridTemplateAreas: style.gridTemplateAreas,
            rowGap: style.rowGap,
            columnGap: style.columnGap
          }}
        >
          {visibleAreas.map((area) => {
            const names = componentNames(area.slot)
            return (
              <div
                key={area.id}
                className="flex min-h-[64px] flex-col gap-1 rounded-[6px] border border-black/10 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
                style={{ gridArea: area.name }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[11px] font-medium">{area.name}</span>
                  <Badge>{t(`layoutEditor.positions.${area.slot}`, area.slot)}</Badge>
                </div>
                <div className="flex flex-col gap-1">
                  {names.length === 0 && <span className="text-[11px] text-slate-400">{t('layoutEditor.frameBuilder.preview.empty')}</span>}
                  {names.map((name) => (
                    <span
                      key={name}
                      className="truncate rounded-[4px] bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hiddenAreas.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('layoutEditor.frameBuilder.preview.hiddenLabel')}</span>
          {hiddenAreas.map((area) => (
            <span
              key={area.id}
              className="flex items-center gap-1 rounded-full border border-dashed border-black/10 bg-black/[0.02] px-2 py-0.5 text-[11px] text-slate-400 line-through dark:border-white/10 dark:bg-white/[0.02]"
            >
              {area.name}
              <Badge tone="amber">{t('layoutEditor.frameBuilder.preview.hidden')}</Badge>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
