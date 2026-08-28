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
}

export interface MarketplacePlugin {
  name: string
  fullName: string
  description?: string
  stars?: number
  url: string
  topics?: string[]
}

// A content directory that was moved aside when the content source was switched - see
// backupService. Not a snapshot; those are Snapshot/snapshotService.
export interface BackupEntry {
  id: string
  createdAt: string
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
  buildLastOutput: 'build:lastOutput',

  syncRun: 'sync:run',
  syncStatus: 'sync:status',

  backupList: 'backup:listContentFolders',
  backupRestore: 'backup:restoreContentFolder',

  contentStatus: 'content:status',
  contentChange: 'content:change',
  contentProgress: 'content:progress',

  settingsGet: 'settings:get',
  settingsSave: 'settings:save',

  dialogPickFolder: 'dialog:pickFolder'
} as const

export interface Settings {
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
    onProgress(cb: (event: DeployProgressEvent) => void): () => void
  }
  templatePackage: {
    export(projectPath: string, destDir: string, name: string, categories: TemplatePackageCategory[]): Promise<{ packageDir: string }>
    preview(sourceDir: string): Promise<TemplatePackagePreview | null>
    import(projectPath: string, sourceDir: string, categories: TemplatePackageCategory[]): Promise<TemplatePackageImportResult>
  }
  themeMarketplace: {
    list(): Promise<QuartzThemeListing[]>
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
    search(query: string): Promise<MarketplacePlugin[]>
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
    /** What is in the output directory right now - see BuildOutputInfo. Pure read, no build. */
    lastOutput(projectPath: string, outputDir?: string): Promise<BuildOutputInfo>
  }
  sync: {
    run(projectPath: string, direction?: 'push' | 'pull' | 'both'): Promise<SyncResult>
    status(projectPath: string): Promise<GitStatus>
  }
  backups: {
    listContentFolders(projectPath: string): Promise<BackupEntry[]>
    restoreContentFolder(projectPath: string, id: string): Promise<void>
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
    save(settings: Settings): Promise<void>
  }
  dialog: {
    pickFolder(): Promise<string | null>
    pickFile(filters?: { name: string; extensions: string[] }[]): Promise<string | null>
    openPath(path: string): Promise<void>
  }
}
