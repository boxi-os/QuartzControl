import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { PluginSource } from '@shared/ipc-contract'
import { Button, Field, SegmentedControl, TextInput } from '../../components/ui'
import { useStickyState } from '../../state/uiState'
import { useIpcQuery } from '../../state/useIpcQuery'
import { DraftInput } from './DraftInput'
import { NoEffect } from './NoEffect'
import { isNewerVersion } from '@shared/semver'
import { FORMS_TEXTS_SINCE, RELAY_OWN_WORDS, entryKey, isObject, primary } from './formsOptions'

type Options = Record<string, unknown>

/**
 * The Texte section: every text of quartz-forms in one site language, with the plugin's wording
 * as the placeholder and the site's own (`options.texts`) as the value. Before, the section was
 * the generic record editor - an empty list and "Schlüssel anlegen", with nothing to say which
 * keys there are or what they read (user, 2026-10-20). The wording comes from the installed
 * plugin (`dist/cli.js texts`), not from a copy; while it cannot be read, `fallback` (that record
 * editor) stands in, with the reason above it.
 */
export function FormsTexts({
  projectPath,
  source,
  options,
  languages,
  installed,
  onOptions,
  fallback
}: {
  projectPath: string
  source: PluginSource
  /** The installed quartz-forms (its package.json); undefined while unknown. */
  installed: string | undefined
  options: Options
  /** The site's language codes (siteLanguages). */
  languages: string[]
  onOptions: (next: Options | undefined) => void
  fallback: ReactNode
}): JSX.Element {
  const { t, i18n } = useTranslation()
  const sourceKey = JSON.stringify(source)
  // A plugin before the command answers "unbekannter Befehl", and the section says which version
  // brings the texts instead. Asked all the same: a git checkout between two releases carries the
  // older number and has the command, and was given the old section (review 2026-10-28,
  // Nebenbei). Until it answers, the older plugin's section stands.
  const older = installed !== undefined && isNewerVersion(FORMS_TEXTS_SINCE, installed)
  const query = useIpcQuery(() => window.quartzGui.forms.texts({ projectPath, source }), [projectPath, sourceKey])
  const codes = languages.length ? languages : [i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'de']
  const [picked, setPicked] = useStickyState<string>('forms.textsLanguage', codes[0])
  const code = codes.includes(picked) ? picked : codes[0]
  const [search, setSearch] = useState('')

  const texts = isObject(options.texts) ? options.texts : {}
  const key = entryKey(texts, code)
  // Two entries of one language (`de` and `de-DE`, only by hand): the plugin lays the one named
  // exactly as a page's language over the other, and a page's language is its `lang`, else the
  // site's locale - so which one a page shows is not this tab's to know, and it says so instead
  // (review 2026-10-28, N5: the section wrote `de`, the site showed `de-DE`).
  const sameLanguage = Object.keys(texts).filter((k) => primary(k) === primary(code))
  const own = isObject(texts[key]) ? (texts[key] as Options) : {}
  const result = query.data

  const plugin = useMemo(() => {
    if (result?.state !== 'read') return null
    // The plugin's own lookup: a locale of the same primary subtag, else en-US.
    const locale = Object.keys(result.locales).find((l) => primary(l) === primary(code)) ?? 'en-US'
    return { locale, wording: result.locales[locale] ?? Object.values(result.locales)[0] ?? {}, own: Object.keys(result.locales).some((l) => primary(l) === primary(code)) }
  }, [result, code])

  if (older && !plugin) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-ui text-amber-700 dark:text-amber-400">{t('formsEditor.textList.older', { since: FORMS_TEXTS_SINCE, installed })}</p>
        {fallback}
      </div>
    )
  }
  if (query.error || result?.state === 'unavailable') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-ui text-amber-700 dark:text-amber-400">{t('formsEditor.textList.unavailable', { reason: query.error ?? (result?.state === 'unavailable' ? result.reason : '') })}</p>
        {fallback}
      </div>
    )
  }
  if (!plugin) return <p className="text-micro text-text-muted">{t('formsEditor.textList.reading')}</p>

  // Written as typed: the plugin takes any string, and some of its own carry the spaces at their
  // edges (orWord " oder "), which a trim took away - and an emptied own text is an empty text,
  // not the plugin's (review 2026-10-28, N4). `undefined` takes the own text back.
  const setText = (name: string, value: string | undefined): void => {
    const all: Options = { ...texts }
    const entry: Options = { ...own }
    if (value !== undefined) entry[name] = value
    else delete entry[name]
    if (Object.keys(entry).length) all[key] = entry
    else delete all[key]
    const next: Options = { ...options }
    // An emptied list stays where it stood (`texts: {}`), and is not written where it did not.
    if (Object.keys(all).length || isObject(options.texts)) next.texts = all
    else delete next.texts
    onOptions(Object.keys(next).length ? next : undefined)
  }

  const names = [...Object.keys(plugin.wording), ...Object.keys(own).filter((n) => !(n in plugin.wording))]
  const needle = search.trim().toLowerCase()
  const shown = needle
    ? names.filter((n) => [n, plugin.wording[n] ?? '', typeof own[n] === 'string' ? (own[n] as string) : ''].some((s) => s.toLowerCase().includes(needle)))
    : names
  const ownCount = Object.keys(own).length

  return (
    <div className="flex flex-col gap-3">
      {codes.length > 1 && (
        <SegmentedControl label={t('formsEditor.textList.language')} value={code} onChange={setPicked} options={codes.map((c) => ({ value: c, label: c.toUpperCase() }))} />
      )}
      <p className="text-micro text-text-muted">
        {t('formsEditor.textList.hint')} {ownCount ? t('formsEditor.ownTexts', { count: ownCount }) : ''}
      </p>
      {!plugin.own && <p className="text-micro text-text-muted">{t('formsEditor.textList.fallbackLocale', { code, locale: plugin.locale })}</p>}
      {sameLanguage.length > 1 && (
        <p className="text-micro text-amber-700 dark:text-amber-400">{t('formsEditor.textList.severalEntries', { keys: sameLanguage.join(', '), key })}</p>
      )}
      <TextInput type="search" value={search} placeholder={t('formsEditor.textList.search')} aria-label={t('formsEditor.textList.search')} onChange={(e) => setSearch(e.target.value)} />
      {shown.length === 0 ? (
        <p className="text-micro text-text-muted">{t('formsEditor.textList.noMatch')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {shown.map((name) => (
            <div key={`${key}:${name}`} className="flex flex-col gap-1">
              <div className="flex items-end gap-2">
                <Field label={name} configKey hint={RELAY_OWN_WORDS.has(name) ? t('formsEditor.textList.relayOwnWords') : undefined} className="min-w-0 flex-1">
                  <DraftInput
                    value={typeof own[name] === 'string' ? (own[name] as string) : ''}
                    placeholder={own[name] === '' ? t('formsEditor.textList.empty') : plugin.wording[name]}
                    onCommit={(v) => setText(name, v)}
                  />
                </Field>
                {name in own && (
                  <Button variant="ghost" onClick={() => setText(name, undefined)} title={t('formsEditor.textList.resetHint', { name })}>
                    {t('formsEditor.textList.reset')}
                  </Button>
                )}
              </div>
              {!(name in plugin.wording) && <NoEffect reason={t('formsEditor.textList.unknown')} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
