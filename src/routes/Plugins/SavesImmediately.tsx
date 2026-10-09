import { useTranslation } from 'react-i18next'

/**
 * The plugin tabs' side panels have no Save button: a switch writes on the click, a text field when
 * it is left. Said in the panel itself, next to the "Gespeichert" it flashes - until the 41st review
 * only the InfoNote above the list said so, and the Installiert tab not even there
 * (docs/conventions.md, the rule on a list with a panel).
 */
export function SavesImmediately({ saved }: { saved: boolean }): JSX.Element {
  const { t } = useTranslation()
  return (
    <>
      <span className="text-micro text-text-muted">{t('plugins.savesImmediately')}</span>
      {saved && <span className="text-micro text-green-600 dark:text-green-400">{t('pluginsInstalled.savedFlash')}</span>}
    </>
  )
}
