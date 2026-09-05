import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { StyleSettingField, StyleSettingsSchema, ThemeStyleSettingsInfo } from '@shared/ipc-contract'
import { Select, TextInput, Toggle } from '../../components/ui'
import { colorEntries, keysOf, optionKey, readColor, type Mode } from './styleSettings'
import ColorPicker from './ColorPicker'

interface Group {
  heading?: StyleSettingField
  fields: StyleSettingField[]
  children: Group[]
}

// The theme author's `heading` entries and their `level` are the grouping - Obsidian's Style
// Settings renders exactly this hierarchy, and with 176 settings (Ultra Lobster) or 179
// (tokyo-night) it is the difference between a usable panel and a wall of switches.
function buildGroups(fields: StyleSettingField[]): Group[] {
  const root: Group = { fields: [], children: [] }
  const stack: { level: number; group: Group }[] = [{ level: 0, group: root }]

  for (const field of fields) {
    if (field.kind === 'heading') {
      const level = field.level ?? 1
      while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop()
      const group: Group = { heading: field, fields: [], children: [] }
      stack[stack.length - 1].group.children.push(group)
      stack.push({ level, group })
    } else {
      stack[stack.length - 1].group.fields.push(field)
    }
  }
  return root.children.length > 0 || root.fields.length > 0 ? [root] : []
}

/**
 * The labelled editor for a community theme's own options, built from the upstream Obsidian
 * theme's `@settings` block (see styleSettingsSchemaService). Falls back to nothing here - the
 * Theme tab decides whether to render this or its raw key/value editor.
 *
 * Class settings are cross-checked against what the *port* actually ships (`info.classSettingKeys`
 * from the installed theme.json): the upstream theme can declare toggles whose CSS the port didn't
 * carry over, and offering those would be offering switches that do nothing.
 */
export default function StyleSettingsForm({
  schema,
  info,
  values,
  onChange
}: {
  schema: StyleSettingsSchema
  info: ThemeStyleSettingsInfo
  values: Record<string, unknown>
  // One batched patch rather than a setter per key: an hsl-split themed color writes six keys at
  // once, and six separate calls would each apply to the same pre-change state and lose five.
  onChange: (patch: Record<string, unknown>) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const shippedClassKeys = useMemo(() => new Set(info.classSettingKeys), [info.classSettingKeys])

  const usable = useMemo(
    () =>
      schema.fields.filter((field) => {
        if (field.kind === 'unsupported') return false
        if (field.kind === 'class-toggle') return shippedClassKeys.has(field.id)
        return true
      }),
    [schema.fields, shippedClassKeys]
  )

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!q) return usable
    return usable.filter(
      (field) =>
        field.kind === 'heading' ||
        field.title.toLowerCase().includes(q) ||
        field.id.toLowerCase().includes(q) ||
        (field.description?.toLowerCase().includes(q) ?? false)
    )
  }, [usable, q])

  const groups = useMemo(() => buildGroups(filtered), [filtered])
  const settingCount = usable.filter((field) => field.kind !== 'heading' && field.kind !== 'info-text').length

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-muted">
          {t('styles.styleSettings.sourceNote', { theme: schema.themeName, author: schema.author, count: settingCount })}
        </p>
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('styles.styleSettings.searchPlaceholder')}
          className="w-56 text-xs"
        />
      </div>
      {groups.map((group, i) => (
        <GroupView
          key={i}
          group={group}
          values={values}
          onChange={onChange}
          shippedClassKeys={shippedClassKeys}
          forceOpen={q.length > 0}
          depth={0}
        />
      ))}
    </div>
  )
}

function hasAnyField(group: Group): boolean {
  return group.fields.length > 0 || group.children.some(hasAnyField)
}

function GroupView({
  group,
  values,
  onChange,
  shippedClassKeys,
  forceOpen,
  depth
}: {
  group: Group
  values: Record<string, unknown>
  onChange: (patch: Record<string, unknown>) => void
  shippedClassKeys: Set<string>
  forceOpen: boolean
  depth: number
}): JSX.Element | null {
  // The theme author's own `collapsed` flag decides the initial state, so a panel opens the way it
  // does in Obsidian rather than dumping every section at once.
  const [open, setOpen] = useState(!(group.heading?.collapsed ?? false))
  const isOpen = forceOpen || open
  // Recursive, not just "has children": a search that matches nothing inside a section leaves
  // behind sub-groups that are themselves empty, and a heading with nothing under it is noise.
  if (group.heading && !hasAnyField(group)) return null

  return (
    <div className={depth > 0 ? 'ml-3 border-l border-black/[0.06] pl-3 dark:border-white/10' : ''}>
      {group.heading && (
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="mt-2 flex w-full items-center gap-1.5 py-1 text-left"
        >
          {isOpen ? <ChevronDown size={13} className="shrink-0" /> : <ChevronRight size={13} className="shrink-0" />}
          <span className="text-xs font-semibold">{group.heading.title}</span>
        </button>
      )}
      {group.heading?.description && isOpen && (
        <p className="mb-1 pl-5 text-[11px] text-text-muted">{group.heading.description}</p>
      )}
      {isOpen && (
        <>
          <div className="flex flex-col gap-2 py-1">
            {group.fields.map((field) => (
              <FieldRow
                key={`${field.blockId}@@${field.id}`}
                field={field}
                values={values}
                onChange={onChange}
                shippedClassKeys={shippedClassKeys}
              />
            ))}
          </div>
          {group.children.map((child, i) => (
            <GroupView
              key={i}
              group={child}
              values={values}
              onChange={onChange}
              shippedClassKeys={shippedClassKeys}
              forceOpen={forceOpen}
              depth={depth + 1}
            />
          ))}
        </>
      )}
    </div>
  )
}

