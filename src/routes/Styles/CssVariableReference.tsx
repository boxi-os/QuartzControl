import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, TextInput, useCopyToClipboard } from '../../components/ui'
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

  const { copied, copy } = useCopyToClipboard()
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
                <VariableRow key={def.key} def={def} ctx={ctx} onInsert={onInsert} onCopy={copy} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-400">{t('styleEditor.cssVars.rowHint')}</p>
      {copied && <p className="mt-1 truncate text-[11px] text-green-700 dark:text-green-400">{t('common.copied', { value: copied })}</p>}

      <div className="mt-4 border-t border-black/[0.06] pt-3 dark:border-white/10">
        <h2 className="mb-1 text-sm font-semibold">{t('styleEditor.cssVars.calloutsHeading')}</h2>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t('styleEditor.cssVars.calloutsDescription')}</p>
        <div className="flex flex-col gap-0.5">
          {CALLOUT_COLORS.map((def) => (
            <CalloutRow key={def.type} def={def} colors={colors} onInsert={onInsert} onCopy={copy} />
          ))}
        </div>
      </div>
    </Card>
  )
}

// Two separate targets in one row, because they answer two different needs: the name inserts
// `var(--x)` into the editor, the preview copies the value the variable resolves to right now (a
// hex, a font stack) - which is what you want when writing a rule that has to *match* a colour
// rather than follow it. The literal value is no longer printed: it was the widest thing in a
// narrow sidebar and regularly ran out of the card, and the swatch plus the title attribute say
// the same thing without overflowing.
function VariableRow({
  def,
  ctx,
  onInsert,
  onCopy
}: {
  def: CssVariableDef
  ctx: ResolveContext
  onInsert: (text: string) => void
  onCopy: (value: string, label: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const light = resolvedValue(def.key, 'light', ctx)
  const dark = resolvedValue(def.key, 'dark', ctx)
  const raw = effectiveValue(def.key, 'light', ctx) ?? effectiveValue(def.key, 'dark', ctx) ?? ''
  const isColor = def.kind === 'color' || cssColorToHex(light) !== null
  const isFont = def.kind === 'font'
  const copyValue = (mode: 'light' | 'dark'): string => {
    const resolved = mode === 'light' ? light : dark
    return cssColorToHex(resolved) ?? resolved ?? raw
  }

  return (
    <div className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
      {isColor && (
        <span className="flex shrink-0 gap-0.5">
          {(['light', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onCopy(copyValue(mode), `--${def.key}`)}
              title={t('styleEditor.cssVars.copyHint', { value: copyValue(mode) })}
              className="h-4 w-4 shrink-0 rounded-sm border border-black/10 dark:border-white/20"
              style={{
                backgroundColor: isDisplayableColor(mode === 'light' ? light : dark)
                  ? (mode === 'light' ? light : dark)
                  : 'transparent'
              }}
            />
          ))}
        </span>
      )}
      <button
        type="button"
        onClick={() => onInsert(`var(--${def.key})`)}
        className="min-w-0 flex-1 truncate text-left font-mono hover:underline"
        title={t('styleEditor.cssVars.insertHint')}
      >
        --{def.key}
      </button>
      {/* A font's preview is the sample itself, set in the very stack it names - clicking it copies
          the stack, the same as a colour swatch copies its value. */}
      {isFont && (
        <button
          type="button"
          onClick={() => onCopy(light || raw, `--${def.key}`)}
          title={t('styleEditor.cssVars.copyHint', { value: light || raw })}
          className="shrink-0 rounded px-1 text-[13px] text-slate-700 hover:bg-black/[0.06] dark:text-slate-200 dark:hover:bg-white/10"
          style={{ fontFamily: light || raw }}
        >
          Aa
        </button>
      )}
      {!isColor && !isFont && raw && (
        <button
          type="button"
          onClick={() => onCopy(raw, `--${def.key}`)}
          title={t('styleEditor.cssVars.copyHint', { value: raw })}
          className="shrink-0 rounded px-1 text-[11px] text-slate-400 hover:bg-black/[0.06] dark:hover:bg-white/10"
        >
          {t('styleEditor.cssVars.copyValue')}
        </button>
      )}
    </div>
  )
}

// A callout type's --color/--border/--bg only mean anything inside its own selector (see
// CALLOUT_COLORS' comment in cssVariables.ts) - so clicking here inserts the whole scaffold
// (selector + all three declarations, prefilled with the real current values) rather than a bare
// var() reference, which would silently resolve to nothing anywhere else in the file.
function CalloutRow({
  def,
  colors,
  onInsert,
  onCopy
}: {
  def: CalloutColorDef
  colors: { lightMode?: Record<string, string>; darkMode?: Record<string, string> }
  onInsert: (text: string) => void
  onCopy: (value: string, label: string) => void
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
    <div className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
      <span className="flex shrink-0 gap-0.5">
        {([['--color', color], ['--border', border], ['--bg', bg]] as const)
          .filter(([, value]) => !!value)
          .map(([name, value]) => (
            <button
              key={name}
              type="button"
              onClick={() => onCopy(cssColorToHex(value) ?? value!, `[!${def.type}] ${name}`)}
              title={t('styleEditor.cssVars.copyHint', { value: cssColorToHex(value) ?? value })}
              className="h-4 w-4 shrink-0 rounded-sm border border-black/10 dark:border-white/20"
              style={{ backgroundColor: isDisplayableColor(value) ? value : 'transparent' }}
            />
          ))}
      </span>
      <button
        type="button"
        onClick={insertScaffold}
        className="min-w-0 flex-1 truncate text-left font-mono hover:underline"
        title={t('styleEditor.cssVars.calloutsInsertHint')}
      >
        [!{def.type}]
      </button>
    </div>
  )
}
