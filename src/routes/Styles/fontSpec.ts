import type { FontFaceInfo } from '@shared/ipc-contract'

// The request rule lives in shared/, where the main process reads it too (fetching the Google
// fonts into the project asks Google for exactly what Quartz would).
export { googleFontRequest, type GoogleFontRequest, type TypographySlot } from '@shared/googleFontRequest'

export interface FaceSummary {
  weights: string[]
  italic: boolean
  origins: FontFaceInfo['origin'][]
}

// "Instrument, ui-sans-serif, …" -> "Instrument". A font stack's first family is the one that
// actually renders when it is available, and the only one an @font-face here can be about.
export function primaryFamily(stack: string | undefined): string {
  const first = stack?.split(',')[0]?.trim() ?? ''
  return first.replace(/^["']|["']$/g, '')
}

// A variable font declares its range as two numbers ("100 1000"); everything else is a single
// value. Both are kept verbatim apart from the dash, since inventing a list of intermediate
// weights would claim more than the declaration says.
function formatWeight(weight: string): string {
  const parts = weight.trim().split(/\s+/)
  return parts.length === 2 ? `${parts[0]}–${parts[1]}` : parts[0]
}

export function summarizeFaces(faces: FontFaceInfo[], family: string): FaceSummary | null {
  const key = family.toLowerCase()
  const matching = faces.filter((f) => f.family.toLowerCase() === key)
  if (matching.length === 0) return null
  const weights: string[] = []
  for (const face of matching) {
    const formatted = formatWeight(face.weight)
    if (!weights.includes(formatted)) weights.push(formatted)
  }
  weights.sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0))
  return {
    weights,
    italic: matching.some((f) => f.style.toLowerCase().includes('italic') || f.style.toLowerCase().includes('oblique')),
    origins: Array.from(new Set(matching.map((f) => f.origin)))
  }
}

// Does this renderer actually have the family, or is it about to silently draw the fallback?
//
// Measured during the alpha test: the preview showed "Schibsted Grotesk" in whatever the fallback
// was, and nothing said so. Nothing loads the site's fonts into this window - the CSP allows no
// external host, and a font the site pulls from Google at page load has no file in the project to
// read either - so a preview is only genuine when the family happens to be installed on this
// machine. `document.fonts.check('16px "X"')` is no help: it answered true for all four families
// that were provably falling back. Comparing rendered text widths against a family that cannot
// exist does answer it, because a fallback produces exactly the fallback's metrics.
let measure: CanvasRenderingContext2D | null = null
const availability = new Map<string, boolean>()

/** After faces were added to or removed from `document.fonts`, the cached answers are stale. */
export function forgetFontAvailability(): void {
  availability.clear()
}

export function fontIsAvailable(family: string): boolean {
  if (!family) return false
  const cached = availability.get(family)
  if (cached !== undefined) return cached
  measure ??= document.createElement('canvas').getContext('2d')
  if (!measure) return true // no canvas: do not claim a font is missing on no evidence
  const width = (stack: string): number => {
    measure!.font = `32px ${stack}`
    return measure!.measureText('Hamburgefonstiv 123').width
  }
  const escaped = family.replace(/["\\]/g, '')
  const result =
    width(`"${escaped}", serif`) !== width('"__no_such_family__", serif') ||
    width(`"${escaped}", sans-serif`) !== width('"__no_such_family__", sans-serif')
  availability.set(family, result)
  return result
}
