import type { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

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

export function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <label className="flex flex-col gap-1 text-[13px]">
      <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
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
        <span
          className={`absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[16px]' : 'translate-x-[2px]'
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
  return (
    <div className="inline-flex gap-0.5 rounded-[8px] bg-black/[0.05] p-0.5 dark:bg-white/10">
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

export function Card({ children, className = '' }: { children: ReactNode; className?: string }): JSX.Element {
  return (
    <div
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

export function LabelText(props: LabelHTMLAttributes<HTMLLabelElement>): JSX.Element {
  return (
    <label
      {...props}
      className={`text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${props.className ?? ''}`}
    />
  )
}
