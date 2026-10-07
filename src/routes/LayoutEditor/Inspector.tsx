import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, SlidersHorizontal } from 'lucide-react'
import type { LayoutPosition, PluginEntry, PluginLayoutDeclaration } from '@shared/ipc-contract'
import { Button, Card, CardHeading, Field, FieldGroup, Select, TextInput, Toggle } from '../../components/ui'
import { announce } from '../../state/announcer'
import { conditionLabel } from './ComponentChip'
import ComponentOptions from './ComponentOptions'
import {
  BUILTIN_CONDITIONS,
  GROUP_OPTION_DEFAULTS,
  POSITIONS,
  duplicateAfter,
  getLayout,
  placeComponent,
  withCondition,
  withDisplay,
  withEnabled,
  withGroup,
  withGroupOption,
  withOptions
} from './utils'

type Align = NonNullable<NonNullable<PluginLayoutDeclaration['groupOptions']>['align']>

/**
 * The side panel of the layout board: everything about the selected component's place on the
 * page, and below that its own options (ComponentOptions). It writes into the page's config draft
 * like a drop does; the header's Save writes the file.
 *
 * It is also the keyboard's way to do what the board does by dragging - a position select and
 * earlier/later answer every direction a drag can go, and "In den Vorrat legen" is the drop on the
 * tray. The board itself has no arrow pair (conventions.md, "Kein natives HTML5-Drag").
 *
 * Keyed by the component at the call site, so the local "Eigene…" state belongs to one component
 * and does not carry over to the next one selected.
 */
