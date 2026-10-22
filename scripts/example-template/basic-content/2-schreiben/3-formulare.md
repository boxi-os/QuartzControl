---
title: Formulare
description: Ein Kontaktformular, das noch nichts sendet.
tags:
  - schreiben
section: Schreiben
translationKey: formulare
---

Unter diesem Absatz steht das Formular `kontakt` aus dem Plugin quartz-forms. Es sendet noch
nichts: Nach dem Absenden zeigt es, wie die Nachricht angekommen wäre.

```quartz-form
kontakt
```

## Woher es kommt

Eingebunden ist es mit einem Codeblock der Sprache `quartz-form`, der nur die Kennung des
Formulars enthält. Felder, Texte und Versand stellst du in QuartzControl unter *Plugins →
Formulare* ein.

## Damit es wirklich sendet

Unter „Versand“ steht für alle Formulare „Vorführung“. Hast du einen Webspace mit PHP, stellst
du den Versand auf „Relay“ um; dann erscheint der Abschnitt „Relay“, in dem du das Skript
einrichtest, das die Nachrichten als Mail weitergibt. Ohne PHP geht es über einen Formulardienst
wie Formspree oder Web3Forms.
