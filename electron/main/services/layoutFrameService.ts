import { existsSync, mkdirSync, rmSync } from 'fs'
import { readFile, readdir } from 'fs/promises'
import { readJsonFileOr, writeFileAtomic, writeJsonFile } from './jsonStore'
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
  await serialised(projectPath, async () => {
    const groupLayoutsFor = await readGroupLayouts(projectPath)
    for (const def of await listFrames(projectPath)) {
      await writeFrameFiles(projectPath, def, widths, groupLayoutsFor)
    }
  })
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
// `groupLayouts` is every group ordering this config can produce *and hand to this frame*
// (groupLayoutCandidates with the frame's name), baked in because it is the one thing the frame
// cannot work out for itself: quartz hands it a flat array per position in which each group is one
// anonymous `Flex`, so rank is the only way to tell them apart - and the ordering belongs to the
// page type, which the frame is never told. That makes the frame files depend on the layout half of
// quartz.config.yaml, which is why buildService calls writeAllFrames() before every build and every
// dev server - the one place the baked-in copy is ever read (see refreshAuthoredFrames there for
// why it is the only guard).
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
// neither does componentData. Hence GROUP_LAYOUTS: every ordering that can reach this frame, and
// pickGroupOrder to work out which one arrived. A page type whose \`template\` names another frame
// is not in this list - see groupLayoutCandidates for why leaving it in was not harmless.
const POSITIONS = ["header", "beforeBody", "afterBody", "left", "right", "footer"]
// The positions this frame divides. Only these are ever taken apart, and only these decide when
// the counts of all six cannot (see pickGroupOrder). A position without a group area still speaks
// as evidence, but never about its own contents - it has none to get wrong, and a page type that
// merely cleared it was enough to spend the position's one warning before a real break could
// have it.
const SPLIT_POSITIONS = POSITIONS.filter((p) => AREAS.some((a) => a.slot === p && a.group))
const warned = new Set()

function orderOf(order, position) {
  return order[position] || []
}

function countsLike(order, counts, positions) {
  return positions.every((p) => orderOf(order, p).length === counts[p])
}

// The relaxed key of the second pass: every divided position exactly, every other one only as an
// upper bound. See pickGroupOrder for why the direction is the whole point.
function countsFit(order, counts) {
  return POSITIONS.every((p) =>
    SPLIT_POSITIONS.indexOf(p) === -1 ? orderOf(order, p).length >= counts[p] : orderOf(order, p).length === counts[p]
  )
}

function splitsAlike(a, b) {
  return SPLIT_POSITIONS.every((p) => orderOf(a, p).join("\\u0000") === orderOf(b, p).join("\\u0000"))
}

// Same groups on every divided position, whatever their order. The difference decides which of the
// two ambiguity messages is true: telling the groups apart by an ordering rule only works when
// there is an ordering to fix.
function namesAlike(a, b) {
  return SPLIT_POSITIONS.every(
    (p) => orderOf(a, p).slice().sort().join("\\u0000") === orderOf(b, p).slice().sort().join("\\u0000")
  )
}

function nameOf(candidate) {
  return candidate.pageType === null ? "the config as a whole" : 'page type "' + candidate.pageType + '"'
}

function countsOf(order) {
  return SPLIT_POSITIONS.map((p) => p + " " + orderOf(order, p).length).join(", ")
}

function renderedOf(counts, positions) {
  return positions.map((p) => p + " " + counts[p]).join(", ")
}

function groupsOf(order) {
  return SPLIT_POSITIONS.map((p) => p + ": " + (orderOf(order, p).join(", ") || "no group")).join("; ")
}

