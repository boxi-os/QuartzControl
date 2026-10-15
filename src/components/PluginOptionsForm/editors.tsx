import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ArrowDown, ArrowUp, RotateCcw, Trash2 } from 'lucide-react'
import type { OptionEnumValue, OptionField, OptionNode } from '@shared/ipc-contract'
import { evaluateCondition, nodeAccepts, setAtPath } from '@shared/pluginOptionSchema'
import { Button, DIVIDED_ROWS, FoldBox, IconButton, Select, TextInput, Toggle } from '../ui'
import { enumLabel, fieldMatch, fieldText, inlineValue, isEmptyObject, isPlainObject, type FormLanguage } from './text'
import { ImageButton, PlaceholderList, SnippetFileField, siblingValue } from './snippets'

export interface FormContext {
  lang: FormLanguage
  /** Offer "set empty" on text fields - see FieldRow in Plugins/Installed.tsx for why. */
  explicitEmpty: boolean
  /** The site's language codes, for a record whose keys are languages (layout-box's byLang). */
  languages: string[]
  /** The project the options belong to, for the editors that read and write files (snippets.tsx). Without it they are text fields. */
  projectPath?: string
  /** The form's search, lower-cased; empty: no search. See fieldMatch. */
  query: string
}

/**
 * Where a condition inside a record entry looks for what it does not find in the entry itself.
 * layout-box's byLang entries are laid over the options above them, so `collapsed` in an entry
 * applies when `collapsible` is on *above* - the entry need not repeat it (found while writing the
 * schema, P2 of 1.1).
 */
interface Inherited {
  values: Record<string, unknown>
  fields: readonly OptionField[]
}

// max-w-full and the wrapping row below: the layout board's side panel is 20rem wide, and a
// fixed 14rem field with its reset button ran past it (P7.4, measured: 25 px at navigations).
const INPUT_WIDTH = 'w-56 max-w-full'

// ── one object: its fields in order, by group, the inactive ones greyed where they stand ──

/**
 * What the two editors with tiles above the form (navigations, layout-box) add on the top level -
 * the form alone knows only the schema's `when`.
 */
export interface RootExtras {
  /** A reason beyond `when` why a field does nothing right now - quartz-navigations' rendering
   *  code says more than its schema (navigationVariants.ts, hasNoEffect). */
  inactiveReason?: (key: string) => string | null
  /** Shown only while set: the options of the variants not chosen. Set, they stay in sight,
   *  greyed, so a value that does nothing is not also a value nobody can see. */
  hideUnlessSet?: (key: string) => boolean
  /** These fields first, open and not foldable, under the given title - the section the tiles
   *  above it switch. Chosen by the app's table, not by a group name, so an older schema of the
   *  plugin fills it too. */
  lead?: { has: (key: string) => boolean; title: string; empty: string }
}

