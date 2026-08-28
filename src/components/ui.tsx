import { useCallback, useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'

const VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-500 disabled:bg-blue-300 dark:disabled:bg-blue-900/50 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-300 dark:disabled:bg-red-900/50 shadow-sm',
  ghost:
    'bg-black/[0.04] text-slate-700 hover:bg-black/[0.08] disabled:text-slate-400 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15 dark:disabled:text-slate-500'
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }): JSX.Element {
  return (
    <button
      {...props}
      className={`rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    />
  )
}

// Copy-to-clipboard with the only feedback that matters here: which value was just copied, for a
// moment. Shared because both the CSS tab's colour strip and its variable reference offer it, and a
// second copy of the timeout bookkeeping in each would drift.
export function useCopyToClipboard(): { copied: string | null; copy: (value: string, label?: string) => void } {
  const [copied, setCopied] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const copy = useCallback((value: string, label?: string) => {
    void navigator.clipboard.writeText(value)
    setCopied(label ? `${label}: ${value}` : value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(null), 1800)
  }, [])

  return { copied, copy }
}

// `className` is there for grid placement (e.g. a textarea field spanning every column of a
// responsive form grid), not for restyling the field itself.
export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }): JSX.Element {
  return (
    <label className={`flex flex-col gap-1 text-[13px] ${className}`}>
      <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  )
}

// Field's <label> shape, for content that is *not* one form control - a SegmentedControl, a row of
// buttons. A <label> forwards its own clicks to the first labelable element inside it, and a
// <button> is labelable: with Field, clicking the word "Design" activated the first segment and
// silently changed the setting. Measured in the running app before this existed.
export function FieldGroup({
  label,
  children,
  className = ''
}: {
  label: string
  children: ReactNode
  className?: string
}): JSX.Element {
  return (
    <div role="group" aria-label={label} className={`flex flex-col gap-1 text-[13px] ${className}`}>
      <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </div>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return (
    <input
      {...props}
      className={`rounded-[7px] border border-black/10 bg-white px-2.5 py-1.5 text-[13px] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 ${props.className ?? ''}`}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return (
    <select
      {...props}
      className={`rounded-[7px] border border-black/10 bg-white px-2.5 py-1.5 text-[13px] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 ${props.className ?? ''}`}
    />
  )
}

// A macOS-style switch, used instead of raw checkboxes for boolean settings.
export function Toggle({
  label,
  checked,
  onChange,
  disabled
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}): JSX.Element {
  return (
    <label className={`flex items-center gap-2.5 text-[13px] text-slate-700 dark:text-slate-200 ${disabled ? 'opacity-50' : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-[20px] w-[34px] shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${
          checked ? 'bg-blue-600' : 'bg-black/15 dark:bg-white/20'
        }`}
      >
        {/* left-[2px] is a required, explicit anchor: without it, an absolutely positioned
            element with no left/right gets a browser-computed "static position" fallback
            (centered under this button, not flush left) that translate-x then offsets from,
            pushing the knob mostly outside the track - confirmed via computed styles */}
        <span
          className={`absolute left-[2px] top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[14px]' : 'translate-x-0'
          }`}
        />
      </button>
      {label}
    </label>
  )
}

// A macOS-style segmented control, used instead of a row of plain buttons for sub-tab switches.
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}): JSX.Element {
  // self-start matters now that pages fill the window: as a flex item, `inline-flex` alone still
  // stretches to the container's full width, which turned this into a 1600px-wide bar.
  return (
    <div className="inline-flex w-fit self-start gap-0.5 rounded-[8px] bg-black/[0.05] p-0.5 dark:bg-white/10">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-[6px] px-3 py-1 text-[13px] font-medium transition-colors ${
            value === option.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-white/20 dark:text-white'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      {...props}
      className={`rounded-[10px] border border-black/[0.06] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] ${className}`}
    >
      {children}
    </div>
  )
}

export function Badge({
  children,
  tone = 'slate'
}: {
  children: ReactNode
  tone?: 'slate' | 'green' | 'red' | 'amber'
}): JSX.Element {
  const tones = {
    slate: 'bg-black/[0.06] text-slate-700 dark:bg-white/10 dark:text-slate-300',
    green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
  }
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

// The consistent "where am I" headline at the top of every project area: an icon that echoes
// the sidebar entry, the section title, and a plain-language explanation of what it's for -
// aimed at users who don't already know Quartz's terminology. `actions` holds whatever
// page-specific buttons used to sit next to a hand-rolled <h1> (save button, status text, ...).
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions
}: {
  icon: LucideIcon
  title: string
  description?: string
  actions?: ReactNode
}): JSX.Element {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-blue-600/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
          <Icon size={18} strokeWidth={2} aria-hidden />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
          {description && <p className="mt-0.5 max-w-xl text-[13px] text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3 pt-1">{actions}</div>}
    </div>
  )
}

export function LabelText(props: LabelHTMLAttributes<HTMLLabelElement>): JSX.Element {
  return (
    <label
      {...props}
      className={`text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${props.className ?? ''}`}
    />
  )
}

// One labelled group of settings inside a card. `collapsible` renders the same box as a
// <details> - used for the line names, which are an advanced detail nobody needs open by default.
export function SettingsSection({
  title,
  actions,
  hint,
  collapsible,
  children
}: {
  title: string
  actions?: ReactNode
  hint?: string
  collapsible?: boolean
  children: ReactNode
}): JSX.Element {
  const heading = <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</span>
  const body = (
    <>
      {children}
      {hint && <p className="text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
    </>
  )
  const box = 'rounded-[10px] border border-black/[0.06] p-3.5 dark:border-white/10'

  if (collapsible) {
    return (
      <details className={box}>
        <summary className="cursor-pointer">{heading}</summary>
        <div className="mt-3 flex flex-col gap-3">{body}</div>
      </details>
    )
  }

  return (
    <section className={`flex flex-col gap-3 ${box}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {heading}
        {actions}
      </div>
      {body}
    </section>
  )
}