// The only thing a frame can measure about the layout it was handed is how many Flexes each
// position holds, so that is the whole key: the candidate whose group counts match is the one this
// page was built with. Exactly one match is the answer; several that name the same groups in the
// same order are the same answer said twice. Anything else means guessing, and a guess here is the
// one failure that cannot be seen on the built page - two areas quietly showing each other's
// contents - so it falls back to not splitting at all and says why.
//
// Matched in two passes, and the second pass is what keeps the first one honest. All six positions
// are the sharper key: one this frame does not divide can still be the only thing telling two page
// types apart, so it is asked first. But a count that disagrees *there* need not say the candidate
// is wrong - matching everywhere and nowhere else meant a group on \`footer\` that quartz renders no
// flex for emptied both group areas of \`header\` on every page of the site (measured: 201 of 201).
//
// So the second pass relaxes the positions this frame does not divide - but only in the one
// direction they can be wrong about *and still be this page*. A position that renders **fewer**
// flexes than the candidate describes has the ordinary explanation: a group whose members all got
// disabled, an entry whose \`layout.group\` quartz makes no flex for. A position that renders
// **more** has none - nothing about this page can add a group the ordering has never heard of, so
// that is the candidate contradicting itself, and it stays out. Measured, at the generated module
// and at a real build: dropping the outside positions entirely instead threw away the very
// evidence that kept a wrong candidate out. A break *inside* a divided position leaves a count
// there that some other page type happens to hit (one that excludes a whole group), and with the
// outside no longer looking, that candidate won - 203 of 211 editorial pages showed group
// \`custom-8\`'s components in the area of \`custom-9\`, under a warning that said the position had
// been "divided as usual". Asking for "described >= rendered" keeps the seventh review's case and
// puts that one back on the fallback, where it says the counts fit nothing.
//
// Only ever a widening of a match set that was empty - a candidate that fits all six exactly is
// still preferred over one that merely fits within the relaxed key.
function pickGroupOrder(bySlot) {
  if (SPLIT_POSITIONS.length === 0) return null
  const counts = {}
  for (const p of POSITIONS) counts[p] = (bySlot[p] || []).filter((C) => C.name === "Flex").length
  let matches = GROUP_LAYOUTS.filter((c) => countsLike(c.order, counts, POSITIONS))
  const relaxed = matches.length === 0
  if (relaxed) matches = GROUP_LAYOUTS.filter((c) => countsFit(c.order, counts))
  const order =
    matches.length === 1 || (matches.length > 1 && matches.every((c) => splitsAlike(c.order, matches[0].order)))
      ? matches[0].order
      : null
  // Once per distinct shape, not once per page: the same mismatch is true for every one of the
  // 100-odd pages built with this layout, and a warning repeated 300 times reads like noise.
  if (order && !relaxed) return order
  if (order) {
    // Divided as usual - but the config describes flexes somewhere this frame does not divide that
    // the page did not render. Nothing here changes what the areas show; it is said because "no
    // groups" and "a group whose members never render" look the same on the built page, and this
    // is the one place that can still tell them apart. Always fewer than described, never more -
    // countsFit does not let the other direction through.
    const off = POSITIONS.filter((p) => SPLIT_POSITIONS.indexOf(p) === -1 && orderOf(order, p).length !== counts[p])
    const key = "undivided@" + renderedOf(counts, off)
    if (!warned.has(key)) {
      warned.add(key)
      // The counts named here are the chosen ordering's. Several candidates can divide alike and
      // still describe these positions differently, and then this one is an arbitrary pick among
      // equals - so it says so rather than naming one as if it were the only fit.
      const alsoFit = matches.filter((c) => POSITIONS.some((p) => orderOf(c.order, p).length !== orderOf(order, p).length))
      console.warn(
        "[" + FRAME_NAME + "] " +
          off.map((p) => p + " renders " + counts[p] + " group flex(es), not the " + orderOf(order, p).length + " " +
            nameOf(matches[0]) + " describes").join("; ") + ". " +
          (alsoFit.length > 0
            ? "(" + alsoFit.map(nameOf).join(" and ") + " divide" + (alsoFit.length === 1 ? "s" : "") +
              " these positions the same way and would fit too.) "
            : "") +
          "This frame divides none of those positions, so " + SPLIT_POSITIONS.join(" and ") + " was divided as usual. " +
          "Usually a group whose members all got disabled, or an entry whose layout.group quartz renders no flex for."
      )
    }
    return order
  }
  const key = matches.length + "@" + renderedOf(counts, SPLIT_POSITIONS)
  if (!warned.has(key)) {
    warned.add(key)
    const rendered = renderedOf(counts, SPLIT_POSITIONS)
    if (matches.length === 0) {
      // A candidate can hit every divided position and still be out, ruled out by a position
      // outside them where this page rendered a group flex it has no group for (countsFit). The
      // list below only shows the divided positions, so without this clause the message would say
      // "no layout produces header 1" while printing a layout that says header 1 - and the one
      // thing that actually ruled it out would be the one thing left unsaid.
      const contradicted = GROUP_LAYOUTS.filter((c) => countsLike(c.order, counts, SPLIT_POSITIONS)).map(
        (c) =>
          nameOf(c) + " fits that, but " +
          POSITIONS.filter((p) => SPLIT_POSITIONS.indexOf(p) === -1 && counts[p] > orderOf(c.order, p).length)
            .map((p) => p + " renders " + counts[p] + " group flex(es) it has no group for")
            .join(" and ")
      )
      console.warn(
        "[" + FRAME_NAME + "] this page renders " + rendered + " group flex(es), which no layout in " +
          "quartz.config.yaml accounts for (" + GROUP_LAYOUTS.map((c) => nameOf(c) + ": " + countsOf(c.order)).join("; ") + "). " +
          (contradicted.length > 0 ? contradicted.join("; ") + ". " : "") +
          "Not splitting: every position's area without a group takes the lot, the group areas stay empty. " +
          "Usually a group whose members all got disabled, or a quartz.config.yaml edited by hand since this frame was written."
      )
    } else if (matches.every((c) => namesAlike(c.order, matches[0].order))) {
      console.warn(
        "[" + FRAME_NAME + "] this page renders " + rendered + " group flex(es), which fits " +
          matches.map(nameOf).join(" and ") + " - and they order the groups differently (" +
          matches.map((c) => nameOf(c) + " -> " + groupsOf(c.order)).join("; ") + "). " +
          "Not splitting, because guessing would swap what the areas show. Give those groups an explicit " +
          "priority under layout.groups so their order is the same for every page type."
      )
    } else {
      // Not a question of order at all: these name *different* groups, so there is nothing an
      // ordering rule could line up - measured, with and without layout.groups priorities, the same
      // message and the same fallback word for word. Two page types that each drop a whole group
      // are indistinguishable from in here, because the flex count is the only thing this can
      // measure and both produce the same one. Both ways out are measured too: keeping one member
      // of each group leaves both groups standing, which collapses the candidates into one; and
      // clearing the position for one page type makes its count differ, which tells them apart.
      console.warn(
        "[" + FRAME_NAME + "] this page renders " + rendered + " group flex(es), which fits " +
          matches.map(nameOf).join(" and ") + " - and they name different groups there (" +
          matches.map((c) => nameOf(c) + " -> " + groupsOf(c.order)).join("; ") + "). " +
          "Not splitting, because guessing would put one group's components in the other's area - and no " +
          "priority under layout.groups can line up groups that are not the same ones. All this can " +
          "measure is how many flexes arrived, and excluding a whole group per page type leaves both of " +
          "these with the same number. Leave one member of each group in place to keep both groups and " +
          "both counts, or clear the position for one of the page types so the counts differ."
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
  // the Flexes of every position it divides, and this line is only reached for one it divides (the
  // early return above). It returns null when no candidate does. The relaxed second pass loosens
  // the *other* positions, never these.
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

// A frame's generated code carries the group orderings that can reach *it* (see generateFrameJs),
// so every write needs them - and it is per frame, not per project: a page type whose `template`
// names another frame contributes an ordering this one never renders. Hence a reader that hands
// back a function instead of a list; the config is read once per write pass, the narrowing happens
// per frame.
//
// Unreadable config means no groups rather than a failed write: a frame that shows a position
// undivided is a frame that still builds, and the alternative is a project whose frames cannot be
// saved because of a syntax error somewhere else in the yaml.
type GroupLayoutsFor = (frameName: string) => GroupLayoutCandidate[]

async function readGroupLayouts(projectPath: string, problems?: string[]): Promise<GroupLayoutsFor> {
  try {
    const config = await configService.readConfig(projectPath)
    return (frameName) => groupLayoutCandidates(config, frameName)
  } catch (err) {
    // "No groups" and "could not tell" render the same - every position undivided, the group areas
    // empty - and the frame cannot tell them apart either, since the empty ordering is all it
    // gets. So the difference has to be said here, where it is known, and it has to reach the one
    // place the user is looking: the build log. `console.error` alone is a message to nobody.
    console.error(`[layoutFrames] could not read the layout groups of ${projectPath}: ${String(err)}`)
    problems?.push(mainT('frameGroupsUnreadable', { error: String(err) }))
    return () => [{ pageType: null, order: {} }]
  }
}

// One writer per project at a time. Three ways write the same three files now - saving a frame,
// changing the breakpoint widths, and the refresh in front of every build and every server start -
// and "Jetzt bauen" right after "Starten" is two of them within a second. Atomic writes keep each
// file whole; this keeps a set of them from being written half by one caller and half by another,
// which no single-file guarantee can. A chained promise rather than a real lock: these are
// sub-millisecond writes and the only thing that has to hold is the order.
const frameWrites = new Map<string, Promise<unknown>>()

function serialised<T>(projectPath: string, work: () => Promise<T>): Promise<T> {
  const previous = frameWrites.get(projectPath) ?? Promise.resolve()
  // `work` on both paths: the next caller waits for the previous one to be *done*, not to have
  // succeeded - a failed refresh must not block the save that would fix it.
  const result = previous.then(work, work)
  const tail = result.then(
    () => undefined,
    () => undefined
  )
  frameWrites.set(projectPath, tail)
  void tail.then(() => {
    // Only if nothing queued behind it in the meantime, so the map holds one entry per project
    // while writes are in flight and nothing afterwards.
    if (frameWrites.get(projectPath) === tail) frameWrites.delete(projectPath)
  })
  return result
}

async function writeFrameFiles(
  projectPath: string,
  def: GridFrameDefinition,
  widths: FrameBreakpointWidths,
  groupLayoutsFor: GroupLayoutsFor
): Promise<void> {
  const dir = frameDir(projectPath, def.id)
  quartzGuiDir(projectPath, 'authored-frames') // creating: this is the write path
  mkdirSync(join(dir, 'dist'), { recursive: true })
  await Promise.all([
    // All three atomic, and `frames.js` is the one that made it necessary. frame.json is this
    // app's own copy - a half-written one drops the frame out of listFrames() while its plugin
    // entry stays in quartz.config.yaml - but frames.js is the file *quartz* imports, and since
    // the group order moved into it, three ways write it: saving a frame, changing the breakpoint
    // widths, and the refresh in front of every build and every server start. A build that has
    // already been spawned reads whatever lies there at that moment, and a plain writeFile
    // truncates before it streams. A rename cannot be seen half-done.
    writeJsonFile(join(dir, 'frame.json'), def),
    writeFileAtomic(join(dir, 'package.json'), generatePackageJson(def)),
    writeFileAtomic(join(dir, 'dist', 'frames.js'), generateFrameJs(def, widths, groupLayoutsFor(def.frameName)))
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
    if ((await listFrames(projectPath)).length === 0) return problems
    // Read *inside* the queue, not before it. Reading first and queueing after leaves a window in
    // which two callers both read and the one holding the older config writes last - the files
    // would then be whole, ordered, and stale, which is the failure the queue exists to prevent.
    await serialised(projectPath, async () => {
      const frames = await listFrames(projectPath)
      const [widths, groupLayoutsFor] = await Promise.all([
        getBreakpointWidths(projectPath),
        readGroupLayouts(projectPath, problems)
      ])
      for (const def of frames) {
        await writeFrameFiles(projectPath, def, widths, groupLayoutsFor)
      }
    })
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
// What is wrong with a frame definition, in the app's own language.
//
// Everywhere else in this app a zod message is left in English, because it describes a bug. Here it
// describes an *input* - a `.qtpl` is a file somebody passed along - and it lands inside a sentence
// the reader gets in their own language, which produced things like "Der Frame ist nicht lesbar:
// areas: Invalid input: expected array, received null". So the issue is said in the app's words
// instead: the path, which is data rather than prose, plus a phrase per issue code, plus whatever
// number or list the issue carries (a limit, the allowed values - also data).
//
// The five codes are the ones this schema can actually produce, checked against it rather than
// guessed: invalid_type, too_big, too_small, invalid_value (an enum) and invalid_format (a regex).
// Anything else keeps zod's own text, and that case really is a bug - the schema grew a rule this
// list was never told about, and an English sentence is then the right kind of ugly.
// Derived from the schema rather than imported from zod: it is the same discriminated union, so
// `issue.maximum` and `issue.values` below are narrowed by their `case` instead of cast.
type FrameShapeIssue = NonNullable<ReturnType<typeof gridFrameDefinition.safeParse>['error']>['issues'][number]

function shapeIssue(issue: FrameShapeIssue): string {
  const where = issue.path.join('.') || 'frame'
  switch (issue.code) {
    case 'invalid_type':
      return mainT('frameIssueType', { where })
    case 'too_big':
      return mainT('frameIssueTooBig', { where, limit: String(issue.maximum) })
    case 'too_small':
      return mainT('frameIssueTooSmall', { where, limit: String(issue.minimum) })
    case 'invalid_value':
      return mainT('frameIssueValue', { where, values: issue.values.join(', ') })
    case 'invalid_format':
      return mainT('frameIssueFormat', { where })
    default:
      return `${where}: ${issue.message}`
  }
}

export function frameDefinitionProblem(raw: unknown): string | null {
  let def: GridFrameDefinition
  try {
    def = migrateGridFrameDefinition(raw as GridFrameDefinition | LegacyGridFrameDefinition)
  } catch (err) {
    return mainT('frameShapeInvalid', { detail: String(err) })
  }
  const parsed = gridFrameDefinition.safeParse(def)
  if (!parsed.success) {
    return mainT('frameShapeInvalid', { detail: shapeIssue(parsed.error.issues[0]) })
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
  await serialised(projectPath, async () =>
    writeFrameFiles(projectPath, def, await getBreakpointWidths(projectPath), await readGroupLayouts(projectPath))
  )
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
