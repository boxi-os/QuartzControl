import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Ban,
  CircleDashed,
  CircleOff,
  EyeOff,
  Filter,
  HelpCircle,
  LayoutGrid,
  Monitor,
  Pin,
  PowerOff,
  Puzzle,
  Smartphone,
  SquareDashed,
  Table2,
  type LucideIcon
} from 'lucide-react'
import type { FrameBreakpoint, GridFrameDefinition, LayoutPosition, PluginEntry, QuartzConfig } from '@shared/ipc-contract'
import { FRAME_BREAKPOINTS } from '@shared/gridFrameCss'
import { Badge, Card, CardHeading, InfoNote } from '../../components/ui'
import { conditionLabel, groupColor } from './ComponentChip'
import {
  BUILTIN_FRAME_LAYOUT,
  POSITIONS,
  buildBoardPositionMap,
  derivePageTypes,
  duplicateNameCounts,
  duplicateRanks,
  getLayout,
  groupNamesOf,
  parkedIndices
} from './utils'
import { hasPageTypeOverride, isExcluded, isPositionCleared, overrideOf, resolvedFrame } from './pageTypeOverride'

/**
 * The "Übersicht" tab: the whole layout on one screen. The stage shows one page type at a time;
 * this answers where each component ends up on every page type at once, because that is decided
 * on three levels that the stage shows one by one:
 *
 * - components are placed once, for all pages (rows, by position and within it by group)
 * - each page type is built in a frame and may hide components or clear a position (columns,
 *   with the frame in the head)
 * - the frame decides which positions - and which groups - get an area at all (the cells)
 *
 * A cell is a symbol, not a word: a matrix of "wie alle" said nothing a dot does not. What a
 * component does beyond its place - desktop or mobile only, a condition - is a mark on its pill,
 * because it holds on every page type alike. Under the matrix: the switched-off components, which
 * the matrix leaves out, and the frames with the page types that use them, so a frame no page
 * type is assigned to shows as such.
 *
 * Every name is the way to where it is changed: a page type and a component open the stage, a
 * frame the frame editor.
 */

type CellState = 'shown' | 'someWidths' | 'excluded' | 'cleared' | 'noArea' | 'hiddenArea' | 'unknown'

/** Where an area is placed; `all` for a built-in frame, which has no breakpoints of its own here. */
type Placed = FrameBreakpoint[] | 'all'

/** The areas a frame builds: positions with a plain area, and `<position>#<group>` with an own one. */
interface FrameShape {
  plain: Map<LayoutPosition, Placed>
  /** `<position>#<group>` → the breakpoints that place the group's area. */
  groups: Map<string, Placed>
}

/**
 * What a frame builds, or null when the app cannot know (a page type plugin's own frame); a name
 * that is no frame at all is rendered by quartz with the default frame (resolveFrame). A group area
 * holds its group and the plain area of a position everything no group area of this frame claims -
 * the frame's own contentsFor(). It claims over **every** area, placed or not: a group whose area
 * is hidden on all breakpoints is in that area, which is display: none, and not in the plain one
 * (forty-second review, finding 3: the overview said "Erscheint" for a component the built page
 * showed at no width). So the breakpoints that place an area are kept, not only whether one does.
 */
function frameShape(name: string, frames: GridFrameDefinition[], pluginFrames: Set<string>): FrameShape | null {
  const authored = name !== 'default' ? frames.find((f) => f.frameName === name) : undefined
  if (authored) {
    const shape: FrameShape = { plain: new Map(), groups: new Map() }
    for (const area of authored.areas) {
      if (!area.slot || area.slot === 'pageBody') continue
      const placed = FRAME_BREAKPOINTS.filter((bp) => {
        const p = authored.breakpoints[bp].placements[area.id]
        return p && !p.hidden
      })
      // Two areas for the same content (a doubled slot) show it wherever either is placed.
      const union = (before: Placed | undefined): FrameBreakpoint[] =>
        FRAME_BREAKPOINTS.filter((bp) => placed.includes(bp) || (Array.isArray(before) && before.includes(bp)))
      if (area.group) {
        const key = `${area.slot}#${area.group}`
        shape.groups.set(key, union(shape.groups.get(key)))
      } else {
        const slot = area.slot as LayoutPosition
        shape.plain.set(slot, union(shape.plain.get(slot)))
      }
    }
    return shape
  }
  const all = (positions: readonly LayoutPosition[]): FrameShape => ({ plain: new Map(positions.map((p) => [p, 'all' as const])), groups: new Map() })
  if (name in BUILTIN_FRAME_LAYOUT) return all(BUILTIN_FRAME_LAYOUT[name as 'full-width' | 'minimal'].visibleSlots)
  if (pluginFrames.has(name)) return null
  return all(POSITIONS)
}

