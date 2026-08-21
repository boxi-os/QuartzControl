import { useEffect, useRef } from 'react'
import type { LogLine } from '@shared/ipc-contract'

export function LogConsole({ lines }: { lines: LogLine[] }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight })
  }, [lines.length])

  return (
    <div
      ref={ref}
      className="h-72 overflow-y-auto rounded-md bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-200"
    >
      {lines.length === 0 && <p className="text-slate-500">Noch keine Ausgabe.</p>}
      {lines.map((line, idx) => (
        <div key={idx} className={line.stream === 'stderr' ? 'text-red-400' : undefined}>
          {line.text.replace(/\n+$/, '')}
        </div>
      ))}
    </div>
  )
}
