import { quartzPluginName } from '@shared/quartzPluginName'
import type { NormalizedOptionSchema, OptionField, PluginEntry, QuartzConfig } from '@shared/ipc-contract'

// What the Formulare editor needs to know about quartz-forms 0.5.0, read from its source rather
// than its README: the id and field-name rules and the reserved names (src/validate.ts), the four
// templates (src/templates/index.ts), how a form is laid over its template and the global
// transport (resolveForm in src/options.ts), the field types (the schema in package.json) and
// which fields a condition may name with which values (src/conditions.ts, controllerHas in
// src/validate.ts). scripts/check-plugin-copies.mjs holds each copy
// against the installed plugin. What the build says about a definition is not copied: the tab
// asks the plugin itself (`dist/cli.js check`).

export const FORMS_PLUGIN = 'quartz-forms'
/** The version whose source the copies below are read from. */
export const FORMS_READ_AGAINST = '0.5.4'
/**
 * Widths, the arrangement of options, conditions and page breaks came with this version. An older
 * plugin builds `width`, `layout` and `showIf` without effect and without a word, and refuses a
 * `pageBreak` as an unknown type (forty-ninth review, Niedrig 10).
 */
export const FORMS_LAYOUT_SINCE = '0.4.0'

type Options = Record<string, unknown>
export type FormDef = Record<string, unknown>
export type FieldDef = Record<string, unknown> & { type: string; name: string }
export type Text = string | Record<string, string>

export const FORM_ID = /^[a-z0-9][a-z0-9-]*$/
export const FIELD_NAME = /^[A-Za-z][A-Za-z0-9_-]*$/
export const RESERVED_NAMES = [
  'form',
  'lang',
  'page',
  'ts',
  'pow',
  'captcha',
  'encrypted',
  'ciphertext',
  'fields',
  'pageTitle',
  'cf-turnstile-response',
  'h-captcha-response'
] as const

export const TEMPLATE_NAMES = ['contact', 'feedback', 'rsvp', 'survey'] as const
export type FormTemplate = (typeof TEMPLATE_NAMES)[number]

const tx = (en: string, de: string): Text => ({ en, de })

/** The plugin's templates, word for word (src/templates/index.ts). */
export const TEMPLATES: Record<FormTemplate, FormDef> = {
  contact: {
    title: tx('Contact', 'Kontakt'),
    fields: [
      { type: 'text', name: 'name', label: tx('Name', 'Name'), autocomplete: 'name' },
      {
        type: 'email',
        name: 'email',
        label: tx('E-mail', 'E-Mail'),
        hint: tx('Only if you want a reply.', 'Nur, wenn du eine Antwort möchtest.'),
        autocomplete: 'email'
      },
      { type: 'textarea', name: 'message', label: tx('Message', 'Nachricht'), required: true },
      {
        type: 'consent',
        name: 'consent',
        text: tx('I agree that my message is processed to answer it.', 'Ich bin einverstanden, dass meine Nachricht zur Beantwortung verarbeitet wird.')
      }
    ]
  },
  feedback: {
    title: tx('Feedback on this page', 'Feedback zu dieser Seite'),
    pageContext: true,
    fields: [
      {
        type: 'scale',
        name: 'rating',
        label: tx('How helpful was this page?', 'Wie hilfreich war diese Seite?'),
        min: 1,
        max: 5,
        minLabel: tx('Not at all', 'Gar nicht'),
        maxLabel: tx('Very', 'Sehr'),
        required: true
      },
      { type: 'textarea', name: 'comment', label: tx('What could be better?', 'Was könnte besser sein?'), rows: 4 }
    ]
  },
  rsvp: {
    title: tx('Sign up', 'Anmeldung'),
    fields: [
      { type: 'text', name: 'name', label: tx('Name', 'Name'), required: true, autocomplete: 'name' },
      { type: 'email', name: 'email', label: tx('E-mail', 'E-Mail'), required: true, autocomplete: 'email' },
      {
        type: 'select',
        name: 'choice',
        label: tx('Date', 'Termin'),
        required: true,
        options: [
          { value: '1', label: tx('First date', 'Erster Termin') },
          { value: '2', label: tx('Second date', 'Zweiter Termin') }
        ]
      },
      { type: 'number', name: 'guests', label: tx('Number of people', 'Anzahl Personen'), min: 1, max: 10, required: true },
      { type: 'textarea', name: 'note', label: tx('Note', 'Anmerkung'), rows: 3 },
      {
        type: 'consent',
        name: 'consent',
        text: tx('I agree that my details are stored to organise the event.', 'Ich bin einverstanden, dass meine Angaben zur Organisation gespeichert werden.')
      }
    ]
  },
  survey: {
    title: tx('Survey', 'Umfrage'),
    anonymous: true,
    fields: [
      {
        type: 'radio',
        name: 'usage',
        label: tx('How often do you visit this site?', 'Wie oft besuchst du diese Website?'),
        required: true,
        options: [
          { value: 'first', label: tx('First time', 'Zum ersten Mal') },
          { value: 'sometimes', label: tx('Now and then', 'Gelegentlich') },
          { value: 'often', label: tx('Often', 'Oft') }
        ]
      },
      {
        type: 'checkboxes',
        name: 'topics',
        label: tx('Which topics interest you?', 'Welche Themen interessieren dich?'),
        options: [
          { value: 'news', label: tx('News', 'Neuigkeiten') },
          { value: 'guides', label: tx('Guides', 'Anleitungen') },
          { value: 'background', label: tx('Background', 'Hintergrund') }
        ]
      },
      { type: 'scale', name: 'satisfaction', label: tx('How satisfied are you overall?', 'Wie zufrieden bist du insgesamt?'), min: 1, max: 5 },
      { type: 'textarea', name: 'comment', label: tx('Anything else?', 'Noch etwas?'), rows: 3 }
    ]
  }
}

