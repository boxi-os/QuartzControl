import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LayoutPosition, PageTypeLayoutOverride, QuartzConfig } from '@shared/ipc-contract'
import { Card, Select, TextInput, Toggle } from '../../components/ui'
import { POSITIONS, componentItems } from './utils'

const KNOWN_TEMPLATES = ['default', 'full-width', 'minimal']

export default function PageTypeOverrides({
  config,
  pageType,
  onChange,
  customTemplates = []
}: {
  config: QuartzConfig
  pageType: string
  onChange: (next: QuartzConfig) => void
  customTemplates?: string[]
}): JSX.Element {
  const { t } = useTranslation()
  const override: PageTypeLayoutOverride = config.layout?.byPageType?.[pageType] ?? {}
  const [customTemplate, setCustomTemplate] = useState(false)

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

  const isCustomTemplate =
    override.template != null && !KNOWN_TEMPLATES.includes(override.template) && !customTemplates.includes(override.template)
  const showCustomInput = customTemplate || isCustomTemplate

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h3 className="mb-1 text-sm font-semibold">{t('layoutEditor.template')}</h3>
        <div className="flex items-center gap-2">
          <Select
            value={showCustomInput ? 'custom' : (override.template ?? 'default')}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setCustomTemplate(true)
                return
              }
              setCustomTemplate(false)
              update({ template: e.target.value === 'default' ? undefined : e.target.value })
            }}
            className="w-48"
          >
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
          {componentItems(config.plugins).map(({ plugin }) => {
            const excluded = (override.exclude ?? []).includes(plugin.name)
            return (
              <Toggle key={plugin.name} label={plugin.name} checked={!excluded} onChange={(checked) => toggleExclude(plugin.name, !checked)} />
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
