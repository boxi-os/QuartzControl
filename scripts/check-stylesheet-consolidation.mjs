// Die Zusammenlegung der 31 Vorlagen-Stylesheets zu zwölf (shared/stylesheetConsolidation.ts)
// gegen die, die die Vorlage selbst in f2cdb69 bekommen hat: die 31 Dateien von davor durch die
// Funktion, das Ergebnis Datei für Datei gegen die zwölf von danach — die Regelzeilen ohne
// Kommentare, in ihrer Reihenfolge. Die eine erwartete Abweichung ist die Regel
// `.layout-box-current-folder`, die f2cdb69 ins Layout-Box-Stylesheet verschob und die
// Zusammenlegung beim Explorer lässt (der Kopf der Datei sagt, warum). Dazu die zwei Ränder, an
// denen die erste Fassung scheiterte: a11y und plugin-layout-box heißen alt und neu gleich — sie
// wurden geschrieben und gleich danach gelöscht, und ein zweiter Lauf packte sie noch einmal ein.
// Und der Lauf nach einem ersten, bei dem eine der 31 abgeschaltet war und danach eingeschaltet
// wird: Der packte beide ein zweites Mal ein und schob components-header als eigene Datei beiseite
// (zweiundvierzigstes Review, Befund 4).
// Braucht weder App noch Projekt noch Netz, nur die git-Geschichte dieses Repos.
//
//   npm run check:stylesheet-consolidation
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const repo = path.join(import.meta.dirname, '..')
const quelle = fs.readFileSync(path.join(repo, 'shared/stylesheetConsolidation.ts'), 'utf-8')
const tmp = path.join(os.tmpdir(), `consolidation-${process.pid}.mts`)
fs.writeFileSync(tmp, quelle)
const { planConsolidation, canConsolidate, wasConsolidated, CONSOLIDATED_ORDER } = await import(`file://${tmp}`)
fs.unlinkSync(tmp)

const show = (rev, p) => execFileSync('git', ['-C', repo, 'show', `${rev}:${p}`], { encoding: 'utf8', maxBuffer: 1e8 })
const alt = [...show('f2cdb69~1', 'scripts/example-template/style-order.mjs').matchAll(/^\s+'([a-z0-9-]+)'/gm)].map((m) => m[1])
const files = Object.fromEntries(alt.map((n) => [`custom/${n}.scss`, show('f2cdb69~1', `scripts/example-template/styles/${n}.scss`)]))
// Eigene Dateien davor und danach, eine davon mit dem Namen eines der zwölf.
const order = ['custom/eigene-erste.scss', ...alt.map((n) => `custom/${n}.scss`), 'custom/callouts.scss', 'custom/fix.scss']
const plan = planConsolidation(order, files, order)

const regeln = (t) => t.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim() && !l.trim().startsWith('//'))
const ohneVerschobene = (zeilen) => {
  const i = zeilen.indexOf('.layout-box-current-folder {')
  return i < 0 ? zeilen : [...zeilen.slice(0, i), ...zeilen.slice(i + 3)]
}
let fehler = 0
const pruefe = (ok, satz) => {
  console.log(`${ok ? '✓' : '✗'} ${satz}`)
  if (!ok) fehler++
}
for (const t of CONSOLIDATED_ORDER) {
  const meine = ohneVerschobene(regeln(plan.write[`custom/${t}.scss`] ?? ''))
  const p5 = ohneVerschobene(regeln(show('f2cdb69', `scripts/example-template/styles/${t}.scss`)))
  pruefe(meine.join('\n') === p5.join('\n'), `${t}: ${meine.length} Regelzeilen wie in f2cdb69`)
}
const sortiert = (t) => regeln(t).sort().join('\n')
pruefe(sortiert(alt.map((n) => files[`custom/${n}.scss`]).join('\n')) === sortiert(Object.values(plan.write).join('\n')), 'jede Regelzeile der 31 steht genau einmal in den zwölf')
pruefe(plan.remove.length === 29 && !plan.remove.some((p) => p in plan.write), 'gelöscht werden 29, keine, die gerade geschrieben wurde')
pruefe(plan.rename['custom/callouts.scss'] === 'custom/callouts-2.scss', 'die eigene callouts.scss weicht nach callouts-2.scss aus')
pruefe(
  plan.order.join(' ') === ['custom/eigene-erste.scss', ...CONSOLIDATED_ORDER.map((t) => `custom/${t}.scss`), 'custom/callouts-2.scss', 'custom/fix.scss'].join(' '),
  'eigene Dateien behalten ihren Platz vor und hinter den Vorlagen-Stylesheets'
)
const danach = plan.order
pruefe(!canConsolidate(danach, false), 'ein zusammengelegtes Projekt bietet nichts mehr an (a11y und plugin-layout-box zählen nicht)')
pruefe(Object.keys(planConsolidation(danach, plan.write, danach).write).length === 0, 'ein zweiter Lauf schreibt nichts')
pruefe(!wasConsolidated(files, order) && canConsolidate(order, wasConsolidated(files, order)), 'die 31 gelten als nicht zusammengelegt, auch mit einer eigenen callouts.scss daneben')

