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
export const FONTS_PLUGIN_SOURCE = '@quartz-community/quartz-fonts'

export type FontLoaderMode = 'google' | 'selfHosted'

export interface FontLoader {
  via: 'core' | 'plugin'
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
  return loaders
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
