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
// `label` names the console, because two of them sit on Vorschau & Build and "Konsole" twice says
// nothing about which process is talking.
export function LogConsole({ lines, label, onClear }: { lines: LogLine[]; label: string; onClear?: () => void }): JSX.Element {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const empty = lines.length === 0

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight })
  }, [lines.length])

  return (
    <div>
      {onClear && !empty && (
        <div className="mb-1 flex justify-end">
          <button type="button" onClick={onClear} className="text-xs text-slate-500 dark:text-slate-400 underline hover:text-slate-700 dark:hover:text-slate-300">
            {t('logConsole.clear')}
          </button>
        </div>
      )}
      {/* One element for both states rather than an early return, so the log region is already in
          the document when the first line arrives - a live region that appears together with its
          content is announced by nobody. role="log" is the append-only sibling of role="status":
          new lines are read, the ones already there are not read again.
          tabIndex makes the box scrollable from the keyboard, which a plain overflow div is not. */}
      <div
        ref={ref}
        role="log"
        aria-label={label}
        tabIndex={0}
        className={`overflow-y-auto rounded-md bg-slate-950 font-mono text-xs ${
          empty ? 'px-3 py-2 text-slate-400' : 'h-72 p-3 leading-relaxed text-slate-200'
        }`}
      >
        {empty
          ? t('logConsole.noOutput')
          : lines.map((line, idx) => (
              <div key={idx} className={line.stream === 'stderr' ? 'text-red-400' : undefined}>
                {line.text.replace(/\n+$/, '')}
              </div>
            ))}
      </div>
    </div>
  )
}
