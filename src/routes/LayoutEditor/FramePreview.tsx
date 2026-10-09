import { useTranslation } from 'react-i18next'
import type { FrameBreakpoint, GridFrameDefinition } from '@shared/ipc-contract'
import { buildGridStyle } from '@shared/gridFrameCss'
import { STAGE_REFERENCE_WIDTH, stageFrame } from './stageGeometry'

/**
 * A frame drawn and not edited: the Frames tab's picture of Quartz's standard frame, which is no
 * file of this project and so has nothing to drag, resize or save. Drawn by the same geometry as
 * the editor's board (stageFrame), so "Als eigenen Frame anpassen" opens the picture it showed.
 */
export default function FramePreview({ frame, breakpoint }: { frame: GridFrameDefinition; breakpoint: FrameBreakpoint }): JSX.Element {
  const { t } = useTranslation()
  const layout = frame.breakpoints[breakpoint]
  const grid = buildGridStyle(layout, frame.areas)
  const stage = stageFrame(layout, breakpoint)
  return (
    <div className="mx-auto w-full" style={{ maxWidth: STAGE_REFERENCE_WIDTH[breakpoint], containerType: 'inline-size' }}>
      <div
        className="grid rounded-[8px] border border-dashed border-blue-400/50 dark:border-blue-400/40"
        style={{
          gridTemplateColumns: stage.gridTemplateColumns,
          gridTemplateRows: grid.gridTemplateRows,
          // The frame's 5px read as no gap at all at stage scale; the editor's board does the same
          // with its `gap-1` floor.
          rowGap: `max(${stage.rowGap}, 4px)`,
          columnGap: `max(${stage.columnGap}, 4px)`,
          width: stage.width,
          marginInline: stage.marginInline,
          paddingBlock: stage.paddingBlock,
          paddingInline: stage.paddingInline
        }}
      >
        {frame.areas.map((area) => {
          const p = layout.placements[area.id]
          if (!p || p.hidden) return null
          return (
            <div
              key={area.id}
              className={`flex min-w-0 flex-col gap-1 rounded-[6px] border border-ink/10 bg-surface px-2 py-1.5 text-micro ${
                area.slot === 'pageBody' ? 'min-h-[7rem]' : 'min-h-[2.75rem]'
              }`}
              style={{ gridRow: `${p.row} / span ${p.rowSpan}`, gridColumn: `${p.col} / span ${p.colSpan}` }}
            >
              <span className="truncate font-medium text-text">
                {area.slot ? t(`positions.${area.slot}`, area.slot) : area.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