export const TRANSPORT_KINDS = ['relay', 'endpoint', 'formspree', 'web3forms', 'mailto', 'demo'] as const
export type TransportKind = (typeof TRANSPORT_KINDS)[number]
export const ENCRYPTION_MODES = ['required', 'optional', 'off'] as const
export type EncryptionMode = (typeof ENCRYPTION_MODES)[number]

export interface FormsInstance {
  plugin: PluginEntry
  index: number
}

export function formsEntries(config: QuartzConfig | null): FormsInstance[] {
  const out: FormsInstance[] = []
  config?.plugins.forEach((plugin, index) => {
    if (quartzPluginName(plugin.source) === FORMS_PLUGIN) out.push({ plugin, index })
  })
  return out
}

export const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** The forms as written, in their order; a key whose value is no object counts as an empty form. */
export function formsOf(options: Options | undefined): [string, FormDef][] {
  const raw = options?.forms
  if (!isObject(raw)) return []
  return Object.entries(raw).map(([id, def]) => [id, isObject(def) ? def : {}])
}

export function isTemplate(name: unknown): name is FormTemplate {
  return typeof name === 'string' && (TEMPLATE_NAMES as readonly string[]).includes(name)
}

/** A form as the plugin reads it: laid over its template, own `fields` replacing the template's. */
export function effectiveForm(def: FormDef): FormDef & { fields: FieldDef[] } {
  const base = isTemplate(def.template) ? TEMPLATES[def.template] : {}
  const merged: FormDef = { ...base }
  for (const [k, v] of Object.entries(def)) if (v !== null && v !== undefined) merged[k] = v
  const fields = Array.isArray(merged.fields) ? (merged.fields.filter((f) => isObject(f)) as FieldDef[]) : []
  return { ...merged, fields }
}

/** Whether the fields are the template's: no own `fields`, a template set. */
export function usesTemplateFields(def: FormDef): boolean {
  return isTemplate(def.template) && !Array.isArray(def.fields)
}

/** The transport kind a form sends through: its own, else the global one, else the relay. */
export function transportKindOf(def: FormDef, options: Options | undefined): string {
  const own = isObject(def.transport) ? def.transport.kind : undefined
  if (typeof own === 'string') return own
  const global = isObject(options?.transport) ? options.transport.kind : undefined
  return typeof global === 'string' ? global : 'relay'
}

export function encryptionModeOf(def: FormDef): string {
  const own = isObject(def.encryption) ? def.encryption.mode : undefined
  return typeof own === 'string' ? own : 'off'
}

