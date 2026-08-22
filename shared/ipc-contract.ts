// Shared between main, preload and renderer. Keep this the single source of truth
// for IPC channel names, payload shapes and the API surface exposed on window.quartzGui.

export interface Project {
  id: string
  name: string
  path: string
  addedAt: string
  lastOpenedAt?: string
}

// The full quartz.config.yaml document. `configuration`/`theme` are kept loosely typed
// (rather than a strict interface) because unknown/future keys must round-trip untouched
// through the yaml.Document — the known fields below are just what the editor tabs bind to.
export type PluginSource = string | { repo: string; subdir?: string; ref?: string; name?: string }

export interface PluginEntry {
  name: string
  source: PluginSource
  enabled: boolean
  order?: number
  options?: Record<string, unknown>
  // plugin entries can carry other keys (e.g. `layout` for position/priority) that must
  // round-trip through save even though the editor UI doesn't surface them yet
  [key: string]: unknown
}

// Extracted from an installed plugin's compiled .d.ts (see pluginSchemaService in main) so the
// options editor can offer only the fields/values a plugin actually supports, instead of free
// text. Not available for built-in config entries - see optionsSchema() for details.
export interface PluginOptionField {
  name: string
  description?: string
  optional: boolean
  kind: 'boolean' | 'string' | 'number' | 'enum' | 'unsupported'
  enumValues?: string[]
}

// Describes whether an installed @quartz-themes/<id> theme package (used by the
// @quartz-themes/core plugin) supports Obsidian-style "Style Settings" overrides. An empty
// styleSettingsId means the theme has none (its own colors/toggles can't be overridden this way -
// see pluginSchemaService.getThemeStyleSettingsInfo for how this was verified). classSettingKeys
// are raw setting identifiers with no title/type metadata attached.
export interface ThemeStyleSettingsInfo {
  styleSettingsId: string[]
  classSettingKeys: string[]
}

// One entry from the @quartz-themes/* npm scope (id is the package name without the
// "@quartz-themes/" prefix, e.g. "tokyo-night" for @quartz-themes/tokyo-night). stars/topics come
// from the github.com/quartz-themes org (bulk-fetched, cached) and are commonly absent - most of
// these repos ship no topics and near-zero stars, verified by sampling several real repos.
export interface QuartzThemeListing {
  id: string
  description?: string
  stars?: number
  topics?: string[]
  githubDescription?: string
}

// Richer per-theme detail, read from the theme's own theme.json - either the locally installed
// copy (fast, no network) or fetched from jsdelivr for a theme not yet installed. Superset of
// ThemeStyleSettingsInfo; used by the catalog's on-demand detail panel before installing.
export interface ThemeDetail {
  modes: string[]
  variations: string[]
  styleSettingsId: string[]
  fonts: string[]
}

// A locally saved, reusable set of @quartz-themes/core plugin options - the "modify and save as a
// new theme" mechanism (a named preset, not a redistributable theme.json package - see
// pluginSchemaService/themeMarketplaceService for why that format can't be authored by this app).
export interface ThemePreset {
  id: string
  name: string
  createdAt: string
  baseThemeId: string
  options: {
    theme: string
    mode: string
    variation?: string
    calloutStyle?: string
    fonts?: Record<string, string>
    styleSettings?: Record<string, string | number | boolean>
  }
}

export interface QuartzConfig {
  configuration: Record<string, unknown> & {
    pageTitle?: string
    pageTitleSuffix?: string
    enableSPA?: boolean
    enablePopovers?: boolean
    locale?: string
    baseUrl?: string
    ignorePatterns?: string[]
    analytics?: Record<string, unknown> | null
  }
  theme: Record<string, unknown> & {
    fontOrigin?: string
    cdnCaching?: boolean
    typography?: Record<string, string>
    colors?: Record<string, unknown>
  }
  plugins: PluginEntry[]
}

export interface LogLine {
  projectId: string
  stream: 'stdout' | 'stderr'
  text: string
  timestamp: string
}

export type ServerState = 'stopped' | 'starting' | 'running' | 'stopping' | 'error'

export interface ServerOptions {
  port: number
  wsPort: number
  host: string
  watch: boolean
}

export interface ServerStatus {
  state: ServerState
  options?: ServerOptions
  pid?: number
  startedAt?: string
  error?: string
}

export interface BuildResult {
  success: boolean
  durationMs: number
  exitCode: number | null
}

export interface MarketplacePlugin {
  name: string
  fullName: string
  description?: string
  stars?: number
  url: string
  topics?: string[]
}

export interface BackupEntry {
  id: string
  createdAt: string
  kind: 'config' | 'content'
  label?: string
}

export type ContentStrategy = 'copy' | 'symlink'

export interface ContentStatus {
  path: string
  exists: boolean
  isSymlink: boolean
  symlinkTarget?: string
  targetExists?: boolean
  fileCount?: number
}

export interface ContentProgress {
  projectId: string
  processed: number
  total: number
  currentFile?: string
}

export interface SyncResult {
  success: boolean
  output: string
}

