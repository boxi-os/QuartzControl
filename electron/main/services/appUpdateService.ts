// Whether a newer build of QuartzControl exists. Not an updater - an answer.
//
// The beta has no update mechanism, which during a beta is the wrong shape of problem: a fix means
// telling every tester by hand, and the ones who miss the mail keep reporting a finding that is
// already closed. A full auto-updater is a large piece of work with a signing requirement this app
// deliberately does not meet yet. This is the small half of it: a file in the same public
// repository the example template comes from, one HTTPS request, and a line on the start screen.
//
// It never downloads and never installs. What it does is stop a tester from spending an evening on
// a bug that was fixed a week ago.
import { app, net } from 'electron'
import type { AppUpdateStatus } from '@shared/ipc-contract'
import { isNewerVersion } from '@shared/semver'

const LATEST_URL = 'https://raw.githubusercontent.com/boxi-os/quartzcontrol-templates/main/latest.json'
const TIMEOUT_MS = 8000
// Long enough that the start screen does not ask on every visit, short enough that a tester who
// leaves the app open for a workday still learns about a build made that morning.
const MAX_AGE_MS = 6 * 60 * 60 * 1000

interface Latest {
  version?: string
  url?: string
  notes?: string
}

let cache: { at: number; status: AppUpdateStatus } | null = null

/**
 * Answers `unknown` on every failure rather than "up to date". "Could not check" is not "all
 * good" - the rule this app follows everywhere it asks something it may not get an answer to.
 */
export async function checkAppUpdate(force = false): Promise<AppUpdateStatus> {
  const current = app.getVersion()
  if (!force && cache && Date.now() - cache.at < MAX_AGE_MS) return cache.status

  let status: AppUpdateStatus
  try {
    const res = await net.fetch(LATEST_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) {
      status = { state: 'unknown', current }
    } else {
      const latest = (await res.json()) as Latest
      const version = typeof latest.version === 'string' ? latest.version : ''
      const url = typeof latest.url === 'string' && latest.url.startsWith('https://') ? latest.url : undefined
      status = isNewerVersion(version, current)
        ? { state: 'newer', current, latest: version, url, notes: typeof latest.notes === 'string' ? latest.notes : undefined }
        : { state: 'current', current, latest: version || undefined }
    }
  } catch {
    status = { state: 'unknown', current }
  }
  cache = { at: Date.now(), status }
  return status
}
