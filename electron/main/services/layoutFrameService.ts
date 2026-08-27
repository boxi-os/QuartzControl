import { existsSync, mkdirSync, rmSync } from 'fs'
import { readFile, readdir, writeFile } from 'fs/promises'
import { join } from 'path'
import type {
  FrameBreakpointWidths,
  GridFrameDefinition,
  LegacyGridFrameDefinition,
  PluginActionResult
} from '@shared/ipc-contract'
import { DEFAULT_FRAME_BREAKPOINT_WIDTHS, buildFrameCss, migrateGridFrameDefinition } from '@shared/gridFrameCss'
import * as pluginService from './pluginService'
import { quartzGuiDir } from './projectDirs'

// Authored frames live inside the project (.quartz-gui/, same convention as
// themePresetsService.ts/backupService.ts) so they travel with the project, not the app install.
// Each subdirectory IS the generated companion plugin's directory - it gets symlinked verbatim
// into .quartz/plugins/<id> by `quartz plugin add <absolute path>` (verified: local sources are
// symlinked, not copied, and the plugin name is derived from the source path's basename - see
// quartz/cli/plugin-git-handlers.js's handlePluginAdd + plugin-data.js's parseGitSource).
function framesDir(projectPath: string): string {
  return quartzGuiDir(projectPath, 'authored-frames')
}

// A frame id becomes a directory name under .quartz-gui/authored-frames/ and is also handed to
// `quartz plugin add <path>` (which derives the plugin name from the path's basename), so it has
// to be a plain slug. Unvalidated, an id from the renderer escapes the project entirely - ".."
// segments resolve upward through join(), and deleteFrame() then rmSync's that path recursively.
// Dots and separators are excluded outright rather than filtered, so there is nothing to escape.
const FRAME_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i

// One file per project rather than a field on each frame.json: the widths describe the site, and
// two frames that disagree about where "mobile" starts would reflow the same page at two different
// widths. Absent or unreadable means Quartz's own numbers, which is what every project had before
// this setting existed - a corrupt file must not make the frames unbuildable.
const BREAKPOINTS_FILE = 'layout-breakpoints.json'

// join(quartzGuiDir(...), file), never quartzGuiDir(..., file): that helper *creates* whatever path
// it is handed, so passing a file name through it produced a directory called
// layout-breakpoints.json and every write after it failed with EISDIR.
function breakpointsPath(projectPath: string): string {
  return join(quartzGuiDir(projectPath), BREAKPOINTS_FILE)
}

export async function getBreakpointWidths(projectPath: string): Promise<FrameBreakpointWidths> {
  try {
    const raw = JSON.parse(await readFile(breakpointsPath(projectPath), 'utf-8')) as Partial<FrameBreakpointWidths>
    const tablet = Number(raw.tablet)
    const mobile = Number(raw.mobile)
    if (!Number.isFinite(tablet) || !Number.isFinite(mobile) || mobile >= tablet) return DEFAULT_FRAME_BREAKPOINT_WIDTHS
    return { tablet, mobile }
  } catch {
    return DEFAULT_FRAME_BREAKPOINT_WIDTHS
  }
}

// The widths are baked into each frame's media queries when its CSS is generated, so changing them
// without rewriting every frame would leave the old thresholds in the build with no way to tell
// from the UI. No `quartz plugin add` is needed - each frame's directory is already symlinked into
// .quartz/plugins, so rewriting the files behind the symlink is all it takes.
export async function saveBreakpointWidths(projectPath: string, widths: FrameBreakpointWidths): Promise<void> {
  await writeFile(breakpointsPath(projectPath), JSON.stringify(widths, null, 2), 'utf-8')
  for (const def of await listFrames(projectPath)) {
    await writeFrameFiles(projectPath, def, widths)
  }
}

function frameDir(projectPath: string, id: string): string {
  if (!FRAME_ID_RE.test(id)) {
    throw new Error(`Ungültige Frame-ID "${id}" - erlaubt sind nur Buchstaben, Ziffern und Bindestriche.`)
  }
  return join(framesDir(projectPath), id)
}

