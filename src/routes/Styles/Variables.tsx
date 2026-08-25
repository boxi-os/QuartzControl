import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CssVariableOverride } from '@shared/ipc-contract'
import { Button, TextInput } from '../../components/ui'
import { CSS_VARIABLES, defaultValueFor, type CssVariableDef } from '../../data/cssVariables'
import { useStyles } from './index'

// The only place CSS custom properties are *edited*. Until this consolidation the same catalog was
// rendered twice - as an override editor under "Konfiguration -> Theme" and as an insert palette
// next to custom.scss - each with its own build-output scan and its own idea of which extra keys
// existed. Now the catalog is edited here, referenced (read-only, for insertion) on the "Eigenes
// CSS" tab, and the discovered-key list is shared through the Styles context.
//
// Overrides are written into a marker-delimited managed block in custom.scss, so saving here
// rewrites that file - hence the reloadScss() afterwards, which keeps the CSS tab's draft in sync.
export default function Variables(): JSX.Element {
  const { t } = useTranslation()
  const { project, config, overrides, setOverrides, discoveredKeys, addDiscoveredKeys, registerSave, reloadScss } =
    useStyles()
  const colors = (config.theme.colors as { lightMode?: Record<string, string>; darkMode?: Record<string, string> }) ?? {}
  const typography = config.theme.typography as Record<string, string> | undefined

  const [scanning, setScanning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() =>
    registerSave(async () => {
      const list: CssVariableOverride[] = Object.entries(overrides).map(([key, v]) => ({
        key,
        light: v.light,
        dark: v.dark
      }))
      await window.quartzGui.styles.saveVariableOverrides(project.path, list)
      await reloadScss()
    })
  )

  const knownKeys = new Set(CSS_VARIABLES.map((v) => v.key))
  // Anything already overridden but not in the curated catalog is an extra key too - otherwise a
  // variable the user overrode in an earlier session would vanish from the editor after a reload.
  const extraKeys = Array.from(new Set([...discoveredKeys, ...Object.keys(overrides).filter((k) => !knownKeys.has(k))]))

  const allDefs: CssVariableDef[] = [
    ...CSS_VARIABLES,
    ...extraKeys.map((key) => ({ key, group: t('themeEditor.cssVars.discoveredGroup'), kind: 'font' as const }))
  ]

  function toggle(def: CssVariableDef, enabled: boolean): void {
    setOverrides((prev) => {
      const next = { ...prev }
      if (enabled) {
        next[def.key] = {
          light: defaultValueFor(def, colors, typography, 'light'),
          dark: defaultValueFor(def, colors, typography, 'dark')
        }
      } else {
        delete next[def.key]
      }
      return next
    })
  }

  function setValue(key: string, mode: 'light' | 'dark', value: string): void {
    setOverrides((prev) => ({ ...prev, [key]: { ...prev[key], [mode]: value } }))
  }

  async function scanBuildOutput(): Promise<void> {
    setScanning(true)
    setMessage(null)
    try {
      const found = await window.quartzGui.styles.scanBuildOutputVariables(project.path)
      const newOnes = found.filter((k) => !knownKeys.has(k) && !extraKeys.includes(k))
      setMessage(
        newOnes.length === 0
          ? t('themeEditor.cssVars.scanNoneFound')
          : t('themeEditor.cssVars.scanFound', { count: newOnes.length })
      )
      if (newOnes.length > 0) addDiscoveredKeys(newOnes)
    } catch (err) {
      setMessage(String(err))
    }
    setScanning(false)
  }

  const grouped = new Map<string, CssVariableDef[]>()
  for (const def of allDefs) {
    const list = grouped.get(def.group) ?? []
    list.push(def)
    grouped.set(def.group, list)
  }

  return (
    <div className="max-w-xl rounded-md border border-black/[0.06] p-3 dark:border-white/10">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t('themeEditor.cssVars.heading')}</h3>
        <Button variant="ghost" onClick={scanBuildOutput} disabled={scanning}>
          {scanning ? t('common.loading') : t('themeEditor.cssVars.scanButton')}
        </Button>
      </div>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('themeEditor.cssVars.description')}</p>
      {message && <p className="mb-3 text-xs text-slate-600 dark:text-slate-300">{message}</p>}
      <div className="flex flex-col gap-4">
        {Array.from(grouped.entries()).map(([group, defs]) => (
          <div key={group}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</p>
            <div className="flex flex-col gap-2">
              {defs.map((def) => {
                const active = def.key in overrides
                const value = overrides[def.key]
                return (
                  <div key={def.key} className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={active} onChange={(e) => toggle(def, e.target.checked)} />
                      <code className="font-mono">--{def.key}</code>
                    </label>
                    {active && value && (
                      <div className="ml-[7px] flex flex-wrap items-center gap-3 border-l-2 border-black/[0.08] py-0.5 pl-3 dark:border-white/10">
                        <CssVarValueInput
                          kind={def.kind}
                          label={t('themeEditor.cssVars.light')}
                          value={value.light}
                          onChange={(v) => setValue(def.key, 'light', v)}
                        />
                        <CssVarValueInput
                          kind={def.kind}
                          label={t('themeEditor.cssVars.dark')}
                          value={value.dark}
                          onChange={(v) => setValue(def.key, 'dark', v)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CssVarValueInput({
  kind,
  label,
  value,
  onChange
}: {
  kind: CssVariableDef['kind']
  label: string
  value: string
  onChange: (value: string) => void
}): JSX.Element {
  const isValidHex = /^#([0-9a-f]{3}){1,2}$/i.test(value)
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-slate-500">{label}</span>
      {kind === 'color' && (
        <input
          type="color"
          value={isValidHex ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded border border-slate-300"
        />
      )}
      <TextInput value={value} onChange={(e) => onChange(e.target.value)} className="w-32" />
    </div>
  )
}
