import { useTranslation } from 'react-i18next'
import { ChevronDown, GripVertical } from 'lucide-react'
import type { PluginEntry, PluginLayoutDeclaration } from '@shared/ipc-contract'
import { Badge, Button, Card, Select } from '../../components/ui'
import { getLayout } from './utils'

// Fixed hue palette for flex-group color coding, cycled by the group's position in `groupNames` -
// purely a visual aid (not persisted), so a stable hash isn't needed, just a stable order. Shared
// by GlobalBoard and FrameBuilder so a group reads as the same color everywhere it appears.
export const GROUP_COLORS = [
  { dot: 'bg-blue-500', ring: 'border-blue-300 dark:border-blue-500/40', bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-300' },
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
  { dot: 'bg-pink-500', ring: 'border-pink-300 dark:border-pink-500/40', bg: 'bg-pink-50 dark:bg-pink-500/10', text: 'text-pink-700 dark:text-pink-300' },
  { dot: 'bg-cyan-500', ring: 'border-cyan-300 dark:border-cyan-500/40', bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-700 dark:text-cyan-300' }
]

export function groupColor(group: string | undefined, groupNames: string[]): (typeof GROUP_COLORS)[number] | null {
  if (!group) return null
  const idx = groupNames.indexOf(group)
  if (idx === -1) return null
  return GROUP_COLORS[idx % GROUP_COLORS.length]
}

// A component instance's collapsed pill (name, duplicate-rank, group/display badges, expand
// chevron) and its expanded settings panel (group/display selects, duplicate/remove). Used by
// GlobalBoard's dnd-kit drag handle - `dragHandleProps` is spread as-is onto the handle span, so
// this component doesn't care which DnD system wired it.
export function ItemCard({
  plugin,
  groupNames,
  rank,
  isDuplicate,
  expanded,
  onToggleExpand,
  onSetGroup,
  onSetDisplay,
  onDuplicate,
  onRemove,
  collapsed,
  dragHandleProps
}: {
  plugin: PluginEntry
  groupNames: string[]
  rank?: number
  isDuplicate?: boolean
  expanded?: boolean
  onToggleExpand?: () => void
  onSetGroup?: (group: string) => void
  onSetDisplay?: (display: PluginLayoutDeclaration['display']) => void
  onDuplicate?: () => void
  onRemove?: () => void
  collapsed?: boolean
  dragHandleProps?: Record<string, unknown>
}): JSX.Element {
  const { t } = useTranslation()
  const layout = getLayout(plugin)
  const color = groupColor(layout?.group, groupNames)
  // The whole card is the expand/collapse target (not just the chevron) - only the drag handle
  // and the expanded settings panel opt back out via stopPropagation, so a click anywhere else on
  // the card (name, badges, empty space) toggles it, same as FrameBuilder's placed-area boxes.
  const interactive = !collapsed && !!onToggleExpand

  return (
    <Card
      className={`!p-2 ${color ? `border-l-[3px] ${color.ring}` : ''} ${interactive ? 'cursor-pointer' : ''}`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onToggleExpand : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onToggleExpand?.()
              }
            }
          : undefined
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {dragHandleProps && (
            // A generously padded, visibly bordered grab target - anywhere else on the card is
            // plain text, so starting a drag there would just fall through to the browser's
            // native text selection instead of dnd-kit's drag.
            <span
              {...dragHandleProps}
              onClick={(e) => e.stopPropagation()}
              aria-label={t('layoutEditor.componentPill.dragHandle')}
              className="-ml-1 flex shrink-0 cursor-grab select-none items-center rounded-[6px] border border-ink/10 bg-ink/[0.03] p-1 text-text-muted transition-colors hover:border-ink/20 hover:bg-ink/[0.08] hover:text-text active:cursor-grabbing dark:bg-ink/[0.04]"
            >
              <GripVertical size={15} />
            </span>
          )}
          <span className="truncate text-sm font-medium">{plugin.name}</span>
          {isDuplicate && rank !== undefined && <span className="text-[11px] text-text-muted">#{rank}</span>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {layout?.group && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${color?.bg} ${color?.text}`}>{layout.group}</span>
          )}
          {layout?.display && layout.display !== 'all' && (
            <Badge tone="amber">
              {layout.display === 'desktop-only' ? t('layoutEditor.displayDesktopOnly') : t('layoutEditor.displayMobileOnly')}
            </Badge>
          )}
          {interactive && (
            <ChevronDown
              size={15}
              aria-hidden="true"
              className={`shrink-0 text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          )}
        </div>
      </div>

      {expanded && (
        <div
          className="mt-2 flex flex-wrap items-end gap-2 border-t border-black/[0.06] pt-2 dark:border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <label className="flex flex-col gap-1 text-[12px]">
            <span className="font-medium text-text-secondary">{t('layoutEditor.groupLabel')}</span>
            <Select value={layout?.group ?? ''} onChange={(e) => onSetGroup?.(e.target.value)} className="!py-1 text-xs">
              <option value="">{t('layoutEditor.noGroup')}</option>
              {groupNames.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-[12px]">
            <span className="font-medium text-text-secondary">{t('layoutEditor.displayLabel')}</span>
            <Select
              value={layout?.display ?? 'all'}
              onChange={(e) => onSetDisplay?.(e.target.value as PluginLayoutDeclaration['display'])}
              className="!py-1 text-xs"
            >
              <option value="all">{t('layoutEditor.displayAll')}</option>
              <option value="desktop-only">{t('layoutEditor.displayDesktopOnly')}</option>
              <option value="mobile-only">{t('layoutEditor.displayMobileOnly')}</option>
            </Select>
          </label>
          <Button variant="ghost" onClick={onDuplicate}>
            {t('layoutEditor.componentPill.duplicate')}
          </Button>
          {isDuplicate && (
            <Button variant="danger" onClick={onRemove}>
              {t('layoutEditor.componentPill.removeDuplicate')}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

// The dumb, undecorated chip shown in GlobalBoard's "add component" palette / drag overlay -
// GlobalBoard wires its own dnd-kit draggable behavior around this and just renders it for the look.
export function PaletteChip({ plugin }: { plugin: PluginEntry }): JSX.Element {
  return (
    <div className="flex cursor-grab items-center gap-1.5 rounded-[6px] border border-dashed border-blue-300 bg-blue-50/60 px-2.5 py-1.5 text-[11px] font-medium active:cursor-grabbing dark:border-blue-500/40 dark:bg-blue-500/10">
      {plugin.name}
    </div>
  )
}