// Erster Lauf ohne nav-search, danach nav-search eingeschaltet (es landet am Ende der Reihenfolge).
const ohneSuche = order.filter((p) => p !== 'custom/nav-search.scss')
const erster = planConsolidation(ohneSuche, files, order)
const platte = { ...files }
for (const [von, nach] of Object.entries(erster.rename)) platte[nach] = platte[von]
for (const p of erster.remove) delete platte[p]
Object.assign(platte, erster.write)
const eingeschaltet = [...erster.order, 'custom/nav-search.scss']
pruefe('custom/nav-search.scss' in platte && !erster.order.includes('custom/nav-search.scss'), 'eine abgeschaltete der 31 bleibt beim ersten Lauf liegen und wird nicht geladen')
pruefe(!canConsolidate(eingeschaltet, wasConsolidated(platte, eingeschaltet)), 'nach dem Einschalten wird nicht noch einmal angeboten')
const zweiter = planConsolidation(eingeschaltet, platte, Object.keys(platte))
pruefe(
  Object.keys(zweiter.write).length === 0 && Object.keys(zweiter.rename).length === 0 && zweiter.order.join(' ') === eingeschaltet.join(' '),
  'ein zweiter Lauf schreibt, benennt und ordnet nichts — nav-search bleibt eine eigene Datei am Ende'
)

// Ein Projekt aus der Vorlage von 1.1: Ihre zwölf tragen ihre eigene erste Zeile, nicht die Kopfzeile
// der Zusammenlegung. Kommt eine der 31 dazu, darf nichts angeboten werden — sonst packte der Lauf
// a11y und plugin-layout-box in sich selbst und schob components-header beiseite (43. Review,
// Befund 6). Gegenprobe: eine einzelne eigene callouts.scss neben den 31 zählt nicht.
const vorlage = Object.fromEntries(CONSOLIDATED_ORDER.map((t) => [`custom/${t}.scss`, show('HEAD', `scripts/example-template/styles/${t}.scss`)]))
const ausVorlage = [...CONSOLIDATED_ORDER.map((t) => `custom/${t}.scss`), 'custom/nav-search.scss']
const vorlagePlatte = { ...vorlage, 'custom/nav-search.scss': files['custom/nav-search.scss'] }
pruefe(
  !canConsolidate(ausVorlage, wasConsolidated(vorlage, ausVorlage)) && Object.keys(planConsolidation(ausVorlage, vorlagePlatte, ausVorlage).write).length === 0,
  'ein Projekt aus der Vorlage von 1.1 mit einer der 31 dazu bietet nichts an und schreibt nichts'
)
pruefe(!wasConsolidated({}, ['custom/callouts.scss', ...order]), 'eine eigene callouts.scss in der Reihenfolge macht die 31 nicht zu zusammengelegten')

// Ein Restore je Datei kann die 31 samt Reihenfolge zurückholen und die zwölf mit Kopfzeile
// ungeladen liegen lassen. Dann ist das Projekt wieder in der Form der 31, und das Angebot muss
// zurückkommen; die liegengebliebenen zwölf weichen aus, statt überschrieben zu werden (43. Review,
// nebenbei).
const nur31 = alt.map((n) => `custom/${n}.scss`)
const zwoelf = planConsolidation(nur31, files, nur31).write
// a11y und plugin-layout-box heißen alt und neu gleich: der Restore holt ihren alten Inhalt zurück.
const zurueck = { ...zwoelf, ...files }
pruefe(canConsolidate(nur31, wasConsolidated(zurueck, nur31)), 'nach einem Restore je Datei (die 31 geladen, die zwölf ungeladen daneben) wird wieder angeboten')
const nachRestore = planConsolidation(nur31, zurueck, [...nur31, ...Object.keys(zwoelf)])
const neuBenannt = Object.keys(nachRestore.rename).filter((p) => !nur31.includes(p))
pruefe(
  Object.keys(nachRestore.write).length === 12 && neuBenannt.length === 10 && nachRestore.order.every((p) => !p.endsWith('-2.scss')),
  `ein Lauf danach schreibt die zwölf neu, die zehn liegengebliebenen mit neuem Namen weichen aus und werden nicht geladen (${neuBenannt.length} umbenannt)`
)

console.log(fehler ? `\n✗ ${fehler} Prüfung(en) fehlgeschlagen` : '\n✓ alle Prüfungen bestanden')
process.exit(fehler ? 1 : 0)
