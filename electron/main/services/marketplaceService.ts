import type { MarketplacePlugin, MarketplaceResult } from '@shared/ipc-contract'
import * as connectionsService from './connectionsService'

const CACHE_TTL_MS = 15 * 60 * 1000
// Node's fetch has no deadline of its own worth relying on (undici defaults to 300s for headers
// and again for the body), so a connection that stalls rather than fails leaves the Marktplatz
// tab spinning for five minutes with no cancel. Same bound githubService already uses.
const TIMEOUT_MS = 20_000

let cache: { at: number; results: MarketplacePlugin[] } | null = null

// Shown when the GitHub API is unreachable or rate-limited, so the tab is never empty - but it
// travels with `unavailable: true`, because one hard-coded entry presented as the catalog is a
// lie the user cannot see through.
const FALLBACK_PLUGINS: MarketplacePlugin[] = [
  {
    name: 'explorer',
    fullName: 'quartz-community/explorer',
    description: 'Enhanced file explorer for Quartz.',
    url: 'https://github.com/quartz-community/explorer'
  }
]

interface GithubRepo {
  name: string
  full_name: string
  description: string | null
  stargazers_count: number
  html_url: string
  topics?: string[]
  archived?: boolean
}

async function fetchFromGithub(): Promise<{ results: MarketplacePlugin[]; unavailable: boolean }> {
  // Read here rather than passed in from the renderer: the token is a credential, and relaying it
  // out to the renderer and back on every search was one round-trip more exposure than necessary.
  const githubToken = await connectionsService.getGithubToken()
  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
    if (githubToken) headers.Authorization = `Bearer ${githubToken}`
    const res = await fetch('https://api.github.com/orgs/quartz-community/repos?per_page=100', {
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
    if (!res.ok) return { results: FALLBACK_PLUGINS, unavailable: true }
    const repos = (await res.json()) as GithubRepo[]
    if (repos.length === 0) return { results: FALLBACK_PLUGINS, unavailable: true }
    const results = repos.map((r) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description ?? undefined,
      stars: r.stargazers_count,
      url: r.html_url,
      topics: r.topics,
      archived: r.archived
    }))
    return { results, unavailable: false }
  } catch {
    return { results: FALLBACK_PLUGINS, unavailable: true }
  }
}

export async function searchPlugins(query: string): Promise<MarketplaceResult> {
  if (!cache || Date.now() - cache.at > CACHE_TTL_MS) {
    const fetched = await fetchFromGithub()
    // A failed fetch is never cached: retrying costs one request, and someone who fixes their
    // connection should not have to wait out a fifteen-minute window holding a placeholder.
    if (fetched.unavailable) return { plugins: filterPlugins(fetched.results, query), unavailable: true }
    cache = { at: Date.now(), results: fetched.results }
  }
  return { plugins: filterPlugins(cache.results, query), unavailable: false }
}

function filterPlugins(plugins: MarketplacePlugin[], query: string): MarketplacePlugin[] {
  const q = query.trim().toLowerCase()
  if (!q) return plugins
  return plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.fullName.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q)
  )
}

export function invalidateCache(): void {
  cache = null
}
