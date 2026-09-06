import { execFile } from 'child_process'
import { createConnection } from 'net'
import { get as httpGet } from 'http'
import { readlink } from 'fs/promises'
import { resolve } from 'path'
import treeKill from 'tree-kill'
import type { DiscoveredServer, ServerDiscovery, ServerKillResult } from '@shared/ipc-contract'
import * as projectStore from './projectStore'
import { ownedServerPids, stopServer } from './buildService'

// Finds Quartz dev servers running on this machine, whichever way they were started - this app,
// a terminal, a second window, a previous run that was force-quit. buildService's orphan check
// answers a narrower question (are the pids *we* wrote down still alive), and by design it can
// only ever see servers this app started; a server someone started in a terminal was invisible,
// which is exactly the situation that made the port look mysteriously taken.
//
// What this reads, measured on macOS 26 with a server started as `npx quartz build --serve
// --port 8099 --wsPort 3099`:
//
//   12877     1  npm exec quartz build --serve --port 8099 --wsPort 3099
//   12893 12877  node --no-deprecation …/.bin/quartz build --serve --port 8099 --wsPort 3099
//
// Both lines carry the needles, the child holds both ports, and both carry the port numbers in
// their arguments - so for a server started with flags the ports come from the command line and no
// socket table is needed. `lsof` answers two narrower questions: the working directory (only where
// /proc is absent), and which ports a candidate that named none actually holds - see resolveGroups.

const PS_TIMEOUT_MS = 4_000
const CWD_TIMEOUT_MS = 2_000
const LSOF_TIMEOUT_MS = 2_000
const PROBE_TIMEOUT_MS = 1_500
const PROBE_MAX_BYTES = 64 * 1024

interface PsRow {
  pid: number
  ppid: number
  /** Seconds since the process started, from ps's `etime`. */
  elapsedSeconds: number
  command: string
}

function execFileText(file: string, args: string[], timeout: number): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    // execFile, never a shell: every value that reaches this file comes from a process table or
    // from a pid the renderer sent, and a shell would give both a way to mean something else.
    execFile(file, args, { timeout, maxBuffer: 8 * 1024 * 1024, encoding: 'utf-8' }, (error, stdout) => {
      if (error) rejectPromise(error)
      else resolvePromise(stdout)
    })
  })
}

// ps prints elapsed time as [[dd-]hh:]mm:ss. Deliberately not `lstart`: that is a locale-formatted
// date ("So.  6 Sep. 16:56:53 2026" on this machine) and parsing it would depend on the user's
// language. Elapsed time is the same everywhere.
function parseElapsed(text: string): number {
  const [days, clock] = text.includes('-') ? text.split('-') : ['0', text]
  const parts = clock.split(':').map((p) => Number.parseInt(p, 10))
  if (parts.some((p) => Number.isNaN(p))) return Number.NaN
  const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1]]
  return Number(days) * 86_400 + h * 3600 + m * 60 + s
}

async function readProcessTable(): Promise<PsRow[]> {
  // -ww so a long command line is not cut off at the terminal width; the port arguments sit at
  // the end of it, which is precisely the part a truncation would take.
  const stdout = await execFileText('ps', ['-ww', '-Ao', 'pid=,ppid=,etime=,command='], PS_TIMEOUT_MS)
  const rows: PsRow[] = []
  for (const line of stdout.split('\n')) {
    const match = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line)
    if (!match) continue
    rows.push({
      pid: Number(match[1]),
      ppid: Number(match[2]),
      elapsedSeconds: parseElapsed(match[3]),
      command: match[4]
    })
  }
  return rows
}

