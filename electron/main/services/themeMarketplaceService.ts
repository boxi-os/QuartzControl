import { spawn } from 'child_process'
import * as connectionsService from './connectionsService'
import { needsShell, runCommand } from './runCommand'
import type { PluginActionResult, QuartzThemeListing, ThemeCatalogResult, ThemeDetail } from '@shared/ipc-contract'
import { getLocalThemeDetail } from './pluginSchemaService'

const CACHE_TTL_MS = 15 * 60 * 1000
const DETAIL_CACHE_TTL_MS = 60 * 60 * 1000
// See marketplaceService: undici's own 300s defaults are not a timeout a user waits out.
const TIMEOUT_MS = 20_000
// `npm search` talks to the registry and has no timeout of its own either - and unlike a fetch it
// cannot even be aborted, so without this the Community-Themes tab could wait forever on a stalled
// registry connection. Generous, because a cold npm process plus a registry round trip is slow.
const NPM_SEARCH_TIMEOUT_MS = 30_000

let cache: { at: number; results: QuartzThemeListing[] } | null = null
let githubCache: { at: number; byRepoName: Map<string, GithubRepoMeta> } | null = null
const detailCache = new Map<string, { at: number; detail: ThemeDetail | null }>()

interface GithubRepoMeta {
  stars: number
  topics: string[]
  description?: string
}

// Shown when npm is unreachable, so the picker is never empty. A handful of well-known themes -
// "default" is what @quartz-themes/core auto-installs on first use if none is specified. Seven
// entries next to the ~700 the registry really holds is obviously not the catalog, but only if
// the reader knows that - so this list always travels with `unavailable: true`.
const FALLBACK_THEMES: QuartzThemeListing[] = [
  { id: 'default' },
  { id: 'tokyo-night' },
  { id: 'catppuccin' },
  { id: 'nord' },
  { id: 'everforest' },
  { id: 'minimal' },
  { id: 'obsidian' }
]

interface NpmSearchResult {
  name: string
  description?: string
}

// @quartz-themes/<id> packages aren't installed via the `quartz plugin add` CLI - they're plain
// npm dependencies consumed by the (separately installed) @quartz-themes/core plugin. `npm search`
// against the registry is the only enumeration mechanism available (there's no GitHub org to list
// the way marketplaceService.ts does for @quartz-community, since these are individual npm
// packages, not necessarily one-repo-per-theme on GitHub).
function fetchFromNpm(): Promise<{ results: QuartzThemeListing[]; unavailable: boolean }> {
  return new Promise((resolvePromise) => {
    const child = spawn('npm', ['search', '@quartz-themes', '--json', '--searchlimit=250'], {
      shell: needsShell('npm'),
      stdio: ['ignore', 'pipe', 'ignore']
    })
    let output = ''
    let settled = false
    const answer = (value: { results: QuartzThemeListing[]; unavailable: boolean }): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolvePromise(value)
    }
    const timer = setTimeout(() => {
      answer({ results: FALLBACK_THEMES, unavailable: true })
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 2000).unref()
    }, NPM_SEARCH_TIMEOUT_MS)
    timer.unref()
    child.stdout?.on('data', (chunk: Buffer) => (output += chunk.toString()))
    child.on('close', () => {
      try {
        const parsed = JSON.parse(output) as NpmSearchResult[]
        const themes = parsed
          .filter((p) => p.name.startsWith('@quartz-themes/') && p.name !== '@quartz-themes/core')
          .map((p) => ({ id: p.name.slice('@quartz-themes/'.length), description: p.description }))
        answer(themes.length > 0 ? { results: themes, unavailable: false } : { results: FALLBACK_THEMES, unavailable: true })
      } catch {
        answer({ results: FALLBACK_THEMES, unavailable: true })
      }
    })
    child.on('error', () => answer({ results: FALLBACK_THEMES, unavailable: true }))
  })
}

interface GithubRepo {
  name: string
  stargazers_count: number
  topics?: string[]
  description: string | null
}

