---
title: Farben und Schriften
description: Welche Einstellung in der App welchen Teil der Seite ändert.
tags:
  - anpassen
section: Anpassen
translationKey: farben-und-schriften
---

| Was du ändern willst        | Wo es steht                        |
| --------------------------- | ---------------------------------- |
| Farben hell und dunkel      | Stile → Basis                      |
| Schriften                   | Stile → Basis                      |
| Abstände, Radien, Linien    | Stile → Variablen (`--tpl-…`)      |
| Einzelne Regeln             | Stile → Eigenes CSS                |
| Was wo auf der Seite steht  | Layout                             |

Die Reihenfolge ist zugleich die Empfehlung: Eigenes CSS ist der letzte Schritt, nicht der
erste. Ob deine Änderungen ein Update der Vorlage überleben, entscheidest du beim Import:
„Projekt gewinnt“ behält sie, „Vorlage gewinnt“ setzt alle fünf Zeilen auf den Stand der
Vorlage zurück.

## Zwei Gruppen im Variablen-Tab, die man kennen sollte

**Die Seitenspalten.** Ob eine Spalte beim Rollen stehen bleibt, entscheiden drei Variablen je
Spalte, und sie gehören zusammen — wer umstellt, stellt alle drei um:

| Variable                  | stehen bleiben                                                 | mitlaufen |
| ------------------------- | -------------------------------------------------------------- | --------- |
| `--tpl-col-…-position`    | `sticky`                                                       | `static`  |
| `--tpl-col-…-height`      | `calc(100dvh - var(--tpl-header-h) - 2 * var(--tpl-space-lg))` | `none`    |
| `--tpl-col-…-mask`        | `var(--tpl-fade-mask-end)`                                     | `none`    |

Für `…` steht `left` oder `right`. Vorgabe: rechts bleibt stehen, links läuft mit. Ein halber
Zustand sieht aus wie ein Fehler — eine Spalte, die mitten im Text aufhört und in sich selbst
rollt.

**Die Callout-Farben** (`--tpl-callout-…`) sind gemessen, nicht gewählt: Jede hält 4,5:1 auf dem
Seitengrund und auf der getönten Fläche ihres Kastens. Wer eine ändert, kann sie unter diese
Schwelle setzen, und die App sagt nichts dazu.
