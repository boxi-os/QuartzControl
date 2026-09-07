import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { extname, isAbsolute, join, relative, resolve } from 'node:path'

/**
 * Serves the bundled handbook over http on the loopback interface.
 *
 * Why a server for a directory of files: what `npm run build:handbook` produces is a Quartz
 * website, and a Quartz website is written for a web server. A link to a page is `./tags/publishing`
 * without an extension, a link to a chapter is `./4-gestaltung/` (a directory whose index.html the
 * server picks), and the chapter cards on the start page point at `/4-gestaltung/` - the root of the
 * *site*. Under `file://` none of those resolve: measured over the 123 built pages on 2026-09-08,
 * of 4876 links 377 were external, 951 landed on a directory (Chrome shows its file listing), 2937
 * on a name with no file behind it, 611 at the root of the filesystem - and not one on a file.
 * Chrome also refuses the page's own module scripts under `file://` ("origin 'null' ... blocked by
 * CORS policy"), which takes search, the explorer, the language switch and the dark-mode toggle
 * with it. A real origin answers all of that at once, and `http:` always opens the browser, whereas
 * `shell.openPath` on an .html opens whatever the OS has registered for public.html - an editor,
 * for someone who builds websites.
 *
 * What this is not: a way into this machine. It binds 127.0.0.1 (never 0.0.0.0), answers only GET
 * and HEAD, resolves every path inside the handbook directory and nothing else, and sends no
 * Access-Control-Allow-Origin - so a page in a browser cannot read it cross-origin. What a
 * top-level navigation to it shows is the documentation that ships with the app.
 */

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
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
  '.map': 'application/json; charset=utf-8'
}

/**
 * The file a request path means, or null if there is none inside the handbook.
 *
 * The three shapes Quartz writes, in the order a web server tries them: the file itself, the
 * index.html of a directory, and the name plus `.html`. Containment is decided after resolving,
 * with `resolve()` and `relative()` - the same separation as `containedPath()` in the template
 * package: a character class in a schema can forbid "..", but only the resolved path answers
 * whether something lies inside a directory.
 */
function fileFor(root: string, pathname: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    // A stray "%" is not a path; nothing further to try.
    return null
  }
  // A NUL would end the string inside the syscall and turn a rejected path into an accepted one.
  if (decoded.includes('\0')) return null
  const target = resolve(root, `.${decoded}`)
  const rel = relative(root, target)
  if (rel.startsWith('..') || isAbsolute(rel)) return null

  if (existsSync(target)) {
    const stats = statSync(target)
    if (stats.isFile()) return target
    if (stats.isDirectory()) {
      const index = join(target, 'index.html')
      return existsSync(index) ? index : null
    }
    return null
  }
  const asPage = `${target}.html`
  return existsSync(asPage) ? asPage : null
}

// One server for the life of the process, started on the first "open the handbook" and kept: the
// pages the user clicks through afterwards are requests to it, and a port that changed underneath
// them would break the tab they already have open.
let server: Server | null = null
let starting: Promise<string> | null = null

function send(res: import('node:http').ServerResponse, file: string, status = 200): void {
  res.writeHead(status, {
    'Content-Type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    // The directory is rebuilt by `npm run build:handbook` while the app may be running in dev;
    // nothing here is expensive enough for a cache to be worth a stale page.
    'Cache-Control': 'no-store',
    // No sniffing, and nothing outside this origin may frame it - the two headers that cost a line.
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "frame-ancestors 'none'"
  })
  if (res.req.method === 'HEAD') {
    res.end()
    return
  }
  const stream = createReadStream(file)
  stream.on('error', () => res.destroy())
  stream.pipe(res)
}

/**
 * The base URL of the running handbook server ("http://127.0.0.1:52341"), starting it if needed.
 *
 * Rejects if the server cannot listen - the caller says so in a dialog rather than opening a URL
 * that answers nothing.
 */
export function handbookBaseUrl(root: string): Promise<string> {
  if (starting) return starting
  starting = new Promise<string>((fulfil, reject) => {
    const created = createServer((req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' }).end()
        return
      }
      // A path is all this needs; the host is 127.0.0.1 by construction and the query is Quartz'
      // own business, never ours.
      const pathname = (req.url ?? '/').split('?')[0].split('#')[0]
      const file = fileFor(root, pathname)
      if (file) {
        send(res, file)
        return
      }
      // Quartz builds a 404 page; showing it beats a bare status line, and it carries the same
      // navigation as every other page, so the reader is not stranded.
      const notFound = join(root, '404.html')
      if (existsSync(notFound)) send(res, notFound, 404)
      else res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found')
    })
    created.on('error', (error) => {
      server = null
      starting = null
      reject(error)
    })
    // Port 0 lets the OS pick a free one - a fixed port would collide with whatever else on this
    // machine happens to own it, and with a Quartz dev server most of all.
    created.listen(0, '127.0.0.1', () => {
      server = created
      const address = created.address()
      if (address === null || typeof address === 'string') {
        created.close()
        server = null
        starting = null
        reject(new Error('handbook server: no port'))
        return
      }
      fulfil(`http://127.0.0.1:${address.port}`)
    })
  })
  return starting
}

/** Closes the server if it runs. Idempotent: `stop()` is called from a quit path, and a quit path
 *  runs twice more often than it looks. */
export function stopHandbookServer(): void {
  if (!server) return
  const running = server
  server = null
  starting = null
  running.close()
}
