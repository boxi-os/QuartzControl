import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Palette, Variable } from 'lucide-react'
import { Card, CardHeading, TextInput, useCopyToClipboard } from '../../components/ui'
import VariableGroup from './VariableGroup'
import { useStickyState } from '../../state/uiState'
import {
  CALLOUT_COLORS,
  CSS_VARIABLES,
  resolveCalloutColorValue,
  type CalloutColorDef,
  type CssVariableDef
} from '../../data/cssVariables'
import { cssColorToHex, effectiveValue, groupLabel, isDisplayableColor, resolvedValue, type ResolveContext } from './variableGraph'
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
  // Same rule as the Variablen tab: only the base colours start open. A search overrides it
  // entirely - a query that hides its own hits inside collapsed categories would be worse than
  // no search at all.
  const [openGroups, setOpenGroups] = useStickyState<string[]>('styleEditor.cssVars.openGroups', ['baseColors'])
  const [calloutsOpen, setCalloutsOpen] = useStickyState('styleEditor.cssVars.calloutsOpen', false)

  function toggleGroup(group: string): void {
    setOpenGroups((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]))
  }

  const knownKeys = new Set(CSS_VARIABLES.map((v) => v.key))
  // Unsearched, this panel stays at the curated catalog plus whatever the user has overridden -
  // listing a theme's ~1000 variables in a sidebar next to the editor would bury the handful
  // anyone actually inserts. A query searches the full table.
  const extraKeys = query
    ? Object.keys(graph?.vars ?? {}).filter((key) => !knownKeys.has(key))
    : Object.keys(overrides).filter((key) => !knownKeys.has(key))
  const allDefs: CssVariableDef[] = [
    ...CSS_VARIABLES,
    ...extraKeys.map((key) => ({ key, group: 'discovered', kind: 'discovered' as const }))
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
      <CardHeading icon={Variable} className="mb-2">{t('styleEditor.cssVars.heading')}</CardHeading>
      <p className="mb-2 text-xs text-text-muted">
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
      {filtered.length === 0 && <p className="text-xs text-text-muted">{t('styleEditor.cssVars.noResults')}</p>}
      <div className="flex flex-col gap-1">
        {Array.from(grouped.entries()).map(([group, defs]) => (
          <VariableGroup
            key={group}
            label={group === 'discovered' ? t('styleEditor.cssVars.discoveredGroup') : groupLabel(t, group)}
            count={defs.length}
            open={!!query || openGroups.includes(group)}
            onToggle={() => toggleGroup(group)}
          >
            {defs.map((def) => (
              <VariableRow key={def.key} def={def} ctx={ctx} onInsert={onInsert} onCopy={copy} />
            ))}
          </VariableGroup>
        ))}
      </div>
      <p className="mt-3 text-micro text-text-muted">{t('styleEditor.cssVars.rowHint')}</p>
      {/* Mounted whether or not anything was copied - see PageHeader's status slot. */}
      <p role="status" className="mt-1 min-h-[15px] truncate text-micro text-green-700 dark:text-green-400">
        {copied ? t('common.copied', { value: copied }) : ''}
      </p>

      <div className="mt-4 border-t border-ink/[0.06] pt-3 dark:border-ink/10">
        <CardHeading icon={Palette} className="mb-1">{t('styleEditor.cssVars.calloutsHeading')}</CardHeading>
        <p className="mb-2 text-xs text-text-muted">{t('styleEditor.cssVars.calloutsDescription')}</p>
        <VariableGroup
          label={t('styleEditor.cssVars.calloutsGroup')}
          count={CALLOUT_COLORS.length}
          open={calloutsOpen}
          onToggle={() => setCalloutsOpen((prev) => !prev)}
        >
          {CALLOUT_COLORS.map((def) => (
            <CalloutRow key={def.type} def={def} colors={colors} onInsert={onInsert} onCopy={copy} />
          ))}
        </VariableGroup>
      </div>
    </Card>
  )
}

