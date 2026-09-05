import { useTranslation } from 'react-i18next'
import type { LayoutPosition, PageTypeLayoutOverride, QuartzConfig } from '@shared/ipc-contract'
import { Card, Select, Toggle } from '../../components/ui'
import { POSITIONS, distinctComponentChips, duplicateNameCounts, hasPageTypeOverride } from './utils'

const KNOWN_TEMPLATES = ['default', 'full-width', 'minimal']

export default function PageTypeOverrides({
  config,
  pageType,
  onChange,
  customTemplates = [],
  builtinFrameName
}: {
  config: QuartzConfig
  pageType: string
  onChange: (next: QuartzConfig) => void
  customTemplates?: string[]
  // The frame this page type's own pageType plugin defaults to when no `template` override is set
  // (e.g. "canvas" for canvas-page) - see LayoutEditor/index.tsx's builtinPageTypeFrames. Not
  // necessarily in KNOWN_TEMPLATES or customTemplates, so it needs its own dropdown entry.
  builtinFrameName?: string
}): JSX.Element {
  const { t } = useTranslation()
  const override: PageTypeLayoutOverride = config.layout?.byPageType?.[pageType] ?? {}
  const nameCounts = duplicateNameCounts(config.plugins)

  // Undoing every individual customization for this page type one at a time (last excluded
  // component re-included, last cleared slot un-cleared, template reset) must leave no trace - an
  // empty `{}` (or `{ exclude: [], positions: {} }`) sitting under byPageType is functionally a
  // no-op but would still flag the page type as "customized" (see index.tsx's hasPageTypeOverride
  // filter) and get written to quartz.config.yaml on save.
  function update(patch: Partial<PageTypeLayoutOverride>): void {
    const merged = { ...override, ...patch }
    const byPageType = { ...(config.layout?.byPageType ?? {}) }
    if (hasPageTypeOverride(merged)) byPageType[pageType] = merged
    else delete byPageType[pageType]
    onChange({ ...config, layout: { ...config.layout, byPageType } })
  }

  function toggleExclude(name: string, excluded: boolean): void {
    const exclude = new Set(override.exclude ?? [])
    if (excluded) exclude.add(name)
    else exclude.delete(name)
    update({ exclude: [...exclude] })
  }

  function toggleClearSlot(position: LayoutPosition, cleared: boolean): void {
    const positions = { ...(override.positions ?? {}) }
    if (cleared) positions[position] = []
    else delete positions[position]
    update({ positions })
  }

  // Quartz resolves the actual frame as `override.template ?? pageType.frame ?? "default"` (see
  // dispatcher.ts) - so when this page type's own plugin declares a default frame (e.g. "canvas"
  // for canvas-page), leaving `template` unset does NOT mean the literal 3-column default, it means
  // that plugin's frame. The dropdown's "no override" slot has to represent *that* frame, not
  // "default" - and forcing the literal default now needs its own explicit entry, since selecting
  // it must write `template: "default"` (a real string), not merely clear the override.
  const hasBuiltinDefault = builtinFrameName != null && builtinFrameName !== 'default'
  const noOverrideValue = hasBuiltinDefault ? builtinFrameName! : 'default'
  // There's no free-text entry any more (removed per feedback - every reachable frame is now
  // discovered: built-ins, authored frames, plugin defaults), but an already-saved value from
  // before that removal, or from a since-deleted authored frame, must still show as *something*
  // selected rather than the Select silently falling back to its first option - hence this extra
  // option rather than dropping the value on the floor.
  const isUnknownTemplate =
    override.template != null &&
    !KNOWN_TEMPLATES.includes(override.template) &&
    !customTemplates.includes(override.template) &&
    override.template !== builtinFrameName

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h3 className="mb-1 text-sm font-semibold">{t('layoutEditor.template')}</h3>
        <div className="flex items-center gap-2">
          <Select
            value={override.template ?? noOverrideValue}
            onChange={(e) => update({ template: e.target.value === noOverrideValue ? undefined : e.target.value })}
            className="w-48"
          >
            {hasBuiltinDefault && <option value={builtinFrameName}>{t('layoutEditor.templatePluginDefault', { frame: builtinFrameName })}</option>}
            <option value="default">{t('layoutEditor.templateDefault')}</option>
            <option value="full-width">{t('layoutEditor.templateFullWidth')}</option>
            <option value="minimal">{t('layoutEditor.templateMinimal')}</option>
            {customTemplates.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            {isUnknownTemplate && <option value={override.template}>{override.template}</option>}
          </Select>
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 text-sm font-semibold">{t('layoutEditor.excludeHeading')}</h3>
        <p className="mb-3 text-xs text-text-muted">{t('layoutEditor.excludeDescription')}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {distinctComponentChips(config.plugins).map(({ plugin }) => {
            const excluded = (override.exclude ?? []).includes(plugin.name)
            const count = nameCounts.get(plugin.name) ?? 0
            return (
              <div key={plugin.name} className="flex flex-col gap-0.5">
                <Toggle label={plugin.name} checked={!excluded} onChange={(checked) => toggleExclude(plugin.name, !checked)} />
                {count > 1 && (
                  <p className="pl-[46px] text-micro text-amber-600 dark:text-amber-400">
                    {t('layoutEditor.excludeDuplicateHint', { count, name: plugin.name })}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 text-sm font-semibold">{t('layoutEditor.clearSlotsHeading')}</h3>
        <p className="mb-3 text-xs text-text-muted">{t('layoutEditor.clearSlotsDescription')}</p>
        <div className="grid grid-cols-3 gap-2">
          {POSITIONS.map((position) => (
            <Toggle
              key={position}
              label={t(`positions.${position}`)}
              checked={(override.positions?.[position]?.length ?? -1) === 0}
              onChange={(checked) => toggleClearSlot(position, checked)}
            />
          ))}
        </div>
      </Card>
    </div>
  )
}
