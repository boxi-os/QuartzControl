// Curated catalog of the CSS custom properties Quartz's own quartz/util/theme.ts::joinStyles()
// derives from the 9 classic colors (+ typography) already editable above this section in
// ThemeEditor.tsx. Verified against the real function: every entry below is either a straight
// `var(--<source>)` alias of one of the 9 classic colors, a typography-slot alias, or (the
// accent-h/s/l trio) computed from `secondary` via the same hexToHsl() ported below. Anything a
// plugin brings that isn't in this list has no fixed catalog - it can only be found by scanning
// compiled build-output CSS (see the "scan build output" flow in ThemeEditor.tsx).
export type ClassicColorKey = 'light' | 'lightgray' | 'gray' | 'darkgray' | 'dark' | 'secondary' | 'tertiary' | 'highlight' | 'textHighlight'

export interface CssVariableDef {
  key: string
  group: string
  kind: 'color' | 'font' | 'accent-h' | 'accent-s' | 'accent-l'
  source?: ClassicColorKey | 'header' | 'body' | 'code'
}

export const CSS_VARIABLES: CssVariableDef[] = [
  // Surface colors
  { key: 'background-primary', group: 'Oberflächen', kind: 'color', source: 'light' },
  { key: 'background-primary-alt', group: 'Oberflächen', kind: 'color', source: 'light' },
  { key: 'background-secondary', group: 'Oberflächen', kind: 'color', source: 'lightgray' },
  { key: 'background-secondary-alt', group: 'Oberflächen', kind: 'color', source: 'lightgray' },
  { key: 'background-modifier-border', group: 'Oberflächen', kind: 'color', source: 'lightgray' },
  { key: 'background-modifier-border-hover', group: 'Oberflächen', kind: 'color', source: 'gray' },
  { key: 'background-modifier-border-focus', group: 'Oberflächen', kind: 'color', source: 'secondary' },

  // Text colors
  { key: 'text-normal', group: 'Text', kind: 'color', source: 'darkgray' },
  { key: 'text-muted', group: 'Text', kind: 'color', source: 'gray' },
  { key: 'text-faint', group: 'Text', kind: 'color', source: 'gray' },
  { key: 'text-accent', group: 'Text', kind: 'color', source: 'secondary' },
  { key: 'text-accent-hover', group: 'Text', kind: 'color', source: 'tertiary' },
  { key: 'text-on-accent', group: 'Text', kind: 'color', source: 'light' },
  { key: 'text-on-accent-inverted', group: 'Text', kind: 'color', source: 'dark' },
  { key: 'text-highlight-bg', group: 'Text', kind: 'color', source: 'textHighlight' },

  // Interactive
  { key: 'interactive-normal', group: 'Interaktion', kind: 'color', source: 'light' },
  { key: 'interactive-hover', group: 'Interaktion', kind: 'color', source: 'lightgray' },
  { key: 'interactive-accent', group: 'Interaktion', kind: 'color', source: 'secondary' },
  { key: 'interactive-accent-hover', group: 'Interaktion', kind: 'color', source: 'tertiary' },

  // Base scale
  { key: 'color-base-00', group: 'Basis-Skala', kind: 'color', source: 'light' },
  { key: 'color-base-05', group: 'Basis-Skala', kind: 'color', source: 'light' },
  { key: 'color-base-10', group: 'Basis-Skala', kind: 'color', source: 'light' },
  { key: 'color-base-20', group: 'Basis-Skala', kind: 'color', source: 'lightgray' },
  { key: 'color-base-25', group: 'Basis-Skala', kind: 'color', source: 'lightgray' },
  { key: 'color-base-30', group: 'Basis-Skala', kind: 'color', source: 'lightgray' },
  { key: 'color-base-35', group: 'Basis-Skala', kind: 'color', source: 'lightgray' },
  { key: 'color-base-40', group: 'Basis-Skala', kind: 'color', source: 'gray' },
  { key: 'color-base-50', group: 'Basis-Skala', kind: 'color', source: 'gray' },
  { key: 'color-base-60', group: 'Basis-Skala', kind: 'color', source: 'gray' },
  { key: 'color-base-70', group: 'Basis-Skala', kind: 'color', source: 'darkgray' },
  { key: 'color-base-100', group: 'Basis-Skala', kind: 'color', source: 'dark' },

  // Font aliases (typography, not color)
  { key: 'font-text', group: 'Schriften', kind: 'font', source: 'body' },
  { key: 'font-monospace', group: 'Schriften', kind: 'font', source: 'code' },
  { key: 'font-interface', group: 'Schriften', kind: 'font', source: 'body' },

  // Nav/Sidebar
  { key: 'nav-item-color', group: 'Navigation', kind: 'color', source: 'darkgray' },
  { key: 'nav-item-color-hover', group: 'Navigation', kind: 'color', source: 'dark' },
  { key: 'nav-item-color-active', group: 'Navigation', kind: 'color', source: 'secondary' },
  { key: 'nav-item-background-hover', group: 'Navigation', kind: 'color', source: 'lightgray' },
  { key: 'nav-item-background-active', group: 'Navigation', kind: 'color', source: 'highlight' },

  // Tags
  { key: 'tag-background', group: 'Tags', kind: 'color', source: 'highlight' },
  { key: 'tag-color', group: 'Tags', kind: 'color', source: 'secondary' },
  { key: 'tag-background-hover', group: 'Tags', kind: 'color', source: 'lightgray' },

  // Misc
  { key: 'icon-color', group: 'Sonstiges', kind: 'color', source: 'darkgray' },
  { key: 'icon-color-hover', group: 'Sonstiges', kind: 'color', source: 'dark' },
  { key: 'icon-color-active', group: 'Sonstiges', kind: 'color', source: 'secondary' },
  { key: 'divider-color', group: 'Sonstiges', kind: 'color', source: 'lightgray' },
  { key: 'link-color', group: 'Sonstiges', kind: 'color', source: 'secondary' },
  { key: 'link-color-hover', group: 'Sonstiges', kind: 'color', source: 'tertiary' },

  // Accent HSL (computed from secondary)
  { key: 'accent-h', group: 'Akzent (HSL)', kind: 'accent-h' },
  { key: 'accent-s', group: 'Akzent (HSL)', kind: 'accent-s' },
  { key: 'accent-l', group: 'Akzent (HSL)', kind: 'accent-l' }
]