export function isAnonymous(def: FormDef): boolean {
  return effectiveForm(def).anonymous === true
}

/** A Text in one language: the exact code, the primary subtag, then the first entry. */
export function textIn(text: unknown, lang: string): string {
  if (typeof text === 'string') return text
  if (!isObject(text)) return ''
  const entries = Object.entries(text).filter((e): e is [string, string] => typeof e[1] === 'string')
  const primary = lang.toLowerCase().split(/[-_]/)[0]
  const hit = entries.find(([k]) => k.toLowerCase() === lang.toLowerCase()) ?? entries.find(([k]) => k.toLowerCase().split(/[-_]/)[0] === primary) ?? entries[0]
  return hit ? hit[1] : ''
}

export type IdProblem = 'empty' | 'pattern' | 'taken'

export function formIdProblem(id: string, existing: string[], own?: string): IdProblem | null {
  if (!id) return 'empty'
  if (!FORM_ID.test(id)) return 'pattern'
  if (id !== own && existing.includes(id)) return 'taken'
  return null
}

export type FieldNameProblem = 'empty' | 'pattern' | 'reserved' | 'taken'

export function fieldNameProblem(name: string, others: string[]): FieldNameProblem | null {
  if (!name) return 'empty'
  if (!FIELD_NAME.test(name)) return 'pattern'
  if ((RESERVED_NAMES as readonly string[]).includes(name)) return 'reserved'
  if (others.includes(name)) return 'taken'
  return null
}

/** A free id after `base`: `base`, then `base-2`, `base-3` … */
export function freeId(base: string, existing: string[]): string {
  const clean = base.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'form'
  if (!existing.includes(clean)) return clean
  for (let n = 2; ; n++) if (!existing.includes(`${clean}-${n}`)) return `${clean}-${n}`
}

function withForms(options: Options, entries: [string, FormDef][]): Options {
  return { ...options, forms: Object.fromEntries(entries) }
}

export function withForm(options: Options, id: string, def: FormDef): Options {
  const list = formsOf(options)
  const at = list.findIndex(([k]) => k === id)
  if (at === -1) list.push([id, def])
  else list[at] = [id, def]
  return withForms(options, list)
}

/** Renames a form where it stands; the layout form follows. Pages that embed it do not. */
export function renameForm(options: Options, from: string, to: string): Options {
  const next = withForms(
    options,
    formsOf(options).map(([k, v]) => (k === from ? [to, v] : [k, v]))
  )
  if (next.layoutForm === from) next.layoutForm = to
  return next
}

export function removeForm(options: Options, id: string): Options {
  const next = withForms(
    options,
    formsOf(options).filter(([k]) => k !== id)
  )
  if (next.layoutForm === id) next.layoutForm = ''
  return next
}

/** A copy of a form right after it, under a free id. */
export function duplicateForm(options: Options, id: string): { options: Options; id: string } {
  const list = formsOf(options)
  const at = list.findIndex(([k]) => k === id)
  if (at === -1) return { options, id }
  const copyId = freeId(`${id}-copy`, list.map(([k]) => k))
  list.splice(at + 1, 0, [copyId, structuredClone(list[at][1])])
  return { options: withForms(options, list), id: copyId }
}

/**
 * The start of a new form: a template, or a single message field - a form without fields stops
 * the build (`no fields`), so "empty" is the smallest form that builds.
 */
export function newForm(start: FormTemplate | 'empty', messageLabel: string): FormDef {
  if (start !== 'empty') return { template: start }
  return { fields: [{ type: 'textarea', name: 'message', label: messageLabel, required: true }] }
}

/**
 * The fields of one form as the plugin's schema describes them: the value node of the `forms`
 * record. The form editor shows them with the same editors as every other option.
 */
export function formSchema(schema: NormalizedOptionSchema | null): NormalizedOptionSchema | null {
  const node = schema?.fields.find((f) => f.key === 'forms')?.node
  if (!schema || node?.kind !== 'record' || node.value.kind !== 'object') return null
  return { source: schema.source, fields: node.value.fields, notes: [] }
}

