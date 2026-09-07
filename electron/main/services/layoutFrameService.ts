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
import { DEFAULT_FRAME_BREAKPOINT_WIDTHS, buildFrameCss, groupLayoutCandidates, migrateGridFrameDefinition } from '@shared/gridFrameCss'
import type { GroupLayoutCandidate } from '@shared/gridFrameCss'
import * as configService from './configService'
import * as pluginService from './pluginService'
import { quartzGuiDir, quartzGuiPath } from './projectDirs'
import { gridFrameDefinition } from '../ipc/schemas'
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
  const groupLayouts = await readGroupLayouts(projectPath)
  for (const def of await listFrames(projectPath)) {
    await writeFrameFiles(projectPath, def, widths, groupLayouts)
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
// `groupLayouts` is every group ordering this config can produce (groupLayoutCandidates), baked in
// because it is the one thing the frame cannot work out for itself: quartz hands it a flat array
// per position in which each group is one anonymous `Flex`, so rank is the only way to tell them
// apart - and the ordering belongs to the page type, which the frame is never told. That makes the
// frame files depend on the layout half of quartz.config.yaml, which is why buildService calls
// writeAllFrames() before every build and every dev server - the one place the baked-in copy is
// ever read (see refreshAuthoredFrames there for why it is the only guard).
function generateFrameJs(
  def: GridFrameDefinition,
  widths: FrameBreakpointWidths,
  groupLayouts: GroupLayoutCandidate[]
): string {
  return `import { h, Fragment } from "preact"

const FRAME_NAME = ${JSON.stringify(def.frameName)}
const AREAS = ${JSON.stringify(def.areas)}
const GROUP_LAYOUTS = ${JSON.stringify(groupLayouts)}

// What each area shows. Six positions is all quartz sorts components into
// (config-loader.ts's buildLayoutForEntries), so a frame with more component areas than that needs
// a second key, and quartz has one: \`layout.group\` collapses a position's grouped entries into a
// single Flex component (resolveGroups) and leaves the ungrouped ones as themselves. Measured on a
// real build, a position holding one group arrived as [MobileOnly, Flex, ExplorerComponent] - the
// group is a function literally named "Flex" (quartz builds itself with esbuild's keepNames), and
// \`displayName\` was undefined on every entry, so that name is the whole identity available here.
//
// So the k-th Flex in a position is the k-th group of the ordering, an area with a group takes its
// own, and the area without one takes everything else - including any group this frame gave no
// area, which would otherwise vanish from the page.
//
// Which ordering, though, is not a property of the config: quartz builds a layout per page type
// (loadQuartzLayout drops what \`byPageType.<t>.exclude\` names, runs buildLayoutForEntries on the
// rest, then empties the positions \`positions\` cleared), and it hands the frame the finished
// lists without ever saying which page type they belong to - PageFrameProps carries no name, and
// neither does componentData. Hence GROUP_LAYOUTS: every ordering this config can produce, and
// pickGroupOrder to work out which one arrived.
const POSITIONS = ["header", "beforeBody", "afterBody", "left", "right", "footer"]
// The positions this frame divides. One without a group area has nothing to work out, so it never
// takes part in the decision and never warns - it used to, and a page type that merely cleared it
// was enough to spend the position's one warning before a real break could have it.
const SPLIT_POSITIONS = POSITIONS.filter((p) => AREAS.some((a) => a.slot === p && a.group))
const warned = new Set()

function orderOf(order, position) {
  return order[position] || []
}

function countsLike(order, counts) {
  return POSITIONS.every((p) => orderOf(order, p).length === counts[p])
}

function splitsAlike(a, b) {
  return SPLIT_POSITIONS.every((p) => orderOf(a, p).join("\\u0000") === orderOf(b, p).join("\\u0000"))
}

function nameOf(candidate) {
  return candidate.pageType === null ? "the config as a whole" : 'page type "' + candidate.pageType + '"'
}

function countsOf(order) {
  return SPLIT_POSITIONS.map((p) => p + " " + orderOf(order, p).length).join(", ")
}

function groupsOf(order) {
  return SPLIT_POSITIONS.map((p) => p + ": " + (orderOf(order, p).join(", ") || "no group")).join("; ")
}

// The only thing a frame can measure about the layout it was handed is how many Flexes each
// position holds, so that is the whole key: the candidate whose group counts match everywhere is
// the one this page was built with. Exactly one match is the answer; several that name the same
// groups in the same order are the same answer said twice. Anything else means guessing, and a
// guess here is the one failure that cannot be seen on the built page - two areas quietly showing
// each other's contents - so it falls back to not splitting at all and says why.
function pickGroupOrder(bySlot) {
  if (SPLIT_POSITIONS.length === 0) return null
  const counts = {}
  for (const p of POSITIONS) counts[p] = (bySlot[p] || []).filter((C) => C.name === "Flex").length
  const matches = GROUP_LAYOUTS.filter((c) => countsLike(c.order, counts))
  if (matches.length === 1) return matches[0].order
  if (matches.length > 1 && matches.every((c) => splitsAlike(c.order, matches[0].order))) return matches[0].order
  // Once per distinct shape, not once per page: the same mismatch is true for every one of the
  // 100-odd pages built with this layout, and a warning repeated 300 times reads like noise.
  const key = matches.length + "@" + SPLIT_POSITIONS.map((p) => p + " " + counts[p]).join(", ")
  if (!warned.has(key)) {
    warned.add(key)
    const rendered = SPLIT_POSITIONS.map((p) => p + " " + counts[p]).join(", ")
    if (matches.length === 0) {
      console.warn(
        "[" + FRAME_NAME + "] this page renders " + rendered + " group flex(es), which no layout in " +
          "quartz.config.yaml produces (" + GROUP_LAYOUTS.map((c) => nameOf(c) + ": " + countsOf(c.order)).join("; ") + "). " +
          "Not splitting: every position's area without a group takes the lot, the group areas stay empty. " +
          "Usually a group whose members all got disabled, or a quartz.config.yaml edited by hand since this frame was written."
      )
    } else {
      console.warn(
        "[" + FRAME_NAME + "] this page renders " + rendered + " group flex(es), which fits " +
          matches.map(nameOf).join(" and ") + " - and they order the groups differently (" +
          matches.map((c) => nameOf(c) + " -> " + groupsOf(c.order)).join("; ") + "). " +
          "Not splitting, because guessing would swap what the areas show. Give those groups an explicit " +
          "priority under layout.groups so their order is the same for every page type."
      )
    }
  }
  return null
}

function contentsFor(area, list, order) {
  if (!area.slot || area.slot === "pageBody") return list
  // No area of this frame divides this position, so there is nothing to take apart - and nothing
  // to warn about either, whatever the config says about groups here.
  if (!AREAS.some((a) => a.slot === area.slot && a.group)) return list
  const groups = order ? orderOf(order, area.slot) : []
  if (groups.length === 0) return area.group ? [] : list
  // Guaranteed equal in length: pickGroupOrder only returns an ordering whose group count matches
  // the Flexes of every position, and it returns null when none does.
  const flexes = list.filter((C) => C.name === "Flex")
  if (area.group) {
    // Nothing else in this position has an area to go to, so the components that are in no group
    // are about to be dropped from every page. Measured on a real build: two group areas on
    // \`left\` and no plain one took the spacer and both toggles off all 20 pages, and neither the
    // editor nor the build said a word. The editor warns about the shape now; this says what it
    // actually cost.
    const plain = AREAS.filter((a) => a.slot === area.slot && !a.group)
    if (plain.length === 0 && !warned.has("homeless:" + area.slot)) {
      warned.add("homeless:" + area.slot)
      const claimed = AREAS.filter((a) => a.slot === area.slot && a.group).map((a) => groups.indexOf(a.group))
      const lost = list.filter((C, i) => C.name !== "Flex" || claimed.indexOf(flexes.indexOf(C)) === -1).length
      if (lost > 0) {
        // "entries", not "components": one of them may be another group's Flex, which is one
        // entry and any number of components, and this cannot see inside it. An understated
        // number would be worse than a vague noun.
        console.warn(
          "[" + FRAME_NAME + "] " + area.slot + ": every area here has a group, so " + lost + " entr" +
            (lost === 1 ? "y" : "ies") + " outside those groups render on no page. " +
            "Give the position an area without a group to hold them."
        )
      }
    }
    const rank = groups.indexOf(area.group)
    return rank === -1 ? [] : [flexes[rank]]
  }
  // The plain area keeps every group no area of this frame claimed, in place among the others.
  const claimed = AREAS.filter((a) => a.slot === area.slot && a.group).map((a) => groups.indexOf(a.group))
  return list.filter((C) => C.name !== "Flex" || claimed.indexOf(flexes.indexOf(C)) === -1)
}

export const Frame = {
  name: FRAME_NAME,
  css: ${JSON.stringify(buildFrameCss(def, widths))},
  render(props) {
    const { componentData, header, beforeBody, pageBody, afterBody, left, right, footer } = props
    const bySlot = { header, beforeBody, afterBody, left, right, footer, pageBody: [pageBody] }
    // Once per page, not once per area: the decision is about the whole layout that arrived.
    const order = pickGroupOrder(bySlot)
    return h(
      Fragment,
      null,
      h(
        "div",
        { class: "qgframe-grid" },
        AREAS.map((area) => {
          // An area without a slot is an empty cell by design (a spacer) - see GridFrameArea.
          const components = area.slot ? contentsFor(area, bySlot[area.slot] ?? [], order) : []
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

// A frame's generated code carries the project's group orderings (see generateFrameJs), so every
// write needs them. Unreadable config means no groups rather than a failed write: a frame that
// shows a position undivided is a frame that still builds, and the alternative is a project whose
// frames cannot be saved because of a syntax error somewhere else in the yaml.
async function readGroupLayouts(projectPath: string, problems?: string[]): Promise<GroupLayoutCandidate[]> {
  try {
    return groupLayoutCandidates(await configService.readConfig(projectPath))
  } catch (err) {
    // "No groups" and "could not tell" render the same - every position undivided, the group areas
    // empty - and the frame cannot tell them apart either, since the empty ordering is all it
    // gets. So the difference has to be said here, where it is known, and it has to reach the one
    // place the user is looking: the build log. `console.error` alone is a message to nobody.
    console.error(`[layoutFrames] could not read the layout groups of ${projectPath}: ${String(err)}`)
    problems?.push(mainT('frameGroupsUnreadable', { error: String(err) }))
    return [{ pageType: null, order: {} }]
  }
}

async function writeFrameFiles(
  projectPath: string,
  def: GridFrameDefinition,
  widths: FrameBreakpointWidths,
  groupLayouts: GroupLayoutCandidate[]
): Promise<void> {
  const dir = frameDir(projectPath, def.id)
  quartzGuiDir(projectPath, 'authored-frames') // creating: this is the write path
  mkdirSync(join(dir, 'dist'), { recursive: true })
  await Promise.all([
    // Atomic: frame.json is the frame's definition and its only copy, and a half-written one
    // drops the frame out of listFrames() while its plugin entry stays in quartz.config.yaml.
    writeJsonFile(join(dir, 'frame.json'), def),
    writeFile(join(dir, 'package.json'), generatePackageJson(def), 'utf-8'),
    writeFile(join(dir, 'dist', 'frames.js'), generateFrameJs(def, widths, groupLayouts), 'utf-8')
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
 *
 * What it does instead of throwing is *say* so: it returns the sentences the caller should put in
 * the build log. Silence here means "built with the frames as they were on disk", which looks
 * exactly like success - an EACCES on one frame directory and a config that cannot be parsed both
 * ended up in the main process's console, where no user has ever looked.
 */
export async function writeAllFrames(projectPath: string): Promise<string[]> {
  const problems: string[] = []
  try {
    const frames = await listFrames(projectPath)
    if (frames.length === 0) return problems
    const [widths, groupLayouts] = await Promise.all([
      getBreakpointWidths(projectPath),
      readGroupLayouts(projectPath, problems)
    ])
    for (const def of frames) {
      await writeFrameFiles(projectPath, def, widths, groupLayouts)
    }
  } catch (err) {
    console.error(`[layoutFrames] could not refresh the frames of ${projectPath}: ${String(err)}`)
    problems.push(mainT('frameRefreshFailed', { error: String(err) }))
  }
  return problems
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

/**
 * Why a frame definition cannot be written, or null.
 *
 * This is the door: `saveFrame` is where a definition becomes files, and a template package walks
 * through it with whatever its frames.json holds. The IPC channel declares the same shape in
 * `gridFrameDefinition`, but a `.qtpl` is a file somebody passed along and reaches saveFrame
 * directly - so the guard belongs here, where the value is read, not only at the one door the
 * renderer uses. What an unchecked area name costs is not abstract: it goes verbatim into
 * `grid-template-areas`, into a `grid-area`, into the generated module's class name and into
 * AREAS, and an unchecked slot indexes `bySlot`, where "constructor" hands the frame a function
 * instead of a list and every page render throws.
 *
 * The two structural checks are the ones no schema can express, and both cost the same thing
 * twice: CSS rejects a whole `grid-template-areas` declaration when one name names two
 * rectangles (measured: the frame keeps its areas and loses its layout), and two areas holding one
 * group on one slot render that group's components twice on every page. The frame editor refuses
 * both before saving; this is the same refusal for the way in that has no editor.
 */
export function frameDefinitionProblem(raw: unknown): string | null {
  let def: GridFrameDefinition
  try {
    def = migrateGridFrameDefinition(raw as GridFrameDefinition | LegacyGridFrameDefinition)
  } catch (err) {
    return mainT('frameShapeInvalid', { detail: String(err) })
  }
  const parsed = gridFrameDefinition.safeParse(def)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const where = issue.path.join('.') || 'frame'
    return mainT('frameShapeInvalid', { detail: `${where}: ${issue.message}` })
  }
  const names = new Set<string>()
  const groups = new Set<string>()
  for (const area of def.areas) {
    if (names.has(area.name)) return mainT('frameAreaNameDuplicate', { name: area.name })
    names.add(area.name)
    if (!area.slot || !area.group) continue
    const key = `${area.slot}\u0000${area.group}`
    if (groups.has(key)) return mainT('frameAreaGroupDuplicate', { name: area.group })
    groups.add(key)
  }
  return null
}

export async function saveFrame(
  projectPath: string,
  rawDef: GridFrameDefinition | LegacyGridFrameDefinition,
  // A template import takes one snapshot for the whole import and passes false here, so a package
  // carrying ten frames does not leave ten more behind it.
  options?: { snapshot?: boolean }
): Promise<PluginActionResult> {
  const problem = frameDefinitionProblem(rawDef)
  if (problem) return { success: false, output: problem }
  // The IPC handler's zod schema already rejects a legacy-shaped payload from the renderer, but
  // importPackage() calls this directly with whatever a template package's frames.json contains -
  // possibly a pre-breakpoint export - so migrate defensively here too, not just in listFrames().
  const def = migrateGridFrameDefinition(rawDef)
  const isNew = !existsSync(frameDir(projectPath, def.id))
  await writeFrameFiles(projectPath, def, await getBreakpointWidths(projectPath), await readGroupLayouts(projectPath))
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
