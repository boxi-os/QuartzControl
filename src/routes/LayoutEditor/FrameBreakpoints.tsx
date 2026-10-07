import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FrameBreakpointWidths } from '@shared/ipc-contract'
import { Button, Field, FormActions, SettingsSection, TextInput } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import DevServerRestartHint from '../../components/DevServerRestartHint'

/**
 * The two thresholds an authored frame's media queries are generated from. On the Frames tab, below
 * the list of frames, because they are a property of every frame rather than of one
 * (FrameBreakpointWidths) - and not on the layout board any more, which since 1.1 is about which
 * component sits where and only reads them to label its views.
 *
 * It carries its own Save rather than joining the page header's: that button writes
 * quartz.config.yaml, this one writes .quartz-gui/layout-breakpoints.json *and* regenerates every
 * frame's CSS. Two different pieces of work behind one button would make a config save silently
 * rewrite frames.
 */
export default function FrameBreakpoints({
  projectPath,
  widths,
  onSaved,
  hasFrames
}: {
  projectPath: string
  widths: FrameBreakpointWidths
  onSaved: (widths: FrameBreakpointWidths) => void
  // A save rewrites every authored frame's CSS, so it needs a dev-server restart for the same
  // reason a frame edit does - but with no frames there is nothing it could have changed.
  hasFrames: boolean
}): JSX.Element {
  const { t } = useTranslation()
  // Held as text, not as numbers: a number input the user is clearing mid-edit is briefly "", and
  // coercing that to 0 on every keystroke fights the typing.
  const [draft, setDraft] = useState({ tablet: String(widths.tablet), mobile: String(widths.mobile) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Seeded from the loaded values once they arrive, and again whenever a save changes them.
  useEffect(() => {
    setDraft({ tablet: String(widths.tablet), mobile: String(widths.mobile) })
  }, [widths.tablet, widths.mobile])

  const tablet = Number(draft.tablet)
  const mobile = Number(draft.mobile)
  // Mirrors the IPC schema's bounds, so the form refuses what main would reject anyway rather than
  // letting the user find out through an error toast.
  const valid = Number.isInteger(tablet) && Number.isInteger(mobile) && mobile >= 240 && tablet <= 3840 && mobile < tablet
  const changed = tablet !== widths.tablet || mobile !== widths.mobile

  async function save(): Promise<void> {
    if (!valid) return
    setSaving(true)
    setError(null)
    try {
      const next = { tablet, mobile }
      await window.quartzGui.layoutFrames.saveBreakpoints(projectPath, next)
      onSaved(next)
      setSaved(true)
    } catch (err) {
      setError(formatIpcError(err))
    } finally {
      setSaving(false)
    }
  }

  function edit(key: 'tablet' | 'mobile', value: string): void {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  return (
    <SettingsSection title={t('layoutEditor.breakpoints.title')} hint={t('layoutEditor.breakpoints.hint')} collapsible>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t('layoutEditor.breakpoints.tablet')} className="w-40">
          <TextInput type="number" min={240} max={3840} value={draft.tablet} onChange={(e) => edit('tablet', e.target.value)} />
        </Field>
        <Field label={t('layoutEditor.breakpoints.mobile')} className="w-40">
          <TextInput type="number" min={240} max={3840} value={draft.mobile} onChange={(e) => edit('mobile', e.target.value)} />
        </Field>
      </div>
      <FormActions
        secondary={
          <>
            {saved && !changed && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">{t('layoutEditor.breakpoints.saved')}</span>
            )}
            <DevServerRestartHint show={saved && !changed && hasFrames} />
            {!valid && <span className="text-xs text-red-600 dark:text-red-400">{t('layoutEditor.breakpoints.invalid')}</span>}
            {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
          </>
        }
      >
        <Button onClick={save} disabled={saving || !valid || !changed}>
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </FormActions>
    </SettingsSection>
  )
}
