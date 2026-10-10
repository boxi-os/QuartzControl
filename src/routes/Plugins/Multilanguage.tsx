import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, ArrowUpDown, Blocks, ChevronRight, Languages, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import type { NormalizedOptionSchema, OptionField, PluginEntry, QuartzConfig } from '@shared/ipc-contract'
import { Badge, Button, Card, CardHeading, DetailLayout, Field, FoldBox, IconButton, InfoNote, PanelSection, SelectableRow, TextInput, Toggle, focusRowAt } from '../../components/ui'
import { formatIpcError } from '../../components/ErrorSurface'
import PluginOptionsForm from '../../components/PluginOptionsForm'
import { enumLabel, fieldText, type FormLanguage } from '../../components/PluginOptionsForm/text'
import SitePreview from '../../components/SitePreview'
import { entrySelector } from '../../data/componentSelectors'
import { announce } from '../../state/announcer'
import { primeStickyState, useStickyState } from '../../state/uiState'
import { useIpcQuery } from '../../state/useIpcQuery'
import { confirmDialog } from '../../utils/confirm'
import { componentRef, getLayout } from '../LayoutEditor/utils'
import { useProject } from '../ProjectLayout'
import {
  LANGUAGE_KEYS,
  MULTILANGUAGE_PLUGIN,
  MULTILANGUAGE_READ_AGAINST,
  SECTIONS,
  codeProblem,
  defaultLanguageOf,
  isPublished,
  languagesOf,
  multilanguageEntries,
  normalizeCode,
  publishedByRemoving,
  publishedOf,
  removeLanguage,
  renameLanguage,
  sectionPick,
  withLanguages,
  withPublished,
  type LanguageEntry,
  type SectionId
} from './multilanguageOptions'
import { ReadAgainstNote } from './ReadAgainstNote'
import { SavesImmediately } from './SavesImmediately'

type Options = Record<string, unknown>

/**
 * The editor for quartz-multilanguage (plan 1.1, phase 7). Unlike the other two, the plugin is one
 * entry for the whole site, so the list on the left is not its instances but its languages - the
 * one option that is a list of things, which the generic form shows as a list of nested forms -
 * and below them the plugin's other groups, each a row that opens in the panel. Renaming or
 * removing a language also changes every option that names it by code (multilanguage.ts).
 *
 * The writes follow the plugin list's rules (Installed.tsx), as in Navigations.tsx: each one
 * against the newest state, queued, and re-read once the queue is empty.
 */
