import { useEffect, useRef, useState } from 'react'

/**
 * One live region for the whole app, for the messages that have no place of their own.
 *
 * `PageHeader`'s status slot covers what a page says about itself in a fixed spot. This covers the
 * rest: a confirmation that belongs to *one row of a list* (the plugin list flashes "Gespeichert."
 * next to the row whose option was written), and the running commentary of a drag, which has no
 * visible text at all. A region per row would be forty-eight regions on the plugin page; a region
 * per page is one, and a row writes into it.
 *
 * Module-level subscribers rather than context, for the reason the sticky store and the unsaved
 * flag are module-level too: the writer is a row deep in a page, the reader is a single element in
 * App.tsx, and threading a provider between them buys nothing.
 */
type Listener = (message: string) => void

const listeners = new Set<Listener>()

/**
 * Says something once, out of band. Keep it a whole sentence with the subject in it - "Optionen von
 * explorer gespeichert", not "Gespeichert": the listener has no idea what was on screen.
 */
export function announce(message: string): void {
  for (const listener of listeners) listener(message)
}

/**
 * The region itself, mounted once in App.tsx. It is empty until something is announced, which is
 * the point: a live region only announces text that arrives while it is already in the document.
 */
export function Announcer(): JSX.Element {
  const [message, setMessage] = useState('')
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const listener: Listener = (next) => {
      // Cleared first, then set: an identical message twice in a row is no change to the DOM, and
      // no change is nothing to announce - which is exactly the case that matters here ("nach
      // oben" pressed twice). The timeout also takes the text back out again, so a screen reader
      // moving through the page later does not find a stale sentence sitting in it.
      setMessage('')
      if (clearTimer.current) clearTimeout(clearTimer.current)
      const timer = setTimeout(() => {
        setMessage(next)
        clearTimer.current = setTimeout(() => setMessage(''), 5000)
      }, 60)
      clearTimer.current = timer
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
      if (clearTimer.current) clearTimeout(clearTimer.current)
    }
  }, [])

  return (
    <p role="status" aria-live="polite" className="sr-only">
      {message}
    </p>
  )
}
