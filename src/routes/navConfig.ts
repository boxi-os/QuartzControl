import {
  Archive,
  Blocks,
  Folder,
  FolderOpen,
  GitBranch,
  Languages,
  LayoutDashboard,
  LayoutGrid,
  Paintbrush,
  Palette,
  PackageOpen,
  Puzzle,
  RefreshCw,
  Rocket,
  Server,
  SlidersHorizontal,
  CloudUpload,
  type LucideIcon
} from 'lucide-react'

// Single source of truth for "which icon means this area", shared by the sidebar nav (ProjectLayout)
// and each route's own <PageHeader icon={...}> - so the icon next to "Konfiguration" in the sidebar
// is always the same one shown above the Konfiguration page itself.
export const TAB_ICONS = {
  overview: LayoutDashboard,
  config: SlidersHorizontal,
  layout: LayoutGrid,
  styles: Paintbrush,
  templates: PackageOpen,
  content: Folder,
  localization: Languages,
  plugins: Blocks,
  updates: RefreshCw,
  server: Server,
  sync: GitBranch,
  backups: Archive,
  publish: CloudUpload
} satisfies Record<string, LucideIcon>

export type TabKey = keyof typeof TAB_ICONS

export const GROUP_ICONS = {
  design: Palette,
  content: FolderOpen,
  plugins: Puzzle,
  publish: Rocket
} satisfies Record<string, LucideIcon>
