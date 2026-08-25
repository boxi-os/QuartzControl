import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge, TextInput } from '../../components/ui'
import {
  catalogDef,
  effectiveValue,
  isDisplayableColor,
  originOf,
  resolveChain,
  resolvedValue,
  type Mode,
  type ResolveContext,
  type VariableOrigin
} from './variableGraph'

const ORIGIN_TONE: Record<VariableOrigin, 'slate' | 'green' | 'amber'> = {
  core: 'slate',
  theme: 'slate',
  build: 'slate',
  user: 'green'
}

// One variable, in both the curated "Hauptvariablen" list and the searchable full table - the two
// differ in which keys they show, not in how a row behaves. A row is inert until expanded: the
// derivation chain and the dependents list are the expensive-to-read parts, and with up to ~1000
// rows in the full table they must not all be rendered at once.
export default function VariableRow({
  varKey,
  ctx,
  dependents,
  onSet,
  onReset
}: {
  varKey: string
  ctx: ResolveContext
  dependents: string[]
  onSet: (mode: Mode, value: string) => void
  onReset: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const override = ctx.overrides[varKey]
  const origin = originOf(varKey, ctx)
  const light = effectiveValue(varKey, 'light', ctx)
  const dark = effectiveValue(varKey, 'dark', ctx)
  const lightResolved = resolvedValue(varKey, 'light', ctx)
  const darkResolved = resolvedValue(varKey, 'dark', ctx)

  function startEditing(): void {
    onSet('light', light ?? '')
    onSet('dark', dark ?? light ?? '')
    setExpanded(true)
  }

  return (
    <div className={`rounded-md px-1.5 py-1 ${override ? 'bg-green-50/60 dark:bg-green-500/[0.07]' : ''}`}>
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left hover:underline"
          title={t('styles.variables.chainToggle')}
        >
          {expanded ? <ChevronDown size={12} className="shrink-0" /> : <ChevronRight size={12} className="shrink-0" />}
          <span className="flex shrink-0 gap-0.5">
            <Swatch value={lightResolved} />
            <Swatch value={darkResolved} />
          </span>
          <code className="shrink-0 font-mono">--{varKey}</code>
          <span className="truncate text-slate-500 dark:text-slate-400">{light ?? '—'}</span>
        </button>
        {dependents.length > 0 && (
          <span
            className="shrink-0 text-[11px] text-slate-400"
            title={t('styles.variables.dependentsTitle', { names: dependents.slice(0, 40).join(', ') })}
          >
            {t('styles.variables.dependents', { count: dependents.length })}
          </span>
        )}
        <Badge tone={ORIGIN_TONE[origin]}>{t(`styles.variables.origin.${origin}`)}</Badge>
        {override ? (
          <button type="button" onClick={onReset} className="shrink-0 text-[11px] text-slate-500 underline">
            {t('styles.variables.reset')}
          </button>
        ) : (
          <button type="button" onClick={startEditing} className="shrink-0 text-[11px] text-slate-500 underline">
            {t('styles.variables.adjust')}
          </button>
        )}
      </div>

      {expanded && (
        <div className="ml-[18px] mt-1 flex flex-col gap-1.5 border-l-2 border-black/[0.08] pl-3 dark:border-white/10">
          <Chain varKey={varKey} mode="light" ctx={ctx} label={t('styles.variables.light')} />
          {dark !== light && <Chain varKey={varKey} mode="dark" ctx={ctx} label={t('styles.variables.dark')} />}
          {dependents.length > 0 && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('styles.variables.dependentsWarning', { count: dependents.length })}
            </p>
          )}
        </div>
      )}

      {override && (
        <div className="ml-[18px] mt-1.5 flex flex-wrap items-center gap-3 border-l-2 border-green-400/40 pl-3">
          <ValueInput
            varKey={varKey}
            label={t('styles.variables.light')}
            value={override.light}
            onChange={(v) => onSet('light', v)}
          />
          <ValueInput
            varKey={varKey}
            label={t('styles.variables.dark')}
            value={override.dark}
            onChange={(v) => onSet('dark', v)}
          />
        </div>
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
      <p className="text-[11px] text-slate-400">
        {label}: {t('styles.variables.unresolved')}
      </p>
    )
  }
  return (
    <p className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
      <span className="text-slate-400">{label}:</span>
      {steps.map((step, i) => (
        <span key={step.key} className="flex items-center gap-1">
          {i > 0 && <span className="text-slate-300">→</span>}
          <code className="font-mono">--{step.key}</code>
          {i === steps.length - 1 && (
            <>
              <span className="text-slate-300">→</span>
              <code className="font-mono text-slate-700 dark:text-slate-200">{step.value}</code>
            </>
          )}
        </span>
      ))}
    </p>
  )
}

function ValueInput({
  varKey,
  label,
  value,
  onChange
}: {
  varKey: string
  label: string
  value: string
  onChange: (value: string) => void
}): JSX.Element {
  const isColor = catalogDef(varKey)?.kind === 'color' || isDisplayableColor(value)
  const isValidHex = /^#([0-9a-f]{3}){1,2}$/i.test(value)
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-slate-500">{label}</span>
      {isColor && (
        <input
          type="color"
          value={isValidHex ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded border border-slate-300"
        />
      )}
      <TextInput value={value} onChange={(e) => onChange(e.target.value)} className="w-36 text-xs" />
    </div>
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
