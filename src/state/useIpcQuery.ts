import { useCallback, useEffect, useRef, useState } from 'react'
import { formatIpcError } from '../components/ErrorSurface'

/**
 * "Read this from the main process, and tell me while it is running and if it failed."
 *
 * Every page in this app reads its document at mount (see CLAUDE.md: a route owns its document),
 * and most of them did it the same way by hand: an effect, a `.then(setState)`, no guard. That is
 * fine while nothing changes underneath - and wrong the moment the dependency does. Two answers are
 * then in flight, they can arrive in either order, and the one that arrives last wins regardless of
 * which one was asked for last: switch project A → B and B's slower answer loses to A's, leaving B's
 * page showing A's data with no sign that anything is off.
 *
 * The guard is the point of this hook; `loading` and `error` come along because a page that reads
 * something also has to say "reading" and "that failed", and doing it by hand meant two more
 * useStates each time. `reload()` re-runs the same query - the shape a page needs after it has
 * written something.
 *
 * Not for writes, and not for a read whose result the page then edits: an editable document belongs
 * in the page's own state, where a save can compare against it (that is the `dirty` rule). This is
 * for what a page only displays.
 */
export function useIpcQuery<T>(
  query: () => Promise<T>,
  deps: unknown[]
): { data: T | null; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  // Read through a ref so the caller can pass a fresh closure every render (it always does) without
  // the effect re-running on identity alone - `deps` is the contract, exactly as with useEffect.
  const current = useRef(query)
  current.current = query

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    current
      .current()
      .then((result) => {
        if (cancelled) return
        setData(result)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(formatIpcError(err))
        setLoading(false)
      })
    return () => {
      // Not an abort - the main process finishes what it was asked; this only makes sure the answer
      // to a question nobody is waiting for any more cannot land in the state.
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { data, loading, error, reload }
}
