import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { PluginEntry, ProjectIconInfo } from '@shared/ipc-contract'
import { useProject, useRefreshProjectIcon } from '../ProjectLayout'
import { Button, FieldGroup } from '../../components/ui'
import ProjectAvatar from '../../components/ProjectAvatar'
import { useIpcQuery } from '../../state/useIpcQuery'
import { useAsyncAction } from '../../hooks/useAsyncAction'
import { announce } from '../../state/announcer'

// The one plugin that turns this image into the site's favicon. Its name here is what
// deriveName() makes of its source ("@quartz-community/favicon" and "github:quartz-community/
// favicon" both end in the same segment), which is the same name the Plugins page lists it under.
const FAVICON_PLUGIN = 'favicon'

/**
 * The project's picture: what the app shows for it, and what the site's favicon is made from.
 *
 * Sits on this tab rather than on the Übersicht because it is site identity, next to the title and
 * the base URL - and unlike the fields beside it, it writes immediately: it is a file operation,
 * not a value in quartz.config.yaml, so there is nothing for the page's Save button to carry.
 */
export default function ProjectImage({ plugins }: { plugins: PluginEntry[] }): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const refreshSidebar = useRefreshProjectIcon()
  const { data: icon, reload } = useIpcQuery<ProjectIconInfo>(
    () => window.quartzGui.projectIcon.get({ projectPath: project.path }),
    [project.path]
  )

  const favicon = plugins.find((p) => p.name === FAVICON_PLUGIN)
  const faviconState = favicon === undefined ? 'missing' : favicon.enabled ? 'on' : 'off'

  function applied(next: ProjectIconInfo): void {
    reload()
    // The sidebar's avatar is the layout's, and it is on screen while this runs.
    refreshSidebar()
    announce(next.custom ? t('projectImage.announceSet') : t('projectImage.announceCleared'))
  }

  const choose = useAsyncAction(async () => {
    const file = await window.quartzGui.dialog.pickFile([{ name: t('projectImage.fileFilter'), extensions: ['png', 'jpg', 'jpeg'] }])
    if (!file) return
    applied(await window.quartzGui.projectIcon.set({ projectPath: project.path, sourcePath: file }))
  })

  const clear = useAsyncAction(async () => {
    applied(await window.quartzGui.projectIcon.clear({ projectPath: project.path }))
  })

  return (
    <FieldGroup label={t('projectImage.label')} className="md:col-span-2 2xl:col-span-3">
      <div className="flex flex-wrap items-start gap-3">
        <ProjectAvatar
          id={project.id}
          name={project.name}
          icon={icon?.custom ? icon.dataUrl : null}
          size={64}
          className="border border-ink/[0.06] dark:border-ink/10"
        />
        {/* Capped rather than left to run the full 1800px: these are three lines to read, and the
            block spans the whole grid because the picture beside them needs the room, not the text. */}
        <div className="flex min-w-0 max-w-[80ch] flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => choose.run()} disabled={choose.pending || clear.pending}>
              {icon?.custom ? t('projectImage.replace') : t('projectImage.choose')}
            </Button>
            {icon?.custom && (
              <Button variant="ghost" onClick={() => clear.run()} disabled={choose.pending || clear.pending}>
                {t('projectImage.remove')}
              </Button>
            )}
          </div>
          <p className="text-micro text-text-muted">
            {icon?.custom
              ? t('projectImage.customHint', { width: icon.width, height: icon.height })
              : t('projectImage.defaultHint')}
          </p>
          {/* Read-only on purpose: switching a plugin on is what the Plugins page is for, and
              this tab's Save button owns quartz.config.yaml - a second writer for one checkbox
              would leave the held config and the file disagreeing. */}
          <p className="text-micro text-text-muted">
            {faviconState === 'on' ? (
              t('projectImage.faviconOn')
            ) : (
              <>
                {t(faviconState === 'off' ? 'projectImage.faviconOff' : 'projectImage.faviconMissing')}{' '}
                <Link to="../plugins" className="underline">
                  {t('projectImage.faviconLink')}
                </Link>
              </>
            )}
          </p>
          {(choose.error || clear.error) && (
            <p className="text-micro text-red-600 dark:text-red-400">{choose.error ?? clear.error}</p>
          )}
        </div>
      </div>
    </FieldGroup>
  )
}
