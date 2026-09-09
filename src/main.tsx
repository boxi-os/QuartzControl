/*
 * QuartzControl - manage Quartz websites
 * Copyright (C) 2026 boxi-os
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the
 * GNU General Public License as published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version. It is distributed in the hope that it will be
 * useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for details: `LICENSE` in the
 * repository root, or <https://www.gnu.org/licenses/>.
 *
 * The notice sits on the two entry points rather than on all ~200 source files. A file-by-file
 * header is the GPL's recommendation, not its requirement - what it asks for is that a recipient
 * can find the terms, and `LICENSE`, the `license` field in `package.json`, the About dialog and
 * Hilfe -> Lizenzen all say the same thing. Two hundred copies of this block would be two hundred
 * places to forget when the year or the address changes.
 */
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
