import type { ReactNode } from 'react'
import { Monitor, Smartphone, Tablet, type LucideIcon } from 'lucide-react'
import type { FrameBreakpoint } from '@shared/ipc-contract'

export const BREAKPOINT_ICON: Record<FrameBreakpoint, LucideIcon> = { desktop: Monitor, tablet: Tablet, mobile: Smartphone }

/**
 * The head of a layout workspace: what is being edited right now, in the size of a heading, with
 * the controls that change it underneath. Until 1.1 the page type and the frame were only the
 * value of a select among other selects, and a stage that looks the same for "all pages" and for
 * one page type gave no other hint which of the two a drag was about to change.
 *
 * Tinted with the accent and framed, so it reads as the one box that says "where am I" - not as
 * another card of the board.
 */
export default function EditingContext({
  icon: Icon,
  kind,
  name,
  meta,
  children
}: {
  icon: LucideIcon
  /** What kind of thing `name` is, as a micro label above it ("Seitentyp", "Frame"). */
  kind: string
  name: string
  /** Short facts beside the name - the frame in use, the view, a state. */
  meta?: ReactNode
  children?: ReactNode
}): JSX.Element {
  return (
    <section
      aria-label={`${kind}: ${name}`}
      className="flex flex-col gap-3 rounded-lg border border-accent/30 bg-accent/[0.05] px-4 py-3 dark:bg-accent/[0.08]"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent-text" aria-hidden>
            <Icon size={18} />
          </span>
          <div className="min-w-0">
            <div className="text-micro font-medium uppercase tracking-wide text-text-secondary">{kind}</div>
            <div className="truncate text-[17px] font-semibold leading-tight text-text">{name}</div>
          </div>
        </div>
        {meta && <div className="flex flex-wrap items-center gap-1.5">{meta}</div>}
      </div>
      {children && <div className="flex flex-col gap-2 border-t border-accent/20 pt-3">{children}</div>}
    </section>
  )
}

/** One fact in the head: an icon, a label and a value, as a quiet pill. */
export function ContextFact({ icon: Icon, label, value, tone = 'plain' }: { icon: LucideIcon; label?: string; value: string; tone?: 'plain' | 'accent' | 'amber' }): JSX.Element {
  const tones = {
    plain: 'border-ink/10 bg-surface text-text-secondary dark:border-ink/15',
    accent: 'border-accent/40 bg-accent/10 text-accent-text',
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-micro ${tones[tone]}`}>
      <Icon size={12} aria-hidden />
      {label && <span className="text-text-muted">{label}</span>}
      <span className="font-medium">{value}</span>
    </span>
  )
}
