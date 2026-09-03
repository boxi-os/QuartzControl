// Does the embedded runtime actually run Quartz? Answered against a real project, because none of
// the ways this can fail show up in a typecheck or a build: they all happen in a spawned child.
//
// What it measures, in order, each one the precondition of the next:
//   1. the shims exist and Electron answers as Node at all
//   2. the Node it answers with clears Quartz's `engines.node >= 22`
//   3. the npm that travels with the app runs under it
//   4. the loader lands, i.e. process.defaultApp is set before the script runs - without it yargs
//      reads the script path as the command name and every subcommand degenerates into help
//   5. the Quartz CLI parses a subcommand (`quartz plugin list`), which is 4 seen from outside
//   6. a full build emits files into a throwaway directory
//
// Never prints "fine" for something it could not check: a step that cannot run says so and the
// script stops there, because everything after it would be measuring the wrong thing.
import { spawnSync } from 'child_process'
import { chmodSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { delimiter, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const runtimeDir = join(root, 'resources/runtime')
const projectPath = process.argv[2]

let failed = false

function ok(label, detail) {
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ''}`)
}

function fail(label, detail) {
  failed = true
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
}

function stop(reason) {
  console.log(`\n  Abgebrochen: ${reason}`)
  process.exit(1)
}

function run(command, args, cwd, timeout = 300_000) {
  const result = spawnSync(command, args, { cwd, timeout, encoding: 'utf-8' })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
  return { ok: result.status === 0, status: result.status, output, error: result.error }
}

console.log('\nEingebettete Laufzeit\n')

// The same lookup nodeRuntime.ts does, minus Electron's own API: in the repo the binary's path
// lives in node_modules/electron/path.txt (written by the postinstall, see scripts/postinstall.mjs).
const pathFile = join(root, 'node_modules/electron/path.txt')
if (!existsSync(pathFile)) stop('node_modules/electron/path.txt fehlt — erst `npm install` laufen lassen.')
const electron = join(root, 'node_modules/electron/dist', readFileSync(pathFile, 'utf-8').trim())
if (!existsSync(electron)) stop(`Electron-Binärdatei nicht gefunden: ${electron}`)

const npmDir = join(root, 'node_modules/npm')
if (!existsSync(npmDir)) stop('node_modules/npm fehlt — npm reist als devDependency mit, siehe package.json.')

const template = join(runtimeDir, 'shim.sh')
if (!existsSync(template)) stop(`Shim-Vorlage nicht gefunden: ${template}`)

// The shims go into a throwaway directory rather than the app's own, so a check never disturbs a
// running app - and they are built from the same template the app fills in, so what is measured
// here is what the app will run.
const binDir = mkdtempSync(join(tmpdir(), 'quartz-runtime-'))
const quote = (value) => `'${value.replace(/'/g, `'\\''`)}'`
const shimText = (target) =>
  readFileSync(template, 'utf-8')
    .replaceAll('__ELECTRON__', quote(electron))
    .replaceAll('__LOADER__', quote(join(runtimeDir, 'defaultapp.cjs')))
    .replaceAll('__SCRIPT__', target ? quote(target) : '')

for (const [name, target] of [
  ['node', null],
  ['npm', join(npmDir, 'bin/npm-cli.js')],
  ['npx', join(npmDir, 'bin/npx-cli.js')]
]) {
  const file = join(binDir, name)
  writeFileSync(file, shimText(target), 'utf-8')
  chmodSync(file, 0o755)
}
ok('Shims geschrieben', binDir)

const env = { ...process.env, PATH: [binDir, ...(process.env.PATH ?? '').split(delimiter)].join(delimiter) }
process.env.PATH = env.PATH

const node = run(join(binDir, 'node'), ['--version'])
if (!node.ok) stop(`der node-Shim läuft nicht: ${node.output || node.error}`)
const major = Number(node.output.replace(/^v/, '').split('.')[0])
if (Number.isNaN(major)) fail('Node-Version', `unverständliche Antwort: ${node.output}`)
else if (major < 22) fail('Node-Version', `${node.output} — Quartz verlangt >= 22`)
else ok('Node', `${node.output} (Quartz verlangt >= 22)`)

const npm = run(join(binDir, 'npm'), ['--version'])
if (npm.ok) ok('npm', npm.output)
else fail('npm', npm.output || String(npm.error))

// The loader's whole job, checked directly rather than through yargs: with ELECTRON_RUN_AS_NODE and
// no `-r`, process.defaultApp is undefined and yargs' isBundledElectronApp() drops one argv element
// instead of two. The negative control is in the same breath, so a broken `-r` cannot pass as a
// working one.
const withLoader = run(join(binDir, 'node'), ['-e', 'process.stdout.write(String(process.defaultApp))'])
const withoutLoader = spawnSync(electron, ['-e', 'process.stdout.write(String(process.defaultApp))'], {
  encoding: 'utf-8',
  env: { ...env, ELECTRON_RUN_AS_NODE: '1' }
})
if (withLoader.output === 'true' && (withoutLoader.stdout ?? '').trim() === 'undefined') {
  ok('Loader greift', 'process.defaultApp true mit -r, undefined ohne')
} else {
  fail('Loader', `mit -r: ${withLoader.output || '—'}, ohne: ${(withoutLoader.stdout ?? '').trim() || '—'}`)
}

if (!projectPath) {
  console.log('\n  Ohne Projektpfad kann der Rest nicht geprüft werden.')
  console.log('  Aufruf: npm run check:runtime -- /pfad/zum/quartz-projekt\n')
  rmSync(binDir, { recursive: true, force: true })
  process.exit(failed ? 1 : 0)
}
if (!existsSync(join(projectPath, 'quartz.config.yaml'))) {
  stop(`kein Quartz-Projekt: ${projectPath} enthält keine quartz.config.yaml`)
}

// `plugin list` rather than `--help`: help prints its usage no matter how argv was cut, so it
// cannot tell a parsed subcommand from an unparsed one. This can.
const plugins = run(join(binDir, 'npx'), ['quartz', 'plugin', 'list'], projectPath)
if (!plugins.ok) {
  fail('quartz plugin list', plugins.output.split('\n').slice(0, 2).join(' / ') || String(plugins.error))
} else if (plugins.output.includes('quartz <cmd> [args]')) {
  fail('quartz plugin list', 'gibt die Hilfe aus — argv wurde falsch zugeschnitten')
} else {
  const installed = plugins.output.split('\n').filter((line) => line.trim().startsWith('✓')).length
  ok('quartz plugin list', `${installed} Plugins genannt`)
}

const outDir = mkdtempSync(join(tmpdir(), 'quartz-build-'))
const started = Date.now()
const build = run(join(binDir, 'npx'), ['quartz', 'build', '--output', outDir], projectPath)
const seconds = ((Date.now() - started) / 1000).toFixed(1)
if (!build.ok) {
  fail('quartz build', build.output.split('\n').slice(-3).join(' / ') || String(build.error))
} else {
  let files = 0
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name))
      else files += 1
    }
  }
  if (existsSync(outDir)) walk(outDir)
  if (files === 0) fail('quartz build', 'lief durch, hat aber nichts geschrieben')
  else ok('quartz build', `${files} Dateien in ${seconds}s`)
}

rmSync(outDir, { recursive: true, force: true })
rmSync(binDir, { recursive: true, force: true })

console.log(failed ? '\n✗ Die Laufzeit ist nicht vollständig einsatzfähig.\n' : '\n✓ Die Laufzeit trägt Quartz.\n')
process.exit(failed ? 1 : 0)
