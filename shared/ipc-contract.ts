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

/**
 * The widths at which an authored frame's own media queries switch, as max-widths in px.
 *
 * Quartz's numbers (`DEFAULT_FRAME_BREAKPOINT_WIDTHS`) are the default and were the only option
 * before this existed. They stay a *default* rather than a constant because the generated frame
 * CSS emits its own media queries - the thresholds are ours to choose, and a layout with a wide
 * sidebar routinely wants to collapse earlier or later than Quartz's own three-column page does.
 *
 * Stored per project (`.quartz-gui/layout-breakpoints.json`), not per frame: two frames in one
 * site reflowing at different widths is a bug, not a feature. `mobile` must stay below `tablet`.
 */
export interface FrameBreakpointWidths {
  tablet: number
  mobile: number
}

// Where a width-capped frame sits in the space its container leaves it.
export type FrameAlign = 'left' | 'center' | 'right'

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
//
// `slot` is optional, and that is not the same as "not decided yet": an area without one renders
// as an empty cell - a deliberate spacer in the grid. It has to be expressible, because quartz
// hands out exactly seven sources of content (six positions plus the page body, see FrameSlot) and
// a frame may have more areas than that. Before this was optional, a new area was born on `left`,
// and two areas on the same slot render the same component list twice: measured on this project's
// "editorial" frame, which had three areas on `left` and therefore built the whole left sidebar
// three times onto every page.
export interface GridFrameArea {
  id: string
  name: string
  slot?: FrameSlot
  // The quartz group (`plugins[].layout.group`) this area holds, and the way past the six-position
  // ceiling: an area with a group shows only that group's components, an area without one shows
  // everything of its slot that no group claims. Meaningless without a slot, and on `pageBody`
  // (which is one component, not a list). The name is the area's own - a group exists as soon as a
  // component names it, `layout.groups` only carries its direction and gap. See
  // groupOrderByPosition in gridFrameCss.ts for how the frame finds it again at build time.
  group?: string
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
  // The frame's own box, per breakpoint: maxWidth caps how wide the grid itself may get (absent or
  // empty = no cap), align says where that capped box sits in the width that is left, and the two
  // paddings inset the tracks from its edges. All optional, so a frame.json written before they
  // existed keeps loading unchanged - the codegen still emits an explicit value for each of them in
  // every breakpoint block, or a desktop cap would leak into the narrower ones. See buildFrameBox
  // for why align only does anything once a maxWidth is set.
  maxWidth?: string
  align?: FrameAlign
  paddingBlock?: string
  paddingInline?: string
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

/**
 * What one theme-catalog fetch produced - the same shape (and the same reason) as
 * MarketplaceResult: `npm search` failing leaves a seven-entry placeholder behind, which reads
 * exactly like a very small catalog unless it is said out loud.
 */
export interface ThemeCatalogResult {
  themes: QuartzThemeListing[]
  unavailable: boolean
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

export interface GithubAccount {
  login: string
  name?: string
}

export interface GithubRepoRef {
  owner: string
  repo: string
  htmlUrl: string
}

// What GitHub reports about a repo's Pages site. `configured: false` is the normal answer for a
// repo that has none yet (the API answers 404), not a failure - `error` is only set when the call
// itself went wrong.
export interface GithubPagesInfo {
  configured: boolean
  /** 'built' | 'building' | 'errored' | null while it has never been built. */
  status?: string | null
  htmlUrl?: string
  cname?: string | null
  httpsEnforced?: boolean
  sourceBranch?: string
  sourcePath?: string
  error?: string
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

/** What the main process has kept of a project's output - see the `logs` API. */
export interface LogHistory {
  server: LogLine[]
  build: LogLine[]
}

export type ServerState = 'stopped' | 'starting' | 'running' | 'stopping' | 'error'

// No `watch` here on purpose: `quartz build --serve` sets `argv.watch = true` itself
// (quartz/cli/handlers.js), so the dev server always watches and a switch offering to turn that
// off could only ever lie about what the process does.
export interface ServerOptions {
  port: number
  wsPort: number
  host: string
}

export interface ServerStatus {
  state: ServerState
  options?: ServerOptions
  pid?: number
  startedAt?: string
  /** A failure the OS reported verbatim (a failed spawn), so it is not translatable. */
  error?: string
  /**
   * Set when the process died on its own: how it ended, as a number rather than as a sentence, so
   * the renderer phrases it in the user's language. `null` means it was killed by a signal.
   */
  exitCode?: number | null
}

export interface BuildResult {
  success: boolean
  durationMs: number
  exitCode: number | null
}

// A `quartz ... --serve` process found in the machine's process table, whether or not this app
// started it. Measured on macOS with a server started from a terminal: `npm exec quartz build
// --serve --port 8099 --wsPort 3099` (the parent) and a `node .../.bin/quartz build --serve
// --port 8099 --wsPort 3099` below it, which is the process actually holding both ports. The
// ports therefore come out of the arguments, not out of a socket table, and the working
// directory names the project.
export interface DiscoveredServer {
  /** The topmost process of the group - what a stop has to signal, since tree-kill takes the rest. */
  pid: number
  /** The process holding the ports. Same pid when the server was started without a wrapper. */
  listenerPid: number
  port: number
  wsPort?: number
  /** Working directory, when it could be read; this is what maps a server to a project. */
  cwd?: string
  /** Set when `cwd` is a project this app knows. */
  projectId?: string
  projectName?: string
  /** Derived from the process's elapsed time, so it does not depend on a locale-formatted date. */
  startedAt?: string
  /** True when this app spawned it in this session - those are stopped through server.stop(). */
  ownedByApp: boolean
  /** Did the HTTP port answer at all. */
  reachable: boolean
  /** `<title>` of the served page, when it answered with one. */
  siteTitle?: string
  /** Did the answer carry Quartz's own `<meta name="generator">`. */
  quartzGenerator?: boolean
}

export interface ServerDiscovery {
  /**
   * 'unavailable' is its own answer, never an empty list: on Windows there is no `ps`, and a
   * failed scan must not read as "nothing is running" - see CLAUDE.md, "Kann nicht prüfen" ist
   * nie "alles gut".
   *
   * 'partial' is the same rule one step in: the process table was read, but for at least one
   * candidate the socket table was not (no lsof on this machine, or /proc refused), so `servers`
   * is real but short by an unknown number. Neither of the other two says that - 'ok' claims the
   * list is complete, 'unavailable' would throw away servers that were actually found.
   */
  state: 'ok' | 'partial' | 'unavailable'
  /** Why the scan could not answer. English, like every other diagnostic that describes a bug. */
  reason?: string
  servers: DiscoveredServer[]
  /**
   * Ports that were asked about and answer a TCP connect, but belong to no discovered server -
   * i.e. something else holds the port this project wants. Identifying *what* would need a socket
   * table, which is exactly the part that is not portable; that it is taken is enough to say.
   */
  occupiedPorts: number[]
}

export interface ServerKillResult {
  /** False when the process was gone, or no longer looked like a Quartz server, by the time it was signalled. */
  stopped: boolean
  /** Set when the pid was one this app started, so it went through the normal stop path. */
  projectId?: string
}

// The state of a project's build output directory, read from the files themselves - nothing
// records that a build happened, so this is the only answer to "is there a build, and how old is
// it". `builtAt` is the newest mtime in the tree; `exists` means the directory holds at least one
// file, since an empty leftover directory is not a build.
export interface BuildOutputInfo {
  /** Absolute, as resolveBuildDir() interpreted it - may sit outside the project. */
  dir: string
  exists: boolean
  builtAt?: string
  fileCount: number
  sizeBytes: number
  /** Whether what lies there looks like a built site rather than someone else's files. A build
   *  deletes this directory before it writes (see buildOutputGuard), so a non-empty directory
   *  that is *not* a build is the one case the user has to be warned about beforehand. */
  looksLikeBuild: boolean
}

// The per-project settings this app keeps for itself, in <project>/.quartz-gui/. Only one so far,
// but it is one two pages have to agree on: Vorschau & Build writes the build there and
// Veröffentlichen publishes from it, and when each page kept its own field, building to an export
// folder and then deploying silently shipped a stale public/ instead.
export interface ProjectPrefs {
  /** Where `quartz build` writes. Empty means Quartz's own default, public/ in the project. */
  outputDir: string
}

// `topics` and `archived` are what separates a real plugin from the rest of the org: the
// marketplace reads *every* repository of quartz-community, which also holds the core itself
// (`v5`, archived), shared libraries (`types`/`runtime`/`utils`), a template, an awesome-list and
// a few forks. 47 of the 63 repositories carry the `quartz-plugin` topic - verified against the
// API - so the renderer sorts by that rather than offering "install" on an awesome-list.
export interface MarketplacePlugin {
  name: string
  fullName: string
  description?: string
  stars?: number
  url: string
  topics?: string[]
  archived?: boolean
}

/**
 * What one catalog fetch produced.
 *
 * `unavailable` is its own answer rather than an empty list: a rate-limited or unreachable GitHub
 * API leaves the service with a single hard-coded entry, which is indistinguishable from a
 * one-plugin organisation unless it is said out loud - the same "cannot check is not the same as
 * fine" distinction styleService's `unavailable` and updateService's `'unknown'` make.
 */
export interface MarketplaceResult {
  plugins: MarketplacePlugin[]
  unavailable: boolean
}

// A content directory that was moved aside when the content source was switched - see
// backupService. Not a snapshot; those are Snapshot/snapshotService.
export interface BackupEntry {
  id: string
  createdAt: string
  /**
   * 'link' is a moved *symlink*, recorded as its target and nothing else; 'folder' is a real copy
   * of what the content directory held. The two are worlds apart on disk, which is why the size
   * and the count travel with the entry: a folder of notes can be gigabytes, and deciding whether
   * to delete one is impossible from a timestamp alone.
   */
  kind: 'folder' | 'link'
  sizeBytes: number
  fileCount: number
  /** Where the recorded symlink pointed. Only set for kind 'link'. */
  target?: string
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

// `quartz sync` does three things, and two of them were invisible here. Verified against the CLI's
// own args.js: --commit, --push and --pull all default to *true*, so even a pull-only run first
// stages the whole working tree and commits it under "Quartz sync: <date>" (measured in a real
// project: `--no-push --no-pull` produced a 10-file commit). The push is `git push -uf`, a force
// push onto the current branch. Both are now the user's decision rather than a surprise.
export interface SyncOptions {
  /** Commit everything in the working tree before syncing (the CLI's own default). */
  commit: boolean
  /** Overrides the generated "Quartz sync: <date>" message. Ignored when commit is false. */
  message?: string
}

export type GitOperationInProgress = 'merge' | 'rebase' | 'cherry-pick' | 'revert'

export interface GitFileChange {
  path: string
  /** Only set for a rename/copy - the path the file had before. */
  origPath?: string
  /** The index differs from HEAD, i.e. this change is already staged for the next commit. */
  staged: boolean
  /** The working tree differs from the index. Both flags can be true for the same file. */
  unstaged: boolean
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'conflicted'
}

// What `quartz sync` is about to act on, read straight from git (no token, no network). ahead and
// behind are only meaningful when `upstream` is set - a branch without one reports 0/0, which is
// not the same as "in sync".
export interface GitStatus {
  isRepo: boolean
  /** null while HEAD is detached - see `detached`. */
  branch: string | null
  detached: boolean
  upstream: string | null
  ahead: number
  behind: number
  remoteUrl: string | null
  /** Capped (conflicts and staged changes first); `changeCount` holds the untruncated total. */
  changes: GitFileChange[]
  changeCount: number
  conflictCount: number
  inProgress: GitOperationInProgress | null
  lastCommit: { sha: string; shortSha: string; author: string; date: string; subject: string } | null
}

// The whole-file content of quartz/styles/custom.scss - verified to be the actual file Quartz's
// build imports directly (quartz/plugins/emitters/componentResources.ts: `import customStyles
// from "../../styles/custom.scss"`), so editing it needs no separate live-reload wiring: it's
// already inside the esbuild watch graph the dev server's own hot-reload websocket covers.
export interface StylesInfo {
  path: string
  content: string
}

// An additional stylesheet the user keeps alongside custom.scss. Quartz only ever imports
// custom.scss itself (componentResources.ts), so every extra file has to be reached *through* it -
// which is what the managed "imports" block at the top of custom.scss does. `imported` is whether
// the file is currently listed there; a file on disk that isn't is shown but does nothing.
export interface StyleFile {
  /** Relative to quartz/styles, e.g. "custom/typography.scss" - also the id used by every call. */
  relativePath: string
  path: string
  name: string
  imported: boolean
}

// The whole editable set: custom.scss (always last in the cascade, never part of the order) plus
// every extra stylesheet, ordered as the import block loads them, orphans last.
export interface StyleFileSet {
  main: StylesInfo
  files: StyleFile[]
}

// One @font-face the site really has: what family it declares, at which weight(s) and in which
// style. Two honest sources, and they are the only two - Quartz itself downloads fonts *only* for
// `fontOrigin: "googleFonts"` (componentResources.ts's local branch is literally "let the user do
// it themselves in css"), so under "local" everything available comes from an @font-face in the
// project's own stylesheets or from the font files a community theme ships.
export interface FontFaceInfo {
  family: string
  /** Verbatim from the source: "400", "bold", or a variable range like "100 1000". */
  weight: string
  /** Verbatim: "normal", "italic", … */
  style: string
  origin: 'theme' | 'project'
  /** Which file it was found in - the theme package or a path relative to quartz/styles. */
  source: string
}

// A Sass compile error, located in the file it actually came from - which is frequently not the
// file being edited, since an error in a partial only surfaces when custom.scss pulls it in.
export interface ScssDiagnostic {
  message: string
  /** Relative to quartz/styles when the error is in one of the project's own files. */
  relativePath?: string
  line?: number
  column?: number
}

// "unavailable" is not a failure: a project that has never had `npm install` run in it has no
// sass to compile with, and reporting that honestly beats claiming the stylesheet is fine.
export type ScssCheckResult =
  | { status: 'ok' }
  | { status: 'error'; diagnostic: ScssDiagnostic }
  | { status: 'unavailable'; reason: string }

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
// "Konnte nicht pruefen" is a third answer, not a green badge - the same distinction
// styleService's `unavailable` makes. A failed `git ls-remote` (no network, repo gone) used to
// come back as upToDate.
export type UpdateCheckState = 'upToDate' | 'behind' | 'unknown'

export interface CoreUpdateStatus {
  currentCommit: string
  latestCommit: string
  state: UpdateCheckState
}

// One quartz.lock.json entry's update status. `commit: "local"` entries (Phase 1b's generated
// frame plugins) have no remote to check against, hence the extra 'local' state rather than a
// commit comparison. latestCommit is null when the check itself failed (e.g. network
// unreachable), which is 'unknown' - never 'upToDate'.
export interface PluginUpdateStatus {
  name: string
  installedCommit?: string
  latestCommit?: string | null
  state: UpdateCheckState | 'local'
}

// ---------------------------------------------------------------------------------------------
// Snapshots
//
// One concept replacing three: the config file copies, the moved-aside content folders and the
// git tags on the update page were three mechanisms with three different meanings, and none of
// them covered the project. A snapshot covers everything the user owns in one place, stored in a
// git repository of this app's own (see snapshotService.ts).

// Why a snapshot was taken. Automatic ones are thinned with age and skipped when nothing changed;
// a manual one is always kept. The renderer translates these - a service must not invent the
// user-facing wording for a page that exists in two languages.
export type SnapshotKind =
  | 'manual'
  | 'configChange'
  | 'coreUpdate'
  | 'pluginChange'
  | 'contentChange'
  | 'restore'
  | 'styleChange'
  /** Carried over from the per-save config backups this store replaced. */
  | 'imported'

export interface Snapshot {
  id: string
  commit: string
  createdAt: string
  kind: SnapshotKind
  /** Free detail, not a sentence: a user-typed name, or which plugin an automatic one was about. */
  label: string
  /** The project's own HEAD when the snapshot was taken - see RestoreOptions.resetProjectHead. */
  projectHead?: string
}

// Relative to the project as it is *now*, not the other way round, because that is what a restore
// would do: 'addedSince' means the file exists now and not in the snapshot, so restoring deletes
// it.
export interface SnapshotFileChange {
  path: string
  status: 'addedSince' | 'removedSince' | 'modified'
}

export interface RestoreOptions {
  /** Only these files; without it the whole snapshot, which also removes files it does not have. */
  paths?: string[]
  /**
   * Also move the project's own branch back to the commit the snapshot recorded. Opt-in and
   * separate, because it rewrites the user's git history rather than their files - the one thing
   * a restore must not do behind their back. Only offered when the recorded commit differs from
   * the current one.
   */
  resetProjectHead?: boolean
}

export interface SnapshotSettings {
  includeContent: boolean
  contentExists: boolean
  contentIsSymlink: boolean
}

export interface UpdateResult {
  success: boolean
  output: string
  /** Absent when nothing had changed since the last snapshot, so none was taken. */
  snapshotId?: string
  conflicts?: string[]
}

// ---------------------------------------------------------------------------------------------
// Connections (app level) and publish targets (project level)
//
// The split is deliberate and not cosmetic. A *connection* is something you have with a provider -
// an SSH login, an FTP account, the GitHub token, a build hook. A *target* is what one project
// does with it: which remote path, which branch, which local folder. Three things forced this
// apart from the old per-project profile:
//
//   - A host key belongs to the host, not to the project. Pinning it per profile meant the same
//     server got two independent pins in two projects, which can silently drift apart - the exact
//     failure trust-on-first-use exists to prevent.
//   - One webspace commonly carries several sites: same login, different remote path.
//   - Rotating a password or token has to be one edit, not one per project.
//
// Connections live in Electron's userData (machine-local, secrets encrypted via safeStorage);
// targets live in the project's own .quartz-gui/ (they travel with the project and carry no
// secret at all).
// ---------------------------------------------------------------------------------------------

export type ConnectionKind = 'ssh' | 'ftp' | 'github' | 'webhook'

// How an SSH connection authenticates. Three methods, but 'privateKey' has two provenances: with
// a `keyPath` the file is read at connect time and nothing is stored here; without one the key
// contents themselves are the stored secret (what the pre-split profiles held, and what a pasted
// key still produces). The distinction matters beyond bookkeeping - rsync shells out to ssh(1),
// which needs a key *file*, so it is only offered for 'agent' or 'privateKey' with a keyPath.
export type SshAuthMethod = 'password' | 'privateKey' | 'agent'

// The server's identity, recorded the first time the user confirmed it. `fingerprint` is
// OpenSSH's "SHA256:<base64>" form, directly comparable with `ssh-keygen -lf` output. `blob` is
// the raw public key, base64-encoded - it cannot be recovered from the fingerprint, and ssh(1)
// needs it to build a known_hosts line, which is what lets an rsync transfer honour the same pin
// as the SFTP one instead of trusting a second, separate store.
export interface PinnedHostKey {
  fingerprint: string
  blob: string
  type: string
}

interface ConnectionBase {
  id: string
  name: string
  /** Whether a secret is stored. The secret itself is never sent to the renderer. */
  hasSecret: boolean
}

export interface SshConnection extends ConnectionBase {
  kind: 'ssh'
  host: string
  port: number
  username: string
  authMethod: SshAuthMethod
  /** Path to a private key file. Set only for authMethod 'privateKey' read from disk. */
  keyPath?: string
  hostKey?: PinnedHostKey
}

export interface FtpConnection extends ConnectionBase {
  kind: 'ftp'
  host: string
  port: number
  username: string
  /** FTPS. Plain FTP is cleartext by nature - there is no host-key equivalent to pin. */
  secure: boolean
}

export interface GithubConnection extends ConnectionBase {
  kind: 'github'
  /** The account the token belongs to, resolved from the API once and cached for display. */
  login?: string
}

export interface WebhookConnection extends ConnectionBase {
  kind: 'webhook'
  /** The URL is the credential (a build hook URL is a bearer token in URL form), so it is stored
   *  encrypted like a password and only its origin is exposed for display. */
  displayOrigin?: string
}

export type Connection = SshConnection | FtpConnection | GithubConnection | WebhookConnection

/** `secret` is plaintext and only ever travels renderer->main, to be encrypted immediately.
 *  Omit it when editing other fields to keep the stored secret unchanged. */
export type SaveConnectionInput = { id?: string; secret?: string } & (
  | Omit<SshConnection, 'id' | 'hasSecret' | 'hostKey'>
  | Omit<FtpConnection, 'id' | 'hasSecret'>
  | Omit<GithubConnection, 'id' | 'hasSecret'>
  | Omit<WebhookConnection, 'id' | 'hasSecret' | 'displayOrigin'>
)

export type PublishDestination =
  | {
      type: 'sftp'
      remotePath: string
      /** 'rsync' runs rsync over ssh and diffs against the real remote state; 'sftp' uploads file
       *  by file against the local manifest. Only offered for key/agent auth - see deploy/rsync.ts. */
      transfer: 'sftp' | 'rsync'
      /** Whether files missing locally are removed remotely. Off by default: a wrong remote path
       *  plus deletion empties a directory that was never ours. */
      deleteRemoved: boolean
    }
  | { type: 'ftp'; remotePath: string; deleteRemoved: boolean }
  | { type: 'folder'; path: string; deleteRemoved: boolean }
  | { type: 'webhook' }
  | { type: 'git-branch'; branch: string; provider: 'github' | 'gitlab' | 'codeberg' }

// Stored in <project>/.quartz-gui/publish-targets.json. `connectionId` is absent for
// destinations that need no credential - a folder target, and a git-branch target, which uses the
// repo's existing origin remote and the system's own git credentials.
export interface PublishTarget {
  id: string
  name: string
  connectionId?: string
  destination: PublishDestination
  /** Build-output paths never uploaded or deleted, carried between runs. */
  excludes: string[]
}

export type SavePublishTargetInput = Omit<PublishTarget, 'id' | 'excludes'> & {
  id?: string
  excludes?: string[]
}

// One entry in a target's build-output manifest (.quartz-gui/deploy-manifest-<targetId>.json)
// - one per target, because after deploying to A a shared manifest would report B as up to date.
// Keyed by the
// file's path relative to the build directory. Compared against a fresh hash of the current build
// output to compute the changed/added/removed diff shown before a deploy.
export interface DeployDiffEntry {
  path: string
  status: 'added' | 'changed' | 'removed'
}

export interface DeployProgressEvent {
  targetId: string
  processed: number
  total: number
  currentFile?: string
}

export interface DeployResult {
  success: boolean
  output: string
}

/**
 * The independent slices a Vorlagen-Paket can carry. Each one is a *self-contained* piece of the
 * project's appearance: it owns everything needed to reproduce itself, so any subset can be
 * exported and any subset of that imported without a second part having to be selected too.
 *
 * That is why the list is finer-grained than the six categories it replaced. Three splits carry
 * their reasoning:
 *  - `theme` owns the whole `@quartz-themes/core` plugin entry (its `theme`/`mode`/`styleSettings`
 *    options *are* the community theme) plus the `@quartz-themes/<id>` npm package, which the old
 *    `plugins` category never installed - so a package with a theme built nowhere but the machine
 *    it was made on. `plugins` therefore excludes that entry.
 *  - `plugins` also excludes authored frames. Their config entry's `source` is an absolute path
 *    under the *exporting* machine's `.quartz-gui/authored-frames/`, which is meaningless on
 *    another computer; `frames` re-registers them from their definitions instead.
 *  - custom.scss is split along its own managed blocks: `cssVariables` owns the `css-vars` block,
 *    `fonts` owns the `fonts` block (so the @font-face rules travel with the files they point at),
 *    and `styles` owns the rest plus the `custom/`+`imported/` files and their load order.
 *
 * Adding a slice later is additive: a new id here, one entry in the main service's part registry,
 * one label. An older app reading a newer package reports the unknown ids rather than importing a
 * silent half (see TemplatePackagePlan.unknownParts).
 */
export type TemplatePartId =
  | 'appearance'
  | 'cssVariables'
  | 'theme'
  | 'styles'
  | 'fonts'
  | 'static'
  | 'layout'
  | 'frames'
  | 'plugins'
  | 'translations'
  | 'presets'
  | 'content'

// Export order is also import order, and that is load-bearing: frames and plugins mutate
// quartz.config.yaml out-of-band through the Quartz CLI, so they have to run before the parts that
// write the config from an in-memory copy, and the three parts that write custom.scss run last,
// one after another, each re-reading the file (see CLAUDE.md's reloadScss rule).
export const TEMPLATE_PART_IDS: readonly TemplatePartId[] = [
  'frames',
  'theme',
  'plugins',
  'appearance',
  'layout',
  'presets',
  'translations',
  'styles',
  'fonts',
  // Right after the fonts, because it is the rest of the same directory: everything under
  // quartz/static that is not a font file. Before 2026-09-06 a package carried none of it, so a
  // plugin option pointing at a snippet or a logo arrived in the target pointing at nothing.
  'static',
  'cssVariables',
  // Last, and on its own: the notes touch nothing the other eleven write, and a long file copy at the
  // end of the run is the one part whose progress a person actually watches.
  'content'
] as const

// An npm package a part needs in the target project. `version` is what was installed at export
// time and is informational only - the import installs the package by name so the target resolves
// its own compatible version rather than being pinned to the exporter's lockfile.
export interface TemplatePackageDependency {
  name: string
  version?: string
}

// Per-part counts shown in the export result and the import preview. Deliberately an open record
// rather than a fixed shape: what is worth counting differs per part (files, entries, languages),
// and a future part should not need a contract change to report its own number.
export interface TemplatePartSummary {
  id: TemplatePartId
  stats: Record<string, number>
  requires: TemplatePackageDependency[]
}

// Written as manifest.json at the root of the package. `formatVersion` is what lets an older app
// say "dieses Paket ist neuer" instead of importing whatever it happens to recognise.
export interface TemplatePackageManifest {
  formatVersion: number
  name: string
  description?: string
  createdAt: string
  createdBy: { app: string; appVersion: string }
  // Provenance, shown in the preview so the receiving user can tell where a package came from.
  source: { projectName?: string; quartzHead?: string }
  parts: TemplatePartSummary[]
}

// The file extension a package is written with. It is a ZIP inside - anyone can open it in Finder
// or Explorer to see what a template contains - but it gets its own extension so a template is not
// mistaken for an archive of something else, and so the open dialog can filter for it.
export const TEMPLATE_PACKAGE_EXTENSION = '.qtpl'

export interface TemplateExportOptions {
  name: string
  description?: string
  parts: TemplatePartId[]
  // 'changed' exports only the translation entries that differ from the project's own baseline
  // (see localizationService.getTranslationCustomizations); 'all' exports every string of every
  // locale that has any content, for the case where no baseline can be established.
  translationScope: 'changed' | 'all'
}

export interface TemplateExportResult {
  filePath: string
  bytes: number
  parts: TemplatePartSummary[]
}

// Which side wins when the target project already has the thing a part brings. Chosen per import;
// a snapshot is taken first either way, so 'packageWins' is recoverable.
export type TemplateConflictStrategy = 'packageWins' | 'projectWins'

// What one part would actually do to *this* project, computed by reading both the package and the
// target before anything is written - the old preview only echoed the manifest, so the first time
// a user learned what an import changed was from the warnings afterwards.
export interface TemplatePartPlan {
  id: TemplatePartId
  // Everything the part would create that the project does not have yet.
  additions: string[]
  // Everything that already exists and would be replaced ('packageWins') or skipped
  // ('projectWins') - the strategy switch flips the meaning of this list, not its contents.
  conflicts: string[]
  // npm packages this part needs that the project does not have installed.
  missingPackages: TemplatePackageDependency[]
  // Anything the user should know that is neither an addition nor a conflict, e.g. a translation
  // key that no longer exists in the target's Quartz version.
  notes: string[]
}

export interface TemplatePackagePlan {
  manifest: TemplatePackageManifest
  parts: TemplatePartPlan[]
  // Part ids present in the package that this app version does not know - a package written by a
  // newer QuartzControl. Listed rather than ignored, so "es fehlt etwas" is visible.
  unknownParts: string[]
  // True for a package in the pre-1 folder format, which has no formatVersion and a fixed set of
  // files; it is read but can never be written again.
  legacy: boolean
}

export interface TemplatePackageImportResult {
  success: boolean
  warnings: string[]
}

// Emitted on IPC.templatePackageProgress while an import runs. npm installs dominate the runtime,
// so the message carries what is happening rather than only a fraction.
export interface TemplateImportProgress {
  projectPath: string
  partId: TemplatePartId | null
  message: string
  done: number
  total: number
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

// One row of the launcher's project list. Everything here is a local file read plus the
// dev-server status the main process already holds in memory - the start screen must not cost a
// network round trip, same rule the project Übersicht follows. Computed in one pass in main
// rather than N renderer round trips.
export interface ProjectOverview extends Project {
  /** The folder is gone - moved, renamed, or on a volume that isn't mounted. */
  missing: boolean
  /** The folder exists but holds no quartz.config.yaml. `projects.add` never checked, so a
   *  plain folder could always be added and only failed once its project page was opened. */
  isQuartzProject: boolean
  siteTitle?: string
  baseUrl?: string
  serverRunning: boolean
  serverPort?: number
  /**
   * The project's own picture as a data: URL, or undefined when it still carries the icon Quartz
   * ships - those are identical in every project, so the launcher falls back to the letter avatar
   * rather than rendering the same stock image on every card. See projectIconService.
   */
  icon?: string
}

/** The project's picture, which is also the source the favicon emitter reads. */
export interface ProjectIconInfo {
  /** quartz/static/icon.png scaled down for display, or null when there is no readable icon. */
  dataUrl: string | null
  /** True when the image was assigned in this app rather than being the one Quartz shipped. */
  custom: boolean
  /** Pixel size of the file on disk; 0 when there is none. */
  width: number
  height: number
}

/** Versions and storage locations for the Settings page's maintenance section. */
export interface ToolInfo {
  name: string
  /**
   * Where this tool comes from. 'embedded' means it travels with the app - node and npm run on
   * Electron's own Node (nodeRuntime.ts), so a machine without Node installed is not a problem
   * to report but the normal case. 'host' means the user's system provides it, which is git and,
   * where a target asks for it, rsync: the app cannot supply those, so a missing one is worth a
   * warning band.
   */
  source: 'embedded' | 'host'
  /** Absolute path the executable resolved to, or null when it is not on PATH at all. */
  path: string | null
  /**
   * The tool's own `--version` output. Null while `path` is set means the file exists but does
   * not run - the state a macOS without the Xcode command line tools is in, where /usr/bin/git
   * is a stub that opens an installer instead of doing anything.
   */
  version: string | null
}

/** How the app's secrets are actually protected, which is not the same question everywhere. */
export interface SecretStorageInfo {
  available: boolean
  /**
   * Electron's chosen backend. On Linux without a running keyring this is `basic_text`, which
   * reports as available while encrypting with a hardcoded key - so secrets are effectively
   * plaintext and the user has to be told. Null where the platform has only one answer.
   */
  backend: string | null
  /** True when the backend is real OS-keychain-backed encryption rather than the text fallback. */
  secure: boolean
}

/** What the machine can do, for the start screen to state instead of failing later. */
export interface EnvironmentInfo {
  platform: string
  /**
   * Where the PATH that finds node/npm came from. 'inherited' means the process already had it
   * (every terminal start); the other two mean the app had to go looking, which is what a packaged
   * app launched from the Dock or a desktop launcher needs.
   */
  pathSource: 'inherited' | 'login-shell' | 'probed'
  addedPaths: string[]
  tools: ToolInfo[]
  /**
   * What a `node` on the user's own PATH answers, ignoring the app's shims - null when there is
   * none. Not one of `tools`: it is not what the app uses, it is what switching the runtime to
   * 'system' would get you, which is the one thing that choice needs to say out loud.
   */
  hostNodeVersion: string | null
  /** True when every tool both exists and runs. */
  ok: boolean
  /**
   * Whether an rsync binary is on PATH. Deliberately not one of `tools`: rsync is optional - only
   * an SFTP target switched to the rsync transfer needs it - so a machine without it is not a
   * broken environment and must not turn `ok` false. The publish form asks for this to decide
   * whether to offer the transfer at all (see rsyncBlockReason).
   */
  rsyncAvailable: boolean
  secretStorage: SecretStorageInfo
}

export interface AppInfo {
  appVersion: string
  electronVersion: string
  chromeVersion: string
  userDataPath: string
  /** The permanent upstream-theme documentation cache (see styleSettingsSchemaService). */
  themeDocsCache: { entries: number; bytes: number }
  /**
   * Stores this session found on disk but could not read - moved aside as `<name>.corrupt-<time>`
   * rather than overwritten (see jsonStore). Normally empty; when it is not, something the user
   * saved is missing from the app and the file that held it is still there to look at.
   */
  unreadableStores: { path: string; quarantinedAs: string | null }[]
}

export const IPC = {
  projectList: 'project:list',
  projectOverview: 'project:overview',
  projectAdd: 'project:add',
  projectRelocate: 'project:relocate',
  projectOpen: 'project:open',
  projectRemove: 'project:remove',
  projectCreate: 'project:create',
  projectDuplicate: 'project:duplicate',
  appUpdateCheck: 'appUpdate:check',
  templatePackageBuiltin: 'templatePackage:builtin',

  projectIconGet: 'projectIcon:get',
  projectIconSet: 'projectIcon:set',
  projectIconClear: 'projectIcon:clear',

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
  themeMarketplaceRefresh: 'themeMarketplace:refresh',
  themePresetList: 'themePreset:list',
  themePresetSave: 'themePreset:save',
  themePresetDelete: 'themePreset:delete',
  pluginInstallFromLock: 'plugin:installFromLock',
  pluginPrune: 'plugin:prune',

  layoutFrameList: 'layoutFrame:list',
  layoutFrameSave: 'layoutFrame:save',
  layoutFrameDelete: 'layoutFrame:delete',
  layoutFrameBuiltinPageTypeFrames: 'layoutFrame:builtinPageTypeFrames',
  layoutFrameGetBreakpoints: 'layoutFrame:getBreakpoints',
  layoutFrameSaveBreakpoints: 'layoutFrame:saveBreakpoints',

  stylesGet: 'styles:get',
  stylesSave: 'styles:save',
  stylesReference: 'styles:reference',
  stylesImportFile: 'styles:importFile',
  stylesListFiles: 'styles:listFiles',
  stylesReadFile: 'styles:readFile',
  stylesSaveFile: 'styles:saveFile',
  stylesCreateFile: 'styles:createFile',
  stylesRenameFile: 'styles:renameFile',
  stylesDeleteFile: 'styles:deleteFile',
  stylesSetImportOrder: 'styles:setImportOrder',
  stylesCheck: 'styles:check',
  stylesCheckSource: 'styles:checkSource',
  stylesFontFaces: 'styles:fontFaces',
  stylesGetVariableOverrides: 'styles:getVariableOverrides',
  stylesSaveVariableOverrides: 'styles:saveVariableOverrides',
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
  snapshotList: 'snapshot:list',
  snapshotCreate: 'snapshot:create',
  snapshotDiff: 'snapshot:diff',
  snapshotFileDiff: 'snapshot:fileDiff',
  snapshotRestore: 'snapshot:restore',
  snapshotDelete: 'snapshot:delete',
  snapshotExport: 'snapshot:export',
  snapshotSettings: 'snapshot:settings',
  snapshotSaveSettings: 'snapshot:saveSettings',

  connectionsList: 'connections:list',
  connectionSave: 'connections:save',
  connectionDelete: 'connections:delete',
  connectionUsage: 'connections:usage',
  connectionForgetHostKey: 'connections:forgetHostKey',

  githubViewer: 'github:viewer',
  githubOriginRepo: 'github:originRepo',
  githubCreateRepo: 'github:createRepo',
  githubPagesInfo: 'github:pagesInfo',
  githubConfigurePages: 'github:configurePages',

  publishTargetsList: 'publishTargets:list',
  publishTargetSave: 'publishTargets:save',
  publishTargetDelete: 'publishTargets:delete',

  deployDiff: 'deploy:diff',
  deployRun: 'deploy:run',
  deployForgetManifest: 'deploy:forgetManifest',
  deployProgress: 'deploy:progress',
  dialogPickFile: 'dialog:pickFile',
  dialogOpenPath: 'dialog:openPath',

  templatePackageExport: 'templatePackage:export',
  templatePackageInspect: 'templatePackage:inspect',
  templatePackagePick: 'templatePackage:pick',
  templatePackagePlan: 'templatePackage:plan',
  templatePackageImport: 'templatePackage:import',
  templatePackageProgress: 'templatePackage:progress',

  marketplaceList: 'marketplace:list',
  marketplaceRefresh: 'marketplace:refresh',

  serverStart: 'server:start',
  serverStop: 'server:stop',
  serverRestart: 'server:restart',
  serverStatus: 'server:status',
  serverStatusChanged: 'server:statusChanged',
  serverLog: 'server:log',
  serverDiscover: 'server:discover',
  serverKill: 'server:kill',

  buildRun: 'build:run',
  buildLog: 'build:log',
  logsHistory: 'logs:history',
  logsClear: 'logs:clear',
  buildLastOutput: 'build:lastOutput',
  projectPrefsGet: 'projectPrefs:get',
  projectPrefsSave: 'projectPrefs:save',

  syncRun: 'sync:run',
  syncStatus: 'sync:status',

  backupList: 'backup:listContentFolders',
  backupRestore: 'backup:restoreContentFolder',
  backupDelete: 'backup:deleteContentFolder',

  contentStatus: 'content:status',
  contentChange: 'content:change',
  contentProgress: 'content:progress',

  settingsGet: 'settings:get',
  settingsSave: 'settings:save',
  settingsAppInfo: 'settings:appInfo',
  settingsEnvironment: 'settings:environment',
  settingsClearThemeDocsCache: 'settings:clearThemeDocsCache',

  dialogPickFolder: 'dialog:pickFolder',
  dialogRevealUserData: 'dialog:revealUserData',
  dialogOpenHandbook: 'dialog:openHandbook',
  dialogOpenExternal: 'dialog:openExternal',
  dialogConfirm: 'dialog:confirm',

  /** main → renderer: a menu item asking the HashRouter to go somewhere. */
  appNavigate: 'app:navigate',
  /** main → renderer: a menu item asking the mounted page to do something (Cmd+S, today). */
  appCommand: 'app:command'
} as const

/**
 * What a menu item can ask the current page to do. One command today; it is a union rather than a
 * bare string so a second one (Cmd+R for "reload this page's document"?) is a change the typecheck
 * walks through, and so the renderer's switch is exhaustive.
 */
export type AppCommand = 'save'

/**
 * Which button was pressed. A union rather than a boolean because the dialog can carry a third
 * answer (see `altLabel`); `confirmDialog()` in the renderer still hands the two-answer callers a
 * boolean, so the eighteen existing questions are unchanged.
 */
export type ConfirmAnswer = 'cancel' | 'alt' | 'confirm'

/** One object argument on purpose (new-channel rule): an optional field later is one key here
 *  and one in the schema, not a fourth positional slot in four files. */
export interface ConfirmDialogOptions {
  /** The question, in one line - the bold headline of the native dialog. */
  message: string
  /** What confirming does and what it does not do; the dialog's body text. */
  detail?: string
  /**
    * A third answer between cancelling and confirming, named after *its* action ("Speichern" beside
    * "Änderungen verwerfen"). Optional, because almost every question here has two answers; the one
    * that has three is leaving a page with unsaved changes, where "cancel or lose it" is not the
    * whole set of things a person might want.
    */
  altLabel?: string
  /** The confirming button, named after the action ("Snapshot löschen"), never "OK". */
  confirmLabel: string
  /** Deletes, overwrites or ships something: shown with the warning icon. */
  danger?: boolean
}

export interface Settings {
  /** Pre-fills the folder pickers on the start screen and the create wizard. */
  defaultProjectDirectory?: string
  // 'system' (default) follows the OS locale with an English fallback; 'de'/'en' pin the language.
  language?: 'system' | 'de' | 'en'
  // 'system' (default) follows the OS appearance. Applied in the main process via
  // nativeTheme.themeSource, which also flips the renderer's own prefers-color-scheme - verified
  // against this repo's Electron binary. That is why Tailwind stays on darkMode: 'media' and
  // every existing `dark:` variant keeps working with no class-strategy migration.
  theme?: 'system' | 'light' | 'dark'
  /**
   * Which Node runs Quartz and npm. 'embedded' (default) uses Electron's own - see nodeRuntime.ts
   * for why that is the default rather than the user's. 'system' is the way out for the one case
   * that needs it: a package that has to be compiled with node-gyp, which wants real Node headers
   * and cannot be served by Electron's runtime. Takes effect for processes started afterwards; a
   * running dev server keeps the environment it was started with.
   */
  nodeRuntime?: 'embedded' | 'system'
  /**
   * What happens to a running dev server when the app quits. 'ask' (default) puts the question up
   * with the three answers; the other two are what the dialog's "Nicht mehr fragen" checkbox
   * writes, and the Einstellungen page is the way back to asking - a checkbox that cannot be
   * undone anywhere is a one-way door.
   */
  serversOnQuit?: 'ask' | 'stop' | 'keep'
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

/**
 * Copying an existing project into a new folder. The content folder is not copied along: the
 * original's is either a link into a vault - which two projects would then write through at once,
 * without either of them saying so - or a folder the copy has no claim to. The dialog asks where
 * the copy's own content comes from, and `blank` is the honest answer for "I want the design, not
 * the notes".
 */
export interface DuplicateProjectOptions {
  sourcePath: string
  targetDirectory: string
  contentStrategy: ContentStrategy | 'blank'
  /** The folder to link to or copy in. Required unless the strategy is `blank`. */
  contentSource?: string
}

export interface DuplicateProjectResult {
  success: boolean
  output: string
}

/**
 * Whether a newer build of the app itself exists. `unknown` is its own answer: a failed check is
 * not an up-to-date one, and a start screen that claims "you have the latest" because GitHub was
 * unreachable would be lying at the one moment it matters.
 */
export interface AppUpdateStatus {
  state: 'current' | 'newer' | 'unknown'
  /** What is running right now. */
  current: string
  /** What the server named, when it answered. */
  latest?: string
  /** Where to get it - https only, checked in main. */
  url?: string
  notes?: string
}

// The renderer-facing API exposed on window.quartzGui by the preload script.
export interface QuartzGuiApi {
  /**
   * process.platform, read straight off the preload rather than fetched over IPC: the renderer
   * needs it during the very first render (the title-bar drag strip only exists on macOS, where
   * the traffic lights are inset over the app's own header), and an async answer would paint the
   * wrong layout first.
   */
  platform: string
  /**
   * The user's home directory, on the bridge for the same reason as `platform`: it is needed to
   * expand a leading "~" in a path the user types, which has to happen before the value crosses
   * IPC - every path schema requires an absolute one. Without it the Settings page's own
   * "~/Documents" placeholder was a value the app refused. Main hands it to the sandboxed preload
   * on argv (webPreferences.additionalArguments), since `os` is out of reach in there.
   */
  homeDir: string
  projects: {
    list(): Promise<Project[]>
    /** The list plus what the launcher shows per row. Local reads only - see ProjectOverview. */
    overview(): Promise<ProjectOverview[]>
    add(path: string): Promise<Project>
    /** Points an existing entry at a folder that moved, keeping its id - so everything keyed by
     *  that id (remembered tabs, running-server tracking) survives the move. */
    relocate(id: string, path: string): Promise<Project | undefined>
    open(id: string): Promise<Project | undefined>
    remove(id: string): Promise<void>
    create(options: CreateProjectOptions): Promise<CreateProjectResult>
    /** Copies a project into a new folder and registers it. Everything the original's own past or
     *  outside world belongs to stays behind - see duplicateService for the list and the reasons. */
    duplicate(options: DuplicateProjectOptions): Promise<DuplicateProjectResult>
  }
  /** Is there a newer build of QuartzControl? An answer, not an updater - nothing is downloaded. */
  appUpdate: {
    check(): Promise<AppUpdateStatus>
  }
  /**
   * The project's picture. One file - quartz/static/icon.png - because that is the only path the
   * favicon emitter reads, so what the app shows and what the site ships cannot drift apart.
   */
  projectIcon: {
    get(args: { projectPath: string }): Promise<ProjectIconInfo>
    /** Copies `sourcePath` in, normalized to PNG and capped at 512px. Throws on a format
     *  nativeImage cannot decode (SVG among them) rather than writing an unusable icon.png. */
    set(args: { projectPath: string; sourcePath: string }): Promise<ProjectIconInfo>
    /** Puts back the icon the project came with - see projectIconService for why not a delete. */
    clear(args: { projectPath: string }): Promise<ProjectIconInfo>
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
    getBreakpoints(projectPath: string): Promise<FrameBreakpointWidths>
    // Rewrites every authored frame's generated CSS as well - the widths are baked into each
    // frame's media queries at codegen time, so a frame not rewritten here would keep the old ones.
    saveBreakpoints(projectPath: string, widths: FrameBreakpointWidths): Promise<void>
  }
  styles: {
    get(projectPath: string): Promise<StylesInfo>
    save(projectPath: string, content: string): Promise<void>
    reference(projectPath: string, pluginName: string): Promise<StyleReferenceFile[]>
    importFile(projectPath: string, sourcePath: string): Promise<{ importLine: string; relativePath: string }>
    listFiles(projectPath: string): Promise<StyleFileSet>
    readFile(projectPath: string, relativePath: string): Promise<string>
    saveFile(projectPath: string, relativePath: string, content: string): Promise<void>
    createFile(projectPath: string, name: string): Promise<StyleFile>
    renameFile(projectPath: string, relativePath: string, newName: string): Promise<StyleFile>
    deleteFile(projectPath: string, relativePath: string): Promise<void>
    setImportOrder(projectPath: string, relativePaths: string[]): Promise<void>
    check(projectPath: string): Promise<ScssCheckResult>
    /** Compiles one file's *unsaved* content on its own - each stylesheet is its own Sass module. */
    checkSource(projectPath: string, relativePath: string, content: string): Promise<ScssCheckResult>
    fontFaces(projectPath: string, themeId?: string): Promise<FontFaceInfo[]>
    getVariableOverrides(projectPath: string): Promise<CssVariableOverride[]>
    saveVariableOverrides(projectPath: string, overrides: CssVariableOverride[]): Promise<void>
    variableGraph(projectPath: string, themeId?: string, outputDir?: string): Promise<CssVariableGraph>
  }
  fonts: {
    /**
     * Copies the file into the project and appends a `@font-face` for it.
     *
     * `weight` and `italic` are what the *file* says - the wght axis of a variable font, else its
     * OS/2 weight class, plus the italic bit. `weight` is absent when the file does not say (a
     * font with no OS/2 table, for instance); the rule is then written without a weight, which is
     * what it always was, and the caller can tell the user that nothing was detected.
     */
    importFile(projectPath: string, sourcePath: string, family: string): Promise<{ fileName: string; weight?: string; italic?: boolean }>
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
  }
  connections: {
    list(): Promise<Connection[]>
    save(input: SaveConnectionInput): Promise<Connection>
    delete(id: string): Promise<void>
    /** Which registered projects have a target pointing at this connection - deleting one that is
     *  still in use would leave those targets dangling, so the caller checks first. */
    usage(id: string): Promise<{ projectPath: string; targetName: string }[]>
    forgetHostKey(id: string): Promise<void>
  }
  github: {
    /** Who the stored token belongs to; null when there is no token or it is rejected. */
    viewer(): Promise<GithubAccount | null>
    /** The project's origin remote, if it points at github.com. */
    originRepo(projectPath: string): Promise<GithubRepoRef | null>
    createRepo(projectPath: string, input: { name: string; private: boolean; description?: string }): Promise<PluginActionResult>
    pagesInfo(projectPath: string): Promise<GithubPagesInfo | null>
    configurePages(
      projectPath: string,
      input: { branch: string; cname?: string | null; httpsEnforced?: boolean }
    ): Promise<PluginActionResult>
  }
  publishTargets: {
    list(projectPath: string): Promise<PublishTarget[]>
    save(projectPath: string, input: SavePublishTargetInput): Promise<PublishTarget>
    delete(projectPath: string, id: string): Promise<void>
  }
  deploy: {
    /** What this target would upload/delete. Manifest-based for sftp/ftp/folder, a real remote
     *  dry-run for rsync, and empty for a webhook, which has nothing to diff. */
    diff(projectPath: string, targetId: string, outputDir?: string): Promise<DeployDiffEntry[]>
    run(projectPath: string, targetId: string, outputDir: string | undefined, excludePaths: string[]): Promise<DeployResult>
    /** Discards what this app believes it last sent to this target, so the next diff offers the
     *  whole build again. For everything the manifest cannot see: a file deleted on the server by
     *  hand, an interrupted transfer, a site rolled back from the provider's own backup. */
    forgetManifest(projectPath: string, targetId: string): Promise<void>
    onProgress(cb: (event: DeployProgressEvent) => void): () => void
  }
  templatePackage: {
    /** What each part would contribute, so the export form can show counts before writing. */
    inspect(projectPath: string): Promise<TemplatePartSummary[]>
    /**
     * The example template the app can offer while a project is being created - a path, so that
     * everything after this point is the ordinary import: plan(), then import(). Null when neither
     * a downloaded nor a bundled copy exists. `source` says which of the two answered, because a
     * dialog that has been offline for a week should be able to say so.
     */
    builtin(): Promise<{ path: string; source: 'downloaded' | 'bundled' } | null>
    /** Opens the package chooser. Accepts a folder too, for packages in the pre-1 folder format. */
    pick(): Promise<string | null>
    /** Resolves to null when the user cancelled the save dialog. */
    export(projectPath: string, options: TemplateExportOptions): Promise<TemplateExportResult | null>
    /** Resolves to null when the chosen path is not a readable package. */
    plan(projectPath: string, packagePath: string): Promise<TemplatePackagePlan | null>
    import(
      projectPath: string,
      packagePath: string,
      parts: TemplatePartId[],
      strategy: TemplateConflictStrategy
    ): Promise<TemplatePackageImportResult>
    onProgress(cb: (progress: TemplateImportProgress) => void): () => void
  }
  themeMarketplace: {
    list(): Promise<ThemeCatalogResult>
    refresh(): Promise<void>
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
    /**
     * The whole catalog. Deliberately not a query: the search box filters the org's ~60
     * repositories in the renderer, where it costs nothing, rather than crossing IPC per
     * keystroke - and when GitHub is unreachable a failed fetch is never cached (on purpose),
     * so a per-keystroke call meant one GitHub request per typed character.
     */
    list(): Promise<MarketplaceResult>
    refresh(): Promise<void>
  }
  server: {
    start(projectId: string, projectPath: string, options?: ServerOptions): Promise<ServerStatus>
    stop(projectId: string): Promise<void>
    restart(projectId: string, projectPath: string, options?: ServerOptions): Promise<ServerStatus>
    status(projectId: string): Promise<ServerStatus>
    onLog(cb: (line: LogLine) => void): () => void
    onStatus(cb: (projectId: string, status: ServerStatus) => void): () => void
    /**
     * Every Quartz dev server running on this machine, including ones started outside the app -
     * a terminal, another window, a previous run that was force-quit. `ports` asks additionally
     * whether those specific ports answer, which is how "8080 is taken by something that is not
     * Quartz" gets an answer at all.
     */
    discover(input?: { ports?: number[] }): Promise<ServerDiscovery>
    /**
     * Stops a server found by discover(). Verifies the pid still belongs to a Quartz server
     * before signalling - a pid recycled between the listing and the click would otherwise be
     * someone else's process. A pid this app started goes through the normal stop path, so its
     * status and log keep working.
     */
    kill(input: { pid: number }): Promise<ServerKillResult>
  }
  build: {
    run(projectId: string, projectPath: string, outputDir?: string): Promise<BuildResult>
    onLog(cb: (line: LogLine) => void): () => void
    /** What is in the output directory right now - see BuildOutputInfo. Pure read, no build. */
    lastOutput(projectPath: string, outputDir?: string): Promise<BuildOutputInfo>
  }
  logs: {
    /**
     * What the main process has buffered for this project. The renderer's own log store lives and
     * dies with the window, and on macOS closing the window does not stop the dev server - so
     * without this the output of a server that kept running is simply gone when the window comes
     * back. Read once per project mount; the live events carry on from there.
     */
    history(input: { projectId: string }): Promise<LogHistory>
    /** Empties one of the two buffers, so "Ausgabe leeren" does not come back on the next read. */
    clear(input: { projectId: string; stream: 'server' | 'build' }): Promise<void>
  }
  projectPrefs: {
    get(projectPath: string): Promise<ProjectPrefs>
    save(projectPath: string, prefs: ProjectPrefs): Promise<void>
  }
  sync: {
    run(projectPath: string, direction?: 'push' | 'pull' | 'both', options?: SyncOptions): Promise<SyncResult>
    status(projectPath: string): Promise<GitStatus>
  }
  backups: {
    listContentFolders(projectPath: string): Promise<BackupEntry[]>
    restoreContentFolder(projectPath: string, id: string): Promise<void>
    /** Irreversible: this is the only copy of a folder the content switch moved aside. */
    deleteContentFolder(projectPath: string, id: string): Promise<void>
  }
  snapshots: {
    list(projectPath: string): Promise<Snapshot[]>
    /** Resolves to null when an automatic snapshot was skipped because nothing had changed. */
    create(projectPath: string, kind: SnapshotKind, label?: string): Promise<Snapshot | null>
    diff(projectPath: string, id: string): Promise<SnapshotFileChange[]>
    fileDiff(projectPath: string, id: string, path: string): Promise<string>
    restore(projectPath: string, id: string, options?: RestoreOptions): Promise<PluginActionResult>
    delete(projectPath: string, id: string): Promise<void>
    /** Resolves to false when the user cancelled the save dialog. */
    export(projectPath: string, id: string): Promise<boolean>
    settings(projectPath: string): Promise<SnapshotSettings>
    saveSettings(projectPath: string, includeContent: boolean): Promise<SnapshotSettings>
  }
  content: {
    status(projectPath: string): Promise<ContentStatus>
    change(projectId: string, projectPath: string, sourcePath: string, strategy: ContentStrategy): Promise<void>
    onProgress(cb: (progress: ContentProgress) => void): () => void
  }
  settings: {
    get(): Promise<Settings>
    /** Always send the whole object - the store overwrites rather than merges. */
    save(settings: Settings): Promise<void>
    appInfo(): Promise<AppInfo>
    /** Not cached: a user who installs Node because this told them to expects a fresh answer. */
    environment(): Promise<EnvironmentInfo>
    /** Empties the theme-docs cache; returns how many entries were removed. */
    clearThemeDocsCache(): Promise<number>
  }
  dialog: {
    /** `defaultPath` pre-selects a starting folder (the Settings default project directory). */
    pickFolder(defaultPath?: string): Promise<string | null>
    pickFile(filters?: { name: string; extensions: string[] }[]): Promise<string | null>
    openPath(path: string): Promise<void>
    /** Shows Electron's userData directory in the OS file manager. Takes no path on purpose. */
    revealUserData(): Promise<void>
    /**
     * Opens the bundled handbook in the default browser. Takes no filesystem path for the same
     * reason revealUserData does: there is exactly one handbook, and only main knows where it is.
     * `page` names a page inside it ("4-gestaltung/04-variablen", no extension) so a screen can
     * link the chapter that explains it; without one, the start page. A page that is not in the
     * handbook falls back to the start page without a word - a link pointing nowhere is a mistake
     * in the handbook, and the reader cannot act on it. The native dialog is for the two cases the
     * reader can: this build was packaged without the handbook, or it could not be opened.
     */
    openHandbook(options?: { page?: string }): Promise<void>
    /** Opens an https URL in the default browser. Refused for anything else. */
    openExternal(url: string): Promise<void>
    /**
     * A yes/no question as a native dialog, answered true only for the confirming button. Every
     * confirmation in the renderer goes through this rather than window.confirm(): that dialog's
     * default button belongs to Chromium, and Return confirms - measured in the main process
     * (see the build-guard dialog), Return takes the first button regardless of `defaultId`, so
     * the safe answer has to sit first, which is what the handler arranges and window.confirm()
     * cannot. Its buttons also do not follow the app's language setting.
     */
    confirm(options: ConfirmDialogOptions): Promise<ConfirmAnswer>
  }
  menu: {
    /**
     * Fires when a native menu item wants the renderer to navigate (Settings, today). The menu is
     * built in the main process and the routes live in a HashRouter, so this event is the only way
     * across. App.tsx installs the single listener for the app's lifetime.
     */
    onNavigate(cb: (hashPath: string) => void): () => void
    /**
     * Fires when a menu item wants the *mounted page* to act rather than the router to move -
     * Speichern (Cmd+S) today. The menu cannot know whether anything is there to save, so the
     * renderer decides: a page registers its save while it has one (see state/saveCommand.ts),
     * and a command nobody registered for does nothing.
     */
    onCommand(cb: (command: AppCommand) => void): () => void
  }
}
