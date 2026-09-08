import { useTranslation } from 'react-i18next'
import type { LayoutPosition, PageTypeLayoutOverride, PluginEntry, QuartzConfig } from '@shared/ipc-contract'
import { quartzPluginName } from '@shared/quartzPluginName'
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

  // Every entry in this page type's `exclude` that names a plugin of this config in the app's
  // display spelling rather than the one quartz compares against (see shared/quartzPluginName.ts).
  // Those entries exclude nothing at all - the app wrote them before it knew the difference - so
  // they are dropped the next time this page type is written, not converted. Converting would hide
  // a component on the built site because of an app update, which nobody asked for; dropping only
  // takes a dead string out of the file, and the toggles below now say what the site shows.
  const deadExcludes = new Set(
    (override.exclude ?? []).filter((name) => config.plugins.some((p) => p.name === name && quartzPluginName(p.source) !== name))
  )

  // Undoing every individual customization for this page type one at a time (last excluded
  // component re-included, last cleared slot un-cleared, template reset) must leave no trace - an
  // empty `{}` (or `{ exclude: [], positions: {} }`) sitting under byPageType is functionally a
  // no-op but would still flag the page type as "customized" (see index.tsx's hasPageTypeOverride
  // filter) and get written to quartz.config.yaml on save.
  //
  // The dead entries are dropped here rather than in toggleExclude, because "the next time this
  // page type is written" has three doors, not one: a toggle, a cleared slot, the template picker.
  // Dropped in only one of them, a page type could be written with the dead strings still in it -
  // and an `exclude` with a length is what keeps a page type in the "customized" list, even when
  // it is the only thing left in there.
  function update(patch: Partial<PageTypeLayoutOverride>): void {
    const merged = { ...override, ...patch }
    if (merged.exclude?.some((name) => deadExcludes.has(name))) {
      const kept = merged.exclude.filter((name) => !deadExcludes.has(name))
      // Deleted rather than emptied when nothing is left: `hasPageTypeOverride` already ignores an
      // empty `exclude`, but a page type kept alive by something else would still carry the empty
      // key into quartz.config.yaml - the same trace this function exists to avoid.
      if (kept.length > 0) merged.exclude = kept
      else delete merged.exclude
    }
    const byPageType = { ...(config.layout?.byPageType ?? {}) }
    if (hasPageTypeOverride(merged)) byPageType[pageType] = merged
    else delete byPageType[pageType]
    onChange({ ...config, layout: { ...config.layout, byPageType } })
  }

  function toggleExclude(plugin: PluginEntry, excluded: boolean): void {
    const exclude = new Set(override.exclude ?? [])
    const name = quartzPluginName(plugin.source)
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
        {/* "Never excluded" and "excluded under a name that does nothing" render the same switch,
            so the difference is said where it is known. Without this the entry disappears at the
            next click on this page, and whoever set it never learns that it had stopped working. */}
        {deadExcludes.size > 0 && (
          <p className="mb-3 text-micro text-amber-600 dark:text-amber-400">
            {t('layoutEditor.excludeDeadHint', { count: deadExcludes.size, names: [...deadExcludes].join(', ') })}
          </p>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {distinctComponentChips(config.plugins).map(({ plugin }) => {
            // Read with quartz's name, not the app's: an entry in the old spelling excludes
            // nothing, so showing it as hidden would describe a page that shows it.
            const excluded = (override.exclude ?? []).includes(quartzPluginName(plugin.source))
            const count = nameCounts.get(plugin.name) ?? 0
            return (
              <div key={plugin.name} className="flex flex-col gap-0.5">
                <Toggle label={plugin.name} checked={!excluded} onChange={(checked) => toggleExclude(plugin, !checked)} />
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
