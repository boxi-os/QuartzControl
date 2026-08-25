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

// Verified against the real Quartz 5 source (quartz/styles/variables.scss): $breakpoints =
// (mobile: 800px, desktop: 1200px) - mobile is max-width:800px, tablet is the 800-1200px band,
// desktop is min-width:1200px. Quartz's own `.mobile-only`/`.desktop-only` (styles/base.scss)
// switch at exactly 800px, so generated frame media queries reuse these thresholds verbatim -
// see layoutFrameService/gridFrameCss for where they're applied.
export type FrameBreakpoint = 'desktop' | 'tablet' | 'mobile'

// One rectangular placement of an area within a single breakpoint's grid. row/col are 1-based,
// matching CSS grid-row/grid-column line numbers directly so the codegen can pass them straight
// through into a generated `grid-template-areas` declaration. `hidden` keeps the area's identity
// (and its placements on other breakpoints) while excluding it from this breakpoint entirely.
export interface GridAreaPlacement {
  row: number
  col: number
  rowSpan: number
  colSpan: number
  hidden?: boolean
}

// Identity of a grid-frame area - breakpoint-invariant, since the same named/slotted area (e.g.
// "sidebar" -> left) typically persists across breakpoints even as its geometry or visibility
// changes. Actual geometry lives in GridBreakpointLayout.placements, keyed by this id.
export interface GridFrameArea {
  id: string
  name: string
  slot: FrameSlot
}

// Full grid geometry for exactly one breakpoint. columnSizes/rowSizes are optional per-track CSS
// sizes (one entry per column/row; a missing/shorter array falls back to '1fr'/'auto' per track,
// matching the old implicit repeat() behavior). Line names mirror CSS's `[line-name]` track
// syntax, keyed by the 0-based line position (0..cols / 0..rows).
export interface GridBreakpointLayout {
  rows: number
  cols: number
  columnSizes?: string[]
  rowSizes?: string[]
  rowGap: string
  columnGap: string
  columnLineNames?: Record<number, string[]>
  rowLineNames?: Record<number, string[]>
  // Keyed by GridFrameArea.id - an area with no entry here simply isn't part of this
  // breakpoint's grid (equivalent to placements[id].hidden = true).
  placements: Record<string, GridAreaPlacement>
}

// Authored via the Layout Editor's Frame Builder and compiled into a generated local companion
// plugin under <project>/.quartz-gui/authored-frames/<id> - see layoutFrameService. `id` doubles
// as the generated plugin's directory name and its registered plugin name (`quartz plugin add`
// derives the plugin name from the local source path's basename - verified against
// quartz/cli/plugin-data.js's parseGitSource). `frameName` is the PageFrame.name value that
// becomes selectable in layout.byPageType.<type>.template.
export interface GridFrameDefinition {
  id: string
  frameName: string
  areas: GridFrameArea[]
  breakpoints: Record<FrameBreakpoint, GridBreakpointLayout>
}

