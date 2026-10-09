import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { askDialog } from '../utils/confirm'
import { hasSaveCommand, runSaveCommand } from './saveCommand'

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
 * Asks whether to leave a page with unsaved changes and says whether to go on: `true` without a
 * question when there is nothing unsaved, after "Verwerfen", and after a "Speichern" that worked.
 *
 * Two doors ask it: the sidebar (ProjectLayout) and the menu's way into a route (`app:navigate`,
 * Cmd+, from any page, App.tsx). The menu used to navigate straight away, so an edited
 * Konfiguration went without a word on Cmd+, while the same move through the sidebar asked.
 */
export async function confirmLeave(t: TFunction): Promise<boolean> {
  if (!dirty) return true
  // Three answers where the page has a save to offer (Konfiguration, Layout, Stile), two where
  // it has not - see saveCommand. "Verwerfen" stays the confirming button, so the answer that
  // loses work keeps the place it always had and nobody hits it by muscle memory.
  // Two questions, because the wording has to match the answers: with a Save button the
  // question is what should happen, without one it is whether to leave at all.
  const canSave = hasSaveCommand()
  const answer = await askDialog({
    text: canSave ? t('projectLayout.unsavedWarningWithSave') : t('projectLayout.unsavedWarning'),
    altLabel: canSave ? t('projectLayout.unsavedSave') : undefined,
    confirmLabel: t('projectLayout.unsavedLeave'),
    danger: true
  })
  if (answer === 'cancel') return false
  if (answer === 'confirm') return true
  // A page's save catches its own errors and reports them in its header rather than throwing,
  // so it says in its return value whether it worked. A failed save stays on the page, where
  // the message is - navigating away would drop the changes the user just asked to keep.
  return runSaveCommand()
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
