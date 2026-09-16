import { KeyboardCode, type KeyboardCoordinateGetter } from '@dnd-kit/core'

const DIRECTIONS: string[] = [KeyboardCode.Down, KeyboardCode.Up, KeyboardCode.Left, KeyboardCode.Right]

/**
 * Arrow keys that step from one drop target to the next one in that direction.
 *
 * dnd-kit's own keyboard sensor moves the picked-up item by a fixed 25px per press, which says
 * nothing about a layout made of cells: on the frame board a cell is 40px tall and as wide as its
 * column, so a press lands somewhere inside the same cell about as often as not. `@dnd-kit/sortable`
 * ships a getter that does step target to target, but it needs the dragged item to be a droppable
 * itself (it reads `droppableContainers.get(active.id)`), and here the dragged thing is an area
 * while the targets are grid cells - it returns nothing at all for a chip out of the tray.
 *
 * So: take the centre of what is being dragged, keep only the targets that actually lie in the
 * pressed direction, and go to the nearest of those - with sideways drift counted double, so that
 * in a grid "down" means the cell below rather than the one diagonally across. The returned
 * coordinate is the dragged rect's new top-left (that is what the sensor subtracts from), chosen so
 * the two centres line up and `closestCenter` resolves to the target we picked.
 */
export const nearestDroppableCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  if (!DIRECTIONS.includes(event.code)) return undefined
  event.preventDefault()

  const { collisionRect, droppableRects, droppableContainers } = context
  if (!collisionRect) return undefined

  const from = { x: collisionRect.left + collisionRect.width / 2, y: collisionRect.top + collisionRect.height / 2 }
  const vertical = event.code === KeyboardCode.Down || event.code === KeyboardCode.Up

  const rects = [...droppableContainers.getEnabled()]
    .filter((entry) => entry && !entry.disabled)
    .map((entry) => droppableRects.get(entry.id))
    .filter((rect): rect is NonNullable<typeof rect> => !!rect)

  // A step starts from the middle of the field one is standing on, not from the middle of the
  // dragged rect - because those two are not always the same point, and where they differ the
  // press goes half a step. `here` is the smallest target containing the dragged centre: on a
  // sortable list that is the dragged row itself and nothing changes, on the frame board it is the
  // cell (or the area's own box) under the handle. Measured (twentieth review, follow-up to the
  // "nebenbei" list): dnd-kit reported the dragged area 26.5px high where its box is 48, so the
  // first ArrowDown out of row 1 landed on another cell *in row 1* - the one whose centre sat 11px
  // below the dragged centre - and only the second press reached row 2. Taken from `here` the
  // first press reaches row 2 and Up comes back.
  const here = rects
    .filter((rect) => rect.left <= from.x && from.x <= rect.left + rect.width && rect.top <= from.y && from.y <= rect.top + rect.height)
    .reduce<(typeof rects)[number] | null>((acc, rect) => (acc === null || rect.width * rect.height < acc.width * acc.height ? rect : acc), null)
  if (here) {
    if (vertical) from.y = here.top + here.height / 2
    else from.x = here.left + here.width / 2
  }

  // Two rounds, and the first one is what makes a grid behave like a grid: only targets that still
  // overlap the dragged rect on the *other* axis - the cells in this column for an up/down press,
  // the ones in this row for left/right. Without it a press compares raw distances, and a wide
  // target just off-axis beats the neighbour on-axis: measured on the frame board, where "right"
  // from a cell landed in the tray above it because the next column's centre was 800px away and the
  // tray's was 50px right and 150px up. The second round drops the overlap requirement, so a press
  // can still leave the board for the tray when nothing on-axis is left.
  const candidates: { rect: { left: number; top: number; width: number; height: number }; score: number; overlaps: boolean }[] = []

  for (const rect of rects) {
    // A target the starting point is already inside is not a step in any direction. Without this
    // an area's own box wins every press: it is a droppable of its own, the handle sits inside it,
    // and with the two rects measured differently its centre lay 11px "ahead" - the smallest score
    // there is. Measured: every ArrowDown scored that box at 11 against 77 for the nearest cell,
    // the drag never moved, and the live region kept saying "header liegt über header".
    if (rect.left <= from.x && from.x <= rect.left + rect.width && rect.top <= from.y && from.y <= rect.top + rect.height) continue

    const dx = rect.left + rect.width / 2 - from.x
    const dy = rect.top + rect.height / 2 - from.y
    const along = event.code === KeyboardCode.Down ? dy : event.code === KeyboardCode.Up ? -dy : event.code === KeyboardCode.Right ? dx : -dx
    const across = Math.abs(vertical ? dx : dy)
    // Strictly in front, not merely not-behind: without the margin the target one is already on
    // wins its own comparison and the press does nothing.
    if (along <= 1) continue

    const overlaps = vertical
      ? rect.left < collisionRect.left + collisionRect.width && collisionRect.left < rect.left + rect.width
      : rect.top < collisionRect.top + collisionRect.height && collisionRect.top < rect.top + rect.height
    candidates.push({ rect, score: along + across * 2, overlaps })
  }

  const onAxis = candidates.filter((c) => c.overlaps)
  const pool = onAxis.length > 0 ? onAxis : candidates
  const best = pool.reduce<(typeof pool)[number] | null>((acc, c) => (acc === null || c.score < acc.score ? c : acc), null)?.rect ?? null

  if (!best) return undefined
  return {
    x: best.left + best.width / 2 - collisionRect.width / 2,
    y: best.top + best.height / 2 - collisionRect.height / 2
  }
}
