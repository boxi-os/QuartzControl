import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge, TextInput } from '../../components/ui'
import {
  baseValue,
  catalogDef,
  cssColorToHex,
  effectiveValue,
  isColorVariable,
  isDisplayableColor,
  originOf,
  referencedVariables,
  resolveChain,
  resolvedValue,
  resolveValueLiteral,
  type Mode,
  type ResolveContext,
  type VariableOrigin
} from './variableGraph'
import ColorPicker from './ColorPicker'
import { pageGround, swatchStyle, swatchTitle } from './swatch'

const ORIGIN_TONE: Record<VariableOrigin, 'slate' | 'green' | 'amber'> = {
  core: 'slate',
  theme: 'slate',
  build: 'slate',
  user: 'green'
}

export type OverrideValue = { light: string; dark: string }

// One variable, in both the curated "Hauptvariablen" list and the searchable full table - the two
// differ in which keys they show, not in how a row behaves. A row is inert until expanded: the
// derivation chain, the two dependency lists and the editors are the expensive-to-read parts, and
// with up to ~1000 rows in the full table they must not all be rendered at once.
//
// Expanding is *not* the same as overriding: the inputs open pre-filled with the value that
// applies today (see baseValue), and an override is only created once a draft actually differs
// from it - which is also how it disappears again when the user types the original back.
export type VariableRowProps = {
  varKey: string
  ctx: ResolveContext
  dependents: string[]
  expanded: boolean
  onToggle: () => void
  onChange: (next: OverrideValue | null) => void
  onNavigate?: (key: string) => void
  /** Which override keys each row read while it last rendered - owned by the page, one per key. */
  readLog: Map<string, Set<string>>
}

// Every row of an open group is mounted, and browsing has no cap: with all groups of a large
// theme open that is ~1000 rows, and every keystroke in any value field changes `overrides` and
// with it `ctx`. Unmemoized, each of them re-resolved its value, its chain and the page ground -
// 24-59 ms per keystroke instead of 7 (thirty-sixth review, finding 1, minimal theme, 1057
// variables). A row's output depends on the overrides only through the keys it looks up, and
// every lookup goes through `ctx.overrides[key]` or `key in ctx.overrides`: those reads are
// recorded while the row renders, and the row renders again only when one of *them* changed -
// its own override, anything along its chain or inside a `color-mix()`, and `--light`, which
// every swatch reads as its ground. Not a list of keys worked out beside the resolver, which
// would be a second copy of it that drifts. The callbacks are left out of the comparison: all
// three the page passes close over the key and state setters only.
function sameRow(prev: VariableRowProps, next: VariableRowProps): boolean {
  if (prev.varKey !== next.varKey || prev.expanded !== next.expanded || prev.readLog !== next.readLog) return false
  if (prev.dependents !== next.dependents && (prev.dependents.length > 0 || next.dependents.length > 0)) return false
  const a = prev.ctx
  const b = next.ctx
  if (a.graph !== b.graph || a.colors !== b.colors || a.typography !== b.typography) return false
  if (a.overrides === b.overrides) return true
  const read = next.readLog.get(next.varKey)
  if (!read) return false
  for (const key of read) if (a.overrides[key] !== b.overrides[key]) return false
  return true
}

function trackReads(ctx: ResolveContext, read: Set<string>): ResolveContext {
  const overrides = new Proxy(ctx.overrides, {
    get(target, key, receiver) {
      if (typeof key === 'string') read.add(key)
      return Reflect.get(target, key, receiver)
    },
    has(target, key) {
      if (typeof key === 'string') read.add(key)
      return Reflect.has(target, key)
    }
  })
  return { ...ctx, overrides }
}

export default memo(VariableRow, sameRow)

