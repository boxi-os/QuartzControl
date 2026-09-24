import type { CSSProperties } from 'react'
import { isDisplayableColor, resolvedValue, type Mode, type ResolveContext } from './variableGraph'

// The last resort when the page's own ground cannot be resolved - white for light, black for dark.
const FALLBACK_GROUND: Record<Mode, string> = { light: '#ffffff', dark: '#000000' }

/**
 * What a colour sits on in the built website: Quartz paints `body` with `var(--light)`, in either
 * mode, so that is the ground a translucent value is composited over there. Resolved through the
 * same context as the row, so an override of `--light` and a theme's ground both count.
 */
export function pageGround(mode: Mode, ctx: ResolveContext): string {
  const value = resolvedValue('light', mode, ctx)
  return isDisplayableColor(value) ? value : FALLBACK_GROUND[mode]
}

/** The same ground, read from a palette as `theme.colors.lightMode`/`darkMode` holds it. */
export function paletteGround(mode: Mode, palette: Record<string, unknown> | undefined): string {
  const value = palette?.light
  return typeof value === 'string' && isDisplayableColor(value) ? value : FALLBACK_GROUND[mode]
}

/**
 * The paint for a swatch: the colour as a layer over the website's ground. Painted straight onto
 * the element, a colour with alpha let the *app's* background show through - `rgba(0,0,0,0.3)`
 * read as near-black in the app's dark mode and as a light grey on the light website it is for.
 * A value that is no paintable colour stays transparent, ground included, so "nothing to show"
 * still reads as nothing rather than as the page colour.
 */
export function swatchStyle(value: string | undefined, ground: string | undefined): CSSProperties {
  if (!isDisplayableColor(value)) return { backgroundColor: 'transparent' }
  if (!ground) return { backgroundColor: value }
  return { backgroundColor: ground, backgroundImage: `linear-gradient(${value}, ${value})` }
}

/**
 * What a swatch says on hover: the value *and* the ground it is painted over. `pageGround` is the
 * ground Quartz paints `body` with - right for a tint laid over the page, and not for one that
 * sits on a callout or a column with its own fill. The swatch cannot know which, so it names the
 * ground it used rather than leave the field to be read as "this is what it looks like"
 * (thirty-sixth review, finding 4). `t` is passed in: this module has no translation of its own.
 */
export function swatchTitle(
  t: (key: string, options?: Record<string, unknown>) => string,
  value: string | undefined,
  ground: string | undefined
): string {
  if (!isDisplayableColor(value)) return t('styles.variables.swatchNone')
  return ground ? t('styles.variables.swatchOver', { value, ground }) : value
}
