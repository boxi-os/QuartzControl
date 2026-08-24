import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LayoutPosition, PageTypeLayoutOverride, QuartzConfig } from '@shared/ipc-contract'
import { Card, Select, TextInput, Toggle } from '../../components/ui'
import { POSITIONS, distinctComponentChips, duplicateNameCounts } from './utils'

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
  const [customTemplate, setCustomTemplate] = useState(false)
  const nameCounts = duplicateNameCounts(config.plugins)

  function update(patch: Partial<PageTypeLayoutOverride>): void {
    const byPageType = { ...(config.layout?.byPageType ?? {}), [pageType]: { ...override, ...patch } }
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
  const isCustomTemplate =
    override.template != null &&
    !KNOWN_TEMPLATES.includes(override.template) &&
    !customTemplates.includes(override.template) &&
    override.template !== builtinFrameName
  const showCustomInput = customTemplate || isCustomTemplate

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h3 className="mb-1 text-sm font-semibold">{t('layoutEditor.template')}</h3>
        <div className="flex items-center gap-2">
          <Select
            value={showCustomInput ? 'custom' : (override.template ?? noOverrideValue)}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setCustomTemplate(true)
                return
              }
              setCustomTemplate(false)
              update({ template: e.target.value === noOverrideValue ? undefined : e.target.value })
            }}
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
            <option value="custom">{t('layoutEditor.templateCustom')}</option>
          </Select>
          {showCustomInput && (
            <TextInput
              value={isCustomTemplate ? (override.template ?? '') : ''}
              onChange={(e) => update({ template: e.target.value || undefined })}
              placeholder={t('layoutEditor.templateCustomPlaceholder')}
              className="w-48"
            />
          )}
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 text-sm font-semibold">{t('layoutEditor.excludeHeading')}</h3>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('layoutEditor.excludeDescription')}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {distinctComponentChips(config.plugins).map(({ plugin }) => {
            const excluded = (override.exclude ?? []).includes(plugin.name)
            const count = nameCounts.get(plugin.name) ?? 0
            return (
              <div key={plugin.name} className="flex flex-col gap-0.5">
                <Toggle label={plugin.name} checked={!excluded} onChange={(checked) => toggleExclude(plugin.name, !checked)} />
                {count > 1 && (
                  <p className="pl-[46px] text-[11px] text-amber-600 dark:text-amber-400">
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
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('layoutEditor.clearSlotsDescription')}</p>
        <div className="grid grid-cols-3 gap-2">
          {POSITIONS.map((position) => (
            <Toggle
              key={position}
              label={t(`layoutEditor.positions.${position}`)}
              checked={(override.positions?.[position]?.length ?? -1) === 0}
              onChange={(checked) => toggleClearSlot(position, checked)}
            />
          ))}
        </div>
      </Card>
    </div>
  )
}
