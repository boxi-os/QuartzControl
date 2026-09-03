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

// index.html carries lang="de" as a static attribute, which stopped being true the moment this
// app spoke two languages: it is what a screen reader picks its voice and its pronunciation rules
// from, and what the spellchecker in every text field goes by. Set from the language i18next
// actually resolved to, on start and on every change - not from the *preference*, which may be
// "system" and says nothing about which language that turned out to be.
function syncDocumentLanguage(): void {
  document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language
}
syncDocumentLanguage()
i18n.on('languageChanged', syncDocumentLanguage)

// 'system' (the default) follows the OS locale with an English fallback; 'de'/'en' pin the
// language regardless of the OS. Called on app start after settings load, and again whenever
// the user changes the Settings language select.
export function applyLanguagePreference(language: 'system' | 'de' | 'en' | undefined): void {
  i18n.changeLanguage(!language || language === 'system' ? systemLanguage() : language)
}

export default i18n
