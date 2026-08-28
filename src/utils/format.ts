// Locale-aware formatting for the two things the dashboard states about every area: how long ago
// something happened, and how big something is. Both take the active i18n language rather than
// reading it themselves, so a component that already has `i18n` doesn't pull in a second source of
// truth for the current locale.

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60]
]

/**
 * "vor 12 Minuten" / "12 minutes ago" for an ISO timestamp. Returns null for anything unparsable
 * (a missing field, a malformed date) rather than "Invalid Date" - the caller decides what to show
 * instead, which is never the same sentence as a real age.
 */
export function formatRelativeTime(iso: string | undefined, locale: string): string | null {
  if (!iso) return null
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return null
  const seconds = Math.round((then - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit)
  }
  return rtf.format(Math.round(seconds), 'second')
}

/**
 * Decimal units (kB, MB), not binary ones: this describes what a site weighs on a server, which is
 * how hosting and browsers count it.
 */
export function formatBytes(bytes: number, locale: string): string {
  const units = ['B', 'kB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000
    unit++
  }
  const digits = unit > 0 && value < 10 ? 1 : 0
  return `${value.toLocaleString(locale, { maximumFractionDigits: digits })} ${units[unit]}`
}
