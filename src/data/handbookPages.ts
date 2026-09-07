/**
 * Welche Seite des Benutzerhandbuchs welchen Bildschirm erklärt — je Sprache, weil das Handbuch
 * seine Kapitel übersetzt und dabei auch ihre Pfade: aus `4-gestaltung/04-variablen` wird
 * `en/4-design/04-variables`, nicht `en/4-gestaltung/04-variablen`.
 *
 * Eine Tabelle statt zweier Einträge je Aufrufstelle: Sonst stünde an elf Stellen ein deutscher und
 * ein englischer Pfad nebeneinander, und beim nächsten Umbau des Handbuchs zöge jemand nur einen
 * von beiden nach. `HandbookLink` löst über die Sprache der App auf.
 */
export const HANDBOOK_PAGES = {
  overview: { de: '3-einrichtung/01-die-uebersicht', en: 'en/3-setup/01-the-overview' },
  site: { de: '3-einrichtung/02-titel-adresse-und-verhalten', en: 'en/3-setup/02-title-address-and-behaviour' },
  content: { de: '3-einrichtung/04-der-content-ordner', en: 'en/3-setup/04-the-content-folder' },
  localization: { de: '3-einrichtung/05-uebersetzungen', en: 'en/3-setup/05-translations' },
  stylesBasics: { de: '4-gestaltung/02-basis-farben-und-schriften', en: 'en/4-design/02-base-colours-and-fonts' },
  stylesTheme: { de: '4-gestaltung/03-community-themes', en: 'en/4-design/03-community-themes' },
  stylesVariables: { de: '4-gestaltung/04-variablen', en: 'en/4-design/04-variables' },
  stylesCustomCss: { de: '4-gestaltung/05-eigenes-css', en: 'en/4-design/05-custom-css' },
  layoutFrames: { de: '4-gestaltung/06-layout-frames', en: 'en/4-design/06-layout-frames' },
  layoutGlobal: { de: '4-gestaltung/07-layout-global-und-seitentypen', en: 'en/4-design/07-layout-global-and-page-types' },
  plugins: { de: '4-gestaltung/08-plugins', en: 'en/4-design/08-plugins' },
  templates: { de: '4-gestaltung/09-vorlagenpakete', en: 'en/4-design/09-template-packages' },
  preview: { de: '5-ansehen-und-bauen/01-die-vorschau', en: 'en/5-preview-and-build/01-the-preview' },
  publish: { de: '6-veroeffentlichen/01-zugaenge-und-ziele', en: 'en/6-publishing/01-connections-and-targets' },
  gitSync: { de: '6-veroeffentlichen/03-git-sync', en: 'en/6-publishing/03-git-sync' },
  snapshots: { de: '7-wartung/01-snapshots', en: 'en/7-maintenance/01-snapshots' },
  updates: { de: '7-wartung/03-updates', en: 'en/7-maintenance/03-updates' },
  settings: { de: '2-projekte/05-die-einstellungen', en: 'en/2-projects/05-the-settings' }
} as const

export type HandbookPage = keyof typeof HANDBOOK_PAGES