/** The schema of one top-level object option (`spam`, `transport`), for a section that shows its inside. */
export function objectSchema(schema: NormalizedOptionSchema | null, key: string): NormalizedOptionSchema | null {
  const node = schema?.fields.find((f) => f.key === key)?.node
  if (!schema || node?.kind !== 'object') return null
  return { source: schema.source, fields: node.fields, notes: [] }
}

/** The fields of the field shape for `type`: the variant of the `fields` union whose `type` names it. */
export function fieldVariant(form: NormalizedOptionSchema | null, type: string): OptionField[] {
  const node = form?.fields.find((f) => f.key === 'fields')?.node
  if (node?.kind !== 'array') return []
  const variants = node.items.kind === 'union' ? node.items.variants : [node.items]
  for (const v of variants) {
    if (v.kind !== 'object') continue
    const typeNode = v.fields.find((f) => f.key === 'type')?.node
    if (typeNode?.kind === 'enum' && typeNode.values.includes(type)) return v.fields
  }
  return []
}

/** The value an option has when unset: the plugin's default for it (`quartz.defaultOptions`). */
export function defaultOf(schema: NormalizedOptionSchema | null, key: string): unknown {
  const f = schema?.fields.find((x) => x.key === key)
  return f?.hasDefault ? f.default : undefined
}

/** Global spam or transport as the plugin resolves it: its defaults, the written keys over them. */
export function resolvedGlobal(schema: NormalizedOptionSchema | null, options: Options | undefined, key: 'spam' | 'transport'): Options {
  const def = defaultOf(schema, key)
  const own = options?.[key]
  return { ...(isObject(def) ? def : {}), ...(isObject(own) ? own : {}) }
}

/** The settings rows below the list, by the keys each one shows. `relay` is the tab's own. */
export const SECTIONS = [
  { id: 'transport', keys: ['transport'] },
  { id: 'keys', keys: ['keys'] },
  { id: 'spam', keys: ['spam'] },
  { id: 'layout', keys: ['layoutForm', 'language'] },
  { id: 'relay', keys: [] },
  { id: 'texts', keys: ['texts'] },
  { id: 'technical', keys: ['frontmatterKey', 'codeBlockLang'] }
] as const
export type SectionId = (typeof SECTIONS)[number]['id']

/** What the code block and the placeholder look like for a form, with the plugin's own words. */
export function embedSnippets(id: string, options: Options | undefined): { codeBlock: string; placeholder: string; frontmatter: string } {
  const lang = typeof options?.codeBlockLang === 'string' && options.codeBlockLang.trim() ? options.codeBlockLang : 'quartz-form'
  const key = typeof options?.frontmatterKey === 'string' && options.frontmatterKey.trim() ? options.frontmatterKey : 'form'
  return { codeBlock: '```' + lang + '\n' + id + '\n```', placeholder: `{{form:${id}}}`, frontmatter: `${key}: ${id}` }
}

// ── fields ─────────────────────────────────────────────────────────────────────────────────────

/** The field types by the group the "add field" tiles show them in. */
export const FIELD_GROUPS = {
  text: ['text', 'textarea', 'email', 'tel', 'url', 'number', 'date'],
  choice: ['select', 'radio', 'checkboxes', 'checkbox', 'scale'],
  other: ['consent', 'pgpKey', 'hidden'],
  // quartz-forms 0.4.0: not a field but where a step begins; it has no name and no value.
  structure: ['pageBreak']
} as const
export type FieldType = (typeof FIELD_GROUPS)[keyof typeof FIELD_GROUPS][number]

/** Types that share a shape in the plugin's schema: a field can change between them and keep its keys. */
export const SAME_SHAPE: readonly (readonly string[])[] = [['text', 'email', 'tel', 'url', 'number', 'date', 'textarea'], ['select', 'radio', 'checkboxes']]

/** Which of the input keys each input type reads (render/form.ts); a set key outside it is shown anyway. */
export const INPUT_KEYS: Record<string, readonly string[]> = {
  text: ['placeholder', 'autocomplete', 'pattern', 'maxLength'],
  email: ['placeholder', 'autocomplete', 'pattern', 'maxLength'],
  tel: ['placeholder', 'autocomplete', 'pattern', 'maxLength'],
  url: ['placeholder', 'autocomplete', 'pattern', 'maxLength'],
  number: ['placeholder', 'min', 'max', 'step'],
  date: ['min', 'max'],
  textarea: ['placeholder', 'rows', 'maxLength']
}