function VariableRow({
  varKey,
  ctx: pageCtx,
  dependents,
  expanded,
  onToggle,
  onChange,
  onNavigate,
  readLog
}: VariableRowProps): JSX.Element {
  const { t } = useTranslation()
  // A fresh set per render, handed on to the parts below: they resolve through the same context,
  // and a part that renders later (the expanded panel) adds to the set this render logged.
  const read = new Set<string>()
  readLog.set(varKey, read)
  const ctx = trackReads(pageCtx, read)
  const override = ctx.overrides[varKey]
  const origin = originOf(varKey, ctx)
  const light = effectiveValue(varKey, 'light', ctx)
  const dark = effectiveValue(varKey, 'dark', ctx)
  const lightResolved = resolvedValue(varKey, 'light', ctx)
  const darkResolved = resolvedValue(varKey, 'dark', ctx)

  // What the row would show with the user's own value taken away - both the yardstick for "is this
  // actually changed" and what the inputs start from.
  const base: OverrideValue = {
    light: baseValue(varKey, 'light', ctx) ?? '',
    dark: baseValue(varKey, 'dark', ctx) ?? baseValue(varKey, 'light', ctx) ?? ''
  }
  // The inputs still open pre-filled with what applies today, but an override's `dark` half stays
  // empty until someone actually types in the dark field: an empty `dark` means "no declaration in
  // the file's dark block", which is how a mode-independent variable is stored, and effectiveValue()
  // resolves it back to the light value. Carrying the display default into the saved value is what
  // made one edit write forty extra declarations.
  const draft: OverrideValue = {
    light: override?.light || base.light,
    dark: override?.dark || base.dark
  }

  // Light and dark are two fields from the start only where that is the usual case: a colour, or a
  // value that already differs between the modes (the theme's or the user's). Everything else -
  // a size, a font, a hue number - gets one field, and the dark one behind a link: a shadow, an
  // opacity or a font weight can want a different value on a dark ground, but for most of them
  // the second field was an invitation to nothing, next to two swatches that stayed empty.
  const isColor = isColorVariable(varKey, ctx, 'base')
  const showsColor = isColorVariable(varKey, ctx)
  const baseDiffers = base.dark !== base.light
  const [darkOpen, setDarkOpen] = useState(false)
  const splitModes = isColor || baseDiffers || Boolean(override?.dark) || darkOpen

  function setMode(mode: Mode, value: string): void {
    const next: OverrideValue =
      mode === 'light'
        ? { light: value, dark: override?.dark ?? '' }
        : // Typing the applying value back into the dark field removes the dark declaration again,
          // the same way typing the original into the light field removes the whole override.
          { light: override?.light || base.light, dark: value === base.dark ? '' : value }
    onChange(next.light === base.light && next.dark === '' ? null : next)
  }

  // Which variables this one is built out of - the counterpart to `dependents`, and the half that
  // was missing: the expanded row said what depends on this variable but never what it depends on.
  const uses = Array.from(new Set([...referencedVariables(light ?? ''), ...referencedVariables(dark ?? '')]))

  // data-var-key is what the page's "jump to this variable" scroll looks for - the row has to be
  // findable from outside, since the chip that navigates here lives in a different row entirely.
  return (
    <div
      data-var-key={varKey}
      className={`rounded-md px-1.5 py-1 ${
        expanded ? 'border border-blue-300 bg-blue-50/40 shadow-sm dark:border-blue-500/40 dark:bg-blue-500/[0.06]' : ''
      } ${override && !expanded ? 'bg-green-50/60 dark:bg-green-500/[0.07]' : ''} ${
        override && expanded ? 'border-green-400 bg-green-50/60 dark:border-green-500/40 dark:bg-green-500/[0.07]' : ''
      }`}
    >
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-left hover:underline"
          title={t('styles.variables.chainToggle')}
        >
          {expanded ? <ChevronDown size={12} className="shrink-0" /> : <ChevronRight size={12} className="shrink-0" />}
          {/* Kept as an empty slot for a value that is no colour, so the names still line up. */}
          <span className={`flex shrink-0 gap-0.5 ${showsColor ? '' : 'invisible'}`} aria-hidden={!showsColor}>
            <Swatch value={lightResolved} ground={pageGround('light', ctx)} />
            <Swatch value={darkResolved} ground={pageGround('dark', ctx)} />
          </span>
          <code className="shrink-0 font-mono">--{varKey}</code>
          <span className="truncate text-text-muted">{light ?? '—'}</span>
        </button>
        {dependents.length > 0 && (
          <span className="shrink-0 text-micro text-text-muted">{t('styles.variables.dependents', { count: dependents.length })}</span>
        )}
        {/* Only the deviation. "Letzter Build" was on 60 of 64 rows, identical every time, sitting
            at the far right of a 1380px row with nothing between it and the name - which is what
            made the list read as wide and empty. The origin is named in the panel below for every
            row, so nothing is lost by dropping the repetition. */}
        {(origin === 'user' || origin === 'theme') && (
          <Badge tone={ORIGIN_TONE[origin]}>{t(`styles.variables.origin.${origin}`)}</Badge>
        )}
        {override && (
          <button type="button" onClick={() => onChange(null)} className="shrink-0 text-micro text-text-muted underline">
            {t('styles.variables.reset')}
          </button>
        )}
      </div>

      {/* The panel is capped on purpose, unlike the page around it: it is short labelled text and
          a pair of inputs, and stretched across a maximized window its two dependency columns end
          up a screen apart from the row they belong to. */}
      {expanded && (
        <div className="ml-[18px] mt-1.5 flex max-w-5xl flex-col gap-3 border-l-2 border-ink/[0.08] pl-3 dark:border-ink/10">
          <CurrentValues varKey={varKey} ctx={ctx} split={isColor || lightResolved !== darkResolved} />

          <section>
            <SectionLabel>{t('styles.variables.section.origin')}</SectionLabel>
            <p className="mb-1 text-micro text-text-muted">
              {t(`styles.variables.origin.${origin}`)}
            </p>
            <Chain varKey={varKey} mode="light" ctx={ctx} label={t('styles.variables.light')} />
            {(dark !== light || darkResolved !== lightResolved) && (
              <Chain varKey={varKey} mode="dark" ctx={ctx} label={t('styles.variables.dark')} />
            )}
          </section>

          {/* The two directions of the dependency graph, side by side and named - "N abhängig" in
              the header answers neither question on its own. */}
          <div className="grid gap-3 md:grid-cols-2">
            <section>
              <SectionLabel>{t('styles.variables.section.uses')}</SectionLabel>
              {uses.length === 0 ? (
                <p className="text-micro text-text-muted">{t('styles.variables.usesNone')}</p>
              ) : (
                <KeyChips keys={uses} onNavigate={onNavigate} />
              )}
            </section>
            <section>
              <SectionLabel>{t('styles.variables.section.dependents')}</SectionLabel>
              {dependents.length === 0 ? (
                <p className="text-micro text-text-muted">{t('styles.variables.dependentsNone')}</p>
              ) : (
                <>
                  <p className="mb-1 text-micro text-text-muted">
                    {t('styles.variables.dependentsWarning', { count: dependents.length })}
                  </p>
                  <KeyChips keys={dependents} onNavigate={onNavigate} />
                </>
              )}
            </section>
          </div>

          <section>
            <SectionLabel>{t('styles.variables.section.edit')}</SectionLabel>
            <div className="flex flex-wrap items-center gap-4">
              <ValueInput
                varKey={varKey}
                ctx={ctx}
                mode="light"
                label={splitModes ? t('styles.variables.light') : t('styles.variables.bothModes')}
                value={draft.light}
                onChange={(v) => setMode('light', v)}
              />
              {splitModes && (
                <ValueInput
                  varKey={varKey}
                  ctx={ctx}
                  mode="dark"
                  label={t('styles.variables.dark')}
                  value={draft.dark}
                  onChange={(v) => setMode('dark', v)}
                />
              )}
              {!splitModes && (
                <button type="button" onClick={() => setDarkOpen(true)} className="text-micro text-text-muted underline">
                  {t('styles.variables.splitDark')}
                </button>
              )}
              {/* The way back, where there is one: only the user's own dark value can be taken away,
                  a theme's stays and keeps the two fields. */}
              {splitModes && !isColor && !baseDiffers && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('dark', base.dark)
                    setDarkOpen(false)
                  }}
                  className="text-micro text-text-muted underline"
                >
                  {t('styles.variables.unsplitDark')}
                </button>
              )}
              {override && (
                <button type="button" onClick={() => onChange(null)} className="text-micro text-text-muted underline">
                  {t('styles.variables.resetToOriginal')}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }): JSX.Element {
  return <p className="mb-1 text-micro font-semibold uppercase tracking-wide text-text-secondary">{children}</p>
}

// The literal both modes paint right now, spelled out rather than left to a 12px swatch - a hex
// next to the color is what makes "the picker shows something else than the swatch" checkable.
// `split` false: one line for both modes, for a value that is no colour and the same in both.
function CurrentValues({ varKey, ctx, split }: { varKey: string; ctx: ResolveContext; split: boolean }): JSX.Element {
  const { t } = useTranslation()
  return (
    <section>
      <SectionLabel>{t('styles.variables.section.current')}</SectionLabel>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {(split ? (['light', 'dark'] as Mode[]) : (['light'] as Mode[])).map((mode) => {
          const resolved = resolvedValue(varKey, mode, ctx)
          const hex = cssColorToHex(resolved)
          return (
            <div key={mode} className="flex items-center gap-1.5 text-micro">
              <span className="text-text-muted">{split ? t(`styles.variables.${mode}`) : t('styles.variables.bothModes')}:</span>
              {isDisplayableColor(resolved) && <Swatch value={resolved} ground={pageGround(mode, ctx)} size="md" />}
              <code className="font-mono text-text">
                {resolved ?? t('styles.variables.unresolved')}
              </code>
              {hex && hex.toLowerCase() !== (resolved ?? '').toLowerCase() && (
                <code className="font-mono text-text-muted">{hex}</code>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function KeyChips({ keys, onNavigate }: { keys: string[]; onNavigate?: (key: string) => void }): JSX.Element {
  const { t } = useTranslation()
  const visible = keys.slice(0, 24)
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((key) =>
        onNavigate ? (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(key)}
            className="rounded bg-ink/[0.05] px-1.5 py-0.5 font-mono text-micro hover:bg-ink/10 dark:bg-ink/10 dark:hover:bg-ink/20"
            title={t('styles.variables.chipHint')}
          >
            --{key}
          </button>
        ) : (
          <code key={key} className="rounded bg-ink/[0.05] px-1.5 py-0.5 font-mono text-micro dark:bg-ink/10">
            --{key}
          </code>
        )
      )}
      {keys.length > visible.length && (
        <span className="text-micro text-text-muted">{t('styles.variables.moreKeys', { count: keys.length - visible.length })}</span>
      )}
    </div>
  )
}

// Renders the derivation as it actually reads in CSS: each hop is a variable and the value it was
// declared with, ending on the literal the browser finally paints. A single-step chain (a plain
// literal) still shows, because "this one is not derived from anything" is the answer to the same
// question the expanded row asks.
function Chain({ varKey, mode, ctx, label }: { varKey: string; mode: Mode; ctx: ResolveContext; label: string }): JSX.Element {
  const { t } = useTranslation()
  const steps = resolveChain(varKey, mode, ctx)
  if (steps.length === 0) {
    return (
      <p className="text-micro text-text-muted">
        {label}: {t('styles.variables.unresolved')}
      </p>
    )
  }
  return (
    <p className="flex flex-wrap items-center gap-1 text-micro text-text-muted">
      <span className="text-text-muted">{label}:</span>
      {steps.map((step, i) => (
        <span key={step.key} className="flex items-center gap-1">
          {i > 0 && <span className="text-text-muted">→</span>}
          <code className="font-mono">--{step.key}</code>
          {i === steps.length - 1 && (
            <>
              <span className="text-text-muted">→</span>
              <code className="font-mono text-text">{step.value}</code>
            </>
          )}
        </span>
      ))}
    </p>
  )
}

// The picker is fed the *resolved* literal, not the raw draft: a value like `var(--secondary)` or
// `hsl(var(--accent-hsl))` is a perfectly good color that <input type="color"> cannot parse, and
// feeding it straight through made the picker show white next to a swatch painting the real color.
function ValueInput({
  varKey,
  ctx,
  mode,
  label,
  value,
  onChange
}: {
  varKey: string
  ctx: ResolveContext
  mode: Mode
  label: string
  value: string
  onChange: (value: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const resolved = resolveValueLiteral(value, mode, ctx)
  const hex = cssColorToHex(resolved)
  const isColor = catalogDef(varKey)?.kind === 'color' || hex !== null
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-micro text-text-muted">{label}</span>
      {isColor && (
        <ColorPicker
          value={resolved ?? value}
          hex={hex}
          onChange={onChange}
          title={swatchTitle(t, resolved ?? value, pageGround(mode, ctx))}
          ground={pageGround(mode, ctx)}
        />
      )}
      <TextInput value={value} onChange={(e) => onChange(e.target.value)} className="w-44 font-mono text-xs" />
    </div>
  )
}

function Swatch({ value, ground, size = 'sm' }: { value: string | undefined; ground: string; size?: 'sm' | 'md' }): JSX.Element {
  const { t } = useTranslation()
  return (
    <span
      title={swatchTitle(t, value, ground)}
      className={`${size === 'md' ? 'h-4 w-4' : 'h-3 w-3'} shrink-0 rounded-sm border border-ink/10 dark:border-ink/20`}
      style={swatchStyle(value, ground)}
    />
  )
}
