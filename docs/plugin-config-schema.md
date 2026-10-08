# Describing a plugin's options for QuartzControl

QuartzControl builds the options form of a Quartz plugin from what the plugin's `package.json`
says about its options. This page is for plugin authors: which sources the app reads, and the
`x-quartz-*` keywords it understands on top of JSON Schema. The reader is
`shared/pluginOptionSchema.ts`; this page and the comment at its top describe the same list.

## Where the app looks

In the plugin's `package.json`, under `quartz`, in this order — the first one that describes at
least one option wins:

1. `configSchema` — a JSON Schema for the whole options object (the field Quartz's own
   `PluginManifest` type provides). Local `$ref`s into `$defs`/`definitions` are followed.
2. `optionSchema` — the flat form the `@quartz-community` plugins ship.
3. The type declarations under `dist/` (`*.d.ts`): the type argument of
   `QuartzTransformerPlugin<T>` and its siblings, or the outermost `…Options` interface.

`defaultOptions` is laid over whichever wins and fills what it leaves out. `category` is read as
well: the layout board says with it what switching a component off takes along, because
`enabled: false` switches off the whole plugin.

## Keywords

All of them sit on a property schema, beside `type`, `description` and `default`.

| Keyword | Value | Effect |
| --- | --- | --- |
| `x-quartz-when` | `{ "<sibling>": value \| [values] }` | The field applies only while every named sibling has one of the values. A dotted path walks into objects; an unset sibling counts with its default. A field that does not apply is hidden — unless it is set, then it is shown under "has no effect with this setting". |
| `x-quartz-group` | string | Section heading the field belongs to. |
| `x-quartz-order` | number | Sort key within its object, lower first. |
| `x-quartz-advanced` | `true` | Shown folded away. |
| `x-quartz-widget` | `"snippetFile"`, `"html"`, `"markdown"`, `"glob"` | A richer editor for a string: a file picker for snippets, a multi-line editor, a glob field. |
| `x-quartz-dir-option` | option name | For `snippetFile`: the option that names the snippet directory, looked up in the field's own object first, then in each enclosing one. |
| `x-quartz-keys` | `"languages"` | On an object with only `additionalProperties`: its keys are the site's language codes, offered from a list. |
| `x-quartz-l10n` | `{ "<lang>": { title?, description?, group?, enum?: { "<value>": label } } }` | Texts in the app's other languages; the schema's own `title`/`description` are the English ones. |
| `x-quartz-note` | string | On a schema the app cannot draw as a form: why. It is shown with the JSON field. |

## Example

```json
{
  "quartz": {
    "category": ["component"],
    "configSchema": {
      "type": "object",
      "properties": {
        "variant": {
          "type": "string",
          "enum": ["accordion", "tabs"],
          "default": "accordion",
          "description": "How the navigation is drawn.",
          "x-quartz-l10n": { "de": { "description": "Wie die Navigation gezeichnet wird.", "enum": { "tabs": "Reiter" } } }
        },
        "tabs": {
          "type": "object",
          "x-quartz-when": { "variant": "tabs" },
          "x-quartz-group": "Tabs",
          "properties": { "secondary": { "type": "boolean", "default": false } }
        },
        "file": { "type": "string", "x-quartz-widget": "snippetFile", "x-quartz-dir-option": "dir" }
      }
    }
  }
}
```

## What the app does with what it does not understand

It does not drop it. A schema part it cannot draw becomes a JSON text field; an unknown
`x-quartz-*` keyword, an unknown widget or `keys` value is ignored for the form. Each of these is a
note with the option's path and the reason, and the form says how many notes there are and lists
them. `npm run check:option-schema -- <project> --plugin <name>` prints the same notes from the
command line.
