// What Quartz asks Google Fonts for, reproduced from its own formatFontSpecification() and
// googleFontHref() (quartz/util/theme.ts, read from a real clone). The defaults are *per role*,
// which is easy to get wrong: body is the only one that gets italic, and header is the only one
// that gets 700. Shared because both sides need it: the renderer to say which cuts a slot loads,
// the main process to ask Google for exactly those when it fetches them into the project.

export type TypographySlot = 'header' | 'body' | 'code'
export type TypographyRole = TypographySlot | 'title'

const ROLE_DEFAULTS: Record<TypographyRole, { weights: number[]; italic: boolean }> = {
  title: { weights: [400, 600], italic: false },
  header: { weights: [400, 700], italic: false },
  body: { weights: [400, 600], italic: true },
  code: { weights: [400, 600], italic: false }
}

export interface GoogleFontRequest<R extends TypographyRole = TypographySlot> {
  slot: R
  family: string
  weights: number[]
  italic: boolean
  /**
   * Quartz emits the `wght@` parameter only when more than one weight is configured
   * (`if (weights.length > 1)`), so a single configured weight is silently dropped and Google
   * serves the family's own default instead. Worth saying out loud rather than showing a number
   * the site never actually loads.
   */
  singleWeightDropped: boolean
}

// A typography entry is either a bare family name or { name, weights?, includeItalic? }.
export function googleFontRequest<R extends TypographyRole>(slot: R, spec: unknown): GoogleFontRequest<R> | null {
  const defaults = ROLE_DEFAULTS[slot]
  if (typeof spec === 'string') {
    return spec ? { slot, family: spec, weights: defaults.weights, italic: defaults.italic, singleWeightDropped: false } : null
  }
  if (!spec || typeof spec !== 'object') return null
  const obj = spec as { name?: unknown; weights?: unknown; includeItalic?: unknown }
  if (typeof obj.name !== 'string' || !obj.name) return null
  const configured = Array.isArray(obj.weights) ? obj.weights.filter((w): w is number => typeof w === 'number') : undefined
  const weights = configured ?? defaults.weights
  const italic = typeof obj.includeItalic === 'boolean' ? obj.includeItalic : defaults.italic
  return { slot, family: obj.name, weights, italic, singleWeightDropped: weights.length <= 1 }
}

// One `family=` value, in Quartz's spelling: `ital` before `wght`, the italic pairs sorted as
// strings (Quartz calls a bare `.sort()`), no `wght@` for a single weight.
function familyParameter(request: GoogleFontRequest<TypographyRole>): string {
  const features: string[] = []
  if (request.italic) features.push('ital')
  if (request.weights.length > 1) {
    const spec = request.italic
      ? request.weights
          .flatMap((w) => [`0,${w}`, `1,${w}`])
          .sort()
          .join(';')
      : request.weights.join(';')
    features.push(`wght@${spec}`)
  }
  const name = encodeURIComponent(request.family.trim()).replace(/%20/g, '+')
  return features.length > 0 ? `${name}:${features.join(',')}` : name
}

/**
 * The CSS2 request for every slot, header, body and code in Quartz's order, then the title when
 * one is set. Quartz asks for the title separately and only for the characters of the page title
 * (`&text=`); a project that holds its fonts itself would have to fetch again whenever the title
 * changes, so the title family comes whole. `null` when no slot names a family.
 */
export function googleFontsCss2Url(typography: Record<string, unknown>): string | null {
  const roles: TypographyRole[] = ['header', 'body', 'code', 'title']
  const families = roles
    .map((role) => googleFontRequest(role, typography[role]))
    .filter((r): r is GoogleFontRequest<TypographyRole> => r !== null)
    .map(familyParameter)
  if (families.length === 0) return null
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`
}
