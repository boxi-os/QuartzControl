import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { expandHome, isAbsolutePath, titlebarStripClass } from '../utils/platform'
import { Link } from 'react-router-dom'
import { Database, Key, Monitor, Moon, FolderOpen, Plug, RefreshCw, Sun } from 'lucide-react'
import type { AppInfo, Connection, GithubAccount, SaveConnectionInput, Settings as AppSettings } from '@shared/ipc-contract'
import { useAppStore } from '../state/store'
import { Badge, Button, Card, Field, FieldGroup, SegmentedControl, Select, TextInput } from '../components/ui'
import {
  CONNECTION_KIND_LABEL,
  ConnectionFormFields,
  connectionDraftIncomplete,
  connectionSummary,
  draftFromConnection,
  emptyConnectionDraft,
  normalizeConnectionDraft
} from '../components/ConnectionForm'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { applyLanguagePreference } from '../i18n'
import { formatBytes } from '../utils/format'

// Five named sections instead of one card with three fields. Two of them are here because the
// thing they configure is *app*-level and had no app-level home: connections (connectionsService
// keeps them in userData - rotating an SFTP password used to mean opening some project's
// Veröffentlichen page first) and the GitHub token, which is one of those connections.

export default function Settings(): JSX.Element {
  const { t } = useTranslation()
  const { settings, loadSettings, saveSettings } = useAppStore()

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Every write sends the *whole* Settings object: settingsService overwrites rather than merges,
  // so a partial save from one section would silently clear the fields another section owns.
  const persist = useCallback(
    async (patch: Partial<AppSettings>) => {
      await saveSettings({ ...useAppStore.getState().settings, ...patch })
    },
    [saveSettings]
  )

  return (
    <div className="flex h-screen flex-col">
      <div className={titlebarStripClass} />
      <div className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto px-6 pb-12">
        <Link to="/" className="text-[13px] text-slate-500 hover:text-slate-900 dark:hover:text-white">
          ← {t('common.back')}
        </Link>
        <h1 className="mb-1 mt-2 text-2xl font-semibold">{t('settings.title')}</h1>
        <p className="mb-6 text-[13px] text-slate-500 dark:text-slate-400">{t('settings.subtitle')}</p>

        <div className="flex flex-col gap-4">
          <AppearanceSection settings={settings} persist={persist} />
          <ProjectsSection settings={settings} persist={persist} />
          <GithubSection />
          <ConnectionsSection />
          <MaintenanceSection />
        </div>
      </div>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  description,
  children
}: {
  icon: typeof Monitor
  title: string
  description: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <Card>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-blue-600/10 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {children}
    </Card>
  )
}

// ── Erscheinungsbild ────────────────────────────────────────────────────────────────────────

function AppearanceSection({
  settings,
  persist
}: {
  settings: AppSettings
  persist: (patch: Partial<AppSettings>) => Promise<void>
}): JSX.Element {
  const { t } = useTranslation()
  const theme = settings.theme ?? 'system'
  const language = settings.language ?? 'system'

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor

  return (
    <Section icon={ThemeIcon} title={t('settings.appearance.title')} description={t('settings.appearance.description')}>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* FieldGroup, not Field: a <label> forwards its click to the first labelable descendant,
            and these segments are buttons - clicking the word "Design" flipped the theme to Hell. */}
        <FieldGroup label={t('settings.appearance.theme')}>
          {/* No Save button on purpose: these commit on click, and the appearance change is its
              own confirmation. The text fields below still have one - you can be mid-word there. */}
          <SegmentedControl
            value={theme}
            onChange={(next) => void persist({ theme: next })}
            options={[
              { value: 'light', label: t('settings.appearance.themeLight') },
              { value: 'dark', label: t('settings.appearance.themeDark') },
              { value: 'system', label: t('settings.appearance.themeSystem') }
            ]}
          />
        </FieldGroup>

        <Field label={t('settings.language')}>
          <Select
            value={language}
            onChange={(e) => {
              const next = e.target.value as 'system' | 'de' | 'en'
              applyLanguagePreference(next)
              void persist({ language: next })
            }}
          >
            <option value="system">{t('settings.languageSystem')}</option>
            <option value="de">{t('settings.languageDe')}</option>
            <option value="en">{t('settings.languageEn')}</option>
          </Select>
        </Field>
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t('settings.appearance.appliedImmediately')}</p>
    </Section>
  )
}

