import { useSyncExternalStore } from 'react'
import type { TFunction } from 'i18next'

// The way back after the app sent the user somewhere else - "im Layout zeigen", a tile of the
// Übersicht, "in der Liste zeigen" (Nutzerbefund 2026-10-14). One link for all of them, drawn by
// ProjectLayout above the page, so no page has to know it exists; a page that sends somewhere only
// says where it is and where it sends to (markReturn).
//
// A place is a project area plus, on the four pages that have them, a sub-tab - written the way a
// link inside the project says it ('plugins?tab=extras', 'layout?tab=frames', '' for the Übersicht).
// The origin names its tab explicitly, because the tab a page shows is not always in its URL (the
// sidebar carries no search string, the page then falls back to its remembered tab).
//
// Lifetime: the link stands while the user stays on the target - on another page, across that
// page's own tabs; within one page, only on the tab it led to. It is gone once the user goes
// anywhere else: ProjectLayout clears it when the pathname leaves the target, goToTab of the four
// tabbed pages when an in-page jump's tab is left (noteTabChange). Not persisted, like the sticky
// store next to it.

export interface Place {
  area: string
  tab: string | null
}

export interface ReturnLink {
  projectId: string
  from: Place
  to: Place
}

let current: ReturnLink | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function parsePlace(place: string): Place {
  const [area, query = ''] = place.split('?')
  return { area, tab: new URLSearchParams(query).get('tab') }
}

/** Records the way back. Call it right before navigating; `from` and `to` are places as above. */
export function markReturn(projectId: string, from: string, to: string): void {
  current = { projectId, from: parsePlace(from), to: parsePlace(to) }
  emit()
}

export function clearReturn(): void {
  if (current === null) return
  current = null
  emit()
}

/** From a tabbed page's goToTab: an in-page jump's link ends once its tab is left. */
export function noteTabChange(next: string): void {
  if (current && current.from.area === current.to.area && current.to.tab !== next) clearReturn()
}

export function useReturnLink(): ReturnLink | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current
  )
}

export function areaPath(projectId: string, area: string): string {
  return area ? `/project/${projectId}/${area}` : `/project/${projectId}`
}

export function placeHref(projectId: string, place: Place): string {
  return areaPath(projectId, place.area) + (place.tab ? `?tab=${place.tab}` : '')
}

// The sub-tab names, under the keys the pages themselves show them with.
const TAB_LABEL_PREFIX: Record<string, string> = {
  config: 'configEditor.tabs.',
  styles: 'styles.tabs.',
  plugins: 'plugins.tabs.'
}
const LAYOUT_TAB_LABELS: Record<string, string> = {
  overview: 'layoutEditor.tabOverview',
  global: 'layoutEditor.tabGlobal',
  frames: 'layoutEditor.tabFrames'
}

/** "Plugins › Zusätzliche Inhalte" - the sidebar's name, and the sub-tab's where there is one. */
export function placeLabel(t: TFunction, place: Place): string {
  const area = t(`projectLayout.tabs.${place.area || 'overview'}`)
  if (!place.tab) return area
  const key = place.area === 'layout' ? LAYOUT_TAB_LABELS[place.tab] : TAB_LABEL_PREFIX[place.area] && TAB_LABEL_PREFIX[place.area] + place.tab
  return key ? `${area} › ${t(key)}` : area
}