export function ObjectBlock({
  fields,
  values,
  onValue,
  ctx,
  inherit,
  extra,
  root
}: {
  fields: readonly OptionField[]
  values: Record<string, unknown>
  onValue: (next: Record<string, unknown>) => void
  ctx: FormContext
  inherit?: Inherited
  /** Rendered at the end of the block - the root puts the free key/value row there. */
  extra?: React.ReactNode
  root?: RootExtras
}): JSX.Element {
  const { t } = useTranslation()
  // A child that leaves its object empty takes the key with it: `byLang: { en: {} }` says
  // "configured" about something that is not.
  const set = (key: string, value: unknown): void => onValue(setAtPath(values, [key], isEmptyObject(value) ? undefined : value))

  // Ordered where the schema orders, otherwise as the schema lists them.
  const ordered = fields.some((f) => f.order !== undefined)
    ? [...fields].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    : [...fields]
  const conditionValues = inherit ? { ...inherit.values, ...values } : values
  const conditionFields = inherit ? inherit.fields : fields
  // Why a field does nothing now, or null. The app's reason first: where it has one, it names the
  // variants, which says more than the schema's condition on the same field.
  const inactiveReason = (f: OptionField): string | null =>
    root?.inactiveReason?.(f.key) ??
    (evaluateCondition(f.when, conditionValues, conditionFields) ? null : conditionText(f, conditionFields, ctx.lang, t))

  // While searching, a field stays when it or something inside it matches - and one that matched
  // by its own words hands its children an empty search, so they are all there under it.
  const searching = ctx.query !== ''
  const match = (f: OptionField): 'self' | 'child' | 'none' => fieldMatch(f, ctx.query, ctx.lang)
  // An option of another variant stands only while set - or while it is searched for: hidden then,
  // a search for "flyout" under Accordion found it, said nothing and showed an empty form.
  const shown = ordered.filter((f) => searching || values[f.key] !== undefined || !root?.hideUnlessSet?.(f.key) || !inactiveReason(f))
  const found = shown.filter((f) => match(f) !== 'none')
  const described = found.filter((f) => f.origin !== 'config')
  const unknown = found.filter((f) => f.origin === 'config')
  const lead = root?.lead
  // In the lead, what works comes first: what does nothing there belongs to another variant and
  // stands only because it is set. In the groups below every field keeps its place.
  const leading = lead ? described.filter((f) => lead.has(f.key)).sort((a, b) => Number(inactiveReason(a) !== null) - Number(inactiveReason(b) !== null)) : []
  const rest = lead ? described.filter((f) => !lead.has(f.key)) : described

  // In a record entry an unset field is not "the plugin's default" but "what stands above": the
  // entry is laid over the options of its parent. Shown as such, a switch that is on above read as
  // off in the entry (measured in the built app on layout-box's byLang, 1.1 P3).
  const fallbackOf = (f: OptionField): { value: unknown } | undefined => {
    if (!inherit) return undefined
    if (inherit.values[f.key] !== undefined) return { value: inherit.values[f.key] }
    const above = inherit.fields.find((g) => g.key === f.key)
    return above?.hasDefault ? { value: above.default } : undefined
  }
  const row = (f: OptionField): JSX.Element => (
    <FieldRow
      key={f.key}
      field={f}
      value={values[f.key]}
      onValue={(v) => set(f.key, v)}
      ctx={searching && match(f) === 'self' ? { ...ctx, query: '' } : ctx}
      inherit={{ values: conditionValues, fields: conditionFields }}
      inherited={fallbackOf(f)}
      inactive={inactiveReason(f) ?? undefined}
    />
  )
  // A group's rarely needed fields stay in it, after the others: one basket for all of them was a
  // box called "2 more settings" holding a class name, a sort switch and a breakpoint.
  const rows = (list: OptionField[]): React.ReactNode => {
    const common = list.filter((f) => !f.advanced)
    const rare = list.filter((f) => f.advanced)
    return (
      <>
        {common.map(row)}
        {rare.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <p className="text-micro font-semibold uppercase tracking-wide text-text-muted">{t('pluginOptions.rarelyUsed')}</p>
            <div className={`flex flex-col gap-3.5 ${DIVIDED_ROWS}`}>{rare.map(row)}</div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {lead && (leading.length > 0 || !searching) && (
        <FoldBox title={lead.title} aside={searching ? t('pluginOptions.matches', { count: leading.length }) : undefined} open locked onToggle={() => {}} bodyClassName={`gap-3.5 ${DIVIDED_ROWS}`}>
          {leading.length > 0 ? rows(leading) : <p className="text-micro text-text-muted">{lead.empty}</p>}
        </FoldBox>
      )}
      {groupsOf(rest, ctx.lang).map(([group, list], i) =>
        group ? (
          // Folded unless it is the first group or holds a value someone set: navigations has 46
          // options in seven groups, and all of them open is the list this form was meant to end.
          <GroupSection
            key={group}
            title={group}
            count={list.length}
            changed={list.filter((f) => values[f.key] !== undefined).length}
            defaultOpen={i === 0 || list.some((f) => values[f.key] !== undefined)}
            searching={searching}
          >
            {rows(list)}
          </GroupSection>
        ) : (
          <section key="" className={`flex flex-col gap-3.5 ${DIVIDED_ROWS}`}>
            {rows(list)}
          </section>
        )
      )}
      {(unknown.length > 0 || (extra && !searching)) && (
        <section className="flex flex-col gap-2.5 border-t border-dashed border-ink/10 pt-2.5 dark:border-ink/10">
          <h4 className="text-micro font-semibold uppercase tracking-wide text-text-secondary">{t('pluginOptions.moreKeys')}</h4>
          {unknown.length > 0 && <p className="text-micro text-text-muted">{t('pluginOptions.moreKeysHint')}</p>}
          {unknown.map(row)}
          {!searching && extra}
        </section>
      )}
    </div>
  )
}

/** "Only applies with variant = Bar, Tabs." - a field's `when`, in the words of the form. */
function conditionText(field: OptionField, siblings: readonly OptionField[], lang: FormLanguage, t: TFunction): string {
  const parts = Object.entries(field.when ?? {}).map(([path, allowed]) => {
    const head = siblings.find((f) => f.key === path)
    const name = (head && fieldText(head, lang).title) ?? path
    const list = (Array.isArray(allowed) ? allowed : [allowed]).map((v) => enumLabel(head, v, lang))
    return t('pluginOptions.conditionPart', { name, values: list.join(', ') })
  })
  return t('pluginOptions.onlyWhen', { conditions: parts.join('; ') })
}

/** A group of options that folds - FoldBox, with the count on the right. While searching it is
 *  held open and the count says how many fields matched; the title stays what it is. */
function GroupSection({
  title,
  count,
  changed,
  defaultOpen,
  searching,
  children
}: {
  title: string
  count: number
  changed: number
  defaultOpen: boolean
  searching: boolean
  children: React.ReactNode
}): JSX.Element {
  const { t } = useTranslation()
  const [open, setOpen] = useState(defaultOpen)
  return (
    <FoldBox
      title={title}
      aside={
        searching
          ? t('pluginOptions.matches', { count })
          : changed > 0
            ? t('pluginOptions.groupCountChanged', { count, changed })
            : count
      }
      open={open || searching}
      locked={searching}
      onToggle={() => setOpen((v) => !v)}
      bodyClassName={`gap-3.5 ${DIVIDED_ROWS}`}
    >
      {children}
    </FoldBox>
  )
}

function groupsOf(fields: OptionField[], lang: FormLanguage): [string | undefined, OptionField[]][] {
  const groups = new Map<string | undefined, OptionField[]>()
  for (const f of fields) {
    const g = fieldText(f, lang).group
    groups.set(g, [...(groups.get(g) ?? []), f])
  }
  // Ungrouped first: a schema that groups some fields and not others means the rest to come first.
  return [...groups].sort((a, b) => (a[0] === undefined ? -1 : b[0] === undefined ? 1 : 0))
}

// ── one field: label, control, reset, explanation ─────────────────────────────

const BLOCK_KINDS = new Set<OptionNode['kind']>(['object', 'record', 'array', 'json'])

function FieldRow({
  field,
  value,
  onValue,
  ctx,
  inherit,
  inherited,
  inactive
}: {
  field: OptionField
  value: unknown
  onValue: (v: unknown) => void
  ctx: FormContext
  inherit: Inherited
  /** In a record entry: the value an unset field takes from above. */
  inherited?: { value: unknown }
  /** Why the field does nothing right now. Greyed where it stands, not disabled: the label goes
   *  muted, the control stays readable and usable, the reason stands under it (CLAUDE.md, a field
   *  whose value does not apply is not disabled). */
  inactive?: string
}): JSX.Element {
  const { t } = useTranslation()
  const id = useId()
  const text = fieldText(field, ctx.lang)
  const isSet = value !== undefined
  const block = BLOCK_KINDS.has(field.node.kind)
  // The key is the control's label, as on the rest of the page; a switch names itself (Toggle's
  // hidden label), so its visible key is not a <label> of a second control.
  // The plugin's own words first where it has any, the key beside them - the key is what stands in
  // quartz.config.yaml, the title what one reads. A set value says so: the reset button alone is a
  // grey arrow at the end of the row, and "which of these did I change" is the question a long form
  // gets asked most.
  const Key = field.node.kind === 'boolean' ? 'span' : 'label'
  const label = (
    <Key {...(field.node.kind === 'boolean' ? {} : { htmlFor: id })} className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
      {text.title && <span className={`text-ui font-medium ${inactive ? 'text-text-muted' : 'text-text'}`}>{text.title}</span>}
      <span className={`break-all font-mono ${text.title || inactive ? 'text-micro text-text-muted' : 'text-xs font-medium text-text-secondary'}`}>{field.key}</span>
      {isSet && <span className="text-micro font-medium text-accent-text">{t('pluginOptions.changed')}</span>}
    </Key>
  )
  // "Back to what the plugin does without me": the key goes. Named after what it does - with a
  // default it returns to the default, without one the option is simply not set any more.
  const reset = isSet ? (
    <IconButton
      icon={RotateCcw}
      tone="neutral"
      title={
        inherited
          ? t('pluginOptions.resetInheritNamed', { name: field.key })
          : field.hasDefault
            ? t('pluginOptions.resetNamed', { name: field.key })
            : t('pluginOptions.removeNamed', { name: field.key })
      }
      onClick={() => onValue(undefined)}
    />
  ) : null
  const editor = (
    <NodeEditor
      id={id}
      node={field.node}
      field={field}
      value={value}
      defaultValue={inherited ? inherited.value : field.hasDefault ? field.default : undefined}
      hasDefault={inherited ? true : field.hasDefault}
      fromAbove={inherited !== undefined}
      onValue={onValue}
      ctx={ctx}
      inherit={inherit}
    />
  )
  if (block) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">{label}</div>
          {reset}
        </div>
        {inactive && <p className="text-micro italic text-text-muted">{inactive}</p>}
        {text.description && <p className="text-micro text-text-muted">{text.description}</p>}
        <div className="ml-1 border-l border-ink/10 pl-3 dark:border-ink/10">{editor}</div>
      </div>
    )
  }
  // One under the other: name, control, explanation. Side by side, the three wrapped differently
  // in every row of a side panel, and the explanation stood beside some controls and under others.
  // The control may shrink below its content: a flex item does not by default, and a 28rem
  // textarea in it stood 44 px over a 404 px row of the side panel (max-w-full had nothing to bind).
  // The reset sits beside the name, as in a block row: beside the control it wrapped under a
  // textarea and its image button once the option groups became boxes with their own padding.
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{label}</div>
        {reset}
      </div>
      {inactive && <p className="text-micro italic text-text-muted">{inactive}</p>}
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5 [&>*]:min-w-0">{editor}</div>
      {text.description && <p className="text-micro text-text-muted">{text.description}</p>}
      {/* layout-box's `placeholders` switch has no list of its own: the `html` field stands two
          rows above it with the same list, there with buttons that insert (Nutzerbefund
          2026-10-14: "stehen doppelt da"). */}
    </div>
  )
}

