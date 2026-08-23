import { useCallback, useRef, useState } from 'react'
import { formatIpcError } from '../components/ErrorSurface'

interface AsyncAction<A extends unknown[]> {
  run: (...args: A) => Promise<void>
  pending: boolean
  error: string | null
  clearError: () => void
}

// The `pending` flag every page was setting by hand around a window.quartzGui.* call, done in one
// place. The bug this exists to prevent: with a bare
//
//   setBusy(true); await api.something(); setBusy(false)
//
// a rejected call skips the reset, so the button stays disabled with its "wird gespeichert…" label
// forever and nothing tells the user why. The finally below is the whole point.
//
// ErrorSurface's global handler is the backstop for calls that still aren't wrapped; this hook is
// what additionally keeps the *page* usable after a failure.
export function useAsyncAction<A extends unknown[]>(fn: (...args: A) => Promise<unknown>): AsyncAction<A> {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The caller passes a fresh closure every render (it reads current props/state), so keeping it
  // in a ref lets `run` stay referentially stable without going stale.
  const fnRef = useRef(fn)
  fnRef.current = fn

  const run = useCallback(async (...args: A) => {
    setPending(true)
    setError(null)
    try {
      await fnRef.current(...args)
    } catch (err) {
      setError(formatIpcError(err))
    } finally {
      setPending(false)
    }
  }, [])

  return { run, pending, error, clearError: useCallback(() => setError(null), []) }
}
