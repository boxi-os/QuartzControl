// Der Plan, nach dem das Core-Update package.json und package-lock.json behandelt: Was trägt npm
// hinterher wieder ein, wo gewinnt Quartz, und wann lässt die App die Finger davon? Läuft ohne App,
// ohne Projekt und ohne Netz.
//
//   npm run check:core-update
//
// Existiert, weil kein anderer Test diese Frage stellt: Ein falscher Plan sieht wie ein gelungenes
// Update aus und fällt erst auf, wenn ein Paket fehlt, das vorher da war. Die vier Fälle am Ende
// sind die vier Projekte vom 2026-09-16, gegen Quartz' 3dff48b gerechnet.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// TypeScript ohne Buildschritt: node kann Typen strippen, aber nicht die Endung raten.
const quelle = fs.readFileSync(path.join(import.meta.dirname, '../shared/packageJsonDeps.ts'), 'utf-8')
const tmp = path.join(os.tmpdir(), `packageJsonDeps-${process.pid}.mts`)
fs.writeFileSync(tmp, quelle)
const { localPackageChanges, reinstallCommands } = await import(`file://${tmp}`)
fs.unlinkSync(tmp)

const deps = (eintraege) => ({ name: 'quartz', dependencies: { ...eintraege } })

const faelle = [
  {
    was: 'nichts eigenes geändert — nichts nachzuinstallieren',
    base: deps({ '@quartz-community/explorer': '^0.1.0' }),
    ours: deps({ '@quartz-community/explorer': '^0.1.0' }),
    theirs: deps({ '@quartz-community/explorer': '^1.0.0' }),
    reinstall: [],
    upstreamWins: [],
    unreproducible: []
  },
  {
    was: 'ein eigenes Paket dazu (brain-handbuch)',
    base: deps({ '@quartz-themes/core': '^1.0.0' }),
    ours: deps({ '@quartz-themes/core': '^1.0.0', '@quartz-themes/default': '^1.0.1' }),
    theirs: deps({ '@quartz-themes/core': '^2.0.0' }),
    reinstall: ['@quartz-themes/default@^1.0.1'],
    upstreamWins: [],
    unreproducible: []
  },
  {
    was: 'zwei eigene Pakete dazu (navigations-testprojekt)',
    base: deps({ '@quartz-themes/core': '^1.0.0' }),
    ours: deps({
      '@quartz-themes/core': '^1.0.0',
      '@quartz-themes/default': '^1.0.1',
      '@quartz-themes/minimal': '^1.0.1'
    }),
    theirs: deps({ '@quartz-themes/core': '^2.0.0' }),
    reinstall: ['@quartz-themes/default@^1.0.1', '@quartz-themes/minimal@^1.0.1'],
    upstreamWins: [],
    unreproducible: []
  },
  {
    was: 'beide Seiten haben dasselbe Paket angefasst — Quartz gewinnt (gui-test: @quartz-themes/core)',
    base: deps({ '@quartz-themes/core': '^1.0.0' }),
    ours: deps({ '@quartz-themes/core': '^1.1.0', '@quartz-themes/velocity': '^1.0.1' }),
    theirs: deps({ '@quartz-themes/core': '^2.0.0' }),
    reinstall: ['@quartz-themes/velocity@^1.0.1'],
    upstreamWins: ['@quartz-themes/core'],
    unreproducible: []
  },
  {
    was: 'ein eigenes Paket entfernt — das kann npm nicht nachspielen, also Finger weg',
    base: deps({ '@quartz-community/explorer': '^0.1.0', '@quartz-community/graph': '^0.1.0' }),
    ours: deps({ '@quartz-community/explorer': '^0.1.0' }),
    theirs: deps({ '@quartz-community/explorer': '^1.0.0', '@quartz-community/graph': '^1.0.0' }),
    reinstall: [],
    upstreamWins: [],
    unreproducible: ['dependencies.@quartz-community/graph']
  },
  {
    was: 'ein eigenes Skript in package.json — Finger weg, git entscheidet',
    base: { ...deps({}), scripts: { build: 'quartz build' } },
    ours: { ...deps({}), scripts: { build: 'quartz build', eigenes: 'node tu-was.mjs' } },
    theirs: { ...deps({}), scripts: { build: 'quartz build' } },
    reinstall: [],
    upstreamWins: [],
    unreproducible: ['scripts']
  },
  {
    was: 'eine eigene devDependency landet in ihrem eigenen Abschnitt',
    base: { ...deps({}), devDependencies: { typescript: '^5.0.0' } },
    ours: { ...deps({}), devDependencies: { typescript: '^5.0.0', prettier: '^3.0.0' } },
    theirs: { ...deps({}), devDependencies: { typescript: '^5.9.0' } },
    reinstall: ['prettier@^3.0.0'],
    upstreamWins: [],
    unreproducible: []
  },
  {
    // Der Dienst fragt in diesem Fall gar nicht erst (planPackageFiles steigt vorher aus), aber die
    // Funktion darf auch allein nicht raten: Ohne Vergleichsstand ist *jeder* Schlüssel eine
    // Abweichung, und eine Abweichung, die sie nicht nachspielen kann, heißt Finger weg.
    was: 'kein Vergleichsstand — nichts gilt als nachspielbar',
    base: undefined,
    ours: deps({ '@quartz-themes/default': '^1.0.1' }),
    theirs: deps({}),
    reinstall: ['@quartz-themes/default@^1.0.1'],
    upstreamWins: [],
    unreproducible: ['name']
  }
]