// `--serve` as a whole word, not as a substring: `appleeventsd --server` is in every macOS process
// table and would otherwise match. Both needles together, because "quartz" alone appears in any
// path under a folder named after it - `~/Documents/quartz-vorlage-gegenprobe`, or any
// `node_modules/quartz`.
//
// Lowercased first, which is not cosmetic: this used to name `Quartz-GUI` as the example of what
// the second needle guards against, and a case-sensitive `includes('quartz')` never matched that
// at all - nor `QuartzControl`, nor a project a user keeps in a folder with a capital Q, which is
// the case that mattered. Measured with a listening process started from a directory called
// QuartzProjekte, whose command line carries `--serve --port 8131` and no lowercase "quartz" at
// all: the old scan found nothing on that port, this one finds it.
function looksLikeQuartzServer(command: string): boolean {
  const lowered = command.toLowerCase()
  return lowered.includes('quartz') && /(?:^|\s)--serve(?:\s|$)/.test(lowered)
}

function readPortArg(command: string, flag: string): number | undefined {
  const match = new RegExp(`(?:^|\\s)--${flag}(?:=|\\s+)(\\d{1,5})(?:\\s|$)`).exec(command)
  if (!match) return undefined
  const port = Number(match[1])
  return port >= 1 && port <= 65535 ? port : undefined
}

async function readCwd(pid: number): Promise<string | undefined> {
  if (process.platform === 'linux') {
    try {
      return await readlink(`/proc/${pid}/cwd`)
    } catch {
      return undefined
    }
  }
  try {
    // -Fn prints one field per line, so the path needs no splitting on whitespace and survives a
    // directory name with spaces in it.
    const stdout = await execFileText('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], CWD_TIMEOUT_MS)
    const line = stdout.split('\n').find((l) => l.startsWith('n'))
    return line ? line.slice(1) : undefined
  } catch {
    return undefined
  }
}

function probeTcp(port: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    let settled = false
    const socket = createConnection({ port, host: '127.0.0.1' })
    const finish = (open: boolean): void => {
      if (settled) return
      settled = true
      socket.destroy()
      resolvePromise(open)
    }
    socket.setTimeout(PROBE_TIMEOUT_MS)
    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
    socket.once('timeout', () => finish(false))
  })
}

interface HttpProbe {
  reachable: boolean
  siteTitle?: string
  quartzGenerator?: boolean
}

// Confirms from the outside what the process table says from the inside, and picks up the site's
// own name on the way. Quartz's Head component writes `<meta name="generator" content="Quartz"/>`
// into every page (measured against a running server), which is what tells a Quartz site apart
// from any other thing answering on that port. It says nothing about the server being a *dev*
// server - a statically served build looks identical - so it confirms, it never decides.
function probeHttp(port: number): Promise<HttpProbe> {
  return new Promise((resolvePromise) => {
    let settled = false
    const finish = (result: HttpProbe): void => {
      if (settled) return
      settled = true
      resolvePromise(result)
    }
    const request = httpGet({ host: '127.0.0.1', port, path: '/', timeout: PROBE_TIMEOUT_MS }, (response) => {
      let body = ''
      response.setEncoding('utf-8')
      response.on('data', (chunk: string) => {
        body += chunk
        if (body.length >= PROBE_MAX_BYTES) {
          // The head is all this needs; a large page would otherwise be read in full for nothing.
          response.destroy()
          request.destroy()
          finish(readMarkers(body))
        }
      })
      response.on('end', () => finish(readMarkers(body)))
      response.on('error', () => finish({ reachable: true }))
    })
    request.on('timeout', () => {
      request.destroy()
      finish({ reachable: false })
    })
    request.on('error', () => finish({ reachable: false }))
  })
}

function readMarkers(body: string): HttpProbe {
  const title = /<title>([^<]*)<\/title>/i.exec(body)
  return {
    reachable: true,
    siteTitle: title ? title[1].trim() || undefined : undefined,
    quartzGenerator: /<meta\s+name="generator"\s+content="Quartz"/i.test(body)
  }
}

interface Group {
  root: PsRow
  listener: PsRow
  port: number
  wsPort?: number
}

interface Candidate {
  root: PsRow
  listener: PsRow
  /** From the command line, or undefined when the process was started without the flag. */
  argPort?: number
  argWsPort?: number
}

