import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Blocks,
  ChevronRight,
  ClipboardList,
  Code,
  Copy,
  FileText,
  KeyRound,
  LayoutTemplate,
  ListChecks,
  Lock,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Server,
  SlidersHorizontal,
  ThumbsUp,
  Trash2,
  Type,
  UserCheck,
  Vote,
  Wrench
} from 'lucide-react'
import type { FormsCheckResult, FormUsagePage, LayoutPosition, NormalizedOptionSchema, PluginEntry, QuartzConfig } from '@shared/ipc-contract'
import { slugPath } from '@shared/formUsages'
import { Badge, Button, Card, CardHeading, Combobox, DetailLayout, Field, FieldGroup, FoldBox, IconButton, InfoNote, SegmentedControl, Select, SelectableRow, TextInput, Toggle, focusRowAt, useCopyToClipboard } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import PluginOptionsForm from '../../components/PluginOptionsForm'
import { ObjectBlock, type FormContext } from '../../components/PluginOptionsForm/editors'
import { siteLanguages } from '../../components/PluginOptionsForm/siteLanguages'
import type { FormLanguage } from '../../components/PluginOptionsForm/text'
import SitePreview from '../../components/SitePreview'
import { announce } from '../../state/announcer'
import { primeStickyState, useStickyState } from '../../state/uiState'
import { markReturn } from '../../state/returnLink'
import { useIpcQuery } from '../../state/useIpcQuery'
import { confirmDialog } from '../../utils/confirm'
import { POSITIONS, buildPositionMap, componentRef, getLayout, placeComponent } from '../LayoutEditor/utils'
import { useProject } from '../ProjectLayout'
import { isNewerVersion } from '@shared/semver'
import { NoEffect } from './NoEffect'
import {
  FORMS_LAYOUT_SINCE,
  FORMS_PLUGIN,
  FORMS_READ_AGAINST,
  SECTIONS,
  TEMPLATES,
  TEMPLATE_NAMES,
  duplicateForm,
  effectiveForm,
  isPageBreak,
  stepCount,
  embedSnippets,
  encryptionModeOf,
  formIdProblem,
  formSchema,
  formsEntries,
  formsOf,
  freeId,
  isAnonymous,
  isObject,
  isTemplate,
  newForm,
  objectSchema,
  removeForm,
  renameForm,
  resolvedGlobal,
  textIn,
  transportKindOf,
  usesTemplateFields,
  partOf,
  placeMessage,
  captchaNeeds,
  withForm,
  type EncryptionMode,
  type FormPartId,
  type PlacedMessage,
  type FormDef,
  type FormTemplate,
  type IdProblem,
  type SectionId
} from './formsOptions'
import { DraftInput } from './DraftInput'
import { TextEditor } from './FormText'
import { FormFieldsEditor } from './FormFieldsEditor'
import { KeysSection } from './FormsKeys'
import { RelayRecipientField, RelaySection } from './FormsRelay'
import { ReadAgainstNote } from './ReadAgainstNote'
import { SavesImmediately } from './SavesImmediately'

type Options = Record<string, unknown>

const SECTION_ICONS: Record<SectionId, typeof Send> = {
  transport: Send,
  keys: KeyRound,
  spam: ShieldCheck,
  layout: LayoutTemplate,
  relay: Server,
  texts: Type,
  technical: Wrench
}

const START_ICONS: Record<FormTemplate | 'empty', typeof Send> = {
  contact: MessageSquare,
  feedback: ThumbsUp,
  rsvp: UserCheck,
  survey: Vote,
  empty: FileText
}

/**
 * The editor for quartz-forms (plan 1.2). Like quartz-multilanguage the plugin is one entry for the
 * whole site, so the list on the left holds its forms - the entries of `options.forms` - and below
 * them the global settings, each a row that opens in the panel. A form's panel shows the plugin's
 * own schema for a form (formSchema), in parts; its spam and transport settings are laid over the
 * global ones, shown as such (ObjectBlock's `inherit`, as layout-box's byLang).
 *
 * The writes follow the plugin list's rules, as in Multilanguage.tsx: each one against the newest
 * state, queued, and re-read once the queue is empty.
 */