// Renders to a preact vnode tree via `h()` directly rather than JSX, since this file is written
// as plain compiled JS with no build step (frameLoader.ts skips npm install/build whenever a
// plugin's dist/ already exists on disk). `pageBody` is a single component (Content), unlike the
// other 6 slots which are arrays - see PageFrameProps in quartz/components/frames/types.ts.
function generateFrameJs(def: GridFrameDefinition, widths: FrameBreakpointWidths): string {
  return `import { h, Fragment } from "preact"

const AREAS = ${JSON.stringify(def.areas)}

export const Frame = {
  name: ${JSON.stringify(def.frameName)},
  css: ${JSON.stringify(buildFrameCss(def, widths))},
  render(props) {
    const { componentData, header, beforeBody, pageBody, afterBody, left, right, footer } = props
    const bySlot = { header, beforeBody, afterBody, left, right, footer, pageBody: [pageBody] }
    return h(
      Fragment,
      null,
      h(
        "div",
        { class: "qgframe-grid" },
        AREAS.map((area) => {
          const components = bySlot[area.slot] ?? []
          return h(
            "div",
            { key: area.id, class: "qgframe-area qgframe-area-" + area.name },
            components.map((Component) => h(Component, componentData))
          )
        })
      )
    )
  }
}
`
}

function generatePackageJson(def: GridFrameDefinition): string {
  return JSON.stringify(
    {
      name: def.id,
      version: '1.0.0',
      private: true,
      type: 'module',
      quartz: { frames: { Frame: { exportName: 'Frame' } } }
    },
    null,
    2
  )
}

async function writeFrameFiles(projectPath: string, def: GridFrameDefinition, widths: FrameBreakpointWidths): Promise<void> {
  const dir = frameDir(projectPath, def.id)
  mkdirSync(join(dir, 'dist'), { recursive: true })
  await Promise.all([
    writeFile(join(dir, 'frame.json'), JSON.stringify(def, null, 2), 'utf-8'),
    writeFile(join(dir, 'package.json'), generatePackageJson(def), 'utf-8'),
    writeFile(join(dir, 'dist', 'frames.js'), generateFrameJs(def, widths), 'utf-8')
  ])
}

export async function listFrames(projectPath: string): Promise<GridFrameDefinition[]> {
  const dir = framesDir(projectPath)
  const entries = await readdir(dir, { withFileTypes: true })
  const defs = await Promise.all(
    entries
      .filter((e) => e.isDirectory())
      .map(async (e) => {
        try {
          const raw = JSON.parse(await readFile(join(dir, e.name, 'frame.json'), 'utf-8')) as GridFrameDefinition | LegacyGridFrameDefinition
          return migrateGridFrameDefinition(raw)
        } catch {
          return null
        }
      })
  )
  return defs.filter((d): d is GridFrameDefinition => d !== null)
}

export async function saveFrame(projectPath: string, rawDef: GridFrameDefinition | LegacyGridFrameDefinition): Promise<PluginActionResult> {
  // The IPC handler's zod schema already rejects a legacy-shaped payload from the renderer, but
  // importPackage() calls this directly with whatever a template package's frames.json contains -
  // possibly a pre-breakpoint export - so migrate defensively here too, not just in listFrames().
  const def = migrateGridFrameDefinition(rawDef)
  const isNew = !existsSync(frameDir(projectPath, def.id))
  await writeFrameFiles(projectPath, def, await getBreakpointWidths(projectPath))
  // Only newly created frames need registering - `quartz plugin add` symlinks the directory into
  // .quartz/plugins/<id> once; editing an existing frame just rewrites the files the symlink
  // already points at, so the build picks up the change on its next run with no CLI call needed.
  if (isNew) return pluginService.addPlugin(projectPath, frameDir(projectPath, def.id))
  return { success: true, output: '' }
}

export async function deleteFrame(projectPath: string, id: string): Promise<PluginActionResult> {
  // resolved (and therefore validated) before removePlugin shells out, so an invalid id never
  // reaches the CLI either
  const dir = frameDir(projectPath, id)
  const result = await pluginService.removePlugin(projectPath, id)
  rmSync(dir, { recursive: true, force: true })
  return result
}
