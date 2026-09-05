import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { confirmDialog } from '../utils/confirm'
import { expandHome, isAbsolutePath, titlebarStripClass } from '../utils/platform'
import { useLocation, useNavigate } from 'react-router-dom'
import { Database, Key, Monitor, Moon, FolderOpen, Plug, RefreshCw, Sun, Terminal, TriangleAlert } from 'lucide-react'
import type {
  AppInfo,
  Connection,
  EnvironmentInfo,
  GithubAccount,
  SaveConnectionInput,
  Settings as AppSettings
} from '@shared/ipc-contract'
import { useAppStore } from '../state/store'
import { Badge, Button, Card, Field, FieldGroup, SegmentedControl, Select, TextInput } from '../components/ui'
import {
  CONNECTION_KIND_LABEL,
  ConnectionFormFields,
  connectionDraftIncomplete,
  connectionSummary,
  draftFromConnection,
  emptyConnectionDraft,
  connectionMissingCredential,
  normalizeConnectionDraft
} from '../components/ConnectionForm'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { applyLanguagePreference } from '../i18n'
import { formatBytes } from '../utils/format'
import bundledGit from '@shared/bundled-git.json'

// Five named sections instead of one card with three fields. Two of them are here because the
// thing they configure is *app*-level and had no app-level home: connections (connectionsService
// keeps them in userData - rotating an SFTP password used to mean opening some project's
// Veröffentlichen page first) and the GitHub token, which is one of those connections.

export default function Settings(): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const settings = useAppStore((s) => s.settings)
  const loadSettings = useAppStore((s) => s.loadSettings)
  const saveSettings = useAppStore((s) => s.saveSettings)

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
      {/* Two boxes, and the split is the point: the scroller is the full width of the window, the
          width cap sits inside it. When one element did both, its scrollbar sat at the right edge
          of the centred column - which on a wide window is the middle of the screen. Same shape
          as ProjectLayout, where <main> scrolls and the inner div caps. */}
      <div className="flex-1 overflow-y-auto px-6 pb-12">
        <div className="mx-auto w-full max-w-5xl">
          {/* This page is reached from three places - the start screen, Cmd+, from anywhere, and the
              "Zugänge verwalten" link on Veröffentlichen - so a hardcoded `to="/"` sent two of those
              somewhere the user had not been: coming from a project page, "Zurück" landed on the
              project list and the project had to be picked again. `key` is 'default' only when this
              is the session's first entry (a deep link, nothing to go back to), which is the one
              case that still needs a destination of its own. */}
          <button
            type="button"
            onClick={() => (location.key === 'default' ? navigate('/') : navigate(-1))}
            className="text-[13px] text-text-muted hover:text-text"
          >
            ← {t('common.back')}
          </button>
          <h1 className="mb-1 mt-2 text-2xl font-semibold">{t('settings.title')}</h1>
          <p className="mb-6 text-[13px] text-text-muted">{t('settings.subtitle')}</p>

          <div className="flex flex-col gap-4">
            <AppearanceSection settings={settings} persist={persist} />
            <ProjectsSection settings={settings} persist={persist} />
            <RuntimeSection settings={settings} persist={persist} />
            <GithubSection />
            <ConnectionsSection />
            <MaintenanceSection />
          </div>
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
          <h2 className="text-heading font-semibold">{title}</h2>
          <p className="mt-0.5 text-[13px] text-text-muted">{description}</p>
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
            label={t('settings.appearance.theme')}
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
      <p className="mt-3 text-xs text-text-muted">{t('settings.appearance.appliedImmediately')}</p>
    </Section>
  )
}

// ── Laufzeit ────────────────────────────────────────────────────────────────────────────────

