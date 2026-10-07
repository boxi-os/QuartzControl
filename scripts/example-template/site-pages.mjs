// Die Seiten der Example-Website, auf denen zusammen jede Komponente erscheint, die die Vorlage
// gestaltet. Zwei Skripte lesen sie: `check-tokens.mjs` (bewegt jedes Token etwas?) und
// `styles-snapshot.mjs --site` (sieht die Website nach einem Umbau genauso aus?). Eine Liste, weil
// eine Seite, die nur eines der beiden kennt, genau die Komponente ist, deren Regeln das andere
// nicht sieht.
//
// Breit, weil ein Token oder eine Regel, die nur eine Komponente trifft, überall sonst tot ist —
// das ist kein Befund, sondern eine zu schmale Liste.
export const EXAMPLE_PAGES = [
  '/',
  '/1-einstieg/04-so-ist-eine-seite-aufgebaut',
  '/2-formatierung/05-callouts/alle-typen',
  '/2-formatierung/06-code/bloecke',
  '/2-formatierung/07-tabellen/ausrichtung',
  '/2-formatierung/12-medien/bilder',
  '/2-formatierung/08-mathematik/bloecke',
  '/2-formatierung/09-diagramme/fluss',
  '/3-obsidian-formate/01-bases/alle-ansichten.base',
  '/3-obsidian-formate/02-canvas/aufbau-der-vorlage.canvas',
  // The only page in the vault that renders a boolean property as *true*, which is the sole reader
  // of `--tpl-positive`. Without it that token counted as dead - not because nobody reads it, but
  // because nothing on the eleven other pages does, and this list's own comment says a token used
  // by exactly one component is dead everywhere else.
  '/2-formatierung/11-eigenschaften/datentypen',
  '/tags/callouts',
  // Only a server that answers an unknown path with the site's own 404 page exercises
  // `page-404.scss` - the app's dev server does, a plain static file server does not, and there
  // the two tokens that page owns read as dead. That is the server's answer, not the token's.
  // (`styles-snapshot.mjs --serve` answers it like the dev server.)
  '/gibtsnicht'
]
