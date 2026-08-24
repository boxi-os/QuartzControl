import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { QuartzConfig } from '@shared/ipc-contract'
import { Button, Card, TextInput } from '../../components/ui'
import {
  CALLOUT_COLORS,
  CSS_VARIABLES,
  defaultValueFor,
  resolveCalloutColorValue,
  type CalloutColorDef,
  type CssVariableDef
} from '../../data/cssVariables'

type Theme = QuartzConfig['theme']

// Read-only reference of the CSS custom properties available at the point custom.scss is included
// - Quartz's classic-color-derived variables (see cssVariables.ts, same catalog ThemeEditor's
// override editor uses) plus anything a plugin injects that curated catalog doesn't know about
// (found on demand by scanning real compiled build output, same IPC call as ThemeEditor's "scan"
// button). Unlike ThemeEditor this never writes anything - clicking a row inserts text (either a
// bare `var(--name)`, or - for callout colors, which are scoped per selector rather than global,
// see CALLOUT_COLORS - a whole override scaffold) at the editor's cursor; changing what a variable
// resolves to is ThemeEditor's job.
export default function CssVariableReference({
  theme,
  projectPath,
  onInsert
}: {
  theme: Theme
  projectPath: string
  onInsert: (text: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const colors = (theme.colors as { lightMode?: Record<string, string>; darkMode?: Record<string, string> }) ?? {}
  const typography = theme.typography as Record<string, string> | undefined

  const [search, setSearch] = useState('')
  const [extraKeys, setExtraKeys] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function scanBuildOutput(): Promise<void> {
    setScanning(true)
    setMessage(null)
    try {
      const found = await window.quartzGui.styles.scanBuildOutputVariables(projectPath)
      const knownKeys = new Set(CSS_VARIABLES.map((v) => v.key))
      const newOnes = found.filter((k) => !knownKeys.has(k) && !extraKeys.includes(k))
      setMessage(
        newOnes.length === 0
          ? t('styleEditor.cssVars.scanNoneFound')
          : t('styleEditor.cssVars.scanFound', { count: newOnes.length })
      )
      if (newOnes.length > 0) setExtraKeys((prev) => [...prev, ...newOnes])
    } catch (err) {
      setMessage(String(err))
    }
    setScanning(false)
  }

  const allDefs: CssVariableDef[] = useMemo(
    () => [
      ...CSS_VARIABLES,
      ...extraKeys.map((key) => ({ key, group: t('styleEditor.cssVars.discoveredGroup'), kind: 'font' as const }))
    ],
    [extraKeys, t]
  )

  const query = search.trim().toLowerCase()
  const filtered = query ? allDefs.filter((def) => def.key.toLowerCase().includes(query)) : allDefs

  const grouped = new Map<string, CssVariableDef[]>()
  for (const def of filtered) {
    const list = grouped.get(def.group) ?? []
    list.push(def)
    grouped.set(def.group, list)
  }

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t('styleEditor.cssVars.heading')}</h2>
        <Button variant="ghost" onClick={scanBuildOutput} disabled={scanning}>
          {scanning ? t('common.loading') : t('styleEditor.cssVars.scanButton')}
        </Button>
      </div>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{t('styleEditor.cssVars.description')}</p>
      <TextInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('styleEditor.cssVars.searchPlaceholder')}
        className="mb-3 w-full"
      />
      {message && <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">{message}</p>}
      {filtered.length === 0 && <p className="text-xs text-slate-500">{t('styleEditor.cssVars.noResults')}</p>}
      <div className="flex flex-col gap-3">
        {Array.from(grouped.entries()).map(([group, defs]) => (
          <div key={group}>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</p>
            <div className="flex flex-col gap-0.5">
              {defs.map((def) => (
                <VariableRow key={def.key} def={def} colors={colors} typography={typography} onInsert={onInsert} />
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

function VariableRow({
  def,
  colors,
  typography,
  onInsert
}: {
  def: CssVariableDef
  colors: { lightMode?: Record<string, string>; darkMode?: Record<string, string> }
  typography: Record<string, string> | undefined
  onInsert: (text: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const light = defaultValueFor(def, colors, typography, 'light')
  const dark = defaultValueFor(def, colors, typography, 'dark')
  const isColor = def.kind === 'color'

  return (
    <button
      type="button"
      onClick={() => onInsert(`var(--${def.key})`)}
      className="flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
      title={t('styleEditor.cssVars.insertHint')}
    >
      {isColor && (
        <span className="flex shrink-0 gap-0.5">
          <Swatch value={light} />
          <Swatch value={dark} />
        </span>
      )}
      <code className="font-mono">--{def.key}</code>
      {!isColor && (light || dark) && <span className="truncate text-slate-500 dark:text-slate-400">{light || dark}</span>}
    </button>
  )
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

function Swatch({ value }: { value: string }): JSX.Element {
  const isValidColor = /^#([0-9a-f]{3,4}){1,2}$/i.test(value)
  return (
    <span
      className="h-3 w-3 shrink-0 rounded-sm border border-black/10 dark:border-white/20"
      style={{ backgroundColor: isValidColor ? value : 'transparent' }}
    />
  )
}
