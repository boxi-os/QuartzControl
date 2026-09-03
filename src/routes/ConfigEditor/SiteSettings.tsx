import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { QuartzConfig } from '@shared/ipc-contract'
import { useProject } from '../ProjectLayout'
import { Field, Select, TextInput, Toggle } from '../../components/ui'

type Configuration = QuartzConfig['configuration']

/**
 * The analytics providers Quartz actually understands, with the fields each of them reads.
 *
 * Straight from the `Analytics` union in the project's own `quartz/cfg.ts` - there is no schema
 * file to read this from at runtime, and the union is what the emitter switches on. A provider
 * whose required field is empty emits a script tag that cannot work, so those are marked and the
 * form says which one is missing rather than saving a half-configured provider silently.
 */
interface AnalyticsField {
  key: string
  required?: boolean
}

const ANALYTICS_PROVIDERS: Record<string, AnalyticsField[]> = {
  plausible: [{ key: 'host' }],
  google: [{ key: 'tagId', required: true }],
  umami: [{ key: 'websiteId', required: true }, { key: 'host' }],
  goatcounter: [{ key: 'websiteId', required: true }, { key: 'host' }, { key: 'scriptSrc' }],
  posthog: [{ key: 'apiKey', required: true }, { key: 'host' }],
  tinylytics: [{ key: 'siteId', required: true }],
  cabin: [{ key: 'host' }],
  clarity: [{ key: 'projectId' }],
  matomo: [{ key: 'host', required: true }, { key: 'siteId', required: true }],
  vercel: [],
  rybbit: [{ key: 'siteId', required: true }, { key: 'host' }]
}

export default function SiteSettings({
  configuration,
  onChange,
  image
}: {
  configuration: Configuration
  onChange: (next: Configuration) => void
  /** The project's picture - a file, not a config value, so it is passed in rather than read
   *  here. It leads the form because it is what the site is called *and* looks like. */
  image: ReactNode
}): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  // The valid values are exactly the locale files in the project, which the Übersetzungen tab
  // already lists. Typing one by hand was a build failure waiting to happen: quartz's own
  // `i18n()` is a plain lookup with no fallback for a wrong key, and a real build of a project
  // with `locale: de-DEE` died in an emitter with "Cannot read properties of undefined (reading
  // 'pages')" - an error that names neither the locale nor the setting.
  const [locales, setLocales] = useState<string[] | null>(null)

  useEffect(() => {
    window.quartzGui.localization
      .list(project.path)
      .then((list) => setLocales(list.map((l) => l.code)))
      .catch(() => setLocales([]))
  }, [project.path])

  function set(key: string, value: unknown): void {
    onChange({ ...configuration, [key]: value })
  }

  const locale = typeof configuration.locale === 'string' ? configuration.locale : ''
  // A locale the project does not ship stays selectable rather than silently reading as blank -
  // it is what the file says, and losing it on the next save would be worse than showing it.
  const localeOptions = locales === null || locales.length === 0 ? [] : [...new Set([...locales, locale].filter(Boolean))].sort()

  // A form's fields don't get better by being stretched, so extra window width buys columns
  // instead: single-column when there isn't room, two from a laptop screen up, three on a wide
  // one. Each field's line length is capped by its grid track, not by a wrapper max-width.
  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {image}
      <Field label={t('siteSettings.pageTitle')} hint={t('siteSettings.pageTitleHint')}>
        <TextInput value={configuration.pageTitle ?? ''} onChange={(e) => set('pageTitle', e.target.value)} />
      </Field>
      <Field label={t('siteSettings.pageTitleSuffix')} hint={t('siteSettings.pageTitleSuffixHint')}>
        <TextInput value={configuration.pageTitleSuffix ?? ''} onChange={(e) => set('pageTitleSuffix', e.target.value)} />
      </Field>
      <Field label={t('siteSettings.baseUrl')} hint={t('siteSettings.baseUrlHint')}>
        <TextInput
          value={configuration.baseUrl ?? ''}
          onChange={(e) => set('baseUrl', e.target.value)}
          placeholder="example.com"
        />
      </Field>
      <Field label={t('siteSettings.locale')} hint={t(localeOptions.length > 0 ? 'siteSettings.localeHint' : 'siteSettings.localeHintFree')}>
        {localeOptions.length > 0 ? (
          <Select value={locale} onChange={(e) => set('locale', e.target.value)}>
            {localeOptions.map((code) => (
              <option key={code} value={code}>
                {code}
                {locales?.includes(code) ? '' : ` ${t('siteSettings.localeUnknownSuffix')}`}
              </option>
            ))}
          </Select>
        ) : (
          <TextInput value={locale} onChange={(e) => set('locale', e.target.value)} placeholder="en-US" />
        )}
      </Field>
      {/* Two switches whose labels are terms of art. They sit one under the other rather than
          side by side now, because each carries a line saying what it does. */}
      <div className="flex flex-col justify-end gap-3 pb-1.5">
        <Toggle
          label={t('siteSettings.spa')}
          hint={t('siteSettings.spaHint')}
          checked={configuration.enableSPA ?? false}
          onChange={(checked) => set('enableSPA', checked)}
        />
        <Toggle
          label={t('siteSettings.popovers')}
          hint={t('siteSettings.popoversHint')}
          checked={configuration.enablePopovers ?? false}
          onChange={(checked) => set('enablePopovers', checked)}
        />
      </div>
      {/* Two tracks, never all three: this is a short list of one-word patterns, and a 1600px
          wide text area for it looks broken rather than generous. */}
      <Field label={t('siteSettings.ignorePatterns')} hint={t('siteSettings.ignorePatternsHint')} className="md:col-span-2">
        <textarea
          className="min-h-32 rounded-[7px] border border-black/10 bg-white px-2.5 py-1.5 font-mono text-[13px] shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
          value={(configuration.ignorePatterns ?? []).join('\n')}
          onChange={(e) =>
            set(
              'ignorePatterns',
              e.target.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
            )
          }
        />
      </Field>

      <Analytics value={configuration.analytics ?? null} onChange={(next) => set('analytics', next)} />
    </div>
  )
}

