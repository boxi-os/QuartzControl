import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileUp, KeyRound, Trash2 } from 'lucide-react'
import type { FormsCheckResult, FormsKeyReport, PluginSource } from '@shared/ipc-contract'
import { Button, Field, IconButton, SegmentedControl, TextInput } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import { confirmDialog } from '../../utils/confirm'
import { useProject } from '../ProjectLayout'
import { encryptionModeOf, formsOf, isObject, type FormDef } from './formsOptions'

type Options = Record<string, unknown>

/** The forms that encrypt to a key: every encrypting form without a list of its own, and those that name it. */
export function formsUsingKey(options: Options, name: string): string[] {
  return formsOf(options)
    .filter(([, def]) => encryptionModeOf(def) !== 'off')
    .filter(([, def]) => {
      const keys = isObject(def.encryption) ? def.encryption.keys : undefined
      return !Array.isArray(keys) || keys.includes(name)
    })
    .map(([id]) => id)
}

/** Takes a key out of `keys` and out of every form's own list; a list left empty goes (= all keys). */
function withoutKey(options: Options, name: string): Options {
  const keys = isObject(options.keys) ? { ...options.keys } : {}
  delete keys[name]
  const forms = Object.fromEntries(
    formsOf(options).map(([id, def]): [string, FormDef] => {
      const enc = isObject(def.encryption) ? def.encryption : null
      if (!enc || !Array.isArray(enc.keys) || !enc.keys.includes(name)) return [id, def]
      const rest = enc.keys.filter((k) => k !== name)
      const nextEnc: Record<string, unknown> = { ...enc }
      if (rest.length) nextEnc.keys = rest
      else delete nextEnc.keys
      return [id, { ...def, encryption: nextEnc }]
    })
  )
  return { ...options, keys, ...(isObject(options.forms) ? { forms } : {}) }
}

/**
 * The public keys encrypting forms send to (`keys`). Each row says what quartz-forms itself reads
 * in it - fingerprint, user id, expiry, or the problem that stops the build - from its own check
 * (forms.check), not from a copy of OpenPGP in QuartzControl. A key comes from a file, copied into
 * the project under quartz-forms/keys/, or pasted; a pasted text is stored as its public key block
 * alone, after the plugin has read it.
 */