// The one place that says which Node builds the sites, and the only way back to the machine's own.
// It exists for a single case - a package that has to be compiled with node-gyp wants real Node
// headers, which Electron's runtime cannot provide - so it is a two-option group with the versions
// spelled out rather than a page of explanation. What each choice actually *is* is the part a
// person cannot guess, hence the live numbers under it.
function RuntimeSection({
  settings,
  persist
}: {
  settings: AppSettings
  persist: (patch: Partial<AppSettings>) => Promise<void>
}): JSX.Element {
  const { t } = useTranslation()
  const [info, setInfo] = useState<EnvironmentInfo | null>(null)
  const mode = settings.nodeRuntime ?? 'embedded'

  // Re-read after a switch, not just on mount: the whole point of the control is that it changes
  // which node the app resolves, and the line below is what shows that it did.
  useEffect(() => {
    void window.quartzGui.settings.environment().then(setInfo)
  }, [mode])

  const node = info?.tools.find((tool) => tool.name === 'node')
  const npm = info?.tools.find((tool) => tool.name === 'npm')
  const git = info?.tools.find((tool) => tool.name === 'git')

  return (
    <Section icon={Terminal} title={t('settings.runtime.title')} description={t('settings.runtime.description')}>
      <FieldGroup label={t('settings.runtime.label')}>
        <SegmentedControl
          label={t('settings.runtime.label')}
          value={mode}
          onChange={(next) => void persist({ nodeRuntime: next })}
          options={[
            { value: 'embedded', label: t('settings.runtime.embedded') },
            { value: 'system', label: t('settings.runtime.system') }
          ]}
        />
      </FieldGroup>
      <p className="mt-2 text-[13px] text-text-muted">
        {mode === 'embedded'
          ? t('settings.runtime.inUseEmbedded', { node: node?.version ?? '—', npm: npm?.version ?? '—' })
          : t('settings.runtime.inUseSystem', { node: node?.version ?? t('settings.runtime.noSystemNode') })}
      </p>
      <p className="mt-1 text-xs text-text-muted">
        {mode === 'embedded'
          ? info && info.hostNodeVersion
            ? t('settings.runtime.hintSwitchable', { node: info.hostNodeVersion })
            : t('settings.runtime.hintNoHostNode')
          : t('settings.runtime.hintSystem')}
      </p>
      <p className="mt-1 text-xs text-text-muted">{t('settings.runtime.appliesToNewProcesses')}</p>

      {/* git steht hier mit, weil die Frage dieselbe ist - womit führt die App aus - die Antwort
          aber die umgekehrte: das vom Rechner gewinnt, weil es die Einrichtung des Nutzers trägt.
          Kein Schalter: es gibt keinen Fall, in dem jemand das mitgelieferte git *vorziehen* will. */}
      <div className="mt-4 border-t border-ink/[0.06] pt-3 dark:border-ink/10">
        <p className="text-[13px] text-text-muted">
          {git?.source === 'embedded'
            ? t('settings.runtime.gitBundled', { version: versionNumber(git.version) })
            : t('settings.runtime.gitHost', { version: versionNumber(git?.version ?? null) })}
        </p>
        {git?.source === 'embedded' && (
          <p className="mt-1 text-xs text-text-muted">
            {t('settings.runtime.gitLicense')}{' '}
            <button
              type="button"
              className="underline hover:text-text"
              onClick={() => void window.quartzGui.dialog.openExternal(GIT_SOURCE_URL)}
            >
              {t('settings.runtime.gitSource')}
            </button>
          </p>
        )}
      </div>
    </Section>
  )
}

// Die Fassung steht an einer Stelle, weil der Link auf den Quelltext *genau* der mitgelieferten
// Binärdatei zeigen muss - sonst ist das Quellcode-Angebot keines. Vorher stand die Zahl hier und
// noch einmal in scripts/fetch-git.mjs, jeweils mit einem Kommentar, der zum Nachziehen der anderen
// Stelle aufforderte; heute gleich, morgen vielleicht nicht.
const GIT_SOURCE_URL = `https://github.com/git/git/tree/v${bundledGit.version}`

