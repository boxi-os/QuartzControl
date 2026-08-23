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

// The 6 slots a component-providing plugin can render into - verified against
// quartz/plugins/loader/config-loader.ts's `buildLayoutForEntries` (the actual position map it
// builds has exactly these 6 keys; there is no "body" position - that's the fixed page content).
export type LayoutPosition = 'header' | 'left' | 'right' | 'beforeBody' | 'afterBody' | 'footer'

// Mirrors quartz's own `PluginLayoutDeclaration` (plugins/loader/types.ts) - the shape of a
// component plugin entry's `layout` field in quartz.config.yaml.
export interface PluginLayoutDeclaration {
  position: LayoutPosition
  priority: number
  display?: 'all' | 'mobile-only' | 'desktop-only'
  condition?: string
  group?: string
  groupOptions?: {
    grow?: boolean
    shrink?: boolean
    basis?: string
    order?: number
    align?: 'start' | 'end' | 'center' | 'stretch'
    justify?: 'start' | 'end' | 'center' | 'between' | 'around'
  }
}

export interface PluginEntry {
  name: string
  source: PluginSource
  enabled: boolean
  order?: number
  options?: Record<string, unknown>
  layout?: PluginLayoutDeclaration
  // plugin entries can carry other keys beyond the ones above that must round-trip through
  // save even though the editor UI doesn't surface them yet
  [key: string]: unknown
}

// A named flex-group definition under the top-level `layout.groups` key - members opt in via
// their own `layout.group` field (see PluginLayoutDeclaration.group). Verified against
// quartz/plugins/loader/types.ts's `FlexGroupConfig` and `resolveGroups()`'s consumption of it.
export interface FlexGroupConfig {
  priority?: number
  direction?: 'row' | 'row-reverse' | 'column' | 'column-reverse'
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse'
  gap?: string
}

// Per-page-type override under `layout.byPageType.<pageType>`. `positions` is only meaningful
// as an empty array (clears that slot for this page type) - verified against
// config-loader.ts's `loadQuartzLayout`, which only ever checks `components.length === 0` and
// otherwise ignores non-empty `positions` arrays entirely (a currently-inert part of the schema).
export interface PageTypeLayoutOverride {
  exclude?: string[]
  positions?: Partial<Record<LayoutPosition, unknown[]>>
  template?: string
}

// Top-level `layout:` key of quartz.config.yaml, sibling to `configuration`/`plugins`/`theme`.
export interface LayoutConfig {
  groups?: Record<string, FlexGroupConfig>
  byPageType?: Record<string, PageTypeLayoutOverride>
}

// A grid-frame area is rendered into one of the 6 real component slots, or "pageBody" - the
// fixed page content itself (PageFrameProps.pageBody in quartz/components/frames/types.ts,
// a single component rather than a list like the other 6).
export type FrameSlot = LayoutPosition | 'pageBody'

// One rectangular region of a generated grid frame. row/col are 1-based, matching CSS
// grid-row/grid-column line numbers directly so the main-process codegen can pass them straight
// through into a generated `grid-template-areas` declaration.
export interface GridFrameArea {
  id: string
  name: string
  slot: FrameSlot
  row: number
  col: number
  rowSpan: number
  colSpan: number
}

