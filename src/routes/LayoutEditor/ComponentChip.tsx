import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { EyeOff, Filter, GripVertical, Monitor, Smartphone } from 'lucide-react'
import type { PluginEntry } from '@shared/ipc-contract'
import { BUILTIN_CONDITIONS, getLayout } from './utils'

// Fixed hue palette for flex-group color coding, cycled by the group's position in `groupNames` -
// purely a visual aid (not persisted), so a stable hash isn't needed, just a stable order. Shared
// by GlobalBoard and FrameBuilder so a group reads as the same color everywhere it appears.
export const GROUP_COLORS = [
  {
    dot: 'bg-blue-500',
    ring: 'border-blue-300 dark:border-blue-500/40',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    text: 'text-blue-700 dark:text-blue-300'
  },
  {
    dot: 'bg-purple-500',
    ring: 'border-purple-300 dark:border-purple-500/40',
    bg: 'bg-purple-50 dark:bg-purple-500/10',
    text: 'text-purple-700 dark:text-purple-300'
  },
  {
    dot: 'bg-emerald-500',
    ring: 'border-emerald-300 dark:border-emerald-500/40',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-300'
  },
  {
    dot: 'bg-amber-500',
    ring: 'border-amber-300 dark:border-amber-500/40',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-300'
  },
  {
    dot: 'bg-pink-500',
    ring: 'border-pink-300 dark:border-pink-500/40',
    bg: 'bg-pink-50 dark:bg-pink-500/10',
    text: 'text-pink-700 dark:text-pink-300'
  },
  {
    dot: 'bg-cyan-500',
    ring: 'border-cyan-300 dark:border-cyan-500/40',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    text: 'text-cyan-700 dark:text-cyan-300'
  }
]

export function groupColor(group: string | undefined, groupNames: string[]): (typeof GROUP_COLORS)[number] | null {
  if (!group) return null
  const idx = groupNames.indexOf(group)
  if (idx === -1) return null
  return GROUP_COLORS[idx % GROUP_COLORS.length]
}

// The words for a condition, on the chip's mark and in the side panel's select. A name Quartz does
// not ship stays as it is written - it is a plugin's own, and only that plugin knows what it means.
export function conditionLabel(t: TFunction, condition: string): string {
  switch (condition as (typeof BUILTIN_CONDITIONS)[number]) {
    case 'not-index':
      return t('layoutEditor.inspector.conditionNotIndex')
    case 'has-tags':
      return t('layoutEditor.inspector.conditionHasTags')
    case 'has-backlinks':
      return t('layoutEditor.inspector.conditionHasBacklinks')
    case 'has-toc':
      return t('layoutEditor.inspector.conditionHasToc')
    default:
      return condition
  }
}

/**
 * One placed component on the board: grip, name, and small marks for what its layout says beyond
 * the place it sits in - switched off, a group, desktop or mobile only, a condition. Everything you
 * change about it happens in the side panel (Inspector), so the chip stays one line high and the
 * board stays small enough to read as a page.
 *
 * The name is a real button that selects the component; the rest of the chip forwards a click to
 * the same thing for the mouse. Not `role="button"` on the whole chip, as the expanding card before
 * it had: that put the drag handle - itself a button - inside a button.
 */
