import type { StyleSettingField } from '@shared/ipc-contract'
import { hexToHsl } from '../../data/cssVariables'

/**
 * How a Style Settings value has to be written into quartz.config.yaml so @quartz-themes/core
 * actually emits it - verified against core's compiled processStyleSettings():
 *
 *  - the option key is always `<blockId>@@<settingId>`
 *  - a boolean is a class toggle, and a string that matches one of the theme's classSettings keys
 *    is a class select; anything else is emitted literally as `--<settingId>: <value>`
 *  - a `@@light` / `@@dark` suffix *on the setting id* scopes the declaration to one mode; without
 *    one, core writes the same value into both the light and the dark block
 *
 * On top of that sits Style Settings' own encoding, which core does not implement and which a
 * hand-typed key/value pair therefore gets wrong: a `variable-themed-color` with
 * `format: hsl-split` is not one variable but three (`--accent-h`, `--accent-s`, `--accent-l`),
 * so writing `--accent: #80D0FF` has no effect at all. That is what the split/format handling
 * below exists for.
 */

export type Mode = 'light' | 'dark'

export function optionKey(field: StyleSettingField, suffix?: string, mode?: Mode): string {
  const id = suffix ? `${field.id}${suffix}` : field.id
  return mode ? `${field.blockId}@@${id}@@${mode}` : `${field.blockId}@@${id}`
}

export function isThemedColor(field: StyleSettingField): boolean {
  return field.kind === 'variable-themed-color'
}

function isHslSplit(field: StyleSettingField): boolean {
  return field.format === 'hsl-split'
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!match) return null
  return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) }
}

function toHexPart(value: number): string {
  return clampByte(value).toString(16).padStart(2, '0')
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHexPart(r)}${toHexPart(g)}${toHexPart(b)}`
}

// Inverse of cssVariables.hexToHsl, for reading an hsl-split value back into a color picker.
export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100
  const light = l / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = light - c / 2
  const sector = Math.floor(((h % 360) + 360) % 360 / 60)
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x]
  ][sector] ?? [0, 0, 0]
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}

/**
 * The key/value pairs a picked color turns into. More than one for `hsl-split` (three components)
 * and for a themed color with no explicit mode (both modes get the same value).
 */
export function colorEntries(field: StyleSettingField, hex: string, mode?: Mode): Record<string, string> {
  const entries: Record<string, string> = {}
  const modes: (Mode | undefined)[] = isThemedColor(field) ? (mode ? [mode] : ['light', 'dark']) : [undefined]

  for (const m of modes) {
    if (isHslSplit(field)) {
      const { h, s, l } = hexToHsl(hex)
      entries[optionKey(field, '-h', m)] = String(h)
      entries[optionKey(field, '-s', m)] = `${s}%`
      entries[optionKey(field, '-l', m)] = `${l}%`
      continue
    }
    entries[optionKey(field, undefined, m)] = formatColor(hex, field.format)
  }
  return entries
}

function formatColor(hex: string, format: string | undefined): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  switch (format) {
    case 'rgb':
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
    case 'rgb-split':
    case 'rgb-values':
      return `${rgb.r}, ${rgb.g}, ${rgb.b}`
    case 'hsl': {
      const { h, s, l } = hexToHsl(hex)
      return `hsl(${h}, ${s}%, ${l}%)`
    }
    case 'hsl-values': {
      const { h, s, l } = hexToHsl(hex)
      return `${h}, ${s}%, ${l}%`
    }
    default:
      return hex
  }
}

// Every key a field occupies, so "reset" can clear all of them (an hsl-split themed color owns
// six) rather than leaving orphaned components behind that still override the theme.
export function keysOf(field: StyleSettingField): string[] {
  const modes: (Mode | undefined)[] = isThemedColor(field) ? ['light', 'dark'] : [undefined]
  const suffixes = isHslSplit(field) ? ['-h', '-s', '-l'] : [undefined]
  const keys: string[] = []
  for (const m of modes) {
    for (const suffix of suffixes) keys.push(optionKey(field, suffix, m))
    // A themed color written before its format was known (or by hand) can also sit on the
    // unsuffixed key; clearing it too keeps a reset complete.
    if (isHslSplit(field)) keys.push(optionKey(field, undefined, m))
  }
  if (isThemedColor(field)) keys.push(optionKey(field))
  return Array.from(new Set(keys))
}

function parseColorValue(raw: unknown, format: string | undefined): string | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined
  const value = raw.trim()
  if (/^#([0-9a-f]{3}){1,2}$/i.test(value)) {
    if (value.length === 4) {
      // expand #abc so the color input, which only accepts 6-digit hex, still shows it
      return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
    }
    return value
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(value) ?? (format?.startsWith('rgb') ? [value, value] : null)
  if (rgb) {
    const parts = rgb[1].split(',').map((part) => Number(part.trim()))
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => !Number.isNaN(n))) {
      return rgbToHex(parts[0], parts[1], parts[2])
    }
  }
  const hsl = /^hsla?\(([^)]+)\)$/i.exec(value) ?? (format?.startsWith('hsl') ? [value, value] : null)
  if (hsl) {
    const parts = hsl[1].split(',').map((part) => Number(part.trim().replace('%', '')))
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => !Number.isNaN(n))) {
      return hslToHex(parts[0], parts[1], parts[2])
    }
  }
  return undefined
}

/**
 * The color currently stored for this field, as hex for a color input - or the theme's own default
 * when nothing is stored, so the picker opens on the real current color instead of black.
 */
export function readColor(
  field: StyleSettingField,
  values: Record<string, unknown>,
  mode?: Mode
): { hex: string | undefined; isSet: boolean } {
  if (isHslSplit(field)) {
    const h = values[optionKey(field, '-h', mode)]
    const s = values[optionKey(field, '-s', mode)]
    const l = values[optionKey(field, '-l', mode)]
    if (h !== undefined && s !== undefined && l !== undefined) {
      const nums = [h, s, l].map((part) => Number(String(part).replace('%', '')))
      if (nums.every((n) => !Number.isNaN(n))) return { hex: hslToHex(nums[0], nums[1], nums[2]), isSet: true }
    }
  } else {
    const stored = values[optionKey(field, undefined, mode)]
    const parsed = parseColorValue(stored, field.format)
    if (parsed) return { hex: parsed, isSet: true }
  }
  const fallback = mode === 'dark' ? field.defaultDark : mode === 'light' ? field.defaultLight : undefined
  const raw = fallback ?? (typeof field.default === 'string' ? field.default : undefined)
  return { hex: parseColorValue(raw, field.format), isSet: false }
}
