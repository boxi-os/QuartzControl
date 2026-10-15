import type { TFunction } from 'i18next'
import type { OptionField, PluginEntry, PluginOptionSchemaResult } from '@shared/ipc-contract'
import { quartzPluginName } from '@shared/quartzPluginName'
import type { RootExtras } from '../../components/PluginOptionsForm/editors'
import { enumLabel, type FormLanguage } from '../../components/PluginOptionsForm/text'
import { NAVIGATIONS_PLUGIN, NAV_VARIANTS, VARIANT_KEYS, hasNoEffect, noEffectReason, variantOf, type NavVariant } from './navigationVariants'
import { LAYOUT_BOX_PLUGIN, boxContentKind, nullBreaks, withoutNulls } from './layoutBoxes'

// What the form adds for the two plugins whose editors know more than the schema says, in one
// place: the plugins page (Navigations.tsx, ExtraContent.tsx) and the layout board's inspector
// (ComponentOptions.tsx) build the same form from it, so a navigation looks the same in both.

/**
 * quartz-navigations: the variant's own options first, under its name, then the groups every
 * variant shares - the same titles and the same fields whichever variant is chosen. What does
 * nothing with this variant stays where it stands, greyed, with the variants it works with.
 * `withVariant`: the variant itself leads the section (the inspector has no tiles above it).
 */
export function navigationRoot(
  options: Record<string, unknown>,
  fields: readonly OptionField[],
  t: TFunction,
  lang: FormLanguage,
  withVariant = false
): RootExtras {
  const variant = variantOf(options)
  const mobileField = fields.find((f) => f.key === 'mobile')
  const name = (v: NavVariant): string => t(`navigationsEditor.variants.${v}.label`)
  const quote = (s: string): string => (lang === 'en' ? `“${s}”` : `„${s}“`)
  // The section is the variant's - and what the smartphone setting adds to it: Tree with mobile
  // Accordion folds on smartphones, so exclusive and its kin work there and stand in the section.
  // Said once at its head, or the section changed under a tile nobody touched.
  const byMobile = [...VARIANT_KEYS].some((k) => hasNoEffect(k, variant, 'same') && !hasNoEffect(k, variant, options.mobile))
  return {
    inactiveReason: (key) => {
      const why = noEffectReason(key, variant, options.mobile)
      if (!why) return null
      const parts: string[] = []
      // Whichever list is shorter: "only with Accordion" for a variant's own option, "not with
      // Jump menu" for one nearly every variant shares - nine names to read for the one missing.
      const without = NAV_VARIANTS.map((v) => v.value).filter((v) => !why.variants.includes(v))
      if (why.variants.length > 0)
        parts.push(
          without.length < why.variants.length
            ? t('navigationsEditor.notWith', { variants: without.map(name).join(', ') })
            : t('navigationsEditor.onlyWith', { variants: why.variants.map(name).join(', ') })
        )
      if (why.mobile.length > 0)
        parts.push(t('navigationsEditor.withMobile', { variant: name(variant), mobile: why.mobile.map((m) => quote(enumLabel(mobileField, m, lang))).join(', ') }))
      return parts.length > 0 ? parts.join(' ') : t('navigationsEditor.readNowhere')
    },
    hideUnlessSet: (key) => VARIANT_KEYS.has(key),
    lead: {
      has: (key) => VARIANT_KEYS.has(key) || (withVariant && key === 'variant'),
      title: t('navigationsEditor.leadTitle', { variant: name(variant) }),
      empty: t('navigationsEditor.leadEmpty'),
      note: byMobile ? t('navigationsEditor.leadByMobile', { mobile: quote(enumLabel(mobileField, String(options.mobile), lang)) }) : undefined
    }
  }
}

// What the tiles "Text | File" switch: the section under them (layout-box's group Content).
const CONTENT_KEYS = new Set(['html', 'file', 'dir', 'placeholders'])

/**
 * Whether a content option does nothing: while text is set, `file` and the folder it is read from
 * - the only pair in this plugin where one silences the other. An `html:` left empty is no text:
 * since 0.4.1 it does nothing either, before that it is the error and stays in sight.
 */
export function boxSilenced(options: Record<string, unknown>, installed: string | undefined): (key: string) => boolean {
  const kind = boxContentKind(options)
  const emptyHtmlBreaks = options.html === null && nullBreaks(installed)
  return (key) => (kind === 'html' ? key === 'file' || key === 'dir' : key === 'html' && options.html === null && !emptyHtmlBreaks)
}

/**
 * quartz-layout-box: the content first, under the kind it is, then the groups both kinds share.
 * `withTiles: false` (inspector, plugin list): no "Text | File" above, so the text field stands in
 * the section too, and a title naming one kind would sit over the field of the other.
 */
export function layoutBoxRoot(options: Record<string, unknown>, installed: string | undefined, t: TFunction, withTiles = true): RootExtras {
  const kind = boxContentKind(options)
  const silenced = boxSilenced(options, installed)
  return {
    inactiveReason: (key) => (!silenced(key) ? null : kind === 'html' ? t('extraContent.silencedByText') : t('extraContent.silencedEmpty')),
    hideUnlessSet: (key) => key === 'file' || key === 'dir' || key === 'html',
    lead: {
      has: (key) => CONTENT_KEYS.has(key),
      title: !withTiles ? t('extraContent.leadContent') : kind === 'html' ? t('extraContent.leadText') : t('extraContent.leadFile'),
      empty: ''
    },
    // In a language entry: the entry laid over the box, nulls leaving the value above (since
    // 0.4.1, mergedVariants) - text there, from the entry or from above, silences file and dir.
    entryReason: (key, entry, above) =>
      (key === 'file' || key === 'dir') && boxContentKind({ ...withoutNulls(above), ...withoutNulls(entry) }) === 'html' ? t('extraContent.silencedByText') : null
  }
}

/**
 * The extras for a form without tiles above it - the layout board's inspector and the plugin
 * list. Both show every option of the entry, the variant (or the text) included, and grey what
 * does nothing the way the two pages do: an option said one thing about itself here and another
 * there (review of 2026-10-15).
 */
export function rootWithoutTiles(plugin: PluginEntry, data: PluginOptionSchemaResult | null, t: TFunction, lang: FormLanguage): RootExtras | undefined {
  const options = plugin.options ?? {}
  const name = quartzPluginName(plugin.source)
  if (name === NAVIGATIONS_PLUGIN) return navigationRoot(options, data?.schema?.fields ?? [], t, lang, true)
  if (name === LAYOUT_BOX_PLUGIN) return layoutBoxRoot(options, data?.packageVersion, t, false)
  return undefined
}
