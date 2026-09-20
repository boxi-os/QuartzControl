// Formatting for what the UI states about something rather than computes from it: how long ago it
// happened, how big it is, which version of it is installed. The first two take the active i18n
// language rather than reading it themselves, so a component that already has `i18n` doesn't pull
// in a second source of truth for the current locale.

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

/**
 * Die Zahl aus dem, was ein Werkzeug auf `--version` antwortet - node sagt "v26.5.1", npm ein
 * nacktes "11.17.0", git einen ganzen Satz mit Zusatz ("git version 2.50.1 (Apple Git-155)").
 * Null, wenn keine dasteht; die Aufrufstelle entscheidet, was sie stattdessen zeigt, denn "kein
 * Werkzeug" und "0" sind nicht dasselbe.
 *
 * Der Zusatz hängt nicht immer in Klammern hinten dran, sondern manchmal mit einem Punkt an der
 * Zahl selbst: Das mitgelieferte Linux-git von dugite-native meldet `git version 2.53.0.dirty`
 * (macOS: `git version 2.53.0`), und ein Windows-git `2.53.0.windows.1`. Ein Muster, das Ziffern
 * und Punkte gleich behandelt, nimmt den trennenden Punkt mit - gemessen am 2026-09-20 an der
 * gepackten Linux-App, die daraufhin "git 2.53.0." sagte, auf der Startseite wie in den
 * Einstellungen. Deshalb muss auf jeden Punkt wieder eine Ziffer folgen.
 */
export function versionNumber(version: string | null): string | null {
  return /\d+(?:\.\d+)*/.exec(version ?? '')?.[0] ?? null
}
