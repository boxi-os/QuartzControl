// CSS variable overrides - the `cssVariables` part of the package.
//
// Two kinds live here, deliberately mixed:
//
// 1. Quartz's own variables, overridden only where this template *disagrees* with what
//    joinStyles() derives from the nine colours. Everything it already derives correctly is
//    absent: an override that restates the default is noise in the user's Variables tab and
//    a lie about what the template decided.
// 2. `--tpl-*` tokens of our own. `saveVariableOverrides` writes any key as `--<key>` into an
//    unlayered `:root`, so a template can carry its own design tokens the same way it carries a
//    colour - and they stay editable in the app afterwards, which a value buried in SCSS is not.
//
// Every stylesheet below reads these; no raw hex, no magic number in a rule.

const SANS = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const MONO = 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'

export const VARIABLE_OVERRIDES = [
  /* ---- fonts: the self-hosted family plus a real fallback stack ------------------------
     Quartz writes --headerFont/--bodyFont/--codeFont from theme.typography as the bare family
     name. A woff2 that fails to load then falls back to the browser default rather than to
     something chosen, so each slot is restated here with a stack behind it. */
  { key: 'titleFont', light: `"Instrument Sans", ${SANS}` },
  { key: 'headerFont', light: `"Instrument Sans", ${SANS}` },
  { key: 'bodyFont', light: `"Inter", ${SANS}` },
  { key: 'codeFont', light: `"JetBrains Mono", ${MONO}` },
  { key: 'font-text', light: `"Inter", ${SANS}` },
  { key: 'font-interface', light: `"Inter", ${SANS}` },
  { key: 'font-monospace', light: `"JetBrains Mono", ${MONO}` },

  /* ---- the control-edge rule from palette.mjs, made real -------------------------------
     `lightgray` is a hairline and a surface; it measures 1.34:1 against the ground and must
     therefore never draw the edge of something a person operates. These three are exactly the
     variables Quartz uses for that, and they move to `gray` (3.0:1+ in both modes). */
  { key: 'background-modifier-border', light: 'var(--gray)', dark: 'var(--gray)' },
  { key: 'background-modifier-border-hover', light: 'var(--darkgray)', dark: 'var(--dark)' },
  { key: 'background-modifier-border-focus', light: 'var(--secondary)', dark: 'var(--secondary)' },

  /* ---- our own tokens ---------------------------------------------------------------- */

  // Rhythm. One scale, used for every gap and inset in the stylesheets.
  { key: 'tpl-space-3xs', light: '0.125rem' },
  { key: 'tpl-space-2xs', light: '0.25rem' },
  { key: 'tpl-space-xs', light: '0.5rem' },
  { key: 'tpl-space-sm', light: '0.75rem' },
  { key: 'tpl-space-md', light: '1rem' },
  { key: 'tpl-space-lg', light: '1.5rem' },
  { key: 'tpl-space-xl', light: '2.5rem' },
  // Only used by the frames' own padding (frames.mjs), which cannot reference a variable: a
  // frame value may not contain a comma, so `var(--x, fallback)` is impossible there and a bare
  // var() would break a frame imported without this part. Kept as the documented source of the
  // number that is literal in frames.mjs.
  { key: 'tpl-space-2xl', light: '4rem' },

  // Shape. Small and consistent - a minimal design that rounds one thing 12px and another 3px
  // reads as an accident.
  { key: 'tpl-radius-sm', light: '4px' },
  { key: 'tpl-radius-md', light: '8px' },
  { key: 'tpl-radius-lg', light: '14px' },

  // Lines. The hairline is the decorative rule (allowed to be faint); the control edge is not.
  { key: 'tpl-rule', light: 'var(--lightgray)', dark: 'var(--lightgray)' },
  { key: 'tpl-rule-strong', light: 'var(--gray)', dark: 'var(--gray)' },
  { key: 'tpl-rule-width', light: '1px' },

  // Surfaces. A card sits on `lightgray`; a quiet tint uses `highlight`.
  { key: 'tpl-surface', light: 'var(--lightgray)', dark: 'var(--lightgray)' },
  // A code block is a large area, and the tint that is right for one word of inline code makes a
  // twenty-line block a grey slab. Light mode gets a surface of its own, closer to the ground; in
  // dark mode it stays on `lightgray`, because lifting it there would move it towards the text
  // rather than away from it. The block's border is `tpl-rule` - which is what `tpl-surface` is -
  // so it gains an edge in exchange.
  { key: 'tpl-surface-code', light: '#F1EFE9', dark: 'var(--lightgray)' },
  { key: 'tpl-surface-tint', light: 'var(--highlight)', dark: 'var(--highlight)' },

  // Type scale, in one place so the six heading levels stay related to each other.
  { key: 'tpl-text-xs', light: '0.78rem' },
  { key: 'tpl-text-sm', light: '0.875rem' },
  { key: 'tpl-text-base', light: '1rem' },
  { key: 'tpl-text-lg', light: '1.15rem' },
  { key: 'tpl-text-xl', light: '1.4rem' },
  { key: 'tpl-text-2xl', light: '1.75rem' },
  { key: 'tpl-text-3xl', light: '2.25rem' },
  { key: 'tpl-leading-tight', light: '1.25' },
  { key: 'tpl-leading-normal', light: '1.6' },
  // Small type does not want the body's leading. 1.6 is generous at 1rem across a 672px column;
  // at 0.875rem in a 300px sidebar the same ratio pulls the lines so far apart that a three-line
  // paragraph reads as three separate ones - which is exactly how the layout-box in the sidebar
  // looked. Everything set in --tpl-text-sm or smaller uses this instead.
  //
  // A length, not a ratio, and that is the whole point of the value: 1.25rem is 20px, so every
  // line of small type sits on the same 20px step whatever its exact size - the 14px of a sidebar
  // row and the 12.5px of a date below it line up with each other instead of each keeping its own
  // rhythm. It inherits as a computed length, so a descendant that changes size does *not* rescale
  // it; anything that wants its own leading back says so (the headings do, via
  // --tpl-leading-tight).
  { key: 'tpl-leading-snug', light: '1.25rem' },

  // Tracking, and the reason there are two of it: an uppercase label needs more of it the smaller
  // it is set, so the micro-labels above every panel take more than the larger caps of an h5 or a
  // code block's language tag. Both were literals in nine and three files respectively - changing
  // how a label reads meant finding all twelve.
  { key: 'tpl-tracking-label', light: '0.08em' },
  { key: 'tpl-tracking-caps', light: '0.06em' },
  // How far a link's underline sits below the baseline. Low enough not to cut the descenders of a
  // g or a p, and one value across the eight places that draw one.
  { key: 'tpl-underline-offset', light: '0.18em' },

  // Focus. Its own token because it appears in ~20 rules and must never be tuned in only one.
  { key: 'tpl-focus-color', light: 'var(--secondary)', dark: 'var(--secondary)' },
  { key: 'tpl-focus-width', light: '2px' },
  { key: 'tpl-focus-offset', light: '2px' },

  // Depth. Almost none - one soft shadow for the two things that genuinely float (popover,
  // search overlay), different per mode because a black shadow is invisible on a dark ground.
  { key: 'tpl-shadow', light: '0 6px 24px rgba(23, 23, 26, 0.10)', dark: '0 6px 24px rgba(0, 0, 0, 0.55)' },

  // Motion, in one place so `prefers-reduced-motion` can null it out in one place.
  { key: 'tpl-motion', light: '150ms ease' },

  // The smallest comfortable size for something a finger has to hit. WCAG 2.2 asks for 24px;
  // 44px is the size at which nobody has to aim. Every control in this template reads it, so
  // dropping the whole UI to 36px is one edit here.
  { key: 'tpl-target', light: '44px' },

  // Icon size inside those controls - deliberately not tied to --tpl-target, because a bigger
  // target should give more room around the icon, not a bigger icon.
  { key: 'tpl-icon', light: '1.1rem' },

  // The accent bar that marks a state or an aside: the active explorer row, a blockquote, a
  // callout's edge, the current heading in the table of contents. One width for all of them.
  { key: 'tpl-accent-bar', light: '3px' },

  // "Yes / done / true", where that is a value rather than a callout. Same green the success
  // callout uses, so the site has one positive colour rather than two that nearly match. Both
  // values are measured against their ground in palette.mjs's pair list.
  { key: 'tpl-positive', light: '#136B34', dark: '#6DD68F' },

  // The indent one level of the explorer tree or the table of contents adds. Both read it, so
  // the two structures line up with each other instead of drifting apart.
  { key: 'tpl-indent', light: '0.85rem' },

  // The size of the small icons that mark a row rather than sit in a button: the folder and file
  // glyphs in the explorer tree. Smaller than --tpl-icon, which is for a control.
  { key: 'tpl-icon-sm', light: '0.95rem' },

  // How far a scrolling panel fades out at each end. See --tpl-fade-mask in base.scss, which is
  // the mask itself - it cannot live here because a variable override may not carry a comma.
  //
  // It is also the panel's own top and bottom padding, and therefore the gap between the heading
  // of a panel and its first row: the padding is what keeps that row from being read through the
  // gradient. At 20px, plus a 16px sentinel the explorer plugin leaves at the *top* of its list,
  // the tree began 36px under the word "Explorer" - measured, and too far. The sentinel gives up
  // its height in nav-explorer.scss and this drops to 14, which is still a soft edge and a third
  // of the gap.
  { key: 'tpl-fade', light: '14px' },

  // The mobile navigation drawer. `min()` keeps it off the right edge on a 360px phone while
  // giving a four-level tree room to breathe on a tablet-sized screen.
  { key: 'tpl-drawer-width', light: 'min(86vw, 340px)' }
]
