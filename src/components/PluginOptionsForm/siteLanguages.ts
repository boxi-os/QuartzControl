import type { QuartzConfig } from '@shared/ipc-contract'
import { quartzPluginName } from '@shared/quartzPluginName'

// The site's language codes: quartz-multilanguage's `languages` (strings or `{ code }`) if it is in
// the config, otherwise the primary subtag of `configuration.locale`. For the keys of an option
// keyed by language, such as layout-box's byLang. Used by both places that show the form - the
// plugins page and the layout board's side panel.
export function siteLanguages(config: QuartzConfig | null): string[] {
  const entry = config?.plugins.find((p) => quartzPluginName(p.source) === 'quartz-multilanguage')
  const list = entry?.options?.languages
  const codes = Array.isArray(list)
    ? list.map((l) =>
        typeof l === 'string'
          ? l
          : l && typeof l === 'object' && typeof (l as { code?: unknown }).code === 'string'
            ? (l as { code: string }).code
            : null
      )
    : []
  const own = codes.filter((c): c is string => typeof c === 'string' && c.trim() !== '').map((c) => c.trim().toLowerCase())
  if (own.length > 0) return [...new Set(own)]
  const locale = (config?.configuration as { locale?: unknown } | undefined)?.locale
  return typeof locale === 'string' && locale ? [locale.split('-')[0].toLowerCase()] : []
}
