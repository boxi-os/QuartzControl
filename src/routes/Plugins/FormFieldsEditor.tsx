import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowDown,
  ArrowUp,
  AtSign,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  CircleDot,
  EyeOff,
  GripVertical,
  Hash,
  KeyRound,
  Link,
  List,
  ListChecks,
  Phone,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Type,
  AlignLeft,
  type LucideIcon
} from 'lucide-react'
import type { NormalizedOptionSchema } from '@shared/ipc-contract'
import { Badge, Button, Field, FieldGroup, IconButton, SegmentedControl, Select, Toggle, focusRowAt } from '../../components/ui'
import PluginOptionsForm from '../../components/PluginOptionsForm'
import type { FormLanguage } from '../../components/PluginOptionsForm/text'
import { announce } from '../../state/announcer'
import { confirmDialog } from '../../utils/confirm'
import { useDndAccessibility } from '../../utils/dndAnnouncements'
import { useProject } from '../ProjectLayout'
import {
  FIELD_GROUPS,
  INPUT_KEYS,
  SAME_SHAPE,
  TEMPLATES,
  fieldLabel,
  fieldNameProblem,
  fieldVariant,
  freeFieldName,
  isObject,
  isPersonalField,
  isTemplate,
  type FieldDef,
  type FieldType,
  type PlacedMessage,
  type FormDef
} from './formsOptions'
import { DraftInput } from './DraftInput'
import { TextEditor } from './FormText'

const TYPE_ICONS: Record<FieldType, LucideIcon> = {
  text: Type,
  textarea: AlignLeft,
  email: AtSign,
  tel: Phone,
  url: Link,
  number: Hash,
  date: Calendar,
  select: List,
  radio: CircleDot,
  checkboxes: ListChecks,
  checkbox: CheckSquare,
  scale: SlidersHorizontal,
  consent: ShieldCheck,
  pgpKey: KeyRound,
  hidden: EyeOff
}

// The keys the editor shows with its own controls; the rest of a type's keys go through the
// plugin's form (fieldVariant), so the schema's own words and limits explain them.
const OWN_KEYS = new Set(['type', 'name', 'label', 'hint', 'required', 'placeholder', 'options', 'text', 'linkLabel', 'minLabel', 'maxLabel', 'width', 'layout'])

// quartz-forms 0.4.0: a field spans the form, half or a third of it (`width`, every visible type).
const WIDTHS = ['full', 'half', 'third'] as const

/**
 * The fields of one form (plan 1.2, phase 3): a list sorted by dragging (dnd-kit, as everywhere
 * since the ninth review) or by the arrow pair, one field open at a time with the keys its type
 * reads, and "Feld hinzufügen" as tiles by type. A form whose fields are its template's shows
 * them to read, with one button that makes them its own.
 */
