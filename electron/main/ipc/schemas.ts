import { isAbsolute } from 'path'
import { z } from 'zod'

// Validation for everything crossing the IPC boundary. The renderer is not a trust boundary the
// main process can rely on: contextIsolation keeps *our* preload honest, but any script execution
// in the renderer (the Marketplace and Themes tabs render data fetched from GitHub) would
// otherwise reach services that spawn processes, delete directories and write files at arbitrary
// paths. Every handler therefore declares the exact shape of its arguments; see handlers.ts.
//
// IMPORTANT: anything that is written back to disk must preserve keys this app does not know
// about. z.object() STRIPS unknown keys, which would silently drop a plugin entry's `layout`
// field on the next save - the exact round-trip configService.ts goes out of its way to protect.
// Use z.looseObject()/z.record() for those payloads, never a plain z.object().

// ── primitives ──────────────────────────────────────────────────────────────

// Every path reaching the main process originates from a native dialog or the project store, so
// it is always absolute. Requiring that rules out relative traversal tricks up front.
export const absolutePath = z
  .string()
  .min(1)
  .max(4096)
  .refine((p) => isAbsolute(p), { message: 'Pfad muss absolut sein' })

// A path fragment joined onto a project directory (e.g. the build output dir). Must stay inside.
export const relativeSubPath = z
  .string()
  .min(1)
  .max(1024)
  .refine((p) => !isAbsolute(p), { message: 'Pfad darf nicht absolut sein' })
  .refine((p) => !p.split(/[\\/]/).includes('..'), { message: 'Pfad darf kein ".." enthalten' })

// A build output directory may be either: relative to the project ("dist", the common case) or
// an absolute path the user picked from the folder dialog in BuildServer's one-off export. Both
// have to pass, and resolveBuildDir() in projectDirs.ts is what interprets them consistently.
export const buildOutputDir = z.union([absolutePath, relativeSubPath])

// One filesystem name: no separators, no "."/".." - safe to join onto a directory.
export const safeSegment = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9._-]+$/, 'nur Buchstaben, Ziffern, Punkt, Unterstrich und Bindestrich')
  .refine((s) => s !== '.' && s !== '..', { message: '"." und ".." sind nicht erlaubt' })

// backupService derives these from timestampId(): "2026-08-23T10-00-00-000Z". They are joined onto
// the backups directory (and get ".yaml" appended), so the exact generated format is enforced
// rather than a loose slug.
export const backupId = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/, 'kein gültiger Backup-Bezeichner')

// updateService tags snapshots as `quartz-gui-backup-<timestamp>` and passes the tag to
// `git reset --hard <tag>`; pinning the prefix also stops a value starting with "-" from being
// read as a git flag.
export const snapshotTag = z
  .string()
  .regex(/^quartz-gui-backup-[\dTZ-]{1,40}$/, 'kein gültiger Snapshot-Tag')

// npm package name segment - becomes a path segment (node_modules/@quartz-themes/<id>) and an
// `npm install` argument.
export const themeId = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, 'kein gültiger Theme-Bezeichner')

// A plugin's display name, optionally npm-scoped ("@quartz-community/explorer"). Used both as a
// CLI argument and as a path segment under .quartz/plugins/.
export const pluginName = z
  .string()
  .min(1)
  .max(214)
  .regex(/^(@[A-Za-z0-9._-]+\/)?[A-Za-z0-9._-]+$/, 'kein gültiger Plugin-Name')
  .refine((n) => !n.split('/').includes('..'), { message: '".." ist nicht erlaubt' })

// What `quartz plugin add` accepts: github:/git+/https:/ a local absolute path / a bare npm name.
// Leading "-" is refused so a source can never be read as a CLI flag.
export const pluginSource = z
  .string()
  .min(1)
  .max(2048)
  .refine((s) => !s.startsWith('-'), { message: 'Quelle darf nicht mit "-" beginnen' })

// Locale file basename under quartz/i18n/locales (e.g. "de-DE").
export const localeCode = z
  .string()
  .min(2)
  .max(35)
  .regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, 'kein gültiger Locale-Code')

