import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { FolderDown, Trash2, Upload } from 'lucide-react'
import type { PluginSource, RelayCheck, RelaySettings, RelayState } from '@shared/ipc-contract'
import { relaySubdir } from '@shared/remotePath'
import { Badge, Button, Field, FieldGroup, IconButton, Select, SegmentedControl, TextInput, Toggle } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { announce } from '../../state/announcer'
import { confirmDialog } from '../../utils/confirm'
import { useProject } from '../ProjectLayout'
import { DraftInput } from './DraftInput'
import type { CaptchaNeeds } from './formsOptions'

/**
 * The quartz-forms relay (plan 1.2, phase 7): where it goes, what it is told, and the upload.
 * What is not secret is written at once to .quartz-gui/forms-relay.json; what is secret (recipient
 * addresses, the captcha secret) goes once into the app's encrypted store and never comes back -
 * the section says "Adresse gesetzt", not the address. The relay itself is written by quartz-forms
 * into a temporary folder and uploaded through a publish target (formsService.relayUpload).
 */
export function RelaySection({
  state,
  loading,
  error,
  source,
  transportUrl,
  probe,
  siteBase,
  neededRecipients,
  captcha,
  onTransportUrl,
  onChanged
}: {
  state: RelayState | null
  loading: boolean
  error: string | null
  source: PluginSource
  transportUrl: string
  /** The relay form the upload asks for a stamp, with its address (relayProbe). */
  probe: { form: string; url: string } | null
  /** The site's address with its base path (`configuration.baseUrl`), for the suggested relay URL. */
  siteBase: string | null
  /** The recipient names the relay forms use, read from the config: the plugin names them only
   *  once it writes a relay, which it does not while the forms have problems. */
  neededRecipients: string[]
  /** Which captcha secrets the relay needs (captchaNeeds), read from the config. */
  captcha: CaptchaNeeds
  onTransportUrl: (url: string) => void
  onChanged: () => void
}): JSX.Element {
  const { t, i18n } = useTranslation()
  const project = useProject()
  const [busy, setBusy] = useState<null | 'upload' | 'export'>(null)
  const [result, setResult] = useState<{ success: boolean; output: string; check?: RelayCheck; countersOpen?: string; configReadable?: boolean } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [subdirInvalid, setSubdirInvalid] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  if (error) return <p className="text-micro text-red-600 dark:text-red-400">{error}</p>
  if (!state) return <p className="text-micro text-text-muted">{loading ? t('formsEditor.relay.loading') : ''}</p>
  const s = state.settings
  const save = async (change: Partial<RelaySettings>): Promise<boolean> => {
    try {
      await window.quartzGui.forms.relaySaveSettings({ projectPath: project.path, settings: { ...s, ...change } })
      setMessage(null)
      onChanged()
      return true
    } catch (err) {
      setMessage(formatIpcError(err))
      return false
    }
  }
  const saveSecrets = async (change: Parameters<typeof window.quartzGui.forms.relaySaveSecrets>[0], said: string): Promise<void> => {
    try {
      await window.quartzGui.forms.relaySaveSecrets(change)
      setMessage(null)
      announce(said)
      onChanged()
    } catch (err) {
      setMessage(formatIpcError(err))
    }
  }

  const names = [...new Set([...neededRecipients, ...state.secrets.recipients])]
  const missing = neededRecipients.filter((n) => !state.secrets.recipients.includes(n))
  // Below the site's own address, base path included: the target whose folder the relay goes
  // into is, in the common case, the site itself.
  // From baseUrl as well, not from the plugin's answer: while the forms have problems (the missing
  // send.php address among them) quartz-forms writes nothing and names no origin.
  const siteOrigin = siteBase ? new URL(siteBase).origin : state.siteOrigin
  const suggestedUrl = siteBase ? `${siteBase}/${s.subdir.replace(/^\/+|\/+$/g, '')}/send.php` : null
  const date = state.lastUpload ? new Date(state.lastUpload.at).toLocaleString(i18n.resolvedLanguage) : ''
  const status = !state.lastUpload
    ? { tone: 'slate' as const, text: t('formsEditor.relay.statusNever') }
    : state.hashProblem !== undefined
      ? { tone: 'red' as const, text: t('formsEditor.relay.statusBroken') }
      : state.moved
          ? { tone: 'amber' as const, text: t('formsEditor.relay.statusMoved', { date }) }
          : state.configModeChanged || state.currentHash !== state.lastUpload.hash
            ? { tone: 'amber' as const, text: t('formsEditor.relay.statusChanged', { date }) }
            : { tone: 'green' as const, text: t('formsEditor.relay.statusCurrent', { date }) }
  const missingCaptcha = [
    ...(captcha.global && !state.secrets.captchaSecret ? [t('formsEditor.relay.allForms')] : []),
    ...captcha.forms.filter((f) => !state.secrets.captchaSecrets.includes(f.id)).map((f) => f.id)
  ]
  const canUpload =
    !!s.targetId && !!s.from.trim() && missing.length === 0 && missingCaptcha.length === 0 && !state.conflict && state.secrets.storageAvailable && state.hashProblem === undefined

  async function upload(): Promise<void> {
    setBusy('upload')
    setResult(null)
    try {
      const r = await window.quartzGui.forms.relayUpload({ projectId: project.id, projectPath: project.path, source, url: probe?.url, form: probe?.form })
      setResult(r)
      announce(r.success ? t('formsEditor.relay.uploadedAnnounce') : t('formsEditor.relay.uploadFailedAnnounce'))
      onChanged()
    } catch (err) {
      setResult({ success: false, output: formatIpcError(err) })
    } finally {
      setBusy(null)
    }
  }

  async function exportTo(): Promise<void> {
    const dir = await window.quartzGui.dialog.pickFolder()
    if (!dir) return
    if (!(await confirmDialog({ text: t('formsEditor.relay.exportConfirm', { dir }), confirmLabel: t('formsEditor.relay.exportSubmit'), danger: true }))) return
    setBusy('export')
    setResult(null)
    try {
      setResult(await window.quartzGui.forms.relayExport({ projectId: project.id, projectPath: project.path, source, dir }))
    } catch (err) {
      setResult({ success: false, output: formatIpcError(err) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={status.tone}>{status.text}</Badge>
        {loading && <span className="text-micro text-text-muted">{t('formsEditor.relay.loading')}</span>}
      </div>
      {state.hashProblem && (
        <div className="flex flex-col gap-1">
          <p className="text-micro text-red-600 dark:text-red-400">{t('formsEditor.relay.problemsFirst')}</p>
          <p className="whitespace-pre-wrap font-mono text-micro text-red-600 dark:text-red-400">{state.hashProblem}</p>
        </div>
      )}
      {!state.secrets.storageAvailable && <p className="text-micro text-amber-700 dark:text-amber-400">{t('formsEditor.relay.noStorage')}</p>}
      {message && (
        <p role="alert" className="text-micro text-red-600 dark:text-red-400">
          {message}
        </p>
      )}

      <Field label={t('formsEditor.relay.target')} hint={state.targets.length ? t('formsEditor.relay.targetHint') : t('formsEditor.relay.noTargets')}>
        <Select value={s.targetId ?? ''} onChange={(e) => void save({ targetId: e.target.value || undefined })}>
          <option value="">{t('formsEditor.relay.noTarget')}</option>
          {state.targets.map((target) => (
            <option key={target.id} value={target.id}>
              {`${target.name} (${target.type}: ${target.where})`}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('formsEditor.relay.subdir')} hint={t('formsEditor.relay.subdirHint')}>
        <DraftInput
          value={s.subdir}
          placeholder="forms"
          aria-invalid={subdirInvalid}
          onCommit={(v) => {
            const subdir = relaySubdir(v)
            setSubdirInvalid(subdir === null)
            if (subdir) void save({ subdir })
          }}
        />
      </Field>
      {subdirInvalid && (
        <p role="alert" className="text-micro text-red-600 dark:text-red-400">
          {t('formsEditor.relay.subdirInvalid')}
        </p>
      )}
      {state.conflict && (
        <div className="flex flex-col gap-1.5 rounded-md border border-amber-300 p-2.5 dark:border-amber-500/40">
          <p className="text-micro text-amber-700 dark:text-amber-400">{t('formsEditor.relay.conflict', { target: state.conflict.targetName, path: state.conflict.exclude })}</p>
          <div>
            <Button
              variant="ghost"
              onClick={() =>
                void window.quartzGui.forms
                  .relayExcludeFromSite({ projectPath: project.path, targetId: state.conflict!.targetId, path: state.conflict!.exclude })
                  .then(onChanged, (err) => setMessage(formatIpcError(err)))
              }
            >
              {t('formsEditor.relay.excludeSubmit', { path: state.conflict.exclude })}
            </Button>
          </div>
        </div>
      )}

      <FieldGroup label={t('formsEditor.relay.url')}>
        <span className="break-all font-mono text-micro text-text">{transportUrl || t('formsEditor.noUrl')}</span>
        {suggestedUrl && suggestedUrl !== transportUrl && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => onTransportUrl(suggestedUrl)}>
              {t('formsEditor.relay.useUrl')}
            </Button>
            <span className="break-all font-mono text-micro text-text-muted">{suggestedUrl}</span>
          </div>
        )}
        <span className="text-micro text-text-muted">{t('formsEditor.relay.urlHint')}</span>
      </FieldGroup>

      <Field label={t('formsEditor.relay.from')} hint={t('formsEditor.relay.fromHint')}>
        <DraftInput value={s.from} placeholder="formulare@example.org" onCommit={(v) => void save({ from: v.trim() })} />
      </Field>
      <Field label={t('formsEditor.relay.origins')} hint={t('formsEditor.relay.originsHint')}>
        <DraftInput
          value={s.allowedOrigins.join(', ')}
          placeholder={siteOrigin ?? 'https://example.org'}
          onCommit={(v) =>
            void save({
              allowedOrigins: v
                .split(/[,\s]+/)
                .map((o) => o.trim())
                .filter(Boolean)
            })
          }
        />
      </Field>
      {s.allowedOrigins.length === 0 && siteOrigin && (
        <div className="-mt-2">
          <Button variant="ghost" onClick={() => void save({ allowedOrigins: [siteOrigin] })}>
            {t('formsEditor.relay.useOrigin', { origin: siteOrigin })}
          </Button>
        </div>
      )}

      <FieldGroup label={t('formsEditor.relay.recipients')}>
        {names.length === 0 && <span className="text-micro text-text-muted">{t('formsEditor.relay.noRecipients')}</span>}
        <ul className="flex flex-col gap-2">
          {names.map((name) => {
            const set = state.secrets.recipients.includes(name)
            const used = neededRecipients.includes(name)
            return (
              <li key={name} className="flex flex-col gap-1 rounded-md border border-ink/10 p-2 dark:border-ink/10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-ui text-text">{name}</span>
                  <Badge tone={set ? 'green' : 'red'}>{set ? t('formsEditor.relay.addressSet') : t('formsEditor.relay.addressMissing')}</Badge>
                  {!used && <Badge>{t('formsEditor.relay.unusedName')}</Badge>}
                  <span className="flex-1" />
                  {set && (
                    <IconButton
                      icon={Trash2}
                      title={t('formsEditor.relay.removeAddress', { name })}
                      onClick={() => void saveSecrets({ projectId: project.id, recipients: { [name]: null } }, t('formsEditor.relay.addressRemovedAnnounce', { name }))}
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TextInput
                    type="email"
                    autoComplete="off"
                    aria-label={t('formsEditor.relay.addressFor', { name })}
                    placeholder={set ? t('formsEditor.relay.replaceAddress') : 'name@example.org'}
                    value={drafts[name] ?? ''}
                    onChange={(e) => setDrafts({ ...drafts, [name]: e.target.value })}
                    className="min-w-0 flex-1"
                    disabled={!state.secrets.storageAvailable}
                  />
                  <Button
                    disabled={!drafts[name]?.includes('@') || !state.secrets.storageAvailable}
                    onClick={() => {
                      const address = drafts[name]
                      // The relay reads an address at @example. as the placeholder it ships with,
                      // i.e. as missing (send.php), and would refuse the form after the upload.
                      if (/@example\./i.test(address)) {
                        setMessage(t('formsEditor.relay.exampleAddress'))
                        return
                      }
                      setDrafts({ ...drafts, [name]: '' })
                      void saveSecrets({ projectId: project.id, recipients: { [name]: address } }, t('formsEditor.relay.addressSetAnnounce', { name }))
                    }}
                  >
                    {t('formsEditor.relay.saveAddress')}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
        <span className="text-micro text-text-muted">{t('formsEditor.relay.recipientsHint')}</span>
      </FieldGroup>

      {(captcha.global || state.secrets.captchaSecret) && (
        <SecretRow
          label={t('formsEditor.relay.captchaSecret')}
          hint={captcha.global ? t('formsEditor.relay.captchaSecretHint', { provider: captcha.global.provider }) : t('formsEditor.relay.captchaUnused')}
          isSet={state.secrets.captchaSecret}
          needed={!!captcha.global}
          disabled={!state.secrets.storageAvailable}
          onSave={(value) => void saveSecrets({ projectId: project.id, captchaSecret: value }, t('formsEditor.relay.secretSetAnnounce'))}
          onRemove={() => void saveSecrets({ projectId: project.id, captchaSecret: null }, t('formsEditor.relay.secretRemovedAnnounce'))}
        />
      )}
      {[...new Set([...captcha.forms.map((f) => f.id), ...state.secrets.captchaSecrets])].map((id) => {
        const need = captcha.forms.find((f) => f.id === id)
        return (
          <SecretRow
            key={id}
            label={t('formsEditor.relay.captchaSecretFor', { form: id })}
            hint={need ? t('formsEditor.relay.captchaSecretForHint', { provider: need.provider }) : t('formsEditor.relay.captchaUnused')}
            isSet={state.secrets.captchaSecrets.includes(id)}
            needed={!!need}
            disabled={!state.secrets.storageAvailable}
            onSave={(value) => void saveSecrets({ projectId: project.id, captchaSecrets: { [id]: value } }, t('formsEditor.relay.secretSetAnnounce'))}
            onRemove={() => void saveSecrets({ projectId: project.id, captchaSecrets: { [id]: null } }, t('formsEditor.relay.secretRemovedAnnounce'))}
          />
        )
      })}

      <FieldGroup label={t('formsEditor.relay.mailer')}>
        <SegmentedControl
          label={t('formsEditor.relay.mailer')}
          value={s.mailer}
          onChange={(m) => void save({ mailer: m })}
          options={[
            { value: 'mail', label: t('formsEditor.relay.mailerMail') },
            { value: 'sendmail', label: 'sendmail' }
          ]}
        />
        <span className="text-micro text-text-muted">{t('formsEditor.relay.mailerHint')}</span>
      </FieldGroup>
      {s.mailer === 'sendmail' && (
        <Field label={t('formsEditor.relay.sendmailPath')} hint={t('formsEditor.relay.sendmailPathHint')}>
          <DraftInput value={s.sendmailPath} onCommit={(v) => v.trim() && void save({ sendmailPath: v.trim() })} />
        </Field>
      )}
      <div className="flex flex-col gap-3">
        <p className="text-micro font-semibold uppercase tracking-wide text-text-muted">{t('pluginOptions.rarelyUsed')}</p>
        <Field label={t('formsEditor.relay.subjectPrefix')} hint={t('formsEditor.relay.subjectPrefixHint')}>
          <DraftInput value={s.subjectPrefix} placeholder="[Website]" onCommit={(v) => void save({ subjectPrefix: v })} />
        </Field>
        <Field label={t('formsEditor.relay.counterDir')} hint={t('formsEditor.relay.counterDirHint')}>
          <DraftInput value={s.counterDir} placeholder="/home/name/quartz-forms-counters" onCommit={(v) => void save({ counterDir: v.trim() })} />
        </Field>
        <Toggle
          label={t('formsEditor.relay.configReadable')}
          hint={t('formsEditor.relay.configReadableHint')}
          checked={s.configReadable}
          onChange={(on) => void save({ configReadable: on })}
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-ink/[0.06] pt-3 dark:border-ink/10">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void upload()} disabled={!canUpload || busy !== null}>
            <Upload size={14} aria-hidden />
            {busy === 'upload' ? t('formsEditor.relay.uploading') : t('formsEditor.relay.upload')}
          </Button>
          <Button variant="ghost" onClick={() => void exportTo()} disabled={busy !== null}>
            <FolderDown size={14} aria-hidden />
            {t('formsEditor.relay.export')}
          </Button>
        </div>
        {!canUpload && <span className="text-micro text-text-muted">{t('formsEditor.relay.cannotUpload', { reasons: blockers(state, missing, missingCaptcha, t).join(' ') })}</span>}
        {result && (
          <pre aria-live="polite" className={`max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-ink/[0.04] p-2 font-mono text-xs dark:bg-ink/10 ${result.success ? 'text-text' : 'text-red-600 dark:text-red-400'}`}>
            {(result.success ? t('formsEditor.relay.done') + '\n' : '') + result.output}
          </pre>
        )}
        <div role="status" className="flex flex-col items-start gap-1.5">
          {result?.check && (
            <>
              <p
                className={`text-micro ${
                  result.check.kind !== 'ok'
                    ? 'text-red-600 dark:text-red-400'
                    : result.check.counters === false
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-green-700 dark:text-green-400'
                }`}
              >
                {checkText(result.check, result.configReadable === true, t)}
              </p>
              {result.check.kind === 'noPhp' && result.check.configOpen && (
                <p className="text-micro text-red-600 dark:text-red-400">{t('formsEditor.relay.configOpen', { url: result.check.configOpen })}</p>
              )}
              {result.check.kind === 'ok' && result.check.counters === false && (
                <p className="text-micro text-amber-700 dark:text-amber-400">{t('formsEditor.relay.countersNotWritable')}</p>
              )}
              {/* The sentence and the button are about the mode this upload set, not the switch:
                  the switch is saved at once, the server only learns it from the next upload
                  (review 2026-10-29, M4) - hence the button does both. */}
              {result.check.kind === 'phpError' && result.configReadable === false && (
                <Button
                  variant="ghost"
                  disabled={!canUpload || busy !== null}
                  onClick={() =>
                    void save({ configReadable: true }).then(async (saved) => {
                      if (saved) await upload()
                    })
                  }
                >
                  {t('formsEditor.relay.makeReadable')}
                </Button>
              )}
            </>
          )}
          {result?.countersOpen && <p className="text-micro text-amber-700 dark:text-amber-400">{t('formsEditor.relay.countersOpen')}</p>}
        </div>
      </div>
    </div>
  )
}

function checkText(check: RelayCheck, configReadable: boolean, t: TFunction): string {
  switch (check.kind) {
    case 'ok':
      return t('formsEditor.relay.checkOk', { url: check.url })
    case 'phpError':
      return configReadable ? t('formsEditor.relay.checkPhpErrorReadable') : t('formsEditor.relay.checkPhpError')
    case 'relayError':
      return t('formsEditor.relay.checkRelayError', { status: check.status, error: check.error, message: check.message })
    case 'noPhp':
      return t('formsEditor.relay.checkNoPhp', { url: check.url })
    case 'redirect':
      return t('formsEditor.relay.checkRedirect', { url: check.url, to: check.to })
    case 'otherRelay':
      return t('formsEditor.relay.checkOtherRelay', { url: check.url })
    case 'http':
      // A 403, a 5xx and a 404 have three different ways out; only the last is the address.
      if (check.status === 403) return t('formsEditor.relay.checkHttpDenied', { url: check.url })
      if (check.status >= 502 && check.status <= 504) return t('formsEditor.relay.checkHttpNoPhp', { url: check.url, status: check.status })
      if (check.status === 500) return t('formsEditor.relay.checkHttpServerError', { url: check.url })
      return t('formsEditor.relay.checkHttp', { url: check.url, status: check.status })
    case 'unreachable':
      return t('formsEditor.relay.checkUnreachable', { reason: check.reason })
    case 'noUrl':
      return t('formsEditor.relay.checkNoUrl')
  }
}

function blockers(state: RelayState, missing: string[], missingCaptcha: string[], t: TFunction): string[] {
  const out: string[] = []
  if (!state.secrets.storageAvailable) out.push(t('formsEditor.relay.blockStorage'))
  if (!state.settings.targetId) out.push(t('formsEditor.relay.blockTarget'))
  if (!state.settings.from.trim()) out.push(t('formsEditor.relay.blockFrom'))
  if (missing.length) out.push(t('formsEditor.relay.blockRecipients', { names: missing.join(', ') }))
  if (missingCaptcha.length) out.push(t('formsEditor.relay.blockCaptcha', { names: missingCaptcha.join(', ') }))
  if (state.conflict) out.push(t('formsEditor.relay.blockConflict'))
  if (state.hashProblem !== undefined) out.push(t('formsEditor.relay.blockProblems'))
  return out
}

/** A recipient name the relay maps to an address: no spaces, nothing PHP or YAML would read twice. */
const RECIPIENT_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/

/**
 * A form's recipient when it sends through the relay: a choice among the names that are already
 * there - the other relay forms' and the ones with a stored address - so no one has to guess what
 * the relay calls someone, with the address's state beside it. "Neuer Empfänger …" takes a name
 * and an address at once; the address goes into the encrypted store, as in the Relay section.
 */
export function RelayRecipientField({
  value,
  names,
  stored,
  storageAvailable,
  onPick,
  onSaveAddress
}: {
  value: string
  /** The names to offer: the other relay forms' recipients and the stored ones. */
  names: string[]
  /** The names with a stored address; null while the relay's state is not known. */
  stored: string[] | null
  storageAvailable: boolean
  onPick: (name: string | undefined) => void
  onSaveAddress: (name: string, address: string) => Promise<void>
}): JSX.Element {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const options = [...new Set([...names, ...(value ? [value] : [])])].sort((a, b) => a.localeCompare(b))
  const hasAddress = stored === null || !value ? null : stored.includes(value)

  async function saveAddress(name: string, text: string): Promise<boolean> {
    const trimmed = text.trim()
    if (!trimmed.includes('@')) return false
    // The relay reads an address at @example. as its template's placeholder, i.e. as missing.
    if (/@example\./i.test(trimmed)) {
      setError(t('formsEditor.relay.exampleAddress'))
      return false
    }
    setBusy(true)
    try {
      await onSaveAddress(name, trimmed)
      setError(null)
      return true
    } catch (err) {
      setError(formatIpcError(err))
      return false
    } finally {
      setBusy(false)
    }
  }

  const nameProblem = !newName ? 'empty' : !RECIPIENT_NAME.test(newName) ? 'pattern' : options.includes(newName) ? 'taken' : null

  return (
    <div className="flex flex-col gap-1.5 text-ui">
      <label className="flex flex-col gap-1">
        <span className="font-medium text-text-secondary">{t('formsEditor.recipient.relay')}</span>
        <Select
          value={adding ? '__new' : value}
          onChange={(e) => {
            setError(null)
            if (e.target.value === '__new') {
              setAdding(true)
              return
            }
            setAdding(false)
            onPick(e.target.value || undefined)
          }}
        >
          <option value="">{t('formsEditor.recipientPick.none')}</option>
          {options.map((name) => (
            <option key={name} value={name}>
              {stored === null ? name : `${name} (${stored.includes(name) ? t('formsEditor.relay.addressSet') : t('formsEditor.relay.addressMissing')})`}
            </option>
          ))}
          <option value="__new">{t('formsEditor.recipientPick.new')}</option>
        </Select>
      </label>
      {!adding && hasAddress !== null && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={hasAddress ? 'green' : 'red'}>{hasAddress ? t('formsEditor.relay.addressSet') : t('formsEditor.relay.addressMissing')}</Badge>
        </div>
      )}
      {!adding && hasAddress === false && storageAvailable && (
        <div className="flex flex-wrap items-center gap-2">
          <TextInput
            type="email"
            autoComplete="off"
            aria-label={t('formsEditor.relay.addressFor', { name: value })}
            placeholder="name@example.org"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="min-w-0 flex-1"
          />
          <Button
            disabled={!address.includes('@') || busy}
            onClick={() => void saveAddress(value, address).then((saved) => saved && setAddress(''))}
          >
            {t('formsEditor.relay.saveAddress')}
          </Button>
        </div>
      )}
      {adding && (
        <div className="flex flex-col gap-2 rounded-md border border-ink/10 p-2.5 dark:border-ink/10">
          <Field label={t('formsEditor.recipientPick.name')} hint={t('formsEditor.recipientPick.nameHint')}>
            <TextInput value={newName} onChange={(e) => setNewName(e.target.value.trim())} placeholder="kontakt" aria-invalid={!!newName && !!nameProblem} />
          </Field>
          {newName && nameProblem && <p className="-mt-1 text-micro text-red-600 dark:text-red-400">{t(`formsEditor.recipientPick.nameProblem.${nameProblem}`)}</p>}
          {storageAvailable && (
            <Field label={t('formsEditor.recipientPick.address')} hint={t('formsEditor.recipientPick.addressHint')}>
              <TextInput type="email" autoComplete="off" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="name@example.org" />
            </Field>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!!nameProblem || busy}
              onClick={() =>
                void (async () => {
                  if (storageAvailable && address.trim() && !(await saveAddress(newName, address))) return
                  onPick(newName)
                  setAdding(false)
                  setNewName('')
                  setAddress('')
                })()
              }
            >
              {t('formsEditor.recipientPick.add')}
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-micro text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <span className="text-micro text-text-muted">{t('formsEditor.recipientHint.relay')}</span>
    </div>
  )
}

/** A secret the relay needs: whether it is set (never its value), a field to set or replace it, a bin to remove it. */
function SecretRow({
  label,
  hint,
  isSet,
  needed,
  disabled,
  onSave,
  onRemove
}: {
  label: string
  hint: string
  isSet: boolean
  needed: boolean
  disabled: boolean
  onSave: (value: string) => void
  onRemove: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  return (
    <FieldGroup label={label}>
      <div className="flex flex-wrap items-center gap-2">
        {needed ? (
          <Badge tone={isSet ? 'green' : 'red'}>{isSet ? t('formsEditor.relay.secretSet') : t('formsEditor.relay.secretMissing')}</Badge>
        ) : (
          isSet && <Badge>{t('formsEditor.relay.secretSet')}</Badge>
        )}
        <TextInput
          type="password"
          autoComplete="off"
          aria-label={label}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-w-0 flex-1"
          disabled={disabled}
        />
        <Button
          disabled={!draft.trim() || disabled}
          onClick={() => {
            const value = draft
            setDraft('')
            onSave(value)
          }}
        >
          {t('formsEditor.relay.saveSecret')}
        </Button>
        {isSet && <IconButton icon={Trash2} title={t('formsEditor.relay.removeSecretNamed', { name: label })} onClick={onRemove} />}
      </div>
      <span className="text-micro text-text-muted">{hint}</span>
    </FieldGroup>
  )
}