export const IPC = {
  projectList: 'project:list',
  projectAdd: 'project:add',
  projectOpen: 'project:open',
  projectRemove: 'project:remove',
  projectCreate: 'project:create',

  configGet: 'config:get',
  configSave: 'config:save',

  pluginAdd: 'plugin:add',
  pluginRemove: 'plugin:remove',
  pluginOptionsSchema: 'plugin:optionsSchema',
  pluginThemeStyleSettingsInfo: 'plugin:themeStyleSettingsInfo',
  themeMarketplaceList: 'themeMarketplace:list',
  themeMarketplaceInstall: 'themeMarketplace:install',
  themeMarketplaceDetail: 'themeMarketplace:detail',
  themePresetList: 'themePreset:list',
  themePresetSave: 'themePreset:save',
  themePresetDelete: 'themePreset:delete',
  pluginInstallFromLock: 'plugin:installFromLock',
  pluginPrune: 'plugin:prune',

  marketplaceSearch: 'marketplace:search',
  marketplaceRefresh: 'marketplace:refresh',

  serverStart: 'server:start',
  serverStop: 'server:stop',
  serverRestart: 'server:restart',
  serverStatus: 'server:status',
  serverStatusChanged: 'server:statusChanged',
  serverLog: 'server:log',

  buildRun: 'build:run',
  buildLog: 'build:log',

  syncRun: 'sync:run',

  backupList: 'backup:list',
  backupDiff: 'backup:diff',
  backupRestore: 'backup:restore',

  contentStatus: 'content:status',
  contentChange: 'content:change',
  contentProgress: 'content:progress',

  settingsGet: 'settings:get',
  settingsSave: 'settings:save',

  dialogPickFolder: 'dialog:pickFolder'
} as const

export interface Settings {
  githubToken?: string
  defaultProjectDirectory?: string
  // 'system' (default) follows the OS locale with an English fallback; 'de'/'en' pin the language.
  language?: 'system' | 'de' | 'en'
}

export interface PluginActionResult {
  success: boolean
  output: string
}

export interface CreateProjectOptions {
  targetDirectory: string
  template?: 'default' | 'obsidian' | 'ttrpg' | 'blog'
  source?: string
  strategy?: ContentStrategy | 'new'
  linkResolution?: 'absolute' | 'shortest' | 'relative'
  baseUrl?: string
}

export interface CreateProjectResult {
  success: boolean
  output: string
}

// The renderer-facing API exposed on window.quartzGui by the preload script.
export interface QuartzGuiApi {
  projects: {
    list(): Promise<Project[]>
    add(path: string): Promise<Project>
    open(id: string): Promise<Project | undefined>
    remove(id: string): Promise<void>
    create(options: CreateProjectOptions): Promise<CreateProjectResult>
  }
  config: {
    get(projectPath: string): Promise<QuartzConfig>
    save(projectPath: string, config: QuartzConfig): Promise<void>
  }
  plugins: {
    add(projectPath: string, source: string): Promise<PluginActionResult>
    remove(projectPath: string, name: string): Promise<PluginActionResult>
    optionsSchema(projectPath: string, name: string): Promise<PluginOptionField[] | null>
    themeStyleSettingsInfo(projectPath: string, themeId: string): Promise<ThemeStyleSettingsInfo | null>
    installFromLock(projectPath: string): Promise<PluginActionResult>
    prune(projectPath: string): Promise<PluginActionResult>
  }
  themeMarketplace: {
    list(githubToken?: string): Promise<QuartzThemeListing[]>
    install(projectPath: string, themeId: string): Promise<PluginActionResult>
    detail(projectPath: string, themeId: string): Promise<ThemeDetail | null>
  }
  themePresets: {
    list(projectPath: string): Promise<ThemePreset[]>
    save(projectPath: string, preset: ThemePreset): Promise<void>
    delete(projectPath: string, id: string): Promise<void>
  }
  marketplace: {
    search(query: string, githubToken?: string): Promise<MarketplacePlugin[]>
    refresh(): Promise<void>
  }
  server: {
    start(projectId: string, projectPath: string, options?: ServerOptions): Promise<ServerStatus>
    stop(projectId: string): Promise<void>
    restart(projectId: string, projectPath: string, options?: ServerOptions): Promise<ServerStatus>
    status(projectId: string): Promise<ServerStatus>
    onLog(cb: (line: LogLine) => void): () => void
    onStatus(cb: (projectId: string, status: ServerStatus) => void): () => void
  }
  build: {
    run(projectId: string, projectPath: string, outputDir?: string): Promise<BuildResult>
    onLog(cb: (line: LogLine) => void): () => void
  }
  sync: {
    run(projectPath: string, direction?: 'push' | 'pull' | 'both'): Promise<SyncResult>
  }
  backups: {
    list(projectPath: string, kind: 'config' | 'content'): Promise<BackupEntry[]>
    diff(projectPath: string, id: string): Promise<string>
    restore(projectPath: string, kind: 'config' | 'content', id: string): Promise<void>
  }
  content: {
    status(projectPath: string): Promise<ContentStatus>
    change(projectId: string, projectPath: string, sourcePath: string, strategy: ContentStrategy): Promise<void>
    onProgress(cb: (progress: ContentProgress) => void): () => void
  }
  settings: {
    get(): Promise<Settings>
    save(settings: Settings): Promise<void>
  }
  dialog: {
    pickFolder(): Promise<string | null>
  }
}
