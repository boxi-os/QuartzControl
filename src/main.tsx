import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { applyLanguagePreference } from './i18n'
import { installGlobalErrorHandlers } from './components/ErrorSurface'
import { useAppStore } from './state/store'

// before anything else, so even the settings load below is covered
installGlobalErrorHandlers()

// Through the store, not past it: this used to be its own settings.get(), and the first page to
// mount then read the same file a second time for the copy it puts in the store. One read now, and
// whichever page mounts first finds the settings already there.
void useAppStore
  .getState()
  .loadSettings()
  .then(() => applyLanguagePreference(useAppStore.getState().settings.language))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
