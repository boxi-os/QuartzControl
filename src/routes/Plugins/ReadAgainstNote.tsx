import { useTranslation } from 'react-i18next'

/**
 * The plugin editors know their plugin from a copy of its code (navigationVariants.ts,
 * layoutBoxes.ts, multilanguageOptions.ts), read against one version. When another one is
 * installed, what they file under "ohne Wirkung" or assume as a default may no longer hold - and
 * nothing else would say so (41st review, finding 7).
 */
export function ReadAgainstNote({
  plugin,
  readAgainst,
  sameCode = [],
  installed
}: {
  plugin: string
  readAgainst: string
  /** Other versions whose code the copy matches as well - the note would only cry wolf there. */
  sameCode?: readonly string[]
  installed: string | undefined
}): JSX.Element | null {
  const { t } = useTranslation()
  if (!installed || installed === readAgainst || sameCode.includes(installed)) return null
  return <p className="text-micro text-amber-700 dark:text-amber-300">{t('plugins.readAgainst', { plugin, read: readAgainst, installed })}</p>
}
