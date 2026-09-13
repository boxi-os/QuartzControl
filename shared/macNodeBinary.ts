// The plain helper inside a macOS app bundle, which the embedded runtime's shims start instead of
// the app itself. Why a helper at all is written at nodeBinary() in electron/main/services/
// nodeRuntime.ts, which is the caller that matters.
//
// It lives here because scripts/check-runtime.mjs has to start the same binary as the app, or the
// check measures something the app does not run - the reason the shim template is a file, too.
// Until 2026-09-16 the script held a copy of the lookup, identical and unchecked (review finding 8).
// Pure: shared/ is compiled for the renderer as well, so the file system comes in as two functions,
// and the paths are split on `/` because a bundle path only ever exists on macOS.
export function macNodeBinary(
  execPath: string,
  readdir: (dir: string) => string[],
  exists: (path: string) => boolean
): string {
  const parts = execPath.split('/')
  if (parts.length < 3 || parts[parts.length - 2] !== 'MacOS') return execPath
  const frameworks = [...parts.slice(0, -2), 'Frameworks'].join('/')
  try {
    // The plain helper, not "(Renderer)", "(GPU)" or "(Plugin)". Listed rather than named, because
    // the name differs between the packaged app and development.
    const helper = readdir(frameworks).find((name) => /^[^()]+ Helper\.app$/.test(name))
    if (!helper) return execPath
    const binary = `${frameworks}/${helper}/Contents/MacOS/${helper.slice(0, -'.app'.length)}`
    return exists(binary) ? binary : execPath
  } catch {
    // Anything unexpected falls back to the main binary - a Dock icon is a nuisance, a shim that
    // points at nothing breaks every build.
    return execPath
  }
}
