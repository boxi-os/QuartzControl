import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { Connection } from '@shared/ipc-contract'
import { useAppStore } from '../state/store'
import { Button, Card, Field, Select, TextInput } from '../components/ui'
import { applyLanguagePreference } from '../i18n'

export default function Settings(): JSX.Element {
  const { t } = useTranslation()
  const { settings, loadSettings, saveSettings } = useAppStore()
  // The token is no longer a Settings field - it is a connection like the FTP/SFTP credentials
  // (see connectionsService). This screen still edits it, because the dedicated "Zugänge" area is
  // a later step; what it writes goes to the connection store, not into settings.json.
  const [githubConnection, setGithubConnection] = useState<Connection | null>(null)
  const [githubToken, setGithubToken] = useState('')
  const [defaultProjectDirectory, setDefaultProjectDirectory] = useState('')
  const [language, setLanguage] = useState<'system' | 'de' | 'en'>('system')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
    window.quartzGui.connections.list().then((connections) => {
      setGithubConnection(connections.find((c) => c.kind === 'github') ?? null)
    })
  }, [loadSettings])

  useEffect(() => {
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
            placeholder={githubConnection?.hasSecret ? t('settings.githubTokenStored') : 'ghp_…'}
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
              setSaveError(null)
              try {
                await saveSettings({
                  defaultProjectDirectory: defaultProjectDirectory || undefined,
                  language
                })
                // Only written when something was actually typed: the stored token never travels
                // to the renderer, so an untouched field is empty and must not clear it.
                if (githubToken) {
                  const saved = await window.quartzGui.connections.save({
                    id: githubConnection?.id,
                    kind: 'github',
                    name: 'GitHub',
                    secret: githubToken
                  })
                  setGithubConnection(saved)
                  setGithubToken('')
                }
                setSaved(true)
                setTimeout(() => setSaved(false), 2000)
              } catch (err) {
                // e.g. the OS keychain is unavailable, so the token cannot be encrypted at rest
                setSaveError(err instanceof Error ? err.message : String(err))
              }
            }}
          >
            {t('common.save')}
          </Button>
          {saved && <span className="text-sm text-green-600 dark:text-green-400">{t('common.saved')}</span>}
          {saveError && <span className="text-sm text-red-600 dark:text-red-400">{saveError}</span>}
        </div>
      </Card>
    </div>
  )
}