export default function Forms({ onShowAllOptions }: { onShowAllOptions: (stickyKey: string) => void }): JSX.Element {
  const { t, i18n } = useTranslation()
  const lang: FormLanguage = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'de'
  const project = useProject()
  const navigate = useNavigate()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  // `form:<id>` or `section:<id>` - an id is stable, a row's position is not.
  const [selected, setSelected] = useStickyState<string | null>('forms.selected', null)
  const [adding, setAdding] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reload = useCallback(async (): Promise<void> => {
    try {
      setConfig(await window.quartzGui.config.get(project.path))
      setLoadError(null)
    } catch (err) {
      setLoadError(formatIpcError(err))
    }
  }, [project.path])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
      if (checkTimer.current) clearTimeout(checkTimer.current)
    },
    []
  )

  const entries = formsEntries(config)
  const entry = entries[0] ?? null
  const sourceKey = JSON.stringify(entry?.plugin.source ?? null)
  const schemaQuery = useIpcQuery(
    () => (entry ? window.quartzGui.plugins.optionSchema({ projectPath: project.path, source: entry.plugin.source }) : Promise.resolve(null)),
    [project.path, sourceKey]
  )
  const schema = schemaQuery.data?.schema ?? null
  // The installed version when it is older than the one that knows widths, conditions and steps.
  const installedVersion = schemaQuery.data?.packageVersion
  const olderPlugin = installedVersion && isNewerVersion(FORMS_LAYOUT_SINCE, installedVersion) ? installedVersion : null
  const entryOptions = entry?.plugin.options ?? {}
  const codeBlockLang = typeof entryOptions.codeBlockLang === 'string' && entryOptions.codeBlockLang ? entryOptions.codeBlockLang : 'quartz-form'
  const frontmatterKey = typeof entryOptions.frontmatterKey === 'string' && entryOptions.frontmatterKey ? entryOptions.frontmatterKey : 'form'
  // Read once per visit and on "Neu suchen": the pages are the user's notes, which change outside
  // QuartzControl, and a scan per write would read every note on every keystroke that is saved.
  const [scan, setScan] = useState(0)
  const usagesQuery = useIpcQuery(
    () => (entry ? window.quartzGui.content.formUsages({ projectPath: project.path, codeBlockLang, frontmatterKey }) : Promise.resolve(null)),
    [project.path, codeBlockLang, frontmatterKey, scan, !!entry]
  )
  const usages = usagesQuery.data ?? null
  const [previewGoTo, setPreviewGoTo] = useState<{ page: string } | null>(null)
  // The plugin's own verdict (forms.check), asked again a moment after each write settles - in a
  // child process, so not per keystroke.
  const [checkRound, setCheckRound] = useState(0)
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recheck = useCallback((): void => {
    if (checkTimer.current) clearTimeout(checkTimer.current)
    checkTimer.current = setTimeout(() => setCheckRound((n) => n + 1), 600)
  }, [])
  // The relay's state needs the plugin too (the hash of what it would write), so it is asked
  // with the check, and only while a form sends through the relay.
  const usesRelay = formsOf(entryOptions).some(([, def]) => transportKindOf(def, entryOptions) === 'relay')
  const [relayRound, setRelayRound] = useState(0)
  const relayQuery = useIpcQuery(
    () =>
      entry && usesRelay
        ? window.quartzGui.forms.relayState({ projectId: project.id, projectPath: project.path, source: entry.plugin.source })
        : Promise.resolve(null),
    [project.id, project.path, sourceKey, usesRelay, checkRound, relayRound]
  )
  const checkQuery = useIpcQuery(
    () => (entry ? window.quartzGui.forms.check({ projectPath: project.path, source: entry.plugin.source }) : Promise.resolve(null)),
    [project.path, sourceKey, checkRound]
  )

  const configRef = useRef(config)
  configRef.current = config
  const writes = useRef<Promise<unknown>>(Promise.resolve())
  /** False when the file could not be written (the page then says why and shows what is there). */
  async function write(next: QuartzConfig, said?: string): Promise<boolean> {
    configRef.current = next
    setConfig(next)
    const pending = writes.current.then(() => window.quartzGui.config.save(project.path, next))
    writes.current = pending.catch(() => {})
    try {
      await pending
    } catch (err) {
      await reload()
      setMessage(formatIpcError(err))
      return false
    }
    setMessage(null)
    setSavedFlash(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSavedFlash(false), 2000)
    if (said) announce(said)
    if (configRef.current === next) {
      await reload()
      recheck()
    }
    return true
  }

  // Against the newest state, like every write here: two changes in quick succession must not
  // undo each other.
  function updatePlugins(change: (plugins: PluginEntry[], index: number) => PluginEntry[], said?: string): Promise<boolean> {
    const base = configRef.current
    const current = formsEntries(base)[0]
    if (!base || !current) return Promise.resolve(false)
    return write({ ...base, plugins: change(base.plugins, current.index) }, said)
  }
  function updateEntry(change: (p: PluginEntry) => PluginEntry, said?: string): Promise<boolean> {
    return updatePlugins((plugins, index) => plugins.map((p, i) => (i === index ? change(p) : p)), said)
  }
  function updateOptions(change: (options: Options) => Options | undefined, said?: string): Promise<boolean> {
    return updateEntry((p) => {
      const next = { ...p }
      const options = change(p.options ?? {})
      if (options && Object.keys(options).length) next.options = options
      else delete next.options
      return next
    }, said)
  }

  if (loadError) return <p className="text-ui text-red-600 dark:text-red-400">{loadError}</p>
  if (!config) return <p className="text-ui text-text-muted">{t('common.loading')}</p>

  if (!entry) {
    return (
      <Card className="flex max-w-[95ch] flex-col items-start gap-2">
        <CardHeading icon={ClipboardList}>{t('formsEditor.notInstalledTitle')}</CardHeading>
        <p className="text-ui text-text-secondary">{t('formsEditor.notInstalledText')}</p>
      </Card>
    )
  }

  const options = entry.plugin.options ?? {}
  const forms = formsOf(options)
  const ids = forms.map(([id]) => id)
  const layoutForm = typeof options.layoutForm === 'string' ? options.layoutForm : ''
  const languages = siteLanguages(config)
  const titleOf = (id: string, def: FormDef): string => textIn(effectiveForm(def).title, lang) || id
  const pagesOf = (id: string): FormUsagePage[] => usages?.pages.filter((p) => p.forms.includes(id)) ?? []
  const pageNames = (pages: FormUsagePage[]): string => {
    const names = pages.slice(0, 5).map((p) => p.file)
    return pages.length > 5 ? t('formsEditor.andMore', { list: names.join(', '), count: pages.length - 5 }) : names.join(', ')
  }
  // Pages that name a form the options do not have: the build stops on them.
  const check = checkQuery.data ?? null
  const placed = check?.state === 'checked' ? { problems: check.problems.map(placeMessage), hints: check.hints.map(placeMessage) } : { problems: [], hints: [] }
  const messagesOf = (pred: (m: PlacedMessage) => boolean): { problems: PlacedMessage[]; hints: PlacedMessage[] } => ({
    problems: placed.problems.filter(pred),
    hints: placed.hints.filter(pred)
  })
  const unknownUses = (usages?.pages ?? []).flatMap((p) => p.forms.filter((f) => !ids.includes(f)).map((f) => ({ form: f, file: p.file })))

  const selectedForm = selected?.startsWith('form:') ? (forms.find(([id]) => id === selected.slice(5)) ?? null) : null
  const selectedSection = selected?.startsWith('section:') ? (SECTIONS.find((s) => s.id === selected.slice(8)) ?? null) : null

  function addForm(id: string, start: FormTemplate | 'empty'): void {
    setAdding(false)
    setSelected(`form:${id}`)
    updateOptions((o) => withForm(o, id, newForm(start, t('formsEditor.messageLabel'))), t('formsEditor.addedAnnounce', { id }))
  }

  async function remove(id: string, def: FormDef): Promise<void> {
    const name = titleOf(id, def)
    const used = pagesOf(id)
    // Three answers, by what the scan knows: pages that embed it, none, or no scan to ask.
    const text = used.length
      ? t('formsEditor.removeConfirmUsed', { name, id, count: used.length, pages: pageNames(used) })
      : usages
        ? t('formsEditor.removeConfirmUnused', { name })
        : t('formsEditor.removeConfirm', { name, id })
    if (!(await confirmDialog({ text, confirmLabel: t('common.remove'), danger: true }))) return
    if (selected === `form:${id}`) setSelected(null)
    flushSync(() => updateOptions((o) => removeForm(o, id), t('formsEditor.removedAnnounce', { name })))
    focusRowAt(listRef.current, ids.indexOf(id))
  }

  function duplicate(id: string): void {
    const base = configRef.current
    const current = formsEntries(base)[0]
    if (!current) return
    const { id: copyId } = duplicateForm(current.plugin.options ?? {}, id)
    setSelected(`form:${copyId}`)
    updateOptions((o) => duplicateForm(o, id).options, t('formsEditor.duplicatedAnnounce', { id: copyId }))
  }

  async function rename(from: string, to: string): Promise<void> {
    const used = pagesOf(from)
    // Asked only where a page names the old id, or where the scan could not say.
    const text = used.length
      ? t('formsEditor.renameConfirmUsed', { from, to, count: used.length, pages: pageNames(used) })
      : usages
        ? null
        : t('formsEditor.renameConfirm', { from, to })
    if (text && !(await confirmDialog({ text, confirmLabel: t('formsEditor.renameSubmit') }))) return
    setSelected(`form:${to}`)
    if (!(await updateOptions((o) => renameForm(o, from, to), t('formsEditor.renamedAnnounce', { from, to })))) return
    // A captcha secret of the form's own is stored under its id; it goes along once the new id is
    // in the file (Main does nothing when there is none).
    try {
      await window.quartzGui.forms.relaySaveSecrets({ projectId: project.id, moveCaptchaSecret: { from, to } })
      setRelayRound((n) => n + 1)
    } catch (err) {
      setMessage(formatIpcError(err))
    }
  }

  function openOnStage(): void {
    if (!config || !entry) return
    const target = `/project/${project.id}/layout`
    primeStickyState(target, 'layout.pageType', null)
    primeStickyState(target, 'layout.selected', componentRef(config.plugins, entry.index))
    primeStickyState(target, 'layout.tab', 'global')
    markReturn(project.id, 'plugins?tab=forms', 'layout?tab=global')
    navigate(target)
  }

  function setPosition(position: LayoutPosition): void {
    updatePlugins((plugins, index) => {
      if (getLayout(plugins[index])) return placeComponent(plugins, buildPositionMap(plugins), index, position)
      const others = buildPositionMap(plugins)[position].map((i) => getLayout(plugins[i])?.priority ?? 0)
      const priority = (others.length ? Math.max(...others) : 0) + 10
      return plugins.map((p, i) => (i === index ? { ...p, layout: { position, priority } } : p))
    }, t('formsEditor.positionAnnounce', { position: t(`positions.${position}`, position) }))
  }

  const kindLabel = (kind: string): string => t(`formsEditor.transportKinds.${kind}`, kind)
  const modeLabel = (mode: string): string => t(`formsEditor.encryptionModes.${mode}`, mode)
  const subtitle = (def: FormDef): ((id: string) => string) => {
    const eff = effectiveForm(def)
    const fieldsPart = usesTemplateFields(def)
      ? t('formsEditor.fromTemplate', { template: t(`formsEditor.templates.${String(def.template)}`) })
      : [stepCount(eff.fields) > 1 ? t('formsEditor.stepCount', { steps: stepCount(eff.fields) }) : null, t('formsEditor.fieldCount', { count: eff.fields.filter((f) => !isPageBreak(f)).length })].filter(Boolean).join(' · ')
    const where = (id: string): string | null => {
      if (!usages) return null
      const n = pagesOf(id).length
      return n ? t('formsEditor.onPages', { count: n }) : layoutForm === id ? null : t('formsEditor.onNoPage')
    }
    return (id: string) => [fieldsPart, kindLabel(transportKindOf(def, options)), modeLabel(encryptionModeOf(def)), where(id)].filter(Boolean).join(' · ')
  }

  const sectionSummary = (id: SectionId): string => {
    switch (id) {
      case 'transport': {
        const tr = resolvedGlobal(schema, options, 'transport')
        const url = typeof tr.url === 'string' && tr.url ? tr.url : t('formsEditor.noUrl')
        return `${kindLabel(String(tr.kind ?? 'relay'))} · ${url}`
      }
      case 'keys': {
        const names = isObject(options.keys) ? Object.keys(options.keys) : []
        return names.length ? names.join(', ') : t('formsEditor.noKeys')
      }
      case 'spam': {
        const s = resolvedGlobal(schema, options, 'spam')
        const parts = [
          s.honeypot !== false ? t('formsEditor.spamShort.honeypot') : null,
          typeof s.minSeconds === 'number' && s.minSeconds > 0 ? t('formsEditor.spamShort.minSeconds', { seconds: s.minSeconds }) : null,
          s.pow === true ? t('formsEditor.spamShort.pow') : null,
          s.captcha && s.captcha !== 'none' ? String(s.captcha) : null,
          typeof s.rateLimitPerHour === 'number' && s.rateLimitPerHour > 0 ? t('formsEditor.spamShort.rate', { perHour: s.rateLimitPerHour }) : null
        ].filter(Boolean)
        return parts.length ? parts.join(' · ') : t('formsEditor.allOff')
      }
      case 'layout': {
        const placement = getLayout(entry.plugin)
        if (!layoutForm) return t('formsEditor.noLayoutForm')
        return `${layoutForm} · ${placement ? t(`positions.${placement.position}`, placement.position) : t('formsEditor.notPlaced')}`
      }
      case 'relay': {
        const r = relayQuery.data
        if (!r) return relayQuery.loading ? t('formsEditor.relay.loading') : ''
        if (!r.lastUpload) return t('formsEditor.relay.statusNever')
        if (r.hashProblem !== undefined) return t('formsEditor.relay.statusBroken')
        const date = new Date(r.lastUpload.at).toLocaleDateString(i18n.resolvedLanguage)
        return r.moved || r.currentHash !== r.lastUpload.hash ? t('formsEditor.relay.statusChanged', { date }) : t('formsEditor.relay.statusCurrent', { date })
      }
      case 'texts': {
        const count = isObject(options.texts) ? Object.values(options.texts).reduce<number>((n, v) => n + (isObject(v) ? Object.keys(v).length : 0), 0) : 0
        return count ? t('formsEditor.ownTexts', { count }) : t('formsEditor.pluginTexts')
      }
      case 'technical':
        return `${typeof options.codeBlockLang === 'string' && options.codeBlockLang ? options.codeBlockLang : 'quartz-form'} · ${typeof options.frontmatterKey === 'string' && options.frontmatterKey ? options.frontmatterKey : 'form'}`
    }
  }

  return (
    <DetailLayout
      panelWidth="wide"
      panelLabel={t('formsEditor.panelLabel')}
      onDismiss={() => setSelected(null)}
      panel={
        selectedForm ? (
          <FormPanel
            key={selectedForm[0]}
            id={selectedForm[0]}
            def={selectedForm[1]}
            ids={ids}
            title={titleOf(selectedForm[0], selectedForm[1])}
            options={options}
            schema={schema}
            languages={languages}
            lang={lang}
            saved={savedFlash}
            isLayoutForm={layoutForm === selectedForm[0]}
            olderPlugin={olderPlugin}
            onDef={(next) => updateOptions((o) => withForm(o, selectedForm[0], next))}
            onRename={(to) => void rename(selectedForm[0], to)}
            onOpenSection={(sid) => setSelected(`section:${sid}`)}
            pages={usages ? pagesOf(selectedForm[0]) : null}
            slugs={usages?.slugs ?? []}
            scanning={usagesQuery.loading}
            onRescan={() => setScan((n) => n + 1)}
            onShowPage={(slug) => setPreviewGoTo({ page: slugPath(slug) })}
            messages={messagesOf((m) => m.form === selectedForm[0])}
            relayRecipients={{
              names: [
                ...forms
                  .filter(([id, def]) => id !== selectedForm[0] && transportKindOf(def, options) === 'relay')
                  .map(([, def]) => (typeof def.recipient === 'string' ? def.recipient.trim() : ''))
                  .filter(Boolean),
                ...(relayQuery.data?.secrets.recipients ?? [])
              ],
              stored: relayQuery.data ? relayQuery.data.secrets.recipients : null,
              storageAvailable: relayQuery.data?.secrets.storageAvailable ?? true,
              saveAddress: async (name, address) => {
                await window.quartzGui.forms.relaySaveSecrets({ projectId: project.id, recipients: { [name]: address } })
                announce(t('formsEditor.relay.addressSetAnnounce', { name }))
                setRelayRound((n) => n + 1)
              }
            }}
            onLayoutForm={(on) =>
              updateOptions(
                (o) => ({ ...o, layoutForm: on ? selectedForm[0] : '' }),
                t(on ? 'formsEditor.layoutOnAnnounce' : 'formsEditor.layoutOffAnnounce', { id: selectedForm[0] })
              )
            }
          />
        ) : selectedSection?.id === 'relay' ? (
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <CardHeading icon={Server}>{t('formsEditor.sections.relay')}</CardHeading>
              <p className="text-micro text-text-secondary">{t('formsEditor.sectionHints.relay')}</p>
            </div>
            <RelaySection
              state={relayQuery.data ?? null}
              loading={relayQuery.loading}
              error={relayQuery.error}
              source={entry.plugin.source}
              transportUrl={isObject(options.transport) && typeof options.transport.url === 'string' ? options.transport.url : ''}
              siteBase={siteBaseOf(config)}
              captcha={captchaNeeds(options, resolvedGlobal(schema, options, 'spam'))}
              neededRecipients={[
                ...new Set(
                  forms
                    .filter(([, def]) => transportKindOf(def, options) === 'relay')
                    .map(([, def]) => (typeof def.recipient === 'string' ? def.recipient.trim() : ''))
                    .filter(Boolean)
                )
              ]}
              onTransportUrl={(url) =>
                updateOptions((o) => ({ ...o, transport: { ...(isObject(o.transport) ? o.transport : { kind: 'relay' }), url } }), t('formsEditor.relay.urlAnnounce'))
              }
              onChanged={() => setRelayRound((n) => n + 1)}
            />
          </Card>
        ) : selectedSection?.id === 'keys' ? (
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <CardHeading icon={KeyRound}>{t('formsEditor.sections.keys')}</CardHeading>
              <p className="text-micro text-text-secondary">{t('formsEditor.sectionHints.keys')}</p>
              <div className="flex flex-wrap items-center gap-2">
                <SavesImmediately saved={savedFlash} />
              </div>
            </div>
            <Messages {...messagesOf((m) => m.section === 'keys')} />
            <KeysSection
              options={options}
              source={entry.plugin.source}
              check={checkQuery.data ?? null}
              checking={checkQuery.loading}
              onOptions={(change, said) => updateOptions((o) => change(o), said)}
              onChanged={recheck}
            />
          </Card>
        ) : selectedSection ? (
          <SectionPanel
            messages={messagesOf((m) => m.section === selectedSection.id)}
            key={selectedSection.id}
            id={selectedSection.id}
            options={options}
            schema={schema}
            languages={languages}
            saved={savedFlash}
            ids={ids}
            placement={getLayout(entry.plugin)}
            onOptions={(next) => updateOptions(() => next)}
            onPosition={setPosition}
            onOpenOnStage={openOnStage}
          />
        ) : (
          <Card className="flex flex-col gap-3">
            <CardHeading icon={ClipboardList}>{t('formsEditor.panelEmptyTitle')}</CardHeading>
            <p className="text-ui text-text-secondary">{t('formsEditor.panelEmptyText')}</p>
          </Card>
        )
      }
    >
      <InfoNote>{t('formsEditor.intro')}</InfoNote>
      <ReadAgainstNote plugin={FORMS_PLUGIN} readAgainst={FORMS_READ_AGAINST} installed={schemaQuery.data?.packageVersion} />
      {message && (
        <p role="alert" className="text-ui text-red-600 dark:text-red-400">
          {message}
        </p>
      )}
      {entries.length > 1 && <p className="text-ui text-amber-700 dark:text-amber-400">{t('formsEditor.severalEntries', { count: entries.length })}</p>}
      {unknownUses.length > 0 && (
        <p className="text-ui text-amber-700 dark:text-amber-400">
          {t('formsEditor.unknownUses', { count: unknownUses.length, list: unknownUses.slice(0, 5).map((u) => `${u.form} (${u.file})`).join(', ') })}
        </p>
      )}
      <CheckSummary check={check} checking={checkQuery.loading} error={checkQuery.error} unplaced={placed.problems.filter((m) => !m.form && !m.section)} />
      {usagesQuery.error && <p className="text-micro text-amber-700 dark:text-amber-400">{t('formsEditor.scanFailed', { reason: usagesQuery.error })}</p>}

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardHeading icon={Blocks}>{entry.plugin.name}</CardHeading>
          <Button variant="ghost" onClick={() => onShowAllOptions(entry.plugin.name)}>
            {t('formsEditor.allOptions')}
          </Button>
        </div>
        <Toggle
          label={t('formsEditor.enabled')}
          hint={t('formsEditor.enabledHint')}
          checked={entry.plugin.enabled}
          onChange={(on) => updateEntry((p) => ({ ...p, enabled: on }), t(on ? 'formsEditor.enabledAnnounce' : 'formsEditor.disabledAnnounce'))}
        />
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardHeading icon={ClipboardList}>{t('formsEditor.listTitle', { count: forms.length })}</CardHeading>
          {!adding && (
            <Button variant="ghost" onClick={() => setAdding(true)}>
              <Plus size={14} aria-hidden />
              {t('formsEditor.add')}
            </Button>
          )}
        </div>
        {adding && <AddFormForm ids={ids} onAdd={addForm} onCancel={() => setAdding(false)} />}
        {forms.length === 0 && !adding && <p className="text-micro text-text-muted">{t('formsEditor.empty')}</p>}
        <ul ref={listRef} className="flex flex-col gap-1.5">
          {forms.map(([id, def]) => {
            const key = `form:${id}`
            const name = titleOf(id, def)
            return (
              <SelectableRow
                key={id}
                selected={selected === key}
                onSelect={() => setSelected(key)}
                leading={<ClipboardList size={15} aria-hidden className="shrink-0 text-text-secondary" />}
                title={name === id ? id : `${name} (${id})`}
                subtitle={subtitle(def)(id)}
                trailing={
                  <>
                    {placed.problems.some((m) => m.form === id) && <Badge tone="red">{t('formsEditor.check.problemBadge', { count: placed.problems.filter((m) => m.form === id).length })}</Badge>}
                    {layoutForm === id && <Badge tone="green">{t('formsEditor.layoutBadge')}</Badge>}
                    {isAnonymous(def) && <Badge>{t('formsEditor.anonymousBadge')}</Badge>}
                    <IconButton icon={Copy} title={t('formsEditor.duplicateNamed', { name: id })} onClick={() => duplicate(id)} />
                    <IconButton icon={Trash2} title={t('common.removeNamed', { name: id })} onClick={() => void remove(id, def)} />
                  </>
                }
              />
            )
          })}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardHeading icon={SlidersHorizontal}>{t('formsEditor.sectionsTitle')}</CardHeading>
        {schemaQuery.loading ? (
          <p className="text-micro text-text-muted">{t('layoutEditor.inspector.optionsLoading')}</p>
        ) : schemaQuery.error ? (
          <p className="text-micro text-red-600 dark:text-red-400">{t('layoutEditor.inspector.optionsError', { reason: schemaQuery.error })}</p>
        ) : (
          <>
            {schemaQuery.data?.unreadable && (
              <p className="text-micro text-amber-700 dark:text-amber-300">{t('pluginOptions.unreadable', { reason: schemaQuery.data.unreadable })}</p>
            )}
            <ul className="flex flex-col gap-1.5">
              {SECTIONS.filter((s) => s.id !== 'relay' || usesRelay).map((s) => {
                const key = `section:${s.id}`
                const Icon = SECTION_ICONS[s.id]
                return (
                  <SelectableRow
                    key={s.id}
                    selected={selected === key}
                    onSelect={() => setSelected(key)}
                    leading={<Icon size={15} aria-hidden className="shrink-0 text-text-secondary" />}
                    title={t(`formsEditor.sections.${s.id}`)}
                    subtitle={sectionSummary(s.id)}
                    trailing={
                      <>
                        {placed.problems.some((m) => m.section === s.id) && (
                          <Badge tone="red">{t('formsEditor.check.problemBadge', { count: placed.problems.filter((m) => m.section === s.id).length })}</Badge>
                        )}
                        <ChevronRight size={14} aria-hidden className="shrink-0 text-text-muted" />
                      </>
                    }
                  />
                )
              })}
            </ul>
          </>
        )}
      </Card>

      <SitePreview
        projectId={project.id}
        projectPath={project.path}
        stickyPrefix="forms"
        hint={t('formsEditor.previewHint')}
        goTo={previewGoTo}
        highlight={
          selectedForm
            ? { selector: `form.quartz-form[data-form="${selectedForm[0]}"]`, name: titleOf(selectedForm[0], selectedForm[1]), matches: 1, ownClass: true }
            : null
        }
      />
    </DetailLayout>
  )
}

