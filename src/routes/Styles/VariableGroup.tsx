import { ChevronDown, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// One collapsible category of CSS variables. Both places that list variables by group use this:
// the Variablen tab and the reference panel beside the CSS editor - they differ in what a row is,
// not in how a category behaves, and the alpha test asked for the same thing in both.
//
// Why the header carries a fill: without it a category heading sits optically closer to the rows
// *above* it than to its own, which is exactly the "one long list" complaint the collapsing is
// meant to answer. The fill is `ink` at 4.5%, so it is the same weight in both schemes.
//
// The count and the "n changed" badge exist because a collapsed category must still say whether
// anything is hiding in it - otherwise finding one's own override means opening all ten.
export default function VariableGroup({
  label,
  count,
  changed = 0,
  open,
  onToggle,
  children
}: {
  label: string
  count: number
  changed?: number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}): JSX.Element {
  const { t } = useTranslation()
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md bg-ink/[0.045] px-2 py-1.5 text-left transition-colors hover:bg-ink/[0.08]"
      >
        {open ? (
          <ChevronDown size={12} className="shrink-0 text-text-muted" />
        ) : (
          <ChevronRight size={12} className="shrink-0 text-text-muted" />
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{label}</span>
        <span className="text-[11px] tabular-nums text-text-muted">{count}</span>
        {changed > 0 && (
          <span className="rounded-full bg-green-100 px-2 text-[11px] text-green-700 dark:bg-green-500/15 dark:text-green-400">
            {t('styles.variables.groupChanged', { count: changed })}
          </span>
        )}
      </button>
      {open && <div className="flex flex-col gap-px py-1">{children}</div>}
    </div>
  )
}