// A git branch name for the Pages deploy. Refuses the characters git itself rejects, plus a
// leading "-" (flag injection). The "don't overwrite main" rule lives in githubPagesService,
// which is the only place that can resolve what the default branch actually is.
export const branchName = z
  .string()
  .min(1)
  .max(255)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._\/-]*$/, 'kein gültiger Branch-Name')
  .refine((b) => !b.includes('..') && !b.endsWith('.lock'), { message: 'kein gültiger Branch-Name' })

// Frame ids and CSS area names end up in generated CSS/JS - keep them to plain identifiers.
// layoutFrameService enforces the same id rule again at its own boundary.
export const frameId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/i, 'kein gültiger Frame-Bezeichner')
export const cssIdent = z.string().regex(/^[A-Za-z_][A-Za-z0-9_-]{0,63}$/, 'kein gültiger CSS-Bezeichner')

// An additional stylesheet under quartz/styles. Pinned to the two directories the app itself
// creates, because this value is joined onto the project path and then written to, renamed and
// deleted - a bare relativeSubPath would still allow quartz/styles/base.scss (Quartz's own file)
// or anything else under the tree. The extension is fixed too: the file ends up in an @use rule.
export const styleFileSubPath = z
  .string()
  .max(1024)
  .regex(/^(custom|imported)\/[A-Za-z0-9._-]+\.(scss|css)$/, 'kein gültiger Stylesheet-Pfad')
  // Guards against undefined rather than trusting the regex above: zod v4 keeps running the checks
  // of a schema after one of them failed, so this refine also sees values the regex just rejected -
  // and a TypeError thrown here replaces the readable validation error with a crash.
  .refine((p) => !(p.split('/')[1] ?? '').startsWith('.'), { message: 'Dateiname darf nicht mit "." beginnen' })

// The same, plus custom.scss itself - the one file that is edited but is not part of the order.
export const styleEntryPath = z.union([z.literal('custom.scss'), styleFileSubPath])

// The name for a newly created or renamed stylesheet - one segment, the service appends ".scss".
export const styleFileName = z
  .string()
  .min(1)
  .max(96)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'nur Buchstaben, Ziffern, Punkt, Unterstrich und Bindestrich')

export const uuid = z.uuid()
export const shortText = z.string().max(512)
export const longText = z.string().max(5_000_000) // custom.scss and locale values

// ── enums ───────────────────────────────────────────────────────────────────

export const contentStrategy = z.enum(['copy', 'symlink'])
export const backupKind = z.enum(['config', 'content'])
export const syncDirection = z.enum(['push', 'pull', 'both'])
export const layoutPosition = z.enum(['header', 'left', 'right', 'beforeBody', 'afterBody', 'footer'])
export const frameSlot = z.enum([...layoutPosition.options, 'pageBody'])
export const templatePackageCategory = z.enum(['layout', 'colors', 'plugins', 'frames', 'styles', 'fonts'])

// ── payloads ────────────────────────────────────────────────────────────────

// Loose on purpose: configuration/theme are open records in the contract, and a plugin entry
// carries extra keys (layout, order, options) that must survive a save untouched.
export const quartzConfig = z.looseObject({
  configuration: z.record(z.string(), z.unknown()),
  theme: z.record(z.string(), z.unknown()),
  plugins: z.array(
    z.looseObject({
      // readConfig always derives `name` and defaults `enabled`, and writeConfig strips `name`
      // back off again - so both are genuinely always present on the way back in.
      name: pluginName,
      source: z.union([z.string().max(2048), z.looseObject({ repo: z.string().min(1).max(2048) })]),
      enabled: z.boolean()
    })
  ),
  layout: z
    .looseObject({
      groups: z.record(z.string(), z.unknown()).optional(),
      byPageType: z.record(z.string(), z.unknown()).optional()
    })
    .optional()
})

// Only `name`/`source` are read (see discoverBuiltinPageTypeFrames) - loose for the same reason
// quartzConfig.plugins is: a plugin entry carries extra keys the caller isn't sending back here.
export const pluginSourceList = z
  .array(
    z.looseObject({
      name: pluginName,
      source: z.union([z.string().max(2048), z.looseObject({ repo: z.string().min(1).max(2048) })])
    })
  )
  .max(500)

