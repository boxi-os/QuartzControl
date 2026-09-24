import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { PluginEntry, ProjectIconInfo } from '@shared/ipc-contract'
import { useProject, useRefreshProjectIcon } from '../ProjectLayout'
import { ImageIcon } from 'lucide-react'
import { Button, Card, CardHeading, Toggle } from '../../components/ui'
import { confirmDialog } from '../../utils/confirm'
import { findOtherProjectImage, findProjectImageEntry, isLayoutBox, withProjectImage, withoutProjectImage } from '@shared/projectImageBox'
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
export default function ProjectImage({
  plugins,
  savedPlugins,
  onPluginsChange,
  onInstallLayoutBox
}: {
  plugins: PluginEntry[]
  /** The plugin list as quartz.config.yaml holds it now - what the site builds from until Save. */
  savedPlugins: PluginEntry[]
  /** A change to the page's config draft - saved with the page's Save button like every other field. */
  onPluginsChange: (update: (plugins: PluginEntry[]) => PluginEntry[]) => void
  /** Installs quartz-layout-box through the CLI and returns the plugin list read afterwards. */
  onInstallLayoutBox: () => Promise<PluginEntry[]>
}): JSX.Element {
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

  // The header image. On means: one layout-box instance in the draft, found again by its class.
  // Its HTML names icon-dark.png only while that file exists, so the two dark-picture actions keep
  // the instance in step - otherwise the dark scheme would show a broken image.
  const headerOn = findProjectImageEntry(plugins) >= 0
  const hasDark = !!icon?.darkDataUrl
  // Whether removing the dark picture breaks the site until Save is a question about the file, not
  // the draft: the header switch above changes `headerOn` without touching what the build reads.
  // Asked of the draft, the hint was missing where the saved header names icon-dark.png and the
  // draft had switched it off, and present where only the draft had switched it on (review
  // 2026-09-17, finding 2).
  const savedHeader = savedPlugins[findProjectImageEntry(savedPlugins)]
  const savedNamesDark = !!savedHeader?.enabled && String(savedHeader.options?.html ?? '').includes('icon-dark.png')
  // A template's mark that shows this image already (findOtherProjectImage). Its HTML is the
  // template's, not ours, so nothing here rewrites it: removing the dark picture leaves it naming a
  // file that is gone, for good rather than until Save.
  const markShows = findOtherProjectImage(plugins) >= 0
  const savedMark = savedPlugins[findOtherProjectImage(savedPlugins)]
  const markNamesDark = String(savedMark?.options?.html ?? '').includes('icon-dark.png')

  function darkApplied(next: ProjectIconInfo): void {
    reload()
    if (headerOn) onPluginsChange((current) => withProjectImage(current, !!next.darkDataUrl))
    announce(next.darkDataUrl ? t('projectImage.dark.announceSet') : t('projectImage.dark.announceCleared'))
  }

  const chooseDark = useAsyncAction(async () => {
    const file = await window.quartzGui.dialog.pickFile([{ name: t('projectImage.fileFilter'), extensions: ['png', 'jpg', 'jpeg'] }])
    if (!file) return
    darkApplied(await window.quartzGui.projectIcon.setDark({ projectPath: project.path, sourcePath: file }))
  })

  const clearDark = useAsyncAction(async () => {
    darkApplied(await window.quartzGui.projectIcon.clearDark({ projectPath: project.path }))
  })

  const toggleHeader = useAsyncAction(async (on: boolean) => {
    if (!on) {
      onPluginsChange(withoutProjectImage)
      return
    }
    if (plugins.some(isLayoutBox)) {
      onPluginsChange((current) => withProjectImage(current, hasDark))
      return
    }
    const confirmed = await confirmDialog({
      text: t('projectImage.header.installConfirm'),
      confirmLabel: t('projectImage.header.installAction'),
      danger: false
    })
    if (!confirmed) return
    const fresh = await onInstallLayoutBox()
    // Exactly one layout box exists now - the one the CLI just wrote - and it becomes the header image.
    const index = fresh.findIndex(isLayoutBox)
    onPluginsChange(() => withProjectImage(fresh, hasDark, index))
    announce(t('projectImage.header.installed'))
  })

  const busy = choose.pending || clear.pending || chooseDark.pending || clearDark.pending || toggleHeader.pending
  const actionError = choose.error ?? clear.error ?? chooseDark.error ?? clearDark.error ?? toggleHeader.error

  return (
    <Card className="text-ui">
      <CardHeading icon={ImageIcon} className="mb-3">{t('projectImage.label')}</CardHeading>
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
            <Button onClick={() => choose.run()} disabled={busy}>
              {icon?.custom ? t('projectImage.replace') : t('projectImage.choose')}
            </Button>
            {icon?.custom && (
              <Button variant="ghost" onClick={() => clear.run()} disabled={busy}>
                {t('projectImage.remove')}
              </Button>
            )}
          </div>
          <p className="text-micro text-text-muted">
            {icon?.custom
              ? t('projectImage.customHint', { width: icon.width, height: icon.height })
              : icon?.unrecorded
                ? t('projectImage.unrecordedHint')
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
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {icon?.darkDataUrl && (
              <img src={icon.darkDataUrl} alt="" className="h-10 w-10 rounded-md border border-ink/[0.06] bg-slate-900 object-contain dark:border-ink/10" />
            )}
            {/* Replacing a dark picture that is there needs no light one of the user's: that is the
                state a template leaves, and the hint below says "replace rather than remove" -
                while only "remove" worked (thirty-seventh review, finding 4). Choosing a first one
                still waits for a light picture, which the header image needs. */}
            <Button variant="ghost" onClick={() => chooseDark.run()} disabled={busy || (!icon?.custom && !hasDark)}>
              {hasDark ? t('projectImage.dark.replace') : t('projectImage.dark.choose')}
            </Button>
            {hasDark && (
              <Button variant="ghost" onClick={() => clearDark.run()} disabled={busy}>
                {t('projectImage.dark.remove')}
              </Button>
            )}
          </div>
          {/* Removing is a file operation and happens at once, the header's instance is a draft that
              waits for Save - so in between the saved config names a file that is gone. Said only
              in the state where that gap exists (review 2026-09-16, finding 9). */}
          <p className="text-micro text-text-muted">
            {markNamesDark && hasDark
              ? t('projectImage.dark.hintMark')
              : savedNamesDark && hasDark
                ? t('projectImage.dark.hintHeaderOn')
                : t('projectImage.dark.hint')}
          </p>
          {/* A light picture of the user's own next to the template's dark one: the header shows the
              user's in light mode and the template's mark in dark (thirty-seventh review, finding 1). */}
          {icon?.custom && hasDark && !icon.darkCustom && (
            <p className="text-micro text-text-muted">{t('projectImage.dark.notChosen')}</p>
          )}
          {markShows && !headerOn ? (
            <p className="mt-2 text-micro text-text-muted">{t('projectImage.header.shownByMark')}</p>
          ) : (
            <div className="mt-2">
              <Toggle
                label={t('projectImage.header.label')}
                hint={
                  !icon?.custom
                    ? t('projectImage.header.needsImage')
                    : toggleHeader.pending
                      ? t('projectImage.header.installing')
                      : t(plugins.some(isLayoutBox) ? 'projectImage.header.hint' : 'projectImage.header.hintInstall')
                }
                checked={headerOn}
                onChange={(on) => void toggleHeader.run(on)}
                disabled={busy || (!icon?.custom && !headerOn)}
              />
            </div>
          )}
          {actionError && <p className="text-micro text-red-600 dark:text-red-400">{actionError}</p>}
        </div>
      </div>
    </Card>
  )
}
