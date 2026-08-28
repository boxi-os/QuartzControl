import { existsSync } from 'fs'
import { join } from 'path'
import type { ProjectOverview } from '@shared/ipc-contract'
import { readConfig } from './configService'
import { getServerStatus } from './buildService'
import { listProjects } from './projectStore'

// The start screen's list. Assembled here, in one pass in main, rather than as N calls from the
// renderer: it is what the launcher renders first, so it must be cheap and finish in one round
// trip. Everything below is a local file read plus the dev-server status buildService already
// holds in memory - no network, same rule the project Übersicht follows.
//
// Every per-project read swallows its own failure, because one unreadable project must not blank
// the whole list; a project that cannot be read still gets a row, marked for what is wrong with
// it. Those two markers are the reason this exists at all: `projects.add` accepts any folder and
// nothing ever notices when one is moved away afterwards, so before this both cases produced a
// perfectly normal-looking card that opened into a project page where every fetch failed.
export async function getProjectOverviews(): Promise<ProjectOverview[]> {
  const projects = await listProjects()
  return Promise.all(
    projects.map(async (project): Promise<ProjectOverview> => {
      const missing = !existsSync(project.path)
      const isQuartzProject = !missing && existsSync(join(project.path, 'quartz.config.yaml'))
      const status = getServerStatus(project.id)

      let siteTitle: string | undefined
      let baseUrl: string | undefined
      if (isQuartzProject) {
        try {
          const config = await readConfig(project.path)
          siteTitle = typeof config.configuration.pageTitle === 'string' ? config.configuration.pageTitle : undefined
          baseUrl = typeof config.configuration.baseUrl === 'string' ? config.configuration.baseUrl : undefined
        } catch {
          // A malformed quartz.config.yaml is a real state (a half-finished hand edit). The row
          // stays, just without the title - the Konfiguration page is where that gets reported.
        }
      }

      return {
        ...project,
        missing,
        isQuartzProject,
        siteTitle,
        baseUrl,
        serverRunning: status.state === 'running',
        serverPort: status.state === 'running' ? status.options?.port : undefined
      }
    })
  )
}
