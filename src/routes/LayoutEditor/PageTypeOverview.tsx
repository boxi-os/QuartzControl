import { useTranslation } from 'react-i18next'
import { Table2 } from 'lucide-react'
import type { GridFrameDefinition, LayoutPosition, QuartzConfig } from '@shared/ipc-contract'
import { FRAME_BREAKPOINTS } from '@shared/gridFrameCss'
import { Card, CardHeading, InfoNote } from '../../components/ui'
import {
  BUILTIN_FRAME_LAYOUT,
  POSITIONS,
  buildBoardPositionMap,
  derivePageTypes,
  duplicateNameCounts,
  duplicateRanks,
  parkedIndices
} from './utils'
import { isExcluded, isPositionCleared, overrideOf, resolvedFrame } from './pageTypeOverride'

/**
 * The "Übersicht" tab: every page type in one table - which frame it is built in, and per
 * position what it does differently from "Alle Seiten". It answers the question the stage cannot
 * answer at a glance, because the stage shows one page type at a time: how the three levels
 * relate. Components are placed once, for all pages; a page type picks a frame and may hide
 * components or clear a position; a frame decides which positions have an area at all.
 *
 * Each row's cells say only what differs, so a row that reads "wie alle" throughout is a page type
 * that customizes nothing. Every name is the way to where it is changed: a page type and its
 * components open the stage, a frame the frame editor.
 */

/**
 * Which positions a frame builds, or null when the app cannot know (a page type plugin's own
 * frame). An authored frame counts a position when some breakpoint places an area of it; a name
 * that is no frame at all is rendered by quartz with the default frame (resolveFrame).
 */
function framePositions(
  name: string,
  frames: GridFrameDefinition[],
  pluginFrames: Set<string>
): Set<LayoutPosition> | null {
  const authored = name !== 'default' ? frames.find((f) => f.frameName === name) : undefined
  if (authored) {
    const slots = new Set<LayoutPosition>()
    for (const bp of FRAME_BREAKPOINTS) {
      const placements = authored.breakpoints[bp].placements
      for (const area of authored.areas) {
        const p = placements[area.id]
        if (p && !p.hidden && area.slot && area.slot !== 'pageBody') slots.add(area.slot as LayoutPosition)
      }
    }
    return slots
  }
  if (name in BUILTIN_FRAME_LAYOUT) return new Set(BUILTIN_FRAME_LAYOUT[name as 'full-width' | 'minimal'].visibleSlots)
  if (pluginFrames.has(name)) return null
  return new Set(POSITIONS)
}

