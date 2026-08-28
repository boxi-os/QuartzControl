import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * "This page has edits that are not on disk", so leaving it can ask first.
 *
 * Every route fully unmounts on a sidebar switch (see App.tsx's <Routes>), and the three pages
 * that edit a whole document - Konfiguration, Layout, Stile - hold that document in plain
 * useState. Measured in the running app: typing a new header font on Stile → Basis, switching to
 * Plugins and coming back showed the old value again, with nothing having said so. The same is
 * true of a drag-and-drop layout and of an edited stylesheet.
 *
 * A module-level flag rather than context, for the same reason ProjectLayout's scrollPositions is
 * one: the asking happens in the sidebar, which is a sibling of the page that knows it is dirty,
 * and only one route is ever mounted at a time. It is not a draft store - the edits are still
 * lost when the user confirms; what changes is that they are asked.
 */
let dirty = false

export function useUnsavedChanges(isDirty: boolean): void {
  useEffect(() => {
    dirty = isDirty
    return () => {
      dirty = false
    }
  }, [isDirty])
}

export function hasUnsavedChanges(): boolean {
  return dirty
}

/**
 * The visible half of the guard: a page whose Save button has work waiting says so, rather than
 * looking exactly like a page with nothing to save.
 */
export function UnsavedBadge(): JSX.Element {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
      {t('projectLayout.unsavedBadge')}
    </span>
  )
}