export function FormFieldsEditor({
  def,
  fields,
  schema,
  languages,
  lang,
  anonymous,
  fieldMessages,
  onFields
}: {
  def: FormDef
  /** The form's own fields, or the template's while it has none. */
  fields: FieldDef[]
  /** The schema of one form (formSchema). */
  schema: NormalizedOptionSchema | null
  languages: string[]
  lang: FormLanguage
  anonymous: boolean
  /** The plugin's problems that name a field by its place (`fields[i]`). */
  fieldMessages: PlacedMessage[]
  onFields: (next: FieldDef[]) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  const fromTemplate = isTemplate(def.template) && !Array.isArray(def.fields)
  // Sortable ids must be unique; a name written twice by hand gets its place appended.
  const ids = fields.map((f, i) => (fields.findIndex((g) => g.name === f.name) === i ? f.name : `${f.name}#${i}`))
  const names = useMemo(() => new Map(ids.map((id, i) => [id, fieldLabel(fields[i], lang)])), [ids, fields, lang])
  const { announcements, screenReaderInstructions } = useDndAccessibility(t, (id) => names.get(id) ?? '')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  const typeName = (type: string): string => t(`formsEditor.fieldTypes.${type}`, type)
  const move = (from: number, to: number, said = true): void => {
    if (to < 0 || to >= fields.length || from === to) return
    const next = [...fields]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onFields(next)
    if (said) announce(t('formsEditor.fieldMovedAnnounce', { name: fieldLabel(item, lang), n: to + 1, count: fields.length }))
  }
  const update = (index: number, next: FieldDef): void => onFields(fields.map((f, i) => (i === index ? next : f)))

  async function remove(index: number): Promise<void> {
    const name = fieldLabel(fields[index], lang)
    if (!(await confirmDialog({ text: t('formsEditor.removeFieldConfirm', { name }), confirmLabel: t('common.remove'), danger: true }))) return
    onFields(fields.filter((_, i) => i !== index))
    announce(t('formsEditor.fieldRemovedAnnounce', { name }))
    focusRowAt(listRef.current, index)
  }

  function add(type: FieldType): void {
    const taken = fields.map((f) => f.name)
    const name = freeFieldName(t(`formsEditor.fieldNames.${type}`, type), taken)
    const label = typeName(type)
    const field: FieldDef =
      type === 'consent'
        ? { type, name, text: t('formsEditor.consentDefault') }
        : type === 'hidden'
          ? { type, name, value: 'web' }
          : type === 'scale'
            ? { type, name, label, min: 1, max: 5 }
            : type === 'select' || type === 'radio' || type === 'checkboxes'
              ? {
                  type,
                  name,
                  label,
                  options: [
                    { value: 'a', label: t('formsEditor.optionDefault', { n: 1 }) },
                    { value: 'b', label: t('formsEditor.optionDefault', { n: 2 }) }
                  ]
                }
              : { type, name, label }
    onFields([...fields, field])
    setAdding(false)
    setOpen(name)
    announce(t('formsEditor.fieldAddedAnnounce', { name: label }))
  }

  function onDragEnd(event: DragEndEvent): void {
    const { active, over } = event
    if (!over || active.id === over.id) return
    move(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)), false)
  }

  if (fromTemplate) {
    const template = TEMPLATES[def.template as keyof typeof TEMPLATES]
    const own = (template.fields as FieldDef[]) ?? []
    return (
      <div className="flex flex-col gap-2">
        <p className="text-micro text-text-muted">{t('formsEditor.templateFieldsNote')}</p>
        <ul className="flex flex-col gap-1">
          {own.map((f) => (
            <li key={f.name} className="flex items-center gap-2 rounded-md border border-ink/10 px-2.5 py-1.5 text-ui dark:border-ink/10">
              <TypeIcon type={f.type} />
              <span className="min-w-0 flex-1 truncate">{fieldLabel(f, lang)}</span>
              <span className="text-micro text-text-muted">{typeName(f.type)}</span>
            </li>
          ))}
        </ul>
        <div>
          <Button variant="ghost" onClick={() => onFields(structuredClone(own))}>
            {t('formsEditor.takeTemplateFields')}
          </Button>
        </div>
      </div>
    )
  }

  const hasPgpKey = fields.some((f) => f.type === 'pgpKey')
  return (
    <div className="flex flex-col gap-2">
      {fields.length === 0 && <p className="text-micro text-amber-700 dark:text-amber-400">{t('formsEditor.noFields')}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={{ announcements, screenReaderInstructions }}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul ref={listRef} className="flex flex-col gap-1.5">
            {fields.map((f, i) => (
              <SortableField
                key={ids[i]}
                id={ids[i]}
                field={f}
                index={i}
                count={fields.length}
                isOpen={open === f.name}
                label={fieldLabel(f, lang)}
                typeName={typeName(f.type)}
                optionalByAnonymous={anonymous && f.required === true && isPersonalField(f)}
                problems={fieldMessages.filter((m) => m.field === i)}
                onToggle={() => setOpen(open === f.name ? null : f.name)}
                onMove={(by) => move(i, i + by)}
                onRemove={() => void remove(i)}
              >
                <FieldEditor
                  field={f}
                  others={fields.filter((_, j) => j !== i).map((g) => g.name)}
                  schema={schema}
                  languages={languages}
                  hasPgpKey={hasPgpKey}
                  onField={(next) => {
                    if (next.name !== f.name && open === f.name) setOpen(next.name)
                    update(i, next)
                  }}
                />
              </SortableField>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {adding ? (
        <AddFieldTiles hasPgpKey={hasPgpKey} onAdd={add} onCancel={() => setAdding(false)} />
      ) : (
        <div>
          <Button variant="ghost" onClick={() => setAdding(true)}>
            <Plus size={14} aria-hidden />
            {t('formsEditor.addField')}
          </Button>
        </div>
      )}
    </div>
  )
}

function TypeIcon({ type }: { type: string }): JSX.Element {
  const Icon = TYPE_ICONS[type as FieldType] ?? Type
  return <Icon size={14} aria-hidden className="shrink-0 text-text-secondary" />
}

function SortableField({
  id,
  field,
  index,
  count,
  isOpen,
  label,
  typeName,
  optionalByAnonymous,
  problems,
  onToggle,
  onMove,
  onRemove,
  children
}: {
  id: string
  field: FieldDef
  index: number
  count: number
  isOpen: boolean
  label: string
  typeName: string
  optionalByAnonymous: boolean
  problems: PlacedMessage[]
  onToggle: () => void
  onMove: (by: -1 | 1) => void
  onRemove: () => void
  children: React.ReactNode
}): JSX.Element {
  const { t } = useTranslation()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  const required = field.type === 'consent' || field.required === true
  return (
    <li
      ref={setNodeRef}
      data-selectable
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex flex-col rounded-md border border-ink/10 bg-surface dark:border-ink/10 ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          title={t('pluginsInstalled.dragHint')}
          aria-label={t('formsEditor.dragField', { name: label })}
          className="flex shrink-0 cursor-grab select-none items-center rounded-[6px] border border-ink/10 bg-ink/[0.03] p-1 text-text-secondary transition-colors hover:border-ink/20 hover:bg-ink/[0.08] hover:text-text active:cursor-grabbing"
        >
          <GripVertical size={14} aria-hidden />
        </button>
        <button type="button" aria-pressed={isOpen} aria-expanded={isOpen} onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          {isOpen ? <ChevronDown size={14} aria-hidden className="shrink-0 text-text-muted" /> : <ChevronRight size={14} aria-hidden className="shrink-0 text-text-muted" />}
          <TypeIcon type={field.type} />
          <span className="min-w-0 flex-1 truncate text-ui text-text">{label}</span>
          {(field.width === 'half' || field.width === 'third') && (
            <span className="shrink-0 text-micro text-text-muted" title={t(`formsEditor.widthBadge.${field.width}`)}>
              <span aria-hidden>{field.width === 'half' ? '½' : '⅓'}</span>
              <span className="sr-only">{t(`formsEditor.widthBadge.${field.width}`)}</span>
            </span>
          )}
          <span className="shrink-0 text-micro text-text-muted">{typeName}</span>
        </button>
        {problems.length > 0 && <Badge tone="red">{t('formsEditor.check.problemBadge', { count: problems.length })}</Badge>}
        {required && !optionalByAnonymous && <Badge>{t('formsEditor.requiredBadge')}</Badge>}
        {optionalByAnonymous && <Badge tone="amber">{t('formsEditor.optionalByAnonymousBadge')}</Badge>}
        <IconButton icon={ArrowUp} tone="neutral" title={t('pluginsInstalled.moveUp', { name: label })} onClick={() => onMove(-1)} disabled={index === 0} />
        <IconButton icon={ArrowDown} tone="neutral" title={t('pluginsInstalled.moveDown', { name: label })} onClick={() => onMove(1)} disabled={index === count - 1} />
        <IconButton icon={Trash2} title={t('common.removeNamed', { name: label })} onClick={onRemove} />
      </div>
      {isOpen && (
        <div className="flex flex-col gap-3 border-t border-ink/[0.06] px-3 py-3 dark:border-ink/10">
          {problems.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {problems.map((m, j) => (
                <li key={j} className="break-words font-mono text-micro text-red-600 dark:text-red-400">
                  {m.rest || m.text}
                </li>
              ))}
            </ul>
          )}
          {children}
        </div>
      )}
    </li>
  )
}

function AddFieldTiles({ hasPgpKey, onAdd, onCancel }: { hasPgpKey: boolean; onAdd: (type: FieldType) => void; onCancel: () => void }): JSX.Element {
  const { t } = useTranslation()
  return (
    <div
      className="flex flex-col gap-3 rounded-md border border-ink/10 p-3 dark:border-ink/10"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
      }}
    >
      {(Object.keys(FIELD_GROUPS) as (keyof typeof FIELD_GROUPS)[]).map((group) => (
        <FieldGroup key={group} label={t(`formsEditor.fieldGroups.${group}`)}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-1.5">
            {FIELD_GROUPS[group].map((type) => {
              const Icon = TYPE_ICONS[type]
              const disabled = type === 'pgpKey' && hasPgpKey
              return (
                <button
                  key={type}
                  type="button"
                  disabled={disabled}
                  title={disabled ? t('formsEditor.onePgpKey') : t(`formsEditor.fieldTypeHints.${type}`)}
                  onClick={() => onAdd(type)}
                  className="flex items-center gap-2 rounded-md border border-ink/10 px-2.5 py-2 text-left text-ui text-text transition-colors hover:border-ink/20 hover:bg-ink/[0.04] disabled:cursor-not-allowed disabled:text-text-muted dark:border-ink/10"
                >
                  <Icon size={14} aria-hidden className="shrink-0 text-text-secondary" />
                  {t(`formsEditor.fieldTypes.${type}`)}
                </button>
              )
            })}
          </div>
        </FieldGroup>
      ))}
      <div>
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  )
}

