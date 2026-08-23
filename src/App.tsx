import { Route, Routes, Navigate } from 'react-router-dom'
import Home from './routes/Home'
import Settings from './routes/Settings'
import ProjectLayout from './routes/ProjectLayout'
import ProjectDashboard from './routes/ProjectDashboard'
import ConfigEditor from './routes/ConfigEditor'
import LayoutEditor from './routes/LayoutEditor'
import StyleEditor from './routes/StyleEditor'
import Themes from './routes/Themes'
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
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/project/:id" element={<ProjectLayout />}>
        <Route index element={<ProjectDashboard />} />
        <Route path="config" element={<ConfigEditor />} />
        <Route path="layout" element={<LayoutEditor />} />
        <Route path="styles" element={<StyleEditor />} />
        <Route path="themes" element={<Themes />} />
        <Route path="localization" element={<Localization />} />
        <Route path="plugins" element={<PluginsInstalled />} />
        <Route path="plugins/marketplace" element={<PluginsMarketplace />} />
        <Route path="content" element={<Content />} />
        <Route path="server" element={<BuildServer />} />
        <Route path="sync" element={<GitSync />} />
        <Route path="backups" element={<Backups />} />
        <Route path="updates" element={<Updates />} />
        <Route path="publish" element={<Publish />} />
        <Route path="templates" element={<Templates />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