function FieldRow({
  field,
  values,
  onChange,
  shippedClassKeys
}: {
  field: StyleSettingField
  values: Record<string, unknown>
  onChange: (patch: Record<string, unknown>) => void
  shippedClassKeys: Set<string>
}): JSX.Element | null {
  const { t } = useTranslation()

  if (field.kind === 'info-text') {
    return (
      <p className="pl-5 text-[11px] text-text-muted">
        {field.title}
        {field.description ? ` — ${field.description}` : ''}
      </p>
    )
  }

  const keys = keysOf(field)
  const isSet = keys.some((key) => values[key] !== undefined)

  return (
    <div className="pl-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-xs" title={field.id}>
          {field.title}
        </span>
        <Control field={field} values={values} onChange={onChange} shippedClassKeys={shippedClassKeys} />
        {isSet && (
          <button
            type="button"
            onClick={() => onChange(Object.fromEntries(keys.map((k) => [k, undefined])))}
            className="text-[11px] text-text-muted underline"
          >
            {t('styles.styleSettings.reset')}
          </button>
        )}
      </div>
      {field.description && <p className="mt-0.5 text-[11px] text-text-muted">{field.description}</p>}
    </div>
  )
}

function Control({
  field,
  values,
  onChange,
  shippedClassKeys
}: {
  field: StyleSettingField
  values: Record<string, unknown>
  onChange: (patch: Record<string, unknown>) => void
  shippedClassKeys: Set<string>
}): JSX.Element | null {
  const { t } = useTranslation()
  const key = optionKey(field)

  switch (field.kind) {
    case 'class-toggle':
      return (
        <Toggle
          label={field.title}
          hideLabel
          checked={values[key] === true}
          onChange={(checked) => onChange({ [key]: checked ? true : undefined })}
        />
      )

    case 'class-select': {
      // A class select stores the chosen option's *class key*, and core only emits it if that key
      // exists in the port's classSettings - so unshipped options are dropped rather than offered.
      const options = (field.options ?? []).filter((option) => shippedClassKeys.has(option.value))
      if (options.length === 0) return null
      return (
        <Select
          value={typeof values[key] === 'string' ? (values[key] as string) : ''}
          onChange={(e) => onChange({ [key]: e.target.value || undefined })}
          className="w-44 text-xs"
        >
          <option value="">{t('styles.styleSettings.themeDefault')}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      )
    }

    case 'variable-select':
      return (
        <Select
          value={typeof values[key] === 'string' ? (values[key] as string) : ''}
          onChange={(e) => onChange({ [key]: e.target.value || undefined })}
          className="w-44 text-xs"
        >
          <option value="">{t('styles.styleSettings.themeDefault')}</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      )

    case 'variable-number':
    case 'variable-number-slider': {
      const stored = values[key]
      const value = stored === undefined ? '' : String(stored)
      const placeholder = field.default !== undefined ? String(field.default) : ''
      return (
        <div className="flex items-center gap-2">
          {field.kind === 'variable-number-slider' && field.min !== undefined && field.max !== undefined && (
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step ?? 1}
              value={value === '' ? Number(field.default ?? field.min) : Number(value)}
              onChange={(e) => onChange({ [key]: Number(e.target.value) })}
              className="w-32"
            />
          )}
          <TextInput
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange({ [key]: e.target.value === '' ? undefined : Number(e.target.value) })}
            className="w-20 text-xs"
          />
        </div>
      )
    }

    case 'variable-text':
      return (
        <TextInput
          value={typeof values[key] === 'string' ? (values[key] as string) : ''}
          placeholder={typeof field.default === 'string' ? field.default : ''}
          onChange={(e) => onChange({ [key]: e.target.value === '' ? undefined : e.target.value })}
          className="w-44 text-xs"
        />
      )

    case 'variable-color':
      return <ColorControl field={field} values={values} onChange={onChange} />

    case 'variable-themed-color':
      return (
        <div className="flex items-center gap-3">
          <ColorControl field={field} values={values} onChange={onChange} mode="light" label={t('styles.variables.light')} />
          <ColorControl field={field} values={values} onChange={onChange} mode="dark" label={t('styles.variables.dark')} />
        </div>
      )

    default:
      return null
  }
}

function ColorControl({
  field,
  values,
  onChange,
  mode,
  label
}: {
  field: StyleSettingField
  values: Record<string, unknown>
  onChange: (patch: Record<string, unknown>) => void
  mode?: Mode
  label?: string
}): JSX.Element {
  const { hex, isSet } = readColor(field, values, mode)
  return (
    <div className="flex items-center gap-1.5">
      {label && <span className="text-[11px] text-text-muted">{label}</span>}
      <ColorPicker
        value={hex ?? undefined}
        hex={hex ?? null}
        onChange={(next) => onChange(colorEntries(field, next, mode))}
        className={isSet ? 'border-green-500' : 'border-slate-300 dark:border-white/20'}
      />
    </div>
  )
}