// "git version 2.53.0 (Apple Git-155)" → "2.53.0". Dieselbe Frage wie auf der Startseite, dieselbe
// Antwort: die Zeile ist eine Auskunft, keine Diagnose.
function versionNumber(version: string | null): string {
  return /\d[\d.]*/.exec(version ?? '')?.[0] ?? '—'
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
        {/* Settings has no PageHeader to hand this to, so the live region sits here - mounted
            always, filled when there is something to say. */}
        <span role="status" className="text-[13px]">
          {saved && <span className="text-green-600 dark:text-green-400">{t('common.saved')}</span>}
          {save.error && <span className="text-red-600 dark:text-red-400">{save.error}</span>}
        </span>
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
  // Four states, not two. "Abgelehnt" is a 401 from GitHub, i.e. a real answer about the token;
  // an unreachable API is not, and rendering it as either a valid or a rejected token is the
  // "cannot check is not the same as fine" mistake the update check and the theme catalog each
  // had. Before this the failure was not even a state: github.viewer() rejects on a network
  // error, reload() did not catch it, so the badge stayed on "wird geprüft" for good while the
  // rejection surfaced as an app-wide error toast.
  const [status, setStatus] = useState<'none' | 'checking' | 'valid' | 'rejected' | 'unknown'>('none')

  const reload = useCallback(async () => {
    const connections = await window.quartzGui.connections.list()
    const github = connections.find((c) => c.kind === 'github') ?? null
    setConnection(github)
    if (!github?.hasSecret) {
      setAccount(null)
      setStatus('none')
      return
    }
    setStatus('checking')
    try {
      const viewer = await window.quartzGui.github.viewer()
      setAccount(viewer)
      setStatus(viewer ? 'valid' : 'rejected')
    } catch {
      setAccount(null)
      setStatus('unknown')
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
          {status === 'valid' && account ? (
            <>
              <Badge tone="green">{t('settings.github.valid')}</Badge>
              <span className="text-text-secondary">
                {account.name ? `${account.name} (@${account.login})` : `@${account.login}`}
              </span>
            </>
          ) : status === 'rejected' ? (
            <>
              <Badge tone="red">{t('settings.github.rejected')}</Badge>
              <span className="text-text-secondary">{t('settings.github.rejectedHint')}</span>
            </>
          ) : status === 'unknown' ? (
            <>
              <Badge>{t('settings.github.unknown')}</Badge>
              <span className="text-text-secondary">{t('settings.github.unknownHint')}</span>
            </>
          ) : (
            <Badge tone="slate">{t('settings.github.checking')}</Badge>
          )}
          {/* The only way to check the stored token again used to be pasting it in a second time. */}
          <Button
            variant="ghost"
            onClick={() => void reload()}
            disabled={status === 'checking'}
            className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <RefreshCw size={13} className={status === 'checking' ? 'animate-spin' : ''} aria-hidden />
            {t('settings.github.recheck')}
          </Button>
          <button
            type="button"
            className="text-[13px] text-text-muted underline hover:text-text"
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
      <p className="mt-3 text-xs text-text-muted">{t('settings.github.scopeHint')}</p>
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
    if (!(await confirmDialog({ text: message, confirmLabel: t('settings.connections.confirmDeleteAction'), danger: true }))) return
    await window.quartzGui.connections.delete(id)
    await reload()
  })

  // Deliberately a separate, confirmed action rather than an option in the mismatch dialog - see
  // the host verifier for why a "key changed, continue?" prompt is the wrong shape. The pin
  // belongs to the host, so forgetting it here affects every project that reaches that server.
  const forgetHostKey = useAsyncAction(async (connection: Connection) => {
    if (connection.kind !== 'ssh') return
    if (!(await confirmDialog({ text: t('publish.confirmForgetHostKey', { host: connection.host }), confirmLabel: t('publish.confirmForgetHostKeyAction'), danger: true }))) return
    await window.quartzGui.connections.forgetHostKey(connection.id)
    await reload()
  })

  // GitHub has its own section above - it is the same store, but a token with an account check is
  // a different thing to look at than a server login.
  const listed = connections.filter((c) => c.kind !== 'github')

  return (
    <Section icon={Plug} title={t('settings.connections.title')} description={t('settings.connections.description')}>
      {listed.length === 0 && !draft && (
        <p className="mb-3 text-[13px] text-text-muted">{t('settings.connections.empty')}</p>
      )}

      <div className="flex flex-col gap-2">
        {listed.map((connection) => (
          <div
            key={connection.id}
            className="grid grid-cols-1 items-center gap-2 rounded-[8px] border border-ink/[0.06] px-3 py-2.5 sm:grid-cols-[1fr_auto] dark:border-ink/10"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-medium">{connection.name}</span>
                <Badge>{CONNECTION_KIND_LABEL[connection.kind]}</Badge>
                {connectionMissingCredential(connection) && (
                  <Badge tone="amber">{t('settings.connections.noSecret')}</Badge>
                )}
                {connection.kind === 'ftp' && !connection.secure && <Badge tone="amber">{t('settings.connections.plaintext')}</Badge>}
              </div>
              <p className="mt-0.5 truncate text-xs text-text-muted">
                {connectionSummary(connection)}
                {usage[connection.id] > 0 && ` · ${t('settings.connections.usedBy', { count: usage[connection.id] })}`}
              </p>
              {connection.kind === 'ssh' && (
                <p className="mt-0.5 truncate text-xs text-text-muted" title={connection.hostKey?.fingerprint}>
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
        <div className="mt-4 rounded-[8px] border border-ink/[0.06] p-3 dark:border-ink/10">
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

      <p className="mt-3 text-xs text-text-muted">{t('settings.connections.targetHint')}</p>
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
      {/* Normally absent. A store that could not be read has been moved aside rather than
          overwritten (see jsonStore), so what it held is still on disk - but it is missing from
          the app, and this is the only place that can say so. */}
      {info && info.unreadableStores.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-950/40">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900 dark:text-amber-200">
            <TriangleAlert size={15} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            {t('settings.maintenance.unreadableTitle')}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-amber-900/80 dark:text-amber-200/80">
            {t('settings.maintenance.unreadableHint')}
          </p>
          <ul className="mt-2 space-y-1">
            {info.unreadableStores.map((store) => (
              <li key={store.path} className="break-all font-mono text-xs text-amber-900 dark:text-amber-200">
                {store.quarantinedAs ?? store.path}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-[13px] font-medium text-text-secondary">{t('settings.maintenance.cache')}</p>
          <p className="mt-0.5 text-[13px] text-text-muted">
            {info
              ? t('settings.maintenance.cacheSize', {
                  count: info.themeDocsCache.entries,
                  size: formatBytes(info.themeDocsCache.bytes, i18n.language)
                })
              : '…'}
          </p>
          <p className="mt-1 text-xs text-text-muted">{t('settings.maintenance.cacheHint')}</p>
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
          <p className="text-[13px] font-medium text-text-secondary">{t('settings.maintenance.storage')}</p>
          <p className="mt-0.5 break-all text-xs text-text-muted">{info?.userDataPath ?? '…'}</p>
          <p className="mt-1 text-xs text-text-muted">{t('settings.maintenance.storageHint')}</p>
          <Button className="mt-2" variant="ghost" onClick={() => void window.quartzGui.dialog.revealUserData()}>
            {t('settings.maintenance.reveal')}
          </Button>
        </div>
      </div>

      {info && (
        <p className="mt-4 border-t border-ink/[0.06] pt-3 text-xs text-text-muted dark:border-ink/10">
          QuartzControl {info.appVersion} · Electron {info.electronVersion} · Chromium {info.chromeVersion}
        </p>
      )}
    </Section>
  )
}
