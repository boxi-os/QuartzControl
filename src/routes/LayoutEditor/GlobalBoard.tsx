import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { FlexGroupConfig, LayoutPosition, PluginEntry, PluginLayoutDeclaration, QuartzConfig } from '@shared/ipc-contract'
import { Badge, Button, Card, Select, TextInput } from '../../components/ui'
import { POSITIONS, buildPositionMap, componentItems, getLayout, renumberPriorities } from './utils'

function findContainer(positions: Record<LayoutPosition, number[]>, id: string): LayoutPosition | null {
  if ((POSITIONS as string[]).includes(id)) return id as LayoutPosition
  for (const pos of POSITIONS) {
    if (positions[pos].some((i) => String(i) === id)) return pos
  }
  return null
}

export default function GlobalBoard({
  config,
  onChange
}: {
  config: QuartzConfig
  onChange: (next: QuartzConfig) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState<string | null>(null)
  const positions = buildPositionMap(config.plugins)
  const groupNames = Object.keys(config.layout?.groups ?? {})

  function handleDragStart(event: DragStartEvent): void {
    setActiveId(String(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent): void {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const fromContainer = findContainer(positions, String(active.id))
    const toContainer = findContainer(positions, String(over.id))
    if (!fromContainer || !toContainer) return

    const sourceIndex = positions[fromContainer].indexOf(Number(active.id))
    const next: Record<LayoutPosition, number[]> = { ...positions }
    next[fromContainer] = [...positions[fromContainer]]
    next[fromContainer].splice(sourceIndex, 1)

    if (fromContainer === toContainer) {
      const overIndex = positions[toContainer].indexOf(Number(over.id))
      const targetIndex = overIndex === -1 ? next[toContainer].length : overIndex
      next[toContainer].splice(targetIndex, 0, Number(active.id))
    } else {
      next[toContainer] = [...positions[toContainer]]
      const overIndex = positions[toContainer].indexOf(Number(over.id))
      const targetIndex = overIndex === -1 ? next[toContainer].length : overIndex
      next[toContainer].splice(targetIndex, 0, Number(active.id))
    }

    if (next[fromContainer].join(',') === positions[fromContainer].join(',') && fromContainer === toContainer) return

    const renumbered = new Map<number, { position: LayoutPosition; priority: number }>()
    for (const pos of fromContainer === toContainer ? [fromContainer] : [fromContainer, toContainer]) {
      for (const [index, priority] of renumberPriorities(next[pos])) {
        renumbered.set(index, { position: pos, priority })
      }
    }

    const plugins: PluginEntry[] = config.plugins.map((plugin, index) => {
      const update = renumbered.get(index)
      if (!update || !plugin.layout) return plugin
      return { ...plugin, layout: { ...plugin.layout, position: update.position, priority: update.priority } }
    })
    onChange({ ...config, plugins })
  }

  function setGroup(index: number, group: string): void {
    const plugins = config.plugins.map((p, i) => {
      if (i !== index || !p.layout) return p
      const layout = { ...p.layout }
      if (group) layout.group = group
      else delete layout.group
      return { ...p, layout }
    })
    onChange({ ...config, plugins })
  }

  // Quartz core already honors this at build time (styles/base.scss's .desktop-only/.mobile-only,
  // switching at the same 800px breakpoint the grid-frame media queries use) - this was previously
  // modeled but never surfaced in the UI.
  function setDisplay(index: number, display: PluginLayoutDeclaration['display']): void {
    const plugins = config.plugins.map((p, i) => {
      if (i !== index || !p.layout) return p
      const layout = { ...p.layout }
      if (display && display !== 'all') layout.display = display
      else delete layout.display
      return { ...p, layout }
    })
    onChange({ ...config, plugins })
  }

  function setGroups(groups: Record<string, FlexGroupConfig>): void {
    onChange({ ...config, layout: { ...config.layout, groups } })
  }

  function addGroup(name: string): void {
    if (!name.trim() || (config.layout?.groups ?? {})[name]) return
    setGroups({ ...(config.layout?.groups ?? {}), [name]: { direction: 'row', gap: '0.5rem' } })
  }

  function updateGroup(name: string, patch: Partial<FlexGroupConfig>): void {
    setGroups({ ...(config.layout?.groups ?? {}), [name]: { ...(config.layout?.groups ?? {})[name], ...patch } })
  }

  function deleteGroup(name: string): void {
    const groups = { ...(config.layout?.groups ?? {}) }
    delete groups[name]
    // members keep their `group` field pointing at a now-undefined group, which quartz's
    // resolveGroups() just renders as an ungrouped default-row flex of one - harmless, and
    // editable back to "keine" per-item without needing to touch every member here.
    setGroups(groups)
  }

  const activeItem = activeId ? config.plugins[Number(activeId)] : null

  return (
    <div className="flex flex-col gap-6">
      <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <PositionSlot
          position="header"
          indices={positions.header}
          config={config}
          groupNames={groupNames}
          onSetGroup={setGroup}
          onSetDisplay={setDisplay}
        />
        <div className="grid grid-cols-3 gap-4">
          <PositionSlot
            position="left"
            indices={positions.left}
            config={config}
            groupNames={groupNames}
            onSetGroup={setGroup}
            onSetDisplay={setDisplay}
          />
          <div className="flex flex-col gap-4">
            <PositionSlot
              position="beforeBody"
              indices={positions.beforeBody}
              config={config}
              groupNames={groupNames}
              onSetGroup={setGroup}
              onSetDisplay={setDisplay}
            />
            <div className="rounded-md border border-dashed border-black/10 px-3 py-6 text-center text-xs text-slate-400 dark:border-white/10">
              Content
            </div>
            <PositionSlot
              position="afterBody"
              indices={positions.afterBody}
              config={config}
              groupNames={groupNames}
              onSetGroup={setGroup}
              onSetDisplay={setDisplay}
            />
          </div>
          <PositionSlot
            position="right"
            indices={positions.right}
            config={config}
            groupNames={groupNames}
            onSetGroup={setGroup}
            onSetDisplay={setDisplay}
          />
        </div>
        <PositionSlot
          position="footer"
          indices={positions.footer}
          config={config}
          groupNames={groupNames}
          onSetGroup={setGroup}
          onSetDisplay={setDisplay}
        />

        <DragOverlay>{activeItem ? <ItemCard name={activeItem.name} /> : null}</DragOverlay>
      </DndContext>

      <GroupsPanel
        groups={config.layout?.groups ?? {}}
        onAdd={addGroup}
        onUpdate={updateGroup}
        onDelete={deleteGroup}
      />
    </div>
  )
}

function PositionSlot({
  position,
  indices,
  config,
  groupNames,
  onSetGroup,
  onSetDisplay
}: {
  position: LayoutPosition
  indices: number[]
  config: QuartzConfig
  groupNames: string[]
  onSetGroup: (index: number, group: string) => void
  onSetDisplay: (index: number, display: PluginLayoutDeclaration['display']) => void
}): JSX.Element {
  const { t } = useTranslation()
  const { setNodeRef } = useDroppable({ id: position })
  const ids = indices.map(String)

  return (
    <div>
      <h3 className="mb-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t(`layoutEditor.positions.${position}`)}
      </h3>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex min-h-[52px] flex-col gap-2 rounded-md bg-black/[0.02] p-2 dark:bg-white/[0.03]">
          {indices.length === 0 && <p className="px-2 py-3 text-center text-xs text-slate-400">{t('layoutEditor.emptySlot')}</p>}
          {indices.map((index) => (
            <SortableItem
              key={index}
              id={String(index)}
              plugin={config.plugins[index]}
              groupNames={groupNames}
              onSetGroup={(group) => onSetGroup(index, group)}
              onSetDisplay={(display) => onSetDisplay(index, display)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

function SortableItem({
  id,
  plugin,
  groupNames,
  onSetGroup,
  onSetDisplay
}: {
  id: string
  plugin: PluginEntry
  groupNames: string[]
  onSetGroup: (group: string) => void
  onSetDisplay: (display: PluginLayoutDeclaration['display']) => void
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const layout = getLayout(plugin)
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-40' : ''}>
      <ItemCard
        name={plugin.name}
        group={layout?.group}
        groupNames={groupNames}
        onSetGroup={onSetGroup}
        display={layout?.display}
        onSetDisplay={onSetDisplay}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

function ItemCard({
  name,
  group,
  groupNames,
  onSetGroup,
  display,
  onSetDisplay,
  dragHandleProps
}: {
  name: string
  group?: string
  groupNames?: string[]
  onSetGroup?: (group: string) => void
  display?: PluginLayoutDeclaration['display']
  onSetDisplay?: (display: PluginLayoutDeclaration['display']) => void
  dragHandleProps?: Record<string, unknown>
}): JSX.Element {
  const { t } = useTranslation()
  return (
    <Card className="flex flex-wrap items-center justify-between gap-2 !p-2">
      <div className="flex min-w-0 items-center gap-2">
        <span {...dragHandleProps} className="cursor-grab select-none pl-1 pr-1 text-slate-300 active:cursor-grabbing dark:text-slate-600">
          ⠿
        </span>
        <span className="truncate text-sm font-medium">{name}</span>
        {group && <Badge>{group}</Badge>}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {onSetDisplay && (
          <Select
            value={display ?? 'all'}
            onChange={(e) => onSetDisplay(e.target.value as PluginLayoutDeclaration['display'])}
            className="!py-1 text-xs"
          >
            <option value="all">{t('layoutEditor.displayAll')}</option>
            <option value="desktop-only">{t('layoutEditor.displayDesktopOnly')}</option>
            <option value="mobile-only">{t('layoutEditor.displayMobileOnly')}</option>
          </Select>
        )}
        {onSetGroup && groupNames && (
          <Select value={group ?? ''} onChange={(e) => onSetGroup(e.target.value)} className="!py-1 text-xs">
            <option value="">{t('layoutEditor.noGroup')}</option>
            {groupNames.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        )}
      </div>
    </Card>
  )
}

function GroupsPanel({
  groups,
  onAdd,
  onUpdate,
  onDelete
}: {
  groups: Record<string, FlexGroupConfig>
  onAdd: (name: string) => void
  onUpdate: (name: string, patch: Partial<FlexGroupConfig>) => void
  onDelete: (name: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [newName, setNewName] = useState('')
  const names = Object.keys(groups)

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold">{t('layoutEditor.groupsPanel.title')}</h3>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('layoutEditor.groupsPanel.description')}</p>

      {names.length === 0 && <p className="mb-3 text-xs text-slate-500">{t('layoutEditor.groupsPanel.none')}</p>}

      <div className="mb-3 flex flex-col gap-2">
        {names.map((name) => {
          const group = groups[name]
          return (
            <div key={name} className="flex items-center gap-3 rounded-md border border-black/[0.06] p-2 dark:border-white/10">
              <span className="w-32 shrink-0 truncate text-sm font-medium">{name}</span>
              <Select
                value={group.direction ?? 'row'}
                onChange={(e) => onUpdate(name, { direction: e.target.value as FlexGroupConfig['direction'] })}
                className="w-36"
              >
                <option value="row">row</option>
                <option value="row-reverse">row-reverse</option>
                <option value="column">column</option>
                <option value="column-reverse">column-reverse</option>
              </Select>
              <TextInput
                value={group.gap ?? ''}
                onChange={(e) => onUpdate(name, { gap: e.target.value })}
                placeholder="0.5rem"
                className="w-24"
              />
              <TextInput
                type="number"
                value={group.priority ?? ''}
                onChange={(e) => onUpdate(name, { priority: e.target.value === '' ? undefined : Number(e.target.value) })}
                placeholder={t('layoutEditor.groupsPanel.priority')}
                className="w-24"
              />
              <button type="button" onClick={() => onDelete(name)} className="ml-auto text-xs text-slate-500 underline">
                {t('layoutEditor.groupsPanel.delete')}
              </button>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <TextInput
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t('layoutEditor.groupsPanel.newGroupPlaceholder')}
          className="w-56"
        />
        <Button
          variant="ghost"
          onClick={() => {
            onAdd(newName.trim())
            setNewName('')
          }}
          disabled={!newName.trim()}
        >
          {t('layoutEditor.groupsPanel.add')}
        </Button>
      </div>
    </Card>
  )
}