// ── one value of any kind ─────────────────────────────────────────────────────

function NodeEditor({
  id,
  node,
  field,
  value,
  defaultValue,
  hasDefault,
  fromAbove = false,
  onValue,
  ctx,
  inherit
}: {
  id?: string
  node: OptionNode
  field?: OptionField
  value: unknown
  defaultValue?: unknown
  hasDefault: boolean
  /** The default is the value above this record entry, not the plugin's - said as "as above". */
  fromAbove?: boolean
  onValue: (v: unknown) => void
  ctx: FormContext
  inherit?: Inherited
}): JSX.Element {
  const { t } = useTranslation()
  switch (node.kind) {
    case 'boolean': {
      const effective = value === undefined ? defaultValue === true : value === true
      return (
        <span className="flex items-center gap-2">
          <Toggle label={field?.key ?? ''} hideLabel checked={effective} onChange={(checked) => onValue(checked)} />
          {value === undefined && (
            <span className="text-micro text-text-muted">
              {fromAbove ? t('pluginOptions.asAbove') : hasDefault ? t('pluginOptions.isDefault') : t('pluginOptions.notSet')}
            </span>
          )}
        </span>
      )
    }
    case 'enum':
      return (
        <EnumSelect id={id} values={node.values} field={field} value={value} defaultValue={defaultValue} hasDefault={hasDefault} fromAbove={fromAbove} onValue={onValue} ctx={ctx} />
      )
    case 'number':
      return (
        <TextInput
          key={String(value ?? '')}
          id={id}
          type="number"
          {...(node.minimum !== undefined ? { min: node.minimum } : {})}
          {...(node.maximum !== undefined ? { max: node.maximum } : {})}
          step={node.integer ? 1 : 'any'}
          defaultValue={typeof value === 'number' ? String(value) : ''}
          placeholder={hasDefault ? inlineValue(defaultValue) : undefined}
          onBlur={(e) => {
            const raw = e.target.value
            const next = raw === '' ? undefined : Number(raw)
            if (next !== value && !(next !== undefined && Number.isNaN(next))) onValue(next)
          }}
          className="w-32"
        />
      )
    case 'string':
      return (
        <StringEditor id={id} field={field} value={value} defaultValue={defaultValue} hasDefault={hasDefault} onValue={onValue} ctx={ctx} inherit={inherit} />
      )
    case 'object': {
      const values = isPlainObject(value) ? value : {}
      return <ObjectBlock fields={node.fields} values={values} onValue={onValue} ctx={ctx} />
    }
    case 'record':
      return <RecordEditor node={node} value={value} onValue={onValue} ctx={ctx} inherit={inherit} />
    case 'array':
      return <ListEditor node={node} field={field} value={value} defaultValue={defaultValue} hasDefault={hasDefault} onValue={onValue} ctx={ctx} />
    case 'union':
      return <UnionEditor id={id} node={node} field={field} value={value} defaultValue={defaultValue} hasDefault={hasDefault} onValue={onValue} ctx={ctx} inherit={inherit} />
    case 'json':
      return <JsonEditor id={id} value={value} defaultValue={defaultValue} hasDefault={hasDefault} onValue={onValue} />
  }
}

