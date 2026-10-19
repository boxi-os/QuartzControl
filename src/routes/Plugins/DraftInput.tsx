import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { TextInput } from '../../components/ui'

/** A text field that writes when it is left or Return is pressed, not on every key. */
export function DraftInput({
  value,
  onCommit,
  ...rest
}: {
  value: string
  onCommit: (value: string) => void
  placeholder?: string
  'aria-invalid'?: boolean
  onDraft?: (value: string) => void
}): JSX.Element {
  const [draft, setDraft] = useState(value)
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setDraft(value)
  }, [value])
  const { onDraft, ...inputProps } = rest
  return (
    <TextInput
      {...inputProps}
      value={draft}
      onFocus={() => {
        focused.current = true
      }}
      onChange={(e) => {
        setDraft(e.target.value)
        onDraft?.(e.target.value)
      }}
      onBlur={() => {
        focused.current = false
        if (draft !== value) onCommit(draft)
      }}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}