// Every target in this row inserts; nothing here copies on a plain click. The editor is a
// centimetre to the left, and "I want this in my file" is what the panel is for - the clipboard
// was the detour. Option-click still copies, for both the value and the name, because the two are
// the same gesture with a different destination.
//
// Which text goes in is per target, and that distinction is the point: the *name* inserts
// `var(--x)`, so the rule follows the variable; a *swatch* inserts the literal that half resolves
// to right now, which is what you want when a rule has to match a colour rather than follow it.
// The literal value is still not printed: it was the widest thing in a narrow sidebar and ran out
// of the card, and the swatch plus the title say the same thing without overflowing.
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
  const modeValue = (mode: 'light' | 'dark'): string => {
    const resolved = mode === 'light' ? light : dark
    return cssColorToHex(resolved) ?? resolved ?? raw
  }
  // One handler for both destinations: Option means clipboard, everything else means editor.
  const put = (e: React.MouseEvent, text: string): void => {
    if (e.altKey) onCopy(text, `--${def.key}`)
    else onInsert(text)
  }

  // No hover fill on the row: the two things one can hit say so themselves (the name underlines,
  // a swatch gets a ring), and a block of colour behind them made the sidebar look like a list of
  // selected items.
  return (
    <div className="flex items-center gap-2 rounded px-1.5 py-1 text-xs">
      {isColor && (
        <span className="flex shrink-0 gap-0.5">
          {(['light', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={(e) => put(e, modeValue(mode))}
              title={t('styleEditor.cssVars.insertValueHint', { value: modeValue(mode) })}
              aria-label={t('styleEditor.cssVars.insertValueLabel', {
                key: def.key,
                mode: t(`styles.variables.${mode}`)
              })}
              className="h-4 w-4 shrink-0 rounded-sm border border-ink/10 hover:outline hover:outline-2 hover:outline-offset-1 hover:outline-blue-500/50 dark:border-ink/20"
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
        onClick={(e) => put(e, `var(--${def.key})`)}
        className="min-w-0 flex-1 truncate text-left font-mono hover:underline"
        title={t('styleEditor.cssVars.insertHint')}
      >
        --{def.key}
      </button>
      {/* A font's preview is the sample itself, set in the very stack it names - clicking it puts
          that stack in, the same as a colour swatch puts its value in. */}
      {isFont && (
        <button
          type="button"
          onClick={(e) => put(e, light || raw)}
          title={t('styleEditor.cssVars.insertValueHint', { value: light || raw })}
          className="shrink-0 rounded px-1 text-ui text-text hover:bg-ink/[0.06] dark:hover:bg-ink/10"
          style={{ fontFamily: light || raw }}
        >
          Aa
        </button>
      )}
      {!isColor && !isFont && raw && (
        <button
          type="button"
          onClick={(e) => put(e, raw)}
          title={t('styleEditor.cssVars.insertValueHint', { value: raw })}
          className="shrink-0 rounded px-1 text-micro text-text-muted hover:bg-ink/[0.06] dark:hover:bg-ink/10"
        >
          {t('styleEditor.cssVars.insertValue')}
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
    <div className="flex items-center gap-2 rounded px-1.5 py-1 text-xs">
      <span className="flex shrink-0 gap-0.5">
        {([['--color', color], ['--border', border], ['--bg', bg]] as const)
          .filter(([, value]) => !!value)
          .map(([name, value]) => {
            const literal = cssColorToHex(value) ?? value!
            return (
              <button
                key={name}
                type="button"
                onClick={(e) => (e.altKey ? onCopy(literal, `[!${def.type}] ${name}`) : onInsert(literal))}
                title={t('styleEditor.cssVars.insertValueHint', { value: literal })}
                className="h-4 w-4 shrink-0 rounded-sm border border-ink/10 hover:outline hover:outline-2 hover:outline-offset-1 hover:outline-blue-500/50 dark:border-ink/20"
                style={{ backgroundColor: isDisplayableColor(value) ? value : 'transparent' }}
              />
            )
          })}
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
