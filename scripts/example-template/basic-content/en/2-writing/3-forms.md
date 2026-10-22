---
title: Forms
description: A contact form that does not send anything yet.
tags:
  - writing
section: Writing
translationKey: formulare
lang: en
---

Below this paragraph is the form `kontakt` from the quartz-forms plugin. It does not send
anything yet: after you submit it, it shows how the message would have arrived.

```quartz-form
kontakt
```

## Where it comes from

It is embedded with a code block in the language `quartz-form` that holds nothing but the
form's id. Fields, texts and sending are set in QuartzControl under *Plugins → Forms*.

## To make it really send

Under “Sending”, all forms are set to “Demo”. If you have web space with PHP, set up the script
that passes the messages on as mail in the “Relay” section, and switch sending to “Relay”.
Without PHP, a form service such as Formspree or Web3Forms works too.
