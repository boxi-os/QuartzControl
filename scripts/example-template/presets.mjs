// Saved theme presets - the `presets` part of the package.
//
// A preset is a saved set of options for the @quartz-themes/core plugin, stored per project in
// .quartz-gui/theme-presets.json. They are not part of the look this template ships: they are two
// starting points for someone who wants to *leave* it, which is why they exist in a template at
// all - the part would otherwise be empty and a whole slice of the format would go untested.
//
// `id` has to be stable: the import compares by id, so a fresh id on every run would pile up
// duplicates in a project that imports the template twice.

export const PRESETS = [
  {
    id: 'tpl-minimal-lesbar-hell',
    name: 'Example — hell',
    createdAt: '2026-09-04T00:00:00.000Z',
    baseThemeId: 'minimal',
    options: {
      theme: 'minimal',
      mode: 'light',
      themeFonts: false,
      fonts: {
        header: 'Instrument Sans',
        body: 'Inter',
        code: 'JetBrains Mono'
      }
    }
  },
  {
    id: 'tpl-minimal-lesbar-dunkel',
    name: 'Example — dunkel',
    createdAt: '2026-09-04T00:00:00.000Z',
    baseThemeId: 'minimal',
    options: {
      theme: 'minimal',
      mode: 'dark',
      themeFonts: false,
      fonts: {
        header: 'Instrument Sans',
        body: 'Inter',
        code: 'JetBrains Mono'
      }
    }
  }
]
