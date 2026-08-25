import { useEffect } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { ErrorToasts, RouteErrorBoundary } from './components/ErrorSurface'
import { useLogStore } from './state/store'
import Home from './routes/Home'
import Settings from './routes/Settings'
import ProjectLayout from './routes/ProjectLayout'
import ProjectDashboard from './routes/ProjectDashboard'
import ConfigEditor from './routes/ConfigEditor'
import LayoutEditor from './routes/LayoutEditor'
import Styles from './routes/Styles'
import Localization from './routes/Localization'
import PluginsInstalled from './routes/Plugins/Installed'
import PluginsMarketplace from './routes/Plugins/Marketplace'
import BuildServer from './routes/BuildServer'
import Content from './routes/Content'
import GitSync from './routes/GitSync'
import Backups from './routes/Backups'
import Updates from './routes/Updates'
import Publish from './routes/Publish'
import Templates from './routes/Templates'

export default function App(): JSX.Element {
  const appendServerLog = useLogStore((s) => s.appendServerLog)
  const appendBuildLog = useLogStore((s) => s.appendBuildLog)

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
          <Route path='localization' element={<Localization />} />
          <Route path='plugins' element={<PluginsInstalled />} />
          <Route path='plugins/marketplace' element={<PluginsMarketplace />} />
          <Route path='content' element={<Content />} />
          <Route path='server' element={<BuildServer />} />
          <Route path='sync' element={<GitSync />} />
          <Route path='backups' element={<Backups />} />
          <Route path='updates' element={<Updates />} />
          <Route path='publish' element={<Publish />} />
          <Route path='templates' element={<Templates />} />
        </Route>
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
      <ErrorToasts />
    </RouteErrorBoundary>
  )
}
