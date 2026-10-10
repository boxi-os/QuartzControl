import { useTranslation } from 'react-i18next'
import { LayoutDashboard } from 'lucide-react'
import type { GridFrameDefinition, LayoutPosition, QuartzConfig } from '@shared/ipc-contract'
import { Card, CardHeading } from '../../components/ui'
import { ComponentPill, groupColor } from './ComponentChip'
import { POSITIONS, getLayout } from './utils'

/**
 * The layout board's side panel while nothing is selected: what the page the stage shows is made
 * of - which frame it is built in and where that choice comes from, and per position which
 * components appear, which this page type hides, and which are off. Per position as in the layout
 * overview: the ungrouped components, then each group under its own area or flex group, as the
 * same pills in the same colors. The stage says the same
 * by drawing it; this is the list to read it from, and each name is the way into its settings.
 *
 * It answers for the page type, not for the view: a component that is "Nur Desktop" is on this
 * page type and says so as a mark, because switching the view is not a setting of the page type.
 */
export default function LayoutSummary({
  config,
  positions,
  parked,
  pageTypeLabel,
  frameLabel,
  frameFrom,
  missingSlots,
  pageTypeHidden,
  componentLabel,
  frame,
  groupNames,
  onSelect
}: {
  config: QuartzConfig
  positions: Record<LayoutPosition, number[]>
  parked: Set<number>
  /** null: the stage shows all pages (no page type of its own). */
  pageTypeLabel: string | null
  frameLabel: string
  frameFrom: 'override' | 'plugin' | 'default'
  /** Positions the frame has no area for: what is placed there is built nowhere. */
  missingSlots: LayoutPosition[]
  /** Why the shown page type does not carry this component (excluded, or its position cleared). */
  pageTypeHidden: (index: number) => string | undefined
  componentLabel: (index: number) => string
  /** The own frame the stage is drawn in, for its group areas; null for a built-in or plugin one. */
  frame: GridFrameDefinition | null
  groupNames: string[]
  onSelect: (index: number) => void
}): JSX.Element {
  const { t } = useTranslation()
  const positionName = (p: LayoutPosition): string => t(`positions.${p}`, p)
  const missing = new Set(missingSlots)
  const groupOf = (i: number): string | undefined => getLayout(config.plugins[i])?.group
  const ungroupedOf = (indices: number[]): number[] => indices.filter((i) => !groupOf(i))
  // In the order of groupNames, the order their colors come from - the overview's order too.
  const groupsOf = (indices: number[]): string[] => groupNames.filter((g) => indices.some((i) => groupOf(i) === g))
  // One reason for every component of a position - a position cleared on this page type - is said
  // once under its heading, not after each pill.
  const sharedReason = (indices: number[]): string | undefined => {
    const reasons = new Set(indices.map(pageTypeHidden))
    return reasons.size === 1 ? [...reasons][0] : undefined
  }
  const pill = (index: number, reasonSaid = false): JSX.Element => {
    const hidden = pageTypeHidden(index)
    const body = (
      <ComponentPill
        key={index}
        plugin={config.plugins[index]}
        label={componentLabel(index)}
        groupNames={groupNames}
        struckReason={hidden}
        onClick={() => onSelect(index)}
      />
    )
    // The reason stays readable next to the struck pill; the pill already says it to a screen reader.
    return hidden && !reasonSaid ? (
      <span key={index} className="inline-flex max-w-full items-center gap-1.5">
        {body}
        <span aria-hidden className="text-micro text-text-muted">
          {hidden}
        </span>
      </span>
    ) : (
      body
    )
  }

  return (
    <Card className="flex flex-col gap-3">
      <CardHeading icon={LayoutDashboard}>{t('layoutEditor.summary.title')}</CardHeading>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-ui">
        <dt className="text-text-secondary">{t('layoutEditor.pageType.label')}</dt>
        <dd className="min-w-0 break-words">{pageTypeLabel ?? t('layoutEditor.pageType.all')}</dd>
        <dt className="text-text-secondary">{t('layoutEditor.summary.frame')}</dt>
        <dd className="min-w-0 break-words">
          {frameLabel}
          <span className="block text-micro text-text-muted">
            {pageTypeLabel === null ? t('layoutEditor.summary.frameAllPages') : t(`layoutEditor.summary.frameFrom.${frameFrom}`)}
          </span>
        </dd>
      </dl>

      <div className="flex flex-col gap-2.5">
        {POSITIONS.map((position) => {
          const indices = positions[position] ?? []
          const shared = indices.length > 1 ? sharedReason(indices) : undefined
          const pillOf = (i: number): JSX.Element => pill(i, shared !== undefined)
          return (
            <section key={position} className="flex flex-col gap-1">
              <h3 className="text-micro font-semibold uppercase tracking-wide text-text-secondary">{positionName(position)}</h3>
              {missing.has(position) && indices.length > 0 && (
                <p className="text-micro text-amber-600 dark:text-amber-400">{t('layoutEditor.summary.notInFrame')}</p>
              )}
              {shared && <p className="text-micro text-text-muted">{shared}</p>}
              {indices.length === 0 ? (
                <p className="text-micro text-text-muted">{t('layoutEditor.summary.empty')}</p>
              ) : (
                <>
                  {ungroupedOf(indices).length > 0 && <div className="flex flex-wrap gap-1">{ungroupedOf(indices).map(pillOf)}</div>}
                  {groupsOf(indices).map((g) => {
                    const color = groupColor(g, groupNames)
                    // As in the overview: a group the frame gives an area of its own is that area
                    // to the user, not a flex group they arranged (the frame builder makes the group
                    // only to bind the area). Asked of the frame the stage is drawn in, every area
                    // of it - contentsFor() claims the group for a hidden area as well.
                    const areaNames = [...new Set((frame?.areas ?? []).filter((a) => a.slot === position && a.group === g).map((a) => a.name))]
                    return (
                      <div key={g} className="mt-1 flex flex-col gap-1 pl-2">
                        <span className="flex items-center gap-1.5 text-micro">
                          {areaNames.length > 0 ? (
                            <>
                              <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-[3px] border-2 ${color?.ring ?? 'border-ink/30'}`} />
                              <span className="font-medium text-text">{t('layoutEditor.overview.ownArea', { name: areaNames.join(', ') })}</span>
                            </>
                          ) : (
                            <>
                              <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${color?.dot ?? 'bg-ink/30'}`} />
                              <span className="font-medium text-text">{t('layoutEditor.overview.flexGroup', { name: g })}</span>
                            </>
                          )}
                        </span>
                        <div className="flex flex-wrap gap-1">{indices.filter((i) => groupOf(i) === g).map(pillOf)}</div>
                      </div>
                    )
                  })}
                </>
              )}
            </section>
          )
        })}
      </div>

      {parked.size > 0 && <p className="text-micro text-text-muted">{t('layoutEditor.summary.parked', { count: parked.size })}</p>}
      <p className="text-micro text-text-muted">{t('layoutEditor.inspector.empty')}</p>
    </Card>
  )
}