const cssTrackValue = z.string().max(40).regex(/^[A-Za-z0-9.%\s()+*/[\]_-]*$/, 'kein gültiger CSS-Trackwert')
const cssGapValue = z.string().max(40).regex(/^[A-Za-z0-9.%\s()+*/-]*$/, 'kein gültiger CSS-Abstandswert')
const gridLineName = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, 'kein gültiger Grid-Line-Name')

const gridAreaPlacement = z.looseObject({
  row: z.number().int().min(1).max(50),
  col: z.number().int().min(1).max(50),
  rowSpan: z.number().int().min(1).max(50),
  colSpan: z.number().int().min(1).max(50),
  hidden: z.boolean().optional()
})

const gridBreakpointLayout = z.looseObject({
  rows: z.number().int().min(1).max(50),
  cols: z.number().int().min(1).max(50),
  columnSizes: z.array(cssTrackValue).max(50).optional(),
  rowSizes: z.array(cssTrackValue).max(50).optional(),
  rowGap: cssGapValue,
  columnGap: cssGapValue,
  // The frame's own box. Same value shape as a gap (a length, a percentage or a calc/min/max
  // expression), and padding additionally takes the two-value shorthand - which the space in the
  // pattern already allows.
  maxWidth: cssGapValue.optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  paddingBlock: cssGapValue.optional(),
  paddingInline: cssGapValue.optional(),
  // Keys are stringified 0-based line indices (JSON object keys are always strings; ipc-contract's
  // Record<number, string[]> is the same runtime shape) - kept as a string pattern rather than a
  // coerced numeric key schema, matching every other z.record(...) in this file.
  columnLineNames: z.record(z.string().regex(/^\d{1,3}$/), z.array(gridLineName).max(8)).optional(),
  rowLineNames: z.record(z.string().regex(/^\d{1,3}$/), z.array(gridLineName).max(8)).optional(),
  placements: z.record(z.string().max(128), gridAreaPlacement)
})

export const gridFrameDefinition = z.looseObject({
  id: frameId,
  frameName: z.string().min(1).max(120),
  areas: z
    .array(
      z.looseObject({
        id: z.string().max(128),
        name: cssIdent,
        slot: frameSlot
      })
    )
    .max(200),
  breakpoints: z.looseObject({
    desktop: gridBreakpointLayout,
    tablet: gridBreakpointLayout,
    mobile: gridBreakpointLayout
  })
})

export const themePreset = z.looseObject({
  id: z.string().min(1).max(128),
  name: z.string().min(1).max(200),
  createdAt: z.string().max(64),
  baseThemeId: z.string().max(128),
  options: z.looseObject({ theme: z.string().max(128), mode: z.string().max(64) })
})

// A raw value is written straight into custom.scss, so a "}" or a comment opener would break out
// of the generated block and corrupt the stylesheet (and thus the build). Braces, semicolons and
// comment markers are refused; "/" itself stays legal because CSS needs it (rgb(0 0 0 / 50%),
// font shorthand), as do parentheses and commas.
const cssValue = z
  .string()
  .max(512)
  .refine((v) => !/[{};]/.test(v) && !v.includes('/*') && !v.includes('*/') && !v.includes('\\'), {
    message: 'unerlaubtes Zeichen im CSS-Wert'
  })

export const cssVariableOverride = z.object({
  key: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/, 'kein gültiger CSS-Variablenname'),
  light: cssValue,
  dark: cssValue.optional()
})

// A remote directory on the target server. Absolute, and never bare "/": a target whose path is
// the server root plus deletion enabled would empty a directory that was never this app's to
// manage - a mistake no confirmation dialog reliably catches.
export const remotePosixPath = z
  .string()
  .min(2)
  .max(4096)
  .refine((p) => p.startsWith('/'), 'muss ein absoluter Pfad sein')
  .refine((p) => p.replace(/\/+$/, '') !== '', 'das Wurzelverzeichnis "/" ist als Ziel nicht zulässig')

// Webhook URLs are credentials in URL form (a build hook's path *is* its token), so the scheme is
// pinned to https - posting one over http would put it on the wire in the clear.
export const webhookUrl = z
  .string()
  .max(2048)
  .refine((value) => {
    try {
      return new URL(value).protocol === 'https:'
    } catch {
      return false
    }
  }, 'muss eine https-URL sein')