// What quartz uses when the flag is absent - the same two numbers buildService passes explicitly.
const DEFAULT_PORT = 8080
const DEFAULT_WS_PORT = 3001

// One entry per server, not per process: a server started through npx is two processes that carry
// the same arguments, and listing both would offer to stop the same thing twice. The root is what
// gets signalled - tree-kill takes the child with it, and killing the child alone would leave the
// wrapper behind.
function groupCandidates(rows: PsRow[]): Candidate[] {
  const candidates = new Map<number, PsRow>()
  for (const row of rows) if (looksLikeQuartzServer(row.command)) candidates.set(row.pid, row)

  const groups = new Map<number, Candidate>()
  for (const row of candidates.values()) {
    let root = row
    const seen = new Set<number>([row.pid])
    while (candidates.has(root.ppid) && !seen.has(root.ppid)) {
      seen.add(root.ppid)
      root = candidates.get(root.ppid)!
    }
    const argPort = readPortArg(row.command, 'port')
    const argWsPort = readPortArg(row.command, 'wsPort')
    const existing = groups.get(root.pid)
    // The deepest process in the group is the one holding the ports; ps lists parents first, so
    // a later row of the same group replaces the earlier one.
    if (!existing || row.pid !== root.pid) groups.set(root.pid, { root, listener: row, argPort, argWsPort })
  }
  return [...groups.values()]
}

// The TCP ports a process listens on. Asked only of a candidate that did not name its port, so the
// common case - a server this app or a user started with --port, which every one of them carries -
// still costs no lsof at all.
async function listeningPorts(pid: number): Promise<number[]> {
  try {
    // -Fn prints one field per line; -P and -n keep ports and addresses numeric, so the line is
    // `n*:8080` or `n127.0.0.1:8080` and never a service name from /etc/services.
    const stdout = await execFileText(
      'lsof',
      ['-a', '-p', String(pid), '-iTCP', '-sTCP:LISTEN', '-P', '-n', '-Fn'],
      LSOF_TIMEOUT_MS
    )
    const ports: number[] = []
    for (const line of stdout.split('\n')) {
      const match = /^n.*:(\d{1,5})$/.exec(line)
      if (match) ports.push(Number(match[1]))
    }
    return ports
  } catch {
    // lsof missing, or no open file matched - "no port established" either way, which is what the
    // caller does with an empty list.
    return []
  }
}

/**
 * Turns candidates into servers, and drops the ones whose port cannot be established.
 *
 * A candidate that named no `--port` used to be *given* 8080, which then got probed - so a process
 * that merely carried "quartz" in its path and `--serve` somewhere in its arguments was listed as
 * a server on 8080, wearing the title and generator mark of whatever really answered there, and
 * offering a Beenden that killed it. Measured with `sh -c 'sleep 40 # …/Example --serve'`: one
 * server, port 8080, `reachable: false` the only hint. The default is still the right guess, but
 * it has to be confirmed - the process must actually hold the port for it to mean anything, and
 * the socket table is the only thing that knows.
 */
async function resolveGroups(candidates: Candidate[]): Promise<Group[]> {
  const groups = await Promise.all(
    candidates.map(async (candidate): Promise<Group | null> => {
      if (candidate.argPort !== undefined) {
        return { root: candidate.root, listener: candidate.listener, port: candidate.argPort, wsPort: candidate.argWsPort }
      }
      const held = await listeningPorts(candidate.listener.pid)
      if (!held.includes(DEFAULT_PORT)) return null
      return {
        root: candidate.root,
        listener: candidate.listener,
        port: DEFAULT_PORT,
        wsPort: candidate.argWsPort ?? (held.includes(DEFAULT_WS_PORT) ? DEFAULT_WS_PORT : undefined)
      }
    })
  )
  return groups.filter((group): group is Group => group !== null)
}

