import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAppStore } from '../state/store'
import { Button, Card, Field, Select, TextInput } from '../components/ui'
import { applyLanguagePreference } from '../i18n'

export default function Settings(): JSX.Element {
  const { t } = useTranslation()
  const { settings, loadSettings, saveSettings } = useAppStore()
  const [githubToken, setGithubToken] = useState('')
  const [defaultProjectDirectory, setDefaultProjectDirectory] = useState('')
  const [language, setLanguage] = useState<'system' | 'de' | 'en'>('system')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    setGithubToken(settings.githubToken ?? '')
    setDefaultProjectDirectory(settings.defaultProjectDirectory ?? '')
    setLanguage(settings.language ?? 'system')
  }, [settings])

  async function pickDefaultDirectory(): Promise<void> {
    const folder = await window.quartzGui.dialog.pickFolder()
    if (folder) setDefaultProjectDirectory(folder)
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link to="/" className="text-sm text-slate-500 hover:text-slate-800">
        ← {t('common.back')}
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-semibold">{t('settings.title')}</h1>

      <Card className="flex flex-col gap-4">
        <Field label={t('settings.githubToken')}>
          <TextInput
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            placeholder="ghp_…"
          />
        </Field>

        <Field label={t('settings.defaultProjectDirectory')}>
          <div className="flex gap-2">
            <TextInput
              value={defaultProjectDirectory}
              onChange={(e) => setDefaultProjectDirectory(e.target.value)}
              className="flex-1"
            />
            <Button variant="ghost" onClick={pickDefaultDirectory}>
              {t('common.select')}
            </Button>
          </div>
        </Field>

        <Field label={t('settings.language')}>
          <Select
            value={language}
            onChange={(e) => {
              const next = e.target.value as 'system' | 'de' | 'en'
              setLanguage(next)
              applyLanguagePreference(next)
            }}
          >
            <option value="system">{t('settings.languageSystem')}</option>
            <option value="de">{t('settings.languageDe')}</option>
            <option value="en">{t('settings.languageEn')}</option>
          </Select>
        </Field>

        <div className="flex items-center gap-3">
          <Button
            onClick={async () => {
              await saveSettings({
                githubToken: githubToken || undefined,
                defaultProjectDirectory: defaultProjectDirectory || undefined,
                language
              })
              setSaved(true)
              setTimeout(() => setSaved(false), 2000)
            }}
          >
            {t('common.save')}
          </Button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400">{t('common.saved')}</span>}
        </div>
      </Card>
    </div>
  )
}
