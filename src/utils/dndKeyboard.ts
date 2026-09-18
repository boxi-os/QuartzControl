import { KeyboardCode, type KeyboardCoordinateGetter, type UniqueIdentifier } from '@dnd-kit/core'

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
export const nearestDroppableCoordinates: KeyboardCoordinateGetter = (event, args) => stepFrom(event, args, null)

/**
 * The same, for a board that knows better than the geometry which field the dragged thing stands
 * on. `standingOn` gets the sensor's context and returns that field's id, or null to fall back to
 * the smallest target under the dragged centre. Where it answers, the step starts from the middle
 * of that field on both axes.
 *
 * The frame editor needs it because a placed area is not where its chip is: the chip sits at the
 * box's top-left corner, the area's place is the cell its placement starts at, and the smallest
 * target under the chip's centre is either the box itself - then the first press started from the
 * middle of a six-column box, and "left" went *right* - or another cell of the box when the first
 * column is narrow. Measured (twenty-ninth review, finding 5, frame "focus", `page-body` on
 * columns 4-9): Space · ArrowLeft was "liegt über Zelle Zeile 2, Spalte 6".
 */
export function nearestDroppableCoordinatesFrom(
  standingOn: (context: Parameters<KeyboardCoordinateGetter>[1]['context']) => UniqueIdentifier | null
): KeyboardCoordinateGetter {
  return (event, args) => stepFrom(event, args, standingOn(args.context), true)
}

function stepFrom(
  event: KeyboardEvent,
  { context }: Parameters<KeyboardCoordinateGetter>[1],
  standingOn: UniqueIdentifier | null,
  keepCrossAxis = false
): ReturnType<KeyboardCoordinateGetter> {
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
  const field = standingOn !== null ? droppableRects.get(standingOn) : undefined
  const here = rects
    .filter((rect) => rect.left <= from.x && from.x <= rect.left + rect.width && rect.top <= from.y && from.y <= rect.top + rect.height)
    .reduce<(typeof rects)[number] | null>((acc, rect) => (acc === null || rect.width * rect.height < acc.width * acc.height ? rect : acc), null)
  if (field) {
    from.x = field.left + field.width / 2
    from.y = field.top + field.height / 2
  } else if (here) {
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

  // The second round has one limit: a target whose centre lies outside the window *on the other
  // axis* is not a step. The KeyboardSensor scrolls only along the axis of the key, so a sideways
  // press onto such a target takes the chip out of sight and leaves it there. Measured on the
  // layout board (thirty-first review, finding 4, 1280x900): from a row of the full-width header
  // zone nothing lies to the right at its height, the best target anywhere was the right sidebar
  // 980px further down, and ArrowRight put the chip at y 1585 in a window 900 high - with a Space
  // there moving the component into that sidebar unseen. Such a press now does nothing, like
  // ArrowDown in the last row. On-axis targets need no such test: they overlap the chip on that
  // axis, and the chip is where the user is looking.
  const inSight = (rect: { left: number; top: number; width: number; height: number }): boolean =>
    vertical
      ? rect.left + rect.width / 2 >= 0 && rect.left + rect.width / 2 <= window.innerWidth
      : rect.top + rect.height / 2 >= 0 && rect.top + rect.height / 2 <= window.innerHeight
  const onAxis = candidates.filter((c) => c.overlaps)
  const pool = onAxis.length > 0 ? onAxis : candidates.filter((c) => inSight(c.rect))
  const best = pool.reduce<(typeof pool)[number] | null>((acc, c) => (acc === null || c.score < acc.score ? c : acc), null)?.rect ?? null

  if (!best) return undefined
  const target = {
    x: best.left + best.width / 2 - collisionRect.width / 2,
    y: best.top + best.height / 2 - collisionRect.height / 2
  }
  // On the frame board a sideways press keeps the chip at its height, and an up/down press at its
  // horizontal place, as far as the target allows - instead of the target's centre on both axes.
  // A row is as tall as its tallest box, and one with an open area form was 650px: the first
  // ArrowRight dropped the chip by half of that, and in a taller row below the window's edge,
  // which the KeyboardSensor does not scroll for because it only looks at the axis of the key
  // (thirtieth review, "nebenbei" 3). The board's collision detection already takes the smallest
  // target under the dragged centre when no target's centre is exactly there, so a centre that
  // stays inside the target resolves to it all the same. The global board keeps the centre: its
  // zones are lists, and where in a list the chip lands is what its collision decides.
  if (keepCrossAxis) {
    const keep = (start: number, size: number, own: number, current: number): number =>
      size <= own ? start + size / 2 - own / 2 : Math.min(Math.max(current - own / 2, start), start + size - own)
    if (vertical) target.x = keep(best.left, best.width, collisionRect.width, collisionRect.left + collisionRect.width / 2)
    else target.y = keep(best.top, best.height, collisionRect.height, collisionRect.top + collisionRect.height / 2)
  }
  return target
}
