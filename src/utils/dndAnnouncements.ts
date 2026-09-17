import { useRef } from 'react'
import type { Announcements, ScreenReaderInstructions } from '@dnd-kit/core'
import type { TFunction } from 'i18next'

/**
 * The spoken half of a drag, in the app's language.
 *
 * dnd-kit ships announcements and keyboard instructions of its own, and they are good - but they
 * are English ("Draggable item 37 was moved over droppable area 42"), and they name the raw ids,
 * which here are indices into `config.plugins`. All three places that drag (the plugin list, the
 * layout board, the frame builder) get this instead: the same sentences, in de/en, with the names
 * the user can see.
 *
 * `describe` turns an id into that name. It belongs to the caller because only the caller knows
 * what its ids mean - a config index, a palette chip, a layout position.
 *
 * `isHome` answers the other question the caller alone can answer: is this target the very place
 * the dragged thing is being dragged *from*. The default is the one that holds wherever a thing's
 * own place is its own id, which is the sortable plugin list - its one user. The frame builder
 * passes its own, because there an area's place is a box with an id of its own, and the layout
 * board does too, because a palette chip is called `palette:<index>` and lies in
 * `palette-drop-zone` (twenty-fourth review, finding 6).
 *
 * `dropOutcome` is the third and last thing only the caller knows: what a drop on *this* target
 * actually did, where "moved there" is not it. On the layout board the component tray deletes a
 * duplicate and refuses a sole instance, and both came out as "X bei Komponentenvorrat abgelegt" -
 * a deletion announced as a move, and a no-op announced as one too (twenty-fifth review,
 * finding 6). Anything it does not answer keeps the ordinary sentences.
 */
export function useDndAccessibility(
  t: TFunction,
  describe: (id: string) => string,
  isHome: (activeId: string, overId: string) => boolean = (activeId, overId) => activeId === overId,
  dropOutcome?: (activeId: string, overId: string) => string | undefined
): { announcements: Announcements; screenReaderInstructions: ScreenReaderInstructions } {
  const name = (id: string | number): string => describe(String(id)) || String(id)
  const home = (active: string | number, over: string | number): boolean => isHome(String(active), String(over))
  // Whether this drag has been anywhere else yet - the one thing that tells the target dnd-kit
  // reports on pickup from a step back onto the same place. A ref rather than a variable in this
  // function: all three callers call it from their render body, and a drag re-renders them on
  // every change of `over`, so a plain variable would be back to `false` before the second
  // sentence. Reset in onDragStart, which is the one place that runs before any of it.
  const movedAway = useRef(false)
  // And whether dnd-kit's first report of a target has been and gone. It comes the moment something
  // is picked up, before any key or any movement, and it is the one that would talk over the
  // "aufgenommen" that just went out. Asking by name covered it wherever the thing's own place has
  // the thing's own name; where it does not - the frame builder reports the *cell* an area lies on -
  // the first press's sentence arrived before the pickup could be read.
  const firstOver = useRef(true)

  return {
    screenReaderInstructions: { draggable: t('dnd.instructions') },
    announcements: {
      onDragStart: ({ active }) => {
        movedAway.current = false
        firstOver.current = true
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
      // Asked through `isHome`, not by comparing the two names. The name was the shortcut that
      // covered the frame builder, where an area's own place is a box with an id of its own that
      // describes to the same word - but on the layout board two *different* things share a name as
      // a matter of course: a palette chip carries the name of the plugin it duplicates, which is
      // the name of the row it would land next to. Measured (twenty-third review, finding 4): a row
      // that had walked three places was announced as "blieb an seinem Platz", and so was a drop
      // that inserted a duplicate.
      onDragOver: ({ active, over }) => {
        if (firstOver.current) {
          firstOver.current = false
          // Not silence: where the first report names a *different* place than the thing itself -
          // the frame builder reports the cell an area lies on - silence was the only answer the
          // user got until a press changed the target, and a first press that keeps the same target
          // changes nothing, so no `onDragOver` follows. Measured (twenty-second review, finding 3):
          // a chip out of the tray answered Space, ArrowDown, ArrowDown with "aufgenommen",
          // nothing, "Zelle Zeile 2, Spalte 1". One sentence carries both halves instead.
          if (over) {
            return home(active.id, over.id)
              ? undefined
              : t('dnd.pickedOver', { name: name(active.id), target: name(over.id) })
          }
        }
        if (over && home(active.id, over.id)) {
          return movedAway.current ? t('dnd.backHome', { name: name(active.id) }) : undefined
        }
        movedAway.current = true
        return over ? t('dnd.over', { name: name(active.id), target: name(over.id) }) : t('dnd.outside', { name: name(active.id) })
      },
      // The same question as in onDragOver, at the other end of the drag: a drop on the place the
      // thing already occupies moved nothing, and "X bei X abgelegt" says it moved. Reachable with
      // one keystroke (Space, Space) and with a click on the handle that drags no pixel. Through
      // `isHome` for the reason given above.
      onDragEnd: ({ active, over }) => {
        if (over && home(active.id, over.id)) return t('dnd.droppedHome', { name: name(active.id) })
        // Asked before the ordinary sentence, because the ordinary sentence is the wrong one
        // wherever this answers: a drop that deletes and a drop that does nothing both read as a
        // move otherwise.
        const outcome = over ? dropOutcome?.(String(active.id), String(over.id)) : undefined
        if (outcome) return outcome
        return over ? t('dnd.dropped', { name: name(active.id), target: name(over.id) }) : t('dnd.cancelled', { name: name(active.id) })
      },
      onDragCancel: ({ active }) => t('dnd.cancelled', { name: name(active.id) })
    }
  }
}
