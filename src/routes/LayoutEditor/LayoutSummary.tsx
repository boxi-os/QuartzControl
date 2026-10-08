import { useTranslation } from 'react-i18next'
import { LayoutDashboard } from 'lucide-react'
import type { LayoutPosition, QuartzConfig } from '@shared/ipc-contract'
import { Card, CardHeading } from '../../components/ui'
import { POSITIONS, getLayout } from './utils'

/**
 * The layout board's side panel while nothing is selected: what the page the stage shows is made
 * of, in words - which frame it is built in and where that choice comes from, and per position
 * which components appear, which this page type hides, and which are off. The stage says the same
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
  onSelect: (index: number) => void
}): JSX.Element {
  const { t } = useTranslation()
  const positionName = (p: LayoutPosition): string => t(`positions.${p}`, p)
  const missing = new Set(missingSlots)

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
          return (
            <section key={position} className="flex flex-col gap-0.5">
              <h3 className="text-micro font-semibold uppercase tracking-wide text-text-secondary">{positionName(position)}</h3>
              {missing.has(position) && indices.length > 0 && (
                <p className="text-micro text-amber-600 dark:text-amber-400">{t('layoutEditor.summary.notInFrame')}</p>
              )}
              {indices.length === 0 ? (
                <p className="text-micro text-text-muted">{t('layoutEditor.summary.empty')}</p>
              ) : (
                <ul className="flex flex-col">
                  {indices.map((index) => {
                    const hidden = pageTypeHidden(index)
                    const display = getLayout(config.plugins[index])?.display
                    return (
                      <li key={index} className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                        <button
                          type="button"
                          onClick={() => onSelect(index)}
                          className={`min-w-0 truncate text-left text-ui underline-offset-2 hover:underline ${hidden ? 'text-text-muted line-through' : 'text-text'}`}
                        >
                          {componentLabel(index)}
                        </button>
                        {hidden && <span className="text-micro text-text-muted">{hidden}</span>}
                        {!hidden && display === 'desktop-only' && (
                          <span className="text-micro text-text-muted">{t('layoutEditor.displayDesktopOnly')}</span>
                        )}
                        {!hidden && display === 'mobile-only' && (
                          <span className="text-micro text-text-muted">{t('layoutEditor.displayMobileOnly')}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
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
