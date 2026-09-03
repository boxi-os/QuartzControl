import { useEffect } from 'react'
import { Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import { ErrorToasts, RouteErrorBoundary } from './components/ErrorSurface'
import { Announcer } from './state/announcer'
import { runSaveCommand } from './state/saveCommand'
import { useLogStore } from './state/store'
import Home from './routes/Home'
import Settings from './routes/Settings'
import ProjectLayout from './routes/ProjectLayout'
import ProjectDashboard from './routes/ProjectDashboard'
import ConfigEditor from './routes/ConfigEditor'
import LayoutEditor from './routes/LayoutEditor'
import Styles from './routes/Styles'
import Plugins from './routes/Plugins'
import Updates from './routes/Updates'
import BuildServer from './routes/BuildServer'
import GitSync from './routes/GitSync'
import Backups from './routes/Backups'
import Publish from './routes/Publish'
import Templates from './routes/Templates'

export default function App(): JSX.Element {
  const appendServerLog = useLogStore((s) => s.appendServerLog)
  const appendBuildLog = useLogStore((s) => s.appendBuildLog)
  const navigate = useNavigate()

  // The native menu's Settings item (Cmd+, / Ctrl+,) lives in the main process and cannot reach
  // the HashRouter on its own. One listener for the app's lifetime, same reasoning as the log
  // subscriptions below.
  useEffect(() => window.quartzGui.menu.onNavigate((hashPath) => navigate(hashPath)), [navigate])

  // The other menu direction: Speichern (Cmd+S) asks the mounted page to act, and which page that
  // is changes with every route - so the listener is here and the answer is in saveCommand's
  // register. A command no page registered for is a no-op.
  useEffect(
    () =>
      window.quartzGui.menu.onCommand((command) => {
        if (command === 'save') void runSaveCommand()
      }),
    []
  )

  // Installed once, for the app's whole lifetime, independent of which page/project is currently
  // shown - a page-local subscription would miss lines emitted while the user is on another tab.
  useEffect(() => {
    const offServer = window.quartzGui.server.onLog(appendServerLog)
    const offBuild = window.quartzGui.build.onLog(appendBuildLog)
    return () => {
      offServer()
      offBuild()
    }
  }, [appendServerLog, appendBuildLog])

  return (
    <RouteErrorBoundary>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/settings' element={<Settings />} />
        <Route path='/project/:id' element={<ProjectLayout />}>
          <Route index element={<ProjectDashboard />} />
          <Route path='config' element={<ConfigEditor />} />
          <Route path='layout' element={<LayoutEditor />} />
          <Route path='styles' element={<Styles />} />
          {/* The former standalone Themes tab is now the "Theme" sub-tab of Styles - kept as a
              redirect so bookmarks and in-app links from before the merge still land right. */}
          <Route path='themes' element={<Navigate to='../styles?tab=theme' replace />} />
          <Route path='plugins' element={<Plugins />} />
          {/* The former standalone Content-Ordner, Übersetzungen and Marktplatz tabs are now
              sub-tabs of Konfiguration resp. Plugins - kept as redirects so bookmarks and older
              in-app links still land on the right tab. */}
          <Route path='content' element={<Navigate to='../config?tab=content' replace />} />
          <Route path='localization' element={<Navigate to='../config?tab=localization' replace />} />
          <Route path='plugins/marketplace' element={<Navigate to='../plugins?tab=marketplace' replace />} />
          <Route path='updates' element={<Updates />} />
          <Route path='server' element={<BuildServer />} />
          <Route path='sync' element={<GitSync />} />
          <Route path='backups' element={<Backups />} />
          <Route path='publish' element={<Publish />} />
          <Route path='templates' element={<Templates />} />
        </Route>
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
      <ErrorToasts />
      {/* One live region for messages that have no place of their own - a row's confirmation, the
          running commentary of a drag. Mounted here so it is in the document before anything is
          said; see state/announcer.tsx. */}
      <Announcer />
    </RouteErrorBoundary>
  )
}