function FieldEditor({
  field,
  others,
  schema,
  languages,
  hasPgpKey,
  onField
}: {
  field: FieldDef
  others: string[]
  schema: NormalizedOptionSchema | null
  languages: string[]
  hasPgpKey: boolean
  onField: (next: FieldDef) => void
}): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const problem = nameDraft === null ? null : fieldNameProblem(nameDraft, others)
  const set = (key: string, value: unknown): void => {
    const next: FieldDef = { ...field }
    if (value === undefined) delete next[key]
    else next[key] = value
    onField(next)
  }
  const shape = SAME_SHAPE.find((s) => s.includes(field.type))
  const variant = useMemo<NormalizedOptionSchema | null>(() => {
    const fields = fieldVariant(schema, field.type)
    return schema && fields.length ? { source: schema.source, fields, notes: [] } : null
  }, [schema, field.type])
  const typeKeys = INPUT_KEYS[field.type]
  // The plugin's form for the keys this type reads beyond the ones above - and any key the field
  // sets that the editor does not know, so nothing is hidden.
  const pick = useCallback(
    (key: string) => !OWN_KEYS.has(key) && (typeKeys ? typeKeys.includes(key) || key in field : true),
    [typeKeys, field]
  )
  const flat = useMemo(() => ({ flat: true }), [])
  const hasLabel = field.type !== 'consent' && field.type !== 'hidden'

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('formsEditor.fieldName')} hint={t('formsEditor.fieldNameHint')}>
          <DraftInput
            value={field.name}
            aria-invalid={!!problem}
            onDraft={(v) => setNameDraft(v.trim())}
            onCommit={(v) => {
              const to = v.trim()
              setNameDraft(null)
              if (to === field.name || fieldNameProblem(to, others)) return
              set('name', to)
            }}
          />
        </Field>
        <Field label={t('formsEditor.fieldType')}>
          {shape ? (
            <Select
              value={field.type}
              onChange={(e) => {
                // A select's options are a list to open: its `layout` would do nothing (the plugin says so).
                const next: FieldDef = { ...field, type: e.target.value }
                if (next.type === 'select') delete next.layout
                onField(next)
              }}
            >
              {shape.map((type) => (
                <option key={type} value={type} disabled={type === 'pgpKey' && hasPgpKey && field.type !== 'pgpKey'}>
                  {t(`formsEditor.fieldTypes.${type}`)}
                </option>
              ))}
            </Select>
          ) : (
            <span className="py-1.5 text-ui text-text">{t(`formsEditor.fieldTypes.${field.type}`, field.type)}</span>
          )}
        </Field>
      </div>
      {problem && <p className="-mt-2 text-micro text-red-600 dark:text-red-400">{t(`formsEditor.fieldNameProblem.${problem}`)}</p>}

      {hasLabel && <TextEditor label={t('formsEditor.fieldLabel')} value={field.label} languages={languages} required onValue={(v) => set('label', v)} />}
      {field.type === 'consent' && (
        <>
          <TextEditor label={t('formsEditor.consentText')} value={field.text} languages={languages} multiline required onValue={(v) => set('text', v)} />
          <TextEditor label={t('formsEditor.consentLinkLabel')} hint={t('formsEditor.consentLinkLabelHint')} value={field.linkLabel} languages={languages} onValue={(v) => set('linkLabel', v)} />
        </>
      )}
      {field.type === 'scale' && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextEditor label={t('formsEditor.minLabel')} value={field.minLabel} languages={languages} onValue={(v) => set('minLabel', v)} />
          <TextEditor label={t('formsEditor.maxLabel')} value={field.maxLabel} languages={languages} onValue={(v) => set('maxLabel', v)} />
        </div>
      )}
      {hasLabel && field.type !== 'checkbox' && field.type !== 'scale' && typeKeys?.includes('placeholder') && (
        <TextEditor label={t('formsEditor.placeholder')} value={field.placeholder} languages={languages} onValue={(v) => set('placeholder', v)} />
      )}
      {hasLabel && <TextEditor label={t('formsEditor.fieldHint')} hint={t('formsEditor.fieldHintHint')} value={field.hint} languages={languages} onValue={(v) => set('hint', v)} />}
      {hasLabel && <Toggle label={t('formsEditor.required')} checked={field.required === true} onChange={(on) => set('required', on ? true : undefined)} />}
      {field.type !== 'hidden' && (
        <FieldGroup label={t('formsEditor.fieldWidth')}>
          <SegmentedControl
            label={t('formsEditor.fieldWidth')}
            value={(WIDTHS as readonly unknown[]).includes(field.width) ? (field.width as (typeof WIDTHS)[number]) : 'full'}
            options={WIDTHS.map((w) => ({ value: w, label: t(`formsEditor.fieldWidths.${w}`) }))}
            onChange={(w) => set('width', w === 'full' ? undefined : w)}
          />
          <span className="text-micro text-text-muted">{t('formsEditor.fieldWidthHint')}</span>
        </FieldGroup>
      )}
      {(field.type === 'select' || field.type === 'radio' || field.type === 'checkboxes') && (
        <ChoiceOptions value={field.options} languages={languages} onValue={(v) => set('options', v)} />
      )}
      {(field.type === 'radio' || field.type === 'checkboxes') && (
        <FieldGroup label={t('formsEditor.optionLayout')}>
          <SegmentedControl
            label={t('formsEditor.optionLayout')}
            value={field.layout === 'inline' ? 'inline' : 'stacked'}
            options={(['stacked', 'inline'] as const).map((l) => ({ value: l, label: t(`formsEditor.optionLayouts.${l}`) }))}
            onChange={(l) => set('layout', l === 'inline' ? l : undefined)}
          />
        </FieldGroup>
      )}
      {variant && (
        <PluginOptionsForm schema={variant} values={field} onChange={(next) => onField((next ?? { type: field.type, name: field.name }) as FieldDef)} explicitEmpty={false} languages={languages} projectPath={project.path} pick={pick} freeKeys={false} root={flat} />
      )}
    </>
  )
}

