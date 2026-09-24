import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button, Card, InfoNote, SegmentedControl, TextInput } from '../../components/ui'
import { useStickyState } from '../../state/uiState'
import { CSS_VARIABLES } from '../../data/cssVariables'
import VariableRow, { type OverrideValue, type VariableRowProps } from './VariableRow'
import VariableGroup from './VariableGroup'
import { allKnownKeys, groupLabel, groupOf, isColorVariable, normalizeVarQuery, type ResolveContext } from './variableGraph'
import { activeThemeIdOf, useStyles } from './index'

// How many rows a search renders at once. A community theme can declare ~1000 variables
// (tokyo-night: 978), and every row that is on screen resolves its own derivation chain, so the
// list is capped and says so rather than quietly truncating. Browsing needs no cap: there the rows
// come one group at a time, and only the groups someone opened. That keeps *opening* cheap, not
// typing: open groups stay open, so with all of them open every row is mounted, and what keeps a
// keystroke from re-rendering all of them is the memo on VariableRow.
const MAX_RESULTS = 150

export type VariableKind = 'all' | 'color' | 'other'

// Stable stand-ins for "nothing", so a memoized row does not see a new object on every render.
const NO_DEPENDENTS: string[] = []
const NO_COLORS: ResolveContext['colors'] = {}

// Not a name prefix any CSS variable can produce: groupOf() upper-cases, this has lower-case letters.
const SINGLES_GROUP = 'singles'

