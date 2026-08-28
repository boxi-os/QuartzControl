import { app } from 'electron'
import { getSettings } from './services/settingsService'

export interface MainStrings {
  menuFile: string
  menuEdit: string
  menuView: string
  menuWindow: string
  menuHelp: string
  menuSettings: string
  menuQuartzDocs: string
  menuPluginCatalog: string
  menuDataFolder: string
  menuAbout: string
  aboutDetail: string
  orphanTitle: string
  orphanMessage: string
  orphanQuit: string
  orphanKeepRunning: string
}

// Small, hand-rolled dictionary instead of i18next: the main process has no DOM/navigator, and
// the only translatable surface here is the native menu + the orphaned-server dialog, so a full
// i18n library would be overkill. Keep keys in sync with the renderer's de/en resources by hand
// where the same concept appears in both (e.g. menu labels are main-only, so no overlap today).
const STRINGS: Record<'de' | 'en', MainStrings> = {
  de: {
    menuFile: 'Datei',
    menuEdit: 'Bearbeiten',
    menuView: 'Ansicht',
    menuWindow: 'Fenster',
    menuHelp: 'Hilfe',
    menuSettings: 'Einstellungen…',
    menuQuartzDocs: 'Quartz-Dokumentation',
    menuPluginCatalog: 'Plugin-Katalog',
    menuDataFolder: 'Datenordner von QuartzControl öffnen',
    menuAbout: 'Über QuartzControl',
    aboutDetail: 'Verwaltung für Quartz-Websites',
    orphanTitle: 'Laufende Server gefunden',
    orphanMessage: 'Von einer vorherigen Sitzung laufen noch Dev-Server im Hintergrund:',
    orphanQuit: 'Beenden',
    orphanKeepRunning: 'Weiterlaufen lassen'
  },
  en: {
    menuFile: 'File',
    menuEdit: 'Edit',
    menuView: 'View',
    menuWindow: 'Window',
    menuHelp: 'Help',
    menuSettings: 'Settings…',
    menuQuartzDocs: 'Quartz documentation',
    menuPluginCatalog: 'Plugin catalog',
    menuDataFolder: "Open QuartzControl's data folder",
    menuAbout: 'About QuartzControl',
    aboutDetail: 'Manage Quartz websites',
    orphanTitle: 'Running servers found',
    orphanMessage: 'Dev servers from a previous session are still running in the background:',
    orphanQuit: 'Quit',
    orphanKeepRunning: 'Keep running'
  }
}

// Mirrors the renderer's Settings.language semantics ('system' follows the OS locale with an
// English fallback; 'de'/'en' pin the language) - read directly from settingsService rather than
// IPC since this runs before any renderer window exists.
export async function resolveMainStrings(): Promise<MainStrings> {
  const settings = await getSettings()
  const language = settings.language
  if (language === 'de' || language === 'en') return STRINGS[language]
  return app.getLocale().startsWith('de') ? STRINGS.de : STRINGS.en
}
