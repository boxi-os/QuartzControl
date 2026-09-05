import { useTranslation } from 'react-i18next'
import type { Connection, ConnectionKind, SaveConnectionInput } from '@shared/ipc-contract'
import { Button, Field, Select, TextInput, Toggle } from './ui'
import { expandHome } from '../utils/platform'

// Shared because a connection is app-level (connectionsService keeps them in userData, one per
// provider) but is reached from two places: the Settings page, where they are managed on their
// own, and the Publish page, where a new one is created in the middle of setting up a target.
// Two copies of this form would mean two places where a new auth method has to be added.

export function emptyConnectionDraft(kind: 'ssh' | 'ftp' | 'webhook' | 'github'): SaveConnectionInput {
  if (kind === 'ssh') return { kind: 'ssh', name: '', host: '', port: 22, username: '', authMethod: 'password', secret: '' }
  if (kind === 'ftp') return { kind: 'ftp', name: '', host: '', port: 21, username: '', secure: true, secret: '' }
  if (kind === 'github') return { kind: 'github', name: 'GitHub', secret: '' }
  return { kind: 'webhook', name: '', secret: '' }
}

/** The stored connection turned back into an editable draft. `secret` stays empty on purpose -
 *  it never travels to the renderer, so an untouched field must leave the stored one alone. */
export function draftFromConnection(connection: Connection): SaveConnectionInput {
  const base = { id: connection.id, name: connection.name }
  if (connection.kind === 'ssh') {
    return {
      ...base,
      kind: 'ssh',
      host: connection.host,
      port: connection.port,
      username: connection.username,
      authMethod: connection.authMethod,
      keyPath: connection.keyPath
    }
  }
  if (connection.kind === 'ftp') {
    return { ...base, kind: 'ftp', host: connection.host, port: connection.port, username: connection.username, secure: connection.secure }
  }
  if (connection.kind === 'github') return { ...base, kind: 'github', login: connection.login }
  return { ...base, kind: 'webhook' }
}

/**
 * Whether the draft still lacks something that has to be there. The Save button's guard in both
 * places that render this form - it used to check only the name, so an SFTP connection could be
 * saved with an empty host or with the port field cleared to 0, and what came back was the zod
 * message from the IPC boundary rather than anything about the field it was about.
 */
export function connectionDraftIncomplete(draft: SaveConnectionInput): boolean {
  if (!draft.name.trim()) return true
  if (draft.kind === 'ssh' || draft.kind === 'ftp') {
    if (!draft.host.trim() || !draft.username.trim()) return true
    if (!Number.isInteger(draft.port) || draft.port < 1 || draft.port > 65535) return true
  }
  // An edit may leave the URL field empty - that means "keep the stored one" (see
  // connectionsService.saveConnection). A new webhook has nothing to fall back on.
  if (draft.kind === 'webhook' && !draft.id && !(draft.secret ?? '').trim()) return true
  return false
}

/**
 * What actually gets saved. The key-file field's own placeholder is "~/.ssh/id_ed25519" and
 * `keyPath` is validated as an absolute path at the IPC boundary, so a tilde typed there was
 * refused with a validation message about an argument - the same trap the Settings page's default
 * project directory had.
 */
export function normalizeConnectionDraft(draft: SaveConnectionInput): SaveConnectionInput {
  if (draft.kind === 'ssh' && draft.keyPath) return { ...draft, keyPath: expandHome(draft.keyPath) }
  return draft
}

/**
 * Whether this connection really has no way to authenticate. Not the same as `hasSecret`: a
 * private key given as a *file path* stores no secret at all - the file is the source of truth, so
 * that it survives being moved or replaced without re-saving (see sftp.ts's sshAuthOptions). Both
 * lists read `!hasSecret` and therefore hung an amber "kein Passwort/Key" on exactly the setup
 * rsync requires, reported from the alpha test right after configuring one. Shared so the two
 * lists cannot answer this differently.
 */
export function connectionMissingCredential(connection: Connection): boolean {
  if (connection.kind !== 'ssh') return !connection.hasSecret
  if (connection.authMethod === 'agent') return false
  if (connection.authMethod === 'privateKey' && connection.keyPath) return false
  return !connection.hasSecret
}

export function connectionSummary(connection: Connection): string {
  if (connection.kind === 'ssh' || connection.kind === 'ftp') {
    return `${connection.username}@${connection.host}:${connection.port}`
  }
  if (connection.kind === 'github') return connection.login ? `@${connection.login}` : ''
  return connection.displayOrigin ?? ''
}

export const CONNECTION_KIND_LABEL: Record<ConnectionKind, string> = {
  ssh: 'SFTP / SSH',
  ftp: 'FTP',
  github: 'GitHub',
  webhook: 'Webhook'
}