// Pre-breakpoint on-disk shape (frame.json written before breakpoint support existed) - a flat
// single grid with area geometry inlined. gridFrameCss.migrateGridFrameDefinition() upgrades this
// into the current GridFrameDefinition shape on load.
export interface LegacyGridFrameDefinition {
  id: string
  frameName: string
  rows: number
  cols: number
  gap: string
  areas: Array<{ id: string; name: string; slot: FrameSlot; row: number; col: number; rowSpan: number; colSpan: number }>
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

// The labelled counterpart to ThemeStyleSettingsInfo's bare key list, recovered from the *original*
// Obsidian theme's `@settings` block rather than from the port (see styleSettingsSchemaService for
// why the port can't carry it). Not every theme has one - a null schema is a normal answer, and
// the Theme tab keeps its raw key/value editor for that case.
export type StyleSettingKind =
  | 'heading'
  | 'info-text'
  | 'class-toggle'
  | 'class-select'
  | 'variable-text'
  | 'variable-number'
  | 'variable-number-slider'
  | 'variable-select'
  | 'variable-color'
  | 'variable-themed-color'
  | 'unsupported'

export interface StyleSettingField {
  id: string
  // Which `@settings` block declared it - a theme can ship several (tokyo-night: "Appearance" and
  // "Editor"), and the option key written into quartz.config.yaml is "<blockId>@@<id>".
  blockId: string
  title: string
  description?: string
  kind: StyleSettingKind
  // heading only: nesting depth and whether the theme author collapsed it by default
  level?: number
  collapsed?: boolean
  default?: string | boolean
  // variable-themed-color carries one default per mode instead of a single one
  defaultLight?: string
  defaultDark?: string
  min?: number
  max?: number
  step?: number
  options?: { label: string; value: string }[]
  // Color encoding the theme expects: 'hex', 'rgb', 'hsl', 'hsl-split', ... - decides what a
  // picked color has to be written as, and for 'hsl-split' even which variables it lands in.
  format?: string
}

export interface StyleSettingsSchema {
  ids: string[]
  themeName: string
  author: string
  repo: string
  screenshotUrl?: string
  // Flat, in the theme author's own order; `heading` entries mark where a group starts and `level`
  // gives its depth, exactly as Obsidian's Style Settings renders it.
  fields: StyleSettingField[]
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

// One derived CSS custom property (see src/data/cssVariables.ts for the curated catalog sourced
// from quartz/util/theme.ts's joinStyles()) the user has chosen to override, stored in
// custom.scss's managed "css-vars" section. custom.scss is emitted unlayered while Quartz's own
// generated theme CSS lives inside `@layer quartz-base` (componentResources.ts), so an unlayered
// `:root { --x: ... }` rule always wins regardless of selector specificity or source order - a
// `dark` override is therefore only written when explicitly set; omitting it means the light
// value applies in both modes (there is no unlayered rule left to defer back to the theme's own
// per-mode derivation).
export interface CssVariableOverride {
  key: string
  light: string
  dark?: string
}

// One entry of the variable table the Styles page's "Variablen" tab renders. Values are kept
// verbatim - `var(--bg_highlight)`, `rgba(var(--x), 0.8)`, `calc(...)` and plain literals all
// arrive as written - because the point is to show *how* a variable is derived, not only what it
// ends up as; the renderer resolves the chain itself against the same table.
export interface CssVariableInfo {
  light?: string
  dark?: string
  // 'theme' = declared by the installed @quartz-themes package's own :root block, 'build' = found
  // in compiled build output (Quartz's own generated CSS, or a plugin's).
  origin: 'theme' | 'build'
}

// A community theme can bring ~1000 variables (verified: @quartz-themes/tokyo-night declares 978,
// 543 of them derived from another variable), so the tab needs more than a flat list - `dependents`
// is the inverted graph ("which variables would change if I override this one"), assembled from
// every `var()` reference plus the theme's own brokenVarLinks table.
export interface CssVariableGraph {
  vars: Record<string, CssVariableInfo>
  dependents: Record<string, string[]>
  themeId?: string
  // Which sources actually contributed - lets the UI say "no build output yet" instead of
  // silently showing a thinner table than the user expects.
  sources: { theme: boolean; build: boolean }
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

// A saved SFTP/FTP connection profile. The renderer never sees the actual secret (password or
// private-key contents) - only whether one is stored (`hasSecret`). It's encrypted at rest via
// Electron's safeStorage (OS keychain-backed) in secretsService.ts, kept in Electron's userData
// dir rather than the project - these are machine-local credentials, not something that should
// ever end up inside the project's own git repo.
export interface DeployConnectionProfile {
  id: string
  projectPath: string
  name: string
  protocol: 'sftp' | 'ftp'
  host: string
  port: number
  username: string
  remotePath: string
  authMethod: 'password' | 'privateKey'
  secure?: boolean
  hasSecret: boolean
  // SFTP only: the server's public-key fingerprint in OpenSSH's "SHA256:<base64>" form, recorded
  // the first time the user confirmed it. A later connection whose key doesn't match is refused
  // outright rather than re-prompting; clearing it (deploy.forgetHostKey) is the deliberate
  // opt-out for a server that legitimately changed keys.
  hostKeyFingerprint?: string
}

// `secret` is the plaintext password or private-key contents - only ever sent renderer->main when
// saving (to be encrypted immediately), never the other direction. Omit to keep the existing
// stored secret unchanged when just editing other fields of an existing profile.
export interface SaveDeployConnectionInput {
  id?: string
  projectPath: string
  name: string
  protocol: 'sftp' | 'ftp'
  host: string
  port: number
  username: string
  remotePath: string
  authMethod: 'password' | 'privateKey'
  secure?: boolean
  secret?: string
}

// One entry in the local build-output manifest (.quartz-gui/deploy-manifest.json), keyed by the
// file's path relative to the build directory. Compared against a fresh hash of the current build
// output to compute the changed/added/removed diff shown before a deploy.
export interface DeployDiffEntry {
  path: string
  status: 'added' | 'changed' | 'removed'
}

export interface DeployProgressEvent {
  connectionId: string
  processed: number
  total: number
  currentFile?: string
}

export interface DeployResult {
  success: boolean
  output: string
}

export interface GithubPagesDeployOptions {
  branch: string
}

// The six independent slices a Template-Paket can carry - each maps to one export function's
// output file(s) in templatePackageService.ts (layout.json/colors.json/plugins.json/frames.json/
// custom.scss+imported/*/fonts/*) and one checkbox in the Templates route. Import (Phase 3c) can
// select any subset independently of what was exported, driven by which categories the source
// package's manifest.json actually contains.
export type TemplatePackageCategory = 'layout' | 'colors' | 'plugins' | 'frames' | 'styles' | 'fonts'

// Written as manifest.json at the root of an exported package folder. `stats` are best-effort
// counts shown in the import preview before committing to anything - absent for categories that
// weren't exported.
export interface TemplatePackageManifest {
  name: string
  createdAt: string
  categories: TemplatePackageCategory[]
  stats: {
    pluginCount?: number
    frameCount?: number
    fontCount?: number
  }
}

// Returned by previewPackage() so the Import UI can show what a chosen source folder actually
// contains before the user picks which categories to import - null if the folder has no readable
// manifest.json (not a Template-Paket, or corrupted).
export interface TemplatePackagePreview {
  manifest: TemplatePackageManifest
}

// Collision handling during import is always skip-and-warn, never overwrite (an existing plugin/
// frame/style-file/font wins) - warnings surface exactly which entries were skipped and why, so
// the import never silently clobbers something the target project already has.
export interface TemplatePackageImportResult {
  success: boolean
  warnings: string[]
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
  themeMarketplaceStyleSettingsSchema: 'themeMarketplace:styleSettingsSchema',
  themeMarketplaceRefreshStyleSettingsSchema: 'themeMarketplace:refreshStyleSettingsSchema',
  themePresetList: 'themePreset:list',
  themePresetSave: 'themePreset:save',
  themePresetDelete: 'themePreset:delete',
  pluginInstallFromLock: 'plugin:installFromLock',
  pluginPrune: 'plugin:prune',