function AddFormForm({ ids, onAdd, onCancel }: { ids: string[]; onAdd: (id: string, start: FormTemplate | 'empty') => void; onCancel: () => void }): JSX.Element {
  const { t } = useTranslation()
  const [start, setStart] = useState<FormTemplate | 'empty'>('contact')
  const [id, setId] = useState(() => freeId(t('formsEditor.templateIds.contact'), ids))
  const [touched, setTouched] = useState(false)
  const [tried, setTried] = useState(false)
  const problem = formIdProblem(id, ids)
  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-ink/10 p-3 dark:border-ink/10"
      onSubmit={(e) => {
        e.preventDefault()
        setTried(true)
        if (!problem) onAdd(id, start)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
      }}
    >
      <FieldGroup label={t('formsEditor.start')}>
        <SegmentedControl
          label={t('formsEditor.start')}
          variant="tiles"
          value={start}
          onChange={(next) => {
            setStart(next)
            // The id follows the choice until it was typed in.
            if (!touched) setId(freeId(t(`formsEditor.templateIds.${next}`), ids))
          }}
          options={[...TEMPLATE_NAMES, 'empty' as const].map((name) => ({
            value: name,
            label: t(`formsEditor.templates.${name}`),
            icon: START_ICONS[name],
            description: t(`formsEditor.templateHints.${name}`)
          }))}
        />
      </FieldGroup>
      <Field label={t('formsEditor.id')} hint={t('formsEditor.idHint')}>
        <TextInput
          value={id}
          onChange={(e) => {
            setTouched(true)
            setId(e.target.value.trim())
          }}
          aria-invalid={tried && !!problem}
        />
      </Field>
      {tried && problem && <p className="text-micro text-red-600 dark:text-red-400">{t(`formsEditor.idProblem.${problem}`)}</p>}
      <div className="flex gap-2">
        <Button type="submit">{t('formsEditor.addSubmit')}</Button>
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}