export function ConnectionFormFields({
  draft,
  onChange
}: {
  draft: SaveConnectionInput
  onChange: (next: SaveConnectionInput) => void
}): JSX.Element {
  const { t } = useTranslation()

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Field label={t('publish.connectionForm.name')}>
          <TextInput value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} />
        </Field>
        {draft.kind !== 'webhook' && draft.kind !== 'github' && (
          <>
            <Field label={t('publish.connectionForm.host')}>
              <TextInput
                value={'host' in draft ? draft.host : ''}
                onChange={(e) => onChange({ ...draft, host: e.target.value } as SaveConnectionInput)}
              />
            </Field>
            <Field label={t('publish.connectionForm.port')}>
              <TextInput
                type="number"
                value={'port' in draft ? draft.port : 0}
                onChange={(e) => onChange({ ...draft, port: Number(e.target.value) || 0 } as SaveConnectionInput)}
              />
            </Field>
            <Field label={t('publish.connectionForm.username')}>
              <TextInput
                value={'username' in draft ? draft.username : ''}
                onChange={(e) => onChange({ ...draft, username: e.target.value } as SaveConnectionInput)}
              />
            </Field>
          </>
        )}
        {draft.kind === 'ssh' && (
          <Field label={t('publish.connectionForm.authMethod')}>
            <Select
              value={draft.authMethod}
              onChange={(e) =>
                onChange({ ...draft, authMethod: e.target.value as 'password' | 'privateKey' | 'agent', secret: '' })
              }
            >
              <option value="password">{t('publish.connectionForm.authPassword')}</option>
              <option value="privateKey">{t('publish.connectionForm.authPrivateKey')}</option>
              <option value="agent">{t('publish.connectionForm.authAgent')}</option>
            </Select>
          </Field>
        )}
        {draft.kind === 'ftp' && (
          <div className="flex items-end pb-1.5">
            <Toggle
              label={t('publish.connectionForm.secure')}
              checked={draft.secure}
              onChange={(checked) => onChange({ ...draft, secure: checked })}
            />
          </div>
        )}
        {draft.kind === 'ssh' && draft.authMethod === 'privateKey' && (
          <Field label={t('publish.connectionForm.keyPath')}>
            <div className="flex gap-2">
              <TextInput
                value={draft.keyPath ?? ''}
                onChange={(e) => onChange({ ...draft, keyPath: e.target.value || undefined })}
                className="flex-1"
                placeholder="~/.ssh/id_ed25519"
              />
              <Button
                variant="ghost"
                onClick={async () => {
                  const file = await window.quartzGui.dialog.pickFile()
                  if (file) onChange({ ...draft, keyPath: file })
                }}
              >
                {t('common.select')}
              </Button>
            </div>
          </Field>
        )}
        {draft.kind === 'ssh' && draft.authMethod === 'agent' ? (
          <p className="text-xs text-text-muted sm:col-span-2 xl:col-span-3">
            {t('publish.connectionForm.agentHint')}
          </p>
        ) : draft.kind === 'webhook' ? (
          <Field label={t('publish.connectionForm.webhookUrl')}>
            {/* Not a password field: the URL has to be readable while pasting it, since a
                mistyped build hook fails with a 404 that says nothing about which one. It is
                still stored encrypted - its path is the token, so it never travels back to the
                renderer and an edit opens on an empty field. Which is why the placeholder is the
                same "unverändert lassen" every other secret field shows on an edit: with the
                example URL there instead, a stored webhook read as one that had none. */}
            <TextInput
              value={draft.secret ?? ''}
              onChange={(e) => onChange({ ...draft, secret: e.target.value })}
              placeholder={draft.id ? t('publish.connectionForm.secretUnchangedPlaceholder') : 'https://api.netlify.com/build_hooks/…'}
            />
          </Field>
        ) : (
          <Field
            label={
              draft.kind === 'github'
                ? t('settings.github.token')
                : draft.kind === 'ssh' && draft.authMethod === 'privateKey'
                  ? t('publish.connectionForm.privateKey')
                  : t('publish.connectionForm.password')
            }
          >
            <TextInput
              type="password"
              value={draft.secret ?? ''}
              onChange={(e) => onChange({ ...draft, secret: e.target.value })}
              placeholder={draft.id ? t('publish.connectionForm.secretUnchangedPlaceholder') : draft.kind === 'github' ? 'ghp_…' : ''}
            />
          </Field>
        )}
      </div>
      {draft.kind === 'ftp' && !draft.secure && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {t('publish.ftpPlaintextWarning')}
        </p>
      )}
    </>
  )
}
