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
            // items-end, not items-center: every control below now carries a label above it, so
            // aligning on the boxes rather than on the whole column keeps the row one line high.
            <div key={name} className="flex flex-wrap items-end gap-3 rounded-md border border-ink/[0.06] p-2 dark:border-ink/10">
              <span className={`mb-2.5 h-2 w-2 shrink-0 rounded-full ${color.dot}`} />
              <span className="mb-2 w-32 shrink-0 truncate text-sm font-medium">{name}</span>
              {/* Three unlabelled controls in a row, one of them offering bare CSS keywords, is
                  not a form - the direction values say what they do on the page now, and each
                  field carries its own label. */}
              <Field label={t('layoutEditor.groupsPanel.direction')} className="w-44">
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
              <Field label={t('layoutEditor.groupsPanel.gap')} className="w-28">
                <TextInput value={group.gap ?? ''} onChange={(e) => onUpdate(name, { gap: e.target.value })} placeholder="0.5rem" />
              </Field>
              <Field label={t('layoutEditor.groupsPanel.priority')} className="w-28">
                <TextInput
                  type="number"
                  value={group.priority ?? ''}
                  onChange={(e) => onUpdate(name, { priority: e.target.value === '' ? undefined : Number(e.target.value) })}
                  placeholder={t('layoutEditor.groupsPanel.priorityPlaceholder')}
                />
              </Field>
              <IconButton
                icon={Trash2}
                title={t('common.deleteNamed', { name })}
                onClick={() => onDelete(name)}
                className="mb-1.5 ml-auto"
              />
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