/** Autocomplete tokens that name a person (src/validate.ts, PERSONAL_AUTOCOMPLETE). */
export const PERSONAL_AUTOCOMPLETE = [
  'name',
  'given-name',
  'family-name',
  'additional-name',
  'honorific-prefix',
  'honorific-suffix',
  'nickname',
  'username',
  'street-address',
  'address-line1',
  'address-line2',
  'postal-code',
  'tel',
  'email',
  'bday',
  'organization'
] as const

/** Does this field ask for something that identifies a person (src/validate.ts, isPersonalField)? */
export function isPersonalField(field: FieldDef): boolean {
  switch (field.type) {
    case 'email':
    case 'tel':
    case 'pgpKey':
      return true
    case 'text':
    case 'textarea':
    case 'url':
    case 'date':
    case 'number':
      return typeof field.autocomplete === 'string' && (PERSONAL_AUTOCOMPLETE as readonly string[]).includes(field.autocomplete)
    default:
      return false
  }
}

/** A free field name after `base`: `base`, then `base2`, `base3` … (a name may not hold a hyphen at the end). */
export function freeFieldName(base: string, taken: string[]): string {
  const clean = base.replace(/[^A-Za-z0-9_-]+/g, '').replace(/^[^A-Za-z]+/, '') || 'field'
  const free = (n: string): boolean => !taken.includes(n) && !(RESERVED_NAMES as readonly string[]).includes(n)
  if (free(clean)) return clean
  for (let n = 2; ; n++) if (free(`${clean}${n}`)) return `${clean}${n}`
}

// ── conditions (quartz-forms 0.4.0) ──────────────────────────────────────────────────────────

/** The fields a condition may name: they have values to compare (src/conditions.ts, CONTROLLER_TYPES). */
export const CONTROLLER_TYPES = ['select', 'radio', 'checkboxes', 'checkbox', 'scale'] as const

export interface ShowIf {
  field: string
  equals: string[]
}

/** A field's or a page break's `showIf` as the plugin reads it (src/conditions.ts, conditionOf); undefined when absent or not well formed. */
export function showIfOf(field: Record<string, unknown>): ShowIf | undefined {
  const showIf = field.showIf
  if (!isObject(showIf)) return undefined
  const { field: name, equals } = showIf
  if (typeof name !== 'string' || !name) return undefined
  const list = typeof equals === 'string' ? [equals] : Array.isArray(equals) ? equals : []
  const values = list.filter((v): v is string => typeof v === 'string' && v !== '')
  return values.length ? { field: name, equals: values } : undefined
}

export function isController(field: FieldDef): boolean {
  return (CONTROLLER_TYPES as readonly string[]).includes(field.type) && typeof field.name === 'string'
}

/**
 * The values a condition on this field can name, with what visitors see (src/validate.ts,
 * controllerHas): its options, `yes` for a checkbox, every step of a scale.
 */
export function controllerValues(field: FieldDef, lang: string): { value: string; label: string }[] {
  switch (field.type) {
    case 'select':
    case 'radio':
    case 'checkboxes':
      return Array.isArray(field.options)
        ? field.options.filter(isObject).flatMap((o) => (typeof o.value === 'string' && o.value ? [{ value: o.value, label: textIn(o.label, lang) || o.value }] : []))
        : []
    case 'checkbox':
      return [{ value: 'yes', label: 'yes' }]
    case 'scale': {
      const { min, max } = field
      if (!Number.isInteger(min) || !Number.isInteger(max) || (max as number) < (min as number) || (max as number) - (min as number) > 20) return []
      return Array.from({ length: (max as number) - (min as number) + 1 }, (_, i) => String((min as number) + i)).map((v) => ({ value: v, label: v }))
    }
    default:
      return []
  }
}

/** One value as a string, several as a list: what a person would write in the YAML. */
export function showIfValue(field: string, equals: string[]): { field: string; equals: string | string[] } {
  return { field, equals: equals.length === 1 ? equals[0] : equals }
}

