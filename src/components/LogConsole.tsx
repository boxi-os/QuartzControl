import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { LogLine } from '@shared/ipc-contract'

// `onClear` is optional so call sites without a meaningful "clear" action (if any ever appear)
// still get a plain console. Output now survives navigating away and back - it's only ever wiped
// by this explicit action or by the underlying process restarting - so a visible way to wipe it
// matters more than it used to.
export function LogConsole({ lines, onClear }: { lines: LogLine[]; onClear?: () => void }): JSX.Element {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight })
  }, [lines.length])

  return (
    <div>
      {onClear && lines.length > 0 && (
        <div className="mb-1 flex justify-end">
          <button type="button" onClick={onClear} className="text-xs text-slate-500 underline hover:text-slate-700 dark:hover:text-slate-300">
            {t('logConsole.clear')}
          </button>
        </div>
      )}
      <div
        ref={ref}
        className="h-72 overflow-y-auto rounded-md bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-200"
      >
        {lines.length === 0 && <p className="text-slate-500">{t('logConsole.noOutput')}</p>}
        {lines.map((line, idx) => (
          <div key={idx} className={line.stream === 'stderr' ? 'text-red-400' : undefined}>
            {line.text.replace(/\n+$/, '')}
          </div>
        ))}
      </div>
    </div>
  )
}
