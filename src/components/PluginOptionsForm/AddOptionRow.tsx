import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, TextInput } from '../ui'

// A hand-typed option value arrives as a string but the config is typed YAML, so "true" has to
// become a boolean and "3" a number - otherwise the plugin reads a string where it expects
// neither. JSON covers arrays/objects; anything else stays the literal string it was typed as.
export function parseOptionValue(raw: string): unknown {
  const text = raw.trim()
  if (text === 'true') return true
  if (text === 'false') return false
  if (text !== '' && !Number.isNaN(Number(text))) return Number(text)
  if (/^[[{"]/.test(text)) {
    try {
      return JSON.parse(text)
    } catch {
      return raw
    }
  }
  return raw
}

// A key no schema names, typed in by hand - the way in for an option a plugin does not describe.
export function AddOptionRow({
  existingKeys,
  onAdd
}: {
  existingKeys: string[]
  onAdd: (key: string, value: unknown) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const trimmed = key.trim()
  const duplicate = existingKeys.includes(trimmed)

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-ink/10 pt-3 dark:border-ink/10">
      {/* aria-label rather than a visible label: the row is one line of controls with no column to
          put a label in, and a placeholder is not a name - it disappears the moment anyone types. */}
      <TextInput
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder={t('pluginsInstalled.optionKeyPlaceholder')}
        aria-label={t('pluginsInstalled.optionKeyPlaceholder')}
        className="w-40 font-mono"
      />
      <TextInput
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('pluginsInstalled.optionValuePlaceholder')}
        aria-label={t('pluginsInstalled.optionValuePlaceholder')}
        className="w-56 font-mono"
      />
      <Button
        variant="ghost"
        disabled={trimmed === '' || duplicate}
        onClick={() => {
          onAdd(trimmed, parseOptionValue(value))
          setKey('')
          setValue('')
        }}
      >
        {t('pluginsInstalled.addOption')}
      </Button>
      <p className="text-micro text-text-muted">
        {duplicate ? t('pluginsInstalled.optionKeyExists') : t('pluginsInstalled.optionValueHint')}
      </p>
    </div>
  )
}
