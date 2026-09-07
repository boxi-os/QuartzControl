// The screens of a project, as label and route. Shared by smoke.mjs and screenshots.mjs so the two
// cannot drift: a screen the handbook shows but the smoke test no longer visits is a screen nobody
// checks, and a new screen that only one of the two knows about is worse than none.
//
// Sub-tabs are separate entries although they share a path: only one is mounted at a time, so a
// tab that is not listed here is never rendered by either script.
export const PROJECT_ROUTES = [
  ['Übersicht', ''],
  ['Konfiguration', '/config'],
  ['Konfiguration · Content-Ordner', '/config?tab=content'],
  ['Konfiguration · Übersetzungen', '/config?tab=localization'],
  ['Layout', '/layout'],
  ['Layout · Seitentypen', '/layout?tab=pagetypes'],
  ['Layout · Eigene Frames', '/layout?tab=frames'],
  ['Stile · Basis', '/styles'],
  ['Stile · Community-Themes', '/styles?tab=theme'],
  ['Stile · Variablen', '/styles?tab=variables'],
  ['Stile · Eigenes CSS', '/styles?tab=customCss'],
  ['Vorlagen', '/templates'],
  ['Plugins', '/plugins'],
  ['Plugins · Marktplatz', '/plugins?tab=marketplace'],
  ['Vorschau & Build', '/server'],
  ['Git-Sync', '/sync'],
  ['Veröffentlichen', '/publish'],
  ['Updates', '/updates'],
  ['Backups', '/backups']
]

/** The two screens that exist without a project. */
export const APP_ROUTES = [
  ['Startseite', '/'],
  ['Einstellungen', '/settings']
]
