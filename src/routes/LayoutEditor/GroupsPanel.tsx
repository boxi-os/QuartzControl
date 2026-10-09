import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import type { FlexGroupConfig } from '@shared/ipc-contract'
import { Button, Card, Field, IconButton, Select, TextInput } from '../../components/ui'
import { GROUP_COLORS } from './ComponentChip'

export default function GroupsPanel({
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
      <p className="mb-3 text-xs text-text-muted">{t('layoutEditor.groupsPanel.description')}</p>

      {names.length === 0 && <p className="mb-3 text-xs text-text-muted">{t('layoutEditor.groupsPanel.none')}</p>}

      <div className="mb-3 flex flex-col gap-2">
        {names.map((name, i) => {
          const group = groups[name]
          const color = GROUP_COLORS[i % GROUP_COLORS.length]
          return (
            <div key={name} className="flex flex-col gap-2 rounded-md border border-ink/[0.06] p-2 dark:border-ink/10">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${color.dot}`} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
                <IconButton icon={Trash2} title={t('common.deleteNamed', { name })} onClick={() => onDelete(name)} />
              </div>
              {/* Four settings in a grid under the name rather than in one row beside it: with
                  wrapping as the fourth, the row broke at the board's width and left the priority
                  alone on a second line. Each field carries its own label; the direction values
                  say what they do on the page. */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Field label={t('layoutEditor.groupsPanel.direction')}>
                  <Select
                    value={group.direction ?? 'row'}
                    onChange={(e) => onUpdate(name, { direction: e.target.value as FlexGroupConfig['direction'] })}
                  >
                    <option value="row">{t('layoutEditor.groupsPanel.directionRow')}</option>
                    <option value="row-reverse">{t('layoutEditor.groupsPanel.directionRowReverse')}</option>
                    <option value="column">{t('layoutEditor.groupsPanel.directionColumn')}</option>
                    <option value="column-reverse">{t('layoutEditor.groupsPanel.directionColumnReverse')}</option>
                  </Select>
                </Field>
                {/* Quartz's third container setting beside direction and gap (FlexGroupConfig.wrap);
                    without it a row of wide components overflows its area instead of breaking. The
                    default writes no key, as Quartz reads a missing one as "nowrap". */}
                <Field label={t('layoutEditor.groupsPanel.wrap')}>
                  <Select
                    value={group.wrap ?? 'nowrap'}
                    onChange={(e) => {
                      const wrap = e.target.value as NonNullable<FlexGroupConfig['wrap']>
                      onUpdate(name, { wrap: wrap === 'nowrap' ? undefined : wrap })
                    }}
                  >
                    <option value="nowrap">{t('layoutEditor.groupsPanel.wrapNone')}</option>
                    <option value="wrap">{t('layoutEditor.groupsPanel.wrapWrap')}</option>
                    <option value="wrap-reverse">{t('layoutEditor.groupsPanel.wrapReverse')}</option>
                  </Select>
                </Field>
                <Field label={t('layoutEditor.groupsPanel.gap')}>
                  <TextInput value={group.gap ?? ''} onChange={(e) => onUpdate(name, { gap: e.target.value })} placeholder="0.5rem" />
                </Field>
                <Field label={t('layoutEditor.groupsPanel.priority')}>
                  <TextInput
                    type="number"
                    value={group.priority ?? ''}
                    onChange={(e) => onUpdate(name, { priority: e.target.value === '' ? undefined : Number(e.target.value) })}
                    placeholder={t('layoutEditor.groupsPanel.priorityPlaceholder')}
                  />
                </Field>
              </div>
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
