import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { LogLine } from '@shared/ipc-contract'

// `onClear` is optional so call sites without a meaningful "clear" action (if any ever appear)
// still get a plain console. Output now survives navigating away and back - it's only ever wiped
// by this explicit action or by the underlying process restarting - so a visible way to wipe it
// matters more than it used to.
//
// An empty console collapses to one line instead of holding its full height. Two of these sit on
// Vorschau & Build, and at full height a freshly opened page was two 288px rectangles of black
// nothing that pushed the build card entirely below the fold - measured in the running app.
export function LogConsole({ lines, onClear }: { lines: LogLine[]; onClear?: () => void }): JSX.Element {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight })
  }, [lines.length])

  if (lines.length === 0) {
    return (
      <div className="rounded-md bg-slate-950 px-3 py-2 font-mono text-xs text-slate-500">{t('logConsole.noOutput')}</div>
    )
  }

  return (
    <div>
      {onClear && (
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
        {lines.map((line, idx) => (
          <div key={idx} className={line.stream === 'stderr' ? 'text-red-400' : undefined}>
            {line.text.replace(/\n+$/, '')}
          </div>
        ))}
      </div>
    </div>
  )
}
