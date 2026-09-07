import { BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Verweist auf die Seite des Benutzerhandbuchs, die den aktuellen Bildschirm erklärt.
 *
 * Das Handbuch reist als gebaute Website in der App mit; wo es liegt, weiß nur der Hauptprozess
 * (`menu.ts`), deshalb geht der Klick über einen Kanal und nicht über eine URL. `page` ist der
 * Pfad ohne Endung, so wie die Datei im Handbuch heißt — „4-gestaltung/04-variablen“. Zeigt er ins
 * Leere, öffnet sich die Startseite des Handbuchs statt eines Fehlers: Ein falscher Verweis ist ein
 * Fehler im Handbuch, und der Nutzer kann nichts dafür.
 */
export default function HandbookLink({ page }: { page: string }): JSX.Element {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={() => void window.quartzGui.dialog.openHandbook({ page })}
      className="mt-1.5 flex w-fit items-center gap-1 text-micro text-text-secondary hover:text-text hover:underline"
    >
      <BookOpen size={12} aria-hidden />
      {t('common.handbookFor')}
    </button>
  )
}