// ── Projekte ────────────────────────────────────────────────────────────────────────────────

function ProjectsSection({
  settings,
  persist
}: {
  settings: AppSettings
  persist: (patch: Partial<AppSettings>) => Promise<void>
}): JSX.Element {
  const { t } = useTranslation()
  const [directory, setDirectory] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDirectory(settings.defaultProjectDirectory ?? '')
  }, [settings.defaultProjectDirectory])

  // "~/Documents" is this field's own placeholder, and it used to be a value the app refused: the
  // settings schema requires an absolute path (every other path in the app comes from a native
  // dialog), so saving it answered with a raw "arg[0.defaultProjectDirectory]: Pfad muss absolut
  // sein" - measured in the running app. The tilde is expanded here, before the value crosses IPC,
  // and anything still relative gets a sentence rather than a validation dump.
  const save = useAsyncAction(async () => {
    const expanded = expandHome(directory)
    if (expanded && !isAbsolutePath(expanded)) throw new Error(t('settings.projects.mustBeAbsolute'))
    setDirectory(expanded)
    await persist({ defaultProjectDirectory: expanded || undefined })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  })

  return (
    <Section icon={FolderOpen} title={t('settings.projects.title')} description={t('settings.projects.description')}>
      <Field label={t('settings.defaultProjectDirectory')}>
        <div className="flex gap-2">
          <TextInput value={directory} onChange={(e) => setDirectory(e.target.value)} className="flex-1" placeholder="~/Documents" />
          <Button
            variant="ghost"
            className="shrink-0"
            onClick={async () => {
              const folder = await window.quartzGui.dialog.pickFolder(directory || undefined)
              if (folder) setDirectory(folder)
            }}
          >
            {t('common.select')}
          </Button>
        </div>
      </Field>
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={() => save.run()} disabled={save.pending}>
          {save.pending ? t('common.saving') : t('common.save')}
        </Button>
        {saved && <span className="text-[13px] text-green-600 dark:text-green-400">{t('common.saved')}</span>}
        {save.error && <span className="text-[13px] text-red-600 dark:text-red-400">{save.error}</span>}
      </div>
    </Section>
  )
}

// ── GitHub ──────────────────────────────────────────────────────────────────────────────────

