// The file the app keeps its managed blocks in since 1.1 (load order, fonts, variables), relative to
// quartz/styles - the CSS tab shows it as a tab of its own, and its draft goes through the same
// fileDrafts as the additional stylesheets. See styleService.writeManagedBlocks in the main process.
export const MANAGED_STYLESHEET = '_quartzcontrol.scss'
