import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

/**
 * Warnings arrive as `kind:detail` strings from main, deliberately not as finished sentences: the
 * service has no i18n and an import of a 48-plugin package produces 45 near-identical ones. They
 * are grouped by kind here, so "45 Plugins übersprungen" is one line rather than forty-five.
 */
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
      {grouped.map(([kind, details]) => (
        <li key={kind}>
          {t([`templates.warnings.${kind}`, 'templates.warnings.unknown'], { count: details.length, detail: details[0], kind })}
          {details.length > 1 && <span className="text-slate-500 dark:text-slate-400"> — {details.slice(0, 6).join(', ')}{details.length > 6 ? ' …' : ''}</span>}
        </li>
      ))}
    </ul>
  )
}
