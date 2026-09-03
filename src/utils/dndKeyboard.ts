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

  // Two rounds, and the first one is what makes a grid behave like a grid: only targets that still
  // overlap the dragged rect on the *other* axis - the cells in this column for an up/down press,
  // the ones in this row for left/right. Without it a press compares raw distances, and a wide
  // target just off-axis beats the neighbour on-axis: measured on the frame board, where "right"
  // from a cell landed in the tray above it because the next column's centre was 800px away and the
  // tray's was 50px right and 150px up. The second round drops the overlap requirement, so a press
  // can still leave the board for the tray when nothing on-axis is left.
  const candidates: { rect: { left: number; top: number; width: number; height: number }; score: number; overlaps: boolean }[] = []

  for (const entry of droppableContainers.getEnabled()) {
    if (!entry || entry.disabled) continue
    const rect = droppableRects.get(entry.id)
    if (!rect) continue

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