/** Where the frame shows this component's area, or null when it builds none for it. */
function roomOf(shape: FrameShape, position: LayoutPosition, group: string | undefined): Placed | null {
  if (group !== undefined && shape.groups.has(`${position}#${group}`)) return shape.groups.get(`${position}#${group}`)!
  return shape.plain.get(position) ?? null
}

const STATE_ICON: Record<Exclude<CellState, 'shown'>, { icon: LucideIcon; tone: string }> = {
  someWidths: { icon: CircleDashed, tone: 'text-emerald-600 dark:text-emerald-400' },
  excluded: { icon: EyeOff, tone: 'text-text-secondary' },
  cleared: { icon: Ban, tone: 'text-text-secondary' },
  noArea: { icon: SquareDashed, tone: 'text-amber-600 dark:text-amber-400' },
  hiddenArea: { icon: CircleOff, tone: 'text-amber-600 dark:text-amber-400' },
  unknown: { icon: HelpCircle, tone: 'text-text-muted' }
}

function StateMark({ state, label }: { state: CellState; label: string }): JSX.Element {
  if (state === 'shown') {
    return <span role="img" aria-label={label} title={label} className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
  }
  const { icon: Icon, tone } = STATE_ICON[state]
  return (
    <span role="img" aria-label={label} title={label} className={`inline-flex ${tone}`}>
      <Icon size={15} aria-hidden />
    </span>
  )
}

