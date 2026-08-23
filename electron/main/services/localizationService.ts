import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import ts from 'typescript'
import type { LocaleEntry, LocaleFile, LocaleSaveResult } from '@shared/ipc-contract'

// quartz/i18n/locales/*.ts (excluding definition.ts, the shared interface) - verified against a
// real clone. There's no override layer in Quartz itself, so edits here go straight into these
// project-repo files; .gitattributes' merge=ours (see ensureGitAttributes) is what protects them
// from a future core update's merge, not any mechanism inside Quartz.
function localesDir(projectPath: string): string {
  return join(projectPath, 'quartz', 'i18n', 'locales')
}

export function listLocales(projectPath: string): LocaleFile[] {
  const dir = localesDir(projectPath)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && f !== 'definition.ts')
    .map((f) => ({ code: f.slice(0, -'.ts'.length) }))
    .sort((a, b) => a.code.localeCompare(b.code))
}

function localeFilePath(projectPath: string, code: string): string {
  return join(localesDir(projectPath), `${code}.ts`)
}

// `export default { ... } as const satisfies Translation` - peel off the `as`/`satisfies`
// wrapper(s) TS represents as nested AsExpression/SatisfiesExpression nodes to reach the literal.
function unwrapToObjectLiteral(expr: ts.Expression): ts.ObjectLiteralExpression | null {
  let node: ts.Expression = expr
  while (true) {
    if (ts.isParenthesizedExpression(node)) {
      node = node.expression
    } else if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) {
      node = node.expression
    } else {
      break
    }
  }
  return ts.isObjectLiteralExpression(node) ? node : null
}

function findDefaultExportObject(source: ts.SourceFile): ts.ObjectLiteralExpression | null {
  let result: ts.ObjectLiteralExpression | null = null
  ts.forEachChild(source, (node) => {
    if (result || !ts.isExportAssignment(node) || node.isExportEquals) return
    result = unwrapToObjectLiteral(node.expression)
  })
  return result
}

function propName(prop: ts.ObjectLiteralElementLike): string | null {
  if (!ts.isPropertyAssignment(prop)) return null
  if (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) return prop.name.text
  return null
}

function walkEntries(obj: ts.ObjectLiteralExpression, source: ts.SourceFile, prefix: string[], out: LocaleEntry[]): void {
  for (const prop of obj.properties) {
    const name = propName(prop)
    if (!name || !ts.isPropertyAssignment(prop)) continue
    const path = [...prefix, name]
    const init = prop.initializer
    if (ts.isObjectLiteralExpression(init)) {
      walkEntries(init, source, path, out)
    } else if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) {
      out.push({ path, kind: 'string', value: init.text })
    } else {
      out.push({ path, kind: 'template', value: init.getText(source) })
    }
  }
}

export function getLocaleEntries(projectPath: string, code: string): LocaleEntry[] {
  const filePath = localeFilePath(projectPath, code)
  if (!existsSync(filePath)) return []
  const text = readFileSync(filePath, 'utf-8')
  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true)
  const root = findDefaultExportObject(source)
  if (!root) return []
  const entries: LocaleEntry[] = []
  walkEntries(root, source, [], entries)
  return entries
}

// Finds the same leaf node the read side would have reported at `path`, in a freshly re-parsed
// copy of the file (never trusts a stale AST/offset from an earlier read), and splices just that
// initializer's exact source span - everything else in the file (comments, formatting, sibling
// keys) is left byte-for-byte untouched, the same "surgical edit over full re-serialization"
// approach configService.ts uses for quartz.config.yaml.
function findInitializer(obj: ts.ObjectLiteralExpression, path: string[]): ts.Expression | null {
  let current: ts.ObjectLiteralExpression = obj
  for (let i = 0; i < path.length; i++) {
    const prop = current.properties.find((p) => propName(p) === path[i])
    if (!prop || !ts.isPropertyAssignment(prop)) return null
    if (i === path.length - 1) return prop.initializer
    if (!ts.isObjectLiteralExpression(prop.initializer)) return null
    current = prop.initializer
  }
  return null
}

export function saveLocaleEntry(
  projectPath: string,
  code: string,
  path: string[],
  kind: 'string' | 'template',
  value: string
): LocaleSaveResult {
  const filePath = localeFilePath(projectPath, code)
  if (!existsSync(filePath)) return { success: false, error: `Locale file not found: ${code}` }
  const text = readFileSync(filePath, 'utf-8')
  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true)
  const root = findDefaultExportObject(source)
  if (!root) return { success: false, error: 'Could not find the default-exported translation object' }
  const target = findInitializer(root, path)
  if (!target) return { success: false, error: `Key not found: ${path.join('.')}` }

  const replacement = kind === 'string' ? JSON.stringify(value) : value
  const nextText = text.slice(0, target.getStart(source)) + replacement + text.slice(target.getEnd())

  // Syntax-validate the whole resulting file before writing - catches a malformed hand-edited
  // "template" (arrow function) value before it corrupts the file, without needing a full
  // TypeScript Program/type-checker just to check for parse errors.
  const diagnostics = ts.transpileModule(nextText, {
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.Latest }
  }).diagnostics
  const errors = (diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error)
  if (errors.length > 0) {
    const message = errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join('; ')
    return { success: false, error: message }
  }

  writeFileSync(filePath, nextText, 'utf-8')
  ensureGitAttributes(projectPath)
  return { success: true }
}

const MERGE_OURS_LINE = 'quartz/i18n/locales/*.ts merge=ours'

export function getGitAttributesStatus(projectPath: string): boolean {
  const path = join(projectPath, '.gitattributes')
  if (!existsSync(path)) return false
  return readFileSync(path, 'utf-8').includes(MERGE_OURS_LINE)
}

// Idempotent: called automatically after every successful save, so the update-safety net (Phase
// 6 relies on this) is never forgotten, not just offered as an opt-in the user might skip.
export function ensureGitAttributes(projectPath: string): void {
  const path = join(projectPath, '.gitattributes')
  const existing = existsSync(path) ? readFileSync(path, 'utf-8') : ''
  if (existing.includes(MERGE_OURS_LINE)) return
  const next = existing.length > 0 && !existing.endsWith('\n') ? `${existing}\n${MERGE_OURS_LINE}\n` : `${existing}${MERGE_OURS_LINE}\n`
  writeFileSync(path, next, 'utf-8')
}