function EnumSelect({
  id,
  values,
  field,
  value,
  defaultValue,
  hasDefault,
  fromAbove = false,
  onValue,
  ctx
}: {
  id?: string
  values: OptionEnumValue[]
  field?: OptionField
  value: unknown
  defaultValue: unknown
  hasDefault: boolean
  fromAbove?: boolean
  onValue: (v: unknown) => void
  ctx: FormContext
}): JSX.Element {
  const { t } = useTranslation()
  // By index, because a value can be a number or a boolean and an <option> only holds text.
  const index = values.findIndex((v) => v === value)
  const unknownValue = value !== undefined && index === -1
  return (
    <Select
      id={id}
      value={unknownValue ? 'unknown' : index === -1 ? '' : String(index)}
      onChange={(e) => {
        if (e.target.value === '') onValue(undefined)
        else if (e.target.value !== 'unknown') onValue(values[Number(e.target.value)])
      }}
      className={INPUT_WIDTH}
    >
      {/* The empty choice is "not set", and it says what that means. */}
      <option value="">
        {hasDefault && (typeof defaultValue === 'string' || typeof defaultValue === 'number' || typeof defaultValue === 'boolean')
          ? t(fromAbove ? 'pluginOptions.asAboveChoice' : 'pluginOptions.defaultChoice', { value: enumLabel(field, defaultValue, ctx.lang) })
          : t('pluginOptions.notSet')}
      </option>
      {unknownValue && <option value="unknown">{inlineValue(value)}</option>}
      {values.map((v, i) => (
        <option key={i} value={String(i)}>
          {enumLabel(field, v, ctx.lang) === String(v) ? String(v) : `${enumLabel(field, v, ctx.lang)} (${String(v)})`}
        </option>
      ))}
    </Select>
  )
}