// Deliberately looseObject, like every other payload schema here: z.object() strips unknown keys,
// which would silently drop a field a newer destination type adds.
export const saveConnectionInput = z.looseObject({
  id: uuid.optional(),
  kind: z.enum(['ssh', 'ftp', 'github', 'webhook']),
  name: z.string().min(1).max(200),
  host: z.string().min(1).max(255).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  username: z.string().max(255).optional(),
  authMethod: z.enum(['password', 'privateKey', 'agent']).optional(),
  keyPath: absolutePath.optional(),
  secure: z.boolean().optional(),
  login: z.string().max(255).optional(),
  secret: z.string().max(100_000).optional()
})
  // A webhook's secret *is* a URL, so it is validated as one at the boundary rather than trusted
  // and only discovered to be junk at deploy time. Written defensively because zod v4 keeps
  // running the remaining checks after one fails, so this refine can see a `kind` the enum above
  // already rejected - hence the typeof guard rather than a direct new URL() on whatever is there.
  .refine(
    (input) => {
      if (input.kind !== 'webhook') return true
      if (typeof input.secret !== 'string') return true // absent means "keep the stored one"
      return webhookUrl.safeParse(input.secret).success
    },
    { message: 'Ein Webhook braucht eine gültige https-URL' }
  )

const publishDestination = z.discriminatedUnion('type', [
  z.looseObject({
    type: z.literal('sftp'),
    remotePath: remotePosixPath,
    transfer: z.enum(['sftp', 'rsync']),
    deleteRemoved: z.boolean()
  }),
  z.looseObject({ type: z.literal('ftp'), remotePath: remotePosixPath, deleteRemoved: z.boolean() }),
  z.looseObject({ type: z.literal('folder'), path: absolutePath, deleteRemoved: z.boolean() }),
  z.looseObject({ type: z.literal('webhook') }),
  z.looseObject({
    type: z.literal('git-branch'),
    branch: branchName,
    provider: z.enum(['github', 'gitlab', 'codeberg'])
  })
])

// GitHub's own rule for a repository name: letters, digits, dot, dash and underscore. Kept tight
// because this string goes straight into an API path.
export const githubRepoName = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9._-]+$/, 'kein gültiger Repository-Name')

export const createRepoInput = z.looseObject({
  name: githubRepoName,
  private: z.boolean(),
  description: z.string().max(350).optional()
})

export const configurePagesInput = z.looseObject({
  branch: branchName,
  // null clears the custom domain; a hostname otherwise. Not a full URL - GitHub stores a bare host.
  cname: z
    .string()
    .max(253)
    .regex(/^[A-Za-z0-9.-]+$/, 'kein gültiger Hostname')
    .nullable()
    .optional(),
  httpsEnforced: z.boolean().optional()
})

export const savePublishTargetInput = z.looseObject({
  id: uuid.optional(),
  name: z.string().min(1).max(200),
  connectionId: uuid.optional(),
  destination: publishDestination,
  excludes: z.array(z.string().max(4096)).max(100_000).optional()
})

export const excludePaths = z.array(z.string().max(4096)).max(100_000)

export const serverOptions = z.looseObject({
  port: z.number().int().min(1).max(65535),
  wsPort: z.number().int().min(1).max(65535),
  host: z.string().max(255),
  watch: z.boolean()
})

export const createProjectOptions = z.looseObject({
  targetDirectory: absolutePath,
  template: z.enum(['default', 'obsidian', 'ttrpg', 'blog']).optional(),
  source: absolutePath.optional(),
  strategy: z.enum(['copy', 'symlink', 'new']).optional(),
  linkResolution: z.enum(['absolute', 'shortest', 'relative']).optional(),
  baseUrl: z.string().max(255).optional()
})

export const settings = z.looseObject({
  defaultProjectDirectory: absolutePath.optional(),
  language: z.enum(['system', 'de', 'en']).optional()
})

export const dialogFileFilters = z
  .array(z.object({ name: z.string().max(120), extensions: z.array(z.string().max(20)).max(50) }))
  .max(20)
