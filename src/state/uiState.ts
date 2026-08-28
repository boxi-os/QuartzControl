import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

// Every route fully unmounts when the sidebar switches areas (see App.tsx's <Routes>), so anything
// a page keeps in plain useState is gone the moment the user looks at something else - which tab of
// the Layout editor was open, which frame was being edited, what was typed into a search box. This
// is the sibling of ProjectLayout's scrollPositions map: same lifetime (the renderer process, not
// disk), same keying (by pathname, so different projects and areas never collide), just for state
// instead of scroll offsets.
//
// Deliberately *not* persisted to disk: "where I was a moment ago" should survive a tab switch, not
// an app restart - a half-finished frame draft reappearing days later would be surprising, and the
// values here are drafts, not saved data.
const store = new Map<string, unknown>()

/**
 * Drop-in replacement for useState whose value survives the component being unmounted by a route
 * change. `key` only has to be unique within one route (the pathname is prefixed automatically);
 * namespace it per component - e.g. 'frames.editing' - since several components share a route.
 *
 * Use it for *position*: which tab/selection/query the user had open, and for unsaved drafts.
 * Not for transient interaction state (a drag in progress, a status message, a pending flag) -
 * restoring those mid-gesture is worse than resetting them.
 */
export function useStickyState<T>(key: string, initial: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  const { pathname } = useLocation()
  // Safe to build once per render rather than memoize: a route's pathname can't change while its
  // components are mounted (a different pathname means a different route, i.e. a remount).
  const storeKey = `${pathname}::${key}`

  const [value, setValue] = useState<T>(() => {
    if (store.has(storeKey)) return store.get(storeKey) as T
    return typeof initial === 'function' ? (initial as () => T)() : initial
  })

  useEffect(() => {
    store.set(storeKey, value)
  }, [storeKey, value])

  return [value, setValue]
}

/**
 * Writes a sticky value for a route the user is *about to* navigate to, so a cross-area link can
 * hand over more than a pathname - e.g. "open this frame in the Layout editor", where which tab
 * and which frame are open live in this store rather than in the URL.
 *
 * `pathname` has to be the target route's own pathname, since that is what keys the store; the
 * target reads it in its useState initializer, i.e. exactly once when it mounts. Writing after
 * the target has mounted therefore does nothing - this is for the moment before a navigation.
 */
export function primeStickyState(pathname: string, key: string, value: unknown): void {
  store.set(`${pathname}::${key}`, value)
}
