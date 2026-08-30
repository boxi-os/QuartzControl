import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GithubPagesInfo } from '@shared/ipc-contract'
import { Badge, Button, Card, Field, TextInput, Toggle } from '../../components/ui'
import { useAsyncAction } from '../../hooks/useAsyncAction'

// The other half of a branch deploy: pushing the build somewhere is not the same as GitHub serving
// it. Which branch Pages reads, under which domain, and whether HTTPS is enforced all live in the
// repository's settings, not in the branch - so without this card the first deploy succeeds and
// the site stays 404 until the user finds the right page on github.com.
//
// It also solves the CNAME problem the branch adapter documents: that deploy replaces the branch
// wholesale, so a hand-committed CNAME file does not survive it. A domain set through the API is
// stored by GitHub itself and does.
export default function GithubPages({ projectPath, branch }: { projectPath: string; branch: string }): JSX.Element {
  const { t } = useTranslation()
  const [info, setInfo] = useState<GithubPagesInfo | null>(null)
  // Distinguishes "not fetched yet" from "fetched and there is nothing": pagesInfo answers null
  // when the project's origin does not point at github.com at all, and without this flag that case
  // rendered as a card offering a domain field and a button that could only ever fail.
  const [loaded, setLoaded] = useState(false)
  const [cname, setCname] = useState('')
  const [httpsEnforced, setHttpsEnforced] = useState(true)
  const [result, setResult] = useState<string | null>(null)

  const load = useAsyncAction(async () => {
    const next = await window.quartzGui.github.pagesInfo(projectPath)
    setInfo(next)
    setLoaded(true)
    // Seeded from what GitHub reports, so the fields describe the live state rather than a blank
    // form that would clear the domain on the next save.
    setCname(next?.cname ?? '')
    setHttpsEnforced(next?.httpsEnforced ?? true)
  })
  const reload = load.run

  useEffect(() => {
    reload()
  }, [projectPath, reload])

  const apply = useAsyncAction(async () => {
    const applied = await window.quartzGui.github.configurePages(projectPath, {
      branch,
      cname: cname.trim() || null,
      httpsEnforced
    })
    setResult(applied.output)
    await reload()
  })

  const statusTone = useCallback((status?: string | null) => {
    if (status === 'built') return 'green' as const
    if (status === 'errored') return 'red' as const
    return 'amber' as const
  }, [])

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t('publish.pages.title')}</h2>
        <Button variant="ghost" onClick={() => reload()} disabled={load.pending}>
          {load.pending ? t('common.saving') : t('publish.pages.reload')}
        </Button>
      </div>

      {load.error && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{load.error}</p>}
      {loaded && !info && <p className="text-xs text-slate-500 dark:text-slate-400">{t('publish.pages.noGithubOrigin')}</p>}
      {info?.error && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{info.error}</p>}

      {info && !info.configured && !info.error && (
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('publish.pages.notConfigured')}</p>
      )}

      {info?.configured && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <Badge tone={statusTone(info.status)}>{t(`publish.pages.status.${info.status ?? 'unknown'}`, { defaultValue: info.status ?? '' })}</Badge>
          {info.htmlUrl && <span className="font-mono text-slate-600 dark:text-slate-300">{info.htmlUrl}</span>}
          {info.sourceBranch && (
            // Worth stating plainly: a target that pushes to gh-pages while Pages reads main
            // publishes nothing, and nothing else in the UI would reveal the mismatch.
            <Badge tone={info.sourceBranch === branch ? 'slate' : 'amber'}>
              {t('publish.pages.source', { branch: info.sourceBranch })}
            </Badge>
          )}
        </div>
      )}

      {info && (
        <>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('publish.pages.cname')}>
          <TextInput
            value={cname}
            onChange={(e) => setCname(e.target.value)}
            placeholder={t('publish.pages.cnamePlaceholder')}
            className="w-64"
          />
        </Field>
        <div className="pb-1.5">
          {/* Only a custom domain has a choice here. A *.github.io site is served over HTTPS
              unconditionally and GitHub reports https_enforced as already true, so the switch was
              offering a decision that does not exist - and flipping it off would have looked like
              it did something. It follows the field next to it, not the stored value, because the
              domain being typed is the one this Save will apply. */}
          <Toggle
            label={t('publish.pages.httpsEnforced')}
            hint={cname.trim() ? undefined : t('publish.pages.httpsOnlyWithDomain')}
            checked={httpsEnforced}
            onChange={setHttpsEnforced}
            disabled={!cname.trim()}
          />
        </div>
        <Button onClick={() => apply.run()} disabled={apply.pending} className="mb-0.5">
          {apply.pending ? t('common.saving') : t('publish.pages.apply', { branch })}
        </Button>
      </div>

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{t('publish.pages.cnameHint')}</p>
        </>
      )}

      {apply.error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{apply.error}</p>}
      {result && (
        <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-200">
          {result}
        </pre>
      )}
    </Card>
  )
}
