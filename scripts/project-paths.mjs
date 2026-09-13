// Wo die Quartz-Projekte dieses Rechners liegen. Eine Stelle, weil drei Skripte danach greifen und
// der Ort umziehen kann: am 2026-09-12 von `~/Documents/<name>` nach
// `~/Documents/QuartzProjekte/<name>`, und vorher hielten build-handbook.mjs,
// build-example-template.mjs und screenshot-demo.mjs ihn je einzeln - ein Umzug musste also drei
// Dateien finden, von denen nur eine eine Umgebungsvariable anbot.
//
// QUARTZCONTROL_PROJECT_ROOT überschreibt den Standard, damit der nächste Umzug (oder eine andere
// Maschine) keine Codeänderung braucht. QUARTZCONTROL_HANDBOOK_PROJECT behält seinen Vorrang: es
// nennt ein einzelnes Projekt, nicht den Ordner darüber.
//
// Die Vault-Pfade (`~/Obsidian/QuartzProjekte/…`) stehen bewusst nicht hier. Ein Vault ist keine
// Kopie des Projekts, sondern seine Quelle, und beide ziehen unabhängig voneinander um - eine
// gemeinsame Wurzel für zwei Dinge, die nur zufällig nebeneinander liegen, wäre eine Kopplung, die
// beim nächsten Aufräumen falsch führt.
import * as os from 'node:os'
import * as path from 'node:path'

export const PROJECT_ROOT =
  process.env.QUARTZCONTROL_PROJECT_ROOT || path.join(os.homedir(), 'Documents/QuartzProjekte')

/** `<PROJECT_ROOT>/<name>` - für die Projektordner und für die .qtpl-Pakete, die daneben liegen. */
export function projectPath(name) {
  return path.join(PROJECT_ROOT, name)
}

// Die Wegwerf-Projekte des Vorlagenbaus liegen eine Ebene tiefer, weil `build-example-template.mjs`
// seine Werkstatt per `projects.add` in die App-Liste einträgt: Zwischen den echten Projekten stünde
// dort sonst ein `doku-vorlage`, das beim nächsten Lauf neu geklont wird. Das Beispielprojekt ist
// davon ausgenommen - es *ist* die Werkstatt für die Variante `example` und kein Wegwerfordner.
export const WORKSHOP_ROOT = path.join(PROJECT_ROOT, 'werkstatt')

/** `<PROJECT_ROOT>/werkstatt/<name>` - für alles, was ein Lauf neu anlegen darf. */
export function workshopPath(name) {
  return path.join(WORKSHOP_ROOT, name)
}
