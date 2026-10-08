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

export function variantOf(options: Record<string, unknown> | undefined): NavVariant {
  const v = options?.variant
  return NAV_VARIANTS.some((x) => x.value === v) ? (v as NavVariant) : 'tree'
}

// Where the plugin draws its collapsible folders (variantCollapsible in src/components/render.tsx,
// quartz-navigations 0.4.1) and which of those it treats as popups (POPUP_VARIANTS there).
const COLLAPSIBLE = new Set<NavVariant>(['accordion', 'flyout', 'dropdown', 'mega'])
const POPUP = new Set<NavVariant>(['dropdown', 'mega', 'flyout'])
// These two are rendered by their own functions (renderSelect, renderPager) that never look at
// folder rows or at `mobile` - Navigation.tsx returns before renderNavigation.
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
  // A folder that folds only below the mobile breakpoint (renderItem's `byMobile`).
  const mobileFolds = !own && mobile === 'accordion'
  switch (key) {
    case 'mobile':
      return own
    // Only drawn inside a collapsible folder row.
    case 'chevrons':
    case 'exclusive':
      return !COLLAPSIBLE.has(variant) && !mobileFolds
    // A folder that folds only on mobile always uses the split row, so this asks the variant.
    case 'folderClick':
      return !COLLAPSIBLE.has(variant)
    // `open = !popup && (folderDefaultState === 'open' || expandActive && onTrail)`.
    case 'folderDefaultState':
    case 'expandActive':
      return variant !== 'accordion' && !mobileFolds
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