function GithubSection(): JSX.Element {
  const { t } = useTranslation()
  const [connection, setConnection] = useState<Connection | null>(null)
  const [token, setToken] = useState('')
  const [account, setAccount] = useState<GithubAccount | null>(null)
  // Three states, not two: not checked yet, checked and rejected, checked and fine. A token that
  // silently does nothing is worse than none, which is the whole reason this section exists.
  const [checked, setChecked] = useState(false)

  const reload = useCallback(async () => {
    const connections = await window.quartzGui.connections.list()
    const github = connections.find((c) => c.kind === 'github') ?? null
    setConnection(github)
    if (github?.hasSecret) {
      setAccount(await window.quartzGui.github.viewer())
      setChecked(true)
    } else {
      setAccount(null)
      setChecked(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useAsyncAction(async () => {
    await window.quartzGui.connections.save({ id: connection?.id, kind: 'github', name: 'GitHub', secret: token })
    setToken('')
    await reload()
  })

  const remove = useAsyncAction(async () => {
    if (!connection) return
    await window.quartzGui.connections.delete(connection.id)
    await reload()
  })

  return (
    <Section icon={Key} title={t('settings.github.title')} description={t('settings.github.description')}>
      {connection?.hasSecret && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
          {checked && account ? (
            <>
              <Badge tone="green">{t('settings.github.valid')}</Badge>
              <span className="text-slate-600 dark:text-slate-300">
                {account.name ? `${account.name} (@${account.login})` : `@${account.login}`}
              </span>
            </>
          ) : checked ? (
            <>
              <Badge tone="red">{t('settings.github.rejected')}</Badge>
              <span className="text-slate-600 dark:text-slate-300">{t('settings.github.rejectedHint')}</span>
            </>
          ) : (
            <Badge tone="slate">{t('settings.github.checking')}</Badge>
          )}
          <button
            type="button"
            className="ml-auto text-[13px] text-slate-500 underline hover:text-slate-900 dark:hover:text-white"
            onClick={() => remove.run()}
            disabled={remove.pending}
          >
            {t('settings.github.remove')}
          </button>
        </div>
      )}

      <Field label={t('settings.github.token')}>
        <div className="flex gap-2">
          <TextInput
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="flex-1"
            placeholder={connection?.hasSecret ? t('settings.githubTokenStored') : 'ghp_…'}
          />
          <Button className="shrink-0" onClick={() => save.run()} disabled={save.pending || !token.trim()}>
            {save.pending ? t('common.saving') : t('settings.github.saveAndCheck')}
          </Button>
        </div>
      </Field>
      {(save.error || remove.error) && (
        <p className="mt-2 text-[13px] text-red-600 dark:text-red-400">{save.error ?? remove.error}</p>
      )}
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t('settings.github.scopeHint')}</p>
    </Section>
  )
}

// ── Zugänge ─────────────────────────────────────────────────────────────────────────────────

function ConnectionsSection(): JSX.Element {
  const { t } = useTranslation()
  const [connections, setConnections] = useState<Connection[]>([])
  const [draft, setDraft] = useState<SaveConnectionInput | null>(null)
  const [usage, setUsage] = useState<Record<string, number>>({})

  const reload = useCallback(async () => {
    const list = await window.quartzGui.connections.list()
    setConnections(list)
    // How many projects would be left with a dangling target if this one went away. Read here
    // rather than at delete time so the number is visible before the button is even considered.
    const counts = await Promise.all(list.map(async (c) => [c.id, (await window.quartzGui.connections.usage(c.id)).length] as const))
    setUsage(Object.fromEntries(counts))
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useAsyncAction(async () => {
    if (!draft) return
    await window.quartzGui.connections.save(normalizeConnectionDraft(draft))
    setDraft(null)
    await reload()
  })

  // Confirmed either way: even an unused connection holds a password or key that only exists
  // here, and the deletion cannot be undone.
  const remove = useAsyncAction(async (id: string) => {
    const used = await window.quartzGui.connections.usage(id)
    const message =
      used.length > 0 ? t('settings.connections.confirmDeleteInUse', { count: used.length }) : t('settings.connections.confirmDelete')
    if (!confirm(message)) return
    await window.quartzGui.connections.delete(id)
    await reload()
  })

  // Deliberately a separate, confirmed action rather than an option in the mismatch dialog - see
  // the host verifier for why a "key changed, continue?" prompt is the wrong shape. The pin
  // belongs to the host, so forgetting it here affects every project that reaches that server.
  const forgetHostKey = useAsyncAction(async (connection: Connection) => {
    if (connection.kind !== 'ssh') return
    if (!confirm(t('publish.confirmForgetHostKey', { host: connection.host }))) return
    await window.quartzGui.connections.forgetHostKey(connection.id)
    await reload()
  })

  // GitHub has its own section above - it is the same store, but a token with an account check is
  // a different thing to look at than a server login.
  const listed = connections.filter((c) => c.kind !== 'github')

  return (
    <Section icon={Plug} title={t('settings.connections.title')} description={t('settings.connections.description')}>
      {listed.length === 0 && !draft && (
        <p className="mb-3 text-[13px] text-slate-500 dark:text-slate-400">{t('settings.connections.empty')}</p>
      )}

      <div className="flex flex-col gap-2">
        {listed.map((connection) => (
          <div
            key={connection.id}
            className="grid grid-cols-1 items-center gap-2 rounded-[8px] border border-black/[0.06] px-3 py-2.5 sm:grid-cols-[1fr_auto] dark:border-white/10"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-medium">{connection.name}</span>
                <Badge>{CONNECTION_KIND_LABEL[connection.kind]}</Badge>
                {!connection.hasSecret && connection.kind === 'ssh' && connection.authMethod !== 'agent' && (
                  <Badge tone="amber">{t('settings.connections.noSecret')}</Badge>
                )}
                {connection.kind === 'ftp' && !connection.secure && <Badge tone="amber">{t('settings.connections.plaintext')}</Badge>}
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {connectionSummary(connection)}
                {usage[connection.id] > 0 && ` · ${t('settings.connections.usedBy', { count: usage[connection.id] })}`}
              </p>
              {connection.kind === 'ssh' && (
                <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500" title={connection.hostKey?.fingerprint}>
                  {connection.hostKey
                    ? `${t('publish.hostKeyPinned')}: ${connection.hostKey.fingerprint}`
                    : t('publish.hostKeyUnknown')}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 whitespace-nowrap sm:ml-auto">
              {connection.kind === 'ssh' && connection.hostKey && (
                <Button variant="ghost" onClick={() => forgetHostKey.run(connection)} disabled={forgetHostKey.pending}>
                  {t('publish.forgetHostKey')}
                </Button>
              )}
              <Button variant="ghost" onClick={() => setDraft(draftFromConnection(connection))}>
                {t('common.edit')}
              </Button>
              <Button variant="ghost" onClick={() => remove.run(connection.id)} disabled={remove.pending}>
                {t('common.remove')}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {remove.error && <p className="mt-2 text-[13px] text-red-600 dark:text-red-400">{remove.error}</p>}

      {draft ? (
        <div className="mt-4 rounded-[8px] border border-black/[0.06] p-3 dark:border-white/10">
          <ConnectionFormFields draft={draft} onChange={setDraft} />
          <div className="mt-3 flex gap-2">
            <Button onClick={() => save.run()} disabled={save.pending || connectionDraftIncomplete(draft)}>
              {save.pending ? t('common.saving') : t('common.save')}
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              {t('common.cancel')}
            </Button>
          </div>
          {save.error && <p className="mt-2 whitespace-pre-wrap break-words text-xs text-red-600 dark:text-red-400">{save.error}</p>}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setDraft(emptyConnectionDraft('ssh'))}>
            {t('settings.connections.addSsh')}
          </Button>
          <Button variant="ghost" onClick={() => setDraft(emptyConnectionDraft('ftp'))}>
            {t('settings.connections.addFtp')}
          </Button>
          <Button variant="ghost" onClick={() => setDraft(emptyConnectionDraft('webhook'))}>
            {t('settings.connections.addWebhook')}
          </Button>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{t('settings.connections.targetHint')}</p>
    </Section>
  )
}

// ── Daten & Wartung ─────────────────────────────────────────────────────────────────────────

function MaintenanceSection(): JSX.Element {
  const { t, i18n } = useTranslation()
  const [info, setInfo] = useState<AppInfo | null>(null)

  const reload = useCallback(async () => {
    setInfo(await window.quartzGui.settings.appInfo())
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const clearCache = useAsyncAction(async () => {
    await window.quartzGui.settings.clearThemeDocsCache()
    await reload()
  })

  return (
    <Section icon={Database} title={t('settings.maintenance.title')} description={t('settings.maintenance.description')}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">{t('settings.maintenance.cache')}</p>
          <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
            {info
              ? t('settings.maintenance.cacheSize', {
                  count: info.themeDocsCache.entries,
                  size: formatBytes(info.themeDocsCache.bytes, i18n.language)
                })
              : '…'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('settings.maintenance.cacheHint')}</p>
          <Button
            className="mt-2"
            variant="ghost"
            onClick={() => clearCache.run()}
            disabled={clearCache.pending || info?.themeDocsCache.entries === 0}
          >
            {clearCache.pending ? t('settings.maintenance.clearing') : t('settings.maintenance.clearCache')}
          </Button>
          {clearCache.error && <p className="mt-2 text-[13px] text-red-600 dark:text-red-400">{clearCache.error}</p>}
        </div>

        <div>
          <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">{t('settings.maintenance.storage')}</p>
          <p className="mt-0.5 break-all text-xs text-slate-500 dark:text-slate-400">{info?.userDataPath ?? '…'}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('settings.maintenance.storageHint')}</p>
          <Button className="mt-2" variant="ghost" onClick={() => void window.quartzGui.dialog.revealUserData()}>
            {t('settings.maintenance.reveal')}
          </Button>
        </div>
      </div>

      {info && (
        <p className="mt-4 border-t border-black/[0.06] pt-3 text-xs text-slate-400 dark:border-white/10 dark:text-slate-500">
          QuartzControl {info.appVersion} · Electron {info.electronVersion} · Chromium {info.chromeVersion}
        </p>
      )}
    </Section>
  )
}
