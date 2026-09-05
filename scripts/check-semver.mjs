// Die Versionsvergleiche, die der Update-Hinweis trifft — die einzige Stelle darin, die auf eine
// interessante Weise falsch sein kann. Läuft ohne App und ohne Netz.
//
//   npm run check:semver
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// TypeScript ohne Buildschritt: node kann Typen strippen, aber nicht die Endung raten.
const quelle = fs.readFileSync(path.join(import.meta.dirname, '../shared/semver.ts'), 'utf-8')
const tmp = path.join(os.tmpdir(), `semver-${process.pid}.mts`)
fs.writeFileSync(tmp, quelle)
const { isNewerVersion } = await import(`file://${tmp}`)
fs.unlinkSync(tmp)

const faelle = [
  // [Kandidat, laufend, erwartet]
  ['1.0.0-beta.2', '1.0.0-beta.1', true],
  ['1.0.0-beta.1', '1.0.0-beta.2', false],
  ['1.0.0-beta.1', '1.0.0-beta.1', false],
  // die Stelle, an der ein Zeichenkettenvergleich falsch liegt
  ['1.0.0-beta.10', '1.0.0-beta.9', true],
  ['1.0.0-beta.9', '1.0.0-beta.10', false],
  // eine Vorabversion ist älter als ihre Freigabe
  ['1.0.0', '1.0.0-beta.7', true],
  ['1.0.0-beta.7', '1.0.0', false],
  // die drei Zahlen
  ['1.0.1', '1.0.0', true],
  ['1.1.0', '1.0.9', true],
  ['2.0.0', '1.9.9', true],
  ['1.0.0', '1.0.1', false],
  ['1.10.0', '1.9.0', true],
  // längere Vorabversion nach ihrem eigenen Präfix
  ['1.0.0-beta.1.2', '1.0.0-beta.1', true],
  ['1.0.0-beta.1', '1.0.0-beta.1.2', false],
  // Unlesbares sagt nichts, statt jeden Tester zu behelligen
  ['', '1.0.0-beta.1', false],
  ['neueste', '1.0.0-beta.1', false],
  ['1.0', '1.0.0', false],
  ['1.0.0-beta.2', 'kaputt', false]
]

let schlecht = 0
for (const [kandidat, laufend, erwartet] of faelle) {
  const ist = isNewerVersion(kandidat, laufend)
  if (ist !== erwartet) {
    schlecht += 1
    console.log(`  ✗ isNewerVersion(${JSON.stringify(kandidat)}, ${JSON.stringify(laufend)}) = ${ist}, erwartet ${erwartet}`)
  }
}
console.log(`\n${faelle.length} Vergleiche geprüft.`)
if (schlecht) {
  console.log(`${schlecht} falsch.`)
  process.exit(1)
}
console.log('✓ alle richtig.')
