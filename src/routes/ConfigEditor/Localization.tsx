import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from '../ProjectLayout'
import type { LocaleEntry, LocaleFile } from '@shared/ipc-contract'
import { Badge, Button, Select, TextInput } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { useStickyState } from '../../state/uiState'

export default function Localization(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [locales, setLocales] = useState<LocaleFile[] | null>(null)
  // Selected locale, search term and - most importantly - the unsaved edits survive a trip to
  // another area (see useStickyState). Entries themselves are always re-read from disk on mount,
  // so what is shown underneath the edits is never stale.
  const [code, setCode] = useStickyState('localization.code', '')
  const [entries, setEntries] = useState<LocaleEntry[] | null>(null)
  const [edits, setEdits] = useStickyState<Record<string, string>>('localization.edits', {})
  const [errors, setErrors] = useStickyState<Record<string, string>>('localization.errors', {})
  const [query, setQuery] = useStickyState('localization.query', '')
  const [saving, setSaving] = useState(false)
  const [gitAttrOk, setGitAttrOk] = useState<boolean | null>(null)
  // The two reads this tab cannot do without: the list of locales and the entries of the open one.
  const [loadError, setLoadError] = useState<string | null>(null)
  const failed = (error: unknown): void => setLoadError(formatIpcError(error))
  const [enablingProtection, setEnablingProtection] = useState(false)

  useEffect(() => {
    window.quartzGui.localization
      .list(project.path)
      .then((list) => {
      setLocales(list)
      if (list.length > 0) {
        // `.catch` rather than nothing: this read only decides which locale is preselected, and a
        // page that cannot be read must not cost the page its list. Without it a broken
        // quartz.config.yaml left `code` unset, so the effect below never ran and the entries block
        // said "Lade…" for ever beside a locale list that had loaded fine (twenty-second review,
        // finding 2).
        window.quartzGui.config
          .get(project.path)
          .catch(() => null)
          .then((config) => {
          const configured =
            config && typeof config.configuration.locale === 'string' ? config.configuration.locale : undefined
          // Functional form on purpose: a locale the user already picked in this session wins over
          // the configured default, which is what makes coming back land on the same locale.
          setCode((prev) =>
            prev && list.some((l) => l.code === prev)
              ? prev
              : configured && list.some((l) => l.code === configured)
                ? configured
                : list[0].code
          )
        })
      }
      })
      .catch(failed)
    window.quartzGui.localization.gitAttributesStatus(project.path).then(setGitAttrOk)
  }, [project.path])

  // Edits belong to one locale, so switching locales has to drop them - but merely coming back to
  // this page must not, which is what the ref distinguishes: it starts out at whatever locale was
  // restored, so a remount counts as "unchanged" while a real switch doesn't.
  const loadedCodeRef = useRef(code)
  useEffect(() => {
    if (!code) return
    if (loadedCodeRef.current !== code) {
      setEdits({})
      setErrors({})
    }
    loadedCodeRef.current = code
    setEntries(null)
    window.quartzGui.localization.getEntries(project.path, code).then(setEntries).catch(failed)
    // setEdits/setErrors are stable state setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.path, code])

  // The service sets both halves of the protection after every successful save anyway - this is
  // for the project that has translations to protect but has not been edited from here yet, where
  // the badge otherwise only stated a problem it could have fixed itself.
  async function enableProtection(): Promise<void> {
    setEnablingProtection(true)
    try {
      await window.quartzGui.localization.ensureGitAttributes(project.path)
      setGitAttrOk(await window.quartzGui.localization.gitAttributesStatus(project.path))
    } finally {
      setEnablingProtection(false)
    }
  }

  function keyOf(path: string[]): string {
    return path.join('.')
  }

  function setEdit(path: string[], value: string): void {
    setEdits((prev) => ({ ...prev, [keyOf(path)]: value }))
  }

  const dirtyKeys = useMemo(() => {
    if (!entries) return []
    return entries
      .map((e) => keyOf(e.path))
      .filter((key, i) => edits[key] !== undefined && edits[key] !== entries![i].value)
  }, [entries, edits])

  async function saveAll(): Promise<void> {
    if (!entries) return
    setSaving(true)
    try {
      await saveDirtyEntries()
    } finally {
      setSaving(false)
    }
  }

  // Split out so saveAll's finally stays readable: a rejected save used to skip setSaving(false)
  // and leave the Save button disabled with a page full of unsaved edits.
  async function saveDirtyEntries(): Promise<void> {
    if (!entries) return
    const nextErrors: Record<string, string> = {}
    for (const entry of entries) {
      const key = keyOf(entry.path)
      if (!dirtyKeys.includes(key)) continue
      const result = await window.quartzGui.localization.saveEntry(project.path, code, entry.path, entry.kind, edits[key])
      if (!result.success) nextErrors[key] = result.error ?? t('localization.saveError')
    }
    setErrors(nextErrors)
    const fresh = await window.quartzGui.localization.getEntries(project.path, code)
    setEntries(fresh)
    setEdits((prev) => {
      const next = { ...prev }
      for (const entry of fresh) {
        const key = keyOf(entry.path)
        if (!nextErrors[key]) delete next[key]
      }
      return next
    })
    setGitAttrOk(await window.quartzGui.localization.gitAttributesStatus(project.path))
  }

  const q = query.trim().toLowerCase()
  const filtered = (entries ?? []).filter(
    (e) => !q || keyOf(e.path).toLowerCase().includes(q) || e.value.toLowerCase().includes(q)
  )

  if (loadError) {
    return (
      <div className="max-w-xl">
        <p className="mb-2 text-sm font-medium text-red-600 dark:text-red-400">{t('localization.loadFailed')}</p>
        <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {loadError}
        </pre>
      </div>
    )
  }
  if (!locales) return <p className="text-sm text-text-muted">{t('common.loading')}</p>
  if (locales.length === 0) return <p className="text-sm text-text-muted">{t('localization.none')}</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {gitAttrOk ? (
          <Badge tone="green">{t('localization.gitAttributesOk')}</Badge>
        ) : (
          <>
            <Badge tone="amber">{t('localization.gitAttributesMissing')}</Badge>
            <Button variant="ghost" onClick={enableProtection} disabled={enablingProtection}>
              {t('localization.gitAttributesEnable')}
            </Button>
          </>
        )}
        <p className="min-w-0 flex-1 text-xs text-text-muted">{t('localization.gitAttributesExplain')}</p>
      </div>

      {/* Save sits in this row rather than in the page header: the header belongs to the whole
          Konfiguration page now, and saving here means saving the locale selected right next to
          it - the two controls describe one action together. */}
      <div className="flex items-center gap-2">
        <Select value={code} onChange={(e) => setCode(e.target.value)} className="w-32">
          {locales.map((l) => (
            <option key={l.code} value={l.code}>
              {l.code}
            </option>
          ))}
        </Select>
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('localization.searchPlaceholder')}
          className="flex-1"
        />
        {dirtyKeys.length > 0 && (
          <span className="shrink-0 whitespace-nowrap text-xs text-text-muted">
            {t('localization.unsavedCount', { count: dirtyKeys.length })}
          </span>
        )}
        <Button onClick={saveAll} disabled={saving || dirtyKeys.length === 0}>
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>

      {entries === null && <p className="text-sm text-text-muted">{t('common.loading')}</p>}

      {/* Hundreds of short strings: a second column halves the scrolling. The multi-line
          "template" entries keep the full row - they're the ones that actually need the width. */}
      {entries !== null && (
        <div className="grid items-start gap-2 xl:grid-cols-2">
          {filtered.map((entry) => {
            const key = keyOf(entry.path)
            const value = edits[key] ?? entry.value
            return (
              <div
                key={key}
                className={`rounded-md border border-ink/[0.06] p-2.5 dark:border-ink/10 ${
                  entry.kind === 'template' ? 'xl:col-span-2' : ''
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-xs text-text-muted">{key}</span>
                  {entry.kind === 'template' && <Badge>{t('localization.advancedBadge')}</Badge>}
                </div>
                {entry.kind === 'string' ? (
                  <TextInput value={value} onChange={(e) => setEdit(entry.path, e.target.value)} className="w-full" />
                ) : (
                  <textarea
                    value={value}
                    onChange={(e) => setEdit(entry.path, e.target.value)}
                    rows={2}
                    className="w-full rounded-[7px] border border-ink/10 bg-surface px-2.5 py-1.5 font-mono text-[12px] text-text shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-ink/10 dark:bg-ink/5"
                  />
                )}
                {errors[key] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[key]}</p>}
              </div>
            )
          })}
          {filtered.length === 0 && <p className="text-sm text-text-muted">{t('localization.noResults')}</p>}
        </div>
      )}
    </div>
  )
}
