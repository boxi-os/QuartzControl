import { isDisplayableColor } from './variableGraph'

/**
 * A colour swatch that opens the OS picker, for a value that is not always a colour the picker can
 * show.
 *
 * `<input type="color">` accepts nothing but `#rrggbb`. Everything else - `var(--secondary)`, an
 * `hsl()`, a gradient, a chain that resolves to nothing - it silently replaces with white, and the
 * three call sites here all passed `'#ffffff'` when they could not produce a hex (T2 in the review).
 * Two of them rendered that input directly, so a variable set to a real colour showed up as a white
 * box: the one thing the swatch is for, saying which colour this is, was wrong exactly when the
 * value was interesting.
 *
 * So the input is always transparent and the colour is painted *behind* it, from the raw value -
 * the pattern the Basis tab already used. The browser paints what CSS understands, which is a much
 * larger set than the picker accepts. Clicking still opens the picker, and picking still writes a
 * hex; that is a deliberate replacement by the user, not a value quietly turning into `#ffffff`.
 *
 * Painted through isDisplayableColor rather than by handing the raw string to `backgroundColor`:
 * the CSSOM *rejects* a value it cannot parse and keeps the one before it, so typing
 * `linear-gradient(red, blue)` into a colour field left the swatch showing the green it had a
 * moment ago - measured in the running app. An unpaintable value now shows as nothing.
 */
export default function ColorPicker({
  value,
  hex,
  onChange,
  title,
  size = 'sm',
  className = ''
}: {
  /** The value as written - painted as the swatch, whatever notation it is in. */
  value: string | undefined
  /** The same colour as `#rrggbb`, where it could be resolved to one; seeds the picker. */
  hex: string | null
  onChange: (hex: string) => void
  title?: string
  size?: 'sm' | 'lg'
  className?: string
}): JSX.Element {
  return (
    <span
      className={`relative shrink-0 overflow-hidden rounded border ${
        size === 'lg' ? 'h-10 w-10' : 'h-6 w-8'
      } ${className}`}
      style={{ backgroundColor: isDisplayableColor(value) ? value : 'transparent' }}
    >
      <input
        type="color"
        // The seed only matters for where the picker opens; the swatch behind it says the truth
        // either way. Black rather than white as the last resort, so a picker that opens on a value
        // it could not read does not look like it read "white".
        value={hex ?? '#000000'}
        onChange={(e) => onChange(e.target.value)}
        title={title}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </span>
  )
}
