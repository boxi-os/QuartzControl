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
import { DEFAULT_FRAME_BREAKPOINT_WIDTHS, buildFrameCss, groupOrderByPosition, migrateGridFrameDefinition } from '@shared/gridFrameCss'
import * as configService from './configService'
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
  const groupOrder = await readGroupOrder(projectPath)
  for (const def of await listFrames(projectPath)) {
    await writeFrameFiles(projectPath, def, widths, groupOrder)
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
//
// `groupOrder` is the project's group ordering per position (groupOrderByPosition), baked in
// because it is the only thing the frame cannot work out for itself: quartz hands it a flat array
// per position in which each group is one anonymous `Flex`, so rank is the only way to tell them
// apart. That makes the frame files depend on the layout half of quartz.config.yaml, which is why
// buildService calls writeAllFrames() before every build and every dev server - the one place the
// baked-in copy is ever read (see refreshAuthoredFrames there for why it is the only guard).
function generateFrameJs(
  def: GridFrameDefinition,
  widths: FrameBreakpointWidths,
  groupOrder: Record<string, string[]>
): string {
  return `import { h, Fragment } from "preact"

const AREAS = ${JSON.stringify(def.areas)}
const GROUP_ORDER = ${JSON.stringify(groupOrder)}

// What each area shows. Six positions is all quartz sorts components into
// (config-loader.ts's buildLayoutForEntries), so a frame with more component areas than that needs
// a second key, and quartz has one: \`layout.group\` collapses a position's grouped entries into a
// single Flex component (resolveGroups) and leaves the ungrouped ones as themselves. Measured on a
// real build, a position holding one group arrived as [MobileOnly, Flex, ExplorerComponent] - the
// group is a function literally named "Flex" (quartz builds itself with esbuild's keepNames), and
// \`displayName\` was undefined on every entry, so that name is the whole identity available here.
//
// So the k-th Flex in a position is the k-th group of GROUP_ORDER, an area with a group takes its
// own, and the area without one takes everything else - including any group this frame gave no
// area, which would otherwise vanish from the page.
//
// If the Flexes and GROUP_ORDER disagree in number, the model is wrong for this build (a group
// whose members all got disabled, a config edited by hand since the frame was written) and nothing
// is guessed: the position's plain area takes the lot, the group areas stay empty, and the build
// log says so. A page that is missing its split is repairable; one where two areas quietly swapped
// contents is not.
// Said once per position per build, not once per area per page: the same mismatch is true for
// every area of that position and for all 100-odd pages, and a warning repeated 300 times reads
// like noise rather than like the one thing that went wrong.
const warned = new Set()

function contentsFor(area, list) {
  if (!area.slot || area.slot === "pageBody") return list
  const groups = GROUP_ORDER[area.slot] ?? []
  if (groups.length === 0) return area.group ? [] : list
  const flexes = list.filter((C) => C.name === "Flex")
  if (flexes.length !== groups.length) {
    if (!warned.has(area.slot)) {
      warned.add(area.slot)
      const plain = AREAS.filter((a) => a.slot === area.slot && !a.group).map((a) => a.name)
      console.warn(
        \`[\${${JSON.stringify(def.frameName)}}] \${area.slot}: \${groups.length} group(s) in the config, \${flexes.length} rendered - \` +
          \`not splitting. Everything goes to \${plain.length ? '"' + plain.join('", "') + '"' : "no area of this frame"}. \` +
          \`Save the layout once to refresh this frame.\`
      )
    }
    return area.group ? [] : list
  }
  if (area.group) {
    const rank = groups.indexOf(area.group)
    return rank === -1 ? [] : [flexes[rank]]
  }
  // The plain area keeps every group no area of this frame claimed, in place among the others.
  const claimed = AREAS.filter((a) => a.slot === area.slot && a.group).map((a) => groups.indexOf(a.group))
  return list.filter((C) => C.name !== "Flex" || claimed.indexOf(flexes.indexOf(C)) === -1)
}

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
          // An area without a slot is an empty cell by design (a spacer) - see GridFrameArea.
          const components = area.slot ? contentsFor(area, bySlot[area.slot] ?? []) : []
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

// A frame's generated code carries the project's group ordering (see generateFrameJs), so every
// write needs it. Unreadable config means no groups rather than a failed write: a frame that shows
// a position undivided is a frame that still builds, and the alternative is a project whose frames
// cannot be saved because of a syntax error somewhere else in the yaml.
async function readGroupOrder(projectPath: string): Promise<Record<string, string[]>> {
  try {
    return groupOrderByPosition(await configService.readConfig(projectPath))
  } catch (err) {
    console.error(`[layoutFrames] could not read the layout groups of ${projectPath}: ${String(err)}`)
    return {}
  }
}

async function writeFrameFiles(
  projectPath: string,
  def: GridFrameDefinition,
  widths: FrameBreakpointWidths,
  groupOrder: Record<string, string[]>
): Promise<void> {
  const dir = frameDir(projectPath, def.id)
  quartzGuiDir(projectPath, 'authored-frames') // creating: this is the write path
  mkdirSync(join(dir, 'dist'), { recursive: true })
  await Promise.all([
    // Atomic: frame.json is the frame's definition and its only copy, and a half-written one
    // drops the frame out of listFrames() while its plugin entry stays in quartz.config.yaml.
    writeJsonFile(join(dir, 'frame.json'), def),
    writeFile(join(dir, 'package.json'), generatePackageJson(def), 'utf-8'),
    writeFile(join(dir, 'dist', 'frames.js'), generateFrameJs(def, widths, groupOrder), 'utf-8')
  ])
}

/**
 * Rewrites every frame of a project against the config as it stands now.
 *
 * Same reason saveBreakpointWidths rewrites them: the frames carry a copy of something the config
 * owns - there the breakpoint widths, here the group order - and a copy nobody refreshes is a copy
 * that quietly stops being true. No `quartz plugin add` is involved; each frame's directory is
 * already symlinked into .quartz/plugins, so rewriting the files behind the symlink is the whole
 * job. The one caller is buildService, right before it spawns quartz.
 *
 * Never throws, and returns immediately for a project with no frames: it sits in front of every
 * build, and a build must not fail because of a repair it did not ask for.
 */
export async function writeAllFrames(projectPath: string): Promise<void> {
  try {
    const frames = await listFrames(projectPath)
    if (frames.length === 0) return
    const [widths, groupOrder] = await Promise.all([getBreakpointWidths(projectPath), readGroupOrder(projectPath)])
    for (const def of frames) {
      await writeFrameFiles(projectPath, def, widths, groupOrder)
    }
  } catch (err) {
    console.error(`[layoutFrames] could not refresh the frames of ${projectPath}: ${String(err)}`)
  }
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
  await writeFrameFiles(projectPath, def, await getBreakpointWidths(projectPath), await readGroupOrder(projectPath))
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
