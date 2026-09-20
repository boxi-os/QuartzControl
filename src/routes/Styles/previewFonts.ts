import type { FontFaceInfo, QuartzConfig } from '@shared/ipc-contract'
import { fontLoaders } from './fontDelivery'
import { forgetFontAvailability, googleFontRequest, type TypographySlot } from './fontSpec'

// The faces this window has added to `document.fonts`, by what they are. One set for the whole
// renderer, because `document.fonts` is one set: a face from the project opened before would
// otherwise stand in for a same-named family of this one.
const added = new Map<string, FontFace>()

/**
 * Loads the font files of `families` into this window, so the preview draws the font the site will
 * have. Until 2026-09-18 it drew whatever this machine had installed: "Open Sans" looked right on a
 * Mac where a font manager had activated it, "Roboto Mono" fell back, and the preview called the
 * second one "not installed" although the build had downloaded both.
 *
 * `new FontFace(name, bytes)` rather than a URL: the CSP allows no font URL but the app's own, and
 * the bytes come through the main process, which only hands out files under `static/fonts`.
 * Returns whether the project has been built at all.
 */
export async function loadPreviewFonts(projectPath: string, families: string[]): Promise<boolean> {
  const result = await window.quartzGui.styles.previewFonts({ projectPath, families })
  const current = new Set<string>()
  const loads: Promise<unknown>[] = []
  for (const face of result.faces) {
    const key = `${face.family}|${face.weight}|${face.style}|${face.unicodeRange ?? ''}|${face.data.byteLength}`
    current.add(key)
    if (added.has(key)) continue
    const fontFace = new FontFace(face.family, face.data, {
      weight: face.weight,
      style: face.style,
      ...(face.unicodeRange ? { unicodeRange: face.unicodeRange } : {})
    })
    added.set(key, fontFace)
    loads.push(
      fontFace
        .load()
        .then((loaded) => document.fonts.add(loaded))
        // A file the browser cannot read is the same as no file: the preview falls back and says so.
        .catch(() => added.delete(key))
    )
  }
  let removed = false
  for (const [key, fontFace] of added) {
    if (current.has(key) || !families.some((f) => f.toLowerCase() === key.split('|')[0].toLowerCase())) continue
    document.fonts.delete(fontFace)
    added.delete(key)
    removed = true
  }
  await Promise.all(loads)
  if (loads.length > 0 || removed) forgetFontAvailability()
  return result.built
}

export type FontBuildState =
  | { kind: 'notBuilt' }
  | { kind: 'missing'; families: string[] }
  | { kind: 'notFetched'; families: string[] }
  /** Nothing fetches these, and no rule in the project declares them: the site has a substitute. */
  | { kind: 'noRule'; families: string[] }
  | null

/**
 * Whether the fonts the site asks Google for are still waiting for a build. Only when the files are
 * served locally - that is the one mode in which Quartz downloads them, and does so at build time;
 * with Google at page view there is nothing to wait for, and the preview cannot have them either.
 * Asked per family against the faces the build really has, not by comparing timestamps: a build
 * after an unrelated change is newer than the config and still lacks a font chosen since.
 */
// Since 2026-09-19 core's "served locally" is the app's own fetch into the project (fontDelivery.ts),
// so its files are there once the page is saved and no build is waited for; only the Fonts
// plugin's `selfHosted` still downloads at build time.
export function fontBuildState(config: QuartzConfig, faces: FontFaceInfo[], built: boolean | null): FontBuildState {
  const loaders = fontLoaders(config)
  const heldByProject = loaders.some((l) => l.via === 'core' && l.mode === 'selfHosted')
  const pluginAtBuild = loaders.some((l) => l.via === 'plugin' && l.mode === 'selfHosted')
  const typography = (config.theme.typography ?? {}) as Record<string, unknown>
  // Nothing loads a webfont here, which is the honest state of `fontOrigin: local` - Quartz's own
  // branch for it reads "let the user do it themselves in css". Then the only question left is
  // whether the user did: a slot whose family no @font-face in the project declares renders as a
  // substitute, and until now nothing said so. That is also where a project lands whose
  // google-fonts block was taken out from underneath it - a restore of custom.scss from a snapshot
  // older than the fetch (thirty-third review, finding 3, second half).
  if (!heldByProject && !pluginAtBuild) {
    if (loaders.length > 0) return null
    // Build faces do not count here for the same reason as below: under `local` Quartz's core
    // emits nothing, so a face in the build output is the leftover of an earlier setting, and with
    // every loader gone there is no emitter left that could have written it. A theme's own faces
    // arrive as origin 'theme' and do count - but an enabled theme is a loader and left above.
    const unique = missingFrom(typography, faces.filter((f) => f.origin !== 'build'))
    return unique.length > 0 ? { kind: 'noRule', families: unique } : null
  }
  // Held by the project means in the project: a family an older build still carries (Quartz's own
  // download, from before the switch) is no answer to whether the project has it.
  const counted = heldByProject ? faces.filter((f) => f.origin !== 'build') : faces
  const unique = missingFrom(typography, counted)
  if (heldByProject) return unique.length > 0 ? { kind: 'notFetched', families: unique } : null
  if (built === null) return null
  if (!built) return { kind: 'notBuilt' }
  return unique.length > 0 ? { kind: 'missing', families: unique } : null
}

/** The slot families none of `faces` declares, each named once. */
function missingFrom(typography: Record<string, unknown>, faces: FontFaceInfo[]): string[] {
  const have = new Set(faces.map((f) => f.family.toLowerCase()))
  const missing = (['header', 'body', 'code'] as TypographySlot[])
    .map((slot) => googleFontRequest(slot, typography[slot])?.family)
    .filter((family): family is string => Boolean(family) && !have.has(family!.toLowerCase()))
  return [...new Set(missing)]
}