export default function LayoutOverview({
  config,
  frames,
  builtinPageTypeFrames,
  onOpenPageType,
  onOpenFrame
}: {
  config: QuartzConfig
  frames: GridFrameDefinition[]
  builtinPageTypeFrames: Record<string, string>
  /** The stage on this page type (null: all pages), optionally with this component selected. */
  onOpenPageType: (pageType: string | null, componentIndex?: number) => void
  /** The frame editor on this frame - an own frame's name, or "default" for Quartz's. */
  onOpenFrame: (frameName: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const parked = parkedIndices(config.plugins)
  const positions = buildBoardPositionMap(config.plugins, parked)
  const pageTypes = derivePageTypes(config)
  const nameCounts = duplicateNameCounts(config.plugins)
  const ranks = duplicateRanks(config.plugins)
  const pluginFrames = new Set(Object.values(builtinPageTypeFrames))
  const authoredNames = new Set(frames.map((f) => f.frameName))
  const groupNames = groupNamesOf(config, frames)

  const componentLabel = (i: number): string =>
    (nameCounts.get(config.plugins[i].name) ?? 0) > 1 ? `${config.plugins[i].name} #${ranks.get(i) ?? 1}` : config.plugins[i].name
  const positionName = (p: LayoutPosition): string => t(`positions.${p}`, p)
  const pageTypeName = (pt: string): string => t(`layoutEditor.pageTypes.${pt}`, pt)
  const frameName = (name: string): string =>
    name === 'default'
      ? t('layoutEditor.templateDefault')
      : name === 'full-width'
        ? t('layoutEditor.templateFullWidth')
        : name === 'minimal'
          ? t('layoutEditor.templateMinimal')
          : name
  // Only the frames the editor can open are links: an own one, and Quartz's standard frame.
  const openable = (name: string): boolean => name === 'default' || authoredNames.has(name)

  const chosen = new Map(pageTypes.map((pt) => [pt, resolvedFrame(config, pt, builtinPageTypeFrames)]))
  const shapes = new Map(pageTypes.map((pt) => [pt, frameShape(chosen.get(pt)!.name, frames, pluginFrames)]))

  function stateOf(i: number, pt: string): { state: CellState; on?: FrameBreakpoint[] } {
    const layout = getLayout(config.plugins[i])!
    const shape = shapes.get(pt)
    if (shape === null || shape === undefined) return { state: 'unknown' }
    // What the user set on purpose comes before what follows from the frame: a position cleared on
    // the 404 page is not a warning about a frame without room (forty-second review, finding 8).
    const override = overrideOf(config, pt)
    if (isPositionCleared(override, layout.position)) return { state: 'cleared' }
    if (isExcluded(override, config.plugins[i])) return { state: 'excluded' }
    const room = roomOf(shape, layout.position, layout.group)
    if (room === null) return { state: 'noArea' }
    if (room !== 'all' && room.length === 0) return { state: 'hiddenArea' }
    if (room !== 'all' && room.length < FRAME_BREAKPOINTS.length) return { state: 'someWidths', on: room }
    return { state: 'shown' }
  }

  // ── figures for the strip on top ──
  const placed = POSITIONS.flatMap((p) => positions[p] ?? [])
  const displayOf = (i: number): string => getLayout(config.plugins[i])?.display ?? 'all'
  const desktopOnly = placed.filter((i) => displayOf(i) === 'desktop-only').length
  const mobileOnly = placed.filter((i) => displayOf(i) === 'mobile-only').length
  const conditioned = placed.filter((i) => !!getLayout(config.plugins[i])?.condition).length
  const customizedTypes = pageTypes.filter((pt) => hasPageTypeOverride(config.layout?.byPageType?.[pt]))
  const usedFrames = new Set([...chosen.values()].map((c) => c.name))
  const unusedOwn = frames.filter((f) => !usedFrames.has(f.frameName))

  // ── pieces ── (plain functions rather than components declared in here: those would be a new
  // type on every render and remount)
  const mark = (Icon: LucideIcon, label: string): JSX.Element => (
    <span role="img" aria-label={label} title={label} className="inline-flex shrink-0 text-text-secondary">
      <Icon size={12} aria-hidden />
    </span>
  )
  function componentPill(index: number, muted = false): JSX.Element {
    const plugin: PluginEntry = config.plugins[index]
    const layout = getLayout(plugin)
    const color = groupColor(layout?.group, groupNames)
    return (
      <button
        key={index}
        type="button"
        onClick={() => onOpenPageType(null, index)}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-ui hover:border-ink/30 ${
          color ? `${color.ring} ${color.bg} ${color.text}` : 'border-ink/10 bg-surface text-text dark:border-ink/15'
        } ${muted ? 'opacity-70' : ''}`}
      >
        <span className="truncate">{componentLabel(index)}</span>
        {layout?.display === 'desktop-only' && mark(Monitor, t('layoutEditor.displayDesktopOnly'))}
        {layout?.display === 'mobile-only' && mark(Smartphone, t('layoutEditor.displayMobileOnly'))}
        {layout?.condition && mark(Filter, conditionLabel(t, layout.condition))}
      </button>
    )
  }

  function framePill(name: string, from?: 'override' | 'plugin' | 'default'): JSX.Element {
    const label = frameName(name)
    const OriginIcon = from === 'override' ? Pin : from === 'plugin' ? Puzzle : null
    const originText = from ? t(`layoutEditor.overview.frameFrom.${from}`) : undefined
    const body = (
      <>
        <LayoutGrid size={12} aria-hidden className="shrink-0 text-text-secondary" />
        <span className="truncate">{label}</span>
        {OriginIcon && <OriginIcon size={11} aria-hidden className="shrink-0 text-text-secondary" />}
      </>
    )
    const cls = `inline-flex max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-micro font-medium ${
      from === 'default' ? 'bg-ink/[0.04] text-text-secondary' : 'bg-ink/[0.07] text-text dark:bg-ink/10'
    }`
    return openable(name) ? (
      <button type="button" title={originText} aria-label={originText ? `${label} — ${originText}` : label} onClick={() => onOpenFrame(name)} className={`${cls} hover:bg-ink/[0.12]`}>
        {body}
      </button>
    ) : (
      <span title={originText} className={cls}>
        {body}
        {originText && <span className="sr-only"> — {originText}</span>}
      </span>
    )
  }

  // ── the matrix ──
  const cell = 'border-t border-ink/[0.06] px-2 py-1.5 text-center align-middle dark:border-ink/10'
  const rowHead = 'border-t border-ink/[0.06] py-1.5 pr-3 text-left align-middle font-normal dark:border-ink/10'

  function positionRows(p: LayoutPosition): ReactNode {
    const items = positions[p] ?? []
    const ungrouped = items.filter((i) => !getLayout(config.plugins[i])?.group)
    const groups = groupNames.filter((g) => items.some((i) => getLayout(config.plugins[i])?.group === g))
    const componentRow = (i: number): JSX.Element => (
      <tr key={i}>
        <th scope="row" className={`${rowHead} pl-3`}>
          {componentPill(i)}
        </th>
        {pageTypes.map((pt) => {
          const { state, on } = stateOf(i, pt)
          const label = t('layoutEditor.overview.cellTitle', {
            component: componentLabel(i),
            pageType: pageTypeName(pt),
            state: on
              ? t('layoutEditor.overview.someWidthsOn', { breakpoints: on.map((bp) => t(`layoutEditor.frameBuilder.breakpoint.${bp}`)).join(', ') })
              : t(`layoutEditor.overview.state.${state}`)
          })
          return (
            <td key={pt} className={cell}>
              <StateMark state={state} label={label} />
            </td>
          )
        })}
      </tr>
    )
    // One rowgroup head per tbody: the position heads its ungrouped rows, and every group is a tbody
    // of its own whose head names the position too - two rowgroup heads in one tbody made a group
    // the head of the rows before it as well (forty-second review, finding 8).
    return [
      <tbody key={p}>
        <tr>
          <th
            scope="rowgroup"
            colSpan={pageTypes.length + 1}
            className="border-t-2 border-ink/10 pb-1 pt-3 text-left text-micro font-semibold uppercase tracking-wide text-text-secondary dark:border-ink/15"
          >
            {positionName(p)}
            <span className="ml-2 font-normal normal-case tracking-normal text-text-muted">
              {items.length === 0 ? (
                t('layoutEditor.overview.empty')
              ) : (
                <>
                  <span aria-hidden>{items.length}</span>
                  <span className="sr-only">{t('layoutEditor.overview.componentCount', { count: items.length })}</span>
                </>
              )}
            </span>
          </th>
        </tr>
        {ungrouped.map(componentRow)}
      </tbody>,
      ...groups.map((g) => {
        const color = groupColor(g, groupNames)
        // A group that some frame gives an area of its own is that area to the user - the frame
        // builder makes the group only to bind the area - and not a flex group they arranged.
        const ownIn = frames.filter((f) => f.areas.some((a) => a.slot === p && a.group === g))
        const areaNames = [...new Set(ownIn.flatMap((f) => f.areas.filter((a) => a.slot === p && a.group === g).map((a) => a.name)))]
        return (
          <tbody key={`${p}:${g}`}>
            <tr>
              <th scope="rowgroup" colSpan={pageTypes.length + 1} className={`${rowHead} pl-3`}>
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-micro">
                  <span className="sr-only">{positionName(p)}: </span>
                  {areaNames.length > 0 ? (
                    <>
                      <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-[3px] border-2 ${color?.ring ?? 'border-ink/30'}`} />
                      <span className="font-medium text-text">{t('layoutEditor.overview.ownArea', { name: areaNames.join(', ') })}</span>
                      <span className="text-text-muted">{t('layoutEditor.overview.ownAreaIn')}</span>
                      {ownIn.map((f) => (
                        <span key={f.frameName}>{framePill(f.frameName)}</span>
                      ))}
                    </>
                  ) : (
                    <>
                      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${color?.dot ?? 'bg-ink/30'}`} />
                      <span className="font-medium text-text">{t('layoutEditor.overview.flexGroup', { name: g })}</span>
                    </>
                  )}
                </span>
              </th>
            </tr>
            {items.filter((i) => getLayout(config.plugins[i])?.group === g).map((i) => componentRow(i))}
          </tbody>
        )
      })
    ]
  }

  const legend: { mark: ReactNode; text: string }[] = [
    { mark: <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />, text: t('layoutEditor.overview.state.shown') },
    ...(['someWidths', 'excluded', 'cleared', 'noArea', 'hiddenArea', 'unknown'] as const).map((s) => {
      const { icon: Icon, tone } = STATE_ICON[s]
      return { mark: <Icon size={14} className={tone} />, text: t(`layoutEditor.overview.state.${s}`) }
    }),
    { mark: <Monitor size={13} className="text-text-secondary" />, text: t('layoutEditor.displayDesktopOnly') },
    { mark: <Smartphone size={13} className="text-text-secondary" />, text: t('layoutEditor.displayMobileOnly') },
    { mark: <Filter size={13} className="text-text-secondary" />, text: t('layoutEditor.overview.legendCondition') },
    { mark: <Pin size={12} className="text-text-secondary" />, text: t('layoutEditor.overview.frameFrom.override') },
    { mark: <Puzzle size={12} className="text-text-secondary" />, text: t('layoutEditor.overview.frameFrom.plugin') }
  ]

  // Every frame a page type can be built in or the project holds: Quartz's standard, the own ones,
  // and the built-in or plugin frames a page type actually uses.
  const frameList: { name: string; kind: 'builtin' | 'own' | 'plugin' }[] = [
    { name: 'default', kind: 'builtin' },
    ...frames.map((f) => ({ name: f.frameName, kind: 'own' as const })),
    ...[...usedFrames]
      .filter((n) => n !== 'default' && !authoredNames.has(n))
      .map((n) => ({ name: n, kind: pluginFrames.has(n) ? ('plugin' as const) : ('builtin' as const) }))
  ]

  const stat = (value: ReactNode, label: ReactNode, extra?: ReactNode): JSX.Element => (
    <div className="flex min-w-[9rem] flex-col gap-0.5 rounded-md border border-ink/10 bg-surface px-3 py-2 dark:border-ink/10">
      <span className="text-heading font-semibold text-text">{value}</span>
      <span className="text-micro text-text-secondary">{label}</span>
      {extra && <span className="text-micro text-text-muted">{extra}</span>}
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <InfoNote>{t('layoutEditor.overview.intro')}</InfoNote>

      <div className="flex flex-wrap gap-2">
        {stat(placed.length, t('layoutEditor.overview.statPlaced', { count: placed.length }), (
          <span className="flex flex-wrap items-center gap-x-2">
            <span>{t('layoutEditor.overview.statAlways', { count: placed.length - desktopOnly - mobileOnly })}</span>
            <span className="inline-flex items-center gap-0.5">
              <Monitor size={11} aria-hidden />
              {desktopOnly}
              <span className="sr-only">{t('layoutEditor.displayDesktopOnly')}</span>
            </span>
            <span className="inline-flex items-center gap-0.5">
              <Smartphone size={11} aria-hidden />
              {mobileOnly}
              <span className="sr-only">{t('layoutEditor.displayMobileOnly')}</span>
            </span>
          </span>
        ))}
        {stat(conditioned, t('layoutEditor.overview.statConditioned', { count: conditioned }))}
        {stat(parked.size, t('layoutEditor.overview.statDisabled', { count: parked.size }))}
        {stat(pageTypes.length, t('layoutEditor.overview.statPageTypes', { count: pageTypes.length }), t('layoutEditor.overview.statCustomized', { count: customizedTypes.length }))}
        {stat(
          frames.length,
          t('layoutEditor.overview.statFrames', { count: frames.length }),
          unusedOwn.length > 0 ? t('layoutEditor.overview.statUnused', { count: unusedOwn.length }) : undefined
        )}
      </div>

      <Card className="flex flex-col gap-3">
        <CardHeading icon={Table2}>{t('layoutEditor.overview.title')}</CardHeading>
        {/* Its own scroller: a column per page type does not fit every window, and the page must
            not scroll sideways for them. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-ui">
            <thead>
              <tr>
                {/* No word in the corner: it would stand over "assigned frame" below it. */}
                <th scope="col" className="pb-1">
                  <span className="sr-only">{t('layoutEditor.overview.componentColumn')}</span>
                </th>
                {pageTypes.map((pt) => (
                  <th key={pt} scope="col" className="px-2 pb-1 text-center align-bottom">
                    <button
                      type="button"
                      onClick={() => onOpenPageType(pt)}
                      className="inline-flex items-center gap-1 text-ui font-medium text-text underline-offset-2 hover:underline"
                    >
                      {pageTypeName(pt)}
                      {customizedTypes.includes(pt) && (
                        <span
                          role="img"
                          aria-label={t('layoutEditor.overview.customized')}
                          title={t('layoutEditor.overview.customized')}
                          className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
                        />
                      )}
                    </button>
                  </th>
                ))}
              </tr>
              <tr>
                <th scope="row" className="pb-2 text-left text-micro font-normal text-text-secondary">
                  {t('layoutEditor.overview.assignedFrame')}
                </th>
                {pageTypes.map((pt) => (
                  <td key={pt} className="px-2 pb-2 text-center">
                    {framePill(chosen.get(pt)!.name, chosen.get(pt)!.from)}
                  </td>
                ))}
              </tr>
            </thead>
            {POSITIONS.map(positionRows)}
          </table>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-ink/[0.06] pt-3 text-micro text-text-secondary dark:border-ink/10" aria-label={t('layoutEditor.overview.legend')}>
          {legend.map((l, k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span aria-hidden className="inline-flex w-4 justify-center">
                {l.mark}
              </span>
              {l.text}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <CardHeading icon={PowerOff}>{t('layoutEditor.overview.disabledTitle')}</CardHeading>
          {parked.size === 0 ? (
            <p className="text-ui text-text-muted">{t('layoutEditor.overview.disabledNone')}</p>
          ) : (
            <>
              <p className="text-micro text-text-secondary">{t('layoutEditor.overview.disabledText')}</p>
              <div className="flex flex-wrap gap-1.5">
                {[...parked].map((i) => componentPill(i, true))}
              </div>
            </>
          )}
        </Card>

        <Card className="flex flex-col gap-3">
          <CardHeading icon={LayoutGrid}>{t('layoutEditor.overview.framesTitle')}</CardHeading>
          <ul className="flex flex-col">
            {frameList.map(({ name, kind }) => {
              const users = pageTypes.filter((pt) => chosen.get(pt)!.name === name)
              const own = kind === 'own' ? frames.find((f) => f.frameName === name) : undefined
              const customAreas = own ? own.areas.filter((a) => a.group && a.slot && a.slot !== 'pageBody') : []
              return (
                <li key={name} className="flex flex-col gap-1.5 border-t border-ink/[0.06] py-2.5 first:border-t-0 first:pt-0 dark:border-ink/10">
                  <div className="flex flex-wrap items-center gap-2">
                    {framePill(name)}
                    <span className="text-micro text-text-muted">{t(`layoutEditor.overview.frameKind.${kind}`)}</span>
                    {users.length === 0 && <Badge>{t('layoutEditor.overview.unassigned')}</Badge>}
                  </div>
                  {users.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pl-1">
                      {users.map((pt) => (
                        <button
                          key={pt}
                          type="button"
                          onClick={() => onOpenPageType(pt)}
                          className="rounded-full border border-ink/10 px-2 py-0.5 text-micro text-text hover:border-ink/30 dark:border-ink/15"
                        >
                          {pageTypeName(pt)}
                        </button>
                      ))}
                    </div>
                  )}
                  {customAreas.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pl-1 text-micro text-text-secondary">
                      <span>{t('layoutEditor.overview.customAreas')}</span>
                      {customAreas.map((a) => {
                        const color = groupColor(a.group, groupNames)
                        return (
                          <span key={a.id} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${color ? `${color.ring} ${color.bg} ${color.text}` : 'border-ink/10'}`}>
                            {a.name}
                            <span className="text-text-muted">· {positionName(a.slot as LayoutPosition)}</span>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
    </div>
  )
}
