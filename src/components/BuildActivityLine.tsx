import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoaderCircle } from 'lucide-react'
import type { BuildActivity } from '@shared/ipc-contract'

function elapsed(since: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000))
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * "Build läuft seit 0:42 · schreibt die Seiten". A build of a large project takes long enough to
 * look frozen, and a button reading "Baue…" says nothing about whether anything is still moving -
 * the clock and the phase do. Ticks once a second while shown.
 *
 * Not a live region on purpose: a line that changes every second would be read out every second.
 * Starting and finishing are what the surrounding page announces.
 */
export function BuildActivityLine({ activity, className = '' }: { activity: BuildActivity; className?: string }): JSX.Element {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <p className={`flex items-center gap-1.5 text-xs text-text-secondary ${className}`}>
      <LoaderCircle size={13} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
      <span>
        {t(`buildActivity.kind.${activity.kind}`, { time: elapsed(activity.startedAt, now) })}
        <span className="text-text-muted"> · {t(`buildActivity.phase.${activity.phase}`)}</span>
      </span>
    </p>
  )
}
