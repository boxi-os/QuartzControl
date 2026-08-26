import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, TextInput } from '../../components/ui'
import {
  CALLOUT_COLORS,
  CSS_VARIABLES,
  resolveCalloutColorValue,
  type CalloutColorDef,
  type CssVariableDef
} from '../../data/cssVariables'
import { cssColorToHex, effectiveValue, isDisplayableColor, resolvedValue, type ResolveContext } from './variableGraph'
import { useStyles } from './index'

// Read-only reference of the CSS custom properties available at the point custom.scss is included:
// Quartz's classic-color-derived variables (see cssVariables.ts) plus whatever the "Variablen" tab
// has discovered by scanning real build output. This panel never writes and no longer scans on its
// own - changing what a variable resolves to is the Variablen tab's job, and both read the same
// discovered-key list from the Styles context. Clicking a row inserts text at the editor's cursor
// (a bare `var(--name)`, or - for callout colors, which are scoped per selector rather than global,
// see CALLOUT_COLORS - a whole override scaffold).
export default function CssVariableReference({ onInsert }: { onInsert: (text: string) => void }): JSX.Element {
  const { t } = useTranslation()
  const { config, graph, overrides, goToTab } = useStyles()
  const colors = (config.theme.colors as { lightMode?: Record<string, string>; darkMode?: Record<string, string> }) ?? {}
  const typography = config.theme.typography as Record<string, string> | undefined
  const ctx: ResolveContext = { graph, overrides, colors, typography }

  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()

  const knownKeys = new Set(CSS_VARIABLES.map((v) => v.key))
  // Unsearched, this panel stays at the curated catalog plus whatever the user has overridden -
  // listing a theme's ~1000 variables in a sidebar next to the editor would bury the handful
  // anyone actually inserts. A query searches the full table.
  const extraKeys = query
    ? Object.keys(graph?.vars ?? {}).filter((key) => !knownKeys.has(key))
    : Object.keys(overrides).filter((key) => !knownKeys.has(key))
  const allDefs: CssVariableDef[] = [
    ...CSS_VARIABLES,
    ...extraKeys.map((key) => ({ key, group: t('styleEditor.cssVars.discoveredGroup'), kind: 'discovered' as const }))
  ]

  const filtered = query ? allDefs.filter((def) => def.key.toLowerCase().includes(query)).slice(0, 80) : allDefs

  const grouped = new Map<string, CssVariableDef[]>()
  for (const def of filtered) {
    const list = grouped.get(def.group) ?? []
    list.push(def)
    grouped.set(def.group, list)
  }

  return (
    <Card>
      <h2 className="mb-2 text-sm font-semibold">{t('styleEditor.cssVars.heading')}</h2>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
        {t('styleEditor.cssVars.description')}{' '}
        <button type="button" className="underline" onClick={() => goToTab('variables')}>
          {t('styleEditor.cssVars.goToVariables')}
        </button>
      </p>
      <TextInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('styleEditor.cssVars.searchPlaceholder')}
        className="mb-3 w-full"
      />
      {filtered.length === 0 && <p className="text-xs text-slate-500">{t('styleEditor.cssVars.noResults')}</p>}
      <div className="flex flex-col gap-3">
        {Array.from(grouped.entries()).map(([group, defs]) => (
          <div key={group}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</p>
            <div className="flex flex-col gap-0.5">
              {defs.map((def) => (
                <VariableRow key={def.key} def={def} ctx={ctx} onInsert={onInsert} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-400">{t('styleEditor.cssVars.insertHint')}</p>

      <div className="mt-4 border-t border-black/[0.06] pt-3 dark:border-white/10">
        <h2 className="mb-1 text-sm font-semibold">{t('styleEditor.cssVars.calloutsHeading')}</h2>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t('styleEditor.cssVars.calloutsDescription')}</p>
        <div className="flex flex-col gap-0.5">
          {CALLOUT_COLORS.map((def) => (
            <CalloutRow key={def.type} def={def} colors={colors} onInsert={onInsert} />
          ))}
        </div>
      </div>
    </Card>
  )
}

// Values come from the same resolver the Variablen tab uses, so a swatch here shows what the
// variable really paints today - including one whose value is an alias chain into the active
// theme - rather than only what the classic colors would derive. Each kind gets the preview that
// answers "what is this right now" for it: a color its two swatches plus the hex, a font a sample
// set in that very font, anything else its literal value.
function VariableRow({
  def,
  ctx,
  onInsert
}: {
  def: CssVariableDef
  ctx: ResolveContext
  onInsert: (text: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const light = resolvedValue(def.key, 'light', ctx)
  const dark = resolvedValue(def.key, 'dark', ctx)
  const raw = effectiveValue(def.key, 'light', ctx) ?? effectiveValue(def.key, 'dark', ctx) ?? ''
  const isColor = def.kind === 'color' || cssColorToHex(light) !== null
  const isFont = def.kind === 'font'

  return (
    <button
      type="button"
      onClick={() => onInsert(`var(--${def.key})`)}
      className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
      title={t('styleEditor.cssVars.insertHint')}
    >
      {isColor && (
        <span className="flex shrink-0 gap-0.5">
          <Swatch value={light} />
          <Swatch value={dark} />
        </span>
      )}
      <code className="shrink-0 font-mono">--{def.key}</code>
      {isColor && <span className="ml-auto shrink-0 font-mono text-[11px] text-slate-400">{cssColorToHex(light) ?? light ?? '—'}</span>}
      {/* A font stack is a long comma list that told the reader nothing when truncated. The first
          family is its name, and setting the sample in the stack itself shows what it looks like. */}
      {isFont && (
        <span className="ml-auto flex min-w-0 items-baseline gap-2" title={light || raw}>
          <span className="truncate text-slate-500 dark:text-slate-400">{primaryFamily(light || raw)}</span>
          <span className="shrink-0 text-[13px] text-slate-700 dark:text-slate-200" style={{ fontFamily: light || raw }}>
            Aa
          </span>
        </span>
      )}
      {!isColor && !isFont && raw && <span className="ml-auto truncate text-slate-500 dark:text-slate-400">{raw}</span>}
    </button>
  )
}

// The readable half of a font stack: its first family, unquoted.
function primaryFamily(stack: string): string {
  const first = stack.split(',')[0]?.trim() ?? ''
  return first.replace(/^["']|["']$/g, '') || '—'
}

// A callout type's --color/--border/--bg only mean anything inside its own selector (see
// CALLOUT_COLORS' comment in cssVariables.ts) - so clicking here inserts the whole scaffold
// (selector + all three declarations, prefilled with the real current values) rather than a bare
// var() reference, which would silently resolve to nothing anywhere else in the file.
function CalloutRow({
  def,
  colors,
  onInsert
}: {
  def: CalloutColorDef
  colors: { lightMode?: Record<string, string>; darkMode?: Record<string, string> }
  onInsert: (text: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const color = resolveCalloutColorValue(def.color, colors, 'light')
  const border = resolveCalloutColorValue(def.border, colors, 'light')
  const bg = resolveCalloutColorValue(def.bg, colors, 'light')

  function insertScaffold(): void {
    const lines = [`.callout[data-callout="${def.type}"] {`, `  --color: ${def.color};`, `  --border: ${def.border};`]
    if (def.bg) lines.push(`  --bg: ${def.bg};`)
    lines.push('}\n')
    onInsert(`\n${lines.join('\n')}`)
  }

  return (
    <button
      type="button"
      onClick={insertScaffold}
      className="flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
      title={t('styleEditor.cssVars.calloutsInsertHint')}
    >
      <span className="flex shrink-0 gap-0.5">
        <Swatch value={color} />
        <Swatch value={border} />
        {bg && <Swatch value={bg} />}
      </span>
      <code className="font-mono">[!{def.type}]</code>
    </button>
  )
}

function Swatch({ value }: { value: string | undefined }): JSX.Element {
  return (
    <span
      className="h-3 w-3 shrink-0 rounded-sm border border-black/10 dark:border-white/20"
      style={{ backgroundColor: isDisplayableColor(value) ? value : 'transparent' }}
    />
  )
}
