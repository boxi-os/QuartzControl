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
export const NAVIGATIONS_READ_AGAINST = '0.4.2'

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
// The top-row variants whose root carries `quartz-nav--align-*` (ROW_VARIANTS there).
const ROW = new Set<NavVariant>(['bar', 'dropdown', 'mega', 'tabs'])
// These two are rendered by their own functions (renderSelect, renderPager) that never look at
// folder rows - Navigation.tsx returns before renderNavigation. `mobile` still reaches them as the
// root class `quartz-nav--mobile-<value>`, and `hidden` hides them below the breakpoint.
const OWN_RENDERER = new Set<NavVariant>(['select', 'pager'])

/**
 * Whether an option does nothing with this variant and mobile setting - read from the plugin's
 * rendering code, not from its README, and only for the options where the code says so plainly.
 * Everything not listed here counts as having an effect. Where the schema's own `x-quartz-when`
 * says the same (align, trigger, the per-variant objects), this answers first: it names the
 * variants, the condition only the values.
 *
 * Such an option is not hidden: it stays in its group, greyed, with the variants it works with
 * under it - and an option of the variant section (VARIANT_KEYS) that does nothing is shown only
 * while set.
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
    // Only drawn inside a collapsible folder row, and a split row draws one anyway. A folder that
    // folds only on mobile is a split row only where it has a link target (`folderLink: none`
    // leaves it without), so there chevrons decides - folderClick is never read for it.
    case 'chevrons':
      return !COLLAPSIBLE.has(variant) && !mobileFolds
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
    // rootClass and rootData read these for their own variants only.
    case 'align':
      return !ROW.has(variant)
    case 'trigger':
      return !POPUP.has(variant)
    case 'tabs':
    case 'flyout':
    case 'pager':
      return variant !== key
    // Resolved, then read by nothing: the README calls it reserved, the layout is an auto-fit grid.
    case 'columns':
      return true
    // The jump menu's options are text, without the icons of a row.
    case 'icons':
    case 'nodeIcons':
      return variant === 'select'
    // homeEntry is left out of the tabs, and the two own renderers never call it.
    case 'showHome':
      return variant === 'tabs' || own
    // Only renderNavigation draws the scope root and a folder's index entry.
    case 'showScopeRoot':
    case 'indexEntry':
      return own
    default:
      return false
  }
}

/**
 * The options that belong to a variant rather than to every navigation - the section under the
 * tiles. Which of them a variant reads is hasNoEffect's answer; this is only the list.
 */
export const VARIANT_KEYS = new Set([
  'align',
  'trigger',
  'chevrons',
  'folderClick',
  'folderDefaultState',
  'expandActive',
  'exclusive',
  'persistState',
  'tabs',
  'flyout',
  'select',
  'columns',
  'pager'
])

/** The plugin's values of `mobile`, in the order of its schema. */
export const MOBILE_VALUES = ['same', 'accordion', 'offcanvas', 'select', 'hidden'] as const

/**
 * Why an option does nothing with this variant and mobile setting, as the two things a sentence
 * needs: the variants it does work with (on the desktop), and the mobile settings with which it
 * would work for this variant. null: it works. Both empty: the plugin reads it nowhere.
 */
export function noEffectReason(key: string, variant: NavVariant, mobile: unknown): { variants: NavVariant[]; mobile: string[] } | null {
  if (!hasNoEffect(key, variant, mobile)) return null
  return {
    variants: NAV_VARIANTS.map((v) => v.value).filter((v) => !hasNoEffect(key, v, 'same')),
    mobile: MOBILE_VALUES.filter((m) => m !== 'same' && !hasNoEffect(key, variant, m))
  }
}
