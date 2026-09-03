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
export function dndAccessibility(
  t: TFunction,
  describe: (id: string) => string
): { announcements: Announcements; screenReaderInstructions: ScreenReaderInstructions } {
  const name = (id: string | number): string => describe(String(id)) || String(id)

  return {
    screenReaderInstructions: { draggable: t('dnd.instructions') },
    announcements: {
      onDragStart: ({ active }) => t('dnd.picked', { name: name(active.id) }),
      // Silence rather than "X liegt über X": dnd-kit reports the item's own slot as the first
      // target the moment it is picked up, and saying so would talk over the "aufgenommen" that
      // just went out. Measured in the running app - the pickup sentence never survived otherwise.
      onDragOver: ({ active, over }) => {
        if (over?.id === active.id) return undefined
        return over ? t('dnd.over', { name: name(active.id), target: name(over.id) }) : t('dnd.outside', { name: name(active.id) })
      },
      onDragEnd: ({ active, over }) =>
        over ? t('dnd.dropped', { name: name(active.id), target: name(over.id) }) : t('dnd.cancelled', { name: name(active.id) }),
      onDragCancel: ({ active }) => t('dnd.cancelled', { name: name(active.id) })
    }
  }
}
