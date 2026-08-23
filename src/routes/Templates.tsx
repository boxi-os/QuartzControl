import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProject } from './ProjectLayout'
import type { Project, TemplatePackageCategory, TemplatePackagePreview } from '@shared/ipc-contract'
import { Button, Card, Field, TextInput } from '../components/ui'

const CATEGORIES: TemplatePackageCategory[] = ['layout', 'colors', 'plugins', 'frames', 'styles', 'fonts']

export default function Templates(): JSX.Element {
  const { t } = useTranslation()
  const project = useProject()
  const [name, setName] = useState(`${project.name}-template`)
  const [destDir, setDestDir] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<TemplatePackageCategory>>(new Set(CATEGORIES))
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  function toggleCategory(category: TemplatePackageCategory): void {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  async function pickDestDir(): Promise<void> {
    const picked = await window.quartzGui.dialog.pickFolder()
    if (picked) setDestDir(picked)
  }

  async function runExport(): Promise<void> {
    if (!destDir || selected.size === 0 || !name.trim()) return
    setExporting(true)
    setResult(null)
    try {
      const { packageDir } = await window.quartzGui.templatePackage.export(project.path, destDir, name.trim(), Array.from(selected))
      setResult({ success: true, message: t('templates.exportSuccess', { path: packageDir }) })
    } catch (err) {
      setResult({ success: false, message: String(err) })
    }
    setExporting(false)
  }

  const canExport = !!destDir && selected.size > 0 && !!name.trim()

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold">{t('templates.title')}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('templates.description')}</p>
      </div>

      <Card>
        <h2 className="mb-2 text-sm font-semibold">{t('templates.exportHeading')}</h2>

        <Field label={t('templates.nameLabel')}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} className="w-72" />
        </Field>

        <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('templates.categoriesHeading')}</p>
        <div className="flex flex-col gap-1.5">
          {CATEGORIES.map((category) => (
            <label key={category} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.has(category)} onChange={() => toggleCategory(category)} />
              <span>{t(`templates.categories.${category}`)}</span>
            </label>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button variant="ghost" onClick={pickDestDir}>
            {t('templates.pickDestDir')}
          </Button>
          {destDir && <span className="truncate text-xs text-slate-500 dark:text-slate-400">{destDir}</span>}
        </div>

        <div className="mt-4">
          <Button onClick={runExport} disabled={!canExport || exporting}>
            {exporting ? t('common.saving') : t('templates.exportButton')}
          </Button>
        </div>

        {result && (
          <p
            className={`mt-3 text-xs ${result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {result.message}
          </p>
        )}
      </Card>

      <ImportSection project={project} />
    </div>
  )
}

function ImportSection({ project }: { project: Project }): JSX.Element {
  const { t } = useTranslation()
  const [sourceDir, setSourceDir] = useState<string | null>(null)
  const [preview, setPreview] = useState<TemplatePackagePreview | null>(null)
  const [previewError, setPreviewError] = useState(false)
  const [selected, setSelected] = useState<Set<TemplatePackageCategory>>(new Set())
  const [importing, setImporting] = useState(false)
  const [warnings, setWarnings] = useState<string[] | null>(null)

  async function pickSourceDir(): Promise<void> {
    const picked = await window.quartzGui.dialog.pickFolder()
    if (!picked) return
    setSourceDir(picked)
    setWarnings(null)
    const result = await window.quartzGui.templatePackage.preview(picked)
    setPreview(result)
    setPreviewError(!result)
    setSelected(new Set(result?.manifest.categories ?? []))
  }

  function toggleCategory(category: TemplatePackageCategory): void {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  async function runImport(): Promise<void> {
    if (!sourceDir || selected.size === 0) return
    if (!confirm(t('templates.confirmImport', { count: selected.size }))) return
    setImporting(true)
    setWarnings(null)
    try {
      const result = await window.quartzGui.templatePackage.import(project.path, sourceDir, Array.from(selected))
      setWarnings(result.warnings.length > 0 ? result.warnings : [t('templates.importSuccessNoWarnings')])
    } catch (err) {
      setWarnings([String(err)])
    }
    setImporting(false)
  }

  const canImport = !!preview && selected.size > 0

  return (
    <Card>
      <h2 className="mb-2 text-sm font-semibold">{t('templates.importHeading')}</h2>

      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={pickSourceDir}>
          {t('templates.pickSourceDir')}
        </Button>
        {sourceDir && <span className="truncate text-xs text-slate-500 dark:text-slate-400">{sourceDir}</span>}
      </div>

      {previewError && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{t('templates.previewError')}</p>}

      {preview && (
        <>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {t('templates.previewHeading', { name: preview.manifest.name })}
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            {CATEGORIES.map((category) => {
              const available = preview.manifest.categories.includes(category)
              return (
                <label key={category} className={`flex items-center gap-2 text-sm ${available ? '' : 'text-slate-400 dark:text-slate-600'}`}>
                  <input
                    type="checkbox"
                    disabled={!available}
                    checked={selected.has(category)}
                    onChange={() => toggleCategory(category)}
                  />
                  <span>{t(`templates.categories.${category}`)}</span>
                </label>
              )
            })}
          </div>

          <div className="mt-4">
            <Button onClick={runImport} disabled={!canImport || importing}>
              {importing ? t('common.saving') : t('templates.importButton')}
            </Button>
          </div>
        </>
      )}

      {warnings && (
        <ul className="mt-3 flex flex-col gap-1 text-xs text-amber-700 dark:text-amber-400">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
    </Card>
  )
}