let fehler = 0
for (const fall of faelle) {
  const plan = localPackageChanges(fall.base, fall.ours, fall.theirs)
  const reinstall = plan.reinstall.map((e) => `${e.name}@${e.range}`)
  const vergleiche = [
    ['nachinstallieren', reinstall, fall.reinstall],
    ['Quartz gewinnt', plan.upstreamWins, fall.upstreamWins],
    ['nicht nachspielbar', plan.unreproducible, fall.unreproducible]
  ]
  for (const [name, ist, soll] of vergleiche) {
    const a = [...ist].sort().join(', ')
    const b = [...soll].sort().join(', ')
    if (a !== b) {
      fehler++
      console.error(`✗ ${fall.was}\n  ${name}: erwartet [${b}], bekommen [${a}]`)
    }
  }
}

// Der zweite Teil: Aus dem Plan werden npm-Aufrufe, und der Abschnitt hängt am Flag des Aufrufs,
// nicht am Paket - eine devDependency, die als dependency zurückkommt, ist ein anderes Projekt.
const aufrufe = reinstallCommands([
  { name: 'a', section: 'dependencies', range: '^1.0.0' },
  { name: 'b', section: 'devDependencies', range: '^2.0.0' },
  { name: 'c', section: 'dependencies', range: '^3.0.0' }
])
const erwartet = [
  'install --save-prod a@^1.0.0 c@^3.0.0',
  'install --save-dev b@^2.0.0'
]
const bekommen = aufrufe.map((a) => a.args.join(' '))
if (bekommen.join(' | ') !== erwartet.join(' | ')) {
  fehler++
  console.error(`✗ npm-Aufrufe: erwartet [${erwartet.join(' | ')}], bekommen [${bekommen.join(' | ')}]`)
}

if (reinstallCommands([]).length !== 0) {
  fehler++
  console.error('✗ ein leerer Plan erzeugt einen npm-Aufruf')
}

console.log(`${faelle.length} Pläne und ${aufrufe.length + 1} npm-Aufrufe geprüft.`)
if (fehler > 0) {
  console.error(`✗ ${fehler} Abweichung(en).`)
  process.exit(1)
}
console.log('✓ alle Pläne wie erwartet.')
