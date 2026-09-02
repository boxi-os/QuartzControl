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