/** A field renamed from `from` to `to`: every condition that named it names the new name (as renameForm does for layoutForm). */
export function renameInConditions(fields: FieldDef[], from: string, to: string): FieldDef[] {
  return fields.map((f) => (isObject(f.showIf) && f.showIf.field === from ? { ...f, showIf: { ...f.showIf, field: to } } : f))
}

export function isPageBreak(field: FieldDef): boolean {
  return field.type === 'pageBreak'
}

/** The number of steps: one more than page breaks (the plugin's stepsOf). */
export function stepCount(fields: FieldDef[]): number {
  return fields.filter(isPageBreak).length + 1
}

/** What a field shows as its name in a list: its label, the consent text, else its name; a page break its title. */
export function fieldLabel(field: FieldDef, lang: string): string {
  if (isPageBreak(field)) return textIn(field.title, lang)
  return textIn(field.label, lang) || textIn(field.text, lang) || field.name
}

// ── what the plugin's check says, placed ──────────────────────────────────────────────────────

/**
 * A problem or hint of quartz-forms (`dist/cli.js check`) with the place it names. The plugin
 * starts every message with the option's path (src/validate.ts: `forms.<id>.fields[i].pattern: …`,
 * `keys.<name>: …`, `spam.pow: …`); that path is all this reads. `rest` is the message without the
 * part of the path the place already says.
 */
export interface PlacedMessage {
  text: string
  form?: string
  field?: number
  section?: SectionId
  rest: string
}

const SECTION_OF: [RegExp, SectionId][] = [
  [/^keys[.:]/, 'keys'],
  [/^transport[.:]/, 'transport'],
  [/^spam[.:]/, 'spam'],
  [/^(layoutForm|language)[.:]/, 'layout'],
  [/^texts[.:]/, 'texts'],
  [/^(frontmatterKey|codeBlockLang)[.:]/, 'technical']
]

export function placeMessage(text: string): PlacedMessage {
  const form = /^forms\.([a-z0-9][a-z0-9-]*)(?:\.fields\[(\d+)\])?\.?/.exec(text)
  if (form) {
    return { text, form: form[1], ...(form[2] !== undefined ? { field: Number(form[2]) } : {}), rest: text.slice(form[0].length).replace(/^[:\s]+/, '') }
  }
  const section = SECTION_OF.find(([re]) => re.test(text))
  return { text, ...(section ? { section: section[1] } : {}), rest: text }
}

// ── which captcha secrets the relay needs ───────────────────────────────────────────────────────

export interface CaptchaNeeds {
  /** A relay form uses the captcha set for all forms: `captchaSecret` in config.php. */
  global: { provider: string } | null
  /** Relay forms with a provider or site key of their own: `captchaSecrets[<form>]`. */
  forms: { id: string; provider: string }[]
}

/**
 * What the relay must be told to verify the captchas (send.php: `captchaSecrets[<form>]`, else
 * `captchaSecret`). Only relay forms count, and not anonymous ones (no captcha is loaded there,
 * resolveForm). A form needs a secret of its own when its `spam` sets a provider or a site key
 * other than the one for all forms - with the global secret alone the relay would answer every
 * submission of that form with "captcha".
 */
export function captchaNeeds(options: Options | undefined, globalSpam: Options): CaptchaNeeds {
  const globalProvider = typeof globalSpam.captcha === 'string' ? globalSpam.captcha : 'none'
  const globalKey = typeof globalSpam.captchaSiteKey === 'string' ? globalSpam.captchaSiteKey : ''
  let usesGlobal = false
  const own: { id: string; provider: string }[] = []
  for (const [id, def] of formsOf(options)) {
    if (transportKindOf(def, options) !== 'relay' || isAnonymous(def)) continue
    const spam = isObject(def.spam) ? def.spam : {}
    const provider = typeof spam.captcha === 'string' ? spam.captcha : globalProvider
    if (provider === 'none') continue
    const key = typeof spam.captchaSiteKey === 'string' ? spam.captchaSiteKey : globalKey
    if (provider === globalProvider && key === globalKey) usesGlobal = true
    else own.push({ id, provider })
  }
  return { global: usesGlobal ? { provider: globalProvider } : null, forms: own }
}
