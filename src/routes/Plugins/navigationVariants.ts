import {
  ArrowLeftRight,
  ChevronsUpDown,
  Columns3,
  LayoutPanelTop,
  ListCollapse,
  ListTree,
  PanelRightOpen,
  PanelTop,
  RectangleEllipsis,
  SquareChevronDown,
  type LucideIcon
} from 'lucide-react'
import type { LayoutPosition } from '@shared/ipc-contract'

/** The plugin's name as the config loader derives it from github:boxi-os/quartz-navigations. */
export const NAVIGATIONS_PLUGIN = 'quartz-navigations'
/** The version whose render.tsx the tables below are read from. */
export const NAVIGATIONS_READ_AGAINST = '0.4.1'

export type NavVariant = 'tree' | 'accordion' | 'flyout' | 'bar' | 'dropdown' | 'mega' | 'tabs' | 'columns' | 'select' | 'pager'

/**
 * The ten variants in the order of the plugin's README table (vertical, horizontal, the rest), each
 * with the position a new navigation of that kind gets - where the README says it belongs ("Für
 * Sidebars", "Header und Footer", "Footer-Sitemaps", "Gehört nach afterBody").
 */
export const NAV_VARIANTS: { value: NavVariant; icon: LucideIcon; position: LayoutPosition }[] = [
  { value: 'tree', icon: ListTree, position: 'left' },
  { value: 'accordion', icon: ListCollapse, position: 'left' },
  { value: 'flyout', icon: PanelRightOpen, position: 'left' },
  { value: 'bar', icon: RectangleEllipsis, position: 'header' },
  { value: 'dropdown', icon: SquareChevronDown, position: 'header' },
  { value: 'mega', icon: LayoutPanelTop, position: 'header' },
  { value: 'tabs', icon: PanelTop, position: 'header' },
  { value: 'columns', icon: Columns3, position: 'footer' },
  { value: 'select', icon: ChevronsUpDown, position: 'left' },
  { value: 'pager', icon: ArrowLeftRight, position: 'afterBody' }
]

// The names before 0.4 (LEGACY_VARIANTS in the plugin's options.ts): still read, with a warning.
const LEGACY_VARIANTS: Record<string, NavVariant> = { vertical: 'tree', horizontal: 'bar' }

export function variantOf(options: Record<string, unknown> | undefined): NavVariant {
  const v = options?.variant
  if (typeof v === 'string' && Object.hasOwn(LEGACY_VARIANTS, v)) return LEGACY_VARIANTS[v]
  return NAV_VARIANTS.some((x) => x.value === v) ? (v as NavVariant) : 'tree'
}

// Where the plugin draws its collapsible folders (variantCollapsible in src/components/render.tsx,
// quartz-navigations 0.4.1) and which of those it treats as popups (POPUP_VARIANTS there).
const COLLAPSIBLE = new Set<NavVariant>(['accordion', 'flyout', 'dropdown', 'mega'])
const POPUP = new Set<NavVariant>(['dropdown', 'mega', 'flyout'])
// These two are rendered by their own functions (renderSelect, renderPager) that never look at
// folder rows - Navigation.tsx returns before renderNavigation. `mobile` still reaches them as the
// root class `quartz-nav--mobile-<value>`, and `hidden` hides them below the breakpoint.
const OWN_RENDERER = new Set<NavVariant>(['select', 'pager'])

/**
 * Whether an option does nothing with this variant and mobile setting - read from the plugin's
 * rendering code, not from its README, and only for the options where the code says so plainly.
 * Everything not listed here counts as having an effect. The schema's own `x-quartz-when` covers
 * align, trigger and the per-variant objects already; this is the part it does not say.
 *
 * Such an option is not hidden - the editor moves it into a folded section, so a value set there
 * stays in sight and can be reset.
 */
export function hasNoEffect(key: string, variant: NavVariant, mobile: unknown): boolean {
  const own = OWN_RENDERER.has(variant)
  // A folder that folds only below the mobile breakpoint (renderItem's `byMobile`). It is rendered
  // open, always as a split row with its chevron, and the client script decides from the viewport,
  // the trail and a remembered state - never from folderDefaultState or chevrons.
  const mobileFolds = !own && mobile === 'accordion'
  switch (key) {
    case 'mobile':
      return false
    // Only drawn inside a collapsible folder row - and a split row draws one anyway.
    case 'chevrons':
    case 'folderClick':
      return !COLLAPSIBLE.has(variant)
    // The `name` of a <details>, mobile-only ones included.
    case 'exclusive':
      return !COLLAPSIBLE.has(variant) && !mobileFolds
    // `open = !popup && (folderDefaultState === 'open' || expandActive && onTrail)`.
    case 'folderDefaultState':
      return variant !== 'accordion'
    // For a mobile-only folder the script reads expandActive only beside a remembered state
    // (trailClaimedGroups), and a popup variant remembers nothing.
    case 'expandActive':
      return variant !== 'accordion' && !(mobileFolds && !POPUP.has(variant))
    // `data-persist` is never set for a popup variant.
    case 'persistState':
      return variant !== 'accordion' && !(mobileFolds && !POPUP.has(variant))
    // renderSelect and the `mobile: select` jump menu are the only readers.
    case 'select':
      return variant !== 'select' && (own || mobile !== 'select')
    default:
      return false
  }
}
