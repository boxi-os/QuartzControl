import type { MarketplacePlugin } from '@shared/ipc-contract'

const CACHE_TTL_MS = 15 * 60 * 1000

let cache: { at: number; results: MarketplacePlugin[] } | null = null

// shown when the GitHub API is unreachable or rate-limited, so the marketplace tab is never empty
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
}

async function fetchFromGithub(githubToken?: string): Promise<MarketplacePlugin[]> {
  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' }
    if (githubToken) headers.Authorization = `Bearer ${githubToken}`
    const res = await fetch('https://api.github.com/orgs/quartz-community/repos?per_page=100', { headers })
    if (!res.ok) return FALLBACK_PLUGINS
    const repos = (await res.json()) as GithubRepo[]
    if (repos.length === 0) return FALLBACK_PLUGINS
    return repos.map((r) => ({
      name: r.name,
      fullName: r.full_name,
      description: r.description ?? undefined,
      stars: r.stargazers_count,
      url: r.html_url,
      topics: r.topics
    }))
  } catch {
    return FALLBACK_PLUGINS
  }
}

export async function searchPlugins(query: string, githubToken?: string): Promise<MarketplacePlugin[]> {
  if (!cache || Date.now() - cache.at > CACHE_TTL_MS) {
    cache = { at: Date.now(), results: await fetchFromGithub(githubToken) }
  }
  const q = query.trim().toLowerCase()
  if (!q) return cache.results
  return cache.results.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.fullName.toLowerCase().includes(q) ||
      (p.description ?? '').toLowerCase().includes(q)
  )
}

export function invalidateCache(): void {
  cache = null
}