function StringEditor({
  id,
  field,
  value,
  defaultValue,
  hasDefault,
  onValue,
  ctx,
  inherit
}: {
  id?: string
  field?: OptionField
  value: unknown
  defaultValue: unknown
  hasDefault: boolean
  onValue: (v: unknown) => void
  ctx: FormContext
  inherit?: Inherited
}): JSX.Element {
  const { t } = useTranslation()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const widget = field?.widget
  // layout-box's `placeholders`: off, `{{root}}` stays as written and an inserted picture does not
  // load. Read by its key, because that is the option layout-box names in its schema; a plugin
  // without it never turns the hint on.
  const placeholdersOff = inherit ? siblingValue('placeholders', inherit.values, inherit.fields) === false : false
  // The list of placeholders stands where the option exists - layout-box's, by the same key.
  const hasPlaceholders = inherit ? inherit.fields.some((f) => f.key === 'placeholders') : false
  if (widget?.kind === 'snippetFile' && ctx.projectPath && inherit) {
    // The folder is a sibling option (`x-quartz-dir-option`); in a byLang entry, the one above.
    const dir = widget.dirOption ? siblingValue(widget.dirOption, inherit.values, inherit.fields) : undefined
    if (typeof dir === 'string' && dir !== '') {
      return (
        <SnippetFileField
          id={id}
          projectPath={ctx.projectPath}
          dir={dir}
          value={value}
          defaultValue={defaultValue}
          hasDefault={hasDefault}
          placeholdersOff={placeholdersOff}
          onValue={onValue}
        />
      )
    }
  }
  const current = typeof value === 'string' ? value : ''
  const placeholder = value === '' ? t('pluginsInstalled.explicitlyEmpty') : hasDefault ? inlineValue(defaultValue) : undefined
  // A cleared field removes the key - "not set" - and an empty string the plugin reads as "show
  // nothing" has a button of its own (review 2026-10-13, finding 3).
  const commit = (raw: string): void => {
    if (raw !== current) onValue(raw === '' ? undefined : raw)
  }
  const multiline = widget?.kind === 'html' || widget?.kind === 'markdown'
  // A picture goes in at the textarea's cursor, which the textarea keeps across the click.
  const insertImage = (text: string): void => {
    const el = textareaRef.current
    if (!el) return
    const at = el.selectionStart ?? el.value.length
    const to = el.selectionEnd ?? at
    commit(el.value.slice(0, at) + text + el.value.slice(to))
  }
  return (
    <span className="flex max-w-full flex-wrap items-start gap-x-2">
      {multiline ? (
        <span className="flex min-w-0 flex-col gap-1.5">
          <textarea
            ref={textareaRef}
            key={current}
            id={id}
            defaultValue={current}
            placeholder={placeholder}
            rows={4}
            onBlur={(e) => commit(e.target.value)}
            className="w-[28rem] max-w-full rounded-[7px] border border-ink/10 bg-surface px-2.5 py-1.5 font-mono text-xs text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          {ctx.projectPath && (
            <ImageButton
              projectPath={ctx.projectPath}
              format={widget?.kind === 'markdown' ? 'markdown' : 'html'}
              placeholdersOff={placeholdersOff}
              onInsert={insertImage}
            />
          )}
          {hasPlaceholders && <PlaceholderList onInsert={insertImage} off={placeholdersOff} />}
        </span>
      ) : (
        <TextInput key={current} id={id} type="text" defaultValue={current} placeholder={placeholder} onBlur={(e) => commit(e.target.value)} className={INPUT_WIDTH} />
      )}
      {ctx.explicitEmpty && (value === '' || value === undefined) && (
        <button
          type="button"
          className="mt-1.5 text-xs font-medium text-text-secondary hover:text-text hover:underline"
          title={value === '' ? t('pluginsInstalled.unsetEmptyHint') : t('pluginsInstalled.setEmptyHint')}
          onClick={() => onValue(value === '' ? undefined : '')}
        >
          {value === '' ? t('pluginsInstalled.unsetEmpty') : t('pluginsInstalled.setEmpty')}
        </button>
      )}
    </span>
  )
}