// The only place CSS custom properties are *edited*. Two deliberately separate tables: the curated
// catalog of variables Quartz itself derives from the classic colors (short, always visible), and
// everything a theme or plugin brings (long, search-driven). Before this split both lived in one
// flat list that a "scan build output" button dumped hundreds of unlabelled keys into.
//
// Overrides are written into a marker-delimited managed block in custom.scss - by the page's save
// (index.tsx), which also re-reads the file afterwards so the CSS tab's draft stays in sync.
export default function Variables(): JSX.Element {
  const { t } = useTranslation()
  const { config, overrides, setOverrides, graph, graphLoading, reloadGraph, registerSave } = useStyles()

  // Which rows are open, which query is active: kept across a trip to another area, since with
  // nothing rendered until a query is typed, losing it means losing the whole result list.
  const [expandedKeys, setExpandedKeys] = useStickyState<string[]>('styles.vars.expanded', [])
  // Rows whose second field was opened with "Im Dunkelmodus abweichend". Held here rather than in
  // the row, which a closed group unmounts: the row came back expanded and the field was gone
  // (thirty-sixth review, finding 6). An empty dark field loses nothing, but it is a choice the
  // page forgot at the one row it otherwise remembered everything about.
  const [darkOpenKeys, setDarkOpenKeys] = useStickyState<string[]>('styles.vars.darkOpen', [])
  // Which categories are open. Only the base colours to start with: the other nine are derived
  // from them, and with all ten open the card was three screens long (measured at 1728x1000).
  // Sticky like every other "where was I" state - it survives a trip to another area, not a
  // restart.
  const [openGroups, setOpenGroups] = useStickyState<string[]>('styles.vars.openGroups', ['baseColors'])
  const [allOpen, setAllOpen] = useStickyState('styles.allVars.open', false)
  const [query, setQuery] = useStickyState('styles.allVars.query', '')
  const [onlyChanged, setOnlyChanged] = useStickyState('styles.allVars.onlyChanged', false)
  const [kind, setKind] = useStickyState<VariableKind>('styles.allVars.kind', 'all')
  // Which prefix groups are open while browsing. Starts with none: a theme brings dozens.
  const [openBrowseGroups, setOpenBrowseGroups] = useStickyState<string[]>('styles.allVars.openGroups', [])
  // Deliberately not sticky: a pending jump is transient interaction state, and re-running it after
  // coming back from another area would yank the page around for no reason.
  const [pendingScroll, setPendingScroll] = useState<string | null>(null)

  // Nothing follows a save here; the page writes the overrides itself.
  useEffect(() => registerSave(async () => {}))

  // Memoized so a row can tell "the overrides changed" from "everything changed" (see sameRow in
  // VariableRow): a context rebuilt on every render made each row look new to it.
  const colors = config.theme.colors as ResolveContext['colors'] | undefined
  const typography = config.theme.typography as Record<string, string> | undefined
  const ctx: ResolveContext = useMemo(
    () => ({ graph, overrides, colors: colors ?? NO_COLORS, typography }),
    [graph, overrides, colors, typography]
  )
  // Created once: `useRef(new Map())` built a map on every render and threw it away.
  const readLogRef = useRef<Map<string, Set<string>> | null>(null)
  readLogRef.current ??= new Map()
  const readLog = readLogRef.current

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

  function toggleGroup(group: string): void {
    setOpenGroups((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]))
  }

  function toggleExpanded(key: string): void {
    setExpandedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  // Clicking a variable in either dependency list jumps to it: opens the searchable table, puts the
  // name in the query, expands that row - and actually scrolls to it, which is the half that makes
  // it a jump rather than a state change somewhere off screen.
  function navigateTo(key: string): void {
    setExpandedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]))
    // A chip can point at a curated variable, which lives in the card above rather than in the
    // searchable table - and since the categories collapse, its row may not exist to scroll to.
    // Opening its category is what makes the jump land; for a discovered key there is none.
    const def = CSS_VARIABLES.find((d) => d.key === key)
    if (def) setOpenGroups((prev) => (prev.includes(def.group) ? prev : [...prev, def.group]))
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

  const rowProps = (key: string): VariableRowProps => ({
    varKey: key,
    ctx,
    readLog,
    dependents: graph?.dependents[key] ?? NO_DEPENDENTS,
    expanded: expandedKeys.includes(key),
    onToggle: () => toggleExpanded(key),
    darkOpen: darkOpenKeys.includes(key),
    onDarkOpen: (open) =>
      setDarkOpenKeys((prev) => (open ? (prev.includes(key) ? prev : [...prev, key]) : prev.filter((k) => k !== key))),
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
  // Which keys carry an override - not their values, which change with every keystroke. The key
  // list only moves when an override appears or goes.
  const overrideKeys = Object.keys(overrides).sort().join('\n')
  const extraKeys = useMemo(
    () => allKnownKeys(ctx).filter((key) => !curatedKeys.has(key)).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph, overrideKeys, curatedKeys]
  )

  // Asked once per key and graph, not per keystroke: it resolves the value, and a theme has ~1000.
  // Of the value without the override, so a row does not leave the filtered list while someone
  // types a colour into it (see isColorVariable) - and resolved without *any* override but those of
  // keys only the user declares, which have no other value. Asked with all of them, a keystroke in
  // any variable re-ran the whole list: 1057 keys, ~3 500 canvas assignments, 8-22 ms before a
  // single row had rendered (thirty-seventh review, finding 3), and a half-typed value in a
  // variable could flip the filter of every alias of it, the flip 'base' exists to prevent.
  const ownOverrides = useMemo(() => {
    const own: ResolveContext['overrides'] = {}
    for (const key of Object.keys(overrides)) if (!graph?.vars[key] && !curatedKeys.has(key)) own[key] = overrides[key]
    return own
  }, [overrides, graph, curatedKeys])
  const ownSignature = JSON.stringify(ownOverrides)
  const colorKeys = useMemo(
    () => {
      const baseCtx: ResolveContext = { ...ctx, overrides: ownOverrides }
      return new Set(extraKeys.filter((key) => isColorVariable(key, baseCtx, 'base')))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [extraKeys, graph, ownSignature]
  )

  const themeId = activeThemeIdOf(config)

  return (
    <div className="flex flex-col gap-4">
      {/* Answers the question the tab order raises on its own: a community theme injects its CSS
          inside @layer, this file's :root block is unlayered, and unlayered declarations outrank
          every layered one regardless of load order - verified against a real build (ultra-lobster
          + an override on --background-primary, both modes). The caveat is the honest half. */}
      {themeId && (
        <InfoNote>{t('styles.variables.themeNote', { themeId })}</InfoNote>
      )}

      <Card>
        <h3 className="mb-1 text-sm font-semibold">{t('styles.variables.mainHeading')}</h3>
        <p className="mb-3 text-xs text-text-muted">{t('styles.variables.mainDescription')}</p>
        <div className="flex flex-col gap-1">
          {curatedGroups.map(([group, keys]) => (
            <VariableGroup
              key={group}
              label={groupLabel(t, group)}
              count={keys.length}
              changed={keys.filter((key) => key in overrides).length}
              open={openGroups.includes(group)}
              onToggle={() => toggleGroup(group)}
            >
              {keys.map((key) => (
                <VariableRow key={key} {...rowProps(key)} />
              ))}
            </VariableGroup>
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
        kind={kind}
        setKind={setKind}
        colorKeys={colorKeys}
        openGroups={openBrowseGroups}
        toggleGroup={(group) =>
          setOpenBrowseGroups((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]))
        }
        renderRow={(key) => <VariableRow key={key} {...rowProps(key)} />}
      />
    </div>
  )
}

// Two ways in. Without a query the table is browsed: the variables sorted into their prefix groups
// (--callout-*, --background-*), all collapsed, each with its count - with ~1000 keys a flat list
// is no more useful than none, but a search alone asked for a name one cannot know without having
// seen the list. With a query it is the capped search it always was. The colour filter applies to
// both. Its state is owned by the page above, so a dependency chip in any row can steer it.
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
  kind,
  setKind,
  colorKeys,
  openGroups,
  toggleGroup,
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
  kind: VariableKind
  setKind: (kind: VariableKind) => void
  colorKeys: Set<string>
  openGroups: string[]
  toggleGroup: (group: string) => void
  renderRow: (key: string) => JSX.Element
}): JSX.Element {
  const { t } = useTranslation()

  const overriddenCount = keys.filter((key) => key in overrides).length
  const q = normalizeVarQuery(query)
  const ofKind = kind === 'all' ? keys : keys.filter((key) => colorKeys.has(key) === (kind === 'color'))
  const browsing = !q && !onlyChanged
  const matches = q
    ? ofKind.filter((key) => key.toLowerCase().includes(q) && (!onlyChanged || key in overrides))
    : ofKind.filter((key) => key in overrides || browsing)
  const visible = browsing ? matches : matches.slice(0, MAX_RESULTS)

  const grouped = new Map<string, string[]>()
  for (const key of visible) {
    const group = groupOf(key)
    const list = grouped.get(group) ?? []
    list.push(key)
    grouped.set(group, list)
  }
  // A prefix that only one variable carries is a heading repeating that variable's name - the
  // minimal theme has 50 of them among 150 groups (measured through the theme plugin, 2026-09-24). Browsing collects them at the end instead.
  if (browsing) {
    const singles: string[] = []
    for (const [group, list] of grouped) {
      if (list.length > 1) continue
      singles.push(...list)
      grouped.delete(group)
    }
    if (singles.length > 0) grouped.set(SINGLES_GROUP, singles)
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setOpen((prev) => !prev)} className="flex items-center gap-1.5 text-left">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <h3 className="text-sm font-semibold">{t('styles.variables.allHeading')}</h3>
        </button>
        <span className="text-xs text-text-muted">
          {t('styles.variables.counter', { overridden: overriddenCount, total: keys.length })}
        </span>
      </div>

      {open && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-text-muted">
            {themeId
              ? t('styles.variables.allDescriptionTheme', { themeId, count: keys.length })
              : t('styles.variables.allDescription')}
          </p>

          {loading && <p className="text-xs text-text-muted">{t('common.loading')}</p>}

          {!loading && keys.length === 0 && (
            <div className="rounded-md border border-ink/[0.06] p-3 text-xs text-text-muted dark:border-ink/10">
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
                <label className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />
                  {t('styles.variables.onlyChanged')}
                </label>
                <SegmentedControl
                  label={t('styles.variables.kind.label')}
                  value={kind}
                  onChange={setKind}
                  options={[
                    { value: 'all', label: t('styles.variables.kind.all') },
                    { value: 'color', label: t('styles.variables.kind.color', { count: colorKeys.size }) },
                    { value: 'other', label: t('styles.variables.kind.other', { count: keys.length - colorKeys.size }) }
                  ]}
                />
                <Button variant="ghost" onClick={onReload}>
                  {t('styles.variables.reload')}
                </Button>
              </div>

              {matches.length === 0 && <p className="text-xs text-text-muted">{t('styles.variables.noResults')}</p>}

              {browsing ? (
                <div className="flex flex-col gap-1">
                  {Array.from(grouped.entries()).map(([group, groupKeys]) => (
                    <VariableGroup
                      key={group}
                      label={group === SINGLES_GROUP ? t('styles.variables.singlesGroup') : groupLabel(t, group)}
                      count={groupKeys.length}
                      changed={groupKeys.filter((key) => key in overrides).length}
                      open={openGroups.includes(group)}
                      onToggle={() => toggleGroup(group)}
                    >
                      {groupKeys.map(renderRow)}
                    </VariableGroup>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {Array.from(grouped.entries()).map(([group, groupKeys]) => (
                    <div key={group}>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">{groupLabel(t, group)}</p>
                      <div className="flex flex-col gap-0.5">{groupKeys.map(renderRow)}</div>
                    </div>
                  ))}
                </div>
              )}

              {matches.length > visible.length && (
                <p className="mt-2 text-xs text-text-muted">
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