  layoutFrameList: 'layoutFrame:list',
  layoutFrameSave: 'layoutFrame:save',
  layoutFrameDelete: 'layoutFrame:delete',
  layoutFrameBuiltinPageTypeFrames: 'layoutFrame:builtinPageTypeFrames',

  stylesGet: 'styles:get',
  stylesSave: 'styles:save',
  stylesReference: 'styles:reference',
  stylesImportFile: 'styles:importFile',
  stylesGetVariableOverrides: 'styles:getVariableOverrides',
  stylesSaveVariableOverrides: 'styles:saveVariableOverrides',
  stylesScanBuildOutputVariables: 'styles:scanBuildOutputVariables',
  stylesVariableGraph: 'styles:variableGraph',

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

  deployConnectionsList: 'deploy:connectionsList',
  deployConnectionSave: 'deploy:connectionSave',
  deployConnectionDelete: 'deploy:connectionDelete',
  deployForgetHostKey: 'deploy:forgetHostKey',
  deployDiff: 'deploy:diff',
  deployRun: 'deploy:run',
  deployGithubPagesRun: 'deploy:githubPagesRun',
  deployProgress: 'deploy:progress',
  dialogPickFile: 'dialog:pickFile',
  dialogOpenPath: 'dialog:openPath',

  templatePackageExport: 'templatePackage:export',
  templatePackagePreview: 'templatePackage:preview',
  templatePackageImport: 'templatePackage:import',

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
    // Frame names that built-in pageType plugins (e.g. @quartz-community/canvas-page) bring as
    // their own default - discovered from the project's node_modules, not quartz.config.yaml (see
    // pluginSchemaService.discoverBuiltinPageTypeFrames). Keyed by the plugin's derived display
    // name (e.g. "canvas-page"), matching derivePageTypes()'s "-page" stripping convention.
    builtinPageTypeFrames(projectPath: string, plugins: PluginEntry[]): Promise<Record<string, string>>
  }
  styles: {
    get(projectPath: string): Promise<StylesInfo>
    save(projectPath: string, content: string): Promise<void>
    reference(projectPath: string, pluginName: string): Promise<StyleReferenceFile[]>
    importFile(projectPath: string, sourcePath: string): Promise<{ importLine: string; relativePath: string }>
    getVariableOverrides(projectPath: string): Promise<CssVariableOverride[]>
    saveVariableOverrides(projectPath: string, overrides: CssVariableOverride[]): Promise<void>
    scanBuildOutputVariables(projectPath: string, outputDir?: string): Promise<string[]>
    variableGraph(projectPath: string, themeId?: string, outputDir?: string): Promise<CssVariableGraph>
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
  deploy: {
    listConnections(projectPath: string): Promise<DeployConnectionProfile[]>
    saveConnection(input: SaveDeployConnectionInput): Promise<DeployConnectionProfile>
    deleteConnection(id: string): Promise<void>
    forgetHostKey(id: string): Promise<void>
    diff(projectPath: string, outputDir?: string): Promise<DeployDiffEntry[]>
    run(connectionId: string, outputDir: string | undefined, excludePaths: string[]): Promise<DeployResult>
    runGithubPages(projectPath: string, outputDir: string | undefined, options: GithubPagesDeployOptions): Promise<DeployResult>
    onProgress(cb: (event: DeployProgressEvent) => void): () => void
  }
  templatePackage: {
    export(projectPath: string, destDir: string, name: string, categories: TemplatePackageCategory[]): Promise<{ packageDir: string }>
    preview(sourceDir: string): Promise<TemplatePackagePreview | null>
    import(projectPath: string, sourceDir: string, categories: TemplatePackageCategory[]): Promise<TemplatePackageImportResult>
  }
  themeMarketplace: {
    list(githubToken?: string): Promise<QuartzThemeListing[]>
    install(projectPath: string, themeId: string): Promise<PluginActionResult>
    detail(projectPath: string, themeId: string): Promise<ThemeDetail | null>
    styleSettingsSchema(themeId: string): Promise<StyleSettingsSchema | null>
    refreshStyleSettingsSchema(themeId: string): Promise<StyleSettingsSchema | null>
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
