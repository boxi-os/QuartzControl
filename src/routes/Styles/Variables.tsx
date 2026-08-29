import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { CssVariableOverride } from '@shared/ipc-contract'
import { Button, Card, TextInput } from '../../components/ui'
import { useStickyState } from '../../state/uiState'
import { CSS_VARIABLES } from '../../data/cssVariables'
import VariableRow, { type OverrideValue } from './VariableRow'
import { allKnownKeys, groupLabel, groupOf, type ResolveContext } from './variableGraph'
import { activeThemeIdOf, useStyles } from './index'

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

  // Which rows are open, which query is active: kept across a trip to another area, since with
  // nothing rendered until a query is typed, losing it means losing the whole result list.
  const [expandedKeys, setExpandedKeys] = useStickyState<string[]>('styles.vars.expanded', [])
  const [allOpen, setAllOpen] = useStickyState('styles.allVars.open', false)
  const [query, setQuery] = useStickyState('styles.allVars.query', '')
  const [onlyChanged, setOnlyChanged] = useStickyState('styles.allVars.onlyChanged', false)
  // Deliberately not sticky: a pending jump is transient interaction state, and re-running it after
  // coming back from another area would yank the page around for no reason.
  const [pendingScroll, setPendingScroll] = useState<string | null>(null)

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

  function setOverride(key: string, next: OverrideValue | null): void {
    setOverrides((prev) => {
      if (!next) {
        const copy = { ...prev }
        delete copy[key]
        return copy
      }
      return { ...prev, [key]: next }
    })
  }

  function toggleExpanded(key: string): void {
    setExpandedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  // Clicking a variable in either dependency list jumps to it: opens the searchable table, puts the
  // name in the query, expands that row - and actually scrolls to it, which is the half that makes
  // it a jump rather than a state change somewhere off screen.
  function navigateTo(key: string): void {
    setExpandedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]))
    setAllOpen(true)
    setQuery(key)
    setPendingScroll(key)
  }

  // Runs after every render until the target row exists: the row it scrolls to is usually rendered
  // by the *same* update that set the query, and may be several renders away when the table is
  // still filtering. Instant rather than smooth on purpose - ProjectLayout re-applies the saved
  // scroll offset whenever the content resizes, and a smooth scroll's stream of events interleaves
  // with that and lands somewhere else.
  useEffect(() => {
    if (!pendingScroll) return
    const el = document.querySelector(`[data-var-key="${CSS.escape(pendingScroll)}"]`)
    if (!el) return
    el.scrollIntoView({ block: 'center' })
    setPendingScroll(null)
  })

  const rowProps = (key: string): Parameters<typeof VariableRow>[0] => ({
    varKey: key,
    ctx,
    dependents: graph?.dependents[key] ?? [],
    expanded: expandedKeys.includes(key),
    onToggle: () => toggleExpanded(key),
    onChange: (next) => setOverride(key, next),
    onNavigate: navigateTo
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

  const themeId = activeThemeIdOf(config)

  return (
    <div className="flex flex-col gap-4">
      {/* Answers the question the tab order raises on its own: a community theme injects its CSS
          inside @layer, this file's :root block is unlayered, and unlayered declarations outrank
          every layered one regardless of load order - verified against a real build (ultra-lobster
          + an override on --background-primary, both modes). The caveat is the honest half. */}
      {themeId && (
        <p className="rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
          {t('styles.variables.themeNote', { themeId })}
        </p>
      )}

      <Card>
        <h3 className="mb-1 text-sm font-semibold">{t('styles.variables.mainHeading')}</h3>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('styles.variables.mainDescription')}</p>
        <div className="flex flex-col gap-4">
          {curatedGroups.map(([group, keys]) => (
            <div key={group}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">{groupLabel(t, group)}</p>
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
        open={allOpen}
        setOpen={setAllOpen}
        query={query}
        setQuery={setQuery}
        onlyChanged={onlyChanged}
        setOnlyChanged={setOnlyChanged}
        renderRow={(key) => <VariableRow key={key} {...rowProps(key)} />}
      />
    </div>
  )
}

// Search-driven rather than a rendered list: with ~1000 keys, "show me everything" is never the
// useful default, and the two things a user actually wants - "what did I change" and "where is the
// callout background" - are a filter and a query. Nothing is rendered until one of them is active.
// Its state is owned by the page above, so a dependency chip in any row can steer it.
function AllVariables({
  keys,
  overrides,
  loading,
  sources,
  themeId,
  onReload,
  open,
  setOpen,
  query,
  setQuery,
  onlyChanged,
  setOnlyChanged,
  renderRow
}: {
  keys: string[]
  overrides: Record<string, unknown>
  loading: boolean
  sources: { theme: boolean; build: boolean } | undefined
  themeId: string | undefined
  onReload: () => void
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  query: string
  setQuery: React.Dispatch<React.SetStateAction<string>>
  onlyChanged: boolean
  setOnlyChanged: React.Dispatch<React.SetStateAction<boolean>>
  renderRow: (key: string) => JSX.Element
}): JSX.Element {
  const { t } = useTranslation()

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

          {loading && <p className="text-xs text-slate-500 dark:text-slate-400">{t('common.loading')}</p>}

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
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">{groupLabel(t, group)}</p>
                    <div className="flex flex-col gap-0.5">{groupKeys.map(renderRow)}</div>
                  </div>
                ))}
              </div>

              {matches.length > visible.length && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
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
