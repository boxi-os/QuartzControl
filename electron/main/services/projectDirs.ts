import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { isAbsolute, join } from 'path'

// The single place that creates <project>/.quartz-gui/ - this app's own scratch area inside the
// user's project (backups, theme presets, authored frames, the deploy manifest, the Pages
// worktree). Everything that needs a subdirectory in there goes through here.
const DIR_NAME = '.quartz-gui'
const IGNORE_LINE = `${DIR_NAME}/`

// Why creating the directory also writes .gitignore: this app's scratch area sits *inside* the
// user's own git repo, and Git-Sync (`quartz sync`) stages and pushes everything - so without an
// ignore rule the config backups end up committed to what is usually a public repo. Those backups
// are verbatim copies of quartz.config.yaml, which can carry analytics keys and similar. Writing
// the rule is idempotent and only happens when we are already creating our directory there
// anyway; the same "do it automatically rather than offer an opt-in the user might skip" reasoning
// as localizationService.ensureGitAttributes.
function ensureIgnored(projectPath: string): void {
  // No git repo, nothing to ignore from - don't litter a plain directory with a .gitignore.
  if (!existsSync(join(projectPath, '.git'))) return
  const path = join(projectPath, '.gitignore')
  const existing = existsSync(path) ? readFileSync(path, 'utf-8') : ''
  // match a whole line, so a substring like "!.quartz-gui/keep" doesn't read as already-present
  const alreadyIgnored = existing
    .split('\n')
    .map((line) => line.trim())
    .some((line) => line === IGNORE_LINE || line === DIR_NAME)
  if (alreadyIgnored) return
  const prefix = existing.length > 0 && !existing.endsWith('\n') ? '\n' : ''
  const block = `${prefix}\n# Arbeitsverzeichnis von QuartzControl (Backups, Presets, Deploy-Manifest)\n${IGNORE_LINE}\n`
  writeFileSync(path, existing + block, 'utf-8')
}

// Returns <project>/.quartz-gui[/sub], creating it (and the .gitignore entry) if needed.
export function quartzGuiDir(projectPath: string, ...sub: string[]): string {
  const dir = join(projectPath, DIR_NAME, ...sub)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  ensureIgnored(projectPath)
  return dir
}

// The same path *without* creating anything - for read paths. quartzGuiDir() creates what it is
// asked for, so using it to locate a file that may not exist yet leaves an empty .quartz-gui/ (and
// a .gitignore entry) in every project the user merely looks at. Writers call quartzGuiDir().
export function quartzGuiPath(projectPath: string, ...sub: string[]): string {
  return join(projectPath, DIR_NAME, ...sub)
}

// `quartz build`'s own default output dir is "public" (verified against quartz/cli/args.js's
// BuildArgv). An outputDir may also be absolute - BuildServer's one-off export lets the user pick
// a folder from the native dialog, which always yields an absolute path. A plain join() would
// silently mis-resolve that (join('/projekt', '/export') === '/projekt/export'), so absolute
// paths are passed through untouched. Shared by deployService and styleService so both agree on
// where the build output actually is.
export function resolveBuildDir(projectPath: string, outputDir?: string): string {
  if (!outputDir) return join(projectPath, 'public')
  return isAbsolute(outputDir) ? outputDir : join(projectPath, outputDir)
}
