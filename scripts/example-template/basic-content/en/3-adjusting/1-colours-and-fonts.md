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
