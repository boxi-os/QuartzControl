import type { GithubAccount, GithubPagesInfo, GithubRepoRef, PluginActionResult } from '@shared/ipc-contract'
import { runCommand as run } from './runCommand'
import * as connectionsService from './connectionsService'
import { mainT } from '../i18n'

const API = 'https://api.github.com'
const TIMEOUT_MS = 20_000

const NO_TOKEN = mainT('githubNoToken')

// Everything here needs a token with repo scope - the same GitHub connection the marketplace uses
// for its rate limit, resolved in main rather than handed around by the renderer.
//
// A missing token is *not* thrown from here. getPagesInfo runs on mount whenever a GitHub branch
// target is selected, and a user who has not entered a token yet would get an error thrown at them
// for a card they were only looking at. The explicit actions (create a repo, save Pages settings)
// report it as a failed result instead, which is where a message about a missing token belongs.

interface ApiResult<T> {
  status: number
  data: T | null
  message?: string
}

async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<ApiResult<T>> {
  const token = await connectionsService.getGithubToken()
  // 401 is exactly what GitHub answers for a bad token, so an absent one takes the same path and
  // every caller's existing error handling covers it.
  if (!token) return { status: 401, data: null, message: NO_TOKEN }

  const response = await fetch(`${API}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      authorization: `Bearer ${token}`,
      ...(init?.body ? { 'content-type': 'application/json' } : {})
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS)
  })

  // 204 (a successful PUT on the Pages config) has no body at all, and an error page need not be
  // JSON either - so the parse is allowed to fail rather than throwing over a successful call.
  let data: unknown = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }
  const message = typeof data === 'object' && data !== null && 'message' in data ? String((data as { message: unknown }).message) : undefined
  return { status: response.status, data: (data as T) ?? null, message }
}

function failure(result: ApiResult<unknown>, fallback: string): PluginActionResult {
  return { success: false, output: result.message ? `${fallback}\n${result.status}: ${result.message}` : `${fallback} (HTTP ${result.status})` }
}

/** Who the stored token belongs to - also the cheapest way to check that it is valid at all. */
export async function getViewer(): Promise<GithubAccount | null> {
  const result = await api<{ login: string; name?: string }>('/user')
  if (result.status !== 200 || !result.data) return null
  return { login: result.data.login, name: result.data.name ?? undefined }
}

// Both URL forms git hands out, plus the ssh:// variant. Deliberately not a single clever regex:
// the scp-like form (git@host:owner/repo) is not a URL and new URL() cannot parse it.
export function parseGithubRemote(url: string): { owner: string; repo: string } | null {
  const cleaned = url.trim().replace(/\.git$/, '')
  const scp = /^[^@]+@github\.com:([^/]+)\/(.+)$/.exec(cleaned)
  if (scp) return { owner: scp[1], repo: scp[2] }
  try {
    const parsed = new URL(cleaned)
    // Exactly github.com (or its www alias) - "api.github.com" is not a repository host, and a
    // suffix match let https://api.github.com/repos/x/y through as owner "repos", repo "x".
    if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') return null
    const [owner, repo] = parsed.pathname.replace(/^\//, '').split('/')
    return owner && repo ? { owner, repo } : null
  } catch {
    return null
  }
}

export async function getOriginRepo(projectPath: string): Promise<GithubRepoRef | null> {
  const origin = await run('git', ['remote', 'get-url', 'origin'], projectPath)
  if (!origin.success) return null
  const parsed = parseGithubRemote(origin.output)
  if (!parsed) return null
  return { ...parsed, htmlUrl: `https://github.com/${parsed.owner}/${parsed.repo}` }
}

// Closes the gap createService opens on purpose: a fresh project has its origin removed (so a
// later Git-Sync push can never reach upstream jackyzha0/quartz), which left "create a repo and
// wire it up" as a trip to github.com and a terminal.
export async function createRepo(
  projectPath: string,
  input: { name: string; private: boolean; description?: string }
): Promise<PluginActionResult> {
  const existing = await run('git', ['remote', 'get-url', 'origin'], projectPath)
  if (existing.success) {
    return {
      success: false,
      output: mainT('githubOriginExists', { remote: existing.output.trim() })
    }
  }

  const result = await api<{ full_name: string; clone_url: string; html_url: string }>('/user/repos', {
    method: 'POST',
    body: { name: input.name, private: input.private, description: input.description, auto_init: false }
  })
  if (result.status !== 201 || !result.data) return failure(result, mainT('githubRepoCreateFailed'))

  // The https clone URL, never one with the token embedded: `git remote -v` prints it, and it
  // would end up in the project's own config file on disk. Authentication goes through the
  // askpass helper at push time instead.
  const added = await run('git', ['remote', 'add', 'origin', result.data.clone_url], projectPath)
  if (!added.success) {
    return { success: false, output: `${mainT('githubRemoteSetFailed', { repo: result.data.full_name })}\n${added.output}` }
  }
  return { success: true, output: `${mainT('githubRepoCreated', { repo: result.data.full_name })}\n${result.data.html_url}` }
}

export async function getPagesInfo(projectPath: string): Promise<GithubPagesInfo | null> {
  const repo = await getOriginRepo(projectPath)
  if (!repo) return null
  const result = await api<{
    status: string | null
    html_url: string
    cname: string | null
    https_enforced: boolean
    source: { branch: string; path: string }
  }>(`/repos/${repo.owner}/${repo.repo}/pages`)

  // 404 is the normal answer for a repo that simply has no Pages site yet, not an error.
  if (result.status === 404) return { configured: false }
  if (result.status !== 200 || !result.data) return { configured: false, error: result.message ?? `HTTP ${result.status}` }
  return {
    configured: true,
    status: result.data.status,
    htmlUrl: result.data.html_url,
    cname: result.data.cname,
    httpsEnforced: result.data.https_enforced,
    sourceBranch: result.data.source?.branch,
    sourcePath: result.data.source?.path
  }
}

// Solves the CNAME problem the branch adapter documents: a Pages deploy replaces the branch
// wholesale, so a CNAME file committed by hand there does not survive - but the custom domain set
// through this API is stored by GitHub, not in the branch, and therefore does.
//
// https_enforced is sent as a *second* request on purpose: GitHub can only enforce HTTPS once it
// has issued a certificate for the domain, which takes minutes after the CNAME is set. Sending
// both at once makes the whole call fail and the domain not get set either.
export async function configurePages(
  projectPath: string,
  input: { branch: string; cname?: string | null; httpsEnforced?: boolean }
): Promise<PluginActionResult> {
  const repo = await getOriginRepo(projectPath)
  if (!repo) return { success: false, output: mainT('githubNoGithubOrigin') }

  const existing = await api<unknown>(`/repos/${repo.owner}/${repo.repo}/pages`)
  const source = { branch: input.branch, path: '/' as const }

  let output = ''
  if (existing.status === 404) {
    const created = await api<unknown>(`/repos/${repo.owner}/${repo.repo}/pages`, { method: 'POST', body: { source } })
    if (created.status !== 201) return failure(created, mainT('githubPagesSetupFailed'))
    output += `GitHub Pages eingerichtet, Quelle: ${input.branch} (/)\n`
  } else {
    const updated = await api<unknown>(`/repos/${repo.owner}/${repo.repo}/pages`, {
      method: 'PUT',
      body: { source, ...(input.cname !== undefined ? { cname: input.cname || null } : {}) }
    })
    if (updated.status !== 204) return failure(updated, mainT('githubPagesSaveFailed'))
    output += `Quelle gesetzt: ${input.branch} (/)\n`
    if (input.cname !== undefined) output += input.cname ? `Domain gesetzt: ${input.cname}\n` : 'Eigene Domain entfernt.\n'
  }

  if (input.httpsEnforced !== undefined) {
    const https = await api<unknown>(`/repos/${repo.owner}/${repo.repo}/pages`, {
      method: 'PUT',
      body: { https_enforced: input.httpsEnforced }
    })
    output +=
      https.status === 204
        ? `${mainT('githubHttpsEnforced', { state: mainT(input.httpsEnforced ? 'githubOn' : 'githubOff') })}\n`
        : `${mainT('githubHttpsPending')}\n${https.message ?? ''}\n`
  }

  return { success: true, output }
}
