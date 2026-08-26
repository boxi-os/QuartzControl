import type { QuartzConfig } from '@shared/ipc-contract'
import { FONTS_PLUGIN_SOURCE, THEME_PLUGIN_PREFIX } from './fontDelivery'

// Ready-made stylesheets for conflicts between plugins that this app can detect but not resolve by
// changing a setting - because the conflict is in the CSS cascade itself. Each one is written into
// the project as an ordinary file under quartz/styles/custom/, so it shows up in the editor, can be
// edited, reordered and deleted like any other stylesheet. Nothing is applied silently.
export interface CssFix {
  id: string
  fileName: string
  /** Whether this project is actually affected right now. */
  appliesTo: (config: QuartzConfig) => boolean
  /** `t` is passed in so the comment header follows the app's language. */
  content: (t: (key: string) => string) => string
}

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6]

// @quartz-community/quartz-fonts emits `h1,h2,…,h6 { font-family: … }` *unlayered*, which beats
// every @layer - including the active theme's - and, because its stylesheet is linked after
// custom.scss, also beats an equally specific rule of your own. Measured in a real build: headings
// rendered Schibsted Grotesk while everything else used the theme's Instrument, and neither a
// `--headerFont` override nor a plain `h1 { … }` in custom.scss changed it.
//
// `body h1` is one step more specific, so it wins regardless of load order (verified). Pointing it
// at the variables rather than at a fixed family keeps the Variablen tab in control: with the fix
// in place, h1 followed the theme's own --h1-font (Getai) and h2 fell back to --headerFont.
export const HEADING_FONT_FIX: CssFix = {
  id: 'heading-fonts',
  fileName: 'fix-heading-fonts.scss',
  appliesTo: (config) =>
    config.plugins.some((p) => p.enabled && p.source === FONTS_PLUGIN_SOURCE) &&
    config.plugins.some(
      (p) => p.enabled && typeof p.source === 'string' && p.source.startsWith(THEME_PLUGIN_PREFIX)
    ),
  content: (t) =>
    [
      // The keys are namespaced by the fix id, so a new fix only has to add its own block.
      `// ${t('styles.fixes.heading-fonts.title')}`,
      '//',
      ...t('styles.fixes.heading-fonts.comment').split('\n').map((line) => `// ${line}`),
      '',
      ...HEADING_LEVELS.map((level) => `body h${level} { font-family: var(--h${level}-font, var(--headerFont)); }`),
      ''
    ].join('\n')
}

export const CSS_FIXES: CssFix[] = [HEADING_FONT_FIX]
