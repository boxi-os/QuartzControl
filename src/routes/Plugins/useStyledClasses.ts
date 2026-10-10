import { useEffect, useState } from 'react'
import { CLASS_PREFIXES } from './instanceClass'

const NONE: ReadonlySet<string> = new Set()

/**
 * The instance-class names the project's stylesheets and plugins already name, read once per
 * mount: a class this page gives is in the config from then on, and uniqueClass() sees it there.
 * Empty until the answer is in and when it fails - the config alone still keeps a name unique
 * among the entries, which is what it did before (review 2026-10-18, Niedrig 2).
 */
export function useStyledClasses(projectPath: string): ReadonlySet<string> {
  const [styled, setStyled] = useState<ReadonlySet<string>>(NONE)
  useEffect(() => {
    let live = true
    window.quartzGui.styles
      .takenClasses({ projectPath, prefixes: CLASS_PREFIXES })
      .then((list) => live && setStyled(new Set(list)))
      .catch((err) => console.error('[instance class] could not read the styled classes:', err))
    return () => {
      live = false
    }
  }, [projectPath])
  return styled
}
