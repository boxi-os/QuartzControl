import type { OptionEnumValue, OptionField } from '@shared/ipc-contract'

export type FormLanguage = 'de' | 'en'

// What a field says about itself in the page's language: the schema's own text (English, by
// convention) unless `x-quartz-l10n` carries one for the language.
export function fieldText(field: OptionField, lang: FormLanguage): { description?: string; group?: string; title?: string } {
  const own = field.l10n?.[lang]
  return {
    title: own?.title ?? field.title,
    description: own?.description ?? field.description,
    group: own?.group ?? field.group
  }
}

/** The label of one value of an enum: the translated one if the schema has it, the value otherwise. */
export function enumLabel(field: OptionField | undefined, value: OptionEnumValue, lang: FormLanguage): string {
  return field?.l10n?.[lang]?.enum?.[String(value)] ?? String(value)
}

/** A value as one line of text - for "Vorgabe: …" and the preview of a list nobody changed yet. */
export function inlineValue(value: unknown): string {
  if (typeof value === 'string') return value === '' ? '""' : value
  if (Array.isArray(value) && value.every((v) => typeof v === 'string' || typeof v === 'number')) return value.join(', ')
  return JSON.stringify(value)
}

export const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
export const isEmptyObject = (v: unknown): boolean => isPlainObject(v) && Object.keys(v).length === 0