// Direct port of quartz/util/theme.ts's hexToHsl() (same rounding, same fallback for an unparsable
// hex) so the editor's prefilled accent-h/s/l defaults match exactly what a real build computes.
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return { h: 0, s: 0, l: 0 }

  const r = parseInt(result[1], 16) / 255
  const g = parseInt(result[2], 16) / 255
  const b = parseInt(result[3], 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      break
    case g:
      h = ((b - r) / d + 2) / 6
      break
    case b:
      h = ((r - g) / d + 4) / 6
      break
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

// Computes the value this variable would resolve to today, absent any override - used to prefill
// the light/dark value fields when a variable's "anpassen" toggle is switched on, so both fields
// start from the real current default rather than blank.
export function defaultValueFor(
  def: CssVariableDef,
  colors: { lightMode?: Record<string, string>; darkMode?: Record<string, string> },
  typography: Record<string, string> | undefined,
  mode: 'light' | 'dark'
): string {
  const palette = (mode === 'light' ? colors.lightMode : colors.darkMode) ?? {}
  if (def.kind === 'color' && def.source) return palette[def.source] ?? ''
  if (def.kind === 'font' && def.source) return typography?.[def.source] ?? ''
  if (def.kind === 'accent-h' || def.kind === 'accent-s' || def.kind === 'accent-l') {
    const hsl = hexToHsl(palette.secondary ?? '')
    if (def.kind === 'accent-h') return String(hsl.h)
    if (def.kind === 'accent-s') return `${hsl.s}%`
    return `${hsl.l}%`
  }
  return ''
}