export default function Multilanguage({ onShowAllOptions }: { onShowAllOptions: (stickyKey: string) => void }): JSX.Element {
  const { t, i18n } = useTranslation()
  const lang: FormLanguage = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'de'
  const project = useProject()
  const navigate = useNavigate()
  const [config, setConfig] = useState<QuartzConfig | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  // `lang:<code>` or `section:<id>` - a code and a section id are stable, a row's position is not.
  const [selected, setSelected] = useStickyState<string | null>('multilanguage.selected', null)
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
    },
    []
  )

  const entries = multilanguageEntries(config)
  const entry = entries[0] ?? null
  const sourceKey = JSON.stringify(entry?.plugin.source ?? null)
  const schemaQuery = useIpcQuery(
    () => (entry ? window.quartzGui.plugins.optionSchema({ projectPath: project.path, source: entry.plugin.source }) : Promise.resolve(null)),
    [project.path, sourceKey]
  )
  const schema = schemaQuery.data?.schema ?? null

  const configRef = useRef(config)
  configRef.current = config
  const writes = useRef<Promise<unknown>>(Promise.resolve())
  async function write(next: QuartzConfig, said?: string): Promise<void> {
    configRef.current = next
    setConfig(next)
    const pending = writes.current.then(() => window.quartzGui.config.save(project.path, next))
    writes.current = pending.catch(() => {})
    try {
      await pending
    } catch (err) {
      await reload()
      setMessage(formatIpcError(err))
      return
    }
    setMessage(null)
    setSavedFlash(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSavedFlash(false), 2000)
    if (said) announce(said)
    if (configRef.current === next) await reload()
  }

  // Against the newest state, like every write here: two changes in quick succession must not
  // undo each other.
  function updateEntry(change: (p: PluginEntry) => PluginEntry, said?: string): void {
    const base = configRef.current
    const current = multilanguageEntries(base)[0]
    if (!base || !current) return
    void write({ ...base, plugins: base.plugins.map((p, i) => (i === current.index ? change(p) : p)) }, said)
  }
  function updateOptions(change: (options: Options) => Options | undefined, said?: string): void {
    updateEntry((p) => {
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
        <CardHeading icon={Languages}>{t('multilanguageEditor.notInstalledTitle')}</CardHeading>
        <p className="text-ui text-text-secondary">{t('multilanguageEditor.notInstalledText')}</p>
      </Card>
    )
  }

  const options = entry.plugin.options ?? {}
  const languages = languagesOf(options)
  const defaultCode = defaultLanguageOf(options, languages)
  const published = publishedOf(options, languages)
  const nameOf = (l: LanguageEntry): string =>
    (typeof l.native === 'string' && l.native.trim()) || (typeof l.label === 'string' && l.label.trim()) || l.code.toUpperCase()

  const field = (key: string): OptionField | undefined => schema?.fields.find((f) => f.key === key)
  const valueOf = (key: string): unknown => (key in options ? options[key] : field(key)?.default)
  const sub = (key: string, child: string): unknown => {
    const own = options[key]
    if (own && typeof own === 'object' && !Array.isArray(own) && child in own) return (own as Options)[child]
    const def = field(key)?.default
    return def && typeof def === 'object' ? (def as Options)[child] : undefined
  }
  const subField = (key: string, child: string): OptionField | undefined => {
    const node = field(key)?.node
    return node?.kind === 'object' ? node.fields.find((f) => f.key === child) : undefined
  }
  const onOff = (v: unknown): string => t(v === true ? 'multilanguageEditor.on' : 'multilanguageEditor.off')
  const list = (v: unknown, labels: string): string =>
    Array.isArray(v) && v.length ? v.map((x) => t(`multilanguageEditor.${labels}.${String(x)}`, String(x))).join(', ') : t('multilanguageEditor.none')

  // One line per section, in the words of its rows - what the section is set to, not what it is.
  const summary = (id: SectionId): string => {
    switch (id) {
      case 'detection':
        return `${t('multilanguageEditor.summaryDetection')}: ${list(valueOf('detection'), 'detectionValues')}`
      case 'switcher': {
        const style = sub('switcher', 'style')
        const label = sub('switcher', 'label')
        return [
          typeof style === 'string' ? enumLabel(subField('switcher', 'style'), style, lang) : null,
          typeof label === 'string' ? enumLabel(subField('switcher', 'label'), label, lang) : null
        ]
          .filter(Boolean)
          .join(' · ')
      }
      case 'seo':
        return `hreflang ${onOff(sub('seo', 'hreflang'))} · og:locale ${onOff(sub('seo', 'ogLocale'))}`
      case 'redirects': {
        const root = valueOf('rootRedirect')
        return [
          `${t('multilanguageEditor.summaryRoot')}: ${typeof root === 'string' ? enumLabel(field('rootRedirect'), root, lang) : '—'}`,
          valueOf('rememberChoice') === true ? t('multilanguageEditor.summaryRemember') : null
        ]
          .filter(Boolean)
          .join(' · ')
      }
      case 'notices':
      case 'linksDates': {
        const keys: readonly string[] = SECTIONS.find((s) => s.id === id)!.keys
        const on = keys.filter((k) => valueOf(k) === true).map((k) => t(`multilanguageEditor.short.${k}`))
        return on.length ? on.join(', ') : t('multilanguageEditor.allOff')
      }
      default:
        return ''
    }
  }

  const otherPick = sectionPick('other')
  const hasOther = (schema?.fields ?? []).some((f) => otherPick(f.key)) || Object.keys(options).some(otherPick)
  const sectionIds: SectionId[] = [...SECTIONS.map((s) => s.id), ...(hasOther ? (['other'] as const) : [])]

  const selectedLang = selected?.startsWith('lang:') ? (languages.find((l) => l.code === selected.slice(5)) ?? null) : null
  const selectedSection = selected?.startsWith('section:') ? (sectionIds.find((id) => id === selected.slice(8)) ?? null) : null

  function addLanguage(code: string): void {
    const c = normalizeCode(code)
    setAdding(false)
    setSelected(`lang:${c}`)
    // A language that is new to the site is not published until it has pages - unless every
    // language is published anyway, which the empty list says.
    updateOptions((o) => withLanguages(o, [...languagesOf(o), { code: c }]), t('multilanguageEditor.addedAnnounce', { code: c }))
  }

  async function remove(l: LanguageEntry): Promise<void> {
    const name = nameOf(l)
    // Removing the one published language publishes all the others, which were held back on
    // purpose - so the question says which, and the button is named after it.
    const others = publishedByRemoving(options, languages, l.code)
    const question = others.length
      ? {
          text: t('multilanguageEditor.removeOnlyPublishedConfirm', { name, others: others.map(nameOf).join(', ') }),
          confirmLabel: t('multilanguageEditor.removeAndPublish')
        }
      : { text: t('multilanguageEditor.removeConfirm', { name }), confirmLabel: t('common.remove') }
    if (!(await confirmDialog({ ...question, danger: true }))) return
    if (selected === `lang:${l.code}`) setSelected(null)
    flushSync(() => updateOptions((o) => removeLanguage(o, languagesOf(o), l.code), t('multilanguageEditor.removedAnnounce', { name })))
    focusRowAt(listRef.current, languages.findIndex((x) => x.code === l.code))
  }

  function move(l: LanguageEntry, by: -1 | 1): void {
    const from = languages.findIndex((x) => x.code === l.code)
    const to = from + by
    if (from < 0 || to < 0 || to >= languages.length) return
    updateOptions(
      (o) => {
        const now = languagesOf(o)
        const i = now.findIndex((x) => x.code === l.code)
        const j = i + by
        if (i < 0 || j < 0 || j >= now.length) return o
        const next = [...now]
        ;[next[i], next[j]] = [next[j], next[i]]
        return withLanguages(o, next)
      },
      t('multilanguageEditor.movedAnnounce', { name: nameOf(l), n: to + 1, count: languages.length })
    )
  }

  function openOnStage(): void {
    if (!config || !entry) return
    const target = `/project/${project.id}/layout`
    primeStickyState(target, 'layout.pageType', null)
    primeStickyState(target, 'layout.selected', componentRef(config.plugins, entry.index))
    primeStickyState(target, 'layout.tab', 'global')
    navigate(target)
  }

  const languageCodes = languages.map((l) => l.code)

  return (
    <DetailLayout
      panelWidth="wide"
      panelLabel={t('multilanguageEditor.panelLabel')}
      onDismiss={() => setSelected(null)}
      panel={
        selectedLang ? (
          <LanguagePanel
            key={selectedLang.code}
            language={selectedLang}
            name={nameOf(selectedLang)}
            languages={languages}
            position={languages.indexOf(selectedLang)}
            isDefault={selectedLang.code === defaultCode}
            published={isPublished(selectedLang.code, published)}
            onlyPublished={isPublished(selectedLang.code, published) && languages.filter((l) => isPublished(l.code, published)).length === 1}
            saved={savedFlash}
            schema={schema}
            lang={lang}
            onChange={(next) =>
              updateOptions((o) => withLanguages(o, languagesOf(o).map((l) => (l.code === selectedLang.code ? next : l))))
            }
            onRename={(to) => {
              setSelected(`lang:${to}`)
              updateOptions(
                (o) => renameLanguage(o, languagesOf(o), selectedLang.code, to),
                t('multilanguageEditor.renamedAnnounce', { from: selectedLang.code, to })
              )
            }}
            onMakeDefault={() =>
              updateOptions((o) => ({ ...o, defaultLanguage: selectedLang.code }), t('multilanguageEditor.defaultAnnounce', { name: nameOf(selectedLang) }))
            }
            onPublish={(on) =>
              updateOptions(
                (o) => withPublished(o, languagesOf(o), selectedLang.code, on),
                t(on ? 'multilanguageEditor.publishedAnnounce' : 'multilanguageEditor.unpublishedAnnounce', { name: nameOf(selectedLang) })
              )
            }
            onMove={(by) => move(selectedLang, by)}
          />
        ) : selectedSection ? (
          <SectionPanel
            key={selectedSection}
            id={selectedSection}
            values={options}
            schema={schema}
            schemaState={schemaQuery.loading ? 'loading' : schemaQuery.error ? schemaQuery.error : null}
            saved={savedFlash}
            languages={languageCodes}
            placement={getLayout(entry.plugin)}
            onOptions={(next) => updateOptions(() => next)}
            onOpenOnStage={openOnStage}
          />
        ) : (
          <Card className="flex flex-col gap-3">
            <CardHeading icon={Languages}>{t('multilanguageEditor.panelEmptyTitle')}</CardHeading>
            <p className="text-ui text-text-secondary">{t('multilanguageEditor.panelEmptyText')}</p>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-ui">
              <dt className="text-text-secondary">{t('multilanguageEditor.summaryLanguages')}</dt>
              <dd className="text-text">{languages.map(nameOf).join(', ')}</dd>
              <dt className="text-text-secondary">{t('multilanguageEditor.summaryDefault')}</dt>
              <dd className="text-text">{nameOf(languages.find((l) => l.code === defaultCode)!)}</dd>
              <dt className="text-text-secondary">{t('multilanguageEditor.summaryPublished')}</dt>
              <dd className="text-text">
                {published.length ? languages.filter((l) => published.includes(l.code)).map(nameOf).join(', ') : t('multilanguageEditor.publishedAll')}
              </dd>
              <dt className="text-text-secondary">{t('multilanguageEditor.summaryDetection')}</dt>
              <dd className="text-text">{list(valueOf('detection'), 'detectionValues')}</dd>
            </dl>
          </Card>
        )
      }
    >
      <InfoNote>{t('multilanguageEditor.intro')}</InfoNote>
      <ReadAgainstNote plugin={MULTILANGUAGE_PLUGIN} readAgainst={MULTILANGUAGE_READ_AGAINST} installed={schemaQuery.data?.packageVersion} />
      {message && (
        <p role="alert" className="text-ui text-red-600 dark:text-red-400">
          {message}
        </p>
      )}
      {entries.length > 1 && <p className="text-ui text-amber-700 dark:text-amber-400">{t('multilanguageEditor.severalEntries', { count: entries.length })}</p>}
      {typeof options.defaultLanguage === 'string' && normalizeCode(options.defaultLanguage) !== defaultCode && (
        <p className="text-ui text-amber-700 dark:text-amber-400">
          {t('multilanguageEditor.defaultUnknown', { code: options.defaultLanguage, name: nameOf(languages[0]) })}
        </p>
      )}

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* The plugin entry, named as it stands in the config: the tab above already says
              "Mehrsprachigkeit", and a card under the same name read as the page twice. */}
          <CardHeading icon={Blocks}>{entry.plugin.name}</CardHeading>
          <Button variant="ghost" onClick={() => onShowAllOptions(entry.plugin.name)}>
            {t('multilanguageEditor.allOptions')}
          </Button>
        </div>
        <Toggle
          label={t('multilanguageEditor.enabled')}
          hint={t('multilanguageEditor.enabledHint')}
          checked={entry.plugin.enabled}
          onChange={(on) =>
            updateEntry((p) => ({ ...p, enabled: on }), t(on ? 'multilanguageEditor.enabledAnnounce' : 'multilanguageEditor.disabledAnnounce'))
          }
        />
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardHeading icon={Languages}>{t('multilanguageEditor.listTitle', { count: languages.length })}</CardHeading>
          {!adding && (
            <Button variant="ghost" onClick={() => setAdding(true)}>
              <Plus size={14} aria-hidden />
              {t('multilanguageEditor.add')}
            </Button>
          )}
        </div>
        {adding && <AddLanguageForm languages={languages} onAdd={addLanguage} onCancel={() => setAdding(false)} />}
        <ul ref={listRef} className="flex flex-col gap-1.5">
          {languages.map((l) => {
            const key = `lang:${l.code}`
            const isSelected = selected === key
            const name = nameOf(l)
            const sublines = [l.code, ...(typeof l.locale === 'string' && l.locale ? [l.locale] : [])]
            return (
              <SelectableRow
                key={l.code}
                selected={isSelected}
                onSelect={() => setSelected(key)}
                leading={<span className="w-8 shrink-0 text-center text-micro font-semibold uppercase text-text-secondary">{l.code}</span>}
                title={name}
                subtitle={sublines.join(' · ')}
                trailing={
                  <>
                    {l.code === defaultCode && <Badge tone="green">{t('multilanguageEditor.defaultBadge')}</Badge>}
                    {!isPublished(l.code, published) && <Badge tone="amber">{t('multilanguageEditor.unpublishedBadge')}</Badge>}
                    {/* The last language cannot go: without one the plugin falls back to `en`. */}
                    {languages.length > 1 && <IconButton icon={Trash2} title={t('common.removeNamed', { name })} onClick={() => void remove(l)} />}
                  </>
                }
              />
            )
          })}
        </ul>
      </Card>

      <Card className="flex flex-col gap-3">
        <CardHeading icon={SlidersHorizontal}>{t('multilanguageEditor.sectionsTitle')}</CardHeading>
        <ul className="flex flex-col gap-1.5">
          {sectionIds.map((id) => {
            const key = `section:${id}`
            const isSelected = selected === key
            const line = summary(id)
            return (
              <SelectableRow
                key={id}
                selected={isSelected}
                onSelect={() => setSelected(key)}
                title={t(`multilanguageEditor.sections.${id}.title`)}
                subtitle={line || undefined}
                trailing={<ChevronRight size={14} aria-hidden className="shrink-0 text-text-muted" />}
              />
            )
          })}
        </ul>
      </Card>

      {/* One component for the whole plugin, so whatever is selected on the left, the switcher is
          what it changes on the page - marked once something is selected, like on the other two. */}
      <SitePreview
        projectId={project.id}
        projectPath={project.path}
        stickyPrefix="multilanguage"
        hint={t('multilanguageEditor.previewHint')}
        highlight={
          entry && selected !== null
            ? (() => {
                const found = entrySelector(entry.plugin, [entry.plugin])
                return found && { ...found, name: t('multilanguageEditor.sections.switcher.title') }
              })()
            : null
        }
      />
    </DetailLayout>
  )
}