// ── lists ─────────────────────────────────────────────────────────────────────

function emptyOf(node: OptionNode): unknown {
  switch (node.kind) {
    case 'boolean':
      return false
    case 'number':
      return 0
    case 'string':
      return ''
    case 'enum':
      return node.values[0]
    case 'object':
    case 'record':
      return {}
    case 'array':
      return []
    case 'union':
      return emptyOf(node.variants[0])
    case 'json':
      return ''
  }
}

function ListEditor({
  node,
  field,
  value,
  defaultValue,
  hasDefault,
  onValue,
  ctx
}: {
  node: Extract<OptionNode, { kind: 'array' }>
  field?: OptionField
  value: unknown
  defaultValue: unknown
  hasDefault: boolean
  onValue: (v: unknown) => void
  ctx: FormContext
}): JSX.Element {
  const { t } = useTranslation()
  if (!Array.isArray(value)) {
    // Nobody changed this list yet: the plugin's own one stands, shown rather than edited, until
    // "customize" copies it - so an untouched list is not written into the config by a glance.
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-text-muted">
          {hasDefault ? t('pluginOptions.defaultList', { value: inlineValue(defaultValue) }) : t('pluginOptions.notSet')}
        </span>
        <Button variant="ghost" onClick={() => onValue(Array.isArray(defaultValue) ? [...defaultValue] : [emptyOf(node.items)])}>
          {hasDefault && Array.isArray(defaultValue) ? t('pluginOptions.customize') : t('pluginOptions.addItem')}
        </Button>
      </div>
    )
  }
  const items = value
  const replace = (i: number, v: unknown): void => onValue(items.map((x, j) => (j === i ? v : x)))
  const move = (i: number, d: number): void => {
    const next = [...items]
    next.splice(i + d, 0, ...next.splice(i, 1))
    onValue(next)
  }
  // An enum list offers what is not in it yet: detection strategies are a set in priority order.
  const nextItem =
    node.items.kind === 'enum' ? (node.items.values.find((v) => !items.includes(v)) ?? node.items.values[0]) : emptyOf(node.items)
  return (
    <div className="flex flex-col gap-1.5">
      {items.length === 0 && <span className="text-xs text-text-muted">{t('pluginOptions.emptyList')}</span>}
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <span className="mt-1.5 w-5 shrink-0 text-right font-mono text-micro text-text-muted">{i + 1}</span>
          <div className="min-w-0">
            <NodeEditor
              node={node.items}
              field={field}
              value={item}
              hasDefault={false}
              onValue={(v) => (v === undefined ? onValue(items.filter((_, j) => j !== i)) : replace(i, v))}
              ctx={ctx}
            />
          </div>
          <IconButton icon={ArrowUp} tone="neutral" title={t('pluginOptions.moveItemUp', { n: i + 1 })} onClick={() => move(i, -1)} disabled={i === 0} />
          <IconButton icon={ArrowDown} tone="neutral" title={t('pluginOptions.moveItemDown', { n: i + 1 })} onClick={() => move(i, 1)} disabled={i === items.length - 1} />
          <IconButton icon={Trash2} title={t('pluginOptions.removeItem', { n: i + 1 })} onClick={() => onValue(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <div>
        <Button variant="ghost" onClick={() => onValue([...items, nextItem])}>
          {t('pluginOptions.addItem')}
        </Button>
      </div>
    </div>
  )
}

// ── records (keys chosen by the user) ─────────────────────────────────────────

function RecordEditor({
  node,
  value,
  onValue,
  ctx,
  inherit
}: {
  node: Extract<OptionNode, { kind: 'record' }>
  value: unknown
  onValue: (v: unknown) => void
  ctx: FormContext
  inherit?: Inherited
}): JSX.Element {
  const { t } = useTranslation()
  const entries = isPlainObject(value) ? Object.entries(value) : []
  const record = isPlainObject(value) ? value : {}
  const [draftKey, setDraftKey] = useState('')
  const key = draftKey.trim()
  const offered = node.keys === 'languages' ? ctx.languages.filter((l) => !(l in record)) : []
  const add = (k: string): void => {
    if (!k || k in record) return
    onValue({ ...record, [k]: emptyOf(node.value) })
    setDraftKey('')
  }
  return (
    <div className="flex flex-col gap-2">
      {entries.length === 0 && <span className="text-xs text-text-muted">{t('pluginOptions.emptyRecord')}</span>}
      {entries.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-1.5 rounded-md border border-ink/10 p-2 dark:border-ink/10">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold">{k}</span>
            <span className="flex-1" />
            <IconButton icon={Trash2} title={t('pluginOptions.removeEntry', { key: k })} onClick={() => onValue(setAtPath(record, [k], undefined))} />
          </div>
          {node.value.kind === 'object' ? (
            <ObjectBlock
              fields={node.value.fields}
              values={isPlainObject(v) ? v : {}}
              onValue={(next) => onValue(setAtPath(record, [k], isEmptyObject(next) ? undefined : next))}
              ctx={ctx}
              {...(inherit ? { inherit } : {})}
            />
          ) : (
            <NodeEditor node={node.value} value={v} hasDefault={false} onValue={(next) => onValue(setAtPath(record, [k], next))} ctx={ctx} />
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        {offered.length > 0 && (
          <Select value="" onChange={(e) => add(e.target.value)} aria-label={t('pluginOptions.addLanguage')} className="w-44">
            <option value="">{t('pluginOptions.addLanguage')}</option>
            {offered.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        )}
        <TextInput
          value={draftKey}
          onChange={(e) => setDraftKey(e.target.value)}
          placeholder={t('pluginOptions.entryKeyPlaceholder')}
          aria-label={t('pluginOptions.entryKeyPlaceholder')}
          className="w-36 font-mono"
        />
        <Button variant="ghost" disabled={!key || key in record} onClick={() => add(key)}>
          {t('pluginOptions.addEntry')}
        </Button>
      </div>
    </div>
  )
}

// ── unions: one of several shapes ─────────────────────────────────────────────

const KIND_ORDER: OptionNode['kind'][] = ['enum', 'boolean', 'string', 'number', 'object', 'record', 'array', 'json', 'union']

function UnionEditor({
  id,
  node,
  field,
  value,
  defaultValue,
  hasDefault,
  onValue,
  ctx,
  inherit
}: {
  id?: string
  node: Extract<OptionNode, { kind: 'union' }>
  field?: OptionField
  value: unknown
  defaultValue: unknown
  hasDefault: boolean
  onValue: (v: unknown) => void
  ctx: FormContext
  inherit?: Inherited
}): JSX.Element {
  const { t } = useTranslation()
  // Choices and switches only - navigations' `icons: "both" | true | …` - are one select, with the
  // two booleans as choices beside the words.
  if (node.variants.every((v) => v.kind === 'enum' || v.kind === 'boolean')) {
    const values = node.variants.flatMap((v) => (v.kind === 'enum' ? v.values : [true, false]))
    return <EnumSelect id={id} values={values} field={field} value={value} defaultValue={defaultValue} hasDefault={hasDefault} onValue={onValue} ctx={ctx} />
  }
  const shown = value === undefined ? defaultValue : value
  const current = Math.max(0, node.variants.findIndex((v) => nodeAccepts(v, shown)))
  const variant = node.variants[current]
  return (
    <div className="flex flex-col gap-1.5">
      <Select
        value={String(current)}
        onChange={(e) => onValue(emptyOf(node.variants[Number(e.target.value)]))}
        aria-label={t('pluginOptions.shape', { name: field?.key ?? '' })}
        className="w-40"
      >
        {node.variants.map((v, i) => (
          <option key={i} value={String(i)}>
            {t(`pluginOptions.kind.${KIND_ORDER.includes(v.kind) ? v.kind : 'json'}`)}
          </option>
        ))}
      </Select>
      <NodeEditor
        id={id}
        node={variant}
        field={field}
        value={value}
        defaultValue={nodeAccepts(variant, defaultValue) ? defaultValue : undefined}
        hasDefault={hasDefault && nodeAccepts(variant, defaultValue)}
        onValue={onValue}
        ctx={ctx}
        inherit={inherit}
      />
    </div>
  )
}

// ── what the reader could not describe: JSON text ─────────────────────────────

function JsonEditor({
  id,
  value,
  defaultValue,
  hasDefault,
  onValue
}: {
  id?: string
  value: unknown
  defaultValue: unknown
  hasDefault: boolean
  onValue: (v: unknown) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [error, setError] = useState(false)
  const current = value === undefined ? '' : JSON.stringify(value, null, 2)
  return (
    <div className="flex flex-col gap-1">
      <textarea
        key={current}
        id={id}
        defaultValue={current}
        placeholder={hasDefault ? JSON.stringify(defaultValue, null, 2) : undefined}
        rows={Math.min(10, Math.max(3, current.split('\n').length))}
        onBlur={(e) => {
          const raw = e.target.value.trim()
          if (raw === current.trim()) return
          if (raw === '') {
            setError(false)
            onValue(undefined)
            return
          }
          try {
            onValue(JSON.parse(raw))
            setError(false)
          } catch {
            setError(true)
          }
        }}
        className="w-[28rem] max-w-full rounded-[7px] border border-ink/10 bg-surface px-2.5 py-1.5 font-mono text-xs text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      <span className={`text-micro ${error ? 'text-red-600 dark:text-red-400' : 'text-text-muted'}`}>
        {error ? t('pluginOptions.jsonInvalid') : t('pluginOptions.jsonHint')}
      </span>
    </div>
  )
}
