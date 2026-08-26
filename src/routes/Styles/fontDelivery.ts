import type { QuartzConfig } from '@shared/ipc-contract'

// Two independent mechanisms can load webfonts, and in a project that has the plugin the *plugin*
// is usually the one doing it - which is why "theme.fontOrigin: local" alone says nothing about
// whether the site calls Google. All of this was read from the real sources and confirmed against
// a build:
//
//  - Quartz core (`configuration.theme`, quartz/components/Head.tsx + plugins/emitters/
//    componentResources.ts): `fontOrigin: "googleFonts"` with `cdnCaching: true` links to
//    fonts.googleapis.com; with `cdnCaching: false` it downloads the files at build time and
//    rewrites them to <baseUrl>/static/fonts. `fontOrigin: "local"` emits nothing at all - its
//    branch is a comment reading "let the user do it themselves in css".
//  - The plugin `@quartz-community/quartz-fonts` has its *own* `fontOrigin` option with a
//    different vocabulary: `"googleFonts"` (its default, so an entry with no options set does
//    call Google) or `"selfHosted"`, which downloads the files and emits
//    static/fonts/quartz-fonts.css. Verified: a build with `selfHosted` contains no
//    fonts.googleapis.com reference at all and ships the .ttf files itself.
//  - A community theme is a third source and the one that is easiest to miss: `@quartz-themes/core`
//    emits @font-face rules for the theme's own fonts pointing at a hardcoded
//    `FONT_CDN_BASE = "https://unpkg.com"`, so an active theme means third-party requests on every
//    page view no matter what the two settings above say. Its only off switch is the plugin option
//    `themeFonts: false`, which drops the theme's fonts entirely rather than localising them -
//    verified: with it the built output contains no unpkg.com reference, without it 22.
export const FONTS_PLUGIN_SOURCE = '@quartz-community/quartz-fonts'
export const THEME_PLUGIN_PREFIX = '@quartz-themes/'

export type FontLoaderMode = 'google' | 'selfHosted' | 'cdn'

export interface FontLoader {
  via: 'core' | 'plugin' | 'theme'
  mode: FontLoaderMode
}

function fontsPluginIndex(config: QuartzConfig): number {
  return config.plugins.findIndex((p) => p.enabled && p.source === FONTS_PLUGIN_SOURCE)
}

/** Everything that will actually fetch a webfont for this site. Empty means: nothing does. */
export function fontLoaders(config: QuartzConfig): FontLoader[] {
  const loaders: FontLoader[] = []
  const theme = config.theme as { fontOrigin?: unknown; cdnCaching?: unknown }
  const coreOrigin = typeof theme.fontOrigin === 'string' ? theme.fontOrigin : 'googleFonts'
  if (coreOrigin === 'googleFonts') {
    loaders.push({ via: 'core', mode: theme.cdnCaching === false ? 'selfHosted' : 'google' })
  }

  const index = fontsPluginIndex(config)
  if (index !== -1) {
    const origin = config.plugins[index].options?.fontOrigin
    loaders.push({ via: 'plugin', mode: origin === 'selfHosted' ? 'selfHosted' : 'google' })
  }

  if (themeFontsIndex(config) !== -1) loaders.push({ via: 'theme', mode: 'cdn' })
  return loaders
}

// The theme plugin, but only while it is actually emitting its font CSS.
function themeFontsIndex(config: QuartzConfig): number {
  return config.plugins.findIndex(
    (p) =>
      p.enabled &&
      typeof p.source === 'string' &&
      p.source.startsWith(THEME_PLUGIN_PREFIX) &&
      p.options?.themeFonts !== false
  )
}

export function themeFontsEnabled(config: QuartzConfig): boolean {
  return themeFontsIndex(config) !== -1
}

/**
 * Turns the theme's own fonts off or on. Deliberately *not* part of the self-hosting switch: there
 * is no localising option here, so the only way to stop the unpkg requests is to drop the fonts,
 * which changes how the site looks. That is a separate decision and gets a separate control.
 */
export function withThemeFonts(config: QuartzConfig, enabled: boolean): QuartzConfig {
  const index = config.plugins.findIndex(
    (p) => p.enabled && typeof p.source === 'string' && p.source.startsWith(THEME_PLUGIN_PREFIX)
  )
  if (index === -1) return config
  const plugins = [...config.plugins]
  const options = { ...plugins[index].options }
  if (enabled) delete options.themeFonts
  else options.themeFonts = false
  plugins[index] = { ...plugins[index], options }
  return { ...config, plugins }
}

export function callsGoogle(config: QuartzConfig): boolean {
  return fontLoaders(config).some((l) => l.mode === 'google')
}

/**
 * Flips every loader to its self-hosted equivalent, or back. Each mechanism has its own spelling
 * for the same idea, so both are written: the plugin's `options.fontOrigin`, and core's
 * `cdnCaching` (which only means anything while core's own fontOrigin is "googleFonts").
 *
 * The plugin entry is addressed by array index, not by derived name - two entries can derive the
 * same display name, and a name-based lookup would silently mutate the wrong one.
 */
export function withSelfHostedFonts(config: QuartzConfig, selfHosted: boolean): QuartzConfig {
  const theme = config.theme as { fontOrigin?: unknown }
  const nextTheme =
    theme.fontOrigin === 'googleFonts' || theme.fontOrigin === undefined
      ? { ...config.theme, cdnCaching: !selfHosted }
      : config.theme

  const index = fontsPluginIndex(config)
  if (index === -1) return { ...config, theme: nextTheme }

  const plugins = [...config.plugins]
  plugins[index] = {
    ...plugins[index],
    options: { ...plugins[index].options, fontOrigin: selfHosted ? 'selfHosted' : 'googleFonts' }
  }
  return { ...config, theme: nextTheme, plugins }
}