export default function PageTypeOverview({
  config,
  frames,
  builtinPageTypeFrames,
  onOpenPageType,
  onOpenFrame
}: {
  config: QuartzConfig
  frames: GridFrameDefinition[]
  builtinPageTypeFrames: Record<string, string>
  /** The stage on this page type (null: all pages), optionally with this component selected. */
  onOpenPageType: (pageType: string | null, componentIndex?: number) => void
  /** The frame editor on this frame - an own frame's name, or "default" for Quartz's. */
  onOpenFrame: (frameName: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const parked = parkedIndices(config.plugins)
  const positions = buildBoardPositionMap(config.plugins, parked)
  const pageTypes = derivePageTypes(config)
  const nameCounts = duplicateNameCounts(config.plugins)
  const ranks = duplicateRanks(config.plugins)
  const pluginFrames = new Set(Object.values(builtinPageTypeFrames))
  const authoredNames = new Set(frames.map((f) => f.frameName))

  const componentLabel = (i: number): string =>
    (nameCounts.get(config.plugins[i].name) ?? 0) > 1 ? `${config.plugins[i].name} #${ranks.get(i) ?? 1}` : config.plugins[i].name
  const positionName = (p: LayoutPosition): string => t(`positions.${p}`, p)
  const pageTypeName = (pt: string): string => t(`layoutEditor.pageTypes.${pt}`, pt)
  const frameName = (name: string): string =>
    name === 'default'
      ? t('layoutEditor.templateDefault')
      : name === 'full-width'
        ? t('layoutEditor.templateFullWidth')
        : name === 'minimal'
          ? t('layoutEditor.templateMinimal')
          : name

  const link = 'text-left underline-offset-2 hover:underline'

  function frameCell(pageType: string): JSX.Element {
    const choice = resolvedFrame(config, pageType, builtinPageTypeFrames)
    // Only the frames the editor can open are links: an own one, and Quartz's standard frame.
    const openable = choice.name === 'default' || authoredNames.has(choice.name)
    return (
      <div className="flex flex-col">
        {openable ? (
          <button type="button" className={`${link} font-medium`} onClick={() => onOpenFrame(choice.name)}>
            {frameName(choice.name)}
          </button>
        ) : (
          <span className="font-medium">{frameName(choice.name)}</span>
        )}
        <span className="text-micro text-text-muted">{t(`layoutEditor.overview.frameFrom.${choice.from}`)}</span>
      </div>
    )
  }

  function deviationCell(pageType: string, position: LayoutPosition): JSX.Element {
    const indices = positions[position] ?? []
    const override = overrideOf(config, pageType)
    const built = framePositions(resolvedFrame(config, pageType, builtinPageTypeFrames).name, frames, pluginFrames)
    if (indices.length === 0) return <span className="text-text-muted">—</span>
    if (built === null) return <span className="text-text-muted">{t('layoutEditor.overview.unknown')}</span>
    if (!built.has(position)) return <span className="text-amber-600 dark:text-amber-400">{t('layoutEditor.overview.notInFrame')}</span>
    if (isPositionCleared(override, position)) return <span className="font-medium">{t('layoutEditor.overview.cleared')}</span>
    const hidden = indices.filter((i) => isExcluded(override, config.plugins[i]))
    if (hidden.length === 0) return <span className="text-text-muted">{t('layoutEditor.overview.same')}</span>
    return (
      <span className="flex flex-col">
        <span className="text-micro text-text-secondary">{t('layoutEditor.overview.without')}</span>
        {hidden.map((i) => (
          <button key={i} type="button" className={`${link} line-through`} onClick={() => onOpenPageType(pageType, i)}>
            {componentLabel(i)}
          </button>
        ))}
      </span>
    )
  }

  const cell = 'border-t border-ink/[0.06] px-2 py-2 align-top dark:border-ink/10'
  const head = 'px-2 pb-2 text-left text-micro font-semibold uppercase tracking-wide text-text-secondary'

  return (
    <div className="flex flex-col gap-4">
      <InfoNote>{t('layoutEditor.overview.intro')}</InfoNote>
      <Card className="flex flex-col gap-3">
        <CardHeading icon={Table2}>{t('layoutEditor.overview.title')}</CardHeading>
        {/* Its own scroller: eight columns of names do not fit every window, and the page must not
            scroll sideways for them. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-ui">
            <thead>
              <tr>
                <th scope="col" className={head}>
                  {t('layoutEditor.pageType.label')}
                </th>
                <th scope="col" className={head}>
                  {t('layoutEditor.summary.frame')}
                </th>
                {POSITIONS.map((p) => (
                  <th key={p} scope="col" className={head}>
                    {positionName(p)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* The row every page type starts from: what is placed, by name. */}
              <tr className="bg-ink/[0.02]">
                <th scope="row" className={`${cell} text-left`}>
                  <button type="button" className={`${link} font-medium`} onClick={() => onOpenPageType(null)}>
                    {t('layoutEditor.pageType.all')}
                  </button>
                </th>
                <td className={`${cell} text-text-muted`}>{t('layoutEditor.overview.framePerType')}</td>
                {POSITIONS.map((p) => (
                  <td key={p} className={cell}>
                    {(positions[p] ?? []).length === 0 ? (
                      <span className="text-text-muted">—</span>
                    ) : (
                      <span className="flex flex-col">
                        {positions[p].map((i) => (
                          <button key={i} type="button" className={link} onClick={() => onOpenPageType(null, i)}>
                            {componentLabel(i)}
                          </button>
                        ))}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              {pageTypes.map((pt) => (
                <tr key={pt}>
                  <th scope="row" className={`${cell} text-left`}>
                    <button type="button" className={`${link} font-medium`} onClick={() => onOpenPageType(pt)}>
                      {pageTypeName(pt)}
                    </button>
                  </th>
                  <td className={cell}>{frameCell(pt)}</td>
                  {POSITIONS.map((p) => (
                    <td key={p} className={cell}>
                      {deviationCell(pt, p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parked.size > 0 && <p className="text-micro text-text-muted">{t('layoutEditor.summary.parked', { count: parked.size })}</p>}
      </Card>
    </div>
  )
}
