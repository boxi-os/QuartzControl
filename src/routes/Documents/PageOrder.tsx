import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, GripVertical, Heading, Plus, Trash2 } from 'lucide-react'
import type { BookEntry, SitePages } from '@shared/ipc-contract'
import { Badge, Button, IconButton, TextInput, focusRowAt } from '../../components/ui'
import { announce } from '../../state/announcer'
import { useDndAccessibility } from '../../utils/dndAnnouncements'

/**
 * The pages of a book, in one of two modes (shared/exportModel.resolveOrder decides what an export
 * makes of them, and this list shows the same):
 *
 *  - Following the site's navigation (`order: null`): the navigation's order, a tick per page for
 *    leaving it out. Pages the navigation does not show cannot be in such a book; they are listed
 *    below with the way to take them in, an own order.
 *  - An own order: the book's list, dragged or moved by arrow buttons, with interposed headings.
 *    A page the build no longer has says so; a page of the navigation the list does not name is
 *    shown where an export puts it - appended at the end.
 */

type PageOrderProps = {
  order: BookEntry[] | null
  excluded: string[]
  site: SitePages
  onChange: (next: { order: BookEntry[] | null; excluded: string[] }) => void
}

// Interposed headings have no name of their own that stays put while they are dragged or renamed,
// so each entry object gets an id the first time it is seen; moving an entry moves the object.
const ids = new WeakMap<BookEntry, string>()
let nextId = 0
function idOf(entry: BookEntry): string {
  let id = ids.get(entry)
  if (!id) {
    id = 'slug' in entry ? `p:${entry.slug}` : `h:${nextId++}`
    ids.set(entry, id)
  }
  return id
}

/** A renamed heading is a new object (the draft is never mutated) that keeps the old one's id:
 *  with a new id it got a new React key on every keystroke, the row was mounted afresh and the
 *  focus fell to <body> after the first letter (review of 2026-11-06, M5). */
function renamed(entry: BookEntry, heading: string): BookEntry {
  const next: BookEntry = { heading }
  ids.set(next, idOf(entry))
  return next
}