/** A text field that writes when it is left or Return is pressed, not on every key. */
function DraftInput({
  value,
  onCommit,
  ...rest
}: {
  value: string
  onCommit: (value: string) => void
  placeholder?: string
  'aria-invalid'?: boolean
  onDraft?: (value: string) => void
}): JSX.Element {
  const [draft, setDraft] = useState(value)
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setDraft(value)
  }, [value])
  const { onDraft, ...inputProps } = rest
  return (
    <TextInput
      {...inputProps}
      value={draft}
      onFocus={() => {
        focused.current = true
      }}
      onChange={(e) => {
        setDraft(e.target.value)
        onDraft?.(e.target.value)
      }}
      onBlur={() => {
        focused.current = false
        if (draft !== value) onCommit(draft)
      }}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

function AddLanguageForm({
  languages,
  onAdd,
  onCancel
}: {
  languages: LanguageEntry[]
  onAdd: (code: string) => void
  onCancel: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [tried, setTried] = useState(false)
  const problem = codeProblem(code, languages)
  return (
    <form
      className="flex flex-col gap-2 rounded-md border border-ink/10 p-3 dark:border-ink/10"
      onSubmit={(e) => {
        e.preventDefault()
        setTried(true)
        if (!problem) onAdd(code)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
      }}
    >
      <Field label={t('multilanguageEditor.code')} hint={t('multilanguageEditor.addHint')}>
        <TextInput data-autofocus autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="fr" aria-invalid={tried && !!problem} />
      </Field>
      {tried && problem && <p className="text-micro text-red-600 dark:text-red-400">{t(`multilanguageEditor.codeProblem.${problem}`)}</p>}
      <div className="flex gap-2">
        <Button type="submit">{t('multilanguageEditor.addSubmit')}</Button>
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}

// The fields of one language, in the order the plugin's schema gives them; `home` and `flag` are
// advanced there and fold away here.
const LANGUAGE_FIELDS = ['label', 'native', 'locale'] as const
const LANGUAGE_ADVANCED = ['home', 'flag'] as const

function LanguagePanel({
  language,
  name,
  languages,
  position,
  isDefault,
  published,
  onlyPublished,
  saved,
  schema,
  lang,
  onChange,
  onRename,
  onMakeDefault,
  onPublish,
  onMove
}: {
  language: LanguageEntry
  name: string
  languages: LanguageEntry[]
  position: number
  isDefault: boolean
  published: boolean
  onlyPublished: boolean
  saved: boolean
  schema: NormalizedOptionSchema | null
  lang: FormLanguage
  onChange: (next: LanguageEntry) => void
  onRename: (to: string) => void
  onMakeDefault: () => void
  onPublish: (on: boolean) => void
  onMove: (by: -1 | 1) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [codeDraft, setCodeDraft] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useStickyState('multilanguage.advancedOpen', false)
  const problem = codeDraft === null ? null : codeProblem(codeDraft, languages, language.code)

  // The schema's own words for each field of a language: the object variant of `languages`' items.
  const itemFields: OptionField[] = (() => {
    const node = schema?.fields.find((f) => f.key === 'languages')?.node
    if (node?.kind !== 'array') return []
    const items = node.items
    const object = items.kind === 'object' ? items : items.kind === 'union' ? items.variants.find((v) => v.kind === 'object') : undefined
    return object?.kind === 'object' ? object.fields : []
  })()
  const hintOf = (key: string): string | undefined => {
    const f = itemFields.find((x) => x.key === key)
    return f ? fieldText(f, lang).description : undefined
  }

  const setKey = (key: string, value: string): void => {
    const next: LanguageEntry = { ...language }
    if (value.trim()) next[key] = value.trim()
    else delete next[key]
    onChange(next)
  }
  const textField = (key: string): JSX.Element => (
    <Field key={key} label={t(`multilanguageEditor.fields.${key}`)} hint={hintOf(key)}>
      <DraftInput value={typeof language[key] === 'string' ? (language[key] as string) : ''} onCommit={(v) => setKey(key, v)} />
    </Field>
  )

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardHeading icon={Languages}>
          <span className="break-words">{name}</span>
        </CardHeading>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-micro text-text-secondary">{t('multilanguageEditor.positionOf', { n: position + 1, count: languages.length })}</span>
          <SavesImmediately saved={saved} />
        </div>
      </div>

      <Field label={t('multilanguageEditor.code')} hint={t('multilanguageEditor.codeHint')}>
        <DraftInput
          value={language.code}
          aria-invalid={!!problem}
          onDraft={(v) => setCodeDraft(v)}
          onCommit={(v) => {
            const to = normalizeCode(v)
            if (codeProblem(v, languages, language.code) || to === language.code) {
              setCodeDraft(null)
              return
            }
            setCodeDraft(null)
            onRename(to)
          }}
        />
      </Field>
      {problem && <p className="-mt-2 text-micro text-red-600 dark:text-red-400">{t(`multilanguageEditor.codeProblem.${problem}`)}</p>}

      {LANGUAGE_FIELDS.map(textField)}

      <div className="flex flex-col gap-3 border-t border-ink/[0.06] pt-3 dark:border-ink/10">
        <Toggle
          label={t('multilanguageEditor.isDefault')}
          hint={isDefault ? t('multilanguageEditor.isDefaultHintOn') : t('multilanguageEditor.isDefaultHint')}
          checked={isDefault}
          disabled={isDefault}
          onChange={(on) => on && onMakeDefault()}
        />
        <Toggle
          label={t('multilanguageEditor.publish')}
          hint={onlyPublished ? t('multilanguageEditor.publishOnlyHint') : t('multilanguageEditor.publishHint')}
          checked={published}
          disabled={onlyPublished}
          onChange={onPublish}
        />
      </div>

      <PanelSection icon={ArrowUpDown} title={t('multilanguageEditor.order')} className="gap-1.5">
        <p className="text-micro text-text-muted">{t('multilanguageEditor.orderHint')}</p>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={position === 0} onClick={() => onMove(-1)}>
            <ArrowUp size={14} aria-hidden />
            {t('layoutEditor.inspector.earlier')}
          </Button>
          <Button variant="ghost" disabled={position === languages.length - 1} onClick={() => onMove(1)}>
            <ArrowDown size={14} aria-hidden />
            {t('layoutEditor.inspector.later')}
          </Button>
        </div>
      </PanelSection>

      <FoldBox title={t('multilanguageEditor.advanced')} open={advancedOpen} onToggle={() => setAdvancedOpen(!advancedOpen)}>
        {LANGUAGE_ADVANCED.map(textField)}
      </FoldBox>
    </Card>
  )
}

function SectionPanel({
  id,
  values,
  schema,
  schemaState,
  saved,
  languages,
  placement,
  onOptions,
  onOpenOnStage
}: {
  id: SectionId
  values: Options
  schema: NormalizedOptionSchema | null
  /** 'loading', an error text, or null once the schema is there. */
  schemaState: string | null
  saved: boolean
  languages: string[]
  placement: ReturnType<typeof getLayout>
  onOptions: (next: Options | undefined) => void
  onOpenOnStage: () => void
}): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const pick = useCallback((key: string) => sectionPick(id)(key) && !LANGUAGE_KEYS.includes(key), [id])

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardHeading icon={SlidersHorizontal}>{t(`multilanguageEditor.sections.${id}.title`)}</CardHeading>
        <p className="text-micro text-text-secondary">{t(`multilanguageEditor.sections.${id}.text`)}</p>
        <div className="flex flex-wrap items-center gap-2">
          <SavesImmediately saved={saved} />
        </div>
      </div>

      {id === 'switcher' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-micro text-text-secondary">
            {placement ? t('multilanguageEditor.switcherAt', { position: t(`positions.${placement.position}`, placement.position) }) : t('multilanguageEditor.switcherNotPlaced')}
          </span>
          <Button variant="ghost" onClick={onOpenOnStage}>
            {t('pluginsInstalled.showOnStage')}
          </Button>
        </div>
      )}

      {schemaState === 'loading' ? (
        <p className="text-micro text-text-muted">{t('layoutEditor.inspector.optionsLoading')}</p>
      ) : schemaState ? (
        <p className="text-micro text-red-600 dark:text-red-400">{t('layoutEditor.inspector.optionsError', { reason: schemaState })}</p>
      ) : (
        <PluginOptionsForm
          schema={schema}
          values={values}
          onChange={onOptions}
          explicitEmpty
          languages={languages}
          projectPath={project.path}
          pick={pick}
          freeKeys={id === 'other'}
        />
      )}
    </Card>
  )
}
