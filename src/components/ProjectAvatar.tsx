// The square that stands for a project - in the sidebar and on the launcher's cards. One
// component for both, because the fallback is the interesting part: a project that carries no
// picture of its own gets its initial on a deterministic colour, and two places computing that
// separately would drift the moment one of them gained a colour.

// A curated, brand-ish palette (indigo/violet-leaning, like the app icon) rather than random hues -
// picked deterministically from the project id so a given project always gets the same color
// across sessions, without needing to persist one. Every entry carries the project's initial in
// white, so every entry is a shade that white is actually readable on: the 500-level palette this
// replaced ran from 4.2:1 (violet) down to 2.1:1 (amber), i.e. which letter you could read came
// down to what your project id happened to hash to. Measured, all eight are now >= 4.7:1.
const AVATAR_COLORS = ['#4f46e5', '#7c3aed', '#0369a1', '#0f766e', '#b45309', '#e11d48', '#9333ea', '#0e7490']

function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function ProjectAvatar({
  id,
  name,
  icon,
  size,
  className = ''
}: {
  id: string
  name: string
  /** The project's picture as a data: URL - see ProjectIconInfo. Null or absent means the letter. */
  icon?: string | null
  /** Edge length in px. The two call sites use 36 (sidebar) and 40 (launcher card). */
  size: number
  className?: string
}): JSX.Element {
  // Decorative in both places: the project's name is right next to it, and a screen reader that
  // reads the letter "O" before the word "Obsidian" has learned nothing.
  const shared = `shrink-0 rounded-[8px] ${className}`
  const style = { width: size, height: size }

  if (icon) {
    return (
      <img
        src={icon}
        alt=""
        aria-hidden
        style={style}
        // The picture is whatever the user picked, so it is fitted rather than stretched, on the
        // page's own surface so a transparent PNG does not sit on nothing.
        className={`${shared} border border-ink/[0.06] bg-surface object-cover dark:border-ink/10`}
      />
    )
  }

  return (
    <div
      className={`${shared} flex items-center justify-center font-semibold text-white`}
      style={{ ...style, backgroundColor: avatarColor(id), fontSize: Math.round(size * 0.36) }}
      aria-hidden
    >
      {(name.trim()[0] ?? '?').toUpperCase()}
    </div>
  )
}
