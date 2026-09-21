---
title: Colours and fonts
description: Which setting in the app changes which part of the page.
tags:
  - adjusting
section: Adjusting
translationKey: farben-und-schriften
lang: en
---

| What you want to change      | Where it lives                  |
| ---------------------------- | ------------------------------- |
| Colours, light and dark      | Styles → Basics                 |
| Fonts                        | Styles → Basics                 |
| Spacing, radii, rules        | Styles → Variables (`--tpl-…`)  |
| Single rules                 | Styles → Custom CSS             |
| What sits where on the page  | Layout                          |

The order is also the recommendation: custom CSS is the last step, not the first. Whether
your changes survive an update of the template is decided when you import it: “Project wins”
keeps them, “Template wins” resets all five rows to the template's state.

## Two groups in the variables tab worth knowing

**The side columns.** Whether a column stays put while the page scrolls is decided by three
variables per column, and they belong together — whoever switches one switches all three:

| Variable                  | stays put                                                      | scrolls along |
| ------------------------- | -------------------------------------------------------------- | ------------- |
| `--tpl-col-…-position`    | `sticky`                                                       | `static`      |
| `--tpl-col-…-height`      | `calc(100dvh - var(--tpl-header-h) - 2 * var(--tpl-space-lg))` | `none`        |
| `--tpl-col-…-mask`        | `var(--tpl-fade-mask-end)`                                     | `none`        |

`…` stands for `left` or `right`. Default: the right one stays put, the left one scrolls along. A
half state looks like a bug — a column that stops in the middle of the text and scrolls inside
itself.

**The callout colours** (`--tpl-callout-…`) are measured, not chosen: each holds 4.5:1 on the page
ground and on the tinted surface of its box. Whoever changes one can put it below that threshold,
and the app says nothing about it.