// Authored via the Layout Editor's Frame Builder (Phase 1b) and compiled into a generated local
// companion plugin under <project>/.quartz-gui/authored-frames/<id> - see layoutFrameService.
// `id` doubles as the generated plugin's directory name and its registered plugin name (`quartz
// plugin add` derives the plugin name from the local source path's basename - verified against
// quartz/cli/plugin-data.js's parseGitSource). `frameName` is the PageFrame.name value that
// becomes selectable in layout.byPageType.<type>.template.
export interface GridFrameDefinition {
  id: string
  frameName: string
  rows: number
  cols: number
  gap: string
  areas: GridFrameArea[]
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
  // undefined when the project's quartz.config.yaml has no top-level `layout:` key at all -
  // left untouched on save in that case (see configService.writeConfig) rather than injecting an
  // empty one on every unrelated save from another tab.
  layout?: LayoutConfig
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

// The whole-file content of quartz/styles/custom.scss - verified to be the actual file Quartz's
// build imports directly (quartz/plugins/emitters/componentResources.ts: `import customStyles
// from "../../styles/custom.scss"`), so editing it needs no separate live-reload wiring: it's
// already inside the esbuild watch graph the dev server's own hot-reload websocket covers.
export interface StylesInfo {
  path: string
  content: string
}

// One shipped locale file under quartz/i18n/locales/*.ts (excluding definition.ts). `code` is the
// filename-derived locale (e.g. "de-DE") - some runtime locale codes share one file (see
// quartz/i18n/index.ts's TRANSLATIONS map, e.g. every "ar-*" variant points at ar-SA.ts), so
// editing is scoped to the file, not every code that happens to resolve to it.
export interface LocaleFile {
  code: string
}

// One leaf value inside a locale file's default-exported translation object, found by walking its
// AST (see localizationService.ts). Plain string literals are freely editable; anything else
// (an arrow function, often with real pluralization logic - e.g. `({count}) => count === 1 ? ...
// : ...`) is exposed as its raw source text for direct (advanced) editing rather than attempting a
// lossy form-ified representation of arbitrary JS.
export interface LocaleEntry {
  path: string[]
  kind: 'string' | 'template'
  value: string
}

export interface LocaleSaveResult {
  success: boolean
  error?: string
}

// The project's own quartz/ clone is a real git repo (createService.ts clones it, then removes
// "origin" so Git-Sync never pushes to jackyzha0/quartz - see CLAUDE.md). Core-update status
// compares its current HEAD against upstream's default branch via a plain `git ls-remote` (no
// GitHub API/token needed, works for any public repo).
export interface CoreUpdateStatus {
  currentCommit: string
  latestCommit: string
  upToDate: boolean
}

// One quartz.lock.json entry's update status. `commit: "local"` entries (Phase 1b's generated
// frame plugins) have no remote to check against, so isLocal is reported instead of a commit
// comparison. latestCommit is null when the check itself failed (e.g. network unreachable).
export interface PluginUpdateStatus {
  name: string
  isLocal: boolean
  installedCommit?: string
  latestCommit?: string | null
  upToDate: boolean
}

// A git tag pointing at a `git stash create` commit (or bare HEAD on a clean tree) - a
// non-destructive snapshot of the project's tracked-file state, taken automatically before a core
// update. Does NOT capture untracked files (git stash create has no --include-untracked option) -
// backupService.ts's config/content snapshots are the complementary safety net for those.
export interface ProjectSnapshot {
  tag: string
  createdAt: string
}

export interface UpdateResult {
  success: boolean
  output: string
  snapshotTag?: string
  conflicts?: string[]
}

// A read-only reference file (an installed plugin's own *.scss) shown alongside the editor so the
// user can see the original selectors they're overriding. Only available for CLI-installed
// plugins (a real directory under .quartz/plugins/<name>) - built-in @quartz-community/x entries
// have no discoverable source on disk, same limitation as pluginSchemaService's options schema.
export interface StyleReferenceFile {
  label: string
  path: string
  content: string
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

  layoutFrameList: 'layoutFrame:list',
  layoutFrameSave: 'layoutFrame:save',
  layoutFrameDelete: 'layoutFrame:delete',

  stylesGet: 'styles:get',
  stylesSave: 'styles:save',
  stylesReference: 'styles:reference',
  stylesImportFile: 'styles:importFile',

  fontsImportFile: 'fonts:importFile',

  localizationList: 'localization:list',
  localizationGetEntries: 'localization:getEntries',
  localizationSaveEntry: 'localization:saveEntry',
  localizationGitAttributesStatus: 'localization:gitAttributesStatus',
  localizationEnsureGitAttributes: 'localization:ensureGitAttributes',

  updateCoreStatus: 'update:coreStatus',
  updateCoreRun: 'update:coreRun',
  updateCoreAbort: 'update:coreAbort',
  updatePluginsStatus: 'update:pluginsStatus',
  updatePluginRun: 'update:pluginRun',
  updateSnapshotList: 'update:snapshotList',
  updateSnapshotRestore: 'update:snapshotRestore',
  dialogPickFile: 'dialog:pickFile',
  dialogOpenPath: 'dialog:openPath',

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
  layoutFrames: {
    list(projectPath: string): Promise<GridFrameDefinition[]>
    save(projectPath: string, definition: GridFrameDefinition): Promise<PluginActionResult>
    delete(projectPath: string, id: string): Promise<PluginActionResult>
  }
  styles: {
    get(projectPath: string): Promise<StylesInfo>
    save(projectPath: string, content: string): Promise<void>
    reference(projectPath: string, pluginName: string): Promise<StyleReferenceFile[]>
    importFile(projectPath: string, sourcePath: string): Promise<{ importLine: string; relativePath: string }>
  }
  fonts: {
    importFile(projectPath: string, sourcePath: string, family: string): Promise<{ fileName: string }>
  }
  localization: {
    list(projectPath: string): Promise<LocaleFile[]>
    getEntries(projectPath: string, code: string): Promise<LocaleEntry[]>
    saveEntry(projectPath: string, code: string, path: string[], kind: 'string' | 'template', value: string): Promise<LocaleSaveResult>
    gitAttributesStatus(projectPath: string): Promise<boolean>
    ensureGitAttributes(projectPath: string): Promise<void>
  }
  updates: {
    coreStatus(projectPath: string): Promise<CoreUpdateStatus>
    runCoreUpdate(projectPath: string): Promise<UpdateResult>
    abortCoreMerge(projectPath: string): Promise<PluginActionResult>
    pluginsStatus(projectPath: string): Promise<PluginUpdateStatus[]>
    updatePlugin(projectPath: string, name?: string): Promise<PluginActionResult>
    listSnapshots(projectPath: string): Promise<ProjectSnapshot[]>
    restoreSnapshot(projectPath: string, tag: string): Promise<PluginActionResult>
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
    pickFile(filters?: { name: string; extensions: string[] }[]): Promise<string | null>
    openPath(path: string): Promise<void>
  }
}
