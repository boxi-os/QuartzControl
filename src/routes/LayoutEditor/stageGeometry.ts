import type { FrameBreakpoint, GridBreakpointLayout, PluginLayoutDeclaration } from '@shared/ipc-contract'

/**
 * The layout board as a page in miniature: a frame's columns, gaps and paddings, reduced to fit the
 * width the board has and never wider.
 *
 * Reduced through the proportions, not through `transform: scale`. dnd-kit measures rectangles, and
 * a scaled layer hands it rectangles that are not where the pointer and the arrow keys think they
 * are - the same kind of fault as the 1060px drag rect in conventions.md ("Kein natives
 * HTML5-Drag"). So every track is resolved to pixels at a reference width and written back as
 * `minmax(0, <px>fr)`, and every gap and padding as a share of the stage (`cqw`, the stage is an
 * inline-size container). A grid built that way cannot be wider than its stage, which is what took
 * the sideways scroller of 1.0 away: at 1280px the editorial frame's fixed tracks and gaps added up
 * to 1068px in a column of 622.
 *
 * Row heights are not reduced: a row size describes the built page's content, and the stage's cells
 * hold chips instead (see the board's own comment on rowSizes).
 */

// The window width each view stands for: a common laptop at desktop, a tablet held upright, a
// phone. They are reference points for the proportions, not breakpoints - those belong to the
// project (FrameBreakpointWidths).
export const STAGE_REFERENCE_WIDTH: Record<FrameBreakpoint, number> = { desktop: 1456, tablet: 1000, mobile: 390 }

const ROOT_FONT_SIZE = 16

interface LengthContext {
  // What a percentage refers to, in px.
  percentBase: number
  // The window width, for vw.
  viewport: number
}

/**
 * A CSS length to px, or null when it is not a length this can know without a page: `auto`,
 * `min-content`, `fit-content()`, an `em` of an unknown font, a `var()`. Covers what frames hold in
 * practice - px, rem, %, vw, and `calc()`/`min()`/`max()`/`clamp()` over them (the example frames
 * write their side tracks as `calc((300px - 8rem) / 3)`).
 */