export default function PageOrder({ order, excluded, site, onChange }: PageOrderProps): JSX.Element {
  const { t } = useTranslation()
  const listRef = useRef<HTMLUListElement>(null)
  const pages = useMemo(() => new Map(site.pages.map((p) => [p.slug, p])), [site])
  const out = useMemo(() => new Set(excluded), [excluded])
  const setExcluded = (slug: string, leaveOut: boolean): void =>
    onChange({ order, excluded: leaveOut ? [...excluded, slug] : excluded.filter((s) => s !== slug) })
  const titleOf = (slug: string): string => pages.get(slug)?.title ?? slug
  const indent = (slug: string): React.CSSProperties => ({ paddingLeft: `${Math.max(0, (pages.get(slug)?.depth ?? 1) - 1) * 1.1}rem` })

  // Hooks before the mode decides what to render: the rules of hooks want them in every render.
  const entries = order ?? []
  const label = (e: BookEntry): string => ('slug' in e ? titleOf(e.slug) : e.heading)
  const names = new Map(entries.map((e) => [idOf(e), label(e)]))
  const { announcements, screenReaderInstructions } = useDndAccessibility(t, (id) => names.get(id) ?? '')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  const navigation = site.pages.filter((p) => p.inNavigation)
  const hidden = site.pages.filter((p) => !p.inNavigation)

  if (order === null) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-micro text-text-muted">{t('documents.pages.followingHint', { count: navigation.length - navigation.filter((p) => out.has(p.slug)).length })}</p>
          <Button variant="ghost" onClick={() => onChange({ order: navigation.map((p) => ({ slug: p.slug })), excluded })}>
            {t('documents.pages.ownOrder')}
          </Button>
        </div>
        <ul className="flex flex-col gap-0.5">
          {navigation.map((p) => (
            <li key={p.slug} style={indent(p.slug)}>
              <label className="flex items-center gap-2 py-0.5 text-ui">
                <input type="checkbox" checked={!out.has(p.slug)} onChange={(e) => setExcluded(p.slug, !e.target.checked)} />
                <span className={out.has(p.slug) ? 'text-text-muted line-through' : 'text-text'}>{p.title}</span>
              </label>
            </li>
          ))}
        </ul>
        {hidden.length > 0 && (
          <div>
            <p className="mb-1 text-micro font-medium text-text-secondary">{t('documents.pages.hiddenHeading', { count: hidden.length })}</p>
            <p className="mb-1 text-micro text-text-muted">{t('documents.pages.hiddenHint')}</p>
            <ul className="flex flex-col gap-0.5">
              {hidden.map((p) => (
                <li key={p.slug} className="text-ui text-text-muted">
                  {p.title} <span className="font-mono text-micro">{p.slug}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  const listed = new Set(order.filter((e): e is { slug: string } => 'slug' in e).map((e) => e.slug))
  const appended = navigation.filter((p) => !listed.has(p.slug))
  const notTaken = hidden.filter((p) => !listed.has(p.slug))
  const keys = order.map(idOf)

  const move = (from: number, to: number, said = true): void => {
    if (to < 0 || to >= order.length || from === to) return
    const next = [...order]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange({ order: next, excluded })
    if (said) announce(t('documents.pages.movedAnnounce', { name: label(item), n: to + 1, count: order.length }))
  }
  const onDragEnd = (event: DragEndEvent): void => {
    if (!event.over || event.active.id === event.over.id) return
    move(keys.indexOf(String(event.active.id)), keys.indexOf(String(event.over.id)), false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-micro text-text-muted">{t('documents.pages.ownHint')}</p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              const heading: BookEntry = { heading: t('documents.pages.newHeading') }
              onChange({ order: [...order, heading], excluded })
              announce(t('documents.pages.headingAddedAnnounce'))
            }}
          >
            <Plus size={14} aria-hidden />
            {t('documents.pages.addHeading')}
          </Button>
          <Button variant="ghost" onClick={() => onChange({ order: null, excluded })}>
            {t('documents.pages.followNavigation')}
          </Button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={{ announcements, screenReaderInstructions }}>
        <SortableContext items={keys} strategy={verticalListSortingStrategy}>
          <ul ref={listRef} className="flex flex-col gap-1">
            {order.map((entry, i) => (
              <OrderRow
                key={keys[i]}
                id={keys[i]}
                entry={entry}
                label={label(entry)}
                missing={'slug' in entry && !pages.has(entry.slug)}
                leftOut={'slug' in entry && out.has(entry.slug)}
                indent={'slug' in entry ? indent(entry.slug) : undefined}
                first={i === 0}
                last={i === order.length - 1}
                onMove={(by) => move(i, i + by)}
                onLeaveOut={(leave) => 'slug' in entry && setExcluded(entry.slug, leave)}
                onRename={(heading) => onChange({ order: order.map((e, j) => (j === i ? renamed(e, heading) : e)), excluded })}
                onRemove={() => {
                  onChange({ order: order.filter((_, j) => j !== i), excluded })
                  announce(t('documents.pages.removedAnnounce', { name: label(entry) }))
                  requestAnimationFrame(() => focusRowAt(listRef.current, i))
                }}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {appended.length > 0 && (
        <div>
          <p className="mb-1 text-micro font-medium text-text-secondary">{t('documents.pages.appendedHeading', { count: appended.length })}</p>
          <ul className="flex flex-col gap-0.5">
            {appended.map((p) => (
              <li key={p.slug} className="flex items-center gap-2 text-ui text-text-secondary">
                {p.title} <Badge>{t('documents.pages.appendedBadge')}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
      {notTaken.length > 0 && (
        <div>
          <p className="mb-1 text-micro font-medium text-text-secondary">{t('documents.pages.hiddenHeading', { count: notTaken.length })}</p>
          <ul className="flex flex-col gap-0.5">
            {notTaken.map((p) => (
              <li key={p.slug} className="flex items-center gap-2 text-ui text-text-muted">
                <span className="min-w-0 flex-1 truncate">
                  {p.title} <span className="font-mono text-micro">{p.slug}</span>
                </span>
                <Button variant="ghost" onClick={() => onChange({ order: [...order, { slug: p.slug }], excluded })}>
                  {t('documents.pages.takeIn')}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function OrderRow({
  id,
  entry,
  label,
  missing,
  leftOut,
  indent,
  first,
  last,
  onMove,
  onLeaveOut,
  onRename,
  onRemove
}: {
  id: string
  entry: BookEntry
  label: string
  missing: boolean
  leftOut: boolean
  indent?: React.CSSProperties
  first: boolean
  last: boolean
  onMove: (by: -1 | 1) => void
  onLeaveOut: (leaveOut: boolean) => void
  onRename: (heading: string) => void
  onRemove: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  const isHeading = 'heading' in entry
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-md border px-2 py-1 ${isHeading ? 'border-dashed border-ink/20 bg-ink/[0.03]' : 'border-ink/10 bg-surface'} ${isDragging ? 'opacity-40' : ''}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        title={t('pluginsInstalled.dragHint')}
        aria-label={t('documents.pages.dragRow', { name: label })}
        className="flex shrink-0 cursor-grab select-none items-center rounded-[6px] border border-ink/10 bg-ink/[0.03] p-1 text-text-secondary transition-colors hover:border-ink/20 hover:bg-ink/[0.08] hover:text-text active:cursor-grabbing"
      >
        <GripVertical size={14} aria-hidden />
      </button>
      <div className="flex min-w-0 flex-1 items-center gap-2" style={indent}>
        {isHeading ? (
          <>
            <Heading size={14} aria-hidden className="shrink-0 text-text-muted" />
            <TextInput aria-label={t('documents.pages.headingText')} value={entry.heading} onChange={(e) => onRename(e.target.value)} className="flex-1" />
          </>
        ) : (
          <label className="flex min-w-0 flex-1 items-center gap-2 text-ui">
            <input type="checkbox" checked={!leftOut} disabled={missing} onChange={(e) => onLeaveOut(!e.target.checked)} />
            <span className={`truncate ${leftOut || missing ? 'text-text-muted line-through' : 'text-text'}`}>{label}</span>
          </label>
        )}
        {missing && <Badge tone="amber">{t('documents.pages.missingBadge')}</Badge>}
      </div>
      <IconButton icon={ArrowUp} tone="neutral" title={t('pluginsInstalled.moveUp', { name: label })} onClick={() => onMove(-1)} disabled={first} />
      <IconButton icon={ArrowDown} tone="neutral" title={t('pluginsInstalled.moveDown', { name: label })} onClick={() => onMove(1)} disabled={last} />
      {(isHeading || missing) && <IconButton icon={Trash2} title={t('common.removeNamed', { name: label })} onClick={onRemove} />}
    </li>
  )
}