function Analytics({
  value,
  onChange
}: {
  value: Record<string, unknown> | null
  onChange: (next: Record<string, unknown> | null) => void
}): JSX.Element {
  const { t } = useTranslation()
  const provider = typeof value?.provider === 'string' ? value.provider : ''
  const fields = ANALYTICS_PROVIDERS[provider] ?? []

  // Switching provider drops the previous one's keys instead of merging them: the config is a
  // union, and leaving a `tagId` behind on a plausible entry writes a shape quartz never reads.
  function selectProvider(next: string): void {
    onChange(next === '' ? null : { provider: next })
  }

  const missing = fields.filter((f) => f.required && !String(value?.[f.key] ?? '').trim()).map((f) => f.key)

  return (
    <div className="md:col-span-2 2xl:col-span-3">
      <div className="rounded-lg border border-black/[0.06] p-4 dark:border-white/10">
        <h3 className="text-sm font-semibold">{t('siteSettings.analyticsHeading')}</h3>
        <p className="mb-3 mt-0.5 max-w-3xl text-xs text-slate-500 dark:text-slate-400">
          {t('siteSettings.analyticsDescription')}
        </p>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <Field label={t('siteSettings.analyticsProvider')}>
            <Select value={provider} onChange={(e) => selectProvider(e.target.value)}>
              <option value="">{t('siteSettings.analyticsNone')}</option>
              {Object.keys(ANALYTICS_PROVIDERS).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </Select>
          </Field>
          {fields.map((field) => (
            <Field
              key={field.key}
              label={`${field.key}${field.required ? ' *' : ''}`}
              // `host` is the one key whose meaning flips with the provider: optional everywhere
              // else, it is the address of your own installation for matomo, where the generic
              // "leave it empty" hint would contradict the asterisk next to the label.
              hint={t(`siteSettings.analyticsFields.${field.key === 'host' && field.required ? 'hostRequired' : field.key}`, '')}
            >
              <TextInput
                value={String(value?.[field.key] ?? '')}
                onChange={(e) => {
                  const next = { ...(value ?? {}), [field.key]: e.target.value }
                  // An emptied optional field is removed rather than written as "", which quartz
                  // would treat as a configured host and put into the script URL.
                  if (e.target.value.trim() === '') delete next[field.key]
                  onChange(next)
                }}
              />
            </Field>
          ))}
        </div>
        {provider !== '' && missing.length > 0 && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
            {t('siteSettings.analyticsMissing', { fields: missing.join(', ') })}
          </p>
        )}
      </div>
    </div>
  )
}
