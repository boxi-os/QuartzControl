import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'

// Colours in this file are the semantic tokens from src/index.css (`text-text-muted`, `bg-surface`,
// `border-ink/10`, `bg-accent`), not palette pairs; this file is the pilot for them. Status colours
// (red danger, the badge tones, the blue info note) stay palette classes on purpose - they mean
// something, and there is no token for "danger".
//
// Sizes are the role tokens from tailwind.config.js too (`text-micro`, `text-ui`, `text-heading`),
// not `text-micro`/`text-ui`: this file is the pilot for those the same way it is for the
// colours, and a new line of text should pick a role rather than a number.
//
// A disabled control still has to say what it is, and that means explicit disabled colours, never
// opacity. Twice measured: the disabled primary/danger fills are light (blue-300 / red-300), and
// with the enabled state's white label that was 1.80:1 and 1.83:1 - the word was simply not there,
// and on Updates or Git-Sync that word is the only thing naming the action you cannot take right
// now; the dark disabled fills are near-black, so white stays there. Then `opacity-50` on the
// disabled Toggle label measured 2.57:1 on the page ground and `disabled:opacity-50` on TextInput
// 3.41:1 (docs/REVIEW-2026-09-02.md, d). Both carry the muted token now. The Toggle label measures
// 4.37:1 on the page ground and 4.76:1 on a card in light, 6.5:1 and 5.5:1 in dark. The disabled
// TextInput sinks to the page ground (`disabled:bg-ground`) rather than taking a 3% ink wash: on
// the ground that wash left the muted text at 4.11:1, below the 4.36:1 floor the muted token is
// held to, while the ground itself gives 4.37:1 in light and 6.5:1 in dark wherever the field
// sits. The Toggle's knob may still dim - it carries no information the label does not.
const VARIANTS = {
  primary:
    'bg-accent text-accent-fg hover:bg-accent-hover disabled:bg-blue-300 disabled:text-blue-800 dark:disabled:bg-blue-900/50 dark:disabled:text-white shadow-sm',
  danger:
    'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-300 disabled:text-red-900 dark:disabled:bg-red-900/50 dark:disabled:text-white shadow-sm',
  // A disabled ghost sinks to the page ground instead of keeping its ink wash, exactly like the
  // disabled TextInput and for the same measurement: the 4% wash darkens whatever is behind it, and
  // muted text on that came out at 4.00:1 on the page ground (4.36 on a card) - below the 4.36:1
  // floor the muted token is held to. On the ground itself the same text measures 4.37:1 in light
  // and 6.5:1 in dark, and the button keeps a fill, so it still reads as a control.
  ghost:
    'bg-ink/[0.04] text-text-secondary hover:bg-ink/[0.08] disabled:bg-ground disabled:text-text-muted dark:bg-ink/10 dark:hover:bg-ink/15'
}

