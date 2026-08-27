import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ServerState } from '@shared/ipc-contract'
import { useProject } from '../routes/ProjectLayout'
import { Button } from './ui'
import { formatIpcError } from './ErrorSurface'

/**
 * Offers a dev-server restart after something was written that the running server cannot pick up.
 *
 * Editing an existing frame is exactly such a change, for two independent reasons measured against
 * a real `quartz build --serve`: the watcher never sees the file (its chokidar list comes from one
 * globby call over `**\/*.ts`, `quartz/cli/*.js`, `quartz/static/**`, `**\/*.tsx`, `**\/*.scss`,
 * `package.json` and the two config files - a frame's generated `dist/frames.js` matches none of
 * them), and even a rebuild forced by touching quartz.config.yaml still served the old CSS, because
 * `frameLoader.ts` does a bare `await import(...)` and Node caches an ESM module for the process's
 * lifetime. Only a restart helps.
 *
 * Deliberately a prompt rather than an automatic restart: a frame is saved many times while it is
 * being built, and bouncing the server on every intermediate save is worse than the stale preview.
 * The caller decides *whether* the change needs one (a brand-new frame does not - see FrameBuilder);
 * this component only decides whether there is a server to restart at all.
 */
export default function DevServerRestartHint({ show }: { show: boolean }): JSX.Element | null {
  const { t } = useTranslation()
  const project = useProject()
  const [state, setState] = useState<ServerState>('stopped')
  const [restarting, setRestarting] = useState(false)
  const [restarted, setRestarted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Subscribed for the component's whole life, not only while `show` is true: the server can be
  // started or stopped from another page while this one stays mounted, and the status event is the
  // only thing that would tell us.
  useEffect(() => {
    let cancelled = false
    window.quartzGui.server.status(project.id).then((s) => {
      if (!cancelled) setState(s.state)
    })
    const off = window.quartzGui.server.onStatus((id, s) => {
      if (id === project.id) setState(s.state)
    })
    return () => {
      cancelled = true
      off()
    }
  }, [project.id])

  // A new save is a new question - the previous answer ("restarted") must not stand for it.
  useEffect(() => {
    if (!show) {
      setRestarted(false)
      setError(null)
    }
  }, [show])

  async function restart(): Promise<void> {
    setRestarting(true)
    setError(null)
    try {
      await window.quartzGui.server.restart(project.id, project.path)
      setRestarted(true)
    } catch (err) {
      setError(formatIpcError(err))
    } finally {
      setRestarting(false)
    }
  }

  // Nothing running means nothing to say: the next `quartz build` reads the files from disk anyway.
  if (!show || (state !== 'running' && !restarting && !restarted)) return null

  if (restarted) {
    return <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('devServer.restarted')}</span>
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-amber-600 dark:text-amber-400">{t('devServer.staleHint')}</span>
      <Button variant="ghost" onClick={restart} disabled={restarting}>
        {restarting ? t('devServer.restarting') : t('devServer.restart')}
      </Button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  )
}
