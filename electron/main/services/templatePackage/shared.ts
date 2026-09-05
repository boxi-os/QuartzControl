import { existsSync } from 'fs'
import { readFile, readdir } from 'fs/promises'
import { isAbsolute, join, relative, resolve } from 'path'
import type {
  TemplateConflictStrategy,
  TemplatePackageDependency,
  TemplatePartId,
  TemplatePartPlan
} from '@shared/ipc-contract'
import type { ZipEntry } from '../zipArchive'

export const MANIFEST_FILE = 'manifest.json'
export const FORMAT_VERSION = 1

export function partFile(id: TemplatePartId): string {
  return `parts/${id}.json`
}

/**
 * One slice of a Vorlagen-Paket, in the three phases it goes through: read the project (`collect`),
 * report what an import would do (`plan`), and do it (`apply`).
 *
 * Keeping the three together per part is what makes the feature extensible in the way the format
 * promises: a new part is one object added to the registry in `parts.ts`, not a new branch in
 * three long if-chains - which is exactly what the previous implementation had grown.
 */
export interface TemplatePart<Payload> {
  id: TemplatePartId
  /**
   * Everything this part contributes, or null when the project has nothing for it - a project with
   * no authored frames simply has no `frames` part rather than an empty one, so the import preview
   * never offers a checkbox that would do nothing.
   */
  collect(ctx: CollectContext): Promise<{ payload: Payload; files?: ZipEntry[]; stats: Record<string, number>; requires?: TemplatePackageDependency[] } | null>
  /**
   * Numbers the export form needs that a single collect() cannot express - a part with an option
   * has to report what *each* setting would produce, not only the default one. Only the parts that
   * have such an option implement it; for everything else collect()'s own stats are the answer.
   */
  probe?(ctx: CollectContext): Promise<Record<string, number>>
  plan(payload: Payload, ctx: ApplyContext): Promise<Omit<TemplatePartPlan, 'id'>>
  apply(payload: Payload, ctx: ApplyContext): Promise<void>
}

export interface CollectContext {
  projectPath: string
  translationScope: 'changed' | 'all'
}

export interface ApplyContext {
  projectPath: string
  strategy: TemplateConflictStrategy
  /** Files carried in the package, keyed by their path inside it. */
  files: Map<string, Buffer>
  warn(message: string): void
  progress(message: string): void
}

export function emptyPlan(): Omit<TemplatePartPlan, 'id'> {
  return { additions: [], conflicts: [], missingPackages: [], notes: [] }
}

// Whether an npm package is actually resolvable in the target project. node_modules rather than
// package.json's dependency list, because that is what a build resolves against - a dependency
// listed but never installed would otherwise read as satisfied.
export function hasNodeModule(projectPath: string, name: string): boolean {
  return existsSync(join(projectPath, 'node_modules', name, 'package.json'))
}

export async function installedVersion(projectPath: string, name: string): Promise<string | undefined> {
  try {
    const raw = await readFile(join(projectPath, 'node_modules', name, 'package.json'), 'utf-8')
    return (JSON.parse(raw) as { version?: string }).version
  } catch {
    return undefined
  }
}

/**
 * Where a file named by a package may be written, or null when that name would leave `dir`.
 *
 * The names in a part's payload (`files: [...]`) come from the package, and the package is not a
 * trust boundary - it is a file somebody handed over. Measured before this check existed: a
 * prepared .qtpl whose content part listed `../PROOF.md` wrote that file into the project root,
 * with the plan calling it an addition and the import reporting success. Checked by resolving and
 * comparing with `relative()` rather than by looking for `..` in the string, the same way
 * buildOutputGuard decides whether a directory is inside the project: a prefix test answers
 * `/a/bc` for the parent `/a/b`.
 */
export function containedPath(dir: string, name: string): string | null {
  const target = resolve(dir, name)
  const rel = relative(dir, target)
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return null
  return target
}

// Flat (non-recursive) listing - both quartz/static/fonts and quartz/styles/{custom,imported} are
// single-level directories by construction (fontService, styleService).
export async function listFilesFlat(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return []
  const entries = await readdir(dir, { withFileTypes: true })
  return entries.filter((e) => e.isFile()).map((e) => e.name).sort()
}
