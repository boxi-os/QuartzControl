import { useEffect, useState } from 'react'
import type { BuildActivity } from '@shared/ipc-contract'

/**
 * What Quartz is doing for this project right now, as the main process holds it - so a page opened
 * in the middle of a build shows the build, and two pages show the same one. Read on mount, then
 * kept current by the event; the answer to the read is dropped when an event has already arrived,
 * since the event is the newer of the two.
 */
export function useBuildActivity(projectId: string): BuildActivity | null {
  const [activity, setActivity] = useState<BuildActivity | null>(null)
  useEffect(() => {
    let heard = false
    let cancelled = false
    const off = window.quartzGui.build.onActivity((id, next) => {
      if (id !== projectId) return
      heard = true
      setActivity(next)
    })
    window.quartzGui.build
      .activity({ projectId })
      .then((current) => {
        if (!cancelled && !heard) setActivity(current)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      off()
    }
  }, [projectId])
  return activity
}
