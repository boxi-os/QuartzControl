import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from '../ProjectLayout'
import type { LocaleEntry, LocaleFile } from '@shared/ipc-contract'
import { Badge, Button, PageHeader, Select, TextInput } from '../../components/ui'
import { TAB_ICONS } from '../navConfig'

export default function Localization(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [locales, setLocales] = useState<LocaleFile[] | null>(null)
  const [code, setCode] = useState('')
  const [entries, setEntries] = useState<LocaleEntry[] | null>(null)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [gitAttrOk, setGitAttrOk] = useState<boolean | null>(null)

  useEffect(() => {
    window.quartzGui.localization.list(project.path).then((list) => {
      setLocales(list)
      if (list.length > 0) {
        window.quartzGui.config.get(project.path).then((config) => {
          const configured = typeof config.configuration.locale === 'string' ? config.configuration.locale : undefined
          setCode(configured && list.some((l) => l.code === configured) ? configured : list[0].code)
        })
      }
    })
    window.quartzGui.localization.gitAttributesStatus(project.path).then(setGitAttrOk)
  }, [project.path])

  useEffect(() => {
    if (!code) return
    setEntries(null)
    setEdits({})
    setErrors({})
    window.quartzGui.localization.getEntries(project.path, code).then(setEntries)
  }, [project.path, code])

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

  if (!locales) return <p className="text-sm text-slate-500">{t('common.loading')}</p>
  if (locales.length === 0) return <p className="text-sm text-slate-500">{t('localization.none')}</p>

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <PageHeader
        icon={TAB_ICONS.localization}
        title={t('localization.title')}
        description={t('localization.description')}
        actions={
          <>
            {dirtyKeys.length > 0 && (
              <span className="text-xs text-slate-500 dark:text-slate-400">{t('localization.unsavedCount', { count: dirtyKeys.length })}</span>
            )}
            <Button onClick={saveAll} disabled={saving || dirtyKeys.length === 0}>
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </>
        }
      />

      <p className="text-xs text-slate-500 dark:text-slate-400">
        {gitAttrOk ? (
          <Badge tone="green">{t('localization.gitAttributesOk')}</Badge>
        ) : (
          <Badge tone="amber">{t('localization.gitAttributesMissing')}</Badge>
        )}
      </p>

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
      </div>

      {entries === null && <p className="text-sm text-slate-500">{t('common.loading')}</p>}

      {entries !== null && (
        <div className="flex flex-col gap-2">
          {filtered.map((entry) => {
            const key = keyOf(entry.path)
            const value = edits[key] ?? entry.value
            return (
              <div key={key} className="rounded-md border border-black/[0.06] p-2.5 dark:border-white/10">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{key}</span>
                  {entry.kind === 'template' && <Badge>{t('localization.advancedBadge')}</Badge>}
                </div>
                {entry.kind === 'string' ? (
                  <TextInput value={value} onChange={(e) => setEdit(entry.path, e.target.value)} className="w-full" />
                ) : (
                  <textarea
                    value={value}
                    onChange={(e) => setEdit(entry.path, e.target.value)}
                    rows={2}
                    className="w-full rounded-[7px] border border-black/10 bg-white px-2.5 py-1.5 font-mono text-[12px] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  />
                )}
                {errors[key] && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[key]}</p>}
              </div>
            )
          })}
          {filtered.length === 0 && <p className="text-sm text-slate-500">{t('localization.noResults')}</p>}
        </div>
      )}
    </div>
  )
}
