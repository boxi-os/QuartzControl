/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  darkMode: 'media',
  theme: {
    extend: {
      // The semantic colour tokens, defined as channels in src/index.css. The `<alpha-value>` form
      // is what lets `bg-ink/10` and `ring-accent/30` keep working; a hex variable could not.
      colors: {
        ground: 'rgb(var(--ground) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        text: {
          DEFAULT: 'rgb(var(--text) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)'
        },
        ink: 'rgb(var(--ink) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          fg: 'rgb(var(--accent-fg) / <alpha-value>)',
          text: 'rgb(var(--accent-text) / <alpha-value>)'
        }
      },
      // Three names for the three sizes this app actually has a *reason* for, so a new line of text
      // picks a role instead of a number. Measured before naming them: 82 uses of `text-[11px]`, 51
      // of `text-[13px]`, 7 of `text-[15px]`, against 13 uses of everything else put together
      // (10/12/14/17/19px). Font size only, no line-height - these replace bare `text-[Npx]`, which
      // sets nothing else either, so the swap changes no layout.
      //
      // The strays keep their arbitrary values until one of them earns a name; there is no sed here.
      fontSize: {
        // Labels, hints, badges, meta lines - the app's small print.
        micro: '11px',
        // Normal text in a control or a row: buttons, fields, list lines. The app's body size.
        ui: '13px',
        // A card's or a section's own heading, one step above the text under it.
        heading: '15px'
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"Segoe UI"',
          'system-ui',
          'sans-serif'
        ]
      }
    }
  },
  plugins: []
}
