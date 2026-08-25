import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { CssVariableOverride } from '@shared/ipc-contract'
import { Button, Card, TextInput } from '../../components/ui'
import { CSS_VARIABLES } from '../../data/cssVariables'
import VariableRow from './VariableRow'
import { allKnownKeys, groupOf, type Mode, type ResolveContext } from './variableGraph'
import { useStyles } from './index'

// How many rows the searchable table renders at once. A community theme can declare ~1000
// variables (tokyo-night: 978), and every row that is on screen resolves its own derivation chain,
// so the list is capped and says so rather than quietly truncating.
const MAX_RESULTS = 150

// The only place CSS custom properties are *edited*. Two deliberately separate tables: the curated
// catalog of variables Quartz itself derives from the classic colors (short, always visible), and
// everything a theme or plugin brings (long, search-driven). Before this split both lived in one
// flat list that a "scan build output" button dumped hundreds of unlabelled keys into.
//
// Overrides are written into a marker-delimited managed block in custom.scss, so saving here
// rewrites that file - hence the reloadScss() afterwards, which keeps the CSS tab's draft in sync.
export default function Variables(): JSX.Element {
  const { t } = useTranslation()
  const { project, config, overrides, setOverrides, graph, graphLoading, reloadGraph, registerSave, reloadScss } =
    useStyles()

  useEffect(() =>
    registerSave(async () => {
      const list: CssVariableOverride[] = Object.entries(overrides).map(([key, v]) => ({
        key,
        light: v.light,
        dark: v.dark
      }))
      await window.quartzGui.styles.saveVariableOverrides(project.path, list)
      await reloadScss()
    })
  )

  const ctx: ResolveContext = {
    graph,
    overrides,
    colors: (config.theme.colors as { lightMode?: Record<string, string>; darkMode?: Record<string, string> }) ?? {},
    typography: config.theme.typography as Record<string, string> | undefined
  }

  function setValue(key: string, mode: Mode, value: string): void {
    setOverrides((prev) => {
      const current = prev[key] ?? { light: '', dark: '' }
      return { ...prev, [key]: { ...current, [mode]: value } }
    })
  }

  function reset(key: string): void {
    setOverrides((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const rowProps = (key: string): Parameters<typeof VariableRow>[0] => ({
    varKey: key,
    ctx,
    dependents: graph?.dependents[key] ?? [],
    onSet: (mode, value) => setValue(key, mode, value),
    onReset: () => reset(key)
  })

  const curatedGroups = useMemo(() => {
    const grouped = new Map<string, string[]>()
    for (const def of CSS_VARIABLES) {
      const list = grouped.get(def.group) ?? []
      list.push(def.key)
      grouped.set(def.group, list)
    }
    return Array.from(grouped.entries())
  }, [])

  const curatedKeys = useMemo(() => new Set(CSS_VARIABLES.map((def) => def.key)), [])
  const extraKeys = useMemo(
    () => allKnownKeys(ctx).filter((key) => !curatedKeys.has(key)).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph, overrides, curatedKeys]
  )

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Card>
        <h3 className="mb-1 text-sm font-semibold">{t('styles.variables.mainHeading')}</h3>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('styles.variables.mainDescription')}</p>
        <div className="flex flex-col gap-4">
          {curatedGroups.map(([group, keys]) => (
            <div key={group}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</p>
              <div className="flex flex-col gap-0.5">
                {keys.map((key) => (
                  <VariableRow key={key} {...rowProps(key)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <AllVariables
        keys={extraKeys}
        overrides={overrides}
        loading={graphLoading}
        sources={graph?.sources}
        themeId={graph?.themeId}
        onReload={reloadGraph}
        renderRow={(key) => <VariableRow key={key} {...rowProps(key)} />}
      />
    </div>
  )
}

// Search-driven rather than a rendered list: with ~1000 keys, "show me everything" is never the
// useful default, and the two things a user actually wants - "what did I change" and "where is the
// callout background" - are a filter and a query. Nothing is rendered until one of them is active.
function AllVariables({
  keys,
  overrides,
  loading,
  sources,
  themeId,
  onReload,
  renderRow
}: {
  keys: string[]
  overrides: Record<string, unknown>
  loading: boolean
  sources: { theme: boolean; build: boolean } | undefined
  themeId: string | undefined
  onReload: () => void
  renderRow: (key: string) => JSX.Element
}): JSX.Element {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [onlyChanged, setOnlyChanged] = useState(false)

  const overriddenCount = keys.filter((key) => key in overrides).length
  const q = query.trim().toLowerCase()
  const matches = q
    ? keys.filter((key) => key.toLowerCase().includes(q) && (!onlyChanged || key in overrides))
    : onlyChanged
      ? keys.filter((key) => key in overrides)
      : []
  const visible = matches.slice(0, MAX_RESULTS)

  const grouped = new Map<string, string[]>()
  for (const key of visible) {
    const group = groupOf(key)
    const list = grouped.get(group) ?? []
    list.push(key)
    grouped.set(group, list)
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setOpen((prev) => !prev)} className="flex items-center gap-1.5 text-left">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <h3 className="text-sm font-semibold">{t('styles.variables.allHeading')}</h3>
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {t('styles.variables.counter', { overridden: overriddenCount, total: keys.length })}
        </span>
      </div>

      {open && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            {themeId
              ? t('styles.variables.allDescriptionTheme', { themeId, count: keys.length })
              : t('styles.variables.allDescription')}
          </p>

          {loading && <p className="text-xs text-slate-500">{t('common.loading')}</p>}

          {!loading && keys.length === 0 && (
            <div className="rounded-md border border-black/[0.06] p-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
              <p>{t('styles.variables.noSources')}</p>
              <p className="mt-1">
                {sources?.theme === false && t('styles.variables.noTheme')}{' '}
                {sources?.build === false && t('styles.variables.noBuild')}
              </p>
              <Button variant="ghost" className="mt-2" onClick={onReload}>
                {t('styles.variables.reload')}
              </Button>
            </div>
          )}

          {!loading && keys.length > 0 && (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <TextInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('styles.variables.searchPlaceholder')}
                  className="w-72"
                />
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />
                  {t('styles.variables.onlyChanged')}
                </label>
                <Button variant="ghost" onClick={onReload}>
                  {t('styles.variables.reload')}
                </Button>
              </div>

              {matches.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {q || onlyChanged
                    ? t('styles.variables.noResults')
                    : t('styles.variables.searchHint', { count: keys.length })}
                </p>
              )}

              <div className="flex flex-col gap-4">
                {Array.from(grouped.entries()).map(([group, groupKeys]) => (
                  <div key={group}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</p>
                    <div className="flex flex-col gap-0.5">{groupKeys.map(renderRow)}</div>
                  </div>
                ))}
              </div>

              {matches.length > visible.length && (
                <p className="mt-2 text-xs text-slate-500">
                  {t('styles.variables.moreResults', { count: matches.length - visible.length })}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  )
}
