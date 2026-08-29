import type { DeployDiffEntry, DeployResult } from '@shared/ipc-contract'
import type { DeployAdapter, DeployContext } from './types'
import { mainT } from '../../i18n'

const TIMEOUT_MS = 30_000
// Enough of the response to see what the provider said, not so much that a HTML error page fills
// the output panel.
const MAX_BODY_CHARS = 2000
// Short enough to catch a real token, long enough to leave ordinary path words ("hooks", "build")
// alone. A credential shorter than this would be no credential.
const MIN_SECRET_SEGMENT = 8

/**
 * Blanks the credential out of anything a provider hands back. The request line already prints
 * only the origin - but the *response* defeated that: webhook.site answers an unconfigured hook
 * with `Change response in <a href="https://webhook.site/#!/edit/<id>">`, and that `<id>` is the
 * same token as the hook URL's own path, merely in a different URL shape. So searching for the
 * secret string as a whole finds nothing; the parts of it that *are* the secret have to be blanked
 * individually. Found in the alpha test, on the one check T3 asks for by name.
 *
 * split/join rather than a regex: these segments come from a stored credential and would otherwise
 * need escaping, which is one more thing to get wrong at exactly the wrong place.
 */
function redact(text: string, secret: URL): string {
  const parts = [
    ...secret.pathname.split('/'),
    ...[...secret.searchParams.values()],
    secret.hash.replace(/^#/, ''),
    secret.username,
    secret.password
  ].filter((part) => part.length >= MIN_SECRET_SEGMENT)

  let out = text
  for (const part of parts) out = out.split(part).join(mainT('webhookRedacted'))
  return out
}

// A webhook doesn't publish anything - it asks someone else to. Netlify, Cloudflare Pages, Vercel
// and every CI runner expose a build hook as "POST to this URL", which is why one adapter covers
// all of them and why the URL itself is the credential: its path *is* the token, so it lives
// encrypted in the connection store and is never shown to the renderer.
export const webhookAdapter: DeployAdapter = {
  // Nothing local to compare. The UI reads an empty diff for this target type as "there is no file
  // list here", not as "everything is up to date" - see Publish.tsx.
  async preview(): Promise<DeployDiffEntry[]> {
    return []
  },

  async run(ctx: DeployContext): Promise<DeployResult> {
    if (ctx.target.destination.type !== 'webhook') throw new Error(mainT('deployWrongType', { adapter: 'Webhook' }))
    if (!ctx.secret) return { success: false, output: mainT('webhookNoUrl') }

    let url: URL
    try {
      url = new URL(ctx.secret)
    } catch {
      return { success: false, output: mainT('webhookInvalidUrl') }
    }
    // The schema already refuses anything but https when the connection is saved; re-checked here
    // because this is the point where the credential actually goes on the wire.
    if (url.protocol !== 'https:') return { success: false, output: mainT('webhookHttpsOnly') }

    ctx.emitProgress(0, 1, url.host)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })
      const body = redact(await response.text(), url).slice(0, MAX_BODY_CHARS)
      ctx.emitProgress(1, 1, url.host)
      // The origin, never the full URL: the path carries the token, and this output is shown and
      // copied around.
      const line = `POST ${url.origin} → ${response.status} ${response.statusText}\n`
      return { success: response.ok, output: body ? `${line}\n${body}` : line }
    } catch (err) {
      const reason =
        err instanceof Error && err.name === 'TimeoutError'
          ? mainT('webhookTimeout', { seconds: String(TIMEOUT_MS / 1000) })
          : redact(String(err), url)
      return { success: false, output: `${mainT('webhookFailed', { origin: url.origin })}\n${reason}` }
    }
  }
}
