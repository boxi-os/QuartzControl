import { join } from 'path'
import type { ProjectPrefs } from '@shared/ipc-contract'
import { quartzGuiDir, quartzGuiPath } from './projectDirs'
import { readJsonFileOr, writeJsonFile } from './jsonStore'

// Settings that belong to one project and to this app rather than to Quartz - so they live in
// <project>/.quartz-gui/ next to the publish targets, travel with the project folder and are
// covered by the snapshots. The one entry so far is the build output directory, which two pages
// share (see ProjectPrefs in the contract).
const FILE = 'project-prefs.json'

const EMPTY: ProjectPrefs = { outputDir: '' }

export async function getPrefs(projectPath: string): Promise<ProjectPrefs> {
  // Reading must not create the directory - see quartzGuiPath.
  const raw = await readJsonFileOr<Partial<ProjectPrefs>>(quartzGuiPath(projectPath, FILE), EMPTY)
  return { outputDir: typeof raw.outputDir === 'string' ? raw.outputDir : '' }
}

export async function savePrefs(projectPath: string, prefs: ProjectPrefs): Promise<void> {
  await writeJsonFile(join(quartzGuiDir(projectPath), FILE), prefs)
}
