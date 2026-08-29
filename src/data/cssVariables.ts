// Curated catalog of the CSS custom properties Quartz's own quartz/util/theme.ts::joinStyles()
// emits - verified against the real function (fetched from jackyzha0/quartz on GitHub). Two kinds
// of entry: the 9 classic colors + 4 font slots are written directly from theme.colors/typography
// (`--secondary: ${theme.colors.lightMode.secondary}`, ...), while everything after that is a
// `var(--<source>)` alias of one of those (or, for the accent-h/s/l trio, computed from `secondary`
// via the same hexToHsl() ported below) - both kinds resolve through the same `source` field here,
// since an alias's default value is identical to its source variable's value. Anything a plugin
// brings that isn't in this list has no fixed catalog - it can only be found by scanning compiled
// build-output CSS (see the "scan build output" flow in ThemeEditor.tsx / CssVariableReference.tsx).
export type ClassicColorKey = 'light' | 'lightgray' | 'gray' | 'darkgray' | 'dark' | 'secondary' | 'tertiary' | 'highlight' | 'textHighlight'

// The group a variable is filed under. An id rather than a label, because the label is a piece of
// UI text and belongs in the translation files - see styles.variables.groups.* in de.ts/en.ts.
export type CssVariableGroup =
  | 'baseColors'
  | 'surfaces'
  | 'text'
  | 'interaction'
  | 'baseScale'
  | 'fonts'
  | 'navigation'
  | 'tags'
  | 'other'
  | 'accentHsl'

export interface CssVariableDef {
  key: string
  group: CssVariableGroup | string
  // 'discovered' is for a key that came out of the theme/build scan rather than this catalog:
  // nothing is known about what it holds, so it derives no default and gets no typed preview.
  kind: 'color' | 'font' | 'accent-h' | 'accent-s' | 'accent-l' | 'discovered'
  source?: ClassicColorKey | 'header' | 'body' | 'code'
}