// `type` defaults to "button" rather than the element's own "submit": the app had no <form> at
// all until Modal below put one around every dialog's content, and inside a form a <button>
// without a type submits - so a Cancel or "Ordner wählen" button would have confirmed the dialog
// on click. Outside a form the attribute changes nothing, which is why this is safe for the 125
// existing call sites; the one button per dialog that should submit says `type="submit"`.
export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }): JSX.Element {
  return (
    <button
      type={type}
      {...props}
      className={`rounded-[7px] px-3 py-1.5 text-ui font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
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
export function Field({
  label,
  hint,
  muted,
  children,
  className = ''
}: {
  label: string
  // One line under the control saying what belongs in it. Part of the primitive rather than left
  // to each page, so the size, colour and position of that line are the same everywhere.
  hint?: string
  // The label in the muted tone: for a field whose value is currently not the one in effect (a
  // font the active theme overrides). A prop rather than `opacity-60` from outside, which also
  // dimmed the line explaining the state to 2.88:1; the control itself stays as it is, because it
  // is still editable and still the value that applies once the override is gone.
  muted?: boolean
  children: ReactNode
  className?: string
}): JSX.Element {
  return (
    <label className={`flex flex-col gap-1 text-ui ${className}`}>
      <span className={`font-medium ${muted ? 'text-text-muted' : 'text-text-secondary'}`}>{label}</span>
      {children}
      {hint && <span className="text-micro text-text-muted">{hint}</span>}
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
    <div role="group" aria-label={label} className={`flex flex-col gap-1 text-ui ${className}`}>
      <span className="font-medium text-text-secondary">{label}</span>
      {children}
    </div>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return (
    <input
      {...props}
      className={`rounded-[7px] border border-ink/10 bg-surface px-2.5 py-1.5 text-ui text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:bg-ground disabled:text-text-muted ${props.className ?? ''}`}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return (
    <select
      {...props}
      className={`rounded-[7px] border border-ink/10 bg-surface px-2.5 py-1.5 text-ui text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:bg-ground disabled:text-text-muted ${props.className ?? ''}`}
    />
  )
}

// A macOS-style switch, used instead of raw checkboxes for boolean settings.
export function Toggle({
  label,
  hideLabel,
  hint,
  checked,
  onChange,
  disabled
}: {
  label: string
  // Keeps the label for the accessibility tree only. Four switches sat in list rows with their
  // name printed by a sibling element (the plugin name, an option key, a style setting's title)
  // and passed `label=""` - which a screen reader reads as "switch, off" and nothing else. The
  // label stays required, so an empty one is visibly wrong at the call site, and the name comes
  // from the same <label> every other Toggle is named by rather than from a second mechanism
  // (`aria-label`) that could disagree with the visible one.
  hideLabel?: boolean
  // Same line Field's `hint` renders, for the same reason: a switch whose label is a term of art
  // ("Popover-Vorschauen") says nothing about what turning it on does.
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}): JSX.Element {
  const control = (
    <label className={`flex items-center gap-2.5 text-ui ${disabled ? 'text-text-muted' : 'text-text-secondary'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-[20px] w-[34px] shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-accent' : 'bg-ink/15 dark:bg-ink/20'
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
      {hideLabel ? <span className="sr-only">{label}</span> : label}
    </label>
  )
  if (!hint) return control
  return (
    <div className="flex flex-col gap-1">
      {control}
      <span className="text-micro text-text-muted">{hint}</span>
    </div>
  )
}

// A macOS-style segmented control, used instead of a row of plain buttons for sub-tab switches.
//
// `radiogroup` and not `tablist`, including at the four call sites that switch sub-tabs (Konfiguration,
// Stile, Plugins, Layout): `tablist` is only half a contract without `aria-controls` pointing at a
// `role="tabpanel"`, and the panels here are conditional blocks that no call site gives an id -
// ConfigEditor even renders the bar inside `PageHeader`, several elements away from the panel it
// switches. "Choose one of N" is true at all eleven call sites, so one complete radiogroup beats a
// half-wired tablist plus a second mode every caller would have to get right.
//
// Arrow keys move the selection, not just the focus, and they wrap at both ends. Measured rather than
// assumed: a native `<input type="radio">` group injected into the running production build answers
// ArrowRight by checking the next radio, and the third press on a group of three lands back on the
// first - so this is what Chromium itself does two elements away on the same page. It is also what
// `NSSegmentedControl` does on macOS, and it matches what every call site here already does on a
// mouse click: none of them defers, a click commits (Settings writes the theme, the sub-tabs
// navigate), so a focus-only arrow key would be the one input needing a second keystroke. Wrapping
// earns its keep at the three call sites with exactly two options, where without it half the arrow
// presses would be dead keys.
//
// `label` is required, for the reason `Toggle`'s is: a group without an accessible name is announced
// as "radio group" and nothing else, and making the name optional means the nine call sites that had
// no visible heading would have stayed nameless. It becomes `aria-label` rather than Toggle's
// `sr-only` span, because a group is named by `aria-label`/`aria-labelledby` - there is no `<label>`
// element that can wrap a group the way one wraps a switch, and the segments carry visible text of
// their own, so the usual argument for a real text node does not apply here. At the two call sites
// that sit inside a `FieldGroup` the name is now announced on both levels ("Design, group" then
// "Design, radio group"); that is redundant, not wrong, and the alternative - FieldGroup handing an
// id down to whatever it wraps - is a wiring between two primitives for two call sites.
// Zwei Häute, eine Bedienung. `track` ist die Leiste für „eine von wenigen festen Ansichten"; sie
// setzt voraus, dass die Optionen in eine Zeile passen. `chips` ist für den einen Aufrufer, dessen
// Optionen *Daten* sind: die Veröffentlichungsziele heißen, wie der Nutzer sie genannt hat, und es
// können sieben sein. Gemessen an einem Projekt mit sieben: die Leiste wurde 1390 px breit (bei
// 1280 px Fenster 942 px), brach in zwei Zeilen um und ließ 508 px graue Fläche neben der zweiten
// stehen - `w-fit` kann nicht auf die breiteste *umgebrochene* Zeile schrumpfen, es nimmt die
// verfügbare Breite. Ohne gemeinsame Fläche ist ein Umbruch keine Lücke mehr, sondern eine zweite
// Reihe. Alle anderen elf Aufrufstellen sind einzeilig mit 0-2 px Spiel (nachgemessen bei 1728 und
// 1280 px) und bleiben `track`.
//
// Die Semantik ist in beiden Fällen dieselbe: eine Radiogruppe, ein Tabstopp, Pfeiltasten.
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  variant = 'track'
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
  variant?: 'track' | 'chips'
}): JSX.Element {
  const segments = useRef<(HTMLButtonElement | null)[]>([])
  // Roving tabindex: the group is one tab stop, not one per option. `Math.max(0, …)` so a value that
  // matches no option (a stale `?tab=` in the URL) still leaves the group reachable by keyboard -
  // `aria-checked` stays false on every segment in that case, which is the honest reading.
  const focusIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  )

  const move = (delta: number): void => {
    const next = (focusIndex + delta + options.length) % options.length
    // Focus before onChange: the node is already in the DOM and React keeps it across the re-render
    // (the key is the option value, not the index), so the focus survives the tabindex flipping to
    // it. Doing it after would race a caller that navigates.
    segments.current[next]?.focus()
    onChange(options[next].value)
  }

  const chips = variant === 'chips'
  // self-start matters now that pages fill the window: as a flex item, `inline-flex` alone still
  // stretches to the container's full width, which turned this into a 1600px-wide bar.
  return (
    <div
      role="radiogroup"
      aria-label={label}
      // flex-wrap in beiden Häuten: eine umgebrochene Gruppe ist immer noch eine Gruppe, eine
      // überlaufende lässt Optionen rechts aus der Karte fallen.
      className={
        chips
          ? 'flex flex-wrap gap-1.5'
          : 'inline-flex w-fit flex-wrap self-start gap-0.5 rounded-[8px] bg-ink/[0.05] p-0.5 dark:bg-ink/10'
      }
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(el) => {
            segments.current[index] = el
          }}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={index === focusIndex ? 0 : -1}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => {
            // Up/Down as well as Left/Right, because the native radio group answers to all four and
            // this control is laid out in a row on some pages and read as a list by a screen reader.
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
              event.preventDefault()
              move(1)
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
              event.preventDefault()
              move(-1)
            }
          }}
          className={
            chips
              ? `rounded-[7px] border px-2.5 py-1 text-ui font-medium shadow-sm transition-colors ${
                  value === option.value
                    ? 'border-accent bg-accent text-accent-fg'
                    : 'border-ink/10 bg-surface text-text-secondary hover:border-ink/20 hover:text-text'
                }`
              : `rounded-[6px] px-3 py-1 text-ui font-medium transition-colors ${
                  value === option.value
                    ? 'bg-surface text-text shadow-sm dark:bg-ink/20'
                    : 'text-text-secondary hover:text-text'
                }`
          }
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
      className={`rounded-[10px] border border-ink/[0.06] bg-surface p-4 shadow-sm dark:border-ink/10 ${className}`}
    >
      {children}
    </div>
  )
}

