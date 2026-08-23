import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useAppStore } from '../state/store'

// An IPC rejection reaches the renderer wrapped by Electron as
//   "Error invoking remote method 'config:get': Error: ENOENT: no such file ..."
// which buries the part that actually tells the user what went wrong. Unwrap it, and keep the
// channel name in parentheses since it says which operation failed.
export function formatIpcError(reason: unknown): string {
  const raw = reason instanceof Error ? reason.message : String(reason)
  const match = /Error invoking remote method '([^']+)':\s*(?:Error:\s*)?([\s\S]*)/.exec(raw)
  if (!match) return raw
  return `${match[2].trim()} (${match[1]})`
}

// Catches what the pages don't. A rejected promise from window.quartzGui.* with no local catch
// ends up here instead of vanishing into the console.
export function installGlobalErrorHandlers(): void {
  window.addEventListener('unhandledrejection', (event) => {
    useAppStore.getState().pushError(formatIpcError(event.reason))
    // Handled as far as the user is concerned - keep it out of the devtools "Uncaught (in promise)"
    // noise, but still log it so the full stack stays available while debugging.
    console.error('[unhandledrejection]', event.reason)
    event.preventDefault()
  })
  window.addEventListener('error', (event) => {
    if (event.error) useAppStore.getState().pushError(formatIpcError(event.error))
  })
}

export function ErrorToasts(): JSX.Element | null {
  const errors = useAppStore((s) => s.errors)
  const dismissError = useAppStore((s) => s.dismissError)
  if (errors.length === 0) return null
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(28rem,calc(100vw-2rem))] flex-col gap-2">
      {errors.map((error) => (
        <div
          key={error.id}
          role="alert"
          className="pointer-events-auto flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 shadow-lg dark:border-red-500/40 dark:bg-red-950"
        >
          <span className="min-w-0 flex-1 break-words text-xs text-red-800 dark:text-red-300">{error.message}</span>
          <button
            type="button"
            onClick={() => dismissError(error.id)}
            aria-label="Schließen"
            className="shrink-0 rounded px-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

interface BoundaryState {
  message: string | null
}

// A thrown render error would otherwise blank the whole window (React unmounts the tree), which
// looks identical to a crashed app. This keeps the shell and shows what happened.
export class RouteErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { message: null }

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { message: error instanceof Error ? error.message : String(error) }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('[render error]', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.message === null) return this.props.children
    return (
      <div className="m-6 max-w-2xl rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-500/40 dark:bg-red-950">
        <p className="mb-2 text-sm font-semibold text-red-800 dark:text-red-300">Diese Ansicht konnte nicht dargestellt werden.</p>
        <pre className="whitespace-pre-wrap break-words text-xs text-red-700 dark:text-red-400">{this.state.message}</pre>
        <button
          type="button"
          onClick={() => this.setState({ message: null })}
          className="mt-3 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }
}
