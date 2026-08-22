import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import de from './locales/de'
import en from './locales/en'

function systemLanguage(): 'de' | 'en' {
  return navigator.language.startsWith('de') ? 'de' : 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en }
  },
  lng: systemLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
})

// 'system' (the default) follows the OS locale with an English fallback; 'de'/'en' pin the
// language regardless of the OS. Called on app start after settings load, and again whenever
// the user changes the Settings language select.
export function applyLanguagePreference(language: 'system' | 'de' | 'en' | undefined): void {
  i18n.changeLanguage(!language || language === 'system' ? systemLanguage() : language)
}

export default i18n
