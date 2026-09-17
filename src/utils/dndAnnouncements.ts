import { useRef } from 'react'
import type { Announcements, ScreenReaderInstructions } from '@dnd-kit/core'
import type { TFunction } from 'i18next'

/**
 * The spoken half of a drag, in the app's language.
 *
 * dnd-kit ships announcements and keyboard instructions of its own, and they are good - but they
 * are English ("Draggable item 37 was moved over droppable area 42"), and they name the raw ids,
 * which here are indices into `config.plugins`. Both lists that drag (the plugin list, the layout
 * board) get this instead: the same sentences, in de/en, with the names the user can see.
 *
 * `describe` turns an id into that name. It belongs to the caller because only the caller knows
 * what its ids mean - a config index, a palette chip, a layout position.
 */
export function useDndAccessibility(
  t: TFunction,
  describe: (id: string) => string
): { announcements: Announcements; screenReaderInstructions: ScreenReaderInstructions } {
  const name = (id: string | number): string => describe(String(id)) || String(id)
  // Whether this drag has been anywhere else yet - the one thing that tells the target dnd-kit
  // reports on pickup from a step back onto the same place. A ref rather than a variable in this
  // function: all three callers call it from their render body, and a drag re-renders them on
  // every change of `over`, so a plain variable would be back to `false` before the second
  // sentence. Reset in onDragStart, which is the one place that runs before any of it.
  const movedAway = useRef(false)

  return {
    screenReaderInstructions: { draggable: t('dnd.instructions') },
    announcements: {
      onDragStart: ({ active }) => {
        movedAway.current = false
        return t('dnd.picked', { name: name(active.id) })
      },
      // dnd-kit reports the item's own place as the first target the moment it is picked up, and
      // saying so would talk over the "aufgenommen" that just went out - measured in the running
      // app, the pickup sentence never survived otherwise. So: silence, but only until the drag has
      // been somewhere else. After that, standing on one's own place again is a move like any
      // other, and staying silent leaves the region saying where the item was *before* the last
      // press. Measured (twenty-first review, "nebenbei" 1): the third ArrowUp put the overlay back
      // on its starting place while the region still said "liegt über page-title".
      //
      // Asked by name, not by id, because the name is what is read out: on the layout board the
      // item's own place *is* its id, in the frame builder it is a box with an id of its own that
      // describes to the same word - and that half said "header liegt über header", two answers to
      // one situation.
      onDragOver: ({ active, over }) => {
        if (over && name(over.id) === name(active.id)) {
          return movedAway.current ? t('dnd.backHome', { name: name(active.id) }) : undefined
        }
        movedAway.current = true
        return over ? t('dnd.over', { name: name(active.id), target: name(over.id) }) : t('dnd.outside', { name: name(active.id) })
      },
      onDragEnd: ({ active, over }) =>
        over ? t('dnd.dropped', { name: name(active.id), target: name(over.id) }) : t('dnd.cancelled', { name: name(active.id) }),
      onDragCancel: ({ active }) => t('dnd.cancelled', { name: name(active.id) })
    }
  }
}