export async function discoverServers(ports: number[] = []): Promise<ServerDiscovery> {
  if (process.platform === 'win32') {
    // Win32_Process would answer the same question through PowerShell, but nothing here has ever
    // run on Windows and an unmeasured scan that reports "none" would be worse than saying so.
    return { state: 'unavailable', reason: 'process table scan not implemented on Windows', servers: [], occupiedPorts: [] }
  }

  let rows: PsRow[]
  try {
    rows = await readProcessTable()
  } catch (error) {
    return { state: 'unavailable', reason: `ps failed: ${(error as Error).message}`, servers: [], occupiedPorts: [] }
  }

  const groups = await resolveGroups(groupCandidates(rows))
  const owned = ownedServerPids()
  const projects = await projectStore.listProjects()
  const now = Date.now()

  const servers = await Promise.all(
    groups.map(async (group): Promise<DiscoveredServer> => {
      const [cwd, probe] = await Promise.all([readCwd(group.listener.pid), probeHttp(group.port)])
      const project = cwd ? projects.find((p) => resolve(p.path) === resolve(cwd)) : undefined
      const elapsed = group.listener.elapsedSeconds
      return {
        pid: group.root.pid,
        listenerPid: group.listener.pid,
        port: group.port,
        wsPort: group.wsPort,
        cwd,
        projectId: project?.id ?? owned.get(group.root.pid),
        projectName: project?.name,
        startedAt: Number.isNaN(elapsed) ? undefined : new Date(now - elapsed * 1000).toISOString(),
        ownedByApp: owned.has(group.root.pid),
        reachable: probe.reachable,
        siteTitle: probe.siteTitle,
        quartzGenerator: probe.quartzGenerator
      }
    })
  )

  // Only ports no discovered server explains: those are the ones where "taken" is news.
  const taken = new Set(servers.flatMap((s) => [s.port, s.wsPort ?? 0]))
  const unexplained = [...new Set(ports)].filter((port) => !taken.has(port))
  const occupiedPorts = (await Promise.all(unexplained.map(async (port) => ((await probeTcp(port)) ? port : null))))
    .filter((port): port is number => port !== null)

  return { state: 'ok', servers, occupiedPorts }
}

export async function killServer(pid: number): Promise<ServerKillResult> {
  const ownedProjectId = ownedServerPids().get(pid)
  // A server this app started is stopped the way the Stop button stops it, so its status, its log
  // and the tracking store stay in step. Signalling it behind buildService's back would leave the
  // page showing "läuft" for a process that is gone.
  if (ownedProjectId) {
    await stopServer(ownedProjectId)
    return { stopped: true, projectId: ownedProjectId }
  }

  // Re-checked here, not trusted from the listing: pids are recycled, and between the scan that
  // filled the list and this click the number may belong to something else entirely. The gate is
  // the whole of what the listing does, run again against a freshly read process table, rather
  // than the needle alone - the needle is deliberately wide (a folder with a capital Q in its
  // path is enough for half of it), and what may be signalled has to be exactly what was offered:
  // a group whose port could be established. The port itself is not checked against the click,
  // because the click carries only a pid; being a root of a resolved group is the condition.
  let groups: Group[]
  try {
    groups = await resolveGroups(groupCandidates(await readProcessTable()))
  } catch {
    return { stopped: false }
  }
  if (!groups.some((group) => group.root.pid === pid)) return { stopped: false }

  return new Promise((resolvePromise) => {
    try {
      // Same shape as killOrphanedServers in buildService, and for the same reason: tree-kill
      // rethrows anything but ESRCH out of a callback nothing else can catch.
      treeKill(pid, 'SIGTERM', (error) => {
        if (error) console.error(`[main] could not stop discovered server ${pid}:`, error)
        resolvePromise({ stopped: !error })
      })
    } catch (error) {
      console.error(`[main] could not stop discovered server ${pid}:`, error)
      resolvePromise({ stopped: false })
    }
  })
}