// All @quartz-themes/<id> packages have a matching github.com/quartz-themes/<id> repo (verified:
// repo name equals the npm package's unscoped name for every theme sampled), so paginating the
// org's repo list once covers every theme in a handful of calls instead of one request per theme.
// In practice almost none of these repos carry topics or a description, and stars sit at 0-1
// (sampled tokyo-night/catppuccin/obsidian/nord/minimal/default and 5 more at random) - real, but
// sparse; callers should not assume every theme gets a badge.
async function fetchGithubMetadata(): Promise<Map<string, GithubRepoMeta>> {
  const githubToken = await connectionsService.getGithubToken()
  const byRepoName = new Map<string, GithubRepoMeta>()
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`

  try {
    for (let page = 1; page <= 5; page++) {
      const res = await fetch(`https://api.github.com/orgs/quartz-themes/repos?per_page=100&page=${page}`, {
        headers,
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })
      if (!res.ok) break
      const repos = (await res.json()) as GithubRepo[]
      if (repos.length === 0) break
      for (const r of repos) {
        byRepoName.set(r.name, {
          stars: r.stargazers_count,
          topics: r.topics ?? [],
          description: r.description ?? undefined
        })
      }
      if (repos.length < 100) break
    }
  } catch {
    // leave whatever was collected before the failure - partial metadata beats none
  }
  return byRepoName
}

export async function listThemes(): Promise<ThemeCatalogResult> {
  let unavailable = false
  if (!cache || Date.now() - cache.at > CACHE_TTL_MS) {
    const fetched = await fetchFromNpm()
    // A failed `npm search` is never cached: it used to hold the seven-entry placeholder for
    // fifteen minutes with nothing in the app able to clear it - invalidateCache() was exported
    // and called from nowhere.
    unavailable = fetched.unavailable
    if (!unavailable) cache = { at: Date.now(), results: fetched.results }
    else return { themes: fetched.results, unavailable: true }
  }
  if (!githubCache || Date.now() - githubCache.at > CACHE_TTL_MS) {
    githubCache = { at: Date.now(), byRepoName: await fetchGithubMetadata() }
  }
  const themes = cache!.results.map((t) => {
    const gh = githubCache!.byRepoName.get(t.id)
    if (!gh) return t
    return {
      ...t,
      stars: gh.stars,
      topics: gh.topics.length > 0 ? gh.topics : undefined,
      githubDescription: gh.description
    }
  })
  return { themes, unavailable: false }
}

export function invalidateCache(): void {
  cache = null
  githubCache = null
  detailCache.clear()
}

// Prefers the locally installed theme.json (no network) and only reaches out to jsdelivr for a
// theme the project doesn't have installed yet - used by the catalog's detail panel so a user can
// see modes/variations/style-settings-support/fonts before installing. jsdelivr verified working
// directly (unpkg intermittently 500'd on this ~500KB file; jsdelivr returned 200 reliably, ~1.3s).
export async function getThemeDetail(projectPath: string, themeId: string): Promise<ThemeDetail | null> {
  const local = getLocalThemeDetail(projectPath, themeId)
  if (local) return local

  const cached = detailCache.get(themeId)
  if (cached && Date.now() - cached.at < DETAIL_CACHE_TTL_MS) return cached.detail

  let detail: ThemeDetail | null = null
  try {
    const res = await fetch(`https://cdn.jsdelivr.net/npm/@quartz-themes/${themeId}/theme.json`, {
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
    if (res.ok) {
      const parsed = (await res.json()) as {
        meta?: { styleSettingsId?: string | string[]; modes?: string[]; variations?: string[]; fonts?: string[] }
      }
      const rawId = parsed.meta?.styleSettingsId
      detail = {
        modes: parsed.meta?.modes ?? [],
        variations: parsed.meta?.variations ?? [],
        styleSettingsId: rawId == null ? [] : Array.isArray(rawId) ? rawId : [rawId],
        fonts: parsed.meta?.fonts ?? []
      }
    }
  } catch {
    // Not cached: a network blip would otherwise mean "this theme has no details" for a whole
    // hour, with no way to ask again.
    return null
  }
  detailCache.set(themeId, { at: Date.now(), detail })
  return detail
}

// Installs both the theme package and @quartz-themes/core (idempotent if core is already a
// dependency - npm just no-ops on a version it already has) since a theme package alone does
// nothing without the transformer plugin that consumes it.
export function installTheme(projectPath: string, themeId: string): Promise<PluginActionResult> {
  return runCommand('npm', ['install', '@quartz-themes/core', `@quartz-themes/${themeId}`], projectPath)
}
