import { app } from 'electron'
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { basename, delimiter, dirname, join } from 'path'

// Quartz and npm run under Electron's own Node instead of one the user had to install first.
// Electron 43 carries Node 24.18.1, which clears Quartz's `engines.node >= 22` - measured with a
// full build of the test project - so the only thing missing is a way for the twelve `npm`/`npx`
// spawns in this app, and for the lifecycle scripts npm itself starts, to find it.
//
// That way is a directory of three shell scripts at the front of PATH, not a rewrite of every
// spawn site: `sh -c node install.js` in a package's install script has no idea about this app and
// can only be served by a `node` on PATH. Once that exists, every other redirection is redundant -
// buildService, runCommand and the five services above them keep asking for `npx` and get ours.
//
// Why not "host first" the way git is resolved (see gitRuntime, phase 7c): Node has a hard floor
// (>= 22) and a Quartz project ships a `.node-version` pinning v22.16.0, which fnm, nvm, asdf and
// mise all resolve *per directory* - and every spawn here runs with cwd = the project. Host-first
// would therefore hand the build to whatever the user's version manager makes of a file none of us
// wrote. git is the opposite case: no version floor, but the user's config and credential helpers.

export interface EmbeddedRuntime {
  /** Directory prepended to PATH; holds `node`, `npm` and `npx`. */
  binDir: string
  /** The Node version those three provide - Electron's own. */
  nodeVersion: string
  /** Version of the npm that travels with the app, read from its package.json. */
  npmVersion: string | null
}

// Non-null means the shims are written and on PATH. Null means the user chose their own Node
// (Settings), so nothing of ours is in the way and `node` resolves to whatever the machine has.
let runtime: EmbeddedRuntime | null = null

// Both trees sit next to the packaged app (electron-builder `extraResources` flattens them into
// Resources/) and somewhere else entirely in the repo, so each is looked up in both places rather
// than derived from one - the same shape as resolveIconPath() in index.ts.
function packagedOr(packagedName: string, repoPath: string): string {
  const packaged = join(process.resourcesPath, packagedName)
  if (existsSync(packaged)) return packaged
  return join(app.getAppPath(), repoPath)
}

function runtimeDir(): string {
  return packagedOr('runtime', 'resources/runtime')
}

// npm is a devDependency, so a production install (--omit=dev) has it only via extraResources.
function npmDir(): string {
  return packagedOr('npm', 'node_modules/npm')
}

/** Quotes a path for a POSIX shell, so a space in "Application Support" cannot split a word. */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/**
 * The binary the shims start. On macOS that is the app's plain helper, not the app itself.
 *
 * npm sets `process.title` on every run, and on macOS setting a title registers the process with
 * LaunchServices under the bundle its binary lives in. The main binary's bundle has no
 * `LSUIElement`, so every `npm exec quartz build` and every dev server showed up in the Dock as a
 * bouncing "QuartzControl" Unix executable for as long as it ran - reported from the beta, measured
 * on the installed 1.0.0-beta.1 with `lsappinfo`: a shim run without a title registers nothing,
 * with `process.title` set it registers at once as `ApplicationType = Foreground`, and a real
 * `npx quartz build` stayed registered for the whole build. The mechanism is inferred (libuv's
 * darwin proctitle), the effect is measured.
 *
 * The helper bundles Electron ships next to the framework carry `LSUIElement = true` (all four in
 * the installed app). The same run through `QuartzControl Helper` with ELECTRON_RUN_AS_NODE and the
 * loader answered Node 24.18.1 with `process.defaultApp === true` and registered as `UIElement` -
 * no Dock icon. The plain helper, not "(Renderer)" or "(GPU)": those are named for Chromium's own
 * process types.
 *
 * Entitlements, for the day the hardened runtime comes back on (electron-builder.yml): without an
 * `entitlementsInherit` the helpers are signed with the same file as the app - with no
 * `build/entitlements.mac*.plist`, electron-builder's own template (`getOptionsForFile` in
 * app-builder-lib/out/mac/MacTargetHelper.js, 26.15.3), which carries `allow-jit`,
 * `allow-unsigned-executable-memory` and `disable-library-validation`: what Node in the helper
 * needs. ELECTRON_RUN_AS_NODE is not a `DYLD_*` variable, the hardened runtime does not strip it.
 * Read in the source, not measured with the runtime on.
 *
 * Found by listing rather than by name, because the name differs between the packaged app
 * ("QuartzControl Helper") and development ("Electron Helper"). Anything unexpected falls back to
 * the main binary - a Dock icon is a nuisance, a shim that points at nothing breaks every build.
 */
