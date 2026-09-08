import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

/**
 * Warnings arrive as `kind:detail` strings from main, deliberately not as finished sentences: the
 * service has no i18n and an import of a 48-plugin package produces 45 near-identical ones. They
 * are grouped by kind here, so "45 Plugins übersprungen" is one line rather than forty-five.
 *
 * For three kinds the detail is itself a finished sentence - main knows the reason and says it, in
 * the user's language and with its own quotation marks and dash. Those get one line each, like the
 * dry run's invalid frames (Templates.tsx): comma-joining sentences puts a list separator next to
 * the dash inside every one of them, and the head line already spelled out the first detail, so
 * with two broken frames the first appeared twice.
 */
const SENTENCE_KINDS = new Set(['frameFailed', 'themeInstallFailed', 'pluginInstallFailed'])
const DETAILS_SHOWN = 6

export function ImportOutcome({ warnings }: { warnings: string[] }): JSX.Element {
  const { t } = useTranslation()
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
        SENTENCE_KINDS.has(kind) ? (
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