// The keys of a form the panel shows with its own controls. A key it does not know (one a newer
// plugin adds, a typo) stands under "Weitere Schlüssel" in the plugin's form, so nothing is out
// of reach.
const KNOWN_KEYS = new Set([
  'template',
  'title',
  'description',
  'submitLabel',
  'fields',
  'recipient',
  'subject',
  'transport',
  'encryption',
  'anonymous',
  'pageContext',
  'spam',
  'success',
  'className'
])

function FormPanel({
  id,
  def,
  ids,
  title,
  options,
  schema,
  languages,
  lang,
  saved,
  isLayoutForm,
  olderPlugin,
  onDef,
  onRename,
  onLayoutForm,
  onOpenSection,
  pages,
  slugs,
  scanning,
  onRescan,
  onShowPage,
  messages,
  relayRecipients
}: {
  id: string
  def: FormDef
  ids: string[]
  title: string
  options: Options
  schema: NormalizedOptionSchema | null
  languages: string[]
  lang: FormLanguage
  saved: boolean
  isLayoutForm: boolean
  /** The installed quartz-forms when it is older than FORMS_LAYOUT_SINCE, else null. */
  olderPlugin: string | null
  onDef: (next: FormDef) => void
  onRename: (to: string) => void
  onLayoutForm: (on: boolean) => void
  onOpenSection: (id: SectionId) => void
  /** The pages that embed this form; null while the scan has not answered. */
  pages: FormUsagePage[] | null
  slugs: string[]
  scanning: boolean
  onRescan: () => void
  onShowPage: (slug: string) => void
  messages: { problems: PlacedMessage[]; hints: PlacedMessage[] }
  relayRecipients: { names: string[]; stored: string[] | null; storageAvailable: boolean; saveAddress: (name: string, address: string) => Promise<void> }
}): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [idDraft, setIdDraft] = useState<string | null>(null)
  const idProblem: IdProblem | null = idDraft === null ? null : formIdProblem(idDraft, ids, id)
  const form = useMemo(() => formSchema(schema), [schema])
  const template = isTemplate(def.template) ? TEMPLATES[def.template] : null
  const eff = effectiveForm(def)
  const anonymous = eff.anonymous === true
  const kind = transportKindOf(def, options)
  const encryption = isObject(def.encryption) ? def.encryption : {}
  const mode = encryptionModeOf(def) as EncryptionMode
  const keyNames = isObject(options.keys) ? Object.keys(options.keys) : []
  const chosenKeys = Array.isArray(encryption.keys) ? encryption.keys.filter((k): k is string => typeof k === 'string') : keyNames
  const success = isObject(def.success) ? def.success : {}
  const successMode = success.mode === 'redirect' ? 'redirect' : 'inline'

  // Sets one key of the form; undefined takes it away. A value the template already gives is
  // taken away too: written again, it would stay when the template changes.
  const setKey = (key: string, value: unknown): void => {
    const next = { ...def }
    if (value === undefined || (template && JSON.stringify(template[key]) === JSON.stringify(value) && key !== 'fields')) delete next[key]
    else next[key] = value
    onDef(next)
  }
  const setEncryption = (change: Record<string, unknown>): void => {
    const next: Record<string, unknown> = { ...encryption, ...change }
    for (const [k, v] of Object.entries(next)) if (v === undefined) delete next[k]
    // `mode` is required by the schema; off without anything else is the plugin's default.
    if (next.mode === 'off' && Object.keys(next).length === 1) setKey('encryption', undefined)
    else setKey('encryption', { mode: next.mode ?? 'off', ...next })
  }
  const setSuccess = (change: Record<string, unknown>): void => {
    const next: Record<string, unknown> = { mode: successMode, ...success, ...change }
    for (const [k, v] of Object.entries(next)) if (v === undefined) delete next[k]
    if (next.mode === 'inline' && Object.keys(next).length === 1) setKey('success', undefined)
    else setKey('success', next)
  }
  // Leaving the template: its fields, title and switches become the form's own, so the form
  // stays what it was - without them a form with no fields of its own stops the build.
  const setTemplate = (name: string): void => {
    if (name === (def.template ?? '')) return
    if (!name) {
      const own: FormDef = { ...(template ? structuredClone(template) : {}), ...def }
      delete own.template
      onDef(own)
      return
    }
    onDef({ ...def, template: name })
  }

  const unknownKeys = useCallback((key: string) => !KNOWN_KEYS.has(key), [])
  const hasUnknown = Object.keys(def).some((k) => !KNOWN_KEYS.has(k)) || (form?.fields.some((f) => !KNOWN_KEYS.has(f.key)) ?? false)
  const flat = useMemo(() => ({ flat: true }), [])

  const { copy, copied } = useCopyToClipboard()
  const snippets = embedSnippets(id, options)
  const recipientRole = kind === 'relay' ? 'relay' : kind === 'mailto' ? 'mailto' : kind === 'demo' ? 'demo' : 'none'

  // Which parts stand open holds for every form until a restart; Allgemein and Felder start open.
  // One state for all parts: a sticky state per part would be seven writers of one key.
  const [openParts, setOpenParts] = useStickyState<Partial<Record<FormPartId, boolean>>>('forms.parts', {})
  const part = (pid: FormPartId): { open: boolean; problems: number; onToggle: () => void } => {
    const open = openParts[pid] ?? (pid === 'general' || pid === 'fields')
    return { open, problems: messages.problems.filter((m) => partOf(m) === pid).length, onToggle: () => setOpenParts((p) => ({ ...p, [pid]: !open })) }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardHeading icon={ClipboardList}>
          <span className="break-words">{title}</span>
        </CardHeading>
        <div className="flex flex-wrap items-center gap-2">
          <SavesImmediately saved={saved} />
        </div>
      </div>

      <Field label={t('formsEditor.id')} hint={t('formsEditor.idRenameHint')}>
        <DraftInput
          value={id}
          aria-invalid={!!idProblem}
          onDraft={(v) => setIdDraft(v.trim())}
          onCommit={(v) => {
            const to = v.trim()
            setIdDraft(null)
            if (to === id || formIdProblem(to, ids, id)) return
            onRename(to)
          }}
        />
      </Field>
      {idProblem && <p className="-mt-2 text-micro text-red-600 dark:text-red-400">{t(`formsEditor.idProblem.${idProblem}`)}</p>}
      <Messages problems={messages.problems} hints={messages.hints} />

      <FormPart {...part('general')} icon={SlidersHorizontal} title={t('formsEditor.parts.general')}>
        <Field label={t('formsEditor.template')} hint={t(Array.isArray(def.fields) && template ? 'formsEditor.templateOwnFieldsHint' : 'formsEditor.templateHint')}>
          <Select value={isTemplate(def.template) ? def.template : ''} onChange={(e) => setTemplate(e.target.value)}>
            <option value="">{t('formsEditor.noTemplate')}</option>
            {TEMPLATE_NAMES.map((name) => (
              <option key={name} value={name}>
                {t(`formsEditor.templates.${name}`)}
              </option>
            ))}
          </Select>
        </Field>
        <TextEditor label={t('formsEditor.title')} value={def.title} fallback={template?.title} languages={languages} onValue={(v) => setKey('title', v)} />
        <TextEditor label={t('formsEditor.description')} hint={t('formsEditor.descriptionHint')} value={def.description} languages={languages} multiline onValue={(v) => setKey('description', v)} />
        <TextEditor label={t('formsEditor.submitLabel')} hint={t('formsEditor.submitLabelHint')} value={def.submitLabel} languages={languages} onValue={(v) => setKey('submitLabel', v)} />
        <FieldGroup label={t('formsEditor.afterSending')}>
          <SegmentedControl
            label={t('formsEditor.afterSending')}
            value={successMode}
            onChange={(m) => setSuccess({ mode: m })}
            options={[
              { value: 'inline', label: t('formsEditor.successModes.inline') },
              { value: 'redirect', label: t('formsEditor.successModes.redirect') }
            ]}
          />
        </FieldGroup>
        {successMode === 'inline' ? (
          <TextEditor label={t('formsEditor.successText')} hint={t('formsEditor.successTextHint')} value={success.text} languages={languages} onValue={(v) => setSuccess({ text: v })} />
        ) : (
          <SlugField
            value={typeof success.slug === 'string' ? success.slug : ''}
            slugs={slugs}
            onCommit={(v) => setSuccess({ slug: v.trim() || undefined })}
          />
        )}
        <div className="flex flex-col gap-3">
          <p className="text-micro font-semibold uppercase tracking-wide text-text-muted">{t('pluginOptions.rarelyUsed')}</p>
          <Field label="className" configKey hint={t('formsEditor.classNameHint')}>
            <DraftInput value={typeof def.className === 'string' ? def.className : ''} onCommit={(v) => setKey('className', v.trim() || undefined)} />
          </Field>
        </div>
      </FormPart>

      <FormPart {...part('fields')} icon={ListChecks} title={t('formsEditor.parts.fields')}>
        <FormFieldsEditor
          def={def}
          fields={eff.fields}
          schema={form}
          languages={languages}
          lang={lang}
          anonymous={anonymous}
          fieldMessages={messages.problems.filter((m) => m.field !== undefined)}
          olderPlugin={olderPlugin}
          onFields={(next) => setKey('fields', next)}
        />
      </FormPart>

      <FormPart {...part('sending')} icon={Send} title={t('formsEditor.parts.sending')}>
        <p className="text-micro text-text-secondary">{t('formsEditor.sendsVia', { kind: t(`formsEditor.transportKinds.${kind}`, kind) })}</p>
        {recipientRole === 'relay' ? (
          <RelayRecipientField
            value={typeof def.recipient === 'string' ? def.recipient : ''}
            names={relayRecipients.names}
            stored={relayRecipients.stored}
            storageAvailable={relayRecipients.storageAvailable}
            onPick={(name) => setKey('recipient', name)}
            onSaveAddress={relayRecipients.saveAddress}
          />
        ) : (
          <Field label={t(`formsEditor.recipient.${recipientRole}`)} hint={t(`formsEditor.recipientHint.${recipientRole}`)} muted={recipientRole === 'none' || recipientRole === 'demo'}>
            <DraftInput
              value={typeof def.recipient === 'string' ? def.recipient : ''}
              placeholder={recipientRole === 'mailto' ? 'name@example.org' : undefined}
              onCommit={(v) => setKey('recipient', v.trim() || undefined)}
            />
          </Field>
        )}
        <TextEditor
          label={t('formsEditor.subject')}
          hint={t('formsEditor.subjectHint')}
          value={def.subject}
          fallback={eff.title}
          languages={languages}
          onValue={(v) => setKey('subject', v)}
        />
        <InheritedBlock
          title={t('formsEditor.ownTransport')}
          hint={t('formsEditor.ownTransportHint')}
          schema={objectSchema(schema, 'transport')}
          above={resolvedGlobal(schema, options, 'transport')}
          values={isObject(def.transport) ? def.transport : {}}
          languages={languages}
          lang={lang}
          onValues={(next) => setKey('transport', next)}
        />
      </FormPart>

      <FormPart {...part('privacy')} icon={Lock} title={t('formsEditor.parts.privacy')}>
        <FieldGroup label={t('formsEditor.encryption')}>
          <SegmentedControl
            label={t('formsEditor.encryption')}
            value={mode}
            onChange={(m) => setEncryption({ mode: m })}
            options={(['off', 'optional', 'required'] as const).map((m) => ({ value: m, label: t(`formsEditor.encryptionChoices.${m}`) }))}
          />
          <span className="text-micro text-text-muted">{t(`formsEditor.encryptionHints.${mode}`)}</span>
        </FieldGroup>
        {mode !== 'off' &&
          (keyNames.length === 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-micro text-amber-700 dark:text-amber-400">{t('formsEditor.noKeysYet')}</p>
              <Button variant="ghost" onClick={() => onOpenSection('keys')}>
                <KeyRound size={14} aria-hidden />
                {t('formsEditor.sections.keys')}
              </Button>
            </div>
          ) : (
            <FieldGroup label={t('formsEditor.encryptTo')}>
              {keyNames.map((name) => (
                <Toggle
                  key={name}
                  label={name}
                  checked={chosenKeys.includes(name)}
                  onChange={(on) => {
                    const next = on ? [...new Set([...chosenKeys, name])] : chosenKeys.filter((k) => k !== name)
                    // Every key: the key goes, and a key added later is used too. None: the build
                    // stops ("no keys to encrypt to"), so the last one stays.
                    if (next.length === 0) return
                    setEncryption({ keys: keyNames.every((k) => next.includes(k)) ? undefined : next })
                  }}
                />
              ))}
              <span className="text-micro text-text-muted">{t('formsEditor.encryptToHint')}</span>
            </FieldGroup>
          ))}
        {mode !== 'off' && (
          <Toggle
            label={t('formsEditor.showFingerprint')}
            hint={t('formsEditor.showFingerprintHint')}
            checked={encryption.showFingerprint !== false}
            onChange={(on) => setEncryption({ showFingerprint: on ? undefined : false })}
          />
        )}
        <Toggle
          label={t('formsEditor.anonymous')}
          hint={t('formsEditor.anonymousHint')}
          checked={anonymous}
          onChange={(on) => setKey('anonymous', on === (template?.anonymous === true) ? undefined : on)}
        />
        <div className="flex flex-col gap-1">
          <Toggle
            label={t('formsEditor.pageContext')}
            hint={anonymous ? undefined : t('formsEditor.pageContextHint')}
            checked={eff.pageContext === true}
            onChange={(on) => setKey('pageContext', on === (template?.pageContext === true) ? undefined : on)}
          />
          {anonymous && <NoEffect reason={t('formsEditor.pageContextAnonymous')} />}
        </div>
      </FormPart>

      <FormPart {...part('spam')} icon={ShieldCheck} title={t('formsEditor.parts.spam')}>
        <InheritedBlock
          hint={t('formsEditor.ownSpamHint')}
          schema={objectSchema(schema, 'spam')}
          above={resolvedGlobal(schema, options, 'spam')}
          values={isObject(def.spam) ? def.spam : {}}
          languages={languages}
          lang={lang}
          onValues={(next) => setKey('spam', next)}
        />
      </FormPart>

      <FormPart {...part('embed')} icon={Code} title={t('formsEditor.parts.embed')}>
        <p className="text-micro text-text-muted">{t('formsEditor.embedHint')}</p>
        {(
          [
            ['placeholder', snippets.placeholder],
            ['codeBlock', snippets.codeBlock],
            ['frontmatter', snippets.frontmatter]
          ] as const
        ).map(([k, text]) => (
          <div key={k} className="flex flex-wrap items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-micro font-medium text-text-secondary">{t(`formsEditor.embedKinds.${k}`)}</span>
              <pre className="overflow-x-auto rounded-md bg-ink/[0.04] px-2 py-1.5 font-mono text-xs text-text dark:bg-ink/10">{text}</pre>
            </div>
            <Button variant="ghost" onClick={() => copy(text, t(`formsEditor.embedKinds.${k}`))}>
              <Copy size={14} aria-hidden />
              {t('formsEditor.copy')}
            </Button>
          </div>
        ))}
        <p aria-live="polite" className="text-micro text-green-600 dark:text-green-400">
          {copied ? t('formsEditor.copied') : ''}
        </p>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-micro font-medium text-text-secondary">{t('formsEditor.usedOn')}</span>
            <Button variant="ghost" onClick={onRescan} disabled={scanning}>
              {t('formsEditor.rescan')}
            </Button>
          </div>
          {pages === null ? (
            <p className="text-micro text-text-muted">{t('formsEditor.scanning')}</p>
          ) : pages.length === 0 ? (
            <p className="text-micro text-text-muted">{isLayoutForm ? t('formsEditor.onNoPageLayout') : t('formsEditor.onNoPageHint')}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {pages.map((p) => (
                <li key={p.file} className="flex flex-wrap items-center gap-2 text-ui">
                  <span className="min-w-0 flex-1 truncate" title={p.file}>
                    {p.title ?? p.file}
                    {p.title && <span className="ml-1.5 text-micro text-text-muted">{p.file}</span>}
                  </span>
                  <Button variant="ghost" onClick={() => onShowPage(p.slug)}>
                    {t('formsEditor.showInPreview')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <span className="text-micro text-text-muted">{t('formsEditor.usedOnHint')}</span>
        </div>
        <Toggle label={t('formsEditor.useAsLayoutForm')} hint={t('formsEditor.useAsLayoutFormHint')} checked={isLayoutForm} onChange={onLayoutForm} />
      </FormPart>

      {hasUnknown && (
        <FormPart {...part('more')} icon={Wrench} title={t('pluginOptions.moreKeys')}>
          <PluginOptionsForm schema={form} values={def} onChange={(next) => onDef(next ?? {})} explicitEmpty languages={languages} projectPath={project.path} pick={unknownKeys} freeKeys={false} root={flat} />
        </FormPart>
      )}
    </Card>
  )
}

/**
 * A part of the panel of one form: a box that folds, as the option groups of Navigationen and
 * Zusätzliche Inhalte do. Six parts separated by a line each were one long column in which a
 * heading was easy to miss (user, 2026-10-20). The plugin's problems with a part stand on its
 * band, so a folded part does not hide them; all of them stand above the parts as well.
 */
function FormPart({
  icon: Icon,
  title,
  open,
  problems,
  onToggle,
  children
}: {
  icon: typeof Send
  title: string
  open: boolean
  problems: number
  onToggle: () => void
  children: ReactNode
}): JSX.Element {
  const { t } = useTranslation()
  return (
    <FoldBox
      title={
        <span className="flex items-center gap-1.5">
          <Icon size={13} aria-hidden className="shrink-0" />
          {title}
        </span>
      }
      aside={problems > 0 ? <Badge tone="red">{t('formsEditor.check.problemBadge', { count: problems })}</Badge> : null}
      open={open}
      onToggle={onToggle}
      bodyClassName="gap-3"
    >
      {children}
    </FoldBox>
  )
}

/** The target page of a redirect: free text, the site's pages as suggestions. */
function SlugField({ value, slugs, onCommit }: { value: string; slugs: string[]; onCommit: (value: string) => void }): JSX.Element {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(value)
  const options = useMemo(() => slugs.map((slug) => ({ value: slug, label: slug })), [slugs])
  const unknown = value !== '' && slugs.length > 0 && !slugs.includes(value)
  return (
    <Field label={t('formsEditor.successSlug')} hint={unknown ? t('formsEditor.successSlugUnknown') : t('formsEditor.successSlugHint')}>
      <Combobox
        value={draft}
        onChange={(v) => {
          setDraft(v)
          if (slugs.includes(v)) onCommit(v)
        }}
        onBlur={() => draft !== value && onCommit(draft)}
        options={options}
        emptyText={t('formsEditor.noSuchPage')}
        listLabel={t('formsEditor.successSlug')}
        label={t('formsEditor.successSlug')}
        placeholder="danke"
      />
    </Field>
  )
}

/**
 * The inside of a form's `spam` or `transport`: each key either stands as the global setting (shown
 * as what it is there) or is set for this form. Resetting a key gives it back to the global one.
 */
function InheritedBlock({
  title,
  hint,
  schema,
  above,
  values,
  languages,
  lang,
  onValues
}: {
  title?: string
  hint: string
  schema: NormalizedOptionSchema | null
  above: Record<string, unknown>
  values: Record<string, unknown>
  languages: string[]
  lang: FormLanguage
  onValues: (next: Record<string, unknown> | undefined) => void
}): JSX.Element | null {
  const { t } = useTranslation()
  const project = useProject()
  const ctx: FormContext = useMemo(
    () => ({
      lang,
      explicitEmpty: false,
      languages,
      projectPath: project.path,
      query: '',
      mark: '',
      above: { short: t('formsEditor.asAllForms'), choice: t('formsEditor.asAllFormsChoice', { value: '{{value}}' }) }
    }),
    [lang, languages, project.path, t]
  )
  if (!schema) return null
  return (
    <div className="flex flex-col gap-2">
      {title && <h4 className="text-micro font-semibold text-text-secondary">{title}</h4>}
      <p className="text-micro text-text-muted">{hint}</p>
      <ObjectBlock
        fields={schema.fields}
        values={values}
        ctx={ctx}
        inherit={{ values: above, fields: schema.fields }}
        root={{ flat: true }}
        onValue={(next) => onValues(Object.keys(next).length ? next : undefined)}
      />
    </div>
  )
}

function SectionPanel({
  messages,
  id,
  options,
  schema,
  languages,
  saved,
  ids,
  placement,
  onOptions,
  onPosition,
  onOpenOnStage
}: {
  id: SectionId
  options: Options
  schema: NormalizedOptionSchema | null
  languages: string[]
  saved: boolean
  ids: string[]
  placement: ReturnType<typeof getLayout>
  onOptions: (next: Options | undefined) => void
  onPosition: (position: LayoutPosition) => void
  onOpenOnStage: () => void
  messages: { problems: PlacedMessage[]; hints: PlacedMessage[] }
}): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const section = SECTIONS.find((s) => s.id === id)!
  const Icon = SECTION_ICONS[id]
  // A section that is one object (`spam`, `transport`) shows what is inside it, with the keys as
  // they stand in quartz.config.yaml (`spam.pow`), as Mehrsprachigkeit does with `switcher`.
  const sole = section.keys.length === 1 ? objectSchema(schema, section.keys[0]) : null
  const soleKey = sole ? section.keys[0] : null
  const pick = useCallback((key: string) => (section.keys as readonly string[]).includes(key) && key !== 'layoutForm', [section])
  const root = useMemo(() => ({ flat: true, ...(soleKey ? { keyPrefix: `${soleKey}.` } : {}) }), [soleKey])
  const soleDefault = soleKey ? schema?.fields.find((f) => f.key === soleKey) : undefined
  const soleValues = soleKey && isObject(options[soleKey]) ? (options[soleKey] as Options) : {}
  // The section's schema with the defaults of `defaultOptions` on each key, so an unset key shows
  // what the plugin takes for it.
  const soleSchema = useMemo<NormalizedOptionSchema | null>(() => {
    if (!sole) return null
    const defaults = soleDefault?.hasDefault && isObject(soleDefault.default) ? soleDefault.default : {}
    return {
      ...sole,
      fields: sole.fields.map((f) => (f.hasDefault || !(f.key in defaults) ? f : { ...f, hasDefault: true, default: defaults[f.key] }))
    }
  }, [sole, soleDefault])
  const layoutForm = typeof options.layoutForm === 'string' ? options.layoutForm : ''

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardHeading icon={Icon}>{t(`formsEditor.sections.${id}`)}</CardHeading>
        <p className="text-micro text-text-secondary">{t(`formsEditor.sectionHints.${id}`)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <SavesImmediately saved={saved} />
        </div>
      </div>
      <Messages problems={messages.problems} hints={messages.hints} />

      {id === 'layout' && (
        <>
          <Field label="layoutForm" configKey hint={t('formsEditor.layoutFormHint')}>
            <Select
              value={ids.includes(layoutForm) || layoutForm === '' ? layoutForm : '__unknown'}
              onChange={(e) => {
                const rest = { ...options, layoutForm: e.target.value }
                onOptions(rest)
              }}
            >
              <option value="">{t('formsEditor.noLayoutForm')}</option>
              {!ids.includes(layoutForm) && layoutForm !== '' && <option value="__unknown">{t('formsEditor.unknownForm', { id: layoutForm })}</option>}
              {ids.map((formId) => (
                <option key={formId} value={formId}>
                  {formId}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('layoutEditor.inspector.position')} hint={placement ? undefined : t('formsEditor.notPlacedHint')}>
            <Select value={placement?.position ?? ''} onChange={(e) => e.target.value && onPosition(e.target.value as LayoutPosition)}>
              {!placement && <option value="">{t('formsEditor.notPlaced')}</option>}
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {t(`positions.${p}`, p)}
                </option>
              ))}
            </Select>
          </Field>
          {placement && (
            <div>
              <Button variant="ghost" onClick={onOpenOnStage}>
                {t('pluginsInstalled.showOnStage')}
              </Button>
            </div>
          )}
        </>
      )}

      {soleKey && soleSchema ? (
        <PluginOptionsForm
          schema={soleSchema}
          values={soleValues}
          onChange={(next) => {
            const rest = { ...options }
            if (next) rest[soleKey] = next
            else delete rest[soleKey]
            onOptions(Object.keys(rest).length ? rest : undefined)
          }}
          explicitEmpty
          languages={languages}
          projectPath={project.path}
          freeKeys={false}
          root={root}
        />
      ) : (
        <PluginOptionsForm schema={schema} values={options} onChange={onOptions} explicitEmpty languages={languages} projectPath={project.path} pick={pick} freeKeys={false} root={root} />
      )}
    </Card>
  )
}

/**
 * What quartz-forms says about a form or a section: its problems, which stop the build, and its
 * hints. The sentences are the plugin's own, in the app's language (`--lang`, quartz-forms 0.3.0),
 * shown with the path the place already names taken off.
 */
function Messages({ problems, hints }: { problems: PlacedMessage[]; hints: PlacedMessage[] }): JSX.Element | null {
  const { t } = useTranslation()
  if (problems.length === 0 && hints.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-ink/10 p-2.5 dark:border-ink/10">
      {problems.length > 0 && (
        <>
          <p className="text-micro font-semibold text-red-600 dark:text-red-400">{t('formsEditor.check.problems', { count: problems.length })}</p>
          <ul className="flex flex-col gap-0.5">
            {problems.map((m, i) => (
              <li key={i} className="break-words font-mono text-micro text-red-600 dark:text-red-400">
                {m.rest || m.text}
              </li>
            ))}
          </ul>
        </>
      )}
      {hints.length > 0 && (
        <>
          <p className="text-micro font-semibold text-text-secondary">{t('formsEditor.check.hints', { count: hints.length })}</p>
          <ul className="flex flex-col gap-0.5">
            {hints.map((m, i) => (
              <li key={i} className="break-words font-mono text-micro text-text-muted">
                {m.rest || m.text}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

/** One line above the list: whether the plugin's own check passes, and what it says outside a form or section. */
function CheckSummary({
  check,
  checking,
  error,
  unplaced
}: {
  check: FormsCheckResult | null
  checking: boolean
  error: string | null
  unplaced: PlacedMessage[]
}): JSX.Element | null {
  const { t } = useTranslation()
  if (error) return <p className="text-ui text-amber-700 dark:text-amber-400">{t('formsEditor.check.unavailable', { reason: error })}</p>
  if (!check) return checking ? <p className="text-micro text-text-muted">{t('formsEditor.check.checking')}</p> : null
  if (check.state === 'unavailable') return <p className="text-ui text-amber-700 dark:text-amber-400">{t('formsEditor.check.unavailable', { reason: check.reason })}</p>
  const n = check.problems.length
  return (
    <div className="flex flex-col gap-1">
      <p aria-live="polite" className={`text-ui ${n ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
        {n ? t('formsEditor.check.summaryProblems', { count: n }) : t('formsEditor.check.summaryOk')}
        {checking && <span className="ml-2 text-micro text-text-muted">{t('formsEditor.check.checking')}</span>}
      </p>
      {unplaced.length > 0 && <Messages problems={unplaced} hints={[]} />}
    </div>
  )
}

/** `configuration.baseUrl` as an https address without a trailing slash, or null. */
function siteBaseOf(config: QuartzConfig): string | null {
  const raw = (config.configuration as { baseUrl?: unknown } | undefined)?.baseUrl
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    const url = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`)
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
  } catch {
    return null
  }
}
