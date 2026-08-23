import { existsSync, mkdirSync, rmSync } from 'fs'
import { readFile, readdir, writeFile } from 'fs/promises'
import { join } from 'path'
import type { GridFrameArea, GridFrameDefinition, PluginActionResult } from '@shared/ipc-contract'
import * as pluginService from './pluginService'

// Authored frames live inside the project (.quartz-gui/, same convention as
// themePresetsService.ts/backupService.ts) so they travel with the project, not the app install.
// Each subdirectory IS the generated companion plugin's directory - it gets symlinked verbatim
// into .quartz/plugins/<id> by `quartz plugin add <absolute path>` (verified: local sources are
// symlinked, not copied, and the plugin name is derived from the source path's basename - see
// quartz/cli/plugin-git-handlers.js's handlePluginAdd + plugin-data.js's parseGitSource).
function framesDir(projectPath: string): string {
  const dir = join(projectPath, '.quartz-gui', 'authored-frames')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

// A frame id becomes a directory name under .quartz-gui/authored-frames/ and is also handed to
// `quartz plugin add <path>` (which derives the plugin name from the path's basename), so it has
// to be a plain slug. Unvalidated, an id from the renderer escapes the project entirely - ".."
// segments resolve upward through join(), and deleteFrame() then rmSync's that path recursively.
// Dots and separators are excluded outright rather than filtered, so there is nothing to escape.
const FRAME_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i

function frameDir(projectPath: string, id: string): string {
  if (!FRAME_ID_RE.test(id)) {
    throw new Error(`Ungültige Frame-ID "${id}" - erlaubt sind nur Buchstaben, Ziffern und Bindestriche.`)
  }
  return join(framesDir(projectPath), id)
}

// 1-based row/col, matching CSS grid-row/grid-column line numbers - builds the string handed to
// `grid-template-areas`. Cells not covered by any area become "." (an intentional empty gap).
function buildTemplateAreas(rows: number, cols: number, areas: GridFrameArea[]): string {
  const grid: string[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => '.'))
  for (const area of areas) {
    for (let r = area.row; r < area.row + area.rowSpan; r++) {
      for (let c = area.col; c < area.col + area.colSpan; c++) {
        if (r >= 1 && r <= rows && c >= 1 && c <= cols) grid[r - 1][c - 1] = area.name
      }
    }
  }
  return grid.map((row) => `"${row.join(' ')}"`).join('\n      ')
}

function buildFrameCss(def: GridFrameDefinition): string {
  const areaRules = def.areas.map((area) => `.qgframe-area-${area.name} { grid-area: ${area.name}; }`).join('\n')
  return `.qgframe-grid {
  display: grid;
  grid-template-columns: repeat(${def.cols}, 1fr);
  grid-template-rows: repeat(${def.rows}, auto);
  gap: ${def.gap};
  grid-template-areas:
      ${buildTemplateAreas(def.rows, def.cols, def.areas)};
}
${areaRules}`
}

// Renders to a preact vnode tree via `h()` directly rather than JSX, since this file is written
// as plain compiled JS with no build step (frameLoader.ts skips npm install/build whenever a
// plugin's dist/ already exists on disk). `pageBody` is a single component (Content), unlike the
// other 6 slots which are arrays - see PageFrameProps in quartz/components/frames/types.ts.
function generateFrameJs(def: GridFrameDefinition): string {
  return `import { h, Fragment } from "preact"

const AREAS = ${JSON.stringify(def.areas)}

export const Frame = {
  name: ${JSON.stringify(def.frameName)},
  css: ${JSON.stringify(buildFrameCss(def))},
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

async function writeFrameFiles(projectPath: string, def: GridFrameDefinition): Promise<void> {
  const dir = frameDir(projectPath, def.id)
  mkdirSync(join(dir, 'dist'), { recursive: true })
  await Promise.all([
    writeFile(join(dir, 'frame.json'), JSON.stringify(def, null, 2), 'utf-8'),
    writeFile(join(dir, 'package.json'), generatePackageJson(def), 'utf-8'),
    writeFile(join(dir, 'dist', 'frames.js'), generateFrameJs(def), 'utf-8')
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
          return JSON.parse(await readFile(join(dir, e.name, 'frame.json'), 'utf-8')) as GridFrameDefinition
        } catch {
          return null
        }
      })
  )
  return defs.filter((d): d is GridFrameDefinition => d !== null)
}

export async function saveFrame(projectPath: string, def: GridFrameDefinition): Promise<PluginActionResult> {
  const isNew = !existsSync(frameDir(projectPath, def.id))
  await writeFrameFiles(projectPath, def)
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
