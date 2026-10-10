import { existsSync } from 'fs'
import { readFile, writeFile, rename, stat } from 'fs/promises'
import { join } from 'path'
import { parseDocument, Document, isMap } from 'yaml'
import type { QuartzConfig, PluginEntry, PluginSource, LayoutConfig } from '@shared/ipc-contract'
import { createSnapshot } from './snapshotService'
import { ownFramePath } from './framePaths'
import { projectLock } from './projectLock'
import { mainT } from '../i18n'

/**
 * yaml's message as a sentence that can stand inside one of ours.
 *
 * The first line is the one that names line and column; the rest is a source excerpt with a caret,
 * meant for a terminal rather than for a toast. And that first line ends in a colon, because in a
 * terminal the excerpt follows it - inside "…: {{reason}}. Repariere sie…" that came out as
 * "at line 3, column 18:. Repariere" (twenty-third review, "nebenbei" 5).
 */
function yamlReason(message: string): string {
  return message.split('\n')[0].replace(/[\s:]+$/, '')
}

function configPath(projectPath: string): string {
  return join(projectPath, 'quartz.config.yaml')
}

export function deriveName(source: PluginSource): string {
  if (typeof source === 'string') {
    const withoutRef = source.replace(/^github:/, '').replace(/^git\+/, '').split('#')[0]
    const parts = withoutRef.split('/')
    return parts[parts.length - 1] || withoutRef
  }
  if (source.name) return source.name
  const parts = source.repo.replace(/\.git$/, '').split('/')
  return parts[parts.length - 1]
}