export function ComponentChip({
  plugin,
  groupNames,
  rank,
  isDuplicate,
  selected,
  onSelect,
  hiddenReason,
  hiddenOnTypes,
  dragHandleProps,
  dragHandleRef
}: {
  plugin: PluginEntry
  groupNames: string[]
  rank?: number
  isDuplicate?: boolean
  selected?: boolean
  onSelect?: () => void
  /** Why it is not on the page the stage shows: its `display` in this view (stageGeometry.shownInView),
   *  or the selected page type excludes it or clears its position (pageTypeOverride.ts). */
  hiddenReason?: string
  /** On the "Alle Seiten" view: the page types that exclude it or clear its position, as a sentence. */
  hiddenOnTypes?: string
  dragHandleProps?: Record<string, unknown>
  /** dnd-kit's setActivatorNodeRef, as its own prop: React 18 cannot carry a ref through a props
   *  spread, and the handle is what the activator node has to be - see the drag handle below. */
  dragHandleRef?: (node: HTMLElement | null) => void
}): JSX.Element {
  const { t } = useTranslation()
  const layout = getLayout(plugin)
  const color = groupColor(layout?.group, groupNames)
  const label = isDuplicate && rank !== undefined ? `${plugin.name} #${rank}` : plugin.name

  return (
    <div
      onClick={onSelect}
      // Tells the board's DetailLayout that a click here selects rather than lets go.
      data-selectable={onSelect ? '' : undefined}
      // Not on this page: still there to drag and select, so not faded - grounded and dashed, with
      // the name in the muted colour, the way a disabled control stays readable (conventions.md).
      title={hiddenReason}
      className={`flex min-w-0 items-center gap-1 rounded-[6px] border px-1 py-1 ${hiddenReason ? 'border-dashed bg-ground' : 'bg-surface shadow-sm'} ${
        color ? `border-l-[3px] ${color.ring}` : 'border-ink/[0.08] dark:border-ink/15'
      } ${selected ? 'outline outline-2 outline-offset-1 outline-blue-500' : ''} ${onSelect ? 'cursor-pointer' : ''}`}
    >
      {dragHandleProps && (
        <span
          ref={dragHandleRef}
          {...dragHandleProps}
          // Picking up is not selecting: the click a pointer drag ends with would otherwise reach
          // the chip and open the panel for whatever was just moved.
          onClick={(e) => e.stopPropagation()}
          // With the component's name, and its number where it is one of several: the board has
          // one handle per row, and all 33 of the test project's read "Zum Verschieben ziehen" in a
          // screen reader's list of controls (thirty-first review, "nebenbei" 2).
          aria-label={t('layoutEditor.componentPill.dragHandle', { name: label })}
          className="flex shrink-0 cursor-grab select-none items-center rounded-[4px] p-0.5 text-text-muted transition-colors hover:bg-ink/[0.08] hover:text-text active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </span>
      )}
      <button
        type="button"
        aria-pressed={onSelect ? !!selected : undefined}
        onClick={(e) => {
          e.stopPropagation()
          onSelect?.()
        }}
        // flex-auto rather than flex-1: with a zero basis the name gave up all its room to the marks
        // first, and in a 120px side column of the stage it was gone entirely.
        // The name shrinks, the instance number does not: cut as one line, the number went first,
        // and at 1280 px three quartz-layout-box chips read the same (fortieth review, finding 9).
        // The whole label as a title, for the name that is cut.
        title={hiddenReason ? `${label} (${hiddenReason})` : label}
        className={`flex min-w-[1.5rem] flex-auto items-baseline text-left text-ui font-medium ${plugin.enabled && !hiddenReason ? '' : 'text-text-muted'}`}
      >
        <span className="min-w-0 truncate">{plugin.name}</span>
        {isDuplicate && rank !== undefined && <span className="ml-1 shrink-0 text-micro font-normal text-text-muted">#{rank}</span>}
        {hiddenReason && <span className="sr-only"> ({hiddenReason})</span>}
      </button>
      <span className="flex min-w-0 shrink items-center gap-1 overflow-hidden text-text-muted">
        {/* Quartz drops a disabled entry before it builds the layout, so it keeps its place in the
            config but renders nowhere. A sole instance that is off lives in the tray instead; this
            mark is for a switched-off duplicate, which stays where it was. */}
        {!plugin.enabled && (
          <span
            title={t('layoutEditor.componentPill.disabledHint')}
            className="shrink-0 rounded-full bg-ink/[0.06] px-1.5 text-micro font-medium dark:bg-ink/10"
          >
            {t('layoutEditor.componentPill.off')}
          </span>
        )}
        {layout?.group && (
          <span className={`min-w-0 max-w-[6rem] truncate rounded-full px-1.5 text-micro font-medium ${color?.bg ?? ''} ${color?.text ?? ''}`}>
            {layout.group}
          </span>
        )}
        {layout?.display === 'desktop-only' && (
          <span className="shrink-0" title={t('layoutEditor.displayDesktopOnly')}>
            <Monitor size={13} aria-label={t('layoutEditor.displayDesktopOnly')} />
          </span>
        )}
        {layout?.display === 'mobile-only' && (
          <span className="shrink-0" title={t('layoutEditor.displayMobileOnly')}>
            <Smartphone size={13} aria-label={t('layoutEditor.displayMobileOnly')} />
          </span>
        )}
        {hiddenOnTypes && (
          <span className="shrink-0" title={hiddenOnTypes}>
            <EyeOff size={13} aria-label={hiddenOnTypes} />
          </span>
        )}
        {layout?.condition && (
          <span className="shrink-0" title={conditionLabel(t, layout.condition)}>
            <Filter size={13} aria-label={conditionLabel(t, layout.condition)} />
          </span>
        )}
      </span>
    </div>
  )
}

// The chip in the component tray and the drag overlay of one taken from there. `off` marks the one
// instance of a component that is switched off and therefore lies in the tray (parkedIndices).
export function PaletteChip({ plugin, off }: { plugin: PluginEntry; off?: boolean }): JSX.Element {
  const { t } = useTranslation()
  return (
    <div
      className={`flex w-fit cursor-grab items-center gap-1.5 rounded-[6px] border border-dashed px-2 py-1 text-micro font-medium active:cursor-grabbing ${
        off ? 'border-ink/20 bg-ground text-text-secondary' : 'border-blue-300 bg-blue-50/60 dark:border-blue-500/40 dark:bg-blue-500/10'
      }`}
    >
      {plugin.name}
      {off && (
        <span title={t('layoutEditor.componentPill.parkedHint')} className="rounded-full bg-ink/[0.08] px-1.5 dark:bg-ink/15">
          {t('layoutEditor.componentPill.off')}
        </span>
      )}
    </div>
  )
}

/**
 * A placed component as a pill: its name in its group's color, with the marks for what holds on
 * every page alike - desktop or mobile only, a condition. The layout overview's rows and the
 * board's summary list both show it, so a component reads the same in both (reported 2026-10-11:
 * the summary was a plain list, without the colors).
 *
 * `struckReason` is the summary's "not on this page type": the pill is struck through and the
 * reason is part of its name, for those who cannot see the stroke.
 */
export function ComponentPill({
  plugin,
  label,
  groupNames,
  muted = false,
  struckReason,
  onClick
}: {
  plugin: PluginEntry
  label: string
  groupNames: string[]
  muted?: boolean
  struckReason?: string
  onClick: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const layout = getLayout(plugin)
  const color = groupColor(layout?.group, groupNames)
  const mark = (Icon: typeof Monitor, text: string): JSX.Element => (
    <span role="img" aria-label={text} title={text} className="inline-flex shrink-0 text-text-secondary">
      <Icon size={12} aria-hidden />
    </span>
  )
  return (
    <button
      type="button"
      onClick={onClick}
      title={struckReason}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-ui hover:border-ink/30 ${
        color ? `${color.ring} ${color.bg} ${color.text}` : 'border-ink/10 bg-surface text-text dark:border-ink/15'
      } ${muted || struckReason ? 'opacity-70' : ''}`}
    >
      <span className={`truncate ${struckReason ? 'line-through' : ''}`}>{label}</span>
      {struckReason && <span className="sr-only"> — {struckReason}</span>}
      {layout?.display === 'desktop-only' && mark(Monitor, t('layoutEditor.displayDesktopOnly'))}
      {layout?.display === 'mobile-only' && mark(Smartphone, t('layoutEditor.displayMobileOnly'))}
      {layout?.condition && mark(Filter, conditionLabel(t, layout.condition))}
    </button>
  )
}