export function KeysSection({
  options,
  source,
  check,
  checking,
  onOptions,
  onChanged
}: {
  options: Options
  source: PluginSource
  check: FormsCheckResult | null
  checking: boolean
  onOptions: (change: (o: Options) => Options, said?: string) => void
  onChanged: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const keys = isObject(options.keys) ? Object.entries(options.keys) : []
  const reports = new Map<string, FormsKeyReport>(check?.state === 'checked' ? check.keys.map((k) => [k.name, k]) : [])
  const [adding, setAdding] = useState(keys.length === 0)
  const [name, setName] = useState('')
  const [way, setWay] = useState<'file' | 'paste'>('file')
  const [pasted, setPasted] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const nameProblem = !name ? 'empty' : !/^[A-Za-z0-9_-]{1,64}$/.test(name) ? 'pattern' : keys.some(([k]) => k === name) ? 'taken' : null

  async function remove(key: string): Promise<void> {
    const users = formsUsingKey(options, key)
    const text = users.length ? t('formsEditor.keys.removeConfirmUsed', { name: key, forms: users.join(', '), count: users.length }) : t('formsEditor.keys.removeConfirm', { name: key })
    if (!(await confirmDialog({ text, confirmLabel: t('common.remove'), danger: true }))) return
    onOptions((o) => withoutKey(o, key), t('formsEditor.keys.removedAnnounce', { name: key }))
  }

  async function fromFile(): Promise<void> {
    setError(null)
    const path = await window.quartzGui.dialog.pickFile([{ name: 'PGP', extensions: ['asc', 'gpg', 'pgp', 'key', 'txt'] }])
    if (!path) return
    setBusy(true)
    try {
      let result = await window.quartzGui.forms.importKey({ projectPath: project.path, sourcePath: path, name, overwrite: false })
      if ('exists' in result) {
        if (!(await confirmDialog({ text: t('formsEditor.keys.overwriteConfirm', { file: result.exists }), confirmLabel: t('formsEditor.keys.overwrite'), danger: true }))) return
        result = await window.quartzGui.forms.importKey({ projectPath: project.path, sourcePath: path, name, overwrite: true })
      }
      if ('file' in result) {
        const file = result.file
        onOptions((o) => ({ ...o, keys: { ...(isObject(o.keys) ? o.keys : {}), [name]: { file } } }), t('formsEditor.keys.addedAnnounce', { name }))
        finish()
      }
    } catch (err) {
      setError(formatIpcError(err))
    } finally {
      setBusy(false)
    }
  }

  async function fromPaste(): Promise<void> {
    setError(null)
    setBusy(true)
    try {
      const r = await window.quartzGui.forms.inspectKey({ projectPath: project.path, source, armored: pasted })
      if ('unavailable' in r) {
        setError(t('formsEditor.keys.notChecked', { reason: r.unavailable }))
        return
      }
      if (r.key.problem || !r.armored) {
        setError(t('formsEditor.keys.refused', { problem: r.key.problem ?? '' }))
        return
      }
      const armored = r.armored
      onOptions((o) => ({ ...o, keys: { ...(isObject(o.keys) ? o.keys : {}), [name]: { armored } } }), t('formsEditor.keys.addedAnnounce', { name }))
      finish()
    } catch (err) {
      setError(formatIpcError(err))
    } finally {
      setBusy(false)
    }
  }

  function finish(): void {
    setAdding(false)
    setName('')
    setPasted('')
    onChanged()
  }

  return (
    <div className="flex flex-col gap-3">
      {check?.state === 'unavailable' && <p className="text-micro text-amber-700 dark:text-amber-400">{t('formsEditor.keys.notChecked', { reason: check.reason })}</p>}
      {keys.length === 0 && !adding && <p className="text-micro text-text-muted">{t('formsEditor.keys.none')}</p>}
      <ul className="flex flex-col gap-2">
        {keys.map(([key, src]) => {
          const report = reports.get(key)
          const users = formsUsingKey(options, key)
          const where = isObject(src) && typeof src.file === 'string' ? t('formsEditor.keys.fromFile', { file: src.file }) : t('formsEditor.keys.pasted')
          return (
            <li key={key} className="flex flex-col gap-1 rounded-md border border-ink/10 p-2.5 dark:border-ink/10">
              <div className="flex items-start gap-2">
                <KeyRound size={14} aria-hidden className="mt-0.5 shrink-0 text-text-secondary" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-ui font-medium text-text">{key}</span>
                  <span className="text-micro text-text-muted">{where}</span>
                  {report?.fingerprint && <span className="break-all font-mono text-micro text-text-secondary">{report.fingerprint}</span>}
                  {report?.userIds[0] && <span className="text-micro text-text-secondary">{report.userIds[0]}</span>}
                  {report?.expires && !report.problem && <span className="text-micro text-text-muted">{t('formsEditor.keys.expires', { date: report.expires })}</span>}
                  {report?.problem && <span className="text-micro text-red-600 dark:text-red-400">{report.problem}</span>}
                  {report?.notice && !report.problem && <span className="text-micro text-amber-700 dark:text-amber-400">{report.notice}</span>}
                  {!report && check?.state === 'checked' && !checking && <span className="text-micro text-text-muted">{t('formsEditor.keys.unread')}</span>}
                  <span className="text-micro text-text-muted">{users.length ? t('formsEditor.keys.usedBy', { forms: users.join(', ') }) : t('formsEditor.keys.unused')}</span>
                </div>
                <IconButton icon={Trash2} title={t('common.removeNamed', { name: key })} onClick={() => void remove(key)} />
              </div>
            </li>
          )
        })}
      </ul>
      {checking && <p className="text-micro text-text-muted">{t('formsEditor.keys.checking')}</p>}

      {adding ? (
        <div className="flex flex-col gap-3 rounded-md border border-ink/10 p-3 dark:border-ink/10">
          <Field label={t('formsEditor.keys.name')} hint={t('formsEditor.keys.nameHint')}>
            <TextInput value={name} onChange={(e) => setName(e.target.value.trim())} placeholder="owner" aria-invalid={!!name && !!nameProblem} />
          </Field>
          {name && nameProblem && <p className="-mt-2 text-micro text-red-600 dark:text-red-400">{t(`formsEditor.keys.nameProblem.${nameProblem}`)}</p>}
          <SegmentedControl
            label={t('formsEditor.keys.way')}
            value={way}
            onChange={setWay}
            options={[
              { value: 'file', label: t('formsEditor.keys.wayFile') },
              { value: 'paste', label: t('formsEditor.keys.wayPaste') }
            ]}
          />
          {way === 'file' ? (
            <div className="flex flex-col gap-1">
              <div>
                <Button onClick={() => void fromFile()} disabled={!!nameProblem || busy}>
                  <FileUp size={14} aria-hidden />
                  {t('formsEditor.keys.pickFile')}
                </Button>
              </div>
              <span className="text-micro text-text-muted">{t('formsEditor.keys.pickFileHint')}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="flex flex-col gap-1 text-ui">
                <span className="font-medium text-text-secondary">{t('formsEditor.keys.pasteLabel')}</span>
                <textarea
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  rows={6}
                  spellCheck={false}
                  placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----"
                  className="w-full rounded-[7px] border border-ink/10 bg-surface px-2.5 py-1.5 font-mono text-xs text-text shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </label>
              <div>
                <Button onClick={() => void fromPaste()} disabled={!!nameProblem || !pasted.trim() || busy}>
                  {t('formsEditor.keys.pasteSubmit')}
                </Button>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="text-micro text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <div>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button variant="ghost" onClick={() => setAdding(true)}>
            {t('formsEditor.keys.add')}
          </Button>
        </div>
      )}
    </div>
  )
}
