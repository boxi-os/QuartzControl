import { existsSync, mkdirSync, rmSync } from 'fs'
import { readFile, readdir, writeFile } from 'fs/promises'
import { readJsonFileOr, writeJsonFile } from './jsonStore'
import { join } from 'path'
import type {
  FrameBreakpointWidths,
  GridFrameDefinition,
  LegacyGridFrameDefinition,
  PluginActionResult
} from '@shared/ipc-contract'
import { DEFAULT_FRAME_BREAKPOINT_WIDTHS, buildFrameCss, migrateGridFrameDefinition } from '@shared/gridFrameCss'
import * as pluginService from './pluginService'
import { quartzGuiDir, quartzGuiPath } from './projectDirs'
import { mainT } from '../i18n'

// Authored frames live inside the project (.quartz-gui/, same convention as
// themePresetsService.ts/backupService.ts) so they travel with the project, not the app install.
// Each subdirectory IS the generated companion plugin's directory - it gets symlinked verbatim
// into .quartz/plugins/<id> by `quartz plugin add <absolute path>` (verified: local sources are
// symlinked, not copied, and the plugin name is derived from the source path's basename - see
// quartz/cli/plugin-git-handlers.js's handlePluginAdd + plugin-data.js's parseGitSource).
// quartzGuiPath, not quartzGuiDir: the latter creates the directory it is asked for *and* writes
// the .gitignore entry that goes with it, and listFrames() runs on the Uebersicht of every project
// - so merely opening one left an empty authored-frames/ and an edited .gitignore behind. The one
// place that creates it is writeFrameFiles(), whose mkdirSync covers the parent anyway.
function framesDir(projectPath: string): string {
  return quartzGuiPath(projectPath, 'authored-frames')
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
  return quartzGuiPath(projectPath, BREAKPOINTS_FILE)
}

export async function getBreakpointWidths(projectPath: string): Promise<FrameBreakpointWidths> {
  const raw = await readJsonFileOr<Partial<FrameBreakpointWidths>>(
    breakpointsPath(projectPath),
    DEFAULT_FRAME_BREAKPOINT_WIDTHS
  )
  const tablet = Number(raw.tablet)
  const mobile = Number(raw.mobile)
  if (!Number.isFinite(tablet) || !Number.isFinite(mobile) || mobile >= tablet) return DEFAULT_FRAME_BREAKPOINT_WIDTHS
  return { tablet, mobile }
}

// The widths are baked into each frame's media queries when its CSS is generated, so changing them
// without rewriting every frame would leave the old thresholds in the build with no way to tell
// from the UI. No `quartz plugin add` is needed - each frame's directory is already symlinked into
// .quartz/plugins, so rewriting the files behind the symlink is all it takes.
export async function saveBreakpointWidths(projectPath: string, widths: FrameBreakpointWidths): Promise<void> {
  await writeJsonFile(join(quartzGuiDir(projectPath), BREAKPOINTS_FILE), widths)
  for (const def of await listFrames(projectPath)) {
    await writeFrameFiles(projectPath, def, widths)
  }
}

function frameDir(projectPath: string, id: string): string {
  if (!FRAME_ID_RE.test(id)) {
    throw new Error(mainT('frameIdInvalid', { id }))
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
          // The area holding pageBody also carries \`center\`, because quartz's own three frames
          // do (DefaultFrame/FullWidthFrame/MinimalFrame all render <div class="center …">) and
          // client scripts rely on it: the mermaid initialiser runs
          // \`document.querySelector(".center").querySelectorAll("code.mermaid")\` unconditionally
          // on every page. Without the class that threw a TypeError inside the nav handler, which
          // aborted every component script registered after it - measured on a real build, where
          // the explorer rendered its container but never its tree or its title. The class alone
          // is inert for layout here: base.scss only uses it for \`.center > article { grid-area }\`
          // (no effect on a flex child) and for its .full-width/.minimal variants.
          const isPageBody = area.slot === "pageBody"
          return h(
            "div",
            {
              key: area.id,
              class: "qgframe-area qgframe-area-" + area.name + (isPageBody ? " center" : "")
            },
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
  quartzGuiDir(projectPath, 'authored-frames') // creating: this is the write path
  mkdirSync(join(dir, 'dist'), { recursive: true })
  await Promise.all([
    // Atomic: frame.json is the frame's definition and its only copy, and a half-written one
    // drops the frame out of listFrames() while its plugin entry stays in quartz.config.yaml.
    writeJsonFile(join(dir, 'frame.json'), def),
    writeFile(join(dir, 'package.json'), generatePackageJson(def), 'utf-8'),
    writeFile(join(dir, 'dist', 'frames.js'), generateFrameJs(def, widths), 'utf-8')
  ])
}

export async function listFrames(projectPath: string): Promise<GridFrameDefinition[]> {
  const dir = framesDir(projectPath)
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return [] // no frame was ever authored in this project
  }
  const defs = await Promise.all(
    entries
      .filter((e) => e.isDirectory())
      .map(async (e) => {
        try {
          const raw = JSON.parse(await readFile(join(dir, e.name, 'frame.json'), 'utf-8')) as GridFrameDefinition | LegacyGridFrameDefinition
          return migrateGridFrameDefinition(raw)
        } catch (err) {
          // Not quarantined, unlike the stores in jsonStore: moving frame.json aside would take
          // the frame's directory apart while its plugin entry still points at it. Said out loud
          // instead, so a frame vanishing from the list has a reason somewhere.
          console.error(`[layoutFrames] ${join(dir, e.name, 'frame.json')} is not readable: ${String(err)}`)
          return null
        }
      })
  )
  return defs.filter((d): d is GridFrameDefinition => d !== null)
}

/** Where a frame's own files live. Exported so a template import can check the CLI's work. */
export function authoredFrameDir(projectPath: string, id: string): string {
  return frameDir(projectPath, id)
}

export async function saveFrame(
  projectPath: string,
  rawDef: GridFrameDefinition | LegacyGridFrameDefinition,
  // A template import takes one snapshot for the whole import and passes false here, so a package
  // carrying ten frames does not leave ten more behind it.
  options?: { snapshot?: boolean }
): Promise<PluginActionResult> {
  // The IPC handler's zod schema already rejects a legacy-shaped payload from the renderer, but
  // importPackage() calls this directly with whatever a template package's frames.json contains -
  // possibly a pre-breakpoint export - so migrate defensively here too, not just in listFrames().
  const def = migrateGridFrameDefinition(rawDef)
  const isNew = !existsSync(frameDir(projectPath, def.id))
  await writeFrameFiles(projectPath, def, await getBreakpointWidths(projectPath))
  // Only newly created frames need registering - `quartz plugin add` symlinks the directory into
  // .quartz/plugins/<id> once; editing an existing frame just rewrites the files the symlink
  // already points at, so the build picks up the change on its next run with no CLI call needed.
  if (!isNew) return { success: true, output: '' }
  const source = frameDir(projectPath, def.id)
  return options?.snapshot === false
    ? pluginService.installPluginSource(projectPath, source)
    : pluginService.addPlugin(projectPath, source)
}

export async function deleteFrame(projectPath: string, id: string): Promise<PluginActionResult> {
  // resolved (and therefore validated) before removePlugin shells out, so an invalid id never
  // reaches the CLI either
  const dir = frameDir(projectPath, id)
  const result = await pluginService.removePlugin(projectPath, id)
  rmSync(dir, { recursive: true, force: true })
  return result
}
