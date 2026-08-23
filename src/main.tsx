import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { applyLanguagePreference } from './i18n'
import { installGlobalErrorHandlers } from './components/ErrorSurface'

// before anything else, so even the settings load below is covered
installGlobalErrorHandlers()

window.quartzGui.settings.get().then((settings) => applyLanguagePreference(settings.language))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
