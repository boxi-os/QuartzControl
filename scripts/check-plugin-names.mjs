// Der Name, gegen den Quartz `layout.byPageType.<typ>.exclude` vergleicht.
//
//   npm run check:plugin-names [-- <projektpfad>]
//
// Existiert aus demselben Grund wie check:semver: eine reine Funktion, deren interessante Fälle
// Ränder sind, und ein Fehler darin ist auf keinem Bildschirm zu sehen — er sieht aus wie ein
// Schalter, der nichts tut. Genau das war Befund 2 aus docs/REVIEW-2026-09-10.md: Für jede
// npm-Quelle mit Scope gibt Quartz' `extractPluginName` die *ganze* Quelle zurück, die App schrieb
// den Kurznamen, und der Ausschluss wirkte nie.
//
// Zwei Teile. Der erste ist eine feste Tabelle und läuft immer. Der zweite braucht ein echtes
// Quartz-Projekt und ist der eigentliche Wächter: Er liest `extractPluginName` und `isLocalSource`
// **aus Quartz' eigenen Quelldateien** und vergleicht Zeichenkette für Zeichenkette gegen unsere
// Nachbildung. Ohne Projekt überspringt er sich und sagt das — „kann nicht prüfen“ ist nicht
// „alles gut“.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const quelle = fs.readFileSync(path.join(import.meta.dirname, '../shared/quartzPluginName.ts'), 'utf-8')
const tmp = path.join(os.tmpdir(), `quartz-plugin-name-${process.pid}.mts`)
fs.writeFileSync(tmp, quelle)
const { quartzPluginName } = await import(`file://${tmp}`)
fs.unlinkSync(tmp)

const faelle = [
  // [Quelle, erwarteter Name]
  // Der Fall, der den Befund ausgelöst hat: npm mit Scope bleibt ganz.
  ['@quartz-community/page-title', '@quartz-community/page-title'],
  ['@quartz-themes/core', '@quartz-themes/core'],
  // npm ohne Scope ebenso — Quartz' letzter `return source`.
  ['quartz-plugin-foo', 'quartz-plugin-foo'],
  // github: verliert Präfix, Besitzer und Ref.
  ['github:boxi-os/quartz-layout-box', 'quartz-layout-box'],
  ['github:boxi-os/quartz-layout-box#v2', 'quartz-layout-box'],
  // die beiden git-Formen verlieren zusätzlich das .git
  ['https://github.com/x/foo.git', 'foo'],
  ['https://github.com/x/foo', 'foo'],
  ['git+https://github.com/x/foo.git', 'foo'],
  ['git+https://github.com/x/foo.git#main', 'foo'],
  // lokale Pfade: der Basisname, auch mit Schrägstrich am Ende
  ['./plugins/baz', 'baz'],
  ['./plugins/baz/', 'baz'],
  ['../anderswo/baz//', 'baz'],
  ['/Users/x/Documents/Example/.quartz-gui/authored-frames/frame-editorial', 'frame-editorial'],
  // Ein Windows-Pfad ist auf dieser Maschine kein Sonderfall, sondern einer für node: `path.basename`
  // trennt am Backslash nur auf win32. Erwartet wird deshalb, was node hier selbst sagt — genau das
  // ist die Behauptung der Nachbildung.
  ['C:\\Users\\x\\plugins\\baz', path.basename('C:\\Users\\x\\plugins\\baz')],
  ['C:/Users/x/plugins/baz', 'baz'],
  // Objektquellen: ein eigener Name gewinnt, sonst zählt das repo-Feld
  [{ repo: 'github:x/foo', name: 'eigener-name' }, 'eigener-name'],
  [{ repo: 'github:x/foo' }, 'foo'],
  [{ repo: '@quartz-community/page-title' }, '@quartz-community/page-title']
]

let schlecht = 0
for (const [quelleWert, erwartet] of faelle) {
  const ist = quartzPluginName(quelleWert)
  if (ist !== erwartet) {
    schlecht += 1
    console.log(`  ✗ quartzPluginName(${JSON.stringify(quelleWert)}) = ${JSON.stringify(ist)}, erwartet ${JSON.stringify(erwartet)}`)
  }
}
console.log(`${faelle.length} Namen gegen die Tabelle geprüft.`)

// --- Gegenprobe an Quartz' eigenem Code ------------------------------------------------------

const projekt = process.argv[2]
if (!projekt) {
  console.log('Kein Projektpfad übergeben — die Gegenprobe gegen Quartz’ eigene Funktion lief nicht.')
} else {
  const configLoader = path.join(projekt, 'quartz/plugins/loader/config-loader.ts')
  const gitLoader = path.join(projekt, 'quartz/plugins/loader/gitLoader.ts')
  if (!fs.existsSync(configLoader) || !fs.existsSync(gitLoader)) {
    console.log(`Kein Quartz-Checkout unter ${projekt} — die Gegenprobe lief nicht.`)
  } else {
    // Herausgeschnitten, nicht nachgebaut: Was hier läuft, ist Quartz' Text. Findet der Schnitt
    // nichts, ist das eine eigene Antwort und kein Bestehen.
    const schneide = (datei, name) => {
      const text = fs.readFileSync(datei, 'utf-8')
      const start = text.indexOf(`function ${name}(`)
      if (start === -1) return null
      let tiefe = 0
      for (let i = text.indexOf('{', start); i < text.length; i++) {
        if (text[i] === '{') tiefe++
        else if (text[i] === '}' && --tiefe === 0) return text.slice(start, i + 1)
      }
      return null
    }
    const extract = schneide(configLoader, 'extractPluginName')
    const local = schneide(gitLoader, 'isLocalSource')
    if (!extract || !local) {
      console.log('Quartz’ extractPluginName/isLocalSource nicht gefunden — die Gegenprobe lief nicht.')
      process.exit(schlecht ? 1 : 0)
    }
    const ohneTypen = (s) => s.replace(/: PluginSource/g, '').replace(/\): (string|boolean) \{/, ') {')
    const quartzName = new Function('path', `${ohneTypen(local)}\n${ohneTypen(extract)}\nreturn extractPluginName`)(path)
    let abweichend = 0
    for (const [quelleWert] of faelle) {
      const unser = quartzPluginName(quelleWert)
      const ihrer = quartzName(quelleWert)
      if (unser !== ihrer) {
        abweichend += 1
        console.log(`  ✗ ${JSON.stringify(quelleWert)}: wir ${JSON.stringify(unser)}, Quartz ${JSON.stringify(ihrer)}`)
      }
    }
    console.log(`${faelle.length} Namen gegen Quartz’ eigene Funktion aus ${path.relative(process.cwd(), configLoader)} geprüft.`)
    schlecht += abweichend
  }
}

if (schlecht) {
  console.log(`\n${schlecht} falsch.`)
  process.exit(1)
}
console.log('✓ alle richtig.')
