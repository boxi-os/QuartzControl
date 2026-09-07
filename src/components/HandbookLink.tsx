import { BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { HANDBOOK_PAGES, type HandbookPage } from '../data/handbookPages'

/**
 * Verweist auf die Seite des Benutzerhandbuchs, die den aktuellen Bildschirm erklärt.
 *
 * Das Handbuch reist als gebaute Website in der App mit; wo es liegt, weiß nur der Hauptprozess
 * (`menu.ts`), deshalb geht der Klick über einen Kanal und nicht über eine URL. `page` ist eine
 * Kennung aus `handbookPages.ts`, kein Pfad: Das Handbuch übersetzt seine Kapitel *und* ihre Pfade,
 * und welcher der beiden gemeint ist, entscheidet die Sprache der App.
 *
 * Zeigt der Pfad ins Leere, öffnet sich die Startseite des Handbuchs statt eines Fehlers: Ein
 * falscher Verweis ist ein Fehler im Handbuch, und der Nutzer kann nichts dafür.
 */
export default function HandbookLink({ page }: { page: HandbookPage }): JSX.Element {
  const { t, i18n } = useTranslation()
  // Die *aufgelöste* Sprache, nicht die Einstellung: „Systemsprache folgen" sagt nichts darüber,
  // welche Sprache dabei herauskam - dieselbe Unterscheidung wie bei `<html lang>`.
  const lang = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'de'
  return (
    <button
      type="button"
      onClick={() => void window.quartzGui.dialog.openHandbook({ page: HANDBOOK_PAGES[page][lang] })}
      className="mt-1.5 flex w-fit items-center gap-1 text-micro text-text-secondary hover:text-text hover:underline"
    >
      <BookOpen size={12} aria-hidden />
      {t('common.handbookFor')}
    </button>
  )
}
