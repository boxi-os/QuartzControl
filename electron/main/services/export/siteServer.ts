import { createServer, type Server } from 'http'
import { constants, createReadStream } from 'fs'
import { cp, mkdtemp, rm, stat } from 'fs/promises'
import { tmpdir } from 'os'
import { extname, isAbsolute, join, relative } from 'path'

/**
 * The built site, served to the export window from a copy.
 *
 * A copy, because the build folder has a writer of its own: `quartz build --serve` rewrites
 * public/ on every change, and an export that read page 30 of one build and page 31 of the next
 * would print a document no build ever was. On APFS and btrfs the copy is a clone
 * (COPYFILE_FICLONE) and costs next to nothing; elsewhere it is a plain copy.
 *
 * Served over http on 127.0.0.1 rather than file://, because a Quartz site resolves its links,
 * scripts and contentIndex.json against a web root. Paths resolve like a static host: `/a` is
 * `a.html`, `/a/` is `a/index.html`. Documents the export assembles itself are served from memory
 * under `/__quartzcontrol/`, and that prefix is answered from memory before any file is looked at,
 * so a content folder of the same name cannot stand in for them.
 */

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8'
}

export const OWN_PREFIX = '/__quartzcontrol/'

export interface SiteServer {
  origin: string
  /** The copy the server reads from. */
  root: string
  /** Serves `html` at `${origin}${OWN_PREFIX}${name}` until replaced. */
  setDocument(name: string, html: string): string
  close(): Promise<void>
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

async function resolveFile(root: string, pathname: string): Promise<string | null> {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const base = join(root, decoded)
  const rel = relative(root, base)
  if (rel.startsWith('..') || isAbsolute(rel)) return null
  const candidates = decoded.endsWith('/') ? [join(base, 'index.html')] : [base, `${base}.html`, join(base, 'index.html')]
  for (const c of candidates) if (await isFile(c)) return c
  return null
}

export async function serveSiteCopy(buildDir: string): Promise<SiteServer> {
  const root = await mkdtemp(join(tmpdir(), 'quartzcontrol-export-'))
  try {
    await cp(buildDir, root, { recursive: true, mode: constants.COPYFILE_FICLONE, verbatimSymlinks: true })
  } catch (err) {
    await rm(root, { recursive: true, force: true })
    throw err
  }
  const docs = new Map<string, string>()
  const server: Server = createServer((req, res) => {
    void (async () => {
      const pathname = new URL(req.url ?? '/', 'http://x').pathname
      if (pathname.startsWith(OWN_PREFIX)) {
        const html = docs.get(pathname.slice(OWN_PREFIX.length))
        if (html === undefined) return res.writeHead(404).end()
        return res.writeHead(200, { 'content-type': TYPES['.html'] }).end(html)
      }
      const file = await resolveFile(root, pathname)
      if (!file) return res.writeHead(404).end()
      res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' })
      createReadStream(file).on('error', () => res.destroy()).pipe(res)
    })().catch(() => res.writeHead(500).end())
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0
  const origin = `http://127.0.0.1:${port}`
  return {
    origin,
    root,
    setDocument(name, html) {
      docs.set(name, html)
      return `${origin}${OWN_PREFIX}${name}`
    },
    async close() {
      // The window keeps its connections alive; without closing them, close() waits for them.
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
      await rm(root, { recursive: true, force: true })
    }
  }
}