export default function Inspector({
  projectPath,
  languages,
  plugins,
  index,
  positions,
  parked,
  groupNames,
  isDuplicate,
  rank,
  pageType,
  onChange
}: {
  projectPath: string
  /** The site's language codes, for an option keyed by language (PluginOptionsForm). */
  languages: string[]
  plugins: PluginEntry[]
  index: number
  positions: Record<LayoutPosition, number[]>
  parked: boolean
  groupNames: string[]
  isDuplicate: boolean
  rank: number
  /** Set while the stage shows one page type: whether that type hides this component (its
   *  `exclude`, pageTypeOverride.ts). The only field here that is about one page type - every other
   *  one changes the component on all pages. */
  pageType?: { label: string; excluded: boolean; instances: number; onChange: (excluded: boolean) => void }
  /** The new plugin list, and which entry the panel shows afterwards (null: none). */
  onChange: (next: PluginEntry[], select?: number | null) => void
}): JSX.Element {
  const { t } = useTranslation()
  const plugin = plugins[index]
  const layout = getLayout(plugin)!
  const name = isDuplicate ? `${plugin.name} #${rank}` : plugin.name
  const list = positions[layout.position]
  const place = list.indexOf(index)
  const condition = layout.condition ?? ''
  const builtinCondition = (BUILTIN_CONDITIONS as readonly string[]).includes(condition)
  // "Eigene…" picked with nothing typed yet: there is no value to write for that, and without this
  // the select would jump straight back to "Immer".
  const [customCondition, setCustomCondition] = useState(condition !== '' && !builtinCondition)
  // Button does not forward a ref, so the two arrows are found through their row.
  const orderRow = useRef<HTMLDivElement>(null)
  const focusOrderButton = (which: 0 | 1): void => orderRow.current?.querySelectorAll('button')[which]?.focus()
  const positionName = (position: LayoutPosition): string => t(`positions.${position}`, position)

  function move(delta: -1 | 1): void {
    const target = place + delta
    if (place === -1 || target < 0 || target >= list.length) return
    onChange(placeComponent(plugins, positions, index, layout.position, target))
    announce(t('layoutEditor.inspector.moved', { name, n: target + 1, count: list.length, position: positionName(layout.position) }))
    // The button just pressed is disabled at the end of the list, and a disabled button drops the
    // focus to <body> - one press too many and the keyboard user is back at the top of the page.
    if (target === 0) focusOrderButton(1)
    if (target === list.length - 1) focusOrderButton(0)
  }

  function setPosition(position: LayoutPosition): void {
    if (position === layout.position) return
    onChange(placeComponent(plugins, positions, index, position))
    const count = positions[position].length + (parked ? 0 : 1)
    announce(t('layoutEditor.inspector.moved', { name, n: count, count, position: positionName(position) }))
  }

  function enable(): void {
    const on = withEnabled(plugins, index, true)
    // A parked entry is in no list on the board, so it joins its position at the end - the same
    // place a drag would put it without aiming.
    onChange(parked ? placeComponent(on, positions, index, layout.position) : on)
    announce(t('layoutEditor.inspector.enabledAnnounce', { name, position: positionName(layout.position) }))
  }

  function park(): void {
    onChange(withEnabled(plugins, index, false))
    announce(t('dnd.disabled', { name }))
  }

  return (
    <Card className="flex flex-col gap-4">
      <CardHeading icon={SlidersHorizontal}>
        <span className="truncate">{name}</span>
      </CardHeading>

      {!plugin.enabled && (
        <div className="flex flex-col items-start gap-2 rounded-md bg-ink/[0.04] p-2.5 text-ui text-text-secondary dark:bg-ink/10">
          <p>{t(parked ? 'layoutEditor.inspector.parked' : 'layoutEditor.inspector.disabled')}</p>
          <Button variant="ghost" onClick={enable}>
            {t('layoutEditor.inspector.enable')}
          </Button>
        </div>
      )}

      {pageType && (
        <div className="flex flex-col gap-1 rounded-md border border-ink/[0.06] p-2.5 dark:border-ink/10">
          <Toggle
            label={t('layoutEditor.pageType.hideOnType', { type: pageType.label })}
            checked={pageType.excluded}
            onChange={(hidden) => {
              pageType.onChange(hidden)
              announce(
                t(hidden ? 'layoutEditor.pageType.hiddenAnnounce' : 'layoutEditor.pageType.shownAnnounce', {
                  name: plugin.name,
                  type: pageType.label
                })
              )
            }}
          />
          {/* Quartz excludes by name, so the switch reaches every instance - said here, where the
              one instance in the panel would otherwise look like the only one affected. */}
          {pageType.instances > 1 && (
            <p className="text-micro text-amber-600 dark:text-amber-400">
              {t('layoutEditor.excludeDuplicateHint', { count: pageType.instances, name: plugin.name })}
            </p>
          )}
        </div>
      )}

      <Field label={t('layoutEditor.inspector.position')}>
        <Select value={layout.position} onChange={(e) => setPosition(e.target.value as LayoutPosition)}>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {positionName(p)}
            </option>
          ))}
        </Select>
      </Field>

      {place !== -1 && (
        <FieldGroup label={t('layoutEditor.inspector.order')}>
          <div ref={orderRow} className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => move(-1)} disabled={place === 0}>
              <ArrowUp size={14} aria-hidden />
              {t('layoutEditor.inspector.earlier')}
            </Button>
            <Button variant="ghost" onClick={() => move(1)} disabled={place === list.length - 1}>
              <ArrowDown size={14} aria-hidden />
              {t('layoutEditor.inspector.later')}
            </Button>
            <span className="text-micro text-text-muted">{t('layoutEditor.inspector.orderOf', { n: place + 1, count: list.length })}</span>
          </div>
        </FieldGroup>
      )}

      <Field label={t('layoutEditor.displayLabel')} hint={t('layoutEditor.inspector.displayHint')}>
        <Select
          value={layout.display ?? 'all'}
          onChange={(e) => onChange(withDisplay(plugins, index, e.target.value as PluginLayoutDeclaration['display']))}
        >
          <option value="all">{t('layoutEditor.displayAll')}</option>
          <option value="desktop-only">{t('layoutEditor.displayDesktopOnly')}</option>
          <option value="mobile-only">{t('layoutEditor.displayMobileOnly')}</option>
        </Select>
      </Field>

      <Field label={t('layoutEditor.inspector.condition')}>
        <Select
          value={customCondition ? '__custom' : condition}
          onChange={(e) => {
            if (e.target.value === '__custom') {
              setCustomCondition(true)
              return
            }
            setCustomCondition(false)
            onChange(withCondition(plugins, index, e.target.value))
          }}
        >
          <option value="">{t('layoutEditor.inspector.conditionAlways')}</option>
          {BUILTIN_CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {conditionLabel(t, c)}
            </option>
          ))}
          <option value="__custom">{t('layoutEditor.inspector.conditionCustom')}</option>
        </Select>
      </Field>
      {customCondition && (
        <Field label={t('layoutEditor.inspector.conditionCustomLabel')} hint={t('layoutEditor.inspector.conditionCustomHint')}>
          <TextInput
            value={builtinCondition ? '' : condition}
            onChange={(e) => onChange(withCondition(plugins, index, e.target.value))}
            spellCheck={false}
          />
        </Field>
      )}

      <Field label={t('layoutEditor.groupLabel')}>
        <Select value={layout.group ?? ''} onChange={(e) => onChange(withGroup(plugins, index, e.target.value))}>
          <option value="">{t('layoutEditor.noGroup')}</option>
          {groupNames.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
      </Field>

      {layout.group && (
        // What Quartz's Flex reads per member (quartz/components/Flex.tsx). `justify` is left out on
        // purpose: Flex writes it as `justify-self`, which a flex item ignores, and `between` and
        // `around` are not values of that property at all - a field for it would change nothing on
        // the page. A value already in the file stays there untouched.
        <FieldGroup
          label={t('layoutEditor.inspector.groupOptions')}
          className="gap-3 rounded-md border border-ink/[0.06] p-2.5 dark:border-ink/10"
        >
          <Toggle
            label={t('layoutEditor.inspector.grow')}
            checked={layout.groupOptions?.grow ?? GROUP_OPTION_DEFAULTS.grow}
            onChange={(v) => onChange(withGroupOption(plugins, index, 'grow', v))}
          />
          <Toggle
            label={t('layoutEditor.inspector.shrink')}
            checked={layout.groupOptions?.shrink ?? GROUP_OPTION_DEFAULTS.shrink}
            onChange={(v) => onChange(withGroupOption(plugins, index, 'shrink', v))}
          />
          <Field label={t('layoutEditor.inspector.basis')} hint={t('layoutEditor.inspector.basisHint')}>
            <TextInput
              value={layout.groupOptions?.basis ?? ''}
              placeholder={GROUP_OPTION_DEFAULTS.basis}
              spellCheck={false}
              onChange={(e) => onChange(withGroupOption(plugins, index, 'basis', e.target.value.trim()))}
            />
          </Field>
          <Field label={t('layoutEditor.inspector.itemOrder')} hint={t('layoutEditor.inspector.itemOrderHint')}>
            <TextInput
              type="number"
              step={1}
              value={layout.groupOptions?.order ?? ''}
              placeholder={String(GROUP_OPTION_DEFAULTS.order)}
              onChange={(e) => {
                const raw = e.target.value.trim()
                if (raw === '') return onChange(withGroupOption(plugins, index, 'order', undefined))
                const n = Number(raw)
                if (Number.isInteger(n)) onChange(withGroupOption(plugins, index, 'order', n))
              }}
            />
          </Field>
          <Field label={t('layoutEditor.inspector.align')}>
            <Select
              value={layout.groupOptions?.align ?? GROUP_OPTION_DEFAULTS.align}
              onChange={(e) => onChange(withGroupOption(plugins, index, 'align', e.target.value as Align))}
            >
              <option value="start">{t('layoutEditor.inspector.alignStart')}</option>
              <option value="center">{t('layoutEditor.inspector.alignCenter')}</option>
              <option value="end">{t('layoutEditor.inspector.alignEnd')}</option>
              <option value="stretch">{t('layoutEditor.inspector.alignStretch')}</option>
            </Select>
          </Field>
        </FieldGroup>
      )}

      <FieldGroup label={t('layoutEditor.inspector.actions')}>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              const result = duplicateAfter(plugins, index)
              if (result) onChange(result.plugins, result.newIndex)
            }}
          >
            {t('layoutEditor.componentPill.duplicate')}
          </Button>
          {isDuplicate ? (
            <Button
              variant="danger"
              onClick={() => {
                onChange(
                  plugins.filter((_, i) => i !== index),
                  null
                )
                announce(t('dnd.removed', { name: plugin.name }))
              }}
            >
              {t('layoutEditor.componentPill.removeDuplicate')}
            </Button>
          ) : (
            plugin.enabled && (
              <Button variant="ghost" onClick={park}>
                {t('layoutEditor.inspector.park')}
              </Button>
            )
          )}
        </div>
        {!isDuplicate && plugin.enabled && <span className="text-micro text-text-muted">{t('layoutEditor.inspector.parkHint')}</span>}
      </FieldGroup>

      {/* Last, because it is the long part: a component like navigations has dozens of options,
          and the fields above are what the stage itself is about. */}
      <div className="border-t border-ink/10 pt-4 dark:border-ink/10">
        <ComponentOptions
          projectPath={projectPath}
          plugin={plugin}
          languages={languages}
          onChange={(options) => onChange(withOptions(plugins, index, options))}
        />
      </div>
    </Card>
  )
}