function ChoiceOptions({ value, languages, onValue }: { value: unknown; languages: string[]; onValue: (next: { value: string; label: unknown }[]) => void }): JSX.Element {
  const { t } = useTranslation()
  const list = Array.isArray(value) ? value.filter(isObject).map((o) => ({ value: typeof o.value === 'string' ? o.value : String(o.value ?? ''), label: o.label })) : []
  const set = (i: number, change: Partial<{ value: string; label: unknown }>): void => onValue(list.map((o, j) => (j === i ? { ...o, ...change } : o)))
  return (
    <FieldGroup label={t('formsEditor.choiceOptions')}>
      <ul className="flex flex-col gap-2">
        {list.map((o, i) => (
          <li key={i} className="flex flex-col gap-1.5 rounded-md border border-ink/10 p-2 dark:border-ink/10">
            <div className="flex items-end gap-2">
              <Field label={t('formsEditor.optionValue')} className="w-32 shrink-0">
                <DraftInput value={o.value} onCommit={(v) => v.trim() && set(i, { value: v.trim() })} />
              </Field>
              <div className="min-w-0 flex-1">
                <TextEditor label={t('formsEditor.optionLabel')} value={o.label} languages={languages} required onValue={(v) => set(i, { label: v ?? o.label })} />
              </div>
              {/* The plugin refuses a choice without options; the last one stays. */}
              <IconButton icon={Trash2} title={t('common.removeNamed', { name: o.value })} disabled={list.length === 1} onClick={() => onValue(list.filter((_, j) => j !== i))} />
            </div>
          </li>
        ))}
      </ul>
      <div>
        <Button
          variant="ghost"
          onClick={() => {
            const values = list.map((o) => o.value)
            let n = list.length + 1
            while (values.includes(String(n))) n++
            onValue([...list, { value: String(n), label: t('formsEditor.optionDefault', { n }) }])
          }}
        >
          <Plus size={14} aria-hidden />
          {t('formsEditor.addOption')}
        </Button>
      </div>
      <span className="text-micro text-text-muted">{t('formsEditor.choiceOptionsHint')}</span>
    </FieldGroup>
  )
}