export function lengthToPx(value: string, ctx: LengthContext): number | null {
  const src = value.trim()
  let pos = 0

  const skip = (): void => {
    while (pos < src.length && /\s/.test(src[pos])) pos++
  }
  // A value is a number plus whether it is a length; `*` and `/` need one side to be a plain number.
  type Val = { n: number; length: boolean }

  function primary(): Val | null {
    skip()
    if (src[pos] === '(') {
      pos++
      const v = sum()
      skip()
      if (src[pos] !== ')') return null
      pos++
      return v
    }
    const fn = /^(calc|min|max|clamp)\(/i.exec(src.slice(pos))
    if (fn) {
      pos += fn[0].length
      const args: Val[] = []
      for (;;) {
        const v = sum()
        if (!v) return null
        args.push(v)
        skip()
        if (src[pos] === ',') {
          pos++
          continue
        }
        if (src[pos] === ')') {
          pos++
          break
        }
        return null
      }
      const name = fn[1].toLowerCase()
      const ns = args.map((a) => a.n)
      const length = args.some((a) => a.length)
      if (name === 'calc') return args.length === 1 ? args[0] : null
      if (name === 'min') return { n: Math.min(...ns), length }
      if (name === 'max') return { n: Math.max(...ns), length }
      return args.length === 3 ? { n: Math.min(Math.max(ns[0], ns[1]), ns[2]), length } : null
    }
    const num = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(px|rem|%|vw)?/i.exec(src.slice(pos))
    if (!num) return null
    pos += num[0].length
    const n = Number(num[1])
    switch (num[2]?.toLowerCase()) {
      case undefined:
        return { n, length: false }
      case 'px':
        return { n, length: true }
      case 'rem':
        return { n: n * ROOT_FONT_SIZE, length: true }
      case '%':
        return { n: (n / 100) * ctx.percentBase, length: true }
      case 'vw':
        return { n: (n / 100) * ctx.viewport, length: true }
      default:
        return null
    }
  }

  function product(): Val | null {
    let left = primary()
    for (;;) {
      if (!left) return null
      skip()
      const op = src[pos]
      if (op !== '*' && op !== '/') return left
      pos++
      const right = primary()
      if (!right) return null
      if (op === '*') {
        if (left.length && right.length) return null
        left = { n: left.n * right.n, length: left.length || right.length }
      } else {
        if (right.length || right.n === 0) return null
        left = { n: left.n / right.n, length: left.length }
      }
    }
  }

  function sum(): Val | null {
    let left = product()
    for (;;) {
      if (!left) return null
      skip()
      const op = src[pos]
      // calc() wants whitespace around + and -; a sign glued to a number belongs to the number.
      if ((op !== '+' && op !== '-') || !/\s/.test(src[pos - 1] ?? ' ')) return left
      pos++
      const right = product()
      if (!right) return null
      left = { n: op === '+' ? left.n + right.n : left.n - right.n, length: left.length || right.length }
    }
  }

  const result = sum()
  skip()
  if (!result || pos !== src.length) return null
  // A bare 0 is a length in CSS; any other plain number is not.
  if (!result.length && result.n !== 0) return null
  return result.n
}

type Track = { px: number } | { fr: number }

// One track size as CSS would read it for this purpose: a share of the free space, or a length.
// `minmax(a, <n>fr)` is the frame builder's own floor around a flexible track and counts as the fr;
// anything that is neither - `auto`, `min-content`, a `var()` - is taken as `1fr` and reported, so
// the stage can say it is approximate rather than pretend.
function readTrack(size: string, ctx: LengthContext): { track: Track; exact: boolean } {
  const s = size.trim()
  const fr = /^(\d*\.?\d+)fr$/.exec(s)
  if (fr) return { track: { fr: Number(fr[1]) }, exact: true }
  const mm = /^minmax\((.+),\s*(\d*\.?\d+)fr\s*\)$/i.exec(s)
  if (mm) return { track: { fr: Number(mm[2]) }, exact: true }
  const px = lengthToPx(s, ctx)
  if (px !== null) return { track: { px: Math.max(0, px) }, exact: true }
  // `auto` in a grid with no fr track takes what is left, exactly like 1fr - Quartz's own
  // `320px auto 320px` is that case, so it is not worth a remark.
  return { track: { fr: 1 }, exact: s === 'auto' }
}

/**
 * Tracks resolved at a width and written as fr shares of it. `inner` is the width the tracks and
 * the gaps between them share; gaps are given in px at the same width.
 */
export function stageTracks(
  sizes: string[],
  { inner, gap, viewport }: { inner: number; gap: number; viewport: number }
): { columns: string; approximate: string[] } {
  const ctx = { percentBase: inner, viewport }
  const read = sizes.map((s) => ({ size: s, ...readTrack(s, ctx) }))
  const fixed = read.reduce((sum, r) => sum + ('px' in r.track ? r.track.px : 0), 0)
  const frTotal = read.reduce((sum, r) => sum + ('fr' in r.track ? r.track.fr : 0), 0)
  // CSS gives fr tracks what the fixed ones and the gaps leave, and nothing when they leave nothing
  // (the page then overflows - the stage, built of shares, squeezes instead).
  const free = Math.max(0, inner - fixed - gap * Math.max(0, sizes.length - 1))
  const widths = read.map((r) => ('px' in r.track ? r.track.px : frTotal > 0 ? (free * r.track.fr) / frTotal : 0))
  const total = widths.reduce((a, b) => a + b, 0)
  const columns = widths.map((w) => `minmax(0, ${total > 0 ? round(w) : 1}fr)`).join(' ')
  return { columns, approximate: read.filter((r) => !r.exact).map((r) => r.size) }
}

export interface StageFrame {
  gridTemplateColumns: string
  columnGap: string
  rowGap: string
  // The frame's own box (maxWidth, align, paddings), as shares of the stage.
  width: string
  marginInline: string
  paddingBlock: string
  paddingInline: string
  // Track sizes that could only be guessed (see readTrack).
  approximate: string[]
}

const cqw = (px: number, viewport: number): string => `${round((px / viewport) * 100)}cqw`

function round(n: number): number {
  return Math.round(n * 1000) / 1000
}

/** An authored frame's breakpoint layout, reduced to the stage of `breakpoint`'s reference width. */
export function stageFrame(layout: GridBreakpointLayout, breakpoint: FrameBreakpoint): StageFrame {
  const viewport = STAGE_REFERENCE_WIDTH[breakpoint]
  const outer = { percentBase: viewport, viewport }
  const cap = layout.maxWidth?.trim() ? lengthToPx(layout.maxWidth, outer) : null
  const width = Math.min(viewport, cap ?? viewport)
  // Padding percentages refer to the containing block's width, which is the page around the frame.
  const padInline = (layout.paddingInline?.trim() && lengthToPx(layout.paddingInline, outer)) || 0
  const padBlock = (layout.paddingBlock?.trim() && lengthToPx(layout.paddingBlock, outer)) || 0
  const inner = Math.max(0, width - 2 * padInline)
  const gapCtx = { percentBase: inner, viewport }
  const columnGap = lengthToPx(layout.columnGap, gapCtx) ?? 0
  const rowGap = lengthToPx(layout.rowGap, gapCtx) ?? 0
  const sizes = Array.from({ length: layout.cols }, (_, i) => layout.columnSizes?.[i]?.trim() || '1fr')
  const { columns, approximate } = stageTracks(sizes, { inner, gap: columnGap, viewport })
  const align = layout.align ?? 'left'
  return {
    gridTemplateColumns: columns,
    columnGap: cqw(columnGap, viewport),
    rowGap: cqw(rowGap, viewport),
    width: `${round((width / viewport) * 100)}%`,
    // Auto margins, as in buildFrameBox; with a definite width they only distribute what is left.
    marginInline: align === 'center' ? 'auto' : align === 'right' ? '0 0 0 auto' : '0',
    paddingBlock: cqw(padBlock, viewport),
    paddingInline: cqw(padInline, viewport),
    approximate
  }
}

/**
 * Whether a component with this `display` is on the page in this view. On a page with an authored
 * frame, `.desktop-only`/`.mobile-only` switch at the project's own mobile width, not at Quartz's
 * 800px - buildQuartzBreakpointCompat in shared/gridFrameCss.ts restates them per frame - so the
 * views and the switch always agree. Measured on the built Example (mobile width 900) in Chrome:
 * at 850px the desktop-only components are `display: none` and the mobile-only one `contents`.
 */
export function shownInView(display: PluginLayoutDeclaration['display'], breakpoint: FrameBreakpoint): boolean {
  if (display === 'desktop-only') return breakpoint !== 'mobile'
  if (display === 'mobile-only') return breakpoint === 'mobile'
  return true
}