// A short explanation of a word the app uses, shown once at the top of the page that word belongs
// to - what a snapshot is and how it differs from Git-Sync, what a Frame is, what separates a
// Zugang from a Ziel. Blue rather than amber, because none of it is a warning: it is the sentence
// a first-time user needs and everyone else reads past. The same box already existed by hand in
// the Variablen tab; this is that one, named.
export function InfoNote({ children, className = '' }: { children: ReactNode; className?: string }): JSX.Element {
  return (
    <p
      // Capped rather than full width: this is a paragraph to read, and at 1800px a line of it
      // runs past 200 characters. The cap is on the block, not on the page - see CLAUDE.md.
      className={`max-w-[95ch] rounded-md border border-blue-200 bg-blue-50 p-2.5 text-xs leading-relaxed text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 ${className}`}
    >
      {children}
    </p>
  )
}

// The rule this primitive and dialog.confirm (electron/main/ipc/handlers.ts) divide the app by:
// yes/no confirmations run through the native dialog in the main process; in-app overlays are
// only for content with a form or a selection. Kept as one sentence at both ends so the line
// does not drift.
//
// Built on the native <dialog> and showModal(), not on a fixed-position div. The two overlays
// this replaced (the create wizard, the content-source change) had no role, no Escape, no focus
// trap, no focus return, and Tab walked straight through the page behind them - and the third
// overlay would have copied the second. The element gives all of that for free: the top layer,
// ::backdrop, Escape through the cancel event, an inert document behind it, and focus back to
// the opener on close(). The <form method="dialog"> is what makes Return mean "confirm": Return
// in a text field runs `onSubmit`, and with the submit button disabled the browser suppresses
// implicit submission - so "confirm only when valid" needs no key handler of its own.
export function Modal({
  open,
  onClose,
  title,
  children,
  onSubmit,
  dismissible = true
}: {
  open: boolean
  /** Fired when the element closes unconfirmed: Escape, or a submit without onSubmit. A Cancel
   *  button calls this directly and does not go through the close event; closes this component
   *  triggers itself (`open` false, unmount) are filtered out via `closingOurselves`. */
  onClose: () => void
  title: string
  children: ReactNode
  /** Return in a field and the `type="submit"` button both land here. */
  onSubmit?: () => void
  /** False while an action is running: Escape is a close path the Cancel button's disabled
   *  state does not cover. */
  dismissible?: boolean
}): JSX.Element {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  // Set while this component closes the element itself (below), so the resulting `close` event
  // is not reported as the user closing it. Without it, StrictMode's simulated unmount in dev
  // closed the dialog, the event reached onClose, and the parent unmounted the wizard for real.
  const closingOurselves = useRef(false)

  // Layout effects, not passive ones: showModal() has to run before the first paint or the
  // dialog is display:none for a frame, and the unmount cleanup has to run while the element is
  // still in the document - React runs layout cleanups before it removes the host node, passive
  // ones after, and close() on a detached dialog cannot hand focus back to anything.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) {
      el.showModal()
      // showModal() puts focus where the spec version of this Chromium says - the first control
      // in older builds, the dialog itself in newer ones - so the field that matters is named
      // explicitly (`data-autofocus`), the first enabled control is the fallback. Not React's
      // `autoFocus`: that calls .focus() at mount, while the dialog is still display:none.
      const target =
        el.querySelector<HTMLElement>('[data-autofocus]') ??
        el.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])')
      target?.focus()
    } else if (!open && el.open) {
      closingOurselves.current = true
      el.close()
    }
  }, [open])

  // The pages mount this conditionally, and an open dialog that is simply removed from the DOM
  // is not closed - it vanishes, and focus lands on <body> instead of returning to the button
  // that opened it. close() on the way out is what keeps that return trip; verified by reading
  // document.activeElement after cancelling the create wizard.
  useLayoutEffect(() => {
    const el = ref.current
    return () => {
      if (el?.open) {
        closingOurselves.current = true
        el.close()
      }
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={() => {
        if (closingOurselves.current) {
          closingOurselves.current = false
          return
        }
        onClose()
      }}
      onCancel={(event) => {
        if (!dismissible) event.preventDefault()
      }}
      // `--surface` is opaque in both schemes for this element's sake: Card used to be white/4%
      // in dark, and on the top layer that translucent colour composited over the dimmed backdrop
      // and came out darker than the page it sat on. The backdrop repeats what the hand-rolled
      // overlays painted (black/30 plus blur) and is deliberately black in both schemes.
      className="m-auto w-full max-w-lg rounded-[10px] border border-ink/[0.06] bg-surface p-4 text-text shadow-xl backdrop:bg-ink/30 backdrop:backdrop-blur-sm dark:border-ink/10"
    >
      <form
        method="dialog"
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          if (!onSubmit) return
          event.preventDefault()
          onSubmit()
        }}
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {children}
      </form>
    </dialog>
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
    slate: 'bg-ink/[0.06] text-text-secondary dark:bg-ink/10',
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
// `status` is the slot for what a page says *about itself* after an action - "Gespeichert", a save
// error - and it is separate from `actions` for one reason: it is the only part of the header that
// appears without the user looking at it, so it is the part that has to be announced. A live region
// has to be in the document *before* its text arrives, which is why a page passes `null` rather than
// leaving the prop out: an undefined prop means "this page has nothing to say" and renders no
// region at all, while `null` mounts the empty one that a later "Gespeichert" drops into.
export function PageHeader({
  icon: Icon,
  title,
  description,
  status,
  actions
}: {
  icon: LucideIcon
  title: string
  description?: string
  status?: ReactNode
  actions?: ReactNode
}): JSX.Element {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-accent-text/10 text-accent-text">
          <Icon size={18} strokeWidth={2} aria-hidden />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-text">{title}</h1>
          {description && <p className="mt-0.5 max-w-xl text-ui text-text-muted">{description}</p>}
        </div>
      </div>
      {(status !== undefined || actions) && (
        <div className="flex shrink-0 items-center gap-3 pt-1">
          {status !== undefined && (
            // role="status" is aria-live="polite" plus aria-atomic - the whole line is read, not
            // the diff. `empty:hidden` would take it out of the tree again, so it stays: an empty
            // span is zero-width, it only costs the flex gap next to it.
            <span role="status">{status}</span>
          )}
          {actions}
        </div>
      )}
    </div>
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
  const heading = <span className="text-micro font-semibold uppercase tracking-wide text-text-secondary">{title}</span>
  const body = (
    <>
      {children}
      {hint && <p className="text-micro text-text-muted">{hint}</p>}
    </>
  )
  const box = 'rounded-[10px] border border-ink/[0.06] p-3.5 dark:border-ink/10'

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