export function nodeBinary(execPath: string = process.execPath, platform: NodeJS.Platform = process.platform): string {
  if (platform !== 'darwin') return execPath
  const macos = dirname(execPath)
  if (basename(macos) !== 'MacOS') return execPath
  const frameworks = join(dirname(macos), 'Frameworks')
  try {
    const helper = readdirSync(frameworks).find((name) => /^[^()]+ Helper\.app$/.test(name))
    if (!helper) return execPath
    const binary = join(frameworks, helper, 'Contents', 'MacOS', helper.slice(0, -'.app'.length))
    return existsSync(binary) ? binary : execPath
  } catch {
    return execPath
  }
}

// The template is a file rather than a string here, because scripts/check-runtime.mjs fills in the
// same one: a shim that differs from the one being measured would make that check worthless.
function shim(target: string | null): string {
  // replaceAll, not replace: the template names its own placeholders in the comment above the
  // line that uses them, and replacing only the first occurrence substituted the comment and left
  // the command with a literal __SCRIPT__. Found by scripts/check-runtime.mjs on its first run.
  return readFileSync(join(runtimeDir(), 'shim.sh'), 'utf-8')
    .replaceAll('__ELECTRON__', shellQuote(nodeBinary()))
    .replaceAll('__LOADER__', shellQuote(join(runtimeDir(), 'defaultapp.cjs')))
    .replaceAll('__SCRIPT__', target ? shellQuote(target) : '')
}

/**
 * Applies the user's choice of runtime: 'embedded' writes the three shims and puts them at the
 * front of PATH, 'system' takes them back out again. Called at startup and after every save of
 * the setting, so the stored value and the live PATH cannot disagree.
 *
 * The shims are rewritten on every start rather than only when missing: they hold an absolute path
 * to the Electron binary, and inside an AppImage that path lives under a mount point that changes
 * with each launch (/tmp/.mount_…). A shim from yesterday points at nothing.
 *
 * Switching to 'system' only changes what *later* spawns see. A dev server that is already running
 * keeps the environment it was started with - which is why the setting says so.
 */
export function applyRuntimeMode(mode: 'embedded' | 'system'): EmbeddedRuntime | null {
  if (mode === 'system') {
    if (runtime) {
      const gone = runtime.binDir
      process.env.PATH = (process.env.PATH ?? '')
        .split(delimiter)
        .filter((entry) => entry && entry !== gone)
        .join(delimiter)
      runtime = null
    }
    return null
  }
  if (runtime) return runtime

  const binDir = join(app.getPath('userData'), 'runtime', 'bin')
  mkdirSync(binDir, { recursive: true })

  const npm = npmDir()
  const scripts: [string, string | null][] = [
    ['node', null],
    ['npm', join(npm, 'bin/npm-cli.js')],
    ['npx', join(npm, 'bin/npx-cli.js')]
  ]
  for (const [name, target] of scripts) {
    const path = join(binDir, name)
    writeFileSync(path, shim(target), 'utf-8')
    chmodSync(path, 0o755)
  }

  process.env.PATH = [binDir, ...(process.env.PATH ?? '').split(delimiter).filter(Boolean)].join(delimiter)

  let npmVersion: string | null = null
  try {
    npmVersion = JSON.parse(readFileSync(join(npm, 'package.json'), 'utf-8')).version ?? null
  } catch {
    npmVersion = null
  }

  runtime = { binDir, nodeVersion: process.versions.node, npmVersion }
  return runtime
}

/** What was resolved, for the start screen. Null until ensureEmbeddedRuntime() has run. */
export function embeddedRuntime(): EmbeddedRuntime | null {
  return runtime
}
