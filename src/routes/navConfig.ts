import {
  Archive,
  Blocks,
  GitBranch,
  LayoutDashboard,
  LayoutGrid,
  Paintbrush,
  Palette,
  PackageOpen,
  RefreshCw,
  Rocket,
  Server,
  Settings2,
  SlidersHorizontal,
  CloudUpload,
  Wrench,
  type LucideIcon
} from 'lucide-react'

// Single source of truth for "which icon means this area", shared by the sidebar nav (ProjectLayout)
// and each route's own <PageHeader icon={...}> - so the icon next to "Konfiguration" in the sidebar
// is always the same one shown above the Konfiguration page itself. One entry per sidebar item,
// not per screen: a page's sub-tabs (Konfiguration's Content-Ordner/Übersetzungen, Plugins'
// Marktplatz) share their page's icon, since the header above them is the page's header.
export const TAB_ICONS = {
  overview: LayoutDashboard,
  config: SlidersHorizontal,
  layout: LayoutGrid,
  styles: Paintbrush,
  templates: PackageOpen,
  plugins: Blocks,
  updates: RefreshCw,
  server: Server,
  sync: GitBranch,
  backups: Archive,
  publish: CloudUpload
} satisfies Record<string, LucideIcon>

export type TabKey = keyof typeof TAB_ICONS

export const GROUP_ICONS = {
  setup: Settings2,
  design: Palette,
  publish: Rocket,
  maintenance: Wrench
} satisfies Record<string, LucideIcon>
