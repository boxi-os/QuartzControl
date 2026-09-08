import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

/**
 * Warnings arrive as `kind:detail` strings from main, deliberately not as finished sentences: the
 * service has no i18n and an import of a 48-plugin package produces 45 near-identical ones. They
 * are grouped by kind here, so "45 Plugins übersprungen" is one line rather than forty-five.
 *
 * A kind whose own sentence spells out the first detail gets one line per case instead, like the
 * dry run's invalid frames (Templates.tsx). Two reasons, and the second is the one that made the
 * shape wrong rather than merely ugly: comma-joining details that are sentences puts a list
 * separator next to the dash inside every one of them - and the head line has already said
 * details[0], so the tail repeated it. With two broken frames the first appeared twice.
 *
 * Which kinds those are is asked of i18next, not kept as a list of names. Six of the twenty-two
 * carry a `{{detail}}` today, and a hand-written list is exactly the thing that is right until the
 * twenty-third arrives - the five zod codes in layoutFrameService were that list, correct for four
 * rounds and then not. The probe is an interpolation whose result cannot occur in a translation:
 * if the rendered sentence contains it, the template consumed `detail`.
 */
const DETAIL_PROBE = '\u2063qc-detail\u2063'
const DETAILS_SHOWN = 6

export function ImportOutcome({ warnings }: { warnings: string[] }): JSX.Element {
  const { t } = useTranslation()
  const usesDetail = (kind: string): boolean =>
    t([`templates.warnings.${kind}`, 'templates.warnings.unknown'], { count: 1, detail: DETAIL_PROBE, kind }).includes(
      DETAIL_PROBE
    )
  const grouped = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const warning of warnings) {
      const kind = warning.split(':')[0]
      const detail = warning.slice(kind.length + 1)
      map.set(kind, [...(map.get(kind) ?? []), detail])
    }
    return [...map.entries()]
  }, [warnings])

  if (warnings.length === 0) {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
        <Check size={13} /> {t('templates.importSuccessNoWarnings')}
      </p>
    )
  }
  return (
    <ul className="mt-3 flex flex-col gap-1 text-xs text-amber-700 dark:text-amber-400">
      {grouped.map(([kind, details]) =>
        usesDetail(kind) ? (
          details.slice(0, DETAILS_SHOWN).map((detail, index) => (
            <li key={`${kind}:${index}`}>
              {t([`templates.warnings.${kind}`, 'templates.warnings.unknown'], { count: 1, detail, kind })}
              {index === DETAILS_SHOWN - 1 && details.length > DETAILS_SHOWN && (
                <span className="text-text-muted"> {t('templates.warningsMore', { count: details.length - DETAILS_SHOWN })}</span>
              )}
            </li>
          ))
        ) : (
          <li key={kind}>
            {t([`templates.warnings.${kind}`, 'templates.warnings.unknown'], { count: details.length, detail: details[0], kind })}
            {details.length > 1 && (
              <span className="text-text-muted"> — {details.slice(0, DETAILS_SHOWN).join(', ')}{details.length > DETAILS_SHOWN ? ' …' : ''}</span>
            )}
          </li>
        )
      )}
    </ul>
  )
}