export const CSS_VARIABLES: CssVariableDef[] = [
  // The 9 classic colors themselves, written verbatim to --light/--secondary/etc. - everything
  // below is an alias of one of these, not a separate source of truth.
  { key: 'light', group: 'baseColors', kind: 'color', source: 'light' },
  { key: 'lightgray', group: 'baseColors', kind: 'color', source: 'lightgray' },
  { key: 'gray', group: 'baseColors', kind: 'color', source: 'gray' },
  { key: 'darkgray', group: 'baseColors', kind: 'color', source: 'darkgray' },
  { key: 'dark', group: 'baseColors', kind: 'color', source: 'dark' },
  { key: 'secondary', group: 'baseColors', kind: 'color', source: 'secondary' },
  { key: 'tertiary', group: 'baseColors', kind: 'color', source: 'tertiary' },
  { key: 'highlight', group: 'baseColors', kind: 'color', source: 'highlight' },
  { key: 'textHighlight', group: 'baseColors', kind: 'color', source: 'textHighlight' },

  // Surface colors
  { key: 'background-primary', group: 'surfaces', kind: 'color', source: 'light' },
  { key: 'background-primary-alt', group: 'surfaces', kind: 'color', source: 'light' },
  { key: 'background-secondary', group: 'surfaces', kind: 'color', source: 'lightgray' },
  { key: 'background-secondary-alt', group: 'surfaces', kind: 'color', source: 'lightgray' },
  { key: 'background-modifier-border', group: 'surfaces', kind: 'color', source: 'lightgray' },
  { key: 'background-modifier-border-hover', group: 'surfaces', kind: 'color', source: 'gray' },
  { key: 'background-modifier-border-focus', group: 'surfaces', kind: 'color', source: 'secondary' },

  // Text colors
  { key: 'text-normal', group: 'text', kind: 'color', source: 'darkgray' },
  { key: 'text-muted', group: 'text', kind: 'color', source: 'gray' },
  { key: 'text-faint', group: 'text', kind: 'color', source: 'gray' },
  { key: 'text-accent', group: 'text', kind: 'color', source: 'secondary' },
  { key: 'text-accent-hover', group: 'text', kind: 'color', source: 'tertiary' },
  { key: 'text-on-accent', group: 'text', kind: 'color', source: 'light' },
  { key: 'text-on-accent-inverted', group: 'text', kind: 'color', source: 'dark' },
  { key: 'text-highlight-bg', group: 'text', kind: 'color', source: 'textHighlight' },

  // Interactive
  { key: 'interactive-normal', group: 'interaction', kind: 'color', source: 'light' },
  { key: 'interactive-hover', group: 'interaction', kind: 'color', source: 'lightgray' },
  { key: 'interactive-accent', group: 'interaction', kind: 'color', source: 'secondary' },
  { key: 'interactive-accent-hover', group: 'interaction', kind: 'color', source: 'tertiary' },

  // Base scale
  { key: 'color-base-00', group: 'baseScale', kind: 'color', source: 'light' },
  { key: 'color-base-05', group: 'baseScale', kind: 'color', source: 'light' },
  { key: 'color-base-10', group: 'baseScale', kind: 'color', source: 'light' },
  { key: 'color-base-20', group: 'baseScale', kind: 'color', source: 'lightgray' },
  { key: 'color-base-25', group: 'baseScale', kind: 'color', source: 'lightgray' },
  { key: 'color-base-30', group: 'baseScale', kind: 'color', source: 'lightgray' },
  { key: 'color-base-35', group: 'baseScale', kind: 'color', source: 'lightgray' },
  { key: 'color-base-40', group: 'baseScale', kind: 'color', source: 'gray' },
  { key: 'color-base-50', group: 'baseScale', kind: 'color', source: 'gray' },
  { key: 'color-base-60', group: 'baseScale', kind: 'color', source: 'gray' },
  { key: 'color-base-70', group: 'baseScale', kind: 'color', source: 'darkgray' },
  { key: 'color-base-100', group: 'baseScale', kind: 'color', source: 'dark' },

  // Font slots written directly by joinStyles() - titleFont has no separate GUI-managed slot
  // (theme.ts falls back to the header font when title is unset, same as here) and, like the other
  // three, is mode-independent (joinStyles only ever writes it into the light-mode :root block).
  { key: 'titleFont', group: 'fonts', kind: 'font', source: 'header' },
  { key: 'headerFont', group: 'fonts', kind: 'font', source: 'header' },
  { key: 'bodyFont', group: 'fonts', kind: 'font', source: 'body' },
  { key: 'codeFont', group: 'fonts', kind: 'font', source: 'code' },

  // Font aliases (typography, not color)
  { key: 'font-text', group: 'fonts', kind: 'font', source: 'body' },
  { key: 'font-monospace', group: 'fonts', kind: 'font', source: 'code' },
  { key: 'font-interface', group: 'fonts', kind: 'font', source: 'body' },

  // Nav/Sidebar
  { key: 'nav-item-color', group: 'navigation', kind: 'color', source: 'darkgray' },
  { key: 'nav-item-color-hover', group: 'navigation', kind: 'color', source: 'dark' },
  { key: 'nav-item-color-active', group: 'navigation', kind: 'color', source: 'secondary' },
  { key: 'nav-item-background-hover', group: 'navigation', kind: 'color', source: 'lightgray' },
  { key: 'nav-item-background-active', group: 'navigation', kind: 'color', source: 'highlight' },

  // Tags
  { key: 'tag-background', group: 'tags', kind: 'color', source: 'highlight' },
  { key: 'tag-color', group: 'tags', kind: 'color', source: 'secondary' },
  { key: 'tag-background-hover', group: 'tags', kind: 'color', source: 'lightgray' },

  // Misc
  { key: 'icon-color', group: 'other', kind: 'color', source: 'darkgray' },
  { key: 'icon-color-hover', group: 'other', kind: 'color', source: 'dark' },
  { key: 'icon-color-active', group: 'other', kind: 'color', source: 'secondary' },
  { key: 'divider-color', group: 'other', kind: 'color', source: 'lightgray' },
  { key: 'link-color', group: 'other', kind: 'color', source: 'secondary' },
  { key: 'link-color-hover', group: 'other', kind: 'color', source: 'tertiary' },

  // Accent HSL (computed from secondary)
  { key: 'accent-h', group: 'accentHsl', kind: 'accent-h' },
  { key: 'accent-s', group: 'accentHsl', kind: 'accent-s' },
  { key: 'accent-l', group: 'accentHsl', kind: 'accent-l' }
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

// quartz/styles/callouts.scss's second, structurally different source of variables (verified
// against the real file on jackyzha0/quartz): --color/--border/--bg are only ever declared inside
// `.callout[data-callout="<type>"]` - i.e. the *same* variable name is redefined per type, scoped
// to that selector, not a global :root set like CSS_VARIABLES above. A bare `var(--color)` outside
// a matching .callout block resolves to nothing, so these can't share CSS_VARIABLES' flat
// name->value shape; CssVariableReference renders them as their own section and inserts a whole
// override scaffold (the selector plus its three properties), not a bare var() reference.
// `quote` doesn't redeclare --bg in the source, so it falls through to the unscoped default
// `&[data-callout]` rule earlier in the same file (#448aff10, i.e. note's bg) - not a bug, just
// left out here as `bg: undefined` so the panel can show that honestly instead of inventing a
// value quartz itself never sets for that type.
export interface CalloutColorDef {
  type: string
  color: string
  border: string
  bg?: string
}

export const CALLOUT_COLORS: CalloutColorDef[] = [
  { type: 'note', color: '#448aff', border: '#448aff44', bg: '#448aff10' },
  { type: 'abstract', color: '#00b0ff', border: '#00b0ff44', bg: '#00b0ff10' },
  { type: 'info', color: '#00b8d4', border: '#00b8d444', bg: '#00b8d410' },
  { type: 'todo', color: '#00b8d4', border: '#00b8d444', bg: '#00b8d410' },
  { type: 'tip', color: '#00bfa5', border: '#00bfa544', bg: '#00bfa510' },
  { type: 'success', color: '#09ad7a', border: '#09ad7144', bg: '#09ad7110' },
  { type: 'question', color: '#dba642', border: '#dba64244', bg: '#dba64210' },
  { type: 'warning', color: '#db8942', border: '#db894244', bg: '#db894210' },
  { type: 'failure', color: '#db4242', border: '#db424244', bg: '#db424210' },
  { type: 'danger', color: '#db4242', border: '#db424244', bg: '#db424210' },
  { type: 'bug', color: '#db4242', border: '#db424244', bg: '#db424210' },
  { type: 'example', color: '#7a43b5', border: '#7a43b544', bg: '#7a43b510' },
  { type: 'quote', color: 'var(--secondary)', border: 'var(--lightgray)' }
]

// Resolves a callout color entry's literal display value - most are already a raw hex, but
// `quote` deliberately aliases the classic colors (see CALLOUT_COLORS above) so it tracks the
// user's theme instead of a fixed color; this looks that alias up the same way defaultValueFor
// does, so the swatch shown next to it is the real current color instead of a var() string.
export function resolveCalloutColorValue(
  value: string | undefined,
  colors: { lightMode?: Record<string, string>; darkMode?: Record<string, string> },
  mode: 'light' | 'dark'
): string {
  if (!value) return ''
  const match = /^var\(--(\w+)\)$/.exec(value)
  if (!match) return value
  const palette = (mode === 'light' ? colors.lightMode : colors.darkMode) ?? {}
  return palette[match[1]] ?? ''
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
