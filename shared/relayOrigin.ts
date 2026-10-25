/**
 * Whether the relay's "Erlaubte Origins" allow `origin`, by send.php's rule (qf_origin_allowed):
 * case aside, without a trailing slash, an empty list allows any. A copy of the relay's rule, so it
 * stands here and check:plugin-copies holds it against send.php run by PHP (review 2026-11-04, N3).
 * Case as strcasecmp() sees it, ASCII only: toLowerCase() took "BÜCHER" for "bücher", the relay
 * does not (found by that check).
 */
export function originListed(allowed: string[], origin: string): boolean {
  const bare = (o: string): string => o.replace(/\/+$/, '').replace(/[A-Z]/g, (c) => c.toLowerCase())
  return allowed.length === 0 || allowed.some((a) => bare(a) === bare(origin))
}
