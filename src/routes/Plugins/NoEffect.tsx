import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui'

/** "wirkt nicht" and why, under a switch whose setting does nothing right now (conventions: a word,
 *  not only grey). The badge is hidden from the name; the reason is read as the line it is. */
export function NoEffect({ reason }: { reason: string }): JSX.Element {
  const { t } = useTranslation()
  return (
    <p className="flex flex-wrap items-center gap-1.5 text-micro italic text-text-muted">
      <span aria-hidden className="not-italic">
        <Badge>{t('pluginOptions.noEffect')}</Badge>
      </span>
      <span>{reason}</span>
    </p>
  )
}