export async function readConfig(projectPath: string): Promise<QuartzConfig> {
  // "It is not there" is its own answer, and the only one of these with an instruction attached.
  // It used to be a raw ENOENT under a hint the page showed beneath *every* read error, including
  // the ones that just said the file is there and what is in it (twenty-first review, "nebenbei"
  // 5). Said here, the hint travels with the case it belongs to and every caller gets it.
  let raw: string
  try {
    raw = await readFile(configPath(projectPath), 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(mainT('configMissing'))
    throw error
  }
  // Three ways to be unreadable, three answers - and one way to be empty, which is not one of them.
  //
  // Empty: an empty file is a valid YAML document with no content, and `toJS()` answers `null` for
  // it - which every `json.x` below then reads as a TypeError. Measured (twentieth review,
  // "nebenbei"): a duplicate of a project whose config was an empty file died on `Cannot read
  // properties of null (reading 'configuration')` out of repointProjectPaths. An empty document
  // says the same thing as a document without any of these keys, so it is read as one.
  //
  // A syntax error: `parseDocument` does not throw on one, it collects `doc.errors` and hands back
  // whatever it could make of the rest. That is the way a config really does break - an unclosed
  // quote, a tab where spaces belong, the half-finished hand edit two `catch` comments in this
  // tree already assume - and it read as a half-empty configuration without a word. Measured
  // (twenty-first review, finding 5): `pageTitle: "abc` swallowed the three lines below it into
  // the title, plugins came out empty, and the built app showed that title on the configuration
  // page with no toast anywhere.
  //
  // Not a mapping at all - a bare string, a list, a number: every key below would come out
  // `undefined` and the app would show a blank configuration.
  //
  // What none of the three costs is the file. Measured against `writeConfig` on these very files:
  // it does not write over them, it throws ("Expected a YAML collection as document contents",
  // "Document with errors cannot be stringified") and each file stays byte for byte what it was.
  // A blank page with no word for it is reason enough on its own.
  const doc = parseDocument(raw)
  if (doc.errors.length > 0) {
    throw new Error(mainT('configNotParseable', { reason: yamlReason(doc.errors[0].message) }))
  }
  const parsed = doc.toJS() as unknown
  if (parsed !== null && parsed !== undefined && (typeof parsed !== 'object' || Array.isArray(parsed))) {
    throw new Error(mainT('configNotAMapping'))
  }
  // `plugins:` holding something that is not a list is the same kind of broken as the three above,
  // and it reached the page as a raw `(json.plugins ?? []).map is not a function` because the cast
  // below promises an array that the file never had to contain.
  if (parsed !== null && parsed !== undefined) {
    const plugins = (parsed as Record<string, unknown>).plugins
    if (plugins !== undefined && plugins !== null && !Array.isArray(plugins)) {
      throw new Error(mainT('configPluginsNotAList'))
    }
  }
  const json = (parsed ?? {}) as {
    // quartz nests `theme` inside `configuration` on disk; plugin entries can carry
    // extra fields (e.g. `layout`) beyond source/enabled/order/options that must round-trip
    configuration?: (QuartzConfig['configuration'] & { theme?: QuartzConfig['theme'] }) | undefined
    plugins?: Array<Record<string, unknown> & { source: PluginSource; enabled?: boolean }>
    layout?: LayoutConfig
  }
  const { theme, ...configuration } = json.configuration ?? {}
  // `enabled` is read the way Quartz's *build* reads it, not the way its CLI does. The loader keeps
  // an entry only when the key is truthy (`filter((e) => e.enabled)` at every place that makes the
  // site - transformers, emitters, dependencies, layout), while `quartz plugin list` treats a
  // missing key as on (`entry.enabled !== false`). This used to follow the CLI, and since
  // writeConfig writes the key for every entry, that was not only a wrong switch: a hand-written
  // entry without `enabled:` showed as on while the build left it out, and the next save of
  // anything at all - measured with a page-title change - wrote `enabled: true` and put the plugin
  // on the site without anyone turning it on. Following the build instead writes `enabled: false`
  // on that save, which changes nothing about the site and makes the CLI agree.
  const plugins: PluginEntry[] = (json.plugins ?? []).map((p) => ({
    ...p,
    name: deriveName(p.source),
    enabled: Boolean(p.enabled)
  })) as PluginEntry[]
  return {
    configuration,
    theme: theme ?? {},
    plugins,
    layout: json.layout
  }
}

async function atomicWrite(path: string, contents: string): Promise<void> {
  // Fail before touching the real file - and that needs `errors`, not the call: `parseDocument`
  // does not throw on a syntax error, it collects them (the same thing that let a broken config
  // read as half empty, see readConfig). The line read like a guard and was none. Nothing here is
  // meant to be able to produce invalid YAML - `doc.toString()` wrote it a moment ago - so this
  // stays English like the other sentences that describe a bug rather than an input.
  const check = parseDocument(contents)
  if (check.errors.length > 0) {
    throw new Error(`Refusing to write invalid YAML to ${path}: ${check.errors[0].message.split('\n')[0]}`)
  }
  const tmpPath = `${path}.tmp-${Date.now()}`
  await writeFile(tmpPath, contents, 'utf-8')
  await rename(tmpPath, path)
}

// setIn alone can only add or update, so a key the user removed in the editor would survive every
// save forever. This reconciles a mapping node with the incoming object: keys absent from `next`
// are deleted, the rest are set field-by-field so surrounding YAML comments stay intact.
// `keep` exempts keys that live under the same node but are managed elsewhere.
function syncMapping(doc: Document, nodePath: string[], next: Record<string, unknown>, keep: string[] = []): void {
  const node = doc.getIn(nodePath)
  if (isMap(node)) {
    const exempt = new Set(keep)
    const stale = node.items
      .map((item) => String(item.key))
      .filter((key) => !exempt.has(key) && !(key in next))
    for (const key of stale) doc.deleteIn([...nodePath, key])
  }
  for (const [key, value] of Object.entries(next)) {
    doc.setIn([...nodePath, key], value)
  }
}

// `snapshot: false` for a write that is part of a larger operation which takes its own snapshot,
// or - as in duplicateService - happens inside a project that has no history yet and must not
// start one: the same escape hatch layoutFrameService.saveFrame offers for the same reason.
/**
 * One writer of quartz.config.yaml at a time per project, for the writers that read and write in
 * one go - today the repair of frame paths at the build door (projectPaths.ts). writeConfig holds
 * it, so a save waits for a repair instead of landing between its read and its write.
 *
 * Nothing that holds it may wait on the snapshot queue (snapshotService.serialize): a restore
 * holds the queue and takes this lock at its end, so the order is queue first, then this lock.
 */
export const whileHoldingConfig = projectLock()

export async function writeConfig(
  projectPath: string,
  config: QuartzConfig,
  options?: { snapshot?: boolean }
): Promise<void> {
  // A snapshot rather than the old per-save copy of this one file: the store covers the whole
  // project, and its coalescing window means a session of edits leaves the state from *before*
  // the session as one entry instead of one entry per save - which is what made the old backup
  // list fifty unreadable timestamps.
  //
  // The snapshot comes before the lock, never under it. The order is snapshot queue, then config
  // lock: a restore runs inside the queue and ends in repointAuthoredFrames, which takes the
  // config lock - so a holder of the config lock that waited on the queue closed a circle, and a
  // save during a restore hung both, and with them every later save, snapshot and build of the
  // project until the app restarted (forty-third review, finding 2). A repair that lands between
  // this snapshot and the write is not in it; the snapshot is the state before the edit, which is
  // what it was taken for.
  if (options?.snapshot !== false && (await hasContent(configPath(projectPath)))) {
    await createSnapshot(projectPath, 'configChange', '')
  }
  return whileHoldingConfig(projectPath, () => writeConfigNow(projectPath, config))
}

async function hasContent(path: string): Promise<boolean> {
  return stat(path).then(
    (s) => s.size > 0,
    () => false
  )
}

async function writeConfigNow(projectPath: string, config: QuartzConfig): Promise<void> {
  const path = configPath(projectPath)
  const existingRaw = existsSync(path) ? await readFile(path, 'utf-8') : ''
  // field-level setIn (rather than replacing whole subtrees) keeps existing YAML comments intact
  const doc = existingRaw ? parseDocument(existingRaw) : new Document({})
  // The same question readConfig asks, because this path does not come through it: `config.save`
  // hands over what the renderer loaded, and between the load and the click the file on disk can
  // have become something else - a hand edit in another editor is the ordinary way there. Without
  // this the run died in `doc.toString()` with yaml's own "Document with errors cannot be
  // stringified"; nothing was lost, but nothing said what to do either.
  if (doc.errors.length > 0) {
    throw new Error(mainT('configNotParseable', { reason: yamlReason(doc.errors[0].message) }))
  }
  // And the other half of the same question, for the same reason. An empty document is not one of
  // these - `setIn` turns it into a mapping, which is what a project whose config file is empty
  // needs - but a list or a bare string is, and yaml answered it with "Expected a valid index, not
  // configuration".
  if (doc.contents !== null && doc.contents !== undefined && !isMap(doc.contents)) {
    throw new Error(mainT('configNotAMapping'))
  }

  // `theme` is exempt: readConfig splits it out of `configuration` into its own field, so it is
  // never a key of config.configuration and would otherwise be deleted as stale on every save.
  syncMapping(doc, ['configuration'], config.configuration, ['theme'])
  // Only reconcile the theme block if it already exists or the config actually carries one, so an
  // empty theme never creates a bare `theme:` node on a project that never had one.
  if (isMap(doc.getIn(['configuration', 'theme'])) || Object.keys(config.theme).length > 0) {
    syncMapping(doc, ['configuration', 'theme'], config.theme)
  }
  // A page holds the config it read when it mounted, and the build door may have pointed a frame
  // path at this project since (projectPaths.repointAuthoredFrames) - the save wrote the original's
  // paths back, and until the next build the dev server built from the original's frames
  // (forty-second review, finding 6). So whatever a writer hands over names this project's frames.
  doc.set(
    'plugins',
    config.plugins.map(({ name: _name, ...rest }) => {
      const own = typeof rest.source === 'string' ? ownFramePath(projectPath, rest.source) : null
      return own === null ? rest : { ...rest, source: own }
    })
  )
  // Only touch the top-level `layout:` node when the in-memory config actually carries one -
  // every tab's save() round-trips whatever it loaded unchanged, so this only creates a new
  // `layout:` block the first time the Layout Editor itself initializes one on a project that
  // didn't have it yet, never as a side effect of saving from an unrelated tab.
  if (config.layout !== undefined) {
    doc.setIn(['layout', 'groups'], config.layout.groups ?? {})
    doc.setIn(['layout', 'byPageType'], config.layout.byPageType ?? {})
  }

  // The Quartz CLI writes this file with lineWidth 120 (writeDataToFile in
  // quartz/cli/plugin-data.js); with yaml's default of 80 every switch between the app and a CLI
  // plugin action folded the same long strings the other way (218 of 547 lines in gui-test).
  const serialized = doc.toString({ lineWidth: 120 })
  await atomicWrite(path, serialized)
}
