import type { PluginSource } from './ipc-contract'

// The name quartz matches `layout.byPageType.<type>.exclude` against.
//
// Not the same name as `configService.deriveName()`, and that difference is the whole reason this
// file exists. `deriveName` answers "what do we call this plugin on screen" and takes the last path
// segment of anything - so an npm source with a scope becomes `page-title`. Quartz answers a
// different question in `extractPluginName` (plugins/loader/config-loader.ts): it shortens an
// object source, a local path and the two git forms, and returns everything else *unchanged*. An
// npm source with a scope is everything else, so quartz compares `exclude` against
// `@quartz-community/page-title` and the short name never matches.
//
// Measured on a real build (2026-09-07, the example project, `content` page type,
// `exclude: [quartz-layout-box, page-title]`): the layout box, a `github:` source, disappeared from
// all 201 pages; the page title, `@quartz-community/page-title`, stayed on all 201. With
// `exclude: ["@quartz-community/page-title"]` it disappeared too.
//
// Quartz's own documentation writes the short name (`docs/layout.md`: `exclude: [reader-mode]`), so
// this is quartz disagreeing with itself, not the app misreading it. What the app can do is write
// the spelling that works - which is what this returns - and model layouts the way quartz really
// builds them, which is why `groupLayoutCandidates` filters on it too.
//
// Where it does not reach: `source.name` on an object source is taken verbatim by both sides and
// needs no help. The two git branches drop a `.git` suffix and a `#ref`, which `deriveName` keeps -
// so those two forms are corrected here as well, even though the app itself never writes them (a
// user editing quartz.config.yaml by hand can). And a *relative* local path is resolved by quartz
// against its own cwd before it ever gets here; this only does what `path.basename` does, which is
// all `extractPluginName` does too.
export function quartzPluginName(source: PluginSource): string {
  if (typeof source === 'object' && source !== null) {
    if (source.name) return source.name
    return quartzPluginName(source.repo)
  }
  // quartz's `isLocalSource` (plugins/loader/gitLoader.ts), including its Windows drive-letter case.
  if (/^[A-Za-z]:[\\/]/.test(source) || source.startsWith('./') || source.startsWith('../') || source.startsWith('/')) {
    return basename(source.replace(/[/]+$/, ''))
  }
  if (source.startsWith('github:')) {
    const [repoPath] = source.replace('github:', '').split('#')
    const parts = repoPath.split('/')
    return parts[parts.length - 1]
  }
  if (source.startsWith('git+') || source.startsWith('https://')) {
    const url = source.replace('git+', '')
    return url.match(/\/([^/]+?)(?:\.git)?(?:#|$)/)?.[1] ?? source
  }
  return source
}

// node's `path.basename`, written out rather than imported because this module is shared with the
// renderer, which has no node.
//
// It follows the *platform*, not the shape of the string, and that was worth measuring: `\` is a
// separator on win32 and an ordinary character in a file name on posix, so on macOS quartz returns
// `C:\Users\x\plugins\baz` whole. Splitting on the backslash whenever a drive letter was present
// looked obviously right and was wrong - caught by `npm run check:plugin-names` against quartz's
// own function, not by reading it.
//
// Read off `globalThis` rather than `process` directly because this module has to stay Node-free
// like the rest of shared/ (tsconfig.web.json carries no node types, and that is the point, not an
// oversight). Where it does not reach: in a context without electron's process polyfill this falls
// back to posix. That is the right answer on macOS and Linux and the wrong one on Windows - for a
// plugin whose source is a Windows absolute path, which today is only an authored frame. A frame
// carries no `layout`, so it is in neither the exclude list of the page type tab nor any group
// ordering, and the difference has nowhere to show.
const WIN32 = (globalThis as { process?: { platform?: string } }).process?.platform === 'win32'

function basename(source: string): string {
  const parts = source.split(WIN32 ? /[/\\]/ : /[/]/)
  return parts[parts.length - 1] || source
}
